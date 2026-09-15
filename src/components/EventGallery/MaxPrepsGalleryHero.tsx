import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  Sparkles, 
  Calendar, 
  MapPin, 
  ChevronRight, 
  Image as ImageIcon, 
  Share2, 
  Award, 
  CheckCircle2, 
  Play, 
  Layers,
  ArrowUpRight,
  Plus
} from 'lucide-react';
import { Album } from '../../types';

interface MaxPrepsGalleryHeroProps {
  featuredAlbums: Album[];
  onSelectAlbum: (album: Album) => void;
  onOpenMediaKit: () => void;
  mediaKitCount?: number;
  savedPhotosCount?: number;
  isAdminOrCreator?: boolean;
  onCreateAlbum?: () => void;
}

export const MaxPrepsGalleryHero: React.FC<MaxPrepsGalleryHeroProps> = ({
  featuredAlbums,
  onSelectAlbum,
  onOpenMediaKit,
  mediaKitCount = 0,
  savedPhotosCount = 0,
  isAdminOrCreator = false,
  onCreateAlbum
}) => {
  const [activeHeroIndex, setActiveHeroIndex] = useState<number>(0);

  if (!featuredAlbums || featuredAlbums.length === 0) return null;

  const currentAlbum = featuredAlbums[activeHeroIndex] || featuredAlbums[0];
  const effectiveCount = savedPhotosCount || mediaKitCount;

  return (
    <div className="relative rounded-3xl overflow-hidden bg-zinc-950 border border-white/15 shadow-2xl">
      {/* Dynamic Background Image with subtle Ken Burns zoom */}
      <div className="relative h-[420px] sm:h-[480px] w-full overflow-hidden">
        <AnimatePresence mode="wait">
          {(currentAlbum.coverPhotoUrl && !currentAlbum.coverPhotoUrl.includes('unsplash.com')) || (currentAlbum.thumbnailUrl && !currentAlbum.thumbnailUrl.includes('unsplash.com')) ? (
            <motion.img
              key={currentAlbum.id || activeHeroIndex}
              src={currentAlbum.coverPhotoUrl || currentAlbum.thumbnailUrl}
              alt={currentAlbum.title}
              initial={{ scale: 1.05, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#090D16] via-[#141B2D] to-[#1E293B]" />
          )}
        </AnimatePresence>

        {/* Cinematic Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20 backdrop-blur-[1px]" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent" />

        {/* Orange Accent Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF6A00]/15 rounded-full blur-[140px] pointer-events-none" />

        {/* Content Container */}
        <div className="absolute inset-0 p-6 sm:p-10 flex flex-col justify-between z-10">
          
          {/* Top Bar inside Hero */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#FF6A00] text-black font-black text-[10px] sm:text-xs font-mono uppercase tracking-widest flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,106,0,0.5)]">
                <Sparkles className="w-3.5 h-3.5 fill-black" />
                <span>MAXPREPS PHOTOGRAPHY SPOTLIGHT</span>
              </span>

              <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-slate-300 text-xs font-mono">
                <Camera className="w-3.5 h-3.5 text-[#FF6A00]" />
                <span>OFFICIAL VERIFIED GAME REELS</span>
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={onOpenMediaKit}
                className="px-4 py-2 rounded-xl bg-black/70 hover:bg-black text-white text-xs font-mono font-bold uppercase tracking-wider border border-white/20 hover:border-[#FF6A00] transition-all flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <span className="text-[#FF6A00]">★</span>
                <span>Scout Media Kit</span>
                {effectiveCount > 0 && (
                  <span className="bg-[#FF6A00] text-black font-mono font-black text-[10px] px-2 py-0.5 rounded-full">
                    {effectiveCount}
                  </span>
                )}
              </button>

              {isAdminOrCreator && onCreateAlbum && (
                <button
                  onClick={onCreateAlbum}
                  className="px-4 py-2 rounded-xl bg-[#FF6A00] hover:bg-orange-500 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-[0_0_20px_rgba(255,106,0,0.5)] cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span className="hidden sm:inline">NEW ALBUM</span>
                </button>
              )}
            </div>
          </div>

          {/* Bottom Main Content & Matchup Details */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
            <div className="lg:col-span-8 space-y-3">
              {/* Event Metadata Badges */}
              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-300 font-mono">
                <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/15 text-[#FF6A00] font-bold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{currentAlbum.date}</span>
                </span>

                <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/15 text-white font-bold flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#FF6A00]" />
                  <span>{currentAlbum.photoCount || 12} High-Res Photos</span>
                </span>

                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Photos by Just1Play Pro Media</span>
                </span>
              </div>

              {/* Title / Matchup */}
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-black italic uppercase text-white tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] leading-tight">
                {currentAlbum.title}
              </h1>

              {/* Description */}
              <p className="text-xs sm:text-sm text-slate-200 max-w-2xl line-clamp-2 leading-relaxed font-sans drop-shadow-md">
                {currentAlbum.description || 'High-speed 4K action photography, recruiter combine media, and championship portraits.'}
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => onSelectAlbum(currentAlbum)}
                  className="px-6 py-3.5 rounded-2xl bg-[#FF6A00] hover:bg-[#ff7b1a] text-black font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-[0_0_25px_rgba(255,106,0,0.6)] cursor-pointer transform hover:scale-[1.02]"
                >
                  <span>BROWSE FULL GALLERY</span>
                  <ArrowUpRight className="w-4 h-4 stroke-[3]" />
                </button>

                <button
                  onClick={() => onSelectAlbum(currentAlbum)}
                  className="px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider backdrop-blur-md border border-white/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>ORDER PRINTS & HD DOWNLOADS</span>
                </button>
              </div>
            </div>

            {/* Right Mini Carousel Switcher */}
            {featuredAlbums.length > 1 && (
              <div className="lg:col-span-4 hidden lg:flex flex-col gap-2 bg-black/60 backdrop-blur-md p-3.5 rounded-2xl border border-white/15">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>TRENDING SPOTLIGHTS</span>
                  <span className="text-[#FF6A00]">{activeHeroIndex + 1}/{featuredAlbums.length}</span>
                </span>

                <div className="space-y-2">
                  {featuredAlbums.slice(0, 3).map((alb, idx) => {
                    const isActive = idx === activeHeroIndex;
                    return (
                      <div
                        key={alb.id || idx}
                        onClick={() => setActiveHeroIndex(idx)}
                        className={`p-2 rounded-xl flex items-center gap-3 cursor-pointer transition-all border ${
                          isActive
                            ? 'bg-[#FF6A00]/20 border-[#FF6A00] text-white'
                            : 'bg-white/5 border-transparent hover:bg-white/10 text-slate-300'
                        }`}
                      >
                        <img
                          src={alb.coverPhotoUrl || alb.thumbnailUrl}
                          alt={alb.title}
                          className="w-12 h-10 object-cover rounded-lg shrink-0 border border-white/10"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold truncate text-white uppercase italic">{alb.title}</p>
                          <p className="text-[10px] font-mono text-slate-400">{alb.date} • {alb.photoCount || 10} Photos</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
