import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { VerifiedBadge } from '../Common/VerifiedBadge';
import { 
  Trophy, 
  Flame, 
  MessageSquare, 
  UserPlus, 
  Video, 
  X, 
  Play, 
  ExternalLink, 
  Star,
  Award,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Sparkles,
  Plus,
  Eye
} from 'lucide-react';
import { UserRole } from '../../types';

export interface SpotlightItem {
  id: string;
  name: string;
  avatar: string;
  role: UserRole;
  sport: string;
  badge: string;
  badgeColor?: string;
  stats: string;
  highlightUrl?: string;
  highlightTitle?: string;
  thumbnailUrl?: string;
  views?: string;
  bio?: string;
  uid: string;
  isVerified?: boolean;
  type: 'athlete' | 'highlight';
}

const FEATURED_SPOTLIGHT_ITEMS: SpotlightItem[] = [
  {
    id: 'spot-1',
    uid: 'athlete-jordan-101',
    type: 'athlete',
    name: 'Jordan "Flash" Lee',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    role: 'athlete',
    sport: 'Basketball',
    badge: 'D1 COMMIT',
    badgeColor: 'bg-[#E5B868] text-black',
    stats: '32.4 PPG • 8.2 AST',
    highlightUrl: 'https://www.hudl.com/video/3/12345/67890',
    highlightTitle: 'Game-Winning 3PT Buzzer Beater Tape',
    thumbnailUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&auto=format&fit=crop&q=80',
    views: '12.4K',
    bio: 'Point Guard | Class of 2026 | Tri-State MVP. 6\'2" explosive scorer with 42" vertical jump.',
    isVerified: true
  },
  {
    id: 'spot-2',
    uid: 'athlete-marcus-202',
    type: 'highlight',
    name: 'Marcus Carter',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    role: 'athlete',
    sport: 'Football',
    badge: '4.38s 40-YD',
    badgeColor: 'bg-slate-600 text-black',
    stats: '1,420 YDS • 18 TDs',
    highlightUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    highlightTitle: '70-Yard One-Handed Touchdown Catch',
    thumbnailUrl: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=600&auto=format&fit=crop&q=80',
    views: '28.9K',
    bio: 'Wide Receiver | 5★ Recruit | Newark Regional Combine Overall Champion.',
    isVerified: true
  },
  {
    id: 'spot-3',
    uid: 'scout-maya-303',
    type: 'athlete',
    name: 'Maya Lin',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
    role: 'scout',
    sport: 'Flag Football',
    badge: 'HEAD SCOUT',
    badgeColor: 'bg-amber-400 text-black',
    stats: 'NCAA Talent Evaluator',
    bio: 'Scouting D1 & D2 prospects across the East Coast. DM for verified combine evaluations.',
    isVerified: true
  },
  {
    id: 'spot-4',
    uid: 'athlete-sydney-404',
    type: 'highlight',
    name: 'Sydney Vance',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
    role: 'athlete',
    sport: 'Soccer',
    badge: 'STATE MVP',
    badgeColor: 'bg-purple-400 text-black',
    stats: '28 GOALS • 14 AST',
    highlightUrl: 'https://www.hudl.com/video/3/12345/67890',
    highlightTitle: '30-Yard Free Kick Upper Corner Rocket',
    thumbnailUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&auto=format&fit=crop&q=80',
    views: '19.1K',
    bio: 'Midfielder | Olympic Development Program | 2x Gatorade Player of the Year nominee.',
    isVerified: false
  },
  {
    id: 'spot-5',
    uid: 'coach-vance-505',
    type: 'athlete',
    name: 'Coach Vance',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    role: 'coach',
    sport: 'Basketball',
    badge: 'D1 HEAD COACH',
    badgeColor: 'bg-blue-400 text-black',
    stats: 'Recruiting 2026/27',
    bio: 'Looking for high-IQ point guards and rim protectors. Send game film directly!',
    isVerified: true
  }
];

interface TopAthletesSpotlightSliderProps {
  onOpenDM: (targetUid: string, targetName: string, targetAvatar?: string, targetRole?: UserRole) => void;
  onFollow?: (targetUid: string) => void;
  followingUids?: string[];
  onOpenCreatePost?: () => void;
}

export const TopAthletesSpotlightSlider: React.FC<TopAthletesSpotlightSliderProps> = ({
  onOpenDM,
  onFollow,
  followingUids = [],
  onOpenCreatePost
}) => {
  const [selectedTab, setSelectedTab] = useState<'ALL' | 'ATHLETES' | 'HIGHLIGHTS'>('ALL');
  const [selectedItem, setSelectedItem] = useState<SpotlightItem | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredItems = FEATURED_SPOTLIGHT_ITEMS.filter(item => {
    if (selectedTab === 'ATHLETES') return item.type === 'athlete';
    if (selectedTab === 'HIGHLIGHTS') return item.type === 'highlight' || Boolean(item.highlightTitle);
    return true;
  });

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -220 : 220;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-3">
      {/* Header bar for Spotlight Carousel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-[#E5B868]/10 text-[#E5B868] border border-[#E5B868]/30 shadow-[0_0_12px_rgba(214,28,36,0.3)]">
            <Flame className="w-4 h-4 fill-[#E5B868]" />
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-white font-sans flex items-center gap-1.5">
              <span>TOP ATHLETES &amp; FEATURED TAPE</span>
              <span className="w-2 h-2 rounded-full bg-[#E5B868] animate-ping" />
            </h2>
            <p className="text-[10px] text-slate-400 font-mono">Mobile-optimized spotlight feed</p>
          </div>
        </div>

        {/* Filter Tabs & Scroll Controls */}
        <div className="flex items-center justify-between sm:justify-end gap-2">
          <div className="flex items-center p-1 rounded-xl bg-black/60 border border-white/10 text-[10px] font-mono font-bold">
            <button
              onClick={() => setSelectedTab('ALL')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                selectedTab === 'ALL'
                  ? 'bg-[#E5B868] text-black font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ALL
            </button>
            <button
              onClick={() => setSelectedTab('ATHLETES')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                selectedTab === 'ATHLETES'
                  ? 'bg-[#E5B868] text-black font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              PROSPECTS
            </button>
            <button
              onClick={() => setSelectedTab('HIGHLIGHTS')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                selectedTab === 'HIGHLIGHTS'
                  ? 'bg-[#E5B868] text-black font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              HIGHLIGHTS
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => handleScroll('left')}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors border border-white/10"
              title="Scroll Left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleScroll('right')}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors border border-white/10"
              title="Scroll Right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Swipeable Carousel Container with Motion Touch Gestures */}
      <div
        ref={scrollRef}
        className="flex items-center gap-3.5 overflow-x-auto pb-3 pt-1 px-1 scrollbar-none snap-x snap-mandatory touch-pan-x cursor-grab active:cursor-grabbing select-none"
        style={{ scrollBehavior: 'smooth' }}
      >
        {/* Story Slide 0: Quick Post Story Button */}
        <motion.div
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: 1.05 }}
          onClick={onOpenCreatePost}
          className="flex-shrink-0 snap-start flex flex-col items-center justify-between gap-2 group cursor-pointer w-22 text-center"
        >
          <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-[#212A31] border-2 border-dashed border-[#E5B868]/60 group-hover:border-[#E5B868] flex items-center justify-center transition-all shadow-md">
            <div className="p-2.5 rounded-full bg-[#E5B868] text-black shadow-[0_0_12px_rgba(214,28,36,0.5)]">
              <Plus className="w-5 h-5 stroke-[3]" />
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold text-[#E5B868] group-hover:underline">
            + Post Film
          </span>
        </motion.div>

        {/* Spotlight Prospect & Highlight Reel Cards */}
        <AnimatePresence mode="popLayout">
          {filteredItems.map((item, index) => {
            const isHighlightCard = item.type === 'highlight' && item.thumbnailUrl;

            if (isHighlightCard) {
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: -20 }}
                  transition={{ duration: 0.25, delay: index * 0.04 }}
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.03 }}
                  onClick={() => setSelectedItem(item)}
                  className="flex-shrink-0 snap-start relative w-36 sm:w-40 h-28 sm:h-32 rounded-2xl overflow-hidden border border-white/15 hover:border-[#E5B868] group cursor-pointer transition-colors duration-300 shadow-xl bg-black"
                >
                  {/* Background Thumbnail Image */}
                  <img
                    src={item.thumbnailUrl}
                    alt={item.highlightTitle || item.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 brightness-90"
                    referrerPolicy="no-referrer"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent p-2.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-black uppercase bg-[#E5B868] text-black">
                        {item.badge}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md text-[8px] font-mono font-bold text-white flex items-center gap-1">
                        <Eye className="w-2.5 h-2.5 text-[#E5B868]" /> {item.views}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <div className="p-1 rounded-full bg-[#E5B868] text-black">
                          <Play className="w-2.5 h-2.5 fill-black stroke-none" />
                        </div>
                        <span className="text-[10px] font-bold text-white line-clamp-1 group-hover:text-[#E5B868] transition-colors">
                          {item.name}
                        </span>
                      </div>
                      <div className="text-[8px] font-mono text-slate-300 line-clamp-1">
                        {item.highlightTitle}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            }

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: -20 }}
                transition={{ duration: 0.25, delay: index * 0.04 }}
                whileTap={{ scale: 0.92 }}
                whileHover={{ scale: 1.05 }}
                onClick={() => setSelectedItem(item)}
                className="flex-shrink-0 snap-start flex flex-col items-center gap-2 group cursor-pointer w-22 text-center"
              >
                {/* Avatar Bubble with Animated Ring */}
                <div className="relative">
                  <div className="p-[2.5px] rounded-full bg-gradient-to-tr from-[#E5B868] via-cyan-400 to-amber-400 group-hover:scale-105 transition-transform duration-300 shadow-[0_0_15px_rgba(214,28,36,0.3)]">
                    <img
                      src={item.avatar}
                      alt={item.name}
                      className="w-16 h-16 sm:w-18 sm:h-18 rounded-full object-cover border-2 border-[#050505]"
                    />
                  </div>

                  {/* Badge Overlay Pill */}
                  <span className={`absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full text-[8px] font-mono font-black uppercase whitespace-nowrap shadow-md border border-black ${item.badgeColor || 'bg-[#E5B868] text-black'}`}>
                    {item.badge}
                  </span>
                </div>

                {/* Name & Sport */}
                <div className="w-full truncate pt-1">
                  <div className="text-[11px] font-bold text-white group-hover:text-[#E5B868] transition-colors truncate flex items-center justify-center gap-0.5">
                    <span>{item.name.split(' ')[0]}</span>
                    {item.isVerified && <VerifiedBadge size="sm" />}
                  </div>
                  <div className="text-[9px] font-mono text-slate-400 truncate">{item.sport}</div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* SPOTLIGHT DETAIL MODAL */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-[#212A31] border border-white/20 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl relative font-sans"
            >
              
              {/* Header Banner */}
              <div className="relative h-28 bg-gradient-to-r from-[#E5B868]/20 via-cyan-500/20 to-purple-600/20 p-4 flex justify-between items-start">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-black uppercase ${selectedItem.badgeColor || 'bg-[#E5B868] text-black'}`}>
                  {selectedItem.badge}
                </span>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-1.5 rounded-full bg-black/60 text-slate-300 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Profile Avatar & Info */}
              <div className="px-6 pb-6 relative -mt-12 space-y-4">
                <div className="flex items-end justify-between">
                  <div className="relative">
                    <img
                      src={selectedItem.avatar}
                      alt={selectedItem.name}
                      className="w-20 h-20 rounded-2xl object-cover border-4 border-[#212A31] shadow-xl"
                    />
                    <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-[#E5B868] text-black">
                      <ShieldCheck className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className="text-xs text-[#E5B868] font-bold">{selectedItem.stats}</div>
                    <div className="text-[10px] text-slate-400 uppercase">{selectedItem.sport}</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <span>{selectedItem.name}</span>
                    {selectedItem.isVerified && <VerifiedBadge size="md" />}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{selectedItem.bio}</p>
                </div>

                {/* Highlight Film Link */}
                {selectedItem.highlightUrl && (
                  <a
                    href={selectedItem.highlightUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between text-xs text-white group transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-[#E5B868]/20 text-[#E5B868]">
                        <Video className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs">{selectedItem.highlightTitle || 'Watch Verified Game Film'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">Hudl / YouTube Film Reel</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#E5B868] group-hover:translate-x-1 transition-all" />
                  </a>
                )}

                {/* Action Buttons */}
                <div className="pt-2 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      onOpenDM(selectedItem.uid, selectedItem.name, selectedItem.avatar, selectedItem.role);
                      setSelectedItem(null);
                    }}
                    className="py-3 bg-[#E5B868] hover:bg-[#B8141B] text-black font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(214,28,36,0.4)]"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Direct Message</span>
                  </button>

                  {onFollow && (
                    <button
                      onClick={() => onFollow(selectedItem.uid)}
                      className={`py-3 font-mono font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 border transition-all ${
                        followingUids.includes(selectedItem.uid)
                          ? 'bg-white/10 text-slate-300 border-white/20'
                          : 'bg-white/5 hover:bg-white/15 text-white border-white/20'
                      }`}
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>{followingUids.includes(selectedItem.uid) ? 'Following' : 'Follow'}</span>
                    </button>
                  )}
                </div>

              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

