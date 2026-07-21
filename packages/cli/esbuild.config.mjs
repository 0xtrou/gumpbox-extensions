import { build } from "esbuild";

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
});

console.log("built bin/gumpbox.js");
