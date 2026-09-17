import { UserRole } from '../types';

export type PostContentType =
  | 'game_film'
  | 'scout_report'
  | 'roster_checkin'
  | 'official_sanction'
  | 'creator_reel'
  | 'fan_discussion'
  | 'general_post';

export interface ValidationAction {
  id: 'relabel' | 'disclaimer' | 'switch_role';
  label: string;
  description: string;
}

export interface ValidationResult {
  isAligned: boolean;
  severity: 'none' | 'info' | 'warning' | 'mismatch_flag';
  userRole: UserRole;
  detectedContentType: PostContentType;
  contentTypeName: string;
  title: string;
  explanation: string;
  recommendedRole: UserRole;
  disclaimerTag: string | null;
  suggestedActions: ValidationAction[];
}

export interface ValidatePostInput {
  role: UserRole;
  caption?: string;
  selectedCategory?: string;
  postOption?: 'video' | 'photos' | 'status' | string;
  hasVideo?: boolean;
  hasPhoto?: boolean;
  hasStatsSnippet?: boolean;
}

// Keyword heuristics for auto-detecting data/content type
const SCOUT_KEYWORDS = [
  'scout report',
  'scouting note',
  'ncaa evaluation',
  'prospect rating',
  'eval:',
  'prospect grade',
  'grade 8',
  'grade 9',
  'wingspan rating',
  'recruiting profile evaluation',
  'athletic rubric',
  'd1 prospect note'
];

const ROSTER_KEYWORDS = [
  'roster check-in',
  'official roster',
  'stat approval',
  'jersey assignment',
  'team roster',
  'player pass verification',
  'coach check-in'
];

const SANCTION_KEYWORDS = [
  'official sanction',
  'sanctioned host',
  'tournament bracket',
  'court schedule',
  'venue rules',
  'official tournament notice',
  'court grid update'
];

const CREATOR_KEYWORDS = [
  '4k reel',
  'mixtape package',
  'media booking',
  'videographer package',
  'photo pack',
  'highlight mixtape'
];

const GAME_FILM_KEYWORDS = [
  'game film',
  'hudl',
  'highlight',
  'dunk',
  'poster',
  'mixtape',
  'gameplay',
  'full game'
];

export function detectPostContentType(input: ValidatePostInput): PostContentType {
  const captionLower = (input.caption || '').toLowerCase();
  const categoryLower = (input.selectedCategory || '').toLowerCase();

  if (categoryLower.includes('scout') || SCOUT_KEYWORDS.some(k => captionLower.includes(k))) {
    return 'scout_report';
  }

  if (categoryLower.includes('roster') || ROSTER_KEYWORDS.some(k => captionLower.includes(k))) {
    return 'roster_checkin';
  }

  if (categoryLower.includes('sanction') || SANCTION_KEYWORDS.some(k => captionLower.includes(k))) {
    return 'official_sanction';
  }

  if (categoryLower.includes('creator') || CREATOR_KEYWORDS.some(k => captionLower.includes(k))) {
    return 'creator_reel';
  }

  if (
    input.postOption === 'video' ||
    input.hasVideo ||
    GAME_FILM_KEYWORDS.some(k => captionLower.includes(k))
  ) {
    return 'game_film';
  }

  if (input.postOption === 'photos' || input.hasPhoto) {
    return 'game_film';
  }

  return 'general_post';
}

export function validateRoleConsistency(input: ValidatePostInput): ValidationResult {
  const role = input.role || 'athlete';
  const detectedType = detectPostContentType(input);

  // 1. Scout Report Validation
  if (detectedType === 'scout_report') {
    if (role === 'scout') {
      return {
        isAligned: true,
        severity: 'none',
        userRole: role,
        detectedContentType: detectedType,
        contentTypeName: 'NCAA Scout Evaluation Report',
        title: 'Verified Scout Content',
        explanation: 'Content type aligns perfectly with your NCAA Recruiter/Scout badge.',
        recommendedRole: 'scout',
        disclaimerTag: 'VERIFIED NCAA SCOUT REPORT',
        suggestedActions: []
      };
    }

    if (role === 'coach') {
      return {
        isAligned: false,
        severity: 'warning',
        userRole: role,
        detectedContentType: detectedType,
        contentTypeName: 'Scout Evaluation Report',
        title: 'Coach Evaluation Advisory',
        explanation: 'You are publishing a scout/rating report as a Coach. College recruiters filter specifically for Scout badge ratings.',
        recommendedRole: 'scout',
        disclaimerTag: 'COACH EVALUATION (NON-NCAA SCOUT)',
        suggestedActions: [
          {
            id: 'disclaimer',
            label: 'Proceed as Coach Evaluation',
            description: 'Attach a "Coach Evaluation" disclaimer badge to your post.'
          },
          {
            id: 'relabel',
            label: 'Relabel as Team Game Log',
            description: 'Publish as an official team game log update.'
          },
          {
            id: 'switch_role',
            label: 'Switch to Scout Mode',
            description: 'Switch active view to Recruiter / Scout mode.'
          }
        ]
      };
    }

    // Athlete or Fan or Creator
    return {
      isAligned: false,
      severity: 'mismatch_flag',
      userRole: role,
      detectedContentType: detectedType,
      contentTypeName: 'Scout Evaluation Report',
      title: 'Role Mismatch: Scout Evaluation Flagged',
      explanation: `You are posting an official Scout Evaluation Report as an ${role.toUpperCase()}. Scout reports require verified NCAA Recruiter credentials.`,
      recommendedRole: 'scout',
      disclaimerTag: `UNVERIFIED ${role.toUpperCase()} SELF-REPORT`,
      suggestedActions: [
        {
          id: 'disclaimer',
          label: 'Proceed with Disclaimer Flag',
          description: `Attach a "${role.toUpperCase()} Self-Report" notice so readers know it is unverified.`
        },
        {
          id: 'relabel',
          label: 'Relabel as Athlete Game Highlight',
          description: 'Re-classify content as a personal player highlight post.'
        },
        {
          id: 'switch_role',
          label: 'Switch to Scout Profile',
          description: 'Switch to Recruiter / Scout profile mode to access full evaluation tools.'
        }
      ]
    };
  }

  // 2. Official Sanction / Tournament Notice
  if (detectedType === 'official_sanction') {
    if (role === 'organization') {
      return {
        isAligned: true,
        severity: 'none',
        userRole: role,
        detectedContentType: detectedType,
        contentTypeName: 'Sanctioned Tournament Notice',
        title: 'Official Host Publication',
        explanation: 'Content matches your Sanctioned Host Organization badge.',
        recommendedRole: 'organization',
        disclaimerTag: 'SANCTIONED HOST NOTICE',
        suggestedActions: []
      };
    }

    return {
      isAligned: false,
      severity: 'mismatch_flag',
      userRole: role,
      detectedContentType: detectedType,
      contentTypeName: 'Sanctioned Tournament Notice',
      title: 'Role Mismatch: Sanction Notice Flagged',
      explanation: `Official tournament announcements and court schedules must be published by a Sanctioned Host Organization, not an ${role.toUpperCase()}.`,
      recommendedRole: 'organization',
      disclaimerTag: 'COMMUNITY TOURNAMENT POST (UNOFFICIAL)',
      suggestedActions: [
        {
          id: 'disclaimer',
          label: 'Publish as Community Fan Post',
          description: 'Label as an unofficial community update.'
        },
        {
          id: 'relabel',
          label: 'Relabel as General Discussion',
          description: 'Remove official sanction terminology.'
        },
        {
          id: 'switch_role',
          label: 'Switch to Organization Mode',
          description: 'Access official tournament operator credentials.'
        }
      ]
    };
  }

  // 3. Roster Check-in & Stat Approval
  if (detectedType === 'roster_checkin') {
    if (role === 'coach' || role === 'organization') {
      return {
        isAligned: true,
        severity: 'none',
        userRole: role,
        detectedContentType: detectedType,
        contentTypeName: 'Official Roster & Stat Approval',
        title: 'Verified Roster Log',
        explanation: 'Roster and check-in logs align with your Staff role.',
        recommendedRole: 'coach',
        disclaimerTag: 'VERIFIED STAFF ROSTER LOG',
        suggestedActions: []
      };
    }

    return {
      isAligned: false,
      severity: 'warning',
      userRole: role,
      detectedContentType: detectedType,
      contentTypeName: 'Official Roster & Stat Log',
      title: 'Staff Role Advisory',
      explanation: `Official roster check-ins and stat approvals are typically managed by Head Coaches or Tournament Operators.`,
      recommendedRole: 'coach',
      disclaimerTag: `PLAYER SELF-SUBMITTED ROSTER LOG`,
      suggestedActions: [
        {
          id: 'disclaimer',
          label: 'Submit for Coach Approval',
          description: 'Flag post for coach verification before official stat lock.'
        },
        {
          id: 'relabel',
          label: 'Relabel as Game Highlight',
          description: 'Classify as personal player performance.'
        }
      ]
    };
  }

  // 4. Creator Media Reel
  if (detectedType === 'creator_reel') {
    if (role === 'creator' || role === 'content_creator' || role === 'athlete') {
      return {
        isAligned: true,
        severity: 'none',
        userRole: role,
        detectedContentType: detectedType,
        contentTypeName: '4K Media Package & Film Reel',
        title: 'Verified Media Content',
        explanation: 'Media creation posts align with your Creator/Athlete profile.',
        recommendedRole: 'creator',
        disclaimerTag: null,
        suggestedActions: []
      };
    }
  }

  // Default aligned
  return {
    isAligned: true,
    severity: 'none',
    userRole: role,
    detectedContentType: detectedType,
    contentTypeName: 'Standard Post / Game Highlight',
    title: 'Aligned Role Content',
    explanation: 'Your post media and data type match your assigned user role.',
    recommendedRole: role,
    disclaimerTag: null,
    suggestedActions: []
  };
}
