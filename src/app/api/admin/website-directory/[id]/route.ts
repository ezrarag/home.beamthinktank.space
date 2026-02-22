import { NextRequest, NextResponse } from "next/server";
import { deleteWebsiteDirectoryEntry, updateWebsiteDirectoryEntry } from "@/lib/server/firestoreWebsiteDirectory";
import { requireAdminIdentity } from "@/lib/server/adminAuth";
import {
  normalizeWebsiteDirectoryInput,
  validateWebsiteDirectoryInput,
  type WebsiteDirectoryInput,
} from "@/lib/websiteDirectory";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Missing document id" }, { status: 400 });
    }

    const adminIdentity = await requireAdminIdentity(request);
    const body = (await request.json()) as WebsiteDirectoryInput;
    const normalizedInput = normalizeWebsiteDirectoryInput(body);
    const validationErrors = validateWebsiteDirectoryInput(normalizedInput);
    if (validationErrors.length > 0) {
      return NextResponse.json({ error: validationErrors.join(", ") }, { status: 400 });
    }

    const actor = adminIdentity.email ?? adminIdentity.uid;

    await updateWebsiteDirectoryEntry({
      idToken: adminIdentity.idToken,
      id,
      input: normalizedInput,
      updatedBy: actor,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update entry";
    const status = message.includes("Admin privileges") || message.includes("Invalid Firebase ID token") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Missing document id" }, { status: 400 });
    }

    const adminIdentity = await requireAdminIdentity(request);

    await deleteWebsiteDirectoryEntry({
      idToken: adminIdentity.idToken,
      id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete entry";
    const status = message.includes("Admin privileges") || message.includes("Invalid Firebase ID token") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
