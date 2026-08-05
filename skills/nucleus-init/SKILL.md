---
name: nucleus-init
description: Kick start a project by grilling the user into a sharp ProjectProfile, ADR, and CONTEXT glossary before any code is written. Use when the user is starting a new project, says they "want to build something", or wants to bootstrap a plan.
user-invocable: true
---

# nucleus-init

Phase 1 of nucleus: **grill before you build.** The #1 failure mode in AI
development is misalignment — the agent builds what it *thinks* the user wants.
This skill kills that by running a relentless, one-question-at-a-time interview
that pins the destination, the stack decisions, and the shared language BEFORE
any code exists.

## When to use

- The user starts a new project (`"я хочу создать..."`
  / `"I want to build..."`).
- The user asks to "bootstrap", "kick off", or "define what we're building".
- A loose idea arrives and nobody has written a spec yet.

## Run it

```bash
nucleus init
```

The CLI drives the interview. The agent's job is to **ask one question at a
time, wait for the answer, and offer a recommended answer** for each — then
note when it reaches a decision it can look up itself.

## Interview rules (from grill-me / grilling)

1. **One question at a time.** Multiple questions at once is bewildering.
2. **Look up facts, ask only decisions.** The *decisions* are the user's —
   put each to them and wait. Facts (repo contents, env, framework availability)
   you find in the environment yourself.
3. **Walk the decision tree depth-first.** Resolve dependencies between
   decisions one by one (stack depends on destination; harness depends on
   nothing).
4. **Offer a recommended answer** for every question so the user can agree fast
   or override.
5. **Do NOT code yet.** Do not act on the plan until the user confirms shared
   understanding.

## Outputs

`nucleus init` persists:

- `.agent-forge/profile.json` — the `ProjectProfile` (domain, languages,
  frameworks, harness, tracker, decisions, glossary, out-of-scope, fog).
- `docs/adr/0001-destination.md` — a decision record of the destination and
  the decisions locked at kickoff.
- `CONTEXT.md` — the ubiquitous-language glossary the agent and human share.

## Next

Run `nucleus wayfind` (decision tickets) → `nucleus load` (skills) →
`nucleus orchestrate` (subagent DAG).

## Extensibility note

Any of the 7 integrated resources can sharpen a phase:
`mattpocock/skills` grilling/wayfinder, `emilkowalski/skills` taste,
`google-labs-code/stitch-skills` design, `affaan-m/ECC` orchestration,
`keepsimple.io/uxcore` UX rubrics, `f/prompts.chat` role prompts, and
`crimeacs/auto-improve` the improvement loop.