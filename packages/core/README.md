# @gumpbox/core

Shared library for gumpbox MCP client plugins.

Exports:
- `MCPClient` — HTTP client for gumpbox's MCP server
- `SessionConfig` + helpers — session.json read/write
- `runStdioProxy` — stdio loop that forwards JSON-RPC over HTTP
- `GumpboxError` — typed error class with stable codes

See `docs/architecture.md` in repo root.
