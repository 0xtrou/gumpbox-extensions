# gumpbox for Gemini

Connect Google Gemini CLI / Gemini Code Assist to the gumpbox app via MCP.

## Install

### macOS / Linux

```bash
curl -fsSL https://raw.githubusercontent.com/0xtrou/gumpbox-extensions/main/clients/gemini/install.sh | bash
```

### Windows (PowerShell)

```powershell
irm https://raw.githubusercontent.com/0xtrou/gumpbox-extensions/main/clients/gemini/install.ps1 | iex
```

## What it does

- Installs `@gumpbox/mcp-proxy` globally.
- Writes/merges `mcpServers.gumpbox` in `~/.gemini/settings.json` (idempotent).
- Prompts for the gumpbox session URL on first install.

## Configure

```bash
npx @gumpbox/cli set-url
npx @gumpbox/cli status
```

## Uninstall

Edit `~/.gemini/settings.json` to remove the `mcpServers.gumpbox` entry, then:

```bash
npm uninstall -g @gumpbox/mcp-proxy
rm ~/.gumpbox/session.json
```
