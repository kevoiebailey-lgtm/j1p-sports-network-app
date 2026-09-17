import type { SupportedSport } from './StatLoggerModal';
export type { SupportedSport };

export interface StatPresetValues {
  // Basketball
  bbPts?: string;
  bbReb?: string;
  bbAst?: string;
  bbStl?: string;
  bbBlk?: string;
  bb3pm?: string;
  bbFgMade?: string;
  bbFgAtt?: string;
  bbFgPct?: string;

  // Football / Flag Football
  fbPassYds?: string;
  fbPassTds?: string;
  fbRushYds?: string;
  fbRushTds?: string;
  fbRec?: string;
  fbRecYds?: string;
  fbTckl?: string;
  fbSacks?: string;
  fbInts?: string;
  fbFlagPulls?: string;

  // Soccer / Lacrosse / Field Hockey
  socGoals?: string;
  socAst?: string;
  socShots?: string;
  socGbSaves?: string;
  socCleanSheet?: boolean;

  // Wrestling
  wrWinType?: 'Pin' | 'Dec' | 'Tech Fall' | 'Major Dec' | 'Loss';
  wrTakedowns?: string;
  wrEscapes?: string;
  wrReversals?: string;
  wrWeightClass?: string;

  // Track & Combine
  tkEventTime?: string;
  tkDistance?: string;
  tkDash40?: string;
  tkVertical?: string;
  tkEventCategory?: string;

  // Cheer & Dance
  chRoutineScore?: string;
  chDifficulty?: string;
  chExecution?: string;
  chDeductions?: string;

  // Optional Context Defaults
  gameResult?: 'W' | 'L' | 'T' | 'N/A';
  finalScore?: string;
  notes?: string;
}

export interface StatPreset {
  id: string;
  name: string;
  sport: SupportedSport;
  tagline?: string;
  isSystem?: boolean;
  createdAt?: string;
  data: StatPresetValues;
}

export const DEFAULT_SPORT_PRESETS: Record<SupportedSport, StatPreset[]> = {
  basketball: [
    {
      id: 'bb-preset-sharpshooter',
      name: 'Sharpshooter Guard',
      sport: 'basketball',
      tagline: '26 PTS • 6 3PM • 57% FG',
      isSystem: true,
      data: {
        bbPts: '26',
        bbReb: '4',
        bbAst: '5',
        bbStl: '2',
        bbBlk: '0',
        bb3pm: '6',
        bbFgMade: '8',
        bbFgAtt: '14',
        bbFgPct: '57.1',
        gameResult: 'W',
        finalScore: '74-68',
        notes: 'Knocked down 6 triples with high efficiency off screens.'
      }
    },
    {
      id: 'bb-preset-doubledouble',
      name: 'Double-Double Post',
      sport: 'basketball',
      tagline: '18 PTS • 15 REB • 4 BLK',
      isSystem: true,
      data: {
        bbPts: '18',
        bbReb: '15',
        bbAst: '2',
        bbStl: '1',
        bbBlk: '4',
        bb3pm: '0',
        bbFgMade: '8',
        bbFgAtt: '12',
        bbFgPct: '66.7',
        gameResult: 'W',
        finalScore: '65-58',
        notes: 'Dominated glass with 6 offensive rebounds and 4 rim rejections.'
      }
    },
    {
      id: 'bb-preset-pointgod',
      name: 'Floor General PG',
      sport: 'basketball',
      tagline: '16 PTS • 12 AST • 4 STL',
      isSystem: true,
      data: {
        bbPts: '16',
        bbReb: '5',
        bbAst: '12',
        bbStl: '4',
        bbBlk: '1',
        bb3pm: '2',
        bbFgMade: '6',
        bbFgAtt: '11',
        bbFgPct: '54.5',
        gameResult: 'W',
        finalScore: '82-71',
        notes: 'Paced offense with 12 assists and controlled tempo in transition.'
      }
    },
    {
      id: 'bb-preset-lockdown',
      name: 'Lockdown Wing',
      sport: 'basketball',
      tagline: '12 PTS • 8 REB • 5 STL',
      isSystem: true,
      data: {
        bbPts: '12',
        bbReb: '8',
        bbAst: '4',
        bbStl: '5',
        bbBlk: '2',
        bb3pm: '1',
        bbFgMade: '5',
        bbFgAtt: '9',
        bbFgPct: '55.6',
        gameResult: 'W',
        finalScore: '59-52',
        notes: 'Locked down opposing primary scorer and generated 5 steals.'
      }
    }
  ],

  football: [
    {
      id: 'fb-preset-gunslinger',
      name: 'Gunslinger QB',
      sport: 'football',
      tagline: '295 PASS YDS • 4 TDS • 0 INT',
      isSystem: true,
      data: {
        fbPassYds: '295',
        fbPassTds: '4',
        fbRushYds: '24',
        fbRushTds: '0',
        fbRec: '0',
        fbRecYds: '0',
        fbTckl: '0',
        fbSacks: '0',
        fbInts: '0',
        fbFlagPulls: '0',
        gameResult: 'W',
        finalScore: '35-21',
        notes: 'Commanded red zone scoring with 4 passing touchdowns.'
      }
    },
    {
      id: 'fb-preset-dualthreat',
      name: 'Dual-Threat QB',
      sport: 'football',
      tagline: '215 PASS • 85 RUSH • 3 TOTAL TD',
      isSystem: true,
      data: {
        fbPassYds: '215',
        fbPassTds: '2',
        fbRushYds: '85',
        fbRushTds: '1',
        fbRec: '0',
        fbRecYds: '0',
        fbTckl: '0',
        fbSacks: '0',
        fbInts: '0',
        fbFlagPulls: '0',
        gameResult: 'W',
        finalScore: '28-17',
        notes: 'Exploited zone coverage and scrambled for 85 yards.'
      }
    },
    {
      id: 'fb-preset-workhorse-rb',
      name: 'Workhorse RB',
      sport: 'football',
      tagline: '145 RUSH YDS • 2 TDS • 4 REC',
      isSystem: true,
      data: {
        fbPassYds: '0',
        fbPassTds: '0',
        fbRushYds: '145',
        fbRushTds: '2',
        fbRec: '4',
        fbRecYds: '36',
        fbTckl: '0',
        fbSacks: '0',
        fbInts: '0',
        fbFlagPulls: '0',
        gameResult: 'W',
        finalScore: '24-14',
        notes: 'Hard-nosed running with 145 yards on 22 carries.'
      }
    },
    {
      id: 'fb-preset-defensive-mvp',
      name: 'Defensive MVP / Edge',
      sport: 'football',
      tagline: '9 TCKL • 2.5 SACKS • 1 INT • 4 PULLS',
      isSystem: true,
      data: {
        fbPassYds: '0',
        fbPassTds: '0',
        fbRushYds: '0',
        fbRushTds: '0',
        fbRec: '0',
        fbRecYds: '0',
        fbTckl: '9',
        fbSacks: '2.5',
        fbInts: '1',
        fbFlagPulls: '4',
        gameResult: 'W',
        finalScore: '17-10',
        notes: 'Disrupted backfield all game with 2.5 sacks and a 4th quarter INT.'
      }
    }
  ],

  soccer: [
    {
      id: 'soc-preset-hattrick',
      name: 'Hat-Trick Striker',
      sport: 'soccer',
      tagline: '3 GOALS • 1 AST • 6 SHOTS',
      isSystem: true,
      data: {
        socGoals: '3',
        socAst: '1',
        socShots: '6',
        socGbSaves: '0',
        socCleanSheet: false,
        gameResult: 'W',
        finalScore: '4-2',
        notes: 'Scored clinical hat-trick including game winner in 78th minute.'
      }
    },
    {
      id: 'soc-preset-playmaker',
      name: 'Playmaking Midfielder',
      sport: 'soccer',
      tagline: '1 GOAL • 3 AST • 4 SHOTS',
      isSystem: true,
      data: {
        socGoals: '1',
        socAst: '3',
        socShots: '4',
        socGbSaves: '3',
        socCleanSheet: true,
        gameResult: 'W',
        finalScore: '4-0',
        notes: 'Created 5 scoring chances and registered 3 assists.'
      }
    },
    {
      id: 'soc-preset-cleansheet-gk',
      name: 'Clean Sheet Goalkeeper',
      sport: 'soccer',
      tagline: '0 GA • 8 SAVES • CLEAN SHEET',
      isSystem: true,
      data: {
        socGoals: '0',
        socAst: '0',
        socShots: '0',
        socGbSaves: '8',
        socCleanSheet: true,
        gameResult: 'W',
        finalScore: '1-0',
        notes: 'Stopped 8 shots on target including diving fingertip save.'
      }
    }
  ],

  lacrosse: [
    {
      id: 'lax-preset-attack-mvp',
      name: 'Attack Scoring MVP',
      sport: 'lacrosse',
      tagline: '4 GOALS • 2 AST • 6 GROUND BALLS',
      isSystem: true,
      data: {
        socGoals: '4',
        socAst: '2',
        socShots: '8',
        socGbSaves: '6',
        socCleanSheet: false,
        gameResult: 'W',
        finalScore: '12-9',
        notes: 'Led offensive charge with 4 goals and 6 ground ball pickups.'
      }
    },
    {
      id: 'lax-preset-wall-goalie',
      name: 'Wall Goalkeeper',
      sport: 'lacrosse',
      tagline: '15 SAVES • 4 GROUND BALLS',
      isSystem: true,
      data: {
        socGoals: '0',
        socAst: '1',
        socShots: '0',
        socGbSaves: '15',
        socCleanSheet: false,
        gameResult: 'W',
        finalScore: '8-6',
        notes: 'Maintained 71% save rate against high-caliber shooters.'
      }
    }
  ],

  field_hockey: [
    {
      id: 'fh-preset-forward',
      name: 'Striking Forward',
      sport: 'field_hockey',
      tagline: '2 GOALS • 2 AST • 5 SHOTS',
      isSystem: true,
      data: {
        socGoals: '2',
        socAst: '2',
        socShots: '5',
        socGbSaves: '2',
        socCleanSheet: true,
        gameResult: 'W',
        finalScore: '3-0',
        notes: 'Converted penalty corner and assisted on breakaway goal.'
      }
    },
    {
      id: 'fh-preset-shutout-gk',
      name: 'Shutout Goalie',
      sport: 'field_hockey',
      tagline: '10 SAVES • CLEAN SHEET',
      isSystem: true,
      data: {
        socGoals: '0',
        socAst: '0',
        socShots: '0',
        socGbSaves: '10',
        socCleanSheet: true,
        gameResult: 'W',
        finalScore: '2-0',
        notes: 'Recorded 10 saves to seal clean sheet victory.'
      }
    }
  ],

  wrestling: [
    {
      id: 'wr-preset-first-period-pin',
      name: 'First-Period Pin (Fall)',
      sport: 'wrestling',
      tagline: 'PIN (FALL) • 2 TAKEDOWNS',
      isSystem: true,
      data: {
        wrWinType: 'Pin',
        wrTakedowns: '2',
        wrEscapes: '0',
        wrReversals: '0',
        wrWeightClass: '152 lbs',
        gameResult: 'W',
        finalScore: 'Fall 1:42',
        notes: 'Secured cradle and pinned opponent at 1:42 in the 1st period.'
      }
    },
    {
      id: 'wr-preset-tech-fall',
      name: 'Technical Fall (TF)',
      sport: 'wrestling',
      tagline: 'TECH FALL • 6 TAKEDOWNS • 2 REVERSALS',
      isSystem: true,
      data: {
        wrWinType: 'Tech Fall',
        wrTakedowns: '6',
        wrEscapes: '1',
        wrReversals: '2',
        wrWeightClass: '152 lbs',
        gameResult: 'W',
        finalScore: '18-2 TF',
        notes: 'Mercy tech-fall stoppage with relentless takedowns and turns.'
      }
    },
    {
      id: 'wr-preset-major-dec',
      name: 'Major Decision (MD)',
      sport: 'wrestling',
      tagline: 'MAJOR DEC • 4 TAKEDOWNS • 2 ESCAPES',
      isSystem: true,
      data: {
        wrWinType: 'Major Dec',
        wrTakedowns: '4',
        wrEscapes: '2',
        wrReversals: '1',
        wrWeightClass: '152 lbs',
        gameResult: 'W',
        finalScore: '12-3 MD',
        notes: 'Controlled match pacing throughout all 3 periods.'
      }
    }
  ],

  track_field: [
    {
      id: 'tk-preset-elite-100m',
      name: 'Elite 100m Sprinter',
      sport: 'track_field',
      tagline: '10.65s (100m) • 4.38s (40yd)',
      isSystem: true,
      data: {
        tkEventCategory: '100m Sprint',
        tkEventTime: '10.65',
        tkDistance: "22' 8\"",
        tkDash40: '4.38',
        tkVertical: '38.5',
        gameResult: 'W',
        finalScore: '1st Place (Gold)',
        notes: 'New personal record; won heat and championship final.'
      }
    },
    {
      id: 'tk-preset-combine-power',
      name: 'Combine Testing Phenom',
      sport: 'track_field',
      tagline: '4.42s 40yd • 40.0" VERT • 23\' 4" JUMP',
      isSystem: true,
      data: {
        tkEventCategory: 'Combine Pro-Day',
        tkEventTime: '10.82',
        tkDistance: "23' 4\"",
        tkDash40: '4.42',
        tkVertical: '40.0',
        gameResult: 'W',
        finalScore: 'Top 1% Percentile',
        notes: 'Top overall SPARQ rating at regional combine showcase.'
      }
    }
  ],

  cheer: [
    {
      id: 'ch-preset-grand-champ',
      name: 'Grand Champion Routine',
      sport: 'cheer',
      tagline: '96.8 SCORE • 9.8 DIFF • ZERO DED',
      isSystem: true,
      data: {
        chRoutineScore: '96.8',
        chDifficulty: '9.8',
        chExecution: '9.7',
        chDeductions: '0.0',
        gameResult: 'W',
        finalScore: '1st Place (Grand Champions)',
        notes: 'Flawless hit routine with zero stunt deductions.'
      }
    },
    {
      id: 'ch-preset-high-diff',
      name: 'Elite Level 6 Showcase',
      sport: 'cheer',
      tagline: '94.2 SCORE • 9.9 DIFF • 9.4 EXEC',
      isSystem: true,
      data: {
        chRoutineScore: '94.2',
        chDifficulty: '9.9',
        chExecution: '9.4',
        chDeductions: '0.2',
        gameResult: 'W',
        finalScore: 'Top 3 Bid Qualifier',
        notes: 'Executed hardest tumbling and co-ed stunt sequences.'
      }
    }
  ]
};

const STORAGE_KEY_PREFIX = 'just1play_custom_stat_presets_';

export function getCustomPresets(athleteId: string = 'global'): StatPreset[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${athleteId}`);
    if (!raw) return [];
    return JSON.parse(raw) as StatPreset[];
  } catch (err) {
    console.warn('Failed to parse custom stat presets from localStorage:', err);
    return [];
  }
}

export function saveCustomPreset(
  athleteId: string = 'global',
  presetData: { name: string; sport: SupportedSport; tagline?: string; data: StatPresetValues }
): StatPreset {
  const existing = getCustomPresets(athleteId);
  const newPreset: StatPreset = {
    id: `custom-preset-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: presetData.name,
    sport: presetData.sport,
    tagline: presetData.tagline || 'Custom Athlete Preset',
    isSystem: false,
    createdAt: new Date().toISOString(),
    data: presetData.data
  };

  const updated = [newPreset, ...existing];
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${athleteId}`, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save preset to localStorage:', err);
  }
  return newPreset;
}

export function deleteCustomPreset(athleteId: string = 'global', presetId: string): StatPreset[] {
  const existing = getCustomPresets(athleteId);
  const filtered = existing.filter((p) => p.id !== presetId);
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${athleteId}`, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to delete preset from localStorage:', err);
  }
  return filtered;
}
