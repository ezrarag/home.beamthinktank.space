"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  GRANT_ROLE_GROUPS,
  GRANT_ROLES,
  type GrantRole,
  type PursuitContextFlags,
  suggestRoles,
} from "@/lib/grants/grantRoles";

interface BEAMRoleComboboxProps {
  value: string;
  selectedRoleId?: string;
  onChange: (roleId: string | undefined, roleLabel: string, roleNote?: string) => void;
  contextFlags?: PursuitContextFlags;
  placeholder?: string;
}

export function BEAMRoleCombobox({
  value,
  selectedRoleId,
  onChange,
  contextFlags = {},
  placeholder = "Search or type custom role...",
}: BEAMRoleComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeNote, setActiveNote] = useState<string | undefined>();

  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Suggested roles filtered by context (and excluding funder_side)
  const availableRoles = suggestRoles(contextFlags);

  // Filter available roles by user search text
  const filteredRoles = availableRoles.filter(
    (r) =>
      r.label.toLowerCase().includes(search.toLowerCase()) ||
      r.summary.toLowerCase().includes(search.toLowerCase())
  );

  // Group filtered roles by GRANT_ROLE_GROUPS order
  const groupedRoles = GRANT_ROLE_GROUPS.map((group) => ({
    ...group,
    roles: filteredRoles.filter((r) => r.groupId === group.id),
  })).filter((g) => g.roles.length > 0);

  // Flattened list for keyboard navigation
  const flatRoles = groupedRoles.flatMap((g) => g.roles);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectRole = (role?: GrantRole, customText?: string) => {
    if (role) {
      setSearch(role.label);
      setActiveNote(role.note);
      onChange(role.id, role.label, role.note);
    } else if (customText) {
      setSearch(customText);
      setActiveNote(undefined);
      onChange(undefined, customText);
    }
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
      setActiveIndex((prev) => Math.min(prev + 1, flatRoles.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isOpen && flatRoles[activeIndex]) {
        handleSelectRole(flatRoles[activeIndex]);
      } else if (search.trim()) {
        handleSelectRole(undefined, search.trim());
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const getTierChipClass = (tier: string) => {
    switch (tier) {
      case "hard_gate":
        return "border-red-400/40 bg-red-400/10 text-red-200 font-bold";
      case "signoff_gate":
        return "border-amber-400/40 bg-amber-400/10 text-amber-200";
      case "development":
        return "border-[var(--beam-gold)]/40 bg-[var(--beam-gold)]/10 text-[var(--beam-gold-bright)]";
      case "stewardship":
        return "border-emerald-400/40 bg-emerald-400/10 text-emerald-200";
      default:
        return "border-white/10 bg-white/5 text-white/60";
    }
  };

  return (
    <div ref={containerRef} className="relative w-full font-mono text-xs">
      <div className="relative flex items-center">
        <input
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          placeholder={placeholder}
          value={search}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
            setActiveIndex(0);
            onChange(undefined, e.target.value);
          }}
          onKeyDown={handleKeyDown}
          className="w-full rounded bg-[#151515] border border-white/15 px-3 py-2 text-white placeholder-white/40 focus:border-[var(--beam-gold)] focus:outline-none"
        />
        {selectedRoleId && (
          <span className="absolute right-2 text-[9px] uppercase tracking-widest text-[var(--beam-gold)]">
            [Linked]
          </span>
        )}
      </div>

      {/* Role Warning / Note Caveat */}
      {activeNote && (
        <div className="mt-1.5 rounded border border-amber-500/30 bg-amber-500/10 p-2 text-[10px] text-amber-200 leading-relaxed font-sans">
          <strong>Role Caveat:</strong> {activeNote}
        </div>
      )}

      {/* Grouped Dropdown List */}
      {isOpen && (
        <div
          ref={listRef}
          role="listbox"
          className="absolute left-0 right-0 top-11 z-50 max-h-72 overflow-y-auto rounded-xl border border-[#23221a] bg-[#0c0c08] p-1 shadow-2xl space-y-2"
        >
          {groupedRoles.length === 0 ? (
            <div className="p-3 text-center text-[#6f685a]">
              No role matching &quot;{search}&quot;. Press Enter to save as custom role.
            </div>
          ) : (
            groupedRoles.map((group) => (
              <div key={group.id} className="space-y-1">
                <div className="px-3 py-1 text-[9px] uppercase tracking-widest text-[#5a5448] font-bold border-b border-[#14140e]">
                  {group.label}
                </div>
                {group.roles.map((role) => {
                  const flatIdx = flatRoles.findIndex((r) => r.id === role.id);
                  const isActive = flatIdx === activeIndex;

                  return (
                    <button
                      key={role.id}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onMouseEnter={() => {
                        setActiveIndex(flatIdx);
                        setActiveNote(role.note);
                      }}
                      onClick={() => handleSelectRole(role)}
                      className={`w-full text-left p-2.5 rounded-lg transition flex flex-col gap-1 ${
                        isActive
                          ? "bg-[rgba(214,183,122,0.12)] border border-[var(--beam-gold)]/40"
                          : "hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-white text-xs">{role.label}</span>
                        <span className={`px-2 py-0.5 rounded text-[8.5px] uppercase font-mono border ${getTierChipClass(role.tier)}`}>
                          {role.tier.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#8a8070] font-sans line-clamp-2">{role.summary}</p>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
