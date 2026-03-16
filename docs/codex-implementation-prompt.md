# Codex Implementation Prompt

You are working in this repo: `home.beamthinktank.space`

Goal: Implement BEAM Myst-style, state-driven experience using:
- `docs/beam-game-spec.md`
- `docs/beam-taxonomy.json`
- `docs/sample-data/actions.json`
- `docs/sample-data/assets.json`

Phase 1 (do now):
1. Create Firestore schema + TypeScript types for Region, Project, Action, Task, Asset.
2. Implement a mobile-friendly Admin Action Logger page that creates Action docs.
3. On Action create, run server-side AI generation to fill:
   - `aiSummary`
   - `aiTasks[]`
   - `aiRolesNeeded[]`
4. Implement homepage state logic:
   - choose region by location permission + recent activity (14 days)
   - otherwise use most recently active region
   - render region scene + map + recent actions + open tasks

Constraints:
- Next.js App Router
- TypeScript
- Firebase Firestore
- Enums/taxonomy must be controlled by `docs/beam-taxonomy.json`
- Provide seed script to load sample data from `docs/sample-data`

Deliverables:
- list of files changed
- exact local run steps
- short notes of key UI flows and test coverage
