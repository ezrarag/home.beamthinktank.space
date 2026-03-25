import { NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { ModuleProposal } from "@/lib/modules/types";

const PROPOSALS_DIR = path.join(process.cwd(), "data");
const PROPOSALS_FILE = path.join(PROPOSALS_DIR, "pending-proposals.json");

async function readExistingProposals(): Promise<ModuleProposal[]> {
  try {
    const raw = await readFile(PROPOSALS_FILE, "utf-8");
    return JSON.parse(raw) as ModuleProposal[];
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const required = ["orgName", "sector", "thesis", "whatsPossible", "dataSources", "contactEmail"];
  const missing = required.filter((field) => !body[field]);

  if (missing.length > 0) {
    return NextResponse.json({ error: `Missing required fields: ${missing.join(", ")}` }, { status: 400 });
  }

  const proposal: ModuleProposal = {
    id: `proposal-${Date.now()}`,
    submittedAt: new Date().toISOString(),
    status: "pending",
    orgName: String(body.orgName),
    orgUrl: body.orgUrl ? String(body.orgUrl) : undefined,
    contactEmail: body.contactEmail ? String(body.contactEmail) : undefined,
    sector: String(body.sector),
    thesis: String(body.thesis),
    whatsPossible: String(body.whatsPossible),
    dataSources: Array.isArray(body.dataSources)
      ? body.dataSources
          .filter((source): source is { name?: unknown; url?: unknown; isFree?: unknown } => Boolean(source) && typeof source === "object")
          .map((source) => ({
            name: String(source.name ?? ""),
            url: String(source.url ?? ""),
            isFree: Boolean(source.isFree),
          }))
      : [],
    sampleData: body.sampleData,
    notes: body.notes ? String(body.notes) : "",
  };

  await mkdir(PROPOSALS_DIR, { recursive: true });
  const existing = await readExistingProposals();
  await writeFile(PROPOSALS_FILE, JSON.stringify([...existing, proposal], null, 2));

  return NextResponse.json({
    success: true,
    proposalId: proposal.id,
    message: "Your proposal has been received. The BEAM team will review within 5 business days.",
  });
}

export async function GET() {
  const proposals = await readExistingProposals();
  return NextResponse.json({ proposals });
}
