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

    _result: null,

    render: function () {
        return '' +
            '<div class="header-area"><h2>单图等比例保真压缩器</h2></div>' +
            Utils.createSettingsBar([
                { type: 'number', id: 'compressorSizeInput', label: '目标体积限制：', value: 100, unit: 'KB 以内' }
            ]) +
            '<div id="compressorDropZone" class="upload-area compressor-upload"><p>点击或拖拽单图上传</p><input type="file" id="compressorFileInput" class="file-input-hidden" accept="image/*"></div>' +
            '<div id="compressorStatus" class="status-msg" style="color:var(--purple-color)"></div>' +
            '<div class="action-bar" id="compressorActionBar"><button class="btn-all-download" style="background:var(--purple-color);" id="compressorDownloadBtn">⬇️ 下载压缩图片</button></div>' +
            '<div id="compressorOutputContainer" style="text-align:center;"></div>';
    },

    init: function () {
        var self = this;
        self._result = null;

        Utils.setupDragDrop('compressorDropZone', 'compressorFileInput', function (files) {
            if (files.length > 0) self._process(files[0]);
        });

        document.getElementById('compressorFileInput').addEventListener('change', function (e) {
            if (e.target.files[0]) self._process(e.target.files[0]);
        });

        document.getElementById('compressorDownloadBtn').addEventListener('click', function () {
            if (self._result) {
                var a = document.createElement('a');
                a.href = self._result.url; a.download = self._result.fileName; a.click();
            }
        });
    },

    _process: function (file) {
        var self = this;
        Utils.setStatus('compressorStatus', '压缩中...');
        Utils.hideElement('compressorActionBar');

        var maxB = (parseFloat(document.getElementById('compressorSizeInput').value) || 100) * 1024;

        Utils.loadImageFromFile(file).then(function (img) {
            var cvs = document.createElement('canvas');
            cvs.width = img.width; cvs.height = img.height;
            cvs.getContext('2d').drawImage(img, 0, 0, cvs.width, cvs.height);

            Utils.compressEngine(cvs, 0.98, maxB, function (blob) {
                var url = URL.createObjectURL(blob);
                self._result = { url: url, fileName: 'compressed.jpeg' };
                document.getElementById('compressorOutputContainer').innerHTML =
                    '<div class="res-card" style="max-width:300px;margin:0 auto;"><div class="res-preview"><img src="' + url + '" style="max-width:100%;max-height:200px;"></div><div class="res-info">' + (blob.size / 1024).toFixed(1) + ' KB</div></div>';
                Utils.setStatus('compressorStatus', '✨ 成功！');
                Utils.showElement('compressorActionBar');
            });
        });
    },

    destroy: function () {
        this._result = null;
        Utils.resetFileInput('compressorFileInput');
        var out = document.getElementById('compressorOutputContainer');
        if (out) out.innerHTML = '';
        Utils.setStatus('compressorStatus', '');
        Utils.hideElement('compressorActionBar');
    }
});