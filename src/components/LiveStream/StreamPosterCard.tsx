import React from 'react';
import { Activity, Clock, RefreshCw, Radio } from 'lucide-react';

export interface StreamPosterCardProps {
  status: 'initializing' | 'upcoming' | 'offline';
  title?: string;
  thumbnailUrl?: string;
  startTime?: string;
  onRetry?: () => void;
}

export const StreamPosterCard: React.FC<StreamPosterCardProps> = ({
  status,
  title = 'Game Broadcast',
  thumbnailUrl = 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&auto=format&fit=crop&q=80',
  startTime = 'Tonight @ 7:30 PM EST',
  onRetry
}) => {
  return (
    <div className="relative w-full h-full bg-[#212A31] flex items-center justify-center overflow-hidden">
      
      {/* Background Poster Thumbnail with Blur */}
      <img
        src={thumbnailUrl}
        alt={title}
        className="absolute inset-0 w-full h-full object-cover filter blur-md opacity-40 scale-105"
      />
      
      {/* Dark Vignette Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#212A31] via-[#212A31]/80 to-[#212A31]/60" />

      {/* Content Box */}
      <div className="relative z-10 max-w-md w-full mx-4 p-6 sm:p-8 rounded-3xl bg-[#212A31]/80 border border-slate-800/90 backdrop-blur-2xl shadow-2xl text-center space-y-4">
        
        {status === 'initializing' && (
          <>
            {/* Pulsing Radar Ring */}
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-red-600/20 animate-ping" />
              <div className="w-14 h-14 rounded-2xl bg-red-600/10 border border-red-600/30 text-red-500 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                <Activity className="w-7 h-7 animate-pulse" />
              </div>
            </div>

            <div className="space-y-1">
              <span className="px-3 py-1 rounded-full bg-red-600/10 text-red-500 border border-red-600/30 text-[10px] font-mono font-bold uppercase tracking-wider">
                BROADCAST FEED CONNECTING
              </span>
              <h3 className="text-xl font-black italic text-white uppercase font-sans tracking-tight pt-1">
                INITIALIZING GAME FEED BROADCAST...
              </h3>
              <p className="text-xs text-slate-400 font-sans">
                Connecting to Just1Play camera feed, encoder signals, and high-definition telemetry stream...
              </p>
            </div>

            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 uppercase tracking-wider transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-red-500" />
                <span>Reconnect Stream</span>
              </button>
            )}
          </>
        )}

        {status === 'upcoming' && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(245,158,11,0.3)]">
              <Clock className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-mono font-bold uppercase tracking-wider">
                BROADCAST STANDBY
              </span>
              <h3 className="text-xl font-black italic text-white uppercase font-sans tracking-tight pt-1">
                GAME BROADCAST STARTING SOON
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Scheduled Start: <strong className="text-amber-400">{startTime}</strong>
              </p>
            </div>
          </>
        )}

        {status === 'offline' && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center mx-auto">
              <Radio className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black italic text-white uppercase font-sans tracking-tight">
                BROADCAST CONCLUDED
              </h3>
              <p className="text-xs text-slate-400 font-sans">
                This stream has completed. Replay highlights will be available in the Media Hub.
              </p>
            </div>
          </>
        )}

      </div>
    </div>
  );
};
