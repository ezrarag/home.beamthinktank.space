"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, type DocumentData } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebaseClient";
import type { BeamMeeting, MeetingStatus, MeetingTakeaway } from "@/types/meeting";

function normalizeMeeting(id: string, data: DocumentData): BeamMeeting {
  return {
    id,
    title: String(data.title ?? "Untitled meeting"),
    dateISO: String(data.dateISO ?? ""),
    status: (["past", "current", "upcoming"].includes(data.status) ? data.status : "upcoming") as MeetingStatus,
    agenda: String(data.agenda ?? ""),
    audioStoragePath: typeof data.audioStoragePath === "string" ? data.audioStoragePath : null,
    takeaways: Array.isArray(data.takeaways)
      ? data.takeaways.map((item: MeetingTakeaway) => ({ heading: String(item.heading ?? ""), body: String(item.body ?? "") }))
      : [],
    invitees: Array.isArray(data.invitees) ? data.invitees.map(String) : [],
    restrictToInvitees: data.restrictToInvitees === true,
    order: Number(data.order ?? 0),
    meetSpaceUri: typeof data.meetSpaceUri === "string" ? data.meetSpaceUri : null,
    meetSpaceName: typeof data.meetSpaceName === "string" ? data.meetSpaceName : null,
    meetConferenceRecordId: typeof data.meetConferenceRecordId === "string" ? data.meetConferenceRecordId : null,
    transcriptStoragePath: typeof data.transcriptStoragePath === "string" ? data.transcriptStoragePath : null,
    recordingStoragePath: typeof data.recordingStoragePath === "string" ? data.recordingStoragePath : null,
    transcriptDriveUri: typeof data.transcriptDriveUri === "string" ? data.transcriptDriveUri : null,
    recordingDriveUri: typeof data.recordingDriveUri === "string" ? data.recordingDriveUri : null,
  };
}

export function useMeetings(enabled = true) {
  const [meetings, setMeetings] = useState<BeamMeeting[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) {
      setMeetings([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    return onSnapshot(
      collection(getFirebaseDb(), "meetings"),
      (snapshot) => {
        setMeetings(snapshot.docs.map((entry) => normalizeMeeting(entry.id, entry.data())).sort((a, b) => a.order - b.order || a.dateISO.localeCompare(b.dateISO)));
        setLoading(false);
      },
      (nextError) => { setError(nextError); setLoading(false); },
    );
  }, [enabled]);

  return { meetings, loading, error };
}
