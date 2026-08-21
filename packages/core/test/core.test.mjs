import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assertCorpus,
  buildInstructions,
  createEventParser,
  parseModel,
  parseSources,
  selectDocs,
  themeToCssVars,
  defaultAppearance,
} from "../dist/index.js";

const docs = [
  { id: "pricing", title: "Pricing", url: "/pricing", text: "Plans start at 12 euros a month." },
  { id: "about", title: "About", url: "/about", text: "We are a studio in Paris making tools." },
  { id: "docs/api", title: "API", url: "/docs/api", text: "The REST API accepts JSON over HTTPS." },
];

test("citations only ever point at pages that exist", () => {
  const answer = "Plans start at 12 euros.\nSOURCES: pricing, invented-page, about";
  const cited = parseSources(answer, docs);

  assert.deepEqual(cited.map((c) => c.id), ["pricing", "about"]);
  assert.equal(cited[0].url, "/pricing");
});

test("no SOURCES line means no citations", () => {
  assert.deepEqual(parseSources("That isn't on this site.", docs), []);
});

test("a small corpus goes in whole", async () => {
  const selection = await selectDocs({ docs, query: "pricing", budgetTokens: 10_000 });

  assert.equal(selection.truncated, false);
  assert.equal(selection.docs.length, 3);
});

test("a tight budget keeps the pages the question is about", async () => {
  const selection = await selectDocs({ docs, query: "how much does the API cost", budgetTokens: 30 });

  assert.equal(selection.truncated, true);
  assert.ok(selection.docs.length < 3, "nothing was dropped");
  assert.ok(
    selection.docs.some((d) => d.id === "pricing" || d.id === "docs/api"),
    "dropped the pages the question was about"
  );
});

test("the prompt carries the rules and the pages, and nothing else", () => {
  const instructions = buildInstructions(
    { name: "Acme AI", fallbackHref: "/contact" },
    { name: "Acme" },
    docs
  );

  assert.match(instructions, /only thing you know/i);
  assert.match(instructions, /\/contact/);
  assert.match(instructions, /id: pricing/);
  assert.match(instructions, /# KNOWLEDGE BASE/);
});

test("model strings split into a provider and a model", () => {
  assert.deepEqual(parseModel({ model: "google/gemini-flash-latest" }), {
    provider: "google",
    model: "gemini-flash-latest",
  });
  // Model ids with their own slash keep everything after the first one.
  assert.deepEqual(parseModel({ model: "openai-compatible/meta/llama-3", provider: "openai-compatible" }), {
    provider: "openai-compatible",
    model: "openai-compatible/meta/llama-3",
  });
  assert.throws(() => parseModel({ model: "gemini-flash-latest" }), /no provider/);
});

test("the event parser survives an event split across chunks", () => {
  const parse = createEventParser();

  assert.deepEqual(parse('{"type":"text","value":"He'), []);
  assert.deepEqual(parse('llo"}\n{"type":"done"}\n'), [
    { type: "text", value: "Hello" },
    { type: "done" },
  ]);
});

test("theme overrides win over the scheme's palette", () => {
  const vars = themeToCssVars(
    { ...defaultAppearance, colorScheme: "dark", theme: { accent: "#1a56db" } },
    false
  );

  assert.equal(vars["--ad-accent"], "#1a56db");
  assert.equal(vars["--ad-bg"], "#0a0a0a", "dark scheme was not applied");
});

test("a malformed corpus is caught before it reaches a model", () => {
  assert.throws(() => assertCorpus({ docs: [] }), /site\.name/);
  assert.throws(() => assertCorpus({ site: { name: "x" }, docs: [{ id: "a" }] }), /missing id, title or text/);
});
