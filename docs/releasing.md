# Releasing

## npm packages (`@gumpbox/core`, `mcp-proxy`, `cli`, `skills`)

1. Make changes on a feature branch.
2. Run `pnpm changeset` and add a changeset describing the bump per affected package.
3. Merge to `main`.
4. The `Release` workflow opens a "Version Packages" PR when changesets are pending.
5. Merge the Version Packages PR → workflow publishes to npm.

## VSCode extension (`gumpbox-mcp`)

Tracked by the same changeset flow. When the VSCode extension version bumps, also tag `gumpbox-mcp-v<version>` on the version-PR merge commit. The `Publish VSCode Extension` workflow publishes to Marketplace + OpenVSX.

First-time setup:
- `NPM_TOKEN` — npm automation token (publish access to @gumpbox scope)
- `VSCE_PAT` — VSCode Marketplace publisher token
- `OVSX_PAT` — OpenVSX publisher token

## Installer-only clients (Claude Code / Codex / Gemini)

No version-pinning — `install.sh` always pulls `@gumpbox/mcp-proxy@latest` from npm. Users re-run install to update.
