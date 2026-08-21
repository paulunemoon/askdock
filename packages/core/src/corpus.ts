/**
 * The knowledge base: everything the assistant is allowed to know.
 *
 * There are no tools and no web access, so this *is* the assistant's world.
 * Anything not in here it has to decline — which is the whole point of the
 * thing: a widget that can only speak about what the site actually publishes.
 */

/** One page the assistant may quote and cite back to the reader. */
export interface CorpusDoc {
  /** Stable id the model writes in its SOURCES line. Usually the path. */
  id: string;
  title: string;
  /** Where the reader is sent when they click the citation. */
  url: string;
  /** Small grey label on the citation chip — "Case study", "Docs", "FAQ"… */
  kind?: string;
  /** The page as plain text. Markdown is fine; HTML is not. */
  text: string;
  /** Free-form facts the model should treat as verbatim (price, version…). */
  meta?: Record<string, string | number | undefined>;
}

export interface Corpus {
  site: {
    name: string;
    url?: string;
    /** One line telling the model what this site *is*. Steers refusals. */
    description?: string;
  };
  /** ISO date, written by `askdock ingest`. Surfaced in the CLI only. */
  generatedAt?: string;
  docs: CorpusDoc[];
}

/** A citation as it travels to the browser. Never carries the page text. */
export interface Citation {
  id: string;
  title: string;
  url: string;
  kind?: string;
}

export function citationOf(doc: CorpusDoc): Citation {
  return { id: doc.id, title: doc.title, url: doc.url, kind: doc.kind };
}

/**
 * Rough token count — 1 token ≈ 4 characters across the models we support.
 * Good enough to decide "does the whole site fit in the prompt or not", which
 * is the only question we ask it.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** One entry as the model reads it. The `id:` line is what SOURCES refers to. */
export function renderDoc(doc: CorpusDoc): string {
  const meta = Object.entries(doc.meta ?? {})
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}: ${v}`);

  return [
    `### ${doc.title}`,
    `id: ${doc.id}`,
    doc.kind ? `kind: ${doc.kind}` : "",
    ...meta,
    "",
    doc.text.trim(),
  ]
    .filter(Boolean)
    .join("\n");
}

export function renderCorpus(docs: CorpusDoc[]): string {
  return docs.map(renderDoc).join("\n\n---\n\n");
}

/** Validate a parsed corpus.json before it reaches the model. */
export function assertCorpus(value: unknown): asserts value is Corpus {
  const c = value as Corpus | null;
  if (!c || typeof c !== "object") throw new Error("Corpus must be an object.");
  if (!c.site?.name) throw new Error("Corpus is missing site.name.");
  if (!Array.isArray(c.docs)) throw new Error("Corpus is missing a docs array.");
  for (const doc of c.docs) {
    if (!doc?.id || !doc.title || typeof doc.text !== "string") {
      throw new Error(`Corpus doc is missing id, title or text: ${JSON.stringify(doc)?.slice(0, 120)}`);
    }
  }
}
