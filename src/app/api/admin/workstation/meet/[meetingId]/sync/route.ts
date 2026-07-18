import { NextRequest, NextResponse } from "next/server";
import { requireAdminIdentity } from "@/lib/server/adminAuth";

type Context = { params: Promise<{ meetingId: string }> };

async function getMeeting(meetingId: string, idToken: string) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/meetings/${encodeURIComponent(meetingId)}`, { headers: { Authorization: `Bearer ${idToken}` }, cache: "no-store" });
  if (!response.ok) throw new Error(`Could not load meeting (${response.status}).`);
  return response.json() as Promise<{ fields?: Record<string, { stringValue?: string }> }>;
}

async function patchMeeting(meetingId: string, idToken: string, values: Record<string, string>) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const masks = Object.keys(values).map((key) => `updateMask.fieldPaths=${encodeURIComponent(key)}`).join("&");
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/meetings/${encodeURIComponent(meetingId)}?${masks}`, {
    method: "PATCH", headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { stringValue: value }])) }),
  });
  if (!response.ok) throw new Error(`Could not save artifact references (${response.status}).`);
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const identity = await requireAdminIdentity(request);
    const googleAccessToken = request.headers.get("x-google-access-token");
    if (!googleAccessToken) return NextResponse.json({ error: "Google Meet authorization is required." }, { status: 400 });
    const { meetingId } = await context.params;
    const meeting = await getMeeting(meetingId, identity.idToken);
    const record = meeting.fields?.meetConferenceRecordId?.stringValue?.replace(/^conferenceRecords\//, "");
    if (!record) return NextResponse.json({ error: "Add the conference record ID before syncing." }, { status: 400 });
    const parent = `conferenceRecords/${record}`;
    const headers = { Authorization: `Bearer ${googleAccessToken}` };
    const [recordingsResponse, transcriptsResponse] = await Promise.all([
      fetch(`https://meet.googleapis.com/v2/${parent}/recordings?pageSize=100`, { headers, cache: "no-store" }),
      fetch(`https://meet.googleapis.com/v2/${parent}/transcripts?pageSize=100`, { headers, cache: "no-store" }),
    ]);
    if (!recordingsResponse.ok) throw new Error(`Recording sync failed (${recordingsResponse.status}): ${await recordingsResponse.text()}`);
    if (!transcriptsResponse.ok) throw new Error(`Transcript sync failed (${transcriptsResponse.status}): ${await transcriptsResponse.text()}`);
    const recordings = (await recordingsResponse.json()) as { recordings?: Array<{ driveDestination?: { exportUri?: string } }> };
    const transcripts = (await transcriptsResponse.json()) as { transcripts?: Array<{ docsDestination?: { exportUri?: string } }> };
    const recordingStoragePath = recordings.recordings?.find((item) => item.driveDestination?.exportUri)?.driveDestination?.exportUri ?? "";
    const transcriptStoragePath = transcripts.transcripts?.find((item) => item.docsDestination?.exportUri)?.docsDestination?.exportUri ?? "";
    await patchMeeting(meetingId, identity.idToken, { recordingStoragePath, transcriptStoragePath });
    return NextResponse.json({ recordingStoragePath, transcriptStoragePath });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to sync Meet artifacts." }, { status: 500 });
  }
}
