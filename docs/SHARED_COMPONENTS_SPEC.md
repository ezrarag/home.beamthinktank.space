# BEAM shared components — extraction spec

For an agent with access to **all** BEAM repos (Antigravity). Claude, working through the
Cowork device bridge, can only see the folders connected to a session, so this is written
to be executed by something that can see everything at once.

Repos in scope (each its own Vercel project, each its own git repo):
`home` `hood` `orchestra` `band` `dance` `education` `forge` `grounds` `law`
`library` `transportation` `business` — plus any others under `beamthinktank.space`.

---

## The actual problem

`transportation/components/Footer.tsx` is a verbatim copy of `orchestra/components/Footer.tsx`,
including the string `© 2024 BEAM Orchestra. All rights reserved. Building Excellence in Arts
and Music.` — on a site that has nothing to do with the orchestra.

That is not a styling bug. Nobody copied a footer because they wanted orchestra's colors; they
copied it because **there was no source of organizational truth to import.** So the fix starts
with content, not CSS, and the first package to build is the smallest one.

There is also a naming decision that lands here: `Building Excellence in Arts and Music` is
retired. BEAM now expands to the four colleges of a university — Business, Education/Humanities,
Arts/Sciences, Mass Media. Every copy of the old expansion is wrong and this extraction is how
they all get fixed at once.

---

## Constraints to respect

1. **No monorepo migration.** Twelve separate repos, twelve Vercel projects. Do not propose
   consolidating them. Whatever ships has to work as a dependency.
2. **No private registry setup.** Use git dependencies:
   `"@beam/identity": "github:<org>/beam-identity#main"`. Vercel resolves these fine and it
   costs zero infrastructure. Graduate to a real registry later if it ever earns it.
3. **Appearance must stay drastically different per site.** orchestra should not start looking
   like forge. Shared structure, independent skins — that is the whole design constraint.
4. **Vercel↔git linkage is currently broken** and is a prerequisite. A shared package is
   worthless if an update can't ship to twelve sites; you'd be back to copy-paste with more
   steps. Fix or confirm this first.

---

## Phase 1 — `@beam/identity` (do this alone, first)

A tiny package with no UI, no React, no dependencies. Pure data and types. It exists to prove
the dependency pipeline works across twelve Vercel projects before anything expensive is built
on top of it.

Contents:

- `ORG` — legal name, display name, the current BEAM description, founding year, the canonical
  one-line mission. Copyright year computed at runtime, never hardcoded.
- `COLLEGES` — the four colleges: `id`, `letter`, `name`, `charge`.
- `DIVISIONS` — every division: `id`, `name`, `subdomain`, `college` (or `plant` / `commons`),
  `status` (`live` | `reserved`). This supersedes the per-repo copies — hood's `BEAM_DIVISIONS`
  and home's `ORGANIZATION_CATALOG` both become consumers of this list rather than parallel
  sources of it.
- `divisionFooterLine(divisionId)` — returns the correct attribution string for a given site,
  which is the specific function that makes the transportation bug structurally impossible.

Acceptance: every repo's footer imports its attribution instead of hardcoding it, and no string
matching `Building Excellence in Arts and Music` or `BEAM Orchestra. All rights reserved`
survives outside the orchestra repo.

## Phase 2 — the token contract

Not a package. A **convention**, documented once and adopted twelve times.

Every site defines the same CSS custom property names with **its own values**:

```
--beam-bg  --beam-surface  --beam-border
--beam-text-primary  --beam-text-secondary  --beam-text-dim
--beam-accent  --beam-accent-bright
--beam-radius  --beam-font-display  --beam-font-body
```

`home` already uses most of these (`--beam-gold`, `--beam-text-primary`, `--beam-border`), so
home's existing names are the starting point — extend them, don't rename them out from under a
working site. Note `--beam-gold` becomes `--beam-accent` in the shared vocabulary so that a
site whose accent isn't gold isn't lying about it; keep `--beam-gold` as an alias in home.

This convention is what lets one component look completely different on two sites. Components
reference the token; each site owns the value.

## Phase 3 — `@beam/ui`

Only after phases 1 and 2 are live everywhere. Components that ship **structure and behavior and
zero hardcoded color** — every visual value reads from a token.

Start with the five that are already duplicated across repos:

- `Footer` — consumes `@beam/identity`, so it cannot go stale
- `PublicNav`
- `ParticipantCard`
- `DivisionBadgeRow` — the "Reach across BEAM" row from hood
- `HandoffButton` — the `/onboard/handoff` entry into home

Rule: if a component needs a color that isn't in the token list, the token list is wrong. Extend
the contract rather than hardcoding an exception.

---

## Order of work

1. Fix/confirm Vercel↔git linkage across all projects.
2. Build and publish `@beam/identity`. Wire it into `home` only. Deploy. Confirm.
3. Wire it into the remaining eleven. Delete every hardcoded org string.
4. Document the token contract; audit each site's existing CSS variables against it.
5. Extract `@beam/ui` components one at a time, `Footer` first.

Do not start phase 3 before phase 1 is deployed on all twelve. The whole point of the small
first package is to find out what breaks in the dependency pipeline while the blast radius is
one exported object.
