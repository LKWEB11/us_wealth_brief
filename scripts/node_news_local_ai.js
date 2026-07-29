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

  console.log(`Total unique articles: ${allArticles.length}`);
  allArticles.sort(() => 0.5 - Math.random());
  return allArticles.slice(0, 40);
}

// Generate RSS 2.0 feed for Google News discovery
function generateRSS(articles, updatedAt) {
  const items = articles.slice(0, 20).map(a => {
    const pub = new Date(a.pubDate).toUTCString();
    return `  <item>
    <title><![CDATA[${a.title}]]></title>
    <link>${a.link}</link>
    <description><![CDATA[${a.summary}]]></description>
    <pubDate>${pub}</pubDate>
    <category>${a.category}</category>
    <source url="https://us-wealth-brief.web.app">US Wealth Brief</source>
  </item>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>US Wealth Brief – Daily Financial News</title>
    <link>https://us-wealth-brief.web.app</link>
    <description>Top US financial news: markets, economy, tech, crypto and more – updated every morning.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date(updatedAt).toUTCString()}</lastBuildDate>
    <managingEditor>ukdwuxbjm@mozmail.com (US Wealth Brief)</managingEditor>
    <webMaster>ukdwuxbjm@mozmail.com</webMaster>
    <ttl>60</ttl>
    <atom:link href="https://us-wealth-brief.web.app/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;
}

// Generate Google News Sitemap
function generateNewsSitemap(articles, updatedAt) {
  const today = new Date(updatedAt).toISOString().split('T')[0];
  const items = articles.slice(0, 1000).map(a => {
    const pub = new Date(a.pubDate).toISOString();
    return `  <url>
    <loc>https://us-wealth-brief.web.app/</loc>
    <news:news>
      <news:publication>
        <news:name>US Wealth Brief</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${pub}</news:publication_date>
      <news:title><![CDATA[${a.title}]]></news:title>
      <news:keywords>${a.category}, US finance, economy</news:keywords>
    </news:news>
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${items}
</urlset>`;
}

// Generate per-article JSON-LD structured data block
function generateJsonLD(articles, updatedAt) {
  const newsItems = articles.slice(0, 10).map(a => ({
    "@type": "NewsArticle",
    "headline": a.title,
    "description": a.summary,
    "datePublished": new Date(a.pubDate).toISOString(),
    "dateModified": updatedAt,
    "author": { "@type": "Organization", "name": a.source },
    "publisher": {
      "@type": "Organization",
      "name": "US Wealth Brief",
      "url": "https://us-wealth-brief.web.app",
      "logo": { "@type": "ImageObject", "url": "https://us-wealth-brief.web.app/favicon.ico" }
    },
    "url": a.link,
    "articleSection": a.category,
    "keywords": `US finance, ${a.category}, economy, markets`,
    "inLanguage": "en-US",
    "isPartOf": { "@type": "WebSite", "name": "US Wealth Brief", "url": "https://us-wealth-brief.web.app" }
  }));

  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://us-wealth-brief.web.app/#website",
        "url": "https://us-wealth-brief.web.app",
        "name": "US Wealth Brief",
        "description": "Daily US financial news for American readers",
        "inLanguage": "en-US",
        "publisher": { "@type": "Organization", "name": "US Wealth Brief" },
        "potentialAction": { "@type": "SearchAction", "target": "https://us-wealth-brief.web.app/?s={search_term_string}", "query-input": "required name=search_term_string" }
      },
      ...newsItems
    ]
  }, null, 2);
}

async function main() {
  console.log('=== US Wealth Brief – News Generator v3.0 ===');
  console.log('Fetching latest financial news from RSS feeds...');

  const articles = await fetchAllNews();

  const publicDir = path.join(__dirname, '../public');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  const outPath = path.join(publicDir, 'news.json');

  if (articles.length === 0) {
    console.warn('⚠️  No new articles fetched. Keeping existing news.json if present.');
    if (fs.existsSync(outPath)) {
      console.log('✅ Existing news.json retained. Exiting with success.');
      process.exit(0);
    } else {
      console.error('❌ No articles and no existing news.json. Failing.');
      process.exit(1);
    }
  }

  const updatedAt = new Date().toISOString();

  const outputData = { updatedAt, totalArticles: articles.length, articles };
  fs.writeFileSync(outPath, JSON.stringify(outputData, null, 2));
  console.log(`✅ Saved ${articles.length} articles → public/news.json`);

  // Generate RSS feed (Google News discovery)
  const rss = generateRSS(articles, updatedAt);
  fs.writeFileSync(path.join(publicDir, 'feed.xml'), rss);
  console.log('✅ RSS feed → public/feed.xml');

  // Generate Google News Sitemap
  const newsSitemap = generateNewsSitemap(articles, updatedAt);
  fs.writeFileSync(path.join(publicDir, 'sitemap-news.xml'), newsSitemap);
  console.log('✅ News sitemap → public/sitemap-news.xml');

  // Generate JSON-LD structured data file for injection
  const jsonld = generateJsonLD(articles, updatedAt);
  fs.writeFileSync(path.join(publicDir, 'structured-data.json'), jsonld);
  console.log('✅ JSON-LD → public/structured-data.json');

  console.log(`\n🚀 All files generated. Updated at: ${updatedAt}`);
  process.exit(0);
}

main().catch(e => {
  console.error('Fatal Error:', e.message);
  process.exit(1);
});

