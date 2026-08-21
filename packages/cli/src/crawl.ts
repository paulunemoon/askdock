import type { Corpus, CorpusDoc } from "@askdock/core";
import { extractDescription, extractTitle, htmlToText, isNoIndex } from "./html.js";

/**
 * Read a site the way a search engine would, and write down what it says.
 *
 * Sitemap first, because a sitemap is the site telling you which pages it
 * considers real. When there isn't one, follow same-origin links from the
 * root instead. Either way the result is a plain JSON file you can read,
 * diff and commit — the assistant's knowledge should never be a black box.
 */

export interface CrawlOptions {
  url: string;
  maxPages?: number;
  /** Only paths matching one of these substrings or regexes. */
  include?: string[];
  exclude?: string[];
  /** Wrapper to read the text from. Defaults to `<main>`, then the whole page. */
  selector?: string;
  concurrency?: number;
  /** Skip pages with less text than this. Filters out redirects and shells. */
  minChars?: number;
  userAgent?: string;
  onProgress?: (event: { url: string; status: "ok" | "skipped" | "failed"; note?: string }) => void;
}

const DEFAULTS = {
  maxPages: 200,
  concurrency: 5,
  minChars: 200,
  userAgent: "askdock-ingest/0.1 (+https://github.com/paulunemoon/askdock)",
};

function matches(path: string, patterns?: string[]): boolean {
  if (!patterns || patterns.length === 0) return true;
  return patterns.some((p) =>
    p.startsWith("/") && p.endsWith("/") ? new RegExp(p.slice(1, -1)).test(path) : path.includes(p)
  );
}

/** Strip the query and the hash: `/docs?ref=x#top` and `/docs` are one page. */
function normalize(href: string, origin: string): string | null {
  try {
    const url = new URL(href, origin);
    if (url.origin !== new URL(origin).origin) return null;
    if (!/^https?:$/.test(url.protocol)) return null;
    url.hash = "";
    url.search = "";
    return url.href.replace(/\/$/, "") || url.origin;
  } catch {
    return null;
  }
}

async function fetchText(url: string, userAgent: string): Promise<string | null> {
  const res = await fetch(url, { headers: { "User-Agent": userAgent, Accept: "text/html,*/*" } });
  if (!res.ok) return null;
  if (!res.headers.get("content-type")?.includes("html")) return null;
  return res.text();
}

/** Follows sitemap index files one level down, which is how most sites split theirs. */
async function readSitemap(origin: string, userAgent: string): Promise<string[]> {
  const seen = new Set<string>();

  async function read(url: string, depth: number): Promise<void> {
    if (depth > 2) return;
    const res = await fetch(url, { headers: { "User-Agent": userAgent } }).catch(() => null);
    if (!res?.ok) return;

    const xml = await res.text();
    const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]!);
    const isIndex = /<sitemapindex/i.test(xml);

    for (const loc of locs) {
      if (isIndex) await read(loc, depth + 1);
      else {
        const normalized = normalize(loc, origin);
        if (normalized) seen.add(normalized);
      }
    }
  }

  await read(new URL("/sitemap.xml", origin).href, 0);
  return [...seen];
}

/** Same-origin `href`s, in document order. */
function linksIn(html: string, origin: string): string[] {
  const found = new Set<string>();
  for (const match of html.matchAll(/<a\b[^>]+href=["']([^"']+)["']/gi)) {
    const normalized = normalize(match[1]!, origin);
    if (normalized) found.add(normalized);
  }
  return [...found];
}

export async function crawl(options: CrawlOptions): Promise<Corpus> {
  const settings = { ...DEFAULTS, ...options };
  const origin = new URL(settings.url).origin;
  const report = settings.onProgress ?? (() => {});

  const queue: string[] = [];
  const queued = new Set<string>();
  const push = (url: string) => {
    if (queued.has(url)) return;
    queued.add(url);
    queue.push(url);
  };

  const sitemap = await readSitemap(origin, settings.userAgent);
  for (const url of sitemap) push(url);

  const root = normalize(settings.url, origin);
  if (root) push(root);

  // No sitemap means we discover as we go, so the queue grows while we drain it.
  const discovering = sitemap.length === 0;
  const docs: CorpusDoc[] = [];
  let siteName: string | undefined;
  let siteDescription: string | undefined;

  async function visit(url: string): Promise<void> {
    const path = new URL(url).pathname || "/";
    if (!matches(path, options.include) || matches(path, options.exclude)) {
      report({ url, status: "skipped", note: "filtered out" });
      return;
    }

    const html = await fetchText(url, settings.userAgent).catch(() => null);
    if (!html) {
      report({ url, status: "failed", note: "not reachable, or not HTML" });
      return;
    }

    if (discovering) for (const link of linksIn(html, origin)) push(link);

    if (isNoIndex(html)) {
      report({ url, status: "skipped", note: "noindex" });
      return;
    }

    const text = htmlToText(html, { selector: options.selector });
    if (text.length < settings.minChars) {
      report({ url, status: "skipped", note: `only ${text.length} chars` });
      return;
    }

    // The home page names the site; the rest inherit it.
    if (path === "/" || path === "") {
      siteName ??= extractTitle(html);
      siteDescription ??= extractDescription(html);
    }

    docs.push({
      id: path === "/" ? "home" : path.replace(/^\//, ""),
      title: extractTitle(html) ?? path,
      url,
      text,
    });
    report({ url, status: "ok" });
  }

  // A small pool: polite to the site, and fast enough for a few hundred pages.
  const workers = Array.from({ length: settings.concurrency }, async () => {
    for (;;) {
      if (docs.length >= settings.maxPages) return;
      const next = queue.shift();
      if (next === undefined) return;
      await visit(next);
    }
  });
  await Promise.all(workers);

  // Discovery mode finds links only after visiting, so drain what it queued.
  while (discovering && queue.length > 0 && docs.length < settings.maxPages) {
    const batch = queue.splice(0, settings.concurrency);
    await Promise.all(batch.map(visit));
  }

  docs.sort((a, b) => a.id.localeCompare(b.id));

  return {
    site: {
      name: siteName ?? new URL(settings.url).hostname,
      url: origin,
      description: siteDescription,
    },
    generatedAt: new Date().toISOString(),
    docs: docs.slice(0, settings.maxPages),
  };
}
