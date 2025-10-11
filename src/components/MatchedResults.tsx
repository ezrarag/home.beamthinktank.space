"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

interface NGO {
  id: string;
  name: string;
  description: string;
  category: string;
  domain: string;
}

interface MatchedResultsProps {
  NGOs: NGO[];
  onReset: () => void;
}

export default function MatchedResults({ NGOs, onReset }: MatchedResultsProps) {
  const router = useRouter();

  const handleStartOnboarding = (ngo: NGO) => {
    // Store the selected NGO in localStorage for onboarding
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('beam-selected-ngo', JSON.stringify(ngo));
    }
    
    // Redirect to general onboarding (could be made more specific based on NGO)
    router.push('/onboard/community');
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      construction: '🏗️',
      engineering: '⚙️',
      orchestra: '🎼',
      music: '🎵',
      medicine: '⚕️',
      architecture: '🏛️',
      support: '🤝',
      general: '🌟'
    };
    return icons[category] || '🌟';
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      construction: 'from-orange-500/20 to-red-500/20',
      engineering: 'from-blue-500/20 to-cyan-500/20',
      orchestra: 'from-purple-500/20 to-pink-500/20',
      music: 'from-pink-500/20 to-rose-500/20',
      medicine: 'from-green-500/20 to-emerald-500/20',
      architecture: 'from-amber-500/20 to-yellow-500/20',
      support: 'from-teal-500/20 to-blue-500/20',
      general: 'from-slate-500/20 to-gray-500/20'
    };
    return colors[category] || 'from-slate-500/20 to-gray-500/20';
  };

  const easeStandard: [number, number, number, number] = [0.4, 0, 0.2, 1];

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: easeStandard }}
        className="text-center mb-6"
      >
        <h3 className="text-xl font-medium text-white mb-2">
          We found {NGOs.length} matching {NGOs.length === 1 ? 'opportunity' : 'opportunities'}
        </h3>
        <p className="text-sm text-slate-400">
          Based on your interest, here are some organizations that might be a great fit
        </p>
      </motion.div>

      <div className="space-y-3">
        {NGOs.map((ngo, index) => (
          <motion.div
            key={ngo.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.4, 
              ease: easeStandard,
              delay: index * 0.1 
            }}
            className="group relative overflow-hidden rounded-2xl bg-[#1D2127] border border-[#23262B] p-6 hover:border-[#91B5FF]/30 transition-all duration-300 hover:shadow-[0_8px_32px_rgba(145,181,255,0.1)]"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 flex-1">
                <div className="text-3xl">
                  {getCategoryIcon(ngo.category)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-lg font-medium text-white mb-2 group-hover:text-[#91B5FF] transition-colors">
                    {ngo.name}
                  </h4>
                  <p className="text-sm text-slate-400 mb-3 leading-relaxed">
                    {ngo.description}
                  </p>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-[#91B5FF]/10 text-[#91B5FF] border border-[#91B5FF]/20">
                      {ngo.category}
                    </span>
                    <span className="text-xs text-slate-500">
                      {ngo.domain}
                    </span>
                  </div>
                </div>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleStartOnboarding(ngo)}
                className="ml-4 shrink-0 rounded-full bg-[#91B5FF] hover:brightness-95 transition-colors px-6 py-2 text-sm font-medium text-[#0c1215]"
              >
                Start Onboarding
              </motion.button>
            </div>

            {/* Gradient overlay on hover */}
            <motion.div
              className={`absolute inset-0 bg-gradient-to-r ${getCategoryColor(ngo.category)} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl`}
              initial={false}
            />
          </motion.div>
        ))}
      </div>

      {/* Alternative actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: easeStandard, delay: 0.3 }}
        className="text-center pt-4 border-t border-[#23262B]"
      >
        <p className="text-xs text-slate-500 mb-3">
          Don&apos;t see what you&apos;re looking for?
        </p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={onReset}
            className="text-xs text-[#91B5FF] hover:text-[#91B5FF]/80 transition-colors underline"
          >
            Try a different search
          </button>
          <span className="text-xs text-slate-600">•</span>
          <button
            onClick={() => router.push('/onboard/community')}
            className="text-xs text-[#91B5FF] hover:text-[#91B5FF]/80 transition-colors underline"
          >
            Browse all opportunities
          </button>
        </div>
      </motion.div>
    </div>
  );
}
