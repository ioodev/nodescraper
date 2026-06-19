/**
 * Newer extras: JSON-LD structured data, favicon resolution, generic
 * meta() lookups, and loading raw HTML without a network request.
 *
 * Run: npm run example:extras
 */
const NodeScraper = require('../index');

(async () => {
  // --- Loading raw HTML directly (no HTTP request) ---------------------
  const offline = new NodeScraper('https://example.com').loadHTML(`
    <html lang="en">
      <head>
        <title>Offline Page</title>
        <meta name="theme-color" content="#0f172a">
        <script type="application/ld+json">
          { "@context": "https://schema.org", "@type": "Article", "headline": "Hello" }
        </script>
      </head>
      <body><h1>Hello from a string</h1></body>
    </html>
  `);

  console.log('Offline title:    ', offline.title());
  console.log('Offline custom meta:', offline.meta('theme-color'));
  console.log('Offline JSON-LD:  ', offline.jsonLd());

  // --- Live page -----------------------------------------------------
  const scraper = new NodeScraper('https://example.com');
  await scraper.init();

  if (!scraper.isLoaded()) {
    console.error('Failed to load page:', scraper.getError()?.message);
    return;
  }

  console.log('\nFavicon (absolute):', scraper.favicon());
  console.log('Robots directive:  ', scraper.robots());
  console.log('Viewport object:   ', scraper.viewport_object());
  console.log('Full text length:  ', scraper.text()?.length);
})();
