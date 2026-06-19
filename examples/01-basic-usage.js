/**
 * Basic usage: fetch a page, read metadata, and check for load errors.
 *
 * Run: npm run example:basic
 */
const NodeScraper = require('../index');

(async () => {
  const scraper = new NodeScraper('https://example.com');
  await scraper.init();

  if (!scraper.isLoaded()) {
    console.error('Failed to load page:', scraper.getError()?.message);
    process.exit(1);
  }

  console.log('Title:      ', scraper.title());
  console.log('Description:', scraper.description());
  console.log('Canonical:  ', scraper.canonical());
  console.log('Lang:       ', scraper.lang());
  console.log('H1s:        ', scraper.h1());
  console.log('Open Graph: ', scraper.open_graph());

  // toJSON() gives you a ready-to-serialize snapshot of the common fields.
  console.log('\nSnapshot:', JSON.stringify(scraper.toJSON(), null, 2));
})();
