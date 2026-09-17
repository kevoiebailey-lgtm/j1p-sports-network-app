import React, { useState } from 'react';
import { 
  ShieldCheck, 
  MapPin, 
  Calendar, 
  Share2, 
  Edit3, 
  UserPlus, 
  UserCheck, 
  MessageSquare, 
  QrCode, 
  Check, 
  Sparkles, 
  Zap, 
  Flame, 
  Trophy, 
  Award, 
  Users, 
  Building2, 
  Video, 
  Eye,
  Sliders,
  ExternalLink,
  Instagram,
  Twitter,
  Mail,
  Camera,
  CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfile, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ShareButton } from '../ShareButton';
import { triggerGuestActionGate } from '../Auth/GuestActionGateModal';
import { isRecruiterRole, isAthleteRole } from '../../services/socialConnectionService';

interface ProfileHeaderProps {
  profile: UserProfile;
  isOwner: boolean;
  isFollowing: boolean;
  followerCount: number;
  followingCount?: number;
  connectionsCount: number;
  recruiterFollowersCount?: number;
  onToggleFollow: () => void;
  onOpenEdit: () => void;
  onOpenDM: () => void;
  onOpenAvatarUpload?: () => void;
  onOpenPayments?: () => void;
  onOpenConnectionsModal?: (tab: 'followers' | 'following') => void;
}

export const getRoleMeta = (role: string = 'athlete') => {
  const normalized = role.toLowerCase();
  switch (normalized) {
    case 'athlete':
      return {
        label: 'ATHLETE',
        title: 'Verified Athlete',
        icon: Zap,
        accentColor: '#00E5FF',
        badgeClass: 'bg-[#00E5FF]/15 text-[#00E5FF] border-[#00E5FF]/40 shadow-[0_0_15px_rgba(0,229,255,0.25)]',
        glowRing: 'border-[#00E5FF]/80 shadow-[0_0_20px_rgba(0,229,255,0.4)]',
        tagBg: 'bg-[#00E5FF]',
        tagText: 'text-[#0B0F17]'
      };
    case 'coach':
      return {
        label: 'HEAD COACH',
        title: 'Verified Coach & Staff',
        icon: Flame,
        accentColor: '#FF6A00',
        badgeClass: 'bg-[#FF6A00]/15 text-[#FF6A00] border-[#FF6A00]/40 shadow-[0_0_15px_rgba(255,106,0,0.25)]',
        glowRing: 'border-[#FF6A00]/80 shadow-[0_0_20px_rgba(255,106,0,0.4)]',
        tagBg: 'bg-[#FF6A00]',
        tagText: 'text-[#0B0F17]'
      };
    case 'scout':
    case 'recruiter':
      return {
        label: 'SCOUT / RECRUITER',
        title: 'NCAA Certified Scout',
        icon: Trophy,
        accentColor: '#FFC857',
        badgeClass: 'bg-[#FFC857]/15 text-[#FFC857] border-[#FFC857]/40 shadow-[0_0_15px_rgba(255,200,87,0.25)]',
        glowRing: 'border-[#FFC857]/80 shadow-[0_0_20px_rgba(255,200,87,0.4)]',
        tagBg: 'bg-[#FFC857]',
        tagText: 'text-[#0B0F17]'
      };
    case 'organization':
    case 'director':
      return {
        label: 'ORGANIZATION / DIRECTOR',
        title: 'Sanctioned Operator',
        icon: Building2,
        accentColor: '#A855F7',
        badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.25)]',
        glowRing: 'border-purple-500/80 shadow-[0_0_20px_rgba(168,85,247,0.4)]',
        tagBg: 'bg-purple-500',
        tagText: 'text-white'
      };
    case 'creator':
    case 'content_creator':
      return {
        label: 'CONTENT CREATOR',
        title: 'Sports Media & Videographer',
        icon: Video,
        accentColor: '#39FF14',
        badgeClass: 'bg-[#39FF14]/15 text-[#39FF14] border-[#39FF14]/40 shadow-[0_0_15px_rgba(57,255,20,0.25)]',
        glowRing: 'border-[#39FF14]/80 shadow-[0_0_20px_rgba(57,255,20,0.4)]',
        tagBg: 'bg-[#39FF14]',
        tagText: 'text-[#0B0F17]'
      };
    case 'admin':
      return {
        label: 'SUPER ADMIN',
        title: 'Platform Operations Admin',
        icon: Sliders,
        accentColor: '#F43F5E',
        badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.25)]',
        glowRing: 'border-rose-500/80 shadow-[0_0_20px_rgba(244,63,94,0.4)]',
        tagBg: 'bg-rose-500',
        tagText: 'text-white'
      };
    case 'fan':
    case 'viewer':
    default:
      return {
        label: 'FAN / SUPPORTER',
        title: 'Verified Sports Fan',
        icon: Users,
        accentColor: '#6366F1',
        badgeClass: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.25)]',
        glowRing: 'border-indigo-500/80 shadow-[0_0_20px_rgba(99,102,241,0.3)]',
        tagBg: 'bg-indigo-500',
        tagText: 'text-white'
      };
  }
};

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile,
  isOwner,
  isFollowing,
  followerCount,
  followingCount = 0,
  connectionsCount,
  recruiterFollowersCount = 0,
  onToggleFollow,
  onOpenEdit,
  onOpenDM,
  onOpenAvatarUpload,
  onOpenPayments,
  onOpenConnectionsModal
}) => {
  const { user, profile: viewerProfile } = useAuth();
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const isViewerRecruiter = isRecruiterRole(viewerProfile?.role);
  const isTargetAthlete = isAthleteRole(profile.role);
  const isViewerAthlete = isAthleteRole(viewerProfile?.role);
  const isTargetRecruiter = isRecruiterRole(profile.role);

  const roleMeta = getRoleMeta(profile.role);
  const RoleIcon = roleMeta.icon;
  const avatar = profile.avatarUrl || profile.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';
  const handle = profile.email ? `@${profile.email.split('@')[0]}` : `@${profile.displayName.toLowerCase().replace(/\s+/g, '')}`;

  const handleCopyProfileUrl = () => {
    const url = `${window.location.origin}/profile/${profile.uid}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      showToast('success', 'Profile URL Copied', `Sharable link for ${profile.displayName} copied to clipboard!`);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      showToast('info', 'Profile URL', url);
    });
  };

  return (
    <div className="relative rounded-3xl bg-[#131B26]/90 border border-white/10 shadow-2xl backdrop-blur-xl overflow-hidden mb-6">
      {/* Cybernetic Grid Ambient Background Header */}
      <div className="relative h-44 sm:h-56 w-full bg-gradient-to-r from-[#0B0F17] via-[#131B26] to-[#0A1424] overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(#00E5FF_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00E5FF]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-[#39FF14]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Tags */}
        <div className="absolute top-4 left-4 sm:left-6 flex items-center gap-2 flex-wrap z-10">
          <span className="px-3 py-1 rounded-full text-[11px] font-black font-mono uppercase tracking-wider bg-[#0B0F17]/80 backdrop-blur-md text-[#00E5FF] border border-[#00E5FF]/40 shadow-md flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-ping" />
            {profile.sport || 'Multi-Sport'}
          </span>

          {profile.gradYear && (
            <span className="px-3 py-1 rounded-full text-[11px] font-black font-mono uppercase tracking-wider bg-[#0B0F17]/80 backdrop-blur-md text-[#39FF14] border border-[#39FF14]/40 shadow-md">
              Class of {profile.gradYear}
            </span>
          )}

          {profile.athleteId && (
            <span className="px-3 py-1 rounded-full text-[11px] font-bold font-mono bg-white/5 backdrop-blur-md text-slate-300 border border-white/10">
              ID: {profile.athleteId}
            </span>
          )}
        </div>

        {/* Top Right Quick Actions: Share Profile */}
        <div className="absolute top-4 right-4 sm:right-6 flex items-center gap-2 z-10">
          <button
            onClick={handleCopyProfileUrl}
            className="px-3 py-1.5 rounded-xl bg-[#0B0F17]/80 hover:bg-[#0B0F17] text-slate-300 hover:text-white border border-white/10 backdrop-blur-md text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            title="Share Profile Link"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#39FF14]" /> : <Share2 className="w-3.5 h-3.5 text-[#00E5FF]" />}
            <span>{copied ? 'Copied!' : 'Share'}</span>
          </button>
        </div>
      </div>

      {/* Main Profile Info Section */}
      <div className="px-5 sm:px-8 pb-6 pt-0 relative">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 -mt-16 sm:-mt-20 mb-6">
          
          {/* Avatar + Main Details */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 text-center sm:text-left">
            <div className="relative group">
              <div 
                onClick={isOwner && onOpenAvatarUpload ? onOpenAvatarUpload : undefined}
                className={`relative cursor-pointer transition-transform ${isOwner ? 'hover:scale-105' : ''}`}
                title={isOwner ? "Click to change profile picture" : profile.displayName}
              >
                <img
                  src={avatar}
                  alt={profile.displayName}
                  className={`w-28 h-28 sm:w-36 sm:h-36 rounded-3xl object-cover border-4 bg-[#0B0F17] shadow-2xl ${roleMeta.glowRing}`}
                />
                {isOwner && (
                  <div className="absolute inset-0 rounded-3xl bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[#00E5FF] transition-opacity">
                    <Camera className="w-6 h-6 mb-1" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Change</span>
                  </div>
                )}
              </div>

              {profile.isVerified && (
                <div 
                  className="absolute -bottom-1 -right-1 px-2.5 py-1 rounded-full bg-[#00E5FF] text-[#0B0F17] flex items-center gap-1 shadow-lg border-2 border-[#131B26]"
                  title="Verified Just1Play Member"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-black font-mono tracking-wider">VERIFIED</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {profile.displayName}
                </h1>
                <span className={`px-3 py-0.5 rounded-full text-[10px] font-black font-mono uppercase tracking-wider border flex items-center gap-1.5 ${roleMeta.badgeClass}`}>
                  <RoleIcon className="w-3 h-3" />
                  <span>{roleMeta.label}</span>
                </span>
              </div>

              <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-mono font-bold">
                <span className="text-slate-400">{handle}</span>
                {profile.position && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="text-[#00E5FF] font-black">{profile.position}</span>
                  </>
                )}
                {profile.jerseyNumber && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="text-[#39FF14] font-black">#{profile.jerseyNumber}</span>
                  </>
                )}
              </div>

              <div className="flex items-center justify-center sm:justify-start gap-4 text-xs text-slate-300 flex-wrap">
                {profile.highSchool && (
                  <span className="flex items-center gap-1 text-slate-300">
                    <span>{profile.highSchool}</span>
                  </span>
                )}
                {profile.teamName && profile.teamName !== profile.highSchool && (
                  <span className="text-slate-400">
                    Club: <strong className="text-white">{profile.teamName}</strong>
                  </span>
                )}
                {(profile.city || profile.state || profile.location) && (
                  <span className="flex items-center gap-1 text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-[#00E5FF]" />
                    <span>
                      {profile.city ? `${profile.city}, ${profile.state || ''}` : (profile.location || profile.state)}
                      {profile.country && profile.country !== 'United States' ? `, ${profile.country}` : ''}
                    </span>
                  </span>
                )}
              </div>

              {/* Verified Social Media Badges */}
              {profile.social && Object.values(profile.social).some(Boolean) && (
                <div className="flex items-center justify-center sm:justify-start gap-2 pt-1 flex-wrap">
                  {profile.social.instagram && (
                    <a
                      href={profile.social.instagram.startsWith('http') ? profile.social.instagram : `https://instagram.com/${profile.social.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-0.5 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 text-pink-400 text-[11px] font-mono flex items-center gap-1 transition-colors"
                      title="Instagram"
                    >
                      <Instagram className="w-3 h-3" />
                      <span>{profile.social.instagram.replace('https://instagram.com/', '@').replace('https://www.instagram.com/', '@')}</span>
                    </a>
                  )}

                  {(profile.social.twitter || profile.social.x) && (
                    <a
                      href={(profile.social.twitter || profile.social.x)!.startsWith('http') ? (profile.social.twitter || profile.social.x)! : `https://x.com/${(profile.social.twitter || profile.social.x)!.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-0.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-[11px] font-mono flex items-center gap-1 transition-colors"
                      title="X / Twitter"
                    >
                      <span className="font-bold">𝕏</span>
                      <span>{(profile.social.twitter || profile.social.x)!.replace('https://x.com/', '@').replace('https://twitter.com/', '@')}</span>
                    </a>
                  )}

                  {profile.social.youtube && (
                    <a
                      href={profile.social.youtube.startsWith('http') ? profile.social.youtube : `https://youtube.com/${profile.social.youtube}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-0.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-[11px] font-mono flex items-center gap-1 transition-colors"
                      title="YouTube"
                    >
                      <span className="font-bold">YT</span>
                      <span>Highlights</span>
                    </a>
                  )}

                  {profile.social.tiktok && (
                    <a
                      href={profile.social.tiktok.startsWith('http') ? profile.social.tiktok : `https://tiktok.com/@${profile.social.tiktok.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[#00E5FF] text-[11px] font-mono flex items-center gap-1 transition-colors"
                      title="TikTok"
                    >
                      <span>TT</span>
                      <span>{profile.social.tiktok.replace('https://tiktok.com/@', '@')}</span>
                    </a>
                  )}

                  {profile.social.hudl && (
                    <a
                      href={profile.social.hudl.startsWith('http') ? profile.social.hudl : `https://${profile.social.hudl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-0.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 text-[11px] font-mono flex items-center gap-1 transition-colors"
                      title="Hudl Film"
                    >
                      <span>HUDL</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}

                  {profile.social.website && (
                    <a
                      href={profile.social.website.startsWith('http') ? profile.social.website : `https://${profile.social.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono flex items-center gap-1 transition-colors"
                      title="Website"
                    >
                      <span>Web</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Button Row */}
          <div className="flex items-center justify-center sm:justify-end gap-3 flex-wrap">
            <ShareButton
              path={`profile/${profile.uid}`}
              title={`${profile.displayName || 'Athlete Profile'} | Just One Play`}
              text={`Check out ${profile.displayName || 'this athlete'}'s profile and recruiting film on Just One Play!`}
              variant="secondary"
              className="py-2.5 px-4 font-mono text-xs"
            />

            {isOwner ? (
              <div className="flex items-center gap-2">
                {onOpenPayments && (
                  <button
                    onClick={onOpenPayments}
                    className="px-4 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white border border-white/15 text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-md cursor-pointer"
                    title="Manage linked PayPal, Venmo, and Saved Cards"
                  >
                    <CreditCard className="w-4 h-4 text-[#00E5FF]" />
                    <span className="hidden sm:inline">Fast Pay</span>
                  </button>
                )}

                <button
                  onClick={onOpenEdit}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#00B8D4] text-[#0B0F17] font-black text-xs font-mono uppercase tracking-wider hover:brightness-110 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(0,229,255,0.35)] cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Profile</span>
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => {
                    if (!profile || !user) {
                      triggerGuestActionGate('Follow Athlete', profile.displayName);
                      return;
                    }
                    onToggleFollow();
                  }}
                  className={`px-5 py-2.5 rounded-xl text-xs font-mono font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg ${
                    isFollowing
                      ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-rose-500/60 hover:text-rose-400'
                      : isViewerRecruiter && isTargetAthlete
                      ? 'bg-gradient-to-r from-[#FFB800] to-amber-500 text-slate-950 shadow-[0_0_20px_rgba(255,184,0,0.4)] hover:brightness-110'
                      : 'bg-gradient-to-r from-[#00E5FF] to-[#00B8D4] text-[#0B0F17] shadow-[0_0_20px_rgba(0,229,255,0.35)] hover:brightness-110'
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <UserCheck className="w-4 h-4 text-[#00E5FF]" />
                      <span>{isViewerRecruiter && isTargetAthlete ? 'Tracking Prospect' : isViewerAthlete && isTargetRecruiter ? 'Following Recruiter' : 'Following'}</span>
                    </>
                  ) : (
                    <>
                      {isViewerRecruiter && isTargetAthlete ? (
                        <Trophy className="w-4 h-4 text-slate-950" />
                      ) : (
                        <UserPlus className="w-4 h-4" />
                      )}
                      <span>{isViewerRecruiter && isTargetAthlete ? '+ Track Prospect' : isViewerAthlete && isTargetRecruiter ? '+ Follow Recruiter' : '+ Follow'}</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    if (!user) {
                      triggerGuestActionGate('Direct Message', profile.displayName);
                      return;
                    }
                    onOpenDM();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-mono font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md"
                  title="Direct Message"
                >
                  <MessageSquare className="w-4 h-4 text-[#00E5FF]" />
                  <span>Message</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Recruiter Following Badge (if applicable) */}
        {recruiterFollowersCount > 0 && (
          <div className="mb-4">
            <button
              onClick={() => onOpenConnectionsModal?.('followers')}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-500/40 text-[#FFC857] text-xs font-mono font-bold hover:bg-amber-500/30 transition-all cursor-pointer shadow-[0_0_15px_rgba(255,200,87,0.2)]"
            >
              <Trophy className="w-3.5 h-3.5 text-[#FFC857]" />
              <span>Tracked by {recruiterFollowersCount} Verified College {recruiterFollowersCount === 1 ? 'Recruiter' : 'Recruiters'}</span>
              <span className="text-[10px] text-amber-300 underline font-sans ml-1">View Scouts</span>
            </button>
          </div>
        )}

        {/* Bio Quote */}
        {profile.bio && (
          <div className="bg-[#0B0F17]/60 border border-white/5 rounded-2xl p-4 mb-4">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#00E5FF] block mb-1">
              Player / Member Bio:
            </span>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {profile.bio}
            </p>
          </div>
        )}

        {/* Social Proof Counters & Measurables Pill Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
          <div className="bg-[#0B0F17]/80 border border-white/10 rounded-2xl p-3 text-center">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Connections</span>
            <span className="text-base font-black text-[#00E5FF] font-mono">{connectionsCount.toLocaleString()}</span>
          </div>

          <button 
            type="button"
            onClick={() => onOpenConnectionsModal?.('followers')}
            className="bg-[#0B0F17]/80 border border-white/10 hover:border-[#39FF14]/50 rounded-2xl p-3 text-center transition-all cursor-pointer group"
          >
            <span className="text-[10px] font-mono uppercase text-slate-400 group-hover:text-white font-bold block">Followers</span>
            <span className="text-base font-black text-[#39FF14] font-mono group-hover:scale-105 transition-transform inline-block">
              {followerCount.toLocaleString()}
            </span>
          </button>

          <button 
            type="button"
            onClick={() => onOpenConnectionsModal?.('following')}
            className="bg-[#0B0F17]/80 border border-white/10 hover:border-[#FFB800]/50 rounded-2xl p-3 text-center transition-all cursor-pointer group"
          >
            <span className="text-[10px] font-mono uppercase text-slate-400 group-hover:text-white font-bold block">Following</span>
            <span className="text-base font-black text-[#FFB800] font-mono group-hover:scale-105 transition-transform inline-block">
              {followingCount.toLocaleString()}
            </span>
          </button>

          <div className="bg-[#0B0F17]/80 border border-white/10 rounded-2xl p-3 text-center">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Height / Weight</span>
            <span className="text-xs font-black text-white font-mono">
              {profile.height || "6'0\""} / {profile.weight || "175 lbs"}
            </span>
          </div>

          <div className="bg-[#0B0F17]/80 border border-white/10 rounded-2xl p-3 text-center">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">GPA Academic</span>
            <span className="text-base font-black text-[#FFC857] font-mono">{profile.gpa || "3.8"}</span>
          </div>

          <div className="bg-[#0B0F17]/80 border border-white/10 rounded-2xl p-3 text-center">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Highlight Reels</span>
            <span className="text-base font-black text-white font-mono">{profile.mediaUrls?.length || 0} Videos</span>
          </div>
        </div>
      </div>
    </div>
  );
};
