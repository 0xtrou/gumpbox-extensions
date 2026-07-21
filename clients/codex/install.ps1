$ErrorActionPreference = "Stop"

Write-Host "gumpbox — Codex installer" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Error "npm is required. Install Node 20+ first."
  exit 1
}

Write-Host "Installing @gumpbox/mcp-proxy globally…"
npm install -g "@gumpbox/mcp-proxy"

$codexDir = Join-Path $env:USERPROFILE ".codex"
$configFile = Join-Path $codexDir "config.toml"

if (-not (Test-Path $codexDir)) {
  New-Item -ItemType Directory -Path $codexDir -Force | Out-Null
}

$entry = @'

# Added by gumpbox installer
[mcp_servers.gumpbox]
command = "gumpbox-mcp-proxy.cmd"
args = []
'@

if (Test-Path $configFile) {
  $existing = Get-Content $configFile -Raw
  if ($existing -match "Added by gumpbox installer") {
    Write-Host "Codex config already has gumpbox entry — skipping"
  } else {
    Add-Content -Path $configFile -Value $entry
    Write-Host "Appended gumpbox entry to $configFile"
  }
} else {
  Set-Content -Path $configFile -Value $entry.TrimStart() -Encoding UTF8
  Write-Host "Wrote $configFile"
}

$sessionFile = Join-Path $env:USERPROFILE ".gumpbox\session.json"
if (-not (Test-Path $sessionFile)) {
  Write-Host ""
  Write-Host "Configure your session URL:"
  npx --yes "@gumpbox/cli" set-url
} else {
  Write-Host "session.json already exists — skipping set-url"
}

Write-Host ""
Write-Host "Done. Restart Codex to pick up the gumpbox MCP server." -ForegroundColor Green
