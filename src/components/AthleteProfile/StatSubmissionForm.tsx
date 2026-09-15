import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { SportSelector } from '../Common/SportSelector';
import { getSportEmoji } from '../../lib/sports';
import { 
  Trophy, 
  Calendar, 
  Plus, 
  Minus,
  Check, 
  ShieldAlert, 
  Activity, 
  Trash2, 
  Flame,
  Zap,
  Sparkles,
  RotateCcw,
  Smartphone,
  Award,
  CheckCircle2,
  TrendingUp,
  Share2
} from 'lucide-react';

export interface StatItem {
  id?: string;
  athleteUid: string;
  gameDate: string;
  opponent: string;
  sport: string;
  gameResult: 'W' | 'L' | 'T';
  teamScore: number;
  opponentScore: number;
  points: number;
  assists: number;
  rebounds: number;
  steals: number;
  blocks: number;
  notes?: string;
  createdAt?: any;
}

interface QuickPreset {
  id: string;
  label: string;
  emoji: string;
  badge: string;
  points: number;
  assists: number;
  rebounds: number;
  steals: number;
  blocks: number;
  gameResult: 'W' | 'L' | 'T';
  teamScore: number;
  opponentScore: number;
  notes: string;
}

const SPORT_PRESETS: Record<string, QuickPreset[]> = {
  Basketball: [
    {
      id: 'bball-solid',
      label: 'Solid Game',
      emoji: '🏀',
      badge: 'Balanced',
      points: 18,
      assists: 5,
      rebounds: 6,
      steals: 2,
      blocks: 1,
      gameResult: 'W',
      teamScore: 74,
      opponentScore: 68,
      notes: 'Solid scoring efficiency and strong floor vision.'
    },
    {
      id: 'bball-double-double',
      label: 'Double-Double',
      emoji: '🔥',
      badge: '20+ PTS / 10+ REB',
      points: 24,
      assists: 4,
      rebounds: 11,
      steals: 2,
      blocks: 2,
      gameResult: 'W',
      teamScore: 82,
      opponentScore: 75,
      notes: 'Controlled the paint with a double-double performance.'
    },
    {
      id: 'bball-triple-double',
      label: 'Triple-Double',
      emoji: '⚡',
      badge: 'Elite 3-Stat',
      points: 28,
      assists: 11,
      rebounds: 10,
      steals: 3,
      blocks: 1,
      gameResult: 'W',
      teamScore: 91,
      opponentScore: 84,
      notes: 'Dominant triple-double output controlling all phases of play.'
    },
    {
      id: 'bball-high-scorer',
      label: 'High Scorer',
      emoji: '🎯',
      badge: '30+ PTS',
      points: 34,
      assists: 3,
      rebounds: 5,
      steals: 2,
      blocks: 0,
      gameResult: 'W',
      teamScore: 88,
      opponentScore: 80,
      notes: 'Explosive scoring output shooting lights-out.'
    },
    {
      id: 'bball-defense',
      label: 'Lockdown Defense',
      emoji: '🛡️',
      badge: 'Steals & Blocks',
      points: 14,
      assists: 4,
      rebounds: 8,
      steals: 6,
      blocks: 4,
      gameResult: 'W',
      teamScore: 65,
      opponentScore: 58,
      notes: 'Suffocating defensive pressure leading to transition points.'
    }
  ],
  'Flag Football': [
    {
      id: 'ff-qb',
      label: 'QB Masterclass',
      emoji: '🏈',
      badge: '4 Pass TD',
      points: 24,
      assists: 4,
      rebounds: 0,
      steals: 1,
      blocks: 0,
      gameResult: 'W',
      teamScore: 32,
      opponentScore: 18,
      notes: 'Threw 4 touchdown passes with zero interceptions.'
    },
    {
      id: 'ff-receiver',
      label: 'Speed Receiver',
      emoji: '⚡',
      badge: '2 Rec TD',
      points: 12,
      assists: 1,
      rebounds: 0,
      steals: 2,
      blocks: 0,
      gameResult: 'W',
      teamScore: 24,
      opponentScore: 12,
      notes: 'Hauled in 2 touchdown receptions and 110 yards.'
    },
    {
      id: 'ff-defense',
      label: 'Lockdown DB',
      emoji: '🛡️',
      badge: '2 INTs / Flag Pulls',
      points: 12,
      assists: 0,
      rebounds: 0,
      steals: 3,
      blocks: 1,
      gameResult: 'W',
      teamScore: 28,
      opponentScore: 6,
      notes: 'Returned an interception for a Pick-6 & pulled 8 flags.'
    }
  ],
  Lacrosse: [
    {
      id: 'lax-hattrick',
      label: 'Hat Trick Hero',
      emoji: '🥍',
      badge: '3 Goals',
      points: 3,
      assists: 2,
      rebounds: 5,
      steals: 2,
      blocks: 0,
      gameResult: 'W',
      teamScore: 11,
      opponentScore: 7,
      notes: 'Scored hat trick and picked up 5 ground balls.'
    },
    {
      id: 'lax-feeder',
      label: 'Playmaker Feeder',
      emoji: '🎯',
      badge: '4+ Assists',
      points: 1,
      assists: 5,
      rebounds: 4,
      steals: 1,
      blocks: 0,
      gameResult: 'W',
      teamScore: 14,
      opponentScore: 9,
      notes: 'Dished out 5 pinpoint assists behind the crease.'
    }
  ],
  Soccer: [
    {
      id: 'soc-brace',
      label: 'Match Winner',
      emoji: '⚽',
      badge: '2 Goals',
      points: 2,
      assists: 1,
      rebounds: 4,
      steals: 3,
      blocks: 0,
      gameResult: 'W',
      teamScore: 3,
      opponentScore: 1,
      notes: 'Scored 2 goals including the match winner.'
    }
  ],
  Football: [
    {
      id: 'fb-rb',
      label: 'Workhorse RB',
      emoji: '🏈',
      badge: '2 TD Game',
      points: 12,
      assists: 0,
      rebounds: 0,
      steals: 0,
      blocks: 0,
      gameResult: 'W',
      teamScore: 28,
      opponentScore: 14,
      notes: '120+ total rushing yards and 2 touchdowns.'
    }
  ],
  Volleyball: [
    {
      id: 'vb-kills',
      label: 'Spike & Ace Dominator',
      emoji: '🏐',
      badge: '15+ Kills',
      points: 16,
      assists: 3,
      rebounds: 10,
      steals: 4,
      blocks: 4,
      gameResult: 'W',
      teamScore: 3,
      opponentScore: 1,
      notes: 'Recorded 16 kills and 4 blocks in 4-set win.'
    }
  ]
};

const DEFAULT_PRESETS: QuickPreset[] = [
  {
    id: 'gen-clutch',
    label: 'Clutch Victory',
    emoji: '🏆',
    badge: 'High Impact',
    points: 20,
    assists: 5,
    rebounds: 5,
    steals: 2,
    blocks: 1,
    gameResult: 'W',
    teamScore: 24,
    opponentScore: 20,
    notes: 'Clutch performance down the stretch to seal the victory.'
  },
  {
    id: 'gen-balanced',
    label: 'Balanced Game',
    emoji: '⭐',
    badge: 'All-Around',
    points: 15,
    assists: 4,
    rebounds: 6,
    steals: 2,
    blocks: 1,
    gameResult: 'W',
    teamScore: 18,
    opponentScore: 12,
    notes: 'Solid contributions across all game metrics.'
  }
];

interface StatSubmissionFormProps {
  athleteUid: string;
  currentSport?: string;
  onStatSubmitted?: (stat: StatItem) => void;
  showExistingList?: boolean;
}

export const StatSubmissionForm: React.FC<StatSubmissionFormProps> = ({
  athleteUid,
  currentSport = 'Basketball',
  onStatSubmitted,
  showExistingList = true
}) => {
  const [sport, setSport] = useState<string>(currentSport);
  const [gameDate, setGameDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [opponent, setOpponent] = useState<string>('');
  const [gameResult, setGameResult] = useState<'W' | 'L' | 'T'>('W');
  const [teamScore, setTeamScore] = useState<number>(78);
  const [opponentScore, setOpponentScore] = useState<number>(72);
  const [points, setPoints] = useState<number>(24);
  const [assists, setAssists] = useState<number>(7);
  const [rebounds, setRebounds] = useState<number>(8);
  const [steals, setSteals] = useState<number>(3);
  const [blocks, setBlocks] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Mobile quick log preset visual flash state
  const [highlightFlash, setHighlightFlash] = useState<boolean>(false);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  // Firestore submission success animation state
  const [showSuccessOverlay, setShowSuccessOverlay] = useState<boolean>(false);
  const [lastSubmittedStat, setLastSubmittedStat] = useState<StatItem | null>(null);

  // Firestore Sub-collection state
  const [firestoreStats, setFirestoreStats] = useState<StatItem[]>([]);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);

  // Subscribe to real-time stats from Firestore sub-collection: users/{athleteUid}/Stats
  useEffect(() => {
    if (!athleteUid) return;

    setLoadingStats(true);
    const statsCollectionRef = collection(db, 'users', athleteUid, 'Stats');
    const q = query(statsCollectionRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: StatItem[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<StatItem, 'id'>)
        }));
        setFirestoreStats(items);
        setLoadingStats(false);
      },
      (err) => {
        console.warn('Firestore Stats sub-collection snapshot error:', err);
        setLoadingStats(false);
      }
    );

    return () => unsubscribe();
  }, [athleteUid]);

  // Available presets for current sport
  const currentPresets = SPORT_PRESETS[sport] || DEFAULT_PRESETS;

  // Apply a quick preset
  const applyQuickPreset = (preset: QuickPreset) => {
    setPoints(preset.points);
    setAssists(preset.assists);
    setRebounds(preset.rebounds);
    setSteals(preset.steals);
    setBlocks(preset.blocks);
    setGameResult(preset.gameResult);
    setTeamScore(preset.teamScore);
    setOpponentScore(preset.opponentScore);
    setNotes(preset.notes);
    setActivePresetId(preset.id);

    // Provide haptic feedback on mobile if supported
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(20);
      } catch (e) {
        // ignore
      }
    }

    // Trigger visual highlight flash
    setHighlightFlash(true);
    setTimeout(() => setHighlightFlash(false), 800);
  };

  // Helper for quick steppers
  const adjustValue = (
    getter: number, 
    setter: React.Dispatch<React.SetStateAction<number>>, 
    delta: number
  ) => {
    setter(Math.max(0, getter + delta));
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(15);
      } catch (e) {
        // ignore
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opponent.trim()) {
      setErrorMsg('Please enter the opponent team name.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const newStatData: Omit<StatItem, 'id'> = {
      athleteUid,
      gameDate,
      opponent: opponent.trim(),
      sport,
      gameResult,
      teamScore: Number(teamScore) || 0,
      opponentScore: Number(opponentScore) || 0,
      points: Number(points) || 0,
      assists: Number(assists) || 0,
      rebounds: Number(rebounds) || 0,
      steals: Number(steals) || 0,
      blocks: Number(blocks) || 0,
      notes: notes.trim(),
      createdAt: serverTimestamp()
    };

    try {
      // 1. Write to Firestore sub-collection 'users/{athleteUid}/Stats'
      const statsRef = collection(db, 'users', athleteUid, 'Stats');
      const docRef = await addDoc(statsRef, newStatData);

      const savedStat: StatItem = {
        id: docRef.id,
        ...newStatData
      };

      setLastSubmittedStat(savedStat);
      setShowSuccessOverlay(true);

      // Trigger mobile haptic feedback on success
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([40, 60, 40]);
        } catch (e) {
          // ignore
        }
      }
      
      if (onStatSubmitted) {
        onStatSubmitted(savedStat);
      }

      // Reset form partially for next entry
      setOpponent('');
      setNotes('');
      setActivePresetId(null);
    } catch (err: any) {
      console.error('Error saving stat to Firestore sub-collection:', err);
      setErrorMsg(err.message || 'Failed to save statistics to Firestore. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStat = async (statId?: string) => {
    if (!statId) return;
    if (!confirm('Are you sure you want to delete this stat log from Firestore?')) return;

    try {
      const statDocRef = doc(db, 'users', athleteUid, 'Stats', statId);
      await deleteDoc(statDocRef);
    } catch (err: any) {
      console.error('Error deleting stat document:', err);
      alert('Failed to delete stat: ' + err.message);
    }
  };

  // Adaptive stat metric titles based on sport
  const getMetricLabels = (sp: string) => {
    if (sp === 'Flag Football' || sp === 'Football') {
      return { p: 'PTS / TDs', a: 'Pass TD / YDS', r: 'REC / CATCH', s: 'INTs / FLAG', b: 'SACKS / DEF' };
    }
    if (sp === 'Lacrosse') {
      return { p: 'Goals (G)', a: 'Assists (A)', r: 'Ground Balls', s: 'Caused TOs', b: 'Draw Control' };
    }
    if (sp === 'Soccer') {
      return { p: 'Goals (G)', a: 'Assists (A)', r: 'Shots on Goal', s: 'Tackles', b: 'Saves' };
    }
    if (sp === 'Volleyball') {
      return { p: 'Kills (K)', a: 'Aces (A)', r: 'Digs (D)', s: 'Blocks (B)', b: 'Assists' };
    }
    return { p: 'Points (PTS)', a: 'Assists (AST)', r: 'Rebounds (REB)', s: 'Steals (STL)', b: 'Blocks (BLK)' };
  };

  const metricLabels = getMetricLabels(sport);

  return (
    <div className="space-y-6">
      {/* Submission Form Card */}
      <motion.div 
        animate={{
          borderColor: highlightFlash ? '#E5B868' : 'rgba(214, 28, 36, 0.3)',
          boxShadow: highlightFlash 
            ? '0 0 45px rgba(214,28,36,0.35)' 
            : '0 0 30px rgba(214,28,36,0.15)'
        }}
        transition={{ duration: 0.3 }}
        className="p-4 sm:p-6 rounded-3xl bg-[#212A31] border border-[#E5B868]/30 text-white relative overflow-hidden"
      >
        {/* Background Subtle Accent */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-[#E5B868]/10 rounded-full blur-2xl pointer-events-none" />

        {/* Form Header */}
        <div className="flex items-center justify-between gap-3 mb-5 pb-3 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#E5B868]/20 text-[#E5B868] border border-[#E5B868]/40 shadow-[0_0_15px_rgba(214,28,36,0.2)]">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black italic uppercase tracking-wider text-white">
                  Game Stat Submission Form
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#E5B868]/20 text-[#E5B868] border border-[#E5B868]/30">
                  <Smartphone className="w-3 h-3" /> Mobile Quick Log
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Directly syncs game metrics to Firestore sub-collection: <code className="text-[#E5B868]">users/{'{athleteUid}'}/Stats</code>
              </p>
            </div>
          </div>

          <span className="inline-flex sm:hidden items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg bg-[#E5B868]/20 text-[#E5B868] border border-[#E5B868]/30">
            <Zap className="w-3 h-3 fill-current" /> Quick Log
          </span>
        </div>

        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2"
          >
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          {/* Sport Selector component */}
          <div>
            <SportSelector
              selectedSport={sport}
              onSelectSport={(newSport) => {
                setSport(newSport);
                setActivePresetId(null);
              }}
              label="Game Sport"
              placeholder="Search or select game sport..."
              compact
            />
          </div>

          {/* ⚡ Quick Log Feature: Sport Presets Bar */}
          <div className="p-3 sm:p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-wider text-[#E5B868] flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 fill-[#E5B868]" /> Quick Log Presets ({getSportEmoji(sport)} {sport})
              </label>
              <span className="text-[9px] text-slate-400 font-mono">Tap chip to pre-fill</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none snap-x">
              {currentPresets.map((preset) => {
                const isActive = activePresetId === preset.id;
                return (
                  <motion.button
                    key={preset.id}
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => applyQuickPreset(preset)}
                    className={`shrink-0 snap-start px-3 py-2 rounded-xl text-left border transition-all flex items-center gap-2.5 cursor-pointer ${
                      isActive
                        ? 'bg-[#E5B868] text-black border-[#E5B868] font-bold shadow-[0_0_15px_rgba(214,28,36,0.4)]'
                        : 'bg-[#212A31] hover:bg-white/10 text-white border-white/10 hover:border-white/20'
                    }`}
                  >
                    <span className="text-sm">{preset.emoji}</span>
                    <div>
                      <div className="text-xs font-black uppercase tracking-wide leading-none flex items-center gap-1">
                        {preset.label}
                      </div>
                      <div className={`text-[9px] font-mono mt-0.5 ${isActive ? 'text-black/80' : 'text-slate-400'}`}>
                        {preset.badge}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Date & Opponent Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-300 block mb-1">Game Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={gameDate}
                  onChange={(e) => setGameDate(e.target.value)}
                  className="w-full bg-[#212A31] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#E5B868] focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-300 block mb-1">Opponent Team</label>
              <input
                type="text"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                placeholder="e.g. St. Anthony Friars"
                className="w-full bg-[#212A31] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#E5B868] focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Result & Scores Row */}
          <div className="grid grid-cols-3 gap-3 bg-white/5 p-3 rounded-2xl border border-white/10">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-300 block mb-1">Outcome</label>
              <div className="grid grid-cols-3 gap-1">
                {(['W', 'L', 'T'] as const).map((res) => (
                  <button
                    key={res}
                    type="button"
                    onClick={() => setGameResult(res)}
                    className={`py-2 text-xs font-mono font-black rounded-lg border transition-all cursor-pointer ${
                      gameResult === res
                        ? res === 'W'
                          ? 'bg-red-600 text-black border-red-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                          : res === 'L'
                          ? 'bg-rose-500 text-white border-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.4)]'
                          : 'bg-amber-500 text-black border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                        : 'bg-black/40 text-slate-400 border-white/10 hover:text-white'
                    }`}
                  >
                    {res}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-300 block mb-1">Team Score</label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => adjustValue(teamScore, setTeamScore, -1)}
                  className="p-1.5 rounded-lg bg-black/40 hover:bg-white/10 text-slate-300 border border-white/10 shrink-0"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="number"
                  value={teamScore}
                  onChange={(e) => setTeamScore(Number(e.target.value))}
                  className="w-full bg-[#212A31] border border-white/10 rounded-xl px-2 py-1.5 text-xs font-mono font-bold text-[#E5B868] focus:border-[#E5B868] focus:outline-none text-center"
                />
                <button
                  type="button"
                  onClick={() => adjustValue(teamScore, setTeamScore, 1)}
                  className="p-1.5 rounded-lg bg-black/40 hover:bg-white/10 text-slate-300 border border-white/10 shrink-0"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-300 block mb-1">Opp. Score</label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => adjustValue(opponentScore, setOpponentScore, -1)}
                  className="p-1.5 rounded-lg bg-black/40 hover:bg-white/10 text-slate-300 border border-white/10 shrink-0"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="number"
                  value={opponentScore}
                  onChange={(e) => setOpponentScore(Number(e.target.value))}
                  className="w-full bg-[#212A31] border border-white/10 rounded-xl px-2 py-1.5 text-xs font-mono font-bold text-white focus:border-[#E5B868] focus:outline-none text-center"
                />
                <button
                  type="button"
                  onClick={() => adjustValue(opponentScore, setOpponentScore, 1)}
                  className="p-1.5 rounded-lg bg-black/40 hover:bg-white/10 text-slate-300 border border-white/10 shrink-0"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Individual Stat Metrics Grid with Mobile Stepper Buttons */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                Individual Stat Metrics
              </label>
              <span className="text-[9px] text-slate-400 font-mono">Tap + / - for instant mobile logging</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
              {/* Metric 1 */}
              <div className="bg-[#212A31] border border-white/10 rounded-2xl p-2.5 space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-[#E5B868] block truncate">
                  {metricLabels.p}
                </label>
                <div className="flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => adjustValue(points, setPoints, -1)}
                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 flex items-center justify-center shrink-0 active:scale-95"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    value={points}
                    onChange={(e) => setPoints(Number(e.target.value))}
                    className="w-full bg-transparent border-none text-sm font-mono font-extrabold text-[#E5B868] text-center focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => adjustValue(points, setPoints, 1)}
                    className="w-8 h-8 rounded-xl bg-[#E5B868]/20 hover:bg-[#E5B868]/30 text-[#E5B868] border border-[#E5B868]/30 flex items-center justify-center shrink-0 active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                </div>
              </div>

              {/* Metric 2 */}
              <div className="bg-[#212A31] border border-white/10 rounded-2xl p-2.5 space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-300 block truncate">
                  {metricLabels.a}
                </label>
                <div className="flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => adjustValue(assists, setAssists, -1)}
                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 flex items-center justify-center shrink-0 active:scale-95"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    value={assists}
                    onChange={(e) => setAssists(Number(e.target.value))}
                    className="w-full bg-transparent border-none text-sm font-mono font-extrabold text-white text-center focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => adjustValue(assists, setAssists, 1)}
                    className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 flex items-center justify-center shrink-0 active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                </div>
              </div>

              {/* Metric 3 */}
              <div className="bg-[#212A31] border border-white/10 rounded-2xl p-2.5 space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-300 block truncate">
                  {metricLabels.r}
                </label>
                <div className="flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => adjustValue(rebounds, setRebounds, -1)}
                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 flex items-center justify-center shrink-0 active:scale-95"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    value={rebounds}
                    onChange={(e) => setRebounds(Number(e.target.value))}
                    className="w-full bg-transparent border-none text-sm font-mono font-extrabold text-white text-center focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => adjustValue(rebounds, setRebounds, 1)}
                    className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 flex items-center justify-center shrink-0 active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                </div>
              </div>

              {/* Metric 4 */}
              <div className="bg-[#212A31] border border-white/10 rounded-2xl p-2.5 space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-300 block truncate">
                  {metricLabels.s}
                </label>
                <div className="flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => adjustValue(steals, setSteals, -1)}
                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 flex items-center justify-center shrink-0 active:scale-95"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    value={steals}
                    onChange={(e) => setSteals(Number(e.target.value))}
                    className="w-full bg-transparent border-none text-sm font-mono font-extrabold text-white text-center focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => adjustValue(steals, setSteals, 1)}
                    className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 flex items-center justify-center shrink-0 active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                </div>
              </div>

              {/* Metric 5 */}
              <div className="bg-[#212A31] border border-white/10 rounded-2xl p-2.5 space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-300 block truncate">
                  {metricLabels.b}
                </label>
                <div className="flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => adjustValue(blocks, setBlocks, -1)}
                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 flex items-center justify-center shrink-0 active:scale-95"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    value={blocks}
                    onChange={(e) => setBlocks(Number(e.target.value))}
                    className="w-full bg-transparent border-none text-sm font-mono font-extrabold text-white text-center focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => adjustValue(blocks, setBlocks, 1)}
                    className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 flex items-center justify-center shrink-0 active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-300 block mb-1">Game Notes / Key Highlights</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Scored game-winning bucket in double overtime"
              className="w-full bg-[#212A31] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#E5B868] focus:outline-none"
            />
          </div>

          {/* Submit Action */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#E5B868] hover:bg-[#B8141B] text-black font-black text-xs uppercase tracking-wider rounded-2xl shadow-[0_0_20px_rgba(214,28,36,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{loading ? 'SAVING TO FIRESTORE SUB-COLLECTION...' : 'SAVE STATS TO FIRESTORE'}</span>
          </motion.button>
        </form>

        {/* Firestore Submission Success Feedback Animation Modal / Banner */}
        <AnimatePresence>
          {showSuccessOverlay && lastSubmittedStat && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="absolute inset-0 z-50 p-6 bg-[#212A31]/95 backdrop-blur-md flex flex-col items-center justify-center text-center rounded-3xl border-2 border-[#E5B868]"
            >
              {/* Glowing Pulse Rings */}
              <div className="relative mb-4">
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0.2, 0.6] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 bg-[#E5B868] rounded-full blur-xl"
                />
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                  className="w-16 h-16 rounded-full bg-[#E5B868] text-black flex items-center justify-center relative z-10 shadow-[0_0_30px_rgba(214,28,36,0.8)]"
                >
                  <Check className="w-9 h-9 stroke-[3]" />
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="space-y-2 max-w-sm"
              >
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E5B868]/20 text-[#E5B868] border border-[#E5B868]/30 text-[10px] font-black uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" /> Firestore Synced
                </div>

                <h3 className="text-xl font-black italic uppercase tracking-wider text-white">
                  Stats Submitted Successfully!
                </h3>

                <p className="text-xs text-slate-300">
                  Game entry recorded to <code className="text-[#E5B868]">users/{athleteUid}/Stats</code>
                </p>

                {/* Stat Badge Summary */}
                <div className="p-3 my-3 rounded-2xl bg-black/60 border border-white/10 text-left space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <span>{getSportEmoji(lastSubmittedStat.sport)}</span>
                      <span>vs {lastSubmittedStat.opponent}</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded font-mono font-black text-[10px] ${
                      lastSubmittedStat.gameResult === 'W' ? 'bg-red-600/20 text-red-500' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {lastSubmittedStat.gameResult} {lastSubmittedStat.teamScore}-{lastSubmittedStat.opponentScore}
                    </span>
                  </div>

                  <div className="text-xs font-mono text-[#E5B868] font-extrabold flex items-center gap-2 pt-1 border-t border-white/10">
                    <span>{lastSubmittedStat.points} PTS</span>
                    <span>•</span>
                    <span>{lastSubmittedStat.rebounds} REB</span>
                    <span>•</span>
                    <span>{lastSubmittedStat.assists} AST</span>
                    <span>•</span>
                    <span>{lastSubmittedStat.steals} STL</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSuccessOverlay(false)}
                  className="w-full py-2.5 px-4 bg-[#E5B868] hover:bg-[#B8141B] text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_15px_rgba(214,28,36,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Log Another Game</span>
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Real-time Firestore Sub-collection Feed */}
      {showExistingList && (
        <div className="p-5 rounded-3xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#E5B868] flex items-center gap-2">
              <Activity className="w-4 h-4" /> Live Firestore Sub-collection Entries ({firestoreStats.length})
            </h4>
            <span className="text-[10px] font-mono text-slate-400">users/{athleteUid}/Stats</span>
          </div>

          {loadingStats ? (
            <div className="text-center py-6 text-xs text-slate-500 font-mono animate-pulse">
              Syncing Firestore Sub-Collection...
            </div>
          ) : firestoreStats.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400 bg-black/20 rounded-2xl border border-white/5">
              No stats in Firestore sub-collection yet. Submit your first game metrics above!
            </div>
          ) : (
            <div className="space-y-2">
              {firestoreStats.map((st) => (
                <div
                  key={st.id}
                  className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between gap-3 text-white text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded font-mono font-black text-xs ${
                      st.gameResult === 'W' ? 'bg-red-600/20 text-red-500' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {st.gameResult} {st.teamScore}-{st.opponentScore}
                    </span>
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>{getSportEmoji(st.sport)}</span>
                        <span>{st.opponent}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {st.gameDate} • {st.points} PTS, {st.rebounds} REB, {st.assists} AST, {st.steals} STL, {st.blocks} BLK
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteStat(st.id)}
                    className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                    title="Delete from Firestore"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
