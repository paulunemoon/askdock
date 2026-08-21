/**
 * How the widget looks and where it sits.
 *
 * Two independent choices, because they really are independent: the
 * **launcher** is what the visitor sees before they click, the **surface** is
 * what opens. A pill at the bottom can open a side panel; a bubble in the
 * corner can open a popup. Every combination is legal.
 *
 * Colour is one flat set of CSS custom properties. Anything not overridden
 * falls back to the default black-and-white, which is deliberately plain: a
 * widget that arrives with someone else's brand colour is a widget you have
 * to undo before you can use it.
 */

/** The resting state. `pill` = a dock at the bottom. `bubble` = a round button. */
export type Launcher = "pill" | "bubble" | "inline" | "none";

/** What opens. `popup` floats over the launcher; `panel` slides in full-height. */
export type Surface = "popup" | "panel" | "inline";

export type Corner = "bottom-right" | "bottom-left" | "bottom-center";
export type Side = "right" | "left";

export interface Theme {
  /** Panel background. */
  bg: string;
  /** Body text. */
  fg: string;
  /** Timestamps, labels, the disclaimer. */
  muted: string;
  /** Hairlines and the field outline. */
  border: string;
  /** Launcher fill and focus ring. Must be a plain colour — outlines are lines. */
  accent: string;
  /** Text on `accent`. */
  accentFg: string;
  /**
   * The two surfaces that carry a brand: the mark in the header, and the send
   * button once there is something to send. Nothing here is ever used as a
   * line, so a `linear-gradient(…)` is as valid as a colour. Defaults to
   * `accent`.
   */
  brand: string;
  brandFg: string;
  /**
   * The small mark beside the intro and every answer — the one piece of the
   * conversation that says whose assistant this is. Drawn as a glyph, not a
   * fill, so unlike `brand` it has to be a plain colour. Defaults to `accent`.
   */
  mark: string;
  /**
   * Quiet fills: what a row goes to on hover, the input, the idle send button.
   * Not the same thing as `bubbleBg` — a site whose visitor messages are black
   * does not want black hovers.
   */
  subtle: string;
  /** The visitor's own messages. */
  bubbleBg: string;
  bubbleFg: string;
  /** Panel and popup corner radius. */
  radius: string;
  /** Buttons, chips, the input. */
  radiusSm: string;
  font: string;
  shadow: string;
  /** Width of the popup, and of the panel on desktop. */
  width: string;
  /** Popup height cap. The panel is always full height. */
  height: string;
  /** Above your own sticky header, below your cookie banner. */
  z: string;
}

export const lightTheme: Theme = {
  bg: "#ffffff",
  fg: "#0a0a0a",
  muted: "#6b6b6b",
  border: "rgba(10, 10, 10, 0.12)",
  accent: "#0a0a0a",
  accentFg: "#ffffff",
  brand: "#0a0a0a",
  brandFg: "#ffffff",
  mark: "#0a0a0a",
  subtle: "#f4f4f4",
  bubbleBg: "#f4f4f4",
  bubbleFg: "#0a0a0a",
  radius: "16px",
  radiusSm: "10px",
  font: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  shadow: "0 12px 40px rgba(0, 0, 0, 0.16)",
  width: "380px",
  height: "540px",
  z: "2147483000",
};

export const darkTheme: Theme = {
  ...lightTheme,
  bg: "#0a0a0a",
  fg: "#fafafa",
  muted: "#8f8f8f",
  border: "rgba(250, 250, 250, 0.16)",
  accent: "#fafafa",
  accentFg: "#0a0a0a",
  brand: "#fafafa",
  brandFg: "#0a0a0a",
  mark: "#fafafa",
  subtle: "#1c1c1c",
  bubbleBg: "#1c1c1c",
  bubbleFg: "#fafafa",
  shadow: "0 12px 40px rgba(0, 0, 0, 0.5)",
};

export interface Appearance {
  launcher: Launcher;
  surface: Surface;
  /** Where the launcher sits. Ignored by `inline`. */
  corner: Corner;
  /** Which edge a `panel` slides from. */
  side: Side;
  /** `auto` follows `prefers-color-scheme`. */
  colorScheme: "light" | "dark" | "auto";
  /** Overrides on top of the scheme's palette. */
  theme?: Partial<Theme>;
  /** Applied on top of `theme` when the visitor is in dark mode. */
  darkTheme?: Partial<Theme>;
  /** Distance from the viewport edges, for `pill` and `bubble`. */
  offset: string;
}

export const defaultAppearance: Appearance = {
  launcher: "pill",
  surface: "popup",
  corner: "bottom-center",
  side: "right",
  colorScheme: "auto",
  offset: "20px",
};

/** Everything the browser half needs. Serialisable — this is what the `<script>` tag reads. */
export interface WidgetConfig {
  /** Where the widget posts. Same-origin by default. */
  endpoint: string;
  /** Shown in the header. */
  name: string;
  /** The line under the name. */
  tagline?: string;
  /** First thing in an empty panel. */
  intro?: string;
  /** Buttons offered before the first question. */
  starters?: string[];
  placeholder?: string;
  /** Label on the `pill` launcher. */
  launcherLabel?: string;
  /** Under the field. Keeps you honest about what the thing is. */
  disclaimer?: string;
  /** Opens the panel from anywhere. `false` turns it off. */
  hotkey?: string | false;
  appearance?: Partial<Appearance>;
  /** Longest question the field accepts. Mirrors the server's own cap. */
  maxLength?: number;
}

const CSS_VAR: Record<keyof Theme, string> = {
  bg: "--ad-bg",
  fg: "--ad-fg",
  muted: "--ad-muted",
  border: "--ad-border",
  accent: "--ad-accent",
  accentFg: "--ad-accent-fg",
  brand: "--ad-brand",
  brandFg: "--ad-brand-fg",
  mark: "--ad-mark",
  subtle: "--ad-subtle",
  bubbleBg: "--ad-bubble-bg",
  bubbleFg: "--ad-bubble-fg",
  radius: "--ad-radius",
  radiusSm: "--ad-radius-sm",
  font: "--ad-font",
  shadow: "--ad-shadow",
  width: "--ad-width",
  height: "--ad-height",
  z: "--ad-z",
};

/**
 * Resolve a palette down to inline custom properties. Written on the widget
 * root rather than on `:root`, so the widget can never repaint the host site.
 */
export function themeToCssVars(
  appearance: Appearance,
  prefersDark: boolean
): Record<string, string> {
  const dark =
    appearance.colorScheme === "dark" ||
    (appearance.colorScheme === "auto" && prefersDark);

  const theme: Theme = {
    ...(dark ? darkTheme : lightTheme),
    ...appearance.theme,
    ...(dark ? appearance.darkTheme : undefined),
  };

  const vars: Record<string, string> = { "--ad-offset": appearance.offset };
  for (const [key, cssVar] of Object.entries(CSS_VAR)) {
    vars[cssVar] = theme[key as keyof Theme];
  }
  return vars;
}
