"use client";

import React, { useEffect, useState } from "react";
import {
  fetchBeamInstitutionalRoles,
  upsertInstitutionalRole,
} from "@/lib/beamGrantsService";
import { GRANT_ROLES } from "@/lib/grants/grantRoles";
import type { BeamInstitutionalRole } from "@/types/grantConsole";

export function BEAMInstitutionalRolesSection() {
  const [institutionalRoles, setInstitutionalRoles] = useState<BeamInstitutionalRole[]>([]);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [holderName, setHolderName] = useState("");
  const [holderEmail, setHolderEmail] = useState("");
  const [backupHolderName, setBackupHolderName] = useState("");
  const [backupHolderEmail, setBackupHolderEmail] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const institutionalRoleDefs = GRANT_ROLES.filter((r) => r.stage === "institutional");

  useEffect(() => {
    let cancelled = false;
    async function loadRoles() {
      const data = await fetchBeamInstitutionalRoles();
      if (!cancelled) setInstitutionalRoles(data);
    }
    void loadRoles();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleEdit = (roleId: string) => {
    const existing = institutionalRoles.find((r) => r.roleId === roleId);
    const roleDef = institutionalRoleDefs.find((r) => r.id === roleId);
    setEditingRoleId(roleId);
    setHolderName(existing?.holderName || "");
    setHolderEmail(existing?.holderEmail || "");
    setBackupHolderName(existing?.backupHolderName || "");
    setBackupHolderEmail(existing?.backupHolderEmail || "");
    setExpirationDate(existing?.expirationDate || "");
    setWarningMessage(roleDef?.note || null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoleId || !holderName.trim()) return;

    const roleDef = institutionalRoleDefs.find((r) => r.id === editingRoleId)!;
    const rolePayload: BeamInstitutionalRole = {
      id: editingRoleId,
      roleId: editingRoleId,
      roleLabel: roleDef.label,
      holderName: holderName.trim(),
      holderEmail: holderEmail.trim() || `${holderName.toLowerCase().replace(/\s+/g, ".")}@beamthinktank.space`,
      backupHolderName: backupHolderName.trim() || undefined,
      backupHolderEmail: backupHolderEmail.trim() || undefined,
      expirationDate: expirationDate.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    const { singletonWarning } = await upsertInstitutionalRole(rolePayload);
    setInstitutionalRoles((prev) => [
      ...prev.filter((r) => r.id !== editingRoleId),
      rolePayload,
    ]);

    if (singletonWarning) {
      setWarningMessage(singletonWarning);
    } else {
      setEditingRoleId(null);
      setWarningMessage(null);
    }
  };

  return (
    <div className="w-full space-y-4 rounded-2xl border border-[#23221a] bg-[#0c0c08] p-5 font-mono text-xs text-white">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#181710] pb-3">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-[var(--beam-gold)] font-bold">
            BEAM INSTITUTIONAL REGISTRATIONS (`beamInstitutionalRoles`)
          </span>
          <h3 className="font-serif text-lg text-white font-normal mt-0.5">
            Entity-Level System Admins &amp; Compliance Sign-offs
          </h3>
        </div>
        <span className="text-[10px] text-[#6f685a]">
          Belong to BEAM as an entity · Read by all pursuits
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {institutionalRoleDefs.map((def) => {
          const current = institutionalRoles.find((r) => r.roleId === def.id);
          const isEditing = editingRoleId === def.id;

          return (
            <div
              key={def.id}
              className="p-4 rounded-xl border border-[#181710] bg-white/[0.015] space-y-2 hover:border-[#23221a] transition"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[9px] uppercase font-bold text-red-400 border border-red-400/30 bg-red-400/10 px-1.5 py-0.5 rounded">
                    HARD GATE · SINGLETON
                  </span>
                  <p className="font-bold text-sm text-white mt-1">{def.label}</p>
                  <p className="text-[10px] text-[#6f685a] font-sans mt-0.5">{def.summary}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleEdit(def.id)}
                  className="text-[10px] uppercase tracking-wider text-[var(--beam-gold)] hover:underline shrink-0"
                >
                  {current ? "[Edit Holder]" : "[+ Assign Holder]"}
                </button>
              </div>

              {current ? (
                <div className="pt-2 border-t border-white/5 space-y-1 text-[11px]">
                  <div className="flex items-center justify-between text-[#f0ead6]">
                    <span>Holder: <strong>{current.holderName}</strong> ({current.holderEmail})</span>
                  </div>
                  {current.backupHolderName && (
                    <div className="text-[10px] text-[#6f685a]">
                      Backup: {current.backupHolderName} ({current.backupHolderEmail})
                    </div>
                  )}
                  {current.expirationDate && (
                    <div className="text-[10px] text-amber-300 font-mono">
                      • Expires: {current.expirationDate}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-red-300 italic pt-1">
                  ⚠️ Unassigned institutional gate holder.
                </p>
              )}

              {/* Editing Form Modal Inline */}
              {isEditing && (
                <form onSubmit={handleSave} className="mt-3 p-3 rounded-lg border border-[var(--beam-gold)]/40 bg-black/90 space-y-2">
                  <p className="text-[10px] uppercase font-bold text-[var(--beam-gold)]">
                    Assign Institutional Holder: {def.label}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <input
                      type="text"
                      required
                      placeholder="Primary Holder Name"
                      value={holderName}
                      onChange={(e) => setHolderName(e.target.value)}
                      className="rounded bg-[#151515] border border-white/10 p-2 text-white"
                    />
                    <input
                      type="email"
                      placeholder="Primary Holder Email"
                      value={holderEmail}
                      onChange={(e) => setHolderEmail(e.target.value)}
                      className="rounded bg-[#151515] border border-white/10 p-2 text-white"
                    />
                    <input
                      type="text"
                      placeholder="Backup Holder Name (Optional)"
                      value={backupHolderName}
                      onChange={(e) => setBackupHolderName(e.target.value)}
                      className="rounded bg-[#151515] border border-white/10 p-2 text-white"
                    />
                    <input
                      type="date"
                      placeholder="Expiration Date"
                      value={expirationDate}
                      onChange={(e) => setExpirationDate(e.target.value)}
                      className="rounded bg-[#151515] border border-white/10 p-2 text-white"
                    />
                  </div>
                  {warningMessage && (
                    <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-200">
                      {warningMessage}
                    </div>
                  )}
                  <div className="flex items-center space-x-2 text-xs pt-1">
                    <button
                      type="submit"
                      className="rounded bg-[var(--beam-gold)] px-3 py-1 text-black font-bold uppercase text-[10px]"
                    >
                      Save Role Holder
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingRoleId(null)}
                      className="text-[#6f685a] text-[10px]"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
