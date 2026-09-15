import React, { useState } from 'react';
import { 
  Flame, 
  MessageSquare, 
  ChevronUp, 
  ChevronDown, 
  Trophy, 
  ExternalLink, 
  Sparkles, 
  Zap, 
  Award, 
  Share2, 
  Check, 
  Video, 
  UserPlus, 
  MessageCircle,
  Play,
  Activity,
  Star,
  QrCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { VerifiedBadge } from '../Common/VerifiedBadge';
import { BentoCardSkeleton } from '../Common/SkeletonLoader';
import { detectVideoEmbed } from '../../lib/mediaEmbed';
import { VideoSpotlightModal } from './VideoSpotlightModal';
import { MediaFeedItem } from './ProgressiveMediaCard';

interface FeedAthleteItem {
  id: string;
  name: string;
  sport: string;
  gradYear: string;
  position: string;
  location: string;
  school: string;
  avatarUrl: string;
  mediaThumbnailUrl: string;
  videoUrl?: string;
  externalLink?: string;
  hypeCount: number;
  commentCount: number;
  topComment: { author: string; text: string };
  stats: { label: string; value: string; highlight?: boolean }[];
  scoutNotes: string;
  recruitmentStatus: string;
  gpa: string;
  heightWeight: string;
}

const SAMPLE_FEED_ATHLETES: FeedAthleteItem[] = [
  {
    id: 'athlete-1',
    name: 'Jayden Carter',
    sport: 'Basketball',
    gradYear: '2026',
    position: 'Point Guard',
    location: 'Paterson, NJ',
    school: 'Nexus Prep Academy',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    mediaThumbnailUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-basketball-player-dunking-a-ball-4043-large.mp4',
    hypeCount: 842,
    commentCount: 48,
    topComment: { author: 'Coach Vance', text: 'Lethal 3-point pull-up. High IQ point guard.' },
    stats: [
      { label: 'PPG', value: '28.4', highlight: true },
      { label: 'APG', value: '6.2' },
      { label: '3PT %', value: '42.1%' },
      { label: 'VERT', value: '38.5"' }
    ],
    scoutNotes: 'NCAA Division I High Major Prospect. Exceptional floor vision, twitchy first step, and reliable pull-up jumper under pressure.',
    recruitmentStatus: 'Offers: Seton Hall, Rutgers, St. John\'s',
    gpa: '3.8 GPA',
    heightWeight: '6\'2" / 185 lbs'
  },
  {
    id: 'athlete-2',
    name: 'Maya Sanchez',
    sport: 'Flag Football',
    gradYear: '2027',
    position: 'Quarterback',
    location: 'Jersey City, NJ',
    school: 'Metro Tech High',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80',
    mediaThumbnailUrl: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-american-football-player-running-with-the-ball-41549-large.mp4',
    hypeCount: 619,
    commentCount: 31,
    topComment: { author: 'Scout Rodriguez', text: '34 Pass TD in Tri-State tournament. Laser accuracy!' },
    stats: [
      { label: 'PASS TD', value: '34', highlight: true },
      { label: 'COMP %', value: '68.4%' },
      { label: 'RATING', value: '128.5' },
      { label: '40-YD', value: '4.52s' }
    ],
    scoutNotes: 'Elite QB mechanics in 7v7 and flag. Drops dimes on post routes and reads zero coverage instantly.',
    recruitmentStatus: 'National Flag Football Showcase MVP',
    gpa: '3.9 GPA',
    heightWeight: '5\'8" / 140 lbs'
  },
  {
    id: 'athlete-3',
    name: 'Marcus Vance',
    sport: 'Football',
    gradYear: '2026',
    position: 'Wide Receiver / DB',
    location: 'Bergen, NJ',
    school: 'Bergen Catholic',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    mediaThumbnailUrl: 'https://images.unsplash.com/photo-1519766304817-4f37bda74a29?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-runners-on-a-track-field-41539-large.mp4',
    hypeCount: 953,
    commentCount: 72,
    topComment: { author: 'NY Gridiron', text: 'Sub 4.4 speed in 40-yard dash. Absolute playmaker.' },
    stats: [
      { label: 'REC YDS', value: '1,240', highlight: true },
      { label: 'TDs', value: '16' },
      { label: '40-YD', value: '4.39s' },
      { label: 'INTs', value: '4' }
    ],
    scoutNotes: 'Explosive deep threat with elite hands. 4.39 speed confirmed at Under Armour Combine.',
    recruitmentStatus: 'Offers: Penn State, Syracuse, BC',
    gpa: '3.6 GPA',
    heightWeight: '6\'1" / 190 lbs'
  },
  {
    id: 'athlete-4',
    name: 'LaxPro Elite Team',
    sport: 'Lacrosse',
    gradYear: '2026',
    position: 'Attack Unit',
    location: 'Garden State, NJ',
    school: 'East Coast Lax Academy',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
    mediaThumbnailUrl: 'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-playing-soccer-on-a-field-42939-large.mp4',
    hypeCount: 421,
    commentCount: 19,
    topComment: { author: 'Coach Miller', text: 'Dominant 12-2 run to take Championship Gold.' },
    stats: [
      { label: 'GOALS', value: '142', highlight: true },
      { label: 'ASSISTS', value: '88' },
      { label: 'WIN %', value: '92%' },
      { label: 'RANK', value: '#1 NJ' }
    ],
    scoutNotes: 'High-tempo transition attack unit. Smooth stick skills and quick ball movement on man-up opportunities.',
    recruitmentStatus: 'Tri-State Gold Champions',
    gpa: '3.7 Team GPA',
    heightWeight: 'Roster Average 6\'0"'
  }
];

const SPORTS_PILLS = [
  'All Sports',
  'Football',
  'Basketball',
  'Flag Football',
  'Lacrosse',
  'Track & Field',
  'Soccer',
  'Baseball',
  'Volleyball',
  'Cheerleading'
];

interface ProgressiveDetailFeedProps {
  selectedSport?: string;
  onOpenDM?: (targetUid: string, targetName: string) => void;
  onNavigateTab?: (tab: any) => void;
  onOpenCreateModal?: () => void;
}

export const ProgressiveDetailFeed: React.FC<ProgressiveDetailFeedProps> = ({
  selectedSport: propSelectedSport,
  onOpenDM,
  onNavigateTab,
  onOpenCreateModal
}) => {
  const [internalSelectedSport, setInternalSelectedSport] = useState<string>('All Sports');
  const [isFiltering, setIsFiltering] = useState<boolean>(false);
  const [expandedAthleteId, setExpandedAthleteId] = useState<string | null>(null);
  const [spotlightMedia, setSpotlightMedia] = useState<MediaFeedItem | null>(null);

  const activeSport = propSelectedSport || internalSelectedSport;

  const handleSportChange = (sport: string) => {
    if (sport === activeSport) return;
    setIsFiltering(true);
    setInternalSelectedSport(sport);
    setTimeout(() => setIsFiltering(false), 200);
  };
  const [hypedIds, setHypedIds] = useState<Record<string, boolean>>({});
  const [hypeCounts, setHypeCounts] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    SAMPLE_FEED_ATHLETES.forEach((a) => {
      initial[a.id] = a.hypeCount;
    });
    return initial;
  });

  const filteredAthletes = SAMPLE_FEED_ATHLETES.filter((a) => {
    if (!activeSport || activeSport === 'all' || activeSport === 'All Sports') return true;
    const normActive = activeSport.toLowerCase().replace(/_/g, ' ').replace("girls' ", "").trim();
    const normAthlete = a.sport.toLowerCase().replace(/_/g, ' ').replace("girls' ", "").trim();
    return normAthlete.includes(normActive) || normActive.includes(normAthlete);
  });

  const toggleHype = (id: string) => {
    setHypedIds((prev) => {
      const isHyped = !!prev[id];
      const nextHype = !isHyped;
      setHypeCounts((c) => ({
        ...c,
        [id]: (c[id] || 0) + (nextHype ? 1 : -1)
      }));
      return { ...prev, [id]: nextHype };
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedAthleteId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      
      {/* Feed Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-[#37474F] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[#FF6A00]/15 text-[#FF6A00] border border-[#FF6A00]/30 shadow-[0_0_15px_rgba(255,106,0,0.2)]">
            <Flame className="w-5 h-5 text-[#FF6A00]" />
          </div>
          <div>
            <h2 className="text-xl font-black italic uppercase text-[#263238] dark:text-white tracking-tight flex items-center gap-2">
              <span>PROGRESSIVE DETAIL HIGHLIGHT FEED</span>
              <span className="px-2 py-0.5 rounded-md bg-[#FF6A00]/15 text-[#FF6A00] border border-[#FF6A00]/30 text-[10px] font-mono font-bold uppercase">
                SWIPE / VIEW MORE
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-300 font-mono">
              High-impact media cards with minimal overlays • Tap &quot;View More&quot; for stats &amp; scout notes
            </p>
          </div>
        </div>

        {/* Compact Sport Filtering Pills with Pro Carbon Feedback */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none max-w-full">
          {SPORTS_PILLS.map((sport) => {
            const isActive = activeSport === sport || activeSport.toLowerCase().replace(/_/g, ' ') === sport.toLowerCase();
            return (
              <button
                key={sport}
                onClick={() => handleSportChange(sport)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-mono font-black uppercase tracking-wider whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-[#FF6A00] text-white shadow-[0_0_15px_rgba(255,106,0,0.4)] border border-[#FF6A00] scale-105'
                    : 'bg-white dark:bg-[#1E282D] hover:bg-slate-100 dark:hover:bg-[#37474F] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#37474F] hover:text-[#263238] dark:hover:text-white'
                }`}
              >
                {sport}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feed Cards List, Skeleton Loader, or Engaging Empty State */}
      {isFiltering ? (
        <BentoCardSkeleton count={2} />
      ) : filteredAthletes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredAthletes.map((item) => {
          const isExpanded = expandedAthleteId === item.id;
          const isHyped = !!hypedIds[item.id];
          const currentHype = hypeCounts[item.id] || item.hypeCount;
          const videoEmbed = item.videoUrl ? detectVideoEmbed(item.videoUrl) : null;

          return (
            <div
              key={item.id}
              className="relative rounded-3xl bg-white dark:bg-[#263238] backdrop-blur-2xl border border-slate-200 dark:border-[#37474F] hover:border-[#FF6A00] transition-all duration-300 overflow-hidden shadow-md flex flex-col justify-between group"
            >
              {/* Media Container with Minimal Overlays */}
              <div 
                onClick={() => setSpotlightMedia({
                  id: item.id,
                  athleteName: item.name,
                  athleteAvatar: item.avatarUrl,
                  teamName: item.school,
                  sport: item.sport,
                  classYear: item.gradYear,
                  thumbnailUrl: item.mediaThumbnailUrl,
                  videoUrl: item.videoUrl,
                  hypeCount: item.hypeCount,
                  scoutNotes: item.scoutNotes,
                  isVerified: true
                })}
                className="relative aspect-[16/10] bg-black overflow-hidden group cursor-pointer"
              >
                <img
                  src={item.mediaThumbnailUrl}
                  alt={item.name}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
                />

                {/* Play Button Spotlight Trigger */}
                <button
                  aria-label="Play sports tape"
                  className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-[#FF6A00] text-white flex items-center justify-center shadow-[0_0_25px_rgba(255,106,0,0.6)] transform scale-95 group-hover:scale-110 transition-all cursor-pointer z-20 pointer-events-none"
                >
                  <Play className="w-6 h-6 fill-white ml-0.5" />
                </button>

                {/* Top Minimal Overlay */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
                  <div className="flex items-center gap-2 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/20 shadow-md pointer-events-auto">
                    <img
                      src={item.avatarUrl}
                      alt={item.name}
                      className="w-7 h-7 rounded-xl object-cover border border-[#FF6A00]"
                    />
                    <div>
                      <div className="font-bold text-white text-xs flex items-center gap-1">
                        <span>{item.name}</span>
                        <VerifiedBadge size="sm" />
                      </div>
                      <div className="text-[9px] text-[#FFC857] font-mono font-bold uppercase">
                        {item.school}
                      </div>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-xl bg-[#FF6A00] text-white font-black text-[10px] uppercase tracking-wider shadow-[0_0_12px_rgba(255,106,0,0.4)] pointer-events-auto">
                    {item.sport} • {item.gradYear}
                  </span>
                </div>

                {/* Bottom Minimal Overlay: Hype Counter + Comment Preview */}
                <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between bg-black/80 backdrop-blur-md p-2.5 rounded-2xl border border-white/20">
                  
                  {/* Hype Reaction Button */}
                  <button
                    onClick={() => toggleHype(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                      isHyped
                        ? 'bg-[#FF6A00] text-white shadow-[0_0_15px_rgba(255,106,0,0.4)]'
                        : 'bg-white/10 text-slate-300 hover:text-white border border-white/15 hover:border-[#FF6A00]/50'
                    }`}
                  >
                    <Flame className={`w-4 h-4 ${isHyped ? 'text-white fill-white' : 'text-[#FF6A00]'}`} />
                    <span>{currentHype} HYPE</span>
                  </button>

                  {/* Comment Preview Tag */}
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-300 font-mono truncate max-w-[200px] sm:max-w-[240px]">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    <span className="truncate">
                      <strong className="text-white">{item.topComment.author}:</strong> {item.topComment.text}
                    </span>
                  </div>

                  {/* "View More" Expander Toggle Button */}
                  <button
                    onClick={() => toggleExpand(item.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#FF6A00]/20 hover:bg-[#FF6A00] text-[#FF6A00] hover:text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer border border-[#FF6A00]/40 shrink-0"
                  >
                    <span>{isExpanded ? 'LESS' : 'MORE'}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                </div>
              </div>

              {/* EXPANDABLE PROGRESSIVE DETAIL DRAWER */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="p-5 border-t border-slate-200 dark:border-[#37474F] bg-slate-50/80 dark:bg-[#1E282D]/95 space-y-4"
                  >
                    
                    {/* Key Season Metrics Bar */}
                    <div className="grid grid-cols-4 gap-2 text-center font-mono text-xs">
                      {item.stats.map((st, sIdx) => (
                        <div
                          key={sIdx}
                          className={`p-2.5 rounded-xl border ${
                            st.highlight
                              ? 'bg-[#FF6A00]/15 border-[#FF6A00]/50 text-[#FF6A00]'
                              : 'bg-white dark:bg-[#263238] border-slate-200 dark:border-[#37474F] text-[#263238] dark:text-white'
                          }`}
                        >
                          <div className="text-[9px] text-slate-400 uppercase font-bold">{st.label}</div>
                          <div className="text-sm font-black text-[#263238] dark:text-white mt-0.5">{st.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Scout Matrix Evaluation Notes */}
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-[#263238] border border-slate-200 dark:border-[#37474F] space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-[11px] font-mono text-[#FF6A00] font-bold uppercase">
                        <span className="flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-[#FF6A00]" />
                          Scout Evaluation Notes
                        </span>
                        <span className="text-emerald-500 dark:text-emerald-400">{item.gpa}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-sans text-xs">
                        {item.scoutNotes}
                      </p>
                      <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>{item.recruitmentStatus}</span>
                        <span>{item.heightWeight}</span>
                      </div>
                    </div>

                    {/* Embedded External Streaming Video Player (If Available) */}
                    {videoEmbed && (
                      <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-[#37474F] bg-black aspect-video relative">
                        <iframe
                          src={`${videoEmbed.embedUrl}?autoplay=0`}
                          title={`${item.name} video player`}
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    )}

                    {/* Direct Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-[#37474F] text-xs font-bold">
                      <div className="flex items-center gap-2">
                        {onOpenDM && (
                          <button
                            onClick={() => onOpenDM(item.id, item.name)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#263238] hover:bg-slate-200 dark:hover:bg-[#37474F] text-[#263238] dark:text-white border border-slate-200 dark:border-[#37474F] flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-[#FF6A00]" />
                            <span>Message Scout</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            if (onNavigateTab) onNavigateTab('athletes');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#263238] hover:bg-slate-200 dark:hover:bg-[#37474F] text-[#263238] dark:text-white border border-slate-200 dark:border-[#37474F] flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Trophy className="w-3.5 h-3.5 text-[#FF6A00]" />
                          <span>Full Matrix</span>
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          if (onNavigateTab) onNavigateTab('media');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#FF6A00] text-white font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_12px_rgba(255,106,0,0.35)]"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Book 4K Media</span>
                      </button>
                    </div>

                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          );
        })}
      </div>
      ) : (
        /* Rich Engaging Empty State Fallback */
        <div className="relative rounded-3xl bg-white dark:bg-[#263238] border border-slate-200 dark:border-[#37474F] p-8 sm:p-12 text-center overflow-hidden shadow-md space-y-6">
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#FF6A00]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-[#00B8D4]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="w-16 h-16 rounded-2xl bg-[#FF6A00]/15 border border-[#FF6A00]/30 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(255,106,0,0.3)]">
            <Sparkles className="w-8 h-8 text-[#FF6A00]" />
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <h3 className="text-xl sm:text-2xl font-black text-[#263238] dark:text-white uppercase italic tracking-tight font-sans">
              Be the first athlete to upload film in <span className="text-[#FF6A00] not-italic">{activeSport}</span> this week!
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 font-sans font-medium leading-relaxed">
              College scouts, recruiters, and fans in the Tri-State area are actively scouting this category. Upload your highlights or tournament game film to get evaluated.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                if (onOpenCreateModal) {
                  onOpenCreateModal();
                } else if (onNavigateTab) {
                  onNavigateTab('social');
                }
              }}
              className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#FF6A00] hover:bg-[#E05D00] text-white font-black font-mono text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(255,106,0,0.4)] transition-all cursor-pointer"
            >
              <Video className="w-4 h-4" />
              <span>+ POST GAME FILM / HIGHLIGHT</span>
            </button>

            <button
              onClick={() => handleSportChange('All Sports')}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#1E282D] hover:bg-slate-200 dark:hover:bg-[#37474F] text-slate-600 dark:text-slate-300 hover:text-[#263238] dark:hover:text-white border border-slate-200 dark:border-[#37474F] font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              View All Sports
            </button>
          </div>
        </div>
      )}

      {/* Video Spotlight Modal */}
      <VideoSpotlightModal
        item={spotlightMedia}
        isOpen={!!spotlightMedia}
        onClose={() => setSpotlightMedia(null)}
      />

    </div>
  );
};
