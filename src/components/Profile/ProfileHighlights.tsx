import React, { useState, useEffect } from 'react';
import { 
  Film, 
  Plus, 
  Edit3, 
  Sparkles, 
  Share2, 
  Check, 
  ExternalLink, 
  Trophy, 
  GraduationCap, 
  Shield, 
  Calendar,
  AlertCircle,
  X,
  Play,
  Layers,
  Trash2,
  Star
} from 'lucide-react';
import { UserProfile } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { UniversalVideoPlayer } from '../Video/UniversalVideoPlayer';
import { getEmbedUrl } from '../../lib/videoParser';
import { 
  getAthleteHighlights, 
  subscribeToUserHighlights, 
  deleteHighlight,
  saveAthleteHighlight,
  HighlightItem 
} from '../../services/highlightService';
import { PostHighlightModal } from '../Video/PostHighlightModal';

interface ProfileHighlightsProps {
  profile: UserProfile;
  isOwner?: boolean;
  onHighlightUpdated?: (newUrl: string, title: string) => void;
}

export const ProfileHighlights: React.FC<ProfileHighlightsProps> = ({
  profile,
  isOwner = false,
  onHighlightUpdated
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [activeHighlight, setActiveHighlight] = useState<HighlightItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Determine owner privileges (current user matches profile UID or admin)
  const isProfileOwner = Boolean(isOwner || (user && user.uid === profile?.uid));

  // Initialize and subscribe to athlete's highlights in real time
  useEffect(() => {
    if (!profile?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = subscribeToUserHighlights(profile.uid, (items) => {
      setHighlights(items);
      if (items.length > 0) {
        // Keep currently active if still exists, or default to first / featured
        setActiveHighlight((prev) => {
          if (prev) {
            const found = items.find((i) => i.id === prev.id || i.videoUrl === prev.videoUrl);
            if (found) return found;
          }
          const featured = items.find((i) => i.isFeatured);
          return featured || items[0];
        });
      } else {
        setActiveHighlight(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [profile?.uid]);

  const handleShareHighlight = async () => {
    if (!activeHighlight?.videoUrl) return;
    try {
      await navigator.clipboard.writeText(activeHighlight.videoUrl);
      setCopiedLink(true);
      showToast('success', 'Highlight Link Copied', 'Video URL copied to your clipboard!');
      setTimeout(() => setCopiedLink(false), 3000);
    } catch (e) {
      showToast('info', 'Share', activeHighlight.videoUrl);
    }
  };

  const handleSetFeatured = async (item: HighlightItem) => {
    if (!isProfileOwner || !user?.uid) return;
    try {
      await saveAthleteHighlight({
        userId: user.uid,
        userName: profile.displayName || 'Athlete',
        userRole: profile.role || 'athlete',
        userAvatar: profile.avatarUrl || profile.photoURL || '',
        title: item.title,
        videoUrl: item.videoUrl,
        sport: item.sport,
        position: item.position,
        gradYear: item.gradYear,
        highSchool: item.highSchool,
        state: item.state,
        isFeatured: true,
        highlightId: item.id
      });
      showToast('success', 'Spotlight Updated', `Set "${item.title}" as your primary spotlight tape!`);
      if (onHighlightUpdated) {
        onHighlightUpdated(item.videoUrl, item.title);
      }
    } catch (err) {
      console.error('Error setting featured highlight:', err);
    }
  };

  const handleDeleteHighlight = async (item: HighlightItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isProfileOwner || !user?.uid) return;
    if (!window.confirm(`Are you sure you want to delete "${item.title}" from your profile?`)) return;

    try {
      await deleteHighlight(item.id, user.uid, item.videoUrl);
      showToast('info', 'Highlight Deleted', 'The highlight reel was removed from your profile and the Watch Vault.');
      setHighlights((prev) => prev.filter((h) => h.id !== item.id));
      if (activeHighlight?.id === item.id) {
        const remaining = highlights.filter((h) => h.id !== item.id);
        setActiveHighlight(remaining[0] || null);
      }
    } catch (err) {
      console.error('Error deleting highlight:', err);
      showToast('error', 'Delete Failed', 'Could not delete highlight reel.');
    }
  };

  return (
    <div className="w-full bg-[#0f172a] border border-cyan-500/20 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl space-y-5">
      
      {/* Top Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_10px_rgba(0,229,255,0.2)]">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black uppercase text-white tracking-wider">
                  Athlete Highlight Reels & Game Film
                </h3>
                {highlights.length > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-mono text-cyan-300 font-bold">
                    {highlights.length} {highlights.length === 1 ? 'REEL' : 'REELS'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Game Film, Showcase Tapes, Hudl & Verified Scouting Cuts
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {activeHighlight?.videoUrl && (
            <button
              type="button"
              onClick={handleShareHighlight}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
              title="Share Highlight Reel"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied' : 'Share'}</span>
            </button>
          )}

          {isProfileOwner && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(0,229,255,0.3)] active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Post / Manage Footage</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Video Presentation or Empty State */}
      {loading ? (
        <div className="w-full aspect-video rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin mb-3" />
          <span className="text-xs font-mono text-slate-500">Loading Featured Film...</span>
        </div>
      ) : activeHighlight?.videoUrl ? (
        <div className="space-y-4">
          
          {/* Universal Responsive Player */}
          <UniversalVideoPlayer
            url={activeHighlight.videoUrl}
            title={activeHighlight.title}
            className="w-full shadow-2xl"
          />

          {/* Metadata & Scouting Badges Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  {activeHighlight.title}
                </h4>
                {activeHighlight.isFeatured && (
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold uppercase flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-300" />
                    Spotlight Reel
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400">
                {activeHighlight.sport && (
                  <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-300 font-semibold">
                    {activeHighlight.sport}
                  </span>
                )}
                {activeHighlight.position && (
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-semibold">
                    {activeHighlight.position}
                  </span>
                )}
                {activeHighlight.gradYear && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold flex items-center gap-1">
                    <GraduationCap className="w-3 h-3" />
                    <span>Class of {activeHighlight.gradYear}</span>
                  </span>
                )}
                {(activeHighlight.highSchool || profile.highSchool) && (
                  <span className="text-slate-400">
                    • {activeHighlight.highSchool || profile.highSchool}
                  </span>
                )}
                {(activeHighlight.state || profile.state) && (
                  <span className="text-slate-500">
                    ({activeHighlight.state || profile.state})
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {isProfileOwner && !activeHighlight.isFeatured && (
                <button
                  type="button"
                  onClick={() => handleSetFeatured(activeHighlight)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <Star className="w-3.5 h-3.5" />
                  <span>Set as Spotlight</span>
                </button>
              )}

              {isProfileOwner && (
                <button
                  type="button"
                  onClick={(e) => handleDeleteHighlight(activeHighlight, e)}
                  className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1"
                  title="Remove this highlight reel from profile"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Reel</span>
                </button>
              )}

              <a
                href={activeHighlight.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-mono font-semibold border border-slate-700 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                <span>Original Tape</span>
              </a>
            </div>
          </div>

          {/* Multiple Footage Tape Selector (When athlete has multiple clips) */}
          {highlights.length > 1 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
                <span>All Film Reels ({highlights.length})</span>
                <span>Click any clip to play</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {highlights.map((item) => {
                  const isCurrent = activeHighlight.id === item.id || activeHighlight.videoUrl === item.videoUrl;
                  const embed = getEmbedUrl(item.videoUrl);
                  return (
                    <div
                      key={item.id}
                      onClick={() => setActiveHighlight(item)}
                      className={`group relative p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                        isCurrent
                          ? 'bg-cyan-500/10 border-cyan-500/60 shadow-[0_0_15px_rgba(0,229,255,0.2)]'
                          : 'bg-slate-900/70 hover:bg-slate-850 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="w-14 h-11 rounded-xl bg-black overflow-hidden relative shrink-0 flex items-center justify-center border border-slate-800">
                        {item.thumbnailUrl ? (
                          <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <Film className="w-4 h-4 text-cyan-400" />
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Play className={`w-4 h-4 ${isCurrent ? 'text-cyan-400 fill-cyan-400' : 'text-white'}`} />
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <h5 className="text-xs font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                          {item.title}
                        </h5>
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 mt-0.5">
                          <span className="uppercase text-cyan-400 font-bold">{embed.provider}</span>
                          {item.isFeatured && (
                            <span className="text-amber-400 font-bold">• Spotlight</span>
                          )}
                        </div>
                      </div>

                      {isProfileOwner && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteHighlight(item, e)}
                          className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-transparent hover:border-red-500/30 transition-all opacity-90 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer"
                          title="Remove this highlight entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      ) : (
        /* Empty State */
        <div className="relative rounded-2xl bg-slate-950/60 border border-slate-800/80 p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-inner">
            <Film className="w-8 h-8 opacity-80" />
          </div>

          <div className="max-w-md space-y-1">
            <h4 className="text-base font-bold text-white">No Highlight Reels Attached Yet</h4>
            <p className="text-xs text-slate-400">
              {isProfileOwner 
                ? 'Paste your Hudl tape, YouTube highlight reel, Vimeo cut, TikTok, or Instagram link. Unlimited footage capacity!'
                : `${profile?.displayName || 'Member'} hasn't posted a highlight reel yet.`}
            </p>
          </div>

          {isProfileOwner && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(0,229,255,0.3)] active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Post First Highlight Reel</span>
            </button>
          )}
        </div>
      )}

      {/* Unlimited Footage & Highlights Modal */}
      {isModalOpen && (
        <PostHighlightModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          initialSport={profile.sport || 'Basketball'}
          onSuccess={() => {
            if (onHighlightUpdated && activeHighlight) {
              onHighlightUpdated(activeHighlight.videoUrl, activeHighlight.title);
            }
          }}
        />
      )}
    </div>
  );
};

export default ProfileHighlights;
