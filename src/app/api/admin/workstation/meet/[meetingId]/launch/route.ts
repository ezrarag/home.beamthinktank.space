import { NextRequest, NextResponse } from "next/server";
import { requireAdminIdentity } from "@/lib/server/adminAuth";

type Context = { params: Promise<{ meetingId: string }> };

async function patchMeeting(meetingId: string, idToken: string, fields: Record<string, { stringValue: string }>) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("Firebase project is not configured.");
  const masks = Object.keys(fields).map((key) => `updateMask.fieldPaths=${encodeURIComponent(key)}`).join("&");
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/meetings/${encodeURIComponent(meetingId)}?${masks}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });
  if (!response.ok) throw new Error(`Meeting update failed (${response.status}): ${await response.text()}`);
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const identity = await requireAdminIdentity(request);
    const googleAccessToken = request.headers.get("x-google-access-token");
    if (!googleAccessToken) return NextResponse.json({ error: "Google Meet authorization is required." }, { status: 400 });
    const { meetingId } = await context.params;
    const meetResponse = await fetch("https://meet.googleapis.com/v2/spaces", {
      method: "POST",
      headers: { Authorization: `Bearer ${googleAccessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!meetResponse.ok) throw new Error(`Google Meet space creation failed (${meetResponse.status}): ${await meetResponse.text()}`);
    const space = (await meetResponse.json()) as { name?: string; meetingUri?: string };
    if (!space.meetingUri || !space.name) throw new Error("Google Meet did not return a join URI.");
    await patchMeeting(meetingId, identity.idToken, { meetSpaceUri: { stringValue: space.meetingUri }, meetSpaceName: { stringValue: space.name } });
    return NextResponse.json({ meetSpaceUri: space.meetingUri, meetSpaceName: space.name });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to launch meeting." }, { status: 500 });
  }
}
