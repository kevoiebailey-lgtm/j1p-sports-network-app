import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  Film, 
  Search, 
  Filter, 
  RotateCcw, 
  UserCheck, 
  Sparkles, 
  Flame, 
  Trophy, 
  GraduationCap, 
  ExternalLink, 
  Share2, 
  Plus, 
  Eye, 
  Play, 
  SlidersHorizontal,
  ChevronRight,
  Shield,
  Layers,
  Bookmark,
  BookmarkCheck,
  Maximize2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { UniversalVideoPlayer } from './UniversalVideoPlayer';
import { VideoPlayerModal } from './VideoPlayerModal';
import { subscribeToHighlights, HighlightItem } from '../../services/highlightService';
import { PostHighlightModal } from './PostHighlightModal';
import { useAppStore } from '../../store/useAppStore';
import { triggerHaptic } from '../../lib/haptics';
import { getVideoProviderBadge, getVideoProviderName, getEmbedUrl, isValidVideoUrl } from '../../lib/videoParser';

const SPORTS_LIST = [
  'All Sports',
  'Basketball',
  'Flag Football',
  'American Football',
  'Soccer',
  'Cheerleading',
  'Track & Field',
  'Volleyball',
  'Baseball',
  'Softball',
  'Lacrosse'
];

const SPORT_POSITIONS: Record<string, string[]> = {
  'Basketball': ['Point Guard (PG)', 'Shooting Guard (SG)', 'Combo Guard (CG)', 'Small Forward (SF)', 'Power Forward (PF)', 'Center (C)'],
  'Flag Football': ['Quarterback (QB)', 'Wide Receiver (WR)', 'Running Back (RB)', 'Defensive Back (DB)', 'Cornerback (CB)', 'Safety (S)', 'Linebacker (LB)', 'Pass Rusher / DE', 'Center / Snapper', 'Athlete (ATH)'],
  'American Football': ['Quarterback (QB)', 'Wide Receiver (WR)', 'Running Back (RB)', 'Tight End (TE)', 'Offensive Tackle (OT)', 'Defensive End (DE)', 'Linebacker (LB)', 'Cornerback (CB)', 'Safety (S)', 'Kicker (K)'],
  'Soccer': ['Striker (ST/CF)', 'Winger (LW/RW)', 'Attacking Midfielder (CAM)', 'Central Midfielder (CM)', 'Defensive Midfielder (CDM)', 'Fullback (LB/RB)', 'Center Back (CB)', 'Goalkeeper (GK)'],
  'Cheerleading': ['Flyer', 'Main Base', 'Side Base', 'Backspot', 'Tumbler', 'All-Around Cheerleader'],
  'Track & Field': ['Sprinter (100m/200m/400m)', 'Hurdler', 'Distance Runner', 'Long/Triple Jump', 'High Jump', 'Pole Vault', 'Throws (Shot/Discus/Javelin)'],
  'Volleyball': ['Outside Hitter (OH)', 'Opposite Hitter (OPP)', 'Middle Blocker (MB)', 'Setter (S)', 'Libero (L)', 'Defensive Specialist (DS)'],
  'Baseball': ['Pitcher (RHP/LHP)', 'Catcher (C)', 'First Base (1B)', 'Middle Infield (2B/SS)', 'Third Base (3B)', 'Outfield (LF/CF/RF)', 'Utility (UTL)'],
  'Softball': ['Pitcher (P)', 'Catcher (C)', 'Infield (IF)', 'Outfield (OF)', 'Utility (UTL)'],
  'Lacrosse': ['Attackman (A)', 'Midfielder (M)', 'Face-Off (FOGO)', 'Long-Stick Mid (LSM)', 'Defenseman (D)', 'Goalie (G)']
};

const GRAD_YEARS = ['All Classes', '2025', '2026', '2027', '2028', '2029', '2030', '2031'];

export const WatchFeed: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const { showToast } = useToast();

  // Zustand Store
  const openVideoModal = useAppStore(state => state.openVideoModal);
  const bookmarks = useAppStore(state => state.bookmarks);
  const toggleBookmark = useAppStore(state => state.toggleBookmark);

  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [selectedSport, setSelectedSport] = useState<string>('All Sports');
  const [selectedPosition, setSelectedPosition] = useState<string>('All Positions');
  const [selectedGradYear, setSelectedGradYear] = useState<string>('All Classes');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Athlete Add Highlight Modal state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Subscribe to Highlights in Firestore with real-time updates
  useEffect(() => {
    setLoading(true);

    const unsubscribe = subscribeToHighlights(
      {
        sport: selectedSport === 'All Sports' ? undefined : selectedSport,
        position: selectedPosition === 'All Positions' ? undefined : selectedPosition,
        gradYear: selectedGradYear === 'All Classes' ? undefined : selectedGradYear,
        searchQuery: searchQuery.trim() || undefined,
        limitCount: 60
      },
      (data) => {
        // Strictly filter to ensure only posts with confirmed, valid video URLs are loaded
        const verifiedVideos = (data || []).filter(
          (item) => item && item.videoUrl && isValidVideoUrl(item.videoUrl)
        );
        setHighlights(verifiedVideos);
        setLoading(false);

        // Check if URL specifies a video query param
        const params = new URLSearchParams(location.search);
        const targetVideoId = params.get('video');
        if (targetVideoId) {
          const matched = verifiedVideos.find(h => h.id === targetVideoId || h.videoUrl === targetVideoId);
          if (matched) {
            openVideoModal(matched, verifiedVideos);
          }
        }
      },
      (error) => {
        console.warn('Watch Feed subscription notice:', error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [selectedSport, selectedPosition, selectedGradYear, searchQuery, location.search, openVideoModal]);

  // When sport changes, reset position to "All Positions"
  const handleSportChange = (sport: string) => {
    setSelectedSport(sport);
    setSelectedPosition('All Positions');
  };

  const handleResetFilters = () => {
    setSelectedSport('All Sports');
    setSelectedPosition('All Positions');
    setSelectedGradYear('All Classes');
    setSearchQuery('');
  };

  const currentPositionList = selectedSport !== 'All Sports' && SPORT_POSITIONS[selectedSport]
    ? ['All Positions', ...SPORT_POSITIONS[selectedSport]]
    : ['All Positions'];

  const handleCopyLink = (highlight: HighlightItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const url = `${window.location.origin}/watch?video=${encodeURIComponent(highlight.id || highlight.videoUrl)}`;
    navigator.clipboard.writeText(url);
    showToast('success', 'Link Copied', `Copied link for ${highlight.title}`);
  };

  const handleCardClick = (highlight: HighlightItem) => {
    triggerHaptic('light');
    openVideoModal(highlight, highlights);
  };

  const handleBookmarkToggle = async (highlight: HighlightItem, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('medium');
    const vidId = highlight.id || highlight.videoUrl;
    await toggleBookmark(vidId);
    if (bookmarks.includes(vidId)) {
      showToast('info', 'Bookmark Removed', 'Video removed from your saved clips');
    } else {
      showToast('success', 'Film Bookmarked', 'Highlight saved to your scout board');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-white p-3 sm:p-6 lg:p-8 space-y-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f172a] via-[#131b26] to-[#0B0F17] border border-cyan-500/20 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold tracking-wider uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Just1Play Community Video Vault</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black uppercase text-white tracking-tight">
                Athlete Highlight Reels <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">& Game Film</span>
              </h1>
              <p className="text-sm text-slate-300 font-mono">
                Explore scout-verified reels, Hudl tapes, and game footage from prospective recruits across high school, club, and collegiate divisions.
              </p>
            </div>

            {/* Top CTA */}
            <div className="flex flex-wrap items-center gap-3">
              {user ? (
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(0,229,255,0.3)] active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Post My Highlight</span>
                </button>
              ) : (
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(0,229,255,0.3)] active:scale-95"
                >
                  <Film className="w-4 h-4" />
                  <span>Sign In to Post Film</span>
                </Link>
              )}

              <Link
                to="/athletes"
                className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-mono font-bold transition-colors"
              >
                <span>Scouting Matrix</span>
                <ChevronRight className="w-4 h-4 text-cyan-400" />
              </Link>
            </div>
          </div>
        </div>

        {/* Dynamic Filter & Search Control Console */}
        <div className="rounded-3xl bg-[#0f172a] border border-slate-800 p-5 sm:p-6 shadow-xl space-y-4">
          
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search athlete name, high school, position, or film title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none text-sm text-white placeholder:text-slate-500 font-mono transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Filter Dropdowns Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-shrink-0">
              
              {/* Sport Selector */}
              <div className="relative">
                <select
                  value={selectedSport}
                  onChange={(e) => handleSportChange(e.target.value)}
                  className="w-full appearance-none px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none text-xs font-mono font-bold text-white pr-8 cursor-pointer"
                >
                  {SPORTS_LIST.map((sport) => (
                    <option key={sport} value={sport}>{sport}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                  ▼
                </div>
              </div>

              {/* Dynamic Position Selector */}
              <div className="relative">
                <select
                  value={selectedPosition}
                  onChange={(e) => setSelectedPosition(e.target.value)}
                  disabled={selectedSport === 'All Sports'}
                  className="w-full appearance-none px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none text-xs font-mono font-bold text-white pr-8 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {currentPositionList.map((pos) => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                  ▼
                </div>
              </div>

              {/* Grad Class Selector */}
              <div className="relative">
                <select
                  value={selectedGradYear}
                  onChange={(e) => setSelectedGradYear(e.target.value)}
                  className="w-full appearance-none px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none text-xs font-mono font-bold text-white pr-8 cursor-pointer"
                >
                  {GRAD_YEARS.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr === 'All Classes' ? 'All Classes' : `Class of ${yr}`}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                  ▼
                </div>
              </div>
            </div>

            {/* Reset Filters */}
            {(selectedSport !== 'All Sports' || selectedPosition !== 'All Positions' || selectedGradYear !== 'All Classes' || searchQuery) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-mono font-bold transition-colors cursor-pointer"
                title="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Quick Active Filters Summary Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-850 text-xs font-mono text-slate-400">
            <span>Showing:</span>
            <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-bold">
              {selectedSport}
            </span>
            {selectedPosition !== 'All Positions' && (
              <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 font-bold">
                {selectedPosition}
              </span>
            )}
            {selectedGradYear !== 'All Classes' && (
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold">
                Class of {selectedGradYear}
              </span>
            )}
            <span className="ml-auto text-slate-400 font-mono text-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-bold text-slate-200">{highlights.length}</span> Video{highlights.length === 1 ? '' : 's'} Live
            </span>
          </div>
        </div>

        {/* Video Grid (Responsive 3-Column Display) */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div key={idx} className="rounded-3xl bg-[#0f172a] border border-slate-800 p-4 space-y-4 animate-pulse">
                <div className="w-full aspect-video rounded-2xl bg-slate-900" />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 bg-slate-800 rounded w-3/4" />
                    <div className="h-3 bg-slate-850 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : highlights.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {highlights
              .filter((item) => item && item.videoUrl && isValidVideoUrl(item.videoUrl))
              .map((item) => {
                const vidId = item.id || item.videoUrl;
                const isSaved = bookmarks.includes(vidId);
                const embedInfo = getEmbedUrl(item.videoUrl);
                const providerBadge = getVideoProviderBadge(embedInfo.provider);
                const providerName = getVideoProviderName(embedInfo.provider);

                return (
                  <div 
                    key={item.id}
                    id={`video-card-${item.id}`}
                    onClick={() => handleCardClick(item)}
                    className="group relative rounded-3xl bg-[#0f172a] border border-slate-800 hover:border-cyan-500/50 p-4 transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,245,212,0.08)] flex flex-col justify-between space-y-4 cursor-pointer"
                  >
                    {/* Video Thumbnail / Preview Container with Interception */}
                    <div className="relative w-full aspect-video overflow-hidden rounded-2xl bg-black border border-slate-800/80 group-hover:border-cyan-500/30 transition-colors">
                      {/* Native / Embed Player Preview */}
                      <div className="w-full h-full pointer-events-none">
                        <UniversalVideoPlayer
                          url={item.videoUrl}
                          title={item.title}
                          className="w-full h-full"
                          allowFullScreenModal={false}
                          showPlaceholder={false}
                        />
                      </div>

                    {/* Interactive Play Overlay for Focused View Interception */}
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all flex items-center justify-center">
                      <div className="w-13 h-13 rounded-2xl bg-cyan-500/90 group-hover:bg-cyan-400 text-black flex items-center justify-center shadow-lg shadow-cyan-500/30 group-hover:scale-110 transition-transform duration-200">
                        <Play className="w-6 h-6 fill-current ml-0.5" />
                      </div>
                    </div>

                    {/* Top Provider Tag & Fullscreen Badge */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg backdrop-blur-md border text-[10px] font-mono font-bold ${providerBadge.bg} ${providerBadge.text} ${providerBadge.border}`}>
                        <span>{providerBadge.icon}</span>
                        <span>{providerName}</span>
                      </div>

                      <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                        <div className="p-1.5 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-cyan-300 text-[10px] font-mono font-bold flex items-center gap-1">
                          <Maximize2 className="w-3 h-3" />
                          <span className="hidden sm:inline">Focused View</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Content & Athlete Identity */}
                  <div className="space-y-3 flex-1 flex flex-col justify-between">
                    
                    {/* Title & Sport/Position Badges */}
                    <div className="space-y-2">
                      <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-2">
                        {item.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                        {item.sport && (
                          <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold">
                            {item.sport}
                          </span>
                        )}
                        {item.position && (
                          <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-300 font-semibold">
                            {item.position}
                          </span>
                        )}
                        {item.gradYear && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold flex items-center gap-1">
                            <GraduationCap className="w-3 h-3" />
                            <span>'{item.gradYear.slice(-2)}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Athlete Info Row & Action Buttons */}
                    <div 
                      className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link
                        to={`/profile/${item.userId}`}
                        className="flex items-center gap-2.5 group/author min-w-0"
                      >
                        <img
                          src={item.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                          alt={item.userName}
                          className="w-9 h-9 rounded-full object-cover border border-cyan-500/30 group-hover/author:border-cyan-400 transition-colors"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white group-hover/author:text-cyan-300 transition-colors truncate">
                            {item.userName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            {item.highSchool ? `${item.highSchool}` : 'Verified Prospect'}
                          </div>
                        </div>
                      </Link>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Bookmark Button */}
                        <button
                          type="button"
                          onClick={(e) => handleBookmarkToggle(item, e)}
                          className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                            isSaved
                              ? 'bg-[#FF6A00]/20 text-[#FF6A00] border-[#FF6A00]/40'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-850'
                          }`}
                          title={isSaved ? 'Saved to Bookmarks' : 'Bookmark Clip'}
                        >
                          {isSaved ? (
                            <BookmarkCheck className="w-3.5 h-3.5" />
                          ) : (
                            <Bookmark className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Copy Link Button */}
                        <button
                          type="button"
                          onClick={(e) => handleCopyLink(item, e)}
                          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-850 transition-colors cursor-pointer"
                          title="Copy highlight link"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>

                        {/* View Profile */}
                        <Link
                          to={`/profile/${item.userId}`}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold transition-all hover:border-cyan-400"
                        >
                          <span>Profile</span>
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="rounded-3xl bg-[#0f172a] border border-slate-800 p-12 text-center flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-500">
              <Film className="w-8 h-8" />
            </div>
            <div className="max-w-md space-y-1">
              <h3 className="text-lg font-bold text-white">No Highlight Reels Found</h3>
              <p className="text-xs text-slate-400 font-mono">
                No videos match the active filters ({selectedSport}, {selectedPosition}, {selectedGradYear}). Try resetting the filters or posting a highlight.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
              {user && (
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-bold transition-colors cursor-pointer"
                >
                  Post My Highlight
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Full-screen Dark-themed Video Player Modal (Zustand Controlled) */}
      <VideoPlayerModal />

      {/* Post & Manage Unlimited Athlete Highlights & Game Film Modal */}
      {showAddModal && (
        <PostHighlightModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          initialSport={selectedSport !== 'All Sports' ? selectedSport : undefined}
          onSuccess={() => {
            showToast('success', 'Vault Updated', 'Your highlight was posted and is now live across Just1Play!');
          }}
        />
      )}
    </div>
  );
};

export default WatchFeed;
