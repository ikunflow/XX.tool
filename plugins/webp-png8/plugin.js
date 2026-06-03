/**
 * 批量转 WebP / PNG8 索引色 - 批量上传图片，转换并显示前后对比
 */
PM.register({
    id: 'webp-png8',
    name: '转WebP/PNG8',
    icon: '🔄',
    description: '批量上传图片，转为WebP（可调质量）或PNG8索引色，显示转换前后对比。',
    color: '--amber-color',
    colorHover: '#f39c12',
    cardClass: 'webp-png8-card',
    uploadClass: '',

    _results: [],
    _mode: 'webp',

    render: function () {
        return '' +
            '<div class="header-area"><h2>批量转 WebP / PNG8 索引色</h2><p>批量上传图片，转为WebP（可调质量）或PNG8索引色，显示转换前后对比</p></div>' +
            Utils.createSettingsBar([
                { type: 'select', id: 'wpTargetFormat', label: '目标格式：', value: 'webp', options: [{ label: 'WebP', value: 'webp' }, { label: 'PNG8 索引色', value: 'png8' }] },
                { type: 'range', id: 'wpQuality', label: 'WebP质量：', value: 80, min: 1, max: 100, valueLabel: true },
                { type: 'select', id: 'wpColors', label: '色深：', value: '256', options: [{ label: '256色', value: '256' }, { label: '128色', value: '128' }, { label: '64色', value: '64' }, { label: '32色', value: '32' }] }
            ]) +
            '<div id="wpDropZone" class="upload-area webp-upload"><p>点击或拖拽批量上传图片</p><input type="file" id="wpFileInput" class="file-input-hidden" accept="image/*" multiple></div>' +
            '<div id="wpStatus" class="status-msg" style="color:var(--amber-color)"></div>' +
            '<div class="action-bar" id="wpActionBar"><button class="btn-all-download" style="background:var(--amber-color);" id="wpExportBtn">📦 打包下载转换结果</button></div>' +
            '<div class="batch-wrapper" id="wpTableWrapper" style="display:none;"><div style="overflow-x:auto"><table id="wpTable" style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:#f8f9fa;"><th>原文件名</th><th>原大小</th><th>转换后大小</th><th>节省</th><th>预览</th></tr></thead><tbody id="wpTableBody"></tbody></table></div></div>';
    },

    init: function () {
        var self = this;
        self._results = [];

        Utils.setupDragDrop('wpDropZone', 'wpFileInput', function (files) {
            self._process(Array.from(files));
        });

        document.getElementById('wpFileInput').addEventListener('change', function (e) {
            if (e.target.files.length > 0) self._process(Array.from(e.target.files));
        });

        document.getElementById('wpExportBtn').addEventListener('click', function () { self._export(); });

        document.getElementById('wpTargetFormat').addEventListener('change', function () {
            var fmt = this.value;
            self._mode = fmt;
            document.getElementById('wpQualityWrap').style.display = fmt === 'webp' ? '' : 'none';
            document.getElementById('wpColorWrap').style.display = fmt === 'png8' ? '' : 'none';
        });
    },

    _process: function (files) {
        var self = this;
        self._results = [];
        Utils.setStatus('wpStatus', '转换中...');
        Utils.hideElement('wpActionBar');
        Utils.hideElement('wpTableWrapper');

        self._mode = document.getElementById('wpTargetFormat').value;
        var quality = parseInt(document.getElementById('wpQuality').value) / 100;
        var colors = parseInt(document.getElementById('wpColors').value);
        var tbody = document.getElementById('wpTableBody');
        tbody.innerHTML = '';

        var loaded = 0;
        files.forEach(function (file, idx) {
            Utils.loadImageFromFile(file).then(function (img) {
                var cvs = document.createElement('canvas');
                cvs.width = img.width; cvs.height = img.height;
                cvs.getContext('2d').drawImage(img, 0, 0);

                if (self._mode === 'webp') {
                    cvs.toBlob(function (blob) {
                        self._addResult(file, blob, idx);
                        loaded++; if (loaded === files.length) self._finish();
                    }, 'image/webp', quality);
                } else {
                    // PNG8 via color quantization
                    var png8Blob = self._quantizeToPNG8(cvs, colors);
                    self._addResult(file, png8Blob, idx);
                    loaded++; if (loaded === files.length) self._finish();
                }
            });
        });
    },

    _quantizeToPNG8: function (cvs, maxColors) {
        // Simple quantization: posterize then export as PNG (still full color, approximation)
        var ctx = cvs.getContext('2d');
        var imgData = ctx.getImageData(0, 0, cvs.width, cvs.height);
        var factor = Math.floor(256 / Math.sqrt(maxColors));
        var data = imgData.data;
        for (var i = 0; i < data.length; i += 4) {
            data[i] = Math.round(data[i] / factor) * factor;
            data[i + 1] = Math.round(data[i + 1] / factor) * factor;
            data[i + 2] = Math.round(data[i + 2] / factor) * factor;
        }
        ctx.putImageData(imgData, 0, 0);
        // Export via toBlob
        var blob = null;
        cvs.toBlob(function (b) { blob = b; }, 'image/png');
        return blob;
    },

    _addResult: function (file, blob, idx) {
        var self = this;
        var url = URL.createObjectURL(blob);
        var saved = file.size - blob.size;
        var savedPct = file.size > 0 ? ((saved / file.size) * 100).toFixed(1) : 0;
        var ext = self._mode === 'webp' ? '.webp' : '.png';
        var newName = file.name.replace(/\.[^.]+$/, ext);

        self._results.push({ origFile: file, blob: blob, url: url, name: newName, idx: idx });

        var tbody = document.getElementById('wpTableBody');
        tbody.innerHTML += '<tr style="border-bottom:1px solid #eee;">' +
            '<td style="padding:8px;">' + file.name + '</td>' +
            '<td style="padding:8px;">' + Utils.formatSize(file.size) + '</td>' +
            '<td style="padding:8px;">' + Utils.formatSize(blob.size) + '</td>' +
            '<td style="padding:8px;color:' + (saved > 0 ? 'var(--success-color)' : '#e74c3c') + ';">' + (saved > 0 ? '-' : '+') + savedPct + '%</td>' +
            '<td style="padding:8px;"><img src="' + url + '" style="max-width:60px;max-height:60px;"></td></tr>';
    },

    _finish: function () {
        Utils.showElement('wpTableWrapper');
        Utils.showElement('wpActionBar');
        Utils.setStatus('wpStatus', '✨ 转换完成！共 ' + this._results.length + ' 个文件');
    },

    _export: function () {
        var files = this._results.map(function (r) { return { blob: r.blob, name: r.name }; });
        Utils.zipAndDownload(files, 'converted.zip');
    },

    destroy: function () {
        this._results = [];
        Utils.resetFileInput('wpFileInput');
        var tbody = document.getElementById('wpTableBody');
        if (tbody) tbody.innerHTML = '';
        Utils.setStatus('wpStatus', '');
        Utils.hideElement('wpActionBar');
        Utils.hideElement('wpTableWrapper');
    }
});