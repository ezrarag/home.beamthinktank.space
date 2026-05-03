"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebaseClient";
import type { OrgNode, OrgNodeStatus, OrgNodeTier } from "@/lib/server/firestoreOrgTree";

type EditableOrgNode = OrgNode & {
  mediaType: "video" | "youtube" | "audio";
  mediaUrl: string;
  mediaLabel: string;
  mediaTimestampInput: string;
};

type FillRoleDraft = {
  name: string;
  email: string;
  since: string;
};

type ChildNodeDraft = {
  label: string;
  sublabel: string;
  tier: OrgNodeTier;
  description: string;
  ngoSlug: string;
  ngoSiteUrl: string;
  sortOrder: string;
  status: OrgNodeStatus;
};

const ORG_NODE_TIERS: OrgNodeTier[] = [
  "national",
  "regional",
  "state",
  "city-node",
  "institution-cluster",
  "ngo-division",
  "ngo-role",
];

const ORG_NODE_STATUSES: OrgNodeStatus[] = ["vacant", "filled", "planned", "forming", "active"];

const TIER_LABELS: Record<OrgNodeTier, string> = {
  national: "National",
  regional: "Regional",
  state: "State",
  "city-node": "City Node",
  "institution-cluster": "Institution Cluster",
  "ngo-division": "NGO Division",
  "ngo-role": "NGO Role",
};

const INPUT_CLASS =
  "w-full rounded-xl border border-white/10 bg-[#121317] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--beam-gold)]";
const TEXTAREA_CLASS =
  "min-h-28 w-full rounded-xl border border-white/10 bg-[#121317] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--beam-gold)]";
const ACTION_BUTTON_BASE =
  "inline-flex rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:text-white disabled:opacity-50";
const PRIMARY_BUTTON_BASE =
  "rounded-full bg-[var(--beam-gold)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-[var(--beam-gold-bright)] disabled:opacity-50";

const INITIAL_FILL_ROLE: FillRoleDraft = {
  name: "",
  email: "",
  since: "",
};

const INITIAL_CHILD_DRAFT: ChildNodeDraft = {
  label: "",
  sublabel: "",
  tier: "ngo-role",
  description: "",
  ngoSlug: "",
  ngoSiteUrl: "",
  sortOrder: "0",
  status: "planned",
};

function getTierBadgeClass(tier: OrgNodeTier): string {
  if (tier === "national") return "border-white/30 bg-white/10 text-white";
  if (tier === "regional" || tier === "state") return "border-white/20 bg-white/[0.05] text-white/75";
  if (tier === "city-node") return "border-[var(--beam-gold)] bg-[rgba(200,185,122,0.14)] text-[var(--beam-gold-bright)]";
  if (tier === "institution-cluster") return "border-[var(--beam-gold)]/35 bg-[rgba(200,185,122,0.08)] text-[var(--beam-gold)]";
  if (tier === "ngo-role") return "border-white/15 bg-white/[0.04] text-white/70";
  return "border-white/20 bg-white/[0.05] text-white/80";
}

function getStatusBadgeClass(status: OrgNodeStatus): string {
  if (status === "filled" || status === "active") {
    return "border-[var(--beam-gold)] bg-[rgba(200,185,122,0.14)] text-[var(--beam-gold-bright)]";
  }
  if (status === "vacant") return "border-white/20 bg-white/[0.05] text-white/75";
  if (status === "forming") return "border-amber-400/25 bg-amber-500/10 text-amber-200";
  return "border-white/10 bg-white/[0.04] text-white/50";
}

function toEditableNode(node: OrgNode): EditableOrgNode {
  return {
    ...node,
    mediaType: node.media?.type ?? "video",
    mediaUrl: node.media?.url ?? "",
    mediaLabel: node.media?.label ?? "",
    mediaTimestampInput:
      typeof node.media?.conceptTimestampMs === "number" ? String(node.media.conceptTimestampMs) : "",
  };
}

function toEditPayload(draft: EditableOrgNode): Partial<OrgNode> {
  const conceptTimestampMs = Number(draft.mediaTimestampInput);

  return {
    label: draft.label,
    sublabel: draft.sublabel || undefined,
    description: draft.description,
    tier: draft.tier,
    status: draft.status,
    ngoSlug: draft.ngoSlug || undefined,
    ngoSiteUrl: draft.ngoSiteUrl || undefined,
    media:
      draft.mediaUrl.trim() && draft.mediaLabel.trim()
        ? {
            type: draft.mediaType,
            url: draft.mediaUrl.trim(),
            label: draft.mediaLabel.trim(),
            conceptTimestampMs: Number.isFinite(conceptTimestampMs) ? conceptTimestampMs : undefined,
          }
        : (null as unknown as OrgNode["media"]),
    sortOrder: draft.sortOrder,
    publiclyVisible: draft.publiclyVisible,
  };
}

function buildChildPayload(parentId: string, draft: ChildNodeDraft): Omit<OrgNode, "id"> {
  const now = new Date().toISOString();
  return {
    parentId,
    tier: draft.tier,
    label: draft.label.trim(),
    sublabel: draft.sublabel.trim() || undefined,
    description: draft.description.trim(),
    status: draft.status,
    ngoSlug: draft.ngoSlug.trim() || undefined,
    ngoSiteUrl: draft.ngoSiteUrl.trim() || undefined,
    sortOrder: Number(draft.sortOrder || 0),
    publiclyVisible: true,
    createdAt: now,
    updatedAt: now,
  };
}

export default function AdminOrgTreePage() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [runningProjectionId, setRunningProjectionId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<OrgNode[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditableOrgNode | null>(null);
  const [fillRoleId, setFillRoleId] = useState<string | null>(null);
  const [fillRoleDraft, setFillRoleDraft] = useState<FillRoleDraft>(INITIAL_FILL_ROLE);
  const [addChildParentId, setAddChildParentId] = useState<string | null>(null);
  const [childDraft, setChildDraft] = useState<ChildNodeDraft>(INITIAL_CHILD_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      const response = await fetch("/api/org-tree", {
        headers: await getAuthHeaders(),
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as { nodes?: OrgNode[]; error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load org nodes.");
      }

      const nextNodes = Array.isArray(payload.nodes) ? payload.nodes : [];
      setNodes(nextNodes);

      if (editingId) {
        const match = nextNodes.find((node) => node.id === editingId);
        setDraft(match ? toEditableNode(match) : null);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load org nodes.");
    } finally {
      setIsLoading(false);
    }
  }, [editingId, getAuthHeaders]);

  useEffect(() => {
    if (!isSignedIn) return;
    void loadNodes();
  }, [isSignedIn, loadNodes]);

  const orderedNodes = useMemo(
    () =>
      [...nodes].sort((left, right) => {
        const tierCompare = ORG_NODE_TIERS.indexOf(left.tier) - ORG_NODE_TIERS.indexOf(right.tier);
        if (tierCompare !== 0) return tierCompare;

        const orderCompare = left.sortOrder - right.sortOrder;
        if (orderCompare !== 0) return orderCompare;

        return left.label.localeCompare(right.label);
      }),
    [nodes]
  );

  const nodesById = useMemo(() => new Map(orderedNodes.map((node) => [node.id, node])), [orderedNodes]);

  const groupedNodes = useMemo(() => {
    const groups = new Map<OrgNodeTier, OrgNode[]>();

    for (const tier of ORG_NODE_TIERS) {
      groups.set(tier, orderedNodes.filter((node) => node.tier === tier));
    }

    return groups;
  }, [orderedNodes]);

  function beginEdit(node: OrgNode) {
    setEditingId(node.id);
    setDraft(toEditableNode(node));
    setFillRoleId(null);
    setAddChildParentId(null);
    setError(null);
    setSuccessMessage(null);
  }

  async function patchNode(nodeId: string, updates: Partial<OrgNode>, success: string) {
    setSavingId(nodeId);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/org-tree/${nodeId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(await getAuthHeaders()),
        },
        body: JSON.stringify(updates),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to update org node.");
      }

      setSuccessMessage(success);
      setEditingId(null);
      setDraft(null);
      setFillRoleId(null);
      setFillRoleDraft(INITIAL_FILL_ROLE);
      await loadNodes();
    } catch (patchError) {
      setError(patchError instanceof Error ? patchError.message : "Failed to update org node.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleSeed() {
    if (!window.confirm("Seed the initial org tree? This only runs if the collection is empty.")) {
      return;
    }

    setIsSeeding(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/org-tree/_seed/seed", {
        method: "POST",
        headers: await getAuthHeaders(),
      });
      const payload = (await response.json().catch(() => ({}))) as { seeded?: boolean; message?: string; error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to seed org tree.");
      }

      setSuccessMessage(payload.message || (payload.seeded ? "Org tree seeded." : "Seed skipped."));
      await loadNodes();
    } catch (seedError) {
      setError(seedError instanceof Error ? seedError.message : "Failed to seed org tree.");
    } finally {
      setIsSeeding(false);
    }
  }

  async function handleRunProjection(nodeId: string) {
    setRunningProjectionId(nodeId);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/org-tree/${nodeId}/project`, {
        method: "POST",
        headers: await getAuthHeaders(),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to run AI projection.");
      }

      setSuccessMessage("AI projection refreshed.");
      await loadNodes();
    } catch (projectionError) {
      setError(projectionError instanceof Error ? projectionError.message : "Failed to run AI projection.");
    } finally {
      setRunningProjectionId(null);
    }
  }

  async function handleCreateChild(event: FormEvent<HTMLFormElement>, parentId: string) {
    event.preventDefault();
    setSavingId(parentId);
    setError(null);
    setSuccessMessage(null);

    try {
      const payload = buildChildPayload(parentId, childDraft);
      if (!payload.label) {
        throw new Error("Child node label is required.");
      }

      const response = await fetch("/api/org-tree", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await getAuthHeaders()),
        },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Failed to create child org node.");
      }

      setSuccessMessage("Child node created.");
      setAddChildParentId(null);
      setChildDraft(INITIAL_CHILD_DRAFT);
      await loadNodes();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create child org node.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleFillRole(event: FormEvent<HTMLFormElement>, nodeId: string) {
    event.preventDefault();

    if (!fillRoleDraft.name.trim()) {
      setError("Name is required to fill a role.");
      return;
    }

    await patchNode(
      nodeId,
      {
        status: "filled",
        filledBy: {
          name: fillRoleDraft.name.trim(),
          email: fillRoleDraft.email.trim() || undefined,
          since: fillRoleDraft.since.trim() || undefined,
        },
      },
      "Role filled and projection requested."
    );
  }

  return (
    <main className="min-h-screen w-full bg-[#0e0e0e] text-white">
      <div className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-8">
        <header className="border-b border-white/10 pb-6">
          <p className="text-xs uppercase tracking-[0.28em] text-white/50">BEAM Internal</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Org Tree Manager</h1>
          <p className="mt-3 max-w-3xl text-sm text-white/70 sm:text-base">
            Edit the BEAM org hierarchy, fill roles, attach media, and generate financial projections for the roles
            that move the network.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={handleGoogleSignIn} className={ACTION_BUTTON_BASE}>
              {isSignedIn ? "Signed In" : "Sign In"}
            </button>
            <button
              type="button"
              onClick={() => void loadNodes()}
              disabled={!isSignedIn || isLoading}
              className={ACTION_BUTTON_BASE}
            >
              {isLoading ? "Refreshing..." : "Refresh"}
            </button>
            <button
              type="button"
              onClick={() => void handleSeed()}
              disabled={!isSignedIn || isSeeding}
              className={PRIMARY_BUTTON_BASE}
            >
              {isSeeding ? "Seeding..." : "Seed Initial Org Tree"}
            </button>
            <Link href="/admin" className={ACTION_BUTTON_BASE}>
              Back To Admin
            </Link>
          </div>

          {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
          {successMessage ? <p className="mt-4 text-sm text-[var(--beam-gold-bright)]">{successMessage}</p> : null}
        </header>

        <section className="mt-8 space-y-6">
          {ORG_NODE_TIERS.map((tier) => {
            const tierNodes = groupedNodes.get(tier) ?? [];
            if (tierNodes.length === 0) return null;

            return (
              <div key={tier} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/45">Tier</p>
                    <h2 className="mt-2 text-2xl font-medium">{TIER_LABELS[tier]}</h2>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${getTierBadgeClass(tier)}`}>
                    {tierNodes.length} node{tierNodes.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="space-y-4">
                  {tierNodes.map((node) => {
                    const isEditing = editingId === node.id && draft !== null;
                    const editingDraft = isEditing ? draft : null;
                    const isFilling = fillRoleId === node.id;
                    const isAddingChild = addChildParentId === node.id;
                    const parent = node.parentId ? nodesById.get(node.parentId) ?? null : null;

                    return (
                      <article key={node.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-3">
                              <h3 className="text-2xl font-medium">{node.label}</h3>
                              <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] ${getTierBadgeClass(node.tier)}`}>
                                {TIER_LABELS[node.tier]}
                              </span>
                              <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] ${getStatusBadgeClass(node.status)}`}>
                                {node.status}
                              </span>
                            </div>

                            {node.sublabel ? <p className="text-sm text-white/60">{node.sublabel}</p> : null}
                            {parent ? <p className="text-sm text-white/45">Parent: {parent.label}</p> : null}
                            <p className="max-w-3xl text-sm leading-7 text-white/65">
                              {node.description || "No description added yet."}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => beginEdit(node)} className={ACTION_BUTTON_BASE}>
                              Edit
                            </button>
                            {node.status === "vacant" ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setFillRoleId(node.id);
                                  setFillRoleDraft(INITIAL_FILL_ROLE);
                                  setEditingId(null);
                                  setAddChildParentId(null);
                                  setError(null);
                                  setSuccessMessage(null);
                                }}
                                className={ACTION_BUTTON_BASE}
                              >
                                Fill Role
                              </button>
                            ) : null}
                            {node.status === "filled" ? (
                              <button
                                type="button"
                                onClick={() => void patchNode(node.id, { status: "vacant" }, "Role vacated.")}
                                disabled={savingId === node.id}
                                className={ACTION_BUTTON_BASE}
                              >
                                Vacate
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => void handleRunProjection(node.id)}
                              disabled={runningProjectionId === node.id}
                              className={PRIMARY_BUTTON_BASE}
                            >
                              {runningProjectionId === node.id ? "Running..." : "Run AI Projection"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAddChildParentId(node.id);
                                setChildDraft({
                                  ...INITIAL_CHILD_DRAFT,
                                  tier: node.tier === "ngo-division" ? "ngo-role" : "ngo-division",
                                  status: node.tier === "ngo-division" ? "vacant" : "planned",
                                });
                                setEditingId(null);
                                setFillRoleId(null);
                                setError(null);
                                setSuccessMessage(null);
                              }}
                              className={ACTION_BUTTON_BASE}
                            >
                              Add Child Node
                            </button>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                          <div className="rounded-2xl border border-white/8 bg-[#101114] p-4 text-sm text-white/70">
                            <p>Sort order: {node.sortOrder}</p>
                            <p className="mt-2">Publicly visible: {node.publiclyVisible ? "YES" : "NO"}</p>
                            <p className="mt-2">Filled by: {node.filledBy?.name ?? "—"}</p>
                            {node.ngoSlug ? <p className="mt-2">NGO slug: {node.ngoSlug}</p> : null}
                            {node.ngoSiteUrl ? <p className="mt-2 break-all">Site: {node.ngoSiteUrl}</p> : null}
                          </div>

                          <div className="rounded-2xl border border-white/8 bg-[#101114] p-4 text-sm text-white/70">
                            {node.aiProjection ? (
                              <>
                                <p className="text-xs uppercase tracking-[0.18em] text-[var(--beam-gold)]">AI Projection</p>
                                <p className="mt-3 text-xl font-semibold text-[var(--beam-gold-bright)]">
                                  ${node.aiProjection.estimatedMonthlyImpact.toLocaleString()}/mo
                                </p>
                                <p className="mt-2 leading-6 text-white/65">{node.aiProjection.summary}</p>
                              </>
                            ) : (
                              <p>No AI projection cached yet.</p>
                            )}
                          </div>
                        </div>

                        {isEditing && editingDraft ? (
                          <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-5">
                            <div className="grid gap-4 md:grid-cols-2">
                              <label className="space-y-2 text-sm">
                                <span className="text-white/70">Label</span>
                                <input
                                  value={editingDraft.label}
                                  onChange={(event) =>
                                    setDraft((current) => (current ? { ...current, label: event.target.value } : current))
                                  }
                                  className={INPUT_CLASS}
                                />
                              </label>
                              <label className="space-y-2 text-sm">
                                <span className="text-white/70">Sublabel</span>
                                <input
                                  value={editingDraft.sublabel ?? ""}
                                  onChange={(event) =>
                                    setDraft((current) => (current ? { ...current, sublabel: event.target.value } : current))
                                  }
                                  className={INPUT_CLASS}
                                />
                              </label>
                              <label className="space-y-2 text-sm md:col-span-2">
                                <span className="text-white/70">Description</span>
                                <textarea
                                  value={editingDraft.description}
                                  onChange={(event) =>
                                    setDraft((current) => (current ? { ...current, description: event.target.value } : current))
                                  }
                                  className={TEXTAREA_CLASS}
                                />
                              </label>
                              <label className="space-y-2 text-sm">
                                <span className="text-white/70">Tier</span>
                                <select
                                  value={editingDraft.tier}
                                  onChange={(event) =>
                                    setDraft((current) =>
                                      current ? { ...current, tier: event.target.value as OrgNodeTier } : current
                                    )
                                  }
                                  className={INPUT_CLASS}
                                >
                                  {ORG_NODE_TIERS.map((option) => (
                                    <option key={option} value={option}>
                                      {TIER_LABELS[option]}
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
                                      current ? { ...current, status: event.target.value as OrgNodeStatus } : current
                                    )
                                  }
                                  className={INPUT_CLASS}
                                >
                                  {ORG_NODE_STATUSES.map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="space-y-2 text-sm">
                                <span className="text-white/70">NGO slug</span>
                                <input
                                  value={editingDraft.ngoSlug ?? ""}
                                  onChange={(event) =>
                                    setDraft((current) => (current ? { ...current, ngoSlug: event.target.value } : current))
                                  }
                                  className={INPUT_CLASS}
                                />
                              </label>
                              <label className="space-y-2 text-sm">
                                <span className="text-white/70">NGO site URL</span>
                                <input
                                  value={editingDraft.ngoSiteUrl ?? ""}
                                  onChange={(event) =>
                                    setDraft((current) => (current ? { ...current, ngoSiteUrl: event.target.value } : current))
                                  }
                                  className={INPUT_CLASS}
                                />
                              </label>
                              <label className="space-y-2 text-sm">
                                <span className="text-white/70">Media URL</span>
                                <input
                                  value={editingDraft.mediaUrl}
                                  onChange={(event) =>
                                    setDraft((current) => (current ? { ...current, mediaUrl: event.target.value } : current))
                                  }
                                  className={INPUT_CLASS}
                                />
                              </label>
                              <label className="space-y-2 text-sm">
                                <span className="text-white/70">Media label</span>
                                <input
                                  value={editingDraft.mediaLabel}
                                  onChange={(event) =>
                                    setDraft((current) => (current ? { ...current, mediaLabel: event.target.value } : current))
                                  }
                                  className={INPUT_CLASS}
                                />
                              </label>
                              <label className="space-y-2 text-sm">
                                <span className="text-white/70">Media type</span>
                                <select
                                  value={editingDraft.mediaType}
                                  onChange={(event) =>
                                    setDraft((current) =>
                                      current
                                        ? { ...current, mediaType: event.target.value as EditableOrgNode["mediaType"] }
                                        : current
                                    )
                                  }
                                  className={INPUT_CLASS}
                                >
                                  <option value="video">video</option>
                                  <option value="youtube">youtube</option>
                                  <option value="audio">audio</option>
                                </select>
                              </label>
                              <label className="space-y-2 text-sm">
                                <span className="text-white/70">Concept timestamp (ms)</span>
                                <input
                                  value={editingDraft.mediaTimestampInput}
                                  onChange={(event) =>
                                    setDraft((current) =>
                                      current ? { ...current, mediaTimestampInput: event.target.value } : current
                                    )
                                  }
                                  className={INPUT_CLASS}
                                />
                              </label>
                              <label className="space-y-2 text-sm">
                                <span className="text-white/70">Sort order</span>
                                <input
                                  type="number"
                                  value={editingDraft.sortOrder}
                                  onChange={(event) =>
                                    setDraft((current) =>
                                      current ? { ...current, sortOrder: Number(event.target.value) } : current
                                    )
                                  }
                                  className={INPUT_CLASS}
                                />
                              </label>
                            </div>

                            <label className="mt-4 flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-white/75">
                              <input
                                type="checkbox"
                                checked={editingDraft.publiclyVisible}
                                onChange={(event) =>
                                  setDraft((current) =>
                                    current ? { ...current, publiclyVisible: event.target.checked } : current
                                  )
                                }
                              />
                              Publicly visible
                            </label>

                            <div className="mt-5 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  void patchNode(editingDraft.id, toEditPayload(editingDraft), `${editingDraft.label} saved.`)
                                }
                                disabled={savingId === editingDraft.id}
                                className={PRIMARY_BUTTON_BASE}
                              >
                                {savingId === editingDraft.id ? "Saving..." : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(null);
                                  setDraft(null);
                                }}
                                className={ACTION_BUTTON_BASE}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : null}

                        {isFilling ? (
                          <form onSubmit={(event) => void handleFillRole(event, node.id)} className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-5">
                            <div className="grid gap-4 md:grid-cols-3">
                              <label className="space-y-2 text-sm">
                                <span className="text-white/70">Name</span>
                                <input
                                  value={fillRoleDraft.name}
                                  onChange={(event) => setFillRoleDraft((current) => ({ ...current, name: event.target.value }))}
                                  className={INPUT_CLASS}
                                />
                              </label>
                              <label className="space-y-2 text-sm">
                                <span className="text-white/70">Email</span>
                                <input
                                  value={fillRoleDraft.email}
                                  onChange={(event) => setFillRoleDraft((current) => ({ ...current, email: event.target.value }))}
                                  className={INPUT_CLASS}
                                />
                              </label>
                              <label className="space-y-2 text-sm">
                                <span className="text-white/70">Since date</span>
                                <input
                                  type="date"
                                  value={fillRoleDraft.since}
                                  onChange={(event) => setFillRoleDraft((current) => ({ ...current, since: event.target.value }))}
                                  className={INPUT_CLASS}
                                />
                              </label>
                            </div>
                            <div className="mt-5 flex flex-wrap gap-2">
                              <button type="submit" disabled={savingId === node.id} className={PRIMARY_BUTTON_BASE}>
                                {savingId === node.id ? "Saving..." : "Confirm Fill"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setFillRoleId(null);
                                  setFillRoleDraft(INITIAL_FILL_ROLE);
                                }}
                                className={ACTION_BUTTON_BASE}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : null}

                        {isAddingChild ? (
                          <form onSubmit={(event) => void handleCreateChild(event, node.id)} className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-5">
                            <div className="grid gap-4 md:grid-cols-2">
                              <label className="space-y-2 text-sm">
                                <span className="text-white/70">Label</span>
                                <input
                                  value={childDraft.label}
                                  onChange={(event) => setChildDraft((current) => ({ ...current, label: event.target.value }))}
                                  className={INPUT_CLASS}
                                />
                              </label>
                              <label className="space-y-2 text-sm">
                                <span className="text-white/70">Sublabel</span>
                                <input
                                  value={childDraft.sublabel}
                                  onChange={(event) => setChildDraft((current) => ({ ...current, sublabel: event.target.value }))}
                                  className={INPUT_CLASS}
                                />
                              </label>
                              <label className="space-y-2 text-sm">
                                <span className="text-white/70">Tier</span>
                                <select
                                  value={childDraft.tier}
                                  onChange={(event) =>
                                    setChildDraft((current) => ({ ...current, tier: event.target.value as OrgNodeTier }))
                                  }
                                  className={INPUT_CLASS}
                                >
                                  {ORG_NODE_TIERS.map((option) => (
                                    <option key={option} value={option}>
                                      {TIER_LABELS[option]}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="space-y-2 text-sm">
                                <span className="text-white/70">Status</span>
                                <select
                                  value={childDraft.status}
                                  onChange={(event) =>
                                    setChildDraft((current) => ({ ...current, status: event.target.value as OrgNodeStatus }))
                                  }
                                  className={INPUT_CLASS}
                                >
                                  {ORG_NODE_STATUSES.map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="space-y-2 text-sm">
                                <span className="text-white/70">NGO slug</span>
                                <input
                                  value={childDraft.ngoSlug}
                                  onChange={(event) => setChildDraft((current) => ({ ...current, ngoSlug: event.target.value }))}
                                  className={INPUT_CLASS}
                                />
                              </label>
                              <label className="space-y-2 text-sm">
                                <span className="text-white/70">NGO site URL</span>
                                <input
                                  value={childDraft.ngoSiteUrl}
                                  onChange={(event) =>
                                    setChildDraft((current) => ({ ...current, ngoSiteUrl: event.target.value }))
                                  }
                                  className={INPUT_CLASS}
                                />
                              </label>
                              <label className="space-y-2 text-sm">
                                <span className="text-white/70">Sort order</span>
                                <input
                                  type="number"
                                  value={childDraft.sortOrder}
                                  onChange={(event) => setChildDraft((current) => ({ ...current, sortOrder: event.target.value }))}
                                  className={INPUT_CLASS}
                                />
                              </label>
                              <label className="space-y-2 text-sm md:col-span-2">
                                <span className="text-white/70">Description</span>
                                <textarea
                                  value={childDraft.description}
                                  onChange={(event) =>
                                    setChildDraft((current) => ({ ...current, description: event.target.value }))
                                  }
                                  className={TEXTAREA_CLASS}
                                />
                              </label>
                            </div>
                            <div className="mt-5 flex flex-wrap gap-2">
                              <button type="submit" disabled={savingId === node.id} className={PRIMARY_BUTTON_BASE}>
                                {savingId === node.id ? "Creating..." : "Create Child"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAddChildParentId(null);
                                  setChildDraft(INITIAL_CHILD_DRAFT);
                                }}
                                className={ACTION_BUTTON_BASE}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {!orderedNodes.length && !isLoading ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/65">
              No org nodes loaded yet. Sign in and seed the collection from this page.
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
