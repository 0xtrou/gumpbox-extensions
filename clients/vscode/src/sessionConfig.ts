import * as vscode from "vscode";
import { writeSessionConfig, validateSessionUrl } from "@gumpbox/mcp";

const SECRET_KEY = "gumpbox.sessionUrl";

export class SessionConfigManager {
  constructor(
    private readonly secrets: vscode.SecretStorage,
    private readonly config: vscode.WorkspaceConfiguration,
  ) {}

  async getUrl(): Promise<string | undefined> {
    const fromSecret = await this.secrets.get(SECRET_KEY);
    if (fromSecret) return fromSecret;
    const fromConfig = this.config.get<string>("sessionUrl");
    return fromConfig || undefined;
  }

  async setUrl(): Promise<void> {
    const input = await vscode.window.showInputBox({
      prompt: "Paste gumpbox session URL",
      placeHolder: "http://127.0.0.1:7778/global/mcp/<token>",
      validateInput: (v) => {
        const r = validateSessionUrl(v);
        return r.valid ? undefined : r.reason;
      },
    });
    if (!input) return;
    await this.secrets.store(SECRET_KEY, input);
    await writeSessionConfig({ sessionUrl: input });
    void vscode.commands.executeCommand("gumpbox.testConnection");
  }

  // pull URL outta secret store, write to ~/.gumpbox/session.json so proxy can read it
  async syncToProxyFile(): Promise<void> {
    const url = await this.getUrl();
    if (!url) return;
    const v = validateSessionUrl(url);
    if (!v.valid) return;
    await writeSessionConfig({ sessionUrl: url });
  }
}
