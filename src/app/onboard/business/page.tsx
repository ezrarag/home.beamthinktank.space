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
    title: "Tell us about your organization",
    description: "Help us understand your company's mission and needs"
  },
  {
    id: 2,
    title: "Select partnership opportunities",
    description: "Choose how you'd like to support students and the community"
  },
  {
    id: 3,
    title: "Connect your BEAM profile",
    description: "Set up your business account and verification"
  }
];

const COMPANY_SIZE_OPTIONS = [
  "Startup (1-10 employees)",
  "Small Business (11-50 employees)",
  "Medium Business (51-200 employees)",
  "Large Corporation (200+ employees)",
  "Non-Profit Organization",
  "Government Agency"
];

const INDUSTRY_OPTIONS = [
  "Technology & Software",
  "Construction & Engineering",
  "Healthcare & Medical",
  "Music & Entertainment",
  "Architecture & Design",
  "Education & Training",
  "Finance & Banking",
  "Manufacturing",
  "Consulting & Services",
  "Other"
];

const PARTNERSHIP_OPTIONS = [
  {
    id: "internships",
    title: "Offer Internship Opportunities",
    description: "Provide hands-on learning experiences for students"
  },
  {
    id: "mentorship",
    title: "Provide Mentorship",
    description: "Guide students in their career development"
  },
  {
    id: "projects",
    title: "Collaborative Projects",
    description: "Work together on real-world challenges"
  },
  {
    id: "funding",
    title: "Sponsor Programs",
    description: "Support educational initiatives financially"
  },
  {
    id: "resources",
    title: "Share Resources",
    description: "Provide tools, equipment, or expertise"
  },
  {
    id: "hiring",
    title: "Direct Hiring",
    description: "Recruit talent from the BEAM network"
  }
];

export default function BusinessOnboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [companyName, setCompanyName] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPartnerships, setSelectedPartnerships] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    getFirebaseApp();
  }, []);

  const handlePartnershipToggle = (partnershipId: string) => {
    setSelectedPartnerships(prev => 
      prev.includes(partnershipId) 
        ? prev.filter(p => p !== partnershipId)
        : [...prev, partnershipId]
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
        role: 'business',
        companyName,
        companySize,
        industry,
        description,
        partnerships: selectedPartnerships,
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
        return companyName.trim() && companySize && industry;
      case 2:
        return selectedPartnerships.length > 0;
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
            Business & Partner Onboarding
          </h1>
          <p className="text-slate-400">
            Let&apos;s set up your organization&apos;s profile to connect with talented students
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
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Company/Organization Name *
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Enter your organization's name"
                    className="w-full px-4 py-3 rounded-lg bg-[#0b0d10] border border-[#23262B] text-white placeholder-slate-500 focus:border-[#91B5FF] focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Company Size *
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {COMPANY_SIZE_OPTIONS.map((size) => (
                      <motion.button
                        key={size}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setCompanySize(size)}
                        className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                          companySize === size
                            ? 'bg-[#91B5FF] text-[#0c1215]'
                            : 'bg-[#0b0d10] border border-[#23262B] text-slate-300 hover:border-[#91B5FF]/30'
                        }`}
                      >
                        {size}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Industry *
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {INDUSTRY_OPTIONS.map((ind) => (
                      <motion.button
                        key={ind}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIndustry(ind)}
                        className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                          industry === ind
                            ? 'bg-[#91B5FF] text-[#0c1215]'
                            : 'bg-[#0b0d10] border border-[#23262B] text-slate-300 hover:border-[#91B5FF]/30'
                        }`}
                      >
                        {ind}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Brief Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell us about your organization's mission and what makes you unique..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg bg-[#0b0d10] border border-[#23262B] text-white placeholder-slate-500 focus:border-[#91B5FF] focus:outline-none transition-colors resize-none"
                  />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div>
                <h3 className="text-lg font-medium text-white mb-6">How would you like to partner with BEAM?</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {PARTNERSHIP_OPTIONS.map((partnership) => (
                    <motion.button
                      key={partnership.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handlePartnershipToggle(partnership.id)}
                      className={`p-4 rounded-lg text-left transition-colors ${
                        selectedPartnerships.includes(partnership.id)
                          ? 'bg-[#91B5FF] text-[#0c1215]'
                          : 'bg-[#0b0d10] border border-[#23262B] text-slate-300 hover:border-[#91B5FF]/30'
                      }`}
                    >
                      <div className="font-medium mb-2">{partnership.title}</div>
                      <div className="text-sm opacity-75">{partnership.description}</div>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="text-center">
                <div className="text-6xl mb-6">🏢</div>
                <h3 className="text-lg font-medium text-white mb-4">
                  Connect Your Business Profile
                </h3>
                <p className="text-slate-400 mb-6">
                  {user ? (
                    `Welcome back, ${user.displayName || 'Partner'}! Your business profile is ready.`
                  ) : (
                    'Sign in with Google to complete your business profile and start connecting with students.'
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
