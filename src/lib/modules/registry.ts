import type { ModuleConfig } from "@/lib/modules/types";
import { educationModule } from "@/lib/modules/education/config";
import { foodModule } from "@/lib/modules/food/config";
import { healthcareModule } from "@/lib/modules/healthcare/config";
import { housingModule } from "@/lib/modules/housing/config";
import { legalModule } from "@/lib/modules/legal/config";

export const MODULE_REGISTRY: ModuleConfig[] = [
  educationModule,
  foodModule,
  housingModule,
  healthcareModule,
  legalModule,
].sort((left, right) => left.displayOrder - right.displayOrder);

export function getModule(id: string): ModuleConfig | undefined {
  return MODULE_REGISTRY.find((module) => module.id === id);
}

export function getActiveModules(): ModuleConfig[] {
  return MODULE_REGISTRY.filter((module) => module.status === "core" || module.status === "community");
}

export function getCommunityModules() {
  return MODULE_REGISTRY.filter((module) => module.status === "community");
}
