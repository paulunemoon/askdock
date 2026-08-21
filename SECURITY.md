# Security

## Reporting

Email pauline.milaalonso@gmail.com, or open a GitHub security advisory. Please don't open a public issue for anything exploitable.

## What this project promises

**Your API key stays on your server.** It is read from your environment by the provider package inside `@askdock/server` and sent only to that provider. The widget is given one piece of configuration — the URL it posts to. No code path sends a key to the browser, and a PR adding one will be declined.

**The corpus is a file you control.** `askdock ingest` writes plain JSON. Read it before you ship it: whatever is in there, the assistant can say.

**Prompt injection is treated as expected input.** The system prompt tells the model to ignore instructions inside a visitor's message, and the model has no tools to be redirected toward. That reduces the blast radius; it does not eliminate it. Never put anything in the corpus that visitors shouldn't read.

## What it does not promise

- The bundled rate limit is in-memory and per instance. It caps your API bill against casual abuse; it is not a defence against a determined one. Put a real limiter in front of a public endpoint.
- CORS is closed by default. Setting `allowedOrigins: "*"` opens your endpoint, and your bill, to any page on the web.
- Model output is not verified. Grounding makes an unsupported answer unlikely, not impossible.

## Hardening a public deployment

- Keep `allowedOrigins` to the domains you own.
- Add `authorize` for a signed token, a bot check, or your own limiter.
- Watch provider spend, and set a budget alert on the account holding the key.
- Re-read the corpus after every ingest — a crawl picks up whatever the site publishes, including pages you forgot were public.
