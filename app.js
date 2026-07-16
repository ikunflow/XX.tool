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
        await db.ref(RTDB_PATH).set({
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
        await db.ref(RTDB_PATH).set({
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

function forceSyncToCloud() {
    if (!isFirebaseConfigured()) { alert('⚠️ Firebase 未配置'); return; }
    saveToCloudAndReload();
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
    const tabNavBar = document.querySelector('.tab-nav-bar');
    const contentWrapper = document.getElementById('tabContentWrapper');
    const jigsawPage = document.getElementById('jigsawAppPage');
    const fishPage = document.getElementById('fishAppPage');

    if (tabNavBar) tabNavBar.style.display = 'none';
    if (contentWrapper) contentWrapper.style.display = 'none';
    if (jigsawPage) jigsawPage.style.display = 'none';
    if (fishPage) fishPage.style.display = 'none';

    if (viewName === 'jigsaw') {
        if (jigsawPage) jigsawPage.style.display = 'block';
    } else if (viewName === 'fish') {
        if (fishPage) {
            fishPage.style.display = 'block';
            if (typeof renderFishPage === 'function') {
                renderFishPage();
            }
        }
    } else {
        if (tabNavBar) tabNavBar.style.display = 'flex';
        if (contentWrapper) contentWrapper.style.display = 'block';
    }
}

let isPageLocked = false;
window.addEventListener('beforeunload', function (e) {
    if (isPageLocked) {
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
// 🧩 切图引擎（精简版）
// ============================================================
let allJigsawGroupsData = [], totalJigsawImageCount = 0, jigsawGroupCounterId = 0;
const jigsawFileInput = document.getElementById('jigsawFileInput');
const jigsawDropZone = document.getElementById('jigsawDropZone');

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
}

if (jigsawFileInput) {
    jigsawFileInput.addEventListener('change', (e) => handleJigsawFiles(e.target.files));
}
if (jigsawDropZone) {
    jigsawDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        jigsawDropZone.style.background = 'rgba(0, 250, 154, 0.08)';
        jigsawDropZone.style.borderColor = 'var(--accent-color)';
    });
    jigsawDropZone.addEventListener('dragleave', () => {
        jigsawDropZone.style.background = 'rgba(0, 250, 154, 0.01)';
        jigsawDropZone.style.borderColor = 'var(--accent-color)';
    });
    jigsawDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        jigsawDropZone.style.background = 'rgba(0, 250, 154, 0.01)';
        jigsawDropZone.style.borderColor = 'var(--accent-color)';
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleJigsawFiles(e.dataTransfer.files);
        }
    });
}

function getJigsawPrefix(index) {
    const radioChecked = document.querySelector('input[name="jigsawPrefixType"]:checked');
    const type = radioChecked ? radioChecked.value : 'alpha';
    if (type === 'number') return index.toString();
    let prefix = '';
    while (index >= 0) { prefix = String.fromCharCode((index % 26) + 97) + prefix; index = Math.floor(index / 26) - 1; }
    return prefix;
}

function handleJigsawPrefixChange() {
    if (allJigsawGroupsData.length === 0) return;
    allJigsawGroupsData.forEach((group, index) => {
        if (!group.isCustom) { group.prefix = getJigsawPrefix(index); group.tasks.forEach(t => { t.fileName = `${group.prefix}-${t.id}.jpeg`; }); }
    });
    refreshAllJigsawGroupsUI();
}

async function handleJigsawFiles(files) {
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) return;
    const radioChecked = document.querySelector('input[name="jigsawGlobalCutMode"]:checked');
    const defaultMode = radioChecked ? radioChecked.value : '2x2';
    const statusDiv = document.getElementById('jigsawStatus');
    for (let i = 0; i < imageFiles.length; i++) {
        const prefix = getJigsawPrefix(totalJigsawImageCount);
        if (statusDiv) statusDiv.textContent = `切割中... (${i + 1}/${imageFiles.length}) [${prefix}]`;
        await processSingleJigsawFile(imageFiles[i], prefix, defaultMode);
        totalJigsawImageCount++;
    }
    if (statusDiv) statusDiv.textContent = `✨ ${imageFiles.length} 张图片切割完毕`;
}

function processSingleJigsawFile(file, prefix, mode) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const id = ++jigsawGroupCounterId;
                const groupObj = { id, prefix, isCustom: false, mode, img, tasks: [], gridClass: '' };
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
    const img = groupObj.img, mode = groupObj.mode;
    const sizeInput = document.getElementById('jigsawMaxSizeInput');
    const maxByteSize = ((sizeInput ? parseFloat(sizeInput.value) : 25) || 25) * 1024;
    let srcX = 0, srcY = 0, srcWidth = img.width, srcHeight = img.height;
    let targetRatio = 3 / 4;
    if (mode === '2x2') targetRatio = 3 / 4;
    else if (mode === '2x1') targetRatio = 6 / 4;
    else if (mode === '1x2') targetRatio = 3 / 8;
    const currentRatio = img.width / img.height;
    if (currentRatio > targetRatio) { srcWidth = img.height * targetRatio; srcX = (img.width - srcWidth) / 2; }
    else { srcHeight = img.width / targetRatio; srcY = (img.height - srcHeight) / 2; }
    let positions = [];
    if (mode === '2x2') {
        const subW = srcWidth / 2, subH = srcHeight / 2;
        groupObj.gridClass = 'jigsaw-grid-4';
        positions = [{ id: '1', x: srcX, y: srcY }, { id: '2', x: srcX + subW, y: srcY }, { id: '3', x: srcX, y: srcY + subH }, { id: '4', x: srcX + subW, y: srcY + subH }];
    } else if (mode === '2x1') {
        const subW = srcWidth / 2; groupObj.gridClass = 'jigsaw-grid-2';
        positions = [{ id: '1', x: srcX, y: srcY }, { id: '2', x: srcX + subW, y: srcY }];
    } else if (mode === '1x2') {
        const subH = srcHeight / 2; groupObj.gridClass = 'jigsaw-grid-2';
        positions = [{ id: '1', x: srcX, y: srcY }, { id: '2', x: srcX, y: srcY + subH }];
    }
    let completedCount = 0;
    const subWidthSource = mode === '2x2' || mode === '2x1' ? srcWidth / 2 : srcWidth;
    const subHeightSource = mode === '2x2' || mode === '1x2' ? srcHeight / 2 : srcHeight;
    positions.forEach((pos, index) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 400; canvas.height = 533;
        ctx.drawImage(img, pos.x, pos.y, subWidthSource, subHeightSource, 0, 0, 400, 533);
        compressJigsawToSize(canvas, 0.95, maxByteSize, (blob) => {
            const url = URL.createObjectURL(blob);
            groupObj.tasks[index] = { url, blob, id: pos.id, fileName: `${groupObj.prefix}-${pos.id}.jpeg` };
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

function refreshAllJigsawGroupsUI() {
    const container = document.getElementById('jigsawOutputGroupsContainer');
    if (!container) return;
    container.innerHTML = '';
    const jigsawActionBar = document.getElementById('jigsawActionBar');
    if (jigsawActionBar && allJigsawGroupsData.length > 0) jigsawActionBar.style.display = 'block';
    allJigsawGroupsData.forEach((groupObj) => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'jigsaw-group-container';
        groupDiv.innerHTML = `
            <div class="jigsaw-group-header">
                <div>
                    <span style="font-size:12px;opacity:0.8">前缀:</span>
                    <input type="text" class="jigsaw-input-prefix" value="${groupObj.prefix}" onchange="updateJigsawGroupPrefix(${groupObj.id}, this.value)">
                    <select class="jigsaw-select-mode-single" onchange="updateSingleJigsawMode(${groupObj.id}, this.value)">
                        <option value="2x2" ${groupObj.mode === '2x2' ? 'selected' : ''}>四宫格 2×2</option>
                        <option value="2x1" ${groupObj.mode === '2x1' ? 'selected' : ''}>横向双切</option>
                        <option value="1x2" ${groupObj.mode === '1x2' ? 'selected' : ''}>纵向双切</option>
                    </select>
                </div>
                <div>
                    <button class="form-btn blue-btn" style="padding:3px 10px; font-size:12px;" onclick="downloadSingleJigsawZip(${groupObj.id})">打包下载</button>
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
    groupObj.tasks.forEach(t => { t.fileName = `${groupObj.prefix}-${t.id}.jpeg`; });
    refreshAllJigsawGroupsUI();
}

function updateSingleJigsawMode(id, newMode) {
    const groupObj = allJigsawGroupsData.find(g => g.id === id);
    if (!groupObj) return;
    groupObj.mode = newMode; generateJigsawCuts(groupObj, () => { refreshAllJigsawGroupsUI(); });
}

function downloadSingleJigsawZip(id) {
    const group = allJigsawGroupsData.find(g => g.id === id); if (!group) return;
    const zip = new JSZip(); group.tasks.forEach(task => { if(task) zip.file(task.fileName, task.blob); });
    zip.generateAsync({ type: "blob" }).then(c => saveAs(c, `${group.prefix}.zip`));
}

function downloadAllJigsawGroupsZip() {
    if (allJigsawGroupsData.length === 0) return;
    const zip = new JSZip();
    allJigsawGroupsData.forEach(group => {
        const folder = zip.folder(group.prefix); group.tasks.forEach(task => { if(task) folder.file(task.fileName, task.blob); });
    });
    zip.generateAsync({ type: "blob" }).then(c => { saveAs(c, "切图合集.zip"); });
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
        const jigsawActionBar = document.getElementById('jigsawActionBar');
        if (jigsawActionBar) jigsawActionBar.style.display = 'none';
    }
}

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
