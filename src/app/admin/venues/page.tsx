"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, type User } from "firebase/auth";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebaseClient";
import {
  BEAM_VENUE_INVENTORY_COLLECTION,
  BEAM_VENUE_INVENTORY_SEED,
  BEAM_VENUE_OVERLAYS_COLLECTION,
  BEAM_VENUE_OVERLAY_SEED,
  VENUE_CAMPUSES,
  VENUE_STATUSES,
  type BeamVenueCampus,
  type BeamVenueInventoryItem,
  type BeamVenueOverlay,
  type BeamVenueRoom,
  type BeamVenueStatus,
} from "@/lib/venues";

type VenueFormState = {
  name: string;
  address: string;
  campus: BeamVenueCampus;
  currentStatus: BeamVenueStatus;
  beamAccessNotes: string;
  roomName: string;
  roomCapacity: string;
  hasPA: boolean;
  hasPiano: boolean;
  hasMixingBoard: boolean;
  hasRecordingBooth: boolean;
  hasARVREquipment: boolean;
  insuranceRequired: boolean;
  accessContact: string;
  accessEmail: string;
  reservationProcess: string;
  costPerSession: string;
  roomNotes: string;
};

const INPUT_CLASS =
  "w-full rounded-xl border border-white/10 bg-[#121317] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--beam-gold)]";
const TEXTAREA_CLASS =
  "min-h-28 w-full rounded-xl border border-white/10 bg-[#121317] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--beam-gold)]";
const ACTION_BUTTON_BASE =
  "inline-flex rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:text-white disabled:opacity-50";
const PRIMARY_BUTTON_BASE =
  "rounded-full bg-[var(--beam-gold)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-[var(--beam-gold-bright)] disabled:opacity-50";

const INITIAL_FORM: VenueFormState = {
  name: "",
  address: "",
  campus: "community",
  currentStatus: "pending_access",
  beamAccessNotes: "",
  roomName: "",
  roomCapacity: "",
  hasPA: false,
  hasPiano: false,
  hasMixingBoard: false,
  hasRecordingBooth: false,
  hasARVREquipment: false,
  insuranceRequired: false,
  accessContact: "",
  accessEmail: "",
  reservationProcess: "",
  costPerSession: "0",
  roomNotes: "",
};

function mapVenueDocument(id: string, data: Record<string, unknown>): BeamVenueInventoryItem {
  return {
    id,
    name: String(data.name ?? ""),
    address: String(data.address ?? ""),
    campus: VENUE_CAMPUSES.includes(data.campus as BeamVenueCampus) ? (data.campus as BeamVenueCampus) : "other",
    currentStatus: VENUE_STATUSES.includes(data.currentStatus as BeamVenueStatus)
      ? (data.currentStatus as BeamVenueStatus)
      : "pending_access",
    beamAccessNotes: String(data.beamAccessNotes ?? ""),
    rooms: Array.isArray(data.rooms)
      ? data.rooms.map((room) => ({
          name: String((room as Record<string, unknown>).name ?? ""),
          capacity: Number((room as Record<string, unknown>).capacity ?? 0),
          hasPA: Boolean((room as Record<string, unknown>).hasPA),
          hasPiano: Boolean((room as Record<string, unknown>).hasPiano),
          hasMixingBoard: Boolean((room as Record<string, unknown>).hasMixingBoard),
          hasRecordingBooth: Boolean((room as Record<string, unknown>).hasRecordingBooth),
          hasARVREquipment: Boolean((room as Record<string, unknown>).hasARVREquipment),
          insuranceRequired: Boolean((room as Record<string, unknown>).insuranceRequired),
          accessContact: String((room as Record<string, unknown>).accessContact ?? ""),
          accessEmail: String((room as Record<string, unknown>).accessEmail ?? ""),
          reservationProcess: String((room as Record<string, unknown>).reservationProcess ?? ""),
          costPerSession: Number((room as Record<string, unknown>).costPerSession ?? 0),
          notes: String((room as Record<string, unknown>).notes ?? ""),
        }))
      : [],
  };
}

function mapOverlayDocument(id: string, data: Record<string, unknown>): BeamVenueOverlay {
  return {
    id,
    venueId: String(data.venueId ?? ""),
    overlayType:
      data.overlayType === "technical" ||
      data.overlayType === "performance" ||
      data.overlayType === "film" ||
      data.overlayType === "game"
        ? data.overlayType
        : "historical",
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    assetUrl: typeof data.assetUrl === "string" && data.assetUrl.trim() ? data.assetUrl : undefined,
    triggeredByRoom: String(data.triggeredByRoom ?? ""),
    status: data.status === "in_development" || data.status === "live" ? data.status : "concept",
  };
}

function statusBadgeClass(status: BeamVenueStatus): string {
  if (status === "confirmed_access") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
  if (status === "pending_access") return "border-amber-400/30 bg-amber-500/10 text-amber-200";
  if (status === "restricted") return "border-red-400/30 bg-red-500/10 text-red-200";
  return "border-sky-400/30 bg-sky-500/10 text-sky-200";
}

function toFormState(item?: BeamVenueInventoryItem): VenueFormState {
  const room = item?.rooms[0];
  return {
    name: item?.name ?? "",
    address: item?.address ?? "",
    campus: item?.campus ?? "community",
    currentStatus: item?.currentStatus ?? "pending_access",
    beamAccessNotes: item?.beamAccessNotes ?? "",
    roomName: room?.name ?? "",
    roomCapacity: room ? String(room.capacity) : "",
    hasPA: room?.hasPA ?? false,
    hasPiano: room?.hasPiano ?? false,
    hasMixingBoard: room?.hasMixingBoard ?? false,
    hasRecordingBooth: room?.hasRecordingBooth ?? false,
    hasARVREquipment: room?.hasARVREquipment ?? false,
    insuranceRequired: room?.insuranceRequired ?? false,
    accessContact: room?.accessContact ?? "",
    accessEmail: room?.accessEmail ?? "",
    reservationProcess: room?.reservationProcess ?? "",
    costPerSession: room ? String(room.costPerSession) : "0",
    roomNotes: room?.notes ?? "",
  };
}

function buildRoom(form: VenueFormState): BeamVenueRoom {
  return {
    name: form.roomName.trim(),
    capacity: Number(form.roomCapacity || 0),
    hasPA: form.hasPA,
    hasPiano: form.hasPiano,
    hasMixingBoard: form.hasMixingBoard,
    hasRecordingBooth: form.hasRecordingBooth,
    hasARVREquipment: form.hasARVREquipment,
    insuranceRequired: form.insuranceRequired,
    accessContact: form.accessContact.trim(),
    accessEmail: form.accessEmail.trim(),
    reservationProcess: form.reservationProcess.trim(),
    costPerSession: Number(form.costPerSession || 0),
    notes: form.roomNotes.trim(),
  };
}

function validateForm(form: VenueFormState): string | null {
  if (!form.name.trim()) return "Venue name is required.";
  if (!form.address.trim()) return "Address is required.";
  if (!form.roomName.trim()) return "At least one room name is required.";
  return null;
}

function capabilityList(room: BeamVenueRoom): string[] {
  return [
    room.hasPA ? "PA" : null,
    room.hasPiano ? "Piano" : null,
    room.hasMixingBoard ? "Board" : null,
    room.hasRecordingBooth ? "Recording booth" : null,
  ].filter(Boolean) as string[];
}

function renderVenueForm(
  form: VenueFormState,
  setForm: React.Dispatch<React.SetStateAction<VenueFormState>>,
  fieldPrefix: string
) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="space-y-2 text-sm">
        <span className="text-white/70">Venue name</span>
        <input
          id={`${fieldPrefix}-name`}
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          className={INPUT_CLASS}
        />
      </label>

      <label className="space-y-2 text-sm">
        <span className="text-white/70">Address</span>
        <input
          id={`${fieldPrefix}-address`}
          value={form.address}
          onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
          className={INPUT_CLASS}
        />
      </label>

      <label className="space-y-2 text-sm">
        <span className="text-white/70">Campus</span>
        <select
          id={`${fieldPrefix}-campus`}
          value={form.campus}
          onChange={(event) => setForm((current) => ({ ...current, campus: event.target.value as BeamVenueCampus }))}
          className={INPUT_CLASS}
        >
          {VENUE_CAMPUSES.map((campus) => (
            <option key={campus} value={campus}>
              {campus}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-2 text-sm">
        <span className="text-white/70">Access status</span>
        <select
          id={`${fieldPrefix}-status`}
          value={form.currentStatus}
          onChange={(event) => setForm((current) => ({ ...current, currentStatus: event.target.value as BeamVenueStatus }))}
          className={INPUT_CLASS}
        >
          {VENUE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-2 text-sm md:col-span-2">
        <span className="text-white/70">BEAM access notes</span>
        <textarea
          id={`${fieldPrefix}-beam-notes`}
          value={form.beamAccessNotes}
          onChange={(event) => setForm((current) => ({ ...current, beamAccessNotes: event.target.value }))}
          className={TEXTAREA_CLASS}
        />
      </label>

      <label className="space-y-2 text-sm">
        <span className="text-white/70">Primary room</span>
        <input
          id={`${fieldPrefix}-room-name`}
          value={form.roomName}
          onChange={(event) => setForm((current) => ({ ...current, roomName: event.target.value }))}
          className={INPUT_CLASS}
        />
      </label>

      <label className="space-y-2 text-sm">
        <span className="text-white/70">Capacity</span>
        <input
          id={`${fieldPrefix}-capacity`}
          type="number"
          min={0}
          value={form.roomCapacity}
          onChange={(event) => setForm((current) => ({ ...current, roomCapacity: event.target.value }))}
          className={INPUT_CLASS}
        />
      </label>

      <label className="space-y-2 text-sm">
        <span className="text-white/70">Access contact</span>
        <input
          id={`${fieldPrefix}-contact`}
          value={form.accessContact}
          onChange={(event) => setForm((current) => ({ ...current, accessContact: event.target.value }))}
          className={INPUT_CLASS}
        />
      </label>

      <label className="space-y-2 text-sm">
        <span className="text-white/70">Access email</span>
        <input
          id={`${fieldPrefix}-email`}
          type="email"
          value={form.accessEmail}
          onChange={(event) => setForm((current) => ({ ...current, accessEmail: event.target.value }))}
          className={INPUT_CLASS}
        />
      </label>

      <label className="space-y-2 text-sm">
        <span className="text-white/70">Cost per session</span>
        <input
          id={`${fieldPrefix}-cost`}
          type="number"
          min={0}
          value={form.costPerSession}
          onChange={(event) => setForm((current) => ({ ...current, costPerSession: event.target.value }))}
          className={INPUT_CLASS}
        />
      </label>

      <div className="space-y-2 text-sm">
        <span className="text-white/70">Capabilities</span>
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-[#121317] p-3">
          {[
            ["hasPA", "PA"],
            ["hasPiano", "Piano"],
            ["hasMixingBoard", "Mixing board"],
            ["hasRecordingBooth", "Recording booth"],
            ["hasARVREquipment", "AR/VR equipment"],
            ["insuranceRequired", "Insurance required"],
          ].map(([field, label]) => (
            <label key={field} className="flex items-center gap-2 text-xs text-white/75">
              <input
                type="checkbox"
                checked={form[field as keyof VenueFormState] as boolean}
                onChange={(event) =>
                  setForm((current) => ({ ...current, [field]: event.target.checked }))
                }
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      <label className="space-y-2 text-sm md:col-span-2">
        <span className="text-white/70">Reservation process</span>
        <textarea
          id={`${fieldPrefix}-reservation`}
          value={form.reservationProcess}
          onChange={(event) => setForm((current) => ({ ...current, reservationProcess: event.target.value }))}
          className={TEXTAREA_CLASS}
        />
      </label>

      <label className="space-y-2 text-sm md:col-span-2">
        <span className="text-white/70">Room notes</span>
        <textarea
          id={`${fieldPrefix}-room-notes`}
          value={form.roomNotes}
          onChange={(event) => setForm((current) => ({ ...current, roomNotes: event.target.value }))}
          className={TEXTAREA_CLASS}
        />
      </label>
    </div>
  );
}

export default function AdminVenuesPage() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [venues, setVenues] = useState<BeamVenueInventoryItem[]>([]);
  const [overlays, setOverlays] = useState<BeamVenueOverlay[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<VenueFormState>(INITIAL_FORM);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newForm, setNewForm] = useState<VenueFormState>(INITIAL_FORM);
  const [expandedOverlays, setExpandedOverlays] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const overlaysByVenue = useMemo(() => {
    return overlays.reduce<Record<string, BeamVenueOverlay[]>>((accumulator, overlay) => {
      const list = accumulator[overlay.venueId] ?? [];
      list.push(overlay);
      accumulator[overlay.venueId] = list;
      return accumulator;
    }, {});
  }, [overlays]);

  async function loadData() {
    const db = getFirebaseDb();
    if (!db) {
      setError("Firebase is not configured for home.beamthinktank.space.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [venueSnapshot, overlaySnapshot] = await Promise.all([
        getDocs(collection(db, BEAM_VENUE_INVENTORY_COLLECTION)),
        getDocs(collection(db, BEAM_VENUE_OVERLAYS_COLLECTION)),
      ]);

      setVenues(
        venueSnapshot.docs
          .map((snapshot) => mapVenueDocument(snapshot.id, snapshot.data() as Record<string, unknown>))
          .sort((left, right) => left.name.localeCompare(right.name))
      );
      setOverlays(
        overlaySnapshot.docs.map((snapshot) =>
          mapOverlayDocument(snapshot.id, snapshot.data() as Record<string, unknown>)
        )
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load venue inventory.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    try {
      const auth = getFirebaseAuth();
      const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
        setUser(nextUser);
        setIsSignedIn(Boolean(nextUser));
        setAuthReady(true);
        if (!nextUser) {
          setVenues([]);
          setOverlays([]);
          setEditingId(null);
        }
      });
      return unsubscribe;
    } catch {
      setUser(null);
      setIsSignedIn(false);
      setAuthReady(true);
      return undefined;
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void loadData();
  }, [user]);

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

  async function handleSeedInventory() {
    const db = getFirebaseDb();
    if (!db) {
      setError("Firebase is not configured for home.beamthinktank.space.");
      return;
    }

    setIsSeeding(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const batch = writeBatch(db);

      for (const venue of BEAM_VENUE_INVENTORY_SEED) {
        batch.set(doc(db, BEAM_VENUE_INVENTORY_COLLECTION, venue.id), {
          ...venue,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }

      for (const overlay of BEAM_VENUE_OVERLAY_SEED) {
        batch.set(doc(db, BEAM_VENUE_OVERLAYS_COLLECTION, overlay.id), {
          ...overlay,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }

      await batch.commit();
      await loadData();
      setSuccessMessage("Venue inventory and overlay stubs seeded.");
    } catch (seedError) {
      setError(seedError instanceof Error ? seedError.message : "Failed to seed venues.");
    } finally {
      setIsSeeding(false);
    }
  }

  async function handleCreateVenue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const db = getFirebaseDb();
    if (!db) {
      setError("Firebase is not configured for home.beamthinktank.space.");
      return;
    }

    const validationError = validateForm(newForm);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsCreating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await addDoc(collection(db, BEAM_VENUE_INVENTORY_COLLECTION), {
        name: newForm.name.trim(),
        address: newForm.address.trim(),
        campus: newForm.campus,
        currentStatus: newForm.currentStatus,
        beamAccessNotes: newForm.beamAccessNotes.trim(),
        rooms: [buildRoom(newForm)],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setNewForm(INITIAL_FORM);
      setIsAddOpen(false);
      await loadData();
      setSuccessMessage("Venue added.");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to add venue.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleSaveVenue(venueId: string) {
    const db = getFirebaseDb();
    if (!db) {
      setError("Firebase is not configured for home.beamthinktank.space.");
      return;
    }

    const validationError = validateForm(editForm);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await updateDoc(doc(db, BEAM_VENUE_INVENTORY_COLLECTION, venueId), {
        name: editForm.name.trim(),
        address: editForm.address.trim(),
        campus: editForm.campus,
        currentStatus: editForm.currentStatus,
        beamAccessNotes: editForm.beamAccessNotes.trim(),
        rooms: [buildRoom(editForm)],
        updatedAt: serverTimestamp(),
      });

      setEditingId(null);
      await loadData();
      setSuccessMessage("Venue updated.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to update venue.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen w-full bg-[#0e0e0e] text-white">
      <div className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-8">
        <header className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-white/50">Home Admin</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Venue Inventory</h1>
              <p className="mt-3 max-w-3xl text-sm text-white/70 sm:text-base">
                Shared venue access manager for BEAM music NGOs. Track access status, room capabilities, reservation workflow, and future AR/VR overlay stubs in one place.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {isSignedIn ? (
                <>
                  <button onClick={() => setIsAddOpen((current) => !current)} className={PRIMARY_BUTTON_BASE}>
                    {isAddOpen ? "Close Add Venue" : "Add Venue"}
                  </button>
                  <button onClick={() => void handleSeedInventory()} disabled={isSeeding} className={ACTION_BUTTON_BASE}>
                    {isSeeding ? "Seeding..." : "Seed Inventory"}
                  </button>
                  <button
                    onClick={() => {
                      const auth = getFirebaseAuth();
                      if (auth) void signOut(auth);
                    }}
                    className={ACTION_BUTTON_BASE}
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <button onClick={() => void handleGoogleSignIn()} className={PRIMARY_BUTTON_BASE}>
                  Sign In With Google
                </button>
              )}
            </div>
          </div>
        </header>

        {!authReady ? <p className="mt-6 text-sm text-white/60">Checking authentication...</p> : null}

        {authReady && !isSignedIn ? (
          <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 text-sm text-white/70">
            Google SSO is required here, matching the existing `/admin/substrate` workflow.
          </section>
        ) : null}

        {error ? <p className="mt-6 text-sm text-red-300">{error}</p> : null}
        {successMessage ? <p className="mt-6 text-sm text-[var(--beam-gold-bright)]">{successMessage}</p> : null}

        {isSignedIn && isAddOpen ? (
          <form onSubmit={handleCreateVenue} className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-medium">Add Venue</h2>
              <button type="submit" disabled={isCreating} className={PRIMARY_BUTTON_BASE}>
                {isCreating ? "Saving..." : "Create Venue"}
              </button>
            </div>
            <div className="mt-5">{renderVenueForm(newForm, setNewForm, "new-venue")}</div>
          </form>
        ) : null}

        {isSignedIn && isLoading ? <p className="mt-8 text-sm text-white/60">Loading venues...</p> : null}

        {isSignedIn ? (
          <section className="mt-8 grid gap-5">
            {venues.map((venue) => {
              const room = venue.rooms[0];
              const overlayList = overlaysByVenue[venue.id] ?? [];
              const isEditing = editingId === venue.id;

              return (
                <article key={venue.id} className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-medium text-white">{venue.name}</h2>
                        <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${statusBadgeClass(venue.currentStatus)}`}>
                          {venue.currentStatus.replaceAll("_", " ")}
                        </span>
                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/55">
                          {venue.campus}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-white/65">{venue.address}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {isEditing ? (
                        <>
                          <button type="button" onClick={() => void handleSaveVenue(venue.id)} disabled={isSaving} className={PRIMARY_BUTTON_BASE}>
                            {isSaving ? "Saving..." : "Save Venue"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(null);
                              setEditForm(INITIAL_FORM);
                            }}
                            className={ACTION_BUTTON_BASE}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(venue.id);
                            setEditForm(toFormState(venue));
                          }}
                          className={ACTION_BUTTON_BASE}
                        >
                          Edit Venue
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="mt-6">{renderVenueForm(editForm, setEditForm, `venue-${venue.id}`)}</div>
                  ) : (
                    <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-white/45">Rooms</p>
                          <div className="mt-3 grid gap-3">
                            {venue.rooms.map((item) => (
                              <div key={`${venue.id}-${item.name}`} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="font-medium text-white">{item.name}</p>
                                  <span className="text-xs uppercase tracking-[0.18em] text-white/45">
                                    Capacity {item.capacity || "TBD"}
                                  </span>
                                </div>
                                <p className="mt-3 text-sm text-white/65">
                                  {capabilityList(item).join(" • ") || "Capability details pending"}
                                </p>
                                <p className="mt-2 text-sm text-white/55">{item.notes || "No room notes yet."}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-white/45">Reservation Process</p>
                          <p className="mt-3 text-sm text-white/70">{room?.reservationProcess || "Reservation process not documented yet."}</p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-white/45">BEAM Access Notes</p>
                          <p className="mt-3 text-sm text-white/70">{venue.beamAccessNotes || "No BEAM access notes yet."}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-white/45">Access Contact</p>
                          <p className="mt-3 text-white">{room?.accessContact || "Contact pending"}</p>
                          {room?.accessEmail ? (
                            <a href={`mailto:${room.accessEmail}`} className="mt-2 inline-flex text-sm text-[var(--beam-gold-bright)] hover:text-white">
                              {room.accessEmail}
                            </a>
                          ) : (
                            <p className="mt-2 text-sm text-white/45">Email pending</p>
                          )}
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedOverlays((current) => ({ ...current, [venue.id]: !current[venue.id] }))
                            }
                            className="flex w-full items-center justify-between text-left"
                          >
                            <span>
                              <span className="block text-xs uppercase tracking-[0.2em] text-white/45">AR/VR Overlays</span>
                              <span className="mt-2 block text-white">AR/VR Overlays ({overlayList.length})</span>
                            </span>
                            <span className="text-sm text-white/55">{expandedOverlays[venue.id] ? "Hide" : "Expand"}</span>
                          </button>

                          {expandedOverlays[venue.id] ? (
                            <div className="mt-4 space-y-3">
                              {overlayList.length === 0 ? (
                                <p className="text-sm text-white/55">No overlays yet. This panel is reserved for future Kevin Rockwood integration.</p>
                              ) : (
                                overlayList.map((overlay) => (
                                  <div key={overlay.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-white/50">
                                        {overlay.overlayType}
                                      </span>
                                      <span className="rounded-full border border-amber-400/20 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-amber-200">
                                        {overlay.status}
                                      </span>
                                    </div>
                                    <p className="mt-3 font-medium text-white">{overlay.title}</p>
                                    <p className="mt-2 text-sm text-white/65">{overlay.description}</p>
                                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/45">
                                      Triggered by {overlay.triggeredByRoom || "Room pending"}
                                    </p>
                                  </div>
                                ))
                              )}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        ) : null}
      </div>
    </main>
  );
}
