import { FormationShell, RouteTreeOption, RouteNumber } from '../../types/tactics';

export const ROUTE_TREE_DEFINITIONS: Record<RouteNumber, RouteTreeOption> = {
  0: {
    number: 0,
    name: 'Curl / Hitch',
    category: 'in_breaking',
    depthYards: 6,
    description: 'Drive hard 6 yards, plant outside foot, snap back toward QB for quick separation.',
    defaultCutDirection: 'straight',
    stemLength: 70,
    breakVector: { dx: 0, dy: 15 },
  },
  1: {
    number: 1,
    name: 'Flat / Quick Out',
    category: 'out_breaking',
    depthYards: 3,
    description: 'Immediate 3-yard release into the boundary flat, ideal vs Cover 3 or soft bail.',
    defaultCutDirection: 'right',
    stemLength: 35,
    breakVector: { dx: 55, dy: -5 },
  },
  2: {
    number: 2,
    name: 'Slant',
    category: 'in_breaking',
    depthYards: 4,
    description: '3 steps vertical, hard inside jab at 45-degree angle across the middle.',
    defaultCutDirection: 'left',
    stemLength: 45,
    breakVector: { dx: -60, dy: -50 },
  },
  3: {
    number: 3,
    name: 'Comeback',
    category: 'out_breaking',
    depthYards: 12,
    description: 'Push 12-14 yards vertical looking like a Go route, then sharp 45-degree plant back to the sideline.',
    defaultCutDirection: 'right',
    stemLength: 130,
    breakVector: { dx: 30, dy: 25 },
  },
  4: {
    number: 4,
    name: 'Out / Speed Out',
    category: 'out_breaking',
    depthYards: 10,
    description: 'Hard vertical stem to 10 yards, 90-degree squared cut toward the sideline away from safety.',
    defaultCutDirection: 'right',
    stemLength: 110,
    breakVector: { dx: 65, dy: 0 },
  },
  5: {
    number: 5,
    name: 'Dig / In',
    category: 'in_breaking',
    depthYards: 10,
    description: 'Drive 10-12 yards downfield, square 90-degree cut across intermediate middle behind LBs.',
    defaultCutDirection: 'left',
    stemLength: 110,
    breakVector: { dx: -70, dy: 0 },
  },
  6: {
    number: 6,
    name: 'Corner / Flag',
    category: 'out_breaking',
    depthYards: 12,
    description: 'Push 10 yards stem, bend toward pylon/deep sideline behind the cornerback.',
    defaultCutDirection: 'right',
    stemLength: 110,
    breakVector: { dx: 60, dy: -60 },
  },
  7: {
    number: 7,
    name: 'Post',
    category: 'in_breaking',
    depthYards: 12,
    description: 'Drive vertical 10-12 yards, break 45 degrees toward the goalpost splitting split safeties.',
    defaultCutDirection: 'left',
    stemLength: 115,
    breakVector: { dx: -60, dy: -65 },
  },
  8: {
    number: 8,
    name: 'Go / Fade / Streak',
    category: 'vertical',
    depthYards: 25,
    description: 'Pure vertical speed release, stack the DB on the outside shoulder.',
    defaultCutDirection: 'straight',
    stemLength: 190,
    breakVector: { dx: 0, dy: -10 },
  },
  9: {
    number: 9,
    name: 'Block / Pre-Snap Motion',
    category: 'blocking',
    depthYards: 0,
    description: 'Pass protection slide, edge chip, or horizontal jet motion behind scrimmage.',
    defaultCutDirection: 'straight',
    stemLength: 20,
    breakVector: { dx: 0, dy: 0 },
  },
};

/**
 * Computes vector route points for a player given their starting coordinate (x, y)
 * and route number, factoring in whether they are on the left or right side of the field.
 */
export function calculateRoutePoints(
  startX: number,
  startY: number,
  routeNum: RouteNumber,
  isFlipped: boolean = false
): { x: number; y: number }[] {
  const def = ROUTE_TREE_DEFINITIONS[routeNum];
  if (!def) return [{ x: startX, y: startY }];

  // Route 9 is a block / pass-pro
  if (routeNum === 9) {
    return [
      { x: startX, y: startY },
      { x: startX, y: startY - 18 },
    ];
  }

  // Stem goes vertically up towards the endzone (negative Y in SVG canvas)
  const stemEndY = startY - def.stemLength;
  const isRightSide = startX >= 400;

  // Determine direction multiplier:
  // For 'out' breaking: if right side, cut goes right (+dx). If left side, cut goes left (-dx).
  // For 'in' breaking: if right side, cut goes left (-dx). If left side, cut goes right (+dx).
  let cutSign = 1;
  if (def.category === 'out_breaking') {
    cutSign = isRightSide ? 1 : -1;
  } else if (def.category === 'in_breaking') {
    cutSign = isRightSide ? -1 : 1;
  }

  if (isFlipped) {
    cutSign = -cutSign;
  }

  const dx = Math.abs(def.breakVector.dx) * cutSign;
  const dy = def.breakVector.dy;

  // intermediate point for smooth cut
  const breakX = startX + dx;
  const breakY = stemEndY + dy;

  // Extra continuation endpoint for depth
  const extendedX = breakX + dx * 0.4;
  const extendedY = breakY + (dy < 0 ? dy * 0.4 : -10);

  return [
    { x: startX, y: startY },
    { x: startX, y: stemEndY },
    { x: breakX, y: breakY },
    { x: extendedX, y: extendedY },
  ];
}

export const FORMATION_PRESETS: Record<string, FormationShell> = {
  // === FLAG FOOTBALL 5v5 ===
  '5v5_Spread': {
    key: '5v5_Spread',
    name: '5v5 Spread (2x2)',
    category: 'flag_5v5',
    description: 'Balanced 2x2 perimeter attack with Center as hot checkdown over the middle.',
    personnel: 'QB, C, X, Z, Slot',
    players: [
      {
        id: 'qb',
        label: 'QB',
        positionGroup: 'QB',
        x: 400,
        y: 410,
        routeNumber: 9,
        routeName: 'Dropback / Read',
        isEligibleReceiver: false,
        routePoints: [{ x: 400, y: 410 }],
        assignmentNote: 'Read Z on Post, checkdown to C',
      },
      {
        id: 'c',
        label: 'C',
        positionGroup: 'OL',
        x: 400,
        y: 350,
        routeNumber: 0,
        routeName: 'Curl',
        routeDepthYards: 5,
        isEligibleReceiver: true,
        routePoints: calculateRoutePoints(400, 350, 0),
        assignmentNote: 'Snap ball, sit at 5 yards in soft zone',
      },
      {
        id: 'x',
        label: 'X',
        positionGroup: 'WR',
        x: 130,
        y: 350,
        routeNumber: 8,
        routeName: 'Go',
        routeDepthYards: 25,
        isEligibleReceiver: true,
        routePoints: calculateRoutePoints(130, 350, 8),
        assignmentNote: 'Boundary fly route, pull free safety',
      },
      {
        id: 'h',
        label: 'H',
        positionGroup: 'WR',
        x: 240,
        y: 360,
        routeNumber: 2,
        routeName: 'Slant',
        routeDepthYards: 4,
        isEligibleReceiver: true,
        routePoints: calculateRoutePoints(240, 360, 2),
        assignmentNote: 'Quick slant underneath X clearing',
      },
      {
        id: 'z',
        label: 'Z',
        positionGroup: 'WR',
        x: 670,
        y: 350,
        routeNumber: 7,
        routeName: 'Post',
        routeDepthYards: 12,
        isEligibleReceiver: true,
        routePoints: calculateRoutePoints(670, 350, 7),
        assignmentNote: 'Primary deep post over the top',
      },
    ],
  },
  '5v5_Bunch': {
    key: '5v5_Bunch',
    name: '5v5 Bunch Right',
    category: 'flag_5v5',
    description: 'Tight 3-receiver bunch to create natural mesh picks against man coverage.',
    personnel: 'QB, C, X, Y, Z',
    players: [
      {
        id: 'qb',
        label: 'QB',
        positionGroup: 'QB',
        x: 400,
        y: 415,
        routeNumber: 9,
        routeName: 'Dropback',
        isEligibleReceiver: false,
        routePoints: [{ x: 400, y: 415 }],
        assignmentNote: '3-step drop, roll right',
      },
      {
        id: 'c',
        label: 'C',
        positionGroup: 'OL',
        x: 400,
        y: 350,
        routeNumber: 1,
        routeName: 'Flat Left',
        routeDepthYards: 3,
        isEligibleReceiver: true,
        routePoints: calculateRoutePoints(400, 350, 1),
        assignmentNote: 'Immediate backside flat leak',
      },
      {
        id: 'x',
        label: 'X',
        positionGroup: 'WR',
        x: 140,
        y: 350,
        routeNumber: 8,
        routeName: 'Go',
        routeDepthYards: 20,
        isEligibleReceiver: true,
        routePoints: calculateRoutePoints(140, 350, 8),
        assignmentNote: 'Isolate 1-on-1 on weakside boundary',
      },
      {
        id: 'y',
        label: 'Y',
        positionGroup: 'WR',
        x: 580,
        y: 350,
        routeNumber: 6,
        routeName: 'Corner',
        routeDepthYards: 12,
        isEligibleReceiver: true,
        routePoints: calculateRoutePoints(580, 350, 6),
        assignmentNote: 'Deep corner over the top of bunch',
      },
      {
        id: 'z',
        label: 'Z',
        positionGroup: 'WR',
        x: 640,
        y: 360,
        routeNumber: 1,
        routeName: 'Flat',
        routeDepthYards: 3,
        isEligibleReceiver: true,
        routePoints: calculateRoutePoints(640, 360, 1),
        assignmentNote: 'Quick speed flat under corner rub',
      },
    ],
  },
  '5v5_Trips': {
    key: '5v5_Trips',
    name: '5v5 Trips Left',
    category: 'flag_5v5',
    description: 'Floods single-high coverage to the boundary with 3 overloaded receivers.',
    personnel: 'QB, C, X, H, Z',
    players: [
      {
        id: 'qb',
        label: 'QB',
        positionGroup: 'QB',
        x: 400,
        y: 410,
        routeNumber: 9,
        routeName: 'Dropback',
        isEligibleReceiver: false,
        routePoints: [{ x: 400, y: 410 }],
      },
      {
        id: 'c',
        label: 'C',
        positionGroup: 'OL',
        x: 400,
        y: 350,
        routeNumber: 0,
        routeName: 'Curl',
        routeDepthYards: 5,
        isEligibleReceiver: true,
        routePoints: calculateRoutePoints(400, 350, 0),
      },
      {
        id: 'x',
        label: 'X',
        positionGroup: 'WR',
        x: 120,
        y: 350,
        routeNumber: 8,
        routeName: 'Go',
        routeDepthYards: 25,
        isEligibleReceiver: true,
        routePoints: calculateRoutePoints(120, 350, 8),
      },
      {
        id: 'h',
        label: 'H',
        positionGroup: 'WR',
        x: 210,
        y: 358,
        routeNumber: 4,
        routeName: 'Out',
        routeDepthYards: 10,
        isEligibleReceiver: true,
        routePoints: calculateRoutePoints(210, 358, 4),
      },
      {
        id: 'z',
        label: 'Z',
        positionGroup: 'WR',
        x: 290,
        y: 358,
        routeNumber: 2,
        routeName: 'Slant',
        routeDepthYards: 4,
        isEligibleReceiver: true,
        routePoints: calculateRoutePoints(290, 358, 2),
      },
    ],
  },

  // === FLAG FOOTBALL 7v7 ===
  '7v7_Spread': {
    key: '7v7_Spread',
    name: '7v7 Spread (3x3 / 4-Wide)',
    category: 'flag_7v7',
    description: 'Full spread tournament package featuring dual slot options and single high safety stress.',
    personnel: 'QB, C, X, H, Y, Z, RB',
    players: [
      { id: 'qb', label: 'QB', positionGroup: 'QB', x: 400, y: 420, routeNumber: 9, isEligibleReceiver: false, routePoints: [{ x: 400, y: 420 }] },
      { id: 'c', label: 'C', positionGroup: 'OL', x: 400, y: 350, routeNumber: 0, isEligibleReceiver: true, routePoints: calculateRoutePoints(400, 350, 0) },
      { id: 'rb', label: 'RB', positionGroup: 'RB', x: 330, y: 415, routeNumber: 1, isEligibleReceiver: true, routePoints: calculateRoutePoints(330, 415, 1) },
      { id: 'x', label: 'X', positionGroup: 'WR', x: 100, y: 350, routeNumber: 8, isEligibleReceiver: true, routePoints: calculateRoutePoints(100, 350, 8) },
      { id: 'h', label: 'H', positionGroup: 'WR', x: 220, y: 360, routeNumber: 5, isEligibleReceiver: true, routePoints: calculateRoutePoints(220, 360, 5) },
      { id: 'y', label: 'Y', positionGroup: 'TE', x: 580, y: 360, routeNumber: 2, isEligibleReceiver: true, routePoints: calculateRoutePoints(580, 360, 2) },
      { id: 'z', label: 'Z', positionGroup: 'WR', x: 700, y: 350, routeNumber: 4, isEligibleReceiver: true, routePoints: calculateRoutePoints(700, 350, 4) },
    ],
  },

  // === TACKLE FOOTBALL 11v11 ===
  'Spread': {
    key: 'Spread',
    name: 'Tackle Spread (10 Personnel)',
    category: 'tackle_11v11',
    description: '10 Personnel 4-Wide Spread Gun. High-tempo spacing stretching both boundary sidelines.',
    personnel: 'QB, RB, LT, LG, C, RG, RT, X, H, Y, Z',
    players: [
      { id: 'c', label: 'C', positionGroup: 'OL', x: 400, y: 350, routeNumber: 9, isEligibleReceiver: false, routePoints: calculateRoutePoints(400, 350, 9) },
      { id: 'lg', label: 'LG', positionGroup: 'OL', x: 365, y: 350, routeNumber: 9, isEligibleReceiver: false, routePoints: calculateRoutePoints(365, 350, 9) },
      { id: 'rg', label: 'RG', positionGroup: 'OL', x: 435, y: 350, routeNumber: 9, isEligibleReceiver: false, routePoints: calculateRoutePoints(435, 350, 9) },
      { id: 'lt', label: 'LT', positionGroup: 'OL', x: 330, y: 350, routeNumber: 9, isEligibleReceiver: false, routePoints: calculateRoutePoints(330, 350, 9) },
      { id: 'rt', label: 'RT', positionGroup: 'OL', x: 470, y: 350, routeNumber: 9, isEligibleReceiver: false, routePoints: calculateRoutePoints(470, 350, 9) },
      { id: 'qb', label: 'QB', positionGroup: 'QB', x: 400, y: 415, routeNumber: 9, isEligibleReceiver: false, routePoints: [{ x: 400, y: 415 }] },
      { id: 'rb', label: 'RB', positionGroup: 'RB', x: 360, y: 415, routeNumber: 1, isEligibleReceiver: true, routePoints: calculateRoutePoints(360, 415, 1) },
      { id: 'x', label: 'X', positionGroup: 'WR', x: 80, y: 350, routeNumber: 8, isEligibleReceiver: true, routePoints: calculateRoutePoints(80, 350, 8) },
      { id: 'h', label: 'H', positionGroup: 'WR', x: 200, y: 358, routeNumber: 5, isEligibleReceiver: true, routePoints: calculateRoutePoints(200, 358, 5) },
      { id: 'y', label: 'Y', positionGroup: 'WR', x: 600, y: 358, routeNumber: 2, isEligibleReceiver: true, routePoints: calculateRoutePoints(600, 358, 2) },
      { id: 'z', label: 'Z', positionGroup: 'WR', x: 720, y: 350, routeNumber: 4, isEligibleReceiver: true, routePoints: calculateRoutePoints(720, 350, 4) },
    ],
  },
  'Trips': {
    key: 'Trips',
    name: 'Tackle Trips Right (11 Personnel)',
    category: 'tackle_11v11',
    description: '11 Personnel with 3 receivers to the right field creating vertical stretch and sail concepts.',
    personnel: 'QB, RB, LT, LG, C, RG, RT, X, TE, H, Z',
    players: [
      { id: 'c', label: 'C', positionGroup: 'OL', x: 400, y: 350, routeNumber: 9, isEligibleReceiver: false, routePoints: calculateRoutePoints(400, 350, 9) },
      { id: 'lg', label: 'LG', positionGroup: 'OL', x: 365, y: 350, routeNumber: 9, isEligibleReceiver: false, routePoints: calculateRoutePoints(365, 350, 9) },
      { id: 'rg', label: 'RG', positionGroup: 'OL', x: 435, y: 350, routeNumber: 9, isEligibleReceiver: false, routePoints: calculateRoutePoints(435, 350, 9) },
      { id: 'lt', label: 'LT', positionGroup: 'OL', x: 330, y: 350, routeNumber: 9, isEligibleReceiver: false, routePoints: calculateRoutePoints(330, 350, 9) },
      { id: 'rt', label: 'RT', positionGroup: 'OL', x: 470, y: 350, routeNumber: 9, isEligibleReceiver: false, routePoints: calculateRoutePoints(470, 350, 9) },
      { id: 'qb', label: 'QB', positionGroup: 'QB', x: 400, y: 415, routeNumber: 9, isEligibleReceiver: false, routePoints: [{ x: 400, y: 415 }] },
      { id: 'rb', label: 'RB', positionGroup: 'RB', x: 360, y: 415, routeNumber: 9, isEligibleReceiver: true, routePoints: calculateRoutePoints(360, 415, 9) },
      { id: 'x', label: 'X', positionGroup: 'WR', x: 90, y: 350, routeNumber: 8, isEligibleReceiver: true, routePoints: calculateRoutePoints(90, 350, 8) },
      { id: 'y', label: 'TE', positionGroup: 'TE', x: 505, y: 350, routeNumber: 0, isEligibleReceiver: true, routePoints: calculateRoutePoints(505, 350, 0) },
      { id: 'h', label: 'H', positionGroup: 'WR', x: 610, y: 358, routeNumber: 4, isEligibleReceiver: true, routePoints: calculateRoutePoints(610, 358, 4) },
      { id: 'z', label: 'Z', positionGroup: 'WR', x: 720, y: 350, routeNumber: 7, isEligibleReceiver: true, routePoints: calculateRoutePoints(720, 350, 7) },
    ],
  },
  'Bunch': {
    key: 'Bunch',
    name: 'Tackle Bunch Right',
    category: 'tackle_11v11',
    description: 'Compresses safety alignment with tight 3-receiver bunch to set up rub routes.',
    personnel: 'QB, RB, 5 OL, X, TE, H, Z',
    players: [
      { id: 'c', label: 'C', positionGroup: 'OL', x: 400, y: 350, routeNumber: 9, isEligibleReceiver: false, routePoints: calculateRoutePoints(400, 350, 9) },
      { id: 'lg', label: 'LG', positionGroup: 'OL', x: 365, y: 350, routeNumber: 9, isEligibleReceiver: false, routePoints: calculateRoutePoints(365, 350, 9) },
      { id: 'rg', label: 'RG', positionGroup: 'OL', x: 435, y: 350, routeNumber: 9, isEligibleReceiver: false, routePoints: calculateRoutePoints(435, 350, 9) },
      { id: 'lt', label: 'LT', positionGroup: 'OL', x: 330, y: 350, routeNumber: 9, isEligibleReceiver: false, routePoints: calculateRoutePoints(330, 350, 9) },
      { id: 'rt', label: 'RT', positionGroup: 'OL', x: 470, y: 350, routeNumber: 9, isEligibleReceiver: false, routePoints: calculateRoutePoints(470, 350, 9) },
      { id: 'qb', label: 'QB', positionGroup: 'QB', x: 400, y: 415, routeNumber: 9, isEligibleReceiver: false, routePoints: [{ x: 400, y: 415 }] },
      { id: 'rb', label: 'RB', positionGroup: 'RB', x: 435, y: 415, routeNumber: 1, isEligibleReceiver: true, routePoints: calculateRoutePoints(435, 415, 1) },
      { id: 'x', label: 'X', positionGroup: 'WR', x: 90, y: 350, routeNumber: 8, isEligibleReceiver: true, routePoints: calculateRoutePoints(90, 350, 8) },
      { id: 'y', label: 'TE', positionGroup: 'TE', x: 570, y: 350, routeNumber: 6, isEligibleReceiver: true, routePoints: calculateRoutePoints(570, 350, 6) },
      { id: 'h', label: 'H', positionGroup: 'WR', x: 620, y: 362, routeNumber: 1, isEligibleReceiver: true, routePoints: calculateRoutePoints(620, 362, 1) },
      { id: 'z', label: 'Z', positionGroup: 'WR', x: 660, y: 350, routeNumber: 7, isEligibleReceiver: true, routePoints: calculateRoutePoints(660, 350, 7) },
    ],
  },
  'I-Form': {
    key: 'I-Form',
    name: 'Tackle I-Formation (21 Personnel)',
    category: 'tackle_11v11',
    description: 'Pro Style 21 Personnel with Fullback and Tailback lined up directly behind the Quarterback.',
    personnel: 'QB, FB, TB, 5 OL, TE, X, Z',
    players: [
      { id: 'c', label: 'C', positionGroup: 'OL', x: 400, y: 350, routeNumber: 9, isEligibleReceiver: false, routePoints: calculateRoutePoints(400, 350, 9) },
      { id: 'lg', label: 'LG', positionGroup: 'OL', x: 365, y: 350, routeNumber: 9, isEligibleReceiver: false, routePoints: calculateRoutePoints(365, 350, 9) },
      { id: 'rg', label: 'RG', positionGroup: 'OL', x: 435, y: 350, routeNumber: 9, isEligibleReceiver: false, routePoints: calculateRoutePoints(435, 350, 9) },
      { id: 'lt', label: 'LT', positionGroup: 'OL', x: 330, y: 350, routeNumber: 9, isEligibleReceiver: false, routePoints: calculateRoutePoints(330, 350, 9) },
      { id: 'rt', label: 'RT', positionGroup: 'OL', x: 470, y: 350, routeNumber: 9, isEligibleReceiver: false, routePoints: calculateRoutePoints(470, 350, 9) },
      { id: 'te', label: 'TE', positionGroup: 'TE', x: 505, y: 350, routeNumber: 0, isEligibleReceiver: true, routePoints: calculateRoutePoints(505, 350, 0) },
      { id: 'qb', label: 'QB', positionGroup: 'QB', x: 400, y: 380, routeNumber: 9, isEligibleReceiver: false, routePoints: [{ x: 400, y: 380 }] },
      { id: 'fb', label: 'FB', positionGroup: 'RB', x: 400, y: 420, routeNumber: 9, isEligibleReceiver: true, routePoints: calculateRoutePoints(400, 420, 9) },
      { id: 'tb', label: 'TB', positionGroup: 'RB', x: 400, y: 460, routeNumber: 1, isEligibleReceiver: true, routePoints: calculateRoutePoints(400, 460, 1) },
      { id: 'x', label: 'X', positionGroup: 'WR', x: 100, y: 350, routeNumber: 8, isEligibleReceiver: true, routePoints: calculateRoutePoints(100, 350, 8) },
      { id: 'z', label: 'Z', positionGroup: 'WR', x: 700, y: 350, routeNumber: 3, isEligibleReceiver: true, routePoints: calculateRoutePoints(700, 350, 3) },
    ],
  },
};
