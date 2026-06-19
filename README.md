# 🕸️ NodeScraper

**NodeScraper** is a fast and flexible Node.js web scraping toolkit built on [Axios](https://www.npmjs.com/package/axios) and [Cheerio](https://www.npmjs.com/package/cheerio). It gives you a small, predictable API for pulling structured metadata and HTML out of a page — titles, Open Graph/Twitter Card tags, JSON-LD, headings, lists, images, links, and arbitrary DOM fragments — with clean, consistent return values.

> Fast. Clean. JavaScript-style scraping. 🕸️⚡

![version](https://img.shields.io/badge/version-1.1.0-blue)
![license](https://img.shields.io/badge/license-MIT-green)
![node](https://img.shields.io/badge/node-%3E%3D16-brightgreen)

---

## Table of Contents

- [What's new in 1.1.0](#-whats-new-in-110)
- [Features](#-features)
- [Installation](#-installation)
- [Quick start](#-quick-start)
- [Error handling](#-error-handling)
- [API reference](#-api-reference)
- [Custom DOM filtering](#-custom-dom-filtering)
- [TypeScript](#-typescript)
- [Project structure](#-project-structure)
- [Testing](#-testing)
- [Examples](#-examples)
- [Migrating from 1.0.x](#-migrating-from-10x)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🆕 What's new in 1.1.0

This release fixes several real bugs and adds capabilities that were
missing from 1.0 — full details in [`CHANGELOG.md`](./CHANGELOG.md).

**Fixed**
- `keywords()` / `viewport()` no longer return untrimmed strings (`" domain"` → `"domain"`).
- `link_details().rel` is `[]` instead of `['']` when a link has no `rel` attribute.
- Failed loads are no longer silent — `getError()` / `getStatusCode()` tell you *why* a scrape failed (network error, timeout, 404/403/500, invalid URL).
- A realistic default `User-Agent` is now sent, so sites that block the bare Axios UA no longer fail with no explanation.
- `filter()` fails soft (`null`) instead of throwing on a malformed selector.
- URLs are restricted to `http:`/`https:` by default, failing fast with a clear error.

**Added**
- `loadHTML(html)` — parse a raw HTML string with no network request.
- `meta()`, `lang()`, `robots()`, `favicon()`, `jsonLd()`, `text()`, `html()`, `viewport_object()`, `toJSON()`.
- `absolute_url` field on `link_details()` / `image_details()`.
- Constructor options: `timeout`, `userAgent`, `headers`, `maxRedirects`, `allowedProtocols`, `throwOnError`.
- `NodeScraper.scrape()` / `NodeScraper.scrapeAll()` static convenience methods.
- TypeScript declarations, a real test suite, and runnable examples.

Nothing here is a breaking change to method names or return *shapes* — see [Migrating from 1.0.x](#-migrating-from-10x) if you depended on the buggy behavior.

---

## 🚀 Features

- ✅ Page metadata: title, description, keywords, author, charset, lang, robots, favicon, and more
- ✅ Open Graph, Twitter Card, canonical, CSRF token, and JSON-LD structured data
- ✅ HTML extraction: `h1`–`h6`, `p`, `ul`, `ol`, images, links — with absolute URLs resolved for you
- ✅ Powerful `filter()` method with class/ID/tag selectors for arbitrary DOM fragments
- ✅ Clear error reporting (`getError()`, `getStatusCode()`, `isLoaded()`) instead of silent failures
- ✅ Load from a live URL **or** from a raw HTML string (`loadHTML()`) — easy to test and reuse
- ✅ Configurable timeout, headers, User-Agent, redirects, and allowed protocols
- ✅ One-line single/batch scraping via `NodeScraper.scrape()` / `scrapeAll()`
- ✅ Ships with TypeScript declarations
- ✅ Zero-dependency test suite using Node's built-in test runner

---

## 📦 Installation

```bash
npm install @riodevnet/nodescraper
```

> Requires Node.js 16 or later.

---

## 🛠️ Quick start

```js
const NodeScraper = require("@riodevnet/nodescraper");

(async () => {
  const scraper = new NodeScraper("https://example.com");
  await scraper.init();

  if (!scraper.isLoaded()) {
    console.error("Scrape failed:", scraper.getError().message);
    return;
  }

  console.log(scraper.title());        // "Welcome to Example.com"
  console.log(scraper.description());  // "This is the example meta description."
  console.log(scraper.h1());           // ["Welcome", "Latest News"]
  console.log(scraper.open_graph());   // { "og:title": "...", "og:description": "...", ... }

  // One call, every common field:
  console.log(scraper.toJSON());
})();
```

Or with the one-line convenience wrapper:

```js
const scraper = await NodeScraper.scrape("https://example.com");
```

---

## ⚠️ Error handling

Unlike 1.0, failures are no longer silent. After `init()`, always check
`isLoaded()` (or `getError()`) before calling the getters:

```js
const scraper = await NodeScraper.scrape("https://example.com/maybe-missing");

if (!scraper.isLoaded()) {
  console.error(scraper.getError().message); // e.g. "Request failed with status code 404"
  console.error(scraper.getStatusCode());    // 404, or null for network-level failures
} else {
  console.log(scraper.title());
}
```

If you'd rather handle failures with try/catch, pass `throwOnError: true`:

```js
try {
  const scraper = await NodeScraper.scrape(url, { throwOnError: true });
  console.log(scraper.title());
} catch (err) {
  console.error("Scrape failed:", err.message);
}
```

When no document is loaded (before `init()`/`loadHTML()`, or after a failed
load), every getter returns `null` rather than throwing — it's always safe
to call them, you just won't get data back.

---

## 🧪 API reference

### Constructor

```js
new NodeScraper(url, options);
```

| Option             | Type       | Default                          | Description                                              |
|---------------------|------------|-----------------------------------|------------------------------------------------------------|
| `timeout`           | `number`   | `10000`                           | Request timeout, in ms.                                    |
| `userAgent`         | `string`   | a realistic browser-like UA       | Sent as the `User-Agent` header.                            |
| `headers`           | `object`   | `{}`                               | Extra headers merged into the request.                      |
| `maxRedirects`      | `number`   | `5`                                | Maximum redirects to follow.                                 |
| `allowedProtocols`  | `string[]` | `['http:', 'https:']`             | Protocols accepted by the URL validator.                     |
| `throwOnError`      | `boolean`  | `false`                            | If `true`, `init()` rejects instead of recording the error.  |

### Loading

```js
await scraper.init();        // fetch `url` and parse the response
scraper.loadHTML(htmlString); // parse a raw HTML string, no network request
scraper.isLoaded();           // boolean
scraper.getError();           // Error | null
scraper.getStatusCode();      // number | null
```

### Page metadata

```js
scraper.title();
scraper.description();
scraper.keywords();         // string[] | null, trimmed
scraper.keyword_string();   // raw "keywords" content attribute
scraper.charset();
scraper.lang();              // <html lang="...">
scraper.canonical();
scraper.content_type();
scraper.author();
scraper.csrf_token();
scraper.image();             // shorthand for og:image
scraper.favicon();           // absolute URL
scraper.robots();
scraper.viewport();          // string[] | null, e.g. ["width=device-width", "initial-scale=1"]
scraper.viewport_string();   // raw content attribute
scraper.viewport_object();   // { width: "device-width", "initial-scale": "1" }
scraper.meta("theme-color"); // any meta[name=...] (pass attr: 'property' for meta[property=...])
```

### Open Graph, Twitter Card & JSON-LD

```js
scraper.open_graph();             // all known og:* properties
scraper.open_graph("og:title");   // a single property

scraper.twitter_card();
scraper.twitter_card("twitter:title");

scraper.jsonLd();                 // parsed array of every <script type="application/ld+json"> block
```

### Headings, text & lists

```js
scraper.h1(); scraper.h2(); scraper.h3();
scraper.h4(); scraper.h5(); scraper.h6();
scraper.p();

scraper.text();   // normalized, whitespace-collapsed visible body text
scraper.html();   // raw HTML of the last successful load

scraper.ul();      // flattened <li> text from every <ul>
scraper.ol();      // flattened <li> text from every <ol>
```

### Images & links

```js
scraper.images();         // string[] of img src
scraper.image_details();  // [{ url, absolute_url, alt_text, title }]

scraper.links();          // string[] of href
scraper.link_details();
// [{ url, absolute_url, protocol, text, title, target, rel,
//    is_nofollow, is_ugc, is_noopener, is_noreferrer }]
```

### Convenience

```js
scraper.toJSON();
// { url, statusCode, title, description, canonical, lang, charset, robots,
//   keywords, author, image, favicon, openGraph, twitterCard,
//   headings: { h1, h2, h3 }, linkCount, imageCount }

NodeScraper.scrape(url, options);        // Promise<NodeScraper>
NodeScraper.scrapeAll(urls, options);    // Promise<NodeScraper[]>, concurrent
```

---

## 🔍 Custom DOM filtering

Use `filter()` to target specific elements and pull nested content out of them.

```js
// Single element
scraper.filter({
  element: "div",
  attributes: { id: "main" },
  extract: [".title", "#description", "p"],
});

// Multiple elements
scraper.filter({
  element: "div",
  attributes: { class: "card" },
  multiple: true,
  extract: ["h1", ".subtitle", "#meta"],
});

// Plain text instead of HTML
scraper.filter({
  element: "p",
  attributes: { class: "dark-text" },
  multiple: true,
  returnHtml: false,
});
```

- `extract` accepts tag names, class selectors (`.title`), or ID selectors (`#meta`).
- Output keys are normalized: `.title` → `class__title`, `#meta` → `id__meta`.
- With no `extract`, you get the matched element's inner HTML (`returnHtml: true`, the default) or trimmed text (`returnHtml: false`).
- An invalid selector or no match returns `null` (or `[]` for `multiple: true`) — it never throws.

---

## 📘 TypeScript

Type declarations ship with the package (`types/index.d.ts`, wired up via
`package.json#types`) — no `@types/` package needed:

```ts
import NodeScraper, { ScraperSnapshot, LinkDetails } from "@riodevnet/nodescraper";

const scraper = new NodeScraper("https://example.com");
await scraper.init();

const snapshot: ScraperSnapshot | null = scraper.toJSON();
const links: LinkDetails[] | null = scraper.link_details();
```

---

## 📁 Project structure

```
nodescraper/
├── .github/
│   └── workflows/
│       └── test.yml          # CI: runs the test suite on push/PR across Node 16–22
├── examples/
│   ├── 01-basic-usage.js
│   ├── 02-custom-filter.js
│   ├── 03-batch-scraping.js
│   └── 04-json-ld-and-extras.js
├── src/
│   ├── NodeScraper.js         # main class — all implementation lives here
│   ├── constants.js           # default UA, timeout, OG/Twitter property lists
│   └── utils.js                # small pure helpers (URL validation, trimming, etc.)
├── test/
│   ├── fixtures/
│   │   └── sample.html         # HTML fixture used by the test suite
│   ├── helpers/
│   │   └── test-server.js      # local HTTP server (200/404/redirect/403/slow routes)
│   └── nodescraper.test.js     # the test suite itself
├── types/
│   └── index.d.ts              # TypeScript declarations
├── index.js                    # entry point — re-exports src/NodeScraper.js
├── package.json
├── CHANGELOG.md
├── README.md
└── LICENSE
```

`index.js` stays a thin re-export so `require("@riodevnet/nodescraper")`
keeps working exactly as before; all real logic lives under `src/`, which
keeps the public entry point stable while leaving room to split the
implementation further (e.g. a `src/extractors/` folder) without touching
how consumers import the package.

---

## 🧪 Testing

The test suite uses Node's built-in test runner — no extra dev dependency
required.

```bash
npm test           # run the suite once
npm run test:watch # re-run on file changes
```

It covers:
- Metadata/OG/Twitter/JSON-LD extraction against a fixture page
- The bug fixes above (trimmed keywords/viewport, empty `rel`)
- `filter()`, including the malformed-selector fail-soft path
- `init()` against a local HTTP server: 200, 404, redirects, UA-blocking, timeouts, and rejected protocols
- `loadHTML()`, `toJSON()`, and the `scrape()` / `scrapeAll()` static helpers

---

## 💡 Examples

Runnable scripts live in [`examples/`](./examples):

```bash
npm run example:basic   # metadata + toJSON()
npm run example:filter  # filter() single/multiple/text-vs-html
npm run example:batch   # scrapeAll() with custom headers/timeout
npm run example:extras  # loadHTML(), jsonLd(), favicon(), meta()
```

---

## 🔁 Migrating from 1.0.x

No method was renamed or removed, so existing calls keep working as-is.
Two return values changed because they were bugs, not intentional API:

| Method                         | 1.0.x                              | 1.1.0                              |
|----------------------------------|--------------------------------------|---------------------------------------|
| `keywords()` / `viewport()`      | entries could have leading spaces    | entries are trimmed                    |
| `link_details()[i].rel`          | `['']` when no `rel` attribute       | `[]` when no `rel` attribute           |

If your code special-cased either of those (e.g. `.map(k => k.trim())` on
`keywords()`, or checked `rel.length === 1 && rel[0] === ''`), you can drop
that workaround.

Everything else — `loadHTML()`, `meta()`, `lang()`, `robots()`, `favicon()`,
`jsonLd()`, `text()`, `html()`, `viewport_object()`, `toJSON()`,
`absolute_url` fields, constructor `options`, and the static `scrape()` /
`scrapeAll()` helpers — is purely additive.

---

## 🤝 Contributing

Contributions are welcome! Found a bug or want to request a feature?
Please open an [issue](https://github.com/riodevnet/nodescraper/issues) or
submit a pull request. Run `npm test` before submitting — CI runs the same
suite across Node 16, 18, 20, and 22.

---

## 📄 License

MIT License © 2025–2026 — NodeScraper

---

## 🔗 Related Projects

- [Axios](https://axios-http.com/)
- [Cheerio](https://cheerio.js.org/)
- [Node.js](https://nodejs.org/)

---

## 💡 Why NodeScraper?

> Think of it as your JavaScript web detective — fast, efficient, and precise.
