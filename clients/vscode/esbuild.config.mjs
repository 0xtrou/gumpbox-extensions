import * as esbuild from "esbuild";
import { copyFileSync, readdirSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes("--watch");
const prod = process.argv.includes("--production");

// BUGFIX(plan): @gumpbox/skills uses `import.meta.url` to locate its .md files.
// When bundled into a CJS extension, import.meta.url is empty AND the .md files
// aren't shipped next to the bundle. Fix: (1) banner-alias import.meta.url to
// the bundled extension's file URL so dirname() resolves to ./dist, and (2)
// copy the .md files into ./dist so they're where the loader expects.
const skillsSrcDir = join(here, "..", "..", "packages", "skills", "src");

// esbuild rewriting import.meta.url to {} in a CJS bundle would break
// @gumpbox/skills' loader. Use define to substitute a require-time expression
// that resolves to the bundled file's URL. (Banner also works but define
// avoids the empty-import-meta warning.)
const importMetaUrlExpr = "require('url').pathToFileURL(__filename).href";

const ctxOptions = {
  entryPoints: ["src/extension.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  outfile: "dist/extension.js",
  external: ["vscode"],
  minify: !!prod,
  sourcemap: !prod,
  logLevel: "info",
  define: {
    "import.meta.url": JSON.stringify(importMetaUrlExpr),
  },
};

function copySkillMds() {
  mkdirSync(join(here, "dist"), { recursive: true });
  for (const f of readdirSync(skillsSrcDir)) {
    if (f.endsWith(".md")) {
      copyFileSync(join(skillsSrcDir, f), join(here, "dist", f));
    }
  }
}

if (watch) {
  const ctx = await esbuild.context(ctxOptions);
  await ctx.watch();
} else {
  await esbuild.build(ctxOptions);
  copySkillMds();
  // bundle the proxy too so the extension is self-contained.
  // CJS so node doesn't complain about missing "type": "module" in
  // the extension's package.json when spawning the bin directly.
  await esbuild.build({
    entryPoints: ["../../packages/proxy/src/main.ts"],
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node20",
    outfile: "bin/mcp-proxy.js",
    banner: { js: "#!/usr/bin/env node" },
    minify: !!prod,
    sourcemap: false,
  });
}
