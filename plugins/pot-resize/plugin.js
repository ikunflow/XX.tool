/**
 * 图片批量缩放为2的幂次方 - 自动检测尺寸并缩放至最接近的2的幂次方
 */
PM.register({
    id: 'pot-resize',
    name: '缩放到2^N',
    icon: '📐',
    description: '批量上传图片，自动检测尺寸并缩放至最接近的2的幂次方。',
    color: '--teal-color',
    colorHover: '--teal-hover',
    cardClass: 'pot-resize-card',
    uploadClass: '',

    _results: [],

    render: function () {
        return '' +
            '<div class="header-area"><h2>图片批量缩放为2的幂次方</h2><p>批量上传图片，自动检测尺寸并缩放至最接近的2的幂次方</p></div>' +
            Utils.createSettingsBar([
                { type: 'select', id: 'potStrategy', label: '策略：', value: 'ceiling', options: [{ label: '向上取整', value: 'ceiling' }, { label: '向下取整', value: 'floor' }, { label: '取最近', value: 'nearest' }] }
            ]) +
            '<div id="potDropZone" class="upload-area pot-upload"><p>点击或拖拽批量上传图片</p><input type="file" id="potFileInput" class="file-input-hidden" accept="image/*" multiple></div>' +
            '<div id="potStatus" class="status-msg" style="color:var(--teal-color)"></div>' +
            '<div class="action-bar" id="potActionBar"><button class="btn-all-download" style="background:var(--teal-color);" id="potExportBtn">📦 打包下载缩放结果</button></div>' +
            '<div class="batch-wrapper" id="potTableWrapper" style="display:none;"><div style="overflow-x:auto"><table id="potTable" style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:#f8f9fa;"><th>文件名</th><th>原尺寸</th><th>目标尺寸</th><th>预览</th></tr></thead><tbody id="potTableBody"></tbody></table></div></div>';
    },

    init: function () {
        var self = this;
        self._results = [];

        Utils.setupDragDrop('potDropZone', 'potFileInput', function (files) {
            self._process(Array.from(files));
        });

        document.getElementById('potFileInput').addEventListener('change', function (e) {
            if (e.target.files.length > 0) self._process(Array.from(e.target.files));
        });

        document.getElementById('potExportBtn').addEventListener('click', function () { self._export(); });
    },

    _nearestPOT: function (n, strategy) {
        if (strategy === 'ceiling') {
            var v = 1; while (v < n) v *= 2; return v;
        } else if (strategy === 'floor') {
            var v = 1; while (v * 2 <= n) v *= 2; return Math.max(1, v);
        } else {
            var ceil = 1; while (ceil < n) ceil *= 2;
            var floor = ceil / 2;
            return (n - floor <= ceil - n) ? floor : ceil;
        }
    },

    _process: function (files) {
        var self = this;
        self._results = [];
        Utils.setStatus('potStatus', '缩放中...');
        Utils.hideElement('potActionBar');
        Utils.hideElement('potTableWrapper');

        var strategy = document.getElementById('potStrategy').value;
        var tbody = document.getElementById('potTableBody');
        tbody.innerHTML = '';

        var loaded = 0;
        files.forEach(function (file) {
            Utils.loadImageFromFile(file).then(function (img) {
                var w = self._nearestPOT(img.width, strategy);
                var h = self._nearestPOT(img.height, strategy);
                var cvs = document.createElement('canvas');
                cvs.width = w; cvs.height = h;
                cvs.getContext('2d').drawImage(img, 0, 0, w, h);

                cvs.toBlob(function (blob) {
                    var url = URL.createObjectURL(blob);
                    self._results.push({ blob: blob, url: url, name: file.name, origW: img.width, origH: img.height, newW: w, newH: h });

                    tbody.innerHTML += '<tr style="border-bottom:1px solid #eee;">' +
                        '<td style="padding:8px;">' + file.name + '</td>' +
                        '<td style="padding:8px;">' + img.width + '×' + img.height + '</td>' +
                        '<td style="padding:8px;font-weight:bold;">' + w + '×' + h + '</td>' +
                        '<td style="padding:8px;"><img src="' + url + '" style="max-width:60px;max-height:60px;"></td></tr>';

                    loaded++; if (loaded === files.length) {
                        Utils.showElement('potTableWrapper');
                        Utils.showElement('potActionBar');
                        Utils.setStatus('potStatus', '✨ 缩放完成！');
                    }
                }, 'image/png');
            });
        });
    },

    _export: function () {
        var files = this._results.map(function (r) { return { blob: r.blob, name: r.name }; });
        Utils.zipAndDownload(files, 'pot-resized.zip');
    },

    destroy: function () {
        this._results = [];
        Utils.resetFileInput('potFileInput');
        var tbody = document.getElementById('potTableBody');
        if (tbody) tbody.innerHTML = '';
        Utils.setStatus('potStatus', '');
        Utils.hideElement('potActionBar');
        Utils.hideElement('potTableWrapper');
    }
});