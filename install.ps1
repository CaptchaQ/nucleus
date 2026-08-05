# nucleus — one-command installer for a project folder (PowerShell).
#
# Default (no flags): copies AGENTS.md + the entire skills/ tree (all 5
# vendors, 53 upstream skills) INTO THE CURRENT FOLDER. Self-contained —
# the agent reads skills/<vendor>/<name>/SKILL.md right from the project.
#
# Optional -Harness: ALSO copy into the named harness skill dirs so /name
# works via harness skill discovery (in addition to the project copy).
#
# Usage:
#   irm https://raw.githubusercontent.com/CaptchaQ/nucleus/main/install.ps1 | iex
#   .\install.ps1 -Harness opencode
#   .\install.ps1 -Harness opencode,claude-code -Vendors mattpocock,auto-improve

param(
  [string]$Harness = $null,
  [string]$Vendors = "all"
)

$ErrorActionPreference = "Stop"
$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
$SkillsDir = Join-Path $Here "skills"
if (-not (Test-Path $SkillsDir)) {
  # When piped via `irm ... | iex`, $MyInvocation.MyCommand.Path is empty →
  # download installers+AGENTS.md+skills into the current folder from a temp clone.
  $tmp = Join-Path ([System.IO.Path]::GetTempPath()) "nucleus-install-$(Get-Random)"
  git clone --depth 1 https://github.com/CaptchaQ/nucleus $tmp 2>$null
  if (-not (Test-Path (Join-Path $tmp "skills"))) { Write-Error "clone failed"; exit 1 }
  $Here = $tmp; $SkillsDir = Join-Path $Here "skills"
}

function ToList($s) { if ($s -eq "all") { return @("all") }; $s.Split(",") | ForEach-Object { $_.Trim() } }
$vArr = ToList $Vendors; if ($vArr -eq "all") { $vArr = @("mattpocock","auto-improve","ecc","emilkowalski","stitch-skills") }

# --- Step 1: project-local copy (always) ---
Write-Host "== project-local install → $PWD =="
$destSkills = Join-Path $PWD "skills"
New-Item -ItemType Directory -Force -Path $destSkills | Out-Null
foreach ($v in $vArr) {
  $vdir = Join-Path $SkillsDir $v
  if (-not (Test-Path $vdir)) { Write-Warning "vendor '$v' not found"; continue }
  $t = Join-Path $destSkills $v
  if (Test-Path $t) { Remove-Item -Recurse -Force $t }
  Copy-Item -Recurse $vdir $t
  Write-Host "  ✓ skills/$v"
}
$hereMd = Join-Path $Here "AGENTS.md"
if (Test-Path $hereMd) {
  $cwdMd = Join-Path $PWD "AGENTS.md"
  if ($PWD.Path -eq $Here) { Write-Host "  ✓ AGENTS.md already here" }
  elseif ((Test-Path $cwdMd) -and ((Get-FileHash $hereMd).Hash -eq (Get-FileHash $cwdMd).Hash)) { Write-Host "  ✓ AGENTS.md already up to date" }
  else { Copy-Item $hereMd $cwdMd -Force; Write-Host "  ✓ AGENTS.md → $cwdMd" }
}

# --- Step 2 (optional): ALSO install into harness skill dirs ---
if ($Harness) {
  $dirs = @{ "opencode"="\.config\opencode\skills"; "claude-code"="\.claude\skills"; "codex"="\.codex\skills"; "omp"="\.agents\skills" }
  $hArr = ToList $Harness; if ($hArr -eq "all") { $hArr = @("opencode","claude-code","codex","omp") }
  foreach ($h in $hArr) {
    if (-not $dirs.ContainsKey($h)) { Write-Warning "unknown harness '$h'"; continue }
    $dest = Join-Path $HOME $dirs[$h]
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
    foreach ($v in $vArr) {
      $vdir = Join-Path $SkillsDir $v
      if (-not (Test-Path $vdir)) { continue }
      if ($v -eq "auto-improve") {
        $t = Join-Path $dest "auto-improve"; if (Test-Path $t) { Remove-Item -Recurse -Force $t }
        Copy-Item -Recurse $vdir $t; continue
      }
      Get-ChildItem -Directory $vdir | Where-Object {
        $_.Name -ne "LICENSE" -and $_.Name -ne "ATTRIBUTION.md" -and $_.Name -ne "NOTE.md" -and $_.Name -ne "UPSTREAM-AGENTS.md"
      } | ForEach-Object {
        if (Test-Path (Join-Path $_.FullName "SKILL.md")) {
          $t = Join-Path $dest $_.Name
          if (-not (Test-Path $t)) { Copy-Item -Recurse $_.FullName $t }
        }
      }
    }
    Write-Host "  ✓ also installed into $dest"
  }
}

Write-Host ""
Write-Host "Done. Open this folder in your AI agent and say:"
Write-Host "  «хочу создать …, сначала интервью /grilling»"
Write-Host "(skills/ и AGENTS.md лежат прямо в папке проекта — агент найдёт их локально)"