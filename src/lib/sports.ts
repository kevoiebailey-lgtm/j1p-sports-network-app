import React from 'react';

export interface SportDefinition {
  name: string;
  emoji: string;
  category: string;
  popularPositions: string[];
  defaultStatFields: { key: string; label: string; placeholder: string; unit?: string }[];
}

export const SPORTS_CATEGORIES: { name: string; sports: SportDefinition[] }[] = [
  {
    name: 'Ball & Team Sports',
    sports: [
      {
        name: 'Basketball',
        emoji: '🏀',
        category: 'Ball & Team Sports',
        popularPositions: ['Point Guard (PG)', 'Shooting Guard (SG)', 'Small Forward (SF)', 'Power Forward (PF)', 'Center (C)'],
        defaultStatFields: [
          { key: 'points', label: 'Points Per Game (PPG)', placeholder: '22.4' },
          { key: 'rebounds', label: 'Rebounds Per Game (RPG)', placeholder: '6.5' },
          { key: 'assists', label: 'Assists Per Game (APG)', placeholder: '7.2' },
          { key: 'steals', label: 'Steals Per Game (SPG)', placeholder: '2.1' },
          { key: 'blocks', label: 'Blocks Per Game (BPG)', placeholder: '0.8' },
          { key: 'gamesPlayed', label: 'Games Played', placeholder: '24' }
        ]
      },
      {
        name: 'Flag Football',
        emoji: '🏈',
        category: 'Ball & Team Sports',
        popularPositions: ['Quarterback (QB)', 'Wide Receiver (WR)', 'Russher / Blitzer', 'Center / Snapper', 'Defensive Back (DB)', 'Safety'],
        defaultStatFields: [
          { key: 'passingYards', label: 'Passing Yards', placeholder: '2100' },
          { key: 'passingTds', label: 'Passing Touchdowns', placeholder: '28' },
          { key: 'rushingYards', label: 'Rushing Yards', placeholder: '650' },
          { key: 'flagPulls', label: 'Flag Pulls', placeholder: '45' },
          { key: 'interceptions', label: 'Interceptions (INT)', placeholder: '11' },
          { key: 'gamesPlayed', label: 'Games Played', placeholder: '14' }
        ]
      },
      {
        name: 'American Football',
        emoji: '🏈',
        category: 'Ball & Team Sports',
        popularPositions: ['Quarterback (QB)', 'Running Back (RB)', 'Wide Receiver (WR)', 'Tight End (TE)', 'Offensive Line (OL)', 'Defensive End (DE)', 'Linebacker (LB)', 'Cornerback (CB)', 'Safety (S)', 'Kicker (K)'],
        defaultStatFields: [
          { key: 'passingYards', label: 'Passing Yards', placeholder: '2450' },
          { key: 'rushingYards', label: 'Rushing Yards', placeholder: '890' },
          { key: 'touchdowns', label: 'Total Touchdowns', placeholder: '24' },
          { key: 'tackles', label: 'Total Tackles', placeholder: '68' },
          { key: 'sacks', label: 'Sacks', placeholder: '8.5' },
          { key: 'gamesPlayed', label: 'Games Played', placeholder: '10' }
        ]
      },
      {
        name: 'Soccer',
        emoji: '⚽',
        category: 'Ball & Team Sports',
        popularPositions: ['Goalkeeper (GK)', 'Center Back (CB)', 'Full Back (LB/RB)', 'Central Midfielder (CM)', 'Winger (LW/RW)', 'Striker / Forward (ST)'],
        defaultStatFields: [
          { key: 'goals', label: 'Goals Scored', placeholder: '18' },
          { key: 'assists', label: 'Assists', placeholder: '12' },
          { key: 'shotsOnGoal', label: 'Shots on Goal', placeholder: '42' },
          { key: 'tacklesWon', label: 'Tackles Won', placeholder: '35' },
          { key: 'cleanSheets', label: 'Clean Sheets (GK)', placeholder: '8' },
          { key: 'gamesPlayed', label: 'Matches Played', placeholder: '22' }
        ]
      },
      {
        name: 'Volleyball',
        emoji: '🏐',
        category: 'Ball & Team Sports',
        popularPositions: ['Outside Hitter (OH)', 'Middle Blocker (MB)', 'Right Side Hitter (OPP)', 'Setter (S)', 'Libero (L)', 'Defensive Specialist (DS)'],
        defaultStatFields: [
          { key: 'kills', label: 'Kills', placeholder: '240' },
          { key: 'digs', label: 'Digs', placeholder: '180' },
          { key: 'assists', label: 'Assists', placeholder: '320' },
          { key: 'aces', label: 'Service Aces', placeholder: '42' },
          { key: 'blocks', label: 'Total Blocks', placeholder: '38' },
          { key: 'gamesPlayed', label: 'Matches Played', placeholder: '26' }
        ]
      },
      {
        name: 'Baseball',
        emoji: '⚾',
        category: 'Ball & Team Sports',
        popularPositions: ['Pitcher (P)', 'Catcher (C)', 'First Base (1B)', 'Second Base (2B)', 'Third Base (3B)', 'Shortstop (SS)', 'Outfield (OF)'],
        defaultStatFields: [
          { key: 'battingAvg', label: 'Batting Average (AVG)', placeholder: '.385' },
          { key: 'homeRuns', label: 'Home Runs (HR)', placeholder: '12' },
          { key: 'rbis', label: 'Runs Batted In (RBI)', placeholder: '45' },
          { key: 'stolenBases', label: 'Stolen Bases (SB)', placeholder: '18' },
          { key: 'era', label: 'Earned Run Avg (ERA)', placeholder: '2.15' },
          { key: 'strikeouts', label: 'Pitching Strikeouts (K)', placeholder: '84' }
        ]
      },
      {
        name: 'Softball',
        emoji: '🥎',
        category: 'Ball & Team Sports',
        popularPositions: ['Pitcher (P)', 'Catcher (C)', 'Infield (IF)', 'Outfield (OF)', 'Utility (UT)'],
        defaultStatFields: [
          { key: 'battingAvg', label: 'Batting Average', placeholder: '.412' },
          { key: 'homeRuns', label: 'Home Runs', placeholder: '10' },
          { key: 'rbis', label: 'RBIs', placeholder: '38' },
          { key: 'stolenBases', label: 'Stolen Bases', placeholder: '22' },
          { key: 'strikeouts', label: 'Pitching Strikeouts', placeholder: '92' },
          { key: 'gamesPlayed', label: 'Games Played', placeholder: '28' }
        ]
      },
      {
        name: 'Rugby',
        emoji: '🏉',
        category: 'Ball & Team Sports',
        popularPositions: ['Prop', 'Hooker', 'Lock', 'Flanker', 'Scrum-half', 'Fly-half', 'Center', 'Wing', 'Fullback'],
        defaultStatFields: [
          { key: 'tries', label: 'Tries Scored', placeholder: '14' },
          { key: 'tackles', label: 'Tackles Made', placeholder: '82' },
          { key: 'conversions', label: 'Conversions / Kicks', placeholder: '24' },
          { key: 'metersGained', label: 'Meters Gained', placeholder: '620' },
          { key: 'gamesPlayed', label: 'Matches Played', placeholder: '12' }
        ]
      },
      {
        name: 'Beach Volleyball',
        emoji: '🏖️',
        category: 'Ball & Team Sports',
        popularPositions: ['Blocker', 'Defender', 'All-Around'],
        defaultStatFields: [
          { key: 'kills', label: 'Kills', placeholder: '180' },
          { key: 'digs', label: 'Digs', placeholder: '140' },
          { key: 'aces', label: 'Aces', placeholder: '35' },
          { key: 'blocks', label: 'Blocks', placeholder: '28' }
        ]
      },
      {
        name: 'Water Polo',
        emoji: '🤽',
        category: 'Ball & Team Sports',
        popularPositions: ['Goalkeeper', 'Center Forward (Hole Set)', 'Point / Driver', 'Wing', 'Flat'],
        defaultStatFields: [
          { key: 'goals', label: 'Goals', placeholder: '38' },
          { key: 'assists', label: 'Assists', placeholder: '22' },
          { key: 'steals', label: 'Steals', placeholder: '29' },
          { key: 'saves', label: 'Saves (GK)', placeholder: '110' }
        ]
      }
    ]
  },
  {
    name: 'Stick & Racket Sports',
    sports: [
      {
        name: 'Lacrosse',
        emoji: '🥍',
        category: 'Stick & Racket Sports',
        popularPositions: ['Attack', 'Midfield (Middie)', 'Defense (LSM/Close D)', 'Goalie (G)', 'Faceoff Specialist (FOGO)'],
        defaultStatFields: [
          { key: 'goals', label: 'Goals', placeholder: '48' },
          { key: 'assists', label: 'Assists', placeholder: '26' },
          { key: 'groundBalls', label: 'Ground Balls', placeholder: '38' },
          { key: 'drawControls', label: 'Draw Controls / Faceoffs', placeholder: '15' },
          { key: 'causedTurnovers', label: 'Caused Turnovers', placeholder: '10' },
          { key: 'gamesPlayed', label: 'Games Played', placeholder: '18' }
        ]
      },
      {
        name: 'Field Hockey',
        emoji: '🏑',
        category: 'Stick & Racket Sports',
        popularPositions: ['Forward', 'Midfielder', 'Defender', 'Goalkeeper'],
        defaultStatFields: [
          { key: 'goals', label: 'Goals', placeholder: '22' },
          { key: 'assists', label: 'Assists', placeholder: '14' },
          { key: 'shotsOnGoal', label: 'Shots on Goal', placeholder: '48' },
          { key: 'tackles', label: 'Tackles', placeholder: '32' },
          { key: 'gamesPlayed', label: 'Matches Played', placeholder: '16' }
        ]
      },
      {
        name: 'Ice Hockey',
        emoji: '🏒',
        category: 'Stick & Racket Sports',
        popularPositions: ['Center (C)', 'Left Wing (LW)', 'Right Wing (RW)', 'Defenseman (D)', 'Goalie (G)'],
        defaultStatFields: [
          { key: 'goals', label: 'Goals', placeholder: '28' },
          { key: 'assists', label: 'Assists', placeholder: '34' },
          { key: 'points', label: 'Total Points', placeholder: '62' },
          { key: 'plusMinus', label: '+/- Rating', placeholder: '+18' },
          { key: 'savePct', label: 'Save % (Goalie)', placeholder: '.925' },
          { key: 'gamesPlayed', label: 'Games Played', placeholder: '30' }
        ]
      },
      {
        name: 'Tennis',
        emoji: '🎾',
        category: 'Stick & Racket Sports',
        popularPositions: ['Singles Player', 'Doubles Player'],
        defaultStatFields: [
          { key: 'matchRecord', label: 'Match Record (W-L)', placeholder: '18-3' },
          { key: 'aces', label: 'Aces', placeholder: '85' },
          { key: 'firstServePct', label: '1st Serve %', placeholder: '68%' },
          { key: 'breakPointsWon', label: 'Break Points Won %', placeholder: '54%' }
        ]
      },
      {
        name: 'Pickleball',
        emoji: '🏓',
        category: 'Stick & Racket Sports',
        popularPositions: ['Singles', 'Doubles', 'Mixed Doubles'],
        defaultStatFields: [
          { key: 'wins', label: 'Matches Won', placeholder: '24' },
          { key: 'duprRating', label: 'DUPR Rating', placeholder: '4.85' },
          { key: 'dinkAccuracy', label: 'Third Shot Drop %', placeholder: '72%' }
        ]
      },
      {
        name: 'Badminton',
        emoji: '🏸',
        category: 'Stick & Racket Sports',
        popularPositions: ['Singles', 'Doubles'],
        defaultStatFields: [
          { key: 'wins', label: 'Matches Won', placeholder: '19' },
          { key: 'smashSpeed', label: 'Max Smash Speed (mph)', placeholder: '185' }
        ]
      },
      {
        name: 'Squash / Racquetball',
        emoji: '🎾',
        category: 'Stick & Racket Sports',
        popularPositions: ['Singles', 'Doubles'],
        defaultStatFields: [
          { key: 'wins', label: 'Match Wins', placeholder: '16' },
          { key: 'ranking', label: 'State / Regional Rank', placeholder: 'Top 5' }
        ]
      },
      {
        name: 'Golf',
        emoji: '⛳',
        category: 'Stick & Racket Sports',
        popularPositions: ['Tournament Player', 'Amateur Competitor'],
        defaultStatFields: [
          { key: 'handicap', label: 'Handicap Index', placeholder: '+1.2' },
          { key: 'scoringAvg', label: 'Scoring Average', placeholder: '71.4' },
          { key: 'greensInReg', label: 'Greens in Regulation %', placeholder: '74%' },
          { key: 'driveDistance', label: 'Avg Drive Distance (yds)', placeholder: '295' }
        ]
      }
    ]
  },
  {
    name: 'Combat & Athletic Discipline',
    sports: [
      {
        name: 'Wrestling',
        emoji: '🤼',
        category: 'Combat & Athletic Discipline',
        popularPositions: ['106 lbs', '120 lbs', '132 lbs', '145 lbs', '160 lbs', '182 lbs', '220 lbs', 'Heavyweight (285)'],
        defaultStatFields: [
          { key: 'record', label: 'Record (W-L)', placeholder: '34-2' },
          { key: 'pins', label: 'Wins by Pin (Fall)', placeholder: '19' },
          { key: 'takedowns', label: 'Takedowns', placeholder: '82' },
          { key: 'techFalls', label: 'Technical Falls', placeholder: '7' },
          { key: 'statePlacing', label: 'State Rank / Placing', placeholder: '1st Place State' }
        ]
      },
      {
        name: 'Boxing',
        emoji: '🥊',
        category: 'Combat & Athletic Discipline',
        popularPositions: ['Flyweight', 'Featherweight', 'Lightweight', 'Welterweight', 'Middleweight', 'Heavyweight'],
        defaultStatFields: [
          { key: 'record', label: 'Amateur Record (W-L-D)', placeholder: '18-1-0' },
          { key: 'kos', label: 'Knockouts (KOs)', placeholder: '9' },
          { key: 'reach', label: 'Reach (inches)', placeholder: '72"' }
        ]
      },
      {
        name: 'Judo / BJJ / MMA',
        emoji: '🥋',
        category: 'Combat & Athletic Discipline',
        popularPositions: ['Featherweight', 'Lightweight', 'Welterweight', 'Middleweight', 'Open Weight'],
        defaultStatFields: [
          { key: 'record', label: 'Fight Record (W-L)', placeholder: '12-0' },
          { key: 'submissions', label: 'Submissions', placeholder: '8' },
          { key: 'beltRank', label: 'Belt Rank', placeholder: 'Purple Belt' }
        ]
      },
      {
        name: 'Gymnastics',
        emoji: '🤸',
        category: 'Combat & Athletic Discipline',
        popularPositions: ['All-Around', 'Vault', 'Uneven Bars', 'Balance Beam', 'Floor Exercise'],
        defaultStatFields: [
          { key: 'allAroundScore', label: 'All-Around High Score', placeholder: '38.450' },
          { key: 'vaultScore', label: 'Vault High', placeholder: '9.825' },
          { key: 'barsScore', label: 'Bars High', placeholder: '9.750' },
          { key: 'beamScore', label: 'Beam High', placeholder: '9.650' },
          { key: 'floorScore', label: 'Floor High', placeholder: '9.850' }
        ]
      },
      {
        name: 'Cheerleading',
        emoji: '📣',
        category: 'Combat & Athletic Discipline',
        popularPositions: ['Flyer', 'Base', 'Backspot', 'Tumbler', 'Stunt Specialist'],
        defaultStatFields: [
          { key: 'tumblingPass', label: 'Highest Tumbling Skill', placeholder: 'Full-In / Layout' },
          { key: 'stuntLevel', label: 'Stunt Level', placeholder: 'Level 6 Elite' },
          { key: 'compTitles', label: 'Championship Titles', placeholder: 'NCA National Champ' }
        ]
      },
      {
        name: 'Dance Team',
        emoji: '💃',
        category: 'Combat & Athletic Discipline',
        popularPositions: ['Jazz', 'Hip Hop', 'Pom', 'Contemporary', 'Captain'],
        defaultStatFields: [
          { key: 'leapsTurns', label: 'Signature Skill', placeholder: 'Quad Pirouette / Switch Leap' },
          { key: 'awards', label: 'Solo / Team Titles', placeholder: '1st Place Regional Solo' }
        ]
      }
    ]
  },
  {
    name: 'Track, Field & Aquatics',
    sports: [
      {
        name: 'Track & Field',
        emoji: '🏃',
        category: 'Track, Field & Aquatics',
        popularPositions: ['100m/200m Sprinter', '400m/800m Mid-Distance', 'Hurdler (110m/300m)', 'Long Jump / Triple Jump', 'High Jump / Pole Vault', 'Shot Put / Discus / Javelin'],
        defaultStatFields: [
          { key: 'pr100m', label: '100m Personal Record (PR)', placeholder: '10.52s' },
          { key: 'pr200m', label: '200m PR', placeholder: '21.40s' },
          { key: 'pr400m', label: '400m PR', placeholder: '48.10s' },
          { key: 'fieldPR', label: 'Field Event PR', placeholder: '23\'4" Long Jump' }
        ]
      },
      {
        name: 'Cross Country',
        emoji: '🏃‍♀️',
        category: 'Track, Field & Aquatics',
        popularPositions: ['Varsity Runner', 'Pacer', 'Team Captain'],
        defaultStatFields: [
          { key: 'pr5k', label: '5K PR Time', placeholder: '15:42.0' },
          { key: 'pr3mile', label: '3-Mile PR', placeholder: '15:10.5' },
          { key: 'avgPace', label: 'Average Mile Pace', placeholder: '5:03/mi' }
        ]
      },
      {
        name: 'Swimming & Diving',
        emoji: '🏊',
        category: 'Track, Field & Aquatics',
        popularPositions: ['Freestyle', 'Backstroke', 'Breaststroke', 'Butterfly', 'Individual Medley (IM)', '1m / 3m Diver'],
        defaultStatFields: [
          { key: 'pr50free', label: '50 Free PR', placeholder: '20.85s' },
          { key: 'pr100fly', label: '100 Butterfly PR', placeholder: '49.10s' },
          { key: 'pr200im', label: '200 IM PR', placeholder: '1:52.40' },
          { key: 'diveScore', label: '6-Dive High Score', placeholder: '285.50' }
        ]
      },
      {
        name: 'Rowing / Crew',
        emoji: '🚣',
        category: 'Track, Field & Aquatics',
        popularPositions: ['Coxswain', 'Stroke Seat', 'Engine Room (4/5/6)', 'Bow Seat'],
        defaultStatFields: [
          { key: 'erg2k', label: '2,000m Erg PR', placeholder: '6:12.5' },
          { key: 'erg6k', label: '6,000m Erg PR', placeholder: '20:15.0' },
          { key: 'watts', label: 'Peak Power (Watts)', placeholder: '750W' }
        ]
      },
      {
        name: 'Weightlifting / Powerlifting',
        emoji: '🏋️',
        category: 'Track, Field & Aquatics',
        popularPositions: ['Under 67kg', 'Under 81kg', 'Under 96kg', 'Heavyweight'],
        defaultStatFields: [
          { key: 'squat', label: 'Max Squat (lbs)', placeholder: '455 lbs' },
          { key: 'bench', label: 'Max Bench Press (lbs)', placeholder: '315 lbs' },
          { key: 'deadlift', label: 'Max Deadlift (lbs)', placeholder: '525 lbs' },
          { key: 'total', label: 'Powerlifting Total', placeholder: '1295 lbs' }
        ]
      }
    ]
  },
  {
    name: 'Precision & Action Sports',
    sports: [
      {
        name: 'Cycling / BMX',
        emoji: '🚴',
        category: 'Precision & Action Sports',
        popularPositions: ['Road Cycling', 'Mountain Biking (XC)', 'BMX Racing', 'Track Cycling'],
        defaultStatFields: [
          { key: 'ftp', label: 'Functional Threshold Power (FTP)', placeholder: '340 Watts' },
          { key: 'wattsPerKg', label: 'Watts / kg', placeholder: '4.8 W/kg' }
        ]
      },
      {
        name: 'Equestrian',
        emoji: '🐎',
        category: 'Precision & Action Sports',
        popularPositions: ['Show Jumping', 'Dressage', 'Eventing', 'Hunter/Jumper'],
        defaultStatFields: [
          { key: 'jumpHeight', label: 'Max Competition Height', placeholder: '1.25m' },
          { key: 'placements', label: 'Grand Prix Placements', placeholder: '1st Place Regional' }
        ]
      },
      {
        name: 'Esports',
        emoji: '🎮',
        category: 'Precision & Action Sports',
        popularPositions: ['In-Game Leader (IGL)', 'Entry Fragger', 'Sniper / AWPer', 'Support / Anchor'],
        defaultStatFields: [
          { key: 'rank', label: 'Global / In-Game Rank', placeholder: 'Radiant / Grandmaster' },
          { key: 'kda', label: 'KDA Ratio', placeholder: '2.45' },
          { key: 'tournamentEarnings', label: 'Tournament Titles', placeholder: 'State Champ 2026' }
        ]
      },
      {
        name: 'Ultimate Frisbee',
        emoji: '🥏',
        category: 'Precision & Action Sports',
        popularPositions: ['Handler', 'Cutter', 'Deep Threat'],
        defaultStatFields: [
          { key: 'assists', label: 'Assists', placeholder: '38' },
          { key: 'goals', label: 'Goals', placeholder: '29' },
          { key: 'blocks', label: 'D-Line Blocks', placeholder: '24' }
        ]
      },
      {
        name: 'Bowling',
        emoji: '🎳',
        category: 'Precision & Action Sports',
        popularPositions: ['Anchor', 'Lead-off', 'Two-Handed', 'Traditional One-Handed'],
        defaultStatFields: [
          { key: 'avgScore', label: 'Average Game Score', placeholder: '215.4' },
          { key: 'highGame', label: 'High Game Score', placeholder: '300 Perfect' },
          { key: 'highSeries', label: 'High 3-Game Series', placeholder: '782' }
        ]
      },
      {
        name: 'Archery',
        emoji: '🏹',
        category: 'Precision & Action Sports',
        popularPositions: ['Recurve Bow', 'Compound Bow', 'Barebow'],
        defaultStatFields: [
          { key: 'score720', label: '72-Arrow 70m Score', placeholder: '672 / 720' },
          { key: 'tensCount', label: '10s & X Count', placeholder: '38' }
        ]
      }
    ]
  }
];

// Flat map of all sports definitions
export const ALL_SPORTS_MAP = new Map<string, SportDefinition>();
SPORTS_CATEGORIES.forEach((cat) => {
  cat.sports.forEach((sp) => {
    ALL_SPORTS_MAP.set(sp.name, sp);
  });
});

export const POPULAR_SPORTS_LIST = Array.from(ALL_SPORTS_MAP.keys());

export function getSportEmoji(sportName: string): string {
  if (!sportName) return '🏆';
  const found = ALL_SPORTS_MAP.get(sportName);
  if (found) return found.emoji;
  
  // Fuzzy match or fallback
  const lower = sportName.toLowerCase();
  if (lower.includes('basket')) return '🏀';
  if (lower.includes('foot') || lower.includes('flag')) return '🏈';
  if (lower.includes('socc')) return '⚽';
  if (lower.includes('base') || lower.includes('soft')) return '⚾';
  if (lower.includes('volley')) return '🏐';
  if (lower.includes('track') || lower.includes('run')) return '🏃';
  if (lower.includes('swim')) return '🏊';
  if (lower.includes('wrestl')) return '🤼';
  if (lower.includes('lax') || lower.includes('lacrosse')) return '🥍';
  if (lower.includes('cheer') || lower.includes('dance')) return '📣';
  if (lower.includes('golf')) return '⛳';
  if (lower.includes('tennis')) return '🎾';
  if (lower.includes('hock')) return '🏒';
  if (lower.includes('box')) return '🥊';
  
  return '🏆';
}

export function getSportDefinition(sportName: string): SportDefinition {
  const found = ALL_SPORTS_MAP.get(sportName);
  if (found) return found;

  // Generic fallback for custom typed-in sport
  return {
    name: sportName || 'Custom Sport',
    emoji: getSportEmoji(sportName),
    category: 'Other Sport',
    popularPositions: ['Athlete', 'Starter', 'Captain', 'Competitor', 'Utility'],
    defaultStatFields: [
      { key: 'points', label: 'Points / Score Avg', placeholder: '18.5' },
      { key: 'assists', label: 'Assists / Primary Metric', placeholder: '5.2' },
      { key: 'rebounds', label: 'Defensive / Secondary Metric', placeholder: '6.0' },
      { key: 'wins', label: 'Games / Wins', placeholder: '15' }
    ]
  };
}
