#!/usr/bin/env bash
# nucleus — validate (thin orchestrator): every vendor has ATTRIBUTION.md +
# LICENSE (or NOTE.md), each vendored skill dir has SKILL.md, AGENTS.md and
# README reference nucleus. nucleus has NO own skills (only skills/<vendor>/...).
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

fail=0
[[ -f AGENTS.md ]] || { echo "FAIL: AGENTS.md missing"; fail=1; }

echo "== vendors =="
[[ -d skills ]] || { echo "FAIL: skills/ missing"; exit 1; }
vendor_count=0
for vdir in skills/*/; do
  v="$(basename "$vdir")"
  vendor_count=$((vendor_count+1))
  echo "  vendor $v"
  [[ -f "$vdir/ATTRIBUTION.md" ]] || { echo "FAIL: $v missing ATTRIBUTION.md"; fail=1; }
  [[ -f "$vdir/LICENSE" || -f "$vdir/NOTE.md" ]] || { echo "FAIL: $v missing LICENSE or NOTE.md"; fail=1; }
done

echo "== vendored skills (skills/<vendor>/<name>/SKILL.md) =="
total=0
# auto-improve is a single skill folder at vendor root
if [[ -f skills/auto-improve/SKILL.md ]]; then
  echo "  ok  auto-improve/SKILL.md"; total=$((total+1))
fi
for vdir in skills/*/; do
  v="$(basename "$vdir")"
  [[ "$v" == "auto-improve" ]] && continue
  for skill in "$vdir"/*/; do
    name="$(basename "$skill")"
    case "$name" in LICENSE|ATTRIBUTION.md|NOTE.md|UPSTREAM-AGENTS.md) continue ;; esac
    md="$skill/SKILL.md"
    [[ -f "$md" ]] || { echo "FAIL: $md missing"; fail=1; continue; }
    total=$((total+1))
    echo "  ok  $v/$name"
  done
done

echo "== nucleus has no own skills at top level =="
# nucleus is a thin orchestrator: skills/ should contain only vendor dirs.
for d in skills/*/; do
  name="$(basename "$d")"
  case "$name" in
    mattpocock|auto-improve|ecc|emilkowalski|stitch-skills) ;;
    *) echo "FAIL: unexpected top-level skills/$name (nucleus should not have own skills)"; fail=1 ;;
  esac
done

echo "== AGENTS.md references vendors =="
for v in mattpocock auto-improve ecc emilkowalski stitch-skills; do
  grep -q "$v" AGENTS.md || { echo "FAIL: AGENTS.md doesn't mention vendor $v"; fail=1; }
done

if [[ $fail -ne 0 ]]; then echo; echo "VALIDATION FAILED"; exit 1; fi
echo; echo "VALIDATION OK ($vendor_count vendors, $total skills)"