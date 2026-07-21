# gumpbox for Claude Code

Connect Claude Code to the gumpbox app via MCP.

## Install

### macOS / Linux

```bash
curl -fsSL https://raw.githubusercontent.com/0xtrou/gumpbox-extensions/main/clients/claude-code/install.sh | bash
```

Or clone and run locally:
```bash
git clone https://github.com/0xtrou/gumpbox-extensions
cd gumpbox-extensions
bash clients/claude-code/install.sh
```

### Windows (PowerShell)

```powershell
irm https://raw.githubusercontent.com/0xtrou/gumpbox-extensions/main/clients/claude-code/install.ps1 | iex
```

## What it does

- Installs `@gumpbox/mcp-proxy` globally.
- Writes `~/.claude/mcp-servers/gumpbox.json` so Claude Code spawns the proxy.
- Prompts for the gumpbox session URL on first install.

## Configure

```bash
npx @gumpbox/cli set-url
npx @gumpbox/cli status
```

## Uninstall

```bash
rm ~/.claude/mcp-servers/gumpbox.json
npm uninstall -g @gumpbox/mcp-proxy
rm ~/.gumpbox/session.json
```
