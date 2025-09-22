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
    "https://firebasestorage.googleapis.com/v0/b/beam-home.firebasestorage.app/o/home-autopopulate-window-videos%2Fconstruction%20-%208488356-uhd_3840_2160_30fps.mp4?alt=media&token=bb4670ff-2706-49e2-aaec-e74cfb8201a8",
  music: "https://firebasestorage.googleapis.com/v0/b/beam-home.firebasestorage.app/o/home-autopopulate-window-videos%2Fmusic%20-%2012392846_3840_2160_25fps.mp4?alt=media&token=cf8b9181-2724-4f18-8b46-08addcfa55da",
  orchestra:
    "https://firebasestorage.googleapis.com/v0/b/beam-home.firebasestorage.app/o/home-autopopulate-window-videos%2Forchestra%20-%207095841-uhd_4096_2160_25fps.mp4?alt=media&token=d01ff48b-2868-4ef6-ae35-2fb06e2de0ef",
  chorus:
    "https://firebasestorage.googleapis.com/v0/b/beam-home.firebasestorage.app/o/home-autopopulate-window-videos%2Fchorus%20-%207520855-uhd_4096_2160_25fps.mp4?alt=media&token=33381421-1f65-4a6c-9ddc-6edf85f3c91b",
  medicine:
    "https://firebasestorage.googleapis.com/v0/b/beam-home.firebasestorage.app/o/home-autopopulate-window-videos%2Fmedicine%20-%202%20-%2018699011-uhd_3840_2160_25fps.mp4?alt=media&token=9015464f-abaf-46e5-a7f9-fc5c97831be1",
  architecture:
    "https://firebasestorage.googleapis.com/v0/b/beam-home.firebasestorage.app/o/home-autopopulate-window-videos%2Farchietcture%20-%204941465-hd_1920_1080_25fps.mp4?alt=media&token=18f30430-1fe6-4171-8d53-8a0f1eec32d1",
  support:
    "https://firebasestorage.googleapis.com/v0/b/beam-home.firebasestorage.app/o/home-autopopulate-window-videos%2Fsupport%20-%206868669-uhd_3840_2160_30fps.mp4?alt=media&token=a21e823e-4080-4877-8ecb-e6db4e2516bc",
};

const NEARBY_UNIS = ["University A", "College B"];
const PAY_RATE_MAP: Record<string, string> = {
  construction: "$22/hr",
  engineering: "$28/hr",
  music: "$18/hr",
  orchestra: "$20/hr",
  chorus: "$17/hr",
  medicine: "$30/hr",
  architecture: "$24/hr",
  support: "$15/hr",
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
  const { role, Detector, location } = useRoleClassifier(inputValue);
  const [isHoveringVideo, setIsHoveringVideo] = useState(false);

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
    // Create keyword aliases for more flexible matching
    const keywordAliases: Record<string, string[]> = {
      engineering: ['engineering', 'engineer'],
      construction: ['construction', 'construct'],
      music: ['music', 'musical'],
      orchestra: ['orchestra', 'orchestral'],
      chorus: ['chorus', 'choral', 'choir'],
      medicine: ['medicine', 'medical', 'med'],
      architecture: ['architecture', 'architect'],
      support: ['support', 'supporting', 'help', 'helping']
    };
    
    // Find match by checking aliases
    const match = Object.keys(videoMap).find((key) => {
      const aliases = keywordAliases[key] || [key];
      return aliases.some(alias => lowered.includes(alias));
    }) ?? null;
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
    console.log('CTA clicked, target role:', targetRole, 'user:', user);
    
    if (!user) {
      try {
        console.log('Attempting Google sign-in...');
        const auth = getAuth();
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        console.log('Google sign-in successful');
      } catch (e) {
        console.warn('Google sign-in failed, proceeding without auth:', e);
        // Continue without auth for now
      }
    }
    
    // Store role and redirect regardless of auth status
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('beam-confirmed-role', targetRole);
    }
    
    console.log('Redirecting to:', targetRole === 'community' ? '/community-dashboard' : '/participant-dashboard');
    router.push(targetRole === 'community' ? '/community-dashboard' : '/participant-dashboard');
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    }
  };

  const overlayEase: [number, number, number, number] = [0.4, 0, 0.2, 1];

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
              <div
                className="relative overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgb(20,20,20)] shadow-xl"
                onMouseEnter={() => setIsHoveringVideo(true)}
                onMouseLeave={() => setIsHoveringVideo(false)}
              >
                <video
                  key={videoUrl}
                  className="w-full h-[300px] sm:h-[420px] object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                  onError={(e) => {
                    console.error('Video failed to load:', videoUrl, e);
                  }}
                  onLoadStart={() => {
                    console.log('Video loading started:', videoUrl);
                  }}
                  onCanPlay={() => {
                    console.log('Video can play:', videoUrl);
                  }}
                >
                  <source src={videoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>

                <AnimatePresence>
                  {isHoveringVideo && (
                    <>
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2, ease: overlayEase }}
                        className="absolute top-3 left-3 bg-black/60 text-white text-xs sm:text-sm rounded-md px-3 py-2 shadow-lg"
                      >
                        {location ? `${location.city}, ${location.state}` : 'Locating…'}
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, x: 6, y: 6 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        exit={{ opacity: 0, x: 6, y: 6 }}
                        transition={{ duration: 0.2, ease: overlayEase }}
                        className="absolute bottom-3 right-3 bg-black/60 text-white text-xs sm:text-sm rounded-md px-3 py-2 shadow-lg"
                      >
                        Nearby: {NEARBY_UNIS.join(', ')}
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, x: -6, y: 6 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        exit={{ opacity: 0, x: -6, y: 6 }}
                        transition={{ duration: 0.2, ease: overlayEase }}
                        className="absolute bottom-3 left-3 bg-black/60 text-white text-xs sm:text-sm rounded-md px-3 py-2 shadow-lg"
                      >
                        Avg pay: {matchedKey ? (PAY_RATE_MAP[matchedKey] || "$15/hr") : "$15/hr"}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
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