export {};

import { execSync } from "node:child_process";

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { nullValue: null }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

const meetings = [
  {
    id: "beam-nucleus-grants-2026-07",
    title: "Meeting 01 - Grants & Institutional Leads",
    dateISO: "2026-07-15T18:00:00-05:00",
    status: "current",
    agenda: "Review priority grant opportunities, clarify owners, and identify institutional leads requiring follow-up.",
    audioStoragePath: null,
    takeaways: [
      { heading: "Two near-term August opportunities need owners now", body: "The MCW opportunity is due August 3 and CHEER is due August 7. DeTania's research and MCW relationships make her a natural early partner; scope and applicant eligibility still need confirmation." },
      { heading: "Danielle can anchor the grant-writing structure", body: "Danielle brings multi-PI grant-writing experience and Greater Milwaukee Foundation relationships. The emerging need is a small research and writing team, not a single grant writer working alone." },
      { heading: "Research, music, and water form distinct funding paths", body: "Music-cognition and memory research maps to William T. Grant and MCW. Jordan's environmental sensor work maps to the warm family-foundation water and education contact." },
      { heading: "Two institutional leads remain outside the grant pipeline", body: "Lisa Dickerson/UWM Facilities and Milwaukee Transit are prospective institutional subscribers. Both need direct discovery follow-up before they become scoped opportunities." },
    ],
    invitees: [],
    restrictToInvitees: false,
    order: 1,
    meetSpaceUri: null,
    meetSpaceName: null,
    meetConferenceRecordId: null,
    transcriptStoragePath: null,
    recordingStoragePath: null,
    transcriptDriveUri: null,
    recordingDriveUri: null,
  },
  {
    id: "beam-nucleus-next-steps-2026-07",
    title: "Meeting 02 - Grant Team Formation",
    dateISO: "2026-07-29T18:00:00-05:00",
    status: "upcoming",
    agenda: "Confirm grant research and writing roles; prioritize the August submissions; review new team suggestions and contacts.",
    audioStoragePath: null,
    takeaways: [],
    invitees: [],
    restrictToInvitees: false,
    order: 2,
    meetSpaceUri: null,
    meetSpaceName: null,
    meetConferenceRecordId: null,
    transcriptStoragePath: null,
    recordingStoragePath: null,
    transcriptDriveUri: null,
    recordingDriveUri: null,
  },
] as const;

function projectId() {
  const value = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!value) throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is required.");
  return value;
}

function token() {
  const supplied = process.argv[2]?.trim() || process.env.GOOGLE_OAUTH_ACCESS_TOKEN?.trim();
  if (supplied) return supplied;
  try { return execSync("gcloud auth print-access-token", { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim(); }
  catch { throw new Error("No Google access token found. Run gcloud auth login or pass a token."); }
}

function value(input: unknown): FirestoreValue {
  if (input === null || input === undefined) return { nullValue: null };
  if (typeof input === "number") return { integerValue: String(input) };
  if (typeof input === "string") return { stringValue: input };
  if (Array.isArray(input)) return { arrayValue: { values: input.map(value) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(input as Record<string, unknown>).map(([key, entry]) => [key, value(entry)])) } };
}

async function seed() {
  const root = `projects/${projectId()}/databases/(default)/documents`;
  const response = await fetch(`https://firestore.googleapis.com/v1/${root}:commit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ writes: meetings.map(({ id, ...meeting }) => ({ update: { name: `${root}/meetings/${id}`, fields: Object.fromEntries(Object.entries(meeting).map(([key, entry]) => [key, value(entry)])) } })) }),
  });
  if (!response.ok) throw new Error(`Meeting seed failed (${response.status}): ${await response.text()}`);
  meetings.forEach((meeting) => console.log(`Seeded: ${meeting.title}`));
}

seed().catch((error) => { console.error(error); process.exit(1); });
