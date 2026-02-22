"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from "firebase/auth";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebaseClient";
import {
  DEFAULT_WEBSITE_DIRECTORY_SEED,
  WEBSITE_DIRECTORY_COLLECTION,
  buildMicrolinkPreviewUrl,
  type WebsiteDirectoryEntry,
  type WebsiteDirectorySource,
} from "@/lib/websiteDirectory";

interface DirectoryFormState {
  label: string;
  title: string;
  subtitle: string;
  url: string;
  previewImageUrl: string;
  sortOrder: number;
  isActive: boolean;
}

const INITIAL_FORM: DirectoryFormState = {
  label: "",
  title: "",
  subtitle: "",
  url: "",
  previewImageUrl: "",
  sortOrder: 0,
  isActive: true,
};

interface DirectoryRow extends WebsiteDirectoryEntry {
  source: WebsiteDirectorySource;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

interface ExternalEntriesResponse {
  entries?: WebsiteDirectoryEntry[];
  totalClients?: number;
  skippedInvalidUrl?: number;
  error?: string;
}

function isValidAbsoluteHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function mapInternalDoc(snapshot: QueryDocumentSnapshot<DocumentData>): DirectoryRow {
  const data = snapshot.data();
  const url = String(data.url ?? "");
  const previewImageUrl = String(data.previewImageUrl ?? "");

  return {
    id: snapshot.id,
    label: String(data.label ?? ""),
    title: String(data.title ?? ""),
    subtitle: String(data.subtitle ?? ""),
    url,
    previewImageUrl: previewImageUrl || buildMicrolinkPreviewUrl(url),
    sortOrder: Number(data.sortOrder ?? 0),
    isActive: Boolean(data.isActive),
    createdBy: String(data.createdBy ?? ""),
    updatedBy: String(data.updatedBy ?? ""),
    source: "internal",
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt : null,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt : null,
  };
}

function mapExternalEntry(entry: WebsiteDirectoryEntry): DirectoryRow {
  return {
    ...entry,
    source: "external",
    createdAt: null,
    updatedAt: null,
  };
}

function validateForm(input: DirectoryFormState): string | null {
  if (!input.label.trim()) return "Label is required.";
  if (!input.title.trim()) return "Title is required.";
  if (!input.url.trim()) return "URL is required.";
  if (!isValidAbsoluteHttpUrl(input.url.trim())) return "URL must be an absolute http/https URL.";
  if (input.previewImageUrl.trim() && !isValidAbsoluteHttpUrl(input.previewImageUrl.trim())) {
    return "Preview Image URL override must be an absolute http/https URL.";
  }
  if (!Number.isFinite(input.sortOrder)) return "Sort order must be a number.";
  return null;
}

function normalizeForm(input: DirectoryFormState): DirectoryFormState {
  return {
    label: input.label.trim(),
    title: input.title.trim(),
    subtitle: input.subtitle.trim(),
    url: input.url.trim(),
    previewImageUrl: input.previewImageUrl.trim(),
    sortOrder: Number(input.sortOrder),
    isActive: input.isActive,
  };
}

export default function WebsiteDirectoryAdminPage() {
  const [unsignedDevMode, setUnsignedDevMode] = useState(false);
  const [internalRows, setInternalRows] = useState<DirectoryRow[]>([]);
  const [externalRows, setExternalRows] = useState<DirectoryRow[]>([]);
  const [isLoadingRows, setIsLoadingRows] = useState(false);
  const [externalLoadError, setExternalLoadError] = useState<string | null>(null);
  const [externalTotalClients, setExternalTotalClients] = useState(0);
  const [externalSkippedInvalidUrl, setExternalSkippedInvalidUrl] = useState(0);
  const [form, setForm] = useState<DirectoryFormState>(INITIAL_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const auth = getFirebaseAuth();
    setUnsignedDevMode(!auth.currentUser);
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUnsignedDevMode(!firebaseUser);
    });
    return unsubscribe;
  }, []);

  function getDevActor(): string {
    const user = getFirebaseAuth().currentUser;
    return user?.email ?? user?.uid ?? "dev-local";
  }

  async function handleDevSignIn() {
    try {
      const auth = getFirebaseAuth();
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setUnsignedDevMode(false);
      await loadRows();
    } catch (error) {
      const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
      if (code === "auth/popup-blocked" || code === "auth/cancelled-popup-request") {
        try {
          const auth = getFirebaseAuth();
          const provider = new GoogleAuthProvider();
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectError) {
          const redirectMessage =
            redirectError instanceof Error ? redirectError.message : "Google redirect sign-in failed";
          setRequestError(redirectMessage);
          return;
        }
      }
      const message = error instanceof Error ? error.message : "Google sign-in failed";
      setRequestError(message);
    }
  }

  async function handleDevSignOut() {
    try {
      const auth = getFirebaseAuth();
      await signOut(auth);
      setUnsignedDevMode(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sign out failed";
      setRequestError(message);
    }
  }

  const sortedRows = useMemo(() => {
    const merged = [...internalRows, ...externalRows];
    return merged.sort((a, b) => {
      const byOrder = a.sortOrder - b.sortOrder;
      if (byOrder !== 0) return byOrder;
      return a.title.localeCompare(b.title);
    });
  }, [internalRows, externalRows]);

  async function loadRows() {
    setIsLoadingRows(true);
    setRequestError(null);
    setExternalLoadError(null);

    try {
      const [internalResult, externalResult] = await Promise.all([
        (async () => {
          const directoryQuery = query(collection(getFirebaseDb(), WEBSITE_DIRECTORY_COLLECTION), orderBy("sortOrder", "asc"));
          const snap = await getDocs(directoryQuery);
          return snap.docs.map(mapInternalDoc);
        })(),
        (async () => {
          const response = await fetch("/api/admin/website-directory/external", { cache: "no-store" });
          const payload = (await response.json().catch(() => ({}))) as ExternalEntriesResponse;
          if (payload.error) setExternalLoadError(payload.error);
          setExternalTotalClients(Number(payload.totalClients ?? 0));
          setExternalSkippedInvalidUrl(Number(payload.skippedInvalidUrl ?? 0));
          return Array.isArray(payload.entries) ? payload.entries.map(mapExternalEntry) : [];
        })(),
      ]);

      setInternalRows(internalResult);
      setExternalRows(externalResult);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load directory entries";
      setRequestError(message);
    } finally {
      setIsLoadingRows(false);
    }
  }

  useEffect(() => {
    void loadRows();
  }, []);

  async function getAuthHeader(): Promise<Record<string, string>> {
    const auth = getFirebaseAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) {
      if (process.env.NODE_ENV !== "production") {
        throw new Error("Sign in to use API write mode, or stay unsigned for local dev writes.");
      }
      throw new Error("You must be signed in as an admin.");
    }
    const token = await currentUser.getIdToken(true);
    return { Authorization: `Bearer ${token}` };
  }

  function beginEdit(entry: DirectoryRow) {
    if (entry.source !== "internal") return;
    setEditingId(entry.id);
    setForm({
      label: entry.label,
      title: entry.title,
      subtitle: entry.subtitle,
      url: entry.url,
      previewImageUrl: entry.previewImageUrl,
      sortOrder: entry.sortOrder,
      isActive: entry.isActive,
    });
    setFormError(null);
    setRequestError(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(INITIAL_FORM);
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestError(null);

    const normalized = normalizeForm(form);
    const error = validateForm(normalized);
    if (error) {
      setFormError(error);
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      const auth = getFirebaseAuth();
      const currentUser = auth.currentUser;
      const previewImageUrl = normalized.previewImageUrl || buildMicrolinkPreviewUrl(normalized.url);

      if (!currentUser && process.env.NODE_ENV !== "production") {
        const db = getFirebaseDb();
        const payload = {
          label: normalized.label,
          title: normalized.title,
          subtitle: normalized.subtitle,
          url: normalized.url,
          previewImageUrl,
          sortOrder: normalized.sortOrder,
          isActive: normalized.isActive,
          updatedBy: getDevActor(),
          updatedAt: serverTimestamp(),
        };

        if (editingId) {
          await updateDoc(doc(db, WEBSITE_DIRECTORY_COLLECTION, editingId), payload);
        } else {
          await addDoc(collection(db, WEBSITE_DIRECTORY_COLLECTION), {
            ...payload,
            createdBy: getDevActor(),
            createdAt: serverTimestamp(),
          });
        }
        resetForm();
        await loadRows();
        return;
      }

      const headers = {
        "Content-Type": "application/json",
        ...(await getAuthHeader()),
      };
      const url = editingId ? `/api/admin/website-directory/${editingId}` : "/api/admin/website-directory";
      const method = editingId ? "PATCH" : "POST";
      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(normalized),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Failed to save entry");
      }
      resetForm();
      await loadRows();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save entry";
      setRequestError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(entry: DirectoryRow) {
    if (entry.source !== "internal") return;
    const confirmed = window.confirm("Delete this internal entry?");
    if (!confirmed) return;

    setRequestError(null);
    try {
      const auth = getFirebaseAuth();
      const currentUser = auth.currentUser;
      if (!currentUser && process.env.NODE_ENV !== "production") {
        await deleteDoc(doc(getFirebaseDb(), WEBSITE_DIRECTORY_COLLECTION, entry.id));
        if (editingId === entry.id) resetForm();
        await loadRows();
        return;
      }

      const response = await fetch(`/api/admin/website-directory/${entry.id}`, {
        method: "DELETE",
        headers: await getAuthHeader(),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Failed to delete entry");
      }
      if (editingId === entry.id) resetForm();
      await loadRows();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete entry";
      setRequestError(message);
    }
  }

  async function handleToggle(entry: DirectoryRow) {
    if (entry.source !== "internal") return;
    setRequestError(null);
    try {
      const auth = getFirebaseAuth();
      const currentUser = auth.currentUser;
      if (!currentUser && process.env.NODE_ENV !== "production") {
        await updateDoc(doc(getFirebaseDb(), WEBSITE_DIRECTORY_COLLECTION, entry.id), {
          label: entry.label,
          title: entry.title,
          subtitle: entry.subtitle,
          url: entry.url,
          previewImageUrl: entry.previewImageUrl || buildMicrolinkPreviewUrl(entry.url),
          sortOrder: entry.sortOrder,
          isActive: !entry.isActive,
          updatedBy: getDevActor(),
          updatedAt: serverTimestamp(),
        });
        await loadRows();
        return;
      }

      const response = await fetch(`/api/admin/website-directory/${entry.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(await getAuthHeader()),
        },
        body: JSON.stringify({
          label: entry.label,
          title: entry.title,
          subtitle: entry.subtitle,
          url: entry.url,
          previewImageUrl: entry.previewImageUrl,
          sortOrder: entry.sortOrder,
          isActive: !entry.isActive,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Failed to toggle entry");
      }
      await loadRows();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to toggle entry";
      setRequestError(message);
    }
  }

  async function handleSeed() {
    setRequestError(null);
    try {
      const auth = getFirebaseAuth();
      const currentUser = auth.currentUser;
      if (!currentUser && process.env.NODE_ENV !== "production") {
        const db = getFirebaseDb();
        const previewImageUrl =
          DEFAULT_WEBSITE_DIRECTORY_SEED.previewImageUrl || buildMicrolinkPreviewUrl(DEFAULT_WEBSITE_DIRECTORY_SEED.url);
        await setDoc(
          doc(db, WEBSITE_DIRECTORY_COLLECTION, "beam-home-site"),
          {
            ...DEFAULT_WEBSITE_DIRECTORY_SEED,
            previewImageUrl,
            createdBy: getDevActor(),
            updatedBy: getDevActor(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        await loadRows();
        return;
      }

      const response = await fetch("/api/admin/website-directory/seed", {
        method: "POST",
        headers: await getAuthHeader(),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Failed to seed default entry");
      }
      await loadRows();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to seed default entry";
      setRequestError(message);
    }
  }

  return (
    <main className="min-h-screen bg-[#111216] text-white px-4 py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        {unsignedDevMode && (
          <div className="rounded-xl border border-[#2b2f36] bg-[#161920] p-4 text-sm text-neutral-300">
            <p>No-auth dev mode is active. Internal writes are enabled locally for testing.</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => void handleDevSignIn()}
                className="rounded-md border border-[#2b2f36] px-3 py-2 text-xs hover:bg-white/5"
              >
                Sign in with Google (enable writes)
              </button>
            </div>
          </div>
        )}
        {!unsignedDevMode && process.env.NODE_ENV !== "production" && (
          <div className="rounded-xl border border-[#2b2f36] bg-[#161920] p-4 text-xs text-neutral-300 flex items-center justify-between gap-3">
            <span>Signed in for development writes.</span>
            <button
              type="button"
              onClick={() => void handleDevSignOut()}
              className="rounded-md border border-[#2b2f36] px-3 py-2 text-xs hover:bg-white/5"
            >
              Sign out
            </button>
          </div>
        )}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Website Directory</h1>
            <p className="text-sm text-neutral-300">
              Internal entries come from Firestore. External entries are pulled from readyaimgo and shown as read-only.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => void loadRows()}
              className="rounded-md border border-[#2b2f36] px-3 py-2 text-sm hover:bg-white/5"
              type="button"
            >
              Refresh
            </button>
            <button
              onClick={() => void handleSeed()}
              className="rounded-md border border-[#2b2f36] px-3 py-2 text-sm hover:bg-white/5"
              type="button"
            >
              Seed Default Entry
            </button>
          </div>
        </header>

        <section className="rounded-xl border border-[#2b2f36] bg-[#161920] p-5">
          <h2 className="text-lg font-medium mb-4">{editingId ? "Edit Internal Entry" : "Create Internal Entry"}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              Label *
              <input
                className="rounded-md border border-[#2b2f36] bg-[#0f1117] px-3 py-2"
                value={form.label}
                onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
                required
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Title *
              <input
                className="rounded-md border border-[#2b2f36] bg-[#0f1117] px-3 py-2"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                required
              />
            </label>

            <label className="flex flex-col gap-1 text-sm md:col-span-2">
              Subtitle
              <input
                className="rounded-md border border-[#2b2f36] bg-[#0f1117] px-3 py-2"
                value={form.subtitle}
                onChange={(event) => setForm((prev) => ({ ...prev, subtitle: event.target.value }))}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm md:col-span-2">
              URL *
              <input
                className="rounded-md border border-[#2b2f36] bg-[#0f1117] px-3 py-2"
                value={form.url}
                onChange={(event) => setForm((prev) => ({ ...prev, url: event.target.value }))}
                required
              />
            </label>

            <label className="flex flex-col gap-1 text-sm md:col-span-2">
              Preview Image URL Override
              <input
                className="rounded-md border border-[#2b2f36] bg-[#0f1117] px-3 py-2"
                value={form.previewImageUrl}
                onChange={(event) => setForm((prev) => ({ ...prev, previewImageUrl: event.target.value }))}
                placeholder="Leave blank to auto-generate Microlink screenshot from URL"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Sort Order
              <input
                className="rounded-md border border-[#2b2f36] bg-[#0f1117] px-3 py-2"
                value={form.sortOrder}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    sortOrder: Number(event.target.value),
                  }))
                }
                type="number"
              />
            </label>

            <label className="flex items-center gap-2 text-sm mt-6">
              <input
                checked={form.isActive}
                onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                type="checkbox"
              />
              Active
            </label>

            <div className="md:col-span-2 flex gap-2">
              <button
                className="rounded-md bg-[#89C0D0] px-4 py-2 text-sm font-semibold text-[#0d1215] disabled:opacity-60"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? "Saving..." : editingId ? "Update Entry" : "Create Entry"}
              </button>
              {editingId ? (
                <button
                  className="rounded-md border border-[#2b2f36] px-4 py-2 text-sm"
                  onClick={resetForm}
                  type="button"
                >
                  Cancel Edit
                </button>
              ) : null}
            </div>
          </form>
          {formError ? <p className="mt-3 text-sm text-red-300">{formError}</p> : null}
          {requestError ? <p className="mt-3 text-sm text-red-300">{requestError}</p> : null}
          {externalLoadError ? <p className="mt-2 text-xs text-amber-300">External sync warning: {externalLoadError}</p> : null}
        </section>

        <section className="rounded-xl border border-[#2b2f36] bg-[#161920] p-5">
          <h2 className="text-lg font-medium mb-4">Entries (Internal + External)</h2>
          <p className="mb-3 text-xs text-neutral-400">
            External sync: {externalRows.length} mapped of {externalTotalClients} client records
            {externalSkippedInvalidUrl > 0 ? ` (${externalSkippedInvalidUrl} skipped: missing/invalid website URL)` : ""}.
          </p>
          {isLoadingRows ? (
            <p className="text-sm text-neutral-300">Loading entries...</p>
          ) : sortedRows.length === 0 ? (
            <p className="text-sm text-neutral-300">No entries yet.</p>
          ) : (
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-neutral-300">
                  <tr className="border-b border-white/10">
                    <th className="py-2 pr-3">Source</th>
                    <th className="py-2 pr-3">Order</th>
                    <th className="py-2 pr-3">Label</th>
                    <th className="py-2 pr-3">Title</th>
                    <th className="py-2 pr-3">Preview</th>
                    <th className="py-2 pr-3">URL</th>
                    <th className="py-2 pr-3">Active</th>
                    <th className="py-2 pr-3">Updated By</th>
                    <th className="py-2 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((entry) => (
                    <tr key={entry.id} className="border-b border-white/5 align-top">
                      <td className="py-2 pr-3">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] ${
                            entry.source === "internal"
                              ? "border-[#89C0D0]/40 text-[#89C0D0]"
                              : "border-[#e6b17e]/50 text-[#e6b17e]"
                          }`}
                        >
                          {entry.source}
                        </span>
                      </td>
                      <td className="py-2 pr-3">{entry.sortOrder}</td>
                      <td className="py-2 pr-3">{entry.label}</td>
                      <td className="py-2 pr-3">{entry.title}</td>
                      <td className="py-2 pr-3">
                        {entry.previewImageUrl ? (
                          <a href={entry.previewImageUrl} target="_blank" rel="noreferrer" className="block w-24">
                            {/* Thumbnail uses same Microlink-style URL when no override is set */}
                            <Image
                              src={entry.previewImageUrl}
                              alt={`${entry.title} preview`}
                              className="h-14 w-24 rounded object-cover border border-white/10"
                              width={96}
                              height={56}
                              unoptimized
                            />
                          </a>
                        ) : (
                          <span className="text-xs text-neutral-400">No preview</span>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <a href={entry.url} target="_blank" rel="noreferrer" className="text-[#89C0D0] hover:underline">
                          {entry.url}
                        </a>
                      </td>
                      <td className="py-2 pr-3">{entry.isActive ? "Yes" : "No"}</td>
                      <td className="py-2 pr-3">{entry.updatedBy || "n/a"}</td>
                      <td className="py-2 pr-3">
                        {entry.source === "internal" ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              className="rounded border border-[#2b2f36] px-2 py-1 hover:bg-white/5"
                              onClick={() => beginEdit(entry)}
                              type="button"
                            >
                              Edit
                            </button>
                            <button
                              className="rounded border border-[#2b2f36] px-2 py-1 hover:bg-white/5"
                              onClick={() => void handleToggle(entry)}
                              type="button"
                            >
                              {entry.isActive ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              className="rounded border border-red-500/50 px-2 py-1 text-red-300 hover:bg-red-500/10"
                              onClick={() => void handleDelete(entry)}
                              type="button"
                            >
                              Delete
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-400">Managed by readyaimgo API</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
