'use strict';

/**
 * Default browser-like User-Agent.
 * Many sites return 403/empty bodies for the default axios UA, so
 * NodeScraper sends a realistic one unless the caller overrides it.
 */
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (compatible; NodeScraper/1.1; +https://github.com/ioodev/nodescraper)';

/** Default request timeout, in milliseconds. */
const DEFAULT_TIMEOUT = 10000;

/** Default maximum number of redirects axios will follow. */
const DEFAULT_MAX_REDIRECTS = 5;

/** Protocols allowed by default when validating a target URL. */
const ALLOWED_PROTOCOLS = ['http:', 'https:'];

/** Open Graph properties read by `open_graph()` when called with no argument. */
const OPEN_GRAPH_PROPERTIES = [
  'og:site_name',
  'og:type',
  'og:title',
  'og:description',
  'og:url',
  'og:image'
];

/** Twitter Card properties read by `twitter_card()` when called with no argument. */
const TWITTER_CARD_PROPERTIES = [
  'twitter:card',
  'twitter:title',
  'twitter:description',
  'twitter:url',
  'twitter:image'
];

module.exports = {
  DEFAULT_USER_AGENT,
  DEFAULT_TIMEOUT,
  DEFAULT_MAX_REDIRECTS,
  ALLOWED_PROTOCOLS,
  OPEN_GRAPH_PROPERTIES,
  TWITTER_CARD_PROPERTIES
};
