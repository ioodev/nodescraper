'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const NodeScraper = require('../index');
const { startTestServer } = require('./helpers/test-server');

const FIXTURE_HTML = fs.readFileSync(
  path.join(__dirname, 'fixtures', 'sample.html'),
  'utf8'
);

// ---------------------------------------------------------------------
// loadHTML() — no network required
// ---------------------------------------------------------------------

test('loadHTML() parses a raw HTML string synchronously', () => {
  const scraper = new NodeScraper('https://example.com');
  scraper.loadHTML(FIXTURE_HTML);

  assert.equal(scraper.isLoaded(), true);
  assert.equal(scraper.title(), 'Example Domain');
});

test('metadata getters return expected values', () => {
  const scraper = new NodeScraper('https://example.com').loadHTML(FIXTURE_HTML);

  assert.equal(scraper.description(), 'This is the example meta description.');
  assert.equal(scraper.author(), 'Jane Doe');
  assert.equal(scraper.canonical(), 'https://example.com/canonical');
  assert.equal(scraper.charset(), 'UTF-8');
  assert.equal(scraper.csrf_token(), 'abc123token');
  assert.equal(scraper.lang(), 'en');
  assert.equal(scraper.robots(), 'index, follow');
  assert.equal(scraper.image(), 'https://example.com/og.png');
});

test('keywords() and viewport() are trimmed (bug fix)', () => {
  const scraper = new NodeScraper('https://example.com').loadHTML(FIXTURE_HTML);

  assert.deepEqual(scraper.keywords(), ['example', 'domain', 'test']);
  assert.deepEqual(scraper.viewport(), ['width=device-width', 'initial-scale=1']);
});

test('viewport_object() parses viewport directives into key/value pairs', () => {
  const scraper = new NodeScraper('https://example.com').loadHTML(FIXTURE_HTML);

  assert.deepEqual(scraper.viewport_object(), {
    width: 'device-width',
    'initial-scale': '1'
  });
});

test('open_graph() and twitter_card() read the expected properties', () => {
  const scraper = new NodeScraper('https://example.com').loadHTML(FIXTURE_HTML);

  assert.deepEqual(scraper.open_graph(), {
    'og:site_name': 'Example',
    'og:type': 'website',
    'og:title': 'Example OG Title',
    'og:description': 'Example OG description',
    'og:url': 'https://example.com',
    'og:image': 'https://example.com/og.png'
  });

  assert.equal(scraper.open_graph('og:title'), 'Example OG Title');
  assert.equal(scraper.twitter_card('twitter:card'), 'summary_large_image');
});

test('jsonLd() parses structured data blocks', () => {
  const scraper = new NodeScraper('https://example.com').loadHTML(FIXTURE_HTML);

  assert.deepEqual(scraper.jsonLd(), [
    { '@context': 'https://schema.org', '@type': 'Organization', name: 'Example Co' }
  ]);
});

test('favicon() resolves to an absolute URL using the page URL as base', () => {
  const scraper = new NodeScraper('https://example.com/page').loadHTML(FIXTURE_HTML);

  assert.equal(scraper.favicon(), 'https://example.com/favicon.ico');
});

test('headings and lists', () => {
  const scraper = new NodeScraper('https://example.com').loadHTML(FIXTURE_HTML);

  assert.deepEqual(scraper.h1(), ['Welcome', 'Latest News', 'Card Title']);
  assert.deepEqual(scraper.h2(), ['Section A']);
  assert.deepEqual(scraper.ul(), ['Item 1', 'Item 2']);
  assert.deepEqual(scraper.ol(), ['First', 'Second']);
});

test('text() returns normalized, whitespace-collapsed body text', () => {
  const scraper = new NodeScraper('https://example.com').loadHTML(FIXTURE_HTML);

  const text = scraper.text();
  assert.ok(text.includes('Welcome'));
  assert.ok(!text.includes('\n'));
});

test('images() and image_details() include absolute_url', () => {
  const scraper = new NodeScraper('https://example.com/sub/').loadHTML(FIXTURE_HTML);

  assert.deepEqual(scraper.images(), ['/img1.png', '/img2.png']);

  const details = scraper.image_details();
  assert.equal(details[0].alt_text, 'Image One');
  assert.equal(details[0].absolute_url, 'https://example.com/img1.png');
});

test('links() and link_details(): rel defaults to [] instead of [""] (bug fix)', () => {
  const scraper = new NodeScraper('https://example.com').loadHTML(FIXTURE_HTML);

  assert.deepEqual(scraper.links(), ['https://external.com', '/internal']);

  const details = scraper.link_details();
  const internal = details.find((l) => l.url === '/internal');
  assert.deepEqual(internal.rel, []);

  const external = details.find((l) => l.url === 'https://external.com');
  assert.deepEqual(external.rel, ['nofollow', 'noopener']);
  assert.equal(external.is_nofollow, true);
  assert.equal(external.absolute_url, 'https://external.com/');
});

test('filter() extracts nested content by tag/class/id selectors', () => {
  const scraper = new NodeScraper('https://example.com').loadHTML(FIXTURE_HTML);

  const result = scraper.filter({
    element: 'div',
    attributes: { id: 'main' },
    extract: ['h1', '.title', '#desc']
  });

  assert.deepEqual(result, {
    h1: 'Card Title',
    class__title: 'Card subtitle',
    id__desc: 'Card description text'
  });
});

test('filter() with multiple:true and returnHtml:false returns trimmed text array', () => {
  const scraper = new NodeScraper('https://example.com').loadHTML(FIXTURE_HTML);

  const result = scraper.filter({
    element: 'p',
    attributes: { class: 'dark-text' },
    multiple: true,
    returnHtml: false
  });

  assert.deepEqual(result, ['Hello world paragraph.']);
});

test('filter() fails soft (returns null) on an invalid selector instead of throwing', () => {
  const scraper = new NodeScraper('https://example.com').loadHTML(FIXTURE_HTML);

  assert.equal(scraper.filter({ element: ':::not-a-selector' }), null);
});

test('toJSON() returns a snapshot of common fields', () => {
  const scraper = new NodeScraper('https://example.com').loadHTML(FIXTURE_HTML);
  const snapshot = scraper.toJSON();

  assert.equal(snapshot.title, 'Example Domain');
  assert.equal(snapshot.lang, 'en');
  assert.equal(snapshot.linkCount, 2);
  assert.equal(snapshot.imageCount, 2);
});

test('all getters return null before any document is loaded', () => {
  const scraper = new NodeScraper('https://example.com');

  assert.equal(scraper.isLoaded(), false);
  assert.equal(scraper.title(), null);
  assert.equal(scraper.h1(), null);
  assert.equal(scraper.links(), null);
  assert.equal(scraper.filter({ element: 'div' }), null);
});

// ---------------------------------------------------------------------
// init() — exercised against a local HTTP server
// ---------------------------------------------------------------------

test('init() loads a page over HTTP and parses it', async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());

  const scraper = new NodeScraper(server.url);
  await scraper.init();

  assert.equal(scraper.isLoaded(), true);
  assert.equal(scraper.getStatusCode(), 200);
  assert.equal(scraper.getError(), null);
  assert.equal(scraper.title(), 'Example Domain');
});

test('init() reports a descriptive error on 404 instead of failing silently (bug fix)', async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());

  const scraper = new NodeScraper(`${server.url}/not-found`);
  await scraper.init();

  assert.equal(scraper.isLoaded(), false);
  assert.equal(scraper.getStatusCode(), 404);
  assert.ok(scraper.getError() instanceof Error);
  assert.match(scraper.getError().message, /404/);
});

test('init() follows redirects', async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());

  const scraper = new NodeScraper(`${server.url}/redirect`);
  await scraper.init();

  assert.equal(scraper.isLoaded(), true);
  assert.equal(scraper.title(), 'Example Domain');
});

test('init() sends a browser-like default User-Agent so UA-filtering sites do not 403 (bug fix)', async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());

  const scraper = new NodeScraper(`${server.url}/blocked-ua`);
  await scraper.init();

  assert.equal(scraper.isLoaded(), true);
  assert.equal(scraper.getStatusCode(), 200);
});

test('init() respects a custom timeout and reports a timeout error', async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());

  const scraper = new NodeScraper(`${server.url}/slow`, { timeout: 50 });
  await scraper.init();

  assert.equal(scraper.isLoaded(), false);
  assert.ok(scraper.getError() instanceof Error);
});

test('init() rejects unsupported protocols by default (e.g. file:)', async () => {
  const scraper = new NodeScraper('file:///etc/passwd');
  await scraper.init();

  assert.equal(scraper.isLoaded(), false);
  assert.ok(scraper.getError() instanceof Error);
  assert.match(scraper.getError().message, /Invalid or unsupported URL/);
});

test('init() with throwOnError:true rejects instead of swallowing the error', async () => {
  const scraper = new NodeScraper('not a url', { throwOnError: true });
  await assert.rejects(() => scraper.init(), /Invalid or unsupported URL/);
});

test('NodeScraper.scrape() is a one-call convenience wrapper', async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());

  const scraper = await NodeScraper.scrape(server.url);
  assert.equal(scraper.title(), 'Example Domain');
});

test('NodeScraper.scrapeAll() scrapes multiple URLs concurrently', async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());

  const results = await NodeScraper.scrapeAll([server.url, `${server.url}/not-found`]);

  assert.equal(results.length, 2);
  assert.equal(results[0].isLoaded(), true);
  assert.equal(results[1].isLoaded(), false);
});
