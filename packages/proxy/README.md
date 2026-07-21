# @gumpbox/mcp-proxy

Standalone stdio MCP proxy. Bridges any MCP-aware host editor to the gumpbox app's HTTP MCP server.

## Install

```bash
npm install -g @gumpbox/mcp-proxy
```

## Configure

Run once:
```bash
npx @gumpbox/cli set-url
```

Or write `~/.gumpbox/session.json` directly with the URL copied from gumpbox's Global MCP panel.

## Run

```bash
gumpbox-mcp-proxy
```

The host editor spawns this binary and speaks JSON-RPC 2.0 over stdio.
