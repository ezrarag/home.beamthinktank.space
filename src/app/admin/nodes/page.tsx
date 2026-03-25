"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebaseClient";
import type { BeamNode, NodeStage, NodeStatus } from "@/lib/server/firestoreNodes";

type EditableNode = BeamNode & {
  focusSectorsInput: string;
  anchorInstitutionUrl: string;
  coordinatorName: string;
  coordinatorEmail: string;
};

const STAGE_OPTIONS: Array<{ value: NodeStage; label: string; status: NodeStatus }> = [
  { value: 0, label: "Stage 0 — Identified", status: "identified" },
  { value: 1, label: "Stage 1 — Forming", status: "forming" },
  { value: 2, label: "Stage 2 — Activating", status: "activating" },
  { value: 3, label: "Stage 3 — Active", status: "active" },
  { value: 4, label: "Stage 4 — Established", status: "established" },
];

function stageBadgeClass(stage: NodeStage): string {
  if (stage === 4) return "border-white/30 bg-white/10 text-white";
  if (stage === 3) return "border-[var(--beam-gold)] bg-[rgba(200,185,122,0.14)] text-[var(--beam-gold-bright)]";
  if (stage === 2) return "border-amber-400/30 bg-amber-500/10 text-amber-200";
  if (stage === 1) return "border-yellow-400/30 bg-yellow-500/10 text-yellow-100";
  return "border-white/10 bg-white/5 text-white/55";
}

function toEditableNode(node: BeamNode): EditableNode {
  return {
    ...node,
    focusSectorsInput: node.focusSectors.join(", "),
    anchorInstitutionUrl: node.anchorInstitution.url ?? "",
    coordinatorName: node.coordinator?.name ?? "",
    coordinatorEmail: node.coordinator?.email ?? "",
  };
}

function toNodePayload(node: EditableNode): Omit<BeamNode, "id"> {
  return {
    city: node.city,
    state: node.state,
    stage: node.stage,
    status: node.status,
    publiclyVisible: node.publiclyVisible,
    coordinates: node.coordinates,
    anchorInstitution: {
      name: node.anchorInstitution.name,
      url: node.anchorInstitutionUrl.trim() || undefined,
      confirmedAt: node.anchorInstitution.confirmedAt,
    },
    focusSectors: node.focusSectorsInput
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    coordinator:
      node.coordinatorName.trim() || node.coordinatorEmail.trim()
        ? {
            name: node.coordinatorName.trim(),
            email: node.coordinatorEmail.trim(),
          }
        : null,
    memberCount: node.memberCount,
    activationChecklist: node.activationChecklist,
    publicSummary: node.publicSummary,
    createdAt: node.createdAt,
    activatedAt: node.activatedAt,
  };
}

export default function AdminNodesPage() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [nodes, setNodes] = useState<BeamNode[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditableNode | null>(null);

  useEffect(() => {
    try {
      const auth = getFirebaseAuth();
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setIsSignedIn(Boolean(user));
      });
      return unsubscribe;
    } catch {
      setIsSignedIn(false);
      return undefined;
    }
  }, []);

  async function handleGoogleSignIn() {
    setError(null);
    try {
      const auth = getFirebaseAuth();
      const provider = new GoogleAuthProvider();
      try {
        await signInWithPopup(auth, provider);
      } catch (popupError) {
        const code =
          typeof popupError === "object" && popupError !== null && "code" in popupError
            ? String((popupError as { code?: string }).code ?? "")
            : "";
        if (code === "auth/popup-blocked" || code === "auth/cancelled-popup-request") {
          await signInWithRedirect(auth, provider);
          return;
        }
        throw popupError;
      }
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : "Google sign-in failed.");
    }
  }

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const auth = getFirebaseAuth();
    if (!auth.currentUser) {
      throw new Error("Sign in with a Firebase account first.");
    }
    const token = await auth.currentUser.getIdToken(true);
    return { Authorization: `Bearer ${token}` };
  }, []);

  const loadNodes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/nodes", {
        headers: await getAuthHeaders(),
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as { nodes?: BeamNode[]; error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load nodes.");
      }
      const fetchedNodes = Array.isArray(payload.nodes) ? payload.nodes : [];
      setNodes(fetchedNodes);

      if (editingId) {
        const matching = fetchedNodes.find((node) => node.id === editingId);
        setDraft(matching ? toEditableNode(matching) : null);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load nodes.");
    } finally {
      setIsLoading(false);
    }
  }, [editingId, getAuthHeaders]);

  useEffect(() => {
    if (!isSignedIn) return;
    void loadNodes();
  }, [isSignedIn, loadNodes]);

  const orderedNodes = useMemo(
    () => [...nodes].sort((left, right) => left.stage - right.stage || left.city.localeCompare(right.city)),
    [nodes]
  );

  async function saveDraft(nextDraft: EditableNode, success: string) {
    setSavingId(nextDraft.id);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/admin/nodes/${nextDraft.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(await getAuthHeaders()),
        },
        body: JSON.stringify(toNodePayload(nextDraft)),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to save node.");
      }
      setSuccessMessage(success);
      setEditingId(null);
      setDraft(null);
      await loadNodes();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save node.");
    } finally {
      setSavingId(null);
    }
  }

  function beginEdit(node: BeamNode) {
    setEditingId(node.id);
    setDraft(toEditableNode(node));
    setSuccessMessage(null);
    setError(null);
  }

  async function handleToggleVisibility(node: BeamNode) {
    await saveDraft(
      toEditableNode({
        ...node,
        publiclyVisible: !node.publiclyVisible,
      }),
      `${node.city} visibility updated.`
    );
  }

  async function handleAdvanceStage(node: BeamNode) {
    const currentIndex = STAGE_OPTIONS.findIndex((option) => option.value === node.stage);
    const nextOption = STAGE_OPTIONS[Math.min(currentIndex + 1, STAGE_OPTIONS.length - 1)] ?? STAGE_OPTIONS[0];
    await saveDraft(
      toEditableNode({
        ...node,
        stage: nextOption.value,
        status: nextOption.status,
        publiclyVisible: nextOption.value >= 2 ? node.publiclyVisible : false,
      }),
      `${node.city} advanced to ${nextOption.label}.`
    );
  }

  return (
    <main className="min-h-screen w-full bg-[#0e0e0e] text-white">
      <div className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-8">
        <header className="border-b border-white/10 pb-6">
          <p className="text-xs uppercase tracking-[0.28em] text-white/50">BEAM Internal</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Node Management</h1>
          <p className="mt-3 max-w-3xl text-sm text-white/70 sm:text-base">
            Manage city node stages, visibility, and activation progress. Hidden nodes remain available here even when
            they do not appear on the public map.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:text-white"
            >
              {isSignedIn ? "Signed In" : "Sign In"}
            </button>
            <button
              type="button"
              onClick={() => void loadNodes()}
              disabled={!isSignedIn || isLoading}
              className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:text-white disabled:opacity-50"
            >
              {isLoading ? "Refreshing..." : "Refresh"}
            </button>
            <Link
              href="/admin"
              className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:text-white"
            >
              Back To Admin
            </Link>
          </div>
          {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
          {successMessage ? <p className="mt-4 text-sm text-emerald-300">{successMessage}</p> : null}
        </header>

        <section className="mt-8 space-y-4">
          {orderedNodes.map((node) => {
            const isEditing = editingId === node.id && draft !== null;
            const editingDraft = isEditing ? draft : null;
            return (
              <article key={node.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-medium">
                        {node.city}, {node.state}
                      </h2>
                      <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] ${stageBadgeClass(node.stage)}`}>
                        {STAGE_OPTIONS.find((option) => option.value === node.stage)?.label ?? `Stage ${node.stage}`}
                      </span>
                    </div>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-white/65">{node.publicSummary || "No public summary set yet."}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => beginEdit(node)}
                      className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:text-white"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleToggleVisibility(node)}
                      disabled={savingId === node.id}
                      className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:text-white disabled:opacity-50"
                    >
                      Toggle Visibility
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleAdvanceStage(node)}
                      disabled={savingId === node.id || node.stage === 4}
                      className="rounded-full border border-[var(--beam-gold)] bg-[rgba(200,185,122,0.12)] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[var(--beam-gold-bright)] transition hover:bg-[rgba(200,185,122,0.18)] disabled:opacity-50"
                    >
                      Advance Stage
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/45">Checklist</p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <div className="text-sm text-white/75">{node.activationChecklist.minNGOsReached ? "✓" : "✗"} NGOs Reached</div>
                      <div className="text-sm text-white/75">{node.activationChecklist.coordinatorActive ? "✓" : "✗"} Coordinator Active</div>
                      <div className="text-sm text-white/75">{node.activationChecklist.anchorConfirmed ? "✓" : "✗"} Anchor Confirmed</div>
                      <div className="text-sm text-white/75">{node.activationChecklist.legalStructure ? "✓" : "✗"} Legal Structure</div>
                      <div className="text-sm text-white/75">{node.activationChecklist.toolsTested ? "✓" : "✗"} Tools Tested</div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm text-white/70">
                    <p>Sectors: {node.focusSectors.join(" · ") || "none"}</p>
                    <p className="mt-2">Members: {node.memberCount}</p>
                    <p className="mt-2">Publicly Visible: {node.publiclyVisible ? "YES" : "NO"}</p>
                    <p className="mt-2">Anchor: {node.anchorInstitution.name || "Not set"}</p>
                  </div>
                </div>

                {editingDraft ? (
                  <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2 text-sm">
                        <span className="text-white/70">Anchor Institution</span>
                        <input
                          value={editingDraft.anchorInstitution.name}
                          onChange={(event) =>
                            setDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    anchorInstitution: {
                                      ...current.anchorInstitution,
                                      name: event.target.value,
                                    },
                                  }
                                : current
                            )
                          }
                          className="w-full rounded-xl border border-white/10 bg-[#121317] px-3 py-2 text-white"
                        />
                      </label>
                      <label className="space-y-2 text-sm">
                        <span className="text-white/70">Anchor URL</span>
                        <input
                          value={editingDraft.anchorInstitutionUrl}
                          onChange={(event) => setDraft((current) => (current ? { ...current, anchorInstitutionUrl: event.target.value } : current))}
                          className="w-full rounded-xl border border-white/10 bg-[#121317] px-3 py-2 text-white"
                        />
                      </label>
                      <label className="space-y-2 text-sm">
                        <span className="text-white/70">Coordinator Name</span>
                        <input
                          value={editingDraft.coordinatorName}
                          onChange={(event) => setDraft((current) => (current ? { ...current, coordinatorName: event.target.value } : current))}
                          className="w-full rounded-xl border border-white/10 bg-[#121317] px-3 py-2 text-white"
                        />
                      </label>
                      <label className="space-y-2 text-sm">
                        <span className="text-white/70">Coordinator Email</span>
                        <input
                          value={editingDraft.coordinatorEmail}
                          onChange={(event) => setDraft((current) => (current ? { ...current, coordinatorEmail: event.target.value } : current))}
                          className="w-full rounded-xl border border-white/10 bg-[#121317] px-3 py-2 text-white"
                        />
                      </label>
                      <label className="space-y-2 text-sm md:col-span-2">
                        <span className="text-white/70">Focus Sectors</span>
                        <input
                          value={editingDraft.focusSectorsInput}
                          onChange={(event) => setDraft((current) => (current ? { ...current, focusSectorsInput: event.target.value } : current))}
                          className="w-full rounded-xl border border-white/10 bg-[#121317] px-3 py-2 text-white"
                          placeholder="housing, education, legal"
                        />
                      </label>
                      <label className="space-y-2 text-sm md:col-span-2">
                        <span className="text-white/70">Public Summary</span>
                        <textarea
                          value={editingDraft.publicSummary}
                          onChange={(event) => setDraft((current) => (current ? { ...current, publicSummary: event.target.value } : current))}
                          className="min-h-28 w-full rounded-xl border border-white/10 bg-[#121317] px-3 py-2 text-white"
                        />
                      </label>
                      <label className="space-y-2 text-sm">
                        <span className="text-white/70">Stage</span>
                        <select
                          value={editingDraft.stage}
                          onChange={(event) => {
                            const nextStage = Number(event.target.value) as NodeStage;
                            const nextStatus = STAGE_OPTIONS.find((option) => option.value === nextStage)?.status ?? editingDraft.status;
                            setDraft((current) => (current ? { ...current, stage: nextStage, status: nextStatus } : current));
                          }}
                          className="w-full rounded-xl border border-white/10 bg-[#121317] px-3 py-2 text-white"
                        >
                          {STAGE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-2 text-sm">
                        <span className="text-white/70">Status</span>
                        <select
                          value={editingDraft.status}
                          onChange={(event) =>
                            setDraft((current) =>
                              current ? { ...current, status: event.target.value as NodeStatus } : current
                            )
                          }
                          className="w-full rounded-xl border border-white/10 bg-[#121317] px-3 py-2 text-white"
                        >
                          {Array.from(new Set(STAGE_OPTIONS.map((option) => option.status))).map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="mt-5 grid gap-2 sm:grid-cols-2">
                      {(
                        [
                          ["anchorConfirmed", "Anchor Confirmed"],
                          ["minNGOsReached", "Minimum NGOs Reached"],
                          ["legalStructure", "Legal Structure"],
                          ["coordinatorActive", "Coordinator Active"],
                          ["toolsTested", "Tools Tested"],
                        ] as const
                      ).map(([key, label]) => (
                        <label key={key} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-white/75">
                          <input
                            type="checkbox"
                            checked={editingDraft.activationChecklist[key]}
                            onChange={(event) =>
                              setDraft((current) =>
                                current
                                  ? {
                                      ...current,
                                      activationChecklist: {
                                        ...current.activationChecklist,
                                        [key]: event.target.checked,
                                      },
                                    }
                                  : current
                              )
                            }
                          />
                          {label}
                        </label>
                      ))}
                      <label className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-white/75">
                        <input
                          type="checkbox"
                          checked={editingDraft.publiclyVisible}
                          onChange={(event) => setDraft((current) => (current ? { ...current, publiclyVisible: event.target.checked } : current))}
                        />
                        Publicly Visible
                      </label>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void saveDraft(editingDraft, `${editingDraft.city} saved.`)}
                        disabled={savingId === editingDraft.id}
                        className="rounded-full bg-[var(--beam-gold)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-[var(--beam-gold-bright)] disabled:opacity-50"
                      >
                        {savingId === editingDraft.id ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setDraft(null);
                        }}
                        className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
          {!orderedNodes.length && !isLoading ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/65">
              No nodes loaded yet. Sign in and seed the collection with `scripts/seedNodes.ts`.
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
