# Offline News PWA

A Progressive Web App (PWA) that allows users to read news articles offline. It fetches the latest headlines when online, caches them using IndexedDB, and provides a seamless reading experience even without an internet connection.

## Features

-   **Offline Access:** Read previously fetched news articles without an internet connection.
-   **Live News Feed:** Fetches top US headlines using a public News API wrapper.
-   **Reading Queue:** Save articles to a "Read Later" queue.
-   **Search:** Filter articles by title or content.
-   **Article Reader:** Distraction-free modal view for reading articles (simulated full content).
-   **PWA Support:** Installable on mobile and desktop devices.
-   **Auto-Sync:** Automatically refreshes the feed when coming back online.
-   **Smart Caching:** Clears old news to keep the feed fresh while preserving the reading queue.

## Tech Stack

-   **Frontend:** HTML5, CSS3, JavaScript (ES6+)
-   **Styling:** [TailwindCSS](https://tailwindcss.com/) (via CDN)
-   **Icons:** [Lucide Icons](https://lucide.dev/) (via CDN)
-   **Storage:** [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) (for articles and queue)
-   **Offline & Caching:** [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) & [Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache)
-   **Data Source:** [Saurav.tech NewsAPI Wrapper](https://saurav.tech/NewsAPI/)

## Setup & Running

1.  Clone the repository.
2.  Since this uses Service Workers, it requires a secure context (HTTPS) or `localhost`.
3.  You can use a simple static server like `http-server` or the "Live Server" extension in VS Code.

### Using Python
```bash
python -m http.server 8000
```
Then open `http://localhost:8000` in your browser.

### Using Node.js (http-server)
```bash
npx http-server .
```

## Project Structure

-   `index.html`: Main application shell.
-   `app.js`: Core application logic (UI, Event Listeners, Data Fetching).
-   `db.js`: IndexedDB wrapper for database operations.
-   `sw.js`: Service Worker for caching assets and offline support.
-   `style.css`: Custom styles and animations.
-   `manifest.json`: PWA manifest file.
