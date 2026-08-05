#!/usr/bin/env bash
# nucleus — validate: every skill has proper frontmatter, AGENTS.md and
# README tables list exactly the skills that exist.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

fail=0
skill_names=()

echo "== skills present =="
for d in skills/*/; do
  name="$(basename "$d")"
  skill_names+=("$name")
  md="$d/SKILL.md"
  [[ -f "$md" ]] || { echo "FAIL: $d missing SKILL.md"; fail=1; continue; }
  head -1 "$md" | grep -q '^---$' || { echo "FAIL: $md no frontmatter (must start with ---)"; fail=1; }
  grep -q '^name: ' "$md" || { echo "FAIL: $md missing 'name:' in frontmatter"; fail=1; }
  grep -q '^description: ' "$md" || { echo "FAIL: $md missing 'description:' in frontmatter"; fail=1; }
  echo "  ok  $name"
done

echo "== AGENTS.md lists all skills =="
[[ -f AGENTS.md ]] || { echo "FAIL: AGENTS.md missing"; fail=1; }
for name in "${skill_names[@]}"; do
  grep -q "skills/$name/SKILL.md" AGENTS.md || { echo "FAIL: AGENTS.md missing skills/$name/SKILL.md"; fail=1; }
done

echo "== README (EN+RU) tables list all skills =="
for readme in README.md README.ru.md; do
  [[ -f "$readme" ]] || { echo "FAIL: $readme missing"; fail=1; continue; }
  for name in "${skill_names[@]}"; do
    grep -q "skills/$name/SKILL.md" "$readme" || { echo "FAIL: $readme missing skills/$name/SKILL.md"; fail=1; }
  done
done

echo "== installers reference the right skills dir =="
[[ -f install.sh ]] || { echo "FAIL: install.sh missing"; fail=1; }
grep -q 'SKILLS_DIR=' install.sh || { echo "FAIL: install.sh no SKILLS_DIR"; fail=1; }
[[ -f install.ps1 ]] || { echo "FAIL: install.ps1 missing"; fail=1; }

if [[ $fail -ne 0 ]]; then
  echo; echo "VALIDATION FAILED"; exit 1
fi
echo; echo "VALIDATION OK ($((${#skill_names[@]})) skills)"