/**
 * 切割压缩模块 - 3:4比例多宫格切图与智能压缩
 */
PM.register({
    id: 'cutter',
    name: '切割压缩模块',
    icon: '✂️',
    description: '3:4 锁定裁剪，支持矩阵动态分割，自适应控制输出体积，支持自定义输出格式。',
    color: '--warning-color',
    colorHover: '--warning-hover',
    cardClass: 'cutter-card',
    uploadClass: 'cutter-upload',

    _downloadQueue: [],
    _state: {},
    _currentFormat: 'image/jpeg',

    render: function () {
        return '' +
            '<div class="header-area"><h2>3:4 比例多宫格切图与智能压缩</h2></div>' +
            Utils.createSettingsBar([
                { type: 'select', id: 'cutterGridSelect', label: '切割矩阵：', value: '2', options: [{ label: '2 × 2', value: '2' }, { label: '3 × 3', value: '3' }, { label: '4 × 4', value: '4' }] },
                { type: 'number', id: 'cutterSizeInput', label: '大小控制：', value: 15, unit: 'KB 内' },
                { type: 'select', id: 'cutterFormat', label: '输出格式：', options: [
                    { value: 'image/jpeg', label: 'JPEG' },
                    { value: 'image/png', label: 'PNG' },
                    { value: 'image/webp', label: 'WebP' }
                ]},
                { type: 'select', id: 'cutterFolderNaming', label: '文件夹命名：', value: 'origin', options: [{ label: '原图名称', value: 'origin' }, { label: '数字', value: 'numeric' }, { label: '字母', value: 'alphabet' }] },
                { type: 'text', id: 'cutterFolderPrefix', label: '前缀：', value: '' },
                { type: 'text', id: 'cutterNamePattern', label: '图片命名：', value: '{num}' },
                { type: 'checkbox', id: 'cutterZipCheck', checkLabel: '打包ZIP', checked: true }
            ]) +
            '<div id="cutterDropZone" class="upload-area cutter-upload"><p>点击或拖拽图片多选上传</p><input type="file" id="cutterFileInput" class="file-input-hidden" accept="image/*" multiple></div>' +
            '<div id="cutterStatus" class="status-msg" style="color:var(--warning-color)"></div>' +
            '<div class="action-bar" id="cutterActionBar"><button id="cutterDownloadBtn" class="btn-all-download" style="background:var(--warning-color);">⬇️ 一键下载所有打包切图</button></div>' +
            '<div id="cutterMasterContainer"></div>';
    },

    init: function () {
        var self = this;
        self._downloadQueue = [];
        self._currentFormat = 'image/jpeg';

        Utils.setupDragDrop('cutterDropZone', 'cutterFileInput', function (files) {
            self._handleFiles(Array.from(files));
        });

        document.getElementById('cutterFileInput').addEventListener('change', function (e) {
            if (e.target.files.length > 0) self._handleFiles(Array.from(e.target.files));
        });

        var zipCheck = document.getElementById('cutterZipCheck');
        var btn = document.getElementById('cutterDownloadBtn');
        zipCheck.addEventListener('change', function () {
            btn.textContent = zipCheck.checked ? '⬇️ 一键下载所有打包切图 (ZIP)' : '⬇️ 顺序下载所有文件';
        });

        btn.addEventListener('click', function () { self._executeDownload(); });

        // 格式/大小/矩阵变更时提示重新上传
        document.getElementById('cutterFormat').addEventListener('change', function () {
            self._currentFormat = this.value;
            if (self._downloadQueue.length > 0) {
                Utils.setStatus('cutterStatus', '⚠️ 格式已更改，请重新上传图片以应用新格式');
            }
        });
        document.getElementById('cutterSizeInput').addEventListener('input', function () {
            if (self._downloadQueue.length > 0) {
                Utils.setStatus('cutterStatus', '⚠️ 大小限制已更改，请重新上传图片以应用新设置');
            }
        });
        document.getElementById('cutterGridSelect').addEventListener('change', function () {
            if (self._downloadQueue.length > 0) {
                Utils.setStatus('cutterStatus', '⚠️ 矩阵已更改，请重新上传图片以应用新设置');
            }
        });
    },

    _getExt: function (mime) {
        var map = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
        return map[mime] || '.jpg';
    },

    _handleFiles: function (files) {
        var self = this;
        if (files.length === 0) return;
        self._destroyWorkspace();

        var gridSize = parseInt(document.getElementById('cutterGridSelect').value);
        var maxBytes = (parseFloat(document.getElementById('cutterSizeInput').value) || 15) * 1024;
        var pattern = document.getElementById('cutterNamePattern').value.trim() || '{num}';
        var namingMode = document.getElementById('cutterFolderNaming').value;
        var folderPrefix = document.getElementById('cutterFolderPrefix').value.trim().replace(/[\\/:*?"<>|]/g, '_');
        var format = document.getElementById('cutterFormat').value || 'image/jpeg';
        self._currentFormat = format;
        var ext = self._getExt(format);
        var container = document.getElementById('cutterMasterContainer');

        Utils.setStatus('cutterStatus', '正在初始化...');

        files.forEach(function (file, fileIdx) {
            var baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
            var targetF = folderPrefix + (namingMode === 'numeric' ? String(fileIdx + 1) : (namingMode === 'alphabet' ? Utils.convertToAlphabet(fileIdx) : baseName));

            var batchBox = document.createElement('div');
            batchBox.className = 'batch-wrapper';
            batchBox.innerHTML = '<div class="batch-title">📁 [ ' + targetF + ' ] (' + file.name + ')</div><div class="grid-output" id="g_box_' + fileIdx + '" style="display:grid;grid-template-columns:repeat(' + gridSize + ', 1fr);gap:8px;"></div>';
            container.appendChild(batchBox);

            Utils.loadImageFromFile(file).then(function (img) {
                var srcX = 0, srcY = 0, srcW = img.width, srcH = img.height;
                var ratio = 3 / 4;
                if (img.width / img.height > ratio) {
                    srcW = img.height * ratio;
                    srcX = (img.width - srcW) / 2;
                } else {
                    srcH = img.width / ratio;
                    srcY = (img.height - srcH) / 2;
                }
                var sW = srcW / gridSize, sH = srcH / gridSize;
                var loaded = 0, total = gridSize * gridSize;
                var gridBox = document.getElementById('g_box_' + fileIdx);

                for (var r = 0; r < gridSize; r++) {
                    for (var c = 0; c < gridSize; c++) {
                        (function (row, col, ridx) {
                            var nId = String(ridx + 1).padStart(2, '0');
                            var cvs = document.createElement('canvas');
                            cvs.width = 350; cvs.height = 466;
                            cvs.getContext('2d').drawImage(img, srcX + col * sW, srcY + row * sH, sW, sH, 0, 0, 350, 466);

                            Utils.compressEngine(cvs, 0.95, maxBytes, function (blob) {
                                var url = URL.createObjectURL(blob);
                                var dName = pattern.replace(/\{num\}/g, nId);
                                var fName = dName + ext;
                                self._downloadQueue.push({ blob: blob, url: url, folder: targetF, fileName: fName });
                                gridBox.innerHTML += '<div class="res-card"><div class="res-preview"><img src="' + url + '"></div><div class="res-info">' + fName + '</div></div>';
                                loaded++;
                                if (loaded === total) {
                                    var formatLabel = format.replace('image/', '').toUpperCase();
                                    Utils.setStatus('cutterStatus', '✨ 处理完成！共 ' + files.length + ' 张图，格式: ' + formatLabel);
                                    Utils.showElement('cutterActionBar');
                                }
                            }, format);
                        })(r, c, r * gridSize + c);
                    }
                }
            });
        });
    },

    _executeDownload: function () {
        var self = this;
        if (document.getElementById('cutterZipCheck').checked) {
            Utils.zipAndDownload(self._downloadQueue.map(function (t) {
                return { blob: t.blob, name: t.fileName, folder: t.folder };
            }), 'cutter_pack.zip');
        } else {
            self._downloadQueue.forEach(function (t, i) {
                setTimeout(function () {
                    var a = document.createElement('a');
                    a.href = t.url; a.download = t.fileName; a.click();
                }, i * 150);
            });
        }
    },

    _destroyWorkspace: function () {
        var self = this;
        self._downloadQueue = [];
        Utils.resetFileInput('cutterFileInput');
        var container = document.getElementById('cutterMasterContainer');
        if (container) container.innerHTML = '';
        Utils.setStatus('cutterStatus', '');
        Utils.hideElement('cutterActionBar');
    },

    destroy: function () {
        this._destroyWorkspace();
    }
});
