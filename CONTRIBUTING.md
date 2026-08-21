# Contributing

Thanks for looking. This is a small tool with one opinion — the assistant answers from the site it is plugged into, and from nothing else. Changes that widen that are the ones to talk about first.

## Setup

```bash
pnpm install
pnpm build
pnpm test
```

The demo needs a key to answer anything: copy `apps/demo/.env.example` to `apps/demo/.env.local` and put a Google AI Studio key in it — the free tier is plenty. Then `pnpm dev`.

## Layout

| | |
|---|---|
| `packages/core` | prompt, grounding, retrieval, provider resolution, streaming protocol |
| `packages/server` | the `Request → Response` handler |
| `packages/react` | the widget, and the headless hook |
| `packages/embed` | the `<script>` build — the React widget compiled against Preact |
| `packages/cli` | `askdock ingest` |
| `apps/demo` | the playground, answering from `apps/demo/content` |

Every package builds with `tsup` except the embed, which is a small `esbuild` script so the bundle size stays visible.

## Before a PR

- `pnpm typecheck && pnpm test && pnpm build` all pass.
- The embed bundle hasn't grown much — `pnpm --filter @askdock/embed build` prints the gzipped size, and `ANALYZE=1` says why.
- No API key, corpus of a real site, or `.env` file in the diff.
- New behaviour that could let the assistant answer off-corpus comes with a test.

## Style

Comments explain why, not what. If a piece of code needs a paragraph to justify it, that paragraph belongs above it — several already exist, and they're the best guide to the house style.

Prose in the UI is short, plain, and never enthusiastic. No emoji.
