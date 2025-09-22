"use client";

import { motion } from "framer-motion";

const BENEFITS = ["Flights", "Rides", "Hotels"];

export default function CommunityDashboard() {
  return (
    <main className="min-h-[calc(100vh-56px)] bg-[#1A1C21] text-white px-4">
      <div className="max-w-5xl mx-auto py-10 space-y-8">
        <motion.h1 initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-semibold">Community Portal</motion.h1>

        <section className="rounded-2xl border border-[#23262B] bg-[#1D2127] p-6">
          <h2 className="text-xl font-medium mb-2">Subscription Module</h2>
          <p className="text-sm text-neutral-300 mb-4">$75/month subscription</p>
          <ul className="text-sm text-neutral-300 list-disc pl-5 mb-4 space-y-1">
            {BENEFITS.map((b) => (<li key={b}>{b}</li>))}
          </ul>
          <button className="rounded-md bg-[#89C0D0] text-[#0c1215] px-4 py-2 text-sm font-medium hover:brightness-95">Activate Subscription</button>
        </section>

        <section className="rounded-2xl border border-[#23262B] bg-[#1D2127] p-6">
          <h2 className="text-xl font-medium mb-2">Support a Participant/NGO</h2>
          <a href="https://hood.beamthinktank.space" className="text-[#89C0D0] hover:underline text-sm">Go to hood.beamthinktank.space</a>
        </section>

        <section className="rounded-2xl border border-[#23262B] bg-[#1D2127] p-6">
          <h2 className="text-xl font-medium mb-2">Combination Option</h2>
          <label className="inline-flex items-center gap-2 text-sm text-neutral-300">
            <input type="checkbox" className="accent-[#89C0D0]" />
            Allow both subscription + support
          </label>
        </section>
      </div>
    </main>
  );
}


