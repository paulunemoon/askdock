# Askdock

**A chat widget that only knows your site.**

It reads the pages you publish, answers from those, and says it doesn't know about anything else. Any model, your own API key, your own content. MIT.

```bash
npx askdock ingest https://your-site.com
```

```tsx
<Askdock endpoint="/api/askdock" name="Acme AI" />
```

---

## Why

Most drop-in chat widgets are a general-purpose model wearing your logo. Ask one about a competitor's pricing and it will happily make something up — on your domain, in your voice.

Askdock is the other shape. The model gets no tools, no web access, and one closed knowledge base built from your own pages. What isn't in that file isn't available to it: not filtered, absent. When the site doesn't cover a question, it says so and points at a human.

## How it works

```
   npx askdock ingest              your server                    the browser
┌────────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
│  sitemap.xml           │   │  createAskdockHandler│   │  <Askdock /> or      │
│  → pages → plain text  │──▶│  corpus + rules      │◀──│  <script src=…>      │
│  → .askdock/corpus.json│   │  API KEY lives here  │   │  never sees a key    │
└────────────────────────┘   └──────────┬───────────┘   └──────────────────────┘
                                        │
                              Gemini · Claude · GPT · local
```

Three things keep it on topic, because any one alone leaks: no tools, a closed corpus, and a prompt that makes the refusal explicit. Every answer that used the corpus comes back with citations, checked against the real pages so a made-up id becomes nothing rather than a dead link.

---

## Setup

### 1. Teach it your site

```bash
npx askdock ingest https://your-site.com
#   24 pages · ~31.4k tokens · Your Site
#   → .askdock/corpus.json
```

It reads `sitemap.xml`, or follows same-origin links when there isn't one. The result is plain JSON you can open, read, diff and commit — the assistant's entire knowledge in one reviewable file. Re-run it whenever the site changes.

A folder of Markdown works too:

```bash
npx askdock ingest ./content --base-url https://your-site.com/docs/
```

### 2. Add the route

```ts
// app/api/askdock/route.ts
import { createAskdockHandler } from "@askdock/server";
import corpus from "../../../.askdock/corpus.json";

export const POST = createAskdockHandler({
  model: { model: "google/gemini-3.1-flash-lite" },
  corpus,
  persona: { name: "Acme AI", fallbackHref: "/contact" },
});

export const maxDuration = 60;
```

The handler is a plain `Request → Response` function, so the same line works on Hono, Bun, Deno, or anything else with `fetch`.

### 3. Put it on the page

**React**

```bash
npm i @askdock/react @askdock/server @ai-sdk/google
```

```tsx
import { Askdock } from "@askdock/react";

<Askdock endpoint="/api/askdock" name="Acme AI" />
```

**Anything else** — Webflow, WordPress, Astro, plain HTML. One tag, ~14 kB gzipped:

```html
<script
  src="https://unpkg.com/@askdock/embed/dist/askdock.js"
  data-endpoint="https://acme.com/api/askdock"
  data-name="Acme AI"
  defer
></script>
```

---

## Configuration

### Server — `createAskdockHandler(config)`

| Option | Type | Default | What it does |
|---|---|---|---|
| `model` | `ModelSpec` | — | Which model, and the key. See [Models](#models). |
| `corpus` | `Corpus \| () => Promise<Corpus>` | — | The knowledge base. A function is called per request — use it to read a CMS. |
| `persona` | `Persona` | — | Who the assistant is. See below. |
| `maxOutputTokens` | `number` | `1200` | Ceiling on an answer. Too low and the answer stops before its `SOURCES` line, taking the citations with it. |
| `temperature` | `number` | `0.3` | Grounded Q&A, not creative writing. |
| `corpusBudgetTokens` | `number` | `60000` | How much of the site may go in one prompt. Under this, everything is sent. |
| `selectDocs` | `DocSelector` | lexical | Swap in embeddings or your own search. |
| `maxQuestionLength` | `number` | `600` | Characters accepted in a question. |
| `maxHistoryTurns` | `number` | `12` | Turns of history kept. |
| `rateLimit` | `RateLimit \| false` | 8/min per IP | In-memory, per instance. A ceiling on your bill, not a security boundary. |
| `allowedOrigins` | `string[] \| "*"` | closed | Cross-site callers. Leave unset for a same-origin widget. |
| `authorize` | `(req) => boolean` | — | Last word on who may ask. Runs before a token is spent. |

### Persona

| Option | What it does |
|---|---|
| `name` | What the assistant calls itself. |
| `subject` | Who or what the site is about — `"Acme"`, `"Jane Doe"`. |
| `audience` | Who tends to be asking. Steers tone and refusals. |
| `fallbackHref` | Where to send someone the site can't answer. |
| `voice` | Free text appended to the tone rules. Put your language rule here. |
| `extraRules` | Appended verbatim after the rulebook — site-specific facts and prohibitions. |
| `overrideRules` | Replaces the whole rulebook. You own grounding from here on. |

### Models

```ts
model: { model: "google/gemini-3.1-flash-lite" }
model: { model: "anthropic/claude-sonnet-4-5" }
model: { model: "openai/gpt-5" }
model: { provider: "openai-compatible", model: "llama-3.3-70b", baseURL: "http://localhost:11434/v1" }
model: { provider: "gateway", model: "anthropic/claude-sonnet-4-5" }   // Vercel AI Gateway
```

The prefix picks the provider package — install only the one you use: `@ai-sdk/google`, `@ai-sdk/anthropic`, `@ai-sdk/openai`. Pass an already-built AI SDK model if you need a provider this list has never heard of.

| Provider | Key read from | Install |
|---|---|---|
| `google` | `GOOGLE_GENERATIVE_AI_API_KEY` | `@ai-sdk/google` |
| `anthropic` | `ANTHROPIC_API_KEY` | `@ai-sdk/anthropic` |
| `openai` | `OPENAI_API_KEY` | `@ai-sdk/openai` |
| `openai-compatible` | `OPENAI_API_KEY` + `baseURL` | `@ai-sdk/openai` |
| `gateway` | `AI_GATEWAY_API_KEY`, or OIDC on Vercel | — |

Set `apiKey` explicitly if your keys live somewhere else — a secret manager, a per-tenant lookup.

> **Pin the version, don't track an alias.** `-latest` moves when the provider decides it does, and can land you on a tier with a different free quota without a commit of yours.

### Widget

| Prop | Type | Default | What it does |
|---|---|---|---|
| `endpoint` | `string` | `/api/askdock` | Where it posts. |
| `name` | `string` | `"Assistant"` | Shown in the header. |
| `tagline` | `string` | — | The line under the name. |
| `intro` | `string` | — | First thing in an empty panel. |
| `starters` | `string[]` | — | Buttons offered before the first question. |
| `placeholder` | `string` | `"Ask a question…"` | |
| `launcherLabel` | `string` | `"Ask anything"` | Label on the pill. |
| `disclaimer` | `ReactNode` | — | Under the field. Markup allowed in React, plain text in the embed. |
| `hotkey` | `string \| false` | `"k"` | With ⌘/Ctrl. `false` turns it off. |
| `maxLength` | `number` | `600` | Mirrors the server's own cap. |
| `sections` | `string[]` | — | First path segments that may become links in an answer — `["docs", "pricing"]`. Without it, no bare path becomes a link. |
| `open` / `onOpenChange` | `boolean` / `fn` | — | Controlled open state. |
| `icon` | `ReactNode` | spark | Your mark, in the header and beside every answer. |
| `renderLauncher` | `({ open }) => ReactNode` | — | Draw the resting state yourself. Replaces `launcher`. |
| `renderLink` | `(props) => ReactNode` | anchor | Render same-site links with your router. **On a single-page app you want this** — without it, following a link out of an answer is a full page load. |

### Appearance

| Option | Values | Default |
|---|---|---|
| `launcher` | `pill` · `bubble` · `inline` · `none` | `pill` |
| `surface` | `popup` · `panel` · `inline` | `popup` |
| `corner` | `bottom-right` · `bottom-left` · `bottom-center` | `bottom-center` |
| `side` | `right` · `left` — which edge a `panel` slides from | `right` |
| `colorScheme` | `light` · `dark` · `auto` | `auto` |
| `offset` | any CSS length | `20px` |
| `theme` | partial theme, see below | — |
| `darkTheme` | applied on top of `theme` in dark mode | — |

Launcher and surface are independent: a pill at the bottom can open a side panel, a corner bubble can open a popup.

### Theme tokens

Every colour is one flat set of custom properties, written on the widget root — so the widget can't repaint your site and your reset can't flatten the widget. The default is black and white on purpose.

| Token | What it paints |
|---|---|
| `bg` | Panel background |
| `fg` | Body text |
| `muted` | Labels, placeholder, the disclaimer |
| `border` | Hairlines, and the idle send button |
| `accent` | Launcher fill and focus rings. **A line colour — never a gradient.** |
| `accentFg` | Text on `accent` |
| `brand` | The mark's disc and the armed send button. **A fill, so a `linear-gradient(…)` works.** |
| `brandFg` | The glyph on `brand` |
| `mark` | The small mark beside the intro and each answer. A glyph, so a flat colour. |
| `subtle` | Quiet fills: hovers, the input. **Not** `bubbleBg`. |
| `bubbleBg` / `bubbleFg` | The visitor's own messages |
| `radius` / `radiusSm` | Panel · buttons, chips, the input |
| `font` | Font stack |
| `shadow` | Panel shadow |
| `width` / `height` | Popup size, and panel width on desktop |
| `z` | Above your header, below your cookie banner |

The three easy to confuse: `accent` draws lines, `brand` fills shapes, `subtle` is a hover — and none of them is the visitor's message bubble.

### Script embed attributes

Every option above that is a string has a `data-` twin. Appearance and theme keys are flat.

| Attribute | Example |
|---|---|
| `data-endpoint` | `https://acme.com/api/askdock` |
| `data-name`, `data-tagline`, `data-intro`, `data-placeholder` | text |
| `data-starters` | `How do I install it?\|What does it cost?` — pipe-separated |
| `data-launcher`, `data-surface`, `data-corner`, `data-side`, `data-color-scheme`, `data-offset` | see Appearance |
| `data-accent`, `data-brand`, `data-mark`, `data-subtle`, `data-radius`, … | any theme token |
| `data-hotkey` | `k`, or `false` |
| `data-mount` | a selector, to place it yourself |

Anything an attribute can't express goes through `window.askdock({ … })`, which re-renders in place.

### CLI

```
askdock ingest <url|directory> [options]
```

| Flag | Default | What it does |
|---|---|---|
| `-o, --out <path>` | `.askdock/corpus.json` | Where to write |
| `-m, --max-pages <n>` | `200` | Stop after n pages |
| `--include <pat>` | all | Only paths matching. Repeatable. `/regex/` works. |
| `--exclude <pat>` | none | Skip paths matching. Repeatable. |
| `--selector <tag>` | `<main>`, then the page | Wrapper to read text from |
| `--base-url <url>` | — | Directory mode: prefix for citation links |
| `--name <name>` | the hostname | Site name the assistant is told |
| `--concurrency <n>` | `5` | Parallel requests |
| `--quiet` | | Only print the summary |

Nothing in the CLI reads or writes an API key.

---

## Recipes

**A corpus from your CMS**, instead of a crawl:

```ts
corpus: async () => ({
  site: { name: "Acme", url: "https://acme.com" },
  docs: (await cms.getPages()).map((p) => ({
    id: p.slug, title: p.title, url: `/${p.slug}`, kind: "Page", text: p.body,
  })),
});
```

**Your own visual language**, when the tokens aren't enough:

```tsx
<Askdock
  endpoint="/api/askdock"
  icon={<LogoMark />}
  renderLauncher={({ open }) => <MyPill onClick={open} />}
  renderLink={(props) => <Link {...props} />}
/>
```

**A full page** instead of a floating panel:

```tsx
<Askdock endpoint="/api/askdock" appearance={{ surface: "inline", launcher: "inline" }} />
```

**Your own UI**, with the conversation handed to you:

```tsx
const { messages, streaming, error, ask, stop } = useAskdock({ endpoint: "/api/askdock" });
```

---

## Your key, and only yours

- The key is read on your server and sent to your provider. Nothing else.
- The widget knows one thing about your setup: the URL it posts to.
- There is no mode in which a key reaches the browser, and there won't be one — a key in a `<script>` tag is a key in everyone's browser.
- No commit in this repository has ever contained a key. `.env*` is ignored; `.env.example` ships empty.

See [SECURITY.md](SECURITY.md) for hardening a public deployment.

## What's in the box

| Package | |
|---|---|
| [`askdock`](packages/cli) | the CLI — crawls a site or a folder into a corpus |
| [`@askdock/core`](packages/core) | prompt, grounding, retrieval, provider resolution, streaming |
| [`@askdock/server`](packages/server) | the route handler — rate limit, CORS, auth hook |
| [`@askdock/react`](packages/react) | `<Askdock />`, and `useAskdock()` if you'd rather build the UI |
| [`@askdock/embed`](packages/embed) | the `<script>` tag, Preact under the hood |
| [`apps/demo`](apps/demo) | the playground, answering from this repo's own docs |

## Local development

```bash
pnpm install
pnpm build
cp apps/demo/.env.example apps/demo/.env.local   # add a key
pnpm dev                                          # localhost:3000
pnpm test
```

## Honest limits

- Models paraphrase, and paraphrase drifts. Grounding makes an unsupported answer unlikely, not impossible. Keep the disclaimer; point people at a human for anything that matters.
- Small models are the ones that break the rules — answering in the wrong language, declining what the corpus plainly covers. If the assistant misbehaves, try a larger model before rewriting the prompt.
- The bundled rate limit is in-memory and per instance.
- Retrieval past the prompt budget is lexical, not semantic. Big sites should pass their own `selectDocs`.

## Contributing

Pull requests are welcome and are the only way in: `main` is protected, and every change is reviewed before it lands. Start with [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

MIT — see [LICENSE](LICENSE).
