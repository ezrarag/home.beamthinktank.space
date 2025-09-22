"use client";

import { motion } from "framer-motion";

const NGO_MAP: Record<string, string> = {
  engineering: "engineering.beamthinktank.space",
  music: "orchestra.beamthinktank.space",
};

export default function ParticipantDashboard() {
  return (
    <main className="min-h-[calc(100vh-56px)] bg-[#1A1C21] text-white px-4">
      <div className="max-w-5xl mx-auto py-10 space-y-8">
        <motion.h1 initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-semibold">Participant Dashboard</motion.h1>

        <section className="rounded-2xl border border-[#23262B] bg-[#1D2127] p-6">
          <h2 className="text-xl font-medium mb-2">NGO Mappings</h2>
          <p className="text-sm text-neutral-300 mb-4">Your chosen fields → NGO links placeholder</p>
          <ul className="space-y-2 text-sm">
            {Object.entries(NGO_MAP).map(([k, v]) => (
              <li key={k} className="flex justify-between border-b border-white/5 pb-2 last:border-none last:pb-0">
                <span className="text-neutral-300">{k}</span>
                <a href={`https://${v}`} className="text-[#89C0D0] hover:underline">{v}</a>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-[#23262B] bg-[#1D2127] p-6">
          <h2 className="text-xl font-medium mb-2">Subscription Module</h2>
          <button className="rounded-md bg-[#89C0D0] text-[#0c1215] px-4 py-2 text-sm font-medium hover:brightness-95">Activate Subscription</button>
        </section>

        <section className="rounded-2xl border border-[#23262B] bg-[#1D2127] p-6">
          <h2 className="text-xl font-medium mb-2">Payment Area</h2>
          <p className="text-sm text-neutral-300">Placeholder for future integration.</p>
        </section>
      </div>
    </main>
  );
}


