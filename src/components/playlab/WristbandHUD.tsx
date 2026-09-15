'use client';

import React, { useState, useEffect } from 'react';
import {
  Radio,
  Wifi,
  WifiOff,
  Sun,
  Moon,
  Maximize2,
  Minimize2,
  Printer,
  Sliders,
  Sparkles,
  ChevronRight,
  Shield,
  Volume2,
  Zap,
} from 'lucide-react';
import { LiveCalloutTelemetry, PlayLabPlay } from '../../types/tactics';
import { subscribeToLiveCallout } from '../../services/telemetryService';
import { get12SlotCallSheet } from '../../services/playlabService';
import { PositionFilter } from '../wristband/PositionFilter';
import { PlayVectorThumbnail } from './CallSheet12Card';
import { triggerHaptic } from '../../lib/haptics';

interface WristbandHUDProps {
  teamId?: string;
  initialPosition?: string;
  onOpenPrintCard?: () => void;
  onOpenPlayLab?: () => void;
}

export const WristbandHUD: React.FC<WristbandHUDProps> = ({
  teamId = 'default_team',
  initialPosition = 'QB',
  onOpenPrintCard,
  onOpenPlayLab,
}) => {
  const [liveCall, setLiveCall] = useState<LiveCalloutTelemetry | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [selectedPosition, setSelectedPosition] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('j1p_wrist_position') || initialPosition;
    }
    return initialPosition;
  });

  const [callSheetPlays, setCallSheetPlays] = useState<PlayLabPlay[]>([]);
  const [selectedSlotPlay, setSelectedSlotPlay] = useState<PlayLabPlay | null>(null);

  // High-Visibility Mode: 'dark' (Tactical), 'print-white' (Sunlight White), or 'oled-neon' (True-Black Volt OLED)
  const [themeMode, setThemeMode] = useState<'dark' | 'print-white' | 'oled-neon'>('dark');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Fetch 12-slot call sheet for team/offline HUD cache
  useEffect(() => {
    let isMounted = true;

    const loadSheet = async () => {
      try {
        const cachedStr = localStorage.getItem(`telemetry_callsheet_${teamId}`);
        if (cachedStr) {
          const parsed = JSON.parse(cachedStr);
          if (Array.isArray(parsed) && isMounted) {
            setCallSheetPlays(parsed);
          }
        }
        const fresh = await get12SlotCallSheet(teamId);
        if (isMounted && fresh.length > 0) {
          setCallSheetPlays(fresh);
        }
      } catch (err) {
        console.warn('Call sheet HUD load error:', err);
      }
    };

    loadSheet();
    return () => {
      isMounted = false;
    };
  }, [teamId]);

  // Subscribe to live telemetry broadcast (<200ms latency)
  useEffect(() => {
    const unsubscribe = subscribeToLiveCallout(teamId, (callout, isOnline) => {
      setLiveCall(callout);
      setIsConnected(isOnline);

      if (callout) {
        triggerHaptic('heavy');
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate([60, 30, 60]);
          } catch (_) {}
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [teamId]);

  const toggleFullscreen = () => {
    triggerHaptic('light');
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handlePositionSelect = (pos: string) => {
    setSelectedPosition(pos);
    triggerHaptic('light');
    if (typeof window !== 'undefined') {
      localStorage.setItem('j1p_wrist_position', pos);
    }
  };

  const isDead = liveCall?.playState === 'DEAD';

  // Extract individual assignment for selected position
  const activeAssignment =
    liveCall?.assignments?.[selectedPosition] ||
    liveCall?.assignments?.[selectedPosition.toUpperCase()] ||
    (selectedSlotPlay
      ? selectedSlotPlay.routes.find((r) => r.player === selectedPosition)?.routeType ||
        'Standard Stem Progression'
      : '3-Step Drop, Read FS / Primary Read');

  // Colors for high-visibility theme mode
  const isPrintWhite = themeMode === 'print-white';
  const isOledNeon = themeMode === 'oled-neon';

  const bgClass = isPrintWhite
    ? 'bg-white text-black'
    : isOledNeon
    ? 'bg-black text-[#CCFF00]'
    : 'bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 text-neutral-100';

  return (
    <div
      id="wristband-hud-root"
      className={`min-h-[85vh] rounded-3xl border ${
        isPrintWhite ? 'border-black shadow-2xl' : isOledNeon ? 'border-[#CCFF00] shadow-[0_0_30px_rgba(204,255,0,0.2)]' : 'border-neutral-800'
      } p-3 sm:p-5 flex flex-col justify-between select-none transition-colors duration-200 ${bgClass}`}
    >
      {/* Top Telemetry Header */}
      <div>
        <div className={`flex items-center justify-between gap-3 pb-3 border-b ${isPrintWhite ? 'border-slate-300' : 'border-neutral-800'}`}>
          <div className="flex items-center gap-2.5">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-xs font-bold ${
              isPrintWhite ? 'bg-black text-white' : isOledNeon ? 'bg-black border border-[#CCFF00] text-[#CCFF00]' : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
            }`}>
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>&lt;200ms HUD</span>
            </div>

            <div className="flex items-center gap-1 text-xs font-mono">
              {isConnected ? (
                <span className={`flex items-center gap-1 ${isPrintWhite ? 'text-emerald-700 font-bold' : 'text-emerald-400'}`}>
                  <Wifi className="w-3.5 h-3.5" /> LIVE
                </span>
              ) : (
                <span className={`flex items-center gap-1 ${isPrintWhite ? 'text-amber-700 font-bold' : 'text-amber-400'}`}>
                  <WifiOff className="w-3.5 h-3.5" /> CACHED
                </span>
              )}
            </div>
          </div>

          {/* Quick HUD Controls */}
          <div className="flex items-center gap-2">
            {/* High-Visibility Mode 3-Way Selector */}
            <div className={`flex items-center gap-1 p-1 rounded-xl border ${isPrintWhite ? 'bg-slate-100 border-slate-300' : 'bg-neutral-900 border-neutral-800'}`}>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setThemeMode('dark');
                }}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  themeMode === 'dark'
                    ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Tactical Dark Mode"
              >
                🌙 Dark
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setThemeMode('print-white');
                }}
                className={`px-2 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  isPrintWhite
                    ? 'bg-white text-black shadow-md border border-black'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Direct Sunlight Anti-Glare White Mode"
              >
                ☀️ Sun
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setThemeMode('oled-neon');
                }}
                className={`px-2 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  isOledNeon
                    ? 'bg-black text-[#CCFF00] shadow-[0_0_12px_rgba(204,255,0,0.35)] border border-[#CCFF00]'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="True-Black OLED Volt Mode"
              >
                ⚡ Volt
              </button>
            </div>

            {/* Fullscreen Mode */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className={`p-2 rounded-xl border transition-colors ${
                isPrintWhite ? 'bg-slate-100 border-slate-300 text-black hover:bg-slate-200' : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:text-white'
              }`}
              title="Toggle Fullscreen Wrist View"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {onOpenPlayLab && (
              <button
                type="button"
                onClick={onOpenPlayLab}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1 transition-colors ${
                  isPrintWhite ? 'bg-black text-white border-black hover:bg-slate-900' : 'bg-neutral-800 hover:bg-neutral-700 text-white border-neutral-700'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Editor</span>
              </button>
            )}
          </div>
        </div>

        {/* Position Filter (Touch Targets >= 44px) */}
        <div className="py-3">
          <PositionFilter
            selectedPosition={selectedPosition}
            onSelectPosition={handlePositionSelect}
            availablePositions={['QB', 'C', 'X', 'H', 'Z']}
          />
        </div>

        {/* Primary Live Play Broadcast Banner */}
        <div
          className={`mt-1 p-4 rounded-2xl border-2 transition-all ${
            isDead
              ? 'bg-neutral-900/60 border-neutral-800 opacity-60'
              : isPrintWhite
              ? 'bg-white text-black border-black shadow-2xl'
              : isOledNeon
              ? 'bg-black text-white border-[#CCFF00] shadow-[0_0_25px_rgba(204,255,0,0.25)]'
              : 'bg-neutral-900 border-emerald-500/50 shadow-[0_0_25px_rgba(16,185,129,0.2)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-md font-mono text-xs font-black uppercase ${
                  isPrintWhite ? 'bg-black text-white' : isOledNeon ? 'bg-[#CCFF00] text-black font-black' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {liveCall?.formation || selectedSlotPlay?.formation || '5v5 Spread'}
              </span>
              <span className={`text-[10px] font-mono ${isPrintWhite ? 'text-slate-700 font-bold' : 'text-neutral-400'}`}>
                {liveCall?.signalCode || (selectedSlotPlay?.slotIndex ? `SLOT #${selectedSlotPlay.slotIndex}` : 'FLAG-42')}
              </span>
            </div>

            {/* Cadence & Audible */}
            <div className="flex items-center gap-2 font-mono font-black text-xs">
              <span className={`px-2 py-0.5 rounded ${isPrintWhite ? 'bg-slate-200 text-black border border-slate-300' : 'bg-neutral-800 text-neutral-300'}`}>
                {liveCall?.cadence || selectedSlotPlay?.cadence || 'ON ONE'}
              </span>
              <span className={`px-2 py-0.5 rounded ${isOledNeon ? 'bg-[#CCFF00] text-black font-black' : 'bg-amber-500 text-black'}`}>
                {liveCall?.audibleColor || selectedSlotPlay?.audibleColor || 'GREEN LIGHT'}
              </span>
            </div>
          </div>

          <h2
            className={`mt-2 text-2xl sm:text-3xl font-black tracking-tight ${
              isPrintWhite ? 'text-black' : 'text-white'
            }`}
          >
            {liveCall?.playName || selectedSlotPlay?.name || 'Fil Fly'}
          </h2>

          {/* Tactical Audible / If-Then Decision Rule */}
          {(liveCall?.tacticalIfThen || selectedSlotPlay?.tacticalIfThen) && (
            <div
              className={`mt-2.5 px-3 py-2 rounded-xl border flex items-center gap-2 ${
                isPrintWhite
                  ? 'bg-amber-100 text-black border-black font-black'
                  : isOledNeon
                  ? 'bg-black border border-[#CCFF00] text-[#CCFF00]'
                  : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-400 shrink-0 fill-amber-400" />
              <div className="flex flex-col min-w-0">
                <span className={`text-[10px] font-mono font-black uppercase tracking-wider ${isPrintWhite ? 'text-amber-800' : 'text-amber-400'}`}>
                  Audible / If-Then Read
                </span>
                <span className="text-xs sm:text-sm font-bold truncate">
                  {liveCall?.tacticalIfThen || selectedSlotPlay?.tacticalIfThen}
                </span>
              </div>
            </div>
          )}

          {/* Offensive Read Progressions Sequence (1 -> 2 -> 3) */}
          {(() => {
            const currentPlay = selectedSlotPlay;
            const routes = currentPlay?.routes || [];
            const read1 = routes.find((r) => r.readProgression === 1 || r.isPrimary);
            const read2 = routes.find((r) => r.readProgression === 2);
            const read3 = routes.find((r) => r.readProgression === 3 || r.player === 'C');

            if (!read1 && !read2 && !read3 && !liveCall?.progressionReads) return null;

            return (
              <div className={`mt-2.5 p-2 rounded-xl border ${isPrintWhite ? 'bg-slate-100 border-slate-300' : 'bg-neutral-950/80 border-neutral-800'}`}>
                <div className="flex items-center justify-between text-[10px] font-mono font-bold mb-1.5">
                  <span className={isPrintWhite ? 'text-sky-700' : 'text-cyan-400'}>QB READ PROGRESSION FLOW</span>
                  <span className={isPrintWhite ? 'text-slate-600' : 'text-neutral-500'}>1st ➔ 2nd ➔ Checkdown</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {/* Read 1: Primary Target */}
                  <div className={`p-1.5 rounded-lg border flex flex-col ${isPrintWhite ? 'bg-amber-50 border-amber-300' : 'bg-amber-500/15 border-amber-500/30'}`}>
                    <span className={`text-[9px] font-mono font-black ${isPrintWhite ? 'text-amber-800' : 'text-amber-400'}`}>
                      (1) PRIMARY
                    </span>
                    <span className={`text-xs font-black truncate ${isPrintWhite ? 'text-black' : 'text-white'}`}>
                      {read1 ? `${read1.player} • ${read1.routeType}` : 'WR1 Stem'}
                    </span>
                  </div>

                  {/* Read 2: Secondary Target */}
                  <div className={`p-1.5 rounded-lg border flex flex-col ${isPrintWhite ? 'bg-sky-50 border-sky-300' : 'bg-sky-500/15 border-sky-500/30'}`}>
                    <span className={`text-[9px] font-mono font-black ${isPrintWhite ? 'text-sky-800' : 'text-sky-400'}`}>
                      (2) SECONDARY
                    </span>
                    <span className={`text-xs font-black truncate ${isPrintWhite ? 'text-black' : 'text-white'}`}>
                      {read2 ? `${read2.player} • ${read2.routeType}` : 'WR2 Out'}
                    </span>
                  </div>

                  {/* Read 3: Checkdown / Release */}
                  <div className={`p-1.5 rounded-lg border flex flex-col ${isPrintWhite ? 'bg-emerald-50 border-emerald-300' : 'bg-emerald-500/15 border-emerald-500/30'}`}>
                    <span className={`text-[9px] font-mono font-black ${isPrintWhite ? 'text-emerald-800' : 'text-emerald-400'}`}>
                      (3) CHECKDOWN
                    </span>
                    <span className={`text-xs font-black truncate ${isPrintWhite ? 'text-black' : 'text-white'}`}>
                      {read3 ? `${read3.player} • ${read3.routeType}` : 'Center Pop'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Individual Position Role Assignment */}
          <div
            className={`mt-3 p-3 rounded-xl border ${
              isPrintWhite
                ? 'bg-slate-100 text-black border-slate-300'
                : isOledNeon
                ? 'bg-black text-[#CCFF00] border-[#CCFF00]/60'
                : 'bg-neutral-950 border-neutral-800 text-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-mono font-bold mb-1">
              <span className={isPrintWhite ? 'text-slate-700' : 'text-neutral-400'}>{selectedPosition} ASSIGNMENT</span>
              <span className={isPrintWhite ? 'text-amber-700' : 'text-amber-400'}>PRIMARY FOCUS</span>
            </div>
            <p className="text-base sm:text-lg font-black leading-snug">
              {activeAssignment}
            </p>
          </div>
        </div>

        {/* Selected Slot Vector Thumbnail Preview (Fills >70% of Viewport, High Sunlight Contrast) */}
        {selectedSlotPlay && (
          <div className={`mt-3 p-3 rounded-2xl border ${isPrintWhite ? 'bg-white border-black shadow-lg' : isOledNeon ? 'bg-black border-[#CCFF00]' : 'bg-neutral-900/60 border-neutral-800'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-bold flex items-center gap-1.5 ${isPrintWhite ? 'text-black' : 'text-white'}`}>
                <span className={`w-5 h-5 rounded font-mono font-black flex items-center justify-center text-[10px] ${
                  isPrintWhite ? 'bg-black text-white' : isOledNeon ? 'bg-[#CCFF00] text-black font-black' : 'bg-amber-500 text-black'
                }`}>
                  #{selectedSlotPlay.slotIndex}
                </span>
                {selectedSlotPlay.name.toUpperCase()} STEMS
              </span>
              <span className={`text-[10px] font-mono ${isPrintWhite ? 'text-slate-600' : 'text-neutral-400'}`}>{selectedSlotPlay.conceptNote}</span>
            </div>
            <PlayVectorThumbnail
              play={selectedSlotPlay}
              selectedPosition={selectedPosition}
              className="w-full h-44 sm:h-52"
              themeMode={themeMode}
              isPrint={isPrintWhite}
            />
          </div>
        )}
      </div>

      {/* 12-Slot Quick Tap Grid for Wristband */}
      <div className={`mt-4 pt-3 border-t ${isPrintWhite ? 'border-slate-300' : 'border-neutral-800'}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-mono font-bold uppercase tracking-wider ${isPrintWhite ? 'text-black' : 'text-neutral-400'}`}>
            12-Slot Call Sheet Quick Tap
          </span>
          <span className={`text-[10px] ${isPrintWhite ? 'text-slate-600 font-semibold' : 'text-neutral-500'}`}>Tap slot to preview on wrist</span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {callSheetPlays.slice(0, 12).map((p, idx) => {
            const slotNum = p.slotIndex || idx + 1;
            const isCurrent = selectedSlotPlay?.slotIndex === slotNum;

            return (
              <button
                key={`wrist-slot-${slotNum}`}
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  setSelectedSlotPlay(p);
                }}
                className={`min-h-[48px] rounded-xl border p-1.5 flex flex-col items-center justify-center transition-all cursor-pointer ${
                  isCurrent
                    ? isPrintWhite
                      ? 'bg-black text-white border-black font-black shadow-lg scale-105'
                      : isOledNeon
                      ? 'bg-[#CCFF00] text-black border-[#CCFF00] font-black shadow-[0_0_15px_rgba(204,255,0,0.4)] scale-105'
                      : 'bg-emerald-500 text-black border-emerald-400 font-black shadow-lg scale-105'
                    : isPrintWhite
                    ? 'bg-slate-100 border-slate-300 text-black hover:bg-slate-200 active:scale-95'
                    : isOledNeon
                    ? 'bg-black border-neutral-800 text-white hover:border-[#CCFF00] active:scale-95'
                    : 'bg-neutral-900 border-neutral-800 text-white hover:border-neutral-700 active:scale-95'
                }`}
              >
                <span className="text-xs font-mono font-black">#{slotNum}</span>
                <span className="text-[9px] truncate w-full text-center leading-tight uppercase font-bold">
                  {p.name.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
