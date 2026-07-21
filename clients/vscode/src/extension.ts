import * as vscode from "vscode";
import { join } from "node:path";
import { SessionConfigManager } from "./sessionConfig";
import { McpProxyProcess } from "./mcpServer";
import { readSessionConfig, MCPClient } from "@gumpbox/core";
import { bundledSkills } from "@gumpbox/skills";
import { openSkillsPanel } from "./panels/SkillsPanel";
import { openReadmePanel } from "./panels/ReadmePanel";
import { openActivityPanel } from "./panels/ActivityPanel";

let statusBarItem: vscode.StatusBarItem;
let sessionManager: SessionConfigManager;
let proxyProcess: McpProxyProcess;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const config = vscode.workspace.getConfiguration("gumpbox");
  sessionManager = new SessionConfigManager(context.secrets, config);

  // prefer bundled bin if installed via .vsix, else fall back to globally-installed
  const ext = vscode.extensions.getExtension("gumpbox.gumpbox-mcp");
  const proxyBinPath = ext
    ? join(ext.extensionPath, "bin", "mcp-proxy.js")
    : "gumpbox-mcp-proxy";
  proxyProcess = new McpProxyProcess(proxyBinPath);

  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = "gumpbox.setSessionUrl";
  context.subscriptions.push(statusBarItem);

  await sessionManager.syncToProxyFile();
  await refreshStatus();

  context.subscriptions.push(
    vscode.commands.registerCommand("gumpbox.setSessionUrl", async () => {
      await sessionManager.setUrl();
      await refreshStatus();
    }),
    vscode.commands.registerCommand("gumpbox.testConnection", async () => {
      await testConnection();
      await refreshStatus();
    }),
    vscode.commands.registerCommand("gumpbox.browseSkills", () => openSkillsPanel(context)),
    vscode.commands.registerCommand("gumpbox.showReadme", () => openReadmePanel(context)),
    vscode.commands.registerCommand("gumpbox.showActivity", () => openActivityPanel(context)),
    vscode.commands.registerCommand("gumpbox.seedSkills", async () => {
      await seedSkills();
    }),
  );

  // fire up proxy so MCP-aware hosts can talk to it immediately
  proxyProcess.start();
}

export function deactivate(): void {
  proxyProcess?.stop();
}

async function refreshStatus(): Promise<void> {
  const url = await sessionManager.getUrl();
  if (!url) {
    statusBarItem.text = "$(warning) gumpbox: not configured";
    statusBarItem.tooltip = "Click to set session URL";
    statusBarItem.show();
    return;
  }
  const cfg = await readSessionConfig();
  if (!cfg) {
    statusBarItem.text = "$(warning) gumpbox: misconfigured";
    statusBarItem.tooltip = "session.json missing or invalid";
    statusBarItem.show();
    return;
  }
  statusBarItem.text = "$(circle-filled) gumpbox: connected";
  statusBarItem.tooltip = `Session: ${cfg.sessionUrl.replace(/\/[^/]+$/, "/***")}`;
  statusBarItem.show();
}

async function testConnection(): Promise<void> {
  const cfg = await readSessionConfig();
  if (!cfg) {
    void vscode.window.showWarningMessage("gumpbox session URL not configured.");
    return;
  }
  try {
    const client = new MCPClient(cfg);
    const info = await client.initialize({ name: "vscode-gumpbox", version: "0.0.0" });
    void vscode.window.showInformationMessage(`gumpbox connected: ${info.name} v${info.version}`);
  } catch (e) {
    void vscode.window.showErrorMessage(`gumpbox connection failed: ${(e as Error).message}`);
  }
}

async function seedSkills(): Promise<void> {
  const cfg = await readSessionConfig();
  if (!cfg) {
    void vscode.window.showWarningMessage("Configure session URL first.");
    return;
  }
  const client = new MCPClient(cfg);
  await client.initialize({ name: "vscode-gumpbox", version: "0.0.0" });

  // fetch existing skill names so seeding is idempotent
  const listResult = await client.invokeResourceAction("skills", "list", {});
  const existingNames = new Set<string>();
  const text = (listResult as { content?: Array<{ text?: string }> }).content?.[0]?.text;
  if (text) {
    try {
      const parsed = JSON.parse(text) as Array<{ name?: string }>;
      for (const s of parsed) if (s.name) existingNames.add(s.name);
    } catch {
      // noop — list returned non-JSON, just seed everything
    }
  }

  let created = 0;
  let skipped = 0;
  for (const skill of bundledSkills) {
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
  void vscode.window.showInformationMessage(`Seeded ${created} skill(s), skipped ${skipped} existing.`);
}
