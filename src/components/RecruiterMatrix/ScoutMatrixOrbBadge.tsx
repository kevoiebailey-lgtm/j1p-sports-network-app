import React from 'react';
import { motion } from 'motion/react';

interface ScoutMatrixOrbBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ScoutMatrixOrbBadge: React.FC<ScoutMatrixOrbBadgeProps> = ({
  className = '',
  size = 'md'
}) => {
  const sizeMap = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16 sm:w-20 sm:h-20',
    lg: 'w-24 h-24 sm:w-28 sm:h-28'
  };

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${sizeMap[size]} ${className}`}>
      
      {/* 1. Ambient Holographic Plasma Glow Backing */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#00F2FE]/30 via-[#39FF14]/20 to-[#00F2FE]/40 blur-xl animate-pulse pointer-events-none" />

      {/* 2. Pure SVG Gyroscope Rings & Laser Radar Polygon */}
      <svg 
        className="w-full h-full overflow-visible"
        viewBox="0 0 100 100"
      >
        <defs>
          <linearGradient id="orbGradPrimary" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00F2FE" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#39FF14" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#00F2FE" stopOpacity="0.9" />
          </linearGradient>

          <linearGradient id="coreSphereGrad" x1="20%" y1="20%" x2="80%" y2="80%">
            <stop offset="0%" stopColor="#E0F7FA" stopOpacity="0.9" />
            <stop offset="35%" stopColor="#00E5FF" stopOpacity="0.6" />
            <stop offset="70%" stopColor="#0A192F" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#020813" stopOpacity="0.95" />
          </linearGradient>

          <filter id="orbGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer Laser Coordinate Ticks */}
        <g stroke="#00F2FE" strokeWidth="0.8" opacity="0.6">
          <line x1="50" y1="2" x2="50" y2="8" />
          <line x1="50" y1="92" x2="50" y2="98" />
          <line x1="2" y1="50" x2="8" y2="50" />
          <line x1="92" y1="50" x2="98" y2="50" />
          <line x1="16" y1="16" x2="21" y2="21" />
          <line x1="84" y1="16" x2="79" y2="21" />
          <line x1="16" y1="84" x2="21" y2="79" />
          <line x1="84" y1="84" x2="79" y2="79" />
        </g>

        {/* Rotating Outer Gyro Orbit Ring 1 */}
        <motion.circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke="url(#orbGradPrimary)"
          strokeWidth="1.5"
          strokeDasharray="18 12 6 12"
          filter="url(#orbGlow)"
          animate={{ rotate: 360 }}
          transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
          style={{ originX: '50px', originY: '50px' }}
        />

        {/* Counter-Rotating Gyro Orbit Ring 2 */}
        <motion.ellipse
          cx="50"
          cy="50"
          rx="38"
          ry="24"
          fill="none"
          stroke="#39FF14"
          strokeWidth="1.2"
          strokeDasharray="12 8 4 8"
          opacity="0.8"
          animate={{ rotate: -360 }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          style={{ originX: '50px', originY: '50px' }}
        />

        {/* Third Tilted Radar Orbit Ring */}
        <motion.ellipse
          cx="50"
          cy="50"
          rx="24"
          ry="38"
          fill="none"
          stroke="#00F2FE"
          strokeWidth="1.2"
          strokeDasharray="14 10"
          opacity="0.75"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          style={{ originX: '50px', originY: '50px' }}
        />

        {/* High-Gloss Translucent Core Matrix Sphere */}
        <circle
          cx="50"
          cy="50"
          r="22"
          fill="url(#coreSphereGrad)"
          stroke="#00F2FE"
          strokeWidth="1.5"
          filter="url(#orbGlow)"
        />

        {/* Internal 5-Point Radar Polygon Diamond */}
        <polygon
          points="50,34 62,45 57,61 43,61 38,45"
          fill="rgba(57, 255, 20, 0.35)"
          stroke="#39FF14"
          strokeWidth="1"
        />

        {/* Specular Highlight Arc */}
        <path
          d="M 36 38 A 18 18 0 0 1 58 34"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.85"
        />

        {/* Center Pulsing Quantum Core Node */}
        <circle cx="50" cy="50" r="3.5" fill="#FFFFFF" filter="url(#orbGlow)">
          <animate
            attributeName="r"
            values="2.5;4.5;2.5"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>

    </div>
  );
};
