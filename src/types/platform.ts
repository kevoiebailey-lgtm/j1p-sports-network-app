export type UserRole = 'member' | 'athlete' | 'coach' | 'scout' | 'director' | 'creator' | 'viewer' | 'fan' | 'admin';
export type AppRole = UserRole | 'member' | 'organization' | 'coach_scout' | 'tournament_director' | 'content_creator' | 'media_creator';

export interface UserDoc {
  uid: string;
  role: AppRole | string;
  displayName: string;
  email: string;
  avatarUrl: string;
  roleLocked?: boolean;
  profileLocked?: boolean;
  hasCompletedOnboarding?: boolean;
  profileCompleted?: boolean;
  sport?: string;
  organization?: string;
  brandName?: string;
  mediaSpecialization?: string;
  programLevel?: string;
  coachTitle?: string;
  scoutingCoverage?: string;
  orgType?: string;
  ageDivisions?: string;
  favoriteTeams?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AthleteMetrics {
  height: string;
  weight: string;
  dash40: number; // in seconds (e.g. 4.42)
  vertLeap?: number; // in inches (e.g. 36.5)
  gpa: number; // e.g. 3.85
  satAct?: string; // e.g. "SAT 1280"
  ncaaId?: string;
  verified: boolean;
  benchPress?: number;
  shuttle?: number;
}

export interface VideoClip {
  id: string;
  title: string;
  url: string;
  provider: 'youtube' | 'vimeo' | 'hudl' | 'instagram' | 'tiktok' | 'mp4' | 'other';
  tag: string; // e.g. '#TD', '#Pick6', '#Dunk', '#Highlights', '#Defense', '#Shooting'
  thumbnailUrl?: string;
  embedUrl?: string;
  duration?: string;
  views?: number;
  isVertical?: boolean;
  description?: string;
  createdAt: string;
}

export interface AthleteDoc {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string;
  position: string;
  jerseyNumber: string;
  gradYear: number;
  school: string;
  cityState: string;
  sport: string;
  metrics: AthleteMetrics;
  mediaUrls: VideoClip[];
  waiverSigned: boolean;
  teamName: string;
  bio?: string;
  nextGame?: {
    gameId: string;
    tournamentName: string;
    opponent: string;
    opponentLogo?: string;
    scheduledTime: string; // ISO string
    court: string;
    arrivalTime: string;
    venueName: string;
    venueAddress: string;
    status: 'Upcoming' | 'Warmup' | 'Live' | 'Final';
  };
  seasonStats: {
    gamesPlayed: number;
    pointsOrYards: number;
    assistsOrTackles: number;
    rating: number;
  };
}

export interface ScoutDoc {
  id: string;
  userId: string;
  displayName: string;
  organization: string; // College, Academy, or Agency
  title: string;
  avatarUrl: string;
  verified: boolean;
  badgeLevel: 'NCAA D1' | 'NCAA D2' | 'Pro Scout' | 'Certified Club';
  watchlist: string[]; // athleteIds
  targetPositions: string[];
  targetGradYears: number[];
  notesCount: number;
}

export interface ScoutingNoteDoc {
  id: string;
  scoutId: string;
  athleteId: string;
  athleteName: string;
  athletePosition: string;
  athleteGradYear: number;
  rating: number; // 1 to 5 stars
  notes: string;
  tags: string[]; // e.g. 'High Motor', 'Elite Speed', 'D1 Prospect'
  recommendation: 'Must Sign' | 'Strong Watch' | 'Developmental' | 'Pass';
  updatedAt: string;
}

export interface TournamentGameDoc {
  id: string;
  tournamentId: string;
  courtId: string;
  courtName: string;
  scheduledTime: string;
  homeTeam: string;
  homeTeamLogo?: string;
  homeTeamSeed?: number;
  awayTeam: string;
  awayTeamLogo?: string;
  awayTeamSeed?: number;
  homeScore: number;
  awayScore: number;
  period: string; // e.g. "1st Half", "2nd Half", "Q4", "OT", "Final"
  clock: string; // e.g. "06:42"
  isClockRunning: boolean;
  status: 'Upcoming' | 'Warmup' | 'Live' | 'Halftime' | 'Final';
  referee?: string;
  featuredAthleteIds?: string[];
  disputes?: string[];
  division: string;
}

export interface TournamentAnnouncement {
  id: string;
  text: string;
  timestamp: string;
  urgent: boolean;
  author: string;
}

export interface TournamentDoc {
  id: string;
  directorId: string;
  title: string;
  sport: string;
  venue: {
    name: string;
    address: string;
    courtsCount: number;
  };
  status: 'upcoming' | 'live' | 'completed';
  delayMinutes: number;
  delayReason?: string;
  announcements: TournamentAnnouncement[];
  divisions: string[];
  teamsCount: number;
  totalRevenue: number;
  pendingWaiversCount: number;
}

export interface PoolStanding {
  teamName: string;
  pool: string;
  wins: number;
  losses: number;
  pointDiff: number;
  seed: number;
  waiverPercent: number;
}

export interface WaiverRecord {
  id: string;
  athleteName: string;
  teamName: string;
  parentName: string;
  parentEmail: string;
  signedAt: string;
  status: 'Signed' | 'Pending' | 'Flagged';
  documentUrl?: string;
}

export type SeasonStatus = 'UPCOMING' | 'ACTIVE' | 'COMPLETED';
export type GameStatus = 'SCHEDULED' | 'LIVE' | 'FINAL';
export type GameType = 'REGULAR_SEASON' | 'PLAYOFF' | 'TOURNAMENT';

export interface SeasonDoc {
  id: string;
  title: string;
  sport: string; // e.g. 'FOOTBALL', 'BASKETBALL', 'SOCCER', '7v7', 'VOLLEYBALL'
  organizationId: string;
  startDate: string;
  endDate: string;
  status: SeasonStatus;
  divisions: string[];
  flyerUrl?: string;
  settings?: {
    gameDurationMinutes?: number;
    bufferMinutes?: number;
    totalWeeks?: number;
    rounds?: number;
    playoffTeamsPerDivision?: number;
    pointsPerWin?: number;
    pointsPerTie?: number;
    fieldsAvailable?: string[];
    [key: string]: any;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface SeasonTeamDoc {
  id: string;
  seasonId: string;
  name: string;
  headCoach: string;
  coachEmail?: string;
  coachPhone?: string;
  division: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  pointsDiff: number;
  streak: string;
  logoUrl?: string;
  rosterCount?: number;
}

export interface GameDoc {
  id: string;
  seasonId: string;
  tournamentId?: string;
  weekNumber: number;
  date: any; // Firestore Timestamp or ISO Date string
  startTime?: string;
  endTime?: string;
  homeTeam: string;
  homeTeamId: string;
  homeScore: number;
  awayTeam: string;
  awayTeamId: string;
  awayScore: number;
  venue: string;
  courtOrField: string;
  status: GameStatus;
  gameType: GameType;
  division?: string;
  coachA?: string;
  coachB?: string;
  period?: string;
  clock?: string;
  referee?: string;
  createdAt?: string;
  updatedAt?: string;
}

