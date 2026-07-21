import { readSessionConfig, MCPClient } from "@gumpbox/mcp";

// build a fresh MCPClient from the on-disk session.json. throws if not configured.
export async function getClient(): Promise<MCPClient> {
  const cfg = await readSessionConfig();
  if (!cfg) {
    throw new Error("Session URL not configured. Run 'Gumpbox: Set Session URL'.");
  }
  const client = new MCPClient(cfg);
  await client.initialize({ name: "vscode-gumpbox", version: "0.0.0" });
  return client;
}

export function renderMarkdownShell(title: string, bodyHtml: string, nonce: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <style nonce="${nonce}">
    body { font-family: var(--vscode-font-family); padding: 1rem; color: var(--vscode-foreground); }
    h1, h2 { color: var(--vscode-foreground); }
    pre { background: var(--vscode-textCodeBlock-background); padding: 0.5rem; border-radius: 4px; overflow-x: auto; }
    code { background: var(--vscode-textCodeBlock-background); padding: 0.1rem 0.3rem; border-radius: 2px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid var(--vscode-panel-border); padding: 0.3rem 0.5rem; text-align: left; }
    .skill-card { border: 1px solid var(--vscode-panel-border); padding: 0.75rem; margin: 0.5rem 0; border-radius: 4px; cursor: pointer; }
    .skill-card:hover { background: var(--vscode-list-hoverBackground); }
    .tag { display: inline-block; padding: 0.1rem 0.4rem; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); border-radius: 8px; font-size: 0.75rem; margin-right: 0.25rem; }
    .error { color: var(--vscode-errorForeground); }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${bodyHtml}
</body>
</html>`;
}

export function renderError(message: string, nonce: string): string {
  return renderMarkdownShell("Error", `<p class="error">${escapeHtml(message)}</p>`, nonce);
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

// 32-char random nonce for CSP. not crypto-secure, fine for CSP usage.
export function getNonce(): string {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
}
