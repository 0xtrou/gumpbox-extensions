---
name: run-command
description: Execute a shell command on a connected server via the terminal_use resource
tags: [terminal, shell, exec]
---

# Run a command

Use the `terminal_use` MCP resource. Requires a connected server.

## Steps

1. Call `list_resource_actions` with `resource: "terminal_use"` to see available actions (typically `execute`, `read_output`, `interrupt`).
2. Call `get_resource_action_schema` for the action you want (e.g. `terminal_use.execute`) to learn required params (server id, command, cwd, timeout).
3. Call `invoke_resource_action` with `resource: "terminal_use"`, `action: "execute"`, and `{ server, command, cwd, timeoutMs }`.
4. For long-running commands, poll `terminal_use.read_output` with the session id returned from `execute`.
5. To stop a runaway command, call `terminal_use.interrupt` with the session id.

## Tips

- Default timeout is 30s. Set `timeoutMs` explicitly for longer runs.
- Output is returned as streamed chunks; concatenate `stdout`/`stderr` across polls.
- Avoid interactive commands (vim, top). Use non-interactive equivalents.
