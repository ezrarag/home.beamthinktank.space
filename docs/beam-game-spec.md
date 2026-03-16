# BEAM Game Spec (D -> A -> C -> B)

This is the source-of-truth blueprint for implementing the BEAM state-driven operating system.

## Scope and Principles
- Content must be generated from actions, not manual page writing.
- Real estate progression is earned through measurable operational capability and impact.
- Taxonomies are controlled and loaded from `docs/beam-taxonomy.json`.
- Build order is strict: D -> A -> C -> B.

## D) Real Estate Acquisition Pipeline (Game Layer)

### Acquisition states
1. `SIGNAL`: property identified
2. `CLAIM`: operator plan + team defined
3. `ACCESS`: permission to tour/use/negotiate
4. `STABILIZE`: maintenance and risk controls in place
5. `ACTIVATE`: programs and revenue in motion
6. `SECURE`: lease/MOU/management agreement in place
7. `TRANSFER`: ownership pathway executed (purchase, $1 transfer, trust, deed)

### Asset object
Each building/asset is treated as a quest.

Required fields:
- `id`
- `name`
- `address`
- `regionId`
- `ownerName`
- `acquisitionStage` (enum above)
- `condition` (`unknown|poor|fair|good|excellent`)
- `operatorNarrative`
- `primaryUseCases[]`
- `scores.capacity` (0-100)
- `scores.impact` (0-100)
- `scores.stability` (0-100)
- `scores.revenue` (0-100)
- `scores.partner` (0-100)
- `stageHistory[]` (timestamped transitions)
- `linkedProjectIds[]`
- `linkedActionIds[]`
- `createdAt`
- `updatedAt`

Computed fields:
- `overallReadinessScore = weighted(sum(scores))`
- `progressPercent` mapped from acquisition stage

### Progression rule
An asset can move to next stage only if:
- At least one new qualifying `Action` exists for the current stage.
- No required score dimension for next stage is below threshold (project-configurable defaults).

## A) Core Data Model

### Region
- `id`
- `name`
- `geo`:
  - `lat`
  - `lng`
  - `bounds` (`north|south|east|west`)
- `activityScore` (computed)
- `lastActionAt`
- `sceneMediaUrl` (optional)

### Project
- `id`
- `title`
- `regionId`
- `sector`
- `type` (`ngo|external_client|acquisition|research|internal_program`)
- `status` (`active|paused|completed`)
- `heroMediaId` (optional)
- `nextMilestone`
- `tags[]`
- `assetIds[]` (optional)

### Action (engine of truth)
- `id`
- `regionId`
- `projectId` (optional)
- `assetId` (optional)
- `actorUserId`
- `actionType`
- `timestamp`
- `weight` (1-5)
- `summaryRaw`
- `mediaIds[]`
- `aiSummary`
- `aiTasks[]`
- `aiRolesNeeded[]`
- `visibility` (`public|private`)

### Task
- `id`
- `projectId` (optional)
- `regionId`
- `assetId` (optional)
- `title`
- `description`
- `requiredRoleTags[]`
- `commitment`
- `status` (`open|in_progress|done`)
- `createdFromActionId`
- `ownerUserId` (optional)

## C) Action -> AI Auto-Population Engine

### Trigger
On Action create (server-side):
1. Generate `aiSummary` (2-3 public-safe sentences)
2. Generate `aiTasks[]` (3-7 actionable tasks)
3. Generate `aiRolesNeeded[]` from controlled role tags only
4. Update related project milestone text (if `projectId` provided)
5. Generate region scene prompt for visual state update (optional output channel)
6. Generate cross-links to related project/action ids in same region/sector

### Guardrails
- AI must only choose values from controlled enums/taxonomy where applicable.
- AI output is JSON-structured and schema-validated before persistence.
- If parsing fails, save action with empty AI fields and log error telemetry.

### Suggested AI output contract
```json
{
  "aiSummary": "string",
  "aiTasks": [
    {
      "title": "string",
      "description": "string",
      "requiredRoleTags": ["string"],
      "commitment": "string"
    }
  ],
  "aiRolesNeeded": ["string"],
  "milestoneUpdate": "string",
  "scenePrompt": "string",
  "relatedIds": {
    "projectIds": ["string"],
    "actionIds": ["string"]
  }
}
```

## B) Homepage State-Driven Myst Experience

### Region selection on load
1. If user location allowed and nearest region has `lastActionAt` within 14 days: select nearest region.
2. Else: select region with most recent `lastActionAt`.
3. Fallback: region with highest `activityScore`.

### Scene composition
- Main scene visual from region state.
- Map navigator anchored bottom-left.
- Hotspots:
  - active projects
  - open tasks
  - active assets/quests
  - partner organizations
  - latest update

### Player-mode entry (per region)
Display four blocks:
- `What can I do today?` -> open tasks filtered by user role/commitment
- `Where is this headed?` -> milestones
- `Who is already here?` -> contributors/partners
- `What is being unlocked?` -> asset acquisition progress

### Filters
- region selector
- keep-my-tasks-while-browsing toggle
- role selector
- commitment selector

## Build Order
1. Sprint 1 (`A + C`): schema + admin action logger + AI generation
2. Sprint 2 (`D`): asset quest model + action linkage + stage progress bars
3. Sprint 3 (`B`): state-driven scene renderer + map nav + filters

## Acceptance Criteria (Phase 1)
- Admin can create an Action from mobile in <=30 seconds.
- Action save triggers AI fields server-side.
- AI-created tasks are persisted and queryable by region/role/commitment.
- Homepage region selection follows deterministic rules above.
