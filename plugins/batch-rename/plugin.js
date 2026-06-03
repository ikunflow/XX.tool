/**
 * 批量重命名 - 上传文件后实时预览重命名结果，确认后打包ZIP下载
 */
PM.register({
    id: 'batch-rename',
    name: '批量重命名',
    icon: '🏷️',
    description: '上传文件后实时预览重命名结果，支持查找替换/前后缀/序号，确认后打包ZIP下载。',
    color: '--deep-purple',
    colorHover: '#512da8',
    cardClass: 'batch-rename-card',
    uploadClass: '',

    _files: [],
    _newNames: [],

    render: function () {
        return '' +
            '<div class="header-area"><h2>批量重命名</h2><p>上传文件后实时预览重命名结果，确认后打包ZIP下载（内容不变仅改文件名）</p></div>' +
            Utils.createSettingsBar([
                { type: 'text', id: 'rnFind', label: '查找：', value: '' },
                { type: 'text', id: 'rnReplace', label: '替换为：', value: '' },
                { type: 'checkbox', id: 'rnRegex', checkLabel: '正则' },
                { type: 'text', id: 'rnPrefix', label: '前缀：', value: '' },
                { type: 'text', id: 'rnSuffix', label: '后缀：', value: '' },
                { type: 'number', id: 'rnStartNum', label: '起始序号：', value: 1 },
                { type: 'number', id: 'rnPad', label: '补零位数：', value: 2 },
                { type: 'text', id: 'rnSep', label: '分隔符：', value: '_' }
            ]) +
            '<div id="rnDropZone" class="upload-area rename-upload"><p>点击或拖拽批量上传文件</p><input type="file" id="rnFileInput" class="file-input-hidden" multiple></div>' +
            '<div id="rnStatus" class="status-msg" style="color:var(--deep-purple)"></div>' +
            '<div class="action-bar" id="rnActionBar"><button class="btn-all-download" style="background:var(--deep-purple);" id="rnExportBtn">📦 打包下载重命名文件</button></div>' +
            '<div class="batch-wrapper" id="rnTableWrapper" style="display:none;"><div style="overflow-x:auto"><table id="rnTable" style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:#f8f9fa;"><th>序号</th><th>原文件名</th><th>新文件名</th></tr></thead><tbody id="rnTableBody"></tbody></table></div></div>';
    },

    init: function () {
        var self = this;
        self._files = [];
        self._newNames = [];

        Utils.setupDragDrop('rnDropZone', 'rnFileInput', function (files) {
            self._files = Array.from(files);
            self._preview();
        });

        document.getElementById('rnFileInput').addEventListener('change', function (e) {
            if (e.target.files.length > 0) {
                self._files = Array.from(e.target.files);
                self._preview();
            }
        });

        document.getElementById('rnExportBtn').addEventListener('click', function () { self._export(); });

        // Re-preview on settings change
        ['rnFind', 'rnReplace', 'rnRegex', 'rnPrefix', 'rnSuffix', 'rnStartNum', 'rnPad', 'rnSep'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.addEventListener('input', function () { self._preview(); });
        });
    },

    _generateName: function (orig, idx) {
        var find = document.getElementById('rnFind').value || '';
        var replace = document.getElementById('rnReplace').value || '';
        var useRegex = document.getElementById('rnRegex').checked;
        var prefix = document.getElementById('rnPrefix').value || '';
        var suffix = document.getElementById('rnSuffix').value || '';
        var startNum = parseInt(document.getElementById('rnStartNum').value) || 1;
        var pad = parseInt(document.getElementById('rnPad').value) || 2;
        var sep = document.getElementById('rnSep').value || '_';

        var ext = orig.lastIndexOf('.') > -1 ? orig.substring(orig.lastIndexOf('.')) : '';
        var base = orig.lastIndexOf('.') > -1 ? orig.substring(0, orig.lastIndexOf('.')) : orig;

        // Apply find/replace
        if (find) {
            if (useRegex) {
                try { base = base.replace(new RegExp(find, 'g'), replace); } catch (e) { }
            } else {
                base = base.split(find).join(replace);
            }
        }

        // Build new name
        var num = String(startNum + idx).padStart(pad, '0');
        var newName = prefix + base + sep + num + suffix + ext;
        return newName;
    },

    _preview: function () {
        var self = this;
        if (self._files.length === 0) return;

        self._newNames = [];
        var tbody = document.getElementById('rnTableBody');
        tbody.innerHTML = '';

        self._files.forEach(function (file, idx) {
            var newName = self._generateName(file.name, idx);
            self._newNames.push(newName);
            tbody.innerHTML += '<tr style="border-bottom:1px solid #eee;">' +
                '<td style="padding:8px;">' + (idx + 1) + '</td>' +
                '<td style="padding:8px;">' + file.name + '</td>' +
                '<td style="padding:8px;font-weight:bold;color:var(--primary-color);">' + newName + '</td></tr>';
        });

        Utils.showElement('rnTableWrapper');
        Utils.showElement('rnActionBar');
        Utils.setStatus('rnStatus', '✨ 共 ' + self._files.length + ' 个文件待重命名');
    },

    _export: function () {
        var self = this;
        var files = self._files.map(function (file, i) {
            return { blob: file, name: self._newNames[i] || file.name };
        });
        Utils.zipAndDownload(files, 'renamed.zip');
    },

    destroy: function () {
        this._files = [];
        this._newNames = [];
        Utils.resetFileInput('rnFileInput');
        var tbody = document.getElementById('rnTableBody');
        if (tbody) tbody.innerHTML = '';
        Utils.setStatus('rnStatus', '');
        Utils.hideElement('rnActionBar');
        Utils.hideElement('rnTableWrapper');
    }
});