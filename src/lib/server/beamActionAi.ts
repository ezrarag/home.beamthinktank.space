import OpenAI from "openai";
import { BEAM_TAXONOMY } from "@/lib/beamTaxonomy";
import type { BeamActionTaskDraft, BeamCommitmentType } from "@/types/beamGame";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

interface BeamAiOutput {
  aiSummary: string;
  aiTasks: BeamActionTaskDraft[];
  aiRolesNeeded: string[];
}

function sanitizeRoleTags(roleTags: unknown): string[] {
  if (!Array.isArray(roleTags)) return [];
  const allowed = new Set(BEAM_TAXONOMY.roleTags);
  return roleTags
    .map((role) => String(role))
    .filter((role) => allowed.has(role))
    .slice(0, 7);
}

function sanitizeCommitment(input: unknown): BeamCommitmentType {
  const candidate = String(input ?? "");
  if (BEAM_TAXONOMY.commitmentTypes.includes(candidate as BeamCommitmentType)) {
    return candidate as BeamCommitmentType;
  }
  return "Project-based";
}

function sanitizeTasks(tasks: unknown): BeamActionTaskDraft[] {
  if (!Array.isArray(tasks)) return [];
  return tasks
    .map((task) => {
      if (!task || typeof task !== "object") return null;
      const mapped = task as Record<string, unknown>;
      const title = String(mapped.title ?? "").trim();
      const description = String(mapped.description ?? "").trim();
      if (!title || !description) return null;
      return {
        title,
        description,
        requiredRoleTags: sanitizeRoleTags(mapped.requiredRoleTags),
        commitment: sanitizeCommitment(mapped.commitment),
      } as BeamActionTaskDraft;
    })
    .filter((task): task is BeamActionTaskDraft => Boolean(task))
    .slice(0, 7);
}

function fallbackArtifacts(summaryRaw: string, actionType: string): BeamAiOutput {
  const clean = summaryRaw.trim();
  const summary = clean.length > 220 ? `${clean.slice(0, 217)}...` : clean;
  return {
    aiSummary: summary || `Action logged: ${actionType}.`,
    aiTasks: [
      {
        title: "Capture follow-up owner",
        description: "Assign ownership and due date for the immediate follow-up from this action.",
        requiredRoleTags: ["project-manager"],
        commitment: "1 hr/week",
      },
      {
        title: "Publish short public update",
        description: "Draft a public-safe update summarizing progress and next step.",
        requiredRoleTags: ["content-media", "project-manager"],
        commitment: "1 hr/week",
      },
      {
        title: "Define next milestone",
        description: "Convert this action outcome into the next concrete milestone.",
        requiredRoleTags: ["project-manager", "operations"],
        commitment: "Project-based",
      },
    ],
    aiRolesNeeded: ["project-manager", "operations"],
  };
}

function parseJsonFromText(content: string): Record<string, unknown> | null {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

export async function generateBeamActionArtifacts(params: {
  summaryRaw: string;
  actionType: string;
  regionId: string;
  projectId?: string;
  assetId?: string;
}): Promise<BeamAiOutput> {
  if (!openai) return fallbackArtifacts(params.summaryRaw, params.actionType);

  const prompt = [
    "Generate JSON for BEAM action enrichment.",
    `Action type: ${params.actionType}`,
    `Region ID: ${params.regionId}`,
    `Project ID: ${params.projectId ?? "none"}`,
    `Asset ID: ${params.assetId ?? "none"}`,
    `Action summary: ${params.summaryRaw}`,
    `Allowed role tags: ${BEAM_TAXONOMY.roleTags.join(", ")}`,
    `Allowed commitments: ${BEAM_TAXONOMY.commitmentTypes.join(", ")}`,
    "Rules:",
    "- Return valid JSON only.",
    "- aiSummary must be 2-3 concise sentences.",
    "- aiTasks must contain 3-7 tasks.",
    "- role tags must come from allowed role tags only.",
    "- commitment must come from allowed commitments only.",
    "Output schema: { aiSummary: string, aiTasks: Array<{ title: string, description: string, requiredRoleTags: string[], commitment: string }>, aiRolesNeeded: string[] }",
  ].join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 700,
      messages: [
        {
          role: "system",
          content: "You are a strict JSON generator for operational workflow systems.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const parsed = parseJsonFromText(content);
    if (!parsed) return fallbackArtifacts(params.summaryRaw, params.actionType);

    const aiSummary = String(parsed.aiSummary ?? "").trim();
    const aiTasks = sanitizeTasks(parsed.aiTasks);
    const aiRolesNeeded = sanitizeRoleTags(parsed.aiRolesNeeded);

    if (!aiSummary || aiTasks.length === 0) {
      return fallbackArtifacts(params.summaryRaw, params.actionType);
    }

    return {
      aiSummary,
      aiTasks,
      aiRolesNeeded,
    };
  } catch {
    return fallbackArtifacts(params.summaryRaw, params.actionType);
  }
}
