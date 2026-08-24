import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebaseClient";
import { GRANT_ROLES, ROLE_MAP } from "@/lib/grants/grantRoles";
import type {
  ActivityLogEntry,
  BeamInstitutionalRole,
  BeamOpportunity,
  BeamPursuit,
  BeamSubject,
  FunderContact,
  PursuitParticipant,
} from "@/types/grantConsole";

const COLLECTION_OPPORTUNITIES = "beamOpportunities";
const COLLECTION_PURSUITS = "beamPursuits";
const COLLECTION_INSTITUTIONAL_ROLES = "beamInstitutionalRoles";
const SUBCOLLECTION_ACTIVITY = "activity";

// Initial seed data for institutional roles
export const INITIAL_SEED_INSTITUTIONAL_ROLES: BeamInstitutionalRole[] = [
  {
    id: "sam_entity_admin",
    roleId: "sam_entity_admin",
    roleLabel: "SAM.gov Entity Administrator",
    holderName: "Marcus Webb",
    holderEmail: "marcus.webb@beamthinktank.space",
    expirationDate: "2026-12-31",
    updatedAt: "2026-06-01T00:00:00Z",
  },
  {
    id: "ebiz_poc",
    roleId: "ebiz_poc",
    roleLabel: "E-Business Point of Contact (EBiz POC)",
    holderName: "Marcus Webb",
    holderEmail: "marcus.webb@beamthinktank.space",
    updatedAt: "2026-06-01T00:00:00Z",
  },
];

export const REAL_PRODUCTION_OPPORTUNITIES: BeamOpportunity[] = [
  {
    id: "grant-ahw-2026-mcw-008",
    externalSource: "manual",
    sourceId: "ahw-2026-mcw",
    opportunityNumber: "AHW-2026-PILOT-08",
    title: "Advancing a Healthier Wisconsin Endowment (MCW)",
    agencyCode: "AHW-MCW",
    agencyName: "Advancing a Healthier Wisconsin Endowment",
    description: "Seed grant for pilot projects. DeTania has MCW research context. Focus on health equity, music-cognition, and community health.",
    applicantTypes: ["Community Entity", "Academic Partner"],
    fundingCategories: ["Health", "Science & Research"],
    awardFloor: 25000,
    awardCeiling: 50000,
    estimatedFunding: 50000,
    costSharing: false,
    postedDate: "2026-05-15",
    closeDate: "2026-08-03", // Deadline passed ~20 days ago
    sourceUrl: "https://grants.nih.gov/funding",
    opportunityContextSources: [
      {
        id: "src-nofo-ahw-008",
        type: "nofo",
        name: "AHW_MCW_Pilot_RFP.pdf",
        shortDescription: "Up to $50,000 · seed grant for pilot projects",
        status: "ready",
        pageCount: 18,
        attachedAt: "2026-05-16T12:00:00Z",
      },
    ],
    createdAt: "2026-05-15T00:00:00Z",
    updatedAt: "2026-08-03T00:00:00Z",
    hasActivePursuit: true,
  },
  {
    id: "grant-cheer-2026-pilot",
    externalSource: "manual",
    sourceId: "cheer-2026-pilot",
    opportunityNumber: "CHEER-PILOT-2026",
    title: "CHEER Community Partner Pilot Grant",
    agencyCode: "CHEER-INITIATIVE",
    agencyName: "CHEER Community Health & Education Initiative",
    description: "Science/health + community angle. DeTania has research contacts. Amount TBD.",
    applicantTypes: ["Nonprofit 501(c)(3)", "Community Organization"],
    fundingCategories: ["Health", "Community Development"],
    awardFloor: 0,
    awardCeiling: 0,
    estimatedFunding: 0,
    costSharing: false,
    postedDate: "2026-05-01",
    closeDate: "2026-08-07",
    sourceUrl: "https://www.grants.gov/search-grants",
    opportunityContextSources: [],
    createdAt: "2026-05-01T00:00:00Z",
    updatedAt: "2026-08-07T00:00:00Z",
    hasActivePursuit: false,
  },
  {
    id: "grant-family-water-edu",
    externalSource: "manual",
    sourceId: "family-water-edu",
    opportunityNumber: "FAM-WATER-2026",
    title: "Family Foundation – Water/Education",
    agencyCode: "FAMILY-FOUNDATION",
    agencyName: "Family Foundation",
    description: "Warm contact - follow up. Program officer funded wastewater sensor donation to Community Water Services. Direct line to Jordan's sensor work. Deadline and amount unconfirmed.",
    applicantTypes: ["Nonprofit", "Community Water Initiative"],
    fundingCategories: ["Environment", "Education"],
    awardFloor: 0,
    awardCeiling: 0,
    estimatedFunding: 0,
    costSharing: false,
    postedDate: "2026-06-01",
    closeDate: "Rolling",
    sourceUrl: "https://sam.gov/content/assistance-listings",
    opportunityContextSources: [],
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
    hasActivePursuit: false,
  },
  {
    id: "grant-gmf-2026-nov",
    externalSource: "manual",
    sourceId: "gmf-2026-nov",
    opportunityNumber: "GMF-CYCLE-NOV-2026",
    title: "Greater Milwaukee Foundation",
    agencyCode: "GMF",
    agencyName: "Greater Milwaukee Foundation",
    description: "Danielle's home network; general BEAM and community projects. Window: Nov 2-13, 2026.",
    applicantTypes: ["501(c)(3) Nonprofit", "Community Organization"],
    fundingCategories: ["Community Development", "Education"],
    awardFloor: 10000,
    awardCeiling: 100000,
    estimatedFunding: 500000,
    costSharing: false,
    postedDate: "2026-06-15",
    closeDate: "2026-11-02",
    sourceUrl: "https://www.greatermilwaukeefoundation.org",
    opportunityContextSources: [],
    createdAt: "2026-06-15T00:00:00Z",
    updatedAt: "2026-06-15T00:00:00Z",
    hasActivePursuit: false,
  },
  {
    id: "grant-peck-21st-century",
    externalSource: "manual",
    sourceId: "peck-21st-century",
    opportunityNumber: "PECK-UWM-2026",
    title: "Peck School / 21st Century Performance Grant",
    agencyCode: "UWM-PECK",
    agencyName: "Peck School of the Arts / UWM 21st Century Program",
    description: "Needs follow-up. Deadline and amount unconfirmed. Flagged by contact at UWM 21st Century program.",
    applicantTypes: ["Arts Organization", "Academic/Performer"],
    fundingCategories: ["Arts", "Education"],
    awardFloor: 0,
    awardCeiling: 0,
    estimatedFunding: 0,
    costSharing: false,
    postedDate: "2026-06-10",
    closeDate: "Needs follow-up",
    sourceUrl: "https://www.nsf.gov/funding/opportunities",
    opportunityContextSources: [],
    createdAt: "2026-06-10T00:00:00Z",
    updatedAt: "2026-06-10T00:00:00Z",
    hasActivePursuit: false,
  },
  {
    id: "grant-wt-grant-2026",
    externalSource: "manual",
    sourceId: "wtg-2026",
    opportunityNumber: "WTG-RESEARCH-2026",
    title: "William T. Grant Foundation",
    agencyCode: "WTG-FOUNDATION",
    agencyName: "William T. Grant Foundation",
    description: "Research needed. Rolling / check site. Major research studies; fits music-cognition and memory angle. Range: $100,000-$600,000.",
    applicantTypes: ["Research Institution", "Nonprofit"],
    fundingCategories: ["Science & Research", "Education"],
    awardFloor: 100000,
    awardCeiling: 600000,
    estimatedFunding: 2000000,
    costSharing: false,
    postedDate: "2026-04-01",
    closeDate: "Rolling",
    sourceUrl: "https://wtgrantfoundation.org",
    opportunityContextSources: [],
    createdAt: "2026-04-01T00:00:00Z",
    updatedAt: "2026-04-01T00:00:00Z",
    hasActivePursuit: false,
  },
];

export const REAL_PRODUCTION_SUBJECTS: BeamSubject[] = [
  {
    id: "subject-black-diaspora-pilot",
    type: "program",
    name: "Black Diaspora Orchestra Pilot",
    description: "Cultural labor & musical cognition pilot project testing uncompensated rehearsal hours for micro-underwriting.",
    organizationName: "Black Diaspora Symphony Orchestra",
    targetLocation: "Milwaukee, WI",
  },
  {
    id: "subject-community-water-sensors",
    type: "purpose",
    name: "Community Water Sensor Network",
    description: "Wastewater and environmental water quality sensor monitoring in partnership with Community Water Services.",
    organizationName: "Community Water Services",
    targetLocation: "Milwaukee, WI",
  },
];

export const REAL_PRODUCTION_PURSUITS: BeamPursuit[] = [
  {
    id: "pursuit-ahw-diaspora-detania",
    opportunityId: "grant-ahw-2026-mcw-008",
    opportunityNumber: "AHW-2026-PILOT-08",
    opportunityTitle: "Advancing a Healthier Wisconsin Endowment (MCW)",
    agencyName: "Advancing a Healthier Wisconsin Endowment",
    sourceUrl: "https://grants.nih.gov/funding",

    subjectId: "subject-black-diaspora-pilot",
    subjectName: "Black Diaspora Orchestra Pilot",
    subjectType: "program",

    currentGate: "research_qualify",
    gateProgress: {
      open: { status: "complete", updatedAt: "2026-05-16T12:00:00Z" },
      research_qualify: { status: "active", updatedAt: "2026-05-20T10:00:00Z" },
      drafting: { status: "idle" },
      submitted: { status: "idle" },
      decision: { status: "idle" },
    },

    decision: "pursue",
    fitScore: 85,
    strategicFit: 5,
    eligibilityConfidence: 4,
    relationshipStrength: 4,
    effortLevel: 2,
    rationale: "Seed grant for pilot projects. DeTania has MCW research context and direct ties to the Black Diaspora Symphony Orchestra.",

    targetUsd: 50000,
    raisedUsd: 0,
    deadlineDate: "2026-08-03",
    isFederal: false,

    participants: [
      {
        userId: "user-detania",
        name: "DeTania",
        email: "detania@beamcenter.org",
        roleId: "grants_lead_manager",
        roleLabel: "Research Co-Lead (MCW Context)",
        assignedAt: "2026-05-16T12:00:00Z",
      },
    ],
    funderContacts: [
      {
        id: "fc-1",
        name: "Dr. Sarah Jenkins",
        roleTitle: "Foundation Program Director",
        organizationName: "Advancing a Healthier Wisconsin Endowment",
        email: "sjenkins@mcw.edu",
        lastContactDate: "2026-05-18",
        notes: "Warm contact from MCW seed grant briefing.",
      },
    ],
    pursuitContextSources: [
      {
        id: "src-nofo-ahw-008",
        type: "nofo",
        name: "AHW_MCW_Pilot_RFP.pdf",
        shortDescription: "Up to $50,000 · seed grant for pilot projects",
        status: "ready",
        pageCount: 18,
        attachedAt: "2026-05-16T12:00:00Z",
      },
    ],
    latestActivityPull: "Bound AHW MCW Endowment grant to Black Diaspora Orchestra Pilot (DeTania)",
    status: "active",
    createdAt: "2026-05-16T12:00:00Z",
    updatedAt: "2026-05-20T10:00:00Z",
  },
];

export const INITIAL_SEED_ACTIVITY_LOGS: Record<string, ActivityLogEntry[]> = {
  "pursuit-ahw-diaspora-detania": [
    {
      id: "act-ahw-1",
      pursuitId: "pursuit-ahw-diaspora-detania",
      actorName: "DeTania",
      actorEmail: "detania@beamcenter.org",
      actionType: "created",
      description: "Bound AHW MCW Endowment grant to Black Diaspora Orchestra Pilot.",
      timestamp: "2026-05-16T12:00:00Z",
    },
    {
      id: "act-ahw-2",
      pursuitId: "pursuit-ahw-diaspora-detania",
      actorName: "DeTania",
      actorEmail: "detania@beamcenter.org",
      actionType: "stage_advanced",
      description: "Advanced gate from Open to Research & Qualify.",
      timestamp: "2026-05-20T10:00:00Z",
    },
  ],
};

// ============================================================================
// Institutional Roles (beamInstitutionalRoles) Operations
// ============================================================================
export async function fetchBeamInstitutionalRoles(): Promise<BeamInstitutionalRole[]> {
  try {
    const db = getFirebaseDb();
    const ref = collection(db, COLLECTION_INSTITUTIONAL_ROLES);
    const snap = await getDocs(ref);
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as BeamInstitutionalRole);
    }
  } catch {
    // Offline fallback
  }
  return INITIAL_SEED_INSTITUTIONAL_ROLES;
}

export async function upsertInstitutionalRole(
  roleData: BeamInstitutionalRole
): Promise<{ success: boolean; singletonWarning?: string }> {
  const roleDef = ROLE_MAP[roleData.roleId];
  let singletonWarning: string | undefined;

  // Singleton check
  if (roleDef?.singleton) {
    const existing = await fetchBeamInstitutionalRoles();
    const otherHolder = existing.find(
      (r) => r.roleId === roleData.roleId && r.holderEmail !== roleData.holderEmail
    );
    if (otherHolder) {
      singletonWarning = `Warning: ${roleDef.label} is marked as a singleton role. Current holder is ${otherHolder.holderName} (${otherHolder.holderEmail}).`;
    }
  }

  const now = new Date().toISOString();
  const updated: BeamInstitutionalRole = {
    ...roleData,
    updatedAt: now,
  };

  try {
    const db = getFirebaseDb();
    await setDoc(doc(db, COLLECTION_INSTITUTIONAL_ROLES, updated.id), updated, { merge: true });
  } catch {
    // Offline fallback
  }

  return { success: true, singletonWarning };
}

// Single Chokepoint: Sync `hasActivePursuit` on Opportunity Document
export async function syncOpportunityActivePursuitStatus(opportunityId: string): Promise<boolean> {
  try {
    const db = getFirebaseDb();
    const pursuitsRef = collection(db, COLLECTION_PURSUITS);
    const q = query(
      pursuitsRef,
      where("opportunityId", "==", opportunityId),
      where("status", "==", "active")
    );
    const snap = await getDocs(q);
    const hasActive = !snap.empty;

    const oppRef = doc(db, COLLECTION_OPPORTUNITIES, opportunityId);
    await updateDoc(oppRef, {
      hasActivePursuit: hasActive,
      updatedAt: new Date().toISOString(),
    });
    return hasActive;
  } catch {
    const activeLocal = REAL_PRODUCTION_PURSUITS.some(
      (p) => p.opportunityId === opportunityId && p.status === "active"
    );
    return activeLocal;
  }
}

// Subcollection Activity Writer & Denormalized Pull
export async function writePursuitActivityEvent({
  pursuitId,
  actorName,
  actorEmail,
  actionType,
  description,
  meta,
}: {
  pursuitId: string;
  actorName: string;
  actorEmail?: string;
  actionType: ActivityLogEntry["actionType"];
  description: string;
  meta?: Record<string, unknown>;
}): Promise<ActivityLogEntry> {
  const now = new Date().toISOString();
  const eventId = `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  
  const entry: ActivityLogEntry = {
    id: eventId,
    pursuitId,
    actorName,
    actorEmail,
    actionType,
    description,
    timestamp: now,
    meta,
  };

  const latestPull = `${description} (${actorName})`;

  try {
    const db = getFirebaseDb();
    const batch = writeBatch(db);

    const eventRef = doc(db, COLLECTION_PURSUITS, pursuitId, SUBCOLLECTION_ACTIVITY, eventId);
    batch.set(eventRef, entry);

    const pursuitRef = doc(db, COLLECTION_PURSUITS, pursuitId);
    batch.update(pursuitRef, {
      latestActivityPull: latestPull,
      updatedAt: now,
    });

    await batch.commit();
  } catch {
    if (INITIAL_SEED_ACTIVITY_LOGS[pursuitId]) {
      INITIAL_SEED_ACTIVITY_LOGS[pursuitId].push(entry);
    } else {
      INITIAL_SEED_ACTIVITY_LOGS[pursuitId] = [entry];
    }
  }

  return entry;
}

export async function fetchPursuitActivityFeed(pursuitId: string): Promise<ActivityLogEntry[]> {
  try {
    const db = getFirebaseDb();
    const subcollRef = collection(db, COLLECTION_PURSUITS, pursuitId, SUBCOLLECTION_ACTIVITY);
    const snap = await getDocs(subcollRef);
    if (!snap.empty) {
      const items = snap.docs.map((d) => d.data() as ActivityLogEntry);
      return items.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }
  } catch {
    // Offline fallback
  }
  return INITIAL_SEED_ACTIVITY_LOGS[pursuitId] ?? [];
}

export async function seedOpportunityOnDiscovery(opp: BeamOpportunity): Promise<void> {
  try {
    const db = getFirebaseDb();
    const ref = doc(db, COLLECTION_OPPORTUNITIES, opp.id);
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      await setDoc(ref, opp);
    }
  } catch {
    // Offline fallback
  }
}

export async function fetchBeamPursuits(): Promise<BeamPursuit[]> {
  try {
    const db = getFirebaseDb();
    const pursuitsRef = collection(db, COLLECTION_PURSUITS);
    const snap = await getDocs(pursuitsRef);
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as BeamPursuit);
    }
  } catch {
    // Offline fallback
  }
  return REAL_PRODUCTION_PURSUITS;
}

export async function fetchBeamOpportunities(): Promise<BeamOpportunity[]> {
  try {
    const db = getFirebaseDb();
    const oppsRef = collection(db, COLLECTION_OPPORTUNITIES);
    const snap = await getDocs(oppsRef);
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as BeamOpportunity);
    }
  } catch {
    // Offline fallback
  }
  return REAL_PRODUCTION_OPPORTUNITIES;
}

// Add funder contact to pursuit (tracked, not staffed)
export async function addFunderContactToPursuit({
  pursuit,
  contact,
  actorName,
}: {
  pursuit: BeamPursuit;
  contact: Omit<FunderContact, "id">;
  actorName: string;
}): Promise<BeamPursuit> {
  const now = new Date().toISOString();
  const fullContact: FunderContact = {
    ...contact,
    id: `fc-${Date.now()}`,
    lastContactDate: contact.lastContactDate || now.slice(0, 10),
  };

  const existingContacts = pursuit.funderContacts ?? [];
  const updated: BeamPursuit = {
    ...pursuit,
    funderContacts: [...existingContacts, fullContact],
    latestActivityPull: `Added funder contact ${contact.name} (${contact.roleTitle}) (${actorName})`,
    updatedAt: now,
  };

  try {
    const db = getFirebaseDb();
    await updateDoc(doc(db, COLLECTION_PURSUITS, pursuit.id), {
      funderContacts: updated.funderContacts,
      latestActivityPull: updated.latestActivityPull,
      updatedAt: now,
    });

    await writePursuitActivityEvent({
      pursuitId: pursuit.id,
      actorName,
      actionType: "funder_contact_added",
      description: `Added funder contact ${contact.name} (${contact.roleTitle}).`,
    });
  } catch {
    // Offline fallback
  }

  return updated;
}

// Fork/re-aim a pursuit to a new Subject (single chokepoint)
export async function reaimPursuitToNewSubject({
  pursuit,
  newSubject,
  actorName,
}: {
  pursuit: BeamPursuit;
  newSubject: BeamSubject;
  actorName: string;
}): Promise<{ oldPursuit: BeamPursuit; newPursuit: BeamPursuit }> {
  const now = new Date().toISOString();

  const oldPursuit: BeamPursuit = {
    ...pursuit,
    status: "reaimed",
    updatedAt: now,
    latestActivityPull: `Re-aimed pursuit to ${newSubject.name} (${actorName})`,
  };

  const newPursuitId = `pursuit-${pursuit.opportunityId.replace(/^grant-/, "")}-${newSubject.id.replace(/^subject-/, "")}`;
  const newPursuit: BeamPursuit = {
    id: newPursuitId,
    opportunityId: pursuit.opportunityId,
    opportunityNumber: pursuit.opportunityNumber,
    opportunityTitle: pursuit.opportunityTitle,
    agencyName: pursuit.agencyName,
    sourceUrl: pursuit.sourceUrl,

    subjectId: newSubject.id,
    subjectName: newSubject.name,
    subjectType: newSubject.type,

    currentGate: "research_qualify",
    gateProgress: {
      open: { status: "complete", updatedAt: now },
      research_qualify: { status: "active", updatedAt: now },
      drafting: { status: "idle" },
      submitted: { status: "idle" },
      decision: { status: "idle" },
    },

    decision: "pursue",
    fitScore: pursuit.fitScore,
    strategicFit: pursuit.strategicFit,
    eligibilityConfidence: pursuit.eligibilityConfidence,
    relationshipStrength: pursuit.relationshipStrength,
    effortLevel: pursuit.effortLevel,
    rationale: `Re-aimed pursuit for ${newSubject.name}. Inherited opportunity research from ${pursuit.opportunityNumber}.`,

    targetUsd: pursuit.targetUsd,
    raisedUsd: 0,
    deadlineDate: pursuit.deadlineDate,
    isFederal: pursuit.isFederal,

    participants: [
      {
        userId: `user-${slugify(actorName)}`,
        name: actorName,
        email: `${slugify(actorName)}@beamthinktank.space`,
        roleId: "grants_lead_manager",
        roleLabel: "Grants Lead",
        assignedAt: now,
      },
    ],
    funderContacts: pursuit.funderContacts ? [...pursuit.funderContacts] : [],
    pursuitContextSources: [...pursuit.pursuitContextSources],
    latestActivityPull: `Forked pursuit for ${newSubject.name} (${actorName})`,
    status: "active",
    forkedFromPursuitId: pursuit.id,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const db = getFirebaseDb();
    await setDoc(doc(db, COLLECTION_PURSUITS, oldPursuit.id), oldPursuit, { merge: true });
    await setDoc(doc(db, COLLECTION_PURSUITS, newPursuit.id), newPursuit);

    await writePursuitActivityEvent({
      pursuitId: oldPursuit.id,
      actorName,
      actionType: "reaimed",
      description: `Re-aimed pursuit away from ${pursuit.subjectName} to new subject: ${newSubject.name}.`,
    });

    await writePursuitActivityEvent({
      pursuitId: newPursuit.id,
      actorName,
      actionType: "created",
      description: `Forked new pursuit for ${newSubject.name} from opportunity ${pursuit.opportunityNumber}. Inherited ${pursuit.pursuitContextSources.length} context sources.`,
    });

    await syncOpportunityActivePursuitStatus(pursuit.opportunityId);
  } catch {
    // Offline fallback
  }

  return { oldPursuit, newPursuit };
}

// Add participant to pursuit ("Loop someone in")
export async function loopSomeoneInToPursuit({
  pursuit,
  participant,
  actorName,
}: {
  pursuit: BeamPursuit;
  participant: Omit<PursuitParticipant, "assignedAt">;
  actorName: string;
}): Promise<BeamPursuit> {
  const now = new Date().toISOString();
  const fullParticipant: PursuitParticipant = {
    ...participant,
    assignedAt: now,
  };

  const updated: BeamPursuit = {
    ...pursuit,
    participants: [...pursuit.participants, fullParticipant],
    latestActivityPull: `Looped in ${participant.name} as ${participant.roleLabel} (${actorName})`,
    updatedAt: now,
  };

  try {
    const db = getFirebaseDb();
    await updateDoc(doc(db, COLLECTION_PURSUITS, pursuit.id), {
      participants: updated.participants,
      latestActivityPull: updated.latestActivityPull,
      updatedAt: now,
    });

    await writePursuitActivityEvent({
      pursuitId: pursuit.id,
      actorName,
      actionType: "participant_added",
      description: `Looped in ${participant.name} (${participant.roleLabel}).`,
    });
  } catch {
    // Offline fallback
  }

  return updated;
}

function slugify(val: string) {
  return val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
