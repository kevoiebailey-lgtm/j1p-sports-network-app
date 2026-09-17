export type SportType = 
  | 'football' 
  | 'flag_football' 
  | 'basketball' 
  | 'soccer' 
  | 'lacrosse' 
  | 'field_hockey' 
  | 'cheer' 
  | 'wrestling' 
  | 'track_field';

export type TournamentMode = 
  | 'pool_to_bracket'      // Soccer, Lacrosse, Hoops, Field Hockey, Flag Football
  | 'showcase_jamboree'    // HS/College Football Jamborees, Showcases, Friendlies
  | 'performance_scored'   // Cheerleading, Dance, Gymnastics
  | 'mat_or_flight';       // Wrestling, Martial Arts, Track & Field

export interface StationLocation {
  id: string;
  name: string; // e.g., "Field 1", "Court 3", "Mat 4", "Main Floor Arena"
  status: 'idle' | 'live' | 'warmup' | 'delayed';
  currentMatchId?: string;
  sport?: SportType;
}

export interface RubricScoreItem {
  difficulty: number;
  execution: number;
  deductions: number;
  total: number;
  stunts?: number;
  pyramids?: number;
  tumbling?: number;
  judgeNotes?: string;
}

export interface UniversalScheduleItem {
  id: string;
  tournamentId: string;
  stationName: string;
  startTime: string;
  division: string;
  entityA: string; // Team 1, Squad, or Athlete A
  entityB?: string; // Team 2, Opponent, or Athlete B (optional for Cheer/Dance)
  scoreA?: number;
  scoreB?: number;
  rubricScores?: RubricScoreItem;
  status: 'scheduled' | 'on_deck' | 'in_progress' | 'final';
  sport?: SportType;
  quarterOrPeriod?: string;
  clockTime?: string;
  possession?: 'entityA' | 'entityB' | null;
  weightClass?: string;
  round?: string;
}

export interface TournamentEngineConfig {
  id: string;
  name: string;
  sport: SportType;
  mode: TournamentMode;
  stations: StationLocation[];
  divisions: string[];
  schedule: UniversalScheduleItem[];
}
