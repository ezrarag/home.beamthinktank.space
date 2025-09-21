'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserStore, Interest } from '@/store/userStore';

interface InterestSelectorProps {
  selectedInterests: Interest[];
  onInterestToggle: (interest: Interest) => void;
  onGoBack?: () => void;
  canGoBack?: boolean;
  onContinue?: () => void;
}

export default function InterestSelector({ selectedInterests, onInterestToggle, onGoBack, canGoBack = false, onContinue }: InterestSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const interests = [
    {
      value: 'education' as Interest,
      label: 'Education',
      description: 'Learning, teaching, and educational resources',
      icon: '📚'
    },
    {
      value: 'finance' as Interest,
      label: 'Finance',
      description: 'Financial literacy, investment, and economic development',
      icon: '💰'
    },
    {
      value: 'music' as Interest,
      label: 'Music',
      description: 'Musical education, performance, and community programs',
      icon: '🎵'
    },
    {
      value: 'real-estate' as Interest,
      label: 'Real Estate',
      description: 'Housing development, community planning, and urban renewal',
      icon: '🏠'
    },
    {
      value: 'transportation' as Interest,
      label: 'Transportation',
      description: 'Sustainable mobility, public transit, and infrastructure',
      icon: '🚌'
    }
  ];

  const handleInterestToggle = (interest: Interest) => {
    onInterestToggle(interest);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="text-center mb-8">
        {canGoBack && onGoBack && (
          <motion.button
            onClick={onGoBack}
            className="mb-lg flex items-center text-system-text-tertiary hover:text-system-text-secondary transition-colors duration-normal transition-timing-function-apple"
            whileHover={{ x: -5 }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </motion.button>
        )}
        
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-3xl font-semibold text-system-text mb-md"
        >
          What brings you here?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-base text-system-text-secondary"
        >
          Select your area(s) of interest - you can choose multiple:
        </motion.p>
      </div>

      <div className="relative">
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full p-lg bg-system-surface border border-system-border rounded-xl shadow-elevation-1 hover:shadow-elevation-2 hover:border-apple-blue focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent transition-all duration-normal transition-timing-function-material-standard"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label="Select your area of interest"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {selectedInterests.length > 0 && (
                <span className="text-2xl">
                  {selectedInterests.length === 1 
                    ? interests.find(i => i.value === selectedInterests[0])?.icon
                    : '🎯'
                  }
                </span>
              )}
              <div className="text-left">
                <div className="font-medium text-system-text">
                  {selectedInterests.length === 0 
                    ? 'Select your interest(s)' 
                    : selectedInterests.length === 1
                    ? interests.find(i => i.value === selectedInterests[0])?.label
                    : `${selectedInterests.length} interests selected`
                  }
                </div>
                {selectedInterests.length > 0 && (
                  <div className="text-sm text-system-text-secondary">
                    {selectedInterests.length === 1 
                      ? interests.find(i => i.value === selectedInterests[0])?.description
                      : selectedInterests.map(interest => interests.find(i => i.value === interest)?.label).join(', ')
                    }
                  </div>
                )}
              </div>
            </div>
            <motion.svg
              className="w-5 h-5 text-system-text-tertiary"
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </motion.svg>
          </div>
        </motion.button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 right-0 mt-md bg-system-surface border border-system-border rounded-xl shadow-elevation-3 z-10 overflow-hidden max-h-80 overflow-y-auto"
              role="listbox"
              aria-label="Interest area options"
            >
              {interests.map((interest) => (
                <motion.button
                  key={interest.value}
                  onClick={() => handleInterestToggle(interest.value)}
                  className={`w-full px-xl py-lg text-left transition-colors duration-normal transition-timing-function-material-standard ${
                    selectedInterests.includes(interest.value)
                      ? 'bg-system-surface-tertiary border-l-4 border-apple-blue'
                      : 'hover:bg-system-surface-secondary focus:outline-none focus:bg-system-surface-secondary'
                  }`}
                  whileHover={{ backgroundColor: selectedInterests.includes(interest.value) ? 'hsl(0 0% 22%)' : 'hsl(0 0% 18%)' }}
                  whileTap={{ backgroundColor: selectedInterests.includes(interest.value) ? 'hsl(0 0% 24%)' : 'hsl(0 0% 20%)' }}
                  role="option"
                  aria-selected={selectedInterests.includes(interest.value)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                        selectedInterests.includes(interest.value)
                          ? 'bg-apple-blue border-apple-blue'
                          : 'border-system-border-secondary'
                      }`}>
                        {selectedInterests.includes(interest.value) && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <span className="text-2xl">{interest.icon}</span>
                    </div>
                    <div>
                      <div className="font-medium text-system-text">{interest.label}</div>
                      <div className="text-sm text-system-text-secondary">{interest.description}</div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {selectedInterests.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mt-6 text-center"
        >
          <motion.button
            onClick={onContinue}
            className="px-xl py-lg bg-apple-blue text-white font-medium rounded-xl hover:bg-apple-blue-dark focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2 focus:ring-offset-system-background transition-all duration-normal transition-timing-function-material-standard shadow-elevation-2 hover:shadow-elevation-3"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Continue ({selectedInterests.length} interest{selectedInterests.length > 1 ? 's' : ''} selected)
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
}
