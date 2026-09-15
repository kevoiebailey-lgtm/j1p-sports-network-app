import React, { useState } from 'react';
import { 
  Trophy, 
  Calendar, 
  Users, 
  Flame, 
  User, 
  Zap, 
  Search, 
  Camera, 
  Radio, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  TrendingUp, 
  MapPin, 
  Clock,
  CheckCircle2,
  Video,
  Star,
  Play,
  Activity,
  Shield,
  ChevronRight,
  Eye,
  Share2,
  Award,
  Heart,
  MessageSquare,
  ExternalLink,
  Lock,
  Layers,
  BarChart3,
  QrCode,
  Smartphone,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MainTab } from '../../types';
import { useLiveScores, LiveMatch } from '../../hooks/useLiveScores';
import { VerifiedBadge } from '../Common/VerifiedBadge';
import { NotificationPermissionBanner } from '../Common/NotificationPermissionBanner';
import { BrandLogo } from '../Common/BrandLogo';
import { ProMobileStoriesBar } from '../Mobile/ProMobileStoriesBar';
import { ProMobileQuickPassModal } from '../Mobile/ProMobileQuickPassModal';
import { ProgressiveDetailFeed } from './ProgressiveDetailFeed';
import { RecentVideoReels } from './RecentVideoReels';
import { GoogleCalendarSyncCard } from './GoogleCalendarSyncCard';
import { NativeSportsVideoPlayer } from '../Common/NativeSportsVideoPlayer';
import { HighImpactVideoHero } from './HighImpactVideoHero';
import { FeaturedMembersSlider } from './FeaturedMembersSlider';
import { HomepageMediaTheater } from './HomepageMediaTheater';
import { HomepageLayoutCustomizer, HomepageLayoutMode } from './HomepageLayoutCustomizer';
import { 
  AdBanner, 
  SlotC_LeaderboardAd, 
  SlotD_GlobalFixedSponsorBanner 
} from '../Ads/AdBanner';

interface HomeDashboardViewProps {
  onNavigateTab: (tab: MainTab) => void;
  onOpenPassModal?: () => void;
  onOpenCreateModal?: () => void;
}

export const HomeDashboardView: React.FC<HomeDashboardViewProps> = ({
  onNavigateTab,
  onOpenPassModal,
  onOpenCreateModal
}) => {
  const navigate = useNavigate();
  const { user, profile, role, switchRole } = useAuth();

  const [selectedSport, setSelectedSport] = useState<string>('all');
  const [layoutMode, setLayoutMode] = useState<HomepageLayoutMode>('broadcast');
  const [showQuickPass, setShowQuickPass] = useState<boolean>(false);
  const [showLiveShowcaseModal, setShowLiveShowcaseModal] = useState<boolean>(false);

  // Sports category filter tabs
  const sportsCategories = [
    { id: 'all', label: 'All Sports', icon: '🏆' },
    { id: 'basketball', label: 'Basketball', icon: '🏀' },
    { id: 'flag_football', label: "Girls' Flag Football", icon: '🏈' },
    { id: 'football', label: 'Football', icon: '🏈' },
    { id: 'lacrosse', label: 'Lacrosse', icon: '🥍' }
  ];

  // Infinite Marquee Teams & Affiliations
  const marqueePartners = [
    { name: 'NJ SCHOLARS EYBL', badge: 'AAU CIRCUIT' },
    { name: 'PSA CARDINALS', badge: 'EYBL SELECT' },
    { name: 'GOTHAM VALKYRIES', badge: 'FLAG FOOTBALL PRO' },
    { name: 'BERGEN CATHOLIC', badge: 'HIGH SCHOOL PREP' },
    { name: 'NEXUS ATHLETICS', badge: 'TRI-STATE' },
    { name: 'TOTAL SPORTS ACADEMY', badge: 'COLLEGE RECRUIT' },
    { name: 'HOOP GROUP METRO', badge: 'OFFICIAL VENUE' },
    { name: 'EAST COAST ELITE', badge: 'LACROSSE' }
  ];

  // Live Matches using custom hook
  const initialMatches: LiveMatch[] = [
    {
      id: 'm1',
      tournament: 'Tri-State Showcase',
      sport: 'basketball',
      homeTeam: 'NJ Scholars 17U',
      homeScore: 78,
      awayTeam: 'PSA Cardinals',
      awayScore: 74,
      status: 'LIVE',
      period: '4th Qtr • 0:42'
    },
    {
      id: 'm2',
      tournament: 'Gotham Flag Football',
      sport: 'flag_football',
      homeTeam: 'Metro Valkyries',
      homeScore: 28,
      awayTeam: 'Empire Elites',
      awayScore: 24,
      status: 'FINAL',
      period: 'Final'
    },
    {
      id: 'm3',
      tournament: 'East Coast Lax Classic',
      sport: 'lacrosse',
      homeTeam: 'Bergen Prep',
      homeScore: 0,
      awayTeam: 'Garden State Lax',
      awayScore: 0,
      status: 'UPCOMING',
      period: 'Starts 6:00 PM'
    }
  ];

  const { matches: liveMatches, isConnected } = useLiveScores(initialMatches);

  const handleSelectAthlete = (athleteId: string) => {
    navigate(`/athlete/${athleteId}`);
  };

  return (
    <div className="relative min-h-screen bg-transparent text-[#263238] dark:text-white font-sans selection:bg-[#FF6A00] selection:text-white overflow-hidden pb-36 space-y-6 transition-colors">
      
      {/* ATMOSPHERIC PRO STADIUM LIGHTING GLOW */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 w-[600px] h-[400px] bg-[#00B8D4]/15 dark:bg-[#00B8D4]/20 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-[#EC4899]/10 dark:bg-[#EC4899]/15 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 -left-32 w-[500px] h-[500px] bg-[#FF6A00]/10 dark:bg-[#FF6A00]/15 rounded-full blur-[160px]" />
      </div>

      {/* TOP LIVE SCORE TICKER RIBBON - Frosted Glass with Neon Statuses */}
      <section className="relative z-20 w-full frosted-glass border-b border-white/15 dark:border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00B8D4] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00B8D4] shadow-[0_0_10px_rgba(0,184,212,0.8)]"></span>
            </span>
            <span className="text-[11px] font-black tracking-widest text-[#00B8D4] uppercase font-mono">
              PRO LIVE SCORES
            </span>
          </div>

          {/* Horizontal Live Score Cards with Clear Glass */}
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-none py-0.5">
            {liveMatches.map((match) => (
              <div
                key={match.id}
                onClick={() => onNavigateTab('events')}
                className="flex items-center gap-3 px-3 py-1.5 rounded-xl clear-glass hover:border-[#00B8D4] transition-all cursor-pointer shrink-0 text-xs font-mono group hover:glow-cyan"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[#263238] dark:text-white font-bold text-[11px]">{match.homeTeam}</span>
                    <span className="text-[#FF6A00] font-black">{match.status === 'UPCOMING' ? '--' : match.homeScore}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">{match.awayTeam}</span>
                    <span className="text-slate-500 dark:text-slate-400 font-bold">{match.status === 'UPCOMING' ? '--' : match.awayScore}</span>
                  </div>
                </div>

                <div className="border-l border-white/15 dark:border-white/10 pl-2 text-right">
                  {match.status === 'LIVE' && (
                    <span className="text-[9px] bg-rose-500/20 text-rose-500 border border-rose-500/40 px-1.5 py-0.5 rounded font-black animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.3)]">
                      LIVE
                    </span>
                  )}
                  {match.status === 'FINAL' && (
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                      FINAL
                    </span>
                  )}
                  {match.status === 'UPCOMING' && (
                    <span className="text-[9px] bg-amber-500/20 text-amber-500 border border-amber-500/40 px-1.5 py-0.5 rounded font-bold shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                      6 PM
                    </span>
                  )}
                  <div className="text-[9px] text-slate-400 mt-0.5">{match.period}</div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => onNavigateTab('events')}
            className="hidden md:flex items-center gap-1 text-[11px] font-mono font-bold text-[#00B8D4] hover:text-[#00E5FF] uppercase transition-colors shrink-0 cursor-pointer"
          >
            <span>Brackets</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* MAIN CONTAINER */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* TOP LAYOUT CUSTOMIZER BAR */}
        <HomepageLayoutCustomizer
          currentMode={layoutMode}
          onChangeMode={setLayoutMode}
          selectedSport={selectedSport}
          onChangeSport={setSelectedSport}
        />

        {/* PRO STORIES & UNIFIED SPORT SELECTOR BAR */}
        <section className="space-y-3">
          {/* Athlete Story Highlights in Frosted Glass */}
          <div className="frosted-glass rounded-2xl p-2.5 shadow-md border border-white/15 dark:border-white/10">
            <ProMobileStoriesBar onAddStory={() => onNavigateTab('social')} />
          </div>

          {/* Clean Single Sport Category Bar */}
          <div className="flex items-center justify-between gap-3 overflow-x-auto scrollbar-none py-1">
            <div className="flex items-center gap-2">
              {sportsCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedSport(cat.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    selectedSport === cat.id
                      ? 'bg-gradient-to-r from-[#FF6A00] to-[#FF8C00] text-white shadow-[0_0_20px_rgba(255,106,0,0.45)] border border-[#FFC857]/40'
                      : 'clear-glass text-slate-700 dark:text-slate-300 hover:text-[#263238] dark:hover:text-white hover:border-[#00B8D4]/50'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowQuickPass(true)}
              className="shrink-0 px-3.5 py-2 rounded-xl clear-glass hover:border-[#00B8D4] text-[#263238] dark:text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs hover:glow-cyan"
            >
              <QrCode className="w-3.5 h-3.5 text-[#00B8D4]" />
              <span className="hidden sm:inline">Digital QR Pass</span>
            </button>
          </div>
        </section>

        {/* PUSH NOTIFICATION PERMISSION BANNER */}
        <NotificationPermissionBanner />

        {/* HIGH-IMPACT ESPN-LEVEL FULL-WIDTH AUTOPLAY VIDEO HERO */}
        <section className="relative z-10 w-full">
          <HighImpactVideoHero
            onNavigateTab={onNavigateTab}
            onOpenBookingModal={() => onNavigateTab('media-booking' as any)}
          />
        </section>

        {/* 1. DEDICATED MEMBERS & ATHLETES SLIDER (PRIMARY PROMINENT PLACEMENT) */}
        <FeaturedMembersSlider
          onNavigateTab={onNavigateTab}
          onSelectAthlete={handleSelectAthlete}
        />

        {/* 2. BROADCAST MEDIA THEATER (DIRECT IN-FEED VIDEO CENTER) */}
        <HomepageMediaTheater
          onNavigateTab={onNavigateTab}
        />

        {/* ==========================================
            HERO SHOWCASE (2/3 & 1/3 SPLIT) - FROSTED GLASS & CLEAR GLASS
            ========================================== */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* LEFT 66% (lg:col-span-8): PRIMETIME FEATURED SHOWCASE */}
          <div className="lg:col-span-8 frosted-glass border border-white/20 dark:border-white/15 hover:border-[#00B8D4] rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[380px] group shadow-xl transition-all glow-cyan">
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-30 group-hover:scale-105 transition-transform duration-700 pointer-events-none" 
              style={{ backgroundImage: `url(https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1000&auto=format&fit=crop&q=80)` }} 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-white/80 dark:from-[#1E282D]/95 dark:via-[#263238]/85 to-transparent pointer-events-none" />

            {/* Top Card Info & Sponsor Badge */}
            <div className="relative z-10 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="clear-glass text-[#00B8D4] text-[10px] font-mono font-black px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,184,212,0.25)] border border-[#00B8D4]/40">
                  <Zap className="w-3 h-3 text-[#00B8D4] fill-[#00B8D4]" />
                  <span>Sponsored by Gatorade</span>
                </span>
                <span className="bg-rose-600 text-white border border-rose-300/40 text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full uppercase animate-pulse flex items-center gap-1 shadow-[0_0_15px_rgba(225,29,72,0.5)]">
                  <Radio className="w-3 h-3 text-white" /> 4K STREAM • LIVE
                </span>
                <span className="clear-glass text-[#EC4899] text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full uppercase border border-[#EC4899]/40 shadow-[0_0_12px_rgba(236,72,153,0.25)]">
                  SEMIFINALS
                </span>
              </div>

              <h3 className="text-2xl sm:text-4xl font-black italic uppercase tracking-wide text-[#263238] dark:text-white mt-1 leading-tight">
                NJ Scholars 17U vs. PSA Cardinals
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-lg leading-relaxed font-sans">
                Tri-State Championship Finals • Live 4K Showcase with Real-Time Pro Analytics & Recruiter Scout Tracking.
              </p>
            </div>

            {/* Showcase Video Player Controls & Stats Bar */}
            <div className="relative z-10 space-y-4 pt-6">
              <div className="flex flex-wrap items-center gap-3">
                <button 
                  onClick={() => setShowLiveShowcaseModal(true)}
                  className="bg-gradient-to-r from-[#FF6A00] to-[#FF8C00] hover:from-[#E05D00] hover:to-[#FF6A00] text-white font-black px-6 py-3 rounded-2xl text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-[0_0_25px_rgba(255,106,0,0.5)] transition-all transform active:scale-95 border border-[#FFC857]/40"
                >
                  <Play className="w-4 h-4 text-white fill-white" />
                  <span>Watch Showcase Live</span>
                </button>
                <button 
                  onClick={() => onNavigateTab('athletes')}
                  className="clear-glass hover:bg-white/10 dark:hover:bg-white/10 text-[#263238] dark:text-white font-bold px-5 py-3 rounded-2xl text-xs uppercase border border-white/20 hover:border-[#00B8D4] cursor-pointer transition-all hover:glow-cyan"
                >
                  View Scout Notes
                </button>
              </div>

              <div className="p-3 rounded-2xl clear-glass border border-white/15 dark:border-white/10 flex items-center justify-between font-mono text-[11px] text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-[#FF6A00]" />
                  <span>Possession: NJ Scholars • 0:42 4th Qtr</span>
                </span>
                <span className="text-[#00B8D4] font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#00B8D4] animate-ping" />
                  1.2k Live Viewers
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT 33% (lg:col-span-4): FEATURED PROSPECT SPOTLIGHT - FROSTED GLASS & MULTI-COLOR ACCENTS */}
          <div className="lg:col-span-4 frosted-glass border border-white/20 dark:border-white/15 hover:border-[#EC4899] rounded-3xl p-5 flex flex-col justify-between shadow-xl transition-all glow-pink">
            <div>
              <div className="flex justify-between items-start border-b border-white/15 dark:border-white/10 pb-3 mb-3">
                <span className="text-xs font-bold text-[#EC4899] font-mono tracking-wider">FEATURED PROSPECT</span>
                <span className="clear-glass text-[#EC4899] text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-[#EC4899]/40 shadow-[0_0_10px_rgba(236,72,153,0.3)]">
                  CLASS OF 2026
                </span>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <img 
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80" 
                  alt="Jayden Carter"
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-[#EC4899] shadow-[0_0_15px_rgba(236,72,153,0.4)]"
                />
                <div>
                  <h4 className="text-base font-black uppercase text-[#263238] dark:text-white flex items-center gap-1.5">
                    <span>Jayden Carter</span>
                    <VerifiedBadge size="sm" />
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-300 font-mono">Point Guard • Nexus Prep</p>
                  <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-mono font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    NCAA Eligible (3.8 GPA)
                  </span>
                </div>
              </div>

              {/* Stat Metric Grid - Clear Glass Tiles with Vibrant Accent Colors */}
              <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
                <div className="clear-glass p-3 rounded-2xl border border-[#FF6A00]/30 text-center shadow-xs hover:border-[#FF6A00] transition-colors">
                  <span className="text-[10px] text-slate-400 block font-mono">SCORING AVG</span>
                  <span className="text-lg font-black text-[#FF6A00]">28.4 <span className="text-[10px] font-normal text-slate-400">PPG</span></span>
                </div>
                <div className="clear-glass p-3 rounded-2xl border border-[#00B8D4]/30 text-center shadow-xs hover:border-[#00B8D4] transition-colors">
                  <span className="text-[10px] text-slate-400 block font-mono">40-YD DASH</span>
                  <span className="text-lg font-black text-[#00B8D4]">4.42s</span>
                </div>
                <div className="clear-glass p-3 rounded-2xl border border-[#3B82F6]/30 text-center shadow-xs hover:border-[#3B82F6] transition-colors">
                  <span className="text-[10px] text-slate-400 block font-mono">PASSER RATING</span>
                  <span className="text-lg font-black text-[#3B82F6]">128.5</span>
                </div>
                <div className="clear-glass p-3 rounded-2xl border border-[#10B981]/30 text-center shadow-xs hover:border-[#10B981] transition-colors">
                  <span className="text-[10px] text-slate-400 block font-mono">VERIFIED GPA</span>
                  <span className="text-lg font-black text-emerald-500 dark:text-emerald-400">3.80</span>
                </div>
              </div>
            </div>

            <button 
              onClick={() => onNavigateTab('athletes')}
              className="w-full mt-4 bg-gradient-to-r from-[#EC4899] to-[#F43F5E] hover:brightness-110 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(236,72,153,0.4)] border border-pink-300/30"
            >
              <span>Launch Recruiter Matrix &rarr;</span>
            </button>
          </div>

        </section>

        {/* UPCOMING SHOWCASE GOOGLE CALENDAR SYNC CARD */}
        <GoogleCalendarSyncCard onNavigateTab={onNavigateTab} />

        {/* ==========================================
            MEDIA & HIGHLIGHT FEED CENTER
            ========================================== */}
        <section className="space-y-6 pt-2">
          
          {/* Recently Uploaded Video Reels & Highlight Swiper */}
          <RecentVideoReels onNavigateTab={onNavigateTab} onOpenCreateModal={onOpenCreateModal} />

          {/* Interactive Progressive Detail Feed */}
          <ProgressiveDetailFeed 
            selectedSport={selectedSport} 
            onNavigateTab={onNavigateTab} 
          />

          {/* Integrated Sponsor Leaderboard */}
          <SlotC_LeaderboardAd 
            onOpenAdvertiseModal={() => onNavigateTab('advertise' as any)} 
          />

          {/* Dynamic Bento Matrix Features with Frosted Glass */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">

            {/* Verified Profiles Card (6 cols) */}
            <div 
              onClick={() => onNavigateTab('athletes')}
              className="lg:col-span-6 rounded-3xl frosted-glass border border-white/20 dark:border-white/15 hover:border-[#10B981] p-6 shadow-xl transition-all cursor-pointer group flex flex-col justify-between space-y-4 hover:glow-green"
            >
              <div className="flex items-center justify-between border-b border-white/15 dark:border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl clear-glass border border-[#10B981]/40 text-[#10B981] shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black italic uppercase text-[#263238] dark:text-white">
                      Verified Recruit Profiles
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-300">
                      Verified stats, academic GPA, height/weight & Hudl clips.
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#10B981] group-hover:translate-x-1 transition-all" />
              </div>

              <div className="p-3.5 rounded-2xl clear-glass border border-white/15 dark:border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img 
                      src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80" 
                      alt="Maya Sanchez" 
                      className="w-9 h-9 rounded-xl object-cover border-2 border-[#10B981] shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                    />
                    <div>
                      <div className="text-xs font-bold text-[#263238] dark:text-white uppercase flex items-center gap-1">
                        <span>Maya Sanchez</span>
                        <VerifiedBadge size="sm" />
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-300 font-mono">Flag Football QB • Metro Tech</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 clear-glass text-[#10B981] text-[10px] font-bold rounded-lg font-mono border border-[#10B981]/30">
                    34 Pass TD
                  </span>
                </div>
              </div>
            </div>

            {/* Real-Time Tournament Brackets (6 cols) */}
            <div 
              onClick={() => onNavigateTab('events')}
              className="lg:col-span-6 rounded-3xl frosted-glass border border-white/20 dark:border-white/15 hover:border-[#14B8A6] p-6 shadow-xl transition-all cursor-pointer group flex flex-col justify-between space-y-4 hover:glow-teal"
            >
              <div className="flex items-center justify-between border-b border-white/15 dark:border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl clear-glass border border-[#14B8A6]/40 text-[#14B8A6] shadow-[0_0_15px_rgba(20,184,166,0.3)]">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black italic uppercase text-[#263238] dark:text-white">
                      Live Tournament Brackets
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-300">
                      Zorts-style bracket progression & instant score updates.
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#14B8A6] group-hover:translate-x-1 transition-all" />
              </div>

              <div className="p-3 rounded-2xl clear-glass border border-white/15 dark:border-white/10 flex items-center justify-between font-mono text-xs">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-[#14B8A6]" />
                  <span className="text-[#263238] dark:text-white font-bold">2026 Tri-State Championship Tree</span>
                </div>
                <span className="text-[10px] text-[#14B8A6] font-bold clear-glass px-2 py-0.5 rounded border border-[#14B8A6]/30">LIVE BRACKET</span>
              </div>
            </div>

          </div>
        </section>

        {/* INFINITE LOGO MARQUEE */}
        <section className="space-y-3 pt-2">
          <div className="text-center">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#00B8D4]">
              TRUSTED BY TOP TRI-STATE CIRCUITS, PREP SCHOOLS & NCAA RECRUITERS
            </span>
          </div>

          <div className="relative overflow-hidden py-3 rounded-2xl frosted-glass border border-white/15 dark:border-white/10 shadow-lg">
            <motion.div 
              animate={{ x: [0, '-50%'] }}
              transition={{ repeat: Infinity, ease: 'linear', duration: 22 }}
              className="flex gap-6 whitespace-nowrap flex-nowrap items-center w-max"
            >
              {marqueePartners.concat(marqueePartners).concat(marqueePartners).map((partner, idx) => (
                <div 
                  key={idx}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl clear-glass border border-white/15 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 font-mono shadow-xs shrink-0 hover:border-[#00B8D4]/40"
                >
                  <Trophy className="w-3.5 h-3.5 text-[#00B8D4]" />
                  <span className="text-[#263238] dark:text-white uppercase">{partner.name}</span>
                  <span className="px-1.5 py-0.5 text-[9px] bg-[#00B8D4]/15 text-[#00B8D4] border border-[#00B8D4]/30 rounded">
                    {partner.badge}
                  </span>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

      </div>

      {/* QUICK DIGITAL PASS MODAL FOR MOBILE */}
      <ProMobileQuickPassModal
        isOpen={showQuickPass}
        onClose={() => setShowQuickPass(false)}
      />

      {/* LIVE SHOWCASE VIDEO MODAL */}
      <AnimatePresence>
        {showLiveShowcaseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl bg-white dark:bg-[#263238] border border-slate-200 dark:border-[#37474F] rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-[#182025] border-b border-slate-200 dark:border-[#37474F]">
                <div className="flex items-center gap-3">
                  <span className="bg-red-500/20 text-red-500 border border-red-500/40 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full uppercase flex items-center gap-1.5 animate-pulse">
                    <Radio className="w-3.5 h-3.5" /> LIVE 4K SHOWCASE
                  </span>
                  <div>
                    <h3 className="text-[#263238] dark:text-white font-black text-sm sm:text-base">NJ Scholars 17U vs. PSA Cardinals</h3>
                    <p className="text-slate-500 dark:text-slate-300 text-xs font-mono">Tri-State Championship Finals • 4th Qtr 0:42</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowLiveShowcaseModal(false)}
                  className="p-2 rounded-xl bg-slate-200 dark:bg-[#1E282D] hover:bg-[#FF6A00] text-slate-600 dark:text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="sr-only">Close</span>
                  ✕
                </button>
              </div>

              {/* Video Player */}
              <div className="p-3 sm:p-4 bg-black">
                <NativeSportsVideoPlayer
                  streamUrl="https://assets.mixkit.co/videos/preview/mixkit-basketball-player-dunking-a-ball-4043-large.mp4"
                  posterUrl="https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1000&auto=format&fit=crop&q=80"
                  athleteName="NJ Scholars 17U vs PSA Cardinals"
                  athleteStats="Live Tri-State Finals"
                  autoPlay={true}
                />
              </div>

              {/* Footer info & CTA */}
              <div className="p-4 bg-slate-100 dark:bg-[#182025] border-t border-slate-200 dark:border-[#37474F] flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-mono">
                  <Activity className="w-4 h-4 text-[#FF6A00]" />
                  <span>1.2k Live Viewers • 4K HDR 60fps</span>
                </div>
                <button
                  onClick={() => {
                    setShowLiveShowcaseModal(false);
                    onNavigateTab('athletes');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#FF6A00] text-white font-black text-xs uppercase tracking-wider hover:bg-[#E05D00] transition-colors cursor-pointer"
                >
                  View All Athlete Profiles
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FIXED GLOBAL SPONSOR BANNER */}
      <SlotD_GlobalFixedSponsorBanner 
        onOpenAdvertiseModal={() => onNavigateTab('advertise' as any)} 
      />

    </div>
  );
};
