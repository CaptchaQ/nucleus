---
name: nucleus-improve
description: GAN-style self-improvement loop for any text artifact in the repo — READMEs, prompts, copy, contracts, rubric-gated. Mutates, grades with a SEPARATE model, keeps only pairwise-judged wins, commits the rest. The git history is the improvement log. Use when the user wants something measurably better, not just rewritten.
user-invocable: true
---

# nucleus-improve

Phase 5 of nucleus: **climb, don't slop.** A GAN-style loop (adapted from
`crimeacs/auto-improve`) that makes a text artifact measurably better:

```
for each iteration:
  MUTATE   → N candidate edits (best-of-N, surgical diffs)
  SCORE    → grade each candidate against a rubric (SEPARATE model)
  DECIDE   → pairwise-judge best vs champion in BOTH orderings (debiased)
  COMMIT   → keep iff it wins; else revert. Git is the log.
```

## When to use

- The user wants a file *measurably* better — not rewritten on a hunch.
- Good fits: READMEs, landing copy, prompts, skill definitions, contracts,
  blog posts, API docs.

## Run it

```bash
# Provide a rubric:
nucleus improve path/to/file.md --tag v1 --criteria criteria/my-rubric.md

# Let nucleus infer the rubric, steered by a goal:
nucleus improve README.md --tag v1 --goal "hero that makes a dev try the CLI"

# Status of a finished run:
python -m nucleus_improve --status --tag v1
```

The Python bridge (`python/nucleus_improve`) shells out to the model. Provider:
`GEMINI_API_KEY` (default) or `OPENAI_API_KEY`. Add `--provider openai`.

The artifact MUST live inside a git repo — keeps and discards are checkpointed.

## The two anti-slop rules (non-negotiable)

1. **Separate judge.** The model that mutates never grades — grading is a fresh
   call against the rubric.
2. **Debiased pairwise gate.** Candidate vs champion, both orderings
   (`[C, X]` and `[X, C]`) to cancel position bias. Kept only when the
   candidate strictly out-votes the champion; ties discarded.

## The rubric (optional but recommended)

Markdown with weighted dimensions totaling 100, anchored (50/70/90),
reward-framed, specific. Omit `--criteria` and one is inferred from the
artifact. A sharper rubric → a higher ceiling: when the climb plateaus, improve
the rubric itself with another nucleus-improve run, then re-run.

## Key rules

- One artifact, one rubric, one `--tag` per run.
- The git branch (`improve/<tag>`) is the source of truth — every commit is a
  verified gain, fully diffable.
- Never edit outside the artifact; surgical diffs, not wholesale rewrites.
- The mutator and evaluator never share context.

## Results

- `results/<tag>.tsv` — the climb log (baseline → keeps → discards).
- `results/<tag>.rubric.md` — the inferred/used rubric.
- `git log improve/<tag>` — the improvement trace.