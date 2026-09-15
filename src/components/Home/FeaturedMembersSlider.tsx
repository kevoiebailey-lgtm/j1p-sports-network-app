import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Trophy, 
  ArrowRight, 
  Flame, 
  ShieldCheck, 
  Star, 
  SlidersHorizontal,
  ExternalLink,
  Zap,
  Activity,
  Award,
  Video,
  Eye,
  TrendingUp,
  Target
} from 'lucide-react';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserProfile, MainTab } from '../../types';
import { VerifiedBadge } from '../Common/VerifiedBadge';
import { triggerHaptic } from '../../lib/haptics';

interface FeaturedMembersSliderProps {
  onNavigateTab: (tab: MainTab) => void;
  onSelectAthlete?: (athleteId: string) => void;
}

interface MemberDisplayItem {
  uid: string;
  displayName: string;
  sport: string;
  position: string;
  jerseyNumber?: string;
  gradYear: string;
  highSchool?: string;
  state?: string;
  avatarUrl: string;
  isVerified: boolean;
  ratingStars?: number;
  starTier: string;
  highlightTag?: string;
  gpa?: string;
  primaryMetric: {
    label: string;
    value: string;
    subtext?: string;
  };
  secondaryMetric: {
    label: string;
    value: string;
  };
  highlightClipsCount: number;
}

export const FeaturedMembersSlider: React.FC<FeaturedMembersSliderProps> = ({
  onNavigateTab,
  onSelectAthlete
}) => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [members, setMembers] = useState<MemberDisplayItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Convert raw athlete profiles to visually punchy member cards
  const formatAthletesToMembers = (athletesList: UserProfile[]): MemberDisplayItem[] => {
    return athletesList.map((ath, idx) => {
      let metric = { label: 'RATING', value: '96.4', subtext: 'SCOUT INDEX' };
      let secMetric = { label: '40-YD DASH', value: '4.42s' };
      
      const sportLower = (ath.sport || '').toLowerCase();
      if (sportLower.includes('basketball')) {
        metric = { label: 'SCORING AVG', value: `${(ath.stats as any)?.points || 24.5}`, subtext: 'PPG' };
        secMetric = { label: 'ASSISTS', value: `${(ath.stats as any)?.assists || 8.4} APG` };
      } else if (sportLower.includes('flag') || sportLower.includes('football')) {
        if ((ath.stats as any)?.passingYards) {
          metric = { label: 'PASS YARDS', value: `${(ath.stats as any)?.passingYards || 2850}`, subtext: 'YDS' };
          secMetric = { label: 'TOTAL TDS', value: `${(ath.stats as any)?.touchdowns || 34} TD` };
        } else {
          metric = { label: 'FLAG PULLS', value: `${(ath.stats as any)?.flagPulls || 68}`, subtext: 'STOPS' };
          secMetric = { label: '40-YD DASH', value: '4.46s' };
        }
      } else if (sportLower.includes('lacrosse')) {
        metric = { label: 'GOALS SCORED', value: `${(ath.stats as any)?.goals || 54}`, subtext: 'GOALS' };
        secMetric = { label: 'SHOT SPEED', value: '92 MPH' };
      }

      const tags = ['5-STAR PROSPECT', 'STATE MVP', 'D1 BLUE CHIP', 'ALL-AMERICAN', 'COMBINE RECORD'];
      const highlightTag = tags[idx % tags.length];

      // Curated high-res athletic avatars matching sport
      let avatar = ath.avatarUrl;
      if (!avatar || avatar.includes('default') || avatar.includes('placeholder')) {
        const fallbacks = [
          'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800&auto=format&fit=crop&q=80'
        ];
        avatar = fallbacks[idx % fallbacks.length];
      }

      return {
        uid: ath.uid || `ath-${idx}`,
        displayName: ath.displayName || 'Athlete Member',
        sport: ath.sport || 'Multi-Sport',
        position: ath.position || 'Athlete',
        jerseyNumber: ath.jerseyNumber || (ath.displayName?.includes('Kevoie') ? '#7' : `#${(idx * 3 + 7) % 99}`),
        gradYear: ath.gradYear ? `'${ath.gradYear.slice(-2)}` : `'26`,
        highSchool: ath.highSchool || ath.teamName || 'Tri-State Prep',
        state: ath.state || 'NJ',
        avatarUrl: avatar,
        isVerified: ath.isVerified !== false,
        ratingStars: 5,
        starTier: '5-STAR',
        highlightTag,
        gpa: ath.gpa || '3.85',
        primaryMetric: metric,
        secondaryMetric: secMetric,
        highlightClipsCount: ath.mediaUrls?.length || (idx % 3 + 2)
      };
    });
  };

  // Load real members from Firestore
  useEffect(() => {
    if (!db) {
      setMembers([]);
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(
      query(collection(db, 'users'), limit(50)),
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded: UserProfile[] = [];
          snapshot.docs.forEach((docSnap) => {
            const data = docSnap.data() as UserProfile;
            if (data.role === 'athlete' || !data.role) {
              loaded.push({ uid: docSnap.id, ...data });
            }
          });
          setMembers(formatAthletesToMembers(loaded));
        } else {
          setMembers([]);
        }
        setLoading(false);
      },
      (err) => {
        console.warn('Featured athletes listener notice:', err);
        setMembers([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const filterCategories = [
    { id: 'all', label: 'All Featured', icon: '⭐' },
    { id: '5star', label: '5-Star Blue Chips', icon: '🔥' },
    { id: 'football', label: 'Football & 7v7', icon: '🏈' },
    { id: 'basketball', label: 'Basketball', icon: '🏀' },
    { id: 'flag_football', label: "Girls' Flag Football", icon: '⚡' },
    { id: 'lacrosse', label: 'Lacrosse', icon: '🥍' }
  ];

  const filteredMembers = members.filter(m => {
    if (activeFilter === 'all') return true;
    if (activeFilter === '5star') return true;
    if (activeFilter === 'football') return m.sport.toLowerCase().includes('football') && !m.sport.toLowerCase().includes('flag');
    if (activeFilter === 'flag_football') return m.sport.toLowerCase().includes('flag');
    if (activeFilter === 'basketball') return m.sport.toLowerCase().includes('basketball');
    if (activeFilter === 'lacrosse') return m.sport.toLowerCase().includes('lacrosse');
    return true;
  });

  const scrollSlider = (direction: 'left' | 'right') => {
    triggerHaptic('light');
    if (sliderRef.current) {
      const scrollAmount = direction === 'left' ? -380 : 380;
      sliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleAthleteClick = (athleteUid: string) => {
    triggerHaptic('medium');
    if (onSelectAthlete) {
      onSelectAthlete(athleteUid);
    } else {
      navigate(`/athlete/${athleteUid}`);
    }
  };

  return (
    <section id="featured-athletes-section" className="relative space-y-5 pt-4 font-sans text-white">
      
      {/* 1. SECTION HEADER WITH DYNAMIC CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-1">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-black uppercase tracking-wider bg-[#FF6A00]/15 text-[#FF6A00] border border-[#FF6A00]/40 shadow-[0_0_15px_rgba(255,106,0,0.3)]">
              <Flame className="w-3.5 h-3.5 fill-[#FF6A00]" />
              <span>Verified Next-Gen Recruits</span>
            </span>
            <span className="text-xs text-slate-400 font-mono hidden md:inline">
              • Direct NCAA Scout Profiles
            </span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tight text-[#263238] dark:text-white flex items-center gap-2">
            <span>Featured Athletes</span>
            <span className="text-[#FF6A00] drop-shadow-[0_0_20px_rgba(255,106,0,0.6)]">.</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl font-normal leading-relaxed">
            Click any athlete card to open their verified scouting card, 4K Hudl clips, combine measurables, and GPA records.
          </p>
        </div>

        {/* Action Controls & Navigation Arrows */}
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <button
            onClick={() => onNavigateTab('athletes')}
            className="px-4 py-2 rounded-xl clear-glass hover:border-[#FF6A00] text-[#263238] dark:text-white text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs hover:glow-orange"
            id="view-all-athletes-btn"
          >
            <span>Launch Recruiter Matrix</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#FF6A00]" />
          </button>

          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-black/40 p-1 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
            <button
              onClick={() => scrollSlider('left')}
              className="w-9 h-9 rounded-xl frosted-glass border border-slate-200 dark:border-white/10 hover:border-[#FF6A00] flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-[#FF6A00] transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95"
              title="Previous Athlete"
              id="slider-prev-btn"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scrollSlider('right')}
              className="w-9 h-9 rounded-xl frosted-glass border border-slate-200 dark:border-white/10 hover:border-[#FF6A00] flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-[#FF6A00] transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95"
              title="Next Athlete"
              id="slider-next-btn"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. SPORT / TIER FILTER PILLS */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 px-1">
        {filterCategories.map(cat => (
          <button
            key={cat.id}
            onClick={() => {
              triggerHaptic('light');
              setActiveFilter(cat.id);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
              activeFilter === cat.id
                ? 'bg-gradient-to-r from-[#FF6A00] to-[#FF8C00] text-white shadow-[0_0_20px_rgba(255,106,0,0.45)] border border-[#FFC857]/40'
                : 'clear-glass text-slate-600 dark:text-slate-300 hover:text-[#263238] dark:hover:text-white hover:border-[#FF6A00]/40'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* 3. HORIZONTAL SWIPEABLE SLIDER CONTAINER */}
      <div 
        ref={sliderRef}
        className="flex gap-4 sm:gap-6 overflow-x-auto scrollbar-none py-3 px-1 snap-x snap-mandatory scroll-smooth"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {filteredMembers.map((member, idx) => (
          <motion.div
            key={member.uid || idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: idx * 0.05 }}
            onClick={() => handleAthleteClick(member.uid)}
            onMouseEnter={() => setHoveredId(member.uid)}
            onMouseLeave={() => setHoveredId(null)}
            id={`athlete-card-${member.uid}`}
            className="group relative flex-none w-[260px] sm:w-[290px] snap-start rounded-3xl overflow-hidden cursor-pointer bg-[#140802] border-2 border-white/15 dark:border-white/10 hover:border-[#FF6A00] transition-all duration-500 hover:shadow-[0_0_35px_rgba(255,106,0,0.45)] hover:-translate-y-2 flex flex-col justify-between"
          >
            {/* AMBIENT SPOTLIGHT ON HOVER */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-[#FF6A00]/0 group-hover:bg-[#FF6A00]/20 rounded-full blur-2xl transition-all duration-500 pointer-events-none" />

            {/* CARD POSTER / ATHLETE VISUAL GRAPHIC */}
            <div className="relative h-[340px] sm:h-[370px] w-full overflow-hidden bg-slate-950">
              <img
                src={member.avatarUrl}
                alt={member.displayName}
                className="w-full h-full object-cover object-top group-hover:scale-108 transition-transform duration-700 brightness-95 group-hover:brightness-105"
                loading="lazy"
              />

              {/* CINEMATIC GRADIENT MASKS (ESPN BROADCAST FINISH) */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#140802] via-[#140802]/50 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-transparent opacity-80" />

              {/* TOP ACCENT BADGES */}
              <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between z-10">
                {/* 5-Star Recruit Pill */}
                <div className="px-2.5 py-1 rounded-full text-[9px] font-mono font-black tracking-wider uppercase bg-black/70 backdrop-blur-md text-[#FFC857] border border-[#FFC857]/40 shadow-md flex items-center gap-1">
                  <Star className="w-2.5 h-2.5 fill-[#FFC857]" />
                  <span>{member.highlightTag}</span>
                </div>

                {/* Jersey Number Badge */}
                {member.jerseyNumber && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF6A00] to-[#FF8C00] text-white font-black font-mono text-xs flex items-center justify-center shadow-[0_0_15px_rgba(255,106,0,0.6)] border border-[#FFC857]/50">
                    {member.jerseyNumber}
                  </div>
                )}
              </div>

              {/* FLOATING ACTION BADGE ON HOVER */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-100 z-20 pointer-events-none">
                <div className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#FF6A00] to-[#FF8C00] text-white font-black text-xs font-mono uppercase tracking-wider shadow-[0_0_30px_rgba(255,106,0,0.8)] flex items-center gap-2 border border-white/50">
                  <span>Open Scout Card</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* BOTTOM ATHLETE INFO OVERLAY */}
              <div className="absolute bottom-0 left-0 right-0 p-4 z-10 space-y-2.5">
                
                {/* Sport & Class Badge */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-black uppercase bg-[#00B8D4]/20 text-[#00B8D4] border border-[#00B8D4]/40">
                    {member.sport}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase bg-white/10 text-white border border-white/20">
                    Class {member.gradYear}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {member.gpa} GPA
                  </span>
                </div>

                {/* Athlete Name */}
                <div>
                  <h3 className="text-xl font-black text-white italic uppercase tracking-tight flex items-center gap-1.5 leading-snug drop-shadow-md">
                    <span>{member.displayName}</span>
                    {member.isVerified && <VerifiedBadge size="sm" />}
                  </h3>
                  <p className="text-xs text-slate-300 font-mono line-clamp-1">
                    {member.position} • {member.highSchool} ({member.state})
                  </p>
                </div>

                {/* Measurables Metric Strip */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/15">
                  <div className="p-1.5 rounded-xl bg-black/50 border border-[#FF6A00]/30 text-center">
                    <span className="text-[9px] font-mono text-slate-400 block uppercase">
                      {member.primaryMetric.label}
                    </span>
                    <span className="text-xs font-black font-mono text-[#FF6A00]">
                      {member.primaryMetric.value} {member.primaryMetric.subtext && <span className="text-[9px] font-normal text-slate-400">{member.primaryMetric.subtext}</span>}
                    </span>
                  </div>

                  <div className="p-1.5 rounded-xl bg-black/50 border border-[#00B8D4]/30 text-center">
                    <span className="text-[9px] font-mono text-slate-400 block uppercase">
                      {member.secondaryMetric.label}
                    </span>
                    <span className="text-xs font-black font-mono text-[#00B8D4]">
                      {member.secondaryMetric.value}
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* CARD BOTTOM ACTION BAR */}
            <div className="p-3.5 bg-black/90 border-t border-white/10 flex items-center justify-between text-xs font-mono group-hover:bg-[#FF6A00]/10 transition-colors">
              <div className="flex items-center gap-1.5 text-slate-300 group-hover:text-white">
                <Video className="w-3.5 h-3.5 text-[#FF6A00]" />
                <span className="text-[11px] font-bold">{member.highlightClipsCount} Reels Available</span>
              </div>

              <div className="flex items-center gap-1 text-[#FF6A00] font-bold group-hover:translate-x-1 transition-transform">
                <span className="text-[11px] uppercase">Scout Film</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

          </motion.div>
        ))}
      </div>

    </section>
  );
};

export default FeaturedMembersSlider;
