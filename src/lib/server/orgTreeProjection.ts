import { getOrgNodeById, updateOrgNode, type OrgNode } from "@/lib/server/firestoreOrgTree";

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { timestampValue: string }
  | { nullValue: null }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

interface FirestoreDocument {
  name: string;
  fields?: Record<string, FirestoreValue>;
}

type FirestoreRunQueryRow = {
  document?: FirestoreDocument;
};

type AnthropicMessageResponse = {
  content?: Array<{
    type?: string;
    text?: string;
  }>;
  error?: {
    message?: string;
  };
};

function getProjectId(): string {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not configured");
  }
  return projectId;
}

function getBaseUrl(): string {
  return `https://firestore.googleapis.com/v1/projects/${getProjectId()}/databases/(default)/documents`;
}

function fromFirestoreValue(value: FirestoreValue | undefined): unknown {
  if (!value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) {
    return (value.arrayValue.values ?? []).map((item) => fromFirestoreValue(item));
  }
  if ("mapValue" in value) {
    const output: Record<string, unknown> = {};
    for (const [key, innerValue] of Object.entries(value.mapValue.fields ?? {})) {
      output[key] = fromFirestoreValue(innerValue);
    }
    return output;
  }
  return null;
}

async function getAnthropicErrorMessage(response: Response): Promise<string> {
  const fallback = `Anthropic request failed (${response.status}).`;
  const rawText = await response.text().catch(() => "");
  if (!rawText) return fallback;

  try {
    const payload = JSON.parse(rawText) as { error?: { message?: string } };
    return payload.error?.message || fallback;
  } catch {
    return rawText;
  }
}

async function getCohortEarningsTotalForNgo(ngoSlug?: string, idToken?: string): Promise<number> {
  if (!ngoSlug?.trim()) return 0;

  const response = await fetch(`${getBaseUrl()}:runQuery`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "cohortEarnings", allDescendants: true }],
        where: {
          fieldFilter: {
            field: { fieldPath: "ngoSlug" },
            op: "EQUAL",
            value: { stringValue: ngoSlug.trim() },
          },
        },
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to read cohortEarnings (${response.status}): ${text}`);
  }

  const rows = (await response.json()) as FirestoreRunQueryRow[];
  return rows.reduce((sum, row) => {
    const creditAmount = fromFirestoreValue(row.document?.fields?.creditAmount);
    return sum + (typeof creditAmount === "number" ? creditAmount : 0);
  }, 0);
}

async function requestAnthropicProjection(node: OrgNode, totalCohortEarnings: number): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `You are analyzing the financial impact of filling a leadership role in the BEAM Think Tank nonprofit network.

Role being filled: "${node.label}"
NGO: ${node.ngoSlug ?? "BEAM network"}
Role description: ${node.description || "No description provided."}
Current cohort earnings baseline for this NGO: $${totalCohortEarnings.toFixed(2)}/month

In 2-3 sentences, estimate the financial impact of this role being filled. Consider:
- Direct revenue activation (productions, recordings, arrangements this role enables)
- Recruitment pipeline value (each student in the pipeline = scholarship + tuition revenue)
- Grant eligibility unlocked (having an active lead in this area strengthens applications)

End your response with a single line formatted exactly as:
ESTIMATED_MONTHLY_IMPACT: $[number]

Be specific and grounded. Do not exaggerate.`,
        },
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await getAnthropicErrorMessage(response));
  }

  const payload = (await response.json()) as AnthropicMessageResponse;
  const text = (payload.content ?? [])
    .filter((item) => item.type === "text" && typeof item.text === "string")
    .map((item) => item.text?.trim() ?? "")
    .filter(Boolean)
    .join("\n\n")
    .trim();

  if (!text) {
    throw new Error(payload.error?.message || "Anthropic returned an empty projection.");
  }

  return text;
}

function parseProjection(rawText: string): NonNullable<OrgNode["aiProjection"]> {
  const impactMatch = rawText.match(/ESTIMATED_MONTHLY_IMPACT:\s*\$?([\d,]+)/);
  if (!impactMatch?.[1]) {
    throw new Error("Projection response did not include ESTIMATED_MONTHLY_IMPACT.");
  }

  const estimatedMonthlyImpact = Number(impactMatch[1].replace(/,/g, ""));
  if (!Number.isFinite(estimatedMonthlyImpact)) {
    throw new Error("Projection response contained an invalid impact value.");
  }

  const summary = rawText
    .split("\n")
    .filter((line) => !line.trim().startsWith("ESTIMATED_MONTHLY_IMPACT:"))
    .join("\n")
    .trim();

  return {
    summary,
    estimatedMonthlyImpact,
    generatedAt: new Date().toISOString(),
  };
}

export async function generateOrgNodeProjection(
  nodeId: string,
  idToken: string
): Promise<NonNullable<OrgNode["aiProjection"]>> {
  const node = await getOrgNodeById(nodeId, idToken);
  if (!node) {
    throw new Error("Org node not found");
  }

  const totalCohortEarnings = await getCohortEarningsTotalForNgo(node.ngoSlug, idToken);
  const rawProjection = await requestAnthropicProjection(node, totalCohortEarnings);
  const projection = parseProjection(rawProjection);

  await updateOrgNode(nodeId, { aiProjection: projection }, idToken);
  return projection;
}
