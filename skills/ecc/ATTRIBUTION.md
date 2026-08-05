# ECC — Attestation

- **Source URL:** https://github.com/affaan-m/ECC
- **Upstream commit SHA:** `f1fec0e53934737d3b3b8388b0fd1651e8b62f4f`
- **Clone date:** 2026-08-05
- **Upstream license:** MIT License (Copyright (c) 2026 Affaan Mustafa) — see `skills/ecc/LICENSE`

## Structure found upstream

The ECC repository exposes skills in two locations:

- `.agents/skills/<name>/SKILL.md` — 39 skill directories (the canonical skill set referenced by the agent plugin).
- `skills/<name>/` — 281 skill directories (a flatter/larger duplicate set).

Skills were vendored from `.agents/skills/`, which is the directory whose `SKILL.md` files carry the authoritative frontmatter and `agents/openai.yaml` supporting files.

## Skills copied into `skills/ecc/`

Only the requested skills that actually exist upstream were copied. `architect` was NOT found in `.agents/skills/` (nor a closely-named equivalent) and was therefore NOT created.

| Directory            | frontmatter `name:` | Files copied |
|----------------------|----------------------|--------------|
| api-design           | `api-design`         | `SKILL.md`, `agents/openai.yaml` |
| security-review      | `security-review`    | `SKILL.md`, `agents/openai.yaml` |
| tdd-workflow         | `tdd-workflow`       | `SKILL.md`, `agents/openai.yaml` |

Note on requested names vs. upstream names:
- `api-design` → present as `api-design`.
- `security-reviewer` → present as `security-review` (upstream omits the `-er` suffix).
- `tdd-guide` → present as `tdd-workflow` (upstream uses `-workflow`, not `-guide`).
- `architect` → NOT present in upstream `.agents/skills/`.

## Other files copied

- `skills/ecc/LICENSE` — verbatim copy of upstream `LICENSE` (MIT).
- `skills/ecc/UPSTREAM-AGENTS.md` — verbatim copy of upstream `AGENTS.md` (the repo's top-level agent-instruction file), kept for reference as requested.

## File count

- Skills copied: 3 directories, 6 files total (3 `SKILL.md` + 3 `agents/openai.yaml`).
- Plus `LICENSE` and `UPSTREAM-AGENTS.md`.

## Integrity

All copied files verified byte-identical to upstream via md5sum (`cp -r`, no string transformations).