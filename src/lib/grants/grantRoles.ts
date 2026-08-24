export type RoleTier =
  | "hard_gate"
  | "signoff_gate"
  | "development"
  | "stewardship"
  | "funder_side";

export type RoleStage = "institutional" | "pursuit";

export interface GrantRole {
  id: string;
  label: string;
  groupId: string;
  groupLabel: string;
  tier: RoleTier;
  stage: RoleStage;
  summary: string;
  singleton?: boolean;
  requiredForFederal?: boolean;
  note?: string;
  contextTags?: string[];
}

export interface PursuitContextFlags {
  isFederal?: boolean;
  isFoundation?: boolean;
  isArts?: boolean;
  isHealth?: boolean;
  isResearch?: boolean;
  hasHumanSubjects?: boolean;
  hasAnimalSubjects?: boolean;
  hasSubawards?: boolean;
}

export const GRANT_ROLE_GROUPS = [
  { id: "institutional_gates", label: "01 / Institutional & Entity Registrations" },
  { id: "hard_gates", label: "02 / Hard Submission Gates" },
  { id: "signoff_gates", label: "03 / Compliance & Review Sign-offs" },
  { id: "development", label: "04 / Proposal Development & Writing" },
  { id: "stewardship", label: "05 / Post-Award Stewardship & Reporting" },
  { id: "funder_side", label: "06 / Funder-Side Contacts" },
] as const;

export const GRANT_ROLES: GrantRole[] = [
  // 1. Institutional & Entity Registrations
  {
    id: "sam_entity_admin",
    label: "SAM.gov Entity Administrator",
    groupId: "institutional_gates",
    groupLabel: "Institutional & Entity Registrations",
    tier: "hard_gate",
    stage: "institutional",
    summary: "Manages entity registration, CAGE code, and annual SAM renewal on SAM.gov.",
    singleton: true,
    requiredForFederal: true,
    note: "Must renew annually. Lapsed SAM registration blocks all federal submissions.",
  },
  {
    id: "ebiz_poc",
    label: "E-Business Point of Contact (EBiz POC)",
    groupId: "institutional_gates",
    groupLabel: "Institutional & Entity Registrations",
    tier: "hard_gate",
    stage: "institutional",
    summary: "Authorizes AORs and manages Grants.gov organizational roles.",
    singleton: true,
    requiredForFederal: true,
  },
  {
    id: "era_so",
    label: "eRA Commons Signing Official (SO)",
    groupId: "institutional_gates",
    groupLabel: "Institutional & Entity Registrations",
    tier: "hard_gate",
    stage: "institutional",
    summary: "Institutional signing authority for NIH and eRA-administered federal grants.",
    singleton: true,
  },
  {
    id: "research_gov_admin",
    label: "Research.gov Administrator",
    groupId: "institutional_gates",
    groupLabel: "Institutional & Entity Registrations",
    tier: "hard_gate",
    stage: "institutional",
    summary: "Manages NSF Research.gov organizational accounts and submission roles.",
    singleton: true,
  },
  {
    id: "payment_system_user",
    label: "Payment System User (ASAP / PMS)",
    groupId: "institutional_gates",
    groupLabel: "Institutional & Entity Registrations",
    tier: "stewardship",
    stage: "institutional",
    summary: "Authorized user for federal drawdown systems (Automated Standard Application for Payments / Payment Management System).",
  },

  // 2. Hard Submission Gates
  {
    id: "aor",
    label: "Authorized Organization Representative (AOR)",
    groupId: "hard_gates",
    groupLabel: "Hard Submission Gates",
    tier: "hard_gate",
    stage: "pursuit",
    summary: "Holds legal authority to submit binding grant proposals on Grants.gov.",
    requiredForFederal: true,
    note: "Must be designated by EBiz POC in Grants.gov prior to submission deadline.",
  },
  {
    id: "signing_official",
    label: "Signing Official (SO)",
    groupId: "hard_gates",
    groupLabel: "Hard Submission Gates",
    tier: "hard_gate",
    stage: "pursuit",
    summary: "Executive officer authorized to bind the institution to award terms.",
    requiredForFederal: true,
  },
  {
    id: "authorized_rep_nonfederal",
    label: "Authorized Representative (Non-Federal)",
    groupId: "hard_gates",
    groupLabel: "Hard Submission Gates",
    tier: "hard_gate",
    stage: "pursuit",
    summary: "Executive lead authorized to sign foundation and corporate grant agreements.",
  },
  {
    id: "fiscal_agent_lead",
    label: "Fiscal Agent / Sponsor Lead",
    groupId: "hard_gates",
    groupLabel: "Hard Submission Gates",
    tier: "hard_gate",
    stage: "pursuit",
    summary: "Financial officer representing the fiscal sponsor or pass-through entity.",
  },

  // 3. Compliance & Review Sign-offs
  {
    id: "budget_cfo_signoff",
    label: "Budget / CFO Sign-off",
    groupId: "signoff_gates",
    groupLabel: "Compliance & Review Sign-offs",
    tier: "signoff_gate",
    stage: "pursuit",
    summary: "Reviews and approves cost share, fringe rates, indirect cost recovery, and budget compliance.",
    requiredForFederal: true,
  },
  {
    id: "legal_compliance_reviewer",
    label: "Compliance / Legal Reviewer",
    groupId: "signoff_gates",
    groupLabel: "Compliance & Review Sign-offs",
    tier: "signoff_gate",
    stage: "pursuit",
    summary: "Ensures agreement terms, IP rights, and liability covenants align with institutional policies.",
  },
  {
    id: "irb_chair",
    label: "IRB Chair / Human Subjects Protection Lead",
    groupId: "signoff_gates",
    groupLabel: "Compliance & Review Sign-offs",
    tier: "signoff_gate",
    stage: "pursuit",
    summary: "Reviews human subjects research protocols, consent forms, and IRB approval status.",
    contextTags: ["health", "research", "human_subjects"],
  },
  {
    id: "iacuc_chair",
    label: "IACUC Chair / Animal Subjects Lead",
    groupId: "signoff_gates",
    groupLabel: "Compliance & Review Sign-offs",
    tier: "signoff_gate",
    stage: "pursuit",
    summary: "Reviews animal care and use protocols for laboratory research.",
    contextTags: ["research", "animal_subjects"],
  },
  {
    id: "ibc_biosafety_officer",
    label: "Biosafety Officer (IBC)",
    groupId: "signoff_gates",
    groupLabel: "Compliance & Review Sign-offs",
    tier: "signoff_gate",
    stage: "pursuit",
    summary: "Reviews recombinant DNA, biohazards, and infectious agent protocols.",
    contextTags: ["health", "research"],
  },
  {
    id: "export_control_officer",
    label: "Export Control Officer",
    groupId: "signoff_gates",
    groupLabel: "Compliance & Review Sign-offs",
    tier: "signoff_gate",
    stage: "pursuit",
    summary: "Monitors ITAR/EAR compliance and international technology transfer restrictions.",
  },
  {
    id: "data_security_officer",
    label: "Data Management / Security Officer",
    groupId: "signoff_gates",
    groupLabel: "Compliance & Review Sign-offs",
    tier: "signoff_gate",
    stage: "pursuit",
    summary: "Ensures compliance with NIH/NSF Data Management and Sharing Plans and HIPAA/FERPA requirements.",
  },
  {
    id: "subrecipient_compliance_monitor",
    label: "Subrecipient Compliance Monitor",
    groupId: "signoff_gates",
    groupLabel: "Compliance & Review Sign-offs",
    tier: "signoff_gate",
    stage: "pursuit",
    summary: "Performs risk assessment and audit checks on subaward partners.",
    contextTags: ["subawards"],
  },
  {
    id: "environmental_review_lead",
    label: "Environmental Review / NEPA Lead",
    groupId: "signoff_gates",
    groupLabel: "Compliance & Review Sign-offs",
    tier: "signoff_gate",
    stage: "pursuit",
    summary: "Assesses National Environmental Policy Act (NEPA) compliance for physical projects.",
  },

  // 4. Proposal Development & Writing
  {
    id: "grants_lead_manager",
    label: "Grants Lead / Proposal Manager",
    groupId: "development",
    groupLabel: "Proposal Development & Writing",
    tier: "development",
    stage: "pursuit",
    summary: "Orchestrates proposal calendar, team assignments, section integration, and overall submission package.",
  },
  {
    id: "principal_investigator",
    label: "Principal Investigator (PI)",
    groupId: "development",
    groupLabel: "Proposal Development & Writing",
    tier: "development",
    stage: "pursuit",
    summary: "Primary scientific or technical leader responsible for project direction and execution.",
    requiredForFederal: true,
  },
  {
    id: "co_principal_investigator",
    label: "Co-Principal Investigator (Co-PI)",
    groupId: "development",
    groupLabel: "Proposal Development & Writing",
    tier: "development",
    stage: "pursuit",
    summary: "Equal partner in scientific and executive leadership of the project.",
  },
  {
    id: "co_investigator",
    label: "Co-Investigator",
    groupId: "development",
    groupLabel: "Proposal Development & Writing",
    tier: "development",
    stage: "pursuit",
    summary: "Senior personnel contributing significant intellectual work to specific project components.",
  },
  {
    id: "project_director_program_lead",
    label: "Project Director / Program Lead",
    groupId: "development",
    groupLabel: "Proposal Development & Writing",
    tier: "development",
    stage: "pursuit",
    summary: "Operational director managing day-to-day program implementation, staffing, and deliverables.",
  },
  {
    id: "lead_writer_grant_writer",
    label: "Lead Writer / Grant Writer",
    groupId: "development",
    groupLabel: "Proposal Development & Writing",
    tier: "development",
    stage: "pursuit",
    summary: "Primary author drafting the narrative, statement of need, and project plan.",
  },
  {
    id: "contract_grant_writer",
    label: "Contract Grant Writer",
    groupId: "development",
    groupLabel: "Proposal Development & Writing",
    tier: "development",
    stage: "pursuit",
    summary: "External consultant engaged for proposal writing.",
    note: "Federal and foundation regulations prohibit percentage-based compensation or contingency fees for grant writers.",
  },
  {
    id: "technical_domain_writer",
    label: "Technical / Domain Writer",
    groupId: "development",
    groupLabel: "Proposal Development & Writing",
    tier: "development",
    stage: "pursuit",
    summary: "Subject matter expert drafting specialized technical, scientific, or clinical sections.",
  },
  {
    id: "evaluator_assessment_lead",
    label: "Evaluator / Assessment Lead",
    groupId: "development",
    groupLabel: "Proposal Development & Writing",
    tier: "development",
    stage: "pursuit",
    summary: "Designs logic models, evaluation metrics, data collection protocols, and outcome measures.",
  },
  {
    id: "financial_budget_officer",
    label: "Financial / Budget Officer",
    groupId: "development",
    groupLabel: "Proposal Development & Writing",
    tier: "development",
    stage: "pursuit",
    summary: "Drafts budget narrative, line-item budget, cost justifications, and match schedules.",
  },
  {
    id: "biostatistician_methodologist",
    label: "Biostatistician / Methodologist",
    groupId: "development",
    groupLabel: "Proposal Development & Writing",
    tier: "development",
    stage: "pursuit",
    summary: "Designs sampling methods, power calculations, and statistical analysis plans.",
    contextTags: ["health", "research"],
  },
  {
    id: "community_participant_liaison",
    label: "Community / Participant Liaison",
    groupId: "development",
    groupLabel: "Proposal Development & Writing",
    tier: "development",
    stage: "pursuit",
    summary: "Manages community engagement, participant advisory boards, and recruitment strategies.",
  },
  {
    id: "dei_health_equity_lead",
    label: "DEI / Health Equity Lead",
    groupId: "development",
    groupLabel: "Proposal Development & Writing",
    tier: "development",
    stage: "pursuit",
    summary: "Ensures project design addresses racial equity, accessibility, and health disparities.",
  },
  {
    id: "curriculum_pedagogy_lead",
    label: "Curriculum / Pedagogy Lead",
    groupId: "development",
    groupLabel: "Proposal Development & Writing",
    tier: "development",
    stage: "pursuit",
    summary: "Develops educational modules, training materials, and instructional frameworks.",
    contextTags: ["education"],
  },
  {
    id: "technical_engineering_lead",
    label: "Technical / Engineering Lead",
    groupId: "development",
    groupLabel: "Proposal Development & Writing",
    tier: "development",
    stage: "pursuit",
    summary: "Leads hardware, software, sensor network, or civic tech development plans.",
  },
  {
    id: "artistic_creative_director",
    label: "Artistic / Creative Director",
    groupId: "development",
    groupLabel: "Proposal Development & Writing",
    tier: "development",
    stage: "pursuit",
    summary: "Leads artistic vision, orchestral repertoire, performance planning, and creative direction.",
    contextTags: ["arts"],
  },
  {
    id: "luthier_instrument_specialist",
    label: "Luthier / Instrument Specialist",
    groupId: "development",
    groupLabel: "Proposal Development & Writing",
    tier: "development",
    stage: "pursuit",
    summary: "Specialist managing string instruments, acoustic requirements, and musical equipment.",
    contextTags: ["arts"],
  },
  {
    id: "subaward_partner_lead",
    label: "Subaward / Partner Subrecipient Lead",
    groupId: "development",
    groupLabel: "Proposal Development & Writing",
    tier: "development",
    stage: "pursuit",
    summary: "Leads communication and proposal deliverables for external partner institutions.",
    contextTags: ["subawards"],
  },
  {
    id: "graphic_data_viz_designer",
    label: "Graphic / Data Viz Designer",
    groupId: "development",
    groupLabel: "Proposal Development & Writing",
    tier: "development",
    stage: "pursuit",
    summary: "Creates organizational charts, logic model diagrams, maps, and proposal graphics.",
  },
  {
    id: "proofreader_compliance_checker",
    label: "Proofreader / Compliance Checker",
    groupId: "development",
    groupLabel: "Proposal Development & Writing",
    tier: "development",
    stage: "pursuit",
    summary: "Verifies font size, margin compliance, page count limits, and required attachments.",
  },

  // 5. Post-Award Stewardship & Reporting
  {
    id: "post_award_administrator",
    label: "Post-Award Grant Administrator",
    groupId: "stewardship",
    groupLabel: "Post-Award Stewardship & Reporting",
    tier: "stewardship",
    stage: "pursuit",
    summary: "Oversees award activation, budget modifications, re-budgeting requests, and compliance.",
  },
  {
    id: "effort_coordinator",
    label: "Effort Coordinator",
    groupId: "stewardship",
    groupLabel: "Post-Award Stewardship & Reporting",
    tier: "stewardship",
    stage: "pursuit",
    summary: "Tracks and certifies faculty and staff effort reporting against grant allocations.",
  },
  {
    id: "equipment_asset_manager",
    label: "Equipment / Asset Manager",
    groupId: "stewardship",
    groupLabel: "Post-Award Stewardship & Reporting",
    tier: "stewardship",
    stage: "pursuit",
    summary: "Tracks grant-funded equipment inventory and disposition compliance.",
  },
  {
    id: "progress_report_lead",
    label: "Progress Report Lead",
    groupId: "stewardship",
    groupLabel: "Post-Award Stewardship & Reporting",
    tier: "stewardship",
    stage: "pursuit",
    summary: "Compiles annual and final technical progress reports (RPPR).",
  },
  {
    id: "financial_reporting_lead",
    label: "Financial Reporting Lead",
    groupId: "stewardship",
    groupLabel: "Post-Award Stewardship & Reporting",
    tier: "stewardship",
    stage: "pursuit",
    summary: "Prepares quarterly Federal Financial Reports (FFR / SF-425) and closeout accounting.",
  },

  // 6. Funder-Side Contacts (Tracked, Not Staffed)
  {
    id: "program_officer",
    label: "Program Officer (PO)",
    groupId: "funder_side",
    groupLabel: "Funder-Side Contacts",
    tier: "funder_side",
    stage: "pursuit",
    summary: "Funder official managing program priorities, technical feedback, and award recommendations.",
  },
  {
    id: "grants_management_specialist",
    label: "Grants Management Specialist (GMS)",
    groupId: "funder_side",
    groupLabel: "Funder-Side Contacts",
    tier: "funder_side",
    stage: "pursuit",
    summary: "Funder business official handling budget negotiations, award terms, and administrative notices.",
  },
  {
    id: "review_panelist_peer_reviewer",
    label: "Review Panelist / Peer Reviewer",
    groupId: "funder_side",
    groupLabel: "Funder-Side Contacts",
    tier: "funder_side",
    stage: "pursuit",
    summary: "External reviewer assessing proposal merits on funder review panels.",
  },
  {
    id: "foundation_program_director",
    label: "Foundation Program Director",
    groupId: "funder_side",
    groupLabel: "Funder-Side Contacts",
    tier: "funder_side",
    stage: "pursuit",
    summary: "Philanthropic foundation lead overseeing grantmaking portfolios and trustee recommendations.",
  },
  {
    id: "philanthropic_advisor_trustee",
    label: "Philanthropic Advisor / Trustee",
    groupId: "funder_side",
    groupLabel: "Funder-Side Contacts",
    tier: "funder_side",
    stage: "pursuit",
    summary: "Board trustee or family advisor guiding foundation grant allocations.",
  },
];

export const ROLE_MAP: Record<string, GrantRole> = Object.fromEntries(
  GRANT_ROLES.map((role) => [role.id, role])
);

// Suggest roles based on pursuit context (hides irrelevant roles, hides funder_side from internal picker)
export function suggestRoles(flags: PursuitContextFlags = {}): GrantRole[] {
  return GRANT_ROLES.filter((role) => {
    // 1. Exclude funder-side contacts from internal staffing picker
    if (role.tier === "funder_side") return false;

    // 2. Contextual filtering
    if (role.contextTags && role.contextTags.length > 0) {
      const match = role.contextTags.some((tag) => {
        if (tag === "arts") return flags.isArts;
        if (tag === "health") return flags.isHealth;
        if (tag === "research") return flags.isResearch;
        if (tag === "human_subjects") return flags.hasHumanSubjects;
        if (tag === "animal_subjects") return flags.hasAnimalSubjects;
        if (tag === "subawards") return flags.hasSubawards;
        if (tag === "education") return true;
        return true;
      });
      if (!match) return false;
    }

    return true;
  });
}

// Find unfilled required federal gate seats
export function unfilledRequiredSeats(
  pursuitParticipants: Array<{ roleId?: string; roleLabel: string }>,
  institutionalRoles: Array<{ roleId: string; holderName: string }> = []
): GrantRole[] {
  const assignedRoleIds = new Set<string>();

  // Add assigned pursuit participant roleIds and matching labels
  pursuitParticipants.forEach((p) => {
    if (p.roleId) assignedRoleIds.add(p.roleId);
    // Also match label string if roleId undefined
    const matchedRole = GRANT_ROLES.find(
      (r) => r.label.toLowerCase() === p.roleLabel.toLowerCase()
    );
    if (matchedRole) assignedRoleIds.add(matchedRole.id);
  });

  // Add institutional role holders
  institutionalRoles.forEach((inst) => {
    if (inst.holderName && inst.holderName.trim()) {
      assignedRoleIds.add(inst.roleId);
    }
  });

  // Return required federal roles that have no assigned holder
  return GRANT_ROLES.filter((role) => role.requiredForFederal && !assignedRoleIds.has(role.id));
}
