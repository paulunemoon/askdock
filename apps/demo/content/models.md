---
title: Models and keys
---

# Models and keys

## Any provider, one string

```ts
model: { model: "google/gemini-flash-latest" }
model: { model: "anthropic/claude-sonnet-4-5" }
model: { model: "openai/gpt-5" }
```

The prefix picks the provider package, the rest is whatever that provider calls its model. Install only the one you use: `@ai-sdk/google`, `@ai-sdk/anthropic` or `@ai-sdk/openai`.

Self-hosted and proxied endpoints work through `openai-compatible`:

```ts
model: {
  provider: "openai-compatible",
  model: "llama-3.3-70b",
  baseURL: "http://localhost:11434/v1",
}
```

On Vercel, `provider: "gateway"` routes every provider through one key with failover.

## Where the key lives

In your server's environment. Askdock reads it there and never sends it anywhere but the provider.

- `GOOGLE_GENERATIVE_AI_API_KEY`
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`

Pass `apiKey` explicitly if you keep keys somewhere else — a secret manager, a per-tenant lookup. There is no mode in which a key reaches the browser, and there will not be one: a key in a `<script>` tag is a key in everyone's browser.

## Cost

A grounded answer is one call: your pages in, two short paragraphs out. A portfolio's worth of content is a few thousand tokens per question — cents a day at Flash rates, and Google's free tier covers a small site outright. Sites past the prompt budget send only the pages closest to each question.
