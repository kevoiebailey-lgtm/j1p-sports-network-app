export interface SignalHubConnectedDevice {
  id: string;
  position: string; // e.g. 'QB', 'WR1', 'WR2', 'SLOT', 'RB', 'C', 'TE', 'DEFENSE', 'SAFETY', 'CB1', 'COACH'
  playerName: string;
  jerseyNumber?: string;
  status: 'connected' | 'idle' | 'disconnected';
  latencyMs: number;
  lastPing: number;
  deviceType?: 'wrist_hud' | 'phone_hud' | 'smartwatch' | 'tablet' | 'coach_monitor';
  lastAcknowledgedCallId?: string;
  lastAcknowledgedAt?: number;
}

export type SignalTargeting = 
  | 'Entire Offense'
  | 'Quarterback Only'
  | 'Skill Positions'
  | 'Offensive Line & Center'
  | 'Defense'
  | 'Specific Position';

export interface SignalHubPlayCall {
  dispatchId: string;
  playId: string;
  playName: string;
  formation: string;
  personnel?: string;
  targeting: SignalTargeting;
  targetPosition?: string;
  targetRoutes: Record<string, string>; // e.g. { 'QB': '3-Step Drop, Read FS', 'WR1': '12-Yd Comeback', ... }
  cadence: string; // e.g. 'On One', 'On 2', 'Freeze', 'Silent Count', 'Check with Me'
  audibleColor: string; // e.g. 'BLUE 42', 'RED 80', 'GREEN LIGHT', 'BLACK VIPER'
  notes?: string;
  emergencyAudible?: boolean;
  isKillPlay?: boolean;
  timestamp: number;
  authorId?: string;
  authorName?: string;
  diagramData?: {
    sport?: string;
    playersCount?: number;
    svgSnapshot?: string;
  };
}

export interface SignalHubSession {
  activeSessionId: string;
  teamId: string;
  teamName: string;
  coachId: string;
  coachName: string;
  pin: string; // 6-digit PIN e.g. '842109' or '842-109'
  pinHash?: string;
  status: 'active' | 'paused' | 'ended';
  connectedPlayers: SignalHubConnectedDevice[];
  lastCall?: SignalHubPlayCall;
  recentCalls?: SignalHubPlayCall[];
  createdAt: number;
  updatedAt: number;
}

export const CADENCE_OPTIONS = [
  'On One',
  'On 2',
  'On 3',
  'Freeze / Check Sideline',
  'Silent Count',
  'Hard Count (Go on 2)',
  'Turbo / Fast Snap',
  'Check With Me (Alert)'
] as const;

export const AUDIBLE_COLOR_PRESETS = [
  { label: 'BLUE 42', color: '#38bdf8', text: '#0B0F17' },
  { label: 'RED 80', color: '#ef4444', text: '#ffffff' },
  { label: 'GREEN LIGHT', color: '#10b981', text: '#0B0F17' },
  { label: 'BLACK VIPER', color: '#1e293b', text: '#38bdf8' },
  { label: 'GOLDEN RUSH', color: '#f59e0b', text: '#0B0F17' },
  { label: 'PURPLE RAIN', color: '#a855f7', text: '#ffffff' },
  { label: 'WHITE FLASH', color: '#f8fafc', text: '#0B0F17' },
  { label: 'KILL PLAY / RESET', color: '#dc2626', text: '#ffffff' }
] as const;
