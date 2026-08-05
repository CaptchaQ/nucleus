---
name: Pull request
about: Propose a change to nucleus
title: ""
labels: ""
assignees: ""
---

## Summary

What changes and why (one short paragraph). Reference the issue if any:
Fixes #N.

## Changes

- [ ] Core (src/): …
- [ ] Python bridge (python/): …
- [ ] Skills / profiles / catalog: …
- [ ] Docs / README: …
- [ ] CI: …

## Verification

- [ ] `npm run build` — tsc, 0 errors
- [ ] `npm test` — green
- [ ] `npm run reindex` — README skill table in sync (if skills changed)
- [ ] Smoke: `nucleus doctor` / relevant subcommand run and observed

## Tradeoffs

Anything the reviewer should weigh: contracts touched, fallbacks, future work.