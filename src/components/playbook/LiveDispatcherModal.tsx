import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Radio, 
  Zap, 
  Send, 
  AlertOctagon, 
  RotateCcw, 
  Check, 
  Copy, 
  ExternalLink, 
  Watch, 
  Flame, 
  Clock, 
  Shield, 
  Sparkles,
  Users,
  ChevronRight,
  Eye,
  Sliders,
  QrCode
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, sanitizeFirestorePayload } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';

// Defensive ErrorBoundary Fallback for QR Rendering
class SafeQRCodeBoundary extends React.Component<
  { children: React.ReactNode; fallbackUrl: string },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallbackUrl: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.warn('[SafeQRCodeBoundary] Fallback engaged:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <img
          src={this.props.fallbackUrl}
          alt="QR Code Sync"
          width={220}
          height={220}
          className="rounded-xl mx-auto"
        />
      );
    }
    return this.props.children;
  }
}

export interface PositionAssignments {
  QB: string;
  C: string;
  WR1: string;
  WR2: string;
  SLOT: string;
  [key: string]: string;
}

export interface LivePlayPayload {
  audibleColor: string;
  cadence: string;
  playName: string;
  assignments: PositionAssignments;
  timestamp: number;
  playState: 'LIVE' | 'DEAD' | 'IDLE';
  message?: string;
  dispatchedBy?: string;
  updatedAt?: number;
}

export interface LiveDispatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId?: string;
  sessionPin?: string;
  initialPlayName?: string;
  initialAudibleColor?: string;
  initialCadence?: string;
  initialAssignments?: Partial<PositionAssignments>;
  formation?: string;
  onOpenWristPreview?: (teamId: string) => void;
  className?: string;
}

// Preset audible color codes
export const AUDIBLE_COLOR_PRESETS = [
  { label: 'BLUE 42', color: 'blue', bg: 'bg-blue-600', border: 'border-blue-400', text: 'text-blue-100' },
  { label: 'RED 80', color: 'red', bg: 'bg-red-600', border: 'border-red-400', text: 'text-red-100' },
  { label: 'GREEN LIGHT', color: 'emerald', bg: 'bg-emerald-600', border: 'border-emerald-400', text: 'text-emerald-100' },
  { label: 'BLACK VIPER', color: 'slate', bg: 'bg-zinc-800', border: 'border-zinc-400', text: 'text-zinc-100' },
  { label: 'GOLD RUSH', color: 'amber', bg: 'bg-amber-600', border: 'border-amber-400', text: 'text-amber-100' },
  { label: 'PURPLE RAIN', color: 'purple', bg: 'bg-purple-600', border: 'border-purple-400', text: 'text-purple-100' }
];

// Preset cadence calls
export const CADENCE_PRESETS = [
  'ON ONE',
  'ON TWO',
  'SILENT COUNT',
  'FREEZE',
  'CHECK ME',
  'HURRY UP'
];

// Preset tactic schemes with 5v5 position assignments
export const TACTICAL_SCHEME_PRESETS: { name: string; audible: string; cadence: string; assignments: PositionAssignments }[] = [
  {
    name: '5v5 Mesh Option',
    audible: 'BLUE 42',
    cadence: 'ON ONE',
    assignments: {
      QB: '3-Step Drop, Read Free Safety',
      C: 'Pass Pro / Check Middle',
      WR1: '12-Yd Comeback (Outside Break)',
      WR2: 'Deep Post (Middle)',
      SLOT: 'Wheel Route (Seam / Option)'
    }
  },
  {
    name: 'Four Verticals (Go All)',
    audible: 'GREEN LIGHT',
    cadence: 'ON ONE',
    assignments: {
      QB: 'Shotgun 5-Step, Pump Middle then Fire Seam',
      C: 'Slide Left / Pass Pro Center',
      WR1: 'Outside Streak (Boundary)',
      WR2: 'Outside Streak (Field)',
      SLOT: 'Deep Seam (Bender vs 2-High)'
    }
  },
  {
    name: 'Flood Sail Concept',
    audible: 'RED 80',
    cadence: 'ON TWO',
    assignments: {
      QB: 'Half-Roll Right, High-Low Read (Sail to Flat)',
      C: 'Slide Pass Block Right',
      WR1: 'Deep Clearout Go',
      WR2: '14-Yd Out Cut (Sail)',
      SLOT: '4-Yd Speed Flat Route'
    }
  },
  {
    name: 'Quick Slant / RPO Peek',
    audible: 'BLACK VIPER',
    cadence: 'FREEZE',
    assignments: {
      QB: 'Catch & Throw, Read Mike Linebacker',
      C: 'Aggressive Run Block Step',
      WR1: '3-Step Quick Slant (Inside Strike)',
      WR2: 'Bubble Screen (Decoy / Hold CB)',
      SLOT: 'Skinny Post (Fill Void)'
    }
  }
];

export default function LiveDispatcherModal({
  isOpen,
  onClose,
  teamId = 'varsity_7v7_team',
  sessionPin: initialSessionPin = '7742',
  initialPlayName = '5v5 Mesh Option',
  initialAudibleColor = 'BLUE 42',
  initialCadence = 'ON ONE',
  initialAssignments,
  formation,
  onOpenWristPreview,
  className = ''
}: LiveDispatcherModalProps) {
  const { user } = useAuth();

  // Active Team ID & Session Game PIN
  const [activeTeamId, setActiveTeamId] = useState(teamId);
  const [sessionPin, setSessionPin] = useState(initialSessionPin || '7742');
  const [isEditingTeam, setIsEditingTeam] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [copiedSyncUrl, setCopiedSyncUrl] = useState(false);

  // Form State
  const [audibleColor, setAudibleColor] = useState(initialAudibleColor);
  const [cadence, setCadence] = useState(initialCadence);
  const [playName, setPlayName] = useState(initialPlayName);
  const [formationName, setFormationName] = useState(formation || '');
  const [assignments, setAssignments] = useState<PositionAssignments>({
    QB: initialAssignments?.QB || '3-Step Drop, Read Free Safety',
    C: initialAssignments?.C || 'Pass Pro / Check Middle',
    WR1: initialAssignments?.WR1 || '12-Yd Comeback (Outside Break)',
    WR2: initialAssignments?.WR2 || 'Deep Post (Middle)',
    SLOT: initialAssignments?.SLOT || 'Wheel Route (Seam / Option)',
    ...(initialAssignments || {})
  });

  // Transmission & Remote State
  const [isDispatching, setIsDispatching] = useState(false);
  const [isKilling, setIsKilling] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Live Field Session state from Firestore
  const [liveFieldState, setLiveFieldState] = useState<LivePlayPayload | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Real-time Firestore Subscription to /teams/{teamId}/live_sessions/active
  useEffect(() => {
    if (!isOpen || !activeTeamId) return;

    setConnectionError(null);
    const sessionDocRef = doc(db, 'teams', activeTeamId, 'live_sessions', 'active');

    const unsubscribe = onSnapshot(
      sessionDocRef,
      (docSnap) => {
        setIsConnected(true);
        if (docSnap.exists()) {
          const data = docSnap.data() as LivePlayPayload;
          setLiveFieldState(data);
        } else {
          setLiveFieldState(null);
        }
      },
      (err) => {
        console.warn('[LiveDispatcher] Real-time session listener error:', err);
        setConnectionError(err.message || 'Error syncing with field doc');
      }
    );

    return () => unsubscribe();
  }, [isOpen, activeTeamId]);

  // Update initial fields if props change
  useEffect(() => {
    if (initialPlayName) setPlayName(initialPlayName);
  }, [initialPlayName]);

  useEffect(() => {
    if (initialAudibleColor) setAudibleColor(initialAudibleColor);
  }, [initialAudibleColor]);

  useEffect(() => {
    if (initialCadence) setCadence(initialCadence);
  }, [initialCadence]);

  useEffect(() => {
    if (initialAssignments) {
      setAssignments((prev) => ({
        ...prev,
        ...initialAssignments
      }));
    }
  }, [initialAssignments]);

  useEffect(() => {
    if (formation) setFormationName(formation);
  }, [formation]);

  if (!isOpen) return null;

  // Handle Loading a Tactical Preset
  const handleLoadPreset = (preset: typeof TACTICAL_SCHEME_PRESETS[0]) => {
    setPlayName(preset.name);
    setAudibleColor(preset.audible);
    setCadence(preset.cadence);
    setAssignments({ ...preset.assignments });

    if ('vibrate' in navigator) {
      try { navigator.vibrate(30); } catch (_) {}
    }
  };

  // PUSH TO FIELD: Atomic Document Update
  const handlePushToField = async () => {
    if (!activeTeamId) return;

    try {
      setIsDispatching(true);
      setFeedbackMessage(null);

      const posMap: PositionAssignments = {
        QB: assignments.QB?.trim() || '',
        C: assignments.C?.trim() || '',
        WR1: assignments.WR1?.trim() || '',
        WR2: assignments.WR2?.trim() || '',
        SLOT: assignments.SLOT?.trim() || '',
        ...assignments
      };

      const payload: LivePlayPayload & { positions: Record<string, string> } = {
        audibleColor: audibleColor.trim().toUpperCase() || 'BLUE 42',
        cadence: cadence.trim().toUpperCase() || 'ON ONE',
        playName: playName.trim() || '5v5 Mesh Option',
        assignments: posMap,
        positions: posMap,
        timestamp: Date.now(),
        playState: 'LIVE',
        message: '',
        dispatchedBy: user?.displayName || user?.email || 'Coach',
        updatedAt: Date.now()
      };

      const sessionDocRef = doc(db, 'teams', activeTeamId, 'live_sessions', 'active');
      await setDoc(sessionDocRef, sanitizeFirestorePayload(payload), { merge: true });

      setFeedbackMessage('PUSHED TO FIELD SUCCESSFULLY');
      if ('vibrate' in navigator) {
        try { navigator.vibrate([100, 50, 100]); } catch (_) {}
      }

      setTimeout(() => {
        setFeedbackMessage(null);
      }, 2500);
    } catch (err: any) {
      console.error('[LiveDispatcher] Failed to push play to field:', err);
      setFeedbackMessage(`ERROR: ${err.message || 'Failed to dispatch'}`);
    } finally {
      setIsDispatching(false);
    }
  };

  // KILL PLAY / RESET: Sends { playState: "DEAD", message: "CHECK SIDELINE" }
  const handleKillPlay = async () => {
    if (!activeTeamId) return;

    try {
      setIsKilling(true);
      setFeedbackMessage(null);

      const killPayload = {
        playState: 'DEAD',
        message: 'CHECK SIDELINE',
        timestamp: Date.now(),
        updatedAt: Date.now()
      };

      const sessionDocRef = doc(db, 'teams', activeTeamId, 'live_sessions', 'active');
      await setDoc(sessionDocRef, sanitizeFirestorePayload(killPayload), { merge: true });

      setFeedbackMessage('KILL COMMAND DISPATCHED — FIELD SIGNALED');
      if ('vibrate' in navigator) {
        try { navigator.vibrate([300, 100, 300]); } catch (_) {}
      }

      setTimeout(() => {
        setFeedbackMessage(null);
      }, 2500);
    } catch (err: any) {
      console.error('[LiveDispatcher] Failed to kill play:', err);
      setFeedbackMessage(`KILL ERROR: ${err.message || 'Failed to kill'}`);
    } finally {
      setIsKilling(false);
    }
  };

  // 1. Session Link Construction (Zero-friction onboarding URL)
  const syncUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/wrist?team=${encodeURIComponent(activeTeamId)}&pin=${encodeURIComponent(sessionPin)}`
    : `https://app.just1play.com/wrist?team=${encodeURIComponent(activeTeamId)}&pin=${encodeURIComponent(sessionPin)}`;

  const handleCopySyncUrl = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(syncUrl);
      setCopiedSyncUrl(true);
      setTimeout(() => setCopiedSyncUrl(false), 2000);
    }
  };

  const handleLaunchWristHUD = () => {
    if (typeof window !== 'undefined') {
      window.open(syncUrl, '_blank');
    }
  };

  // Copy Athlete Wrist Link (legacy fallback)
  const wristUrl = syncUrl;
  const handleCopyLink = () => {
    handleCopySyncUrl();
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleOpenWristPreview = () => {
    if (onOpenWristPreview) {
      onOpenWristPreview(activeTeamId);
    } else {
      handleLaunchWristHUD();
    }
  };

  return (
    <div 
      id="live-dispatcher-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
    >
      <div 
        id="live-dispatcher-modal-container"
        className={`bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl text-white overflow-hidden relative ${className}`}
      >
        {/* HEADER BAR */}
        <div className="px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white uppercase">
                  SIDELINE LIVE DISPATCHER
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  TEXT ONLY • ZERO AUDIO
                </span>
                {formationName && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    {formationName}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                Target doc: <span className="text-zinc-200">/teams/{activeTeamId}/live_sessions/active</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Game PIN pill */}
            <div 
              id="game-pin-pill-header"
              className="flex items-center gap-1.5 bg-zinc-950 px-2.5 sm:px-3 py-1.5 rounded-xl border border-zinc-800 shadow-inner"
              title="Session Game PIN"
            >
              <span className="text-zinc-500 text-[10px] font-mono uppercase font-bold tracking-wider">PIN:</span>
              <span className="font-mono font-black text-teal-400 tracking-widest text-xs sm:text-sm">{sessionPin}</span>
            </div>

            {/* Show QR Sync Button */}
            <button
              id="btn-show-qr-sync"
              type="button"
              onClick={() => setShowQRModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-teal-500/15 to-emerald-500/15 hover:from-teal-500/25 hover:to-emerald-500/25 text-teal-300 hover:text-teal-200 border border-teal-500/35 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
              title="Instant 1-Tap QR Code Onboarding & Team Session Sync"
            >
              <QrCode className="w-4 h-4 text-teal-400" />
              <span className="hidden sm:inline">Show QR Sync</span>
              <span className="sm:hidden">QR Sync</span>
            </button>

            {/* Wrist HUD Launch button */}
            <button
              id="btn-dispatcher-open-wrist"
              type="button"
              onClick={handleOpenWristPreview}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl transition-all cursor-pointer border border-zinc-700"
              title="Open Live Wrist HUD Client"
            >
              <Watch className="w-4 h-4 text-cyan-400" />
              <span>Wrist HUD</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </button>

            {/* Close Button */}
            <button
              id="btn-close-dispatcher-modal"
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all cursor-pointer"
              aria-label="Close Dispatcher"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ACTIVE ON-FIELD HUD MONITOR BANNER */}
        <div className="px-6 py-3 bg-zinc-900/40 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-mono text-zinc-400">
              <span className={`w-2.5 h-2.5 rounded-full ${
                isConnected 
                  ? liveFieldState?.playState === 'LIVE' ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'
                  : 'bg-red-500'
              }`} />
              STATUS:
            </span>
            {liveFieldState?.playState === 'LIVE' ? (
              <span className="px-2.5 py-0.5 rounded-md font-mono font-black text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                LIVE ON FIELD: {liveFieldState.audibleColor} • {liveFieldState.cadence} ({liveFieldState.playName})
              </span>
            ) : liveFieldState?.playState === 'DEAD' ? (
              <span className="px-2.5 py-0.5 rounded-md font-mono font-black text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                PLAY DEAD: CHECK SIDELINE
              </span>
            ) : (
              <span className="text-zinc-500 font-mono">STANDBY / NO ACTIVE PLAY</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {liveFieldState?.timestamp && (
              <span className="text-zinc-500 font-mono text-[11px] flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Sent: {new Date(liveFieldState.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}

            {/* Team Switcher pill */}
            <div className="flex items-center gap-1.5 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
              <span className="text-zinc-500 text-[10px] uppercase font-bold">Team:</span>
              {isEditingTeam ? (
                <input
                  type="text"
                  value={activeTeamId}
                  onChange={(e) => setActiveTeamId(e.target.value.trim().toLowerCase())}
                  onBlur={() => setIsEditingTeam(false)}
                  onKeyDown={(e) => e.key === 'Enter' && setIsEditingTeam(false)}
                  autoFocus
                  className="bg-zinc-800 text-white font-mono text-xs px-1.5 py-0.5 rounded border border-zinc-700 w-32 focus:outline-none"
                />
              ) : (
                <span 
                  onClick={() => setIsEditingTeam(true)}
                  className="font-mono text-zinc-300 hover:text-white cursor-pointer underline decoration-dotted text-xs"
                  title="Click to edit team ID"
                >
                  {activeTeamId}
                </span>
              )}
            </div>

            {/* Quick QR & Copy Link */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowQRModal(true)}
                className="text-zinc-400 hover:text-teal-400 transition-colors p-1"
                title="Open Athlete Wrist QR Sync"
              >
                <QrCode className="w-4 h-4 text-teal-400" />
              </button>

              <button
                type="button"
                onClick={handleCopySyncUrl}
                className="text-zinc-400 hover:text-cyan-400 transition-colors p-1"
                title="Copy Athlete Wrist Link"
              >
                {copiedSyncUrl || copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* FEEDBACK BANNER IF DISPATCHED */}
        {feedbackMessage && (
          <div className={`px-6 py-2 text-center text-xs font-mono font-bold tracking-wider ${
            feedbackMessage.includes('ERROR') 
              ? 'bg-red-500/20 text-red-300 border-b border-red-500/40' 
              : feedbackMessage.includes('KILL') 
                ? 'bg-amber-500/20 text-amber-300 border-b border-amber-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border-b border-emerald-500/40'
          }`}>
            {feedbackMessage}
          </div>
        )}

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* QUICK PRESETS ROW */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Quick Play Schemes (Auto-fills 5 Positions)
              </label>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TACTICAL_SCHEME_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleLoadPreset(preset)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    playName === preset.name
                      ? 'bg-zinc-800 border-emerald-500 text-white ring-1 ring-emerald-500/50'
                      : 'bg-zinc-900/60 hover:bg-zinc-800/80 border-zinc-800 text-zinc-300'
                  }`}
                >
                  <div className="font-bold text-xs truncate">{preset.name}</div>
                  <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                    {preset.audible} • {preset.cadence}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* PLAY NAME & CALL METADATA */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Play Title */}
            <div className="sm:col-span-3">
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold mb-1.5">
                Play Concept Name
              </label>
              <input
                id="input-dispatcher-play-name"
                type="text"
                value={playName}
                onChange={(e) => setPlayName(e.target.value)}
                placeholder="e.g., 5v5 Mesh Option"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* AUDIBLE COLOR PICKER */}
            <div className="sm:col-span-2 space-y-2">
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold">
                Audible Call Color (Wrist Background Tint)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {AUDIBLE_COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setAudibleColor(preset.label)}
                    className={`py-2 px-2 rounded-xl text-xs font-mono font-black tracking-wider border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      audibleColor === preset.label
                        ? `${preset.bg} ${preset.border} ${preset.text} ring-2 ring-white/40 shadow-lg`
                        : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${preset.bg}`} />
                    <span className="truncate">{preset.label}</span>
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={audibleColor}
                onChange={(e) => setAudibleColor(e.target.value.toUpperCase())}
                placeholder="Or custom audible (e.g. SILVER BULLET)"
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* CADENCE SELECTION */}
            <div className="sm:col-span-1 space-y-2">
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold">
                Snap Cadence
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {CADENCE_PRESETS.map((cad) => (
                  <button
                    key={cad}
                    type="button"
                    onClick={() => setCadence(cad)}
                    className={`py-1.5 px-1.5 rounded-lg text-[10px] font-mono font-bold tracking-wider border transition-all cursor-pointer text-center truncate ${
                      cadence === cad
                        ? 'bg-cyan-500 text-black border-cyan-400 shadow-md font-black'
                        : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300'
                    }`}
                  >
                    {cad}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={cadence}
                onChange={(e) => setCadence(e.target.value.toUpperCase())}
                placeholder="Or custom cadence"
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* POSITION ASSIGNMENTS GRID (QB, C, WR1, WR2, SLOT) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                Target Position Assignments (Rendered Directly on Wrist HUD)
              </label>
              <span className="text-[11px] text-zinc-500 font-mono">
                Athletes will only see their selected position
              </span>
            </div>

            <div className="space-y-2.5">
              {(() => {
                const defaultOrder = ['QB', 'C', 'WR1', 'WR2', 'SLOT'];
                const assignedKeys = Object.keys(assignments);
                const standardKeys = defaultOrder.filter((k) => assignedKeys.includes(k) || assignments[k] !== undefined);
                const customKeys = assignedKeys.filter((k) => !defaultOrder.includes(k));
                const posKeys = standardKeys.length > 0 || customKeys.length > 0
                  ? Array.from(new Set([...standardKeys, ...customKeys]))
                  : defaultOrder;

                const posColors: Record<string, string> = {
                  QB: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
                  C: 'text-zinc-300 bg-zinc-800 border-zinc-700',
                  WR1: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
                  WR2: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
                  SLOT: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
                  X: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
                  Z: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
                  H: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
                  Y: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
                  RB: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
                  TE: 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                };

                return posKeys.map((pos) => {
                  const badgeColor = posColors[pos] || 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
                  return (
                    <div 
                      key={pos}
                      className="flex flex-col sm:flex-row sm:items-center gap-2 bg-zinc-900/60 border border-zinc-800/80 p-2.5 rounded-2xl focus-within:border-zinc-700 transition-colors"
                    >
                      <div className={`w-16 h-8 rounded-xl border flex items-center justify-center font-mono font-black text-xs shrink-0 ${badgeColor}`}>
                        {pos}
                      </div>
                      <input
                        id={`input-dispatcher-assignment-${pos}`}
                        type="text"
                        value={assignments[pos] || ''}
                        onChange={(e) => setAssignments({ ...assignments, [pos]: e.target.value })}
                        placeholder={`Enter tactical text assignment for ${pos}...`}
                        className="flex-1 bg-transparent px-2 py-1 text-xs sm:text-sm text-white focus:outline-none font-medium placeholder-zinc-600"
                      />
                    </div>
                  );
                });
              })()}
            </div>
          </div>

        </div>

        {/* MODAL FOOTER & DISPATCH ACTIONS */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/90 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* KILL PLAY / RESET BUTTON */}
          <button
            id="btn-dispatcher-kill-play"
            type="button"
            onClick={handleKillPlay}
            disabled={isKilling}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-mono font-black text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            title="Sends PLAY DEAD text alert to all wristbands"
          >
            <AlertOctagon className="w-4 h-4 text-amber-400 animate-spin-slow" />
            <span>{isKilling ? 'KILLING PLAY...' : 'KILL PLAY / RESET'}</span>
          </button>

          {/* PRIMARY "PUSH TO FIELD" DISPATCH BUTTON */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              id="btn-dispatcher-cancel"
              type="button"
              onClick={onClose}
              className="px-4 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition-all cursor-pointer"
            >
              Close
            </button>

            <button
              id="btn-dispatcher-push-to-field"
              type="button"
              onClick={handlePushToField}
              disabled={isDispatching}
              className="flex-1 sm:flex-none px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-black text-sm tracking-wider uppercase flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Send className="w-4 h-4 text-black stroke-[3]" />
              <span>{isDispatching ? 'TRANSMITTING...' : 'PUSH TO FIELD'}</span>
            </button>
          </div>

        </div>

        {/* INTERACTIVE QR ONBOARDING & TEAM SYNC MODAL / DRAWER */}
        {showQRModal && (
          <div 
            id="wrist-qr-sync-backdrop"
            className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowQRModal(false);
            }}
          >
            <div 
              id="wrist-qr-sync-dialog"
              className="bg-zinc-950 border border-teal-500/40 rounded-3xl p-6 max-w-sm w-full shadow-2xl shadow-teal-950/40 flex flex-col items-center relative text-white animate-in fade-in zoom-in-95 duration-150"
            >
              {/* Close Button */}
              <button
                type="button"
                id="btn-close-qr-modal"
                onClick={() => setShowQRModal(false)}
                className="absolute top-4 right-4 p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Close QR Modal"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header */}
              <div className="flex flex-col items-center text-center gap-1.5 mb-5 w-full">
                <h3 className="font-black text-sm uppercase tracking-wider text-white">
                  On-Field Athlete Wrist Sync
                </h3>

                {/* Live pulsing green badge */}
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/35">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Ready for Scan</span>
                </div>

                <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                  TEAM: <span className="text-zinc-200 font-bold">{activeTeamId}</span> • PIN: <span className="text-teal-400 font-bold">{sessionPin}</span>
                </div>
              </div>

              {/* Center QR Code Container */}
              <div 
                id="wrist-qr-canvas-wrapper"
                className="p-4 bg-zinc-950 border border-teal-500/30 rounded-2xl shadow-2xl flex items-center justify-center relative overflow-hidden"
              >
                <SafeQRCodeBoundary
                  fallbackUrl={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(syncUrl)}&color=2dd4bf&bgcolor=09090b`}
                >
                  <QRCodeSVG
                    value={syncUrl}
                    size={220}
                    bgColor="#000000"
                    fgColor="#2dd4bf"
                    level="H"
                    imageSettings={{
                      src: `data:image/svg+xml;utf8,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='#2dd4bf' stroke='#000000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polygon points='13 2 3 14 12 14 11 22 21 10 12 10 13 2'/></svg>")}`,
                      height: 38,
                      width: 38,
                      excavate: true,
                    }}
                  />
                </SafeQRCodeBoundary>
              </div>

              {/* Instructions */}
              <p className="text-xs text-zinc-400 text-center mt-4 px-2 leading-relaxed">
                Instruct players to point phone camera at screen to pair wristbands automatically.
              </p>

              {/* Bottom Controls */}
              <div className="w-full flex flex-col gap-2 mt-5">
                <button
                  type="button"
                  id="btn-copy-direct-link"
                  onClick={handleCopySyncUrl}
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-teal-500/50 text-xs font-bold text-zinc-200 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                >
                  {copiedSyncUrl ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Direct Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-zinc-400" />
                      <span>Copy Direct Link</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  id="btn-launch-wrist-hud-tab"
                  onClick={handleLaunchWristHUD}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-500/20 to-cyan-500/20 hover:from-teal-500/30 hover:to-cyan-500/30 border border-teal-500/40 text-teal-300 hover:text-teal-200 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 shadow-lg shadow-teal-950/50"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Launch Wrist HUD in New Tab</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export { LiveDispatcherModal };
