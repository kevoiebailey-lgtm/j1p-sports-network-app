import React from 'react';
import { motion } from 'motion/react';
import { 
  Calendar, 
  MapPin, 
  Image as ImageIcon, 
  Share2, 
  Lock, 
  Globe, 
  Eye, 
  EyeOff, 
  Trash2, 
  Download, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { Album } from '../../types';
import { SportsGalleryImage } from '../RoleViews/Universal/SportsGalleryImage';

interface MaxPrepsGalleryCardProps {
  album: Album;
  onClick: () => void;
  onShare: (e: React.MouseEvent) => void;
  onDownloadAlbum?: (e: React.MouseEvent) => void;
  isAdminOrCreator?: boolean;
  onToggleVisibility?: (e: React.MouseEvent) => void;
  onDeleteAlbum?: (e: React.MouseEvent) => void;
}

export const MaxPrepsGalleryCard: React.FC<MaxPrepsGalleryCardProps> = ({
  album,
  onClick,
  onShare,
  onDownloadAlbum,
  isAdminOrCreator,
  onToggleVisibility,
  onDeleteAlbum
}) => {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.25 }}
      onClick={onClick}
      className="group relative rounded-3xl overflow-hidden cursor-pointer border border-white/15 hover:border-[#FF6A00] transition-all duration-300 shadow-2xl bg-zinc-950 flex flex-col justify-between"
    >
      {/* Top Image Section */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-black">
        <SportsGalleryImage
          src={album.coverPhotoUrl || album.thumbnailUrl}
          alt={album.title}
          sport={album.sport || 'Sports'}
          title={album.title}
          className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 brightness-95 group-hover:brightness-105"
          containerClassName="w-full h-full relative overflow-hidden bg-black"
        />

        {/* Overlay Dark Tint */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-black/60" />

        {/* Top Badges */}
        <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between z-10">
          <span className="px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-[10px] font-mono text-white font-bold flex items-center gap-1.5 shadow-md">
            <Calendar className="w-3 h-3 text-[#FF6A00]" />
            <span>{album.date}</span>
          </span>

          <div className="flex items-center gap-1.5">
            {album.visibilityStatus === 'private' ? (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[10px] font-mono font-bold flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>PRIVATE</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1">
                <Globe className="w-3 h-3" />
                <span>VERIFIED</span>
              </span>
            )}

            <button
              onClick={onShare}
              title="Share Gallery"
              className="p-1.5 rounded-full bg-black/70 hover:bg-[#FF6A00] text-slate-300 hover:text-black transition-colors cursor-pointer border border-white/20"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>

            {isAdminOrCreator && (
              <>
                <button
                  onClick={onToggleVisibility}
                  title="Toggle Visibility"
                  className="p-1.5 rounded-full bg-black/70 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer border border-white/20"
                >
                  {album.visibilityStatus === 'public' ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-amber-400" />}
                </button>
                <button
                  onClick={onDeleteAlbum}
                  title="Delete Album"
                  className="p-1.5 rounded-full bg-black/70 hover:bg-red-500 text-slate-300 hover:text-white transition-colors cursor-pointer border border-white/20"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Bottom Image Photo Count Badge */}
        <div className="absolute bottom-3 right-3 z-10">
          <span className="px-2.5 py-1 rounded-xl bg-black/80 backdrop-blur-md border border-white/20 text-[11px] font-mono font-bold text-[#FF6A00] flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5" />
            <span>{album.photoCount || 10} Photos</span>
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-1.5">
          <h3 className="text-lg font-black italic uppercase text-white tracking-wide group-hover:text-[#FF6A00] transition-colors line-clamp-1">
            {album.title}
          </h3>

          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed font-sans">
            {album.description || 'High-resolution official media photos from this athletic competition.'}
          </p>
        </div>

        {/* Card Footer: Photographer Info & CTA Button */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-[#FF6A00]/20 border border-[#FF6A00]/40 flex items-center justify-center text-[#FF6A00] text-xs font-black shrink-0">
              J1P
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-200 truncate flex items-center gap-1">
                <span>Just1Play Pro Media</span>
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              </p>
              <p className="text-[9px] font-mono text-slate-400">Tri-State Media Desk</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onDownloadAlbum && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDownloadAlbum(e);
                }}
                title="Download Album Photos"
                className="p-2 rounded-xl bg-white/5 hover:bg-[#FF6A00] text-slate-300 hover:text-black border border-white/10 hover:border-[#FF6A00] transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
              </button>
            )}

            <span className="p-2 rounded-xl bg-[#FF6A00]/10 text-[#FF6A00] group-hover:bg-[#FF6A00] group-hover:text-black transition-all">
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
