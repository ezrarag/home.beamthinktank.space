'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserStore, UserRole, Interest, UserLocation } from '@/store/userStore';
import LocationDetector from '@/components/LocationDetector';
import RoleSelector from '@/components/RoleSelector';
import InterestSelector from '@/components/InterestSelector';
import QuickStartCard from '@/components/QuickStartCard';

export default function HomePage() {
  const {
    location,
    role,
    interests,
    currentStep,
    isReturningUser,
    setLocation,
    setRole,
    addInterest,
    removeInterest,
    setReturningUser,
    resetFlow,
    goBack,
    setCurrentStep
  } = useUserStore();

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is returning
    const hasStoredData = location && role && interests.length > 0;
    if (hasStoredData) {
      setReturningUser(true);
    }
    setIsLoading(false);
  }, [location, role, interests, setReturningUser]);

  const handleLocationDetected = (userLocation: UserLocation) => {
    setLocation(userLocation);
  };

  const handleRoleSelected = (selectedRole: UserRole) => {
    setRole(selectedRole);
  };

  const handleInterestToggle = (interest: Interest) => {
    if (interests.includes(interest)) {
      removeInterest(interest);
    } else {
      addInterest(interest);
    }
  };

  const handleInterestContinue = () => {
    setCurrentStep('complete');
  };

  const handleRestart = () => {
    resetFlow();
    setReturningUser(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-system-background to-system-background-secondary flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-system-border border-t-apple-blue"></div>
      </div>
    );
  }

  // Show welcome back message for returning users
  if (isReturningUser && location && role && interests.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-system-background to-system-background-secondary flex items-center justify-center p-lg">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-2xl"
        >
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-center mb-8"
          >
            <h1 className="text-5xl font-semibold text-system-text mb-lg">
              Welcome back! 👋
            </h1>
            <p className="text-xl text-system-text-secondary">
              Ready to explore <span className="font-semibold text-apple-blue">
                {interests.map(i => i.replace('-', ' ')).join(', ')}
              </span> in <span className="font-semibold text-apple-blue">
                {location.city}
              </span> again?
            </p>
          </motion.div>

                  <QuickStartCard
                    interests={interests}
                    role={role}
                    onGoBack={handleRestart}
                    canGoBack={true}
                  />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="text-center mt-6"
          >
            <button
              onClick={handleRestart}
              className="text-system-text-tertiary hover:text-system-text-secondary underline transition-colors duration-normal transition-timing-function-apple"
            >
              Start over with different preferences
            </button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-system-background to-system-background-secondary flex items-center justify-center p-lg">
      <div className="w-full max-w-4xl">
        <AnimatePresence mode="wait">
          {currentStep === 'location' && (
            <motion.div
              key="location"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.5 }}
            >
              <LocationDetector onLocationDetected={handleLocationDetected} />
            </motion.div>
          )}

          {currentStep === 'role' && location && (
            <motion.div
              key="role"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.5 }}
            >
              <RoleSelector 
                location={location} 
                onRoleSelected={handleRoleSelected}
                onGoBack={goBack}
                canGoBack={true}
              />
            </motion.div>
          )}

          {currentStep === 'interest' && location && role && (
            <motion.div
              key="interest"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.5 }}
            >
              <InterestSelector 
                selectedInterests={interests}
                onInterestToggle={handleInterestToggle}
                onGoBack={goBack}
                canGoBack={true}
                onContinue={handleInterestContinue}
              />
            </motion.div>
          )}

          {currentStep === 'complete' && location && role && interests.length > 0 && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.5 }}
            >
                      <QuickStartCard
                        interests={interests}
                        role={role}
                        onGoBack={goBack}
                        canGoBack={true}
                      />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress Indicator */}
        {!isReturningUser && currentStep !== 'complete' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex justify-center mt-8 space-x-2"
          >
            {['location', 'role', 'interest'].map((step, index) => (
              <motion.div
                key={step}
                className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                  currentStep === step 
                    ? 'bg-apple-blue' 
                    : ['location', 'role', 'interest'].indexOf(currentStep) > index
                    ? 'bg-green-500'
                    : 'bg-system-border'
                }`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, delay: 0.7 + index * 0.1 }}
              />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}