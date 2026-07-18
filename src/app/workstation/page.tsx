"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { addDoc, collection, deleteDoc, doc, getCountFromServer, getDoc, onSnapshot, query, runTransaction, serverTimestamp, setDoc, where, type DocumentData } from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect } from "firebase/auth";
import { getFirebaseAuth, getFirebaseDb, getFirebaseStorage } from "@/lib/firebaseClient";
import { useAuthStore } from "@/store/authStore";
import { useBeamProcesses } from "@/hooks/useBeamProcesses";
import { useMeetings } from "@/hooks/useMeetings";
import type { BeamMeeting } from "@/types/meeting";

type Comment = { id: string; userId: string; authorName: string; body: string; audioSeconds: number | null; createdAt: { toDate?: () => Date } | null };
type AgendaSuggestion = { id: string; text: string; submittedByEmail: string; voteCount: number };

function normalizeComment(id: string, data: DocumentData): Comment {
  return { id, userId: String(data.userId ?? ""), authorName: String(data.authorName ?? "Collaborator"), body: String(data.body ?? ""), audioSeconds: typeof data.audioSeconds === "number" ? data.audioSeconds : null, createdAt: data.createdAt ?? null };
}

function formatDate(dateISO: string) {
  if (!dateISO) return "Date TBD";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(dateISO));
}

function formatAudioTime(seconds: number) { return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`; }

function canUserAccessMeeting(meeting: BeamMeeting, userEmail: string) {
  return !meeting.restrictToInvitees || (Boolean(userEmail) && meeting.invitees.some((email) => email.trim().toLowerCase() === userEmail));
}

export default function WorkstationPage() {
  const { user, hasInitializedAuth, initializeAuth, logout } = useAuthStore();
  const { meetings, loading: meetingsLoading, error: meetingsError } = useMeetings(Boolean(user));
  const { processes: grants, loading: grantsLoading, error: grantsError } = useBeamProcesses("grants", Boolean(user));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reviewed, setReviewed] = useState(false);
  const [attendanceCounts, setAttendanceCounts] = useState<Record<string, number>>({});
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  const [commentBody, setCommentBody] = useState("");
  const [includeTimestamp, setIncludeTimestamp] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const [agendaSuggestions, setAgendaSuggestions] = useState<AgendaSuggestion[]>([]);
  const [votedSuggestionIds, setVotedSuggestionIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const deepLinkApplied = useRef(false);
  const expanded = meetings.find((meeting) => meeting.id === expandedId) ?? null;
  const userEmail = user?.email?.trim().toLowerCase() ?? "";
  const canViewExpanded = expanded ? canUserAccessMeeting(expanded, userEmail) : false;

  useEffect(() => initializeAuth(), [initializeAuth]);
  useEffect(() => {
    if (meetings.length === 0 || deepLinkApplied.current) return;
    const requestedId = new URLSearchParams(window.location.search).get("meeting");
    const requested = requestedId ? meetings.find((meeting) => meeting.id === requestedId) : null;
    setExpandedId(requested?.id ?? meetings.find((meeting) => meeting.status === "current")?.id ?? meetings[0]?.id ?? null);
    deepLinkApplied.current = true;
  }, [meetings]);
  useEffect(() => {
    if (!user) return;
    const returnUrl = sessionStorage.getItem("beam-workstation-return-url");
    if (!returnUrl) return;
    sessionStorage.removeItem("beam-workstation-return-url");
    try {
      const parsed = new URL(returnUrl);
      if (parsed.origin === window.location.origin && parsed.href !== window.location.href) window.location.replace(parsed.href);
    } catch { /* Ignore malformed device-local return URLs. */ }
  }, [user]);
  useEffect(() => {
    if (!user || meetings.length === 0) return;
    const visibleMeetings = meetings.filter((meeting) => canUserAccessMeeting(meeting, userEmail));
    void Promise.all(visibleMeetings.map(async (meeting) => ({ id: meeting.id, count: (await getCountFromServer(collection(getFirebaseDb(), "meetings", meeting.id, "attendance"))).data().count }))).then((values) => setAttendanceCounts(Object.fromEntries(values.map((item) => [item.id, item.count]))));
  }, [meetings, user, userEmail]);
  useEffect(() => {
    if (!user || !expandedId || !canViewExpanded) { setComments([]); setReviewed(false); return; }
    const db = getFirebaseDb();
    const stopComments = onSnapshot(query(collection(db, "workstationComments"), where("meetingId", "==", expandedId)), (snapshot) => setComments(snapshot.docs.map((entry) => normalizeComment(entry.id, entry.data())).sort((a, b) => (b.createdAt?.toDate?.().getTime() ?? 0) - (a.createdAt?.toDate?.().getTime() ?? 0))));
    const stopAttendance = onSnapshot(doc(db, "meetings", expandedId, "attendance", user.uid), (snapshot) => setReviewed(snapshot.exists() && snapshot.data().caughtUp === true));
    return () => { stopComments(); stopAttendance(); };
  }, [canViewExpanded, expandedId, user]);
  useEffect(() => {
    setAudioUrl(null);
    if (!expanded?.audioStoragePath || !canViewExpanded) return;
    void getDownloadURL(ref(getFirebaseStorage(), expanded.audioStoragePath)).then(setAudioUrl).catch(() => setMessage("The meeting audio could not be loaded."));
  }, [canViewExpanded, expanded?.audioStoragePath]);
  useEffect(() => {
    if (!user || !expanded || !canViewExpanded || expanded.status !== "upcoming") { setAgendaSuggestions([]); setVotedSuggestionIds(new Set()); return; }
    return onSnapshot(collection(getFirebaseDb(), "meetings", expanded.id, "agendaSuggestions"), (snapshot) => {
      setAgendaSuggestions(snapshot.docs.map((entry) => ({ id: entry.id, text: String(entry.data().text ?? ""), submittedByEmail: String(entry.data().submittedByEmail ?? ""), voteCount: Number(entry.data().voteCount ?? 0) })).sort((a, b) => b.voteCount - a.voteCount));
    });
  }, [canViewExpanded, expanded, user]);
  useEffect(() => {
    if (!user || !expanded || !agendaSuggestions.length) { setVotedSuggestionIds(new Set()); return; }
    let active = true;
    void Promise.all(agendaSuggestions.map(async (item) => ({ id: item.id, voted: (await getDoc(doc(getFirebaseDb(), "meetings", expanded.id, "agendaSuggestions", item.id, "votes", user.uid))).exists() }))).then((results) => {
      if (active) setVotedSuggestionIds(new Set(results.filter((item) => item.voted).map((item) => item.id)));
    });
    return () => { active = false; };
  }, [agendaSuggestions, expanded, user]);

  async function signIn() {
    const provider = new GoogleAuthProvider();
    sessionStorage.setItem("beam-workstation-return-url", window.location.href);
    try { await signInWithPopup(getFirebaseAuth(), provider); }
    catch (error) { const code = typeof error === "object" && error && "code" in error ? String(error.code) : ""; if (code === "auth/popup-blocked") await signInWithRedirect(getFirebaseAuth(), provider); else setMessage(error instanceof Error ? error.message : "Sign-in failed."); }
  }
  function changeSpeed(next: number) { setSpeed(next); if (audioRef.current) audioRef.current.playbackRate = next; }
  async function toggleReviewed() {
    if (!user || !expanded || !canViewExpanded) return;
    await setDoc(doc(getFirebaseDb(), "meetings", expanded.id, "attendance", user.uid), { userId: user.uid, caughtUp: !reviewed, updatedAt: serverTimestamp() }, { merge: true });
    setAttendanceCounts((current) => ({ ...current, [expanded.id]: Math.max(0, (current[expanded.id] ?? 0) + (reviewed ? -1 : 1)) }));
  }
  async function postComment(event: FormEvent) {
    event.preventDefault(); if (!user || !expanded || !canViewExpanded || !commentBody.trim()) return;
    await addDoc(collection(getFirebaseDb(), "workstationComments"), { meetingId: expanded.id, userId: user.uid, authorName: user.displayName || user.email || "Collaborator", authorEmail: user.email || "", body: commentBody.trim(), audioSeconds: includeTimestamp && audioRef.current ? Math.floor(audioRef.current.currentTime) : null, createdAt: serverTimestamp() });
    setCommentBody(""); setIncludeTimestamp(false);
  }
  async function suggestTopic(event: FormEvent) {
    event.preventDefault(); if (!user?.email || !expanded || !canViewExpanded || !suggestion.trim()) return;
    await addDoc(collection(getFirebaseDb(), "meetings", expanded.id, "agendaSuggestions"), { text: suggestion.trim(), submittedByEmail: user.email.toLowerCase(), createdAt: serverTimestamp(), voteCount: 0 });
    setSuggestion(""); setMessage("Topic suggested for the agenda.");
  }
  async function toggleSuggestionVote(item: AgendaSuggestion) {
    if (!user || !expanded || !canViewExpanded) return;
    const db = getFirebaseDb();
    const suggestionRef = doc(db, "meetings", expanded.id, "agendaSuggestions", item.id);
    const voteRef = doc(db, "meetings", expanded.id, "agendaSuggestions", item.id, "votes", user.uid);
    await runTransaction(db, async (transaction) => {
      const [suggestionSnapshot, voteSnapshot] = await Promise.all([transaction.get(suggestionRef), transaction.get(voteRef)]);
      if (!suggestionSnapshot.exists()) throw new Error("That suggestion no longer exists.");
      const count = Number(suggestionSnapshot.data().voteCount ?? 0);
      if (voteSnapshot.exists()) {
        transaction.delete(voteRef);
        transaction.update(suggestionRef, { voteCount: Math.max(0, count - 1) });
      } else {
        transaction.set(voteRef, { userId: user.uid, createdAt: serverTimestamp() });
        transaction.update(suggestionRef, { voteCount: count + 1 });
      }
    });
  }

  function meetingStack() {
    if (!expanded) return null;
    return <section className="border-t border-white/10 pt-8"><p className="beam-eyebrow">Meeting stack</p><div className="mt-4 space-y-2">{meetings.filter((meeting)=>meeting.id!==expanded.id).map((meeting)=>{ const allowed = canUserAccessMeeting(meeting, userEmail); return <button key={meeting.id} disabled={!allowed} onClick={()=>{setExpandedId(meeting.id);window.history.replaceState(null,"",`/workstation?meeting=${encodeURIComponent(meeting.id)}`);window.scrollTo({top:0,behavior:"smooth"});}} className={`grid w-full grid-cols-[1fr_auto] items-center gap-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-left sm:grid-cols-[7rem_1fr_auto] ${allowed ? "hover:border-white/25" : "cursor-not-allowed opacity-55"}`}><span className="text-[10px] uppercase tracking-wider text-[var(--beam-gold)]">{meeting.status}</span><div><h3 className="font-medium">{meeting.title}</h3><p className="mt-1 text-xs text-white/35">{formatDate(meeting.dateISO)}</p></div><span className="text-xs text-white/45">{!allowed ? "Invited participants only" : meeting.status === "upcoming" ? `starts ${formatDate(meeting.dateISO)}` : `${attendanceCounts[meeting.id]??0} caught up`}</span></button>;})}</div></section>;
  }

  if (!hasInitializedAuth || meetingsLoading) return <main className="grid min-h-screen place-items-center bg-[#090a09] text-white/55">Opening the workstation...</main>;
  if (!user) return <main className="grid min-h-screen place-items-center bg-[#090a09] px-6 text-[#f0ead6]"><section className="beam-card max-w-xl rounded-[2rem] p-10 text-center"><p className="beam-eyebrow">BEAM Catch-Up Workstation</p><h1 className="beam-display mt-5 text-6xl">Come into the room.</h1><p className="mt-5 text-sm leading-7 text-white/55">Review meetings, catch up on decisions, and help shape what comes next.</p><button onClick={() => void signIn()} className="mt-8 rounded-full bg-[var(--beam-gold)] px-6 py-3 text-xs font-semibold uppercase tracking-wider text-black">Continue with Google</button></section></main>;
  if (meetingsError || !expanded) return <main className="grid min-h-screen place-items-center bg-[#090a09] text-red-200">{meetingsError?.message || "No meetings are available yet."}</main>;
  if (!canViewExpanded) return <main className="min-h-screen bg-[#090a09] text-[#f0ead6]"><header className="sticky top-0 z-40 border-b border-white/10 bg-[#090a09]/90 px-5 py-4 backdrop-blur-xl"><div className="mx-auto flex max-w-7xl justify-between"><Link href="/" className="beam-eyebrow text-[var(--beam-gold-bright)]">BEAM / Workstation</Link><button onClick={() => void logout()} className="text-xs text-white/50">Sign out</button></div></header><div className="mx-auto max-w-7xl px-5 py-10 sm:px-8"><section className="grid gap-7 border-b border-white/10 pb-10 lg:grid-cols-[1.2fr_0.8fr]"><div><p className="beam-eyebrow">{expanded.status} · {formatDate(expanded.dateISO)}</p><h1 className="beam-display mt-4 text-5xl leading-[0.92] sm:text-7xl">{expanded.title}</h1></div><div className="flex items-end"><div className="w-full rounded-2xl border border-amber-300/20 bg-amber-300/5 p-5"><p className="text-sm font-medium text-amber-100">Restricted to invited participants</p><p className="mt-2 text-xs leading-6 text-white/45">This meeting link is valid, but the email you signed in with is not on its invitee list.</p></div></div></section><div className="pt-8">{meetingStack()}</div></div></main>;

  return (
    <main className="min-h-screen bg-[#090a09] text-[#f0ead6]">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#090a09]/90 px-5 py-4 backdrop-blur-xl"><div className="mx-auto flex max-w-7xl justify-between"><Link href="/" className="beam-eyebrow text-[var(--beam-gold-bright)]">BEAM / Workstation</Link><div className="flex items-center gap-3 text-xs text-white/50"><span className="hidden sm:inline">{user.displayName || user.email}</span><button onClick={() => void logout()}>Sign out</button></div></div></header>
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <section className="grid gap-7 border-b border-white/10 pb-10 lg:grid-cols-[1.2fr_0.8fr]"><div><p className="beam-eyebrow">{expanded.status} · {formatDate(expanded.dateISO)}</p><h1 className="beam-display mt-4 text-5xl leading-[0.92] sm:text-7xl">{expanded.title}</h1></div><div className="flex flex-col justify-end gap-4"><p className="text-sm leading-7 text-white/50">{expanded.agenda || "Agenda forthcoming."}</p>{expanded.status !== "upcoming" ? <button onClick={() => void toggleReviewed()} className={`rounded-2xl border p-4 text-left ${reviewed ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" : "border-white/15 bg-white/[0.03]"}`}>{reviewed ? "✓ You're caught up" : "○ Mark me as caught up"}</button> : null}{expanded.meetSpaceUri ? <a href={expanded.meetSpaceUri} target="_blank" rel="noreferrer" className="rounded-full bg-[var(--beam-gold)] px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-black">Join Google Meet ↗</a> : null}</div></section>
        {message ? <p className="mt-5 rounded-xl border border-white/10 p-3 text-sm text-white/65">{message}</p> : null}
        <div className="grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_22rem]"><div className="space-y-7">
          {expanded.status === "upcoming" ? <section className="beam-card rounded-[1.75rem] p-6 sm:p-8"><p className="beam-eyebrow">Shape the agenda</p><h2 className="beam-display mt-2 text-3xl">What should be in the room?</h2><p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-white/55">{expanded.agenda || "The agenda is still open."}</p><form onSubmit={suggestTopic} className="mt-6 flex gap-2"><input value={suggestion} onChange={(e) => setSuggestion(e.target.value)} placeholder="Suggest a topic or question" className="min-w-0 flex-1 rounded-full border border-white/15 bg-black/30 px-4 py-3 text-sm outline-none focus:border-[var(--beam-gold)]"/><button className="rounded-full bg-[var(--beam-gold)] px-5 text-xs font-semibold text-black">Suggest</button></form><div className="mt-7 space-y-3">{agendaSuggestions.length ? agendaSuggestions.map((item) => { const voted = votedSuggestionIds.has(item.id); return <article key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4"><div className="min-w-0 flex-1"><p className="text-sm">{item.text}</p><p className="mt-1 text-[10px] text-white/35">Suggested by {item.submittedByEmail}</p></div><button type="button" aria-pressed={voted} onClick={() => void toggleSuggestionVote(item)} className={`rounded-full border px-4 py-2 text-xs ${voted ? "border-[var(--beam-gold)] bg-[var(--beam-gold)] text-black" : "border-white/15 text-white/65"}`}>{voted ? "Prioritized" : "Prioritize this"} · {item.voteCount}</button></article>; }) : <p className="text-xs text-white/35">No topics suggested yet. Add the first one.</p>}</div></section> : <>
            <section className="beam-card rounded-[1.75rem] p-6 sm:p-8"><div className="flex flex-wrap justify-between gap-4"><div><p className="beam-eyebrow">01 / Listen</p><h2 className="beam-display mt-2 text-3xl">Meeting overview</h2></div><div className="flex gap-1">{[1,1.25,1.5,2].map((option) => <button key={option} onClick={() => changeSpeed(option)} className={`rounded-full px-3 py-1.5 text-xs ${speed === option ? "bg-[var(--beam-gold)] text-black" : "bg-white/5 text-white/60"}`}>{option}x</button>)}</div></div>{audioUrl ? <audio ref={audioRef} src={audioUrl} controls className="mt-6 w-full"/> : <p className="mt-6 rounded-xl border border-amber-300/15 bg-amber-300/5 p-4 text-sm text-amber-100/65">Audio has not been uploaded for this meeting.</p>}</section>
            <section className="beam-card rounded-[1.75rem] p-6 sm:p-8"><p className="beam-eyebrow">02 / Skim</p><h2 className="beam-display mt-2 text-3xl">Key takeaways</h2><div className="mt-6 divide-y divide-white/10 border-y border-white/10">{expanded.takeaways.length ? expanded.takeaways.map((item,index) => <details key={`${item.heading}-${index}`} open={index===0} className="group py-5"><summary className="flex cursor-pointer list-none justify-between gap-4 font-medium"><span>{item.heading}</span><span className="text-[var(--beam-gold)]">+</span></summary><p className="mt-3 text-sm leading-7 text-white/55">{item.body}</p></details>) : <p className="py-5 text-sm text-white/40">Takeaways have not been added yet.</p>}</div></section>
            <section className="beam-card rounded-[1.75rem] p-6 sm:p-8"><div className="flex justify-between"><div><p className="beam-eyebrow">03 / Work</p><h2 className="beam-display mt-2 text-3xl">Live grant board</h2></div><Link href="/admin/grants" className="text-xs text-[var(--beam-gold)]">Admin ↗</Link></div>{grantsError ? <p className="mt-5 text-red-300">{grantsError.message}</p> : grantsLoading ? <p className="mt-5 text-white/40">Loading...</p> : <div className="mt-6 grid gap-3 sm:grid-cols-2">{grants.map((grant) => <article key={grant.id} className="rounded-2xl border border-white/10 bg-black/20 p-5"><span className="text-[10px] uppercase tracking-wider text-[var(--beam-gold)]">{grant.stages[0]?.label}</span><h3 className="mt-3 font-medium">{grant.title}</h3><p className="mt-3 text-xs leading-6 text-white/45">{grant.stages[0]?.note}</p></article>)}</div>}</section>
          </>}
        </div><aside className="h-fit rounded-[1.75rem] border border-white/10 bg-[#10110f] p-5 lg:sticky lg:top-24"><p className="beam-eyebrow">Discussion</p><h2 className="beam-display mt-2 text-2xl">Leave context behind</h2><form onSubmit={postComment} className="mt-5"><textarea value={commentBody} onChange={(e)=>setCommentBody(e.target.value)} rows={4} placeholder="Add a question, correction, or next step..." className="w-full resize-none rounded-xl border border-white/10 bg-black/30 p-3 text-sm outline-none"/><label className="mt-3 flex gap-2 text-xs text-white/45"><input type="checkbox" checked={includeTimestamp} disabled={!audioUrl} onChange={(e)=>setIncludeTimestamp(e.target.checked)}/> Attach audio time</label><button className="mt-4 w-full rounded-full bg-[var(--beam-gold)] py-2.5 text-xs font-semibold text-black">Post note</button></form><div className="mt-6 max-h-[30rem] space-y-3 overflow-y-auto">{comments.map((comment)=><article key={comment.id} className="rounded-xl bg-black/20 p-3"><div className="flex justify-between"><p className="text-xs font-medium">{comment.authorName}</p>{comment.userId===user.uid?<button onClick={()=>void deleteDoc(doc(getFirebaseDb(),"workstationComments",comment.id))} className="text-[10px] text-red-300">Delete</button>:null}</div>{comment.audioSeconds!==null?<button onClick={()=>{if(audioRef.current){audioRef.current.currentTime=comment.audioSeconds??0;void audioRef.current.play();}}} className="mt-2 font-mono text-[10px] text-[var(--beam-gold)]">▶ {formatAudioTime(comment.audioSeconds)}</button>:null}<p className="mt-2 text-xs leading-5 text-white/55">{comment.body}</p></article>)}</div></aside></div>
        {meetingStack()}
      </div>
    </main>
  );
}
