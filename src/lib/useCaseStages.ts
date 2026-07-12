export const USE_CASE_COLLECTION = "useCases";

export const USE_CASE_STAGES = {
  agency: {
    label: "Agency",
    colorBg: "#EEEDFE",
    colorFg: "#3C3489",
  },
  redevelopment: {
    label: "Redevelopment",
    colorBg: "#EAF3DE",
    colorFg: "#3B6D11",
  },
  recording: {
    label: "Recording",
    colorBg: "#FAEEDA",
    colorFg: "#854F0B",
  },
  directory: {
    label: "Directory",
    colorBg: "#E1F5EE",
    colorFg: "#0F6E56",
  },
  procurement: {
    label: "Procurement",
    colorBg: "#FBE9E7",
    colorFg: "#A23C28",
  },
  education: {
    label: "Education",
    colorBg: "#E7EEFB",
    colorFg: "#2A4C8F",
  },
} as const;

export type UseCaseStage = keyof typeof USE_CASE_STAGES;
export type UseCaseStatus = "concept" | "active" | "paused" | "complete";

export interface UseCaseStep {
  body: string;
  tools: string[];
}

export interface UseCaseMoney {
  body: string;
}

export interface UseCase {
  slug: string;
  name: string;
  context: string;
  stage: UseCaseStage;
  economicModel: string;
  firstAction: string;
  capture: UseCaseStep;
  orchestrate: UseCaseStep;
  produce: UseCaseStep;
  money: UseCaseMoney;
  relatedClientSlug: string | null;
  relatedDivision: string | null;
  status: UseCaseStatus;
  isPublished: boolean;
  sortOrder: number;
  updatedAt?: string | null;
}

export const USE_CASE_STAGE_ORDER = Object.keys(USE_CASE_STAGES) as UseCaseStage[];

export function isUseCaseStage(value: string): value is UseCaseStage {
  return value in USE_CASE_STAGES;
}

export function normalizeToolList(values: string[]): string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}

export function slugifyUseCase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
