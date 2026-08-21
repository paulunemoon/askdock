---
title: Install
---

# Install

Two steps: teach it your site, then put it on the page.

## 1. Ingest

```bash
npx askdock ingest https://your-site.com
```

This reads your `sitemap.xml` — or follows links from the URL you gave it when there isn't one — and writes `.askdock/corpus.json`. That file is the assistant's entire knowledge. Open it, read it, commit it.

Useful flags: `--exclude /blog/tag`, `--max-pages 80`, `--selector article`, `--out path.json`. A directory of Markdown works too: `npx askdock ingest ./content --base-url https://your-site.com/docs/`.

## 2. Serve

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

The key comes from the environment — `GOOGLE_GENERATIVE_AI_API_KEY` here — and stays there.

## 3. Show

React:

```tsx
import { Askdock } from "@askdock/react";

<Askdock endpoint="/api/askdock" name="Acme AI" />
```

Anything else:

```html
<script src="https://unpkg.com/@askdock/embed/dist/askdock.js"
        data-endpoint="https://acme.com/api/askdock"
        data-name="Acme AI" defer></script>
```
