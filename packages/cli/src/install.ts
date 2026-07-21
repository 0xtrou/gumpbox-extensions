import { writeFileSync, mkdirSync, existsSync, copyFileSync, readFileSync, appendFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { setUrl } from "./set-url.js";

type Client = "vscode" | "claude-code" | "codex" | "gemini";
const clients: Client[] = ["vscode", "claude-code", "codex", "gemini"];

const here = dirname(fileURLToPath(import.meta.url));

export async function install(arg: string): Promise<void> {
  const client = clients.find((c) => c === arg);
  if (!client) {
    process.stderr.write(`Unknown client: ${arg}\n`);
    process.stderr.write(`Available: ${clients.join(", ")}\n`);
    process.exit(1);
  }

  // Always prompt for URL (idempotent — overwrites if user pastes new one).
  await setUrl();

  // Each client writes its native config referencing the global proxy binary.
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
      console.log("VSCode plugin is distributed as a .vsix from the VSCode Marketplace or OpenVSX. See https://github.com/0xtrou/gumpbox-extensions/tree/main/clients/vscode#install");
      break;
  }
  console.log(`Done. Next: install the proxy globally with 'npm install -g @gumpbox/mcp-proxy'.`);
}

function proxyCommand(): string {
  // On Windows, the bin shim ends in .cmd
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
  // Codex reads ~/.codex/config.toml
  const toml = `# Added by gumpbox CLI
[mcp_servers.gumpbox]
command = "${proxyCommand()}"
args = []
`;
  const existing = existsSync(join(dir, "config.toml"));
  if (existing) {
    const path = join(dir, "config.toml");
    const prev = readFileSync(path, "utf8");
    if (!prev.includes("[mcp_servers.gumpbox]")) {
      appendFileSync(path, "\n" + toml);
      console.log(`Appended to ${path}`);
    } else {
      console.log(`${path} already has gumpbox entry — skipping`);
    }
  } else {
    writeFileSync(join(dir, "config.toml"), toml, "utf8");
    console.log(`Wrote ${join(dir, "config.toml")}`);
  }
}

function writeGeminiConfig(home: string): void {
  const dir = join(home, ".gemini");
  mkdirSync(dir, { recursive: true });
  const config = {
    mcpServers: {
      gumpbox: {
        command: proxyCommand(),
        args: [],
      },
    },
  };
  const path = join(dir, "settings.json");
  if (existsSync(path)) {
    // Merge: read, inject mcpServers.gumpbox, write back
    const prev = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    const merged = {
      ...prev,
      mcpServers: {
        ...((prev.mcpServers as Record<string, unknown>) ?? {}),
        gumpbox: config.mcpServers.gumpbox,
      },
    };
    writeFileSync(path, JSON.stringify(merged, null, 2), "utf8");
    console.log(`Merged gumpbox entry into ${path}`);
  } else {
    writeFileSync(path, JSON.stringify(config, null, 2), "utf8");
    console.log(`Wrote ${path}`);
  }
}
