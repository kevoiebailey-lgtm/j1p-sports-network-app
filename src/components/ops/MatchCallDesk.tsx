'use client';

import React, { useState, useEffect, useMemo, useId } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/src/firebase/config';
import {
  Megaphone,
  Volume2,
  Radio,
  Clock,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Square,
  ChevronRight,
  Layers,
  Sliders
} from 'lucide-react';

export interface DispatchGame {
  id: string;
  divisionId?: string;
  divisionName?: string;
  fieldName: string;
  status: 'upcoming' | 'live' | 'final';
  startTime: string;
  startDateTime?: string;
  homeTeam: {
    id?: string;
    name: string;
    score?: number;
    coachName?: string;
    coachPhone?: string;
  };
  awayTeam: {
    id?: string;
    name: string;
    score?: number;
    coachName?: string;
    coachPhone?: string;
  };
  period?: string;
}

export interface FieldQueue {
  fieldName: string;
  currentMatch: DispatchGame | null;
  onDeckMatch: DispatchGame | null;
  inTheHoleMatch: DispatchGame | null;
}

export interface MatchCallDeskProps {
  eventId: string;
  eventName?: string;
  initialGames?: DispatchGame[];
}

export type CallStage = 'first_call' | 'final_call' | 'in_the_hole' | 'custom';

const SAMPLE_DISPATCH_GAMES: DispatchGame[] = [
  {
    id: 'g1',
    fieldName: 'Field 1 (Main Turf)',
    status: 'live',
    startTime: '1:00 PM',
    divisionName: '16U Girls Flag',
    period: '2nd Half 3:45',
    homeTeam: { name: 'Lady Lightning Elite', score: 28, coachName: 'Coach Bailey', coachPhone: '555-0101' },
    awayTeam: { name: 'Jersey Shore Wave', score: 21, coachName: 'Coach Miller', coachPhone: '555-0102' }
  },
  {
    id: 'g2',
    fieldName: 'Field 1 (Main Turf)',
    status: 'upcoming',
    startTime: '2:15 PM',
    divisionName: '16U Girls Flag',
    homeTeam: { name: 'NYC Empire Flag', coachName: 'Coach Davis', coachPhone: '555-0103' },
    awayTeam: { name: 'Philly Blitz', coachName: 'Coach Roberts', coachPhone: '555-0104' }
  },
  {
    id: 'g3',
    fieldName: 'Field 1 (Main Turf)',
    status: 'upcoming',
    startTime: '3:30 PM',
    divisionName: '16U Girls Flag',
    homeTeam: { name: 'Texas Lone Stars', coachName: 'Coach Vance' },
    awayTeam: { name: 'Metro Sting', coachName: 'Coach Harrison' }
  },
  {
    id: 'g4',
    fieldName: 'Field 2 (West Meadow)',
    status: 'live',
    startTime: '1:15 PM',
    divisionName: '14U Open',
    period: 'Q3 1:10',
    homeTeam: { name: 'Georgia Prime 14U', score: 14, coachName: 'Coach Carter' },
    awayTeam: { name: 'SoCal All-Stars', score: 12, coachName: 'Coach Brooks' }
  },
  {
    id: 'g5',
    fieldName: 'Field 2 (West Meadow)',
    status: 'upcoming',
    startTime: '2:30 PM',
    divisionName: '14U Open',
    homeTeam: { name: 'Carolina Heights', coachName: 'Coach Evans' },
    awayTeam: { name: 'Oakland Soldiers', coachName: 'Coach Reed' }
  },
  {
    id: 'g6',
    fieldName: 'Field 2 (West Meadow)',
    status: 'upcoming',
    startTime: '3:45 PM',
    divisionName: '14U Open',
    homeTeam: { name: 'Midwest Storm', coachName: 'Coach Hayes' },
    awayTeam: { name: 'Florida Fire', coachName: 'Coach Cooper' }
  },
  {
    id: 'g7',
    fieldName: 'Field 3 (East Arena)',
    status: 'upcoming',
    startTime: '2:00 PM',
    divisionName: 'Varsity Showcase',
    homeTeam: { name: 'Atlanta Dream 17U', coachName: 'Coach Bell' },
    awayTeam: { name: 'Mid-Atlantic Waves', coachName: 'Coach Ross' }
  },
  {
    id: 'g8',
    fieldName: 'Field 3 (East Arena)',
    status: 'upcoming',
    startTime: '3:15 PM',
    divisionName: 'Varsity Showcase',
    homeTeam: { name: 'Bay Area Flight', coachName: 'Coach Sullivan' },
    awayTeam: { name: 'Memphis Reign', coachName: 'Coach Diaz' }
  }
];

export function MatchCallDesk({
  eventId,
  eventName = 'Just One Play Invitational',
  initialGames = SAMPLE_DISPATCH_GAMES
}: MatchCallDeskProps) {
  const customScriptId = useId();
  const [games, setGames] = useState<DispatchGame[]>(initialGames);
  const [selectedField, setSelectedField] = useState<string>('all');

  // PA Script & Web Speech API State
  const [activeScript, setActiveScript] = useState<string>(
    'First Call: NYC Empire Flag versus Philly Blitz, report to Field 1 for team check-in and coin toss.'
  );
  const [activeCallStage, setActiveCallStage] = useState<CallStage>('first_call');
  const [selectedMatch, setSelectedMatch] = useState<DispatchGame | null>(initialGames[1] || null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceRate, setVoiceRate] = useState<number>(0.95);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState<number>(0);

  // Coach Nudge Push State
  const [isPingingCoach, setIsPingingCoach] = useState(false);
  const [pingSuccessMatchId, setPingSuccessMatchId] = useState<string | null>(null);

  // Active Broadcast Feed Log
  const [broadcastLog, setBroadcastLog] = useState<{ id: string; time: string; text: string; type: string }[]>([
    {
      id: 'log-1',
      time: '2:05 PM',
      text: 'First Call: NYC Empire Flag vs Philly Blitz on Field 1',
      type: 'First Call'
    }
  ]);

  // 1. Firestore Listener
  useEffect(() => {
    if (!eventId) return;

    try {
      const gamesRef = collection(db, 'events', eventId, 'games');
      const q = query(gamesRef, where('status', 'in', ['live', 'upcoming']));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const loaded: DispatchGame[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            loaded.push({
              id: d.id,
              fieldName: data.fieldName || data.court || 'Field 1',
              status: data.status || 'upcoming',
              startTime: data.startTime || 'TBD',
              startDateTime: data.startDateTime,
              divisionName: data.divisionName || data.division,
              period: data.period,
              homeTeam: {
                id: data.homeTeam?.id,
                name: data.homeTeam?.name || 'Home Team',
                score: data.homeTeam?.score,
                coachName: data.homeTeam?.coachName,
                coachPhone: data.homeTeam?.coachPhone
              },
              awayTeam: {
                id: data.awayTeam?.id,
                name: data.awayTeam?.name || 'Away Team',
                score: data.awayTeam?.score,
                coachName: data.awayTeam?.coachName,
                coachPhone: data.awayTeam?.coachPhone
              }
            });
          });

          loaded.sort((a, b) => {
            const timeA = a.startDateTime ? new Date(a.startDateTime).getTime() : 0;
            const timeB = b.startDateTime ? new Date(b.startDateTime).getTime() : 0;
            return timeA - timeB;
          });

          setGames(loaded);
        }
      }, (err) => {
        console.warn('Firestore games snapshot note:', err.message);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn('Firestore subscription fallback:', e);
    }
  }, [eventId]);

  // 2. Web Speech API Initialization
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const englishVoices = voices.filter((v) => v.lang.startsWith('en'));
        setAvailableVoices(englishVoices.length > 0 ? englishVoices : voices);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // 3. Multi-Field Queue Computation
  const fieldQueues = useMemo<FieldQueue[]>(() => {
    const queueMap = new Map<string, DispatchGame[]>();

    games.forEach((game) => {
      const field = game.fieldName || 'Field 1';
      if (!queueMap.has(field)) {
        queueMap.set(field, []);
      }
      queueMap.get(field)!.push(game);
    });

    const queues: FieldQueue[] = [];

    queueMap.forEach((fieldGames, fieldName) => {
      const liveGame = fieldGames.find((g) => g.status === 'live') || null;
      const upcomingGames = fieldGames.filter((g) => g.status === 'upcoming');

      let current: DispatchGame | null = liveGame;
      let onDeck: DispatchGame | null = null;
      let inTheHole: DispatchGame | null = null;

      if (liveGame) {
        onDeck = upcomingGames[0] || null;
        inTheHole = upcomingGames[1] || null;
      } else {
        current = upcomingGames[0] || null;
        onDeck = upcomingGames[1] || null;
        inTheHole = upcomingGames[2] || null;
      }

      queues.push({
        fieldName,
        currentMatch: current,
        onDeckMatch: onDeck,
        inTheHoleMatch: inTheHole
      });
    });

    return queues.sort((a, b) => a.fieldName.localeCompare(b.fieldName));
  }, [games]);

  const uniqueFields = useMemo(() => {
    return ['all', ...fieldQueues.map((q) => q.fieldName)];
  }, [fieldQueues]);

  const filteredFieldQueues = useMemo(() => {
    if (selectedField === 'all') return fieldQueues;
    return fieldQueues.filter((q) => q.fieldName === selectedField);
  }, [fieldQueues, selectedField]);

  // 4. Script Generator
  const generateScript = (match: DispatchGame, stage: CallStage): string => {
    const home = match.homeTeam.name;
    const away = match.awayTeam.name;
    const field = match.fieldName;

    switch (stage) {
      case 'first_call':
        return `Attention venue! First Call: ${home} versus ${away}. Please report to ${field} for official team check-in and coin toss.`;
      case 'final_call':
        return `Final Call! ${home} and ${away}, you have five minutes to kickoff on ${field}. Forfeit clock will start if teams are not on sidelines.`;
      case 'in_the_hole':
        return `Warmup Warning: ${home} versus ${away}, you are In The Hole for ${field}. Begin pre-game warmups in designated zone.`;
      case 'custom':
      default:
        return `Now starting on ${field}: ${home} versus ${away}.`;
    }
  };

  const handleSelectMatchForCall = (match: DispatchGame, stage: CallStage) => {
    setSelectedMatch(match);
    setActiveCallStage(stage);
    const script = generateScript(match, stage);
    setActiveScript(script);
  };

  // 5. Audio Dispatch
  const handlePlayAudioCall = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('Web Speech API is not supported on this browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(activeScript);
    utterance.rate = voiceRate;

    if (availableVoices.length > 0 && availableVoices[selectedVoiceIndex]) {
      utterance.voice = availableVoices[selectedVoiceIndex];
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      setBroadcastLog((prev) => [
        {
          id: `log-${Date.now()}`,
          time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
          text: activeScript,
          type: activeCallStage.replace('_', ' ').toUpperCase()
        },
        ...prev.slice(0, 15)
      ]);
    };
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleStopAudio = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // 6. Coach Ping
  const handleSendCoachPing = async (match: DispatchGame) => {
    setIsPingingCoach(true);
    try {
      if (eventId) {
        await addDoc(collection(db, 'events', eventId, 'notifications'), {
          type: 'coach_ping',
          matchId: match.id,
          fieldName: match.fieldName,
          homeTeam: match.homeTeam.name,
          awayTeam: match.awayTeam.name,
          message: `Coach Alert: Your match on ${match.fieldName} begins in 10 minutes (${match.homeTeam.name} vs ${match.awayTeam.name}).`,
          createdAt: serverTimestamp()
        });
      }

      setPingSuccessMatchId(match.id);
      setTimeout(() => setPingSuccessMatchId(null), 3000);
    } catch (err) {
      console.error('Failed to dispatch coach ping:', err);
    } finally {
      setIsPingingCoach(false);
    }
  };

  return (
    <div className="w-full bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 font-sans space-y-8 rounded-3xl border border-slate-800 shadow-2xl">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>PA Dispatch & Match Call Desk</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight text-white">
            Gameday Arena Announcer
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            {eventName} &bull; Web Speech TTS Bluetooth PA Broadcasting & Coach Pings
          </p>
        </div>

        {/* Field Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1.5 bg-slate-900 border border-slate-800 rounded-2xl">
          {uniqueFields.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setSelectedField(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${
                selectedField === f
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {f === 'all' ? 'All Fields' : f}
            </button>
          ))}
        </div>
      </div>

      {/* 1-Tap PA Script Generator & Audio Console */}
      <div className="bg-slate-900/80 border-2 border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-[0_0_40px_rgba(245,158,11,0.1)] space-y-4 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold">
                1-Tap Voice Synthesizer & Script Room
              </span>
              <h3 className="text-base font-bold text-white">
                {selectedMatch
                  ? `${selectedMatch.homeTeam.name} vs ${selectedMatch.awayTeam.name} (${selectedMatch.fieldName})`
                  : 'Select any On-Deck Match Below'}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {(['first_call', 'final_call', 'in_the_hole'] as const).map((stage) => (
              <button
                key={stage}
                type="button"
                onClick={() => {
                  if (selectedMatch) handleSelectMatchForCall(selectedMatch, stage);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold uppercase transition-all cursor-pointer ${
                  activeCallStage === stage
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {stage.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="relative z-10 space-y-3">
          <label htmlFor={customScriptId} className="sr-only">PA Script to Broadcast</label>
          <textarea
            id={customScriptId}
            rows={2}
            value={activeScript}
            onChange={(e) => {
              setActiveScript(e.target.value);
              setActiveCallStage('custom');
            }}
            className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-white font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all resize-none shadow-inner"
            placeholder="Type or generate script to read over PA..."
          />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-teal-400" />
                <span>Speed:</span>
                <select
                  value={voiceRate}
                  onChange={(e) => setVoiceRate(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 font-bold focus:outline-none cursor-pointer"
                >
                  <option value={0.85}>0.85x (Slow/Clear)</option>
                  <option value={0.95}>0.95x (Standard PA)</option>
                  <option value={1.1}>1.10x (Brisk)</option>
                </select>
              </div>

              {availableVoices.length > 0 && (
                <div className="hidden md:flex items-center gap-1.5">
                  <span>Voice:</span>
                  <select
                    value={selectedVoiceIndex}
                    onChange={(e) => setSelectedVoiceIndex(Number(e.target.value))}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 text-[11px] truncate max-w-[140px] focus:outline-none cursor-pointer"
                  >
                    {availableVoices.map((v, i) => (
                      <option key={i} value={i}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {isSpeaking && (
                <button
                  type="button"
                  onClick={handleStopAudio}
                  className="py-2.5 px-4 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop Speech</span>
                </button>
              )}

              <button
                type="button"
                onClick={handlePlayAudioCall}
                className={`py-2.5 px-6 rounded-xl font-mono font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg cursor-pointer ${
                  isSpeaking
                    ? 'bg-amber-400 text-slate-950 animate-pulse shadow-amber-400/20'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 shadow-amber-500/20 active:scale-95'
                }`}
              >
                <Volume2 className={`w-4 h-4 ${isSpeaking ? 'animate-bounce' : ''}`} />
                <span>{isSpeaking ? 'Broadcasting Speech...' : 'Play Audio Call (TTS)'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Field Dispatch Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-teal-400" />
            <h3 className="text-base font-black uppercase italic tracking-wider text-white">
              Field Queue Operations Matrix
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {fieldQueues.length} Active Field Zones
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredFieldQueues.map((fieldQueue) => (
            <div
              key={fieldQueue.fieldName}
              className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl flex flex-col justify-between"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <h4 className="text-base font-black uppercase tracking-tight text-white font-mono">
                    {fieldQueue.fieldName}
                  </h4>
                </div>
                <span className="text-[10px] font-mono uppercase bg-slate-950 px-2.5 py-1 rounded-full text-slate-400 border border-slate-800 font-bold">
                  Field Synced
                </span>
              </div>

              {/* Slot 1: CURRENT */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono font-black uppercase tracking-wider">
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>CURRENT &bull; {fieldQueue.currentMatch?.status === 'live' ? 'LIVE NOW' : 'NEXT UP'}</span>
                  </span>
                  {fieldQueue.currentMatch?.period && (
                    <span className="text-white bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/40">
                      {fieldQueue.currentMatch.period}
                    </span>
                  )}
                </div>

                {fieldQueue.currentMatch ? (
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="space-y-1">
                      <div className="font-bold text-white text-sm">
                        {fieldQueue.currentMatch.homeTeam.name} vs {fieldQueue.currentMatch.awayTeam.name}
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        {fieldQueue.currentMatch.divisionName} &bull; Tip: {fieldQueue.currentMatch.startTime}
                      </div>
                    </div>

                    {fieldQueue.currentMatch.homeTeam.score !== undefined && (
                      <div className="text-lg font-black font-mono text-emerald-400 text-right">
                        {fieldQueue.currentMatch.homeTeam.score} - {fieldQueue.currentMatch.awayTeam.score}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs font-mono text-slate-500 py-1 italic">No active match</div>
                )}
              </div>

              {/* Slot 2: ON DECK */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-amber-500/30 space-y-2.5">
                <div className="flex items-center justify-between text-[10px] font-mono font-black uppercase tracking-wider text-amber-400">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>ON DECK &bull; IMMEDIATE FOLLOW-UP</span>
                  </span>
                  {fieldQueue.onDeckMatch && (
                    <span className="text-slate-300 font-mono">
                      Scheduled {fieldQueue.onDeckMatch.startTime}
                    </span>
                  )}
                </div>

                {fieldQueue.onDeckMatch ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div>
                        <div className="font-bold text-white text-sm">
                          {fieldQueue.onDeckMatch.homeTeam.name} vs {fieldQueue.onDeckMatch.awayTeam.name}
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          {fieldQueue.onDeckMatch.divisionName}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => handleSelectMatchForCall(fieldQueue.onDeckMatch!, 'first_call')}
                        className="py-1.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Megaphone className="w-3 h-3" />
                        <span>First Call</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectMatchForCall(fieldQueue.onDeckMatch!, 'final_call')}
                        className="py-1.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <AlertTriangle className="w-3 h-3" />
                        <span>Final Call</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendCoachPing(fieldQueue.onDeckMatch!)}
                        disabled={isPingingCoach}
                        className="py-1.5 px-3 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/40 text-teal-300 text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ml-auto"
                      >
                        {pingSuccessMatchId === fieldQueue.onDeckMatch.id ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400 font-bold">Pings Sent</span>
                          </>
                        ) : (
                          <>
                            <Smartphone className="w-3 h-3" />
                            <span>Ping Coaches</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs font-mono text-slate-500 py-1 italic">No On-Deck matchup queued</div>
                )}
              </div>

              {/* Slot 3: IN THE HOLE */}
              <div className="p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  <span>IN THE HOLE &bull; 2 SLOTS OUT</span>
                  {fieldQueue.inTheHoleMatch && (
                    <span>Starts ~{fieldQueue.inTheHoleMatch.startTime}</span>
                  )}
                </div>

                {fieldQueue.inTheHoleMatch ? (
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="truncate max-w-[240px]">
                      <span className="font-bold text-slate-300">
                        {fieldQueue.inTheHoleMatch.homeTeam.name} vs {fieldQueue.inTheHoleMatch.awayTeam.name}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectMatchForCall(fieldQueue.inTheHoleMatch!, 'in_the_hole')}
                      className="text-[11px] font-mono text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Warmup Alert</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="text-xs font-mono text-slate-600 italic">Queue clear</div>
                )}
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* Recent PA Announcements Log */}
      <div className="space-y-3 pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-teal-400" />
            <span>Recent PA Broadcast Log</span>
          </span>
          <span>{broadcastLog.length} Records</span>
        </div>

        <div className="space-y-2">
          {broadcastLog.map((log) => (
            <div
              key={log.id}
              className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono"
            >
              <div className="flex items-center gap-2.5 truncate">
                <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-400 text-[10px] font-bold">
                  {log.time}
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-bold uppercase">
                  {log.type}
                </span>
                <span className="text-slate-200 truncate">{log.text}</span>
              </div>

              <span className="text-[10px] text-emerald-400 font-bold uppercase shrink-0">
                Aired
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

export default MatchCallDesk;
