/**
 * 单图压缩模块 - 等比例保真压缩器
 */
PM.register({
    id: 'compressor',
    name: '单图压缩模块',
    icon: '🗜️',
    description: '完全保留长宽比例与像素，等比例递归强制压制至目标容量内。',
    color: '--purple-color',
    colorHover: '--purple-hover',
    cardClass: 'compressor-card',
    uploadClass: 'compressor-upload',

    _results: [],

    render: function () {
        return '' +
            '<div class="header-area"><h2>图片批量压缩器</h2><p>支持多图上传，等比例递归强制压制至目标容量内</p></div>' +
            Utils.createSettingsBar([
                { type: 'number', id: 'compressorSizeInput', label: '目标体积限制：', value: 100, unit: 'KB 以内' },
                { type: 'select', id: 'compressorFormat', label: '输出格式：', options: [
                    { value: 'image/jpeg', label: 'JPEG' },
                    { value: 'image/png', label: 'PNG' },
                    { value: 'image/webp', label: 'WebP' }
                ]}
            ]) +
            '<div id="compressorDropZone" class="upload-area compressor-upload"><p>点击或拖拽批量上传图片</p><input type="file" id="compressorFileInput" class="file-input-hidden" accept="image/*" multiple></div>' +
            '<div id="compressorStatus" class="status-msg" style="color:var(--purple-color)"></div>' +
            '<div class="action-bar" id="compressorActionBar"><button class="btn-all-download" style="background:var(--purple-color);" id="compressorDownloadBtn">📦 打包下载全部压缩图片</button></div>' +
            '<div class="batch-wrapper" id="compressorOutputWrapper" style="display:none;"><div class="res-grid" id="compressorGrid"></div></div>';
    },

    init: function () {
        var self = this;
        self._results = [];

        Utils.setupDragDrop('compressorDropZone', 'compressorFileInput', function (files) {
            if (files.length > 0) self._processAll(Array.from(files));
        });

        document.getElementById('compressorFileInput').addEventListener('change', function (e) {
            if (e.target.files.length > 0) self._processAll(Array.from(e.target.files));
        });

        document.getElementById('compressorDownloadBtn').addEventListener('click', function () {
            if (self._results.length > 0) {
                var files = self._results.map(function (r) {
                    return { blob: r.blob, name: r.fileName };
                });
                Utils.zipAndDownload(files, 'compressed_images.zip');
            }
        });

        document.getElementById('compressorFormat').addEventListener('change', function () {
            if (self._results.length > 0) self._reprocessAll();
        });
        document.getElementById('compressorSizeInput').addEventListener('input', function () {
            if (self._results.length > 0) self._reprocessAll();
        });
    },

    _getFormat: function () {
        return document.getElementById('compressorFormat').value || 'image/jpeg';
    },

    _getExt: function (mime) {
        var map = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
        return map[mime] || '.jpg';
    },

    _processAll: function (files) {
        var self = this;
        self._results = [];
        document.getElementById('compressorGrid').innerHTML = '';
        Utils.setStatus('compressorStatus', '正在压缩 ' + files.length + ' 张图片...');
        Utils.hideElement('compressorActionBar');
        Utils.hideElement('compressorOutputWrapper');

        var maxB = (parseFloat(document.getElementById('compressorSizeInput').value) || 100) * 1024;
        var format = self._getFormat();

        var processed = 0;
        files.forEach(function (file, idx) {
            self._compressOne(file, maxB, format, function (result) {
                self._results[idx] = result;
                processed++;
                self._addResultCard(result);
                if (processed === files.length) {
                    Utils.setStatus('compressorStatus', '✨ 完成！共压缩 ' + files.length + ' 张图片');
                    Utils.showElement('compressorActionBar');
                    Utils.showElement('compressorOutputWrapper');
                }
            });
        });
    },

    _reprocessAll: function () {
        var self = this;
        if (self._results.length === 0) return;
        var files = self._results.map(function (r) { return r.originalFile; });
        self._processAll(files);
    },

    _compressOne: function (file, maxB, format, callback) {
        var self = this;
        var ext = self._getExt(format);
        var baseName = file.name.lastIndexOf('.') > -1 ? file.name.substring(0, file.name.lastIndexOf('.')) : file.name;

        Utils.loadImageFromFile(file).then(function (img) {
            var cvs = document.createElement('canvas');
            cvs.width = img.width; cvs.height = img.height;
            cvs.getContext('2d').drawImage(img, 0, 0, cvs.width, cvs.height);

            Utils.compressEngine(cvs, 0.98, maxB, function (blob) {
                var url = URL.createObjectURL(blob);
                callback({
                    blob: blob,
                    url: url,
                    fileName: baseName + '_compressed' + ext,
                    originalFile: file,
                    sizeKB: (blob.size / 1024).toFixed(1),
                    origSizeKB: (file.size / 1024).toFixed(1)
                });
            }, format);
        });
    },

    _addResultCard: function (result) {
        var grid = document.getElementById('compressorGrid');
        var card = document.createElement('div');
        card.className = 'res-card';
        card.innerHTML = '<div class="res-preview"><img src="' + result.url + '" style="max-width:100%;max-height:120px;object-fit:contain;"></div>' +
            '<div class="res-info">原: ' + result.origSizeKB + ' KB → 压: ' + result.sizeKB + ' KB</div>' +
            '<a class="btn-download" href="' + result.url + '" download="' + result.fileName + '">⬇️ 单张下载</a>';
        grid.appendChild(card);
    },

    destroy: function () {
        this._results.forEach(function (r) { if (r.url) URL.revokeObjectURL(r.url); });
        this._results = [];
        Utils.resetFileInput('compressorFileInput');
        var grid = document.getElementById('compressorGrid');
        if (grid) grid.innerHTML = '';
        Utils.setStatus('compressorStatus', '');
        Utils.hideElement('compressorActionBar');
        Utils.hideElement('compressorOutputWrapper');
    }
});