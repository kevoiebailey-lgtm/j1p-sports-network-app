import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { 
  ArrowLeft, 
  Activity, 
  Film, 
  BarChart2, 
  UserCheck, 
  UserPlus, 
  MessageSquare, 
  Share2, 
  Sliders, 
  ShieldCheck, 
  Flame, 
  Trophy, 
  Zap, 
  Sparkles,
  Award,
  Layers,
  CreditCard,
  FolderLock
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { UserProfile, VideoHighlight } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { deleteHighlight } from '../../services/highlightService';
import { ProfileHeader } from './ProfileHeader';
import { AthleteStatsView } from './AthleteStatsView';
import { GameLogsTable } from './GameLogsTable';
import { MediaHub } from './MediaHub';
import { ProfileHighlights } from './ProfileHighlights';
import { RoleSpecificViews } from './RoleSpecificViews';
import { EditProfileModal } from './EditProfileModal';
import { AvatarUploadModal } from './AvatarUploadModal';
import { CollegeRecruiterDmModal } from '../RecruiterMatrix/CollegeRecruiterDmModal';
import { RecruiterInquiriesHubModal } from '../RecruiterMatrix/RecruiterInquiriesHubModal';
import { NilPitchDeckModal } from '../AthleteProfile/NilPitchDeckModal';
import { CheerMatrix } from '../Cheer/CheerMatrix';
import { SavedPaymentAccountsSection } from './SavedPaymentAccountsSection';
import { PurchasedMediaLocker } from './PurchasedMediaLocker';
import { MetadataUtility } from '../SEO/MetadataUtility';
import { useSocialConnections } from '../../hooks/useSocialConnections';
import { SocialConnectionsModal } from '../Community/SocialConnectionsModal';

export const SportsProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile: authProfile, role: authRole, updateUserProfile } = useAuth();
  const { showToast } = useToast();

  const isEditRoute = location.pathname.includes('/edit');

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'gamelogs' | 'media' | 'role_dossier' | 'cheer_matrix' | 'payment_accounts' | 'locker'>('overview');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [connectionsCount, setConnectionsCount] = useState(0);
  const [showEditModal, setShowEditModal] = useState(isEditRoute);
  const [editModalInitialTab, setEditModalInitialTab] = useState<'bio_info' | 'location' | 'socials' | 'preview' | 'payment_accounts'>('bio_info');
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showDmModal, setShowDmModal] = useState(false);
  const [showNilModal, setShowNilModal] = useState(false);
  const [showRecruiterHubModal, setShowRecruiterHubModal] = useState(false);
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [socialModalTab, setSocialModalTab] = useState<'followers' | 'following'>('followers');

  const {
    followersCount: liveFollowersCount,
    followingCount: liveFollowingCount,
    isFollowingTarget,
    toggleFollow,
    getRecruitersFollowing
  } = useSocialConnections({
    targetUserId: profile?.uid,
    targetProfile: profile || undefined
  });

  const recruitersFollowing = profile?.uid ? getRecruitersFollowing(profile.uid) : [];

  useEffect(() => {
    if (isEditRoute) {
      setShowEditModal(true);
    }
  }, [isEditRoute]);

  // Handle URL query param tab
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    if (tab === 'payment_accounts') {
      setActiveTab('payment_accounts');
    } else if (tab === 'locker' || tab === 'purchases' || tab === 'vault') {
      setActiveTab('locker');
    }
  }, [location.search]);

  // Fetch target profile by ID or default to logged-in user
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);

      const targetId = id || user?.uid;

      if (!targetId && authProfile) {
        setProfile(authProfile);
        setLoading(false);
        return;
      }

      if (!targetId) {
        setProfile(null);
        setLoading(false);
        return;
      }

      // Check if matches logged in user first
      if (user?.uid && targetId === user.uid && authProfile) {
        setProfile(authProfile);
        setLoading(false);
        return;
      }

      // Check Firestore
      try {
        if (db) {
          const userDocRef = doc(db, 'users', targetId);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            const resolved: UserProfile = {
              uid: docSnap.id,
              displayName: data.displayName || data.name || 'Member',
              email: data.email || '',
              role: data.role || 'athlete',
              sport: data.sport || 'Basketball',
              isVerified: data.isVerified || false,
              avatarUrl: data.avatarUrl || data.photoURL || '',
              highSchool: data.highSchool || data.school || '',
              state: data.state || '',
              position: data.position || '',
              gradYear: data.gradYear || '',
              jerseyNumber: data.jerseyNumber || '',
              teamName: data.teamName || '',
              bio: data.bio || '',
              height: data.height || '',
              weight: data.weight || '',
              gpa: data.gpa || '',
              social: data.social || {},
              mediaUrls: data.mediaUrls || (data.highlightUrls ? data.highlightUrls.map((u: string, idx: number) => ({
                id: `hl-${idx}`,
                title: `Highlight Reel ${idx + 1}`,
                url: u,
                platform: 'other',
                createdAt: new Date().toISOString().split('T')[0]
              })) : []),
              highlightUrls: data.highlightUrls || [],
              performanceMetrics: data.performanceMetrics,
              gameLogs: data.gameLogs,
              ...data
            } as UserProfile;

            setProfile(resolved);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Error fetching user profile from Firestore:', err);
      }

      if (authProfile && (!id || id === authProfile.uid)) {
        setProfile(authProfile);
      } else {
        setProfile(null);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [id, user, authProfile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F17] p-4 sm:p-8 flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-full border-4 border-[#00E5FF]/20 border-t-[#00E5FF] animate-spin mb-4" />
        <p className="text-sm font-mono text-slate-400 uppercase tracking-widest animate-pulse">
          Loading Just1Play Sports Profile...
        </p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0B0F17] p-8 flex flex-col items-center justify-center text-center">
        <h2 className="text-2xl font-black text-white mb-2">Member Profile Not Found</h2>
        <p className="text-slate-400 font-mono text-sm mb-6">The requested user profile does not exist or has been removed.</p>
        <button
          onClick={() => navigate('/members')}
          className="px-6 py-2.5 rounded-xl bg-[#00E5FF] text-[#0B0F17] font-black font-mono uppercase text-xs cursor-pointer"
        >
          Return to Member Directory
        </button>
      </div>
    );
  }

  const isOwner = Boolean(user && (user.uid === profile.uid || authRole === 'admin'));
  const isAthlete = !profile.role || profile.role.toLowerCase() === 'athlete';

  const handleToggleFollow = () => {
    setIsFollowing((prev) => {
      const next = !prev;
      setFollowerCount((c) => (next ? c + 1 : Math.max(0, c - 1)));
      showToast(
        next ? 'success' : 'info',
        next ? 'Followed Athlete' : 'Unfollowed',
        next
          ? `You are now receiving live stat & highlight updates for ${profile.displayName}.`
          : `You stopped following ${profile.displayName}.`
      );
      return next;
    });
  };

  const handleAddMedia = async (newVideo: VideoHighlight) => {
    const updatedMedia = [newVideo, ...(profile.mediaUrls || [])];
    const updatedHighlightUrls = [newVideo.url, ...(profile.highlightUrls || [])];
    const updatedProfile = { ...profile, mediaUrls: updatedMedia, highlightUrls: updatedHighlightUrls };
    setProfile(updatedProfile);

    if (profile.uid && db) {
      try {
        const userRef = doc(db, 'users', profile.uid);
        await updateDoc(userRef, {
          highlightUrls: arrayUnion(newVideo.url),
          mediaUrls: arrayUnion(newVideo),
          updatedAt: serverTimestamp()
        });
      } catch (e) {
        console.warn('Error saving highlight video URL to Firestore:', e);
      }
    }

    if (isOwner && updateUserProfile) {
      updateUserProfile({ mediaUrls: updatedMedia, highlightUrls: updatedHighlightUrls });
    }
  };

  const handleRemoveMedia = async (video: VideoHighlight) => {
    const updatedMedia = (profile.mediaUrls || []).filter(m => m.id !== video.id && m.url !== video.url);
    const updatedHighlightUrls = (profile.highlightUrls || []).filter(u => u !== video.url);
    const isFeaturedRemoved = profile.featuredHighlightUrl === video.url;
    const updatedProfile = {
      ...profile,
      mediaUrls: updatedMedia,
      highlightUrls: updatedHighlightUrls,
      ...(isFeaturedRemoved ? { featuredHighlightUrl: updatedHighlightUrls[0] || '', featuredHighlightTitle: updatedMedia[0]?.title || '' } : {})
    };
    setProfile(updatedProfile);

    if (profile.uid && db) {
      try {
        const userRef = doc(db, 'users', profile.uid);
        await updateDoc(userRef, {
          highlightUrls: arrayRemove(video.url),
          mediaUrls: updatedMedia,
          ...(isFeaturedRemoved ? { featuredHighlightUrl: updatedHighlightUrls[0] || '', featuredHighlightTitle: updatedMedia[0]?.title || '' } : {}),
          updatedAt: serverTimestamp()
        });
        await deleteHighlight(video.id, profile.uid, video.url);
      } catch (e) {
        console.warn('Error removing highlight video URL from Firestore:', e);
      }
    }

    if (isOwner && updateUserProfile) {
      updateUserProfile({
        mediaUrls: updatedMedia,
        highlightUrls: updatedHighlightUrls,
        ...(isFeaturedRemoved ? { featuredHighlightUrl: updatedHighlightUrls[0] || '', featuredHighlightTitle: updatedMedia[0]?.title || '' } : {})
      });
    }
    showToast('info', 'Highlight Removed', `Removed "${video.title}" from your profile film room.`);
  };

  const athleteTitle = profile.displayName 
    ? `${profile.displayName} | ${profile.sport || 'Athlete'} Profile & Verified Stats - Just1Play` 
    : 'Athlete Profile | Just1Play Sports Network';
  const athleteDesc = `${profile.displayName} (${profile.sport || 'Sports'} - ${profile.highSchool || 'High School'}${profile.gradYear ? ` Class of ${profile.gradYear}` : ''}${profile.position ? `, ${profile.position}` : ''}). View verified recruiting stats, combine metrics, and highlight film on Just1Play.`;
  const athleteImage = profile.avatarUrl || profile.photoURL || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&auto=format&fit=crop&q=80';

  return (
    <div className="min-h-screen bg-[#0B0F17] text-white p-3 sm:p-6 lg:p-8">
      <MetadataUtility
        title={athleteTitle}
        description={athleteDesc}
        image={athleteImage}
        type="profile"
        keywords={`${profile.displayName}, ${profile.sport}, youth sports recruiting, ${profile.highSchool}, ${profile.position}, combine stats`}
      />
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Navigation Breadcrumb / Back Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#131B26] hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 text-xs font-mono font-bold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#00E5FF]" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2">
            {isAthlete && (
              <>
                <button
                  type="button"
                  onClick={() => setShowNilModal(true)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#E5B868] hover:opacity-90 text-slate-950 font-black text-xs font-mono uppercase tracking-wider transition-all shadow-md shadow-[#FF6A00]/20 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>NIL Pitch-Deck</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowRecruiterHubModal(true)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#131B26] hover:bg-slate-800 text-[#00E5FF] border border-[#00E5FF]/30 font-bold text-xs font-mono transition-all cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Recruiter Inquiries</span>
                </button>
              </>
            )}

            <Link
              to="/members"
              className="text-xs font-mono font-bold text-slate-400 hover:text-[#00E5FF] transition-colors"
            >
              Member Directory
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-xs font-mono text-white font-bold truncate max-w-[160px] sm:max-w-xs">
              {profile.displayName}
            </span>
          </div>
        </div>

        {/* Universal Profile Header Component */}
        <ProfileHeader
          profile={profile}
          isOwner={isOwner}
          isFollowing={isFollowingTarget}
          followerCount={liveFollowersCount}
          followingCount={liveFollowingCount}
          connectionsCount={connectionsCount || (liveFollowersCount + liveFollowingCount + 42)}
          recruiterFollowersCount={recruitersFollowing.length}
          onToggleFollow={() => toggleFollow()}
          onOpenEdit={() => {
            setEditModalInitialTab('bio_info');
            setShowEditModal(true);
          }}
          onOpenPayments={() => {
            setEditModalInitialTab('payment_accounts');
            setShowEditModal(true);
          }}
          onOpenDM={() => setShowDmModal(true)}
          onOpenAvatarUpload={() => setShowAvatarModal(true)}
          onOpenConnectionsModal={(tab) => {
            setSocialModalTab(tab);
            setShowSocialModal(true);
          }}
        />

        {/* Interactive Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/10 no-scrollbar">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-5 py-2.5 rounded-2xl font-mono text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-[#00E5FF] text-[#0B0F17] shadow-[0_0_20px_rgba(0,229,255,0.4)]'
                : 'bg-[#131B26] text-slate-400 hover:text-white hover:bg-slate-800 border border-white/5'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Profile Overview</span>
          </button>

          {isAthlete && (
            <>
              <button
                onClick={() => setActiveTab('stats')}
                className={`px-5 py-2.5 rounded-2xl font-mono text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'stats'
                    ? 'bg-[#00E5FF] text-[#0B0F17] shadow-[0_0_20px_rgba(0,229,255,0.4)]'
                    : 'bg-[#131B26] text-slate-400 hover:text-white hover:bg-slate-800 border border-white/5'
                }`}
              >
                <BarChart2 className="w-4 h-4" />
                <span>Athletic Stats & Combine</span>
              </button>

              <button
                onClick={() => setActiveTab('gamelogs')}
                className={`px-5 py-2.5 rounded-2xl font-mono text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'gamelogs'
                    ? 'bg-[#00E5FF] text-[#0B0F17] shadow-[0_0_20px_rgba(0,229,255,0.4)]'
                    : 'bg-[#131B26] text-slate-400 hover:text-white hover:bg-slate-800 border border-white/5'
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>Game Logs & Scores</span>
              </button>
            </>
          )}

          <button
            onClick={() => setActiveTab('media')}
            className={`px-5 py-2.5 rounded-2xl font-mono text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'media'
                ? 'bg-[#00E5FF] text-[#0B0F17] shadow-[0_0_20px_rgba(0,229,255,0.4)]'
                : 'bg-[#131B26] text-slate-400 hover:text-white hover:bg-slate-800 border border-white/5'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Highlights & Film ({profile.mediaUrls?.length || 3})</span>
          </button>

          <button
            onClick={() => setActiveTab('cheer_matrix')}
            className={`px-5 py-2.5 rounded-2xl font-mono text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'cheer_matrix'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-neutral-950 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                : 'bg-[#131B26] text-emerald-400 hover:text-white hover:bg-slate-800 border border-emerald-500/20'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>CheerMatrix &trade;</span>
          </button>

          <button
            id="profile-tab-locker-btn"
            onClick={() => setActiveTab('locker')}
            className={`px-5 py-2.5 rounded-2xl font-mono text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'locker'
                ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-[#00E5FF] text-[#0B0F17] shadow-[0_0_20px_rgba(0,229,255,0.4)]'
                : 'bg-[#131B26] text-emerald-400 hover:text-white hover:bg-slate-800 border border-emerald-500/20'
            }`}
          >
            <FolderLock className="w-4 h-4" />
            <span>Media Locker</span>
          </button>

          {isOwner && (
            <button
              onClick={() => setActiveTab('payment_accounts')}
              className={`px-5 py-2.5 rounded-2xl font-mono text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'payment_accounts'
                  ? 'bg-gradient-to-r from-[#00E5FF] to-[#0070BA] text-[#0B0F17] shadow-[0_0_20px_rgba(0,229,255,0.4)]'
                  : 'bg-[#131B26] text-slate-400 hover:text-white hover:bg-slate-800 border border-white/5'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Fast Pay & Wallets</span>
            </button>
          )}

          {!isAthlete && (
            <button
              onClick={() => setActiveTab('role_dossier')}
              className={`px-5 py-2.5 rounded-2xl font-mono text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'role_dossier'
                  ? 'bg-[#00E5FF] text-[#0B0F17] shadow-[0_0_20px_rgba(0,229,255,0.4)]'
                : 'bg-[#131B26] text-slate-400 hover:text-white hover:bg-slate-800 border border-white/5'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Role Dossier</span>
            </button>
          )}
        </div>

        {/* Tab Content Panels */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <>
              {/* Featured Athlete Highlight Film */}
              <ProfileHighlights
                profile={profile}
                isOwner={isOwner}
                onHighlightUpdated={(newUrl, title) => {
                  setProfile(prev => prev ? {
                    ...prev,
                    featuredHighlightUrl: newUrl,
                    featuredHighlightTitle: title
                  } : null);
                }}
              />

              {isAthlete ? (
                <>
                  <AthleteStatsView profile={profile} />
                  <GameLogsTable gameLogs={profile.gameLogs} />
                  <MediaHub mediaUrls={profile.mediaUrls} isOwner={isOwner} onAddMedia={handleAddMedia} onRemoveMedia={handleRemoveMedia} />
                </>
              ) : (
                <>
                  <RoleSpecificViews profile={profile} />
                  <MediaHub mediaUrls={profile.mediaUrls} isOwner={isOwner} onAddMedia={handleAddMedia} onRemoveMedia={handleRemoveMedia} />
                </>
              )}
            </>
          )}

          {activeTab === 'stats' && isAthlete && (
            <AthleteStatsView profile={profile} />
          )}

          {activeTab === 'gamelogs' && isAthlete && (
            <GameLogsTable gameLogs={profile.gameLogs} />
          )}

          {activeTab === 'media' && (
            <div className="space-y-6">
              <ProfileHighlights
                profile={profile}
                isOwner={isOwner}
                onHighlightUpdated={(newUrl, title) => {
                  setProfile(prev => prev ? {
                    ...prev,
                    featuredHighlightUrl: newUrl,
                    featuredHighlightTitle: title
                  } : null);
                }}
              />
              <MediaHub mediaUrls={profile.mediaUrls} isOwner={isOwner} onAddMedia={handleAddMedia} onRemoveMedia={handleRemoveMedia} />
            </div>
          )}

          {activeTab === 'role_dossier' && (
            <RoleSpecificViews profile={profile} />
          )}

          {activeTab === 'cheer_matrix' && (
            <CheerMatrix
              userId={profile.uid}
              athleteName={profile.displayName}
              isOwner={isOwner}
            />
          )}

          {activeTab === 'locker' && (
            <PurchasedMediaLocker
              userUid={profile.uid}
              isOwner={isOwner}
            />
          )}

          {activeTab === 'payment_accounts' && isOwner && (
            <div className="bg-[#131B26] border border-white/10 rounded-3xl p-5 sm:p-8 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00E5FF] to-[#0070BA] flex items-center justify-center text-[#0B0F17]">
                  <CreditCard className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">Saved Payment Accounts & Fast Pay</h3>
                  <p className="text-xs text-slate-400 font-mono">Manage linked PayPal, Venmo, credit cards, and express billing profile</p>
                </div>
              </div>

              <SavedPaymentAccountsSection onSaved={() => {
                if (authProfile) setProfile(authProfile);
              }} />
            </div>
          )}
        </div>

      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <EditProfileModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          initialRole={profile.role}
          initialTab={editModalInitialTab}
          onProfileUpdated={(updatedProfile) => {
            setProfile(updatedProfile);
          }}
        />
      )}

      {/* Avatar Picture Upload Modal */}
      {showAvatarModal && (
        <AvatarUploadModal
          isOpen={showAvatarModal}
          onClose={() => setShowAvatarModal(false)}
          currentAvatarUrl={profile.avatarUrl || profile.photoURL}
          userId={profile.uid}
          onAvatarUpdated={(newUrl) => {
            setProfile((p) => (p ? { ...p, avatarUrl: newUrl, photoURL: newUrl } : p));
          }}
        />
      )}

      {/* Direct Message Recruiter Modal */}
      {showDmModal && (
        <CollegeRecruiterDmModal
          isOpen={showDmModal}
          onClose={() => setShowDmModal(false)}
          athlete={profile}
        />
      )}

      {/* NIL Sponsor Pitch-Deck & Media Kit PDF Exporter Modal */}
      {showNilModal && (
        <NilPitchDeckModal
          isOpen={showNilModal}
          onClose={() => setShowNilModal(false)}
          athlete={profile}
        />
      )}

      {/* Recruiter Inquiries & Outreach Hub Modal */}
      {showRecruiterHubModal && (
        <RecruiterInquiriesHubModal
          isOpen={showRecruiterHubModal}
          onClose={() => setShowRecruiterHubModal(false)}
          currentUser={authProfile || profile}
        />
      )}

      {/* Social Connections Modal (Followers & Following) */}
      {showSocialModal && profile && (
        <SocialConnectionsModal
          isOpen={showSocialModal}
          onClose={() => setShowSocialModal(false)}
          userId={profile.uid}
          userName={profile.displayName}
          userRole={profile.role}
          initialTab={socialModalTab}
          onOpenDM={(targetUid, targetName) => {
            setShowSocialModal(false);
            setShowDmModal(true);
          }}
        />
      )}

    </div>
  );
};
