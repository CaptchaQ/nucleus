---
name: profile-backend
description: Default skill bundle for `backend` domain projects. Loads grilling/wayfinder, ECC research+security+backend-patterns, and auto-improve. Routes to planner/researcher/implementer/security/reviewer subagents.
domains: [backend]
---

# profile-backend

Recommended skill bundle when the profile domain is `backend`.

## External (via `npx skills add <repo>`)

| Source | Skills |
|--------|--------|
| mattpocock/skills | grill-me, grilling, grill-with-docs, wayfinder, tdd, codebase-design, diagnosing-bugs, code-review |
| affaan-m/ECC      | deep-research, e2e-testing, eval-harness, agent-introspection-debugging, coding-standards, backend-patterns, security-scan |
| crimeacs/auto-improve | auto-improve |

## Data/rubric sources (not installed as skills)

- `f/prompts.chat` — MCP prompt library.
- `keepsimple.io/uxcore` — behavioral rubrics where the backend shapes product
  decisions.

## Subagents produced by `nucleus orchestrate`

planner → researcher → implementer → tester → reviewer → security/docs/improver
(security active for backend domain).