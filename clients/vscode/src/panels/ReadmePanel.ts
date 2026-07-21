import * as vscode from "vscode";
import { getClient, renderMarkdownShell, renderError, getNonce } from "./panelUtils";

export async function openReadmePanel(_context: vscode.ExtensionContext): Promise<void> {
  const panel = vscode.window.createWebviewPanel(
    "gumpboxReadme",
    "Gumpbox Readme",
    vscode.ViewColumn.One,
    { enableScripts: false },
  );
  const nonce = getNonce();

  try {
    const client = await getClient();
    const result = await client.invokeResourceAction("readme", "get", {});
    const text = (result as { content?: Array<{ text?: string }> }).content?.[0]?.text ?? "";
    // VSCode Markdown preview isn't available in a webview without bundling markdown-it.
    // For now show raw markdown in <pre>. v2 can integrate markdown-it.
    const escaped = text.replace(/[<>]/g, (c) => ({ "<": "&lt;", ">": "&gt;" }[c]!));
    panel.webview.html = renderMarkdownShell("Gumpbox Readme", `<pre>${escaped}</pre>`, nonce);
  } catch (e) {
    panel.webview.html = renderError((e as Error).message, nonce);
  }
}
