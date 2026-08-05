---
name: nucleus-wayfind
description: Chart a big effort as a shared map of decision tickets on the issue tracker, and resolve them one at a time until the way to the destination is clear. Use when a project is too big to hold in one session, or decisions are still foggy after grilling.
user-invocable: true
---

# nucleus-wayfind

Phase 2 of nucleus: **wayfind, don't charge.** A loose idea bigger than one
agent session needs a shared *map* of **decision tickets** — questions whose
resolution is a decision, not slices of a build to execute. The map is a single
artifact listing Decisions-so-far and pointing at each ticket's detail.

## When to use

- The grilling produced a destination, but the route is still foggy.
- The work is too big for one agent session.
- You want concurrent agents to work the frontier without stepping on each other.

## Run it

```bash
# First time — chart the initial frontier of tickets
nucleus wayfind

# Each subsequent time — resolve the next frontier ticket interactively
nucleus wayfind
```

The map lives at `.agent-forge/wayfinder.json`. The default provider is `local`
(zero-dep, in-repo). GitHub/Linear adapters plug into `TrackerProvider`.

## Ticket types

| Type      | Mode | Resolution |
|-----------|------|------------|
| research  | AFK  | facts a decision waits on (spawn a `/research` subagent) |
| prototype | HITL | a cheap concrete artifact for the human to react to |
| grilling  | HITL | one question at a time, live exchange |
| task      | HITL/AFK | manual work that unblocks a decision |

## Rules (from wayfinder)

1. **Plan, don't do.** Each ticket resolves a decision; the map is done when
   the way is clear — nothing left to decide before someone goes and does the
   thing.
2. **Refer by name.** In everything the human reads, refer to tickets by title,
   never by bare ids (`#42` walls are illegible).
3. **Claim before you work.** Assign a ticket to yourself before resolving it
   so concurrent sessions skip it.
4. **Frontier = open + unblocked + unclaimed.** The edge of the known.
5. **Record the answer on the ticket**, close it, and append a one-line gist +
   link to the map's Decisions-so-far section.
6. **Never resolve more than one HITL ticket per session** (research tickets
   may run in parallel).

## Outputs

- `.agent-forge/wayfinder.json` — the map + all tickets.
- Decisions-so-far index; fog graduates to tickets as the frontier advances;
  work past the destination is ruled **out of scope**, never resolved on route.

## Next

When the way is clear, run `nucleus load` to assemble the skill bundle that
matches the resolved profile.