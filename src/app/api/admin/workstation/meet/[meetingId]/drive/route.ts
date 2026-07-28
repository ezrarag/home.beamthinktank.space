import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminIdentity } from "@/lib/server/adminAuth";

export const runtime = "nodejs";
export const maxDuration = 300;

type Context = { params: Promise<{ meetingId: string }> };
type DriveFile = { id: string; name: string; mimeType: string; size?: string; modifiedTime?: string; version?: string; md5Checksum?: string; webViewLink?: string };

function fileId(value: string) {
  return value.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] || value.match(/\/folders\/([a-zA-Z0-9_-]+)/)?.[1] || value.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1] || "";
}

async function driveFile(id: string, token: string) {
  const fields = "id,name,mimeType,size,modifiedTime,version,md5Checksum,webViewLink";
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?fields=${encodeURIComponent(fields)}&supportsAllDrives=true`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!response.ok) throw new Error(`Drive could not inspect ${id} (${response.status}): ${await response.text()}`);
  return response.json() as Promise<DriveFile>;
}

async function transcriptText(id: string, mimeType: string, token: string) {
  const endpoint = mimeType === "application/vnd.google-apps.document"
    ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}/export?mimeType=${encodeURIComponent("text/plain")}`
    : `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media`;
  const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!response.ok) throw new Error(`Drive could not read the transcript (${response.status}): ${await response.text()}`);
  return response.text();
}

function section(text: string, heading: string, next: string[]) {
  const start = text.search(new RegExp(`(?:^|\\n)${heading}\\s*\\r?\\n`, "i"));
  if (start < 0) return "";
  const bodyStart = text.indexOf("\n", start) + 1;
  const tail = text.slice(bodyStart);
  const ends = next.map((name) => tail.search(new RegExp(`(?:^|\\n)${name}\\s*\\r?\\n`, "i"))).filter((value) => value >= 0);
  return tail.slice(0, ends.length ? Math.min(...ends) : undefined).trim();
}

async function upload(path: string, response: Response, firebaseToken: string, fallbackType: string) {
  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!bucket || !response.body) throw new Error("Firebase Storage is not configured for streamed imports.");
  const endpoint = new URL(`https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o`);
  endpoint.searchParams.set("uploadType", "media"); endpoint.searchParams.set("name", path);
  const result = await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${firebaseToken}`, "Content-Type": response.headers.get("content-type") || fallbackType }, body: response.body, duplex: "half" } as RequestInit & { duplex: "half" });
  if (!result.ok) throw new Error(`Firebase Storage copy failed (${result.status}): ${await result.text()}`);
  return path;
}

function firestoreValue(value: string) { return { stringValue: value }; }

async function patchMeeting(meetingId: string, token: string, values: Record<string, string>) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const masks = Object.keys(values).map((key) => `updateMask.fieldPaths=${encodeURIComponent(key)}`).join("&");
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/meetings/${encodeURIComponent(meetingId)}?${masks}`, { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ fields: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, firestoreValue(value)])) }) });
  if (!response.ok) throw new Error(`Meeting source references could not be saved (${response.status}): ${await response.text()}`);
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const identity = await requireAdminIdentity(request);
    const googleToken = request.headers.get("x-google-access-token");
    if (!googleToken) return NextResponse.json({ error: "Google Drive authorization is required." }, { status: 400 });
    const { meetingId } = await context.params;
    const body = await request.json() as { action?: "inspect" | "import"; folderUrl?: string; recordingUrl?: string; transcriptUrl?: string; copyRecording?: boolean };
    const transcriptId = fileId(body.transcriptUrl || "");
    const recordingId = fileId(body.recordingUrl || "");
    const folderId = fileId(body.folderUrl || "");
    if (!transcriptId) return NextResponse.json({ error: "Add a valid Google Docs transcript URL." }, { status: 400 });

    const [transcript, recording, folder] = await Promise.all([
      driveFile(transcriptId, googleToken),
      recordingId ? driveFile(recordingId, googleToken) : null,
      folderId ? driveFile(folderId, googleToken) : null,
    ]);
    const text = await transcriptText(transcriptId, transcript.mimeType, googleToken);
    const summary = section(text, "Summary", ["Decisions", "Next steps", "Details", "Transcript"]);
    const decisions = section(text, "Decisions", ["Next steps", "Details", "Transcript"]);
    const nextSteps = section(text, "Next steps", ["Details", "Transcript"]);
    const hash = createHash("sha256").update(text).digest("hex").slice(0, 12);
    const revision = `${transcript.version || "0"}-${hash}`;
    const preview = { summary, decisions, nextSteps, revision, recordingName: recording?.name || "", transcriptName: transcript.name };
    if (body.action !== "import") return NextResponse.json({ preview });

    let recordingStoragePath = "";
    let copiedRecording = false;
    if (recording && body.copyRecording === true) {
      const source = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(recording.id)}?alt=media`, { headers: { Authorization: `Bearer ${googleToken}` }, cache: "no-store" });
      if (source.ok && source.body) {
        const safeName = recording.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        recordingStoragePath = await upload(`meetings/${meetingId}/drive/${revision}-${safeName}.mp4`, source, identity.idToken, recording.mimeType || "video/mp4");
        copiedRecording = true;
      }
    }
    const transcriptResponse = new Response(text, { headers: { "content-type": "text/plain; charset=utf-8" } });
    const transcriptStoragePath = await upload(`meetings/${meetingId}/drive/${revision}-transcript.txt`, transcriptResponse, identity.idToken, "text/plain; charset=utf-8");
    const values: Record<string, string> = {
      sourceFolderUri: folder?.webViewLink || body.folderUrl || "",
      recordingDriveUri: recording?.webViewLink || body.recordingUrl || "",
      transcriptDriveUri: transcript.webViewLink || body.transcriptUrl || "",
      recordingDriveFileId: recordingId,
      transcriptDriveFileId: transcriptId,
      transcriptStoragePath,
      sourceRevision: revision,
      sourceImportedAt: new Date().toISOString(),
    };
    if (recordingStoragePath) values.recordingStoragePath = recordingStoragePath;
    await patchMeeting(meetingId, identity.idToken, values);
    return NextResponse.json({ preview, copiedRecording, meeting: values });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to ingest Drive sources." }, { status: 500 });
  }
}
