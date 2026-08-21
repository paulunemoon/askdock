# Askdock

A chat widget that only knows your site.

It reads the pages you publish, answers from those, and says it doesn't know about anything else. Bring any model and your own API key. MIT.

```bash
npx askdock ingest https://your-site.com
```

```tsx
<Askdock endpoint="/api/askdock" name="Acme AI" />
```

---

## Why

Most drop-in chat widgets are a general-purpose model wearing your logo. Ask one about a competitor's pricing and it will happily make something up, on your domain, in your voice.

Askdock is the other shape: the model gets no tools, no web access, and one closed knowledge base built from your own pages. What isn't in that file isn't available to it — not filtered, absent. When the site doesn't cover a question it says so and points at a human.

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

## Install

### 1. Teach it your site

```bash
npx askdock ingest https://your-site.com
#   6 pages · ~2.0k tokens · Your Site
#   → .askdock/corpus.json
```

It reads `sitemap.xml`, or follows same-origin links when there isn't one. The result is plain JSON you can open, read, diff and commit — the assistant's entire knowledge in one reviewable file.

```bash
askdock ingest https://acme.com --exclude /blog/tag --max-pages 80
askdock ingest ./content --base-url https://acme.com/docs/   # markdown instead
```

### 2. Add the route

```ts
// app/api/askdock/route.ts
import { createAskdockHandler } from "@askdock/server";
import corpus from "../../../.askdock/corpus.json";

export const POST = createAskdockHandler({
  model: { model: "google/gemini-flash-latest" },
  corpus,
  persona: { name: "Acme AI", fallbackHref: "/contact" },
});

export const maxDuration = 60;
```

The key is read from the environment — `GOOGLE_GENERATIVE_AI_API_KEY` here — and stays on the server. The handler is a plain `Request → Response` function, so it also runs on Hono, Bun, Deno, or anything else with `fetch`.

### 3. Put it on the page

React:

```tsx
import { Askdock } from "@askdock/react";

<Askdock endpoint="/api/askdock" name="Acme AI" />
```

Anything else — Webflow, WordPress, Astro, plain HTML — one tag, ~14 kB gzipped:

```html
<script
  src="https://unpkg.com/@askdock/embed/dist/askdock.js"
  data-endpoint="https://acme.com/api/askdock"
  data-name="Acme AI"
  data-launcher="bubble"
  data-surface="panel"
  defer
></script>
```

## Shape and colour

Two independent choices. The **launcher** is what visitors see before they click; the **surface** is what opens.

| Launcher | | Surface | |
|---|---|---|---|
| `pill` | a dock at the bottom, with a label and a hotkey hint | `popup` | floats over the launcher |
| `bubble` | a round button in a corner | `panel` | slides in full height |
| `inline` | none — you open it yourself | `inline` | lives in your page, always open |

```tsx
<Askdock
  endpoint="/api/askdock"
  appearance={{
    launcher: "bubble",
    surface: "panel",
    side: "right",
    theme: { accent: "#1a56db", radius: "20px" },
    darkTheme: { accent: "#93c5fd" },
  }}
/>
```

Colour is one flat set of tokens — `bg`, `fg`, `muted`, `border`, `accent`, `accentFg`, `brand`, `brandFg`, `subtle`, `bubbleBg`, `bubbleFg`, `radius`, `radiusSm`, `font`, `shadow`, `width`, `height`, `z` — and the default is black and white on purpose. Three are easy to confuse. `accent` draws lines and focus rings, so it has to be a plain colour. `brand` fills the mark in the header and the send button, so it can be a `linear-gradient(…)`. `subtle` is for quiet fills — what a row goes to on hover, the input — and is deliberately not `bubbleBg`: a site whose visitor messages are black does not want black hovers. They become CSS custom properties on the widget root, so the widget can't repaint your site and your reset can't flatten the widget. In the script embed the same tokens are `data-accent`, `data-radius`, and so on.

Run `pnpm dev` for a playground that writes the snippet for you.

### When the tokens are not enough

A site with its own visual language can replace the pieces that carry it, rather than theming its way toward them:

```tsx
<Askdock
  endpoint="/api/askdock"
  icon={<LogoMark />}                                  // your mark, not the spark
  renderLauncher={({ open }) => <MyPill onClick={open} />}
  renderLink={(props) => <Link {...props} />}          // next/link, so no reload
/>
```

`renderLink` matters on any single-page app: without it, following a link out of an answer is a full page load.

## Models

```ts
model: { model: "google/gemini-flash-latest" }
model: { model: "anthropic/claude-sonnet-4-5" }
model: { model: "openai/gpt-5" }
model: { provider: "openai-compatible", model: "llama-3.3-70b", baseURL: "http://localhost:11434/v1" }
model: { provider: "gateway", model: "anthropic/claude-sonnet-4-5" }   // Vercel AI Gateway
```

The prefix picks the provider package; install only the one you use. Pass an already-built AI SDK model if you need a provider this list has never heard of.

## Your key, and only yours

- The key is read on your server and sent to your provider. Nothing else.
- The widget knows one thing about your setup: the URL it posts to.
- There is no mode in which a key reaches the browser, and there won't be one — a key in a `<script>` tag is a key in everyone's browser.
- Nothing in this repo has ever held a key. `.env*` is ignored; `.env.example` is empty.

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
- The bundled rate limit is in-memory and per instance — a ceiling on your API bill, not a security boundary.
- Retrieval past the prompt budget is lexical, not semantic. Big sites should pass their own `selectDocs`.
- Re-run `ingest` when the site changes, or pass a function that reads your CMS on each request.

## Licence

MIT — see [LICENSE](LICENSE).
