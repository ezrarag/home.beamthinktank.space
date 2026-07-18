"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, type DocumentData } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { GoogleAuthProvider, getAdditionalUserInfo, getIdTokenResult, onAuthStateChanged, signInWithPopup } from "firebase/auth";
import { getFirebaseAuth, getFirebaseDb, getFirebaseStorage } from "@/lib/firebaseClient";
import { parseTakeawaysMarkdown } from "@/lib/parseTakeawaysMarkdown";
import { useAuthStore } from "@/store/authStore";
import { useMeetings } from "@/hooks/useMeetings";
import type { BeamMeeting, MeetingStatus, MeetingTakeaway } from "@/types/meeting";

type Suggestion = { id: string; text: string; submittedByEmail: string; voteCount: number };
type FormState = Omit<BeamMeeting, "id">;

const EMPTY_FORM: FormState = {
  title: "", dateISO: "", status: "upcoming", agenda: "", audioStoragePath: null,
  takeaways: [], invitees: [], order: 1, meetSpaceUri: null, meetSpaceName: null,
  meetConferenceRecordId: null, transcriptStoragePath: null, recordingStoragePath: null,
  transcriptDriveUri: null, recordingDriveUri: null,
};

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `meeting-${Date.now()}`;
}

function mapSuggestion(id: string, data: DocumentData): Suggestion {
  return { id, text: String(data.text ?? ""), submittedByEmail: String(data.submittedByEmail ?? ""), voteCount: Number(data.voteCount ?? 0) };
}

export default function AdminWorkstationPage() {
  const { user, hasInitializedAuth, initializeAuth } = useAuthStore();
  const { meetings, loading } = useMeetings(Boolean(user));
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [inviteesText, setInviteesText] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [takeawaysMarkdown, setTakeawaysMarkdown] = useState("");
  const [parsedTakeaways, setParsedTakeaways] = useState<MeetingTakeaway[]>([]);

  useEffect(() => initializeAuth(), [initializeAuth]);
  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    return onAuthStateChanged(getFirebaseAuth(), (firebaseUser) => {
      if (!firebaseUser) { setIsAdmin(false); return; }
      void getIdTokenResult(firebaseUser, true).then((result) => setIsAdmin(result.claims.admin === true));
    });
  }, [user]);
  useEffect(() => {
    if (!editingId || !user) { setSuggestions([]); return; }
    return onSnapshot(collection(getFirebaseDb(), "meetings", editingId, "agendaSuggestions"), (snapshot) => {
      setSuggestions(snapshot.docs.map((entry) => mapSuggestion(entry.id, entry.data())).sort((a, b) => b.voteCount - a.voteCount));
    });
  }, [editingId, user]);

  function editMeeting(meeting: BeamMeeting) {
    const { id, ...values } = meeting;
    setEditingId(id); setForm(values); setInviteesText(values.invitees.join("\n")); setTakeawaysMarkdown(""); setParsedTakeaways([]); setMessage(null); setError(null);
  }

  function newMeeting() {
    setEditingId(null); setForm({ ...EMPTY_FORM, order: meetings.length + 1 }); setInviteesText(""); setSuggestions([]); setTakeawaysMarkdown(""); setParsedTakeaways([]); setMessage(null); setError(null);
  }

  async function saveMeeting(event: FormEvent) {
    event.preventDefault(); setError(null); setMessage(null);
    if (!form.title.trim() || !form.dateISO) { setError("Title and date are required."); return; }
    const id = editingId || slugify(`${form.title}-${form.dateISO.slice(0, 10)}`);
    try {
      await setDoc(doc(getFirebaseDb(), "meetings", id), {
        ...form,
        title: form.title.trim(),
        agenda: form.agenda.trim(),
        invitees: inviteesText.split(/[\n,]/).map((value) => value.trim().toLowerCase()).filter(Boolean),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setEditingId(id); setMessage("Meeting saved.");
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : "Meeting could not be saved."); }
  }

  function updateTakeaway(index: number, patch: Partial<MeetingTakeaway>) {
    setForm((current) => ({ ...current, takeaways: current.takeaways.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) }));
  }

  function previewMarkdown() {
    const parsed = parseTakeawaysMarkdown(takeawaysMarkdown);
    setParsedTakeaways(parsed);
    setError(parsed.length ? null : "No takeaway sections were found. Use a Markdown heading such as ## Headline followed by body text.");
  }

  function applyMarkdownPreview() {
    if (!parsedTakeaways.length) return;
    setForm((current) => ({ ...current, takeaways: parsedTakeaways }));
    setMessage(`${parsedTakeaways.length} parsed takeaways added to this draft. Save the meeting to publish them.`);
  }

  function copySuggestionToAgenda(item: Suggestion) {
    setForm((current) => ({ ...current, agenda: current.agenda.trim() ? `${current.agenda.trim()}\n\n${item.text}` : item.text }));
    setMessage("Suggestion copied into the agenda draft. Save the meeting to publish it.");
  }

  async function uploadAudio(file: File) {
    if (!editingId) { setError("Save the meeting before uploading audio."); return; }
    setError(null); setUploadProgress(0);
    const path = `meetings/${editingId}/audio/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const storageRef = ref(getFirebaseStorage(), path);
    const task = uploadBytesResumable(storageRef, file, { contentType: file.type || "audio/mpeg" });
    task.on("state_changed", (snapshot) => setUploadProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)),
      (nextError) => { setError(nextError.message); setUploadProgress(null); },
      async () => {
        await getDownloadURL(storageRef);
        await setDoc(doc(getFirebaseDb(), "meetings", editingId), { audioStoragePath: path, updatedAt: serverTimestamp() }, { merge: true });
        setForm((current) => ({ ...current, audioStoragePath: path })); setUploadProgress(null); setMessage("Audio uploaded.");
      });
  }

  async function googleAccessToken() {
    const provider = new GoogleAuthProvider();
    provider.addScope("https://www.googleapis.com/auth/meetings.space.created");
    provider.addScope("https://www.googleapis.com/auth/meetings.space.readonly");
    provider.addScope("https://www.googleapis.com/auth/drive.readonly");
    const result = await signInWithPopup(getFirebaseAuth(), provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) throw new Error("Google did not return Meet authorization.");
    getAdditionalUserInfo(result);
    return credential.accessToken;
  }

  async function callMeetAction(action: "launch" | "sync") {
    if (!editingId) return;
    setBusyAction(action); setError(null); setMessage(null);
    try {
      const [firebaseToken, googleToken] = await Promise.all([getFirebaseAuth().currentUser!.getIdToken(true), googleAccessToken()]);
      const response = await fetch(`/api/admin/workstation/meet/${editingId}/${action}`, { method: "POST", headers: { Authorization: `Bearer ${firebaseToken}`, "x-google-access-token": googleToken } });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || `Meet ${action} failed.`);
      setMessage(action === "launch" ? "Google Meet space launched." : "Meet recording and transcript copied into Firebase Storage.");
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : `Meet ${action} failed.`); }
    finally { setBusyAction(null); }
  }

  if (!hasInitializedAuth || loading) return <main className="grid min-h-screen place-items-center bg-[#0e0e0e] text-white/55">Opening meeting administration...</main>;
  if (!user || !isAdmin) return <main className="grid min-h-screen place-items-center bg-[#0e0e0e] px-6 text-white"><div className="max-w-lg text-center"><p className="beam-eyebrow">Admin access required</p><h1 className="beam-display mt-4 text-5xl">Meetings &amp; Catch-Up</h1><p className="mt-5 text-white/55">Sign in with a Firebase account carrying the admin claim to manage meetings.</p><Link href="/admin" className="mt-6 inline-flex text-[var(--beam-gold)]">Return to Admin</Link></div></main>;

  return (
    <main className="min-h-screen bg-[#0e0e0e] px-5 py-10 text-white sm:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <aside><div className="flex items-center justify-between"><div><p className="beam-eyebrow">BEAM Admin</p><h1 className="beam-display mt-2 text-3xl">Meetings</h1></div><button onClick={newMeeting} className="rounded-full bg-[var(--beam-gold)] px-3 py-2 text-xs font-semibold text-black">+ New</button></div><div className="mt-6 space-y-2">{meetings.map((meeting) => <button key={meeting.id} onClick={() => editMeeting(meeting)} className={`w-full rounded-xl border p-4 text-left ${editingId === meeting.id ? "border-[var(--beam-gold)] bg-white/5" : "border-white/10"}`}><span className="text-[10px] uppercase tracking-wider text-[var(--beam-gold)]">{meeting.status}</span><p className="mt-1 text-sm">{meeting.title}</p><p className="mt-1 text-[10px] text-white/35">{new Date(meeting.dateISO).toLocaleString()}</p></button>)}</div><Link href="/admin" className="mt-6 inline-flex text-xs text-white/45 hover:text-white">← Admin portal</Link></aside>
        <form onSubmit={saveMeeting} className="beam-card rounded-[1.75rem] p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="beam-eyebrow">{editingId ? "Edit meeting" : "Create meeting"}</p><h2 className="beam-display mt-2 text-4xl">{form.title || "Untitled meeting"}</h2></div>{editingId ? <button type="button" onClick={() => void deleteDoc(doc(getFirebaseDb(), "meetings", editingId))} className="text-xs text-red-300">Delete meeting</button> : null}</div>
          {error ? <p className="mt-4 rounded-xl bg-red-400/10 p-3 text-sm text-red-200">{error}</p> : null}{message ? <p className="mt-4 rounded-xl bg-emerald-400/10 p-3 text-sm text-emerald-200">{message}</p> : null}
          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            <label className="sm:col-span-2 text-xs text-white/55">Title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"/></label>
            <label className="text-xs text-white/55">Date &amp; time<input type="datetime-local" value={form.dateISO.slice(0, 16)} onChange={(e) => setForm({ ...form, dateISO: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"/></label>
            <label className="text-xs text-white/55">Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as MeetingStatus })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#121317] p-3 text-sm text-white"><option value="past">Past</option><option value="current">Current</option><option value="upcoming">Upcoming</option></select></label>
            <label className="text-xs text-white/55">Sort order<input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"/></label>
            <label className="text-xs text-white/55">Conference record ID<input value={form.meetConferenceRecordId || ""} onChange={(e) => setForm({ ...form, meetConferenceRecordId: e.target.value || null })} placeholder="conferenceRecords/... or ID" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"/></label>
            <label className="sm:col-span-2 text-xs text-white/55">Agenda<textarea rows={4} value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"/></label>
            <label className="sm:col-span-2 text-xs text-white/55">Invitees (one email per line)<textarea rows={4} value={inviteesText} onChange={(e) => setInviteesText(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"/></label>
          </div>
          <section className="mt-8 border-t border-white/10 pt-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-medium">NotebookLM takeaways</h3><p className="mt-1 text-xs text-white/40">Paste Markdown headings and body text, preview, then apply to the meeting draft.</p></div><button type="button" onClick={() => setForm({ ...form, takeaways: [...form.takeaways, { heading: "", body: "" }] })} className="text-xs text-[var(--beam-gold)]">+ Add manually</button></div><textarea value={takeawaysMarkdown} onChange={(e) => { setTakeawaysMarkdown(e.target.value); setParsedTakeaways([]); }} rows={9} placeholder={'## First takeaway\nWhat the group decided and why.\n\n## Next action\nWhat happens next and who owns it.'} className="mt-4 w-full rounded-xl border border-white/10 bg-black/30 p-4 font-mono text-xs leading-6 text-white outline-none focus:border-[var(--beam-gold)]"/><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={previewMarkdown} disabled={!takeawaysMarkdown.trim()} className="rounded-full border border-white/15 px-4 py-2 text-xs disabled:opacity-40">Preview parsed takeaways</button>{parsedTakeaways.length ? <button type="button" onClick={applyMarkdownPreview} className="rounded-full bg-[var(--beam-gold)] px-4 py-2 text-xs font-semibold text-black">Use these {parsedTakeaways.length} takeaways</button> : null}</div>{parsedTakeaways.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{parsedTakeaways.map((item, index) => <article key={`${item.heading}-${index}`} className="rounded-xl border border-[var(--beam-gold)]/25 bg-[var(--beam-gold)]/5 p-4"><p className="text-xs font-semibold text-[var(--beam-gold)]">{item.heading}</p><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-white/55">{item.body}</p></article>)}</div> : null}<div className="mt-6 space-y-4">{form.takeaways.map((item, index) => <div key={index} className="rounded-xl border border-white/10 p-4"><input value={item.heading} onChange={(e) => updateTakeaway(index, { heading: e.target.value })} placeholder="Heading" className="w-full bg-transparent font-medium outline-none"/><textarea value={item.body} onChange={(e) => updateTakeaway(index, { body: e.target.value })} rows={3} placeholder="Body" className="mt-3 w-full resize-none rounded-lg bg-black/20 p-3 text-sm text-white/65 outline-none"/><button type="button" onClick={() => setForm({ ...form, takeaways: form.takeaways.filter((_, i) => i !== index) })} className="mt-2 text-[10px] text-red-300">Remove</button></div>)}</div></section>
          <section className="mt-8 grid gap-4 border-t border-white/10 pt-6 sm:grid-cols-2"><div><h3 className="font-medium">Meeting audio</h3><input type="file" accept="audio/*" disabled={!editingId} onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadAudio(file); }} className="mt-3 block w-full text-xs text-white/50"/>{uploadProgress !== null ? <p className="mt-2 text-xs text-[var(--beam-gold)]">Uploading {uploadProgress}%</p> : form.audioStoragePath ? <p className="mt-2 break-all text-[10px] text-white/35">{form.audioStoragePath}</p> : null}</div><div><h3 className="font-medium">Google Meet</h3><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={!editingId || busyAction !== null} onClick={() => void callMeetAction("launch")} className="rounded-full border border-white/15 px-3 py-2 text-xs">{busyAction === "launch" ? "Launching..." : "Launch meeting"}</button><button type="button" disabled={!editingId || !form.meetConferenceRecordId || busyAction !== null} onClick={() => void callMeetAction("sync")} className="rounded-full border border-white/15 px-3 py-2 text-xs">{busyAction === "sync" ? "Syncing..." : "Sync recording"}</button></div>{form.meetSpaceUri ? <a href={form.meetSpaceUri} target="_blank" rel="noreferrer" className="mt-3 block text-xs text-[var(--beam-gold)]">Open Meet ↗</a> : null}</div></section>
          {editingId ? <section className="mt-8 border-t border-white/10 pt-6"><h3 className="font-medium">Agenda suggestions</h3><div className="mt-3 space-y-2">{suggestions.length === 0 ? <p className="text-xs text-white/35">No suggestions yet.</p> : suggestions.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-black/20 p-3 text-sm"><div className="min-w-0 flex-1"><p>{item.text}</p><p className="mt-1 text-[10px] text-white/35">{item.voteCount} votes · {item.submittedByEmail}</p></div><div className="flex gap-3"><button type="button" onClick={() => copySuggestionToAgenda(item)} className="text-[10px] text-[var(--beam-gold)]">Copy to agenda</button><button type="button" onClick={() => void deleteDoc(doc(getFirebaseDb(), "meetings", editingId, "agendaSuggestions", item.id))} className="text-[10px] text-red-300">Delete</button></div></div>)}</div></section> : null}
          <button type="submit" className="mt-8 rounded-full bg-[var(--beam-gold)] px-6 py-3 text-xs font-semibold uppercase tracking-wider text-black">Save meeting</button>
        </form>
      </div>
    </main>
  );
}
