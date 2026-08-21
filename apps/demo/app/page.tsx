"use client";

import { Askdock, type Appearance } from "@askdock/react";
import { useState } from "react";

/**
 * The playground. Every control writes into the same `appearance` object the
 * widget takes, and the snippet under it is generated from that object — so
 * what you copy is exactly what you just looked at.
 */

const ACCENTS = ["#0a0a0a", "#1a56db", "#047857", "#b91c1c", "#7c3aed", "#c2410c"];

const STARTERS = [
  "How do I install it?",
  "Where does my API key live?",
  "Can it use Claude instead of Gemini?",
  "What stops it answering off-topic?",
];

export default function Page() {
  const [appearance, setAppearance] = useState<Appearance>({
    launcher: "pill",
    surface: "popup",
    corner: "bottom-center",
    side: "right",
    colorScheme: "auto",
    offset: "20px",
    theme: {},
  });
  const [tab, setTab] = useState<"react" | "script">("react");
  const [copied, setCopied] = useState(false);

  const set = <K extends keyof Appearance>(key: K, value: Appearance[K]) =>
    setAppearance((prev) => ({ ...prev, [key]: value }));

  const accent = appearance.theme?.accent ?? "#0a0a0a";
  const setAccent = (value: string) =>
    setAppearance((prev) => ({ ...prev, theme: { ...prev.theme, accent: value } }));

  const snippet = tab === "react" ? reactSnippet(appearance) : scriptSnippet(appearance);

  const copy = () => {
    void navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <main>
      <h1>A chat widget that only knows your site.</h1>
      <p className="lead">
        It reads the pages you publish and answers from those, or says it doesn&apos;t know. Any
        model, your own API key, your own content. MIT.
      </p>
      <p className="note">
        The widget on this page is answering from the six markdown files in <code>content/</code>.
        Ask it something off-topic and watch it decline.
      </p>

      <h2>Shape</h2>
      <div className="controls">
        <Segments
          label="Launcher"
          value={appearance.launcher}
          options={["pill", "bubble", "none"]}
          onChange={(v) => set("launcher", v as Appearance["launcher"])}
        />
        <Segments
          label="Opens as"
          value={appearance.surface}
          options={["popup", "panel"]}
          onChange={(v) => set("surface", v as Appearance["surface"])}
        />
        <Segments
          label={appearance.surface === "panel" ? "Panel side" : "Launcher position"}
          value={appearance.surface === "panel" ? appearance.side : appearance.corner}
          options={
            appearance.surface === "panel"
              ? ["left", "right"]
              : ["bottom-left", "bottom-center", "bottom-right"]
          }
          onChange={(v) =>
            appearance.surface === "panel"
              ? set("side", v as Appearance["side"])
              : set("corner", v as Appearance["corner"])
          }
        />
        <Segments
          label="Colour scheme"
          value={appearance.colorScheme}
          options={["light", "dark", "auto"]}
          onChange={(v) => set("colorScheme", v as Appearance["colorScheme"])}
        />
      </div>

      <h2>Accent</h2>
      <div className="swatches">
        {ACCENTS.map((color) => (
          <button
            key={color}
            type="button"
            className="swatch"
            style={{ background: color }}
            aria-pressed={accent === color}
            aria-label={color}
            onClick={() => setAccent(color)}
          />
        ))}
        <input
          type="color"
          value={accent.startsWith("#") ? accent : "#0a0a0a"}
          onChange={(e) => setAccent(e.target.value)}
          aria-label="Custom accent"
        />
        <span className="note">Default is black and white. Nothing else is themed for you.</span>
      </div>

      <h2>Copy this</h2>
      <div className="tabs">
        <button type="button" aria-pressed={tab === "react"} onClick={() => setTab("react")}>
          React
        </button>
        <button type="button" aria-pressed={tab === "script"} onClick={() => setTab("script")}>
          Any site
        </button>
      </div>
      <div className="snippet">
        <button type="button" className="copy" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
        <pre>{snippet}</pre>
      </div>

      <h2>And on the server</h2>
      <pre>{SERVER_SNIPPET}</pre>
      <p className="note">
        That route is the only place a key appears. The widget knows one thing about your
        setup — the URL it posts to.
      </p>

      <Askdock
        endpoint="/api/askdock"
        name="Askdock"
        tagline="Answering from this repo's docs"
        launcherLabel="Ask about Askdock"
        intro="I've read the docs in this repo. Ask me how to install it, where your API key lives, or how it stays on topic."
        starters={STARTERS}
        disclaimer="Answers can be wrong. The source is in content/."
        sections={["docs"]}
        appearance={appearance}
      />
    </main>
  );
}

function Segments({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="control">
      <span>{label}</span>
      <div className="segments">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
          >
            {option.replace("bottom-", "")}
          </button>
        ))}
      </div>
    </label>
  );
}

/* ------------------------------------------------------------- snippets */

/** Only the parts that differ from the defaults — copied code should be short. */
function tidy(appearance: Appearance): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (appearance.launcher !== "pill") out.launcher = appearance.launcher;
  if (appearance.surface !== "popup") out.surface = appearance.surface;
  if (appearance.surface === "panel") {
    if (appearance.side !== "right") out.side = appearance.side;
  } else if (appearance.corner !== "bottom-center") {
    out.corner = appearance.corner;
  }
  if (appearance.colorScheme !== "auto") out.colorScheme = appearance.colorScheme;

  const accent = appearance.theme?.accent;
  if (accent && accent !== "#0a0a0a") out.theme = { accent };
  return out;
}

function reactSnippet(appearance: Appearance): string {
  const settings = tidy(appearance);
  const props = Object.entries(settings)
    .map(([key, value]) => `    ${key}: ${JSON.stringify(value)},`)
    .join("\n");

  return `import { Askdock } from "@askdock/react";

<Askdock
  endpoint="/api/askdock"
  name="Acme AI"${props ? `\n  appearance={{\n${props}\n  }}` : ""}
/>`;
}

function scriptSnippet(appearance: Appearance): string {
  const settings = tidy(appearance);
  const attributes = Object.entries(settings)
    .flatMap(([key, value]) =>
      key === "theme"
        ? Object.entries(value as Record<string, string>).map(
            ([token, color]) => `  data-${token}="${color}"`
          )
        : [`  data-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}="${value}"`]
    )
    .join("\n");

  return `<script
  src="https://unpkg.com/@askdock/embed/dist/askdock.js"
  data-endpoint="https://acme.com/api/askdock"
  data-name="Acme AI"${attributes ? `\n${attributes}` : ""}
  defer
></script>`;
}

const SERVER_SNIPPET = `// app/api/askdock/route.ts
import { createAskdockHandler } from "@askdock/server";
import corpus from "../../../.askdock/corpus.json";

export const POST = createAskdockHandler({
  model: { model: "google/gemini-flash-latest" }, // or anthropic/…, openai/…
  corpus,                                          // npx askdock ingest <your site>
  persona: { name: "Acme AI", fallbackHref: "/contact" },
});`;
