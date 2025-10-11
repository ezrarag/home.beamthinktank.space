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
    title: "Tell us your skills or goals",
    description: "Help us understand what you're looking to learn or achieve"
  },
  {
    id: 2,
    title: "Select preferred organizations",
    description: "Choose which NGOs or programs interest you most"
  },
  {
    id: 3,
    title: "Connect your BEAM profile",
    description: "Set up your account and connect your learning profile"
  }
];

const SKILL_OPTIONS = [
  "Engineering & Technology",
  "Construction & Trades",
  "Music & Performance",
  "Medicine & Healthcare",
  "Architecture & Design",
  "Business & Leadership",
  "Arts & Creativity",
  "Community Service"
];

const GOAL_OPTIONS = [
  "Find internship opportunities",
  "Get hands-on experience",
  "Learn new technical skills",
  "Build professional network",
  "Find mentorship",
  "Contribute to community projects",
  "Explore career paths",
  "Develop leadership skills"
];

export default function StudentOnboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedOrganizations, setSelectedOrganizations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    getFirebaseApp();
  }, []);

  const handleSkillToggle = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const handleGoalToggle = (goal: string) => {
    setSelectedGoals(prev => 
      prev.includes(goal) 
        ? prev.filter(g => g !== goal)
        : [...prev, goal]
    );
  };

  const handleOrgToggle = (org: string) => {
    setSelectedOrganizations(prev => 
      prev.includes(org) 
        ? prev.filter(o => o !== org)
        : [...prev, org]
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
        role: 'student',
        skills: selectedSkills,
        goals: selectedGoals,
        organizations: selectedOrganizations,
        completedAt: new Date().toISOString()
      };

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('beam-onboarding-data', JSON.stringify(onboardingData));
      }

      // Redirect to dashboard
      router.push('/participant-dashboard');
    } catch (error) {
      console.error('Onboarding completion failed:', error);
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return selectedSkills.length > 0 || selectedGoals.length > 0;
      case 2:
        return selectedOrganizations.length > 0;
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
            Student & Alumni Onboarding
          </h1>
          <p className="text-slate-400">
            Let&apos;s set up your BEAM profile to connect you with the right opportunities
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
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Your Skills & Interests</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {SKILL_OPTIONS.map((skill) => (
                      <motion.button
                        key={skill}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSkillToggle(skill)}
                        className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                          selectedSkills.includes(skill)
                            ? 'bg-[#91B5FF] text-[#0c1215]'
                            : 'bg-[#0b0d10] border border-[#23262B] text-slate-300 hover:border-[#91B5FF]/30'
                        }`}
                      >
                        {skill}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Your Goals</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {GOAL_OPTIONS.map((goal) => (
                      <motion.button
                        key={goal}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleGoalToggle(goal)}
                        className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                          selectedGoals.includes(goal)
                            ? 'bg-[#91B5FF] text-[#0c1215]'
                            : 'bg-[#0b0d10] border border-[#23262B] text-slate-300 hover:border-[#91B5FF]/30'
                        }`}
                      >
                        {goal}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Preferred Organizations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    'Build Future Foundation',
                    'Tech Engineers United',
                    'Youth Orchestra Network',
                    'Music Education Foundation',
                    'Medical Mentorship Program',
                    'Design Build Institute',
                    'Student Support Network'
                  ].map((org) => (
                    <motion.button
                      key={org}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleOrgToggle(org)}
                      className={`p-4 rounded-lg text-left transition-colors ${
                        selectedOrganizations.includes(org)
                          ? 'bg-[#91B5FF] text-[#0c1215]'
                          : 'bg-[#0b0d10] border border-[#23262B] text-slate-300 hover:border-[#91B5FF]/30'
                      }`}
                    >
                      <div className="font-medium">{org}</div>
                      <div className="text-xs opacity-75 mt-1">
                        {org.includes('Build') ? 'Construction & Engineering' :
                         org.includes('Tech') ? 'Technology & Innovation' :
                         org.includes('Orchestra') ? 'Music & Performance' :
                         org.includes('Music') ? 'Arts & Education' :
                         org.includes('Medical') ? 'Healthcare' :
                         org.includes('Design') ? 'Architecture & Design' :
                         'Student Support'}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="text-center">
                <div className="text-6xl mb-6">🎓</div>
                <h3 className="text-lg font-medium text-white mb-4">
                  Connect Your BEAM Profile
                </h3>
                <p className="text-slate-400 mb-6">
                  {user ? (
                    `Welcome back, ${user.displayName || 'Friend'}! Your profile is ready.`
                  ) : (
                    'Sign in with Google to complete your profile and start connecting with opportunities.'
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
