"use client";

import { FormEvent, type Dispatch, type SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  addDoc,
  collection,
  deleteField,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from "firebase/auth";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebaseClient";

type SubstrateType = "hard" | "soft";
type SubstrateStatus = "seed" | "forming" | "active" | "hardening" | "hard";
type SubstrateUrgency = "none" | "low" | "medium" | "high" | "critical";
type AssistantAction = "draft_message" | "generate_brief" | "suggest_next_action";
type RecipientType = "email" | "slack" | "text";

interface SubstrateItem {
  id: string;
  name: string;
  type: SubstrateType;
  category: string;
  description: string;
  status: SubstrateStatus;
  urgency: SubstrateUrgency;
  owner: string;
  contacts: string[];
  url?: string;
  nextAction: string;
  notes: string;
  tags: string[];
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

interface SubstrateFormState {
  name: string;
  type: SubstrateType;
  category: string;
  description: string;
  status: SubstrateStatus;
  urgency: SubstrateUrgency;
  owner: string;
  contactsInput: string;
  url: string;
  nextAction: string;
  notes: string;
  tagsInput: string;
}

const SUBSTRATE_COLLECTION = "beamSubstrate";
const ALL_ITEMS_OPTION = "__all__";
const ANTHROPIC_API_KEY = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY ?? process.env.NEXT_PUBLIC_CLAUDE_API_KEY ?? "";
const INPUT_CLASS =
  "w-full rounded-xl border border-white/10 bg-[#121317] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--beam-gold)]";
const TEXTAREA_CLASS =
  "min-h-28 w-full rounded-xl border border-white/10 bg-[#121317] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--beam-gold)]";
const FILTER_BUTTON_BASE =
  "rounded-full border px-4 py-2 text-xs uppercase tracking-[0.18em] transition";
const ACTION_BUTTON_BASE =
  "inline-flex rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:text-white disabled:opacity-50";
const PRIMARY_BUTTON_BASE =
  "rounded-full bg-[var(--beam-gold)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-[var(--beam-gold-bright)] disabled:opacity-50";

const ANTHROPIC_SYSTEM_PROMPT = `You are the BEAM Think Tank coordination intelligence. BEAM is a 501(c)(3) nonprofit network that places student and community cohorts on real projects across disciplines. Your job is to help the founder (Ezra Hauga) coordinate relationships, draft outreach messages, and identify what needs to happen next across BEAM's substrate - the network of hard assets (websites, legal entities, properties) and soft assets (active relationships, seeded projects, ongoing conversations) that make BEAM work.

Be concise, direct, and specific. When drafting messages, write in Ezra's voice: warm, visionary, specific, no corporate language. When generating briefs, prioritize by urgency and flag cascade dependencies. When suggesting next actions, be concrete - name the specific person, the specific ask, the specific deadline.`;

const INITIAL_FORM: SubstrateFormState = {
  name: "",
  type: "soft",
  category: "",
  description: "",
  status: "seed",
  urgency: "none",
  owner: "",
  contactsInput: "",
  url: "",
  nextAction: "",
  notes: "",
  tagsInput: "",
};

const SUBSTRATE_SEED: Array<Omit<SubstrateItem, "id" | "createdAt" | "updatedAt">> = [
  {
    name: "orchestra.beamthinktank.space",
    type: "hard",
    category: "NGO site",
    description:
      "Most mature BEAM NGO. Cinematic hero, Firebase auth, participant portal. Dr. Kim (faculty), Evan (horn). Active participant model running.",
    status: "hard",
    urgency: "none",
    owner: "Ezra",
    contacts: ["Dr. Kim", "Evan"],
    url: "https://orchestra.beamthinktank.space",
    nextAction: "Recruit first non-music participant via Jasmine referral.",
    notes: "",
    tags: ["music", "UWM", "cohort", "reference-implementation"],
  },
  {
    name: "grounds.beamthinktank.space",
    type: "hard",
    category: "NGO site",
    description:
      "Real estate acquisition NGO. Canonical ngoConfig + resolvePortalPath pattern. Property gallery, acquisition map, Milwaukee nodes seeded.",
    status: "hard",
    urgency: "none",
    owner: "Ezra",
    contacts: ["Bobby (UWM Foundation)"],
    url: "https://grounds.beamthinktank.space",
    nextAction:
      "Connect MPL bond-financing precedent (Emily Vieyra + Melissa Howard) to grounds acquisition model.",
    notes: "",
    tags: ["real-estate", "Milwaukee", "reference-implementation"],
  },
  {
    name: "forge.beamthinktank.space",
    type: "hard",
    category: "NGO site",
    description:
      "4 tracks: fintech, web dev, hardware/fabrication, IT. 5th track: Product Lab. EV station project lives here. Wired to Firebase Auth.",
    status: "active",
    urgency: "low",
    owner: "Ezra",
    contacts: ["William Krueger"],
    url: "https://forge.beamthinktank.space",
    nextAction: "Retrofit forge to use ngoConfig + resolvePortalPath pattern (currently missing this layer).",
    notes: "",
    tags: ["fabrication", "tech", "EV", "UWM-Waukesha"],
  },
  {
    name: "finance.beamthinktank.space",
    type: "hard",
    category: "NGO site",
    description:
      "Insurance, microfinance, underwriting. Accounting extension (VITA, EA). PaynePros / Nija as first client. beamfcu.com has 50+ signups.",
    status: "active",
    urgency: "medium",
    owner: "Ezra",
    contacts: ["Nija (PaynePros)", "Nathaniel (beamfcu.com)"],
    url: "https://finance.beamthinktank.space",
    nextAction:
      "Complete beamfcu.com migration to BEAM infrastructure. Matt insurance cohort contract needs sign-up list.",
    notes: "",
    tags: ["finance", "accounting", "credit-union", "VITA"],
  },
  {
    name: "transportation.beamthinktank.space",
    type: "hard",
    category: "NGO site",
    description:
      "Fleet gallery, dashboards, three-tier compensation. CJ (transportation). EV fleet model defined - needs first physical vehicle.",
    status: "active",
    urgency: "critical",
    owner: "Ezra",
    contacts: ["CJ"],
    url: "https://transportation.beamthinktank.space",
    nextAction:
      "Acquire one EV or hybrid vehicle under RAG fleet in Milwaukee. This unlocks every inter-city exchange conversation.",
    notes: "EV charging station grant application is the funding path for the full fleet. One vehicle now.",
    tags: ["fleet", "EV", "Milwaukee", "inter-city"],
  },
  {
    name: "environment.beamthinktank.space",
    type: "hard",
    category: "NGO site",
    description:
      "Jordan Harper / ClearTrace water compliance RegTech. NSF I-Corps. 4 cohort teams. Ben Uvaas (Wisconsin DNR), Milwaukee Waterworks.",
    status: "active",
    urgency: "high",
    owner: "Ezra",
    contacts: ["Jordan Harper", "Danielle (grant writer)", "Ben Uvaas (DNR)"],
    url: "https://environment.beamthinktank.space",
    nextAction: "Schedule three-way meeting: Ezra + Danielle + Jordan for GMF environmental grant cycle.",
    notes: "",
    tags: ["water", "compliance", "GMF", "NSF-I-Corps"],
  },
  {
    name: "food.beamthinktank.space",
    type: "hard",
    category: "NGO site",
    description:
      "5 tracks: juicing, fermentation, packaged goods, urban ag, food access. Firebase collections live. Dark stone + lime green aesthetic.",
    status: "active",
    urgency: "low",
    owner: "Ezra",
    contacts: [],
    url: "https://food.beamthinktank.space",
    nextAction: "Design first recurring food event at Central UMC with Katie Waddell as curatorial lead.",
    notes: "",
    tags: ["food", "Central-UMC", "Katie", "community"],
  },
  {
    name: "architecture.beamthinktank.space",
    type: "hard",
    category: "NGO site",
    description:
      "Central UMC pilot. William Krueger (Waukesha fabrication). 3 pre-seeded projects. Video production underway (5-beat arc).",
    status: "active",
    urgency: "low",
    owner: "Ezra",
    contacts: ["Rev. Viviane Thomas-Breitfeld", "William Krueger"],
    url: "https://architecture.beamthinktank.space",
    nextAction:
      "Finish Central UMC video (3 cuts). Distribute across architecture, grounds, transportation, forge, finance sites.",
    notes: "",
    tags: ["architecture", "Central-UMC", "video", "community"],
  },
  {
    name: "readyaimgo.biz",
    type: "hard",
    category: "For-profit operating arm",
    description:
      "Fleet gallery + admin. PIN-gated pitch deck with fleet-size financial slider. Milwaukee seed properties. RAG Firebase project has architectural debt (wrong Firestore).",
    status: "hardening",
    urgency: "high",
    owner: "Ezra",
    contacts: [],
    url: "https://readyaimgo.biz",
    nextAction:
      "Execute RAG Firebase migration: move readyaimgo-clients-temp to shared home-beam project. Codex session required.",
    notes: "CRITICAL: sync writes to wrong Firestore until migration done. Do not build further on sync until resolved.",
    tags: ["RAG", "fleet", "real-estate", "architecture-debt"],
  },
  {
    name: "beamthinktank.space (main)",
    type: "hard",
    category: "Public landing + intake",
    description:
      "Public landing page. Rotating policy findings. Network map. NGO intake at /join. RAG client portal. 4 city nodes seeded. Data module registry.",
    status: "active",
    urgency: "low",
    owner: "Ezra",
    contacts: [],
    url: "https://beamthinktank.space",
    nextAction: "Build module slug pages (/modules/housing etc.) routing policy data visitors to affiliated NGOs.",
    notes: "",
    tags: ["main", "public", "intake", "policy-data"],
  },
  {
    name: "Maia - La Macchia winner, first client",
    type: "soft",
    category: "Active client",
    description:
      "First external client through BEAM -> RAG pipeline. App/website/first account. Mid-April commitment. Time-sensitive.",
    status: "forming",
    urgency: "critical",
    owner: "Ezra",
    contacts: ["Maia"],
    nextAction: "Close the account this week. This is the proof of concept for the BEAM -> RAG client intake model.",
    notes: "",
    tags: ["client", "RAG", "proof-of-concept", "urgent"],
  },
  {
    name: "Jordan Harper / ClearTrace - water compliance",
    type: "soft",
    category: "Active NGO client",
    description:
      "Environmental NGO anchor client. NSF I-Corps startup. Water compliance RegTech. Three-way GMF meeting pending with Danielle.",
    status: "active",
    urgency: "high",
    owner: "Ezra",
    contacts: ["Jordan Harper", "Danielle (grant writer)", "Ben Uvaas (DNR)"],
    nextAction: "Set the GMF three-way meeting. Calendar invite: Ezra + Danielle + Jordan.",
    notes: "",
    tags: ["environment", "GMF", "NSF", "grant"],
  },
  {
    name: "Jasmine Salton - UWM SET",
    type: "soft",
    category: "Institutional partner / node coordinator candidate",
    description:
      "Center for Student Experience & Talent. SET has IR data access, employer partner network, student advising. Monday 9am meeting confirmed. Ben Trager is her director.",
    status: "forming",
    urgency: "high",
    owner: "Ezra",
    contacts: ["jsalton@uwm.edu", "btrager@uwm.edu"],
    url: "https://uwm.edu/set/people/salton-jasmine/",
    nextAction:
      "Monday 9am: get IR data request committed (Black CFA enrollment + Chinese international student count). Send three-door email after meeting.",
    notes:
      "If/then rules sent. She has appetite to self-select. Do not over-assign. One committed IR request is the success metric for Monday.",
    tags: ["UWM", "SET", "data", "node-coordinator", "Monday"],
  },
  {
    name: "Katie Waddell - UWM C21",
    type: "soft",
    category: "Curatorial partner / event programming",
    description:
      "C21 Managing Director. Dual-MA from School of Art Institute Chicago. Ran 2nd Floor Rear (2012-2017) - DIY arts festival for institutionally excluded artists. Now manages C21 fund development. Meeting May 7.",
    status: "seed",
    urgency: "medium",
    owner: "Ezra",
    contacts: ["waddelke@uwm.edu"],
    url: "https://uwm.edu/c21/about/staff/katie-waddell/",
    nextAction:
      "Send pre-meeting email. May 7: open with her fundraising problem, ask the 2nd Floor Rear question, leave one-page if/then rules.",
    notes: "She already built BEAM once (2nd Floor Rear). She just didn't have the substrate. BEAM is the substrate.",
    tags: ["C21", "arts", "UWM", "SAIC", "May-7", "events"],
  },
  {
    name: "Dr. Zinck + retirement home recitals",
    type: "soft",
    category: "Music faculty / venue relationship",
    description:
      "Violin professor. Weekly retirement home recitals. Adjacent church piano. Two Brazilian graduate students in studio. Brazilian consulate thread.",
    status: "seed",
    urgency: "medium",
    owner: "Ezra",
    contacts: ["Dr. Zinck (UWM Music)"],
    nextAction:
      "Send the Dr. Zinck email this week. Propose BEAM production layer around his existing recital series. Do not name him as sponsor.",
    notes:
      "Keep informal - political visibility concern is valid. He is a connector and project source, not a board member.",
    tags: ["music", "violin", "Brazil", "consulate", "recording"],
  },
  {
    name: "Chinese violin student - broken instrument",
    type: "soft",
    category: "Solidarity fund activation",
    description:
      "UWM undergraduate string student from China. Violin repair estimate: $1,000. First solidarity fund activation. Entry point for Chinese consulate (Chicago) pitch.",
    status: "forming",
    urgency: "critical",
    owner: "Ezra",
    contacts: ["Chinese Consulate General Chicago - chicago@csm.mfa.gov.cn"],
    nextAction:
      "Open instrument recovery fund (restricted account in BEAM 501c3). Make the first grant. Document it. This is the consulate pitch anchor story.",
    notes:
      "Luthier exchange program with China is downstream. Start with the repair. One student, one instrument, one fund.",
    tags: ["solidarity-fund", "China", "consulate", "instrument", "urgent"],
  },
  {
    name: "UWM Foundation - Bobby, Jessica, Haley",
    type: "soft",
    category: "Real estate + grant pipeline",
    description:
      "Bobby (real estate), Jessica (grants/research), Haley (intake). Bond financing + ground lease structure modeled. Mixed-use building model ready to pitch.",
    status: "active",
    urgency: "low",
    owner: "Ezra",
    contacts: ["Bobby (UWM Foundation)", "Jessica (UWM Foundation)", "Haley (UWM Foundation)"],
    nextAction:
      "Connect MPL bond-financing precedent to foundation pitch. Emily Vieyra + Melissa Howard at MPL are the precedent holders.",
    notes: "",
    tags: ["real-estate", "grants", "UWM-Foundation", "bond-financing"],
  },
  {
    name: "Central UMC - Rev. Viviane Thomas-Breitfeld",
    type: "soft",
    category: "Community anchor / event venue",
    description:
      "Active pilot project. Footage in production. First-person rooftop/interior + congregation interviews. Architecture, grounds, transportation, forge, finance all have roles here.",
    status: "active",
    urgency: "medium",
    owner: "Ezra",
    contacts: ["Rev. Viviane Thomas-Breitfeld"],
    nextAction: "Finish the 3-cut video. Design first recurring BEAM event here with Katie Waddell as curator.",
    notes: "Community anchor for hybrid space model. Katie + Central UMC + food + orchestra = the first full BEAM event.",
    tags: ["Central-UMC", "video", "community", "hybrid-space", "Katie"],
  },
];

function statusBadgeClass(status: SubstrateStatus): string {
  if (status === "hard") {
    return "border-[var(--beam-gold)] bg-[rgba(200,185,122,0.14)] text-[var(--beam-gold-bright)]";
  }
  if (status === "hardening") {
    return "border-blue-400/30 bg-blue-500/10 text-blue-200";
  }
  if (status === "active") {
    return "border-teal-400/30 bg-teal-500/10 text-teal-200";
  }
  if (status === "forming") {
    return "border-amber-400/30 bg-amber-500/10 text-amber-200";
  }
  return "border-white/10 bg-white/5 text-white/55";
}

function urgencyBorderClass(urgency: SubstrateUrgency): string {
  if (urgency === "critical") return "border-l-red-500";
  if (urgency === "high") return "border-l-orange-500";
  if (urgency === "medium") return "border-l-amber-500";
  if (urgency === "low") return "border-l-white/20";
  return "border-l-transparent";
}

function typeBadgeClass(type: SubstrateType): string {
  if (type === "hard") {
    return "border-[var(--beam-gold)] bg-[rgba(200,185,122,0.08)] text-[var(--beam-gold-bright)]";
  }
  return "border-white/10 bg-white/5 text-white/60";
}

function filterButtonClass(isActive: boolean): string {
  return isActive
    ? `${FILTER_BUTTON_BASE} border-[var(--beam-gold)] bg-[rgba(200,185,122,0.14)] text-[var(--beam-gold-bright)]`
    : `${FILTER_BUTTON_BASE} border-white/10 bg-white/5 text-white/65 hover:border-white/30 hover:text-white`;
}

function isValidAbsoluteHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function parseDelimitedList(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function toFormState(item?: SubstrateItem): SubstrateFormState {
  if (!item) return { ...INITIAL_FORM };
  return {
    name: item.name,
    type: item.type,
    category: item.category,
    description: item.description,
    status: item.status,
    urgency: item.urgency,
    owner: item.owner,
    contactsInput: item.contacts.join("\n"),
    url: item.url ?? "",
    nextAction: item.nextAction,
    notes: item.notes,
    tagsInput: item.tags.join(", "),
  };
}

function mapSubstrateDoc(snapshot: QueryDocumentSnapshot<DocumentData>): SubstrateItem {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    name: String(data.name ?? ""),
    type: data.type === "hard" ? "hard" : "soft",
    category: String(data.category ?? ""),
    description: String(data.description ?? ""),
    status:
      data.status === "hard"
        ? "hard"
        : data.status === "hardening"
          ? "hardening"
          : data.status === "active"
            ? "active"
            : data.status === "forming"
              ? "forming"
              : "seed",
    urgency:
      data.urgency === "critical"
        ? "critical"
        : data.urgency === "high"
          ? "high"
          : data.urgency === "medium"
            ? "medium"
            : data.urgency === "low"
              ? "low"
              : "none",
    owner: String(data.owner ?? ""),
    contacts: Array.isArray(data.contacts)
      ? data.contacts.map((entry: unknown) => String(entry)).filter(Boolean)
      : [],
    url: typeof data.url === "string" && data.url.trim() ? data.url : undefined,
    nextAction: String(data.nextAction ?? ""),
    notes: String(data.notes ?? ""),
    tags: Array.isArray(data.tags) ? data.tags.map((entry: unknown) => String(entry)).filter(Boolean) : [],
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt : null,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt : null,
  };
}

function validateForm(form: SubstrateFormState): string | null {
  if (!form.name.trim()) return "Name is required.";
  if (!form.category.trim()) return "Category is required.";
  if (!form.description.trim()) return "Description is required.";
  if (!form.owner.trim()) return "Owner is required.";
  if (!form.nextAction.trim()) return "Next action is required.";
  if (form.url.trim() && !isValidAbsoluteHttpUrl(form.url.trim())) {
    return "URL must be an absolute http/https link.";
  }
  return null;
}

function buildBasePayload(form: SubstrateFormState) {
  return {
    name: form.name.trim(),
    type: form.type,
    category: form.category.trim(),
    description: form.description.trim(),
    status: form.status,
    urgency: form.urgency,
    owner: form.owner.trim(),
    contacts: parseDelimitedList(form.contactsInput),
    nextAction: form.nextAction.trim(),
    notes: form.notes.trim(),
    tags: parseDelimitedList(form.tagsInput),
  };
}

function renderSubstrateFormFields(
  form: SubstrateFormState,
  setForm: Dispatch<SetStateAction<SubstrateFormState>>,
  fieldIdPrefix: string
) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="space-y-2 text-sm">
        <span className="text-white/70">Name</span>
        <input
          id={`${fieldIdPrefix}-name`}
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          className={INPUT_CLASS}
        />
      </label>

      <label className="space-y-2 text-sm">
        <span className="text-white/70">Type</span>
        <select
          id={`${fieldIdPrefix}-type`}
          value={form.type}
          onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as SubstrateType }))}
          className={INPUT_CLASS}
        >
          <option value="hard">hard</option>
          <option value="soft">soft</option>
        </select>
      </label>

      <label className="space-y-2 text-sm">
        <span className="text-white/70">Category</span>
        <input
          id={`${fieldIdPrefix}-category`}
          value={form.category}
          onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
          className={INPUT_CLASS}
        />
      </label>

      <label className="space-y-2 text-sm">
        <span className="text-white/70">Owner</span>
        <input
          id={`${fieldIdPrefix}-owner`}
          value={form.owner}
          onChange={(event) => setForm((current) => ({ ...current, owner: event.target.value }))}
          className={INPUT_CLASS}
        />
      </label>

      <label className="space-y-2 text-sm">
        <span className="text-white/70">Status</span>
        <select
          id={`${fieldIdPrefix}-status`}
          value={form.status}
          onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as SubstrateStatus }))}
          className={INPUT_CLASS}
        >
          <option value="seed">seed</option>
          <option value="forming">forming</option>
          <option value="active">active</option>
          <option value="hardening">hardening</option>
          <option value="hard">hard</option>
        </select>
      </label>

      <label className="space-y-2 text-sm">
        <span className="text-white/70">Urgency</span>
        <select
          id={`${fieldIdPrefix}-urgency`}
          value={form.urgency}
          onChange={(event) => setForm((current) => ({ ...current, urgency: event.target.value as SubstrateUrgency }))}
          className={INPUT_CLASS}
        >
          <option value="none">none</option>
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
          <option value="critical">critical</option>
        </select>
      </label>

      <label className="space-y-2 text-sm md:col-span-2">
        <span className="text-white/70">Description</span>
        <textarea
          id={`${fieldIdPrefix}-description`}
          value={form.description}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          className={TEXTAREA_CLASS}
        />
      </label>

      <label className="space-y-2 text-sm md:col-span-2">
        <span className="text-white/70">Contacts</span>
        <textarea
          id={`${fieldIdPrefix}-contacts`}
          value={form.contactsInput}
          onChange={(event) => setForm((current) => ({ ...current, contactsInput: event.target.value }))}
          className={TEXTAREA_CLASS}
          placeholder={"one per line\nor comma-separated"}
        />
        <p className="text-xs text-white/45">One per line is easiest to scan. Commas also work.</p>
      </label>

      <label className="space-y-2 text-sm md:col-span-2">
        <span className="text-white/70">URL</span>
        <input
          id={`${fieldIdPrefix}-url`}
          value={form.url}
          onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))}
          className={INPUT_CLASS}
          placeholder="https://example.com"
        />
      </label>

      <label className="space-y-2 text-sm md:col-span-2">
        <span className="text-white/70">Next action</span>
        <textarea
          id={`${fieldIdPrefix}-next-action`}
          value={form.nextAction}
          onChange={(event) => setForm((current) => ({ ...current, nextAction: event.target.value }))}
          className={TEXTAREA_CLASS}
        />
      </label>

      <label className="space-y-2 text-sm md:col-span-2">
        <span className="text-white/70">Notes</span>
        <textarea
          id={`${fieldIdPrefix}-notes`}
          value={form.notes}
          onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
          className={TEXTAREA_CLASS}
        />
      </label>

      <label className="space-y-2 text-sm md:col-span-2">
        <span className="text-white/70">Tags</span>
        <input
          id={`${fieldIdPrefix}-tags`}
          value={form.tagsInput}
          onChange={(event) => setForm((current) => ({ ...current, tagsInput: event.target.value }))}
          className={INPUT_CLASS}
          placeholder="music, UWM, cohort"
        />
      </label>
    </div>
  );
}

function buildAssistantPrompt(params: {
  action: AssistantAction;
  recipientType: RecipientType;
  focusItem: SubstrateItem | null;
  items: SubstrateItem[];
}): string {
  const { action, recipientType, focusItem, items } = params;

  if (action === "draft_message") {
    return [
      `Action: Draft message`,
      `Recipient type: ${recipientType}`,
      "",
      "Draft the next outreach message for the focus item below. Use the nextAction, contacts, notes, and surrounding substrate context. If multiple contacts are listed, choose the most relevant person and make that choice explicit in the draft heading.",
      "",
      "Focus item JSON:",
      JSON.stringify(focusItem, null, 2),
      "",
      "Current substrate JSON:",
      JSON.stringify(items, null, 2),
    ].join("\n");
  }

  if (action === "suggest_next_action") {
    return [
      `Action: Suggest next action`,
      "",
      "Propose a sharper replacement for the focus item's nextAction. Keep it concrete. Name the person, the ask, and the deadline. Then provide a one-sentence rationale based on surrounding dependencies.",
      "",
      "Focus item JSON:",
      JSON.stringify(focusItem, null, 2),
      "",
      "Current substrate JSON:",
      JSON.stringify(items, null, 2),
    ].join("\n");
  }

  return [
    "Action: Generate coordination brief",
    "",
    "Summarize the current state of all substrate items by urgency, flag what needs to happen this week, and identify cascade dependencies. Keep the structure compact and operational.",
    "",
    "Current substrate JSON:",
    JSON.stringify(items, null, 2),
  ].join("\n");
}

async function readAnthropicStream(
  response: Response,
  onTextDelta: (delta: string) => void
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Anthropic streaming response was unavailable.");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      buffer += decoder.decode();
    } else if (value) {
      buffer += decoder.decode(value, { stream: true });
    }

    buffer = buffer.replace(/\r\n/g, "\n");

    let boundaryIndex = buffer.indexOf("\n\n");
    while (boundaryIndex !== -1) {
      const rawEvent = buffer.slice(0, boundaryIndex).trim();
      buffer = buffer.slice(boundaryIndex + 2);
      boundaryIndex = buffer.indexOf("\n\n");

      if (!rawEvent) continue;

      const data = rawEvent
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");

      if (!data || data === "[DONE]") continue;

      let parsed: {
        type?: string;
        delta?: { type?: string; text?: string };
        content_block?: { type?: string; text?: string };
        error?: { message?: string };
      };

      try {
        parsed = JSON.parse(data) as {
          type?: string;
          delta?: { type?: string; text?: string };
          content_block?: { type?: string; text?: string };
          error?: { message?: string };
        };
      } catch {
        continue;
      }

      if (parsed.type === "content_block_start" && parsed.content_block?.type === "text" && parsed.content_block.text) {
        onTextDelta(parsed.content_block.text);
      }

      if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta" && parsed.delta.text) {
        onTextDelta(parsed.delta.text);
      }

      if (parsed.type === "error") {
        throw new Error(parsed.error?.message || "Anthropic request failed.");
      }
    }

    if (done) break;
  }
}

async function getAnthropicErrorMessage(response: Response): Promise<string> {
  const fallback = `Anthropic request failed (${response.status}).`;
  const rawText = await response.text().catch(() => "");
  if (!rawText) return fallback;

  try {
    const payload = JSON.parse(rawText) as { error?: { message?: string } };
    return payload.error?.message || fallback;
  } catch {
    return rawText;
  }
}

export default function AdminSubstratePage() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedCollection, setHasLoadedCollection] = useState(false);
  const [items, setItems] = useState<SubstrateItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<SubstrateFormState>(INITIAL_FORM);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newForm, setNewForm] = useState<SubstrateFormState>(INITIAL_FORM);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [typeFilter, setTypeFilter] = useState<SubstrateType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<SubstrateStatus | "all">("all");
  const [urgencyFilter, setUrgencyFilter] = useState<SubstrateUrgency | "all">("all");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [assistantTargetId, setAssistantTargetId] = useState<string>(ALL_ITEMS_OPTION);
  const [assistantAction, setAssistantAction] = useState<AssistantAction>("generate_brief");
  const [recipientType, setRecipientType] = useState<RecipientType>("email");
  const [assistantResult, setAssistantResult] = useState("");
  const [assistantError, setAssistantError] = useState<string | null>(null);
  const [assistantStatus, setAssistantStatus] = useState<string | null>(null);
  const [isAskingAssistant, setIsAskingAssistant] = useState(false);

  useEffect(() => {
    try {
      const auth = getFirebaseAuth();
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setIsSignedIn(Boolean(user));
        setAuthReady(true);
        if (!user) {
          setItems([]);
          setHasLoadedCollection(false);
          setEditingId(null);
        }
      });
      return unsubscribe;
    } catch {
      setIsSignedIn(false);
      setAuthReady(true);
      return undefined;
    }
  }, []);

  useEffect(() => {
    if (assistantAction === "generate_brief") {
      if (assistantTargetId !== ALL_ITEMS_OPTION) {
        setAssistantTargetId(ALL_ITEMS_OPTION);
      }
      return;
    }

    if (assistantTargetId === ALL_ITEMS_OPTION && items[0]) {
      setAssistantTargetId(items[0].id);
    }
  }, [assistantAction, assistantTargetId, items]);

  useEffect(() => {
    if (assistantTargetId === ALL_ITEMS_OPTION) return;
    if (items.some((item) => item.id === assistantTargetId)) return;
    setAssistantTargetId(assistantAction === "generate_brief" ? ALL_ITEMS_OPTION : items[0]?.id ?? ALL_ITEMS_OPTION);
  }, [assistantAction, assistantTargetId, items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (urgencyFilter !== "all" && item.urgency !== urgencyFilter) return false;
      return true;
    });
  }, [items, statusFilter, typeFilter, urgencyFilter]);

  const selectedAssistantItem =
    assistantTargetId === ALL_ITEMS_OPTION ? null : items.find((item) => item.id === assistantTargetId) ?? null;

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
    setSuccessMessage(null);

    try {
      await signOut(getFirebaseAuth());
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : "Sign out failed.");
    }
  }

  const requireSignedIn = useCallback(() => {
    const currentUser = getFirebaseAuth().currentUser;
    if (!currentUser) {
      throw new Error("Sign in with Google before reading or writing substrate data.");
    }
    return currentUser;
  }, []);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      requireSignedIn();
      const substrateQuery = query(collection(getFirebaseDb(), SUBSTRATE_COLLECTION), orderBy("updatedAt", "desc"));
      const snapshot = await getDocs(substrateQuery);
      const nextItems = snapshot.docs.map(mapSubstrateDoc);
      setItems(nextItems);
      setHasLoadedCollection(true);

      if (editingId) {
        const matchingItem = nextItems.find((item) => item.id === editingId);
        if (matchingItem) {
          setEditForm(toFormState(matchingItem));
        } else {
          setEditingId(null);
          setEditForm(INITIAL_FORM);
        }
      }
    } catch (loadError) {
      setHasLoadedCollection(false);
      setItems([]);
      setError(loadError instanceof Error ? loadError.message : "Failed to load substrate items.");
    } finally {
      setIsLoading(false);
    }
  }, [editingId, requireSignedIn]);

  useEffect(() => {
    if (!authReady || !isSignedIn) return;
    void loadItems();
  }, [authReady, isSignedIn, loadItems]);

  function beginEdit(item: SubstrateItem) {
    setEditingId(item.id);
    setEditForm(toFormState(item));
    setIsAddOpen(false);
    setError(null);
    setSuccessMessage(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(INITIAL_FORM);
  }

  async function handleCreateItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const validationError = validateForm(newForm);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsCreating(true);

    try {
      requireSignedIn();
      const basePayload = buildBasePayload(newForm);
      await addDoc(collection(getFirebaseDb(), SUBSTRATE_COLLECTION), {
        ...basePayload,
        ...(newForm.url.trim() ? { url: newForm.url.trim() } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setNewForm(INITIAL_FORM);
      setIsAddOpen(false);
      setSuccessMessage("Substrate item created.");
      await loadItems();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create substrate item.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleSaveEdit(itemId: string) {
    setError(null);
    setSuccessMessage(null);

    const validationError = validateForm(editForm);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSavingId(itemId);

    try {
      requireSignedIn();
      const basePayload = buildBasePayload(editForm);
      await updateDoc(doc(getFirebaseDb(), SUBSTRATE_COLLECTION, itemId), {
        ...basePayload,
        url: editForm.url.trim() ? editForm.url.trim() : deleteField(),
        updatedAt: serverTimestamp(),
      });
      setSuccessMessage("Substrate item saved.");
      cancelEdit();
      await loadItems();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save substrate item.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleSeedSubstrate() {
    setError(null);
    setSuccessMessage(null);
    setIsSeeding(true);

    try {
      requireSignedIn();
      const db = getFirebaseDb();
      const collectionRef = collection(db, SUBSTRATE_COLLECTION);
      const existingDocs = await getDocs(collectionRef);
      if (!existingDocs.empty) {
        setSuccessMessage("Substrate collection already has items.");
        await loadItems();
        return;
      }

      const batch = writeBatch(db);
      for (const seedItem of SUBSTRATE_SEED) {
        const docRef = doc(collectionRef);
        batch.set(docRef, {
          ...seedItem,
          ...(seedItem.url ? { url: seedItem.url } : {}),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();
      setSuccessMessage("Seed substrate completed.");
      await loadItems();
    } catch (seedError) {
      setError(seedError instanceof Error ? seedError.message : "Failed to seed substrate collection.");
    } finally {
      setIsSeeding(false);
    }
  }

  async function handleAskBeamAi() {
    setAssistantError(null);
    setAssistantStatus(null);
    setAssistantResult("");
    setIsAskingAssistant(true);

    try {
      if (!items.length) {
        throw new Error("Load substrate items before using BEAM AI.");
      }

      if (!ANTHROPIC_API_KEY) {
        throw new Error("Set NEXT_PUBLIC_ANTHROPIC_API_KEY to use the coordination assistant.");
      }

      if (assistantAction !== "generate_brief" && !selectedAssistantItem) {
        throw new Error("Select a substrate item first.");
      }

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1400,
          stream: true,
          system: ANTHROPIC_SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: buildAssistantPrompt({
                    action: assistantAction,
                    recipientType,
                    focusItem: selectedAssistantItem,
                    items,
                  }),
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(await getAnthropicErrorMessage(response));
      }

      setAssistantStatus("Streaming response...");
      await readAnthropicStream(response, (delta) => {
        setAssistantResult((current) => current + delta);
      });
      setAssistantStatus("Response ready.");
    } catch (assistantRequestError) {
      setAssistantError(
        assistantRequestError instanceof Error ? assistantRequestError.message : "Failed to get BEAM AI response."
      );
    } finally {
      setIsAskingAssistant(false);
    }
  }

  async function handleCopyResult() {
    setAssistantError(null);
    setAssistantStatus(null);

    try {
      await navigator.clipboard.writeText(assistantResult);
      setAssistantStatus("Copied to clipboard.");
    } catch (copyError) {
      setAssistantError(copyError instanceof Error ? copyError.message : "Failed to copy result.");
    }
  }

  return (
    <main className="min-h-screen w-full bg-[#0e0e0e] text-white">
      <div className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-8">
        <header className="border-b border-white/10 pb-6">
          <p className="text-xs uppercase tracking-[0.28em] text-white/50">BEAM Operating System</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Substrate Manager</h1>
          <p className="mt-3 max-w-3xl text-sm text-white/70 sm:text-base">
            Track BEAM&apos;s hard substrate, active soft substrate, and the next coordination move required to push the
            network forward.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={handleGoogleSignIn} className={ACTION_BUTTON_BASE}>
              {isSignedIn ? "Signed In" : "Sign In With Google"}
            </button>
            {isSignedIn ? (
              <button type="button" onClick={handleSignOut} className={ACTION_BUTTON_BASE}>
                Sign Out
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void loadItems()}
              disabled={!isSignedIn || isLoading}
              className={ACTION_BUTTON_BASE}
            >
              {isLoading ? "Refreshing..." : "Refresh"}
            </button>
            <Link href="/admin" className={ACTION_BUTTON_BASE}>
              Back To Admin
            </Link>
          </div>

          <p className="mt-4 text-sm text-white/60">
            {isSignedIn
              ? "Signed in. Firestore reads and writes are enabled."
              : "Page content stays visible in dev mode, but Firestore reads and all writes require Google sign-in."}
          </p>
          {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
          {successMessage ? <p className="mt-2 text-sm text-emerald-300">{successMessage}</p> : null}
        </header>

        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">Create</p>
              <h2 className="mt-2 text-xl font-medium">+ Add Item</h2>
              <p className="mt-2 max-w-2xl text-sm text-white/70">
                Add a new hard or soft substrate record using the same inline schema used in the list below.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsAddOpen((current) => !current);
                setEditingId(null);
              }}
              className={ACTION_BUTTON_BASE}
            >
              {isAddOpen ? "Collapse" : "Add Item"}
            </button>
          </div>

          {isAddOpen ? (
            <form onSubmit={handleCreateItem} className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5">
              {renderSubstrateFormFields(newForm, setNewForm, "create")}

              <div className="mt-5 flex flex-wrap gap-2">
                <button type="submit" disabled={!isSignedIn || isCreating} className={PRIMARY_BUTTON_BASE}>
                  {isCreating ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddOpen(false);
                    setNewForm(INITIAL_FORM);
                  }}
                  className={ACTION_BUTTON_BASE}
                >
                  Cancel
                </button>
              </div>
              {!isSignedIn ? (
                <p className="mt-4 text-sm text-white/55">Sign in first to save a new substrate item.</p>
              ) : null}
            </form>
          ) : null}
        </section>

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">Type</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => setTypeFilter("all")} className={filterButtonClass(typeFilter === "all")}>
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter("hard")}
                  className={filterButtonClass(typeFilter === "hard")}
                >
                  Hard
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter("soft")}
                  className={filterButtonClass(typeFilter === "soft")}
                >
                  Soft
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">Status</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={filterButtonClass(statusFilter === "all")}
                >
                  All
                </button>
                {(["seed", "forming", "active", "hardening", "hard"] as SubstrateStatus[]).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={filterButtonClass(statusFilter === status)}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">Urgency</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setUrgencyFilter("all")}
                  className={filterButtonClass(urgencyFilter === "all")}
                >
                  All
                </button>
                {(["critical", "high", "medium", "low", "none"] as SubstrateUrgency[]).map((urgency) => (
                  <button
                    key={urgency}
                    type="button"
                    onClick={() => setUrgencyFilter(urgency)}
                    className={filterButtonClass(urgencyFilter === urgency)}
                  >
                    {urgency}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 space-y-4">
          {isLoading ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/65">
              Loading substrate items...
            </div>
          ) : null}

          {!isLoading && isSignedIn && hasLoadedCollection && items.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">Empty Collection</p>
              <h2 className="mt-2 text-xl font-medium">No substrate items yet</h2>
              <p className="mt-2 max-w-2xl text-sm text-white/70">
                Seed the full substrate list or start by creating items manually above.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" onClick={() => void handleSeedSubstrate()} disabled={isSeeding} className={PRIMARY_BUTTON_BASE}>
                  {isSeeding ? "Seeding..." : "Seed Substrate"}
                </button>
              </div>
            </div>
          ) : null}

          {!isLoading && isSignedIn && hasLoadedCollection && items.length > 0 && filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/65">
              No substrate items match the current filters.
            </div>
          ) : null}

          {!isLoading && !isSignedIn ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/65">
              Sign in with Google to load substrate data, seed the collection, or save edits.
            </div>
          ) : null}

          {filteredItems.map((item) => {
            const isEditing = editingId === item.id;
            const contactsLabel = item.contacts.length ? item.contacts.join(", ") : "No contacts listed";
            const hasNotes = Boolean(item.notes.trim());

            return (
              <article
                key={item.id}
                className={`rounded-2xl border border-white/10 border-l-4 bg-white/[0.03] p-5 ${urgencyBorderClass(item.urgency)}`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${statusBadgeClass(item.status)}`}
                      >
                        {item.status}
                      </span>
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${typeBadgeClass(item.type)}`}
                      >
                        {item.type}
                      </span>
                    </div>
                    <h2 className="mt-4 text-xl font-medium">{item.name}</h2>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/45">{item.category}</p>
                    <p className="mt-4 max-w-4xl text-sm leading-7 text-white/75">{item.description}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className={ACTION_BUTTON_BASE}
                      >
                        Open Link
                      </a>
                    ) : null}
                    {hasNotes ? (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedNotes((current) => ({
                            ...current,
                            [item.id]: !current[item.id],
                          }))
                        }
                        className={ACTION_BUTTON_BASE}
                      >
                        {expandedNotes[item.id] ? "Hide Notes" : "Notes"}
                      </button>
                    ) : null}
                    <button type="button" onClick={() => beginEdit(item)} className={ACTION_BUTTON_BASE}>
                      Edit
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm text-white/70">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/45">Owner + Contacts</p>
                    <p className="mt-3 text-sm text-white/85">{item.owner}</p>
                    <p className="mt-2 leading-7 text-white/70">{contactsLabel}</p>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-[rgba(200,185,122,0.08)] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--beam-gold)]">Next Action</p>
                    <p className="mt-3 text-sm leading-7 text-white/85">→ {item.nextAction}</p>
                  </div>
                </div>

                {hasNotes && expandedNotes[item.id] ? (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/45">Notes</p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/70">{item.notes}</p>
                  </div>
                ) : null}

                {item.tags.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <span
                        key={`${item.id}-${tag}`}
                        className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-white/60"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}

                {isEditing ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void handleSaveEdit(item.id);
                    }}
                    className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5"
                  >
                    {renderSubstrateFormFields(editForm, setEditForm, `edit-${item.id}`)}

                    <div className="mt-5 flex flex-wrap gap-2">
                      <button type="submit" disabled={!isSignedIn || savingId === item.id} className={PRIMARY_BUTTON_BASE}>
                        {savingId === item.id ? "Saving..." : "Save"}
                      </button>
                      <button type="button" onClick={cancelEdit} className={ACTION_BUTTON_BASE}>
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : null}
              </article>
            );
          })}
        </section>

        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">AI Coordination Assistant</p>
              <h2 className="mt-2 text-xl font-medium">BEAM AI</h2>
              <p className="mt-2 max-w-3xl text-sm text-white/70">
                Draft outreach, generate a coordination brief, or sharpen the next action using the current substrate
                list as context.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleCopyResult()}
              disabled={!assistantResult.trim()}
              className={ACTION_BUTTON_BASE}
            >
              Copy Result
            </button>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-4">
              <label className="space-y-2 text-sm">
                <span className="text-white/70">Substrate item</span>
                <select
                  value={assistantTargetId}
                  onChange={(event) => setAssistantTargetId(event.target.value)}
                  className={INPUT_CLASS}
                >
                  <option value={ALL_ITEMS_OPTION}>All - generate brief</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm">
                <span className="text-white/70">Action type</span>
                <select
                  value={assistantAction}
                  onChange={(event) => setAssistantAction(event.target.value as AssistantAction)}
                  className={INPUT_CLASS}
                >
                  <option value="draft_message">Draft message</option>
                  <option value="generate_brief">Generate brief</option>
                  <option value="suggest_next_action">Suggest next action</option>
                </select>
              </label>

              {assistantAction === "draft_message" ? (
                <label className="space-y-2 text-sm">
                  <span className="text-white/70">Recipient type</span>
                  <select
                    value={recipientType}
                    onChange={(event) => setRecipientType(event.target.value as RecipientType)}
                    className={INPUT_CLASS}
                  >
                    <option value="email">email</option>
                    <option value="slack">Slack</option>
                    <option value="text">text</option>
                  </select>
                </label>
              ) : null}

              <button
                type="button"
                onClick={() => void handleAskBeamAi()}
                disabled={isAskingAssistant || !items.length || !ANTHROPIC_API_KEY}
                className={PRIMARY_BUTTON_BASE}
              >
                {isAskingAssistant ? "Thinking..." : "Ask BEAM AI"}
              </button>

              <p className="text-sm text-white/55">
                Streams Claude Sonnet 4 into the result field below. This page expects{" "}
                <code>NEXT_PUBLIC_ANTHROPIC_API_KEY</code> in the client environment.
              </p>

              {assistantError ? <p className="text-sm text-red-300">{assistantError}</p> : null}
              {assistantStatus ? <p className="text-sm text-emerald-300">{assistantStatus}</p> : null}
            </div>

            <div>
              <label className="space-y-2 text-sm">
                <span className="text-white/70">Result</span>
                <textarea
                  readOnly
                  value={assistantResult}
                  className="min-h-[200px] w-full rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-sm text-white/90"
                />
              </label>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
