document.addEventListener('DOMContentLoaded', () => {
    // Set today's date dynamically in WSJ format
    const dateElement = document.getElementById('current-date');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateElement.textContent = new Date().toLocaleDateString('en-US', options);

    fetchNews();
});

async function fetchNews() {
    const loading = document.getElementById('loading');
    const mainContent = document.getElementById('main-content');
    const leftCol = document.getElementById('left-column');
    const centerCol = document.getElementById('center-column');
    const rightCol = document.getElementById('right-column');
    const bottomGrid = document.getElementById('bottom-grid');

    try {
        // Cache bust to always get fresh news
        const response = await fetch('news.json?v=' + Date.now());
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const articles = data.articles || [];

        loading.style.display = 'none';

        if (articles.length === 0) {
            loading.innerHTML = '<p style="text-align:center;color:#666;font-style:italic;">Fetching latest edition. Please refresh in a moment.</p>';
            loading.style.display = 'block';
            return;
        }

        mainContent.style.display = 'flex';

        // Update the "last updated" timestamp in nav if it exists
        const updatedEl = document.getElementById('last-updated');
        if (updatedEl && data.updatedAt) {
            const d = new Date(data.updatedAt);
            updatedEl.textContent = 'Updated: ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        }

        articles.forEach((article, index) => {
            if (index === 0) {
                centerCol.appendChild(createFeaturedArticle(article));
            } else if (index === 1) {
                // Second article also goes in center to fill space
                const divider = document.createElement('hr');
                divider.style.cssText = 'border: none; border-top: 1px solid #dfdfdf; margin: 20px 0;';
                centerCol.appendChild(divider);
                centerCol.appendChild(createStandardArticle(article));
            } else if (index >= 2 && index <= 4) {
                leftCol.appendChild(createStandardArticle(article));
            } else if (index >= 5 && index <= 7) {
                rightCol.appendChild(createStandardArticle(article));
            } else {
                bottomGrid.appendChild(createGridArticle(article));
            }
        });

    } catch (error) {
        console.error('Failed to load news:', error);
        loading.innerHTML = '<p style="color:#cc0000;text-align:center;font-style:italic;">Failed to load latest edition. Refreshing automatically...</p>';
        loading.style.display = 'block';
        // Auto-retry after 30 seconds
        setTimeout(() => location.reload(), 30000);
    }
}

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    const now = new Date();
    const mins = Math.floor((now - d) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function createFeaturedArticle(article) {
    const wrapper = document.createElement('article');
    wrapper.className = 'article featured-article';

    const title = article.title || 'Breaking Financial News';
    const summary = article.summary || article.content || '';
    const content = article.content || summary;
    const link = article.link || '#';
    const category = article.category || 'Finance';
    const source = article.source || 'Reuters';
    const ago = timeAgo(article.pubDate);
    const rt = article.readTime || '2 min read';

    wrapper.innerHTML = `
        <div class="article-category">${category}</div>
        <h2 class="article-title"><a href="${link}" target="_blank" rel="noopener">${title}</a></h2>
        <p class="article-summary">${summary}</p>
        <p class="article-content">${content}</p>
        <div class="article-meta">
            <span class="article-source">${source}</span>
            <span class="article-dot">·</span>
            <span>${rt}</span>
            <span class="article-dot">·</span>
            <span>${ago}</span>
        </div>
    `;
    return wrapper;
}

function createStandardArticle(article) {
    const wrapper = document.createElement('article');
    wrapper.className = 'article';

    const title = article.title || 'Market Update';
    const summary = article.summary || '';
    const link = article.link || '#';
    const category = article.category || 'Finance';
    const source = article.source || '';
    const ago = timeAgo(article.pubDate);
    const excerpt = summary.length > 130 ? summary.substring(0, 130) + '...' : summary;

    wrapper.innerHTML = `
        <div class="article-category">${category}</div>
        <h3 class="article-title"><a href="${link}" target="_blank" rel="noopener">${title}</a></h3>
        <p class="article-summary">${excerpt}</p>
        <div class="article-meta">
            <span class="article-source">${source}</span>
            <span class="article-dot">·</span>
            <span>${ago}</span>
        </div>
    `;
    return wrapper;
}

function createGridArticle(article) {
    const wrapper = document.createElement('article');
    wrapper.className = 'article grid-article';

    const title = article.title || 'Market Update';
    const summary = article.summary || '';
    const link = article.link || '#';
    const category = article.category || 'Finance';
    const source = article.source || '';
    const ago = timeAgo(article.pubDate);
    const excerpt = summary.length > 120 ? summary.substring(0, 120) + '...' : summary;

    wrapper.innerHTML = `
        <div class="article-category">${category}</div>
        <h4 class="article-title"><a href="${link}" target="_blank" rel="noopener">${title}</a></h4>
        <p class="article-summary">${excerpt}</p>
        <div class="article-meta">
            <span class="article-source">${source}</span>
            <span class="article-dot">·</span>
            <span>${ago}</span>
        </div>
    `;
    return wrapper;
}
