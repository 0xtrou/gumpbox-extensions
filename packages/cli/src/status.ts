import { MCPClient, readSessionConfig } from "@gumpbox/core";

export async function status(): Promise<void> {
  const cfg = await readSessionConfig();
  if (!cfg) {
    console.log("not configured — run `gumpbox set-url`");
    process.exit(1);
  }
  try {
    const client = new MCPClient(cfg);
    const info = await client.initialize({ name: "gumpbox-cli", version: "0.0.0" });
    console.log(`connected: ${info.name} v${info.version} (protocol ${info.protocolVersion ?? "?"})`);
  } catch (e) {
    console.log(`error: ${(e as Error).message}`);
    process.exit(1);
  }
}
