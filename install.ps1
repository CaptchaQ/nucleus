# nucleus — install: copy skills into agent harness skill dirs + AGENTS.md into cwd.
# Usage:
#   .\install.ps1 [-Harness opencode|claude-code|codex|omp|all] [-With tdd,debug,...]
# Core skills always installed; -With filters skills/library/<name>.

param(
  [string[]]$Harness = @("all"),
  [string]$With = $null
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

if ($Harness -contains "all") { $Harness = @("opencode","claude-code","codex","omp") }

$withSet = @{}
if ($With) { $With.Split(",") | ForEach-Object { $withSet[$_.Trim()] = $true } }

function Install-Skill($dest, $skillDir) {
  $name = Split-Path -Leaf $skillDir
  $target = Join-Path $dest $name
  if (Test-Path $target) { Remove-Item -Recurse -Force $target }
  Copy-Item -Recurse $skillDir $target
}

function Lib-Matches($name) {
  if (-not $With) { return $true }
  return $withSet.ContainsKey($name)
}

$installed = 0
foreach ($h in $Harness) {
  if (-not $dirs.ContainsKey($h)) { Write-Warning "unknown harness '$h'"; continue }
  $dest = Join-Path $HOME $dirs[$h]
  New-Item -ItemType Directory -Force -Path $dest | Out-Null
  # core
  Get-ChildItem -Directory $SkillsDir | Where-Object { $_.Name -ne "library" } | ForEach-Object {
    Install-Skill $dest $_.FullName
  }
  # library (filtered)
  $libRoot = Join-Path $SkillsDir "library"
  if (Test-Path $libRoot) {
    Get-ChildItem -Directory $libRoot | Where-Object { Lib-Matches $_.Name } | ForEach-Object {
      Install-Skill $dest $_.FullName
    }
  }
  Write-Host "✓ skills -> $dest"
  $installed++
}

if (Test-Path (Join-Path $Here "AGENTS.md")) {
  $hereMd = Join-Path $Here "AGENTS.md"
  $cwdMd = Join-Path $PWD "AGENTS.md"
  if ($PWD.Path -eq $Here) {
    # running from repo; nothing to copy
  } elseif ((Test-Path $cwdMd) -and ((Get-FileHash $hereMd).Hash -eq (Get-FileHash $cwdMd).Hash)) {
    Write-Host "✓ AGENTS.md already up to date ($cwdMd)"
  } else {
    Copy-Item $hereMd $cwdMd -Force
    Write-Host "✓ AGENTS.md -> $cwdMd"
  }
}

if ($installed -eq 0) { Write-Error "nothing installed"; exit 1 }

Write-Host ""
Write-Host "Done. Start your agent in this folder and say:"
Write-Host "  «создай проект, сначала интервью» / 'create a project, start with the interview'"