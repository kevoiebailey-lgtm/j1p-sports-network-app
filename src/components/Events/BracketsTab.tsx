import React, { useState } from 'react';
import { Tournament, TournamentMatch } from '../../types';
import { BentoCard } from '../BentoCard';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Clock, 
  MapPin, 
  Edit3, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  Crown,
  ChevronRight,
  Zap,
  Lock
} from 'lucide-react';

interface BracketsTabProps {
  tournaments: Tournament[];
  selectedTournamentId: string;
  onSelectTournamentId: (id: string) => void;
  matches: TournamentMatch[];
  onUpdateMatchScore: (matchId: string, homeScore: number, awayScore: number, winnerTeam: string) => void;
  canManage: boolean;
}

export const BracketsTab: React.FC<BracketsTabProps> = ({
  tournaments,
  selectedTournamentId,
  onSelectTournamentId,
  matches,
  onUpdateMatchScore,
  canManage
}) => {
  const [activeMatchForScore, setActiveMatchForScore] = useState<TournamentMatch | null>(null);
  const [homeScoreInput, setHomeScoreInput] = useState<number>(0);
  const [awayScoreInput, setAwayScoreInput] = useState<number>(0);

  const currentTournament = tournaments.find(t => t.id === selectedTournamentId) || tournaments[0];
  const tournamentMatches = matches.filter(m => m.tournamentId === (currentTournament?.id || 'tourn-301'));

  // Separate matches by round
  const round1 = tournamentMatches.filter(m => m.round === 1);
  const round2 = tournamentMatches.filter(m => m.round === 2);
  const round3 = tournamentMatches.filter(m => m.round === 3);

  const handleOpenScoreModal = (match: TournamentMatch) => {
    if (!canManage) return;
    setActiveMatchForScore(match);
    setHomeScoreInput(match.homeScore || 0);
    setAwayScoreInput(match.awayScore || 0);
  };

  const handleSaveScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMatchForScore) return;

    let winner = '';
    if (homeScoreInput > awayScoreInput) {
      winner = activeMatchForScore.homeTeam;
    } else if (awayScoreInput > homeScoreInput) {
      winner = activeMatchForScore.awayTeam;
    } else {
      winner = activeMatchForScore.homeTeam; // Tie-breaker default
    }

    onUpdateMatchScore(activeMatchForScore.id, homeScoreInput, awayScoreInput, winner);
    setActiveMatchForScore(null);
  };

  // Find championship winner if finals completed
  const championshipMatch = round3[0];
  const championTeam = championshipMatch && championshipMatch.status === 'Completed' ? championshipMatch.winner : null;

  return (
    <div className="space-y-6">
      {/* Tournament Selector Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/5 p-4 sm:p-6 rounded-3xl border border-white/10">
        <div>
          <span className="text-[10px] font-black uppercase text-[#E5B868] tracking-widest block mb-1">
            ACTIVE VISUAL BRACKET ENGINE
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white uppercase italic">
            {currentTournament?.name || 'Tournament Bracket'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Format: {currentTournament?.format || 'Single Elimination'} • {currentTournament?.participatingTeams?.length || 8} Teams
          </p>
        </div>

        {/* Dropdown to switch tournament */}
        <div className="shrink-0 min-w-[240px]">
          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Switch Tournament</label>
          <select
            value={currentTournament?.id}
            onChange={(e) => onSelectTournamentId(e.target.value)}
            className="w-full bg-[#000000] border border-[#F59E0B]/40 rounded-xl px-4 py-3 min-h-[44px] text-xs text-white font-bold focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B] cursor-pointer"
          >
            {tournaments.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.sport})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Champion Banner if complete */}
      {championTeam && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-3xl bg-gradient-to-r from-[#E5B868]/20 via-emerald-900/40 to-[#E5B868]/20 border-2 border-[#E5B868] shadow-[0_0_30px_rgba(0,242,254,0.4)] text-center relative overflow-hidden"
        >
          <Crown className="w-10 h-10 text-amber-400 mx-auto mb-2 animate-bounce" />
          <span className="text-xs font-black uppercase tracking-widest text-[#E5B868]">TOURNAMENT CHAMPION DECLARED</span>
          <h3 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight mt-1">
            🏆 {championTeam} 🏆
          </h3>
          <p className="text-xs text-slate-300 mt-1">
            Congratulations to {championTeam} for winning the {currentTournament?.name}!
          </p>
        </motion.div>
      )}

      {/* VISUAL BRACKET MATRIX (CSS TREE / CONNECTOR COLUMNS) */}
      <div className="relative overflow-x-auto pb-6">
        <div className="min-w-[900px] grid grid-cols-3 gap-6 p-2">
          
          {/* ROUND 1: QUARTERFINALS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-4">
              <span className="text-xs font-black uppercase text-[#E5B868] flex items-center gap-1.5 font-mono">
                <span className="w-2 h-2 rounded-full bg-[#E5B868]" />
                ROUND 1: QUARTERFINALS
              </span>
              <span className="text-[10px] text-slate-400 font-mono">4 Matchups</span>
            </div>

            <div className="space-y-6">
              {round1.map((m) => {
                const isCompleted = m.status === 'Completed';
                const isLive = m.status === 'Live';
                return (
                  <div key={m.id} className="relative group">
                    <div 
                      onClick={() => handleOpenScoreModal(m)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative z-10 ${
                        isLive 
                          ? 'bg-[#E5B868]/10 border-[#E5B868] shadow-[0_0_20px_rgba(0,242,254,0.3)]'
                          : isCompleted 
                          ? 'bg-white/5 border-white/15 hover:border-white/40'
                          : 'bg-[#212A31] border-white/10 hover:border-[#E5B868]/50'
                      }`}
                    >
                      {/* Match Header info */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2 font-mono">
                        <span className="text-[#E5B868] font-bold">MATCH #{m.matchNumber}</span>
                        <span className="truncate max-w-[120px]">{m.subLocation || 'Court A'}</span>
                      </div>

                      {/* Home Team */}
                      <div className={`flex items-center justify-between p-2 rounded-xl mb-1.5 ${
                        m.winner === m.homeTeam ? 'bg-[#E5B868]/20 border border-[#E5B868]/40 text-white font-black' : 'bg-white/5 text-slate-300'
                      }`}>
                        <div className="flex items-center gap-2 truncate">
                          {m.winner === m.homeTeam && <Crown className="w-3.5 h-3.5 text-[#E5B868] shrink-0" />}
                          <span className="text-xs truncate">{m.homeTeam}</span>
                        </div>
                        <span className="text-sm font-mono font-bold text-white ml-2">{m.homeScore ?? '-'}</span>
                      </div>

                      {/* Away Team */}
                      <div className={`flex items-center justify-between p-2 rounded-xl ${
                        m.winner === m.awayTeam ? 'bg-[#E5B868]/20 border border-[#E5B868]/40 text-white font-black' : 'bg-white/5 text-slate-300'
                      }`}>
                        <div className="flex items-center gap-2 truncate">
                          {m.winner === m.awayTeam && <Crown className="w-3.5 h-3.5 text-[#E5B868] shrink-0" />}
                          <span className="text-xs truncate">{m.awayTeam}</span>
                        </div>
                        <span className="text-sm font-mono font-bold text-white ml-2">{m.awayScore ?? '-'}</span>
                      </div>

                      {/* Status footer */}
                      <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
                        <span>{m.scheduledTime || '09:00 AM'}</span>
                        {canManage ? (
                          <span className="text-[#E5B868] font-bold flex items-center gap-1 group-hover:underline">
                            <Edit3 className="w-3 h-3" /> Update Score
                          </span>
                        ) : (
                          <span className="text-slate-500">{m.status}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ROUND 2: SEMIFINALS */}
          <div className="space-y-4 pt-12">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-4">
              <span className="text-xs font-black uppercase text-[#E5B868] flex items-center gap-1.5 font-mono">
                <span className="w-2 h-2 rounded-full bg-slate-600" />
                ROUND 2: SEMIFINALS
              </span>
              <span className="text-[10px] text-slate-400 font-mono">2 Matchups</span>
            </div>

            <div className="space-y-16">
              {round2.map((m) => {
                const isCompleted = m.status === 'Completed';
                const isLive = m.status === 'Live';
                return (
                  <div key={m.id} className="relative">
                    <div 
                      onClick={() => handleOpenScoreModal(m)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        isLive 
                          ? 'bg-[#E5B868]/10 border-[#E5B868] shadow-[0_0_20px_rgba(0,242,254,0.3)]'
                          : isCompleted 
                          ? 'bg-white/5 border-white/15'
                          : 'bg-[#212A31] border-white/10 hover:border-[#E5B868]/50'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2 font-mono">
                        <span className="text-[#E5B868] font-bold">SEMI-FINAL #{m.matchNumber}</span>
                        <span>{m.subLocation || 'Court A'}</span>
                      </div>

                      {/* Home Team */}
                      <div className={`flex items-center justify-between p-2.5 rounded-xl mb-2 ${
                        m.winner === m.homeTeam ? 'bg-[#E5B868]/20 border border-[#E5B868]/40 text-white font-black' : 'bg-white/5 text-slate-300'
                      }`}>
                        <div className="flex items-center gap-2 truncate">
                          {m.winner === m.homeTeam && <Crown className="w-3.5 h-3.5 text-[#E5B868] shrink-0" />}
                          <span className="text-xs font-bold truncate">{m.homeTeam}</span>
                        </div>
                        <span className="text-base font-mono font-bold text-white ml-2">{m.homeScore ?? '-'}</span>
                      </div>

                      {/* Away Team */}
                      <div className={`flex items-center justify-between p-2.5 rounded-xl ${
                        m.winner === m.awayTeam ? 'bg-[#E5B868]/20 border border-[#E5B868]/40 text-white font-black' : 'bg-white/5 text-slate-300'
                      }`}>
                        <div className="flex items-center gap-2 truncate">
                          {m.winner === m.awayTeam && <Crown className="w-3.5 h-3.5 text-[#E5B868] shrink-0" />}
                          <span className="text-xs font-bold truncate">{m.awayTeam}</span>
                        </div>
                        <span className="text-base font-mono font-bold text-white ml-2">{m.awayScore ?? '-'}</span>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
                        <span>{m.scheduledTime || '02:00 PM'}</span>
                        {canManage && (
                          <span className="text-[#E5B868] font-bold flex items-center gap-1">
                            <Edit3 className="w-3 h-3" /> Update Score
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ROUND 3: CHAMPIONSHIP FINALS */}
          <div className="space-y-4 pt-28">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-4">
              <span className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5 font-mono">
                <Trophy className="w-4 h-4 text-amber-400" />
                ROUND 3: CHAMPIONSHIP FINAL
              </span>
              <span className="text-[10px] text-slate-400 font-mono">1 Matchup</span>
            </div>

            {round3.map((m) => {
              const isCompleted = m.status === 'Completed';
              return (
                <div key={m.id} className="relative">
                  <div 
                    onClick={() => handleOpenScoreModal(m)}
                    className="p-5 rounded-3xl border-2 border-amber-400/50 bg-gradient-to-b from-[#212A31] to-black shadow-[0_0_25px_rgba(245,158,11,0.2)] cursor-pointer hover:border-amber-400 transition-all"
                  >
                    <div className="flex items-center justify-between text-[10px] text-amber-400 font-mono mb-2">
                      <span className="font-black uppercase tracking-wider">GOLD MEDAL MATCH</span>
                      <span>{m.subLocation || 'Court A (Main)'}</span>
                    </div>

                    {/* Home Team */}
                    <div className={`flex items-center justify-between p-3 rounded-xl mb-2 ${
                      m.winner === m.homeTeam ? 'bg-amber-400/20 border border-amber-400 text-white font-black' : 'bg-white/5 text-slate-300'
                    }`}>
                      <div className="flex items-center gap-2 truncate">
                        {m.winner === m.homeTeam && <Crown className="w-4 h-4 text-amber-400 shrink-0" />}
                        <span className="text-sm font-bold truncate">{m.homeTeam}</span>
                      </div>
                      <span className="text-lg font-mono font-bold text-white ml-2">{m.homeScore ?? '-'}</span>
                    </div>

                    {/* Away Team */}
                    <div className={`flex items-center justify-between p-3 rounded-xl ${
                      m.winner === m.awayTeam ? 'bg-amber-400/20 border border-amber-400 text-white font-black' : 'bg-white/5 text-slate-300'
                    }`}>
                      <div className="flex items-center gap-2 truncate">
                        {m.winner === m.awayTeam && <Crown className="w-4 h-4 text-amber-400 shrink-0" />}
                        <span className="text-sm font-bold truncate">{m.awayTeam}</span>
                      </div>
                      <span className="text-lg font-mono font-bold text-white ml-2">{m.awayScore ?? '-'}</span>
                    </div>

                    <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{m.scheduledTime || '06:00 PM'}</span>
                      {canManage && (
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <Edit3 className="w-3 h-3" /> Input Final Winner
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* SCORE EDIT MODAL FOR ORGANIZERS */}
      <AnimatePresence>
        {activeMatchForScore && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#212A31]/80 backdrop-blur-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-[#000000] border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl text-white space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-black uppercase text-[#E5B868] flex items-center gap-1.5">
                  <Zap className="w-4 h-4" />
                  MATCH SCORE & WINNER ADVANCEMENT
                </span>
                <button
                  onClick={() => setActiveMatchForScore(null)}
                  className="p-1 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="text-center py-2">
                <span className="text-[10px] text-slate-400 font-mono uppercase block">MATCH #{activeMatchForScore.matchNumber} • ROUND {activeMatchForScore.round}</span>
                <h3 className="text-base font-bold text-white mt-1">
                  {activeMatchForScore.homeTeam} vs {activeMatchForScore.awayTeam}
                </h3>
              </div>

              <form onSubmit={handleSaveScore} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-3 rounded-2xl border border-white/10 text-center">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1 truncate">
                      {activeMatchForScore.homeTeam}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={homeScoreInput}
                      onChange={(e) => setHomeScoreInput(parseInt(e.target.value) || 0)}
                      className="w-full text-center bg-[#212A31] border border-[#E5B868]/50 rounded-xl py-2 text-2xl font-mono font-black text-white focus:outline-none focus:border-[#E5B868]"
                    />
                  </div>

                  <div className="bg-white/5 p-3 rounded-2xl border border-white/10 text-center">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1 truncate">
                      {activeMatchForScore.awayTeam}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={awayScoreInput}
                      onChange={(e) => setAwayScoreInput(parseInt(e.target.value) || 0)}
                      className="w-full text-center bg-[#212A31] border border-blue-400/50 rounded-xl py-2 text-2xl font-mono font-black text-white focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 text-center italic">
                  Saving score will complete this match and automatically advance the winning team to the next round in the bracket tree!
                </p>

                <button
                  type="submit"
                  className="w-full min-h-[44px] px-4 py-3 bg-[#F59E0B] hover:bg-[#d98700] text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.4)] active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>CONFIRM FINAL SCORE & ADVANCE WINNER</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
