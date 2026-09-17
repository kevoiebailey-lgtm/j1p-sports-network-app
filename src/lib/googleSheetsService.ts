/**
 * Google Sheets API v4 and Drive Service Layer for Just1Play
 * 
 * Provides end-to-end integration for:
 * 1. Google OAuth 2.0 Authorization with Sheets and Drive scopes
 * 2. Listing user spreadsheets from Google Drive
 * 3. Inspecting spreadsheet metadata and reading grid ranges
 * 4. Appending and updating rows (with user-confirmed safe mutations)
 * 5. 1-Click Athletic Data Exporters (Rosters, Tournament Brackets, Combine Laser Metrics)
 */

import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { auth as sheetsAuth } from './firebase';

export { sheetsAuth };

// Google Sheets & Drive Scopes for Just1Play
export const SHEETS_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly'
];

// Configure Google Auth Provider with Sheets scopes
export const googleSheetsProvider = new GoogleAuthProvider();
SHEETS_SCOPES.forEach(scope => {
  googleSheetsProvider.addScope(scope);
});
googleSheetsProvider.setCustomParameters({
  prompt: 'select_account'
});

// In-Memory Token State (Security: Never store raw OAuth tokens in localStorage or sessionStorage)
let isSheetsSigningIn = false;
let cachedSheetsAccessToken: string | null = null;

export interface SpreadsheetFileItem {
  id: string;
  name: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  owners?: Array<{
    displayName?: string;
    emailAddress?: string;
    photoLink?: string;
  }>;
}

export interface SheetTabInfo {
  sheetId: number;
  title: string;
  index: number;
  rowCount?: number;
  columnCount?: number;
}

export interface SpreadsheetMetadata {
  spreadsheetId: string;
  title: string;
  spreadsheetUrl: string;
  sheets: SheetTabInfo[];
}

export interface SheetValuesResult {
  range: string;
  majorDimension: string;
  values: any[][];
}

/**
 * Initialize Google Sheets Auth State Listener
 */
export const initSheetsAuth = (
  onSuccess?: (user: User, token: string) => void,
  onFailure?: () => void
) => {
  return onAuthStateChanged(sheetsAuth, async (user: User | null) => {
    if (user) {
      if (cachedSheetsAccessToken) {
        if (onSuccess) onSuccess(user, cachedSheetsAccessToken);
      } else if (!isSheetsSigningIn) {
        if (onFailure) onFailure();
      }
    } else {
      cachedSheetsAccessToken = null;
      if (onFailure) onFailure();
    }
  });
};

/**
 * Sign in with Google to grant Google Sheets and Drive permissions
 */
export const signInWithGoogleSheets = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSheetsSigningIn = true;
    const result = await signInWithPopup(sheetsAuth, googleSheetsProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve Google Sheets access token.');
    }

    cachedSheetsAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedSheetsAccessToken };
  } catch (error: any) {
    console.error('Google Sheets Sign-in error:', error);
    throw error;
  } finally {
    isSheetsSigningIn = false;
  }
};

/**
 * Get cached Sheets Access Token
 */
export const getSheetsAccessToken = (): string | null => {
  return cachedSheetsAccessToken;
};

/**
 * Disconnect Google Sheets session (clears in-memory token)
 */
export const disconnectGoogleSheets = async () => {
  cachedSheetsAccessToken = null;
};

/**
 * Fetch all Google Sheets spreadsheets owned or accessible by user via Google Drive API
 */
export const fetchUserSpreadsheets = async (
  accessToken: string,
  pageSize: number = 30
): Promise<SpreadsheetFileItem[]> => {
  const queryParam = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const fieldsParam = encodeURIComponent("files(id,name,createdTime,modifiedTime,webViewLink,owners)");
  const url = `https://www.googleapis.com/drive/v3/files?q=${queryParam}&fields=${fieldsParam}&pageSize=${pageSize}&orderBy=modifiedTime desc`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to list spreadsheets from Google Drive (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return (data.files || []) as SpreadsheetFileItem[];
};

/**
 * Fetch metadata for a specific spreadsheet including tab names and dimensions
 */
export const getSpreadsheetMetadata = async (
  accessToken: string,
  spreadsheetId: string
): Promise<SpreadsheetMetadata> => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?includeGridData=false`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get spreadsheet metadata (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const sheets: SheetTabInfo[] = (data.sheets || []).map((s: any) => ({
    sheetId: s.properties?.sheetId || 0,
    title: s.properties?.title || 'Sheet1',
    index: s.properties?.index || 0,
    rowCount: s.properties?.gridProperties?.rowCount,
    columnCount: s.properties?.gridProperties?.columnCount
  }));

  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title || 'Untitled Spreadsheet',
    spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
    sheets
  };
};

/**
 * Read values from a specific spreadsheet range (e.g. 'Sheet1!A1:Z100')
 */
export const readSheetRange = async (
  accessToken: string,
  spreadsheetId: string,
  range: string
): Promise<SheetValuesResult> => {
  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to read sheet range "${range}" (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return {
    range: data.range || range,
    majorDimension: data.majorDimension || 'ROWS',
    values: data.values || []
  };
};

/**
 * Create a new Google Spreadsheet with optional initial sheets and rows
 */
export const createNewSpreadsheet = async (
  accessToken: string,
  title: string,
  sheetsConfig?: Array<{
    title: string;
    rows?: any[][];
  }>
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; title: string }> => {
  const sheetsPayload = sheetsConfig?.map((sc, idx) => ({
    properties: {
      title: sc.title,
      index: idx
    },
    data: sc.rows ? [{
      startRow: 0,
      startColumn: 0,
      rowData: sc.rows.map(row => ({
        values: row.map(cell => ({
          userEnteredValue: typeof cell === 'number' 
            ? { numberValue: cell }
            : typeof cell === 'boolean'
            ? { boolValue: cell }
            : { stringValue: String(cell ?? '') }
        }))
      }))
    }] : undefined
  })) || [
    {
      properties: {
        title: 'Sheet1'
      }
    }
  ];

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: title || 'Just1Play Athletic Export'
      },
      sheets: sheetsPayload
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to create spreadsheet (${response.status}): ${err}`);
  }

  const data = await response.json();
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
    title: data.properties?.title || title
  };
};

/**
 * Append rows to a sheet tab
 */
export const appendSheetRows = async (
  accessToken: string,
  spreadsheetId: string,
  range: string,
  values: any[][]
): Promise<any> => {
  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to append rows to sheet (${response.status}): ${errorText}`);
  }

  return response.json();
};

/**
 * Update a specific range in a spreadsheet (Mutating operation: must have user confirmation)
 */
export const updateSheetRange = async (
  accessToken: string,
  spreadsheetId: string,
  range: string,
  values: any[][]
): Promise<any> => {
  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?valueInputOption=USER_ENTERED`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update sheet range (${response.status}): ${errorText}`);
  }

  return response.json();
};

/**
 * Clear values in a range (Destructive operation: must have user confirmation)
 */
export const clearSheetRange = async (
  accessToken: string,
  spreadsheetId: string,
  range: string
): Promise<any> => {
  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}:clear`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to clear sheet range (${response.status}): ${errorText}`);
  }

  return response.json();
};

// ==========================================
// ATHLETIC DATA EXPORT SUITE FOR JUST1PLAY
// ==========================================

export interface AthleticRosterExportItem {
  number?: string | number;
  name: string;
  position?: string;
  gradYear?: string | number;
  height?: string;
  weight?: string;
  gpa?: string | number;
  verified?: boolean;
  cityState?: string;
  phoneOrEmail?: string;
  profileUrl?: string;
}

/**
 * 1-Click Export Team Roster to Google Sheets
 */
export const exportRosterToGoogleSheets = async (
  accessToken: string,
  teamName: string,
  roster: AthleticRosterExportItem[]
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> => {
  const headers = [
    'Jersey #',
    'Athlete Name',
    'Position',
    'Class',
    'Height',
    'Weight',
    'Academic GPA',
    'Verified Status',
    'Hometown / State',
    'Contact Info',
    'Just1Play Profile URL'
  ];

  const rows: any[][] = [
    headers,
    ...roster.map(player => [
      player.number || '--',
      player.name || 'Anonymous Athlete',
      player.position || 'ATH',
      player.gradYear || '--',
      player.height || '--',
      player.weight ? `${player.weight} lbs` : '--',
      player.gpa || '--',
      player.verified ? 'VERIFIED ATHLETE' : 'STANDARD',
      player.cityState || '--',
      player.phoneOrEmail || '--',
      player.profileUrl || 'https://app.just1play.com'
    ])
  ];

  const title = `Just1Play — ${teamName.trim() || 'Team'} Roster (${new Date().toLocaleDateString()})`;

  return createNewSpreadsheet(accessToken, title, [
    {
      title: 'Active Roster',
      rows
    }
  ]);
};

export interface TournamentStandingsExportItem {
  seed: number;
  teamName: string;
  division: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
  status: string;
}

/**
 * 1-Click Export Tournament Standings & Brackets
 */
export const exportTournamentToGoogleSheets = async (
  accessToken: string,
  tournamentName: string,
  standings: TournamentStandingsExportItem[]
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> => {
  const headers = [
    'Seed',
    'Team / Club',
    'Division',
    'Wins (W)',
    'Losses (L)',
    'Points Scored (PF)',
    'Points Allowed (PA)',
    'Point Differential',
    'Playoff Status'
  ];

  const rows: any[][] = [
    headers,
    ...standings.map(s => [
      s.seed,
      s.teamName,
      s.division,
      s.wins,
      s.losses,
      s.pointsFor,
      s.pointsAgainst,
      s.diff,
      s.status
    ])
  ];

  const title = `Just1Play Tournament — ${tournamentName} (${new Date().toLocaleDateString()})`;

  return createNewSpreadsheet(accessToken, title, [
    {
      title: 'Standings & Seeds',
      rows
    }
  ]);
};

export interface CombineRecordExportItem {
  rank: number;
  athleteName: string;
  position: string;
  gradYear: string | number;
  fortyYardDash: string | number;
  verticalJump: string | number;
  proShuttle: string | number;
  benchPress: string | number;
  broadJump: string | number;
  compositeScore: string | number;
  laserVerified: boolean;
}

/**
 * 1-Click Export Combine Laser Leaderboard
 */
export const exportCombineToGoogleSheets = async (
  accessToken: string,
  combineTitle: string,
  records: CombineRecordExportItem[]
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> => {
  const headers = [
    'Rank',
    'Athlete Name',
    'Position',
    'Class',
    '40-Yd Laser (s)',
    'Vertical Jump (in)',
    '20-Yd Shuttle (s)',
    'Bench Press (reps)',
    'Broad Jump (in)',
    'Combine Index',
    'Laser Verified'
  ];

  const rows: any[][] = [
    headers,
    ...records.map(r => [
      r.rank,
      r.athleteName,
      r.position,
      r.gradYear,
      r.fortyYardDash,
      r.verticalJump,
      r.proShuttle,
      r.benchPress,
      r.broadJump,
      r.compositeScore,
      r.laserVerified ? 'TRUE (LASER)' : 'MANUAL'
    ])
  ];

  const title = `Just1Play Combine — ${combineTitle} (${new Date().toLocaleDateString()})`;

  return createNewSpreadsheet(accessToken, title, [
    {
      title: 'Combine Leaderboard',
      rows
    }
  ]);
};
