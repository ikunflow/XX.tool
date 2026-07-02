/**
 * 序列帧动画生成模块 - 拖入序列帧，可视化调试，导出 Cocos/Unity 动画资源
 */
PM.register({
    id: 'sprite-animation',
    name: '序列帧动画生成',
    icon: '🎬',
    description: '拖入序列帧图片，可视化调试动画参数，导出 Cocos Creator 或 Unity 可用的序列帧动画资源。',
    color: '--teal-color',
    colorHover: '--teal-hover',
    cardClass: 'sprite-animation-card',
    uploadClass: '',

    _frames: [],          // { file, img, name }
    _animTimer: null,
    _currentFrame: 0,
    _isPlaying: false,
    _fps: 12,
    _loop: true,
    _canvas: null,
    _ctx: null,

    render: function () {
        return '' +
            '<div class="header-area"><h2>🎬 序列帧动画生成器</h2><p>拖入序列帧图片，实时预览调试，导出 Cocos/Unity 动画资源</p></div>' +

            // 控制栏
            '<div class="settings-bar" style="flex-wrap:wrap;">' +
            '  <div class="setting-item">' +
            '    <label>帧率 (FPS):</label>' +
            '    <input type="number" id="saFps" value="12" min="1" max="60" style="width:60px;">' +
            '  </div>' +
            '  <div class="setting-item">' +
            '    <label>缩放:</label>' +
            '    <input type="range" id="saZoom" value="100" min="25" max="200" style="width:80px;"><span id="saZoomVal">100%</span>' +
            '  </div>' +
            '  <div class="setting-item">' +
            '    <input type="checkbox" id="saLoop" checked><label for="saLoop">循环播放</label>' +
            '  </div>' +
            '  <div class="setting-item">' +
            '    <label>背景色:</label>' +
            '    <input type="color" id="saBgColor" value="#2c3e50" style="width:40px;height:28px;padding:0;border:none;">' +
            '  </div>' +
            '  <div class="setting-item">' +
            '    <button id="saPlayBtn" class="btn-all-download" style="background:var(--teal-color);padding:6px 16px;">▶️ 播放</button>' +
            '    <button id="saStopBtn" class="btn-all-download" style="background:#e74c3c;padding:6px 16px;margin-left:8px;">⏹️ 停止</button>' +
            '  </div>' +
            '</div>' +

            // 上传区
            '<div id="saDropZone" class="upload-area" style="border-color:var(--teal-color);">' +
            '  <p>📁 点击或拖拽批量上传序列帧图片（建议按顺序命名如 walk_01.png, walk_02.png...）</p>' +
            '  <input type="file" id="saFileInput" class="file-input-hidden" accept="image/*" multiple>' +
            '</div>' +

            '<div id="saStatus" class="status-msg" style="color:var(--teal-color)"></div>' +

            // 预览区 + 帧列表
            '<div id="saWorkspace" style="display:none;">' +
            '  <div style="display:flex;gap:16px;flex-wrap:wrap;">' +
            '    <!-- 动画预览 -->' +
            '    <div style="flex:1;min-width:300px;">' +
            '      <h4 style="margin:0 0 8px 0;">🎞️ 动画预览</h4>' +
            '      <div id="saPreviewBox" style="background:#2c3e50;border-radius:8px;overflow:hidden;display:flex;align-items:center;justify-content:center;min-height:300px;">' +
            '        <canvas id="saCanvas" style="max-width:100%;max-height:400px;"></canvas>' +
            '      </div>' +
            '      <div style="text-align:center;margin-top:8px;color:#666;font-size:12px;">' +
            '        第 <span id="saFrameNum">0</span> / <span id="saTotalFrames">0</span> 帧' +
            '      </div>' +
            '    </div>' +
            '    <!-- 帧列表 -->' +
            '    <div style="width:280px;max-height:450px;overflow-y:auto;">' +
            '      <h4 style="margin:0 0 8px 0;">📋 帧列表（可拖拽排序）</h4>' +
            '      <div id="saFrameList" style="display:flex;flex-direction:column;gap:4px;"></div>' +
            '    </div>' +
            '  </div>' +
            '</div>' +

            // 导出栏
            '<div class="action-bar" id="saExportBar" style="display:none;">' +
            '  <label style="margin-right:8px;">导出目标:</label>' +
            '  <select id="saExportTarget" style="padding:6px 12px;border-radius:6px;border:1px solid #ddd;">' +
            '    <option value="cocos">Cocos Creator</option>' +
            '    <option value="unity">Unity</option>' +
            '  </select>' +
            '  <button class="btn-all-download" style="background:var(--teal-color);margin-left:12px;" id="saExportBtn">📦 导出动画资源</button>' +
            '</div>';
    },

    init: function () {
        var self = this;
        self._frames = [];
        self._isPlaying = false;
        self._currentFrame = 0;

        // Canvas
        self._canvas = document.getElementById('saCanvas');
        self._ctx = self._canvas.getContext('2d');

        // 文件上传
        Utils.setupDragDrop('saDropZone', 'saFileInput', function (files) {
            if (files.length > 0) self._loadFrames(Array.from(files));
        });
        document.getElementById('saFileInput').addEventListener('change', function (e) {
            if (e.target.files.length > 0) self._loadFrames(Array.from(e.target.files));
        });

        // 播放控制
        document.getElementById('saPlayBtn').addEventListener('click', function () { self._play(); });
        document.getElementById('saStopBtn').addEventListener('click', function () { self._stop(); });

        // FPS
        document.getElementById('saFps').addEventListener('input', function () {
            self._fps = parseInt(this.value) || 12;
            if (self._isPlaying) { self._stop(); self._play(); }
        });

        // 缩放
        document.getElementById('saZoom').addEventListener('input', function () {
            document.getElementById('saZoomVal').textContent = this.value + '%';
            self._drawFrame(self._currentFrame);
        });

        // 循环
        document.getElementById('saLoop').addEventListener('change', function () {
            self._loop = this.checked;
        });

        // 背景色
        document.getElementById('saBgColor').addEventListener('input', function () {
            document.getElementById('saPreviewBox').style.background = this.value;
        });

        // 导出
        document.getElementById('saExportBtn').addEventListener('click', function () { self._export(); });
    },

    // ========== 加载帧 ==========
    _loadFrames: function (files) {
        var self = this;
        // 按文件名排序
        files.sort(function (a, b) { return a.name.localeCompare(b.name, undefined, { numeric: true }); });

        Utils.setStatus('saStatus', '正在加载 ' + files.length + ' 帧...');
        var loaded = 0;
        self._frames = [];

        files.forEach(function (file, idx) {
            Utils.loadImageFromFile(file).then(function (img) {
                self._frames[idx] = { file: file, img: img, name: file.name };
                loaded++;
                if (loaded === files.length) {
                    self._frames = self._frames.filter(Boolean); // 去空
                    self._onFramesReady();
                }
            }).catch(function (err) {
                loaded++;
                console.warn('加载失败:', err);
            });
        });
    },

    _onFramesReady: function () {
        var self = this;
        if (self._frames.length === 0) {
            Utils.setStatus('saStatus', '⚠️ 没有成功加载任何图片');
            return;
        }

        // 设置 canvas 尺寸为最大帧尺寸
        var maxW = 0, maxH = 0;
        self._frames.forEach(function (f) {
            if (f.img.width > maxW) maxW = f.img.width;
            if (f.img.height > maxH) maxH = f.img.height;
        });
        self._canvas.width = maxW;
        self._canvas.height = maxH;

        // 显示工作区
        Utils.showElement('saWorkspace');
        Utils.showElement('saExportBar');
        document.getElementById('saTotalFrames').textContent = self._frames.length;

        self._renderFrameList();
        self._drawFrame(0);
        Utils.setStatus('saStatus', '✅ 已加载 ' + self._frames.length + ' 帧，点击播放预览');
    },

    // ========== 帧列表渲染（可排序） ==========
    _renderFrameList: function () {
        var self = this;
        var list = document.getElementById('saFrameList');
        list.innerHTML = '';

        self._frames.forEach(function (frame, idx) {
            var item = document.createElement('div');
            item.className = 'frame-item';
            item.draggable = true;
            item.dataset.index = idx;
            item.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 10px;background:#f8f9fa;border-radius:6px;cursor:grab;border:2px solid transparent;';
            item.innerHTML =
                '<span style="color:#999;font-size:12px;width:24px;">#' + (idx + 1) + '</span>' +
                '<img src="' + frame.img.src + '" style="width:40px;height:40px;object-fit:contain;background:#2c3e50;border-radius:4px;">' +
                '<span style="flex:1;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + frame.name + '</span>' +
                '<button class="sa-del-btn" data-idx="' + idx + '" style="background:#e74c3c;color:#fff;border:none;border-radius:4px;padding:2px 8px;font-size:11px;cursor:pointer;">✕</button>';

            // 点击跳转
            item.addEventListener('click', function (e) {
                if (e.target.classList.contains('sa-del-btn')) return;
                self._stop();
                self._drawFrame(idx);
            });

            // 删除
            item.querySelector('.sa-del-btn').addEventListener('click', function () {
                self._frames.splice(parseInt(this.dataset.idx), 1);
                self._renderFrameList();
                if (self._currentFrame >= self._frames.length) self._currentFrame = 0;
                self._drawFrame(self._currentFrame);
                document.getElementById('saTotalFrames').textContent = self._frames.length;
            });

            // 拖拽排序
            item.addEventListener('dragstart', function (e) {
                e.dataTransfer.setData('text/plain', this.dataset.index);
                this.style.opacity = '0.5';
            });
            item.addEventListener('dragend', function () {
                this.style.opacity = '1';
                list.querySelectorAll('.frame-item').forEach(function (el) { el.style.borderColor = 'transparent'; });
            });
            item.addEventListener('dragover', function (e) {
                e.preventDefault();
                this.style.borderColor = 'var(--teal-color)';
            });
            item.addEventListener('dragleave', function () {
                this.style.borderColor = 'transparent';
            });
            item.addEventListener('drop', function (e) {
                e.preventDefault();
                var fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
                var toIdx = parseInt(this.dataset.index);
                if (fromIdx === toIdx) return;
                var moved = self._frames.splice(fromIdx, 1)[0];
                self._frames.splice(toIdx, 0, moved);
                self._renderFrameList();
                self._drawFrame(self._currentFrame);
            });

            list.appendChild(item);
        });
    },

    // ========== 绘制单帧 ==========
    _drawFrame: function (idx) {
        var self = this;
        if (!self._frames[idx]) return;
        self._currentFrame = idx;

        var frame = self._frames[idx];
        var zoom = parseInt(document.getElementById('saZoom').value) / 100;

        // 清屏
        self._ctx.clearRect(0, 0, self._canvas.width, self._canvas.height);

        // 缩放绘制
        var w = frame.img.width * zoom;
        var h = frame.img.height * zoom;
        var x = (self._canvas.width - w) / 2;
        var y = (self._canvas.height - h) / 2;
        self._ctx.drawImage(frame.img, x, y, w, h);

        document.getElementById('saFrameNum').textContent = idx + 1;

        // 高亮当前帧
        var items = document.getElementById('saFrameList').querySelectorAll('.frame-item');
        items.forEach(function (el, i) {
            el.style.background = i === idx ? '#e0f7fa' : '#f8f9fa';
            el.style.borderColor = i === idx ? 'var(--teal-color)' : 'transparent';
        });
    },

    // ========== 播放控制 ==========
    _play: function () {
        var self = this;
        if (self._isPlaying || self._frames.length === 0) return;
        self._isPlaying = true;
        document.getElementById('saPlayBtn').textContent = '⏸️ 暂停';

        var interval = 1000 / self._fps;
        self._animTimer = setInterval(function () {
            var next = self._currentFrame + 1;
            if (next >= self._frames.length) {
                if (self._loop) next = 0;
                else { self._stop(); return; }
            }
            self._drawFrame(next);
        }, interval);
    },

    _stop: function () {
        var self = this;
        self._isPlaying = false;
        if (self._animTimer) { clearInterval(self._animTimer); self._animTimer = null; }
        document.getElementById('saPlayBtn').textContent = '▶️ 播放';
    },

    // ========== 导出 ==========
    _export: function () {
        var self = this;
        var target = document.getElementById('saExportTarget').value;

        if (target === 'cocos') {
            self._exportCocos();
        } else {
            self._exportUnity();
        }
    },

    // ---- Cocos Creator 导出 ----
    _exportCocos: function () {
        var self = this;
        var zip = new JSZip();
        var animName = 'animation';

        // 1. 帧图片（保持原文件名）
        self._frames.forEach(function (f) {
            zip.file('frames/' + f.name, f.file);
        });

        // 2. Animation Clip (.anim)
        var animClip = self._buildCocosAnimClip();
        zip.file(animName + '.anim', JSON.stringify(animClip, null, 2));

        // 3. 图集配置 (plist) - 简单版本，每张图独立
        var plist = self._buildCocosPlist();
        zip.file(animName + '.plist', plist);

        zip.generateAsync({ type: 'blob' }).then(function (content) {
            saveAs(content, 'cocos_sprite_animation.zip');
        });

        Utils.setStatus('saStatus', '✅ Cocos 动画资源已导出');
    },

    _buildCocosAnimClip: function () {
        var self = this;
        var duration = self._frames.length / self._fps;
        var curves = [];

        self._frames.forEach(function (f, i) {
            var time = i / self._fps;
            curves.push({
                frame: time,
                value: { __uuid__: 'frame_' + i },
                curve: 'constant'
            });
        });

        return {
            __type__: 'cc.AnimationClip',
            _name: 'sprite_animation',
            _duration: duration,
            sample: self._fps,
            speed: 1,
            wrapMode: this._loop ? 2 : 1, // 2=Loop, 1=Normal
            curveData: {
                comps: {
                    'cc.Sprite': {
                        spriteFrame: curves
                    }
                }
            },
            events: []
        };
    },

    _buildCocosPlist: function () {
        // 简化的 plist，实际项目中可用 TexturePacker 生成真正的图集
        var frames = {};
        this._frames.forEach(function (f, i) {
            frames[f.name] = {
                frame: '{{0,0},{' + f.img.width + ',' + f.img.height + '}}',
                offset: '{0,0}',
                rotated: false,
                sourceColorRect: '{{0,0},{' + f.img.width + ',' + f.img.height + '}}',
                sourceSize: '{' + f.img.width + ',' + f.img.height + '}'
            };
        });

        return '<?xml version="1.0" encoding="UTF-8"?>\n' +
            '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n' +
            '<plist version="1.0">\n<dict>\n' +
            '  <key>frames</key>\n  <dict>\n' +
            Object.keys(frames).map(function (k) {
                var f = frames[k];
                return '    <key>' + k + '</key>\n    <dict>\n' +
                    '      <key>frame</key><string>' + f.frame + '</string>\n' +
                    '      <key>offset</key><string>' + f.offset + '</string>\n' +
                    '      <key>rotated</key><' + (f.rotated ? 'true' : 'false') + '/>\n' +
                    '      <key>sourceColorRect</key><string>' + f.sourceColorRect + '</string>\n' +
                    '      <key>sourceSize</key><string>' + f.sourceSize + '</string>\n' +
                    '    </dict>';
            }).join('\n') +
            '\n  </dict>\n' +
            '  <key>metadata</key>\n  <dict>\n' +
            '    <key>format</key><integer>2</integer>\n' +
            '    <key>realTextureFileName</key><string>animation.png</string>\n' +
            '    <key>size</key><string>{512,512}</string>\n' +
            '    <key>textureFileName</key><string>animation.png</string>\n' +
            '  </dict>\n</dict>\n</plist>';
    },

    // ---- Unity 导出 ----
    _exportUnity: function () {
        var self = this;
        var zip = new JSZip();

        // 1. 帧图片
        self._frames.forEach(function (f) {
            zip.file('Frames/' + f.name, f.file);
        });

        // 2. Animator Controller (YAML)
        zip.file('AnimatorController.controller', self._buildUnityAnimator());

        // 3. Animation Clip
        zip.file('SpriteAnimation.anim', self._buildUnityAnimClip());

        zip.generateAsync({ type: 'blob' }).then(function (content) {
            saveAs(content, 'unity_sprite_animation.zip');
        });

        Utils.setStatus('saStatus', '✅ Unity 动画资源已导出');
    },

    _buildUnityAnimator: function () {
        return '%YAML 1.1\n%TAG !u! tag:unity3d.com,2011:\n' +
            '--- !u!91 &9100000\nAnimatorController:\n' +
            '  m_ObjectHideFlags: 0\n' +
            '  m_CorrespondingSourceObject: {fileID: 0}\n' +
            '  m_PrefabInstance: {fileID: 0}\n' +
            '  m_PrefabAsset: {fileID: 0}\n' +
            '  m_Name: SpriteAnimator\n' +
            '  serializedVersion: 5\n' +
            '  m_AnimatorParameters: []\n' +
            '  m_AnimatorLayers:\n' +
            '  - serializedVersion: 5\n' +
            '    m_Name: Base Layer\n' +
            '    m_StateMachine: {fileID: 110700000}\n' +
            '    m_Mask: {fileID: 0}\n' +
            '    m_Motions: []\n' +
            '    m_Behaviours: []\n' +
            '    m_BlendingMode: 0\n' +
            '    m_SyncedLayerIndex: -1\n' +
            '    m_DefaultWeight: 0\n' +
            '    m_IKPass: 0\n' +
            '    m_SyncedLayerAffectsTiming: 0\n' +
            '    m_Controller: {fileID: 9100000}\n' +
            '--- !u!1107 &110700000\nAnimatorStateMachine:\n' +
            '  m_ObjectHideFlags: 1\n' +
            '  m_CorrespondingSourceObject: {fileID: 0}\n' +
            '  m_PrefabInstance: {fileID: 0}\n' +
            '  m_PrefabAsset: {fileID: 0}\n' +
            '  m_Name: Base Layer\n' +
            '  m_ChildStates:\n' +
            '  - serializedVersion: 1\n' +
            '    m_State: {fileID: 110200000}\n' +
            '    m_Position: {x: 240, y: 120, z: 0}\n' +
            '  m_ChildStateMachines: []\n' +
            '  m_AnyStateTransitions: []\n' +
            '  m_EntryTransitions: []\n' +
            '  m_StateMachineTransitions: {}\n' +
            '  m_StateMachineBehaviours: []\n' +
            '  m_AnyStatePosition: {x: 50, y: 20, z: 0}\n' +
            '  m_EntryPosition: {x: 50, y: 120, z: 0}\n' +
            '  m_ExitPosition: {x: 800, y: 120, z: 0}\n' +
            '  m_ParentStateMachinePosition: {x: 800, y: 20, z: 0}\n' +
            '  m_DefaultState: {fileID: 110200000}\n' +
            '--- !u!1102 &110200000\nAnimatorState:\n' +
            '  m_ObjectHideFlags: 1\n' +
            '  m_CorrespondingSourceObject: {fileID: 0}\n' +
            '  m_PrefabInstance: {fileID: 0}\n' +
            '  m_PrefabAsset: {fileID: 0}\n' +
            '  m_Name: SpriteAnimation\n' +
            '  m_Speed: 1\n' +
            '  m_CycleOffset: 0\n' +
            '  m_Transitions: []\n' +
            '  m_StateMachineBehaviours: []\n' +
            '  m_Position: {x: 50, y: 50, z: 0}\n' +
            '  m_IKOnFeet: 0\n' +
            '  m_WriteDefaultValues: 1\n' +
            '  m_Mirror: 0\n' +
            '  m_SpeedParameterActive: 0\n' +
            '  m_MirrorParameterActive: 0\n' +
            '  m_CycleOffsetParameterActive: 0\n' +
            '  m_TimeParameterActive: 0\n' +
            '  m_Motion: {fileID: 7400000}\n' +
            '  m_Tag:\n' +
            '  m_SpeedParameter:\n' +
            '  m_MirrorParameter:\n' +
            '  m_CycleOffsetParameter:\n' +
            '  m_TimeParameter:\n';
    },

    _buildUnityAnimClip: function () {
        var self = this;
        var duration = self._frames.length / self._fps;
        var keyframes = [];

        self._frames.forEach(function (f, i) {
            keyframes.push({
                time: i / self._fps,
                value: { fileID: 0, guid: '', type: 3 },
                inSlope: { x: 0, y: 0, z: 0, w: 0 },
                outSlope: { x: 0, y: 0, z: 0, w: 0 },
                tangentMode: 0
            });
        });

        // 简化的 Unity AnimationClip YAML
        var yaml = '%YAML 1.1\n%TAG !u! tag:unity3d.com,2011:\n' +
            '--- !u!74 &7400000\nAnimationClip:\n' +
            '  m_ObjectHideFlags: 0\n' +
            '  m_CorrespondingSourceObject: {fileID: 0}\n' +
            '  m_PrefabInstance: {fileID: 0}\n' +
            '  m_PrefabAsset: {fileID: 0}\n' +
            '  m_Name: SpriteAnimation\n' +
            '  serializedVersion: 6\n' +
            '  m_Legacy: 0\n' +
            '  m_Compressed: 0\n' +
            '  m_UseHighQualityCurve: 1\n' +
            '  m_RotationCurves: []\n' +
            '  m_CompressedRotationCurves: []\n' +
            '  m_EulerCurves: []\n' +
            '  m_PositionCurves: []\n' +
            '  m_ScaleCurves: []\n' +
            '  m_FloatCurves: []\n' +
            '  m_PPtrCurves:\n' +
            '  - curve:\n';

        keyframes.forEach(function (k) {
            yaml += '    - time: ' + k.time.toFixed(6) + '\n' +
                '      value: {fileID: 0, guid: 00000000000000000000000000000000, type: 0}\n' +
                '      inSlope: {x: 0, y: 0, z: 0, w: 0}\n' +
                '      outSlope: {x: 0, y: 0, z: 0, w: 0}\n' +
                '      tangentMode: 0\n';
        });

        yaml += '    attribute: m_Sprite\n' +
            '    path:\n' +
            '    classID: 212\n' +
            '    script: {fileID: 0}\n' +
            '  m_SampleRate: ' + self._fps + '\n' +
            '  m_WrapMode: ' + (self._loop ? '0' : '1') + '\n' +
            '  m_Bounds:\n' +
            '    m_Center: {x: 0, y: 0, z: 0}\n' +
            '    m_Extent: {x: 0, y: 0, z: 0}\n' +
            '  m_ClipBindingConstant:\n' +
            '    genericBindings: []\n' +
            '    pptrCurveMapping: []\n' +
            '  m_AnimationClipSettings:\n' +
            '    serializedVersion: 2\n' +
            '    m_AdditiveReferencePoseClip: {fileID: 0}\n' +
            '    m_AdditiveReferencePoseTime: 0\n' +
            '    m_StartTime: 0\n' +
            '    m_StopTime: ' + duration.toFixed(6) + '\n' +
            '    m_OrientationOffsetY: 0\n' +
            '    m_Level: 0\n' +
            '    m_CycleOffset: 0\n' +
            '    m_HasAdditiveReferencePose: 0\n' +
            '    m_LoopTime: ' + (self._loop ? '1' : '0') + '\n' +
            '    m_LoopBlend: 0\n' +
            '    m_LoopBlendOrientation: 0\n' +
            '    m_LoopBlendPositionY: 0\n' +
            '    m_LoopBlendPositionXZ: 0\n' +
            '    m_KeepOriginalOrientation: 0\n' +
            '    m_KeepOriginalPositionY: 1\n' +
            '    m_KeepOriginalPositionXZ: 0\n' +
            '    m_HeightFromFeet: 0\n' +
            '    m_Mirror: 0\n' +
            '  m_EditorCurves: []\n' +
            '  m_EulerEditorCurves: []\n' +
            '  m_HasGenericRootTransform: 0\n' +
            '  m_HasMotionFloatCurves: 0\n' +
            '  m_Events: []\n';

        return yaml;
    },

    destroy: function () {
        this._stop();
        this._frames = [];
        this._currentFrame = 0;
        Utils.resetFileInput('saFileInput');
        Utils.hideElement('saWorkspace');
        Utils.hideElement('saExportBar');
        Utils.setStatus('saStatus', '');
        var list = document.getElementById('saFrameList');
        if (list) list.innerHTML = '';
        if (this._ctx) this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    }
});
