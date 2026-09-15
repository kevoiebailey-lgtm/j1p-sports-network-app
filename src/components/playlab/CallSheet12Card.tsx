'use client';

import React, { useState } from 'react';
import {
  Play,
  Share2,
  Printer,
  Radio,
  Sparkles,
  Lock,
  Globe,
  Users,
  ChevronDown,
  Check,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  ArrowRightLeft,
  Trash2,
} from 'lucide-react';
import { PlayLabPlay } from '../../types/tactics';

interface CallSheet12CardProps {
  play: PlayLabPlay;
  slotNumber: number;
  isSelected?: boolean;
  selectedPosition?: string;
  themeMode?: 'dark' | 'print-white' | 'oled-neon';
  onSelectPlay: (play: PlayLabPlay) => void;
  onSwapSlot?: (fromSlot: number, toSlot: number) => void;
  onResetSlot?: (slot: number) => void;
  onUpdatePrivacy?: (play: PlayLabPlay, isPublic: boolean) => void;
}

/**
 * High-contrast color mapping for route vector thumbnails matching user specification:
 * - Yellow/Orange: Primary target / Read 1
 * - Cyan/Blue: Read 2 / Clear-out
 * - Emerald Green: Underneath Checkdown / Center Pop
 * - Dashed Pink/Red: Pre-snap motion / Jet reverse / Toss
 */
export function getRouteStemColor(route: PlayLabPlay['routes'][number]): string {
  if (route.color) return route.color;
  if (route.isMotion) return '#F43F5E';
  if (route.isPrimary) return '#F59E0B';
  if (route.player === 'C' || route.routeType?.toLowerCase().includes('check') || route.routeType?.toLowerCase().includes('drag')) {
    return '#10B981';
  }
  return '#38BDF8';
}

/**
 * Builds SVG path 'd' attribute from an array of coordinates
 */
export function generateSvgPath(coords: { x: number; y: number }[]): string {
  if (!coords || coords.length === 0) return '';
  if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;
  let path = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 1; i < coords.length; i++) {
    path += ` L ${coords[i].x} ${coords[i].y}`;
  }
  return path;
}

/**
 * Fallback routes if a custom play does not yet contain routes
 */
function getFallbackRoutesForPlay(play: PlayLabPlay): PlayLabPlay['routes'] {
  if (play.routes && play.routes.length > 0) return play.routes;

  return [
    {
      player: 'QB',
      coordinates: [{ x: 400, y: 420 }, { x: 400, y: 435 }],
      routeType: '1-Step Catch & Throw',
      isPrimary: false,
      color: '#64748B',
    },
    {
      player: 'C',
      coordinates: [{ x: 400, y: 350 }, { x: 400, y: 295 }, { x: 440, y: 285 }],
      routeType: '0: Center Checkdown',
      isPrimary: false,
      color: '#10B981',
    },
    {
      player: 'X',
      coordinates: [{ x: 180, y: 350 }, { x: 180, y: 160 }],
      routeType: '8: Backside Fly',
      isPrimary: false,
      color: '#38BDF8',
    },
    {
      player: 'H',
      coordinates: [{ x: 570, y: 360 }, { x: 640, y: 370 }, { x: 720, y: 300 }],
      routeType: '1: Perimeter Bubble',
      isPrimary: true,
      color: '#F59E0B',
    },
    {
      player: 'Z',
      coordinates: [{ x: 650, y: 350 }, { x: 650, y: 210 }, { x: 600, y: 170 }],
      routeType: '4: Seam In-Cut',
      isPrimary: false,
      color: '#38BDF8',
    },
  ];
}

/**
 * Miniature Vector Canvas Thumbnail (800x500 coordinate space)
 * Upgraded with:
 * - Pitch boundaries with faint hash & line-of-scrimmage markers
 * - Accurate player tokens (C, QB, X, H, Z)
 * - Standard 1.5px cyan (#38bdf8), motion dashed coral (#f43f5e), primary bold 2.5px gold (#f59e0b)
 * - Position Highlighting: bold gold (#eab308) for selected position and 35% opacity dimming for others
 * - High DPI vector scaling
 */
export function PlayVectorThumbnail({
  play,
  selectedPosition = 'ALL',
  className = 'w-full h-36',
  isPrint = false,
  themeMode,
}: {
  play: PlayLabPlay;
  selectedPosition?: string;
  className?: string;
  isPrint?: boolean;
  themeMode?: 'dark' | 'print-white' | 'oled-neon';
}) {
  const routes = getFallbackRoutesForPlay(play);
  const isPosFilterActive = Boolean(selectedPosition && selectedPosition !== 'ALL');
  const activeMode = themeMode || (isPrint ? 'print-white' : 'dark');
  const isPrintWhite = activeMode === 'print-white';
  const isOledNeon = activeMode === 'oled-neon';

  return (
    <div
      className={`relative overflow-hidden rounded-xl select-none transition-colors ${
        isPrintWhite
          ? 'bg-white border-2 border-black shadow-sm'
          : isOledNeon
          ? 'bg-black border-2 border-slate-800 shadow-2xl'
          : 'bg-[#070D12] border border-neutral-800/90 shadow-md'
      } ${className}`}
    >
      <svg
        viewBox="0 0 800 500"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
        shapeRendering="geometricPrecision"
      >
        <defs>
          <pattern
            id={`callsheet-grid-${play.id || 'thumb'}-${activeMode}`}
            width="40"
            height="25"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 25"
              fill="none"
              stroke={isPrintWhite ? '#E2E8F0' : isOledNeon ? '#162032' : '#1E293B'}
              strokeWidth="0.8"
              strokeOpacity={isPrintWhite ? '0.7' : '0.4'}
            />
          </pattern>

          {/* Enlarged 1.5x Arrowhead Markers (markerWidth=9, markerHeight=9) */}
          <marker id="pv-arrow-cyan" markerWidth="9" markerHeight="9" refX="7.5" refY="4.5" orient="auto-start-reverse">
            <path d="M0,0 L9,4.5 L0,9 Z" fill="#38BDF8" />
          </marker>
          <marker id="pv-arrow-gold" markerWidth="9" markerHeight="9" refX="7.5" refY="4.5" orient="auto-start-reverse">
            <path d="M0,0 L9,4.5 L0,9 Z" fill="#F59E0B" />
          </marker>
          <marker id="pv-arrow-highlight" markerWidth="9" markerHeight="9" refX="7.5" refY="4.5" orient="auto-start-reverse">
            <path d="M0,0 L9,4.5 L0,9 Z" fill="#EAB308" />
          </marker>
          <marker id="pv-arrow-coral" markerWidth="9" markerHeight="9" refX="7.5" refY="4.5" orient="auto-start-reverse">
            <path d="M0,0 L9,4.5 L0,9 Z" fill="#F43F5E" />
          </marker>
          <marker id="pv-arrow-emerald" markerWidth="9" markerHeight="9" refX="7.5" refY="4.5" orient="auto-start-reverse">
            <path d="M0,0 L9,4.5 L0,9 Z" fill="#10B981" />
          </marker>

          {/* OLED Neon Markers: Volt, Neon Cyan, Neon Orange */}
          <marker id="pv-arrow-volt" markerWidth="9" markerHeight="9" refX="7.5" refY="4.5" orient="auto-start-reverse">
            <path d="M0,0 L9,4.5 L0,9 Z" fill="#CCFF00" />
          </marker>
          <marker id="pv-arrow-neon-cyan" markerWidth="9" markerHeight="9" refX="7.5" refY="4.5" orient="auto-start-reverse">
            <path d="M0,0 L9,4.5 L0,9 Z" fill="#00FFFF" />
          </marker>
          <marker id="pv-arrow-neon-orange" markerWidth="9" markerHeight="9" refX="7.5" refY="4.5" orient="auto-start-reverse">
            <path d="M0,0 L9,4.5 L0,9 Z" fill="#FF6600" />
          </marker>

          {/* Print White High-Saturation Markers */}
          <marker id="pv-arrow-print-navy" markerWidth="9" markerHeight="9" refX="7.5" refY="4.5" orient="auto-start-reverse">
            <path d="M0,0 L9,4.5 L0,9 Z" fill="#0A192F" />
          </marker>
          <marker id="pv-arrow-print-amber" markerWidth="9" markerHeight="9" refX="7.5" refY="4.5" orient="auto-start-reverse">
            <path d="M0,0 L9,4.5 L0,9 Z" fill="#B45309" />
          </marker>
          <marker id="pv-arrow-print-crimson" markerWidth="9" markerHeight="9" refX="7.5" refY="4.5" orient="auto-start-reverse">
            <path d="M0,0 L9,4.5 L0,9 Z" fill="#B91C1C" />
          </marker>
          <marker id="pv-arrow-print-forest" markerWidth="9" markerHeight="9" refX="7.5" refY="4.5" orient="auto-start-reverse">
            <path d="M0,0 L9,4.5 L0,9 Z" fill="#047857" />
          </marker>

          <marker id="pv-arrow-dim" markerWidth="9" markerHeight="9" refX="7.5" refY="4.5" orient="auto-start-reverse">
            <path d="M0,0 L9,4.5 L0,9 Z" fill={isPrintWhite ? '#94A3B8' : '#38BDF8'} opacity="0.35" />
          </marker>
        </defs>

        {/* Pitch Background Canvas */}
        <rect width="800" height="500" fill={isPrintWhite ? '#FFFFFF' : isOledNeon ? '#000000' : '#070D12'} />
        <rect width="800" height="500" fill={`url(#callsheet-grid-${play.id || 'thumb'}-${activeMode})`} />

        {/* Outer Boundary Sidelines (x=30, x=770) */}
        <line
          x1="30"
          y1="10"
          x2="30"
          y2="490"
          stroke={isPrintWhite ? '#0F172A' : isOledNeon ? '#38BDF8' : '#334155'}
          strokeWidth="2"
          strokeOpacity={isPrintWhite ? '0.9' : '0.6'}
        />
        <line
          x1="770"
          y1="10"
          x2="770"
          y2="490"
          stroke={isPrintWhite ? '#0F172A' : isOledNeon ? '#38BDF8' : '#334155'}
          strokeWidth="2"
          strokeOpacity={isPrintWhite ? '0.9' : '0.6'}
        />

        {/* End Zone / Goal Line (y=100) */}
        <line
          x1="30"
          y1="100"
          x2="770"
          y2="100"
          stroke={isPrintWhite ? '#047857' : isOledNeon ? '#00FF66' : '#065F46'}
          strokeWidth="2"
          strokeDasharray="6 4"
          strokeOpacity={isPrintWhite ? '0.9' : '0.6'}
        />

        {/* 10-Yard First Down Line to Gain (y=250) */}
        <line
          x1="30"
          y1="250"
          x2="770"
          y2="250"
          stroke={isPrintWhite ? '#B45309' : isOledNeon ? '#CCFF00' : '#FACC15'}
          strokeWidth="1.8"
          strokeDasharray="5 4"
          strokeOpacity={isPrintWhite ? '0.85' : '0.65'}
        />

        {/* 7-Yard Rusher Line (y=298) */}
        <line
          x1="30"
          y1="298"
          x2="770"
          y2="298"
          stroke={isPrintWhite ? '#DC2626' : isOledNeon ? '#FF6600' : '#F59E0B'}
          strokeWidth="1.8"
          strokeDasharray="5 4"
          strokeOpacity={isPrintWhite ? '0.85' : '0.65'}
        />

        {/* Line of Scrimmage (LOS at y=350) */}
        <line
          x1="30"
          y1="350"
          x2="770"
          y2="350"
          stroke={isPrintWhite ? '#0A192F' : isOledNeon ? '#00FFFF' : '#38BDF8'}
          strokeWidth="3"
          strokeDasharray="8 4"
          strokeOpacity="0.95"
        />

        {/* Hash Marks */}
        {[180, 250, 298, 350, 420].map((y) => (
          <g key={`hash-${y}`}>
            <line
              x1="312"
              y1={y}
              x2="328"
              y2={y}
              stroke={isPrintWhite ? '#0F172A' : '#64748B'}
              strokeWidth="1.8"
              strokeOpacity={isPrintWhite ? '0.8' : '0.6'}
            />
            <line
              x1="472"
              y1={y}
              x2="488"
              y2={y}
              stroke={isPrintWhite ? '#0F172A' : '#64748B'}
              strokeWidth="1.8"
              strokeOpacity={isPrintWhite ? '0.8' : '0.6'}
            />
          </g>
        ))}

        {/* Defensive Zones Overlay for Defensive Plays */}
        {play.playMode === 'defense' && (
          <g id="thumb-defense-layer">
            {play.defenseZones?.map((z, zIdx) => (
              <rect
                key={`thumb-z-${zIdx}`}
                x={z.x - z.width / 2}
                y={z.y - z.height / 2}
                width={z.width}
                height={z.height}
                rx="6"
                fill={z.color}
                stroke={z.name === 'Hook' ? '#A855F7' : z.name === 'Flat' ? '#10B981' : '#38BDF8'}
                strokeWidth="1.5"
                strokeDasharray="4 2"
                opacity={0.7}
              />
            ))}
          </g>
        )}

        {/* Route Vector Stems: Min 4px Stroke, 5px Primary, Halo Border, 1.5x Arrowheads */}
        {routes.map((route, idx) => {
          const pathD = generateSvgPath(route.coordinates);
          if (!pathD) return null;

          const isTargetPos = isPosFilterActive && route.player === selectedPosition;
          const isDimmed = isPosFilterActive && !isTargetPos;
          const isPrimary = route.isPrimary || route.readProgression === 1;
          const finalPoint = route.coordinates[route.coordinates.length - 1];

          // Dynamic Stroke Width: min 4px, 5px for primary/target reads
          let strokeWidth = isPrimary || isTargetPos ? 5 : 4;
          let strokeColor = '#38BDF8';
          let markerId = 'pv-arrow-cyan';
          let dashArray: string | undefined = route.strokeDasharray;

          if (isPrintWhite) {
            // White background with dark high-saturation lines for anti-glare printed card inserts
            if (isTargetPos) {
              strokeColor = '#B45309';
              markerId = 'pv-arrow-print-amber';
            } else if (route.isMotion) {
              strokeColor = '#B91C1C';
              dashArray = '6 3';
              markerId = 'pv-arrow-print-crimson';
            } else if (isPrimary) {
              strokeColor = '#B45309';
              markerId = 'pv-arrow-print-amber';
            } else if (route.player === 'C' || route.readProgression === 3) {
              strokeColor = '#047857';
              markerId = 'pv-arrow-print-forest';
            } else {
              strokeColor = '#0A192F';
              markerId = 'pv-arrow-print-navy';
            }
          } else if (isOledNeon) {
            // True-black OLED high-contrast mode with vibrant neon accents
            if (isTargetPos || isPrimary) {
              strokeColor = '#CCFF00'; // Volt
              markerId = 'pv-arrow-volt';
            } else if (route.isMotion) {
              strokeColor = '#FF6600'; // Vibrant Neon Orange
              dashArray = '6 3';
              markerId = 'pv-arrow-neon-orange';
            } else if (route.player === 'C' || route.readProgression === 3) {
              strokeColor = '#00FF66'; // Neon Emerald
              markerId = 'pv-arrow-emerald';
            } else {
              strokeColor = '#00FFFF'; // Vibrant Cyan
              markerId = 'pv-arrow-neon-cyan';
            }
          } else {
            // Tactical Dark Standard
            if (isTargetPos) {
              strokeColor = '#EAB308';
              markerId = 'pv-arrow-highlight';
            } else if (route.isMotion) {
              strokeColor = '#F43F5E';
              dashArray = '6 3';
              markerId = 'pv-arrow-coral';
            } else if (isPrimary) {
              strokeColor = '#F59E0B';
              markerId = 'pv-arrow-gold';
            } else if (route.player === 'C' || route.readProgression === 3) {
              strokeColor = '#10B981';
              markerId = 'pv-arrow-emerald';
            }
          }

          if (isDimmed) {
            markerId = 'pv-arrow-dim';
          }

          const haloStroke = isPrintWhite ? '#FFFFFF' : '#000000';
          const haloWidth = strokeWidth + 3.5; // e.g. 7.5px - 8.5px

          return (
            <g key={`route-${route.player}-${idx}`} opacity={isDimmed ? 0.30 : 1}>
              {/* High-Contrast Halo/Outline Border to make route pop against turf / dark field */}
              <path
                d={pathD}
                fill="none"
                stroke={haloStroke}
                strokeWidth={haloWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={isPrintWhite ? 1 : 0.9}
              />

              {/* Primary Dynamic Route Stem (Min 4px, 5px Primary) */}
              <path
                d={pathD}
                fill="none"
                stroke={isPrintWhite && isDimmed ? '#94A3B8' : strokeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={dashArray}
                strokeLinecap="round"
                strokeLinejoin="round"
                markerEnd={`url(#${markerId})`}
              />

              {/* Pass Target Termination Point (Enlarged 1.5x - 5px radius) */}
              {finalPoint && (
                <circle
                  cx={finalPoint.x}
                  cy={finalPoint.y}
                  r={isPrimary || isTargetPos ? 5.5 : 4.5}
                  fill={strokeColor}
                  stroke={haloStroke}
                  strokeWidth="2"
                  className="filter drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
                />
              )}
            </g>
          );
        })}

        {/* Player Pre-Snap Tokens (Node Radius: 20px–24px, Bold Typography, Centered) */}
        {routes.map((route) => {
          const startPt = route.coordinates[0] || { x: 400, y: 350 };
          const isTargetPos = isPosFilterActive && route.player === selectedPosition;
          const isDimmed = isPosFilterActive && !isTargetPos;
          const isQB = route.player === 'QB';
          const isCenter = route.player === 'C';
          const isPrimary = route.isPrimary || route.readProgression === 1;

          // Player circle radius: at least 20px-24px
          const nodeRadius = isQB ? 24 : 22;

          let tokenFill = '#0F172A';
          let tokenStroke = '#FFFFFF';
          let textColor = '#FFFFFF';

          if (isPrintWhite) {
            if (isTargetPos) {
              tokenFill = '#000000';
              tokenStroke = '#B45309';
              textColor = '#FFFFFF';
            } else if (isQB) {
              tokenFill = '#0A192F';
              tokenStroke = '#000000';
              textColor = '#FFFFFF';
            } else if (isCenter) {
              tokenFill = '#047857';
              tokenStroke = '#000000';
              textColor = '#FFFFFF';
            } else if (isPrimary) {
              tokenFill = '#B45309';
              tokenStroke = '#000000';
              textColor = '#FFFFFF';
            } else {
              tokenFill = '#000000';
              tokenStroke = '#334155';
              textColor = '#FFFFFF';
            }
          } else if (isOledNeon) {
            if (isTargetPos || isPrimary) {
              tokenFill = '#CCFF00'; // Volt
              tokenStroke = '#FFFFFF';
              textColor = '#000000';
            } else if (isQB) {
              tokenFill = '#00FFFF'; // Neon Cyan
              tokenStroke = '#FFFFFF';
              textColor = '#000000';
            } else if (isCenter) {
              tokenFill = '#00FF66'; // Neon Green
              tokenStroke = '#FFFFFF';
              textColor = '#000000';
            } else {
              tokenFill = '#000000';
              tokenStroke = '#00FFFF';
              textColor = '#FFFFFF';
            }
          } else {
            if (isTargetPos) {
              tokenFill = '#EAB308';
              tokenStroke = '#FFFFFF';
              textColor = '#000000';
            } else if (isQB) {
              tokenFill = '#0284C7';
              tokenStroke = '#FFFFFF';
              textColor = '#FFFFFF';
            } else if (isCenter) {
              tokenFill = '#059669';
              tokenStroke = '#FFFFFF';
              textColor = '#FFFFFF';
            } else if (isPrimary) {
              tokenFill = '#D97706';
              tokenStroke = '#FDE047';
              textColor = '#FFFFFF';
            }
          }

          return (
            <g key={`player-${route.player}`} opacity={isDimmed ? 0.30 : 1}>
              {/* Outer Halo for Direct Sunlight Contrast */}
              <circle
                cx={startPt.x}
                cy={startPt.y}
                r={nodeRadius + 2.5}
                fill="#000000"
                opacity={isPrintWhite ? '0.25' : '0.8'}
              />

              {/* Base Circle Token */}
              <circle
                cx={startPt.x}
                cy={startPt.y}
                r={nodeRadius}
                fill={tokenFill}
                stroke={isTargetPos ? '#EAB308' : tokenStroke}
                strokeWidth={isTargetPos ? 3.5 : 2.2}
              />

              {/* Bold Position Letter Label (Font-Weight: 900 / font-black, Centered) */}
              <text
                x={startPt.x}
                y={startPt.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={textColor}
                fontSize={isQB ? '13' : route.player.length > 2 ? '11' : '12'}
                fontWeight="900"
                fontFamily="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                className="select-none pointer-events-none tracking-tight"
                style={{ letterSpacing: '-0.02em' }}
              >
                {route.player}
              </text>

              {/* Highlight Ring for Selected Athlete */}
              {isTargetPos && (
                <circle
                  cx={startPt.x}
                  cy={startPt.y}
                  r={nodeRadius + 6}
                  fill="none"
                  stroke={isPrintWhite ? '#B45309' : '#EAB308'}
                  strokeWidth="2.5"
                  strokeDasharray="5 3"
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Cadence / Mode Pill in Top-Right Corner */}
      <div className="absolute top-1.5 right-1.5 flex items-center gap-1 pointer-events-none">
        {play.playMode === 'defense' ? (
          <span className="px-1.5 py-0.5 rounded bg-rose-950/90 backdrop-blur border border-rose-500/50 text-[8.5px] font-mono font-black text-rose-300">
            DEFENSE
          </span>
        ) : play.cadence ? (
          <span
            className={`px-2 py-0.5 rounded font-mono font-black text-[9px] uppercase shadow-sm ${
              isPrintWhite
                ? 'bg-black text-white'
                : isOledNeon
                ? 'bg-[#CCFF00] text-black border border-[#CCFF00]'
                : 'bg-black/85 backdrop-blur border border-white/20 text-neutral-200'
            }`}
          >
            {play.cadence}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Individual Call Sheet 12 Card
 * Compact Top Bar: [ Slot Number Badge ] [ Short Play Name ] [ Cadence / Color ]
 * Inline Mini Vector Route Diagram with Position Highlighting
 */
export const CallSheet12Card: React.FC<CallSheet12CardProps> = ({
  play,
  slotNumber,
  isSelected = false,
  selectedPosition = 'ALL',
  themeMode = 'dark',
  onSelectPlay,
  onSwapSlot,
  onResetSlot,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  // Badge accent colors for slots 1-12
  const slotBadgeColors: Record<number, { bg: string; ring: string; text: string }> = {
    1: { bg: 'bg-amber-500/25', ring: 'ring-amber-400', text: 'text-amber-400' },
    2: { bg: 'bg-sky-500/25', ring: 'ring-sky-400', text: 'text-sky-400' },
    3: { bg: 'bg-emerald-500/25', ring: 'ring-emerald-400', text: 'text-emerald-400' },
    4: { bg: 'bg-rose-500/25', ring: 'ring-rose-400', text: 'text-rose-400' },
    5: { bg: 'bg-indigo-500/25', ring: 'ring-indigo-400', text: 'text-indigo-400' },
    6: { bg: 'bg-lime-500/25', ring: 'ring-lime-400', text: 'text-lime-400' },
    7: { bg: 'bg-violet-500/25', ring: 'ring-violet-400', text: 'text-violet-400' },
    8: { bg: 'bg-teal-500/25', ring: 'ring-teal-400', text: 'text-teal-400' },
    9: { bg: 'bg-orange-500/25', ring: 'ring-orange-400', text: 'text-orange-400' },
    10: { bg: 'bg-fuchsia-500/25', ring: 'ring-fuchsia-400', text: 'text-fuchsia-400' },
    11: { bg: 'bg-cyan-500/25', ring: 'ring-cyan-400', text: 'text-cyan-400' },
    12: { bg: 'bg-yellow-500/25', ring: 'ring-yellow-400', text: 'text-yellow-400' },
  };

  const badgeTheme = slotBadgeColors[slotNumber] || slotBadgeColors[1];
  const isPrintWhite = themeMode === 'print-white';
  const isOledNeon = themeMode === 'oled-neon';

  // Wristband signal code / audible (e.g. FLAG-42, GREEN LIGHT, VIPER-7)
  const signalCode =
    play.wristbandCode ||
    play.signalCode ||
    (play.audibleColor
      ? play.audibleColor.toUpperCase()
      : `FLAG-${slotNumber * 4 + 10}`);

  return (
    <div
      id={`callsheet-slot-${slotNumber}`}
      onClick={() => onSelectPlay(play)}
      className={`group relative flex flex-col justify-between rounded-2xl border p-2.5 sm:p-3 transition-all duration-200 cursor-pointer select-none ${
        isPrintWhite
          ? isSelected
            ? 'bg-white border-2 border-black shadow-lg ring-2 ring-black/40'
            : 'bg-slate-50 hover:bg-white border-2 border-slate-300 hover:border-black'
          : isOledNeon
          ? isSelected
            ? 'bg-black border-2 border-[#CCFF00] shadow-[0_0_25px_rgba(204,255,0,0.35)] ring-2 ring-[#CCFF00]/50'
            : 'bg-black hover:bg-neutral-950 border-2 border-neutral-800 hover:border-neutral-700'
          : isSelected
          ? 'bg-neutral-900/95 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)] ring-2 ring-emerald-500/50'
          : 'bg-neutral-900/70 hover:bg-neutral-900/95 border-neutral-800 hover:border-neutral-700'
      }`}
    >
      {/* High-Visibility Header: Ultra-bold Play Name, Slot Badge, Cadence, & Signal Code */}
      <div className="flex flex-col gap-1.5 mb-2 min-w-0">
        <div className="flex items-center justify-between gap-1.5 min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Slot Number Badge */}
            <div
              className={`w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg font-black text-xs font-mono ring-2 shadow-sm ${
                isPrintWhite
                  ? 'bg-black text-white ring-black'
                  : isOledNeon
                  ? 'bg-[#CCFF00] text-black ring-[#CCFF00] font-black'
                  : `${badgeTheme.ring} ${badgeTheme.bg} ${badgeTheme.text}`
              }`}
            >
              {slotNumber}
            </div>

            {/* Ultra-bold Uppercase Play Name */}
            <h4
              className={`text-xs sm:text-sm font-black truncate leading-tight tracking-tight uppercase transition-colors ${
                isPrintWhite
                  ? 'text-black group-hover:text-sky-800'
                  : isOledNeon
                  ? 'text-white group-hover:text-[#CCFF00]'
                  : 'text-white group-hover:text-emerald-300'
              }`}
            >
              {play.name.toUpperCase()}
            </h4>
          </div>

          {/* Quick Actions Menu Trigger */}
          <div className="relative shrink-0">
            <button
              type="button"
              id={`slot-${slotNumber}-actions-btn`}
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors ${
                isPrintWhite
                  ? 'text-slate-700 hover:bg-slate-200'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
              title="Slot Actions"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {showMenu && (
              <div
                className="absolute right-0 top-7 z-30 w-44 rounded-xl bg-neutral-950 border border-neutral-800 p-1.5 shadow-2xl text-xs space-y-1"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelectPlay(play);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors text-left font-bold"
                >
                  <Play className="w-3.5 h-3.5" />
                  Load onto Canvas
                </button>

                {onSwapSlot && (
                  <div className="px-2.5 py-1 border-t border-neutral-800/80">
                    <span className="text-[10px] font-semibold text-neutral-400 block mb-1">
                      Swap to Slot:
                    </span>
                    <div className="grid grid-cols-6 gap-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((s) => (
                        <button
                          key={`swap-to-${s}`}
                          type="button"
                          disabled={s === slotNumber}
                          onClick={() => {
                            onSwapSlot(slotNumber, s);
                            setShowMenu(false);
                          }}
                          className={`h-5 text-[10px] font-mono font-bold rounded flex items-center justify-center ${
                            s === slotNumber
                              ? 'bg-neutral-800 text-neutral-600'
                              : 'bg-neutral-900 text-neutral-300 hover:bg-sky-500/20 hover:text-sky-300'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {onResetSlot && (
                  <button
                    type="button"
                    onClick={() => {
                      onResetSlot(slotNumber);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reset Preset
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Dedicated High-Contrast Cadence & Wristband Signal Code Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Signal Code Badge (e.g. FLAG-42, GREEN LIGHT) */}
          <span
            className={`px-2 py-0.5 rounded-md font-mono font-black text-[9.5px] uppercase tracking-wider shadow-sm ${
              isPrintWhite
                ? 'bg-black text-amber-300 border border-black'
                : isOledNeon
                ? 'bg-[#CCFF00] text-black border border-[#CCFF00]'
                : 'bg-amber-400 text-black border border-amber-300'
            }`}
          >
            {signalCode}
          </span>

          {/* Cadence Badge */}
          {play.cadence && (
            <span
              className={`px-2 py-0.5 rounded-md font-mono font-extrabold text-[9px] uppercase ${
                isPrintWhite
                  ? 'bg-slate-200 text-slate-900 border border-slate-300'
                  : isOledNeon
                  ? 'bg-neutral-900 text-[#00FFFF] border border-neutral-700'
                  : 'bg-neutral-800 text-neutral-200 border border-neutral-700'
              }`}
            >
              {play.cadence}
            </span>
          )}

          {/* Formation Subtitle */}
          <span
            className={`ml-auto font-mono text-[9px] font-bold ${
              isPrintWhite ? 'text-slate-600' : 'text-neutral-400'
            }`}
          >
            {play.formation || 'SPREAD'}
          </span>
        </div>
      </div>

      {/* Embedded High-DPI Vector Route Diagram: Fills >= 70% of Slot Card Viewport */}
      <div className="w-full flex-1 min-h-[170px] sm:min-h-[200px] flex items-center justify-center">
        <PlayVectorThumbnail
          play={play}
          selectedPosition={selectedPosition}
          className="w-full h-44 sm:h-52 md:h-56"
          themeMode={themeMode}
          isPrint={isPrintWhite}
        />
      </div>

      {/* Compact Bottom Bar */}
      <div
        className={`mt-2 pt-1.5 flex items-center justify-between text-[10px] border-t ${
          isPrintWhite ? 'border-slate-200 text-slate-700' : 'border-neutral-800/80 text-neutral-400'
        }`}
      >
        <div className="flex items-center gap-1.5 font-mono text-[9.5px]">
          <span className="font-semibold">{play.format || '5v5'}</span>
          {play.category && <span className="hidden sm:inline">• {play.category}</span>}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectPlay(play);
          }}
          className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md font-black text-[10px] uppercase transition-colors ${
            isPrintWhite
              ? 'bg-slate-200 hover:bg-black hover:text-white text-slate-900'
              : isOledNeon
              ? 'bg-neutral-900 hover:bg-[#CCFF00] hover:text-black text-[#CCFF00] border border-[#CCFF00]/40'
              : 'bg-neutral-800 hover:bg-emerald-500/20 text-neutral-200 hover:text-emerald-400'
          }`}
        >
          <Play className="w-2.5 h-2.5 fill-current" />
          Load Canvas
        </button>
      </div>
    </div>
  );
};

interface CallSheet12GridProps {
  plays: PlayLabPlay[];
  activePlayId?: string;
  onSelectPlay: (play: PlayLabPlay) => void;
  onPrintWristband: () => void;
  onBroadcastAll: () => Promise<void>;
  onSeedChampionshipPlays: () => Promise<void>;
  onSwapSlot?: (fromSlot: number, toSlot: number) => void;
  onResetSlot?: (slot: number) => void;
  onUpdateCallSheetPrivacy?: (isPublic: boolean, teamId?: string) => Promise<void>;
  selectedTeamId?: string;
  userTeams?: Array<{ id: string; name: string }>;
  isBroadcasting?: boolean;
}

/**
 * Dedicated 12-Slot PlaymakerX-Style Call Sheet Grid View (3x4 Grid)
 * Enhanced with:
 * - Position Highlighting: [ ALL | QB | C | X | H | Z ]
 * - High-DPI Vector Route Diagrams in each slot
 * - Print modal supporting 2.25" x 4.5" & 3.5" x 5" wristband inserts
 */
export const CallSheet12Grid: React.FC<CallSheet12GridProps> = ({
  plays,
  activePlayId,
  onSelectPlay,
  onPrintWristband,
  onBroadcastAll,
  onSeedChampionshipPlays,
  onSwapSlot,
  onResetSlot,
  onUpdateCallSheetPrivacy,
  isBroadcasting = false,
}) => {
  const [privacyState, setPrivacyState] = useState<'private' | 'team' | 'public'>('private');
  const [selectedPosition, setSelectedPosition] = useState<string>('ALL');
  const [themeMode, setThemeMode] = useState<'dark' | 'print-white' | 'oled-neon'>('dark');
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [printInsertSize, setPrintInsertSize] = useState<'standard' | 'large'>('standard');
  const [isSunlightMode, setIsSunlightMode] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Guarantee 12 slots
  const slots = Array.from({ length: 12 }, (_, i) => {
    const slotNum = i + 1;
    const matched = plays.find((p) => p.slotIndex === slotNum);
    return (
      matched ||
      plays[i] || {
        id: `empty_slot_${slotNum}`,
        name: `Slot ${slotNum}`,
        formation: 'Spread',
        format: '5v5',
        slotIndex: slotNum,
        isPublic: false,
        userId: 'coach',
        createdAt: Date.now(),
        routes: [],
      }
    );
  });

  const handleBroadcast = async () => {
    setSyncStatus('Pushing 12 plays to HUD in <200ms...');
    try {
      await onBroadcastAll();
      setSyncStatus('✅ 12 Plays live on Athlete Wristbands');
      setTimeout(() => setSyncStatus(null), 3000);
    } catch {
      setSyncStatus('❌ Sync error. Offline cache active.');
      setTimeout(() => setSyncStatus(null), 3000);
    }
  };

  return (
    <div className="w-full bg-neutral-950/80 rounded-2xl border border-neutral-800/80 p-3 sm:p-5 backdrop-blur-xl">
      {/* 12-Slot Header with Privacy & Broadcast Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-black uppercase tracking-wider">
              PlaymakerX Standard
            </span>
            <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
              12-Slot Wristband Call Sheet
            </h3>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Championship 3×4 grid with vector route diagrams. Tap any slot to load onto the canvas, or push all 12 to athlete wristband HUDs.
          </p>
        </div>

        {/* Actions Cluster */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Privacy Dropdown Selector */}
          <div className="relative inline-flex items-center">
            <select
              value={privacyState}
              onChange={async (e) => {
                const val = e.target.value as 'private' | 'team' | 'public';
                setPrivacyState(val);
                if (onUpdateCallSheetPrivacy) {
                  await onUpdateCallSheetPrivacy(val === 'public');
                }
              }}
              className="appearance-none bg-neutral-900 border border-neutral-700 hover:border-neutral-600 text-xs font-semibold text-neutral-200 pl-3 pr-8 py-2 rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="private">🔒 Private (Only Me)</option>
              <option value="team">👥 Sync Team Roster</option>
              <option value="public">🌐 Publish to Matrix</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 pointer-events-none" />
          </div>

          {/* Seed Championship Pack Button */}
          <button
            type="button"
            id="seed-championship-plays-btn"
            onClick={onSeedChampionshipPlays}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-semibold text-neutral-300 hover:text-amber-300 transition-colors"
            title="Pre-load the 12 Official Championship Flag Plays into slots 1-12"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Seed 12 Plays</span>
            <span className="sm:hidden">Seed 12</span>
          </button>

          {/* 1-Click Print 12-Slot Wristband Insert (Quick Modal or Full Exporter) */}
          <button
            type="button"
            id="print-12-wristband-btn"
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-xs font-bold text-white shadow-sm transition-all"
            title="Preview and print high-DPI 2.25x4.5 or 3.5x5 wristband inserts"
          >
            <Printer className="w-3.5 h-3.5 text-sky-400" />
            <span>🖨 Print Insert</span>
          </button>

          {/* 1-Click Push All 12 to Wristband HUD */}
          <button
            type="button"
            id="push-12-to-wristband-btn"
            onClick={handleBroadcast}
            disabled={isBroadcasting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-black text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all active:scale-95 disabled:opacity-50"
            title="Broadcast entire 12-play call sheet to athlete mobile viewports in <200ms"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-200" />
            <span>📲 Push All 12 to HUD</span>
          </button>
        </div>
      </div>

      {/* Position Highlighting & High-Visibility Mode Filter Toolbar */}
      <div className="mt-3.5 pt-3 pb-2 flex flex-wrap items-center justify-between gap-2.5 border-b border-neutral-800/80">
        <div className="flex flex-wrap items-center gap-3">
          {/* High-Visibility Mode 3-Way Switcher */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-neutral-300">Display:</span>
            <div className="flex items-center gap-1 bg-neutral-900/90 p-1 rounded-xl border border-neutral-800">
              <button
                type="button"
                onClick={() => setThemeMode('dark')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  themeMode === 'dark'
                    ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Tactical Dark Field Mode"
              >
                🌙 Tactical
              </button>
              <button
                type="button"
                onClick={() => setThemeMode('print-white')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  themeMode === 'print-white'
                    ? 'bg-white text-black shadow-md border border-black'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="High-Visibility Sunlight Print White (Anti-Glare)"
              >
                ☀️ Print / Sun
              </button>
              <button
                type="button"
                onClick={() => setThemeMode('oled-neon')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  themeMode === 'oled-neon'
                    ? 'bg-black text-[#CCFF00] shadow-[0_0_12px_rgba(204,255,0,0.3)] border border-[#CCFF00]'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="True-Black OLED High-Contrast Mode with Neon Accents"
              >
                ⚡ OLED Neon
              </button>
            </div>
          </div>

          {/* Athlete Position Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-neutral-300">Position:</span>
            <div className="flex items-center gap-1 bg-neutral-900/90 p-1 rounded-xl border border-neutral-800">
              {['ALL', 'QB', 'C', 'X', 'H', 'Z'].map((pos) => {
                const isActive = selectedPosition === pos;
                return (
                  <button
                    key={`pos-filter-${pos}`}
                    type="button"
                    onClick={() => setSelectedPosition(pos)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {pos}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="text-[11px] text-neutral-400 font-mono flex items-center gap-2">
          {selectedPosition !== 'ALL' ? (
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Highlighting {selectedPosition}&apos;s route in gold (#eab308) • Other routes dimmed (30%)
            </span>
          ) : (
            <span>Cyan = Route • Coral = Motion • Gold = Read 1 Primary</span>
          )}
        </div>
      </div>

      {/* Real-time sync feedback notification */}
      {syncStatus && (
        <div className="mt-3 p-2 rounded-lg bg-neutral-900 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold flex items-center justify-between">
          <span>{syncStatus}</span>
          <span className="text-[10px] text-neutral-400">&lt;200ms latency</span>
        </div>
      )}

      {/* 3x4 GRID (Slots 1-12) - PlaymakerX-Style Layout */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {slots.map((play, index) => {
          const slotNum = index + 1;
          const isSelected = activePlayId === play.id || activePlayId === `slot_${slotNum}`;

          return (
            <CallSheet12Card
              key={`slot-${slotNum}-${play.id || index}`}
              slotNumber={slotNum}
              play={play}
              isSelected={isSelected}
              selectedPosition={selectedPosition}
              themeMode={themeMode}
              onSelectPlay={onSelectPlay}
              onSwapSlot={onSwapSlot}
              onResetSlot={onResetSlot}
            />
          );
        })}
      </div>

      {/* Printable 12-Slot Wristband Insert Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-700 rounded-3xl p-5 max-w-4xl w-full space-y-4 shadow-2xl my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Printer className="w-5 h-5 text-sky-400" />
                  Printable 12-Slot Wristband Insert (300-DPI)
                </h3>
                <p className="text-xs text-neutral-400">
                  Sideline wrist coach inserts with physical vector diagrams &amp; sunlight-optimized contrast.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Print Configuration Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-950 p-3 rounded-2xl border border-neutral-800">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-neutral-300">Dimensions:</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPrintInsertSize('standard')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      printInsertSize === 'standard'
                        ? 'bg-sky-400 text-black shadow-md'
                        : 'bg-neutral-900 text-neutral-400 hover:text-white'
                    }`}
                  >
                    2.25&quot; × 4.5&quot; (Standard)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintInsertSize('large')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      printInsertSize === 'large'
                        ? 'bg-sky-400 text-black shadow-md'
                        : 'bg-neutral-900 text-neutral-400 hover:text-white'
                    }`}
                  >
                    3.5&quot; × 5&quot; (Large Playbook)
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-neutral-300">Contrast:</span>
                <button
                  type="button"
                  onClick={() => setIsSunlightMode(!isSunlightMode)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSunlightMode
                      ? 'bg-amber-400 text-black shadow-md'
                      : 'bg-neutral-800 text-neutral-300 hover:text-white'
                  }`}
                  title="Toggle Sunlight High-Contrast White Background"
                >
                  <span>{isSunlightMode ? '☀️ Sunlight Mode (White Field)' : '🌙 Dark Field'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-neutral-300">Card View:</span>
                <select
                  value={selectedPosition}
                  onChange={(e) => setSelectedPosition(e.target.value)}
                  className="bg-neutral-900 border border-neutral-700 text-xs font-bold text-neutral-200 px-2.5 py-1.5 rounded-xl cursor-pointer"
                >
                  <option value="ALL">Team Master (All 5 Routes)</option>
                  <option value="QB">QB Only (Pass Progression)</option>
                  <option value="C">Center (C Isolated Route)</option>
                  <option value="X">X Receiver (Isolated Route)</option>
                  <option value="H">H Slot / Point (Isolated Route)</option>
                  <option value="Z">Z Receiver (Isolated Route)</option>
                </select>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Now
                </button>
              </div>
            </div>

            {/* High-DPI Printable Insert Preview Container */}
            <div
              id="printable-wristband-card"
              className={`p-3 rounded-2xl border-2 mx-auto shadow-xl transition-colors ${
                isSunlightMode
                  ? 'bg-white text-black border-black/80'
                  : 'bg-slate-950 text-white border-slate-700'
              }`}
              style={{
                maxWidth: printInsertSize === 'standard' ? '680px' : '740px',
              }}
            >
              <div className={`flex items-center justify-between pb-1 mb-1.5 border-b ${isSunlightMode ? 'border-black' : 'border-slate-800'}`}>
                <div className="font-black text-[11px] uppercase tracking-wider font-mono">
                  JUST1PLAY • 12-SLOT WRIST COACH
                </div>
                <div className="font-mono text-[9px] font-bold opacity-80">
                  SIZE: {printInsertSize === 'standard' ? '2.25" × 4.5"' : '3.5" × 5"'} • {selectedPosition === 'ALL' ? 'TEAM MASTER' : `${selectedPosition} ISOLATED`} • {isSunlightMode ? 'SUNLIGHT 300DPI' : 'DARK FIELD'}
                </div>
              </div>

              {/* 4 cols x 3 rows High-DPI Vector Grid */}
              <div className="grid grid-cols-4 gap-1.5">
                {slots.map((p, idx) => (
                  <div
                    key={`print-slot-${idx}`}
                    className={`border rounded-lg p-1 flex flex-col justify-between ${
                      isSunlightMode ? 'border-black bg-slate-50 text-black' : 'border-slate-800 bg-slate-900 text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className={`w-4 h-4 rounded text-[9px] font-black font-mono flex items-center justify-center shrink-0 ${
                          isSunlightMode ? 'bg-black text-white' : 'bg-[#00F0D0] text-black'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="text-[9px] font-black truncate leading-tight uppercase">
                          {p.name}
                        </span>
                      </div>
                      {p.cadence && (
                        <span className={`text-[7.5px] font-mono font-bold shrink-0 ${
                          isSunlightMode ? 'text-slate-700' : 'text-slate-400'
                        }`}>
                          {p.cadence}
                        </span>
                      )}
                    </div>
                    <PlayVectorThumbnail
                      play={p}
                      selectedPosition={selectedPosition}
                      className="w-full h-16"
                      isPrint={isSunlightMode}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center text-xs text-neutral-400">
              Tip: In your browser print dialog, choose &quot;Save as PDF&quot; or select your printer with Background Graphics enabled.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
