/**
 * HTML in, readable text out.
 *
 * Not a parser — a scrubber. Everything a crawler feeds it comes from a real
 * browser-rendered page, and all we need is the prose the model will read.
 * That keeps the CLI dependency-free, which matters more here than in most
 * places: this is the one piece a user has to run against their own site.
 */

/** Wrappers whose contents are chrome, not content. */
const CHROME = ["script", "style", "noscript", "svg", "template", "iframe", "nav", "footer", "header", "form"];

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  mdash: "—", ndash: "–", hellip: "…", rsquo: "’", lsquo: "‘",
  ldquo: "“", rdquo: "”", eacute: "é", egrave: "è", agrave: "à", ccedil: "ç",
};

function decode(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, code: string) => {
    if (code.startsWith("#x") || code.startsWith("#X")) {
      return String.fromCodePoint(parseInt(code.slice(2), 16));
    }
    if (code.startsWith("#")) return String.fromCodePoint(parseInt(code.slice(1), 10));
    return ENTITIES[code.toLowerCase()] ?? whole;
  });
}

function strip(html: string, tag: string): string {
  // Non-greedy, case-insensitive, across newlines.
  return html.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi"), " ");
}

export function extractTitle(html: string): string | undefined {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (og?.[1]) return decode(og[1]).trim();

  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1?.[1]) return decode(h1[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  // "Page — Site" is the near-universal convention; the site half is noise.
  if (title?.[1]) return decode(title[1]).split(/\s+[|—–·]\s+/)[0]?.trim();

  return undefined;
}

export function extractDescription(html: string): string | undefined {
  const meta = html.match(
    /<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']*)["']/i
  );
  return meta?.[1] ? decode(meta[1]).trim() : undefined;
}

/** `true` when the page asks not to be indexed — we honour that. */
export function isNoIndex(html: string): boolean {
  return /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html);
}

export function htmlToText(html: string, options: { selector?: string } = {}): string {
  let working = html;

  // Narrow to <main> (or a chosen wrapper) before scrubbing, when there is one.
  if (options.selector) {
    const tag = options.selector.replace(/^[.#]/, "");
    const byId = new RegExp(`<[a-z]+[^>]+id=["']${tag}["'][^>]*>([\\s\\S]*)`, "i");
    const byTag = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
    working = working.match(byTag)?.[1] ?? working.match(byId)?.[1] ?? working;
  } else {
    working = working.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? working;
  }

  for (const tag of CHROME) working = strip(working, tag);

  return decode(
    working
      // Headings and list items keep their shape — the model reads structure.
      .replace(/<h([1-6])\b[^>]*>/gi, (_, level: string) => `\n\n${"#".repeat(Number(level))} `)
      .replace(/<\/h[1-6]>/gi, "\n")
      .replace(/<li\b[^>]*>/gi, "\n- ")
      .replace(/<(p|div|section|article|tr|br)\b[^>]*>/gi, "\n")
      .replace(/<\/(p|div|section|article|li|ul|ol|table)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
