import { defineConfig } from "tsup";

// Two builds: the library, and the binary that needs a shebang.
export default defineConfig([
  { entry: ["src/index.ts"], format: ["esm"], dts: true, clean: true, target: "es2022" },
  { entry: ["src/cli.ts"], format: ["esm"], target: "es2022", banner: { js: "#!/usr/bin/env node" } },
]);
