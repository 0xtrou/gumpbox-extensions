# gumpbox-extensions

Open-source MCP client plugins for the [gumpbox](https://github.com/0xtrou/gumpbox) app.

## Supported clients

| Client | Install | Source |
|--------|---------|--------|
| VSCode, Cursor, Windsurf, Continue | Search "Gumpbox MCP" in your editor's Extensions panel | [`clients/vscode`](clients/vscode/README.md) |
| Claude Code | `curl -fsSL https://raw.githubusercontent.com/0xtrou/gumpbox-extensions/main/clients/claude-code/install.sh \| bash` | [`clients/claude-code`](clients/claude-code/README.md) |
| Codex | `curl -fsSL https://raw.githubusercontent.com/0xtrou/gumpbox-extensions/main/clients/codex/install.sh \| bash` | [`clients/codex`](clients/codex/README.md) |
| Gemini | `curl -fsSL https://raw.githubusercontent.com/0xtrou/gumpbox-extensions/main/clients/gemini/install.sh \| bash` | [`clients/gemini`](clients/gemini/README.md) |

## Quick start

1. Open gumpbox → Global MCP panel → copy session URL.
2. Install the plugin for your editor (links above).
3. Run "Set Session URL" (or `npx @gumpbox/cli set-url`) and paste the URL.
4. Ask your AI agent to use gumpbox.

## Architecture

See [`docs/architecture.md`](docs/architecture.md). Every plugin wraps a single stdio MCP proxy (`@gumpbox/mcp-proxy`) that bridges host editors to gumpbox's existing HTTP MCP server.

## License

MIT.
