import React, { useState } from 'react';
import { 
  Play, 
  Camera, 
  Film, 
  Tv, 
  Bookmark, 
  ShoppingCart, 
  Download, 
  CheckCircle2, 
  Eye, 
  Heart, 
  Share2, 
  Sparkles,
  Maximize2,
  Calendar,
  MapPin,
  Clock,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import { MediaVaultItem } from '../../types/mediaVault';
import { SportsGalleryImage } from '../RoleViews/Universal/SportsGalleryImage';

interface MediaCardProps {
  item: MediaVaultItem;
  onOpenItem: (item: MediaVaultItem) => void;
  onOpenPurchase: (item: MediaVaultItem) => void;
  onTogglePin: (item: MediaVaultItem) => void;
  onToggleLike: (itemId: string) => void;
  isLiked?: boolean;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  item,
  onOpenItem,
  onOpenPurchase,
  onTogglePin,
  onToggleLike,
  isLiked = false
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isPhoto = item.type === 'photo';
  const isVideo = item.type === 'video_reel' || item.type === 'raw_tape';
  const isPurchased = !!item.isPurchased;
  const isPinned = !!item.isPinnedToProfile;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative rounded-2xl overflow-hidden bg-[#1E2630] border border-[#2D3748] hover:border-[#F59E0B]/60 shadow-xl transition-all duration-300 flex flex-col justify-between"
    >
      {/* 1. Media Preview Container */}
      <div 
        onClick={() => onOpenItem(item)}
        className="relative aspect-video w-full overflow-hidden bg-[#161C22] cursor-pointer select-none"
      >
        <SportsGalleryImage
          src={item.thumbnailUrl || item.mediaUrl}
          alt={item.title}
          sport={item.sport || 'Basketball'}
          title={item.title}
          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
          containerClassName="w-full h-full relative overflow-hidden bg-[#161C22]"
        />

        {/* Subtle Watermark on Unpurchased Photos */}
        {isPhoto && !isPurchased && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25 group-hover:opacity-35 transition-opacity">
            <div className="rotate-[-25deg] border-2 border-white/80 py-1.5 px-6 rounded-lg text-white font-mono font-black text-xs sm:text-sm tracking-widest uppercase bg-black/40 backdrop-blur-xs">
              JUST1PLAY PRO PREVIEW
            </div>
          </div>
        )}

        {/* Gradient Shadow Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#161C22] via-transparent to-black/40 opacity-80 group-hover:opacity-90 transition-opacity" />

        {/* Top Badges: Media Type & Sport */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
          <div className="flex items-center gap-1.5">
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 backdrop-blur-md shadow-md ${
              item.type === 'photo' 
                ? 'bg-amber-500/90 text-slate-950 font-black' 
                : item.type === 'video_reel'
                ? 'bg-[#00F2FE]/90 text-slate-950 font-black'
                : 'bg-purple-500/90 text-white font-black'
            }`}>
              {item.type === 'photo' && <Camera className="w-3 h-3" />}
              {item.type === 'video_reel' && <Film className="w-3 h-3" />}
              {item.type === 'raw_tape' && <Tv className="w-3 h-3" />}
              <span>{item.type === 'photo' ? 'Photo' : item.type === 'video_reel' ? 'Reel' : 'Raw Tape'}</span>
            </span>

            <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-white text-[10px] font-mono">
              {item.sport}
            </span>
          </div>

          {/* Purchased Status Badge */}
          {isPhoto && isPurchased && (
            <span className="px-2 py-0.5 rounded-md bg-[#10B981] text-slate-950 text-[10px] font-mono font-black uppercase flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.5)]">
              <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
              <span>Purchased</span>
            </span>
          )}

          {/* Video Duration */}
          {isVideo && item.duration && (
            <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/15 text-white text-[10px] font-mono flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#00F2FE]" />
              <span>{item.duration}</span>
            </span>
          )}
        </div>

        {/* Video Reel Play Badge - Electric Cyan */}
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="w-12 h-12 rounded-full bg-[#00F2FE]/90 text-slate-950 flex items-center justify-center shadow-[0_0_25px_rgba(0,242,254,0.6)] transform group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5 fill-slate-950 ml-0.5 stroke-[2]" />
            </div>
          </div>
        )}

        {/* Hover Action Overlay: Pin to Profile & Fullscreen Expand */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(item);
            }}
            className={`p-1.5 rounded-lg backdrop-blur-md border transition-all cursor-pointer ${
              isPinned
                ? 'bg-[#F59E0B] text-slate-950 border-[#F59E0B] shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                : 'bg-black/60 text-slate-300 border-white/15 hover:text-white hover:bg-black/80'
            }`}
            title={isPinned ? 'Pinned to your Scout Profile' : 'Pin to Scout Profile'}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isPinned ? 'fill-slate-950' : ''}`} />
          </button>
        </div>

        {/* Bottom Bar: Resolution & Event */}
        <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[10px] font-mono text-slate-300 z-10 pointer-events-none">
          <span className="truncate max-w-[180px] font-bold text-white drop-shadow-md">
            {item.eventName}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-black/60 border border-white/10 text-[#00F2FE] shrink-0 font-bold">
            {item.resolution}
          </span>
        </div>
      </div>

      {/* 2. Metadata & Tagged Athletes */}
      <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-1.5">
          <h3 
            onClick={() => onOpenItem(item)}
            className="text-xs sm:text-sm font-bold text-white group-hover:text-[#F59E0B] transition-colors line-clamp-1 cursor-pointer"
          >
            {item.title}
          </h3>

          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
            {item.description}
          </p>

          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 pt-0.5">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[#F59E0B]" />
              <span>{item.eventDate}</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 truncate max-w-[140px]">
              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">{item.venue.split(',')[0]}</span>
            </span>
          </div>
        </div>

        {/* Tagged Athletes Strip */}
        {item.taggedAthletes && item.taggedAthletes.length > 0 && (
          <div className="pt-2 border-t border-[#2D3748]/60 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-2 overflow-hidden">
                {item.taggedAthletes.map((athlete, idx) => (
                  <img
                    key={idx}
                    src={athlete.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                    alt={athlete.name}
                    className="inline-block h-6 w-6 rounded-full ring-2 ring-[#1E2630] object-cover"
                    title={`${athlete.name} • ${athlete.position || 'Athlete'}`}
                  />
                ))}
              </div>
              <span className="text-[10px] font-mono text-slate-300 truncate max-w-[130px] font-medium">
                {item.taggedAthletes[0].name}
                {item.taggedAthletes.length > 1 && ` +${item.taggedAthletes.length - 1}`}
              </span>
            </div>

            <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
              <Eye className="w-3 h-3 text-slate-400" />
              <span>{item.viewCount.toLocaleString()}</span>
            </span>
          </div>
        )}

        {/* 3. Action Buttons Row */}
        <div className="pt-2 border-t border-[#2D3748] flex items-center gap-2">
          {isPhoto ? (
            isPurchased ? (
              <button
                onClick={() => onOpenItem(item)}
                className="flex-1 py-2 px-3 rounded-xl bg-[#10B981] hover:bg-[#059669] text-slate-950 text-xs font-mono font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Download 4K RAW</span>
              </button>
            ) : (
              <button
                onClick={() => onOpenPurchase(item)}
                className="flex-1 py-2 px-3 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-slate-950 text-xs font-mono font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all transform hover:scale-[1.01] cursor-pointer"
              >
                <ShoppingCart className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Buy High-Res (${item.price.toFixed(2)})</span>
              </button>
            )
          ) : (
            <button
              onClick={() => onOpenItem(item)}
              className="flex-1 py-2 px-3 rounded-xl bg-[#00F2FE]/15 hover:bg-[#00F2FE]/25 border border-[#00F2FE]/50 text-[#00F2FE] text-xs font-mono font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-[#00F2FE]" />
              <span>Watch Reel</span>
            </button>
          )}

          {/* Like Heart */}
          <button
            onClick={() => onToggleLike(item.id)}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isLiked 
                ? 'bg-red-500/20 text-red-500 border-red-500/50' 
                : 'bg-[#161C22] text-slate-400 hover:text-white border-[#2D3748]'
            }`}
            title="Like media"
          >
            <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-red-500' : ''}`} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
