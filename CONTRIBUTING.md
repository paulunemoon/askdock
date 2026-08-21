# Contributing

Thanks for looking. This is a small tool with one opinion: the assistant answers from the site it is plugged into, and from nothing else. Changes that widen that are the ones to talk about first — open an issue before writing the code.

## How a change lands

`main` is protected. Nobody pushes to it directly, including maintainers on anything non-trivial.

1. Fork, or branch if you have write access.
2. Open a pull request describing what changes and why.
3. A maintainer reviews it. Every PR needs an approving review before it can merge.
4. CI has to be green: typecheck, tests, build, and a real Next build of the demo.

Small, focused PRs get reviewed quickly. A PR that changes five unrelated things gets one round of "please split this".

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

## Before you open a PR

- `pnpm build && pnpm typecheck && pnpm test` all pass. Build first: packages resolve each other through `dist/`.
- The embed bundle hasn't grown much — `pnpm --filter @askdock/embed build` prints the gzipped size, and `ANALYZE=1` says why.
- No API key, no corpus of a real site, no `.env` file in the diff.
- New behaviour that could let the assistant answer off-corpus comes with a test.
- A new theme token comes with its row in the README table.

## Style

Comments explain why, not what. If a piece of code needs a paragraph to justify it, that paragraph belongs above it — several already exist, and they are the best guide to the house style.

Prose in the UI is short, plain, and never enthusiastic. No emoji.

## Reporting a vulnerability

Not here — see [SECURITY.md](SECURITY.md). Please don't open a public issue for anything exploitable.
