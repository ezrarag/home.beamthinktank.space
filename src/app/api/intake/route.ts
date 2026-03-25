import { NextResponse } from "next/server";
import { createIntakeSubmission } from "@/lib/server/firestoreIntake";

interface IntakeRequestBody {
  orgName?: string;
  orgUrl?: string;
  nodeId?: string;
  sectors?: string[];
  contactName?: string;
  contactEmail?: string;
  needs?: string[];
  offers?: string[];
  description?: string;
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as IntakeRequestBody;

    const orgName = String(body.orgName ?? "").trim();
    const nodeId = String(body.nodeId ?? "").trim();
    const contactName = String(body.contactName ?? "").trim();
    const contactEmail = String(body.contactEmail ?? "").trim();
    const description = String(body.description ?? "").trim();

    if (!orgName) return badRequest("Organization name is required.");
    if (!nodeId) return badRequest("City node is required.");
    if (!contactName) return badRequest("Contact name is required.");
    if (!contactEmail) return badRequest("Contact email is required.");
    if (!contactEmail.includes("@")) return badRequest("Contact email must be valid.");
    if (description.length > 300) return badRequest("Description must be 300 characters or fewer.");

    const id = await createIntakeSubmission({
      orgName,
      orgUrl: String(body.orgUrl ?? "").trim(),
      nodeId,
      sectors: Array.isArray(body.sectors) ? body.sectors.map(String) : [],
      contactName,
      contactEmail,
      needs: Array.isArray(body.needs) ? body.needs.map(String) : [],
      offers: Array.isArray(body.offers) ? body.offers.map(String) : [],
      description,
    });

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit intake";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
