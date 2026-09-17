import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Film, 
  LayoutGrid, 
  Sparkles, 
  Play, 
  Sliders, 
  Layers, 
  Search, 
  Tag, 
  Zap, 
  Target, 
  Award, 
  Activity, 
  Maximize2, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Share2, 
  ChevronRight, 
  Filter, 
  CheckCircle2, 
  Clock, 
  Eye, 
  Flame, 
  Cpu, 
  Compass, 
  Crosshair,
  TrendingUp,
  Bookmark,
  Radio
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PlaybookLab } from '../../PlaybookLab';
import { CheerMatrix } from '../../Cheer/CheerMatrix';
import { useAuth } from '../../../context/AuthContext';

interface FilmClip {
  id: string;
  title: string;
  game: string;
  sport: string;
  duration: string;
  athlete: string;
  jersey: string;
  position: string;
  tags: string[];
  aiAnalysis: {
    playType: string;
    efficiencyRating: number;
    speedMph: number;
    breakdownNote: string;
  };
  thumbnail: string;
  videoUrl: string;
  views: number;
}

const SAMPLE_CLIPS: FilmClip[] = [
  {
    id: 'film-1',
    title: 'Post-Corner Route Separation & Over-the-Shoulder Catch',
    game: '7v7 Championship: Miami vs Orlando',
    sport: 'Football',
    duration: '0:14',
    athlete: 'Kevon Bailey',
    jersey: '#7',
    position: 'WR / CB',
    tags: ['Post-Corner', 'Red Zone', 'AI Verified', 'Speed: 21.4mph'],
    aiAnalysis: {
      playType: 'Pass / Boundary ISO',
      efficiencyRating: 98,
      speedMph: 21.4,
      breakdownNote: 'Decisive 3-step plant at 12yd break depth. Created 2.8 yards of separation vs press-man coverage.'
    },
    thumbnail: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-american-football-game-under-stadium-lights-42589-large.mp4',
    views: 1420
  },
  {
    id: 'film-2',
    title: 'Zone-Read Keep with Turbo Burst Cutback',
    game: 'Varsity Showcase: Texas Elite',
    sport: 'Football',
    duration: '0:18',
    athlete: 'Marcus Vance',
    jersey: '#1',
    position: 'QB / Dual',
    tags: ['Zone Read', 'Option', '40yd Burst', '20.8mph'],
    aiAnalysis: {
      playType: 'Option Run / Edge Seal',
      efficiencyRating: 94,
      speedMph: 20.8,
      breakdownNote: 'Edge defender committed to mesh back; QB accelerated 0-to-15mph in 1.4s with textbook perimeter tuck.'
    },
    thumbnail: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-hands-of-an-american-football-quarterback-throwing-the-ball-42595-large.mp4',
    views: 980
  },
  {
    id: 'film-3',
    title: 'Step-Back 3-Pointer in Transition off Ball Screen',
    game: 'AAU Super 16: Atlanta Classic',
    sport: 'Basketball',
    duration: '0:12',
    athlete: 'Jordan Hayes',
    jersey: '#3',
    position: 'PG',
    tags: ['Step-Back', 'Transition', 'Clutch Q4', 'ARC: 52°'],
    aiAnalysis: {
      playType: 'High PnR / Pull-Up 3',
      efficiencyRating: 96,
      speedMph: 16.2,
      breakdownNote: 'Leveraged drop defender spacing with 1.1s release velocity and optimal 52-degree shot trajectory.'
    },
    thumbnail: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-basketball-player-scoring-a-basket-in-a-game-42578-large.mp4',
    views: 2150
  },
  {
    id: 'film-4',
    title: 'Standing Full & Double-Up Stunt Release',
    game: 'CheerMatrix National Trials',
    sport: 'Cheerleading',
    duration: '0:16',
    athlete: 'Maya Rodriguez',
    jersey: '#12',
    position: 'Flyer / Tumbler',
    tags: ['Standing Full', 'Level 6', 'Perfect Catch', '99% Execution'],
    aiAnalysis: {
      playType: 'Elite Basket / Specialty Stunt',
      efficiencyRating: 99,
      speedMph: 14.5,
      breakdownNote: 'Maximum aerial rotation stability at 9.2ft apex height with locked body line through cradle completion.'
    },
    thumbnail: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-gymnast-performing-a-floor-routine-42584-large.mp4',
    views: 3100
  }
];

export const MatrixHubView: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeMatrixMode, setActiveMatrixMode] = useState<'film' | 'playbook' | 'hud' | 'cheer' | 'radar'>('film');
  const [selectedSport, setSelectedSport] = useState<string>('All');
  const [selectedClip, setSelectedClip] = useState<FilmClip>(SAMPLE_CLIPS[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [activeTagFilter, setActiveTagFilter] = useState<string>('All');
  const [isMuted, setIsMuted] = useState<boolean>(true);

  const sports = ['All', 'Football', 'Basketball', 'Cheerleading', 'Soccer', 'Lacrosse'];

  const filteredClips = SAMPLE_CLIPS.filter((clip) => {
    if (selectedSport !== 'All' && clip.sport !== selectedSport) return false;
    if (activeTagFilter !== 'All' && !clip.tags.some(t => t.toLowerCase().includes(activeTagFilter.toLowerCase()))) return false;
    return true;
  });

  return (
    <div className="w-full space-y-6 pb-24 text-white">
      
      {/* Cyber Matrix Hero Header */}
      <div className="relative rounded-3xl bg-[#0A0C12]/90 border border-white/10 p-5 sm:p-7 backdrop-blur-2xl overflow-hidden shadow-[0_15px_40px_rgba(0,0,0,0.6)]">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-[#06B6D4]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-[#22C55E]/15 rounded-full blur-3xl pointer-events-none" />
        
        {/* Subtle HUD Grid Overlay */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#06B6D4_1px,transparent_1px),linear-gradient(to_bottom,#06B6D4_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#06B6D4]/15 border border-[#06B6D4]/40 text-[#06B6D4] text-xs font-mono font-bold uppercase tracking-wider">
              <Cpu className="w-3.5 h-3.5 animate-pulse" />
              <span>AI Tactical Analysis & Film Matrix</span>
            </div>
            
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>TACTICAL MATRIX</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#06B6D4] via-[#22C55E] to-[#FFC857]">
                LAB
              </span>
            </h1>
            
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-xl">
              AI-assisted game film breakdown, play tagging, animated route tree diagramming, and verified multi-sport talent radars.
            </p>
          </div>

          {/* Matrix Sub-Mode Selector */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 bg-[#090D16] p-1.5 rounded-2xl border border-white/10 w-full sm:w-auto">
            {[
              { id: 'film', label: 'Film Matrix', icon: Film, accent: 'text-[#06B6D4]' },
              { id: 'playbook', label: 'Playbook Lab', icon: Layers, accent: 'text-[#22C55E]' },
              { id: 'hud', label: 'Signal HUD', icon: Radio, accent: 'text-[#00F0D0]' },
              { id: 'cheer', label: 'CheerMatrix™', icon: Sparkles, accent: 'text-[#FFC857]' },
              { id: 'radar', label: 'Talent Radar', icon: Crosshair, accent: 'text-[#06B6D4]' }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeMatrixMode === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveMatrixMode(tab.id as any)}
                  className={`flex items-center justify-center sm:justify-start gap-2 px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-white/15 text-white shadow-lg border border-white/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? tab.accent : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* MATRIX VIEW SWITCHER */}
      <AnimatePresence mode="wait">
        
        {/* 1. FILM BREAKDOWN & PLAY TAGGING MATRIX */}
        {activeMatrixMode === 'film' && (
          <motion.div
            key="film-matrix"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Top Interactive Tactical Film Viewer */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Left 7 Cols: Video HUD Canvas */}
              <div className="lg:col-span-8 bg-[#0A0C12] rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col">
                
                {/* HUD Stream Window */}
                <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden group">
                  <video
                    src={selectedClip.videoUrl}
                    poster={selectedClip.thumbnail}
                    className="w-full h-full object-cover"
                    loop
                    muted={isMuted}
                    playsInline
                    autoPlay
                  />

                  {/* HUD Overlay Crosshairs & Telemetry */}
                  <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 bg-[#090D16]/80 backdrop-blur-md px-3 py-1 rounded-full border border-[#06B6D4]/40 text-[#06B6D4] text-[10px] font-mono font-bold">
                        <span className="w-2 h-2 rounded-full bg-[#06B6D4] animate-ping" />
                        <span>AI FRAME SCAN // 60 FPS</span>
                      </div>
                      
                      <div className="bg-[#090D16]/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/15 text-white text-[10px] font-mono font-bold">
                        <span>{selectedClip.sport.toUpperCase()} // {selectedClip.jersey}</span>
                      </div>
                    </div>

                    <div className="flex items-end justify-between">
                      <div className="bg-[#090D16]/85 backdrop-blur-md p-2.5 rounded-xl border border-white/10 max-w-sm">
                        <p className="text-[10px] font-mono text-[#22C55E] uppercase font-bold flex items-center gap-1">
                          <Activity className="w-3 h-3" /> Telemetry Speed: {selectedClip.aiAnalysis.speedMph} MPH
                        </p>
                        <p className="text-xs font-bold text-white line-clamp-1">{selectedClip.title}</p>
                      </div>

                      <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="p-2 rounded-full bg-[#090D16]/80 border border-white/20 text-white hover:text-[#06B6D4] pointer-events-auto cursor-pointer"
                        aria-label="Toggle Mute"
                      >
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Video Playback Controls & Frame Stepper */}
                <div className="p-3 sm:p-4 bg-[#0F121C] border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex items-center justify-between sm:justify-start gap-2">
                    <button
                      onClick={() => setPlaybackSpeed(playbackSpeed === 1 ? 0.5 : playbackSpeed === 0.5 ? 2 : 1)}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono font-bold text-[#06B6D4] cursor-pointer shrink-0"
                    >
                      {playbackSpeed}x SPEED
                    </button>
                    
                    <span className="text-xs font-mono text-slate-400 truncate">
                      {selectedClip.game}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:flex items-center gap-2">
                    <button
                      onClick={() => navigate('/gallery')}
                      className="w-full sm:w-auto justify-center px-3 py-1.5 rounded-xl bg-[#06B6D4]/15 hover:bg-[#06B6D4]/25 border border-[#06B6D4]/40 text-[#06B6D4] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Film className="w-3.5 h-3.5" />
                      <span>Full 4K Vault</span>
                    </button>

                    <button
                      onClick={() => navigate('/playbook')}
                      className="w-full sm:w-auto justify-center px-3 py-1.5 rounded-xl bg-[#22C55E]/15 hover:bg-[#22C55E]/25 border border-[#22C55E]/40 text-[#22C55E] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Diagram in Lab</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right 4 Cols: AI Tactical Play Breakdown Panel */}
              <div className="lg:col-span-4 bg-[#0A0C12] rounded-3xl border border-white/10 p-5 shadow-2xl flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono font-black text-[#06B6D4] uppercase tracking-wider">
                      Play Breakdown Matrix
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/40 text-[#22C55E] text-[10px] font-bold font-mono">
                      {selectedClip.aiAnalysis.efficiencyRating}% EFFICIENCY
                    </span>
                  </div>

                  <h2 className="text-lg font-black text-white">{selectedClip.athlete}</h2>
                  <p className="text-xs text-slate-400 font-mono mb-4">{selectedClip.position} • {selectedClip.jersey}</p>

                  <div className="space-y-3">
                    <div className="p-3 rounded-2xl bg-[#090D16] border border-white/10">
                      <p className="text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">Scheme / Formation</p>
                      <p className="text-xs font-bold text-[#FFC857]">{selectedClip.aiAnalysis.playType}</p>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#090D16] border border-white/10">
                      <p className="text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">AI Scout Assessment</p>
                      <p className="text-xs text-slate-200 leading-relaxed">{selectedClip.aiAnalysis.breakdownNote}</p>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#090D16] border border-white/10">
                      <p className="text-[10px] font-mono text-slate-400 uppercase font-bold mb-2">Verified Tactical Tags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedClip.tags.map((tag, idx) => (
                          <span 
                            key={idx}
                            className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-mono text-slate-300 font-bold"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/athletes')}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#06B6D4] to-[#22C55E] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#06B6D4]/20 hover:brightness-110 cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span>Search Recruiting Matrix</span>
                </button>
              </div>
            </div>

            {/* Filter Bar & Film Reel Grid */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
                  <span className="text-xs font-mono text-slate-400 uppercase font-bold flex items-center gap-1 shrink-0">
                    <Filter className="w-3.5 h-3.5 text-[#06B6D4]" /> Sport:
                  </span>
                  {sports.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSport(s)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
                        selectedSport === s
                          ? 'bg-[#06B6D4] text-black font-black shadow-md'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <div className="text-xs font-mono text-slate-400">
                  Showing {filteredClips.length} Verified Play Breaks
                </div>
              </div>

              {/* Grid of Film Clips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredClips.map((clip) => {
                  const isSelected = selectedClip.id === clip.id;
                  return (
                    <div
                      key={clip.id}
                      onClick={() => setSelectedClip(clip)}
                      className={`group rounded-2xl bg-[#0A0C12] border transition-all overflow-hidden cursor-pointer flex flex-col justify-between ${
                        isSelected 
                          ? 'border-[#06B6D4] ring-2 ring-[#06B6D4]/30 shadow-[0_0_25px_rgba(6,182,212,0.25)]' 
                          : 'border-white/10 hover:border-white/20 hover:bg-[#0F121C]'
                      }`}
                    >
                      <div className="relative aspect-video overflow-hidden bg-black">
                        <img 
                          src={clip.thumbnail} 
                          alt={clip.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        
                        <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white font-bold">
                          {clip.duration}
                        </span>

                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[#06B6D4]/90 text-black text-[9px] font-mono font-black uppercase">
                          {clip.sport}
                        </span>
                      </div>

                      <div className="p-3.5 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                          <span className="font-bold text-white">{clip.athlete}</span>
                          <span className="text-[#22C55E]">{clip.aiAnalysis.speedMph} MPH</span>
                        </div>

                        <p className="text-xs font-bold text-slate-200 line-clamp-2 leading-snug group-hover:text-[#06B6D4] transition-colors">
                          {clip.title}
                        </p>

                        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400">
                          <span>{clip.views.toLocaleString()} views</span>
                          <span className="text-[#FFC857]">{clip.aiAnalysis.efficiencyRating}% Match</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* 2. PLAYBOOK LAB & ROUTE TREE ANIMATOR */}
        {activeMatrixMode === 'playbook' && (
          <motion.div
            key="playbook-matrix"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-[#0A0C12] border border-white/10 gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Tactical Route Tree Animator</h3>
                  <p className="text-xs text-slate-400 font-mono">Create, animate, and save formations across Flag Football, Basketball, & Lacrosse</p>
                </div>
              </div>
              <Link
                to="/playbook"
                className="w-full sm:w-auto justify-center px-4 py-2 rounded-xl bg-[#22C55E] text-black font-black text-xs flex items-center gap-1.5 hover:brightness-110 shadow-lg shadow-[#22C55E]/20 shrink-0"
              >
                <span>Open Full Lab</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Embedded Playbook Canvas */}
            <div className="rounded-3xl bg-[#090D16] border border-white/10 p-3 sm:p-5 overflow-hidden">
              <PlaybookLab />
            </div>
          </motion.div>
        )}

        {/* 3. CHEERMATRIX SKILL VERIFIER */}
        {activeMatrixMode === 'cheer' && (
          <motion.div
            key="cheer-matrix"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-[#0A0C12] border border-white/10 gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#FFC857]/15 text-[#FFC857] border border-[#FFC857]/30 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">CheerMatrix™ Skill Verification Radar</h3>
                  <p className="text-xs text-slate-400 font-mono">Stunt, tumbling, and jump rubric verifications for collegiate scouting</p>
                </div>
              </div>
              <Link
                to="/cheer-matrix"
                className="w-full sm:w-auto justify-center px-4 py-2 rounded-xl bg-[#FFC857] text-black font-black text-xs flex items-center gap-1.5 hover:brightness-110 shadow-lg shadow-[#FFC857]/20 shrink-0"
              >
                <span>Full Rubric Page</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="rounded-3xl bg-[#090D16] border border-white/10 p-3 sm:p-5 overflow-hidden">
              <CheerMatrix />
            </div>
          </motion.div>
        )}

        {/* 3. SIGNAL HUB & LIVE WRIST HUD MATRIX */}
        {activeMatrixMode === 'hud' && (
          <motion.div
            key="hud-matrix"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-5"
          >
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#0A121E] to-[#080B11] border border-teal-500/30 text-center space-y-5 relative overflow-hidden shadow-[0_0_30px_rgba(20,184,166,0.15)]">
              <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="w-16 h-16 rounded-2xl bg-teal-500/15 border border-teal-500/40 text-[#00F0D0] flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(0,240,208,0.3)]">
                <Radio className="w-8 h-8 animate-pulse" />
              </div>

              <div className="space-y-2 max-w-xl mx-auto">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/15 border border-teal-500/40 text-[#00F0D0] text-xs font-mono font-bold uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-[#00F0D0] animate-ping" />
                  <span>Real-Time Sideline Telemetry</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Signal Hub & Wrist HUD</h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Real-time wireless play calls, wrist digital signals, timeout counters, and sideline coach-to-player matrix broadcasts.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto pt-2">
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-mono font-bold text-teal-400">STATUS</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <div className="text-sm font-black text-white">READY // SYNCED</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Ultra-low latency mesh</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-mono font-bold text-teal-400">ACTIVE SCHEME</span>
                    <Radio className="w-3.5 h-3.5 text-teal-400" />
                  </div>
                  <div className="text-sm font-black text-white">RED ZONE ISO</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Quick slant / boundary</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-mono font-bold text-teal-400">DEVICES</span>
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="text-sm font-black text-white">SMART WRISTBAND</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">BLE & web broadcast</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3 max-w-md mx-auto">
                <button
                  onClick={() => navigate('/signal-hub')}
                  className="w-full sm:w-auto flex-1 justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-[#00F0D0] to-cyan-500 text-black font-black text-xs hover:brightness-110 shadow-[0_0_20px_rgba(0,240,208,0.4)] cursor-pointer flex items-center gap-2 uppercase tracking-wider"
                >
                  <Radio className="w-4 h-4" />
                  <span>Launch Live Signal HUD</span>
                </button>

                <button
                  onClick={() => navigate('/playbook')}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white/10 text-white font-bold text-xs hover:bg-white/15 border border-white/10 cursor-pointer flex items-center gap-2"
                >
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>Open Playbook</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* 4. TALENT RADAR MATRIX */}
        {activeMatrixMode === 'radar' && (
          <motion.div
            key="radar-matrix"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="p-5 sm:p-6 rounded-3xl bg-[#0A0C12] border border-white/10 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#06B6D4]/15 border border-[#06B6D4]/40 text-[#06B6D4] flex items-center justify-center mx-auto">
                <Crosshair className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black text-white">Recruiter Scouting Matrix & Combine Radar</h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto">
                Explore thousands of verified student-athletes filtered by 40-yard dash times, vertical leap, GPA, graduation year, and film reels.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 w-full sm:w-auto max-w-sm sm:max-w-none mx-auto">
                <button
                  onClick={() => navigate('/athletes')}
                  className="w-full sm:w-auto justify-center px-5 py-2.5 rounded-xl bg-[#06B6D4] text-black font-black text-xs hover:brightness-110 shadow-lg shadow-[#06B6D4]/20 cursor-pointer flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  <span>Launch Athlete Matrix</span>
                </button>

                <button
                  onClick={() => navigate('/combine')}
                  className="w-full sm:w-auto justify-center px-5 py-2.5 rounded-xl bg-white/10 text-white font-bold text-xs hover:bg-white/15 border border-white/10 cursor-pointer flex items-center gap-2"
                >
                  <Activity className="w-4 h-4 text-[#22C55E]" />
                  <span>Combine Leaderboard</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
};

export default MatrixHubView;
