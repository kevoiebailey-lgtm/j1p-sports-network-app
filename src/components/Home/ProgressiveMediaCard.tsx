import React, { useState } from 'react';
import { Flame, Play, Eye, Share2, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';

export interface MediaFeedItem {
  id: string;
  athleteName: string;
  athleteAvatar: string;
  teamName: string;
  sport: string;
  classYear: string;
  thumbnailUrl: string;
  videoUrl?: string; // External stream URL (YouTube / Vimeo / Hudl)
  hypeCount: number;
  scoutNotes?: string;
  isVerified?: boolean;
}

interface ProgressiveMediaCardProps {
  item: MediaFeedItem;
  onOpenPlayer?: (url: string) => void;
}

export const ProgressiveMediaCard: React.FC<ProgressiveMediaCardProps> = ({ item, onOpenPlayer }) => {
  const [hype, setHype] = useState<number>(item.hypeCount);
  const [hasHyped, setHasHyped] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const handleHype = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHype((prev) => (hasHyped ? prev - 1 : prev + 1));
    setHasHyped(!hasHyped);
  };

  // Convert raw video links to embed format
  const getEmbedUrl = (url?: string) => {
    if (!url) return null;
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.split('v=')[1] || url.split('/').pop();
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`;
    }
    return url;
  };

  const embedUrl = getEmbedUrl(item.videoUrl);

  return (
    <div className="bg-[#212A31]/90 border border-slate-800 hover:border-[#E5B868]/50 rounded-3xl overflow-hidden transition-all shadow-xl group flex flex-col justify-between">
      
      {/* MEDIA CONTAINER */}
      <div className="relative aspect-video w-full bg-[#212A31] overflow-hidden">
        {isPlaying && embedUrl ? (
          <iframe
            src={embedUrl}
            title={item.athleteName}
            className="w-full h-full border-0"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        ) : (
          <>
            <img
              src={item.thumbnailUrl}
              alt={`${item.athleteName} highlight`}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#212A31] via-[#212A31]/20 to-transparent" />

            {/* Play Button Overlay */}
            <button
              onClick={() => {
                if (embedUrl) setIsPlaying(true);
                else onOpenPlayer?.(item.videoUrl || '');
              }}
              className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-[#E5B868] text-black flex items-center justify-center shadow-[0_0_20px_rgba(214,28,36,0.5)] transform scale-90 group-hover:scale-100 transition-all cursor-pointer z-10"
            >
              <Play className="w-5 h-5 fill-black ml-0.5" />
            </button>

            {/* Sport & Class Badge Overlay */}
            <div className="absolute top-3 right-3 z-10">
              <span className="bg-[#212A31]/80 border border-slate-800 text-[#E5B868] text-[10px] font-mono font-bold px-2.5 py-1 rounded-full backdrop-blur-md">
                {item.sport.toUpperCase()} • {item.classYear}
              </span>
            </div>
          </>
        )}
      </div>

      {/* ATHLETE META FOOTER */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src={item.athleteAvatar}
              alt={item.athleteName}
              loading="lazy"
              className="w-9 h-9 rounded-xl object-cover border border-slate-700"
            />
            <div>
              <h4 className="text-sm font-bold text-white leading-none">{item.athleteName}</h4>
              <p className="text-[11px] text-slate-400 font-mono mt-1">{item.teamName}</p>
            </div>
          </div>

          {/* Hype Action Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleHype}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              hasHyped
                ? 'bg-[#E5B868]/20 border-[#E5B868] text-[#E5B868] shadow-[0_0_12px_rgba(214,28,36,0.3)]'
                : 'bg-[#212A31] border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${hasHyped ? 'text-[#E5B868] fill-[#E5B868]' : ''}`} />
            <span>{hype}</span>
          </motion.button>
        </div>

        {/* Scout Notes Preview */}
        {item.scoutNotes && (
          <p className="text-xs text-slate-300 bg-[#212A31]/60 p-2.5 rounded-xl border border-slate-800/80 line-clamp-2">
            <span className="text-[#E5B868] font-mono font-bold">SCOUT NOTE: </span>
            {item.scoutNotes}
          </p>
        )}
      </div>
    </div>
  );
};
