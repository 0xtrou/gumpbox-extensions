# @gumpbox/cli

Command-line configuration for gumpbox MCP client plugins.

## Usage

```bash
npx @gumpbox/cli set-url
npx @gumpbox/cli status
npx @gumpbox/cli install claude-code  # or: codex, gemini, vscode
npx @gumpbox/cli seed-skills
```

## Install the proxy

After `install`, install the proxy globally:

```bash
npm install -g @gumpbox/mcp
```

## Commands

- `set-url` — Paste gumpbox session URL, write to `~/.gumpbox/session.json` (0600 perms on POSIX).
- `status` — Call `initialize` on the configured session, print server info.
- `install <client>` — Install MCP config for one of: `claude-code`, `codex`, `gemini`, `vscode`.
  - `claude-code`: writes `~/.claude/mcp-servers/gumpbox.json`
  - `codex`: appends `[mcp_servers.gumpbox]` to `~/.codex/config.toml`
  - `gemini`: writes/merges `mcpServers.gumpbox` in `~/.gemini/settings.json`
  - `vscode`: prints marketplace link (VSCode plugin ships as `.vsix`)
- `seed-skills` — Push 6 bundled starter skills into gumpbox via `skills.create`. Idempotent (skips existing names).

## License

MIT.
