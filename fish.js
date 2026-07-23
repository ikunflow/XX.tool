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



// 🖼️ 随机精美壁纸库 (Curated HD Dark Wallpapers)
const FISH_WALLPAPERS = [
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80', // 浩瀚星空
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80', // 海滩落日
    'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1920&q=80', // 深海洋流
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1920&q=80', // 梦幻极光
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=80', // 璀璨星云
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=80', // 壮丽山谷
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1920&q=80', // 晨雾森林
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1920&q=80'  // 寂静雪山
];

let currentWallpaperIndex = -1;

function setRandomFishWallpaper() {
    const page = document.getElementById('fishAppPage');
    if (!page) return;
    let nextIndex;
    do {
        nextIndex = Math.floor(Math.random() * FISH_WALLPAPERS.length);
    } while (nextIndex === currentWallpaperIndex && FISH_WALLPAPERS.length > 1);
    
    currentWallpaperIndex = nextIndex;
    const wallpaperUrl = FISH_WALLPAPERS[currentWallpaperIndex];
    page.style.backgroundImage = `linear-gradient(rgba(18, 18, 22, 0.78), rgba(18, 18, 22, 0.88)), url('${wallpaperUrl}')`;
}

// 初始化 🐟页 数据库监听
function initFishDatabase() {
    setRandomFishWallpaper(); // 随机加载壁纸
    initFishPond(); // 初始化共享鱼塘
    
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
                // 【数据保护】将有效数据备份到本地
                localStorage.setItem('toolbox_v2_fish_posts_backup', JSON.stringify(fishPosts));
            } else {
                // 【数据保护】云端数据为空时，尝试从备份恢复（防止被主页同步误删）
                const backup = localStorage.getItem('toolbox_v2_fish_posts_backup');
                if (backup && JSON.parse(backup).length > 0) {
                    console.warn("⚠️ 云端 Fish 数据为空，启动保护机制从本地备份恢复");
                    fishPosts = JSON.parse(backup);
                    // 将备份数据重新同步到云端
                    fishPosts.forEach(post => {
                        db.ref(`${FISH_POSTS_PATH}/${post.id}`).set(post);
                    });
                } else {
                    fishPosts = [];
                }
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
    const tagCloud = document.getElementById('fishTagsContainer');
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

let zhihuSearchQuery = '';

function onZhihuSearchInput(val) {
    zhihuSearchQuery = (val || '').trim().toLowerCase();
    renderFishPostsUI();
}

function switchZhihuTab(tabName, el) {
    const tabs = document.querySelectorAll('.zhihu-top-tab');
    tabs.forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');

    const stage3d = document.getElementById('zhihu3DStageCard');
    const postsStream = document.getElementById('fishPostsContainer');

    if (tabName === 'recommend') {
        // 推荐页面：优先展示文章，隐藏 3D 水族馆
        if (stage3d) stage3d.style.display = 'none';
        if (postsStream) postsStream.style.display = 'flex';
        renderFishPostsUI();
    } else if (tabName === 'stage3d') {
        // 专属 3D 共享水族馆区域
        if (stage3d) stage3d.style.display = 'block';
        if (postsStream) postsStream.style.display = 'none';
        if (typeof onAquariumResize === 'function') setTimeout(onAquariumResize, 100);
    } else if (tabName === 'hot') {
        if (stage3d) stage3d.style.display = 'none';
        if (postsStream) postsStream.style.display = 'flex';
        renderFishPostsUI();
    }
}

function savePostData(post) {
    if (typeof isFirebaseConfigured === 'function' && isFirebaseConfigured()) {
        db.ref(`${FISH_POSTS_PATH}/${post.id}`).set(post);
    } else {
        localStorage.setItem('toolbox_v2_fish_posts', JSON.stringify(fishPosts));
    }
}

function upvoteZhihuPost(postId, e) {
    if (e) e.stopPropagation();
    const post = fishPosts.find(p => p.id === postId);
    if (!post) return;

    if (!post.upvotes) post.upvotes = Math.floor(Math.random() * 20) + 12;

    if (post.userVoted === 'up') {
        post.userVoted = null;
        post.upvotes = Math.max(0, post.upvotes - 1);
    } else {
        if (post.userVoted === 'down') post.downvotes = Math.max(0, (post.downvotes || 1) - 1);
        post.userVoted = 'up';
        post.upvotes += 1;
    }
    
    savePostData(post);
    renderFishPostsUI();
}

function downvoteZhihuPost(postId, e) {
    if (e) e.stopPropagation();
    const post = fishPosts.find(p => p.id === postId);
    if (!post) return;

    if (post.userVoted === 'down') {
        post.userVoted = null;
    } else {
        if (post.userVoted === 'up') post.upvotes = Math.max(0, (post.upvotes || 1) - 1);
        post.userVoted = 'down';
    }

    savePostData(post);
    renderFishPostsUI();
}

function toggleCommentsSection(postId, e) {
    if (e) e.stopPropagation();
    const section = document.getElementById(`comments_section_${postId}`);
    if (section) {
        section.style.display = section.style.display === 'none' ? 'block' : 'none';
    }
}

function addPostComment(postId, e) {
    if (e) e.preventDefault();
    const input = document.getElementById(`comment_input_${postId}`);
    const nameInput = document.getElementById(`comment_author_${postId}`);
    if (!input) return;

    const content = input.value.trim();
    if (!content) return;

    const author = (nameInput && nameInput.value.trim()) ? nameInput.value.trim() : 'CSON 玩家';
    const post = fishPosts.find(p => p.id === postId);
    if (!post) return;

    if (!post.comments) post.comments = [];
    const newComment = {
        id: 'cmt_' + Date.now(),
        author: author,
        content: content,
        date: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    };
    post.comments.push(newComment);
    
    savePostData(post);
    renderFishPostsUI();
}

// 动态按点赞量 (upvotes) 渲染 CSON 热榜 (Top 5)
function renderCsonHotList() {
    const hotListContainer = document.getElementById('zhihuHotList');
    if (!hotListContainer) return;

    if (!fishPosts || fishPosts.length === 0) {
        hotListContainer.innerHTML = `<div style="text-align:center; color: var(--zhihu-text-muted); font-size: 12px; padding: 16px 0;">暂无榜单数据</div>`;
        return;
    }

    const sortedPosts = [...fishPosts].sort((a, b) => {
        const votesA = a.upvotes || 0;
        const votesB = b.upvotes || 0;
        if (votesB !== votesA) return votesB - votesA;
        return new Date(b.date || 0) - new Date(a.date || 0);
    });

    const top5 = sortedPosts.slice(0, 5);
    hotListContainer.innerHTML = '';

    top5.forEach((post, index) => {
        const rank = index + 1;
        let rankClass = '';
        if (rank === 1) rankClass = 'rank-1';
        else if (rank === 2) rankClass = 'rank-2';
        else if (rank === 3) rankClass = 'rank-3';

        const votes = post.upvotes || 0;
        const commentsCount = (post.comments || []).length;

        const item = document.createElement('div');
        item.className = 'zhihu-hot-item';
        item.innerHTML = `
            <span class="zhihu-hot-num ${rankClass}">${rank}</span>
            <div class="zhihu-hot-content">
                <div class="zhihu-hot-title" onclick="openAndScrollToPost('${post.id}')" title="点击查看文章">
                    ${escapeHtml(post.title || '无题文章')}
                </div>
                <div class="zhihu-hot-metric">👍 ${votes} 赞同 · 💬 ${commentsCount} 评论</div>
            </div>
        `;
        hotListContainer.appendChild(item);
    });
}

function openAndScrollToPost(postId) {
    const cardEl = document.getElementById(`post_card_${postId}`);
    if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const body = cardEl.querySelector('.blog-card-full-content');
        if (body) body.style.display = 'block';
    }
}

// 渲染 CSON 风格文章与动态列表
function renderFishPostsUI() {
    renderCsonHotList();
    const container = document.getElementById('fishPostsContainer');
    if (!container) return;
    
    let filteredPosts = fishPosts;
    if (currentBlogCategory) {
        filteredPosts = filteredPosts.filter(p => p.category === currentBlogCategory);
    }
    if (currentBlogTag) {
        filteredPosts = filteredPosts.filter(p => p.tags && p.tags.includes(currentBlogTag));
    }
    if (zhihuSearchQuery) {
        filteredPosts = filteredPosts.filter(p => 
            (p.title && p.title.toLowerCase().includes(zhihuSearchQuery)) ||
            (p.content && p.content.toLowerCase().includes(zhihuSearchQuery)) ||
            (p.author && p.author.toLowerCase().includes(zhihuSearchQuery))
        );
    }
    
    if (filteredPosts.length === 0) {
        container.innerHTML = `<div class="zhihu-card" style="text-align:center; color: var(--zhihu-text-muted); font-size: 14px; padding: 40px 0;">暂无动态，点击右上角「提问 / 发动态」分享你的精彩内容吧！</div>`;
        return;
    }
    
    // 按是否置顶排序
    filteredPosts.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
    
    container.innerHTML = '';
    
    filteredPosts.forEach(post => {
        const card = document.createElement('div');
        card.className = 'zhihu-card';
        card.id = `post_card_${post.id}`;
        
        let summaryText = (post.content || '').substring(0, 140).replace(/[#*`_>\[\]\(\)]/g, '');
        if (post.content && post.content.length > 140) summaryText += '...';
        
        let renderedHtml = '';
        try {
            renderedHtml = marked.parse(post.content || '');
        } catch (e) {
            renderedHtml = escapeHtml(post.content || '');
        }

        const upvotesCount = post.upvotes || 0;
        const isUpvoted = post.userVoted === 'up';
        const isDownvoted = post.userVoted === 'down';
        const commentsList = post.comments || [];
        const commentsCount = commentsList.length;

        let commentsHtml = commentsList.map(c => `
            <div style="padding: 8px 12px; background: rgba(255,255,255,0.03); border-radius: 6px; margin-bottom: 6px; font-size: 13px; border: 1px solid rgba(255,255,255,0.05);">
                <div style="display:flex; justify-content:space-between; color: var(--zhihu-text-muted); font-size: 11px; margin-bottom: 4px;">
                    <span style="color: #38bdf8; font-weight: 600;">💬 ${escapeHtml(c.author)}</span>
                    <span>${escapeHtml(c.date)}</span>
                </div>
                <div style="color: #e5e7eb; line-height: 1.4;">${escapeHtml(c.content)}</div>
            </div>
        `).join('');

        if (!commentsHtml) {
            commentsHtml = `<div style="text-align:center; color: var(--zhihu-text-muted); font-size: 12px; padding: 12px 0;">尚无评论，快来发表你的高见吧！</div>`;
        }
        
        card.innerHTML = `
            <div class="zhihu-author-row">
                <div class="zhihu-author-info">
                    <div class="zhihu-author-avatar">🐟</div>
                    <div>
                        <span class="zhihu-author-name">${escapeHtml(post.author || '匿名 CSON 家')}</span>
                        <span class="zhihu-author-badge">Lv.${Math.floor(Math.random() * 5) + 1}</span>
                    </div>
                </div>
                <div class="zhihu-author-meta">📅 ${escapeHtml(post.date || '刚刚')}</div>
            </div>

            <div class="zhihu-card-title" onclick="const body = this.closest('.zhihu-card').querySelector('.blog-card-full-content'); body.style.display = body.style.display === 'none' ? 'block' : 'none';">
                ${post.isPinned ? '📌 ' : ''}${escapeHtml(post.title || '无题动态')}
            </div>

            <div class="zhihu-card-excerpt">${escapeHtml(summaryText)}</div>
            <div class="blog-card-full-content article-item-body" style="display: none; margin-bottom: 14px; line-height: 1.6; color: #e5e7eb; background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px;">${renderedHtml}</div>

            <div class="zhihu-action-bar">
                <button class="zhihu-vote-btn" style="${isUpvoted ? 'background: var(--zhihu-blue); color: #fff;' : ''}" onclick="upvoteZhihuPost('${post.id}', event)">
                    ▲ 赞同 ${upvotesCount}
                </button>
                <button class="zhihu-action-item" style="${isDownvoted ? 'color: #ef4444;' : ''}" onclick="downvoteZhihuPost('${post.id}', event)">
                    ▼
                </button>
                <button class="zhihu-action-item" onclick="toggleCommentsSection('${post.id}', event)">
                    💬 ${commentsCount > 0 ? commentsCount + ' 条评论' : '添加评论'}
                </button>
                <button class="zhihu-action-item" onclick="togglePinFishPost('${post.id}')">
                    ${post.isPinned ? '📌 取消置顶' : '📌 置顶'}
                </button>
                <button class="zhihu-action-item" onclick="openFishEditor('${post.id}')">
                    ✏️ 编辑
                </button>
                <button class="zhihu-action-item" style="color: #ef4444;" onclick="deleteFishPost('${post.id}')">
                    🗑️ 删除
                </button>
            </div>

            <!-- 💬 展开评论区 -->
            <div id="comments_section_${post.id}" class="cson-comments-section" style="display: none; margin-top: 14px; padding-top: 12px; border-top: 1px dashed var(--zhihu-border);">
                <div style="font-size: 13px; font-weight: 600; color: #fff; margin-bottom: 10px;">💬 评论列表 (${commentsCount})</div>
                <div class="comments-list">${commentsHtml}</div>
                
                <form onsubmit="addPostComment('${post.id}', event)" style="margin-top: 10px; display: flex; gap: 8px;">
                    <input type="text" id="comment_author_${post.id}" class="zhihu-search-input" placeholder="昵称" style="width: 100px; padding: 6px 12px; font-size: 12px;">
                    <input type="text" id="comment_input_${post.id}" class="zhihu-search-input" placeholder="写下你的评论..." style="flex: 1; padding: 6px 12px; font-size: 12px;">
                    <button type="submit" class="zhihu-btn-primary" style="padding: 4px 14px; font-size: 12px; border-radius: 12px;">发送</button>
                </form>
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
            // 【数据保护】同步更新本地备份，防止误判为云端被清空而自动恢复
            const backupStr = localStorage.getItem('toolbox_v2_fish_posts_backup');
            if (backupStr) {
                const backup = JSON.parse(backupStr).filter(p => p.id !== postId);
                localStorage.setItem('toolbox_v2_fish_posts_backup', JSON.stringify(backup));
            }
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
// ============================================================
// 🎮 摸鱼竞技场引擎 (Game Section)
// ============================================================

let currentGame = null;
let gameTimer = null;
let gameScores = {
    clickFrenzy: [],
    reactionTime: [],
    mathMaster: []
};

const GAME_SCORES_PATH = 'toolbox/v2/game_scores';

function initGameDatabase() {
    if (typeof isFirebaseConfigured === 'function' && isFirebaseConfigured()) {
        db.ref(GAME_SCORES_PATH).on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                gameScores = data;
                // Ensure properties exist
                if (!gameScores.clickFrenzy) gameScores.clickFrenzy = [];
                if (!gameScores.reactionTime) gameScores.reactionTime = [];
                if (!gameScores.mathMaster) gameScores.mathMaster = [];
            } else {
                gameScores = {
                    clickFrenzy: [],
                    reactionTime: [],
                    mathMaster: []
                };
            }
            // 刷新排行榜
            const activeTab = document.querySelector('.lb-tab.active');
            if (activeTab) {
                showLeaderboard(activeTab.getAttribute('data-game'));
            }
        }, (error) => {
            console.error("Firebase游戏分数监听失败，降级本地存储:", error);
            initGameLocalFallback();
        });
    } else {
        initGameLocalFallback();
    }
}

function initGameLocalFallback() {
    const local = localStorage.getItem('toolbox_v2_game_scores');
    if (local) {
        try {
            gameScores = JSON.parse(local);
        } catch (e) {
            gameScores = {
                clickFrenzy: [],
                reactionTime: [],
                mathMaster: []
            };
        }
    }
    const activeTab = document.querySelector('.lb-tab.active');
    if (activeTab) {
        showLeaderboard(activeTab.getAttribute('data-game'));
    }
}

async function saveGameScores() {
    localStorage.setItem('toolbox_v2_game_scores', JSON.stringify(gameScores));
    
    if (typeof isFirebaseConfigured === 'function' && isFirebaseConfigured()) {
        try {
            await db.ref(GAME_SCORES_PATH).set(gameScores);
        } catch (e) {
            console.error('云端保存游戏分数失败: ' + e.message);
        }
    }
}

function startGame(gameId) {
    currentGame = gameId;
    document.querySelector('.game-cards-container').style.display = 'none';
    document.getElementById('leaderboardArea').style.display = 'none';
    document.getElementById('gamePlayArea').style.display = 'block';
    
    const ui = document.getElementById('gameUI');
    const title = document.getElementById('currentGameTitle');
    
    if (gameId === 'clickFrenzy') {
        title.innerText = '疯狂点击 (Click Frenzy)';
        initClickFrenzy(ui);
    } else if (gameId === 'reactionTime') {
        title.innerText = '极速反应 (Reaction Time)';
        initReactionTime(ui);
    } else if (gameId === 'mathMaster') {
        title.innerText = '速算大师 (Math Master)';
        initMathMaster(ui);
    }
}

function exitGame() {
    if (gameTimer) clearTimeout(gameTimer);
    if (gameTimer) clearInterval(gameTimer);
    currentGame = null;
    document.querySelector('.game-cards-container').style.display = 'grid';
    document.getElementById('leaderboardArea').style.display = 'block';
    document.getElementById('gamePlayArea').style.display = 'none';
    document.getElementById('gameUI').innerHTML = '';
}

function recordScore(gameId, score, isHigherBetter = true) {
    let scores = gameScores[gameId];
    
    // Check if high score
    let isHigh = false;
    if (scores.length < 5) {
        isHigh = true;
    } else {
        const worstScore = scores[scores.length - 1].score;
        if (isHigherBetter) {
            if (score > worstScore) isHigh = true;
        } else {
            if (score < worstScore) isHigh = true;
        }
    }
    
    if (isHigh) {
        setTimeout(() => {
            let name = prompt(`新记录！得分为 ${score}，请输入你的大名：`, "匿名摸鱼人");
            if (name) {
                scores.push({ name: name, score: score, date: new Date().toLocaleDateString() });
                scores.sort((a, b) => isHigherBetter ? b.score - a.score : a.score - b.score);
                scores.splice(5); // Keep top 5
                saveGameScores();
                showLeaderboard(gameId);
            }
        }, 100);
    }
}

// 1. Click Frenzy
function initClickFrenzy(ui) {
    let clicks = 0;
    let timeLeft = 10;
    let playing = false;
    
    ui.innerHTML = `
        <div style="font-size: 20px; font-weight: bold; margin-bottom: 20px;">
            时间: <span id="cfTime">${timeLeft}</span>s | 点击数: <span id="cfClicks">0</span>
        </div>
        <div id="cfBtn" class="click-target">开始</div>
    `;
    
    const btn = document.getElementById('cfBtn');
    btn.onclick = () => {
        if (!playing && timeLeft === 10) {
            playing = true;
            btn.innerText = '点我！';
            gameTimer = setInterval(() => {
                timeLeft--;
                document.getElementById('cfTime').innerText = timeLeft;
                if (timeLeft <= 0) {
                    clearInterval(gameTimer);
                    playing = false;
                    btn.innerText = '结束';
                    btn.onclick = null;
                    recordScore('clickFrenzy', clicks, true);
                    setTimeout(() => exitGame(), 2000);
                }
            }, 1000);
        }
        
        if (playing) {
            clicks++;
            document.getElementById('cfClicks').innerText = clicks;
        }
    };
}

// 2. Reaction Time
function initReactionTime(ui) {
    let state = 'waiting'; // waiting, ready, done
    let startTime;
    
    ui.innerHTML = `
        <div id="rtTarget" class="reaction-target">点击开始</div>
        <div id="rtResult" style="margin-top: 20px; font-size: 18px; font-weight: bold;"></div>
    `;
    
    const target = document.getElementById('rtTarget');
    
    target.onmousedown = () => {
        if (state === 'waiting') {
            target.innerText = '等待变绿...';
            target.style.background = '#ff9500';
            state = 'preparing';
            
            const delay = 1500 + Math.random() * 3000;
            gameTimer = setTimeout(() => {
                state = 'ready';
                target.innerText = '点！';
                target.classList.add('ready');
                startTime = Date.now();
            }, delay);
        } else if (state === 'preparing') {
            clearTimeout(gameTimer);
            target.innerText = '太早了！点击重试';
            target.style.background = '#ff3b30';
            state = 'waiting';
        } else if (state === 'ready') {
            const time = Date.now() - startTime;
            state = 'done';
            target.innerText = `${time} ms`;
            target.classList.remove('ready');
            target.style.background = '#0071e3';
            recordScore('reactionTime', time, false);
            setTimeout(() => {
                target.innerText = '点击重新开始';
                target.style.background = '#ff3b30';
                state = 'waiting';
            }, 2000);
        }
    };
}

// 3. Math Master
function initMathMaster(ui) {
    let score = 0;
    let timeLeft = 15;
    let playing = false;
    let currentAnswer = 0;
    
    ui.innerHTML = `
        <div style="font-size: 20px; font-weight: bold; margin-bottom: 20px;">
            时间: <span id="mmTime">${timeLeft}</span>s | 得分: <span id="mmScore">0</span>
        </div>
        <div id="mmProblem" class="math-problem">点击开始</div>
        <input type="number" id="mmInput" class="math-input" disabled placeholder="?">
        <button id="mmStartBtn" class="form-btn blue-btn" style="margin-top: 15px;">开始挑战</button>
    `;
    
    const problem = document.getElementById('mmProblem');
    const input = document.getElementById('mmInput');
    const startBtn = document.getElementById('mmStartBtn');
    
    function nextProblem() {
        const ops = ['+', '-', '*'];
        const op = ops[Math.floor(Math.random() * ops.length)];
        let a, b;
        if (op === '+') {
            a = Math.floor(Math.random() * 50) + 1;
            b = Math.floor(Math.random() * 50) + 1;
            currentAnswer = a + b;
        } else if (op === '-') {
            a = Math.floor(Math.random() * 50) + 20;
            b = Math.floor(Math.random() * 20) + 1;
            currentAnswer = a - b;
        } else if (op === '*') {
            a = Math.floor(Math.random() * 10) + 2;
            b = Math.floor(Math.random() * 10) + 2;
            currentAnswer = a * b;
        }
        problem.innerText = `${a} ${op} ${b} = ?`;
        input.value = '';
    }
    
    startBtn.onclick = () => {
        score = 0;
        timeLeft = 15;
        playing = true;
        startBtn.style.display = 'none';
        input.disabled = false;
        input.focus();
        document.getElementById('mmScore').innerText = score;
        document.getElementById('mmTime').innerText = timeLeft;
        
        nextProblem();
        
        gameTimer = setInterval(() => {
            timeLeft--;
            document.getElementById('mmTime').innerText = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(gameTimer);
                playing = false;
                input.disabled = true;
                problem.innerText = '时间到！';
                recordScore('mathMaster', score, true);
                setTimeout(() => {
                    startBtn.style.display = 'block';
                    startBtn.innerText = '重新开始';
                }, 2000);
            }
        }, 1000);
    };
    
    input.oninput = () => {
        if (playing && parseInt(input.value) === currentAnswer) {
            score++;
            document.getElementById('mmScore').innerText = score;
            nextProblem();
        }
    };
}

function showLeaderboard(gameId, tabBtn = null) {
    if (tabBtn) {
        document.querySelectorAll('.lb-tab').forEach(b => b.classList.remove('active'));
        tabBtn.classList.add('active');
    } else {
        // Find the matching tab
        document.querySelectorAll('.lb-tab').forEach(b => {
            if (b.getAttribute('data-game') === gameId) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });
    }
    
    const container = document.getElementById('leaderboardContainer');
    const scores = gameScores[gameId];
    
    if (!scores || scores.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px;">暂无记录，快来霸榜！</div>';
        return;
    }
    
    let html = '<ul class="leaderboard-list">';
    scores.forEach((s, i) => {
        let suffix = '';
        if (gameId === 'reactionTime') suffix = ' ms';
        if (gameId === 'clickFrenzy') suffix = ' 次';
        if (gameId === 'mathMaster') suffix = ' 题';
        
        let rankMedal = i + 1;
        if (i === 0) rankMedal = '🥇';
        if (i === 1) rankMedal = '🥈';
        if (i === 2) rankMedal = '🥉';
        
        html += `
            <li class="leaderboard-item">
                <span class="leaderboard-rank">${rankMedal}</span>
                <span class="leaderboard-name">${escapeHtml(s.name)}</span>
                <span class="leaderboard-score">${s.score}${suffix}</span>
            </li>
        `;
    });
    html += '</ul>';
    container.innerHTML = html;
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
    // 加载文章和游戏分数
    initFishDatabase();
    initGameDatabase();
    
    // 渲染排行榜 (默认显示疯狂点击)
    showLeaderboard('clickFrenzy');
    
    // 默认切换到“已发布文章”区
    switchFishTab('posts');
    
    // 初始化大A监控
    initStockMonitor();
    
    // 初始化市场新闻
    fetchMarketNews();
    
    // 初始化市场情绪检测
    initMarketSentiment();
    
    // 初始化摸鱼倒计时
    initCountdown();
}

function toggleSidebarModule(headerEl) {
    const moduleEl = headerEl.closest('.sidebar-module');
    if (moduleEl) {
        moduleEl.classList.toggle('collapsed');
    }
}

// ============================================================
// 📈 大A监控引擎 (A-Share Monitor)
// ============================================================
let stockWatchList = ['sh513310']; // 默认只保留 sh513310
let stockExpandedState = {};
let stockMonitorInterval = null;

function toggleStock(code) {
    if (stockExpandedState[code] === undefined) {
        stockExpandedState[code] = false;
    } else {
        stockExpandedState[code] = !stockExpandedState[code];
    }
    renderStocks();
}

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
        
        const isExpanded = stockExpandedState[code] !== false; // 默认展开

        let chartHtml = "";
        let sentimentHtml = "";

        if (isExpanded) {
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
            
            chartHtml = `
                <svg class="stock-chart" viewBox="0 0 100 40" preserveAspectRatio="none">
                    <polyline points="${svgPath}" fill="none" stroke="${strokeColor}" stroke-width="1.5" stroke-linejoin="round"/>
                </svg>
            `;

            // 计算个股情绪
            let score = 50 + (parseFloat(changePercent) / 3) * 50;
            score = Math.max(0, Math.min(100, score));
            const sentimentLevel = getSentimentLevel(Math.round(score));
            
            sentimentHtml = `
                <div class="sentiment-mini-header" style="margin-top: 8px;">
                    <span class="sentiment-mini-label" style="font-size: 11px; color: var(--text-muted);">情绪</span>
                    <span class="sentiment-mini-score ${sentimentLevel.class}" style="font-size: 12px; font-weight: bold;">${sentimentLevel.label} ${Math.round(score)}</span>
                </div>
                <div class="sentiment-bar" style="height: 4px; margin-top: 4px; margin-bottom: 2px;">
                    <div class="sentiment-bar-fill ${sentimentLevel.class}" style="width: ${score}%"></div>
                </div>
            `;
        }
        
        const item = document.createElement('div');
        item.className = 'stock-item';
        item.style.cursor = 'pointer';
        item.onclick = (e) => {
            if (e.target.tagName.toLowerCase() !== 'button') {
                toggleStock(code);
            }
        };

        if (isExpanded) {
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
                ${sentimentHtml}
            `;
        } else {
            item.innerHTML = `
                <button class="stock-del-btn" onclick="removeStock('${code}')" title="删除">✕</button>
                <div class="stock-item-top" style="margin-bottom: 0; align-items: center;">
                    <div>
                        <div class="stock-name">${escapeHtml(name)}</div>
                    </div>
                    <div style="text-align:right;">
                        <div class="stock-price ${colorClass}">${price} <span class="stock-change ${colorClass}" style="font-size: 12px; margin-left: 4px;">${prefix}${changePercent}%</span></div>
                    </div>
                </div>
            `;
        }
        
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

// ============================================================
// ⏳ 摸鱼倒计时 (Countdown Monitor)
// ============================================================
let countdownInterval = null;

function initCountdown() {
    updateCountdown();
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(updateCountdown, 1000);
}

function updateCountdown() {
    const container = document.getElementById('countdownMonitorList');
    if (!container) return;

    const now = new Date();
    
    // 1. 下班倒计时 (假设18:30下班)
    let workEnd = new Date(now);
    workEnd.setHours(18, 30, 0, 0);
    let workEndDiff = workEnd - now;
    let workEndStr = '';
    if (workEndDiff > 0) {
        let h = Math.floor(workEndDiff / 3600000);
        let m = Math.floor((workEndDiff % 3600000) / 60000);
        let s = Math.floor((workEndDiff % 60000) / 1000);
        workEndStr = `${h}小时 ${m}分钟 ${s}秒`;
    } else {
        workEndStr = "已下班！🎉";
    }

    // 2. 周末倒计时 (距离本周六 00:00:00)
    let weekend = new Date(now);
    let dayOfWeek = now.getDay(); // 0(Sun) to 6(Sat)
    let daysToSaturday = 6 - dayOfWeek;
    if (dayOfWeek === 6 || dayOfWeek === 0) {
        weekend = null; // 当前就是周末
    } else {
        weekend.setDate(now.getDate() + daysToSaturday);
        weekend.setHours(0, 0, 0, 0);
    }
    
    let weekendStr = '';
    if (weekend) {
        let weekendDiff = weekend - now;
        let d = Math.floor(weekendDiff / 86400000);
        let h = Math.floor((weekendDiff % 86400000) / 3600000);
        let m = Math.floor((weekendDiff % 3600000) / 60000);
        let s = Math.floor((weekendDiff % 60000) / 1000);
        weekendStr = `${d}天 ${h}小时 ${m}分钟 ${s}秒`;
    } else {
        weekendStr = "正在享受周末！🏖️";
    }

    // 3. 假期倒计时
    const holidays = [
        { name: '中秋节', date: '2026-09-25T00:00:00' },
        { name: '国庆节', date: '2026-10-01T00:00:00' },
        { name: '元旦', date: '2027-01-01T00:00:00' },
        { name: '春节', date: '2027-02-06T00:00:00' },
        { name: '清明节', date: '2027-04-05T00:00:00' },
        { name: '劳动节', date: '2027-05-01T00:00:00' },
        { name: '端午节', date: '2027-06-09T00:00:00' },
        { name: '中秋节', date: '2027-09-15T00:00:00' },
        { name: '国庆节', date: '2027-10-01T00:00:00' }
    ];
    
    let nextHoliday = null;
    let holidayStr = '';
    for (let h of holidays) {
        let hDate = new Date(h.date);
        if (hDate > now) {
            nextHoliday = h;
            break;
        }
    }
    
    if (nextHoliday) {
        let holidayDiff = new Date(nextHoliday.date) - now;
        let d = Math.floor(holidayDiff / 86400000);
        let h = Math.floor((holidayDiff % 86400000) / 3600000);
        let m = Math.floor((holidayDiff % 3600000) / 60000);
        let s = Math.floor((holidayDiff % 60000) / 1000);
        holidayStr = `距离 <strong>${nextHoliday.name}</strong> 还有 ${d}天 ${h}小时 ${m}分钟 ${s}秒`;
    } else {
        holidayStr = "暂无假期数据";
    }

    container.innerHTML = `
        <div class="countdown-item">
            <div class="countdown-label">🕒 距离下午 18:30 下班</div>
            <div class="countdown-value">${workEndStr}</div>
        </div>
        <div class="countdown-item">
            <div class="countdown-label">🎉 距离周末 (周六)</div>
            <div class="countdown-value">${weekendStr}</div>
        </div>
        <div class="countdown-item" style="border-bottom: none; margin-bottom: 0; padding-bottom: 0;">
            <div class="countdown-label">🌴 假期倒计时</div>
            <div class="countdown-value" style="font-size: 13px;">${holidayStr}</div>
        </div>
    `;
}

// ============================================================
// 🌊 3D 共享鱼塘 (Three.js 3D Aquarium & Spatial Studio)
// ============================================================
const FISH_POND_PATH = 'toolbox/v2/shared_pond';
let myPondFishId = localStorage.getItem('toolbox_v2_pond_fish_id');
let fishPondData = {};
let fishPondInterval = null;
let lastRenderedPositions = {}; 

// 摸鱼贝壳金币与装扮状态
let myShellCoins = parseInt(localStorage.getItem('toolbox_v2_shell_coins') || '50', 10);
let purchasedDecors = JSON.parse(localStorage.getItem('toolbox_v2_purchased_decors') || '[]');

// Three.js 3D 水族馆状态全局变量
let aquarium3D = {
    initialized: false,
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    container: null,
    labelsContainer: null,
    fishMeshes: {},    // fishId -> { group, tailGroup, targetPos, currentPos, data, emoji }
    foodPellets: [],   // Array of { mesh, vy }
    bubbles: null,     // THREE.Points
    seaweeds: [],      // Array of seaweed groups
    jellyfishes: [],   // Array of { group, tentacles, offset } 3D 发光水母
    ripples: [],       // Array of { mesh, scale, opacity } 3D 水波涟漪
    shells: [],        // Array of collectible 3D shell meshes
    decors: {},        // Map of placed 3D decors (chest, cavern, ball)
    laserMesh: null,   // 3D Laser spot mesh
    isLaserActive: false,
    cameraPreset: 'free',
    clock: null,
    animId: null,
    isFullscreen: false,
    isBgMode: false,
    raycaster: null,
    mouse: null
};

// Web Audio 白噪音治愈合成器状态
let soundscapeEngine = {
    ctx: null,
    activeType: null,
    nodes: {}
};

function getLocalFishPondData() {
    const saved = localStorage.getItem('toolbox_v2_local_fish_pond');
    if (saved) {
        try { return JSON.parse(saved); } catch(e){}
    }
    const defaultData = {
        'demo_fish_1': { id: 'demo_fish_1', name: '阿橙', emoji: '🐠', x: 30, y: 40, hunger: 100, xp: 120, level: 2 },
        'demo_fish_2': { id: 'demo_fish_2', name: '小蓝', emoji: '🐟', x: 65, y: 35, hunger: 90, xp: 350, level: 4 },
        'demo_fish_3': { id: 'demo_fish_3', name: '刺刺', emoji: '🐡', x: 45, y: 75, hunger: 100, xp: 50, level: 1 }
    };
    localStorage.setItem('toolbox_v2_local_fish_pond', JSON.stringify(defaultData));
    return defaultData;
}

function initFishPond() {
    const overlay = document.getElementById('fishPondOverlay');
    if (overlay) overlay.style.display = 'none';

    // 监听 Firebase 数据或加载本地离线数据
    if (typeof isFirebaseConfigured === 'function' && isFirebaseConfigured()) {
        db.ref(FISH_POND_PATH).on('value', (snapshot) => {
            const data = snapshot.val();
            fishPondData = data || getLocalFishPondData();
            renderFishPond();
            checkMyFishStatus();
        });
    } else {
        fishPondData = getLocalFishPondData();
        renderFishPond();
        checkMyFishStatus();
    }
    
    // 5秒定时随机游动更新
    if (fishPondInterval) clearInterval(fishPondInterval);
    fishPondInterval = setInterval(() => {
        if (myPondFishId && fishPondData[myPondFishId]) {
            moveMyFishRandomly();
        }
    }, 5000);

    // 初始化 Three.js 3D 水族馆引擎
    setTimeout(() => {
        init3DAquariumEngine();
        initFish3DCardsTilt();
    }, 100);
}

// ------------------------------------------------------------
// 🧊 Three.js 3D 水族馆引擎初始化
// ------------------------------------------------------------
function init3DAquariumEngine() {
    if (typeof THREE === 'undefined') {
        console.warn('Three.js 未加载，退回到 2D 鱼塘模式');
        return;
    }

    const container = document.getElementById('fishPondCanvas3D');
    const labelsContainer = document.getElementById('fishPondLabels3D');
    if (!container) return;

    // 清空现有容器
    container.innerHTML = '';
    if (labelsContainer) labelsContainer.innerHTML = '';

    aquarium3D.container = container;
    aquarium3D.labelsContainer = labelsContainer;
    aquarium3D.clock = new THREE.Clock();
    aquarium3D.raycaster = new THREE.Raycaster();
    aquarium3D.mouse = new THREE.Vector2();

    const overlay = document.getElementById('fishPondOverlay');
    if (overlay) overlay.style.display = 'none';

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06152d);
    scene.fog = new THREE.FogExp2(0x06152d, 0.022);
    aquarium3D.scene = scene;

    // 2. Camera
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 480;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 2, 22);
    aquarium3D.camera = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    aquarium3D.renderer = renderer;

    // 4. OrbitControls
    if (typeof THREE.OrbitControls !== 'undefined') {
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxPolarAngle = Math.PI * 0.55;
        controls.minPolarAngle = Math.PI * 0.2;
        controls.minDistance = 8;
        controls.maxDistance = 45;
        controls.target.set(0, 0, 0);
        aquarium3D.controls = controls;
    }

    // 5. Lights
    const ambientLight = new THREE.AmbientLight(0x2d6a9f, 1.8);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xbef264, 2.5);
    sunLight.position.set(10, 25, 12);
    sunLight.castShadow = true;
    scene.add(sunLight);

    const pointLight = new THREE.PointLight(0x38bdf8, 2.2, 50);
    pointLight.position.set(0, 10, 0);
    scene.add(pointLight);

    // 6. 海底金色沙滩平原 (Procedural Sandy Seabed)
    const floorGeo = new THREE.PlaneGeometry(44, 30, 36, 24);
    const pos = floorGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i);
        const vy = pos.getY(i);
        const zNoise = Math.sin(vx * 0.4) * Math.cos(vy * 0.4) * 0.5 + Math.sin(vx * 1.1) * 0.2;
        pos.setZ(i, zNoise);
    }
    floorGeo.computeVertexNormals();

    const floorMat = new THREE.MeshStandardMaterial({
        color: 0xdfb17b, // 亮金暖色水下沙滩
        emissive: 0x422d19,
        emissiveIntensity: 0.45,
        roughness: 0.65,
        metalness: 0.1,
        side: THREE.DoubleSide
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -5.8;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // 7. 3D 海藻与水草 (Procedural Seaweed)
    createSeaweeds3D();

    // 8. 气泡粒子系统 (Bubbles System)
    createBubblesParticleSystem();

    // 9. 3D 脉动发光水母 (Bioluminescent Jellyfish)
    createJellyfishes3D();

    // 10. 激光笔 3D 指示点 (Laser Pointer Mesh)
    const laserGeo = new THREE.SphereGeometry(0.2, 12, 12);
    const laserMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const laserMesh = new THREE.Mesh(laserGeo, laserMat);
    laserMesh.visible = false;
    scene.add(laserMesh);
    aquarium3D.laserMesh = laserMesh;

    aquarium3D.initialized = true;

    // Resize Handler
    window.addEventListener('resize', onAquariumResize);

    // Mousemove & Click Handlers
    renderer.domElement.addEventListener('mousemove', (e) => {
        if (!aquarium3D.initialized) return;
        const rect = renderer.domElement.getBoundingClientRect();
        aquarium3D.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        aquarium3D.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    });

    renderer.domElement.addEventListener('click', onAquariumCanvasClick);

    // 初始化已购买 3D 景致与 Shell 界面
    initPurchased3DDecors();
    updateShellCoinsDisplay();

    // 每 15 秒概率生成 3D 🐚 摸鱼贝壳
    setInterval(spawn3DCollectibleShell, 15000);
    spawn3DCollectibleShell(); // 初始生成一个

    // Render Loop
    if (aquarium3D.animId) cancelAnimationFrame(aquarium3D.animId);
    animate3DAquarium();
    
    // 同步现有 3D 小鱼数据
    syncFishPondDataTo3D();
}

// ------------------------------------------------------------
// 🌿 3D 景致与装饰系统
// ------------------------------------------------------------
function createSeaweeds3D() {
    const seaweedGeo = new THREE.CylinderGeometry(0.05, 0.15, 4, 6);
    seaweedGeo.translate(0, 2, 0);
    const seaweedMat = new THREE.MeshStandardMaterial({
        color: 0x4ade80, emissive: 0x14532d, emissiveIntensity: 0.2, roughness: 0.6
    });
    for (let i = 0; i < 15; i++) {
        const sw = new THREE.Mesh(seaweedGeo, seaweedMat);
        sw.position.set((Math.random() - 0.5) * 40, -5.8, (Math.random() - 0.5) * 15 - 5);
        sw.scale.setScalar(0.8 + Math.random() * 0.8);
        sw.rotation.y = Math.random() * Math.PI * 2;
        aquarium3D.scene.add(sw);
        aquarium3D.seaweeds.push({ group: sw, offset: Math.random() * Math.PI * 2 });
    }
}

function createBubblesParticleSystem() {
    const particleCount = 60;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const speeds = [];
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 30;
        positions[i * 3 + 1] = -6 + Math.random() * 12;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 15;
        speeds.push(0.02 + Math.random() * 0.05);
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
        color: 0xffffff, size: 0.25, transparent: true, opacity: 0.6,
        blending: THREE.AdditiveBlending, depthWrite: false
    });
    const particles = new THREE.Points(geometry, material);
    aquarium3D.scene.add(particles);
    aquarium3D.bubbles = { particles, positions, speeds };
}

function createJellyfishes3D() {
    for (let i = 0; i < 3; i++) {
        const jfGroup = new THREE.Group();
        const capGeo = new THREE.SphereGeometry(0.6, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const capMat = new THREE.MeshStandardMaterial({
            color: 0xe0e7ff, emissive: 0x6366f1, emissiveIntensity: 0.6,
            transparent: true, opacity: 0.85, roughness: 0.2
        });
        const cap = new THREE.Mesh(capGeo, capMat);
        jfGroup.add(cap);

        const tentacles = [];
        const tentacleGeo = new THREE.CylinderGeometry(0.02, 0.01, 1.2, 4);
        tentacleGeo.translate(0, -0.6, 0);
        const tentacleMat = new THREE.MeshBasicMaterial({ color: 0x818cf8, transparent: true, opacity: 0.7 });

        for (let j = 0; j < 6; j++) {
            const angle = (j / 6) * Math.PI * 2;
            const t = new THREE.Mesh(tentacleGeo, tentacleMat);
            t.position.set(Math.cos(angle) * 0.3, 0, Math.sin(angle) * 0.3);
            jfGroup.add(t);
            tentacles.push(t);
        }

        jfGroup.position.set((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 6 + 2, (Math.random() - 0.5) * 10 - 5);
        aquarium3D.scene.add(jfGroup);
        aquarium3D.jellyfishes.push({ group: jfGroup, tentacles, offset: Math.random() * Math.PI * 2 });
    }
}

function onAquariumCanvasClick(event) {
    if (!aquarium3D.initialized || !aquarium3D.camera) return;
    if (aquarium3D.isLaserActive) return;

    const rect = aquarium3D.renderer.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x, y }, aquarium3D.camera);
    const intersects = raycaster.intersectObjects(aquarium3D.scene.children, true);
    
    for (let i = 0; i < intersects.length; i++) {
        let object = intersects[i].object;
        while(object && object.parent !== aquarium3D.scene) {
            if (object.userData && object.userData.isShell) {
                collectShell(object);
                return;
            }
            object = object.parent;
        }
    }
    drop3DFood(intersects[0] ? intersects[0].point : null);
}

function drop3DFood(targetPoint) {
    if (!aquarium3D.scene) return;
    const foodGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const foodMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 });
    const foodMesh = new THREE.Mesh(foodGeo, foodMat);
    foodMesh.position.set(
        targetPoint ? targetPoint.x : (Math.random() - 0.5) * 20,
        10,
        targetPoint ? targetPoint.z : (Math.random() - 0.5) * 10
    );
    aquarium3D.scene.add(foodMesh);
    aquarium3D.foodPellets.push({ mesh: foodMesh, vy: -0.05 - Math.random() * 0.05, age: 0 });

    Object.values(aquarium3D.fishMeshes).forEach(f => {
        if (f.currentPos.distanceTo(foodMesh.position) < 20) {
            f.targetPos.copy(foodMesh.position);
            f.targetPos.y = -5.8;
        }
    });
}

function spawn3DCollectibleShell() {
    if (!aquarium3D.scene || aquarium3D.shells.length > 5) return;
    const shellGroup = new THREE.Group();
    shellGroup.userData = { isShell: true, group: shellGroup };

    const topGeo = new THREE.ConeGeometry(0.4, 0.4, 8);
    topGeo.translate(0, 0.2, 0);
    const shellMat = new THREE.MeshStandardMaterial({
        color: 0xffe4e1, emissive: 0xffb6c1, emissiveIntensity: 0.4, roughness: 0.3, metalness: 0.1
    });
    const topMesh = new THREE.Mesh(topGeo, shellMat);
    shellGroup.add(topMesh);

    shellGroup.position.set((Math.random() - 0.5) * 35, -5.7, (Math.random() - 0.5) * 15 - 5);
    shellGroup.rotation.x = -Math.PI / 2;
    aquarium3D.scene.add(shellGroup);
    aquarium3D.shells.push(shellGroup);
}

function collectShell(shellGroup) {
    if (!aquarium3D.scene) return;
    aquarium3D.scene.remove(shellGroup);
    const index = aquarium3D.shells.indexOf(shellGroup);
    if (index > -1) aquarium3D.shells.splice(index, 1);

    const coins = parseInt(localStorage.getItem('shellCoins') || '0', 10) + 1;
    localStorage.setItem('shellCoins', coins.toString());
    updateShellCoinsDisplay();
    
    const el = document.createElement('div');
    el.className = 'fish-toast';
    el.innerText = '🐚 收集到一个贝壳！贝壳币 +1';
    el.style.position = 'fixed';
    el.style.top = '20px';
    el.style.left = '50%';
    el.style.transform = 'translateX(-50%)';
    el.style.background = 'rgba(0,0,0,0.7)';
    el.style.color = '#fff';
    el.style.padding = '10px 20px';
    el.style.borderRadius = '20px';
    el.style.zIndex = '9999';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

function updateShellCoinsDisplay() {
    const coins = localStorage.getItem('shellCoins') || '0';
    let el = document.getElementById('shellCoinsDisplay');
    if (!el) {
        el = document.createElement('div');
        el.id = 'shellCoinsDisplay';
        el.style.position = 'absolute';
        el.style.top = '20px';
        el.style.left = '20px';
        el.style.padding = '8px 16px';
        el.style.background = 'rgba(255,255,255,0.8)';
        el.style.borderRadius = '20px';
        el.style.fontWeight = 'bold';
        el.style.zIndex = '10';
        el.style.backdropFilter = 'blur(10px)';
        const container = document.getElementById('fishPondScene3D');
        if (container) container.appendChild(el);
    }
    if (el) el.innerHTML = `🐚 贝壳币: ${coins}`;
}

function initPurchased3DDecors() {
    const purchases = JSON.parse(localStorage.getItem('toolbox_fishpond_purchases') || '[]');
    if (purchases.includes('chest')) {
        const chestGeo = new THREE.BoxGeometry(1.5, 1, 1);
        const chestMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, metalness: 0.3 });
        const chest = new THREE.Mesh(chestGeo, chestMat);
        chest.position.set(10, -5.3, -5);
        aquarium3D.scene.add(chest);
        const lidGeo = new THREE.BoxGeometry(1.5, 0.2, 1);
        const lid = new THREE.Mesh(lidGeo, chestMat);
        lid.position.set(10, -4.7, -5.5);
        aquarium3D.scene.add(lid);
        aquarium3D.decors.chest = { lidMesh: lid };
    }
    if (purchases.includes('ball')) {
        const ballGeo = new THREE.SphereGeometry(0.8, 16, 16);
        const ballMat = new THREE.MeshStandardMaterial({ color: 0xff69b4, metalness: 0.2 });
        const ball = new THREE.Mesh(ballGeo, ballMat);
        ball.position.set(-10, -5, -3);
        aquarium3D.scene.add(ball);
        aquarium3D.decors.ball = { ballMesh: ball };
    }
}

function focusOn3DFish(id) {
    if (!aquarium3D.fishMeshes[id]) return;
    aquarium3D.focusedFishId = id;
}

// ------------------------------------------------------------
// 🐠 3D 小鱼 Procedural Mesh 模型创建 (等级/体型/发光光环)
// ------------------------------------------------------------
function create3DFishMesh(emoji, name, level = 1) {
    const fishGroup = new THREE.Group();

    // 提取配色方案
    let bodyColor = 0xff7b00; // 默认热带橙
    let accentColor = 0xffffff;
    let baseScale = 1.0;

    if (emoji === '🐟') { bodyColor = 0x0077b6; accentColor = 0xffd166; baseScale = 0.95; }
    else if (emoji === '🐡') { bodyColor = 0xe76f51; accentColor = 0xf4a261; baseScale = 1.1; }
    else if (emoji === '🦈') { bodyColor = 0x457b9d; accentColor = 0xf1faee; baseScale = 1.35; }
    else if (emoji === '🐬') { bodyColor = 0x2a9d8f; accentColor = 0xe9c46a; baseScale = 1.25; }
    else if (emoji === '🐳') { bodyColor = 0x1d3557; accentColor = 0x457b9d; baseScale = 1.4; }

    const bodyMat = new THREE.MeshStandardMaterial({
        color: bodyColor,
        emissive: bodyColor,
        emissiveIntensity: 0.35,
        roughness: 0.35,
        metalness: 0.15
    });
    const accentMat = new THREE.MeshStandardMaterial({
        color: accentColor,
        emissive: accentColor,
        emissiveIntensity: 0.25,
        roughness: 0.3
    });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x050505 });

    // 1. 鱼身 (Body)
    const bodyGeo = new THREE.SphereGeometry(0.8, 16, 16);
    bodyGeo.scale(1.3, 0.7, 0.45);
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.castShadow = true;
    fishGroup.add(bodyMesh);

    // 2. 尾巴 (Tail)
    const tailGroup = new THREE.Group();
    tailGroup.position.set(-1.0, 0, 0);

    const tailGeo = new THREE.ConeGeometry(0.6, 1.0, 12);
    tailGeo.rotateZ(Math.PI / 2);
    tailGeo.scale(0.8, 1.2, 0.2);
    const tailMesh = new THREE.Mesh(tailGeo, accentMat);
    tailMesh.position.set(-0.4, 0, 0);
    tailMesh.castShadow = true;
    tailGroup.add(tailMesh);

    fishGroup.add(tailGroup);

    // 3. 背鳍 (Dorsal Fin)
    const dorsalGeo = new THREE.ConeGeometry(0.4, 0.8, 8);
    dorsalGeo.scale(0.8, 1.0, 0.15);
    const dorsalMesh = new THREE.Mesh(dorsalGeo, accentMat);
    dorsalMesh.position.set(0.1, 0.65, 0);
    dorsalMesh.rotation.z = -Math.PI * 0.15;
    fishGroup.add(dorsalMesh);

    // 4. 侧鳍 (Side Fins)
    const finGeo = new THREE.ConeGeometry(0.3, 0.5, 6);
    finGeo.scale(0.6, 1.0, 0.1);
    
    const leftFin = new THREE.Mesh(finGeo, accentMat);
    leftFin.position.set(0.3, -0.1, 0.35);
    leftFin.rotation.set(0.3, 0.5, -0.6);
    fishGroup.add(leftFin);

    const rightFin = new THREE.Mesh(finGeo, accentMat);
    rightFin.position.set(0.3, -0.1, -0.35);
    rightFin.rotation.set(-0.3, -0.5, -0.6);
    fishGroup.add(rightFin);

    // 5. 眼睛 (Eyes)
    const eyeGeo = new THREE.SphereGeometry(0.12, 10, 10);
    const pupilGeo = new THREE.SphereGeometry(0.06, 8, 8);

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(0.65, 0.15, 0.28);
    const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
    leftPupil.position.set(0.72, 0.15, 0.32);
    fishGroup.add(leftEye); fishGroup.add(leftPupil);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.65, 0.15, -0.28);
    const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
    rightPupil.position.set(0.72, 0.15, -0.32);
    fishGroup.add(rightEye); fishGroup.add(rightPupil);

    // 6. 高等级发光光环 (Level Aura)
    if (level >= 3) {
        const auraGeo = new THREE.TorusGeometry(1.0, 0.05, 8, 24);
        const auraMat = new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            emissive: 0x00d4ff,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.8
        });
        const auraMesh = new THREE.Mesh(auraGeo, auraMat);
        auraMesh.rotation.x = Math.PI / 2;
        fishGroup.add(auraMesh);
    }

    // 根据等级计算缩放比例
    const scale = baseScale * (1.0 + (level - 1) * 0.1);
    fishGroup.scale.set(scale, scale, scale);

    return {
        group: fishGroup,
        tailGroup: tailGroup
    };
}

// ------------------------------------------------------------
// 🌐 同步 鱼塘数据 到 3D 场景
// ------------------------------------------------------------
function syncFishPondDataTo3D() {
    if (!aquarium3D.initialized || !aquarium3D.scene) return;

    const activeIds = new Set(Object.keys(fishPondData));

    // 删除不存在的小鱼
    Object.keys(aquarium3D.fishMeshes).forEach(id => {
        if (!activeIds.has(id)) {
            aquarium3D.scene.remove(aquarium3D.fishMeshes[id].group);
            delete aquarium3D.fishMeshes[id];
        }
    });

    // 新建或更新 3D 小鱼 Mesh
    Object.values(fishPondData).forEach(fish => {
        const targetX = (fish.x - 50) * 0.24;
        const targetY = (50 - fish.y) * 0.10;
        
        if (!aquarium3D.fishMeshes[fish.id]) {
            // 新建 Mesh
            const meshData = create3DFishMesh(fish.emoji, fish.name, fish.level || 1);
            const startZ = (Math.random() - 0.5) * 8;
            meshData.group.position.set(targetX, targetY, startZ);

            aquarium3D.scene.add(meshData.group);
            aquarium3D.fishMeshes[fish.id] = {
                group: meshData.group,
                tailGroup: meshData.tailGroup,
                currentPos: new THREE.Vector3(targetX, targetY, startZ),
                targetPos: new THREE.Vector3(targetX, targetY, startZ),
                data: fish
            };
        } else {
            // 更新位置与数据
            const fishObj = aquarium3D.fishMeshes[fish.id];
            fishObj.targetPos.x = targetX;
            fishObj.targetPos.y = targetY;
            fishObj.data = fish;
        }
    });
}

// ------------------------------------------------------------
// 🌿 3D Procedural 海藻
// ------------------------------------------------------------
function createSeaweeds3D() {
    aquarium3D.seaweeds = [];
    const mat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        roughness: 0.6,
        side: THREE.DoubleSide
    });

    const positions = [
        [-12, -6, -4], [-8, -6, -2], [-4, -6, -5],
        [4, -6, -3], [9, -6, -5], [13, -6, -2],
        [-10, -6, 2], [11, -6, 3]
    ];

    positions.forEach((p, idx) => {
        const group = new THREE.Group();
        group.position.set(p[0], p[1], p[2]);

        const bladeCount = Math.floor(Math.random() * 4) + 3;
        for (let b = 0; b < bladeCount; b++) {
            const height = Math.random() * 3 + 3;
            const geo = new THREE.PlaneGeometry(0.35, height, 1, 8);
            const pos = geo.attributes.position;
            for (let i = 0; i < pos.count; i++) {
                const yVal = pos.getY(i);
                const curve = Math.sin((yVal / height) * Math.PI) * 0.3;
                pos.setX(i, pos.getX(i) + curve);
            }
            geo.computeVertexNormals();

            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set((Math.random() - 0.5) * 0.6, height / 2, (Math.random() - 0.5) * 0.6);
            mesh.rotation.y = Math.random() * Math.PI;
            mesh.castShadow = true;
            group.add(mesh);
        }

        aquarium3D.scene.add(group);
        aquarium3D.seaweeds.push({ group, offset: idx * 0.8 });
    });
}

// ------------------------------------------------------------
// 🫧 气泡粒子系统
// ------------------------------------------------------------
function createBubblesParticleSystem() {
    const bubbleCount = 120;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(bubbleCount * 3);
    const speeds = new Float32Array(bubbleCount);
    const sizes = new Float32Array(bubbleCount);

    for (let i = 0; i < bubbleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 28;
        positions[i * 3 + 1] = Math.random() * 14 - 6;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 14;

        speeds[i] = Math.random() * 0.03 + 0.015;
        sizes[i] = Math.random() * 0.15 + 0.05;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Simple circle points material
    const canvas = document.createElement('canvas');
    canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    grad.addColorStop(0.4, 'rgba(164, 235, 255, 0.6)');
    grad.addColorStop(1, 'rgba(0, 212, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(16, 16, 16, 0, Math.PI * 2); ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.PointsMaterial({
        size: 0.4,
        map: texture,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(geometry, material);
    aquarium3D.scene.add(particles);
    aquarium3D.bubbles = { particles, speeds, positions };
}

// ------------------------------------------------------------
// 🐠 3D 小鱼 Procedural Mesh 模型创建
// ------------------------------------------------------------
function create3DFishMesh(emoji, name) {
    const fishGroup = new THREE.Group();

    // 提取配色方案
    let bodyColor = 0xff7b00; // 默认热带橙
    let accentColor = 0xffffff;
    let sizeScale = 1.0;

    if (emoji === '🐟') { bodyColor = 0x0077b6; accentColor = 0xffd166; sizeScale = 0.95; }
    else if (emoji === '🐡') { bodyColor = 0xe76f51; accentColor = 0xf4a261; sizeScale = 1.1; }
    else if (emoji === '🦈') { bodyColor = 0x457b9d; accentColor = 0xf1faee; sizeScale = 1.35; }
    else if (emoji === '🐬') { bodyColor = 0x2a9d8f; accentColor = 0xe9c46a; sizeScale = 1.25; }
    else if (emoji === '🐳') { bodyColor = 0x1d3557; accentColor = 0x457b9d; sizeScale = 1.4; }

    const bodyMat = new THREE.MeshStandardMaterial({
        color: bodyColor,
        roughness: 0.35,
        metalness: 0.15
    });
    const accentMat = new THREE.MeshStandardMaterial({
        color: accentColor,
        roughness: 0.3
    });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x050505 });

    // 1. 鱼身 (Body)
    const bodyGeo = new THREE.SphereGeometry(0.8, 16, 16);
    bodyGeo.scale(1.3, 0.7, 0.45);
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.castShadow = true;
    fishGroup.add(bodyMesh);

    // 2. 尾巴 (Tail)
    const tailGroup = new THREE.Group();
    tailGroup.position.set(-1.0, 0, 0);

    const tailGeo = new THREE.ConeGeometry(0.6, 1.0, 12);
    tailGeo.rotateZ(Math.PI / 2);
    tailGeo.scale(0.8, 1.2, 0.2);
    const tailMesh = new THREE.Mesh(tailGeo, accentMat);
    tailMesh.position.set(-0.4, 0, 0);
    tailMesh.castShadow = true;
    tailGroup.add(tailMesh);

    fishGroup.add(tailGroup);

    // 3. 背鳍 (Dorsal Fin)
    const dorsalGeo = new THREE.ConeGeometry(0.4, 0.8, 8);
    dorsalGeo.scale(0.8, 1.0, 0.15);
    const dorsalMesh = new THREE.Mesh(dorsalGeo, accentMat);
    dorsalMesh.position.set(0.1, 0.65, 0);
    dorsalMesh.rotation.z = -Math.PI * 0.15;
    fishGroup.add(dorsalMesh);

    // 4. 侧鳍 (Side Fins)
    const finGeo = new THREE.ConeGeometry(0.3, 0.5, 6);
    finGeo.scale(0.6, 1.0, 0.1);
    
    const leftFin = new THREE.Mesh(finGeo, accentMat);
    leftFin.position.set(0.3, -0.1, 0.35);
    leftFin.rotation.set(0.3, 0.5, -0.6);
    fishGroup.add(leftFin);

    const rightFin = new THREE.Mesh(finGeo, accentMat);
    rightFin.position.set(0.3, -0.1, -0.35);
    rightFin.rotation.set(-0.3, -0.5, -0.6);
    fishGroup.add(rightFin);

    // 5. 眼睛 (Eyes)
    const eyeGeo = new THREE.SphereGeometry(0.12, 10, 10);
    const pupilGeo = new THREE.SphereGeometry(0.06, 8, 8);

    // 左眼
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(0.65, 0.15, 0.28);
    const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
    leftPupil.position.set(0.72, 0.15, 0.32);
    fishGroup.add(leftEye); fishGroup.add(leftPupil);

    // 右眼
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.65, 0.15, -0.28);
    const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
    rightPupil.position.set(0.72, 0.15, -0.32);
    fishGroup.add(rightEye); fishGroup.add(rightPupil);

    // 统一缩放
    fishGroup.scale.set(sizeScale, sizeScale, sizeScale);

    return {
        group: fishGroup,
        tailGroup: tailGroup
    };
}

// ------------------------------------------------------------
// 🪼 3D 脉动发光水母 (Procedural Bioluminescent Jellyfish)
// ------------------------------------------------------------
function createJellyfishes3D() {
    aquarium3D.jellyfishes = [];
    const colors = [0x38bdf8, 0xc084fc, 0x34d399];
    
    colors.forEach((col, idx) => {
        const group = new THREE.Group();
        const capGeo = new THREE.SphereGeometry(0.9, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55);
        const capMat = new THREE.MeshStandardMaterial({
            color: col,
            emissive: col,
            emissiveIntensity: 0.45,
            transparent: true,
            opacity: 0.75,
            roughness: 0.1,
            side: THREE.DoubleSide
        });
        const capMesh = new THREE.Mesh(capGeo, capMat);
        group.add(capMesh);

        // 触手 (Tentacles)
        const tentacles = [];
        const tCount = 6;
        for (let t = 0; t < tCount; t++) {
            const angle = (t / tCount) * Math.PI * 2;
            const geo = new THREE.CylinderGeometry(0.04, 0.01, 1.8, 6);
            const mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.6 });
            const mesh = new THREE.Mesh(geo, mat);
            const r = 0.55;
            mesh.position.set(Math.cos(angle) * r, -0.9, Math.sin(angle) * r);
            group.add(mesh);
            tentacles.push(mesh);
        }

        const startX = (idx - 1) * 8 + (Math.random() - 0.5) * 3;
        const startY = Math.random() * 3 + 1;
        const startZ = (Math.random() - 0.5) * 6;
        group.position.set(startX, startY, startZ);

        aquarium3D.scene.add(group);
        aquarium3D.jellyfishes.push({ group, tentacles, offset: idx * 2.0 });
    });
}

function spawn3DRipple(x, y, z) {
    if (!aquarium3D.initialized || !aquarium3D.scene) return;
    const geo = new THREE.RingGeometry(0.1, 0.25, 32);
    const mat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    aquarium3D.scene.add(mesh);
    aquarium3D.ripples.push({ mesh, scale: 1, opacity: 0.9 });
}

// ------------------------------------------------------------
// 🔄 渲染主循环 (Animation Render Loop)
// ------------------------------------------------------------
function animate3DAquarium() {
    aquarium3D.animId = requestAnimationFrame(animate3DAquarium);

    if (!aquarium3D.initialized || !aquarium3D.scene) return;

    const delta = aquarium3D.clock.getDelta();
    const elapsedTime = aquarium3D.clock.getElapsedTime();

    // 1. 镜头追踪模式 (Camera Tracking Mode)
    if (aquarium3D.cameraPreset === 'follow' && myPondFishId && aquarium3D.fishMeshes[myPondFishId]) {
        const my3DFish = aquarium3D.fishMeshes[myPondFishId];
        const fp = my3DFish.group.position;
        aquarium3D.controls.target.lerp(fp, 0.05);
    }
    if (aquarium3D.controls) aquarium3D.controls.update();

    // 2. 🔴 逗鱼激光笔 3D 光斑更新与引鱼逻辑
    if (aquarium3D.isLaserActive && aquarium3D.laserMesh) {
        aquarium3D.laserMesh.visible = true;
        const lx = aquarium3D.mouse.x * 12;
        const ly = Math.max(-5.5, aquarium3D.mouse.y * 6);
        aquarium3D.laserMesh.position.set(lx, ly, 0);

        // 引导小鱼蜂拥朝激光红斑游动
        Object.values(aquarium3D.fishMeshes).forEach(f => {
            if (f.currentPos.distanceTo(aquarium3D.laserMesh.position) < 14) {
                f.targetPos.set(lx + (Math.random() - 0.5) * 1.8, ly + (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 3);
            }
        });
    }

    // 3. 气泡上升逻辑
    if (aquarium3D.bubbles) {
        const { positions, speeds } = aquarium3D.bubbles;
        const count = speeds.length;
        for (let i = 0; i < count; i++) {
            positions[i * 3 + 1] += speeds[i];
            positions[i * 3] += Math.sin(elapsedTime * 2 + i) * 0.01;
            if (positions[i * 3 + 1] > 8) {
                positions[i * 3 + 1] = -6;
            }
        }
        aquarium3D.bubbles.particles.geometry.attributes.position.needsUpdate = true;
    }

    // 4. 海藻水流晃动
    aquarium3D.seaweeds.forEach(sw => {
        sw.group.rotation.z = Math.sin(elapsedTime * 1.5 + sw.offset) * 0.08;
        sw.group.rotation.x = Math.cos(elapsedTime * 1.2 + sw.offset) * 0.05;
    });

    // 5. 🪼 脉动发光水母动画
    aquarium3D.jellyfishes.forEach(jf => {
        const pulse = Math.sin(elapsedTime * 2.5 + jf.offset);
        jf.group.scale.set(1 + pulse * 0.08, 1 - pulse * 0.08, 1 + pulse * 0.08);
        jf.group.position.y += Math.sin(elapsedTime * 1.5 + jf.offset) * 0.008;
        jf.tentacles.forEach((t, i) => {
            t.rotation.z = Math.sin(elapsedTime * 3 + i) * 0.15;
        });
    });

    // 6. 🐚 3D 摸鱼贝壳微幅旋转动效
    aquarium3D.shells.forEach(shell => {
        shell.rotation.y += 0.015;
    });

    // 7. 🏴‍☠️ 3D 景致装扮动画 (宝箱喷气泡/弹力彩球)
    if (aquarium3D.decors.chest) {
        const lid = aquarium3D.decors.chest.lidMesh;
        const lidOpen = Math.sin(elapsedTime * 1.2) * 0.35 + 0.35;
        lid.rotation.z = -lidOpen;
    }
    if (aquarium3D.decors.ball) {
        const ball = aquarium3D.decors.ball.ballMesh;
        ball.position.y = -1 + Math.sin(elapsedTime * 2.0) * 0.5;
        ball.rotation.y += 0.02;
    }

    // 8. 🌊 3D 水波涟漪扩撒与渐隐
    for (let i = aquarium3D.ripples.length - 1; i >= 0; i--) {
        const rip = aquarium3D.ripples[i];
        rip.scale += 0.12;
        rip.opacity -= 0.025;
        rip.mesh.scale.set(rip.scale, rip.scale, 1);
        rip.mesh.material.opacity = rip.opacity;
        if (rip.opacity <= 0) {
            aquarium3D.scene.remove(rip.mesh);
            aquarium3D.ripples.splice(i, 1);
        }
    }

    // 9. 食物 3D 物理沉降逻辑
    for (let i = aquarium3D.foodPellets.length - 1; i >= 0; i--) {
        const pellet = aquarium3D.foodPellets[i];
        pellet.mesh.position.y += pellet.vy;
        pellet.mesh.rotation.x += 0.05;
        pellet.mesh.rotation.y += 0.05;

        if (pellet.mesh.position.y <= -5.8) {
            pellet.mesh.position.y = -5.8;
        }

        pellet.age = (pellet.age || 0) + delta;
        if (pellet.age > 6) {
            aquarium3D.scene.remove(pellet.mesh);
            aquarium3D.foodPellets.splice(i, 1);
        }
    }

    // 10. 3D 小鱼游动平滑插值与尾巴摆动动画
    Object.keys(aquarium3D.fishMeshes).forEach((id, idx) => {
        const fishObj = aquarium3D.fishMeshes[id];
        if (!fishObj) return;

        // 位置 Lerp
        fishObj.currentPos.lerp(fishObj.targetPos, 0.03);
        fishObj.group.position.copy(fishObj.currentPos);

        // 自然浮沉呼吸动效
        fishObj.group.position.y += Math.sin(elapsedTime * 3 + idx) * 0.005;

        // 计算游动转向角度
        const dx = fishObj.targetPos.x - fishObj.currentPos.x;
        const dz = fishObj.targetPos.z - fishObj.currentPos.z;
        if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
            const targetAngle = Math.atan2(-dz, dx);
            let diff = targetAngle - fishObj.group.rotation.y;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            fishObj.group.rotation.y += diff * 0.05;
        }

        // 尾巴波浪摆动
        if (fishObj.tailGroup) {
            fishObj.tailGroup.rotation.y = Math.sin(elapsedTime * 9 + idx) * 0.35;
        }
    });

    // 11. 渲染场景
    aquarium3D.renderer.render(aquarium3D.scene, aquarium3D.camera);

    // 12. 更新 HTML 3D 浮动浮标标签
    updateFish3DLabels();
}

// ------------------------------------------------------------
// 🏷️ 屏幕坐标投影 3D 标签绘制
// ------------------------------------------------------------
function updateFish3DLabels() {
    if (!aquarium3D.labelsContainer || !aquarium3D.camera) return;

    const width = aquarium3D.container.clientWidth;
    const height = aquarium3D.container.clientHeight;
    const tempVec = new THREE.Vector3();

    Object.keys(aquarium3D.fishMeshes).forEach(id => {
        const fishObj = aquarium3D.fishMeshes[id];
        let labelEl = document.getElementById(`tag_3d_${id}`);

        if (!labelEl) {
            labelEl = document.createElement('div');
            labelEl.id = `tag_3d_${id}`;
            labelEl.className = `pond-fish-3d-tag ${id === myPondFishId ? 'is-mine' : ''}`;
            labelEl.onclick = (e) => {
                e.stopPropagation();
                focusOn3DFish(id);
            };
            aquarium3D.labelsContainer.appendChild(labelEl);
        }

        const data = fishObj.data;
        const isHungry = data.hunger < 30;
        if (isHungry) labelEl.classList.add('hungry'); else labelEl.classList.remove('hungry');

        labelEl.innerHTML = `
            <span>${data.emoji || '🐟'}</span>
            <span class="fish-name">${data.name}</span>
            <span class="fish-badge">${isHungry ? '💭饿' : '❤️'}</span>
        `;

        // 计算 3D 世界坐标映射到 2D 像素
        tempVec.copy(fishObj.group.position);
        tempVec.y += 1.3; // 标头偏移
        tempVec.project(aquarium3D.camera);

        // 判断是否在视野前方
        if (tempVec.z < 1) {
            const x = (tempVec.x * 0.5 + 0.5) * width;
            const y = (-(tempVec.y * 0.5) + 0.5) * height;
            labelEl.style.left = `${x}px`;
            labelEl.style.top = `${y}px`;
            labelEl.style.display = 'flex';
        } else {
            labelEl.style.display = 'none';
        }
    });

    // 清理已离场的标签
    const existingTags = aquarium3D.labelsContainer.querySelectorAll('.pond-fish-3d-tag');
    existingTags.forEach(tag => {
        const fishId = tag.id.replace('tag_3d_', '');
        if (!aquarium3D.fishMeshes[fishId]) tag.remove();
    });
}

// ------------------------------------------------------------
// 🌐 同步 Firebase 数据到 3D 场景
// ------------------------------------------------------------
function syncFishPondDataTo3D() {
    if (!aquarium3D.initialized || !aquarium3D.scene) return;

    const activeIds = new Set(Object.keys(fishPondData));

    // 删除不存存的小鱼
    Object.keys(aquarium3D.fishMeshes).forEach(id => {
        if (!activeIds.has(id)) {
            aquarium3D.scene.remove(aquarium3D.fishMeshes[id].group);
            delete aquarium3D.fishMeshes[id];
        }
    });

    // 更新或新建 3D 小鱼
    Object.values(fishPondData).forEach(fish => {
        // Firebase % 坐标映射到 3D 世界 bounds (-12.5~12.5, -5~5, -6~6)
        const targetX = (fish.x - 50) * 0.24;
        const targetY = (50 - fish.y) * 0.10;
        
        if (!aquarium3D.fishMeshes[fish.id]) {
            // 新建 Mesh
            const meshData = create3DFishMesh(fish.emoji, fish.name);
            const startZ = (Math.random() - 0.5) * 8;
            meshData.group.position.set(targetX, targetY, startZ);

            aquarium3D.scene.add(meshData.group);
            aquarium3D.fishMeshes[fish.id] = {
                group: meshData.group,
                tailGroup: meshData.tailGroup,
                currentPos: new THREE.Vector3(targetX, targetY, startZ),
                targetPos: new THREE.Vector3(targetX, targetY, startZ),
                data: fish
            };
        } else {
            // 更新目标位置
            const fishObj = aquarium3D.fishMeshes[fish.id];
            fishObj.targetPos.x = targetX;
            fishObj.targetPos.y = targetY;
            fishObj.data = fish;
        }
    });
}

// ------------------------------------------------------------
// 🍔 3D 投喂动画食物沉降
// ------------------------------------------------------------
function spawn3DFoodPellet(targetX, targetZ) {
    if (!aquarium3D.initialized || !aquarium3D.scene) return;

    const geo = new THREE.SphereGeometry(0.18, 10, 10);
    const mat = new THREE.MeshStandardMaterial({
        color: 0xd35400,
        emissive: 0x6e2c00,
        roughness: 0.4
    });
    const mesh = new THREE.Mesh(geo, mat);

    const startX = targetX !== undefined ? targetX : (Math.random() - 0.5) * 16;
    const startZ = targetZ !== undefined ? targetZ : (Math.random() - 0.5) * 8;
    mesh.position.set(startX, 6, startZ);

    aquarium3D.scene.add(mesh);
    aquarium3D.foodPellets.push({ mesh, vy: -0.045, age: 0 });

    // 让附近的小鱼朝食物游动
    Object.values(aquarium3D.fishMeshes).forEach(f => {
        if (Math.abs(f.currentPos.x - startX) < 8) {
            f.targetPos.set(startX + (Math.random() - 0.5) * 1.5, Math.max(-4, f.currentPos.y), startZ);
        }
    });
}

// ------------------------------------------------------------
// 🎯 视角与点击交互
// ------------------------------------------------------------
function focusOn3DFish(fishId) {
    const fishObj = aquarium3D.fishMeshes[fishId];
    if (!fishObj || !aquarium3D.controls) return;

    const p = fishObj.group.position;
    aquarium3D.controls.target.set(p.x, p.y, p.z);
}

function resetFishPond3DCamera() {
    if (!aquarium3D.controls) return;
    aquarium3D.controls.target.set(0, 0, 0);
    aquarium3D.camera.position.set(0, 2, 22);
}

function onAquariumCanvasClick(event) {
    if (!aquarium3D.initialized) return;

    const rect = aquarium3D.renderer.domElement.getBoundingClientRect();
    aquarium3D.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    aquarium3D.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    aquarium3D.raycaster.setFromCamera(aquarium3D.mouse, aquarium3D.camera);
    
    // 收集所有鱼身 mesh
    const fishGroupList = Object.values(aquarium3D.fishMeshes).map(f => f.group);
    const intersects = aquarium3D.raycaster.intersectObjects(fishGroupList, true);

    // 触发 3D 水波震荡涟漪动画
    spawn3DRipple(aquarium3D.mouse.x * 12, -5.9, aquarium3D.mouse.y * 6);

    if (intersects.length > 0) {
        let hitObj = intersects[0].object;
        while (hitObj.parent && !hitObj.parent.isScene && hitObj.parent.type !== 'Scene') {
            hitObj = hitObj.parent;
            // 匹配对应 fishId
            const matchedId = Object.keys(aquarium3D.fishMeshes).find(id => aquarium3D.fishMeshes[id].group === hitObj);
            if (matchedId) {
                focusOn3DFish(matchedId);
                break;
            }
        }
    }
}

function onAquariumResize() {
    if (!aquarium3D.initialized || !aquarium3D.container) return;

    const width = aquarium3D.container.clientWidth;
    const height = aquarium3D.container.clientHeight;

    aquarium3D.camera.aspect = width / height;
    aquarium3D.camera.updateProjectionMatrix();
    aquarium3D.renderer.setSize(width, height);
}

// ------------------------------------------------------------
// 🥽 3D 全屏沉浸模式切换
// ------------------------------------------------------------
function toggleFishPond3DFullscreen() {
    const overlay = document.getElementById('fishPond3DFullscreenOverlay');
    const container3D = document.getElementById('fishPondCanvas3D');
    const fsContainer = document.getElementById('fishPond3DFullscreenCanvasContainer');
    if (!overlay || !container3D || !fsContainer) return;

    aquarium3D.isFullscreen = !aquarium3D.isFullscreen;

    if (aquarium3D.isFullscreen) {
        overlay.style.display = 'flex';
        fsContainer.appendChild(aquarium3D.renderer.domElement);
        aquarium3D.container = fsContainer;
    } else {
        overlay.style.display = 'none';
        container3D.appendChild(aquarium3D.renderer.domElement);
        aquarium3D.container = container3D;
    }

    setTimeout(onAquariumResize, 50);
}


// ------------------------------------------------------------
// 鱼塘常规 Firebase 操作与 2D/3D 同步
// ------------------------------------------------------------
function updateMyFishLevelBadge() {
    const badge = document.getElementById('myFishLevelBadge');
    if (!badge) return;

    if (myPondFishId && fishPondData[myPondFishId]) {
        const fish = fishPondData[myPondFishId];
        const xp = fish.xp || 0;
        const level = Math.floor(xp / 100) + 1;
        const titles = ['🐣 幼苗小鱼', '🌱 潜水鱼', '🐟 游鱼', '🐬 游乐大鱼', '👑 霸主大鱼', '🌟 传说神鱼'];
        const title = titles[Math.min(titles.length - 1, level - 1)];

        badge.style.display = 'flex';
        badge.innerHTML = `<span>${title} Lv.${level}</span> <span style="font-size:10px; opacity:0.85;">(${xp % 100}/100 XP)</span>`;
    } else {
        badge.style.display = 'none';
    }
}

function checkMyFishStatus() {
    const btnClaim = document.getElementById('btnClaimFish');
    const btnFeed = document.getElementById('btnFeedFish');
    if (!btnClaim || !btnFeed) return;
    
    if (myPondFishId && fishPondData[myPondFishId]) {
        btnClaim.style.display = 'none';
        btnFeed.style.display = 'inline-block';
    } else {
        btnClaim.style.display = 'inline-block';
        btnFeed.style.display = 'none';
    }

    updateMyFishLevelBadge();
}

function saveFishPondState(fishId, updatedData) {
    fishPondData[fishId] = { ...fishPondData[fishId], ...updatedData };
    localStorage.setItem('toolbox_v2_local_fish_pond', JSON.stringify(fishPondData));
    if (typeof isFirebaseConfigured === 'function' && isFirebaseConfigured()) {
        db.ref(`${FISH_POND_PATH}/${fishId}`).update(updatedData);
    }
    renderFishPond();
    checkMyFishStatus();
}

function claimMyFish() {
    const name = prompt("给你的小鱼起个可爱的名字吧 (最多 6 个字):");
    if (!name) return;
    
    const validName = name.substring(0, 6);
    
    if (!myPondFishId) {
        myPondFishId = 'fish_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        localStorage.setItem('toolbox_v2_pond_fish_id', myPondFishId);
    }
    
    const newFish = {
        id: myPondFishId,
        name: validName,
        emoji: ['🐠','🐟','🐡','🦈','🐬','🐳'][Math.floor(Math.random() * 6)],
        x: Math.floor(Math.random() * 80) + 10,
        y: Math.floor(Math.random() * 80) + 10,
        hunger: 100,
        xp: 0,
        level: 1,
        lastFedAt: Date.now()
    };
    
    saveFishPondState(myPondFishId, newFish);
}

function feedMyFish() {
    if (!myPondFishId) return;
    
    const myFish = fishPondData[myPondFishId];
    if (!myFish) return;
    
    const currentXp = (myFish.xp || 0) + 25;
    const newLevel = Math.floor(currentXp / 100) + 1;

    saveFishPondState(myPondFishId, {
        hunger: 100,
        lastFedAt: Date.now(),
        xp: currentXp,
        level: newLevel,
        y: Math.max(10, myFish.y - 15)
    });

    // 触发 3D 投喂食物动画
    if (aquarium3D.initialized) {
        const my3DFish = aquarium3D.fishMeshes[myPondFishId];
        const fx = my3DFish ? my3DFish.currentPos.x : 0;
        const fz = my3DFish ? my3DFish.currentPos.z : 0;
        spawn3DFoodPellet(fx, fz);
    }
}

function moveMyFishRandomly() {
    const myFish = fishPondData[myPondFishId];
    if (!myFish) return;
    
    const hoursSinceFed = (Date.now() - (myFish.lastFedAt || Date.now())) / (1000 * 60 * 60);
    let newHunger = Math.max(0, 100 - Math.floor(hoursSinceFed * (100 / 24))); 
    
    const newX = Math.max(5, Math.min(95, myFish.x + (Math.random() * 30 - 15)));
    const newY = Math.max(5, Math.min(90, myFish.y + (Math.random() * 20 - 10)));
    
    saveFishPondState(myPondFishId, {
        x: newX,
        y: newY,
        hunger: newHunger
    });
}

function renderFishPond() {
    // 1. 同步到 3D 水族馆引擎
    syncFishPondDataTo3D();
}

// ------------------------------------------------------------
// 🎨 Fish 页 3D 卡片 Perspective 立体倾斜效果
// ------------------------------------------------------------
function initFish3DCardsTilt() {
    const cards = document.querySelectorAll('.blog-card, .sidebar-module, .apple-card');
    cards.forEach(card => {
        card.classList.add('fish-3d-card-tilt');
        
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = ((y - centerY) / centerY) * -6; // Max 6 deg
            const rotateY = ((x - centerX) / centerX) * 6;
            
            card.style.transform = `perspective(1000px) translateY(-4px) rotateX(${rotateX.toFixed(1)}deg) rotateY(${rotateY.toFixed(1)}deg)`;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    });
}

// ============================================================
// 🎵 摸鱼原声带 (Web Audio 白噪音治愈播放器)
// ============================================================
function toggleFishSoundscape(type) {
    const btnMap = {
        'waves': 'soundBtnWaves',
        'rain': 'soundBtnRain',
        'fire': 'soundBtnFire',
        'lofi': 'soundBtnLofi'
    };

    // 如果再次点击已开启的类型，则关闭
    if (soundscapeEngine.activeType === type) {
        stopFishSoundscape();
        soundscapeEngine.activeType = null;
        Object.values(btnMap).forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) btn.classList.remove('active');
        });
        return;
    }

    // 停止之前播放
    stopFishSoundscape();
    soundscapeEngine.activeType = type;

    // 高亮当前按钮
    Object.keys(btnMap).forEach(t => {
        const btn = document.getElementById(btnMap[t]);
        if (btn) {
            if (t === type) btn.classList.add('active');
            else btn.classList.remove('active');
        }
    });

    // 初始化 AudioContext
    if (!soundscapeEngine.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        soundscapeEngine.ctx = new AudioCtx();
    }
    if (soundscapeEngine.ctx.state === 'suspended') {
        soundscapeEngine.ctx.resume();
    }

    const ctx = soundscapeEngine.ctx;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.01, ctx.currentTime);
    masterGain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 1.5);
    masterGain.connect(ctx.destination);
    soundscapeEngine.nodes.masterGain = masterGain;

    if (type === 'waves') {
        // 舒缓浪声 (Lowpass Pink Noise with LFO Modulation)
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
            output[i] *= 0.11;
            b6 = white * 0.115926;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 350;

        // LFO 模拟海浪起伏
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.12; // 8秒周期
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 250;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        whiteNoise.connect(filter);
        filter.connect(masterGain);

        lfo.start();
        whiteNoise.start();
        soundscapeEngine.nodes.source = whiteNoise;
        soundscapeEngine.nodes.lfo = lfo;

    } else if (type === 'rain') {
        // 静谧细雨 (Highpass Filtered Noise + Soft Crackles)
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = (Math.random() * 2 - 1) * 0.15;
        }
        const rainNoise = ctx.createBufferSource();
        rainNoise.buffer = noiseBuffer;
        rainNoise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1200;
        filter.Q.value = 0.8;

        rainNoise.connect(filter);
        filter.connect(masterGain);
        rainNoise.start();
        soundscapeEngine.nodes.source = rainNoise;

    } else if (type === 'fire') {
        // 篝火白噪音 (Lowpass noise + Crackle Pop Nodes)
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = (Math.random() * 2 - 1) * 0.08;
        }
        const fireNoise = ctx.createBufferSource();
        fireNoise.buffer = noiseBuffer;
        fireNoise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 450;

        fireNoise.connect(filter);
        filter.connect(masterGain);
        fireNoise.start();
        soundscapeEngine.nodes.source = fireNoise;

    } else if (type === 'lofi') {
        // 治愈 Lo-Fi 五声音阶五重奏 (Healing Pentatonic Ambient Synth)
        const notes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25]; // C4 D4 E4 G4 A4 C5
        let noteIdx = 0;

        const synthInterval = setInterval(() => {
            if (!soundscapeEngine.ctx || soundscapeEngine.activeType !== 'lofi') {
                clearInterval(synthInterval);
                return;
            }
            const freq = notes[Math.floor(Math.random() * notes.length)];
            const osc = ctx.createOscillator();
            const oscGain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;

            oscGain.gain.setValueAtTime(0.001, ctx.currentTime);
            oscGain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.3);
            oscGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 3.0);

            osc.connect(oscGain);
            oscGain.connect(masterGain);

            osc.start();
            osc.stop(ctx.currentTime + 3.2);
        }, 1200);

        soundscapeEngine.nodes.synthInterval = synthInterval;
    }
}

function stopFishSoundscape() {
    if (soundscapeEngine.nodes.masterGain && soundscapeEngine.ctx) {
        soundscapeEngine.nodes.masterGain.gain.exponentialRampToValueAtTime(0.0001, soundscapeEngine.ctx.currentTime + 0.5);
    }
    setTimeout(() => {
        if (soundscapeEngine.nodes.source) {
            try { soundscapeEngine.nodes.source.stop(); } catch(e){}
        }
        if (soundscapeEngine.nodes.lfo) {
            try { soundscapeEngine.nodes.lfo.stop(); } catch(e){}
        }
        if (soundscapeEngine.nodes.synthInterval) {
            clearInterval(soundscapeEngine.nodes.synthInterval);
        }
        soundscapeEngine.nodes = {};
    }, 600);
}

// ------------------------------------------------------------
// 🌌 3D 沉浸背景模式切换
// ------------------------------------------------------------
function toggleFish3DBackgroundMode() {
    document.body.classList.toggle('fish-page-3d-bg-mode');
    const isBg = document.body.classList.contains('fish-page-3d-bg-mode');
    aquarium3D.isBgMode = isBg;

    const btn = document.getElementById('btnToggle3DBg');
    if (btn) {
        btn.innerText = isBg ? '🖼️ 退出3D背景' : '🌌 3D沉浸背景';
    }

    setTimeout(onAquariumResize, 100);
}



