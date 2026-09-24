import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Zap, 
  Play, 
  Pause, 
  CheckCircle2, 
} from 'lucide-react';
import { TournamentGameDoc } from '../../../types/platform';
import { GlassPanel } from '../../Common/GlassPanel';
import {
  advanceTournamentBracketMatch,
  persistLiveMatchState,
  subscribeTournamentMatches,
  BracketNodeMatch,
} from '../../../services/tournamentEngine';

const DEFAULT_TOURNAMENT_ID = 'live-default';

function engineStatusToDesk(status?: string, period?: string): TournamentGameDoc['status'] {
  const raw = (period || status || '').toString();
  const upper = raw.toUpperCase();
  if (upper === 'FINAL' || raw === 'Final') return 'Final';
  if (upper === 'HALFTIME' || raw === 'Halftime') return 'Halftime';
  if (upper === 'WARMUP' || raw === 'Warmup') return 'Warmup';
  if (upper === 'IN_PROGRESS' || upper === 'LIVE' || raw === 'Live' || raw === '1st Half' || raw === '2nd Half' || raw === 'OT') {
    return 'Live';
  }
  return 'Upcoming';
}

function deskPeriodToEngineStatus(period: TournamentGameDoc['period']): string {
  if (period === 'Final') return 'FINAL';
  if (period === 'Halftime') return 'HALFTIME';
  if (period === 'Upcoming') return 'SCHEDULED';
  return 'IN_PROGRESS';
}

function mapMatchToDeskGame(match: BracketNodeMatch): TournamentGameDoc {
  const data = match as BracketNodeMatch & Record<string, any>;
  const period = data.period || (match.status === 'FINAL' ? 'Final' : match.status === 'HALFTIME' ? 'Halftime' : match.status === 'IN_PROGRESS' ? '1st Half' : 'Upcoming');
  return {
    id: match.id,
    tournamentId: match.tournamentId,
    courtId: data.courtId || match.courtOrField || 'court-1',
    courtName: match.courtOrField || data.courtName || 'Court 1',
    scheduledTime: match.scheduledTime || '',
    homeTeam: match.teamA_Name || 'TBD',
    homeTeamSeed: match.teamA_Seed,
    awayTeam: match.teamB_Name || 'TBD',
    awayTeamSeed: match.teamB_Seed,
    homeScore: Number(match.teamA_Score ?? 0),
    awayScore: Number(match.teamB_Score ?? 0),
    period,
    clock: data.clock || '12:00',
    isClockRunning: Boolean(data.isClockRunning),
    status: engineStatusToDesk(match.status, period),
    referee: data.referee,
    division: match.division || 'Open',
  };
}

export const DirectorScoreDeskTab: React.FC = () => {
  const { tournamentId: routeTournamentId } = useParams<{ tournamentId?: string }>();
  const tournamentId = routeTournamentId || DEFAULT_TOURNAMENT_ID;
  const [games, setGames] = useState<TournamentGameDoc[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>('');
  const [auditNotice, setAuditNotice] = useState<string | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeTournamentMatches(tournamentId, (matches) => {
      const mapped = matches.map(mapMatchToDeskGame);
      setGames(mapped);
      setSelectedGameId((current) => {
        if (current && mapped.some((g) => g.id === current)) return current;
        return mapped[0]?.id || '';
      });
    }, (err) => setCommitError(err.message));
    return () => unsub();
  }, [tournamentId]);

  const activeGame = useMemo(
    () => games.find(g => g.id === selectedGameId) || games[0],
    [games, selectedGameId]
  );

  const showNotice = (message: string) => {
    setAuditNotice(message);
    setTimeout(() => setAuditNotice(null), 2500);
  };

  const commitPatch = async (game: TournamentGameDoc, patch: Partial<TournamentGameDoc>, extras: Record<string, unknown> = {}) => {
    setCommitError(null);
    try {
      await persistLiveMatchState(tournamentId, game.id, {
        teamA_Score: patch.homeScore ?? game.homeScore,
        teamB_Score: patch.awayScore ?? game.awayScore,
        homeScore: patch.homeScore ?? game.homeScore,
        awayScore: patch.awayScore ?? game.awayScore,
        period: patch.period ?? game.period,
        clock: patch.clock ?? game.clock,
        isClockRunning: patch.isClockRunning ?? game.isClockRunning,
        status: deskPeriodToEngineStatus(patch.period ?? game.period),
        courtOrField: game.courtName,
        courtName: game.courtName,
        teamA_Name: game.homeTeam,
        teamB_Name: game.awayTeam,
        division: game.division,
        ...extras,
      });
    } catch (err: any) {
      setCommitError(err?.message || 'Failed to commit live score to Firestore.');
    }
  };

  const updateScore = (team: 'home' | 'away', delta: number) => {
    if (!activeGame) return;
    const nextHome = team === 'home' ? Math.max(0, activeGame.homeScore + delta) : activeGame.homeScore;
    const nextAway = team === 'away' ? Math.max(0, activeGame.awayScore + delta) : activeGame.awayScore;
    void commitPatch(activeGame, { homeScore: nextHome, awayScore: nextAway });
  };

  const updatePeriod = async (period: TournamentGameDoc['period']) => {
    if (!activeGame) return;
    await commitPatch(activeGame, { period, status: engineStatusToDesk(undefined, period) });
    showNotice(`Game status updated to: ${period}`);
    if (period === 'Final') {
      try {
        const result = await advanceTournamentBracketMatch(
          tournamentId,
          activeGame.id,
          activeGame.homeScore,
          activeGame.awayScore
        );
        showNotice(`Final recorded. Winner advanced: ${result.winnerName}`);
      } catch (err: any) {
        setCommitError(err?.message || 'Could not advance the bracket after final.');
      }
    }
  };

  const toggleClock = () => {
    if (!activeGame) return;
    void commitPatch(activeGame, {
      isClockRunning: !activeGame.isClockRunning,
      status: !activeGame.isClockRunning ? 'Live' : activeGame.status,
    });
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* Header */}
      <GlassPanel className="rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#FF6A00]" />
            <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Live Scorekeeper & Stats Console
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Instant 1-Tap Score Entry committed to Firestore for {tournamentId}
          </p>
        </div>

        {/* Court Selectors */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-950 rounded-2xl border border-slate-700/80 self-start sm:self-auto overflow-x-auto">
          {games.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGameId(g.id)}
              className={`min-h-[48px] px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                g.id === activeGame?.id ? 'bg-[#FF6A00] text-white shadow-md font-black' : 'text-slate-300 hover:text-white'
              }`}
            >
              {g.courtName}
            </button>
          ))}
        </div>
      </GlassPanel>

      {auditNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-950 border border-emerald-500/50 text-xs text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{auditNotice}</span>
        </div>
      )}

      {commitError && (
        <div className="p-3.5 rounded-xl bg-red-950 border border-red-500/50 text-xs text-red-200">
          {commitError}
        </div>
      )}

      {!activeGame && (
        <GlassPanel className="rounded-2xl p-6 text-sm text-slate-300">
          No live matches published for this tournament yet. Generate and commit a bracket from the tournament engine to start scoring.
        </GlassPanel>
      )}

      {/* ACTIVE SCOREBOARD CONSOLE */}
      {activeGame && (
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-3xl p-5 sm:p-7 space-y-6 shadow-2xl">
          
          {/* Top Period & Clock Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-700/80">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xl sm:text-2xl font-black text-white tracking-wider">
                {activeGame.clock}
              </span>
              <button
                onClick={toggleClock}
                className={`min-h-[48px] px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-md ${
                  activeGame.isClockRunning 
                    ? 'bg-amber-400 text-slate-950 font-black' 
                    : 'bg-emerald-400 text-slate-950 font-black'
                }`}
              >
                {activeGame.isClockRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                <span>{activeGame.isClockRunning ? 'Pause Clock' : 'Start Clock'}</span>
              </button>
            </div>

            {/* Period Selector (min-h-[48px]) */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(['1st Half', 'Halftime', '2nd Half', 'OT', 'Final'] as TournamentGameDoc['period'][]).map((p) => (
                <button
                  key={p}
                  onClick={() => updatePeriod(p)}
                  className={`min-h-[48px] px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                    activeGame.period === p ? 'bg-[#FF6A00] text-white font-black' : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* TEAMS SCORING INTERACTION */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* HOME TEAM */}
            <div className="bg-slate-950 p-5 rounded-3xl border border-slate-700/80 space-y-4 text-center">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-[#00F5D4] uppercase">Home Team</span>
                <h3 className="text-base sm:text-lg font-black text-white">{activeGame.homeTeam}</h3>
              </div>

              {/* Big Score Display */}
              <div className="text-5xl sm:text-6xl font-mono font-black text-[#00F5D4] py-2">
                {activeGame.homeScore}
              </div>

              {/* 54px x 54px Touch Target Action Buttons */}
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => updateScore('home', +1)}
                  className="min-h-[54px] rounded-2xl bg-slate-900 hover:bg-slate-800 text-xs font-black text-white border border-slate-700 cursor-pointer shadow-md transition-all active:scale-95 flex flex-col items-center justify-center"
                >
                  <span>+1</span>
                  <span className="text-[9px] text-slate-300 font-normal">XP</span>
                </button>
                <button
                  onClick={() => updateScore('home', +2)}
                  className="min-h-[54px] rounded-2xl bg-slate-900 hover:bg-slate-800 text-xs font-black text-white border border-slate-700 cursor-pointer shadow-md transition-all active:scale-95 flex flex-col items-center justify-center"
                >
                  <span>+2</span>
                  <span className="text-[9px] text-slate-300 font-normal">Safety</span>
                </button>
                <button
                  onClick={() => updateScore('home', +6)}
                  className="min-h-[54px] rounded-2xl bg-[#00F5D4] hover:bg-[#00e2c4] text-slate-950 text-xs font-black shadow-lg cursor-pointer transition-all active:scale-95 flex flex-col items-center justify-center"
                >
                  <span>+6</span>
                  <span className="text-[9px] font-bold">TD</span>
                </button>
                <button
                  onClick={() => updateScore('home', -1)}
                  className="min-h-[54px] rounded-2xl bg-red-950/60 hover:bg-red-900/80 text-xs font-black text-red-300 border border-red-700/60 cursor-pointer shadow-md transition-all active:scale-95 flex flex-col items-center justify-center"
                >
                  <span>-1</span>
                  <span className="text-[9px] font-normal">Correct</span>
                </button>
              </div>
            </div>

            {/* AWAY TEAM */}
            <div className="bg-slate-950 p-5 rounded-3xl border border-slate-700/80 space-y-4 text-center">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-amber-400 uppercase">Away Team</span>
                <h3 className="text-base sm:text-lg font-black text-white">{activeGame.awayTeam}</h3>
              </div>

              {/* Big Score Display */}
              <div className="text-5xl sm:text-6xl font-mono font-black text-amber-400 py-2">
                {activeGame.awayScore}
              </div>

              {/* 54px x 54px Touch Target Action Buttons */}
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => updateScore('away', +1)}
                  className="min-h-[54px] rounded-2xl bg-slate-900 hover:bg-slate-800 text-xs font-black text-white border border-slate-700 cursor-pointer shadow-md transition-all active:scale-95 flex flex-col items-center justify-center"
                >
                  <span>+1</span>
                  <span className="text-[9px] text-slate-300 font-normal">XP</span>
                </button>
                <button
                  onClick={() => updateScore('away', +2)}
                  className="min-h-[54px] rounded-2xl bg-slate-900 hover:bg-slate-800 text-xs font-black text-white border border-slate-700 cursor-pointer shadow-md transition-all active:scale-95 flex flex-col items-center justify-center"
                >
                  <span>+2</span>
                  <span className="text-[9px] text-slate-300 font-normal">Safety</span>
                </button>
                <button
                  onClick={() => updateScore('away', +6)}
                  className="min-h-[54px] rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow-lg cursor-pointer transition-all active:scale-95 flex flex-col items-center justify-center"
                >
                  <span>+6</span>
                  <span className="text-[9px] font-bold">TD</span>
                </button>
                <button
                  onClick={() => updateScore('away', -1)}
                  className="min-h-[54px] rounded-2xl bg-red-950/60 hover:bg-red-900/80 text-xs font-black text-red-300 border border-red-700/60 cursor-pointer shadow-md transition-all active:scale-95 flex flex-col items-center justify-center"
                >
                  <span>-1</span>
                  <span className="text-[9px] font-normal">Correct</span>
                </button>
              </div>
            </div>

          </div>

          {/* Official Certification Footer */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
            <span>Scorekeeper: Director Desk Â· Firestore live</span>
            <span>Court Lead Ref: <strong className="text-slate-200">{activeGame.referee || 'Unassigned'}</strong></span>
          </div>

        </div>
      )}

    </div>
  );
};

export default DirectorScoreDeskTab;
