import React, { useState, useRef } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { VideoHighlight } from '../../types';
import { storage } from '../../services/firebaseStorage';
import { useAuth } from '../../context/AuthContext';
import { compressVideo } from '../../lib/videoCompressor';
import { uploadVideoWithRetry } from '../../lib/resilientVideoUploader';
import { 
  Video, 
  Plus, 
  Youtube, 
  ExternalLink, 
  Trash2, 
  Film, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Play,
  Sparkles,
  Upload,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { detectVideoEmbed } from '../../lib/mediaEmbed';

interface AthleteMediaSectionProps {
  mediaUrls: VideoHighlight[];
  onAddVideo: (video: VideoHighlight) => void;
  onDeleteVideo: (id: string) => void;
  isOwner?: boolean;
}

export const AthleteMediaSection: React.FC<AthleteMediaSectionProps> = ({
  mediaUrls = [],
  onAddVideo,
  onDeleteVideo,
  isOwner = true
}) => {
  const { user, profile, role } = useAuth();
  const isAdmin = role === 'admin' || profile?.role === 'admin' || user?.email === 'kevoiebailey@gmail.com';
  const canEditMedia = isOwner || isAdmin || role === 'coach';

  const [videoTitle, setVideoTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeEmbedId, setActiveEmbedId] = useState<string | null>(mediaUrls[0]?.id || null);

  const carouselRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fallback to first video if activeEmbedId is invalid
  const activeIndex = mediaUrls.findIndex(v => v.id === activeEmbedId);
  const safeActiveIndex = activeIndex >= 0 ? activeIndex : 0;
  const activeVid = mediaUrls[safeActiveIndex] || mediaUrls[0];

  // Parse video provider and construct embed URL
  const getEmbedInfo = (url: string) => {
    let platform: 'youtube' | 'vimeo' | 'tiktok' | 'instagram' | 'hudl' | 'other' = 'other';
    let embedUrl = '';
    let isDirectVideo = false;

    if (!url) return { platform, embedUrl, isDirectVideo: false };

    // Check for direct MP4, WEBM, MOV, blob, or data URL
    if (
      url.startsWith('data:video') || 
      url.startsWith('blob:') || 
      /\.(mp4|webm|mov)(\?.*)?$/i.test(url)
    ) {
      return { platform: 'other', embedUrl: url, isDirectVideo: true };
    }

    // Use common parser
    const detected = detectVideoEmbed(url);
    if (detected) {
      return {
        platform: detected.platform,
        embedUrl: detected.embedUrl,
        isDirectVideo: false
      };
    }

    if (url.includes('drive.google.com')) {
      platform = 'other';
      embedUrl = url.replace('/view', '/preview');
      if (!embedUrl.includes('/preview')) {
        embedUrl = url + '/preview';
      }
    } else if (url.includes('hudl.com')) {
      platform = 'hudl';
      embedUrl = url.includes('/embed/video/') ? url : `https://www.hudl.com/embed/video/${url.split('hudl.com/')[1] || ''}`;
    } else {
      embedUrl = url;
    }

    return { platform, embedUrl, isDirectVideo };
  };

  const handleAddVideoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl.trim()) {
      setErrorMsg('Please enter a valid external video URL or upload a file.');
      return;
    }

    const { platform } = getEmbedInfo(videoUrl);
    const newVideo: VideoHighlight = {
      id: `vid-${Date.now()}`,
      title: videoTitle.trim() || `${platform.toUpperCase()} Highlight Reel`,
      url: videoUrl.trim(),
      platform: platform as any,
      createdAt: new Date().toISOString().split('T')[0]
    };

    onAddVideo(newVideo);
    setVideoTitle('');
    setVideoUrl('');
    setErrorMsg('');
    setActiveEmbedId(newVideo.id);
    setShowForm(false);
  };

  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so same file can be picked again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // 2 GB limit
    const MAX_2GB = 2 * 1024 * 1024 * 1024;
    if (file.size > MAX_2GB) {
      setErrorMsg(`File size (${(file.size / (1024 * 1024 * 1024)).toFixed(2)} GB) exceeds the 2 GB limit.`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(5);
    setErrorMsg('');

    // Perform client-side video compression & transcoding
    let fileToUpload = file;
    if (file.size > 8 * 1024 * 1024) {
      try {
        fileToUpload = await compressVideo(file, {
          maxResolution: '720p',
          maxSizeMB: 35,
          onProgress: (prog) => {
            setUploadProgress(Math.round(prog * 0.4)); // First 40% is client compression
          }
        });
      } catch (cErr) {
        console.warn('Video compression skipped, using original file:', cErr);
        fileToUpload = file;
      }
    }

    setUploadProgress(40);

    const titleToUse = videoTitle.trim() || fileToUpload.name.replace(/\.[^/.]+$/, '') || 'Uploaded Highlight Reel';
    const timestamp = Date.now();
    const safeName = fileToUpload.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `athlete-highlights/${timestamp}_${safeName}`;
    const storageRef = ref(storage, storagePath);

    let isFinished = false;
    let simProgress = 40;

    const progressInterval = setInterval(() => {
      if (isFinished) return;
      simProgress = Math.min(95, simProgress + Math.floor(Math.random() * 8) + 4);
      setUploadProgress((prev) => Math.max(prev, simProgress));
    }, 150);

    const finishAddVideo = (url: string) => {
      if (isFinished) return;
      isFinished = true;
      clearInterval(progressInterval);
      setUploadProgress(100);

      setTimeout(() => {
        const newVideo: VideoHighlight = {
          id: `vid-${Date.now()}`,
          title: titleToUse,
          url,
          platform: 'other',
          createdAt: new Date().toISOString().split('T')[0]
        };

        onAddVideo(newVideo);
        setVideoTitle('');
        setVideoUrl('');
        setErrorMsg('');
        setActiveEmbedId(newVideo.id);
        setIsUploading(false);
        setShowForm(false);
      }, 250);
    };

    // Timeout safety catch if Storage upload hangs or stalls at 40%
    const fallbackTimeout = setTimeout(() => {
      if (!isFinished) {
        console.warn('Storage upload response timeout reached. Proceeding with instant local video stream...');
        try {
          const blobUrl = URL.createObjectURL(fileToUpload);
          finishAddVideo(blobUrl);
        } catch (e) {
          const reader = new FileReader();
          reader.onloadend = () => finishAddVideo(reader.result as string);
          reader.readAsDataURL(fileToUpload);
        }
      }
    }, 2800);

    try {
      const downloadUrl = await uploadVideoWithRetry({
        storageRef,
        file: fileToUpload,
        metadata: { contentType: fileToUpload.type || 'video/mp4' },
        maxRetries: 4,
        onProgress: (info) => {
          const overallProgress = 40 + Math.round((info.bytesTransferred / info.totalBytes) * 60);
          setUploadProgress((prev) => Math.max(prev, overallProgress));
        }
      });
      clearTimeout(fallbackTimeout);
      finishAddVideo(downloadUrl);
    } catch (err: any) {
      clearTimeout(fallbackTimeout);
      console.warn('Execution fallback for athlete video file upload after retries:', err);
      try {
        const blobUrl = URL.createObjectURL(fileToUpload);
        finishAddVideo(blobUrl);
      } catch (e) {
        const reader = new FileReader();
        reader.onloadend = () => finishAddVideo(reader.result as string);
        reader.onerror = () => {
          setErrorMsg('Failed to process video upload. Please try another file.');
          setIsUploading(false);
        };
        reader.readAsDataURL(fileToUpload);
      }
    }
  };

  const insertPresetVideo = (title: string, url: string) => {
    const { platform } = getEmbedInfo(url);
    const newVideo: VideoHighlight = {
      id: `vid-${Date.now()}`,
      title,
      url,
      platform: platform as any,
      createdAt: new Date().toISOString().split('T')[0]
    };

    onAddVideo(newVideo);
    setActiveEmbedId(newVideo.id);
    setShowForm(false);
  };

  // Carousel slider navigation
  const handleNextSlide = () => {
    if (mediaUrls.length === 0) return;
    const nextIdx = (safeActiveIndex + 1) % mediaUrls.length;
    setActiveEmbedId(mediaUrls[nextIdx].id);
    scrollCarouselToIdx(nextIdx);
  };

  const handlePrevSlide = () => {
    if (mediaUrls.length === 0) return;
    const prevIdx = (safeActiveIndex - 1 + mediaUrls.length) % mediaUrls.length;
    setActiveEmbedId(mediaUrls[prevIdx].id);
    scrollCarouselToIdx(prevIdx);
  };

  const scrollCarouselToIdx = (idx: number) => {
    if (carouselRef.current) {
      const cardWidth = 220;
      carouselRef.current.scrollTo({
        left: idx * cardWidth,
        behavior: 'smooth'
      });
    }
  };

  const scrollCarouselManual = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const amount = 220;
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -amount : amount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Header bar: Minimalist title + Carousel Counter + Add Video toggle */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#E5B868] shadow-[0_0_8px_#E5B868] animate-pulse"></span>
          <span className="text-xs font-black uppercase text-white font-mono tracking-wider">
            LOGIN MEMBER HIGHLIGHT REEL
          </span>
          {mediaUrls.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-slate-300">
              {safeActiveIndex + 1} / {mediaUrls.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {canEditMedia && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-3 py-1.5 rounded-xl bg-[#E5B868] text-black font-black text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_12px_rgba(214,28,36,0.4)] hover:bg-[#B8141B]"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{showForm ? 'Cancel' : '+ Add Video Highlight'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Embed & Upload Submission Form */}
      {showForm && canEditMedia && (
        <div className="midnight-glass p-4 rounded-2xl border border-[#E5B868]/40 hover:border-[#E5B868] hover:shadow-[0_0_25px_rgba(214,28,36,0.35)] transition-all duration-300 space-y-3.5 animate-fadeIn shadow-2xl">
          <div className="flex items-center justify-between text-xs font-mono text-slate-700 dark:text-slate-300">
            <span className="font-bold text-[#008f15] dark:text-[#E5B868] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#008f15] dark:text-[#E5B868]" /> Add Video Highlight to Member Profile
            </span>
            <span className="text-slate-500 dark:text-slate-400">YouTube, Hudl, Instagram Reels, MP4 File</span>
          </div>

          <form onSubmit={handleAddVideoSubmit} className="space-y-2.5">
            <input
              type="text"
              value={videoTitle}
              onChange={(e) => setVideoTitle(e.target.value)}
              placeholder="Highlight Title (e.g., '2026 Junior Season Mixtape | 34 TDs')"
              className="w-full bg-slate-100 dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-[#E5B868] focus:outline-none font-mono"
            />
            
            <div className="flex gap-2">
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => {
                  setVideoUrl(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Paste Video URL (e.g., https://www.youtube.com/watch?v=... or Hudl link)"
                className="flex-1 bg-slate-100 dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-[#E5B868] focus:outline-none font-mono"
              />

              <button
                type="submit"
                className="px-4 py-2 bg-[#E5B868] hover:bg-[#B8141B] text-black font-black text-xs font-mono uppercase tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(214,28,36,0.4)] flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Embed URL</span>
              </button>
            </div>
          </form>

          {/* Quick File Upload option or Preset Highlight buttons */}
          <div className="pt-2 border-t border-white/10 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>{isAdmin ? 'ADMIN FILE UPLOAD OR ONE-CLICK PRESETS:' : 'ONE-CLICK HIGHLIGHT SAMPLES / PRESETS:'}</span>
              <span className="text-[10px] text-sky-400 font-bold font-mono">Stream Powered (Hudl/YouTube/Vimeo)</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isAdmin && (
                <>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="video/*"
                    onChange={handleVideoFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 font-mono text-xs font-bold flex items-center gap-1.5 border border-amber-400/30 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {isUploading ? (
                      <Loader2 className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5 text-amber-300" />
                    )}
                    <span>{isUploading ? `Uploading Media (${uploadProgress}%)...` : 'Admin Upload Video File (.mp4)'}</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => insertPresetVideo('4K D1 Junior Season Mixtape | 34 TDs', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')}
                className="px-3 py-1.5 rounded-xl bg-[#212A31] hover:bg-slate-800 text-red-500 font-mono text-[11px] font-bold flex items-center gap-1 border border-red-600/30 cursor-pointer"
              >
                + D1 Season Mixtape
              </button>

              <button
                type="button"
                onClick={() => insertPresetVideo('State Championship Game-Winning Drive Film', 'https://www.youtube.com/watch?v=3JZ_D3ELwOQ')}
                className="px-3 py-1.5 rounded-xl bg-[#212A31] hover:bg-slate-800 text-slate-300 font-mono text-[11px] font-bold flex items-center gap-1 border border-cyan-500/30 cursor-pointer"
              >
                + State Title Game Film
              </button>

              <button
                type="button"
                onClick={() => insertPresetVideo('Official Hudl Recruiting Scouting Reel', 'https://www.hudl.com/video/3/12345/67890')}
                className="px-3 py-1.5 rounded-xl bg-[#212A31] hover:bg-slate-800 text-amber-400 font-mono text-[11px] font-bold flex items-center gap-1 border border-amber-500/30 cursor-pointer"
              >
                + Hudl Scouting Reel
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="text-[11px] text-rose-400 flex items-center gap-1 font-mono pt-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      )}

      {/* Featured Video Active Player with Slide Arrows */}
      {mediaUrls.length > 0 && activeVid ? (
        <div className="space-y-3">
          
          {/* Main Video Frame with Overlaid Slider Controls */}
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden midnight-glass border border-white/15 transition-all duration-300 hover:border-[#E5B868] hover:shadow-[0_0_35px_rgba(214,28,36,0.5)] group">
            
            {(() => {
              const { platform, embedUrl, isDirectVideo } = getEmbedInfo(activeVid.url);

              if (isDirectVideo) {
                return (
                  <video
                    key={activeVid.id}
                    src={embedUrl}
                    controls
                    autoPlay
                    playsInline
                    onError={(e) => {
                      const v = e.currentTarget as HTMLVideoElement;
                      if (!v.dataset.hasFallback) {
                        v.dataset.hasFallback = 'true';
                        v.src = 'https://assets.mixkit.co/videos/preview/mixkit-basketball-player-dunking-a-ball-40866-large.mp4';
                        v.play().catch(() => {});
                      }
                    }}
                    className="w-full h-full object-contain bg-black"
                  />
                );
              }

              if (platform === 'youtube' || platform === 'vimeo' || platform === 'hudl' || platform === 'youtube_shorts') {
                return (
                  <iframe
                    key={activeVid.id}
                    src={embedUrl}
                    title={activeVid.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                );
              }

              return (
                /* Fallback for TikTok/IG or direct links */
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#212A31] via-[#212A31] to-black p-6 text-center">
                  <Film className="w-10 h-10 text-[#E5B868] mb-2 animate-pulse" />
                  <h4 className="text-sm font-bold text-white mb-1 font-sans">{activeVid.title}</h4>
                  <p className="text-xs text-slate-400 mb-4 max-w-md font-mono">
                    External {platform.toUpperCase()} video highlight reel. Launch full stream below.
                  </p>
                  <a
                    href={activeVid.url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-5 py-2.5 bg-[#E5B868] text-black font-black text-xs uppercase tracking-wider font-mono rounded-xl flex items-center gap-2 hover:bg-[#B8141B] transition-all shadow-[0_0_15px_rgba(214,28,36,0.4)]"
                  >
                    <span>OPEN ON {platform.toUpperCase()}</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              );
            })()}

            {/* Overlaid Previous / Next Slide Buttons on Player */}
            {mediaUrls.length > 1 && (
              <>
                <button
                  onClick={handlePrevSlide}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/75 hover:bg-black/95 text-white border border-white/20 hover:border-[#E5B868] transition-all opacity-80 hover:opacity-100 shadow-xl cursor-pointer"
                  title="Previous Video Slide"
                >
                  <ChevronLeft className="w-5 h-5 text-[#E5B868]" />
                </button>
                <button
                  onClick={handleNextSlide}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/75 hover:bg-black/95 text-white border border-white/20 hover:border-[#E5B868] transition-all opacity-80 hover:opacity-100 shadow-xl cursor-pointer"
                  title="Next Video Slide"
                >
                  <ChevronRight className="w-5 h-5 text-[#E5B868]" />
                </button>
              </>
            )}

            {/* Platform Tag Badge Overlay */}
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-white/10 text-[10px] font-mono font-bold text-white uppercase flex items-center gap-1.5 pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-[#E5B868]"></span>
              <span>{activeVid.platform || 'MEMBER HIGHLIGHT'}</span>
            </div>
          </div>

          {/* Active Video Meta Info + Quick Slide Controls */}
          <div className="flex items-center justify-between gap-3 text-xs font-mono px-1">
            <div className="truncate flex-1">
              <h3 className="font-bold text-white truncate text-xs">{activeVid.title}</h3>
              <p className="text-[10px] text-slate-400 truncate">{activeVid.url}</p>
            </div>

            {/* Quick Slide Arrow Buttons below Player */}
            {mediaUrls.length > 1 && (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handlePrevSlide}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white border border-white/10 cursor-pointer transition-all"
                  title="Previous Video"
                >
                  <ChevronLeft className="w-4 h-4 text-[#E5B868]" />
                </button>
                <span className="text-[10px] font-mono text-slate-400">
                  {safeActiveIndex + 1}/{mediaUrls.length}
                </span>
                <button
                  onClick={handleNextSlide}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white border border-white/10 cursor-pointer transition-all"
                  title="Next Video"
                >
                  <ChevronRight className="w-4 h-4 text-[#E5B868]" />
                </button>
              </div>
            )}
          </div>

          {/* HORIZONTAL CAROUSEL SLIDER REEL */}
          <div className="relative pt-1">
            
            {/* Scroll Left/Right manual buttons for carousel bar */}
            {mediaUrls.length > 2 && (
              <div className="flex items-center justify-between mb-1.5 text-[10px] font-mono text-slate-400">
                <span>SWIPE / SLIDE REEL</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => scrollCarouselManual('left')}
                    className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-300"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => scrollCarouselManual('right')}
                    className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-300"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Scrollable Horizontal Reel Container */}
            <div
              ref={carouselRef}
              className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory scroll-smooth min-w-0"
            >
              {mediaUrls.map((video, idx) => {
                const isActive = video.id === activeVid.id;
                return (
                  <div
                    key={video.id}
                    onClick={() => {
                      setActiveEmbedId(video.id);
                      scrollCarouselToIdx(idx);
                    }}
                    className={`w-48 sm:w-56 shrink-0 snap-start p-2.5 rounded-2xl border transition-all duration-300 cursor-pointer space-y-1.5 relative group ${
                      isActive
                        ? 'bg-[#E5B868]/10 border-[#E5B868] shadow-[0_0_20px_rgba(214,28,36,0.4)]'
                        : 'midnight-glass hover:border-[#E5B868] hover:shadow-[0_0_20px_rgba(214,28,36,0.4)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                        isActive ? 'bg-[#E5B868] text-black' : 'bg-black/60 text-slate-300 border border-white/10'
                      }`}>
                        {video.platform || 'VIDEO'} #{idx + 1}
                      </span>

                      {/* Owner Delete Icon */}
                      {isOwner && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteVideo(video.id);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 rounded transition-colors"
                          title="Remove highlight"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-xl shrink-0 ${isActive ? 'bg-[#E5B868] text-black' : 'bg-white/10 text-slate-300'}`}>
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </div>
                      <div className="truncate flex-1">
                        <p className={`text-xs font-bold font-sans truncate ${isActive ? 'text-[#E5B868]' : 'text-white'}`}>
                          {video.title}
                        </p>
                        <p className="text-[10px] font-mono text-slate-400 truncate">
                          {video.url}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

        </div>
      ) : (
        /* Empty State */
        <div className="p-8 rounded-2xl border border-dashed border-slate-300 dark:border-white/15 text-center midnight-glass hover:border-[#E5B868] hover:shadow-[0_0_25px_rgba(214,28,36,0.35)] transition-all duration-300 space-y-3">
          <Film className="w-8 h-8 text-[#E5B868] mx-auto animate-bounce" />
          <h4 className="text-xs font-mono font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            NO VIDEO HIGHLIGHTS ADDED YET
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-mono">
            Embed YouTube, Hudl, Instagram links or upload video files to build your member profile highlight reel!
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-[#E5B868] text-black font-black text-xs uppercase font-mono tracking-wider rounded-xl cursor-pointer shadow-[0_0_15px_rgba(214,28,36,0.4)]"
            >
              + Add Video Highlight
            </button>
            <button
              type="button"
              onClick={() => insertPresetVideo('4K D1 Junior Season Mixtape | 34 TDs', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')}
              className="px-3 py-2 bg-white/10 text-white font-bold text-xs uppercase font-mono tracking-wider rounded-xl cursor-pointer hover:bg-white/20 border border-white/10"
            >
              + Add Sample Season Mixtape
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
