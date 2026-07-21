# gumpbox for Codex

Connect OpenAI Codex to the gumpbox app via MCP.

## Install

### macOS / Linux

```bash
curl -fsSL https://raw.githubusercontent.com/0xtrou/gumpbox-extensions/main/clients/codex/install.sh | bash
```

### Windows (PowerShell)

```powershell
irm https://raw.githubusercontent.com/0xtrou/gumpbox-extensions/main/clients/codex/install.ps1 | iex
```

## What it does

- Installs `@gumpbox/mcp-proxy` globally.
- Appends `[mcp_servers.gumpbox]` to `~/.codex/config.toml` (idempotent).
- Prompts for the gumpbox session URL on first install.

## Configure

```bash
npx @gumpbox/cli set-url
npx @gumpbox/cli status
```

## Uninstall

```bash
# Edit ~/.codex/config.toml and remove the gumpbox entry, then:
npm uninstall -g @gumpbox/mcp-proxy
rm ~/.gumpbox/session.json
```
