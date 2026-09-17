import { CheerSkillItem, CategoryMetadata } from './types';

export const CHEER_CATEGORIES: CategoryMetadata[] = [
  {
    id: 'standing_tumbling',
    name: 'Standing Tumbling',
    shortName: 'Standing',
    description: 'Zero-step and stationary tumbling power, whip connections, and full rotations.',
    iconName: 'Zap',
    accentColor: '#10b981', // Electric Emerald
    gradient: 'from-emerald-500/20 to-teal-500/5'
  },
  {
    id: 'running_tumbling',
    name: 'Running Tumbling',
    shortName: 'Running',
    description: 'Round-off entry passes, whip combinations, layouts, and twisting mastery.',
    iconName: 'Flame',
    accentColor: '#38bdf8', // Vivid Cyan
    gradient: 'from-sky-500/20 to-cyan-500/5'
  },
  {
    id: 'stunting',
    name: 'Stunting & Releases',
    shortName: 'Stunts',
    description: 'Coed/all-girl inversions, rewinds, hand-in-hand transitions, and elite body positions.',
    iconName: 'Shield',
    accentColor: '#a855f7', // Purple
    gradient: 'from-purple-500/20 to-indigo-500/5'
  },
  {
    id: 'jumps_flexibility',
    name: 'Jumps & Flexibility',
    shortName: 'Jumps / Body',
    description: 'Hyper-extended toe-touch connections, scorpion scale pulls, and hyperextension lines.',
    iconName: 'Sparkles',
    accentColor: '#f59e0b', // Amber
    gradient: 'from-amber-500/20 to-orange-500/5'
  }
];

export const DEFAULT_CHEER_SKILLS: CheerSkillItem[] = [
  // 1. Standing Tumbling
  {
    skillId: 'st_standing_tuck',
    name: 'Standing Tuck',
    category: 'standing_tumbling',
    level: 'Level 5',
    verified: false,
    videoUrl: '',
    surface: 'spring_floor',
    notes: 'Clean set, zero rebound, tight knee grab and landed chest high.'
  },
  {
    skillId: 'st_standing_bhs_tuck',
    name: 'Standing BHS Tuck',
    category: 'standing_tumbling',
    level: 'Level 5',
    verified: false,
    videoUrl: '',
    surface: 'spring_floor',
    notes: 'Power back handspring snap down with immediate vertical transition.'
  },
  {
    skillId: 'st_standing_full',
    name: 'Standing Full',
    category: 'standing_tumbling',
    level: 'Level 6',
    verified: false,
    videoUrl: '',
    surface: 'dead_floor',
    notes: 'High collegiate standard. Full 360-degree axial twist from stationary set.'
  },
  {
    skillId: 'st_2bhs_to_full',
    name: '2 BHS to Full',
    category: 'standing_tumbling',
    level: 'NCAA D1',
    verified: false,
    videoUrl: '',
    surface: 'dead_floor',
    notes: 'Collegiate competition entry. 2 hollow back handsprings to hollow full layout.'
  },
  {
    skillId: 'st_standing_bhs_layout',
    name: 'Standing BHS to Layout',
    category: 'standing_tumbling',
    level: 'Level 5',
    verified: false,
    videoUrl: '',
    surface: 'spring_floor',
    notes: 'Open hip angle throughout layout rotation with locked knees.'
  },
  {
    skillId: 'st_standing_whip_full',
    name: 'Standing Whip to Full',
    category: 'standing_tumbling',
    level: 'NCAA D1',
    verified: false,
    videoUrl: '',
    surface: 'dead_floor',
    notes: 'Elite collegiate specialty pass.'
  },

  // 2. Running Tumbling
  {
    skillId: 'rt_ro_bhs_layout',
    name: 'RO BHS Layout',
    category: 'running_tumbling',
    level: 'Level 4',
    verified: false,
    videoUrl: '',
    surface: 'spring_floor',
    notes: 'Solid foundation round-off entry with hollow body shape and stick landing.'
  },
  {
    skillId: 'rt_ro_bhs_full',
    name: 'RO BHS Full',
    category: 'running_tumbling',
    level: 'Level 5',
    verified: false,
    videoUrl: '',
    surface: 'spring_floor',
    notes: 'Standard collegiate baseline pass with late twist completion.'
  },
  {
    skillId: 'rt_ro_whip_full',
    name: 'RO Whip Full',
    category: 'running_tumbling',
    level: 'Level 6',
    verified: false,
    videoUrl: '',
    surface: 'dead_floor',
    notes: 'High speed whip rebound connection directly into twisting layout.'
  },
  {
    skillId: 'rt_ro_bhs_double_full',
    name: 'RO BHS Double Full',
    category: 'running_tumbling',
    level: 'NCAA D1',
    verified: false,
    videoUrl: '',
    surface: 'dead_floor',
    notes: 'Collegiate D1 premier skill. 720-degree rotation with clean sight on landing.'
  },
  {
    skillId: 'rt_front_handspring_punch_front',
    name: 'FHS Punch Front / Arabian',
    category: 'running_tumbling',
    level: 'Level 5',
    verified: false,
    videoUrl: '',
    surface: 'spring_floor',
    notes: 'Forward power specialty entry with hollow body step-out.'
  },
  {
    skillId: 'rt_ro_full_to_full',
    name: 'RO Full to Full / Double',
    category: 'running_tumbling',
    level: 'NCAA D1',
    verified: false,
    videoUrl: '',
    surface: 'dead_floor',
    notes: 'Specialty rebound combo tumbling on hard or spring floor.'
  },

  // 3. Stunting & Releases
  {
    skillId: 'st_full_up_to_extension',
    name: 'Full-Up to Extension',
    category: 'stunting',
    level: 'Level 5',
    verified: false,
    videoUrl: '',
    surface: 'spring_floor',
    notes: '360 degree spin rotation directly to extended platforms.'
  },
  {
    skillId: 'st_rewind',
    name: 'Rewind (Inversion Release)',
    category: 'stunting',
    level: 'NCAA D1',
    verified: false,
    videoUrl: '',
    surface: 'dead_floor',
    notes: 'Backward flip release from ground into extended cupie / hands.'
  },
  {
    skillId: 'st_hand_in_hand',
    name: 'Hand-in-Hand',
    category: 'stunting',
    level: 'NCAA D1',
    verified: false,
    videoUrl: '',
    surface: 'dead_floor',
    notes: 'Coed unassisted hand-to-hand toss with immediate press to overhead cupie.'
  },
  {
    skillId: 'st_switch_up_lib',
    name: 'Switch-Up Lib',
    category: 'stunting',
    level: 'Level 6',
    verified: false,
    videoUrl: '',
    surface: 'spring_floor',
    notes: 'Single-leg release toss switching to opposite liberty with sharp lock.'
  },
  {
    skillId: 'st_inverted_release',
    name: 'Inverted Release / Backflip Stunt',
    category: 'stunting',
    level: 'NCAA D1',
    verified: false,
    videoUrl: '',
    surface: 'dead_floor',
    notes: 'Full inversion release with controlled catch and high stability.'
  },
  {
    skillId: 'st_double_up_to_stretch',
    name: 'Double-Up to Heel Stretch',
    category: 'stunting',
    level: 'Level 6',
    verified: false,
    videoUrl: '',
    surface: 'dead_floor',
    notes: '720-degree spinning toss entry to extended single-leg body position.'
  },

  // 4. Jumps & Flexibility
  {
    skillId: 'jf_toe_touch_standing_tuck',
    name: 'Toe Touch to Standing Tuck',
    category: 'jumps_flexibility',
    level: 'Level 5',
    verified: false,
    videoUrl: '',
    surface: 'spring_floor',
    notes: 'Hyperextended toe touch jump with immediate punch connection to tuck.'
  },
  {
    skillId: 'jf_hurdler_combo',
    name: 'Hurdler Combo (Triple Jump)',
    category: 'jumps_flexibility',
    level: 'Level 4',
    verified: false,
    videoUrl: '',
    surface: 'spring_floor',
    notes: 'Continuous jump sequence: Right Hurdler + Left Hurdler + Toe Touch.'
  },
  {
    skillId: 'jf_needle',
    name: 'Needle (Overstretch 180°+)',
    category: 'jumps_flexibility',
    level: 'Level 6',
    verified: false,
    videoUrl: '',
    surface: 'dead_floor',
    notes: 'Vertical needle extension with straight standing knee and locked torso.'
  },
  {
    skillId: 'jf_scorpion',
    name: 'Scorpion (Scale Pull)',
    category: 'jumps_flexibility',
    level: 'Level 5',
    verified: false,
    videoUrl: '',
    surface: 'spring_floor',
    notes: 'Bilateral shoulder flexibility with high arch and pointed toe.'
  },
  {
    skillId: 'jf_bow_and_arrow',
    name: 'Bow & Arrow',
    category: 'jumps_flexibility',
    level: 'NCAA D1',
    verified: false,
    videoUrl: '',
    surface: 'dead_floor',
    notes: 'Overhead grab with perpendicular arm push and clean flyer line.'
  },
  {
    skillId: 'jf_around_the_world',
    name: 'Around-the-World Jump Sequence',
    category: 'jumps_flexibility',
    level: 'Level 5',
    verified: false,
    videoUrl: '',
    surface: 'spring_floor',
    notes: 'Multi-directional collegiate jump combo with whip connection.'
  }
];

export const SURFACE_LABELS: Record<string, { label: string; badgeColor: string; bg: string }> = {
  dead_floor: {
    label: 'Dead Floor (College / STUNT)',
    badgeColor: 'text-amber-400 border-amber-500/30',
    bg: 'bg-amber-500/10'
  },
  spring_floor: {
    label: 'Spring Floor (All-Star / USASF)',
    badgeColor: 'text-sky-400 border-sky-500/30',
    bg: 'bg-sky-500/10'
  },
  grass_turf: {
    label: 'Grass / Game Turf (Gameday)',
    badgeColor: 'text-emerald-400 border-emerald-500/30',
    bg: 'bg-emerald-500/10'
  }
};

export const LEVEL_BADGES: Record<string, { label: string; color: string; border: string; glow: string }> = {
  'Level 4': {
    label: 'Level 4',
    color: 'text-blue-400',
    border: 'border-blue-500/30',
    glow: 'shadow-[0_0_12px_rgba(59,130,246,0.25)]'
  },
  'Level 5': {
    label: 'Level 5',
    color: 'text-cyan-400',
    border: 'border-cyan-500/30',
    glow: 'shadow-[0_0_12px_rgba(6,182,212,0.3)]'
  },
  'Level 6': {
    label: 'Level 6 (Premier)',
    color: 'text-purple-400',
    border: 'border-purple-500/30',
    glow: 'shadow-[0_0_12px_rgba(168,85,247,0.3)]'
  },
  'NCAA D1': {
    label: 'NCAA D1 Ready',
    color: 'text-emerald-400',
    border: 'border-emerald-500/40',
    glow: 'shadow-[0_0_16px_rgba(16,185,129,0.35)]'
  }
};
