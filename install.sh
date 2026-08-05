#!/usr/bin/env bash
# nucleus — one-command installer for a project folder.
#
# Default (no flags): copy AGENTS.md + the entire skills/ tree (all vendors,
# all 53 upstream skills) INTO THE CURRENT FOLDER. Self-contained — the agent
# reads skills/<vendor>/<name>/SKILL.md right from the project. No harness
# config, no global install, no path resolution surprises.
#
# Optional --harness: ALSO copy into the named harness skill dirs so /name
# works via the harness skill discovery (in addition to the project copy).
#
# Usage:
#   bash <(curl -fsSL .../install.sh)            # project-local only (default)
#   bash install.sh --harness opencode          # project-local + opencode global
#   bash install.sh --harness opencode,claude-code --vendors mattpocock,auto-improve
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd)"
SKILLS_DIR="$HERE/skills"
# Running via `bash <(curl ...)` (process-substitution) → BASH_SOURCE[0] is
# /dev/fd/NN and no skills/ sits beside it. Fall back to a temp clone, mirroring
# install.ps1. Same fallback covers the case install.sh was downloaded alone.
if [[ ! -d "$SKILLS_DIR" ]]; then
  _tmp="$(mktemp -d)"
  git clone --depth 1 https://github.com/CaptchaQ/nucleus "$_tmp" >/dev/null 2>&1 \
    || { echo "error: skills/ not local and git clone failed" >&2; exit 1; }
  HERE="$_tmp"; SKILLS_DIR="$HERE/skills"
fi

usage() {
  echo "Usage: bash install.sh [--harness opencode,claude-code,codex,omp,all] [--vendors mattpocock,auto-improve,ecc,emilkowalski,stitch-skills,all]"
  echo "Default: copies AGENTS.md + all skills/ into the current folder (self-contained project)."
  echo "--harness: ALSO installs into those harness skill dirs (so /name works globally too)."
  echo "--vendors: comma list of vendors to include (default all)."
  exit 1
}

HARNESSES=""; VENDORS="all"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --harness) shift; HARNESSES="$1"; shift ;;
    --vendors) shift; VENDORS="$1"; shift ;;
    -h|--help) usage ;;
    *) usage ;;
  esac
done


csv_to_arr() { local s="$1" IFS=','; [[ "$s" == "all" ]] && { echo all; return; }; for x in $s; do echo "$x"; done; }
mapfile -t V_ARR < <(csv_to_arr "$VENDORS")
[[ "${V_ARR[0]}" == "all" ]] && V_ARR=(mattpocock auto-improve ecc emilkowalski stitch-skills)

# --- Step 1: project-local copy (always) ---
echo "== project-local install → $PWD =="
mkdir -p "$PWD/skills"
for v in "${V_ARR[@]}"; do
  vdir="$SKILLS_DIR/$v"
  [[ -d "$vdir" ]] || { echo "warning: vendor '$v' not found" >&2; continue; }
  rm -rf "$PWD/skills/$v"
  cp -r "$vdir" "$PWD/skills/$v"
  echo "  ✓ skills/$v"
done

if [[ -f "$HERE/AGENTS.md" ]]; then
  if [[ "$PWD" == "$HERE" ]]; then
    echo "  ✓ AGENTS.md already here (running from repo)"
  else
    cp "$HERE/AGENTS.md" "$PWD/AGENTS.md"
    echo "  ✓ AGENTS.md → $PWD/AGENTS.md"
  fi
fi

# --- Step 2 (optional): ALSO install into harness skill dirs ---
if [[ -n "$HARNESSES" ]]; then
  declare -A DIRS=(
    [opencode]=".config/opencode/skills"
    [claude-code]=".claude/skills"
    [codex]=".codex/skills"
    [omp]=".agents/skills"
  )
  mapfile -t H_ARR < <(csv_to_arr "$HARNESSES")
  [[ "${H_ARR[0]}" == "all" ]] && H_ARR=(opencode claude-code codex omp)
  for h in "${H_ARR[@]}"; do
    rel="${DIRS[$h]:-}"
    [[ -z "$rel" ]] && { echo "warning: unknown harness '$h'" >&2; continue; }
    dest="$HOME/$rel"; mkdir -p "$dest"
    for v in "${V_ARR[@]}"; do
      vdir="$SKILLS_DIR/$v"
      [[ -d "$vdir" ]] || continue
      if [[ "$v" == "auto-improve" ]]; then
        rm -rf "$dest/auto-improve"; cp -r "$vdir" "$dest/auto-improve"; continue
      fi
      for skill in "$vdir"/*/; do
        name="$(basename "$skill")"
        case "$name" in LICENSE|ATTRIBUTION.md|NOTE.md|UPSTREAM-AGENTS.md) continue ;; esac
        [[ -f "$skill/SKILL.md" ]] || continue
        [[ -d "$dest/$name" ]] && continue
        cp -r "$skill" "$dest/$name"
      done
    done
    echo "  ✓ also installed into $dest"
  done
fi

echo
echo "Done. Open this folder in your AI agent and say:"
echo "  «хочу создать …, сначала интервью /grilling»"
echo "(skills/ и AGENTS.md лежат прямо в папке проекта — агент найдёт их локально)"