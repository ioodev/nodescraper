// Type definitions for @ioodev/nodescraper 1.1.0

export interface NodeScraperOptions {
  /** Request timeout in milliseconds. Default: 10000. */
  timeout?: number;
  /** User-Agent header sent with the request. Defaults to a realistic browser-like UA. */
  userAgent?: string;
  /** Extra headers merged into the request. */
  headers?: Record<string, string>;
  /** Maximum number of redirects to follow. Default: 5. */
  maxRedirects?: number;
  /** Protocols accepted by the URL validator. Default: ['http:', 'https:']. */
  allowedProtocols?: string[];
  /** If true, init() rejects instead of swallowing errors. Default: false. */
  throwOnError?: boolean;
}

export interface OpenGraphData {
  'og:site_name': string | null;
  'og:type': string | null;
  'og:title': string | null;
  'og:description': string | null;
  'og:url': string | null;
  'og:image': string | null;
  [key: string]: string | null;
}

export interface TwitterCardData {
  'twitter:card': string | null;
  'twitter:title': string | null;
  'twitter:description': string | null;
  'twitter:url': string | null;
  'twitter:image': string | null;
  [key: string]: string | null;
}

export interface ImageDetails {
  url: string | null;
  absolute_url: string | null;
  alt_text: string | null;
  title: string | null;
}

export interface LinkDetails {
  url: string;
  absolute_url: string | null;
  protocol: string;
  text: string;
  title: string;
  target: string;
  rel: string[];
  is_nofollow: boolean;
  is_ugc: boolean;
  is_noopener: boolean;
  is_noreferrer: boolean;
}

export interface FilterParams {
  /** Tag name to match, e.g. "div". */
  element: string;
  /** Exact attribute values to match. */
  attributes?: Record<string, string>;
  /** Return all matches instead of just the first. Default: false. */
  multiple?: boolean;
  /** Tag/class/id selectors to extract from each match. */
  extract?: string[];
  /** Return inner HTML instead of trimmed text. Default: true. */
  returnHtml?: boolean;
}

export interface ScraperSnapshot {
  url: string;
  statusCode: number | null;
  title: string | null;
  description: string | null;
  canonical: string | null;
  lang: string | null;
  charset: string | null;
  robots: string | null;
  keywords: string[] | null;
  author: string | null;
  image: string | null;
  favicon: string | null;
  openGraph: OpenGraphData | null;
  twitterCard: TwitterCardData | null;
  headings: { h1: string[]; h2: string[]; h3: string[] };
  linkCount: number;
  imageCount: number;
}

export default class NodeScraper {
  url: string;
  rawHtml: string | null;
  statusCode: number | null;
  error: Error | null;

  constructor(url: string, options?: NodeScraperOptions);

  init(): Promise<this>;
  loadHTML(html: string): this;
  isLoaded(): boolean;
  getError(): Error | null;
  getStatusCode(): number | null;

  title(): string | null;
  charset(): string | null;
  viewport(): string[] | null;
  viewport_string(): string | null;
  viewport_object(): Record<string, string> | null;
  canonical(): string | null;
  content_type(): string | null;
  csrf_token(): string | null;
  author(): string | null;
  description(): string | null;
  image(): string | null;
  lang(): string | null;
  robots(): string | null;
  favicon(): string | null;
  keywords(): string[] | null;
  keyword_string(): string | null;
  meta(name: string, attr?: 'name' | 'property'): string | null;

  open_graph(prop?: string | null): OpenGraphData | string | null;
  twitter_card(prop?: string | null): TwitterCardData | string | null;
  jsonLd(): Record<string, unknown>[] | null;

  h1(): string[] | null;
  h2(): string[] | null;
  h3(): string[] | null;
  h4(): string[] | null;
  h5(): string[] | null;
  h6(): string[] | null;
  p(): string[] | null;
  text(): string | null;
  html(): string | null;

  ul(): string[] | null;
  ol(): string[] | null;

  images(): (string | undefined)[] | null;
  image_details(): ImageDetails[] | null;

  links(): string[] | null;
  link_details(): LinkDetails[] | null;

  filter(params: FilterParams): unknown;

  toJSON(): ScraperSnapshot | null;

  static scrape(url: string, options?: NodeScraperOptions): Promise<NodeScraper>;
  static scrapeAll(urls: string[], options?: NodeScraperOptions): Promise<NodeScraper[]>;
}
