"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BeamEntryExperience from "@/components/BeamEntryExperience";
import { getFirebaseAuth } from "@/lib/firebaseClient";
import { useAuthStore } from "@/store/authStore";
import { BeamPublicLanding } from "@/components/landing/BeamPublicLanding";

function LoadingShell() {
  return (
    <main className="min-h-screen bg-[var(--beam-bg-base)] px-4 py-6 text-[var(--beam-text-primary)] sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl items-center justify-center rounded-[32px] border border-[color:var(--beam-border)] bg-[rgba(8,8,8,0.84)] px-6">
        <div className="space-y-4 text-center">
          <p className="beam-eyebrow">BEAM Network</p>
          <div className="mx-auto h-12 w-12 animate-pulse rounded-full border border-[color:var(--beam-gold)] bg-[rgba(200,185,122,0.12)]" />
          <p className="text-sm text-[var(--beam-text-secondary)]">Loading entry context.</p>
        </div>
      </div>
    </main>
  );
}

export function HomeRouteGate() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const hasInitializedAuth = useAuthStore((state) => state.hasInitializedAuth);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const [hasMounted, setHasMounted] = useState(false);
  const [isResolvingRoute, setIsResolvingRoute] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    const fallbackEmail = user?.email ?? null;
    if (!fallbackEmail) {
      setIsResolvingRoute(false);
      return;
    }

    let cancelled = false;

    async function resolveRoute() {
      setIsResolvingRoute(true);

      try {
        const auth = getFirebaseAuth();
        const currentUser = auth.currentUser;
        const email = currentUser?.email ?? fallbackEmail;

        if (!currentUser || !email) {
          if (!cancelled) setIsResolvingRoute(false);
          return;
        }

        const idToken = await currentUser.getIdToken(true);
        const adminResponse = await fetch(`/api/admin/users/lookup?email=${encodeURIComponent(email)}`, {
          cache: "no-store",
        });
        const adminPayload = (await adminResponse.json().catch(() => ({}))) as {
          adminUser?: { active?: boolean };
        };

        if (adminResponse.ok && adminPayload.adminUser?.active) {
          router.replace("/admin");
          return;
        }

        const ragResponse = await fetch("/api/auth/rag-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, idToken }),
        });
        const ragPayload = (await ragResponse.json().catch(() => ({}))) as { allowed?: boolean };

        if (ragResponse.ok && ragPayload.allowed) {
          router.replace("/portal");
          return;
        }
      } catch (error) {
        console.warn("Failed to resolve authenticated route", error);
      } finally {
        if (!cancelled) {
          setIsResolvingRoute(false);
        }
      }
    }

    void resolveRoute();

    return () => {
      cancelled = true;
    };
  }, [router, user?.email]);

  if (!hasMounted || (!hasInitializedAuth && !user) || (user && isResolvingRoute)) {
    return <LoadingShell />;
  }

  if (user) {
    return <BeamEntryExperience />;
  }

  return <BeamPublicLanding />;
}
