import React, { useState, useEffect } from 'react';
import { 
  Film, 
  Plus, 
  X, 
  Sparkles, 
  ExternalLink, 
  Trash2, 
  Check, 
  Play, 
  AlertCircle, 
  Video, 
  Layers, 
  GraduationCap, 
  Share2, 
  CheckCircle2, 
  Copy,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getEmbedUrl, isValidVideoUrl } from '../../lib/videoParser';
import { 
  saveAthleteHighlight, 
  getAthleteHighlights, 
  deleteHighlight, 
  HighlightItem 
} from '../../services/highlightService';
import { POPULAR_SPORTS_LIST } from '../../lib/sports';
import { UniversalVideoPlayer } from './UniversalVideoPlayer';

interface PostHighlightModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialSport?: string;
}

const GRAD_YEARS = ['2025', '2026', '2027', '2028', '2029', '2030', '2031', 'College Transfer', 'Alumni'];

const DEFAULT_POSITIONS: Record<string, string[]> = {
  'Basketball': ['Point Guard (PG)', 'Shooting Guard (SG)', 'Combo Guard (CG)', 'Small Forward (SF)', 'Power Forward (PF)', 'Center (C)'],
  'Flag Football': ['Quarterback (QB)', 'Wide Receiver (WR)', 'Running Back (RB)', 'Defensive Back (DB)', 'Cornerback (CB)', 'Safety (S)', 'Linebacker (LB)', 'Pass Rusher / DE', 'Center / Snapper', 'Athlete (ATH)'],
  'American Football': ['Quarterback (QB)', 'Wide Receiver (WR)', 'Running Back (RB)', 'Tight End (TE)', 'Offensive Tackle (OT)', 'Defensive End (DE)', 'Linebacker (LB)', 'Cornerback (CB)', 'Safety (S)', 'Kicker (K)'],
  'Soccer': ['Striker (ST/CF)', 'Winger (LW/RW)', 'Attacking Midfielder (CAM)', 'Central Midfielder (CM)', 'Defensive Midfielder (CDM)', 'Fullback (LB/RB)', 'Center Back (CB)', 'Goalkeeper (GK)'],
  'Cheerleading': ['Flyer', 'Main Base', 'Side Base', 'Backspot', 'Tumbler', 'All-Around Cheerleader'],
  'Track & Field': ['Sprinter (100m/200m/400m)', 'Hurdler', 'Distance Runner', 'Long/Triple Jump', 'High Jump', 'Pole Vault', 'Throws (Shot/Discus/Javelin)'],
  'Volleyball': ['Outside Hitter (OH)', 'Opposite Hitter (OPP)', 'Middle Blocker (MB)', 'Setter (S)', 'Libero (L)', 'Defensive Specialist (DS)'],
  'Baseball': ['Pitcher (RHP/LHP)', 'Catcher (C)', 'First Base (1B)', 'Middle Infield (2B/SS)', 'Third Base (3B)', 'Outfield (LF/CF/RF)', 'Utility (UTL)'],
  'Softball': ['Pitcher (P)', 'Catcher (C)', 'Infield (IF)', 'Outfield (OF)', 'Utility (UTL)'],
  'Lacrosse': ['Attackman (A)', 'Midfielder (M)', 'Face-Off (FOGO)', 'Long-Stick Mid (LSM)', 'Defenseman (D)', 'Goalie (G)']
};

export const PostHighlightModal: React.FC<PostHighlightModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialSport
}) => {
  const { user, profile } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'new' | 'manage'>('new');
  const [videoUrl, setVideoUrl] = useState('');
  const [title, setTitle] = useState('');
  const [sport, setSport] = useState(initialSport || profile?.sport || 'Basketball');
  const [position, setPosition] = useState(profile?.position || '');
  const [gradYear, setGradYear] = useState(profile?.gradYear || '2026');
  const [highSchool, setHighSchool] = useState(profile?.highSchool || '');
  const [state, setState] = useState(profile?.state || '');
  const [isFeatured, setIsFeatured] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userClips, setUserClips] = useState<HighlightItem[]>([]);
  const [loadingClips, setLoadingClips] = useState(false);
  const [previewClip, setPreviewClip] = useState<HighlightItem | null>(null);

  // Load member's existing posted highlights
  const loadUserClips = async () => {
    if (!user?.uid) return;
    setLoadingClips(true);
    try {
      const list = await getAthleteHighlights(user.uid);
      setUserClips(list);
    } catch (err) {
      console.warn('Error loading user clips:', err);
    } finally {
      setLoadingClips(false);
    }
  };

  useEffect(() => {
    if (isOpen && user?.uid) {
      loadUserClips();
      if (!title) {
        setTitle(`${profile?.displayName || 'Athlete'} Season Highlight Reel`);
      }
    }
  }, [isOpen, user?.uid, profile?.displayName]);

  if (!isOpen) return null;

  const currentPositions = DEFAULT_POSITIONS[sport] || [
    'Quarterback (QB)',
    'Wide Receiver (WR)',
    'Point Guard (PG)',
    'Shooting Guard (SG)',
    'Striker / Forward',
    'Midfielder',
    'Defender',
    'Athlete (ATH)'
  ];

  // Video validation & preview
  const embedPreview = videoUrl.trim() ? getEmbedUrl(videoUrl.trim()) : null;

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('error', 'Authentication Required', 'Please sign in to post your highlight reel.');
      return;
    }

    if (!videoUrl.trim()) {
      showToast('error', 'Video Link Required', 'Please paste a valid video URL (Hudl, YouTube, Vimeo, TikTok, Instagram, or MP4).');
      return;
    }

    if (!isValidVideoUrl(videoUrl.trim())) {
      showToast('error', 'Invalid Link', 'Please provide a recognized YouTube, Hudl, Vimeo, TikTok, Instagram, or direct MP4 video link.');
      return;
    }

    setIsSubmitting(true);

    try {
      const docId = await saveAthleteHighlight({
        userId: user.uid,
        userName: profile?.displayName || user.displayName || 'Athlete',
        userRole: profile?.role || 'athlete',
        userAvatar: profile?.avatarUrl || user.photoURL || '',
        title: title.trim() || `${sport} Highlight Reel`,
        videoUrl: videoUrl.trim(),
        sport,
        position,
        gradYear,
        highSchool: highSchool || profile?.highSchool || '',
        state: state || profile?.state || '',
        isFeatured
      });

      showToast('success', '⚡ Highlight Published!', 'Your footage is now live in the Watch Vault and saved to your profile!');

      // Reset URL & form for next post so athlete can post unlimited videos
      setVideoUrl('');
      setTitle(`${profile?.displayName || 'Athlete'} Game Tape #${userClips.length + 2}`);
      setIsFeatured(false);

      // Refresh clips list
      await loadUserClips();

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Error publishing highlight:', err);
      showToast('error', 'Publish Failed', err?.message || 'Could not save highlight reel. Please check network connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (clip: HighlightItem) => {
    if (!user || !window.confirm(`Are you sure you want to remove "${clip.title}"?`)) return;

    try {
      await deleteHighlight(clip.id, user.uid, clip.videoUrl);
      setUserClips(prev => prev.filter(c => c.id !== clip.id));
      showToast('info', 'Highlight Removed', 'The clip was removed from your vault.');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error removing clip:', err);
      showToast('error', 'Delete Failed', 'Could not delete highlight clip.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#0F172A] border border-cyan-500/30 rounded-3xl shadow-[0_0_50px_rgba(0,229,255,0.15)] overflow-hidden my-6">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-800 bg-[#0B0F17]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,229,255,0.2)]">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black uppercase text-white tracking-wider">
                  Post Highlight Reels & Game Film
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-mono text-cyan-300 font-bold">
                  UNLIMITED URLs
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Save & broadcast unlimited Hudl, YouTube, TikTok, Vimeo, or Instagram footage
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-800/80 bg-[#0F172A]">
          <button
            type="button"
            onClick={() => setActiveTab('new')}
            className={`pb-3 px-3 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'new'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Post New Footage</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('manage')}
            className={`pb-3 px-3 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'manage'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>My Posted Clips ({userClips.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 max-h-[75vh] overflow-y-auto space-y-6">
          
          {activeTab === 'new' ? (
            <form onSubmit={handlePostSubmit} className="space-y-5">
              
              {/* Video URL Input */}
              <div className="space-y-2">
                <label className="block text-xs font-mono font-bold uppercase text-cyan-300">
                  Video URL (Hudl, YouTube, Vimeo, TikTok, Instagram, MP4) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="url"
                    required
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="e.g. https://www.hudl.com/video/3/... or https://youtube.com/watch?v=..."
                    className="w-full px-4 py-3 rounded-2xl bg-slate-900/90 border border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-white font-mono text-sm placeholder-slate-500 outline-none transition-all"
                  />
                  {embedPreview?.isValid && (
                    <div className="absolute right-3 top-3 px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold uppercase">
                      {embedPreview.provider}
                    </div>
                  )}
                </div>
                <p className="text-[11px] font-mono text-slate-400">
                  ⚡ Unlimited URLs allowed. Paste any public highlight link to sync directly with your profile & the Watch Feed.
                </p>
              </div>

              {/* Real-time Video Preview */}
              {embedPreview?.isValid && embedPreview.embedUrl && (
                <div className="space-y-2 rounded-2xl bg-slate-950 p-3 border border-cyan-500/30">
                  <div className="flex items-center justify-between text-xs font-mono text-cyan-300">
                    <span className="flex items-center gap-1.5">
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Live Stream Preview
                    </span>
                    <span className="text-slate-400 uppercase">{embedPreview.provider} Tape</span>
                  </div>
                  <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
                    <UniversalVideoPlayer
                      url={videoUrl.trim()}
                      title="Preview Clip"
                      className="w-full h-full"
                    />
                  </div>
                </div>
              )}

              {/* Title & Sport Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono font-bold uppercase text-slate-300">
                    Tape Title / Caption
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. 2025 Junior Season Highlights vs Bergen"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-cyan-400 text-white text-xs font-mono outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono font-bold uppercase text-slate-300">
                    Sport
                  </label>
                  <select
                    value={sport}
                    onChange={(e) => {
                      setSport(e.target.value);
                      setPosition('');
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-cyan-400 text-white text-xs font-mono outline-none"
                  >
                    {POPULAR_SPORTS_LIST.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Position & Grad Year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono font-bold uppercase text-slate-300">
                    Position
                  </label>
                  <select
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-cyan-400 text-white text-xs font-mono outline-none"
                  >
                    <option value="">Select Position...</option>
                    {currentPositions.map((pos) => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono font-bold uppercase text-slate-300">
                    Graduation Class
                  </label>
                  <select
                    value={gradYear}
                    onChange={(e) => setGradYear(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-cyan-400 text-white text-xs font-mono outline-none"
                  >
                    {GRAD_YEARS.map((yr) => (
                      <option key={yr} value={yr}>Class of {yr}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* High School & State */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono font-bold uppercase text-slate-300">
                    High School / Club Team
                  </label>
                  <input
                    type="text"
                    value={highSchool}
                    onChange={(e) => setHighSchool(e.target.value)}
                    placeholder="e.g. Bergen Catholic High School"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-cyan-400 text-white text-xs font-mono outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono font-bold uppercase text-slate-300">
                    State / Region
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g. NJ, TX, FL, CA"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-cyan-400 text-white text-xs font-mono outline-none"
                  />
                </div>
              </div>

              {/* Feature Toggle */}
              <label className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800 cursor-pointer hover:border-cyan-500/40 transition-colors">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 text-cyan-500 focus:ring-cyan-400 bg-slate-800"
                />
                <div>
                  <span className="text-xs font-bold text-white block">Set as Profile Spotlight Tape</span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Show this video as the top primary featured film on your sports profile.
                  </span>
                </div>
              </label>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-mono text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || !videoUrl.trim()}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black font-mono text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(0,229,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Saving to Firebase...</span>
                    </>
                  ) : (
                    <>
                      <Film className="w-4 h-4" />
                      <span>Post & Save Highlight Reel</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          ) : (
            /* Manage Clips Tab */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Your Vault Clips ({userClips.length})</h4>
                  <p className="text-xs text-slate-400 font-mono">
                    All footage you have posted across Just1Play. Unlimited footage capacity.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('new')}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Another URL</span>
                </button>
              </div>

              {loadingClips ? (
                <div className="p-8 text-center text-slate-400 font-mono text-xs flex flex-col items-center justify-center">
                  <div className="w-8 h-8 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin mb-2" />
                  <span>Loading your highlight collection...</span>
                </div>
              ) : userClips.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
                  <Film className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-xs font-mono text-slate-400">
                    You haven't posted any highlight reels yet. Paste your first Hudl or YouTube URL!
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('new')}
                    className="px-4 py-2 rounded-xl bg-cyan-500 text-black font-mono text-xs font-black uppercase cursor-pointer"
                  >
                    Post First Highlight
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {userClips.map((clip) => {
                    const embed = getEmbedUrl(clip.videoUrl);
                    return (
                      <div
                        key={clip.id}
                        className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/30 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-16 h-12 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0 relative">
                            {clip.thumbnailUrl ? (
                              <img src={clip.thumbnailUrl} alt={clip.title} className="w-full h-full object-cover" />
                            ) : (
                              <Film className="w-5 h-5 text-cyan-400" />
                            )}
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <Play className="w-3.5 h-3.5 text-white" />
                            </div>
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h5 className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-xs">
                                {clip.title}
                              </h5>
                              <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-[9px] font-mono text-cyan-300 font-bold uppercase shrink-0">
                                {embed.provider}
                              </span>
                              {clip.isFeatured && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-mono font-bold uppercase shrink-0">
                                  Spotlight
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] font-mono text-slate-400 truncate max-w-sm mt-0.5">
                              {clip.sport} {clip.position ? `• ${clip.position}` : ''} {clip.gradYear ? `• 'Class ${clip.gradYear}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <a
                            href={clip.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="Open Link"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleDelete(clip)}
                            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors cursor-pointer"
                            title="Delete Clip"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-[#0B0F17] border-t border-slate-800 text-[11px] font-mono text-slate-500 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Connected to Firebase Real-time Firestore
          </span>
          <span className="text-cyan-400">Just1Play Watch Vault</span>
        </div>

      </div>
    </div>
  );
};
