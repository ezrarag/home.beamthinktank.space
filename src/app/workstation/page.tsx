"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type DocumentData,
} from "firebase/firestore";
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect } from "firebase/auth";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebaseClient";
import { useAuthStore } from "@/store/authStore";
import { useBeamProcesses } from "@/hooks/useBeamProcesses";

const MEETING_ID = "beam-nucleus-grants-2026-07";

type Comment = {
  id: string;
  userId: string;
  authorName: string;
  authorEmail: string;
  body: string;
  audioSeconds: number | null;
  createdAt: { toDate?: () => Date } | null;
};

const TAKEAWAYS = [
  {
    title: "Two near-term August opportunities need owners now",
    body: "The MCW opportunity is due August 3 and CHEER is due August 7. DeTania's research and MCW relationships make her a natural early partner; scope and applicant eligibility still need confirmation.",
  },
  {
    title: "Danielle can anchor the grant-writing structure",
    body: "Danielle brings multi-PI grant-writing experience and Greater Milwaukee Foundation relationships. The emerging need is a small research and writing team, not a single grant writer working alone.",
  },
  {
    title: "Research, music, and water form distinct funding paths",
    body: "Music-cognition and memory research maps to William T. Grant and MCW. Jordan's environmental sensor work maps to the warm family-foundation water and education contact.",
  },
  {
    title: "Two institutional leads remain outside the grant pipeline",
    body: "Lisa Dickerson/UWM Facilities and Milwaukee Transit are prospective institutional subscribers. Both need direct discovery follow-up before they become scoped opportunities.",
  },
];

function formatAudioTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function normalizeComment(id: string, data: DocumentData): Comment {
  return {
    id,
    userId: String(data.userId ?? ""),
    authorName: String(data.authorName ?? "Collaborator"),
    authorEmail: String(data.authorEmail ?? ""),
    body: String(data.body ?? ""),
    audioSeconds: typeof data.audioSeconds === "number" ? data.audioSeconds : null,
    createdAt: data.createdAt ?? null,
  };
}

export default function WorkstationPage() {
  const { user, hasInitializedAuth, initializeAuth, logout } = useAuthStore();
  const { processes: grants, loading: grantsLoading, error: grantsError } = useBeamProcesses("grants", Boolean(user));
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioAvailable, setAudioAvailable] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [includeTimestamp, setIncludeTimestamp] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState(false);

  useEffect(() => initializeAuth(), [initializeAuth]);

  useEffect(() => {
    if (!user) {
      setComments([]);
      setReviewed(false);
      return;
    }

    const db = getFirebaseDb();
    const stopComments = onSnapshot(
      collection(db, "workstationComments"),
      (snapshot) => {
        setComments(
          snapshot.docs
            .map((entry) => normalizeComment(entry.id, entry.data()))
            .sort((a, b) => (b.createdAt?.toDate?.().getTime() ?? 0) - (a.createdAt?.toDate?.().getTime() ?? 0)),
        );
      },
      (error) => setCommentError(error.message),
    );
    const reviewId = `${MEETING_ID}_${user.uid}`;
    const stopReview = onSnapshot(doc(db, "workstationReviews", reviewId), (snapshot) => {
      setReviewed(snapshot.exists() && snapshot.data().reviewed === true);
    });
    return () => {
      stopComments();
      stopReview();
    };
  }, [user]);

  async function signIn() {
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      if (code === "auth/popup-blocked" || code === "auth/cancelled-popup-request") {
        await signInWithRedirect(auth, provider);
        return;
      }
      setCommentError(error instanceof Error ? error.message : "Sign-in failed.");
    }
  }

  function changeSpeed(nextSpeed: number) {
    setSpeed(nextSpeed);
    if (audioRef.current) audioRef.current.playbackRate = nextSpeed;
  }

  async function toggleReviewed() {
    if (!user) return;
    const next = !reviewed;
    await setDoc(
      doc(getFirebaseDb(), "workstationReviews", `${MEETING_ID}_${user.uid}`),
      { meetingId: MEETING_ID, userId: user.uid, reviewed: next, updatedAt: serverTimestamp() },
      { merge: true },
    );
  }

  async function postComment(event: FormEvent) {
    event.preventDefault();
    if (!user || !commentBody.trim()) return;
    setIsPosting(true);
    setCommentError(null);
    try {
      await addDoc(collection(getFirebaseDb(), "workstationComments"), {
        meetingId: MEETING_ID,
        userId: user.uid,
        authorName: user.displayName || user.email || "Collaborator",
        authorEmail: user.email || "",
        body: commentBody.trim(),
        audioSeconds: includeTimestamp && audioRef.current ? Math.floor(audioRef.current.currentTime) : null,
        createdAt: serverTimestamp(),
      });
      setCommentBody("");
      setIncludeTimestamp(false);
    } catch (error) {
      setCommentError(error instanceof Error ? error.message : "Comment could not be posted.");
    } finally {
      setIsPosting(false);
    }
  }

  if (!hasInitializedAuth) {
    return <main className="grid min-h-screen place-items-center bg-[#090a09] text-white/60">Opening the workstation...</main>;
  }

  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#090a09] px-6 text-[#f0ead6]">
        <section className="beam-card max-w-xl rounded-[2rem] p-8 text-center sm:p-12">
          <p className="beam-eyebrow">BEAM Catch-Up Workstation</p>
          <h1 className="beam-display mt-5 text-5xl sm:text-6xl">Come into the room.</h1>
          <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-[var(--beam-text-secondary)]">
            Sign in to review the grants meeting, see the live opportunity tracker, mark yourself caught up, and leave notes for the team.
          </p>
          <button onClick={signIn} className="mt-8 rounded-full bg-[var(--beam-gold)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-black hover:bg-[var(--beam-gold-bright)]">
            Continue with Google
          </button>
          <div className="mt-6"><Link href="/" className="text-xs text-white/45 hover:text-white">Return to BEAM</Link></div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#090a09] text-[#f0ead6]">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#090a09]/90 px-5 py-4 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/" className="beam-eyebrow text-[var(--beam-gold-bright)]">BEAM / Workstation</Link>
          <div className="flex items-center gap-3 text-xs text-white/55">
            <span className="hidden sm:inline">{user.displayName || user.email}</span>
            <button onClick={() => void logout()} className="rounded-full border border-white/15 px-3 py-1.5 hover:border-white/40 hover:text-white">Sign out</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <section className="grid gap-8 border-b border-white/10 pb-12 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="beam-eyebrow">Meeting 01 · Grants & institutional leads</p>
            <h1 className="beam-display mt-4 max-w-4xl text-5xl leading-[0.92] sm:text-7xl">Get caught up. Then move the work forward.</h1>
          </div>
          <div className="flex flex-col justify-end gap-4">
            <p className="text-sm leading-7 text-[var(--beam-text-secondary)]">A shared room for Danielle, DeTania, Joseph, Sisi, and the wider BEAM team to review context and leave the next person a clearer starting point.</p>
            <button onClick={() => void toggleReviewed()} className={`rounded-2xl border p-4 text-left transition ${reviewed ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" : "border-white/15 bg-white/[0.03] text-white/75 hover:border-white/30"}`}>
              <span className="mr-3">{reviewed ? "✓" : "○"}</span>{reviewed ? "You're caught up" : "Mark me as caught up"}
            </button>
          </div>
        </section>

        <div className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-8">
            <section className="beam-card rounded-[1.75rem] p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><p className="beam-eyebrow">01 / Listen</p><h2 className="beam-display mt-2 text-3xl">Meeting overview</h2></div>
                <div className="flex gap-1" aria-label="Playback speed">
                  {[1, 1.25, 1.5, 2].map((option) => <button key={option} onClick={() => changeSpeed(option)} className={`rounded-full px-3 py-1.5 text-xs ${speed === option ? "bg-[var(--beam-gold)] text-black" : "bg-white/5 text-white/60"}`}>{option}x</button>)}
                </div>
              </div>
              <audio ref={audioRef} controls preload="metadata" onError={() => setAudioAvailable(false)} className="mt-6 w-full" src="/audio/meeting-overview.mp3">Your browser does not support audio playback.</audio>
              {!audioAvailable ? <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm text-amber-100/75">The meeting audio has not been uploaded yet. Add the final MP3 at <code>/public/audio/meeting-overview.mp3</code>; this player and its timestamped comments will activate automatically.</p> : null}
            </section>

            <section className="beam-card rounded-[1.75rem] p-6 sm:p-8">
              <p className="beam-eyebrow">02 / Skim</p><h2 className="beam-display mt-2 text-3xl">Key takeaways</h2>
              <div className="mt-6 divide-y divide-white/10 border-y border-white/10">
                {TAKEAWAYS.map((item, index) => <details key={item.title} open={index === 0} className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium"><span>{item.title}</span><span className="text-[var(--beam-gold)] group-open:rotate-45">+</span></summary><p className="mt-3 max-w-3xl text-sm leading-7 text-white/55">{item.body}</p></details>)}
              </div>
            </section>

            <section className="beam-card rounded-[1.75rem] p-6 sm:p-8">
              <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="beam-eyebrow">03 / Work</p><h2 className="beam-display mt-2 text-3xl">Live grant board</h2></div><Link href="/admin/grants" className="text-xs text-[var(--beam-gold)] hover:text-white">Admin grant editor ↗</Link></div>
              {grantsError ? <p className="mt-5 text-sm text-red-300">{grantsError.message}</p> : grantsLoading ? <p className="mt-5 text-sm text-white/50">Loading grant opportunities...</p> : grants.length === 0 ? <p className="mt-5 rounded-xl border border-white/10 p-5 text-sm text-white/50">No grant records are available yet. An admin can run the prepared grant seed or add one in the grant editor.</p> : <div className="mt-6 grid gap-3 sm:grid-cols-2">{grants.map((grant) => <article key={grant.id} className="rounded-2xl border border-white/10 bg-black/20 p-5"><div className="flex justify-between gap-4"><span className="text-[10px] uppercase tracking-[0.16em] text-[var(--beam-gold)]">{grant.stages[0]?.label || "Identified"}</span>{grant.funding?.deadlineDate ? <span className="text-[10px] text-white/40">{grant.funding.deadlineDate}</span> : null}</div><h3 className="mt-3 font-medium leading-6">{grant.title}</h3><p className="mt-3 text-xs leading-6 text-white/50">{grant.stages[0]?.note}</p><p className="mt-4 text-[10px] uppercase tracking-wider text-white/35">Owner · {grant.stages[0]?.owner || "TBD"}</p></article>)}</div>}
            </section>
          </div>

          <aside className="h-fit rounded-[1.75rem] border border-white/10 bg-[#10110f] p-5 lg:sticky lg:top-24">
            <p className="beam-eyebrow">Team discussion</p><h2 className="beam-display mt-2 text-2xl">Leave context behind</h2>
            <form onSubmit={postComment} className="mt-5"><textarea value={commentBody} onChange={(event) => setCommentBody(event.target.value)} rows={4} placeholder="Add a question, contact, correction, or next step..." className="w-full resize-none rounded-xl border border-white/10 bg-black/30 p-3 text-sm outline-none placeholder:text-white/25 focus:border-[var(--beam-gold)]"/><label className="mt-3 flex items-center gap-2 text-xs text-white/50"><input type="checkbox" checked={includeTimestamp} disabled={!audioAvailable} onChange={(event) => setIncludeTimestamp(event.target.checked)}/> Attach current audio time</label><button disabled={isPosting || !commentBody.trim()} className="mt-4 w-full rounded-full bg-[var(--beam-gold)] px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-black disabled:opacity-40">{isPosting ? "Posting..." : "Post note"}</button></form>
            {commentError ? <p className="mt-3 text-xs text-red-300">{commentError}</p> : null}
            <div className="mt-6 max-h-[32rem] space-y-3 overflow-y-auto pr-1">{comments.length === 0 ? <p className="text-xs leading-6 text-white/35">No notes yet. Start the handoff for the next person.</p> : comments.map((comment) => <article key={comment.id} className="rounded-xl border border-white/8 bg-black/20 p-3"><div className="flex items-start justify-between gap-2"><p className="text-xs font-medium">{comment.authorName}</p>{comment.userId === user.uid ? <button onClick={() => void deleteDoc(doc(getFirebaseDb(), "workstationComments", comment.id))} className="text-[10px] text-white/25 hover:text-red-300" aria-label="Delete your comment">Delete</button> : null}</div>{comment.audioSeconds !== null ? <button onClick={() => { if (audioRef.current) { audioRef.current.currentTime = comment.audioSeconds ?? 0; void audioRef.current.play(); } }} className="mt-2 font-mono text-[10px] text-[var(--beam-gold)]">▶ {formatAudioTime(comment.audioSeconds)}</button> : null}<p className="mt-2 text-xs leading-5 text-white/55">{comment.body}</p><p className="mt-2 text-[9px] text-white/25">{comment.createdAt?.toDate?.().toLocaleString() || "Just now"}</p></article>)}</div>
          </aside>
        </div>
      </div>
    </main>
  );
}
