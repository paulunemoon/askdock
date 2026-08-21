import { build } from "esbuild";
import { gzipSync } from "node:zlib";
import { readFileSync } from "node:fs";

/**
 * The embed is the React widget compiled against Preact.
 *
 * One UI to maintain, and a bundle small enough to drop on a marketing site
 * without a conversation about it — React and ReactDOM together would be
 * ~45 kB gzipped, Preact is under 5.
 */
const result = await build({
  entryPoints: ["src/index.tsx"],
  outfile: "dist/askdock.js",
  bundle: true,
  format: "iife",
  target: ["es2020"],
  minify: true,
  jsx: "automatic",
  jsxImportSource: "preact",
  alias: {
    react: "preact/compat",
    "react-dom": "preact/compat",
    "react/jsx-runtime": "preact/jsx-runtime",
  },
  metafile: true,
  legalComments: "none",
});

const bytes = gzipSync(readFileSync("dist/askdock.js")).length;
console.log(`dist/askdock.js — ${(bytes / 1024).toFixed(1)} kB gzipped`);

if (process.env.ANALYZE) {
  const { analyzeMetafile } = await import("esbuild");
  console.log(await analyzeMetafile(result.metafile));
}
