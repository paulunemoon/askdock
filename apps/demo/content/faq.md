---
title: FAQ
---

# FAQ

## Does it need a database?

No. The knowledge base is a JSON file and the conversation lives in the browser tab. Nothing is stored between visits.

## How do I keep it up to date?

Re-run `askdock ingest` when the site changes — a `postbuild` script, or a scheduled job. You can also skip the file entirely and pass a function that reads your CMS on each request.

## Can it handle a big site?

Up to the prompt budget it sends everything, which is the sharpest it gets. Past that it ranks pages against the question and sends what fits. Very large sites should pass their own `selectDocs` backed by embeddings.

## What about rate limits and abuse?

The handler ships with an in-memory per-IP limit — eight questions a minute — plus an `authorize` hook, and CORS is closed unless you list origins. That is a ceiling on your API bill, not a security boundary; put a real limiter in front for anything public and popular.

## Which languages?

Whatever the model speaks. The assistant answers in the language of the question, and the corpus is whatever your site is written in.

## Is it accessible?

The panel is a labelled dialog, closes on Escape, opens on a hotkey, keeps focus in the field, and honours `prefers-reduced-motion` and `prefers-color-scheme`.

## Licence

MIT.
