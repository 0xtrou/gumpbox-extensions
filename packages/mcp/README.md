# @gumpbox/mcp

Gumpbox MCP client — stdio proxy + HTTP MCP client + bundled skills. Bridges AI editors (Claude Code, Codex, Gemini, VSCode, Cursor) to the [gumpbox](https://github.com/0xtrou/gumpbox) app.

## Install

```bash
npm install -g @gumpbox/mcp
```

## Configure

Run once to set your gumpbox session URL:

```bash
npx @gumpbox/cli set-url
```

Or write `~/.gumpbox/session.json` directly:

```json
{ "sessionUrl": "http://127.0.0.1:7778/global/mcp/<token>" }
```

Copy the URL from gumpbox → Global MCP panel.

## Run as a proxy

```bash
gumpbox-mcp-proxy
```

Host editors (Claude Code, Codex, Gemini, VSCode/Cursor MCP clients) spawn this binary and speak JSON-RPC 2.0 over stdio.

## Use as a library

```typescript
import { MCPClient, readSessionConfig, bundledSkills } from "@gumpbox/mcp";

const config = readSessionConfig();
if (config) {
  const client = new MCPClient(config);
  const info = await client.initialize({ name: "my-app", version: "1.0.0" });
  console.log(info.name, info.version);
}
```

## What's included

- `MCPClient` — HTTP client for gumpbox's MCP server
- `runStdioProxy` — stdio JSON-RPC loop that forwards to gumpbox
- `gumpbox-mcp-proxy` — standalone bin (esbuild-bundled, zero runtime deps)
- `SessionConfig` + helpers — `~/.gumpbox/session.json` read/write with `0600` perms
- `GumpboxError` — typed error class with stable codes
- `bundledSkills` — 6 starter skills seeded into gumpbox on first run

## License

MIT.
