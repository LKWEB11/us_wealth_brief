const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Top financial RSS sources (with fallbacks)
const RSS_URLS = [
  "https://finance.yahoo.com/news/rssindex",
  "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664",
  "https://feeds.marketwatch.com/marketwatch/realtimeheadlines/",
  "https://rss.cnn.com/rss/money_news_international.rss",
  "https://www.investing.com/rss/news.rss",
  "https://feeds.feedburner.com/fortunemagazine/sections/finance"
];

// Clean and format article content
function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Categorize article by keywords
function categorize(title) {
  const t = title.toLowerCase();
  if (t.includes('crypto') || t.includes('bitcoin') || t.includes('ethereum') || t.includes('ripple')) return 'Crypto';
  if (t.includes('ai') || t.includes('tech') || t.includes('nvidia') || t.includes('apple') || t.includes('google') || t.includes('microsoft')) return 'Tech';
  if (t.includes('fed') || t.includes('rate') || t.includes('inflation') || t.includes('economy') || t.includes('gdp')) return 'Economy';
  if (t.includes('stock') || t.includes('market') || t.includes('s&p') || t.includes('nasdaq') || t.includes('dow')) return 'Markets';
  if (t.includes('oil') || t.includes('gold') || t.includes('silver') || t.includes('commodit')) return 'Commodities';
  if (t.includes('real estate') || t.includes('housing') || t.includes('mortgage')) return 'Real Estate';
  return 'Finance';
}

// Estimate reading time
function readTime(text) {
  const words = (text || '').split(' ').length;
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
}

// Fetch a URL with a timeout (no external deps)
function fetchUrl(url, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; USWealthBrief/2.0; +https://us-wealth-brief.web.app)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      },
      timeout: timeoutMs
    };

    const req = proto.get(url, options, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location, timeoutMs).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });

    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
    req.on('error', reject);
  });
}

// Minimal XML RSS parser (no external package needed)
function parseRSS(xmlText, sourceUrl) {
  const articles = [];
  // Extract channel title
  const chanTitle = (xmlText.match(/<channel>[\s\S]*?<title>(.*?)<\/title>/) || [])[1] || new URL(sourceUrl).hostname;

  // Extract all <item> blocks
  const itemPattern = /<item[\s\S]*?<\/item>/gi;
  const items = xmlText.match(itemPattern) || [];

  for (const item of items) {
    const get = (tag) => {
      const m = item.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return m ? (m[1] || m[2] || '').trim() : '';
    };

    const title = cleanText(get('title'));
    if (!title) continue;

    const summary = cleanText(get('description') || get('summary') || '');
    const content = cleanText(get('content:encoded') || get('content') || summary);
    const link = (get('link') || '').replace(/\s/g, '').replace(/^<!\[CDATA\[|\]\]>$/g, '').trim();
    const pubDate = get('pubDate') || get('dc:date') || new Date().toISOString();

    articles.push({
      title,
      summary: summary.substring(0, 300) || title,
      content: content.substring(0, 800) || summary.substring(0, 400) || title,
      category: categorize(title),
      source: cleanText(chanTitle),
      link: link || '#',
      pubDate,
      readTime: readTime(content || summary)
    });
  }
  return articles;
}

async function fetchAllNews() {
  let allArticles = [];
  let seen = new Set();

  for (const url of RSS_URLS) {
    try {
      console.log(`Fetching RSS: ${url}`);
      const xml = await fetchUrl(url, 12000);
      const items = parseRSS(xml, url);
      console.log(`  → Got ${items.length} items from ${url}`);

      for (const item of items) {
        if (!item.title || seen.has(item.title)) continue;
        seen.add(item.title);
        allArticles.push(item);
      }
    } catch (e) {
      console.error(`  ✗ Failed ${url}: ${e.message}`);
    }
  }

  console.log(`Total unique articles collected: ${allArticles.length}`);
  allArticles.sort(() => 0.5 - Math.random());
  return allArticles.slice(0, 40);
}

async function main() {
  console.log('=== US Wealth Brief - News Generator v2.1 ===');
  console.log('Fetching latest financial news from RSS feeds...');

  const articles = await fetchAllNews();

  const publicDir = path.join(__dirname, '../public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const outPath = path.join(publicDir, 'news.json');

  if (articles.length === 0) {
    console.warn('⚠️  No new articles fetched. Keeping existing news.json if it exists.');
    if (fs.existsSync(outPath)) {
      console.log('✅ Existing news.json retained. Exiting with success.');
      process.exit(0); // Don't fail the deploy — keep old content
    } else {
      console.error('❌ No articles and no existing news.json. Failing.');
      process.exit(1);
    }
  }

  const outputData = {
    updatedAt: new Date().toISOString(),
    totalArticles: articles.length,
    articles
  };

  fs.writeFileSync(outPath, JSON.stringify(outputData, null, 2));

  console.log(`\n✅ SUCCESS! Saved ${articles.length} articles to public/news.json`);
  console.log(`Updated at: ${outputData.updatedAt}`);
  process.exit(0);
}

main().catch(e => {
  console.error('Fatal Error:', e.message);
  process.exit(1);
});
