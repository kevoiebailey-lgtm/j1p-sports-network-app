import React, { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Circle, Square, X as XIcon } from 'lucide-react';
import { PlayerNode, SportType, ProgressionRead } from '../Playbook/types';

export interface TacticalCanvasProps {
  selectedSport: SportType;
  players: PlayerNode[];
  selectedPlayerId: string | null;
  onSelectPlayer: (id: string) => void;
  onUpdatePlayerPosition: (id: string, x: number, y: number) => void;
  onUpdatePlayerRoute: (id: string, route: { x: number; y: number }[]) => void;
  isDrawingRoute?: boolean;
  drawingMode?: 'waypoint' | 'freehand';
  onExitDrawing?: () => void;
  showQBVisionCone?: boolean;
  showBlockingVectors?: boolean;
  showPreSnapMotion?: boolean;
  isAnimating?: boolean;
  animationDuration?: number;
  readOnly?: boolean;
  canvasRef?: React.RefObject<SVGSVGElement | null>;
}

// Progression Read Badge Mapping with user-specified colors
export const PROGRESSION_BADGES: Record<
  string,
  { bg: string; text: string; label: string; border: string }
> = {
  '1': { bg: '#2dd4bf', text: '#042f2e', label: '1ST', border: '#14b8a6' }, // Vibrant Teal #2dd4bf
  '2': { bg: '#f59e0b', text: '#451a03', label: '2ND', border: '#fbbf24' }, // Amber #f59e0b
  'checkdown': { bg: '#94a3b8', text: '#0f172a', label: 'CHK', border: '#cbd5e1' }, // Slate #94a3b8
  'clearout': { bg: '#a855f7', text: '#ffffff', label: 'CLR', border: '#c084fc' }, // Purple #a855f7
  '3': { bg: '#38bdf8', text: '#082f49', label: '3RD', border: '#7dd3fc' },
  '4': { bg: '#c084fc', text: '#3b0764', label: '4TH', border: '#e9d5ff' },
  'hot': { bg: '#ef4444', text: '#ffffff', label: 'HOT', border: '#f87171' },
};

export const TacticalCanvas: React.FC<TacticalCanvasProps> = ({
  selectedSport,
  players,
  selectedPlayerId,
  onSelectPlayer,
  onUpdatePlayerPosition,
  onUpdatePlayerRoute,
  isDrawingRoute = false,
  drawingMode = 'waypoint',
  onExitDrawing,
  showQBVisionCone = true,
  showBlockingVectors = true,
  showPreSnapMotion = true,
  isAnimating = false,
  animationDuration = 2.4,
  readOnly = false,
  canvasRef,
}) => {
  const localSvgRef = useRef<SVGSVGElement | null>(null);
  const activeSvgRef = canvasRef || localSvgRef;

  const [draggingPlayerId, setDraggingPlayerId] = useState<string | null>(null);
  const [draggingWaypoint, setDraggingWaypoint] = useState<{
    playerId: string;
    index: number;
  } | null>(null);
  const [isSketching, setIsSketching] = useState(false);
  const [sketchPoints, setSketchPoints] = useState<{ x: number; y: number }[]>([]);

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId) || null;

  // Convert client coordinates to 800x500 SVG coordinates
  const getSvgCoordinates = useCallback(
    (clientX: number, clientY: number) => {
      if (!activeSvgRef.current) return { x: 400, y: 250 };
      const svg = activeSvgRef.current;
      const rect = svg.getBoundingClientRect();
      const scaleX = 800 / rect.width;
      const scaleY = 500 / rect.height;
      return {
        x: Math.max(15, Math.min(785, (clientX - rect.left) * scaleX)),
        y: Math.max(15, Math.min(485, (clientY - rect.top) * scaleY)),
      };
    },
    [activeSvgRef]
  );

  // Field Geometries
  const renderFieldBackground = () => {
    switch (selectedSport) {
      case 'flag_5v5':
        return (
          <g id="field-geometry-flag-5v5">
            {/* 50-yd Field: End Zone (Y: 0 - 70) */}
            <rect x="0" y="0" width="800" height="70" fill="#047857" fillOpacity="0.22" />
            <line x1="0" y1="70" x2="800" y2="70" stroke="#10b981" strokeWidth="2.5" />
            <text
              x="400"
              y="45"
              fill="#10b981"
              fontSize="14"
              fontWeight="900"
              letterSpacing="6"
              textAnchor="middle"
              opacity="0.9"
            >
              50-YD FIELD • END ZONE
            </text>

            {/* 5-yd No-Run Zone before End Zone (Y: 70 - 105) */}
            <rect x="0" y="70" width="800" height="35" fill="#f59e0b" fillOpacity="0.08" />
            <line
              x1="0"
              y1="105"
              x2="800"
              y2="105"
              stroke="#f59e0b"
              strokeWidth="1.75"
              strokeDasharray="6 4"
              opacity="0.8"
            />
            <text x="770" y="98" fill="#f59e0b" fontSize="9" fontWeight="bold" textAnchor="end">
              5-YD NO-RUN ZONE
            </text>

            {/* Midfield Line & Hash (Y: 250) */}
            <line x1="0" y1="250" x2="800" y2="250" stroke="#ffffff" strokeWidth="2" opacity="0.5" />
            {/* Midfield Hashes */}
            {[260, 320, 380, 440, 500, 560].map((hx) => (
              <line
                key={hx}
                x1={hx}
                y1="244"
                x2={hx}
                y2="256"
                stroke="#ffffff"
                strokeWidth="1.5"
                opacity="0.6"
              />
            ))}
            <text x="30" y="244" fill="#ffffff" fontSize="10" fontWeight="900" opacity="0.75">
              MIDFIELD (25 YD)
            </text>

            {/* 5-yd No-Run Zone before Midfield (Y: 250 - 285) */}
            <rect x="0" y="250" width="800" height="35" fill="#f59e0b" fillOpacity="0.06" />
            <line
              x1="0"
              y1="285"
              x2="800"
              y2="285"
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeDasharray="5 4"
              opacity="0.7"
            />
            <text x="770" y="280" fill="#f59e0b" fontSize="9" fontWeight="bold" textAnchor="end">
              5-YD NO-RUN ZONE (MIDFIELD)
            </text>

            {/* 7-yd Rusher Dotted Line (Y: 300 = 7 yds from Scrimmage Y: 350) */}
            <line
              x1="0"
              y1="300"
              x2="800"
              y2="300"
              stroke="#ef4444"
              strokeWidth="2.5"
              strokeDasharray="4 4"
              opacity="0.9"
            />
            <text
              x="770"
              y="295"
              fill="#ef4444"
              fontSize="10"
              fontWeight="900"
              letterSpacing="1"
              textAnchor="end"
            >
              7-YD RUSHER RESTRAINT LINE
            </text>

            {/* Line of Scrimmage (Y: 350) */}
            <line
              x1="0"
              y1="350"
              x2="800"
              y2="350"
              stroke="#00B8D4"
              strokeWidth="2.5"
              strokeDasharray="6 6"
            />
            <text x="30" y="344" fill="#00B8D4" fontSize="11" fontWeight="900">
              LINE OF SCRIMMAGE (BALL SPOT)
            </text>
          </g>
        );

      case 'flag_7v7':
        return (
          <g id="field-geometry-7v7-showcase">
            {/* 40-yd Offensive Field: Endzone (Y: 0 - 75) */}
            <rect x="0" y="0" width="800" height="75" fill="#1e3a8a" fillOpacity="0.25" />
            <line x1="0" y1="75" x2="800" y2="75" stroke="#3b82f6" strokeWidth="2.5" />
            <text
              x="400"
              y="48"
              fill="#60a5fa"
              fontSize="14"
              fontWeight="900"
              letterSpacing="6"
              textAnchor="middle"
              opacity="0.9"
            >
              7v7 SHOWCASE • 40-YD OFFENSIVE FIELD
            </text>

            {/* 15-Yard Boundary Line & Hashes (Y: 175) */}
            <line x1="0" y1="175" x2="800" y2="175" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="8 4" opacity="0.5" />
            <line x1="280" y1="168" x2="280" y2="182" stroke="#ffffff" strokeWidth="2" />
            <line x1="520" y1="168" x2="520" y2="182" stroke="#ffffff" strokeWidth="2" />
            <line x1="60" y1="168" x2="60" y2="182" stroke="#ffffff" strokeWidth="2" />
            <line x1="740" y1="168" x2="740" y2="182" stroke="#ffffff" strokeWidth="2" />
            <text x="30" y="170" fill="#94a3b8" fontSize="10" fontWeight="900" opacity="0.8">
              15-YD LINE (REDZONE ENTRY)
            </text>

            {/* 25-Yard 1st Down / Midpoint Hash (Y: 250) */}
            <line x1="0" y1="250" x2="800" y2="250" stroke="#f59e0b" strokeWidth="2" opacity="0.65" />
            <line x1="280" y1="242" x2="280" y2="258" stroke="#f59e0b" strokeWidth="2.5" />
            <line x1="520" y1="242" x2="520" y2="258" stroke="#f59e0b" strokeWidth="2.5" />
            <line x1="60" y1="242" x2="60" y2="258" stroke="#f59e0b" strokeWidth="2.5" />
            <line x1="740" y1="242" x2="740" y2="258" stroke="#f59e0b" strokeWidth="2.5" />
            <text x="30" y="244" fill="#f59e0b" fontSize="10" fontWeight="900">
              25-YD LINE (1ST DOWN CONVERSION)
            </text>

            {/* 40-Yard Starting Boundary (Y: 350) */}
            <line x1="0" y1="350" x2="800" y2="350" stroke="#00B8D4" strokeWidth="3" />
            <text x="30" y="344" fill="#00B8D4" fontSize="11" fontWeight="900">
              40-YD LINE (OFFENSIVE START)
            </text>
            {/* Boundary Sideline Hashes */}
            {[100, 150, 200, 300, 400].map((y) => (
              <g key={y}>
                <line x1="20" y1={y} x2="35" y2={y} stroke="#475569" strokeWidth="2" />
                <line x1="765" y1={y} x2="780" y2={y} stroke="#475569" strokeWidth="2" />
              </g>
            ))}
          </g>
        );

      case 'football_11v11':
        return (
          <g id="field-geometry-11v11-tackle">
            {/* Endzone */}
            <rect x="0" y="0" width="800" height="60" fill="#14532d" fillOpacity="0.25" />
            <line x1="0" y1="60" x2="800" y2="60" stroke="#16a34a" strokeWidth="2.5" />
            <text
              x="400"
              y="38"
              fill="#22c55e"
              fontSize="13"
              fontWeight="900"
              letterSpacing="6"
              textAnchor="middle"
              opacity="0.8"
            >
              11v11 NCAA / NFHS REGULATION FIELD
            </text>

            {/* Yard lines every 40px with Painted Numbers */}
            {[
              { y: 100, num: '10' },
              { y: 140, num: '20' },
              { y: 180, num: '30' },
              { y: 220, num: '40' },
              { y: 260, num: '50' },
              { y: 300, num: '40' },
              { y: 340, num: '30' },
              { y: 380, num: '20' },
              { y: 420, num: '10' },
            ].map(({ y, num }) => (
              <g key={y}>
                <line x1="0" y1={y} x2="800" y2={y} stroke="#1e293b" strokeWidth="1.5" />
                {/* Left & Right College/High School Hashes */}
                <line x1="310" y1={y - 5} x2="310" y2={y + 5} stroke="#64748b" strokeWidth="2" />
                <line x1="490" y1={y - 5} x2="490" y2={y + 5} stroke="#64748b" strokeWidth="2" />
                {/* Sideline Marks */}
                <line x1="80" y1={y - 4} x2="80" y2={y + 4} stroke="#475569" strokeWidth="1.5" />
                <line x1="720" y1={y - 4} x2="720" y2={y + 4} stroke="#475569" strokeWidth="1.5" />
                {/* Painted Field Numbers on left and right */}
                <text
                  x="115"
                  y={y + 4}
                  fill="#334155"
                  fontSize="12"
                  fontWeight="900"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {num}
                </text>
                <text
                  x="685"
                  y={y + 4}
                  fill="#334155"
                  fontSize="12"
                  fontWeight="900"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {num}
                </text>
              </g>
            ))}

            {/* Line of Scrimmage */}
            <line x1="0" y1="350" x2="800" y2="350" stroke="#00B8D4" strokeWidth="3" />
            <text x="30" y="344" fill="#00B8D4" fontSize="11" fontWeight="900">
              LINE OF SCRIMMAGE (BALL SPOT)
            </text>
          </g>
        );

      case 'basketball':
        return (
          <g id="field-geometry-basketball">
            <rect x="40" y="20" width="720" height="460" fill="none" stroke="#eab308" strokeWidth="2" opacity="0.6" />
            <rect x="300" y="20" width="200" height="220" fill="#eab308" fillOpacity="0.08" stroke="#eab308" strokeWidth="2" />
            <circle cx="400" cy="240" r="70" fill="none" stroke="#eab308" strokeWidth="2" strokeDasharray="5 5" />
            <path d="M 120 20 L 120 120 A 280 280 0 0 0 680 120 L 680 20" fill="none" stroke="#eab308" strokeWidth="2.5" />
            <line x1="360" y1="35" x2="440" y2="35" stroke="#ffffff" strokeWidth="3.5" />
            <circle cx="400" cy="50" r="12" fill="none" stroke="#f97316" strokeWidth="2.5" />
          </g>
        );

      case 'soccer':
      default:
        return (
          <g id="field-geometry-soccer">
            <line x1="40" y1="20" x2="760" y2="20" stroke="#ffffff" strokeWidth="2" opacity="0.7" />
            <rect x="220" y="20" width="360" height="160" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.7" />
            <rect x="320" y="20" width="160" height="60" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.7" />
            <circle cx="400" cy="120" r="4" fill="#ffffff" />
            <path d="M 330 180 A 80 80 0 0 0 470 180" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.7" />
          </g>
        );
    }
  };

  // Drag Handlers
  const handleMouseDown = (playerId: string, e: React.MouseEvent) => {
    if (readOnly) return;
    e.stopPropagation();
    setDraggingPlayerId(playerId);
    onSelectPlayer(playerId);
  };

  const handleTouchStart = (playerId: string, e: React.TouchEvent) => {
    if (readOnly) return;
    e.stopPropagation();
    setDraggingPlayerId(playerId);
    onSelectPlayer(playerId);
  };

  const handleSvgMouseDown = (e: React.MouseEvent) => {
    if (readOnly) return;
    if (isDrawingRoute && selectedPlayer) {
      const coords = getSvgCoordinates(e.clientX, e.clientY);
      if (drawingMode === 'freehand') {
        setIsSketching(true);
        setSketchPoints([coords]);
      } else {
        // Waypoint mode
        const updated = [...(selectedPlayer.route || []), coords];
        onUpdatePlayerRoute(selectedPlayer.id, updated);
      }
    }
  };

  const handleSvgTouchStart = (e: React.TouchEvent) => {
    if (readOnly) return;
    if (isDrawingRoute && selectedPlayer && e.touches.length > 0) {
      const coords = getSvgCoordinates(e.touches[0].clientX, e.touches[0].clientY);
      if (drawingMode === 'freehand') {
        setIsSketching(true);
        setSketchPoints([coords]);
      } else {
        const updated = [...(selectedPlayer.route || []), coords];
        onUpdatePlayerRoute(selectedPlayer.id, updated);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (readOnly) return;
    if (draggingPlayerId) {
      const coords = getSvgCoordinates(e.clientX, e.clientY);
      onUpdatePlayerPosition(draggingPlayerId, coords.x, coords.y);
    } else if (draggingWaypoint) {
      const coords = getSvgCoordinates(e.clientX, e.clientY);
      const targetP = players.find((p) => p.id === draggingWaypoint.playerId);
      if (targetP) {
        const updatedRoute = [...targetP.route];
        updatedRoute[draggingWaypoint.index] = coords;
        onUpdatePlayerRoute(targetP.id, updatedRoute);
      }
    } else if (isSketching && isDrawingRoute && selectedPlayer) {
      const coords = getSvgCoordinates(e.clientX, e.clientY);
      setSketchPoints((prev) => [...prev, coords]);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (readOnly || e.touches.length === 0) return;
    const touch = e.touches[0];
    if (draggingPlayerId) {
      const coords = getSvgCoordinates(touch.clientX, touch.clientY);
      onUpdatePlayerPosition(draggingPlayerId, coords.x, coords.y);
    } else if (draggingWaypoint) {
      const coords = getSvgCoordinates(touch.clientX, touch.clientY);
      const targetP = players.find((p) => p.id === draggingWaypoint.playerId);
      if (targetP) {
        const updatedRoute = [...targetP.route];
        updatedRoute[draggingWaypoint.index] = coords;
        onUpdatePlayerRoute(targetP.id, updatedRoute);
      }
    } else if (isSketching && isDrawingRoute && selectedPlayer) {
      const coords = getSvgCoordinates(touch.clientX, touch.clientY);
      setSketchPoints((prev) => [...prev, coords]);
    }
  };

  const handleMouseUp = () => {
    if (isSketching && selectedPlayer && sketchPoints.length > 2) {
      // Downsample sketch points to clean waypoint curves
      const sampled = sketchPoints.filter((_, idx) => idx % 4 === 0);
      onUpdatePlayerRoute(selectedPlayer.id, sampled);
    }
    setDraggingPlayerId(null);
    setDraggingWaypoint(null);
    setIsSketching(false);
    setSketchPoints([]);
  };

  // Render Token Shape
  const renderShapeIcon = (player: PlayerNode) => {
    switch (player.shape) {
      case 'square':
        return (
          <rect
            x={-14}
            y={-14}
            width={28}
            height={28}
            rx={4}
            fill={player.color}
            stroke="#ffffff"
            strokeWidth="2"
            className="drop-shadow-md"
          />
        );
      case 'cross':
        return (
          <g>
            <circle cx={0} cy={0} r={14} fill={player.color} opacity="0.25" />
            <line x1={-9} y1={-9} x2={9} y2={9} stroke={player.color} strokeWidth="3" strokeLinecap="round" />
            <line x1={-9} y1={9} x2={9} y2={-9} stroke={player.color} strokeWidth="3" strokeLinecap="round" />
          </g>
        );
      case 'circle':
      default:
        return (
          <circle
            cx={0}
            cy={0}
            r={15}
            fill={player.color}
            stroke="#ffffff"
            strokeWidth="2"
            className="drop-shadow-md"
          />
        );
    }
  };

  return (
    <div
      id="tactical-canvas-wrapper"
      className="relative w-full aspect-[4/5] sm:aspect-[16/9] bg-neutral-950 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl select-none"
      style={{ touchAction: 'none' }}
    >
      {/* Top Floating Indicator when drawing */}
      {!readOnly && isDrawingRoute && (
        <div className="absolute top-3 left-3 right-3 sm:right-auto z-20 bg-emerald-500/90 text-neutral-950 backdrop-blur-md px-3.5 py-1.5 rounded-2xl shadow-xl flex items-center justify-between gap-3 border border-emerald-400">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neutral-950 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-neutral-950"></span>
            </span>
            <span className="text-xs font-black uppercase tracking-wider">
              {drawingMode === 'freehand' ? 'Freehand Sketching' : 'Placing Waypoint Cuts'} for{' '}
              {selectedPlayer?.label || 'Token'}
            </span>
          </div>
          {onExitDrawing && (
            <button
              type="button"
              onClick={onExitDrawing}
              className="bg-neutral-950 hover:bg-neutral-900 text-white text-[11px] font-black px-2.5 py-1 rounded-xl cursor-pointer"
            >
              Done
            </button>
          )}
        </div>
      )}

      {/* Primary SVG Surface */}
      <svg
        ref={activeSvgRef}
        viewBox="0 0 800 500"
        onMouseDown={handleSvgMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleSvgTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
        onTouchCancel={handleMouseUp}
        style={{ touchAction: 'none' }}
        className={`w-full h-full block ${
          isDrawingRoute
            ? drawingMode === 'freehand'
              ? 'cursor-pencil'
              : 'cursor-crosshair'
            : 'cursor-default'
        }`}
      >
        <defs>
          <pattern id="tactical-canvas-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#171a1f" strokeWidth="0.75" />
          </pattern>
          <filter id="emerald-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#2dd4bf" floodOpacity="0.8" />
          </filter>
          <marker
            id="arrow-teal"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#2dd4bf" />
          </marker>
          <marker
            id="arrow-default"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#38bdf8" />
          </marker>
        </defs>

        {/* Tactical Dark Grid Floor */}
        <rect width="800" height="500" fill="#080a0e" />
        <rect width="800" height="500" fill="url(#tactical-canvas-grid)" />

        {/* Dynamic Field Geometry */}
        {renderFieldBackground()}

        {/* QB Vision Read Cone & Progression Sequence Vectors */}
        {showQBVisionCone &&
          (() => {
            const qb =
              players.find((p) => p.id === 'qb' || p.label.toLowerCase() === 'qb') ||
              players.find((p) => p.role === 'offense');
            if (!qb) return null;

            const r1 = players.find((p) => p.progression === '1' && p.route.length > 0);
            const r2 = players.find((p) => p.progression === '2' && p.route.length > 0);
            const r1End = r1 ? r1.route[r1.route.length - 1] : null;
            const r2End = r2 ? r2.route[r2.route.length - 1] : null;

            return (
              <g pointerEvents="none">
                {/* Vision Cone Fan */}
                <polygon
                  points={`${qb.x},${qb.y} ${Math.max(20, qb.x - 240)},${Math.max(
                    20,
                    qb.y - 300
                  )} ${Math.min(780, qb.x + 240)},${Math.max(20, qb.y - 300)}`}
                  fill="#2dd4bf"
                  fillOpacity="0.04"
                  stroke="#2dd4bf"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  strokeOpacity="0.3"
                />
                {r1End && (
                  <path
                    d={`M ${qb.x} ${qb.y} Q ${(qb.x + r1End.x) / 2} ${
                      (qb.y + r1End.y) / 2 - 20
                    } ${r1End.x} ${r1End.y}`}
                    fill="none"
                    stroke="#2dd4bf"
                    strokeWidth="2.5"
                    strokeDasharray="4 3"
                    strokeOpacity="0.85"
                  />
                )}
                {r1End && r2End && (
                  <path
                    d={`M ${r1End.x} ${r1End.y} L ${r2End.x} ${r2End.y}`}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2"
                    strokeDasharray="3 3"
                    strokeOpacity="0.75"
                  />
                )}
              </g>
            );
          })()}

        {/* Drawn Player Routes */}
        {players.map((player) => {
          if (!player.route || player.route.length === 0) return null;
          const endPt = player.route[player.route.length - 1];
          const isSelected = selectedPlayerId === player.id;
          const routePath = `M ${player.x} ${player.y} ` + player.route.map((p) => `L ${p.x} ${p.y}`).join(' ');

          return (
            <g key={`route-${player.id}`}>
              {/* Route Trajectory Line */}
              <path
                d={routePath}
                fill="none"
                stroke={isSelected ? '#2dd4bf' : player.color || '#38bdf8'}
                strokeWidth={isSelected ? '4' : '3'}
                strokeLinecap="round"
                strokeLinejoin="round"
                markerEnd="url(#arrow-teal)"
                className={isSelected ? 'filter drop-shadow-md' : 'opacity-90'}
              />

              {/* Waypoint Cut Handles */}
              {!readOnly &&
                isSelected &&
                player.route.map((pt, idx) => (
                  <g key={`waypoint-${idx}`}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="16"
                      fill="transparent"
                      className="cursor-move"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDraggingWaypoint({ playerId: player.id, index: idx });
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        setDraggingWaypoint({ playerId: player.id, index: idx });
                      }}
                    />
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="6"
                      fill="#2dd4bf"
                      stroke="#042f2e"
                      strokeWidth="2"
                      className="drop-shadow pointer-events-none"
                    />
                  </g>
                ))}

              {/* Progression Read Tag Badge at route terminus */}
              {player.progression && player.progression !== 'none' && (
                <g transform={`translate(${endPt.x}, ${endPt.y - 18})`}>
                  {(() => {
                    const conf = PROGRESSION_BADGES[player.progression] || PROGRESSION_BADGES['1'];
                    return (
                      <>
                        <rect
                          x="-14"
                          y="-8"
                          width="28"
                          height="16"
                          rx="8"
                          fill={conf.bg}
                          stroke={conf.border}
                          strokeWidth="1.5"
                          className="drop-shadow-md"
                        />
                        <text
                          x="0"
                          y="3.5"
                          textAnchor="middle"
                          fill={conf.text}
                          fontSize="9"
                          fontWeight="900"
                          fontFamily="system-ui, sans-serif"
                        >
                          {conf.label}
                        </text>
                      </>
                    );
                  })()}
                </g>
              )}
            </g>
          );
        })}

        {/* Freehand Live Sketch Preview */}
        {isSketching && sketchPoints.length > 1 && selectedPlayer && (
          <path
            d={
              `M ${selectedPlayer.x} ${selectedPlayer.y} ` +
              sketchPoints.map((pt) => `L ${pt.x} ${pt.y}`).join(' ')
            }
            fill="none"
            stroke="#2dd4bf"
            strokeWidth="4"
            strokeDasharray="4 4"
            strokeLinecap="round"
            className="opacity-90 animate-pulse"
          />
        )}

        {/* Football Animation */}
        {isAnimating &&
          (() => {
            const qb =
              players.find((p) => p.id === 'qb' || p.label.toLowerCase() === 'qb') ||
              players.find((p) => p.role === 'offense');
            const targetRec =
              players.find((p) => p.progression === '1' && p.route.length > 0) ||
              players.find((p) => p.route.length > 0);
            if (!qb || !targetRec || targetRec.route.length === 0) return null;
            const targetEnd = targetRec.route[targetRec.route.length - 1];
            const midX = (qb.x + targetEnd.x) / 2;
            const midY = Math.min(qb.y, targetEnd.y) - 60;

            return (
              <g pointerEvents="none">
                <motion.circle
                  cx={targetEnd.x}
                  cy={targetEnd.y}
                  initial={{ r: 4, opacity: 0 }}
                  animate={{ r: [6, 24, 30], opacity: [0, 0.8, 0] }}
                  transition={{
                    duration: animationDuration,
                    times: [0, 0.7, 1],
                    repeat: Infinity,
                    repeatDelay: 0.5,
                  }}
                  fill="none"
                  stroke="#2dd4bf"
                  strokeWidth="2.5"
                />
                <motion.g
                  initial={{ x: qb.x, y: qb.y, scale: 0.8, rotate: 0 }}
                  animate={{
                    x: [qb.x, qb.x, midX, targetEnd.x],
                    y: [qb.y, qb.y - 10, midY, targetEnd.y],
                    scale: [0.8, 0.9, 1.35, 1.0],
                    rotate: [0, 45, 360, 720],
                  }}
                  transition={{
                    duration: animationDuration,
                    times: [0, 0.25, 0.65, 1],
                    ease: 'easeInOut',
                  }}
                >
                  <ellipse rx="10" ry="5.5" fill="#854d0e" stroke="#451a03" strokeWidth="1" />
                  <path d="M -7 -4.2 L -7 4.2" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
                  <path d="M 7 -4.2 L 7 4.2" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
                  <line x1="-3.5" y1="0" x2="3.5" y2="0" stroke="#ffffff" strokeWidth="1.2" />
                  <line x1="-2" y1="-2" x2="-2" y2="2" stroke="#ffffff" strokeWidth="0.8" />
                  <line x1="0" y1="-2" x2="0" y2="2" stroke="#ffffff" strokeWidth="0.8" />
                  <line x1="2" y1="-2" x2="2" y2="2" stroke="#ffffff" strokeWidth="0.8" />
                </motion.g>
              </g>
            );
          })()}

        {/* Player Nodes with Emerald Glow Ring & 44px Touch Target Hitbox */}
        {players.map((player) => {
          const isSelected = selectedPlayerId === player.id;
          const animateX =
            isAnimating && player.route.length > 0 ? [player.x, ...player.route.map((r) => r.x)] : player.x;
          const animateY =
            isAnimating && player.route.length > 0 ? [player.y, ...player.route.map((r) => r.y)] : player.y;

          return (
            <motion.g
              key={player.id}
              id={`player-node-${player.id}`}
              animate={{ x: animateX, y: animateY }}
              transition={{
                duration: isAnimating && player.route.length > 0 ? animationDuration : 0,
                ease: 'easeInOut',
              }}
              onMouseDown={(e) => handleMouseDown(player.id, e)}
              onTouchStart={(e) => handleTouchStart(player.id, e)}
              onClick={(e) => {
                e.stopPropagation();
                if (!readOnly) {
                  onSelectPlayer(player.id);
                }
              }}
              className={`${
                readOnly ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
              } touch-none`}
            >
              {/* Expanded 44px Touch Target Hitbox for smooth fingertip dragging */}
              <circle cx={0} cy={0} r={44} fill="transparent" pointerEvents="all" />

              {/* Node Selection: Vibrant Emerald / Teal Glow Ring */}
              {isSelected && (
                <g pointerEvents="none">
                  {/* Outer pulsating glow */}
                  <circle
                    cx={0}
                    cy={0}
                    r={26}
                    fill="none"
                    stroke="#2dd4bf"
                    strokeWidth="3"
                    filter="url(#emerald-glow)"
                    className="animate-pulse"
                  />
                  {/* Inner dashed ring */}
                  <circle
                    cx={0}
                    cy={0}
                    r={22}
                    fill="none"
                    stroke="#2dd4bf"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                  />
                </g>
              )}

              {/* Node Icon Token */}
              {renderShapeIcon(player)}

              {/* Position Label */}
              {player.shape !== 'cross' && (
                <text
                  x={0}
                  y={4}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="10"
                  fontWeight="900"
                  pointerEvents="none"
                >
                  {player.label}
                </text>
              )}
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
};

export default TacticalCanvas;
