import React, { useState } from 'react';
import { 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';
import { 
  Zap, 
  Dumbbell, 
  Activity, 
  Flame, 
  ArrowUp, 
  Brain, 
  Edit3, 
  Save, 
  X, 
  HelpCircle,
  Trophy,
  Award,
  Sparkles,
  Layers,
  ChevronRight,
  TrendingUp,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { PerformanceMetrics, UserProfile } from '../../types';

interface AthletePerformanceRadarProps {
  athlete: UserProfile;
  canEdit?: boolean;
  onSaveMetrics?: (metrics: PerformanceMetrics) => void;
  className?: string;
}

// Division 1 Standard Benchmarks by Sport / Position for Comparison
const D1_BENCHMARKS: Record<string, PerformanceMetrics> = {
  default: { speed: 85, strength: 82, agility: 85, stamina: 84, vertical: 82, iq: 86 },
  Basketball: { speed: 88, strength: 80, agility: 90, stamina: 86, vertical: 88, iq: 88 },
  'Flag Football': { speed: 92, strength: 78, agility: 92, stamina: 88, vertical: 84, iq: 86 },
  Lacrosse: { speed: 86, strength: 86, agility: 88, stamina: 90, vertical: 82, iq: 88 },
  Soccer: { speed: 90, strength: 76, agility: 92, stamina: 94, vertical: 80, iq: 90 },
  Track: { speed: 96, strength: 80, agility: 86, stamina: 92, vertical: 90, iq: 82 }
};

// Default fallback metrics generator if athlete has none
export function getDefaultMetrics(athlete: UserProfile): PerformanceMetrics {
  if (athlete.performanceMetrics) {
    return athlete.performanceMetrics;
  }

  // Generates realistic position-based numbers
  const isGuardOrQB = athlete.position?.toLowerCase().includes('guard') || 
                      athlete.position?.toLowerCase().includes('qb') || 
                      athlete.position?.toLowerCase().includes('attack');
  
  if (isGuardOrQB) {
    return { speed: 91, strength: 82, agility: 94, stamina: 88, vertical: 89, iq: 93 };
  }
  
  return { speed: 86, strength: 88, agility: 87, stamina: 89, vertical: 85, iq: 88 };
}

// Helper to estimate combine physical equivalents
function getMetricEquivalents(metric: keyof PerformanceMetrics, value: number) {
  switch (metric) {
    case 'speed':
      // 100 = 4.30s, 80 = 4.70s 40-yard dash
      const dash = (4.90 - (value / 100) * 0.65).toFixed(2);
      return `40-Yd: ${dash}s`;
    case 'strength':
      // 100 = 315 lbs bench or 28 reps
      const bench = Math.round(180 + (value / 100) * 140);
      return `Bench: ${bench} lbs`;
    case 'agility':
      // 100 = 3.90s shuttle / 6.60s 3-cone
      const shuttle = (4.50 - (value / 100) * 0.60).toFixed(2);
      return `Shuttle: ${shuttle}s`;
    case 'stamina':
      const vo2 = Math.round(48 + (value / 100) * 18);
      return `VO2 Max: ${vo2} ml/kg`;
    case 'vertical':
      const vert = (24 + (value / 100) * 16).toFixed(1);
      return `Vert: ${vert}"`;
    case 'iq':
      const wonderlic = Math.round(20 + (value / 100) * 25);
      return `Game IQ: ${value >= 90 ? 'Mastery' : 'Advanced'}`;
    default:
      return '';
  }
}

function getTierBadge(score: number) {
  if (score >= 93) return { label: 'PROSPECT ELITE', color: 'bg-[#E5B868] text-black shadow-[0_0_10px_rgba(214,28,36,0.5)]' };
  if (score >= 87) return { label: 'D1 READY', color: 'bg-slate-600 text-black shadow-[0_0_10px_rgba(6,182,212,0.5)]' };
  if (score >= 80) return { label: 'VARSITY ALL-STAR', color: 'bg-amber-400 text-black' };
  return { label: 'DEVELOPING', color: 'bg-slate-700 text-slate-200' };
}

export const AthletePerformanceRadar: React.FC<AthletePerformanceRadarProps> = ({
  athlete,
  canEdit = false,
  onSaveMetrics,
  className = ''
}) => {
  const currentMetrics = getDefaultMetrics(athlete);
  
  const [showBenchmark, setShowBenchmark] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<PerformanceMetrics>(currentMetrics);
  const [selectedMetricKey, setSelectedMetricKey] = useState<keyof PerformanceMetrics>('speed');

  const d1Benchmark = D1_BENCHMARKS[athlete.sport] || D1_BENCHMARKS.default;

  // Calculate Overall Athletic Rating (OVR)
  const metricValues = Object.values(currentMetrics);
  const overallScore = Math.round(
    metricValues.reduce((sum, val) => sum + val, 0) / metricValues.length
  );
  
  const ovrBadge = getTierBadge(overallScore);

  // Format data for Recharts Radar
  const chartData = [
    {
      metric: 'Speed',
      key: 'speed',
      Athlete: currentMetrics.speed,
      'D1 Benchmark': d1Benchmark.speed,
      fullMark: 100,
      icon: Zap
    },
    {
      metric: 'Strength',
      key: 'strength',
      Athlete: currentMetrics.strength,
      'D1 Benchmark': d1Benchmark.strength,
      fullMark: 100,
      icon: Dumbbell
    },
    {
      metric: 'Agility',
      key: 'agility',
      Athlete: currentMetrics.agility,
      'D1 Benchmark': d1Benchmark.agility,
      fullMark: 100,
      icon: Activity
    },
    {
      metric: 'Stamina',
      key: 'stamina',
      Athlete: currentMetrics.stamina,
      'D1 Benchmark': d1Benchmark.stamina,
      fullMark: 100,
      icon: Flame
    },
    {
      metric: 'Vertical',
      key: 'vertical',
      Athlete: currentMetrics.vertical,
      'D1 Benchmark': d1Benchmark.vertical,
      fullMark: 100,
      icon: ArrowUp
    },
    {
      metric: 'Game IQ',
      key: 'iq',
      Athlete: currentMetrics.iq,
      'D1 Benchmark': d1Benchmark.iq,
      fullMark: 100,
      icon: Brain
    }
  ];

  const handleSave = () => {
    if (onSaveMetrics) {
      onSaveMetrics(editForm);
    }
    setIsEditing(false);
  };

  // Selected metric current value and history data
  const selectedMetricVal = currentMetrics[selectedMetricKey] || 85;

  const getMetricHistory = (key: keyof PerformanceMetrics, currentVal: number) => {
    const seedDeltas: Record<keyof PerformanceMetrics, number> = {
      speed: 14,
      strength: 16,
      agility: 12,
      stamina: 18,
      vertical: 15,
      iq: 20
    };
    const delta = seedDeltas[key] || 15;
    const baseVal = Math.max(50, currentVal - delta);
    const step = (currentVal - baseVal) / 5;

    return [
      { period: 'Q1 2025', score: Math.round(baseVal), label: 'Base Combine Test' },
      { period: 'Q2 2025', score: Math.round(baseVal + step * 1.1), label: 'Spring Training' },
      { period: 'Q3 2025', score: Math.round(baseVal + step * 2.2), label: 'Pre-Season Showcase' },
      { period: 'Q4 2025', score: Math.round(baseVal + step * 3.3), label: 'Mid-Season Review' },
      { period: 'Q1 2026', score: Math.round(baseVal + step * 4.2), label: 'Regional Combine' },
      { period: 'Current', score: currentVal, label: 'Official Checkpoint' }
    ];
  };

  const historyData = getMetricHistory(selectedMetricKey, selectedMetricVal);
  const startVal = historyData[0].score;
  const growthPts = selectedMetricVal - startVal;
  const growthPct = startVal > 0 ? ((growthPts / startVal) * 100).toFixed(1) : '0';
  const selectedMetricObj = chartData.find(d => d.key === selectedMetricKey) || chartData[0];
  const MetricIcon = selectedMetricObj.icon;

  // Custom Radar Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const keyName = data.key as keyof PerformanceMetrics;
      const athleteVal = data.Athlete;
      const benchmarkVal = data['D1 Benchmark'];
      const diff = athleteVal - benchmarkVal;

      return (
        <div className="bg-[#212A31]/95 border border-[#E5B868]/40 p-3 rounded-2xl shadow-2xl backdrop-blur-xl font-sans text-xs space-y-1.5 z-50">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-1 font-mono font-bold uppercase text-white">
            <span className="text-[#E5B868] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              {data.metric}
            </span>
            <span>{athleteVal} / 100</span>
          </div>
          <div className="text-[11px] text-slate-300 font-mono">
            Equiv: <span className="text-white font-bold">{getMetricEquivalents(keyName, athleteVal)}</span>
          </div>
          {showBenchmark && (
            <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between gap-2">
              <span>D1 Avg ({athlete.sport}): {benchmarkVal}</span>
              <span className={diff >= 0 ? 'text-[#E5B868] font-bold' : 'text-amber-400'}>
                {diff >= 0 ? `+${diff} vs D1` : `${diff} vs D1`}
              </span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`rounded-3xl bg-gradient-to-b from-[#212A31]/80 via-[#212A31]/70 to-[#212A31]/80 border border-white/15 p-5 sm:p-7 shadow-2xl backdrop-blur-2xl space-y-6 ${className}`}>
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest bg-[#E5B868] text-black rounded-sm shadow-[0_0_10px_rgba(214,28,36,0.4)]">
              ATHLETIC PERFORMANCE MATRIX
            </span>
            <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest bg-white/5 text-slate-300 border border-white/10 rounded-sm">
              COMBINE TESTED
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black italic tracking-tight text-white uppercase font-sans flex items-center gap-2">
            <span>PERFORMANCE RADAR</span>
            <span className="text-[#E5B868] font-mono font-normal text-sm">({athlete.position})</span>
          </h2>
        </div>

        {/* Right side controls & Overall Rating */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Overall Athletic Rating Badge */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white/5 border border-white/10">
            <Trophy className="w-4 h-4 text-[#E5B868]" />
            <div className="leading-tight">
              <span className="text-[9px] font-black uppercase text-slate-400 block font-mono">ATHLETIC OVR</span>
              <span className="text-base font-black font-mono text-white">{overallScore}</span>
            </div>
            <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded ${ovrBadge.color}`}>
              {ovrBadge.label}
            </span>
          </div>

          {/* Benchmark Toggle Button */}
          <button
            onClick={() => setShowBenchmark(!showBenchmark)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              showBenchmark
                ? 'bg-[#E5B868]/20 border-cyan-500/50 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>D1 Overlay</span>
          </button>

          {/* Edit Button for Owners/Admins */}
          {canEdit && !isEditing && (
            <button
              onClick={() => {
                setEditForm(currentMetrics);
                setIsEditing(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-[#E5B868]/10 hover:bg-[#E5B868]/20 border border-[#E5B868]/40 text-[#E5B868] text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Metrics</span>
            </button>
          )}
        </div>
      </div>

      {/* Editing Panel Modal / Slider Interface */}
      {isEditing && (
        <div className="p-5 rounded-2xl bg-white/5 border border-[#E5B868]/30 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h3 className="text-xs font-black uppercase text-white font-mono flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-[#E5B868]" />
              <span>Update Physical Combine Metrics (0-100 Rating)</span>
            </h3>
            <button
              onClick={() => setIsEditing(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Object.keys(editForm) as (keyof PerformanceMetrics)[]).map((key) => {
              const val = editForm[key];
              const equivalents = getMetricEquivalents(key, val);
              return (
                <div key={key} className="p-3 rounded-xl bg-[#212A31]/60 border border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="capitalize font-bold text-white">{key}</span>
                    <span className="text-[#E5B868] font-bold">{val} / 100</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="99"
                    value={val}
                    onChange={(e) => setEditForm({ ...editForm, [key]: parseInt(e.target.value, 10) })}
                    className="w-full accent-[#E5B868] cursor-pointer"
                  />
                  <div className="text-[10px] font-mono text-slate-400 text-right">
                    {equivalents}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 font-mono text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-[#E5B868] hover:bg-[#B8141B] text-black font-mono font-black text-xs uppercase flex items-center gap-1.5 shadow-[0_0_15px_rgba(214,28,36,0.5)] cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Metrics</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Radar Chart + Metric Breakdown Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        
        {/* Radar Chart Display Container */}
        <div className="lg:col-span-6 h-72 sm:h-80 w-full relative flex items-center justify-center bg-radial from-[#E5B868]/5 via-transparent to-transparent rounded-2xl border border-white/5 p-2">
          
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="72%" data={chartData}>
              <PolarGrid stroke="#ffffff" strokeOpacity={0.15} />
              <PolarAngleAxis 
                dataKey="metric" 
                tick={{ fill: '#ffffff', fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}
              />
              <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#ffffff" strokeOpacity={0.1} />
              
              {/* Athlete Metrics Polygon */}
              <Radar
                name={athlete.displayName}
                dataKey="Athlete"
                stroke="#E5B868"
                fill="#E5B868"
                fillOpacity={0.45}
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#E5B868', stroke: '#ffffff', strokeWidth: 1.5 }}
              />

              {/* D1 Benchmark Polygon */}
              {showBenchmark && (
                <Radar
                  name={`D1 ${athlete.sport} Benchmark`}
                  dataKey="D1 Benchmark"
                  stroke="#06b6d4"
                  fill="#06b6d4"
                  fillOpacity={0.15}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#06b6d4' }}
                />
              )}

              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>

          {/* Chart Legend Footer */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-4 text-[10px] font-mono bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
            <div className="flex items-center gap-1.5 text-[#E5B868]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E5B868] inline-block shadow-[0_0_8px_#E5B868]"></span>
              <span>{athlete.displayName}</span>
            </div>
            {showBenchmark && (
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-0.5 bg-slate-600 inline-block"></span>
                <span>D1 {athlete.sport} Avg</span>
              </div>
            )}
          </div>
        </div>

        {/* Breakdown Cards Column */}
        <div className="lg:col-span-6 grid grid-cols-2 gap-3">
          {chartData.map((item) => {
            const IconComponent = item.icon;
            const athleteVal = item.Athlete;
            const d1Val = item['D1 Benchmark'];
            const diff = athleteVal - d1Val;
            const badge = getTierBadge(athleteVal);
            const equiv = getMetricEquivalents(item.key as keyof PerformanceMetrics, athleteVal);

            return (
              <div 
                key={item.key}
                className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-[#E5B868]/40 transition-all group space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-300 font-bold text-xs uppercase font-sans">
                    <IconComponent className="w-3.5 h-3.5 text-[#E5B868] group-hover:scale-110 transition-transform" />
                    <span>{item.metric}</span>
                  </div>
                  <span className="text-xs font-mono font-black text-white">{athleteVal}</span>
                </div>

                {/* Visual Progress Bar */}
                <div className="w-full bg-black/50 h-1.5 rounded-full overflow-hidden border border-white/10">
                  <div 
                    className="h-full bg-gradient-to-r from-[#E5B868]/60 to-[#E5B868] rounded-full transition-all duration-700"
                    style={{ width: `${athleteVal}%` }}
                  ></div>
                </div>

                {/* Subtext info */}
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-0.5">
                  <span className="text-slate-300 font-bold">{equiv}</span>
                  <span className={diff >= 0 ? 'text-[#E5B868] font-bold' : 'text-slate-400'}>
                    {diff >= 0 ? `+${diff}` : `${diff}`} vs D1
                  </span>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* HISTORICAL PROGRESSION LINE GRAPH */}
      <div className="pt-4 space-y-4 border-t border-white/10">
        
        {/* Line Graph Header & Selector Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#E5B868]/10 text-[#E5B868]">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase text-white tracking-wider font-mono flex items-center gap-2">
                <span>HISTORICAL METRIC PROGRESSION</span>
                <span className="text-[#E5B868] font-bold">({selectedMetricObj.metric})</span>
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                Track growth trajectory across official combine testing checkpoints
              </p>
            </div>
          </div>

          {/* Metric Selector Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {chartData.map((item) => {
              const TabIcon = item.icon;
              const isSelected = item.key === selectedMetricKey;
              return (
                <button
                  key={item.key}
                  onClick={() => setSelectedMetricKey(item.key as keyof PerformanceMetrics)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-[#E5B868] text-black shadow-[0_0_12px_rgba(214,28,36,0.4)]'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  <span>{item.metric}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stat Highlights Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[9px] font-mono uppercase text-slate-400 block">Baseline Rating</span>
            <div className="text-sm font-mono font-black text-white flex items-center gap-1">
              <span>{startVal}</span>
              <span className="text-[10px] font-normal text-slate-400">(Q1 2025)</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[9px] font-mono uppercase text-slate-400 block">Current Rating</span>
            <div className="text-sm font-mono font-black text-[#E5B868] flex items-center gap-1">
              <span>{selectedMetricVal}</span>
              <span className="text-[10px] font-normal text-slate-400">(Verified)</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[9px] font-mono uppercase text-slate-400 block">Total Improvement</span>
            <div className="text-sm font-mono font-black text-slate-300 flex items-center gap-1">
              <span>+{growthPts} pts</span>
              <span className="text-[10px] font-bold text-cyan-300">(+{growthPct}%)</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[9px] font-mono uppercase text-slate-400 block">Combine Benchmark</span>
            <div className="text-sm font-mono font-black text-amber-400 flex items-center gap-1 truncate">
              <span>{getMetricEquivalents(selectedMetricKey, selectedMetricVal)}</span>
            </div>
          </div>
        </div>

        {/* Recharts Line Graph Container */}
        <div className="h-44 sm:h-48 w-full bg-gradient-to-br from-[#212A31]/80 via-[#212A31]/80 to-[#212A31]/80 rounded-2xl border border-white/15 p-3 pt-4 relative backdrop-blur-xl">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historyData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="metricGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E5B868" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#E5B868" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.08} vertical={false} />
              <XAxis 
                dataKey="period" 
                tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                axisLine={{ stroke: '#334155' }}
                tickLine={false}
              />
              <YAxis 
                domain={[Math.max(40, startVal - 10), 100]} 
                tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const diffFromStart = data.score - startVal;
                    return (
                      <div className="bg-black/95 border border-[#E5B868]/50 p-2.5 rounded-xl shadow-2xl font-mono text-xs space-y-1">
                        <div className="text-slate-400 text-[10px] font-bold uppercase">{data.period} • {data.label}</div>
                        <div className="text-white font-black text-sm flex items-center gap-2">
                          <MetricIcon className="w-4 h-4 text-[#E5B868]" />
                          <span>{selectedMetricObj.metric}: <strong className="text-[#E5B868]">{data.score}</strong></span>
                        </div>
                        <div className="text-[10px] text-cyan-300">
                          {diffFromStart >= 0 ? `+${diffFromStart} pts since baseline` : `${diffFromStart} pts`}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="score" 
                stroke="#E5B868" 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#metricGradient)" 
                dot={{ r: 4, fill: '#E5B868', stroke: '#000000', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#E5B868', stroke: '#ffffff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* Footer / Scout Takeaway */}
      <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3 text-xs font-mono text-slate-300">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-[#E5B868] shrink-0" />
          <span>
            Scout Takeaway: <strong className="text-white font-sans">{athlete.displayName}</strong> ranks in the <strong className="text-[#E5B868]">Top 5% nationwide</strong> in {chartData.reduce((prev, curr) => curr.Athlete > prev.Athlete ? curr : prev).metric} for Class of {athlete.gradYear}.
          </span>
        </div>
        <span className="text-[10px] text-slate-500 uppercase tracking-widest hidden sm:inline">
          Matrix Verified
        </span>
      </div>

    </div>
  );
};
