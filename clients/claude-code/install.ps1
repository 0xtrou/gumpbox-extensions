# PowerShell installer for Windows
$ErrorActionPreference = "Stop"

Write-Host "gumpbox — Claude Code installer" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Error "npm is required. Install Node 20+ first."
  exit 1
}

Write-Host "Installing @gumpbox/mcp-proxy globally…"
npm install -g "@gumpbox/mcp-proxy"

$installDir = Join-Path $env:USERPROFILE ".claude\mcp-servers"
$configFile = Join-Path $installDir "gumpbox.json"

if (-not (Test-Path $installDir)) {
  New-Item -ItemType Directory -Path $installDir -Force | Out-Null
}

$config = @'
{
  "mcpServers": {
    "gumpbox": {
      "command": "gumpbox-mcp-proxy.cmd",
      "args": []
    }
  }
}
'@

Set-Content -Path $configFile -Value $config -Encoding UTF8
Write-Host "Wrote $configFile"

$sessionFile = Join-Path $env:USERPROFILE ".gumpbox\session.json"
if (-not (Test-Path $sessionFile)) {
  Write-Host ""
  Write-Host "Configure your session URL:"
  npx --yes "@gumpbox/cli" set-url
} else {
  Write-Host "session.json already exists — skipping set-url"
}

Write-Host ""
Write-Host "Done. Restart Claude Code to pick up the gumpbox MCP server." -ForegroundColor Green
