# @askdock/core

The grounded chat engine behind Askdock: prompt, retrieval, provider resolution, streaming protocol.

Framework-free and transport-free. You rarely install this directly — [`@askdock/server`](https://github.com/paulunemoon/askdock/tree/main/packages/server) and [`@askdock/react`](https://github.com/paulunemoon/askdock/tree/main/packages/react) both depend on it — but it is the package to reach for when you want the engine somewhere the shipped handler can't go.

```ts
import { ask } from "@askdock/core";

for await (const event of ask({ model: { model: "google/gemini-3.1-flash-lite" }, corpus }, { question })) {
  // { type: "text" | "sources" | "error" | "done" }
}
```

It also owns the theme and appearance types the browser packages read.

---

Part of [Askdock](https://github.com/paulunemoon/askdock) — a chat widget that only knows your site. Full documentation, configuration reference and recipes are in the [main README](https://github.com/paulunemoon/askdock#readme).

MIT.
