---
name: New skill integration
about: Integrate an external skill source into the catalog
title: "[Skill] integrate "
labels: skills
assignees: ""
---

**Source**

- Repo / URL:
- License:
- Star count (if public):
- Skill format: Agent Skills (SKILL.md) / other

**Why it belongs in the catalog**

What problem does it solve that the current 7 sources don't?

**Integration plan**

- [ ] `SKILL_SOURCES` entry in `src/loader/runner.ts`
- [ ] `ROLE_BY_SKILL` mapping in `src/orchestrator/runner.ts`
- [ ] `PROFILE.md` update for the relevant domain(s)
- [ ] `catalog/index.md` update
- [ ] `npm run reindex` + README table sync

**Acceptance**

`nucleus catalog` lists the new source; `nucleus orchestrate` routes its skills
to the right subagents.