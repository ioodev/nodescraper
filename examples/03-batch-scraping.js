/**
 * Scrape several URLs concurrently with NodeScraper.scrapeAll(), and
 * customize the request (User-Agent, timeout, headers).
 *
 * Run: npm run example:batch
 */
const NodeScraper = require('../index');

(async () => {
  const urls = [
    'https://example.com',
    'https://example.org',
    'https://example.net'
  ];

  const results = await NodeScraper.scrapeAll(urls, {
    timeout: 8000,
    userAgent: 'Mozilla/5.0 (compatible; MyCrawler/1.0)',
    headers: { 'Accept-Language': 'en-US,en;q=0.9' }
  });

  for (const scraper of results) {
    if (!scraper.isLoaded()) {
      console.log(`✗ ${scraper.url} — ${scraper.getError()?.message}`);
      continue;
    }
    console.log(`✓ ${scraper.url} — "${scraper.title()}"`);
  }
})();
