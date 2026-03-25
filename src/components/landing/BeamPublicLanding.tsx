"use client";

import { useEffect, useState } from "react";
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebaseClient";
import { ActivityTicker } from "@/components/landing/ActivityTicker";
import { HeroSection } from "@/components/landing/HeroSection";
import { JoinCTA } from "@/components/landing/JoinCTA";
import { NetworkMapSection } from "@/components/landing/NetworkMapSection";
import { PublicFooter } from "@/components/landing/PublicFooter";
import { PublicNav } from "@/components/landing/PublicNav";
import { TrustRail } from "@/components/landing/TrustRail";
import { WhoSection } from "@/components/landing/WhoSection";
import { ThesisSection } from "@/components/thesis/ThesisSection";
import type { BeamNode } from "@/lib/server/firestoreNodes";

const TICKER_ITEMS = [
  "Milwaukee node flagged as active",
  "Urban housing brief added to the network",
  "Atlanta cohort marked incoming",
  "Policy synthesis updated across 800+ sources",
  "Orlando node requesting community partners",
  "Methodology rail refreshed for public review",
];

export function BeamPublicLanding() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [publicNodes, setPublicNodes] = useState<BeamNode[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadNodes() {
      try {
        const response = await fetch("/api/nodes/public", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Failed to load public nodes: ${response.status}`);
        }
        const payload = (await response.json()) as { nodes?: BeamNode[] };
        if (!cancelled) {
          setPublicNodes(Array.isArray(payload.nodes) ? payload.nodes : []);
        }
      } catch {
        if (!cancelled) {
          setPublicNodes([]);
        }
      }
    }

    void loadNodes();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSignIn() {
    setSignInError(null);
    setIsSigningIn(true);

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
    } catch (error) {
      setSignInError(error instanceof Error ? error.message : "Google sign-in failed.");
    } finally {
      setIsSigningIn(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--beam-bg-base)] text-[var(--beam-text-primary)]">
      <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[32px] border border-[color:var(--beam-border)] bg-[rgba(7,7,6,0.88)] shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
          <PublicNav onSignIn={handleSignIn} isSigningIn={isSigningIn} />
          <ActivityTicker items={TICKER_ITEMS} />
          {signInError ? (
            <div className="border-b border-[color:var(--beam-border)] bg-[rgba(200,66,66,0.08)] px-6 py-3 text-sm text-[#f5c7c7] sm:px-8">
              {signInError}
            </div>
          ) : null}

          <div className="space-y-8 px-4 py-8 sm:px-8 sm:py-10 lg:space-y-10 lg:px-10 lg:py-12">
            <HeroSection activeNodeCount={publicNodes.length} />
            <NetworkMapSection nodes={publicNodes} />
            <ThesisSection />
            <WhoSection />
            <TrustRail />
            <JoinCTA />
          </div>

          <PublicFooter />
        </div>
      </div>
    </main>
  );
}
