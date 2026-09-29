// ============================================================
// 🔥 Firebase 配置
// ============================================================
const firebaseConfig = {
    apiKey: "5NwpBFyRz4UG3kq0ux5ObibRABWi2N9wXtBZeGhL",
    authDomain: "tool-61b9e.firebaseapp.com",
    projectId: "tool-61b9e",
    storageBucket: "tool-61b9e.appspot.com",
    messagingSenderId: "1042928589567",
    appId: "1:1042928589567:web:tool61b9e",
    databaseURL: "https://tool-61b9e-default-rtdb.asia-southeast1.firebasedatabase.app"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const RTDB_PATH = 'toolbox/v2';

// ============================================================
// 🔥 全局状态
// ============================================================
let tabs = [];                    // 所有标签页
let activeTabId = null;           // 当前激活的标签页
let isSyncing = false;
let firebaseReady = false;
let autoSyncEnabled = false;      // 自动同步到云端（默认关闭）
let previewEnabled = true;        // 卡片预览图（默认开启）
let adminDrawerOpen = false;
let cardSize = 200;               // 卡片最小宽度（px，可由滑块调节）

// ============================================================
// 🔥 同步状态 UI
// ============================================================
function updateSyncBar(state, text) {
    const bar = document.getElementById('firebaseSyncBar');
    const icon = document.getElementById('syncIcon');
    const textEl = document.getElementById('syncText');
    if (!bar || !icon || !textEl) return;
    bar.className = 'firebase-sync-bar ' + state;
    textEl.innerText = text;
    const iconMap = { synced: '✅', syncing: '🔄', error: '❌', offline: '⚠️' };
    icon.innerText = iconMap[state] || '🔄';
}

function isFirebaseConfigured() {
    return firebaseConfig.databaseURL && firebaseConfig.databaseURL.includes("firebasedatabase.app");
}

// ============================================================
// 🏷️ 标签页系统
// ============================================================
function generateTabId() { return 'tab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5); }

function createDefaultTab() {
    return {
        id: generateTabId(),
        name: '🏠 首页',
        categories: [
            { id: "cat_audio", name: "🎵 音视频", items: [
                { id: "i1", name: "压缩 WAV", url: "https://freecompress.com/zh-cn/compress-wav", tags: ["音频"] },
                { id: "i2", name: "视频压缩", url: "https://videcompress.ai/zh-CN", tags: ["视频"] }
            ]},
            { id: "cat_image", name: "🎨 图像处理", items: [
                { id: "i3", name: "iLoveIMG", url: "https://www.iloveimg.com/zh-cn/compress-image", tags: ["图片"] },
                { id: "i4", name: "智能抠图", url: "https://www.koukoutu.com/removebgtool/all", tags: ["图片", "AI"] },
                { id: "i5", name: "九宫格切图", url: "https://uutool.cn/img-incision/", tags: ["图片", "切图"] }
            ]},
            { id: "cat_docs", name: "📂 文档", items: [
                { id: "i6", name: "飞书知识库", url: "https://boke.feishu.cn/wiki/JyyjwWMQhiocWxkun00ch81hn4c", tags: ["文档"] }
            ]},
            { id: "cat_ai", name: "🤖 AI 工具", items: [
                { id: "i7", name: "Gemini", url: "https://gemini.google.com", tags: ["AI", "谷歌"] }
            ]},
            { id: "cat_wangzhe", name: "🎮 王者", items: [
                { id: "wz1", name: "王者荣耀官网", url: "https://pvp.qq.com", tags: ["王者", "官网"] },
                { id: "wz2", name: "王者荣耀助手", url: "https://www.wzry.com", tags: ["王者", "助手"] },
                { id: "wz3", name: "TapTap 王者专区", url: "https://www.taptap.cn/app/1396", tags: ["王者", "社区"] },
                { id: "wz4", name: "掌上 WeGame", url: "https://www.wegame.com.cn", tags: ["王者", "战绩"] }
            ]}
        ]
    };
}

function createNewTab() {
    const name = prompt("输入新标签页名称：", "📋 新标签页");
    if (!name || !name.trim()) return;
    const newTab = {
        id: generateTabId(),
        name: name.trim(),
        categories: []
    };
    tabs.push(newTab);
    switchToTab(newTab.id);
    saveWithSync();
}

function renameTab(tabId) {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;
    const newName = prompt("重命名标签页：", tab.name);
    if (newName && newName.trim()) {
        tab.name = newName.trim();
        renderTabs();
        saveWithSync();
    }
}

function deleteTab(tabId) {
    if (tabs.length <= 1) {
        alert("至少保留一个标签页！");
        return;
    }
    if (!confirm("确定删除此标签页吗？")) return;
    tabs = tabs.filter(t => t.id !== tabId);
    if (activeTabId === tabId) {
        activeTabId = tabs[0].id;
    }
    renderTabs();
    renderActiveTab();
    saveWithSync();
}

function switchToTab(tabId) {
    activeTabId = tabId;
    renderTabs();
    renderActiveTab();
}

function renderTabs() {
    const navBar = document.getElementById('tabNavBar');
    if (!navBar) return;
    if (tabs.length <= 1) {
        navBar.style.display = 'none';
        return;
    }
    navBar.style.display = '';
    const addBtn = navBar.querySelector('.tab-add-btn');
    navBar.innerHTML = '';

    tabs.forEach(tab => {
        const tabEl = document.createElement('div');
        tabEl.className = 'tab-item' + (tab.id === activeTabId ? ' active' : '');
        tabEl.onclick = (e) => {
            if (e.target.classList.contains('tab-close')) return;
            switchToTab(tab.id);
        };
        tabEl.innerHTML = `
            <span>${escapeHtml(tab.name)}</span>
            <span class="tab-close" onclick="deleteTab('${tab.id}')" title="关闭">×</span>
        `;
        tabEl.oncontextmenu = (e) => {
            e.preventDefault();
            renameTab(tab.id);
        };
        navBar.appendChild(tabEl);
    });

    if (addBtn) {
        navBar.appendChild(addBtn);
    } else {
        const newAddBtn = document.createElement('div');
        newAddBtn.className = 'tab-add-btn';
        newAddBtn.onclick = createNewTab;
        newAddBtn.title = "新建标签页";
        newAddBtn.innerText = "+";
        navBar.appendChild(newAddBtn);
    }
}

// ============================================================
// 📋 渲染活动标签页内容
// ============================================================
function renderActiveTab() {
    const wrapper = document.getElementById('tabContentWrapper');
    if (!wrapper) return;
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (!activeTab) return;

    wrapper.innerHTML = `
        <div class="main-layout">
            <main class="right-workspace-content" id="mainWorkspace" style="width: 100%;"></main>
        </div>
    `;

    renderCategories();
}

// ============================================================
// ⚙️ 管理抽屉
// ============================================================
function toggleAdminDrawer(force) {
    const drawer = document.getElementById('adminDrawer');
    const overlay = document.getElementById('adminDrawerOverlay');
    if (!drawer || !overlay) return;
    const willOpen = (typeof force === 'boolean') ? force : !adminDrawerOpen;
    adminDrawerOpen = willOpen;
    drawer.classList.toggle('open', willOpen);
    overlay.classList.toggle('open', willOpen);
    drawer.setAttribute('aria-hidden', willOpen ? 'false' : 'true');
    if (willOpen) renderAdminDrawer();
}

function renderAdminDrawer() {
    const body = document.getElementById('adminDrawerBody');
    if (!body) return;
    body.innerHTML = `
        <div class="sidebar-title">📁 板块管理</div>
        <div class="form-group">
            <input type="text" id="newCatName" class="form-input" placeholder="输入新板块名称">
            <button onclick="createNewCategory()" class="form-btn blue-btn">新建板块</button>
        </div>

        <div class="sidebar-title" style="color: var(--edit-color);">🔗 添加卡片</div>
        <div class="form-group">
            <label style="font-size:12px; color:var(--text-muted);">目标板块：</label>
            <select id="siteCategorySelect" class="form-select"></select>
            <label style="font-size:12px; color:var(--text-muted); margin-top:4px;">卡片名称：</label>
            <input type="text" id="siteName" class="form-input" placeholder="名称(留空自动提取)">
            <label style="font-size:12px; color:var(--text-muted); margin-top:4px;">URL：</label>
            <input type="text" id="siteUrl" class="form-input" placeholder="https://...">
            <label style="font-size:12px; color:var(--text-muted); margin-top:4px;">标签（可选，逗号分隔）：</label>
            <input type="text" id="siteTags" class="form-input" placeholder="如: 图片,AI,工具（不填也可以）">
            <button onclick="addCustomSite()" class="form-btn" style="margin-top: 5px;">添加卡片</button>
        </div>
    `;
    refreshSidebarDropdown();
    const topCb = document.getElementById('autoSyncCheckboxTop');
    if (topCb) topCb.checked = autoSyncEnabled;
}

function setCardSize(px) {
    cardSize = Math.max(160, Math.min(380, parseInt(px, 10) || 200));
    try { localStorage.setItem('toolbox_v2_cardSize', String(cardSize)); } catch (e) {}
    document.documentElement.style.setProperty('--card-min-width', cardSize + 'px');
}

function togglePreviewMode(enabled) {
    previewEnabled = !!enabled;
    try { localStorage.setItem('toolbox_v2_preview', previewEnabled ? '1' : '0'); } catch (e) {}
    renderCategories();
}

function getPreviewImageUrl(url) {
    try {
        const u = new URL(url);
        return 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(u.hostname) + '&sz=128';
    } catch (e) {
        return '';
    }
}

function renderCategories() {
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (!activeTab) return;

    const workspace = document.getElementById('mainWorkspace');
    if (!workspace) return;
    workspace.innerHTML = '';

    activeTab.categories.forEach((category) => {
        const items = category.items;

        const catSection = document.createElement('section');
        catSection.className = 'category';
        catSection.setAttribute('data-cat-id', category.id);

        const catHeader = document.createElement('div');
        catHeader.className = 'category-header';
        catHeader.innerHTML = `
            <div class="category-title-wrap">
                <span class="category-title">${escapeHtml(category.name)}</span>
            </div>
            <div>
                <button class="action-icon-btn" onclick="editCategoryName('${category.id}')">✏️</button>
                <button class="action-icon-btn del" onclick="deleteCategory('${category.id}')">🗑️</button>
            </div>
        `;
        catSection.appendChild(catHeader);

        const grid = document.createElement('div');
        grid.className = 'grid';
        grid.setAttribute('data-cat-id', category.id);

        items.forEach((item) => {
            const card = document.createElement('div');
            card.setAttribute('data-item-id', item.id);
            card.className = 'card';
            card.onclick = (e) => {
                if (e.target.classList.contains('menu-btn')) return;
                window.open(item.url, '_blank');
            };

            const tagsHtml = item.tags ? item.tags.map(t => `<span class="card-tag">${escapeHtml(t)}</span>`).join('') : '';
            const faviconSrc = previewEnabled && item.url ? getPreviewImageUrl(item.url) : '';
            const faviconHtml = faviconSrc
                ? `<div class="card-favicon" data-preview-url="${escapeHtml(item.url)}">
                        <div class="preview-loading">⏳</div>
                        <img src="${faviconSrc}" alt="${escapeHtml(item.name)}" loading="lazy" referrerpolicy="no-referrer"
                             onload="this.parentElement.classList.add('loaded')"
                             onerror="this.style.display='none'; this.parentElement.classList.add('loaded'); ">
                   </div>`
                : `<div class="card-favicon loaded"><span style="font-size:18px;">🔗</span></div>`;

            card.innerHTML = `
                <div class="card-row">
                    ${faviconHtml}
                    <div class="card-text">
                        <div class="card-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
                        <div class="card-desc" title="${escapeHtml(item.url)}">${escapeHtml(item.url)}</div>
                    </div>
                </div>
                <div class="card-tags card-tags-row">${tagsHtml}</div>
                <div class="card-menu">
                    <button class="menu-btn" onclick="editCard('${category.id}', '${item.id}')">改</button>
                    <button class="menu-btn" onclick="deleteCard('${category.id}', '${item.id}')">删</button>
                </div>
            `;
            grid.appendChild(card);
        });

        catSection.appendChild(grid);
        workspace.appendChild(catSection);

        Sortable.create(grid, {
            group: 'shared-cards-' + activeTabId,
            animation: 160,
            onEnd: function (evt) {
                const fromCatId = evt.from.getAttribute('data-cat-id');
                const toCatId = evt.to.getAttribute('data-cat-id');
                const itemId = evt.item.getAttribute('data-item-id');
                const fromCat = activeTab.categories.find(c => c.id === fromCatId);
                const toCat = activeTab.categories.find(c => c.id === toCatId);
                if (!fromCat || !toCat) return;
                const itemObj = fromCat.items.find(i => i.id === itemId);
                if (!itemObj) return;
                fromCat.items.splice(fromCat.items.indexOf(itemObj), 1);
                toCat.items.splice(evt.newIndex, 0, itemObj);
                saveWithSync();
            }
        });
    });

    Sortable.create(workspace, {
        animation: 200,
        handle: '.category-title-wrap',
        onEnd: function (evt) {
            const movedCat = activeTab.categories.splice(evt.oldIndex, 1)[0];
            activeTab.categories.splice(evt.newIndex, 0, movedCat);
            saveWithSync();
            refreshSidebarDropdown();
        }
    });
}

function refreshSidebarDropdown() {
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (!activeTab) return;
    const select = document.getElementById('siteCategorySelect');
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = '';
    activeTab.categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.innerText = cat.name.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, '').trim();
        select.appendChild(option);
    });
    if (currentVal && activeTab.categories.some(c => c.id === currentVal)) {
        select.value = currentVal;
    }
}

// ============================================================
// 🔥 数据操作
// ============================================================
function createNewCategory() {
    const input = document.getElementById('newCatName');
    if (!input) return;
    const name = input.value.trim();
    if (!name) return alert('名称不能为空！');
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (!activeTab) return;
    activeTab.categories.unshift({ id: 'cat_' + Date.now(), name: '📁 ' + name, items: [] });
    saveWithSync();
    renderActiveTab();
    input.value = '';
}

function deleteCategory(catId) {
    if (!confirm('确定删除此板块吗？')) return;
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (!activeTab) return;
    activeTab.categories = activeTab.categories.filter(c => c.id !== catId);
    saveWithSync();
    renderActiveTab();
}

function editCategoryName(catId) {
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (!activeTab) return;
    const cat = activeTab.categories.find(c => c.id === catId);
    const newName = prompt('重命名板块：', cat.name);
    if (newName && newName.trim()) { cat.name = newName.trim(); saveWithSync(); renderActiveTab(); }
}

function addCustomSite() {
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (!activeTab) return;
    const catSelect = document.getElementById('siteCategorySelect');
    const nameInput = document.getElementById('siteName');
    const urlInput = document.getElementById('siteUrl');
    const tagsInput = document.getElementById('siteTags');
    if (!catSelect || !nameInput || !urlInput || !tagsInput) return;
    const catId = catSelect.value;
    let name = nameInput.value.trim();
    let url = urlInput.value.trim();
    const tagsStr = tagsInput.value.trim();
    if (!catId || !url) return alert('URL 为必填项！');
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    if (!name) {
        try { const urlObj = new URL(url); name = urlObj.hostname.replace('www.', '').split('.')[0].toUpperCase(); } catch (e) { name = '未命名'; }
    }
    const tags = tagsStr ? tagsStr.split(/[,，]/).map(t => t.trim()).filter(t => t) : [];
    const targetCat = activeTab.categories.find(c => c.id === catId);
    targetCat.items.push({ id: 'item_' + Date.now(), name, url, tags });
    saveWithSync();
    renderActiveTab();
    nameInput.value = ''; urlInput.value = ''; tagsInput.value = '';
}

function editCard(catId, itemId) {
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (!activeTab) return;
    const cat = activeTab.categories.find(c => c.id === catId);
    const item = cat.items.find(i => i.id === itemId);
    const newName = prompt('重命名卡片：', item.name);
    if (newName && newName.trim()) { item.name = newName.trim(); saveWithSync(); renderActiveTab(); }
}

function deleteCard(catId, itemId) {
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (!activeTab) return;
    const cat = activeTab.categories.find(c => c.id === catId);
    cat.items = cat.items.filter(i => i.id !== itemId);
    saveWithSync();
    renderActiveTab();
}

// ============================================================
// 🔥 云端同步
// ============================================================
async function syncToCloud() {
    if (!isFirebaseConfigured() || isSyncing) return;
    isSyncing = true;
    updateSyncBar('syncing', '🔄 正在保存到云端...');
    try {
        await db.ref(RTDB_PATH).update({
            tabs: tabs,
            activeTabId: activeTabId,
            updatedAt: Date.now(),
            updatedBy: 'web-client'
        });
        firebaseReady = true;
        updateSyncBar('synced', '✅ 数据已同步到云端');
    } catch (e) {
        console.error('同步失败:', e);
        updateSyncBar('error', '❌ 同步失败: ' + e.message);
    }
    isSyncing = false;
}

function ensureTabsState() {
    if (!Array.isArray(tabs) || tabs.length === 0) {
        tabs = [createDefaultTab()];
    }
    if (!tabs.some(tab => tab.id === activeTabId)) {
        activeTabId = tabs[0].id;
    }
}

function normalizeTab(tab) {
    if (!tab || typeof tab !== 'object') return null;
    if (!tab.id) tab.id = 'tab_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    if (typeof tab.name !== 'string') tab.name = '🏷️ 标签页';
    if (!Array.isArray(tab.categories)) tab.categories = [];
    tab.categories.forEach((cat) => {
        if (!cat || typeof cat !== 'object') return;
        if (!cat.id) cat.id = 'cat_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        if (typeof cat.name !== 'string') cat.name = '📁 未命名板块';
        if (!Array.isArray(cat.items)) cat.items = [];
        cat.items.forEach((item) => {
            if (!item || typeof item !== 'object') return;
            if (!item.id) item.id = 'item_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
            if (typeof item.name !== 'string') item.name = '未命名';
            if (typeof item.url !== 'string') item.url = '';
            if (!Array.isArray(item.tags)) item.tags = [];
        });
    });
    return tab;
}

function applyCloudState(cloudData) {
    if (!cloudData || !Array.isArray(cloudData.tabs) || cloudData.tabs.length === 0) {
        return false;
    }
    tabs = cloudData.tabs.map(normalizeTab).filter(Boolean);
    activeTabId = cloudData.activeTabId || (tabs[0] && tabs[0].id);
    ensureTabsState();
    renderTabs();
    renderActiveTab();
    firebaseReady = true;
    return true;
}

async function syncFromCloud(showStatusText = '✅ 已拉取最新数据') {
    if (!isFirebaseConfigured() || isSyncing) return 'skipped';
    isSyncing = true;
    updateSyncBar('syncing', '🔄 正在从云端拉取...');
    try {
        const snapshot = await db.ref(RTDB_PATH).once('value');
        const cloudData = snapshot.val();
        if (applyCloudState(cloudData)) {
            updateSyncBar('synced', showStatusText);
            return 'loaded';
        } else {
            updateSyncBar('offline', '⚠️ 云端暂无数据');
            return 'empty';
        }
    } catch (e) {
        console.error('拉取失败:', e);
        updateSyncBar('error', '❌ 拉取失败: ' + e.message);
        return 'error';
    } finally {
        isSyncing = false;
    }
}

async function saveToCloudAndReload() {
    if (!isFirebaseConfigured() || isSyncing) return;
    isSyncing = true;
    updateSyncBar('syncing', '🔄 正在保存并刷新数据库...');
    try {
        await db.ref(RTDB_PATH).update({
            tabs: tabs,
            activeTabId: activeTabId,
            updatedAt: Date.now(),
            updatedBy: 'web-client'
        });
        const snapshot = await db.ref(RTDB_PATH).once('value');
        const cloudData = snapshot.val();
        if (!applyCloudState(cloudData)) {
            throw new Error('保存成功，但重新加载数据库失败');
        }
        updateSyncBar('synced', '✅ 已保存并刷新数据库');
    } catch (e) {
        console.error('保存并刷新失败:', e);
        updateSyncBar('error', '❌ 保存失败: ' + e.message);
    } finally {
        isSyncing = false;
    }
}

async function initializeFromCloud() {
    if (!isFirebaseConfigured()) {
        updateSyncBar('offline', '⚠️ Firebase 未配置');
        ensureTabsState();
        renderTabs();
        renderActiveTab();
        return;
    }
    updateSyncBar('syncing', '🔄 正在加载数据库...');
    const loadStatus = await syncFromCloud('✅ 已加载最新数据库');
    if (loadStatus === 'loaded') return;

    ensureTabsState();
    renderTabs();
    renderActiveTab();

    if (loadStatus === 'empty') {
        await syncToCloud();
        if (firebaseReady) {
            updateSyncBar('synced', '✅ 云端为空，已初始化默认数据');
        }
    }
}

function renderPageLockState() {
    const dot = document.getElementById('lockStatusDot');
    const text = document.getElementById('lockStatusText');
    const btn = document.getElementById('lockToggleBtn');
    if (!dot || !text || !btn) return;
    if (isPageLocked) {
        dot.className = 'lock-status-dot is-locked';
        text.innerText = '已开启防关闭保护';
        text.style.color = 'var(--danger-color)';
        btn.innerText = '解除固定';
        btn.className = 'form-btn red-btn';
    } else {
        dot.className = 'lock-status-dot';
        text.innerText = '未锁定';
        text.style.color = 'var(--text-muted)';
        btn.innerText = '点击固定';
        btn.className = 'form-btn blue-btn';
    }
}

function forceSyncFromCloud() {
    if (!isFirebaseConfigured()) { alert('⚠️ Firebase 未配置'); return; }
    syncFromCloud();
}

// ============================================================
// 💾 本地存储
// ============================================================
function toggleAutoSync(enabled) {
    autoSyncEnabled = !!enabled;
    try { localStorage.setItem('toolbox_v2_autoSync', autoSyncEnabled ? '1' : '0'); } catch (e) {}
    const topCb = document.getElementById('autoSyncCheckboxTop');
    if (topCb) topCb.checked = autoSyncEnabled;
    if (autoSyncEnabled) {
        updateSyncBar('synced', '已开启自动同步');
    } else {
        updateSyncBar('offline', '自动同步已关闭');
    }
}

function saveWithSync() {
    if (autoSyncEnabled && isFirebaseConfigured()) {
        saveToCloudAndReload();
    } else {
        updateSyncBar('offline', '⚪ 已本地保存（未开启自动同步）');
    }
}

// ============================================================
// 🎨 主题
// ============================================================
const themeRecipes = {
    apple: `:root { --bg-color: #f5f5f7; --container-bg: rgba(255, 255, 255, 0.75); --text-color: #1d1d1f; --text-muted: #86868b; --accent-color: #0071e3; --card-bg: rgba(255, 255, 255, 0.65); --card-hover-bg: #ffffff; --border-color: rgba(0, 0, 0, 0.08); --danger-color: #ff3b30; --edit-color: #0071e3; --orange-color: #f56300; --panel-gradient: linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(245,245,247,0.9) 100%); --tag-bg: rgba(0, 113, 227, 0.1); --tag-border: rgba(0, 113, 227, 0.2); }
    body { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif; background-color: var(--bg-color); background-image: radial-gradient(circle at 50% 0%, #ffffff 0%, #f5f5f7 100%); }
    .container { backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid rgba(255,255,255,0.6); }
    .card { border-radius: 16px; backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); box-shadow: 0 4px 12px rgba(0,0,0,0.03); border: 1px solid rgba(255,255,255,0.5); transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s ease; }
    .card:hover { transform: translateY(-3px) scale(1.02); box-shadow: 0 12px 24px rgba(0,0,0,0.08); border-color: rgba(0,113,227,0.3); }
    .form-input, .form-textarea, .form-select { border-radius: 12px; background: rgba(255,255,255,0.8); border: 1px solid rgba(0,0,0,0.06); transition: all 0.2s; box-shadow: inset 0 1px 3px rgba(0,0,0,0.02); }
    .form-input:focus, .form-textarea:focus, .form-select:focus { border-color: var(--accent-color); box-shadow: 0 0 0 3px rgba(0,113,227,0.2); background: #fff; }
    .form-btn { border-radius: 18px; font-weight: 600; box-shadow: 0 2px 6px rgba(0,0,0,0.05); transition: all 0.3s ease; }
    .form-btn:hover { transform: scale(1.02); box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
    header { background: rgba(255,255,255,0.7); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(0,0,0,0.05); }
    .tab-item { border-radius: 10px; margin-right: 4px; }
    .tab-item.active { background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .apple-card { background: rgba(255,255,255,0.7); backdrop-filter: blur(20px); border-radius: 18px; border: 1px solid rgba(255,255,255,0.6); box-shadow: 0 8px 24px rgba(0,0,0,0.04); }
    ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 10px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.25); }
    .fish-tabs { background: rgba(0,0,0,0.04); border: 1px solid rgba(0,0,0,0.02); }
    .fish-tab-btn.active { background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .category-title { font-weight: 600; }`,
    cyberpunk: `:root { --bg-color: #16161a; --container-bg: #222226; --text-color: #e3e3e6; --text-muted: #9494a0; --accent-color: #00fa9a; --card-bg: #2c2c35; --card-hover-bg: #353542; --border-color: #3f3f4d; --danger-color: #ff4d4f; --edit-color: #1890ff; --orange-color: #e67e22; --panel-gradient: linear-gradient(180deg, #24242d 0%, #1c1c24 100%); --tag-bg: rgba(0, 250, 154, 0.1); --tag-border: rgba(0, 250, 154, 0.3); }`,
    midnight: `:root { --bg-color: #0b0f19; --container-bg: #111827; --text-color: #f3f4f6; --text-muted: #6b7280; --accent-color: #818cf8; --card-bg: #1f2937; --card-hover-bg: #374151; --border-color: #313d4f; --danger-color: #ef4444; --edit-color: #3b82f6; --orange-color: #f59e0b; --panel-gradient: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); --tag-bg: rgba(129, 140, 248, 0.1); --tag-border: rgba(129, 140, 248, 0.3); }`,
    minimalLight: `:root { --bg-color: #f3f4f6; --container-bg: #ffffff; --text-color: #1f2937; --text-muted: #9ca3af; --accent-color: #10b981; --card-bg: #f9fafb; --card-hover-bg: #f3f4f6; --border-color: #e5e7eb; --danger-color: #dc2626; --edit-color: #2563eb; --orange-color: #d97706; --panel-gradient: linear-gradient(180deg, #ffffff 0%, #f3f4f6 100%); --tag-bg: rgba(16, 185, 129, 0.1); --tag-border: rgba(16, 185, 129, 0.3); }`,
    forestGreen: `:root { --bg-color: #141d1a; --container-bg: #1c2a24; --text-color: #e6f0ec; --text-muted: #8ca39a; --accent-color: #2ecc71; --card-bg: #24352e; --card-hover-bg: #2d4239; --border-color: #324a40; --danger-color: #e74c3c; --edit-color: #3498db; --orange-color: #f1c40f; --panel-gradient: linear-gradient(180deg, #203029 0%, #101715 100%); --tag-bg: rgba(46, 204, 113, 0.1); --tag-border: rgba(46, 204, 113, 0.3); }`,
    neonAurora: `:root { --bg-color: #0c0720; --container-bg: #150e33; --text-color: #f1ecff; --text-muted: #958cb3; --accent-color: #00f0ff; --card-bg: #20164d; --card-hover-bg: #2b1d66; --border-color: #322375; --danger-color: #ff007f; --edit-color: #9b51e0; --orange-color: #ff9100; --panel-gradient: linear-gradient(180deg, #1b1242 0%, #080417 100%); --tag-bg: rgba(0, 240, 255, 0.1); --tag-border: rgba(0, 240, 255, 0.3); }`,
    darkGold: `:root { --bg-color: #1a1a1a; --container-bg: #262626; --text-color: #f5f5f5; --text-muted: #9e9e9e; --accent-color: #d4af37; --card-bg: #333333; --card-hover-bg: #404040; --border-color: #4a4a4a; --danger-color: #cf6679; --edit-color: #03dac6; --orange-color: #ffb74d; --panel-gradient: linear-gradient(180deg, #2d2d2d 0%, #141414 100%); --tag-bg: rgba(212, 175, 55, 0.1); --tag-border: rgba(212, 175, 55, 0.3); }`
};

// ============================================================
// 🤖 AI提示模板功能
// ============================================================
function toggleAiPromptTemplate() {
    const content = document.getElementById('aiPromptContent');
    const icon = document.getElementById('aiPromptToggleIcon');
    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.classList.add('expanded');
    } else {
        content.style.display = 'none';
        icon.classList.remove('expanded');
    }
}

function copyAiPromptTemplate() {
    const codeElement = document.getElementById('aiPromptCode');
    const text = codeElement.textContent;
    const btn = event.target;
    
    navigator.clipboard.writeText(text).then(() => {
        const originalText = btn.textContent;
        btn.textContent = '✅ 已复制';
        btn.classList.add('copied');
        setTimeout(() => {
            btn.textContent = originalText;
            btn.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        // 降级方案
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        
        const originalText = btn.textContent;
        btn.textContent = '✅ 已复制';
        btn.classList.add('copied');
        setTimeout(() => {
            btn.textContent = originalText;
            btn.classList.remove('copied');
        }, 2000);
    });
}

function switchTheme(themeName) {
    if (!themeRecipes[themeName]) themeName = 'apple';
    const themeEl = document.getElementById('themeStyle');
    if (themeEl) themeEl.innerHTML = themeRecipes[themeName];
    const selector = document.getElementById('themeSelector');
    if (selector) selector.value = themeName;
    localStorage.setItem('toolbox_v2_theme', themeName);
}

// ============================================================
// 🛠️ 其他功能
// ============================================================
function editBoardTitle() {
    const display = document.getElementById('boardTitleDisplay');
    if (!display) return;
    const newTitle = prompt("输入新工具箱名称：", display.innerText);
    if (newTitle !== null) {
        display.innerText = newTitle.trim() || "🛠️ 试玩工具箱";
    }
}

function switchView(viewName) {
    const header = document.querySelector('header');
    const syncToolbar = document.getElementById('syncToolbar');
    const tabNavBar = document.querySelector('.tab-nav-bar');
    const contentWrapper = document.getElementById('tabContentWrapper');
    const jigsawPage = document.getElementById('jigsawAppPage');
    const fishPage = document.getElementById('fishAppPage');

    if (tabNavBar) tabNavBar.style.display = 'none';
    if (contentWrapper) contentWrapper.style.display = 'none';
    if (jigsawPage) jigsawPage.style.display = 'none';
    if (fishPage) fishPage.style.display = 'none';

    if (viewName === 'jigsaw') {
        if (header) header.style.display = 'none';
        if (syncToolbar) syncToolbar.style.display = 'none';
        if (jigsawPage) jigsawPage.style.display = 'block';
    } else if (viewName === 'fish') {
        if (header) header.style.display = 'none';
        if (syncToolbar) syncToolbar.style.display = 'none';
        if (fishPage) {
            fishPage.style.display = 'block';
            if (typeof setRandomFishWallpaper === 'function') {
                setRandomFishWallpaper();
            }
            if (typeof renderFishPage === 'function') {
                renderFishPage();
            }
            if (typeof onAquariumResize === 'function') {
                setTimeout(onAquariumResize, 50);
            }
        }
    } else {
        if (header) header.style.display = 'flex';
        if (syncToolbar) syncToolbar.style.display = 'flex';
        if (tabNavBar) tabNavBar.style.display = 'flex';
        if (contentWrapper) contentWrapper.style.display = 'block';
    }
}

let isJigsawPageLocked = false;
function toggleJigsawPageLock() {
    isJigsawPageLocked = !isJigsawPageLocked;
    const btn = document.getElementById('jigsawLockBtn');
    if (!btn) return;
    if (isJigsawPageLocked) {
        btn.textContent = '🔓 解除固定';
        btn.className = 'form-btn green-btn';
        btn.style.cssText = 'padding: 6px 12px; font-size: 13px;';
    } else {
        btn.textContent = '🔒 固定';
        btn.className = 'form-btn red-btn';
        btn.style.cssText = 'padding: 6px 12px; font-size: 13px;';
    }
}

let isPageLocked = false;
window.addEventListener('beforeunload', function (e) {
    if (isPageLocked || isJigsawPageLocked) {
        e.preventDefault();
        e.returnValue = '页面已锁定，确定要离开吗？';
    }
});

function togglePageLock() {
    isPageLocked = !isPageLocked;
    renderPageLockState();
}

function escapeHtml(str) {
    return str.replace(/[&<>"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
}

// ============================================================
// 🧩 切图引擎
// ============================================================
let allJigsawGroupsData = [], totalJigsawImageCount = 0, jigsawGroupCounterId = 0;
const jigsawFileInput = document.getElementById('jigsawFileInput');
const jigsawDropZone = document.getElementById('jigsawDropZone');

// 命名规则：组文件夹 = image_{组序号}，组内图片 = {组序号}-{块序号}.jpeg（如 0-1、0-2、0-3、0-4）
// 这是下载文件名/文件夹名的唯一来源，任何结构变动后由 refreshAllJigsawGroupsUI / 下载函数调用重算
function recomputeJigsawFileNames() {
    allJigsawGroupsData.forEach((group, groupIndex) => {
        group.groupIndex = groupIndex;
        group.folderName = `image_${groupIndex}`;
        group.tasks.forEach(task => {
            if (task) {
                task.fileName = `${groupIndex}-${task.id}.jpeg`;
            }
        });
    });
}

// ============================================================
// 单图选区切割：显示坐标选区，确认后复用现有切割引擎
// ============================================================
let singleCropState = { img: null, url: '', x: 0, y: 0, width: 1, height: 1, dragging: null };
let singleCropEditingGroupId = null;
function showSingleCropPage() { document.getElementById('singleCropPage').style.display = 'block'; }
function showJigsawPage() { document.getElementById('singleCropPage').style.display = 'none'; }

const singleCropFixedRatio = document.getElementById('singleCropFixedRatio');
const singleCropRatio = document.getElementById('singleCropRatio');
const singleCropImage = document.getElementById('singleCropImage');
const singleCropStage = document.getElementById('singleCropStage');
const singleCropSelection = document.getElementById('singleCropSelection');
const singleCropFields = ['singleCropX', 'singleCropY', 'singleCropWidth', 'singleCropHeight'].map(id => document.getElementById(id));

function clampSingleCrop() {
    const img = singleCropState.img;
    if (!img) return;
    singleCropState.width = Math.max(1, Math.min(img.width, Number(singleCropFields[2].value) || 1));
    singleCropState.height = Math.max(1, Math.min(img.height, Number(singleCropFields[3].value) || 1));
    singleCropState.x = Math.max(0, Math.min(img.width - singleCropState.width, Number(singleCropFields[0].value) || 0));
    singleCropState.y = Math.max(0, Math.min(img.height - singleCropState.height, Number(singleCropFields[1].value) || 0));
    [singleCropState.x, singleCropState.y, singleCropState.width, singleCropState.height].forEach((value, index) => { singleCropFields[index].value = Math.round(value); });
    updateSingleCropView();
}

function updateSingleCropView() {
    updateSingleCropFreeRatioUI();
    if (!singleCropState.img || !singleCropImage.clientWidth) return;
    const scaleX = singleCropImage.clientWidth / singleCropState.img.width;
    const scaleY = singleCropImage.clientHeight / singleCropState.img.height;
    singleCropSelection.style.display = 'block';
    singleCropSelection.style.left = `${singleCropState.x * scaleX}px`;
    singleCropSelection.style.top = `${singleCropState.y * scaleY}px`;
    singleCropSelection.style.width = `${singleCropState.width * scaleX}px`;
    singleCropSelection.style.height = `${singleCropState.height * scaleY}px`;
    
    // 清除并重新绘制网格虚线
    singleCropSelection.querySelectorAll('.single-crop-grid-line').forEach(line => line.remove());
    const grid = getSingleCropGrid();
    for (let col = 1; col < grid.cols; col++) {
        const line = document.createElement('span');
        line.className = 'single-crop-grid-line vertical';
        line.style.left = `${col * 100 / grid.cols}%`;
        singleCropSelection.insertBefore(line, singleCropSelection.firstChild);
    }
    for (let row = 1; row < grid.rows; row++) {
        const line = document.createElement('span');
        line.className = 'single-crop-grid-line horizontal';
        line.style.top = `${row * 100 / grid.rows}%`;
        singleCropSelection.insertBefore(line, singleCropSelection.firstChild);
    }
}

function syncSingleCropFields() {
    if (singleCropFixedRatio.checked) {
        const ratio = Number(singleCropRatio.value) || 0.75;
        const width = Number(singleCropFields[2].value) || singleCropState.width;
        singleCropFields[3].value = Math.max(1, Math.round(width / ratio));
    }
    singleCropFields.forEach((field, index) => { singleCropState[['x', 'y', 'width', 'height'][index]] = Number(field.value) || 0; }); clampSingleCrop();
}

const singleCropRatioPreset = document.getElementById('singleCropRatioPreset');
const singleCropCustomRatioInputs = document.getElementById('singleCropCustomRatioInputs');
function updateSingleCropRatio() {
    if (singleCropRatioPreset.value === 'custom') {
        singleCropCustomRatioInputs.style.display = 'inline-flex';
        singleCropRatio.value = (Number(document.getElementById('singleCropRatioX').value) || 1) / (Number(document.getElementById('singleCropRatioY').value) || 1);
    } else {
        singleCropCustomRatioInputs.style.display = 'none';
        singleCropRatio.value = singleCropRatioPreset.value;
    }
    if (singleCropFixedRatio.checked) syncSingleCropFields();
}

function updateSingleCropFreeRatioUI() {
    const wrap = document.getElementById('singleCropFreeRatioControls');
    if (!wrap) return;
    const show = !singleCropFixedRatio.checked;
    wrap.style.display = show ? 'inline-flex' : 'none';
    if (!show || !singleCropState.img) return;
    const grid = getSingleCropGrid();
    const pieceRatio = simplifyJigsawRatio(singleCropState.width / grid.cols, singleCropState.height / grid.rows);
    const unit = Math.max(1, parseInt(document.getElementById('singleCropRatioUnit')?.value) || getJigsawRatioUnit());
    const ratioLabel = document.getElementById('singleCropFreeRatioLabel');
    if (ratioLabel) ratioLabel.textContent = `${pieceRatio.w}:${pieceRatio.h}`;
    const outLabel = document.getElementById('singleCropFreeOutputLabel');
    if (outLabel) outLabel.textContent = `${Math.round(pieceRatio.w * unit)}×${Math.round(pieceRatio.h * unit)}`;
}

if (singleCropRatioPreset) singleCropRatioPreset.addEventListener('change', updateSingleCropRatio);
const ratioXInput = document.getElementById('singleCropRatioX');
const ratioYInput = document.getElementById('singleCropRatioY');
if (ratioXInput) ratioXInput.addEventListener('input', updateSingleCropRatio);
if (ratioYInput) ratioYInput.addEventListener('input', updateSingleCropRatio);
document.getElementById('singleCropRatioUnit')?.addEventListener('input', updateSingleCropFreeRatioUI);
if (singleCropFixedRatio) singleCropFixedRatio.addEventListener('change', () => { updateSingleCropFreeRatioUI(); if (singleCropFixedRatio.checked) autoAdjustCropRatio(); });
singleCropFields.forEach(field => {
    if (field) {
        field.addEventListener('change', syncSingleCropFields);
        field.addEventListener('input', () => { clearTimeout(window._singleCropInputTimer); window._singleCropInputTimer = setTimeout(syncSingleCropFields, 300); });
    }
});
window.addEventListener('resize', updateSingleCropView);

if (singleCropSelection) {
    singleCropSelection.addEventListener('pointerdown', event => {
        if (!singleCropState.img) return;
        event.preventDefault(); singleCropSelection.setPointerCapture(event.pointerId);
        singleCropState.dragging = { handle: event.target.className.match(/\b(tl|tr|bl|br)\b/)?.[1] || null, startX: event.clientX, startY: event.clientY, x: singleCropState.x, y: singleCropState.y, width: singleCropState.width, height: singleCropState.height };
    });
    singleCropSelection.addEventListener('pointermove', event => {
        const drag = singleCropState.dragging, img = singleCropState.img;
        if (!drag || !img) return;
        const scaleX = singleCropImage.clientWidth / img.width, scaleY = singleCropImage.clientHeight / img.height;
        const dx = (event.clientX - drag.startX) / scaleX, dy = (event.clientY - drag.startY) / scaleY;
        if (drag.handle) {
            const fixedRatio = singleCropFixedRatio.checked;
            const ratio = Number(singleCropRatio.value) || (drag.width / drag.height);
            let left, top, width, height;
            if (fixedRatio) {
                const anchorX = drag.handle.includes('r') ? drag.x : drag.x + drag.width;
                const anchorY = drag.handle.includes('b') ? drag.y : drag.y + drag.height;
                let rawW = drag.handle.includes('r') ? Math.max(1, drag.width + dx) : Math.max(1, drag.width - dx);
                let rawH = drag.handle.includes('b') ? Math.max(1, drag.height + dy) : Math.max(1, drag.height - dy);
                if (Math.abs(rawW - drag.width) >= Math.abs(rawH - drag.height)) { width = rawW; height = width / ratio; }
                else { height = rawH; width = height * ratio; }
                const maxW = drag.handle.includes('r') ? Math.max(1, img.width - anchorX) : Math.max(1, anchorX);
                const maxH = drag.handle.includes('b') ? Math.max(1, img.height - anchorY) : Math.max(1, anchorY);
                if (width > maxW) { width = maxW; height = width / ratio; }
                if (height > maxH) { height = maxH; width = height * ratio; }
                if (drag.handle.includes('r')) { left = anchorX; } else { left = anchorX - width; }
                if (drag.handle.includes('b')) { top = anchorY; } else { top = anchorY - height; }
            } else {
                left = drag.x; top = drag.y;
                let right = drag.x + drag.width, bottom = drag.y + drag.height;
                if (drag.handle.includes('l')) left = Math.max(0, Math.min(right - 1, drag.x + dx));
                if (drag.handle.includes('r')) right = Math.min(img.width, Math.max(left + 1, drag.x + drag.width + dx));
                if (drag.handle.includes('t')) top = Math.max(0, Math.min(bottom - 1, drag.y + dy));
                if (drag.handle.includes('b')) bottom = Math.min(img.height, Math.max(top + 1, drag.y + drag.height + dy));
                width = right - left; height = bottom - top;
            }
            singleCropState.x = left; singleCropState.y = top; singleCropState.width = width; singleCropState.height = height;
        } else { singleCropState.x = Math.max(0, Math.min(img.width - drag.width, drag.x + dx)); singleCropState.y = Math.max(0, Math.min(img.height - drag.height, drag.y + dy)); }
        singleCropFields[0].value = Math.round(singleCropState.x); singleCropFields[1].value = Math.round(singleCropState.y); singleCropFields[2].value = Math.round(singleCropState.width); singleCropFields[3].value = Math.round(singleCropState.height); updateSingleCropView();
    });
    singleCropSelection.addEventListener('pointerup', () => { singleCropState.dragging = null; });
}

function autoAdjustCropRatio() {
    const grid = getSingleCropGrid();
    const dr = getJigsawDefaultRatio();
    const ratio = (dr.w / dr.h) * grid.cols / grid.rows;
    singleCropRatio.value = ratio;
    singleCropRatioPreset.value = '0.75';
    const label = document.getElementById('singleCropAutoRatioLabel');
    if (label) label.textContent = `${dr.w}:${dr.h}`;
    if (singleCropState.img && singleCropFixedRatio.checked) {
        const img = singleCropState.img;
        const cx = singleCropState.x + singleCropState.width / 2;
        const cy = singleCropState.y + singleCropState.height / 2;
        let newW, newH;
        const wByH = Math.round(img.height * ratio);
        if (wByH <= img.width) { 
            newH = img.height; 
            newW = wByH; 
        } else { 
            newW = img.width; 
            newH = Math.round(newW / ratio); 
        }
        singleCropState.width = newW;
        singleCropState.height = newH;
        singleCropState.x = Math.max(0, Math.min(img.width - newW, Math.round(cx - newW / 2)));
        singleCropState.y = Math.max(0, Math.min(img.height - newH, Math.round(cy - newH / 2)));
        singleCropFields.forEach((field, index) => field.value = Math.round(singleCropState[['x', 'y', 'width', 'height'][index]]));
    }
    updateSingleCropView();
}

function updateSingleCropGroupGridUI() {
    const mode = document.getElementById('singleCropGroupGrid').value;
    document.getElementById('singleCropGroupGridCustom').style.display = mode === 'custom' ? 'inline-flex' : 'none';
    autoAdjustCropRatio();
}

function openGroupCropEditor(id) {
    const group = allJigsawGroupsData.find(item => item.id === id);
    if (!group) return;
    singleCropEditingGroupId = id;
    const groupGrid = getJigsawGroupGrid(group);
    
    // 设置裁剪弹窗中的网格选项和自定义行列数
    const groupGridMode = ['2x2', '2x1', '1x2', '3x1', '4x4', '4x5', '6x6', '8x8'].includes(group.mode) ? group.mode : (group.mode === 'custom' ? 'custom' : `${groupGrid.cols}x${groupGrid.rows}`);
    document.getElementById('singleCropGroupGrid').value = groupGridMode;
    document.getElementById('singleCropGroupCols').value = groupGrid.cols;
    document.getElementById('singleCropGroupRows').value = groupGrid.rows;
    document.getElementById('singleCropGroupGridCustom').style.display = groupGridMode === 'custom' ? 'inline-flex' : 'none';

    const dr = getJigsawDefaultRatio();
    const ratio = (dr.w / dr.h) * groupGrid.cols / groupGrid.rows;
    singleCropRatio.value = ratio;
    singleCropRatioPreset.value = '0.75';

    const autoLabel = document.getElementById('singleCropAutoRatioLabel');
    if (autoLabel) autoLabel.textContent = `${dr.w}:${dr.h}`;

    let initW, initH, initX, initY;
    if (group.crop) {
        // 恢复该组上次确认的选区
        initW = group.crop.width;
        initH = group.crop.height;
        initX = group.crop.x;
        initY = group.crop.y;
    } else {
        const wByH = Math.round(group.img.height * ratio);
        if (wByH <= group.img.width) {
            initH = group.img.height; initW = wByH;
        } else {
            initW = group.img.width; initH = Math.round(initW / ratio);
        }
        initX = Math.round((group.img.width - initW) / 2);
        initY = Math.round((group.img.height - initH) / 2);
    }

    singleCropState = { img: group.img, url: group.img.src, x: initX, y: initY, width: initW, height: initH, dragging: null };
    singleCropFixedRatio.checked = !(group.crop && group.freeRatioCrop);
    const ratioUnitInput = document.getElementById('singleCropRatioUnit');
    if (ratioUnitInput) ratioUnitInput.value = group.ratioUnit || getJigsawRatioUnit();
    updateSingleCropFreeRatioUI();
    singleCropImage.src = group.img.src;
    singleCropStage.style.display = 'inline-block';
    singleCropSelection.style.display = 'block';
    singleCropFields.forEach((field, index) => field.value = Math.round(singleCropState[['x', 'y', 'width', 'height'][index]]));
    
    const confirmBtn = document.getElementById('singleCropConfirmBtn');
    if (confirmBtn) confirmBtn.disabled = false;
    
    showSingleCropPage();
    requestAnimationFrame(updateSingleCropView);
}

const singleCropConfirmBtn = document.getElementById('singleCropConfirmBtn');
if (singleCropConfirmBtn) {
    singleCropConfirmBtn.addEventListener('click', () => {
        if (!singleCropState.img) return;
        syncSingleCropFields();
        if (singleCropEditingGroupId !== null) {
            const group = allJigsawGroupsData.find(item => item.id === singleCropEditingGroupId);
            if (group) {
                group.crop = { x: singleCropState.x, y: singleCropState.y, width: singleCropState.width, height: singleCropState.height };
                group.freeRatioCrop = !singleCropFixedRatio.checked;
                group.ratioUnit = Math.max(1, parseInt(document.getElementById('singleCropRatioUnit')?.value) || getJigsawRatioUnit());
                const gridMode = document.getElementById('singleCropGroupGrid').value;
                group.mode = gridMode;
                group.modeIsCustom = true;
                if (gridMode === 'custom') {
                    group.cutCols = Math.max(1, Math.min(20, parseInt(document.getElementById('singleCropGroupCols').value) || 2));
                    group.cutRows = Math.max(1, Math.min(20, parseInt(document.getElementById('singleCropGroupRows').value) || 2));
                }
                singleCropEditingGroupId = null;
                showJigsawPage();
                generateJigsawCuts(group, refreshAllJigsawGroupsUI);
            }
            return;
        }
        return;
    });
}

function selectJigsawMode(card, groupName) {
    const value = card.getAttribute('data-value');
    if (!value || !groupName) return;
    const group = card.parentElement;
    if (group) {
        group.querySelectorAll('.jigsaw-mode-card').forEach(c => c.classList.remove('selected'));
    }
    card.classList.add('selected');
    const radio = document.querySelector(`input[name="${groupName}"][value="${value}"]`);
    if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change'));
    }
    if (groupName === 'jigsawPrefixType') { handleJigsawPrefixChange(); }
    if (groupName === 'jigsawGlobalCutMode') {
        const customInputs = document.getElementById('jigsawGlobalCustomCutInputs');
        if (customInputs) customInputs.style.display = value === 'custom' ? 'inline-flex' : 'none';
        if (value === 'custom') {
            const templateToggle = document.getElementById('jigsawTemplateToggle');
            if (templateToggle) {
                templateToggle.checked = false;
                templateToggle.dispatchEvent(new Event('change'));
            }
        }
        autoRefreshAllJigsaw();
    }
}

if (jigsawDropZone) {
    jigsawDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        jigsawDropZone.style.background = 'rgba(0, 113, 227, 0.08)';
        jigsawDropZone.style.borderColor = 'var(--accent-color)';
    });
    jigsawDropZone.addEventListener('dragleave', () => {
        jigsawDropZone.style.background = 'rgba(0, 113, 227, 0.02)';
        jigsawDropZone.style.borderColor = 'var(--accent-color)';
    });
    jigsawDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        jigsawDropZone.style.background = 'rgba(0, 113, 227, 0.02)';
        jigsawDropZone.style.borderColor = 'var(--accent-color)';
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleJigsawFiles(e.dataTransfer.files);
        }
    });
}

function getJigsawPrefix(index) {
    const radioChecked = document.querySelector('input[name="jigsawPrefixType"]:checked');
    const type = radioChecked ? radioChecked.value : 'number';
    if (type === 'number') return index.toString();
    let prefix = '';
    while (index >= 0) { prefix = String.fromCharCode((index % 26) + 97) + prefix; index = Math.floor(index / 26) - 1; }
    return prefix;
}

let _autoRefreshTimer = null;
function autoRefreshAllJigsaw() {
    if (allJigsawGroupsData.length === 0) return;
    clearTimeout(_autoRefreshTimer);
    _autoRefreshTimer = setTimeout(() => { refreshAllJigsawWithCurrentSettings(); }, 300);
}

function handleJigsawPrefixChange() {
    if (allJigsawGroupsData.length === 0) return;
    allJigsawGroupsData.forEach((group, index) => {
        if (!group.isCustom) { group.prefix = getJigsawPrefix(index); }
    });
    refreshAllJigsawGroupsUI();
}

function applyJigsawTemplate() {
    const checked = document.getElementById('jigsawTemplateToggle')?.checked;
    if (!checked) return;
    document.getElementById('jigsawMaxSizeInput').value = 18;
    document.getElementById('jigsawDefaultRatioW').value = 3;
    document.getElementById('jigsawDefaultRatioH').value = 4;
    document.getElementById('jigsawRatioUnit').value = 100;
    document.getElementById('jigsawFullRatioUnit').value = 200;
    const numberRadio = document.querySelector('input[name="jigsawPrefixType"][value="number"]');
    const numberCard = document.querySelector('.jigsaw-mode-card[data-value="number"]');
    if (numberRadio) { numberRadio.checked = true; numberRadio.dispatchEvent(new Event('change')); }
    if (numberCard) {
        numberCard.parentElement.querySelectorAll('.jigsaw-mode-card').forEach(c => c.classList.remove('selected'));
        numberCard.classList.add('selected');
    }
    const statusDiv = document.getElementById('jigsawStatus');
    if (statusDiv) statusDiv.textContent = '📋 已应用默认模板：18KB / 3:4 / 单图 300×400 / 数字前缀 / 前3张特殊切法';
}

function getJigsawTemplateMode(globalIndex) {
    if (globalIndex < 2) return '1x2';
    if (globalIndex === 2) return '2x1';
    return '2x2';
}

function getJigsawCustomGrid() {
    const cols = Math.max(1, Math.min(20, parseInt(document.getElementById('jigsawGlobalCutCols')?.value) || 2));
    const rows = Math.max(1, Math.min(20, parseInt(document.getElementById('jigsawGlobalCutRows')?.value) || 2));
    return { cols, rows };
}

function getJigsawGroupGrid(groupObj) {
    if (groupObj.mode === 'custom') return { cols: groupObj.cutCols || 2, rows: groupObj.cutRows || 2 };
    const preset = { '4x4': [4, 4], '4x5': [4, 5], '6x6': [6, 6], '8x8': [8, 8] }[groupObj.mode];
    if (preset) return { cols: preset[0], rows: preset[1] };
    if (groupObj.mode === '2x1') return { cols: 2, rows: 1 };
    if (groupObj.mode === '1x2') return { cols: 1, rows: 2 };
    if (groupObj.mode === '3x1') return { cols: 3, rows: 1 };
    if (groupObj.mode === '1x1') return { cols: 1, rows: 1 };
    return { cols: 2, rows: 2 };
}

// 将宽高约简为最简整数比；数字过大时用误差 ≤1% 的最小整数比近似
function simplifyJigsawRatio(w, h) {
    let a = Math.max(1, Math.round(w)), b = Math.max(1, Math.round(h));
    const gcd = (x, y) => y ? gcd(y, x % y) : x;
    const g = gcd(a, b) || 1;
    a /= g; b /= g;
    if (a <= 100 && b <= 100) return { w: a, h: b };
    const target = a / b;
    let best = null;
    for (let den = 1; den <= 100; den++) {
        const num = Math.round(target * den);
        if (num < 1 || num > 100) continue;
        const diff = Math.abs(num / den - target) / target;
        if (diff <= 0.01) return { w: num, h: den };
        if (!best || diff < best.diff) best = { w: num, h: den, diff };
    }
    if (best) return { w: best.w, h: best.h };
    const scale = 100 / Math.max(a, b);
    return { w: Math.max(1, Math.round(a * scale)), h: Math.max(1, Math.round(b * scale)) };
}

// 约简比例：仅约去整数公约数，保留小数形式（如 1:3.3 不换算成 10:33）
function reduceDecimalRatio(w, h) {
    for (let g = 9; g >= 2; g--) {
        if (w / g >= 1 && h / g >= 1 && Math.abs(w / g - Math.round(w / g)) < 1e-9 && Math.abs(h / g - Math.round(h / g)) < 1e-9) {
            return reduceDecimalRatio(Math.round(w / g), Math.round(h / g));
        }
    }
    // 清理浮点误差（如 6.5999999999999996 → 6.6）
    return { w: Math.round(w * 1e6) / 1e6, h: Math.round(h * 1e6) / 1e6 };
}

// 智能约简：两个都是整数走原整数约简；含小数则保留小数形式
function smartSimplifyRatio(w, h) {
    if (Number.isInteger(w) && Number.isInteger(h)) return simplifyJigsawRatio(w, h);
    return reduceDecimalRatio(w, h);
}

// 读取单图默认比例（默认 3:4，支持小数，保留用户输入形式）
function getJigsawDefaultRatio() {
    const w = parseFloat(document.getElementById('jigsawDefaultRatioW')?.value);
    const h = parseFloat(document.getElementById('jigsawDefaultRatioH')?.value);
    if (!isFinite(w) || !isFinite(h) || w <= 0 || h <= 0) return { w: 3, h: 4 };
    return reduceDecimalRatio(w, h);
}
// 读取单图比例分辨率（默认 100，单图 = 比例 × 此值）
function getJigsawRatioUnit() {
    return Math.max(1, Math.min(10000, parseInt(document.getElementById('jigsawRatioUnit')?.value) || 100));
}
// 读取整图比例分辨率（默认 200，整图 = 比例 × 此值）
function getJigsawFullRatioUnit() {
    return Math.max(1, Math.min(20000, parseInt(document.getElementById('jigsawFullRatioUnit')?.value) || 200));
}
// 计算整图输出尺寸 = 整图比例 × 整图比例分辨率（固定比例组：默认比例×网格；自由比例组：选区比例）
function getJigsawFullOutputSize(group) {
    const grid = getJigsawGroupGrid(group);
    const fullUnit = getJigsawFullRatioUnit();
    let fullRatio;
    if (group.crop && group.freeRatioCrop) {
        fullRatio = simplifyJigsawRatio(group.crop.width, group.crop.height);
    } else {
        const dr = getJigsawDefaultRatio();
        fullRatio = smartSimplifyRatio(dr.w * grid.cols, dr.h * grid.rows);
    }
    let w = fullRatio.w * fullUnit, h = fullRatio.h * fullUnit;
    const maxSide = 20000;
    const scale = Math.min(1, maxSide / Math.max(w, h));
    return { w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) };
}

function getSingleCropGrid() {
    const gridMode = document.getElementById('singleCropGroupGrid')?.value || '2x2';
    if (gridMode === 'custom') {
        return { cols: Math.max(1, parseInt(document.getElementById('singleCropGroupCols')?.value) || 2), rows: Math.max(1, parseInt(document.getElementById('singleCropGroupRows')?.value) || 2) };
    }
    const preset = { '2x2': [2, 2], '2x1': [2, 1], '1x2': [1, 2], '3x1': [3, 1], '4x4': [4, 4], '4x5': [4, 5], '6x6': [6, 6], '8x8': [8, 8] }[gridMode] || [2, 2];
    return { cols: preset[0], rows: preset[1] };
}

async function refreshAllJigsawWithCurrentSettings() {
    if (allJigsawGroupsData.length === 0) {
        const statusDiv = document.getElementById('jigsawStatus');
        if (statusDiv) statusDiv.textContent = '⚠️ 没有可刷新的切图组';
        return;
    }
    const statusDiv = document.getElementById('jigsawStatus');
    const templateEnabled = document.getElementById('jigsawTemplateToggle')?.checked;
    const radioChecked = document.querySelector('input[name="jigsawGlobalCutMode"]:checked');
    const defaultMode = radioChecked ? radioChecked.value : '2x2';
    for (let i = 0; i < allJigsawGroupsData.length; i++) {
        const group = allJigsawGroupsData[i];
        if (statusDiv) statusDiv.textContent = `🔄 正在刷新第 ${i + 1}/${allJigsawGroupsData.length} 组 [${group.prefix}]...`;
        if (!group.isCustom) { group.prefix = getJigsawPrefix(i); }
        if (templateEnabled && !group.modeIsCustom) {
            group.mode = getJigsawTemplateMode(i);
        } else if (!group.modeIsCustom) {
            group.mode = defaultMode;
            if (defaultMode === 'custom') {
                const grid = getJigsawCustomGrid();
                group.cutCols = grid.cols;
                group.cutRows = grid.rows;
            }
        }
        await new Promise(resolve => {
            generateJigsawCuts(group, () => { resolve(); });
        });
    }
    refreshAllJigsawGroupsUI();
    if (statusDiv) statusDiv.textContent = `✨ 全部 ${allJigsawGroupsData.length} 组已按当前设置刷新完毕！`;
}

let _jigsawIsProcessing = false;
async function handleJigsawFiles(files) {
    if (_jigsawIsProcessing) return;
    _jigsawIsProcessing = true;
    try {
        const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
        if (imageFiles.length === 0) { _jigsawIsProcessing = false; return; }
        const templateEnabled = document.getElementById('jigsawTemplateToggle')?.checked;
        const radioChecked = document.querySelector('input[name="jigsawGlobalCutMode"]:checked');
        const defaultMode = radioChecked ? radioChecked.value : '2x2';
        const statusDiv = document.getElementById('jigsawStatus');
        for (let i = 0; i < imageFiles.length; i++) {
            const prefix = getJigsawPrefix(totalJigsawImageCount);
            if (statusDiv) statusDiv.textContent = `切割中... (${i + 1}/${imageFiles.length}) [${prefix}]`;
                let mode = defaultMode;
            let customGrid = null;
            if (templateEnabled) {
                const globalIndex = totalJigsawImageCount;
                if (globalIndex < 2) mode = '1x2';
                else if (globalIndex === 2) mode = '2x1';
                else mode = '2x2';
            } else if (mode === 'custom') {
                customGrid = getJigsawCustomGrid();
            }
            await processSingleJigsawFile(imageFiles[i], prefix, mode, customGrid);
            totalJigsawImageCount++;
        }
        if (statusDiv) statusDiv.textContent = `✨ ${imageFiles.length} 张图片切割完毕`;
    } finally {
        _jigsawIsProcessing = false;
        // 重置 file input value，确保同一文件可再次选择
        const fileInput = document.getElementById('jigsawFileInput');
        if (fileInput) fileInput.value = '';
    }
}

function processSingleJigsawFile(file, prefix, mode, customGrid = null) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const id = ++jigsawGroupCounterId;
                const groupObj = { id, prefix, isCustom: false, modeIsCustom: false, mode, cutCols: customGrid?.cols, cutRows: customGrid?.rows, img, tasks: [], gridClass: '' };
                allJigsawGroupsData.push(groupObj);
                generateJigsawCuts(groupObj, () => { refreshAllJigsawGroupsUI(); resolve(); });
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function generateJigsawCuts(groupObj, onComplete) {
    groupObj.tasks.forEach(task => { if(task && task.url) URL.revokeObjectURL(task.url); });
    groupObj.tasks = [];
    groupObj._cutToken = (groupObj._cutToken || 0) + 1;
    const myToken = groupObj._cutToken;
    const img = groupObj.img, mode = groupObj.mode;
    const grid = getJigsawGroupGrid(groupObj);
    const cols = grid.cols, rows = grid.rows;
    const sizeInput = document.getElementById(groupObj.singleSettings ? 'singleJigsawMaxSizeInput' : 'jigsawMaxSizeInput');
    const maxByteSize = ((sizeInput ? parseFloat(sizeInput.value) : 18) || 18) * 1024;
    let srcX = 0, srcY = 0, srcWidth = img.width, srcHeight = img.height;
    if (groupObj.crop) {
        srcX = groupObj.crop.x; srcY = groupObj.crop.y;
        srcWidth = groupObj.crop.width; srcHeight = groupObj.crop.height;
    }
    let targetOutWidth, targetOutHeight;
    const defaultRatio = getJigsawDefaultRatio();
    const ratioUnit = groupObj.ratioUnit || getJigsawRatioUnit();
    if (groupObj.crop && groupObj.freeRatioCrop) {
        // 自由比例：输出单图分辨率 = 选区单张切图比例 × 单图比例分辨率
        const pieceRatio = simplifyJigsawRatio(srcWidth / cols, srcHeight / rows);
        targetOutWidth = pieceRatio.w * ratioUnit;
        targetOutHeight = pieceRatio.h * ratioUnit;
    } else {
        // 固定比例：单图 = 单图默认比例 × 单图比例分辨率（默认 3:4 × 100 = 300×400）
        targetOutWidth = defaultRatio.w * ratioUnit;
        targetOutHeight = defaultRatio.h * ratioUnit;
    }
    const maxSide = 10000;
    const outScale = Math.min(1, maxSide / Math.max(targetOutWidth, targetOutHeight));
    targetOutWidth = Math.max(1, Math.round(targetOutWidth * outScale));
    targetOutHeight = Math.max(1, Math.round(targetOutHeight * outScale));
    groupObj.targetOutWidth = targetOutWidth;
    groupObj.targetOutHeight = targetOutHeight;
    let targetRatio = (defaultRatio.w * cols) / (defaultRatio.h * rows);
    if (!groupObj.crop) {
        const currentRatio = img.width / img.height;
        if (currentRatio > targetRatio) { srcWidth = img.height * targetRatio; srcX = (img.width - srcWidth) / 2; }
        else { srcHeight = img.width / targetRatio; srcY = (img.height - srcHeight) / 2; }
    }
    const subWidthSource = srcWidth / cols;
    const subHeightSource = srcHeight / rows;
    groupObj.gridClass = cols * rows > 2 ? 'jigsaw-grid-4' : 'jigsaw-grid-2';
    const positions = [];
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            positions.push({ id: String(row * cols + col + 1), x: srcX + col * subWidthSource, y: srcY + row * subHeightSource });
        }
    }
    let completedCount = 0;
    positions.forEach((pos, index) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = targetOutWidth; canvas.height = targetOutHeight;
        ctx.drawImage(img, pos.x, pos.y, subWidthSource, subHeightSource, 0, 0, targetOutWidth, targetOutHeight);
        compressJigsawToSize(canvas, 0.95, maxByteSize, (blob) => {
            if (groupObj._cutToken !== myToken) return;
            const url = URL.createObjectURL(blob);
            groupObj.tasks[index] = { url, blob, id: pos.id, fileName: '' };
            completedCount++; if (completedCount === positions.length) onComplete();
        });
    });
}

function compressJigsawToSize(canvas, quality, maxByteSize, callback) {
    canvas.toBlob((blob) => {
        if (blob.size <= maxByteSize || quality <= 0.1) {
            if (blob.size > maxByteSize) {
                const nextCanvas = document.createElement('canvas');
                nextCanvas.width = canvas.width * 0.85; nextCanvas.height = canvas.height * 0.85;
                const ctx = nextCanvas.getContext('2d'); ctx.drawImage(canvas, 0, 0, nextCanvas.width, nextCanvas.height);
                compressJigsawToSize(nextCanvas, 0.9, maxByteSize, callback);
            } else { callback(blob); }
        } else { compressJigsawToSize(canvas, quality - 0.06, maxByteSize, callback); }
    }, 'image/jpeg', quality);
}

function refreshAllPreviewBar() {
    const bar = document.getElementById('jigsawAllPreviewBar');
    const container = document.getElementById('jigsawAllPreviewContainer');
    const title = bar?.querySelector('.jigsaw-all-preview-title');
    if (!bar || !container) return;
    if (allJigsawGroupsData.length === 0) { bar.style.display = 'none'; return; }
    bar.style.display = 'block';
    if (title) title.textContent = `🖼️ 原图预览（共 ${allJigsawGroupsData.length} 张）`;
    container.innerHTML = '';
    allJigsawGroupsData.forEach((groupObj, index) => {
        const item = document.createElement('div');
        item.className = 'jigsaw-all-preview-item';
        item.innerHTML = `
            <img src="${groupObj.img.src}" title="第${index + 1}组 ${groupObj.prefix}" alt="原图">
            <span class="preview-badge">${index + 1}</span>
        `;
        container.appendChild(item);
    });
}

function refreshAllJigsawGroupsUI() {
    const container = document.getElementById('jigsawOutputGroupsContainer');
    if (!container) return;
    container.innerHTML = '';
    const jigsawActionBar = document.getElementById('jigsawActionBar');
    if (jigsawActionBar && allJigsawGroupsData.length > 0) jigsawActionBar.style.display = 'block';
    recomputeJigsawFileNames();
    refreshAllPreviewBar();
    allJigsawGroupsData.forEach((groupObj, index) => {
        const fullSize = getJigsawFullOutputSize(groupObj);
        const groupDiv = document.createElement('div');
        groupDiv.className = 'jigsaw-group-container';
        groupDiv.id = `jigsaw-group-${groupObj.id}`;
        groupDiv.innerHTML = `
            <div class="jigsaw-group-header">
                <div>
                    <span class="jigsaw-group-index">第 ${index + 1} 组</span>
                    <span style="font-size:12px;opacity:0.8">前缀:</span>
                    <input type="text" class="jigsaw-input-prefix" value="${groupObj.prefix}" onchange="updateJigsawGroupPrefix(${groupObj.id}, this.value)">
                    <select class="jigsaw-select-mode-single" onchange="updateSingleJigsawMode(${groupObj.id}, this.value)">
                        <option value="2x2" ${groupObj.mode === '2x2' ? 'selected' : ''}>2×2</option>
                        <option value="1x1" ${groupObj.mode === '1x1' ? 'selected' : ''}>1×1</option>
                        <option value="2x1" ${groupObj.mode === '2x1' ? 'selected' : ''}>2×1</option>
                        <option value="1x2" ${groupObj.mode === '1x2' ? 'selected' : ''}>1×2</option>
                        <option value="3x1" ${groupObj.mode === '3x1' ? 'selected' : ''}>3×1</option>
                        <option value="4x4" ${groupObj.mode === '4x4' ? 'selected' : ''}>4×4</option>
                        <option value="4x5" ${groupObj.mode === '4x5' ? 'selected' : ''}>4×5</option>
                        <option value="6x6" ${groupObj.mode === '6x6' ? 'selected' : ''}>6×6</option>
                        <option value="8x8" ${groupObj.mode === '8x8' ? 'selected' : ''}>8×8</option>
                        <option value="custom" ${groupObj.mode === 'custom' ? 'selected' : ''}>自定义</option>
                    </select>
                    <span class="jigsaw-cut-inputs" style="display:${groupObj.mode === 'custom' ? 'inline-flex' : 'none'}">
                        <input type="number" class="jigsaw-cut-input" min="1" max="20" value="${groupObj.cutCols || 2}" placeholder="列" onchange="updateSingleJigsawGrid(${groupObj.id}, 'cols', this.value)" title="列：横向切割数">
                         <span class="jigsaw-cut-label">列</span>
                         <span>×</span>
                         <input type="number" class="jigsaw-cut-input" min="1" max="20" value="${groupObj.cutRows || 2}" placeholder="行" onchange="updateSingleJigsawGrid(${groupObj.id}, 'rows', this.value)" title="行：竖向切割数">
                         <span class="jigsaw-cut-label">行</span>
                    </span>
                    <span class="jigsaw-original-preview-label">原图预览</span>
                    <img src="${groupObj.img.src}" class="jigsaw-original-preview-img" alt="原图">
                    <span class="jigsaw-original-preview-label">单图分辨率 ${groupObj.targetOutWidth || '?'}×${groupObj.targetOutHeight || '?'}</span>
                    <span class="jigsaw-original-preview-label">整图分辨率 ${fullSize.w}×${fullSize.h}</span>
                </div>
                <div>
                    <button class="form-btn purple-btn" style="padding:3px 10px; font-size:12px;" onclick="openGroupCropEditor(${groupObj.id})">选区</button>
                    <button class="form-btn blue-btn" style="padding:3px 10px; font-size:12px;" onclick="downloadSingleJigsawZip(${groupObj.id})">打包下载</button>
                    <button class="form-btn green-btn" style="padding:3px 10px; font-size:12px;" onclick="downloadSingleJigsawFullImage(${groupObj.id})">下载整图</button>
                    <button class="form-btn red-btn" style="padding:3px 10px; font-size:12px;" onclick="deleteJigsawGroup(${groupObj.id})">清空</button>
                </div>
            </div>
        `;
        const gridDiv = document.createElement('div');
        gridDiv.className = `jigsaw-grid-output ${groupObj.gridClass}`;
        groupObj.tasks.forEach(task => {
            const kbSize = (task.blob.size / 1024).toFixed(1);
            const item = document.createElement('div');
            item.className = 'jigsaw-img-item';
            item.innerHTML = `
                <img src="${task.url}">
                <div class="jigsaw-info"><strong>${task.fileName}</strong> (${kbSize} KB)</div>
                <a class="jigsaw-btn-mini" href="${task.url}" download="${task.fileName}">单图下载</a>
            `;
            gridDiv.appendChild(item);
        });
        groupDiv.appendChild(gridDiv); container.appendChild(groupDiv);
    });
}

function updateJigsawGroupPrefix(id, newPrefix) {
    const groupObj = allJigsawGroupsData.find(g => g.id === id);
    if (!groupObj || !newPrefix.trim()) return;
    groupObj.prefix = newPrefix.trim(); groupObj.isCustom = true;
    refreshAllJigsawGroupsUI();
}

function updateSingleJigsawMode(id, newMode) {
    const groupObj = allJigsawGroupsData.find(g => g.id === id);
    if (!groupObj) return;
    groupObj.mode = newMode;
    groupObj.modeIsCustom = true;
    if (newMode === 'custom' && (!groupObj.cutCols || !groupObj.cutRows)) {
        const grid = getJigsawCustomGrid();
        groupObj.cutCols = grid.cols;
        groupObj.cutRows = grid.rows;
    }
    generateJigsawCuts(groupObj, () => { refreshAllJigsawGroupsUI(); });
}

function updateSingleJigsawGrid(id, direction, value) {
    const groupObj = allJigsawGroupsData.find(g => g.id === id);
    if (!groupObj) return;
    const gridValue = Math.max(1, Math.min(20, parseInt(value) || 1));
    groupObj.mode = 'custom';
    groupObj.modeIsCustom = true;
    groupObj[direction === 'cols' ? 'cutCols' : 'cutRows'] = gridValue;
    generateJigsawCuts(groupObj, () => { refreshAllJigsawGroupsUI(); });
}



function downloadSingleJigsawZip(id) {
    const group = allJigsawGroupsData.find(g => g.id === id); if (!group) return;
    recomputeJigsawFileNames();
    const groupIndex = allJigsawGroupsData.indexOf(group);
    const folderName = `image_${groupIndex}`;
    const zip = new JSZip(); 
    const folder = zip.folder(folderName);
    group.tasks.forEach((task, taskIdx) => { 
        if(task) {
            const pieceName = `${groupIndex}-${taskIdx + 1}.jpeg`;
            folder.file(pieceName, task.blob); 
        }
    });
    zip.generateAsync({ type: "blob" }).then(c => saveAs(c, `${folderName}.zip`));
}

function downloadAllJigsawGroupsZip() {
    if (allJigsawGroupsData.length === 0) return;
    recomputeJigsawFileNames();
    const zip = new JSZip();
    allJigsawGroupsData.forEach((group, groupIdx) => {
        const folderName = `image_${groupIdx}`;
        const folder = zip.folder(folderName);
        group.tasks.forEach((task, taskIdx) => { 
            if(task) {
                const pieceName = `${groupIdx}-${taskIdx + 1}.jpeg`;
                folder.file(pieceName, task.blob); 
            }
        });
    });
    zip.generateAsync({ type: "blob" }).then(c => { saveAs(c, "切图合集.zip"); });
}

function createJigsawFullImageBlob(group) {
    return new Promise((resolve) => {
        if (!group.tasks || group.tasks.length === 0) { resolve(null); return; }
        const grid = getJigsawGroupGrid(group);
        const cols = grid.cols, rows = grid.rows;

        const full = getJigsawFullOutputSize(group);
        const canvas = document.createElement('canvas');
        canvas.width = full.w;
        canvas.height = full.h;
        const drawW = full.w / cols;
        const drawH = full.h / rows;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        let loaded = 0;
        const total = group.tasks.length;
        group.tasks.forEach(task => {
            const img = new Image();
            img.onload = () => {
                const id = parseInt(task.id) - 1;
                const col = id % cols;
                const row = Math.floor(id / cols);
                // 吸附到整数像素边界，避免小数坐标产生抗锯齿缝隙
                const x0 = Math.round(col * drawW), x1 = Math.round((col + 1) * drawW);
                const y0 = Math.round(row * drawH), y1 = Math.round((row + 1) * drawH);
                ctx.drawImage(img, x0, y0, x1 - x0, y1 - y0);
                loaded++;
                if (loaded === total) {
                    finalizeFullImageBlob(canvas, resolve);
                }
            };
            img.onerror = () => {
                loaded++;
                if (loaded === total) finalizeFullImageBlob(canvas, resolve);
            };
            img.src = task.url;
        });
        
        function finalizeFullImageBlob(c, resolveFn) {
            const fullSizeInput = document.getElementById('jigsawFullMaxSizeInput');
            const fullMaxBytes = ((fullSizeInput ? parseFloat(fullSizeInput.value) : 0) || 0) * 1024;
            if (fullMaxBytes > 0) {
                compressFullImageToSize(c, 0.95, fullMaxBytes, resolveFn);
            } else {
                c.toBlob((blob) => resolveFn(blob), 'image/jpeg', 0.95);
            }
        }
    });
}

function compressFullImageToSize(canvas, quality, maxByteSize, callback) {
    canvas.toBlob((blob) => {
        if (blob.size <= maxByteSize || quality <= 0.1) {
            if (blob.size > maxByteSize) {
                const nextCanvas = document.createElement('canvas');
                nextCanvas.width = canvas.width * 0.85;
                nextCanvas.height = canvas.height * 0.85;
                const ctx = nextCanvas.getContext('2d');
                ctx.drawImage(canvas, 0, 0, nextCanvas.width, nextCanvas.height);
                compressFullImageToSize(nextCanvas, 0.9, maxByteSize, callback);
            } else { callback(blob); }
        } else { compressFullImageToSize(canvas, quality - 0.06, maxByteSize, callback); }
    }, 'image/jpeg', quality);
}

function downloadAllJigsawFullImages() {
    if (allJigsawGroupsData.length === 0) return;
    const zip = new JSZip();
    const groupNaming = document.getElementById('jigsawFullImageGroupNaming')?.checked;
    const promises = allJigsawGroupsData.map((group, groupIndex) =>
        createJigsawFullImageBlob(group).then(blob => {
            if (!blob) return;
            const fileName = groupNaming
                ? `${Math.floor(groupIndex / 3)}-${groupIndex % 3}.jpg`
                : `image_full_${groupIndex}.jpg`;
            if (groupNaming) {
                const folderName = `full_${Math.floor(groupIndex / 3)}`;
                zip.folder(folderName).file(fileName, blob);
            } else {
                zip.file(fileName, blob);
            }
        })
    );
    Promise.all(promises).then(() => {
        zip.generateAsync({ type: 'blob' }).then(c => {
            saveAs(c, '全部整图合集.zip');
        });
    });
}

function downloadSingleJigsawFullImage(id) {
    const group = allJigsawGroupsData.find(g => g.id === id);
    if (!group) return;
    const groupIndex = allJigsawGroupsData.indexOf(group);
    createJigsawFullImageBlob(group).then(blob => {
        if (blob) saveAs(blob, `image_full_${groupIndex}.jpg`);
    });
}

function deleteJigsawGroup(id) {
    const idx = allJigsawGroupsData.findIndex(g => g.id === id); if (idx === -1) return;
    allJigsawGroupsData[idx].tasks.forEach(task => { if(task && task.url) URL.revokeObjectURL(task.url); });
    allJigsawGroupsData.splice(idx, 1); totalJigsawImageCount = allJigsawGroupsData.length;
    allJigsawGroupsData.forEach((group, index) => {
        if (!group.isCustom) { group.prefix = getJigsawPrefix(index); group.tasks.forEach(t => { t.fileName = `${group.prefix}-${t.id}.jpeg`; }); }
    });
    refreshAllJigsawGroupsUI();
    const jigsawActionBar = document.getElementById('jigsawActionBar');
    if (jigsawActionBar && allJigsawGroupsData.length === 0) jigsawActionBar.style.display = 'none';
}

function clearAllJigsawHistory() {
    if(confirm('确定清空所有切图历史吗？')) {
        allJigsawGroupsData.forEach(g => g.tasks.forEach(t => { if(t && t.url) URL.revokeObjectURL(t.url); }));
        allJigsawGroupsData = []; totalJigsawImageCount = 0; jigsawGroupCounterId = 0;
        const container = document.getElementById('jigsawOutputGroupsContainer');
        if (container) container.innerHTML = '';
        refreshAllPreviewBar();
        const jigsawActionBar = document.getElementById('jigsawActionBar');
        if (jigsawActionBar) jigsawActionBar.style.display = 'none';
    }
}

// ============================================================
// 💬 拼图留言板
// ============================================================
let jigsawComments = [];
const JIGSAW_COMMENTS_PATH = RTDB_PATH + '/jigsawComments';

function toggleJigsawComments() {
    const body = document.getElementById('jigsawCommentBody');
    const icon = document.getElementById('jigsawCommentToggleIcon');
    if (!body || !icon) return;
    const expanded = body.style.display !== 'none';
    if (expanded) {
        body.style.display = 'none';
        icon.textContent = '▼';
    } else {
        body.style.display = 'block';
        icon.textContent = '▲';
        if (jigsawComments.length === 0) loadJigsawComments();
    }
}

function getJigsawAreaOptions() {
    return allJigsawGroupsData.map((g, i) => ({ label: '区域' + g.prefix, value: g.prefix }));
}

async function loadJigsawComments() {
    if (!isFirebaseConfigured()) { renderJigsawComments(); return; }
    try {
        const snapshot = await db.ref(JIGSAW_COMMENTS_PATH).once('value');
        const data = snapshot.val();
        jigsawComments = Array.isArray(data) ? data : [];
        renderJigsawComments();
    } catch (e) {
        console.error('加载留言失败:', e);
        jigsawComments = [];
        renderJigsawComments();
    }
}

function renderJigsawComments() {
    const listEl = document.getElementById('jigsawCommentList');
    if (!listEl) return;
    if (jigsawComments.length === 0) {
        listEl.innerHTML = '<div style="color: var(--text-muted); font-size: 13px; padding: 12px; text-align: center;">暂无留言，点击下方按钮新增</div>';
        return;
    }
    // pinned 优先，再按时间倒序
    const sorted = [...jigsawComments].sort((a, b) => {
        if ((a.pinned && b.pinned) || (!a.pinned && !b.pinned)) {
            return (b.timestamp || 0) - (a.timestamp || 0);
        }
        return a.pinned ? -1 : 1;
    });
    const grouped = {};
    sorted.forEach(c => {
        const area = c.area || '未分组';
        if (!grouped[area]) grouped[area] = [];
        grouped[area].push(c);
    });
    let html = '';
    for (const [area, comments] of Object.entries(grouped)) {
        html += '<div class="jigsaw-comment-group">';
        html += '<div class="jigsaw-comment-group-title">' + escapeHtml(area) + '</div>';
        comments.forEach(c => {
            const timeStr = c.timestamp ? new Date(c.timestamp).toLocaleString('zh-CN') : '';
            const pinnedClass = c.pinned ? ' jigsaw-comment-pinned' : '';
            const pinIcon = c.pinned ? '📌' : '📌';
            const pinTitle = c.pinned ? '取消置顶' : '置顶';
            html += '<div class="jigsaw-comment-item' + pinnedClass + '">';
            html += '<div class="jigsaw-comment-content">' + escapeHtml(c.content || '') + '</div>';
            html += '<div class="jigsaw-comment-meta">';
            html += '<span class="jigsaw-comment-time">' + timeStr + '</span>';
            html += '<span class="jigsaw-comment-actions">';
            html += '<button class="jigsaw-comment-btn jigsaw-comment-pin-btn" onclick="event.stopPropagation(); togglePinComment(\'' + c.id + '\')" title="' + pinTitle + '">' + pinIcon + '</button>';
            html += '<button class="jigsaw-comment-btn jigsaw-comment-edit-btn" onclick="event.stopPropagation(); editJigsawComment(\'' + c.id + '\')" title="编辑">✏️</button>';
            html += '<button class="jigsaw-comment-btn jigsaw-comment-delete-btn" onclick="event.stopPropagation(); deleteJigsawComment(\'' + c.id + '\')" title="删除">🗑️</button>';
            html += '</span>';
            html += '</div>';
            html += '</div>';
        });
        html += '</div>';
    }
    listEl.innerHTML = html;
}

function editJigsawComment(commentId) {
    const comment = jigsawComments.find(c => c.id === commentId);
    if (!comment) return;
    const newContent = prompt('修改留言内容：', comment.content || '');
    if (newContent === null) return; // 用户取消
    const trimmed = newContent.trim();
    if (!trimmed) return;
    comment.content = trimmed;
    comment.timestamp = Date.now();
    saveJigsawComments().then(() => renderJigsawComments());
}

async function deleteJigsawComment(commentId) {
    if (!confirm('确定要删除这条留言吗？')) return;
    jigsawComments = jigsawComments.filter(c => c.id !== commentId);
    await saveJigsawComments();
    renderJigsawComments();
}

async function togglePinComment(commentId) {
    const comment = jigsawComments.find(c => c.id === commentId);
    if (!comment) return;
    comment.pinned = !comment.pinned;
    await saveJigsawComments();
    renderJigsawComments();
}

function openNewJigsawCommentDialog() {
    const areaOptions = getJigsawAreaOptions();
    let areaSelectHtml = '';
    if (areaOptions.length > 0) {
        areaSelectHtml = '<select id="jigsawCommentAreaSelect" class="form-select" style="margin-bottom: 10px; width: 100%;">' +
            areaOptions.map(o => '<option value="' + escapeHtml(o.value) + '">' + escapeHtml(o.label) + '</option>').join('') +
            '<option value="__custom__">自定义区域...</option></select>';
    }
    const overlay = document.createElement('div');
    overlay.className = 'fish-modal-overlay open';
    overlay.id = 'jigsawCommentDialogOverlay';
    overlay.onclick = function(e) { if (e.target === overlay) closeJigsawCommentDialog(); };
    overlay.innerHTML = '<div class="fish-modal-card" style="width: 400px;"><div class="fish-modal-header">' +
        '<h3>新增留言</h3><button class="fish-modal-close" onclick="closeJigsawCommentDialog()">✕</button></div>' +
        '<div class="fish-modal-body">' +
        (areaOptions.length > 0 ? '<label style="font-size: 12px; color: var(--text-muted);">选择区域块：</label>' + areaSelectHtml : '') +
        '<label style="font-size: 12px; color: var(--text-muted); display: block; margin-bottom: 4px;">留言内容：</label>' +
        '<textarea id="jigsawCommentTextarea" class="form-textarea" style="width: 100%; height: 100px; resize: vertical; font-size: 14px;" placeholder="请输入留言内容..."></textarea>' +
        '<div style="margin-top: 12px; display: flex; gap: 10px; justify-content: flex-end;">' +
        '<button class="form-btn red-btn" onclick="closeJigsawCommentDialog()">取消</button>' +
        '<button class="form-btn" onclick="submitJigsawComment()">确认提交</button></div></div></div>';
    document.body.appendChild(overlay);
    // 处理自定义区域输入
    const areaSelect = document.getElementById('jigsawCommentAreaSelect');
    if (areaSelect) {
        areaSelect.addEventListener('change', function() {
            const customInput = document.getElementById('jigsawCommentCustomArea');
            if (this.value === '__custom__') {
                if (!customInput) {
                    const inp = document.createElement('input');
                    inp.type = 'text';
                    inp.id = 'jigsawCommentCustomArea';
                    inp.className = 'form-input';
                    inp.placeholder = '输入自定义区域名称...';
                    inp.style.cssText = 'width: 100%; margin-top: 8px;';
                    this.parentElement.insertBefore(inp, this.nextSibling);
                }
            } else {
                if (customInput) customInput.remove();
            }
        });
    }
    setTimeout(() => {
        const ta = document.getElementById('jigsawCommentTextarea');
        if (ta) ta.focus();
    }, 100);
}

function closeJigsawCommentDialog() {
    const overlay = document.getElementById('jigsawCommentDialogOverlay');
    if (overlay) overlay.remove();
}

async function submitJigsawComment() {
    const textarea = document.getElementById('jigsawCommentTextarea');
    const content = textarea ? textarea.value.trim() : '';
    if (!content) return;
    
    const areaSelect = document.getElementById('jigsawCommentAreaSelect');
    const customInput = document.getElementById('jigsawCommentCustomArea');
    let area = '未分组';
    if (areaSelect) {
        area = areaSelect.value === '__custom__' ? (customInput ? customInput.value.trim() || '自定义' : '自定义') : areaSelect.value;
    }
    
    const comment = {
        id: 'comment_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        area: area,
        content: content,
        timestamp: Date.now(),
        pinned: false
    };
    
    jigsawComments.push(comment);
    await saveJigsawComments();
    closeJigsawCommentDialog();
    renderJigsawComments();
}

async function saveJigsawComments() {
    if (!isFirebaseConfigured()) { updateSyncBar('offline', '留言已本地保存'); return; }
    try {
        await db.ref(JIGSAW_COMMENTS_PATH).set(jigsawComments);
    } catch (e) {
        console.error('保存留言失败:', e);
    }
}

// 在页面加载时预加载留言
const _origSwitchView = switchView;
switchView = function(viewName) {
    _origSwitchView(viewName);
    if (viewName === 'jigsaw' && jigsawComments.length === 0) {
        loadJigsawComments();
    }
};

// ============================================================
// 🚀 初始化
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('toolbox_v2_theme');
    if (savedTheme && themeRecipes[savedTheme]) {
        switchTheme(savedTheme);
    } else {
        switchTheme('apple');
    }

    const savedAutoSync = localStorage.getItem('toolbox_v2_autoSync');
    if (savedAutoSync === '1') {
        autoSyncEnabled = true;
        const cb = document.getElementById('autoSyncCheckbox');
        if (cb) cb.checked = true;
    }

    const savedPreview = localStorage.getItem('toolbox_v2_preview');
    if (savedPreview === '0') previewEnabled = false;

    const savedSize = localStorage.getItem('toolbox_v2_cardSize');
    if (savedSize) cardSize = parseInt(savedSize, 10) || 200;
    document.documentElement.style.setProperty('--card-min-width', cardSize + 'px');

    const topCb = document.getElementById('autoSyncCheckboxTop');
    if (topCb) topCb.checked = autoSyncEnabled;

    const sliderTop = document.getElementById('cardSizeSliderTop');
    const sizeValTop = document.getElementById('cardSizeValueTop');
    if (sliderTop) {
        sliderTop.value = String(cardSize);
        if (sizeValTop) sizeValTop.textContent = cardSize + 'px';
        sliderTop.addEventListener('input', (e) => {
            const v = parseInt(e.target.value, 10);
            setCardSize(v);
            if (sizeValTop) sizeValTop.textContent = v + 'px';
        });
    }

    tabs = [createDefaultTab()];
    activeTabId = tabs[0].id;
    renderTabs();
    renderActiveTab();
    renderPageLockState();
    initializeFromCloud();
});
