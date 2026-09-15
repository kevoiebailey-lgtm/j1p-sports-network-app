export type VideoType = 'native' | 'youtube' | 'vimeo' | 'twitch' | 'kick' | 'instagram' | 'tiktok' | 'hudl' | 'google_drive' | 'external';

export interface ProcessedVideoInfo {
  type: VideoType;
  rawUrl: string;
  embedUrl: string;
  platformName: string;
  videoId?: string;
  isDirectFile: boolean;
  isVertical?: boolean;
}

/**
 * Parses and classifies incoming video URLs (YouTube, Vimeo, Twitch, Kick, Instagram, TikTok, Hudl, Direct MP4/MOV)
 */
export function parseVideoUrl(url: string): ProcessedVideoInfo {
  const trimmed = (url || '').trim();
  if (!trimmed) {
    return {
      type: 'external',
      rawUrl: '',
      embedUrl: '',
      platformName: 'Unknown',
      isDirectFile: false,
      isVertical: false,
    };
  }

  // 1. YouTube (Watch, Shorts, Share youtu.be, Embed)
  if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be')) {
    let videoId = '';
    const ytMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i);
    if (ytMatch && ytMatch[1]) {
      videoId = ytMatch[1];
    }
    const isShorts = trimmed.includes('/shorts/');
    const embedUrl = videoId
      ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&rel=0`
      : trimmed;

    return {
      type: 'youtube',
      rawUrl: trimmed,
      embedUrl,
      platformName: isShorts ? 'YouTube Shorts' : 'YouTube Film',
      videoId,
      isDirectFile: false,
      isVertical: isShorts,
    };
  }

  // 2. Twitch
  if (trimmed.includes('twitch.tv')) {
    const parentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    let embedUrl = trimmed;
    let channelOrVideo = '';

    const channelMatch = trimmed.match(/twitch\.tv\/([\w-]+)/i);
    const videoMatch = trimmed.match(/twitch\.tv\/videos\/(\d+)/i);

    if (videoMatch && videoMatch[1]) {
      channelOrVideo = videoMatch[1];
      embedUrl = `https://player.twitch.tv/?video=${channelOrVideo}&parent=${parentHost}&autoplay=true&muted=true`;
    } else if (channelMatch && channelMatch[1] && channelMatch[1] !== 'directory') {
      channelOrVideo = channelMatch[1];
      embedUrl = `https://player.twitch.tv/?channel=${channelOrVideo}&parent=${parentHost}&autoplay=true&muted=true`;
    }

    return {
      type: 'twitch',
      rawUrl: trimmed,
      embedUrl,
      platformName: 'Twitch Stream',
      videoId: channelOrVideo,
      isDirectFile: false,
      isVertical: false,
    };
  }

  // 3. Kick
  if (trimmed.includes('kick.com')) {
    const kickMatch = trimmed.match(/kick\.com\/([\w-]+)/i);
    const channelName = kickMatch ? kickMatch[1] : '';
    const embedUrl = channelName ? `https://player.kick.com/${channelName}` : trimmed;

    return {
      type: 'kick',
      rawUrl: trimmed,
      embedUrl,
      platformName: 'Kick Stream',
      videoId: channelName,
      isDirectFile: false,
      isVertical: false,
    };
  }

  // 4. Vimeo
  if (trimmed.includes('vimeo.com')) {
    const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
    const videoId = vimeoMatch ? vimeoMatch[1] : '';
    const embedUrl = videoId
      ? `https://player.vimeo.com/video/${videoId}?autoplay=1&muted=1`
      : trimmed;

    return {
      type: 'vimeo',
      rawUrl: trimmed,
      embedUrl,
      platformName: 'Vimeo Film',
      videoId,
      isDirectFile: false,
      isVertical: false,
    };
  }

  // 5. Hudl
  if (trimmed.includes('hudl.com')) {
    let embedUrl = trimmed;
    let videoId = '';

    if (trimmed.includes('/embed/')) {
      embedUrl = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    } else {
      const hudlMatch = trimmed.match(/hudl\.com\/(?:video|embed\/video|v)\/([a-zA-Z0-9_\-\/]+)/i);
      if (hudlMatch && hudlMatch[1]) {
        videoId = hudlMatch[1];
        embedUrl = `https://www.hudl.com/embed/video/${videoId}`;
      }
    }

    return {
      type: 'hudl',
      rawUrl: trimmed,
      embedUrl,
      platformName: 'Hudl Highlight',
      videoId,
      isDirectFile: false,
      isVertical: false,
    };
  }

  // 6. Instagram
  if (trimmed.includes('instagram.com') || trimmed.includes('instagr.am')) {
    const igMatch = trimmed.match(/instagram\.com\/(p|reel|tv)\/([\w-]+)/i);
    const type = igMatch ? igMatch[1] : 'p';
    const videoId = igMatch ? igMatch[2] : '';
    const isReel = type === 'reel' || type === 'tv';
    const embedUrl = videoId
      ? `https://www.instagram.com/${type}/${videoId}/embed`
      : trimmed;

    return {
      type: 'instagram',
      rawUrl: trimmed,
      embedUrl,
      platformName: isReel ? 'Instagram Reel' : 'Instagram Film',
      videoId,
      isDirectFile: false,
      isVertical: isReel,
    };
  }

  // 7. TikTok
  if (trimmed.includes('tiktok.com')) {
    const ttMatch = trimmed.match(/tiktok\.com\/@[a-zA-Z0-9._-]+\/video\/(\d+)/i);
    const videoId = ttMatch ? ttMatch[1] : '';
    const embedUrl = videoId
      ? `https://www.tiktok.com/embed/v2/${videoId}`
      : trimmed;

    return {
      type: 'tiktok',
      rawUrl: trimmed,
      embedUrl,
      platformName: 'TikTok Clip',
      videoId,
      isDirectFile: false,
      isVertical: true,
    };
  }

  // 8. Google Drive Film / Preview
  if (trimmed.includes('drive.google.com')) {
    let driveFileId = '';
    const fileMatch = trimmed.match(/\/file\/d\/([\w-]+)/i);
    const idMatch = trimmed.match(/[?&]id=([\w-]+)/i);
    if (fileMatch && fileMatch[1]) {
      driveFileId = fileMatch[1];
    } else if (idMatch && idMatch[1]) {
      driveFileId = idMatch[1];
    }

    const embedUrl = driveFileId
      ? `https://drive.google.com/file/d/${driveFileId}/preview`
      : trimmed;

    return {
      type: 'google_drive',
      rawUrl: trimmed,
      embedUrl,
      platformName: 'Google Drive Game Film',
      videoId: driveFileId,
      isDirectFile: false,
      isVertical: false,
    };
  }

  // 9. Direct MP4 / MOV / M4V / WebM / HLS / Media file / Data URL / Blob / Firebase Storage
  const lower = trimmed.toLowerCase();
  const isDirectFile =
    lower.endsWith('.mp4') ||
    lower.endsWith('.mov') ||
    lower.endsWith('.m4v') ||
    lower.endsWith('.webm') ||
    lower.endsWith('.ogv') ||
    lower.endsWith('.m3u8') ||
    lower.includes('.mp4?') ||
    lower.includes('.mov?') ||
    lower.includes('.m4v?') ||
    lower.includes('.webm?') ||
    lower.startsWith('blob:') ||
    lower.startsWith('data:video/') ||
    lower.includes('firebasestorage.googleapis.com') ||
    lower.includes('storage.googleapis.com') ||
    lower.includes('assets.mixkit.co') ||
    lower.includes('cloudinary.com') ||
    lower.includes('s3.amazonaws.com') ||
    // If it's not a known third-party embed platform (YouTube, Vimeo, Twitch, Kick, Instagram, TikTok, Hudl), treat standard video stream URLs as native
    (!trimmed.includes('youtube.com') && 
     !trimmed.includes('youtu.be') && 
     !trimmed.includes('vimeo.com') && 
     !trimmed.includes('twitch.tv') && 
     !trimmed.includes('kick.com') && 
     !trimmed.includes('instagram.com') && 
     !trimmed.includes('tiktok.com') && 
     !trimmed.includes('hudl.com') &&
     (trimmed.includes('video') || trimmed.includes('.mp4') || trimmed.startsWith('blob:') || trimmed.startsWith('data:')));

  return {
    type: isDirectFile ? 'native' : 'external',
    rawUrl: trimmed,
    embedUrl: trimmed,
    platformName: isDirectFile ? 'Direct Media Stream' : 'External Stream',
    isDirectFile,
    isVertical: false,
  };
}

