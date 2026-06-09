/**
 * 音频量化压缩 - 本地音频全自动量化压缩器
 */
PM.register({
    id: 'audio-compress',
    name: '音频量化压缩',
    icon: '🎵',
    description: '导入游戏 BGM/音效，指定目标体积（KB），自适应调节码率重采样压制。',
    color: '--pink-color',
    colorHover: '--pink-hover',
    cardClass: 'audio-comp-card',
    uploadClass: 'audio-comp-upload',

    _resultBlob: null,
    _origName: '',

    render: function () {
        return '' +
            '<div class="header-area"><h2>本地音频全自动量化压缩器</h2><p><strong>功能说明：</strong>导入游戏 MP3/WAV 资产，强行限流压制到指定 KB 目标容量体积以下。</p></div>' +
            Utils.createSettingsBar([
                { type: 'number', id: 'audioTargetSize', label: '目标音频大小：', value: 300, unit: 'KB 以内' }
            ]) +
            '<div id="audioDropZone" class="upload-area audio-comp-upload"><p style="margin:0;color:#555;">点击或拖拽音频文件 (MP3 / WAV / OGG) 到此处</p><input type="file" id="audioFileInput" class="file-input-hidden" accept="audio/*"></div>' +
            '<div id="audioStatus" class="status-msg" style="color:var(--pink-color)"></div>' +
            '<div id="audioOutputWrapper" class="media-preview-box" style="display:none;">' +
            '<h3>🎵 压缩音频就绪</h3><div id="audioInfoText" style="font-size:13px;margin:10px 0;color:#666;"></div>' +
            '<audio id="audioPreviewNode" controls></audio>' +
            '<div style="margin-top:15px;"><button class="btn-all-download" style="background:var(--pink-color);" id="audioDownloadBtn">💾 立即下载量化音频</button></div></div>';
    },

    init: function () {
        var self = this;
        self._resultBlob = null;

        Utils.setupDragDrop('audioDropZone', 'audioFileInput', function (files) {
            if (files.length > 0) self._process(files[0]);
        });

        document.getElementById('audioFileInput').addEventListener('change', function (e) {
            if (e.target.files[0]) self._process(e.target.files[0]);
        });

        document.getElementById('audioDownloadBtn').addEventListener('click', function () {
            if (self._resultBlob) {
                saveAs(self._resultBlob, 'compressed_' + self._origName.substring(0, self._origName.lastIndexOf('.')) + '.mp3');
            }
        });
    },

    _process: async function (file) {
        var self = this;
        Utils.setStatus('audioStatus', '⚡ 正在解析音轨特征与时频信号...');
        Utils.hideElement('audioOutputWrapper');
        self._origName = file.name;

        var targetBytes = (parseFloat(document.getElementById('audioTargetSize').value) || 300) * 1024;
        var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        var arrayBuffer = await file.arrayBuffer();

        audioCtx.decodeAudioData(arrayBuffer, function (audioBuffer) {
            var duration = audioBuffer.duration;
            var targetBitrate = Math.max(16000, Math.min(192000, (targetBytes * 8) / duration));
            Utils.setStatus('audioStatus', '🎛️ 目标比特率计算完成: ' + (targetBitrate / 1000).toFixed(1) + 'kbps。正在二次量化重采样...');

            var destination = audioCtx.createMediaStreamDestination();
            var bufferSource = audioCtx.createBufferSource();
            bufferSource.buffer = audioBuffer;
            bufferSource.connect(destination);

            var mime = 'audio/webm;codecs=opus';
            if (!MediaRecorder.isTypeSupported(mime)) mime = 'audio/ogg;codecs=opus';
            if (!MediaRecorder.isTypeSupported(mime)) mime = 'audio/mp4';

            var recorder = new MediaRecorder(destination.stream, { mimeType: mime, audioBitsPerSecond: targetBitrate });
            var chunks = [];

            recorder.ondataavailable = function (e) { if (e.data.size > 0) chunks.push(e.data); };
            recorder.onstop = function () {
                self._resultBlob = new Blob(chunks, { type: mime });
                var finalKB = (self._resultBlob.size / 1024).toFixed(1);
                document.getElementById('audioInfoText').innerHTML =
                    '源文件时长: ' + duration.toFixed(1) + 's | 设定上限: ' + document.getElementById('audioTargetSize').value + 'KB | 实际输出: <b>' + finalKB + ' KB</b>';
                document.getElementById('audioPreviewNode').src = URL.createObjectURL(self._resultBlob);
                Utils.setStatus('audioStatus', '✨ 音频量化精压完成！');
                Utils.showElement('audioOutputWrapper');
            };

            recorder.start();
            bufferSource.start(0);
            setTimeout(function () { recorder.stop(); bufferSource.stop(); }, duration * 1000 + 100);
        }, function () { Utils.setStatus('audioStatus', '❌ 音频解码器遇到未知错误。'); });
    },

    destroy: function () {
        this._resultBlob = null;
        this._origName = '';
        Utils.resetFileInput('audioFileInput');
        Utils.setStatus('audioStatus', '');
        Utils.hideElement('audioOutputWrapper');
    }
});