# BEAM Home Aggregation Audit

## Current State

### What already exists

1. `beamthinktank.space` already has a canonical website-directory layer.
   - Public API: `/api/website-directory`
   - Internal-only API: `/api/website-directory/internal`
   - Admin UI: `/admin/website-directory`
   - Source collection: `beamWebsiteDirectory`

2. External BEAM sites can already sync into Home.
   - `src/lib/server/readyaimgoDirectory.ts` pulls the BEAM organizations export from Readyaimgo.
   - Canonical `beamthinktank.space` hosts, alternate deploy hosts, and `storyPath` metadata are already normalized.
   - The merged API dedupes internal rows against synced rows by host.

3. Public node visualization already exists.
   - The landing page shows city/node activity via `/api/nodes/public`.
   - This means BEAM Home already has one public aggregation surface; it just did not yet include NGO site aggregation.

4. Participant identity has started, but only as an admin/private layer.
   - Collections exist for `organizations`, `cohorts`, `participantProfiles`, `organizationMemberships`, and `cohortMemberships`.
   - Seed data currently includes `BEAM Orchestra`, `PaynePros`, and `Black Diaspora Symphony`.
   - These collections are admin-only in `firestore.rules`, so Home cannot publicly aggregate participant data from them yet.

5. Participant work-context resolution exists, but it is user-specific rather than public.
   - `/api/participant/work-contexts` resolves Readyaimgo-linked work contexts for a specific handoff.
   - This is useful for dashboards, not for a public ecosystem overview.

### What is missing

1. Before this pass, the public landing page did not render the website-directory feed anywhere.
2. The current feed is site-level, not project-level.
3. There is no canonical public-safe participant summary feed.
4. Forge, law, choir, band, environment, and other NGO surfaces are not yet consistently modeled in the canonical participant-identity seed layer.
5. There is no single route that says: "for this NGO, here are the live projects, partner contexts, and participant counts that Home may safely display."

## Ready Now

The safe first aggregation layer for Home is:

1. Canonical NGO/site cards
2. Preview image or screenshot
3. Canonical host and alternate hosts
4. Story or sync metadata
5. Later, public-safe project and participant summaries

This is now the right order of operations because it gives Home a truthful live directory first, instead of pretending the project/participant layer exists before the data contract is ready.

## Recommended Public Data Contract

Each NGO site should eventually publish a public-safe summary record that BEAM Home can ingest. The shape should look like this:

```ts
type BeamNgoPublicSummary = {
  id: string;
  siteUrl: string;
  host: string;
  ngoName: string;
  shortName?: string;
  status: "active" | "forming" | "paused";
  updatedAt: string;
  description: string;
  tags: string[];
  publicMetrics: {
    activeProjects: number;
    activeParticipants: number;
    partners: number;
  };
  projects: Array<{
    id: string;
    title: string;
    status: "active" | "forming" | "paused" | "completed";
    summary: string;
    tags: string[];
    participantCount?: number;
    partnerCount?: number;
  }>;
  participantSummary: {
    total: number;
    roles: Array<{ role: string; count: number }>;
  };
  partners: Array<{
    id: string;
    name: string;
    kind: "ngo" | "company" | "school" | "community" | "government" | "other";
  }>;
};
```

Important rule: this summary should never include participant PII. Home should only aggregate counts, roles, and public project labels.

## NGO-By-NGO Build Order

When you touch NGO sites tonight, the order should be:

1. Make sure the NGO has a canonical host and appears in `/api/website-directory`
2. Add a public summary document or route for the NGO
3. Include project cards with status and tags
4. Include participant counts by role, not names
5. Add partner/org references only if they are public-safe
6. Update Home to consume the new summary shape

## Copy/Paste Prompt

```md
You are working in `home.beamthinktank.space`.

Goal: make BEAM Home the public aggregation layer for every BEAM NGO site, starting with truthful site-level aggregation and then extending to public-safe project and participant summaries.

Existing systems you must use:
- `/api/website-directory` for canonical NGO/site discovery
- `src/lib/server/readyaimgoDirectory.ts` for synced BEAM organization metadata
- `beamWebsiteDirectory` for manually managed internal rows
- `/api/nodes/public` for regional node context
- canonical participant identity collections only where public-safe summaries are intentionally exposed

Implement in this order:
1. Keep the landing page visualization of the merged website directory working.
2. Add a public aggregation route on Home that merges:
   - website directory entries
   - NGO public summary documents
   - optional public-safe project and participant rollups
3. For each NGO, ingest:
   - canonical host
   - NGO name
   - description
   - active projects
   - participant counts by role
   - partner counts
   - updated timestamp
4. Render this on Home as:
   - one highlighted NGO panel
   - a grid of NGO cards
   - clear counts for sites, projects, and participants
5. Never expose participant names or private dashboard data on the public site.

Constraints:
- Next.js App Router
- TypeScript
- Firebase/Firestore-friendly data model
- public routes must degrade gracefully if one NGO feed is missing
- prefer canonical BEAM hosts and dedupe alternate deploy hosts

Deliverables:
- files changed
- public route shape
- how to add a new NGO into the aggregation system
- any Firestore rule changes required
```
