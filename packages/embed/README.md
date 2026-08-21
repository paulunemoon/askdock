# @askdock/embed

Askdock as one <script> tag. Any site, no build step, ~14 kB gzipped.

```html
<script
  src="https://unpkg.com/@askdock/embed/dist/askdock.js"
  data-endpoint="https://acme.com/api/askdock"
  data-name="Acme AI"
  data-launcher="bubble"
  data-surface="panel"
  data-accent="#1a56db"
  defer
></script>
```

The React widget compiled against Preact, so it is one UI to maintain and a bundle small enough to drop on a marketing site. Webflow, WordPress, Astro, plain HTML.

Every option is a `data-` attribute, because the people who reach for a script tag are usually pasting into a CMS field. **No API key here, ever** — `data-endpoint` points at a route you host.

---

Part of [Askdock](https://github.com/paulunemoon/askdock) — a chat widget that only knows your site. Full documentation, configuration reference and recipes are in the [main README](https://github.com/paulunemoon/askdock#readme).

MIT.
