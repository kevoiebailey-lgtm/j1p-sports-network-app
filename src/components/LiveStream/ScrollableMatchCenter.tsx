import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Calendar, 
  MessageSquare, 
  Camera, 
  Users, 
  Radio, 
  Clock, 
  MapPin, 
  Check, 
  Link2, 
  Play, 
  Send, 
  Sparkles, 
  ShieldCheck, 
  Activity,
  Layers,
  ChevronRight,
  Zap,
  Smartphone,
  Laptop,
  CheckCircle2
} from 'lucide-react';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { LiveGame, UserRole, Tournament } from '../../types';
import { VerifiedBadge } from '../Common/VerifiedBadge';
import { StreamRoom } from '../../services/LiveStreamGateway';
import { LiveShowcaseRosterDrawer } from './LiveShowcaseRosterDrawer';

export interface BracketMatchItem {
  id: string;
  round: number;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  winner?: string;
  status?: string;
  scheduledTime?: string;
  venueName?: string;
}

export interface ScrollableMatchCenterProps {
  currentRoom: StreamRoom | null;
  activeStreamId: string;
  games: LiveGame[];
  uniqueStreamRooms: Array<{
    id: string;
    code: string;
    title: string;
    sport: string;
    broadcasterName: string;
    viewerCount: number;
    streamUrl?: string;
    rawRoom?: StreamRoom;
  }>;
  onSelectStreamRoom: (id: string, rawRoom?: StreamRoom, url?: string) => void;
  chatMessages: Array<{
    id: string;
    authorName: string;
    authorAvatar?: string;
    authorRole: UserRole;
    authorIsVerified?: boolean;
    text: string;
    timestamp: string;
  }>;
  inputChat: string;
  onChangeInputChat: (val: string) => void;
  onSendChat: (e: React.FormEvent) => void;
  activeCamAngle: 'main' | 'high' | 'endzone' | 'iso';
  onSelectCamAngle: (angle: 'main' | 'high' | 'endzone' | 'iso') => void;
  copiedLink: boolean;
  onCopyShareLink: () => void;
}

export const ScrollableMatchCenter: React.FC<ScrollableMatchCenterProps> = ({
  currentRoom,
  activeStreamId,
  games,
  uniqueStreamRooms,
  onSelectStreamRoom,
  chatMessages,
  inputChat,
  onChangeInputChat,
  onSendChat,
  activeCamAngle,
  onSelectCamAngle,
  copiedLink,
  onCopyShareLink
}) => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'bracket' | 'chat' | 'rosters'>('schedule');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [matches, setMatches] = useState<BracketMatchItem[]>([]);

  useEffect(() => {
    if (!db) return;
    const unsubTourneys = onSnapshot(
      collection(db, 'tournaments'),
      (snap) => {
        if (!snap.empty) {
          setTournaments(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Tournament)));
        } else {
          setTournaments([]);
        }
      },
      (err) => {
        console.warn('Tournaments snapshot notice:', err);
        setTournaments([]);
      }
    );

    const unsubMatches = onSnapshot(
      collection(db, 'matches'),
      (snap) => {
        if (!snap.empty) {
          setMatches(snap.docs.map((d) => ({ id: d.id, ...d.data() } as BracketMatchItem)));
        } else {
          setMatches([]);
        }
      },
      (err) => {
        console.warn('Matches snapshot notice:', err);
        setMatches([]);
      }
    );

    return () => {
      unsubTourneys();
      unsubMatches();
    };
  }, []);

  // Filter matches for the bracket view
  const bracketTournament = tournaments[0] || null;
  const qfMatches = matches.filter(m => m.round === 1);
  const sfMatches = matches.filter(m => m.round === 2);
  const finalMatch = matches.find(m => m.round === 3) || null;

  return (
    <div className="w-full space-y-6 pb-20">
      
      {/* MATCH CENTER TABS BAR */}
      <div className="flex items-center justify-between border-b border-slate-700/80 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`min-h-[44px] min-w-[44px] px-4 py-2.5 rounded-xl font-mono text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border ${
              activeTab === 'schedule'
                ? 'bg-[#F59E0B] text-slate-950 border-[#F59E0B] shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                : 'bg-[#1E2630] text-slate-300 border-slate-700 hover:border-slate-600 hover:text-white'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Live Matches ({games.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('bracket')}
            className={`min-h-[44px] min-w-[44px] px-4 py-2.5 rounded-xl font-mono text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border ${
              activeTab === 'bracket'
                ? 'bg-[#F59E0B] text-slate-950 border-[#F59E0B] shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                : 'bg-[#1E2630] text-slate-300 border-slate-700 hover:border-slate-600 hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4 text-[#00F2FE]" />
            <span>Tournament Bracket</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`min-h-[44px] min-w-[44px] px-4 py-2.5 rounded-xl font-mono text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border ${
              activeTab === 'chat'
                ? 'bg-[#F59E0B] text-slate-950 border-[#F59E0B] shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                : 'bg-[#1E2630] text-slate-300 border-slate-700 hover:border-slate-600 hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Live Chat & Feeds</span>
          </button>

          <button
            onClick={() => setActiveTab('rosters')}
            className={`min-h-[44px] min-w-[44px] px-4 py-2.5 rounded-xl font-mono text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border ${
              activeTab === 'rosters'
                ? 'bg-gradient-to-r from-[#00F2FE] to-[#0284C7] text-slate-950 border-[#00F2FE] shadow-[0_0_15px_rgba(0,242,254,0.4)]'
                : 'bg-[#1E2630] text-slate-300 border-slate-700 hover:border-slate-600 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 text-[#00F2FE]" />
            <span>Live Rosters & Scout Notes</span>
          </button>
        </div>

        <button
          onClick={onCopyShareLink}
          className="min-h-[44px] min-w-[44px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono font-bold text-[#00F2FE] uppercase transition-all flex items-center gap-2 cursor-pointer"
        >
          {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Link2 className="w-4 h-4 text-[#00F2FE]" />}
          <span>{copiedLink ? 'Copied Link!' : 'Share Stream'}</span>
        </button>
      </div>

      {/* TAB 1: ALL MATCHES & LIVE SCHEDULE GRID */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-black text-[#F59E0B] uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-[#00F2FE]" />
              Active Live Streams & Court Schedules
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Tap match card to load video feed
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {games.map((g) => {
              const isSelected = activeStreamId === g.id;
              return (
                <div
                  key={g.id}
                  onClick={() => onSelectStreamRoom(g.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 relative overflow-hidden ${
                    isSelected
                      ? 'bg-[#1E2630] border-[#00F2FE] shadow-[0_0_20px_rgba(0,242,254,0.3)]'
                      : 'bg-[#1E2630]/90 border-slate-700/80 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-rose-600/20 text-rose-400 border border-rose-500/40 text-[9px] font-mono font-black uppercase rounded-full flex items-center gap-1 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                      {g.status || 'LIVE'}
                    </span>

                    <span className="text-[10px] font-mono text-[#00F2FE] font-bold uppercase bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {g.period || '3rd Qtr'} • {g.gameClock || '04:12'}
                    </span>
                  </div>

                  <div className="space-y-2 font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-white">{g.homeTeam?.name || 'Home Team'}</span>
                      <span className="text-lg font-black text-[#F59E0B] bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {g.homeTeam?.score ?? 0}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-800 pt-1.5">
                      <span className="text-sm font-black text-white">{g.awayTeam?.name || 'Away Team'}</span>
                      <span className="text-lg font-black text-[#00F2FE] bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {g.awayTeam?.score ?? 0}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-[#F59E0B] shrink-0" />
                      <span className="truncate">{g.location || 'Main Gym Court 1'}</span>
                    </span>

                    <button
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1 shrink-0 ${
                        isSelected
                          ? 'bg-[#00F2FE] text-slate-950 font-black'
                          : 'bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{isSelected ? 'WATCHING' : 'WATCH'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: TOURNAMENT BRACKET */}
      {activeTab === 'bracket' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-[#1E2630] border border-slate-700/80 space-y-1">
            <h3 className="text-base font-black text-white uppercase font-mono flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[#F59E0B]" />
              {bracketTournament?.name || 'Tri-State Championship Bracket'}
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Single-elimination championship format. Live scores updated automatically across courts.
            </p>
          </div>

          {qfMatches.length === 0 && sfMatches.length === 0 && !finalMatch ? (
            <div className="p-8 rounded-2xl bg-[#1E2630] border border-slate-700/80 text-center space-y-2">
              <Trophy className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-mono text-slate-300">No tournament bracket matches currently active.</p>
              <p className="text-xs font-mono text-slate-500">Tournament brackets will appear here once seeded by the tournament director.</p>
            </div>
          ) : (
            <div className="overflow-x-auto pb-4 scrollbar-thin">
              <div className="min-w-[760px] grid grid-cols-3 gap-6 relative">
                
                {/* QUARTERFINALS COLUMN */}
                <div className="space-y-4">
                  <div className="text-center py-1.5 bg-[#1E2630] rounded-xl border border-slate-700 text-xs font-mono font-black text-[#00F2FE] uppercase">
                    QUARTERFINALS
                  </div>

                  <div className="space-y-4">
                    {qfMatches.map((m) => (
                      <div key={m.id} className="p-3 rounded-2xl bg-[#1E2630] border border-slate-700/80 space-y-2 text-xs font-mono">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>{m.scheduledTime}</span>
                          <span className="text-[#F59E0B] font-bold">{m.status}</span>
                        </div>

                        <div className="space-y-1">
                          <div className={`flex items-center justify-between px-2 py-1 rounded ${m.winner === m.homeTeam ? 'bg-emerald-950/40 text-emerald-300 font-bold' : 'text-white'}`}>
                            <span>{m.homeTeam}</span>
                            <span>{m.homeScore}</span>
                          </div>
                          <div className={`flex items-center justify-between px-2 py-1 rounded ${m.winner === m.awayTeam ? 'bg-emerald-950/40 text-emerald-300 font-bold' : 'text-white'}`}>
                            <span>{m.awayTeam}</span>
                            <span>{m.awayScore}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SEMIFINALS COLUMN */}
                <div className="space-y-4">
                  <div className="text-center py-1.5 bg-[#1E2630] rounded-xl border border-slate-700 text-xs font-mono font-black text-[#F59E0B] uppercase">
                    SEMIFINALS
                  </div>

                  <div className="space-y-8 pt-6">
                    {sfMatches.map((m) => (
                      <div key={m.id} className="p-3 rounded-2xl bg-[#1E2630] border border-[#F59E0B]/40 space-y-2 text-xs font-mono shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>{m.scheduledTime}</span>
                          <span className="text-rose-400 font-bold">🔴 LIVE</span>
                        </div>

                        <div className="space-y-1">
                          <div className={`flex items-center justify-between px-2 py-1 rounded ${m.winner === m.homeTeam ? 'bg-emerald-950/40 text-emerald-300 font-bold' : 'text-white'}`}>
                            <span>{m.homeTeam}</span>
                            <span className="font-bold text-[#F59E0B]">{m.homeScore}</span>
                          </div>
                          <div className={`flex items-center justify-between px-2 py-1 rounded ${m.winner === m.awayTeam ? 'bg-emerald-950/40 text-emerald-300 font-bold' : 'text-white'}`}>
                            <span>{m.awayTeam}</span>
                            <span className="font-bold text-[#00F2FE]">{m.awayScore}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* FINALS CHAMPIONSHIP COLUMN */}
                <div className="space-y-4">
                  <div className="text-center py-1.5 bg-[#F59E0B] rounded-xl text-xs font-mono font-black text-slate-950 uppercase shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                    CHAMPIONSHIP FINAL
                  </div>

                  <div className="pt-12">
                    {finalMatch ? (
                      <div className="p-4 rounded-2xl bg-[#1E2630] border-2 border-[#F59E0B] space-y-3 text-xs font-mono shadow-[0_0_25px_rgba(245,158,11,0.2)]">
                        <div className="flex items-center justify-between text-[10px] text-slate-300">
                          <span className="flex items-center gap-1 text-[#F59E0B] font-bold">
                            <Trophy className="w-3.5 h-3.5" /> CHAMPIONSHIP MATCH
                          </span>
                          <span>{finalMatch.scheduledTime}</span>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-sm">
                            <span>{finalMatch.homeTeam}</span>
                            <span className="text-[#F59E0B]">{finalMatch.homeScore}</span>
                          </div>
                          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-sm">
                            <span>{finalMatch.awayTeam}</span>
                            <span className="text-[#00F2FE]">{finalMatch.awayScore}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-700/80 text-[10px] text-emerald-400 font-bold flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            Champion: {finalMatch.winner}
                          </span>
                          <span className="text-slate-400">{finalMatch.venueName}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-[#1E2630] border border-slate-700 text-center text-xs font-mono text-slate-400">
                        Awaiting Semifinal Winners
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LIVE CHAT & TELEMETRY */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LIVE CHAT BOX */}
          <div className="lg:col-span-7 bg-[#1E2630] border border-slate-700/80 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
              <span className="text-xs font-mono font-black uppercase text-[#00F2FE] flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#00F2FE]" />
                STREAM CHAT ({currentRoom?.roomCode || 'J1P-101'})
              </span>
              <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Live Feed
              </span>
            </div>

            {/* Chat Messages */}
            <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin">
              {chatMessages.map((msg) => (
                <div key={msg.id} className="p-3 rounded-2xl bg-[#161C22] border border-slate-700/60 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <img
                        src={msg.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                        alt={msg.authorName}
                        className="w-4 h-4 rounded-full object-cover border border-[#00F2FE]/50"
                      />
                      <span className="font-bold text-white truncate">{msg.authorName}</span>
                      {msg.authorIsVerified && <VerifiedBadge size="sm" />}
                    </div>
                    <span className="text-[9px] font-mono text-slate-400">{msg.timestamp}</span>
                  </div>
                  <p className="text-xs text-slate-200 font-sans leading-relaxed">{msg.text}</p>
                </div>
              ))}
            </div>

            {/* Input Form */}
            <form onSubmit={onSendChat} className="flex items-center gap-2 pt-2 border-t border-slate-700/80">
              <input
                type="text"
                value={inputChat}
                onChange={(e) => onChangeInputChat(e.target.value)}
                placeholder="Post comment to live feed..."
                className="flex-1 px-3.5 py-2.5 rounded-2xl bg-[#161C22] border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-[#00F2FE]"
              />
              <button
                type="submit"
                className="p-2.5 rounded-2xl bg-[#00F2FE] hover:bg-[#00d0db] text-slate-950 font-black transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4 stroke-[2.5]" />
              </button>
            </form>
          </div>

          {/* TELEMETRY & CAMERA ANGLES */}
          <div className="lg:col-span-5 bg-[#1E2630] border border-slate-700/80 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="border-b border-slate-700/80 pb-3">
              <span className="text-xs font-mono font-black uppercase text-[#F59E0B] flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#F59E0B]" />
                MULTI-CAM CONTROL & TELEMETRY
              </span>
            </div>

            <div className="space-y-3">
              <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
                Camera Angle Presets
              </span>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'main', label: 'Main Sideline' },
                  { id: 'high', label: 'Tactical High' },
                  { id: 'endzone', label: 'Rim / Endzone' },
                  { id: 'iso', label: 'Star Player Iso' }
                ].map(c => (
                  <button
                    key={c.id}
                    onClick={() => onSelectCamAngle(c.id as any)}
                    className={`p-2.5 rounded-xl border text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
                      activeCamAngle === c.id
                        ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B] font-black'
                        : 'bg-[#161C22] border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Connected Devices */}
              {currentRoom?.activeDevices && currentRoom.activeDevices.length > 0 && (
                <div className="p-3 rounded-2xl bg-[#161C22] border border-slate-700/80 space-y-2 pt-3">
                  <div className="text-[10px] font-mono text-[#00F2FE] font-bold uppercase flex items-center justify-between">
                    <span>Sync Sessions ({currentRoom.activeDevices.length})</span>
                    <span>Live</span>
                  </div>

                  <div className="space-y-1 font-mono text-[11px] max-h-24 overflow-y-auto">
                    {currentRoom.activeDevices.map((dev, i) => (
                      <div key={i} className="flex items-center justify-between text-slate-300 px-2 py-1 bg-slate-900 rounded-lg">
                        <span className="flex items-center gap-1.5 truncate">
                          {dev.deviceType === 'mobile' ? (
                            <Smartphone className="w-3.5 h-3.5 text-[#00F2FE]" />
                          ) : (
                            <Laptop className="w-3.5 h-3.5 text-purple-400" />
                          )}
                          <span className="truncate">{dev.deviceName}</span>
                        </span>
                        {dev.isBroadcaster && (
                          <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-400 text-[9px] font-black uppercase">
                            Cam Host
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* TAB 4: LIVE SHOWCASE ROSTERS & SCOUT NOTES */}
      {activeTab === 'rosters' && (
        <div className="rounded-3xl bg-[#161C22] border border-slate-700/80 p-4 sm:p-6 shadow-2xl min-h-[480px]">
          <LiveShowcaseRosterDrawer
            isOpen={true}
            onClose={() => {}}
            homeTeamName="Lightning Elite AAU"
            awayTeamName="Metro All-Stars Academy"
            currentQuarter="Q3"
            gameClock="04:18"
          />
        </div>
      )}

    </div>
  );
};
