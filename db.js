// IndexedDB Wrapper
const DB_NAME = 'offline-news-db';
const DB_VERSION = 1;
const STORE_ARTICLES = 'articles';
const STORE_QUEUE = 'queue';

const dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_ARTICLES)) {
            db.createObjectStore(STORE_ARTICLES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_QUEUE)) {
            db.createObjectStore(STORE_QUEUE, { keyPath: 'id' });
        }
    };

    request.onsuccess = (event) => {
        resolve(event.target.result);
    };

    request.onerror = (event) => {
        reject('IndexedDB error: ' + event.target.errorCode);
    };
});

const db = {
    async getAllArticles() {
        const db = await dbPromise;
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_ARTICLES, 'readonly');
            const store = transaction.objectStore(STORE_ARTICLES);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    async addToQueue(article) {
        const db = await dbPromise;
        const transaction = db.transaction(STORE_QUEUE, 'readwrite');
        const store = transaction.objectStore(STORE_QUEUE);
        store.put(article);
        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    },

    async removeFromQueue(id) {
        const db = await dbPromise;
        const transaction = db.transaction(STORE_QUEUE, 'readwrite');
        const store = transaction.objectStore(STORE_QUEUE);
        store.delete(id);
        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    },

    async getQueue() {
        const db = await dbPromise;
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_QUEUE, 'readonly');
            const store = transaction.objectStore(STORE_QUEUE);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async clearArticles() {
        const db = await dbPromise;
        const transaction = db.transaction(STORE_ARTICLES, 'readwrite');
        const store = transaction.objectStore(STORE_ARTICLES);
        store.clear();
        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    },

    async saveArticles(articles) {
        const db = await dbPromise;
        const transaction = db.transaction(STORE_ARTICLES, 'readwrite');
        const store = transaction.objectStore(STORE_ARTICLES);
        articles.forEach(article => store.put(article));
        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }
};
