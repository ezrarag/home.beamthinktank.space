"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { getFirebaseApp } from "@/lib/firebaseClient";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup } from "firebase/auth";
import { useRoleClassifier } from "@/hooks/useRoleClassifier";
import { useRouter } from "next/navigation";

const PLACEHOLDERS = [
  "I want to join construction…",
  "I’m interested in orchestra…",
  "I’d like to study engineering…",
  "I want to support students…",
];

const videoMap: Record<string, string> = {
  construction:
    "https://firebasestorage.googleapis.com/v0/b/beam-home.firebasestorage.app/o/home-autopopulate-window-videos%2Fconstruction%20-%208488356-uhd_3840_2160_30fps.mp4?alt=media&token=bb4670ff-2706-49e2-aaec-e74cfb8201a8",
  engineering:
    "https://videos.pexels.com/video-files/856785/856785-hd_1920_1080_24fps.mp4",
  music: "https://videos.pexels.com/video-files/8941564/8941564-hd_1920_1080_25fps.mp4",
  orchestra:
    "https://videos.pexels.com/video-files/6892779/6892779-hd_1920_1080_25fps.mp4",
  chorus:
    "https://videos.pexels.com/video-files/6814424/6814424-hd_1920_1080_25fps.mp4",
  medicine:
    "https://videos.pexels.com/video-files/5998510/5998510-hd_1920_1080_25fps.mp4",
  architecture:
    "https://firebasestorage.googleapis.com/v0/b/beam-home.firebasestorage.app/o/home-autopopulate-window-videos%2Farchietcture%20-%204941465-hd_1920_1080_25fps.mp4?alt=media&token=18f30430-1fe6-4171-8d53-8a0f1eec32d1",
};

export default function HomePage() {
  const [inputValue, setInputValue] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [liveMatchKey, setLiveMatchKey] = useState<string | null>(null);
  const [confirmedKey, setConfirmedKey] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const matchedKey = isLocked ? confirmedKey : liveMatchKey;
  const videoUrl = matchedKey ? videoMap[matchedKey] : null;
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const { role, Detector } = useRoleClassifier(inputValue);

  // Initialize Firebase Auth listener once
  useEffect(() => {
    getFirebaseApp();
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) return setUser(null);
      setUser({ uid: u.uid, displayName: u.displayName, email: u.email, photoURL: u.photoURL });
    });
    return () => unsub();
  }, [setUser]);

  useEffect(() => {
    const id = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % PLACEHOLDERS.length);
    }, 2600);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const evaluateMatch = (text: string) => {
    const lowered = text.trim().toLowerCase();
    const match = Object.keys(videoMap).find((key) => lowered.includes(key)) ?? null;
    setLiveMatchKey(match);
  };

  const onSubmit = () => {
    // Confirm current video (if any)
    const current = liveMatchKey;
    if (current) {
      setConfirmedKey(current);
      setIsLocked(true);
      // Optional UX: keep focus but readonly to show cursor off
      inputRef.current?.blur();
    }
  };

  const handleCta = async () => {
    const targetRole = role ?? 'participant';
    if (!user) {
      try {
        const auth = getAuth();
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      } catch (e) {
        console.warn('Google sign-in failed', e);
        return;
      }
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('beam-confirmed-role', targetRole);
    }
    router.push(targetRole === 'community' ? '/community-dashboard' : '/participant-dashboard');
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    }
  };

  const panelContent = useMemo(() => {
    if (videoUrl) {
      return (
        <div className="overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgb(20,20,20)] shadow-xl">
          <video
            key={videoUrl}
            className="w-full h-[300px] sm:h-[420px] object-cover"
            autoPlay
            muted
            loop
            playsInline
          >
            <source src={videoUrl} type="video/mp4" />
          </video>
        </div>
      );
    }
    return null;
  }, [videoUrl]);

  const resetAll = () => {
    setInputValue("");
    setIsLocked(false);
    setConfirmedKey(null);
    setLiveMatchKey(null);
    // refocus for quick typing
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const easeStandard: [number, number, number, number] = [0.4, 0, 0.2, 1];

  return (
    <div className="h-[100vh] overflow-hidden bg-[#141414] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#77859D]">BEAM</h1>
        </div>

        <div className="relative">
          <div className="group flex items-center gap-3 rounded-full bg-[#1D2127] border border-[#23262B] shadow-[0_6px_20px_rgba(0,0,0,0.5)] px-5 py-4">
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => {
                const v = e.target.value;
                setInputValue(v);
                if (!isLocked) {
                  evaluateMatch(v);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder=" "
              readOnly={isLocked}
              className="peer w-full bg-transparent text-base sm:text-lg placeholder-transparent outline-none"
            />
            {!isLocked ? (
              <button
                onClick={onSubmit}
                className="shrink-0 rounded-full bg-[#89C0D0] hover:brightness-95 transition-colors px-4 py-2 text-sm text-[#0c1215] font-medium"
              >
                Enter
              </button>
            ) : (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, ease: easeStandard }}
                className="shrink-0 text-green-400"
                aria-label="Confirmed"
              >
                ✓
              </motion.span>
            )}
          </div>

          <div className="pointer-events-none absolute left-6 right-28 top-1/2 -translate-y-1/2 text-[rgb(150,150,150)]">
            <AnimatePresence mode="wait">
              {!inputValue && (
                <motion.span
                  key={placeholderIndex}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.35 }}
                  className="block text-base sm:text-lg"
                >
                  {PLACEHOLDERS[placeholderIndex]}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        {Detector}

        {isLocked && (
          <div className="mt-3">
            <button
              onClick={resetAll}
              className="text-xs rounded-full px-3 py-1 bg-white/5 hover:bg-white/10 text-[rgb(180,180,180)] transition-colors"
            >
              Reset
            </button>
          </div>
        )}

        <AnimatePresence>
          {!!videoUrl && (
            <motion.div
              key={videoUrl}
              initial={{ height: 0, opacity: 0, y: -8 }}
              animate={{ height: "auto", opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: easeStandard }}
              className="mt-6"
            >
              {panelContent}
              {isLocked && (
                <div className="mt-4 flex justify-center">
                  <button onClick={handleCta} className="rounded-full bg-[#89C0D0] text-[#0c1215] px-5 py-2 text-sm font-medium hover:brightness-95">
                    {role === 'community' ? 'Continue to Community Portal' : 'Continue to Participant Dashboard'}
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}