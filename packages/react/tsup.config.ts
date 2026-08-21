import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  target: "es2022",
  external: ["react", "react-dom"],
  // "use client" has to survive the bundle or the Next App Router rejects it.
  banner: { js: '"use client";' },
});
