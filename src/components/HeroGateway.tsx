"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirebaseApp } from "@/lib/firebaseClient";
import MatchedResults from "./MatchedResults";

const PLACEHOLDERS = [
  "I'd like to study engineering...",
  "I want to join construction...",
  "I'm interested in orchestra...",
  "I want to support students...",
  "I'd like to learn music...",
  "I want to help with architecture...",
];

interface NGO {
  id: string;
  name: string;
  description: string;
  category: string;
  domain: string;
}

export default function HeroGateway() {
  const [inputValue, setInputValue] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [matchedNGOs, setMatchedNGOs] = useState<NGO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [, setSelectedRole] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { user } = useAuthStore();

  // Initialize Firebase Auth listener
  useEffect(() => {
    getFirebaseApp();
  }, []);

  // Animate placeholders
  useEffect(() => {
    const id = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % PLACEHOLDERS.length);
    }, 2600);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const getRoleGlowColor = (role: string) => {
    switch (role) {
      case 'student':
        return 'from-blue-400/30 via-cyan-400/20 to-blue-600/30';
      case 'business':
        return 'from-green-400/30 via-emerald-400/20 to-green-600/30';
      case 'community':
        return 'from-purple-400/30 via-violet-400/20 to-purple-600/30';
      default:
        return 'from-[#91B5FF]/20 via-[#91B5FF]/10 to-[#91B5FF]/20';
    }
  };

  const handleRoleSelect = async (role: string) => {
    setSelectedRole(role);
    
    if (!user) {
      try {
        const auth = getAuth();
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      } catch (e) {
        console.warn('Google sign-in failed:', e);
      }
    }

    // Store role and redirect
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('beam-confirmed-role', role);
    }

    // Redirect to appropriate onboarding
    router.push(`/onboard/${role}`);
  };

  const handleInputSubmit = async () => {
    if (!inputValue.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/classify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: inputValue }),
      });

      if (response.ok) {
        const data = await response.json();
        // Mock NGO data based on category - in real app this would come from Firestore
        const mockNGOs: NGO[] = getMockNGOsForCategory(data.category);
        setMatchedNGOs(mockNGOs);
      }
    } catch (error) {
      console.error('Classification failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleInputSubmit();
    }
  };

  const resetInput = () => {
    setInputValue("");
    setMatchedNGOs([]);
    setIsLoading(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const easeStandard: [number, number, number, number] = [0.4, 0, 0.2, 1];

  // If user is logged in, show welcome back message
  if (user) {
    return (
      <div className="h-[100vh] overflow-hidden bg-[#0b0d10] text-slate-200 flex items-center justify-center px-4">
        <div className="w-full max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: easeStandard }}
          >
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-[#91B5FF] mb-4">
              Welcome back, {user.displayName || 'Friend'}
            </h1>
            <p className="text-lg text-slate-400 mb-8">
              Continue your BEAM journey
            </p>
            <button
              onClick={() => router.push('/participant-dashboard')}
              className="rounded-full bg-[#91B5FF] hover:brightness-95 transition-colors px-8 py-3 text-lg font-medium text-[#0c1215]"
            >
              Go to Dashboard
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100vh] overflow-hidden bg-[#0b0d10] text-slate-200 flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easeStandard }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-[#91B5FF] mb-4">
            BEAM
          </h1>
          <p className="text-lg text-slate-400">
            Welcome to BEAM — how would you like to participate?
          </p>
        </motion.div>

        {/* Role Selection Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easeStandard, delay: 0.2 }}
          className="mb-12"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleRoleSelect('student')}
              className="group relative overflow-hidden rounded-2xl bg-[#1D2127] border border-[#23262B] p-6 text-left transition-all duration-300 hover:border-blue-400/30 hover:shadow-[0_8px_32px_rgba(59,130,246,0.15)]"
            >
              <div className="text-3xl mb-3">🎓</div>
              <h3 className="text-lg font-medium text-white mb-2">Student / Alumni</h3>
              <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                Join programs, find mentors, and build your career
              </p>
              <motion.div
                className={`absolute inset-0 bg-gradient-to-r ${getRoleGlowColor('student')} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                initial={false}
              />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleRoleSelect('business')}
              className="group relative overflow-hidden rounded-2xl bg-[#1D2127] border border-[#23262B] p-6 text-left transition-all duration-300 hover:border-green-400/30 hover:shadow-[0_8px_32px_rgba(34,197,94,0.15)]"
            >
              <div className="text-3xl mb-3">🏢</div>
              <h3 className="text-lg font-medium text-white mb-2">Business / Partner</h3>
              <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                Support students, offer opportunities, and grow your network
              </p>
              <motion.div
                className={`absolute inset-0 bg-gradient-to-r ${getRoleGlowColor('business')} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                initial={false}
              />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleRoleSelect('community')}
              className="group relative overflow-hidden rounded-2xl bg-[#1D2127] border border-[#23262B] p-6 text-left transition-all duration-300 hover:border-purple-400/30 hover:shadow-[0_8px_32px_rgba(147,51,234,0.15)]"
            >
              <div className="text-3xl mb-3">🌍</div>
              <h3 className="text-lg font-medium text-white mb-2">Community / Auditor</h3>
              <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                Explore opportunities, learn, and contribute to the community
              </p>
              <motion.div
                className={`absolute inset-0 bg-gradient-to-r ${getRoleGlowColor('community')} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                initial={false}
              />
            </motion.button>
          </div>
        </motion.div>

        {/* AI Input Field */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easeStandard, delay: 0.4 }}
          className="relative mb-8"
        >
          <div className="group flex items-center gap-3 rounded-full bg-[#1D2127] border border-[#23262B] shadow-[0_6px_20px_rgba(0,0,0,0.5)] px-5 py-4 hover:border-[#91B5FF]/30 transition-colors duration-300">
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder=" "
              className="peer w-full bg-transparent text-base sm:text-lg placeholder-transparent outline-none"
            />
            <button
              onClick={handleInputSubmit}
              disabled={isLoading || !inputValue.trim()}
              className="shrink-0 rounded-full bg-[#91B5FF] hover:brightness-95 transition-colors px-4 py-2 text-sm text-[#0c1215] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '...' : 'Enter'}
            </button>
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

          {/* Floating glow effect */}
          <motion.div
            className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300"
            style={{
              background: 'radial-gradient(circle, #91B5FF 0%, transparent 70%)',
              filter: 'blur(20px)',
            }}
          />
        </motion.div>

        {/* Matched Results */}
        <AnimatePresence>
          {matchedNGOs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: easeStandard }}
            >
              <MatchedResults NGOs={matchedNGOs} onReset={resetInput} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reset button */}
        {matchedNGOs.length > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={resetInput}
              className="text-xs rounded-full px-3 py-1 bg-white/5 hover:bg-white/10 text-[rgb(180,180,180)] transition-colors"
            >
              Reset
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to get mock NGO data based on category
function getMockNGOsForCategory(category: string): NGO[] {
  const mockData: Record<string, NGO[]> = {
    construction: [
      {
        id: '1',
        name: 'Build Future Foundation',
        description: 'Connecting students with construction and engineering opportunities',
        category: 'construction',
        domain: 'buildfuture.org'
      },
      {
        id: '2',
        name: 'Construction Skills Academy',
        description: 'Hands-on training programs for aspiring construction professionals',
        category: 'construction',
        domain: 'skillsacademy.org'
      }
    ],
    engineering: [
      {
        id: '3',
        name: 'Tech Engineers United',
        description: 'Engineering mentorship and internship programs',
        category: 'engineering',
        domain: 'techunited.org'
      },
      {
        id: '4',
        name: 'Future Engineers Initiative',
        description: 'Supporting the next generation of engineering talent',
        category: 'engineering',
        domain: 'futureengineers.org'
      }
    ],
    orchestra: [
      {
        id: '5',
        name: 'Youth Orchestra Network',
        description: 'Connecting young musicians with performance opportunities',
        category: 'orchestra',
        domain: 'youthorchestra.org'
      }
    ],
    music: [
      {
        id: '6',
        name: 'Music Education Foundation',
        description: 'Supporting music education and performance opportunities',
        category: 'music',
        domain: 'musicedfoundation.org'
      }
    ],
    medicine: [
      {
        id: '7',
        name: 'Medical Mentorship Program',
        description: 'Connecting pre-med students with healthcare professionals',
        category: 'medicine',
        domain: 'medmentors.org'
      }
    ],
    architecture: [
      {
        id: '8',
        name: 'Design Build Institute',
        description: 'Architecture and design education programs',
        category: 'architecture',
        domain: 'designbuild.org'
      }
    ],
    support: [
      {
        id: '9',
        name: 'Student Support Network',
        description: 'Comprehensive support services for students',
        category: 'support',
        domain: 'studentsupport.org'
      }
    ]
  };

  return mockData[category] || [
    {
      id: 'default',
      name: 'BEAM Community',
      description: 'Join our growing community of students and professionals',
      category: 'general',
      domain: 'beamthinktank.space'
    }
  ];
}
