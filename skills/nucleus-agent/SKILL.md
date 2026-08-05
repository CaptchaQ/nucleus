---
name: nucleus-agent
description: How a coding agent (opencode, omp, claude-code, codex, cursor) bootstraps a new project through the nucleus pipeline. Use when the user says "создай проект через nucleus" / "create a project with nucleus" / "use nucleus" — the agent runs the interview itself, feeds answers to nucleus, and consumes profile/wayfinder/bundle/orchestration artifacts to build the project.
user-invocable: true
---

# nucleus-agent

You (the agent) are the driver. The user only talks to YOU — never to the
nucleus CLI directly. Your job: run the nucleus pipeline non-interactively and
use its artifacts as the blueprint for building the project.

## When to use

- The user says "создай проект через nucleus", "прогони через nucleus",
  "use nucleus to kick off X", "сделай проект по нашей утилите".
- The user wants a new project bootstrapped with the grill → wayfind →
  load → orchestrate flow.

## The pipeline (all non-interactive — you ask the questions, nucleus records)

### 1. Get the question bank

```bash
nucleus init --questions
```

> **Fast path:** if the user wants a quick start with defaults (no interview
> yet) — e.g. they already ran `nucleus bootstrap` in the folder — skip to the
> artifacts: `profile.json`, `wayfinder.json`, `bundle.json`,
> `orchestration.json` and `AGENTS.md` are already on disk. Read them, then
> jump to step 7. To redo the interview, run `nucleus init --answers answers.json`
> with the fresh answers — it replaces the profile.

Prints JSON: `[{id, layer, prompt, recommend?, dependsOn?, domains?, help?}]`.

### 2. Run the interview yourself

Walk the questions **one at a time**, in dependency order (respect
`dependsOn`; skip questions whose `domains` exclude the chosen domain).
Ask the user in your own chat, offer the `recommend` value as default.
Look up facts yourself; ask only decisions. Do NOT code yet.

### 3. Submit answers

Write the answers as a flat JSON object `{questionId: string}` and run:

```bash
nucleus init --answers answers.json
```

Creates `.agent-forge/profile.json`, `docs/adr/0001-destination.md`,
`CONTEXT.md`. (Omitting a key falls back to its `recommend` in the profile
builder — you may answer only what matters.)

### 4. Chart the wayfinder map

```bash
nucleus wayfind --json
```

Creates/prints `.agent-forge/wayfinder.json` — decision tickets
(research / prototype / grilling / task). Resolve tickets the same way:
read the frontier, ask the user, and resolve. A ticket resolved with "OOS"
is ruled out of scope.

### 5. Load the skill bundle

```bash
nucleus load            # assemble overlay + builtin + external refs
nucleus load --install  # also attempt `npx skills add <repo>` for externals
```

Creates `.agent-forge/bundle.json` — skill refs per source, filtered by the
profile's domain.

### 6. Build the orchestration

```bash
nucleus orchestrate
```

Creates `.agent-forge/orchestration.json` — the subagent DAG: roles, the
skills each role consults, and downstream edges.

### 7. Build the project from the artifacts

Now you have the blueprint. Follow `profile.json` (stack, glossary,
out-of-scope), respect the tickets in `wayfinder.json`, and execute the DAG
from `orchestration.json`: spawn subagents per role (planner → researcher →
implementer → tester → reviewer → docs/improver), each consulting its
`skillRefs`. Use `.agent-forge/memory/` for shared state between agents.

## Rules

1. **The user talks to you, not to the CLI.** Never hand the user raw
   terminal prompts from nucleus; relay questions in your own words.
2. **One question at a time.** Multiple simultaneous questions bewilder.
3. **Decisions to the user, facts to yourself.** Look up what you can.
4. **Never code before the interview is done.** The profile is the contract.
5. **After building, run `nucleus improve <file> --tag v1 --goal <g>`** on key
   artifacts (README, prompts) if the user wants measurable quality gains.
6. **Extensibility:** user skills live in `.agent-forge/skills/<name>/`
   (scaffold via `nucleus skill add <name>`) and are picked up by `nucleus load`
   automatically.

## Example transcript (agent-driven)

```
User:  создай проект для заметок через nucleus
Agent: Ок. Быстрые вопросы, по одному:
       1) Как называется проект? (рекомендация: —)
User:  tasknote
Agent: 2) Что значит «дойти до конца»? ...
User:  веб-приложение заметок с авторизацией и поиском
Agent: 3) Область: web / ui / backend / fullstack / data / cli / mobile / infra / content?
User:  fullstack
Agent: 4) Языки? Фреймворки? ...
... (each question, one at a time)
Agent: (writes answers.json, runs init --answers, wayfind --json, load,
       orchestrate — then) Готово. План: карта из 4 решений, DAG из 8
       субагентов, 32 скила. Начинаю с planner → ...
```