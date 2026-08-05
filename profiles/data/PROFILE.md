---
name: profile-data
description: Default skill bundle for `data` / `ml` domain projects. ECC data/ML patterns + deep-research + eval-harness + auto-improve. Routes to researcher-heavy DAG with slow-model research.
domains: [data, ml]
---

# profile-data

Recommended skill bundle when the profile domain is `data` or `ml`.

## External (via `npx skills add <repo>`)

| Source | Skills |
|--------|--------|
| mattpocock/skills | grill-me, grilling, grill-with-docs, wayfinder, tdd, codebase-design, diagnosing-bugs, code-review |
| affaan-m/ECC      | deep-research, e2e-testing, eval-harness, agent-introspection-debugging, coding-standards, backend-patterns, security-scan |
| crimeacs/auto-improve | auto-improve |

## Data/rubric sources (not installed as skills)

- `f/prompts.chat` — MCP prompt library.

## Notes

The orchestrator gives the `researcher` subagent a `slow` model hint on
data/ml domains — research quality matters more than latency here.

## Subagents produced by `nucleus orchestrate`

planner → researcher(slow) → implementer → tester → reviewer →
security/docs/improver.