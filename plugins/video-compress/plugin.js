/**
 * 视频量化压制 - 本地视频自适应量化精压机
 */
PM.register({
    id: 'video-compress',
    name: '视频量化压制',
    icon: '🎬',
    description: '强行将视频资产压制到指定大小内，自适应降阶重调控视频像素矩阵。',
    color: '--cyan-color',
    colorHover: '--cyan-hover',
    cardClass: 'video-comp-card',
    uploadClass: 'video-comp-upload',

    _resultBlob: null,
    _origName: '',
    _videoNode: null,

    render: function () {
        return '' +
            '<div class="header-area"><h2>本地视频自适应量化精压机</h2><p><strong>功能说明：</strong>强行将本地视频文件容量压制到指定 MB 目标限制内，自适应调节比特率与分辨率级数。</p></div>' +
            Utils.createSettingsBar([
                { type: 'number', id: 'videoCompTarget', label: '目标视频大小：', value: 2, unit: 'MB 以内' }
            ]) +
            '<div id="videoCompDropZone" class="upload-area video-comp-upload"><p style="margin:0;color:#555;">点击或拖拽视频文件 (MP4 / WebM) 到此处</p><input type="file" id="videoCompFileInput" class="file-input-hidden" accept="video/*"></div>' +
            '<div id="videoCompStatus" class="status-msg" style="color:var(--cyan-color)"></div>' +
            '<div id="videoCompOutputWrapper" class="media-preview-box" style="display:none;">' +
            '<h3>🎬 压制视频就绪</h3><div id="videoCompInfoText" style="font-size:13px;margin:10px 0;color:#666;"></div>' +
            '<video id="videoCompPreviewNode" controls width="400"></video>' +
            '<div style="margin-top:15px;"><button class="btn-all-download" style="background:var(--cyan-color);" id="videoCompDownloadBtn">💾 立即下载压制视频</button></div></div>';
    },

    init: function () {
        var self = this;
        self._resultBlob = null;

        Utils.setupDragDrop('videoCompDropZone', 'videoCompFileInput', function (files) {
            if (files.length > 0) self._process(files[0]);
        });

        document.getElementById('videoCompFileInput').addEventListener('change', function (e) {
            if (e.target.files[0]) self._process(e.target.files[0]);
        });

        document.getElementById('videoCompDownloadBtn').addEventListener('click', function () {
            if (self._resultBlob) {
                saveAs(self._resultBlob, 'compressed_' + self._origName.substring(0, self._origName.lastIndexOf('.')) + '.mp4');
            }
        });
    },

    _process: function (file) {
        var self = this;
        Utils.setStatus('videoCompStatus', '🎬 正在扫描视频像素矩阵与帧率链...');
        Utils.hideElement('videoCompOutputWrapper');
        self._origName = file.name;

        var targetMB = parseFloat(document.getElementById('videoCompTarget').value) || 2;
        var targetBytes = targetMB * 1024 * 1024;

        var videoNode = document.createElement('video');
        self._videoNode = videoNode;
        videoNode.src = URL.createObjectURL(file);
        videoNode.muted = true; videoNode.playsInline = true;

        videoNode.addEventListener('loadedmetadata', function () {
            var duration = videoNode.duration;
            var scaleFactor = 1.0;
            if (file.size > targetBytes * 1.5) scaleFactor = Math.max(0.4, targetBytes / file.size);

            var outW = Math.floor((videoNode.videoWidth * scaleFactor) / 2) * 2;
            var outH = Math.floor((videoNode.videoHeight * scaleFactor) / 2) * 2;

            Utils.setStatus('videoCompStatus', '🚀 矩阵重组完成: ' + outW + '×' + outH + '。引擎正在纯本地进行光栅化递归压制...');

            var canvas = document.createElement('canvas');
            canvas.width = outW; canvas.height = outH;
            var ctx = canvas.getContext('2d');
            var stream = canvas.captureStream(Math.min(24, file.size > targetBytes ? 20 : 30));

            var mime = 'video/webm;codecs=vp8';
            if (!MediaRecorder.isTypeSupported(mime)) mime = 'video/mp4';

            var recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: (targetBytes * 8) / duration });
            var chunks = [];

            recorder.ondataavailable = function (e) { if (e.data.size > 0) chunks.push(e.data); };
            recorder.onstop = function () {
                self._resultBlob = new Blob(chunks, { type: mime });
                var realMB = (self._resultBlob.size / (1024 * 1024)).toFixed(2);
                document.getElementById('videoCompInfoText').innerHTML =
                    '压制分辨率: ' + outW + '×' + outH + ' | 设定上限: ' + targetMB + 'MB | 实际体积: <b>' + realMB + ' MB</b>';
                document.getElementById('videoCompPreviewNode').src = URL.createObjectURL(self._resultBlob);
                Utils.setStatus('videoCompStatus', '✨ 视频自适应量化压制成功！');
                Utils.showElement('videoCompOutputWrapper');
                URL.revokeObjectURL(videoNode.src);
            };

            recorder.start();
            videoNode.play();

            function drawFrame() {
                if (!videoNode.paused && !videoNode.ended) {
                    ctx.drawImage(videoNode, 0, 0, outW, outH);
                    requestAnimationFrame(drawFrame);
                }
            }
            videoNode.addEventListener('play', drawFrame);
            videoNode.addEventListener('ended', function () { recorder.stop(); });
        });
    },

    destroy: function () {
        this._resultBlob = null;
        this._origName = '';
        if (this._videoNode) { this._videoNode.pause(); this._videoNode = null; }
        Utils.resetFileInput('videoCompFileInput');
        Utils.setStatus('videoCompStatus', '');
        Utils.hideElement('videoCompOutputWrapper');
    }
});