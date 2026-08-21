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

Tokens: `bg`, `fg`, `muted`, `border`, `accent`, `accentFg`, `bubbleBg`, `bubbleFg`, `radius`, `radiusSm`, `font`, `shadow`, `width`, `height`, `z`. They become CSS custom properties on the widget root, so the widget can never repaint your site and your reset can never flatten the widget.

In the script embed the same tokens are attributes: `data-accent`, `data-radius`, `data-launcher`, `data-surface`.
