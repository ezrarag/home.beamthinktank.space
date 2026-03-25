import type { PolicyFinding } from "@/lib/pipeline/types";
import { fetchCuratedFindings } from "@/lib/pipeline/curatedAdapter";
import { fetchNBER } from "@/lib/pipeline/nber";
import { fetchOverton } from "@/lib/pipeline/overton";
import { fetchPolicyCommons } from "@/lib/pipeline/policyCommons";

function sortByDateDesc(findings: PolicyFinding[]): PolicyFinding[] {
  return [...findings].sort((left, right) => right.isoDate.localeCompare(left.isoDate));
}

export async function getAllFindings(): Promise<PolicyFinding[]> {
  const [curated, nber, policyCommons, overton] = await Promise.allSettled([
    fetchCuratedFindings(),
    fetchNBER(),
    fetchPolicyCommons(),
    fetchOverton(),
  ]);

  const curatedItems = curated.status === "fulfilled" ? sortByDateDesc(curated.value) : [];
  const liveItems = sortByDateDesc([
    ...(nber.status === "fulfilled" ? nber.value : []),
    ...(policyCommons.status === "fulfilled" ? policyCommons.value : []),
    ...(overton.status === "fulfilled" ? overton.value : []),
  ]);

  const merged = [...curatedItems, ...liveItems];
  const deduped = Array.from(new Map(merged.map((finding) => [finding.id, finding])).values());

  return deduped;
}

export async function getFeaturedFindings(limit = 3): Promise<PolicyFinding[]> {
  const all = await getAllFindings();
  const featured = all.filter((finding) => finding.featured);

  if (featured.length >= limit) {
    return featured.slice(0, limit);
  }

  return all.slice(0, limit);
}
