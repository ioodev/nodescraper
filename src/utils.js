'use strict';

const { URL } = require('url');
const { ALLOWED_PROTOCOLS } = require('./constants');

/**
 * Check whether `url` is a syntactically valid URL whose protocol is in
 * `allowedProtocols`. Restricting the protocol (http/https by default)
 * fails fast with a clear error instead of silently attempting and
 * swallowing a request to an unsupported scheme (e.g. `file:`).
 *
 * @param {string} url
 * @param {string[]} [allowedProtocols]
 * @returns {boolean}
 */
function isValidUrl(url, allowedProtocols = ALLOWED_PROTOCOLS) {
  if (typeof url !== 'string' || url.trim() === '') return false;
  try {
    const parsed = new URL(url);
    return allowedProtocols.includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Split a comma-separated meta tag value (e.g. `keywords`, `viewport`)
 * into a clean array, trimming whitespace and dropping empty entries.
 *
 * @param {string|null|undefined} value
 * @returns {string[]|null}
 */
function splitList(value) {
  if (!value || typeof value !== 'string') return null;
  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return items.length > 0 ? items : null;
}

/**
 * Split a `rel` attribute into its individual tokens, dropping empty
 * entries so elements without a `rel` attribute yield `[]` instead of `['']`.
 *
 * @param {string|null|undefined} value
 * @returns {string[]}
 */
function splitRel(value) {
  if (!value || typeof value !== 'string') return [];
  return value
    .split(/\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/**
 * Collapse runs of whitespace into a single space and trim the ends.
 * Useful for turning raw `.text()` output into readable strings.
 *
 * @param {string|null|undefined} text
 * @returns {string|null}
 */
function normalizeWhitespace(text) {
  if (typeof text !== 'string') return null;
  const cleaned = text.replace(/\s+/g, ' ').trim();
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * Resolve a possibly-relative URL against a base URL.
 * Returns `null` if either input is missing or invalid, instead of throwing.
 *
 * @param {string|null|undefined} value
 * @param {string|null|undefined} base
 * @returns {string|null}
 */
function resolveUrl(value, base) {
  if (!value || typeof value !== 'string') return null;
  try {
    return new URL(value, base).toString();
  } catch {
    return null;
  }
}

/**
 * Escape double quotes so a value can be safely interpolated into a
 * cheerio/CSS attribute selector, e.g. `meta[name="${escaped}"]`.
 *
 * @param {string} value
 * @returns {string}
 */
function escapeAttributeValue(value) {
  return String(value).replace(/"/g, '\\"');
}

module.exports = {
  isValidUrl,
  splitList,
  splitRel,
  normalizeWhitespace,
  resolveUrl,
  escapeAttributeValue
};
