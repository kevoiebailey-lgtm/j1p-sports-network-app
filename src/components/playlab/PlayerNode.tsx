import React from 'react';
import { TacticalPlayer } from '../../types/tactics';

interface PlayerNodeProps {
  player: TacticalPlayer;
  isSelected: boolean;
  onSelect: (player: TacticalPlayer) => void;
  onDragStart?: (player: TacticalPlayer, e: React.PointerEvent<SVGGElement>) => void;
}

export const PlayerNode: React.FC<PlayerNodeProps> = ({
  player,
  isSelected,
  onSelect,
  onDragStart,
}) => {
  const isQB = player.label === 'QB';
  const isOL = player.positionGroup === 'OL' && !player.isEligibleReceiver;

  let fillGradient = isQB ? '#FF6A00' : isOL ? '#475569' : '#00F0D0';
  let strokeColor = isSelected ? '#FFFFFF' : isQB ? '#FFA040' : '#00A896';
  let textColor = '#000000';

  // High-visibility node radius: at least 20px-24px
  const radius = isQB ? 24 : 22;

  return (
    <g
      id={`player-node-${player.id}`}
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
      aria-label={`Player ${player.label} at position ${Math.round(player.x)}, ${Math.round(player.y)}`}
    >
      {/* Outer Glow / Selection Ring */}
      {isSelected && (
        <circle
          r={radius + 8}
          fill="none"
          stroke="#00F0D0"
          strokeWidth="3"
          strokeDasharray="5 3"
          className="animate-spin"
          style={{ transformOrigin: '0 0', animationDuration: '6s' }}
        />
      )}

      {/* Target Halo Shadow for High Sideline Contrast */}
      <circle
        r={radius + 2}
        fill="#000000"
        opacity="0.75"
      />

      {/* Base Circle Token Badge */}
      <circle
        r={radius}
        fill={fillGradient}
        stroke={isSelected ? '#FFFFFF' : strokeColor}
        strokeWidth={isSelected ? 3 : 2}
        className="transition-all duration-150"
      />

      {/* Center Position / Jersey Label - Bold & Centered */}
      <text
        x="0"
        y="0"
        textAnchor="middle"
        dominantBaseline="central"
        fill={textColor}
        fontWeight="900"
        fontSize={isQB ? '13px' : player.label.length > 2 ? '11px' : '12px'}
        fontFamily="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        className="pointer-events-none select-none tracking-tight"
        style={{ letterSpacing: '-0.02em' }}
      >
        {player.label}
      </text>

      {/* Route & Read Progression Badges: Hovering cleanly above player node */}
      {(() => {
        const hoverY = -(radius + 13);
        const hasRoute = player.routeNumber !== undefined;
        const hasRead = Boolean(player.readProgression);

        if (!hasRoute && !hasRead) return null;

        const routeX = hasRead ? 11 : 0;
        const readX = hasRoute ? -11 : 0;

        return (
          <g className="pointer-events-none select-none">
            {/* Read Progression Badge (1st, 2nd, 3rd) */}
            {hasRead && (
              <g transform={`translate(${readX}, ${hoverY})`}>
                <circle
                  r="8.5"
                  fill={
                    player.readProgression === 1
                      ? '#F59E0B'
                      : player.readProgression === 2
                      ? '#00F0D0'
                      : '#10B981'
                  }
                  stroke="#000000"
                  strokeWidth="2"
                  className="filter drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
                />
                <text
                  x="0"
                  y="0"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#000000"
                  fontWeight="900"
                  fontSize="9.5px"
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                >
                  {player.readProgression}
                </text>
              </g>
            )}

            {/* Route Number Badge (0-9) */}
            {hasRoute && (
              <g transform={`translate(${routeX}, ${hoverY})`}>
                <circle
                  r="9"
                  fill="#0B0F19"
                  stroke="#00F0D0"
                  strokeWidth="2"
                  className="filter drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
                />
                <text
                  x="0"
                  y="0"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#00F0D0"
                  fontWeight="900"
                  fontSize="10px"
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                >
                  {player.routeNumber}
                </text>
              </g>
            )}
          </g>
        );
      })()}
    </g>
  );
};

