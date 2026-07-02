/**
 * 切割压缩模块 - 自定义比例 M×N 宫格切图与智能压缩
 * 支持自定义 M 行 N 列切割格子、自定义宽高比例、拉伸/裁剪模式切换
 */
PM.register({
    id: 'cutter',
    name: '切割压缩模块',
    icon: '✂️',
    description: '自定义比例裁剪，支持 M×N 矩阵动态分割，拉伸/居中裁剪模式，自适应控制输出体积。',
    color: '--warning-color',
    colorHover: '--warning-hover',
    cardClass: 'cutter-card',
    uploadClass: 'cutter-upload',

    _downloadQueue: [],
    _state: {},
    _currentFormat: 'image/jpeg',

    render: function () {
        return '' +
            '<div class="header-area"><h2>自定义比例 M×N 宫格切图与智能压缩</h2></div>' +
            Utils.createSettingsBar([
                { type: 'number', id: 'cutterGridM', label: '行数 M：', value: 2, min: 1, max: 10, unit: '行' },
                { type: 'number', id: 'cutterGridN', label: '列数 N：', value: 2, min: 1, max: 10, unit: '列' },
                { type: 'number', id: 'cutterRatioW', label: '宽高比：', value: 3, min: 1, max: 100, unit: ':' },
                { type: 'number', id: 'cutterRatioH', label: '', value: 4, min: 1, max: 100, unit: '' },
                { type: 'checkbox', id: 'cutterStretch', checkLabel: '拉伸填充（不勾选则居中裁剪）', checked: true },
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

        // 设置变更时提示重新上传
        var settings = ['cutterGridM', 'cutterGridN', 'cutterRatioW', 'cutterRatioH', 'cutterStretch', 'cutterFormat', 'cutterSizeInput'];
        settings.forEach(function (id) {
            document.getElementById(id).addEventListener('change', function () {
                if (self._downloadQueue.length > 0) {
                    Utils.setStatus('cutterStatus', '⚠️ 设置已更改，请重新上传图片以应用新设置');
                }
            });
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

        var gridM = parseInt(document.getElementById('cutterGridM').value) || 2;
        var gridN = parseInt(document.getElementById('cutterGridN').value) || 2;
        if (gridM < 1) gridM = 1;
        if (gridM > 10) gridM = 10;
        if (gridN < 1) gridN = 1;
        if (gridN > 10) gridN = 10;

        var ratioW = parseFloat(document.getElementById('cutterRatioW').value) || 3;
        var ratioH = parseFloat(document.getElementById('cutterRatioH').value) || 4;
        var ratio = ratioW / ratioH;
        var stretch = document.getElementById('cutterStretch').checked;

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
            var modeText = stretch ? '拉伸填充' : '居中裁剪';
            batchBox.innerHTML = '<div class="batch-title">📁 [ ' + targetF + ' ] (' + file.name + ') — ' + gridM + '×' + gridN + ' 切割，比例 ' + ratioW + ':' + ratioH + '，' + modeText + '</div><div class="grid-output" id="g_box_' + fileIdx + '" style="display:grid;grid-template-columns:repeat(' + Math.min(gridN, 4) + ', 1fr);gap:8px;"></div>';
            container.appendChild(batchBox);

            Utils.loadImageFromFile(file).then(function (img) {
                var srcX = 0, srcY = 0, srcW = img.width, srcH = img.height;

                // 根据自定义比例裁剪原图
                if (img.width / img.height > ratio) {
                    srcW = img.height * ratio;
                    srcX = (img.width - srcW) / 2;
                } else {
                    srcH = img.width / ratio;
                    srcY = (img.height - srcH) / 2;
                }

                var sW = srcW / gridN;  // 每列在原图中的宽度
                var sH = srcH / gridM;  // 每行在原图中的高度
                var loaded = 0, total = gridM * gridN;
                var gridBox = document.getElementById('g_box_' + fileIdx);

                // 输出尺寸
                var outW = 350, outH = Math.round(350 / ratio);
                if (outH > 466) {
                    outH = 466;
                    outW = Math.round(466 * ratio);
                }

                for (var r = 0; r < gridM; r++) {
                    for (var c = 0; c < gridN; c++) {
                        (function (row, col, ridx) {
                            var nId = String(ridx + 1).padStart(2, '0');
                            var cvs = document.createElement('canvas');
                            cvs.width = outW;
                            cvs.height = outH;
                            var ctx = cvs.getContext('2d');

                            if (stretch) {
                                // 拉伸填充模式：直接拉伸每个格子到输出尺寸
                                ctx.drawImage(img, srcX + col * sW, srcY + row * sH, sW, sH, 0, 0, outW, outH);
                            } else {
                                // 居中裁剪模式：保持格子原始比例，居中裁剪填充
                                var cellRatio = sW / sH;
                                var outRatio = outW / outH;

                                var drawX = 0, drawY = 0, drawW = outW, drawH = outH;
                                var clipX = srcX + col * sW, clipY = srcY + row * sH, clipW = sW, clipH = sH;

                                if (cellRatio > outRatio) {
                                    // 格子更宽，以高度为基准，裁剪左右
                                    drawW = outH * cellRatio;
                                    drawX = (outW - drawW) / 2;
                                } else {
                                    // 格子更高，以宽度为基准，裁剪上下
                                    drawH = outW / cellRatio;
                                    drawY = (outH - drawH) / 2;
                                }

                                ctx.drawImage(img, clipX, clipY, clipW, clipH, drawX, drawY, drawW, drawH);
                            }

                            Utils.compressEngine(cvs, 0.95, maxBytes, function (blob) {
                                var url = URL.createObjectURL(blob);
                                var dName = pattern.replace(/\{num\}/g, nId);
                                var fName = dName + ext;
                                self._downloadQueue.push({ blob: blob, url: url, folder: targetF, fileName: fName });
                                gridBox.innerHTML += '<div class="res-card"><div class="res-preview"><img src="' + url + '" style="max-height:120px;object-fit:contain;"></div><div class="res-info">' + fName + '<br><small>' + outW + '×' + outH + '</small></div></div>';
                                loaded++;
                                if (loaded === total) {
                                    var formatLabel = format.replace('image/', '').toUpperCase();
                                    Utils.setStatus('cutterStatus', '✨ 处理完成！共 ' + files.length + ' 张图，' + gridM + '×' + gridN + ' 切割，比例 ' + ratioW + ':' + ratioH + '，' + modeText + '，格式: ' + formatLabel);
                                    Utils.showElement('cutterActionBar');
                                }
                            }, format);
                        })(r, c, r * gridN + c);
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
