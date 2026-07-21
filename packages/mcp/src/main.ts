import { runStdioProxy, readSessionConfig } from "./index.js";

const clientName = process.env.GUMPBOX_CLIENT_NAME ?? "gumpbox-mcp-proxy";
const clientVersion = process.env.GUMPBOX_CLIENT_VERSION ?? "0.1.0";

process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));

runStdioProxy({
  clientName,
  clientVersion,
  getSessionConfig: () => readSessionConfig(),
}).catch((err: unknown) => {
  process.stderr.write(`gumpbox-mcp-proxy: fatal: ${(err as Error).message}\n`);
  process.exit(1);
});
