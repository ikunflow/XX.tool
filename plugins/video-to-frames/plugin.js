/**
 * 视频转序列帧 - 视频精准抽帧与体积量化器
 */
PM.register({
    id: 'video-to-frames',
    name: '视频转序列帧',
    icon: '🎞️',
    description: '本地音视频轨道高保真秒级离散抽帧，智能量化每帧导出大小。',
    color: '--orange-color',
    colorHover: '--orange-hover',
    cardClass: 'video-card',
    uploadClass: 'video-upload',

    _zipQueue: [],
    _videoNode: null,

    render: function () {
        return '' +
            '<div class="header-area"><h2>视频精准抽帧与体积量化器</h2></div>' +
            Utils.createSettingsBar([
                { type: 'number', id: 'videoFrameCount', label: '抽取总帧数：', value: 10 },
                { type: 'number', id: 'videoFrameSize', label: '单帧上限：', value: 50, unit: 'KB 内' },
                { type: 'text', id: 'videoFramePrefix', label: '前缀：', value: 'frame' }
            ]) +
            '<div id="videoDropZone" class="upload-area video-upload"><p>点击或拖拽视频文件</p><input type="file" id="videoFileInput" class="file-input-hidden" accept="video/*"></div>' +
            '<div id="videoStatus" class="status-msg" style="color:var(--orange-color)"></div>' +
            '<div class="action-bar" id="videoActionBar"><button class="btn-all-download" style="background:var(--orange-color);" id="videoDownloadBtn">🎁 打包下载全套序列帧</button></div>' +
            '<div class="batch-wrapper" id="videoOutputWrapper" style="display:none;"><div class="res-grid" id="videoGridContainer"></div></div>';
    },

    init: function () {
        var self = this;
        self._zipQueue = [];

        Utils.setupDragDrop('videoDropZone', 'videoFileInput', function (files) {
            if (files.length > 0) self._process(files[0]);
        });

        document.getElementById('videoFileInput').addEventListener('change', function (e) {
            if (e.target.files[0]) self._process(e.target.files[0]);
        });

        document.getElementById('videoDownloadBtn').addEventListener('click', function () {
            Utils.zipAndDownload(self._zipQueue.map(function (item) {
                return { blob: item.blob, name: item.fileName };
            }), 'sequence.zip');
        });
    },

    _process: function (file) {
        var self = this;
        var grid = document.getElementById('videoGridContainer');
        var wrapper = document.getElementById('videoOutputWrapper');
        grid.innerHTML = '';
        wrapper.style.display = 'none';
        self._zipQueue = [];
        Utils.setStatus('videoStatus', '🎬 正在加载音视频分析器...');
        Utils.hideElement('videoActionBar');

        var totalF = parseInt(document.getElementById('videoFrameCount').value) || 10;
        var maxK = (parseFloat(document.getElementById('videoFrameSize').value) || 50) * 1024;
        var pfx = document.getElementById('videoFramePrefix').value.trim() || 'frame';

        var node = document.createElement('video');
        self._videoNode = node;
        node.src = URL.createObjectURL(file);
        node.muted = true; node.playsInline = true;

        node.addEventListener('loadedmetadata', function () {
            wrapper.style.display = 'block';
            var interval = node.duration / (totalF + 1);
            var i = 1;

            function nextFrame() {
                if (i > totalF) {
                    Utils.setStatus('videoStatus', '✨ 序列抽帧成功！');
                    Utils.showElement('videoActionBar');
                    URL.revokeObjectURL(node.src);
                    return;
                }
                Utils.setStatus('videoStatus', '⏳ 离散抽帧中: ' + i + '/' + totalF + '...');
                node.currentTime = i * interval;
                i++;
            }

            node.addEventListener('seeked', function handler() {
                if (i > totalF + 1) return;
                var cvs = document.createElement('canvas');
                cvs.width = node.videoWidth; cvs.height = node.videoHeight;
                cvs.getContext('2d').drawImage(node, 0, 0, cvs.width, cvs.height);
                var fName = pfx + '_' + String(i - 1).padStart(3, '0') + '.jpeg';

                Utils.compressEngine(cvs, 0.95, maxK, function (blob) {
                    var url = URL.createObjectURL(blob);
                    self._zipQueue.push({ blob: blob, fileName: fName });
                    grid.innerHTML += '<div class="res-card"><div class="res-preview"><img src="' + url + '"></div><div class="res-info">' + fName + '</div></div>';
                    nextFrame();
                });
            });

            nextFrame();
        });
    },

    destroy: function () {
        this._zipQueue = [];
        if (this._videoNode) {
            this._videoNode.pause();
            this._videoNode = null;
        }
        Utils.resetFileInput('videoFileInput');
        var grid = document.getElementById('videoGridContainer');
        if (grid) grid.innerHTML = '';
        var wrapper = document.getElementById('videoOutputWrapper');
        if (wrapper) wrapper.style.display = 'none';
        Utils.setStatus('videoStatus', '');
        Utils.hideElement('videoActionBar');
    }
});