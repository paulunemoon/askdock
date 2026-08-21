import { estimateTokens, renderDoc, type CorpusDoc } from "./corpus.js";

/**
 * Which pages go in the prompt.
 *
 * Most sites this widget gets bolted onto are small — a portfolio, a docs
 * site, a landing page — and their whole text fits in a modern context window
 * for a fraction of a cent. So the default is: send everything. That keeps the
 * answers grounded in the *whole* site rather than in whatever a similarity
 * search happened to surface, and it removes an embedding step, a vector
 * store and a second API key from the setup.
 *
 * Past the budget we fall back to lexical scoring (BM25-flavoured, no
 * dependencies, no index to keep warm). It is not as sharp as embeddings, but
 * it is honest about what it is: a way to fit a big site into a small prompt.
 * Sites large enough to need real retrieval can pass their own `selectDocs`.
 */

export interface SelectionInput {
  docs: CorpusDoc[];
  /** The visitor's question, plus recent turns for pronoun-heavy follow-ups. */
  query: string;
  /** Prompt budget for the knowledge base, in tokens. */
  budgetTokens: number;
}

export interface Selection {
  docs: CorpusDoc[];
  /** True when the budget forced us to drop pages. Surfaced in debug mode. */
  truncated: boolean;
  tokens: number;
}

export type DocSelector = (input: SelectionInput) => Selection | Promise<Selection>;

const STOP = new Set(
  ("a an and are as at be but by for from how i in is it its of on or that the this to was what when where which who why with you your" +
    " le la les un une des du de et est sont pour dans sur par que qui quoi comment quand ou où avec vous votre ton ta tes ce cette")
    .split(" ")
);

function terms(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

const K1 = 1.2;
const B = 0.75;

/** BM25 over the corpus, with the title weighted as if it appeared three times. */
function rank(docs: CorpusDoc[], query: string): CorpusDoc[] {
  const queryTerms = [...new Set(terms(query))];
  if (queryTerms.length === 0) return docs;

  const bags = docs.map((doc) => {
    const bag = new Map<string, number>();
    const add = (list: string[], weight: number) => {
      for (const t of list) bag.set(t, (bag.get(t) ?? 0) + weight);
    };
    add(terms(doc.text), 1);
    add(terms(doc.title), 3);
    add(terms(doc.id), 2);
    return bag;
  });

  const lengths = bags.map((b) => [...b.values()].reduce((a, n) => a + n, 0));
  const avgLength = lengths.reduce((a, n) => a + n, 0) / (lengths.length || 1) || 1;

  const df = new Map<string, number>();
  for (const t of queryTerms) {
    df.set(t, bags.filter((b) => b.has(t)).length);
  }

  const scored = docs.map((doc, i) => {
    const bag = bags[i]!;
    const length = lengths[i] ?? 0;
    let score = 0;

    for (const t of queryTerms) {
      const tf = bag.get(t);
      if (!tf) continue;
      const n = df.get(t) ?? 0;
      const idf = Math.log(1 + (docs.length - n + 0.5) / (n + 0.5));
      score += idf * ((tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * length) / avgLength)));
    }

    return { doc, score, i };
  });

  // Ties keep corpus order, so an unscored corpus stays in the author's order.
  scored.sort((a, b) => b.score - a.score || a.i - b.i);
  return scored.map((s) => s.doc);
}

export const selectDocs: DocSelector = ({ docs, query, budgetTokens }) => {
  const total = docs.reduce((sum, d) => sum + estimateTokens(renderDoc(d)), 0);
  if (total <= budgetTokens) return { docs, truncated: false, tokens: total };

  const kept: CorpusDoc[] = [];
  let tokens = 0;

  for (const doc of rank(docs, query)) {
    const cost = estimateTokens(renderDoc(doc));
    if (tokens + cost > budgetTokens) continue; // a smaller page may still fit
    kept.push(doc);
    tokens += cost;
  }

  // Back in corpus order: the model reads a site, not a ranked list.
  const order = new Map(docs.map((d, i) => [d.id, i]));
  kept.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  return { docs: kept, truncated: true, tokens };
};
