# Adding a client

To add a new MCP-aware client (e.g. Zed, JetBrains, Neovim):

1. **Confirm the client's MCP config file format** (JSON/TOML/YAML, expected location).
2. **Add a new folder** `clients/<client-name>/` with:
   - `package.json` (name: `@gumpbox/<client-name>-plugin`)
   - `install.sh` (POSIX) and `install.ps1` (Windows) — both idempotent
   - The native config file template the client expects
   - `README.md` with install instructions
3. **Wire into `@gumpbox/cli`**: add the client name to the `clients` array in `packages/cli/src/install.ts` and add a `write<Client>Config()` helper.
4. **Update root README** and `docs/architecture.md` to list the new client.

All clients share `@gumpbox/mcp-proxy` and `@gumpbox/core` — never copy logic into a client folder.
