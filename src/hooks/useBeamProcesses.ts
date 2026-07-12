"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, type DocumentData, type Query } from "firebase/firestore";

import { getFirebaseDb } from "@/lib/firebaseClient";
import type { BeamProcess, BeamProcessStage } from "@/types/beamProcess";

const BEAM_PROCESSES_COLLECTION = "beamProcesses";

type BeamProcessDomain = BeamProcess["domain"];

export interface UseBeamProcessesResult {
  processes: BeamProcess[];
  loading: boolean;
  error: Error | null;
}

function toIsoString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toDate" in value) {
    const toDate = (value as { toDate?: unknown }).toDate;
    if (typeof toDate === "function") {
      return (toDate.call(value) as Date).toISOString();
    }
  }
  return "";
}

function normalizeStage(value: BeamProcessStage): BeamProcessStage {
  return {
    ...value,
    updatedAt: toIsoString(value.updatedAt),
  };
}

function normalizeProcess(id: string, data: DocumentData): BeamProcess {
  return {
    ...(data as Omit<BeamProcess, "id">),
    id,
    stages: Array.isArray(data.stages) ? (data.stages as BeamProcessStage[]).map(normalizeStage) : [],
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

export function useBeamProcesses(domain?: BeamProcessDomain): UseBeamProcessesResult {
  const [processes, setProcesses] = useState<BeamProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const collectionRef = collection(getFirebaseDb(), BEAM_PROCESSES_COLLECTION);
    const processesQuery: Query<DocumentData> = domain
      ? query(collectionRef, where("domain", "==", domain))
      : query(collectionRef);

    return onSnapshot(
      processesQuery,
      (snapshot) => {
        const nextProcesses = snapshot.docs
          .map((document) => normalizeProcess(document.id, document.data()))
          .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

        setProcesses(nextProcesses);
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError);
        setLoading(false);
      }
    );
  }, [domain]);

  return { processes, loading, error };
}
