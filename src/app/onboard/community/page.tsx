"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirebaseApp } from "@/lib/firebaseClient";

const STEPS = [
  {
    id: 1,
    title: "Tell us your interests",
    description: "Help us understand what you're curious about"
  },
  {
    id: 2,
    title: "Select your engagement level",
    description: "Choose how you'd like to participate in the community"
  },
  {
    id: 3,
    title: "Connect your BEAM profile",
    description: "Set up your community member account"
  }
];

const INTEREST_OPTIONS = [
  "Learning & Education",
  "Community Service",
  "Professional Development",
  "Arts & Culture",
  "Technology & Innovation",
  "Health & Wellness",
  "Environmental Causes",
  "Social Justice",
  "Entrepreneurship",
  "Networking & Events"
];

const ENGAGEMENT_OPTIONS = [
  {
    id: "observer",
    title: "Observer",
    description: "Browse opportunities, attend events, learn about programs",
    icon: "👀"
  },
  {
    id: "participant",
    title: "Active Participant",
    description: "Join programs, attend workshops, participate in discussions",
    icon: "🤝"
  },
  {
    id: "contributor",
    title: "Contributor",
    description: "Share knowledge, mentor others, lead initiatives",
    icon: "🌟"
  },
  {
    id: "volunteer",
    title: "Volunteer",
    description: "Help with events, support students, community outreach",
    icon: "❤️"
  }
];

const COMMUNITY_FOCUS_OPTIONS = [
  "Support student success",
  "Share professional expertise",
  "Learn new skills",
  "Build meaningful connections",
  "Give back to community",
  "Explore career opportunities",
  "Stay updated on trends",
  "Participate in discussions"
];

export default function CommunityOnboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedEngagement, setSelectedEngagement] = useState("");
  const [selectedFocus, setSelectedFocus] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    getFirebaseApp();
  }, []);

  const handleInterestToggle = (interest: string) => {
    setSelectedInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleFocusToggle = (focus: string) => {
    setSelectedFocus(prev => 
      prev.includes(focus) 
        ? prev.filter(f => f !== focus)
        : [...prev, focus]
    );
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    
    try {
      // Ensure user is authenticated
      if (!user) {
        const auth = getAuth();
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      }

      // Store onboarding data in localStorage (in real app, this would go to Firestore)
      const onboardingData = {
        role: 'community',
        interests: selectedInterests,
        engagement: selectedEngagement,
        focus: selectedFocus,
        completedAt: new Date().toISOString()
      };

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('beam-onboarding-data', JSON.stringify(onboardingData));
      }

      // Redirect to community dashboard
      router.push('/community-dashboard');
    } catch (error) {
      console.error('Onboarding completion failed:', error);
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return selectedInterests.length > 0;
      case 2:
        return selectedEngagement && selectedFocus.length > 0;
      case 3:
        return true; // Auth step is always valid
      default:
        return false;
    }
  };

  const easeStandard: [number, number, number, number] = [0.4, 0, 0.2, 1];

  return (
    <div className="min-h-screen bg-[#0b0d10] text-slate-200">
      <div className="container mx-auto px-4 py-8 pb-16 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-[#91B5FF] mb-2">
            Community Member Onboarding
          </h1>
          <p className="text-slate-400">
            Join the BEAM community and discover how you can participate
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-12">
          <div className="flex space-x-4">
            {STEPS.map((step) => (
              <div key={step.id} className="flex items-center">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                  ${currentStep >= step.id 
                    ? 'bg-[#91B5FF] text-[#0c1215]' 
                    : 'bg-[#1D2127] text-slate-400 border border-[#23262B]'
                  }
                `}>
                  {step.id}
                </div>
                {step.id < STEPS.length && (
                  <div className={`w-8 h-0.5 mx-2 ${
                    currentStep > step.id ? 'bg-[#91B5FF]' : 'bg-[#23262B]'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: easeStandard }}
            className="bg-[#1D2127] rounded-2xl border border-[#23262B] p-8 mb-8"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-medium text-white mb-2">
                {STEPS[currentStep - 1].title}
              </h2>
              <p className="text-slate-400">
                {STEPS[currentStep - 1].description}
              </p>
            </div>

            {currentStep === 1 && (
              <div>
                <h3 className="text-lg font-medium text-white mb-4">What interests you most?</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {INTEREST_OPTIONS.map((interest) => (
                    <motion.button
                      key={interest}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleInterestToggle(interest)}
                      className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                        selectedInterests.includes(interest)
                          ? 'bg-[#91B5FF] text-[#0c1215]'
                          : 'bg-[#0b0d10] border border-[#23262B] text-slate-300 hover:border-[#91B5FF]/30'
                      }`}
                    >
                      {interest}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">How would you like to participate?</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ENGAGEMENT_OPTIONS.map((engagement) => (
                      <motion.button
                        key={engagement.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedEngagement(engagement.id)}
                        className={`p-4 rounded-lg text-left transition-colors ${
                          selectedEngagement === engagement.id
                            ? 'bg-[#91B5FF] text-[#0c1215]'
                            : 'bg-[#0b0d10] border border-[#23262B] text-slate-300 hover:border-[#91B5FF]/30'
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="text-2xl">{engagement.icon}</span>
                          <span className="font-medium">{engagement.title}</span>
                        </div>
                        <div className="text-sm opacity-75">{engagement.description}</div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-white mb-4">What&apos;s your main focus?</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {COMMUNITY_FOCUS_OPTIONS.map((focus) => (
                      <motion.button
                        key={focus}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleFocusToggle(focus)}
                        className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                          selectedFocus.includes(focus)
                            ? 'bg-[#91B5FF] text-[#0c1215]'
                            : 'bg-[#0b0d10] border border-[#23262B] text-slate-300 hover:border-[#91B5FF]/30'
                        }`}
                      >
                        {focus}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="text-center">
                <div className="text-6xl mb-6">🌍</div>
                <h3 className="text-lg font-medium text-white mb-4">
                  Connect Your Community Profile
                </h3>
                <p className="text-slate-400 mb-6">
                  {user ? (
                    `Welcome to the community, ${user.displayName || 'Friend'}! Your profile is ready.`
                  ) : (
                    'Sign in with Google to complete your community profile and start exploring opportunities.'
                  )}
                </p>
                
                {!user && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={async () => {
                      try {
                        const auth = getAuth();
                        const provider = new GoogleAuthProvider();
                        await signInWithPopup(auth, provider);
                      } catch (error) {
                        console.error('Sign-in failed:', error);
                      }
                    }}
                    className="rounded-full bg-[#91B5FF] hover:brightness-95 transition-colors px-6 py-3 text-[#0c1215] font-medium"
                  >
                    Sign in with Google
                  </motion.button>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="px-6 py-3 rounded-full border border-[#23262B] text-slate-400 hover:text-white hover:border-[#91B5FF]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNext}
            disabled={!canProceed() || isLoading}
            className="px-6 py-3 rounded-full bg-[#91B5FF] hover:brightness-95 transition-colors text-[#0c1215] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Setting up...' : currentStep === STEPS.length ? 'Complete Setup' : 'Next'}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
