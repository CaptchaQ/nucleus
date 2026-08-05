# nucleus — one-line installer for Windows (PowerShell 5.1+).
#
#   irm https://raw.githubusercontent.com/CaptchaQ/nucleus/main/scripts/install.ps1 | iex
#
# Or locally:
#   powershell -ExecutionPolicy Bypass -File scripts\install.ps1
#
# What it does:
#   1. Requires Node.js >= 18.
#   2. Clones (shallow) this repo into ${NUCLEUS_HOME:-$HOME\.nucleus}.
#   3. npm ci + npm run build -> dist\cli\index.js.
#   4. Creates a `nucleus.cmd` shim and adds it to the *user* PATH.
#   5. Registers the nucleus-agent skill into known agent harnesses
#      (~\.agents\skills, ~\.config\opencode\skills, ~\.claude\skills,
#      ~\.codex\skills).
$ErrorActionPreference = "Stop"

$Repo   = "https://github.com/CaptchaQ/nucleus.git"
$Branch = if ($env:NUCLEUS_BRANCH) { $env:NUCLEUS_BRANCH } else { "main" }
$NucleusHome = if ($env:NUCLEUS_HOME) { $env:NUCLEUS_HOME } else { Join-Path $env:USERPROFILE ".nucleus" }

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "Node.js >= 18 is required (not found). https://nodejs.org"
  exit 1
}

Write-Host "nucleus -> installing to $NucleusHome"

if (-not (Test-Path (Join-Path $NucleusHome "package.json"))) {
  New-Item -ItemType Directory -Force -Path (Split-Path $NucleusHome) | Out-Null
  git clone --depth 1 --branch $Branch $Repo $NucleusHome
} else {
  Write-Host "==> repo present, reusing $NucleusHome"
}

Push-Location $NucleusHome
try {
  npm ci --no-audit --no-fund | Out-Null
  npm run build | Out-Null
} finally {
  Pop-Location
}

# Shims so `nucleus` works from anywhere.
$ShimDir = Join-Path $NucleusHome "bin"
New-Item -ItemType Directory -Force -Path $ShimDir | Out-Null
$Shim = Join-Path $ShimDir "nucleus.cmd"
@"
@echo off
node "%~dp0..\dist\cli\index.js" %*
"@ | Set-Content -Encoding ASCII $Shim

# Add to the *user* PATH (persists; avoids needing admin for machine PATH).
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if (-not $UserPath -or $UserPath -notmatch [regex]::Escape($ShimDir)) {
  $NewPath = if ($UserPath) { ($UserPath.TrimEnd(";") + ";" + $ShimDir) } else { $ShimDir }
  [Environment]::SetEnvironmentVariable("Path", $NewPath, "User")
  Write-Host "==> added $ShimDir to user PATH (open a NEW terminal)"
} else {
  Write-Host "==> $ShimDir already on user PATH"
}

# Register the nucleus-agent skill into known harnesses.
$SkillSrc = Join-Path $NucleusHome "skills\nucleus-agent"
foreach ($h in @(
  (Join-Path $env:USERPROFILE ".agents\skills"),
  (Join-Path $env:USERPROFILE ".config\opencode\skills"),
  (Join-Path $env:USERPROFILE ".claude\skills"),
  (Join-Path $env:USERPROFILE ".codex\skills")
)) {
  New-Item -ItemType Directory -Force -Path $h | Out-Null
  Copy-Item -Recurse -Force -Path $SkillSrc -Destination (Join-Path $h "nucleus-agent")
  Write-Host "==> registered nucleus-agent skill -> $h"
}

Write-Host ""
Write-Host "Done. Open a new terminal, run 'nucleus doctor', then tell your agent:"
Write-Host "  `"создай проект через nucleus`""