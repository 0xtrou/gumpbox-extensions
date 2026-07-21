---
name: tunnel-setup
description: Expose a remote port from a connected server to your local machine via the tunnels resource
tags: [tunnel, port-forward, networking]
---

# Set up a tunnel

Use the `tunnels` MCP resource to forward a remote port on a connected server to a local port.

## Steps

1. Call `list_resource_actions` with `resource: "tunnels"`.
2. Call `get_resource_action_schema` for `tunnels.open` to learn required params (server id, remote host, remote port, local port).
3. Call `invoke_resource_action` with `resource: "tunnels"`, `action: "open"`, and the params.
4. Poll `tunnels.status` with the tunnel id to confirm it's `connected`.
5. Access the remote service at `127.0.0.1:<localPort>`.
6. When done, call `tunnels.close` with the tunnel id.

## Tips

- Local port conflicts: if the requested local port is taken, gumpbox picks the next free one and returns it in the response.
- Tunnels persist across MCP sessions until explicitly closed or the server disconnects.
- Use tunnels for HTTP services, databases, and admin UIs — not for streaming video.
