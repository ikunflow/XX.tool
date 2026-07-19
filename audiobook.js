// ============================================================
// 🎧 听书区引擎 v2 (Audiobook Engine)
// 使用 IndexedDB 存储本地小说，Web Speech API 进行朗读
// 支持书柜展示、搜索、阅读进度记忆、Firebase 云端同步
// ============================================================

const AUDIOBOOK_DB_NAME = 'FishAudiobookDB';
const AUDIOBOOK_DB_VERSION = 2;
const AUDIOBOOK_STORE_NAME = 'books';
const AUDIOBOOK_CLOUD_PATH = 'toolbox/v2/audiobooks';
let audiobookDB = null;

// ================== 全局状态 ==================
let currentBook = null;
let currentParagraphIndex = 0;
let isPlaying = false;
let synth = window.speechSynthesis;
let currentUtterance = null;
let audiobookView = 'player'; // 'player' | 'bookshelf'
let audiobookSearchQuery = '';
let audiobookIsSyncing = false;
let audiobookCloudEnabled = true; // 是否启用云端同步

// ================== DB Init ==================
function initAudiobookDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(AUDIOBOOK_DB_NAME, AUDIOBOOK_DB_VERSION);
        request.onerror = (e) => reject(e);
        request.onsuccess = (e) => {
            audiobookDB = e.target.result;
            resolve(audiobookDB);
        };
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(AUDIOBOOK_STORE_NAME)) {
                const store = db.createObjectStore(AUDIOBOOK_STORE_NAME, { keyPath: 'id' });
                store.createIndex('addTime', 'addTime', { unique: false });
                store.createIndex('lastReadTime', 'lastReadTime', { unique: false });
            }
        };
    });
}

// ================== DB Operations ==================
function saveBookToDB(book) {
    return new Promise((resolve, reject) => {
        if (!audiobookDB) return reject(new Error('数据库未初始化'));
        const tx = audiobookDB.transaction([AUDIOBOOK_STORE_NAME], 'readwrite');
        const store = tx.objectStore(AUDIOBOOK_STORE_NAME);
        const req = store.put(book);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

function getBookFromDB(id) {
    return new Promise((resolve, reject) => {
        if (!audiobookDB) return reject(new Error('数据库未初始化'));
        const tx = audiobookDB.transaction([AUDIOBOOK_STORE_NAME], 'readonly');
        const store = tx.objectStore(AUDIOBOOK_STORE_NAME);
        const req = store.get(id);
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = () => reject(req.error);
    });
}

function deleteBookFromDB(id) {
    return new Promise((resolve, reject) => {
        if (!audiobookDB) return reject(new Error('数据库未初始化'));
        const tx = audiobookDB.transaction([AUDIOBOOK_STORE_NAME], 'readwrite');
        const store = tx.objectStore(AUDIOBOOK_STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

function getAllBooksFromDB() {
    return new Promise((resolve, reject) => {
        if (!audiobookDB) return reject(new Error('数据库未初始化'));
        const tx = audiobookDB.transaction([AUDIOBOOK_STORE_NAME], 'readonly');
        const store = tx.objectStore(AUDIOBOOK_STORE_NAME);
        const req = store.getAll();
        req.onsuccess = (e) => resolve(e.target.result || []);
        req.onerror = () => reject(req.error);
    });
}

function clearAllBooksFromDB() {
    return new Promise((resolve, reject) => {
        if (!audiobookDB) return reject(new Error('数据库未初始化'));
        const tx = audiobookDB.transaction([AUDIOBOOK_STORE_NAME], 'readwrite');
        const store = tx.objectStore(AUDIOBOOK_STORE_NAME);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

// ================== 云端同步 ==================
function isAudiobookCloudEnabled() {
    return typeof isFirebaseConfigured === 'function' && isFirebaseConfigured() && audiobookCloudEnabled;
}

function setAudiobookSyncStatus(state, text) {
    const bar = document.getElementById('audiobookSyncStatus');
    if (!bar) return;
    bar.className = 'audiobook-sync-status ' + state;
    bar.textContent = text;
}

// 估算对象 JSON 序列化后大小（粗略）
function estimateSize(obj) {
    try {
        return new Blob([JSON.stringify(obj)]).size;
    } catch (e) {
        return Infinity;
    }
}

// 构建云端书籍数据：完整内容；若过大则降级为仅元数据
function buildCloudBookRecord(book) {
    const size = estimateSize(book);
    const base = {
        id: book.id,
        title: book.title,
        addTime: book.addTime || Date.now(),
        lastReadTime: book.lastReadTime || book.addTime || Date.now(),
        currentChapterIndex: book.currentChapterIndex || 0,
        currentParagraphIndex: book.currentParagraphIndex || 0,
        chapterCount: (book.chapters || []).length,
        chapterTitles: (book.chapters || []).map(ch => ch.title),
        hasContent: true
    };
    if (size > 5 * 1024 * 1024) {
        base.hasContent = false;
        return base;
    }
    return { ...book, ...base };
}

async function syncAudiobooksToCloud() {
    if (!isAudiobookCloudEnabled()) return;
    if (audiobookIsSyncing) return;
    audiobookIsSyncing = true;
    setAudiobookSyncStatus('syncing', '🔄 听书同步中...');
    try {
        const books = await getAllBooksFromDB();
        const payload = {};
        let skippedContent = 0;
        books.forEach(book => {
            const record = buildCloudBookRecord(book);
            if (!record.hasContent) skippedContent++;
            payload[book.id] = record;
        });
        payload._meta = {
            updatedAt: Date.now(),
            count: books.length,
            skippedContent: skippedContent
        };
        await db.ref(AUDIOBOOK_CLOUD_PATH).set(payload);
        setAudiobookSyncStatus('synced', skippedContent > 0
            ? `✅ 已同步（${skippedContent} 本过大仅同步进度）`
            : '✅ 听书已同步到云端');
    } catch (e) {
        console.error('听书同步失败:', e);
        setAudiobookSyncStatus('error', '❌ 听书同步失败: ' + (e.message || '未知错误'));
    } finally {
        audiobookIsSyncing = false;
    }
}

async function syncAudiobooksFromCloud() {
    if (!isAudiobookCloudEnabled()) return;
    if (audiobookIsSyncing) return;
    audiobookIsSyncing = true;
    setAudiobookSyncStatus('syncing', '🔄 正在从云端恢复听书...');
    try {
        const snapshot = await db.ref(AUDIOBOOK_CLOUD_PATH).once('value');
        const data = snapshot.val();
        if (!data) {
            setAudiobookSyncStatus('offline', '⚠️ 云端暂无听书数据');
            return;
        }
        const books = [];
        Object.keys(data).forEach(key => {
            if (key.startsWith('_')) return;
            const record = data[key];
            if (!record || !record.id) return;
            books.push(record);
        });
        await clearAllBooksFromDB();
        for (const book of books) {
            if (!book.chapters || book.chapters.length === 0) {
                book.chapters = (book.chapterTitles || []).map(t => ({ title: t, content: '' }));
            }
            if (!book.currentChapterIndex) book.currentChapterIndex = 0;
            if (!book.currentParagraphIndex) book.currentParagraphIndex = 0;
            await saveBookToDB(book);
        }
        setAudiobookSyncStatus('synced', `✅ 已恢复 ${books.length} 本听书`);
        await renderAudioBookshelf();
        if (audiobookView === 'bookshelf') renderBookcaseView();
    } catch (e) {
        console.error('听书拉取失败:', e);
        setAudiobookSyncStatus('error', '❌ 听书拉取失败: ' + (e.message || '未知错误'));
    } finally {
        audiobookIsSyncing = false;
    }
}

function watchCloudAudiobooks() {
    if (!isAudiobookCloudEnabled()) return;
    db.ref(AUDIOBOOK_CLOUD_PATH).on('value', async (snapshot) => {
        const data = snapshot.val();
        if (!data || audiobookIsSyncing) return;
        // 仅在其他客户端更新时恢复；简单策略：云端有数据且本地为空时自动恢复
        const localBooks = await getAllBooksFromDB();
        if (localBooks.length === 0 && Object.keys(data).some(k => !k.startsWith('_'))) {
            await syncAudiobooksFromCloud();
        }
    }, (err) => {
        console.warn('云端听书监听失败:', err);
    });
}

async function autoSyncAudiobooks() {
    if (isAudiobookCloudEnabled()) {
        await syncAudiobooksToCloud();
    }
}

function toggleAudiobookCloud(enabled) {
    audiobookCloudEnabled = !!enabled;
    try { localStorage.setItem('toolbox_v2_audiobook_cloud', audiobookCloudEnabled ? '1' : '0'); } catch (e) {}
    const cb = document.getElementById('audiobookCloudCheckbox');
    if (cb) cb.checked = audiobookCloudEnabled;
    if (audiobookCloudEnabled) {
        syncAudiobooksToCloud();
    } else {
        setAudiobookSyncStatus('offline', '⚠️ 听书云端同步已关闭');
    }
}

function forceAudiobookSyncToCloud() {
    if (!isAudiobookCloudEnabled()) {
        alert('⚠️ Firebase 未配置或云端同步已关闭');
        return;
    }
    syncAudiobooksToCloud();
}

function forceAudiobookSyncFromCloud() {
    if (!isAudiobookCloudEnabled()) {
        alert('⚠️ Firebase 未配置或云端同步已关闭');
        return;
    }
    syncAudiobooksFromCloud();
}

// ================== TXT Parsing ==================
function handleNovelUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    event.target.value = '';

    const reader = new FileReader();
    reader.onload = async function(e) {
        let text = e.target.result;
        const bookName = file.name.replace(/\.txt$/i, '');
        const chapters = parseNovelText(text);

        const book = {
            id: 'book_' + Date.now(),
            title: bookName,
            chapters: chapters,
            currentChapterIndex: 0,
            currentParagraphIndex: 0,
            addTime: Date.now(),
            lastReadTime: Date.now()
        };

        await saveBookToDB(book);
        await renderAudioBookshelf();
        await autoSyncAudiobooks();
        if (audiobookView === 'bookshelf') renderBookcaseView();
        alert(`小说《${bookName}》导入成功！共解析出 ${chapters.length} 章。`);
    };
    reader.onerror = function() {
        alert('文件读取失败，请检查文件格式。');
    };

    reader.readAsText(file, 'utf-8');
}

function parseNovelText(text) {
    // 增强章节匹配：支持 "第xxx章/卷/节/回/集"、"Chapter xxx"、"xxx." 等
    const chapterRegex = /((?:第[零一二三四五六七八九十百千万0-9]+[章卷回节集]|^\s*Chapter\s+\d+[^\n]*|^\s*\d+[\.、][^\n]{0,40}))(?=\n|\r|$)/gim;

    let chapters = [];
    let lastIndex = 0;
    let match;

    while ((match = chapterRegex.exec(text)) !== null) {
        if (lastIndex === 0 && match.index > 0) {
            const preamble = text.substring(0, match.index).trim();
            if (preamble.length > 10) {
                chapters.push({ title: '序言/引子', content: preamble });
            }
        } else if (lastIndex > 0) {
            const content = text.substring(lastIndex, match.index).trim();
            if (chapters.length > 0) {
                chapters[chapters.length - 1].content = content;
            }
        }

        chapters.push({ title: match[1].trim(), content: '' });
        lastIndex = match.index + match[0].length;
    }

    if (chapters.length > 0 && lastIndex < text.length) {
        chapters[chapters.length - 1].content = text.substring(lastIndex).trim();
    }

    if (chapters.length === 0) {
        chapters.push({ title: '全本正文', content: text.trim() });
    }

    // 清理空章节
    return chapters.filter(ch => ch.title && (ch.content.length > 0 || ch.title.length > 0));
}

// ================== UI Views ==================
async function renderAudioBookshelf() {
    const select = document.getElementById('audioBookSelect');
    if (!select) return;

    const books = await getAllBooksFromDB();
    books.sort((a, b) => (b.lastReadTime || b.addTime) - (a.lastReadTime || a.addTime));

    select.innerHTML = '<option value="">-- 请选择小说 --</option>';
    books.forEach(book => {
        const option = document.createElement('option');
        option.value = book.id;
        option.textContent = book.title;
        select.appendChild(option);
    });

    if (currentBook) {
        const exists = books.find(b => b.id === currentBook.id);
        if (exists) {
            select.value = currentBook.id;
        } else {
            currentBook = null;
        }
    }
}

async function onBookSelectChange() {
    const select = document.getElementById('audioBookSelect');
    const bookId = select.value;
    if (!bookId) {
        currentBook = null;
        document.getElementById('audioChapterSelect').innerHTML = '<option value="">-- 请选择章节 --</option>';
        document.getElementById('miniReaderText').innerHTML = '请导入或选择小说开始听书...';
        stopAudioPlay();
        return;
    }

    const book = await getBookFromDB(bookId);
    if (!book) return;

    currentBook = book;
    currentParagraphIndex = book.currentParagraphIndex || 0;
    renderChapterList();
    loadChapter(book.currentChapterIndex || 0);
}

function renderChapterList() {
    const select = document.getElementById('audioChapterSelect');
    if (!select || !currentBook) return;

    select.innerHTML = '';
    currentBook.chapters.forEach((ch, idx) => {
        const option = document.createElement('option');
        option.value = idx;
        option.textContent = ch.title;
        select.appendChild(option);
    });

    select.value = currentBook.currentChapterIndex;
}

async function loadChapter(index) {
    if (!currentBook) return;
    if (index < 0 || index >= currentBook.chapters.length) return;

    stopAudioPlay();

    currentBook.currentChapterIndex = index;
    currentBook.currentParagraphIndex = 0;
    currentBook.lastReadTime = Date.now();
    await saveBookToDB(currentBook);
    await autoSyncAudiobooks();

    const chapter = currentBook.chapters[index];
    const paragraphs = splitChapterIntoParagraphs(chapter.content);

    const html = '<div style="font-weight:bold; margin-bottom:8px; color:var(--accent-color);">' + escapeHtml(chapter.title) + '</div>' +
                 paragraphs.map((p, i) => '<p id="p-' + i + '" style="margin-bottom:6px;">' + escapeHtml(p) + '</p>').join('');

    const readerText = document.getElementById('miniReaderText');
    if (readerText) {
        readerText.innerHTML = html;
        readerText.scrollTop = 0;
    }

    renderChapterList();
    updateProgressInfo();
    highlightParagraph(0);
}

function splitChapterIntoParagraphs(content) {
    if (!content) return [];
    return content.split(/\n+/).map(p => p.trim()).filter(p => p.length > 0);
}

function updateProgressInfo() {
    const el = document.getElementById('audioProgressInfo');
    if (!el || !currentBook) return;
    const ch = currentBook.currentChapterIndex + 1;
    const total = currentBook.chapters.length;
    const paragraphs = splitChapterIntoParagraphs(currentBook.chapters[currentBook.currentChapterIndex].content);
    const p = Math.min(currentParagraphIndex + 1, paragraphs.length);
    const pTotal = paragraphs.length;
    el.textContent = `第 ${ch}/${total} 章 · 段 ${p}/${pTotal}`;

    // 更新进度条
    const range = document.getElementById('audioProgressBar');
    if (range && pTotal > 0) {
        range.max = pTotal - 1;
        range.value = currentParagraphIndex;
    }
}

function highlightParagraph(index) {
    document.querySelectorAll('.reading-highlight').forEach(el => el.classList.remove('reading-highlight'));
    const pEl = document.getElementById('p-' + index);
    if (pEl) {
        pEl.classList.add('reading-highlight');
        pEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// ================== 书柜视图 ==================
function switchAudiobookView(view) {
    audiobookView = view;
    const playerView = document.getElementById('audioPlayerView');
    const shelfView = document.getElementById('audioBookshelfView');
    const btnPlayer = document.getElementById('btnAudioViewPlayer');
    const btnShelf = document.getElementById('btnAudioViewShelf');
    if (playerView) playerView.style.display = view === 'player' ? 'block' : 'none';
    if (shelfView) shelfView.style.display = view === 'bookshelf' ? 'block' : 'none';
    if (btnPlayer) btnPlayer.classList.toggle('active', view === 'player');
    if (btnShelf) btnShelf.classList.toggle('active', view === 'bookshelf');
    if (view === 'bookshelf') renderBookcaseView();
}

async function renderBookcaseView() {
    const container = document.getElementById('audioBookshelfGrid');
    if (!container) return;
    const books = await getAllBooksFromDB();
    books.sort((a, b) => (b.lastReadTime || b.addTime) - (a.lastReadTime || a.addTime));

    if (books.length === 0) {
        container.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:30px 0;">书架空空如也，点击上方 ➕ 导入 TXT 小说</div>';
        return;
    }

    container.innerHTML = '';
    books.forEach(book => {
        const card = document.createElement('div');
        card.className = 'audiobook-shelf-card';
        const chIdx = book.currentChapterIndex || 0;
        const chTotal = book.chapters.length;
        const progress = chTotal > 0 ? Math.round((chIdx / chTotal) * 100) : 0;
        const lastRead = book.lastReadTime ? formatTimeAgo(book.lastReadTime) : '未读';

        card.innerHTML = `
            <div class="ab-shelf-cover">
                <div class="ab-shelf-title">${escapeHtml(book.title)}</div>
                <div class="ab-shelf-progress-bar"><div style="width:${progress}%"></div></div>
            </div>
            <div class="ab-shelf-info">
                <div class="ab-shelf-meta">读到：${escapeHtml(book.chapters[chIdx]?.title || '未开始')}</div>
                <div class="ab-shelf-meta">进度：${progress}% · ${lastRead}</div>
                <div class="ab-shelf-actions">
                    <button class="form-btn" onclick="continueBook('${book.id}')">继续阅读</button>
                    <button class="form-btn red-btn" onclick="deleteBookById('${book.id}')">删除</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function continueBook(bookId) {
    const select = document.getElementById('audioBookSelect');
    if (select) select.value = bookId;
    onBookSelectChange().then(() => {
        switchAudiobookView('player');
    });
}

async function deleteBookById(id) {
    const book = await getBookFromDB(id);
    if (!book) return;
    if (!confirm(`确定要删除小说《${book.title}》吗？`)) return;
    if (currentBook && currentBook.id === id) {
        stopAudioPlay();
        currentBook = null;
    }
    await deleteBookFromDB(id);
    await renderAudioBookshelf();
    await autoSyncAudiobooks();
    if (audiobookView === 'bookshelf') renderBookcaseView();
}

async function deleteCurrentBook() {
    if (!currentBook) {
        alert('请先选择一本小说');
        return;
    }
    await deleteBookById(currentBook.id);
    document.getElementById('miniReaderText').innerHTML = '请导入或选择小说开始听书...';
    document.getElementById('audioChapterSelect').innerHTML = '<option value="">-- 请选择章节 --</option>';
}

// ================== 搜索 ==================
function handleAudioSearch() {
    const input = document.getElementById('audioSearchInput');
    if (!input) return;
    audiobookSearchQuery = input.value.trim();
    if (!audiobookSearchQuery) {
        document.getElementById('audioSearchResults').style.display = 'none';
        return;
    }
    searchBooksAndChapters(audiobookSearchQuery);
}

async function searchBooksAndChapters(query) {
    const results = [];
    const books = await getAllBooksFromDB();
    const lowerQuery = query.toLowerCase();

    books.forEach(book => {
        if (book.title.toLowerCase().includes(lowerQuery)) {
            results.push({ type: 'book', bookId: book.id, title: book.title, context: '' });
        }
        (book.chapters || []).forEach((ch, idx) => {
            if (ch.title.toLowerCase().includes(lowerQuery)) {
                results.push({ type: 'chapter', bookId: book.id, chapterIndex: idx, title: book.title + ' · ' + ch.title, context: ch.content.substring(0, 60) });
            }
        });
    });

    renderSearchResults(results, query);
}

function renderSearchResults(results, query) {
    const container = document.getElementById('audioSearchResults');
    if (!container) return;
    container.style.display = 'block';
    container.innerHTML = '';

    if (results.length === 0) {
        container.innerHTML = `
            <div class="ab-search-empty">
                <div>本地未找到“${escapeHtml(query)}”</div>
                <a href="https://www.bing.com/search?q=${encodeURIComponent(query + ' TXT下载')}" target="_blank" class="form-btn blue-btn" style="margin-top:8px;text-decoration:none;display:inline-block;">🔍 去 Bing 搜索</a>
            </div>
        `;
        return;
    }

    results.forEach(r => {
        const item = document.createElement('div');
        item.className = 'ab-search-item';
        item.innerHTML = `
            <div class="ab-search-title">${r.type === 'book' ? '📖' : '📑'} ${escapeHtml(r.title)}</div>
            ${r.context ? '<div class="ab-search-context">' + escapeHtml(r.context) + '</div>' : ''}
        `;
        item.onclick = () => {
            if (r.type === 'book') {
                continueBook(r.bookId);
            } else {
                continueBook(r.bookId);
                setTimeout(() => loadChapter(r.chapterIndex), 200);
            }
            container.style.display = 'none';
        };
        container.appendChild(item);
    });
}

function searchNovelOnline() {
    const input = document.getElementById('audioSearchInput');
    const query = input ? input.value.trim() : '';
    if (!query) {
        openNovelSearchModal();
        return;
    }
    window.open('https://www.bing.com/search?q=' + encodeURIComponent(query + ' TXT下载'), '_blank');
}

function openNovelSearchModal() {
    document.getElementById('novelSearchModal').style.display = 'flex';
}

function closeNovelSearchModal() {
    document.getElementById('novelSearchModal').style.display = 'none';
}

// ================== 阅读控制 ==================
function prevChapter() {
    if (currentBook && currentBook.currentChapterIndex > 0) {
        loadChapter(currentBook.currentChapterIndex - 1);
    } else {
        alert('已经是第一章了');
    }
}

function nextChapter() {
    if (currentBook && currentBook.currentChapterIndex < currentBook.chapters.length - 1) {
        loadChapter(currentBook.currentChapterIndex + 1);
    } else {
        alert('已经是最后一章了');
    }
}

function prevParagraph() {
    if (!currentBook) return;
    if (currentParagraphIndex > 0) {
        startReadingFrom(currentParagraphIndex - 1);
    } else if (currentBook.currentChapterIndex > 0) {
        loadChapter(currentBook.currentChapterIndex - 1);
        setTimeout(() => {
            const paragraphs = splitChapterIntoParagraphs(currentBook.chapters[currentBook.currentChapterIndex].content);
            startReadingFrom(paragraphs.length - 1);
        }, 300);
    } else {
        alert('已经是开头了');
    }
}

function nextParagraph() {
    if (!currentBook) return;
    const paragraphs = splitChapterIntoParagraphs(currentBook.chapters[currentBook.currentChapterIndex].content);
    if (currentParagraphIndex < paragraphs.length - 1) {
        startReadingFrom(currentParagraphIndex + 1);
    } else {
        nextChapter();
    }
}

function seekParagraph(value) {
    if (!currentBook) return;
    const idx = parseInt(value, 10);
    if (!isNaN(idx)) {
        startReadingFrom(idx);
    }
}

// ================== Web Speech TTS ==================
function initSpeechVoices() {
    const select = document.getElementById('audioVoiceSelect');
    if (!select) return;

    let voices = [];
    const populateVoices = () => {
        try {
            voices = synth.getVoices().filter(v => v.lang.includes('zh'));
        } catch (e) {
            voices = [];
        }
        select.innerHTML = '';
        if (voices.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '系统默认';
            select.appendChild(option);
            return;
        }
        voices.forEach((v, i) => {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = v.name;
            select.appendChild(option);
        });
    };

    populateVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = populateVoices;
    }
}

function updateAudioRate() {
    const rate = document.getElementById('audioRate');
    const display = document.getElementById('audioRateDisplay');
    if (rate && display) display.innerText = rate.value + 'x';
}

function updateAudioVoice() {
}

function toggleAudioPlay() {
    const btn = document.getElementById('btnAudioPlay');
    if (!currentBook) {
        alert('请先选择或导入一本小说');
        return;
    }
    if (isPlaying) {
        synth.pause();
        isPlaying = false;
        if (btn) btn.innerText = '▶ 播放';
    } else {
        if (synth.paused && currentUtterance) {
            synth.resume();
            isPlaying = true;
            if (btn) btn.innerText = '⏸ 暂停';
        } else {
            startReadingFrom(currentParagraphIndex);
        }
    }
}

function stopAudioPlay() {
    synth.cancel();
    isPlaying = false;
    currentUtterance = null;
    const btn = document.getElementById('btnAudioPlay');
    if (btn) btn.innerText = '▶ 播放';
    document.querySelectorAll('.reading-highlight').forEach(el => el.classList.remove('reading-highlight'));
}

async function startReadingFrom(pIndex) {
    if (!currentBook) return;
    synth.cancel();

    const chapter = currentBook.chapters[currentBook.currentChapterIndex];
    const paragraphs = splitChapterIntoParagraphs(chapter.content);

    if (pIndex >= paragraphs.length) {
        if (currentBook.currentChapterIndex < currentBook.chapters.length - 1) {
            loadChapter(currentBook.currentChapterIndex + 1);
            setTimeout(() => startReadingFrom(0), 500);
        } else {
            alert('全书已读完');
            stopAudioPlay();
        }
        return;
    }

    currentParagraphIndex = pIndex;
    const textToRead = paragraphs[pIndex];

    currentUtterance = new SpeechSynthesisUtterance(textToRead);

    const select = document.getElementById('audioVoiceSelect');
    let voices = [];
    try {
        voices = synth.getVoices().filter(v => v.lang.includes('zh'));
    } catch (e) {}
    if (voices.length > 0 && select && select.value !== '') {
        currentUtterance.voice = voices[select.value];
    }

    const rateInput = document.getElementById('audioRate');
    currentUtterance.rate = parseFloat(rateInput ? rateInput.value : 1.5) || 1.5;
    currentUtterance.lang = 'zh-CN';

    currentUtterance.onstart = () => {
        isPlaying = true;
        const btn = document.getElementById('btnAudioPlay');
        if (btn) btn.innerText = '⏸ 暂停';
        highlightParagraph(pIndex);
    };

    currentUtterance.onend = async () => {
        if (!isPlaying) return;
        currentBook.currentParagraphIndex = pIndex + 1;
        await saveBookToDB(currentBook);
        updateProgressInfo();
        startReadingFrom(pIndex + 1);
    };

    currentUtterance.onerror = (e) => {
        console.warn('TTS Error:', e);
        isPlaying = false;
        const btn = document.getElementById('btnAudioPlay');
        if (btn) btn.innerText = '▶ 播放';
    };

    synth.speak(currentUtterance);
}

// ================== 工具函数 ==================
function formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return '刚刚';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + ' 分钟前';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + ' 小时前';
    const days = Math.floor(hours / 24);
    if (days < 30) return days + ' 天前';
    return new Date(timestamp).toLocaleDateString();
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
}

// ================== 初始化 ==================
window.addEventListener('DOMContentLoaded', async () => {
    try {
        await initAudiobookDB();

        // 恢复云端同步设置
        try {
            const cloudSetting = localStorage.getItem('toolbox_v2_audiobook_cloud');
            if (cloudSetting !== null) {
                audiobookCloudEnabled = cloudSetting === '1';
            }
        } catch (e) {}
        const cb = document.getElementById('audiobookCloudCheckbox');
        if (cb) cb.checked = audiobookCloudEnabled;

        await renderAudioBookshelf();
        initSpeechVoices();
        watchCloudAudiobooks();

        // 如果云端有数据而本地没有，自动恢复
        if (isAudiobookCloudEnabled()) {
            const localBooks = await getAllBooksFromDB();
            if (localBooks.length === 0) {
                await syncAudiobooksFromCloud();
            }
        }

        // 默认显示播放器视图
        switchAudiobookView('player');
        updateAudioRate();
    } catch (e) {
        console.error('听书模块初始化失败:', e);
    }
});
