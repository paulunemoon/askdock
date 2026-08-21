import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";
import type { Corpus, CorpusDoc } from "@askdock/core";
import { extractTitle, htmlToText } from "./html.js";

/**
 * The other way in: a folder of Markdown or HTML you already have.
 *
 * Docs sites, changelogs, MDX content directories — no crawl, no server
 * running, and the ingest can go in CI next to the build that publishes them.
 */

export interface FilesOptions {
  dir: string;
  /** Extensions to read. */
  extensions?: string[];
  /** Prefixed to every doc's `url`, so citations point at the live site. */
  baseUrl?: string;
  minChars?: number;
  siteName?: string;
  siteDescription?: string;
}

const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "dist", "build", ".askdock"]);

async function walk(dir: string, extensions: string[]): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path, extensions)));
    else if (extensions.includes(extname(entry.name))) files.push(path);
  }

  return files;
}

/** `# Title` on the first line, or the frontmatter's `title:`. */
function markdownTitle(text: string): string | undefined {
  const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fromMatter = frontmatter?.[1]?.match(/^title:\s*["']?(.+?)["']?\s*$/m)?.[1];
  if (fromMatter) return fromMatter.trim();

  return text.match(/^#\s+(.+)$/m)?.[1]?.trim();
}

function stripFrontmatter(text: string): string {
  return text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

export async function fromFiles(options: FilesOptions): Promise<Corpus> {
  const extensions = options.extensions ?? [".md", ".mdx", ".html", ".txt"];
  const minChars = options.minChars ?? 120;
  const paths = await walk(options.dir, extensions);
  const docs: CorpusDoc[] = [];

  for (const path of paths) {
    const raw = await readFile(path, "utf8");
    const isHtml = extname(path) === ".html";
    const text = isHtml ? htmlToText(raw) : stripFrontmatter(raw).trim();
    if (text.length < minChars) continue;

    // "docs/guide/index.md" → "docs/guide"
    const id = relative(options.dir, path)
      .split(sep)
      .join("/")
      .replace(/\.(md|mdx|html|txt)$/, "")
      .replace(/\/index$/, "");

    docs.push({
      id: id || "home",
      title: (isHtml ? extractTitle(raw) : markdownTitle(raw)) ?? id,
      url: options.baseUrl ? new URL(id, options.baseUrl).href : `/${id}`,
      text,
    });
  }

  docs.sort((a, b) => a.id.localeCompare(b.id));

  return {
    site: {
      name: options.siteName ?? options.dir,
      url: options.baseUrl,
      description: options.siteDescription,
    },
    generatedAt: new Date().toISOString(),
    docs,
  };
}
