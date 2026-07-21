# Gumpbox MCP for VSCode, Cursor, Windsurf, Continue

Connects your editor to the gumpbox app via MCP.

## Install

### From Marketplace (VSCode)

Search "Gumpbox MCP" in the Extensions panel.

### From OpenVSX (Cursor, Windsurf, Continue)

Search "Gumpbox MCP" in your editor's extension panel.

### From source

```bash
pnpm install
pnpm --filter gumpbox-mcp package
# Install the resulting .vsix:
code --install-extension gumpbox-mcp-0.0.0.vsix
```

## Configure

1. Open gumpbox app → Global MCP panel → copy session URL.
2. Run "Gumpbox: Set Session URL" in the command palette.
3. Paste the URL.

## Commands

- `Gumpbox: Set Session URL`
- `Gumpbox: Test Connection`
- `Gumpbox: Browse Skills`
- `Gumpbox: Show Readme`
- `Gumpbox: Show Activity`
- `Gumpbox: Seed Starter Skills`

Status bar item shows connection state.
