# nucleus — install: copy skills into agent harnesses + AGENTS.md into cwd.
# Usage: .\install.ps1 [-Harness opencode|claude-code|codex|omp|all]

param(
  [string[]]$Harness = @("all")
)

$ErrorActionPreference = "Stop"
$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
$SkillsDir = Join-Path $Here "skills"

if (-not (Test-Path $SkillsDir)) {
  Write-Error "skills/ not found next to install.ps1 ($SkillsDir)"
  exit 1
}

$dirs = @{
  "opencode"    = ".config/opencode/skills"
  "claude-code" = ".claude/skills"
  "codex"       = ".codex/skills"
  "omp"         = ".agents/skills"
}

if ($Harness -contains "all") { $Harness = @("opencode", "claude-code", "codex", "omp") }

$installed = 0
foreach ($h in $Harness) {
  if (-not $dirs.ContainsKey($h)) {
    Write-Warning "unknown harness '$h' (known: opencode claude-code codex omp)"
    continue
  }
  $dest = Join-Path $HOME $dirs[$h]
  New-Item -ItemType Directory -Force -Path $dest | Out-Null
  Get-ChildItem -Directory $SkillsDir | ForEach-Object {
    $target = Join-Path $dest $_.Name
    if (Test-Path $target) { Remove-Item -Recurse -Force $target }
    Copy-Item -Recurse $_.FullName $target
  }
  Write-Host "✓ skills -> $dest"
  $installed++
}

if (Test-Path (Join-Path $Here "AGENTS.md")) {
  Copy-Item (Join-Path $Here "AGENTS.md") (Join-Path $PWD "AGENTS.md") -Force
  Write-Host "✓ AGENTS.md -> $PWD\AGENTS.md"
}

if ($installed -eq 0) {
  Write-Error "nothing installed (no matching harnesses)"
  exit 1
}

Write-Host ""
Write-Host "Done. Start your agent in this folder and say:"
Write-Host "  «создай проект, сначала интервью» / ""create a project, start with the interview"""
