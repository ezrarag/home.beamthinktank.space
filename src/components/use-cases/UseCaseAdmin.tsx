"use client";

import { useEffect, useMemo, useState, type CSSProperties, type DragEvent } from "react";
import Link from "next/link";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebaseClient";
import { deleteUseCase, getAllUseCases, upsertUseCase } from "@/lib/useCases";
import {
  slugifyUseCase,
  USE_CASE_STAGES,
  USE_CASE_STAGE_ORDER,
  type UseCase,
  type UseCaseStage,
  type UseCaseStatus,
} from "@/lib/useCaseStages";

interface UseCaseAdminProps {
  initialUseCases: UseCase[];
}

interface UseCaseFormState {
  slug: string;
  name: string;
  context: string;
  stage: UseCaseStage;
  economicModel: string;
  firstAction: string;
  captureBody: string;
  captureTools: string;
  orchestrateBody: string;
  orchestrateTools: string;
  produceBody: string;
  produceTools: string;
  moneyBody: string;
  relatedClientSlug: string;
  relatedDivision: string;
  status: UseCaseStatus;
  isPublished: boolean;
  sortOrder: number;
}

const STATUS_OPTIONS: UseCaseStatus[] = ["concept", "active", "paused", "complete"];

const INITIAL_FORM: UseCaseFormState = {
  slug: "",
  name: "",
  context: "",
  stage: "agency",
  economicModel: "",
  firstAction: "",
  captureBody: "",
  captureTools: "",
  orchestrateBody: "",
  orchestrateTools: "",
  produceBody: "",
  produceTools: "",
  moneyBody: "",
  relatedClientSlug: "",
  relatedDivision: "",
  status: "concept",
  isPublished: false,
  sortOrder: 0,
};

function parseTools(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toFormState(useCase: UseCase): UseCaseFormState {
  return {
    slug: useCase.slug,
    name: useCase.name,
    context: useCase.context,
    stage: useCase.stage,
    economicModel: useCase.economicModel,
    firstAction: useCase.firstAction,
    captureBody: useCase.capture.body,
    captureTools: useCase.capture.tools.join(", "),
    orchestrateBody: useCase.orchestrate.body,
    orchestrateTools: useCase.orchestrate.tools.join(", "),
    produceBody: useCase.produce.body,
    produceTools: useCase.produce.tools.join(", "),
    moneyBody: useCase.money.body,
    relatedClientSlug: useCase.relatedClientSlug ?? "",
    relatedDivision: useCase.relatedDivision ?? "",
    status: useCase.status,
    isPublished: useCase.isPublished,
    sortOrder: useCase.sortOrder,
  };
}

function toUseCase(form: UseCaseFormState): UseCase {
  return {
    slug: form.slug.trim(),
    name: form.name.trim(),
    context: form.context.trim(),
    stage: form.stage,
    economicModel: form.economicModel.trim(),
    firstAction: form.firstAction.trim(),
    capture: {
      body: form.captureBody.trim(),
      tools: parseTools(form.captureTools),
    },
    orchestrate: {
      body: form.orchestrateBody.trim(),
      tools: parseTools(form.orchestrateTools),
    },
    produce: {
      body: form.produceBody.trim(),
      tools: parseTools(form.produceTools),
    },
    money: {
      body: form.moneyBody.trim(),
    },
    relatedClientSlug: form.relatedClientSlug.trim() || null,
    relatedDivision: form.relatedDivision.trim() || null,
    status: form.status,
    isPublished: form.isPublished,
    sortOrder: Number(form.sortOrder),
    updatedAt: null,
  };
}

function sortUseCases(useCases: UseCase[]): UseCase[] {
  return [...useCases].sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name));
}

function stageStyle(stage: UseCaseStage): CSSProperties {
  const config = USE_CASE_STAGES[stage];
  return {
    backgroundColor: config.colorBg,
    color: config.colorFg,
  };
}

export function UseCaseAdmin({ initialUseCases }: UseCaseAdminProps) {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [rows, setRows] = useState<UseCase[]>(sortUseCases(initialUseCases));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [form, setForm] = useState<UseCaseFormState>(INITIAL_FORM);
  const [draggingSlug, setDraggingSlug] = useState<string | null>(null);
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

  async function loadRows() {
    setIsLoading(true);
    setError(null);

    try {
      const nextRows = await getAllUseCases();
      setRows(sortUseCases(nextRows));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load use cases.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!isSignedIn) return;
    void loadRows();
  }, [isSignedIn]);

  const nextSortOrder = useMemo(() => {
    if (rows.length === 0) return 0;
    return Math.max(...rows.map((row) => row.sortOrder)) + 1;
  }, [rows]);

  function openCreateDrawer() {
    setEditingSlug(null);
    setForm({ ...INITIAL_FORM, sortOrder: nextSortOrder });
    setDrawerOpen(true);
    setError(null);
    setSuccessMessage(null);
  }

  function openEditDrawer(useCase: UseCase) {
    setEditingSlug(useCase.slug);
    setForm(toFormState(useCase));
    setDrawerOpen(true);
    setError(null);
    setSuccessMessage(null);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditingSlug(null);
    setForm(INITIAL_FORM);
  }

  async function persistUseCase(nextUseCase: UseCase, success: string) {
    if (!isSignedIn) {
      setError("Sign in with a Firebase admin account first.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await upsertUseCase(nextUseCase);
      setSuccessMessage(success);
      closeDrawer();
      await loadRows();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save use case.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmit() {
    const nextSlug = form.slug.trim() || slugifyUseCase(form.name);
    const nextForm = { ...form, slug: nextSlug };
    const nextUseCase = toUseCase(nextForm);

    if (!nextUseCase.slug || !nextUseCase.name || !nextUseCase.context || !nextUseCase.economicModel) {
      setError("Slug, name, context, and economic model are required.");
      return;
    }

    await persistUseCase(nextUseCase, editingSlug ? "Use case updated." : "Use case created.");
  }

  async function handleDelete(useCase: UseCase) {
    if (!isSignedIn) {
      setError("Sign in with a Firebase admin account first.");
      return;
    }

    if (!window.confirm(`Delete ${useCase.name}?`)) return;

    setError(null);
    setSuccessMessage(null);

    try {
      await deleteUseCase(useCase.slug);
      setSuccessMessage("Use case deleted.");
      await loadRows();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete use case.");
    }
  }

  async function handleQuickUpdate(useCase: UseCase, patch: Partial<UseCase>, success: string) {
    if (!isSignedIn) {
      setError("Sign in with a Firebase admin account first.");
      return;
    }

    setError(null);
    setSuccessMessage(null);

    try {
      await upsertUseCase({ ...useCase, ...patch });
      setSuccessMessage(success);
      await loadRows();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update use case.");
    }
  }

  async function persistReorder(nextRows: UseCase[]) {
    if (!isSignedIn) {
      setError("Sign in with a Firebase admin account first.");
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setRows(nextRows);

    try {
      await Promise.all(
        nextRows.map((row, index) =>
          upsertUseCase({
            ...row,
            sortOrder: index,
          })
        )
      );
      setSuccessMessage("Use cases reordered.");
      await loadRows();
    } catch (reorderError) {
      setError(reorderError instanceof Error ? reorderError.message : "Failed to reorder use cases.");
    }
  }

  function handleDragStart(event: DragEvent<HTMLTableRowElement>, slug: string) {
    setDraggingSlug(slug);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", slug);
  }

  async function handleDrop(targetSlug: string) {
    if (!draggingSlug || draggingSlug === targetSlug) return;

    const nextRows = [...rows];
    const fromIndex = nextRows.findIndex((row) => row.slug === draggingSlug);
    const toIndex = nextRows.findIndex((row) => row.slug === targetSlug);
    if (fromIndex < 0 || toIndex < 0) return;

    const [moved] = nextRows.splice(fromIndex, 1);
    nextRows.splice(toIndex, 0, moved);
    await persistReorder(nextRows.map((row, index) => ({ ...row, sortOrder: index })));
    setDraggingSlug(null);
  }

  return (
    <main className="min-h-screen w-full bg-[#0e0e0e] text-white">
      <div className="mx-auto w-full max-w-7xl px-6 py-10 sm:px-8">
        <header className="border-b border-white/10 pb-6">
          <p className="text-xs uppercase tracking-[0.28em] text-white/50">BEAM Internal</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Use-Case Gallery</h1>
          <p className="mt-3 max-w-3xl text-sm text-white/70 sm:text-base">
            Manage the public research and production gallery shown at <span className="text-white">/use-cases</span>.
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
              onClick={() => void loadRows()}
              disabled={!isSignedIn || isLoading}
              className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:text-white disabled:opacity-50"
            >
              {isLoading ? "Refreshing..." : "Refresh"}
            </button>
            <button
              type="button"
              onClick={openCreateDrawer}
              disabled={!isSignedIn}
              className="inline-flex rounded-full border border-[rgba(200,185,122,0.35)] bg-[rgba(200,185,122,0.12)] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[var(--beam-gold-bright)] transition hover:border-[rgba(200,185,122,0.65)] hover:text-white disabled:opacity-50"
            >
              Add Use Case
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

        <section className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="border-b border-white/10 bg-black/20 text-xs uppercase tracking-[0.18em] text-white/50">
                <tr>
                  <th className="px-4 py-4">Name</th>
                  <th className="px-4 py-4">Stage</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Published</th>
                  <th className="px-4 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((useCase) => (
                  <tr
                    key={useCase.slug}
                    draggable={isSignedIn}
                    onDragStart={(event) => handleDragStart(event, useCase.slug)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => void handleDrop(useCase.slug)}
                    className="border-b border-white/6 text-sm text-white/82 transition hover:bg-white/[0.025]"
                  >
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-white">{useCase.name}</p>
                        <p className="mt-1 text-xs text-white/50">{useCase.slug}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]" style={stageStyle(useCase.stage)}>
                        {USE_CASE_STAGES[useCase.stage].label}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={useCase.status}
                        disabled={!isSignedIn}
                        onChange={(event) =>
                          void handleQuickUpdate(
                            useCase,
                            { status: event.target.value as UseCaseStatus },
                            `${useCase.name} status updated.`
                          )
                        }
                        className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs uppercase tracking-[0.14em] text-white"
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <label className="inline-flex items-center gap-3 text-xs uppercase tracking-[0.14em] text-white/70">
                        <input
                          type="checkbox"
                          checked={useCase.isPublished}
                          disabled={!isSignedIn}
                          onChange={(event) =>
                            void handleQuickUpdate(
                              useCase,
                              { isPublished: event.target.checked },
                              `${useCase.name} publish state updated.`
                            )
                          }
                        />
                        {useCase.isPublished ? "Live" : "Draft"}
                      </label>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditDrawer(useCase)}
                          disabled={!isSignedIn}
                          className="rounded-full border border-white/15 px-3 py-2 text-xs uppercase tracking-[0.16em] text-white/85 transition hover:border-white/40 disabled:opacity-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(useCase)}
                          disabled={!isSignedIn}
                          className="rounded-full border border-red-400/25 px-3 py-2 text-xs uppercase tracking-[0.16em] text-red-200 transition hover:border-red-300/50 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {drawerOpen ? (
          <div className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm">
            <div className="absolute inset-y-0 right-0 w-full max-w-2xl overflow-y-auto border-l border-white/10 bg-[#0f0f0c] p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="beam-eyebrow">Use Case Editor</p>
                  <h2 className="mt-2 text-2xl font-semibold">{editingSlug ? "Edit Use Case" : "Add Use Case"}</h2>
                </div>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="rounded-full border border-white/15 px-3 py-2 text-xs uppercase tracking-[0.16em] text-white/80"
                >
                  Close
                </button>
              </div>

              <div className="mt-6 grid gap-4">
                <label className="text-sm text-white/75">
                  Name
                  <input
                    value={form.name}
                    onChange={(event) => {
                      const name = event.target.value;
                      setForm((current) => ({
                        ...current,
                        name,
                        slug: editingSlug ? current.slug : slugifyUseCase(name),
                      }));
                    }}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white"
                  />
                </label>

                <label className="text-sm text-white/75">
                  Slug
                  <input
                    value={form.slug}
                    onChange={(event) => setForm((current) => ({ ...current, slug: slugifyUseCase(event.target.value) }))}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white"
                  />
                </label>

                <label className="text-sm text-white/75">
                  Context
                  <input
                    value={form.context}
                    onChange={(event) => setForm((current) => ({ ...current, context: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm text-white/75">
                    Stage
                    <select
                      value={form.stage}
                      onChange={(event) => setForm((current) => ({ ...current, stage: event.target.value as UseCaseStage }))}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white"
                    >
                      {USE_CASE_STAGE_ORDER.map((stage) => (
                        <option key={stage} value={stage}>
                          {USE_CASE_STAGES[stage].label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm text-white/75">
                    Status
                    <select
                      value={form.status}
                      onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as UseCaseStatus }))}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white"
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="text-sm text-white/75">
                  Economic Model
                  <input
                    value={form.economicModel}
                    onChange={(event) => setForm((current) => ({ ...current, economicModel: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white"
                  />
                </label>

                <label className="text-sm text-white/75">
                  First Action
                  <input
                    value={form.firstAction}
                    onChange={(event) => setForm((current) => ({ ...current, firstAction: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white"
                  />
                </label>

                <label className="text-sm text-white/75">
                  Capture
                  <textarea
                    rows={4}
                    value={form.captureBody}
                    onChange={(event) => setForm((current) => ({ ...current, captureBody: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white"
                  />
                </label>

                <label className="text-sm text-white/75">
                  Capture Tools
                  <input
                    value={form.captureTools}
                    onChange={(event) => setForm((current) => ({ ...current, captureTools: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white"
                  />
                </label>

                <label className="text-sm text-white/75">
                  Orchestrate
                  <textarea
                    rows={4}
                    value={form.orchestrateBody}
                    onChange={(event) => setForm((current) => ({ ...current, orchestrateBody: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white"
                  />
                </label>

                <label className="text-sm text-white/75">
                  Orchestrate Tools
                  <input
                    value={form.orchestrateTools}
                    onChange={(event) => setForm((current) => ({ ...current, orchestrateTools: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white"
                  />
                </label>

                <label className="text-sm text-white/75">
                  Produce
                  <textarea
                    rows={4}
                    value={form.produceBody}
                    onChange={(event) => setForm((current) => ({ ...current, produceBody: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white"
                  />
                </label>

                <label className="text-sm text-white/75">
                  Produce Tools
                  <input
                    value={form.produceTools}
                    onChange={(event) => setForm((current) => ({ ...current, produceTools: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white"
                  />
                </label>

                <label className="text-sm text-white/75">
                  Money
                  <textarea
                    rows={5}
                    value={form.moneyBody}
                    onChange={(event) => setForm((current) => ({ ...current, moneyBody: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm text-white/75">
                    Related Client Slug
                    <input
                      value={form.relatedClientSlug}
                      onChange={(event) => setForm((current) => ({ ...current, relatedClientSlug: event.target.value }))}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white"
                    />
                  </label>

                  <label className="text-sm text-white/75">
                    Related Division
                    <input
                      value={form.relatedDivision}
                      onChange={(event) => setForm((current) => ({ ...current, relatedDivision: event.target.value }))}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm text-white/75">
                    Sort Order
                    <input
                      type="number"
                      value={form.sortOrder}
                      onChange={(event) => setForm((current) => ({ ...current, sortOrder: Number(event.target.value) }))}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white"
                    />
                  </label>

                  <label className="mt-7 inline-flex items-center gap-3 text-sm text-white/75">
                    <input
                      type="checkbox"
                      checked={form.isPublished}
                      onChange={(event) => setForm((current) => ({ ...current, isPublished: event.target.checked }))}
                    />
                    Published
                  </label>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={isSaving}
                    className="rounded-full border border-[rgba(200,185,122,0.35)] bg-[rgba(200,185,122,0.12)] px-4 py-3 text-xs uppercase tracking-[0.18em] text-[var(--beam-gold-bright)]"
                  >
                    {isSaving ? "Saving..." : editingSlug ? "Save Changes" : "Create Use Case"}
                  </button>
                  <button
                    type="button"
                    onClick={closeDrawer}
                    className="rounded-full border border-white/15 px-4 py-3 text-xs uppercase tracking-[0.18em] text-white/80"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
