---
name: connect-server
description: Add or connect a Linux server in gumpbox via the MCP servers resource
tags: [servers, setup, onboarding]
---

# Connect a server

Use the `servers` MCP resource on the gumpbox session.

## Steps

1. Call `list_resource_actions` with `resource: "servers"` to see all actions.
2. Call `get_resource_action_schema` for `servers.request_add_server` to learn required params (host, port, credential).
3. Call `invoke_resource_action` with `resource: "servers"`, `action: "request_add_server"`, and the params. gumpbox will surface an approval dialog in the app.
4. Once approved, call `servers.connect_and_open_feature` to verify the connection works.

## Tips

- Credentials are never embedded in MCP params — gumpbox stores them in Keychain after the approval flow.
- Host must be reachable from the machine running gumpbox.
