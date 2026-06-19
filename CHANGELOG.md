# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project follows [Semantic Versioning](https://semver.org/).

## [1.1.1] — 2026-06-19

### Changed

- **Package renamed from `@riodevnet/nodescraper` to `@ioodev/nodescraper`.**
  npm scopes are tied 1:1 to an account/organization name and cannot be
  renamed in place, so this is a fresh publish under the `@ioodev` scope
  rather than an update to the old package. No code or API changes.
- Updated all `github.com/riodevnet/...` references (README, `package.json`
  `repository`/`homepage`/`bugs`, default User-Agent string in
  `src/constants.js`, TypeScript header comment) to `github.com/ioodev/...`.

### Compatibility

No functional changes. If you depend on `@riodevnet/nodescraper`, see the
README's "Migrating from `@riodevnet/nodescraper`" section — it's a
drop-in rename, just change the import/install path to `@ioodev/nodescraper`.

## [1.1.0] — 2026-06-19

A bug-fix-and-feature release. Every existing v1.0 method keeps its name
and return shape — code written against 1.0 keeps working — but several
returned values are now *correct* where they previously weren't, and a
number of long-missing capabilities (error visibility, raw-HTML loading,
JSON-LD, etc.) have been added.

### Fixed

- **`keywords()` / `viewport()` returned untrimmed strings.** Splitting
  `"example, domain, test"` on `,` used to yield `["example", " domain",
  " test"]` (note the leading spaces). Entries are now trimmed and empty
  entries are dropped.
- **`link_details()` returned `[""]` instead of `[]`** for `rel` on links
  with no `rel` attribute, which broke `.includes('nofollow')`-style
  checks on those links. `rel` is now reliably `[]` when absent.
- **Failed loads were completely silent.** `init()` swallowed every error
  (network failure, timeout, 404/403/500 responses, invalid URLs) and just
  left `soup` as `null`, with no way to find out *why*. `init()` now
  records the failure on `this.error` / `this.statusCode`, exposed via
  `getError()` and `getStatusCode()`, and an explicit `isLoaded()` check.
- **No default `User-Agent`.** Axios' default UA string causes many real
  sites to return 403 or an empty body. NodeScraper now sends a realistic
  browser-like `User-Agent` by default (overridable via `options.userAgent`
  or `options.headers`).
- **`filter()` could throw on a malformed selector** (e.g. a typo'd
  attribute/class selector) and crash the caller. It now fails soft and
  returns `null`, consistent with every other getter.
- **No protocol allow-list.** `_isValidUrl()` accepted any URL that the
  `URL` constructor could parse, including non-HTTP schemes. Targets are
  now restricted to `http:`/`https:` by default (configurable via
  `options.allowedProtocols`), failing fast with a clear error instead of
  relying on the underlying HTTP client to reject it.

### Added

- `loadHTML(html)` — parse a raw HTML string synchronously, with no HTTP
  request. Useful for tests or HTML obtained some other way.
- `meta(name, attr)` — generic meta tag reader for any `name`/`property`.
- `lang()`, `robots()`, `favicon()` — new metadata getters. `favicon()`
  resolves to an absolute URL using the page URL as the base.
- `jsonLd()` — extracts and parses every `<script type="application/ld+json">`
  block on the page, skipping malformed ones.
- `text()` — whitespace-normalized visible body text.
- `html()` — the raw HTML of the last successful load.
- `viewport_object()` — viewport directives parsed into a key/value object.
- `toJSON()` — a ready-to-serialize snapshot of the most commonly used fields.
- `link_details()` / `image_details()` now include an `absolute_url` field
  resolved against the page URL, alongside the original (possibly relative)
  `url`.
- Constructor `options`: `timeout`, `userAgent`, `headers`, `maxRedirects`,
  `allowedProtocols`, `throwOnError`.
- `NodeScraper.scrape(url, options)` and `NodeScraper.scrapeAll(urls, options)`
  static convenience methods for one-line and concurrent scraping.
- TypeScript declarations (`types/index.d.ts`), referenced via the
  package's `types` field.
- Test suite (`node --test`) covering metadata extraction, link/image
  details, `filter()`, and `init()` against a local HTTP server (404,
  redirects, UA-blocking, timeouts, unsupported protocols).
- Runnable examples under `examples/`.

### Changed

- Project reorganized into `src/` (implementation), `test/`, `examples/`,
  and `types/`, with `index.js` at the root re-exporting `src/NodeScraper.js`
  for a stable import path. See the README's "Project Structure" section.
- `package.json` gained `engines`, `repository`, `homepage`, `bugs`,
  `files`, `exports`, and `types` fields.

### Compatibility

No breaking changes. All v1.0 method signatures and return *types* are
unchanged; only the contents of a few previously-incorrect return values
were fixed (see above). If your code relied on the untrimmed keyword/viewport
strings or on `rel: ['']`, double-check those spots.

## [1.0.0]

Initial release: metadata extraction (title, description, Open Graph,
Twitter Card, canonical, CSRF, etc.), heading/list/image/link extraction,
and the `filter()` custom DOM query helper.
