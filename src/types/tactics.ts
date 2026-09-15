export type SportCategory = 'flag_5v5' | 'flag_7v7' | 'tackle_11v11' | 'defense';

export type RouteNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type RouteDepthLevel = 'short' | 'medium' | 'deep';

export type ReadProgressionNumber = 1 | 2 | 3;

export type RouteEndMarker = 'arrow' | 'curl' | 't-cap' | 'none';

export interface RouteTreeOption {
  number: RouteNumber;
  name: string;
  category: 'in_breaking' | 'out_breaking' | 'vertical' | 'underneath' | 'blocking';
  depthYards: number;
  description: string;
  defaultCutDirection: 'left' | 'right' | 'straight' | 'custom';
  stemLength: number; // in field units
  breakVector: { dx: number; dy: number };
}

export interface TacticalPlayer {
  id: string;
  label: string; // e.g., 'QB', 'X', 'Z', 'Y', 'H', 'C', 'RB', 'LT', 'RT'
  positionGroup: 'QB' | 'WR' | 'RB' | 'TE' | 'OL' | 'ATH' | 'C';
  x: number; // Field coordinate (0 - 800)
  y: number; // Field coordinate (0 - 500), scrimmage usually ~350
  routeNumber?: RouteNumber;
  routeName?: string;
  routeDepth?: RouteDepthLevel;
  routeDepthYards?: number;
  readProgression?: ReadProgressionNumber | null;
  routePoints: { x: number; y: number }[];
  svgPathD?: string;
  endMarker?: RouteEndMarker;
  isEligibleReceiver: boolean;
  color?: string;
  assignmentNote?: string;
  motion?: {
    enabled: boolean;
    type: 'jet' | 'orbit' | 'shift';
    targetX: number;
    targetY: number;
  };
  beatsCoverage?: string[]; // e.g. ["Cover 1", "Cover 2", "Cover 3", "Zero Blitz"]
}

export type OpponentCoverageKey = 'off' | 'cover_1_man' | 'cover_2_zone' | 'cover_3_zone' | 'zero_blitz';

export type TackleFormationPreset = '11v11_Spread_2x2' | '11v11_Trips_Open' | '11v11_Pistol' | '11v11_I_Form' | 'Spread' | 'Trips' | 'Bunch' | 'I-Form';
export type FlagFormationPreset = '5v5_Spread' | '5v5_Bunch' | '5v5_Trips' | '5v5_Empty' | '7v7_Spread' | '7v7_Trips' | '7v7_Bunch' | '7v7_Empty' | '7v7_Pro';
export type FormationPresetKey = TackleFormationPreset | FlagFormationPreset;

export interface FormationShell {
  key: string;
  name: string;
  category: SportCategory;
  description: string;
  personnel: string;
  players: TacticalPlayer[];
}

export interface PlayTactics {
  id: string;
  name: string;
  formation: string;
  category: SportCategory;
  signalCode: string; // e.g. "HAWK-82", "COUGAR-RED", "42-TEXAS"
  audibleColor?: string; // e.g. "RED", "BLUE", "GREEN", "GOLD"
  cadence?: string; // e.g. "ON TWO", "SOUND", "FREEZE"
  scrimmageY: number; // default 350
  players: TacticalPlayer[];
  notes?: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
  authorId?: string;
}

export interface LiveCalloutTelemetry {
  playId: string;
  playName: string;
  formation: string;
  signalCode: string;
  audibleColor?: string;
  cadence?: string;
  timestamp: number;
  playState?: 'LIVE' | 'DEAD';
  assignments?: Record<string, string>; // e.g. { "WR1": "8: Go Route (25yd)", "QB": "Snap & Roll Right" }
  callerUid?: string;
  callerName?: string;
  teamId: string;
  activePersonnel?: string;
  category?: SportCategory;
  tacticalIfThen?: string;
  playMode?: 'offense' | 'defense';
  progressionReads?: { readNumber: 1 | 2 | 3; player: string; routeType: string }[];
}

export interface PlayCallPayload {
  playId: string;
  playName: string;
  formation: string;
  signalCode: string;
  audibleColor?: string;
  cadence?: string;
  timestamp?: number;
  playState?: 'LIVE' | 'DEAD';
  assignments?: Record<string, string>;
  activePersonnel?: string;
  category?: SportCategory;
  callerUid?: string;
  callerName?: string;
  tacticalIfThen?: string;
  playMode?: 'offense' | 'defense';
  progressionReads?: { readNumber: 1 | 2 | 3; player: string; routeType: string }[];
}

export interface WristbandSlot {
  slotNumber: number; // 1 to 12
  signalCode: string;
  playName: string;
  formation: string;
  colorBadge: string;
  qbRead: string;
  primaryTarget: string;
  assignments: Record<string, string>;
  tacticalIfThen?: string;
  playMode?: 'offense' | 'defense';
}

export type DefensePresetKey = 'Cover 2' | 'Cover 3' | 'Cover 1 Man-Free' | '1-Rusher Spy';

export type DefensivePlayerToken = 'R' | 'MLB' | 'LCB' | 'RCB' | 'FS';

export interface DefensivePlayer {
  id: string;
  label: DefensivePlayerToken;
  name: string; // e.g., 'Rusher (7yd)', 'Middle Linebacker', 'Left Corner', 'Right Corner', 'Free Safety'
  x: number;
  y: number;
  role: 'rusher' | 'linebacker' | 'corner' | 'safety';
  coverageType?: 'zone' | 'man' | 'blitz' | 'spy';
  zoneType?: 'Hook' | 'Flat' | 'Deep Half' | 'Deep Third' | 'QB Spy';
  manTarget?: string; // e.g. 'X', 'Z', 'H', 'C', 'QB'
  isBlitzing?: boolean;
}

export type ZoneCoverageType = 'Hook' | 'Flat' | 'Deep Half' | 'Deep Third' | 'QB Spy';

export interface DefensiveZoneArea {
  id: string;
  name: ZoneCoverageType;
  x: number; // Center X
  y: number; // Center Y
  width: number;
  height: number;
  color: string;
  assignedPlayer?: string;
}

export interface DefensiveBlitzArrow {
  id: string;
  fromPlayer: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color?: string;
}

export interface DefensiveManLockLink {
  id: string;
  defenderLabel: string;
  receiverLabel: string;
}

export type PlayLabFormation = "Spread" | "Trips" | "Stack";
export type PlayLabCategory = "Spread" | "Bunch" | "Red Zone" | "Run" | "Man/Zone Beater" | "Defense";
export type PlayLabFormat = "5v5" | "7v7" | "11v11";
export type PlayLabPlayerToken = "QB" | "C" | "X" | "H" | "Z";

export interface PlayLabRoute {
  player: "QB" | "C" | "X" | "H" | "Z" | string;
  coordinates: { x: number; y: number }[]; // Vector stem points
  routeType: string;
  isPrimary?: boolean;
  readProgression?: 1 | 2 | 3 | null;
  beatsCoverage?: string[];
}

export interface PlayLabPlay {
  id?: string;
  userId: string;              // UID of the coach/creator
  name: string;                // e.g., "Fil Fly"
  formation: "Spread" | "Trips" | "Stack" | string;
  category?: "Spread" | "Bunch" | "Red Zone" | "Run" | "Man/Zone Beater" | "Screen" | "Blitz Beater" | "RPO / Screen" | "Trick / Run" | "Option / Pass" | "Run / Option" | "Man Beater" | "Zone Beater" | "High-Low" | "Goal Line" | "Defense" | string;
  format: "5v5" | "7v7" | "11v11" | string;
  isPublic: boolean;           // Default: false (Private)
  sharedTeams?: string[];      // IDs of teams allowed to view on wristband HUD
  sharedWithTeamIds?: string[];// Alias for compatibility
  slotIndex?: number;          // 1 to 12 for 12-Slot Call Sheet
  conceptNote?: string;        // Quick tactical explanation
  tacticalIfThen?: string;     // e.g. "If Press Man -> Target Read 1 (Mesh/Rub)"
  playMode?: 'offense' | 'defense'; // Top-level Offense or Defense mode
  defensePreset?: DefensePresetKey | string;
  defenseZones?: DefensiveZoneArea[];
  blitzArrows?: DefensiveBlitzArrow[];
  manLockLinks?: DefensiveManLockLink[];
  routes: {
    player: "QB" | "C" | "X" | "H" | "Z" | string;
    coordinates: { x: number; y: number }[]; // Vector stem points
    routeType: string;
    isPrimary?: boolean;
    readProgression?: 1 | 2 | 3 | null;
    color?: string;            // Custom stem color
    isMotion?: boolean;        // Pre-snap motion stem
    strokeDasharray?: string;  // Dashed stroke
    beatsCoverage?: string[];  // e.g. ["Cover 1", "Cover 2"]
  }[];
  cadence?: string;
  audibleColor?: string;
  signalCode?: string;
  wristbandCode?: string;
  notes?: string;
  createdAt: number;
  updatedAt?: number;
}

