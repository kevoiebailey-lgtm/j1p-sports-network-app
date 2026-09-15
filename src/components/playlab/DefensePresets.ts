import {
  DefensivePlayer,
  DefensiveZoneArea,
  DefensiveBlitzArrow,
  DefensiveManLockLink,
  DefensePresetKey,
  ZoneCoverageType,
} from '../../types/tactics';

/**
 * 5 Core Defensive Positions (Flag / Tackle standard shell):
 * - R: Rusher at 7 yards (Rule standard: 7 yards behind/ahead of LOS at y=280 when LOS=350)
 * - MLB: Middle Linebacker (patrols Hook/Curl / QB Spy at y=300)
 * - LCB: Left Cornerback (covers boundary Flat or Deep Third at x=170, y=290)
 * - RCB: Right Cornerback (covers field Flat or Deep Third at x=630, y=290)
 * - FS: Free Safety (patrols Deep Middle / Deep Half at x=400, y=190)
 */
export const INITIAL_DEFENSIVE_PLAYERS: DefensivePlayer[] = [
  {
    id: 'def_r',
    label: 'R',
    name: 'Rusher (7-Yard Mark)',
    x: 370,
    y: 280, // 7 yards off LOS (350 - 70)
    role: 'rusher',
    coverageType: 'blitz',
    isBlitzing: true,
  },
  {
    id: 'def_mlb',
    label: 'MLB',
    name: 'Middle Linebacker',
    x: 420,
    y: 305,
    role: 'linebacker',
    coverageType: 'zone',
    zoneType: 'Hook',
  },
  {
    id: 'def_lcb',
    label: 'LCB',
    name: 'Left Cornerback',
    x: 170,
    y: 290,
    role: 'corner',
    coverageType: 'zone',
    zoneType: 'Flat',
  },
  {
    id: 'def_rcb',
    label: 'RCB',
    name: 'Right Cornerback',
    x: 630,
    y: 290,
    role: 'corner',
    coverageType: 'zone',
    zoneType: 'Flat',
  },
  {
    id: 'def_fs',
    label: 'FS',
    name: 'Free Safety',
    x: 400,
    y: 190,
    role: 'safety',
    coverageType: 'zone',
    zoneType: 'Deep Half',
  },
];

export interface DefensePresetShell {
  key: DefensePresetKey;
  name: string;
  description: string;
  tacticalNote: string;
  players: DefensivePlayer[];
  zones: DefensiveZoneArea[];
  blitzArrows: DefensiveBlitzArrow[];
  manLockLinks: DefensiveManLockLink[];
}

export const DEFENSIVE_PRESET_SHELLS: Record<DefensePresetKey, DefensePresetShell> = {
  'Cover 2': {
    key: 'Cover 2',
    name: 'Cover 2 (2-Deep Halves, Underneath Traps)',
    description: '2 deep safeties split field halves (20+ yds). Corners jump flats, MLB takes hook/curl middle hole.',
    tacticalNote: 'Weakness: Middle hole shot (15-18 yds) and sideline honey-holes behind CBs.',
    players: [
      { id: 'def_r', label: 'R', name: 'Rusher', x: 370, y: 280, role: 'rusher', coverageType: 'blitz', isBlitzing: true },
      { id: 'def_mlb', label: 'MLB', name: 'Middle Linebacker', x: 400, y: 305, role: 'linebacker', coverageType: 'zone', zoneType: 'Hook' },
      { id: 'def_lcb', label: 'LCB', name: 'Left Cornerback', x: 160, y: 310, role: 'corner', coverageType: 'zone', zoneType: 'Flat' },
      { id: 'def_rcb', label: 'RCB', name: 'Right Cornerback', x: 640, y: 310, role: 'corner', coverageType: 'zone', zoneType: 'Flat' },
      { id: 'def_fs', label: 'FS', name: 'Free Safety', x: 260, y: 190, role: 'safety', coverageType: 'zone', zoneType: 'Deep Half' },
    ],
    zones: [
      { id: 'zone_dh_left', name: 'Deep Half', x: 230, y: 180, width: 320, height: 130, color: 'rgba(56, 189, 248, 0.22)', assignedPlayer: 'FS' },
      { id: 'zone_dh_right', name: 'Deep Half', x: 570, y: 180, width: 320, height: 130, color: 'rgba(56, 189, 248, 0.22)', assignedPlayer: 'RCB' },
      { id: 'zone_flat_left', name: 'Flat', x: 140, y: 310, width: 170, height: 90, color: 'rgba(16, 185, 129, 0.25)', assignedPlayer: 'LCB' },
      { id: 'zone_flat_right', name: 'Flat', x: 660, y: 310, width: 170, height: 90, color: 'rgba(16, 185, 129, 0.25)', assignedPlayer: 'RCB' },
      { id: 'zone_hook_mid', name: 'Hook', x: 400, y: 300, width: 220, height: 90, color: 'rgba(168, 85, 247, 0.25)', assignedPlayer: 'MLB' },
    ],
    blitzArrows: [
      { id: 'blitz_r', fromPlayer: 'R', startX: 370, startY: 280, endX: 395, endY: 410, color: '#EF4444' },
    ],
    manLockLinks: [],
  },

  'Cover 3': {
    key: 'Cover 3',
    name: 'Cover 3 (3-Deep Thirds, 2 Underneath Flats)',
    description: 'Corners bail deep outside thirds; FS locks deep middle third. MLB and Rusher/CB clamp underneath crossing routes.',
    tacticalNote: 'Weakness: 4 Verticals seam divide and quick outside hitches before CB bails.',
    players: [
      { id: 'def_r', label: 'R', name: 'Rusher', x: 370, y: 280, role: 'rusher', coverageType: 'blitz', isBlitzing: true },
      { id: 'def_mlb', label: 'MLB', name: 'Middle Linebacker', x: 400, y: 305, role: 'linebacker', coverageType: 'zone', zoneType: 'Hook' },
      { id: 'def_lcb', label: 'LCB', name: 'Left Cornerback', x: 160, y: 210, role: 'corner', coverageType: 'zone', zoneType: 'Deep Third' },
      { id: 'def_rcb', label: 'RCB', name: 'Right Cornerback', x: 640, y: 210, role: 'corner', coverageType: 'zone', zoneType: 'Deep Third' },
      { id: 'def_fs', label: 'FS', name: 'Free Safety', x: 400, y: 175, role: 'safety', coverageType: 'zone', zoneType: 'Deep Third' },
    ],
    zones: [
      { id: 'zone_d3_left', name: 'Deep Third', x: 150, y: 175, width: 220, height: 130, color: 'rgba(245, 158, 11, 0.22)', assignedPlayer: 'LCB' },
      { id: 'zone_d3_mid', name: 'Deep Third', x: 400, y: 175, width: 240, height: 130, color: 'rgba(245, 158, 11, 0.22)', assignedPlayer: 'FS' },
      { id: 'zone_d3_right', name: 'Deep Third', x: 650, y: 175, width: 220, height: 130, color: 'rgba(245, 158, 11, 0.22)', assignedPlayer: 'RCB' },
      { id: 'zone_hook_curl', name: 'Hook', x: 400, y: 305, width: 260, height: 90, color: 'rgba(168, 85, 247, 0.25)', assignedPlayer: 'MLB' },
      { id: 'zone_flat_under', name: 'Flat', x: 160, y: 315, width: 160, height: 80, color: 'rgba(16, 185, 129, 0.22)', assignedPlayer: 'LCB' },
    ],
    blitzArrows: [
      { id: 'blitz_r', fromPlayer: 'R', startX: 370, startY: 280, endX: 395, endY: 410, color: '#EF4444' },
    ],
    manLockLinks: [],
  },

  'Cover 1 Man-Free': {
    key: 'Cover 1 Man-Free',
    name: 'Cover 1 Man-Free (Single-High Safety, Tight Man Locks)',
    description: 'Corners and MLB play aggressive press-man trailing underneath. FS roams deep center to erase post & fly routes.',
    tacticalNote: 'Weakness: Mesh rubs, natural receiver picks, and QB scramble if no spy is assigned.',
    players: [
      { id: 'def_r', label: 'R', name: 'Rusher', x: 370, y: 280, role: 'rusher', coverageType: 'blitz', isBlitzing: true },
      { id: 'def_mlb', label: 'MLB', name: 'Middle Linebacker', x: 390, y: 320, role: 'linebacker', coverageType: 'man', manTarget: 'C' },
      { id: 'def_lcb', label: 'LCB', name: 'Left Cornerback', x: 160, y: 320, role: 'corner', coverageType: 'man', manTarget: 'X' },
      { id: 'def_rcb', label: 'RCB', name: 'Right Cornerback', x: 640, y: 320, role: 'corner', coverageType: 'man', manTarget: 'Z' },
      { id: 'def_fs', label: 'FS', name: 'Free Safety', x: 400, y: 170, role: 'safety', coverageType: 'zone', zoneType: 'Deep Third' },
    ],
    zones: [
      { id: 'zone_fs_free', name: 'Deep Third', x: 400, y: 170, width: 360, height: 130, color: 'rgba(56, 189, 248, 0.25)', assignedPlayer: 'FS' },
    ],
    blitzArrows: [
      { id: 'blitz_r', fromPlayer: 'R', startX: 370, startY: 280, endX: 395, endY: 410, color: '#EF4444' },
    ],
    manLockLinks: [
      { id: 'lock_lcb_x', defenderLabel: 'LCB', receiverLabel: 'X' },
      { id: 'lock_rcb_z', defenderLabel: 'RCB', receiverLabel: 'Z' },
      { id: 'lock_mlb_c', defenderLabel: 'MLB', receiverLabel: 'C' },
    ],
  },

  '1-Rusher Spy': {
    key: '1-Rusher Spy',
    name: '1-Rusher Spy (Downhill Rush + QB Contain)',
    description: 'Designated 7-yard speed rusher attacks off the edge. MLB shadows the QB eyes to eliminate scramble and RPO screens.',
    tacticalNote: 'Weakness: Quick slants behind the MLB spy if line of sight is compromised.',
    players: [
      { id: 'def_r', label: 'R', name: 'Rusher', x: 340, y: 280, role: 'rusher', coverageType: 'blitz', isBlitzing: true },
      { id: 'def_mlb', label: 'MLB', name: 'Middle Linebacker (Spy)', x: 400, y: 315, role: 'linebacker', coverageType: 'spy', zoneType: 'QB Spy' },
      { id: 'def_lcb', label: 'LCB', name: 'Left Cornerback', x: 170, y: 285, role: 'corner', coverageType: 'zone', zoneType: 'Flat' },
      { id: 'def_rcb', label: 'RCB', name: 'Right Cornerback', x: 630, y: 285, role: 'corner', coverageType: 'zone', zoneType: 'Flat' },
      { id: 'def_fs', label: 'FS', name: 'Free Safety', x: 400, y: 180, role: 'safety', coverageType: 'zone', zoneType: 'Deep Half' },
    ],
    zones: [
      { id: 'zone_spy', name: 'QB Spy', x: 400, y: 320, width: 190, height: 80, color: 'rgba(239, 68, 68, 0.28)', assignedPlayer: 'MLB' },
      { id: 'zone_deep_cover', name: 'Deep Half', x: 400, y: 175, width: 440, height: 120, color: 'rgba(56, 189, 248, 0.2)', assignedPlayer: 'FS' },
      { id: 'zone_flat_l', name: 'Flat', x: 150, y: 290, width: 170, height: 90, color: 'rgba(16, 185, 129, 0.22)', assignedPlayer: 'LCB' },
      { id: 'zone_flat_r', name: 'Flat', x: 650, y: 290, width: 170, height: 90, color: 'rgba(16, 185, 129, 0.22)', assignedPlayer: 'RCB' },
    ],
    blitzArrows: [
      { id: 'blitz_r_edge', fromPlayer: 'R', startX: 340, startY: 280, endX: 385, endY: 415, color: '#EF4444' },
    ],
    manLockLinks: [],
  },
};

/**
 * Standard Tactical If/Then Notes for Quick Insert
 */
export const TACTICAL_IF_THEN_PRESETS = [
  'If Press Man -> Target Read 1 (Mesh/Rub)',
  'If 2-High Zone -> Target Read 2 (Deep Post/Seam)',
  'If Rusher / Blitz -> Dump to Read 3 (Center Pop/Checkdown)',
  'If Cover 3 Soft Bail -> Target Read 1 (Quick Out / Hitch)',
  'If Single-High Safety -> Isolate X on Fly / Go',
  'If QB Spy Assigned -> Scramble Boundary or Dump to Flat',
];
