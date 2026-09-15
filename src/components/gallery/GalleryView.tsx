import React, { useState, useEffect, useMemo } from 'react';
import { 
  Camera, 
  Sparkles, 
  Upload, 
  Filter, 
  Layers, 
  Search, 
  Zap, 
  Share2, 
  Download, 
  FolderPlus, 
  Image as ImageIcon, 
  ShieldCheck, 
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
  Lock,
  Eye,
  CheckCircle2,
  Grid,
  List,
  Aperture,
  AlertCircle,
  Plus
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useAuthRole, normalizeRole } from '../../hooks/useAuthRole';
import { useToast } from '../../context/ToastContext';
import { GalleryMediaItem } from '../../types';
import { AdminBatchUploadDesk } from '../EventGallery/AdminBatchUploadDesk';
import { GalleryLightboxModal } from '../EventGallery/GalleryLightboxModal';
import { GoogleDriveVideoUploadModal } from '../Drive/GoogleDriveVideoUploadModal';
import { usePaginatedQuery } from '../../hooks/usePaginatedQuery';
import { Loader2, Film } from 'lucide-react';

import { SportsGalleryImage } from '../RoleViews/Universal/SportsGalleryImage';
import { resolveStorageUrl } from '../../utils/storageUrlResolver';

const SEED_GALLERY_ITEMS: GalleryMediaItem[] = [];

const SPORT_PILLS = [
  'All Sports',
  '🎬 Game Film & Highlights',
  '🏈 Football',
  '🏀 Basketball',
  '⚽ Soccer',
  '🏃 Track & Field',
  '📣 Cheer',
  '🤼 Wrestling',
  '🥍 Lacrosse'
];

export const GalleryView: React.FC = () => {
  const { user, profile } = useAuth();
  const { role } = useAuthRole();
  const canonicalRole = normalizeRole(role);
  const { showToast } = useToast();

  const [showUploadDesk, setShowUploadDesk] = useState(false);
  const [showDriveVideoModal, setShowDriveVideoModal] = useState(false);
  const [selectedSport, setSelectedSport] = useState('All Sports');
  const [searchQuery, setSearchQuery] = useState('');
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  // Lightbox Modal state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const userRoleStr = (canonicalRole as string) || (profile?.role as string) || '';
  const isAdminOrDirector = ['admin', 'director', 'tournament_director'].includes(userRoleStr);

  const {
    data: items,
    loading,
    loadingMore,
    hasMore,
    observerTargetRef
  } = usePaginatedQuery<GalleryMediaItem>({
    collectionName: 'gallery',
    pageSize: 16,
    orderByField: 'createdAt',
    orderDirection: 'desc',
    transformDoc: async (docSnap) => {
      const data = docSnap.data() || {};
      const rawOriginal = data.originalUrl || data.imageUrl || data.url || '';
      const rawWatermarked = data.watermarkedUrl || data.previewUrl || data.imageUrl || data.originalUrl || '';

      const [resolvedOriginal, resolvedWatermarked] = await Promise.all([
        resolveStorageUrl(rawOriginal),
        resolveStorageUrl(rawWatermarked)
      ]);

      return {
        id: docSnap.id,
        originalUrl: resolvedOriginal || resolvedWatermarked || '',
        watermarkedUrl: resolvedWatermarked || resolvedOriginal || '',
        isWatermarked: !!data.isWatermarked,
        photographerId: data.photographerId || '',
        photographerName: data.photographerName || data.photographer || 'Official Media Partner',
        eventName: data.eventName || data.event || data.title || 'Tournament Media',
        albumName: data.albumName || data.album || 'General Action Shots',
        category: data.category || 'Game Action',
        sport: data.sport || 'Basketball',
        teams: Array.isArray(data.teams) ? data.teams.filter((t: any) => typeof t === 'string') : [],
        title: data.title || data.caption || 'Tournament Action Shot',
        caption: data.caption || '',
        hypesCount: typeof data.hypesCount === 'number' ? data.hypesCount : 12,
        userHypes: data.userHypes || {},
        createdAt: data.createdAt || new Date().toISOString(),
        resolution: data.resolution || '4K Ultra-HD',
        tags: Array.isArray(data.tags) ? data.tags.filter((t: any) => typeof t === 'string') : []
      };
    }
  });

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (!item) return false;

      const itemSport = (item.sport || '').toLowerCase();
      const itemEvent = (item.eventName || '').toLowerCase();
      const itemTitle = (item.title || '').toLowerCase();
      const itemPhotographer = (item.photographerName || '').toLowerCase();

      // Sport filter check
      if (selectedSport !== 'All Sports') {
        if (selectedSport.includes('Game Film')) {
          const isVideo = Boolean(
            item.videoUrl ||
            item.googleDriveFileId ||
            item.category === 'Game Film' ||
            item.category === 'Game Highlights' ||
            item.category === 'Video Reels' ||
            (typeof item.originalUrl === 'string' && (item.originalUrl.includes('drive.google.com') || item.originalUrl.match(/\.(mp4|mov|webm|m4v)/i)))
          );
          if (!isVideo) return false;
        } else {
          const cleanSelected = selectedSport.replace(/^[^\w]+/, '').trim().toLowerCase();
          if (!itemSport.includes(cleanSelected)) return false;
        }
      }

      // Search query check
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches = 
          itemTitle.includes(q) ||
          itemEvent.includes(q) ||
          itemSport.includes(q) ||
          itemPhotographer.includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [items, selectedSport, searchQuery]);

  const handleImageError = (id: string) => {
    setBrokenImages(prev => ({ ...prev, [id]: true }));
  };

  return (
    <div className="space-y-5 pb-16">
      {/* Mobile Floating Action Bar for Admin / Director */}
      {isAdminOrDirector && (
        <div className="sm:hidden sticky top-14 z-30 -mx-4 px-4 py-2.5 bg-[#090D16]/95 backdrop-blur-xl border-b border-[#00B8D4]/40 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00B8D4] animate-ping" />
            <span className="text-xs font-black text-white uppercase tracking-wider">Director Hub</span>
          </div>
          <button
            onClick={() => setShowUploadDesk(true)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#00B8D4] to-[#38BDF8] text-slate-950 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,184,212,0.4)] cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Upload 4K Media</span>
          </button>
        </div>
      )}

      {/* Hero Header */}
      <div className="p-6 rounded-3xl bg-[#090D16] border border-[#24324F] shadow-2xl space-y-5 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-[#00B8D4]/20 border border-[#00B8D4]/40 text-[#00B8D4] text-[10px] font-black tracking-wider uppercase font-mono">
                MAXPREPS 4K MEDIA FEED
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#FF6A00]/20 text-[#FF6A00] text-[10px] font-black uppercase font-mono">
                LASER TIMED
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              <Camera className="w-7 h-7 text-[#00B8D4]" />
              <span>Universal Sports Action Media Gallery</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              High-speed burst action, combine highlights, official podium medals, and tournament 4K captures.
            </p>
          </div>

          {/* Action Buttons: Batch Photos & 4K Game Film */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setShowDriveVideoModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(16,185,129,0.35)] flex items-center gap-2 cursor-pointer"
            >
              <Film className="w-4 h-4 stroke-[2.5]" />
              <span>Upload Game Film (Drive)</span>
            </button>

            {isAdminOrDirector && (
              <button
                onClick={() => setShowUploadDesk(true)}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#00B8D4] to-[#38BDF8] hover:from-[#38BDF8] hover:to-[#00B8D4] text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(0,184,212,0.35)] flex items-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4 stroke-[2.5]" />
                <span>Upload Media Batch</span>
              </button>
            )}
          </div>
        </div>

        {/* Sport Selector Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {SPORT_PILLS.map((sp) => {
            const active = selectedSport === sp;
            return (
              <button
                key={sp}
                onClick={() => setSelectedSport(sp)}
                className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? 'bg-[#FF6A00] text-white shadow-[0_0_12px_rgba(255,106,0,0.4)]'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                {sp}
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by event, athlete, team matchup, or photographer..."
            className="w-full h-11 pl-10 pr-4 bg-[#263238] border border-[#24324F] focus:border-[#00B8D4] rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 outline-none transition-all font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Responsive Grid Layout */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
          <span>Showing {filteredItems.length} High-Res Sports Action Shot{filteredItems.length === 1 ? '' : 's'}</span>
          <span className="text-[#00B8D4] font-mono">⚡ 4K Lightbox Enabled</span>
        </div>

        {/* The Exact Responsive Grid Specification: grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filteredItems.map((photo, idx) => {
            const isBroken = brokenImages[photo.id];

            return (
              <div
                key={photo.id}
                onClick={() => setLightboxIndex(idx)}
                className="group relative w-full bg-[#263238] border border-[#24324F] hover:border-[#00B8D4] rounded-xl overflow-hidden shadow-lg hover:shadow-[0_0_20px_rgba(0,184,212,0.25)] transition-all duration-300 cursor-pointer flex flex-col"
              >
                {/* Image Card Container with aspect-[4/3] rounded-xl bg-[#263238] */}
                <div className="relative w-full aspect-[4/3] rounded-t-xl bg-[#263238] overflow-hidden">
                  <SportsGalleryImage
                    src={photo.watermarkedUrl || photo.originalUrl}
                    alt={photo.title || photo.eventName}
                    sport={photo.sport || 'Basketball'}
                    title={photo.title || photo.eventName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    containerClassName="w-full h-full relative overflow-hidden bg-[#141B2D]"
                  />

                  {/* Top Badges */}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                    <span className="px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md border border-[#FF6A00]/40 text-[#FF6A00] text-[9px] font-black uppercase tracking-wider">
                      {photo.sport}
                    </span>

                    {photo.isWatermarked && (
                      <span className="px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md border border-[#00B8D4]/40 text-[#00B8D4] text-[8px] font-mono font-bold uppercase">
                        Watermark
                      </span>
                    )}
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#090D16] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                    <span className="text-xs font-black text-[#00B8D4] flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>View 4K Lightbox</span>
                    </span>
                  </div>
                </div>

                {/* Card Details */}
                <div className="p-3 flex-1 flex flex-col justify-between space-y-1.5 bg-[#141B2D]">
                  <div>
                    <h3 className="text-xs font-bold text-white tracking-tight line-clamp-1 group-hover:text-[#00B8D4] transition-colors">
                      {photo.title || photo.eventName}
                    </h3>
                    <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                      {photo.eventName}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-[#24324F]/60 text-[10px] text-slate-400">
                    <span className="truncate max-w-[65%] font-medium">
                      📷 {photo.photographerName?.split('•')[0]?.trim() || 'Pro Media'}
                    </span>
                    <span className="flex items-center gap-1 font-mono font-bold text-[#FF6A00]">
                      <Zap className="w-3 h-3 fill-[#FF6A00]" />
                      <span>{photo.hypesCount || 0}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Intersection Observer for infinite scrolling */}
        <div ref={observerTargetRef} className="py-6 flex justify-center items-center">
          {loadingMore && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#263238] border border-[#00B8D4]/40 text-[#00B8D4] text-xs font-bold font-mono tracking-wider animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-[#00B8D4]" />
              <span>STREAMING MORE 4K MEDIA ITEMS...</span>
            </div>
          )}
          {!hasMore && filteredItems.length > 0 && (
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-widest">
              ✓ All {filteredItems.length} media photos loaded
            </span>
          )}
        </div>

        {filteredItems.length === 0 && !loading && (
          <div className="text-center py-16 bg-[#263238]/60 border border-[#24324F] rounded-2xl p-8">
            <Camera className="w-12 h-12 text-slate-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">No Photos Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              No tournament action shots match your current category or search criteria.
            </p>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxIndex !== null && (
        <GalleryLightboxModal
          isOpen={lightboxIndex !== null}
          item={lightboxIndex !== null && filteredItems[lightboxIndex] ? filteredItems[lightboxIndex] : null}
          itemsList={filteredItems}
          currentIndex={lightboxIndex ?? 0}
          onClose={() => setLightboxIndex(null)}
          onSelectIndex={(index) => setLightboxIndex(index)}
        />
      )}

      {/* Admin Batch Upload Modal */}
      {showUploadDesk && (
        <AdminBatchUploadDesk
          isOpen={showUploadDesk}
          onClose={() => setShowUploadDesk(false)}
          onUploadSuccess={() => {
            setShowUploadDesk(false);
            showToast('success', '4K Media Uploaded', 'Batch uploaded and indexed successfully.');
          }}
        />
      )}

      {/* Google Drive Raw Video Uploader */}
      {showDriveVideoModal && (
        <GoogleDriveVideoUploadModal
          isOpen={showDriveVideoModal}
          onClose={() => setShowDriveVideoModal(false)}
          onUploadSuccess={(newFilm) => {
            setShowDriveVideoModal(false);
            showToast('success', 'Game Film Ready', 'Video uploaded to Google Drive and indexed.');
          }}
        />
      )}
    </div>
  );
};

export default GalleryView;
