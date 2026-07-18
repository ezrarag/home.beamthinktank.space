import { NextRequest, NextResponse } from "next/server";
import { requireAdminIdentity } from "@/lib/server/adminAuth";

export const runtime = "nodejs";
export const maxDuration = 300;

type Context = { params: Promise<{ meetingId: string }> };
type FirestoreMeeting = { fields?: Record<string, { stringValue?: string }> };
type Recording = { state?: string; driveDestination?: { file?: string; exportUri?: string } };
type Transcript = { state?: string; docsDestination?: { document?: string; exportUri?: string } };

async function getMeeting(meetingId: string, idToken: string) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/meetings/${encodeURIComponent(meetingId)}`, { headers: { Authorization: `Bearer ${idToken}` }, cache: "no-store" });
  if (!response.ok) throw new Error(`Could not load meeting (${response.status}).`);
  return response.json() as Promise<FirestoreMeeting>;
}

async function patchMeeting(meetingId: string, idToken: string, values: Record<string, string>) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const masks = Object.keys(values).map((key) => `updateMask.fieldPaths=${encodeURIComponent(key)}`).join("&");
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/meetings/${encodeURIComponent(meetingId)}?${masks}`, {
    method: "PATCH", headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { stringValue: value }])) }),
  });
  if (!response.ok) throw new Error(`Could not save artifact paths (${response.status}): ${await response.text()}`);
}

async function fetchGoogleArtifact(url: string, googleAccessToken: string) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${googleAccessToken}` }, redirect: "follow", cache: "no-store" });
  if (!response.ok || !response.body) throw new Error(`Google Drive artifact download failed (${response.status}): ${await response.text()}`);
  return response;
}

async function uploadStreamToFirebase(path: string, source: Response, firebaseIdToken: string, fallbackContentType: string) {
  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!bucket) throw new Error("Firebase Storage bucket is not configured.");
  const endpoint = new URL(`https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o`);
  endpoint.searchParams.set("uploadType", "media");
  endpoint.searchParams.set("name", path);
  const upload = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${firebaseIdToken}`,
      "Content-Type": source.headers.get("content-type") || fallbackContentType,
    },
    body: source.body,
    // Required by Node when a web ReadableStream is forwarded as a request body.
    duplex: "half",
  } as RequestInit & { duplex: "half" });
  if (!upload.ok) throw new Error(`Firebase Storage copy failed (${upload.status}): ${await upload.text()}`);
  return path;
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const identity = await requireAdminIdentity(request);
    const googleAccessToken = request.headers.get("x-google-access-token");
    if (!googleAccessToken) return NextResponse.json({ error: "Google Meet and Drive authorization is required." }, { status: 400 });
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
    if (!recordingsResponse.ok) throw new Error(`Recording lookup failed (${recordingsResponse.status}): ${await recordingsResponse.text()}`);
    if (!transcriptsResponse.ok) throw new Error(`Transcript lookup failed (${transcriptsResponse.status}): ${await transcriptsResponse.text()}`);

    const recordings = (await recordingsResponse.json()) as { recordings?: Recording[] };
    const transcripts = (await transcriptsResponse.json()) as { transcripts?: Transcript[] };
    const recording = recordings.recordings?.find((item) => item.state === "FILE_GENERATED" && item.driveDestination?.file);
    const transcript = transcripts.transcripts?.find((item) => item.state === "FILE_GENERATED" && item.docsDestination?.document);
    if (!recording && !transcript) throw new Error("The conference record exists, but no generated recording or transcript is ready yet.");

    const values: Record<string, string> = {};
    if (recording?.driveDestination?.file) {
      const path = `meetings/${meetingId}/meet/recording-${record}.mp4`;
      const source = await fetchGoogleArtifact(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(recording.driveDestination.file)}?alt=media`, googleAccessToken);
      values.recordingStoragePath = await uploadStreamToFirebase(path, source, identity.idToken, "video/mp4");
      values.recordingDriveUri = recording.driveDestination.exportUri || "";
    }
    if (transcript?.docsDestination?.document) {
      const path = `meetings/${meetingId}/meet/transcript-${record}.txt`;
      const source = await fetchGoogleArtifact(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(transcript.docsDestination.document)}/export?mimeType=${encodeURIComponent("text/plain")}`, googleAccessToken);
      values.transcriptStoragePath = await uploadStreamToFirebase(path, source, identity.idToken, "text/plain; charset=utf-8");
      values.transcriptDriveUri = transcript.docsDestination.exportUri || "";
    }
    await patchMeeting(meetingId, identity.idToken, values);
    return NextResponse.json({ conferenceRecord: parent, copied: { recording: values.recordingStoragePath || null, transcript: values.transcriptStoragePath || null }, sourceUris: { recording: values.recordingDriveUri || null, transcript: values.transcriptDriveUri || null } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to sync Meet artifacts." }, { status: 500 });
  }
}
