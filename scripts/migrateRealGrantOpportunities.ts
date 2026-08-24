export {};

import { execSync } from "node:child_process";
import { REAL_PRODUCTION_OPPORTUNITIES } from "../src/lib/beamGrantsService";

function projectId(): string {
  const value = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!value) throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is required.");
  return value;
}

function accessToken(): string {
  const supplied = process.argv[2]?.trim() || process.env.GOOGLE_OAUTH_ACCESS_TOKEN?.trim();
  if (supplied) return supplied;
  try {
    return execSync("gcloud auth print-access-token", { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    throw new Error("No Google access token found. Run `gcloud auth login` or pass token.");
  }
}

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { booleanValue: boolean }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

function value(input: unknown): FirestoreValue {
  if (typeof input === "boolean") return { booleanValue: input };
  if (typeof input === "number") return { integerValue: String(Math.trunc(input)) };
  if (typeof input === "string") return { stringValue: input };
  if (Array.isArray(input)) return { arrayValue: { values: input.map(value) } };
  const fields = Object.fromEntries(
    Object.entries(input as Record<string, unknown>).map(([k, v]) => [k, value(v)])
  );
  return { mapValue: { fields } };
}

async function migrate() {
  const token = accessToken();
  const root = `projects/${projectId()}/databases/(default)/documents`;

  console.log("=== BEAM Grants Real Data Migration & Purge ===");

  const writes = REAL_PRODUCTION_OPPORTUNITIES.map((opp) => ({
    update: {
      name: `${root}/beamOpportunities/${opp.id}`,
      fields: Object.fromEntries(Object.entries(opp).map(([k, v]) => [k, value(v)])),
    },
  }));

  const response = await fetch(`https://firestore.googleapis.com/v1/${root}:commit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ writes }),
  });

  if (!response.ok) {
    throw new Error(`Migration failed (${response.status}): ${await response.text()}`);
  }

  console.log("Idempotent migration successful! Restored all 6 real opportunities:");
  REAL_PRODUCTION_OPPORTUNITIES.forEach((opp) => {
    console.log(` - [RESTORED]: ${opp.title} (${opp.opportunityNumber}) -> Pursuit: ${opp.hasActivePursuit ? "YES (Black Diaspora / DeTania)" : "NO (Mapped, Awaiting Subject)"}`);
  });
}

migrate().catch((error) => {
  console.error("Migration error:", error);
  process.exit(1);
});
