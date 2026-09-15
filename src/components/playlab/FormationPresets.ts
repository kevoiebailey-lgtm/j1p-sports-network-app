import { 
  FormationShell, 
  RouteTreeOption, 
  RouteNumber, 
  RouteDepthLevel, 
  RouteEndMarker,
  TacticalPlayer 
} from '../../types/tactics';

export interface VectorRouteResult {
  svgPathD: string;
  endMarker: RouteEndMarker;
  routePoints: { x: number; y: number }[];
  depthYards: number;
  endX: number;
  endY: number;
}

export const ROUTE_TREE_DEFINITIONS: Record<RouteNumber, RouteTreeOption> = {
  0: {
    number: 0,
    name: 'Hitch / Curl',
    category: 'in_breaking',
    depthYards: 6,
    description: 'Drive hard 5-6 yards, plant outside foot, snap back toward QB for quick separation.',
    defaultCutDirection: 'straight',
    stemLength: 50,
    breakVector: { dx: 0, dy: 15 },
  },
  1: {
    number: 1,
    name: 'Flat / Quick Out',
    category: 'out_breaking',
    depthYards: 4,
    description: 'Immediate 3-4 yard release into the boundary flat, ideal vs Cover 3 or soft bail.',
    defaultCutDirection: 'right',
    stemLength: 35,
    breakVector: { dx: 55, dy: -5 },
  },
  2: {
    number: 2,
    name: 'Slant',
    category: 'in_breaking',
    depthYards: 5,
    description: '3 steps vertical, hard inside jab at 45-degree angle across the middle.',
    defaultCutDirection: 'left',
    stemLength: 42,
    breakVector: { dx: -60, dy: -50 },
  },
  3: {
    number: 3,
    name: 'Comeback',
    category: 'out_breaking',
    depthYards: 12,
    description: 'Push 12-14 yards vertical looking like a Go route, then sharp 45-degree plant back to sideline.',
    defaultCutDirection: 'right',
    stemLength: 120,
    breakVector: { dx: 35, dy: 25 },
  },
  4: {
    number: 4,
    name: 'Deep Out / Speed Out',
    category: 'out_breaking',
    depthYards: 10,
    description: 'Hard vertical stem to 10 yards, 90-degree squared cut toward the sideline.',
    defaultCutDirection: 'right',
    stemLength: 95,
    breakVector: { dx: 65, dy: 0 },
  },
  5: {
    number: 5,
    name: 'Dig / In',
    category: 'in_breaking',
    depthYards: 10,
    description: 'Drive 10-12 yards downfield, square 90-degree cut across intermediate middle behind LBs.',
    defaultCutDirection: 'left',
    stemLength: 95,
    breakVector: { dx: -70, dy: 0 },
  },
  6: {
    number: 6,
    name: 'Corner / Flag',
    category: 'out_breaking',
    depthYards: 12,
    description: 'Push 10-12 yards stem, bend toward pylon/deep sideline behind cornerback.',
    defaultCutDirection: 'right',
    stemLength: 100,
    breakVector: { dx: 60, dy: -60 },
  },
  7: {
    number: 7,
    name: 'Post',
    category: 'in_breaking',
    depthYards: 12,
    description: 'Drive vertical 10-12 yards, break 45 degrees toward goalpost splitting safeties.',
    defaultCutDirection: 'left',
    stemLength: 105,
    breakVector: { dx: -60, dy: -65 },
  },
  8: {
    number: 8,
    name: 'Fly / Go / Streak',
    category: 'vertical',
    depthYards: 20,
    description: 'Pure vertical speed release, stack DB on outside shoulder.',
    defaultCutDirection: 'straight',
    stemLength: 160,
    breakVector: { dx: 0, dy: -10 },
  },
  9: {
    number: 9,
    name: 'Block / Motion',
    category: 'blocking',
    depthYards: 0,
    description: 'Pass protection slide, edge chip, or horizontal jet motion behind scrimmage.',
    defaultCutDirection: 'straight',
    stemLength: 20,
    breakVector: { dx: 0, dy: 0 },
  },
};

// Tactical Field Bounds: Keep routes between -5 yds backfield (Y=400) to +25 yds downfield (Y=100)
// and within field sideline boundaries (X: 45 - 755)
export const FIELD_BOUNDS = {
  MIN_X: 45,
  MAX_X: 755,
  MIN_Y: 100, // +25 yards downfield from scrimmage (Y=350)
  MAX_Y: 400, // -5 yards backfield from scrimmage (Y=350)
};

export function clampRouteX(x: number): number {
  return Math.max(FIELD_BOUNDS.MIN_X, Math.min(FIELD_BOUNDS.MAX_X, Math.round(x)));
}

export function clampRouteY(y: number): number {
  return Math.max(FIELD_BOUNDS.MIN_Y, Math.min(FIELD_BOUNDS.MAX_Y, Math.round(y)));
}

/**
 * Calculates depth multiplier and yardage based on short (5yd), medium (10yd), or deep (15yd)
 */
export function getDepthYardage(
  routeNum: RouteNumber,
  depthLevel: RouteDepthLevel = 'medium'
): { multiplier: number; yards: number } {
  if (routeNum === 9) return { multiplier: 1, yards: 0 };
  if (depthLevel === 'short') {
    return { multiplier: 0.65, yards: 5 };
  }
  if (depthLevel === 'deep') {
    return { multiplier: 1.45, yards: 15 };
  }
  return { multiplier: 1.0, yards: 10 };
}

/**
 * Computes vector SVG path string (M x y L ... Q ...) and points based on player start, route code,
 * depth, and horizontal flip orientation.
 * Clamps all route vectors within field boundaries (-5 yds backfield to +25 yds downfield).
 */
export function generateRouteVectorPath(
  startX: number,
  startY: number,
  routeNum: RouteNumber,
  depthLevel: RouteDepthLevel = 'medium',
  isFlipped: boolean = false
): VectorRouteResult {
  const def = ROUTE_TREE_DEFINITIONS[routeNum];
  if (!def) {
    return {
      svgPathD: `M ${startX} ${startY}`,
      endMarker: 'none',
      routePoints: [{ x: startX, y: startY }],
      depthYards: 0,
      endX: startX,
      endY: startY,
    };
  }

  const { multiplier, yards } = getDepthYardage(routeNum, depthLevel);
  const stemLength = Math.max(20, Math.round(def.stemLength * multiplier));

  // Route 9: Block (T-Cap) or protection chip
  if (routeNum === 9) {
    const blockEndY = clampRouteY(startY - 20);
    return {
      svgPathD: `M ${startX} ${startY} L ${startX} ${blockEndY}`,
      endMarker: 't-cap',
      routePoints: [
        { x: startX, y: startY },
        { x: startX, y: blockEndY },
      ],
      depthYards: 0,
      endX: startX,
      endY: blockEndY,
    };
  }

  // Determine inside/outside cut directions relative to formation center (400)
  const isRightSide = startX >= 400;
  let outDir = isRightSide ? 1 : -1;
  let inDir = isRightSide ? -1 : 1;

  if (isFlipped) {
    outDir = -outDir;
    inDir = -inDir;
  }

  // Clamp vertical stem end point
  const rawStemEndY = startY - stemLength;
  const stemEndY = clampRouteY(rawStemEndY);
  let pathD = '';
  let endMarker: RouteEndMarker = 'arrow';
  let points: { x: number; y: number }[] = [];
  let endX = startX;
  let endY = stemEndY;

  switch (routeNum) {
    case 0: {
      // 0: Hitch/Curl -> Stem vertical then hook back toward QB/inside
      const curlOffset = inDir * 16;
      const rawHookDown = stemEndY + 18;
      const hookDown = clampRouteY(rawHookDown);
      endX = clampRouteX(startX + Math.round(curlOffset * 0.6));
      endY = hookDown;
      pathD = `M ${startX} ${startY} L ${startX} ${stemEndY} Q ${startX + curlOffset} ${stemEndY + 4} ${endX} ${endY}`;
      endMarker = 'curl';
      points = [
        { x: startX, y: startY },
        { x: startX, y: stemEndY },
        { x: endX, y: endY },
      ];
      break;
    }

    case 1: {
      // 1: Flat/Quick Out -> Short stem, rounded break outward to boundary
      const rawFlatX = startX + outDir * (50 * multiplier);
      const rawFlatY = stemEndY - 6;
      endX = clampRouteX(rawFlatX);
      endY = clampRouteY(rawFlatY);
      const midCurveX = clampRouteX(startX + outDir * 14);
      pathD = `M ${startX} ${startY} L ${startX} ${Math.min(FIELD_BOUNDS.MAX_Y, stemEndY + 10)} Q ${startX} ${stemEndY} ${midCurveX} ${stemEndY} L ${endX} ${endY}`;
      endMarker = 'arrow';
      points = [
        { x: startX, y: startY },
        { x: startX, y: stemEndY },
        { x: endX, y: endY },
      ];
      break;
    }

    case 2: {
      // 2: Slant -> 3-step vertical stem (~25px), 45-degree inside jab
      const slantStemY = clampRouteY(startY - 26);
      let rawSlantX = startX + inDir * (70 * multiplier);
      let rawSlantY = slantStemY - (60 * multiplier);
      
      // Preserve cut angle when hitting boundary (+25yd ceiling Y=100)
      if (rawSlantY < FIELD_BOUNDS.MIN_Y) {
        const ratio = (slantStemY - FIELD_BOUNDS.MIN_Y) / (slantStemY - rawSlantY);
        rawSlantX = startX + (rawSlantX - startX) * ratio;
        rawSlantY = FIELD_BOUNDS.MIN_Y;
      }
      endX = clampRouteX(rawSlantX);
      endY = clampRouteY(rawSlantY);

      pathD = `M ${startX} ${startY} L ${startX} ${slantStemY} L ${endX} ${endY}`;
      endMarker = 'arrow';
      points = [
        { x: startX, y: startY },
        { x: startX, y: slantStemY },
        { x: endX, y: endY },
      ];
      break;
    }

    case 3: {
      // 3: Comeback -> Vertical stem to 12-14yd, sharp 45-degree plant back to sideline
      const rawCbX = startX + outDir * (38 * multiplier);
      const rawCbY = stemEndY + 28;
      endX = clampRouteX(rawCbX);
      endY = clampRouteY(rawCbY);
      pathD = `M ${startX} ${startY} L ${startX} ${stemEndY} L ${endX} ${endY}`;
      endMarker = 'arrow';
      points = [
        { x: startX, y: startY },
        { x: startX, y: stemEndY },
        { x: endX, y: endY },
      ];
      break;
    }

    case 4: {
      // 4: Deep Out -> Vertical stem, square 90-degree cut to sideline
      const rawOutX = startX + outDir * (68 * multiplier);
      endX = clampRouteX(rawOutX);
      endY = stemEndY;
      pathD = `M ${startX} ${startY} L ${startX} ${stemEndY} L ${endX} ${endY}`;
      endMarker = 'arrow';
      points = [
        { x: startX, y: startY },
        { x: startX, y: stemEndY },
        { x: endX, y: endY },
      ];
      break;
    }

    case 5: {
      // 5: Dig/In -> Vertical stem, square 90-degree cut inside across field
      const rawDigX = startX + inDir * (75 * multiplier);
      endX = clampRouteX(rawDigX);
      endY = stemEndY;
      pathD = `M ${startX} ${startY} L ${startX} ${stemEndY} L ${endX} ${endY}`;
      endMarker = 'arrow';
      points = [
        { x: startX, y: startY },
        { x: startX, y: stemEndY },
        { x: endX, y: endY },
      ];
      break;
    }

    case 6: {
      // 6: Corner -> Vertical stem, 45-degree angle break toward pylon
      let rawCornerX = startX + outDir * (65 * multiplier);
      let rawCornerY = stemEndY - (55 * multiplier);

      // Clamp to ceiling preserving angle
      if (rawCornerY < FIELD_BOUNDS.MIN_Y) {
        const ratio = (stemEndY - FIELD_BOUNDS.MIN_Y) / (stemEndY - rawCornerY);
        rawCornerX = startX + (rawCornerX - startX) * ratio;
        rawCornerY = FIELD_BOUNDS.MIN_Y;
      }
      endX = clampRouteX(rawCornerX);
      endY = clampRouteY(rawCornerY);
      pathD = `M ${startX} ${startY} L ${startX} ${stemEndY} L ${endX} ${endY}`;
      endMarker = 'arrow';
      points = [
        { x: startX, y: startY },
        { x: startX, y: stemEndY },
        { x: endX, y: endY },
      ];
      break;
    }

    case 7: {
      // 7: Post -> Vertical stem, 45-degree angle break toward goalpost
      let rawPostX = startX + inDir * (65 * multiplier);
      let rawPostY = stemEndY - (55 * multiplier);

      // Clamp to ceiling preserving angle
      if (rawPostY < FIELD_BOUNDS.MIN_Y) {
        const ratio = (stemEndY - FIELD_BOUNDS.MIN_Y) / (stemEndY - rawPostY);
        rawPostX = startX + (rawPostX - startX) * ratio;
        rawPostY = FIELD_BOUNDS.MIN_Y;
      }
      endX = clampRouteX(rawPostX);
      endY = clampRouteY(rawPostY);
      pathD = `M ${startX} ${startY} L ${startX} ${stemEndY} L ${endX} ${endY}`;
      endMarker = 'arrow';
      points = [
        { x: startX, y: startY },
        { x: startX, y: stemEndY },
        { x: endX, y: endY },
      ];
      break;
    }

    case 8: {
      // 8: Fly/Go -> Pure vertical streak with gentle fade to outside
      const rawGoEndY = startY - (175 * multiplier);
      const rawFadeX = startX + outDir * 15;
      endY = clampRouteY(rawGoEndY);
      endX = clampRouteX(rawFadeX);

      const mid1Y = Math.max(FIELD_BOUNDS.MIN_Y + 20, startY - 80);
      const mid2Y = Math.max(FIELD_BOUNDS.MIN_Y + 10, startY - 120);

      if (mid1Y <= endY) {
        pathD = `M ${startX} ${startY} L ${endX} ${endY}`;
      } else {
        pathD = `M ${startX} ${startY} L ${startX} ${mid1Y} Q ${startX + outDir * 5} ${mid2Y} ${endX} ${endY}`;
      }

      endMarker = 'arrow';
      points = [
        { x: startX, y: startY },
        { x: startX, y: mid1Y },
        { x: endX, y: endY },
      ];
      break;
    }

    default: {
      endX = startX;
      endY = clampRouteY(stemEndY);
      pathD = `M ${startX} ${startY} L ${startX} ${endY}`;
      endMarker = 'arrow';
      points = [
        { x: startX, y: startY },
        { x: endX, y: endY },
      ];
    }
  }

  return {
    svgPathD: pathD,
    endMarker,
    routePoints: points,
    depthYards: yards,
    endX,
    endY,
  };
}

/**
 * Backward compatibility helper for calculateRoutePoints
 */
export function calculateRoutePoints(
  startX: number,
  startY: number,
  routeNum: RouteNumber,
  isFlipped: boolean = false
): { x: number; y: number }[] {
  return generateRouteVectorPath(startX, startY, routeNum, 'medium', isFlipped).routePoints;
}

// Scrimmage is standard Y=350 on 800x500 canvas
const SCRIMMAGE_Y = 350;

export const FORMATION_PRESETS: Record<string, FormationShell> = {
  // ==========================================
  // FLAG FOOTBALL (5v5 & 7v7) PRESETS
  // (All Flag Center nodes are 100% Eligible!)
  // ==========================================
  '5v5_Spread': {
    key: '5v5_Spread',
    name: '5v5 Spread 2x2 (Center Eligible)',
    category: 'flag_5v5',
    description: 'Balanced 2x2 flag spread with twin split wideouts and an eligible center running underneath routes.',
    personnel: '1 QB, 1 Center, 3 WR',
    players: [
      {
        id: 'p_qb',
        label: 'QB',
        positionGroup: 'QB',
        x: 400,
        y: 420,
        isEligibleReceiver: false,
        routePoints: [{ x: 400, y: 420 }],
        color: '#00F0D0',
      },
      {
        id: 'p_c',
        label: 'C',
        positionGroup: 'C',
        x: 400,
        y: SCRIMMAGE_Y,
        isEligibleReceiver: true, // Center is eligible in flag!
        routeNumber: 0,
        routeName: 'Hitch / Curl',
        routeDepth: 'short',
        routeDepthYards: 5,
        routePoints: [],
        color: '#FF6A00',
        assignmentNote: 'Snap ball & quick 5yd hook in middle hole',
      },
      {
        id: 'p_x',
        label: 'X',
        positionGroup: 'WR',
        x: 130,
        y: SCRIMMAGE_Y,
        isEligibleReceiver: true,
        routeNumber: 8,
        routeName: 'Fly / Go',
        routeDepth: 'deep',
        routeDepthYards: 15,
        readProgression: 1,
        routePoints: [],
        color: '#A855F7',
      },
      {
        id: 'p_h',
        label: 'H',
        positionGroup: 'WR',
        x: 270,
        y: SCRIMMAGE_Y + 5,
        isEligibleReceiver: true,
        routeNumber: 4,
        routeName: 'Deep Out',
        routeDepth: 'medium',
        routeDepthYards: 10,
        readProgression: 2,
        routePoints: [],
        color: '#10B981',
      },
      {
        id: 'p_z',
        label: 'Z',
        positionGroup: 'WR',
        x: 670,
        y: SCRIMMAGE_Y,
        isEligibleReceiver: true,
        routeNumber: 2,
        routeName: 'Slant',
        routeDepth: 'medium',
        routeDepthYards: 5,
        readProgression: 3,
        routePoints: [],
        color: '#3B82F6',
      },
    ],
  },

  '5v5_Trips': {
    key: '5v5_Trips',
    name: '5v5 Trips Right (Overload)',
    category: 'flag_5v5',
    description: '3 receivers aligned to field side creating horizontal conflict against single safety.',
    personnel: '1 QB, 1 Center, 3 WR',
    players: [
      { id: 'p_qb', label: 'QB', positionGroup: 'QB', x: 400, y: 420, isEligibleReceiver: false, routePoints: [{ x: 400, y: 420 }], color: '#00F0D0' },
      { id: 'p_c', label: 'C', positionGroup: 'C', x: 400, y: SCRIMMAGE_Y, isEligibleReceiver: true, routeNumber: 1, routeName: 'Flat / Quick Out', routeDepth: 'short', routeDepthYards: 4, routePoints: [], color: '#FF6A00', assignmentNote: 'Flat release checkdown' },
      { id: 'p_x', label: 'X', positionGroup: 'WR', x: 140, y: SCRIMMAGE_Y, isEligibleReceiver: true, routeNumber: 7, routeName: 'Post', routeDepth: 'deep', routeDepthYards: 12, readProgression: 1, routePoints: [], color: '#A855F7' },
      { id: 'p_y', label: 'Y', positionGroup: 'WR', x: 550, y: SCRIMMAGE_Y + 8, isEligibleReceiver: true, routeNumber: 5, routeName: 'Dig / In', routeDepth: 'medium', routeDepthYards: 10, readProgression: 2, routePoints: [], color: '#EC4899' },
      { id: 'p_z', label: 'Z', positionGroup: 'WR', x: 670, y: SCRIMMAGE_Y, isEligibleReceiver: true, routeNumber: 6, routeName: 'Corner', routeDepth: 'medium', routeDepthYards: 12, readProgression: 3, routePoints: [], color: '#3B82F6' },
    ],
  },

  '5v5_Bunch': {
    key: '5v5_Bunch',
    name: '5v5 Bunch Right (Rub & Wheel)',
    category: 'flag_5v5',
    description: 'Triangular compressed bunch generating natural pick action vs aggressive man coverage.',
    personnel: '1 QB, 1 Center, 3 WR',
    players: [
      { id: 'p_qb', label: 'QB', positionGroup: 'QB', x: 400, y: 420, isEligibleReceiver: false, routePoints: [{ x: 400, y: 420 }], color: '#00F0D0' },
      { id: 'p_c', label: 'C', positionGroup: 'C', x: 400, y: SCRIMMAGE_Y, isEligibleReceiver: true, routeNumber: 2, routeName: 'Slant', routeDepth: 'short', routeDepthYards: 5, routePoints: [], color: '#FF6A00' },
      { id: 'p_x', label: 'X', positionGroup: 'WR', x: 140, y: SCRIMMAGE_Y, isEligibleReceiver: true, routeNumber: 8, routeName: 'Fly / Go', routeDepth: 'deep', routeDepthYards: 15, routePoints: [], color: '#A855F7' },
      { id: 'p_h', label: 'H', positionGroup: 'WR', x: 590, y: SCRIMMAGE_Y + 12, isEligibleReceiver: true, routeNumber: 1, routeName: 'Flat / Quick Out', routeDepth: 'short', routeDepthYards: 4, readProgression: 1, routePoints: [], color: '#10B981' },
      { id: 'p_z', label: 'Z', positionGroup: 'WR', x: 630, y: SCRIMMAGE_Y, isEligibleReceiver: true, routeNumber: 6, routeName: 'Corner', routeDepth: 'medium', routeDepthYards: 12, readProgression: 2, routePoints: [], color: '#3B82F6' },
    ],
  },

  '5v5_Empty': {
    key: '5v5_Empty',
    name: '5v5 Empty Quads (Full Width)',
    category: 'flag_5v5',
    description: 'Maximum horizontal field stretch with 4 perimeter receivers forcing defense into space.',
    personnel: '1 QB, 1 Center, 3 WR',
    players: [
      { id: 'p_qb', label: 'QB', positionGroup: 'QB', x: 400, y: 430, isEligibleReceiver: false, routePoints: [{ x: 400, y: 430 }], color: '#00F0D0' },
      { id: 'p_c', label: 'C', positionGroup: 'C', x: 400, y: SCRIMMAGE_Y, isEligibleReceiver: true, routeNumber: 0, routeName: 'Hitch / Curl', routeDepth: 'short', routeDepthYards: 5, routePoints: [], color: '#FF6A00' },
      { id: 'p_x', label: 'X', positionGroup: 'WR', x: 110, y: SCRIMMAGE_Y, isEligibleReceiver: true, routeNumber: 8, routeName: 'Fly / Go', routeDepth: 'deep', routeDepthYards: 18, readProgression: 1, routePoints: [], color: '#A855F7' },
      { id: 'p_h', label: 'H', positionGroup: 'WR', x: 250, y: SCRIMMAGE_Y, isEligibleReceiver: true, routeNumber: 4, routeName: 'Deep Out', routeDepth: 'medium', routeDepthYards: 10, readProgression: 2, routePoints: [], color: '#10B981' },
      { id: 'p_z', label: 'Z', positionGroup: 'WR', x: 690, y: SCRIMMAGE_Y, isEligibleReceiver: true, routeNumber: 2, routeName: 'Slant', routeDepth: 'medium', routeDepthYards: 5, readProgression: 3, routePoints: [], color: '#3B82F6' },
    ],
  },

  '7v7_Spread': {
    key: '7v7_Spread',
    name: '7v7 Pro Spread (Balanced 3x3)',
    category: 'flag_7v7',
    description: '7-on-7 tournament standard layout with balanced 3-man passing distribution and checkdown back.',
    personnel: '1 QB, 1 Center, 4 WR, 1 RB',
    players: [
      { id: 'p_qb', label: 'QB', positionGroup: 'QB', x: 400, y: 420, isEligibleReceiver: false, routePoints: [{ x: 400, y: 420 }], color: '#00F0D0' },
      { id: 'p_c', label: 'C', positionGroup: 'C', x: 400, y: SCRIMMAGE_Y, isEligibleReceiver: true, routeNumber: 0, routeName: 'Hitch / Curl', routeDepth: 'short', routeDepthYards: 5, routePoints: [], color: '#FF6A00' },
      { id: 'p_rb', label: 'RB', positionGroup: 'RB', x: 350, y: 415, isEligibleReceiver: true, routeNumber: 1, routeName: 'Flat / Quick Out', routeDepth: 'short', routeDepthYards: 4, readProgression: 3, routePoints: [], color: '#F59E0B' },
      { id: 'p_x', label: 'X', positionGroup: 'WR', x: 120, y: SCRIMMAGE_Y, isEligibleReceiver: true, routeNumber: 8, routeName: 'Fly / Go', routeDepth: 'deep', routeDepthYards: 20, readProgression: 1, routePoints: [], color: '#A855F7' },
      { id: 'p_h', label: 'H', positionGroup: 'WR', x: 250, y: SCRIMMAGE_Y + 5, isEligibleReceiver: true, routeNumber: 4, routeName: 'Deep Out', routeDepth: 'medium', routeDepthYards: 10, routePoints: [], color: '#10B981' },
      { id: 'p_y', label: 'Y', positionGroup: 'TE', x: 550, y: SCRIMMAGE_Y + 5, isEligibleReceiver: true, routeNumber: 5, routeName: 'Dig / In', routeDepth: 'medium', routeDepthYards: 10, readProgression: 2, routePoints: [], color: '#EC4899' },
      { id: 'p_z', label: 'Z', positionGroup: 'WR', x: 680, y: SCRIMMAGE_Y, isEligibleReceiver: true, routeNumber: 7, routeName: 'Post', routeDepth: 'deep', routeDepthYards: 12, routePoints: [], color: '#3B82F6' },
    ],
  },

  '7v7_Trips': {
    key: '7v7_Trips',
    name: '7v7 Trips Flood (3-Level Read)',
    category: 'flag_7v7',
    description: 'High-low flood concept on the trips side attacking deep third, intermediate hole, and flat.',
    personnel: '1 QB, 1 Center, 4 WR, 1 RB',
    players: [
      { id: 'p_qb', label: 'QB', positionGroup: 'QB', x: 400, y: 420, isEligibleReceiver: false, routePoints: [{ x: 400, y: 420 }], color: '#00F0D0' },
      { id: 'p_c', label: 'C', positionGroup: 'C', x: 400, y: SCRIMMAGE_Y, isEligibleReceiver: true, routeNumber: 0, routeName: 'Hitch / Curl', routeDepth: 'short', routeDepthYards: 5, routePoints: [], color: '#FF6A00' },
      { id: 'p_rb', label: 'RB', positionGroup: 'RB', x: 450, y: 415, isEligibleReceiver: true, routeNumber: 1, routeName: 'Flat / Quick Out', routeDepth: 'short', routeDepthYards: 4, routePoints: [], color: '#F59E0B' },
      { id: 'p_x', label: 'X', positionGroup: 'WR', x: 130, y: SCRIMMAGE_Y, isEligibleReceiver: true, routeNumber: 2, routeName: 'Slant', routeDepth: 'medium', routeDepthYards: 5, routePoints: [], color: '#A855F7' },
      { id: 'p_h', label: 'H', positionGroup: 'WR', x: 540, y: SCRIMMAGE_Y + 5, isEligibleReceiver: true, routeNumber: 4, routeName: 'Deep Out', routeDepth: 'medium', routeDepthYards: 10, readProgression: 2, routePoints: [], color: '#10B981' },
      { id: 'p_y', label: 'Y', positionGroup: 'TE', x: 610, y: SCRIMMAGE_Y + 5, isEligibleReceiver: true, routeNumber: 6, routeName: 'Corner', routeDepth: 'medium', routeDepthYards: 12, readProgression: 1, routePoints: [], color: '#EC4899' },
      { id: 'p_z', label: 'Z', positionGroup: 'WR', x: 690, y: SCRIMMAGE_Y, isEligibleReceiver: true, routeNumber: 8, routeName: 'Fly / Go', routeDepth: 'deep', routeDepthYards: 20, routePoints: [], color: '#3B82F6' },
    ],
  },

  '7v7_Bunch': {
    key: '7v7_Bunch',
    name: '7v7 Bunch Mesh (Traffic Concept)',
    category: 'flag_7v7',
    description: 'Compressed cluster with crossing shallow mesh drags designed to beat tight press man.',
    personnel: '1 QB, 1 Center, 4 WR, 1 RB',
    players: [
      { id: 'p_qb', label: 'QB', positionGroup: 'QB', x: 400, y: 420, isEligibleReceiver: false, routePoints: [{ x: 400, y: 420 }], color: '#00F0D0' },
      { id: 'p_c', label: 'C', positionGroup: 'C', x: 400, y: SCRIMMAGE_Y, isEligibleReceiver: true, routeNumber: 2, routeName: 'Slant', routeDepth: 'short', routeDepthYards: 5, routePoints: [], color: '#FF6A00' },
      { id: 'p_rb', label: 'RB', positionGroup: 'RB', x: 350, y: 415, isEligibleReceiver: true, routeNumber: 1, routeName: 'Flat / Quick Out', routeDepth: 'short', routeDepthYards: 4, routePoints: [], color: '#F59E0B' },
      { id: 'p_x', label: 'X', positionGroup: 'WR', x: 130, y: SCRIMMAGE_Y, isEligibleReceiver: true, routeNumber: 5, routeName: 'Dig / In', routeDepth: 'medium', routeDepthYards: 10, routePoints: [], color: '#A855F7' },
      { id: 'p_h', label: 'H', positionGroup: 'WR', x: 570, y: SCRIMMAGE_Y + 12, isEligibleReceiver: true, routeNumber: 1, routeName: 'Flat / Quick Out', routeDepth: 'short', routeDepthYards: 4, readProgression: 1, routePoints: [], color: '#10B981' },
      { id: 'p_y', label: 'Y', positionGroup: 'TE', x: 605, y: SCRIMMAGE_Y, isEligibleReceiver: true, routeNumber: 7, routeName: 'Post', routeDepth: 'deep', routeDepthYards: 12, readProgression: 2, routePoints: [], color: '#EC4899' },
      { id: 'p_z', label: 'Z', positionGroup: 'WR', x: 645, y: SCRIMMAGE_Y + 12, isEligibleReceiver: true, routeNumber: 6, routeName: 'Corner', routeDepth: 'medium', routeDepthYards: 12, readProgression: 3, routePoints: [], color: '#3B82F6' },
    ],
  },

  '7v7_Empty': {
    key: '7v7_Empty',
    name: '7v7 Empty 5-Out (Vertical Spacing)',
    category: 'flag_7v7',
    description: 'True 5-out pass distribution with every eligible skill weapon isolated in perimeter matchups.',
    personnel: '1 QB, 1 Center, 5 WR',
    players: [
      { id: 'p_qb', label: 'QB', positionGroup: 'QB', x: 400, y: 430, isEligibleReceiver: false, routePoints: [{ x: 400, y: 430 }], color: '#00F0D0' },
      { id: 'p_c', label: 'C', positionGroup: 'C', x: 400, y: SCRIMMAGE_Y, isEligibleReceiver: true, routeNumber: 0, routeName: 'Hitch / Curl', routeDepth: 'short', routeDepthYards: 5, routePoints: [], color: '#FF6A00' },
      { id: 'p_x', label: 'X', positionGroup: 'WR', x: 110, y: SCRIMMAGE_Y, isEligibleReceiver: true, routeNumber: 8, routeName: 'Fly / Go', routeDepth: 'deep', routeDepthYards: 20, readProgression: 1, routePoints: [], color: '#A855F7' },
      { id: 'p_h', label: 'H', positionGroup: 'WR', x: 230, y: SCRIMMAGE_Y, isEligibleReceiver: true, routeNumber: 2, routeName: 'Slant', routeDepth: 'medium', routeDepthYards: 5, routePoints: [], color: '#10B981' },
      { id: 'p_w', label: 'W', positionGroup: 'WR', x: 320, y: SCRIMMAGE_Y + 5, isEligibleReceiver: true, routeNumber: 5, routeName: 'Dig / In', routeDepth: 'medium', routeDepthYards: 10, readProgression: 2, routePoints: [], color: '#F59E0B' },
      { id: 'p_y', label: 'Y', positionGroup: 'TE', x: 570, y: SCRIMMAGE_Y, isEligibleReceiver: true, routeNumber: 4, routeName: 'Deep Out', routeDepth: 'medium', routeDepthYards: 10, routePoints: [], color: '#EC4899' },
      { id: 'p_z', label: 'Z', positionGroup: 'WR', x: 690, y: SCRIMMAGE_Y, isEligibleReceiver: true, routeNumber: 7, routeName: 'Post', routeDepth: 'deep', routeDepthYards: 12, readProgression: 3, routePoints: [], color: '#3B82F6' },
    ],
  },

  // ==========================================
  // 11v11 TACKLE FOOTBALL PRESETS
  // (Interior Line: LT, LG, C, RG, RT locked)
  // ==========================================
  '11v11_Spread_2x2': {
    key: '11v11_Spread_2x2',
    name: '11v11 Spread 2x2 (10 Personnel)',
    category: 'tackle_11v11',
    description: 'Modern 10-personnel shotgun spread with 4 wide receivers and offset tailback.',
    personnel: '1 QB, 1 RB, 5 OL, 4 WR',
    players: [
      { id: 'p_qb', label: 'QB', positionGroup: 'QB', x: 400, y: 415, isEligibleReceiver: false, routePoints: [{ x: 400, y: 415 }], color: '#00F0D0' },
      { id: 'p_rb', label: 'RB', positionGroup: 'RB', x: 350, y: 415, isEligibleReceiver: true, routeNumber: 1, routeName: 'Flat / Quick Out', routeDepth: 'short', routeDepthYards: 4, routePoints: [], color: '#F59E0B' },
      // Offensive Line (LT, LG, C, RG, RT) - pass pro blocks
      { id: 'p_lt', label: 'LT', positionGroup: 'OL', x: 320, y: SCRIMMAGE_Y, isEligibleReceiver: false, routeNumber: 9, routeName: 'Pass Protection', routePoints: [], color: '#64748B' },
      { id: 'p_lg', label: 'LG', positionGroup: 'OL', x: 360, y: SCRIMMAGE_Y, isEligibleReceiver: false, routeNumber: 9, routeName: 'Pass Protection', routePoints: [], color: '#64748B' },
      { id: 'p_c', label: 'C', positionGroup: 'OL', x: 400, y: SCRIMMAGE_Y, isEligibleReceiver: false, routeNumber: 9, routeName: 'Pass Protection', routePoints: [], color: '#64748B' },
      { id: 'p_rg', label: 'RG', positionGroup: 'OL', x: 440, y: SCRIMMAGE_Y, isEligibleReceiver: false, routeNumber: 9, routeName: 'Pass Protection', routePoints: [], color: '#64748B' },
      { id: 'p_rt', label: 'RT', positionGroup: 'OL', x: 480, y: SCRIMMAGE_Y, isEligibleReceiver: false, routeNumber: 9, routeName: 'Pass Protection', routePoints: [], color: '#64748B' },
      // Receivers
      { id: 'p_x', label: 'X', positionGroup: 'WR', x: 120, y: SCRIMMAGE_Y, isEligibleReceiver: true, routeNumber: 8, routeName: 'Fly / Go', routeDepth: 'deep', routeDepthYards: 20, readProgression: 1, routePoints: [], color: '#A855F7' },
      { id: 'p_h', label: 'H', positionGroup: 'WR', x: 230, y: SCRIMMAGE_Y + 5, isEligibleReceiver: true, routeNumber: 4, routeName: 'Deep Out', routeDepth: 'medium', routeDepthYards: 10, readProgression: 2, routePoints: [], color: '#10B981' },
      { id: 'p_y', label: 'Y', positionGroup: 'TE', x: 570, y: SCRIMMAGE_Y + 5, isEligibleReceiver: true, routeNumber: 5, routeName: 'Dig / In', routeDepth: 'medium', routeDepthYards: 10, readProgression: 3, routePoints: [], color: '#EC4899' },
      { id: 'p_z', label: 'Z', positionGroup: 'WR', x: 680, y: SCRIMMAGE_Y, isEligibleReceiver: true, routeNumber: 7, routeName: 'Post', routeDepth: 'deep', routeDepthYards: 12, routePoints: [], color: '#3B82F6' },
    ],
  },

  '11v11_Trips_Open': {
    key: '11v11_Trips_Open',
    name: '11v11 Trips Open (11 Personnel)',
    category: 'tackle_11v11',
    description: '3 wide receivers overloaded to one side with solitary boundary X receiver in 1-on-1 matchup.',
    personnel: '1 QB, 1 RB, 5 OL, 1 TE, 3 WR',
    players: [
      { id: 'p_qb', label: 'QB', positionGroup: 'QB', x: 400, y: 415, isEligibleReceiver: false, routePoints: [{ x: 400, y: 415 }], color: '#00F0D0' },
      { id: 'p_rb', label: 'RB', positionGroup: 'RB', x: 350, y: 415, isEligibleReceiver: true, routeNumber: 1, routeName: 'Flat / Quick Out', routeDepth: 'short', routeDepthYards: 4, routePoints: [], color: '#F59E0B' },
      { id: 'p_lt', label: 'LT', positionGroup: 'OL', x: 320, y: SCRIMMAGE_Y, isEligibleReceiver: false, routeNumber: 9, routeName: 'Pass Protection', routePoints: [], color: '#64748B' },
      { id: 'p_lg', label: 'LG', positionGroup: 'OL', x: 360, y: SCRIMMAGE_Y, isEligibleReceiver: false, routeNumber: 9, routeName: 'Pass Protection', routePoints: [], color: '#64748B' },
      { id: 'p_c', label: 'C', positionGroup: 'OL', x: 400, y: SCRIMMAGE_Y, isEligibleReceiver: false, routeNumber: 9, routeName: 'Pass Protection', routePoints: [], color: '#64748B' },
      { id: 'p_rg', label: 'RG', positionGroup: 'OL', x: 440, y: SCRIMMAGE_Y, isEligibleReceiver: false, routeNumber: 9, routeName: 'Pass Protection', routePoints: [], color: '#64748B' },
      { id: 'p_rt', label: 'RT', positionGroup: 'OL', x: 480, y: SCRIMMAGE_Y, isEligibleReceiver: false, routeNumber: 9, routeName: 'Pass Protection', routePoints: [], color: '#64748B' },
      { id: 'p_x', label: 'X', positionGroup: 'WR', x: 130, y: SCRIMMAGE_Y, isEligibleReceiver: true, routeNumber: 2, routeName: 'Slant', routeDepth: 'medium', routeDepthYards: 5, readProgression: 1, routePoints: [], color: '#A855F7' },
      { id: 'p_h', label: 'H', positionGroup: 'WR', x: 550, y: SCRIMMAGE_Y + 5, isEligibleReceiver: true, routeNumber: 4, routeName: 'Deep Out', routeDepth: 'medium', routeDepthYards: 10, readProgression: 2, routePoints: [], color: '#10B981' },
      { id: 'p_y', label: 'Y', positionGroup: 'TE', x: 610, y: SCRIMMAGE_Y + 5, isEligibleReceiver: true, routeNumber: 6, routeName: 'Corner', routeDepth: 'medium', routeDepthYards: 12, readProgression: 3, routePoints: [], color: '#EC4899' },
      { id: 'p_z', label: 'Z', positionGroup: 'WR', x: 690, y: SCRIMMAGE_Y, isEligibleReceiver: true, routeNumber: 8, routeName: 'Fly / Go', routeDepth: 'deep', routeDepthYards: 20, routePoints: [], color: '#3B82F6' },
    ],
  },

  '11v11_Pistol': {
    key: '11v11_Pistol',
    name: '11v11 Pistol Strong (21 Personnel)',
    category: 'tackle_11v11',
    description: 'Pistol alignment with tailback stacked 3 yards behind QB, providing downhill run mesh and play-action.',
    personnel: '1 QB, 2 RB, 5 OL, 1 TE, 2 WR',
    players: [
      { id: 'p_qb', label: 'QB', positionGroup: 'QB', x: 400, y: 395, isEligibleReceiver: false, routePoints: [{ x: 400, y: 395 }], color: '#00F0D0' },
      { id: 'p_rb', label: 'RB', positionGroup: 'RB', x: 400, y: 445, isEligibleReceiver: true, routeNumber: 1, routeName: 'Flat / Quick Out', routeDepth: 'short', routeDepthYards: 4, routePoints: [], color: '#F59E0B' },
      { id: 'p_fb', label: 'FB', positionGroup: 'RB', x: 440, y: 395, isEligibleReceiver: true, routeNumber: 9, routeName: 'Pass Protection / Lead Block', routePoints: [], color: '#F59E0B' },
      { id: 'p_lt', label: 'LT', positionGroup: 'OL', x: 320, y: SCRIMMAGE_Y, isEligibleReceiver: false, routeNumber: 9, routeName: 'Pass Protection', routePoints: [], color: '#64748B' },
      { id: 'p_lg', label: 'LG', positionGroup: 'OL', x: 360, y: SCRIMMAGE_Y, isEligibleReceiver: false, routeNumber: 9, routeName: 'Pass Protection', routePoints: [], color: '#64748B' },
      { id: 'p_c', label: 'C', positionGroup: 'OL', x: 400, y: SCRIMMAGE_Y, isEligibleReceiver: false, routeNumber: 9, routeName: 'Pass Protection', routePoints: [], color: '#64748B' },
      { id: 'p_rg', label: 'RG', positionGroup: 'OL', x: 440, y: SCRIMMAGE_Y, isEligibleReceiver: false, routeNumber: 9, routeName: 'Pass Protection', routePoints: [], color: '#64748B' },
      { id: 'p_rt', label: 'RT', positionGroup: 'OL', x: 480, y: SCRIMMAGE_Y, isEligibleReceiver: false, routeNumber: 9, routeName: 'Pass Protection', routePoints: [], color: '#64748B' },
      { id: 'p_te', label: 'TE', positionGroup: 'TE', x: 515, y: SCRIMMAGE_Y, isEligibleReceiver: true, routeNumber: 5, routeName: 'Dig / In', routeDepth: 'medium', routeDepthYards: 10, readProgression: 2, routePoints: [], color: '#EC4899' },
      { id: 'p_x', label: 'X', positionGroup: 'WR', x: 130, y: SCRIMMAGE_Y, isEligibleReceiver: true, routeNumber: 8, routeName: 'Fly / Go', routeDepth: 'deep', routeDepthYards: 20, readProgression: 1, routePoints: [], color: '#A855F7' },
      { id: 'p_z', label: 'Z', positionGroup: 'WR', x: 670, y: SCRIMMAGE_Y, isEligibleReceiver: true, routeNumber: 7, routeName: 'Post', routeDepth: 'deep', routeDepthYards: 12, readProgression: 3, routePoints: [], color: '#3B82F6' },
    ],
  },

  '11v11_I_Form': {
    key: '11v11_I_Form',
    name: '11v11 I-Formation Pro (21 Personnel)',
    category: 'tackle_11v11',
    description: 'Under-center power football baseline featuring fullback lead and deep play-action post-wheel shots.',
    personnel: '1 QB, 2 RB, 5 OL, 1 TE, 2 WR',
    players: [
      { id: 'p_qb', label: 'QB', positionGroup: 'QB', x: 400, y: 370, isEligibleReceiver: false, routePoints: [{ x: 400, y: 370 }], color: '#00F0D0' },
      { id: 'p_fb', label: 'FB', positionGroup: 'RB', x: 400, y: 410, isEligibleReceiver: true, routeNumber: 9, routeName: 'Lead Block / Checkdown', routePoints: [], color: '#F59E0B' },
      { id: 'p_rb', label: 'RB', positionGroup: 'RB', x: 400, y: 460, isEligibleReceiver: true, routeNumber: 1, routeName: 'Flat / Quick Out', routeDepth: 'short', routeDepthYards: 4, routePoints: [], color: '#F59E0B' },
      { id: 'p_lt', label: 'LT', positionGroup: 'OL', x: 320, y: SCRIMMAGE_Y, isEligibleReceiver: false, routeNumber: 9, routeName: 'Pass Protection', routePoints: [], color: '#64748B' },
      { id: 'p_lg', label: 'LG', positionGroup: 'OL', x: 360, y: SCRIMMAGE_Y, isEligibleReceiver: false, routeNumber: 9, routeName: 'Pass Protection', routePoints: [], color: '#64748B' },
      { id: 'p_c', label: 'C', positionGroup: 'OL', x: 400, y: SCRIMMAGE_Y, isEligibleReceiver: false, routeNumber: 9, routeName: 'Pass Protection', routePoints: [], color: '#64748B' },
      { id: 'p_rg', label: 'RG', positionGroup: 'OL', x: 440, y: SCRIMMAGE_Y, isEligibleReceiver: false, routeNumber: 9, routeName: 'Pass Protection', routePoints: [], color: '#64748B' },
      { id: 'p_rt', label: 'RT', positionGroup: 'OL', x: 480, y: SCRIMMAGE_Y, isEligibleReceiver: false, routeNumber: 9, routeName: 'Pass Protection', routePoints: [], color: '#64748B' },
      { id: 'p_te', label: 'TE', positionGroup: 'TE', x: 515, y: SCRIMMAGE_Y, isEligibleReceiver: true, routeNumber: 0, routeName: 'Hitch / Curl', routeDepth: 'short', routeDepthYards: 5, readProgression: 2, routePoints: [], color: '#EC4899' },
      { id: 'p_x', label: 'X', positionGroup: 'WR', x: 130, y: SCRIMMAGE_Y, isEligibleReceiver: true, routeNumber: 8, routeName: 'Fly / Go', routeDepth: 'deep', routeDepthYards: 20, readProgression: 1, routePoints: [], color: '#A855F7' },
      { id: 'p_z', label: 'Z', positionGroup: 'WR', x: 670, y: SCRIMMAGE_Y, isEligibleReceiver: true, routeNumber: 7, routeName: 'Post', routeDepth: 'deep', routeDepthYards: 12, readProgression: 3, routePoints: [], color: '#3B82F6' },
    ],
  },
};

// Also maintain alias keys for backward-compatibility with existing screens
FORMATION_PRESETS['Spread'] = FORMATION_PRESETS['11v11_Spread_2x2'];
FORMATION_PRESETS['Trips'] = FORMATION_PRESETS['11v11_Trips_Open'];
FORMATION_PRESETS['Bunch'] = FORMATION_PRESETS['5v5_Bunch'];
FORMATION_PRESETS['I-Form'] = FORMATION_PRESETS['11v11_I_Form'];
FORMATION_PRESETS['7v7_Pro'] = FORMATION_PRESETS['7v7_Spread'];

/**
 * Initializes all players in a formation with precalculated SVG vector paths.
 */
export function initializeFormationPlayers(
  presetKey: string,
  isFlipped: boolean = false
): TacticalPlayer[] {
  const preset = FORMATION_PRESETS[presetKey] || FORMATION_PRESETS['5v5_Spread'];
  return preset.players.map((p) => {
    let currentX = p.x;
    if (isFlipped) {
      currentX = 800 - currentX;
    }

    if (p.routeNumber !== undefined) {
      const vectorRes = generateRouteVectorPath(
        currentX,
        p.y,
        p.routeNumber,
        p.routeDepth || 'medium',
        isFlipped
      );
      return {
        ...p,
        x: currentX,
        routeDepth: p.routeDepth || 'medium',
        routeDepthYards: vectorRes.depthYards,
        routePoints: vectorRes.routePoints,
        svgPathD: vectorRes.svgPathD,
        endMarker: vectorRes.endMarker,
      };
    }

    return {
      ...p,
      x: currentX,
      svgPathD: `M ${currentX} ${p.y}`,
      endMarker: 'none' as RouteEndMarker,
    };
  });
}
