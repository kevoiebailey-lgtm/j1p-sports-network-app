import React from 'react';
import { CardTheme } from '../../types/cardTheme';
import { ShieldCheck, Flame, Award, Zap, Sparkles } from 'lucide-react';

interface AthleteTradingCardProps {
  theme: CardTheme;
  displayName: string;
  jerseyNumber?: string;
  position: string;
  school?: string;
  gradYear?: string | number;
  avatarUrl?: string;
  metrics?: {
    dash40?: number | string;
    vertLeap?: number | string;
    height?: string;
    weight?: string;
    gpa?: number | string;
  };
  className?: string;
}

export const AthleteTradingCard: React.FC<AthleteTradingCardProps> = ({
  theme,
  displayName,
  jerseyNumber = '07',
  position,
  school = 'Official Combine',
  gradYear = '2026',
  avatarUrl,
  metrics,
  className = ''
}) => {
  return (
    <div
      className={`relative w-full max-w-sm aspect-[5/7] rounded-3xl overflow-hidden border-2 p-5 flex flex-col justify-between select-none shadow-2xl transition-all duration-300 ${className}`}
      style={{
        borderColor: theme.accentColor,
        boxShadow: `0 0 35px ${theme.glowColor}, inset 0 0 20px rgba(0,0,0,0.8)`
      }}
    >
      {/* 1. Backdrop Image */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105 pointer-events-none"
        style={{ backgroundImage: `url(${theme.backdropUrl})` }}
      />

      {/* Dark Vignette Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/60 pointer-events-none" />

      {/* 2. Optional Theme Overlay (smoke, flares, sparks, shards) */}
      {theme.overlayUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center mix-blend-screen opacity-70 pointer-events-none"
          style={{ backgroundImage: `url(${theme.overlayUrl})` }}
        />
      )}

      {/* 3. Top Banner Header */}
      <div className="relative z-10 flex items-start justify-between">
        <div>
          {/* Angled Badge */}
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-black tracking-widest uppercase text-black shadow-lg"
            style={{
              backgroundColor: theme.accentColor,
              transform: `rotate(${theme.bannerAngle}deg)`,
              fontStyle: theme.fontStyle
            }}
          >
            <Zap className="w-3 h-3 text-black" fill="currentColor" />
            <span>JUST1PLAY OFFICIAL</span>
          </div>

          <div className="mt-1 text-[11px] font-mono text-slate-300 tracking-wider flex items-center gap-1">
            <span style={{ color: theme.accentColor }}>{theme.name}</span>
            <span className="text-slate-500">•</span>
            <span className="uppercase">{theme.sport}</span>
          </div>
        </div>

        {/* Verified Badge */}
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/70 border border-white/20 text-[10px] font-mono font-bold text-white uppercase backdrop-blur-md">
          <ShieldCheck className="w-3.5 h-3.5" style={{ color: theme.accentColor }} />
          <span>VERIFIED</span>
        </div>
      </div>

      {/* 4. Center Athlete Portrait */}
      <div className="relative z-10 flex flex-col items-center my-auto">
        <div 
          className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden border-2 shadow-2xl group"
          style={{ borderColor: theme.accentColor }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-full h-full object-cover object-top filter brightness-105 contrast-105"
            />
          ) : (
            <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-500">
              <Award className="w-12 h-12" />
            </div>
          )}
          
          <div 
            className="absolute bottom-1 right-1 px-2 py-0.5 rounded bg-black/80 text-[10px] font-black font-mono border"
            style={{ color: theme.accentColor, borderColor: theme.accentColor }}
          >
            #{jerseyNumber}
          </div>
        </div>

        {/* Player Name and Team */}
        <div className="mt-3 text-center">
          <h2
            className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase drop-shadow-md"
            style={{ fontStyle: theme.fontStyle }}
          >
            {displayName}
          </h2>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
            <span style={{ color: theme.accentColor }}>{position}</span> • Class of {gradYear}
          </p>
          <p className="text-[11px] text-slate-400 font-mono truncate max-w-[240px]">
            {school}
          </p>
        </div>
      </div>

      {/* 5. Bottom Verified Combine Stats Bar */}
      <div className="relative z-10 bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl p-2.5">
        <div className="grid grid-cols-4 gap-1 text-center">
          <div>
            <div className="text-[9px] font-bold text-slate-400 uppercase">40Y Dash</div>
            <div className="text-sm font-black text-white font-mono">
              {metrics?.dash40 ? `${metrics.dash40}s` : '4.42s'}
            </div>
          </div>
          <div>
            <div className="text-[9px] font-bold text-slate-400 uppercase">Vertical</div>
            <div className="text-sm font-black text-white font-mono">
              {metrics?.vertLeap ? `${metrics.vertLeap}"` : '36.5"'}
            </div>
          </div>
          <div>
            <div className="text-[9px] font-bold text-slate-400 uppercase">Height</div>
            <div className="text-sm font-black text-white font-mono">
              {metrics?.height || '6\'1"'}
            </div>
          </div>
          <div>
            <div className="text-[9px] font-bold text-slate-400 uppercase">GPA</div>
            <div 
              className="text-sm font-black font-mono"
              style={{ color: theme.accentColor }}
            >
              {metrics?.gpa || '3.85'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
