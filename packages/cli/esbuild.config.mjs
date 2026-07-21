import { build } from "esbuild";

// Bundle the CLI bin as a single Node file. Library code (index.ts) is built by tsc
// and shipped separately as dist/*.js for `import { MCPClient } from "@gumpbox/cli"`.
await build({
  entryPoints: ["src/bin.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  outfile: "bin/gumpbox.js",
  banner: { js: "#!/usr/bin/env node" },
  minify: true,
  sourcemap: false,
});

console.log("built bin/gumpbox.js");
