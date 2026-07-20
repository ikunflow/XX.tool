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
        alert('please input');
        return;
    }

    if (pwd === '68') {
        closeFishPasswordModal();
        switchView('fish');
    } else {
        alert('error');
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

let currentBlogCategory = null;
let currentBlogTag = null;

// 渲染博客侧边栏（分类和标签）
function renderBlogSidebar() {
    const categoryList = document.getElementById('blogCategoryList');
    const tagCloud = document.getElementById('blogTagCloud');
    if (!categoryList || !tagCloud) return;

    const categories = new Set();
    const tags = new Set();
    
    fishPosts.forEach(post => {
        if (post.category) categories.add(post.category);
        if (post.tags && Array.isArray(post.tags)) {
            post.tags.forEach(t => tags.add(t));
        }
    });

    // 渲染分类
    categoryList.innerHTML = `<li class="${currentBlogCategory === null ? 'active' : ''}" onclick="filterBlog('category', null)">全部</li>`;
    categories.forEach(cat => {
        categoryList.innerHTML += `<li class="${currentBlogCategory === cat ? 'active' : ''}" onclick="filterBlog('category', '${escapeHtml(cat)}')">${escapeHtml(cat)}</li>`;
    });

    // 渲染标签
    tagCloud.innerHTML = `<div class="blog-tag ${currentBlogTag === null ? 'active' : ''}" onclick="filterBlog('tag', null)">全部</div>`;
    tags.forEach(tag => {
        tagCloud.innerHTML += `<div class="blog-tag ${currentBlogTag === tag ? 'active' : ''}" onclick="filterBlog('tag', '${escapeHtml(tag)}')">${escapeHtml(tag)}</div>`;
    });
}

function filterBlog(type, value) {
    if (type === 'category') {
        currentBlogCategory = value;
        // 切换分类时重置标签
        currentBlogTag = null;
    } else if (type === 'tag') {
        currentBlogTag = value;
    }
    renderFishPostsUI();
}

// 渲染文章列表
function renderFishPostsUI() {
    renderBlogSidebar();
    
    const container = document.getElementById('fishPostsContainer');
    if (!container) return;
    
    let filteredPosts = fishPosts;
    if (currentBlogCategory) {
        filteredPosts = filteredPosts.filter(p => p.category === currentBlogCategory);
    }
    if (currentBlogTag) {
        filteredPosts = filteredPosts.filter(p => p.tags && p.tags.includes(currentBlogTag));
    }
    
    if (filteredPosts.length === 0) {
        container.innerHTML = `<div style="text-align:center; color: var(--text-muted); font-size: 13px; padding: 40px 0;">空空如也~</div>`;
        return;
    }
    
    // 按是否置顶排序（置顶在前），日期顺序已由全局保持
    filteredPosts.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
    
    container.innerHTML = '';
    
    filteredPosts.forEach(post => {
        const card = document.createElement('div');
        card.className = 'blog-card';
        
        // 提取纯文本作为摘要
        let summaryText = (post.content || '').substring(0, 150).replace(/[#*`_>\[\]\(\)]/g, '');
        if (post.content && post.content.length > 150) summaryText += '...';
        
        // 渲染完整的 Markdown
        let renderedHtml = '';
        try {
            renderedHtml = marked.parse(post.content || '');
        } catch (e) {
            renderedHtml = escapeHtml(post.content || '');
        }
        
        let tagsHtml = '';
        if (post.tags && post.tags.length > 0) {
            tagsHtml = post.tags.map(t => `<span style="background:var(--tag-bg); color:var(--accent-color); padding:2px 6px; border-radius:4px;">${escapeHtml(t)}</span>`).join('');
        }
        
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <h3 class="blog-card-title" onclick="this.closest('.blog-card').classList.toggle('expanded')" title="点击展开/收起全文">${post.isPinned ? '📌 ' : ''}${escapeHtml(post.title || '未命名文章')}</h3>
                <div class="blog-card-actions">
                    <button onclick="togglePinFishPost('${post.id}')">${post.isPinned ? '取消置顶' : '置顶'}</button>
                    <button onclick="openFishEditor('${post.id}')">编辑</button>
                    <button class="del-btn" onclick="deleteFishPost('${post.id}')">删除</button>
                </div>
            </div>
            <div class="blog-card-summary" onclick="this.closest('.blog-card').classList.toggle('expanded')" title="点击阅读全文" style="cursor:pointer;">${escapeHtml(summaryText)}</div>
            <div class="blog-card-full-content article-item-body">${renderedHtml}</div>
            <div class="blog-card-footer">
                <div class="blog-card-meta">
                    <span>👤 ${escapeHtml(post.author || '匿名')}</span>
                    <span>📅 ${escapeHtml(post.date || '')}</span>
                    <span>📁 ${escapeHtml(post.category || '未分类')}</span>
                </div>
                <div style="display:flex; gap:5px; font-size:12px;">${tagsHtml}</div>
            </div>
        `;
        container.appendChild(card);
    });
}

// ============================================================
// ✏️ 文章编辑器逻辑
// ============================================================
function openFishEditor(postId = null) {
    const modal = document.getElementById('fishEditorModal');
    if (!modal) return;
    
    const titleInput = document.getElementById('editorTitle');
    const authorInput = document.getElementById('editorAuthor');
    const dateInput = document.getElementById('editorDate');
    const categoryInput = document.getElementById('editorCategory');
    const tagsInput = document.getElementById('editorTags');
    const contentInput = document.getElementById('editorContent');
    const idInput = document.getElementById('editorPostId');
    
    if (postId) {
        const post = fishPosts.find(p => p.id === postId);
        if (post) {
            titleInput.value = post.title || '';
            authorInput.value = post.author || '';
            dateInput.value = post.date || '';
            categoryInput.value = post.category || '';
            tagsInput.value = (post.tags || []).join(', ');
            contentInput.value = post.content || '';
            idInput.value = post.id;
        }
    } else {
        titleInput.value = '';
        authorInput.value = '';
        dateInput.valueAsDate = new Date();
        categoryInput.value = '';
        tagsInput.value = '';
        contentInput.value = '';
        idInput.value = '';
    }
    
    modal.classList.add('open');
    modal.style.display = 'flex';
}

function closeFishEditor() {
    const modal = document.getElementById('fishEditorModal');
    if (modal) {
        modal.classList.remove('open');
        setTimeout(() => { modal.style.display = 'none'; }, 300);
    }
}

function insertEditorSyntax(start, end) {
    const textarea = document.getElementById('editorContent');
    if (!textarea) return;
    
    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const selectedText = textarea.value.substring(startPos, endPos);
    
    const newText = start + selectedText + end;
    textarea.value = textarea.value.substring(0, startPos) + newText + textarea.value.substring(endPos);
    
    textarea.focus();
    textarea.selectionStart = startPos + start.length;
    textarea.selectionEnd = startPos + start.length + selectedText.length;
}

async function saveFishPost() {
    const title = document.getElementById('editorTitle').value.trim();
    const author = document.getElementById('editorAuthor').value.trim() || '匿名';
    const date = document.getElementById('editorDate').value;
    const category = document.getElementById('editorCategory').value.trim() || '未分类';
    const tagsRaw = document.getElementById('editorTags').value;
    const content = document.getElementById('editorContent').value.trim();
    let id = document.getElementById('editorPostId').value;
    
    if (!title || !date || !content) {
        alert('标题、日期和内容均不能为空！');
        return;
    }
    
    const tags = tagsRaw ? tagsRaw.split(/[,，]/).map(t => t.trim()).filter(t => t) : [];
    
    const isNew = !id;
    if (isNew) {
        id = 'post_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    }
    
    const postData = { id, title, author, date, category, tags, content };
    
    if (isFirebaseConfigured()) {
        try {
            await db.ref(`${FISH_POSTS_PATH}/${id}`).set(postData);
            closeFishEditor();
        } catch (e) {
            alert('云端保存失败: ' + e.message);
        }
    } else {
        if (isNew) {
            fishPosts.unshift(postData);
        } else {
            const index = fishPosts.findIndex(p => p.id === id);
            if (index !== -1) fishPosts[index] = postData;
        }
        localStorage.setItem('toolbox_v2_fish_posts', JSON.stringify(fishPosts));
        renderFishPostsUI();
        closeFishEditor();
    }
}

// 切换置顶状态
async function togglePinFishPost(postId) {
    const post = fishPosts.find(p => p.id === postId);
    if (!post) return;
    post.isPinned = !post.isPinned;
    
    if (isFirebaseConfigured()) {
        try {
            await db.ref(`${FISH_POSTS_PATH}/${postId}`).update({ isPinned: post.isPinned });
        } catch (e) {
            alert('云端置顶操作失败: ' + e.message);
        }
    } else {
        localStorage.setItem('toolbox_v2_fish_posts', JSON.stringify(fishPosts));
        renderFishPostsUI();
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
    
    // 初始化大A监控
    initStockMonitor();
    
    // 初始化市场新闻
    fetchMarketNews();
    
    // 初始化市场情绪检测
    initMarketSentiment();
    
    // 初始化音乐播放器
    initMusicPlayer();
}

// ============================================================
// 📈 大A监控引擎 (A-Share Monitor)
// ============================================================
let stockWatchList = ['sh513310']; // 默认只保留 sh513310
let stockMonitorInterval = null;

function initStockMonitor() {
    const savedStocks = localStorage.getItem('toolbox_v2_stocks');
    if (savedStocks) {
        try {
            stockWatchList = JSON.parse(savedStocks);
        } catch (e) {}
    }
    fetchStockData();
    if (stockMonitorInterval) clearInterval(stockMonitorInterval);
    stockMonitorInterval = setInterval(fetchStockData, 10000); // 10秒刷新
}

function fetchStockData() {
    if (stockWatchList.length === 0) {
        document.getElementById('stockMonitorList').innerHTML = '<div style="text-align:center; color:#8c8c8c; font-size:12px; padding: 20px 0;">列表为空，请添加</div>';
        return;
    }
    
    // 采用腾讯财经 API (JSONP) 解决跨域
    const scriptId = 'stock_jsonp_script';
    let oldScript = document.getElementById(scriptId);
    if (oldScript) oldScript.remove();
    
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://qt.gtimg.cn/q=${stockWatchList.join(',')}&_t=${Date.now()}`;
    script.charset = 'gbk';
    
    script.onload = () => {
        renderStocks();
    };
    script.onerror = () => {
        document.getElementById('stockMonitorList').innerHTML = '<div style="text-align:center; color:#ff4d4f; font-size:12px; padding: 20px 0;">网络错误，获取失败</div>';
    };
    document.head.appendChild(script);
}

function renderStocks() {
    const container = document.getElementById('stockMonitorList');
    if (!container) return;
    
    container.innerHTML = '';
    
    stockWatchList.forEach(code => {
        const varName = `v_${code}`;
        if (typeof window[varName] !== 'string') return;
        
        const data = window[varName].split('~');
        if (data.length < 35) return;
        
        const name = data[1]; // 名称
        const price = parseFloat(data[3]).toFixed(2); // 当前价
        const change = parseFloat(data[31]).toFixed(2); // 涨跌额
        const changePercent = parseFloat(data[32]).toFixed(2); // 涨跌幅
        const openPrice = parseFloat(data[5]);
        const highPrice = parseFloat(data[33]);
        const lowPrice = parseFloat(data[34]);
        const currentPrice = parseFloat(data[3]);
        
        let colorClass = 'stock-flat';
        let strokeColor = '#8c8c8c';
        let prefix = '';
        if (change > 0) {
            colorClass = 'stock-up';
            strokeColor = '#e84749';
            prefix = '+';
        } else if (change < 0) {
            colorClass = 'stock-down';
            strokeColor = '#49aa19';
        }
        
        // 绘制五个点的简单 SVG 走势折线
        let svgPath = "";
        if (highPrice === lowPrice) {
            svgPath = "0,20 25,20 50,20 75,20 100,20";
        } else {
            const scaleY = (val) => 35 - ((val - lowPrice) / (highPrice - lowPrice)) * 30;
            const p1 = scaleY(openPrice);
            const p5 = scaleY(currentPrice);
            let p2, p3, p4;
            if (currentPrice >= openPrice) {
                // 涨：开 -> 低 -> 中 -> 高 -> 现价
                p2 = scaleY(lowPrice);
                p3 = scaleY((lowPrice + highPrice) / 2);
                p4 = scaleY(highPrice);
            } else {
                // 跌：开 -> 高 -> 中 -> 低 -> 现价
                p2 = scaleY(highPrice);
                p3 = scaleY((lowPrice + highPrice) / 2);
                p4 = scaleY(lowPrice);
            }
            svgPath = `0,${p1} 25,${p2} 50,${p3} 75,${p4} 100,${p5}`;
        }
        
        const chartHtml = `
            <svg class="stock-chart" viewBox="0 0 100 40" preserveAspectRatio="none">
                <polyline points="${svgPath}" fill="none" stroke="${strokeColor}" stroke-width="1.5" stroke-linejoin="round"/>
            </svg>
        `;
        
        const item = document.createElement('div');
        item.className = 'stock-item';
        item.innerHTML = `
            <button class="stock-del-btn" onclick="removeStock('${code}')" title="删除">✕</button>
            <div class="stock-item-top">
                <div>
                    <div class="stock-name">${escapeHtml(name)}</div>
                    <div class="stock-code">${escapeHtml(code)}</div>
                </div>
                <div style="text-align:right;">
                    <div class="stock-price ${colorClass}">${price}</div>
                    <div class="stock-change ${colorClass}">${prefix}${change} (${prefix}${changePercent}%)</div>
                </div>
            </div>
            ${chartHtml}
        `;
        container.appendChild(item);
    });
}

function addNewStock() {
    let input = prompt("请输入股票或基金代码（需加前缀，如 sh600519, sz000858）：");
    if (!input) return;
    input = input.trim().toLowerCase();
    
    // 简单校验
    if (!/^(sh|sz)[0-9]{6}$/.test(input)) {
        alert("格式错误！正确格式示例：sh600519 或 sz000858");
        return;
    }
    
    if (stockWatchList.includes(input)) {
        alert("该股票已在监控列表中！");
        return;
    }
    
    stockWatchList.push(input);
    localStorage.setItem('toolbox_v2_stocks', JSON.stringify(stockWatchList));
    document.getElementById('stockMonitorList').innerHTML = '<div style="text-align:center; color:#8c8c8c; font-size:12px; padding: 20px 0;">加载中...</div>';
    fetchStockData();
}

function removeStock(code) {
    if (!confirm(`确定要移除 ${code} 吗？`)) return;
    stockWatchList = stockWatchList.filter(c => c !== code);
    localStorage.setItem('toolbox_v2_stocks', JSON.stringify(stockWatchList));
    renderStocks();
}

// ============================================================
// 📰 市场动向新闻 (Market News)
// ============================================================
let newsRefreshInterval = null;

function fetchMarketNews() {
    const container = document.getElementById('marketNewsList');
    if (container && container.innerHTML.includes('加载中') === false && container.innerHTML.trim() !== '') {
        // Optional: show a small spinner or just leave as is while fetching
    }
    
    const scriptId = 'news_jsonp_script';
    let oldScript = document.getElementById(scriptId);
    if (oldScript) oldScript.remove();
    
    // 使用新浪财经 7x24 小时全球实时财经新闻滚动 API
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://feed.mix.sina.com.cn/api/roll/get?pageid=153&lid=2509&num=15&callback=renderMarketNews&_t=${Date.now()}`;
    
    script.onerror = () => {
        if (container) {
            container.innerHTML = '<div style="text-align:center; color:var(--danger-color); font-size:12px; padding: 20px 0;">新闻加载失败</div>';
        }
    };
    
    document.head.appendChild(script);
    
    if (!newsRefreshInterval) {
        newsRefreshInterval = setInterval(fetchMarketNews, 60000); // 每60秒刷新一次新闻
    }
}

// ============================================================
// 🤖 AI 助手区 (AI Chat Aggregator)
// ============================================================

const AI_PLATFORMS = {
    gemini: {
        name: "Gemini",
        url: "https://gemini.google.com/"
    },
    doubao: {
        name: "豆包 (Doubao)",
        url: "https://www.doubao.com/chat/"
    },
    kimi: {
        name: "Kimi",
        url: "https://kimi.moonshot.cn/"
    },
    deepseek: {
        name: "DeepSeek",
        url: "https://chat.deepseek.com/"
    }
};

let currentAIId = 'gemini';

function switchAIPanel(aiId, menuItemElement) {
    if (!AI_PLATFORMS[aiId]) return;
    
    currentAIId = aiId;
    const aiData = AI_PLATFORMS[aiId];
    
    // 更新标题
    document.getElementById('aiCurrentName').innerText = aiData.name;
    
    // 更新 Iframe
    document.getElementById('aiFrame').src = aiData.url;
    
    // 更新左侧高亮状态
    if (menuItemElement) {
        document.querySelectorAll('.ai-menu-item').forEach(el => el.classList.remove('active'));
        menuItemElement.classList.add('active');
    }
}

function openCurrentAIExternal() {
    if (AI_PLATFORMS[currentAIId]) {
        window.open(AI_PLATFORMS[currentAIId].url, '_blank');
    }
}

// JSONP 回调
function renderMarketNews(response) {
    const container = document.getElementById('marketNewsList');
    if (!container) return;
    
    if (!response || !response.result || !response.result.data) {
        container.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:12px; padding: 20px 0;">暂无新闻</div>';
        return;
    }
    
    const newsList = response.result.data;
    container.innerHTML = '';
    
    newsList.forEach(news => {
        // ctime 是秒级时间戳
        const date = new Date(parseInt(news.ctime) * 1000);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const timeStr = `${hours}:${minutes}`;
        
        const a = document.createElement('a');
        a.className = 'news-item';
        a.href = news.url;
        a.target = '_blank'; // 新窗口打开
        
        a.innerHTML = `
            <div class="news-title" title="${escapeHtml(news.title)}">${escapeHtml(news.title)}</div>
            <div class="news-time">🕒 ${timeStr}</div>
        `;
        
        container.appendChild(a);
    });
}

// ============================================================
// ============================================================
// 🎵 音乐空间 (Music Player)
// ============================================================
const MUSIC_CLOUD_PATH = 'toolbox/v2/music_playlist';
let musicCloudEnabled = true;

function isMusicCloudEnabled() {
    return musicCloudEnabled && isFirebaseConfigured();
}

function updateMusicCloudStatus(status) {
    const el = document.getElementById('musicSyncStatus');
    if (!el) return;
    if (status === 'synced') {
        el.textContent = '已同步';
        el.className = 'audiobook-sync-status synced';
    } else if (status === 'syncing') {
        el.textContent = '同步中';
        el.className = 'audiobook-sync-status syncing';
    } else {
        el.textContent = isFirebaseConfigured() ? '未连接' : '未配置';
        el.className = 'audiobook-sync-status offline';
    }
}

function toggleMusicCloud(enabled) {
    musicCloudEnabled = enabled;
    localStorage.setItem('toolbox_v2_music_cloud_enabled', enabled ? '1' : '0');
    if (enabled) {
        syncMusicPlaylistToCloud();
        startMusicCloudSync();
    }
    updateMusicCloudStatus(enabled ? 'synced' : null);
}

function initMusicPlayer() {
    // 恢复云端同步开关状态
    const savedCloudEnabled = localStorage.getItem('toolbox_v2_music_cloud_enabled');
    if (savedCloudEnabled !== null) {
        musicCloudEnabled = savedCloudEnabled === '1';
    }
    const checkbox = document.getElementById('musicCloudCheckbox');
    if (checkbox) checkbox.checked = musicCloudEnabled;

    // 优先从云端读取，失败则降级本地
    if (isMusicCloudEnabled()) {
        syncMusicPlaylistFromCloud().then(() => {
            startMusicCloudSync();
        }).catch(() => {
            loadLocalMusicPlaylist();
        });
    } else {
        loadLocalMusicPlaylist();
    }
    updateMusicCloudStatus(isMusicCloudEnabled() ? 'synced' : null);
}

function loadLocalMusicPlaylist() {
    const savedPlaylist = localStorage.getItem('toolbox_v2_music_playlist');
    if (savedPlaylist) {
        renderMusicIframe(savedPlaylist);
    }
}

function addMusicPlaylist() {
    const input = document.getElementById('musicPlaylistInput');
    if (!input) return;
    const val = input.value.trim();
    if (!val) {
        alert("请输入网易云歌单ID或分享链接");
        return;
    }

    // 尝试提取 ID
    let playlistId = val;
    // 匹配如 https://music.163.com/#/playlist?id=3778678 或 id=3778678 等
    const idMatch = val.match(/id=([0-9]+)/) || val.match(/\/playlist\/([0-9]+)/);
    if (idMatch && idMatch[1]) {
        playlistId = idMatch[1];
    } else if (!/^[0-9]+$/.test(val)) {
        alert("无法识别歌单ID，请确保输入正确。");
        return;
    }

    renderMusicIframe(playlistId);
    localStorage.setItem('toolbox_v2_music_playlist', playlistId);

    if (isMusicCloudEnabled()) {
        syncMusicPlaylistToCloud(playlistId);
    }

    input.value = '';
}

function renderMusicIframe(playlistId) {
    const container = document.getElementById('musicPlayerContainer');
    if (!container) return;

    container.innerHTML = `
        <iframe frameborder="no" border="0" marginwidth="0" marginheight="0" width="100%" height="280" 
        src="https://music.163.com/outchain/player?type=0&id=${playlistId}&auto=0&height=280">
        </iframe>
    `;
}

function syncMusicPlaylistToCloud(playlistId) {
    return new Promise((resolve, reject) => {
        if (!isMusicCloudEnabled()) {
            resolve();
            return;
        }
        const id = playlistId || localStorage.getItem('toolbox_v2_music_playlist');
        if (!id) {
            resolve();
            return;
        }
        updateMusicCloudStatus('syncing');
        db.ref(MUSIC_CLOUD_PATH).set({
            playlistId: id,
            updatedAt: Date.now()
        }).then(() => {
            updateMusicCloudStatus('synced');
            resolve();
        }).catch((err) => {
            console.error('音乐云同步失败:', err);
            updateMusicCloudStatus('offline');
            reject(err);
        });
    });
}

function syncMusicPlaylistFromCloud() {
    return new Promise((resolve, reject) => {
        if (!isMusicCloudEnabled()) {
            resolve();
            return;
        }
        updateMusicCloudStatus('syncing');
        db.ref(MUSIC_CLOUD_PATH).once('value').then((snapshot) => {
            const data = snapshot.val();
            if (data && data.playlistId) {
                const localId = localStorage.getItem('toolbox_v2_music_playlist');
                // 云端较新时覆盖本地
                if (data.playlistId !== localId) {
                    localStorage.setItem('toolbox_v2_music_playlist', data.playlistId);
                    renderMusicIframe(data.playlistId);
                }
            }
            updateMusicCloudStatus('synced');
            resolve(data);
        }).catch((err) => {
            console.error('拉取音乐歌单失败:', err);
            updateMusicCloudStatus('offline');
            reject(err);
        });
    });
}

function startMusicCloudSync() {
    if (!isMusicCloudEnabled()) return;
    db.ref(MUSIC_CLOUD_PATH).off('value');
    db.ref(MUSIC_CLOUD_PATH).on('value', (snapshot) => {
        const data = snapshot.val();
        if (data && data.playlistId) {
            const localId = localStorage.getItem('toolbox_v2_music_playlist');
            if (data.playlistId !== localId) {
                localStorage.setItem('toolbox_v2_music_playlist', data.playlistId);
                renderMusicIframe(data.playlistId);
                updateMusicCloudStatus('synced');
            }
        }
    });
}

function forceMusicSyncToCloud() {
    if (!isMusicCloudEnabled()) {
        alert('⚠️ Firebase 未配置或云端同步已关闭');
        return;
    }
    syncMusicPlaylistToCloud();
}

function forceMusicSyncFromCloud() {
    if (!isMusicCloudEnabled()) {
        alert('⚠️ Firebase 未配置或云端同步已关闭');
        return;
    }
    syncMusicPlaylistFromCloud();
}

// ============================================================
// 📊 市场情绪检测 (Market Sentiment Monitor)
// ============================================================
// ============================================================
// 📊 市场情绪检测 (Market Sentiment Monitor)
// ============================================================
let sentimentRefreshInterval = null;

function initMarketSentiment() {
    fetchMarketSentiment();
    if (sentimentRefreshInterval) clearInterval(sentimentRefreshInterval);
    sentimentRefreshInterval = setInterval(fetchMarketSentiment, 60000); // 每分钟刷新
}

async function fetchMarketSentiment() {
    const container = document.getElementById('sentimentMonitorList');
    if (container) {
        container.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:12px; padding: 20px 0;">加载中...</div>';
    }

    try {
        const [aShare, us] = await Promise.all([
            fetchAshareSentiment(),
            fetchUSSentiment()
        ]);
        renderSentiment({ aShare, us });
    } catch (e) {
        console.error('情绪数据获取失败:', e);
        if (container) {
            container.innerHTML = `<div style="text-align:center; color:var(--danger-color); font-size:12px; padding: 20px 0;">获取失败：${e.message || '网络错误'}</div>`;
        }
    }
}

function fetchAshareSentiment() {
    return new Promise((resolve, reject) => {
        const scriptId = 'sentiment_ashare_jsonp_script';
        let oldScript = document.getElementById(scriptId);
        if (oldScript) oldScript.remove();

        const script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://qt.gtimg.cn/q=sh000001,sz399001,sz399006&_t=${Date.now()}`;
        script.charset = 'gbk';

        script.onload = () => {
            try {
                const indices = [
                    parseTencentIndex('v_sh000001'),
                    parseTencentIndex('v_sz399001'),
                    parseTencentIndex('v_sz399006')
                ].filter(Boolean);
                const result = calculateAshareScore(indices);
                if (result) {
                    resolve(result);
                } else {
                    reject(new Error('A股指数数据解析失败'));
                }
            } catch (e) {
                reject(e);
            }
        };
        script.onerror = () => reject(new Error('A股情绪数据获取失败'));
        document.head.appendChild(script);
    });
}

function parseTencentIndex(varName) {
    const str = window[varName];
    if (typeof str !== 'string') return null;
    const parts = str.split('~');
    if (parts.length < 35) return null;
    return {
        name: parts[1],
        price: parseFloat(parts[3]),
        changePercent: parseFloat(parts[32])
    };
}

function calculateAshareScore(indices) {
    if (!indices || indices.length === 0) return null;
    const avgChange = indices.reduce((sum, idx) => sum + idx.changePercent, 0) / indices.length;
    // 映射规则：-3% 对应 0 分，0% 对应 50 分，+3% 对应 100 分
    let score = 50 + (avgChange / 3) * 50;
    score = Math.max(0, Math.min(100, score));
    return {
        score: Math.round(score),
        changePercent: avgChange.toFixed(2),
        indices: indices
    };
}

async function fetchUSSentiment() {
    const res = await fetch('https://production.dataviz.cnn.io/index/fearandgreed/current');
    if (!res.ok) throw new Error('美股情绪数据获取失败');
    const data = await res.json();
    return {
        score: Math.round(data.score),
        rating: data.rating,
        previousClose: Math.round(data.previous_close),
        previousWeek: Math.round(data.previous_1_week),
        previousMonth: Math.round(data.previous_1_month)
    };
}

function getSentimentLevel(score) {
    if (score >= 80) return { label: '极度贪婪', class: 'extreme-greed' };
    if (score >= 60) return { label: '贪婪', class: 'greed' };
    if (score >= 40) return { label: '中性', class: 'neutral' };
    if (score >= 20) return { label: '恐惧', class: 'fear' };
    return { label: '极度恐惧', class: 'extreme-fear' };
}

function renderSentiment(data) {
    const container = document.getElementById('sentimentMonitorList');
    if (!container) return;

    const aShare = data.aShare;
    const us = data.us;
    const aShareLevel = getSentimentLevel(aShare.score);
    const usLevel = getSentimentLevel(us.score);

    container.innerHTML = `
        <div class="sentiment-card sentiment-mini">
            <div class="sentiment-mini-header">
                <span class="sentiment-mini-label">A股</span>
                <span class="sentiment-mini-score ${aShareLevel.class}">${aShareLevel.label} ${aShare.score}</span>
            </div>
            <div class="sentiment-bar">
                <div class="sentiment-bar-fill ${aShareLevel.class}" style="width: ${aShare.score}%"></div>
            </div>
        </div>
        <div class="sentiment-card sentiment-mini">
            <div class="sentiment-mini-header">
                <span class="sentiment-mini-label">美股</span>
                <span class="sentiment-mini-score ${usLevel.class}">${usLevel.label} ${us.score}</span>
            </div>
            <div class="sentiment-bar">
                <div class="sentiment-bar-fill ${usLevel.class}" style="width: ${us.score}%"></div>
            </div>
        </div>
        <div class="sentiment-hint" title="恐惧值说明：0-20 极度恐惧（市场恐慌，可能是机会）；20-40 恐惧（情绪偏空）；40-60 中性；60-80 贪婪（情绪乐观）；80-100 极度贪婪（市场过热，需谨慎）。恐惧值越低代表市场越恐慌，越高代表越贪婪。">
            <span class="sentiment-hint-icon">ℹ️ 恐惧值越低越恐慌，越高越贪婪</span>
        </div>
    `;
}

