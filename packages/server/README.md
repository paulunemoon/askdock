# @askdock/server

The Askdock route handler. A plain Request → Response function, so it runs anywhere with fetch.

```ts
// app/api/askdock/route.ts
import { createAskdockHandler } from "@askdock/server";
import corpus from "../../../.askdock/corpus.json";

export const POST = createAskdockHandler({
  model: { model: "google/gemini-3.1-flash-lite" },
  corpus,
  persona: { name: "Acme AI", fallbackHref: "/contact" },
});
```

Next.js, Hono, Bun, Deno — same line. Ships a per-IP rate limit, closed CORS, and an `authorize` hook.

**This file is where your API key lives.** It is read from the server environment and never reaches the browser.

---

Part of [Askdock](https://github.com/paulunemoon/askdock) — a chat widget that only knows your site. Full documentation, configuration reference and recipes are in the [main README](https://github.com/paulunemoon/askdock#readme).

MIT.
