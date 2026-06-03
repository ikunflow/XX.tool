/**
 * 资源下载模块 - 网页媒体资源嗅探与下载
 */
PM.register({
    id: 'downloader',
    name: '资源下载模块',
    icon: '🌐',
    description: '全自动穿透跨域代理，分析捕捉目标网页中的所有多媒体源。',
    color: '--teal-color',
    colorHover: '--teal-hover',
    cardClass: 'downloader-card',
    uploadClass: '',

    _resources: [],

    render: function () {
        return '' +
            '<div class="header-area"><h2>网页媒体资源嗅探与下载</h2></div>' +
            '<div class="downloader-bar"><input type="text" id="downloaderUrlInput" placeholder="输入网址..." style="padding:8px 14px;border:1px solid #ccc;border-radius:6px;width:400px;font-size:14px;"><button class="btn-analyze" style="background:var(--teal-color);color:white;border:none;padding:8px 20px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:bold;" id="downloaderAnalyzeBtn">🔍 提取</button></div>' +
            '<div id="downloaderStatus" class="status-msg" style="color:var(--teal-color)"></div>' +
            '<div id="downloaderResArea" style="display:none;"><div class="res-grid" id="downloaderResGrid"></div></div>';
    },

    init: function () {
        var self = this;
        self._resources = [];

        document.getElementById('downloaderAnalyzeBtn').addEventListener('click', function () {
            self._analyze();
        });

        document.getElementById('downloaderUrlInput').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') self._analyze();
        });
    },

    _analyze: async function () {
        var self = this;
        self._resources = [];
        var input = document.getElementById('downloaderUrlInput');
        var status = document.getElementById('downloaderStatus');
        var area = document.getElementById('downloaderResArea');
        var grid = document.getElementById('downloaderResGrid');

        var url = input.value.trim();
        if (!url) return;
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

        status.textContent = '🔍 正在穿透解析...';
        area.style.display = 'none';
        grid.innerHTML = '';

        try {
            var proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(url);
            var resp = await fetch(proxyUrl);
            var data = await resp.json();
            var imgRegex = /<img[^>]+src=["']([^"']+)["']/g;
            var match, seen = new Set();

            while ((match = imgRegex.exec(data.contents)) !== null) {
                try {
                    var abs = new URL(match[1], url).href;
                    if (!seen.has(abs) && !abs.startsWith('data:')) {
                        seen.add(abs);
                        self._resources.push({ url: abs, name: 'asset.jpg' });
                    }
                } catch (e) { /* skip invalid */ }
            }

            if (self._resources.length === 0) {
                status.textContent = '⚠️ 网页内未捕获多媒体资源。';
            } else {
                status.textContent = '发现 ' + self._resources.length + ' 个媒体资产。';
                area.style.display = 'block';
                self._resources.forEach(function (r) {
                    grid.innerHTML += '<div class="res-card"><div class="res-preview"><img src="' + r.url + '" onerror="this.parentElement.innerHTML=\'<span style=color:#999>加载失败</span>\'"></div>' +
                        '<button class="btn-download" onclick="window.open(\'' + r.url + '\')">直链查看</button></div>';
                });
            }
        } catch (e) {
            status.textContent = '❌ 通道解析障碍。';
        }
    },

    destroy: function () {
        this._resources = [];
        var input = document.getElementById('downloaderUrlInput');
        if (input) input.value = '';
        Utils.setStatus('downloaderStatus', '');
        var area = document.getElementById('downloaderResArea');
        if (area) area.style.display = 'none';
        var grid = document.getElementById('downloaderResGrid');
        if (grid) grid.innerHTML = '';
    }
});