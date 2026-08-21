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
   * streamText does not throw: a provider failure arrives through onError and
   * the stream simply ends. Without catching it here, an outage would reach
   * the visitor as "I could not answer that" — a refusal, which is a lie about
   * whose fault it is.
   */
  let failure: unknown = null;

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
        failure = error;
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
      yield failure
        ? { type: "error", value: messageFor(failure) }
        : {
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
    yield { type: "error", value: messageFor(err) };
  } finally {
    yield { type: "done" };
  }
}

/**
 * What the visitor is told when the provider fails. Never the provider's own
 * message: it can quote the request back, prompt and all.
 */
export function messageFor(error: unknown): string {
  // The SDK retries, then throws an AI_RetryError whose own status is empty —
  // the one that says what actually happened is on the error it wrapped.
  const inner =
    (error as { lastError?: unknown }).lastError ?? (error as { cause?: unknown }).cause ?? error;
  const status =
    (inner as { statusCode?: number }).statusCode ?? (inner as { status?: number }).status;

  if (status === 429) {
    return "The assistant has answered a lot of questions today — try again later.";
  }
  // 503 is the free tiers under load, and it clears on its own.
  if (status === 503 || status === 502 || status === 504) {
    return "The assistant is busy right now. Give it a few seconds and ask again.";
  }
  return "Something went wrong on my side. Try again in a moment.";
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
