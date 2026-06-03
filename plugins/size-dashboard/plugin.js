/**
 * 包体体积估算仪表盘 - 拖入所有项目资源文件，自动分类统计与4MB微信小游戏限制对比
 */
PM.register({
    id: 'size-dashboard',
    name: '包体仪表盘',
    icon: '📊',
    description: '拖入项目资源文件，自动分类统计与4MB微信小游戏限制对比，导出优化建议报告。',
    color: '--blue-grey',
    colorHover: '#546e7a',
    cardClass: 'size-dashboard-card',
    uploadClass: '',

    _results: {},
    _limitBytes: 4 * 1024 * 1024,

    render: function () {
        return '' +
            '<div class="header-area"><h2>包体体积估算仪表盘</h2><p>拖入所有项目资源文件，自动分类统计与4MB微信小游戏限制对比</p></div>' +
            '<div id="dashDropZone" class="upload-area dash-upload"><p>点击或拖拽批量上传项目资源文件</p><input type="file" id="dashFileInput" class="file-input-hidden" multiple></div>' +
            '<div id="dashStatus" class="status-msg" style="color:var(--blue-grey)"></div>' +
            '<div class="dash-panel" id="dashPanel" style="display:none;padding:20px;background:#fafafa;border-radius:10px;border:1px solid #e0e0e0;margin-top:20px;">' +
            '<div style="text-align:center;margin-bottom:20px;"><div style="color:#999;font-size:14px;">总大小</div><div style="font-size:36px;font-weight:bold;color:#2c3e50;" id="dashTotalSize">0 KB</div><div style="color:#999;font-size:13px;" id="dashVsLimit"></div></div>' +
            '<div class="dash-bar-wrap" style="margin-bottom:12px;"><div class="dash-bar-label" style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;"><span>🖼 图片 <span id="dashImgCount">0</span>个</span><span id="dashImgSize">0 KB</span></div><div style="background:#e0e0e0;height:8px;border-radius:4px;overflow:hidden;"><div style="background:#3498db;height:100%;transition:width 0.3s;" id="dashImgBar"></div></div></div>' +
            '<div class="dash-bar-wrap" style="margin-bottom:12px;"><div class="dash-bar-label" style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;"><span>🎵 音频 <span id="dashAudioCount">0</span>个</span><span id="dashAudioSize">0 KB</span></div><div style="background:#e0e0e0;height:8px;border-radius:4px;overflow:hidden;"><div style="background:#e67e22;height:100%;transition:width 0.3s;" id="dashAudioBar"></div></div></div>' +
            '<div class="dash-bar-wrap" style="margin-bottom:12px;"><div class="dash-bar-label" style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;"><span>📄 其他 <span id="dashOtherCount">0</span>个</span><span id="dashOtherSize">0 KB</span></div><div style="background:#e0e0e0;height:8px;border-radius:4px;overflow:hidden;"><div style="background:#9b59b6;height:100%;transition:width 0.3s;" id="dashOtherBar"></div></div></div>' +
            '<div style="text-align:center;margin:20px 0;"><canvas id="dashGauge" width="140" height="140"></canvas><div style="color:#999;font-size:12px;">4MB 占比</div></div>' +
            '<div style="background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:15px;margin-top:15px;" id="dashSuggestions"></div>' +
            '<div style="text-align:center;margin-top:15px;"><button style="background:#7f8c8d;color:white;border:none;padding:10px 24px;border-radius:6px;cursor:pointer;font-size:14px;" id="dashReportBtn">📄 导出统计报告</button></div></div>';
    },

    init: function () {
        var self = this;

        Utils.setupDragDrop('dashDropZone', 'dashFileInput', function (files) {
            self._process(Array.from(files));
        });

        document.getElementById('dashFileInput').addEventListener('change', function (e) {
            if (e.target.files.length > 0) self._process(Array.from(e.target.files));
        });

        document.getElementById('dashReportBtn').addEventListener('click', function () { self._exportReport(); });
    },

    _process: function (files) {
        var self = this;
        Utils.setStatus('dashStatus', '统计中...');
        Utils.hideElement('dashPanel');

        var img = { count: 0, bytes: 0 }, audio = { count: 0, bytes: 0 }, other = { count: 0, bytes: 0 };
        var imgExts = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'ico'];
        var audioExts = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'opus', 'flac'];

        files.forEach(function (file) {
            var ext = file.name.substring(file.name.lastIndexOf('.') + 1).toLowerCase();
            if (imgExts.indexOf(ext) !== -1) { img.count++; img.bytes += file.size; }
            else if (audioExts.indexOf(ext) !== -1) { audio.count++; audio.bytes += file.size; }
            else { other.count++; other.bytes += file.size; }
        });

        self._results = { img: img, audio: audio, other: other, total: img.bytes + audio.bytes + other.bytes, fileCount: files.length };
        self._renderDashboard();
    },

    _renderDashboard: function () {
        var self = this;
        var r = self._results;
        var limit = self._limitBytes;
        var pct = Math.min(100, (r.total / limit * 100)).toFixed(1);

        document.getElementById('dashTotalSize').textContent = Utils.formatSize(r.total);
        document.getElementById('dashVsLimit').textContent = '对比上限 4MB: ' + pct + '% (' + (pct > 100 ? '⚠️ 超出限制' : '✅ 在限制内') + ')';

        document.getElementById('dashImgCount').textContent = r.img.count;
        document.getElementById('dashImgSize').textContent = Utils.formatSize(r.img.bytes);
        document.getElementById('dashImgBar').style.width = (r.total > 0 ? r.img.bytes / r.total * 100 : 0) + '%';

        document.getElementById('dashAudioCount').textContent = r.audio.count;
        document.getElementById('dashAudioSize').textContent = Utils.formatSize(r.audio.bytes);
        document.getElementById('dashAudioBar').style.width = (r.total > 0 ? r.audio.bytes / r.total * 100 : 0) + '%';

        document.getElementById('dashOtherCount').textContent = r.other.count;
        document.getElementById('dashOtherSize').textContent = Utils.formatSize(r.other.bytes);
        document.getElementById('dashOtherBar').style.width = (r.total > 0 ? r.other.bytes / r.total * 100 : 0) + '%';

        // Draw gauge
        var gauge = document.getElementById('dashGauge');
        var ctx = gauge.getContext('2d');
        var cx = 70, cy = 70, r = 55;
        ctx.clearRect(0, 0, 140, 140);

        // Background arc
        ctx.beginPath(); ctx.arc(cx, cy, r, 0.75 * Math.PI, 2.25 * Math.PI);
        ctx.strokeStyle = '#e0e0e0'; ctx.lineWidth = 12; ctx.stroke();

        // Foreground arc
        var arcPct = Math.min(1, r.total / limit);
        ctx.beginPath(); ctx.arc(cx, cy, r, 0.75 * Math.PI, 0.75 * Math.PI + arcPct * 1.5 * Math.PI);
        var color = arcPct > 0.8 ? '#e74c3c' : arcPct > 0.5 ? '#e67e22' : '#2ecc71';
        ctx.strokeStyle = color; ctx.lineWidth = 12; ctx.stroke();

        // Text
        ctx.fillStyle = '#333'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(pct + '%', cx, cy + 6);
        ctx.font = '11px sans-serif'; ctx.fillStyle = '#999';
        ctx.fillText('4MB占比', cx, cy + 36);

        // Suggestions
        var suggestions = [];
        if (r.total > limit) suggestions.push('🚨 总包体超出4MB限制，建议优先压缩图片资源（可使用切割压缩或单图压缩模块）');
        if (r.img.bytes > limit * 0.8) suggestions.push('💡 图片占比过高（' + Utils.formatSize(r.img.bytes) + '），建议使用WebP/PNG8批量转换或雪碧图裁切透明边');
        if (r.audio.bytes > limit * 0.5) suggestions.push('🎵 音频体积较大，建议使用音频量化压缩模块降低码率');
        if (r.total <= limit) suggestions.push('✅ 当前包体在4MB限制内，资源分配合理。');
        document.getElementById('dashSuggestions').innerHTML = suggestions.map(function (s) { return '<div style="padding:6px 0;font-size:13px;">' + s + '</div>'; }).join('');

        Utils.showElement('dashPanel');
        Utils.setStatus('dashStatus', '✨ 统计完成！共 ' + r.fileCount + ' 个文件，总大小 ' + Utils.formatSize(r.total));
    },

    _exportReport: function () {
        var self = this;
        var r = self._results;
        var report = '包体体积统计报告\n' +
            '==================\n' +
            '统计时间: ' + new Date().toLocaleString() + '\n' +
            '文件总数: ' + r.fileCount + '\n' +
            '总大小: ' + Utils.formatSize(r.total) + '\n' +
            '4MB占比: ' + (r.total / self._limitBytes * 100).toFixed(1) + '%\n\n' +
            '图片: ' + r.img.count + '个, ' + Utils.formatSize(r.img.bytes) + '\n' +
            '音频: ' + r.audio.count + '个, ' + Utils.formatSize(r.audio.bytes) + '\n' +
            '其他: ' + r.other.count + '个, ' + Utils.formatSize(r.other.bytes) + '\n' +
            '状态: ' + (r.total > self._limitBytes ? '超出4MB限制' : '在4MB限制内') + '\n';

        var blob = new Blob([report], { type: 'text/plain' });
        saveAs(blob, 'package_report_' + new Date().toISOString().slice(0, 10) + '.txt');
    },

    destroy: function () {
        this._results = {};
        Utils.resetFileInput('dashFileInput');
        Utils.setStatus('dashStatus', '');
        Utils.hideElement('dashPanel');
    }
});