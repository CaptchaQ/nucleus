---
name: profile-ui
description: Default skill bundle for `ui` domain projects. Heaviest design investment: emilkowalski taste + stitch design-gen + uxcore rubrics + ECC e2e. Routes to designer/tester/reviewer-heavy DAG.
domains: [ui]
---

# profile-ui

Recommended skill bundle when the profile domain is `ui`.

## External (via `npx skills add <repo>`)

| Source | Skills |
|--------|--------|
| mattpocock/skills | grill-me, grilling, grill-with-docs, wayfinder, tdd, codebase-design, diagnosing-bugs, code-review |
| affaan-m/ECC      | deep-research, e2e-testing, eval-harness, agent-introspection-debugging, coding-standards, security-scan |
| google-labs-code/stitch-skills | generate-design, react-components, shadcn-ui, extract-design-md, code-to-design |
| emilkowalski/skills | emil-design-eng, review-animations, improve-animations, find-animation-opportunities, pick-ui-library, apple-design |
| crimeacs/auto-improve | auto-improve |

## Data/rubric sources (not installed as skills)

- `f/prompts.chat` — MCP prompt library.
- `keepsimple.io/uxcore` — cognitive-bias / nudge rubrics (first-class for UX).

## Subagents produced by `nucleus orchestrate`

planner → researcher → design(er) → tester → reviewer → security/docs/improver.
Designer is first-class here; the animation-taste and stitch skills route to it.