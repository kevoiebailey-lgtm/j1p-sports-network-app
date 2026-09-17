import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  ShieldCheck,
  Zap,
  Flame,
  Sparkles,
  Trophy,
  Check,
  CheckCircle2,
  X,
  Plus,
  Minus,
  Video,
  Play,
  Pause,
  RotateCcw,
  Share2,
  Download,
  ExternalLink,
  Award,
  Layers,
  ChevronRight,
  Eye,
  AlertTriangle,
  Info,
  Calendar,
  Clock,
  Activity,
  Sliders,
  Flag,
  User,
  Star,
  Lock,
  Unlock,
  CheckSquare,
  Sparkle,
  Copy
} from 'lucide-react';
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp, collection } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

// ============================================================================
// TYPES & DATA CONTRACTS
// ============================================================================

export type CheerCategory = 
  | 'standing_tumbling' 
  | 'running_tumbling' 
  | 'building' 
  | 'flexibility' 
  | 'jumps';

export type FloorSurface = 'spring_floor' | 'dead_floor';

export interface CheerSkillNode {
  id: string;
  name: string;
  category: CheerCategory;
  level: string; // e.g. "Level 3", "Level 4", "Level 5", "Level 6", "NCAA D1 / STUNT"
  order: number;
  unlocked: boolean;
  surface: FloorSurface;
  videoUrl?: string;
  cleanHits: number;
  totalAttempts: number;
  hitStreak: number;
  notes?: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

export type JudgeRulebookTier = 'rec_youth' | 'high_school' | 'college_stunt';

export interface RoutinePin {
  id: string;
  sectionIndex: number; // 0..3
  count: number; // 1..8
  label: string;
  type: 'stunt_hit' | 'tumbling_hit' | 'pyramid_hit' | 'toss_hit' | 'bobble' | 'other';
  createdAt: string;
}

export interface DeductionRecord {
  id: string;
  type: 'bobble' | 'fall' | 'pyramid_bust' | 'safety_violation';
  label: string;
  amount: number; // e.g. 0.25, 0.50, 1.00, 1.50
  timestamp: string;
  countLocation?: string;
}

export interface CheerMatrixProps {
  userId?: string;
  athleteName?: string;
  athletePhoto?: string;
  athleteGym?: string;
  gradYear?: string | number;
  eventId?: string;
  readOnly?: boolean;
  className?: string;
}

// ============================================================================
// DEFAULT SKILL PROGRESSION TREES
// ============================================================================

const DEFAULT_SKILL_TREE: CheerSkillNode[] = [
  // 1. Standing Tumbling
  {
    id: 'st_back_walkover',
    name: 'Back Walkover',
    category: 'standing_tumbling',
    level: 'Level 1-2',
    order: 1,
    unlocked: true,
    surface: 'dead_floor',
    videoUrl: 'https://youtube.com',
    cleanHits: 25,
    totalAttempts: 25,
    hitStreak: 25,
    notes: 'Square hips, smooth bridge kickover.',
    verifiedBy: 'Coach Sarah (USASF L6)',
    verifiedAt: '2026-05-12'
  },
  {
    id: 'st_bhs',
    name: 'Standing BHS',
    category: 'standing_tumbling',
    level: 'Level 3',
    order: 2,
    unlocked: true,
    surface: 'dead_floor',
    videoUrl: 'https://youtube.com',
    cleanHits: 28,
    totalAttempts: 30,
    hitStreak: 18,
    notes: 'Explosive sit, tight rebound transition.',
    verifiedBy: 'Coach Sarah (USASF L6)',
    verifiedAt: '2026-06-01'
  },
  {
    id: 'st_standing_tuck',
    name: 'Standing Tuck',
    category: 'standing_tumbling',
    level: 'Level 4-5',
    order: 3,
    unlocked: true,
    surface: 'dead_floor',
    videoUrl: 'https://youtube.com',
    cleanHits: 24,
    totalAttempts: 25,
    hitStreak: 14,
    notes: 'Zero-step chest drive, vertical set, stuck on dead mat.',
    verifiedBy: 'Scout Johnson (D1 Evaluator)',
    verifiedAt: '2026-07-14'
  },
  {
    id: 'st_bhs_tuck',
    name: 'Standing BHS Tuck',
    category: 'standing_tumbling',
    level: 'Level 5',
    order: 4,
    unlocked: true,
    surface: 'spring_floor',
    videoUrl: '',
    cleanHits: 19,
    totalAttempts: 20,
    hitStreak: 12,
    notes: 'High snap down into immediate open set.'
  },
  {
    id: 'st_standing_layout',
    name: 'Standing Layout',
    category: 'standing_tumbling',
    level: 'Level 5-6',
    order: 5,
    unlocked: true,
    surface: 'spring_floor',
    videoUrl: '',
    cleanHits: 15,
    totalAttempts: 18,
    hitStreak: 8,
    notes: 'Straight hollow body alignment, clean arm set.'
  },
  {
    id: 'st_standing_full',
    name: 'Standing Full',
    category: 'standing_tumbling',
    level: 'Level 6 / NCAA D1',
    order: 6,
    unlocked: false,
    surface: 'dead_floor',
    videoUrl: '',
    cleanHits: 6,
    totalAttempts: 15,
    hitStreak: 3,
    notes: 'Collegiate D1 standard. 360 axial rotation from dead stop.'
  },
  {
    id: 'st_2bhs_to_double',
    name: '2 BHS to Double Full',
    category: 'standing_tumbling',
    level: 'NCAA D1 / STUNT',
    order: 7,
    unlocked: false,
    surface: 'spring_floor',
    videoUrl: '',
    cleanHits: 2,
    totalAttempts: 10,
    hitStreak: 1,
    notes: 'Elite premier college difficulty.'
  },

  // 2. Running Tumbling
  {
    id: 'rt_ro_bhs',
    name: 'Round-off BHS',
    category: 'running_tumbling',
    level: 'Level 2-3',
    order: 1,
    unlocked: true,
    surface: 'dead_floor',
    cleanHits: 30,
    totalAttempts: 30,
    hitStreak: 30,
    notes: 'Power hurdle, elongated rebound.'
  },
  {
    id: 'rt_ro_bhs_tuck',
    name: 'RO BHS Tuck',
    category: 'running_tumbling',
    level: 'Level 3-4',
    order: 2,
    unlocked: true,
    surface: 'dead_floor',
    cleanHits: 26,
    totalAttempts: 27,
    hitStreak: 20,
    notes: 'Clean knee grab, stuck landing on dead mat.'
  },
  {
    id: 'rt_ro_bhs_layout',
    name: 'RO BHS Layout',
    category: 'running_tumbling',
    level: 'Level 4-5',
    order: 3,
    unlocked: true,
    surface: 'dead_floor',
    cleanHits: 23,
    totalAttempts: 25,
    hitStreak: 15,
    notes: 'Locked legs, neutral head position, no pike.'
  },
  {
    id: 'rt_ro_bhs_full',
    name: 'RO BHS Full Twist',
    category: 'running_tumbling',
    level: 'Level 5-6',
    order: 4,
    unlocked: true,
    surface: 'dead_floor',
    videoUrl: 'https://youtube.com',
    cleanHits: 21,
    totalAttempts: 22,
    hitStreak: 11,
    notes: 'Full axial twist completion prior to landing, chest upright.'
  },
  {
    id: 'rt_whip_to_full',
    name: 'Specialty Whip to Full',
    category: 'running_tumbling',
    level: 'Level 6',
    order: 5,
    unlocked: true,
    surface: 'spring_floor',
    cleanHits: 14,
    totalAttempts: 16,
    hitStreak: 7,
    notes: 'Fast tempo whip pass, continuous visual spotting.'
  },
  {
    id: 'rt_ro_bhs_double_full',
    name: 'RO BHS Double Full',
    category: 'running_tumbling',
    level: 'NCAA D1 / STUNT',
    order: 6,
    unlocked: false,
    surface: 'spring_floor',
    cleanHits: 5,
    totalAttempts: 12,
    hitStreak: 2,
    notes: '720-degree high rotation collegiate highlight pass.'
  },

  // 3. Building (Bases / Backspots)
  {
    id: 'bd_prep_level',
    name: 'Prep Level Elevator',
    category: 'building',
    level: 'Level 2-3',
    order: 1,
    unlocked: true,
    surface: 'dead_floor',
    cleanHits: 40,
    totalAttempts: 40,
    hitStreak: 40,
    notes: 'Solid chest-level load, firm wrist lock.'
  },
  {
    id: 'bd_extension_cupie',
    name: 'Full Extension / Cupie',
    category: 'building',
    level: 'Level 3-4',
    order: 2,
    unlocked: true,
    surface: 'dead_floor',
    cleanHits: 35,
    totalAttempts: 36,
    hitStreak: 28,
    notes: 'Locked out arms, head neutral, stable base platform.'
  },
  {
    id: 'bd_lib_heelstretch',
    name: 'Liberty & Heel Stretch',
    category: 'building',
    level: 'Level 4-5',
    order: 3,
    unlocked: true,
    surface: 'dead_floor',
    cleanHits: 30,
    totalAttempts: 32,
    hitStreak: 22,
    notes: 'Single leg balance, sharp locked ankle support.'
  },
  {
    id: 'bd_full_up_360',
    name: 'Full-Up 360 to Platform',
    category: 'building',
    level: 'Level 5-6',
    order: 4,
    unlocked: true,
    surface: 'spring_floor',
    cleanHits: 22,
    totalAttempts: 25,
    hitStreak: 12,
    notes: 'Controlled spin entry, zero base drift.'
  },
  {
    id: 'bd_inversion_hand2hand',
    name: 'Hand-in-Hand Inversion',
    category: 'building',
    level: 'Level 6 / NCAA D1',
    order: 5,
    unlocked: true,
    surface: 'dead_floor',
    cleanHits: 18,
    totalAttempts: 20,
    hitStreak: 9,
    notes: 'Collegiate STUNT routine standard inversion.'
  },
  {
    id: 'bd_rewind_bhs_up',
    name: 'Rewind / BHS Up to Extension',
    category: 'building',
    level: 'NCAA D1 / STUNT',
    order: 6,
    unlocked: false,
    surface: 'spring_floor',
    cleanHits: 4,
    totalAttempts: 10,
    hitStreak: 2,
    notes: 'Elite free-release toss rotation caught at lock out.'
  },

  // 4. Flexibility (Flyers)
  {
    id: 'fl_front_split',
    name: 'Full Front / Over Split',
    category: 'flexibility',
    level: 'Foundational',
    order: 1,
    unlocked: true,
    surface: 'dead_floor',
    cleanHits: 50,
    totalAttempts: 50,
    hitStreak: 50,
    notes: 'Flat hip square split with overstretch block.'
  },
  {
    id: 'fl_heel_stretch',
    name: 'Standing Heel Stretch',
    category: 'flexibility',
    level: 'Level 3-4',
    order: 2,
    unlocked: true,
    surface: 'dead_floor',
    cleanHits: 45,
    totalAttempts: 45,
    hitStreak: 45,
    notes: 'Cheer toe point, chest vertical, shoulder alignment.'
  },
  {
    id: 'fl_arabesque',
    name: 'Arabesque / Scale',
    category: 'flexibility',
    level: 'Level 4-5',
    order: 3,
    unlocked: true,
    surface: 'dead_floor',
    cleanHits: 35,
    totalAttempts: 36,
    hitStreak: 30,
    notes: 'Hip squared, leg at 90+ degrees with locked knee.'
  },
  {
    id: 'fl_scorpion_pull',
    name: 'Scorpion Pull',
    category: 'flexibility',
    level: 'Level 5-6',
    order: 4,
    unlocked: true,
    surface: 'dead_floor',
    cleanHits: 28,
    totalAttempts: 30,
    hitStreak: 20,
    notes: 'High overhead catch, arch through thoracic spine.'
  },
  {
    id: 'fl_needle_scale',
    name: 'Needle / Straight Leg Scale',
    category: 'flexibility',
    level: 'Level 6 / NCAA D1',
    order: 5,
    unlocked: true,
    surface: 'dead_floor',
    cleanHits: 20,
    totalAttempts: 22,
    hitStreak: 15,
    notes: 'Completely straight bottom and top leg vertical line.'
  },
  {
    id: 'fl_bow_and_arrow',
    name: 'Bow & Arrow (Both Sides)',
    category: 'flexibility',
    level: 'NCAA D1 / STUNT',
    order: 6,
    unlocked: true,
    surface: 'dead_floor',
    cleanHits: 18,
    totalAttempts: 20,
    hitStreak: 14,
    notes: 'Elite flexibility flex, right and left arm pull.'
  },

  // 5. Jumps
  {
    id: 'jp_single_toe_touch',
    name: 'Single Toe Touch',
    category: 'jumps',
    level: 'Level 2-3',
    order: 1,
    unlocked: true,
    surface: 'dead_floor',
    cleanHits: 50,
    totalAttempts: 50,
    hitStreak: 50,
    notes: 'Hyperextended reach, chest upright, pointed toes.'
  },
  {
    id: 'jp_double_toe_touch',
    name: 'Double Toe Touch Combo',
    category: 'jumps',
    level: 'Level 3-4',
    order: 2,
    unlocked: true,
    surface: 'dead_floor',
    cleanHits: 40,
    totalAttempts: 40,
    hitStreak: 35,
    notes: 'Instant rebound between jumps without height drop.'
  },
  {
    id: 'jp_pike_jump',
    name: 'Pike Jump',
    category: 'jumps',
    level: 'Level 4-5',
    order: 3,
    unlocked: true,
    surface: 'dead_floor',
    cleanHits: 32,
    totalAttempts: 34,
    hitStreak: 25,
    notes: 'Parallel legs forward, arms straight, high snap.'
  },
  {
    id: 'jp_hurdler_combo',
    name: 'Hurdler / Herkie Combination',
    category: 'jumps',
    level: 'Level 5',
    order: 4,
    unlocked: true,
    surface: 'dead_floor',
    cleanHits: 28,
    totalAttempts: 30,
    hitStreak: 20,
    notes: 'Lead leg flat to ground, bent leg tucked flat.'
  },
  {
    id: 'jp_toe_touch_to_back_tuck',
    name: 'Toe Touch to Back Tuck',
    category: 'jumps',
    level: 'Level 6 / NCAA D1',
    order: 5,
    unlocked: true,
    surface: 'dead_floor',
    cleanHits: 19,
    totalAttempts: 20,
    hitStreak: 12,
    notes: 'Immediate snap-down into unassisted standing back tuck.'
  }
];

const CATEGORY_TABS: { id: CheerCategory | 'all'; label: string; icon: any; color: string }[] = [
  { id: 'all', label: 'All Disciplines', icon: Layers, color: 'text-zinc-300' },
  { id: 'standing_tumbling', label: 'Standing Tumbling', icon: Zap, color: 'text-teal-400' },
  { id: 'running_tumbling', label: 'Running Tumbling', icon: Flame, color: 'text-amber-400' },
  { id: 'building', label: 'Building (Stunts)', icon: Shield, color: 'text-purple-400' },
  { id: 'flexibility', label: 'Flexibility (Flyers)', icon: Sparkles, color: 'text-pink-400' },
  { id: 'jumps', label: 'Jumps', icon: Trophy, color: 'text-emerald-400' }
];

export default function CheerMatrix({
  userId,
  athleteName = 'Mia Jenkins',
  athletePhoto = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  athleteGym = 'East Orange Jaguar Cheer / Top Gun All-Stars (L6)',
  gradYear = '2026',
  eventId = 'cheer_national_championship_2026',
  readOnly = false,
  className = ''
}: CheerMatrixProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const activeUid = userId || user?.uid || 'cheer_demo_athlete';
  const isOwner = Boolean(user && user.uid === activeUid) || !user;

  // Mode Selection: Mode 1 = "Athlete Passport", Mode 2 = "Live Coach / Judge Pad"
  const [activeMode, setActiveMode] = useState<'passport' | 'judge_pad'>('passport');

  // ============================================================================
  // MODE 1 STATE: ATHLETE PASSPORT & SKILL TREE
  // ============================================================================
  const [skills, setSkills] = useState<CheerSkillNode[]>(DEFAULT_SKILL_TREE);
  const [selectedCategory, setSelectedCategory] = useState<CheerCategory | 'all'>('all');
  const [activeSkillModal, setActiveSkillModal] = useState<CheerSkillNode | null>(null);
  const [isFlexCardOpen, setIsFlexCardOpen] = useState<boolean>(false);
  const [isCopyingShare, setIsCopyingShare] = useState<boolean>(false);

  // Edit/Video Modal Form States
  const [modalVideoUrl, setModalVideoUrl] = useState<string>('');
  const [modalSurface, setModalSurface] = useState<FloorSurface>('spring_floor');
  const [modalCleanHits, setModalCleanHits] = useState<number>(0);
  const [modalTotalAttempts, setModalTotalAttempts] = useState<number>(0);
  const [modalHitStreak, setModalHitStreak] = useState<number>(0);
  const [modalNotes, setModalNotes] = useState<string>('');

  // ============================================================================
  // MODE 2 STATE: LIVE COACH & JUDGE PAD
  // ============================================================================
  const [rulebookTier, setRulebookTier] = useState<JudgeRulebookTier>('college_stunt');
  const [difficultyScore, setDifficultyScore] = useState<number>(4.8);
  const [executionScore, setExecutionScore] = useState<number>(4.75);
  const [deductions, setDeductions] = useState<DeductionRecord[]>([]);
  const [routinePins, setRoutinePins] = useState<RoutinePin[]>([
    {
      id: 'pin-1',
      sectionIndex: 0,
      count: 5,
      label: 'Opening Stunt Full-Up Hit',
      type: 'stunt_hit',
      createdAt: '12:00:10'
    },
    {
      id: 'pin-2',
      sectionIndex: 1,
      count: 7,
      label: 'Running Full Pass Stuck',
      type: 'tumbling_hit',
      createdAt: '12:00:28'
    },
    {
      id: 'pin-3',
      sectionIndex: 2,
      count: 3,
      label: 'Pyramid Inversion Solid Lock',
      type: 'pyramid_hit',
      createdAt: '12:00:45'
    }
  ]);
  const [activeSection, setActiveSection] = useState<number>(0);
  const [isPlayingScrubber, setIsPlayingScrubber] = useState<boolean>(false);
  const [scrubberActiveCount, setScrubberActiveCount] = useState<{ section: number; count: number }>({ section: 0, count: 1 });
  const [lastDeductionFlash, setLastDeductionFlash] = useState<string | null>(null);

  // ============================================================================
  // FIRESTORE DATA PERSISTENCE HOOKS (Targeting /users/{uid}/cheer_matrix and /events/{eventId}/scores)
  // ============================================================================
  useEffect(() => {
    if (!db || !activeUid) return;

    try {
      const userMatrixRef = doc(db, 'users', activeUid, 'cheer_matrix', 'data');
      const unsubscribe = onSnapshot(userMatrixRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (Array.isArray(data.skills) && data.skills.length > 0) {
            setSkills(data.skills);
          }
        }
      }, (err) => {
        console.warn('[CheerMatrix] Firestore live snapshot note (using local cache):', err.message);
      });

      return () => unsubscribe();
    } catch (err) {
      console.warn('[CheerMatrix] Offline mode fallback active:', err);
    }
  }, [activeUid]);

  useEffect(() => {
    if (!db || !eventId) return;

    try {
      const eventScoresRef = doc(db, 'events', eventId, 'scores', 'live_judge_pad');
      const unsubscribe = onSnapshot(eventScoresRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.difficultyScore !== undefined) setDifficultyScore(data.difficultyScore);
          if (data.executionScore !== undefined) setExecutionScore(data.executionScore);
          if (Array.isArray(data.deductions)) setDeductions(data.deductions);
          if (Array.isArray(data.routinePins)) setRoutinePins(data.routinePins);
          if (data.rulebookTier) setRulebookTier(data.rulebookTier);
        }
      }, (err) => {
        console.warn('[CheerMatrix Live Judge] Event score snapshot notice:', err.message);
      });

      return () => unsubscribe();
    } catch (err) {
      console.warn('[CheerMatrix Live Judge] Event offline fallback active:', err);
    }
  }, [eventId]);

  // Sync back to Firestore on changes (debounced/defensive)
  const saveMatrixSkills = async (updatedSkills: CheerSkillNode[]) => {
    setSkills(updatedSkills);
    if (!db || !activeUid || readOnly) return;
    try {
      const userMatrixRef = doc(db, 'users', activeUid, 'cheer_matrix', 'data');
      await setDoc(userMatrixRef, {
        skills: updatedSkills,
        athleteName,
        gradYear,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err: any) {
      console.warn('[CheerMatrix] Saved locally, remote sync paused:', err?.message);
    }
  };

  const saveLiveScores = async (
    diff: number,
    exec: number,
    deds: DeductionRecord[],
    pins: RoutinePin[],
    tier: JudgeRulebookTier
  ) => {
    if (!db || !eventId || readOnly) return;
    try {
      const eventScoresRef = doc(db, 'events', eventId, 'scores', 'live_judge_pad');
      await setDoc(eventScoresRef, {
        difficultyScore: diff,
        executionScore: exec,
        deductions: deds,
        routinePins: pins,
        rulebookTier: tier,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err: any) {
      console.warn('[CheerMatrix Judge] Saved locally, remote event sync paused:', err?.message);
    }
  };

  // ============================================================================
  // CALCULATIONS: READINESS RADAR & SCORES
  // ============================================================================
  const totalSkillsCount = skills.length;
  const unlockedSkillsCount = skills.filter((s) => s.unlocked).length;
  const deadMatVerifiedCount = skills.filter((s) => s.unlocked && s.surface === 'dead_floor').length;
  const springFloorCount = skills.filter((s) => s.unlocked && s.surface === 'spring_floor').length;

  const readinessPercent = Math.min(100, Math.round((unlockedSkillsCount / Math.max(1, totalSkillsCount)) * 100));

  // Category readiness breakdown
  const categoryReadiness = useMemo(() => {
    const categories: CheerCategory[] = ['standing_tumbling', 'running_tumbling', 'building', 'flexibility', 'jumps'];
    const mapping: Record<CheerCategory, number> = {
      standing_tumbling: 0,
      running_tumbling: 0,
      building: 0,
      flexibility: 0,
      jumps: 0
    };

    categories.forEach((cat) => {
      const catSkills = skills.filter((s) => s.category === cat);
      const catUnlocked = catSkills.filter((s) => s.unlocked).length;
      mapping[cat] = Math.round((catUnlocked / Math.max(1, catSkills.length)) * 100);
    });

    return mapping;
  }, [skills]);

  // Live Judge Math
  const totalDeductions = useMemo(() => {
    return deductions.reduce((acc, d) => acc + d.amount, 0);
  }, [deductions]);

  const subtotalScore = Math.max(0, difficultyScore + executionScore);
  const finalScore = Math.max(0, parseFloat((subtotalScore - totalDeductions).toFixed(2)));
  const isHitZero = totalDeductions === 0 && subtotalScore > 0;

  // Rulebook Tier Caps & Info
  const tierConfig = useMemo(() => {
    switch (rulebookTier) {
      case 'rec_youth':
        return {
          name: 'Rec / Youth (USASF)',
          capText: 'Max Level 4 Skills • No Double Fulls • Single Inversion Caps',
          deductionSafetyFactor: 1.0,
          allowedTumble: 'Level 1 - 4'
        };
      case 'high_school':
        return {
          name: 'High School (NFHS)',
          capText: 'Strict Inversion Bracing • 1 Twist Max on Floor • NFHS Safety Strict',
          deductionSafetyFactor: 1.5,
          allowedTumble: 'Single Full Allowed (No Doubles)'
        };
      case 'college_stunt':
      default:
        return {
          name: 'College & STUNT',
          capText: 'Uncapped Elite Stunts • Doubles Permitted • STUNT 4-Quarter Fast Pacing',
          deductionSafetyFactor: 1.0,
          allowedTumble: 'Unrestricted NCAA D1'
        };
    }
  }, [rulebookTier]);

  // ============================================================================
  // ACTIONS: SKILL VAULT & STREAKS
  // ============================================================================
  const handleOpenSkillModal = (skill: CheerSkillNode) => {
    setActiveSkillModal(skill);
    setModalVideoUrl(skill.videoUrl || '');
    setModalSurface(skill.surface || 'spring_floor');
    setModalCleanHits(skill.cleanHits || 0);
    setModalTotalAttempts(skill.totalAttempts || 0);
    setModalHitStreak(skill.hitStreak || 0);
    setModalNotes(skill.notes || '');
  };

  const handleSaveSkillModal = () => {
    if (!activeSkillModal) return;

    const updated = skills.map((s) => {
      if (s.id === activeSkillModal.id) {
        return {
          ...s,
          videoUrl: modalVideoUrl.trim(),
          surface: modalSurface,
          cleanHits: modalCleanHits,
          totalAttempts: modalTotalAttempts,
          hitStreak: modalHitStreak,
          notes: modalNotes,
          unlocked: true,
          verifiedAt: s.verifiedAt || new Date().toISOString().split('T')[0]
        };
      }
      return s;
    });

    saveMatrixSkills(updated);
    setActiveSkillModal(null);
    showToast('success', 'Skill Verified & Updated', `${activeSkillModal.name} proof logged with ${modalCleanHits}/${modalTotalAttempts} clean hits.`);
  };

  const handleToggleUnlockFast = (e: React.MouseEvent, skillId: string) => {
    e.stopPropagation();
    const target = skills.find((s) => s.id === skillId);
    if (!target) return;

    const nextUnlocked = !target.unlocked;
    const updated = skills.map((s) => {
      if (s.id === skillId) {
        return {
          ...s,
          unlocked: nextUnlocked,
          verifiedAt: nextUnlocked ? new Date().toISOString().split('T')[0] : undefined
        };
      }
      return s;
    });

    saveMatrixSkills(updated);
    showToast(
      nextUnlocked ? 'success' : 'info',
      nextUnlocked ? 'Skill Unlocked!' : 'Marked In Progress',
      `${target.name} is now ${nextUnlocked ? 'unlocked and verified' : 'set to in progress'}.`
    );
  };

  // ============================================================================
  // ACTIONS: LIVE JUDGE PAD & DEDUCTIONS
  // ============================================================================
  const handleTriggerDeduction = (type: 'bobble' | 'fall' | 'pyramid_bust' | 'safety_violation') => {
    const configMap: Record<string, { label: string; amount: number }> = {
      bobble: { label: 'Bobble / Balance Check', amount: 0.25 },
      fall: { label: 'Major Stunt / Tumble Fall', amount: 0.50 },
      pyramid_bust: { label: 'Pyramid Structure Bust', amount: 1.00 },
      safety_violation: { label: 'Safety / Rule Infraction', amount: 1.50 }
    };

    const record: DeductionRecord = {
      id: `ded-${Date.now()}`,
      type,
      label: configMap[type].label,
      amount: configMap[type].amount,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      countLocation: `Sec ${activeSection + 1}, Count ${scrubberActiveCount.count}`
    };

    const nextDeds = [record, ...deductions];
    setDeductions(nextDeds);
    setLastDeductionFlash(type);
    setTimeout(() => setLastDeductionFlash(null), 800);

    saveLiveScores(difficultyScore, executionScore, nextDeds, routinePins, rulebookTier);
    showToast('error', `-${configMap[type].amount.toFixed(2)} Deduction Logged`, `${configMap[type].label} recorded.`);
  };

  const handleRemoveDeduction = (id: string) => {
    const nextDeds = deductions.filter((d) => d.id !== id);
    setDeductions(nextDeds);
    saveLiveScores(difficultyScore, executionScore, nextDeds, routinePins, rulebookTier);
  };

  const handleResetScores = () => {
    setDifficultyScore(4.8);
    setExecutionScore(4.75);
    setDeductions([]);
    setRoutinePins([]);
    saveLiveScores(4.8, 4.75, [], [], rulebookTier);
    showToast('info', 'Judge Pad Reset', 'Scores and deductions wiped clean. Ready for next routine.');
  };

  const handleAddRoutinePin = (sectionIndex: number, count: number) => {
    const pinTypes: ('stunt_hit' | 'tumbling_hit' | 'pyramid_hit' | 'toss_hit')[] = [
      'stunt_hit',
      'tumbling_hit',
      'pyramid_hit',
      'toss_hit'
    ];
    const chosenType = pinTypes[sectionIndex % pinTypes.length];
    const labelNames = {
      stunt_hit: 'Partner Stunt Hit',
      tumbling_hit: 'Tumbling Pass Stuck',
      pyramid_hit: 'Pyramid Hit Solid',
      toss_hit: 'Basket Toss Stuck'
    };

    const newPin: RoutinePin = {
      id: `pin-${Date.now()}`,
      sectionIndex,
      count,
      label: `${labelNames[chosenType]} (Count ${count})`,
      type: chosenType,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const nextPins = [...routinePins, newPin];
    setRoutinePins(nextPins);
    saveLiveScores(difficultyScore, executionScore, deductions, nextPins, rulebookTier);
    showToast('success', 'Routine Pin Dropped', `Pinned ${newPin.label} on Section ${sectionIndex + 1}.`);
  };

  // 8-Count Scrubber Playback Simulation
  useEffect(() => {
    let interval: any = null;
    if (isPlayingScrubber) {
      interval = setInterval(() => {
        setScrubberActiveCount((prev) => {
          let nextCount = prev.count + 1;
          let nextSection = prev.section;
          if (nextCount > 8) {
            nextCount = 1;
            nextSection = (nextSection + 1) % 4;
            setActiveSection(nextSection);
          }
          return { section: nextSection, count: nextCount };
        });
      }, 550); // Cheer 8-count beat tempo (~110-120 BPM)
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isPlayingScrubber]);

  // Filter skills
  const filteredSkills = useMemo(() => {
    if (selectedCategory === 'all') return skills;
    return skills.filter((s) => s.category === selectedCategory);
  }, [skills, selectedCategory]);

  return (
    <div className={`w-full min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-teal-500 selection:text-black ${className}`}>
      {/* Top Banner Navigation & Segmented Mode Switcher */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo & Platform Tag */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 via-emerald-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/20 border border-teal-400/40">
                <Sparkles className="w-5 h-5 text-zinc-950 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black tracking-tight text-white uppercase italic">
                    Cheer<span className="text-teal-400">Matrix</span>
                  </h1>
                  <span className="text-[10px] uppercase font-mono tracking-widest px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/30 font-bold">
                    D1 RADAR
                  </span>
                </div>
                <p className="text-xs text-zinc-400 font-medium">
                  Identity, Verified Skills & Live Routine Judge Engine
                </p>
              </div>
            </div>

            {/* Quick Mobile Status */}
            <div className="flex items-center gap-2 md:hidden">
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/30 font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                {readinessPercent}% D1
              </span>
            </div>
          </div>

          {/* TOP-LEVEL SEGMENTED CONTROL SWITCHER */}
          <div className="flex items-center bg-zinc-900/90 p-1 rounded-2xl border border-zinc-800 shadow-inner w-full md:w-auto">
            <button
              onClick={() => setActiveMode('passport')}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all ${
                activeMode === 'passport'
                  ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-zinc-950 shadow-md shadow-teal-500/25'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <ShieldCheck className={`w-4 h-4 ${activeMode === 'passport' ? 'text-zinc-950' : 'text-teal-400'}`} />
              <span>Athlete Passport</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${activeMode === 'passport' ? 'bg-zinc-950/20 text-zinc-950 font-black' : 'bg-zinc-800 text-zinc-400'}`}>
                {unlockedSkillsCount}
              </span>
            </button>

            <button
              onClick={() => setActiveMode('judge_pad')}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all ${
                activeMode === 'judge_pad'
                  ? 'bg-gradient-to-r from-red-500 via-rose-500 to-amber-500 text-white shadow-md shadow-red-500/25'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <Activity className={`w-4 h-4 ${activeMode === 'judge_pad' ? 'text-white' : 'text-amber-400'}`} />
              <span>Live Coach / Judge Pad</span>
              {isHitZero && (
                <span className="animate-pulse bg-emerald-400 text-zinc-950 text-[9px] font-black px-1.5 py-0.2 rounded uppercase">
                  Zero
                </span>
              )}
            </button>
          </div>

          {/* Quick Actions (Export Card & Share) */}
          <div className="hidden lg:flex items-center gap-2.5">
            <button
              onClick={() => setIsFlexCardOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400/20 to-teal-400/20 text-amber-300 border border-amber-400/40 text-xs font-bold hover:bg-amber-400/30 transition-colors shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Export Flex Card</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className={`max-w-7xl mx-auto px-4 py-6 sm:px-6 space-y-6 ${activeMode === 'judge_pad' ? 'pb-48 md:pb-28' : 'pb-32 md:pb-16'}`}>

        {/* ========================================================================= */}
        {/* MODE 1: ATHLETE PASSPORT & SKILL TREE */}
        {/* ========================================================================= */}
        {activeMode === 'passport' && (
          <div className="space-y-6">
            
            {/* 1. CHEER IDENTITY HEADER & ATHLETE DOSSIER */}
            <div className="relative overflow-hidden rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl">
              {/* Background Ambient Glow */}
              <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-start justify-between gap-6">
                
                {/* Left: Avatar & Badges */}
                <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
                  <div className="relative group">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-teal-400/50 shadow-xl shadow-teal-500/20 bg-zinc-950 relative">
                      <img
                        src={athletePhoto}
                        alt={athleteName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="absolute -bottom-2 -right-2 p-1.5 rounded-xl bg-zinc-950 border border-teal-400/60 shadow-md">
                      <ShieldCheck className="w-5 h-5 text-teal-400" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        {athleteName}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-teal-500/15 text-teal-300 border border-teal-500/30">
                        Class of {gradYear}
                      </span>
                    </div>

                    <p className="text-sm text-zinc-400 font-medium">
                      {athleteGym}
                    </p>

                    {/* DYNAMIC CHEER BADGES */}
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-1">
                      <span className="px-2.5 py-1 rounded-lg bg-amber-400/15 text-amber-300 border border-amber-400/40 text-xs font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                        <Flame className="w-3.5 h-3.5 text-amber-400" />
                        Level 6 Premier
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/30 text-xs font-semibold">
                        Flyer / Top
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/30 text-xs font-semibold">
                        Elite Tumbler
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30 text-xs font-semibold">
                        STUNT Ready
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        USASF Verified
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Quick Flex Summary & Export Card Trigger */}
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto justify-end">
                  
                  {/* Floor Truth Stat Pill */}
                  <div className="flex items-center gap-3 bg-zinc-950/80 border border-zinc-800 p-3.5 rounded-2xl w-full sm:w-auto">
                    <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
                      <Flame className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <div className="text-lg font-black text-amber-300">
                        {deadMatVerifiedCount} <span className="text-xs font-bold text-zinc-400">Skills</span>
                      </div>
                      <div className="text-[10px] uppercase font-mono tracking-wider text-amber-400/90 font-bold">
                        DEAD MAT VERIFIED
                      </div>
                    </div>
                  </div>

                  {/* Export Flex Card Button */}
                  <button
                    onClick={() => setIsFlexCardOpen(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-teal-400 text-zinc-950 font-black text-sm tracking-wide shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-transform"
                  >
                    <Sparkles className="w-4 h-4 fill-zinc-950" />
                    <span>EXPORT FLEX CARD</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 2. COLLEGE / STUNT READINESS RADAR & CATEGORY BREAKDOWN */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Circular Progress Ring Card */}
              <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-xl">
                <div className="absolute top-3 left-4 text-[11px] font-mono uppercase tracking-widest text-zinc-400">
                  D1 Scouting Match
                </div>

                <div className="relative w-44 h-44 my-4 flex items-center justify-center">
                  {/* SVG Circular Ring */}
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-zinc-800"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="url(#radarGradient)"
                      strokeWidth="8"
                      strokeDasharray={2 * Math.PI * 40}
                      strokeDashoffset={2 * Math.PI * 40 * (1 - readinessPercent / 100)}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                      fill="transparent"
                    />
                    <defs>
                      <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#2dd4bf" />
                        <stop offset="50%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#f59e0b" />
                      </linearGradient>
                    </defs>
                  </svg>

                  {/* Inner Content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-black tracking-tight text-white">
                      {readinessPercent}%
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-teal-400">
                      D1 GAMEDAY
                    </span>
                  </div>
                </div>

                <div className="w-full bg-zinc-950/70 p-3 rounded-2xl border border-zinc-800/80 text-xs">
                  <div className="text-zinc-300 font-bold">
                    {unlockedSkillsCount} of {totalSkillsCount} Elite Milestones Hit
                  </div>
                  <div className="text-zinc-400 text-[11px] mt-0.5">
                    Target: 80%+ verified on collegiate dead floor
                  </div>
                </div>
              </div>

              {/* 5 Disciplines Breakdown Progress Meters */}
              <div className="lg:col-span-2 rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-teal-400" />
                      Discipline Readiness Radar
                    </h3>
                    <span className="text-xs text-zinc-400 font-mono">
                      All-Girl & Coed D1 Standards
                    </span>
                  </div>

                  <div className="space-y-3.5">
                    {/* Standing Tumbling */}
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-zinc-300 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-teal-400" />
                          Standing Tumbling Power
                        </span>
                        <span className="text-teal-400 font-mono">{categoryReadiness.standing_tumbling}%</span>
                      </div>
                      <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                        <div
                          className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-700"
                          style={{ width: `${categoryReadiness.standing_tumbling}%` }}
                        />
                      </div>
                    </div>

                    {/* Running Tumbling */}
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-zinc-300 flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-amber-400" />
                          Running Tumbling Pass Twisting
                        </span>
                        <span className="text-amber-400 font-mono">{categoryReadiness.running_tumbling}%</span>
                      </div>
                      <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-700"
                          style={{ width: `${categoryReadiness.running_tumbling}%` }}
                        />
                      </div>
                    </div>

                    {/* Building / Stunts */}
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-zinc-300 flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-purple-400" />
                          Building & Inversions (Bases/Backspots)
                        </span>
                        <span className="text-purple-400 font-mono">{categoryReadiness.building}%</span>
                      </div>
                      <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 rounded-full transition-all duration-700"
                          style={{ width: `${categoryReadiness.building}%` }}
                        />
                      </div>
                    </div>

                    {/* Flexibility (Flyers) */}
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-zinc-300 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                          Flexibility & Body Lines (Flyers)
                        </span>
                        <span className="text-pink-400 font-mono">{categoryReadiness.flexibility}%</span>
                      </div>
                      <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                        <div
                          className="h-full bg-gradient-to-r from-pink-500 to-rose-400 rounded-full transition-all duration-700"
                          style={{ width: `${categoryReadiness.flexibility}%` }}
                        />
                      </div>
                    </div>

                    {/* Jumps */}
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-zinc-300 flex items-center gap-1.5">
                          <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                          Jumps Height & Hyper-extension
                        </span>
                        <span className="text-emerald-400 font-mono">{categoryReadiness.jumps}%</span>
                      </div>
                      <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700"
                          style={{ width: `${categoryReadiness.jumps}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
                  <span>Collegiate recruiting benchmark: 80% with verified video proof.</span>
                  <span className="text-teal-400 font-bold">STUNT Varsity Eligible</span>
                </div>
              </div>
            </div>

            {/* 3. GAMIFIED SKILL TREE (THE CORE FEATURE) */}
            <div className="space-y-4">
              
              {/* Category Filter Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black uppercase italic tracking-tight text-white">
                    Skill Progression Tree
                  </h3>
                  <span className="text-xs text-zinc-400 font-medium">
                    (Tap any node to view proof or log hit streaks)
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800">
                  {CATEGORY_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = selectedCategory === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setSelectedCategory(tab.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-800/40'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${tab.color}`} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SKILL NODES PROGRESSION GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSkills.map((skill, index) => {
                  const isVerified = skill.unlocked;
                  const isDeadMat = skill.surface === 'dead_floor';

                  return (
                    <motion.div
                      key={skill.id}
                      whileHover={{ scale: 1.015, y: -2 }}
                      transition={{ duration: 0.15 }}
                      onClick={() => handleOpenSkillModal(skill)}
                      className={`relative overflow-hidden rounded-2xl p-5 border cursor-pointer transition-all ${
                        isVerified
                          ? isDeadMat
                            ? 'bg-gradient-to-br from-zinc-900 to-amber-950/20 border-amber-500/40 shadow-lg shadow-amber-500/10 hover:border-amber-400'
                            : 'bg-gradient-to-br from-zinc-900 to-teal-950/20 border-teal-500/40 shadow-lg shadow-teal-500/10 hover:border-teal-400'
                          : 'bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700 text-zinc-400'
                      }`}
                    >
                      {/* Top Node Meta & Order Step */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-mono font-bold flex items-center justify-center text-zinc-400">
                            #{skill.order}
                          </span>
                          <span className="text-xs uppercase font-mono px-2 py-0.5 rounded bg-zinc-950/80 text-zinc-300 border border-zinc-800">
                            {skill.level}
                          </span>
                        </div>

                        {/* Quick Unlock Toggle */}
                        <button
                          onClick={(e) => handleToggleUnlockFast(e, skill.id)}
                          title={isVerified ? 'Click to mark In Progress' : 'Click to Verify'}
                          className={`p-1.5 rounded-xl border transition-colors ${
                            isVerified
                              ? 'bg-teal-500/20 border-teal-500/50 text-teal-400 hover:bg-teal-500/30'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {isVerified ? (
                            <CheckCircle2 className="w-4 h-4 text-teal-400" />
                          ) : (
                            <Lock className="w-4 h-4 text-zinc-400" />
                          )}
                        </button>
                      </div>

                      {/* Skill Name */}
                      <h4 className={`text-base font-black tracking-tight mb-2 ${isVerified ? 'text-white' : 'text-zinc-300'}`}>
                        {skill.name}
                      </h4>

                      {/* Notes / Description */}
                      {skill.notes && (
                        <p className="text-xs text-zinc-400 line-clamp-2 mb-3 leading-relaxed">
                          {skill.notes}
                        </p>
                      )}

                      {/* Badging: Floor Truth & Hit Streak */}
                      <div className="flex flex-wrap items-center gap-2 mt-auto pt-2 border-t border-zinc-800/60">
                        
                        {/* FLOOR TRUTH BADGE */}
                        {isVerified ? (
                          isDeadMat ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/50 shadow-sm shadow-amber-400/20 font-mono uppercase">
                              <Flame className="w-3 h-3 text-amber-400 animate-pulse" />
                              DEAD MAT VERIFIED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-teal-400/15 text-teal-300 border border-teal-400/30 font-mono uppercase">
                              Spring Floor
                            </span>
                          )
                        ) : (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-zinc-800/60 text-zinc-400">
                            In Progress
                          </span>
                        )}

                        {/* Clean Hits & Streak Counter Pill */}
                        <div className="ml-auto flex items-center gap-1 text-[11px] font-mono text-zinc-300 bg-zinc-950 px-2 py-0.5 rounded-md border border-zinc-800">
                          <span className="text-teal-400 font-bold">{skill.cleanHits}</span>
                          <span className="text-zinc-400">/</span>
                          <span>{skill.totalAttempts || skill.cleanHits} Hits</span>
                          {skill.hitStreak > 0 && (
                            <span className="text-amber-400 font-bold ml-1 flex items-center">
                              🔥{skill.hitStreak}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Video indicator tag */}
                      {skill.videoUrl && (
                        <div className="absolute top-2 right-12">
                          <span className="p-1 rounded-md bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center" title="Video proof attached">
                            <Video className="w-3 h-3" />
                          </span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 2: LIVE COACH / JUDGE PAD */}
        {/* ========================================================================= */}
        {activeMode === 'judge_pad' && (
          <div className="space-y-6 pb-24">
            
            {/* 1. RULEBOOK / TIER SWITCHER */}
            <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-5 shadow-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-black uppercase tracking-wide text-white flex items-center gap-2">
                    <Flag className="w-5 h-5 text-amber-400" />
                    Live Judging Rulebook & Tier Matrix
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Switch governance to adapt deduction math, inversion safety caps, and twisting limits.
                  </p>
                </div>

                <button
                  onClick={handleResetScores}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-colors border border-zinc-700"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Sheet</span>
                </button>
              </div>

              {/* Pill Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => {
                    setRulebookTier('rec_youth');
                    saveLiveScores(difficultyScore, executionScore, deductions, routinePins, 'rec_youth');
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    rulebookTier === 'rec_youth'
                      ? 'bg-teal-500/10 border-teal-400/60 shadow-md shadow-teal-500/10'
                      : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-white">Rec / Youth (USASF)</span>
                    {rulebookTier === 'rec_youth' && <CheckCircle2 className="w-4 h-4 text-teal-400" />}
                  </div>
                  <p className="text-xs text-zinc-400">Levels 1-4 • Standard deduction math</p>
                </button>

                <button
                  onClick={() => {
                    setRulebookTier('high_school');
                    saveLiveScores(difficultyScore, executionScore, deductions, routinePins, 'high_school');
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    rulebookTier === 'high_school'
                      ? 'bg-amber-500/10 border-amber-400/60 shadow-md shadow-amber-500/10'
                      : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-white">High School (NFHS)</span>
                    {rulebookTier === 'high_school' && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                  </div>
                  <p className="text-xs text-zinc-400">Max 1 Twist • Safety penalty 1.5x</p>
                </button>

                <button
                  onClick={() => {
                    setRulebookTier('college_stunt');
                    saveLiveScores(difficultyScore, executionScore, deductions, routinePins, 'college_stunt');
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    rulebookTier === 'college_stunt'
                      ? 'bg-red-500/10 border-red-400/60 shadow-md shadow-red-500/10'
                      : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-white">College & STUNT</span>
                    {rulebookTier === 'college_stunt' && <CheckCircle2 className="w-4 h-4 text-red-400" />}
                  </div>
                  <p className="text-xs text-zinc-400">Unrestricted • Doubles allowed • Fast tempo</p>
                </button>
              </div>

              {/* Active Tier Guidance Strip */}
              <div className="mt-3.5 px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs flex items-center justify-between gap-2 text-zinc-300">
                <span className="font-bold text-amber-400 font-mono">RULEBOOK ENFORCEMENT:</span>
                <span>{tierConfig.capText}</span>
              </div>
            </div>

            {/* 2. THE 8-COUNT ROUTINE SCRUBBER */}
            <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black uppercase tracking-wide text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-teal-400" />
                    The 8-Count Routine Scrubber (32 Counts Total)
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Tap any count box to drop a performance pin. Use tempo player to sync with music beats.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPlayingScrubber(!isPlayingScrubber)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isPlayingScrubber
                        ? 'bg-amber-400 text-zinc-950'
                        : 'bg-teal-500/20 text-teal-400 border border-teal-500/40 hover:bg-teal-500/30'
                    }`}
                  >
                    {isPlayingScrubber ? (
                      <>
                        <Pause className="w-3.5 h-3.5 fill-current" />
                        <span>Pause Beat</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Play 8-Count</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setScrubberActiveCount({ section: 0, count: 1 });
                      setIsPlayingScrubber(false);
                    }}
                    className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white"
                    title="Reset Scrubber to Start"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 4 Sections Horizontal Scrubber */}
              <div className="space-y-3">
                {['Section 1: Opening & Stunt Transition', 'Section 2: Running & Standing Tumbling', 'Section 3: Pyramid & Basket Tosses', 'Section 4: Dance, Routine Climax & Disclose'].map((secName, sIdx) => {
                  return (
                    <div key={sIdx} className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800/90 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-zinc-300 font-mono">{secName}</span>
                        <span className="text-[10px] text-zinc-400">Counts 1 - 8</span>
                      </div>

                      {/* 8 Count Buttons */}
                      <div className="grid grid-cols-8 gap-1.5 sm:gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((c) => {
                          const isCurrentActiveBeat =
                            isPlayingScrubber &&
                            scrubberActiveCount.section === sIdx &&
                            scrubberActiveCount.count === c;

                          const matchingPins = routinePins.filter(
                            (p) => p.sectionIndex === sIdx && p.count === c
                          );
                          const hasPin = matchingPins.length > 0;

                          return (
                            <button
                              key={c}
                              onClick={() => handleAddRoutinePin(sIdx, c)}
                              className={`relative h-12 sm:h-14 rounded-xl flex flex-col items-center justify-center transition-all border ${
                                isCurrentActiveBeat
                                  ? 'bg-amber-400 text-zinc-950 border-amber-300 scale-105 shadow-lg shadow-amber-400/40 z-10'
                                  : hasPin
                                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/50 shadow-sm'
                                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-white'
                              }`}
                            >
                              <span className="text-xs sm:text-sm font-black font-mono">
                                {c}
                              </span>
                              {hasPin && (
                                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Routine Pins Ledger */}
              {routinePins.length > 0 && (
                <div className="pt-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    Pinned Routine Milestones ({routinePins.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {routinePins.map((pin) => (
                      <span
                        key={pin.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-950 border border-teal-500/30 text-teal-300 text-xs"
                      >
                        <Check className="w-3 h-3 text-teal-400" />
                        <span className="font-bold">Sec {pin.sectionIndex + 1} • Ct {pin.count}:</span>
                        <span className="text-zinc-300">{pin.label}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. LIVE SCORING STEPPERS & 1-TAP DEDUCTION TRIGGERS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Difficulty & Execution Steppers Card */}
              <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-xl space-y-6">
                <div>
                  <h3 className="text-base font-black uppercase tracking-wide text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-teal-400" />
                    Judge Scoring Steppers
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Difficulty and Execution scored from 0.0 to 5.0 (Base Max 10.00).
                  </p>
                </div>

                {/* Stepper 1: Difficulty */}
                <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Difficulty</span>
                      <div className="text-2xl font-black text-white">{difficultyScore.toFixed(2)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const nextVal = Math.max(0, parseFloat((difficultyScore - 0.1).toFixed(2)));
                          setDifficultyScore(nextVal);
                          saveLiveScores(nextVal, executionScore, deductions, routinePins, rulebookTier);
                        }}
                        className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 flex items-center justify-center text-zinc-200 active:scale-95"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          const nextVal = Math.min(5.0, parseFloat((difficultyScore + 0.1).toFixed(2)));
                          setDifficultyScore(nextVal);
                          saveLiveScores(nextVal, executionScore, deductions, routinePins, rulebookTier);
                        }}
                        className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 flex items-center justify-center text-teal-400 active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.05"
                    value={difficultyScore}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setDifficultyScore(val);
                      saveLiveScores(val, executionScore, deductions, routinePins, rulebookTier);
                    }}
                    className="w-full accent-teal-400 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Stepper 2: Execution */}
                <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Execution</span>
                      <div className="text-2xl font-black text-white">{executionScore.toFixed(2)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const nextVal = Math.max(0, parseFloat((executionScore - 0.1).toFixed(2)));
                          setExecutionScore(nextVal);
                          saveLiveScores(difficultyScore, nextVal, deductions, routinePins, rulebookTier);
                        }}
                        className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 flex items-center justify-center text-zinc-200 active:scale-95"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          const nextVal = Math.min(5.0, parseFloat((executionScore + 0.1).toFixed(2)));
                          setExecutionScore(nextVal);
                          saveLiveScores(difficultyScore, nextVal, deductions, routinePins, rulebookTier);
                        }}
                        className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 flex items-center justify-center text-teal-400 active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.05"
                    value={executionScore}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setExecutionScore(val);
                      saveLiveScores(difficultyScore, val, deductions, routinePins, rulebookTier);
                    }}
                    className="w-full accent-teal-400 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* 1-Tap Deduction Triggers (Bright Red Buttons) */}
              <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-xl space-y-4">
                <div>
                  <h3 className="text-base font-black uppercase tracking-wide text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    1-Tap Deduction Triggers
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Instant scoring penalties. Live subtotals recalculate immediately.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Bobble (-0.25) */}
                  <button
                    onClick={() => handleTriggerDeduction('bobble')}
                    className="p-4 rounded-2xl bg-gradient-to-br from-red-600/20 to-red-900/30 border border-red-500/40 hover:border-red-400 text-left active:scale-[0.98] transition-transform shadow-lg shadow-red-500/5 group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black uppercase text-red-300">Bobble</span>
                      <span className="text-sm font-mono font-black text-red-400 bg-red-950/80 px-2 py-0.5 rounded border border-red-500/30">
                        -0.25
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 group-hover:text-zinc-300">
                      Balance check, flyer foot tap
                    </p>
                  </button>

                  {/* Fall (-0.50) */}
                  <button
                    onClick={() => handleTriggerDeduction('fall')}
                    className="p-4 rounded-2xl bg-gradient-to-br from-red-600/30 to-red-950/40 border border-red-500/50 hover:border-red-400 text-left active:scale-[0.98] transition-transform shadow-lg shadow-red-500/10 group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black uppercase text-red-300">Major Fall</span>
                      <span className="text-sm font-mono font-black text-red-400 bg-red-950/80 px-2 py-0.5 rounded border border-red-500/30">
                        -0.50
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 group-hover:text-zinc-300">
                      Stunt drop to floor / hands
                    </p>
                  </button>

                  {/* Pyramid Bust (-1.00) */}
                  <button
                    onClick={() => handleTriggerDeduction('pyramid_bust')}
                    className="p-4 rounded-2xl bg-gradient-to-br from-red-600/40 to-red-950/60 border border-red-500/60 hover:border-red-400 text-left active:scale-[0.98] transition-transform shadow-lg shadow-red-500/15 group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black uppercase text-red-300">Pyramid Bust</span>
                      <span className="text-sm font-mono font-black text-red-400 bg-red-950/80 px-2 py-0.5 rounded border border-red-500/30">
                        -1.00
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 group-hover:text-zinc-300">
                      Multi-structure collapse
                    </p>
                  </button>

                  {/* Safety Violation (-1.50) */}
                  <button
                    onClick={() => handleTriggerDeduction('safety_violation')}
                    className="p-4 rounded-2xl bg-gradient-to-br from-red-700/50 to-red-950/80 border border-red-500/70 hover:border-red-400 text-left active:scale-[0.98] transition-transform shadow-lg shadow-red-500/20 group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black uppercase text-red-200">Safety Rule</span>
                      <span className="text-sm font-mono font-black text-red-400 bg-red-950/80 px-2 py-0.5 rounded border border-red-500/30">
                        -1.50
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 group-hover:text-zinc-300">
                      Illegal rotation, brace break
                    </p>
                  </button>
                </div>

                {/* Deductions Event Ledger */}
                <div className="pt-2">
                  <div className="flex items-center justify-between text-xs font-bold text-zinc-400 mb-2">
                    <span>Logged Penalties ({deductions.length})</span>
                    <span className="text-red-400 font-mono">Total: -{totalDeductions.toFixed(2)}</span>
                  </div>

                  {deductions.length === 0 ? (
                    <div className="bg-zinc-950 p-4 rounded-2xl border border-dashed border-zinc-800 text-center text-xs text-zinc-500">
                      No deductions logged. Routine is currently clean.
                    </div>
                  ) : (
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                      {deductions.map((d) => (
                        <div
                          key={d.id}
                          className="flex items-center justify-between bg-zinc-950 px-3 py-2 rounded-xl border border-red-500/20 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-red-400">-{d.amount.toFixed(2)}</span>
                            <span className="text-zinc-200">{d.label}</span>
                            <span className="text-[10px] text-zinc-500">({d.countLocation || d.timestamp})</span>
                          </div>
                          <button
                            onClick={() => handleRemoveDeduction(d.id)}
                            className="p-1 rounded-md text-zinc-500 hover:text-red-400 hover:bg-zinc-800"
                            title="Undo this deduction"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* "HIT ZERO" MASSIVE CELEBRATORY BANNER (WHEN DEDUCTIONS == 0.00) */}
            {isHitZero && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-3xl bg-gradient-to-r from-teal-500/20 via-emerald-500/30 to-amber-500/20 border-2 border-teal-400/60 p-6 text-center relative overflow-hidden shadow-2xl shadow-teal-500/20"
              >
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-amber-400 animate-bounce" />
                    <span className="text-3xl sm:text-5xl font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-emerald-200 to-amber-300 drop-shadow-md">
                      HIT ZERO
                    </span>
                    <Sparkles className="w-6 h-6 text-teal-400 animate-bounce" />
                  </div>
                  <p className="text-sm font-bold text-teal-200 tracking-wide">
                    Clean Routine • 0.00 Deductions Incurred • Full Potential Reached
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODE 2: LIVE MATH BAR LOCKED AT BOTTOM */}
      {/* ========================================================================= */}
      {activeMode === 'judge_pad' && (
        <div className="fixed bottom-20 left-0 right-0 z-40 md:bottom-0 bg-zinc-950/95 backdrop-blur-lg border-t border-zinc-800 px-4 py-3 shadow-2xl">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Live Math Equation */}
            <div className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm font-mono overflow-x-auto w-full sm:w-auto">
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400">Diff:</span>
                <span className="font-bold text-white">{difficultyScore.toFixed(2)}</span>
              </div>
              <span className="text-zinc-600">+</span>
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400">Exec:</span>
                <span className="font-bold text-white">{executionScore.toFixed(2)}</span>
              </div>
              <span className="text-zinc-600">=</span>
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400">Subtotal:</span>
                <span className="font-bold text-teal-300">{subtotalScore.toFixed(2)}</span>
              </div>
              <span className="text-zinc-600">-</span>
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400">Deductions:</span>
                <span className="font-bold text-red-400">-{totalDeductions.toFixed(2)}</span>
              </div>
            </div>

            {/* Final Score Output */}
            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-black tracking-widest text-zinc-400">
                  FINAL SCORE:
                </span>
                <span className="text-2xl sm:text-3xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-amber-300">
                  {finalScore.toFixed(2)}
                </span>
                <span className="text-xs text-zinc-500 font-mono">/ 10.00</span>
              </div>

              {isHitZero && (
                <span className="px-2.5 py-1 rounded-xl bg-teal-400/20 text-teal-300 border border-teal-400/50 text-xs font-black tracking-wider uppercase flex items-center gap-1 animate-pulse">
                  <Check className="w-3.5 h-3.5" /> Hit Zero
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: VIDEO PROOF VAULT & HIT STREAK COUNTER */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {activeSkillModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl relative overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-950 text-teal-400 border border-zinc-800">
                      {activeSkillModal.level}
                    </span>
                    <span className="text-xs text-zinc-400 uppercase font-mono">
                      {activeSkillModal.category.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white">
                    {activeSkillModal.name}
                  </h3>
                </div>
                <button
                  onClick={() => setActiveSkillModal(null)}
                  className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Surface Selection */}
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Floor Truth Verification Surface
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setModalSurface('spring_floor')}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                        modalSurface === 'spring_floor'
                          ? 'bg-teal-500/20 text-teal-300 border-teal-400/50'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      Spring Floor (Standard)
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalSurface('dead_floor')}
                      className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        modalSurface === 'dead_floor'
                          ? 'bg-amber-400/20 text-amber-300 border-amber-400/60 shadow-sm shadow-amber-400/20'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      <span>DEAD MAT VERIFIED</span>
                    </button>
                  </div>
                </div>

                {/* Video URL Proof */}
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Video Proof URL (Google Drive CDN, YouTube, Hudl, TikTok)
                  </label>
                  <div className="flex items-center gap-2 bg-zinc-950 rounded-xl border border-zinc-800 px-3 py-2 focus-within:border-teal-400">
                    <Video className="w-4 h-4 text-zinc-400" />
                    <input
                      type="url"
                      placeholder="https://youtube.com/watch?v=... or Google Drive URL"
                      value={modalVideoUrl}
                      onChange={(e) => setModalVideoUrl(e.target.value)}
                      className="w-full bg-transparent text-sm text-white focus:outline-none placeholder:text-zinc-600"
                    />
                  </div>
                </div>

                {/* HIT STREAK COUNTER (+ / - Buttons) */}
                <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-amber-400" />
                      Clean Hit Streak Counter
                    </div>
                    <span className="text-xs font-mono text-teal-400 font-bold">
                      {modalCleanHits}/{modalTotalAttempts || modalCleanHits} Hits (
                      {Math.round((modalCleanHits / Math.max(1, modalTotalAttempts || modalCleanHits)) * 100)}%)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Clean Hits Stepper */}
                    <div className="flex items-center justify-between bg-zinc-900 p-2 rounded-xl border border-zinc-800">
                      <span className="text-xs text-zinc-400 pl-2">Clean Hits</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setModalCleanHits(Math.max(0, modalCleanHits - 1))}
                          className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm font-black font-mono text-white">
                          {modalCleanHits}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setModalCleanHits(modalCleanHits + 1);
                            if (modalTotalAttempts <= modalCleanHits) {
                              setModalTotalAttempts(modalCleanHits + 1);
                            }
                            setModalHitStreak(modalHitStreak + 1);
                          }}
                          className="w-8 h-8 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 flex items-center justify-center"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Total Attempts Stepper */}
                    <div className="flex items-center justify-between bg-zinc-900 p-2 rounded-xl border border-zinc-800">
                      <span className="text-xs text-zinc-400 pl-2">Attempts</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setModalTotalAttempts(Math.max(modalCleanHits, modalTotalAttempts - 1))}
                          className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm font-black font-mono text-white">
                          {modalTotalAttempts || modalCleanHits}
                        </span>
                        <button
                          type="button"
                          onClick={() => setModalTotalAttempts((modalTotalAttempts || modalCleanHits) + 1)}
                          className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Coach & Evaluator Notes
                  </label>
                  <textarea
                    rows={2}
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                    placeholder="e.g. Chest upright on dead floor landing, zero rebound, tight knee grab..."
                    className="w-full bg-zinc-950 rounded-xl border border-zinc-800 p-3 text-sm text-white focus:outline-none focus:border-teal-400 placeholder:text-zinc-600"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveSkillModal(null)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSkillModal}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-500 text-zinc-950 text-xs font-black tracking-wide shadow-lg shadow-teal-500/20 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Save Verification
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 2: EXPORT FLEX CARD (TIKTOK / INSTAGRAM TRADING CARD PREVIEW) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isFlexCardOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-900 border-2 border-amber-400/60 p-6 shadow-2xl relative overflow-hidden text-center"
            >
              {/* Holographic Card Background Accents */}
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-44 h-44 bg-teal-500/20 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-44 h-44 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />

              {/* Card Header Tag */}
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className="text-[10px] font-mono tracking-widest uppercase font-black px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  CHEERMATRIX TRADING CARD
                </span>
                <button
                  onClick={() => setIsFlexCardOpen(false)}
                  className="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Athlete Photo & Badge */}
              <div className="relative mx-auto w-36 h-36 rounded-2xl overflow-hidden border-2 border-amber-400/60 shadow-xl shadow-amber-400/20 mb-3 bg-zinc-950">
                <img
                  src={athletePhoto}
                  alt={athleteName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute bottom-1 right-1 px-2 py-0.5 rounded bg-zinc-950/90 text-[10px] font-black text-amber-400 border border-amber-400/40">
                  L6 PREMIER
                </div>
              </div>

              {/* Identity Details */}
              <h3 className="text-2xl font-black text-white tracking-tight">
                {athleteName}
              </h3>
              <p className="text-xs text-teal-400 font-bold tracking-wide mb-3">
                Class of {gradYear} • {athleteGym}
              </p>

              {/* Card Stats Grid */}
              <div className="grid grid-cols-3 gap-2 bg-zinc-950/90 p-3 rounded-2xl border border-zinc-800/90 mb-4 text-center">
                <div>
                  <div className="text-lg font-black text-white">{readinessPercent}%</div>
                  <div className="text-[9px] uppercase font-mono text-zinc-400">D1 Radar</div>
                </div>
                <div>
                  <div className="text-lg font-black text-amber-400">{deadMatVerifiedCount}</div>
                  <div className="text-[9px] uppercase font-mono text-zinc-400">Dead Mat</div>
                </div>
                <div>
                  <div className="text-lg font-black text-teal-400">{unlockedSkillsCount}</div>
                  <div className="text-[9px] uppercase font-mono text-zinc-400">Total Skills</div>
                </div>
              </div>

              {/* Dead Mat Verified Gold Seal */}
              <div className="py-2 px-3 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 mb-5">
                <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>OFFICIALLY DEAD MAT VERIFIED</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsCopyingShare(true);
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(window.location.href);
                    }
                    setTimeout(() => {
                      setIsCopyingShare(false);
                      showToast('success', 'Flex Card Link Copied', 'Shareable link ready for Instagram bio or TikTok video!');
                    }, 400);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-teal-400 text-zinc-950 font-black text-xs tracking-wide shadow-md shadow-amber-400/20"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{isCopyingShare ? 'Copied!' : 'Share to Story'}</span>
                </button>
                <button
                  onClick={() => {
                    showToast('success', 'Flex Card Ready', 'Instagram ready card saved.');
                  }}
                  className="p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                  title="Download Image"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export { CheerMatrix };
