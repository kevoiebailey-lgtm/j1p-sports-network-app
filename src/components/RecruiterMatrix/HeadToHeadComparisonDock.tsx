import React from 'react';
import { UserProfile } from '../../types';
import { 
  X, 
  Sparkles, 
  Zap, 
  ShieldCheck, 
  ArrowRight, 
  Scale, 
  Flame, 
  Activity,
  Layers,
  GraduationCap
} from 'lucide-react';
import { RadarChart, RadarStat } from './RadarChart';

interface HeadToHeadComparisonDockProps {
  athletes: UserProfile[];
  onRemoveAthlete: (uid: string) => void;
  onClearAll: () => void;
  onOpenDetailModal: (athlete: UserProfile) => void;
}

export const HeadToHeadComparisonDock: React.FC<HeadToHeadComparisonDockProps> = ({
  athletes,
  onRemoveAthlete,
  onClearAll,
  onOpenDetailModal
}) => {
  if (athletes.length === 0) return null;

  return (
    <div className="fixed bottom-6 inset-x-4 max-w-5xl mx-auto z-50 animate-slideUp">
      <div className="relative rounded-3xl bg-[#080C14]/95 border-2 border-[#00F2FE]/50 backdrop-blur-2xl p-4 sm:p-5 shadow-[0_0_50px_rgba(0,242,254,0.35)] flex flex-col gap-4 overflow-hidden">
        
        {/* Specular Edge Highlighting */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#00F2FE] to-transparent" />

        {/* Top Control Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-[#00F2FE]/20 text-[#00F2FE] border border-[#00F2FE]/40">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black uppercase text-white font-mono tracking-wider flex items-center gap-2">
                <span>HOLODECK: HEAD-TO-HEAD SCOUT COMPARISON</span>
                <span className="px-2 py-0.5 rounded-full bg-[#39FF14]/20 text-[#39FF14] text-[9px] font-bold border border-[#39FF14]/30">
                  {athletes.length} / 3 ATHLETES LOADED
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClearAll}
            className="text-[10px] font-mono text-slate-400 hover:text-rose-400 uppercase tracking-wider px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700/60 transition-colors cursor-pointer"
          >
            Clear Dock
          </button>
        </div>

        {/* Comparison Athlete Pods */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {athletes.map((ath) => {
            const metrics = (ath.performanceMetrics || {}) as Record<string, number | undefined>;
            const radarStats: RadarStat[] = [
              { label: 'Speed', value: metrics.speed || 88 },
              { label: 'Strength', value: metrics.strength || 82 },
              { label: 'Agility', value: metrics.agility || 90 },
              { label: 'IQ', value: metrics.iq || 94 },
              { label: 'Stamina', value: metrics.stamina || 86 }
            ];

            return (
              <div
                key={ath.uid}
                className="relative rounded-2xl bg-[#0F1520]/90 border border-cyan-500/30 p-3 flex flex-col justify-between space-y-2 group hover:border-[#39FF14] transition-all"
              >
                {/* Remove Button */}
                <button
                  onClick={() => onRemoveAthlete(ath.uid)}
                  className="absolute top-2 right-2 p-1 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white hover:bg-rose-500/30 transition-all cursor-pointer z-10"
                  title="Remove Athlete"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {/* Profile Header */}
                <div className="flex items-center gap-2.5">
                  <img
                    src={ath.avatarUrl || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=150&auto=format&fit=crop&q=80'}
                    alt={ath.displayName}
                    className="w-10 h-10 rounded-xl object-cover border border-[#00F2FE]"
                  />
                  <div className="min-w-0 flex-1 pr-6">
                    <div className="text-xs font-black text-white truncate font-sans">
                      {ath.displayName}
                    </div>
                    <div className="text-[10px] text-cyan-400 font-mono flex items-center gap-1">
                      <span>{ath.position || 'ATH'}</span>
                      <span>•</span>
                      <span>{ath.sport}</span>
                      <span>•</span>
                      <span className="text-amber-300 font-bold">{ath.gradYear || '2026'}</span>
                    </div>
                  </div>
                </div>

                {/* Micro Radar Stat Polygon */}
                <div className="flex items-center justify-center py-1 bg-black/40 rounded-xl">
                  <RadarChart stats={radarStats} size={110} />
                </div>

                {/* Quick Telemetry Strip */}
                <div className="grid grid-cols-2 gap-1.5 text-center text-[10px] font-mono">
                  <div className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300">
                    <span className="text-[8px] text-slate-500 block">ACADEMIC</span>
                    <strong className="text-emerald-400">{ath.gpa ? `${ath.gpa} GPA` : '3.8 GPA'}</strong>
                  </div>
                  <div className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300">
                    <span className="text-[8px] text-slate-500 block">NIL STOCK</span>
                    <strong className="text-amber-400">$42.5K/yr</strong>
                  </div>
                </div>

                {/* Full Profile CTA */}
                <button
                  onClick={() => onOpenDetailModal(ath)}
                  className="w-full py-1.5 rounded-xl bg-cyan-500/20 hover:bg-[#00F2FE] hover:text-slate-950 text-cyan-300 text-[10px] font-mono font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>Scout Full Card</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};
