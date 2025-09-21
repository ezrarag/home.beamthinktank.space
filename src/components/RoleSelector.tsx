'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserRole } from '@/store/userStore';

interface RoleSelectorProps {
  location: {
    city: string;
    state: string;
    isNearUniversity: boolean;
  };
  onRoleSelected: (role: UserRole) => void;
  onGoBack?: () => void;
  canGoBack?: boolean;
}

export default function RoleSelector({ location, onRoleSelected, onGoBack, canGoBack = false }: RoleSelectorProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(
    location.isNearUniversity ? 'participant' : 'community'
  );
  const [isOpen, setIsOpen] = useState(false);

  const roles = [
    {
      value: 'participant' as UserRole,
      label: 'Participant (Student)',
      description: 'Free access to BEAM programs and resources',
      icon: '🎓'
    },
    {
      value: 'community' as UserRole,
      label: 'Community Member',
      description: '$75/month for travel, accommodations, and exclusive benefits',
      icon: '🌍'
    }
  ];

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setIsOpen(false);
    onRoleSelected(role);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
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
        
        <h2 className="text-3xl font-semibold text-system-text mb-md">
          Welcome to BEAM
        </h2>
        <p className="text-lg text-system-text-secondary mb-sm">
                  We think you&apos;re in <span className="font-medium text-apple-blue">{location.city}, {location.state}</span>.
        </p>
        <p className="text-base text-system-text-secondary">
          Are you a Participant or Community Member?
        </p>
      </div>

      <div className="relative">
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full p-lg bg-system-surface border border-system-border rounded-xl shadow-elevation-1 hover:shadow-elevation-2 hover:border-apple-blue focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent transition-all duration-normal transition-timing-function-material-standard"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label="Select your role"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {selectedRole && (
                <span className="text-2xl">
                  {roles.find(r => r.value === selectedRole)?.icon}
                </span>
              )}
              <div className="text-left">
                <div className="font-medium text-system-text">
                  {selectedRole ? roles.find(r => r.value === selectedRole)?.label : 'Select your role'}
                </div>
                {selectedRole && (
                  <div className="text-sm text-system-text-secondary">
                    {roles.find(r => r.value === selectedRole)?.description}
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
              className="absolute top-full left-0 right-0 mt-md bg-system-surface border border-system-border rounded-xl shadow-elevation-3 z-10 overflow-hidden"
              role="listbox"
              aria-label="Role options"
            >
              {roles.map((role) => (
                <motion.button
                  key={role.value}
                  onClick={() => handleRoleSelect(role.value)}
                  className="w-full px-xl py-lg text-left hover:bg-system-surface-secondary focus:outline-none focus:bg-system-surface-secondary transition-colors duration-normal transition-timing-function-material-standard"
                  whileHover={{ backgroundColor: 'hsl(0 0% 18%)' }}
                  whileTap={{ backgroundColor: 'hsl(0 0% 22%)' }}
                  role="option"
                  aria-selected={selectedRole === role.value}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{role.icon}</span>
                    <div>
                      <div className="font-medium text-system-text">{role.label}</div>
                      <div className="text-sm text-system-text-secondary">{role.description}</div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {selectedRole && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mt-6 text-center"
        >
          <motion.button
            onClick={() => onRoleSelected(selectedRole)}
            className="px-xl py-lg bg-apple-blue text-white font-medium rounded-xl hover:bg-apple-blue-dark focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2 focus:ring-offset-system-background transition-all duration-normal transition-timing-function-material-standard shadow-elevation-2 hover:shadow-elevation-3"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Continue
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
}
