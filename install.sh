#!/usr/bin/env bash
# nucleus — install: copy skills into agent harness dirs + AGENTS.md into cwd.
# Usage:
#   bash install.sh [--harness opencode|claude-code|codex|omp|all] [--with <cap>]
# --with <cap>  : only copy skills whose name matches the capability glob
#                 (comma-separated). Core is always installed. Library filter
#                 applies to skills/library/<name>/. Examples: --with tdd,debug
# Taken verbatim; do not hand-edit per harness.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_DIR="$HERE/skills"

usage() {
  echo "Usage: bash install.sh [--harness opencode|claude-code|codex|omp|all] [--with tdd,debug,...]"
  echo "Copies skills/ into agent harness skill dirs and AGENTS.md into the current folder."
  echo "Core skills always installed; --with filters skills/library/<name>."
  exit 1
}

HARNESSES=()
WITH=""  # comma-separated filter for library; empty = all
while [[ $# -gt 0 ]]; do
  case "$1" in
    --harness) shift; while [[ $# -gt 0 && "$1" != --* ]]; do HARNESSES+=("$1"); shift; done ;;
    --with) shift; WITH="$1"; shift ;;
    -h|--help) usage ;;
    *) usage ;;
  esac
done

[[ ${#HARNESSES[@]} -eq 0 ]] && HARNESSES=(all)
[[ " ${HARNESSES[*]} " == *" all "* ]] && HARNESSES=(opencode claude-code codex omp)

[[ -d "$SKILLS_DIR" ]] || { echo "error: skills/ not found next to install.sh ($SKILLS_DIR)" >&2; exit 1; }

declare -A DIRS=(
  [opencode]=".config/opencode/skills"
  [claude-code]=".claude/skills"
  [codex]=".codex/skills"
  [omp]=".agents/skills"
)

# Build the list of skill dirs to install: all core + filtered library.
install_skill() {  # dest skill_dir
  local dest="$1" skill="$2"
  local name; name="$(basename "$skill")"
  rm -rf "$dest/$name"
  cp -r "$skill" "$dest/$name"
}

lib_matches() {  # name -> 0 if WITH empty or name matches
  local name="$1"
  [[ -z "$WITH" ]] && return 0
  local IFS=','
  for w in $WITH; do [[ "$w" == "$name" ]] && return 0; done
  return 1
}

installed=0
for h in "${HARNESSES[@]}"; do
  rel="${DIRS[$h]:-}"
  [[ -z "$rel" ]] && { echo "warning: unknown harness '$h'" >&2; continue; }
  dest="$HOME/$rel"
  mkdir -p "$dest"
  # core: skills/<name>/ (skip library/)
  for skill in "$SKILLS_DIR"/*/; do
    name="$(basename "$skill")"
    [[ "$name" == "library" ]] && continue
    install_skill "$dest" "$skill"
  done
  # library: skills/library/<name>/ filtered by --with
  if [[ -d "$SKILLS_DIR/library" ]]; then
    for skill in "$SKILLS_DIR"/library/*/; do
      name="$(basename "$skill")"
      if lib_matches "$name"; then
        install_skill "$dest" "$skill"
      fi
    done
  fi
  echo "✓ skills → $dest"
  installed=$((installed + 1))
done

if [[ -f "$HERE/AGENTS.md" ]]; then
  if [[ "$PWD" == "$HERE" ]]; then
    : # running from repo; AGENTS.md already here
  elif [[ -f "$PWD/AGENTS.md" ]] && cmp -s "$HERE/AGENTS.md" "$PWD/AGENTS.md"; then
    echo "✓ AGENTS.md already up to date ($PWD/AGENTS.md)"
  else
    cp "$HERE/AGENTS.md" "$PWD/AGENTS.md"
    echo "✓ AGENTS.md → $PWD/AGENTS.md"
  fi
else
  echo "warning: AGENTS.md not found next to install.sh" >&2
fi

[[ $installed -eq 0 ]] && { echo "error: nothing installed" >&2; exit 1; }

echo
echo "Done. Start your agent in this folder and say:"
echo "  «создай проект, сначала интервью» / \"create a project, start with the interview\""