import React, { forwardRef } from "react";
import { PREBUILT_THEMES, CardTheme } from "../../lib/themeLibrary";

export interface PlayerData {
  name: string;
  jerseyNumber: string;
  position: string;
  team: string;
  photoUrl?: string;
  stats: {
    label1: string; value1: string;
    label2: string; value2: string;
    label3: string; value3: string;
    label4: string; value4: string;
  };
}

interface TemplateEngineProps {
  player: PlayerData;
  themeId?: string;
  className?: string;
}

export const SportsTemplateEngine = forwardRef<SVGSVGElement, TemplateEngineProps>(
  ({ player, themeId = "apex_holographic", className = "" }, ref) => {
    const theme: CardTheme = PREBUILT_THEMES[themeId] || PREBUILT_THEMES["apex_holographic"];

    return (
      <svg
        ref={ref}
        viewBox="0 0 800 1000"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-auto select-none rounded-[28px] overflow-hidden ${className}`}
      >
        <defs>
          {/* Layer 0: Card Outer Boundary Clip */}
          <clipPath id="card-clip">
            <rect x="0" y="0" width="800" height="1000" rx="28" ry="28" />
          </clipPath>

          {/* Layer 2: Vignette Depth Gradients */}
          <linearGradient id="depth-shade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(3, 7, 18, 0.35)" />
            <stop offset="50%" stopColor="transparent" />
            <stop offset="80%" stopColor="rgba(3, 7, 18, 0.85)" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>

          {/* Layer 3: Athlete Shadow */}
          <filter id="athlete-shadow" x="-20%" y="-20%" width="150%" height="150%">
            <feDropShadow dx="0" dy="16" stdDeviation="18" floodColor="#000000" floodOpacity="0.9" />
          </filter>

          {/* Layer 5/6: Glow Filter */}
          <filter id="theme-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g clipPath="url(#card-clip)">
          {/* LAYER 1: Full-Bleed Graphic Backdrop */}
          <image
            href={theme.backdropUrl}
            x="0"
            y="0"
            width="800"
            height="1000"
            preserveAspectRatio="xMidYMid slice"
            crossOrigin="anonymous"
          />

          {/* LAYER 2: Depth Gradient */}
          <rect x="0" y="0" width="800" height="1000" fill="url(#depth-shade)" />

          {/* LAYER 3: Athlete Cutout */}
          {player.photoUrl ? (
            <image
              href={player.photoUrl}
              x="100"
              y="80"
              width="600"
              height="720"
              preserveAspectRatio="xMidYMid meet"
              filter="url(#athlete-shadow)"
              crossOrigin="anonymous"
            />
          ) : (
            <path
              d="M400 230 C350 230 310 270 310 320 C310 380 350 420 400 420 C450 420 490 380 490 320 C490 270 450 230 400 230 Z M280 640 C280 510 340 460 400 460 C460 460 520 510 520 640 Z"
              fill="rgba(255, 255, 255, 0.08)"
            />
          )}

          {/* LAYER 4: Foreground Shards & Light Particles */}
          {theme.overlayUrl && (
            <image
              href={theme.overlayUrl}
              x="0"
              y="0"
              width="800"
              height="1000"
              preserveAspectRatio="xMidYMid slice"
              opacity="0.8"
              crossOrigin="anonymous"
            />
          )}

          {/* Tech Brackets */}
          <g stroke={theme.accentColor} strokeWidth="3" fill="none" opacity="0.85">
            <path d="M 35 70 L 35 35 L 70 35" />
            <path d="M 765 70 L 765 35 L 730 35" />
            <path d="M 35 930 L 35 965 L 70 965" />
            <path d="M 765 930 L 765 965 L 730 965" />
          </g>

          {/* Top Header Badges */}
          <g transform="translate(50, 45)">
            <rect width="180" height="34" rx="8" fill="rgba(15, 23, 42, 0.85)" stroke={theme.accentColor} strokeWidth="1.5" />
            <text x="90" y="22" fill="#FFFFFF" fontSize="13" fontWeight="800" textAnchor="middle" letterSpacing="2">
              {(player.team || "JUST1PLAY").toUpperCase()}
            </text>
          </g>
          <g transform="translate(610, 45)">
            <rect width="140" height="34" rx="8" fill="rgba(15, 23, 42, 0.85)" stroke="#38BDF8" strokeWidth="1.5" />
            <text x="70" y="22" fill={theme.accentColor} fontSize="13" fontWeight="900" textAnchor="middle" letterSpacing="2">
              PROSPECT
            </text>
          </g>

          {/* LAYER 5: Angled Name Banner & Jersey Number */}
          <g transform="translate(60, 680)">
            <polygon
              points={`0,0 520,${theme.bannerAngle * 4} 510,${theme.bannerAngle * 4 + 8} -10,8`}
              fill={theme.accentColor}
              opacity="0.8"
              filter="url(#theme-glow)"
            />
            <text
              x="0"
              y="45"
              fill="#FFFFFF"
              fontSize="52"
              fontWeight="900"
              fontStyle={theme.fontStyle}
              letterSpacing="-0.5"
            >
              {player.name ? player.name.toUpperCase() : "ATHLETE NAME"}
            </text>
            <text x="0" y="80" fill="#94A3B8" fontSize="20" fontWeight="700" letterSpacing="3">
              {player.position ? player.position.toUpperCase() : "POSITION"}
            </text>
            <text
              x="680"
              y="55"
              fill={theme.accentColor}
              fontSize="78"
              fontWeight="900"
              fontStyle={theme.fontStyle}
              textAnchor="end"
              filter="url(#theme-glow)"
            >
              #{player.jerseyNumber || "00"}
            </text>
          </g>

          {/* LAYER 6: Glassmorphic 4-Box Stat HUD */}
          <g transform="translate(60, 800)">
            {[
              { label: player.stats?.label1 || "STAT 1", val: player.stats?.value1 },
              { label: player.stats?.label2 || "STAT 2", val: player.stats?.value2 },
              { label: player.stats?.label3 || "STAT 3", val: player.stats?.value3 },
              { label: player.stats?.label4 || "STAT 4", val: player.stats?.value4 }
            ].map((stat, idx) => (
              <g key={idx} transform={`translate(${idx * 175}, 0)`}>
                <rect
                  width="160"
                  height="82"
                  rx="14"
                  fill="rgba(3, 7, 18, 0.85)"
                  stroke="rgba(255, 255, 255, 0.12)"
                  strokeWidth="1.5"
                />
                <text x="20" y="28" fill="#94A3B8" fontSize="12" fontWeight="700" letterSpacing="1.5">
                  {stat.label.toUpperCase()}
                </text>
                <text x="20" y="66" fill="#FFFFFF" fontSize="28" fontWeight="900">
                  {stat.val || "—"}
                </text>
              </g>
            ))}
          </g>

          {/* Footer Branding */}
          <text x="400" y="975" fill="rgba(148, 163, 184, 0.5)" fontSize="12" fontWeight="700" textAnchor="middle" letterSpacing="3">
            JUST1PLAY • ATHLETIC GRAPHIC STUDIO
          </text>
        </g>
      </svg>
    );
  }
);

SportsTemplateEngine.displayName = "SportsTemplateEngine";
export default SportsTemplateEngine;
