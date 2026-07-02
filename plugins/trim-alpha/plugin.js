/**
 * 雪碧图自动裁切透明边 - 批量上传PNG图片，自动检测并裁切四周完全透明的区域
 */
PM.register({
    id: 'trim-alpha',
    name: '裁切透明边',
    icon: '✂️',
    description: '批量上传PNG图片，自动检测并裁切四周完全透明的区域，节省包体空间。',
    color: '--pink-color',
    colorHover: '--pink-hover',
    cardClass: 'trim-alpha-card',
    uploadClass: '',

    _results: [],

    render: function () {
        return '' +
            '<div class="header-area"><h2>雪碧图自动裁切透明边</h2><p>批量上传PNG图片，自动检测并裁切四周完全透明的区域</p></div>' +
            '<div id="trimDropZone" class="upload-area trim-upload"><p>点击或拖拽批量上传PNG图片</p><input type="file" id="trimFileInput" class="file-input-hidden" accept="image/png" multiple></div>' +
            '<div id="trimStatus" class="status-msg" style="color:var(--pink-color)"></div>' +
            '<div class="action-bar" id="trimActionBar"><button class="btn-all-download" style="background:var(--pink-color);" id="trimExportBtn">📦 打包下载裁切结果</button></div>' +
            '<div class="batch-wrapper" id="trimTableWrapper" style="display:none;"><div style="overflow-x:auto"><table id="trimTable" style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:#f8f9fa;"><th>文件名</th><th>原尺寸</th><th>裁切后尺寸</th><th>节省</th><th>预览</th></tr></thead><tbody id="trimTableBody"></tbody></table></div></div>';
    },

    init: function () {
        var self = this;
        self._results = [];

        Utils.setupDragDrop('trimDropZone', 'trimFileInput', function (files) {
            self._process(Array.from(files));
        });

        document.getElementById('trimFileInput').addEventListener('change', function (e) {
            if (e.target.files.length > 0) self._process(Array.from(e.target.files));
        });

        document.getElementById('trimExportBtn').addEventListener('click', function () { self._export(); });
    },

    _process: function (files) {
        var self = this;
        self._results = [];
        Utils.setStatus('trimStatus', '检测透明边中...');
        Utils.hideElement('trimActionBar');
        Utils.hideElement('trimTableWrapper');

        var tbody = document.getElementById('trimTableBody');
        tbody.innerHTML = '';
        var loaded = 0;

        files.forEach(function (file) {
            Utils.loadImageFromFile(file).then(function (img) {
                var cvs = document.createElement('canvas');
                cvs.width = img.width; cvs.height = img.height;
                var ctx = cvs.getContext('2d');
                ctx.drawImage(img, 0, 0);
                var imgData = ctx.getImageData(0, 0, cvs.width, cvs.height);
                var data = imgData.data;

                var top = 0, bottom = cvs.height - 1, left = 0, right = cvs.width - 1;

                // Scan top
                top_loop: for (var y = 0; y < cvs.height; y++) {
                    for (var x = 0; x < cvs.width; x++) {
                        if (data[(y * cvs.width + x) * 4 + 3] > 0) { top = y; break top_loop; }
                    }
                }
                // Scan bottom
                bottom_loop: for (var y = cvs.height - 1; y >= 0; y--) {
                    for (var x = 0; x < cvs.width; x++) {
                        if (data[(y * cvs.width + x) * 4 + 3] > 0) { bottom = y; break bottom_loop; }
                    }
                }
                // Scan left
                left_loop: for (var x = 0; x < cvs.width; x++) {
                    for (var y = 0; y < cvs.height; y++) {
                        if (data[(y * cvs.width + x) * 4 + 3] > 0) { left = x; break left_loop; }
                    }
                }
                // Scan right
                right_loop: for (var x = cvs.width - 1; x >= 0; x--) {
                    for (var y = 0; y < cvs.height; y++) {
                        if (data[(y * cvs.width + x) * 4 + 3] > 0) { right = x; break right_loop; }
                    }
                }

                var newW = right - left + 1, newH = bottom - top + 1;
                if (newW <= 0 || newH <= 0) { newW = 1; newH = 1; left = 0; top = 0; }

                var outCvs = document.createElement('canvas');
                outCvs.width = newW; outCvs.height = newH;
                outCvs.getContext('2d').drawImage(cvs, left, top, newW, newH, 0, 0, newW, newH);

                outCvs.toBlob(function (blob) {
                    var url = URL.createObjectURL(blob);
                    var origPixels = img.width * img.height;
                    var newPixels = newW * newH;
                    var savedPct = origPixels > 0 ? ((1 - newPixels / origPixels) * 100).toFixed(1) : 0;

                    self._results.push({ blob: blob, url: url, name: file.name, origW: img.width, origH: img.height, newW: newW, newH: newH });

                    tbody.innerHTML += '<tr style="border-bottom:1px solid #eee;">' +
                        '<td style="padding:8px;">' + file.name + '</td>' +
                        '<td style="padding:8px;">' + img.width + '×' + img.height + '</td>' +
                        '<td style="padding:8px;font-weight:bold;">' + newW + '×' + newH + '</td>' +
                        '<td style="padding:8px;color:var(--success-color);">' + savedPct + '%</td>' +
                        '<td style="padding:8px;"><img src="' + url + '" style="max-width:60px;max-height:60px;background-image:linear-gradient(45deg,#eee 25%,transparent 25%,transparent 75%,#eee 75%,#eee),linear-gradient(45deg,#eee 25%,#fff 25%,#fff 75%,#eee 75%,#eee);background-size:10px 10px;"></td></tr>';

                    loaded++; if (loaded === files.length) {
                        Utils.showElement('trimTableWrapper');
                        Utils.showElement('trimActionBar');
                        Utils.setStatus('trimStatus', '✨ 裁切完成！共 ' + self._results.length + ' 个文件');
                    }
                }, 'image/png');
            });
        });
    },

    _export: function () {
        var files = this._results.map(function (r) { return { blob: r.blob, name: r.name }; });
        Utils.zipAndDownload(files, 'trimmed.zip');
    },

    destroy: function () {
        this._results = [];
        Utils.resetFileInput('trimFileInput');
        var tbody = document.getElementById('trimTableBody');
        if (tbody) tbody.innerHTML = '';
        Utils.setStatus('trimStatus', '');
        Utils.hideElement('trimActionBar');
        Utils.hideElement('trimTableWrapper');
    }
});