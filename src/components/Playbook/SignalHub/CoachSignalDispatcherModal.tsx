import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Radio, 
  Zap, 
  Wifi, 
  Copy, 
  Check, 
  RefreshCw, 
  AlertTriangle, 
  Shield, 
  Users, 
  Watch, 
  Smartphone, 
  Send, 
  Volume2, 
  Flame, 
  RotateCcw, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  ExternalLink,
  Plus,
  QrCode,
  Share2,
  Lock,
  Layers,
  ArrowRight,
  Eye
} from 'lucide-react';
import { 
  SignalHubSession, 
  SignalHubPlayCall, 
  SignalHubConnectedDevice, 
  SignalTargeting, 
  CADENCE_OPTIONS, 
  AUDIBLE_COLOR_PRESETS 
} from './types';
import { PlayerNode, SportType } from '../types';
import { 
  initializeGameSession, 
  subscribeToGameSession, 
  dispatchPlayToField, 
  dispatchEmergencyKillCall, 
  formatPin,
  generateSessionPin,
  registerDeviceInSession
} from '../../../services/signalHubService';
import { useAuth } from '../../../context/AuthContext';

interface CoachSignalDispatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlay: {
    title: string;
    formation?: string;
    sport: SportType;
    players: PlayerNode[];
    playId?: string;
    description?: string;
  };
  teamId?: string;
  teamName?: string;
  onOpenReceiverPreview?: (pin: string, position: string) => void;
}

export const CoachSignalDispatcherModal: React.FC<CoachSignalDispatcherModalProps> = ({
  isOpen,
  onClose,
  currentPlay,
  teamId = 'varsity_7v7_team',
  teamName = 'Just1Play 7v7 Team',
  onOpenReceiverPreview
}) => {
  const { user, profile } = useAuth();
  const [session, setSession] = useState<SignalHubSession | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [pushSuccessNotice, setPushSuccessNotice] = useState<string | null>(null);

  // Form State for Active Dispatch Call
  const [playTitle, setPlayTitle] = useState(currentPlay.title || 'Gun Trips Right - Post Wheel');
  const [formation, setFormation] = useState(currentPlay.formation || 'Gun Trips Right');
  const [selectedTargeting, setSelectedTargeting] = useState<SignalTargeting>('Entire Offense');
  const [selectedCadence, setSelectedCadence] = useState<string>('On One');
  const [selectedAudibleColor, setSelectedAudibleColor] = useState<string>('BLUE 42');
  const [customNotes, setCustomNotes] = useState<string>('');
  const [targetRoutes, setTargetRoutes] = useState<Record<string, string>>({});

  // QR Code / Join Modal overlay
  const [showJoinQr, setShowJoinQr] = useState(false);

  // Sync / Auto-generate per-position route descriptions from current canvas
  useEffect(() => {
    if (currentPlay) {
      setPlayTitle(currentPlay.title || 'Custom Play');
      setFormation(currentPlay.formation || 'Standard Spread');

      const initialRoutes: Record<string, string> = {};
      currentPlay.players
        .filter(p => p.role === 'offense')
        .forEach(p => {
          const label = p.label.toUpperCase();
          if (label === 'QB') {
            initialRoutes['QB'] = '3-Step Drop, Read Free Safety';
          } else if (label === 'C') {
            initialRoutes['C'] = 'Pass Protection / Check Middle';
          } else if (label === 'WR1' || label === 'X') {
            initialRoutes[label] = p.route?.length ? '12-Yd Comeback (Outside Break)' : 'Deep Go / Clearout';
          } else if (label === 'WR2' || label === 'Z') {
            initialRoutes[label] = p.route?.length ? 'Deep Post (Middle)' : 'Dig Route (10-Yd)';
          } else if (label === 'SLOT' || label === 'Y' || label === 'H') {
            initialRoutes[label] = 'Wheel Route (Seam / Option)';
          } else if (label === 'RB') {
            initialRoutes['RB'] = 'Swing Route / Checkdown Flat';
          } else {
            initialRoutes[label] = p.customNote || `Execute Assignment (${label})`;
          }
        });

      // Default fallback if empty
      if (Object.keys(initialRoutes).length === 0) {
        initialRoutes['QB'] = '3-Step Drop, Read Free Safety';
        initialRoutes['WR1'] = '12-Yd Comeback (Outside)';
        initialRoutes['WR2'] = 'Deep Post (Middle)';
        initialRoutes['SLOT'] = 'Wheel Route (Seam)';
        initialRoutes['C'] = 'Snap & Pass Pro';
      }

      setTargetRoutes(initialRoutes);
    }
  }, [currentPlay, isOpen]);

  // Real-time Firestore Session Subscription
  useEffect(() => {
    if (!isOpen) return;

    const actualTeamId = teamId || profile?.teamName?.toLowerCase().replace(/\s+/g, '_') || 'team_just1play';
    const coachDisplayName = profile?.displayName || user?.displayName || 'Coach';

    let unsub: (() => void) | undefined;

    const startSession = async () => {
      setIsInitializing(true);
      try {
        const active = await initializeGameSession(
          actualTeamId,
          teamName || profile?.teamName || 'Varsity 7v7 Team',
          user?.uid || 'coach_default',
          coachDisplayName
        );
        setSession(active);

        // Real-time listener
        unsub = subscribeToGameSession(actualTeamId, (updated) => {
          if (updated) {
            setSession(updated);
          }
        });
      } catch (err) {
        console.error('Error starting game session:', err);
      } finally {
        setIsInitializing(false);
      }
    };

    startSession();

    return () => {
      if (unsub) unsub();
    };
  }, [isOpen, teamId, teamName, user?.uid, profile?.displayName, profile?.teamName]);

  // Handle Route text editing
  const handleRouteChange = (pos: string, val: string) => {
    setTargetRoutes(prev => ({
      ...prev,
      [pos]: val
    }));
  };

  // Push Play to Field
  const handlePushPlay = async () => {
    if (!session) return;
    setIsPushing(true);

    const callPayload: SignalHubPlayCall = {
      dispatchId: `disp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      playId: currentPlay.playId || `play_${Date.now()}`,
      playName: playTitle,
      formation,
      personnel: currentPlay.sport === 'flag_5v5' ? '5v5 Flag' : currentPlay.sport === 'flag_7v7' ? '7v7 Flag' : '11v11 Offense',
      targeting: selectedTargeting,
      targetRoutes,
      cadence: selectedCadence,
      audibleColor: selectedAudibleColor,
      notes: customNotes,
      emergencyAudible: false,
      isKillPlay: false,
      timestamp: Date.now(),
      authorId: user?.uid || 'coach',
      authorName: profile?.displayName || user?.displayName || 'Coach'
    };

    try {
      await dispatchPlayToField(session.teamId, callPayload);
      setPushSuccessNotice(`Play "${playTitle}" Pushed to Field (${selectedAudibleColor})!`);
      setTimeout(() => setPushSuccessNotice(null), 4000);
    } catch (err) {
      console.error('Error pushing play to field:', err);
    } finally {
      setIsPushing(false);
    }
  };

  // Handle Emergency Kill Play
  const handleEmergencyKill = async () => {
    if (!session) return;
    if (!window.confirm('Trigger EMERGENCY KILL PLAY to all on-field receivers?')) return;
    try {
      await dispatchEmergencyKillCall(session.teamId, profile?.displayName || user?.displayName || 'Coach');
      setPushSuccessNotice('🚨 EMERGENCY KILL PLAY BROADCAST TO ALL WRISTS!');
      setTimeout(() => setPushSuccessNotice(null), 4000);
    } catch (err) {
      console.error('Error triggering emergency kill call:', err);
    }
  };

  // Copy PIN / Share link
  const handleCopyPin = () => {
    if (!session?.pin) return;
    navigator.clipboard.writeText(session.pin);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const handleCopyJoinLink = () => {
    if (!session?.pin) return;
    const url = `${window.location.origin}/signal-hub?pin=${session.pin}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Simulate test player connection (for coach demo)
  const handleSimulateDevice = async (pos: string) => {
    if (!session) return;
    const newDev: SignalHubConnectedDevice = {
      id: `dev_sim_${Date.now()}_${pos.toLowerCase()}`,
      position: pos,
      playerName: `Player ${pos} #Sim`,
      status: 'connected',
      latencyMs: Math.floor(15 + Math.random() * 20),
      lastPing: Date.now(),
      deviceType: 'wrist_hud'
    };
    await registerDeviceInSession(session.teamId, newDev);
  };

  if (!isOpen) return null;

  const connectedList = session?.connectedPlayers || [];
  const activePin = session?.pin || '842109';
  const formattedPin = formatPin(activePin);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="bg-[#0B0F17] border border-[#00E5FF]/40 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-[0_0_50px_rgba(0,229,255,0.2)] overflow-hidden relative">
        
        {/* Top Header / Live Session Control Bar */}
        <div className="bg-[#131B26] border-b border-white/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#00E5FF] to-[#0070BA] flex items-center justify-center text-[#0B0F17] shadow-[0_0_20px_rgba(0,229,255,0.4)] shrink-0">
              <Radio className="w-6 h-6 stroke-[2.5] animate-pulse" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40">
                  J1P SIGNAL HUB
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  LIVE DISPATCHER ACTIVE
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5">
                Coach Live Game Dispatcher
              </h2>
            </div>
          </div>

          {/* 6-Digit Session PIN & Share actions */}
          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            <div className="flex items-center bg-[#0B0F17] border border-white/15 px-3 py-1.5 rounded-2xl gap-2 shadow-inner">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">GAME PIN:</span>
              <span className="text-base sm:text-lg font-black font-mono text-[#00E5FF] tracking-wider">
                {formattedPin}
              </span>
              <button
                type="button"
                onClick={handleCopyPin}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Copy 6-Digit Session PIN"
              >
                {copiedPin ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyJoinLink}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
              title="Copy Player Direct Join Link"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-cyan-400" />}
              <span className="hidden sm:inline">Share Link</span>
            </button>

            {onOpenReceiverPreview && (
              <button
                type="button"
                onClick={() => onOpenReceiverPreview(activePin, 'QB')}
                className="flex items-center gap-1.5 bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/30 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                title="Open Wrist HUD in simulated popup"
              >
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>Test Wrist HUD</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notice Toast */}
        {pushSuccessNotice && (
          <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-emerald-950 border-b border-emerald-500/40 px-5 py-2.5 flex items-center justify-between text-xs text-emerald-300 font-bold animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400 animate-bounce" />
              <span>{pushSuccessNotice}</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest bg-emerald-900/60 px-2 py-0.5 rounded">
              BROADCASTED
            </span>
          </div>
        )}

        {/* Main Body Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Left Column (8 cols): Play & Audible Configurator */}
          <div className="lg:col-span-8 space-y-5">
            
            {/* Play Title & Formation Card */}
            <div className="bg-[#131B26] border border-white/10 rounded-2xl p-4 space-y-3 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#00E5FF]" />
                  Active Call Specification
                </span>
                <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/20">
                  {currentPlay.sport.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Play Name / Concept</label>
                  <input
                    type="text"
                    value={playTitle}
                    onChange={(e) => setPlayTitle(e.target.value)}
                    className="w-full bg-[#0B0F17] border border-white/15 rounded-xl px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-[#00E5FF]"
                    placeholder="e.g. Gun Trips Right - Post Wheel"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Formation & Personnel</label>
                  <input
                    type="text"
                    value={formation}
                    onChange={(e) => setFormation(e.target.value)}
                    className="w-full bg-[#0B0F17] border border-white/15 rounded-xl px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-[#00E5FF]"
                    placeholder="e.g. Gun Trips Right (11 Personnel)"
                  />
                </div>
              </div>
            </div>

            {/* Targeting, Cadence & Audible Color Controls */}
            <div className="bg-[#131B26] border border-white/10 rounded-2xl p-4 space-y-4 shadow-lg">
              
              {/* 1. Targeting Selector */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center justify-between">
                  <span>1. Select Field Targeting</span>
                  <span className="text-[10px] font-mono text-slate-400">Who receives this call</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(['Entire Offense', 'Quarterback Only', 'Skill Positions', 'Offensive Line & Center', 'Defense'] as SignalTargeting[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSelectedTargeting(t)}
                      className={`p-2 rounded-xl text-xs font-bold text-left transition-all border cursor-pointer ${
                        selectedTargeting === t
                          ? 'bg-[#00E5FF]/20 border-[#00E5FF] text-[#00E5FF] shadow-sm'
                          : 'bg-[#0B0F17] border-white/5 text-slate-400 hover:text-white hover:border-white/20'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Snap Cadence */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center justify-between">
                  <span>2. Snap Cadence</span>
                  <span className="text-[10px] font-mono text-emerald-400">On-Field Snap Count</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CADENCE_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedCadence(c)}
                      className={`p-2 rounded-xl text-xs font-bold text-center transition-all border cursor-pointer ${
                        selectedCadence === c
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-sm'
                          : 'bg-[#0B0F17] border-white/5 text-slate-400 hover:text-white hover:border-white/20'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Audible Color Code */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center justify-between">
                  <span>3. Alert Audible Color</span>
                  <span className="text-[10px] font-mono text-amber-400">Verbal Sideline Callout</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {AUDIBLE_COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setSelectedAudibleColor(preset.label)}
                      className={`p-2.5 rounded-xl text-xs font-black text-center transition-all border cursor-pointer flex items-center justify-center gap-1.5 ${
                        selectedAudibleColor === preset.label
                          ? 'ring-2 ring-[#00E5FF] scale-[1.02] shadow-md'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: preset.color,
                        color: preset.text,
                        borderColor: preset.color
                      }}
                    >
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Per-Position Route Assignments Customizer */}
            <div className="bg-[#131B26] border border-white/10 rounded-2xl p-4 space-y-3 shadow-lg">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  Per-Position Route & Assignment Payloads
                </span>
                <span className="text-[10px] font-mono text-slate-400">Sent directly to each wrist</span>
              </div>

              <div className="space-y-2.5">
                {Object.entries(targetRoutes).map(([pos, routeDesc]) => (
                  <div key={pos} className="flex items-center gap-2.5 bg-[#0B0F17] p-2 rounded-xl border border-white/5">
                    <span className="w-14 text-center font-mono font-black text-xs text-[#00E5FF] bg-slate-900 py-1.5 rounded-lg border border-white/10 shrink-0">
                      {pos}
                    </span>
                    <input
                      type="text"
                      value={routeDesc}
                      onChange={(e) => handleRouteChange(pos, e.target.value)}
                      className="flex-1 bg-transparent border-none text-xs text-slate-200 font-semibold focus:outline-none focus:text-white"
                      placeholder={`Assignment for ${pos}...`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Action Push & Emergency Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handlePushPlay}
                disabled={isPushing}
                className="w-full sm:flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#00E5FF] via-[#00C853] to-[#00E5FF] bg-[length:200%_auto] hover:bg-[position:right_center] text-[#0B0F17] font-black py-3.5 px-6 rounded-2xl text-sm uppercase tracking-wider shadow-[0_0_30px_rgba(0,229,255,0.4)] transition-all cursor-pointer active:scale-98 disabled:opacity-50"
              >
                <Zap className="w-5 h-5 fill-current" />
                <span>{isPushing ? 'Pushing to On-Field Wrists...' : 'PUSH TO FIELD'}</span>
              </button>

              <button
                type="button"
                onClick={handleEmergencyKill}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-black py-3.5 px-5 rounded-2xl text-xs uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-lg shadow-rose-950/40 shrink-0"
              >
                <Flame className="w-4 h-4 text-rose-400" />
                <span>KILL PLAY / RESET</span>
              </button>
            </div>
          </div>

          {/* Right Column (4 cols): Connected Devices & Live Ping Roster */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Connected Field Devices Card */}
            <div className="bg-[#131B26] border border-white/10 rounded-2xl p-4 space-y-3.5 shadow-lg">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">
                    Connected Field Devices
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30 font-bold">
                  {connectedList.length} Active
                </span>
              </div>

              {/* Devices List */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {connectedList.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs">
                    No devices currently connected. Share PIN <strong>{formattedPin}</strong> with players.
                  </div>
                ) : (
                  connectedList.map((dev) => {
                    const isAcknowledged = dev.lastAcknowledgedCallId && session?.lastCall?.dispatchId === dev.lastAcknowledgedCallId;
                    return (
                      <div
                        key={dev.id}
                        className="bg-[#0B0F17] border border-white/5 rounded-xl p-2.5 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center font-mono font-black text-xs text-[#00E5FF]">
                            {dev.position}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white leading-tight flex items-center gap-1.5">
                              <span>{dev.playerName}</span>
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span>{dev.latencyMs}ms ping</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          {isAcknowledged ? (
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              LOCKED IN
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md">
                              STANDBY
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Quick simulation buttons for testing */}
              <div className="pt-2 border-t border-white/5 space-y-1.5">
                <span className="text-[10px] font-mono text-slate-400 block uppercase">
                  Simulate On-Field Receivers (Demo):
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {['QB', 'WR1', 'WR2', 'SLOT', 'C', 'RB'].map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => handleSimulateDevice(pos)}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono font-bold transition-all border border-white/5"
                    >
                      + {pos}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Last Pushed Call / Audit Feed */}
            {session?.lastCall && (
              <div className="bg-[#131B26] border border-white/10 rounded-2xl p-4 space-y-2.5 shadow-lg">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    Last Pushed Call
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {new Date(session.lastCall.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>

                <div className="bg-[#0B0F17] p-3 rounded-xl border border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white">{session.lastCall.playName}</h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                      {session.lastCall.audibleColor}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    Cadence: <strong className="text-emerald-400">{session.lastCall.cadence}</strong>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Target: {session.lastCall.targeting}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#131B26] border-t border-white/10 px-5 py-3 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-[#00E5FF]" />
            <span>Encrypted Live Signal Stream &bull; Low Latency WebSockets/Firestore Sync</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Minimize Dispatcher
          </button>
        </div>

      </div>
    </div>
  );
};
