import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  Camera,
  Video,
  Trophy,
  Shield,
  Film,
  PlaySquare,
  Zap,
  MessageSquare,
  Sparkles,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Play,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ActivityItem, ActivityType, subscribeToActivityStream } from '../../services/activityStreamService';
import { Link } from 'react-router-dom';

interface AlbumPreviewState {
  imageUrl: string;
  title: string;
  description: string;
  authorName: string;
  authorRole?: string;
  targetUrl: string;
  albumName?: string;
  photoCount?: number;
}

export const UniversalActivityStream: React.FC = () => {
  const { openModal, syncSignal } = useApp();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | ActivityType>('all');
  const [selectedSport, setSelectedSport] = useState<string>('All');
  const [selectedAlbumPreview, setSelectedAlbumPreview] = useState<AlbumPreviewState | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToActivityStream(
      {
        sport: selectedSport !== 'All' ? selectedSport : undefined,
        type: activeFilter !== 'all' ? activeFilter : undefined,
        limitCount: 40
      },
      (items) => {
        setActivities(items);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activeFilter, selectedSport, syncSignal]);

  // Dedicated contextual event icons
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'album_sync':
      case 'media_upload':
        return <Camera className="w-5 h-5 text-cyan-400" />;
      case 'highlight_added':
      case 'video_highlight':
        return <Video className="w-5 h-5 text-[#00F0D0]" />;
      case 'tournament_event':
      case 'bracket_updated':
        return <Trophy className="w-5 h-5 text-[#FFB800]" />;
      case 'play_published':
      case 'tactical_play':
        return <Shield className="w-5 h-5 text-slate-300" />;
      case 'combine_logged':
        return <Zap className="w-5 h-5 text-[#FF6A00]" />;
      case 'post_created':
        return <MessageSquare className="w-5 h-5 text-pink-400" />;
      default:
        return <Activity className="w-5 h-5 text-cyan-400" />;
    }
  };

  // Dedicated contextual badge styling
  const getActivityBadge = (type: string) => {
    switch (type) {
      case 'album_sync':
      case 'media_upload':
        return { label: 'MEDIA SYNC', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' };
      case 'highlight_added':
      case 'video_highlight':
        return { label: 'GAME FILM', color: 'bg-[#00F0D0]/20 text-[#00F0D0] border-[#00F0D0]/40' };
      case 'tournament_event':
      case 'bracket_updated':
        return { label: 'TOURNAMENT', color: 'bg-[#FFB800]/20 text-[#FFB800] border-[#FFB800]/40' };
      case 'play_published':
      case 'tactical_play':
        return { label: 'PLAYBOOK', color: 'bg-slate-800 text-slate-300 border-slate-700' };
      case 'combine_logged':
        return { label: 'COMBINE VERIFIED', color: 'bg-[#FF6A00]/20 text-[#FF6A00] border-[#FF6A00]/40' };
      case 'post_created':
        return { label: 'LOCKER ROOM', color: 'bg-pink-500/20 text-pink-300 border-pink-500/40' };
      default:
        return { label: 'ACTIVITY', color: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 py-6 pb-36 font-sans text-slate-100">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-[#12151C] border border-white/[0.08] p-6 sm:p-8 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00F0D0]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00F0D0]/15 border border-[#00F0D0]/30 text-[#00F0D0] text-xs font-mono font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Real-Time Championship Stream</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white italic uppercase tracking-tight font-sans">
              Universal <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00F0D0] via-teal-300 to-amber-300">Activity Stream</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-mono max-w-xl leading-relaxed">
              Live athletic broadcasts, verified highlight film, 4K photo album syncs, playbook audibles, and tournament bracket updates across all courts and fields.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              to="/watch"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00F0D0] to-teal-400 hover:from-[#00d6b9] hover:to-teal-300 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(0,240,208,0.25)] active:scale-[0.97]"
            >
              <Film className="w-4 h-4" />
              <span>Watch Vault</span>
            </Link>
            <Link
              to="/playbook"
              className="px-4 py-2.5 rounded-xl bg-[#181D26] hover:bg-[#1E2532] text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all border border-white/10 hover:border-white/25 active:scale-[0.97]"
            >
              <Shield className="w-4 h-4 text-slate-300" />
              <span>Playbook Lab</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Sport Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#12151C] border border-white/[0.08] p-3 rounded-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Activities' },
            { id: 'album_sync', label: 'Media Sync' },
            { id: 'highlight_added', label: 'Game Film' },
            { id: 'tournament_event', label: 'Tournaments' },
            { id: 'play_published', label: 'Playbook' },
            { id: 'combine_logged', label: 'Combine' },
            { id: 'post_created', label: 'Locker Room' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer active:scale-[0.97] ${
                activeFilter === f.id
                  ? 'bg-[#00F0D0]/15 text-[#00F0D0] border border-[#00F0D0]/50 shadow-[0_0_12px_rgba(0,240,208,0.2)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <select
            value={selectedSport}
            onChange={(e) => setSelectedSport(e.target.value)}
            className="bg-[#181D26] border border-white/10 text-xs text-white rounded-xl px-3 py-1.5 outline-none font-mono focus:border-[#00F0D0]/50 cursor-pointer"
          >
            <option value="All">All Sports</option>
            <option value="Basketball">Basketball</option>
            <option value="Football">Football</option>
            <option value="Cheerleading">Cheerleading</option>
            <option value="Baseball">Baseball</option>
            <option value="Soccer">Soccer</option>
            <option value="Track">Track &amp; Field</option>
          </select>
        </div>
      </div>

      {/* Activity Feed Cards */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 rounded-2xl bg-[#12151C] border border-white/[0.08] animate-pulse" />
          ))}
        </div>
      ) : activities.length > 0 ? (
        <div className="space-y-3.5">
          {activities.map(activity => {
            const badge = getActivityBadge(activity.type);
            const isMediaSync = activity.type === 'album_sync' || activity.type === 'media_upload';

            // Gather thumbnail preview strip (3-4 square thumbnails)
            const rawThumbs = (activity.previewUrls && activity.previewUrls.length > 0)
              ? activity.previewUrls
              : (activity.coverPhotoUrl || activity.thumbnailUrl)
                ? [activity.coverPhotoUrl || activity.thumbnailUrl]
                : [];
            const thumbnails = rawThumbs.slice(0, 4);

            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative bg-[#12151C] hover:bg-[#151922] border border-white/[0.08] hover:border-[#00F0D0]/40 rounded-2xl p-4 sm:p-5 transition-all shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  {/* Contextual Event Icon */}
                  <div className="p-3 rounded-xl bg-[#08090C] border border-white/10 flex-shrink-0 group-hover:border-[#00F0D0]/40 group-hover:shadow-[0_0_15px_rgba(0,240,208,0.2)] transition-all">
                    {getActivityIcon(activity.type)}
                  </div>

                  <div className="space-y-1.5 min-w-0 flex-1">
                    {/* Header Category Pill & Timestamp */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-black uppercase tracking-wider border ${badge.color}`}>
                        {badge.label}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        {activity.sport || 'Sports'} • {activity.createdAt}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-bold text-white group-hover:text-[#00F0D0] transition-colors">
                      {activity.title}
                    </h3>

                    {/* Objective 3: High-contrast text-slate-300 font-medium */}
                    <p className="text-xs text-slate-300 font-medium max-w-2xl leading-relaxed">
                      {activity.description}
                    </p>

                    {/* Objective 1: Compact Horizontal Preview Strip for Album Syncs */}
                    {isMediaSync && thumbnails.length > 0 && (
                      <div className="pt-2">
                        <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1">
                          {thumbnails.map((thumbUrl, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setSelectedAlbumPreview({
                                imageUrl: thumbUrl,
                                title: activity.title,
                                description: activity.description,
                                authorName: activity.authorName,
                                authorRole: activity.authorRole,
                                targetUrl: activity.targetUrl || '/gallery',
                                albumName: activity.metadata?.albumName,
                                photoCount: activity.metadata?.photoCount
                              })}
                              className="group/thumb relative rounded-lg border border-white/10 hover:border-[#00F0D0]/70 overflow-hidden shrink-0 transition-all cursor-pointer active:scale-95 shadow-md"
                              title={`Preview photo ${idx + 1}`}
                            >
                              <img
                                src={thumbUrl}
                                alt={`Preview ${idx + 1}`}
                                className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg group-hover/thumb:scale-105 transition-transform duration-300"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/25 group-hover/thumb:bg-transparent transition-colors" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Objective 3: Prominent Author & Role Attribution */}
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <span className="text-xs font-semibold text-white">
                        By {activity.authorName}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-white/[0.08] border border-white/10 text-[10px] font-mono font-black uppercase text-slate-200 tracking-wider">
                        [{activity.authorRole ? activity.authorRole.toUpperCase() : 'ATHLETE'}]
                      </span>
                    </div>
                  </div>
                </div>

                {/* Interactive Action Buttons */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  {activity.type === 'highlight_added' && activity.embedUrl && (
                    <button
                      onClick={() => openModal('video', {
                        videoUrl: activity.embedUrl,
                        title: activity.title,
                        athleteName: activity.authorName,
                        sport: activity.sport,
                        profileUrl: `/profile/${activity.authorId}`
                      })}
                      className="px-3.5 py-2 rounded-xl bg-[#00F0D0]/15 hover:bg-[#00F0D0] text-[#00F0D0] hover:text-slate-950 border border-[#00F0D0]/30 font-bold text-xs font-mono uppercase flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(0,240,208,0.2)] active:scale-[0.97] cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Watch Reel</span>
                    </button>
                  )}

                  {/* Objective 3: Restyled Inspect button with active hover spring physics */}
                  <Link
                    to={activity.targetUrl || '/feed'}
                    className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/10 active:scale-[0.97] text-white font-bold text-xs font-mono uppercase flex items-center gap-1.5 transition-all border border-white/10 hover:border-white/20 shadow-sm cursor-pointer select-none"
                  >
                    <span>Inspect</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-[#12151C] rounded-3xl border border-white/[0.08] space-y-3 p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
          <Activity className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-lg font-bold text-white font-mono uppercase">No Activities Recorded Yet</h3>
          <p className="text-xs text-slate-400 font-mono max-w-sm mx-auto leading-relaxed">
            When creators sync Google Drive photo albums, athletes publish 4K highlights, or coaches draw playbook sets, they will stream here live in real time.
          </p>
        </div>
      )}

      {/* MODAL: ALBUM PREVIEW LIGHTBOX */}
      <AnimatePresence>
        {selectedAlbumPreview && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="relative w-full max-w-2xl bg-[#12151C] border border-white/15 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto no-scrollbar"
            >
              {/* Mobile Drag Handle */}
              <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-2 sm:hidden" />

              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-[#00F0D0]" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#00F0D0]">
                    Album Photo Preview
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAlbumPreview(null)}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Large Image View */}
              <div className="relative rounded-2xl overflow-hidden bg-black/60 border border-white/10 aspect-video flex items-center justify-center">
                <img
                  src={selectedAlbumPreview.imageUrl}
                  alt={selectedAlbumPreview.title}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Metadata & Attribution */}
              <div className="space-y-2 font-mono">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-base font-bold text-white font-sans">
                    {selectedAlbumPreview.title}
                  </h4>
                  {selectedAlbumPreview.photoCount && (
                    <span className="px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold">
                      {selectedAlbumPreview.photoCount} Photos in Album
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {selectedAlbumPreview.description}
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-white">
                    Photographer: {selectedAlbumPreview.authorName}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] text-slate-300 uppercase font-bold">
                    [{selectedAlbumPreview.authorRole?.toUpperCase() || 'CREATOR'}]
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10 font-mono">
                <button
                  type="button"
                  onClick={() => setSelectedAlbumPreview(null)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs text-slate-300 font-bold uppercase transition-colors cursor-pointer"
                >
                  Close Preview
                </button>
                <Link
                  to={selectedAlbumPreview.targetUrl || '/gallery'}
                  onClick={() => setSelectedAlbumPreview(null)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00F0D0] to-teal-400 hover:from-[#00d6b9] hover:to-teal-300 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg cursor-pointer transition-all active:scale-[0.97]"
                >
                  <span>Open Album in Gallery</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UniversalActivityStream;
