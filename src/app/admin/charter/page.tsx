"use client";

import { type FormEvent, useEffect, useState } from "react";
import {
  Timestamp,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from "firebase/auth";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebaseClient";

type CharterStatus = "draft" | "collecting" | "ready" | "submitted";
type CharterType = "basic" | "standard";
type OfficerPrefix = "officer1" | "officer2" | "officer3" | "officer4";

interface BeamCharterDoc {
  institutionSlug: string;
  institutionName: string;
  institutionCity: string;
  rsoSystem: string;
  rsoSubmissionUrl: string;
  orgCategory: string;
  orgName: string;
  orgMission: string;
  orgDescription: string;
  offCampusAffiliations: string;
  officer1Role: string;
  officer1Name: string;
  officer1Email: string;
  officer1Phone: string;
  officer1StudentId: string;
  officer1Enrolled: boolean;
  officer1Credits: string;
  officer1ContractSigned: boolean;
  officer1TrainingComplete: boolean;
  officer2Role: string;
  officer2Name: string;
  officer2Email: string;
  officer2Phone: string;
  officer2StudentId: string;
  officer2Enrolled: boolean;
  officer2Credits: string;
  officer2ContractSigned: boolean;
  officer2TrainingComplete: boolean;
  officer3Role: string;
  officer3Name: string;
  officer3Email: string;
  officer3Phone: string;
  officer3StudentId: string;
  officer3Enrolled: boolean;
  officer3Credits: string;
  officer3ContractSigned: boolean;
  officer3TrainingComplete: boolean;
  officer4Role: string;
  officer4Name: string;
  officer4Email: string;
  officer4Phone: string;
  officer4StudentId: string;
  officer4Enrolled: boolean;
  officer4Credits: string;
  officer4ContractSigned: boolean;
  officer4TrainingComplete: boolean;
  advisorName: string;
  advisorTitle: string;
  advisorDepartment: string;
  advisorOfficeLocation: string;
  advisorEmail: string;
  advisorPhone: string;
  advisorSupervisorName: string;
  advisorSupervisorEmail: string;
  advisorContractSigned: boolean;
  divisions: string[];
  charterType: CharterType;
  charterDocumentUrl: string;
  status: CharterStatus;
  completionPercent: number;
  notes: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  submittedAt: Timestamp | null;
}

interface BeamCharterRow extends BeamCharterDoc {
  id: string;
}

interface CompletionChecklist {
  president: boolean;
  vicePresident: boolean;
  treasurer: boolean;
  secretary: boolean;
  advisor: boolean;
  mission: boolean;
  completedCount: number;
  completionPercent: number;
}

interface NewInstitutionFormState {
  institutionName: string;
  institutionCity: string;
  institutionSlug: string;
  rsoSystem: string;
  rsoSubmissionUrl: string;
}

const CHARTER_COLLECTION = "beamCharters";
const INPUT_CLASS =
  "w-full rounded-xl border border-white/10 bg-[#121317] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--beam-gold)]";
const TEXTAREA_CLASS =
  "min-h-28 w-full rounded-xl border border-white/10 bg-[#121317] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--beam-gold)]";
const ACTION_BUTTON_BASE =
  "inline-flex rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40";
const PRIMARY_BUTTON_BASE =
  "inline-flex rounded-full bg-[var(--beam-gold)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-[var(--beam-gold-bright)] disabled:cursor-not-allowed disabled:opacity-50";
const OFFICER_OPTIONS = [
  { prefix: "officer1", label: "President" },
  { prefix: "officer2", label: "Vice President" },
  { prefix: "officer3", label: "Treasurer" },
  { prefix: "officer4", label: "Secretary" },
] as const satisfies ReadonlyArray<{ prefix: OfficerPrefix; label: string }>;
const INITIAL_NEW_INSTITUTION_FORM: NewInstitutionFormState = {
  institutionName: "",
  institutionCity: "",
  institutionSlug: "",
  rsoSystem: "",
  rsoSubmissionUrl: "",
};

function normalizeInstitutionSlug(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
  return normalized;
}

function formatInstitutionLabel(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((segment) => {
      if (segment.length <= 4) return segment.toUpperCase();
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    })
    .join(" ");
}

function createEmptyCharterDoc(institutionSlug = ""): BeamCharterDoc {
  return {
    institutionSlug,
    institutionName: institutionSlug ? formatInstitutionLabel(institutionSlug) : "",
    institutionCity: "",
    rsoSystem: "",
    rsoSubmissionUrl: "",
    orgCategory: "Social Action",
    orgName: "BEAM",
    orgMission: "",
    orgDescription: "",
    offCampusAffiliations: "",
    officer1Role: "President",
    officer1Name: "",
    officer1Email: "",
    officer1Phone: "",
    officer1StudentId: "",
    officer1Enrolled: false,
    officer1Credits: "",
    officer1ContractSigned: false,
    officer1TrainingComplete: false,
    officer2Role: "Vice President",
    officer2Name: "",
    officer2Email: "",
    officer2Phone: "",
    officer2StudentId: "",
    officer2Enrolled: false,
    officer2Credits: "",
    officer2ContractSigned: false,
    officer2TrainingComplete: false,
    officer3Role: "Treasurer",
    officer3Name: "",
    officer3Email: "",
    officer3Phone: "",
    officer3StudentId: "",
    officer3Enrolled: false,
    officer3Credits: "",
    officer3ContractSigned: false,
    officer3TrainingComplete: false,
    officer4Role: "Secretary",
    officer4Name: "",
    officer4Email: "",
    officer4Phone: "",
    officer4StudentId: "",
    officer4Enrolled: false,
    officer4Credits: "",
    officer4ContractSigned: false,
    officer4TrainingComplete: false,
    advisorName: "",
    advisorTitle: "",
    advisorDepartment: "",
    advisorOfficeLocation: "",
    advisorEmail: "",
    advisorPhone: "",
    advisorSupervisorName: "",
    advisorSupervisorEmail: "",
    advisorContractSigned: false,
    divisions: [],
    charterType: "basic",
    charterDocumentUrl: "",
    status: "draft",
    completionPercent: 0,
    notes: "",
    createdAt: null,
    updatedAt: null,
    submittedAt: null,
  };
}

function mapCharterDoc(snapshot: QueryDocumentSnapshot<DocumentData>): BeamCharterRow {
  const defaults = createEmptyCharterDoc(snapshot.id);
  const data = snapshot.data();

  return {
    id: snapshot.id,
    ...defaults,
    institutionSlug: typeof data.institutionSlug === "string" && data.institutionSlug.trim() ? data.institutionSlug : snapshot.id,
    institutionName: typeof data.institutionName === "string" && data.institutionName.trim() ? data.institutionName : defaults.institutionName,
    institutionCity: String(data.institutionCity ?? defaults.institutionCity),
    rsoSystem: String(data.rsoSystem ?? defaults.rsoSystem),
    rsoSubmissionUrl: String(data.rsoSubmissionUrl ?? defaults.rsoSubmissionUrl),
    orgCategory: String(data.orgCategory ?? defaults.orgCategory),
    orgName: String(data.orgName ?? defaults.orgName),
    orgMission: String(data.orgMission ?? defaults.orgMission),
    orgDescription: String(data.orgDescription ?? defaults.orgDescription),
    offCampusAffiliations: String(data.offCampusAffiliations ?? defaults.offCampusAffiliations),
    officer1Role: String(data.officer1Role ?? defaults.officer1Role),
    officer1Name: String(data.officer1Name ?? defaults.officer1Name),
    officer1Email: String(data.officer1Email ?? defaults.officer1Email),
    officer1Phone: String(data.officer1Phone ?? defaults.officer1Phone),
    officer1StudentId: String(data.officer1StudentId ?? defaults.officer1StudentId),
    officer1Enrolled: Boolean(data.officer1Enrolled),
    officer1Credits: String(data.officer1Credits ?? defaults.officer1Credits),
    officer1ContractSigned: Boolean(data.officer1ContractSigned),
    officer1TrainingComplete: Boolean(data.officer1TrainingComplete),
    officer2Role: String(data.officer2Role ?? defaults.officer2Role),
    officer2Name: String(data.officer2Name ?? defaults.officer2Name),
    officer2Email: String(data.officer2Email ?? defaults.officer2Email),
    officer2Phone: String(data.officer2Phone ?? defaults.officer2Phone),
    officer2StudentId: String(data.officer2StudentId ?? defaults.officer2StudentId),
    officer2Enrolled: Boolean(data.officer2Enrolled),
    officer2Credits: String(data.officer2Credits ?? defaults.officer2Credits),
    officer2ContractSigned: Boolean(data.officer2ContractSigned),
    officer2TrainingComplete: Boolean(data.officer2TrainingComplete),
    officer3Role: String(data.officer3Role ?? defaults.officer3Role),
    officer3Name: String(data.officer3Name ?? defaults.officer3Name),
    officer3Email: String(data.officer3Email ?? defaults.officer3Email),
    officer3Phone: String(data.officer3Phone ?? defaults.officer3Phone),
    officer3StudentId: String(data.officer3StudentId ?? defaults.officer3StudentId),
    officer3Enrolled: Boolean(data.officer3Enrolled),
    officer3Credits: String(data.officer3Credits ?? defaults.officer3Credits),
    officer3ContractSigned: Boolean(data.officer3ContractSigned),
    officer3TrainingComplete: Boolean(data.officer3TrainingComplete),
    officer4Role: String(data.officer4Role ?? defaults.officer4Role),
    officer4Name: String(data.officer4Name ?? defaults.officer4Name),
    officer4Email: String(data.officer4Email ?? defaults.officer4Email),
    officer4Phone: String(data.officer4Phone ?? defaults.officer4Phone),
    officer4StudentId: String(data.officer4StudentId ?? defaults.officer4StudentId),
    officer4Enrolled: Boolean(data.officer4Enrolled),
    officer4Credits: String(data.officer4Credits ?? defaults.officer4Credits),
    officer4ContractSigned: Boolean(data.officer4ContractSigned),
    officer4TrainingComplete: Boolean(data.officer4TrainingComplete),
    advisorName: String(data.advisorName ?? defaults.advisorName),
    advisorTitle: String(data.advisorTitle ?? defaults.advisorTitle),
    advisorDepartment: String(data.advisorDepartment ?? defaults.advisorDepartment),
    advisorOfficeLocation: String(data.advisorOfficeLocation ?? defaults.advisorOfficeLocation),
    advisorEmail: String(data.advisorEmail ?? defaults.advisorEmail),
    advisorPhone: String(data.advisorPhone ?? defaults.advisorPhone),
    advisorSupervisorName: String(data.advisorSupervisorName ?? defaults.advisorSupervisorName),
    advisorSupervisorEmail: String(data.advisorSupervisorEmail ?? defaults.advisorSupervisorEmail),
    advisorContractSigned: Boolean(data.advisorContractSigned),
    divisions: Array.isArray(data.divisions) ? data.divisions.map((entry: unknown) => String(entry)).filter(Boolean) : [],
    charterType: data.charterType === "standard" ? "standard" : "basic",
    charterDocumentUrl: String(data.charterDocumentUrl ?? defaults.charterDocumentUrl),
    status:
      data.status === "collecting"
        ? "collecting"
        : data.status === "ready"
          ? "ready"
          : data.status === "submitted"
            ? "submitted"
            : "draft",
    completionPercent: Number(data.completionPercent ?? defaults.completionPercent),
    notes: String(data.notes ?? defaults.notes),
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt : defaults.createdAt,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt : defaults.updatedAt,
    submittedAt: data.submittedAt instanceof Timestamp ? data.submittedAt : defaults.submittedAt,
  };
}

function normalizeDivisions(value: string[]): string[] {
  return [...new Set(value.map((entry) => entry.trim()).filter(Boolean))];
}

function normalizeCharterDoc(input: BeamCharterDoc): BeamCharterDoc {
  return {
    ...input,
    institutionSlug: normalizeInstitutionSlug(input.institutionSlug) || input.institutionSlug,
    institutionName: input.institutionName.trim(),
    institutionCity: input.institutionCity.trim(),
    rsoSystem: input.rsoSystem.trim(),
    rsoSubmissionUrl: input.rsoSubmissionUrl.trim(),
    orgCategory: input.orgCategory.trim(),
    orgName: input.orgName.trim(),
    orgMission: input.orgMission.trim(),
    orgDescription: input.orgDescription.trim(),
    offCampusAffiliations: input.offCampusAffiliations.trim(),
    officer1Role: input.officer1Role.trim(),
    officer1Name: input.officer1Name.trim(),
    officer1Email: input.officer1Email.trim(),
    officer1Phone: input.officer1Phone.trim(),
    officer1StudentId: input.officer1StudentId.trim(),
    officer1Credits: input.officer1Credits.trim(),
    officer2Role: input.officer2Role.trim(),
    officer2Name: input.officer2Name.trim(),
    officer2Email: input.officer2Email.trim(),
    officer2Phone: input.officer2Phone.trim(),
    officer2StudentId: input.officer2StudentId.trim(),
    officer2Credits: input.officer2Credits.trim(),
    officer3Role: input.officer3Role.trim(),
    officer3Name: input.officer3Name.trim(),
    officer3Email: input.officer3Email.trim(),
    officer3Phone: input.officer3Phone.trim(),
    officer3StudentId: input.officer3StudentId.trim(),
    officer3Credits: input.officer3Credits.trim(),
    officer4Role: input.officer4Role.trim(),
    officer4Name: input.officer4Name.trim(),
    officer4Email: input.officer4Email.trim(),
    officer4Phone: input.officer4Phone.trim(),
    officer4StudentId: input.officer4StudentId.trim(),
    officer4Credits: input.officer4Credits.trim(),
    advisorName: input.advisorName.trim(),
    advisorTitle: input.advisorTitle.trim(),
    advisorDepartment: input.advisorDepartment.trim(),
    advisorOfficeLocation: input.advisorOfficeLocation.trim(),
    advisorEmail: input.advisorEmail.trim(),
    advisorPhone: input.advisorPhone.trim(),
    advisorSupervisorName: input.advisorSupervisorName.trim(),
    advisorSupervisorEmail: input.advisorSupervisorEmail.trim(),
    divisions: normalizeDivisions(input.divisions),
    charterDocumentUrl: input.charterDocumentUrl.trim(),
    notes: input.notes.trim(),
  };
}

function getCompletionChecklist(doc: BeamCharterDoc): CompletionChecklist {
  const president = Boolean(doc.officer1Name.trim() && doc.officer1Email.trim() && doc.officer1Phone.trim() && doc.officer1Enrolled);
  const vicePresident = Boolean(
    doc.officer2Name.trim() && doc.officer2Email.trim() && doc.officer2Phone.trim() && doc.officer2Enrolled
  );
  const treasurer = Boolean(doc.officer3Name.trim() && doc.officer3Email.trim() && doc.officer3Phone.trim() && doc.officer3Enrolled);
  const secretary = Boolean(doc.officer4Name.trim() && doc.officer4Email.trim() && doc.officer4Phone.trim() && doc.officer4Enrolled);
  const advisor = Boolean(doc.advisorName.trim() && doc.advisorEmail.trim() && doc.advisorPhone.trim());
  const mission = Boolean(doc.orgMission.trim() && doc.orgDescription.trim());
  const completedCount = [president, vicePresident, treasurer, secretary, advisor, mission].filter(Boolean).length;

  return {
    president,
    vicePresident,
    treasurer,
    secretary,
    advisor,
    mission,
    completedCount,
    completionPercent: Math.round((completedCount / 6) * 100),
  };
}

function createUwmSeedDoc(): BeamCharterDoc {
  const seeded = createEmptyCharterDoc("uwm");

  return {
    ...seeded,
    institutionSlug: "uwm",
    institutionName: "University of Wisconsin-Milwaukee",
    institutionCity: "Milwaukee, WI",
    rsoSystem: "PantherOrgs",
    rsoSubmissionUrl: "https://pantherorgs.uwm.edu",
    orgCategory: "Social Action",
    orgName: "BEAM",
    orgMission:
      "BEAM is an interdisciplinary, research-driven student organization that connects participants to real projects across music, architecture, food, transportation, technology, finance, and environmental work — and documents who has and has not had access to these disciplines at UWM and in Milwaukee. Members contribute time and skill to working projects, earn portfolio credit or revenue share, and build the infrastructure that makes opportunity available to everyone regardless of background.",
    orgDescription:
      "BEAM (Building Equitable Access to Meaning) operates as a student organization with internal working divisions that mirror the BEAM nonprofit network. Each division focuses on a discipline area and connects enrolled students to real project work, alumni networks, community partnerships, and funding opportunities.",
    offCampusAffiliations: "BEAM Think Tank 501(c)(3) — beamthinktank.space",
    divisions: [
      "Music / Orchestra",
      "Food",
      "Forge / Technology",
      "Finance / Accounting",
      "Architecture / Design",
      "Environment",
      "Transportation",
      "Research / Data",
    ],
    charterType: "basic",
    officer1Role: "President",
    officer1Name: "Ezra Hauga",
    officer1Email: "",
    officer1Phone: "",
    officer1Enrolled: true,
    officer1Credits: "Graduate student",
    officer1ContractSigned: false,
    officer1TrainingComplete: false,
    officer2Role: "Vice President",
    officer2Name: "Evan",
    officer2Email: "",
    officer2Phone: "",
    officer2Enrolled: true,
    officer2Credits: "Graduate student",
    officer2ContractSigned: false,
    officer2TrainingComplete: false,
    officer3Role: "Treasurer",
    officer4Role: "Secretary",
    advisorName: "",
    charterDocumentUrl: "",
    status: "draft",
    completionPercent: 0,
    notes:
      "Chiriu (violin, Chinese undergrad) and Dia (Mexican undergrad, arranger) are candidates for Treasurer and Secretary. Alumni (CJ etc.) CANNOT be officers — must be currently enrolled. Alumni welcome as members.",
  };
}

function statusBadgeClass(status: CharterStatus): string {
  if (status === "submitted") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
  if (status === "ready") return "border-[var(--beam-gold)] bg-[rgba(200,185,122,0.16)] text-[var(--beam-gold-bright)]";
  if (status === "collecting") return "border-blue-400/30 bg-blue-500/10 text-blue-200";
  return "border-white/10 bg-white/5 text-white/60";
}

function formatTimestamp(value: Timestamp | null): string {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value.toDate());
}

function yesNo(value: boolean): string {
  return value ? "YES" : "NO";
}

function buildExportSummary(doc: BeamCharterDoc): string {
  return [
    `BEAM CHARTER SUMMARY — ${doc.institutionName || formatInstitutionLabel(doc.institutionSlug)}`,
    `Generated: ${new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date())}`,
    "",
    `ORGANIZATION NAME: ${doc.orgName || "BEAM"}`,
    `CATEGORY: ${doc.orgCategory || "Social Action"}`,
    `MISSION: ${doc.orgMission}`,
    `DESCRIPTION: ${doc.orgDescription}`,
    `OFF-CAMPUS AFFILIATIONS: ${doc.offCampusAffiliations}`,
    `DIVISIONS / WORKING GROUPS: ${doc.divisions.join(", ")}`,
    "",
    "OFFICER 1 — PRESIDENT",
    `  Name: ${doc.officer1Name}`,
    `  Email: ${doc.officer1Email}`,
    `  Phone: ${doc.officer1Phone}`,
    `  Enrolled half-time: ${yesNo(doc.officer1Enrolled)}`,
    `  Credits: ${doc.officer1Credits}`,
    `  Contract signed: ${yesNo(doc.officer1ContractSigned)}`,
    `  Training complete: ${yesNo(doc.officer1TrainingComplete)}`,
    "",
    "OFFICER 2 — VICE PRESIDENT",
    `  Name: ${doc.officer2Name}`,
    `  Email: ${doc.officer2Email}`,
    `  Phone: ${doc.officer2Phone}`,
    `  Enrolled half-time: ${yesNo(doc.officer2Enrolled)}`,
    `  Credits: ${doc.officer2Credits}`,
    `  Contract signed: ${yesNo(doc.officer2ContractSigned)}`,
    `  Training complete: ${yesNo(doc.officer2TrainingComplete)}`,
    "",
    "OFFICER 3 — TREASURER",
    `  Name: ${doc.officer3Name}`,
    `  Email: ${doc.officer3Email}`,
    `  Phone: ${doc.officer3Phone}`,
    `  Enrolled half-time: ${yesNo(doc.officer3Enrolled)}`,
    `  Credits: ${doc.officer3Credits}`,
    `  Contract signed: ${yesNo(doc.officer3ContractSigned)}`,
    `  Training complete: ${yesNo(doc.officer3TrainingComplete)}`,
    "",
    "OFFICER 4 — SECRETARY",
    `  Name: ${doc.officer4Name}`,
    `  Email: ${doc.officer4Email}`,
    `  Phone: ${doc.officer4Phone}`,
    `  Enrolled half-time: ${yesNo(doc.officer4Enrolled)}`,
    `  Credits: ${doc.officer4Credits}`,
    `  Contract signed: ${yesNo(doc.officer4ContractSigned)}`,
    `  Training complete: ${yesNo(doc.officer4TrainingComplete)}`,
    "",
    "FACULTY/STAFF ADVISOR",
    `  Name: ${doc.advisorName}`,
    `  Title: ${doc.advisorTitle}`,
    `  Department: ${doc.advisorDepartment}`,
    `  Office: ${doc.advisorOfficeLocation}`,
    `  Email: ${doc.advisorEmail}`,
    `  Phone: ${doc.advisorPhone}`,
    `  Supervisor: ${doc.advisorSupervisorName} — ${doc.advisorSupervisorEmail}`,
    `  Advisor contract signed: ${yesNo(doc.advisorContractSigned)}`,
    "",
    `RSO SUBMISSION SYSTEM: ${doc.rsoSystem}`,
    `SUBMISSION URL: ${doc.rsoSubmissionUrl}`,
    `CHARTER TYPE: ${doc.charterType}`,
    `STATUS: ${doc.status}`,
    `NOTES: ${doc.notes}`,
  ].join("\n");
}

async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

export default function AdminCharterPage() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [charters, setCharters] = useState<BeamCharterRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingInstitution, setIsCreatingInstitution] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [exportOpenId, setExportOpenId] = useState<string | null>(null);
  const [copiedExportId, setCopiedExportId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<BeamCharterDoc>(createEmptyCharterDoc());
  const [newInstitutionForm, setNewInstitutionForm] = useState<NewInstitutionFormState>(INITIAL_NEW_INSTITUTION_FORM);
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

  async function loadCharters() {
    setIsLoading(true);
    setError(null);

    try {
      const snapshot = await getDocs(query(collection(getFirebaseDb(), CHARTER_COLLECTION), orderBy("updatedAt", "desc")));
      setCharters(snapshot.docs.map(mapCharterDoc));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load charter applications.");
      setCharters([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadCharters();
  }, []);

  async function requireSignedIn(): Promise<void> {
    const auth = getFirebaseAuth();
    if (!auth.currentUser) {
      throw new Error("Sign in with Google to make charter changes.");
    }
  }

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

  async function handleSignOut() {
    setError(null);

    try {
      await signOut(getFirebaseAuth());
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : "Sign out failed.");
    }
  }

  function updateEditForm<K extends keyof BeamCharterDoc>(field: K, value: BeamCharterDoc[K]) {
    setEditForm((current) => ({ ...current, [field]: value }));
  }

  function updateNewInstitution<K extends keyof NewInstitutionFormState>(
    field: K,
    value: NewInstitutionFormState[K]
  ) {
    setNewInstitutionForm((current) => ({ ...current, [field]: value }));
  }

  function beginEdit(row: BeamCharterRow) {
    setEditingId(row.id);
    setExportOpenId(null);
    setEditForm({
      ...row,
      divisions: [...row.divisions],
    });
    setError(null);
    setSuccessMessage(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(createEmptyCharterDoc());
  }

  async function handleCreateInstitution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const slug = normalizeInstitutionSlug(newInstitutionForm.institutionSlug);
    if (!slug) {
      setError("Institution slug is required.");
      return;
    }
    if (!newInstitutionForm.institutionName.trim()) {
      setError("Institution name is required.");
      return;
    }

    setIsSaving(true);
    try {
      await requireSignedIn();

      if (charters.some((row) => row.id === slug)) {
        throw new Error(`A charter already exists for ${slug}.`);
      }

      const baseDoc = createEmptyCharterDoc(slug);
      const nextDoc: BeamCharterDoc = {
        ...baseDoc,
        institutionSlug: slug,
        institutionName: newInstitutionForm.institutionName.trim(),
        institutionCity: newInstitutionForm.institutionCity.trim(),
        rsoSystem: newInstitutionForm.rsoSystem.trim(),
        rsoSubmissionUrl: newInstitutionForm.rsoSubmissionUrl.trim(),
      };
      const completion = getCompletionChecklist(nextDoc);

      await setDoc(doc(getFirebaseDb(), CHARTER_COLLECTION, slug), {
        ...nextDoc,
        completionPercent: completion.completionPercent,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setIsCreatingInstitution(false);
      setNewInstitutionForm(INITIAL_NEW_INSTITUTION_FORM);
      setSuccessMessage(`Created a new charter record for ${nextDoc.institutionName}.`);
      await loadCharters();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create institution charter.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSeedUwm() {
    setError(null);
    setSuccessMessage(null);
    setIsSaving(true);

    try {
      await requireSignedIn();

      const seedDoc = createUwmSeedDoc();
      const completion = getCompletionChecklist(seedDoc);

      await setDoc(doc(getFirebaseDb(), CHARTER_COLLECTION, "uwm"), {
        ...seedDoc,
        completionPercent: completion.completionPercent,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSuccessMessage("Seeded the UWM charter starter document.");
      await loadCharters();
    } catch (seedError) {
      setError(seedError instanceof Error ? seedError.message : "Failed to seed the UWM charter.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId) return;

    setError(null);
    setSuccessMessage(null);
    setIsSaving(true);

    try {
      await requireSignedIn();

      const normalized = normalizeCharterDoc({ ...editForm, institutionSlug: editingId });
      const completion = getCompletionChecklist(normalized);

      await updateDoc(doc(getFirebaseDb(), CHARTER_COLLECTION, editingId), {
        institutionSlug: editingId,
        institutionName: normalized.institutionName,
        institutionCity: normalized.institutionCity,
        rsoSystem: normalized.rsoSystem,
        rsoSubmissionUrl: normalized.rsoSubmissionUrl,
        orgCategory: normalized.orgCategory,
        orgName: normalized.orgName,
        orgMission: normalized.orgMission,
        orgDescription: normalized.orgDescription,
        offCampusAffiliations: normalized.offCampusAffiliations,
        officer1Role: normalized.officer1Role,
        officer1Name: normalized.officer1Name,
        officer1Email: normalized.officer1Email,
        officer1Phone: normalized.officer1Phone,
        officer1StudentId: normalized.officer1StudentId,
        officer1Enrolled: normalized.officer1Enrolled,
        officer1Credits: normalized.officer1Credits,
        officer1ContractSigned: normalized.officer1ContractSigned,
        officer1TrainingComplete: normalized.officer1TrainingComplete,
        officer2Role: normalized.officer2Role,
        officer2Name: normalized.officer2Name,
        officer2Email: normalized.officer2Email,
        officer2Phone: normalized.officer2Phone,
        officer2StudentId: normalized.officer2StudentId,
        officer2Enrolled: normalized.officer2Enrolled,
        officer2Credits: normalized.officer2Credits,
        officer2ContractSigned: normalized.officer2ContractSigned,
        officer2TrainingComplete: normalized.officer2TrainingComplete,
        officer3Role: normalized.officer3Role,
        officer3Name: normalized.officer3Name,
        officer3Email: normalized.officer3Email,
        officer3Phone: normalized.officer3Phone,
        officer3StudentId: normalized.officer3StudentId,
        officer3Enrolled: normalized.officer3Enrolled,
        officer3Credits: normalized.officer3Credits,
        officer3ContractSigned: normalized.officer3ContractSigned,
        officer3TrainingComplete: normalized.officer3TrainingComplete,
        officer4Role: normalized.officer4Role,
        officer4Name: normalized.officer4Name,
        officer4Email: normalized.officer4Email,
        officer4Phone: normalized.officer4Phone,
        officer4StudentId: normalized.officer4StudentId,
        officer4Enrolled: normalized.officer4Enrolled,
        officer4Credits: normalized.officer4Credits,
        officer4ContractSigned: normalized.officer4ContractSigned,
        officer4TrainingComplete: normalized.officer4TrainingComplete,
        advisorName: normalized.advisorName,
        advisorTitle: normalized.advisorTitle,
        advisorDepartment: normalized.advisorDepartment,
        advisorOfficeLocation: normalized.advisorOfficeLocation,
        advisorEmail: normalized.advisorEmail,
        advisorPhone: normalized.advisorPhone,
        advisorSupervisorName: normalized.advisorSupervisorName,
        advisorSupervisorEmail: normalized.advisorSupervisorEmail,
        advisorContractSigned: normalized.advisorContractSigned,
        divisions: normalized.divisions,
        charterType: normalized.charterType,
        charterDocumentUrl: normalized.charterDocumentUrl,
        status: normalized.status,
        completionPercent: completion.completionPercent,
        notes: normalized.notes,
        submittedAt: normalized.submittedAt,
        updatedAt: serverTimestamp(),
      });

      setSuccessMessage(`Saved charter updates for ${normalized.institutionName || editingId}.`);
      setEditingId(null);
      await loadCharters();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save charter changes.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange(row: BeamCharterRow, status: CharterStatus) {
    setError(null);
    setSuccessMessage(null);
    setIsSaving(true);

    try {
      await requireSignedIn();

      const completion = getCompletionChecklist(row);
      if (status === "ready" && completion.completedCount < 6) {
        throw new Error("All 6 required sections must be complete before marking this charter ready.");
      }

      await updateDoc(doc(getFirebaseDb(), CHARTER_COLLECTION, row.id), {
        status,
        completionPercent: completion.completionPercent,
        updatedAt: serverTimestamp(),
        ...(status === "submitted" ? { submittedAt: serverTimestamp() } : {}),
      });

      setSuccessMessage(`Updated ${row.institutionName || row.id} to ${status}.`);
      await loadCharters();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Failed to update charter status.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCopyExport(row: BeamCharterRow) {
    try {
      await copyText(buildExportSummary(row));
      setCopiedExportId(row.id);
      window.setTimeout(() => setCopiedExportId((current) => (current === row.id ? null : current)), 1800);
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "Failed to copy export summary.");
    }
  }

  function renderOfficerEditor(prefix: OfficerPrefix, label: string) {
    const stringField = (suffix: string) => `${prefix}${suffix}` as keyof BeamCharterDoc;
    const booleanField = (suffix: string) => `${prefix}${suffix}` as keyof BeamCharterDoc;

    return (
      <section className="rounded-2xl border border-white/10 bg-black/20 p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Officer</p>
            <h3 className="mt-2 text-lg font-medium text-white">{label}</h3>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="text-white/70">Role</span>
            <input
              value={String(editForm[stringField("Role")] ?? "")}
              onChange={(event) => updateEditForm(stringField("Role"), event.target.value)}
              className={INPUT_CLASS}
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-white/70">Name</span>
            <input
              value={String(editForm[stringField("Name")] ?? "")}
              onChange={(event) => updateEditForm(stringField("Name"), event.target.value)}
              className={INPUT_CLASS}
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-white/70">Email</span>
            <input
              value={String(editForm[stringField("Email")] ?? "")}
              onChange={(event) => updateEditForm(stringField("Email"), event.target.value)}
              className={INPUT_CLASS}
              type="email"
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-white/70">Phone</span>
            <input
              value={String(editForm[stringField("Phone")] ?? "")}
              onChange={(event) => updateEditForm(stringField("Phone"), event.target.value)}
              className={INPUT_CLASS}
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-white/70">Student ID</span>
            <input
              value={String(editForm[stringField("StudentId")] ?? "")}
              onChange={(event) => updateEditForm(stringField("StudentId"), event.target.value)}
              className={INPUT_CLASS}
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-white/70">Credits</span>
            <input
              value={String(editForm[stringField("Credits")] ?? "")}
              onChange={(event) => updateEditForm(stringField("Credits"), event.target.value)}
              className={INPUT_CLASS}
            />
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#121317] px-3 py-3 text-sm text-white/80">
            <input
              type="checkbox"
              checked={Boolean(editForm[booleanField("Enrolled")])}
              onChange={(event) => updateEditForm(booleanField("Enrolled"), event.target.checked)}
            />
            Enrolled half-time
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#121317] px-3 py-3 text-sm text-white/80">
            <input
              type="checkbox"
              checked={Boolean(editForm[booleanField("ContractSigned")])}
              onChange={(event) => updateEditForm(booleanField("ContractSigned"), event.target.checked)}
            />
            Contract signed
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#121317] px-3 py-3 text-sm text-white/80 md:col-span-2">
            <input
              type="checkbox"
              checked={Boolean(editForm[booleanField("TrainingComplete")])}
              onChange={(event) => updateEditForm(booleanField("TrainingComplete"), event.target.checked)}
            />
            Training complete
          </label>
        </div>
      </section>
    );
  }

  const hasUwmDoc = charters.some((row) => row.id === "uwm");

  return (
    <main className="min-h-screen w-full bg-[#0e0e0e] text-white">
      <div className="mx-auto w-full max-w-7xl px-6 py-10 sm:px-8">
        <header className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.28em] text-white/50">Institutional Expansion</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Charter Onboarding</h1>
              <p className="mt-3 text-sm leading-7 text-white/70 sm:text-base">
                Track BEAM charter applications by institution, collect officer and advisor sections collaboratively,
                and export a ready-to-submit summary for PantherOrgs or equivalent campus systems.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-white/70">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">Admin auth</p>
              <p className="mt-3">
                Reads are visible without sign-in. Firestore writes on this page require an authenticated Google session.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => void handleGoogleSignIn()} className={ACTION_BUTTON_BASE}>
                  {isSignedIn ? "Signed in" : "Sign in with Google"}
                </button>
                {isSignedIn ? (
                  <button type="button" onClick={() => void handleSignOut()} className={ACTION_BUTTON_BASE}>
                    Sign out
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={() => void loadCharters()} className={ACTION_BUTTON_BASE}>
              {isLoading ? "Refreshing..." : "Refresh"}
            </button>
            <button
              type="button"
              onClick={() => setIsCreatingInstitution((current) => !current)}
              className={PRIMARY_BUTTON_BASE}
            >
              {isCreatingInstitution ? "Close New Institution" : "+ New Institution"}
            </button>
            {!hasUwmDoc ? (
              <button type="button" onClick={() => void handleSeedUwm()} className={ACTION_BUTTON_BASE} disabled={isSaving}>
                Seed UWM Charter
              </button>
            ) : null}
          </div>

          {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
          {successMessage ? <p className="mt-4 text-sm text-emerald-300">{successMessage}</p> : null}
        </header>

        {isCreatingInstitution ? (
          <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="mb-5">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">Create Institution</p>
              <h2 className="mt-2 text-2xl font-medium">Add a new charter record</h2>
            </div>

            <form onSubmit={handleCreateInstitution} className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="text-white/70">Institution name</span>
                <input
                  value={newInstitutionForm.institutionName}
                  onChange={(event) => updateNewInstitution("institutionName", event.target.value)}
                  className={INPUT_CLASS}
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="text-white/70">Institution city</span>
                <input
                  value={newInstitutionForm.institutionCity}
                  onChange={(event) => updateNewInstitution("institutionCity", event.target.value)}
                  className={INPUT_CLASS}
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="text-white/70">Slug</span>
                <input
                  value={newInstitutionForm.institutionSlug}
                  onChange={(event) => updateNewInstitution("institutionSlug", event.target.value)}
                  className={INPUT_CLASS}
                  placeholder="Example: marquette"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="text-white/70">RSO system</span>
                <input
                  value={newInstitutionForm.rsoSystem}
                  onChange={(event) => updateNewInstitution("rsoSystem", event.target.value)}
                  className={INPUT_CLASS}
                  placeholder="PantherOrgs"
                />
              </label>

              <label className="space-y-2 text-sm md:col-span-2">
                <span className="text-white/70">Submission URL</span>
                <input
                  value={newInstitutionForm.rsoSubmissionUrl}
                  onChange={(event) => updateNewInstitution("rsoSubmissionUrl", event.target.value)}
                  className={INPUT_CLASS}
                  placeholder="https://..."
                />
              </label>

              <div className="md:col-span-2 flex flex-wrap gap-3">
                <button type="submit" className={PRIMARY_BUTTON_BASE} disabled={isSaving}>
                  {isSaving ? "Creating..." : "Create Charter"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingInstitution(false);
                    setNewInstitutionForm(INITIAL_NEW_INSTITUTION_FORM);
                  }}
                  className={ACTION_BUTTON_BASE}
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        ) : null}

        <section className="mt-6 space-y-4">
          {charters.length === 0 && !isLoading ? (
            <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-white/70">
              No charter records found yet. Create a new institution or seed the UWM starter document.
            </article>
          ) : null}

          {charters.map((row) => {
            const completion = getCompletionChecklist(row);
            const exportSummary = buildExportSummary(row);
            const isEditing = editingId === row.id;
            const isExportOpen = exportOpenId === row.id;

            return (
              <article key={row.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-medium text-white">
                        {row.institutionName || formatInstitutionLabel(row.id)}
                      </h2>
                      <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/60">
                        {row.id}
                      </span>
                      <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${statusBadgeClass(row.status)}`}>
                        {row.status}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-white/65">
                      {row.institutionCity || "City pending"} · {row.rsoSystem || "RSO system pending"} ·{" "}
                      {row.rsoSubmissionUrl || "Submission URL pending"}
                    </p>

                    <div className="mt-5 max-w-xl">
                      <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-white/50">
                        <span>Completion</span>
                        <span>{completion.completionPercent}%</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-[var(--beam-gold)] transition-[width]"
                          style={{ width: `${completion.completionPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {[
                        { label: "President", complete: completion.president },
                        { label: "Vice President", complete: completion.vicePresident },
                        { label: "Treasurer", complete: completion.treasurer },
                        { label: "Secretary", complete: completion.secretary },
                        { label: "Faculty / Staff Advisor", complete: completion.advisor },
                        { label: "Org mission and description", complete: completion.mission },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/75"
                        >
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
                              item.complete
                                ? "border-[var(--beam-gold)] bg-[rgba(200,185,122,0.16)] text-[var(--beam-gold-bright)]"
                                : "border-white/20 text-white/40"
                            }`}
                          >
                            {item.complete ? "✓" : ""}
                          </span>
                          {item.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex w-full max-w-md flex-col gap-3">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
                      <p>Updated: {formatTimestamp(row.updatedAt)}</p>
                      <p className="mt-1">Submitted: {formatTimestamp(row.submittedAt)}</p>
                      <p className="mt-1">Charter type: {row.charterType}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => beginEdit(row)} className={ACTION_BUTTON_BASE}>
                        {isEditing ? "Editing" : "Edit"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setExportOpenId((current) => (current === row.id ? null : row.id))}
                        className={ACTION_BUTTON_BASE}
                      >
                        {isExportOpen ? "Hide Export" : "Export Summary"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleStatusChange(row, "collecting")}
                        className={ACTION_BUTTON_BASE}
                        disabled={isSaving}
                      >
                        Mark Collecting
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleStatusChange(row, "ready")}
                        className={ACTION_BUTTON_BASE}
                        disabled={isSaving || completion.completedCount < 6}
                      >
                        Mark Ready
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleStatusChange(row, "submitted")}
                        className={PRIMARY_BUTTON_BASE}
                        disabled={isSaving}
                      >
                        Mark Submitted
                      </button>
                    </div>
                  </div>
                </div>

                {isExportOpen ? (
                  <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-white/50">Export</p>
                        <h3 className="mt-2 text-lg font-medium">Ready-to-submit summary</h3>
                      </div>
                      <button type="button" onClick={() => void handleCopyExport(row)} className={PRIMARY_BUTTON_BASE}>
                        {copiedExportId === row.id ? "Copied" : "Copy Export"}
                      </button>
                    </div>
                    <textarea readOnly value={exportSummary} className={`${TEXTAREA_CLASS} mt-4 min-h-[420px]`} />
                  </div>
                ) : null}

                {isEditing ? (
                  <form onSubmit={handleSaveEdit} className="mt-6 space-y-5 rounded-2xl border border-white/10 bg-black/20 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-white/50">Inline Edit</p>
                        <h3 className="mt-2 text-lg font-medium">Full charter record</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="submit" className={PRIMARY_BUTTON_BASE} disabled={isSaving}>
                          {isSaving ? "Saving..." : "Save Charter"}
                        </button>
                        <button type="button" onClick={cancelEdit} className={ACTION_BUTTON_BASE}>
                          Cancel
                        </button>
                      </div>
                    </div>

                    <section className="rounded-2xl border border-white/10 bg-black/20 p-5">
                      <div className="mb-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-white/50">Institution Metadata</p>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-2 text-sm">
                          <span className="text-white/70">Institution slug</span>
                          <input value={editingId} readOnly className={`${INPUT_CLASS} opacity-80`} />
                        </label>

                        <label className="space-y-2 text-sm">
                          <span className="text-white/70">Institution name</span>
                          <input
                            value={editForm.institutionName}
                            onChange={(event) => updateEditForm("institutionName", event.target.value)}
                            className={INPUT_CLASS}
                          />
                        </label>

                        <label className="space-y-2 text-sm">
                          <span className="text-white/70">Institution city</span>
                          <input
                            value={editForm.institutionCity}
                            onChange={(event) => updateEditForm("institutionCity", event.target.value)}
                            className={INPUT_CLASS}
                          />
                        </label>

                        <label className="space-y-2 text-sm">
                          <span className="text-white/70">RSO system</span>
                          <input
                            value={editForm.rsoSystem}
                            onChange={(event) => updateEditForm("rsoSystem", event.target.value)}
                            className={INPUT_CLASS}
                          />
                        </label>

                        <label className="space-y-2 text-sm md:col-span-2">
                          <span className="text-white/70">Submission URL</span>
                          <input
                            value={editForm.rsoSubmissionUrl}
                            onChange={(event) => updateEditForm("rsoSubmissionUrl", event.target.value)}
                            className={INPUT_CLASS}
                          />
                        </label>
                      </div>
                    </section>

                    <section className="rounded-2xl border border-white/10 bg-black/20 p-5">
                      <div className="mb-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-white/50">Organization</p>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-2 text-sm">
                          <span className="text-white/70">Organization name</span>
                          <input
                            value={editForm.orgName}
                            onChange={(event) => updateEditForm("orgName", event.target.value)}
                            className={INPUT_CLASS}
                          />
                        </label>

                        <label className="space-y-2 text-sm">
                          <span className="text-white/70">Category</span>
                          <input
                            value={editForm.orgCategory}
                            onChange={(event) => updateEditForm("orgCategory", event.target.value)}
                            className={INPUT_CLASS}
                          />
                        </label>

                        <label className="space-y-2 text-sm md:col-span-2">
                          <span className="text-white/70">Mission</span>
                          <textarea
                            value={editForm.orgMission}
                            onChange={(event) => updateEditForm("orgMission", event.target.value)}
                            className={TEXTAREA_CLASS}
                          />
                        </label>

                        <label className="space-y-2 text-sm md:col-span-2">
                          <span className="text-white/70">Description</span>
                          <textarea
                            value={editForm.orgDescription}
                            onChange={(event) => updateEditForm("orgDescription", event.target.value)}
                            className={TEXTAREA_CLASS}
                          />
                        </label>

                        <label className="space-y-2 text-sm md:col-span-2">
                          <span className="text-white/70">Off-campus affiliations</span>
                          <textarea
                            value={editForm.offCampusAffiliations}
                            onChange={(event) => updateEditForm("offCampusAffiliations", event.target.value)}
                            className={TEXTAREA_CLASS}
                          />
                        </label>

                        <label className="space-y-2 text-sm md:col-span-2">
                          <span className="text-white/70">Divisions</span>
                          <textarea
                            value={editForm.divisions.join("\n")}
                            onChange={(event) =>
                              updateEditForm(
                                "divisions",
                                event.target.value
                                  .split(/\n|,/)
                                  .map((entry) => entry.trim())
                                  .filter(Boolean)
                              )
                            }
                            className={TEXTAREA_CLASS}
                            placeholder={"One per line\nor comma-separated"}
                          />
                        </label>
                      </div>
                    </section>

                    <div className="grid gap-5 xl:grid-cols-2">
                      {OFFICER_OPTIONS.map((officer) => renderOfficerEditor(officer.prefix, officer.label))}
                    </div>

                    <section className="rounded-2xl border border-white/10 bg-black/20 p-5">
                      <div className="mb-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-white/50">Advisor</p>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-2 text-sm">
                          <span className="text-white/70">Name</span>
                          <input
                            value={editForm.advisorName}
                            onChange={(event) => updateEditForm("advisorName", event.target.value)}
                            className={INPUT_CLASS}
                          />
                        </label>

                        <label className="space-y-2 text-sm">
                          <span className="text-white/70">Title</span>
                          <input
                            value={editForm.advisorTitle}
                            onChange={(event) => updateEditForm("advisorTitle", event.target.value)}
                            className={INPUT_CLASS}
                          />
                        </label>

                        <label className="space-y-2 text-sm">
                          <span className="text-white/70">Department</span>
                          <input
                            value={editForm.advisorDepartment}
                            onChange={(event) => updateEditForm("advisorDepartment", event.target.value)}
                            className={INPUT_CLASS}
                          />
                        </label>

                        <label className="space-y-2 text-sm">
                          <span className="text-white/70">Office location</span>
                          <input
                            value={editForm.advisorOfficeLocation}
                            onChange={(event) => updateEditForm("advisorOfficeLocation", event.target.value)}
                            className={INPUT_CLASS}
                          />
                        </label>

                        <label className="space-y-2 text-sm">
                          <span className="text-white/70">Email</span>
                          <input
                            value={editForm.advisorEmail}
                            onChange={(event) => updateEditForm("advisorEmail", event.target.value)}
                            className={INPUT_CLASS}
                            type="email"
                          />
                        </label>

                        <label className="space-y-2 text-sm">
                          <span className="text-white/70">Phone</span>
                          <input
                            value={editForm.advisorPhone}
                            onChange={(event) => updateEditForm("advisorPhone", event.target.value)}
                            className={INPUT_CLASS}
                          />
                        </label>

                        <label className="space-y-2 text-sm">
                          <span className="text-white/70">Supervisor name</span>
                          <input
                            value={editForm.advisorSupervisorName}
                            onChange={(event) => updateEditForm("advisorSupervisorName", event.target.value)}
                            className={INPUT_CLASS}
                          />
                        </label>

                        <label className="space-y-2 text-sm">
                          <span className="text-white/70">Supervisor email</span>
                          <input
                            value={editForm.advisorSupervisorEmail}
                            onChange={(event) => updateEditForm("advisorSupervisorEmail", event.target.value)}
                            className={INPUT_CLASS}
                            type="email"
                          />
                        </label>

                        <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#121317] px-3 py-3 text-sm text-white/80 md:col-span-2">
                          <input
                            type="checkbox"
                            checked={editForm.advisorContractSigned}
                            onChange={(event) => updateEditForm("advisorContractSigned", event.target.checked)}
                          />
                          Advisor contract signed
                        </label>
                      </div>
                    </section>

                    <section className="rounded-2xl border border-white/10 bg-black/20 p-5">
                      <div className="mb-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-white/50">Charter Record</p>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-2 text-sm">
                          <span className="text-white/70">Charter type</span>
                          <select
                            value={editForm.charterType}
                            onChange={(event) => updateEditForm("charterType", event.target.value as CharterType)}
                            className={INPUT_CLASS}
                          >
                            <option value="basic">basic</option>
                            <option value="standard">standard</option>
                          </select>
                        </label>

                        <label className="space-y-2 text-sm">
                          <span className="text-white/70">Status</span>
                          <select
                            value={editForm.status}
                            onChange={(event) => updateEditForm("status", event.target.value as CharterStatus)}
                            className={INPUT_CLASS}
                          >
                            <option value="draft">draft</option>
                            <option value="collecting">collecting</option>
                            <option value="ready">ready</option>
                            <option value="submitted">submitted</option>
                          </select>
                        </label>

                        <label className="space-y-2 text-sm md:col-span-2">
                          <span className="text-white/70">Charter document URL</span>
                          <input
                            value={editForm.charterDocumentUrl}
                            onChange={(event) => updateEditForm("charterDocumentUrl", event.target.value)}
                            className={INPUT_CLASS}
                          />
                        </label>

                        <label className="space-y-2 text-sm md:col-span-2">
                          <span className="text-white/70">Admin notes</span>
                          <textarea
                            value={editForm.notes}
                            onChange={(event) => updateEditForm("notes", event.target.value)}
                            className={TEXTAREA_CLASS}
                          />
                        </label>
                      </div>
                    </section>
                  </form>
                ) : null}
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
