import { createInterface } from "node:readline/promises";
import {
  MCPClient,
  readSessionConfig,
  writeSessionConfig,
  validateSessionUrl,
  bundledSkills,
  type BundledSkill,
} from "@gumpbox/mcp";
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

type ClientName = "vscode" | "claude-code" | "codex" | "gemini";
const CLIENTS: ClientName[] = ["vscode", "claude-code", "codex", "gemini"];

const [cmd, ...args] = process.argv.slice(2);

async function main(): Promise<void> {
  switch (cmd) {
    case "set-url":
      return setUrl();
    case "status":
      return status();
    case "install":
      return install((args[0] ?? "") as ClientName);
    case "seed-skills":
      return seedSkills();
    case undefined:
    case "--help":
    case "-h":
      printHelp();
      return;
    case "--version":
    case "-v":
      console.log("0.1.1");
      return;
    default:
      process.stderr.write(`Unknown command: ${cmd}\n`);
      printHelp();
      process.exit(1);
  }
}

function printHelp(): void {
  console.log(`gumpbox CLI v0.1.1

Usage:
  gumpbox set-url            Configure session URL (interactive prompt)
  gumpbox status             Test connection to gumpbox
  gumpbox install <client>   Install plugin for: vscode | claude-code | codex | gemini
  gumpbox seed-skills        Seed bundled starter skills into gumpbox
  gumpbox --version
  gumpbox --help`);
}

async function setUrl(): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const url = (
      await rl.question("Paste gumpbox session URL (http://127.0.0.1:7778/global/mcp/<token>):\n> ")
    ).trim();
    const v = validateSessionUrl(url);
    if (!v.valid) {
      process.stderr.write(`Invalid URL: ${v.reason}\n`);
      process.exit(1);
    }
    writeSessionConfig({ sessionUrl: url });
    console.log("Saved to ~/.gumpbox/session.json");
  } finally {
    rl.close();
  }
}

async function status(): Promise<void> {
  const cfg = readSessionConfig();
  if (!cfg) {
    console.log("not configured — run `gumpbox set-url`");
    process.exit(1);
  }
  try {
    const client = new MCPClient(cfg);
    const info = await client.initialize({ name: "gumpbox-cli", version: "0.1.1" });
    console.log(`connected: ${info.name} v${info.version} (protocol ${info.protocolVersion ?? "?"})`);
  } catch (e) {
    console.log(`error: ${(e as Error).message}`);
    process.exit(1);
  }
}

async function seedSkills(): Promise<void> {
  const cfg = readSessionConfig();
  if (!cfg) {
    process.stderr.write("Not configured — run `gumpbox set-url` first.\n");
    process.exit(1);
  }
  const client = new MCPClient(cfg);
  await client.initialize({ name: "gumpbox-cli", version: "0.1.1" });

  const listResult = await client.invokeResourceAction("skills", "list", {});
  const existingNames = new Set<string>();
  const content = (listResult as { content?: Array<{ text?: string }> }).content;
  if (content?.[0]?.text) {
    try {
      const parsed = JSON.parse(content[0].text) as Array<{ name?: string }>;
      for (const s of parsed) if (s.name) existingNames.add(s.name);
    } catch {
      // ignore parse error
    }
  }

  let created = 0;
  let skipped = 0;
  for (const skill of bundledSkills as BundledSkill[]) {
    if (existingNames.has(skill.name)) {
      skipped++;
      continue;
    }
    await client.invokeResourceAction("skills", "create", {
      name: skill.name,
      description: skill.description,
      content: skill.content,
      tags: skill.tags,
    });
    created++;
  }
  console.log(`Seeded ${created} skill(s), skipped ${skipped} existing.`);
}

async function install(arg: ClientName): Promise<void> {
  const client = CLIENTS.find((c) => c === arg);
  if (!client) {
    process.stderr.write(`Unknown client: ${arg}\n`);
    process.stderr.write(`Available: ${CLIENTS.join(", ")}\n`);
    process.exit(1);
  }

  await setUrl();

  const home = homedir();
  switch (client) {
    case "claude-code":
      writeClaudeConfig(home);
      break;
    case "codex":
      writeCodexConfig(home);
      break;
    case "gemini":
      writeGeminiConfig(home);
      break;
    case "vscode":
      console.log(
        "VSCode plugin is distributed as a .vsix from the VSCode Marketplace or OpenVSX. See https://github.com/0xtrou/gumpbox-extensions/tree/main/clients/vscode#install",
      );
      break;
  }
  console.log(`Done. Next: install the proxy globally with 'npm install -g @gumpbox/mcp'.`);
}

function proxyCommand(): string {
  return process.platform === "win32" ? "gumpbox-mcp-proxy.cmd" : "gumpbox-mcp-proxy";
}

function writeClaudeConfig(home: string): void {
  const dir = join(home, ".claude", "mcp-servers");
  mkdirSync(dir, { recursive: true });
  const config = {
    mcpServers: {
      gumpbox: {
        command: proxyCommand(),
        args: [],
      },
    },
  };
  writeFileSync(join(dir, "gumpbox.json"), JSON.stringify(config, null, 2), "utf8");
  console.log(`Wrote ${join(dir, "gumpbox.json")}`);
}

function writeCodexConfig(home: string): void {
  const dir = join(home, ".codex");
  mkdirSync(dir, { recursive: true });
  const toml = `# Added by gumpbox CLI\n[mcp_servers.gumpbox]\ncommand = "${proxyCommand()}"\nargs = []\n`;
  const path = join(dir, "config.toml");
  if (existsSync(path)) {
    const prev = readFileSync(path, "utf8");
    if (!prev.includes("[mcp_servers.gumpbox]")) {
      appendFileSync(path, "\n" + toml);
      console.log(`Appended to ${path}`);
    } else {
      console.log(`${path} already has gumpbox entry — skipping`);
    }
  } else {
    writeFileSync(path, toml, "utf8");
    console.log(`Wrote ${path}`);
  }
}

function writeGeminiConfig(home: string): void {
  const dir = join(home, ".gemini");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "settings.json");
  const entry = { command: proxyCommand(), args: [] };
  if (existsSync(path)) {
    const prev = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    const prevServers = (prev.mcpServers as Record<string, unknown>) ?? {};
    if (prevServers.gumpbox) {
      console.log(`${path} already has gumpbox entry — skipping`);
      return;
    }
    const merged = {
      ...prev,
      mcpServers: { ...prevServers, gumpbox: entry },
    };
    writeFileSync(path, JSON.stringify(merged, null, 2), "utf8");
    console.log(`Merged gumpbox entry into ${path}`);
  } else {
    const config = { mcpServers: { gumpbox: entry } };
    writeFileSync(path, JSON.stringify(config, null, 2), "utf8");
    console.log(`Wrote ${path}`);
  }
}

main().catch((err: unknown) => {
  process.stderr.write(`gumpbox: error: ${(err as Error).message}\n`);
  process.exit(1);
});
