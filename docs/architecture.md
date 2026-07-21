# Architecture

## Components

```
┌──────────────┐     stdio      ┌──────────────┐     HTTP     ┌──────────────┐
│  Host editor │ ────────────►  │  mcp-proxy   │ ──────────►  │  gumpbox app │
│  (VSCode,    │                │  (Node bin)  │              │  GlobalMCPServer
│  Cursor, …)  │ ◄────────────  │              │ ◄──────────  │  :7778       │
└──────────────┘  JSON-RPC      └──────────────┘   JSON-RPC   └──────────────┘
       ▲
       │ HTTPS (for UI panels — VSCode only)
       │
┌──────────────┐
│  VSCode ext  │
│  webviews    │
└──────────────┘
```

## Packages

- `@gumpbox/core` — shared library (MCPClient, session config, stdio proxy)
- `@gumpbox/mcp-proxy` — standalone Node bin spawned by host editors
- `@gumpbox/cli` — `npx` installer for config-driven clients
- `@gumpbox/skills` — bundled starter skills markdown
- `gumpbox-mcp` (VSCode extension) — covers VSCode/Cursor/Windsurf/Continue
- `@gumpbox/claude-code-plugin`, `@gumpbox/codex-plugin`, `@gumpbox/gemini-plugin` — installers

## Invariants

1. Proxy is stateless. Reads `~/.gumpbox/session.json` on every request.
2. Proxy is pure forwarder. Zero business logic.
3. Proxy is platform-agnostic. Single Node binary, no native modules.
4. Token never in env var or in client config files. Only in `session.json` (0600 perms on POSIX).
5. All traffic to `127.0.0.1`. gumpbox's MCP server is already loopback-bound.

## Failure modes

See spec: `docs/superpowers/specs/2026-07-21-mcp-client-plugins-design.md` (Transport failure modes table).
