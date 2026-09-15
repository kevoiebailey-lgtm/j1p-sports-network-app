import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  UserCheck, 
  UserPlus, 
  MessageSquare, 
  Share2, 
  MapPin, 
  GraduationCap, 
  Trophy, 
  Flame, 
  Activity, 
  Video, 
  Instagram, 
  Twitter, 
  Mail, 
  ShieldCheck, 
  ExternalLink,
  Award,
  Calendar,
  CheckCircle2,
  Copy,
  Zap,
  Users,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { EditProfileModal } from '../Profile/EditProfileModal';
import { Edit3 } from 'lucide-react';
import { deleteHighlight } from '../../services/highlightService';
import { db } from '../../lib/firebase';
import { doc, updateDoc, arrayRemove, serverTimestamp } from 'firebase/firestore';

interface MemberProfileModalProps {
  member: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  isFollowing: boolean;
  onToggleFollow: (uid: string) => void;
  onOpenDM?: (targetUid: string, targetName: string) => void;
  followerCount?: number;
  connectionsCount?: number;
}

export const MemberProfileModal: React.FC<MemberProfileModalProps> = ({
  member,
  isOpen,
  onClose,
  isFollowing,
  onToggleFollow,
  onOpenDM,
  followerCount = 0,
  connectionsCount = 0
}) => {
  const navigate = useNavigate();
  const { user, role: authRole } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'film' | 'gamelogs'>('overview');
  const [copiedLink, setCopiedLink] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  if (!isOpen || !member) return null;

  const getMemberInitials = (name?: string): string => {
    if (!name || !name.trim()) return 'J1';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const isOwner = Boolean(user && (user.uid === member.uid || authRole === 'admin'));

  const handleCopyLink = () => {
    const url = `${window.location.origin}/profile/${member.uid}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      showToast('success', 'Profile Link Copied', `Sharable link for ${member.displayName} copied to clipboard.`);
      setTimeout(() => setCopiedLink(false), 2500);
    }).catch(() => {
      showToast('info', 'Profile URL', url);
    });
  };

  const getRoleBadge = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'athlete':
        return { label: 'Athlete', icon: Zap, color: 'bg-[#00B8D4]/20 text-[#00B8D4] border-[#00B8D4]/40 shadow-[0_0_10px_rgba(0,184,212,0.25)]' };
      case 'coach':
        return { label: 'Coach / Staff', icon: Flame, color: 'bg-[#FF6A00]/20 text-[#FF6A00] border-[#FF6A00]/40 shadow-[0_0_10px_rgba(255,106,0,0.25)]' };
      case 'scout':
      case 'recruiter':
        return { label: 'Scout / Recruiter', icon: Trophy, color: 'bg-[#FFC857]/20 text-[#FFC857] border-[#FFC857]/40 shadow-[0_0_10px_rgba(255,200,87,0.25)]' };
      case 'director':
        return { label: 'Tournament Director', icon: Award, color: 'bg-purple-500/20 text-purple-400 border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.25)]' };
      case 'admin':
        return { label: 'Super Admin', icon: ShieldCheck, color: 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.25)]' };
      case 'viewer':
      case 'fan':
      default:
        return { label: 'Parent / Fan', icon: Users, color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40' };
    }
  };

  const roleInfo = getRoleBadge(member.role);
  const RoleIcon = roleInfo.icon;
  const avatar = member.avatarUrl || member.photoURL || '';
  const hasUploadedPhoto = Boolean(avatar && !avatarError);
  const displayGpa = member.gpa || (member as any).academicGpa;

  const handleRemoveMemberVideo = async (e: React.MouseEvent, videoId: string, videoUrl: string, videoTitle: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOwner || !member?.uid) return;
    if (!window.confirm(`Are you sure you want to remove "${videoTitle}" from your profile?`)) return;

    try {
      const updatedMedia = (member.mediaUrls || []).filter(v => v.id !== videoId && v.url !== videoUrl);
      const updatedHighlightUrls = (member.highlightUrls || []).filter(u => u !== videoUrl);
      
      member.mediaUrls = updatedMedia;
      member.highlightUrls = updatedHighlightUrls;

      if (db) {
        const userRef = doc(db, 'users', member.uid);
        await updateDoc(userRef, {
          highlightUrls: arrayRemove(videoUrl),
          mediaUrls: updatedMedia,
          updatedAt: serverTimestamp()
        });
      }
      await deleteHighlight(videoId, member.uid, videoUrl);
      showToast('info', 'Highlight Removed', `Removed "${videoTitle}" from your film vault.`);
    } catch (err) {
      console.warn('Error deleting highlight:', err);
      showToast('error', 'Error', 'Failed to remove highlight reel.');
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-x-0 bottom-0 max-h-[92vh] rounded-t-3xl border-t border-white/10 bg-zinc-950/95 backdrop-blur-2xl p-6 overflow-y-auto no-scrollbar z-50 sm:static sm:max-w-2xl sm:rounded-2xl border border-white/10 sm:overflow-hidden sm:p-0 sm:my-auto shadow-2xl"
        >
          {/* Top drag bar indicator */}
          <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-4 sm:hidden" />

          {/* Header Banner Background */}
          <div className="h-28 sm:h-40 bg-gradient-to-r from-slate-900 via-[#1E293B] to-[#0A192F] relative border-b border-slate-800 -mx-6 -mt-6 sm:mx-0 sm:mt-0 rounded-t-3xl sm:rounded-t-none">
            <div className="absolute inset-0 bg-[radial-gradient(#00B8D4_1px,transparent_1px)] [background-size:16px_16px] opacity-15" />
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 w-9 h-9 rounded-full bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 flex items-center justify-center transition-colors z-10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Sport & Class Pill */}
            <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-black uppercase tracking-wider bg-black/60 backdrop-blur-md text-[#00B8D4] border border-[#00B8D4]/40">
                {member.sport || 'Sports'}
              </span>
              {member.gradYear && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-black/60 backdrop-blur-md text-[#FFC857] border border-[#FFC857]/40">
                  Class of {member.gradYear}
                </span>
              )}
            </div>
          </div>

          {/* Profile Identity Bar */}
          <div className="px-4 sm:px-6 pb-6 pt-0 relative">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 sm:-mt-16 mb-4">
              
              {/* Avatar + Name */}
              <div className="flex items-end gap-3 sm:gap-4">
                <div className="relative">
                  {hasUploadedPhoto ? (
                    <img
                      src={avatar}
                      alt={member.displayName}
                      onError={() => setAvatarError(true)}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-4 border-[#0F172A] shadow-xl bg-slate-800"
                    />
                  ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 text-teal-300 font-mono font-black text-2xl sm:text-3xl flex items-center justify-center shadow-inner">
                      {getMemberInitials(member.displayName)}
                    </div>
                  )}
                  {member.isVerified && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#00B8D4] text-slate-950 flex items-center justify-center shadow-lg border-2 border-[#0F172A]">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                <div className="mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      {member.displayName}
                    </h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1.5 ${roleInfo.color}`}>
                      <RoleIcon className="w-3 h-3" />
                      <span>{roleInfo.label}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mt-0.5 flex-wrap">
                    {member.position && (
                      <span className="text-[#00B8D4] font-bold font-mono">
                        {member.position} {member.jerseyNumber ? `• ${member.jerseyNumber}` : ''}
                      </span>
                    )}
                    {member.highSchool && (
                      <span className="flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
                        {member.highSchool}
                      </span>
                    )}
                    {member.state && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        {member.state}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons: Edit / Follow + Message + Share */}
              <div className="flex items-center gap-2 self-start sm:self-end">
                {isOwner ? (
                  <button
                    type="button"
                    onClick={() => setShowEditModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black font-mono transition-all cursor-pointer bg-gradient-to-r from-[#00E5FF] to-[#00B8D4] text-[#0B0F17] hover:brightness-110 shadow-[0_0_15px_rgba(0,229,255,0.4)]"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>EDIT PROFILE</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onToggleFollow(member.uid)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer shadow-lg ${
                      isFollowing
                        ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-rose-950/40 hover:text-rose-400 hover:border-rose-800/60'
                        : 'bg-gradient-to-r from-[#00B8D4] to-[#00F5D4] text-slate-950 font-black hover:opacity-90 shadow-[0_0_15px_rgba(0,184,212,0.4)]'
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5 text-[#00B8D4]" />
                        <span>FOLLOWING</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>+ FOLLOW</span>
                      </>
                    )}
                  </button>
                )}

                {onOpenDM && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenDM(member.uid, member.displayName);
                    }}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Send Direct Message"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Copy Profile Link"
                >
                  {copiedLink ? <CheckCircle2 className="w-4 h-4 text-[#00B8D4]" /> : <Share2 className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(`/profile/${member.uid}`);
                  }}
                  className="p-2 rounded-xl bg-[#00B8D4]/20 hover:bg-[#00B8D4] border border-[#00B8D4]/40 text-[#00B8D4] hover:text-slate-950 transition-colors cursor-pointer"
                  title="Open Full Profile Page"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3 rounded-2xl bg-slate-900/90 border border-slate-800 mb-4">
              <div className="text-center">
                <span className="block text-[10px] uppercase font-mono text-[#00B8D4] font-bold flex items-center justify-center gap-1">
                  <Users className="w-3 h-3 text-[#00B8D4]" />
                  Connections
                </span>
                <span className="text-sm font-black text-[#00B8D4] font-mono">
                  {connectionsCount ? connectionsCount.toLocaleString() : followerCount}
                </span>
              </div>
              <div className="text-center border-l border-slate-800">
                <span className="block text-[10px] uppercase font-mono text-slate-500 font-bold">Class Year</span>
                <span className="text-sm font-black text-white font-mono">
                  {member.gradYear ? `'${member.gradYear.slice(-2)}` : '--'}
                </span>
              </div>
              <div className="text-center border-l border-slate-800">
                <span className="block text-[10px] uppercase font-mono text-slate-500 font-bold">Height / Wt</span>
                <span className="text-sm font-black text-white font-mono">
                  {member.height || '--'} {member.weight ? `• ${member.weight}` : ''}
                </span>
              </div>
              <div className="text-center border-l border-slate-800">
                <span className="block text-[10px] uppercase font-mono text-slate-500 font-bold">GPA</span>
                <span className="text-sm font-black text-[#FFC857] font-mono">
                  {displayGpa ? `${displayGpa} GPA` : '--'}
                </span>
              </div>
              <div className="text-center border-l border-slate-800">
                <span className="block text-[10px] uppercase font-mono text-slate-500 font-bold">Highlights</span>
                <span className="text-sm font-black text-white font-mono">
                  {member.mediaUrls?.length || 0} Clips
                </span>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 mb-4 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'bg-[#00B8D4]/15 text-[#00B8D4] border border-[#00B8D4]/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Overview & Bio
              </button>
              {member.performanceMetrics && (
                <button
                  type="button"
                  onClick={() => setActiveTab('metrics')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'metrics'
                      ? 'bg-[#00B8D4]/15 text-[#00B8D4] border border-[#00B8D4]/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Laser Metrics
                </button>
              )}
              {member.mediaUrls && member.mediaUrls.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('film')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'film'
                      ? 'bg-[#00B8D4]/15 text-[#00B8D4] border border-[#00B8D4]/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Film Vault ({member.mediaUrls.length})
                </button>
              )}
              {member.gameLogs && member.gameLogs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('gamelogs')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'gamelogs'
                      ? 'bg-[#00B8D4]/15 text-[#00B8D4] border border-[#00B8D4]/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Game Logs
                </button>
              )}
            </div>

            {/* Tab Contents */}
            <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
              {activeTab === 'overview' && (
                <div className="space-y-3">
                  {/* Bio */}
                  <div>
                    <h4 className="text-[10px] font-mono uppercase font-bold text-slate-400 mb-1">About & Scouting Notes</h4>
                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                      {member.bio || member.coachingPhilosophy || member.recruitingFocus || 'Active athletic community member on the Just1Play platform.'}
                    </p>
                  </div>

                  {/* Team & Org Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {member.teamName && (
                      <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800">
                        <span className="text-[10px] text-slate-500 font-mono block">Club / Travel Team</span>
                        <span className="font-bold text-white">{member.teamName}</span>
                      </div>
                    )}
                    {member.orgAffiliation && (
                      <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800">
                        <span className="text-[10px] text-slate-500 font-mono block">Organization</span>
                        <span className="font-bold text-white">{member.orgAffiliation}</span>
                      </div>
                    )}
                  </div>

                  {/* Social Handles */}
                  {member.social && (
                    <div>
                      <h4 className="text-[10px] font-mono uppercase font-bold text-slate-400 mb-1.5">Social & Recruiting Links</h4>
                      <div className="flex flex-wrap gap-2">
                        {member.social.instagram && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                            <Instagram className="w-3 h-3 text-pink-400" />
                            {member.social.instagram}
                          </span>
                        )}
                        {member.social.twitter && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                            <Twitter className="w-3 h-3 text-sky-400" />
                            {member.social.twitter}
                          </span>
                        )}
                        {member.email && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {member.email}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'metrics' && member.performanceMetrics && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(member.performanceMetrics).map(([key, val]) => (
                    <div key={key} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">{key}</span>
                        <span className="text-xs font-mono font-black text-[#00B8D4]">{String(val)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#00B8D4] to-[#00F5D4]"
                          style={{ width: `${Math.min(100, Number(val) || 0)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'film' && member.mediaUrls && (
                <div className="space-y-2">
                  {member.mediaUrls.map((video, idx) => (
                    <div
                      key={video.id || idx}
                      className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-[#00B8D4]/40 flex items-center justify-between gap-3 transition-colors group"
                    >
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#00B8D4]/20 text-[#00B8D4] flex items-center justify-center shrink-0">
                          <Video className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-white group-hover:text-[#00B8D4] transition-colors block truncate">
                            {video.title || `Highlight Tape #${idx + 1}`}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {video.platform ? `${video.platform.toUpperCase()} • ` : ''}{video.createdAt || 'Verified Film'}
                          </span>
                        </div>
                      </a>

                      <div className="flex items-center gap-2 shrink-0">
                        {isOwner && (
                          <button
                            type="button"
                            onClick={(e) => handleRemoveMemberVideo(e, video.id || `vid-${idx}`, video.url, video.title || `Clip #${idx + 1}`)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/40 transition-colors cursor-pointer"
                            title="Remove from profile"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <a
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-slate-500 group-hover:text-white"
                          title="Open external link"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'gamelogs' && member.gameLogs && (
                <div className="space-y-2">
                  {member.gameLogs.map((log, idx) => (
                    <div key={log.id || idx} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-black font-mono ${log.gameResult === 'W' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                            {log.gameResult}
                          </span>
                          <span>vs {log.opponent}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">{log.gameDate} • {log.location || 'Home'}</span>
                      </div>
                      <span className="font-mono font-bold text-[#FFC857]">
                        {log.teamScore} - {log.opponentScore}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Edit Profile Modal */}
        {showEditModal && (
          <EditProfileModal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            initialRole={member.role}
          />
        )}
      </div>
    </AnimatePresence>
  );
};
