import React, { useState } from 'react';
import { 
  SlidersHorizontal, 
  Sparkles, 
  Video, 
  Users, 
  Trophy, 
  Eye, 
  Layers, 
  Check, 
  ChevronDown,
  LayoutGrid,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type HomepageLayoutMode = 'broadcast' | 'members_first' | 'full_matrix';

interface HomepageLayoutCustomizerProps {
  currentMode: HomepageLayoutMode;
  onChangeMode: (mode: HomepageLayoutMode) => void;
  selectedSport: string;
  onChangeSport: (sport: string) => void;
}

export const HomepageLayoutCustomizer: React.FC<HomepageLayoutCustomizerProps> = ({
  currentMode,
  onChangeMode,
  selectedSport,
  onChangeSport
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const layoutOptions = [
    {
      id: 'broadcast' as HomepageLayoutMode,
      label: '4K Broadcast Primetime',
      desc: 'Direct video player, live channels & featured athletes',
      icon: Video,
      accent: 'from-[#FF6A00] to-[#E05D00]'
    },
    {
      id: 'members_first' as HomepageLayoutMode,
      label: 'Athletes & Members Spotlight',
      desc: 'Visual sliders, scout ratings & athlete portfolios',
      icon: Users,
      accent: 'from-[#00B8D4] to-[#0091EA]'
    },
    {
      id: 'full_matrix' as HomepageLayoutMode,
      label: 'Full Championship Matrix',
      desc: 'All feeds, live scores, calendar sync & brackets',
      icon: Trophy,
      accent: 'from-[#EC4899] to-[#F43F5E]'
    }
  ];

  return (
    <div className="relative z-20">
      
      {/* COMPACT CONTROL BAR */}
      <div className="frosted-glass rounded-2xl p-2 sm:p-2.5 border border-white/20 dark:border-white/15 shadow-md flex flex-wrap items-center justify-between gap-2.5">
        
        {/* LEFT: MODE PILLS */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          <span className="text-[10px] font-mono font-black uppercase text-slate-500 dark:text-slate-400 px-2 flex items-center gap-1 shrink-0">
            <LayoutGrid className="w-3 h-3 text-[#FF6A00]" />
            <span className="hidden sm:inline">LAYOUT:</span>
          </span>

          {layoutOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = currentMode === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => onChangeMode(opt.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? `bg-gradient-to-r ${opt.accent} text-white shadow-md border border-white/30 scale-102`
                    : 'clear-glass text-slate-600 dark:text-slate-300 hover:text-[#263238] dark:hover:text-white hover:border-white/30'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* RIGHT: CUSTOMIZER INFO / DROPDOWN TRIGGER */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="px-3 py-1.5 rounded-xl clear-glass hover:border-[#00B8D4] text-[#263238] dark:text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs hover:glow-cyan"
            id="homepage-customize-btn"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#00B8D4]" />
            <span className="hidden md:inline">Custom View Options</span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

      </div>

      {/* EXPANDABLE CUSTOMIZER ACCORDION */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="mt-2.5 p-4 rounded-3xl frosted-glass border border-white/20 dark:border-white/15 shadow-2xl overflow-hidden"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/15 pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#FF6A00]" />
                  <h4 className="text-xs font-mono font-black uppercase text-[#263238] dark:text-white tracking-wider">
                    Front-Page Visual Experience Settings
                  </h4>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-xs text-slate-400 hover:text-white font-mono cursor-pointer"
                >
                  Done
                </button>
              </div>

              {/* 3 LAYOUT CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {layoutOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = currentMode === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => onChangeMode(opt.id)}
                      className={`p-3.5 rounded-2xl transition-all cursor-pointer border flex flex-col justify-between space-y-2 ${
                        isSelected
                          ? 'bg-white/15 dark:bg-[#1E282D] border-[#FF6A00] shadow-[0_0_20px_rgba(255,106,0,0.3)]'
                          : 'clear-glass hover:bg-white/10 border-white/15 hover:border-[#00B8D4]/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="p-2 rounded-xl bg-white/10 text-white">
                          <Icon className="w-4 h-4" />
                        </div>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-[#FF6A00] text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="text-xs font-bold text-[#263238] dark:text-white uppercase">
                          {opt.label}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                          {opt.desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
