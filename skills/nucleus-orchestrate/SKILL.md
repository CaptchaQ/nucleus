---
name: nucleus-orchestrate
description: Spin up a subagent DAG from the loaded skill bundle — planner, researcher, implementer, reviewer, tester, designer, security, docs, improver — each consulting its relevant skills, with shared memory and explicit downstream edges. Use after a skill bundle is loaded.
user-invocable: true
---

# nucleus-orchestrate

Phase 4 of nucleus: **turn skills into a working team.** The orchestrator maps
each loaded skill to the agent role that should consult it, then builds a DAG —
where *downstream* edges are peer work, and *memory* is a shared store that
survives across sessions and agents.

## When to use

- The skill bundle is assembled (`nucleus load` done).
- You want work to run "on automatic" across specialized subagents instead of
  one giant context window.

## Run it

```bash
nucleus load          # assemble the skill bundle (phase 3)
nucleus orchestrate   # build the subagent DAG (phase 4)
```

Output: `.agent-forge/orchestration.json` — the DAG + memory store pointer.

## Agent roster

| Role | Consulted skill sources | Owns |
|------|------------------------|------|
| planner   | grill-me, grilling, wayfinder, codebase-design | destination → ticket sequence |
| researcher| deep-research, documentation-lookup | facts decisions wait on |
| implementer | tdd, diagnosing-bugs, coding-standards, backend-patterns | code behind tests, build repair |
| reviewer  | code-review | fresh-context review of every change |
| tester    | tdd, e2e-testing, eval-harness | red-green-refactor, e2e |
| designer  | emil-design-eng, review-animations, generate-design, shadcn-ui | UI feel, polish, animation |
| security  | security-scan | threat surface |
| docs      | — | CONTEXT.md, ADRs, CHANGELOG |
| improver  | auto-improve | rubric-gated improvement of artifacts |

## Rules

1. **Delegate, don't shrink.** Under scope pressure, spin out agents — never
   abandon phases.
2. **Persist everything else; optimize the context window.** Memory lives under
   `.agent-forge/memory/` so a session can resume without re-reading.
3. **Downstream edges are the DAG.** An implementer's work flows to
   tester → reviewer; reviewer's feedback flows to docs/improver. Use peer
   messaging (`hub`-style send/wait) for agent-to-agent handoffs.
4. **Keep fan-out at the concurrency cap.** Never serialize slices that can run
   concurrently; never pad the batch with invented slices.

## Extensibility note

The role→skill table (`ROLE_BY_SKILL`) is a plain `Record` — adding a skill to
the catalog automatically lands it on the right agent. User skills added via
`nucleus skill add` are picked up by the overlay scan with no code change.