import { Askdock } from "@askdock/react";
import type { Appearance, WidgetConfig } from "@askdock/core";
import { render } from "preact";

/**
 * The `<script>` half.
 *
 *   <script
 *     src="https://unpkg.com/@askdock/embed/dist/askdock.js"
 *     data-endpoint="https://acme.com/api/askdock"
 *     data-name="Acme AI"
 *     data-launcher="bubble"
 *     data-surface="panel"
 *     data-accent="#0a0a0a"
 *     defer
 *   ></script>
 *
 * Everything is a data attribute, because the people who reach for a script
 * tag are usually pasting it into a CMS field with no build step. Anything
 * the attributes can't express — a callback, a header — goes through
 * `window.askdock({...})` instead.
 *
 * No API key here, ever. `data-endpoint` points at a route you host; the key
 * lives in that server's environment. A key in this file would be a key in
 * everyone's browser.
 */

type Config = Partial<WidgetConfig> & { mount?: string };

const CONTAINER_ID = "askdock-root";

/** `data-launcher-label` → `launcherLabel`. */
function camel(name: string): string {
  return name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

function readAttributes(script: HTMLScriptElement | null): Config {
  if (!script) return {};

  const flat: Record<string, string> = {};
  for (const { name, value } of Array.from(script.attributes)) {
    if (name.startsWith("data-")) flat[camel(name.slice(5))] = value;
  }

  const appearance: Partial<Appearance> = {};
  const theme: Record<string, string> = {};

  // Appearance keys are flat in HTML and nested in the config object.
  const APPEARANCE = ["launcher", "surface", "corner", "side", "colorScheme", "offset"] as const;
  const THEME = [
    "bg", "fg", "muted", "border", "accent", "accentFg", "bubbleBg", "bubbleFg",
    "radius", "radiusSm", "font", "shadow", "width", "height", "z",
  ];

  const config: Config = {};

  for (const [key, value] of Object.entries(flat)) {
    if ((APPEARANCE as readonly string[]).includes(key)) {
      (appearance as Record<string, string>)[key] = value;
    } else if (THEME.includes(key)) {
      theme[key] = value;
    } else if (key === "starters") {
      config.starters = value.split("|").map((s) => s.trim()).filter(Boolean);
    } else if (key === "hotkey") {
      config.hotkey = value === "false" || value === "" ? false : value;
    } else if (key === "maxLength") {
      config.maxLength = Number(value) || undefined;
    } else {
      (config as Record<string, unknown>)[key] = value;
    }
  }

  if (Object.keys(theme).length > 0) appearance.theme = theme as Appearance["theme"];
  if (Object.keys(appearance).length > 0) config.appearance = appearance;

  return config;
}

function mount(config: Config): void {
  const target =
    (config.mount ? document.querySelector(config.mount) : null) ??
    document.getElementById(CONTAINER_ID) ??
    Object.assign(document.createElement("div"), { id: CONTAINER_ID });

  if (!target.isConnected) document.body.appendChild(target);

  if (!config.endpoint) {
    console.warn("[askdock] no data-endpoint — the widget has nowhere to ask.");
  }

  render(<Askdock {...(config as Parameters<typeof Askdock>[0])} />, target);
}

const script =
  (document.currentScript as HTMLScriptElement | null) ??
  document.querySelector<HTMLScriptElement>("script[data-endpoint]");

const fromAttributes = readAttributes(script);

/** Called again later, it re-renders in place — handy for a live theme editor. */
const api = (overrides: Config = {}) => mount({ ...fromAttributes, ...overrides });
(window as unknown as { askdock: typeof api }).askdock = api;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => api(), { once: true });
} else {
  api();
}
