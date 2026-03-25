"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebaseClient";

type RagAllowlistEntry = {
  id: string;
  email: string;
  clientName: string;
  clientSlug: string;
  addedBy: string;
  addedAt: string;
  active: boolean;
  notes: string;
};

function slugifyClientName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function AdminClientsPage() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [entries, setEntries] = useState<RagAllowlistEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientSlug, setClientSlug] = useState("");
  const [notes, setNotes] = useState("");
  const [hasEditedSlug, setHasEditedSlug] = useState(false);

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

  useEffect(() => {
    if (hasEditedSlug) return;
    setClientSlug(slugifyClientName(clientName));
  }, [clientName, hasEditedSlug]);

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

  const loadEntries = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/rag-allowlist", {
        headers: await getAuthHeaders(),
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as { entries?: RagAllowlistEntry[]; error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load ReadyAimGo allowlist.");
      }
      setEntries(Array.isArray(payload.entries) ? payload.entries : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load ReadyAimGo allowlist.");
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    if (!isSignedIn) return;
    void loadEntries();
  }, [isSignedIn, loadEntries]);

  async function handleAddEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/admin/rag-allowlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await getAuthHeaders()),
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          clientName: clientName.trim(),
          clientSlug: clientSlug.trim().toLowerCase(),
          notes: notes.trim(),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to add ReadyAimGo client.");
      }

      setEmail("");
      setClientName("");
      setClientSlug("");
      setNotes("");
      setHasEditedSlug(false);
      setSuccessMessage("Allowlist entry saved.");
      await loadEntries();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to add ReadyAimGo client.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActive(entry: RagAllowlistEntry) {
    setTogglingId(entry.id);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/admin/rag-allowlist/${encodeURIComponent(entry.id)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(await getAuthHeaders()),
        },
        body: JSON.stringify({ active: !entry.active }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to update client access.");
      }

      setSuccessMessage(entry.active ? "Client access revoked." : "Client access restored.");
      await loadEntries();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Failed to update client access.");
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <main className="min-h-screen w-full bg-[#0e0e0e] text-white">
      <div className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-8">
        <header className="border-b border-white/10 pb-6">
          <p className="text-xs uppercase tracking-[0.28em] text-white/50">BEAM Internal</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">ReadyAimGo Client Access</h1>
          <p className="mt-3 max-w-3xl text-sm text-white/70 sm:text-base">
            Manage which emails have access to the ReadyAimGo client portal hosted on BEAM infrastructure.
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
              onClick={() => void loadEntries()}
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

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Add Client</p>
            <h2 className="mt-2 text-xl font-medium">Allowlist a new contact</h2>
            <p className="mt-2 text-sm text-white/70">
              Once an email is active here, BEAM will route that account into the ReadyAimGo client portal after sign-in.
            </p>
            <form onSubmit={handleAddEntry} className="mt-5 space-y-4">
              <label className="block space-y-1">
                <span className="text-xs uppercase tracking-[0.18em] text-white/50">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm"
                  placeholder="client@paynepros.com"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs uppercase tracking-[0.18em] text-white/50">Client / Org name</span>
                <input
                  value={clientName}
                  onChange={(event) => setClientName(event.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm"
                  placeholder="PaynePros"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs uppercase tracking-[0.18em] text-white/50">Client slug</span>
                <input
                  value={clientSlug}
                  onChange={(event) => {
                    setHasEditedSlug(true);
                    setClientSlug(event.target.value);
                  }}
                  className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm"
                  placeholder="paynepros"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs uppercase tracking-[0.18em] text-white/50">Notes</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm"
                  placeholder="Optional admin context"
                />
              </label>
              <button
                type="submit"
                disabled={isSaving || !email.trim() || !clientName.trim() || !clientSlug.trim()}
                className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:text-white disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Add To Allowlist"}
              </button>
            </form>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Current Allowlist</p>
            <h2 className="mt-2 text-xl font-medium">Portal access roster</h2>
            <p className="mt-2 text-sm text-white/70">
              Revoking a client here blocks portal access on the next sign-in check. Restoring the record re-enables the
              route immediately.
            </p>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full divide-y divide-white/10 text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.18em] text-white/45">
                    <th className="pb-3 pr-4 font-medium">Email</th>
                    <th className="pb-3 pr-4 font-medium">Client</th>
                    <th className="pb-3 pr-4 font-medium">Added</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="py-3 pr-4 align-top">
                        <div className="text-white">{entry.email}</div>
                        <div className="mt-1 text-xs text-white/45">{entry.clientSlug}</div>
                      </td>
                      <td className="py-3 pr-4 align-top">
                        <div>{entry.clientName}</div>
                        {entry.notes ? <div className="mt-1 text-xs text-white/45">{entry.notes}</div> : null}
                      </td>
                      <td className="py-3 pr-4 align-top text-white/65">{formatDate(entry.addedAt)}</td>
                      <td className="py-3 pr-4 align-top">
                        <span
                          className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em] ${
                            entry.active
                              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                              : "border-white/15 bg-white/5 text-white/50"
                          }`}
                        >
                          {entry.active ? "Active" : "Revoked"}
                        </span>
                      </td>
                      <td className="py-3 align-top">
                        <button
                          type="button"
                          onClick={() => void handleToggleActive(entry)}
                          disabled={togglingId === entry.id}
                          className="inline-flex rounded-full border border-white/20 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-white/85 transition hover:border-white/50 hover:text-white disabled:opacity-50"
                        >
                          {togglingId === entry.id ? "Updating..." : entry.active ? "Revoke" : "Restore"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-white/50">
                        No ReadyAimGo clients loaded yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
