export {};

import { execSync } from "node:child_process";
import type { UseCase } from "../src/lib/useCaseStages";

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

const useCases: UseCase[] = [
  {
    slug: "central-umc-roof",
    name: "Central UMC roof",
    context: "Rev. Thomas-Breitfeld · pilot redevelopment",
    stage: "redevelopment",
    economicModel: "Sweat-equity ledger → grant/bond financing",
    firstAction: "Faculty-supervised feasibility scan",
    capture: {
      body: "GroundsField/SCOUT: photograph roof, interior, debris; laser scan with architecture faculty (Krissie Meingast, William Krueger).",
      tools: ["iPhone", "GroundsField", "Laser scan"],
    },
    orchestrate: {
      body: "Compile condition into a feasibility brief; research historic rooflines and comparable adaptive-reuse projects; check historic-designation status (unlocks tax credits, triggers design review).",
      tools: ["Laptop", "NotebookLM", "CKAN permits"],
    },
    produce: {
      body: "Render the restored building / original roofline from historic photos as the fundraising centerpiece; publish a project page that drives the concert fundraiser and the grant narrative.",
      tools: ["RunPod", "Flux", "ComfyUI"],
    },
    money: {
      body: "Wallet records verified volunteer hours + stores the sweat-equity agreements. Those documented contributions are the MATCH that unlocks SHOP/HOME grants, historic tax credits, bonds (MPL precedent), and CDFI capital — which pays for the licensed roof work. The wallet is the ledger, not the lender.",
    },
    relatedClientSlug: null,
    relatedDivision: "grounds",
    status: "active",
    isPublished: true,
    sortOrder: 0,
    updatedAt: null,
  },
  {
    slug: "stern-art-representation",
    name: "Stern art representation",
    context: "Nathaniel Stern · 50% commission offered",
    stage: "agency",
    economicModel: "Commission 50% on closed sale",
    firstAction: "Build site + buyer dossier",
    capture: {
      body: "Photograph the artworks; capture artist statement and provenance.",
      tools: ["iPhone", "Claude app"],
    },
    orchestrate: {
      body: "Build his representation site; research collectors, galleries, and shows that fit; assemble a buyer dossier per piece.",
      tools: ["Laptop", "NotebookLM", "Next.js"],
    },
    produce: {
      body: "With his consent, train a LoRA on his OWN visual language to generate show promo and campaign assets — consent is the ethical spine.",
      tools: ["RunPod", "Flux", "LoRA"],
    },
    money: {
      body: "One deal record per piece: grossAmount, agentSharePct 0.50, cohort split. Pay his RAG subscription out of the first sale. Visual-art representation is largely unregulated, but paper it with a one-page consignment agreement first.",
    },
    relatedClientSlug: "nathaniel-stern",
    relatedDivision: "band",
    status: "active",
    isPublished: true,
    sortOrder: 1,
    updatedAt: null,
  },
  {
    slug: "dayvin-persona-concerts",
    name: "Dayvin persona concerts",
    context: "Dayvin Hallman · conductor",
    stage: "agency",
    economicModel: "Subscription + commission on bookings",
    firstAction: "Brand site + event plan",
    capture: {
      body: "Shoot performances and rehearsals; capture brand assets.",
      tools: ["iPhone", "GroundsField"],
    },
    orchestrate: {
      body: "Build the brand site; plan the fundraising concerts; map venues (the museum planetarium is a bookable asset).",
      tools: ["Laptop", "NotebookLM", "Next.js"],
    },
    produce: {
      body: "Brand-consistent campaign assets and concert promo across the NGO subdomains.",
      tools: ["Flux", "CapCut", "HyperFrames"],
    },
    money: {
      body: "Cohort + Nexus + Space subscription for the standing team, plus a commission deal record on each booking he closes.",
    },
    relatedClientSlug: "dayvin-hallman",
    relatedDivision: "orchestra",
    status: "active",
    isPublished: true,
    sortOrder: 2,
    updatedAt: null,
  },
  {
    slug: "recording-cohort",
    name: "Recording cohort",
    context: "Bader Hall · Jeong-In Kim, Robert Danner, DV Productions",
    stage: "recording",
    economicModel: "Cohort Network + revenue share on releases",
    firstAction: "Document first session",
    capture: {
      body: "Multi-mic session capture (Zoom recorder upstage, two Rode mics behind podium).",
      tools: ["iPhone", "Zoom recorder", "Rode mics"],
    },
    orchestrate: {
      body: "Edit, mix, and master; build the release plan across subdomains.",
      tools: ["Laptop", "DAW", "AssemblyAI"],
    },
    produce: {
      body: "Released tracks + performance video, multiple cuts distributed per NGO subdomain.",
      tools: ["CapCut", "Veo3", "HyperFrames"],
    },
    money: {
      body: "Engineer/producer time proportionate to the Cohort subscription; revenue share on ticketed performances and releases. The Central UMC choir-room conversion feeds this directly.",
    },
    relatedClientSlug: null,
    relatedDivision: "band",
    status: "concept",
    isPublished: true,
    sortOrder: 3,
    updatedAt: null,
  },
  {
    slug: "mke-black-directory",
    name: "MKE Black directory",
    context: "Rick Banks · Black business directory",
    stage: "directory",
    economicModel: "Membership + Stripe Connect",
    firstAction: "Deploy + import businesses",
    capture: {
      body: "Business photos, hours, owner verification.",
      tools: ["iPhone", "MKEBlack.app"],
    },
    orchestrate: {
      body: "Directory, search, claims queue, articles, events; CSV import of ~300 businesses.",
      tools: ["Laptop", "Next.js", "Firebase"],
    },
    produce: {
      body: "Promo content and business spotlights; white-label path to BLK City Collective.",
      tools: ["Flux", "HyperFrames"],
    },
    money: {
      body: "Membership $10/mo via Stripe Connect to Rick's account; RAG platform takes destination-charge share.",
    },
    relatedClientSlug: "mke-black",
    relatedDivision: null,
    status: "active",
    isPublished: true,
    sortOrder: 4,
    updatedAt: null,
  },
  {
    slug: "equipment-procurement-pool",
    name: "Equipment procurement pool",
    context: "Participant contribution model",
    stage: "procurement",
    economicModel: "Contribution pool → shared RAG asset",
    firstAction: "Define first shared asset",
    capture: {
      body: "Intake of equipment needs across cohorts (cameras, mics, tools, vehicles).",
      tools: ["iPhone", "Intake form"],
    },
    orchestrate: {
      body: "Source and price options; aggregate demand across cohorts; track who contributed what.",
      tools: ["Laptop", "NotebookLM", "Firestore"],
    },
    produce: {
      body: "A shared asset registry — equipment owned by RAG with commercial insurance, bookable by participants.",
      tools: ["Asset registry"],
    },
    money: {
      body: "Contributions logged in the wallet as ledger entries toward shared ownership/access — NOT tradeable tokens. Commercial insurance + outside-institution pros is the route around departmental equipment lockouts.",
    },
    relatedClientSlug: null,
    relatedDivision: null,
    status: "concept",
    isPublished: true,
    sortOrder: 5,
    updatedAt: null,
  },
  {
    slug: "crafting-ai-model-tuning",
    name: "Crafting AI model tuning",
    context: "with Stern · NMDSI grant · your TA course",
    stage: "education",
    economicModel: "Academic credit + research grant",
    firstAction: "Build the student dataset pipeline",
    capture: {
      body: "Students assemble curated, public-domain or self-owned datasets (30–100+ images).",
      tools: ["iPhone", "NotebookLM"],
    },
    orchestrate: {
      body: "Curriculum and dataset prep; the consent/derivatives module is built into Week 5.",
      tools: ["Laptop", "ComfyUI"],
    },
    produce: {
      body: "Students launch and evaluate their own training runs; outputs that are both artworks and platforms.",
      tools: ["RunPod", "LoRA", "Flux"],
    },
    money: {
      body: "Academic credit + NMDSI research funding. Also the seed of a BEAM AI research node at UWM — the Empire AI model: a consortium that democratizes compute and studies model governance.",
    },
    relatedClientSlug: "nathaniel-stern",
    relatedDivision: "education",
    status: "active",
    isPublished: true,
    sortOrder: 6,
    updatedAt: null,
  },
];

function getProjectId(): string {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is required.");
  }
  return projectId;
}

function getAccessToken(): string {
  const cliToken = process.argv[2]?.trim();
  const envToken =
    process.env.GOOGLE_OAUTH_ACCESS_TOKEN?.trim() ||
    process.env.GCLOUD_ACCESS_TOKEN?.trim() ||
    process.env.FIREBASE_ACCESS_TOKEN?.trim();

  if (cliToken || envToken) {
    return cliToken || envToken || "";
  }

  try {
    return execSync("gcloud auth print-access-token", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    throw new Error(
      "No Google access token found. Run `gcloud auth login` first, or pass one as the first CLI arg, or set GOOGLE_OAUTH_ACCESS_TOKEN."
    );
  }
}

function getBaseUrl(): string {
  return `https://firestore.googleapis.com/v1/projects/${getProjectId()}/databases/(default)/documents`;
}

function getDocumentName(slug: string): string {
  return `projects/${getProjectId()}/databases/(default)/documents/useCases/${slug}`;
}

function toFirestoreValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return { integerValue: String(Math.trunc(value)) };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map((item) => toFirestoreValue(item)) } };
  }
  if (typeof value === "object") {
    const fields: Record<string, FirestoreValue> = {};
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      fields[key] = toFirestoreValue(nestedValue);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

function toFirestoreFields(value: Record<string, unknown>): Record<string, FirestoreValue> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    fields[key] = toFirestoreValue(nestedValue);
  }
  return fields;
}

async function commitWrites(accessToken: string, writes: unknown[]): Promise<void> {
  const response = await fetch(`${getBaseUrl()}:commit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ writes }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Firestore write failed (${response.status}): ${text}`);
  }
}

async function seed() {
  const accessToken = getAccessToken();

  for (const [index, useCase] of useCases.entries()) {
    const normalized = {
      ...useCase,
      sortOrder: index,
    };

    await commitWrites(accessToken, [
      {
        update: {
          name: getDocumentName(normalized.slug),
          fields: toFirestoreFields(normalized as unknown as Record<string, unknown>),
        },
        updateMask: {
          fieldPaths: [
            "slug",
            "name",
            "context",
            "stage",
            "economicModel",
            "firstAction",
            "capture",
            "orchestrate",
            "produce",
            "money",
            "relatedClientSlug",
            "relatedDivision",
            "status",
            "isPublished",
            "sortOrder",
          ],
        },
      },
      {
        transform: {
          document: getDocumentName(normalized.slug),
          fieldTransforms: [{ fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" }],
        },
      },
    ]);

    console.log(`Seeded use case ${index + 1}/${useCases.length}: ${normalized.slug}`);
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
