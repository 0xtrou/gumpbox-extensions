$ErrorActionPreference = "Stop"

Write-Host "gumpbox — Gemini installer" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Error "npm is required. Install Node 20+ first."
  exit 1
}

Write-Host "Installing @gumpbox/mcp-proxy globally…"
npm install -g "@gumpbox/mcp-proxy"

$geminiDir = Join-Path $env:USERPROFILE ".gemini"
$settingsFile = Join-Path $geminiDir "settings.json"

if (-not (Test-Path $geminiDir)) {
  New-Item -ItemType Directory -Path $geminiDir -Force | Out-Null
}

if (Test-Path $settingsFile) {
  $prev = Get-Content $settingsFile -Raw | ConvertFrom-Json
  if ($prev.mcpServers.gumpbox) {
    Write-Host "Gemini config already has gumpbox entry — skipping"
  } else {
    if (-not $prev.mcpServers) {
      $prev | Add-Member -NotePropertyName mcpServers -NotePropertyValue @{}
    }
    $prev.mcpServers | Add-Member -NotePropertyName gumpbox -NotePropertyValue @{
      command = "gumpbox-mcp-proxy.cmd"
      args = @()
    }
    $prev | ConvertTo-Json -Depth 10 | Set-Content $settingsFile -Encoding UTF8
    Write-Host "Merged gumpbox entry into $settingsFile"
  }
} else {
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
  Set-Content -Path $settingsFile -Value $config -Encoding UTF8
  Write-Host "Wrote $settingsFile"
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
Write-Host "Done. Restart Gemini CLI to pick up the gumpbox MCP server." -ForegroundColor Green
