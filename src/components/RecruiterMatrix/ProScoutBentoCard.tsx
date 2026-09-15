import React, { useState } from 'react';
import { UserProfile } from '../../types';
import { RadarChart, RadarStat } from './RadarChart';
import { DigitalIDPassModal } from './DigitalIDPassModal';
import { ScoutMessageModal } from './ScoutMessageModal';
import { 
  ShieldCheck, 
  QrCode, 
  Video, 
  Mail, 
  Bookmark, 
  Sparkles, 
  ExternalLink,
  Award,
  Zap,
  Star,
  Flame,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Scale,
  Activity
} from 'lucide-react';
import { motion } from 'motion/react';

interface ProScoutBentoCardProps {
  athlete: UserProfile;
  isBookmarked?: boolean;
  onToggleBookmark?: (uid: string, e: React.MouseEvent) => void;
  onOpenDetailModal?: (athlete: UserProfile) => void;
  onToggleCompare?: (athlete: UserProfile, e: React.MouseEvent) => void;
  isCompared?: boolean;
  className?: string;
}

export const ProScoutBentoCard: React.FC<ProScoutBentoCardProps> = ({
  athlete,
  isBookmarked = false,
  onToggleBookmark,
  onOpenDetailModal,
  onToggleCompare,
  isCompared = false,
  className = ''
}) => {
  const [showQrModal, setShowQrModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);

  // Derive 5-point radar stats from performanceMetrics or fallback
  const metrics = (athlete.performanceMetrics || {}) as Record<string, number | undefined>;
  const radarStats: RadarStat[] = [
    { label: 'Speed', value: metrics.speed || 88 },
    { label: 'Strength', value: metrics.strength || 82 },
    { label: 'Agility', value: metrics.agility || 90 },
    { label: 'IQ', value: metrics.iq || 94 },
    { label: 'Stamina', value: metrics.stamina || 86 }
  ];

  // Key stats pills (GPA, 40yd split or key metric, main stat)
  const gpaVal = athlete.gpa ? `${athlete.gpa} GPA` : '3.8 GPA';
  const rawStats = (athlete.stats || {}) as any;

  // Calculate simulated NIL valuation index
  const speedVal = metrics.speed || 88;
  const iqVal = metrics.iq || 94;
  const ratingAvg = Math.round((speedVal + iqVal + (metrics.agility || 90)) / 3);
  const nilStock = (ratingAvg * 480).toLocaleString();

  // Custom stat representation per sport
  const getPrimaryMetric = () => {
    if (athlete.sport === 'Flag Football') {
      return { label: '40yd Dash', value: '4.42s', percentile: 'Top 3%' };
    }
    if (athlete.sport === 'Basketball') {
      return { label: 'PTS / G', value: rawStats.points ? `${rawStats.points}` : '24.5', percentile: 'Top 5%' };
    }
    if (athlete.sport === 'Lacrosse') {
      return { label: 'Goals', value: rawStats.goals ? `${rawStats.goals}` : '54', percentile: 'Top 4%' };
    }
    return { label: '40yd Dash', value: '4.45s', percentile: 'Top 6%' };
  };

  const getSecondaryMetric = () => {
    if (athlete.sport === 'Flag Football') {
      return { label: 'Pass Yds', value: rawStats.passingYards ? `${rawStats.passingYards}` : '2,450' };
    }
    if (athlete.sport === 'Basketball') {
      return { label: 'AST / G', value: rawStats.assists ? `${rawStats.assists}` : '8.4' };
    }
    if (athlete.sport === 'Lacrosse') {
      return { label: 'Assists', value: rawStats.assists ? `${rawStats.assists}` : '31' };
    }
    return { label: 'Vertical', value: '38.5"' };
  };

  const primaryMetric = getPrimaryMetric();
  const secondaryMetric = getSecondaryMetric();

  // Watch highlight film action
  const handleWatchFilm = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (athlete.mediaUrls && athlete.mediaUrls.length > 0) {
      window.open(athlete.mediaUrls[0].url, '_blank');
    } else {
      if (onOpenDetailModal) {
        onOpenDetailModal(athlete);
      }
    }
  };

  const handleOpenMessage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMessageModal(true);
  };

  const handleOpenQr = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowQrModal(true);
  };

  return (
    <>
      <motion.div
        whileHover={{ y: -5, scale: 1.01 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        onClick={() => onOpenDetailModal && onOpenDetailModal(athlete)}
        className={`group relative rounded-3xl bg-[#0B1017]/90 border transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden ${
          isCompared 
            ? 'border-[#00F2FE] shadow-[0_0_30px_rgba(0,242,254,0.4)] ring-1 ring-[#00F2FE]' 
            : 'border-slate-800/90 hover:border-cyan-500/50 hover:shadow-[0_12px_40px_rgba(0,242,254,0.15)]'
        } backdrop-blur-2xl p-5 sm:p-6 ${className}`}
      >
        {/* Holographic Refraction Prismatic Top Edge */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#00F2FE]/60 to-transparent group-hover:via-[#39FF14] transition-all" />

        {/* Ambient Glow Orb Backdrop */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#00F2FE]/5 rounded-full blur-3xl group-hover:bg-[#00F2FE]/15 transition-all pointer-events-none" />

        {/* TOP ROW: Athlete Avatar, Name, Verification, Position Badge, Compare & Bookmark */}
        <div className="relative z-10 space-y-3.5">
          
          {/* Header Bar with Live NIL Stock Index Pill */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-800/60 pb-2.5">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#00F2FE]/10 border border-[#00F2FE]/30 text-[#00F2FE] text-[10px] font-mono font-bold">
              <TrendingUp className="w-3 h-3 text-[#39FF14]" />
              <span>NIL VAL:</span>
              <strong className="text-white">${nilStock}/yr</strong>
            </div>

            <div className="flex items-center gap-1">
              {/* Compare Button */}
              {onToggleCompare && (
                <button
                  onClick={(e) => onToggleCompare(athlete, e)}
                  title={isCompared ? 'Remove from Compare Holodeck' : 'Add to Head-to-Head Compare'}
                  className={`px-2 py-1 rounded-xl text-[9px] font-mono font-bold uppercase transition-all flex items-center gap-1 cursor-pointer border ${
                    isCompared
                      ? 'bg-[#00F2FE] text-slate-950 border-[#00F2FE] shadow-[0_0_10px_rgba(0,242,254,0.5)]'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-white hover:border-cyan-500/40'
                  }`}
                >
                  <Scale className="w-3 h-3" />
                  <span>{isCompared ? 'IN DOCK' : 'COMPARE'}</span>
                </button>
              )}

              {/* Digital QR ID Pass Button */}
              <button
                onClick={handleOpenQr}
                title="View Digital Event Check-In QR Pass"
                className="p-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-cyan-400 hover:bg-[#00F2FE] hover:text-slate-950 shadow-[0_0_10px_rgba(0,242,254,0.15)] transition-all cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5" />
              </button>

              {/* Bookmark Toggle */}
              {onToggleBookmark && (
                <button
                  onClick={(e) => onToggleBookmark(athlete.uid, e)}
                  className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                    isBookmarked
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-white'
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-400' : ''}`} />
                </button>
              )}
            </div>
          </div>

          {/* Profile Details */}
          <div className="flex items-start gap-3.5">
            <div className="relative shrink-0">
              <img
                src={athlete.avatarUrl || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=300&auto=format&fit=crop&q=80'}
                alt={athlete.displayName}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-cyan-500/40 group-hover:border-[#00F2FE] shadow-[0_0_15px_rgba(0,242,254,0.25)] transition-all"
              />
              {(athlete.isVerified ?? true) && (
                <span className="absolute -bottom-1 -right-1 p-1 rounded-full bg-[#00F2FE] text-slate-950 shadow-[0_0_10px_rgba(0,242,254,0.8)]">
                  <ShieldCheck className="w-3.5 h-3.5 stroke-[3]" />
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                <span className="px-2 py-0.5 rounded-md bg-[#00F2FE] text-slate-950 font-mono font-black text-[9px] uppercase tracking-wider shadow-[0_0_8px_rgba(0,242,254,0.3)]">
                  {athlete.position || 'ATH'}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-800/90 text-slate-300 font-mono text-[9px] font-bold uppercase border border-slate-700">
                  CLASS {athlete.gradYear || '2026'}
                </span>
                {(athlete.isVerified ?? true) && (
                  <span className="px-1.5 py-0.5 rounded bg-[#39FF14]/15 text-[#39FF14] font-mono text-[9px] font-bold border border-[#39FF14]/30 flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5 text-[#39FF14]" />
                    VERIFIED
                  </span>
                )}
              </div>

              <h3 className="text-base sm:text-lg font-black italic uppercase tracking-tight text-white group-hover:text-[#00F2FE] transition-colors leading-snug truncate">
                {athlete.displayName}
              </h3>
              <p className="text-xs text-slate-400 font-medium truncate">
                {athlete.highSchool} ({athlete.state}) • {athlete.sport}
              </p>
            </div>
          </div>

          {/* MIDDLE ROW: 5-Point Radar Chart Visualization */}
          <div className="py-2.5 px-3 rounded-2xl bg-[#080C14]/90 border border-slate-800/80 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Holographic Radar Corner Ticks */}
            <div className="absolute top-1 left-2 w-2 h-2 border-t border-l border-cyan-500/40" />
            <div className="absolute top-1 right-2 w-2 h-2 border-t border-r border-cyan-500/40" />

            <div className="w-full flex items-center justify-between text-[10px] font-mono text-slate-400 font-bold mb-1 px-1">
              <span className="uppercase text-[#00F2FE] tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#39FF14]" /> 5-POINT METRIC RADAR
              </span>
              <span className="text-[9px] text-slate-500">{primaryMetric.percentile}</span>
            </div>
            <RadarChart stats={radarStats} size={165} />
          </div>

          {/* KEY METRIC PILLS */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#080C14]/90 p-2 rounded-xl border border-slate-800 text-center">
              <span className="text-[9px] font-bold text-slate-400 uppercase block font-mono">ACADEMIC</span>
              <span className="text-xs font-black text-white font-mono mt-0.5 block">{gpaVal}</span>
            </div>

            <div className="bg-[#080C14]/90 p-2 rounded-xl border border-slate-800 text-center">
              <span className="text-[9px] font-bold text-slate-400 uppercase block font-mono">{primaryMetric.label}</span>
              <span className="text-xs font-black text-[#39FF14] font-mono mt-0.5 block">{primaryMetric.value}</span>
            </div>

            <div className="bg-[#080C14]/90 p-2 rounded-xl border border-slate-800 text-center">
              <span className="text-[9px] font-bold text-slate-400 uppercase block font-mono">{secondaryMetric.label}</span>
              <span className="text-xs font-black text-[#00F2FE] font-mono mt-0.5 block">{secondaryMetric.value}</span>
            </div>
          </div>
        </div>

        {/* BOTTOM ROW: Actions [🎥 Watch Highlight Film] and [📩 Scout Message] */}
        <div className="relative z-10 mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2">
          <button
            onClick={handleWatchFilm}
            className="w-full px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-700/80"
          >
            <Video className="w-3.5 h-3.5 text-cyan-400" />
            <span className="truncate">Watch Film</span>
          </button>

          <button
            onClick={handleOpenMessage}
            className="w-full px-3 py-2 rounded-xl bg-[#00F2FE] hover:bg-[#38BDF8] text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(0,242,254,0.3)] transition-all cursor-pointer border border-[#00F2FE]"
          >
            <Mail className="w-3.5 h-3.5" />
            <span className="truncate">Scout Message</span>
          </button>
        </div>
      </motion.div>

      {/* MODALS */}
      {showQrModal && (
        <DigitalIDPassModal athlete={athlete} onClose={() => setShowQrModal(false)} />
      )}

      {showMessageModal && (
        <ScoutMessageModal athlete={athlete} onClose={() => setShowMessageModal(false)} />
      )}
    </>
  );
};
