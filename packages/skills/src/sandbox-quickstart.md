---
name: sandbox-quickstart
description: Spin up an ephemeral sandbox environment on a connected server via the sandbox resource
tags: [sandbox, ephemeral, testing]
---

# Sandbox quickstart

Use the `sandbox` MCP resource to create isolated, ephemeral environments on a connected server.

## Steps

1. Call `list_resource_actions` with `resource: "sandbox"`.
2. Call `get_resource_action_schema` for `sandbox.create` to learn params (server id, base image, memory limit, ttl).
3. Call `invoke_resource_action` with `resource: "sandbox"`, `action: "create"`, and the params. Returns a sandbox id and a terminal session id.
4. Run setup commands via the `terminal_use` resource targeting the sandbox's terminal session.
5. When done, call `sandbox.destroy` with the sandbox id. Sandboxes auto-destroy at their TTL.

## Tips

- Default TTL is 1 hour. Set `ttlSeconds` explicitly for longer or shorter sessions.
- Sandboxes share the server's network egress but are filesystem-isolated.
- Use sandboxes for reproducible builds, smoke tests, and untrusted script execution.
