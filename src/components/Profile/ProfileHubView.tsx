import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AthleteProfileView } from '../AthleteProfile/AthleteProfileView';
import { CoachProfileView } from './CoachProfileView';
import { ScoutProfileView } from './ScoutProfileView';
import { OrganizationProfileView } from './OrganizationProfileView';
import { CreatorProfileView } from './CreatorProfileView';
import { FanProfileView } from './FanProfileView';
import { AdminProfileView } from './AdminProfileView';
import { RoleAnalyticsSummary } from './RoleAnalyticsSummary';
import { RoleAvatar } from '../Common/RoleAvatar';
import { RoleTourOverlay } from '../Onboarding/RoleTourOverlay';
import { EditProfileModal } from './EditProfileModal';
import { ProfileStrengthBanner } from './ProfileStrengthBanner';
import { UserRole, ProfileData } from '../../types';
import { 
  User, 
  ShieldCheck, 
  Eye, 
  Building2, 
  Video, 
  Ticket, 
  Sliders, 
  ChevronDown, 
  Check, 
  Activity,
  Edit3,
  Award,
  Globe,
  Star,
  Users,
  Trophy,
  BarChart2,
  Bookmark,
  Sparkles,
  Search,
  Clapperboard,
  Heart
} from 'lucide-react';

const ROLE_OPTIONS: { id: UserRole; label: string; icon: any; color: string; bg: string }[] = [
  { id: 'athlete', label: 'Athlete Profile', icon: User, color: 'text-[#E5B868]', bg: 'bg-[#E5B868]/10 border-[#E5B868]/30' },
  { id: 'coach', label: 'Coach Profile', icon: ShieldCheck, color: 'text-red-500', bg: 'bg-red-600/10 border-red-600/30' },
  { id: 'scout', label: 'Scout / Recruiter', icon: Eye, color: 'text-slate-300', bg: 'bg-slate-700/10 border-cyan-500/30' },
  { id: 'organization', label: 'Organization', icon: Building2, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/30' },
  { id: 'creator', label: 'Media Creator', icon: Video, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' },
  { id: 'viewer', label: 'Fan / Spectator', icon: Ticket, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  { id: 'admin', label: 'System Admin', icon: Sliders, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' }
];

export const ProfileHubView: React.FC = () => {
  const { user, profile, role, switchRole } = useAuth();
  const isAdmin = role === 'admin' || profile?.role === 'admin' || user?.email === 'kevoiebailey@gmail.com';
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [showTourOverlay, setShowTourOverlay] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);

  // Construct unified ProfileData structure with role-dependent conditionally injected fields
  const profileData: ProfileData | null = useMemo(() => {
    if (!profile) return null;

    const baseData: ProfileData = {
      uid: profile.uid,
      email: profile.email,
      displayName: profile.displayName,
      photoURL: profile.photoURL,
      avatarUrl: profile.avatarUrl || profile.photoURL,
      role: role || profile.role,
      isVerified: profile.isVerified ?? true,
      bio: profile.bio || 'Verified Member of NextGen Sports Platform.',
      sport: profile.sport,
      highSchool: profile.highSchool,
      teamName: profile.teamName,
      state: profile.state,
      social: profile.social
    };

    if (role === 'athlete') {
      baseData.athleticStats = {
        height: profile.height || "6'1\"",
        weight: profile.weight || '185 lbs',
        gradYear: profile.gradYear || '2027',
        position: profile.position || 'Point Guard',
        jerseyNumber: profile.jerseyNumber || '#10',
        gpa: profile.gpa || '3.85',
        athleteId: profile.athleteId || 'ATH-94821',
        dateOfBirth: profile.dateOfBirth || '2008-04-12',
        stats: profile.stats,
        performanceMetrics: profile.performanceMetrics,
        gameLogs: profile.gameLogs || [],
        mediaUrls: profile.mediaUrls || []
      };
    } else if (role === 'scout') {
      baseData.recruitmentDashboard = {
        agency: 'Elite Talent Scouting Network (NCAA Certified)',
        title: 'Senior Regional Scout',
        region: 'Southeast High School & AAU Circuit',
        targetClasses: '2026, 2027, 2028',
        evaluationsCount: 142,
        bookmarkedAthleteIds: profile.bookmarkedAthleteIds || ['1', '2', '3'],
        shortlistCount: 18,
        evaluationNotes: 'Specializing in backcourt playmakers & wing defenders.'
      };
    } else if (role === 'coach') {
      baseData.coachCredentials = {
        title: 'Head Varsity Coach & Program Director',
        yearsExperience: '12+ Years',
        careerRecord: '248 - 62 (.800)',
        championships: '3 State Titles',
        d1PlacedCount: '34 College Commitments',
        license: 'USA Basketball Gold Certified Coach',
        managedTeams: ['East Coast Select AAU 17U', 'St. Jude Prep Varsity']
      };
    } else if (role === 'organization') {
      baseData.organizationOperations = {
        orgType: 'Sanctioned Tournament & Combine Director',
        hq: 'Atlanta, GA',
        foundedYear: '2018',
        sanctionLicense: 'USAB & NFHS Sanctioned Operator',
        eventsHostedCount: 48,
        teamsEnrolledCount: 320,
        athletesImpacted: 4500,
        website: 'https://nextgensports.org'
      };
    } else if (role === 'creator' || role === 'content_creator') {
      baseData.creatorReel = {
        brandName: 'Apex Hoops Media',
        specialty: 'High-School Mixtapes & 4K Game Highlights',
        gear: 'Sony A7SIII, 70-200mm f/2.8 GM, DJI Ronin',
        publishedCount: 184,
        totalViews: '2.4M',
        taggedAthletesCount: 310,
        youtubeUrl: 'https://youtube.com/@apexhoopsmedia'
      };
    } else if (role === 'viewer') {
      baseData.viewerPass = {
        favoriteSports: 'Basketball, Football, Track',
        favoriteTeams: 'Oak Ridge Wildcats, East Coast Select',
        memberSince: '2025',
        passId: 'FAN-PASS-882049',
        followedAthleteIds: ['1', '2']
      };
    }

    return baseData;
  }, [profile, role]);

  if (!profile || !profileData) return null;

  const currentRoleConfig = ROLE_OPTIONS.find(r => r.id === role) || ROLE_OPTIONS[0];
  const CurrentIcon = currentRoleConfig.icon;

  const handleRoleChange = (newRole: UserRole) => {
    switchRole(newRole);
    setShowRoleSelector(false);
  };

  return (
    <div className="space-y-6 pb-32">
      {/* Progressive Onboarding - Non-blocking Profile Strength Banner */}
      <ProfileStrengthBanner onOpenProfileEditor={() => setShowProfileEditor(true)} />

      {/* Role View Context Bar & Quick Switcher */}
      <div className="bg-[#050505] border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <RoleAvatar
            role={role || 'athlete'}
            photoURL={profileData.photoURL || profileData.avatarUrl}
            displayName={profileData.displayName}
            size="lg"
            showRoleBadge={true}
            animateGlow={true}
            allowUpload={true}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">ACTIVE PROFILE VIEW</span>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${currentRoleConfig.bg} ${currentRoleConfig.color}`}>
                {role}
              </span>
            </div>
            <h2 className="text-base font-black uppercase text-white tracking-wider flex items-center gap-2 mt-0.5">
              <span>{profileData.displayName}</span>
              <span className="text-slate-400 text-xs font-normal font-mono">({currentRoleConfig.label})</span>
            </h2>
          </div>
        </div>

        {/* Action Controls: Tour, Editor & Switcher */}
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowProfileEditor(true)}
            className="w-full sm:w-auto px-3.5 py-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-mono font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#E5B868]" />
            <span>Edit Profile & Bio</span>
          </button>

          <button
            onClick={() => setShowTourOverlay(true)}
            className="w-full sm:w-auto px-3.5 py-2 bg-[#E5B868]/10 hover:bg-[#E5B868]/20 border border-[#E5B868]/40 text-[#E5B868] font-mono font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#E5B868]" />
            <span>Role Feature Tour</span>
          </button>

          {/* Role Selector Trigger (Strictly for Platform Administrators) */}
          {isAdmin && (
            <div className="relative w-full sm:w-auto">
              <button
                onClick={() => setShowRoleSelector(!showRoleSelector)}
                className="w-full sm:w-auto px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-slate-200 flex items-center justify-between sm:justify-start gap-2 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-[#E5B868]" />
                  <span>Admin Perspective Switch</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showRoleSelector ? 'rotate-180' : ''}`} />
              </button>

              {/* Role Dropdown */}
              {showRoleSelector && (
                <div className="absolute right-0 mt-2 w-full sm:w-64 bg-[#212A31] border border-white/15 rounded-2xl shadow-2xl p-2 z-50 space-y-1 backdrop-blur-2xl">
                  <div className="px-3 py-1.5 text-[10px] font-mono uppercase text-slate-400 border-b border-white/10 flex items-center justify-between">
                    <span>Select Profile Role Mode:</span>
                  </div>

                  {ROLE_OPTIONS.map((option) => {
                    const IconComp = option.icon;
                    const isSelected = role === option.id;

                    return (
                      <button
                        key={option.id}
                        onClick={() => {
                          handleRoleChange(option.id);
                        }}
                        className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-white/10 text-white border border-white/20' 
                            : 'text-slate-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <IconComp className={`w-4 h-4 ${option.color}`} />
                          <span>{option.label}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#E5B868]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
      </div>
      </div>

      {/* DYNAMIC ROLE INJECTION BADGE BAR */}
      <div className="bg-[#212A31] border border-white/10 rounded-2xl p-4 shadow-lg">
        {/* Athletic Stats Banner (Only injected for Athletes) */}
        {role === 'athlete' && profileData.athleticStats && (
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#E5B868]/10 border border-[#E5B868]/30 text-[#E5B868]">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-[#E5B868] uppercase font-bold tracking-wider">ATHLETIC MEASURABLES & STATS</span>
                  <span className="bg-white/10 text-slate-300 text-[10px] font-mono px-2 py-0.5 rounded">
                    ID: {profileData.athleticStats.athleteId}
                  </span>
                </div>
                <div className="text-sm font-bold text-white flex items-center gap-3 mt-0.5">
                  <span>Class of {profileData.athleticStats.gradYear}</span>
                  <span className="text-slate-600">•</span>
                  <span>{profileData.athleticStats.position} {profileData.athleticStats.jerseyNumber}</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-[#E5B868] font-mono">GPA {profileData.athleticStats.gpa}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 w-full md:w-auto">
              <div className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Height</div>
                <div className="text-xs font-black text-white">{profileData.athleticStats.height}</div>
              </div>
              <div className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Weight</div>
                <div className="text-xs font-black text-white">{profileData.athleticStats.weight}</div>
              </div>
              <div className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Game Logs</div>
                <div className="text-xs font-black text-[#E5B868]">{profileData.athleticStats.gameLogs?.length || 12} Verified</div>
              </div>
            </div>
          </div>
        )}

        {/* Recruitment Dashboard Banner (Only injected for Scouts/Recruiters) */}
        {role === 'scout' && profileData.recruitmentDashboard && (
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-700/10 border border-cyan-500/30 text-slate-300">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-300 uppercase font-bold tracking-wider">RECRUITMENT & SCOUTING MATRIX</span>
                  <span className="bg-[#E5B868]/20 text-cyan-300 text-[10px] font-mono px-2 py-0.5 rounded border border-cyan-500/30">
                    NCAA CERTIFIED
                  </span>
                </div>
                <div className="text-sm font-bold text-white flex items-center gap-3 mt-0.5">
                  <span>{profileData.recruitmentDashboard.agency}</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-300">{profileData.recruitmentDashboard.region}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 w-full md:w-auto">
              <div className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Evaluations</div>
                <div className="text-xs font-black text-slate-300">{profileData.recruitmentDashboard.evaluationsCount}</div>
              </div>
              <div className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Shortlist</div>
                <div className="text-xs font-black text-white">{profileData.recruitmentDashboard.shortlistCount} Prospects</div>
              </div>
              <div className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Classes</div>
                <div className="text-xs font-black text-white">{profileData.recruitmentDashboard.targetClasses}</div>
              </div>
            </div>
          </div>
        )}

        {/* Coach Credentials Banner (Only injected for Coaches) */}
        {role === 'coach' && profileData.coachCredentials && (
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-600/10 border border-red-600/30 text-red-500">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-red-500 uppercase font-bold tracking-wider">COACHING CREDENTIALS & ROSTER OPS</span>
                  <span className="bg-red-600/20 text-red-400 text-[10px] font-mono px-2 py-0.5 rounded border border-red-600/30">
                    {profileData.coachCredentials.license}
                  </span>
                </div>
                <div className="text-sm font-bold text-white flex items-center gap-3 mt-0.5">
                  <span>{profileData.coachCredentials.title}</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-red-500 font-mono">Record: {profileData.coachCredentials.careerRecord}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 w-full md:w-auto">
              <div className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Experience</div>
                <div className="text-xs font-black text-white">{profileData.coachCredentials.yearsExperience}</div>
              </div>
              <div className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Titles</div>
                <div className="text-xs font-black text-amber-400">{profileData.coachCredentials.championships}</div>
              </div>
              <div className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-mono">D1 Commits</div>
                <div className="text-xs font-black text-red-500">{profileData.coachCredentials.d1PlacedCount}</div>
              </div>
            </div>
          </div>
        )}

        {/* Organization Operations Banner (Only injected for Organizations) */}
        {role === 'organization' && profileData.organizationOperations && (
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-indigo-400 uppercase font-bold tracking-wider">ORGANIZATION & EVENT HUB</span>
                  <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-mono px-2 py-0.5 rounded border border-indigo-500/30">
                    {profileData.organizationOperations.sanctionLicense}
                  </span>
                </div>
                <div className="text-sm font-bold text-white flex items-center gap-3 mt-0.5">
                  <span>{profileData.organizationOperations.orgType}</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-300">HQ: {profileData.organizationOperations.hq}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 w-full md:w-auto">
              <div className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Hosted Events</div>
                <div className="text-xs font-black text-indigo-400">{profileData.organizationOperations.eventsHostedCount} Tournaments</div>
              </div>
              <div className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Teams Enrolled</div>
                <div className="text-xs font-black text-white">{profileData.organizationOperations.teamsEnrolledCount}</div>
              </div>
              <div className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Athletes Impacted</div>
                <div className="text-xs font-black text-[#E5B868]">{profileData.organizationOperations.athletesImpacted}+</div>
              </div>
            </div>
          </div>
        )}

        {/* Media Creator Reel Banner (Only injected for Creators) */}
        {(role === 'creator' || role === 'content_creator') && profileData.creatorReel && (
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-purple-400 uppercase font-bold tracking-wider">CREATOR REEL & MEDIA STUDIO</span>
                  <span className="bg-purple-500/20 text-purple-300 text-[10px] font-mono px-2 py-0.5 rounded border border-purple-500/30">
                    VERIFIED MEDIA
                  </span>
                </div>
                <div className="text-sm font-bold text-white flex items-center gap-3 mt-0.5">
                  <span>{profileData.creatorReel.brandName}</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-purple-300">{profileData.creatorReel.specialty}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 w-full md:w-auto">
              <div className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Mixtapes</div>
                <div className="text-xs font-black text-purple-400">{profileData.creatorReel.publishedCount} Published</div>
              </div>
              <div className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Total Views</div>
                <div className="text-xs font-black text-white">{profileData.creatorReel.totalViews}</div>
              </div>
              <div className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Tagged Players</div>
                <div className="text-xs font-black text-[#E5B868]">{profileData.creatorReel.taggedAthletesCount}</div>
              </div>
            </div>
          </div>
        )}

        {/* Spectator Gate Pass Banner (Only injected for Viewers / Fans) */}
        {role === 'viewer' && profileData.viewerPass && (
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Ticket className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-amber-400 uppercase font-bold tracking-wider">SPECTATOR GATE PASS & FAN SUITE</span>
                  <span className="bg-amber-500/20 text-amber-300 text-[10px] font-mono px-2 py-0.5 rounded border border-amber-500/30">
                    PASS ID: {profileData.viewerPass.passId}
                  </span>
                </div>
                <div className="text-sm font-bold text-white flex items-center gap-3 mt-0.5">
                  <span>Favorite Sports: {profileData.viewerPass.favoriteSports}</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-amber-400">Member Since {profileData.viewerPass.memberSince}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full md:w-auto">
              <div className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Favorite Teams</div>
                <div className="text-xs font-black text-white truncate max-w-[120px]">{profileData.viewerPass.favoriteTeams}</div>
              </div>
              <div className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Followed Players</div>
                <div className="text-xs font-black text-[#E5B868]">{profileData.viewerPass.followedAthleteIds?.length || 2} Athletes</div>
              </div>
            </div>
          </div>
        )}

        {/* System Admin Banner (Only injected for Admins) */}
        {role === 'admin' && (
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-red-400 uppercase font-bold tracking-wider">SYSTEM ADMINISTRATION & MONITORING HUB</span>
                <span className="bg-red-500/20 text-red-300 text-[10px] font-mono px-2 py-0.5 rounded border border-red-500/30">
                  FULL ACCESS
                </span>
              </div>
              <div className="text-sm font-bold text-white mt-0.5">
                Full platform privileges enabled across database schemas, roles, and event controls.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Role Analytics Summary */}
      <RoleAnalyticsSummary />

      {/* Render Specific Detailed View Component for Active Role */}
      {role === 'athlete' && <AthleteProfileView />}
      {role === 'coach' && <CoachProfileView />}
      {role === 'scout' && <ScoutProfileView />}
      {role === 'organization' && <OrganizationProfileView />}
      {(role === 'creator' || role === 'content_creator') && <CreatorProfileView />}
      {role === 'viewer' && <FanProfileView />}
      {role === 'admin' && <AdminProfileView />}

      {/* Role Feature Tour Overlay */}
      <RoleTourOverlay
        isOpen={showTourOverlay}
        onClose={() => setShowTourOverlay(false)}
      />

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={showProfileEditor}
        onClose={() => setShowProfileEditor(false)}
      />
    </div>
  );
};

