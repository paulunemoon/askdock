import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { estimateTokens, renderCorpus, type Corpus } from "@askdock/core";
import { crawl } from "./crawl.js";
import { fromFiles } from "./files.js";

/**
 * `askdock ingest` — the only command you have to run.
 *
 * It writes a JSON file you can open, read and commit. That is deliberate:
 * the assistant's entire knowledge is one reviewable artefact, so "why did it
 * say that?" is always answerable, and "it must never mention X" becomes a
 * diff rather than a prompt-engineering session.
 */

const HELP = `askdock — a chat widget that only answers from your own site.

Usage
  askdock ingest <url|directory> [options]

Options
  -o, --out <path>        Where to write the corpus  (default .askdock/corpus.json)
  -m, --max-pages <n>     Stop after n pages         (default 200)
      --include <pat>     Only paths matching this. Repeatable. /regex/ works.
      --exclude <pat>     Skip paths matching this. Repeatable.
      --selector <tag>    Wrapper to read text from  (default <main>, then the page)
      --base-url <url>    Directory mode: prefix for citation links
      --name <name>       Override the site name the assistant is told
      --concurrency <n>   Parallel requests          (default 5)
      --quiet             Only print the summary
  -h, --help              This
  -v, --version           Print the version

Examples
  askdock ingest https://acme.com
  askdock ingest https://acme.com --exclude /blog/tag --max-pages 80
  askdock ingest ./content --base-url https://acme.com/docs/

Nothing here reads or writes an API key. The key lives in your server's
environment, next to the route from @askdock/server.
`;

interface Flags {
  out: string;
  maxPages: number;
  include: string[];
  exclude: string[];
  selector?: string;
  baseUrl?: string;
  name?: string;
  concurrency: number;
  quiet: boolean;
}

function parseFlags(argv: string[]): { target?: string; flags: Flags } {
  const flags: Flags = {
    out: ".askdock/corpus.json",
    maxPages: 200,
    include: [],
    exclude: [],
    concurrency: 5,
    quiet: false,
  };
  let target: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    const next = () => argv[++i];

    switch (arg) {
      case "-o":
      case "--out":
        flags.out = next() ?? flags.out;
        break;
      case "-m":
      case "--max-pages":
        flags.maxPages = Number(next()) || flags.maxPages;
        break;
      case "--include": {
        const value = next();
        if (value) flags.include.push(value);
        break;
      }
      case "--exclude": {
        const value = next();
        if (value) flags.exclude.push(value);
        break;
      }
      case "--selector":
        flags.selector = next();
        break;
      case "--base-url":
        flags.baseUrl = next();
        break;
      case "--name":
        flags.name = next();
        break;
      case "--concurrency":
        flags.concurrency = Number(next()) || flags.concurrency;
        break;
      case "--quiet":
        flags.quiet = true;
        break;
      default:
        if (!arg.startsWith("-")) target ??= arg;
    }
  }

  return { target, flags };
}

// No colour library: two escape codes, and neither of them is load-bearing.
const dim = (text: string) => `\x1b[2m${text}\x1b[0m`;
const bold = (text: string) => `\x1b[1m${text}\x1b[0m`;

async function ingest(target: string, flags: Flags): Promise<void> {
  const isUrl = /^https?:\/\//.test(target);
  const log = flags.quiet ? () => {} : (line: string) => console.log(line);

  log(`\n${bold("askdock ingest")} ${target}\n`);

  const corpus: Corpus = isUrl
    ? await crawl({
        url: target,
        maxPages: flags.maxPages,
        include: flags.include,
        exclude: flags.exclude,
        selector: flags.selector,
        concurrency: flags.concurrency,
        onProgress: ({ url, status, note }) => {
          const path = new URL(url).pathname || "/";
          if (status === "ok") log(`  ${dim("·")} ${path}`);
          else log(dim(`  ${status === "failed" ? "×" : "–"} ${path}${note ? ` (${note})` : ""}`));
        },
      })
    : await fromFiles({
        dir: resolve(target),
        baseUrl: flags.baseUrl,
        siteName: flags.name,
      });

  if (flags.name) corpus.site.name = flags.name;

  if (corpus.docs.length === 0) {
    console.error(
      `\nNothing to ingest. ${
        isUrl
          ? "No sitemap.xml, and no links found from that URL — try --selector, or point it at a page with navigation."
          : "No .md, .mdx, .html or .txt files under that directory."
      }\n`
    );
    process.exitCode = 1;
    return;
  }

  const out = resolve(flags.out);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, JSON.stringify(corpus, null, 2) + "\n", "utf8");

  const tokens = estimateTokens(renderCorpus(corpus.docs));

  log(
    [
      "",
      `  ${bold(String(corpus.docs.length))} pages · ~${bold(
        `${(tokens / 1000).toFixed(1)}k`
      )} tokens · ${corpus.site.name}`,
      `  ${dim(`→ ${flags.out}`)}`,
      "",
      tokens > 60_000
        ? dim(
            "  Past the default prompt budget, so the widget will send the pages\n" +
              "  closest to each question rather than the whole site. Raise it with\n" +
              "  corpusBudgetTokens, or narrow the crawl with --include.\n"
          )
        : dim("  The whole site fits in one prompt — every answer sees all of it.\n"),
    ].join("\n")
  );
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  if (argv.length === 0 || argv.includes("-h") || argv.includes("--help")) {
    console.log(HELP);
    return;
  }
  if (argv.includes("-v") || argv.includes("--version")) {
    const pkg = await import("../package.json", { with: { type: "json" } });
    console.log((pkg.default as { version: string }).version);
    return;
  }

  const [command, ...rest] = argv;
  if (command !== "ingest") {
    console.error(`Unknown command "${command}". Try: askdock ingest <url>\n`);
    process.exitCode = 1;
    return;
  }

  const { target, flags } = parseFlags(rest);
  if (!target) {
    console.error("askdock ingest needs a URL or a directory.\n");
    process.exitCode = 1;
    return;
  }

  await ingest(target, flags);
}

main().catch((err: unknown) => {
  console.error(`\n${(err as Error).message}\n`);
  process.exitCode = 1;
});
