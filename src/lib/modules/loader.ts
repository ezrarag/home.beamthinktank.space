import { getActiveModules, getModule } from "@/lib/modules/registry";
import type { SectorData } from "@/lib/thesis/types";

function attachModuleMetadata(module: ReturnType<typeof getActiveModules>[number], data: SectorData): SectorData {
  return {
    ...data,
    icon: module.icon,
    visualization: module.visualization,
    displayOrder: module.displayOrder,
    contributor: module.contributor,
    sources: module.dataSources.map((source) => ({
      name: source.name,
      url: source.url,
      isFree: source.isFree,
    })),
  };
}

export async function loadAllModules(): Promise<SectorData[]> {
  const modules = getActiveModules();
  const results = await Promise.allSettled(
    modules.map(async (module) => attachModuleMetadata(module, await module.fetchData()))
  );

  return results.reduce<SectorData[]>((accumulator, result) => {
    if (result.status === "fulfilled") {
      accumulator.push(result.value);
    }
    return accumulator;
  }, []);
}

export async function loadModule(id: string): Promise<SectorData | null> {
  const registeredModule = getModule(id);
  if (!registeredModule) return null;

  try {
    return attachModuleMetadata(registeredModule, await registeredModule.fetchData());
  } catch (error) {
    console.warn(`[BEAM modules] Failed to load module: ${id}`, error);
    return null;
  }
}
