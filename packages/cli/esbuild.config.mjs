import { build } from "esbuild";

// Bundle the CLI as a single Node bin. @gumpbox/mcp is bundled in — zero runtime deps to install
// beyond @gumpbox/mcp itself, which is fine because npm installs it transitively.
await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  outfile: "bin/gumpbox.js",
  banner: { js: "#!/usr/bin/env node" },
  minify: true,
  sourcemap: false,
  // Mark @gumpbox/mcp as external so it resolves from node_modules at runtime.
  external: ["@gumpbox/mcp"],
});

console.log("built bin/gumpbox.js");
