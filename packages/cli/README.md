# askdock

Crawl a site into a knowledge base your chat widget can answer from.

```bash
npx askdock ingest https://your-site.com
#   24 pages · ~31.4k tokens · Your Site
#   → .askdock/corpus.json
```

Reads your `sitemap.xml`, or follows same-origin links when there isn't one. A folder of Markdown works too:

```bash
npx askdock ingest ./content --base-url https://your-site.com/docs/
```

The output is plain JSON you can open, read, diff and commit — the assistant's entire knowledge as one reviewable file. Nothing here reads or writes an API key.

---

Part of [Askdock](https://github.com/paulunemoon/askdock) — a chat widget that only knows your site. Full documentation, configuration reference and recipes are in the [main README](https://github.com/paulunemoon/askdock#readme).

MIT.
