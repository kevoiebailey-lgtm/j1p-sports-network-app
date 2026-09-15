import React from 'react';
import {
  TacticalPlayer,
  DefensivePlayer,
  OpponentCoverageKey,
} from '../../types/tactics';
import { Zap, Target, Sparkles, Shield, ArrowRight } from 'lucide-react';

export interface CoverageSpec {
  key: OpponentCoverageKey;
  label: string;
  badge: string;
  badgeColor: string;
  description: string;
  weakness: string;
  situationalRead: string;
  recommendedRouteTypes: string[];
}

export const OPPONENT_COVERAGE_SPECS: Record<OpponentCoverageKey, CoverageSpec> = {
  off: {
    key: 'off',
    label: 'Off',
    badge: 'OFF',
    badgeColor: '#64748B',
    description: 'Defense overlay hidden. Clean offensive chalkboard mode.',
    weakness: 'None',
    situationalRead: 'Select a defensive coverage to simulate opponent shells & identify open targets.',
    recommendedRouteTypes: [],
  },
  cover_1_man: {
    key: 'cover_1_man',
    label: 'Cover 1 Man',
    badge: 'C1 MAN',
    badgeColor: '#F43F5E',
    description: 'Corners press X & Z, MLB locks H, FS sits 10y deep middle, R at 7-yd line.',
    weakness: 'Underneath crossing rubs, mesh concepts, and speed drags across the field.',
    situationalRead: 'If Cover 1 Man -> Throw Slot Drag off the natural rub.',
    recommendedRouteTypes: ['Slant', 'Dig / In', 'Drag', 'Cross', 'Mesh', 'Whip', 'Flat / Quick Out'],
  },
  cover_2_zone: {
    key: 'cover_2_zone',
    label: 'Cover 2 Zone',
    badge: 'C2 ZONE',
    badgeColor: '#38BDF8',
    description: '2 deep safeties split field halves at 10-12 yds, 2 cornerbacks patrol 3-5 yd flats, R at 7-yd line.',
    weakness: 'Middle hole shot (12-18 yds between safeties) and sideline honey-holes behind CBs.',
    situationalRead: 'If Cover 2 Zone -> Target Center seam between deep safeties.',
    recommendedRouteTypes: ['Post', 'Corner / Flag', 'Fly / Go / Streak', 'Dig / In', 'Seam', 'Smash'],
  },
  cover_3_zone: {
    key: 'cover_3_zone',
    label: 'Cover 3 Zone',
    badge: 'C3 ZONE',
    badgeColor: '#F59E0B',
    description: '3 deep defenders split thirds, MLB controls short middle, R at 7-yd line.',
    weakness: 'Quick boundary hitches before CB bails, 4 verticals dividing seams, and flat floods.',
    situationalRead: 'If Cover 3 Zone -> Flood boundary intermediate seams & hit quick hitches.',
    recommendedRouteTypes: ['Hitch / Curl', 'Flat / Quick Out', 'Deep Out / Speed Out', 'Corner / Flag', '4 Verts'],
  },
  zero_blitz: {
    key: 'zero_blitz',
    label: 'Zero Blitz',
    badge: 'ZERO BLITZ',
    badgeColor: '#EF4444',
    description: '4 defenders locked in tight press man with a dual-gap edge rush. No safety help.',
    weakness: 'Quick hot reads (<1.5s release) behind vacated blitzers; bubble screens & center pop.',
    situationalRead: 'If Blitz -> Hit Quick Bubble hot read in <1.5s.',
    recommendedRouteTypes: ['Flat / Quick Out', 'Hitch / Curl', 'Slant', 'Bubble Screen', 'Center Pop', 'Jet'],
  },
};

/**
 * Generate 5 Defensive Tokens positioned dynamically relative to scrimmage and offensive receivers
 */
export function getOpponentDefensiveTokens(
  coverage: OpponentCoverageKey,
  offensivePlayers: TacticalPlayer[]
): DefensivePlayer[] {
  if (coverage === 'off') return [];

  const xPlayer = offensivePlayers.find((p) => p.label === 'X') || { x: 160, y: 350 };
  const zPlayer = offensivePlayers.find((p) => p.label === 'Z') || { x: 640, y: 350 };
  const hPlayer = offensivePlayers.find((p) => p.label === 'H') || { x: 280, y: 350 };
  const cPlayer = offensivePlayers.find((p) => p.label === 'C') || { x: 400, y: 350 };

  switch (coverage) {
    case 'cover_1_man':
      return [
        {
          id: 'def_sim_r',
          label: 'R',
          name: 'Rusher (7yd)',
          x: 370,
          y: 280, // 7 yards off LOS at y=350
          role: 'rusher',
          coverageType: 'blitz',
          isBlitzing: true,
        },
        {
          id: 'def_sim_lcb',
          label: 'LCB',
          name: 'Press Corner (X)',
          x: xPlayer.x,
          y: Math.max(300, xPlayer.y - 25), // Press on X
          role: 'corner',
          coverageType: 'man',
          manTarget: 'X',
        },
        {
          id: 'def_sim_rcb',
          label: 'RCB',
          name: 'Press Corner (Z)',
          x: zPlayer.x,
          y: Math.max(300, zPlayer.y - 25), // Press on Z
          role: 'corner',
          coverageType: 'man',
          manTarget: 'Z',
        },
        {
          id: 'def_sim_mlb',
          label: 'MLB',
          name: 'Man LB (H / C)',
          x: hPlayer.x || 300,
          y: Math.max(305, hPlayer.y - 30), // Man lock on H
          role: 'linebacker',
          coverageType: 'man',
          manTarget: 'H',
        },
        {
          id: 'def_sim_fs',
          label: 'FS',
          name: 'Single-High Free Safety (10-12y Deep)',
          x: 400,
          y: 210, // 10-12 yards deep in middle
          role: 'safety',
          coverageType: 'zone',
          zoneType: 'Deep Third',
        },
      ];

    case 'cover_2_zone':
      return [
        {
          id: 'def_sim_r',
          label: 'R',
          name: 'Rusher (7yd)',
          x: 370,
          y: 280,
          role: 'rusher',
          coverageType: 'blitz',
          isBlitzing: true,
        },
        {
          id: 'def_sim_lcb',
          label: 'LCB',
          name: 'Flat Corner (3-5y)',
          x: 155,
          y: 315, // 3-5 yards off LOS
          role: 'corner',
          coverageType: 'zone',
          zoneType: 'Flat',
        },
        {
          id: 'def_sim_rcb',
          label: 'RCB',
          name: 'Deep Half Safety Right (10-12y)',
          x: 540,
          y: 215, // 10-12 yards deep
          role: 'safety',
          coverageType: 'zone',
          zoneType: 'Deep Half',
        },
        {
          id: 'def_sim_mlb',
          label: 'MLB',
          name: 'Hook / Curl Linebacker',
          x: 400,
          y: 295,
          role: 'linebacker',
          coverageType: 'zone',
          zoneType: 'Hook',
        },
        {
          id: 'def_sim_fs',
          label: 'FS',
          name: 'Deep Half Safety Left (10-12y)',
          x: 260,
          y: 215, // 10-12 yards deep
          role: 'safety',
          coverageType: 'zone',
          zoneType: 'Deep Half',
        },
      ];

    case 'cover_3_zone':
      return [
        {
          id: 'def_sim_r',
          label: 'R',
          name: 'Rusher (7yd)',
          x: 370,
          y: 280,
          role: 'rusher',
          coverageType: 'blitz',
          isBlitzing: true,
        },
        {
          id: 'def_sim_lcb',
          label: 'LCB',
          name: 'Deep 1/3 Left Corner',
          x: 165,
          y: 215, // Deep Third
          role: 'corner',
          coverageType: 'zone',
          zoneType: 'Deep Third',
        },
        {
          id: 'def_sim_rcb',
          label: 'RCB',
          name: 'Deep 1/3 Right Corner',
          x: 635,
          y: 215, // Deep Third
          role: 'corner',
          coverageType: 'zone',
          zoneType: 'Deep Third',
        },
        {
          id: 'def_sim_mlb',
          label: 'MLB',
          name: 'Short Middle Linebacker',
          x: 400,
          y: 310, // Short Middle Hook
          role: 'linebacker',
          coverageType: 'zone',
          zoneType: 'Hook',
        },
        {
          id: 'def_sim_fs',
          label: 'FS',
          name: 'Deep 1/3 Free Safety',
          x: 400,
          y: 195, // Deep Middle Third
          role: 'safety',
          coverageType: 'zone',
          zoneType: 'Deep Third',
        },
      ];

    case 'zero_blitz':
      return [
        {
          id: 'def_sim_r',
          label: 'R',
          name: 'Dual-Gap Rusher 1',
          x: 460,
          y: 280, // Right gap rusher
          role: 'rusher',
          coverageType: 'blitz',
          isBlitzing: true,
        },
        {
          id: 'def_sim_mlb',
          label: 'MLB',
          name: 'Dual-Gap Rusher 2 (A-Gap)',
          x: 330,
          y: 280, // Left A-gap rusher
          role: 'rusher',
          coverageType: 'blitz',
          isBlitzing: true,
        },
        {
          id: 'def_sim_lcb',
          label: 'LCB',
          name: 'Tight Press (X)',
          x: xPlayer.x,
          y: Math.max(315, xPlayer.y - 18),
          role: 'corner',
          coverageType: 'man',
          manTarget: 'X',
        },
        {
          id: 'def_sim_rcb',
          label: 'RCB',
          name: 'Tight Press (Z)',
          x: zPlayer.x,
          y: Math.max(315, zPlayer.y - 18),
          role: 'corner',
          coverageType: 'man',
          manTarget: 'Z',
        },
        {
          id: 'def_sim_fs',
          label: 'FS',
          name: 'Tight Press (H / Slot)',
          x: hPlayer.x || cPlayer.x || 300,
          y: Math.max(315, (hPlayer.y || 350) - 20),
          role: 'safety',
          coverageType: 'man',
          manTarget: 'H',
        },
      ];

    default:
      return [];
  }
}

/**
 * Animated position for defensive tokens when play runs (progress 0 -> 1)
 */
export function getDefensiveSimulationCoord(
  defender: DefensivePlayer,
  coverage: OpponentCoverageKey,
  progress: number,
  offensivePlayers: TacticalPlayer[],
  getOffensiveCoord: (p: TacticalPlayer) => { x: number; y: number }
): { x: number; y: number } {
  if (progress <= 0) return { x: defender.x, y: defender.y };

  const qb = offensivePlayers.find((p) => p.label === 'QB') || { x: 400, y: 410 };
  const targetQB = { x: qb.x, y: qb.y };

  // 1. Dual-Gap Rushers (R and MLB on Zero Blitz)
  if (defender.coverageType === 'blitz' || (coverage === 'zero_blitz' && (defender.label === 'R' || defender.label === 'MLB'))) {
    // Sprint downhill through the line toward QB
    const startX = defender.x;
    const startY = defender.y;
    // Closing distance: reaches QB by progress = 0.95
    const rushProgress = Math.min(progress * 1.15, 1);
    return {
      x: startX + (targetQB.x - startX) * rushProgress * 0.85,
      y: startY + (targetQB.y - startY) * rushProgress * 0.85,
    };
  }

  // 2. Man Coverage: Track assigned offensive player's moving stem
  if (defender.coverageType === 'man' && defender.manTarget) {
    const assignedOff = offensivePlayers.find((p) => p.label === defender.manTarget);
    if (assignedOff) {
      const currentReceiverPos = getOffensiveCoord(assignedOff);
      // Stay tightly locked on receiver: trailing slightly (10-15px behind or slightly above)
      const trailOffsetY = progress < 0.3 ? -12 : -5;
      const trailOffsetX = defender.label === 'LCB' ? 6 : defender.label === 'RCB' ? -6 : 0;
      return {
        x: currentReceiverPos.x + trailOffsetX,
        y: currentReceiverPos.y + trailOffsetY,
      };
    }
  }

  // 3. Zone Coverage drops
  switch (coverage) {
    case 'cover_2_zone':
      if (defender.label === 'FS') {
        // Drop deep into left half
        return {
          x: defender.x + (230 - defender.x) * progress,
          y: defender.y + (160 - defender.y) * progress,
        };
      }
      if (defender.label === 'RCB') {
        // Drop deep into right half
        return {
          x: defender.x + (570 - defender.x) * progress,
          y: defender.y + (160 - defender.y) * progress,
        };
      }
      if (defender.label === 'LCB') {
        // Patrol left flat
        return {
          x: defender.x + (140 - defender.x) * progress,
          y: defender.y + (300 - defender.y) * progress,
        };
      }
      if (defender.label === 'MLB') {
        // Drop into hook/curl hole
        return {
          x: defender.x,
          y: defender.y + (285 - defender.y) * progress,
        };
      }
      break;

    case 'cover_3_zone':
      if (defender.label === 'LCB') {
        // Bail to deep third left
        return {
          x: defender.x + (150 - defender.x) * progress,
          y: defender.y + (165 - defender.y) * progress,
        };
      }
      if (defender.label === 'RCB') {
        // Bail to deep third right
        return {
          x: defender.x + (650 - defender.x) * progress,
          y: defender.y + (165 - defender.y) * progress,
        };
      }
      if (defender.label === 'FS') {
        // Backpedal to deep middle third
        return {
          x: defender.x,
          y: defender.y + (150 - defender.y) * progress,
        };
      }
      if (defender.label === 'MLB') {
        // Slide with short crossing routes in middle
        return {
          x: defender.x + (progress > 0.5 ? 20 : -10),
          y: defender.y + (295 - defender.y) * progress,
        };
      }
      break;

    case 'cover_1_man':
      if (defender.label === 'FS') {
        // Roam deep middle, reading QB eyes
        return {
          x: defender.x + Math.sin(progress * Math.PI) * 25,
          y: defender.y + (170 - defender.y) * progress,
        };
      }
      break;
  }

  return { x: defender.x, y: defender.y };
}

/**
 * Tactical "Who Is Open" detection:
 * Identifies which offensive route exploits the selected coverage.
 */
export interface OpenTargetEvaluation {
  openPlayerId: string | null;
  openPlayerLabel: string | null;
  beaterRouteType: string | null;
  reason: string;
  targetPoint?: { x: number; y: number };
  softSpotDescription: string;
}

export function evaluateOpenTarget(
  offensivePlayers: TacticalPlayer[],
  coverage: OpponentCoverageKey
): OpenTargetEvaluation {
  if (coverage === 'off') {
    return {
      openPlayerId: null,
      openPlayerLabel: null,
      beaterRouteType: null,
      reason: 'Opponent simulation is off.',
      softSpotDescription: 'Chalkboard mode active.',
    };
  }

  const eligibleReceivers = offensivePlayers.filter(
    (p) => p.isEligibleReceiver && p.label !== 'QB' && (p.routeNumber !== undefined || (p.routePoints && p.routePoints.length >= 2))
  );

  if (eligibleReceivers.length === 0) {
    return {
      openPlayerId: null,
      openPlayerLabel: null,
      beaterRouteType: null,
      reason: 'No offensive routes drawn. Assign routes to see who gets open against this look.',
      softSpotDescription: OPPONENT_COVERAGE_SPECS[coverage].weakness,
    };
  }

  // Scoring function based on coverage rules
  let bestPlayer: TacticalPlayer | null = null;
  let bestScore = -1;
  let winningReason = '';

  const coverageSpec = OPPONENT_COVERAGE_SPECS[coverage];

  for (const player of eligibleReceivers) {
    let score = 0;
    let reason = '';
    const routeNum = player.routeNumber;
    const routeName = (player.routeName || '').toLowerCase();
    const explicitBeaters = player.beatsCoverage || [];

    // 1. Check explicit beatsCoverage tag
    const matchesExplicit = explicitBeaters.some((tag) => {
      const lower = tag.toLowerCase();
      if (coverage === 'cover_1_man' && (lower.includes('cover 1') || lower.includes('man'))) return true;
      if (coverage === 'cover_2_zone' && (lower.includes('cover 2') || lower.includes('zone'))) return true;
      if (coverage === 'cover_3_zone' && (lower.includes('cover 3') || lower.includes('zone'))) return true;
      if (coverage === 'zero_blitz' && (lower.includes('blitz') || lower.includes('zero'))) return true;
      return false;
    });

    if (matchesExplicit) {
      score += 50;
      reason = `Tactical Tag: Explicitly designated ${coverageSpec.label} beater.`;
    }

    // 2. Tactical Route Rules
    if (coverage === 'cover_1_man') {
      // Slant (2), Dig/In (5), Drag, Crossing, Mesh, Whip
      if (routeNum === 2 || routeName.includes('slant')) {
        score += 40;
        reason = 'Slant breaks inside press-man leverage creating clean horizontal separation.';
      } else if (routeNum === 5 || routeName.includes('dig') || routeName.includes('in')) {
        score += 35;
        reason = 'Square in-cut crosses underneath the single-high safety.';
      } else if (routeNum === 1 || routeName.includes('flat') || routeName.includes('whip')) {
        score += 30;
        reason = 'Quick out/whip out-leverages trailing press cornerback.';
      } else if (player.label === 'H' || player.label === 'C') {
        score += 25;
        reason = 'Interior matchup exploits natural pick rub off outside stem.';
      }
    } else if (coverage === 'cover_2_zone') {
      // Post (7), Seam / Fly (8), Corner (6), Deep In (5)
      if (routeNum === 7 || routeName.includes('post')) {
        score += 45;
        reason = 'Post route splits 2-high safeties directly into the deep middle honey hole.';
      } else if (routeNum === 6 || routeName.includes('corner') || routeName.includes('flag')) {
        score += 40;
        reason = 'Corner route attacks the honey hole on sideline behind flat-clamping CB.';
      } else if (routeNum === 8 || routeName.includes('fly') || routeName.includes('go') || routeName.includes('seam')) {
        score += 35;
        reason = 'Vertical seam stresses the safety divide in 2-deep coverage.';
      } else if (routeNum === 5 || routeName.includes('dig')) {
        score += 30;
        reason = 'Dig route finds soft intermediate void behind dropping middle linebacker.';
      }
    } else if (coverage === 'cover_3_zone') {
      // Hitch (0), Quick Out (1), Deep Out (4), Corner (6), 4 Verts
      if (routeNum === 0 || routeName.includes('hitch') || routeName.includes('curl')) {
        score += 42;
        reason = 'Snaps off in the cushion before cornerback bails to deep third.';
      } else if (routeNum === 1 || routeName.includes('flat') || routeName.includes('out')) {
        score += 38;
        reason = 'Quick flat out-flanks the underneath hook defender.';
      } else if (routeNum === 6 || routeName.includes('corner')) {
        score += 34;
        reason = 'Floods outside void between deep 1/3 CB and boundary flat.';
      } else if (routeNum === 4 || routeName.includes('speed out')) {
        score += 32;
        reason = 'Intermediate out hits boundary window before safety range.';
      }
    } else if (coverage === 'zero_blitz') {
      // Bubble, Quick Flat (1), 0-step Hitch (0), Quick Slant (2), Center Pop
      if (routeNum === 1 || routeName.includes('flat') || routeName.includes('bubble')) {
        score += 45;
        reason = 'Immediate hot flat throw (<1.5s) punishing dual-gap A-rush before pressure arrives.';
      } else if (player.label === 'C' || routeName.includes('pop') || routeName.includes('quick')) {
        score += 40;
        reason = 'Center quick pop immediately targets vacated green grass over the line.';
      } else if (routeNum === 0 || routeName.includes('hitch')) {
        score += 35;
        reason = '0-step hitch gives QB an instant release valve vs house blitz.';
      } else if (routeNum === 2 || routeName.includes('slant')) {
        score += 32;
        reason = 'Quick 3-step slant beats zero-safety coverage for walk-in score.';
      }
    }

    // Primary read priority
    if (player.readProgression === 1) {
      score += 5;
    }

    if (score > bestScore) {
      bestScore = score;
      bestPlayer = player;
      winningReason = reason || `Capitalizes on structural gaps in ${coverageSpec.label}.`;
    }
  }

  // Fallback to first player if no route scored high
  if (!bestPlayer) {
    bestPlayer = eligibleReceivers[0];
    winningReason = `Target ${bestPlayer.label} against ${coverageSpec.label} structure.`;
  }

  const targetPt =
    bestPlayer.routePoints && bestPlayer.routePoints.length > 1
      ? bestPlayer.routePoints[Math.min(2, bestPlayer.routePoints.length - 1)]
      : { x: bestPlayer.x, y: bestPlayer.y - 40 };

  return {
    openPlayerId: bestPlayer.id,
    openPlayerLabel: bestPlayer.label,
    beaterRouteType: bestPlayer.routeName || `Route #${bestPlayer.routeNumber ?? 'Stem'}`,
    reason: winningReason,
    targetPoint: targetPt,
    softSpotDescription: coverageSpec.weakness,
  };
}

/**
 * Interactive SVG Overlay for Opponent Coverage (Zones, Honey-Holes, Blitz Arrows, and Open Target Glow)
 */
interface OpponentCoverageOverlayProps {
  coverage: OpponentCoverageKey;
  defensiveTokens: DefensivePlayer[];
  openEvaluation: OpenTargetEvaluation | null;
  offensivePlayers: TacticalPlayer[];
}

export const OpponentCoverageOverlay: React.FC<OpponentCoverageOverlayProps> = ({
  coverage,
  defensiveTokens,
  openEvaluation,
}) => {
  if (coverage === 'off') return null;

  return (
    <g id="opponent-coverage-simulator-layer" className="select-none pointer-events-none">
      <defs>
        {/* Blitz Red Marker */}
        <marker
          id="sim-blitz-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto"
        >
          <path d="M 0 1 L 9 5 L 0 9 z" fill="#EF4444" />
        </marker>

        {/* Honey Hole Radial Glow Filter */}
        <filter id="soft-spot-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* 1. COVER 1 MAN: Press-Man Cones & Deep Safety Roam */}
      {coverage === 'cover_1_man' && (
        <g id="c1-man-overlays">
          {/* Deep Free Safety Single-High Zone */}
          <rect
            x="200"
            y="120"
            width="400"
            height="120"
            rx="16"
            fill="rgba(244, 63, 94, 0.08)"
            stroke="#F43F5E"
            strokeWidth="1.2"
            strokeDasharray="6 3"
            strokeOpacity="0.5"
          />
          <text
            x="400"
            y="140"
            fill="#F43F5E"
            fontSize="8.5"
            fontWeight="900"
            fontFamily="monospace"
            textAnchor="middle"
            letterSpacing="1"
          >
            SINGLE-HIGH FS CENTER-FIELD ERASER (10-12Y)
          </text>

          {/* Highlighted Underneath Soft Spot: Crossing & Drag Void */}
          <rect
            x="220"
            y="280"
            width="360"
            height="50"
            rx="10"
            fill="rgba(245, 158, 11, 0.12)"
            stroke="#F59E0B"
            strokeWidth="1.5"
            strokeDasharray="4 2"
            filter="url(#soft-spot-glow)"
          />
          <text
            x="400"
            y="308"
            fill="#F59E0B"
            fontSize="8.5"
            fontWeight="900"
            fontFamily="monospace"
            textAnchor="middle"
            letterSpacing="1"
          >
            ★ SOFT SPOT: UNDERNEATH CROSSING &amp; DRAG RUB VOID
          </text>
        </g>
      )}

      {/* 2. COVER 2 ZONE: 2-Deep Halves, Underneath Flats, and Middle Honey Hole */}
      {coverage === 'cover_2_zone' && (
        <g id="c2-zone-overlays">
          {/* Left Deep Half */}
          <rect
            x="40"
            y="110"
            width="340"
            height="140"
            rx="14"
            fill="rgba(56, 189, 248, 0.10)"
            stroke="#38BDF8"
            strokeWidth="1.2"
            strokeDasharray="6 3"
            strokeOpacity="0.5"
          />
          <text x="210" y="132" fill="#38BDF8" fontSize="8.5" fontWeight="900" fontFamily="monospace" textAnchor="middle">
            FS DEEP HALF (LEFT)
          </text>

          {/* Right Deep Half */}
          <rect
            x="420"
            y="110"
            width="340"
            height="140"
            rx="14"
            fill="rgba(56, 189, 248, 0.10)"
            stroke="#38BDF8"
            strokeWidth="1.2"
            strokeDasharray="6 3"
            strokeOpacity="0.5"
          />
          <text x="590" y="132" fill="#38BDF8" fontSize="8.5" fontWeight="900" fontFamily="monospace" textAnchor="middle">
            RCB DEEP HALF (RIGHT)
          </text>

          {/* Underneath Flats */}
          <rect
            x="40"
            y="280"
            width="180"
            height="65"
            rx="10"
            fill="rgba(16, 185, 129, 0.10)"
            stroke="#10B981"
            strokeWidth="1"
            strokeDasharray="4 2"
          />
          <rect
            x="580"
            y="280"
            width="180"
            height="65"
            rx="10"
            fill="rgba(16, 185, 129, 0.10)"
            stroke="#10B981"
            strokeWidth="1"
            strokeDasharray="4 2"
          />

          {/* Middle Honey Hole (Soft Spot Between Deep Safeties) */}
          <rect
            x="330"
            y="170"
            width="140"
            height="70"
            rx="12"
            fill="rgba(245, 158, 11, 0.18)"
            stroke="#F59E0B"
            strokeWidth="2"
            strokeDasharray="4 2"
            filter="url(#soft-spot-glow)"
          />
          <text x="400" y="202" fill="#F59E0B" fontSize="8.5" fontWeight="900" fontFamily="monospace" textAnchor="middle">
            ★ HONEY HOLE
          </text>
          <text x="400" y="218" fill="#FCD34D" fontSize="7.5" fontWeight="700" fontFamily="monospace" textAnchor="middle">
            12-18Y SEAM VOID
          </text>
        </g>
      )}

      {/* 3. COVER 3 ZONE: 3-Deep Thirds, Middle Hook, and Seam Dividing Soft Spots */}
      {coverage === 'cover_3_zone' && (
        <g id="c3-zone-overlays">
          {/* Deep Left 1/3 */}
          <rect
            x="40"
            y="110"
            width="220"
            height="130"
            rx="12"
            fill="rgba(245, 158, 11, 0.08)"
            stroke="#F59E0B"
            strokeWidth="1.2"
            strokeDasharray="6 3"
            strokeOpacity="0.4"
          />
          <text x="150" y="130" fill="#F59E0B" fontSize="8" fontWeight="900" fontFamily="monospace" textAnchor="middle">
            LCB DEEP 1/3
          </text>

          {/* Deep Middle 1/3 */}
          <rect
            x="290"
            y="110"
            width="220"
            height="130"
            rx="12"
            fill="rgba(245, 158, 11, 0.08)"
            stroke="#F59E0B"
            strokeWidth="1.2"
            strokeDasharray="6 3"
            strokeOpacity="0.4"
          />
          <text x="400" y="130" fill="#F59E0B" fontSize="8" fontWeight="900" fontFamily="monospace" textAnchor="middle">
            FS DEEP 1/3 (MID)
          </text>

          {/* Deep Right 1/3 */}
          <rect
            x="540"
            y="110"
            width="220"
            height="130"
            rx="12"
            fill="rgba(245, 158, 11, 0.08)"
            stroke="#F59E0B"
            strokeWidth="1.2"
            strokeDasharray="6 3"
            strokeOpacity="0.4"
          />
          <text x="650" y="130" fill="#F59E0B" fontSize="8" fontWeight="900" fontFamily="monospace" textAnchor="middle">
            RCB DEEP 1/3
          </text>

          {/* Seam Dividing Soft Spots */}
          <rect
            x="240"
            y="180"
            width="60"
            height="80"
            rx="8"
            fill="rgba(0, 240, 208, 0.15)"
            stroke="#00F0D0"
            strokeWidth="1.5"
            strokeDasharray="4 2"
          />
          <rect
            x="500"
            y="180"
            width="60"
            height="80"
            rx="8"
            fill="rgba(0, 240, 208, 0.15)"
            stroke="#00F0D0"
            strokeWidth="1.5"
            strokeDasharray="4 2"
          />
          <text x="270" y="222" fill="#00F0D0" fontSize="7.5" fontWeight="900" fontFamily="monospace" textAnchor="middle">
            SEAM
          </text>
          <text x="530" y="222" fill="#00F0D0" fontSize="7.5" fontWeight="900" fontFamily="monospace" textAnchor="middle">
            SEAM
          </text>

          {/* Quick Boundary Hitch Cushions */}
          <rect
            x="40"
            y="290"
            width="120"
            height="45"
            rx="8"
            fill="rgba(245, 158, 11, 0.15)"
            stroke="#F59E0B"
            strokeWidth="1.2"
            strokeDasharray="3 2"
          />
          <text x="100" y="316" fill="#F59E0B" fontSize="7.5" fontWeight="900" fontFamily="monospace" textAnchor="middle">
            ★ HITCH CUSHION
          </text>
        </g>
      )}

      {/* 4. ZERO BLITZ: Dual A/B Gap Red Penetration Vectors & Quick Hot Void */}
      {coverage === 'zero_blitz' && (
        <g id="zero-blitz-overlays">
          {/* Dual Blitz Arrow 1 (Rusher R) */}
          <line
            x1="460"
            y1="280"
            x2="415"
            y2="375"
            stroke="#EF4444"
            strokeWidth="3.5"
            strokeDasharray="5 3"
            markerEnd="url(#sim-blitz-arrow)"
          />
          {/* Dual Blitz Arrow 2 (MLB A-Gap) */}
          <line
            x1="330"
            y1="280"
            x2="385"
            y2="375"
            stroke="#EF4444"
            strokeWidth="3.5"
            strokeDasharray="5 3"
            markerEnd="url(#sim-blitz-arrow)"
          />

          {/* Huge Vacated Green Grass Over Middle */}
          <rect
            x="280"
            y="140"
            width="240"
            height="110"
            rx="14"
            fill="rgba(245, 158, 11, 0.15)"
            stroke="#F59E0B"
            strokeWidth="2"
            strokeDasharray="5 3"
            filter="url(#soft-spot-glow)"
          />
          <text x="400" y="185" fill="#F59E0B" fontSize="10" fontWeight="900" fontFamily="monospace" textAnchor="middle">
            ★ ZERO SAFETY HELP (HOT VOID)
          </text>
          <text x="400" y="202" fill="#FDE68A" fontSize="8" fontWeight="700" fontFamily="monospace" textAnchor="middle">
            RELEASE IN &lt; 1.5 SECONDS
          </text>
        </g>
      )}

      {/* 5. Dynamic Open Target Pin with Glowing Gold Highlight */}
      {openEvaluation?.targetPoint && (
        <g id="open-target-pin" transform={`translate(${openEvaluation.targetPoint.x}, ${openEvaluation.targetPoint.y})`}>
          {/* Outer Pulsing Gold Ping Ring */}
          <circle r="22" fill="none" stroke="#F59E0B" strokeWidth="2" opacity="0.6" className="animate-ping" />
          <circle r="18" fill="rgba(245, 158, 11, 0.25)" stroke="#F59E0B" strokeWidth="2.5" />

          {/* Center Pin Disc */}
          <circle r="8" fill="#F59E0B" />

          {/* Open Target Badge */}
          <g transform="translate(0, -22)">
            <rect
              x="-55"
              y="-12"
              width="110"
              height="20"
              rx="6"
              fill="#0B0F19"
              stroke="#F59E0B"
              strokeWidth="1.5"
              filter="url(#soft-spot-glow)"
            />
            <text
              x="0"
              y="2"
              fill="#FCD34D"
              fontSize="8.5"
              fontWeight="900"
              fontFamily="monospace"
              textAnchor="middle"
              letterSpacing="0.8"
            >
              ★ OPEN TARGET
            </text>
          </g>
        </g>
      )}

      {/* 6. High-Contrast Red/Slate Defensive Token Rings (#f43f5e) */}
      {defensiveTokens.map((d) => {
        const isRusher = d.label === 'R';
        return (
          <g key={`sim-token-${d.id}`} transform={`translate(${d.x}, ${d.y})`}>
            {/* Soft Shadow */}
            <circle r="16" cy="2" fill="rgba(0,0,0,0.6)" filter="blur(2px)" />

            {/* Token Outer Ring in #F43F5E */}
            <circle
              r="15"
              fill="#0F172A"
              stroke="#F43F5E"
              strokeWidth="2.5"
              className="transition-transform duration-100"
            />

            {/* Inner Accent Ring for Rusher or Blitz */}
            {isRusher && (
              <circle
                r="18"
                fill="none"
                stroke="#EF4444"
                strokeWidth="1.5"
                strokeDasharray="4 2"
                className="animate-spin"
                style={{ animationDuration: '6s', transformOrigin: '0 0' }}
              />
            )}

            {/* Position Label Token (R, MLB, LCB, RCB, FS) */}
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fill="#FFFFFF"
              fontSize={d.label.length > 2 ? '9' : '10.5'}
              fontWeight="900"
              fontFamily="monospace"
            >
              {d.label}
            </text>

            {/* Small Role Pill */}
            <rect
              x="-22"
              y="16"
              width="44"
              height="11"
              rx="3"
              fill="#020617"
              stroke="#F43F5E"
              strokeWidth="0.8"
            />
            <text
              x="0"
              y="23"
              textAnchor="middle"
              fill="#FDA4AF"
              fontSize="6.5"
              fontWeight="900"
              fontFamily="monospace"
            >
              {d.coverageType === 'blitz' ? 'RUSH' : d.coverageType === 'man' ? 'MAN' : 'ZONE'}
            </text>
          </g>
        );
      })}
    </g>
  );
};

/**
 * Top Toolbar Control for Opponent Defensive Coverage Simulator
 */
interface OpponentCoverageToolbarProps {
  activeCoverage: OpponentCoverageKey;
  onSelectCoverage: (cov: OpponentCoverageKey) => void;
}

export const OpponentCoverageToolbar: React.FC<OpponentCoverageToolbarProps> = ({
  activeCoverage,
  onSelectCoverage,
}) => {
  const options: { key: OpponentCoverageKey; label: string; icon?: string }[] = [
    { key: 'off', label: 'Off' },
    { key: 'cover_1_man', label: 'Cover 1 Man' },
    { key: 'cover_2_zone', label: 'Cover 2 Zone' },
    { key: 'cover_3_zone', label: 'Cover 3 Zone' },
    { key: 'zero_blitz', label: 'Zero Blitz' },
  ];

  return (
    <div
      id="opponent-coverage-toolbar"
      className="flex items-center flex-wrap gap-1.5 p-1 sm:p-1.5 rounded-2xl bg-slate-950/90 backdrop-blur-xl border border-rose-900/60 shadow-2xl"
    >
      <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-black text-rose-400">
        <Shield className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" />
        <span className="hidden sm:inline uppercase tracking-wider text-[11px]">Opponent Coverage:</span>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        {options.map((opt) => {
          const isSelected = activeCoverage === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              id={`coverage-btn-${opt.key}`}
              onClick={() => onSelectCoverage(opt.key)}
              className={`min-h-[36px] px-2.5 sm:px-3 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 active:scale-95 select-none ${
                isSelected
                  ? opt.key === 'off'
                    ? 'bg-slate-700 text-white shadow-md'
                    : 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 ring-1 ring-rose-300'
                  : 'text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800'
              }`}
            >
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Audible / Tactical Read HUD Tooltip Component
 */
interface AudibleTacticalReadHUDProps {
  coverage: OpponentCoverageKey;
  openEvaluation: OpenTargetEvaluation | null;
  onApplyTacticalRead?: (note: string) => void;
}

export const AudibleTacticalReadHUD: React.FC<AudibleTacticalReadHUDProps> = ({
  coverage,
  openEvaluation,
  onApplyTacticalRead,
}) => {
  if (coverage === 'off') return null;

  const spec = OPPONENT_COVERAGE_SPECS[coverage];

  return (
    <div
      id="opponent-read-hud-card"
      className="w-full bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-rose-500/30 rounded-2xl p-3 sm:p-4 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-in fade-in"
    >
      <div className="space-y-1 max-w-2xl">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-mono font-black uppercase tracking-wider flex items-center gap-1">
            <Shield className="w-3 h-3" />
            {spec.label} SIMULATOR
          </span>

          {openEvaluation?.openPlayerLabel && (
            <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-black flex items-center gap-1 animate-pulse">
              <Sparkles className="w-3 h-3 text-amber-400" />
              ★ OPEN TARGET: {openEvaluation.openPlayerLabel} ({openEvaluation.beaterRouteType})
            </span>
          )}
        </div>

        {/* Dynamic Situational Read Quote */}
        <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
          <span className="text-amber-400">💡 Read:</span>
          <span className="text-amber-200 font-mono tracking-tight">&ldquo;{spec.situationalRead}&rdquo;</span>
        </div>

        {/* Tactical Explanation */}
        <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
          <strong className="text-slate-200">Defensive Structure:</strong> {spec.description} <br />
          <strong className="text-rose-300">Exploit:</strong> {openEvaluation?.reason || spec.weakness}
        </p>
      </div>

      {/* 1-Click Sync to Play Read Button */}
      {onApplyTacticalRead && (
        <button
          type="button"
          id="btn-apply-tactical-read"
          onClick={() => onApplyTacticalRead(spec.situationalRead)}
          className="shrink-0 min-h-[38px] px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 hover:text-amber-200 text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
          title="Apply this tactical situational read to your play's audible note"
        >
          <Target className="w-3.5 h-3.5 text-amber-400" />
          <span>Insert into Play Read</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};
