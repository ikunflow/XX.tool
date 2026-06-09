/**
 * 包体体积分析仪表盘 - 支持 Cocos Creator / Unity 项目结构解析，检测未使用资源
 */
PM.register({
    id: 'size-dashboard',
    name: '包体仪表盘 🚧',
    icon: '📊',
    description: '【开发中】拖入项目资源+代码/场景，自动分类统计、检测未使用资源、多档位上限对比。部分功能待完善。',
    color: '--blue-grey',
    colorHover: '#546e7a',
    cardClass: 'size-dashboard-card',
    uploadClass: '',

    _results: {},
    _files: [],
    _projectType: 'generic', // 'cocos' | 'unity' | 'generic'
    _usedResources: new Set(),
    _unusedResources: [],

    render: function () {
        return '' +
            '<div class="header-area"><h2>📊 包体体积分析仪表盘</h2><p>拖入项目资源+代码/场景文件，自动分类统计、检测未使用资源、多档位上限对比</p></div>' +

            // 项目类型选择
            '<div class="settings-bar">' +
            '  <div class="setting-item">' +
            '    <label>项目类型:</label>' +
            '    <select id="dashProjectType">' +
            '      <option value="generic">通用项目</option>' +
            '      <option value="cocos">Cocos Creator</option>' +
            '      <option value="unity">Unity</option>' +
            '    </select>' +
            '  </div>' +
            '  <div class="setting-item">' +
            '    <label>上限对比:</label>' +
            '    <select id="dashLimitSelect">' +
            '      <option value="4194304">4MB (微信小游戏)</option>' +
            '      <option value="8388608">8MB (微信分包)</option>' +
            '      <option value="16777216">16MB (其他平台)</option>' +
            '      <option value="custom">自定义</option>' +
            '    </select>' +
            '    <input type="number" id="dashCustomLimit" value="4" min="1" style="width:60px;display:none;">' +
            '    <span id="dashCustomUnit" style="display:none;">MB</span>' +
            '  </div>' +
            '</div>' +

            // 上传区
            '<div id="dashDropZone" class="upload-area dash-upload">' +
            '  <p>📁 点击或拖拽上传<strong>项目资源 + 代码/场景文件</strong>（支持混合上传）</p>' +
            '  <input type="file" id="dashFileInput" class="file-input-hidden" multiple webkitdirectory directory>' +
            '</div>' +
            '<div style="text-align:center;margin-top:8px;">' +
            '  <label style="font-size:12px;color:#666;">' +
            '    <input type="checkbox" id="dashFolderMode" style="vertical-align:middle;"> 上传整个文件夹（推荐）' +
            '  </label>' +
            '</div>' +

            '<div id="dashStatus" class="status-msg" style="color:var(--blue-grey)"></div>' +

            // 结果面板
            '<div class="dash-panel" id="dashPanel" style="display:none;padding:20px;background:#fafafa;border-radius:10px;border:1px solid #e0e0e0;margin-top:20px;">' +

            // 总览
            '  <div style="text-align:center;margin-bottom:20px;">' +
            '    <div style="color:#999;font-size:14px;">总大小</div>' +
            '    <div style="font-size:36px;font-weight:bold;color:#2c3e50;" id="dashTotalSize">0 KB</div>' +
            '    <div style="color:#999;font-size:13px;" id="dashVsLimit"></div>' +
            '  </div>' +

            // 仪表盘
            '  <div style="text-align:center;margin:20px 0;">' +
            '    <canvas id="dashGauge" width="160" height="140"></canvas>' +
            '    <div style="color:#999;font-size:12px;">上限占比</div>' +
            '  </div>' +

            // 分类统计
            '  <h4 style="margin:20px 0 12px 0;color:#333;">📂 资源分类统计</h4>' +
            '  <div id="dashCategoryBars"></div>' +

            // TOP10 大文件
            '  <h4 style="margin:20px 0 12px 0;color:#333;">🔥 TOP10 体积大户</h4>' +
            '  <div id="dashTopFiles" style="background:#fff;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;"></div>' +

            // 未使用资源检测
            '  <div id="dashUnusedSection" style="display:none;">' +
            '    <h4 style="margin:20px 0 12px 0;color:#e74c3c;">⚠️ 未使用资源（<span id="dashUnusedCount">0</span>个）</h4>' +
            '    <div style="background:#fff;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">' +
            '      <div style="max-height:300px;overflow-y:auto;" id="dashUnusedList"></div>' +
            '      <div style="padding:12px;background:#f8f9fa;border-top:1px solid #e0e0e0;">' +
            '        <button class="btn-all-download" style="background:#e74c3c;" id="dashDeleteUnusedBtn">🗑️ 导出未使用资源列表</button>' +
            '        <span style="font-size:12px;color:#666;margin-left:12px;">可节省: <strong id="dashUnusedSize">0 KB</strong></span>' +
            '      </div>' +
            '    </div>' +
            '  </div>' +

            // 优化建议
            '  <h4 style="margin:20px 0 12px 0;color:#333;">💡 优化建议</h4>' +
            '  <div style="background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:15px;" id="dashSuggestions"></div>' +

            // 导出
            '  <div style="text-align:center;margin-top:20px;display:flex;gap:10px;justify-content:center;">' +
            '    <button style="background:#7f8c8d;color:white;border:none;padding:10px 24px;border-radius:6px;cursor:pointer;font-size:14px;" id="dashReportBtn">📄 导出文本报告</button>' +
            '    <button style="background:#3498db;color:white;border:none;padding:10px 24px;border-radius:6px;cursor:pointer;font-size:14px;" id="dashJsonBtn">📊 导出JSON数据</button>' +
            '  </div>' +
            '</div>';
    },

    init: function () {
        var self = this;
        self._results = {};
        self._files = [];
        self._usedResources = new Set();
        self._unusedResources = [];

        // 文件夹模式切换
        var folderCheckbox = document.getElementById('dashFolderMode');
        var fileInput = document.getElementById('dashFileInput');
        folderCheckbox.addEventListener('change', function () {
            if (this.checked) {
                fileInput.setAttribute('webkitdirectory', '');
                fileInput.setAttribute('directory', '');
            } else {
                fileInput.removeAttribute('webkitdirectory');
                fileInput.removeAttribute('directory');
            }
        });

        // 自定义上限
        document.getElementById('dashLimitSelect').addEventListener('change', function () {
            var isCustom = this.value === 'custom';
            document.getElementById('dashCustomLimit').style.display = isCustom ? 'inline-block' : 'none';
            document.getElementById('dashCustomUnit').style.display = isCustom ? 'inline' : 'none';
        });

        // 文件上传
        Utils.setupDragDrop('dashDropZone', 'dashFileInput', function (files) {
            self._process(Array.from(files));
        });
        fileInput.addEventListener('change', function (e) {
            if (e.target.files.length > 0) self._process(Array.from(e.target.files));
        });

        // 导出按钮
        document.getElementById('dashReportBtn').addEventListener('click', function () { self._exportReport(); });
        document.getElementById('dashJsonBtn').addEventListener('click', function () { self._exportJson(); });
        document.getElementById('dashDeleteUnusedBtn').addEventListener('click', function () { self._exportUnusedList(); });
    },

    _getLimitBytes: function () {
        var select = document.getElementById('dashLimitSelect');
        if (select.value === 'custom') {
            return parseFloat(document.getElementById('dashCustomLimit').value) * 1024 * 1024;
        }
        return parseInt(select.value);
    },

    _detectProjectType: function (files) {
        // 根据文件特征自动检测项目类型
        for (var i = 0; i < files.length; i++) {
            var name = files[i].name.toLowerCase();
            var path = files[i].webkitRelativePath || files[i].name;
            if (name.endsWith('.fire') || name.endsWith('.scene') || path.includes('assets/') && path.includes('.meta')) {
                return 'cocos';
            }
            if (name.endsWith('.unity') || name.endsWith('.prefab') || name.endsWith('.asset')) {
                return 'unity';
            }
        }
        return document.getElementById('dashProjectType').value;
    },

    _classifyFile: function (file) {
        var ext = file.name.substring(file.name.lastIndexOf('.') + 1).toLowerCase();
        var path = file.webkitRelativePath || file.name;

        // 代码文件
        if (['js', 'ts', 'jsx', 'tsx', 'json', 'xml', 'html', 'css', 'lua', 'py'].indexOf(ext) !== -1) {
            return { category: 'code', ext: ext };
        }
        // 场景/配置
        if (['fire', 'scene', 'prefab', 'unity', 'asset', 'mat', 'controller', 'anim'].indexOf(ext) !== -1) {
            return { category: 'scene', ext: ext };
        }
        // 图片
        if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'ico', 'psd', 'tga', 'dds'].indexOf(ext) !== -1) {
            return { category: 'image', ext: ext };
        }
        // 音频
        if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'opus', 'flac'].indexOf(ext) !== -1) {
            return { category: 'audio', ext: ext };
        }
        // 视频
        if (['mp4', 'webm', 'mov', 'avi', 'mkv'].indexOf(ext) !== -1) {
            return { category: 'video', ext: ext };
        }
        // 字体
        if (['ttf', 'otf', 'woff', 'woff2', 'eot'].indexOf(ext) !== -1) {
            return { category: 'font', ext: ext };
        }
        // 图集
        if (ext === 'plist' || ext === 'atlas') {
            return { category: 'atlas', ext: ext };
        }
        // 其他
        return { category: 'other', ext: ext };
    },

    _process: function (files) {
        var self = this;
        Utils.setStatus('dashStatus', '正在分析 ' + files.length + ' 个文件...');
        Utils.hideElement('dashPanel');

        self._files = files;
        self._projectType = self._detectProjectType(files);
        document.getElementById('dashProjectType').value = self._projectType;

        // 分类统计
        var categories = {
            image: { count: 0, bytes: 0, files: [] },
            audio: { count: 0, bytes: 0, files: [] },
            video: { count: 0, bytes: 0, files: [] },
            font: { count: 0, bytes: 0, files: [] },
            code: { count: 0, bytes: 0, files: [] },
            scene: { count: 0, bytes: 0, files: [] },
            atlas: { count: 0, bytes: 0, files: [] },
            other: { count: 0, bytes: 0, files: [] }
        };

        var resourceFiles = []; // 用于未使用资源检测

        files.forEach(function (file) {
            var info = self._classifyFile(file);
            var cat = categories[info.category];
            if (cat) {
                cat.count++;
                cat.bytes += file.size;
                cat.files.push({ name: file.name, path: file.webkitRelativePath || file.name, size: file.size, ext: info.ext });
            }
            // 记录资源文件（排除代码和场景本身）
            if (['image', 'audio', 'video', 'font', 'atlas'].indexOf(info.category) !== -1) {
                resourceFiles.push({ file: file, name: file.name, path: file.webkitRelativePath || file.name });
            }
        });

        var totalBytes = Object.values(categories).reduce(function (sum, c) { return sum + c.bytes; }, 0);

        self._results = {
            categories: categories,
            total: totalBytes,
            fileCount: files.length,
            resourceFiles: resourceFiles
        };

        // 分析引用关系（异步）
        self._analyzeReferences(files, resourceFiles);
    },

    _analyzeReferences: function (allFiles, resourceFiles) {
        var self = this;
        self._usedResources = new Set();

        // 读取所有代码/场景/配置文件内容
        var textFiles = allFiles.filter(function (f) {
            var info = self._classifyFile(f);
            return ['code', 'scene', 'atlas'].indexOf(info.category) !== -1;
        });

        var pending = textFiles.length;
        if (pending === 0) {
            self._finishAnalysis(resourceFiles);
            return;
        }

        textFiles.forEach(function (file) {
            var reader = new FileReader();
            reader.onload = function (e) {
                var content = e.target.result;
                self._extractReferences(content, file.name);
                pending--;
                if (pending === 0) {
                    self._finishAnalysis(resourceFiles);
                }
            };
            reader.onerror = function () {
                pending--;
                if (pending === 0) self._finishAnalysis(resourceFiles);
            };
            reader.readAsText(file);
        });
    },

    _extractReferences: function (content, fileName) {
        var self = this;
        var lowerContent = content.toLowerCase();

        // 通用匹配：查找所有可能的资源引用模式
        var patterns = [
            /["']([^"']+\.(?:png|jpg|jpeg|gif|webp|svg|ico|psd|tga|dds|mp3|wav|ogg|m4a|aac|mp4|webm|mov|ttf|otf|woff|woff2|plist|atlas))["']/gi,
            /load(?:Res|Texture|Sprite|Audio|Prefab)\s*\(\s*["']([^"']+)["']/gi,
            /spriteFrame\s*:\s*["']([^"']+)["']/gi,
            /cc\.spriteFrameCache\.addSpriteFrames\s*\(\s*["']([^"']+)["']/gi,
            /Resources\.Load\s*\(\s*["']([^"']+)["']/gi,
            /AssetDatabase\.LoadAssetAtPath\s*\(\s*["']([^"']+)["']/gi,
        ];

        patterns.forEach(function (pattern) {
            var match;
            while ((match = pattern.exec(content)) !== null) {
                var ref = match[1];
                // 提取文件名（不含路径）
                var refName = ref.substring(ref.lastIndexOf('/') + 1).toLowerCase();
                self._usedResources.add(refName);
                // 也添加无扩展名版本（用于匹配）
                var refBase = refName.substring(0, refName.lastIndexOf('.'));
                if (refBase) self._usedResources.add(refBase);
            }
        });

        // Cocos Creator: 解析 .meta 文件中的 uuid 引用
        if (fileName.endsWith('.meta')) {
            try {
                var meta = JSON.parse(content);
                if (meta.uuid) self._usedResources.add(meta.uuid.toLowerCase());
            } catch (e) {}
        }

        // Cocos: 解析 .fire/.scene 中的 uuid 引用
        if (fileName.endsWith('.fire') || fileName.endsWith('.scene')) {
            var uuidMatches = content.match(/"__uuid__"\s*:\s*"([a-f0-9-]+)"/gi);
            if (uuidMatches) {
                uuidMatches.forEach(function (m) {
                    var uuid = m.match(/"([a-f0-9-]+)"/)[1].toLowerCase();
                    self._usedResources.add(uuid);
                });
            }
        }
    },

    _finishAnalysis: function (resourceFiles) {
        var self = this;

        // 检测未使用资源
        self._unusedResources = resourceFiles.filter(function (res) {
            var name = res.name.toLowerCase();
            var baseName = name.substring(0, name.lastIndexOf('.'));
            // 检查是否被引用（精确匹配或basename匹配）
            return !self._usedResources.has(name) && !self._usedResources.has(baseName);
        });

        self._renderDashboard();
    },

    _renderDashboard: function () {
        var self = this;
        var r = self._results;
        var limit = self._getLimitBytes();
        var pct = Math.min(100, (r.total / limit * 100)).toFixed(1);

        document.getElementById('dashTotalSize').textContent = Utils.formatSize(r.total);
        document.getElementById('dashVsLimit').textContent = '对比 ' + Utils.formatSize(limit) + ': ' + pct + '% ' + (pct > 100 ? '⚠️ 超出' : '✅ 在限制内');

        // 绘制仪表盘
        self._drawGauge(Math.min(1, r.total / limit), pct);

        // 分类条形图
        self._renderCategoryBars(r.categories, r.total);

        // TOP10 大文件
        self._renderTopFiles(r.categories);

        // 未使用资源
        self._renderUnusedResources();

        // 建议
        self._renderSuggestions(r, limit);

        Utils.showElement('dashPanel');
        Utils.setStatus('dashStatus', '✅ 分析完成！共 ' + r.fileCount + ' 个文件，发现 ' + self._unusedResources.length + ' 个未使用资源');
    },

    _drawGauge: function (ratio, pctText) {
        var gauge = document.getElementById('dashGauge');
        var ctx = gauge.getContext('2d');
        var cx = 80, cy = 70, r = 55;
        ctx.clearRect(0, 0, 160, 140);

        // 背景弧
        ctx.beginPath(); ctx.arc(cx, cy, r, 0.75 * Math.PI, 2.25 * Math.PI);
        ctx.strokeStyle = '#e0e0e0'; ctx.lineWidth = 14; ctx.stroke();

        // 前景弧
        ctx.beginPath(); ctx.arc(cx, cy, r, 0.75 * Math.PI, 0.75 * Math.PI + ratio * 1.5 * Math.PI);
        var color = ratio > 1 ? '#e74c3c' : ratio > 0.8 ? '#e67e22' : ratio > 0.5 ? '#f1c40f' : '#2ecc71';
        ctx.strokeStyle = color; ctx.lineWidth = 14; ctx.stroke();

        // 文字
        ctx.fillStyle = '#333'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(pctText + '%', cx, cy + 6);
        ctx.font = '11px sans-serif'; ctx.fillStyle = '#999';
        ctx.fillText('占比', cx, cy + 36);
    },

    _renderCategoryBars: function (categories, total) {
        var colors = {
            image: '#3498db', audio: '#e67e22', video: '#e74c3c',
            font: '#9b59b6', code: '#2ecc71', scene: '#1abc9c',
            atlas: '#fd79a8', other: '#95a5a6'
        };
        var icons = {
            image: '🖼', audio: '🎵', video: '🎬',
            font: '🎨', code: '📄', scene: '🏗',
            atlas: '📦', other: '📎'
        };
        var names = {
            image: '图片', audio: '音频', video: '视频',
            font: '字体', code: '代码', scene: '场景/配置',
            atlas: '图集', other: '其他'
        };

        var html = '';
        Object.keys(categories).forEach(function (key) {
            var cat = categories[key];
            if (cat.count === 0) return;
            var barPct = total > 0 ? cat.bytes / total * 100 : 0;
            html += '<div class="dash-bar-wrap" style="margin-bottom:10px;">' +
                '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">' +
                '<span>' + icons[key] + ' ' + names[key] + ' <span style="color:#999;">' + cat.count + '个</span></span>' +
                '<span>' + Utils.formatSize(cat.bytes) + ' (' + barPct.toFixed(1) + '%)</span></div>' +
                '<div style="background:#e0e0e0;height:10px;border-radius:5px;overflow:hidden;">' +
                '<div style="background:' + colors[key] + ';height:100%;width:' + barPct + '%;transition:width 0.3s;"></div></div></div>';
        });
        document.getElementById('dashCategoryBars').innerHTML = html;
    },

    _renderTopFiles: function (categories) {
        var allFiles = [];
        Object.keys(categories).forEach(function (key) {
            allFiles = allFiles.concat(categories[key].files.map(function (f) {
                return { name: f.name, size: f.size, category: key, path: f.path };
            }));
        });
        allFiles.sort(function (a, b) { return b.size - a.size; });
        var top10 = allFiles.slice(0, 10);

        var html = '';
        top10.forEach(function (f, i) {
            var maxSize = top10[0].size;
            var barPct = (f.size / maxSize * 100).toFixed(1);
            html += '<div style="display:flex;align-items:center;padding:8px 12px;border-bottom:1px solid #f0f0f0;">' +
                '<span style="width:24px;color:#999;font-size:12px;">#' + (i + 1) + '</span>' +
                '<span style="flex:1;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + f.path + '">' + f.name + '</span>' +
                '<div style="width:100px;height:6px;background:#e0e0e0;border-radius:3px;margin:0 10px;">' +
                '<div style="height:100%;width:' + barPct + '%;background:#e74c3c;border-radius:3px;"></div></div>' +
                '<span style="width:70px;text-align:right;font-size:12px;color:#666;">' + Utils.formatSize(f.size) + '</span></div>';
        });
        document.getElementById('dashTopFiles').innerHTML = html || '<div style="padding:20px;text-align:center;color:#999;">暂无文件</div>';
    },

    _renderUnusedResources: function () {
        var self = this;
        var unused = self._unusedResources;

        if (unused.length === 0) {
            Utils.hideElement('dashUnusedSection');
            return;
        }

        Utils.showElement('dashUnusedSection');
        document.getElementById('dashUnusedCount').textContent = unused.length;

        var totalUnused = unused.reduce(function (sum, u) { return sum + u.file.size; }, 0);
        document.getElementById('dashUnusedSize').textContent = Utils.formatSize(totalUnused);

        var html = '';
        unused.sort(function (a, b) { return b.file.size - a.file.size; });
        unused.forEach(function (u, i) {
            html += '<div style="display:flex;align-items:center;padding:8px 12px;border-bottom:1px solid #f0f0f0;">' +
                '<span style="width:24px;color:#999;font-size:12px;">#' + (i + 1) + '</span>' +
                '<span style="flex:1;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + u.path + '">' + u.name + '</span>' +
                '<span style="width:70px;text-align:right;font-size:12px;color:#e74c3c;">' + Utils.formatSize(u.file.size) + '</span></div>';
        });
        document.getElementById('dashUnusedList').innerHTML = html;
    },

    _renderSuggestions: function (r, limit) {
        var suggestions = [];
        var categories = r.categories;

        if (r.total > limit) {
            var over = Utils.formatSize(r.total - limit);
            suggestions.push('🚨 总包体超出限制 ' + over + '，建议优先优化大文件');
        }
        if (categories.image.bytes > limit * 0.6) {
            suggestions.push('💡 图片占比过高（' + Utils.formatSize(categories.image.bytes) + '），建议使用「切割压缩」或「WebP/PNG8转换」模块');
        }
        if (categories.audio.bytes > limit * 0.3) {
            suggestions.push('🎵 音频体积较大（' + Utils.formatSize(categories.audio.bytes) + '），建议使用「音频量化压缩」模块');
        }
        if (categories.video.count > 0) {
            suggestions.push('🎬 检测到 ' + categories.video.count + ' 个视频文件（' + Utils.formatSize(categories.video.bytes) + '），建议转序列帧或外部CDN加载');
        }
        if (this._unusedResources.length > 0) {
            var saveSize = this._unusedResources.reduce(function (s, u) { return s + u.file.size; }, 0);
            suggestions.push('🗑️ 发现 ' + this._unusedResources.length + ' 个未使用资源，删除可节省 ' + Utils.formatSize(saveSize));
        }
        if (categories.font.count > 3) {
            suggestions.push('🎨 字体文件较多（' + categories.font.count + '个），建议合并或使用子集化');
        }
        if (suggestions.length === 0) {
            suggestions.push('✅ 当前包体健康，资源分配合理！');
        }

        document.getElementById('dashSuggestions').innerHTML = suggestions.map(function (s) {
            return '<div style="padding:8px 0;font-size:13px;border-bottom:1px solid #f0f0f0;">' + s + '</div>';
        }).join('');
    },

    _exportReport: function () {
        var self = this;
        var r = self._results;
        var limit = self._getLimitBytes();
        var report = '========================================\n' +
            '  包体体积分析报告\n' +
            '========================================\n' +
            '生成时间: ' + new Date().toLocaleString() + '\n' +
            '项目类型: ' + self._projectType + '\n' +
            '----------------------------------------\n' +
            '文件总数: ' + r.fileCount + '\n' +
            '总大小: ' + Utils.formatSize(r.total) + '\n' +
            '上限: ' + Utils.formatSize(limit) + '\n' +
            '占比: ' + (r.total / limit * 100).toFixed(1) + '%\n' +
            '状态: ' + (r.total > limit ? '⚠️ 超出限制' : '✅ 在限制内') + '\n\n' +
            '【分类统计】\n';

        Object.keys(r.categories).forEach(function (key) {
            var cat = r.categories[key];
            if (cat.count > 0) {
                report += '  ' + key + ': ' + cat.count + '个, ' + Utils.formatSize(cat.bytes) + '\n';
            }
        });

        if (self._unusedResources.length > 0) {
            report += '\n【未使用资源】(' + self._unusedResources.length + '个)\n';
            self._unusedResources.forEach(function (u) {
                report += '  [未使用] ' + u.name + ' - ' + Utils.formatSize(u.file.size) + '\n';
            });
        }

        var blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
        saveAs(blob, 'package_report_' + new Date().toISOString().slice(0, 10) + '.txt');
    },

    _exportJson: function () {
        var self = this;
        var data = {
            timestamp: new Date().toISOString(),
            projectType: self._projectType,
            totalSize: self._results.total,
            fileCount: self._results.fileCount,
            limit: self._getLimitBytes(),
            categories: self._results.categories,
            unusedResources: self._unusedResources.map(function (u) {
                return { name: u.name, path: u.path, size: u.file.size };
            }),
            topFiles: []
        };

        var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        saveAs(blob, 'package_analysis_' + new Date().toISOString().slice(0, 10) + '.json');
    },

    _exportUnusedList: function () {
        var self = this;
        if (self._unusedResources.length === 0) return;

        var content = '# 未使用资源列表\n# 生成时间: ' + new Date().toLocaleString() + '\n# 共 ' + self._unusedResources.length + ' 个文件\n\n';
        self._unusedResources.forEach(function (u) {
            content += u.path + '\t' + Utils.formatSize(u.file.size) + '\n';
        });

        var blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        saveAs(blob, 'unused_resources_' + new Date().toISOString().slice(0, 10) + '.txt');
    },

    destroy: function () {
        this._results = {};
        this._files = [];
        this._usedResources = new Set();
        this._unusedResources = [];
        Utils.resetFileInput('dashFileInput');
        Utils.setStatus('dashStatus', '');
        Utils.hideElement('dashPanel');
    }
});
