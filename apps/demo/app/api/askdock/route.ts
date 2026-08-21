import { createAskdockHandler } from "@askdock/server";
import corpus from "../../../.askdock/corpus.json";

/**
 * The demo's own assistant, answering from the demo's own docs — which is the
 * shortest honest way to show what the thing does. The corpus was written by
 * `pnpm ingest`, reading `content/`.
 *
 * The key is read from the environment by the provider package and never
 * leaves this file's process.
 */
export const POST = createAskdockHandler({
  model: { model: "google/gemini-flash-latest" },
  corpus,
  persona: {
    name: "Askdock",
    audience: "developers deciding whether to use this",
    fallbackHref: "https://github.com/paulunemoon/askdock",
    voice: "Answer in the language the question was asked in.",
  },
});

export const maxDuration = 60;
