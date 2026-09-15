import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  Heart, 
  ZoomIn, 
  Download, 
  Share2, 
  UserCheck, 
  Camera, 
  ArrowRight,
  Flame
} from 'lucide-react';
import { Photo, Album } from '../../types';

export interface ActionShotItem {
  id: string;
  imageUrl: string;
  title: string;
  athlete?: string;
  athleteName?: string;
  jerseyNumber?: string;
  sport: string;
  team?: string;
  school?: string;
  photographer?: string;
  likes?: number;
  likesCount?: number;
  date?: string;
  albumId?: string;
}

interface TopActionShotsCarouselProps {
  actionShots: ActionShotItem[];
  onOpenPhoto: (shot: ActionShotItem) => void;
  onDownloadPhoto?: (shot: ActionShotItem) => void;
}

export const TopActionShotsCarousel: React.FC<TopActionShotsCarouselProps> = ({
  actionShots,
  onOpenPhoto,
  onDownloadPhoto
}) => {
  const [likedShots, setLikedShots] = useState<Record<string, boolean>>({});

  const toggleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedShots(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  if (!actionShots || actionShots.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#FF6A00]/20 text-[#FF6A00] border border-[#FF6A00]/40">
            <Flame className="w-5 h-5 fill-[#FF6A00]" />
          </div>
          <div>
            <h2 className="text-xl font-black italic uppercase tracking-wider text-white flex items-center gap-2">
              <span>TOP ACTION SHOTS OF THE WEEK</span>
              <span className="px-2 py-0.5 rounded text-[9px] bg-[#FF6A00] text-black font-black font-mono">CURATED</span>
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Recruiter-favorite 4K game stills & game-winning action portraits
            </p>
          </div>
        </div>
      </div>

      {/* Horizontal Scroll Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {actionShots.map((shot) => {
          const isLiked = !!likedShots[shot.id];
          const rawLikes = shot.likes ?? shot.likesCount ?? 120;
          const totalLikes = rawLikes + (isLiked ? 1 : 0);
          const athleteLabel = shot.athlete || (shot.athleteName ? `#${shot.jerseyNumber || ''} ${shot.athleteName}` : null);
          const teamLabel = shot.school || shot.team || 'Just1Play Media';

          return (
            <motion.div
              key={shot.id}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              onClick={() => onOpenPhoto(shot)}
              className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-black border border-white/15 hover:border-[#FF6A00] transition-all cursor-pointer shadow-xl flex flex-col justify-between p-3.5"
            >
              {/* Photo Image with Zoom */}
              <img
                src={shot.imageUrl}
                alt={shot.title}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />

              {/* Dynamic Gradient Shade */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/60 opacity-80 group-hover:opacity-70 transition-opacity" />

              {/* Top Header Tags */}
              <div className="relative z-10 flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-[10px] font-black font-mono uppercase text-[#FF6A00]">
                  {shot.sport}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => toggleLike(shot.id, e)}
                    className={`p-1.5 rounded-full backdrop-blur-md border transition-all cursor-pointer ${
                      isLiked
                        ? 'bg-red-600 text-white border-red-500'
                        : 'bg-black/70 text-slate-300 hover:text-white border-white/20'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-white' : ''}`} />
                  </button>

                  {onDownloadPhoto && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownloadPhoto(shot);
                      }}
                      title="Digital Download 4K"
                      className="p-1.5 rounded-full bg-black/70 hover:bg-[#FF6A00] text-slate-300 hover:text-black border border-white/20 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Bottom Athlete & Team Details */}
              <div className="relative z-10 space-y-2">
                {athleteLabel && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FF6A00]/20 border border-[#FF6A00]/40 backdrop-blur-md text-white text-[11px] font-black font-mono uppercase">
                    <UserCheck className="w-3 h-3 text-[#FF6A00]" />
                    <span>{athleteLabel}</span>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-black italic uppercase text-white tracking-wide group-hover:text-[#FF6A00] transition-colors line-clamp-1">
                    {shot.title}
                  </h4>
                  <p className="text-[10px] font-mono text-slate-300 truncate">
                    {teamLabel} {shot.photographer ? `• By ${shot.photographer}` : ''}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[10px] font-mono text-slate-400">
                  <span className="flex items-center gap-1 text-slate-300">
                    <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                    <span>{totalLikes} scout likes</span>
                  </span>

                  <span className="text-[#FF6A00] font-bold group-hover:underline flex items-center gap-0.5">
                    <span>VIEW 4K</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
