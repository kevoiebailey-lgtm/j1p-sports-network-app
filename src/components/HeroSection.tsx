import React, { useState } from 'react';
import { 
  Trophy, 
  Users, 
  Zap, 
  Play, 
  Activity, 
  TrendingUp, 
  Award, 
  ChevronRight, 
  Sparkles, 
  ExternalLink,
  Tag
} from 'lucide-react';
import { motion } from 'framer-motion';
import { VerifiedBadge } from './Common/VerifiedBadge';
import { AdBanner } from './Ads/AdBanner';

interface HeroSectionProps {
  onNavigateTab: (tab: any) => void;
  selectedSportName?: string;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onNavigateTab,
  selectedSportName = "Girls' Flag Football"
}) => {
  const [activeMockupTab, setActiveMockupTab] = useState<'stats' | 'film' | 'scout'>('stats');

  return (
    <section className="relative pt-2 flex flex-col items-center text-center space-y-8 sm:space-y-12">
      
      {/* Floating Pill-Shaped Glass Top Bar Anchor */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        onClick={() => onNavigateTab('events')}
        className="inline-flex items-center gap-2 sm:gap-3 px-4 py-2 rounded-full bg-[#1E2630] border border-[#2D3748] backdrop-blur-2xl shadow-md group hover:border-[#00F2FE]/60 transition-all cursor-pointer"
      >
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00F2FE] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00F2FE]"></span>
        </span>
        <span className="text-[11px] font-mono font-bold tracking-widest text-[#94A3B8] uppercase flex items-center gap-1.5">
          <span>JUST1PLAY MATRIX ONLINE</span>
          <span className="text-[#00F2FE]">•</span>
          <span className="text-[#00F2FE] font-black">2026 TRI-STATE SHOWCASE LIVE</span>
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8] group-hover:text-[#00F2FE] group-hover:translate-x-0.5 transition-transform" />
      </motion.div>

      {/* Massive Center Headline */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1 }}
        className="max-w-4xl mx-auto space-y-4"
      >
        {/* Sport Tag */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/40 text-[#F59E0B] text-xs font-mono font-bold uppercase tracking-wider">
          <Tag className="w-3.5 h-3.5 text-[#F59E0B]" />
          <span>{selectedSportName}</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white uppercase italic leading-[0.95] drop-shadow-2xl">
          The Elite Digital Arena <br />
          <span className="text-[#F59E0B] drop-shadow-[0_0_25px_rgba(245,158,11,0.5)]">
            For Youth Sports.
          </span>
        </h1>

        <p className="text-sm sm:text-lg text-[#94A3B8] font-normal max-w-2xl mx-auto leading-relaxed">
          Where athletes, recruiters, and fans connect. Live stats, dynamic brackets, and professional media profiles.
        </p>
      </motion.div>

      {/* Call-to-Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2 w-full max-w-xl mx-auto"
      >
        <button
          onClick={() => onNavigateTab('athletes')}
          className="w-full sm:w-auto min-h-[56px] px-8 py-4 rounded-2xl bg-[#F59E0B] hover:bg-[#FBBF24] text-[#161C22] font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(245,158,11,0.35)] hover:shadow-[0_0_35px_rgba(245,158,11,0.55)] transition-all transform active:scale-95 flex items-center justify-center gap-3 cursor-pointer border border-[#F59E0B]"
        >
          <Zap className="w-5 h-5 text-[#161C22] stroke-[2.5]" />
          <span>Launch Recruiter Matrix</span>
        </button>

        <button
          onClick={() => onNavigateTab('events')}
          className="w-full sm:w-auto min-h-[56px] px-8 py-4 rounded-2xl bg-[#1E2630] hover:bg-[#2D3748] border border-[#2D3748] hover:border-[#00F2FE]/60 text-white font-black text-sm uppercase tracking-wider backdrop-blur-2xl transition-all transform active:scale-95 flex items-center justify-center gap-3 cursor-pointer shadow-md"
        >
          <Trophy className="w-5 h-5 text-[#00F2FE] stroke-[2.5]" />
          <span>Explore Brackets</span>
        </button>
      </motion.div>

      {/* SPONSORED LEADERBOARD AD BANNER */}
      <div className="w-full max-w-5xl my-4">
        <AdBanner 
          position="header-leaderboard" 
          onOpenAdvertiseModal={() => onNavigateTab('advertise' as any)}
        />
      </div>

      {/* Large 'J1P' Hero Card Section */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="w-full max-w-5xl mt-6 rounded-3xl bg-[#1E2630] border border-[#2D3748] backdrop-blur-2xl shadow-xl p-4 sm:p-8 relative overflow-hidden group hover:border-[#00F2FE]/40 transition-all duration-500 text-left"
      >
        {/* Ambient Inner Card Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#F59E0B]/10 via-[#00F2FE]/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Hero Card Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2D3748] pb-5 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" 
                alt="Jayden Carter"
                className="w-14 h-14 rounded-2xl object-cover border-2 border-[#00F2FE] shadow-[0_0_15px_rgba(0,242,254,0.35)]"
              />
              <span className="absolute -bottom-1 -right-1 p-0.5 bg-[#10B981] text-white rounded-md">
                <VerifiedBadge size="sm" />
              </span>
            </div>

            <div className="text-left space-y-0.5">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black italic uppercase text-white tracking-tight">
                  Jayden Carter
                </h3>
                <span className="px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40 rounded-full font-mono">
                  CLASS OF 2026
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] font-mono">
                Point Guard • Nexus Prep • NJ • GPA 3.8
              </p>
            </div>
          </div>

          {/* Mockup Tab Controls */}
          <div className="flex items-center gap-1.5 bg-[#161C22] p-1 rounded-xl border border-[#2D3748] self-start sm:self-center">
            <button
              onClick={() => setActiveMockupTab('stats')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                activeMockupTab === 'stats' 
                  ? 'bg-[#F59E0B] text-[#161C22] shadow-[0_0_10px_rgba(245,158,11,0.4)]' 
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              Live Stats
            </button>
            <button
              onClick={() => setActiveMockupTab('film')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                activeMockupTab === 'film' 
                  ? 'bg-[#F59E0B] text-[#161C22] shadow-[0_0_10px_rgba(245,158,11,0.4)]' 
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              Film Reel
            </button>
            <button
              onClick={() => setActiveMockupTab('scout')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                activeMockupTab === 'scout' 
                  ? 'bg-[#F59E0B] text-[#161C22] shadow-[0_0_10px_rgba(245,158,11,0.4)]' 
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              Scout Matrix
            </button>
          </div>
        </div>

        {/* Mockup Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-left">
          
          {/* Stat Metric 1 */}
          <div className="p-4 rounded-2xl bg-[#161C22]/80 border border-[#2D3748] backdrop-blur-md">
            <div className="flex items-center justify-between text-xs font-mono text-[#94A3B8] uppercase mb-1">
              <span>SCORING AVG</span>
              <Activity className="w-3.5 h-3.5 text-[#00F2FE]" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white">
              28.4 <span className="text-xs text-[#00F2FE] font-normal">PPG</span>
            </div>
            <div className="w-full bg-[#2D3748] h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-[#00F2FE] h-full rounded-full w-[88%]" />
            </div>
          </div>

          {/* Stat Metric 2 */}
          <div className="p-4 rounded-2xl bg-[#161C22]/80 border border-[#2D3748] backdrop-blur-md">
            <div className="flex items-center justify-between text-xs font-mono text-[#94A3B8] uppercase mb-1">
              <span>PLAYMAKING</span>
              <Zap className="w-3.5 h-3.5 text-[#F59E0B]" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white">
              6.2 <span className="text-xs text-[#F59E0B] font-normal">APG</span>
            </div>
            <div className="w-full bg-[#2D3748] h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-[#F59E0B] h-full rounded-full w-[78%]" />
            </div>
          </div>

          {/* Stat Metric 3 */}
          <div className="p-4 rounded-2xl bg-[#161C22]/80 border border-[#2D3748] backdrop-blur-md">
            <div className="flex items-center justify-between text-xs font-mono text-[#94A3B8] uppercase mb-1">
              <span>ATHLETICISM</span>
              <TrendingUp className="w-3.5 h-3.5 text-[#10B981]" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white">
              38.5&quot; <span className="text-xs text-[#10B981] font-normal">VERT</span>
            </div>
            <div className="w-full bg-[#2D3748] h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-[#10B981] h-full rounded-full w-[92%]" />
            </div>
          </div>

          {/* Stat Metric 4 */}
          <div className="p-4 rounded-2xl bg-[#161C22]/80 border border-[#2D3748] backdrop-blur-md">
            <div className="flex items-center justify-between text-xs font-mono text-[#94A3B8] uppercase mb-1">
              <span>SPEED TEST</span>
              <Award className="w-3.5 h-3.5 text-[#F59E0B]" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white">
              4.42s <span className="text-xs text-[#F59E0B] font-normal">40-YD</span>
            </div>
            <div className="w-full bg-[#2D3748] h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-[#F59E0B] h-full rounded-full w-[85%]" />
            </div>
          </div>

        </div>

        {/* Interactive Embedded Film Reel Bar */}
        <div className="mt-4 p-3.5 rounded-2xl bg-[#161C22] border border-[#2D3748] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#00F2FE]/15 text-[#00F2FE] flex items-center justify-center border border-[#00F2FE]/30">
              <Play className="w-4 h-4 text-[#00F2FE] stroke-[2]" />
            </div>
            <div>
              <span className="font-bold text-white uppercase block">2026 EYBL Summer Mixtape (4K Highlight)</span>
              <span className="text-[10px] text-[#94A3B8]">Embedded YouTube / Hudl Link • 12.4k Views</span>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('social')}
            className="px-3.5 py-1.5 rounded-xl bg-[#2D3748] hover:bg-[#F59E0B] hover:text-[#161C22] text-white font-bold text-[11px] uppercase transition-colors flex items-center gap-1.5 ml-auto cursor-pointer"
          >
            <span>Watch Highlights</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

      </motion.div>

    </section>
  );
};
