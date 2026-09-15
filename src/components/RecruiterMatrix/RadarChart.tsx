import React from 'react';

export interface RadarStat {
  label: string;
  value: number; // 0 to 100
}

interface RadarChartProps {
  stats: RadarStat[];
  size?: number;
  className?: string;
  showLabels?: boolean;
}

export const RadarChart: React.FC<RadarChartProps> = ({
  stats,
  size = 180,
  className = '',
  showLabels = true
}) => {
  // Ensure we have at least 5 stats or pad default
  const defaultStats: RadarStat[] = [
    { label: 'Speed', value: 85 },
    { label: 'Strength', value: 80 },
    { label: 'Agility', value: 90 },
    { label: 'IQ', value: 92 },
    { label: 'Stamina', value: 88 }
  ];

  const data = stats && stats.length >= 3 ? stats.slice(0, 5) : defaultStats;
  const numAxes = data.length;
  const center = size / 2;
  const radius = (size / 2) * 0.68;

  // Compute angle for each axis (0 degrees at top)
  const getCoordinates = (index: number, valueRatio: number) => {
    const angle = (Math.PI * 2 / numAxes) * index - Math.PI / 2;
    const x = center + radius * valueRatio * Math.cos(angle);
    const y = center + radius * valueRatio * Math.sin(angle);
    return { x, y };
  };

  // Generate grid concentric rings (20%, 40%, 60%, 80%, 100%)
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

  // Polygon points for value data
  const dataPolygonPoints = data
    .map((d, i) => {
      const ratio = Math.min(100, Math.max(10, d.value)) / 100;
      const { x, y } = getCoordinates(i, ratio);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
      >
        <defs>
          {/* Emerald Glow Gradient */}
          <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#E5B868" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#E5B868" stopOpacity="0.02" />
          </radialGradient>
          <linearGradient id="polygonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E5B868" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.25" />
          </linearGradient>
        </defs>

        {/* Concentric Grid Background Polygons */}
        {gridLevels.map((level, idx) => {
          const points = Array.from({ length: numAxes })
            .map((_, i) => {
              const { x, y } = getCoordinates(i, level);
              return `${x},${y}`;
            })
            .join(' ');
          return (
            <polygon
              key={`grid-${idx}`}
              points={points}
              fill="none"
              stroke="#334155"
              strokeWidth={idx === gridLevels.length - 1 ? "1.5" : "0.75"}
              strokeDasharray={idx < gridLevels.length - 1 ? "2,2" : undefined}
              opacity={0.6}
            />
          );
        })}

        {/* Radial Axis Lines */}
        {Array.from({ length: numAxes }).map((_, i) => {
          const outerPoint = getCoordinates(i, 1.0);
          return (
            <line
              key={`axis-${i}`}
              x1={center}
              y1={center}
              x2={outerPoint.x}
              y2={outerPoint.y}
              stroke="#334155"
              strokeWidth="1"
              opacity="0.7"
            />
          );
        })}

        {/* Data Area Polygon */}
        <polygon
          points={dataPolygonPoints}
          fill="url(#polygonGrad)"
          stroke="#E5B868"
          strokeWidth="2.5"
          className="drop-shadow-[0_0_10px_rgba(214,28,36,0.6)]"
        />

        {/* Data Points */}
        {data.map((d, i) => {
          const ratio = Math.min(100, Math.max(10, d.value)) / 100;
          const { x, y } = getCoordinates(i, ratio);
          return (
            <g key={`dot-${i}`}>
              <circle
                cx={x}
                cy={y}
                r="4.5"
                fill="#E5B868"
                className="drop-shadow-[0_0_8px_#E5B868]"
              />
              <circle
                cx={x}
                cy={y}
                r="1.8"
                fill="#212A31"
              />
            </g>
          );
        })}

        {/* Labels & Values around perimeter */}
        {showLabels &&
          data.map((d, i) => {
            const labelCoord = getCoordinates(i, 1.25);
            return (
              <text
                key={`label-${i}`}
                x={labelCoord.x}
                y={labelCoord.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[9px] font-black uppercase tracking-wider fill-slate-300 font-mono"
              >
                {d.label} <tspan fill="#E5B868" fontWeight="bold">({d.value})</tspan>
              </text>
            );
          })}
      </svg>
    </div>
  );
};
