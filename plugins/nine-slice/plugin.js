/**
 * 9-Slice 九宫格切图器 - 上传图片，调节滑杆设定四周边距，预览切割线并导出9张切片
 */
PM.register({
    id: 'nine-slice',
    name: '9-Slice切图',
    icon: '🔲',
    description: '上传图片调节四周边距滑杆，实时预览切割线，一键导出9张切片ZIP。',
    color: '--red-color',
    colorHover: '#c0392b',
    cardClass: 'nine-slice-card',
    uploadClass: '',

    _img: null,
    _canvas: null,
    _slices: [],

    render: function () {
        return '' +
            '<div class="header-area"><h2>9-Slice 九宫格切图器</h2><p>上传图片，调节滑杆设定四周边距，预览切割线并导出9张切片打包ZIP</p></div>' +
            Utils.createSettingsBar([
                { type: 'range', id: 'nineSliceLeft', label: '左边距：', value: 100, min: 0, max: 400, valueLabel: true },
                { type: 'range', id: 'nineSliceRight', label: '右边距：', value: 100, min: 0, max: 400, valueLabel: true },
                { type: 'range', id: 'nineSliceTop', label: '上边距：', value: 100, min: 0, max: 400, valueLabel: true },
                { type: 'range', id: 'nineSliceBottom', label: '下边距：', value: 100, min: 0, max: 400, valueLabel: true }
            ]) +
            '<div id="nineDropZone" class="upload-area nine-upload"><p>点击或拖拽图片上传</p><input type="file" id="nineFileInput" class="file-input-hidden" accept="image/*"></div>' +
            '<div id="nineStatus" class="status-msg" style="color:var(--red-color)"></div>' +
            '<div class="action-bar" id="nineActionBar"><button class="btn-all-download" style="background:var(--red-color);" id="nineExportBtn">📦 导出切片 ZIP</button></div>' +
            '<div style="text-align:center;margin-top:20px;" id="nineContainer"></div>';
    },

    init: function () {
        var self = this;
        self._img = null;
        self._slices = [];

        Utils.setupDragDrop('nineDropZone', 'nineFileInput', function (files) {
            if (files.length > 0) self._loadImage(files[0]);
        });

        document.getElementById('nineFileInput').addEventListener('change', function (e) {
            if (e.target.files[0]) self._loadImage(e.target.files[0]);
        });

        document.getElementById('nineExportBtn').addEventListener('click', function () { self._export(); });

        ['nineSliceLeft', 'nineSliceRight', 'nineSliceTop', 'nineSliceBottom'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', function () {
                    var valSpan = document.getElementById(id + 'Val');
                    if (valSpan) valSpan.textContent = el.value + 'px';
                    self._renderPreview();
                });
            }
        });
    },

    _loadImage: function (file) {
        var self = this;
        Utils.loadImageFromFile(file).then(function (img) {
            self._img = img;
            self._renderPreview();
            Utils.showElement('nineActionBar');
            Utils.setStatus('nineStatus', '✨ 图片已加载，调节滑块预览切割线');
        });
    },

    _renderPreview: function () {
        var self = this;
        if (!self._img) return;

        var left = parseInt(document.getElementById('nineSliceLeft').value);
        var right = parseInt(document.getElementById('nineSliceRight').value);
        var top = parseInt(document.getElementById('nineSliceTop').value);
        var bottom = parseInt(document.getElementById('nineSliceBottom').value);

        var cvs = document.createElement('canvas');
        self._canvas = cvs;
        cvs.width = self._img.width; cvs.height = self._img.height;
        var ctx = cvs.getContext('2d');
        ctx.drawImage(self._img, 0, 0);

        // Draw cutting guides
        ctx.strokeStyle = 'rgba(255,0,0,0.7)'; ctx.lineWidth = 1;
        ctx.setLineDash([6, 4]);

        // Vertical lines
        ctx.beginPath(); ctx.moveTo(left, 0); ctx.lineTo(left, cvs.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cvs.width - right, 0); ctx.lineTo(cvs.width - right, cvs.height); ctx.stroke();

        // Horizontal lines
        ctx.beginPath(); ctx.moveTo(0, top); ctx.lineTo(cvs.width, top); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, cvs.height - bottom); ctx.lineTo(cvs.width, cvs.height - bottom); ctx.stroke();

        ctx.setLineDash([]);

        var container = document.getElementById('nineContainer');
        var maxW = Math.min(600, cvs.width);
        container.innerHTML = '<canvas id="ninePreviewCanvas" width="' + cvs.width + '" height="' + cvs.height +
            '" style="max-width:' + maxW + 'px;border:1px solid #ddd;background-image:linear-gradient(45deg,#eee 25%,transparent 25%,transparent 75%,#eee 75%,#eee),linear-gradient(45deg,#eee 25%,#fff 25%,#fff 75%,#eee 75%,#eee);background-size:20px 20px;"></canvas>';
        document.getElementById('ninePreviewCanvas').getContext('2d').drawImage(cvs, 0, 0);
    },

    _export: function () {
        var self = this;
        if (!self._img) return;

        var left = parseInt(document.getElementById('nineSliceLeft').value);
        var right = parseInt(document.getElementById('nineSliceRight').value);
        var top = parseInt(document.getElementById('nineSliceTop').value);
        var bottom = parseInt(document.getElementById('nineSliceBottom').value);

        var names = ['top-left', 'top-center', 'top-right', 'middle-left', 'middle-center',
            'middle-right', 'bottom-left', 'bottom-center', 'bottom-right'];
        var areas = [
            [0, 0, left, top],
            [left, 0, self._img.width - left - right, top],
            [self._img.width - right, 0, right, top],
            [0, top, left, self._img.height - top - bottom],
            [left, top, self._img.width - left - right, self._img.height - top - bottom],
            [self._img.width - right, top, right, self._img.height - top - bottom],
            [0, self._img.height - bottom, left, bottom],
            [left, self._img.height - bottom, self._img.width - left - right, bottom],
            [self._img.width - right, self._img.height - bottom, right, bottom]
        ];

        var files = [];
        areas.forEach(function (area, i) {
            var cvs = document.createElement('canvas');
            cvs.width = area[2]; cvs.height = area[3];
            cvs.getContext('2d').drawImage(self._img, area[0], area[1], area[2], area[3], 0, 0, area[2], area[3]);
            cvs.toBlob(function (blob) { files.push({ blob: blob, name: names[i] + '.png' }); });
        });

        setTimeout(function () { Utils.zipAndDownload(files, 'nine-slice.zip'); }, 100);
    },

    destroy: function () {
        this._img = null; this._canvas = null; this._slices = [];
        Utils.resetFileInput('nineFileInput');
        var container = document.getElementById('nineContainer');
        if (container) container.innerHTML = '';
        Utils.setStatus('nineStatus', '');
        Utils.hideElement('nineActionBar');
    }
});