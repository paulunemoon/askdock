---
title: Appearance
---

# Appearance

Two independent choices. The **launcher** is what the visitor sees before they click; the **surface** is what opens. Every combination is legal.

## Launchers

- `pill` — a dock at the bottom of the page, with a label and the keyboard hint. The default.
- `bubble` — a round button in a corner. The familiar one.
- `inline` — no launcher; you open the panel yourself with the `open` prop.
- `none` — nothing until you say so.

## Surfaces

- `popup` — floats over the launcher, sized by `width` and `height`. The default.
- `panel` — slides in from `side`, full height, full width on a phone.
- `inline` — renders in the flow of your page, always open. Good for a `/ask` page.

## Colour

Everything is one flat set of tokens, and the default is black and white on purpose — a widget that arrives with someone else's brand colour is a widget you have to undo first.

```tsx
<Askdock
  endpoint="/api/askdock"
  appearance={{
    launcher: "bubble",
    surface: "panel",
    side: "right",
    colorScheme: "auto",
    theme: { accent: "#1a56db", radius: "20px" },
    darkTheme: { accent: "#93c5fd" },
  }}
/>
```

Tokens: `bg`, `fg`, `muted`, `border`, `accent`, `accentFg`, `brand`, `brandFg`, `mark`, `subtle`, `bubbleBg`, `bubbleFg`, `radius`, `radiusSm`, `font`, `shadow`, `width`, `height`, `z`.

Three are easy to confuse. `accent` draws lines and focus rings, so it has to be a plain colour. `brand` fills the mark in the header and the send button, so it can be a `linear-gradient(…)`. `subtle` is for quiet fills — what a row goes to on hover, the input — and is deliberately not `bubbleBg`: a site whose visitor messages are black does not want black hovers. They become CSS custom properties on the widget root, so the widget can never repaint your site and your reset can never flatten the widget.

In the script embed the same tokens are attributes: `data-accent`, `data-radius`, `data-launcher`, `data-surface`.

## When the tokens are not enough

Three props hand back the parts that carry a brand:

- `icon` — your mark instead of the default spark, in the header and beside every answer.
- `renderLauncher` — draw the resting state yourself and call `open()`. Replaces `launcher`.
- `renderLink` — render same-site links with your router. Without it, following a link out of an answer is a full page load on a single-page app.

```tsx
<Askdock
  endpoint="/api/askdock"
  icon={<LogoMark />}
  renderLauncher={({ open }) => <MyPill onClick={open} />}
  renderLink={(props) => <Link {...props} />}
/>
```
