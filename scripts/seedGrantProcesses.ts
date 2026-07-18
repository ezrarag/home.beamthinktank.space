export {};

import { execSync } from "node:child_process";

type Stage = {
  id: string;
  label: string;
  status: "complete" | "active" | "idle";
  owner: string;
  note: string;
  updatedAt: string;
};

type GrantProcess = {
  title: string;
  domain: "grants";
  linkedEntityType: "grant-opportunity";
  stages: Stage[];
  funding?: { targetUsd: number; raisedUsd: number; label: string; deadlineDate?: string };
  createdAt: string;
  updatedAt: string;
};

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { timestampValue: string }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

const now = new Date().toISOString();

function stages(status: string, owner: string, notes: string): Stage[] {
  return [
    { id: "identified", label: status, status: "active", owner, note: notes, updatedAt: now },
    { id: "research", label: "Research & qualify", status: "idle", owner, note: "Confirm fit, requirements, and partners.", updatedAt: now },
    { id: "drafting", label: "Drafting", status: "idle", owner: "TBD", note: "", updatedAt: now },
    { id: "submitted", label: "Submitted", status: "idle", owner: "TBD", note: "", updatedAt: now },
    { id: "decision", label: "Decision", status: "idle", owner: "TBD", note: "", updatedAt: now },
  ];
}

const grants: GrantProcess[] = [
  {
    title: "CHEER Community Partner Pilot Grant",
    domain: "grants",
    linkedEntityType: "grant-opportunity",
    stages: stages("Open", "DeTania", "Science/health + community angle. DeTania has research contacts. Amount TBD."),
    funding: { targetUsd: 0, raisedUsd: 0, label: "Amount TBD", deadlineDate: "2026-08-07" },
    createdAt: now,
    updatedAt: now,
  },
  {
    title: "Advancing a Healthier Wisconsin Endowment (MCW)",
    domain: "grants",
    linkedEntityType: "grant-opportunity",
    stages: stages("Open - tight deadline", "DeTania", "Seed grant for pilot projects. DeTania has MCW context."),
    funding: { targetUsd: 50000, raisedUsd: 0, label: "Up to $50,000", deadlineDate: "2026-08-03" },
    createdAt: now,
    updatedAt: now,
  },
  {
    title: "William T. Grant Foundation",
    domain: "grants",
    linkedEntityType: "grant-opportunity",
    stages: stages("Research needed", "DeTania", "Rolling / check site. Major research studies; fits music-cognition and memory angle. Range: $100,000-$600,000."),
    funding: { targetUsd: 600000, raisedUsd: 0, label: "$100,000-$600,000; rolling" },
    createdAt: now,
    updatedAt: now,
  },
  {
    title: "Greater Milwaukee Foundation",
    domain: "grants",
    linkedEntityType: "grant-opportunity",
    stages: stages("Next cycle", "Danielle", "Danielle's home network; general BEAM and community projects. Window: Nov 2-13, 2026."),
    funding: { targetUsd: 0, raisedUsd: 0, label: "Amount varies", deadlineDate: "2026-11-02" },
    createdAt: now,
    updatedAt: now,
  },
  {
    title: "Peck School / 21st Century Performance Grant",
    domain: "grants",
    linkedEntityType: "grant-opportunity",
    stages: stages("Needs follow-up", "Ezra", "Deadline and amount unconfirmed. Flagged by contact at UWM 21st Century program."),
    createdAt: now,
    updatedAt: now,
  },
  {
    title: "Family Foundation - Water/Education",
    domain: "grants",
    linkedEntityType: "grant-opportunity",
    stages: stages("Warm contact - follow up", "DeTania / Jordan", "Program officer funded wastewater sensor donation to Community Water Services. Direct line to Jordan's sensor work. Deadline and amount unconfirmed."),
    createdAt: now,
    updatedAt: now,
  },
];

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function projectId() {
  const value = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!value) throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is required.");
  return value;
}

function accessToken() {
  const supplied = process.argv[2]?.trim() || process.env.GOOGLE_OAUTH_ACCESS_TOKEN?.trim();
  if (supplied) return supplied;
  try {
    return execSync("gcloud auth print-access-token", { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    throw new Error("No Google access token found. Run `gcloud auth login` or pass a token to `npm run seed:grants -- TOKEN`.");
  }
}

function value(input: unknown): FirestoreValue {
  if (typeof input === "number") return { integerValue: String(Math.trunc(input)) };
  if (typeof input === "string") {
    return /^\d{4}-\d{2}-\d{2}T/.test(input) ? { timestampValue: input } : { stringValue: input };
  }
  if (Array.isArray(input)) return { arrayValue: { values: input.map(value) } };
  const fields = Object.fromEntries(Object.entries(input as Record<string, unknown>).map(([key, entry]) => [key, value(entry)]));
  return { mapValue: { fields } };
}

async function seed() {
  const token = accessToken();
  const root = `projects/${projectId()}/databases/(default)/documents`;
  const writes = grants.map((grant) => ({
    update: {
      name: `${root}/beamProcesses/${slugify(grant.title)}`,
      fields: Object.fromEntries(Object.entries(grant).map(([key, entry]) => [key, value(entry)])),
    },
  }));
  const response = await fetch(`https://firestore.googleapis.com/v1/${root}:commit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ writes }),
  });
  if (!response.ok) throw new Error(`Firestore seed failed (${response.status}): ${await response.text()}`);
  grants.forEach((grant) => console.log(`Seeded: ${grant.title}`));
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
