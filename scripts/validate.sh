#!/usr/bin/env bash
# nucleus — validate: every core/library skill has frontmatter; AGENTS.md
# and README tables reference every skill that exists. Nested layout:
# skills/<name>/SKILL.md (core) and skills/library/<name>/SKILL.md (library).
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

fail=0
core_names=()
lib_names=()

echo "== core skills =="
for d in skills/*/; do
  name="$(basename "$d")"
  [[ "$name" == "library" ]] && continue
  core_names+=("$name")
  md="$d/SKILL.md"
  [[ -f "$md" ]] || { echo "FAIL: $d missing SKILL.md"; fail=1; continue; }
  head -1 "$md" | grep -q '^---$' || { echo "FAIL: $md no frontmatter (must start with ---)"; fail=1; }
  grep -q '^name: ' "$md" || { echo "FAIL: $md missing 'name:'"; fail=1; }
  grep -q '^description: ' "$md" || { echo "FAIL: $md missing 'description:'"; fail=1; }
  grep -q '^when: ' "$md" || { echo "FAIL: $md missing 'when:'"; fail=1; }
  echo "  ok  core/$name"
done

echo "== library skills =="
if [[ -d skills/library ]]; then
  for d in skills/library/*/; do
    name="$(basename "$d")"
    lib_names+=("$name")
    md="$d/SKILL.md"
    [[ -f "$md" ]] || { echo "FAIL: $d missing SKILL.md"; fail=1; continue; }
    head -1 "$md" | grep -q '^---$' || { echo "FAIL: $md no frontmatter"; fail=1; }
    grep -q '^name: ' "$md" || { echo "FAIL: $md missing 'name:'"; fail=1; }
    grep -q '^description: ' "$md" || { echo "FAIL: $md missing 'description:'"; fail=1; }
    grep -q '^when: ' "$md" || { echo "FAIL: $md missing 'when:'"; fail=1; }
    echo "  ok  library/$name"
  done
fi

echo "== AGENTS.md lists all skills =="
[[ -f AGENTS.md ]] || { echo "FAIL: AGENTS.md missing"; fail=1; }
all=("${core_names[@]}" "${lib_names[@]}")
for name in "${all[@]}"; do
  grep -q "skills/.*$name/SKILL.md" AGENTS.md || { echo "FAIL: AGENTS.md missing skills/$name/SKILL.md"; fail=1; }
done

echo "== README (EN+RU) list all skills =="
for readme in README.md README.ru.md; do
  [[ -f "$readme" ]] || { echo "FAIL: $readme missing"; fail=1; continue; }
  for name in "${all[@]}"; do
    grep -q "skills/.*$name/SKILL.md" "$readme" || { echo "FAIL: $readme missing skills/$name/SKILL.md"; fail=1; }
  done
done

echo "== installers exist =="
[[ -f install.sh ]] || { echo "FAIL: install.sh missing"; fail=1; }
[[ -f install.ps1 ]] || { echo "FAIL: install.ps1 missing"; fail=1; }

if [[ $fail -ne 0 ]]; then
  echo; echo "VALIDATION FAILED"; exit 1
fi
total=$((${#core_names[@]} + ${#lib_names[@]}))
echo; echo "VALIDATION OK (${#core_names[@]} core + ${#lib_names[@]} library = $total skills)"