/** Bundled starter skills. Inlined as TS so the package ships self-contained — no .md file IO at runtime. */

export interface BundledSkill {
  name: string;
  description: string;
  tags: string[];
  content: string;
}

export const bundledSkills: BundledSkill[] = [
  {
    name: "connect-server",
    description: "Add or connect a Linux server in gumpbox via the MCP servers resource",
    tags: ["servers", "setup", "onboarding"],
    content: `# Connect a server

Use the \`servers\` MCP resource on the gumpbox session.

## Steps

1. Call \`list_resource_actions\` with \`resource: "servers"\` to see all actions.
2. Call \`get_resource_action_schema\` for \`servers.request_add_server\` to learn required params (host, port, credential).
3. Call \`invoke_resource_action\` with \`resource: "servers"\`, \`action: "request_add_server"\`, and the params. gumpbox will surface an approval dialog in the app.
4. Once approved, call \`servers.connect_and_open_feature\` to verify the connection works.

## Tips

- Credentials are never embedded in MCP params — gumpbox stores them in Keychain after the approval flow.
- Host must be reachable from the machine running gumpbox.`,
  },
  {
    name: "run-command",
    description: "Execute an SSH command on a connected server via MCP",
    tags: ["terminal", "ssh", "commands"],
    content: `# Run an SSH command

Use the \`terminal_use\` MCP resource (per-session, interactive) or the per-server \`ssh_command\` resource (one-shot).

## Steps

1. Call \`list_resource_actions\` with \`resource: "terminal_use"\` to see session lifecycle actions.
2. Use \`terminal_use.create_session\` to open a PTY session on a server.
3. Use \`terminal_use.send_command\` or \`terminal_use.send_input\` to drive the session.
4. Use \`terminal_use.read_terminal\` to fetch current screen state.
5. Call \`terminal_use.close_session\` when done.

## Tips

- For non-interactive one-shot commands, prefer the per-server \`ssh_command.execute\` action.
- All commands run inside a \`systemd-run\` sandbox wrapper — security presets control capabilities.`,
  },
  {
    name: "tunnel-setup",
    description: "Create and manage SSH tunnels via the MCP tunnels resource",
    tags: ["tunnels", "networking", "ports"],
    content: `# Set up an SSH tunnel

Use the \`tunnels\` MCP resource.

## Steps

1. Call \`list_resource_actions\` with \`resource: "tunnels"\`.
2. Use \`tunnels.create\` with \`{ serverId, remoteHost, remotePort, localPort }\`.
3. Use \`tunnels.start\` with the tunnel id.
4. Use \`tunnels.list\` to inspect active tunnels.
5. Use \`tunnels.stop\` to tear down.

## Tips

- Tunnels forward a local port on the gumpbox host to a remote endpoint through the server's SSH connection.
- Use \`tunnels.open_browser\` to launch the local URL in the user's browser.`,
  },
  {
    name: "sandbox-quickstart",
    description: "Create and enter a gVisor sandbox container via the MCP sandbox resource",
    tags: ["sandbox", "docker", "gvisor"],
    content: `# Sandbox quickstart

Use the \`sandbox\` MCP resource. Sandboxes are Docker + gVisor containers with SSH access.

## Steps

1. Call \`list_resource_actions\` with \`resource: "sandbox"\` to see all actions.
2. Call \`sandbox.list\` to see existing sandboxes on a host.
3. Call \`sandbox.create\` with \`{ serverId, name }\` to provision a new sandbox.
4. Call \`sandbox.start\` and \`sandbox.provision_key\` to get an SSH key for the sandbox.
5. Call \`sandbox.open_terminal\` to launch an interactive terminal.
6. Use \`sandbox.execute_command\` for one-shot commands inside the sandbox.

## Tips

- Sandbox persistence is workspace-scoped (\`/workspace\` volume-backed).
- gVisor provides syscall filtering — no KVM required.
- Outbound network is always on by design.`,
  },
  {
    name: "file-transfer",
    description: "Upload and download files via the MCP file_transfer resource",
    tags: ["files", "sftp", "transfer"],
    content: `# Transfer files

Use the \`file_transfer\` MCP resource.

## Steps

1. Call \`list_resource_actions\` with \`resource: "file_transfer"\`.
2. Use \`file_transfer.upload\` with \`{ serverId, remotePath, localPath }\`.
3. Use \`file_transfer.download\` with \`{ serverId, remotePath, localPath }\`.
4. For paths outside the user's home, use \`file_transfer.request_access_to_path\` first — gumpbox will surface an approval dialog.

## Tips

- Uploads and downloads use SFTP under the hood with 32 KB chunking.
- Path access approvals are remembered per session.`,
  },
  {
    name: "skill-management",
    description: "Create, update, and delete skills in gumpbox via the MCP skills resource",
    tags: ["skills", "meta"],
    content: `# Manage skills

Use the \`skills\` MCP resource on the global session.

## Steps

1. Call \`list_resource_actions\` with \`resource: "skills"\`.
2. Use \`skills.list\` to see all skills (custom + built-in).
3. Use \`skills.create\` with \`{ name, description, content, tags }\`.
4. Use \`skills.update\` to edit an existing skill.
5. Use \`skills.delete\` to remove.

## Tips

- Skills are markdown content with frontmatter-like metadata.
- Built-in skills (slug IDs like "terminal-use") are read-only.
- Custom skills have UUID IDs and are fully editable.`,
  },
];
