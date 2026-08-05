---
name: profile-web
description: Default skill bundle for `web` domain projects. Loads grilling/wayfinder, ECC research+req, design taste (emilkowalski), and frontend-gen (stitch) — routed to planner/researcher/implementer/designer subagents.
domains: [web]
---

# profile-web

Recommended skill bundle when the profile domain is `web`.

## External (via `npx skills add <repo>`)

| Source | Skills |
|--------|--------|
| mattpocock/skills | grill-me, grilling, grill-with-docs, wayfinder, tdd, codebase-design, diagnosing-bugs, code-review |
| affaan-m/ECC      | deep-research, e2e-testing, eval-harness, agent-introspection-debugging, coding-standards, backend-patterns, security-scan |
| google-labs-code/stitch-skills | generate-design, react-components, shadcn-ui, extract-design-md, code-to-design |
| emilkowalski/skills | emil-design-eng, review-animations, improve-animations, find-animation-opportunities, pick-ui-library, apple-design |
| crimeacs/auto-improve | auto-improve |

## Data/rubric sources (not installed as skills)

- `f/prompts.chat` — MCP prompt library for role/agent prompts.
- `keepsimple.io/uxcore` — cognitive-bias / nudge rubrics for product UX.

## Subagents produced by `nucleus orchestrate`

planner → researcher → implementer → tester → reviewer → designer/security/docs/improver
(with design subset active for web domain).