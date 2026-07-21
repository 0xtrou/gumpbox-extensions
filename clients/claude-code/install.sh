#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="${HOME}/.claude/mcp-servers"
CONFIG_FILE="${INSTALL_DIR}/gumpbox.json"

echo "gumpbox — Claude Code installer"
echo

# 1. Install proxy globally
if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm is required. Install Node 20+ first." >&2
  exit 1
fi
echo "Installing @gumpbox/mcp-proxy globally…"
npm install -g @gumpbox/mcp-proxy

# 2. Write Claude Code MCP config
mkdir -p "${INSTALL_DIR}"
cat > "${CONFIG_FILE}" <<'JSON'
{
  "mcpServers": {
    "gumpbox": {
      "command": "gumpbox-mcp-proxy",
      "args": []
    }
  }
}
JSON
echo "Wrote ${CONFIG_FILE}"

# 3. Configure session URL
if [ ! -f "${HOME}/.gumpbox/session.json" ]; then
  echo
  echo "Configure your session URL:"
  npx --yes @gumpbox/cli set-url
else
  echo "session.json already exists — skipping set-url"
fi

echo
echo "Done. Restart Claude Code to pick up the gumpbox MCP server."
