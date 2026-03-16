import actionsJson from "../../docs/sample-data/actions.json";
import assetsJson from "../../docs/sample-data/assets.json";
import { buildDefaultRegions } from "@/lib/beamTaxonomy";
import type { BeamAction, BeamAsset, BeamProject, BeamTask } from "@/types/beamGame";

export function buildBeamSeedData(): {
  regions: ReturnType<typeof buildDefaultRegions>;
  projects: BeamProject[];
  actions: BeamAction[];
  tasks: BeamTask[];
  assets: BeamAsset[];
} {
  const actions = actionsJson as BeamAction[];
  const assets = assetsJson as BeamAsset[];

  const projectMap = new Map<string, BeamProject>();

  for (const action of actions) {
    const projectId = action.projectId;
    if (!projectId || projectMap.has(projectId)) continue;
    projectMap.set(projectId, {
      id: projectId,
      title: projectId
        .replace(/^proj_/, "")
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
      regionId: action.regionId,
      sector: "Real Estate",
      type: "acquisition",
      status: "active",
      nextMilestone: "Run next activation sprint milestone.",
      tags: ["seeded", "phase-1"],
      assetIds: action.assetId ? [action.assetId] : [],
    });
  }

  const tasks: BeamTask[] = [];
  for (const action of actions) {
    for (const generatedTask of action.aiTasks ?? []) {
      tasks.push({
        id: `${action.id}_${generatedTask.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        projectId: action.projectId,
        regionId: action.regionId,
        assetId: action.assetId,
        title: generatedTask.title,
        description: generatedTask.description,
        requiredRoleTags: generatedTask.requiredRoleTags,
        commitment: generatedTask.commitment,
        status: "open",
        createdFromActionId: action.id,
      });
    }
  }

  return {
    regions: buildDefaultRegions(),
    projects: Array.from(projectMap.values()),
    actions,
    tasks,
    assets,
  };
}
