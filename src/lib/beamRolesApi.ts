import type { BeamRole, BeamRoleResponse } from "@/types/beamRoles";

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

function normalizeRole(raw: unknown): BeamRole | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Record<string, unknown>;

  const tasks = Array.isArray(candidate.tasks)
    ? candidate.tasks.reduce<NonNullable<BeamRole["tasks"]>>((acc, task) => {
        if (!task || typeof task !== "object") return acc;
        const shaped = task as Record<string, unknown>;
        acc.push({
          id: typeof shaped.id === "string" ? shaped.id : undefined,
          title: typeof shaped.title === "string" ? shaped.title : undefined,
          description: typeof shaped.description === "string" ? shaped.description : undefined,
          status: typeof shaped.status === "string" ? shaped.status : undefined,
          dueAt: typeof shaped.dueAt === "string" ? shaped.dueAt : undefined,
        });
        return acc;
      }, [])
    : [];

  return {
    id: typeof candidate.id === "string" ? candidate.id : undefined,
    roleId: typeof candidate.roleId === "string" ? candidate.roleId : undefined,
    clientId: typeof candidate.clientId === "string" ? candidate.clientId : undefined,
    clientName: typeof candidate.clientName === "string" ? candidate.clientName : undefined,
    roleTitle: typeof candidate.roleTitle === "string" ? candidate.roleTitle : undefined,
    summary: typeof candidate.summary === "string" ? candidate.summary : undefined,
    cityHint: typeof candidate.cityHint === "string" ? candidate.cityHint : undefined,
    requirements: normalizeStringList(candidate.requirements),
    requirementTags: normalizeStringList(candidate.requirementTags),
    timebox: typeof candidate.timebox === "string" ? candidate.timebox : undefined,
    tasks,
    status: typeof candidate.status === "string" ? candidate.status : undefined,
    publishedAt: typeof candidate.publishedAt === "string" ? candidate.publishedAt : undefined,
  };
}

function normalizeRolesPayload(payload: unknown): BeamRole[] {
  if (Array.isArray(payload)) {
    return payload.map(normalizeRole).filter((role): role is BeamRole => Boolean(role));
  }
  if (!payload || typeof payload !== "object") return [];

  const shaped = payload as BeamRoleResponse & { data?: BeamRole[] | BeamRoleResponse };
  const fromRoles = Array.isArray(shaped.roles) ? shaped.roles : [];
  if (fromRoles.length > 0) {
    return fromRoles.map(normalizeRole).filter((role): role is BeamRole => Boolean(role));
  }

  if (Array.isArray(shaped.data)) {
    return shaped.data.map(normalizeRole).filter((role): role is BeamRole => Boolean(role));
  }

  if (shaped.data && typeof shaped.data === "object" && Array.isArray((shaped.data as BeamRoleResponse).roles)) {
    return ((shaped.data as BeamRoleResponse).roles ?? [])
      .map(normalizeRole)
      .filter((role): role is BeamRole => Boolean(role));
  }

  return [];
}

export async function fetchPublishedRoles(): Promise<BeamRole[]> {
  const url = process.env.READYAIMGO_BEAM_ROLES_URL;
  const apiKey = process.env.READYAIMGO_BEAM_API_KEY;

  if (!url || !apiKey) {
    console.error("Roles API env vars are missing: READYAIMGO_BEAM_ROLES_URL and/or READYAIMGO_BEAM_API_KEY.");
    return [];
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`Roles API returned ${response.status}: ${body}`);
      return [];
    }

    const payload: unknown = await response.json();
    return normalizeRolesPayload(payload);
  } catch (error) {
    console.error("Failed to fetch published roles:", error);
    return [];
  }
}
