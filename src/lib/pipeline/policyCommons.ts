import type { PolicyFinding } from "@/lib/pipeline/types";

export async function fetchPolicyCommons(): Promise<PolicyFinding[]> {
  if (!process.env.POLICY_COMMONS_API_KEY) {
    console.warn("[BEAM pipeline] POLICY_COMMONS_API_KEY not set, skipping Policy Commons fetch");
    return [];
  }

  return [];
}
