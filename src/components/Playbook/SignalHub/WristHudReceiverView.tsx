import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  Wifi, 
  CheckCircle2, 
  AlertTriangle, 
  Volume2, 
  Flame, 
  Sun, 
  Moon, 
  Watch, 
  Smartphone, 
  RotateCcw, 
  Check, 
  ChevronRight, 
  Shield, 
  Zap, 
  Clock, 
  RefreshCw,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { SignalHubSession, SignalHubPlayCall, SignalHubConnectedDevice } from './types';
import { 
  subscribeToSessionByPin, 
  acknowledgePlayCall, 
  registerDeviceInSession, 
  formatPin 
} from '../../../services/signalHubService';

interface WristHudReceiverViewProps {
  initialPin?: string;
  initialPosition?: string;
  onClose?: () => void;
}

export const WristHudReceiverView: React.FC<WristHudReceiverViewProps> = ({
  initialPin = '',
  initialPosition = 'QB',
  onClose
}) => {
  const [pinInput, setPinInput] = useState(initialPin.replace(/\D/g, ''));
  const [selectedPosition, setSelectedPosition] = useState(initialPosition.toUpperCase());
  const [isConnected, setIsConnected] = useState(false);
  const [session, setSession] = useState<SignalHubSession | null>(null);
  const [deviceId] = useState(() => `dev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
  
  const [isHighContrastSunMode, setIsHighContrastSunMode] = useState(false);
  const [isAcknowledged, setIsAcknowledged] = useState(false);
  const [isAlerting, setIsAlerting] = useState(false);
  const lastReceivedDispatchId = useRef<string | null>(null);

  const POSITIONS = ['QB', 'WR1', 'WR2', 'SLOT', 'RB', 'C', 'TE', 'SAFETY', 'CB1', 'COACH'];

  // Handle Real-time PIN Subscription
  useEffect(() => {
    if (!pinInput || pinInput.length < 6) {
      setIsConnected(false);
      return;
    }

    const unsub = subscribeToSessionByPin(pinInput, (liveSession) => {
      if (liveSession) {
        setSession(liveSession);
        setIsConnected(true);

        // Register device
        registerDeviceInSession(liveSession.teamId, {
          id: deviceId,
          position: selectedPosition,
          playerName: `Player (${selectedPosition})`,
          status: 'connected',
          latencyMs: Math.floor(12 + Math.random() * 15),
          lastPing: Date.now(),
          deviceType: 'wrist_hud'
        });

        // Trigger flash / haptic chime if new play arrived
        if (liveSession.lastCall && liveSession.lastCall.dispatchId !== lastReceivedDispatchId.current) {
          lastReceivedDispatchId.current = liveSession.lastCall.dispatchId;
          setIsAcknowledged(false);
          setIsAlerting(true);
          setTimeout(() => setIsAlerting(false), 2500);

          // Beep audio simulation
          try {
            const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = liveSession.lastCall.isKillPlay ? 880 : 587.33;
            gain.gain.value = 0.1;
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
          } catch {
            // AudioContext not allowed without gesture, ignore safely
          }
        }
      } else {
        setIsConnected(false);
      }
    });

    return () => {
      unsub();
    };
  }, [pinInput, selectedPosition, deviceId]);

  // Acknowledge Play Call ("Locked In")
  const handleAcknowledge = async () => {
    if (!session || !session.lastCall) return;
    setIsAcknowledged(true);
    try {
      await acknowledgePlayCall(session.teamId, deviceId, session.lastCall.dispatchId);
    } catch (err) {
      console.warn('Silent signal hub acknowledge retry notice:', err);
    }
  };

  const lastCall = session?.lastCall;
  const positionRoute = lastCall?.targetRoutes?.[selectedPosition] || 
    lastCall?.targetRoutes?.[selectedPosition.toLowerCase()] || 
    (lastCall?.isKillPlay ? 'FREEZE / CHECK SIDELINE' : 'Execute Default Play Assignment');

  return (
    <div className={`min-h-[500px] w-full flex flex-col justify-between rounded-3xl p-4 sm:p-6 transition-colors select-none ${
      isHighContrastSunMode 
        ? 'bg-amber-400 text-black' 
        : lastCall?.isKillPlay 
          ? 'bg-rose-950 text-white' 
          : isAlerting 
            ? 'bg-[#00E5FF]/30 text-white border-4 border-[#00E5FF]' 
            : 'bg-[#0B0F17] text-white border border-white/10'
    } shadow-2xl relative overflow-hidden`}>
      
      {/* Top HUD Status Bar */}
      <div className="flex items-center justify-between gap-2 border-b pb-3 border-current/15 shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-black text-xs ${
            isHighContrastSunMode ? 'bg-black text-amber-400' : 'bg-slate-800 text-[#00E5FF]'
          }`}>
            <Watch className="w-4 h-4" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono uppercase font-black tracking-widest opacity-80">
                J1P WRIST HUD
              </span>
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            </div>
            <div className="text-xs font-black font-mono">
              POS: <strong className="text-[#00E5FF]">{selectedPosition}</strong> &bull; PIN: {pinInput ? formatPin(pinInput) : 'NOT SET'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsHighContrastSunMode(!isHighContrastSunMode)}
            className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
              isHighContrastSunMode ? 'bg-black text-amber-400 border-black' : 'bg-slate-800 text-slate-300 border-white/10'
            }`}
            title="Toggle High-Contrast Sunlight Glare Mode"
          >
            {isHighContrastSunMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-white/10"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Position Selector Bar */}
      <div className="py-2 overflow-x-auto flex items-center gap-1 shrink-0 scrollbar-none">
        <span className="text-[10px] font-mono opacity-70 uppercase font-bold mr-1">Switch:</span>
        {POSITIONS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setSelectedPosition(p)}
            className={`px-2 py-1 rounded-lg text-[10px] font-mono font-black border transition-all cursor-pointer shrink-0 ${
              selectedPosition === p
                ? isHighContrastSunMode 
                  ? 'bg-black text-amber-400 border-black scale-105' 
                  : 'bg-[#00E5FF] text-[#0B0F17] border-[#00E5FF] shadow-sm'
                : 'bg-black/20 border-white/10 opacity-70 hover:opacity-100'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Main Tactical Assignment Display */}
      <div className="my-auto py-4 space-y-4 text-center">
        {!isConnected ? (
          <div className="space-y-3 max-w-xs mx-auto py-6">
            <Radio className="w-10 h-10 mx-auto text-[#00E5FF] animate-pulse" />
            <h3 className="text-base font-black uppercase">Enter 6-Digit Field PIN</h3>
            <input
              type="text"
              maxLength={6}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 842109"
              className="w-full text-center font-mono font-black text-2xl tracking-widest bg-slate-900 border border-cyan-500/40 rounded-2xl py-3 text-white focus:outline-none focus:border-cyan-400"
            />
            <p className="text-[11px] opacity-70 leading-tight">
              Get active game PIN from coach&apos;s Playbook Lab dispatcher.
            </p>
          </div>
        ) : !lastCall ? (
          <div className="space-y-2 py-8">
            <Clock className="w-10 h-10 mx-auto text-emerald-400 animate-spin" />
            <h3 className="text-lg font-black uppercase">Connected to Sideline</h3>
            <p className="text-xs opacity-70">
              Awaiting next play broadcast from Coach ({session?.coachName || 'Coach'}).
            </p>
          </div>
        ) : (
          <div className="space-y-4 animate-in zoom-in-95 duration-200">
            
            {/* Play Title & Audible Color Pill */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span className={`text-xs sm:text-sm font-mono font-black uppercase px-3 py-1 rounded-xl shadow-md ${
                lastCall.isKillPlay 
                  ? 'bg-red-600 text-white animate-pulse' 
                  : 'bg-cyan-950 text-[#00E5FF] border border-[#00E5FF]/40'
              }`}>
                {lastCall.audibleColor}
              </span>

              <span className="text-xs sm:text-sm font-mono font-black uppercase px-3 py-1 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                CADENCE: {lastCall.cadence.toUpperCase()}
              </span>
            </div>

            {/* Play Name */}
            <div>
              <div className="text-[10px] font-mono opacity-70 uppercase tracking-widest">
                {lastCall.formation}
              </div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight mt-0.5">
                {lastCall.playName}
              </h2>
            </div>

            {/* Giant Assignment Route Card */}
            <div className={`p-4 sm:p-6 rounded-2xl border ${
              isHighContrastSunMode 
                ? 'bg-black text-amber-400 border-black' 
                : lastCall.isKillPlay 
                  ? 'bg-red-900/80 border-red-500 text-white' 
                  : 'bg-gradient-to-br from-slate-900 to-slate-950 border-[#00E5FF]/40 text-white shadow-xl'
            }`}>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#00E5FF] block mb-1 font-bold">
                YOUR ASSIGNMENT ({selectedPosition}):
              </span>
              <div className="text-lg sm:text-2xl font-black leading-tight tracking-tight uppercase">
                {positionRoute}
              </div>
            </div>

            {lastCall.notes && (
              <div className="text-xs font-mono opacity-80 bg-black/30 p-2 rounded-xl border border-white/5">
                Coach Note: {lastCall.notes}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Action / Lock-In Acknowledge Bar */}
      {isConnected && lastCall && (
        <div className="pt-3 border-t border-current/15 shrink-0">
          <button
            type="button"
            onClick={handleAcknowledge}
            disabled={isAcknowledged}
            className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 shadow-xl ${
              isAcknowledged
                ? 'bg-emerald-500 text-black opacity-90'
                : 'bg-gradient-to-r from-[#00E5FF] to-[#00C853] text-[#0B0F17] hover:brightness-110 animate-pulse'
            }`}
          >
            {isAcknowledged ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>LOCKED IN &bull; ACKNOWLEDGED</span>
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 fill-current" />
                <span>CONFIRM &bull; LOCK IN ASSIGNMENT</span>
              </>
            )}
          </button>
        </div>
      )}

    </div>
  );
};
