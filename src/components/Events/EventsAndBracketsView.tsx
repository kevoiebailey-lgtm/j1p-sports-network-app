import React, { useState } from 'react';
import { 
  Trophy, 
  MapPin, 
  Clock, 
  ChevronRight, 
  Zap, 
  Share2
} from 'lucide-react';
import { SwipeableBottomSheet } from '../Common/SwipeableBottomSheet';

export interface BracketMatch {
  id: string;
  round: 'Quarterfinal' | 'Semifinal' | 'Championship Final';
  court: string;
  time: string;
  team1: { name: string; score: number; seed: number; logo?: string };
  team2: { name: string; score: number; seed: number; logo?: string };
  status: 'LIVE' | 'FINAL' | 'UPCOMING';
  period?: string;
  winnerId?: 'team1' | 'team2';
  stats?: {
    topScorer: string;
    possession: string;
    fouls: { team1: number; team2: number };
  };
}

export const EventsAndBracketsView: React.FC<{ onNavigateTab: (tab: any) => void }> = ({ onNavigateTab }) => {
  const [selectedDivision, setSelectedDivision] = useState<string>('17u_boys');
  const [selectedCourt, setSelectedCourt] = useState<string>('all');
  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null);

  // Divisions & Tournament Meta
  const divisions = [
    { id: '17u_boys', label: '17U Boys EYBL' },
    { id: 'girls_flag', label: "Girls' Flag Football Varsity" },
    { id: '16u_boys', label: '16U Showcase' },
    { id: 'lax_elite', label: 'Lax Elite Tri-State' },
  ];

  // Courts Matrix
  const courts = [
    { id: 'all', label: 'All Courts' },
    { id: 'court_1', label: 'Court 1 (Main Arena)' },
    { id: 'court_2', label: 'Court 2 (Hoop Group)' },
    { id: 'court_3', label: 'Court 3 (Auxiliary)' },
  ];

  // Zorts-Style Bracket Data Structure
  const bracketMatches: BracketMatch[] = [
    {
      id: 'q1',
      round: 'Quarterfinal',
      court: 'Court 1',
      time: '10:00 AM',
      team1: { name: 'NJ Scholars 17U', score: 72, seed: 1 },
      team2: { name: 'Gauchos Prep', score: 65, seed: 8 },
      status: 'FINAL',
      winnerId: 'team1',
      stats: { topScorer: 'Jayden Carter (28 PTS)', possession: 'Game Ended', fouls: { team1: 12, team2: 15 } }
    },
    {
      id: 'q2',
      round: 'Quarterfinal',
      court: 'Court 2',
      time: '10:00 AM',
      team1: { name: 'PSA Cardinals', score: 68, seed: 4 },
      team2: { name: 'Riverside Church', score: 61, seed: 5 },
      status: 'FINAL',
      winnerId: 'team1',
      stats: { topScorer: 'Marcus Vance (22 PTS)', possession: 'Game Ended', fouls: { team1: 9, team2: 14 } }
    },
    {
      id: 'sem1',
      round: 'Semifinal',
      court: 'Court 1',
      time: '1:30 PM',
      team1: { name: 'NJ Scholars 17U', score: 78, seed: 1 },
      team2: { name: 'PSA Cardinals', score: 74, seed: 4 },
      status: 'FINAL',
      winnerId: 'team1',
      stats: { topScorer: 'Jayden Carter (31 PTS)', possession: 'Game Ended (OT)', fouls: { team1: 18, team2: 19 } }
    },
    {
      id: 'final',
      round: 'Championship Final',
      court: 'Court 1 (Main Arena)',
      time: '4:00 PM',
      team1: { name: 'NJ Scholars 17U', score: 82, seed: 1 },
      team2: { name: 'Gotham Elites', score: 79, seed: 2 },
      status: 'LIVE',
      period: '4th Qtr 0:42',
      stats: { topScorer: 'Maya Sanchez (34 PASS TD)', possession: 'NJ Scholars • Ball in Play', fouls: { team1: 14, team2: 11 } }
    }
  ];

  return (
    <div className="min-h-screen bg-[#212A31] text-white font-sans space-y-6 pb-32">
      
      {/* TOURNAMENT VENUE HEADER */}
      <section className="bg-[#212A31]/90 border-b border-slate-800 p-4 sm:p-6 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="bg-[#E5B868]/20 text-[#E2E8F0] border border-[#E5B868]/40 text-[10px] font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_10px_rgba(0,87,184,0.3)]">
              <Trophy className="w-3.5 h-3.5 text-[#E2E8F0]" /> 2026 TRI-STATE CHAMPIONSHIP
            </span>
            <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#E5B868]" /> Hoop Group Metro Arena • NJ
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black italic uppercase tracking-wide text-white">
            Live Bracket Tree & Match Center
          </h1>

          {/* Division Selector Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pt-2">
            {divisions.map((div) => (
              <button
                key={div.id}
                onClick={() => setSelectedDivision(div.id)}
                className={`min-h-[44px] min-w-[44px] px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase whitespace-nowrap transition-all cursor-pointer flex items-center justify-center border ${
                  selectedDivision === div.id
                    ? 'bg-[#F59E0B] text-slate-950 font-black border-[#F59E0B] shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                    : 'bg-[#212A31] text-slate-400 hover:text-white border-slate-800 hover:border-slate-700'
                }`}
              >
                {div.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 space-y-8">

        {/* ==========================================
            SECTION 1: ZORTS-STYLE BRACKET TREE (HORIZONTALLY SCROLLABLE)
            ========================================== */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#E5B868]" />
              <span>Championship Tree Progression</span>
            </h2>
            <span className="text-[10px] font-mono text-slate-500">Swipe horizontally to view full tree &rarr;</span>
          </div>

          {/* Bracket Canvas Container */}
          <div className="overflow-x-auto scrollbar-none py-4 bg-[#212A31]/60 rounded-3xl border border-slate-800/80 p-4">
            <div className="flex items-center gap-8 min-w-[750px]">
              
              {/* ROUND 1: QUARTERFINALS */}
              <div className="flex-1 space-y-6">
                <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest text-center border-b border-slate-800/60 pb-2">
                  Quarterfinals
                </div>
                {bracketMatches.filter(m => m.round === 'Quarterfinal').map((match) => (
                  <BracketNodeCard key={match.id} match={match} onClick={() => setSelectedMatch(match)} />
                ))}
              </div>

              {/* CONNECTING CONNECTOR LINE */}
              <div className="w-4 h-px bg-slate-800 shrink-0" />

              {/* ROUND 2: SEMIFINALS */}
              <div className="flex-1 space-y-6">
                <div className="text-[10px] font-mono font-bold text-[#E2E8F0] uppercase tracking-widest text-center border-b border-slate-800/60 pb-2">
                  Semifinals
                </div>
                {bracketMatches.filter(m => m.round === 'Semifinal').map((match) => (
                  <BracketNodeCard key={match.id} match={match} onClick={() => setSelectedMatch(match)} />
                ))}
              </div>

              {/* CONNECTING CONNECTOR LINE */}
              <div className="w-4 h-px bg-[#E5B868]/40 shrink-0" />

              {/* ROUND 3: CHAMPIONSHIP FINAL */}
              <div className="flex-1 space-y-6">
                <div className="text-[10px] font-mono font-bold text-[#E5B868] uppercase tracking-widest text-center border-b border-slate-800/60 pb-2 flex items-center justify-center gap-1">
                  <Trophy className="w-3 h-3 text-[#E5B868]" />
                  <span>Championship</span>
                </div>
                {bracketMatches.filter(m => m.round === 'Championship Final').map((match) => (
                  <BracketNodeCard key={match.id} match={match} isFinal onClick={() => setSelectedMatch(match)} />
                ))}
              </div>

            </div>
          </div>
        </section>

        {/* ==========================================
            SECTION 2: REAL-TIME COURT SCHEDULE MATRIX
            ========================================== */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#E2E8F0]" />
              <span>Court Timetable & Venue Schedule</span>
            </h2>

            {/* Court Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
              {courts.map((court) => (
                <button
                  key={court.id}
                  onClick={() => setSelectedCourt(court.id)}
                  className={`min-h-[44px] min-w-[44px] px-4 py-2.5 rounded-full text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center border ${
                    selectedCourt === court.id
                      ? 'bg-[#F59E0B] text-slate-950 font-black border-[#F59E0B] shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                      : 'bg-[#212A31] text-slate-400 hover:text-white border-slate-800'
                  }`}
                >
                  {court.label}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bracketMatches.map((match) => (
              <div
                key={match.id}
                onClick={() => setSelectedMatch(match)}
                className="bg-[#212A31]/90 border border-slate-800 hover:border-[#E2E8F0]/60 rounded-2xl p-4 transition-all cursor-pointer flex justify-between items-center group shadow-lg"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-mono text-[10px]">
                    <span className="text-[#E2E8F0] font-bold bg-[#E5B868]/20 px-2 py-0.5 rounded border border-[#E5B868]/30">
                      {match.court}
                    </span>
                    <span className="text-slate-400">{match.time}</span>
                  </div>

                  <div>
                    <div className="text-sm font-bold text-white flex items-center justify-between gap-4">
                      <span className={match.winnerId === 'team1' ? 'text-[#E5B868]' : 'text-slate-200'}>
                        {match.team1.name}
                      </span>
                      <span className="font-mono">{match.team1.score}</span>
                    </div>
                    <div className="text-sm font-bold text-white flex items-center justify-between gap-4">
                      <span className={match.winnerId === 'team2' ? 'text-[#E5B868]' : 'text-slate-300'}>
                        {match.team2.name}
                      </span>
                      <span className="font-mono">{match.team2.score}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  {match.status === 'LIVE' ? (
                    <span className="text-[10px] font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-1 rounded-md animate-pulse">
                      LIVE • {match.period}
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-bold bg-slate-800 text-slate-400 px-2 py-1 rounded-md">
                      {match.status}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-[#E2E8F0] group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* ==========================================
          LEVEL 2: MATCH BOX SCORE & STREAM BOTTOM SHEET
          ========================================== */}
      <SwipeableBottomSheet
        isOpen={!!selectedMatch}
        onClose={() => setSelectedMatch(null)}
        title={selectedMatch ? `${selectedMatch.round} • ${selectedMatch.court}` : 'Match Details'}
      >
        {selectedMatch && (
          <div className="space-y-5 font-mono">
            
            {/* Status Header */}
            <div className="flex items-center justify-between bg-[#212A31] p-3 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-400">{selectedMatch.time}</span>
              {selectedMatch.status === 'LIVE' ? (
                <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-0.5 rounded-full font-bold animate-pulse">
                  LIVE • {selectedMatch.period}
                </span>
              ) : (
                <span className="text-xs text-slate-400 font-bold">{selectedMatch.status}</span>
              )}
            </div>

            {/* Teams & Scoreboard Big Box */}
            <div className="bg-[#212A31] p-5 rounded-3xl border border-slate-800 space-y-4">
              {/* Team 1 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 font-bold">#{selectedMatch.team1.seed}</span>
                  <h3 className={`text-base font-black ${selectedMatch.winnerId === 'team1' ? 'text-[#E5B868]' : 'text-white'}`}>
                    {selectedMatch.team1.name}
                  </h3>
                </div>
                <span className="text-2xl font-black text-white">{selectedMatch.team1.score}</span>
              </div>

              <div className="h-px bg-slate-800/80" />

              {/* Team 2 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 font-bold">#{selectedMatch.team2.seed}</span>
                  <h3 className={`text-base font-black ${selectedMatch.winnerId === 'team2' ? 'text-[#E5B868]' : 'text-white'}`}>
                    {selectedMatch.team2.name}
                  </h3>
                </div>
                <span className="text-2xl font-black text-white">{selectedMatch.team2.score}</span>
              </div>
            </div>

            {/* Box Score Key Telemetry */}
            {selectedMatch.stats && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#212A31] p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">TOP PERFORMER</span>
                  <span className="text-xs font-bold text-[#E2E8F0]">{selectedMatch.stats.topScorer}</span>
                </div>
                <div className="bg-[#212A31] p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">POSSESSION STATUS</span>
                  <span className="text-xs font-bold text-[#E5B868]">{selectedMatch.stats.possession}</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button 
                onClick={() => {
                  setSelectedMatch(null);
                  onNavigateTab('social');
                }}
                className="flex-1 bg-[#E5B868] hover:bg-[#F59E0B] text-black font-black py-3 rounded-2xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(229,184,104,0.3)]"
              >
                Watch Stream Highlight
              </button>
              <button className="p-3 bg-[#212A31] border border-slate-800 hover:border-slate-700 rounded-2xl text-slate-300 hover:text-white transition-all cursor-pointer">
                <Share2 className="w-4 h-4" />
              </button>
            </div>

          </div>
        )}
      </SwipeableBottomSheet>

    </div>
  );
};

// Sub-Component: Single Bracket Node Card
const BracketNodeCard: React.FC<{ match: BracketMatch; isFinal?: boolean; onClick: () => void }> = ({ match, isFinal, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full min-h-[44px] bg-[#212A31]/90 border rounded-2xl p-3.5 space-y-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg text-left focus:outline-none focus:ring-2 focus:ring-[#F59E0B] ${
        isFinal 
          ? 'border-[#F59E0B] shadow-[0_0_15px_rgba(245,158,11,0.25)]' 
          : 'border-slate-800 hover:border-[#F59E0B]/60'
      }`}
    >
      <div className="flex items-center justify-between text-[10px] font-mono">
        <span className="text-slate-400 font-bold">{match.court}</span>
        {match.status === 'LIVE' ? (
          <span className="text-rose-400 font-black animate-pulse">🔴 LIVE</span>
        ) : (
          <span className="text-slate-400 font-bold">{match.status}</span>
        )}
      </div>

      <div className="space-y-1.5 font-mono text-xs">
        <div className="flex justify-between items-center">
          <span className={`font-bold ${match.winnerId === 'team1' ? 'text-[#F59E0B]' : 'text-slate-300'}`}>
            <span className="text-[10px] text-slate-500 mr-1">#{match.team1.seed}</span>
            {match.team1.name}
          </span>
          <span className="font-black text-white">{match.team1.score}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className={`font-bold ${match.winnerId === 'team2' ? 'text-[#F59E0B]' : 'text-slate-300'}`}>
            <span className="text-[10px] text-slate-500 mr-1">#{match.team2.seed}</span>
            {match.team2.name}
          </span>
          <span className="font-black text-white">{match.team2.score}</span>
        </div>
      </div>
    </button>
  );
};
