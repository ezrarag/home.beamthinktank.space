import { collection, doc, getDoc, getDocs } from "firebase/firestore";

export interface ArchitectureProjectStat {
  projectId: string;
  projectTitle: string;
  mappedCount: number;
  totalTodos: number;
  completedTodos: number;
  lastActivity: string | null;
}

export interface ArchitectureNgoStats {
  totalParticipants: number;
  activeProjectCount: number;
  projectStats: ArchitectureProjectStat[];
}

interface ArchitectureProjectMapping {
  projectId: string;
  projectTitle: string;
}

interface ArchitectureWorkspaceData {
  projectTitle?: string;
  todos?: Array<{ completed: boolean }>;
  updatedAt?: string;
}

export async function fetchArchitectureNgoStats(
  db: ReturnType<typeof import("firebase/firestore").getFirestore>
): Promise<ArchitectureNgoStats> {
  const [membershipsSnap, mappingsSnap] = await Promise.all([
    getDocs(collection(db, "architectureMemberships")),
    getDocs(collection(db, "architectureProjectMappings")),
  ]);

  const totalParticipants = membershipsSnap.size;

  const mappingsByProject = new Map<string, { projectTitle: string; count: number }>();
  mappingsSnap.docs.forEach((mappingDoc) => {
    const data = mappingDoc.data() as ArchitectureProjectMapping;
    const existing = mappingsByProject.get(data.projectId) ?? { projectTitle: data.projectTitle, count: 0 };
    mappingsByProject.set(data.projectId, { ...existing, count: existing.count + 1 });
  });

  const projectIds = [...mappingsByProject.keys()];
  const workspaceDocs = await Promise.all(
    projectIds.map((id) => getDoc(doc(db, "architectureWorkspaces", id)).catch(() => null))
  );

  const projectStats: ArchitectureProjectStat[] = projectIds.map((projectId, index) => {
    const mapping = mappingsByProject.get(projectId)!;
    const workspaceDoc = workspaceDocs[index];
    const workspaceData =
      workspaceDoc && workspaceDoc.exists() ? (workspaceDoc.data() as ArchitectureWorkspaceData) : null;

    const todos = workspaceData?.todos ?? [];
    return {
      projectId,
      projectTitle: mapping.projectTitle,
      mappedCount: mapping.count,
      totalTodos: todos.length,
      completedTodos: todos.filter((todo) => todo.completed).length,
      lastActivity: workspaceData?.updatedAt ?? null,
    };
  });

  return { totalParticipants, activeProjectCount: projectIds.length, projectStats };
}
