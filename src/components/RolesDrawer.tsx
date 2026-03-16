"use client";

import { useEffect, useMemo, useState } from "react";
import type { BeamRole, BeamRoleResponse } from "@/types/beamRoles";

interface RolesDrawerFilter {
  chapterId?: string;
  nodeId?: string;
  city?: string;
}

interface RolesDrawerProps {
  open: boolean;
  onClose: () => void;
  filter?: RolesDrawerFilter;
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[-_]+/g, " ");
}

function looksLikeSkillToken(nodeId?: string): boolean {
  if (!nodeId) return false;
  const normalized = normalizeToken(nodeId);
  const blocked = ["explore", "about", "overview", "learn more", "home"];
  if (blocked.includes(normalized)) return false;
  return normalized.length >= 3;
}

function roleIdForLog(role: BeamRole): string {
  return role.roleId ?? role.id ?? "unknown-role";
}

function clientIdForLog(role: BeamRole): string {
  return role.clientId ?? "unknown-client";
}

export default function RolesDrawer({ open, onClose, filter }: RolesDrawerProps) {
  const [roles, setRoles] = useState<BeamRole[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      setHasError(false);
      try {
        const response = await fetch("/api/roles", { cache: "no-store" });
        if (!response.ok) throw new Error("Roles route failed");
        const payload = (await response.json()) as BeamRoleResponse;
        if (!cancelled) {
          setRoles(Array.isArray(payload.roles) ? payload.roles : []);
        }
      } catch {
        if (!cancelled) {
          setHasError(true);
          setRoles([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const filteredRoles = useMemo(() => {
    const city = filter?.city?.trim().toLowerCase();
    const nodeId = filter?.nodeId ? normalizeToken(filter.nodeId) : undefined;
    const useNodeFilter = looksLikeSkillToken(filter?.nodeId);

    let next = roles;
    if (useNodeFilter && nodeId) {
      next = next.filter((role) => {
        const tagPool = [...(role.requirementTags ?? []), ...(role.requirements ?? [])]
          .map((tag) => normalizeToken(tag));
        return tagPool.some((tag) => tag.includes(nodeId) || nodeId.includes(tag));
      });
    }

    if (city) {
      const ranked = [...next].sort((a, b) => {
        const aMatch = (a.cityHint ?? "").toLowerCase().includes(city) ? 1 : 0;
        const bMatch = (b.cityHint ?? "").toLowerCase().includes(city) ? 1 : 0;
        return bMatch - aMatch;
      });
      return ranked;
    }

    return next;
  }, [roles, filter?.city, filter?.nodeId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close roles drawer backdrop"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />
      <aside className="absolute right-0 top-0 h-full w-full max-w-xl border-l border-white/10 bg-[#12151b] p-5 text-white shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Published Roles</h2>
            <p className="mt-1 text-xs text-neutral-400">
              {filter?.chapterId ? `Chapter: ${filter.chapterId}` : "All chapters"}
              {filter?.nodeId ? ` • Node: ${filter.nodeId}` : ""}
              {filter?.city ? ` • City: ${filter.city}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/20 px-3 py-1 text-xs hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <div className="h-[calc(100%-4.5rem)] overflow-y-auto pr-1">
          {isLoading ? <p className="text-sm text-neutral-300">Loading roles...</p> : null}
          {!isLoading && hasError ? <p className="text-sm text-neutral-300">Roles feed is temporarily unavailable.</p> : null}
          {!isLoading && !hasError && filteredRoles.length === 0 ? (
            <p className="text-sm text-neutral-300">No roles published yet.</p>
          ) : null}

          {!isLoading && !hasError && filteredRoles.length > 0 ? (
            <div className="space-y-3">
              {filteredRoles.map((role, index) => (
                <article key={`${role.roleId ?? role.id ?? "role"}-${index}`} className="rounded-xl border border-white/10 bg-[#181c24] p-4">
                  <h3 className="text-base font-semibold">{role.roleTitle ?? "Untitled Role"}</h3>
                  <p className="mt-1 text-sm text-[#89C0D0]">{role.clientName ?? "Unknown client"}</p>
                  <p className="mt-2 text-sm text-neutral-300">{role.summary ?? "No summary provided yet."}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(role.requirementTags?.length ? role.requirementTags : role.requirements ?? []).map((tag) => (
                      <span key={tag} className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-neutral-200">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-neutral-400">
                    Timebox: {role.timebox ?? "TBD"}
                    {role.cityHint ? ` • City: ${role.cityHint}` : ""}
                  </p>
                  <button
                    type="button"
                    onClick={() => console.log({ roleId: roleIdForLog(role), clientId: clientIdForLog(role) })}
                    className="mt-3 rounded-md bg-[#89C0D0] px-3 py-2 text-xs font-semibold text-[#0c1215] hover:brightness-95"
                  >
                    Express Interest
                  </button>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
