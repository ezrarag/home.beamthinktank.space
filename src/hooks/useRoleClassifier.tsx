'use client';

import { useMemo, useState } from 'react';
import LocationDetector from '@/components/LocationDetector';
import type { UserRole, UserLocation } from '@/store/userStore';

const PARTICIPANT_KEYWORDS = [
  'study', 'learn', 'class', 'course', 'join', 'engineering', 'orchestra', 'music', 'construction', 'student'
];
const COMMUNITY_KEYWORDS = [
  'support', 'donate', 'sponsor', 'mentor', 'help', 'back', 'fund'
];

function deduceRole(location: UserLocation | null, text: string): UserRole | null {
  const lowered = text.toLowerCase();
  const matches = (list: string[]) => list.some((k) => lowered.includes(k));

  if (!text.trim() && location) {
    return location.isNearUniversity ? 'participant' : 'community';
  }
  if (matches(PARTICIPANT_KEYWORDS)) return 'participant';
  if (matches(COMMUNITY_KEYWORDS)) return 'community';
  if (location) return location.isNearUniversity ? 'participant' : 'community';
  return null;
}

export function useRoleClassifier(inputText: string) {
  const [location, setLocation] = useState<UserLocation | null>(null);

  const onDetected = (loc: UserLocation) => {
    setLocation(loc);
  };

  const role = useMemo<UserRole | null>(() => deduceRole(location, inputText), [location, inputText]);

  const Detector = (
    <LocationDetector onLocationDetected={onDetected} />
  );

  return { location, role, Detector };
}

export type { UserLocation };


