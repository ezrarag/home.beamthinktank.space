import type { BeamAction, BeamTaxonomy } from "@/types/beamGame";

export const BEAM_COLLECTIONS = {
  regions: "beamRegions",
  projects: "beamProjects",
  actions: "beamActions",
  tasks: "beamTasks",
  assets: "beamAssets",
} as const;

export function slugifyRegionName(value: string): string {
  return value
    .toLowerCase()
    .replace(/\//g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isBeamActionType(value: string, taxonomy: BeamTaxonomy): boolean {
  return taxonomy.actionTypes.includes(value);
}

export function isBeamCommitment(value: string, taxonomy: BeamTaxonomy): boolean {
  return taxonomy.commitmentTypes.includes(value as (typeof taxonomy.commitmentTypes)[number]);
}

export function regionActiveWithin(actionTimestamp: string | null | undefined, days: number): boolean {
  if (!actionTimestamp) return false;
  const activity = new Date(actionTimestamp).getTime();
  if (Number.isNaN(activity)) return false;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return activity >= cutoff;
}

export function normalizeActionWeight(input: number): BeamAction["weight"] {
  if (input <= 1) return 1;
  if (input === 2) return 2;
  if (input === 3) return 3;
  if (input === 4) return 4;
  return 5;
}
