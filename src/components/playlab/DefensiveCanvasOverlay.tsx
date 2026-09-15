import React from 'react';
import {
  DefensivePlayer,
  DefensiveZoneArea,
  DefensiveBlitzArrow,
  DefensiveManLockLink,
  TacticalPlayer,
} from '../../types/tactics';

interface DefensiveCanvasOverlayProps {
  zones: DefensiveZoneArea[];
  blitzArrows: DefensiveBlitzArrow[];
  manLockLinks: DefensiveManLockLink[];
  defensivePlayers: DefensivePlayer[];
  offensivePlayers: TacticalPlayer[];
  onSelectZone?: (zone: DefensiveZoneArea) => void;
}

export const DefensiveCanvasOverlay: React.FC<DefensiveCanvasOverlayProps> = ({
  zones,
  blitzArrows,
  manLockLinks,
  defensivePlayers,
  offensivePlayers,
  onSelectZone,
}) => {
  return (
    <g id="defensive-canvas-overlay" className="select-none">
      <defs>
        {/* Blitz Red Arrowhead Marker */}
        <marker
          id="blitz-arrowhead"
          markerWidth="10"
          markerHeight="10"
          refX="8"
          refY="5"
          orient="auto"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#EF4444" />
        </marker>

        {/* Alternate Purple Marker for Linebacker Blitz */}
        <marker
          id="lb-arrowhead"
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="4"
          orient="auto"
        >
          <path d="M 0 0 L 8 4 L 0 8 z" fill="#A855F7" />
        </marker>
      </defs>

      {/* 1. Zone Area Shading Layer */}
      {zones.map((zone) => {
        const x = zone.x - zone.width / 2;
        const y = zone.y - zone.height / 2;

        return (
          <g
            key={`zone-${zone.id}`}
            id={`zone-${zone.id}`}
            onClick={() => onSelectZone?.(zone)}
            className="cursor-pointer transition-opacity hover:opacity-90"
          >
            {/* Shaded Zone Area Rectangle with Rounded Corners */}
            <rect
              x={x}
              y={y}
              width={zone.width}
              height={zone.height}
              rx="12"
              ry="12"
              fill={zone.color}
              stroke={
                zone.name === 'Hook'
                  ? '#A855F7'
                  : zone.name === 'Flat'
                  ? '#10B981'
                  : zone.name === 'QB Spy'
                  ? '#EF4444'
                  : '#38BDF8'
              }
              strokeWidth="1.5"
              strokeDasharray="5 3"
              strokeOpacity="0.75"
            />

            {/* Centered Zone Title Tag */}
            <rect
              x={zone.x - 45}
              y={zone.y - 10}
              width="90"
              height="20"
              rx="6"
              fill="#0F172A"
              fillOpacity="0.85"
              stroke="#334155"
              strokeWidth="1"
            />
            <text
              x={zone.x}
              y={zone.y + 4}
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize="9px"
              fontWeight="900"
              fontFamily="monospace"
              className="pointer-events-none tracking-tight"
            >
              {zone.name.toUpperCase()}
              {zone.assignedPlayer ? ` (${zone.assignedPlayer})` : ''}
            </text>
          </g>
        );
      })}

      {/* 2. Man-Lock Links (Dashed Tether from Defender to Offensive Receiver) */}
      {manLockLinks.map((link) => {
        const defender = defensivePlayers.find((d) => d.label === link.defenderLabel);
        const receiver = offensivePlayers.find((o) => o.label === link.receiverLabel);
        if (!defender || !receiver) return null;

        const midX = (defender.x + receiver.x) / 2;
        const midY = (defender.y + receiver.y) / 2;

        return (
          <g key={`man-lock-${link.id}`} className="pointer-events-none">
            {/* Connecting Dashed Tether Line */}
            <line
              x1={defender.x}
              y1={defender.y}
              x2={receiver.x}
              y2={receiver.y}
              stroke="#F59E0B"
              strokeWidth="2"
              strokeDasharray="6 4"
              opacity="0.85"
            />

            {/* Man-Lock Badge at Midpoint */}
            <circle cx={midX} cy={midY} r="10" fill="#0B0F19" stroke="#F59E0B" strokeWidth="1.5" />
            <text
              x={midX}
              y={midY + 3.5}
              textAnchor="middle"
              fill="#F59E0B"
              fontSize="7.5px"
              fontWeight="900"
              fontFamily="monospace"
            >
              LOCK
            </text>
          </g>
        );
      })}

      {/* 3. Blitz Arrows (High-Contrast Red Rush Paths toward Backfield) */}
      {blitzArrows.map((blitz) => {
        const dx = blitz.endX - blitz.startX;
        const dy = blitz.endY - blitz.startY;
        // Slight curved arc towards the QB
        const ctrlX = blitz.startX + dx * 0.4 + (blitz.startX < 400 ? -25 : 25);
        const ctrlY = blitz.startY + dy * 0.5;

        return (
          <g key={`blitz-${blitz.id}`} className="pointer-events-none">
            <path
              d={`M ${blitz.startX} ${blitz.startY} Q ${ctrlX} ${ctrlY} ${blitz.endX} ${blitz.endY}`}
              fill="none"
              stroke={blitz.color || '#EF4444'}
              strokeWidth="3.5"
              strokeDasharray="8 3"
              markerEnd="url(#blitz-arrowhead)"
              strokeLinecap="round"
              className="filter drop-shadow-[0_2px_4px_rgba(239,68,68,0.5)]"
            />
            {/* Midpoint Blitz Flash Indicator */}
            <circle
              cx={ctrlX}
              cy={ctrlY}
              r="8"
              fill="#7F1D1D"
              stroke="#EF4444"
              strokeWidth="1.5"
            />
            <text
              x={ctrlX}
              y={ctrlY + 3.5}
              textAnchor="middle"
              fill="#FEE2E2"
              fontSize="7px"
              fontWeight="900"
              fontFamily="monospace"
            >
              RUSH
            </text>
          </g>
        );
      })}
    </g>
  );
};
