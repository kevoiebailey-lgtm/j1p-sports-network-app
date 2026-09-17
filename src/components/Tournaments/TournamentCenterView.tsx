import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { 
  Trophy, 
  Upload, 
  Layers, 
  Radio, 
  Activity, 
  Sparkles, 
  ShieldCheck, 
  Search, 
  Filter, 
  Calendar,
  MapPin,
  Clock,
  ArrowRight,
  Database,
  SlidersHorizontal,
  Flame,
  Award,
  Users,
  Printer,
  Megaphone,
  Video, 
  ClipboardCheck, 
  QrCode, 
  Target, 
  CloudRain, 
  HelpCircle, 
  BookOpen,
  LayoutGrid,
  X,
  ChevronRight,
  CheckCircle2,
  Share2
} from 'lucide-react';
import { SportType, TournamentMode, UniversalScheduleItem } from '../../types/tournamentEngine';
import { LiveScoresTicker } from '../LiveScoresTicker';
import { Skeleton } from '../Common/SkeletonLoader';
import { PrintableBracketModal } from './PrintableBracketModal';
import { MatchCallDispatchModal } from './MatchCallDispatchModal';
import { GameDayRosterPrintModal } from '../Roster/GameDayRosterPrintModal';
import { LockerRoomReelStudioModal } from '../HighlightReels/LockerRoomReelStudioModal';
import { GatePassScannerModal } from '../RecruiterMatrix/GatePassScannerModal';
import { SponsorCampaignDeskModal } from '../Ads/SponsorCampaignDeskModal';
import { GameClockRefereeDispatchModal } from './GameClockRefereeDispatchModal';
import { WeatherScheduleBroadcastModal } from './WeatherScheduleBroadcastModal';
import { AutoSeedingEngineModal } from './AutoSeedingEngineModal';
import { TournamentGuideWalkthroughModal } from './TournamentGuideWalkthroughModal';

// Code Splitting & Lazy Route Loading: Tournament Engines & Heavy Adapters
const UniversalBulkImporter = lazy(() => import('./UniversalBulkImporter').then(m => ({ default: m.UniversalBulkImporter })));
const PoolBracketEngine = lazy(() => import('./Engines/PoolBracketEngine').then(m => ({ default: m.PoolBracketEngine })));
const ShowcaseJamboreeEngine = lazy(() => import('./Engines/ShowcaseJamboreeEngine').then(m => ({ default: m.ShowcaseJamboreeEngine })));
const CheerScoredEngine = lazy(() => import('./Engines/CheerScoredEngine').then(m => ({ default: m.CheerScoredEngine })));
const WrestlingMatEngine = lazy(() => import('./Engines/WrestlingMatEngine').then(m => ({ default: m.WrestlingMatEngine })));
const ScoreDeskAdapter = lazy(() => import('./ScoreDeskAdapter').then(m => ({ default: m.ScoreDeskAdapter })));

const EngineShimmerFallback: React.FC = () => (
  <div className="w-full space-y-4 p-4 sm:p-6 rounded-3xl bg-[#263238]/60 border border-[#24324F]/50 animate-pulse">
    <div className="flex items-center justify-between">
      <Skeleton variant="text" className="w-48 h-6" />
      <Skeleton variant="rect" className="w-24 h-8 rounded-xl" />
    </div>
    <Skeleton variant="rect" className="w-full h-64 rounded-2xl" />
  </div>
);

export const TournamentCenterView: React.FC = () => {
  const { tournamentId } = useParams<{ tournamentId?: string }>();
  const location = useLocation();
  const locationState = location.state as { 
    tournamentId?: string; 
    tournamentTitle?: string; 
    sport?: SportType; 
    divisions?: any[] 
  } | null;

  const [activeTournamentTitle, setActiveTournamentTitle] = useState<string | null>(() => {
    if (locationState?.tournamentTitle) return locationState.tournamentTitle;
    if (tournamentId?.includes('gvoc') || tournamentId?.includes('flag')) return 'GVOC Flag Football League';
    if (tournamentId) return `Tournament #${tournamentId}`;
    return null;
  });

  const [selectedSport, setSelectedSport] = useState<SportType>(() => {
    if (locationState?.sport) return locationState.sport;
    if (tournamentId?.includes('flag') || tournamentId?.includes('gvoc')) return 'flag_football';
    return 'flag_football';
  });

  const [selectedDivision, setSelectedDivision] = useState<string>('14U Girls Premier Gold');
  const [isDirectorHubOpen, setIsDirectorHubOpen] = useState(false);

  useEffect(() => {
    if (locationState?.tournamentTitle) {
      setActiveTournamentTitle(locationState.tournamentTitle);
    } else if (tournamentId?.includes('gvoc') || tournamentId?.includes('flag')) {
      setActiveTournamentTitle('GVOC Flag Football League');
    } else if (tournamentId) {
      setActiveTournamentTitle(`Tournament #${tournamentId}`);
    }

    if (locationState?.sport) {
      setSelectedSport(locationState.sport);
    }
  }, [tournamentId, locationState]);
  const [isBulkImporterOpen, setIsBulkImporterOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [isRosterPrintOpen, setIsRosterPrintOpen] = useState(false);
  const [isReelStudioOpen, setIsReelStudioOpen] = useState(false);
  const [isGateScannerOpen, setIsGateScannerOpen] = useState(false);
  const [isSponsorDeskOpen, setIsSponsorDeskOpen] = useState(false);
  const [isGameClockOpen, setIsGameClockOpen] = useState(false);
  const [isWeatherBroadcastOpen, setIsWeatherBroadcastOpen] = useState(false);
  const [isAutoSeedingOpen, setIsAutoSeedingOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'engine' | 'scoredesk'>('engine');
  
  // Quick test state for ScoreDeskAdapter
  const [mockScoreA, setMockScoreA] = useState(14);
  const [mockScoreB, setMockScoreB] = useState(7);
  const [isClockRunning, setIsClockRunning] = useState(false);

  const getModeForSport = (sport: SportType): TournamentMode => {
    switch (sport) {
      case 'football':
        return 'showcase_jamboree';
      case 'cheer':
        return 'performance_scored';
      case 'wrestling':
      case 'track_field':
        return 'mat_or_flight';
      case 'flag_football':
      case 'basketball':
      case 'soccer':
      case 'lacrosse':
      case 'field_hockey':
      default:
        return 'pool_to_bracket';
    }
  };

  const currentMode = getModeForSport(selectedSport);

  const sportsList: { id: SportType; label: string; icon: string; mode: string }[] = [
    { id: 'flag_football', label: 'Flag Football', icon: '🏈', mode: 'Pool to Bracket' },
    { id: 'football', label: 'Tackle Football', icon: '⚡', mode: 'Showcase Jamboree' },
    { id: 'cheer', label: 'Cheer & Stunt', icon: '📣', mode: 'Performance Scored' },
    { id: 'wrestling', label: 'Wrestling', icon: '🤼', mode: 'Mat & Bout Engine' },
    { id: 'basketball', label: 'Basketball', icon: '🏀', mode: 'Double Elimination' },
    { id: 'soccer', label: 'Soccer', icon: '⚽', mode: 'FIFA Points Table' },
    { id: 'lacrosse', label: 'Lacrosse', icon: '🥍', mode: 'Cross-Division Pool' },
    { id: 'track_field', label: 'Track & Field', icon: '🏃', mode: 'Laser Timed Heats' },
  ];

  const divisionsList = [
    '14U Girls Premier Gold',
    '12U Boys Club Elite',
    'Varsity Championship',
    '10U Open Division',
    'Adult Co-Ed Premier'
  ];

  // List of all Director Hub Tools for the categorized drawer
  const directorOpsCategories = [
    {
      title: 'Field & Gameday Ops',
      description: 'Live field control, referee timing, match calls & alerts',
      tools: [
        {
          id: 'referee-clock',
          name: 'Referee Clock Pad',
          desc: 'Live field timer & score sync',
          icon: <Radio className="w-5 h-5 text-[#00F2FE] animate-pulse" />,
          badge: 'Live',
          badgeColor: 'bg-[#00F2FE]/20 text-[#00F2FE]',
          action: () => setIsGameClockOpen(true)
        },
        {
          id: 'match-call',
          name: 'Match Call Desk',
          desc: 'Court dispatch & next-up calls',
          icon: <Megaphone className="w-5 h-5 text-amber-400" />,
          badge: 'Audio / PA',
          badgeColor: 'bg-amber-500/20 text-amber-300',
          action: () => setIsDispatchModalOpen(true)
        },
        {
          id: 'weather-broadcast',
          name: 'Weather / Delay Alerts',
          desc: 'Push emergency delay updates',
          icon: <CloudRain className="w-5 h-5 text-amber-300" />,
          badge: 'Broadcast',
          badgeColor: 'bg-amber-500/20 text-amber-300',
          action: () => setIsWeatherBroadcastOpen(true)
        },
        {
          id: 'gate-scanner',
          name: 'Gate Pass QR Scanner',
          desc: 'Digital badge & VIP validation',
          icon: <QrCode className="w-5 h-5 text-[#00F2FE]" />,
          badge: 'Access',
          badgeColor: 'bg-cyan-500/20 text-cyan-300',
          action: () => setIsGateScannerOpen(true)
        }
      ]
    },
    {
      title: 'Tournament Engine & Seeding',
      description: 'Automated bracket logic, tiebreakers & bulk team setup',
      tools: [
        {
          id: 'auto-seeding',
          name: 'Auto-Seeding Engine',
          desc: 'Calculate pool tiebreakers & seeds',
          icon: <Trophy className="w-5 h-5 text-[#39FF14]" />,
          badge: 'Auto-Rank',
          badgeColor: 'bg-[#39FF14]/20 text-[#39FF14]',
          action: () => setIsAutoSeedingOpen(true)
        },
        {
          id: 'bulk-importer',
          name: 'Universal Bulk Importer',
          desc: 'CSV / Excel team schedules & rosters',
          icon: <Upload className="w-5 h-5 text-[#00B8D4]" />,
          badge: 'CSV / XLSX',
          badgeColor: 'bg-[#00B8D4]/20 text-[#00B8D4]',
          action: () => setIsBulkImporterOpen(true)
        },
        {
          id: 'guide-walkthrough',
          name: 'Director Guide & Rules FAQ',
          desc: 'Tournament rulebooks & engine docs',
          icon: <BookOpen className="w-5 h-5 text-[#00E5FF]" />,
          badge: 'Guide',
          badgeColor: 'bg-[#00E5FF]/20 text-[#00E5FF]',
          action: () => setIsGuideModalOpen(true)
        }
      ]
    },
    {
      title: 'Print, Media & Commercial',
      description: 'Physical bracket sheets, highlight reels & sponsor ads',
      tools: [
        {
          id: 'print-brackets',
          name: 'Print Brackets & Sheets',
          desc: 'Scorecards & wall bracket exports',
          icon: <Printer className="w-5 h-5 text-[#00F2FE]" />,
          badge: 'PDF',
          badgeColor: 'bg-[#00F2FE]/20 text-[#00F2FE]',
          action: () => setIsPrintModalOpen(true)
        },
        {
          id: 'roster-sheets',
          name: 'Team Roster Check-In',
          desc: 'Gameday sign-in & official rosters',
          icon: <ClipboardCheck className="w-5 h-5 text-emerald-400" />,
          badge: 'Check-In',
          badgeColor: 'bg-emerald-500/20 text-emerald-300',
          action: () => setIsRosterPrintOpen(true)
        },
        {
          id: 'reel-studio',
          name: 'Locker Room Reel Studio',
          desc: 'Clip plays & broadcast highlights',
          icon: <Video className="w-5 h-5 text-cyan-300" />,
          badge: 'Media',
          badgeColor: 'bg-cyan-500/20 text-cyan-300',
          action: () => setIsReelStudioOpen(true)
        },
        {
          id: 'sponsor-desk',
          name: 'Sponsor Campaign Desk',
          desc: 'Gameday ad placements & banners',
          icon: <Target className="w-5 h-5 text-[#E5B868]" />,
          badge: 'Ads',
          badgeColor: 'bg-[#E5B868]/20 text-[#E5B868]',
          action: () => setIsSponsorDeskOpen(true)
        }
      ]
    }
  ];

  return (
    <div className="space-y-4 sm:space-y-6 pb-16 px-2 sm:px-4 max-w-7xl mx-auto">
      {/* 1. Universal Live Ticker */}
      <LiveScoresTicker />

      {/* 2. Top Header & Control Center Dashboard */}
      <div className="p-4 sm:p-6 md:p-8 rounded-3xl bg-[#090D16] border border-[#24324F] shadow-2xl relative overflow-hidden space-y-6">
        
        {/* Header Title Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-[#00B8D4]/20 border border-[#00B8D4]/50 text-[#00B8D4] text-[10px] font-black tracking-wider uppercase font-mono">
                ENGINE V2.8 ACTIVE
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#FF6A00]/20 text-[#FF6A00] text-[10px] font-black uppercase font-mono">
                MULTI-SPORT CERTIFIED
              </span>
              {activeTournamentTitle && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-[10px] font-black uppercase font-mono flex items-center gap-1.5 shadow-sm">
                  <Trophy className="w-3 h-3 text-emerald-400" />
                  <span>{activeTournamentTitle}</span>
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-[#00B8D4] shrink-0" />
              <span>Multi-Sport Tournament Control Center</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Universal rule engines powering single/double elimination brackets, jamborees, cheer routines, and wrestling duals.
            </p>
          </div>

          {/* Quick Primary Actions + Director Hub Launcher */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:flex sm:items-center">
            {/* Primary Action 1: Director Ops Hub Drawer Trigger */}
            <button
              onClick={() => setIsDirectorHubOpen(true)}
              className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#00B8D4]/25 via-[#00F2FE]/20 to-[#39FF14]/20 hover:from-[#00B8D4]/35 hover:to-[#39FF14]/30 border border-[#00B8D4]/60 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(0,184,212,0.3)] active:scale-95"
            >
              <LayoutGrid className="w-4 h-4 text-[#00B8D4]" />
              <span>Director Tools (11)</span>
              <span className="w-2 h-2 rounded-full bg-[#39FF14] animate-ping ml-0.5" />
            </button>

            {/* Primary Action 2: Guide & FAQ */}
            <button
              onClick={() => setIsGuideModalOpen(true)}
              className="min-h-[48px] px-3.5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <BookOpen className="w-4 h-4 text-[#00E5FF]" />
              <span className="inline">Rulebook & FAQ</span>
            </button>

            {/* Primary Action 3: Auto-Seed */}
            <button
              onClick={() => setIsAutoSeedingOpen(true)}
              className="min-h-[48px] px-3.5 py-2.5 rounded-2xl bg-[#39FF14]/15 hover:bg-[#39FF14]/25 border border-[#39FF14]/40 text-[#39FF14] text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Trophy className="w-4 h-4 text-[#39FF14]" />
              <span className="inline">Auto-Seeding</span>
            </button>
          </div>
        </div>

        {/* Live Tournament Status Pulse Cards (Responsive CSS Grid: 1 col on mobile -> 2 col on tablet -> 4 col on desktop) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-2">
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#263238]/60 border border-[#24324F] flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">Active Sport</span>
              <div className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
                <span>{sportsList.find(s => s.id === selectedSport)?.icon}</span>
                <span>{sportsList.find(s => s.id === selectedSport)?.label}</span>
              </div>
            </div>
            <span className="px-2 py-1 rounded-lg bg-[#00B8D4]/15 text-[#00B8D4] text-[10px] font-mono font-bold uppercase">
              {currentMode.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#263238]/60 border border-[#24324F] flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">Division</span>
              <div className="text-sm sm:text-base font-black text-white truncate max-w-[130px] sm:max-w-none">
                {selectedDivision}
              </div>
            </div>
            <span className="px-2 py-1 rounded-lg bg-[#FF6A00]/15 text-[#FF6A00] text-[10px] font-mono font-bold uppercase">
              8 Teams
            </span>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#263238]/60 border border-[#24324F] flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">Court / Field Radar</span>
              <div className="text-sm sm:text-base font-black text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>6 Fields Live</span>
              </div>
            </div>
            <button 
              onClick={() => setIsGameClockOpen(true)}
              className="min-h-[36px] px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold cursor-pointer transition-colors"
            >
              Dispatch
            </button>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#263238]/60 border border-[#24324F] flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">Weather Broadcast</span>
              <div className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                <span>Clear • On Schedule</span>
              </div>
            </div>
            <button 
              onClick={() => setIsWeatherBroadcastOpen(true)}
              className="min-h-[36px] px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[10px] font-bold cursor-pointer transition-colors"
            >
              Broadcast
            </button>
          </div>
        </div>

        {/* 3. Sport & Division Selector (Clean Horizontal Scroll on Mobile) */}
        <div className="space-y-2.5 pt-2 border-t border-[#24324F]/60">
          <div className="flex items-center justify-between gap-2">
            <label className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
              <span>SELECT DISCIPLINE ENGINE:</span>
            </label>
            
            {/* Division Selector Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 font-mono uppercase hidden sm:inline">Division:</span>
              <select
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="bg-[#263238] border border-[#24324F] text-white text-xs font-bold rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-[#00B8D4] cursor-pointer"
              >
                {divisionsList.map((div) => (
                  <option key={div} value={div}>{div}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Compact Sports Capsule Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth">
            {sportsList.map((s) => {
              const isSelected = selectedSport === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedSport(s.id)}
                  className={`min-h-[44px] px-3.5 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 border cursor-pointer ${
                    isSelected
                      ? 'bg-[#263238] border-[#00B8D4] text-white shadow-[0_0_15px_rgba(0,184,212,0.35)] scale-[1.02]'
                      : 'bg-[#090D16] border-[#24324F] text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <span className="text-base">{s.icon}</span>
                  <span className="whitespace-nowrap">{s.label}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                    isSelected ? 'bg-[#00B8D4]/20 text-[#00B8D4]' : 'bg-black/40 text-slate-400'
                  }`}>
                    {s.mode.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Sub-View Segmented Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-[#24324F] pb-3 gap-2 flex-wrap">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('engine')}
              className={`flex-1 sm:flex-initial min-h-[44px] px-4 sm:px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'engine'
                  ? 'bg-[#263238] text-[#00B8D4] border border-[#00B8D4] shadow-md'
                  : 'text-slate-400 hover:text-white bg-slate-900/40 border border-transparent'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Bracket & Standings</span>
            </button>

            <button
              onClick={() => setActiveTab('scoredesk')}
              className={`flex-1 sm:flex-initial min-h-[44px] px-4 sm:px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'scoredesk'
                  ? 'bg-[#263238] text-[#FF6A00] border border-[#FF6A00] shadow-md'
                  : 'text-slate-400 hover:text-white bg-slate-900/40 border border-transparent'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Score Desk Adapter</span>
            </button>
          </div>

          <button
            onClick={() => setIsDirectorHubOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-[#00B8D4] transition-colors cursor-pointer font-bold"
          >
            <span>Director Operations Menu</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 5. ACTIVE SPORT ENGINE SUB-VIEW */}
        {activeTab === 'engine' && (
          <div className="animate-fadeIn">
            <Suspense fallback={<EngineShimmerFallback />}>
              {/* 1. Pool to Bracket (Soccer, Lacrosse, Hoops, Field Hockey, Flag Football) */}
              {currentMode === 'pool_to_bracket' && (
                <PoolBracketEngine division={selectedDivision} />
              )}

              {/* 2. Showcase Jamboree (Football / Friendlies) */}
              {currentMode === 'showcase_jamboree' && (
                <ShowcaseJamboreeEngine />
              )}

              {/* 3. Performance Scored (Cheerleading, Dance, Gymnastics) */}
              {currentMode === 'performance_scored' && (
                <CheerScoredEngine />
              )}

              {/* 4. Mat or Flight (Wrestling, Martial Arts, Track & Field) */}
              {currentMode === 'mat_or_flight' && (
                <WrestlingMatEngine />
              )}
            </Suspense>
          </div>
        )}

        {/* 6. SCORE DESK CONTROLLER TAB */}
        {activeTab === 'scoredesk' && (
          <div className="animate-fadeIn space-y-4">
            <Suspense fallback={<EngineShimmerFallback />}>
              <ScoreDeskAdapter
                sport={selectedSport}
                teamAName={selectedSport === 'cheer' ? 'Cheer Athletics Cheetahs' : selectedSport === 'wrestling' ? 'Marcus Vance (Blair)' : 'SoCal Elite Vipers'}
                teamBName={selectedSport === 'cheer' ? undefined : selectedSport === 'wrestling' ? 'Liam Davies (Wyoming)' : 'Pacific Coast Storm'}
                scoreA={mockScoreA}
                scoreB={mockScoreB}
                onUpdateScoreA={(score) => setMockScoreA(score)}
                onUpdateScoreB={(score) => setMockScoreB(score)}
                isClockRunning={isClockRunning}
                onClockToggle={() => setIsClockRunning(!isClockRunning)}
              />
            </Suspense>
          </div>
        )}

      </div>

      {/* 7. Categorized Director Operations Hub Drawer / Modal */}
      {isDirectorHubOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-[#090D16] border border-[#24324F] rounded-3xl shadow-2xl overflow-y-auto no-scrollbar p-5 sm:p-6 space-y-6 my-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#24324F]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#00B8D4]/20 border border-[#00B8D4]/40 text-[#00B8D4]">
                  <LayoutGrid className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                    <span>Tournament Director Operations Hub</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Comprehensive gameday tools, referee dispatch, bulk schedules, printouts & media.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsDirectorHubOpen(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Categorized Grid */}
            <div className="space-y-6">
              {directorOpsCategories.map((cat) => (
                <div key={cat.title} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#00B8D4] font-mono">
                      {cat.title}
                    </h3>
                    <span className="text-[11px] text-slate-400">{cat.description}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {cat.tools.map((tool) => (
                      <button
                        key={tool.id}
                        onClick={() => {
                          setIsDirectorHubOpen(false);
                          tool.action();
                        }}
                        className="p-3.5 rounded-2xl bg-[#263238]/60 hover:bg-[#263238] border border-[#24324F] hover:border-[#00B8D4]/60 transition-all text-left group flex items-start gap-3 cursor-pointer"
                      >
                        <div className="p-2 rounded-xl bg-[#090D16] border border-[#24324F] shrink-0 group-hover:scale-105 transition-transform">
                          {tool.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="text-xs font-black text-white group-hover:text-[#00B8D4] transition-colors truncate">
                              {tool.name}
                            </span>
                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 ${tool.badgeColor}`}>
                              {tool.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">
                            {tool.desc}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Close */}
            <div className="pt-4 border-t border-[#24324F] flex justify-end">
              <button
                onClick={() => setIsDirectorHubOpen(false)}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Close Hub
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Importer Modal Dialog with Suspense */}
      {isBulkImporterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto no-scrollbar my-8">
            <Suspense fallback={<EngineShimmerFallback />}>
              <UniversalBulkImporter
                tournamentId="tourn-master-2026"
                onClose={() => setIsBulkImporterOpen(false)}
                onImportComplete={(items) => {
                  console.log('Imported items successfully:', items.length);
                  setTimeout(() => setIsBulkImporterOpen(false), 2000);
                }}
              />
            </Suspense>
          </div>
        </div>
      )}

      {/* Printable Bracket Modal */}
      <PrintableBracketModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        sport={sportsList.find(s => s.id === selectedSport)?.label || 'Flag Football'}
      />

      {/* Match Call Dispatch Desk Modal */}
      <MatchCallDispatchModal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
      />

      {/* Game-Day Roster Check-In & Print Sheet Modal */}
      <GameDayRosterPrintModal
        isOpen={isRosterPrintOpen}
        onClose={() => setIsRosterPrintOpen(false)}
        teamName="SoCal Elite Vipers"
        division={selectedDivision}
      />

      {/* Locker Room Reel & Highlight Clipper Modal */}
      <LockerRoomReelStudioModal
        isOpen={isReelStudioOpen}
        onClose={() => setIsReelStudioOpen(false)}
        gameTitle="National Semifinal • SoCal Elite vs Philly Pride"
      />

      {/* Gate Pass & Digital ID Scanner Modal */}
      <GatePassScannerModal
        isOpen={isGateScannerOpen}
        onClose={() => setIsGateScannerOpen(false)}
      />

      {/* Sponsor Campaign & Ad Management Desk */}
      <SponsorCampaignDeskModal
        isOpen={isSponsorDeskOpen}
        onClose={() => setIsSponsorDeskOpen(false)}
      />

      {/* Live Game Clock & Referee Field Dispatch Controller */}
      <GameClockRefereeDispatchModal
        isOpen={isGameClockOpen}
        onClose={() => setIsGameClockOpen(false)}
      />

      {/* Emergency Weather & Schedule Delay Push Notification Broadcast */}
      <WeatherScheduleBroadcastModal
        isOpen={isWeatherBroadcastOpen}
        onClose={() => setIsWeatherBroadcastOpen(false)}
      />

      {/* Automated Pool Standings & Bracket Seeding Engine */}
      <AutoSeedingEngineModal
        isOpen={isAutoSeedingOpen}
        onClose={() => setIsAutoSeedingOpen(false)}
      />

      {/* Tournament, Division & Team Walkthrough Guide & FAQ Modal */}
      <TournamentGuideWalkthroughModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        onOpenBulkImporter={() => {
          setIsGuideModalOpen(false);
          setIsBulkImporterOpen(true);
        }}
      />
    </div>
  );
};

export default TournamentCenterView;
