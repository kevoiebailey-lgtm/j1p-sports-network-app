import React from 'react';
import { 
  Flame, 
  Zap, 
  Activity, 
  Award, 
  GraduationCap, 
  ShieldCheck, 
  BarChart2, 
  Trophy, 
  Target, 
  TrendingUp,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { UserProfile, BasketballStats, PerformanceMetrics } from '../../types';

interface AthleteStatsViewProps {
  profile: UserProfile;
}

export const AthleteStatsView: React.FC<AthleteStatsViewProps> = ({ profile }) => {
  const defaultStats = {
    points: 18.4,
    rebounds: 5.2,
    assists: 6.8,
    steals: 2.1,
    blocks: 0.6,
    fieldGoalPercentage: 51.4,
    threePointPercentage: 42.1,
    freeThrowPercentage: 86.5
  };

  const rawStats = (profile.stats || {}) as Record<string, any>;
  const points = rawStats.points ?? defaultStats.points;
  const assists = rawStats.assists ?? defaultStats.assists;
  const rebounds = rawStats.rebounds ?? defaultStats.rebounds;
  const steals = rawStats.steals ?? defaultStats.steals;
  const fgPct = rawStats.fieldGoalPercentage ?? defaultStats.fieldGoalPercentage;
  const threePct = rawStats.threePointPercentage ?? defaultStats.threePointPercentage;

  const metrics: PerformanceMetrics = profile.performanceMetrics || {
    speed: 92,
    strength: 84,
    agility: 95,
    stamina: 88,
    vertical: 91,
    iq: 96
  };

  // Combine Verified Measurements
  const combineStats = [
    { label: '40-Yard Dash', value: '4.48s', sub: 'Laser Verified', highlight: true },
    { label: 'Vertical Leap', value: '38.5"', sub: '95th Percentile', highlight: false },
    { label: 'Height / Wingspan', value: `${profile.height || "6'1\""} / 6'5"`, sub: 'Official Combine', highlight: false },
    { label: 'Weight / Body Fat', value: `${profile.weight || "180 lbs"} / 7.2%`, sub: 'In-Season Weight', highlight: false },
    { label: 'Pro Agility (5-10-5)', value: '4.12s', sub: 'Elite Grade', highlight: true },
    { label: 'Max Bench Press', value: '205 lbs', sub: 'Rep Test', highlight: false },
    { label: 'NCAA Eligibility ID', value: profile.athleteId || '#2604819024', sub: 'Active Qualifier', highlight: false },
    { label: 'Academic GPA / SAT', value: `${profile.gpa || '3.85'} / SAT 1340`, sub: "Dean's Honor Roll", highlight: true }
  ];

  return (
    <div className="space-y-6">
      
      {/* 1. Season Statistical Averages HUD */}
      <div className="rounded-3xl bg-[#131B26] border border-white/10 p-5 sm:p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-[#00E5FF]">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black uppercase text-white tracking-wider">
                Current Season Performance Averages
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Official Statkeeper Verified • 2025-2026 Circuit
              </p>
            </div>
          </div>

          <span className="self-start sm:self-auto px-3 py-1 rounded-full text-[10px] font-black font-mono uppercase tracking-wider bg-[#39FF14]/15 text-[#39FF14] border border-[#39FF14]/40 flex items-center gap-1.5 shadow-[0_0_12px_rgba(57,255,20,0.2)]">
            <CheckCircle2 className="w-3 h-3" />
            LIVE VERIFIED
          </span>
        </div>

        {/* Big Number Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="bg-[#0B0F17] border border-white/10 rounded-2xl p-3.5 text-center group hover:border-[#00E5FF]/50 transition-colors">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block mb-1">PTS / GAME</span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-[#00E5FF] tracking-tight">
              {points}
            </div>
            <span className="text-[9px] text-[#39FF14] font-mono font-bold block mt-1">+2.4 vs last season</span>
          </div>

          <div className="bg-[#0B0F17] border border-white/10 rounded-2xl p-3.5 text-center group hover:border-[#00E5FF]/50 transition-colors">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block mb-1">AST / GAME</span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
              {assists}
            </div>
            <span className="text-[9px] text-slate-500 font-mono block mt-1">Team Leader</span>
          </div>

          <div className="bg-[#0B0F17] border border-white/10 rounded-2xl p-3.5 text-center group hover:border-[#00E5FF]/50 transition-colors">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block mb-1">REB / GAME</span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
              {rebounds}
            </div>
            <span className="text-[9px] text-slate-500 font-mono block mt-1">2.1 Off / 2.7 Def</span>
          </div>

          <div className="bg-[#0B0F17] border border-white/10 rounded-2xl p-3.5 text-center group hover:border-[#00E5FF]/50 transition-colors">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block mb-1">STL / GAME</span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-[#39FF14] tracking-tight">
              {steals}
            </div>
            <span className="text-[9px] text-emerald-400 font-mono font-bold block mt-1">Top 5 in League</span>
          </div>

          <div className="bg-[#0B0F17] border border-white/10 rounded-2xl p-3.5 text-center group hover:border-[#00E5FF]/50 transition-colors">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block mb-1">FG ACCURACY</span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
              {fgPct}%
            </div>
            <span className="text-[9px] text-slate-500 font-mono block mt-1">112/218 Shooting</span>
          </div>

          <div className="bg-[#0B0F17] border border-white/10 rounded-2xl p-3.5 text-center group hover:border-[#00E5FF]/50 transition-colors">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block mb-1">3PT ACCURACY</span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-[#00E5FF] tracking-tight">
              {threePct}%
            </div>
            <span className="text-[9px] text-[#00E5FF] font-mono block mt-1">45/107 Made</span>
          </div>
        </div>
      </div>

      {/* 2. Athletic Performance Index & Cybernetic Stat Rings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Athletic Attribute Bars */}
        <div className="lg:col-span-2 rounded-3xl bg-[#131B26] border border-white/10 p-5 sm:p-6 shadow-2xl backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#39FF14]" />
              <h3 className="text-base font-black uppercase text-white tracking-wider">
                Athletic Performance Matrix (0-100)
              </h3>
            </div>
            <span className="text-xs font-mono font-black text-[#00E5FF] bg-[#00E5FF]/10 px-2.5 py-0.5 rounded-lg border border-[#00E5FF]/30">
              OVERALL 93
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            
            {/* Speed */}
            <div className="bg-[#0B0F17] border border-white/5 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 font-bold uppercase">Sprint Speed & Burst</span>
                <span className="text-[#00E5FF] font-black">{metrics.speed || 92} / 100</span>
              </div>
              <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-[#00E5FF] to-[#39FF14] rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(0,229,255,0.5)]" 
                  style={{ width: `${metrics.speed || 92}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Top speed 21.4 mph in open transition</span>
            </div>

            {/* Agility */}
            <div className="bg-[#0B0F17] border border-white/5 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 font-bold uppercase">Lateral Quickness</span>
                <span className="text-[#39FF14] font-black">{metrics.agility || 95} / 100</span>
              </div>
              <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-[#39FF14] to-[#00E5FF] rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(57,255,20,0.5)]" 
                  style={{ width: `${metrics.agility || 95}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Elite change-of-direction shuttle score</span>
            </div>

            {/* Vertical / Leaping */}
            <div className="bg-[#0B0F17] border border-white/5 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 font-bold uppercase">Explosive Leap</span>
                <span className="text-[#00E5FF] font-black">{metrics.vertical || 91} / 100</span>
              </div>
              <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-[#00E5FF] to-[#39FF14] rounded-full transition-all duration-500" 
                  style={{ width: `${metrics.vertical || 91}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 font-mono">38.5 inch max standing vertical</span>
            </div>

            {/* Tactical IQ */}
            <div className="bg-[#0B0F17] border border-white/5 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 font-bold uppercase">Tactical Court IQ</span>
                <span className="text-[#39FF14] font-black">{metrics.iq || 96} / 100</span>
              </div>
              <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-[#39FF14] to-[#00E5FF] rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(57,255,20,0.5)]" 
                  style={{ width: `${metrics.iq || 96}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 font-mono">3.4:1 Assist to Turnover Ratio</span>
            </div>
          </div>
        </div>

        {/* Academic & Recruiting Card */}
        <div className="rounded-3xl bg-[#131B26] border border-white/10 p-5 sm:p-6 shadow-2xl backdrop-blur-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap className="w-5 h-5 text-[#FFC857]" />
              <h3 className="text-base font-black uppercase text-white tracking-wider">
                Academics & NCAA Status
              </h3>
            </div>
            
            <div className="space-y-3">
              <div className="bg-[#0B0F17] border border-white/5 rounded-2xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-mono uppercase block">High School GPA</span>
                  <span className="text-xl font-black font-mono text-[#FFC857]">{profile.gpa || '3.85'}</span>
                </div>
                <span className="px-2 py-1 rounded bg-[#FFC857]/15 text-[#FFC857] text-[10px] font-mono font-bold border border-[#FFC857]/30">
                  AP / Honors
                </span>
              </div>

              <div className="bg-[#0B0F17] border border-white/5 rounded-2xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-mono uppercase block">Standardized Test</span>
                  <span className="text-lg font-black font-mono text-white">SAT 1340</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Class of {profile.gradYear || '2026'}</span>
              </div>

              <div className="bg-[#0B0F17] border border-white/5 rounded-2xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-mono uppercase block">NCAA Clearinghouse</span>
                  <span className="text-xs font-black font-mono text-[#39FF14]">Qualified Division 1</span>
                </div>
                <ShieldCheck className="w-5 h-5 text-[#39FF14]" />
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 font-mono bg-[#0B0F17]/80 p-3 rounded-xl border border-white/5">
            Interested in: <strong className="text-white">Business / Sports Management</strong>
          </div>
        </div>
      </div>

      {/* 3. Official Combine Measurements Grid */}
      <div className="rounded-3xl bg-[#131B26] border border-white/10 p-5 sm:p-6 shadow-2xl backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-[#00E5FF]" />
            <h3 className="text-base font-black uppercase text-white tracking-wider">
              Official Combine & Physical Measurements
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">All Metrics Verified via Laser Timing</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {combineStats.map((stat, idx) => (
            <div 
              key={idx}
              className={`bg-[#0B0F17] border rounded-2xl p-3.5 transition-all ${
                stat.highlight ? 'border-[#00E5FF]/40 shadow-[0_0_15px_rgba(0,229,255,0.15)]' : 'border-white/5 hover:border-white/20'
              }`}
            >
              <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block mb-1">
                {stat.label}
              </span>
              <div className={`text-lg sm:text-xl font-black font-mono ${stat.highlight ? 'text-[#00E5FF]' : 'text-white'}`}>
                {stat.value}
              </div>
              <span className="text-[9px] text-slate-500 font-mono block mt-0.5">
                {stat.sub}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
