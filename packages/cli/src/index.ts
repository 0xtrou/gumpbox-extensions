// NOTE: shebang injected by esbuild.config.mjs banner. Don't add one here —
// esbuild preserves source shebangs AND adds the banner, producing a double
// shebang that Node ESM rejects.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(here, "..", "package.json"), "utf8"));

const [cmd, ...args] = process.argv.slice(2);

async function main() {
  switch (cmd) {
    case "set-url":
      return (await import("./set-url.js")).setUrl();
    case "status":
      return (await import("./status.js")).status();
    case "install":
      return (await import("./install.js")).install(args[0] ?? "");
    case "seed-skills":
      return (await import("./seed-skills.js")).seedSkills();
    case undefined:
    case "--help":
    case "-h":
      printHelp();
      return;
    case "--version":
    case "-v":
      console.log(pkg.version);
      return;
    default:
      process.stderr.write(`Unknown command: ${cmd}\n`);
      printHelp();
      process.exit(1);
  }
}

function printHelp() {
  console.log(`gumpbox CLI v${pkg.version}

Usage:
  gumpbox set-url            Configure session URL (interactive prompt)
  gumpbox status             Test connection to gumpbox
  gumpbox install <client>   Install plugin for: vscode | claude-code | codex | gemini
  gumpbox seed-skills        Seed bundled starter skills into gumpbox
  gumpbox --version
  gumpbox --help`);
}

main().catch((err) => {
  process.stderr.write(`gumpbox: error: ${(err as Error).message}\n`);
  process.exit(1);
});
