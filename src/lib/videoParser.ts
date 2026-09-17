/**
 * Universal Video Embed Parser & Media Sanitizer
 * Supports YouTube, YouTube Shorts, Hudl, TikTok, Instagram Reels, Vimeo, and Direct MP4/WebM videos
 */

export type VideoProvider = 'youtube' | 'hudl' | 'tiktok' | 'instagram' | 'facebook' | 'vimeo' | 'google_drive' | 'direct' | 'unknown';

export interface ParsedVideoEmbed {
  provider: VideoProvider;
  videoId: string;
  embedUrl: string;
  originalUrl: string;
  isVertical: boolean;
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3';
  thumbnailUrl?: string;
}

/**
 * Parses any supported video or highlight URL into a sanitized, responsive iframe embed URL
 */
export function parseVideoUrl(rawUrl: string | undefined | null): ParsedVideoEmbed | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  const url = rawUrl.trim();
  if (!url) return null;

  // Reject static images immediately (photo-only posts or image attachments)
  if (/\.(jpe?g|png|webp|gif|heic|svg|bmp|tiff|avif)(\?.*)?$/i.test(url)) {
    return null;
  }
  if (url.includes('images.unsplash.com') || url.includes('unsplash.com/photos/')) {
    return null;
  }

  // 1. YouTube & YouTube Shorts
  // Matches: youtube.com/watch?v=xxx, youtu.be/xxx, youtube.com/shorts/xxx, youtube.com/embed/xxx
  const ytShortsMatch = url.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i);
  if (ytShortsMatch) {
    const videoId = ytShortsMatch[1];
    return {
      provider: 'youtube',
      videoId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1`,
      originalUrl: url,
      isVertical: true,
      aspectRatio: '9:16',
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    };
  }

  const ytStandardMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (ytStandardMatch) {
    const videoId = ytStandardMatch[1];
    return {
      provider: 'youtube',
      videoId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1`,
      originalUrl: url,
      isVertical: false,
      aspectRatio: '16:9',
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    };
  }

  // 2. Hudl Highlight Video / Embed
  // Matches: hudl.com/video/3/12345/67890, hudl.com/embed/video/3/..., hudl.com/v/...
  if (url.includes('hudl.com')) {
    let embedUrl = url;
    let videoId = 'hudl-clip';

    const videoIdMatch = url.match(/hudl\.com\/(?:video|embed\/video)\/([0-9a-zA-Z/_-]+)/i);
    if (videoIdMatch) {
      videoId = videoIdMatch[1].replace(/\//g, '-');
      embedUrl = `https://www.hudl.com/embed/video/${videoIdMatch[1]}`;
    } else if (!url.includes('/embed/')) {
      embedUrl = url.replace('hudl.com/video/', 'hudl.com/embed/video/');
    }

    return {
      provider: 'hudl',
      videoId,
      embedUrl,
      originalUrl: url,
      isVertical: false,
      aspectRatio: '16:9',
      thumbnailUrl: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&auto=format&fit=crop&q=80'
    };
  }

  // 3. TikTok Videos & Clips
  // Matches: tiktok.com/@username/video/1234567890, vm.tiktok.com/xxx, tiktok.com/embed/v2/xxx
  const tiktokMatch = url.match(/(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[^/]+\/video\/([0-9]+)/i) || 
                      url.match(/tiktok\.com\/(?:embed|v2)\/([0-9]+)/i);
  if (tiktokMatch) {
    const videoId = tiktokMatch[1];
    return {
      provider: 'tiktok',
      videoId,
      embedUrl: `https://www.tiktok.com/embed/v2/${videoId}`,
      originalUrl: url,
      isVertical: true,
      aspectRatio: '9:16',
      thumbnailUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80'
    };
  }

  // Generic TikTok link fallback
  if (url.includes('tiktok.com')) {
    return {
      provider: 'tiktok',
      videoId: 'tiktok-clip',
      embedUrl: url,
      originalUrl: url,
      isVertical: true,
      aspectRatio: '9:16',
      thumbnailUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80'
    };
  }

  // 4. Instagram Reels & Posts
  // Matches: instagram.com/reel/xxx, instagram.com/p/xxx
  const igMatch = url.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:reel|p)\/([a-zA-Z0-9_-]+)/i);
  if (igMatch) {
    const videoId = igMatch[1];
    return {
      provider: 'instagram',
      videoId,
      embedUrl: `https://www.instagram.com/reel/${videoId}/embed/`,
      originalUrl: url,
      isVertical: true,
      aspectRatio: '9:16',
      thumbnailUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&auto=format&fit=crop&q=80'
    };
  }

  // 5. Facebook Video / Reel
  if (url.includes('facebook.com') || url.includes('fb.watch')) {
    const encodedUrl = encodeURIComponent(url);
    return {
      provider: 'facebook',
      videoId: 'fb-video',
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodedUrl}&show_text=0`,
      originalUrl: url,
      isVertical: false,
      aspectRatio: '16:9',
      thumbnailUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80'
    };
  }

  // 6. Vimeo
  // Matches: vimeo.com/123456789, player.vimeo.com/video/123456789
  const vimeoMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:player\.)?vimeo\.com\/(?:video\/)?([0-9]+)/i);
  if (vimeoMatch) {
    const videoId = vimeoMatch[1];
    return {
      provider: 'vimeo',
      videoId,
      embedUrl: `https://player.vimeo.com/video/${videoId}?autoplay=0&title=0&byline=0&portrait=0`,
      originalUrl: url,
      isVertical: false,
      aspectRatio: '16:9',
      thumbnailUrl: `https://vimeocdn.com/video/${videoId}_640.jpg`
    };
  }

  // 6. Google Drive Video Preview & Streaming (drive.google.com/file/d/{id} or drive.google.com/open?id={id})
  if (url.includes('drive.google.com')) {
    let driveFileId = '';
    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i);
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
    if (fileMatch && fileMatch[1]) {
      driveFileId = fileMatch[1];
    } else if (idMatch && idMatch[1]) {
      driveFileId = idMatch[1];
    }

    const embedUrl = driveFileId
      ? `https://drive.google.com/file/d/${driveFileId}/preview`
      : url;

    return {
      provider: 'google_drive',
      videoId: driveFileId || 'gdrive-video',
      embedUrl,
      originalUrl: url,
      isVertical: false,
      aspectRatio: '16:9',
      thumbnailUrl: driveFileId
        ? `https://drive.google.com/thumbnail?id=${driveFileId}&sz=w800`
        : 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80'
    };
  }

  // 7. Direct MP4 / WebM / Cloud Storage Videos
  const isDirectVideoExt = Boolean(url.match(/\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i));
  const isVideoBlobOrData = url.startsWith('data:video') || url.startsWith('blob:');
  const isFirebaseStorageVideo = url.includes('firebasestorage.googleapis.com') && 
    (url.includes('%2Fvideos%2F') || url.includes('/videos/') || url.includes('%2Freels%2F') || url.includes('/reels/') || isDirectVideoExt);
  const isMixkitVideo = url.includes('assets.mixkit.co') && (isDirectVideoExt || url.includes('/videos/'));

  if (isDirectVideoExt || isVideoBlobOrData || isFirebaseStorageVideo || isMixkitVideo) {
    return {
      provider: 'direct',
      videoId: 'direct-video',
      embedUrl: url,
      originalUrl: url,
      isVertical: false,
      aspectRatio: '16:9',
      thumbnailUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80'
    };
  }

  return {
    provider: 'unknown',
    videoId: 'unknown',
    embedUrl: url,
    originalUrl: url,
    isVertical: false,
    aspectRatio: '16:9'
  };
}

export interface EmbedUrlResult {
  embedUrl: string;
  isDirectVideo: boolean;
  provider: VideoProvider;
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3';
  isVertical: boolean;
  thumbnailUrl?: string;
  videoId?: string;
  isValid: boolean;
}

/**
 * Standard utility function: getEmbedUrl(url)
 * Converts any standard external video link (YouTube, Shorts, Vimeo, Hudl, TikTok, Instagram, Direct MP4)
 * into a sanitized responsive embed or direct playback URL.
 */
export function getEmbedUrl(rawUrl: string | undefined | null): EmbedUrlResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return {
      embedUrl: '',
      isDirectVideo: false,
      provider: 'unknown',
      aspectRatio: '16:9',
      isVertical: false,
      isValid: false
    };
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return {
      embedUrl: '',
      isDirectVideo: false,
      provider: 'unknown',
      aspectRatio: '16:9',
      isVertical: false,
      isValid: false
    };
  }

  const parsed = parseVideoUrl(trimmed);
  if (!parsed || parsed.provider === 'unknown') {
    return {
      embedUrl: '',
      isDirectVideo: false,
      provider: 'unknown',
      aspectRatio: '16:9',
      isVertical: false,
      isValid: false
    };
  }

  return {
    embedUrl: parsed.embedUrl,
    isDirectVideo: parsed.provider === 'direct',
    provider: parsed.provider,
    aspectRatio: parsed.aspectRatio,
    isVertical: parsed.isVertical,
    thumbnailUrl: parsed.thumbnailUrl,
    videoId: parsed.videoId,
    isValid: true
  };
}

/**
 * Validates if the string is a recognized video URL pointing to a supported video platform or file:
 * YouTube, Hudl, Instagram Reels, TikTok, Vimeo, or a direct MP4/video link.
 */
export function isValidVideoUrl(rawUrl: string | undefined | null): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;

  // Immediate rejection of static images
  if (/\.(jpe?g|png|webp|gif|heic|svg|bmp|tiff|avif)(\?.*)?$/i.test(trimmed)) {
    return false;
  }
  if (trimmed.includes('images.unsplash.com') || trimmed.includes('unsplash.com/photos/')) {
    return false;
  }

  const parsed = parseVideoUrl(trimmed);
  return parsed !== null && parsed.provider !== 'unknown';
}

/**
 * Returns human-readable label for the video provider
 */
export function getVideoProviderName(provider: VideoProvider): string {
  switch (provider) {
    case 'youtube': return 'YouTube';
    case 'hudl': return 'Hudl Tape';
    case 'tiktok': return 'TikTok';
    case 'instagram': return 'Instagram Reel';
    case 'facebook': return 'Facebook Video';
    case 'vimeo': return 'Vimeo';
    case 'google_drive': return 'Google Drive Film';
    case 'direct': return 'Direct HD Video';
    default: return 'External Video';
  }
}

/**
 * Returns brand badge color class for the video provider
 */
export function getVideoProviderBadge(provider: VideoProvider): { bg: string; text: string; border: string; icon: string } {
  switch (provider) {
    case 'youtube':
      return { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', icon: '▶️' };
    case 'hudl':
      return { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', icon: '⚡' };
    case 'tiktok':
      return { bg: 'bg-cyan-500/15', text: 'text-cyan-300', border: 'border-cyan-500/30', icon: '🎵' };
    case 'instagram':
      return { bg: 'bg-pink-500/15', text: 'text-pink-400', border: 'border-pink-500/30', icon: '📸' };
    case 'facebook':
      return { bg: 'bg-indigo-500/15', text: 'text-indigo-400', border: 'border-indigo-500/30', icon: '👤' };
    case 'vimeo':
      return { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30', icon: '🎬' };
    case 'google_drive':
      return { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', icon: '📁' };
    default:
      return { bg: 'bg-slate-500/15', text: 'text-slate-300', border: 'border-slate-500/30', icon: '🎥' };
  }
}
