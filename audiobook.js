// ============================================================
// 🎧 听书区引擎 (Audiobook Engine)
// 使用 IndexedDB 存储本地小说，Web Speech API 进行朗读
// ============================================================

const DB_NAME = 'FishAudiobookDB';
const DB_VERSION = 1;
const STORE_NAME = 'books';
let db;

// ================== DB Init ==================
function initAudiobookDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = (e) => reject(e);
        request.onsuccess = (e) => {
            db = e.target.result;
            resolve(db);
        };
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
}

// 确保在其他脚本之后加载并初始化
window.addEventListener('DOMContentLoaded', async () => {
    try {
        await initAudiobookDB();
        renderAudioBookshelf();
        initSpeechVoices();
    } catch (e) {
        console.error('IndexedDB 初始化失败:', e);
    }
});

// ================== DB Operations ==================
function saveBookToDB(book) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(book);
        req.onsuccess = () => resolve();
        req.onerror = () => reject();
    });
}

function getBookFromDB(id) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_NAME], 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = () => reject();
    });
}

function deleteBookFromDB(id) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject();
    });
}

function getAllBooksFromDB() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_NAME], 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = () => reject();
    });
}

// ================== TXT Parsing ==================
function handleNovelUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    event.target.value = '';

    const reader = new FileReader();
    reader.onload = async function(e) {
        let text = e.target.result;
        const bookName = file.name.replace('.txt', '');
        const chapters = parseNovelText(text);

        const book = {
            id: 'book_' + Date.now(),
            title: bookName,
            chapters: chapters,
            currentChapterIndex: 0,
            addTime: Date.now()
        };

        await saveBookToDB(book);
        renderAudioBookshelf();
        alert(`小说《${bookName}》导入成功！共解析出 ${chapters.length} 章。`);
    };
    reader.onerror = function() {
        alert("文件读取失败，请检查文件格式。");
    };
    
    reader.readAsText(file, 'utf-8');
}

function parseNovelText(text) {
    // 匹配章节，如：第xxx章/卷/节/回
    const chapterRegex = /(第[零一二三四五六七八九十百千万0-9]+[章卷回节][^\n]*)/g;
    
    let chapters = [];
    let lastIndex = 0;
    let match;
    
    while ((match = chapterRegex.exec(text)) !== null) {
        if (lastIndex === 0 && match.index > 0) {
            const preamble = text.substring(0, match.index).trim();
            if (preamble.length > 10) {
                chapters.push({ title: "序言/引子", content: preamble });
            }
        } else if (lastIndex > 0) {
            const prevTitle = chapters[chapters.length - 1].title;
            const content = text.substring(lastIndex, match.index).trim();
            chapters[chapters.length - 1].content = content;
        }
        
        chapters.push({ title: match[1].trim(), content: "" });
        lastIndex = match.index + match[0].length;
    }
    
    if (chapters.length > 0 && lastIndex < text.length) {
        chapters[chapters.length - 1].content = text.substring(lastIndex).trim();
    }
    
    if (chapters.length === 0) {
        chapters.push({ title: "全本正文", content: text.trim() });
    }
    
    return chapters;
}

// ================== UI Views ==================
async function renderAudioBookshelf() {
    const select = document.getElementById('audioBookSelect');
    if (!select) return;
    
    const books = await getAllBooksFromDB();
    books.sort((a, b) => b.addTime - a.addTime);
    
    select.innerHTML = '<option value="">-- 请选择小说 --</option>';
    books.forEach(book => {
        const option = document.createElement('option');
        option.value = book.id;
        option.textContent = book.title;
        select.appendChild(option);
    });
    
    // 如果之前有选中书，尝试恢复
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
    renderChapterList();
    loadChapter(book.currentChapterIndex);
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

async function onChapterSelectChange() {
    const select = document.getElementById('audioChapterSelect');
    const idx = parseInt(select.value, 10);
    if (!isNaN(idx)) {
        loadChapter(idx);
    }
}

async function deleteCurrentBook() {
    if (!currentBook) {
        alert("请先选择一本小说");
        return;
    }
    if (confirm(`确定要删除小说《${currentBook.title}》吗？`)) {
        stopAudioPlay();
        await deleteBookFromDB(currentBook.id);
        currentBook = null;
        document.getElementById('miniReaderText').innerHTML = '请导入或选择小说开始听书...';
        document.getElementById('audioChapterSelect').innerHTML = '<option value="">-- 请选择章节 --</option>';
        await renderAudioBookshelf();
    }
}

let currentBook = null;
function openNovelSearchModal() {
    document.getElementById('novelSearchModal').style.display = 'flex';
}
function closeNovelSearchModal() {
    document.getElementById('novelSearchModal').style.display = 'none';
}

async function loadChapter(index) {
    if (index < 0 || index >= currentBook.chapters.length) return;
    
    stopAudioPlay(); 
    
    currentBook.currentChapterIndex = index;
    await saveBookToDB(currentBook);
    
    const chapter = currentBook.chapters[index];
    
    const paragraphs = chapter.content.split('\n').filter(p => p.trim().length > 0);
    const html = `<div style="font-weight:bold; margin-bottom:8px; color:var(--accent-color);">${chapter.title}</div>` + 
                 paragraphs.map((p, i) => `<p id="p-${i}" style="margin-bottom:6px;">${p}</p>`).join('');
    
    const readerText = document.getElementById('miniReaderText');
    if (readerText) {
        readerText.innerHTML = html;
        readerText.scrollTop = 0;
    }
    
    renderChapterList(); // Sync dropdown
}

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

// ================== Web Speech TTS ==================
let synth = window.speechSynthesis;
let currentUtterance = null;
let isPlaying = false;
let currentParagraphIndex = 0;

function initSpeechVoices() {
    const select = document.getElementById('audioVoiceSelect');
    if (!select) return;
    
    let voices = [];
    const populateVoices = () => {
        voices = synth.getVoices().filter(v => v.lang.includes('zh')); 
        select.innerHTML = '';
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
    const rate = document.getElementById('audioRate').value;
    document.getElementById('audioRateDisplay').innerText = rate;
}

function updateAudioVoice() {
}

function toggleAudioPlay() {
    const btn = document.getElementById('btnAudioPlay');
    
    if (isPlaying) {
        synth.pause();
        isPlaying = false;
        btn.innerText = '▶ 播放';
    } else {
        if (synth.paused && currentUtterance) {
            synth.resume();
            isPlaying = true;
            btn.innerText = '⏸ 暂停';
        } else {
            startReadingFrom(0);
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

function startReadingFrom(pIndex) {
    if (!currentBook) return;
    synth.cancel();
    
    const chapter = currentBook.chapters[currentBook.currentChapterIndex];
    const paragraphs = chapter.content.split('\n').filter(p => p.trim().length > 0);
    
    if (pIndex >= paragraphs.length) {
        nextChapter();
        setTimeout(() => startReadingFrom(0), 1000);
        return;
    }
    
    currentParagraphIndex = pIndex;
    const textToRead = paragraphs[pIndex];
    
    currentUtterance = new SpeechSynthesisUtterance(textToRead);
    
    const select = document.getElementById('audioVoiceSelect');
    const voices = synth.getVoices().filter(v => v.lang.includes('zh'));
    if (voices.length > 0 && select && select.value !== "") {
        currentUtterance.voice = voices[select.value];
    }
    
    currentUtterance.rate = parseFloat(document.getElementById('audioRate').value) || 1.5;
    currentUtterance.lang = 'zh-CN';
    
    currentUtterance.onstart = () => {
        isPlaying = true;
        document.getElementById('btnAudioPlay').innerText = '⏸ 暂停';
        
        document.querySelectorAll('.reading-highlight').forEach(el => el.classList.remove('reading-highlight'));
        const pEl = document.getElementById(`p-${pIndex}`);
        if (pEl) {
            pEl.classList.add('reading-highlight');
            pEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };
    
    currentUtterance.onend = () => {
        if (isPlaying) {
            startReadingFrom(pIndex + 1);
        }
    };
    
    currentUtterance.onerror = (e) => {
        console.warn('TTS Error:', e);
        isPlaying = false;
        document.getElementById('btnAudioPlay').innerText = '▶ 播放';
    };
    
    synth.speak(currentUtterance);
}
