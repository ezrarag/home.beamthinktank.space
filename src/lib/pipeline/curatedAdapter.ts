import { curatedFindings } from "@/data/curatedFindings";
import type { PolicyFinding } from "@/lib/pipeline/types";

export async function fetchCuratedFindings(): Promise<PolicyFinding[]> {
  return curatedFindings;
}
