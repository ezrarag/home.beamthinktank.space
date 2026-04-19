"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Timestamp, arrayUnion, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebaseClient";

type CharterStatus = "draft" | "collecting" | "ready" | "submitted";
type CharterType = "basic" | "standard";
type OfficerPrefix = "officer1" | "officer2" | "officer3" | "officer4";
type IntakeRole = "officer" | "advisor" | "suggesting-officer";

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

interface IntakeFormState {
  fullName: string;
  email: string;
  phone: string;
  role: IntakeRole;
  officerSlot: OfficerPrefix;
  enrolled: boolean;
  credits: string;
  studentId: string;
  serviceConfirmed: boolean;
  advisorTitle: string;
  advisorDepartment: string;
  advisorOfficeLocation: string;
  advisorSupervisorName: string;
  advisorSupervisorEmail: string;
  selectedDivisions: string[];
  otherDivision: string;
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

const CHARTER_COLLECTION = "beamCharters";
const STEP_LABELS = ["Who you are", "Your section", "Divisions", "Review"] as const;
const PUBLIC_INPUT_CLASS =
  "w-full rounded-2xl border border-[color:var(--beam-border)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--beam-text-primary)] outline-none transition placeholder:text-[var(--beam-text-secondary)]/70 focus:border-[var(--beam-gold)]";
const OFFICER_OPTIONS = [
  { prefix: "officer1", label: "President", description: "Primary student leader" },
  { prefix: "officer2", label: "Vice President", description: "Second officer of record" },
  { prefix: "officer3", label: "Treasurer", description: "Finance and budget contact" },
  { prefix: "officer4", label: "Secretary", description: "Records and coordination" },
] as const satisfies ReadonlyArray<{ prefix: OfficerPrefix; label: string; description: string }>;
const DIVISION_OPTIONS = [
  "Music / Orchestra",
  "Food",
  "Forge / Technology",
  "Finance / Accounting",
  "Architecture / Design",
  "Environment",
  "Transportation",
  "Research / Data",
  "Law (coming soon)",
] as const;
const INITIAL_FORM: IntakeFormState = {
  fullName: "",
  email: "",
  phone: "",
  role: "officer",
  officerSlot: "officer1",
  enrolled: false,
  credits: "",
  studentId: "",
  serviceConfirmed: false,
  advisorTitle: "",
  advisorDepartment: "",
  advisorOfficeLocation: "",
  advisorSupervisorName: "",
  advisorSupervisorEmail: "",
  selectedDivisions: [],
  otherDivision: "",
};

function normalizeInstitutionSlug(value: string | null): string {
  const normalized = String(value ?? "uwm")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || "uwm";
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

function getInstitutionEmailDomain(slug: string): string | null {
  if (slug === "uwm") return "uwm.edu";
  if (slug === "marquette") return "marquette.edu";
  return null;
}

function roleLabelForPrefix(prefix: OfficerPrefix): string {
  return OFFICER_OPTIONS.find((option) => option.prefix === prefix)?.label ?? "Officer";
}

function createEmptyCharterDoc(institutionSlug: string): BeamCharterDoc {
  const institutionName = formatInstitutionLabel(institutionSlug);

  return {
    institutionSlug,
    institutionName,
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

function mapCharterDoc(institutionSlug: string, source: Record<string, unknown> | undefined): BeamCharterDoc {
  const defaults = createEmptyCharterDoc(institutionSlug);
  const data = source ?? {};

  return {
    ...defaults,
    institutionSlug: typeof data.institutionSlug === "string" && data.institutionSlug.trim() ? data.institutionSlug : defaults.institutionSlug,
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
    divisions: Array.isArray(data.divisions) ? data.divisions.map((entry) => String(entry)).filter(Boolean) : defaults.divisions,
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

function toggleValue(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];
}

function mergeDivisions(existing: string[], selected: string[], otherDivision: string): string[] {
  const combined = [...existing, ...selected];
  const other = otherDivision.trim();
  if (other) combined.push(other);
  return [...new Set(combined.map((entry) => entry.trim()).filter(Boolean))];
}

function isValidInstitutionEmail(value: string, institutionSlug: string): boolean {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return false;
  const domain = getInstitutionEmailDomain(institutionSlug);
  if (!domain) return /\S+@\S+\.\S+/.test(trimmed);
  return trimmed.endsWith(`@${domain}`);
}

function formatTimestamp(value: Timestamp | null): string {
  if (!value) return "Not yet saved";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value.toDate());
}

async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

export default function CharterIntakePage() {
  const searchParams = useSearchParams();
  const institutionSlug = normalizeInstitutionSlug(searchParams.get("institution"));
  const [charter, setCharter] = useState<BeamCharterDoc>(createEmptyCharterDoc(institutionSlug));
  const [form, setForm] = useState<IntakeFormState>(INITIAL_FORM);
  const [currentStep, setCurrentStep] = useState(1);
  const [docExists, setDocExists] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCharter() {
      setIsLoading(true);
      setLoadError(null);
      setSaveError(null);
      setHasSubmitted(false);
      setSuccessMessage(null);
      setCurrentStep(1);

      try {
        const snapshot = await getDoc(doc(getFirebaseDb(), CHARTER_COLLECTION, institutionSlug));
        if (cancelled) return;

        if (snapshot.exists()) {
          setDocExists(true);
          setCharter(mapCharterDoc(institutionSlug, snapshot.data() as Record<string, unknown>));
        } else {
          setDocExists(false);
          setCharter(createEmptyCharterDoc(institutionSlug));
        }
        setForm(INITIAL_FORM);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Failed to load charter intake.");
          setCharter(createEmptyCharterDoc(institutionSlug));
          setDocExists(false);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadCharter();

    return () => {
      cancelled = true;
    };
  }, [institutionSlug]);

  const institutionName = charter.institutionName || formatInstitutionLabel(institutionSlug);
  const institutionLabel = institutionSlug.toUpperCase();
  const shareUrl =
    typeof window === "undefined"
      ? `/charter?institution=${institutionSlug}`
      : (() => {
          const url = new URL(window.location.href);
          url.searchParams.set("institution", institutionSlug);
          return url.toString();
        })();
  const completion = getCompletionChecklist(charter);
  const selectedOfficer = OFFICER_OPTIONS.find((option) => option.prefix === form.officerSlot) ?? OFFICER_OPTIONS[0];
  const reviewDivisions = mergeDivisions(charter.divisions, form.selectedDivisions, form.otherDivision);
  const emailDomain = getInstitutionEmailDomain(institutionSlug);

  function updateForm<K extends keyof IntakeFormState>(field: K, value: IntakeFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function validateStep(stepNumber: number): string | null {
    if (stepNumber === 1) {
      if (!form.fullName.trim()) return "Name is required.";
      if (!form.email.trim()) return "Email is required.";
      if (!form.phone.trim()) return "Phone is required.";
      if (!isValidInstitutionEmail(form.email, institutionSlug)) {
        if (emailDomain) return `Use your ${emailDomain} email for ${institutionLabel}.`;
        return "Enter a valid email address.";
      }
      if (form.role !== "advisor") {
        if (!form.officerSlot) return "Choose which officer slot this submission belongs to.";
        if (!form.enrolled) return "Officer submissions must confirm current half-time enrollment.";
        if (!form.credits.trim()) return "Enter the credits currently enrolled.";
      }
    }

    if (stepNumber === 2) {
      if (!form.serviceConfirmed) {
        return form.role === "advisor"
          ? `Please confirm you agree to serve as the advisor for BEAM at ${institutionName}.`
          : `Please confirm this ${selectedOfficer.label} section is being submitted for BEAM at ${institutionName}.`;
      }

      if (form.role === "advisor") {
        if (!form.advisorTitle.trim()) return "Advisor title is required.";
        if (!form.advisorDepartment.trim()) return "Advisor department is required.";
        if (!form.advisorOfficeLocation.trim()) return "Advisor office location is required.";
        if (institutionSlug === "uwm" && !form.advisorSupervisorName.trim()) return "Advisor supervisor name is required for UWM.";
        if (institutionSlug === "uwm" && !form.advisorSupervisorEmail.trim()) return "Advisor supervisor email is required for UWM.";
        if (form.advisorSupervisorEmail.trim() && !/\S+@\S+\.\S+/.test(form.advisorSupervisorEmail.trim())) {
          return "Advisor supervisor email must be valid.";
        }
      }
    }

    return null;
  }

  function validateAllSteps(): string | null {
    for (const stepNumber of [1, 2, 3]) {
      const error = validateStep(stepNumber);
      if (error) return error;
    }
    return null;
  }

  function buildWriteResult(saveThroughStep: number) {
    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
      completionPercent: 0,
      institutionSlug,
    };
    const nextCharterRecord = { ...charter } as Record<string, unknown>;
    const now = Timestamp.now();
    const trimmedName = form.fullName.trim();
    const trimmedEmail = form.email.trim();
    const trimmedPhone = form.phone.trim();
    nextCharterRecord.updatedAt = now;
    if (!docExists && !charter.createdAt) {
      payload.createdAt = serverTimestamp();
      nextCharterRecord.createdAt = now;
    }

    if (form.role === "advisor") {
      payload.advisorName = trimmedName;
      payload.advisorEmail = trimmedEmail;
      payload.advisorPhone = trimmedPhone;

      nextCharterRecord.advisorName = trimmedName;
      nextCharterRecord.advisorEmail = trimmedEmail;
      nextCharterRecord.advisorPhone = trimmedPhone;

      if (saveThroughStep >= 2) {
        payload.advisorTitle = form.advisorTitle.trim();
        payload.advisorDepartment = form.advisorDepartment.trim();
        payload.advisorOfficeLocation = form.advisorOfficeLocation.trim();
        payload.advisorSupervisorName = form.advisorSupervisorName.trim();
        payload.advisorSupervisorEmail = form.advisorSupervisorEmail.trim();

        nextCharterRecord.advisorTitle = form.advisorTitle.trim();
        nextCharterRecord.advisorDepartment = form.advisorDepartment.trim();
        nextCharterRecord.advisorOfficeLocation = form.advisorOfficeLocation.trim();
        nextCharterRecord.advisorSupervisorName = form.advisorSupervisorName.trim();
        nextCharterRecord.advisorSupervisorEmail = form.advisorSupervisorEmail.trim();
      }
    } else {
      const prefix = form.officerSlot;
      payload[`${prefix}Role`] = roleLabelForPrefix(prefix);
      payload[`${prefix}Name`] = trimmedName;
      payload[`${prefix}Email`] = trimmedEmail;
      payload[`${prefix}Phone`] = trimmedPhone;
      payload[`${prefix}Enrolled`] = form.enrolled;
      payload[`${prefix}Credits`] = form.credits.trim();

      nextCharterRecord[`${prefix}Role`] = roleLabelForPrefix(prefix);
      nextCharterRecord[`${prefix}Name`] = trimmedName;
      nextCharterRecord[`${prefix}Email`] = trimmedEmail;
      nextCharterRecord[`${prefix}Phone`] = trimmedPhone;
      nextCharterRecord[`${prefix}Enrolled`] = form.enrolled;
      nextCharterRecord[`${prefix}Credits`] = form.credits.trim();

      if (saveThroughStep >= 2) {
        payload[`${prefix}StudentId`] = form.studentId.trim();
        nextCharterRecord[`${prefix}StudentId`] = form.studentId.trim();
      }
    }

    if (saveThroughStep >= 3) {
      const mergedDivisions = mergeDivisions(charter.divisions, form.selectedDivisions, form.otherDivision);
      const addedDivisions = mergedDivisions.filter((division) => !charter.divisions.includes(division));

      if (addedDivisions.length > 0) {
        payload.divisions = arrayUnion(...addedDivisions);
      }
      nextCharterRecord.divisions = mergedDivisions;
    }

    const nextCharter = mapCharterDoc(institutionSlug, nextCharterRecord);
    const nextCompletion = getCompletionChecklist(nextCharter);
    nextCharter.completionPercent = nextCompletion.completionPercent;
    payload.completionPercent = nextCompletion.completionPercent;

    return {
      payload,
      nextCharter,
      completion: nextCompletion,
    };
  }

  async function persistProgress(markSubmitted: boolean): Promise<boolean> {
    setIsSaving(true);
    setSaveError(null);

    try {
      const { payload, nextCharter, completion: nextCompletion } = buildWriteResult(markSubmitted ? 4 : currentStep);

      // Public intake writes stay on the client intentionally. Keep Firestore rules tight enough
      // that unauthenticated users can only touch participant-safe charter fields.
      await setDoc(doc(getFirebaseDb(), CHARTER_COLLECTION, institutionSlug), payload, { merge: true });

      setCharter(nextCharter);
      setDocExists(true);
      if (markSubmitted) {
        setHasSubmitted(true);
        setSuccessMessage(
          `Your section is saved. ${nextCompletion.completedCount} of 6 required charter sections are now complete for ${institutionName}.`
        );
      }
      return true;
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save your charter section.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleNextStep() {
    const error = validateStep(currentStep);
    if (error) {
      setSaveError(error);
      return;
    }

    const saved = await persistProgress(false);
    if (!saved) return;

    setSuccessMessage(null);
    setCurrentStep((value) => Math.min(4, value + 1));
  }

  async function handleFinalSubmit() {
    const error = validateAllSteps();
    if (error) {
      setSaveError(error);
      return;
    }

    await persistProgress(true);
  }

  async function handleCopyShareLink() {
    try {
      await copyText(shareUrl);
      setCopiedShareLink(true);
      window.setTimeout(() => setCopiedShareLink(false), 1800);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to copy the charter link.");
    }
  }

  return (
    <main className="min-h-screen bg-[var(--beam-bg-base)] px-4 py-6 text-[var(--beam-text-primary)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="beam-card rounded-[30px] px-6 py-8 sm:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="beam-eyebrow">Institutional Charter Intake</p>
              <h1 className="beam-display mt-4 text-4xl sm:text-5xl">Build the BEAM charter for {institutionName}.</h1>
              <p className="mt-4 text-base leading-7 text-[var(--beam-text-secondary)]">
                Each officer or advisor can use this link to fill in their own section. The form saves into a shared
                charter record for {institutionName} as you go.
              </p>
            </div>

            <div className="rounded-[26px] border border-[color:var(--beam-border)] bg-[rgba(255,255,255,0.025)] px-5 py-4 text-sm text-[var(--beam-text-secondary)]">
              <p className="beam-eyebrow text-[var(--beam-gold)]">Institution</p>
              <p className="mt-2 text-lg text-[var(--beam-text-primary)]">
                {institutionName} <span className="text-[var(--beam-text-secondary)]">({institutionLabel})</span>
              </p>
              <p className="mt-2">RSO system: {charter.rsoSystem || "To be configured"}</p>
              <p className="mt-1">Charter type: {charter.charterType === "standard" ? "Standard" : "Basic"}</p>
            </div>
          </div>

          {!docExists && !isLoading ? (
            <div className="mt-6 rounded-[24px] border border-[var(--beam-gold)]/40 bg-[rgba(200,185,122,0.08)] px-5 py-4 text-sm text-[var(--beam-text-secondary)]">
              Starting a new charter for {institutionName}. The shared charter record will be created on your first save.
            </div>
          ) : null}

          {loadError ? <p className="mt-6 text-sm text-[#f3c6c6]">{loadError}</p> : null}
        </section>

        <section className="beam-card rounded-[30px] px-6 py-8 sm:px-8">
          <div className="flex flex-wrap gap-3">
            {STEP_LABELS.map((label, index) => {
              const stepNumber = index + 1;
              const isActive = stepNumber === currentStep;
              const isComplete = stepNumber < currentStep;
              return (
                <div
                  key={label}
                  className={`min-w-[150px] flex-1 rounded-[22px] border px-4 py-3 transition ${
                    isActive
                      ? "border-[var(--beam-gold)] bg-[rgba(200,185,122,0.12)]"
                      : isComplete
                        ? "border-[var(--beam-border)] bg-[rgba(255,255,255,0.045)]"
                        : "border-[var(--beam-border)] bg-[rgba(255,255,255,0.02)]"
                  }`}
                >
                  <p className="beam-eyebrow text-[var(--beam-gold)]">Step {stepNumber}</p>
                  <p className="mt-2 text-sm text-[var(--beam-text-primary)]">{label}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-[var(--beam-gold)] transition-[width]"
              style={{ width: `${(currentStep / STEP_LABELS.length) * 100}%` }}
            />
          </div>

          <div className="mt-8 space-y-6">
            {currentStep === 1 ? (
              <div className="space-y-5">
                <div>
                  <p className="beam-eyebrow">Step 1</p>
                  <h2 className="beam-display mt-3 text-3xl text-[var(--beam-text-primary)]">Who are you?</h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--beam-text-secondary)]">
                    Start with the person whose section is being submitted. For officer slots at institutions like UWM,
                    use the enrolled student&apos;s campus email.
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm text-[var(--beam-text-secondary)]">
                      {form.role === "suggesting-officer" ? "Officer candidate name" : "Name"} *
                    </span>
                    <input
                      value={form.fullName}
                      onChange={(event) => updateForm("fullName", event.target.value)}
                      className={PUBLIC_INPUT_CLASS}
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm text-[var(--beam-text-secondary)]">
                      {form.role === "suggesting-officer" ? "Officer candidate email" : "Email"} *
                    </span>
                    <input
                      value={form.email}
                      onChange={(event) => updateForm("email", event.target.value)}
                      className={PUBLIC_INPUT_CLASS}
                      type="email"
                      placeholder={emailDomain ? `name@${emailDomain}` : "name@school.edu"}
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm text-[var(--beam-text-secondary)]">
                      {form.role === "suggesting-officer" ? "Officer candidate phone" : "Phone"} *
                    </span>
                    <input
                      value={form.phone}
                      onChange={(event) => updateForm("phone", event.target.value)}
                      className={PUBLIC_INPUT_CLASS}
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm text-[var(--beam-text-secondary)]">Role *</span>
                    <select
                      value={form.role}
                      onChange={(event) => updateForm("role", event.target.value as IntakeRole)}
                      className={PUBLIC_INPUT_CLASS}
                    >
                      <option value="officer">I am an officer</option>
                      <option value="advisor">I am the faculty/staff advisor</option>
                      <option value="suggesting-officer">I am suggesting an officer</option>
                    </select>
                  </label>

                  {form.role !== "advisor" ? (
                    <>
                      <label className="space-y-2 md:col-span-2">
                        <span className="text-sm text-[var(--beam-text-secondary)]">Officer slot *</span>
                        <select
                          value={form.officerSlot}
                          onChange={(event) => updateForm("officerSlot", event.target.value as OfficerPrefix)}
                          className={PUBLIC_INPUT_CLASS}
                        >
                          {OFFICER_OPTIONS.map((option) => (
                            <option key={option.prefix} value={option.prefix}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="flex items-start gap-3 rounded-[24px] border border-[color:var(--beam-border)] bg-[rgba(255,255,255,0.025)] p-4 md:col-span-2">
                        <input
                          type="checkbox"
                          checked={form.enrolled}
                          onChange={(event) => updateForm("enrolled", event.target.checked)}
                          className="mt-1 h-4 w-4 rounded border-white/30 bg-transparent text-[var(--beam-gold)]"
                        />
                        <span className="text-sm leading-6 text-[var(--beam-text-secondary)]">
                          I confirm this student is currently enrolled at {institutionName} on a fee-paying basis at at
                          least half-time status.
                        </span>
                      </label>

                      <label className="space-y-2 md:col-span-2">
                        <span className="text-sm text-[var(--beam-text-secondary)]">Credits enrolled *</span>
                        <input
                          value={form.credits}
                          onChange={(event) => updateForm("credits", event.target.value)}
                          className={PUBLIC_INPUT_CLASS}
                          placeholder="Example: 4 graduate credits"
                        />
                      </label>
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}

            {currentStep === 2 ? (
              <div className="space-y-5">
                <div>
                  <p className="beam-eyebrow">Step 2</p>
                  <h2 className="beam-display mt-3 text-3xl text-[var(--beam-text-primary)]">
                    {form.role === "advisor" ? "Advisor details" : `${selectedOfficer.label} details`}
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--beam-text-secondary)]">
                    {form.role === "advisor"
                      ? "Provide the faculty or staff advisor details required by the institution."
                      : "This information fills the officer slot directly in the charter record. Training and contract steps happen through the campus RSO system after approval."}
                  </p>
                </div>

                {form.role === "advisor" ? (
                  <div className="grid gap-5 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm text-[var(--beam-text-secondary)]">Advisor title *</span>
                      <input
                        value={form.advisorTitle}
                        onChange={(event) => updateForm("advisorTitle", event.target.value)}
                        className={PUBLIC_INPUT_CLASS}
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm text-[var(--beam-text-secondary)]">Department *</span>
                      <input
                        value={form.advisorDepartment}
                        onChange={(event) => updateForm("advisorDepartment", event.target.value)}
                        className={PUBLIC_INPUT_CLASS}
                      />
                    </label>

                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm text-[var(--beam-text-secondary)]">Office location *</span>
                      <input
                        value={form.advisorOfficeLocation}
                        onChange={(event) => updateForm("advisorOfficeLocation", event.target.value)}
                        className={PUBLIC_INPUT_CLASS}
                        placeholder="Example: Engineering Building E300"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm text-[var(--beam-text-secondary)]">
                        Supervisor name {institutionSlug === "uwm" ? "*" : ""}
                      </span>
                      <input
                        value={form.advisorSupervisorName}
                        onChange={(event) => updateForm("advisorSupervisorName", event.target.value)}
                        className={PUBLIC_INPUT_CLASS}
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm text-[var(--beam-text-secondary)]">
                        Supervisor email {institutionSlug === "uwm" ? "*" : ""}
                      </span>
                      <input
                        value={form.advisorSupervisorEmail}
                        onChange={(event) => updateForm("advisorSupervisorEmail", event.target.value)}
                        className={PUBLIC_INPUT_CLASS}
                        type="email"
                      />
                    </label>

                    <label className="flex items-start gap-3 rounded-[24px] border border-[color:var(--beam-border)] bg-[rgba(255,255,255,0.025)] p-4 md:col-span-2">
                      <input
                        type="checkbox"
                        checked={form.serviceConfirmed}
                        onChange={(event) => updateForm("serviceConfirmed", event.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-white/30 bg-transparent text-[var(--beam-gold)]"
                      />
                      <span className="text-sm leading-6 text-[var(--beam-text-secondary)]">
                        I agree to serve as the faculty or staff advisor for BEAM at {institutionName}.
                      </span>
                    </label>
                  </div>
                ) : (
                  <div className="grid gap-5 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm text-[var(--beam-text-secondary)]">Officer slot</span>
                      <input value={selectedOfficer.label} readOnly className={`${PUBLIC_INPUT_CLASS} opacity-80`} />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm text-[var(--beam-text-secondary)]">Student ID</span>
                      <input
                        value={form.studentId}
                        onChange={(event) => updateForm("studentId", event.target.value)}
                        className={PUBLIC_INPUT_CLASS}
                        placeholder="Optional"
                      />
                    </label>

                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm text-[var(--beam-text-secondary)]">Credits enrolled</span>
                      <input
                        value={form.credits}
                        onChange={(event) => updateForm("credits", event.target.value)}
                        className={PUBLIC_INPUT_CLASS}
                      />
                    </label>

                    <label className="flex items-start gap-3 rounded-[24px] border border-[color:var(--beam-border)] bg-[rgba(255,255,255,0.025)] p-4 md:col-span-2">
                      <input
                        type="checkbox"
                        checked={form.serviceConfirmed}
                        onChange={(event) => updateForm("serviceConfirmed", event.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-white/30 bg-transparent text-[var(--beam-gold)]"
                      />
                      <span className="text-sm leading-6 text-[var(--beam-text-secondary)]">
                        {form.role === "suggesting-officer"
                          ? `I am submitting ${form.fullName || "this student"} for the ${selectedOfficer.label} role for BEAM at ${institutionName}.`
                          : `I agree to serve as ${selectedOfficer.label} for BEAM at ${institutionName}.`}
                      </span>
                    </label>

                    <div className="rounded-[24px] border border-[color:var(--beam-border)] bg-[rgba(255,255,255,0.025)] p-4 text-sm leading-6 text-[var(--beam-text-secondary)] md:col-span-2">
                      Officer training (Canvas module) and the officer contract will be completed through{" "}
                      {charter.rsoSystem || "the campus RSO system"} after the charter is accepted.
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {currentStep === 3 ? (
              <div className="space-y-5">
                <div>
                  <p className="beam-eyebrow">Step 3</p>
                  <h2 className="beam-display mt-3 text-3xl text-[var(--beam-text-primary)]">BEAM divisions you want to join</h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--beam-text-secondary)]">
                    Choose every division that fits. Your selections are added to the shared charter record without
                    overwriting other participants.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {DIVISION_OPTIONS.map((division) => (
                    <label
                      key={division}
                      className="flex items-start gap-3 rounded-[24px] border border-[color:var(--beam-border)] bg-[rgba(255,255,255,0.02)] p-4"
                    >
                      <input
                        type="checkbox"
                        checked={form.selectedDivisions.includes(division)}
                        onChange={() => updateForm("selectedDivisions", toggleValue(form.selectedDivisions, division))}
                        className="mt-1 h-4 w-4 rounded border-white/30 bg-transparent text-[var(--beam-gold)]"
                      />
                      <span className="text-sm text-[var(--beam-text-secondary)]">{division}</span>
                    </label>
                  ))}
                </div>

                <label className="space-y-2">
                  <span className="text-sm text-[var(--beam-text-secondary)]">Other division</span>
                  <input
                    value={form.otherDivision}
                    onChange={(event) => updateForm("otherDivision", event.target.value)}
                    className={PUBLIC_INPUT_CLASS}
                    placeholder="Add another working group if needed"
                  />
                </label>
              </div>
            ) : null}

            {currentStep === 4 ? (
              <div className="space-y-5">
                <div>
                  <p className="beam-eyebrow">Step 4</p>
                  <h2 className="beam-display mt-3 text-3xl text-[var(--beam-text-primary)]">Review and submit your section</h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--beam-text-secondary)]">
                    Review the exact section that will be merged into the shared charter record for {institutionName}.
                  </p>
                </div>

                <div className="rounded-[26px] border border-[var(--beam-gold)]/40 bg-[rgba(200,185,122,0.09)] px-5 py-4 text-sm leading-6 text-[var(--beam-text-secondary)]">
                  <p className="beam-eyebrow text-[var(--beam-gold)]">Important</p>
                  <p className="mt-2">
                    All four officer positions must be filled by currently enrolled students before this charter can be
                    submitted. Alumni and community members are welcome as members and advisors but cannot serve as
                    officers.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <article className="rounded-[26px] border border-[color:var(--beam-border)] bg-[rgba(255,255,255,0.02)] p-5">
                    <p className="beam-eyebrow">Contact</p>
                    <p className="mt-3 text-lg text-[var(--beam-text-primary)]">{form.fullName || "Not provided"}</p>
                    <p className="mt-2 text-sm text-[var(--beam-text-secondary)]">{form.email || "No email yet"}</p>
                    <p className="mt-1 text-sm text-[var(--beam-text-secondary)]">{form.phone || "No phone yet"}</p>
                  </article>

                  <article className="rounded-[26px] border border-[color:var(--beam-border)] bg-[rgba(255,255,255,0.02)] p-5">
                    <p className="beam-eyebrow">Section</p>
                    <p className="mt-3 text-lg text-[var(--beam-text-primary)]">
                      {form.role === "advisor" ? "Faculty / Staff Advisor" : selectedOfficer.label}
                    </p>
                    {form.role !== "advisor" ? (
                      <>
                        <p className="mt-2 text-sm text-[var(--beam-text-secondary)]">
                          Enrolled half-time: {form.enrolled ? "Yes" : "No"}
                        </p>
                        <p className="mt-1 text-sm text-[var(--beam-text-secondary)]">
                          Credits: {form.credits || "Not provided"}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="mt-2 text-sm text-[var(--beam-text-secondary)]">
                          {form.advisorTitle || "Advisor title not provided"}
                        </p>
                        <p className="mt-1 text-sm text-[var(--beam-text-secondary)]">
                          {form.advisorDepartment || "Department not provided"}
                        </p>
                      </>
                    )}
                  </article>

                  <article className="rounded-[26px] border border-[color:var(--beam-border)] bg-[rgba(255,255,255,0.02)] p-5 md:col-span-2">
                    <p className="beam-eyebrow">Divisions</p>
                    <p className="mt-3 text-sm leading-7 text-[var(--beam-text-secondary)]">
                      {reviewDivisions.length > 0 ? reviewDivisions.join(", ") : "No divisions selected yet."}
                    </p>
                  </article>
                </div>
              </div>
            ) : null}

            {saveError ? <p className="text-sm text-[#f3c6c6]">{saveError}</p> : null}
            {successMessage && !hasSubmitted ? <p className="text-sm text-[var(--beam-gold-bright)]">{successMessage}</p> : null}

            <div className="flex flex-wrap gap-3 pt-2">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    setSaveError(null);
                    setCurrentStep((value) => Math.max(1, value - 1));
                  }}
                  className="inline-flex rounded-full border border-[color:var(--beam-border)] px-5 py-3 text-xs uppercase tracking-[0.18em] text-[var(--beam-text-secondary)] transition hover:border-white/30 hover:text-[var(--beam-text-primary)]"
                >
                  Back
                </button>
              ) : null}

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={() => void handleNextStep()}
                  disabled={isSaving || isLoading}
                  className="inline-flex rounded-full bg-[var(--beam-gold)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-[var(--beam-gold-bright)] disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save and continue"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleFinalSubmit()}
                  disabled={isSaving || isLoading}
                  className="inline-flex rounded-full bg-[var(--beam-gold)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-[var(--beam-gold-bright)] disabled:opacity-50"
                >
                  {isSaving ? "Submitting..." : "Submit my section"}
                </button>
              )}
            </div>
          </div>
        </section>

        {hasSubmitted ? (
          <section className="beam-card rounded-[30px] px-6 py-8 sm:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <p className="beam-eyebrow">Shared Status</p>
                <h2 className="beam-display mt-4 text-3xl text-[var(--beam-text-primary)]">
                  Charter for {institutionLabel} — {completion.completedCount} of 6 required sections complete
                </h2>
                <p className="mt-3 text-sm leading-7 text-[var(--beam-text-secondary)]">
                  {successMessage}
                </p>
                <p className="mt-3 text-sm text-[var(--beam-text-secondary)]">
                  Last updated: {formatTimestamp(charter.updatedAt)}
                </p>
              </div>

              <div className="w-full max-w-xl rounded-[26px] border border-[color:var(--beam-border)] bg-[rgba(255,255,255,0.02)] p-5">
                <p className="beam-eyebrow text-[var(--beam-gold)]">Share this link</p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <input readOnly value={shareUrl} className={`${PUBLIC_INPUT_CLASS} flex-1`} />
                  <button
                    type="button"
                    onClick={() => void handleCopyShareLink()}
                    className="inline-flex rounded-full bg-[var(--beam-gold)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-[var(--beam-gold-bright)]"
                  >
                    {copiedShareLink ? "Copied" : "Copy link"}
                  </button>
                </div>
                <p className="mt-3 text-sm text-[var(--beam-text-secondary)]">
                  Send this URL to the remaining officers, the advisor, or whoever still needs to fill in their section.
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                  className="flex items-center gap-3 rounded-[22px] border border-[color:var(--beam-border)] bg-[rgba(255,255,255,0.02)] px-4 py-4"
                >
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
                      item.complete
                        ? "border-[var(--beam-gold)] bg-[rgba(200,185,122,0.14)] text-[var(--beam-gold-bright)]"
                        : "border-white/20 text-white/50"
                    }`}
                  >
                    {item.complete ? "✓" : ""}
                  </div>
                  <span className="text-sm text-[var(--beam-text-secondary)]">{item.label}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
