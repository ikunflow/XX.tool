/**
 * 压缩前后对比预览 - 上传图片设定目标大小，左原图右压缩，拖动分割线对比
 */
PM.register({
    id: 'compare-preview',
    name: '压缩对比',
    icon: '🔍',
    description: '上传图片设定目标大小，左右分屏对比原图与压缩结果，拖动分割线预览差异。',
    color: '--deep-orange',
    colorHover: '#e65100',
    cardClass: 'compare-preview-card',
    uploadClass: '',

    _origImg: null,
    _compressedBlob: null,
    _isDragging: false,

    render: function () {
        return '' +
            '<div class="header-area"><h2>压缩前后对比预览</h2><p>上传图片设定目标大小，左原图右压缩，拖动分割线对比，满意后下载</p></div>' +
            Utils.createSettingsBar([
                { type: 'number', id: 'cmpTargetKB', label: '目标大小：', value: 100, unit: 'KB 以内' }
            ]) +
            '<div id="cmpDropZone" class="upload-area compare-upload"><p>点击或拖拽图片上传</p><input type="file" id="cmpFileInput" class="file-input-hidden" accept="image/*"></div>' +
            '<div id="cmpStatus" class="status-msg" style="color:var(--deep-orange)"></div>' +
            '<div class="action-bar" id="cmpActionBar" style="display:none"><button class="btn-all-download" style="background:var(--deep-orange);" id="cmpDownloadBtn">💾 下载压缩图片</button></div>' +
            '<div id="cmpContainer" style="display:none;position:relative;overflow:hidden;width:100%;max-width:800px;margin:0 auto;border:1px solid #ddd;">' +
            '<img id="cmpRightImg" style="display:block;width:100%;" alt="压缩后">' +
            '<div style="position:absolute;top:0;left:0;width:50%;height:100%;overflow:hidden;" id="cmpLeftPane"><img id="cmpLeftImg" style="display:block;position:absolute;top:0;left:0;" alt="原图"></div>' +
            '<div id="cmpDivider" style="position:absolute;top:0;left:50%;width:3px;height:100%;background:var(--deep-orange);cursor:ew-resize;z-index:10;"></div></div>' +
            '<div id="cmpStats" style="display:none;text-align:center;padding:10px;font-size:14px;color:#666;"></div>';
    },

    init: function () {
        var self = this;
        self._origImg = null;
        self._compressedBlob = null;

        Utils.setupDragDrop('cmpDropZone', 'cmpFileInput', function (files) {
            if (files.length > 0) self._process(files[0]);
        });

        document.getElementById('cmpFileInput').addEventListener('change', function (e) {
            if (e.target.files[0]) self._process(e.target.files[0]);
        });

        document.getElementById('cmpDownloadBtn').addEventListener('click', function () {
            if (self._compressedBlob) {
                saveAs(self._compressedBlob, 'compressed.jpeg');
            }
        });

        // Divider drag
        var divider = document.getElementById('cmpDivider');
        divider.addEventListener('mousedown', function (e) {
            self._isDragging = true;
            e.preventDefault();
        });

        document.addEventListener('mousemove', function (e) {
            if (!self._isDragging) return;
            var container = document.getElementById('cmpContainer');
            var rect = container.getBoundingClientRect();
            var pct = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
            divider.style.left = pct + '%';
            document.getElementById('cmpLeftPane').style.width = pct + '%';
        });

        document.addEventListener('mouseup', function () { self._isDragging = false; });
    },

    _process: function (file) {
        var self = this;
        Utils.setStatus('cmpStatus', '压缩中...');
        Utils.hideElement('cmpActionBar');
        Utils.hideElement('cmpContainer');
        Utils.hideElement('cmpStats');

        var maxK = (parseFloat(document.getElementById('cmpTargetKB').value) || 100) * 1024;

        Utils.loadImageFromFile(file).then(function (img) {
            self._origImg = img;

            var cvs = document.createElement('canvas');
            cvs.width = img.width; cvs.height = img.height;
            cvs.getContext('2d').drawImage(img, 0, 0);

            Utils.compressEngine(cvs, 0.98, maxK, function (blob) {
                self._compressedBlob = blob;

                var origUrl = img.src;
                var compUrl = URL.createObjectURL(blob);

                document.getElementById('cmpLeftImg').src = origUrl;
                document.getElementById('cmpRightImg').src = compUrl;
                // 左图宽度跟随容器，保证两张图尺寸一致
                document.getElementById('cmpLeftImg').style.width = document.getElementById('cmpContainer').offsetWidth + 'px';

                var origKB = (file.size / 1024).toFixed(1);
                var compKB = (blob.size / 1024).toFixed(1);
                var saved = ((1 - blob.size / file.size) * 100).toFixed(1);
                document.getElementById('cmpStats').innerHTML =
                    '原大小: <b>' + origKB + ' KB</b> → 压缩后: <b>' + compKB + ' KB</b>  |  节省: <b style="color:var(--success-color);">' + saved + '%</b>';

                document.getElementById('cmpDivider').style.left = '50%';
                document.getElementById('cmpLeftPane').style.width = '50%';

                Utils.showElement('cmpContainer');
                Utils.showElement('cmpStats');
                Utils.showElement('cmpActionBar');
                Utils.setStatus('cmpStatus', '✨ 压缩完成！拖动中间分割线对比效果');
            });
        });
    },

    destroy: function () {
        this._origImg = null;
        this._compressedBlob = null;
        this._isDragging = false;
        Utils.resetFileInput('cmpFileInput');
        Utils.setStatus('cmpStatus', '');
        Utils.hideElement('cmpActionBar');
        Utils.hideElement('cmpContainer');
        Utils.hideElement('cmpStats');
    }
});