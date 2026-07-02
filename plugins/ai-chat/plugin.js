/**
 * AI 聊天模块 - 本地 Ollama 大模型聊天客户端
 * 支持文字、图片、视频对话，多会话管理
 */
PM.register({
    id: 'ai-chat',
    name: 'AI 聊天',
    icon: '🐱',
    description: '连接本地 Ollama 大模型，支持图文视频对话、多会话管理、思考过程展示。',
    color: '--pink-color',
    colorHover: '--pink-hover',
    cardClass: 'ai-chat-card',
    uploadClass: '',

    _container: null,

    render: function () {
        return '' +
            '<div id="aiChatContainer" style="height:calc(100vh - 180px);min-height:500px;display:flex;flex-direction:column;">' +
            '  <div class="header-area" style="flex-shrink:0;"><h2>🐱 在本地养猫</h2><p>连接本地 Ollama 大模型，支持图文视频对话</p></div>' +

            '  <div style="display:flex;flex:1;overflow:hidden;border:1px solid #ffd1dc;border-radius:12px;">' +
            // 侧边栏
            '    <div style="width:220px;background:#ffe4e1;display:flex;flex-direction:column;border-right:2px solid #ffd1dc;flex-shrink:0;">' +
            '      <div style="padding:16px;border-bottom:2px dashed #ff8fa3;">' +
            '        <button id="aiNewChat" style="width:100%;padding:8px;border-radius:20px;background:#ff8fa3;border:none;color:#fff;cursor:pointer;font-size:13px;">+ 摸新猫</button>' +
            '        <div style="margin-top:12px;">' +
            '          <label style="font-size:11px;color:#b08a9e;display:block;margin-bottom:4px;">🐈 选猫品种</label>' +
            '          <select id="aiModelSelect" style="width:100%;padding:6px 10px;border-radius:16px;border:2px solid #ffd1dc;background:#fff;font-size:12px;">' +
            '            <option value="qwen3.6:27b-64k">qwen3.6:27b-64k</option>' +
            '            <option value="qwen3.6:27b">qwen3.6:27b</option>' +
            '            <option value="cocos-expert">cocos-expert</option>' +
            '            <option value="qwen3:8b">qwen3:8b</option>' +
            '          </select>' +
            '        </div>' +
            '        <div style="margin-top:8px;">' +
            '          <label style="font-size:11px;color:#b08a9e;display:block;margin-bottom:4px;">🏠 猫窝地址</label>' +
            '          <input id="aiServerUrl" value="http://localhost:11434" style="width:100%;padding:6px 10px;border-radius:16px;border:2px solid #ffd1dc;background:#fff;font-size:12px;">' +
            '        </div>' +
            '      </div>' +
            '      <div id="aiChatList" style="flex:1;overflow-y:auto;padding:8px;"></div>' +
            '    </div>' +

            // 主聊天区
            '    <div style="flex:1;display:flex;flex-direction:column;background:#fff5f5;min-width:0;">' +
            '      <div style="padding:12px 20px;border-bottom:2px dashed #ffd1dc;display:flex;justify-content:space-between;align-items:center;background:#fff;">' +
            '        <span style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:#5c374c;">' +
            '          <span style="font-size:20px;">😸</span>' +
            '          <span id="aiStatusDot" style="width:10px;height:10px;border-radius:50%;background:#ffb3b3;display:inline-block;"></span>' +
            '          <span id="aiModelLabel">qwen3.6:27b-64k</span>' +
            '        </span>' +
            '        <span style="font-size:13px;color:#b08a9e;">🐾 喵喵喵 ~</span>' +
            '      </div>' +

            '      <div id="aiMessages" style="flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:14px;">' +
            '        <div style="text-align:center;color:#b08a9e;padding:60px 20px;">' +
            '          <span style="font-size:64px;display:block;margin-bottom:12px;">🐱</span>' +
            '          <div>欢迎来到你的猫咪小窝</div>' +
            '          <div style="font-size:13px;margin-top:8px;">可以和猫咪聊天，也可以给它看照片和视频哦 ~</div>' +
            '        </div>' +
            '      </div>' +

            '      <div style="border-top:2px dashed #ffd1dc;padding:12px 20px;background:#fff;">' +
            '        <div style="display:flex;gap:8px;margin-bottom:8px;">' +
            '          <label style="padding:4px 12px;border-radius:16px;border:2px dashed #ff8fa3;background:transparent;color:#ff8fa3;cursor:pointer;font-size:12px;">📷 图片<input type="file" id="aiImgUpload" accept="image/*" multiple style="display:none;"></label>' +
            '          <label style="padding:4px 12px;border-radius:16px;border:2px dashed #ff8fa3;background:transparent;color:#ff8fa3;cursor:pointer;font-size:12px;">🎬 视频<input type="file" id="aiVidUpload" accept="video/*" multiple style="display:none;"></label>' +
            '        </div>' +
            '        <div id="aiPreviewRow" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;"></div>' +
            '        <div style="display:flex;gap:10px;">' +
            '          <textarea id="aiUserInput" placeholder="对猫咪说点什么... (Enter 发送，Shift+Enter 换行)" rows="1" style="flex:1;resize:none;padding:10px 14px;border-radius:20px;border:2px solid #ffd1dc;background:#fff5f5;font-size:14px;min-height:42px;font-family:inherit;line-height:1.5;"></textarea>' +
            '          <button id="aiSendBtn" style="padding:10px 24px;background:#ff8fa3;border:none;border-radius:20px;color:#fff;cursor:pointer;font-size:14px;font-weight:600;align-self:flex-end;">🐾 蹭蹭</button>' +
            '        </div>' +
            '      </div>' +
            '    </div>' +
            '  </div>' +
            '</div>';
    },

    init: function () {
        var self = this;
        self._chats = self._loadChats();
        self._currentChatId = null;
        self._isStreaming = false;
        self._hasMessages = false;
        self._pendingFiles = [];

        // 事件绑定
        document.getElementById('aiNewChat').addEventListener('click', function () { self._newChat(); });
        document.getElementById('aiSendBtn').addEventListener('click', function () { self._send(); });
        document.getElementById('aiModelSelect').addEventListener('change', function () {
            document.getElementById('aiModelLabel').textContent = this.value;
            if (self._currentChatId) { self._chats[self._currentChatId].model = this.value; self._saveChats(); }
        });
        document.getElementById('aiServerUrl').addEventListener('change', function () { self._checkStatus(); });

        // 文件上传
        document.getElementById('aiImgUpload').addEventListener('change', function (e) { self._addFiles('image', e.target); });
        document.getElementById('aiVidUpload').addEventListener('change', function (e) { self._addFiles('video', e.target); });

        // 输入框
        var input = document.getElementById('aiUserInput');
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); self._send(); }
        });
        input.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 180) + 'px';
        });

        // 初始化
        self._checkStatus();
        setInterval(function () { self._checkStatus(); }, 10000);

        if (!self._currentChatId && Object.keys(self._chats).length === 0) {
            self._newChat();
        } else if (self._currentChatId) {
            var chat = self._chats[self._currentChatId];
            if (chat) {
                document.getElementById('aiModelSelect').value = chat.model || document.getElementById('aiModelSelect').value;
                self._renderMessages();
            }
        }
        self._renderChatList();
    },

    _loadChats: function () {
        try { return JSON.parse(localStorage.getItem('pic_chats') || '{}'); } catch(e) { return {}; }
    },
    _saveChats: function () { localStorage.setItem('pic_chats', JSON.stringify(this._chats)); },

    _newChat: function () {
        var id = Date.now().toString();
        this._chats[id] = { title: '新喵', messages: [], model: document.getElementById('aiModelSelect').value };
        this._currentChatId = id;
        this._hasMessages = false;
        this._pendingFiles = [];
        document.getElementById('aiPreviewRow').innerHTML = '';
        this._saveChats();
        this._renderChatList();
        document.getElementById('aiMessages').innerHTML =
            '<div style="text-align:center;color:#b08a9e;padding:60px 20px;">' +
            '<span style="font-size:64px;display:block;margin-bottom:12px;">🐱</span><div>新猫咪来啦</div>' +
            '<div style="font-size:13px;margin-top:8px;">快跟它打个招呼吧 ~</div></div>';
    },

    _switchChat: function (id) {
        this._currentChatId = id;
        document.getElementById('aiModelSelect').value = this._chats[id].model || document.getElementById('aiModelSelect').value;
        document.getElementById('aiModelLabel').textContent = document.getElementById('aiModelSelect').value;
        this._hasMessages = this._chats[id].messages.length > 0;
        this._pendingFiles = [];
        document.getElementById('aiPreviewRow').innerHTML = '';
        this._renderMessages();
        this._renderChatList();
    },

    _deleteChat: function (id) {
        delete this._chats[id];
        if (this._currentChatId === id) {
            var keys = Object.keys(this._chats);
            this._currentChatId = keys.length ? keys[keys.length - 1] : null;
        }
        this._saveChats();
        this._renderChatList();
        if (this._currentChatId) this._renderMessages();
        else {
            document.getElementById('aiMessages').innerHTML =
                '<div style="text-align:center;color:#b08a9e;padding:60px 20px;">' +
                '<span style="font-size:64px;display:block;margin-bottom:12px;">🐱</span>' +
                '<div>欢迎来到你的猫咪小窝</div>' +
                '<div style="font-size:13px;margin-top:8px;">可以和猫咪聊天，也可以给它看照片和视频哦 ~</div></div>';
            this._hasMessages = false;
        }
    },

    _renderChatList: function () {
        var list = document.getElementById('aiChatList');
        list.innerHTML = '';
        var self = this;
        var icons = ['🐱','😺','😸','😻','😽','😼','🙀','😿','😾'];
        Object.keys(this._chats).reverse().forEach(function (id) {
            var div = document.createElement('div');
            div.style.cssText = 'padding:8px 12px;border-radius:14px;cursor:pointer;font-size:12px;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:#fff;transition:all .2s;border:1px solid transparent;';
            if (id === self._currentChatId) {
                div.style.background = '#ffd1dc';
                div.style.borderColor = '#ff8fa3';
                div.style.fontWeight = '600';
            }
            div.innerHTML = '<span style="float:right;font-size:10px;color:#b08a9e;margin-left:6px;cursor:pointer;" onclick="event.stopPropagation();">🗑</span>' +
                icons[parseInt(id) % icons.length] + ' ' + self._chats[id].title;
            div.querySelector('span').onclick = function (e) { e.stopPropagation(); self._deleteChat(id); };
            div.onclick = function () { self._switchChat(id); };
            list.appendChild(div);
        });
    },

    _renderMessages: function () {
        if (!this._currentChatId || !this._chats[this._currentChatId]) return;
        var msgs = this._chats[this._currentChatId].messages;
        var container = document.getElementById('aiMessages');
        container.innerHTML = '';
        var self = this;
        msgs.forEach(function (m) { self._addMsgBubble(m.role, m.content, m.images, m.thinking); });
        this._hasMessages = msgs.length > 0;
        container.scrollTop = container.scrollHeight;
    },

    _addMsgBubble: function (role, content, images, thinking) {
        var container = document.getElementById('aiMessages');
        // 移除空状态
        var empty = container.querySelector('div[style*="text-align:center"]');
        if (empty) empty.remove();

        var div = document.createElement('div');
        var isUser = role === 'user';
        div.style.cssText = 'max-width:80%;padding:12px 16px;border-radius:16px;line-height:1.6;white-space:pre-wrap;word-break:break-word;font-size:13px;' +
            (isUser ? 'align-self:flex-end;background:#ffd1dc;border-bottom-right-radius:4px;' :
             'align-self:flex-start;background:#fff0f3;border:2px solid #ffd1dc;border-bottom-left-radius:4px;');

        var html = '';
        if (!isUser) html += '<div style="font-size:11px;color:#ff8fa3;margin-bottom:4px;font-weight:600;">' + document.getElementById('aiModelSelect').value + '</div>';
        if (images && images.length > 0) {
            images.forEach(function (img) {
                if (img.startsWith('data:video')) {
                    html += '<video controls src="' + img + '" style="max-width:100%;max-height:200px;border-radius:8px;margin-bottom:6px;display:block;"></video>';
                } else {
                    html += '<img src="' + img + '" style="max-width:100%;max-height:200px;border-radius:8px;margin-bottom:6px;display:block;">';
                }
            });
        }
        if (thinking) {
            var tid = 'think_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
            html += '<div style="display:flex;align-items:center;gap:4px;font-size:11px;color:#b08a9e;cursor:pointer;margin-bottom:6px;" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display===\'none\'?\'block\':\'none\';this.querySelector(\'span\').style.transform=this.nextElementSibling.style.display===\'none\'?\'rotate(0deg)\':\'rotate(90deg)\';">' +
                '<span style="transition:transform .2s;font-size:10px;">▶</span>💭 思考过程</div>' +
                '<div style="display:none;background:rgba(255,143,163,.08);border-left:3px solid #ff8fa3;border-radius:0 6px 6px 0;padding:8px 12px;margin-bottom:8px;font-size:11px;color:#b08a9e;line-height:1.5;max-height:150px;overflow-y:auto;">' + this._escapeHtml(thinking) + '</div>';
        }
        div.innerHTML = html + this._escapeHtml(content || '');
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
        return div;
    },

    _addLoadingBubble: function () {
        var container = document.getElementById('aiMessages');
        var empty = container.querySelector('div[style*="text-align:center"]');
        if (empty) empty.remove();

        var div = document.createElement('div');
        div.style.cssText = 'max-width:80%;padding:12px 16px;border-radius:16px;align-self:flex-start;background:#fff0f3;border:2px solid #ffd1dc;border-bottom-left-radius:4px;';
        div.innerHTML = '<div style="font-size:11px;color:#ff8fa3;margin-bottom:4px;font-weight:600;">' + document.getElementById('aiModelSelect').value + ' 正在思考</div>' +
            '<span style="display:inline-block;animation:purr 1.4s infinite;font-size:16px;">🐟</span>' +
            '<span style="display:inline-block;animation:purr 1.4s infinite .2s;font-size:16px;">🐟</span>' +
            '<span style="display:inline-block;animation:purr 1.4s infinite .4s;font-size:16px;">🐟</span>';
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
        return div;
    },

    _addFiles: function (type, input) {
        var self = this;
        Array.from(input.files).forEach(function (file) {
            var reader = new FileReader();
            reader.onload = function (e) {
                self._pendingFiles.push({ dataUrl: e.target.result, type: type, name: file.name });
                self._renderPreviews();
            };
            reader.readAsDataURL(file);
        });
        input.value = '';
    },

    _removeFile: function (index) {
        this._pendingFiles.splice(index, 1);
        this._renderPreviews();
    },

    _renderPreviews: function () {
        var row = document.getElementById('aiPreviewRow');
        row.innerHTML = '';
        var self = this;
        this._pendingFiles.forEach(function (f, i) {
            var div = document.createElement('div');
            div.style.cssText = 'position:relative;width:60px;height:60px;border-radius:8px;overflow:hidden;border:2px solid #ffd1dc;';
            if (f.type === 'video') {
                div.innerHTML = '<video src="' + f.dataUrl + '" style="width:100%;height:100%;object-fit:cover;"></video>';
            } else {
                div.innerHTML = '<img src="' + f.dataUrl + '" style="width:100%;height:100%;object-fit:cover;">';
            }
            div.innerHTML += '<button style="position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;background:#ff8fa3;color:#fff;border:none;cursor:pointer;font-size:11px;line-height:18px;text-align:center;" onclick="PM.plugins[\'ai-chat\']._removeFile(' + i + ')">×</button>';
            row.appendChild(div);
        });
    },

    _send: async function () {
        var self = this;
        var content = document.getElementById('aiUserInput').value.trim();
        if ((!content && self._pendingFiles.length === 0) || self._isStreaming) return;

        document.getElementById('aiUserInput').value = '';
        document.getElementById('aiUserInput').style.height = 'auto';
        self._isStreaming = true;
        document.getElementById('aiSendBtn').disabled = true;

        if (!self._currentChatId) self._newChat();

        var chat = self._chats[self._currentChatId];
        if (chat.messages.length === 0) {
            chat.title = content ? content.slice(0, 16) : (self._pendingFiles[0]?.name || '图片');
        }
        chat.model = document.getElementById('aiModelSelect').value;

        var imgs = self._pendingFiles.map(function (f) { return f.dataUrl; });
        var msgObj = { role: 'user', content: content || '请看这个' };
        if (imgs.length > 0) msgObj.images = imgs;
        chat.messages.push(msgObj);

        self._addMsgBubble('user', content, imgs);
        self._pendingFiles = [];
        document.getElementById('aiPreviewRow').innerHTML = '';
        var bubble = self._addLoadingBubble();
        self._hasMessages = true;
        self._saveChats(); self._renderChatList();

        var hasImages = imgs.length > 0;
        var rawImages = hasImages ? imgs.map(function (img) { return img.replace(/^data:image\/\w+;base64,/, ''); }) : [];
        var serverUrl = document.getElementById('aiServerUrl').value;
        var model = document.getElementById('aiModelSelect').value;

        var apiMsgs = [];
        chat.messages.forEach(function (m) {
            apiMsgs.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content || '' });
        });

        var fullText = '', thinkingText = '';
        try {
            if (hasImages) {
                var res = await fetch(serverUrl + '/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model: model, messages: apiMsgs, stream: false, images: rawImages })
                });
                if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
                var data = await res.json();
                fullText = data.message?.content || '';
                bubble.innerHTML = '<div style="font-size:11px;color:#ff8fa3;margin-bottom:4px;font-weight:600;">' + model + '</div>' + self._escapeHtml(fullText);
            } else {
                var res = await fetch(serverUrl + '/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model: model, messages: apiMsgs, stream: true })
                });
                if (!res.ok) throw new Error(res.status + ' ' + res.statusText);

                var reader = res.body.getReader();
                var decoder = new TextDecoder();
                while (true) {
                    var chunk = await reader.read();
                    if (chunk.done) break;
                    var lines = decoder.decode(chunk.value).split('\n');
                    for (var i = 0; i < lines.length; i++) {
                        var line = lines[i];
                        if (!line || !line.startsWith('data: ')) continue;
                        try {
                            var parsed = JSON.parse(line.slice(6));
                            if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
                                if (parsed.choices[0].delta.content) {
                                    fullText += parsed.choices[0].delta.content;
                                    bubble.innerHTML = '<div style="font-size:11px;color:#ff8fa3;margin-bottom:4px;font-weight:600;">' + model + '</div>' + self._escapeHtml(fullText);
                                    document.getElementById('aiMessages').scrollTop = document.getElementById('aiMessages').scrollHeight;
                                }
                                if (parsed.choices[0].delta.reasoning_content) {
                                    thinkingText += parsed.choices[0].delta.reasoning_content;
                                }
                            }
                        } catch (e) {}
                    }
                }
            }
        } catch (e) {
            bubble.innerHTML = '<div style="font-size:11px;color:#e94560;margin-bottom:4px;font-weight:600;">😿 猫咪走丢了</div>' + e.message;
        }

        if (fullText) {
            var assistantMsg = { role: 'assistant', content: fullText };
            if (thinkingText) assistantMsg.thinking = thinkingText;
            chat.messages.push(assistantMsg);
            self._saveChats(); self._renderChatList();
        }
        self._isStreaming = false;
        document.getElementById('aiSendBtn').disabled = false;
        document.getElementById('aiUserInput').focus();
    },

    _escapeHtml: function (s) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(s));
        return div.innerHTML;
    },

    _checkStatus: async function () {
        var dot = document.getElementById('aiStatusDot');
        try {
            var r = await fetch(document.getElementById('aiServerUrl').value + '/api/tags');
            if (r.ok) {
                dot.style.background = '#8fdf8f';
                dot.style.boxShadow = '0 0 8px rgba(143,223,143,.5)';
                return;
            }
        } catch (e) {}
        dot.style.background = '#ffb3b3';
        dot.style.boxShadow = '0 0 8px rgba(255,179,179,.5)';
    },

    destroy: function () {
        this._chats = {};
        this._currentChatId = null;
        this._isStreaming = false;
        this._pendingFiles = [];
    }
});
