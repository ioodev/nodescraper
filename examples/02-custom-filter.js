/**
 * Custom DOM filtering with filter().
 *
 * Run: npm run example:filter
 */
const NodeScraper = require('../index');

(async () => {
  const scraper = new NodeScraper('https://example.com');
  await scraper.init();

  if (!scraper.isLoaded()) {
    console.error('Failed to load page:', scraper.getError()?.message);
    process.exit(1);
  }

  // Single element: grab the first <div id="main"> and pull nested fields out of it.
  const main = scraper.filter({
    element: 'div',
    attributes: { id: 'main' },
    extract: ['h1', '.title', '#desc']
  });
  console.log('Single match:', main);

  // Multiple elements: every <div class="card"> on the page, as plain text.
  const cards = scraper.filter({
    element: 'div',
    attributes: { class: 'card' },
    multiple: true,
    returnHtml: false
  });
  console.log('All cards (text):', cards);

  // Multiple elements, raw inner HTML instead of text.
  const cardsHtml = scraper.filter({
    element: 'div',
    attributes: { class: 'card' },
    multiple: true,
    returnHtml: true
  });
  console.log('All cards (html):', cardsHtml);
})();
