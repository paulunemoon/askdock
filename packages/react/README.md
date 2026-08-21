# @askdock/react

The Askdock widget for React: a pill or bubble launcher, a popup or side panel, fully themeable.

```tsx
import { Askdock } from "@askdock/react";

<Askdock endpoint="/api/askdock" name="Acme AI" />
```

Launcher and surface are independent — a pill at the bottom can open a side panel. Colour is a flat set of CSS custom properties written on the widget root, so the widget can't repaint your site and your reset can't flatten the widget.

`icon`, `renderLauncher` and `renderLink` hand back the pieces that carry a brand. On a single-page app you want `renderLink`: without it, following a link out of an answer is a full page load.

`useAskdock()` gives you the conversation without the UI.

---

Part of [Askdock](https://github.com/paulunemoon/askdock) — a chat widget that only knows your site. Full documentation, configuration reference and recipes are in the [main README](https://github.com/paulunemoon/askdock#readme).

MIT.
