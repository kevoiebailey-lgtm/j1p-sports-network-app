import React, { useState } from 'react';
import { TournamentMatch, Venue } from '../../types';
import { BentoCard } from '../BentoCard';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Search, 
  Filter, 
  Trophy, 
  Radio, 
  CheckCircle2, 
  ArrowRight,
  Edit3,
  Save,
  X,
  Sparkles,
  Plus,
  Trash2,
  Check
} from 'lucide-react';
import { UniversalScheduleImporterModal } from '../UniversalScheduleImporterModal';
import { ParsedGame } from '../../types';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface ScheduleTabProps {
  matches: TournamentMatch[];
  venues: Venue[];
  onSelectMatch?: (match: TournamentMatch) => void;
  onUpdateMatch?: (updatedMatch: TournamentMatch) => void;
  onAddMatches?: (newMatches: TournamentMatch[]) => void;
  onDeleteMatch?: (matchId: string) => void;
  canManage?: boolean;
}

export const ScheduleTab: React.FC<ScheduleTabProps> = ({
  matches,
  venues,
  onSelectMatch,
  onUpdateMatch,
  onAddMatches,
  onDeleteMatch,
  canManage = true
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingMatch, setEditingMatch] = useState<TournamentMatch | null>(null);
  const [showAiImporterModal, setShowAiImporterModal] = useState<boolean>(false);
  const [showAddGameModal, setShowAddGameModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form state for editing match
  const [scheduledTime, setScheduledTime] = useState('');
  const [venueName, setVenueName] = useState('');
  const [subLocation, setSubLocation] = useState('');
  const [homeScore, setHomeScore] = useState<number>(0);
  const [awayScore, setAwayScore] = useState<number>(0);
  const [status, setStatus] = useState<'Scheduled' | 'Live' | 'Completed'>('Scheduled');
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');

  // Form state for creating new match manually
  const [newHomeTeam, setNewHomeTeam] = useState('');
  const [newAwayTeam, setNewAwayTeam] = useState('');
  const [newDate, setNewDate] = useState('2026-08-22');
  const [newTime, setNewTime] = useState('06:00 PM');
  const [newVenue, setNewVenue] = useState(venues[0]?.facilityName || 'MetLife Arena');
  const [newCourt, setNewCourt] = useState('Court A (Main)');
  const [newRound, setNewRound] = useState('1');
  const [newStatus, setNewStatus] = useState<'Scheduled' | 'Live' | 'Completed'>('Scheduled');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenEdit = (m: TournamentMatch) => {
    setEditingMatch(m);
    setScheduledTime(m.scheduledTime || '');
    setVenueName(m.venueName || (venues[0]?.facilityName || 'MetLife Arena'));
    setSubLocation(m.subLocation || 'Court A');
    setHomeScore(m.homeScore ?? 0);
    setAwayScore(m.awayScore ?? 0);
    setStatus(m.status || 'Scheduled');
    setHomeTeam(m.homeTeam);
    setAwayTeam(m.awayTeam);
  };

  const handleSaveMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMatch) return;

    let winner = editingMatch.winner;
    if (status === 'Completed') {
      if (homeScore > awayScore) winner = homeTeam;
      else if (awayScore > homeScore) winner = awayTeam;
    }

    const updated: TournamentMatch = {
      ...editingMatch,
      scheduledTime,
      venueName,
      subLocation,
      homeScore,
      awayScore,
      status,
      homeTeam,
      awayTeam,
      winner
    };

    if (onUpdateMatch) {
      onUpdateMatch(updated);
    }

    if (db) {
      try {
        await setDoc(doc(db, 'tournamentMatches', updated.id), updated, { merge: true });
        await setDoc(doc(db, 'games', updated.id), {
          ...updated,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn('Firestore update match error:', err);
      }
    }

    showToast('Match schedule updated successfully!');
    setEditingMatch(null);
  };

  const handleCreateManualGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHomeTeam.trim() || !newAwayTeam.trim()) {
      showToast('Please enter both Home and Away team names.');
      return;
    }

    const newMatchId = `match-sched-${Date.now()}`;
    const newMatch: TournamentMatch = {
      id: newMatchId,
      tournamentId: 'tourn-scheduled',
      round: Number(newRound) || 1,
      matchNumber: matches.length + 1,
      homeTeam: newHomeTeam.trim(),
      awayTeam: newAwayTeam.trim(),
      scheduledTime: `${newDate} • ${newTime}`,
      venueName: newVenue.trim() || 'Main Stadium Arena',
      subLocation: newCourt.trim() || 'Court 1',
      status: newStatus,
      homeScore: 0,
      awayScore: 0,
      sport: 'Flag Football'
    };

    if (onAddMatches) {
      onAddMatches([newMatch]);
    } else if (onUpdateMatch) {
      onUpdateMatch(newMatch);
    }

    if (db) {
      try {
        await setDoc(doc(db, 'tournamentMatches', newMatchId), newMatch);
        await setDoc(doc(db, 'games', newMatchId), {
          ...newMatch,
          date: newDate,
          time: newTime,
          location: newVenue,
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Firestore save game error:', err);
      }
    }

    // Save to local storage cache
    try {
      const cached = localStorage.getItem('just1play_matches_cache');
      const list = cached ? JSON.parse(cached) : [];
      localStorage.setItem('just1play_matches_cache', JSON.stringify([newMatch, ...list]));
    } catch (e) {}

    showToast(`Game added: ${newMatch.homeTeam} vs ${newMatch.awayTeam}`);
    setShowAddGameModal(false);
    setNewHomeTeam('');
    setNewAwayTeam('');
  };

  const handleDeleteScheduleMatch = async (matchId: string) => {
    if (onDeleteMatch) {
      onDeleteMatch(matchId);
    }
    if (db) {
      try {
        await deleteDoc(doc(db, 'tournamentMatches', matchId));
        await deleteDoc(doc(db, 'games', matchId));
      } catch (err) {
        console.warn('Firestore delete match error:', err);
      }
    }
    showToast('Match removed from schedule.');
  };

  const handleAiGamesImported = (parsedGames: ParsedGame[]) => {
    if (!parsedGames || !parsedGames.length) return;

    const newMatches: TournamentMatch[] = parsedGames.map((g, idx) => ({
      id: `gm-ai-${Date.now()}-${idx}`,
      tournamentId: 'tourn-ai-schedule',
      round: 1,
      matchNumber: matches.length + idx + 1,
      homeTeam: g.isHome ? 'Tournament Team' : g.opponent,
      awayTeam: g.isHome ? g.opponent : 'Tournament Team',
      scheduledTime: `${g.date} • ${g.time}`,
      venueName: g.location || 'Stadium Complex',
      subLocation: g.isHome ? 'Home Field' : 'Away Field',
      status: 'Scheduled',
      homeScore: 0,
      awayScore: 0,
      sport: 'Flag Football'
    }));

    if (onAddMatches) {
      onAddMatches(newMatches);
    }

    showToast(`Successfully scheduled ${newMatches.length} games from AI Importer!`);
  };

  const filteredMatches = matches.filter((m) => {
    if (statusFilter !== 'All' && m.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = `${m.homeTeam} ${m.awayTeam} ${m.venueName} ${m.subLocation}`.toLowerCase();
      if (!matchText.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 py-3 px-5 rounded-2xl bg-[#FF6A00] text-black font-black text-xs uppercase tracking-wider shadow-2xl flex items-center gap-2 border border-white/20 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Search & Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search teams, courts, or venue locations..."
            className="w-full pl-10 pr-4 py-2 bg-[#222220] border border-white/15 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF6A00]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {canManage && (
            <button
              type="button"
              onClick={() => setShowAddGameModal(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap bg-[#FF6A00] hover:bg-[#ff7b1a] text-black flex items-center gap-1.5 shadow-lg shadow-[#FF6A00]/20 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-black stroke-[3]" />
              <span>+ Add Game</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowAiImporterModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white flex items-center gap-1.5 shadow-lg shadow-blue-500/20 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>AI Importer</span>
          </button>

          {['All', 'Live', 'Scheduled', 'Completed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${
                statusFilter === st
                  ? 'bg-[#FF6A00] text-black border-[#FF6A00] shadow-[0_0_15px_rgba(255,106,0,0.4)]'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
              }`}
            >
              {st === 'All' ? 'ALL MATCHES' : st.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Chronological Match Feed */}
      <div className="space-y-3">
        {filteredMatches.length > 0 ? (
          filteredMatches.map((m) => {
            const isLive = m.status === 'Live';
            const isCompleted = m.status === 'Completed';

            return (
              <div
                key={m.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isLive
                    ? 'bg-[#FF6A00]/10 border-[#FF6A00] shadow-[0_0_20px_rgba(255,106,0,0.2)]'
                    : isCompleted
                    ? 'bg-white/5 border-white/10'
                    : 'bg-[#222220] border-white/10 hover:border-white/30'
                }`}
              >
                {/* Match Details & Venue Info */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded ${
                      isLive ? 'bg-[#FF6A00] text-black animate-pulse' : 'bg-white/10 text-slate-300'
                    }`}>
                      {isLive ? '🔴 LIVE NOW' : m.status}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Round {m.round} • Match #{m.matchNumber}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-[#FF6A00] shrink-0" />
                    <span className="font-bold text-white">{m.venueName || 'MetLife Arena'}</span>
                    <span className="text-[#FF6A00] bg-[#FF6A00]/10 px-2 py-0.5 rounded font-mono text-[10px]">
                      {m.subLocation || 'Court A'}
                    </span>
                  </div>
                </div>

                {/* Score & Matchup Display */}
                <div className="flex items-center justify-center gap-4 bg-white/5 px-6 py-3 rounded-2xl border border-white/10 shrink-0">
                  <div className="text-right">
                    <span className={`text-sm font-black uppercase ${m.winner === m.homeTeam ? 'text-[#FF6A00]' : 'text-white'}`}>
                      {m.homeTeam}
                    </span>
                  </div>

                  <div className="text-center font-mono px-3 py-1 bg-black rounded-xl border border-white/15">
                    <span className="text-base font-black text-white">
                      {m.homeScore ?? 0} - {m.awayScore ?? 0}
                    </span>
                  </div>

                  <div className="text-left">
                    <span className={`text-sm font-black uppercase ${m.winner === m.awayTeam ? 'text-[#FF6A00]' : 'text-white'}`}>
                      {m.awayTeam}
                    </span>
                  </div>
                </div>

                {/* Match Time & Edit Action */}
                <div className="flex items-center gap-3 justify-between md:justify-end shrink-0">
                  <div className="text-right text-xs font-mono text-slate-400">
                    <div className="flex items-center gap-1.5 justify-end text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-[#FF6A00]" />
                      <span>{m.scheduledTime || 'TBD'}</span>
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(m)}
                        className="px-3 py-1.5 bg-[#FF6A00]/10 hover:bg-[#FF6A00] text-[#FF6A00] hover:text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all border border-[#FF6A00]/30 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>EDIT</span>
                      </button>
                      <button
                        onClick={() => handleDeleteScheduleMatch(m.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                        title="Delete Match"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center rounded-3xl bg-white/5 border border-white/10">
            <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white uppercase tracking-wider">
              NO SCHEDULED MATCHES FOUND
            </h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Click "+ Add Game" or use the "AI Importer" to quickly schedule matches.
            </p>
            {canManage && (
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setShowAddGameModal(true)}
                  className="px-4 py-2 bg-[#FF6A00] text-black font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer"
                >
                  + Add First Game
                </button>
                <button
                  onClick={() => setShowAiImporterModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer"
                >
                  Paste Schedule (AI)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MANUAL ADD GAME MODAL */}
      <AnimatePresence>
        {showAddGameModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-[#141414] border border-white/20 rounded-3xl p-6 shadow-2xl text-white space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-black uppercase text-[#FF6A00] flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  SCHEDULE NEW GAME
                </span>
                <button
                  onClick={() => setShowAddGameModal(false)}
                  className="p-1 rounded-full bg-white/5 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateManualGame} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Home Team</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Predators"
                      value={newHomeTeam}
                      onChange={(e) => setNewHomeTeam(e.target.value)}
                      className="w-full bg-[#222220] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#FF6A00] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Away Team</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Gotham Knights"
                      value={newAwayTeam}
                      onChange={(e) => setNewAwayTeam(e.target.value)}
                      className="w-full bg-[#222220] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#FF6A00] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Game Date</label>
                    <input
                      type="date"
                      required
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full bg-[#222220] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#FF6A00] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Game Time</label>
                    <input
                      type="text"
                      required
                      placeholder="06:00 PM"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="w-full bg-[#222220] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#FF6A00] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Venue Name</label>
                    <input
                      type="text"
                      value={newVenue}
                      onChange={(e) => setNewVenue(e.target.value)}
                      placeholder="MetLife Arena"
                      className="w-full bg-[#222220] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#FF6A00] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Court / Field</label>
                    <input
                      type="text"
                      value={newCourt}
                      onChange={(e) => setNewCourt(e.target.value)}
                      placeholder="Court A"
                      className="w-full bg-[#222220] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#FF6A00] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Round / Stage</label>
                    <input
                      type="number"
                      min="1"
                      value={newRound}
                      onChange={(e) => setNewRound(e.target.value)}
                      className="w-full bg-[#222220] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#FF6A00] focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Status</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as any)}
                      className="w-full bg-[#222220] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#FF6A00] focus:outline-none"
                    >
                      <option value="Scheduled">Scheduled</option>
                      <option value="Live">Live Now 🔴</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#FF6A00] hover:bg-[#ff7b1a] text-black font-black text-xs uppercase tracking-wider rounded-2xl shadow-[0_0_20px_rgba(255,106,0,0.5)] transition-all cursor-pointer mt-2"
                >
                  SAVE & SCHEDULE GAME
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT MATCH SCHEDULE MODAL */}
      <AnimatePresence>
        {editingMatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-[#141414] border border-white/20 rounded-3xl p-6 shadow-2xl text-white space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-black uppercase text-[#FF6A00] flex items-center gap-2">
                  <Edit3 className="w-4 h-4" />
                  ADJUST MATCH SCHEDULE & SCORES
                </span>
                <button
                  onClick={() => setEditingMatch(null)}
                  className="p-1 rounded-full bg-white/5 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveMatch} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Home Team</label>
                    <input
                      type="text"
                      required
                      value={homeTeam}
                      onChange={(e) => setHomeTeam(e.target.value)}
                      className="w-full bg-[#222220] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#FF6A00] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Away Team</label>
                    <input
                      type="text"
                      required
                      value={awayTeam}
                      onChange={(e) => setAwayTeam(e.target.value)}
                      className="w-full bg-[#222220] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#FF6A00] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Home Score</label>
                    <input
                      type="number"
                      value={homeScore}
                      onChange={(e) => setHomeScore(parseInt(e.target.value) || 0)}
                      className="w-full bg-[#222220] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#FF6A00] focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Away Score</label>
                    <input
                      type="number"
                      value={awayScore}
                      onChange={(e) => setAwayScore(parseInt(e.target.value) || 0)}
                      className="w-full bg-[#222220] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#FF6A00] focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Scheduled Time</label>
                  <input
                    type="text"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    placeholder="e.g. 'Today @ 4:00 PM EST'"
                    className="w-full bg-[#222220] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#FF6A00] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Venue Facility</label>
                    <input
                      type="text"
                      value={venueName}
                      onChange={(e) => setVenueName(e.target.value)}
                      placeholder="e.g. 'MetLife Arena'"
                      className="w-full bg-[#222220] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#FF6A00] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Court / Field</label>
                    <input
                      type="text"
                      value={subLocation}
                      onChange={(e) => setSubLocation(e.target.value)}
                      placeholder="e.g. 'Court A (Main)'"
                      className="w-full bg-[#222220] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#FF6A00] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Match Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-[#222220] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#FF6A00] focus:outline-none"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Live">Live Now 🔴</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#FF6A00] hover:bg-[#ff7b1a] text-black font-black text-xs uppercase tracking-wider rounded-2xl shadow-[0_0_20px_rgba(255,106,0,0.5)] transition-all cursor-pointer mt-2"
                >
                  SAVE SCHEDULE & UPDATE FIRESTORE
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Universal AI Schedule Importer Modal */}
      <UniversalScheduleImporterModal
        isOpen={showAiImporterModal}
        onClose={() => setShowAiImporterModal(false)}
        sport="Flag Football"
        teamName="Tournament Schedule"
        onSuccess={handleAiGamesImported}
      />
    </div>
  );
};
