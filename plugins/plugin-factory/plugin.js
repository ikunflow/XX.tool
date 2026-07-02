/**
 * 模块工厂 - 可视化创建自定义插件模块
 * 生成符合插件接口规范的 plugin.js 文件，下载后手动放入 plugins/ 目录即可使用
 */
PM.register({
    id: 'plugin-factory',
    name: '模块工厂',
    icon: '🏭',
    description: '可视化创建自定义功能模块，自动生成 plugin.js 代码，下载后放入 plugins/ 目录即可使用。',
    color: '--indigo-color',
    colorHover: '--indigo-hover',
    cardClass: 'plugin-factory-card',
    uploadClass: '',

    _previewPlugin: null,

    render: function () {
        return '' +
            '<div class="header-area"><h2>🏭 模块工厂</h2><p>可视化创建自定义功能模块，零代码生成插件，下载后放入 plugins/ 目录即可</p></div>' +

            // 步骤指示器
            '<div style="display:flex;justify-content:center;gap:20px;margin-bottom:20px;">' +
            '  <div class="factory-step active" data-step="1"><span>1</span> 基础信息</div>' +
            '  <div class="factory-step" data-step="2"><span>2</span> 界面设计</div>' +
            '  <div class="factory-step" data-step="3"><span>3</span> 功能逻辑</div>' +
            '  <div class="factory-step" data-step="4"><span>4</span> 生成下载</div>' +
            '</div>' +

            // 步骤1: 基础信息
            '<div id="factoryStep1" class="factory-panel">' +
            '  <h3>📋 模块基础信息</h3>' +
            '  <div class="settings-bar" style="flex-direction:column;align-items:stretch;">' +
            '    <div class="setting-item"><label>模块ID（英文唯一标识）:</label><input type="text" id="fpId" placeholder="my-tool" style="flex:1;"></div>' +
            '    <div class="setting-item"><label>显示名称:</label><input type="text" id="fpName" placeholder="我的工具" style="flex:1;"></div>' +
            '    <div class="setting-item"><label>图标（emoji）:</label><input type="text" id="fpIcon" value="🔧" style="width:60px;"></div>' +
            '    <div class="setting-item"><label>描述:</label><input type="text" id="fpDesc" placeholder="简短描述这个模块的功能" style="flex:1;"></div>' +
            '    <div class="setting-item"><label>主题色:</label>' +
            '      <select id="fpColor">' +
            '        <option value="--primary-color">蓝色</option>' +
            '        <option value="--success-color">绿色</option>' +
            '        <option value="--warning-color">橙色</option>' +
            '        <option value="--purple-color">紫色</option>' +
            '        <option value="--teal-color">青色</option>' +
            '        <option value="--deep-orange">深橙</option>' +
            '        <option value="--pink-color">粉色</option>' +
            '        <option value="--red-color">红色</option>' +
            '      </select>' +
            '    </div>' +
            '  </div>' +
            '  <div style="text-align:center;margin-top:20px;"><button class="btn-all-download" style="background:var(--indigo-color);" onclick="PF.nextStep(2)">下一步 →</button></div>' +
            '</div>' +

            // 步骤2: 界面设计
            '<div id="factoryStep2" class="factory-panel" style="display:none;">' +
            '  <h3>🎨 界面设计</h3>' +
            '  <p style="color:#666;font-size:13px;margin-bottom:12px;">选择需要的界面元素（可多选）</p>' +
            '  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:20px;">' +
            '    <label class="factory-checkbox"><input type="checkbox" id="fpHasUpload" checked><span>📁 文件上传区</span></label>' +
            '    <label class="factory-checkbox"><input type="checkbox" id="fpHasSettings"><span>⚙️ 设置栏（数字/文本/选择等）</span></label>' +
            '    <label class="factory-checkbox"><input type="checkbox" id="fpHasPreview"><span>👁️ 预览/结果展示区</span></label>' +
            '    <label class="factory-checkbox"><input type="checkbox" id="fpHasDownload"><span>⬇️ 下载按钮</span></label>' +
            '    <label class="factory-checkbox"><input type="checkbox" id="fpHasMultiFile"><span>📎 支持多文件</span></label>' +
            '    <label class="factory-checkbox"><input type="checkbox" id="fpHasImageProcess"><span>🖼️ 图片处理（Canvas）</span></label>' +
            '  </div>' +
            '  <div style="text-align:center;display:flex;gap:10px;justify-content:center;">' +
            '    <button class="btn-all-download" style="background:#95a5a6;" onclick="PF.prevStep(1)">← 上一步</button>' +
            '    <button class="btn-all-download" style="background:var(--indigo-color);" onclick="PF.nextStep(3)">下一步 →</button>' +
            '  </div>' +
            '</div>' +

            // 步骤3: 功能逻辑
            '<div id="factoryStep3" class="factory-panel" style="display:none;">' +
            '  <h3>⚡ 功能逻辑模板</h3>' +
            '  <p style="color:#666;font-size:13px;margin-bottom:12px;">选择最接近的模板，生成后可进一步修改代码</p>' +
            '  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px;margin-bottom:20px;">' +
            '    <div class="factory-template" data-template="simple">' +
            '      <h4>📄 简单处理</h4>' +
            '      <p>上传 → 处理 → 显示结果</p>' +
            '      <small>适合：格式转换、信息提取、简单计算</small>' +
            '    </div>' +
            '    <div class="factory-template" data-template="image">' +
            '      <h4>🖼️ 图片处理</h4>' +
            '      <p>上传图片 → Canvas处理 → 预览 → 下载</p>' +
            '      <small>适合：滤镜、裁剪、压缩、加水印</small>' +
            '    </div>' +
            '    <div class="factory-template" data-template="batch">' +
            '      <h4>📦 批量处理</h4>' +
            '      <p>多文件上传 → 批量处理 → ZIP打包下载</p>' +
            '      <small>适合：批量重命名、批量转换、批量压缩</small>' +
            '    </div>' +
            '    <div class="factory-template" data-template="empty">' +
            '      <h4>📝 空白模板</h4>' +
            '      <p>仅生成基础框架，自行实现所有逻辑</p>' +
            '      <small>适合：完全自定义的复杂模块</small>' +
            '    </div>' +
            '  </div>' +
            '  <div style="text-align:center;display:flex;gap:10px;justify-content:center;">' +
            '    <button class="btn-all-download" style="background:#95a5a6;" onclick="PF.prevStep(2)">← 上一步</button>' +
            '    <button class="btn-all-download" style="background:var(--indigo-color);" onclick="PF.nextStep(4)">下一步 →</button>' +
            '  </div>' +
            '</div>' +

            // 步骤4: 生成与下载
            '<div id="factoryStep4" class="factory-panel" style="display:none;">' +
            '  <h3>✅ 生成模块代码</h3>' +
            '  <div style="background:#f8f9fa;border:1px solid #e0e0e0;border-radius:8px;padding:15px;margin-bottom:15px;">' +
            '    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">' +
            '      <span style="font-weight:bold;">模块信息预览</span>' +
            '      <span id="fpPreviewInfo" style="color:#666;font-size:13px;"></span>' +
            '    </div>' +
            '    <div id="fpPreviewCard" style="max-width:300px;margin:0 auto;"></div>' +
            '  </div>' +
            '  <div style="display:flex;gap:10px;justify-content:center;margin-bottom:15px;">' +
            '    <button class="btn-all-download" style="background:var(--indigo-color);" id="fpGenerateBtn">🚀 生成 plugin.js</button>' +
            '    <button class="btn-all-download" style="background:#27ae60;display:none;" id="fpDownloadBtn">⬇️ 下载 plugin.js</button>' +
            '  </div>' +
            '  <div id="fpCodePreview" style="display:none;">' +
            '    <p style="color:#666;font-size:13px;margin-bottom:8px;">生成的代码（可复制或下载）：</p>' +
            '    <pre style="background:#2c3e50;color:#ecf0f1;padding:15px;border-radius:8px;overflow-x:auto;font-size:12px;line-height:1.5;max-height:400px;overflow-y:auto;"><code id="fpCodeBlock"></code></pre>' +
            '  </div>' +
            '  <div style="background:#fff3cd;border:1px solid #ffeaa7;border-radius:8px;padding:12px;margin-top:15px;font-size:13px;">' +
            '    <strong>📖 使用说明：</strong><br>' +
            '    1. 下载 <code>plugin.js</code> 文件<br>' +
            '    2. 在 <code>plugins/</code> 目录下创建新文件夹（如 <code>plugins/my-tool/</code>）<br>' +
            '    3. 将文件放入该文件夹<br>' +
            '    4. 在 <code>index.html</code> 中添加 <code>&lt;script src="plugins/my-tool/plugin.js"&gt;&lt;/script&gt;</code><br>' +
            '    5. 刷新页面即可使用！' +
            '  </div>' +
            '  <div style="text-align:center;margin-top:15px;">' +
            '    <button class="btn-all-download" style="background:#95a5a6;" onclick="PF.prevStep(3)">← 上一步</button>' +
            '  </div>' +
            '</div>';
    },

    init: function () {
        var self = this;
        self._selectedTemplate = 'simple';

        // 模板选择
        document.querySelectorAll('.factory-template').forEach(function (el) {
            el.addEventListener('click', function () {
                document.querySelectorAll('.factory-template').forEach(function (t) { t.classList.remove('selected'); });
                this.classList.add('selected');
                self._selectedTemplate = this.dataset.template;
            });
        });
        document.querySelector('.factory-template[data-template="simple"]').classList.add('selected');

        // 生成按钮
        document.getElementById('fpGenerateBtn').addEventListener('click', function () { self._generate(); });
        document.getElementById('fpDownloadBtn').addEventListener('click', function () { self._download(); });

        // 实时预览卡片
        ['fpId', 'fpName', 'fpIcon', 'fpDesc', 'fpColor'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.addEventListener('input', function () { self._updatePreview(); });
        });
        self._updatePreview();
    },

    _updatePreview: function () {
        var id = document.getElementById('fpId').value || 'my-tool';
        var name = document.getElementById('fpName').value || '我的工具';
        var icon = document.getElementById('fpIcon').value || '🔧';
        var desc = document.getElementById('fpDesc').value || '自定义功能模块';
        var color = document.getElementById('fpColor').value || '--primary-color';

        document.getElementById('fpPreviewInfo').textContent = 'ID: ' + id;
        document.getElementById('fpPreviewCard').innerHTML =
            '<div class="module-card" style="cursor:default;">' +
            '  <div class="icon">' + icon + '</div>' +
            '  <h3>' + name + '</h3>' +
            '  <p>' + desc + '</p>' +
            '</div>';
        document.getElementById('fpPreviewCard').querySelector('.module-card').style.borderTop = '4px solid var(' + color.replace('--', '') + ')';
    },

    _generate: function () {
        var self = this;
        var config = self._gatherConfig();
        var code = self._buildCode(config);

        self._generatedCode = code;
        document.getElementById('fpCodeBlock').textContent = code;
        document.getElementById('fpCodePreview').style.display = 'block';
        document.getElementById('fpDownloadBtn').style.display = 'inline-block';
        document.getElementById('fpGenerateBtn').textContent = '🔄 重新生成';
    },

    _gatherConfig: function () {
        return {
            id: document.getElementById('fpId').value || 'my-tool',
            name: document.getElementById('fpName').value || '我的工具',
            icon: document.getElementById('fpIcon').value || '🔧',
            description: document.getElementById('fpDesc').value || '自定义功能模块',
            color: document.getElementById('fpColor').value || '--primary-color',
            hasUpload: document.getElementById('fpHasUpload').checked,
            hasSettings: document.getElementById('fpHasSettings').checked,
            hasPreview: document.getElementById('fpHasPreview').checked,
            hasDownload: document.getElementById('fpHasDownload').checked,
            hasMultiFile: document.getElementById('fpHasMultiFile').checked,
            hasImageProcess: document.getElementById('fpHasImageProcess').checked,
            template: this._selectedTemplate
        };
    },

    _buildCode: function (cfg) {
        var lines = [];
        lines.push('/**');
        lines.push(' * ' + cfg.name + ' - ' + cfg.description);
        lines.push(' * 由模块工厂自动生成');
        lines.push(' */');
        lines.push('PM.register({');
        lines.push("    id: '" + cfg.id + "',");
        lines.push("    name: '" + cfg.name + "',");
        lines.push("    icon: '" + cfg.icon + "',");
        lines.push("    description: '" + cfg.description + "',");
        lines.push("    color: '" + cfg.color + "',");
        lines.push("    colorHover: '" + cfg.color + "',");
        lines.push("    cardClass: '" + cfg.id + "-card',");
        lines.push("    uploadClass: '',");
        lines.push('');
        lines.push('    _data: null,');
        lines.push('');

        // render
        lines.push('    render: function () {');
        lines.push("        return '' +");
        lines.push("            '<div class=\"header-area\"><h2>" + cfg.icon + ' ' + cfg.name + "</h2><p>" + cfg.description + "</p></div>' +");

        if (cfg.hasSettings) {
            lines.push("            Utils.createSettingsBar([");
            lines.push("                { type: 'text', id: '" + cfg.id + "Input', label: '参数：', value: '' }");
            lines.push("            ]) +");
        }

        if (cfg.hasUpload) {
            var multiAttr = cfg.hasMultiFile ? ' multiple' : '';
            lines.push("            '<div id=\"" + cfg.id + "DropZone\" class=\"upload-area\"><p>点击或拖拽上传" + (cfg.hasMultiFile ? '文件（支持多选）' : '文件') + "</p><input type=\"file\" id=\"" + cfg.id + "FileInput\" class=\"file-input-hidden\"" + multiAttr + "></div>' +");
        }

        lines.push("            '<div id=\"" + cfg.id + "Status\" class=\"status-msg\" style=\"color:var(" + cfg.color + ")\"></div>' +");

        if (cfg.hasDownload) {
            lines.push("            '<div class=\"action-bar\" id=\"" + cfg.id + "ActionBar\" style=\"display:none\"><button class=\"btn-all-download\" style=\"background:var(" + cfg.color + ");\" id=\"" + cfg.id + "DownloadBtn\">⬇️ 下载结果</button></div>' +");
        }

        if (cfg.hasPreview) {
            lines.push("            '<div id=\"" + cfg.id + "Output\" style=\"margin-top:16px;\"></div>'");
        } else {
            lines.push("            ''");
        }
        lines.push("        ;");
        lines.push('    },');
        lines.push('');

        // init
        lines.push('    init: function () {');
        lines.push('        var self = this;');
        lines.push('        self._data = null;');
        lines.push('');

        if (cfg.hasUpload) {
            lines.push('        Utils.setupDragDrop(\'' + cfg.id + 'DropZone\', \'' + cfg.id + 'FileInput\', function (files) {');
            if (cfg.hasMultiFile) {
                lines.push('            if (files.length > 0) self._process(Array.from(files));');
            } else {
                lines.push('            if (files.length > 0) self._process(files[0]);');
            }
            lines.push('        });');
            lines.push('');
            lines.push('        document.getElementById(\'' + cfg.id + 'FileInput\').addEventListener(\'change\', function (e) {');
            if (cfg.hasMultiFile) {
                lines.push('            if (e.target.files.length > 0) self._process(Array.from(e.target.files));');
            } else {
                lines.push('            if (e.target.files[0]) self._process(e.target.files[0]);');
            }
            lines.push('        });');
            lines.push('');
        }

        if (cfg.hasDownload) {
            lines.push('        document.getElementById(\'' + cfg.id + 'DownloadBtn\').addEventListener(\'click\', function () {');
            lines.push('            if (self._data) {');
            lines.push('                // TODO: 实现下载逻辑');
            lines.push('                console.log(\'下载:\', self._data);');
            lines.push('            }');
            lines.push('        });');
            lines.push('');
        }

        lines.push('        // TODO: 添加更多事件绑定');
        lines.push('    },');
        lines.push('');

        // process
        lines.push('    _process: function (input) {');
        lines.push('        var self = this;');
        lines.push("        Utils.setStatus('" + cfg.id + "Status', '处理中...');");
        if (cfg.hasDownload) {
            lines.push("        Utils.hideElement('" + cfg.id + "ActionBar');");
        }
        lines.push('');
        lines.push('        // TODO: 实现核心处理逻辑');
        lines.push('        console.log(\'处理输入:\', input);');
        lines.push('        self._data = input;');
        lines.push('');
        lines.push("        Utils.setStatus('" + cfg.id + "Status', '✅ 处理完成！');");
        if (cfg.hasDownload) {
            lines.push("        Utils.showElement('" + cfg.id + "ActionBar');");
        }
        lines.push('    },');
        lines.push('');

        // destroy
        lines.push('    destroy: function () {');
        lines.push('        this._data = null;');
        if (cfg.hasUpload) {
            lines.push("        Utils.resetFileInput('" + cfg.id + "FileInput');");
        }
        lines.push("        Utils.setStatus('" + cfg.id + "Status', '');");
        if (cfg.hasDownload) {
            lines.push("        Utils.hideElement('" + cfg.id + "ActionBar');");
        }
        if (cfg.hasPreview) {
            lines.push("        var out = document.getElementById('" + cfg.id + "Output');");
            lines.push('        if (out) out.innerHTML = \'\';');
        }
        lines.push('    }');
        lines.push('});');

        return lines.join('\n');
    },

    _download: function () {
        if (!this._generatedCode) return;
        var id = document.getElementById('fpId').value || 'my-tool';
        var blob = new Blob([this._generatedCode], { type: 'application/javascript' });
        saveAs(blob, id + '_plugin.js');
    },

    destroy: function () {
        this._generatedCode = null;
        this._selectedTemplate = 'simple';
    }
});

// 全局步骤控制（供HTML内联onclick调用）
var PF = {
    nextStep: function (n) {
        document.querySelectorAll('.factory-panel').forEach(function (p) { p.style.display = 'none'; });
        document.getElementById('factoryStep' + n).style.display = 'block';
        document.querySelectorAll('.factory-step').forEach(function (s) { s.classList.remove('active'); });
        document.querySelector('.factory-step[data-step="' + n + '"]').classList.add('active');
    },
    prevStep: function (n) {
        this.nextStep(n);
    }
};
