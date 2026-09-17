import React, { useState } from 'react';
import { Target, Activity, Flame, Shield, Award, Sparkles, Filter, Plus, RefreshCw, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface ShotLocation {
  id: string;
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  outcome: 'made' | 'missed' | 'touchdown' | 'turnover';
  points?: number;
  playType?: string;
  distanceFeet?: number;
  period?: string;
  timestamp?: string;
}

interface ShotChartHeatmapProps {
  sport?: string;
  athleteName?: string;
  initialShots?: ShotLocation[];
  onLogShot?: (shot: ShotLocation) => void;
  readOnly?: boolean;
}

const DEFAULT_BASKETBALL_SHOTS: ShotLocation[] = [
  // Paint / Rim finishes
  { id: 's1', x: 50, y: 88, outcome: 'made', points: 2, playType: 'Layup', distanceFeet: 3, period: 'Q1' },
  { id: 's2', x: 48, y: 85, outcome: 'made', points: 2, playType: 'Floater', distanceFeet: 6, period: 'Q1' },
  { id: 's3', x: 52, y: 82, outcome: 'missed', points: 2, playType: 'Contested Hook', distanceFeet: 8, period: 'Q2' },
  { id: 's4', x: 50, y: 91, outcome: 'made', points: 2, playType: 'Dunk', distanceFeet: 2, period: 'Q3' },
  // Midrange
  { id: 's5', x: 35, y: 70, outcome: 'made', points: 2, playType: 'Pull-Up Jumper', distanceFeet: 15, period: 'Q2' },
  { id: 's6', x: 65, y: 68, outcome: 'made', points: 2, playType: 'Fadeaway', distanceFeet: 16, period: 'Q3' },
  { id: 's7', x: 50, y: 62, outcome: 'missed', points: 2, playType: 'Free Throw Line Jumper', distanceFeet: 15, period: 'Q4' },
  // Corner 3s
  { id: 's8', x: 12, y: 86, outcome: 'made', points: 3, playType: 'Corner 3PT', distanceFeet: 22, period: 'Q1' },
  { id: 's9', x: 88, y: 84, outcome: 'made', points: 3, playType: 'Corner 3PT', distanceFeet: 22, period: 'Q3' },
  { id: 's10', x: 14, y: 80, outcome: 'missed', points: 3, playType: 'Contested Corner 3PT', distanceFeet: 23, period: 'Q4' },
  // Above the Break 3s
  { id: 's11', x: 50, y: 40, outcome: 'made', points: 3, playType: 'Top of Key 3PT', distanceFeet: 25, period: 'Q2' },
  { id: 's12', x: 28, y: 48, outcome: 'made', points: 3, playType: 'Wing 3PT Stepback', distanceFeet: 24, period: 'Q3' },
  { id: 's13', x: 72, y: 47, outcome: 'missed', points: 3, playType: 'Wing 3PT Catch & Shoot', distanceFeet: 24, period: 'Q4' },
  { id: 's14', x: 45, y: 36, outcome: 'made', points: 3, playType: 'Deep Logo 3PT', distanceFeet: 28, period: 'Q4' },
];

const DEFAULT_FOOTBALL_PLAYS: ShotLocation[] = [
  { id: 'fb1', x: 50, y: 88, outcome: 'touchdown', points: 6, playType: 'QB Sneak Goal-Line TD', distanceFeet: 2, period: 'Q1' },
  { id: 'fb2', x: 78, y: 35, outcome: 'touchdown', points: 6, playType: '45yd Deep Post Corner Strike', distanceFeet: 135, period: 'Q2' },
  { id: 'fb3', x: 22, y: 60, outcome: 'made', points: 0, playType: 'Quick Out to Sideline (14yd gain)', distanceFeet: 42, period: 'Q2' },
  { id: 'fb4', x: 48, y: 50, outcome: 'made', points: 0, playType: 'Seam Route Completion (18yd gain)', distanceFeet: 54, period: 'Q3' },
  { id: 'fb5', x: 80, y: 65, outcome: 'missed', points: 0, playType: 'Incomplete Fade Route', distanceFeet: 35, period: 'Q3' },
  { id: 'fb6', x: 52, y: 25, outcome: 'touchdown', points: 6, playType: 'Game-Winning Hail Mary TD', distanceFeet: 150, period: 'Q4' },
  { id: 'fb7', x: 30, y: 42, outcome: 'turnover', points: 0, playType: 'Tipped Ball Interception', distanceFeet: 60, period: 'Q4' }
];

export const ShotChartHeatmap: React.FC<ShotChartHeatmapProps> = ({
  sport = 'Basketball',
  athleteName = 'Athlete',
  initialShots,
  onLogShot,
  readOnly = false
}) => {
  const isFootball = sport.toLowerCase().includes('football');
  const [shots, setShots] = useState<ShotLocation[]>(
    initialShots || (isFootball ? DEFAULT_FOOTBALL_PLAYS : DEFAULT_BASKETBALL_SHOTS)
  );
  const [viewMode, setViewMode] = useState<'scatter' | 'zones' | 'heatmap'>('scatter');
  const [filterPeriod, setFilterPeriod] = useState<string>('ALL');
  const [filterOutcome, setFilterOutcome] = useState<string>('ALL');
  const [activeShot, setActiveShot] = useState<ShotLocation | null>(null);

  // New Shot Recording Mode
  const [isRecordMode, setIsRecordMode] = useState<boolean>(false);
  const [pendingOutcome, setPendingOutcome] = useState<'made' | 'missed' | 'touchdown'>('made');

  const filteredShots = shots.filter(s => {
    if (filterPeriod !== 'ALL' && s.period !== filterPeriod) return false;
    if (filterOutcome === 'MADE' && s.outcome !== 'made' && s.outcome !== 'touchdown') return false;
    if (filterOutcome === 'MISSED' && s.outcome !== 'missed' && s.outcome !== 'turnover') return false;
    return true;
  });

  // Calculate Efficiency Metrics
  const totalAttempts = filteredShots.length;
  const successfulPlays = filteredShots.filter(s => s.outcome === 'made' || s.outcome === 'touchdown').length;
  const efficiencyPct = totalAttempts > 0 ? Math.round((successfulPlays / totalAttempts) * 100) : 0;
  const totalPoints = filteredShots.reduce((sum, s) => sum + (s.points || 0), 0);

  // Three-point / Deep accuracy (y <= 50)
  const deepAttempts = filteredShots.filter(s => s.y <= 50);
  const deepMakes = deepAttempts.filter(s => s.outcome === 'made' || s.outcome === 'touchdown').length;
  const deepPct = deepAttempts.length > 0 ? Math.round((deepMakes / deepAttempts.length) * 100) : 0;

  // Paint / Red zone accuracy (y >= 75)
  const paintAttempts = filteredShots.filter(s => s.y >= 75);
  const paintMakes = paintAttempts.filter(s => s.outcome === 'made' || s.outcome === 'touchdown').length;
  const paintPct = paintAttempts.length > 0 ? Math.round((paintMakes / paintAttempts.length) * 100) : 0;

  const handleCourtClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isRecordMode || readOnly) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    const approxFeet = isFootball 
      ? Math.round((100 - clickY) * 1.5)
      : Math.round((100 - clickY) * 0.35);

    const isThree = !isFootball && clickY < 52;
    const points = isFootball 
      ? (pendingOutcome === 'touchdown' ? 6 : 0) 
      : (pendingOutcome === 'made' ? (isThree ? 3 : 2) : 0);

    const newShot: ShotLocation = {
      id: `shot-${Date.now()}`,
      x: Math.round(clickX * 10) / 10,
      y: Math.round(clickY * 10) / 10,
      outcome: pendingOutcome,
      points,
      playType: isFootball 
        ? (pendingOutcome === 'touchdown' ? 'Touchdown Score' : 'Field Pass')
        : (isThree ? '3-Point Attempt' : '2-Point Field Goal'),
      distanceFeet: approxFeet,
      period: 'Q4',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setShots(prev => [newShot, ...prev]);
    setActiveShot(newShot);
    onLogShot?.(newShot);
  };

  return (
    <div id="shot-chart-heatmap-container" className="bg-[#161C22] border border-[#2D3748] rounded-2xl p-4 sm:p-6 text-white shadow-xl">
      {/* Header & Mode Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#2D3748]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#00F2FE]/15 border border-[#00F2FE]/30 text-[#00F2FE]">
              <Target className="w-4 h-4" />
            </span>
            <h3 className="text-base sm:text-lg font-black text-white tracking-wide uppercase font-mono flex items-center gap-2">
              <span>{isFootball ? 'Passing & Red Zone Heatmap' : 'Shooting & Shot Chart Heatmap'}</span>
              <span className="text-[10px] text-[#00F2FE] bg-[#00F2FE]/10 px-2 py-0.5 rounded border border-[#00F2FE]/20 font-mono">
                LIVE METRICS
              </span>
            </h3>
          </div>
          <p className="text-xs text-[#94A3B8] mt-1">
            Tracking spatial efficiency, hot zones, and shot conversion coordinates for {athleteName}.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1.5 bg-[#0F141A] p-1 rounded-xl border border-[#2D3748] self-start md:self-auto">
          <button
            onClick={() => setViewMode('scatter')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              viewMode === 'scatter'
                ? 'bg-[#00F2FE] text-black shadow-[0_0_12px_rgba(0,242,254,0.4)]'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Scatter
          </button>
          <button
            onClick={() => setViewMode('zones')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              viewMode === 'zones'
                ? 'bg-[#00F2FE] text-black shadow-[0_0_12px_rgba(0,242,254,0.4)]'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Hot Zones
          </button>
          <button
            onClick={() => setViewMode('heatmap')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              viewMode === 'heatmap'
                ? 'bg-[#00F2FE] text-black shadow-[0_0_12px_rgba(0,242,254,0.4)]'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Heat Density
          </button>
        </div>
      </div>

      {/* Metric Quick Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
        <div className="bg-[#0F141A] border border-[#2D3748] rounded-xl p-3 flex flex-col">
          <span className="text-[11px] font-mono text-[#94A3B8] uppercase">Efficiency Rate</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-[#00F2FE] font-mono">{efficiencyPct}%</span>
            <span className="text-xs text-[#94A3B8] font-mono">({successfulPlays}/{totalAttempts})</span>
          </div>
        </div>

        <div className="bg-[#0F141A] border border-[#2D3748] rounded-xl p-3 flex flex-col">
          <span className="text-[11px] font-mono text-[#94A3B8] uppercase">{isFootball ? 'Deep Ball (25yd+)' : '3-Point / Deep'}</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-2xl font-black font-mono ${deepPct >= 40 ? 'text-[#10B981]' : 'text-[#F59E0B]'}`}>
              {deepPct}%
            </span>
            <span className="text-xs text-[#94A3B8] font-mono">({deepMakes}/{deepAttempts.length})</span>
          </div>
        </div>

        <div className="bg-[#0F141A] border border-[#2D3748] rounded-xl p-3 flex flex-col">
          <span className="text-[11px] font-mono text-[#94A3B8] uppercase">{isFootball ? 'Red Zone Conversion' : 'Paint / Rim FG%'}</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-[#10B981] font-mono">{paintPct}%</span>
            <span className="text-xs text-[#94A3B8] font-mono">({paintMakes}/{paintAttempts.length})</span>
          </div>
        </div>

        <div className="bg-[#0F141A] border border-[#2D3748] rounded-xl p-3 flex flex-col">
          <span className="text-[11px] font-mono text-[#94A3B8] uppercase">Total Impact</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-[#F59E0B] font-mono">
              {isFootball ? `${successfulPlays} TDs/Pass` : `${totalPoints} PTS`}
            </span>
            <span className="text-[10px] text-[#10B981] font-mono font-bold">VERIFIED</span>
          </div>
        </div>
      </div>

      {/* Interactive Court / Field SVG Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: The SVG Court Graphic */}
        <div className="lg:col-span-8 bg-[#0B0F14] border border-[#2D3748] rounded-2xl p-3 sm:p-5 relative overflow-hidden flex flex-col items-center">
          {/* Top Canvas Bar with Filter Controls */}
          <div className="w-full flex items-center justify-between pb-3 mb-2 border-b border-[#1E2630] text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#94A3B8]">Filter:</span>
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="bg-[#161C22] border border-[#2D3748] text-white px-2 py-1 rounded-lg text-xs"
              >
                <option value="ALL">All Periods</option>
                <option value="Q1">1st Quarter</option>
                <option value="Q2">2nd Quarter</option>
                <option value="Q3">3rd Quarter</option>
                <option value="Q4">4th Quarter</option>
              </select>

              <select
                value={filterOutcome}
                onChange={(e) => setFilterOutcome(e.target.value)}
                className="bg-[#161C22] border border-[#2D3748] text-white px-2 py-1 rounded-lg text-xs"
              >
                <option value="ALL">All Outcomes</option>
                <option value="MADE">Makes / TDs Only</option>
                <option value="MISSED">Misses / Stops Only</option>
              </select>
            </div>

            {/* Click to Record Play toggle */}
            {!readOnly && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsRecordMode(!isRecordMode)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                    isRecordMode 
                      ? 'bg-[#EF4444] text-white shadow-[0_0_12px_rgba(239,68,68,0.5)]' 
                      : 'bg-[#1E2630] hover:bg-[#2D3748] text-[#00F2FE] border border-[#2D3748]'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isRecordMode ? 'Click Court to Place' : 'Log Live Shot'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Record Mode Outcome Selector Banner */}
          {isRecordMode && (
            <div className="w-full bg-[#1E2630] border border-[#00F2FE]/40 rounded-xl px-3 py-2 mb-3 flex items-center justify-between text-xs animate-pulse">
              <span className="font-mono text-[#00F2FE] font-bold">🎯 Click any spot on the court to place shot:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPendingOutcome('made')}
                  className={`px-2.5 py-1 rounded font-mono font-bold text-[11px] ${
                    pendingOutcome === 'made' ? 'bg-[#10B981] text-black' : 'bg-[#161C22] text-[#94A3B8]'
                  }`}
                >
                  Make (2PT/3PT)
                </button>
                <button
                  onClick={() => setPendingOutcome('missed')}
                  className={`px-2.5 py-1 rounded font-mono font-bold text-[11px] ${
                    pendingOutcome === 'missed' ? 'bg-[#EF4444] text-white' : 'bg-[#161C22] text-[#94A3B8]'
                  }`}
                >
                  Miss
                </button>
                {isFootball && (
                  <button
                    onClick={() => setPendingOutcome('touchdown')}
                    className={`px-2.5 py-1 rounded font-mono font-bold text-[11px] ${
                      pendingOutcome === 'touchdown' ? 'bg-[#F59E0B] text-black' : 'bg-[#161C22] text-[#94A3B8]'
                    }`}
                  >
                    Touchdown
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Court SVG Vector Layer */}
          <div className="w-full max-w-[480px] aspect-[4/3.8] relative select-none">
            <svg
              viewBox="0 0 100 100"
              className={`w-full h-full rounded-xl border border-[#2D3748] ${isRecordMode ? 'cursor-crosshair' : 'cursor-default'}`}
              onClick={handleCourtClick}
            >
              {/* Background Canvas */}
              <rect width="100" height="100" fill="#0E1318" />

              {/* Basketball Half Court Lines */}
              {!isFootball ? (
                <>
                  {/* Outer Boundary */}
                  <rect x="5" y="5" width="90" height="90" fill="none" stroke="#2D3748" strokeWidth="1.5" />
                  
                  {/* Half-Court Center Line & Center Circle */}
                  <line x1="5" y1="5" x2="95" y2="5" stroke="#4A5568" strokeWidth="1.5" />
                  <path d="M 40,5 A 10,10 0 0,0 60,5" fill="none" stroke="#2D3748" strokeWidth="1.2" />

                  {/* Hot Zones Shading (when in zones mode) */}
                  {viewMode === 'zones' && (
                    <>
                      {/* Left Corner 3 Zone */}
                      <rect x="5" y="65" width="15" height="30" fill="#00F2FE" fillOpacity="0.12" />
                      <text x="12.5" y="80" fill="#00F2FE" fontSize="3" fontWeight="bold" textAnchor="middle">66%</text>

                      {/* Right Corner 3 Zone */}
                      <rect x="80" y="65" width="15" height="30" fill="#00F2FE" fillOpacity="0.12" />
                      <text x="87.5" y="80" fill="#00F2FE" fontSize="3" fontWeight="bold" textAnchor="middle">60%</text>

                      {/* Paint / Rim Zone */}
                      <rect x="36" y="65" width="28" height="30" fill="#10B981" fillOpacity="0.18" />
                      <text x="50" y="80" fill="#10B981" fontSize="3.5" fontWeight="bold" textAnchor="middle">78% RIM</text>

                      {/* Midrange Wing Left */}
                      <path d="M 20,65 L 36,65 L 36,45 L 20,45 Z" fill="#F59E0B" fillOpacity="0.1" />
                      <text x="28" y="55" fill="#F59E0B" fontSize="3" fontWeight="bold" textAnchor="middle">50%</text>

                      {/* Midrange Wing Right */}
                      <path d="M 64,65 L 80,65 L 80,45 L 64,45 Z" fill="#F59E0B" fillOpacity="0.1" />
                      <text x="72" y="55" fill="#F59E0B" fontSize="3" fontWeight="bold" textAnchor="middle">54%</text>

                      {/* Top of Key 3PT */}
                      <path d="M 30,10 L 70,10 L 70,38 L 30,38 Z" fill="#00F2FE" fillOpacity="0.15" />
                      <text x="50" y="24" fill="#00F2FE" fontSize="3.5" fontWeight="bold" textAnchor="middle">45% 3PT</text>
                    </>
                  )}

                  {/* Heat Density Blobs (when in heatmap mode) */}
                  {viewMode === 'heatmap' && (
                    <g filter="url(#blur-effect)">
                      <circle cx="50" cy="88" r="14" fill="#10B981" fillOpacity="0.45" />
                      <circle cx="50" cy="40" r="10" fill="#00F2FE" fillOpacity="0.35" />
                      <circle cx="12" cy="86" r="8" fill="#F59E0B" fillOpacity="0.4" />
                      <circle cx="88" cy="84" r="8" fill="#00F2FE" fillOpacity="0.4" />
                    </g>
                  )}

                  {/* Filter for Heatmap blur */}
                  <defs>
                    <filter id="blur-effect" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" />
                    </filter>
                  </defs>

                  {/* Paint / Key */}
                  <rect x="36" y="65" width="28" height="30" fill="none" stroke="#4A5568" strokeWidth="1.2" />
                  
                  {/* Free Throw Circle */}
                  <circle cx="50" cy="65" r="10" fill="none" stroke="#4A5568" strokeWidth="1.2" />
                  <line x1="40" y1="65" x2="60" y2="65" stroke="#4A5568" strokeWidth="1.2" strokeDasharray="2,2" />

                  {/* Restricted Area Arc */}
                  <path d="M 45,95 A 5,5 0 0,0 55,95" fill="none" stroke="#4A5568" strokeWidth="1" />

                  {/* 3-Point Line (Corners & Arc) */}
                  <line x1="14" y1="95" x2="14" y2="68" stroke="#4A5568" strokeWidth="1.2" />
                  <line x1="86" y1="95" x2="86" y2="68" stroke="#4A5568" strokeWidth="1.2" />
                  <path d="M 14,68 A 38,38 0 0,0 86,68" fill="none" stroke="#4A5568" strokeWidth="1.2" />

                  {/* Backboard & Rim */}
                  <line x1="44" y1="92" x2="56" y2="92" stroke="#CBD5E1" strokeWidth="1.5" />
                  <line x1="50" y1="92" x2="50" y2="93.5" stroke="#CBD5E1" strokeWidth="1.5" />
                  <circle cx="50" cy="94.5" r="1.8" fill="none" stroke="#F97316" strokeWidth="1.2" />
                </>
              ) : (
                /* Football Field Vector */
                <>
                  {/* Endzone */}
                  <rect x="5" y="80" width="90" height="15" fill="#166534" fillOpacity="0.25" stroke="#2D3748" strokeWidth="1.2" />
                  <text x="50" y="89" fill="#10B981" fontSize="4" fontWeight="bold" textAnchor="middle" letterSpacing="1">TOUCHDOWN ENDZONE</text>

                  {/* Yard lines */}
                  {[65, 50, 35, 20, 5].map((y, idx) => (
                    <g key={y}>
                      <line x1="5" y1={y} x2="95" y2={y} stroke="#334155" strokeWidth="1" />
                      <text x="10" y={y + 3} fill="#64748B" fontSize="2.8" fontWeight="bold">{10 + idx * 10}</text>
                      <text x="90" y={y + 3} fill="#64748B" fontSize="2.8" fontWeight="bold" textAnchor="end">{10 + idx * 10}</text>
                      {/* Hash marks */}
                      <line x1="45" y1={y} x2="47" y2={y} stroke="#475569" strokeWidth="0.8" />
                      <line x1="53" y1={y} x2="55" y2={y} stroke="#475569" strokeWidth="0.8" />
                    </g>
                  ))}
                </>
              )}

              {/* Shot Scatter Markers */}
              {viewMode !== 'heatmap' && filteredShots.map((shot) => {
                const isMade = shot.outcome === 'made' || shot.outcome === 'touchdown';
                const isSelected = activeShot?.id === shot.id;

                return (
                  <g
                    key={shot.id}
                    className="cursor-pointer transition-transform hover:scale-125"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveShot(shot);
                    }}
                  >
                    {isMade ? (
                      /* Made Shot Green Circle */
                      <g>
                        <circle
                          cx={shot.x}
                          cy={shot.y}
                          r={isSelected ? 3.5 : 2.5}
                          fill="#10B981"
                          stroke={isSelected ? '#FFFFFF' : '#047857'}
                          strokeWidth={isSelected ? 1.2 : 0.8}
                          className="drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]"
                        />
                        <circle cx={shot.x} cy={shot.y} r="0.8" fill="#FFFFFF" />
                      </g>
                    ) : (
                      /* Missed Shot Crimson X */
                      <g stroke="#EF4444" strokeWidth={isSelected ? 1.4 : 0.9} strokeLinecap="round">
                        <line x1={shot.x - (isSelected ? 2.5 : 1.8)} y1={shot.y - (isSelected ? 2.5 : 1.8)} x2={shot.x + (isSelected ? 2.5 : 1.8)} y2={shot.y + (isSelected ? 2.5 : 1.8)} />
                        <line x1={shot.x + (isSelected ? 2.5 : 1.8)} y1={shot.y - (isSelected ? 2.5 : 1.8)} x2={shot.x - (isSelected ? 2.5 : 1.8)} y2={shot.y + (isSelected ? 2.5 : 1.8)} />
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Bottom Legend */}
          <div className="flex items-center gap-6 mt-4 text-xs font-mono text-[#94A3B8]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#10B981] inline-block shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              <span>Made Shot / Score ({successfulPlays})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 text-[#EF4444] font-black leading-none flex items-center justify-center">✕</span>
              <span>Miss / Turnover ({totalAttempts - successfulPlays})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00F2FE]" />
              <span>High Efficiency Zone</span>
            </div>
          </div>
        </div>

        {/* Right: Selected Play Inspection Drawer & Hot Zone Breakdown */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Active Shot Detail Card */}
          <div className="bg-[#0F141A] border border-[#2D3748] rounded-2xl p-4">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#94A3B8] mb-2 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#00F2FE]" />
              <span>Play Inspector</span>
            </h4>

            {activeShot ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#1E2630]">
                  <span className="text-sm font-bold text-white">{activeShot.playType || 'Field Play'}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black uppercase font-mono ${
                      activeShot.outcome === 'made' || activeShot.outcome === 'touchdown'
                        ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
                        : 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40'
                    }`}
                  >
                    {activeShot.outcome}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-[#161C22] p-2 rounded-lg border border-[#2D3748]">
                    <span className="text-[#94A3B8] block text-[10px]">Estimated Distance</span>
                    <span className="text-white font-bold text-sm">{activeShot.distanceFeet || 15} FT</span>
                  </div>
                  <div className="bg-[#161C22] p-2 rounded-lg border border-[#2D3748]">
                    <span className="text-[#94A3B8] block text-[10px]">Points Value</span>
                    <span className="text-[#F59E0B] font-bold text-sm">+{activeShot.points || 0} PTS</span>
                  </div>
                  <div className="bg-[#161C22] p-2 rounded-lg border border-[#2D3748]">
                    <span className="text-[#94A3B8] block text-[10px]">Period</span>
                    <span className="text-white font-bold text-sm">{activeShot.period || 'Q2'}</span>
                  </div>
                  <div className="bg-[#161C22] p-2 rounded-lg border border-[#2D3748]">
                    <span className="text-[#94A3B8] block text-[10px]">Coordinates</span>
                    <span className="text-[#00F2FE] font-bold text-xs">{activeShot.x}%, {activeShot.y}%</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-[#94A3B8] font-mono">
                Click any marker on the court above to inspect play outcome, shot distance, and angle.
              </div>
            )}
          </div>

          {/* Tactical Hot Zones Breakdown */}
          <div className="bg-[#0F141A] border border-[#2D3748] rounded-2xl p-4">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#94A3B8] mb-3 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>Zone Efficiency Breakdown</span>
            </h4>

            <div className="space-y-2.5 text-xs font-mono">
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-white font-bold">Restricted Area / Rim (0-4ft)</span>
                  <span className="text-[#10B981] font-black">78% (7/9)</span>
                </div>
                <div className="w-full bg-[#1E2630] rounded-full h-1.5">
                  <div className="bg-[#10B981] h-1.5 rounded-full" style={{ width: '78%' }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-white font-bold">Midrange Paint Floater (5-14ft)</span>
                  <span className="text-[#F59E0B] font-black">54% (6/11)</span>
                </div>
                <div className="w-full bg-[#1E2630] rounded-full h-1.5">
                  <div className="bg-[#F59E0B] h-1.5 rounded-full" style={{ width: '54%' }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-white font-bold">Corner 3PT Arc (22ft)</span>
                  <span className="text-[#00F2FE] font-black">63% (5/8)</span>
                </div>
                <div className="w-full bg-[#1E2630] rounded-full h-1.5">
                  <div className="bg-[#00F2FE] h-1.5 rounded-full" style={{ width: '63%' }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-white font-bold">Top of Key & Deep Logo 3s</span>
                  <span className="text-[#00F2FE] font-black">44% (4/9)</span>
                </div>
                <div className="w-full bg-[#1E2630] rounded-full h-1.5">
                  <div className="bg-[#00F2FE] h-1.5 rounded-full" style={{ width: '44%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
