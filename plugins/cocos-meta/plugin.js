/**
 * 生成 Cocos .meta 文件 - 批量上传资源文件，为每个文件生成Cocos Creator格式的.meta文件
 */
PM.register({
    id: 'cocos-meta',
    name: '生成.meta',
    icon: '📄',
    description: '批量上传资源文件，为每个文件生成UUID并创建Cocos Creator格式的.meta文件。',
    color: '--brown-color',
    colorHover: '#5d4037',
    cardClass: 'cocos-meta-card',
    uploadClass: '',

    _results: [],

    _generateUUID: function () {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    _getImporterType: function (fileName) {
        var ext = fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();
        var imageTypes = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'];
        var audioTypes = ['mp3', 'wav', 'ogg', 'm4a', 'aac'];
        var fontTypes = ['ttf', 'otf'];
        if (imageTypes.indexOf(ext) !== -1) return 'image';
        if (audioTypes.indexOf(ext) !== -1) return 'audio-clip';
        if (fontTypes.indexOf(ext) !== -1) return 'font';
        if (ext === 'json') return 'json';
        if (ext === 'prefab') return 'prefab';
        return 'text';
    },

    render: function () {
        return '' +
            '<div class="header-area"><h2>自动生成 Cocos .meta 文件</h2><p>批量上传资源文件，为每个文件生成Cocos Creator格式的.meta文件</p></div>' +
            '<div id="metaDropZone" class="upload-area meta-upload"><p>点击或拖拽批量上传资源文件</p><input type="file" id="metaFileInput" class="file-input-hidden" multiple></div>' +
            '<div id="metaStatus" class="status-msg" style="color:var(--brown-color)"></div>' +
            '<div class="action-bar" id="metaActionBar"><button class="btn-all-download" style="background:var(--brown-color);" id="metaExportBtn">📦 打包下载（原文件+.meta）</button></div>' +
            '<div class="batch-wrapper" id="metaTableWrapper" style="display:none;"><div style="overflow-x:auto"><table id="metaTable" style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:#f8f9fa;"><th>文件名</th><th>.meta UUID</th><th>类型</th></tr></thead><tbody id="metaTableBody"></tbody></table></div></div>';
    },

    init: function () {
        var self = this;
        self._results = [];

        Utils.setupDragDrop('metaDropZone', 'metaFileInput', function (files) {
            self._process(Array.from(files));
        });

        document.getElementById('metaFileInput').addEventListener('change', function (e) {
            if (e.target.files.length > 0) self._process(Array.from(e.target.files));
        });

        document.getElementById('metaExportBtn').addEventListener('click', function () { self._export(); });
    },

    _process: function (files) {
        var self = this;
        self._results = [];
        Utils.setStatus('metaStatus', '生成中...');
        Utils.hideElement('metaActionBar');
        Utils.hideElement('metaTableWrapper');

        var tbody = document.getElementById('metaTableBody');
        tbody.innerHTML = '';

        files.forEach(function (file) {
            var uuid = self._generateUUID();
            var type = self._getImporterType(file.name);

            var meta = {
                ver: '1.0.0',
                uuid: uuid,
                subMetas: {},
                importer: type,
                imported: true,
                syncNodeName: ''
            };

            var metaStr = JSON.stringify(meta, null, 2);
            var metaBlob = new Blob([metaStr], { type: 'application/json' });
            var metaName = file.name + '.meta';

            self._results.push({ origFile: file, metaBlob: metaBlob, metaName: metaName, uuid: uuid, type: type });

            tbody.innerHTML += '<tr style="border-bottom:1px solid #eee;">' +
                '<td style="padding:8px;">' + file.name + '</td>' +
                '<td style="padding:8px;font-size:11px;font-family:monospace;">' + uuid + '</td>' +
                '<td style="padding:8px;">' + type + '</td></tr>';
        });

        Utils.showElement('metaTableWrapper');
        Utils.showElement('metaActionBar');
        Utils.setStatus('metaStatus', '✨ 生成完成！共 ' + self._results.length + ' 个文件');
    },

    _export: function () {
        var self = this;
        var files = [];
        self._results.forEach(function (r) {
            files.push({ blob: r.origFile, name: r.origFile.name });
            files.push({ blob: r.metaBlob, name: r.metaName });
        });
        Utils.zipAndDownload(files, 'cocos-meta.zip');
    },

    destroy: function () {
        this._results = [];
        Utils.resetFileInput('metaFileInput');
        var tbody = document.getElementById('metaTableBody');
        if (tbody) tbody.innerHTML = '';
        Utils.setStatus('metaStatus', '');
        Utils.hideElement('metaActionBar');
        Utils.hideElement('metaTableWrapper');
    }
});