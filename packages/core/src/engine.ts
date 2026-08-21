import { streamText } from "ai";
import { assertCorpus, citationOf, type Citation, type Corpus, type CorpusDoc } from "./corpus.js";
import { resolveModel, type ModelSpec } from "./models.js";
import { buildInstructions, type Persona } from "./prompt.js";
import type { AskEvent } from "./protocol.js";
import { selectDocs, type DocSelector } from "./retrieval.js";

export type Turn = { role: "user" | "assistant"; text: string };

export interface EngineConfig {
  /** The model, and the key that never leaves the server. */
  model: ModelSpec;
  /** Static corpus, or a function — reads from a CMS, a file, a database. */
  corpus: Corpus | (() => Corpus | Promise<Corpus>);
  persona?: Partial<Persona>;
  /** Swap in embeddings or your own search. Defaults to lexical scoring. */
  selectDocs?: DocSelector;
  /** How much of the site may go in one prompt. */
  corpusBudgetTokens?: number;
  maxOutputTokens?: number;
  /** Low by default: this is grounded Q&A, not creative writing. */
  temperature?: number;
  /** Longest question accepted, in characters. */
  maxQuestionLength?: number;
  /** Turns of history kept. The widget trims too; this is the one that counts. */
  maxHistoryTurns?: number;
}

export interface AskInput {
  question: string;
  history?: Turn[];
  signal?: AbortSignal;
}

const DEFAULTS = {
  corpusBudgetTokens: 60_000,
  maxOutputTokens: 1200,
  temperature: 0.3,
  maxQuestionLength: 600,
  maxHistoryTurns: 12,
};

/** Everything past this marker is bookkeeping, not prose. */
const MARKER = "\nSOURCES:";

/**
 * One question in, a stream of events out. No HTTP in here — `@askdock/server`
 * wraps it for the web, and tests call it directly.
 */
export async function* ask(
  config: EngineConfig,
  input: AskInput
): AsyncGenerator<AskEvent> {
  const settings = { ...DEFAULTS, ...config };

  const question = input.question.trim().slice(0, settings.maxQuestionLength);
  if (!question) {
    yield { type: "error", value: "Ask me something." };
    return;
  }

  const history = (input.history ?? [])
    .filter((t) => t && (t.role === "user" || t.role === "assistant") && t.text)
    .slice(-settings.maxHistoryTurns)
    .map((t) => ({ role: t.role, text: String(t.text).slice(0, 4000) }));

  let corpus: Corpus;
  try {
    corpus = typeof config.corpus === "function" ? await config.corpus() : config.corpus;
    assertCorpus(corpus);
  } catch (err) {
    console.error("[askdock] corpus", err);
    yield { type: "error", value: "Couldn't reach the knowledge base. Try again." };
    return;
  }

  // Recent turns join the query so "and the second one?" still retrieves.
  const query = [...history.slice(-4).map((t) => t.text), question].join(" ");
  const selection = await (config.selectDocs ?? selectDocs)({
    docs: corpus.docs,
    query,
    budgetTokens: settings.corpusBudgetTokens,
  });

  const persona: Persona = { name: "Assistant", ...config.persona };
  const instructions = buildInstructions(persona, corpus.site, selection.docs);

  let full = "";
  let flushed = 0;

  /**
   * Hold back any tail that could still turn into the SOURCES line, so the
   * model's bookkeeping never flashes on screen mid-stream.
   */
  const safeUpTo = (text: string) => {
    const marker = text.lastIndexOf(MARKER);
    if (marker !== -1) return marker;
    return Math.max(flushed, text.length - MARKER.length);
  };

  try {
    const model = await resolveModel(config.model);

    const result = streamText({
      model,
      instructions,
      messages: [
        ...history.map((t) => ({ role: t.role, content: t.text }) as const),
        { role: "user" as const, content: question },
      ],
      maxOutputTokens: settings.maxOutputTokens,
      temperature: settings.temperature,
      abortSignal: input.signal,
      // streamText swallows errors into the stream; this is where they surface.
      onError({ error }) {
        console.error("[askdock] model", error);
      },
    });

    for await (const delta of result.textStream) {
      if (!delta) continue;
      full += delta;
      const upTo = safeUpTo(full);
      if (upTo > flushed) {
        yield { type: "text", value: full.slice(flushed, upTo) };
        flushed = upTo;
      }
    }

    const marker = full.lastIndexOf(MARKER);
    const answer = marker === -1 ? full : full.slice(0, marker);
    if (answer.length > flushed) yield { type: "text", value: answer.slice(flushed) };

    if (!full.trim()) {
      yield {
        type: "error",
        value: "I couldn't answer that one. Try asking about something on this site.",
      };
      return;
    }

    yield { type: "sources", value: parseSources(full, selection.docs) };
  } catch (err) {
    if ((err as Error)?.name === "AbortError") return;
    // Server-side only: a provider error can carry the request, so never
    // let it reach the browser.
    console.error("[askdock]", err);
    const status = (err as { statusCode?: number; status?: number }).statusCode ??
      (err as { status?: number }).status;
    yield {
      type: "error",
      value:
        status === 429
          ? "The assistant has answered a lot of questions today — try again later."
          : "Something went wrong on my side. Try again in a moment.",
    };
  } finally {
    yield { type: "done" };
  }
}

/** Map the model's `SOURCES: a, b` line back onto real pages. */
export function parseSources(text: string, docs: CorpusDoc[]): Citation[] {
  const marker = text.lastIndexOf(MARKER);
  if (marker === -1) return [];

  const ids = text
    .slice(marker + MARKER.length)
    .split(",")
    .map((s) => s.trim().replace(/^[`"']+|[`"'.]+$/g, ""))
    .filter(Boolean);

  const seen = new Set<string>();
  const out: Citation[] = [];

  for (const id of ids) {
    // Only ever cite a page that is really in the corpus — a hallucinated id
    // has to fall on the floor rather than become a dead link.
    const doc = docs.find((d) => d.id === id);
    if (!doc || seen.has(doc.id)) continue;
    seen.add(doc.id);
    out.push(citationOf(doc));
    if (out.length === 3) break;
  }

  return out;
}
