import React, { useState } from 'react';
import { GameStatEntry, SportType, UserProfile } from '../../types';
import { AddGameStatsModal } from './AddGameStatsModal';
import { StatSubmissionForm, StatItem } from './StatSubmissionForm';
import { 
  Trophy, 
  Plus, 
  Calendar, 
  MapPin, 
  Video, 
  Trash2, 
  Flame, 
  Activity, 
  Filter, 
  CheckCircle, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Award,
  Database
} from 'lucide-react';

interface AthleteGameLogsViewProps {
  athlete: UserProfile;
  canEdit: boolean;
  onUpdateGameLogs: (updatedLogs: GameStatEntry[]) => void;
}

export const AthleteGameLogsView: React.FC<AthleteGameLogsViewProps> = ({
  athlete,
  canEdit,
  onUpdateGameLogs
}) => {
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [showFirestoreForm, setShowFirestoreForm] = useState(false);
  const [sportFilter, setSportFilter] = useState<string>('All');
  const [resultFilter, setResultFilter] = useState<'All' | 'W' | 'L'>('All');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const logs: GameStatEntry[] = athlete.gameLogs || [];

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (sportFilter !== 'All' && log.sport !== sportFilter) return false;
    if (resultFilter !== 'All' && log.gameResult !== resultFilter) return false;
    return true;
  });

  // Calculate record & aggregates
  const totalGames = filteredLogs.length;
  const wins = filteredLogs.filter((l) => l.gameResult === 'W').length;
  const losses = filteredLogs.filter((l) => l.gameResult === 'L').length;
  const ties = filteredLogs.filter((l) => l.gameResult === 'T').length;
  const winPercentage = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

  // Aggregate PPG / Stats for Basketball or Football or Lacrosse
  const calcAverages = () => {
    if (totalGames === 0) return null;

    if (athlete.sport === 'Basketball') {
      let totalPts = 0, totalReb = 0, totalAst = 0, totalStl = 0, totalBlk = 0;
      filteredLogs.forEach((l) => {
        const s = l.stats as any;
        totalPts += s.points || 0;
        totalReb += s.rebounds || 0;
        totalAst += s.assists || 0;
        totalStl += s.steals || 0;
        totalBlk += s.blocks || 0;
      });
      return {
        label1: 'PPG', val1: (totalPts / totalGames).toFixed(1),
        label2: 'RPG', val2: (totalReb / totalGames).toFixed(1),
        label3: 'APG', val3: (totalAst / totalGames).toFixed(1),
        label4: 'SPG', val4: (totalStl / totalGames).toFixed(1)
      };
    } else if (athlete.sport === 'Flag Football') {
      let totalPassYds = 0, totalPassTd = 0, totalRushYds = 0, totalFlags = 0;
      filteredLogs.forEach((l) => {
        const s = l.stats as any;
        totalPassYds += s.passingYards || 0;
        totalPassTd += s.passingTds || 0;
        totalRushYds += s.rushingYards || 0;
        totalFlags += s.flagPulls || 0;
      });
      return {
        label1: 'PASS YPG', val1: Math.round(totalPassYds / totalGames),
        label2: 'PASS TD', val2: totalPassTd,
        label3: 'RUSH YPG', val3: Math.round(totalRushYds / totalGames),
        label4: 'FLAGS/GM', val4: (totalFlags / totalGames).toFixed(1)
      };
    } else {
      let totalGoals = 0, totalAssists = 0, totalGb = 0, totalTurnovers = 0;
      filteredLogs.forEach((l) => {
        const s = l.stats as any;
        totalGoals += s.goals || 0;
        totalAssists += s.assists || 0;
        totalGb += s.groundBalls || 0;
        totalTurnovers += s.causedTurnovers || 0;
      });
      return {
        label1: 'GOALS/GM', val1: (totalGoals / totalGames).toFixed(1),
        label2: 'AST/GM', val2: (totalAssists / totalGames).toFixed(1),
        label3: 'GB/GM', val3: (totalGb / totalGames).toFixed(1),
        label4: 'CTO/GM', val4: (totalTurnovers / totalGames).toFixed(1)
      };
    }
  };

  const averages = calcAverages();

  const handleSaveGameLog = (newLog: GameStatEntry) => {
    const updated = [newLog, ...logs];
    onUpdateGameLogs(updated);
  };

  const handleDeleteLog = (id: string) => {
    if (confirm('Are you sure you want to remove this game stat log?')) {
      const updated = logs.filter((l) => l.id !== id);
      onUpdateGameLogs(updated);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Banner & Call To Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-[#E5B868] text-black rounded-sm uppercase">
              VERIFIED GAME LOG ENGINE
            </span>
            <span className="text-xs text-slate-400 font-bold">
              {totalGames} {totalGames === 1 ? 'Game' : 'Games'} Logged
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-black uppercase text-white tracking-wide font-sans flex items-center gap-2">
            <span>Official Game-by-Game Stat Logs</span>
            <Award className="w-4 h-4 text-[#E5B868]" />
          </h3>
          <p className="text-xs text-slate-400">
            Game performance entries verified by coaches and event organizers
          </p>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowFirestoreForm(!showFirestoreForm)}
              className="px-3.5 py-2.5 bg-black/80 hover:bg-black text-[#E5B868] font-mono font-bold text-xs uppercase tracking-wider rounded-xl border border-[#E5B868]/50 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(214,28,36,0.2)]"
            >
              <Database className="w-3.5 h-3.5" />
              <span>{showFirestoreForm ? 'HIDE FORM' : 'FIRESTORE STAT FORM'}</span>
            </button>

            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="px-4 py-2.5 bg-[#E5B868] hover:bg-[#B8141B] text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(214,28,36,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>SUBMIT GAME STAT</span>
            </button>
          </div>
        )}
      </div>

      {/* StatSubmissionForm Collapsible Component */}
      {showFirestoreForm && (
        <div className="p-1 rounded-3xl bg-[#E5B868]/10 border border-[#E5B868]/40">
          <StatSubmissionForm
            athleteUid={athlete.uid}
            currentSport={athlete.sport}
            onStatSubmitted={(newStat: StatItem) => {
              const newGameEntry: GameStatEntry = {
                id: newStat.id || `glog-${Date.now()}`,
                athleteUid: athlete.uid,
                gameDate: newStat.gameDate,
                sport: newStat.sport,
                opponent: newStat.opponent,
                gameResult: newStat.gameResult,
                teamScore: newStat.teamScore,
                opponentScore: newStat.opponentScore,
                isHomeGame: true,
                notes: newStat.notes,
                stats: {
                  points: newStat.points,
                  rebounds: newStat.rebounds,
                  assists: newStat.assists,
                  steals: newStat.steals,
                  blocks: newStat.blocks
                },
                createdAt: new Date().toISOString(),
                isVerified: true
              };
              handleSaveGameLog(newGameEntry);
            }}
          />
        </div>
      )}

      {/* Season High-Level KPI Summary Card */}
      {averages && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3.5 rounded-2xl bg-[#212A31] border border-[#E5B868]/30 shadow-[0_0_15px_rgba(214,28,36,0.1)]">
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Record (W-L)</span>
            <span className="text-base font-black font-mono text-[#E5B868]">
              {wins}W - {losses}L {ties > 0 ? `- ${ties}T` : ''}
            </span>
            <span className="text-[9px] font-mono text-slate-400 block mt-0.5">{winPercentage}% Win Rate</span>
          </div>

          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">{averages.label1}</span>
            <span className="text-base font-black font-mono text-white">{averages.val1}</span>
            <span className="text-[9px] text-slate-400 block mt-0.5">Per Game Avg</span>
          </div>

          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">{averages.label2}</span>
            <span className="text-base font-black font-mono text-white">{averages.val2}</span>
            <span className="text-[9px] text-slate-400 block mt-0.5">Per Game Avg</span>
          </div>

          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">{averages.label3}</span>
            <span className="text-base font-black font-mono text-white">{averages.val3}</span>
            <span className="text-[9px] text-slate-400 block mt-0.5">Per Game Avg</span>
          </div>

          <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">{averages.label4}</span>
            <span className="text-base font-black font-mono text-white">{averages.val4}</span>
            <span className="text-[9px] text-slate-400 block mt-0.5">Per Game Avg</span>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 pb-1">
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-slate-400 font-bold uppercase mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Result:
          </span>
          {(['All', 'W', 'L'] as const).map((res) => (
            <button
              key={res}
              onClick={() => setResultFilter(res)}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all border ${
                resultFilter === res
                  ? 'bg-[#E5B868] text-black border-[#E5B868]'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
              }`}
            >
              {res === 'All' ? 'All Games' : res === 'W' ? 'Wins Only' : 'Losses Only'}
            </button>
          ))}
        </div>
      </div>

      {/* Game Logs List */}
      {filteredLogs.length === 0 ? (
        <div className="p-8 text-center bg-white/5 border border-white/10 rounded-2xl space-y-3">
          <Trophy className="w-10 h-10 text-slate-600 mx-auto" />
          <h4 className="text-sm font-bold text-slate-300 uppercase">No Game Stats Found</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {canEdit 
              ? 'Click "Submit New Game Stat" above to record your latest game metrics and build your verified scouting tape.' 
              : 'This athlete has not submitted any game stats for this filter yet.'}
          </p>
          {canEdit && (
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="mt-2 px-4 py-2 bg-[#E5B868] text-black font-bold text-xs uppercase tracking-wider rounded-xl"
            >
              Log First Game Stat
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            const stats = log.stats as any;

            return (
              <div
                key={log.id}
                className="bg-white/5 hover:bg-white/[0.07] border border-white/10 rounded-2xl p-4 transition-all space-y-3 group"
              >
                {/* Top Row: Date, Opponent, Result Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* W / L / T Badge */}
                    <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-mono font-black shrink-0 shadow-lg border ${
                      log.gameResult === 'W'
                        ? 'bg-red-600/20 text-red-500 border-red-600/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                        : log.gameResult === 'L'
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    }`}>
                      <span className="text-xs">{log.gameResult}</span>
                      <span className="text-[10px] opacity-80">{log.teamScore}-{log.opponentScore}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-[#E5B868] flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {log.gameDate}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-black/40 text-slate-300 font-mono font-bold border border-white/10">
                          {log.isHomeGame ? 'VS (HOME)' : '@ (AWAY)'}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#E5B868]/10 text-[#E5B868] font-bold border border-[#E5B868]/20">
                          {log.sport}
                        </span>
                      </div>
                      <h4 className="text-base font-black text-white italic uppercase tracking-wide mt-0.5">
                        {log.opponent}
                      </h4>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        {log.location}
                      </p>
                    </div>
                  </div>

                  {/* Right side stat highlight pill */}
                  <div className="flex items-center gap-2 self-start sm:self-center">
                    {/* Primary Stat Pill */}
                    {log.sport === 'Basketball' && (
                      <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-white/15 text-right font-mono">
                        <span className="text-sm font-black text-[#E5B868]">{stats.points} PTS</span>
                        <span className="text-[10px] text-slate-400 block">{stats.rebounds} REB • {stats.assists} AST</span>
                      </div>
                    )}
                    {log.sport === 'Flag Football' && (
                      <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-white/15 text-right font-mono">
                        <span className="text-sm font-black text-[#E5B868]">{stats.passingYards || stats.rushingYards} YDS</span>
                        <span className="text-[10px] text-slate-400 block">{stats.passingTds || stats.rushingTds} TD • {stats.flagPulls} FLAGS</span>
                      </div>
                    )}
                    {log.sport === 'Lacrosse' && (
                      <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-white/15 text-right font-mono">
                        <span className="text-sm font-black text-[#E5B868]">{stats.goals} GOALS</span>
                        <span className="text-[10px] text-slate-400 block">{stats.assists} AST • {stats.groundBalls} GB</span>
                      </div>
                    )}

                    <button
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                      title="Toggle detailed stat line"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {canEdit && (
                      <button
                        onClick={() => handleDeleteLog(log.id)}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                        title="Delete game log entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Detailed Stat Grid & Video / Notes block */}
                {isExpanded && (
                  <div className="pt-3 border-t border-white/10 space-y-3 font-sans">
                    {/* Full Stat Breakdown Line */}
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                      {log.sport === 'Basketball' && (
                        <>
                          <div className="bg-[#212A31] p-2 rounded-xl border border-white/10 text-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase block">Points</span>
                            <span className="text-xs font-mono font-black text-[#E5B868]">{stats.points}</span>
                          </div>
                          <div className="bg-[#212A31] p-2 rounded-xl border border-white/10 text-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase block">Rebounds</span>
                            <span className="text-xs font-mono font-black text-white">{stats.rebounds}</span>
                          </div>
                          <div className="bg-[#212A31] p-2 rounded-xl border border-white/10 text-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase block">Assists</span>
                            <span className="text-xs font-mono font-black text-white">{stats.assists}</span>
                          </div>
                          <div className="bg-[#212A31] p-2 rounded-xl border border-white/10 text-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase block">Steals</span>
                            <span className="text-xs font-mono font-black text-white">{stats.steals}</span>
                          </div>
                          <div className="bg-[#212A31] p-2 rounded-xl border border-white/10 text-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase block">Blocks</span>
                            <span className="text-xs font-mono font-black text-white">{stats.blocks}</span>
                          </div>
                          <div className="bg-[#212A31] p-2 rounded-xl border border-white/10 text-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase block">FG Made / Att</span>
                            <span className="text-xs font-mono font-black text-white">{stats.fgMade || 0}/{stats.fgAttempted || 0}</span>
                          </div>
                        </>
                      )}

                      {log.sport === 'Flag Football' && (
                        <>
                          <div className="bg-[#212A31] p-2 rounded-xl border border-white/10 text-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase block">Pass YDS</span>
                            <span className="text-xs font-mono font-black text-[#E5B868]">{stats.passingYards}</span>
                          </div>
                          <div className="bg-[#212A31] p-2 rounded-xl border border-white/10 text-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase block">Pass TDs</span>
                            <span className="text-xs font-mono font-black text-white">{stats.passingTds}</span>
                          </div>
                          <div className="bg-[#212A31] p-2 rounded-xl border border-white/10 text-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase block">Rush YDS</span>
                            <span className="text-xs font-mono font-black text-white">{stats.rushingYards}</span>
                          </div>
                          <div className="bg-[#212A31] p-2 rounded-xl border border-white/10 text-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase block">Flag Pulls</span>
                            <span className="text-xs font-mono font-black text-slate-300">{stats.flagPulls}</span>
                          </div>
                          <div className="bg-[#212A31] p-2 rounded-xl border border-white/10 text-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase block">INTs</span>
                            <span className="text-xs font-mono font-black text-amber-400">{stats.interceptions}</span>
                          </div>
                        </>
                      )}

                      {log.sport === 'Lacrosse' && (
                        <>
                          <div className="bg-[#212A31] p-2 rounded-xl border border-white/10 text-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase block">Goals</span>
                            <span className="text-xs font-mono font-black text-[#E5B868]">{stats.goals}</span>
                          </div>
                          <div className="bg-[#212A31] p-2 rounded-xl border border-white/10 text-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase block">Assists</span>
                            <span className="text-xs font-mono font-black text-white">{stats.assists}</span>
                          </div>
                          <div className="bg-[#212A31] p-2 rounded-xl border border-white/10 text-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase block">Ground Balls</span>
                            <span className="text-xs font-mono font-black text-white">{stats.groundBalls}</span>
                          </div>
                          <div className="bg-[#212A31] p-2 rounded-xl border border-white/10 text-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase block">Draw Controls</span>
                            <span className="text-xs font-mono font-black text-white">{stats.drawControls}</span>
                          </div>
                          <div className="bg-[#212A31] p-2 rounded-xl border border-white/10 text-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase block">Turnovers</span>
                            <span className="text-xs font-mono font-black text-white">{stats.causedTurnovers}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Notes & Video Link */}
                    {log.notes && (
                      <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-300 italic">
                        "{log.notes}"
                      </div>
                    )}

                    {log.highlightVideoUrl && (
                      <a
                        href={log.highlightVideoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E5B868]/10 text-[#E5B868] border border-[#E5B868]/30 text-xs font-bold hover:bg-[#E5B868]/20 transition-all"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>WATCH GAME HIGHLIGHT TAPE</span>
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <AddGameStatsModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        athleteUid={athlete.uid}
        currentSport={athlete.sport}
        onSaveGameLog={handleSaveGameLog}
      />
    </div>
  );
};
