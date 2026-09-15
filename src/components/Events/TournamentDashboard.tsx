import React, { useState, useEffect } from 'react';
import { EventItem, TeamItem, GameItem, StandingItem } from '../../types';
import { 
  calculateStandings, 
  fetchGamesForEvent, 
  fetchTeamsForEvent, 
  updateGameScoreInFirestore 
} from '../../services/tournamentHubService';
import { useAuth } from '../../context/AuthContext';
import { RosterManager } from './RosterManager';
import { TeamRegistrationFlow } from './TeamRegistrationFlow';
import { 
  Trophy, 
  Table, 
  Layers, 
  Users, 
  Save, 
  Edit2, 
  Plus, 
  CheckCircle2, 
  Calendar, 
  Sparkles, 
  Flame, 
  ShieldCheck,
  Search
} from 'lucide-react';

interface TournamentDashboardProps {
  event: EventItem;
  onRefresh?: () => void;
}

export const TournamentDashboard: React.FC<TournamentDashboardProps> = ({ event }) => {
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const [activeTab, setActiveTab] = useState<'poolPlay' | 'standings' | 'bracket' | 'teams'>('poolPlay');
  const [selectedDivision, setSelectedDivision] = useState<string>(
    event.divisions && event.divisions.length > 0 ? event.divisions[0] : 'Varsity'
  );

  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [games, setGames] = useState<GameItem[]>([]);
  const [standings, setStandings] = useState<StandingItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Score Editing State for Admins
  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const [scoreA, setScoreA] = useState<number>(0);
  const [scoreB, setScoreB] = useState<number>(0);
  const [isSavingScore, setIsSavingScore] = useState(false);

  // Modals
  const [selectedTeamForRoster, setSelectedTeamForRoster] = useState<TeamItem | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Load teams and games from Firestore or Seed Mock Data if empty
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      let fetchedTeams = await fetchTeamsForEvent(event.id);
      let fetchedGames = await fetchGamesForEvent(event.id);

      // Seed realistic default teams & games if brand new event
      if (fetchedTeams.length === 0) {
        fetchedTeams = [
          { id: 't1', eventId: event.id, coachId: 'c1', coachName: 'Coach Vance', division: selectedDivision, teamName: 'Tri-State Elite', paymentStatus: 'Paid', roster: [] },
          { id: 't2', eventId: event.id, coachId: 'c2', coachName: 'Coach Marcus', division: selectedDivision, teamName: 'Jersey Shore Hoops', paymentStatus: 'Paid', roster: [] },
          { id: 't3', eventId: event.id, coachId: 'c3', coachName: 'Coach Sarah', division: selectedDivision, teamName: 'Philly Express', paymentStatus: 'Paid', roster: [] },
          { id: 't4', eventId: event.id, coachId: 'c4', coachName: 'Coach Dave', division: selectedDivision, teamName: 'Gothams Best', paymentStatus: 'Paid', roster: [] },
        ];
      }

      if (fetchedGames.length === 0) {
        fetchedGames = [
          // Pool Play Games
          { id: 'g1', eventId: event.id, division: selectedDivision, teamA_Id: 't1', teamB_Id: 't2', teamA_Name: 'Tri-State Elite', teamB_Name: 'Jersey Shore Hoops', teamA_Score: 68, teamB_Score: 62, gameType: 'PoolPlay', startTime: '10:00 AM', status: 'Final', courtOrField: 'Court A' },
          { id: 'g2', eventId: event.id, division: selectedDivision, teamA_Id: 't3', teamB_Id: 't4', teamA_Name: 'Philly Express', teamB_Name: 'Gothams Best', teamA_Score: 74, teamB_Score: 70, gameType: 'PoolPlay', startTime: '11:15 AM', status: 'Final', courtOrField: 'Court B' },
          { id: 'g3', eventId: event.id, division: selectedDivision, teamA_Id: 't1', teamB_Id: 't3', teamA_Name: 'Tri-State Elite', teamB_Name: 'Philly Express', teamA_Score: 82, teamB_Score: 78, gameType: 'PoolPlay', startTime: '01:00 PM', status: 'Final', courtOrField: 'Court A' },
          { id: 'g4', eventId: event.id, division: selectedDivision, teamA_Id: 't2', teamB_Id: 't4', teamA_Name: 'Jersey Shore Hoops', teamB_Name: 'Gothams Best', teamA_Score: 59, teamB_Score: 65, gameType: 'PoolPlay', startTime: '02:15 PM', status: 'Final', courtOrField: 'Court B' },
          
          // Bracket Knockout Games
          { id: 'g-semi1', eventId: event.id, division: selectedDivision, teamA_Id: 't1', teamB_Id: 't4', teamA_Name: '#1 Seed (Tri-State)', teamB_Name: '#4 Seed (Jersey Shore)', teamA_Score: 75, teamB_Score: 68, gameType: 'Bracket', round: 'Semifinals', matchNumber: 1, startTime: '04:00 PM', status: 'Final', courtOrField: 'Main Arena' },
          { id: 'g-semi2', eventId: event.id, division: selectedDivision, teamA_Id: 't3', teamB_Id: 't2', teamA_Name: '#2 Seed (Philly Express)', teamB_Name: '#3 Seed (Gothams Best)', teamA_Score: 80, teamB_Score: 72, gameType: 'Bracket', round: 'Semifinals', matchNumber: 2, startTime: '05:15 PM', status: 'Final', courtOrField: 'Main Arena' },
          { id: 'g-final', eventId: event.id, division: selectedDivision, teamA_Id: 't1', teamB_Id: 't3', teamA_Name: 'Tri-State Elite', teamB_Name: 'Philly Express', teamA_Score: 88, teamB_Score: 85, gameType: 'Bracket', round: 'Championship', matchNumber: 3, startTime: '07:00 PM', status: 'Final', courtOrField: 'Center Court' },
        ];
      }

      setTeams(fetchedTeams);
      setGames(fetchedGames);

      // Compute Standings using the required Standings Engine
      const computedStandings = calculateStandings(fetchedGames, fetchedTeams, selectedDivision);
      setStandings(computedStandings);

    } catch (err) {
      console.warn('Error loading tournament dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [event.id, selectedDivision]);

  // Handle Score Save for Admins
  const handleStartEditScore = (game: GameItem) => {
    setEditingGameId(game.id);
    setScoreA(game.teamA_Score || 0);
    setScoreB(game.teamB_Score || 0);
  };

  const handleSaveScore = async (gameId: string) => {
    setIsSavingScore(true);
    try {
      await updateGameScoreInFirestore(gameId, scoreA, scoreB, 'Final');

      // Update local state
      const updatedGames = games.map(g => {
        if (g.id === gameId) {
          return {
            ...g,
            teamA_Score: scoreA,
            teamB_Score: scoreB,
            status: 'Final' as const,
            winnerId: scoreA > scoreB ? g.teamA_Id : g.teamB_Id
          };
        }
        return g;
      });

      setGames(updatedGames);
      const newStandings = calculateStandings(updatedGames, teams, selectedDivision);
      setStandings(newStandings);
      setEditingGameId(null);
    } catch (err) {
      console.error('Failed to save score:', err);
    } finally {
      setIsSavingScore(false);
    }
  };

  const divisionsList = event.divisions && event.divisions.length > 0 
    ? event.divisions 
    : ['10U', '12U', '14U', '17U', 'Varsity'];

  return (
    <div className="space-y-6 font-sans text-slate-100">
      
      {/* Division Selector & Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
        
        {/* Divisions Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto scrollbar-none pb-1 sm:pb-0">
          <span className="text-[10px] font-mono font-bold uppercase text-slate-400 shrink-0 mr-1">Division:</span>
          {divisionsList.map((div) => (
            <button
              key={div}
              onClick={() => setSelectedDivision(div)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer shrink-0 ${
                selectedDivision === div
                  ? 'bg-[#E5B868] text-black border border-[#E5B868] shadow-[0_0_15px_rgba(214,28,36,0.4)]'
                  : 'bg-white/5 text-slate-400 border border-white/10 hover:text-white'
              }`}
            >
              {div}
            </button>
          ))}
        </div>

        {/* Coach Registration CTA */}
        <button
          onClick={() => setShowRegisterModal(true)}
          className="px-5 py-2.5 rounded-2xl bg-[#E5B868] text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(214,28,36,0.4)] hover:scale-105 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Register Team (${event.teamFee || 250})</span>
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setActiveTab('poolPlay')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold font-mono uppercase transition-all cursor-pointer ${
            activeTab === 'poolPlay'
              ? 'bg-white/15 text-white border border-white/20 shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Calendar className="w-4 h-4 text-[#E5B868]" />
          <span>Pool Play</span>
        </button>

        <button
          onClick={() => setActiveTab('standings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold font-mono uppercase transition-all cursor-pointer ${
            activeTab === 'standings'
              ? 'bg-white/15 text-white border border-white/20 shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Table className="w-4 h-4 text-[#E5B868]" />
          <span>Standings</span>
        </button>

        <button
          onClick={() => setActiveTab('bracket')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold font-mono uppercase transition-all cursor-pointer ${
            activeTab === 'bracket'
              ? 'bg-white/15 text-white border border-white/20 shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Layers className="w-4 h-4 text-[#E5B868]" />
          <span>Bracket View</span>
        </button>

        <button
          onClick={() => setActiveTab('teams')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold font-mono uppercase transition-all cursor-pointer ${
            activeTab === 'teams'
              ? 'bg-white/15 text-white border border-white/20 shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Users className="w-4 h-4 text-[#E5B868]" />
          <span>Teams & Rosters</span>
        </button>
      </div>

      {/* 1. POOL PLAY TAB */}
      {activeTab === 'poolPlay' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 font-mono uppercase">
              Pool Play Schedule & Match Results ({selectedDivision})
            </h3>
            {isAdmin && <span className="text-[10px] text-[#E5B868] font-mono">Admin Score Entry Active</span>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {games.filter(g => g.gameType === 'PoolPlay').map((game) => {
              const isEditing = editingGameId === game.id;

              return (
                <div 
                  key={game.id} 
                  className="p-5 rounded-3xl bg-[#212A31] border border-white/10 space-y-4 hover:border-white/20 transition-all relative overflow-hidden"
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-[10px] font-mono font-bold text-slate-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#E5B868]"></span>
                      <span>{game.courtOrField || 'Court A'} • {game.startTime}</span>
                    </span>

                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      game.status === 'Final' ? 'bg-[#E5B868]/10 text-[#E5B868] border border-[#E5B868]/30' : 'bg-white/10 text-slate-400'
                    }`}>
                      {game.status}
                    </span>
                  </div>

                  {/* Match Teams & Scores */}
                  <div className="space-y-2">
                    {/* Team A */}
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white">{game.teamA_Name}</span>
                      {isEditing ? (
                        <input
                          type="number"
                          value={scoreA}
                          onChange={(e) => setScoreA(Number(e.target.value))}
                          className="w-16 px-2 py-1 rounded-xl bg-white/10 border border-[#E5B868] text-center font-mono font-bold text-white"
                        />
                      ) : (
                        <span className={`text-lg font-black font-mono ${
                          game.teamA_Score > game.teamB_Score ? 'text-[#E5B868]' : 'text-slate-300'
                        }`}>
                          {game.teamA_Score}
                        </span>
                      )}
                    </div>

                    {/* Team B */}
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white">{game.teamB_Name}</span>
                      {isEditing ? (
                        <input
                          type="number"
                          value={scoreB}
                          onChange={(e) => setScoreB(Number(e.target.value))}
                          className="w-16 px-2 py-1 rounded-xl bg-white/10 border border-[#E5B868] text-center font-mono font-bold text-white"
                        />
                      ) : (
                        <span className={`text-lg font-black font-mono ${
                          game.teamB_Score > game.teamA_Score ? 'text-[#E5B868]' : 'text-slate-300'
                        }`}>
                          {game.teamB_Score}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Admin Quick Save */}
                  {isAdmin && (
                    <div className="pt-2 border-t border-white/10 flex justify-end">
                      {isEditing ? (
                        <button
                          onClick={() => handleSaveScore(game.id)}
                          disabled={isSavingScore}
                          className="px-3 py-1.5 rounded-xl bg-[#E5B868] text-black font-extrabold text-[11px] uppercase flex items-center gap-1 shadow-[0_0_10px_rgba(214,28,36,0.4)]"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Save Score</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartEditScore(game)}
                          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-[#E5B868]" />
                          <span>Edit Final Score</span>
                        </button>
                      )}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. STANDINGS TAB */}
      {activeTab === 'standings' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-400">
            <strong>Standings Algorithm:</strong> Ranked automatically by <span className="text-[#E5B868] font-mono">Wins</span>, then <span className="text-[#E5B868] font-mono">Point Differential (+/-)</span>, then <span className="text-[#E5B868] font-mono">Points For</span>.
          </div>

          <div className="overflow-x-auto rounded-3xl border border-white/10 bg-[#212A31]">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-white/5 text-slate-400 font-mono text-[10px] uppercase border-b border-white/10">
                <tr>
                  <th className="p-4">Rank</th>
                  <th className="p-4">Team Name</th>
                  <th className="p-4 text-center">Division</th>
                  <th className="p-4 text-center">GP</th>
                  <th className="p-4 text-center">W - L</th>
                  <th className="p-4 text-center">PF</th>
                  <th className="p-4 text-center">PA</th>
                  <th className="p-4 text-center font-bold text-[#E5B868]">Diff (+/-)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {standings.map((st) => (
                  <tr key={st.teamId} className="hover:bg-white/5 transition-all">
                    <td className="p-4 font-mono font-black text-sm">
                      {st.rank === 1 ? (
                        <span className="px-2.5 py-1 rounded-full bg-[#E5B868]/20 text-[#E5B868] border border-[#E5B868]/40">
                          #1 Seed
                        </span>
                      ) : (
                        <span className="text-slate-400">#{st.rank}</span>
                      )}
                    </td>
                    <td className="p-4 font-bold text-white text-sm">{st.teamName}</td>
                    <td className="p-4 text-center font-mono text-slate-400">{st.division}</td>
                    <td className="p-4 text-center font-mono text-white">{st.played}</td>
                    <td className="p-4 text-center font-mono font-bold text-white">
                      {st.wins} - {st.losses}
                    </td>
                    <td className="p-4 text-center font-mono text-slate-300">{st.pointsFor}</td>
                    <td className="p-4 text-center font-mono text-slate-300">{st.pointsAgainst}</td>
                    <td className="p-4 text-center font-mono font-black text-sm text-[#E5B868]">
                      {st.pointDiff > 0 ? `+${st.pointDiff}` : st.pointDiff}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. BRACKET VIEW TAB */}
      {activeTab === 'bracket' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 font-mono uppercase flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#E5B868]" />
              <span>Championship Single-Elimination Bracket ({selectedDivision})</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-400">Auto-Seeded from Pool Standings</span>
          </div>

          {/* Visual Bracket Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center p-6 rounded-3xl bg-[#212A31] border border-white/10 relative overflow-x-auto">
            
            {/* Round 1: Semifinals */}
            <div className="space-y-6">
              <div className="text-[10px] font-mono font-bold uppercase text-[#E5B868] tracking-widest border-b border-[#E5B868]/30 pb-2">
                SEMIFINALS
              </div>

              {games.filter(g => g.gameType === 'Bracket' && g.round === 'Semifinals').map((game) => (
                <div key={game.id} className="p-4 rounded-2xl bg-white/5 border border-white/15 space-y-2 relative">
                  <div className="text-[9px] font-mono text-slate-400 flex justify-between">
                    <span>Matchup #{game.matchNumber}</span>
                    <span>{game.startTime}</span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-white">{game.teamA_Name}</span>
                      <span className="font-mono text-[#E5B868] text-sm">{game.teamA_Score}</span>
                    </div>
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-white">{game.teamB_Name}</span>
                      <span className="font-mono text-[#E5B868] text-sm">{game.teamB_Score}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Round 2: Championship Final */}
            <div className="space-y-6">
              <div className="text-[10px] font-mono font-bold uppercase text-[#E5B868] tracking-widest border-b border-[#E5B868]/30 pb-2">
                CHAMPIONSHIP FINAL
              </div>

              {games.filter(g => g.gameType === 'Bracket' && g.round === 'Championship').map((game) => (
                <div key={game.id} className="p-5 rounded-2xl bg-[#E5B868]/10 border-2 border-[#E5B868] space-y-3 relative shadow-[0_0_30px_rgba(214,28,36,0.2)]">
                  <div className="text-[9px] font-mono text-[#E5B868] font-bold flex justify-between">
                    <span>🏆 TITLE MATCH</span>
                    <span>{game.startTime}</span>
                  </div>

                  <div className="space-y-2 text-sm font-black">
                    <div className="flex justify-between items-center">
                      <span className="text-white">{game.teamA_Name}</span>
                      <span className="font-mono text-[#E5B868] text-lg">{game.teamA_Score}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white">{game.teamB_Name}</span>
                      <span className="font-mono text-[#E5B868] text-lg">{game.teamB_Score}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E5B868]/30 text-center text-[10px] font-mono text-[#E5B868] font-bold">
                    WINNER: {game.teamA_Score > game.teamB_Score ? game.teamA_Name : game.teamB_Name}
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* 4. TEAMS & ROSTERS TAB */}
      {activeTab === 'teams' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 font-mono uppercase">
              Registered Teams ({teams.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teams.map((t) => (
              <div key={t.id} className="p-5 rounded-3xl bg-[#212A31] border border-white/10 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-black text-white text-base">{t.teamName}</h4>
                    <p className="text-xs text-slate-400">Division: <span className="font-mono text-[#E5B868] font-bold">{t.division}</span></p>
                    <p className="text-[11px] text-slate-500">Coach: {t.coachName}</p>
                  </div>

                  <span className="px-2.5 py-1 rounded-full bg-[#E5B868]/10 text-[#E5B868] border border-[#E5B868]/30 text-[10px] font-mono font-bold uppercase">
                    {t.paymentStatus}
                  </span>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400">
                    Roster: <strong className="text-white">{t.roster ? t.roster.length : 0} Athletes</strong>
                  </span>

                  <button
                    onClick={() => setSelectedTeamForRoster(t)}
                    className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold font-mono flex items-center gap-1 cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5 text-[#E5B868]" />
                    <span>Manage Roster</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: ROSTER MANAGER */}
      {selectedTeamForRoster && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-3xl">
            <RosterManager
              team={selectedTeamForRoster}
              event={event}
              onRosterUpdated={(updated) => {
                setTeams(teams.map(t => t.id === updated.id ? updated : t));
              }}
              onClose={() => setSelectedTeamForRoster(null)}
            />
          </div>
        </div>
      )}

      {/* MODAL 2: COACH TEAM REGISTRATION FLOW */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-xl">
            <TeamRegistrationFlow
              event={event}
              onRegistered={(newTeam) => {
                setTeams([...teams, newTeam]);
                setShowRegisterModal(false);
              }}
              onCancel={() => setShowRegisterModal(false)}
            />
          </div>
        </div>
      )}

    </div>
  );
};
