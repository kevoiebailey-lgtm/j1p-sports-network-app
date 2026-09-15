export interface RouteDefinition {
  id: string;
  number?: string;
  name: string;
  category: 'core_tree' | 'specialty' | 'backfield' | 'concept';
  shortDesc: string;
  depthYards: number;
  directionDefault: 'in' | 'out' | 'straight' | 'custom';
  generatePoints: (
    startX: number,
    startY: number,
    options?: {
      direction?: 'left' | 'right' | 'inside' | 'outside';
      depth?: 'short' | 'medium' | 'deep';
      fieldWidth?: number;
      fieldHeight?: number;
    }
  ) => { x: number; y: number }[];
}

export interface PassingConcept {
  id: string;
  name: string;
  sport: 'flag_5v5' | 'flag_7v7' | 'football_11v11';
  description: string;
  badge: string;
  // maps player role/id to a route definition ID or custom generator
  playerRoutes: Record<string, { routeId: string; direction?: 'left' | 'right' | 'inside' | 'outside'; depth?: 'short' | 'medium' | 'deep' }>;
}

// 10 yards roughly corresponds to ~60-70px in the SVG canvas (where field height is 500 and width is 800)
// Scrimmage is at Y=350, Endzone is at Y=70. Moving towards Y=0 is moving forward/upfield.

export const ROUTE_TREE_DEFINITIONS: RouteDefinition[] = [
  {
    id: '0_hitch',
    number: '0',
    name: 'Hitch / Curl',
    category: 'core_tree',
    shortDesc: '5-yd vertical stem, sudden stop and turn back towards QB',
    depthYards: 5,
    directionDefault: 'straight',
    generatePoints: (startX, startY, opt) => {
      const stemLength = opt?.depth === 'deep' ? 70 : opt?.depth === 'short' ? 30 : 45;
      const turnSide = opt?.direction === 'left' ? -10 : opt?.direction === 'right' ? 10 : (startX > 400 ? -8 : 8);
      return [
        { x: startX, y: startY - stemLength },
        { x: startX + turnSide, y: startY - stemLength + 10 }
      ];
    }
  },
  {
    id: '1_flat',
    number: '1',
    name: 'Quick Flat / Arrow',
    category: 'core_tree',
    shortDesc: 'Quick 3-yd sprint to the outside sideline for fast yardage',
    depthYards: 3,
    directionDefault: 'out',
    generatePoints: (startX, startY, opt) => {
      const isRight = opt?.direction === 'right' ? true : opt?.direction === 'left' ? false : (startX > 400);
      const dx = isRight ? 60 : -60;
      return [
        { x: startX + (dx * 0.4), y: startY - 15 },
        { x: startX + dx, y: startY - 25 }
      ];
    }
  },
  {
    id: '2_slant',
    number: '2',
    name: 'Quick Slant',
    category: 'core_tree',
    shortDesc: '3 steps vertical stem, sharp 45° diagonal cut across the middle',
    depthYards: 5,
    directionDefault: 'in',
    generatePoints: (startX, startY, opt) => {
      // Slant usually breaks inside towards center (x=400)
      const toInside = opt?.direction === 'inside' || (opt?.direction !== 'left' && opt?.direction !== 'right');
      const isRight = opt?.direction === 'right' ? true : opt?.direction === 'left' ? false : (toInside ? startX < 400 : startX > 400);
      const stem = opt?.depth === 'deep' ? 50 : opt?.depth === 'short' ? 25 : 35;
      const slantDist = opt?.depth === 'deep' ? 100 : opt?.depth === 'short' ? 50 : 75;
      const dx = isRight ? slantDist : -slantDist;
      return [
        { x: startX, y: startY - stem },
        { x: startX + dx, y: startY - stem - (slantDist * 0.7) }
      ];
    }
  },
  {
    id: '3_quick_out',
    number: '3',
    name: 'Quick Out',
    category: 'core_tree',
    shortDesc: '5-yd vertical stem, crisp 90° square break to the sideline',
    depthYards: 5,
    directionDefault: 'out',
    generatePoints: (startX, startY, opt) => {
      const isRight = opt?.direction === 'right' ? true : opt?.direction === 'left' ? false : (startX > 400);
      const stem = opt?.depth === 'deep' ? 60 : opt?.depth === 'short' ? 30 : 45;
      const dx = isRight ? 65 : -65;
      return [
        { x: startX, y: startY - stem },
        { x: startX + dx, y: startY - stem }
      ];
    }
  },
  {
    id: '4_in_dig',
    number: '4',
    name: 'In / Dig',
    category: 'core_tree',
    shortDesc: '10-12 yd vertical stem, square 90° break crossing the field',
    depthYards: 10,
    directionDefault: 'in',
    generatePoints: (startX, startY, opt) => {
      const isRight = opt?.direction === 'right' ? true : opt?.direction === 'left' ? false : (startX < 400);
      const stem = opt?.depth === 'deep' ? 110 : opt?.depth === 'short' ? 60 : 85;
      const dx = isRight ? 90 : -90;
      return [
        { x: startX, y: startY - stem },
        { x: startX + dx, y: startY - stem }
      ];
    }
  },
  {
    id: '5_deep_out',
    number: '5',
    name: 'Deep Out / Speed Out',
    category: 'core_tree',
    shortDesc: '10-12 yd deep stem, hard 90° break towards the boundary sideline',
    depthYards: 12,
    directionDefault: 'out',
    generatePoints: (startX, startY, opt) => {
      const isRight = opt?.direction === 'right' ? true : opt?.direction === 'left' ? false : (startX > 400);
      const stem = opt?.depth === 'deep' ? 120 : opt?.depth === 'short' ? 70 : 95;
      const dx = isRight ? 80 : -80;
      return [
        { x: startX, y: startY - stem },
        { x: startX + dx, y: startY - stem }
      ];
    }
  },
  {
    id: '6_comeback',
    number: '6',
    name: 'Comeback / Curl',
    category: 'core_tree',
    shortDesc: '12-14 yd deep stem, hard 45° angle back toward sideline & QB',
    depthYards: 14,
    directionDefault: 'out',
    generatePoints: (startX, startY, opt) => {
      const isRight = opt?.direction === 'right' ? true : opt?.direction === 'left' ? false : (startX > 400);
      const stem = opt?.depth === 'deep' ? 130 : opt?.depth === 'short' ? 80 : 105;
      const dx = isRight ? 35 : -35;
      return [
        { x: startX, y: startY - stem },
        { x: startX + dx, y: startY - stem + 25 }
      ];
    }
  },
  {
    id: '7_corner',
    number: '7',
    name: 'Corner / Flag',
    category: 'core_tree',
    shortDesc: '10-12 yd stem, sharp 45° break toward the corner pylon',
    depthYards: 12,
    directionDefault: 'out',
    generatePoints: (startX, startY, opt) => {
      const isRight = opt?.direction === 'right' ? true : opt?.direction === 'left' ? false : (startX > 400);
      const stem = opt?.depth === 'deep' ? 110 : opt?.depth === 'short' ? 65 : 85;
      const dx = isRight ? 80 : -80;
      return [
        { x: startX, y: startY - stem },
        { x: startX + dx, y: startY - stem - 60 }
      ];
    }
  },
  {
    id: '8_post',
    number: '8',
    name: 'Post / Deep Post',
    category: 'core_tree',
    shortDesc: '10-12 yd vertical stem, sharp 45° break toward the center goalpost',
    depthYards: 12,
    directionDefault: 'in',
    generatePoints: (startX, startY, opt) => {
      const isRight = opt?.direction === 'right' ? true : opt?.direction === 'left' ? false : (startX < 400);
      const stem = opt?.depth === 'deep' ? 110 : opt?.depth === 'short' ? 65 : 85;
      const dx = isRight ? 80 : -80;
      return [
        { x: startX, y: startY - stem },
        { x: startX + dx, y: startY - stem - 65 }
      ];
    }
  },
  {
    id: '9_go_fly',
    number: '9',
    name: 'Go / Fly / Streak',
    category: 'core_tree',
    shortDesc: 'Straight vertical sprint stretching the defense deep downfield',
    depthYards: 25,
    directionDefault: 'straight',
    generatePoints: (startX, startY, opt) => {
      const length = opt?.depth === 'deep' ? 220 : opt?.depth === 'short' ? 120 : 170;
      return [
        { x: startX, y: Math.max(30, startY - length) }
      ];
    }
  },
  // --- SPECIALTY ROUTES ---
  {
    id: 'spec_drag',
    name: 'Drag / Shallow Cross',
    category: 'specialty',
    shortDesc: 'Underneath shallow crossing route 2-3 yards over scrimmage',
    depthYards: 3,
    directionDefault: 'in',
    generatePoints: (startX, startY, opt) => {
      const isRight = opt?.direction === 'right' ? true : opt?.direction === 'left' ? false : (startX < 400);
      const dx = isRight ? 180 : -180;
      return [
        { x: startX + (isRight ? 20 : -20), y: startY - 25 },
        { x: startX + dx, y: startY - 35 }
      ];
    }
  },
  {
    id: 'spec_wheel',
    name: 'Wheel Route',
    category: 'specialty',
    shortDesc: 'Burst into the flat then snap vertical up the sideline',
    depthYards: 18,
    directionDefault: 'out',
    generatePoints: (startX, startY, opt) => {
      const isRight = opt?.direction === 'right' ? true : opt?.direction === 'left' ? false : (startX > 400);
      const dx = isRight ? 60 : -60;
      return [
        { x: startX + (dx * 0.5), y: startY - 15 },
        { x: startX + dx, y: startY - 30 },
        { x: startX + dx, y: Math.max(40, startY - 180) }
      ];
    }
  },
  {
    id: 'spec_whip_pivot',
    name: 'Whip / Pivot Route',
    category: 'specialty',
    shortDesc: 'Fake inside slant 3-yds, hard plant step and reverse back outside',
    depthYards: 4,
    directionDefault: 'custom',
    generatePoints: (startX, startY, opt) => {
      const isRight = opt?.direction === 'right' ? true : opt?.direction === 'left' ? false : (startX > 400);
      const insideDx = isRight ? -30 : 30;
      const outsideDx = isRight ? 50 : -50;
      return [
        { x: startX, y: startY - 25 },
        { x: startX + insideDx, y: startY - 35 },
        { x: startX + outsideDx, y: startY - 40 }
      ];
    }
  },
  {
    id: 'spec_texas_angle',
    name: 'Texas / Angle Route',
    category: 'backfield',
    shortDesc: 'Backfield track to the flat, sharp 45° cut back inside between LBs',
    depthYards: 6,
    directionDefault: 'in',
    generatePoints: (startX, startY, opt) => {
      const isRight = opt?.direction === 'right' ? true : opt?.direction === 'left' ? false : (startX > 400);
      const outDx = isRight ? 40 : -40;
      const inDx = isRight ? -50 : 50;
      return [
        { x: startX + outDx, y: startY - 20 },
        { x: startX + outDx + inDx, y: startY - 75 }
      ];
    }
  },
  {
    id: 'spec_out_and_up',
    name: 'Out-and-Up / Chair',
    category: 'specialty',
    shortDesc: 'Hard 5-yd out cut fake, sudden vertical burst up the boundary',
    depthYards: 20,
    directionDefault: 'out',
    generatePoints: (startX, startY, opt) => {
      const isRight = opt?.direction === 'right' ? true : opt?.direction === 'left' ? false : (startX > 400);
      const dx = isRight ? 45 : -45;
      return [
        { x: startX, y: startY - 45 },
        { x: startX + dx, y: startY - 45 },
        { x: startX + dx, y: Math.max(40, startY - 180) }
      ];
    }
  },
  {
    id: 'spec_post_corner',
    name: 'Post-Corner Double Move',
    category: 'specialty',
    shortDesc: 'Deep post stem fake to freeze the safety, cut out to corner',
    depthYards: 16,
    directionDefault: 'out',
    generatePoints: (startX, startY, opt) => {
      const isRight = opt?.direction === 'right' ? true : opt?.direction === 'left' ? false : (startX > 400);
      const inDx = isRight ? -30 : 30;
      const outDx = isRight ? 60 : -60;
      return [
        { x: startX, y: startY - 75 },
        { x: startX + inDx, y: startY - 100 },
        { x: startX + outDx, y: Math.max(30, startY - 160) }
      ];
    }
  },
  {
    id: 'spec_mesh_cross',
    name: 'Mesh Cross Underneath',
    category: 'specialty',
    shortDesc: 'Tight 4-5 yard shallow drag to rub opposing defensive back',
    depthYards: 4,
    directionDefault: 'in',
    generatePoints: (startX, startY, opt) => {
      const isRight = opt?.direction === 'right' ? true : opt?.direction === 'left' ? false : (startX < 400);
      const dx = isRight ? 240 : -240;
      return [
        { x: startX, y: startY - 35 },
        { x: startX + dx, y: startY - 40 }
      ];
    }
  },
  {
    id: 'spec_bubble_screen',
    name: 'Bubble Screen',
    category: 'specialty',
    shortDesc: 'Step back parallel behind scrimmage, catch in space with lead blocks',
    depthYards: -2,
    directionDefault: 'out',
    generatePoints: (startX, startY, opt) => {
      const isRight = opt?.direction === 'right' ? true : opt?.direction === 'left' ? false : (startX > 400);
      const dx = isRight ? 35 : -35;
      return [
        { x: startX + (dx * 0.5), y: startY + 12 },
        { x: startX + dx, y: startY + 5 }
      ];
    }
  },
  {
    id: 'spec_block_screen',
    name: 'Block / Stalk Screen',
    category: 'specialty',
    shortDesc: 'Fire 3 yards upfield and seal defensive back to the outside',
    depthYards: 3,
    directionDefault: 'straight',
    generatePoints: (startX, startY) => {
      return [
        { x: startX, y: startY - 25 },
        { x: startX + (startX > 400 ? -15 : 15), y: startY - 30 }
      ];
    }
  }
];

export const PASSING_CONCEPTS_PRESETS: PassingConcept[] = [
  {
    id: 'mesh_5v5',
    name: '5v5 Mesh Underneath',
    sport: 'flag_5v5',
    description: 'High-percentage dual crossing routes creating natural defensive rub underneath.',
    badge: 'Popular 5v5',
    playerRoutes: {
      wr1: { routeId: '7_corner', direction: 'left', depth: 'medium' },
      wr2: { routeId: '4_in_dig', direction: 'left', depth: 'deep' },
      slot: { routeId: 'spec_mesh_cross', direction: 'right', depth: 'short' },
      c: { routeId: 'spec_mesh_cross', direction: 'left', depth: 'short' },
      qb: { routeId: '0_hitch' }
    }
  },
  {
    id: 'flood_5v5',
    name: '5v5 Flood / Sail Overload',
    sport: 'flag_5v5',
    description: '3-level sideline overload with deep go, 10-yd out, and quick flat.',
    badge: 'Zone Buster',
    playerRoutes: {
      wr1: { routeId: '9_go_fly', depth: 'deep' },
      slot: { routeId: '3_quick_out', direction: 'left', depth: 'medium' },
      c: { routeId: '1_flat', direction: 'left', depth: 'short' },
      wr2: { routeId: '4_in_dig', direction: 'left', depth: 'deep' },
      qb: { routeId: '0_hitch' }
    }
  },
  {
    id: 'smash_5v5',
    name: '5v5 Smash (Corner + Hitch)',
    sport: 'flag_5v5',
    description: 'Classic Cover 2 beater pairing an outside 5-yd hitch with an inside corner.',
    badge: 'Cover 2 Beater',
    playerRoutes: {
      wr1: { routeId: '0_hitch', depth: 'short' },
      slot: { routeId: '7_corner', direction: 'left', depth: 'medium' },
      wr2: { routeId: '8_post', direction: 'left', depth: 'deep' },
      c: { routeId: '1_flat', direction: 'right', depth: 'short' },
      qb: { routeId: '0_hitch' }
    }
  },
  {
    id: 'drive_shallow_5v5',
    name: '5v5 Drive (Dig + Drag)',
    sport: 'flag_5v5',
    description: 'High-low read over the middle with a 10-yd Dig and shallow Drag.',
    badge: 'Man & Zone',
    playerRoutes: {
      wr1: { routeId: 'spec_drag', direction: 'right', depth: 'short' },
      slot: { routeId: '4_in_dig', direction: 'right', depth: 'medium' },
      wr2: { routeId: '9_go_fly', depth: 'deep' },
      c: { routeId: '0_hitch', depth: 'short' },
      qb: { routeId: '0_hitch' }
    }
  },
  {
    id: 'verts_5v5',
    name: '5v5 4-Verticals / Seams',
    sport: 'flag_5v5',
    description: 'All receivers attack vertical seams to stress deep safety coverage.',
    badge: 'Deep Attack',
    playerRoutes: {
      wr1: { routeId: '9_go_fly', depth: 'deep' },
      slot: { routeId: '9_go_fly', depth: 'deep' },
      c: { routeId: '0_hitch', depth: 'short' },
      wr2: { routeId: '9_go_fly', depth: 'deep' },
      qb: { routeId: '0_hitch' }
    }
  },
  // --- 7v7 CONCEPTS ---
  {
    id: 'y_cross_7v7',
    name: '7v7 Y-Cross (Air Raid)',
    sport: 'flag_7v7',
    description: 'Air Raid staple: Y crosses field at 12 yds, X runs deep Post, H attacks flat.',
    badge: 'Air Raid',
    playerRoutes: {
      x: { routeId: '8_post', direction: 'right', depth: 'deep' },
      y: { routeId: '4_in_dig', direction: 'right', depth: 'deep' },
      z: { routeId: '9_go_fly', depth: 'deep' },
      h: { routeId: '1_flat', direction: 'right', depth: 'short' },
      c: { routeId: '0_hitch', depth: 'short' },
      rb: { routeId: 'spec_texas_angle', direction: 'left', depth: 'medium' },
      qb: { routeId: '0_hitch' }
    }
  },
  {
    id: 'snag_triangle_7v7',
    name: '7v7 Snag / Triangle',
    sport: 'flag_7v7',
    description: 'Creates a 3-man triangle read on the boundary (Corner, Snag, Flat).',
    badge: 'Quick Rhythm',
    playerRoutes: {
      x: { routeId: '7_corner', direction: 'left', depth: 'medium' },
      y: { routeId: '0_hitch', direction: 'inside', depth: 'short' },
      h: { routeId: '1_flat', direction: 'left', depth: 'short' },
      z: { routeId: '8_post', direction: 'left', depth: 'deep' },
      c: { routeId: 'spec_drag', direction: 'right', depth: 'short' },
      rb: { routeId: 'spec_texas_angle', direction: 'right', depth: 'short' },
      qb: { routeId: '0_hitch' }
    }
  },
  {
    id: 'mesh_7v7',
    name: '7v7 Double Mesh & Wheel',
    sport: 'flag_7v7',
    description: 'Underneath mesh crossers paired with an outside wheel and backside dig.',
    badge: 'Pro 7v7',
    playerRoutes: {
      x: { routeId: '7_corner', direction: 'left', depth: 'medium' },
      y: { routeId: 'spec_mesh_cross', direction: 'right', depth: 'short' },
      h: { routeId: 'spec_mesh_cross', direction: 'left', depth: 'short' },
      z: { routeId: '4_in_dig', direction: 'left', depth: 'deep' },
      rb: { routeId: 'spec_wheel', direction: 'right', depth: 'deep' },
      c: { routeId: '0_hitch', depth: 'short' },
      qb: { routeId: '0_hitch' }
    }
  },
  {
    id: 'levels_7v7',
    name: '7v7 Levels (Hi-Lo In-Routes)',
    sport: 'flag_7v7',
    description: 'Dual in-breaking routes at 5 yds and 10 yds stressing middle zone defenders.',
    badge: 'Middle Read',
    playerRoutes: {
      x: { routeId: '4_in_dig', direction: 'right', depth: 'deep' },
      y: { routeId: '3_quick_out', direction: 'right', depth: 'short' },
      z: { routeId: '9_go_fly', depth: 'deep' },
      h: { routeId: '1_flat', direction: 'right', depth: 'short' },
      c: { routeId: '0_hitch', depth: 'short' },
      rb: { routeId: 'spec_texas_angle', direction: 'left', depth: 'short' },
      qb: { routeId: '0_hitch' }
    }
  }
];
