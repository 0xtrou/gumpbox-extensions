import { createInterface } from "node:readline/promises";
import { writeSessionConfig, validateSessionUrl } from "@gumpbox/core";

export async function setUrl(): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const url = (await rl.question("Paste gumpbox session URL (http://127.0.0.1:7778/global/mcp/<token>):\n> ")).trim();
    const v = validateSessionUrl(url);
    if (!v.valid) {
      process.stderr.write(`Invalid URL: ${v.reason}\n`);
      process.exit(1);
    }
    await writeSessionConfig({ sessionUrl: url });
    console.log("Saved to ~/.gumpbox/session.json");
  } finally {
    rl.close();
  }
}
