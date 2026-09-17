import React from 'react';

export interface VideoEmbedInfo {
  platform: 'youtube' | 'youtube_shorts' | 'vimeo' | 'tiktok' | 'instagram' | 'hudl' | 'google_drive';
  embedUrl: string;
  originalUrl: string;
  isVertical?: boolean;
}

export function detectVideoEmbed(text: string): VideoEmbedInfo | null {
  if (!text) return null;

  // 1. YouTube Shorts (Vertical 9:16)
  const ytShortsMatch = text.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i);
  if (ytShortsMatch) {
    return {
      platform: 'youtube_shorts',
      embedUrl: `https://www.youtube.com/embed/${ytShortsMatch[1]}?autoplay=0&rel=0`,
      originalUrl: ytShortsMatch[0],
      isVertical: true
    };
  }

  // 2. Standard YouTube
  const ytMatch = text.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (ytMatch) {
    return {
      platform: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&rel=0`,
      originalUrl: ytMatch[0],
      isVertical: false
    };
  }

  // 3. TikTok
  const tiktokMatch = text.match(/(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[a-zA-Z0-9._-]+\/video\/([0-9]+)/i);
  if (tiktokMatch) {
    return {
      platform: 'tiktok',
      embedUrl: `https://www.tiktok.com/embed/v2/${tiktokMatch[1]}`,
      originalUrl: tiktokMatch[0],
      isVertical: true
    };
  }

  // 4. Instagram (Posts or Reels)
  const igMatch = text.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/(p|reel|tv)\/([a-zA-Z0-9_-]+)/i);
  if (igMatch) {
    const type = igMatch[1];
    const code = igMatch[2];
    const isReel = type === 'reel' || type === 'tv';
    return {
      platform: 'instagram',
      embedUrl: `https://www.instagram.com/${type}/${code}/embed`,
      originalUrl: igMatch[0],
      isVertical: isReel
    };
  }

  // 5. Vimeo
  const vimeoMatch = text.match(/(?:https?:\/\/)?(?:www\.)?vimeo\.com\/([0-9]+)/i);
  if (vimeoMatch) {
    return {
      platform: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      originalUrl: vimeoMatch[0],
      isVertical: false
    };
  }

  // 6. Hudl
  const hudlMatch = text.match(/(?:https?:\/\/)?(?:www\.)?hudl\.com\/(?:video|embed\/video|v)\/([a-zA-Z0-9_\-\/]+)/i);
  if (hudlMatch) {
    const rawPath = hudlMatch[1];
    let embedUrl = `https://www.hudl.com/embed/video/${rawPath}`;
    if (hudlMatch[0].includes('/embed/video/')) {
      embedUrl = hudlMatch[0].startsWith('http') ? hudlMatch[0] : `https://${hudlMatch[0]}`;
    }
    return {
      platform: 'hudl',
      embedUrl,
      originalUrl: hudlMatch[0],
      isVertical: false
    };
  }

  // 7. Google Drive Video
  if (text.includes('drive.google.com')) {
    let driveFileId = '';
    const fileMatch = text.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
    const idMatch = text.match(/drive\.google\.com\/[^\s]*[?&]id=([a-zA-Z0-9_-]+)/i);
    if (fileMatch && fileMatch[1]) {
      driveFileId = fileMatch[1];
    } else if (idMatch && idMatch[1]) {
      driveFileId = idMatch[1];
    }

    if (driveFileId) {
      return {
        platform: 'google_drive',
        embedUrl: `https://drive.google.com/file/d/${driveFileId}/preview`,
        originalUrl: `https://drive.google.com/file/d/${driveFileId}/view`,
        isVertical: false
      };
    }
  }

  // 8. Direct video files (.mp4, .mov, .webm, .m4v, blob:, data:video/)
  const directVideoMatch = text.match(/(https?:\/\/[^\s]+\.(?:mp4|mov|webm|m4v)(?:\?[^\s]*)?|https?:\/\/firebasestorage\.googleapis\.com\/[^\s]+|blob:[^\s]+|data:video\/[^\s]+)/i);
  if (directVideoMatch) {
    return {
      platform: 'youtube' as any, // Not an iframe, but handled natively by video tag
      embedUrl: directVideoMatch[0],
      originalUrl: directVideoMatch[0],
      isVertical: false
    };
  }

  return null;
}

/**
 * Parses caption text and converts URLs, #hashtags, and @mentions into active, styled interactive elements.
 * Automatically cleans up raw media URLs if embedded.
 */
export function renderParsedCaption(
  text: string, 
  onTagClick?: (tag: string) => void,
  options: { hideVideoUrls?: boolean } = {}
) {
  if (!text) return null;

  const videoEmbed = detectVideoEmbed(text);
  const videoUrlToHide = options.hideVideoUrls && videoEmbed ? videoEmbed.originalUrl : null;

  // Tokenize by spaces and line breaks while keeping delimiters
  const tokens = text.split(/(\s+)/);

  return (
    <span>
      {tokens.map((token, idx) => {
        const trimmed = token.trim();

        // Hide raw URL if it's already rendered as an embedded video card
        if (videoUrlToHide && trimmed && (videoUrlToHide === trimmed || videoUrlToHide.includes(trimmed))) {
          return null;
        }

        // Match Web URLs
        if (/^https?:\/\/[^\s]+$/i.test(token)) {
          const isEmbed = detectVideoEmbed(token);
          if (isEmbed) {
            return (
              <a
                key={idx}
                href={token}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E5B868]/10 border border-[#E5B868]/30 text-[#E5B868] text-[11px] font-mono font-bold hover:underline transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <span>📹</span>
                <span>{isEmbed.platform.toUpperCase()} FILM</span>
              </a>
            );
          }

          return (
            <a
              key={idx}
              href={token}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#E2E8F0] font-semibold underline underline-offset-2 hover:text-[#5fa0ff] transition-colors break-all"
              onClick={(e) => e.stopPropagation()}
            >
              {token}
            </a>
          );
        }

        // Match Hashtags (#FlagFootball, #Recruiting)
        if (/^#[a-zA-Z0-9_]+$/.test(token)) {
          return (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                if (onTagClick) onTagClick(token);
              }}
              className="text-[#E5B868] font-bold hover:text-[#4dff68] hover:underline transition-colors cursor-pointer"
            >
              {token}
            </button>
          );
        }

        // Match Mentions (@KevoieBailey, @CoachVance)
        if (/^@[a-zA-Z0-9_.]+(?:\(\w+\))?$/.test(token) || /^@[a-zA-Z0-9_.]{2,}$/.test(token)) {
          return (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                if (onTagClick) onTagClick(token);
              }}
              className="text-[#E2E8F0] font-bold hover:text-[#5fa0ff] hover:underline transition-colors cursor-pointer"
            >
              {token}
            </button>
          );
        }

        return <span key={idx}>{token}</span>;
      })}
    </span>
  );
}
