# gumpbox-extensions

**Open-source MCP client plugins for the [gumpbox](https://github.com/0xtrou/gumpbox) app.**

Bridges AI coding assistants (Claude Code, Codex, Cursor, Windsurf, Continue, VSCode, Gemini) to gumpbox's existing HTTP MCP server via a stdio proxy. One npm package (`@gumpbox/cli`), one bin (`gumpbox`), MIT-licensed.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript 5.6+ |
| Runtime | Node.js 20+ |
| Package manager | pnpm 9.12.0 workspaces |
| Bundler | esbuild (bin), tsc (library dist) |
| Release | Changesets |
| Target | macOS / Linux / Windows (cross-platform, no native modules) |
| Transport | HTTP loopback to gumpbox's `127.0.0.1:<port>/global/mcp/<token>` |
| VSCode extension | esbuild-bundled CJS, VSCode 1.95+ |

## Project Structure

```
gumpbox-extensions/
├── packages/
│   └── cli/                      # @gumpbox/cli — the single npm package
│       ├── src/
│       │   ├── bin.ts            # bin entry, subcommand dispatch
│       │   ├── proxy.ts          # stdio JSON-RPC loop (runStdioProxy)
│       │   ├── client.ts         # MCPClient — HTTP MCP client
│       │   ├── session.ts        # session.json read/write, URL validation
│       │   ├── skills.ts         # 6 bundled starter skills (inlined)
│       │   ├── types.ts          # JSON-RPC + MCP types
│       │   ├── errors.ts         # GumpboxError class + codes
│       │   └── index.ts          # library re-exports
│       ├── bin/gumpbox.js        # esbuild-bundled single file
│       ├── dist/                 # tsc output (library)
│       ├── esbuild.config.mjs
│       ├── tsconfig.json
│       └── package.json
│
├── clients/
│   ├── vscode/                   # .vsix — covers VSCode/Cursor/Windsurf/Continue
│   │   ├── src/
│   │   │   ├── extension.ts      # activation, commands, status bar
│   │   │   ├── mcpServer.ts      # spawns gumpbox proxy as child process
│   │   │   ├── sessionConfig.ts  # syncs secret storage ↔ session.json
│   │   │   └── panels/
│   │   │       ├── SkillsPanel.ts    # webview: live skills directory
│   │   │       ├── ReadmePanel.ts    # webview: readme.get render
│   │   │       ├── ActivityPanel.ts  # webview: activities.list timeline
│   │   │       └── panelUtils.ts
│   │   ├── esbuild.config.mjs
│   │   ├── package.json          # VSCode extension manifest
│   │   └── tsconfig.json
│   ├── claude-code/              # installer + mcp-config template
│   │   ├── install.sh            # POSIX installer
│   │   ├── install.ps1           # Windows installer
│   │   ├── mcp-config.template.json
│   │   └── package.json          # name stub for changesets
│   ├── codex/                    # installer + config.toml template
│   └── gemini/                   # installer + settings.json template
│
├── .changeset/                   # Changesets config
├── .github/workflows/            # ci.yml, release.yml, publish-vscode.yml
├── docs/
│   ├── architecture.md
│   ├── adding-a-client.md
│   ├── releasing.md
│   └── manual-testing.md
├── package.json                  # root workspace
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── LICENSE                       # MIT
└── README.md
```

## Architecture

### Mental model

gumpbox (the macOS/iOS SwiftUI app) already runs an HTTP MCP server on `127.0.0.1:<port>/global/mcp/<token>` (JSON-RPC 2.0 over HTTP, session-token-in-URL auth). This repo provides the **client side**: a stdio proxy that any MCP-aware host editor can spawn, plus installers that wire the proxy into each client's native MCP config.

```
┌─────────────────┐    stdio JSON-RPC    ┌──────────────┐    HTTP loopback   ┌─────────────────┐
│  Host editor    │  ──────────────────► │  gumpbox     │  ────────────────► │  gumpbox app    │
│  (Claude Code,  │                      │  proxy       │                     │  GlobalMCPServer│
│  Codex, Cursor, │  ◄────────────────── │              │  ◄──────────────── │  :7777          │
│  Gemini, VSCode)│                      │              │                     │                 │
└─────────────────┘                      └──────────────┘                     └─────────────────┘
                                                                                       │
                                                                                       ▼
                                                                              SSH servers, tunnels,
                                                                              sandboxes, files, …
```

### `@gumpbox/cli` — the single npm package

The only published npm package. Ships:

- **Bin (`gumpbox`)** with subcommands (see table below).
- **Library exports** — `import { MCPClient, runStdioProxy, bundledSkills, validateSessionUrl, ... } from "@gumpbox/cli"`.

The VSCode extension imports it as a workspace dep at build time; installers reference the global bin from npm at runtime.

### Subcommands

| Command | Purpose |
|---------|---------|
| `gumpbox proxy` | Run as a stdio MCP proxy. Host editors spawn this; reads stdin JSON-RPC, forwards over HTTP to gumpbox. |
| `gumpbox set-url` | Interactive prompt, writes `~/.gumpbox/session.json` with `0600` perms on POSIX. |
| `gumpbox status` | Calls `initialize` on the configured session, prints server name + version. |
| `gumpbox install <client>` | Writes MCP config for `claude-code` / `codex` / `gemini` / `vscode`. Always prompts for URL first. |
| `gumpbox seed-skills` | Pushes the 6 bundled starter skills into gumpbox via `skills.create`. Idempotent (skips existing names). |
| `gumpbox --version` / `--help` | Self-doc. |

### Session URL contract

- **Source**: user copies from gumpbox app → Global MCP panel.
- **Shape**: `http://127.0.0.1:<port>/global/mcp/<token>` (loopback only, token in URL path). Default port observed in production: `7777` (the app's Global MCP server).
- **Stored at** `~/.gumpbox/session.json` (POSIX) or `%USERPROFILE%\.gumpbox\session.json` (Windows), perms `0600`.
- **Proxy re-reads on every request** — URL changes take effect without restarting the host editor.
- **Never stored in** env vars, client MCP config files, or source. Client configs (`~/.claude.json`, `~/.codex/config.toml`, `~/.gemini/settings.json`) reference only the `gumpbox proxy` binary path + `["proxy"]` args.

### Transport failure modes

Proxy emits JSON-RPC errors with stable application codes (range `-32000` to `-32099` per JSON-RPC 2.0):

| Code | Constant | Meaning | User action |
|------|----------|---------|-------------|
| `-32001` | `session_not_configured` | `session.json` missing or unreadable | Run `gumpbox set-url`. |
| `-32002` | `session_invalid` | HTTP 401/403/404 from gumpbox | Re-copy session URL from gumpbox. |
| `-32003` | `gumpbox_unreachable` | TCP ECONNREFUSED | Open the gumpbox app. |
| `-32004` | `gumpbox_http_error` | Any other HTTP status | Inspect message body. |

### Per-client install targets

| Client | Config file | Shape |
|--------|-------------|-------|
| Claude Code | `~/.claude.json` | Merge into `mcpServers.gumpbox = { type: "stdio", command: "gumpbox", args: ["proxy"], env: {} }`. **Not** `~/.claude/mcp-servers/` (old wrong path — do not reintroduce). |
| Codex | `~/.codex/config.toml` | Append `[mcp_servers.gumpbox]` block with `command = "gumpbox"`, `args = ["proxy"]`. |
| Gemini | `~/.gemini/settings.json` | Write/merge `mcpServers.gumpbox = { command: "gumpbox", args: ["proxy"] }`. |
| VSCode / Cursor / Windsurf / Continue | `.vsix` extension | Bundled proxy spawn via `child_process`. Configured via extension's `Gumpbox: Set Session URL` command. |

All installers are **idempotent** — re-running preserves `session.json` and skips existing config entries.

### Bundled starter skills

6 skills inlined in `packages/cli/src/skills.ts`:
`connect-server`, `run-command`, `tunnel-setup`, `sandbox-quickstart`, `file-transfer`, `skill-management`.

Each is a procedural markdown playbook referencing the MCP resources/actions the user should invoke (not a restatement of full docs). Seeded into gumpbox on first run via `gumpbox seed-skills` or the VSCode extension's `Gumpbox: Seed Starter Skills` command. **Single source of truth** — never copied to client skill folders, agent fetches live via `skills.list` / `skills.get`.

## Conventions

- **TypeScript everywhere.** Node 20+, pnpm 9+, esbuild bundling.
- **No native modules.** Must install clean on macOS/Linux/Windows without node-gyp.
- **No `workspace:*` in published `dependencies`.** Use only for unpublished workspace tooling or devDependencies. Published `dependencies` must point at concrete npm versions — `workspace:*` leaks into the tarball and breaks downstream `npm install`.
- **Library code is dual-purpose.** The `@gumpbox/cli` package exports both a bin (`gumpbox`) and a library entry (`import { MCPClient, ... } from "@gumpbox/cli"`). VSCode extension imports the library; host editors spawn the bin.
- **Token secrecy.** Session tokens live only in `~/.gumpbox/session.json` with `0600` perms. Never in env vars, never in client config files, never in source, never in git.
- **Platform-agnostic.** Single HTTP loopback transport (`127.0.0.1:<port>`). No UDS, no named pipes, no WebSockets.
- **Caveman English OK in code comments.** Commit messages, READMEs, user-facing strings: normal English.
- **No `// TODO` comments.**
- **File organization**: one primary type per file, grouped by feature. Source-of-truth for skills lives in `packages/cli/src/skills.ts` — never duplicated.

## Build & Run

### Prerequisites

- Node.js 20+
- pnpm 9.12.0+ (`npm install -g pnpm@9.12.0` if missing)

### Install deps

```bash
pnpm install
```

### Build all packages

```bash
pnpm build
```

Build order matters — `@gumpbox/cli` produces `dist/` that the VSCode extension imports. The root `package.json` `build` script handles this:

```
"build": "pnpm --filter '@gumpbox/core' build && pnpm --filter '@gumpbox/skills' build && pnpm -r run build"
```

> Note: filter names reference the legacy split packages. After the single-package refactor, only `@gumpbox/cli` exists; the script still works because pnpm ignores non-matching filters.

### Typecheck

```bash
pnpm typecheck
```

### Local dev install (symlink `gumpbox` bin globally)

```bash
cd packages/cli
npm link
# Now `gumpbox` resolves to your local working copy
```

### Smoke test the proxy

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | gumpbox proxy
```

Expected with no `session.json`: `{"jsonrpc":"2.0","id":1,"error":{"code":-32001,"message":"Run 'gumpbox set-url'..."}}`.

## Release & Distribution

### npm package (`@gumpbox/cli`)

Published to npm under the `@gumpbox` scope. Current version: `0.2.1`.

**Release steps**:
1. Make changes on a feature branch.
2. Bump version in **two places** (must stay aligned):
   - `packages/cli/package.json` → `"version": "x.y.z"`
   - `packages/cli/src/bin.ts` → `const VERSION = "x.y.z"`
3. From repo root: `pnpm install && pnpm -r build && pnpm -r typecheck`.
4. `npm publish packages/cli --access public` (requires npm account with `@gumpbox` scope ownership + automation-classic token that bypasses 2FA on publish).
5. Tag + push: `git tag v<x.y.z> && git push origin main --tags`.
6. Update global install: `npm install -g @gumpbox/cli@<x.y.z>`.

### Changesets

Configured (`.changeset/config.json`) with `changelog: false` to avoid the GitHub API call that `@changesets/changelog-github` requires. Versioning is currently done manually (steps above) until CI is wired with `NPM_TOKEN` secret.

### VSCode extension (deferred)

The `.vsix` is **not yet published** to Marketplace or OpenVSX. To ship it:

1. Register publisher `gumpbox` on [Marketplace](https://marketplace.visualstudio.com/manage/publishers/gumpbox) and [OpenVSX](https://open-vsx.org/namespace/create).
2. Bump `clients/vscode/package.json` version.
3. `pnpm --filter gumpbox-mcp package` → produces `.vsix`.
4. `pnpm --filter gumpbox-mcp publish:marketplace` (needs `VSCE_PAT`).
5. `pnpm --filter gumpbox-mcp publish:openvsx` (needs `OVSX_PAT`).

### CI workflows

Three workflows live in `.github/workflows/`:

- `ci.yml` — matrix build/test across ubuntu/macos/windows × Node 20/22.
- `release.yml` — Changesets-driven npm publish on version-PR merge. Requires `NPM_TOKEN` secret.
- `publish-vscode.yml` — triggered by `gumpbox-mcp-v*` tags. Publishes `.vsix` to Marketplace + OpenVSX. Requires `VSCE_PAT` + `OVSX_PAT` secrets.

**Pushing workflow files to GitHub remote requires the `workflow` OAuth scope**: `gh auth refresh -h github.com -s workflow` then `git push origin main`. Without this scope, GitHub rejects pushes that touch `.github/workflows/*`. Workaround during initial setup: temporarily move workflows out of `.github/`, push, restore locally, then land them once the scope is refreshed.

## Testing

### Functional test against real gumpbox

1. gumpbox app must be running with Global MCP server enabled.
2. Copy session URL from gumpbox → Global MCP panel.
3. `echo "<url>" | gumpbox set-url`
4. `gumpbox status` → should print `connected: Gumpbox Global MCP Server v<ver> (build) (protocol 2024-11-05)`.
5. `echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"invoke_resource_action","arguments":{"resource":"servers","action":"list"}}}' | gumpbox proxy` → should return real server list JSON.

### CLI install verification (per client)

After `gumpbox install <client>`:

| Client | Verify command | Expected |
|--------|----------------|----------|
| Claude Code | `claude mcp list \| grep gumpbox` | `gumpbox: gumpbox proxy - ✔ Connected` |
| Codex | `codex mcp list` | Row with `gumpbox`, `enabled`, transport `stdio` |
| Gemini | `gemini mcp list` (from trusted dir or with `--skip-trust`) | `gumpbox: gumpbox proxy (stdio)` |
| VSCode | `Gumpbox: Test Connection` command in palette | Toast: `gumpbox connected: <name> v<ver>` |

### Clean-room install test

Verify the published npm package works without the source tree:

```bash
TESTDIR=$(mktemp -d) && cd $TESTDIR && npm install @gumpbox/cli
node_modules/.bin/gumpbox --version
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | node_modules/.bin/gumpbox proxy
cd / && rm -rf $TESTDIR
```

## Common Maintenance Tasks

| Task | Steps |
|------|-------|
| **Add a new AI client** | Create `clients/<name>/` with installer + template + README. Add the client name to `CLIENTS` array in `packages/cli/src/bin.ts` and a `write<Client>Config()` helper. Update root README. |
| **Add a bundled skill** | Append to `bundledSkills` array in `packages/cli/src/skills.ts`. Bump version (two places — see Release steps), publish. Existing users get it on next `gumpbox seed-skills` run. |
| **Bump gumpbox MCP protocol version** | Update `protocolVersion` in `packages/cli/src/client.ts` `initialize()` call. Test against gumpbox app's current `GlobalMCPRequestHandler`. |
| **Fix proxy bug** | Edit `packages/cli/src/proxy.ts` or `client.ts`. Bump patch version (both places). Publish. Users get it on next `npm update -g @gumpbox/cli`. |
| **Fix installer for a client** | Edit the `write<Client>Config()` function in `packages/cli/src/bin.ts`. Update the matching `clients/<name>/install.{sh,ps1}` if it duplicates logic. Bump + publish. |

## Pitfalls (learned the hard way)

- **`workspace:*` in published `dependencies` breaks downstream installs.** npm rejects the protocol with `EUNSUPPORTEDPROTOCOL`. Always publish with concrete version ranges like `^0.1.0`. (Hit during the multi-package era — entire published versions were uninstallable.)
- **Claude Code reads MCP servers from `~/.claude.json`, not `~/.claude/mcp-servers/`.** The `mcp-servers/` folder path was a wrong guess that shipped in 0.2.0; fixed in 0.2.1. If you see "claude doesn't see the MCP server", check `cat ~/.claude.json | jq .mcpServers.gumpbox` — if missing, the installer wrote to the wrong place.
- **npm publish with 2FA-protected accounts requires a Classic Automation token.** Granular tokens still prompt for OTP, which CI can't provide. Generate at https://www.npmjs.com/settings/<user>/tokens → Classic Token → Automation.
- **npm publish propagation lag.** `npm view @scope/pkg@<ver>` can return 404 for ~1-5 minutes after `npm publish` reports success. The version URL `https://registry.npmjs.org/@scope%2Fpkg/<ver>` returns 200 immediately — use that to verify.
- **npm optional platform deps don't always auto-install.** Observed with `@openai/codex` — `@openai/codex-darwin-arm64` aliased via `npm:@openai/codex@<ver>-darwin-arm64` didn't install via `npm install -g @openai/codex@latest`. Fix: `npm install -g @openai/codex-darwin-arm64@npm:@openai/codex@<ver>-darwin-arm64`. Not our bug, but users may hit it when installing codex itself.
- **`pnpm -r typecheck` runs in parallel and fails when consumers typecheck before producers build.** The root `typecheck` script pre-builds `@gumpbox/core` and `@gumpbox/skills` (legacy filter names) before running the recursive typecheck. Don't remove this pre-build step.
- **esbuild-bundled bins must not have a shebang in the TS source if the esbuild config adds one via `banner`.** Double `#!/usr/bin/env node` causes Node ESM to reject with a syntax error. Keep shebangs out of `.ts` files — let esbuild add them.
- **`import.meta.url` returns `{}` under CJS bundles.** If a package is consumed by a CJS bundler (VSCode extension), don't rely on `import.meta.url` for runtime file resolution. Inline the data as TS instead, or have the consumer's esbuild config `define` it.
- **GitHub OAuth scope for workflows.** Pushing changes that touch `.github/workflows/*` requires the `workflow` scope on the gh token. Default `gh auth login` doesn't include it.

## Incomplete / Planned

- **VSCode Marketplace + OpenVSX publishing**: not yet published. Requires `gumpbox` publisher registration on both + PATs.
- **Skill marketplace UI inside VSCode extension**: deferred to v0.3. Currently skills are seeded once, browsed via the basic Skills panel.
- **Per-client skill bundles**: all clients share the same 6 starter skills today. Per-client curated sets not implemented.
- **Live SSE streaming for long-running MCP commands**: gumpbox emits single-shot HTTP today; proxy handles SSE format but doesn't yet stream incremental output.
- **Codex TOML append can collide with existing entries if user manually edits between installs.** Idempotency check looks for `[mcp_servers.gumpbox]` substring only.
- **Gemini trust model**: `gumpbox install gemini` writes config but Gemini refuses to spawn MCP in untrusted folders. Users must run from a trusted project dir or pass `--skip-trust`. Installer doesn't auto-add the trust entry.

## Links

- **npm package**: [@gumpbox/cli](https://www.npmjs.com/package/@gumpbox/cli)
- **gumpbox app source**: [github.com/0xtrou/gumpbox](https://github.com/0xtrou/gumpbox)
- **gumpbox website**: [gumpbox.com](https://gumpbox.com)
- **MCP protocol**: [modelcontextprotocol.io](https://modelcontextprotocol.io)
