import { NextResponse } from "next/server";
import { curatedFindings } from "@/data/curatedFindings";
import { getAllFindings, getFeaturedFindings } from "@/lib/pipeline";

export const revalidate = 3600;

function parseLimit(rawValue: string | null): number {
  const parsed = Number.parseInt(rawValue ?? "20", 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 20;
  }
  return parsed;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const featured = searchParams.get("featured") === "true";
  const topic = searchParams.get("topic")?.trim().toLowerCase();
  const limit = parseLimit(searchParams.get("limit"));

  try {
    let findings = featured ? await getFeaturedFindings(3) : await getAllFindings();

    if (topic) {
      findings = findings.filter((finding) => finding.topics.includes(topic));
    }

    return NextResponse.json({
      findings: findings.slice(0, limit),
      total: findings.length,
      sources: [...new Set(findings.map((finding) => finding.origin))],
    });
  } catch (error) {
    console.error("[/api/findings] Error:", error);

    return NextResponse.json(
      {
        findings: curatedFindings.slice(0, limit),
        total: curatedFindings.length,
        sources: ["curated"],
        error: "pipeline_partial",
      },
      { status: 200 }
    );
  }
}
