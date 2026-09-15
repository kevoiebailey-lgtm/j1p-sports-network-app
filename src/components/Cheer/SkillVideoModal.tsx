import React, { useState } from 'react';
import { 
  X, 
  ExternalLink, 
  Play, 
  ShieldCheck, 
  Sparkles, 
  Clock, 
  Layers, 
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import { CheerSkillItem } from './types';
import { LEVEL_BADGES, SURFACE_LABELS } from './defaultSkills';

interface SkillVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  skill: CheerSkillItem | null;
  athleteName?: string;
}

/**
 * Parses raw external video URLs into embeddable iframe URLs.
 * Supports YouTube (standard, shortlinks, shorts), Vimeo, and Hudl.
 */
function parseEmbedUrl(url: string, timestamp?: string): { embedUrl: string | null; platform: 'youtube' | 'vimeo' | 'hudl' | 'social_direct' | 'unsupported' } {
  if (!url) return { embedUrl: null, platform: 'unsupported' };

  const trimmed = url.trim();

  // Convert timestamp (e.g., "0:24", "1:15", "45") to seconds
  let startSeconds = 0;
  if (timestamp) {
    const parts = timestamp.split(':').map((p) => parseInt(p.trim(), 10));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      startSeconds = parts[0] * 60 + parts[1];
    } else if (parts.length === 1 && !isNaN(parts[0])) {
      startSeconds = parts[0];
    }
  }

  // 1. YouTube Matchers
  // https://www.youtube.com/watch?v=VIDEO_ID or &t=24
  // https://youtu.be/VIDEO_ID
  // https://www.youtube.com/shorts/VIDEO_ID
  // https://www.youtube.com/embed/VIDEO_ID
  const ytMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    let embed = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
    if (startSeconds > 0) {
      embed += `&start=${startSeconds}`;
    }
    return { embedUrl: embed, platform: 'youtube' };
  }

  // 2. Vimeo Matcher
  // https://vimeo.com/123456789 or player.vimeo.com/video/123456789
  const vimeoMatch = trimmed.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    const videoId = vimeoMatch[1];
    let embed = `https://player.vimeo.com/video/${videoId}?autoplay=1&title=0&byline=0`;
    if (startSeconds > 0) {
      embed += `#t=${startSeconds}s`;
    }
    return { embedUrl: embed, platform: 'vimeo' };
  }

  // 3. Hudl Matcher
  // https://www.hudl.com/video/3/... or https://www.hudl.com/v/...
  if (trimmed.includes('hudl.com')) {
    // Hudl embed link if direct iframe provided or standard hudl video
    if (trimmed.includes('/embed/')) {
      return { embedUrl: trimmed, platform: 'hudl' };
    }
    // Hudl player embed pattern
    return { embedUrl: trimmed, platform: 'hudl' };
  }

  // 4. Instagram / TikTok / X (Direct links)
  if (trimmed.includes('instagram.com') || trimmed.includes('tiktok.com') || trimmed.includes('x.com') || trimmed.includes('twitter.com')) {
    return { embedUrl: null, platform: 'social_direct' };
  }

  return { embedUrl: null, platform: 'social_direct' };
}

export const SkillVideoModal: React.FC<SkillVideoModalProps> = ({
  isOpen,
  onClose,
  skill,
  athleteName = 'Athlete'
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !skill) return null;

  const { embedUrl, platform } = parseEmbedUrl(skill.videoUrl, skill.timestamp);
  const levelInfo = LEVEL_BADGES[skill.level] || LEVEL_BADGES['Level 5'];
  const surfaceInfo = skill.surface ? SURFACE_LABELS[skill.surface] : null;

  const handleCopyLink = () => {
    if (skill.videoUrl) {
      navigator.clipboard.writeText(skill.videoUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#0a0a0a] border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-neutral-800/80 flex items-center justify-between bg-neutral-900/60 backdrop-blur-xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white truncate font-sans">
                  {skill.name}
                </h3>
                
                {skill.verified ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    Verified Proof
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-[0_0_10px_rgba(56,189,248,0.2)]">
                    <Sparkles className="w-3 h-3 text-sky-400" />
                    Unverified Skill Clip
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 truncate mt-0.5">
                {athleteName} &bull; CheerMatrix Scout Verification
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {skill.videoUrl && (
              <button
                onClick={handleCopyLink}
                className="p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition-colors cursor-pointer"
                title="Copy External Video URL"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Player Container */}
        <div className="relative bg-black flex-1 min-h-[260px] sm:min-h-[420px] flex items-center justify-center">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title={`${skill.name} - Cheerleading Skill Verification`}
              className="w-full h-full min-h-[280px] sm:min-h-[440px] border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <div className="p-8 text-center max-w-md space-y-4">
              <div className="w-14 h-14 mx-auto rounded-3xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-sky-400 shadow-[0_0_25px_rgba(56,189,248,0.2)]">
                <ExternalLink className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">External Platform Video</h4>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  {platform === 'social_direct'
                    ? 'This video clip is hosted on an external social network (Instagram / TikTok / Hudl) which restricts embedded iframe playback.'
                    : 'No direct iframe embed is available for this clip.'}
                </p>
              </div>

              {skill.videoUrl ? (
                <a
                  href={skill.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-neutral-950 font-mono font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all transform active:scale-95"
                >
                  <span>Open Video in New Tab</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-500 text-xs font-mono">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span>No video URL submitted for this skill yet.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tactical Badges & Metadata Footer */}
        <div className="p-4 sm:p-5 bg-neutral-950 border-t border-neutral-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Skill Level Badge */}
            <span className={`px-3 py-1 rounded-xl font-mono font-bold uppercase tracking-wider text-[11px] border bg-neutral-900 ${levelInfo.color} ${levelInfo.border} ${levelInfo.glow}`}>
              {levelInfo.label}
            </span>

            {/* Surface Type Badge */}
            {surfaceInfo && (
              <span className={`px-3 py-1 rounded-xl font-mono font-bold text-[11px] border ${surfaceInfo.bg} ${surfaceInfo.badgeColor}`}>
                <Layers className="w-3.5 h-3.5 inline mr-1" />
                {surfaceInfo.label}
              </span>
            )}

            {/* Timestamp */}
            {skill.timestamp && (
              <span className="px-3 py-1 rounded-xl font-mono font-bold text-[11px] bg-neutral-900 border border-neutral-800 text-neutral-300">
                <Clock className="w-3.5 h-3.5 inline mr-1 text-sky-400" />
                Timestamp: {skill.timestamp}
              </span>
            )}
          </div>

          {/* Direct Video Link */}
          {skill.videoUrl && (
            <a
              href={skill.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1.5 transition-colors group"
            >
              <span>Source URL</span>
              <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          )}
        </div>

        {/* Coach / Execution Notes if available */}
        {skill.notes && (
          <div className="px-5 py-3 bg-neutral-900/40 border-t border-neutral-800/60 text-xs text-neutral-400 flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">Execution Notes:</span>
            <span className="text-neutral-300">{skill.notes}</span>
          </div>
        )}

      </div>
    </div>
  );
};
