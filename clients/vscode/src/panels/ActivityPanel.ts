import * as vscode from "vscode";
import { getClient, renderMarkdownShell, renderError, escapeHtml, getNonce } from "./panelUtils";

export async function openActivityPanel(_context: vscode.ExtensionContext): Promise<void> {
  const panel = vscode.window.createWebviewPanel(
    "gumpboxActivity",
    "Gumpbox Activity",
    vscode.ViewColumn.One,
    { enableScripts: false },
  );
  const nonce = getNonce();

  try {
    const client = await getClient();
    const result = await client.invokeResourceAction("activities", "list", {});
    const text = (result as { content?: Array<{ text?: string }> }).content?.[0]?.text ?? "[]";
    const activities = JSON.parse(text) as Array<{
      timestamp?: string;
      resource?: string;
      action?: string;
      status?: string;
      summary?: string;
    }>;

    if (activities.length === 0) {
      panel.webview.html = renderMarkdownShell("Activity", "<p>No activity yet.</p>", nonce);
      return;
    }

    const rows = activities
      .map(
        (a) => `<tr>
          <td>${escapeHtml(a.timestamp ?? "")}</td>
          <td>${escapeHtml(a.resource ?? "")}</td>
          <td>${escapeHtml(a.action ?? "")}</td>
          <td>${escapeHtml(a.status ?? "")}</td>
          <td>${escapeHtml(a.summary ?? "")}</td>
        </tr>`,
      )
      .join("");

    panel.webview.html = renderMarkdownShell(
      "Activity",
      `<table>
        <thead><tr><th>Time</th><th>Resource</th><th>Action</th><th>Status</th><th>Summary</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`,
      nonce,
    );
  } catch (e) {
    panel.webview.html = renderError((e as Error).message, nonce);
  }
}
