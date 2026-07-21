#!/usr/bin/env bash
set -euo pipefail

GEMINI_DIR="${HOME}/.gemini"
SETTINGS_FILE="${GEMINI_DIR}/settings.json"

echo "gumpbox — Gemini installer"
echo

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm is required. Install Node 20+ first." >&2
  exit 1
fi
echo "Installing @gumpbox/mcp-proxy globally…"
npm install -g @gumpbox/mcp-proxy

mkdir -p "${GEMINI_DIR}"

write_or_merge() {
  if [ -f "${SETTINGS_FILE}" ]; then
    # Use Node for safe JSON merge
    node -e "
      const fs = require('fs');
      const path = '${SETTINGS_FILE}';
      const prev = JSON.parse(fs.readFileSync(path, 'utf8'));
      if (prev.mcpServers && prev.mcpServers.gumpbox) {
        console.log('Gemini config already has gumpbox entry — skipping');
        process.exit(0);
      }
      prev.mcpServers = prev.mcpServers || {};
      prev.mcpServers.gumpbox = { command: 'gumpbox-mcp-proxy', args: [] };
      fs.writeFileSync(path, JSON.stringify(prev, null, 2));
      console.log('Merged gumpbox entry into ' + path);
    "
  else
    cat > "${SETTINGS_FILE}" <<'JSON'
{
  "mcpServers": {
    "gumpbox": {
      "command": "gumpbox-mcp-proxy",
      "args": []
    }
  }
}
JSON
    echo "Wrote ${SETTINGS_FILE}"
  fi
}
write_or_merge

if [ ! -f "${HOME}/.gumpbox/session.json" ]; then
  echo
  echo "Configure your session URL:"
  npx --yes @gumpbox/cli set-url
else
  echo "session.json already exists — skipping set-url"
fi

echo
echo "Done. Restart Gemini CLI to pick up the gumpbox MCP server."
