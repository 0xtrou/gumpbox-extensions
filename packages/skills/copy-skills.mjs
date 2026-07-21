// Copy markdown skill files from src/ to dist/ so import.meta.url
// resolves them at runtime. tsc emits only .js files.
import { cpSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
mkdirSync(join(here, "dist"), { recursive: true });
// BUGFIX(plan): original filter `src.endsWith(".md") || src.endsWith("/")`
// never matched on POSIX because cpSync passes paths without trailing slash.
// Directories failed the filter, so recursion never descended into src/.
// Use statSync to allow directories through.
cpSync(join(here, "src"), join(here, "dist"), {
  recursive: true,
  filter: (src) => {
    if (statSync(src).isDirectory()) return true;
    return src.endsWith(".md");
  },
});
console.log("copied *.md to dist/");
