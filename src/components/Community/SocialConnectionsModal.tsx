import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Users, 
  UserCheck, 
  UserPlus, 
  Trophy, 
  Zap, 
  Flame, 
  ShieldCheck, 
  ExternalLink,
  GraduationCap,
  MapPin,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSocialConnections } from '../../hooks/useSocialConnections';
import { useAuth } from '../../context/AuthContext';
import { SocialConnection, isRecruiterRole, isAthleteRole } from '../../services/socialConnectionService';
import { useNavigate } from 'react-router-dom';

interface SocialConnectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userRole?: string;
  initialTab?: 'followers' | 'following';
  onSelectMember?: (uid: string) => void;
  onOpenDM?: (uid: string, name: string) => void;
}

export const SocialConnectionsModal: React.FC<SocialConnectionsModalProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
  userRole = 'athlete',
  initialTab = 'followers',
  onSelectMember,
  onOpenDM
}) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const currentUid = user?.uid || profile?.uid || '';

  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [roleFilter, setRoleFilter] = useState<'all' | 'athlete' | 'scout' | 'coach'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    allConnections,
    currentUserFollowingIds,
    toggleFollow
  } = useSocialConnections({ targetUserId: userId });

  // Connections where target is this user (Followers)
  const followersList = useMemo(() => {
    return allConnections.filter(c => c.targetId === userId);
  }, [allConnections, userId]);

  // Connections where follower is this user (Following)
  const followingList = useMemo(() => {
    return allConnections.filter(c => c.followerId === userId);
  }, [allConnections, userId]);

  const activeList = activeTab === 'followers' ? followersList : followingList;

  // Filtered members in list
  const filteredList = useMemo(() => {
    return activeList.filter(conn => {
      const isFollowersView = activeTab === 'followers';
      const personName = isFollowersView ? conn.followerName : conn.targetName;
      const personRole = isFollowersView ? conn.followerRole : conn.targetRole;
      const personSport = isFollowersView ? conn.followerSport : conn.targetSport;
      const personSchool = isFollowersView ? conn.followerSchool : conn.targetSchool;

      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = personName.toLowerCase().includes(q);
        const matchesSport = (personSport || '').toLowerCase().includes(q);
        const matchesSchool = (personSchool || '').toLowerCase().includes(q);
        const matchesRole = personRole.toLowerCase().includes(q);
        if (!matchesName && !matchesSport && !matchesSchool && !matchesRole) return false;
      }

      // Role filter
      if (roleFilter !== 'all') {
        if (roleFilter === 'scout' && !isRecruiterRole(personRole)) return false;
        if (roleFilter === 'athlete' && !isAthleteRole(personRole)) return false;
        if (roleFilter === 'coach' && personRole.toLowerCase() !== 'coach') return false;
      }

      return true;
    });
  }, [activeList, activeTab, searchQuery, roleFilter]);

  if (!isOpen) return null;

  const handleMemberClick = (uid: string) => {
    onClose();
    if (onSelectMember) {
      onSelectMember(uid);
    } else {
      navigate(`/athletes/${uid}`);
    }
  };

  const getRoleBadge = (role: string) => {
    if (isRecruiterRole(role)) {
      return {
        label: 'RECRUITER / SCOUT',
        icon: Trophy,
        style: 'bg-amber-500/20 text-[#FFC857] border-amber-500/40 shadow-[0_0_8px_rgba(255,200,87,0.3)]'
      };
    }
    if (role.toLowerCase() === 'coach') {
      return {
        label: 'COACH',
        icon: Flame,
        style: 'bg-orange-500/20 text-[#FF6A00] border-orange-500/40 shadow-[0_0_8px_rgba(255,106,0,0.3)]'
      };
    }
    return {
      label: 'ATHLETE',
      icon: Zap,
      style: 'bg-teal-500/20 text-[#00F0D0] border-teal-500/40 shadow-[0_0_8px_rgba(0,240,208,0.25)]'
    };
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-x-0 bottom-0 max-h-[92vh] rounded-t-3xl border-t border-white/10 bg-[#0C1019] text-white p-5 sm:p-6 overflow-y-auto no-scrollbar z-50 sm:static sm:max-w-2xl sm:rounded-2xl border border-white/10 sm:overflow-hidden shadow-2xl space-y-4"
        >
          {/* Top drag bar for mobile */}
          <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-2 sm:hidden" />

          {/* Modal Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider bg-[#00F0D0]/15 text-[#00F0D0] border border-[#00F0D0]/40 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  SOCIAL NETWORK
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  @{userName}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-1">
                Athletic Connections
              </h2>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Follower / Following Master Tabs */}
          <div className="grid grid-cols-2 gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setActiveTab('followers')}
              className={`py-2 px-3 rounded-lg text-xs font-mono font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'followers'
                  ? 'bg-gradient-to-r from-[#00F0D0] to-teal-400 text-slate-950 shadow-[0_0_12px_rgba(0,240,208,0.35)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Followers</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeTab === 'followers' ? 'bg-slate-950/30 text-slate-950 font-bold' : 'bg-white/10 text-slate-300'
              }`}>
                {followersList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('following')}
              className={`py-2 px-3 rounded-lg text-xs font-mono font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'following'
                  ? 'bg-gradient-to-r from-[#FFB800] to-amber-400 text-slate-950 shadow-[0_0_12px_rgba(255,184,0,0.35)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Following</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeTab === 'following' ? 'bg-slate-950/30 text-slate-950 font-bold' : 'bg-white/10 text-slate-300'
              }`}>
                {followingList.length}
              </span>
            </button>
          </div>

          {/* Search & Role Filter Row */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${activeTab}...`}
                className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00F0D0]/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Role Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-[11px] font-mono">
              <button
                onClick={() => setRoleFilter('all')}
                className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
                  roleFilter === 'all'
                    ? 'bg-white/20 text-white border-white/40'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                }`}
              >
                All ({activeList.length})
              </button>
              <button
                onClick={() => setRoleFilter('scout')}
                className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  roleFilter === 'scout'
                    ? 'bg-amber-500/30 text-[#FFC857] border-amber-500/50'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:text-[#FFC857]'
                }`}
              >
                <Trophy className="w-3 h-3 text-[#FFC857]" />
                Recruiters / Scouts
              </button>
              <button
                onClick={() => setRoleFilter('athlete')}
                className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  roleFilter === 'athlete'
                    ? 'bg-teal-500/30 text-[#00F0D0] border-teal-500/50'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:text-[#00F0D0]'
                }`}
              >
                <Zap className="w-3 h-3 text-[#00F0D0]" />
                Athletes
              </button>
              <button
                onClick={() => setRoleFilter('coach')}
                className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  roleFilter === 'coach'
                    ? 'bg-orange-500/30 text-[#FF6A00] border-orange-500/50'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:text-[#FF6A00]'
                }`}
              >
                <Flame className="w-3 h-3 text-[#FF6A00]" />
                Coaches
              </button>
            </div>
          </div>

          {/* List of Connections */}
          <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1 divide-y divide-white/5">
            {filteredList.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Users className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-xs font-mono">
                  {searchQuery || roleFilter !== 'all'
                    ? 'No connections matching your filter criteria.'
                    : activeTab === 'followers'
                    ? 'No followers yet. Share your Just1Play link to connect with scouts & athletes!'
                    : 'Not following anyone yet. Explore the Member Directory to build your network.'}
                </p>
              </div>
            ) : (
              filteredList.map((conn) => {
                const isFollowersView = activeTab === 'followers';
                const targetPersonId = isFollowersView ? conn.followerId : conn.targetId;
                const targetPersonName = isFollowersView ? conn.followerName : conn.targetName;
                const targetPersonRole = isFollowersView ? conn.followerRole : conn.targetRole;
                const targetPersonAvatar = isFollowersView ? conn.followerAvatar : conn.targetAvatar;
                const targetPersonSport = isFollowersView ? conn.followerSport : conn.targetSport;
                const targetPersonSchool = isFollowersView ? conn.followerSchool : conn.targetSchool;
                const targetPersonPosition = isFollowersView ? conn.followerPosition : conn.targetPosition;
                const targetPersonGradYear = isFollowersView ? conn.followerGradYear : conn.targetGradYear;

                const roleBadge = getRoleBadge(targetPersonRole);
                const isFollowedByMe = currentUserFollowingIds.includes(targetPersonId);
                const isSelf = currentUid === targetPersonId;

                const RoleIcon = roleBadge.icon;

                return (
                  <div
                    key={conn.id}
                    className="pt-2.5 pb-2.5 flex items-center justify-between gap-3 hover:bg-white/[0.02] rounded-xl px-2 transition-colors"
                  >
                    {/* Member Info */}
                    <div 
                      onClick={() => handleMemberClick(targetPersonId)}
                      className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                    >
                      <div className="relative flex-shrink-0">
                        {targetPersonAvatar ? (
                          <img
                            src={targetPersonAvatar}
                            alt={targetPersonName}
                            className="w-10 h-10 rounded-xl object-cover border border-white/10 bg-slate-800"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 text-[#00F0D0] font-mono font-bold flex items-center justify-center text-xs">
                            {(targetPersonName || 'Member').slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        {isRecruiterRole(targetPersonRole) && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#FFB800] text-slate-950 flex items-center justify-center shadow-md">
                            <Trophy className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-white truncate hover:text-[#00F0D0] transition-colors">
                            {targetPersonName}
                          </span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase tracking-wider border flex items-center gap-1 ${roleBadge.style}`}>
                            <RoleIcon className="w-2.5 h-2.5" />
                            {roleBadge.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                          {targetPersonSport && (
                            <span className="text-[#00F0D0] font-bold">{targetPersonSport}</span>
                          )}
                          {targetPersonPosition && (
                            <span>• {targetPersonPosition}</span>
                          )}
                          {targetPersonGradYear && (
                            <span>• '{String(targetPersonGradYear).slice(-2)}</span>
                          )}
                          {targetPersonSchool && (
                            <span className="truncate">• {targetPersonSchool}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions: Follow / Unfollow + DM */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {onOpenDM && !isSelf && (
                        <button
                          onClick={() => {
                            onClose();
                            onOpenDM(targetPersonId, targetPersonName);
                          }}
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Send Direct Message"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {!isSelf && (
                        <button
                          onClick={() => {
                            toggleFollow({
                              uid: targetPersonId,
                              displayName: targetPersonName,
                              role: targetPersonRole as any,
                              avatarUrl: targetPersonAvatar,
                              sport: targetPersonSport,
                              highSchool: targetPersonSchool
                            });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                            isFollowedByMe
                              ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-rose-950/40 hover:text-rose-400'
                              : 'bg-[#00F0D0] text-slate-950 font-black hover:opacity-90 shadow-[0_0_10px_rgba(0,240,208,0.3)]'
                          }`}
                        >
                          {isFollowedByMe ? (
                            <>
                              <UserCheck className="w-3 h-3 text-[#00F0D0]" />
                              <span>Following</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-3 h-3" />
                              <span>+ Follow</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
