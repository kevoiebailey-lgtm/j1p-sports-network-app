import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy,
  ShieldCheck,
  Eye,
  Camera,
  Heart,
  Building2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Zap,
  Activity,
  Award,
  BarChart2,
  Bookmark,
  Search,
  Clapperboard,
  Video,
  Ticket,
  Users,
  Sliders,
  Check,
  Globe,
  Upload,
  Bell,
  Star
} from 'lucide-react';
import { useAuth, getRoleDashboardUrl } from '../../context/AuthContext';
import { ensureAuthReady } from '../../lib/firebase';
import { UserRole } from '../../types';
import { BrandLogo } from '../Common/BrandLogo';

interface RoleOnboardingWizardProps {
  initialRole?: UserRole;
  onComplete?: () => void;
}

export const RoleOnboardingWizard: React.FC<RoleOnboardingWizardProps> = ({
  initialRole,
  onComplete
}) => {
  const { role: authRole, profile, updateUserProfile, switchRole } = useAuth();
  const navigate = useNavigate();

  const activeRole: UserRole = initialRole || authRole || 'athlete';

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form State for Athlete
  const [athleteData, setAthleteData] = useState({
    height: profile?.height || "6'2\"",
    weight: profile?.weight || "185 lbs",
    gradYear: profile?.gradYear || '2027',
    position: profile?.position || 'Point Guard',
    highSchool: profile?.highSchool || 'Oak Ridge High School',
    gpa: '3.8',
    highlightUrl: 'https://youtube.com/watch?v=example-mixtape',
    targetDivisions: ['NCAA D1', 'NCAA D2'],
    preferredRegions: ['Southeast', 'Mid-Atlantic']
  });

  // Form State for Coach
  const [coachData, setCoachData] = useState({
    programName: 'East Coast Select AAU 17U',
    title: 'Head Varsity Coach & Program Director',
    license: 'USA Basketball Gold Certified',
    yearsExp: '10+',
    rosterSize: '12 Players',
    upcomingEvent: 'NextGen National Showcase 2026'
  });

  // Form State for Scout / Recruiter
  const [scoutData, setScoutData] = useState({
    agency: 'Elite Talent Scouting Network (NCAA Certified)',
    region: 'Southeast High School & AAU Circuit',
    targetClasses: ['2026', '2027', '2028'],
    evalMetrics: ['Athleticism', 'Shooting & Range', 'Defensive IQ', 'Motor / Toughness'],
    prospectAlerts: true
  });

  // Form State for Organization
  const [orgData, setOrgData] = useState({
    orgName: 'NextGen Athletic Association',
    sanction: 'USAB & NFHS Sanctioned Tournament Host',
    hq: 'Atlanta, GA',
    eventsPerYear: '12 Tournaments',
    venueCount: '8 Hardwood Courts'
  });

  // Form State for Content Creator
  const [creatorData, setCreatorData] = useState({
    brandName: 'Apex Hoops Media',
    specialty: 'High-School Mixtapes & 4K Game Highlights',
    gear: 'Sony A7SIII, 70-200mm f/2.8 GM, DJI Ronin',
    portfolioUrl: 'https://youtube.com/@apexhoopsmedia'
  });

  // Form State for Viewer / Fan
  const [fanData, setFanData] = useState({
    favoriteSports: ['Basketball', 'Football'],
    favoriteTeams: 'Oak Ridge Wildcats, East Coast Select',
    enableStreamAlerts: true
  });

  const TOTAL_STEPS = 4;

  const handleNextStep = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleFinishOnboarding();
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleFinishOnboarding = async () => {
    setSubmitting(true);
    try {
      await switchRole(activeRole);

      // Save onboarding preferences dynamically according to active role
      let updatedFields: any = {
        hasCompletedOnboarding: true,
        role: activeRole,
        preferences: {
          notificationAlerts: true,
          preferredSport: 'Basketball'
        }
      };

      if (activeRole === 'athlete') {
        updatedFields = {
          ...updatedFields,
          height: athleteData.height,
          weight: athleteData.weight,
          gradYear: athleteData.gradYear,
          position: athleteData.position,
          highSchool: athleteData.highSchool
        };
      } else if (activeRole === 'coach') {
        updatedFields = {
          ...updatedFields,
          teamName: coachData.programName
        };
      }

      await updateUserProfile(updatedFields);

      if (onComplete) {
        onComplete();
      }

      try {
        await ensureAuthReady();
      } catch (authErr) {
        console.warn('ensureAuthReady before onboarding redirect warning:', authErr);
      }

      const redirectUrl = getRoleDashboardUrl(activeRole, true);
      navigate(redirectUrl);
    } catch (err) {
      console.error('Failed to save onboarding preferences:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Role Header Meta
  const getRoleMeta = () => {
    switch (activeRole) {
      case 'athlete':
        return {
          title: 'Athlete Welcome & Recruiting Matrix Setup',
          subtitle: 'Build your verified player profile, measurables, and video highlights for college scouts.',
          badge: 'ATHLETE WELCOME',
          color: 'text-[#FF6A00]',
          border: 'border-[#FF6A00]',
          bg: 'bg-[#FF6A00]/10',
          icon: Trophy
        };
      case 'coach':
        return {
          title: 'Coach Setup & Team Roster Check-in Portal',
          subtitle: 'Verify your program credentials, set up team rosters, and manage tournament check-in passes.',
          badge: 'COACH SETUP',
          color: 'text-[#00B8D4]',
          border: 'border-[#00B8D4]',
          bg: 'bg-[#00B8D4]/10',
          icon: ShieldCheck
        };
      case 'scout':
        return {
          title: 'Recruiter Scouting Matrix Setup',
          subtitle: 'Configure your custom prospect evaluation rubrics, target classes, and shortlist alerts.',
          badge: 'RECRUITER TOUR',
          color: 'text-purple-400',
          border: 'border-purple-500',
          bg: 'bg-purple-500/10',
          icon: Eye
        };
      case 'organization':
        return {
          title: 'Organization Operations & Tournament Director Setup',
          subtitle: 'Set up your organization profile, sanctioning credentials, and venue court schedules.',
          badge: 'ORGANIZATION SETUP',
          color: 'text-[#FFC857]',
          border: 'border-[#FFC857]',
          bg: 'bg-[#FFC857]/10',
          icon: Building2
        };
      case 'creator':
      case 'content_creator':
        return {
          title: 'Content Creator Media Studio Setup',
          subtitle: 'Set up your media brand, camera gear specs, portfolio reel, and player tagging rules.',
          badge: 'CREATOR TOUR',
          color: 'text-rose-400',
          border: 'border-rose-500',
          bg: 'bg-rose-500/10',
          icon: Camera
        };
      case 'viewer':
      default:
        return {
          title: 'Spectator Gate Pass & Fan Feed Setup',
          subtitle: 'Select your favorite high school teams, top prospects to follow, and live stream notifications.',
          badge: 'FAN PASS TOUR',
          color: 'text-emerald-400',
          border: 'border-emerald-500',
          bg: 'bg-emerald-500/10',
          icon: Heart
        };
    }
  };

  const meta = getRoleMeta();
  const HeaderIcon = meta.icon;

  return (
    <div className="min-h-screen bg-transparent text-[#263238] dark:text-white flex flex-col justify-center px-4 py-8 sm:py-12 relative overflow-hidden font-sans">
      {/* Background Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#FF6A00]/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-4xl mx-auto w-full space-y-6 relative z-10">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 frosted-glass border border-white/15 dark:border-white/10 p-6 rounded-3xl backdrop-blur-xl shadow-xl">
          <div className="flex items-center gap-4">
            <div className={`p-3.5 rounded-2xl ${meta.bg} ${meta.border} border ${meta.color} shadow-md`}>
              <HeaderIcon className="w-7 h-7 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono font-bold tracking-wider px-2.5 py-0.5 rounded-full clear-glass border ${meta.border} ${meta.color} uppercase`}>
                  {meta.badge}
                </span>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Step {currentStep} of {TOTAL_STEPS}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black italic uppercase tracking-tight text-[#263238] dark:text-white font-sans mt-0.5">
                {meta.title}
              </h1>
            </div>
          </div>

          <button
            onClick={() => navigate('/onboarding/select-role')}
            className="text-xs font-mono text-slate-500 dark:text-slate-300 hover:text-[#263238] dark:hover:text-white px-3 py-1.5 rounded-xl clear-glass border border-white/15 hover:border-[#00B8D4] transition-all cursor-pointer"
          >
            Change Role
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="frosted-glass border border-white/15 dark:border-white/10 p-4 rounded-2xl backdrop-blur-xl flex items-center gap-3 shadow-md">
          {[1, 2, 3, 4].map((stepNum) => {
            const isCompleted = stepNum < currentStep;
            const isCurrent = stepNum === currentStep;

            return (
              <div key={stepNum} className="flex-1 flex items-center gap-2">
                <div className={`h-2.5 rounded-full transition-all duration-300 w-full ${
                  isCompleted ? 'bg-[#FF6A00]' : isCurrent ? 'bg-[#FF6A00]/60 animate-pulse' : 'bg-white/10 dark:bg-white/5'
                }`} />
                {stepNum < TOTAL_STEPS && (
                  <div className="hidden sm:block text-[10px] font-mono text-slate-400">›</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Main Step Content Container */}
        <div className="frosted-glass border border-white/15 dark:border-white/10 p-6 sm:p-8 rounded-3xl backdrop-blur-xl shadow-2xl relative overflow-hidden min-h-[420px] flex flex-col justify-between">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* ATHLETE ONBOARDING STEPS */}
              {activeRole === 'athlete' && (
                <>
                  {currentStep === 1 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-[#FF6A00] font-mono text-xs font-bold uppercase tracking-wider">
                        <Activity className="w-4 h-4" />
                        <span>Step 1: Athletic Measurables & Identity</span>
                      </div>
                      <h2 className="text-xl font-bold text-[#263238] dark:text-white">Verify Your Physical Profile & High School Stats</h2>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-mono">College scouts filter prospects by height, weight, graduation year, and GPA.</p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div>
                          <label className="text-xs font-mono text-slate-500 dark:text-slate-400 block mb-1">Height (ft/in)</label>
                          <input
                            type="text"
                            value={athleteData.height}
                            onChange={e => setAthleteData({ ...athleteData, height: e.target.value })}
                            className="w-full clear-glass border border-white/15 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#263238] dark:text-white font-mono focus:border-[#FF6A00] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-mono text-slate-500 dark:text-slate-400 block mb-1">Weight (lbs)</label>
                          <input
                            type="text"
                            value={athleteData.weight}
                            onChange={e => setAthleteData({ ...athleteData, weight: e.target.value })}
                            className="w-full clear-glass border border-white/15 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#263238] dark:text-white font-mono focus:border-[#FF6A00] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-mono text-slate-500 dark:text-slate-400 block mb-1">Graduation Class Year</label>
                          <select
                            value={athleteData.gradYear}
                            onChange={e => setAthleteData({ ...athleteData, gradYear: e.target.value })}
                            className="w-full bg-white dark:bg-[#1E282D] border border-white/15 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#263238] dark:text-white font-mono focus:border-[#FF6A00] focus:outline-none"
                          >
                            <option value="2025">2025 (Senior)</option>
                            <option value="2026">2026 (Junior)</option>
                            <option value="2027">2027 (Sophomore)</option>
                            <option value="2028">2028 (Freshman)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-mono text-slate-500 dark:text-slate-400 block mb-1">Primary Position</label>
                          <input
                            type="text"
                            value={athleteData.position}
                            onChange={e => setAthleteData({ ...athleteData, position: e.target.value })}
                            className="w-full clear-glass border border-white/15 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#263238] dark:text-white font-mono focus:border-[#FF6A00] focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-[#FF6A00] font-mono text-xs font-bold uppercase tracking-wider">
                        <Video className="w-4 h-4" />
                        <span>Step 2: Video Highlight Reel & HUDL Mixtape</span>
                      </div>
                      <h2 className="text-xl font-bold text-[#263238] dark:text-white">Add Your Top Game Film & Highlights</h2>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-mono">Link your YouTube, Hudl, or Instagram mixtape so college recruiters can evaluate your film immediately.</p>

                      <div className="space-y-3 pt-2">
                        <div>
                          <label className="text-xs font-mono text-slate-500 dark:text-slate-400 block mb-1">Highlight Reel URL (YouTube / Hudl / Vimeo)</label>
                          <input
                            type="url"
                            value={athleteData.highlightUrl}
                            onChange={e => setAthleteData({ ...athleteData, highlightUrl: e.target.value })}
                            placeholder="https://youtube.com/watch?v=..."
                            className="w-full clear-glass border border-white/15 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-[#263238] dark:text-white font-mono focus:border-[#FF6A00] focus:outline-none"
                          />
                        </div>

                        <div className="p-4 rounded-2xl clear-glass border border-white/10 flex items-center gap-3">
                          <div className="p-3 rounded-xl bg-[#FF6A00]/10 text-[#FF6A00]">
                            <Upload className="w-5 h-5" />
                          </div>
                          <div className="text-xs font-mono text-slate-600 dark:text-slate-300">
                            <span className="text-[#263238] dark:text-white font-bold block">Verified Video Tagging</span>
                            Our media creators and tournament operators auto-tag verified game film directly to your athlete profile.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep === 3 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-[#FF6A00] font-mono text-xs font-bold uppercase tracking-wider">
                        <Star className="w-4 h-4 text-[#FFC857]" />
                        <span>Step 3: Academic GPA & Target College Preferences</span>
                      </div>
                      <h2 className="text-xl font-bold text-[#263238] dark:text-white">College Recruiting Targets</h2>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div>
                          <label className="text-xs font-mono text-slate-500 dark:text-slate-400 block mb-1">Academic Cumulative GPA</label>
                          <input
                            type="text"
                            value={athleteData.gpa}
                            onChange={e => setAthleteData({ ...athleteData, gpa: e.target.value })}
                            className="w-full clear-glass border border-white/15 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#263238] dark:text-white font-mono focus:border-[#FF6A00] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-mono text-slate-500 dark:text-slate-400 block mb-1">High School Program Name</label>
                          <input
                            type="text"
                            value={athleteData.highSchool}
                            onChange={e => setAthleteData({ ...athleteData, highSchool: e.target.value })}
                            className="w-full clear-glass border border-white/15 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#263238] dark:text-white font-mono focus:border-[#FF6A00] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="pt-2">
                        <label className="text-xs font-mono text-slate-500 dark:text-slate-400 block mb-2">Target College Divisions</label>
                        <div className="flex flex-wrap gap-2">
                          {['NCAA D1', 'NCAA D2', 'NCAA D3', 'NAIA', 'JUCO'].map(div => {
                            const isIncluded = athleteData.targetDivisions.includes(div);
                            return (
                              <button
                                key={div}
                                type="button"
                                onClick={() => {
                                  if (isIncluded) {
                                    setAthleteData({ ...athleteData, targetDivisions: athleteData.targetDivisions.filter(d => d !== div) });
                                  } else {
                                    setAthleteData({ ...athleteData, targetDivisions: [...athleteData.targetDivisions, div] });
                                  }
                                }}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border cursor-pointer ${
                                  isIncluded
                                    ? 'bg-[#FF6A00]/20 border-[#FF6A00] text-[#FF6A00]'
                                    : 'clear-glass border-white/15 text-slate-500 dark:text-slate-400 hover:text-[#263238] dark:hover:text-white'
                                }`}
                              >
                                {isIncluded ? '✓ ' : '+ '}{div}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep === 4 && (
                    <div className="space-y-4 text-center py-4">
                      <div className="w-16 h-16 rounded-3xl bg-[#FF6A00]/20 border border-[#FF6A00]/50 text-[#FF6A00] flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(255,106,0,0.4)]">
                        <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
                      </div>
                      <h2 className="text-2xl font-black italic uppercase text-[#263238] dark:text-white font-sans">
                        Athlete Profile <span className="text-[#FF6A00]">Verified & Ready</span>
                      </h2>
                      <p className="text-sm font-mono text-slate-600 dark:text-slate-300 max-w-lg mx-auto">
                        Your athlete profile is live in the Scouting Matrix. College coaches can now track your game logs, video clips, and athletic measurables.
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* COACH ONBOARDING STEPS */}
              {activeRole === 'coach' && (
                <>
                  {currentStep === 1 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-[#00B8D4] font-mono text-xs font-bold uppercase tracking-wider">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Step 1: Program & Coaching Credentials</span>
                      </div>
                      <h2 className="text-xl font-bold text-[#263238] dark:text-white">Program Leadership & Sanction Certification</h2>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div>
                          <label className="text-xs font-mono text-slate-500 dark:text-slate-400 block mb-1">Program / Team Name</label>
                          <input
                            type="text"
                            value={coachData.programName}
                            onChange={e => setCoachData({ ...coachData, programName: e.target.value })}
                            className="w-full clear-glass border border-white/15 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#263238] dark:text-white font-mono focus:border-[#00B8D4] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-mono text-slate-500 dark:text-slate-400 block mb-1">Coaching Title</label>
                          <input
                            type="text"
                            value={coachData.title}
                            onChange={e => setCoachData({ ...coachData, title: e.target.value })}
                            className="w-full clear-glass border border-white/15 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#263238] dark:text-white font-mono focus:border-[#00B8D4] focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-[#00B8D4] font-mono text-xs font-bold uppercase tracking-wider">
                        <Users className="w-4 h-4" />
                        <span>Step 2: Team Roster & Gate Check-in Passes</span>
                      </div>
                      <h2 className="text-xl font-bold text-[#263238] dark:text-white">Player Roster Management</h2>
                    </div>
                  )}

                  {currentStep === 3 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-[#00B8D4] font-mono text-xs font-bold uppercase tracking-wider">
                        <BarChart2 className="w-4 h-4" />
                        <span>Step 3: Stat Approvals & Scout Verification</span>
                      </div>
                      <h2 className="text-xl font-bold text-[#263238] dark:text-white">Official Stat Submission</h2>
                    </div>
                  )}

                  {currentStep === 4 && (
                    <div className="space-y-4 text-center py-4">
                      <div className="w-16 h-16 rounded-3xl bg-[#00B8D4]/20 border border-[#00B8D4]/50 text-[#00B8D4] flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(0,184,212,0.4)]">
                        <ShieldCheck className="w-9 h-9 stroke-[2.5]" />
                      </div>
                      <h2 className="text-2xl font-black italic uppercase text-[#263238] dark:text-white font-sans">
                        Coach Portal <span className="text-[#00B8D4]">Configured</span>
                      </h2>
                    </div>
                  )}
                </>
              )}

              {/* SCOUT ONBOARDING STEPS */}
              {activeRole === 'scout' && (
                <>
                  {currentStep === 1 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-purple-400 font-mono text-xs font-bold uppercase tracking-wider">
                        <Eye className="w-4 h-4" />
                        <span>Step 1: Recruiter Agency & Evaluation Region</span>
                      </div>
                      <h2 className="text-xl font-bold text-[#263238] dark:text-white">Scouting Agency Configuration</h2>
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-purple-400 font-mono text-xs font-bold uppercase tracking-wider">
                        <Sliders className="w-4 h-4" />
                        <span>Step 2: Custom Prospect Evaluation Rubric</span>
                      </div>
                      <h2 className="text-xl font-bold text-[#263238] dark:text-white">Custom Evaluation Rubric</h2>
                    </div>
                  )}

                  {currentStep === 3 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-purple-400 font-mono text-xs font-bold uppercase tracking-wider">
                        <Bookmark className="w-4 h-4" />
                        <span>Step 3: Prospect Shortlists & Live Game Alerts</span>
                      </div>
                      <h2 className="text-xl font-bold text-[#263238] dark:text-white">Recruiter Watchlist System</h2>
                    </div>
                  )}

                  {currentStep === 4 && (
                    <div className="space-y-4 text-center py-4">
                      <div className="w-16 h-16 rounded-3xl bg-purple-500/20 border border-purple-500/50 text-purple-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(168,85,247,0.4)]">
                        <Eye className="w-9 h-9 stroke-[2.5]" />
                      </div>
                      <h2 className="text-2xl font-black italic uppercase text-[#263238] dark:text-white font-sans">
                        Recruiter Matrix <span className="text-purple-400">Ready</span>
                      </h2>
                    </div>
                  )}
                </>
              )}

              {/* ORGANIZATION ONBOARDING STEPS */}
              {activeRole === 'organization' && (
                <>
                  {currentStep === 1 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-[#FFC857] font-mono text-xs font-bold uppercase tracking-wider">
                        <Building2 className="w-4 h-4" />
                        <span>Step 1: Organization Sanctioning Credentials</span>
                      </div>
                      <h2 className="text-xl font-bold text-[#263238] dark:text-white">Tournament Director Profile</h2>
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-[#FFC857] font-mono text-xs font-bold uppercase tracking-wider">
                        <Globe className="w-4 h-4" />
                        <span>Step 2: Tournament Schedule & Court Configuration</span>
                      </div>
                      <h2 className="text-xl font-bold text-[#263238] dark:text-white">Venue Court Layouts</h2>
                    </div>
                  )}

                  {currentStep === 3 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-[#FFC857] font-mono text-xs font-bold uppercase tracking-wider">
                        <Ticket className="w-4 h-4" />
                        <span>Step 3: Registration Gate Staff Scanning</span>
                      </div>
                      <h2 className="text-xl font-bold text-[#263238] dark:text-white">QR Code Gate Verification</h2>
                    </div>
                  )}

                  {currentStep === 4 && (
                    <div className="space-y-4 text-center py-4">
                      <div className="w-16 h-16 rounded-3xl bg-[#FFC857]/20 border border-[#FFC857]/50 text-[#FFC857] flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(255,200,87,0.4)]">
                        <Building2 className="w-9 h-9 stroke-[2.5]" />
                      </div>
                      <h2 className="text-2xl font-black italic uppercase text-[#263238] dark:text-white font-sans">
                        Tournament Hub <span className="text-[#FFC857]">Configured</span>
                      </h2>
                    </div>
                  )}
                </>
              )}

              {/* CONTENT CREATOR ONBOARDING STEPS */}
              {(activeRole === 'creator' || activeRole === 'content_creator') && (
                <>
                  {currentStep === 1 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-rose-400 font-mono text-xs font-bold uppercase tracking-wider">
                        <Camera className="w-4 h-4" />
                        <span>Step 1: Media Brand & Gear Specs</span>
                      </div>
                      <h2 className="text-xl font-bold text-[#263238] dark:text-white">Media Production Profile</h2>
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-rose-400 font-mono text-xs font-bold uppercase tracking-wider">
                        <Video className="w-4 h-4" />
                        <span>Step 2: 4K Game Film Uploads</span>
                      </div>
                      <h2 className="text-xl font-bold text-[#263238] dark:text-white">4K Native Video Encoding</h2>
                    </div>
                  )}

                  {currentStep === 3 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-rose-400 font-mono text-xs font-bold uppercase tracking-wider">
                        <Clapperboard className="w-4 h-4" />
                        <span>Step 3: Tagged Athlete Portfolio & Booking</span>
                      </div>
                      <h2 className="text-xl font-bold text-[#263238] dark:text-white">Player Video Tagging Workflow</h2>
                    </div>
                  )}

                  {currentStep === 4 && (
                    <div className="space-y-4 text-center py-4">
                      <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border border-rose-500/50 text-rose-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(244,63,94,0.4)]">
                        <Camera className="w-9 h-9 stroke-[2.5]" />
                      </div>
                      <h2 className="text-2xl font-black italic uppercase text-[#263238] dark:text-white font-sans">
                        Creator Studio <span className="text-rose-400">Active</span>
                      </h2>
                    </div>
                  )}
                </>
              )}

              {/* VIEWER / FAN ONBOARDING STEPS */}
              {activeRole === 'viewer' && (
                <>
                  {currentStep === 1 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold uppercase tracking-wider">
                        <Heart className="w-4 h-4" />
                        <span>Step 1: Favorite Sports & High School Programs</span>
                      </div>
                      <h2 className="text-xl font-bold text-[#263238] dark:text-white">Personalize Your Fan Experience</h2>
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold uppercase tracking-wider">
                        <Bell className="w-4 h-4" />
                        <span>Step 2: Followed Athletes & Stream Alerts</span>
                      </div>
                      <h2 className="text-xl font-bold text-[#263238] dark:text-white">Instant Game Stream Notifications</h2>
                    </div>
                  )}

                  {currentStep === 3 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold uppercase tracking-wider">
                        <Ticket className="w-4 h-4" />
                        <span>Step 3: Spectator Gate Pass Activation</span>
                      </div>
                      <h2 className="text-xl font-bold text-[#263238] dark:text-white">Digital Spectator Gate Pass</h2>
                    </div>
                  )}

                  {currentStep === 4 && (
                    <div className="space-y-4 text-center py-4">
                      <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                        <Ticket className="w-9 h-9 stroke-[2.5]" />
                      </div>
                      <h2 className="text-2xl font-black italic uppercase text-[#263238] dark:text-white font-sans">
                        Fan Suite <span className="text-emerald-400">Activated</span>
                      </h2>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Control Buttons */}
          <div className="pt-6 border-t border-white/10 flex items-center justify-between gap-4 mt-6">
            <button
              onClick={handlePrevStep}
              disabled={currentStep === 1 || submitting}
              className="px-5 py-3 rounded-2xl clear-glass hover:bg-white/10 border border-white/15 text-xs font-mono font-bold text-slate-600 dark:text-slate-300 hover:text-[#263238] dark:hover:text-white transition-all flex items-center gap-2 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              onClick={handleNextStep}
              disabled={submitting}
              className={`px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg ${
                currentStep === TOTAL_STEPS
                  ? `${meta.bg} ${meta.border} ${meta.color} border hover:brightness-125`
                  : 'bg-gradient-to-r from-[#FF6A00] to-[#FF8C00] hover:from-[#E05D00] hover:to-[#FF6A00] text-white shadow-[0_0_20px_rgba(255,106,0,0.45)] border border-[#FFC857]/40'
              }`}
            >
              <span>
                {submitting
                  ? 'Saving Preferences...'
                  : currentStep === TOTAL_STEPS
                  ? `Launch ${activeRole.toUpperCase()} Dashboard`
                  : 'Continue to Next Step'}
              </span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
