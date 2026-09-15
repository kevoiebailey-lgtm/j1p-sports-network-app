import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Users,
  Layers,
  FileSpreadsheet,
  GitFork,
  HelpCircle,
  X,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Calendar,
  Clock,
  Radio,
  FileText,
  Upload,
  UserCheck,
  Settings,
  Flame,
  Award
} from 'lucide-react';
import { triggerHaptic } from '../../lib/haptics';

interface TournamentGuideWalkthroughModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCreateTournament?: () => void;
  onOpenBulkImporter?: () => void;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'Divisions' | 'Team Rosters' | 'Brackets & Seeding' | 'Live Scoring';
}

const FAQ_LIST: FAQItem[] = [
  {
    id: 'faq-1',
    category: 'Divisions',
    question: 'How do divisions and age groups work when creating a tournament?',
    answer:
      'When you create a tournament in the Event Wizard or Tournament Dashboard, you can create multiple divisions (e.g. 10U Girls, 12U Boys Elite, 14U Open, High School Varsity). Each division functions as an isolated competition pool with its own teams, standings, schedule, and championship bracket.'
  },
  {
    id: 'faq-2',
    category: 'Team Rosters',
    question: 'How do teams get added into each specific division?',
    answer:
      'There are 3 primary ways:\n1. Self-Service Coach Registration: Coaches click "Register Team", select their age division from the dropdown, and submit their roster & contact info.\n2. Host Dashboard Entry: In the Tournament Dashboard > Teams tab, select the division filter and click "+ Add Team" to manually enter teams.\n3. Universal Bulk Importer: Upload a CSV/Excel file with columns for Team Name and Division to load dozens of teams across divisions instantly.'
  },
  {
    id: 'faq-3',
    category: 'Brackets & Seeding',
    question: 'How do teams get placed and seeded onto the bracket?',
    answer:
      'You can use either:\n• Auto-Seeding Engine: Calculates tiebreakers from pool play (Win %, Point Differential, Head-to-Head) and automatically assigns Seeds #1 through #8 into the bracket.\n• Manual Node Selection: Click any matchup node on the bracket canvas to manually choose the Home and Away teams.'
  },
  {
    id: 'faq-4',
    category: 'Team Rosters',
    question: 'Can a club or coach register multiple squads in different divisions?',
    answer:
      'Yes! A club director can submit separate registrations for their 12U, 14U, and 17U teams. Each squad is assigned to its appropriate division roster, and players can be assigned specific jersey numbers and digital QR pass cards.'
  },
  {
    id: 'faq-5',
    category: 'Live Scoring',
    question: 'How do bracket matchups update when games finish?',
    answer:
      'Scorekeepers and referees can enter final scores via the Referee Clock Pad or Match Call Desk. When a match is marked "Completed", the system advances the winning team to the next round automatically in real-time across all mobile and web displays.'
  },
  {
    id: 'faq-6',
    category: 'Divisions',
    question: 'Can I add or rename divisions after the tournament is created?',
    answer:
      'Yes. In the Tournament Management tab, click "Edit Tournament" to add new age groups, change game durations, or adjust court assignments at any time before or during the event.'
  }
];

const STEPS = [
  {
    step: 1,
    title: 'Create Divisions & Age Groups',
    subtitle: 'Setup competition tiers in the Event Wizard',
    icon: Layers,
    accent: 'from-[#00E5FF] to-[#00B8D4]',
    badgeBg: 'bg-[#00E5FF]/15 text-[#00E5FF] border-[#00E5FF]/30',
    description:
      'Start by defining your event structure. In the Tournament Builder or Create Event Modal, specify the sports discipline and add your division list (e.g. 10U, 12U, 14U, 17U, Open).',
    bullets: [
      'Define age cutoffs, gender brackets (Boys, Girls, Co-Ed), and skill tiers.',
      'Assign dedicated courts/fields and game duration rules per division.',
      'Set team capacity limits (e.g. 8-team or 16-team pools).'
    ]
  },
  {
    step: 2,
    title: 'Add Teams to Each Division',
    subtitle: 'Self-service registration or manual entry',
    icon: Users,
    accent: 'from-[#39FF14] to-[#00E5FF]',
    badgeBg: 'bg-[#39FF14]/15 text-[#39FF14] border-[#39FF14]/30',
    description:
      'Teams are placed into specific divisions so their schedules, standings, and brackets stay organized.',
    bullets: [
      'Self-Service Flow: Visiting coaches click "Register Team", pick their division, and input roster details.',
      'Manual Host Entry: Switch division filters in the Tournament Dashboard and click "Add Team".',
      'Digital Passes: Player rosters automatically generate scannable QR digital ID cards for check-in.'
    ]
  },
  {
    step: 3,
    title: 'Universal Bulk Importer (CSV)',
    subtitle: 'Instant multi-division team ingestion',
    icon: FileSpreadsheet,
    accent: 'from-amber-400 to-[#FF6A00]',
    badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    description:
      'Got 20+ teams across 4 age groups? Use the Universal Bulk Importer to upload all squads in seconds.',
    bullets: [
      'Download the standard CSV template with Team Name, Division, Coach Email, and Seed.',
      'Drag-and-drop your spreadsheet to auto-populate all division pools at once.',
      'Auto-validates team names and flags any duplicate registrations.'
    ]
  },
  {
    step: 4,
    title: 'Seed & Launch Tournament Brackets',
    subtitle: 'Auto-seeding engine or custom matchups',
    icon: GitFork,
    accent: 'from-purple-500 to-[#00E5FF]',
    badgeBg: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    description:
      'Connect teams directly into single elimination, double brackets, or pool-to-bracket playoffs.',
    bullets: [
      'Auto-Seeding Engine: Computes tiebreakers from pool play and seeds #1 vs #8, #2 vs #7, etc.',
      'Manual Bracket Node Editor: Click any match on the bracket tree to override or assign custom matchups.',
      'Real-time Progression: Final game scores advance winners automatically to the championship round.'
    ]
  }
];

export const TournamentGuideWalkthroughModal: React.FC<TournamentGuideWalkthroughModalProps> = ({
  isOpen,
  onClose,
  onOpenCreateTournament,
  onOpenBulkImporter
}) => {
  const [activeTab, setActiveTab] = useState<'walkthrough' | 'faq'>('walkthrough');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('faq-2');
  const [faqFilterCategory, setFaqFilterCategory] = useState<string>('All');

  if (!isOpen) return null;

  const currentStep = STEPS[currentStepIndex];

  const filteredFaqs = FAQ_LIST.filter(
    (item) => faqFilterCategory === 'All' || item.category === faqFilterCategory
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-[#131B26] border border-white/15 rounded-3xl w-full max-w-3xl shadow-[0_0_80px_rgba(0,0,0,0.95)] relative overflow-hidden font-sans text-slate-100 max-h-[92vh] flex flex-col my-auto"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-[#00E5FF]/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-[#39FF14]/10 rounded-full blur-[100px] pointer-events-none" />

          {/* Top Bar / Header */}
          <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between shrink-0 relative z-10 bg-[#0B0F17]/70 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#00E5FF]/20 to-[#39FF14]/20 border border-[#00E5FF]/30 text-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.2)]">
                <Trophy className="w-5 h-5 text-[#00E5FF]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black uppercase text-white tracking-tight">
                    Tournament & Division Guide
                  </h2>
                  <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/30">
                    Host & Coach Hub
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono">
                  Master creating divisions, adding teams, bulk importing, and bracket seeding
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer border border-white/10"
              title="Close guide"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Switch Tabs: Step Walkthrough vs. Interactive FAQ */}
          <div className="flex items-center gap-2 px-5 sm:px-6 pt-3 pb-2 border-b border-white/5 bg-[#0B0F17]/40 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('walkthrough')}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'walkthrough'
                  ? 'bg-[#00E5FF] text-[#0B0F17] shadow-[0_0_15px_rgba(0,229,255,0.3)] font-black'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>Step-by-Step Walkthrough</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('faq')}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'faq'
                  ? 'bg-[#00E5FF] text-[#0B0F17] shadow-[0_0_15px_rgba(0,229,255,0.3)] font-black'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Tournament & Teams FAQ</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/20">
                {FAQ_LIST.length}
              </span>
            </button>
          </div>

          {/* Main Body */}
          <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
            {activeTab === 'walkthrough' ? (
              <div className="space-y-6">
                {/* Step Selector Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {STEPS.map((s, idx) => {
                    const StepIcon = s.icon;
                    const isCurrent = idx === currentStepIndex;
                    return (
                      <button
                        key={s.step}
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setCurrentStepIndex(idx);
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                          isCurrent
                            ? 'bg-[#00E5FF]/15 border-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.25)]'
                            : 'bg-[#0B0F17] border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${s.badgeBg}`}>
                            STEP {s.step}
                          </span>
                          <StepIcon className={`w-4 h-4 ${isCurrent ? 'text-[#00E5FF]' : 'text-slate-500'}`} />
                        </div>
                        <span className="text-xs font-bold text-white line-clamp-1">
                          {s.title}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Active Step Showcase Card */}
                <div className="bg-[#0B0F17] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-5 relative overflow-hidden">
                  <div className={`h-1.5 w-full bg-gradient-to-r ${currentStep.accent} rounded-full`} />

                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${currentStep.badgeBg}`}>
                          STEP {currentStep.step} OF {STEPS.length}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {currentStep.subtitle}
                        </span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                        {currentStep.title}
                      </h3>
                    </div>

                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-[#00E5FF] shrink-0">
                      <currentStep.icon className="w-6 h-6" />
                    </div>
                  </div>

                  <p className="text-sm text-slate-300 leading-relaxed font-sans">
                    {currentStep.description}
                  </p>

                  {/* Bullet Highlights */}
                  <div className="space-y-2.5 pt-2">
                    <div className="text-[11px] font-mono font-bold uppercase text-slate-400">
                      Key Highlights & Actions:
                    </div>
                    {currentStep.bullets.map((b, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-slate-200">
                        <CheckCircle2 className="w-4 h-4 text-[#39FF14] shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>

                  {/* Interactive Jump Actions according to step */}
                  <div className="pt-4 border-t border-white/10 flex flex-wrap items-center gap-3">
                    {currentStep.step === 1 && onOpenCreateTournament && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenCreateTournament();
                        }}
                        className="px-4 py-2 rounded-xl bg-[#00E5FF] hover:bg-[#00B8D4] text-[#0B0F17] font-black text-xs font-mono uppercase flex items-center gap-2 shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all cursor-pointer"
                      >
                        <Trophy className="w-4 h-4" />
                        <span>Launch Event Builder Wizard</span>
                      </button>
                    )}

                    {currentStep.step === 3 && onOpenBulkImporter && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenBulkImporter();
                        }}
                        className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#0B0F17] font-black text-xs font-mono uppercase flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Open Bulk CSV Importer</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Step Next / Previous Navigation */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    disabled={currentStepIndex === 0}
                    onClick={() => {
                      triggerHaptic('light');
                      setCurrentStepIndex((prev) => Math.max(0, prev - 1));
                    }}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono font-bold text-slate-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    ← Previous Step
                  </button>

                  <div className="text-xs font-mono text-slate-400">
                    Step {currentStepIndex + 1} of {STEPS.length}
                  </div>

                  {currentStepIndex < STEPS.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setCurrentStepIndex((prev) => Math.min(STEPS.length - 1, prev + 1));
                      }}
                      className="px-4 py-2 rounded-xl bg-[#00E5FF] hover:bg-[#00B8D4] text-[#0B0F17] font-black text-xs font-mono uppercase flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                    >
                      <span>Next Step</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveTab('faq')}
                      className="px-4 py-2 rounded-xl bg-[#39FF14] hover:bg-[#32e012] text-[#0B0F17] font-black text-xs font-mono uppercase flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_15px_rgba(57,255,20,0.3)]"
                    >
                      <span>Explore FAQs</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* FAQ TAB */
              <div className="space-y-5">
                {/* Category Filters */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                  {['All', 'Divisions', 'Team Rosters', 'Brackets & Seeding', 'Live Scoring'].map(
                    (cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFaqFilterCategory(cat)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                          faqFilterCategory === cat
                            ? 'bg-[#00E5FF] text-[#0B0F17] shadow-[0_0_12px_rgba(0,229,255,0.3)]'
                            : 'bg-[#0B0F17] text-slate-400 hover:text-white border border-white/10'
                        }`}
                      >
                        {cat}
                      </button>
                    )
                  )}
                </div>

                {/* FAQ Accordion List */}
                <div className="space-y-3">
                  {filteredFaqs.map((faq) => {
                    const isExpanded = expandedFaqId === faq.id;
                    return (
                      <div
                        key={faq.id}
                        className="bg-[#0B0F17] border border-white/10 rounded-2xl overflow-hidden transition-colors hover:border-white/20"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic('light');
                            setExpandedFaqId(isExpanded ? null : faq.id);
                          }}
                          className="w-full p-4 text-left flex items-start justify-between gap-3 cursor-pointer"
                        >
                          <div className="space-y-1">
                            <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-white/5 text-[#00E5FF] border border-white/10">
                              {faq.category}
                            </span>
                            <h4 className="text-sm font-bold text-white pt-1">
                              {faq.question}
                            </h4>
                          </div>

                          <div className="p-1 rounded-lg bg-white/5 text-slate-400 shrink-0 mt-1">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-[#00E5FF]" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-4 pt-1 text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-line border-t border-white/5">
                            {faq.answer}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer Action Bar */}
          <div className="p-4 sm:p-5 border-t border-white/10 bg-[#0B0F17]/90 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <Sparkles className="w-4 h-4 text-[#00E5FF]" />
              <span>Multi-Sport Division & Tournament Engine Active</span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-slate-300 transition-colors cursor-pointer border border-white/10"
              >
                Close Guide
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
