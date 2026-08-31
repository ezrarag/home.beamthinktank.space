"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, type DocumentData } from "firebase/firestore";

import { getFirebaseDb } from "@/lib/firebaseClient";
import type { BusinessFunction, ProfessionalProfile } from "@/types/participantIdentity";

const PROFESSIONAL_PROFILES_COLLECTION = "professionalProfiles";

export interface UseProfessionalProfileResult {
  profile: ProfessionalProfile | null;
  loading: boolean;
  error: Error | null;
}

function toIsoString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toDate" in value) {
    const toDate = (value as { toDate?: unknown }).toDate;
    if (typeof toDate === "function") {
      return (toDate.call(value) as Date).toISOString();
    }
  }
  return new Date().toISOString();
}

function normalizeProfile(id: string, data: DocumentData): ProfessionalProfile {
  return {
    id: data.id || id,
    participantUid: data.participantUid || id,
    businessFunctions: Array.isArray(data.businessFunctions)
      ? (data.businessFunctions as BusinessFunction[])
      : [],
    bio: typeof data.bio === "string" ? data.bio : "",
    rateType: data.rateType ? (data.rateType as ProfessionalProfile["rateType"]) : undefined,
    rate: typeof data.rate === "number" ? data.rate : undefined,
    portfolioLinks: Array.isArray(data.portfolioLinks)
      ? data.portfolioLinks.filter((link): link is string => typeof link === "string")
      : [],
    matchedDomains: Array.isArray(data.matchedDomains)
      ? data.matchedDomains.filter((d): d is string => typeof d === "string")
      : [],
    matchedProjectIds: Array.isArray(data.matchedProjectIds)
      ? data.matchedProjectIds.filter((p): p is string => typeof p === "string")
      : [],
    availability: typeof data.availability === "string" ? data.availability : undefined,
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

export function useProfessionalProfile(uid: string | null | undefined): UseProfessionalProfileResult {
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const docRef = doc(getFirebaseDb(), PROFESSIONAL_PROFILES_COLLECTION, uid);

    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setProfile(normalizeProfile(snapshot.id, snapshot.data()));
        } else {
          setProfile(null);
        }
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError);
        setLoading(false);
      }
    );
  }, [uid]);

  return { profile, loading, error };
}
