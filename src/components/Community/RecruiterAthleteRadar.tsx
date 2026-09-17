import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  Zap, 
  Users, 
  UserCheck, 
  UserPlus, 
  Search, 
  ArrowRightLeft, 
  ExternalLink, 
  MessageSquare, 
  ShieldCheck,
  X,
  GraduationCap,
  Sparkles,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, UserRole } from '../../types';
import { useSocialConnections } from '../../hooks/useSocialConnections';
import { useAuth } from '../../context/AuthContext';
import { isRecruiterRole, isAthleteRole } from '../../services/socialConnectionService';

interface RecruiterAthleteRadarProps {
  allUsers: UserProfile[];
  onOpenProfile: (member: UserProfile) => void;
  onOpenDM: (targetUid: string, targetName: string) => void;
  onFilterAthleteInDirectory?: (athleteUid: string) => void;
  onFilterRecruiterInDirectory?: (recruiterUid: string) => void;
}

export const RecruiterAthleteRadar: React.FC<RecruiterAthleteRadarProps> = ({
  allUsers,
  onOpenProfile,
  onOpenDM,
  onFilterAthleteInDirectory,
  onFilterRecruiterInDirectory
}) => {
  const { user, profile } = useAuth();
  const currentUid = user?.uid || profile?.uid || '';
  const isViewerRecruiter = isRecruiterRole(profile?.role);
  const isViewerAthlete = isAthleteRole(profile?.role);

  const {
    allConnections,
    currentUserFollowingIds,
    toggleFollow
  } = useSocialConnections();

  // Cross-filter states
  const [selectedRecruiterId, setSelectedRecruiterId] = useState<string | null>(null);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  // 1. Separate all recruiters and all athletes from the user list
  const recruiters = useMemo(() => {
    return allUsers.filter(u => isRecruiterRole(u.role));
  }, [allUsers]);

  const athletes = useMemo(() => {
    return allUsers.filter(u => isAthleteRole(u.role));
  }, [allUsers]);

  // 2. Build mapping of Recruiter ID -> Set of followed Athlete IDs
  const recruiterFollowsMap = useMemo(() => {
    const map = new Map<string, { athleteIds: Set<string>; athleteProfiles: UserProfile[] }>();
    
    // Check connections
    allConnections.forEach(conn => {
      if (conn.isRecruiterFollowingAthlete || (isRecruiterRole(conn.followerRole) && isAthleteRole(conn.targetRole))) {
        if (!map.has(conn.followerId)) {
          map.set(conn.followerId, { athleteIds: new Set(), athleteProfiles: [] });
        }
        const entry = map.get(conn.followerId)!;
        entry.athleteIds.add(conn.targetId);

        const foundAth = athletes.find(a => a.uid === conn.targetId);
        if (foundAth && !entry.athleteProfiles.some(p => p.uid === foundAth.uid)) {
          entry.athleteProfiles.push(foundAth);
        }
      }
    });

    return map;
  }, [allConnections, athletes]);

  // 3. Build mapping of Athlete ID -> Set of tracking Recruiter IDs
  const athleteFollowersMap = useMemo(() => {
    const map = new Map<string, { recruiterIds: Set<string>; recruiterProfiles: UserProfile[] }>();

    allConnections.forEach(conn => {
      if (conn.isRecruiterFollowingAthlete || (isRecruiterRole(conn.followerRole) && isAthleteRole(conn.targetRole))) {
        if (!map.has(conn.targetId)) {
          map.set(conn.targetId, { recruiterIds: new Set(), recruiterProfiles: [] });
        }
        const entry = map.get(conn.targetId)!;
        entry.recruiterIds.add(conn.followerId);

        const foundRec = recruiters.find(r => r.uid === conn.followerId);
        if (foundRec && !entry.recruiterProfiles.some(p => p.uid === foundRec.uid)) {
          entry.recruiterProfiles.push(foundRec);
        }
      }
    });

    return map;
  }, [allConnections, recruiters]);

  // 4. Filter recruiters based on active athlete selection & search
  const visibleRecruiters = useMemo(() => {
    return recruiters.filter(r => {
      // Search
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const matchesName = r.displayName.toLowerCase().includes(q);
        const matchesOrg = (r.highSchool || (r as any).school || r.teamName || '').toLowerCase().includes(q);
        if (!matchesName && !matchesOrg) return false;
      }

      // If an athlete is selected, show only recruiters following that athlete
      if (selectedAthleteId) {
        const entry = recruiterFollowsMap.get(r.uid);
        if (!entry || !entry.athleteIds.has(selectedAthleteId)) return false;
      }

      return true;
    });
  }, [recruiters, searchFilter, selectedAthleteId, recruiterFollowsMap]);

  // 5. Filter athletes based on active recruiter selection & search
  const visibleAthletes = useMemo(() => {
    return athletes.filter(a => {
      // Search
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const matchesName = a.displayName.toLowerCase().includes(q);
        const matchesSchool = (a.highSchool || (a as any).school || a.teamName || '').toLowerCase().includes(q);
        const matchesPosition = (a.position || '').toLowerCase().includes(q);
        if (!matchesName && !matchesSchool && !matchesPosition) return false;
      }

      // If a recruiter is selected, show only athletes followed by that recruiter
      if (selectedRecruiterId) {
        const entry = athleteFollowersMap.get(a.uid);
        if (!entry || !entry.recruiterIds.has(selectedRecruiterId)) return false;
      }

      return true;
    });
  }, [athletes, searchFilter, selectedRecruiterId, athleteFollowersMap]);

  const selectedRecruiterObj = recruiters.find(r => r.uid === selectedRecruiterId);
  const selectedAthleteObj = athletes.find(a => a.uid === selectedAthleteId);

  const totalFollowRelationships = allConnections.filter(c => c.isRecruiterFollowingAthlete).length;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. HERO HEADER BANNER */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0F1420] via-[#131C2E] to-[#0A0E17] border border-white/10 rounded-3xl p-5 sm:p-7 shadow-2xl">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-[#00F0D0]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-[#FFC857] text-[11px] font-mono font-bold uppercase tracking-wider">
              <ArrowRightLeft className="w-3.5 h-3.5 animate-pulse" />
              <span>Two-Way Scouting Network</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Recruiter ⇄ Athlete Social Radar</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Explore college recruiters and verified scouts, view which athletes they track, and filter talent by active scout follow relationships.
            </p>
          </div>

          {/* Radar Telemetry Counters */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 shrink-0">
            <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-2.5 sm:p-3 text-center">
              <span className="block text-[10px] font-mono uppercase text-[#FFC857] font-bold">Scouts</span>
              <span className="text-base sm:text-lg font-black text-white font-mono">{recruiters.length}</span>
            </div>
            <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-2.5 sm:p-3 text-center">
              <span className="block text-[10px] font-mono uppercase text-[#00F0D0] font-bold">Athletes</span>
              <span className="text-base sm:text-lg font-black text-white font-mono">{athletes.length}</span>
            </div>
            <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-2.5 sm:p-3 text-center">
              <span className="block text-[10px] font-mono uppercase text-emerald-400 font-bold">Connections</span>
              <span className="text-base sm:text-lg font-black text-white font-mono">{totalFollowRelationships}</span>
            </div>
          </div>
        </div>

        {/* Active Cross-Filter Alert Bar */}
        {(selectedRecruiterId || selectedAthleteId) && (
          <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-mono">
              <Filter className="w-3.5 h-3.5 text-[#00F0D0]" />
              <span className="text-slate-300">Active Cross-Filter:</span>
              {selectedRecruiterId && (
                <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-[#FFC857] border border-amber-500/40 font-bold flex items-center gap-1.5">
                  <Trophy className="w-3 h-3" />
                  Showing athletes followed by: {selectedRecruiterObj?.displayName || 'Selected Recruiter'}
                </span>
              )}
              {selectedAthleteId && (
                <span className="px-2.5 py-0.5 rounded-lg bg-teal-500/20 text-[#00F0D0] border border-teal-500/40 font-bold flex items-center gap-1.5">
                  <Zap className="w-3 h-3" />
                  Showing recruiters tracking: {selectedAthleteObj?.displayName || 'Selected Athlete'}
                </span>
              )}
            </div>

            <button
              onClick={() => {
                setSelectedRecruiterId(null);
                setSelectedAthleteId(null);
              }}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white text-xs font-mono flex items-center gap-1 transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>Clear Filter</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. SEARCH BAR */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search recruiters or athletes by name, school, sport, or position..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#131C2E] border border-white/10 focus:border-[#00F0D0]/50 rounded-2xl text-xs font-mono text-white placeholder-slate-500 outline-none"
          />
          {searchFilter && (
            <button
              onClick={() => setSearchFilter('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* 3. TWO-COLUMN SPLIT RADAR MATRIX */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* COLUMN 1: COLLEGE RECRUITERS & SCOUTS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-[#FFC857] border border-amber-500/40 flex items-center justify-center">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white font-mono uppercase tracking-wider">
                  College Scouts & Recruiters
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  {visibleRecruiters.length} active scouting radars
                </span>
              </div>
            </div>

            {selectedAthleteId && (
              <span className="text-[11px] font-mono text-[#00F0D0] bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/30">
                Filtered by Athlete
              </span>
            )}
          </div>

          <div className="space-y-3">
            {visibleRecruiters.length === 0 ? (
              <div className="p-8 text-center bg-[#131C2E]/40 border border-white/10 rounded-2xl text-slate-400 text-xs font-mono space-y-2">
                <Trophy className="w-8 h-8 mx-auto text-slate-600" />
                <p>No recruiters match the current filter.</p>
                {selectedAthleteId && (
                  <button
                    onClick={() => setSelectedAthleteId(null)}
                    className="text-[#00F0D0] hover:underline"
                  >
                    Clear athlete filter
                  </button>
                )}
              </div>
            ) : (
              visibleRecruiters.map((recruiter) => {
                const isSelected = selectedRecruiterId === recruiter.uid;
                const isFollowedByMe = currentUserFollowingIds.includes(recruiter.uid);
                const followData = recruiterFollowsMap.get(recruiter.uid);
                const followedAthletes = followData ? followData.athleteProfiles : [];
                const athleteCount = followData ? followData.athleteIds.size : 0;
                const avatar = recruiter.avatarUrl || recruiter.photoURL || '';

                return (
                  <motion.div
                    key={recruiter.uid}
                    layout
                    className={`p-4 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-amber-950/20 border-amber-500/60 shadow-[0_0_20px_rgba(255,184,0,0.2)]'
                        : 'bg-[#131C2E] border-white/10 hover:border-amber-500/40'
                    }`}
                  >
                    {/* Header: Recruiter info + Action */}
                    <div className="flex items-start justify-between gap-3">
                      <div 
                        onClick={() => onOpenProfile(recruiter)}
                        className="flex items-center gap-3 cursor-pointer min-w-0 flex-1"
                      >
                        <div className="relative flex-shrink-0">
                          {avatar ? (
                            <img
                              src={avatar}
                              alt={recruiter.displayName}
                              className="w-11 h-11 rounded-xl object-cover border border-white/10 bg-slate-800"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-slate-800 border border-white/10 text-[#FFC857] font-mono font-bold flex items-center justify-center text-sm">
                              {(recruiter.displayName || 'Scout').slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#FFB800] text-slate-950 flex items-center justify-center shadow">
                            <Trophy className="w-2.5 h-2.5" />
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-bold text-white truncate hover:text-[#FFC857] transition-colors">
                              {recruiter.displayName}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-[#FFC857] border border-amber-500/40 uppercase">
                              SCOUT
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 font-mono truncate mt-0.5">
                            {recruiter.highSchool || (recruiter as any).school || recruiter.teamName || 'College Scouting Dept'}
                            {recruiter.sport && ` • ${recruiter.sport}`}
                          </p>
                        </div>
                      </div>

                      {/* Follow & Message Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => onOpenDM(recruiter.uid, recruiter.displayName)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Direct Message"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>

                        {currentUid !== recruiter.uid && (
                          <button
                            onClick={() => toggleFollow(recruiter)}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                              isFollowedByMe
                                ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-rose-700/60 hover:text-rose-400'
                                : 'bg-gradient-to-r from-[#FFB800] to-amber-500 text-slate-950 font-black hover:brightness-110 shadow-[0_0_10px_rgba(255,184,0,0.3)]'
                            }`}
                          >
                            {isFollowedByMe ? (
                              <>
                                <UserCheck className="w-3 h-3 text-[#FFB800]" />
                                <span>Connected</span>
                              </>
                            ) : (
                              <>
                                <UserPlus className="w-3 h-3" />
                                <span>+ Connect</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Followed Athletes Section */}
                    <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Zap className="w-3 h-3 text-[#00F0D0]" />
                          Tracking <strong className="text-white">{athleteCount}</strong> Prospects:
                        </span>

                        <button
                          onClick={() => {
                            if (isSelected) {
                              setSelectedRecruiterId(null);
                            } else {
                              setSelectedRecruiterId(recruiter.uid);
                              setSelectedAthleteId(null);
                            }
                          }}
                          className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-white/5 text-amber-300 hover:bg-white/10'
                          }`}
                        >
                          {isSelected ? '✕ Clear Filter' : 'Filter Athletes →'}
                        </button>
                      </div>

                      {/* Athlete Chips */}
                      {followedAthletes.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {followedAthletes.map(ath => (
                            <button
                              key={ath.uid}
                              onClick={() => {
                                setSelectedAthleteId(ath.uid);
                                setSelectedRecruiterId(null);
                              }}
                              className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-teal-500/20 border border-white/10 hover:border-teal-500/40 text-[11px] font-mono text-slate-300 hover:text-[#00F0D0] transition-colors cursor-pointer flex items-center gap-1"
                              title={`Click to filter scouts tracking ${ath.displayName}`}
                            >
                              <span className="font-bold">{ath.displayName}</span>
                              {ath.position && <span className="text-slate-500">({ath.position})</span>}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500 font-mono italic">
                          No public athlete follows recorded yet.
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMN 2: TRACKED PROSPECTS & ATHLETES */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-[#00F0D0] border border-teal-500/40 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white font-mono uppercase tracking-wider">
                  Tracked Prospects & Athletes
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  {visibleAthletes.length} recruiting profiles
                </span>
              </div>
            </div>

            {selectedRecruiterId && (
              <span className="text-[11px] font-mono text-[#FFC857] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                Filtered by Recruiter
              </span>
            )}
          </div>

          <div className="space-y-3">
            {visibleAthletes.length === 0 ? (
              <div className="p-8 text-center bg-[#131C2E]/40 border border-white/10 rounded-2xl text-slate-400 text-xs font-mono space-y-2">
                <Zap className="w-8 h-8 mx-auto text-slate-600" />
                <p>No athletes match the current filter.</p>
                {selectedRecruiterId && (
                  <button
                    onClick={() => setSelectedRecruiterId(null)}
                    className="text-[#00F0D0] hover:underline"
                  >
                    Clear recruiter filter
                  </button>
                )}
              </div>
            ) : (
              visibleAthletes.map((athlete) => {
                const isSelected = selectedAthleteId === athlete.uid;
                const isFollowedByMe = currentUserFollowingIds.includes(athlete.uid);
                const followData = athleteFollowersMap.get(athlete.uid);
                const trackingRecruiters = followData ? followData.recruiterProfiles : [];
                const recruiterCount = followData ? followData.recruiterIds.size : 0;
                const avatar = athlete.avatarUrl || athlete.photoURL || '';

                return (
                  <motion.div
                    key={athlete.uid}
                    layout
                    className={`p-4 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-teal-950/20 border-teal-500/60 shadow-[0_0_20px_rgba(0,240,208,0.2)]'
                        : 'bg-[#131C2E] border-white/10 hover:border-teal-500/40'
                    }`}
                  >
                    {/* Header: Athlete info + Action */}
                    <div className="flex items-start justify-between gap-3">
                      <div 
                        onClick={() => onOpenProfile(athlete)}
                        className="flex items-center gap-3 cursor-pointer min-w-0 flex-1"
                      >
                        <div className="relative flex-shrink-0">
                          {avatar ? (
                            <img
                              src={avatar}
                              alt={athlete.displayName}
                              className="w-11 h-11 rounded-xl object-cover border border-white/10 bg-slate-800"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-slate-800 border border-white/10 text-[#00F0D0] font-mono font-bold flex items-center justify-center text-sm">
                              {(athlete.displayName || 'Athlete').slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          {athlete.isVerified && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#00F0D0] text-slate-950 flex items-center justify-center shadow">
                              <ShieldCheck className="w-2.5 h-2.5" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-bold text-white truncate hover:text-[#00F0D0] transition-colors">
                              {athlete.displayName}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-teal-500/20 text-[#00F0D0] border border-teal-500/40 uppercase">
                              ATHLETE
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 font-mono truncate mt-0.5">
                            {athlete.position || athlete.sport || 'Prospect'}
                            {athlete.gradYear && ` • '${String(athlete.gradYear).slice(-2)}`}
                            {athlete.highSchool && ` • ${athlete.highSchool}`}
                          </p>
                        </div>
                      </div>

                      {/* Follow & Message Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => onOpenDM(athlete.uid, athlete.displayName)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Direct Message"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>

                        {currentUid !== athlete.uid && (
                          <button
                            onClick={() => toggleFollow(athlete)}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                              isFollowedByMe
                                ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-rose-700/60 hover:text-rose-400'
                                : isViewerRecruiter
                                ? 'bg-gradient-to-r from-[#FFB800] to-amber-500 text-slate-950 font-black hover:brightness-110 shadow-[0_0_10px_rgba(255,184,0,0.3)]'
                                : 'bg-[#00F0D0] text-slate-950 font-black hover:opacity-90 shadow-[0_0_10px_rgba(0,240,208,0.3)]'
                            }`}
                          >
                            {isFollowedByMe ? (
                              <>
                                <UserCheck className="w-3 h-3 text-[#00F0D0]" />
                                <span>Tracking</span>
                              </>
                            ) : (
                              <>
                                <UserPlus className="w-3 h-3" />
                                <span>{isViewerRecruiter ? '+ Track' : '+ Follow'}</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Tracking Scouts Section */}
                    <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Trophy className="w-3 h-3 text-[#FFC857]" />
                          Tracked by <strong className="text-white">{recruiterCount}</strong> Verified Scouts:
                        </span>

                        <button
                          onClick={() => {
                            if (isSelected) {
                              setSelectedAthleteId(null);
                            } else {
                              setSelectedAthleteId(athlete.uid);
                              setSelectedRecruiterId(null);
                            }
                          }}
                          className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-teal-400 text-slate-950'
                              : 'bg-white/5 text-teal-300 hover:bg-white/10'
                          }`}
                        >
                          {isSelected ? '✕ Clear Filter' : 'Filter Scouts →'}
                        </button>
                      </div>

                      {/* Recruiter Chips */}
                      {trackingRecruiters.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {trackingRecruiters.map(rec => (
                            <button
                              key={rec.uid}
                              onClick={() => {
                                setSelectedRecruiterId(rec.uid);
                                setSelectedAthleteId(null);
                              }}
                              className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/40 text-[11px] font-mono text-slate-300 hover:text-[#FFC857] transition-colors cursor-pointer flex items-center gap-1"
                              title={`Click to filter athletes tracked by ${rec.displayName}`}
                            >
                              <Trophy className="w-2.5 h-2.5 text-[#FFC857]" />
                              <span className="font-bold">{rec.displayName}</span>
                              {(rec.highSchool || (rec as any).school || rec.teamName) && (
                                <span className="text-slate-500">({rec.highSchool || (rec as any).school || rec.teamName})</span>
                              )}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500 font-mono italic">
                          No scout follows yet. Share verified profile to attract scouts.
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
