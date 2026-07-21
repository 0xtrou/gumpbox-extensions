#!/usr/bin/env bash
set -euo pipefail

CODEX_DIR="${HOME}/.codex"
CONFIG_FILE="${CODEX_DIR}/config.toml"
MARKER="# Added by gumpbox installer"

echo "gumpbox — Codex installer"
echo

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm is required. Install Node 20+ first." >&2
  exit 1
fi
echo "Installing @gumpbox/mcp-proxy globally…"
npm install -g @gumpbox/mcp-proxy

mkdir -p "${CODEX_DIR}"
if [ -f "${CONFIG_FILE}" ]; then
  if grep -q "${MARKER}" "${CONFIG_FILE}"; then
    echo "Codex config already has gumpbox entry — skipping"
  else
    echo "" >> "${CONFIG_FILE}"
    cat <<'TOML' >> "${CONFIG_FILE}"

# Added by gumpbox installer
[mcp_servers.gumpbox]
command = "gumpbox-mcp-proxy"
args = []
TOML
    echo "Appended gumpbox entry to ${CONFIG_FILE}"
  fi
else
  cat > "${CONFIG_FILE}" <<'TOML'
# Added by gumpbox installer
[mcp_servers.gumpbox]
command = "gumpbox-mcp-proxy"
args = []
TOML
  echo "Wrote ${CONFIG_FILE}"
fi

if [ ! -f "${HOME}/.gumpbox/session.json" ]; then
  echo
  echo "Configure your session URL:"
  npx --yes @gumpbox/cli set-url
else
  echo "session.json already exists — skipping set-url"
fi

echo
echo "Done. Restart Codex to pick up the gumpbox MCP server."
