import React from 'react';
import { DefensivePlayer } from '../../types/tactics';

interface DefensivePlayerNodeProps {
  player: DefensivePlayer;
  isSelected: boolean;
  onSelect: (player: DefensivePlayer) => void;
  onDragStart?: (player: DefensivePlayer, e: React.PointerEvent<SVGGElement>) => void;
}

export const DefensivePlayerNode: React.FC<DefensivePlayerNodeProps> = ({
  player,
  isSelected,
  onSelect,
  onDragStart,
}) => {
  const isRusher = player.label === 'R';
  const isMLB = player.label === 'MLB';
  const isFS = player.label === 'FS';

  // Defensive token coloring: High-contrast aggressive palette
  const fillGradient = isRusher
    ? '#DC2626' // Red 600
    : isMLB
    ? '#9333EA' // Purple 600
    : isFS
    ? '#D97706' // Amber 600
    : '#0284C7'; // Sky 600 for corners

  const strokeColor = isSelected
    ? '#FFFFFF'
    : isRusher
    ? '#FCA5A5'
    : isMLB
    ? '#D8B4FE'
    : '#BAE6FD';

  const radius = isRusher ? 16 : 14;

  return (
    <g
      id={`def-player-node-${player.id}`}
      transform={`translate(${player.x}, ${player.y})`}
      className="cursor-grab active:cursor-grabbing select-none transition-transform duration-75"
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect(player);
        if (onDragStart) {
          onDragStart(player, e);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Defender ${player.label} at position ${Math.round(player.x)}, ${Math.round(player.y)}`}
    >
      {/* Outer Glow / Selection Ring */}
      {isSelected && (
        <circle
          r={radius + 7}
          fill="none"
          stroke="#EF4444"
          strokeWidth="2.5"
          strokeDasharray="4 2"
          className="animate-spin"
          style={{ transformOrigin: '0 0', animationDuration: '5s' }}
        />
      )}

      {/* Target Shadow */}
      <circle
        r={radius}
        cy="2"
        fill="rgba(0,0,0,0.6)"
        filter="blur(2px)"
      />

      {/* Base Circle Token */}
      <circle
        r={radius}
        fill={fillGradient}
        stroke={strokeColor}
        strokeWidth={isSelected ? 2.5 : 1.5}
        className="transition-all duration-150 shadow-lg"
      />

      {/* Center Position Label (R, MLB, LCB, RCB, FS) */}
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fill="#FFFFFF"
        fontWeight="900"
        fontSize={player.label.length > 2 ? '9px' : '11px'}
        fontFamily="monospace"
        className="pointer-events-none select-none tracking-tighter"
      >
        {player.label}
      </text>

      {/* 7-Yard Cone / Marker for Rusher */}
      {isRusher && (
        <g transform="translate(0, 19)" className="pointer-events-none">
          <rect
            x="-20"
            y="0"
            width="40"
            height="12"
            rx="3"
            fill="#7F1D1D"
            stroke="#EF4444"
            strokeWidth="1"
          />
          <text
            x="0"
            y="9"
            textAnchor="middle"
            fill="#FEE2E2"
            fontSize="8px"
            fontWeight="900"
            fontFamily="monospace"
          >
            7 YARDS
          </text>
        </g>
      )}

      {/* Role / Coverage Badge above Token */}
      {player.coverageType && (
        <g transform="translate(0, -18)" className="pointer-events-none">
          <rect
            x="-24"
            y="-6"
            width="48"
            height="12"
            rx="3"
            fill="#0F172A"
            stroke={
              player.coverageType === 'blitz'
                ? '#EF4444'
                : player.coverageType === 'man'
                ? '#F59E0B'
                : player.coverageType === 'spy'
                ? '#EC4899'
                : '#38BDF8'
            }
            strokeWidth="1"
          />
          <text
            x="0"
            y="3"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="7.5px"
            fontWeight="900"
            fontFamily="monospace"
          >
            {player.coverageType.toUpperCase()}
          </text>
        </g>
      )}
    </g>
  );
};
