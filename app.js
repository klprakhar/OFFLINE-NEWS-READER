// App Logic

// State
let articles = [];
let queue = [];
let currentTab = 'feed'; // 'feed' or 'queue'
let isOnline = navigator.onLine;

// DOM Elements
const articleListEl = document.getElementById('article-list');
const searchInput = document.getElementById('search-input');
const syncBtn = document.getElementById('sync-btn');
const connectionStatusEl = document.getElementById('connection-status');
const offlineBannerEl = document.getElementById('offline-banner');
const tabFeedBtn = document.getElementById('tab-feed');
const tabQueueBtn = document.getElementById('tab-queue');
const queueCountEl = document.getElementById('queue-count');

// Init
async function init() {
    registerSW();
    updateConnectionStatus();

    // Load data
    await loadQueue();
    await loadArticles();

    // Event Listeners
    window.addEventListener('online', () => {
        updateConnectionStatus();
        syncFeed();
    });
    window.addEventListener('offline', () => {
        updateConnectionStatus();
        const icon = syncBtn.firstElementChild;
        if (icon) icon.classList.remove('animate-spin');
    });

    syncBtn.addEventListener('click', syncFeed);

    searchInput.addEventListener('input', (e) => {
        renderArticles(e.target.value);
    });

    tabFeedBtn.addEventListener('click', () => switchTab('feed'));
    tabQueueBtn.addEventListener('click', () => switchTab('queue'));
}

// Service Worker Registration
function registerSW() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('Service Worker Registered'))
            .catch(err => console.error('Service Worker Registration Failed', err));
    }
}

// Connection Status
function updateConnectionStatus() {
    isOnline = navigator.onLine;
    if (isOnline) {
        connectionStatusEl.classList.remove('hidden');
        connectionStatusEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-green-500"></span> Online';
        connectionStatusEl.className = 'px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1';
        offlineBannerEl.classList.add('hidden');
    } else {
        connectionStatusEl.classList.remove('hidden');
        connectionStatusEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-red-500"></span> Offline';
        connectionStatusEl.className = 'px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 flex items-center gap-1';
        offlineBannerEl.classList.remove('hidden');
    }
}

// Data Loading
async function loadArticles() {
    // Try to get from DB first for speed
    const cachedArticles = await db.getAllArticles();
    if (cachedArticles.length > 0) {
        articles = cachedArticles;
        renderArticles();
    }

    // If online, fetch fresh
    if (isOnline) {
        await syncFeed();
    } else if (articles.length === 0) {
        articleListEl.innerHTML = `
            <div class="text-center py-10 text-slate-500">
                <i data-lucide="wifi-off" class="w-12 h-12 mx-auto mb-3 text-slate-300"></i>
                <p>No articles found and you are offline.</p>
                <p class="text-sm">Connect to the internet to fetch news.</p>
            </div>
        `;
        lucide.createIcons();
    }
}

async function syncFeed() {
    if (!navigator.onLine) return;

    const icon = syncBtn.firstElementChild;
    if (icon) icon.classList.add('animate-spin');

    try {
        // Using a public static API wrapper for NewsAPI to avoid CORS/Key issues for this demo
        const response = await fetch('https://saurav.tech/NewsAPI/top-headlines/category/general/us.json');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();

        // Map API data to our internal structure
        const freshArticles = data.articles.map((article, index) => ({
            id: article.url, // Use URL as unique ID
            title: article.title,
            snippet: article.description || article.content || 'No description available.',
            content: article.content || article.description || '',
            category: 'General',
            timestamp: new Date(article.publishedAt).getTime(),
            imageUrl: article.urlToImage || 'https://via.placeholder.com/300?text=News',
            isFresh: true,
            fetchedAt: Date.now()
        })).slice(0, 20); // Limit to 20 items

        await db.clearArticles();
        await db.saveArticles(freshArticles);
        articles = freshArticles;
        renderArticles();

    } catch (error) {
        console.error('Sync failed:', error);
        showToast('Failed to sync news. Checking offline cache.');
    } finally {
        if (icon) setTimeout(() => icon.classList.remove('animate-spin'), 500);
    }
}

async function loadQueue() {
    queue = await db.getQueue();
    updateQueueCount();
}

// UI Rendering
function renderArticles(filterText = '') {
    const list = currentTab === 'feed' ? articles : queue;
    const filtered = list.filter(a =>
        a.title.toLowerCase().includes(filterText.toLowerCase()) ||
        a.snippet.toLowerCase().includes(filterText.toLowerCase())
    );

    if (filtered.length === 0) {
        articleListEl.innerHTML = `
            <div class="text-center py-10 text-slate-500">
                <p>No articles found.</p>
            </div>
        `;
        return;
    }

    articleListEl.innerHTML = filtered.map(article => {
        const inQueue = queue.some(q => q.id === article.id);
        return `
        <article class="article-card bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col sm:flex-row">
            <div class="h-48 sm:h-auto sm:w-48 flex-shrink-0 bg-slate-200 relative">
                <img src="${article.imageUrl}" alt="${article.title}" class="w-full h-full object-cover" onerror="this.src='https://via.placeholder.com/300?text=News'">
                ${article.isFresh ? '<span class="absolute top-2 left-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded shadow-sm">NEW</span>' : ''}
            </div>
            <div class="p-4 flex flex-col flex-grow">
                <div class="flex justify-between items-start mb-2">
                    <span class="text-xs font-semibold text-blue-600 uppercase tracking-wider">${article.category || 'General'}</span>
                    <span class="text-xs text-slate-400">${new Date(article.timestamp).toLocaleDateString()}</span>
                </div>
                <h2 class="text-lg font-bold text-slate-800 mb-2 leading-tight">${article.title}</h2>
                <p class="text-slate-600 text-sm mb-4 line-clamp-2 flex-grow">${article.snippet}</p>
                
                <div class="flex items-center justify-between mt-auto pt-2 border-t border-slate-50">
                    <button onclick="toggleQueue('${article.id}')" class="flex items-center gap-1 text-sm font-medium ${inQueue ? (currentTab === 'queue' ? 'text-red-600 hover:text-red-800' : 'text-green-600') : 'text-slate-500 hover:text-blue-600'} transition-colors">
                        <i data-lucide="${inQueue ? (currentTab === 'queue' ? 'trash-2' : 'check-circle') : 'plus-circle'}" class="w-4 h-4"></i>
                        ${inQueue ? (currentTab === 'queue' ? 'Remove' : 'Saved') : 'Read Later'}
                    </button>
                    <button onclick="openArticle('${article.id}')" class="text-blue-600 hover:text-blue-800 text-sm font-medium">Read More &rarr;</button>
                </div>
            </div>
        </article>
    `}).join('');

    lucide.createIcons();
}

// Modal Logic
window.openArticle = (id) => {
    const article = articles.find(a => a.id === id) || queue.find(a => a.id === id);
    if (!article) return;

    document.getElementById('modal-title').textContent = article.title;
    document.getElementById('modal-image').src = article.imageUrl;
    document.getElementById('modal-category').textContent = article.category || 'General';
    document.getElementById('modal-date').textContent = new Date(article.timestamp).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Simulate full content since API only gives snippets
    const baseContent = article.content || article.snippet || "No content available.";
    const simulatedContent = generateFullContent(baseContent);

    document.getElementById('modal-content').innerHTML = simulatedContent;
    document.getElementById('modal-link').href = article.id;

    document.getElementById('article-modal').classList.remove('hidden');
};

function generateFullContent(snippet) {
    const paragraphs = [
        `<p class="font-bold text-lg mb-4">${snippet}</p>`,
        `<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>`,
        `<p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>`,
        `<p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.</p>`,
        `<p>Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.</p>`,
        `<p>Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur.</p>`
    ];
    return paragraphs.join('');
}

window.closeModal = () => {
    document.getElementById('article-modal').classList.add('hidden');
};

// Queue Logic
window.toggleQueue = async (id) => {
    const article = articles.find(a => a.id === id) || queue.find(a => a.id === id);
    if (!article) return;

    const index = queue.findIndex(a => a.id === id);
    if (index === -1) {
        // Add
        queue.push(article);
        await db.addToQueue(article);
        showToast("Article added to Reading Queue");
    } else {
        // Remove
        queue.splice(index, 1);
        await db.removeFromQueue(id);
        showToast("Article removed from Reading Queue");
    }

    updateQueueCount();
    renderArticles(searchInput.value);
};

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('translate-y-20', 'opacity-0');
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
}

function updateQueueCount() {
    queueCountEl.textContent = queue.length;
    if (queue.length > 0) {
        queueCountEl.classList.remove('hidden');
    } else {
        queueCountEl.classList.add('hidden');
    }
}

function switchTab(tab) {
    currentTab = tab;
    // Update UI
    if (tab === 'feed') {
        tabFeedBtn.classList.add('text-blue-600', 'border-blue-600');
        tabFeedBtn.classList.remove('text-slate-500', 'hover:text-slate-700');
        tabQueueBtn.classList.remove('text-blue-600', 'border-blue-600');
        tabQueueBtn.classList.add('text-slate-500', 'hover:text-slate-700');
    } else {
        tabQueueBtn.classList.add('text-blue-600', 'border-blue-600');
        tabQueueBtn.classList.remove('text-slate-500', 'hover:text-slate-700');
        tabFeedBtn.classList.remove('text-blue-600', 'border-blue-600');
        tabFeedBtn.classList.add('text-slate-500', 'hover:text-slate-700');
    }
    renderArticles(searchInput.value);
}

// Start
init();
