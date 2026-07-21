# Manual testing

End-to-end test plan against a real gumpbox instance. Run before every release.

## Prerequisites

- gumpbox app installed, running, with at least one server added.
- Global MCP server enabled in gumpbox settings (port 7778).
- A valid global session token (copy from gumpbox → Global MCP panel).

## Per-client smoke test

For each client (VSCode, Cursor, Windsurf, Claude Code, Codex, Gemini):

1. Install the plugin per that client's README.
2. Run "Set Session URL" and paste the URL.
3. Open the AI chat / agent in that client.
4. Ask the agent: "What MCP tools are available?"
5. Confirm `list_resources`, `invoke_resource_action` etc. are visible.
6. Ask: "Use the gumpbox MCP to list my servers."
7. Confirm the agent invokes `servers.list` and returns the server list.

## VSCode extension UI

- Skills panel: lists skills (run "Seed Starter Skills" first if empty).
- Readme panel: shows gumpbox version + resources.
- Activity panel: shows recent MCP activity table.
- Status bar item: shows "connected" when URL is valid.

## Failure mode test

With gumpbox closed:
- Run "Test Connection" — should fail with clear "Cannot reach gumpbox" message.
- Status bar should show "gumpbox: not configured" or "misconfigured".

With an invalid token:
- Set URL to `http://127.0.0.1:7778/global/mcp/bad-token-12345`.
- Agent calls should fail with `session_invalid`.
