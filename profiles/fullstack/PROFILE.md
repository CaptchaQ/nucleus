---
name: profile-fullstack
description: Default skill bundle for `fullstack` domain projects. Union of web + backend bundles plus the full design/UX/security set. Routes to the widest DAG.
domains: [fullstack]
---

# profile-fullstack

Recommended skill bundle when the profile domain is `fullstack` (the default
when the interviewer can't tell).

## External (via `npx skills add <repo>`)

| Source | Skills |
|--------|--------|
| mattpocock/skills | grill-me, grilling, grill-with-docs, wayfinder, tdd, codebase-design, diagnosing-bugs, code-review |
| affaan-m/ECC      | deep-research, e2e-testing, eval-harness, agent-introspection-debugging, coding-standards, backend-patterns, security-scan |
| google-labs-code/stitch-skills | generate-design, react-components, shadcn-ui, extract-design-md, code-to-design |
| emilkowalski/skills | emil-design-eng, review-animations, improve-animations, find-animation-opportunities, pick-ui-library, apple-design |
| crimeacs/auto-improve | auto-improve |

## Data/rubric sources (not installed as skills)

- `f/prompts.chat` — MCP prompt library.
- `keepsimple.io/uxcore` — cognitive-bias / nudge rubrics.

## Subagents produced by `nucleus orchestrate`

planner → researcher → implementer → tester → reviewer →
designer/security/docs/improver — the full roster.