import { AthleteDoc, ScoutDoc, ScoutingNoteDoc, TournamentDoc, TournamentGameDoc, PoolStanding, WaiverRecord } from '../types/platform';

export const INITIAL_ATHLETE_DOCS: AthleteDoc[] = [
  {
    id: 'ath-001',
    userId: 'demo-athlete-1',
    displayName: 'Maya "Flash" Robinson',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    position: 'Quarterback / Dual Threat',
    jerseyNumber: '#7',
    gradYear: 2026,
    school: 'Sierra Canyon High School',
    cityState: 'Chatsworth, CA',
    sport: "Girls' Flag Football",
    teamName: 'SoCal Elite Vipers',
    bio: '4-year varsity starter. 2025 All-State MVP. Fast decision maker with pinpoint accuracy and elite 4.41s 40-yard dash speed.',
    metrics: {
      height: "5'9\"",
      weight: '152 lbs',
      dash40: 4.41,
      vertLeap: 34.5,
      gpa: 3.94,
      satAct: 'SAT 1360',
      ncaaId: '2604819024',
      verified: true,
      benchPress: 175,
      shuttle: 4.12
    },
    mediaUrls: [
      {
        id: 'clip-1',
        title: 'Championship Winning 45yd Touchdown Strike in Double Overtime',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        provider: 'youtube',
        tag: '#TD',
        thumbnailUrl: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=600&auto=format&fit=crop&q=80',
        duration: '0:48',
        views: 3420,
        createdAt: '2026-08-14T18:30:00Z'
      },
      {
        id: 'clip-2',
        title: 'Game 4 Highlight Reel: 5 Pass TDs, 1 Rushing TD vs Bay Area Flames',
        url: 'https://vimeo.com/76979871',
        provider: 'vimeo',
        tag: '#Highlights',
        thumbnailUrl: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=600&auto=format&fit=crop&q=80',
        duration: '2:15',
        views: 1890,
        createdAt: '2026-08-10T12:00:00Z'
      },
      {
        id: 'clip-3',
        title: 'Redzone Defensive Read & 60-Yard Pick Six Breakaway',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        provider: 'hudl',
        tag: '#Pick6',
        thumbnailUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&auto=format&fit=crop&q=80',
        duration: '0:35',
        views: 4120,
        createdAt: '2026-08-02T16:20:00Z'
      }
    ],
    waiverSigned: true,
    nextGame: {
      gameId: 'game-101',
      tournamentName: 'West Coast Summer National Showcase',
      opponent: 'Las Vegas Lightning',
      opponentLogo: '⚡',
      scheduledTime: '2026-08-19T10:30:00-07:00',
      court: 'Court 2 (North Field)',
      arrivalTime: '9:45 AM',
      venueName: 'Prime Athletics Center',
      venueAddress: '10800 Olympic Blvd, Los Angeles, CA',
      status: 'Upcoming'
    },
    seasonStats: {
      gamesPlayed: 14,
      pointsOrYards: 2480,
      assistsOrTackles: 38,
      rating: 98.4
    }
  },
  {
    id: 'ath-002',
    userId: 'demo-athlete-2',
    displayName: 'Jaden "Jet" Carter',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    position: 'Wide Receiver / Cornerback',
    jerseyNumber: '#1',
    gradYear: 2026,
    school: 'Mater Dei High School',
    cityState: 'Santa Ana, CA',
    sport: "Boys' Flag Football",
    teamName: 'California Golden Bears Club',
    bio: 'Explosive separation speed, 4.38s official combine 40-yard dash. Fluid route tree with high contested catch rate.',
    metrics: {
      height: "6'1\"",
      weight: '178 lbs',
      dash40: 4.38,
      vertLeap: 38.0,
      gpa: 3.82,
      satAct: 'ACT 28',
      ncaaId: '2604819199',
      verified: true,
      benchPress: 225,
      shuttle: 3.98
    },
    mediaUrls: [
      {
        id: 'clip-201',
        title: 'Combine Session: 4.38s 40-Yard Dash & 38-inch Vertical Leap',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        provider: 'youtube',
        tag: '#Highlights',
        thumbnailUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=600&auto=format&fit=crop&q=80',
        duration: '1:10',
        views: 5200,
        createdAt: '2026-08-01T14:00:00Z'
      }
    ],
    waiverSigned: true,
    nextGame: {
      gameId: 'game-102',
      tournamentName: 'West Coast Summer National Showcase',
      opponent: 'Texas Outlaws Flag',
      opponentLogo: '🤠',
      scheduledTime: '2026-08-19T11:45:00-07:00',
      court: 'Court 1 (Stadium Turf)',
      arrivalTime: '11:00 AM',
      venueName: 'Prime Athletics Center',
      venueAddress: '10800 Olympic Blvd, Los Angeles, CA',
      status: 'Upcoming'
    },
    seasonStats: {
      gamesPlayed: 12,
      pointsOrYards: 1640,
      assistsOrTackles: 24,
      rating: 96.8
    }
  },
  {
    id: 'ath-003',
    userId: 'demo-athlete-3',
    displayName: 'Brianna Chen',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
    position: 'Point Guard / Playmaker',
    jerseyNumber: '#3',
    gradYear: 2027,
    school: 'St. John Bosco Prep',
    cityState: 'Bellflower, CA',
    sport: 'Basketball',
    teamName: 'West Coast Premier Hoops',
    bio: 'Elite floor general with 3-level scoring. 8.4 APG average, relentless on-ball perimeter pressure.',
    metrics: {
      height: "5'8\"",
      weight: '145 lbs',
      dash40: 4.65,
      vertLeap: 31.0,
      gpa: 4.0,
      satAct: 'SAT 1420',
      ncaaId: '2704812390',
      verified: true,
      benchPress: 135,
      shuttle: 4.25
    },
    mediaUrls: [
      {
        id: 'clip-301',
        title: '32-Point Triple Double Game Tape vs Desert Storm',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        provider: 'youtube',
        tag: '#Highlights',
        thumbnailUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&auto=format&fit=crop&q=80',
        duration: '3:05',
        views: 2980,
        createdAt: '2026-08-05T20:00:00Z'
      }
    ],
    waiverSigned: true,
    nextGame: {
      gameId: 'game-103',
      tournamentName: 'West Coast Summer National Showcase',
      opponent: 'Arizona Aztecs',
      opponentLogo: '☀️',
      scheduledTime: '2026-08-19T13:00:00-07:00',
      court: 'Court 3 (East Arena)',
      arrivalTime: '12:15 PM',
      venueName: 'Prime Athletics Center',
      venueAddress: '10800 Olympic Blvd, Los Angeles, CA',
      status: 'Upcoming'
    },
    seasonStats: {
      gamesPlayed: 16,
      pointsOrYards: 390,
      assistsOrTackles: 134,
      rating: 97.2
    }
  },
  {
    id: 'ath-004',
    userId: 'demo-athlete-4',
    displayName: 'Marcus "Tank" Washington',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
    position: 'Middle Linebacker / Rusher',
    jerseyNumber: '#52',
    gradYear: 2026,
    school: 'Centennial High School',
    cityState: 'Corona, CA',
    sport: 'Tackle Football',
    teamName: 'Inland Empire Titans',
    bio: 'Heavy hitter with sideline-to-sideline motor. 118 total tackles this season, 4.58s 40-yard dash.',
    metrics: {
      height: "6'2\"",
      weight: '228 lbs',
      dash40: 4.58,
      vertLeap: 35.0,
      gpa: 3.65,
      satAct: 'SAT 1210',
      ncaaId: '2604819876',
      verified: true,
      benchPress: 315,
      shuttle: 4.18
    },
    mediaUrls: [
      {
        id: 'clip-401',
        title: 'Midseason Sacks & Run Stops Tape (12 Tackles For Loss)',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        provider: 'youtube',
        tag: '#Defense',
        thumbnailUrl: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=600&auto=format&fit=crop&q=80',
        duration: '1:55',
        views: 3100,
        createdAt: '2026-08-08T15:30:00Z'
      }
    ],
    waiverSigned: true,
    seasonStats: {
      gamesPlayed: 10,
      pointsOrYards: 118,
      assistsOrTackles: 64,
      rating: 95.5
    }
  }
];

export const INITIAL_SCOUT_DOC: ScoutDoc = {
  id: 'scout-001',
  userId: 'demo-scout-1',
  displayName: 'Coach David Vance',
  organization: 'USC Trojans / West Coast Recruiting',
  title: 'Lead Regional Talent Scout',
  avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80',
  verified: true,
  badgeLevel: 'NCAA D1',
  watchlist: ['ath-001', 'ath-002'],
  targetPositions: ['Quarterback', 'Wide Receiver', 'Cornerback', 'Point Guard'],
  targetGradYears: [2026, 2027],
  notesCount: 8
};

export const INITIAL_SCOUTING_NOTES: ScoutingNoteDoc[] = [
  {
    id: 'note-1',
    scoutId: 'scout-001',
    athleteId: 'ath-001',
    athleteName: 'Maya "Flash" Robinson',
    athletePosition: 'Quarterback',
    athleteGradYear: 2026,
    rating: 5,
    notes: 'Exceptional pocket poise under heavy blitz pressure. Arm strength is verified D1 caliber. Quick release and 4.41 speed creates constant defensive mismatch. High academic integrity (3.94 GPA). Recommended for immediate scholarship offer.',
    tags: ['D1 Lock', 'Elite Velocity', 'High IQ', '4.41 Speed'],
    recommendation: 'Must Sign',
    updatedAt: '2026-08-18T19:40:00Z'
  },
  {
    id: 'note-2',
    scoutId: 'scout-001',
    athleteId: 'ath-002',
    athleteName: 'Jaden "Jet" Carter',
    athletePosition: 'Wide Receiver',
    athleteGradYear: 2026,
    rating: 4.5,
    notes: 'Rare sudden burst off line of scrimmage. Consistently stacks defensive backs on vertical routes. Hands are reliable in wet turf conditions. Will monitor his blocking and press coverage technique on Court 1 today.',
    tags: ['Deep Threat', 'Combine Verified', '4.38 Speed'],
    recommendation: 'Strong Watch',
    updatedAt: '2026-08-17T14:15:00Z'
  }
];

export const INITIAL_TOURNAMENT_DOC: TournamentDoc = {
  id: 'tourn-101',
  directorId: 'director-001',
  title: 'West Coast Summer National Championship 2026',
  sport: "Girls' & Boys' Flag Football",
  venue: {
    name: 'Prime Athletics Complex',
    address: '10800 Olympic Blvd, Los Angeles, CA 90064',
    courtsCount: 4
  },
  status: 'live',
  delayMinutes: 15,
  delayReason: 'Court 2 scheduled match ran into Double Overtime (+15 min shift)',
  announcements: [
    {
      id: 'ann-1',
      text: '🚨 Court 2 notice: SoCal Vipers vs Las Vegas Lightning game is delayed by 15 minutes due to prior overtime.',
      timestamp: '10:15 AM',
      urgent: true,
      author: 'Tournament Director HQ'
    },
    {
      id: 'ann-2',
      text: 'Hydration stations have been restocked on Courts 1-4. Coaches check-in desk closes at 1:00 PM.',
      timestamp: '09:30 AM',
      urgent: false,
      author: 'Tournament Director HQ'
    }
  ],
  divisions: ['Varsity Gold', 'Varsity Silver', '16U Showcase', '14U Rising'],
  teamsCount: 24,
  totalRevenue: 28800,
  pendingWaiversCount: 3
};

export const INITIAL_TOURNAMENT_GAMES: TournamentGameDoc[] = [
  {
    id: 'game-101',
    tournamentId: 'tourn-101',
    courtId: 'court-2',
    courtName: 'Court 2 (North Field)',
    scheduledTime: '10:30 AM',
    homeTeam: 'SoCal Elite Vipers',
    homeTeamSeed: 1,
    awayTeam: 'Las Vegas Lightning',
    awayTeamSeed: 4,
    homeScore: 28,
    awayScore: 24,
    period: '2nd Half',
    clock: '04:18',
    isClockRunning: true,
    status: 'Live',
    referee: 'Marcus Reed (Lead Official)',
    featuredAthleteIds: ['ath-001'],
    division: 'Varsity Gold'
  },
  {
    id: 'game-102',
    tournamentId: 'tourn-101',
    courtId: 'court-1',
    courtName: 'Court 1 (Stadium Turf)',
    scheduledTime: '11:45 AM',
    homeTeam: 'California Golden Bears',
    homeTeamSeed: 2,
    awayTeam: 'Texas Outlaws Flag',
    awayTeamSeed: 3,
    homeScore: 0,
    awayScore: 0,
    period: 'Upcoming',
    clock: '20:00',
    isClockRunning: false,
    status: 'Upcoming',
    referee: 'Elena Rostova',
    featuredAthleteIds: ['ath-002'],
    division: 'Varsity Gold'
  },
  {
    id: 'game-103',
    tournamentId: 'tourn-101',
    courtId: 'court-3',
    courtName: 'Court 3 (East Arena)',
    scheduledTime: '10:00 AM',
    homeTeam: 'West Coast Hoops',
    homeTeamSeed: 1,
    awayTeam: 'Arizona Aztecs',
    awayTeamSeed: 5,
    homeScore: 56,
    awayScore: 49,
    period: 'Final',
    clock: '00:00',
    isClockRunning: false,
    status: 'Final',
    referee: 'James Washington',
    featuredAthleteIds: ['ath-003'],
    division: '16U Showcase'
  },
  {
    id: 'game-104',
    tournamentId: 'tourn-101',
    courtId: 'court-4',
    courtName: 'Court 4 (South Annex)',
    scheduledTime: '10:15 AM',
    homeTeam: 'Bay Area Flames',
    homeTeamSeed: 3,
    awayTeam: 'San Diego Surge',
    awayTeamSeed: 6,
    homeScore: 21,
    awayScore: 21,
    period: 'Halftime',
    clock: '00:00',
    isClockRunning: false,
    status: 'Halftime',
    referee: 'Troy Kelly',
    division: 'Varsity Silver'
  }
];

export const INITIAL_POOL_STANDINGS: PoolStanding[] = [
  { teamName: 'SoCal Elite Vipers', pool: 'Pool A', wins: 3, losses: 0, pointDiff: +42, seed: 1, waiverPercent: 100 },
  { teamName: 'California Golden Bears', pool: 'Pool A', wins: 2, losses: 1, pointDiff: +18, seed: 2, waiverPercent: 100 },
  { teamName: 'Texas Outlaws Flag', pool: 'Pool A', wins: 1, losses: 2, pointDiff: -8, seed: 3, waiverPercent: 92 },
  { teamName: 'Las Vegas Lightning', pool: 'Pool A', wins: 0, losses: 3, pointDiff: -52, seed: 4, waiverPercent: 100 }
];

export const INITIAL_WAIVER_RECORDS: WaiverRecord[] = [
  { id: 'w-1', athleteName: 'Maya Robinson', teamName: 'SoCal Elite Vipers', parentName: 'Angela Robinson', parentEmail: 'arobinson@gmail.com', signedAt: '2026-08-15 09:12 AM', status: 'Signed' },
  { id: 'w-2', athleteName: 'Jaden Carter', teamName: 'California Golden Bears', parentName: 'Marcus Carter', parentEmail: 'mcarter@gmail.com', signedAt: '2026-08-15 11:34 AM', status: 'Signed' },
  { id: 'w-3', athleteName: 'Brianna Chen', teamName: 'West Coast Hoops', parentName: 'Steven Chen', parentEmail: 'schen@gmail.com', signedAt: '2026-08-16 02:45 PM', status: 'Signed' },
  { id: 'w-4', athleteName: 'Kobe Miller', teamName: 'Texas Outlaws Flag', parentName: 'Derrick Miller', parentEmail: 'dmiller@gmail.com', signedAt: '-', status: 'Pending' }
];
