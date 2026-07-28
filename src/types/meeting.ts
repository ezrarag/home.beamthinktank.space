export type MeetingStatus = "past" | "current" | "upcoming";

export type MeetingTakeaway = {
  heading: string;
  body: string;
};

export type BeamMeeting = {
  id: string;
  title: string;
  dateISO: string;
  status: MeetingStatus;
  agenda: string;
  audioStoragePath: string | null;
  takeaways: MeetingTakeaway[];
  invitees: string[];
  restrictToInvitees: boolean;
  order: number;
  meetSpaceUri: string | null;
  meetSpaceName: string | null;
  meetConferenceRecordId: string | null;
  transcriptStoragePath: string | null;
  recordingStoragePath: string | null;
  transcriptDriveUri: string | null;
  recordingDriveUri: string | null;
  sourceFolderUri: string | null;
  recordingDriveFileId: string | null;
  transcriptDriveFileId: string | null;
  sourceRevision: string | null;
  sourceImportedAt: string | null;
};
