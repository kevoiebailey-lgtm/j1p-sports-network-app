import React, { useRef } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'motion/react';
import { Bookmark, ShieldCheck, Sparkles, MapPin, Trophy } from 'lucide-react';

export interface KeyStat {
  label: string; // e.g., 'HT', 'WT', 'GPA', '40-YD', 'PTS', 'AST'
  value: string | number; // e.g., "6'2"", "205", "3.9", "4.42s", "28.4"
}

export interface AthleteCardProps {
  athleteName: string;
  imageUrl?: string;
  sport?: string;
  position?: string;
  ratingScore?: number | string; // e.g. 96 or "98"
  keyStats?: KeyStat[];
  gradYear?: string;
  highSchool?: string;
  state?: string;
  isVerified?: boolean;
  isBookmarked?: boolean;
  onBookmarkToggle?: (e: React.MouseEvent) => void;
  onClick?: () => void;
  className?: string;
}

export const AthleteCard: React.FC<AthleteCardProps> = ({
  athleteName,
  imageUrl,
  sport = 'Basketball',
  position = 'ATH',
  ratingScore = 95,
  keyStats = [
    { label: 'HT', value: `6'2"` },
    { label: 'WT', value: '195' },
    { label: 'GPA', value: '3.8' },
    { label: '40-YD', value: '4.45s' }
  ],
  gradYear = '2026',
  highSchool = 'Bergen Catholic',
  state = 'NJ',
  isVerified = true,
  isBookmarked = false,
  onBookmarkToggle,
  onClick,
  className = ''
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  // 3D Tilt Motion Values
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Spring physics for smooth tilt response
  const mouseX = useSpring(x, { stiffness: 200, damping: 20 });
  const mouseY = useSpring(y, { stiffness: 200, damping: 20 });

  // Map mouse coordinate offset (-0.5 to 0.5) to degrees (-12deg to 12deg)
  const rotateX = useTransform(mouseY, [-0.5, 0.5], [12, -12]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-12, 12]);

  // Dynamic light sheen movement
  const sheenX = useTransform(mouseX, [-0.5, 0.5], ['0%', '100%']);
  const sheenY = useTransform(mouseY, [-0.5, 0.5], ['0%', '100%']);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Normalize coordinates around center (-0.5 to 0.5)
    const normalizedX = (e.clientX - rect.left) / width - 0.5;
    const normalizedY = (e.clientY - rect.top) / height - 0.5;

    x.set(normalizedX);
    y.set(normalizedY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  // Fallback image if non provided
  const displayImage = imageUrl || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&auto=format&fit=crop&q=80';

  return (
    <div className={`perspective-1000 ${className}`}>
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d'
        }}
        whileHover={{ scale: 1.02 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="relative group cursor-pointer select-none w-full max-w-[320px] aspect-[2.5/3.5] mx-auto rounded-[28px] p-[1.5px] bg-gradient-to-br from-[#F59E0B]/80 via-white/10 to-[#00F2FE]/60 shadow-[0_10px_30px_rgba(0,0,0,0.8)] group-hover:shadow-[0_0_35px_rgba(245,158,11,0.35)] transition-shadow duration-500"
      >
        {/* Holographic Sheen Layer */}
        <motion.div
          style={{
            background: `radial-gradient(circle at ${sheenX} ${sheenY}, rgba(0, 242, 254, 0.15) 0%, rgba(245, 158, 11, 0.08) 35%, transparent 70%)`
          }}
          className="absolute inset-0 rounded-[27px] pointer-events-none z-20 transition-opacity opacity-0 group-hover:opacity-100 duration-300"
        />

        {/* Ambient Back Glow Effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-[#F59E0B]/30 via-white/5 to-[#00F2FE]/30 rounded-[30px] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />

        {/* Inner Card Container */}
        <div className="relative w-full h-full bg-[#1E2630] backdrop-blur-[24px] rounded-[26px] overflow-hidden flex flex-col justify-between border border-[#2D3748]">

          {/* TOP 60%: HERO IMAGE & FLOATING BADGES */}
          <div className="relative h-[62%] w-full overflow-hidden bg-[#161C22]">
            {/* Athlete Photo with Gradient Mask */}
            <img
              src={displayImage}
              alt={athleteName}
              className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
            />

            {/* Smooth Fade Gradient Mask into Dark Card Base */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#1E2630] via-[#1E2630]/30 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent" />

            {/* TOP BAR BADGES */}
            <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between z-10">
              
              {/* Rating / OVR Score Badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#161C22]/80 backdrop-blur-md border border-[#F59E0B]/50 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
                <Trophy className="w-3.5 h-3.5 text-[#F59E0B] stroke-[2]" />
                <span className="text-[11px] font-black font-mono text-[#F59E0B] tracking-wider">
                  {ratingScore} <span className="text-[9px] text-white/80 uppercase">OVR</span>
                </span>
              </div>

              {/* Position & Sport Floating Badge */}
              <div className="flex items-center gap-2">
                {onBookmarkToggle && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onBookmarkToggle(e);
                    }}
                    className={`p-1.5 rounded-full backdrop-blur-md border transition-all cursor-pointer ${
                      isBookmarked
                        ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B] shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                        : 'bg-[#161C22]/80 border-[#2D3748] text-[#94A3B8] hover:text-white hover:border-white'
                    }`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 stroke-[2] ${isBookmarked ? 'text-[#F59E0B]' : ''}`} />
                  </button>
                )}

                <div className="px-2.5 py-1 rounded-full bg-[#161C22]/80 backdrop-blur-md border border-[#00F2FE]/50 text-white font-mono font-black text-[10px] uppercase tracking-wider shadow-[0_0_12px_rgba(0,242,254,0.3)] flex items-center gap-1">
                  <span className="text-[#00F2FE] font-bold">{position || 'ATH'}</span>
                  <span className="text-white/40">•</span>
                  <span>{(sport || 'ATH').slice(0, 3).toUpperCase()}</span>
                </div>
              </div>

            </div>

            {/* NAME & SCHOOL OVERLAY AT BOTTOM OF HERO IMAGE */}
            <div className="absolute bottom-2 left-3.5 right-3.5 z-10 space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-lg font-black text-white uppercase tracking-tight line-clamp-1 drop-shadow-md">
                  {athleteName || 'Prospect'}
                </h3>
                {isVerified && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#10B981] text-slate-950 font-mono font-black text-[10px] uppercase shadow-[0_0_12px_rgba(16,185,129,0.5)]">
                    <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>SCOUT VERIFIED</span>
                  </span>
                )}
              </div>

              {/* Verified Badges Pill Row */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {keyStats.some(s => (s?.label || '').toUpperCase() === 'GPA' && parseFloat(String(s.value)) >= 3.5) && (
                  <span className="px-1.5 py-0.5 rounded bg-[#10B981]/25 border border-[#10B981]/60 text-[#10B981] font-mono font-black text-[9px] uppercase tracking-wider backdrop-blur-md">
                    ✓ VERIFIED GPA ({keyStats.find(s => (s?.label || '').toUpperCase() === 'GPA')?.value})
                  </span>
                )}
                {keyStats.some(s => (s?.label || '').toUpperCase().includes('40')) && (
                  <span className="px-1.5 py-0.5 rounded bg-[#00F2FE]/20 border border-[#00F2FE]/50 text-[#00F2FE] font-mono font-black text-[9px] uppercase tracking-wider backdrop-blur-md">
                    ⚡ {keyStats.find(s => (s?.label || '').toUpperCase().includes('40'))?.value} VERIFIED
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-[#94A3B8] font-medium pt-0.5">
                <span className="truncate flex items-center gap-1 text-[#94A3B8]">
                  <MapPin className="w-3 h-3 text-[#94A3B8] shrink-0 stroke-[2]" />
                  {highSchool || 'High School'}, {state || 'US'}
                </span>
                <span className="px-1.5 py-0.5 bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40 rounded font-black text-[9px]">
                  CLASS OF '{String(gradYear || '2026').slice(-2)}
                </span>
              </div>
            </div>

          </div>

          {/* LOWER 40%: BENTO MICRO-GRID CORE STATS */}
          <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
            
            {/* Core Stats Micro-Grid */}
            <div className="grid grid-cols-4 gap-1.5 bg-[#161C22]/60 p-2.5 rounded-2xl border border-[#2D3748] backdrop-blur-md text-center">
              {keyStats.slice(0, 4).map((stat, idx) => (
                <div key={idx} className="flex flex-col items-center justify-center p-1 bg-[#161C22] rounded-xl border border-[#2D3748] relative overflow-hidden">
                  <span className="text-xs sm:text-sm font-black font-mono text-white tracking-tight">
                    {stat?.value ?? '-'}
                  </span>
                  <span className="text-[9px] font-mono font-bold text-[#94A3B8] tracking-widest uppercase block mt-0.5">
                    {stat?.label ?? ''}
                  </span>
                  {/* Subtle verified dot for GPA or 40-yd dash */}
                  {((stat?.label || '') === 'GPA' || (stat?.label || '').includes('40')) && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#10B981]" title="Verified Metric" />
                  )}
                </div>
              ))}
            </div>

            {/* Card Action Footer / Verified Badge Indicator */}
            <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-[#94A3B8]">
              <span className="flex items-center gap-1 text-[#10B981] font-bold">
                <Sparkles className="w-3 h-3 stroke-[2] text-[#10B981]" />
                COACH-REVIEWED TAPE
              </span>
              <span className="text-[#F59E0B] font-bold group-hover:translate-x-0.5 transition-transform">
                VIEW SCOUT CARD →
              </span>
            </div>

          </div>

        </div>
      </motion.div>
    </div>
  );
};
