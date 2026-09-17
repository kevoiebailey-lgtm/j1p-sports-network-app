import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, 
  ShieldCheck, 
  Sparkles, 
  Flame, 
  Zap, 
  Play, 
  Plus, 
  Edit3, 
  Check, 
  X, 
  SlidersHorizontal, 
  Award, 
  Layers, 
  ExternalLink, 
  Clock, 
  Video, 
  Filter, 
  Share2, 
  Save, 
  RefreshCw,
  Trophy,
  Activity,
  ChevronRight,
  Eye,
  AlertCircle,
  FileText,
  GraduationCap,
  Mail,
  PlusCircle
} from 'lucide-react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { CheerSkillItem, CheerSkillCategory, CheerSkillLevel, CheerSurface } from './types';
import { CHEER_CATEGORIES, DEFAULT_CHEER_SKILLS, LEVEL_BADGES, SURFACE_LABELS } from './defaultSkills';
import { SkillVideoModal } from './SkillVideoModal';
import { CheerRecruitPdfModal } from './CheerRecruitPdfModal';
import { CheerProgramMatcherModal } from './CheerProgramMatcherModal';
import { CheerCustomSkillModal } from './CheerCustomSkillModal';
import { CheerCoachOutreachModal } from './CheerCoachOutreachModal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface CheerMatrixProps {
  userId?: string;
  athleteName?: string;
  athleteAvatar?: string;
  gradYear?: string | number;
  position?: string;
  gpa?: string;
  schoolGym?: string;
  isOwner?: boolean;
  readOnly?: boolean;
  className?: string;
}

export const CheerMatrix: React.FC<CheerMatrixProps> = ({
  userId,
  athleteName = 'Cheer Athlete',
  athleteAvatar,
  gradYear = '2026',
  position = 'Flyer / Tumbler',
  gpa = '3.85',
  schoolGym = 'East Orange Jaguar Cheer / All-Star Elite',
  isOwner: isOwnerProp,
  readOnly = false,
  className = ''
}) => {
  const { user, profile: authProfile } = useAuth();
  const { showToast } = useToast();

  const activeUserId = userId || user?.uid || 'guest_athlete';
  const isOwner = isOwnerProp !== undefined ? isOwnerProp : Boolean(user && user.uid === activeUserId);

  // State management
  const [skills, setSkills] = useState<CheerSkillItem[]>(DEFAULT_CHEER_SKILLS);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<CheerSkillCategory | 'all'>('all');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>('all');
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);

  // Modal states
  const [activeVideoSkill, setActiveVideoSkill] = useState<CheerSkillItem | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);
  const [isProgramMatcherOpen, setIsProgramMatcherOpen] = useState<boolean>(false);
  const [isCustomSkillModalOpen, setIsCustomSkillModalOpen] = useState<boolean>(false);
  const [isCoachOutreachOpen, setIsCoachOutreachOpen] = useState<boolean>(false);

  // Edit Drawer State
  const [editingSkill, setEditingSkill] = useState<CheerSkillItem | null>(null);
  const [editForm, setEditForm] = useState<{
    verified: boolean;
    videoUrl: string;
    timestamp: string;
    surface: CheerSurface;
    level: CheerSkillLevel;
    notes: string;
  }>({
    verified: false,
    videoUrl: '',
    timestamp: '',
    surface: 'spring_floor',
    level: 'Level 5',
    notes: ''
  });

  // Load Cheer Matrix from Firestore under users/{userId}/cheerData/matrix
  useEffect(() => {
    let isMounted = true;

    const loadCheerMatrix = async () => {
      setLoading(true);
      if (!db || !activeUserId || activeUserId === 'guest_athlete') {
        // Check localStorage fallback
        try {
          const cached = localStorage.getItem(`just1play_cheermatrix_${activeUserId}`);
          if (cached && isMounted) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setSkills(parsed);
              setLoading(false);
              return;
            }
          }
        } catch {
          // ignore
        }
        if (isMounted) {
          setSkills(DEFAULT_CHEER_SKILLS);
          setLoading(false);
        }
        return;
      }

      try {
        const matrixDocRef = doc(db, 'users', activeUserId, 'cheerData', 'matrix');
        const snap = await getDoc(matrixDocRef);

        if (snap.exists() && isMounted) {
          const data = snap.data();
          if (Array.isArray(data.skills) && data.skills.length > 0) {
            // Merge loaded skills with default skills to ensure new skills exist
            const loadedMap = new Map<string, CheerSkillItem>(data.skills.map((s: CheerSkillItem) => [s.skillId, s]));
            const merged = DEFAULT_CHEER_SKILLS.map((defaultSkill) => {
              if (loadedMap.has(defaultSkill.skillId)) {
                return { ...defaultSkill, ...loadedMap.get(defaultSkill.skillId) };
              }
              return defaultSkill;
            });
            setSkills(merged);
          } else {
            setSkills(DEFAULT_CHEER_SKILLS);
          }
        } else if (isMounted) {
          setSkills(DEFAULT_CHEER_SKILLS);
        }
      } catch (err) {
        console.warn('Error loading cheer matrix from Firestore:', err);
        if (isMounted) setSkills(DEFAULT_CHEER_SKILLS);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadCheerMatrix();

    return () => {
      isMounted = false;
    };
  }, [activeUserId]);

  // Compute Dynamic College / All-Star Readiness Score (0-100%)
  const { readinessScore, verifiedCount, collegiateCount, totalSkills, ratingTier } = useMemo(() => {
    const total = skills.length;
    if (total === 0) {
      return { readinessScore: 0, verifiedCount: 0, collegiateCount: 0, totalSkills: 0, ratingTier: 'Evaluating' };
    }

    let scoreAccumulator = 0;
    let maxPossibleScore = 0;
    let verified = 0;
    let collegiate = 0;

    skills.forEach((skill) => {
      // Weight skills by difficulty
      let weight = 1;
      if (skill.level === 'Level 5') weight = 2;
      if (skill.level === 'Level 6') weight = 3;
      if (skill.level === 'NCAA D1') weight = 4;

      maxPossibleScore += weight * 2; // Verified gives full 2x, unverified clip gives 1x

      if (skill.verified) {
        verified += 1;
        scoreAccumulator += weight * 2;
        if (skill.level === 'NCAA D1' || skill.level === 'Level 6') {
          collegiate += 1;
        }
      } else if (skill.videoUrl && skill.videoUrl.trim().length > 0) {
        scoreAccumulator += weight * 1.2; // video provided gives partial credit
      }
    });

    const percentage = Math.min(100, Math.round((scoreAccumulator / Math.max(1, maxPossibleScore)) * 100));

    let tier = 'Prospect (Level 4/5)';
    if (percentage >= 85) tier = 'NCAA D1 / STUNT Elite Ready';
    else if (percentage >= 70) tier = 'NCAA D2 / STUNT College Ready';
    else if (percentage >= 50) tier = 'All-Star Premier (L6)';
    else if (percentage >= 30) tier = 'Competitive All-Star (L5)';

    return {
      readinessScore: percentage,
      verifiedCount: verified,
      collegiateCount: collegiate,
      totalSkills: total,
      ratingTier: tier
    };
  }, [skills]);

  // Save changes to Firestore
  const handleSaveToFirestore = async (updatedSkills: CheerSkillItem[]) => {
    setSkills(updatedSkills);

    // Save to localStorage as immediate cache
    try {
      localStorage.setItem(`just1play_cheermatrix_${activeUserId}`, JSON.stringify(updatedSkills));
    } catch {
      // ignore
    }

    if (!db || !activeUserId || activeUserId === 'guest_athlete') return;

    setIsSaving(true);
    try {
      const matrixDocRef = doc(db, 'users', activeUserId, 'cheerData', 'matrix');
      await setDoc(matrixDocRef, {
        userId: activeUserId,
        athleteName: athleteName,
        skills: updatedSkills,
        readinessScore: readinessScore,
        lastUpdated: new Date().toISOString(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      showToast('success', 'CheerMatrix Saved', 'Skill verification records synced to Just1Play.');
    } catch (err) {
      console.error('Error saving CheerMatrix to Firestore:', err);
      showToast('error', 'Sync Failed', 'Failed to save to cloud database.');
    } finally {
      setIsSaving(false);
    }
  };

  // Add Custom Specialty Pass / Stunt
  const handleAddCustomSkill = async (newSkill: CheerSkillItem) => {
    const updatedSkills = [newSkill, ...skills];
    await handleSaveToFirestore(updatedSkills);
    showToast('success', 'Custom Skill Added', `${newSkill.name} added to your CheerMatrix.`);
  };

  // Open Edit Drawer for a Skill
  const handleOpenEdit = (skill: CheerSkillItem) => {
    setEditingSkill(skill);
    setEditForm({
      verified: skill.verified,
      videoUrl: skill.videoUrl || '',
      timestamp: skill.timestamp || '',
      surface: skill.surface || 'spring_floor',
      level: skill.level,
      notes: skill.notes || ''
    });
  };

  // Save Edit Drawer Changes
  const handleApplyEdit = () => {
    if (!editingSkill) return;

    const updated = skills.map((s) => {
      if (s.skillId === editingSkill.skillId) {
        return {
          ...s,
          verified: editForm.verified,
          videoUrl: editForm.videoUrl.trim(),
          timestamp: editForm.timestamp.trim(),
          surface: editForm.surface,
          level: editForm.level,
          notes: editForm.notes.trim(),
          updatedAt: new Date().toISOString()
        };
      }
      return s;
    });

    handleSaveToFirestore(updated);
    setEditingSkill(null);
  };

  // Toggle Verification status directly
  const handleToggleVerified = (skillId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly || !isOwner) return;

    const updated = skills.map((s) => {
      if (s.skillId === skillId) {
        const nextVerified = !s.verified;
        return { ...s, verified: nextVerified };
      }
      return s;
    });

    handleSaveToFirestore(updated);
  };

  // Filter skills
  const filteredSkills = useMemo(() => {
    return skills.filter((skill) => {
      if (activeCategory !== 'all' && skill.category !== activeCategory) {
        return false;
      }
      if (selectedLevelFilter !== 'all' && skill.level !== selectedLevelFilter) {
        return false;
      }
      if (verifiedOnly && !skill.verified) {
        return false;
      }
      return true;
    });
  }, [skills, activeCategory, selectedLevelFilter, verifiedOnly]);

  return (
    <div className={`w-full space-y-6 text-neutral-100 font-sans ${className}`}>
      
      {/* Top Banner & Readiness Meter Deck (Obsidian Glassmorphic Card) */}
      <div className="relative bg-[#0a0a0a]/90 border border-neutral-800 rounded-3xl p-5 sm:p-7 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Glow ambient background accents */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          
          {/* Header Title & Athlete Meta */}
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono font-bold tracking-widest text-emerald-400 uppercase">
                Just1Play Scouting Radar
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>CheerMatrix</span>
              <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-700 text-sky-400 font-bold uppercase tracking-wider">
                Skill Verification
              </span>
            </h2>

            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
              Official skill verification dossier for college cheer recruiting, STUNT programs, and all-star premier rosters. Every verified skill includes video evidence and floor surface audit.
            </p>

            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-neutral-400 bg-neutral-900/90 px-2.5 py-1 rounded-xl border border-neutral-800">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{verifiedCount} of {totalSkills} Verified</span>
              </span>

              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-neutral-400 bg-neutral-900/90 px-2.5 py-1 rounded-xl border border-neutral-800">
                <Trophy className="w-3.5 h-3.5 text-purple-400" />
                <span>{collegiateCount} D1/L6 Skills</span>
              </span>

              {isSaving && (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-sky-400 animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Syncing to Firestore...</span>
                </span>
              )}
            </div>
          </div>

          {/* Dynamic College / All-Star Readiness Score Gauge */}
          <div className="w-full lg:w-auto bg-neutral-900/80 border border-neutral-800/90 rounded-3xl p-5 backdrop-blur-md flex flex-col sm:flex-row items-center gap-5 shrink-0 shadow-lg">
            
            {/* Circular / Radial Readiness Dial */}
            <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-neutral-800"
                  strokeWidth="8"
                  fill="transparent"
                />
                {/* Neon Progress Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="transition-all duration-1000 ease-out"
                  stroke={readinessScore >= 70 ? '#10b981' : '#38bdf8'}
                  strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 40}
                  strokeDashoffset={2 * Math.PI * 40 * (1 - readinessScore / 100)}
                  strokeLinecap="round"
                  fill="transparent"
                  style={{
                    filter: readinessScore >= 70 ? 'drop-shadow(0 0 6px #10b981)' : 'drop-shadow(0 0 6px #38bdf8)'
                  }}
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black font-mono text-white tracking-tight">
                  {readinessScore}%
                </span>
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-neutral-400">
                  Readiness
                </span>
              </div>
            </div>

            {/* Score Breakdown & Recruiter Rating */}
            <div className="space-y-1.5 text-center sm:text-left">
              <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 font-bold">
                College Recruiting Status
              </div>
              <div className="text-base font-black text-white flex items-center justify-center sm:justify-start gap-1.5">
                <span className="text-emerald-400">&bull;</span>
                <span>{ratingTier}</span>
              </div>
              <p className="text-[11px] text-neutral-400 max-w-[210px] leading-tight">
                Calculated in real-time from verified collegiate standing/running tumbling, elite releases, and flexibility lines.
              </p>
            </div>

          </div>

        </div>

        {/* Zero-Cost High-Impact Action Toolbar */}
        <div className="relative z-10 pt-5 mt-5 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* 1. PDF Recruiting Dossier */}
            <button
              type="button"
              onClick={() => setIsPdfModalOpen(true)}
              className="px-4 py-2 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-mono font-bold uppercase tracking-wider border border-emerald-500/40 hover:border-emerald-400 transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.15)] group"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span>Recruit PDF Dossier</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">1-Page</span>
            </button>

            {/* 2. College Program Matcher */}
            <button
              type="button"
              onClick={() => setIsProgramMatcherOpen(true)}
              className="px-4 py-2 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-mono font-bold uppercase tracking-wider border border-sky-500/40 hover:border-sky-400 transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(56,189,248,0.15)] group"
            >
              <GraduationCap className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition-transform" />
              <span>College Matcher</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono">NCAA Rubric</span>
            </button>

            {/* 3. Coach Outreach Generator */}
            <button
              type="button"
              onClick={() => setIsCoachOutreachOpen(true)}
              className="px-4 py-2 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-mono font-bold uppercase tracking-wider border border-amber-500/40 hover:border-amber-400 transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.15)] group"
            >
              <Mail className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>Coach Outreach Letter</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">1-Click</span>
            </button>
          </div>

          {/* 4. Add Custom Skill (if owner or editing) */}
          {!readOnly && (
            <button
              type="button"
              onClick={() => setIsCustomSkillModalOpen(true)}
              className="px-4 py-2 rounded-2xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-mono font-bold uppercase tracking-wider border border-purple-500/40 hover:border-purple-400 transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(168,85,247,0.15)]"
            >
              <PlusCircle className="w-3.5 h-3.5 text-purple-400" />
              <span>+ Custom Specialty Pass</span>
            </button>
          )}
        </div>

      </div>

      {/* Interactive Category Selector & Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-2 rounded-2xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeCategory === 'all'
                ? 'bg-neutral-100 text-neutral-950 shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                : 'bg-neutral-900/90 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800'
            }`}
          >
            <span>All Skills</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-neutral-800/80 text-neutral-300 font-mono">
              {skills.length}
            </span>
          </button>

          {CHEER_CATEGORIES.map((cat) => {
            const count = skills.filter((s) => s.category === cat.id).length;
            const verifiedInCat = skills.filter((s) => s.category === cat.id && s.verified).length;
            const isActive = activeCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                  isActive
                    ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-neutral-950 shadow-[0_0_20px_rgba(56,189,248,0.4)]'
                    : 'bg-neutral-900/90 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800'
                }`}
              >
                <span>{cat.shortName}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  isActive ? 'bg-neutral-950 text-sky-400' : 'bg-neutral-800 text-emerald-400'
                }`}>
                  {verifiedInCat}/{count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Level Filters & Verified-Only Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={selectedLevelFilter}
            onChange={(e) => setSelectedLevelFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-200 outline-none focus:border-sky-500 transition-colors cursor-pointer"
          >
            <option value="all">All Difficulty Levels</option>
            <option value="Level 4">Level 4</option>
            <option value="Level 5">Level 5</option>
            <option value="Level 6">Level 6</option>
            <option value="NCAA D1">NCAA D1 Ready</option>
          </select>

          <button
            type="button"
            onClick={() => setVerifiedOnly(!verifiedOnly)}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              verifiedOnly
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Verified Only</span>
          </button>
        </div>

      </div>

      {/* Skills Grid Matrix */}
      {filteredSkills.length === 0 ? (
        <div className="bg-neutral-900/50 border border-neutral-800/80 rounded-3xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-neutral-800 flex items-center justify-center mx-auto text-neutral-500">
            <Filter className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">No skills match the current filter</h3>
          <p className="text-xs text-neutral-400">Try resetting difficulty filters or selecting "All Skills".</p>
          <button
            onClick={() => {
              setActiveCategory('all');
              setSelectedLevelFilter('all');
              setVerifiedOnly(false);
            }}
            className="px-4 py-2 rounded-xl bg-neutral-800 text-sky-400 text-xs font-mono font-bold hover:bg-neutral-700 cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {filteredSkills.map((skill) => {
            const levelMeta = LEVEL_BADGES[skill.level] || LEVEL_BADGES['Level 5'];
            const surfaceMeta = skill.surface ? SURFACE_LABELS[skill.surface] : null;
            const hasVideo = Boolean(skill.videoUrl && skill.videoUrl.trim().length > 0);

            return (
              <div
                key={skill.skillId}
                className={`relative bg-neutral-900/80 border rounded-3xl p-5 backdrop-blur-md transition-all duration-200 flex flex-col justify-between group hover:border-neutral-700 ${
                  skill.verified
                    ? 'border-emerald-500/30 hover:border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.06)]'
                    : 'border-neutral-800 hover:border-neutral-700'
                }`}
              >
                
                {/* Card Header: Level & Verified Status */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider border bg-neutral-950 ${levelMeta.color} ${levelMeta.border}`}>
                      {levelMeta.label}
                    </span>

                    {/* Verification Status Pill */}
                    {skill.verified ? (
                      <button
                        type="button"
                        onClick={(e) => handleToggleVerified(skill.skillId, e)}
                        disabled={readOnly || !isOwner}
                        title={isOwner ? 'Click to toggle verification status' : 'Verified by Just1Play Scout'}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.25)] transition-transform active:scale-95"
                      >
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        <span>Verified</span>
                      </button>
                    ) : hasVideo ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-sky-500/15 text-sky-400 border border-sky-500/30">
                        <Video className="w-3 h-3 text-sky-400" />
                        <span>Clip Logged</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-neutral-800/80 text-neutral-500 border border-neutral-700/50">
                        <span>Unlogged</span>
                      </span>
                    )}
                  </div>

                  {/* Skill Name */}
                  <h4 className="text-base font-black text-white tracking-tight group-hover:text-sky-400 transition-colors">
                    {skill.name}
                  </h4>

                  {/* Surface & Category info */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {surfaceMeta && (
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${surfaceMeta.bg} ${surfaceMeta.badgeColor}`}>
                        {surfaceMeta.label.split(' ')[0]} {surfaceMeta.label.split(' ')[1] || ''}
                      </span>
                    )}

                    {skill.timestamp && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-neutral-950 border border-neutral-800 text-neutral-400">
                        <Clock className="w-2.5 h-2.5 inline mr-1 text-sky-400" />
                        {skill.timestamp}
                      </span>
                    )}
                  </div>

                  {/* Notes / Execution description */}
                  {skill.notes && (
                    <p className="text-xs text-neutral-400 mt-2.5 line-clamp-2 leading-relaxed">
                      {skill.notes}
                    </p>
                  )}
                </div>

                {/* Card Action Deck */}
                <div className="pt-4 mt-4 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                  
                  {/* Watch Proof Button */}
                  {hasVideo ? (
                    <button
                      type="button"
                      onClick={() => setActiveVideoSkill(skill)}
                      className="flex-1 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-neutral-950 font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all cursor-pointer transform active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Watch Proof</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => isOwner && handleOpenEdit(skill)}
                      disabled={!isOwner || readOnly}
                      className="flex-1 px-3 py-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isOwner ? 'Add Video Link' : 'No Clip Available'}</span>
                    </button>
                  )}

                  {/* Edit Button (Athlete / Owner view) */}
                  {isOwner && !readOnly && (
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(skill)}
                      className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition-colors cursor-pointer"
                      title="Edit Skill Verification Details"
                    >
                      <Edit3 className="w-4 h-4 text-sky-400" />
                    </button>
                  )}

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Video Modal Player */}
      {activeVideoSkill && (
        <SkillVideoModal
          isOpen={Boolean(activeVideoSkill)}
          onClose={() => setActiveVideoSkill(null)}
          skill={activeVideoSkill}
          athleteName={athleteName}
        />
      )}

      {/* Edit Drawer Modal (Athlete View) */}
      {editingSkill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#0a0a0a] border border-neutral-800 rounded-3xl shadow-2xl p-6 sm:p-7 space-y-5">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Edit Skill Verification</h3>
                  <p className="text-xs text-neutral-400 font-mono">{editingSkill.name}</p>
                </div>
              </div>

              <button
                onClick={() => setEditingSkill(null)}
                className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-4 text-xs font-mono">
              
              {/* External Video URL (Strictly YouTube, Hudl, Vimeo, Instagram) */}
              <div className="space-y-1.5">
                <label className="text-neutral-300 font-bold uppercase tracking-wider block">
                  External Video Clip URL *
                </label>
                <input
                  type="url"
                  value={editForm.videoUrl}
                  onChange={(e) => setEditForm({ ...editForm, videoUrl: e.target.value })}
                  placeholder="https://youtube.com/watch?v=... or hudl.com/v/..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-100 placeholder-neutral-600 outline-none focus:border-sky-500 transition-colors font-mono text-xs"
                />
                <p className="text-[10px] text-neutral-500 leading-normal">
                  External video links only: YouTube, Hudl, Vimeo, Instagram, TikTok.
                </p>
              </div>

              {/* Timestamp & Surface in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* Timestamp */}
                <div className="space-y-1.5">
                  <label className="text-neutral-300 font-bold uppercase tracking-wider block">
                    Timestamp (optional)
                  </label>
                  <input
                    type="text"
                    value={editForm.timestamp}
                    onChange={(e) => setEditForm({ ...editForm, timestamp: e.target.value })}
                    placeholder="e.g. 0:24 or 1:15"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-100 placeholder-neutral-600 outline-none focus:border-sky-500 transition-colors font-mono text-xs"
                  />
                </div>

                {/* Surface Type */}
                <div className="space-y-1.5">
                  <label className="text-neutral-300 font-bold uppercase tracking-wider block">
                    Surface Type
                  </label>
                  <select
                    value={editForm.surface}
                    onChange={(e) => setEditForm({ ...editForm, surface: e.target.value as CheerSurface })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-100 outline-none focus:border-sky-500 transition-colors font-mono text-xs cursor-pointer"
                  >
                    <option value="spring_floor">Spring Floor (All-Star)</option>
                    <option value="dead_floor">Dead Floor (College / STUNT)</option>
                    <option value="grass_turf">Grass / Turf (Gameday)</option>
                  </select>
                </div>

              </div>

              {/* Skill Difficulty Level */}
              <div className="space-y-1.5">
                <label className="text-neutral-300 font-bold uppercase tracking-wider block">
                  Difficulty Level
                </label>
                <select
                  value={editForm.level}
                  onChange={(e) => setEditForm({ ...editForm, level: e.target.value as CheerSkillLevel })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-100 outline-none focus:border-sky-500 transition-colors font-mono text-xs cursor-pointer"
                >
                  <option value="Level 4">Level 4</option>
                  <option value="Level 5">Level 5</option>
                  <option value="Level 6">Level 6 (Premier)</option>
                  <option value="NCAA D1">NCAA D1 Ready</option>
                </select>
              </div>

              {/* Verification Checkbox */}
              <div className="p-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-800 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Verified Skill Execution</span>
                  </div>
                  <p className="text-[10px] text-neutral-400">
                    Mark as mastered and competition-ready.
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={editForm.verified}
                  onChange={(e) => setEditForm({ ...editForm, verified: e.target.checked })}
                  className="w-5 h-5 rounded text-emerald-500 bg-neutral-800 border-neutral-700 focus:ring-emerald-400 cursor-pointer accent-emerald-500"
                />
              </div>

              {/* Execution / Coach Notes */}
              <div className="space-y-1.5">
                <label className="text-neutral-300 font-bold uppercase tracking-wider block">
                  Scout / Clinic Notes
                </label>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Notes on stick landing, twist speed, flyer flexibility line..."
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-100 placeholder-neutral-600 outline-none focus:border-sky-500 transition-colors font-sans text-xs"
                />
              </div>

            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setEditingSkill(null)}
                className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleApplyEdit}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-neutral-950 text-xs font-mono font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save to Matrix</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 1. Recruiting Dossier PDF Modal */}
      <CheerRecruitPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        athleteName={athleteName}
        athleteAvatar={athleteAvatar}
        athleteId={activeUserId}
        gradYear={gradYear}
        position={position}
        gpa={gpa}
        schoolGym={schoolGym}
        skills={skills}
        readinessScore={readinessScore}
        ratingTier={ratingTier}
      />

      {/* 2. College Program & Scholarship Matcher Modal */}
      <CheerProgramMatcherModal
        isOpen={isProgramMatcherOpen}
        onClose={() => setIsProgramMatcherOpen(false)}
        skills={skills}
        athleteName={athleteName}
      />

      {/* 3. Custom Specialty Pass / Stunt Combination Modal */}
      <CheerCustomSkillModal
        isOpen={isCustomSkillModalOpen}
        onClose={() => setIsCustomSkillModalOpen(false)}
        onAddCustomSkill={handleAddCustomSkill}
      />

      {/* 4. College Coach Outreach Letter Modal */}
      <CheerCoachOutreachModal
        isOpen={isCoachOutreachOpen}
        onClose={() => setIsCoachOutreachOpen(false)}
        athleteName={athleteName}
        athleteId={activeUserId}
        gradYear={gradYear}
        position={position}
        gpa={gpa}
        schoolGym={schoolGym}
        skills={skills}
        readinessScore={readinessScore}
      />

    </div>
  );
};
