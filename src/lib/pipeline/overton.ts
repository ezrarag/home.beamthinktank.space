import type { PolicyFinding } from "@/lib/pipeline/types";

export async function fetchOverton(): Promise<PolicyFinding[]> {
  if (!process.env.OVERTON_API_KEY) {
    console.warn("[BEAM pipeline] OVERTON_API_KEY not set, skipping Overton fetch");
    return [];
  }

  return [];
}
