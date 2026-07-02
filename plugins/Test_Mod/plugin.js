/**
 * 测试模块 - Test_Mod
 * 由模块工厂自动生成
 */
PM.register({
    id: 'Test_Mod',
    name: '测试模块',
    icon: '🔧',
    description: 'Test_Mod',
    color: '--primary-color',
    colorHover: '--primary-color',
    cardClass: 'Test_Mod-card',
    uploadClass: '',

    _data: null,

    render: function () {
        return '' +
            '<div class="header-area"><h2>🔧 测试模块</h2><p>Test_Mod</p></div>' +
            Utils.createSettingsBar([
                { type: 'text', id: 'Test_ModInput', label: '参数：', value: '' }
            ]) +
            '<div id="Test_ModDropZone" class="upload-area"><p>点击或拖拽上传文件</p><input type="file" id="Test_ModFileInput" class="file-input-hidden"></div>' +
            '<div id="Test_ModStatus" class="status-msg" style="color:var(--primary-color)"></div>' +
            '<div class="action-bar" id="Test_ModActionBar" style="display:none"><button class="btn-all-download" style="background:var(--primary-color);" id="Test_ModDownloadBtn">⬇️ 下载结果</button></div>' +
            '<div id="Test_ModOutput" style="margin-top:16px;"></div>'
        ;
    },

    init: function () {
        var self = this;
        self._data = null;

        Utils.setupDragDrop('Test_ModDropZone', 'Test_ModFileInput', function (files) {
            if (files.length > 0) self._process(files[0]);
        });

        document.getElementById('Test_ModFileInput').addEventListener('change', function (e) {
            if (e.target.files[0]) self._process(e.target.files[0]);
        });

        document.getElementById('Test_ModDownloadBtn').addEventListener('click', function () {
            if (self._data) {
                // TODO: 实现下载逻辑
                console.log('下载:', self._data);
            }
        });

        // TODO: 添加更多事件绑定
    },

    _process: function (input) {
        var self = this;
        Utils.setStatus('Test_ModStatus', '处理中...');
        Utils.hideElement('Test_ModActionBar');

        // TODO: 实现核心处理逻辑
        console.log('处理输入:', input);
        self._data = input;

        Utils.setStatus('Test_ModStatus', '✅ 处理完成！');
        Utils.showElement('Test_ModActionBar');
    },

    destroy: function () {
        this._data = null;
        Utils.resetFileInput('Test_ModFileInput');
        Utils.setStatus('Test_ModStatus', '');
        Utils.hideElement('Test_ModActionBar');
        var out = document.getElementById('Test_ModOutput');
        if (out) out.innerHTML = '';
    }
});