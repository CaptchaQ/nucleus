#!/usr/bin/env bash
# nucleus — install: copy skills into agent harnesses + AGENTS.md into cwd.
# Usage: bash install.sh [--harness opencode|claude-code|codex|omp|all]
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_DIR="$HERE/skills"

usage() {
  echo "Usage: bash install.sh [--harness opencode|claude-code|codex|omp|all]"
  echo "Copies skills/ into agent harness skill dirs and AGENTS.md into the current folder."
  exit 1
}

HARNESSES=()
if [[ $# -eq 0 ]]; then
  HARNESSES=(all)
else
  case "$1" in
    --harness) shift; HARNESSES=("$@") ;;
    -h|--help) usage ;;
    *) usage ;;
  esac
fi

if [[ " ${HARNESSES[*]} " == *" all "* ]]; then
  HARNESSES=(opencode claude-code codex omp)
fi

if [[ ! -d "$SKILLS_DIR" ]]; then
  echo "error: skills/ not found next to install.sh ($SKILLS_DIR)" >&2
  exit 1
fi

# harness → skill dir (relative to $HOME)
declare -A DIRS=(
  [opencode]=".config/opencode/skills"
  [claude-code]=".claude/skills"
  [codex]=".codex/skills"
  [omp]=".agents/skills"
)

installed=0
for h in "${HARNESSES[@]}"; do
  rel="${DIRS[$h]:-}"
  if [[ -z "$rel" ]]; then
    echo "warning: unknown harness '$h' (known: opencode claude-code codex omp)" >&2
    continue
  fi
  dest="$HOME/$rel"
  mkdir -p "$dest"
  # copy each skill dir, overwriting
  for skill in "$SKILLS_DIR"/*/; do
    name="$(basename "$skill")"
    cp -r "$skill" "$dest/$name" 2>/dev/null || rm -rf "$dest/$name" && cp -r "$skill" "$dest/$name"
  done
  echo "✓ skills → $dest"
  installed=$((installed + 1))
done

if [[ -f "$HERE/AGENTS.md" ]]; then
  cp "$HERE/AGENTS.md" "$PWD/AGENTS.md"
  echo "✓ AGENTS.md → $PWD/AGENTS.md"
fi

if [[ $installed -eq 0 ]]; then
  echo "error: nothing installed (no matching harnesses)" >&2
  exit 1
fi

echo
echo "Done. Start your agent in this folder and say:"
echo "  «создай проект, сначала интервью» / \"create a project, start with the interview\""
