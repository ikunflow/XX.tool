// ============================================================
// 🐟 鱼塘页 (Fish Page) 核心逻辑
// ============================================================

const FISH_POSTS_PATH = 'toolbox/v2/fish_posts';
let fishPosts = [];

// SHA-256 纯 JS 算法实现（兼容非安全上下文及本地 file:/// 协议）
function sha256(ascii) {
    function rightRotate(value, amount) {
        return (value >>> amount) | (value << (32 - amount));
    }
    
    var mathPow = Math.pow;
    var maxWord = mathPow(2, 32);
    var lengthProperty = 'length';
    var i, j;

    var result = '';
    var words = [];
    var asciiLength = ascii[lengthProperty];
    var hash = sha256.h = sha256.h || [];
    var k = sha256.k = sha256.k || [];
    var primeCounter = k[lengthProperty];

    var isPrime = {};
    for (var candidate = 2; primeCounter < 64; candidate++) {
        if (!isPrime[candidate]) {
            for (i = 0; i < 313; i += candidate) {
                isPrime[i] = 1;
            }
            hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
            k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
        }
    }
    
    ascii += '\x80';
    while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
    for (i = 0; i < ascii[lengthProperty]; i++) {
        var charCode = ascii.charCodeAt(i);
        if (charCode >> 8) return '';
        words[i >> 2] |= charCode << ((3 - i % 4) * 8);
    }
    words[words[lengthProperty]] = ((asciiLength * 8) / maxWord) | 0;
    words[words[lengthProperty]] = (asciiLength * 8);
    
    for (j = 0; j < words[lengthProperty];) {
        var w = words.slice(j, j += 16);
        var oldHash = hash.slice(0);
        hash = hash.slice(0, 8);
        
        for (i = 0; i < 64; i++) {
            var wItem = w[i];
            if (i >= 16) {
                var w15 = w[i - 15], w2 = w[i - 2];
                var s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
                var s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
                wItem = w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
            }
            
            var a = hash[0], e = hash[4];
            var temp1 = (hash[7] + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) + ((e & hash[5]) ^ (~e & hash[6])) + k[i] + (wItem | 0)) | 0;
            var temp2 = ((rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]))) | 0;
            
            hash = [(temp1 + temp2) | 0].concat(hash);
            hash[4] = (hash[4] + temp1) | 0;
            hash.length = 8;
        }
        
        for (i = 0; i < 8; i++) {
            hash[i] = (hash[i] + oldHash[i]) | 0;
        }
    }
    
    for (i = 0; i < 8; i++) {
        var word = hash[i];
        if (word < 0) word += maxWord;
        result += word.toString(16).padStart(8, '0');
    }
    return result;
}

// 弹窗控制
function openFishPasswordModal() {
    const modal = document.getElementById('fishPasswordModal');
    const input = document.getElementById('fishPasswordInput');
    if (modal) {
        modal.classList.add('open');
        modal.style.display = 'flex';
    }
    if (input) {
        input.value = '';
        input.focus();
    }
}

function closeFishPasswordModal() {
    const modal = document.getElementById('fishPasswordModal');
    if (modal) {
        modal.classList.remove('open');
        setTimeout(() => { modal.style.display = 'none'; }, 300);
    }
}

function submitFishPassword() {
    const input = document.getElementById('fishPasswordInput');
    if (!input) return;
    const pwd = input.value.trim();
    if (!pwd) {
        alert('请输入密码');
        return;
    }

    if (pwd === '66668888') {
        closeFishPasswordModal();
        switchView('fish');
    } else {
        alert('密码错误！');
        input.value = '';
        input.focus();
    }
}

// 监听 Enter 键提交密码
document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('fishPasswordModal');
    if (modal && modal.classList.contains('open') && e.key === 'Enter') {
        submitFishPassword();
    }
});

// 初始化 🐟页 数据库监听
function initFishDatabase() {
    if (isFirebaseConfigured()) {
        db.ref(FISH_POSTS_PATH).on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                if (Array.isArray(data)) {
                    fishPosts = data.filter(Boolean);
                } else if (typeof data === 'object') {
                    fishPosts = Object.keys(data).map(key => ({
                        id: key,
                        ...data[key]
                    }));
                }
            } else {
                fishPosts = [];
            }
            // 按日期倒序
            fishPosts.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
            renderFishPostsUI();
        }, (error) => {
            console.error("Firebase 🐟数据监听失败，降级本地存储:", error);
            initFishLocalFallback();
        });
    } else {
        initFishLocalFallback();
    }
}

function initFishLocalFallback() {
    const local = localStorage.getItem('toolbox_v2_fish_posts');
    if (local) {
        try {
            fishPosts = JSON.parse(local);
        } catch (e) {
            fishPosts = [];
        }
    }
    fishPosts.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    renderFishPostsUI();
}

// 渲染文章列表
function renderFishPostsUI() {
    const container = document.getElementById('fishPostsContainer');
    if (!container) return;
    
    if (fishPosts.length === 0) {
        container.innerHTML = `<div style="text-align:center; color: var(--text-muted); font-size: 13px; padding: 20px 0;">🐟 目前还没有发布任何文章，快去发布吧~</div>`;
        return;
    }
    
    container.innerHTML = '<div class="article-list"></div>';
    const listDiv = container.querySelector('.article-list');
    
    fishPosts.forEach(post => {
        const card = document.createElement('div');
        card.className = 'article-item-card';
        
        // 渲染 Markdown
        let renderedHtml = '';
        try {
            renderedHtml = marked.parse(post.content || '');
        } catch (e) {
            renderedHtml = escapeHtml(post.content || '');
        }
        
        card.innerHTML = `
            <div class="article-item-header">
                <div>
                    <div class="article-item-title">${escapeHtml(post.title || '未命名文章')}</div>
                    <div class="article-item-date">📅 ${escapeHtml(post.date || '')}</div>
                </div>
            </div>
            <button class="article-item-delete" onclick="deleteFishPost('${post.id}')" title="删除文章">✕</button>
            <div class="article-item-body" style="margin-top: 10px;">${renderedHtml}</div>
        `;
        listDiv.appendChild(card);
    });
}

// 发布文章
async function submitNewPost() {
    const titleInput = document.getElementById('postTitle');
    const dateInput = document.getElementById('postDate');
    const contentInput = document.getElementById('postContent');
    
    if (!titleInput || !dateInput || !contentInput) return;
    
    const title = titleInput.value.trim();
    const date = dateInput.value;
    const content = contentInput.value.trim();
    
    if (!title || !date || !content) {
        alert('标题、日期和内容均不能为空！');
        return;
    }
    
    const newPost = {
        id: 'post_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        title,
        date,
        content
    };
    
    if (isFirebaseConfigured()) {
        try {
            await db.ref(`${FISH_POSTS_PATH}/${newPost.id}`).set(newPost);
            titleInput.value = '';
            contentInput.value = '';
            // 保持当前日期为默认
            dateInput.valueAsDate = new Date();
        } catch (e) {
            alert('云端发布失败: ' + e.message);
        }
    } else {
        fishPosts.unshift(newPost);
        localStorage.setItem('toolbox_v2_fish_posts', JSON.stringify(fishPosts));
        renderFishPostsUI();
        titleInput.value = '';
        contentInput.value = '';
        dateInput.valueAsDate = new Date();
    }
}

// 删除文章
async function deleteFishPost(postId) {
    if (!confirm('确定要删除这篇文章吗？')) return;
    
    if (isFirebaseConfigured()) {
        try {
            await db.ref(`${FISH_POSTS_PATH}/${postId}`).remove();
        } catch (e) {
            alert('云端删除失败: ' + e.message);
        }
    } else {
        fishPosts = fishPosts.filter(p => p.id !== postId);
        localStorage.setItem('toolbox_v2_fish_posts', JSON.stringify(fishPosts));
        renderFishPostsUI();
    }
}

// ============================================================
// 📺 视频直通车引擎
// ============================================================
const presetVideos = [
    { platform: 'bilibili', title: '【经典】Bad Apple!! 影绘原版高清', videoId: 'BV1xx411c7rr' },
    { platform: 'bilibili', title: '【原神】璃月港印象——绝美中国风交响乐', videoId: 'BV1Yy4y1p7zG' },
    { platform: 'youtube', title: 'Rick Astley - Never Gonna Give You Up (Official Music Video)', videoId: 'dQw4w9WgXcQ' },
    { platform: 'acfun', title: '【A站经典】万物皆可AcFun！极乐净土宅舞', videoId: '31688538' }
];

// 解析并播放视频
function loadVideo(platform, videoId) {
    const playerContainer = document.getElementById('videoPlayerContainer');
    if (!playerContainer) return;
    
    let iframeSrc = '';
    if (platform === 'youtube') {
        iframeSrc = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    } else if (platform === 'bilibili') {
        // 增加 high_quality=1 和 as_wide=1 参数以实现高画质和宽屏，并开启 allowfullscreen
        iframeSrc = `//player.bilibili.com/player.html?bvid=${videoId}&page=1&high_quality=1&as_wide=1&autoplay=1`;
    } else if (platform === 'acfun') {
        iframeSrc = `https://www.acfun.cn/player/ac${videoId}`;
    }
    
    if (iframeSrc) {
        playerContainer.innerHTML = `
            <iframe src="${iframeSrc}" 
                    scrolling="no" 
                    border="0" 
                    frameborder="no" 
                    framespacing="0" 
                    allowfullscreen="true"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
            </iframe>
        `;
    } else {
        playerContainer.innerHTML = `<div class="player-placeholder">❌ 视频加载失败</div>`;
    }
}

// 输入链接解析播放
function loadUserVideo() {
    const input = document.getElementById('videoUrlInput');
    if (!input) return;
    const url = input.value.trim();
    if (!url) {
        alert('请输入视频链接或ID');
        return;
    }
    
    // 1. 尝试匹配 Bilibili
    const bvMatch = url.match(/(BV[a-zA-Z0-9]{10})/i);
    if (bvMatch) {
        loadVideo('bilibili', bvMatch[1]);
        return;
    }
    
    // 2. 尝试匹配 YouTube
    const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    if (ytMatch) {
        loadVideo('youtube', ytMatch[1]);
        return;
    }
    
    // 3. 尝试匹配 AcFun
    const acMatch = url.match(/ac([0-9]+)/i);
    if (acMatch) {
        loadVideo('acfun', acMatch[1]);
        return;
    }
    
    // 4. 通用嵌入处理（如果是直接 iframe 或者常规 embed 链接）
    if (/^https?:\/\//i.test(url)) {
        const playerContainer = document.getElementById('videoPlayerContainer');
        if (playerContainer) {
            playerContainer.innerHTML = `
                <iframe src="${url}" 
                        scrolling="yes" 
                        border="0" 
                        frameborder="no" 
                        framespacing="0" 
                        allowfullscreen="true">
                </iframe>
            `;
        }
    } else {
        alert('无法解析该视频链接。请输入包含 Bilibili BV号、YouTube视频ID 或 AcFun ac号 的地址。');
    }
}

// 渲染预设视频列表
function renderPresetVideos() {
    const container = document.querySelector('.video-presets-grid');
    if (!container) return;
    
    container.innerHTML = '';
    presetVideos.forEach(v => {
        const card = document.createElement('div');
        card.className = 'video-preset-card';
        card.onclick = () => loadVideo(v.platform, v.videoId);
        
        let platformLabel = v.platform.toUpperCase();
        let badgeClass = v.platform;
        if (v.platform === 'bilibili') platformLabel = 'Bilibili';
        if (v.platform === 'acfun') platformLabel = 'AcFun';
        if (v.platform === 'youtube') platformLabel = 'YouTube';
        
        card.innerHTML = `
            <span class="platform-badge ${badgeClass}">${platformLabel}</span>
            <span class="video-title" title="${escapeHtml(v.title)}">${escapeHtml(v.title)}</span>
        `;
        container.appendChild(card);
    });
}

// ============================================================
// 🐟 渲染和生命周期入口
// ============================================================

function switchFishTab(tabId) {
    // 隐藏所有 Tab Content
    const panes = document.querySelectorAll('.fish-tab-pane');
    panes.forEach(pane => pane.style.display = 'none');
    
    // 取消所有按钮 active 状态
    const btns = document.querySelectorAll('.fish-tab-btn');
    btns.forEach(btn => btn.classList.remove('active'));

    // 显示对应的 Tab 和激活按钮
    const targetPane = document.getElementById('fishTab' + tabId.charAt(0).toUpperCase() + tabId.slice(1));
    const targetBtn = document.getElementById('btnFishTab' + tabId.charAt(0).toUpperCase() + tabId.slice(1));
    
    if (targetPane) targetPane.style.display = 'block';
    if (targetBtn) targetBtn.classList.add('active');
}

function renderFishPage() {
    // 默认设置文章日期的输入框为今天
    const dateInput = document.getElementById('postDate');
    if (dateInput) {
        dateInput.valueAsDate = new Date();
    }
    // 加载文章和视频卡片
    initFishDatabase();
    renderPresetVideos();
    
    // 默认切换到“已发布文章”区
    switchFishTab('posts');
}
