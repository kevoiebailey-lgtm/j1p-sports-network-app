import { Timestamp, FieldValue } from 'firebase/firestore';
import type { SportType, GameStatus } from '../types';

// ============================================================================
// FIRESTORE COLLECTION PATH CONSTANTS
// ============================================================================

export const FIRESTORE_COLLECTIONS = {
  EVENTS: 'events',
  DIVISIONS: 'divisions',
  TEAMS: 'teams',
  BRACKETS: 'brackets',
  GAMES: 'games',
  VENUES: 'venues',
  USERS: 'users',
  PLAYERS: 'players',
  CHECK_INS: 'checkIns',
  WAIVERS: 'waivers',
  MEDIA_BOOKINGS: 'mediaBookings',
  LIVE_STREAMS: 'liveStreams',
} as const;

export type FirestoreCollectionName = typeof FIRESTORE_COLLECTIONS[keyof typeof FIRESTORE_COLLECTIONS];

// Timestamp union allowing either Firestore SDK Timestamps, server FieldValue, or serialized ISO strings
export type FirestoreDateType = Timestamp | FieldValue | string | Date;

// ============================================================================
// RELATIONAL INTEGRITY & FOREIGN KEY REFERENCES
// ============================================================================

/**
 * Foreign key references for denormalized and referenced data integrity.
 */
export interface EntityReference {
  id: string;
  name: string;
  path?: string;
}

export interface UserReference {
  uid: string;
  displayName: string;
  email?: string;
  photoURL?: string;
  role?: string;
}

export interface TeamReference {
  teamId: string;
  teamName: string;
  logoUrl?: string;
  color?: string;
  seed?: number;
  poolGroup?: string;
}

export interface VenueReference {
  venueId?: string;
  facilityName: string;
  subLocation?: string; // e.g. "Field 1", "Court A"
  address?: string;
  city?: string;
  state?: string;
}

// ============================================================================
// 1. EVENTS COLLECTION (Root: /events/{eventId})
// ============================================================================

export type EventStatus = 'Draft' | 'Upcoming' | 'In Progress' | 'Completed' | 'Cancelled' | 'Archived';
export type EventFormat = 'Tournament' | 'Showcase' | 'Combine' | 'Camp' | 'League';

export interface EventVenueDetails {
  facilityName: string;
  address: string;
  city?: string;
  state: string;
  zip?: string;
  latitude?: number;
  longitude?: number;
  fieldsCount: number;
  subLocations: string[]; // List of specific field / court names
  gateFeeInfo?: string;
  parkingNotes?: string;
  rules: string[];
}

export interface EventDigitalWaiverConfig {
  verificationLevel: 'basic' | 'verified_ocr' | 'strict_official';
  waiverTemplate: string;
  concussionProtocolRequired: boolean;
  photoReleaseConsent: boolean;
  requireParentSignature?: boolean;
}

export interface EventScheduleConstraints {
  gameDurationMinutes: number;
  bufferMinutes: number;
  fieldAllocations: Record<string, string[]>; // divisionName -> subLocations[]
  coachConflictDetection: boolean;
  startTime: string;
  endTime: string;
  maxGamesPerDayPerTeam?: number;
}

export interface FirestoreEvent {
  // Primary Identifier
  id: string; // Document ID (eventId)
  slug?: string;

  // Relational Foreign Key References
  creatorUid: string; // Ref -> users/{uid}
  creator?: UserReference;
  organizationId?: string; // Ref -> organizations/{orgId}
  venueId?: string; // Ref -> venues/{venueId}
  
  // Child Relational ID Arrays
  divisionIds: string[]; // Refs -> divisions/{divisionId}
  teamIds: string[]; // Refs -> teams/{teamId}
  bracketIds: string[]; // Refs -> brackets/{bracketId}
  gameIds: string[]; // Refs -> games/{gameId}

  // Core Event Metadata
  title: string;
  sport: SportType;
  eventType: EventFormat;
  status: EventStatus;
  isDraft: boolean;
  description: string;
  bannerUrl: string;
  logoUrl?: string;

  // Temporal / Schedule Boundaries
  startDate: string; // ISO date YYYY-MM-DD
  endDate: string; // ISO date YYYY-MM-DD
  registrationCutoffDate: string; // ISO date YYYY-MM-DD
  rosterLockDate: string; // ISO date YYYY-MM-DD
  time?: string;

  // Venue & Physical Location
  location: string; // Display string
  state: string;
  venueDetails: EventVenueDetails;

  // Financials & Pricing Structure
  price: number; // Base entry price
  teamFee: number;
  depositAmount: number;
  currency?: string; // e.g. 'USD'
  paypalMerchantId?: string;
  paypalEmail?: string;
  platformFeeAmount?: number; // e.g. $25.00

  // Photo Gallery Monetization & Watermarking Config
  galleryConfig?: {
    isPaid: boolean;
    singlePhotoPrice?: number;
    fullAlbumPrice?: number;
    watermarkEnabled: boolean;
  };

  // Rules & Operational Policies
  waiverConfig: EventDigitalWaiverConfig;
  scheduleConstraints: EventScheduleConstraints;

  // Aggregated Counters & Capacity Metrics
  maxTeams: number;
  maxCap: number;
  capacity: number;
  registeredTeamCount?: number;
  scheduledGameCount?: number;
  completedGameCount?: number;

  // Direct embedded division list for high-speed client reads
  divisions: string[];
  divisionConfigs?: Array<{
    id: string;
    name: string;
    minAge: number;
    maxAge: number;
    gradeLevel?: string;
    maxTeams: number;
    teamFee: number;
    depositAmount: number;
    registeredTeamCount?: number;
  }>;

  // Audit Timestamps
  createdAt: FirestoreDateType;
  updatedAt: FirestoreDateType;
  publishedAt?: FirestoreDateType | null;
}

// ============================================================================
// 2. DIVISIONS COLLECTION (Root: /divisions/{divisionId} or /events/{eventId}/divisions/{divisionId})
// ============================================================================

export type DivisionGender = 'Boys' | 'Girls' | 'Coed' | 'Men' | 'Women' | 'Open';
export type DivisionSkillLevel = 'Rec' | 'Competitive' | 'Elite' | 'Open' | 'Varsity' | 'JV';
export type DivisionFormat = 'Pool Play' | 'Single Elimination' | 'Double Elimination' | 'Round Robin' | 'Pool + Bracket';

export interface FirestoreDivision {
  // Primary Identifier
  id: string; // Document ID (divisionId)

  // Relational Foreign Key References
  eventId: string; // Mandatory Ref -> events/{eventId}
  eventTitle?: string;
  bracketIds: string[]; // Refs -> brackets/{bracketId}
  teamIds: string[]; // Refs -> teams/{teamId}
  gameIds: string[]; // Refs -> games/{gameId}

  // Core Division Properties
  name: string; // e.g. "12U Pro Division", "High School Varsity"
  sport: SportType;
  gender: DivisionGender;
  skillLevel: DivisionSkillLevel;
  format: DivisionFormat;

  // Age & Grade Eligibility
  minAge: number;
  maxAge: number;
  gradeLevel?: string; // e.g. "9th - 12th Grade"
  ageCutoffDate?: string;

  // Capacity & Financials
  maxTeams: number;
  registeredTeamCount: number;
  teamFee: number;
  depositAmount: number;
  rosterMinPlayers?: number;
  rosterMaxPlayers?: number;

  // Field & Match Specifications
  assignedSubLocations: string[]; // e.g. ["Field 1 (Turf Championship)", "Field 2"]
  gameDurationMinutes: number;
  periodsCount: number; // e.g. 2 halves or 4 quarters
  periodLengthMinutes: number;
  timeoutsPerTeam?: number;

  // Standings Configuration
  tiebreakerRules?: Array<'head_to_head' | 'point_differential' | 'points_against' | 'points_for' | 'coin_toss'>;
  maxPointDifferentialPerGame?: number;

  // Audit Timestamps
  createdAt: FirestoreDateType;
  updatedAt: FirestoreDateType;
}

// ============================================================================
// 3. TEAMS COLLECTION (Root: /teams/{teamId} or /events/{eventId}/teams/{teamId})
// ============================================================================

export type RegistrationPaymentStatus = 
  | 'Pending'
  | 'Deposit Paid'
  | 'Balance Pending'
  | 'Fully Paid'
  | 'Waived'
  | 'Waitlisted'
  | 'Cancelled'
  | 'Refunded';

export type PlayerEligibilityStatus = 'verified' | 'pending_review' | 'rejected' | 'waiver_missing';

export interface TeamRosterAthlete {
  athleteUid?: string; // Ref -> users/{uid} (optional if unlinked)
  firstName: string;
  lastName: string;
  fullName: string;
  jerseyNumber: string;
  position?: string;
  dateOfBirth: string; // YYYY-MM-DD
  verifiedAge?: number;
  graduationYear?: number;
  
  // Verification & Compliance
  eligibilityStatus: PlayerEligibilityStatus;
  documentProofUrl?: string;
  documentType?: 'birth_certificate' | 'passport' | 'state_id' | 'school_id';
  ocrVerifiedAt?: FirestoreDateType;
  waiverSigned: boolean;
  waiverSignedAt?: FirestoreDateType;
  parentName?: string;
  parentEmail?: string;
  parentSignatureUrl?: string;
}

export interface TeamTournamentRecord {
  played: number;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
  streak: string; // e.g. "3W", "1L"
  rank?: number;
}

export interface FirestoreTeam {
  // Primary Identifier
  id: string; // Document ID (teamId)

  // Relational Foreign Key References
  eventId: string; // Mandatory Ref -> events/{eventId}
  divisionId: string; // Mandatory Ref -> divisions/{divisionId}
  organizationId?: string; // Optional Ref -> organizations/{orgId}
  bracketId?: string; // Ref -> brackets/{bracketId}
  
  // User Accounts & Coaching Staff
  headCoachUid: string; // Ref -> users/{uid}
  headCoachName: string;
  headCoachEmail: string;
  headCoachPhone?: string;
  assistantCoachUids?: string[]; // Refs -> users/{uid}
  
  // Core Identity & Branding
  name: string;
  shortName?: string;
  abbreviation?: string;
  city?: string;
  state?: string;
  primaryColor?: string; // Hex color code
  secondaryColor?: string;
  logoUrl?: string;

  // Tournament Seeding & Pool Allocation
  seed?: number;
  poolGroup?: string; // e.g. "Pool A", "Pool B"

  // Registration & Payment Ledger
  registrationStatus: RegistrationPaymentStatus;
  totalTeamFee: number;
  depositAmountPaid: number;
  balanceRemaining: number;
  stripePaymentIntentId?: string;
  stripeCustomerId?: string;
  receiptUrl?: string;
  registeredAt: FirestoreDateType;
  paidInFullAt?: FirestoreDateType;

  // Active Roster & Document Compliance
  roster: TeamRosterAthlete[];
  rosterAthleteUids: string[]; // Indexed for rapid user querying
  rosterCount: number;
  isRosterLocked: boolean;
  allWaiversSigned: boolean;
  allAgeVerified: boolean;

  // Live Check-in Status
  isCheckedIn: boolean;
  checkedInAt?: FirestoreDateType;
  checkedInByUid?: string; // Ref -> users/{uid}

  // Live Tournament Record / Standings
  record: TeamTournamentRecord;

  // Audit Timestamps
  createdAt: FirestoreDateType;
  updatedAt: FirestoreDateType;
}

// ============================================================================
// 4. BRACKETS COLLECTION (Root: /brackets/{bracketId} or /events/{eventId}/brackets/{bracketId})
// ============================================================================

export type BracketType = 
  | 'Single Elimination'
  | 'Double Elimination'
  | 'Pool Play'
  | 'Pool To Bracket'
  | 'Consolation'
  | 'Round Robin';

export type BracketStatus = 'Draft' | 'Published' | 'In Progress' | 'Completed';

export interface BracketNodeMatch {
  nodeId: string; // e.g. "R1-M1", "QF-1", "CHAMP"
  gameId?: string; // Ref -> games/{gameId}
  roundIndex: number; // 0 = First Round, 1 = Quarterfinals, 2 = Semis, 3 = Finals
  roundName: string; // e.g. "Quarterfinals"
  matchNumber: number;
  
  // Participants
  homeTeamId?: string | null; // Ref -> teams/{teamId}
  awayTeamId?: string | null; // Ref -> teams/{teamId}
  homeTeamSeed?: number;
  awayTeamSeed?: number;
  homeTeamPlaceholder?: string; // e.g. "Winner of QF-1" or "Pool A 1st"
  awayTeamPlaceholder?: string; // e.g. "Winner of QF-2" or "Pool B 2nd"
  
  // Results
  homeScore?: number;
  awayScore?: number;
  winnerTeamId?: string | null; // Ref -> teams/{teamId}
  loserTeamId?: string | null;
  status: 'Scheduled' | 'Live' | 'Completed' | 'Pending';

  // Tree Navigation Links
  nextMatchNodeId?: string;
  nextMatchSlot?: 'home' | 'away';
  loserMatchNodeId?: string; // For double elimination / consolation
  loserMatchSlot?: 'home' | 'away';
}

export interface BracketPoolGroup {
  poolId: string;
  poolName: string; // e.g. "Pool A"
  teamIds: string[]; // Refs -> teams/{teamId}
  gameIds: string[]; // Refs -> games/{gameId}
  advancingTeamCount: number;
  advancingTargetRound?: string;
}

export interface FirestoreBracket {
  // Primary Identifier
  id: string; // Document ID (bracketId)

  // Relational Foreign Key References
  eventId: string; // Mandatory Ref -> events/{eventId}
  divisionId: string; // Mandatory Ref -> divisions/{divisionId}
  divisionName: string;
  participatingTeamIds: string[]; // Refs -> teams/{teamId}
  gameIds: string[]; // Refs -> games/{gameId}
  championTeamId?: string | null; // Ref -> teams/{teamId}
  runnerUpTeamId?: string | null; // Ref -> teams/{teamId}

  // Core Bracket Config
  name: string; // e.g. "14U Elite Championship Bracket"
  type: BracketType;
  status: BracketStatus;
  totalTeams: number;
  totalRounds: number;
  roundNames: string[]; // e.g. ["Quarterfinals", "Semifinals", "Championship Final"]

  // Bracket Structure Nodes
  nodes: BracketNodeMatch[];

  // Optional Pool Play groups for multi-stage tournaments
  pools?: BracketPoolGroup[];

  // Audit Timestamps
  createdAt: FirestoreDateType;
  updatedAt: FirestoreDateType;
  publishedAt?: FirestoreDateType;
}

// ============================================================================
// 5. GAMES COLLECTION (Root: /games/{gameId} or /events/{eventId}/games/{gameId})
// ============================================================================

export interface GameTeamSnapshot {
  teamId: string; // Ref -> teams/{teamId}
  name: string;
  abbreviation: string;
  score: number;
  color: string;
  logoUrl?: string;
  timeoutsLeft?: number;
  fouls?: number;
  seed?: number;
}

export interface GamePlayByPlayAction {
  id: string;
  timestamp: string;
  gameTime?: string; // e.g. "06:42 2H"
  period: string; // e.g. "1st Half", "2nd Quarter"
  team: 'home' | 'away' | 'neutral';
  teamId?: string;
  actionType: 'SCORE' | 'PENALTY' | 'TIMEOUT' | 'TURNOVER' | 'SUBSTITUTION' | 'NOTE';
  points?: number;
  text: string;
  scoringPlayerUid?: string;
  scoringPlayerName?: string;
}

export interface GamePeriodScore {
  periodNumber: number;
  periodLabel: string; // e.g. "1H", "2H", "Q1", "OT"
  homePoints: number;
  awayPoints: number;
}

export interface FirestoreGame {
  // Primary Identifier
  id: string; // Document ID (gameId)

  // Relational Foreign Key References
  eventId: string; // Mandatory Ref -> events/{eventId}
  divisionId: string; // Mandatory Ref -> divisions/{divisionId}
  bracketId?: string; // Optional Ref -> brackets/{bracketId}
  bracketNodeId?: string; // Node link inside bracket
  
  // Teams Relational References
  homeTeamId: string; // Mandatory Ref -> teams/{teamId}
  awayTeamId: string; // Mandatory Ref -> teams/{teamId}
  winningTeamId?: string | null; // Ref -> teams/{teamId}
  losingTeamId?: string | null; // Ref -> teams/{teamId}

  // Next Round Advancement
  nextGameId?: string; // Ref -> games/{nextGameId}
  nextGameSlot?: 'home' | 'away';

  // Venue & Physical Court
  venueId?: string; // Ref -> venues/{venueId}
  venueName: string;
  subLocation: string; // e.g. "Field 1 (Turf Championship)", "Court B"
  courtNumber?: number;

  // Officiating & Staff UIDs
  officialUids: string[]; // Refs -> users/{uid}
  scorekeeperUid?: string; // Ref -> users/{uid}
  mvpPlayerAthleteUid?: string; // Ref -> users/{uid}
  mvpPlayerName?: string;

  // Core Game Info
  gameNumber: number;
  title: string;
  sport: SportType;
  status: GameStatus; // 'Upcoming' | 'Live' | 'Halftime' | 'Final'
  
  // Live Clock & Period Tracking
  period: string; // "1st Half", "2nd Half", "Q1", "OT", "Final"
  gameClock: string; // "20:00", "04:15"
  isClockRunning: boolean;
  
  // Schedule Logistics
  scheduledStartTime: string; // e.g. "2026-08-22 09:00 AM" or ISO string
  scheduledEndTime?: string;
  actualStartTime?: FirestoreDateType;
  actualEndTime?: FirestoreDateType;

  // Team Snapshots & Live Scores
  homeTeam: GameTeamSnapshot;
  awayTeam: GameTeamSnapshot;
  periodScores?: GamePeriodScore[];
  playByPlay: GamePlayByPlayAction[];

  // Officiating Verification & Sign-off
  isOfficialSignedOff: boolean;
  officialPinSignOff?: string;
  officialSignedOffAt?: FirestoreDateType;
  officialNotes?: string;

  // AI Journalism & Recap
  aiGameRecap?: string;
  aiKeyPerformers?: Array<{
    name: string;
    teamName: string;
    statHighlights: string;
  }>;

  // Live Stream Link
  streamSessionId?: string; // Ref -> liveStreams/{streamId}
  streamUrl?: string;
  isLiveStreamActive?: boolean;

  // Audit Timestamps
  createdAt: FirestoreDateType;
  updatedAt: FirestoreDateType;
}

// ============================================================================
// FIRESTORE REPOSITORY QUERY HELPER TYPES
// ============================================================================

export interface EventRelationalGraph {
  event: FirestoreEvent;
  divisions: FirestoreDivision[];
  teams: FirestoreTeam[];
  brackets: FirestoreBracket[];
  games: FirestoreGame[];
}

export interface FirestoreQueryOptions {
  limit?: number;
  offset?: number;
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
  status?: string;
  sport?: SportType;
  divisionId?: string;
  eventId?: string;
  teamId?: string;
}
