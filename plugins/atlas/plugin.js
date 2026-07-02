/**
 * 图集大图生成器 - 游戏引擎本地图集打包与数据生成器
 */
PM.register({
    id: 'atlas',
    name: '图集大图生成器',
    icon: '📦',
    description: '散图自动化高密度拼合，一键导出 Unity JSON 与 Cocos Plist 数据配对包。',
    color: '--indigo-color',
    colorHover: '--indigo-hover',
    cardClass: 'atlas-card',
    uploadClass: 'atlas-upload',

    _sprites: [],
    _currentData: null,

    render: function () {
        return '' +
            '<div class="header-area"><h2>游戏引擎本地图集打包与数据生成器</h2></div>' +
            Utils.createSettingsBar([
                { type: 'select', id: 'atlasMaxSize', label: '最大边界：', value: '2048', options: [{ label: '1024', value: '1024' }, { label: '2048', value: '2048' }] },
                { type: 'number', id: 'atlasPadding', label: '精灵间距：', value: 2, unit: 'px' },
                { type: 'text', id: 'atlasExportName', label: '输出命名：', value: 'hero_atlas' }
            ]) +
            '<div id="atlasDropZone" class="upload-area atlas-upload"><p>批量拖拽散图打包</p><input type="file" id="atlasFileInput" class="file-input-hidden" accept="image/*" multiple></div>' +
            '<div id="atlasStatus" class="status-msg" style="color:var(--indigo-color)"></div>' +
            '<div class="action-bar" id="atlasActionBar" style="display:none;gap:15px;justify-content:center;">' +
            '<button class="btn-all-download" style="background:var(--indigo-color);" id="atlasBtnCocos">🚀 导出 Cocos (.PLIST)</button>' +
            '<button class="btn-all-download" style="background:var(--success-color);" id="atlasBtnUnity">🌿 导出 Unity (.JSON)</button></div>' +
            '<div class="batch-wrapper" id="atlasPreviewWrapper" style="display:none;"><div class="atlas-preview-container"><canvas id="atlasCanvasPreview"></canvas></div></div>';
    },

    init: function () {
        var self = this;
        self._sprites = [];
        self._currentData = null;

        Utils.setupDragDrop('atlasDropZone', 'atlasFileInput', function (files) {
            self._loadFiles(Array.from(files));
        });

        document.getElementById('atlasFileInput').addEventListener('change', function (e) {
            if (e.target.files.length > 0) self._loadFiles(Array.from(e.target.files));
        });

        document.getElementById('atlasBtnCocos').addEventListener('click', function () { self._exportPackage('cocos'); });
        document.getElementById('atlasBtnUnity').addEventListener('click', function () { self._exportPackage('unity'); });
    },

    _loadFiles: function (files) {
        var self = this;
        if (files.length === 0) return;
        self._sprites = [];
        self._currentData = null;
        Utils.setStatus('atlasStatus', '解码中...');
        Utils.hideElement('atlasActionBar');
        Utils.hideElement('atlasPreviewWrapper');

        var loaded = 0;
        files.forEach(function (file) {
            Utils.loadImageFromFile(file).then(function (img) {
                self._sprites.push({
                    img: img,
                    name: file.name.substring(0, file.name.lastIndexOf('.')) || file.name,
                    w: img.width,
                    h: img.height
                });
                loaded++;
                if (loaded === files.length) self._generateAtlas();
            });
        });
    },

    _generateAtlas: function () {
        var self = this;
        self._sprites.sort(function (a, b) { return b.h - a.h; });

        var maxSize = parseInt(document.getElementById('atlasMaxSize').value);
        var padding = parseInt(document.getElementById('atlasPadding').value);
        var aW = 128, aH = 128, packed = [], ok = false;

        while (aW <= maxSize && aH <= maxSize) {
            packed = [];
            var free = [{ x: 0, y: 0, w: aW, h: aH }];
            var allFit = true;

            for (var i = 0; i < self._sprites.length; i++) {
                var s = self._sprites[i];
                var nW = s.w + padding, nH = s.h + padding, found = false;

                for (var j = 0; j < free.length; j++) {
                    var r = free[j];
                    if (r.w >= nW && r.h >= nH) {
                        packed.push({ sprite: s, x: r.x, y: r.y, w: s.w, h: s.h });
                        var rR = { x: r.x + nW, y: r.y, w: r.w - nW, h: nH };
                        var bR = { x: r.x, y: r.y + nH, w: r.w, h: r.h - nH };
                        free.splice(j, 1);
                        if (rR.w > 0 && rR.h > 0) free.push(rR);
                        if (bR.w > 0 && bR.h > 0) free.push(bR);
                        found = true; break;
                    }
                }
                if (!found) { allFit = false; break; }
            }
            if (allFit) { ok = true; break; }
            if (aW <= aH) aW *= 2; else aH *= 2;
        }

        if (!ok) {
            Utils.setStatus('atlasStatus', '❌ 超出图集最大规格限制！');
            return;
        }

        var canvas = document.getElementById('atlasCanvasPreview');
        canvas.width = aW; canvas.height = aH;
        var ctx = canvas.getContext('2d');
        packed.forEach(function (p) { ctx.drawImage(p.sprite.img, p.x, p.y, p.w, p.h); });

        self._currentData = { packed: packed, w: aW, h: aH };
        Utils.setStatus('atlasStatus', '✨ 排样完毕 (' + aW + '×' + aH + ' px)');
        Utils.showElement('atlasPreviewWrapper');
        Utils.showElement('atlasActionBar');
    },

    _exportPackage: function (type) {
        var self = this;
        if (!self._currentData) return;
        var data = self._currentData;
        var mName = document.getElementById('atlasExportName').value.trim() || 'atlas';
        var canvas = document.getElementById('atlasCanvasPreview');

        canvas.toBlob(function (pngB) {
            var files = [{ blob: pngB, name: mName + '.png' }];

            if (type === 'cocos') {
                var plist = '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple Computer//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>frames</key><dict>';
                data.packed.forEach(function (p) {
                    plist += '<key>' + p.sprite.name + '.png</key><dict>' +
                        '<key>spriteOffset</key><string>{0,0}</string>' +
                        '<key>spriteSize</key><string>{' + p.w + ',' + p.h + '}</string>' +
                        '<key>spriteSourceSize</key><string>{' + p.w + ',' + p.h + '}</string>' +
                        '<key>textureRect</key><string>{{' + p.x + ',' + p.y + '},{' + p.w + ',' + p.h + '}}</string>' +
                        '<key>textureRotated</key><false/></dict>';
                });
                plist += '</dict><key>metadata</key><dict><key>format</key><integer>3</integer><key>realTextureFileName</key><string>' + mName + '.png</string><key>size</key><string>{' + data.w + ',' + data.h + '}</string></dict></dict></plist>';
                files.push({ blob: new Blob([plist], { type: 'text/xml' }), name: mName + '.plist' });
            } else {
                var json = { meta: { image: mName + '.png', size: { w: data.w, h: data.h } }, sprites: [] };
                data.packed.forEach(function (p) {
                    json.sprites.push({ name: p.sprite.name, frame: { x: p.x, y: p.y, w: p.w, h: p.h } });
                });
                files.push({ blob: new Blob([JSON.stringify(json, null, 4)], { type: 'application/json' }), name: mName + '.json' });
            }

            Utils.zipAndDownload(files, mName + '_' + type + '.zip');
        }, 'image/png');
    },

    destroy: function () {
        this._sprites = [];
        this._currentData = null;
        Utils.resetFileInput('atlasFileInput');
        Utils.setStatus('atlasStatus', '');
        Utils.hideElement('atlasActionBar');
        Utils.hideElement('atlasPreviewWrapper');
    }
});