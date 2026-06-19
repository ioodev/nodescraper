'use strict';

const axios = require('axios');
const cheerio = require('cheerio');

const {
  DEFAULT_USER_AGENT,
  DEFAULT_TIMEOUT,
  DEFAULT_MAX_REDIRECTS,
  ALLOWED_PROTOCOLS,
  OPEN_GRAPH_PROPERTIES,
  TWITTER_CARD_PROPERTIES
} = require('./constants');

const {
  isValidUrl,
  splitList,
  splitRel,
  normalizeWhitespace,
  resolveUrl,
  escapeAttributeValue
} = require('./utils');

/**
 * @typedef {Object} NodeScraperOptions
 * @property {number} [timeout=10000] Request timeout in milliseconds.
 * @property {string} [userAgent] User-Agent header sent with the request.
 * @property {Object<string,string>} [headers] Extra headers merged into the request.
 * @property {number} [maxRedirects=5] Maximum number of redirects to follow.
 * @property {string[]} [allowedProtocols=['http:','https:']] Protocols accepted by the URL validator.
 * @property {boolean} [throwOnError=false] If true, `init()` rejects instead of swallowing errors.
 */

class NodeScraper {
  /**
   * @param {string} url The page URL to scrape.
   * @param {NodeScraperOptions} [options]
   */
  constructor(url, options = {}) {
    this.url = url;

    /** Parsed cheerio document, or `null` until `init()`/`loadHTML()` succeeds. */
    this.soup = null;
    /** Raw HTML of the last successful load. */
    this.rawHtml = null;
    /** HTTP status code of the last request, if any. */
    this.statusCode = null;
    /** Error from the last failed `init()` call, if any. */
    this.error = null;

    this.options = {
      timeout: options.timeout ?? DEFAULT_TIMEOUT,
      userAgent: options.userAgent ?? DEFAULT_USER_AGENT,
      headers: options.headers ?? {},
      maxRedirects: options.maxRedirects ?? DEFAULT_MAX_REDIRECTS,
      allowedProtocols: options.allowedProtocols ?? ALLOWED_PROTOCOLS,
      throwOnError: options.throwOnError ?? false
    };
  }

  // ---------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------

  /**
   * Fetch `this.url` and parse the response with cheerio.
   *
   * Unlike v1.0, failures are no longer silent: `this.error` and
   * `this.statusCode` are populated, and `getError()` exposes the reason
   * (invalid URL, network failure, non-2xx response, etc). Pass
   * `{ throwOnError: true }` to the constructor to have this method
   * reject instead.
   *
   * @returns {Promise<NodeScraper>} `this`, for chaining.
   */
  async init() {
    this.error = null;

    if (!this._isValidUrl(this.url)) {
      this.error = new Error(`Invalid or unsupported URL: ${this.url}`);
      this.soup = null;
      if (this.options.throwOnError) throw this.error;
      return this;
    }

    try {
      const response = await axios.get(this.url, {
        timeout: this.options.timeout,
        maxRedirects: this.options.maxRedirects,
        // Resolve regardless of status so we can report *why* a scrape
        // failed instead of throwing away the status code.
        validateStatus: () => true,
        headers: {
          'User-Agent': this.options.userAgent,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          ...this.options.headers
        }
      });

      this.statusCode = response.status;

      if (response.status < 200 || response.status >= 300) {
        this.error = new Error(`Request failed with status code ${response.status}`);
        this.soup = null;
        if (this.options.throwOnError) throw this.error;
        return this;
      }

      this.rawHtml = typeof response.data === 'string' ? response.data : String(response.data);
      this.soup = cheerio.load(this.rawHtml);
    } catch (err) {
      this.error = err;
      this.soup = null;
      if (this.options.throwOnError) throw err;
    }

    return this;
  }

  /**
   * Parse a raw HTML string directly, without making an HTTP request.
   * Handy for tests or when the HTML was obtained some other way.
   *
   * @param {string} html
   * @returns {NodeScraper} `this`, for chaining.
   */
  loadHTML(html) {
    if (typeof html !== 'string') {
      throw new TypeError('loadHTML() expects an HTML string');
    }
    this.rawHtml = html;
    this.soup = cheerio.load(html);
    this.error = null;
    this.statusCode = null;
    return this;
  }

  /** @returns {boolean} Whether a document is currently loaded. */
  isLoaded() {
    return this.soup !== null;
  }

  /** @returns {Error|null} The error from the last failed load, if any. */
  getError() {
    return this.error;
  }

  /** @returns {number|null} The HTTP status code of the last request, if any. */
  getStatusCode() {
    return this.statusCode;
  }

  /**
   * @param {string} url
   * @returns {boolean}
   */
  _isValidUrl(url) {
    return isValidUrl(url, this.options.allowedProtocols);
  }

  // ---------------------------------------------------------------------
  // Page metadata
  // ---------------------------------------------------------------------

  title() {
    return this.soup ? this.soup('title').text() || null : null;
  }

  charset() {
    if (!this.soup) return null;
    const direct = this.soup('meta[charset]').attr('charset');
    if (direct) return direct;
    // Fallback: some pages only declare charset via the legacy http-equiv form.
    const contentType = this.content_type();
    const match = contentType && contentType.match(/charset=([^;]+)/i);
    return match ? match[1].trim() : null;
  }

  /** @returns {string[]|null} Trimmed viewport directives, e.g. `["width=device-width", "initial-scale=1"]`. */
  viewport() {
    return splitList(this.viewport_string());
  }

  viewport_string() {
    return this.soup ? this.soup('meta[name="viewport"]').attr('content') || null : null;
  }

  /** @returns {Object<string,string>|null} Viewport directives parsed into key/value pairs. */
  viewport_object() {
    const items = this.viewport();
    if (!items) return null;
    const result = {};
    for (const item of items) {
      const [key, value] = item.split('=').map((part) => part && part.trim());
      if (key) result[key] = value ?? '';
    }
    return result;
  }

  canonical() {
    return this.soup ? this.soup('link[rel="canonical"]').attr('href') || null : null;
  }

  content_type() {
    return this.soup ? this.soup('meta[http-equiv="Content-Type"]').attr('content') || null : null;
  }

  csrf_token() {
    if (!this.soup) return null;
    let tag = this.soup('meta[name="csrf-token"]');
    if (tag.length === 0) tag = this.soup('input[name="csrf-token"]');
    return tag.attr('content') || tag.attr('value') || null;
  }

  author() {
    return this.soup ? this.soup('meta[name="author"]').attr('content') || null : null;
  }

  description() {
    return this.soup ? this.soup('meta[name="description"]').attr('content') || null : null;
  }

  image() {
    return this.soup ? this.soup('meta[property="og:image"]').attr('content') || null : null;
  }

  /** @returns {string|null} The page's `<html lang="...">` attribute. */
  lang() {
    return this.soup ? this.soup('html').attr('lang') || null : null;
  }

  /** @returns {string|null} The `robots` meta directive, e.g. `"index, follow"`. */
  robots() {
    return this.meta('robots');
  }

  /** @returns {string|null} Absolute URL of the page favicon, if declared. */
  favicon() {
    if (!this.soup) return null;
    const href = this.soup('link[rel="icon"], link[rel="shortcut icon"]').attr('href') || null;
    if (!href) return null;
    return resolveUrl(href, this.url) ?? href;
  }

  /** @returns {string[]|null} Trimmed keyword list from the `keywords` meta tag. */
  keywords() {
    return splitList(this.keyword_string());
  }

  keyword_string() {
    return this.soup ? this.soup('meta[name="keywords"]').attr('content') || null : null;
  }

  /**
   * Generic meta tag reader.
   *
   * @param {string} name The `name`/`property` value to look up.
   * @param {'name'|'property'} [attr='name'] Which attribute to match on.
   * @returns {string|null}
   */
  meta(name, attr = 'name') {
    if (!this.soup || !name) return null;
    const safe = escapeAttributeValue(name);
    return this.soup(`meta[${attr}="${safe}"]`).attr('content') || null;
  }

  // ---------------------------------------------------------------------
  // Open Graph / Twitter Card
  // ---------------------------------------------------------------------

  open_graph(prop = null) {
    if (!this.soup) return null;
    if (prop) return this.meta(prop, 'property');

    const result = {};
    for (const p of OPEN_GRAPH_PROPERTIES) {
      result[p] = this.meta(p, 'property');
    }
    return result;
  }

  twitter_card(prop = null) {
    if (!this.soup) return null;
    if (prop) return this.meta(prop, 'name');

    const result = {};
    for (const p of TWITTER_CARD_PROPERTIES) {
      result[p] = this.meta(p, 'name');
    }
    return result;
  }

  /** @returns {Object[]|null} Parsed `application/ld+json` blocks found on the page. */
  jsonLd() {
    if (!this.soup) return null;
    const results = [];
    this.soup('script[type="application/ld+json"]').each((_, el) => {
      const raw = this.soup(el).contents().text();
      try {
        results.push(JSON.parse(raw));
      } catch {
        // Skip malformed JSON-LD blocks rather than failing the whole scrape.
      }
    });
    return results;
  }

  // ---------------------------------------------------------------------
  // Headings & text
  // ---------------------------------------------------------------------

  _tagList(tagName) {
    if (!this.soup) return null;
    return this.soup(tagName)
      .map((_, el) => this.soup(el).text().trim())
      .get();
  }

  h1() { return this._tagList('h1'); }
  h2() { return this._tagList('h2'); }
  h3() { return this._tagList('h3'); }
  h4() { return this._tagList('h4'); }
  h5() { return this._tagList('h5'); }
  h6() { return this._tagList('h6'); }
  p()  { return this._tagList('p'); }

  /** @returns {string|null} Normalized, whitespace-collapsed visible body text. */
  text() {
    if (!this.soup) return null;
    return normalizeWhitespace(this.soup('body').text());
  }

  /** @returns {string|null} The raw HTML of the last successful load. */
  html() {
    return this.rawHtml;
  }

  // ---------------------------------------------------------------------
  // Lists
  // ---------------------------------------------------------------------

  ul() {
    if (!this.soup) return null;
    const result = [];
    this.soup('ul').each((_, ul) => {
      this.soup(ul).find('li').each((_, li) => {
        result.push(this.soup(li).text().trim());
      });
    });
    return result;
  }

  ol() {
    if (!this.soup) return null;
    const result = [];
    this.soup('ol').each((_, ol) => {
      this.soup(ol).find('li').each((_, li) => {
        result.push(this.soup(li).text().trim());
      });
    });
    return result;
  }

  // ---------------------------------------------------------------------
  // Images
  // ---------------------------------------------------------------------

  images() {
    if (!this.soup) return null;
    return this.soup('img').map((_, el) => this.soup(el).attr('src')).get();
  }

  image_details() {
    if (!this.soup) return null;
    return this.soup('img').map((_, el) => {
      const src = this.soup(el).attr('src');
      return {
        url: src,
        absolute_url: resolveUrl(src, this.url),
        alt_text: this.soup(el).attr('alt') || null,
        title: this.soup(el).attr('title') || null
      };
    }).get();
  }

  // ---------------------------------------------------------------------
  // Links
  // ---------------------------------------------------------------------

  links() {
    if (!this.soup) return null;
    return this.soup('a').map((_, el) => this.soup(el).attr('href')).get().filter(Boolean);
  }

  link_details() {
    if (!this.soup) return null;
    const result = [];
    this.soup('a').each((_, el) => {
      const $el = this.soup(el);
      const href = $el.attr('href') || '';
      const rel = splitRel($el.attr('rel'));
      result.push({
        url: href,
        absolute_url: resolveUrl(href, this.url),
        protocol: href.includes(':') ? href.split(':')[0] : '',
        text: $el.text().trim(),
        title: $el.attr('title') || '',
        target: $el.attr('target') || '',
        rel,
        is_nofollow: rel.includes('nofollow'),
        is_ugc: rel.includes('ugc'),
        is_noopener: rel.includes('noopener'),
        is_noreferrer: rel.includes('noreferrer')
      });
    });
    return result;
  }

  // ---------------------------------------------------------------------
  // Custom filtering
  // ---------------------------------------------------------------------

  /**
   * @param {Object} params
   * @param {string} params.element Tag name to match, e.g. `"div"`.
   * @param {Object<string,string>} [params.attributes] Exact attribute values to match.
   * @param {boolean} [params.multiple=false] Return all matches instead of just the first.
   * @param {string[]} [params.extract=[]] Tag/class/id selectors to extract from each match.
   * @param {boolean} [params.returnHtml=true] Return inner HTML instead of trimmed text.
   * @returns {*} Depends on `multiple`/`extract`; `null` on no match or invalid input.
   */
  filter({ element, attributes = {}, multiple = false, extract = [], returnHtml = true } = {}) {
    if (!this.soup || typeof element !== 'string' || typeof attributes !== 'object') return null;

    try {
      const match = this.soup(element).filter((_, el) => {
        return Object.entries(attributes).every(([key, value]) => this.soup(el).attr(key) === value);
      });

      const extractContentFromTag = (el, selectors) => {
        const result = {};
        for (const sel of selectors) {
          let found;
          let key;
          if (sel.startsWith('.')) {
            key = `class__${sel.slice(1)}`;
            found = this.soup(el).find(`.${sel.slice(1)}`);
          } else if (sel.startsWith('#')) {
            key = `id__${sel.slice(1)}`;
            found = this.soup(el).find(`#${sel.slice(1)}`);
          } else {
            key = sel;
            found = this.soup(el).find(sel);
          }
          result[key] = found.text().trim() || null;
        }
        return result;
      };

      if (multiple) {
        return match.map((_, el) => {
          if (Array.isArray(extract) && extract.length > 0) {
            return extractContentFromTag(el, extract);
          }
          return returnHtml ? this.soup.html(el) : this.soup(el).text().trim();
        }).get();
      }

      const el = match.get(0);
      if (!el) return null;
      if (Array.isArray(extract) && extract.length > 0) {
        return extractContentFromTag(el, extract);
      }
      return returnHtml ? this.soup.html(el) : this.soup(el).text().trim();
    } catch {
      // Malformed selector or unexpected DOM shape: fail soft instead of throwing.
      return null;
    }
  }

  // ---------------------------------------------------------------------
  // Convenience
  // ---------------------------------------------------------------------

  /** @returns {Object|null} A snapshot of the most commonly used fields. */
  toJSON() {
    if (!this.soup) return null;
    return {
      url: this.url,
      statusCode: this.statusCode,
      title: this.title(),
      description: this.description(),
      canonical: this.canonical(),
      lang: this.lang(),
      charset: this.charset(),
      robots: this.robots(),
      keywords: this.keywords(),
      author: this.author(),
      image: this.image(),
      favicon: this.favicon(),
      openGraph: this.open_graph(),
      twitterCard: this.twitter_card(),
      headings: { h1: this.h1(), h2: this.h2(), h3: this.h3() },
      linkCount: (this.links() || []).length,
      imageCount: (this.images() || []).length
    };
  }

  /**
   * Create and load a NodeScraper in one call.
   *
   * @param {string} url
   * @param {NodeScraperOptions} [options]
   * @returns {Promise<NodeScraper>}
   */
  static async scrape(url, options) {
    const instance = new NodeScraper(url, options);
    await instance.init();
    return instance;
  }

  /**
   * Scrape multiple URLs concurrently.
   *
   * @param {string[]} urls
   * @param {NodeScraperOptions} [options]
   * @returns {Promise<NodeScraper[]>}
   */
  static async scrapeAll(urls, options) {
    return Promise.all(urls.map((url) => NodeScraper.scrape(url, options)));
  }
}

module.exports = NodeScraper;
