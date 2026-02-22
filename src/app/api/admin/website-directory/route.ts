import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireAdminIdentity } from "@/lib/server/adminAuth";
import { createWebsiteDirectoryEntry } from "@/lib/server/firestoreWebsiteDirectory";
import {
  normalizeWebsiteDirectoryInput,
  validateWebsiteDirectoryInput,
  type WebsiteDirectoryInput,
} from "@/lib/websiteDirectory";

export async function POST(request: NextRequest) {
  try {
    const adminIdentity = await requireAdminIdentity(request);
    const body = (await request.json()) as WebsiteDirectoryInput;
    const normalizedInput = normalizeWebsiteDirectoryInput(body);
    const validationErrors = validateWebsiteDirectoryInput(normalizedInput);

    if (validationErrors.length > 0) {
      return NextResponse.json({ error: validationErrors.join(", ") }, { status: 400 });
    }

    const id = randomUUID();
    const actor = adminIdentity.email ?? adminIdentity.uid;

    await createWebsiteDirectoryEntry({
      idToken: adminIdentity.idToken,
      id,
      input: normalizedInput,
      createdBy: actor,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create entry";
    const status = message.includes("Admin privileges") || message.includes("Invalid Firebase ID token") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
