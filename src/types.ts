export type UserRole = 
  | 'member'
  | 'athlete' 
  | 'coach' 
  | 'organization' 
  | 'scout' 
  | 'creator' 
  | 'viewer' 
  | 'fan'
  | 'director'
  | 'coordinator'
  | 'content_creator' 
  | 'admin';

export type MainTab = 'home' | 'events' | 'athletes' | 'organizations' | 'social' | 'gallery' | 'profile' | 'media' | 'blog' | 'admin' | 'live' | 'drive' | 'gmail' | 'calendar' | 'forms';

export type SportType = string;

export interface TeamInfo {
  name: string;
  abbreviation: string;
  score: number;
  color: string;
  logoUrl?: string;
  timeoutsLeft?: number;
  fouls?: number;
}

export type GameStatus = 'Live' | 'Halftime' | 'Final' | 'Upcoming';

export interface PlayByPlayEvent {
  id: string;
  timestamp: string;
  text: string;
  team: 'home' | 'away' | 'neutral';
  points?: number;
}

export interface LiveGame {
  id: string;
  title: string;
  sport: SportType;
  status: GameStatus;
  period: string; // e.g., "1st Quarter", "2nd Quarter", "1st Half", "3rd Quarter", "4th Quarter", "OT", "Final"
  gameClock: string; // e.g., "08:24"
  isClockRunning: boolean;
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  location: string;
  playByPlay: PlayByPlayEvent[];
  updatedAt: string;
  streamUrl?: string;
  isLiveStreamActive?: boolean;
  viewerCount?: number;
  streamerName?: string;
  bannerUrl?: string;
  thumbnailUrl?: string;
}

export interface LiveStreamSession {
  id: string;
  gameId?: string;
  title: string;
  sport: SportType;
  broadcasterName: string;
  broadcasterAvatar?: string;
  isBroadcasting: boolean;
  viewerCount: number;
  streamUrl?: string;
  rtmpServerUrl?: string;
  streamKey?: string;
  startedAt: string;
  hasScoreboardOverlay: boolean;
}

export interface BasketballStats {
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  gamesPlayed?: number;
}

export interface FlagFootballStats {
  passingYards: number;
  rushingYards: number;
  receptions: number;
  flagPulls: number;
  interceptions: number;
  gamesPlayed?: number;
}

export interface LacrosseStats {
  goals: number;
  assists: number;
  groundBalls: number;
  drawControls: number;
  causedTurnovers: number;
  gamesPlayed?: number;
}

export type SportStats = BasketballStats | FlagFootballStats | LacrosseStats;

export interface BasketballGameStats {
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  fgMade?: number;
  fgAttempted?: number;
  threeMade?: number;
  ftMade?: number;
  ftAttempted?: number;
}

export interface FlagFootballGameStats {
  passingYards: number;
  passingTds: number;
  rushingYards: number;
  rushingTds: number;
  receptions: number;
  receivingYards: number;
  receivingTds: number;
  flagPulls: number;
  interceptions: number;
}

export interface LacrosseGameStats {
  goals: number;
  assists: number;
  groundBalls: number;
  drawControls: number;
  causedTurnovers: number;
  shotsOnGoal?: number;
}

export interface FootballGameStats {
  touchdowns: number;
  tackles: number;
  passingYards: number;
  passingTds: number;
  rushingYards: number;
  rushingTds: number;
  receivingYards?: number;
  receivingTds?: number;
  receptions?: number;
  sacks?: number;
  interceptions?: number;
  fieldGoals?: number;
}

export interface SoccerGameStats {
  goals: number;
  assists: number;
  shotsOnGoal?: number;
  tackles?: number;
  saves?: number;
  cleanSheet?: boolean;
}

export interface BaseballGameStats {
  hits: number;
  runs: number;
  rbis: number;
  homeRuns: number;
  stolenBases?: number;
  strikeouts?: number;
  inningsPitched?: number;
}

export interface VolleyballGameStats {
  kills: number;
  blocks: number;
  digs: number;
  aces: number;
  assists: number;
}

export interface TrackGameStats {
  eventName?: string;
  timeSeconds?: number;
  distanceMeters?: number;
  place?: number;
}

export interface GameStatEntry {
  id: string;
  athleteUid: string;
  gameDate: string; // e.g. "2026-07-28"
  sport: SportType;
  opponent: string; // e.g. "Camden High Knights"
  gameResult: 'W' | 'L' | 'T';
  teamScore: number;
  opponentScore: number;
  isHomeGame: boolean;
  location?: string;
  eventId?: string;
  eventName?: string;
  notes?: string;
  highlightVideoUrl?: string;
  stats: BasketballGameStats | FlagFootballGameStats | LacrosseGameStats | FootballGameStats | SoccerGameStats | BaseballGameStats | VolleyballGameStats | TrackGameStats | Record<string, any>;
  createdAt: string;
  isVerified?: boolean;
}

export interface SocialHandles {
  instagram?: string;
  tiktok?: string;
  twitter?: string;
  x?: string;
  hudl?: string;
  youtube?: string;
  linkedin?: string;
  website?: string;
}

export interface VideoHighlight {
  id: string;
  title: string;
  url: string;
  platform: 'youtube' | 'vimeo' | 'tiktok' | 'instagram' | 'other';
  thumbnailUrl?: string;
  createdAt: string;
}

export interface PerformanceMetrics {
  speed: number;     // 0-100 (Sprint & Acceleration)
  strength: number;  // 0-100 (Power & Explosive Strength)
  agility: number;   // 0-100 (Lateral Quickness & Change of Direction)
  stamina: number;   // 0-100 (Work Rate & Endurance)
  vertical: number;  // 0-100 (Leaping Ability & Explosiveness)
  iq: number;        // 0-100 (Game IQ & Tactical Awareness)
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  isVerified?: boolean;
  verificationStatus?: 'pending' | 'approved' | 'rejected' | string;
  verifiedAt?: any;
  rejectedAt?: any;
  roleLocked?: boolean;
  profileLocked?: boolean;
  hasCompletedOnboarding?: boolean;
  profileCompleted?: boolean;
  profileComplete?: boolean;
  preferences?: {
    preferredSport?: string;
    notificationAlerts?: boolean;
    defaultDashboard?: string;
  };
  sport: SportType;
  gradYear: string;
  highSchool: string;
  state: string;
  city?: string;
  country?: string;
  location?: string;
  position: string;
  primaryPosition?: string;
  jerseyNumber?: string;
  teamName?: string;
  coachingPhilosophy?: string;
  programLevel?: 'Youth' | 'High School' | 'AAU/Club' | 'College' | string;
  coachTitle?: string;
  sportsCoached?: string[] | string;
  schoolName?: string;
  orgAffiliation?: string;
  scoutingCoverage?: 'High School' | 'AAU' | 'College' | 'Pro / Showcase' | string;
  sportsEvaluated?: string[] | string;
  credentials?: string;
  brandName?: string;
  mediaSpecialization?: 'Sports Photography' | 'Videography' | 'Mix / Highlight Reels' | 'Graphic Design' | 'Sports Journalism' | string;
  portfolioUrl?: string;
  equipment?: string;
  bookingInfo?: string;
  organizationName?: string;
  orgType?: 'League' | 'Tournament Host' | 'Club Program' | 'School District' | string;
  sportsOffered?: string[] | string;
  ageDivisions?: string;
  website?: string;
  primaryContact?: string;
  directorName?: string;
  aboutOrg?: string;
  favoriteTeams?: string[];
  supportedAthletes?: string[];
  sportsFollowed?: string[] | string;
  cityState?: string;
  scoutingRegion?: string;
  recruitingFocus?: string;
  height: string;
  weight: string;
  gpa: string;
  bio: string;
  avatarUrl?: string;
  athleteId?: string; // Unique 6-digit alphanumeric ID (e.g. "J1P-849201")
  dateOfBirth?: string; // YYYY-MM-DD
  social: SocialHandles;
  stats: SportStats;
  performanceMetrics?: PerformanceMetrics;
  mediaUrls: VideoHighlight[];
  highlightUrls?: string[];
  featuredHighlightUrl?: string;
  featuredHighlightTitle?: string;
  gameLogs?: GameStatEntry[];
  bookmarkedAthleteIds?: string[];
  // Subscription & Membership State
  subscriptionTier?: 'athlete' | 'recruiter' | 'director' | 'free' | 'none' | string;
  subscriptionStatus?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'inactive' | string;
  subscriptionPlanName?: string;
  subscriptionBillingCycle?: 'monthly' | 'annual';
  paypalMerchantId?: string;
  paypalEmail?: string;
  paypalPayerId?: string;
  paypalSubscriptionId?: string;
  paypalOnboardingStatus?: 'NOT_STARTED' | 'PENDING' | 'ACTIVE' | 'REVOKED';
  paypalAccountStatus?: 'active' | 'pending' | 'unlinked';
  subscriptionCurrentPeriodStart?: string;
  subscriptionCurrentPeriodEnd?: string;
  subscriptionCancelAtPeriodEnd?: boolean;
  hasActiveSubscription?: boolean;
  isNCAAPro?: boolean;
  isCoachPass?: boolean;
  isDirectorEnterprise?: boolean;
  hasSignalHubAddon?: boolean;
  signalHubPlan?: 'monthly' | 'trial' | 'active' | string;
  signalHubActivatedAt?: number | string;
  subscriptionUpdatedAt?: string;
  // Saved Payment Accounts & Fast Checkout
  savedPaymentAccounts?: UserPaymentAccounts;
  // WebAuthn & Biometric Passkey state
  hasWebAuthnEnabled?: boolean;
  webAuthnCredentials?: WebAuthnCredential[];
  lastBiometricLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WebAuthnCredential {
  id: string; // Base64URL credential ID
  rawId?: string;
  publicKey?: string;
  transports?: string[];
  deviceName: string;
  deviceType?: 'touch_id' | 'face_id' | 'windows_hello' | 'android_biometric' | 'security_key' | 'passkey';
  createdAt: string;
  lastUsedAt?: string;
  aaguid?: string;
}

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'discover' | 'other';

export interface SavedPaymentCard {
  id: string;
  brand: CardBrand;
  last4: string;
  expMonth: string;
  expYear: string;
  cardholderName: string;
  isDefault?: boolean;
  nickname?: string;
  createdAt: string;
}

export interface SavedPayPalAccount {
  email: string;
  payerId?: string;
  isLinked: boolean;
  linkedAt?: string;
  isDefault?: boolean;
  oneClickEnabled?: boolean;
}

export interface SavedVenmoAccount {
  username: string; // e.g. @athlete_john
  phoneLast4?: string;
  isLinked: boolean;
  linkedAt?: string;
  isDefault?: boolean;
}

export interface SavedBillingDetails {
  fullName?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface UserPaymentAccounts {
  defaultMethodType?: 'paypal' | 'venmo' | 'card' | 'apple_pay' | 'google_pay';
  defaultCardId?: string;
  paypal?: SavedPayPalAccount;
  venmo?: SavedVenmoAccount;
  cards?: SavedPaymentCard[];
  billingDetails?: SavedBillingDetails;
  oneClickCheckoutEnabled?: boolean;
  updatedAt?: string;
}

export interface ProfileData {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  avatarUrl?: string;
  role: UserRole;
  isVerified?: boolean;
  bio?: string;
  sport?: SportType;
  highSchool?: string;
  teamName?: string;
  state?: string;
  social?: SocialHandles;

  // Athletic Stats & Measurables (Dynamically injected for Athletes)
  athleticStats?: {
    height?: string;
    weight?: string;
    gradYear?: string;
    position?: string;
    jerseyNumber?: string;
    gpa?: string;
    athleteId?: string;
    dateOfBirth?: string;
    stats?: SportStats;
    performanceMetrics?: PerformanceMetrics;
    gameLogs?: GameStatEntry[];
    mediaUrls?: VideoHighlight[];
  };

  // Recruitment Dashboard & Scouting Matrix (Dynamically injected for Scouts/Recruiters)
  recruitmentDashboard?: {
    agency?: string;
    title?: string;
    region?: string;
    targetClasses?: string;
    evaluationsCount?: number;
    bookmarkedAthleteIds?: string[];
    shortlistCount?: number;
    evaluationNotes?: string;
  };

  // Coach Credentials & Staff Info (Dynamically injected for Coaches)
  coachCredentials?: {
    title?: string;
    yearsExperience?: string;
    careerRecord?: string;
    championships?: string;
    d1PlacedCount?: string;
    license?: string;
    managedTeams?: string[];
  };

  // Organization Operations (Dynamically injected for Event Operators / Organizations)
  organizationOperations?: {
    orgType?: string;
    hq?: string;
    foundedYear?: string;
    sanctionLicense?: string;
    eventsHostedCount?: number;
    teamsEnrolledCount?: number;
    athletesImpacted?: number;
    website?: string;
  };

  // Media Creator Reel (Dynamically injected for Media Creators)
  creatorReel?: {
    brandName?: string;
    specialty?: string;
    gear?: string;
    publishedCount?: number;
    totalViews?: string;
    taggedAthletesCount?: number;
    youtubeUrl?: string;
  };

  // Fan Spectator Pass (Dynamically injected for Viewers / Fans)
  viewerPass?: {
    favoriteSports?: string;
    favoriteTeams?: string;
    memberSince?: string;
    passId?: string;
    followedAthleteIds?: string[];
  };
}

export interface TournamentDivision {
  id: string;
  name: string; // e.g. "10U Girls", "12U Pro", "14U Open", "High School Varsity"
  minAge?: number;
  maxAge?: number;
  gradeLevel?: string;
  maxTeams: number;
  teamFee: number;
  depositAmount: number;
  registeredTeamCount?: number;
}

export interface VenueInfo {
  facilityName: string;
  address: string;
  city?: string;
  state: string;
  zip?: string;
  fieldsCount: number;
  subLocations?: string[]; // e.g. ["Field 1 (Turf)", "Field 2", "Court 1", "Court 2"]
  gateFeeInfo?: string; // e.g. "$10 Adults / Kids Free"
  parkingNotes?: string; // e.g. "North Lot Free, South Lot $5"
  rules?: string[]; // e.g. ["Mouthpieces mandatory", "No metal cleats", "Softshell helmets required for 7v7"]
}

export interface DigitalWaiverConfig {
  verificationLevel: 'none' | 'self_reported' | 'verified_ocr';
  waiverTemplate: string;
  concussionProtocolRequired: boolean;
  photoReleaseConsent: boolean;
}

export interface SmartScheduleConstraints {
  gameDurationMinutes: number; // e.g. 40
  bufferMinutes: number; // e.g. 10
  fieldAllocations: Record<string, string[]>; // divisionId -> field names
  coachConflictDetection: boolean;
  startTime?: string; // e.g. "08:00 AM"
  endTime?: string; // e.g. "06:00 PM"
}

export interface EventItem {
  id: string;
  title: string;
  name?: string;
  sport: SportType | 'All Sports';
  eventType: 'Tryout' | 'Combine' | 'Showcase' | 'Camp' | 'Tournament' | 'Registration' | 'Standalone Event' | 'Plaza' | 'Clinic' | 'Community';
  date: string;
  startDate?: string;
  endDate?: string;
  time: string;
  location: string;
  state: string;
  country?: string;
  description: string;
  organizer: string;
  creatorUid?: string;
  createdBy?: string;
  capacity: number;
  maxTeams?: number;
  teamFee?: number;
  depositAmount?: number;
  divisions?: string[]; // legacy list e.g. ["10U", "12U", "14U", "17U", "Varsity"]
  divisionConfigs?: TournamentDivision[];
  venueDetails?: VenueInfo;
  waiverConfig?: DigitalWaiverConfig;
  scheduleConstraints?: SmartScheduleConstraints;
  registrationCutoffDate?: string;
  rosterLockDate?: string; // YYYY-MM-DD cutoff
  registeredUserIds: string[];
  registeredCount?: number;
  maxCap?: number;
  entryFee?: string | number;
  price: number;
  status?: 'Draft' | 'Upcoming' | 'In Progress' | 'Completed';
  bannerUrl?: string;
  flyerUrl?: string;
  coverUrl?: string;
  thumbnailUrl?: string;
  aspectRatio?: 'banner' | 'flyer' | 'auto';
  isFeatured?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type PlayerVerificationBadge = 'Verified' | 'Pending Waiver' | 'OCR Verified' | 'Rejected';

export interface RosterPlayer {
  athleteUid: string;
  athleteName: string;
  jerseyNumber?: string;
  position?: string;
  dob?: string;
  verificationStatus: PlayerVerificationBadge;
  waiverSigned: boolean;
  waiverSignedAt?: string;
  parentConsent?: boolean;
  ocrDocUrl?: string;
  ocrExtractedDob?: string;
  ocrExtractedName?: string;
  ocrConfidence?: number;
}

export interface TeamItem {
  id: string;
  eventId: string;
  coachId: string;
  coachName?: string;
  coachEmail?: string;
  coachPhone?: string;
  division: string;
  divisionId?: string;
  teamName: string;
  seed?: number;
  paymentStatus: 'Paid' | 'Deposit Paid' | 'Pending' | 'Unpaid';
  depositAmountPaid?: number;
  balanceDue?: number;
  tier?: 'FREE' | 'BASIC' | 'PRO_PLAYBOOK' | 'ENTERPRISE' | string;
  hasSignalHubAddon?: boolean;
  roster: string[]; // array of Athlete user UIDs
  rosterPlayers?: RosterPlayer[];
  rosterDetails?: UserProfile[]; // populated athlete objects
  createdAt?: string;
  updatedAt?: string;
}

export interface GameItem {
  id: string;
  eventId: string;
  division: string;
  divisionId?: string;
  teamA_Id: string;
  teamB_Id: string;
  teamA_Name: string;
  teamB_Name: string;
  teamA_Score: number;
  teamB_Score: number;
  gameType: 'PoolPlay' | 'Bracket';
  round?: 'Round 1' | 'Quarterfinals' | 'Semifinals' | 'Championship' | string;
  bracketSlot?: string; // e.g. "W-SF-1", "L-R1-2"
  matchNumber?: number;
  startTime: string; // e.g. "10:00 AM" or ISO
  courtOrField?: string;
  status: 'Scheduled' | 'In Progress' | 'Final';
  period?: string; // e.g. "1st Half", "2nd Half", "Final"
  gameClock?: string; // e.g. "14:20"
  winnerId?: string;
  nextMatchId?: string;
  refereeUid?: string;
  recap?: string;
  mvpPlayer?: string;
  boxScoreLogs?: Array<{ time: string; text: string; team: 'A' | 'B'; points: number }>;
  createdAt?: string;
}

export interface StandingItem {
  teamId: string;
  teamName: string;
  division: string;
  played: number;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff?: number;
  pointsDiff?: number;
  rank?: number;
  streak?: string;
}

export interface MediaBooking {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  serviceType: string;
  eventDate: string;
  locationName: string;
  locationCity: string;
  locationState: string; // e.g. 'NJ', 'NY', 'PA', etc.
  basePrice: number;
  travelFee: number;
  totalPrice: number;
  totalAmount?: number;
  depositPercentage?: number;
  depositAmount: number;
  remainingBalance?: number;
  balanceAmount?: number;
  status: 'Pending Deposit' | 'Deposit Paid' | 'Balance Pending' | 'Fully Paid' | 'Confirmed' | 'Completed';
  paymentStatus?: 'Deposit Paid' | 'Balance Pending' | 'Fully Paid';
  mediaUnlocked?: boolean;
  albumId?: string;
  specialRequests?: string;
  createdAt: string;
}

export interface Division {
  id: string;
  name: string; // e.g. "10U", "12U", "14U", "17U Girls", "High School"
  sport?: string;
  format?: string;
  teamLimit?: number;
  maxTeams?: number;
  teamFee?: number;
  registeredCount?: number;
}

export interface TeamRosterPlayer {
  id: string;
  name: string;
  jerseyNumber: string;
  dob?: string;
  position?: string;
  isVerified?: boolean;
}

export interface TeamEntry {
  id: string;
  tournamentId: string;
  teamName: string;
  divisionId: string;
  divisionName: string;
  headCoachName: string;
  contactEmail: string;
  contactPhone?: string;
  rosterCount: number;
  players?: TeamRosterPlayer[];
  paymentStatus: 'paid' | 'pending' | 'free' | 'deposit';
  amountPaid?: number;
  registeredAt: string;
  aauNumber?: string;
  checkInStatus?: 'checked_in' | 'pending' | 'disqualified';
  seed?: number;
}

export interface GameMatch {
  id: string;
  tournamentId: string;
  divisionId?: string;
  divisionName?: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  courtOrField?: string;
  scheduledTime?: string;
  status: 'Scheduled' | 'Live' | 'Completed' | 'Delayed';
  round?: number | string;
  matchNumber?: number;
  winner?: string;
}

export interface Tournament {
  id: string;
  name: string;
  sport: SportType;
  startDate: string;
  endDate: string;
  format: 'Single Elimination' | 'Pool Play';
  participatingTeams: string[];
  venueId?: string;
  venueName?: string;
  status: 'Upcoming' | 'In Progress' | 'Completed';
  organizerId?: string;
  createdBy?: string;
  createdAt: string;
  flyerUrl?: string;
  coverUrl?: string;
  thumbnailUrl?: string;
  aspectRatio?: 'banner' | 'flyer' | 'auto';
  divisions?: string[] | TournamentDivision[] | Division[];
  teamFee?: number;
  entryFee?: number;
  registeredTeams?: TeamEntry[];
  stations?: string[];
  courts?: string[];
  gameStartTime?: string;
  gameEndTime?: string;
  timeSlotDuration?: string;
  updatedAt?: string;
}

export interface TournamentMatch {
  id: string;
  tournamentId: string;
  round: number; // 1 = Quarterfinals, 2 = Semifinals, 3 = Championship Final
  matchNumber: number;
  homeTeam: string;
  awayTeam: string;
  sport?: string;
  homeScore?: number;
  awayScore?: number;
  winner?: string;
  status: 'Scheduled' | 'Live' | 'Completed';
  venueId?: string;
  venueName?: string;
  subLocation?: string; // e.g. "Court A", "Field 1"
  scheduledTime?: string; // e.g. "2026-08-15 10:00 AM"
  nextMatchId?: string;
  nextMatchSlot?: 'home' | 'away';
}

export interface Venue {
  id: string;
  facilityName: string;
  address: string;
  city: string;
  state: string;
  subLocations: string[]; // e.g. ["Court A", "Court B", "Field 1", "Field 2"]
}

export interface AthleteCheckIn {
  id: string;
  athleteUid: string;
  athleteName: string;
  athletePhoto?: string;
  teamName: string;
  sport: SportType;
  tournamentId: string;
  tournamentName?: string;
  matchId?: string;
  courtField?: string;
  status: 'Checked In' | 'Pending';
  checkInTime: string;
}

export interface CommentItem {
  id: string;
  authorUid: string;
  authorName: string;
  authorAvatar?: string;
  authorRole: UserRole;
  authorIsVerified?: boolean;
  text: string;
  likes?: string[];
  likesCount?: number;
  createdAt: string;
}

export interface SocialPost {
  id: string;
  authorUid: string;
  authorName: string;
  authorAvatar?: string;
  authorRole: UserRole;
  authorIsVerified?: boolean;
  authorSport?: SportType;
  classYear?: string; // e.g. "2026", "2027", "2028"
  position?: string; // e.g. "QB", "PG", "WR", "Midfielder"
  height?: string; // e.g. "6'4""
  weight?: string; // e.g. "210 lbs"
  gpa?: string; // e.g. "3.9"
  fortyYardDash?: string; // e.g. "4.39s"
  verticalJump?: string; // e.g. "38.5""
  isTopRecruit?: boolean;
  isVerifiedFilm?: boolean;
  scoutRating?: number; // 1 to 5 stars
  athleticMetrics?: {
    gpa?: string;
    fortyYardDash?: string;
    verticalJump?: string;
    height?: string;
    position?: string;
    classYear?: string;
    ppg?: string;
  };
  caption: string;
  imageUrl?: string;
  videoUrl?: string;
  videoThumbnailUrl?: string;
  roleConsistencyFlag?: string | null;
  isRoleVerified?: boolean;
  contentType?: string;
  likes: string[]; // UIDs of users who liked
  likesCount: number;
  reactions?: Record<string, string[]>; // Sports emoji reactions mapping emoji -> UIDs
  reactionCounts?: {
    head_tap?: number;
    ice?: number;
    clamped?: number;
    cooking?: number;
    aura?: number;
    [key: string]: number | undefined;
  };
  reactionUsers?: {
    head_tap?: string[];
    ice?: string[];
    clamped?: string[];
    cooking?: string[];
    aura?: string[];
    [key: string]: string[] | undefined;
  };
  totalReactionsCount?: number;
  comments: CommentItem[];
  commentsCount: number;
  sharesCount: number;
  createdAt: string;
}

export interface DirectMessage {
  id: string;
  senderUid: string;
  senderName: string;
  senderAvatar?: string;
  senderRole: UserRole;
  senderIsVerified?: boolean;
  receiverUid: string;
  receiverName?: string;
  text: string;
  inquiryType?: 'Recruiting' | 'Combine Invitation' | 'Camp Offer' | 'General' | 'Highlight Reel' | 'Evaluation' | string;
  organization?: string;
  sport?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'highlight' | 'link';
  createdAt: string;
}

export interface ChatParticipant {
  uid: string;
  name: string;
  avatar?: string;
  role: UserRole;
  isVerified?: boolean;
  sport?: string;
  position?: string;
  organization?: string;
  highSchool?: string;
  gradYear?: string | number;
}

export interface ChatConversation {
  id: string;
  participantUids: string[];
  participants: ChatParticipant[];
  lastMessage: string;
  lastSenderUid?: string;
  lastMessageTimestamp: string;
  inquiryType?: string;
  organization?: string;
  unreadBy?: string[];
  unreadCount?: Record<string, number>;
  lastReadTimestamps?: Record<string, string>;
  updatedAt: string;
  [key: string]: any;
}

export interface BracketNodeMatch {
  id: string;
  round: number;
  matchNumber: number;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  winner?: string;
  status: 'Scheduled' | 'Live' | 'Completed';
  scheduledTime?: string;
  subLocation?: string;
  nextMatchId?: string;
  nextMatchSlot?: 'home' | 'away';
}

export interface EventBracket {
  id: string;
  name: string;
  eventName: string;
  sport: SportType;
  type: 'Single Elimination' | 'Double Elimination' | 'Pool Play';
  participantCount: number;
  currentStage: string;
  status: 'Draft' | 'In Progress' | 'Finalized';
  matches: BracketNodeMatch[];
  lastUpdated: string;
}

export interface AppNotification {
  id: string;
  recipientUid: string;
  senderUid: string;
  senderName: string;
  senderAvatar?: string;
  type: 'like' | 'comment' | 'dm' | 'follow' | 'mention' | 'event_update' | 'score_update';
  title: string;
  message: string;
  linkId?: string;
  read: boolean;
  createdAt: string;
}

export interface Album {
  id: string;
  title: string;
  description?: string;
  coverPhotoUrl?: string;
  coverUrl?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  watermarkedCoverUrl?: string;
  mediaUrls?: string[];
  watermarkedMediaUrls?: string[];
  photos?: Array<{
    id: string;
    originalUrl: string;
    watermarkedUrl?: string;
    previewUrl?: string;
    storagePath?: string;
    watermarkedStoragePath?: string;
    price?: number;
    title?: string;
    isFree?: boolean;
    isFreeForMembers?: boolean;
    [key: string]: any;
  }>;
  price?: number;
  sport?: string;
  category?: string;
  eventName?: string;
  authorId?: string;
  authorName?: string;
  authorRole?: string;
  authorAvatar?: string;
  date?: string;
  visibilityStatus?: 'public' | 'private';
  photoCount?: number;
  tags?: string[];
  albumPrice?: number;
  defaultPhotoPrice?: number;
  singlePrice?: number;
  bundlePrice?: number;
  fullAlbumPrice?: number;
  paypalEmail?: string;
  creatorPayPalEmail?: string;
  creatorId?: string;
  photographerId?: string;
  photographerUid?: string;
  creatorEmail?: string;
  eventDate?: string;
  venueLocation?: string;
  watermarkText?: string;
  watermarkEnabled?: boolean;
  watermarkStyle?: 'full_mesh' | 'badge_only' | 'off' | string;
  isFree?: boolean;
  createdAt?: any;
  createdBy?: string;
  updatedAt?: any;
  [key: string]: any;
}

export interface Photo {
  id: string;
  albumId: string;
  imageUrl: string;
  thumbUrl?: string;
  uploadTimestamp: string;
  isPremium: boolean;
  title?: string;
  caption?: string;
  uploadedBy?: string;
}

export * from './types/firestore';

export interface ParsedGame {
  date: string;         // "YYYY-MM-DD"
  time: string;         // "HH:MM AM/PM" or "TBD"
  opponent: string;     // Normalized team name
  isHome: boolean;      // true if home, false if away or neutral
  homeOrAway?: 'Home' | 'Away' | 'Neutral';
  location: string;     // Stadium/field name or "Home Stadium" / "Away Field" / "TBD"
  gameType: string;     // "Conference", "Non-Conference", "Playoff", "Tournament", "Scrimmage", "Regular Season"
  notes?: string | null;// Extra info like "Senior Night", "Homecoming", "Broadcast: ESPN+"
  homeScore?: number | null;
  awayScore?: number | null;
  result?: string | null; // e.g. "W 28-14"
  status?: string;      // "scheduled" | "live" | "completed" | "final" | "in_progress"
  bannerUrl?: string;   // High-res sport action thumbnail
  flyerUrl?: string;    // Alternate image banner
  suggestedTitle?: string;
  isFeatured?: boolean;
  createFeaturedEvent?: boolean;
  sourceUrl?: string;
  sport?: string;
}

export interface ScheduledGameDoc extends ParsedGame {
  id?: string;
  status: "scheduled" | "in_progress" | "final" | "completed";
  homeScore: number | null;
  awayScore: number | null;
  source: "ai_universal_importer" | "ai_url_importer" | string;
  authorId?: string;
  userId?: string;
  directorId?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface GalleryMediaItem {
  id: string;
  originalUrl: string;       // Clean, unwatermarked master file
  watermarkedUrl?: string;   // Preview file with watermark
  coverUrl?: string;
  videoUrl?: string;
  googleDriveFileId?: string;
  isWatermarked: boolean;    // Admin toggle flag (true / false)
  photographerId: string;
  photographerName?: string;
  eventName: string;
  albumName?: string;
  category: 'Tournaments' | 'Game Action' | 'Combine / Laser' | 'Team Portraits' | string;
  sport: string;
  teams?: string[];
  title?: string;
  caption?: string;
  hypesCount?: number;
  userHypes?: Record<string, boolean>;
  createdAt: any;
  resolution?: string;
  tags?: string[];
  price?: number;
  taggedAthletes?: Array<{ uid: string; displayName: string; sport?: string }>;
}

// ============================================================================
// GALLERY SCHEMA (Root: /galleries/{galleryId})
// ============================================================================

export interface GalleryPhoto {
  id: string;
  originalUrl: string; // High-res in private/secure Storage
  watermarkedUrl?: string; // Watermarked preview for public feed
  isFreeForMembers?: boolean;
  priceCents?: number;
  purchasedUserIds?: string[];
  title?: string;
  caption?: string;
  storageFilePath?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  tags?: string[];
  uploadedAt?: string | any;
}

export interface Gallery {
  id: string;
  eventId: string;
  eventTitle?: string;
  title: string;
  description?: string;
  directorId: string;
  directorName?: string;
  directorPayPalMerchantId?: string;
  isPaid: boolean; // true = require checkout; false = free download
  singlePhotoPrice?: number; // e.g., $5.00
  fullAlbumPrice?: number; // e.g., $35.00
  watermarkEnabled: boolean; // true = display watermarked preview
  photos: GalleryPhoto[];
  coverPhotoUrl?: string;
  watermarkedCoverUrl?: string;
  sport?: SportType;
  category?: string;
  tags?: string[];
  totalViews?: number;
  totalPurchases?: number;
  createdAt?: any;
  updatedAt?: any;
}

// ============================================================================
// USER PURCHASES & TRANSACTIONS (Root: /users/{userId}/purchases/{purchaseId})
// ============================================================================

export interface UserPurchase {
  id: string;
  userId: string;
  type: 'gallery_photo' | 'gallery_album' | 'tournament_registration' | 'subscription' | 'media_download';
  itemId: string; // photoId, galleryId, eventId, or subscription tier
  itemTitle: string;
  galleryId?: string;
  eventId?: string;
  photoId?: string;
  unlockedPhotoIds?: string[];
  amount: number;
  platformFee?: number;
  directorPayout?: number;
  currency: string;
  orderId: string;
  captureId?: string;
  payerEmail?: string;
  payerName?: string;
  status: 'COMPLETED' | 'PENDING' | 'REFUNDED' | 'FAILED';
  paymentProcessor: 'paypal';
  downloadUrl?: string;
  instantAccessGranted?: boolean;
  expiresAt?: string;
  createdAt: any;
  [key: string]: any;
}

// ============================================================================
// PAYPAL COMMERCE PLATFORM & PARTNER RAIL TYPES
// ============================================================================

export interface PayPalDirectorAccount {
  uid: string;
  displayName: string;
  email: string;
  paypalMerchantId: string;
  paypalEmail: string;
  trackingId?: string;
  onboardingStatus: 'ACTIVE' | 'PENDING' | 'NOT_STARTED' | 'REVOKED';
  paymentsReceivable: boolean;
  primaryEmailConfirmed: boolean;
  connectedAt?: string;
  updatedAt?: string;
  platformFeePercent?: number; // default 10%
  fixedPlatformFeeDollars?: number; // default $25 for tournaments
}

// ============================================================================
// PLAYLAB VECTOR PLAY TYPES
// ============================================================================

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

export * from './types/cardTheme';




