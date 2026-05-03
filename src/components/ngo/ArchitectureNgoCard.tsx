"use client";

import { useEffect, useState } from "react";
import { fetchArchitectureNgoStats, type ArchitectureNgoStats } from "@/lib/architectureNgoStats";
import { getFirebaseDb } from "@/lib/firebaseClient";

function getCompletionPercent(completedTodos: number, totalTodos: number): number {
  if (totalTodos <= 0) return 0;
  return Math.round((completedTodos / totalTodos) * 100);
}

export default function ArchitectureNgoCard() {
  const [stats, setStats] = useState<ArchitectureNgoStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadStats() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextStats = await fetchArchitectureNgoStats(getFirebaseDb());
        if (isMounted) {
          setStats(nextStats);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "Failed to load Architecture NGO stats.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadStats();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-white/50">BEAM Architecture</p>
        <p className="mt-2 text-sm text-white/50">Loading stats...</p>
      </article>
    );
  }

  if (errorMessage) {
    return (
      <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-white/50">BEAM Architecture</p>
        <p className="mt-2 text-sm text-red-300">{errorMessage}</p>
      </article>
    );
  }

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/50">BEAM Architecture</p>
          <h2 className="mt-2 text-xl font-medium">Architecture NGO</h2>
        </div>
        <a
          href="https://architecture.beamthinktank.space"
          target="_blank"
          rel="noreferrer"
          className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:text-white"
        >
          Visit site
        </a>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-white/50">Participants</p>
          <p className="mt-2 text-2xl font-semibold text-white">{stats?.totalParticipants ?? 0}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-white/50">Active Projects</p>
          <p className="mt-2 text-2xl font-semibold text-white">{stats?.activeProjectCount ?? 0}</p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {stats && stats.projectStats.length > 0 ? (
          stats.projectStats.map((project) => {
            const completionPercent = getCompletionPercent(project.completedTodos, project.totalTodos);

            return (
              <div key={project.projectId} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="min-w-0 truncate text-sm font-medium text-white">{project.projectTitle}</h3>
                  <p className="shrink-0 text-xs text-white/50">{project.mappedCount} mapped</p>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-[#4caf7d]" style={{ width: `${completionPercent}%` }} />
                </div>
                <p className="text-xs text-white/50">
                  {project.completedTodos}/{project.totalTodos} todos · {completionPercent}% complete
                </p>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-white/50">No active Architecture projects yet.</p>
        )}
      </div>

      <a
        href="https://architecture.beamthinktank.space/workspace"
        target="_blank"
        rel="noreferrer"
        className="mt-5 inline-flex rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:text-white"
      >
        Open workspaces
      </a>
    </article>
  );
}
