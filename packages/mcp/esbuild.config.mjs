import { build } from "esbuild";

// Bundle the stdio proxy as a single Node bin file.
await build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  outfile: "bin/mcp-proxy.js",
  banner: { js: "#!/usr/bin/env node" },
  minify: true,
  sourcemap: false,
});

console.log("built bin/mcp-proxy.js");
