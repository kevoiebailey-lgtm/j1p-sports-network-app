import React from 'react';
import { parseVideoUrl } from '../../lib/videoEmbedUtils';
import { Video } from 'lucide-react';

export interface ExternalEmbedPlayerProps {
  streamUrl: string;
  isMuted?: boolean;
  isPlaying?: boolean;
  title?: string;
}

export const ExternalEmbedPlayer: React.FC<ExternalEmbedPlayerProps> = ({
  streamUrl,
  isMuted = false,
  isPlaying = true,
  title = 'Live Stream Embed'
}) => {
  const videoInfo = parseVideoUrl(streamUrl);

  const isIframeType = [
    'youtube',
    'twitch',
    'kick',
    'vimeo',
    'hudl',
    'instagram',
    'tiktok'
  ].includes(videoInfo.type);

  if (isIframeType && videoInfo.embedUrl) {
    return (
      <div className="w-full h-full relative bg-[#212A31] flex items-center justify-center">
        <iframe
          src={videoInfo.embedUrl}
          title={title}
          className="w-full h-full border-0 select-none"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  if (streamUrl && streamUrl.trim().length > 0) {
    return (
      <div className="w-full h-full relative bg-[#212A31] flex items-center justify-center">
        <video
          src={streamUrl}
          autoPlay={isPlaying}
          loop
          muted={isMuted}
          playsInline
          controls={false}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#212A31] flex flex-col items-center justify-center p-6 text-center text-slate-400">
      <Video className="w-10 h-10 text-slate-600 mb-2" />
      <p className="text-xs font-mono">Invalid or missing stream URL source.</p>
    </div>
  );
};
