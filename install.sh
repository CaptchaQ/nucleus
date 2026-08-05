#!/usr/bin/env bash
# nucleus — thin orchestrator installer.
# Copies vendored upstream skills (skills/<vendor>/<name>/...) into agent
# harness skill directories, and drops AGENTS.md into cwd.
# Usage:
#   bash install.sh [--harness opencode,claude-code,codex,omp,all] [--vendors mattpocock,auto-improve,ecc,emilkowalski,stitch-skills,all]
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_DIR="$HERE/skills"

usage() {
  echo "Usage: bash install.sh [--harness opencode,claude-code,codex,omp,all] [--vendors mattpocock,auto-improve,ecc,emilkowalski,stitch-skills,all]"
  echo "Copies vendored upstream skills into harness skill dirs and AGENTS.md into cwd."
  echo "Vendored skills are real upstream files (mattpocock/skills, ECC, auto-improve,"
  echo "emilkowalski/skills, stitch-skills). nucleus is a thin orchestrator."
  exit 1
}

HARNESSES=all; VENDORS=all
while [[ $# -gt 0 ]]; do
  case "$1" in
    --harness) shift; HARNESSES="$1"; shift ;;
    --vendors) shift; VENDORS="$1"; shift ;;
    -h|--help) usage ;;
    *) usage ;;
  esac
done

csv_to_arr() {  # echoes items one per line
  local s="$1" IFS=','
  [[ "$s" == "all" ]] && { echo all; return; }
  for x in $s; do echo "$x"; done
}

mapfile -t H_ARR < <(csv_to_arr "$HARNESSES")
[[ "${H_ARR[0]}" == "all" ]] && H_ARR=(opencode claude-code codex omp)
mapfile -t V_ARR < <(csv_to_arr "$VENDORS")
[[ "${V_ARR[0]}" == "all" ]] && V_ARR=(mattpocock auto-improve ecc emilkowalski stitch-skills)

[[ -d "$SKILLS_DIR" ]] || { echo "error: skills/ not found next to install.sh" >&2; exit 1; }

declare -A DIRS=(
  [opencode]=".config/opencode/skills"
  [claude-code]=".claude/skills"
  [codex]=".codex/skills"
  [omp]=".agents/skills"
)

# install one vendor folder into a harness dest
install_vendor() {  # dest vendor_dir
  local dest="$1" vdir="$2"
  local vname; vname="$(basename "$vdir")"
  # copy every skill subdir (those that contain SKILL.md somewhere) flat into dest/<name>/
  if [[ "$vname" == "auto-improve" ]]; then
    # auto-improve is a single skill folder with SKILL.md + improve.py + criteria/
    rm -rf "$dest/auto-improve"
    cp -r "$vdir" "$dest/auto-improve"
    return
  fi
  # vendor/<name>/SKILL.md (flattened) → dest/<name>/
  for skill in "$vdir"/*/; do
    name="$(basename "$skill")"
    case "$name" in LICENSE|ATTRIBUTION.md|NOTE.md|UPSTREAM-AGENTS.md) continue ;; esac
    [[ -f "$skill/SKILL.md" ]] || continue
    # avoid clobbering an earlier vendor's same-named skill: first wins
    if [[ -d "$dest/$name" ]]; then
      echo "  skip $name (already present, $vname)" >&2
      continue
    fi
    cp -r "$skill" "$dest/$name"
  done
}

installed=0
for h in "${H_ARR[@]}"; do
  rel="${DIRS[$h]:-}"
  [[ -z "$rel" ]] && { echo "warning: unknown harness '$h'" >&2; continue; }
  dest="$HOME/$rel"
  mkdir -p "$dest"
  for v in "${V_ARR[@]}"; do
    vdir="$SKILLS_DIR/$v"
    [[ -d "$vdir" ]] || { echo "warning: vendor '$v' not found in skills/" >&2; continue; }
    install_vendor "$dest" "$vdir"
  done
  echo "✓ skills → $dest"
  installed=$((installed + 1))
done

if [[ -f "$HERE/AGENTS.md" ]]; then
  if [[ "$PWD" == "$HERE" ]]; then
    :
  elif [[ -f "$PWD/AGENTS.md" ]] && cmp -s "$HERE/AGENTS.md" "$PWD/AGENTS.md"; then
    echo "✓ AGENTS.md already up to date"
  else
    cp "$HERE/AGENTS.md" "$PWD/AGENTS.md"
    echo "✓ AGENTS.md → $PWD/AGENTS.md"
  fi
fi

[[ $installed -eq 0 ]] && { echo "error: nothing installed" >&2; exit 1; }

echo
echo "Done. nucleus is a thin orchestrator — start your agent and say:"
echo "  «хочу создать …, сначала интервью /grilling»"