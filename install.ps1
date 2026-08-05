# nucleus — thin orchestrator installer (PowerShell).
# Copies vendored upstream skills into agent harness skill dirs + AGENTS.md into cwd.
# Usage:
#   .\install.ps1 [-Harness opencode,claude-code,codex,omp,all] [-Vendors mattpocock,auto-improve,ecc,emilkowalski,stitch-skills,all]

param(
  [string]$Harness = "all",
  [string]$Vendors = "all"
)

$ErrorActionPreference = "Stop"
$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
$SkillsDir = Join-Path $Here "skills"

if (-not (Test-Path $SkillsDir)) { Write-Error "skills/ not found"; exit 1 }

$dirs = @{
  "opencode"="\.config\opencode\skills"; "claude-code"="\.claude\skills";
  "codex"="\.codex\skills"; "omp"="\.agents\skills"
}

function ToList($s) {
  if ($s -eq "all") { return @("all") }
  return $s.Split(",") | ForEach-Object { $_.Trim() }
}

$hArr = ToList $Harness; if ($hArr -eq "all") { $hArr = @("opencode","claude-code","codex","omp") }
$vArr = ToList $Vendors; if ($vArr -eq "all") { $vArr = @("mattpocock","auto-improve","ecc","emilkowalski","stitch-skills") }

function Install-Vendor($dest, $vdir) {
  $vname = Split-Path -Leaf $vdir
  if ($vname -eq "auto-improve") {
    $t = Join-Path $dest "auto-improve"
    if (Test-Path $t) { Remove-Item -Recurse -Force $t }
    Copy-Item -Recurse $vdir $t; return
  }
  Get-ChildItem -Directory $vdir | Where-Object {
    $_.Name -ne "LICENSE" -and $_.Name -ne "ATTRIBUTION.md" -and $_.Name -ne "NOTE.md" -and $_.Name -ne "UPSTREAM-AGENTS.md"
  } | ForEach-Object {
    if (Test-Path (Join-Path $_.FullName "SKILL.md")) {
      $name = $_.Name
      $t = Join-Path $dest $name
      if (Test-Path $t) { Write-Host "  skip $name (already present)"; return }
      Copy-Item -Recurse $_.FullName $t
    }
  }
}

$installed = 0
foreach ($h in $hArr) {
  if (-not $dirs.ContainsKey($h)) { Write-Warning "unknown harness '$h'"; continue }
  $dest = Join-Path $HOME $dirs[$h]
  New-Item -ItemType Directory -Force -Path $dest | Out-Null
  foreach ($v in $vArr) {
    $vdir = Join-Path $SkillsDir $v
    if (-not (Test-Path $vdir)) { Write-Warning "vendor '$v' not found"; continue }
    Install-Vendor $dest $vdir
  }
  Write-Host "✓ skills -> $dest"
  $installed++
}

$hereMd = Join-Path $Here "AGENTS.md"
if (Test-Path $hereMd) {
  $cwdMd = Join-Path $PWD "AGENTS.md"
  if ($PWD.Path -eq $Here) {
  } elseif ((Test-Path $cwdMd) -and ((Get-FileHash $hereMd).Hash -eq (Get-FileHash $cwdMd).Hash)) {
    Write-Host "✓ AGENTS.md already up to date"
  } else {
    Copy-Item $hereMd $cwdMd -Force
    Write-Host "✓ AGENTS.md -> $cwdMd"
  }
}

if ($installed -eq 0) { Write-Error "nothing installed"; exit 1 }
Write-Host ""
Write-Host "Done. nucleus is a thin orchestrator — start your agent and say:"
Write-Host "  «хочу создать …, сначала интервью /grilling»"