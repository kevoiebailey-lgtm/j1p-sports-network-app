export type SportType = 'flag_5v5' | 'flag_7v7' | 'football_11v11' | 'basketball' | 'soccer' | 'lacrosse';
export type TokenShape = 'circle' | 'cross' | 'square';

export type ProgressionRead = 'none' | '1' | '2' | '3' | '4' | 'hot' | 'checkdown' | 'clearout';

export type BlockingType = 'none' | 'pass_pro_bob' | 'slide_left' | 'slide_right' | 'pull_left' | 'pull_right' | 'chip_release' | 'cut_block' | 'lead_block';

export interface PreSnapMotion {
  enabled: boolean;
  type: 'jet_across' | 'orbit_back' | 'slot_shift' | 'return_motion' | 'custom';
  waypoints: { x: number; y: number }[];
  snapPoint?: { x: number; y: number };
}

export interface PlayerNode {
  id: string;
  label: string;
  role: 'offense' | 'defense' | 'cone';
  shape: TokenShape;
  color: string;
  x: number; // 0 - 800 SVG coordinates
  y: number; // 0 - 500 SVG coordinates
  route: { x: number; y: number }[];
  progression?: ProgressionRead;
  blocking?: BlockingType;
  preSnapMotion?: PreSnapMotion;
  customNote?: string;
  assignedRoute?: string;
  readOrder?: string;
}

export type DefenseCoverageType = 'cover_0' | 'cover_1' | 'cover_2' | 'cover_3' | 'cover_4' | 'cover_6';

export interface CoverageDiagnostic {
  coverage: DefenseCoverageType;
  name: string;
  shortDescription: string;
  ratingGrade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D';
  advantage: 'offense' | 'neutral' | 'defense';
  summary: string;
  keyTargetId?: string;
  conflictDefender: string;
  coachingTip: string;
  hotReadRecommendation?: string;
}

export interface PlaybookCardData {
  id: string;
  title: string;
  sport: SportType;
  description: string;
  personnel: string;
  formation: string;
  passProtection: string;
  players: PlayerNode[];
  authorName?: string;
}

export interface PlayLabPlay {
  id?: string;
  userId: string;              // UID of the coach/creator
  name: string;                // e.g., "Fil Fly"
  formation: "Spread" | "Trips" | "Stack";
  category: "Spread" | "Bunch" | "Red Zone" | "Run" | "Man/Zone Beater";
  format: "5v5" | "7v7" | "11v11";
  isPublic: boolean;           // Default: false (Private)
  sharedWithTeamIds?: string[];// Optional: IDs of teams allowed to view on wristband HUD
  routes: {
    player: "QB" | "C" | "X" | "H" | "Z";
    coordinates: { x: number; y: number }[]; // Vector stem points
    routeType: string;
    isPrimary?: boolean;
  }[];
  notes?: string;
  createdAt: number;
}
