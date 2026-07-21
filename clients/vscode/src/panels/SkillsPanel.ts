import * as vscode from "vscode";
import { getClient, renderMarkdownShell, renderError, escapeHtml, getNonce } from "./panelUtils";

export async function openSkillsPanel(context: vscode.ExtensionContext): Promise<void> {
  const panel = vscode.window.createWebviewPanel(
    "gumpboxSkills",
    "Gumpbox Skills",
    vscode.ViewColumn.One,
    { enableScripts: true },
  );
  const nonce = getNonce();

  panel.webview.html = renderMarkdownShell("Skills", "<p>Loading…</p>", nonce);

  try {
    const client = await getClient();
    const result = await client.invokeResourceAction("skills", "list", {});
    const text = (result as { content?: Array<{ text?: string }> }).content?.[0]?.text ?? "[]";
    const skills = JSON.parse(text) as Array<{ name: string; description?: string; tags?: string[] }>;

    if (skills.length === 0) {
      panel.webview.html = renderMarkdownShell(
        "Skills",
        `<p>No skills yet. Run <b>Gumpbox: Seed Starter Skills</b> to install the bundled set.</p>`,
        nonce,
      );
      return;
    }

    const cardsHtml = skills
      .map(
        (s, i) => `
        <div class="skill-card" data-skill-index="${i}">
          <strong>${escapeHtml(s.name)}</strong>
          ${s.description ? `<br><span>${escapeHtml(s.description)}</span>` : ""}
          ${(s.tags ?? []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
        </div>`,
      )
      .join("");

    panel.webview.html = renderMarkdownShell(
      "Skills",
      `${cardsHtml}<div id="skill-detail"></div>
       <script nonce="${nonce}">
         const skills = ${JSON.stringify(skills)};
         document.querySelectorAll('.skill-card').forEach(card => {
           card.addEventListener('click', () => {
             const i = parseInt(card.dataset.skillIndex);
             const detail = document.getElementById('skill-detail');
             detail.innerHTML = '<p>Loading skill…</p>';
             const vscode = acquireVsCodeApi();
             vscode.postMessage({ command: 'getSkillDetail', skillName: skills[i].name });
           });
         });
       </script>`,
      nonce,
    );

    panel.webview.onDidReceiveMessage(
      async (msg: { command?: string; skillName?: string }) => {
        if (msg.command === "getSkillDetail" && msg.skillName) {
          try {
            const detail = await client.invokeResourceAction("skills", "get", { name: msg.skillName });
            const detailText = (detail as { content?: Array<{ text?: string }> }).content?.[0]?.text ?? "{}";
            const skill = JSON.parse(detailText) as { content?: string };
            panel.webview.postMessage({
              command: "skillDetail",
              skillName: msg.skillName,
              content: skill.content ?? "(no content)",
            });
          } catch (e) {
            void vscode.window.showErrorMessage(`Failed to fetch skill: ${(e as Error).message}`);
          }
        }
      },
      undefined,
      context.subscriptions,
    );
  } catch (e) {
    panel.webview.html = renderError((e as Error).message, nonce);
  }
}
