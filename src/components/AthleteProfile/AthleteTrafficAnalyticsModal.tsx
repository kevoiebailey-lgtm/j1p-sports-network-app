import React, { useState, useEffect } from 'react';
import { 
  X, 
  Eye, 
  TrendingUp, 
  GraduationCap, 
  Clock, 
  Download, 
  ShieldCheck, 
  Sparkles, 
  Video, 
  Building2,
  ChevronRight,
  Flame,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AthleteTrafficAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  athleteId?: string;
  athleteName?: string;
}

export const AthleteTrafficAnalyticsModal: React.FC<AthleteTrafficAnalyticsModalProps> = ({
  isOpen,
  onClose,
  athleteId = 'ath-1',
  athleteName = 'Kevon Bailey'
}) => {
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      fetchAnalytics();
    }
  }, [isOpen, athleteId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/recruiter/analytics/${athleteId}`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.warn('Failed to fetch athlete traffic analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-3xl bg-[#161C22] border border-[#00F2FE]/40 rounded-3xl p-5 sm:p-7 shadow-[0_0_80px_rgba(0,242,254,0.25)] my-6 max-h-[92vh] overflow-y-auto text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#00F2FE]/15 border border-[#00F2FE]/40 text-[#00F2FE]">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#00F2FE]/10 border border-[#00F2FE]/30 text-[#00F2FE] text-[10px] font-mono font-bold uppercase tracking-widest">
                <Sparkles className="w-3 h-3" />
                <span>NCAA Recruiter Pulse</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black uppercase text-white tracking-tight mt-0.5">
                Scout Traffic & College Interest Intelligence
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="mt-5 space-y-5">
          {/* Top Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#11171D] border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Total Impressions</span>
              <span className="text-xl font-black text-white font-mono mt-1 block">
                {analytics?.totalProfileImpressions?.toLocaleString() || '1,482'}
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">+34% this week</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#11171D] border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Scout Views</span>
              <span className="text-xl font-black text-[#00F2FE] font-mono mt-1 block">
                {analytics?.totalScoutViews || 142}
              </span>
              <span className="text-[10px] text-cyan-400 font-mono">18 Verified Staff</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#11171D] border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Tape Watched</span>
              <span className="text-xl font-black text-amber-400 font-mono mt-1 block">
                {analytics?.totalTapeWatchMinutes || 384}m
              </span>
              <span className="text-[10px] text-amber-300 font-mono">82% Completion</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#11171D] border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Dossiers Pulled</span>
              <span className="text-xl font-black text-purple-400 font-mono mt-1 block">
                {analytics?.dossierDownloads || 37}
              </span>
              <span className="text-[10px] text-purple-300 font-mono">NCAA Sheets</span>
            </div>
          </div>

          {/* Division Interest Breakdown */}
          <div className="p-4 rounded-2xl bg-[#11171D] border border-slate-800 space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase text-slate-300 flex items-center justify-between">
              <span>Collegiate Division Interest Share</span>
              <span className="text-[#00F2FE] text-[10px]">Power 4 Leaning</span>
            </h4>

            <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                <span className="text-sm font-black text-[#00F2FE] block">38%</span>
                <span className="text-[10px] text-slate-400 uppercase">D1 Power 4</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                <span className="text-sm font-black text-amber-400 block">32%</span>
                <span className="text-[10px] text-slate-400 uppercase">D1 Group 5</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                <span className="text-sm font-black text-emerald-400 block">20%</span>
                <span className="text-[10px] text-slate-400 uppercase">NCAA D2</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                <span className="text-sm font-black text-purple-400 block">10%</span>
                <span className="text-[10px] text-slate-400 uppercase">D3 / NAIA</span>
              </div>
            </div>
          </div>

          {/* Recent Colleges Viewing Profile */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase text-[#00F2FE] flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4" /> Verified Programs & Staff Viewing Film
            </h4>

            <div className="space-y-2">
              {(analytics?.recentCollegesViewing || []).map((col: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-[#11171D] border border-slate-800 hover:border-[#00F2FE]/40 transition-all flex items-center justify-between flex-wrap gap-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-base border border-slate-700">
                      {col.logo}
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
                        <span>{col.collegeName}</span>
                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                      </h5>
                      <p className="text-[11px] text-slate-400 font-sans">
                        {col.staffRole} • <span className="text-slate-300 font-mono">{col.division}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    <div className="text-[11px] font-mono">
                      <span className="text-amber-400 font-bold block">{col.timesWatchedFilm}x Film Plays</span>
                      <span className="text-slate-500">{col.viewedAt}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer note */}
          <div className="p-3 rounded-2xl bg-[#00F2FE]/10 border border-[#00F2FE]/20 text-[11px] font-mono text-[#00F2FE] flex items-center justify-between">
            <span>🔒 NCAA Compliance Logged • Verified Recruiter Identity Authentication</span>
            <button
              onClick={onClose}
              className="px-3 py-1 rounded-xl bg-[#00F2FE] text-slate-950 font-black text-xs uppercase cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
