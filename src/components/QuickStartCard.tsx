'use client';

import { motion } from 'framer-motion';
import { Interest, UserRole } from '@/store/userStore';

interface QuickStartCardProps {
  interests: Interest[];
  role: UserRole;
  onGoBack?: () => void;
  canGoBack?: boolean;
}

// Mock NGO data organized by interest area
const NGO_DATA = {
  education: {
    title: 'Education First Initiative',
    description: 'Connecting students with educational resources and mentorship opportunities.',
    focus: 'Student Success & Educational Equity',
    opportunities: [
      'Tutoring programs for underserved communities',
      'STEM mentorship for high school students',
      'College preparation workshops',
      'Digital literacy training'
    ],
    cta: {
      participant: {
        text: 'Join as a Student',
        action: 'Register for Programs',
        url: '#education-student'
      },
      community: {
        text: 'Support Education',
        action: 'Donate or Volunteer',
        url: '#education-community'
      }
    }
  },
  finance: {
    title: 'Financial Empowerment Network',
    description: 'Promoting financial literacy and economic development in communities.',
    focus: 'Financial Literacy & Economic Development',
    opportunities: [
      'Financial planning workshops',
      'Small business development programs',
      'Credit counseling services',
      'Investment education seminars'
    ],
    cta: {
      participant: {
        text: 'Learn Financial Skills',
        action: 'Join Workshops',
        url: '#finance-student'
      },
      community: {
        text: 'Invest in Community',
        action: 'Sponsor Programs',
        url: '#finance-community'
      }
    }
  },
  music: {
    title: 'Harmony Community Arts',
    description: 'Bringing music education and performance opportunities to all communities.',
    focus: 'Music Education & Community Arts',
    opportunities: [
      'Youth music programs',
      'Community concert series',
      'Instrument donation drives',
      'Music therapy sessions'
    ],
    cta: {
      participant: {
        text: 'Join Music Programs',
        action: 'Register for Classes',
        url: '#music-student'
      },
      community: {
        text: 'Support the Arts',
        action: 'Donate or Attend',
        url: '#music-community'
      }
    }
  },
  'real-estate': {
    title: 'Housing for All Coalition',
    description: 'Developing sustainable housing solutions and community development projects.',
    focus: 'Affordable Housing & Community Development',
    opportunities: [
      'Affordable housing development',
      'Community planning workshops',
      'Homebuyer education programs',
      'Neighborhood revitalization projects'
    ],
    cta: {
      participant: {
        text: 'Learn About Housing',
        action: 'Join Education Programs',
        url: '#housing-student'
      },
      community: {
        text: 'Invest in Housing',
        action: 'Support Development',
        url: '#housing-community'
      }
    }
  },
  transportation: {
    title: 'Sustainable Mobility Alliance',
    description: 'Promoting accessible and sustainable transportation solutions.',
    focus: 'Sustainable Transportation & Accessibility',
    opportunities: [
      'Public transit advocacy',
      'Bike-sharing programs',
      'Accessibility improvements',
      'Sustainable transport education'
    ],
    cta: {
      participant: {
        text: 'Join Transportation Initiatives',
        action: 'Get Involved',
        url: '#transportation-student'
      },
      community: {
        text: 'Support Mobility',
        action: 'Fund Programs',
        url: '#transportation-community'
      }
    }
  }
};

const INTEREST_ICONS = {
  education: '📚',
  finance: '💰',
  music: '🎵',
  'real-estate': '🏠',
  transportation: '🚌'
};

const ROLE_LABELS = {
  participant: 'Student',
  community: 'Community Member'
};

export default function QuickStartCard({ interests, role, onGoBack, canGoBack = false }: QuickStartCardProps) {
  // For now, show the first selected interest for simplicity
  // In a full implementation, you might want to show multiple cards or a combined view
  const primaryInterest = interests[0];
  const ngoData = NGO_DATA[primaryInterest];
  const ctaData = ngoData.cta[role];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full max-w-3xl mx-auto"
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-center mb-8"
      >
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
          Perfect! Here&apos;s your personalized experience
        </h2>
        <p className="text-system-text-secondary">
          Based on your interest in <span className="font-semibold text-apple-blue">
            {interests.map(i => i.replace('-', ' ')).join(', ')}
          </span> 
          {' '}as a <span className="font-semibold text-apple-blue">
            {ROLE_LABELS[role]}
          </span>
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="bg-gray-800 rounded-2xl shadow-xl border border-gray-700 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
          <div className="flex items-center space-x-4">
            <span className="text-4xl">{INTEREST_ICONS[primaryInterest]}</span>
            <div>
              <h3 className="text-2xl font-bold">{ngoData.title}</h3>
              <p className="text-blue-100 mt-1">{ngoData.description}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-white mb-3">
              Focus Area: {ngoData.focus}
            </h4>
            
            <div className="space-y-3">
              <h5 className="font-medium text-gray-200">Available Opportunities:</h5>
              <ul className="space-y-2">
                {ngoData.opportunities.map((opportunity, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.6 + index * 0.1 }}
                    className="flex items-start space-x-3"
                  >
                    <span className="text-green-500 mt-1">✓</span>
                    <span className="text-gray-300">{opportunity}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="bg-gray-700 rounded-lg p-6"
          >
            <div className="text-center">
              <h4 className="text-lg font-semibold text-white mb-2">
                Ready to get started?
              </h4>
              <p className="text-gray-300 mb-4">
                {role === 'participant' 
                  ? 'Join our educational programs and start making a difference!'
                  : 'Support our mission and help build stronger communities!'
                }
              </p>
              
              <div className="space-y-3">
                <motion.a
                  href={ctaData.url}
                  className="inline-block w-full sm:w-auto px-xl py-lg bg-apple-blue text-white font-medium rounded-xl hover:bg-apple-blue-dark focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2 focus:ring-offset-system-background transition-all duration-normal transition-timing-function-material-standard shadow-elevation-2 hover:shadow-elevation-3"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {ctaData.action}
                </motion.a>
                
                <p className="text-sm text-system-text-tertiary">
                  {role === 'community' && 'Subscription: $75/month • Includes travel, accommodations, and exclusive benefits'}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Restart Option */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1 }}
        className="text-center mt-6"
      >
        <button
          onClick={() => window.location.reload()}
          className="text-system-text-tertiary hover:text-system-text-secondary underline text-sm transition-colors duration-normal transition-timing-function-apple"
        >
          Start over with different preferences
        </button>
      </motion.div>
    </motion.div>
  );
}
