"use client";

import { useEffect, useState } from "react";
import { doc, setDoc } from "firebase/firestore";

import { useProfessionalProfile } from "@/hooks/useProfessionalProfile";
import { getFirebaseDb } from "@/lib/firebaseClient";
import type { BusinessFunction, ProfessionalProfile } from "@/types/participantIdentity";

const BUSINESS_FUNCTIONS: { value: BusinessFunction; label: string; description: string }[] = [
  {
    value: "marketing",
    label: "Marketing / Content & Social Media",
    description: "Ticket promotion, property marketing, and campaign storytelling.",
  },
  {
    value: "business_development",
    label: "Business Development & Sales",
    description: "Client discovery, B2B sales pipelines, and partnership development.",
  },
  {
    value: "grant_writing",
    label: "Grant Writing & Research",
    description: "NOFO research, multi-PI grant proposals, and institutional funding strategy.",
  },
  {
    value: "accounting",
    label: "Accounting / Bookkeeping / Tax",
    description: "Financial tracking, tax prep, and compliance for teams & partner NGOs.",
  },
  {
    value: "legal",
    label: "Legal & Compliance",
    description: "Contract review, 501(c)(3) structuring, and governance compliance.",
  },
  {
    value: "project_management",
    label: "Project Management & Operations",
    description: "Cross-domain cohort ops, timeline tracking, and team delivery.",
  },
  {
    value: "community_organizing",
    label: "Community Organizing & Recruitment",
    description: "Student council leadership, outreach, and local stakeholder mobilization.",
  },
  {
    value: "fundraising",
    label: "Fundraising & Development",
    description: "Donor relations, gala events, and endowment strategy.",
  },
  {
    value: "research",
    label: "Data & Customer Discovery Research",
    description: "I-Corps market validation, survey research, and data synthesis.",
  },
];

export function ProfessionalProfileSection({ uid }: { uid: string }) {
  const { profile, loading, error } = useProfessionalProfile(uid);

  const [businessFunctions, setBusinessFunctions] = useState<BusinessFunction[]>([]);
  const [bio, setBio] = useState("");
  const [rateType, setRateType] = useState<"hourly" | "project" | "volunteer">("hourly");
  const [rate, setRate] = useState<string>("");
  const [portfolioLinks, setPortfolioLinks] = useState<string[]>([""]);
  const [availability, setAvailability] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sync form state when existing profile loads or updates
  useEffect(() => {
    if (profile) {
      setBusinessFunctions(profile.businessFunctions || []);
      setBio(profile.bio || "");
      setRateType(profile.rateType || "hourly");
      setRate(typeof profile.rate === "number" ? String(profile.rate) : "");
      setPortfolioLinks(profile.portfolioLinks?.length ? profile.portfolioLinks : [""]);
      setAvailability(profile.availability || "");
    }
  }, [profile]);

  function handleToggleBusinessFunction(fn: BusinessFunction) {
    setBusinessFunctions((prev) =>
      prev.includes(fn) ? prev.filter((item) => item !== fn) : [...prev, fn]
    );
  }

  function handleLinkChange(index: number, value: string) {
    setPortfolioLinks((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleAddLinkRow() {
    setPortfolioLinks((prev) => [...prev, ""]);
  }

  function handleRemoveLinkRow(index: number) {
    setPortfolioLinks((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      const cleanedLinks = portfolioLinks.map((l) => l.trim()).filter(Boolean);
      const parsedRate = rateType !== "volunteer" && rate ? Number.parseFloat(rate) : undefined;
      const now = new Date().toISOString();

      const docRef = doc(getFirebaseDb(), "professionalProfiles", uid);

      if (!profile) {
        // Create new document
        const newDoc: ProfessionalProfile = {
          id: uid,
          participantUid: uid,
          businessFunctions,
          bio: bio.trim(),
          rateType,
          rate: Number.isNaN(parsedRate) ? undefined : parsedRate,
          portfolioLinks: cleanedLinks,
          availability: availability.trim(),
          matchedDomains: [],
          matchedProjectIds: [],
          createdAt: now,
          updatedAt: now,
        };
        await setDoc(docRef, newDoc);
      } else {
        // Update existing document without touching matchedDomains or matchedProjectIds
        const updateData: Partial<ProfessionalProfile> = {
          businessFunctions,
          bio: bio.trim(),
          rateType,
          rate: Number.isNaN(parsedRate) ? undefined : parsedRate,
          portfolioLinks: cleanedLinks,
          availability: availability.trim(),
          updatedAt: now,
        };
        await setDoc(docRef, updateData, { merge: true });
      }

      setSaveMessage("Saved to your professional profile");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save professional profile.");
    } finally {
      setIsSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="rounded-3xl border border-white/10 bg-[#1D2127] p-6">
        <p className="text-sm text-neutral-400">Loading professional profile...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-3xl border border-white/10 bg-[#1D2127] p-6">
        <h2 className="text-xl font-medium text-white">Professional Profile</h2>
        <p className="mt-2 text-sm text-red-300">Error loading profile: {error.message}</p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-[#1D2127] p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-medium text-white">Professional Profile</h2>
            <span className="rounded-full border border-[#89C0D0]/40 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.18em] text-[#89C0D0]">
              Horizontal Skill Registry
            </span>
          </div>
          <p className="mt-1 text-sm text-neutral-300">
            Declare your transferable business functions and availability for deployment across Orchestra, Grounds, Forge, and RAG client projects.
          </p>
        </div>
        <span className="text-xs text-neutral-500">
          {isSaving ? "Saving..." : profile ? "Profile Active" : "Not yet created"}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {/* Business Functions Multi-Select */}
        <div>
          <label className="block text-xs uppercase tracking-[0.18em] text-white/45">
            Business Functions (Select all that apply)
          </label>
          <p className="mt-1 text-xs text-neutral-400">
            Choose the transferable functions you can perform across BEAM domains.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BUSINESS_FUNCTIONS.map((fn) => {
              const isChecked = businessFunctions.includes(fn.value);
              return (
                <label
                  key={fn.value}
                  className={`flex cursor-pointer flex-col rounded-2xl border p-4 transition ${
                    isChecked
                      ? "border-[#89C0D0]/60 bg-[#111820]"
                      : "border-[#23262B] bg-black/20 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-white">{fn.label}</span>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleBusinessFunction(fn.value)}
                      className="h-4 w-4 rounded border-neutral-600 bg-black/40 text-[#89C0D0] focus:ring-[#89C0D0]"
                    />
                  </div>
                  <span className="mt-2 text-xs text-neutral-400">{fn.description}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="bio-input" className="block text-xs uppercase tracking-[0.18em] text-white/45">
            Professional Bio
          </label>
          <textarea
            id="bio-input"
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Describe your background, specialty, and cross-domain experience..."
            className="mt-2 w-full rounded-2xl border border-[#23262B] bg-black/20 p-4 text-sm text-white placeholder-neutral-500 focus:border-[#89C0D0] focus:outline-none"
          />
        </div>

        {/* Rate Type & Rate */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="rate-type-select" className="block text-xs uppercase tracking-[0.18em] text-white/45">
              Rate Model
            </label>
            <select
              id="rate-type-select"
              value={rateType}
              onChange={(e) => setRateType(e.target.value as "hourly" | "project" | "volunteer")}
              className="mt-2 w-full rounded-xl border border-[#23262B] bg-black/20 p-3 text-sm text-white focus:border-[#89C0D0] focus:outline-none"
            >
              <option value="hourly">Hourly Rate ($/hr)</option>
              <option value="project">Project / Flat Stipend</option>
              <option value="volunteer">Volunteer / Pro Bono</option>
            </select>
          </div>

          {rateType !== "volunteer" ? (
            <div>
              <label htmlFor="rate-amount-input" className="block text-xs uppercase tracking-[0.18em] text-white/45">
                Rate Amount ($ USD)
              </label>
              <input
                id="rate-amount-input"
                type="number"
                min="0"
                step="any"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="e.g. 75"
                required
                className="mt-2 w-full rounded-xl border border-[#23262B] bg-black/20 p-3 text-sm text-white placeholder-neutral-500 focus:border-[#89C0D0] focus:outline-none"
              />
            </div>
          ) : null}
        </div>

        {/* Portfolio Links */}
        <div>
          <label className="block text-xs uppercase tracking-[0.18em] text-white/45">
            Portfolio & Links
          </label>
          <div className="mt-2 space-y-2">
            {portfolioLinks.map((link, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="url"
                  value={link}
                  onChange={(e) => handleLinkChange(idx, e.target.value)}
                  placeholder="https://..."
                  className="flex-1 rounded-xl border border-[#23262B] bg-black/20 p-3 text-sm text-white placeholder-neutral-500 focus:border-[#89C0D0] focus:outline-none"
                />
                {portfolioLinks.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => handleRemoveLinkRow(idx)}
                    className="rounded-xl border border-red-500/30 px-3 py-3 text-xs font-medium text-red-400 hover:bg-red-500/10"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={handleAddLinkRow}
            className="mt-2 text-xs font-medium text-[#89C0D0] hover:underline"
          >
            + Add Link
          </button>
        </div>

        {/* Availability */}
        <div>
          <label htmlFor="availability-input" className="block text-xs uppercase tracking-[0.18em] text-white/45">
            Availability
          </label>
          <input
            id="availability-input"
            type="text"
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            placeholder="e.g. 10 hrs/week, open to contract projects starting Q3"
            className="mt-2 w-full rounded-xl border border-[#23262B] bg-black/20 p-3 text-sm text-white placeholder-neutral-500 focus:border-[#89C0D0] focus:outline-none"
          />
        </div>

        {/* READ-ONLY: Matched Domains */}
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.18em] text-white/45">Matched Domains</span>
            <span className="text-[10px] text-neutral-500">Assigned by BEAM admins</span>
          </div>
          {profile?.matchedDomains && profile.matchedDomains.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.matchedDomains.map((domain) => (
                <span
                  key={domain}
                  className="rounded-full border border-[#89C0D0]/40 bg-[#89C0D0]/10 px-3 py-1 text-xs font-medium text-[#89C0D0]"
                >
                  {domain}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-neutral-400">No matched domains assigned yet.</p>
          )}
        </div>

        {/* READ-ONLY: Matched Projects */}
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.18em] text-white/45">Matched Project IDs</span>
            <span className="text-[10px] text-neutral-500">Assigned by BEAM admins</span>
          </div>
          {profile?.matchedProjectIds && profile.matchedProjectIds.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.matchedProjectIds.map((projectId) => (
                <span
                  key={projectId}
                  className="rounded-full border border-purple-400/40 bg-purple-400/10 px-3 py-1 text-xs font-medium text-purple-300"
                >
                  {projectId}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-neutral-400">No matched projects assigned yet.</p>
          )}
        </div>

        {/* Submit & Status Messages */}
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-xl bg-[#89C0D0] px-6 py-3 text-sm font-medium text-[#0c1215] transition hover:brightness-95 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : profile ? "Update Professional Profile" : "Create Professional Profile"}
          </button>
          {saveMessage ? <span className="text-sm text-emerald-300">{saveMessage}</span> : null}
          {saveError ? <span className="text-sm text-red-300">{saveError}</span> : null}
        </div>
      </form>
    </section>
  );
}
