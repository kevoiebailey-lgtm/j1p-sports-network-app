import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Layers, 
  Award, 
  ArrowRight, 
  CheckCircle2, 
  RefreshCw,
  Sparkles,
  Users,
  UserCheck,
  Calendar,
  SlidersHorizontal
} from 'lucide-react';
import { INITIAL_POOL_STANDINGS, INITIAL_TOURNAMENT_DOC } from '../../../lib/platformData';
import { PoolStanding, TournamentDoc } from '../../../types/platform';
import { SeasonScheduleGeneratorModal } from '../../Events/SeasonScheduleGeneratorModal';
import { TournamentRosterManager } from '../../Tournaments/TournamentRosterManager';

export const DirectorBracketsTab: React.FC = () => {
  const [selectedDivision, setSelectedDivision] = useState<string>('Varsity Gold');
  const [standings, setStandings] = useState<PoolStanding[]>(INITIAL_POOL_STANDINGS);
  const [advanceNotice, setAdvanceNotice] = useState<string | null>(null);
  const [isAiScheduleModalOpen, setIsAiScheduleModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<'brackets' | 'rosters'>('brackets');
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [tournament, setTournament] = useState<TournamentDoc>(INITIAL_TOURNAMENT_DOC);

  const handleAdvanceTeam = (teamName: string, round: string) => {
    setAdvanceNotice(`${teamName} successfully seeded and advanced to ${round}!`);
    setTimeout(() => setAdvanceNotice(null), 3000);
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#FF6A00]" />
            <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Brackets, Pools & Tournament Rosters
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Automatic Seeding, Tiebreak Calculations & Athlete Profile ID Roster Synchronization
          </p>
        </div>

        {/* View Switcher & Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Sub-Tab Navigation */}
          <div className="flex items-center p-1 bg-slate-950 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveView('brackets')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'brackets'
                  ? 'bg-[#FF6A00] text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Brackets & Pools</span>
            </button>
            <button
              onClick={() => setActiveView('rosters')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'rosters'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Roster Manager</span>
              <span className="px-1.5 py-0.2 rounded-full bg-cyan-400/20 text-cyan-300 text-[10px] font-mono">
                Firestore
              </span>
            </button>
          </div>

          <button
            onClick={() => setIsAiScheduleModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#FF6A00] to-amber-500 hover:from-[#e55f00] hover:to-amber-600 text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Season Scheduler</span>
          </button>
        </div>
      </div>

      {advanceNotice && (
        <div className="p-3 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{advanceNotice}</span>
        </div>
      )}

      {/* VIEW 1: TOURNAMENT ROSTER & PROFILE ID LINKER */}
      {activeView === 'rosters' ? (
        <TournamentRosterManager
          tournamentId={tournament.id}
          initialTournament={tournament}
          initialDivision={selectedDivision}
          onTournamentUpdated={(updated) => {
            setTournament(updated);
            setAdvanceNotice(`Tournament document "${updated.title}" successfully updated in Firestore!`);
            setTimeout(() => setAdvanceNotice(null), 3500);
          }}
        />
      ) : (
        /* VIEW 2: BRACKETS, POOL STANDINGS & ADVANCEMENT */
        <div className="space-y-5">
          {/* Division Selector Header for Brackets */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-[11px] font-mono text-slate-400 uppercase font-bold whitespace-nowrap">
                Select Division:
              </span>
              {tournament.divisions.map((div) => (
                <button
                  key={div}
                  onClick={() => setSelectedDivision(div)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedDivision === div
                      ? 'bg-[#FF6A00] text-white shadow-md'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {div}
                </button>
              ))}
            </div>

            <button
              onClick={() => setActiveView('rosters')}
              className="px-3 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-800/60 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-all"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Manage Division Rosters</span>
            </button>
          </div>

          {/* Standings Table with 1-Tap Advance */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-xs font-black text-[#FF6A00] uppercase tracking-wider">
                {selectedDivision} • Pool A Live Standings
              </h2>
              <span className="text-[10px] text-slate-400">Head-to-Head & Point Diff Tiebreaks Enabled</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4">Seed</th>
                    <th className="py-2.5 px-4">Team</th>
                    <th className="py-2.5 px-4 text-center">Wins</th>
                    <th className="py-2.5 px-4 text-center">Losses</th>
                    <th className="py-2.5 px-4 text-center">+/- Diff</th>
                    <th className="py-2.5 px-4 text-right">Bracket Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {standings.map((row) => (
                    <tr key={row.teamName} className="hover:bg-slate-800/40 text-slate-300">
                      <td className="py-3 px-4 font-mono font-black text-[#FF6A00]">#{row.seed}</td>
                      <td className="py-3 px-4 font-bold text-white">{row.teamName}</td>
                      <td className="py-3 px-4 text-center font-mono">{row.wins}</td>
                      <td className="py-3 px-4 text-center font-mono">{row.losses}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-emerald-400">+{row.pointDiff}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleAdvanceTeam(row.teamName, 'Championship Semifinals')}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-[#FF6A00] hover:text-white border border-slate-700 text-[11px] font-bold text-slate-300 transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <span>Advance</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* CHAMPIONSHIP BRACKET VISUALIZER */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                Single Elimination Championship Bracket ({selectedDivision})
              </h2>
              <button
                onClick={() => setActiveView('rosters')}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer font-mono"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Sync Seed Rosters</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Semi 1 */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                  Semifinal #1 • Court 1 (1:00 PM)
                </span>
                <div className="flex justify-between items-center p-2 rounded-xl bg-slate-900 text-xs font-bold text-white">
                  <span>#1 SoCal Elite Vipers</span>
                  <span className="text-emerald-400 font-mono">Advancing</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-xl bg-slate-900 text-xs font-bold text-slate-400">
                  <span>#4 Las Vegas Lightning</span>
                  <span className="text-slate-500 font-mono">-</span>
                </div>
              </div>

              {/* Semi 2 */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                  Semifinal #2 • Court 2 (1:00 PM)
                </span>
                <div className="flex justify-between items-center p-2 rounded-xl bg-slate-900 text-xs font-bold text-white">
                  <span>#2 California Golden Bears</span>
                  <span className="text-amber-400 font-mono">Locked</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-xl bg-slate-900 text-xs font-bold text-slate-400">
                  <span>#3 Texas Outlaws Flag</span>
                  <span className="text-slate-500 font-mono">-</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <SeasonScheduleGeneratorModal
        isOpen={isAiScheduleModalOpen}
        onClose={() => setIsAiScheduleModalOpen(false)}
        tournamentId={tournament.id}
        tournamentName={tournament.title}
        sport={tournament.sport}
        onImportSuccess={(count, summary) => {
          setAdvanceNotice(`Successfully generated & imported ${count} games to the tournament bracket database!`);
          setTimeout(() => setAdvanceNotice(null), 4000);
        }}
      />

    </div>
  );
};

export default DirectorBracketsTab;

