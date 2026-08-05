<p align="center">
  <img src="assets/nucleus-banner.svg" alt="nucleus — skills for AI coding agents" width="780">
</p>

# nucleus — skills for AI coding agents

nucleus is a **set of SKILL.md** (plus a system prompt `AGENTS.md`) for AI
coding agents: opencode, claude-code, codex, omp. When you say "I want to
build X", the agent **interviews you first** (design-tree with a frontier),
**records a profile**, then **loads project skills** matched to your
stack/domain and **orchestrates subagents** for autonomous work.

No CLI, no npm packages, no build — just instruction files.

## idea → ship

```
setup → grilling → stitch → (wayfinder|spec) → implement → review → ship
                                                       ↘ improve (GAN loop)
                                                       ↘ orchestrate (subagents)
```

1. **`/setup`** — once per project: issue tracker, labels, docs location.
2. **`/grilling`** — relentless interview via a design tree (rounds, frontier,
   recommended answers). Facts are the agent's job, decisions are yours.
   Output: `.agent-forge/profile.json`, `CONTEXT.md`, ADRs.
3. **`/stitch`** — load library skills matched to domain/stack.
4. **`/wayfinder`** — for big/foggy projects: a map of decision tickets.
5. **`/spec`** — fold the conversation into a buildable spec on the tracker.
6. **`/implement`** (driving `/tdd` from the library), closed by **`/review`**
   (two axes: Standards+Spec, via parallel subagents).
7. **`/improve`** — GAN-style refinement loop (judge ≠ mutator, pairwise
   gate, three anti-stall stops).
8. **`/orchestrate`** — for large work: roles (planner/implementer/reviewer/…)
   and parallel subagents with self-contained plans.

## Core skills (`skills/<name>/SKILL.md`)

| Skill | When to use |
|------|-------------|
| `skills/setup/SKILL.md` | First-time project setup (tracker/labels/docs) |
| `skills/grilling/SKILL.md` | Design-tree interview before any code; writes profile.json/CONTEXT.md/ADR |
| `skills/stitch/SKILL.md` | After grilling — load library skills for the domain/stack |
| `skills/wayfinder/SKILL.md` | Big/foggy project — a map of decision tickets |
| `skills/spec/SKILL.md` | After grilling/wayfinder — a buildable spec from the conversation |
| `skills/orchestrate/SKILL.md` | Large stage — distribute across roles and subagents |
| `skills/review/SKILL.md` | Two-axis code review of a diff with fresh subagents |
| `skills/improve/SKILL.md` | GAN-style refinement (mutator/judge/pairwise/checkpoint) |
| `skills/domain/SKILL.md` | Actively maintain CONTEXT.md (glossary) and ADRs |
| `skills/skill-add/SKILL.md` | Author a new skill in skills/ or skills/library/ |

## Library, loaded per project (`skills/library/<name>/SKILL.md`)

| Skill | When to use |
|------|-------------|
| `skills/library/tdd/SKILL.md` | red→green loop, seams, vertical slices |
| `skills/library/debug/SKILL.md` | Stubborn bugs — tight red loop, gated phases |
| `skills/library/ux-review/SKILL.md` | UI/UX edits — frequency-gate, Before/After/Why, Block/Approve |
| `skills/library/api-design/SKILL.md` | API/contract design — deep modules, canonical errors |
| `skills/library/prototype/SKILL.md` | Design question needs a runnable answer — throwaway, N variants |

New skill → `skill-add`. Load for a project → `stitch`.

## Quick start

```bash
# POSIX — all harnesses, full library
bash <(curl -fsSL https://raw.githubusercontent.com/CaptchaQ/nucleus/main/install.sh)

# Only part of the library for your stack
bash install.sh --harness opencode --with tdd,debug,prototype

# Windows PowerShell
irm https://raw.githubusercontent.com/CaptchaQ/nucleus/main/install.ps1 | iex
```

The installer copies **core** (always) + the chosen **library** slice
(`--with`) into the harness skill dirs and drops `AGENTS.md` into the current
folder.

| Harness | Dir |
|---------|-----|
| opencode | `~/.config/opencode/skills/` |
| claude-code | `~/.claude/skills/` |
| codex | `~/.codex/skills/` |
| omp | `~/.agents/skills/` |

Run your agent in the project folder and say: "create a project, start with
the interview".

## Project artifacts (`.agent-forge/`)

| File | What it is |
|------|------------|
| `setup.json` | Project config: harness, tracker, labels, docs paths |
| `profile.json` | The contract from the interview: destination, domain, stack, outOfScope, glossary |
| `skills.json` | Manifest: active library skills + reason |
| `improvements.md` | Log of improve cycles and debug post-mortems |
| `plans/` | Self-contained plans from orchestrate |

## Sources of mechanics

grilling/wayfinder/domain/to-spec/tdd/review — [mattpocock/skills](https://github.com/mattpocock/skills) · per-project skill loading — [affaan-m/ECC](https://github.com/affaan-m/ECC) · frequency-gate, strict output, audit-then-plan — [emilkowalski/skills](https://github.com/emilkowalski/skills) · GAN refinement loop — [crimeacs/auto-improve](https://github.com/crimeacs/auto-improve) · prompt parameterization & auto-activation — [f/prompts.chat](https://github.com/f/prompts.chat) · UX heuristics — [keepsimple.io/ru/uxcore](https://keepsimple.io/ru/uxcore) · baton skill composition — [google-labs-code/stitch-skills](https://github.com/google-labs-code/stitch-skills).

## License

[MIT](LICENSE).