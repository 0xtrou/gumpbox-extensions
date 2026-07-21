// NOTE: shebang injected by esbuild.config.mjs banner. Don't add one here —
// esbuild preserves source shebangs AND adds the banner, producing a double
// shebang that Node ESM rejects.
import { runStdioProxy, readSessionConfig } from "@gumpbox/core";

const clientName = process.env.GUMPBOX_CLIENT_NAME ?? "gumpbox-mcp-proxy";
const clientVersion = process.env.GUMPBOX_CLIENT_VERSION ?? "0.0.0";

process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));

runStdioProxy({
  clientName,
  clientVersion,
  getSessionConfig: () => readSessionConfig(),
}).catch((err) => {
  process.stderr.write(`gumpbox-mcp-proxy: fatal: ${(err as Error).message}\n`);
  process.exit(1);
});
