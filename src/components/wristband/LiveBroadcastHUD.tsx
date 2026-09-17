import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  Sun, 
  Moon, 
  Maximize2, 
  Minimize2, 
  Printer, 
  Radio, 
  Shield, 
  Volume2, 
  Flame,
  Layers,
  Sparkles
} from 'lucide-react';
import { LiveCalloutTelemetry } from '../../types/tactics';
import { subscribeToLiveCallout, killLivePlay } from '../../services/telemetryService';
import { PositionFilter } from './PositionFilter';
import { triggerHaptic } from '../../lib/haptics';

interface LiveBroadcastHUDProps {
  teamId?: string;
  initialPosition?: string;
  onOpenPrintCard?: () => void;
  onOpenPlayLab?: () => void;
}

export const LiveBroadcastHUD: React.FC<LiveBroadcastHUDProps> = ({
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

  // "Field Glare Mode": Ultra-high-contrast full-screen view showing stark high-contrast color badges and big-type signal codes for direct sideline sun glare
  const [fieldGlareMode, setFieldGlareMode] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // 1. Subscribe to Live Firestore & Broadcast Telemetry (<200ms)
  useEffect(() => {
    const unsubscribe = subscribeToLiveCallout(teamId, (callout, isOnline) => {
      setLiveCall(callout);
      setIsConnected(isOnline);

      // Trigger tactile alert when a new call arrives
      if (callout) {
        triggerHaptic('heavy');
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate([40, 20, 40]);
          } catch (_) {}
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [teamId]);

  // Handle Fullscreen Toggle
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

  const isDead = liveCall?.playState === 'DEAD';

  // Extract available positions from active assignments
  const availablePositions = liveCall?.assignments
    ? Object.keys(liveCall.assignments)
    : ['QB', 'X', 'Z', 'H', 'Y', 'C', 'RB'];

  // Calculate individual assignment for selected position
  const activeAssignment = liveCall?.assignments?.[selectedPosition] 
    || liveCall?.assignments?.[selectedPosition.toUpperCase()]
    || `Standard ${selectedPosition} Progression`;

  // Audible styling lookup
  const audibleUpper = (liveCall?.audibleColor || '').toUpperCase();
  let audibleBg = 'bg-emerald-500 text-black';
  let audibleBorder = 'border-emerald-400';
  if (audibleUpper.includes('RED')) {
    audibleBg = 'bg-rose-600 text-white';
    audibleBorder = 'border-rose-400';
  } else if (audibleUpper.includes('BLUE')) {
    audibleBg = 'bg-blue-600 text-white';
    audibleBorder = 'border-blue-400';
  } else if (audibleUpper.includes('GOLD')) {
    audibleBg = 'bg-amber-400 text-black';
    audibleBorder = 'border-amber-300';
  } else if (audibleUpper.includes('PURPLE')) {
    audibleBg = 'bg-purple-600 text-white';
    audibleBorder = 'border-purple-400';
  }

  return (
    <div
      className={`min-h-[85vh] w-full select-none flex flex-col justify-between p-4 sm:p-6 transition-colors duration-200 rounded-3xl ${
        fieldGlareMode
          ? 'bg-black text-white border-4 border-yellow-400 shadow-[0_0_80px_rgba(250,204,21,0.3)]'
          : 'bg-[#08090C] text-white border border-slate-800/80 shadow-2xl'
      }`}
    >
      {/* Top Header: Connection & View Mode Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        {/* Left: Position Switcher Filter */}
        <div className="flex items-center gap-2 max-w-full overflow-x-auto">
          <span className="text-[10px] font-mono font-bold uppercase text-slate-400 shrink-0 hidden sm:inline">
            Position:
          </span>
          <PositionFilter
            selectedPosition={selectedPosition}
            onSelectPosition={setSelectedPosition}
            availablePositions={availablePositions}
          />
        </div>

        {/* Right: Glare Mode, Fullscreen, Print, Connection Status */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Field Glare Mode Button */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              setFieldGlareMode(!fieldGlareMode);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border transition-all cursor-pointer ${
              fieldGlareMode
                ? 'bg-yellow-400 text-black border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.6)]'
                : 'bg-slate-900 text-yellow-400 border-yellow-400/40 hover:bg-slate-800'
            }`}
            title="Field Glare Mode (High Contrast for Direct Sunlight)"
          >
            <Sun className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Glare Mode</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Print Card Button */}
          {onOpenPrintCard && (
            <button
              type="button"
              onClick={onOpenPrintCard}
              className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-amber-400 transition-colors cursor-pointer"
              title="12-Slot Wristband Physical Print Card"
            >
              <Printer className="w-4 h-4" />
            </button>
          )}

          {/* Connection Status Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800">
            <Wifi className={`w-3.5 h-3.5 ${isConnected ? 'text-[#00F0D0] animate-pulse' : 'text-rose-500'}`} />
            <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-[#00F0D0] shadow-[0_0_8px_rgba(0,240,208,0.8)]' : 'bg-rose-500'}`} />
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#00F0D0] font-bold">
              {isConnected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Center Telemetry Display */}
      <div className="flex-1 flex flex-col justify-center items-center text-center my-auto py-8">
        {isDead ? (
          /* Dead Ball / Timeout Sideline Alert */
          <div className="animate-pulse bg-rose-600 text-white rounded-3xl p-8 w-full max-w-xl border-4 border-white shadow-[0_0_80px_rgba(225,29,72,0.8)]">
            <AlertTriangle className="w-16 h-16 mx-auto mb-3 text-white" />
            <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight">
              PLAY DEAD / TIMEOUT
            </h1>
            <p className="text-xl font-black mt-2 tracking-widest font-mono text-yellow-300">
              LOOK TO SIDELINE • FREEZE
            </p>
          </div>
        ) : liveCall ? (
          <div className="w-full max-w-2xl flex flex-col gap-5">
            {/* Top Signal Code & Audible Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Audible Badge */}
              <div className={`px-4 py-2 rounded-2xl font-black text-sm sm:text-base tracking-widest uppercase border-2 shadow-lg ${audibleBg} ${audibleBorder}`}>
                {liveCall.audibleColor || 'GREEN LIGHT'}
              </div>

              {/* Cadence Indicator */}
              <div className="px-4 py-2 rounded-2xl bg-slate-950 border border-slate-800 font-mono font-black text-xs sm:text-sm tracking-widest text-[#00F0D0] uppercase">
                CADENCE: {liveCall.cadence || 'ON ONE'}
              </div>
            </div>

            {/* Giant Big-Type Signal Code (for direct sideline visibility) */}
            <div className={`py-6 px-6 rounded-3xl border-4 transition-all duration-200 ${
              fieldGlareMode 
                ? 'bg-yellow-400 text-black border-white shadow-2xl'
                : 'bg-[#0B0F19] text-[#00F0D0] border-[#00F0D0]/50 shadow-[0_0_40px_rgba(0,240,208,0.2)]'
            }`}>
              <div className="text-xs font-mono font-bold uppercase tracking-widest mb-1 opacity-80">
                SIDELINE SIGNAL CODE
              </div>
              <div className="text-5xl sm:text-7xl font-black tracking-tighter uppercase drop-shadow-md">
                {liveCall.signalCode || 'VIPER-42'}
              </div>
              <div className="text-sm sm:text-base font-extrabold uppercase mt-2 opacity-90">
                {liveCall.playName} • {liveCall.formation}
              </div>
            </div>

            {/* Individual Position Assignment Box */}
            <div className={`p-6 rounded-3xl border-2 transition-all ${
              fieldGlareMode
                ? 'bg-black text-white border-white'
                : 'bg-slate-950/90 text-white border-slate-800 shadow-xl'
            }`}>
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                <span className="text-xs font-mono font-bold uppercase text-[#00F0D0] tracking-wider">
                  INDIVIDUAL ASSIGNMENT • {selectedPosition}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {new Date(liveCall.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>

              <div className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white py-2">
                {activeAssignment}
              </div>
            </div>
          </div>
        ) : (
          /* Waiting State */
          <div className="flex flex-col items-center gap-3">
            <Radio className="w-12 h-12 text-[#00F0D0] animate-pulse" />
            <div className="text-base font-black uppercase tracking-widest text-[#00F0D0]">
              LISTENING FOR SIDELINE CALLOUT...
            </div>
            <p className="text-xs font-mono text-slate-400">
              Team Channel: <span className="text-white font-bold">{teamId}</span> • Sync Latency &lt;200ms
            </p>
          </div>
        )}
      </div>

      {/* Bottom Minimal Dock */}
      <div className="border-t border-white/10 pt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <span>JUST1PLAY HUD</span>
          <span>•</span>
          <span>TEAM: {teamId}</span>
          <span>•</span>
          <span>POS: {selectedPosition}</span>
        </div>

        <div className="flex items-center gap-3">
          {onOpenPlayLab && (
            <button
              type="button"
              onClick={onOpenPlayLab}
              className="text-[#00F0D0] hover:underline cursor-pointer font-bold"
            >
              Open PlayLab Vector Designer
            </button>
          )}

          {/* Stop / Kill Play Emergency Trigger */}
          <button
            type="button"
            onClick={async () => {
              triggerHaptic('heavy');
              await killLivePlay(teamId);
            }}
            className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            Signal Dead Ball
          </button>
        </div>
      </div>
    </div>
  );
};
