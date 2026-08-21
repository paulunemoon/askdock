import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import assert from "node:assert/strict";

/**
 * The embed is the one artefact people paste without reading, so it gets a
 * test: does the bundle mount, does it read its attributes, and does the
 * launcher come out the shape the attributes asked for.
 */
const bundle = readFileSync(new URL("../dist/askdock.js", import.meta.url), "utf8");

const dom = new JSDOM(
  `<!doctype html><html><body>
     <script
       data-endpoint="/api/askdock"
       data-name="Acme AI"
       data-launcher="bubble"
       data-surface="panel"
       data-side="left"
       data-accent="#1a56db"
       data-starters="One|Two"
     ></script>
   </body></html>`,
  { runScripts: "outside-only", pretendToBeVisual: true }
);

const { window } = dom;
window.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {} });

// jsdom parses asynchronously; a real page runs the deferred script after this.
await new Promise((resolve) =>
  window.document.readyState === "loading"
    ? window.addEventListener("DOMContentLoaded", resolve, { once: true })
    : resolve()
);

window.eval(bundle);

const root = window.document.querySelector(".ad-root");
assert.ok(root, "the widget never mounted");
assert.equal(root.dataset.launcher, "bubble", "data-launcher was not read");
assert.equal(root.dataset.surface, "panel", "data-surface was not read");
assert.equal(root.dataset.side, "left", "data-side was not read");
assert.equal(root.style.getPropertyValue("--ad-accent"), "#1a56db", "data-accent was not read");
assert.ok(window.document.querySelector(".ad-bubble"), "no bubble launcher rendered");
assert.ok(window.document.getElementById("askdock-styles"), "styles were not injected");

// Opening the panel has to reveal the field and the starters from the attribute.
window.document.querySelector(".ad-bubble").click();
await new Promise((resolve) => window.setTimeout(resolve, 0));

assert.ok(window.document.querySelector(".ad-field input"), "no input after opening");
const starters = [...window.document.querySelectorAll(".ad-starter")].map((b) => b.textContent);
assert.equal(starters.length, 2, `expected 2 starters, got ${starters.length}`);

console.log("embed smoke test passed — mounts, reads attributes, opens");
