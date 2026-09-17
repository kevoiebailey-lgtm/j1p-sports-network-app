import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { GameStatEntry } from '../../types';
import { StatItem } from './StatSubmissionForm';
import { SPORTS_CATEGORIES, getSportEmoji } from '../../lib/sports';
import { motion, AnimatePresence } from 'motion/react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import {
  TrendingUp,
  BarChart2,
  LineChart as LineChartIcon,
  Activity,
  Trophy,
  Filter,
  Zap,
  Calendar,
  Flame,
  Award,
  ChevronRight,
  HelpCircle,
  Maximize2
} from 'lucide-react';

export interface UnifiedChartPoint {
  id: string;
  gameDate: string;
  formattedDate: string;
  opponent: string;
  sport: string;
  result: 'W' | 'L' | 'T';
  teamScore: number;
  opponentScore: number;
  points: number;
  assists: number;
  rebounds: number;
  steals: number;
  blocks: number;
  pointDiff: number;
  notes?: string;
}

interface SeasonPerformanceChartProps {
  athleteUid: string;
  initialGameLogs?: GameStatEntry[];
  currentSport?: string;
}

type ChartType = 'area' | 'bar' | 'line';
type PrimaryMetric = 'points' | 'allStats' | 'teamScore';

export const SeasonPerformanceChart: React.FC<SeasonPerformanceChartProps> = ({
  athleteUid,
  initialGameLogs = [],
  currentSport = 'All'
}) => {
  const [selectedSport, setSelectedSport] = useState<string>('All');
  const [chartType, setChartType] = useState<ChartType>('area');
  const [primaryMetric, setPrimaryMetric] = useState<PrimaryMetric>('points');
  const [firestoreStats, setFirestoreStats] = useState<StatItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 1. Subscribe to Firestore subcollection: users/{athleteUid}/Stats
  useEffect(() => {
    if (!athleteUid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const statsRef = collection(db, 'users', athleteUid, 'Stats');
    const q = query(statsRef, orderBy('gameDate', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs: StatItem[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<StatItem, 'id'>)
        }));
        setFirestoreStats(docs);
        setLoading(false);
      },
      (err) => {
        console.warn('Firestore season chart error:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [athleteUid]);

  // 2. Normalize and merge initialGameLogs + firestoreStats
  const normalizedData = useMemo(() => {
    const map = new Map<string, UnifiedChartPoint>();

    // Process initial profile gameLogs
    initialGameLogs.forEach((log) => {
      const s = (log.stats || {}) as any;
      const pts = s.points ?? s.goals ?? s.passingTds ?? 0;
      const ast = s.assists ?? s.passingYards ?? 0;
      const reb = s.rebounds ?? s.groundBalls ?? s.rushingYards ?? 0;
      const stl = s.steals ?? s.causedTurnovers ?? s.flagPulls ?? 0;
      const blk = s.blocks ?? s.sacks ?? 0;

      // Format date for display e.g. "Jul 22"
      let formattedDate = log.gameDate;
      if (log.gameDate && log.gameDate.includes('-')) {
        const parts = log.gameDate.split('-');
        if (parts.length === 3) {
          const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
      }

      const key = log.id || `${log.gameDate}-${log.opponent}`;
      map.set(key, {
        id: key,
        gameDate: log.gameDate,
        formattedDate,
        opponent: log.opponent,
        sport: log.sport || 'Basketball',
        result: log.gameResult,
        teamScore: Number(log.teamScore) || 0,
        opponentScore: Number(log.opponentScore) || 0,
        points: Number(pts),
        assists: Number(ast),
        rebounds: Number(reb),
        steals: Number(stl),
        blocks: Number(blk),
        pointDiff: (Number(log.teamScore) || 0) - (Number(log.opponentScore) || 0),
        notes: log.notes
      });
    });

    // Process Firestore real-time subcollection items (overwrites/adds)
    firestoreStats.forEach((st) => {
      let formattedDate = st.gameDate;
      if (st.gameDate && st.gameDate.includes('-')) {
        const parts = st.gameDate.split('-');
        if (parts.length === 3) {
          const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
      }

      const key = st.id || `${st.gameDate}-${st.opponent}`;
      map.set(key, {
        id: key,
        gameDate: st.gameDate,
        formattedDate,
        opponent: st.opponent,
        sport: st.sport || 'Basketball',
        result: st.gameResult,
        teamScore: Number(st.teamScore) || 0,
        opponentScore: Number(st.opponentScore) || 0,
        points: Number(st.points) || 0,
        assists: Number(st.assists) || 0,
        rebounds: Number(st.rebounds) || 0,
        steals: Number(st.steals) || 0,
        blocks: Number(st.blocks) || 0,
        pointDiff: (Number(st.teamScore) || 0) - (Number(st.opponentScore) || 0),
        notes: st.notes
      });
    });

    // Convert map to array and sort chronologically by gameDate asc
    const resultList = Array.from(map.values());
    resultList.sort((a, b) => (a.gameDate > b.gameDate ? 1 : -1));
    return resultList;
  }, [initialGameLogs, firestoreStats]);

  // Extract unique sports present in data
  const availableSports = useMemo(() => {
    const sportsSet = new Set<string>();
    normalizedData.forEach((d) => {
      if (d.sport) sportsSet.add(d.sport);
    });
    return Array.from(sportsSet);
  }, [normalizedData]);

  // Filter dataset by sport
  const chartData = useMemo(() => {
    if (selectedSport === 'All') return normalizedData;
    return normalizedData.filter((d) => d.sport === selectedSport);
  }, [normalizedData, selectedSport]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    if (chartData.length === 0) {
      return { games: 0, winRate: 0, avgPoints: 0, maxPoints: 0, avgRebounds: 0, avgAssists: 0, totalPts: 0 };
    }

    const games = chartData.length;
    const wins = chartData.filter((d) => d.result === 'W').length;
    const winRate = Math.round((wins / games) * 100);

    const totalPts = chartData.reduce((acc, d) => acc + d.points, 0);
    const maxPts = Math.max(...chartData.map((d) => d.points));
    const avgPts = (totalPts / games).toFixed(1);

    const totalReb = chartData.reduce((acc, d) => acc + d.rebounds, 0);
    const avgReb = (totalReb / games).toFixed(1);

    const totalAst = chartData.reduce((acc, d) => acc + d.assists, 0);
    const avgAst = (totalAst / games).toFixed(1);

    return {
      games,
      winRate,
      avgPoints: Number(avgPts),
      maxPoints: maxPts,
      avgRebounds: Number(avgReb),
      avgAssists: Number(avgAst),
      totalPts
    };
  }, [chartData]);

  // Dynamic axis label based on selected sport
  const getMetricTitle = () => {
    if (selectedSport === 'Flag Football' || selectedSport === 'Football') return 'TDs / Points';
    if (selectedSport === 'Lacrosse' || selectedSport === 'Soccer') return 'Goals Scored';
    return 'Points Scored';
  };

  // Custom Glassmorphic Recharts Tooltip
  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data: UnifiedChartPoint = payload[0].payload;
      return (
        <div className="bg-[#212A31]/95 border-2 border-[#E5B868] p-3.5 rounded-2xl shadow-[0_0_25px_rgba(214,28,36,0.3)] backdrop-blur-md text-white min-w-[200px] z-50">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10 mb-2">
            <div>
              <div className="text-[10px] font-mono font-bold text-slate-400">{data.formattedDate} ({data.gameDate})</div>
              <div className="text-xs font-black text-white flex items-center gap-1 mt-0.5">
                <span>{getSportEmoji(data.sport)}</span>
                <span className="truncate max-w-[130px]">vs {data.opponent}</span>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-black ${
              data.result === 'W' 
                ? 'bg-red-600/20 text-red-500 border border-red-600/40' 
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
            }`}>
              {data.result} {data.teamScore}-{data.opponentScore}
            </span>
          </div>

          <div className="space-y-1 font-mono text-xs">
            <div className="flex justify-between items-center text-[#E5B868] font-extrabold">
              <span>{getMetricTitle()}:</span>
              <span className="text-sm">{data.points}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Assists / Yds:</span>
              <span>{data.assists}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Rebounds / Rec:</span>
              <span>{data.rebounds}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Steals / Def:</span>
              <span>{data.steals}</span>
            </div>
            {data.blocks > 0 && (
              <div className="flex justify-between items-center text-slate-300">
                <span>Blocks:</span>
                <span>{data.blocks}</span>
              </div>
            )}
          </div>

          {data.notes && (
            <div className="mt-2.5 pt-2 border-t border-white/10 text-[10px] italic text-slate-300 line-clamp-2">
              "{data.notes}"
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-5">
      {/* Header & Filter Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl bg-[#212A31] border border-white/10 relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#E5B868]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#E5B868]/20 text-[#E5B868] border border-[#E5B868]/30 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Recharts Analytics
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {chartData.length} {chartData.length === 1 ? 'Game Logged' : 'Games Logged'}
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-black italic uppercase tracking-wider text-white flex items-center gap-2">
            Season Performance & Trend
          </h3>
          <p className="text-xs text-slate-400">
            Game-by-game statistical progression and offensive impact trajectory over time.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 z-10">
          {/* Sport Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-[#212A31] border border-white/10 rounded-2xl px-3 py-1.5">
            <Filter className="w-3.5 h-3.5 text-[#E5B868]" />
            <select
              value={selectedSport}
              onChange={(e) => setSelectedSport(e.target.value)}
              className="bg-transparent text-xs text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value="All">🏆 All Sports ({normalizedData.length})</option>
              {availableSports.map((sp) => (
                <option key={sp} value={sp}>
                  {getSportEmoji(sp)} {sp}
                </option>
              ))}
              {SPORTS_CATEGORIES.map((cat) => (
                <optgroup key={cat.name} label={cat.name}>
                  {cat.sports.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.emoji} {s.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Metric Mode Toggle */}
          <div className="flex items-center bg-[#212A31] border border-white/10 rounded-2xl p-1 gap-1">
            <button
              onClick={() => setPrimaryMetric('points')}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer ${
                primaryMetric === 'points'
                  ? 'bg-[#E5B868] text-black shadow-[0_0_10px_rgba(214,28,36,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Scoring
            </button>
            <button
              onClick={() => setPrimaryMetric('allStats')}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer ${
                primaryMetric === 'allStats'
                  ? 'bg-[#E5B868] text-black shadow-[0_0_10px_rgba(214,28,36,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Multi-Metric
            </button>
            <button
              onClick={() => setPrimaryMetric('teamScore')}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer ${
                primaryMetric === 'teamScore'
                  ? 'bg-[#E5B868] text-black shadow-[0_0_10px_rgba(214,28,36,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Team Scores
            </button>
          </div>

          {/* Chart Type Toggle */}
          <div className="flex items-center bg-[#212A31] border border-white/10 rounded-2xl p-1 gap-1">
            <button
              onClick={() => setChartType('area')}
              title="Area Trend Chart"
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                chartType === 'area' ? 'bg-white/20 text-[#E5B868]' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType('line')}
              title="Line Chart"
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                chartType === 'line' ? 'bg-white/20 text-[#E5B868]' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LineChartIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType('bar')}
              title="Bar Chart"
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                chartType === 'bar' ? 'bg-white/20 text-[#E5B868]' : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Season Avg</span>
            <Flame className="w-3.5 h-3.5 text-[#E5B868]" />
          </p>
          <p className="text-xl font-black font-mono text-[#E5B868] mt-1">
            {kpis.avgPoints} <span className="text-xs font-sans text-slate-300 font-normal">PPG</span>
          </p>
          <span className="text-[9px] text-slate-400 font-mono">
            {kpis.totalPts} total pts scored
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Season High</span>
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
          </p>
          <p className="text-xl font-black font-mono text-white mt-1">
            {kpis.maxPoints} <span className="text-xs font-sans text-slate-300 font-normal">PTS</span>
          </p>
          <span className="text-[9px] text-slate-400 font-mono">Single game record</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Win Rate</span>
            <Award className="w-3.5 h-3.5 text-red-500" />
          </p>
          <p className="text-xl font-black font-mono text-red-500 mt-1">
            {kpis.winRate}%
          </p>
          <span className="text-[9px] text-slate-400 font-mono">{kpis.games} total games logged</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Rebounds / Assists</span>
            <Zap className="w-3.5 h-3.5 text-slate-300" />
          </p>
          <p className="text-xl font-black font-mono text-white mt-1">
            {kpis.avgRebounds} <span className="text-xs font-sans text-slate-400 font-normal">RPG</span> / {kpis.avgAssists} <span className="text-xs font-sans text-slate-400 font-normal">APG</span>
          </p>
          <span className="text-[9px] text-slate-400 font-mono">Floor impact rating</span>
        </div>
      </div>

      {/* Main Visual Recharts Viewport */}
      <div className="p-4 sm:p-6 rounded-3xl bg-[#212A31] border border-white/10 min-h-[340px] flex flex-col justify-center relative">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <Activity className="w-8 h-8 text-[#E5B868] animate-spin mx-auto" />
            <p className="text-xs font-mono text-slate-400">Loading Recharts Performance Data...</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="py-12 text-center max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-400">
              <BarChart2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">No Game Logs Found for {selectedSport}</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Use the <span className="text-[#E5B868] font-bold">Game Stat Submission Form</span> above to submit your first game entry. Stats will instantly plot on this interactive chart!
            </p>
          </div>
        ) : (
          <div className="w-full h-[280px] sm:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E5B868" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#E5B868" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorAssists" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00E0FF" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00E0FF" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorTeam" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis 
                    dataKey="formattedDate" 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false}
                  />
                  <Tooltip content={<CustomChartTooltip />} />

                  {/* Reference line for season average */}
                  <ReferenceLine 
                    y={kpis.avgPoints} 
                    stroke="#E5B868" 
                    strokeDasharray="4 4" 
                    label={{ value: `Avg: ${kpis.avgPoints}`, fill: '#E5B868', fontSize: 10, position: 'top' }} 
                  />

                  {primaryMetric === 'points' && (
                    <Area
                      type="monotone"
                      dataKey="points"
                      name={getMetricTitle()}
                      stroke="#E5B868"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorPoints)"
                      dot={{ fill: '#E5B868', r: 4, strokeWidth: 2, stroke: '#212A31' }}
                      activeDot={{ r: 7, stroke: '#E5B868', strokeWidth: 2, fill: '#ffffff' }}
                    />
                  )}

                  {primaryMetric === 'allStats' && (
                    <>
                      <Area
                        type="monotone"
                        dataKey="points"
                        name={getMetricTitle()}
                        stroke="#E5B868"
                        strokeWidth={2.5}
                        fillOpacity={0.3}
                        fill="url(#colorPoints)"
                        dot={{ fill: '#E5B868', r: 3 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="assists"
                        name="Assists / Yds"
                        stroke="#00E0FF"
                        strokeWidth={2}
                        fillOpacity={0.2}
                        fill="url(#colorAssists)"
                        dot={{ fill: '#00E0FF', r: 3 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="rebounds"
                        name="Rebounds / Rec"
                        stroke="#A855F7"
                        strokeWidth={2}
                        fillOpacity={0.1}
                        fill="#A855F7"
                        dot={{ fill: '#A855F7', r: 3 }}
                      />
                    </>
                  )}

                  {primaryMetric === 'teamScore' && (
                    <>
                      <Area
                        type="monotone"
                        dataKey="teamScore"
                        name="Team Score"
                        stroke="#10B981"
                        strokeWidth={2.5}
                        fillOpacity={0.4}
                        fill="url(#colorTeam)"
                      />
                      <Area
                        type="monotone"
                        dataKey="opponentScore"
                        name="Opponent Score"
                        stroke="#F43F5E"
                        strokeWidth={2}
                        fillOpacity={0.1}
                        fill="#F43F5E"
                      />
                    </>
                  )}
                </AreaChart>
              ) : chartType === 'line' ? (
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="formattedDate" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <Tooltip content={<CustomChartTooltip />} />

                  <ReferenceLine 
                    y={kpis.avgPoints} 
                    stroke="#E5B868" 
                    strokeDasharray="4 4" 
                  />

                  <Line
                    type="monotone"
                    dataKey="points"
                    name={getMetricTitle()}
                    stroke="#E5B868"
                    strokeWidth={3}
                    dot={{ fill: '#E5B868', r: 4 }}
                    activeDot={{ r: 7, stroke: '#E5B868', fill: '#fff' }}
                  />
                  {primaryMetric === 'allStats' && (
                    <>
                      <Line
                        type="monotone"
                        dataKey="assists"
                        name="Assists"
                        stroke="#00E0FF"
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="rebounds"
                        name="Rebounds"
                        stroke="#A855F7"
                        strokeWidth={2}
                      />
                    </>
                  )}
                  {primaryMetric === 'teamScore' && (
                    <>
                      <Line type="monotone" dataKey="teamScore" stroke="#10B981" strokeWidth={2.5} />
                      <Line type="monotone" dataKey="opponentScore" stroke="#F43F5E" strokeWidth={2} />
                    </>
                  )}
                </LineChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="formattedDate" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <Tooltip content={<CustomChartTooltip />} />

                  {primaryMetric === 'points' && (
                    <Bar 
                      dataKey="points" 
                      name={getMetricTitle()} 
                      fill="#E5B868" 
                      radius={[6, 6, 0, 0]} 
                    />
                  )}

                  {primaryMetric === 'allStats' && (
                    <>
                      <Bar dataKey="points" name="Points" fill="#E5B868" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="assists" name="Assists" fill="#00E0FF" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="rebounds" name="Rebounds" fill="#A855F7" radius={[4, 4, 0, 0]} />
                    </>
                  )}

                  {primaryMetric === 'teamScore' && (
                    <>
                      <Bar dataKey="teamScore" name="Team" fill="#10B981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="opponentScore" name="Opponent" fill="#F43F5E" radius={[4, 4, 0, 0]} />
                    </>
                  )}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};
