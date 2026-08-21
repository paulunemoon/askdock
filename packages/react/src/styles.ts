/**
 * Shipped as a string rather than a `.css` file so the widget works the same
 * in a Next app, a Vite app and the `<script>` embed — no bundler config, no
 * import order to get wrong. Injected once per document.
 *
 * Every rule is scoped under `.ad-root`, and every colour reads a custom
 * property set inline on that element. The widget can't repaint the host site,
 * and the host site's reset can't flatten the widget.
 */
export const CSS = String.raw`
.ad-root {
  position: fixed;
  z-index: var(--ad-z);
  font-family: var(--ad-font);
  font-size: 14px;
  line-height: 1.55;
  color: var(--ad-fg);
  -webkit-font-smoothing: antialiased;
}
:where(.ad-root) :where(*, *::before, *::after) { box-sizing: border-box; }
:where(.ad-root) :where(button) { font: inherit; color: inherit; cursor: pointer; border: 0; background: none; }
.ad-root :focus-visible:not(input) { outline: 2px solid var(--ad-accent); outline-offset: 2px; }

/* ---------------------------------------------------------------- placing */

.ad-root[data-corner="bottom-right"]  { inset: auto var(--ad-offset) var(--ad-offset) auto; }
.ad-root[data-corner="bottom-left"]   { inset: auto auto var(--ad-offset) var(--ad-offset); }
.ad-root[data-corner="bottom-center"] { inset: auto 0 var(--ad-offset) 0; display: flex; justify-content: center; pointer-events: none; }
.ad-root[data-corner="bottom-center"] > * { pointer-events: auto; }

.ad-root[data-surface="panel"][data-open="true"] { inset: 0 auto 0 auto; }
.ad-root[data-surface="panel"][data-side="right"][data-open="true"] { right: 0; }
.ad-root[data-surface="panel"][data-side="left"][data-open="true"]  { left: 0; }

.ad-root[data-launcher="inline"], .ad-root[data-surface="inline"] {
  position: relative; inset: auto; z-index: auto; display: block;
}

/* -------------------------------------------------------------- launchers */

.ad-pill, .ad-bubble {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--ad-bg);
  border: 1px solid var(--ad-border);
  box-shadow: var(--ad-shadow);
  transition: transform .18s ease, box-shadow .18s ease;
}
.ad-pill:hover, .ad-bubble:hover { transform: translateY(-2px); }
.ad-pill:active, .ad-bubble:active { transform: translateY(0); }

.ad-pill { padding: 10px 12px 10px 14px; border-radius: 999px; max-width: min(92vw, 420px); }
.ad-pill-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ad-kbd {
  font: inherit; font-size: 11px; padding: 2px 5px; border-radius: 5px;
  color: var(--ad-muted); border: 1px solid var(--ad-border);
}
@media (max-width: 520px) { .ad-kbd { display: none; } }

.ad-bubble {
  width: 52px; height: 52px; border-radius: 50%;
  justify-content: center;
  background: var(--ad-accent); color: var(--ad-accent-fg); border-color: transparent;
}

/* ---------------------------------------------------------------- surface */

.ad-surface {
  display: flex;
  flex-direction: column;
  background: var(--ad-bg);
  border: 1px solid var(--ad-border);
  box-shadow: var(--ad-shadow);
  overflow: hidden;
}
.ad-root[data-surface="popup"] .ad-surface {
  width: min(92vw, var(--ad-width));
  height: min(78vh, var(--ad-height));
  border-radius: var(--ad-radius);
  animation: ad-rise .22s cubic-bezier(.2, .8, .3, 1);
}
.ad-root[data-surface="panel"] .ad-surface {
  width: min(100vw, var(--ad-width));
  height: 100dvh;
  border-radius: 0;
  border-block: 0;
  animation: ad-slide .24s cubic-bezier(.2, .8, .3, 1);
}
.ad-root[data-surface="panel"][data-side="right"] .ad-surface { border-right: 0; }
.ad-root[data-surface="panel"][data-side="left"]  .ad-surface { border-left: 0; }
.ad-root[data-surface="inline"] .ad-surface {
  width: 100%; height: 100%; min-height: var(--ad-height); border-radius: var(--ad-radius);
}

@keyframes ad-rise  { from { opacity: 0; transform: translateY(8px) scale(.98); } }
@keyframes ad-slide { from { transform: translateX(var(--ad-slide-from, 100%)); } }
.ad-root[data-side="left"] .ad-surface { --ad-slide-from: -100%; }
@media (prefers-reduced-motion: reduce) { .ad-surface { animation: none; } }

/* ----------------------------------------------------------------- header */

.ad-head {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 12px 12px 14px;
  border-bottom: 1px solid var(--ad-border);
}
.ad-avatar {
  display: grid; place-items: center;
  width: 26px; height: 26px; border-radius: 50%; flex: none;
  background: var(--ad-brand); color: var(--ad-brand-fg);
}
.ad-head-text { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.ad-head-text strong { font-size: 13px; font-weight: 600; }
.ad-head-text span { font-size: 11.5px; color: var(--ad-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ad-close {
  display: grid; place-items: center; width: 28px; height: 28px; flex: none;
  border-radius: var(--ad-radius-sm); color: var(--ad-muted);
}
.ad-close:hover { background: var(--ad-subtle); color: var(--ad-fg); }

/* -------------------------------------------------------------------- log */

.ad-log { flex: 1; overflow-y: auto; overscroll-behavior: contain; padding: 16px 14px; display: flex; flex-direction: column; gap: 14px; }
.ad-intro { display: flex; gap: 8px; margin: 0; color: var(--ad-fg); }
.ad-intro > svg { flex: none; margin-top: 4px; color: var(--ad-mark); }
.ad-try { margin: 4px 0 0; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: var(--ad-muted); }
.ad-starters { display: flex; flex-direction: column; gap: 6px; }
.ad-starter {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 9px 11px; text-align: left;
  border: 1px solid var(--ad-border); border-radius: var(--ad-radius-sm);
  color: var(--ad-fg); transition: background .15s ease;
}
.ad-starter:hover { background: var(--ad-subtle); }
.ad-starter > svg { flex: none; color: var(--ad-muted); }

.ad-from-user {
  align-self: flex-end; max-width: 85%; margin: 0;
  padding: 8px 12px; border-radius: var(--ad-radius-sm);
  background: var(--ad-bubble-bg); color: var(--ad-bubble-fg);
}
.ad-from-ai { display: flex; gap: 8px; }
.ad-from-ai > svg { flex: none; margin-top: 4px; color: var(--ad-mark); }
.ad-from-ai > div { min-width: 0; flex: 1; }

.ad-answer p, .ad-answer ul { margin: 0 0 8px; }
.ad-answer > :last-child { margin-bottom: 0; }
.ad-answer ul { padding-left: 18px; }
.ad-answer li { margin-bottom: 3px; }
.ad-answer strong { font-weight: 600; }

.ad-link {
  display: inline-flex; align-items: baseline; gap: 2px;
  color: inherit; text-decoration: underline; text-underline-offset: 2px;
  text-decoration-color: var(--ad-border);
}
.ad-link:hover { text-decoration-color: currentColor; }
.ad-link > svg { align-self: center; }

.ad-caret {
  display: inline-block; width: 2px; height: 1em; margin-left: 2px;
  vertical-align: -2px; background: currentColor; animation: ad-blink 1s steps(2) infinite;
}
@keyframes ad-blink { 50% { opacity: 0; } }

.ad-thinking { margin: 0; color: var(--ad-muted); }
.ad-error { margin: 0; padding: 8px 11px; border-radius: var(--ad-radius-sm); border: 1px solid var(--ad-border); color: var(--ad-muted); }
.ad-stop {
  align-self: flex-start; display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 10px; font-size: 12px; color: var(--ad-muted);
  border: 1px solid var(--ad-border); border-radius: 999px;
}
.ad-stop:hover { color: var(--ad-fg); }

/* -------------------------------------------------------------- citations */

.ad-sources { margin-top: 10px; display: flex; flex-direction: column; gap: 4px; }
.ad-sources-label { margin: 0 0 2px; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: var(--ad-muted); }
.ad-source {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 10px; font-size: 13px; text-decoration: none; color: var(--ad-fg);
  border: 1px solid var(--ad-border); border-radius: var(--ad-radius-sm);
}
.ad-source:hover { background: var(--ad-subtle); }
.ad-source > span:first-child { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ad-source-kind { font-size: 11px; color: var(--ad-muted); flex: none; }
.ad-source > svg { flex: none; color: var(--ad-muted); }

/* ------------------------------------------------------------------ field */

.ad-field {
  display: flex; align-items: center; gap: 8px; margin: 0 14px;
  padding: 6px 6px 6px 12px;
  background: var(--ad-subtle);
  border: 1px solid var(--ad-border); border-radius: 999px;
}
/* The field is the focus indicator: it lifts to the panel background and its
   hairline darkens. The input inside must not draw a second ring — an
   accent-coloured rectangle inside a rounded field reads as a rendering bug. */
.ad-field:focus-within { background: var(--ad-bg); border-color: var(--ad-muted); }
.ad-field input:focus-visible { outline: none; }
.ad-field input {
  flex: 1; min-width: 0; border: 0; background: none; outline: none;
  font: inherit; color: var(--ad-fg); padding: 4px 0;
}
.ad-field input::placeholder { color: var(--ad-muted); }
.ad-send {
  display: grid; place-items: center; width: 30px; height: 30px; flex: none;
  border-radius: 50%; background: var(--ad-border); color: var(--ad-muted);
  transition: background .15s ease, color .15s ease;
}
.ad-send[data-on="true"] { background: var(--ad-brand); color: var(--ad-brand-fg); }
.ad-send:disabled { cursor: default; }

.ad-disclaimer { margin: 10px 14px 12px; font-size: 11px; text-align: center; color: var(--ad-muted); }
.ad-disclaimer a { color: inherit; }

/* Panels own the whole side of the screen; on a phone they own the screen. */
@media (max-width: 480px) {
  .ad-root[data-surface="panel"] .ad-surface { width: 100vw; }
  .ad-root[data-surface="popup"] .ad-surface { height: min(84vh, var(--ad-height)); }
}
`;

const STYLE_ID = "askdock-styles";

/** Idempotent: many widgets on a page, one `<style>`. */
export function injectStyles(doc: Document = document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  doc.head.appendChild(style);
}
