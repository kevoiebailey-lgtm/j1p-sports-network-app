import React, { useState, useEffect } from 'react';
import { doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { BentoCard } from '../BentoCard';
import { AthleteStatsForm } from './AthleteStatsForm';
import { AthleteMediaSection } from './AthleteMediaSection';
import { AthleteHighlightWidget } from '../Dashboard/AthleteHighlightWidget';
import { AthleteGameLogsView } from './AthleteGameLogsView';
import { SeasonPerformanceChart } from './SeasonPerformanceChart';
import { AthletePerformanceRadar } from './AthletePerformanceRadar';
import { ProfilePictureUploader } from './ProfilePictureUploader';
import { AvatarUploadModal } from '../Profile/AvatarUploadModal';
import { StatLoggerModal } from '../Athletes/StatLoggerModal';
import { SportType, SportStats, VideoHighlight, GameStatEntry, PerformanceMetrics } from '../../types';
import { VerifiedBadge } from '../Common/VerifiedBadge';
import { generateAthletePdf } from '../../lib/pdfGenerator';
import { AthleteQrPassCard } from './AthleteQrPassCard';
import { QrCheckInScannerModal } from '../Events/QrCheckInScannerModal';
import { SocialShareCardModal } from './SocialShareCardModal';
import { 
  Trophy, 
  User, 
  MapPin, 
  GraduationCap, 
  Ruler, 
  Weight, 
  Award, 
  Edit3, 
  Share2, 
  Check, 
  Download,
  FileText,
  Instagram, 
  Twitter, 
  Video, 
  Activity, 
  Sparkles, 
  Flame, 
  Zap,
  TrendingUp,
  ShieldCheck,
  Plus,
  BarChart2,
  Camera
} from 'lucide-react';

export const AthleteProfileView: React.FC = () => {
  const { profile, role, updateUserProfile, toggleVerification } = useAuth();
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isShareCardOpen, setIsShareCardOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isStatLoggerOpen, setIsStatLoggerOpen] = useState(false);

  // Athletes and Admins can edit profile stats and video URLs
  const canEdit = role === 'athlete' || role === 'admin';

  // Editable Bio form state
  const [editData, setEditData] = useState({
    displayName: '',
    highSchool: '',
    state: 'NJ',
    gradYear: '2026',
    position: 'Guard',
    height: "6'1\"",
    weight: '180 lbs',
    gpa: '3.8',
    bio: '',
    avatarUrl: '',
    photoURL: '',
    instagram: '',
    twitter: '',
    tiktok: ''
  });

  // Sync editData when profile loads or isEditingBio is opened
  useEffect(() => {
    if (profile) {
      setEditData({
        displayName: profile.displayName || '',
        highSchool: profile.highSchool || '',
        state: profile.state || 'NJ',
        gradYear: profile.gradYear || '2026',
        position: profile.position || 'Guard',
        height: profile.height || "6'1\"",
        weight: profile.weight || '180 lbs',
        gpa: profile.gpa || '3.8',
        bio: profile.bio || '',
        avatarUrl: profile.avatarUrl || profile.photoURL || '',
        photoURL: profile.photoURL || profile.avatarUrl || '',
        instagram: profile.social?.instagram || '',
        twitter: profile.social?.twitter || '',
        tiktok: profile.social?.tiktok || ''
      });
    }
  }, [profile, isEditingBio]);

  if (!profile) return null;

  const handleSaveBio = (e: React.FormEvent) => {
    e.preventDefault();
    const finalPhoto = editData.avatarUrl || editData.photoURL || profile.photoURL || profile.avatarUrl;
    updateUserProfile({
      displayName: editData.displayName,
      highSchool: editData.highSchool,
      state: editData.state,
      gradYear: editData.gradYear,
      position: editData.position,
      height: editData.height,
      weight: editData.weight,
      gpa: editData.gpa,
      bio: editData.bio,
      avatarUrl: finalPhoto,
      photoURL: finalPhoto,
      social: {
        instagram: editData.instagram,
        twitter: editData.twitter,
        tiktok: editData.tiktok
      }
    });
    setIsEditingBio(false);
  };

  const handleSaveStats = (sport: SportType, stats: SportStats) => {
    updateUserProfile({
      sport,
      stats
    });
  };

  const handleSavePerformanceMetrics = (metrics: PerformanceMetrics) => {
    updateUserProfile({
      performanceMetrics: metrics
    });
  };

  const handleUpdateGameLogs = (updatedLogs: GameStatEntry[]) => {
    updateUserProfile({
      gameLogs: updatedLogs
    });
  };

  const handleAddVideo = async (video: VideoHighlight) => {
    const updatedMedia = [video, ...(profile.mediaUrls || [])];
    const updatedHighlightUrls = [video.url, ...(profile.highlightUrls || [])];
    updateUserProfile({
      mediaUrls: updatedMedia,
      highlightUrls: updatedHighlightUrls
    });

    if (profile.uid && db) {
      try {
        const userRef = doc(db, 'users', profile.uid);
        await updateDoc(userRef, {
          highlightUrls: arrayUnion(video.url),
          mediaUrls: arrayUnion(video),
          updatedAt: serverTimestamp()
        });
      } catch (e) {
        console.warn('Error persisting video highlight to Firestore:', e);
      }
    }
  };

  const handleDeleteVideo = async (id: string) => {
    const targetVideo = (profile.mediaUrls || []).find(v => v.id === id);
    const updatedMedia = (profile.mediaUrls || []).filter(v => v.id !== id);
    const updatedHighlightUrls = (profile.highlightUrls || []).filter(u => targetVideo ? u !== targetVideo.url : true);
    
    updateUserProfile({
      mediaUrls: updatedMedia,
      highlightUrls: updatedHighlightUrls
    });

    if (profile.uid && db && targetVideo) {
      try {
        const userRef = doc(db, 'users', profile.uid);
        await updateDoc(userRef, {
          highlightUrls: arrayRemove(targetVideo.url),
          mediaUrls: updatedMedia,
          updatedAt: serverTimestamp()
        });
      } catch (e) {
        console.warn('Error removing video highlight from Firestore:', e);
      }
    }
  };

  const handleShareProfile = () => {
    setIsShareCardOpen(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Headline */}
      <div className="relative rounded-3xl overflow-hidden bg-[#050505] border border-white/10 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#E5B868]/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-[#E5B868] text-black rounded-sm shadow-[0_0_12px_rgba(214,28,36,0.5)]">
                VERIFIED ATHLETE PROFILE
              </span>
              <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-white/5 text-slate-300 border border-white/10 rounded-sm flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-[#E5B868]" />
                D1 ELITE RECRUIT MATRIX
              </span>
              {!canEdit && (
                <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-[#E5B868]/20 text-cyan-300 border border-cyan-500/30 rounded-sm">
                  READ-ONLY RECRUITER VIEW
                </span>
              )}
            </div>
            <h1 className="text-3xl sm:text-5xl font-black italic tracking-tight text-white uppercase font-sans flex items-center gap-3 flex-wrap">
              <span>{profile.displayName}</span>
              {(profile.isVerified ?? true) && (
                <VerifiedBadge size="lg" showLabel />
              )}
              <span className="text-[#E5B868] drop-shadow-[0_0_10px_#E5B868]">.</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1 flex flex-wrap items-center gap-3">
              <span className="text-[#E5B868] font-black uppercase">{profile.sport}</span>
              <span>•</span>
              <span className="font-bold text-slate-200">{profile.position}</span>
              <span>•</span>
              <span>{profile.highSchool} ({profile.state})</span>
              <span>•</span>
              <span className="text-white font-black">CLASS OF {profile.gradYear}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {canEdit && (
              <button
                id="log-game-stats-btn"
                onClick={() => setIsStatLoggerOpen(true)}
                className="min-h-[48px] px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#00B8D4] to-[#00F5D4] text-[#090D16] font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(0,184,212,0.4)] hover:brightness-110 transition-all cursor-pointer"
              >
                <BarChart2 className="w-4 h-4 text-[#090D16]" />
                <span>📊 LOG GAME STATS</span>
              </button>
            )}

            {canEdit && (
              <button
                id="upload-avatar-btn"
                onClick={() => setIsAvatarModalOpen(true)}
                className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-[#263238] hover:bg-[#37474F] text-[#00B8D4] border border-[#00B8D4]/40 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4 text-[#00B8D4]" />
                <span>UPDATE AVATAR</span>
              </button>
            )}

            {canEdit && (
              <button
                onClick={() => {
                  const elem = document.getElementById('game-logs-section');
                  if (elem) {
                    elem.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    setIsEditingBio(true);
                  }
                }}
                className="px-4 py-2.5 rounded-full bg-[#E5B868] hover:bg-[#B8141B] text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(214,28,36,0.5)] cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ ADD GAME STATS</span>
              </button>
            )}

            {canEdit && (
              <button
                onClick={() => {
                  const elem = document.getElementById('video-highlight-section');
                  if (elem) {
                    elem.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    setIsEditingBio(true);
                  }
                }}
                className="px-4 py-2.5 rounded-full bg-[#E5B868]/20 hover:bg-[#E5B868]/30 text-[#E5B868] font-bold text-xs uppercase tracking-wider border border-[#E5B868]/50 flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(214,28,36,0.25)] cursor-pointer"
              >
                <Video className="w-4 h-4 text-[#E5B868]" />
                <span>+ ADD HIGHLIGHT VIDEO</span>
              </button>
            )}

            {canEdit && (
              <button
                onClick={() => setIsEditingBio(!isEditingBio)}
                className="px-4 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider border border-white/10 flex items-center gap-2 transition-all shadow-lg hover:border-[#E5B868]/50 cursor-pointer"
              >
                <Edit3 className="w-4 h-4 text-[#E5B868]" />
                <span>{isEditingBio ? 'CANCEL EDIT' : 'EDIT PROFILE'}</span>
              </button>
            )}

            <button
              onClick={() => generateAthletePdf(profile)}
              className="px-4 py-2.5 rounded-full bg-black/80 hover:bg-black/90 text-white font-bold text-xs uppercase tracking-wider border border-[#E5B868]/50 flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(214,28,36,0.2)] hover:border-[#E5B868] cursor-pointer"
              title="Download official PDF recruiting sheet"
            >
              <Download className="w-4 h-4 text-[#E5B868]" />
              <span>DOWNLOAD RECRUITING SHEET (PDF)</span>
            </button>

            <button
              onClick={handleShareProfile}
              className="px-4 py-2.5 rounded-full bg-[#E5B868] hover:bg-[#B8141B] text-black font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(214,28,36,0.5)] flex items-center gap-2 transition-all cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4 stroke-[3]" /> : <Share2 className="w-4 h-4" />}
              <span>{copiedLink ? 'LINK COPIED!' : 'SHARE MATRIX LINK'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Edit Bio & Profile Form Modal Inline */}
      {isEditingBio && canEdit && (
        <form onSubmit={handleSaveBio} className="backdrop-blur-2xl bg-[#000000]/95 border border-[#E5B868]/40 rounded-3xl p-6 shadow-[0_0_30px_rgba(214,28,36,0.15)] space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-black uppercase text-[#E5B868] tracking-wider flex items-center gap-2">
              <Edit3 className="w-4 h-4" />
              Update Athlete Bio & Physical Vitals
            </h3>
            <span className="text-xs text-slate-400 font-medium">Real-time Recruiter Matrix Sync</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-white/5 rounded-2xl border border-white/10">
            <ProfilePictureUploader
              currentPhotoUrl={editData.avatarUrl || editData.photoURL || profile.photoURL || profile.avatarUrl}
              size="sm"
              onSuccess={(newUrl) => {
                setEditData(prev => ({ ...prev, avatarUrl: newUrl, photoURL: newUrl }));
              }}
            />
            <div className="flex-1 w-full space-y-2">
              <label className="text-[11px] font-bold text-[#E5B868] uppercase block">
                Upload New Profile Picture or Enter Image URL
              </label>
              <input
                type="text"
                value={editData.avatarUrl}
                onChange={(e) => setEditData({ ...editData, avatarUrl: e.target.value, photoURL: e.target.value })}
                className="w-full bg-[#212A31] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#E5B868] focus:outline-none"
                placeholder="https://images.unsplash.com/... or upload photo above"
              />
              <p className="text-[10px] text-slate-400">
                Tip: You can drag & drop an image above or paste a direct web image URL here.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Display Name</label>
              <input
                type="text"
                value={editData.displayName}
                onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
                className="w-full bg-[#212A31] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#E5B868] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">High School / Club</label>
              <input
                type="text"
                value={editData.highSchool}
                onChange={(e) => setEditData({ ...editData, highSchool: e.target.value })}
                className="w-full bg-[#212A31] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#E5B868] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">State Code</label>
              <input
                type="text"
                value={editData.state}
                onChange={(e) => setEditData({ ...editData, state: e.target.value.toUpperCase() })}
                className="w-full bg-[#212A31] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#E5B868] focus:outline-none"
                placeholder="NJ, NY, PA, FL..."
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Graduation Year</label>
              <input
                type="text"
                value={editData.gradYear}
                onChange={(e) => setEditData({ ...editData, gradYear: e.target.value })}
                className="w-full bg-[#212A31] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#E5B868] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Position</label>
              <input
                type="text"
                value={editData.position}
                onChange={(e) => setEditData({ ...editData, position: e.target.value })}
                className="w-full bg-[#212A31] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#E5B868] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Height</label>
              <input
                type="text"
                value={editData.height}
                onChange={(e) => setEditData({ ...editData, height: e.target.value })}
                className="w-full bg-[#212A31] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#E5B868] focus:outline-none"
                placeholder="6'2&quot;"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Weight</label>
              <input
                type="text"
                value={editData.weight}
                onChange={(e) => setEditData({ ...editData, weight: e.target.value })}
                className="w-full bg-[#212A31] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#E5B868] focus:outline-none"
                placeholder="185 lbs"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">GPA</label>
              <input
                type="text"
                value={editData.gpa}
                onChange={(e) => setEditData({ ...editData, gpa: e.target.value })}
                className="w-full bg-[#212A31] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#E5B868] focus:outline-none"
                placeholder="3.8"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Athlete Scouting Bio</label>
            <textarea
              rows={3}
              value={editData.bio}
              onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
              className="w-full bg-[#212A31] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#E5B868] focus:outline-none"
              placeholder="Describe your athletic strengths, work ethic, and academic goals..."
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Instagram @Handle</label>
              <input
                type="text"
                value={editData.instagram}
                onChange={(e) => setEditData({ ...editData, instagram: e.target.value })}
                className="w-full bg-[#212A31] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-[#E5B868] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Twitter @Handle</label>
              <input
                type="text"
                value={editData.twitter}
                onChange={(e) => setEditData({ ...editData, twitter: e.target.value })}
                className="w-full bg-[#212A31] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-[#E5B868] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">TikTok @Handle</label>
              <input
                type="text"
                value={editData.tiktok}
                onChange={(e) => setEditData({ ...editData, tiktok: e.target.value })}
                className="w-full bg-[#212A31] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-[#E5B868] focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[#E5B868] hover:bg-[#B8141B] text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(214,28,36,0.5)] transition-all"
          >
            SAVE ATHLETE PROFILE
          </button>
        </form>
      )}

      {/* ADMIN VERIFICATION MANAGEMENT CONTROL BAR */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-[#E5B868]/10 via-[#000000] to-[#E5B868]/10 border border-[#E5B868]/40 shadow-[0_0_20px_rgba(214,28,36,0.15)] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[#E5B868]/20 border border-[#E5B868]/40 text-[#E5B868]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-black text-white text-xs uppercase tracking-wider">Admin Verification Control System</h4>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[#E5B868] text-black">ADMIN MODE</span>
            </div>
            <p className="text-[11px] text-slate-300">
              Current status: {profile.isVerified !== false ? (
                <span className="text-[#E5B868] font-bold inline-flex items-center gap-1">
                  Verified <VerifiedBadge size="sm" />
                </span>
              ) : (
                <span className="text-amber-400 font-bold">Unverified / Pending</span>
              )}
            </p>
          </div>
        </div>

        <button
          onClick={async () => {
            const nextVal = await toggleVerification(profile.uid);
            alert(`Profile "${profile.displayName}" verification status set to: ${nextVal ? 'VERIFIED' : 'UNVERIFIED'}`);
          }}
          className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-[#E5B868] hover:bg-[#B8141B] text-black font-black text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(214,28,36,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Toggle Verified Badge</span>
        </button>
      </div>

      {/* MODULAR BENTO GRID LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Athlete Vitals & Bio Card (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <BentoCard
            title="Athlete Profile & Vitals"
            icon={<User className="w-5 h-5 text-[#E5B868]" />}
            glow
          >
            <div className="flex flex-col items-center text-center pb-4 border-b border-white/10">
              <div className="relative mb-3 flex flex-col items-center">
                {canEdit ? (
                  <ProfilePictureUploader
                    currentPhotoUrl={profile.photoURL || profile.avatarUrl}
                    size="md"
                    onSuccess={(newUrl) => {
                      updateUserProfile({ photoURL: newUrl, avatarUrl: newUrl });
                    }}
                  />
                ) : (
                  <div className="relative">
                    <img
                      src={profile.photoURL || profile.avatarUrl || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&auto=format&fit=crop&q=80'}
                      alt={profile.displayName}
                      className="w-28 h-28 rounded-full object-cover border-2 border-[#E5B868] shadow-[0_0_25px_rgba(214,28,36,0.4)]"
                    />
                  </div>
                )}
                <span className="mt-2 px-2.5 py-0.5 text-[9px] font-black uppercase bg-[#E5B868] text-black rounded-full shadow font-sans tracking-wider">
                  {profile.sport}
                </span>
              </div>
              <h3 className="text-lg font-black text-white flex items-center justify-center gap-1.5 mt-1">
                <span>{profile.displayName}</span>
                {(profile.isVerified ?? true) && <VerifiedBadge size="sm" />}
              </h3>
              <p className="text-xs text-slate-400 font-medium">{profile.highSchool} • {profile.state}</p>
            </div>

            {/* Vitals Grid */}
            <div className="grid grid-cols-2 gap-2 my-4">
              <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">
                  <Ruler className="w-3 h-3 text-[#E5B868]" /> Height
                </p>
                <p className="text-sm font-black text-white font-mono mt-0.5">{profile.height || "6'1\""}</p>
              </div>

              <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">
                  <Weight className="w-3 h-3 text-[#E5B868]" /> Weight
                </p>
                <p className="text-sm font-black text-white font-mono mt-0.5">{profile.weight || "180 lbs"}</p>
              </div>

              <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">
                  <GraduationCap className="w-3 h-3 text-[#E5B868]" /> Class
                </p>
                <p className="text-sm font-black text-white font-mono mt-0.5">{profile.gradYear}</p>
              </div>

              <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">
                  <Award className="w-3 h-3 text-[#E5B868]" /> GPA
                </p>
                <p className="text-sm font-black text-[#E5B868] font-mono mt-0.5">{profile.gpa || "3.8"}</p>
              </div>
            </div>

            {/* Bio text */}
            <div className="bg-white/5 p-3 rounded-2xl border border-white/10 mb-4">
              <p className="text-[10px] font-black text-[#E5B868] uppercase mb-1">Scouting Report</p>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                "{profile.bio}"
              </p>
            </div>

            {/* Social handles */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Social Media Handles</span>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                {profile.social?.instagram && (
                  <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-slate-300 flex items-center gap-1.5">
                    <Instagram className="w-3.5 h-3.5 text-slate-300" />
                    {profile.social.instagram}
                  </span>
                )}
                {profile.social?.twitter && (
                  <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-slate-300 flex items-center gap-1.5">
                    <Twitter className="w-3.5 h-3.5 text-sky-400" />
                    {profile.social.twitter}
                  </span>
                )}
                {profile.social?.tiktok && (
                  <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-slate-300 flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-[#E5B868]" />
                    {profile.social.tiktok}
                  </span>
                )}
              </div>
            </div>
          </BentoCard>

          {/* ATHLETE DIGITAL CHECK-IN QR PASS CARD */}
          <AthleteQrPassCard
            profile={profile}
            onOpenScanner={() => setIsScannerOpen(true)}
          />

          {/* Analytics KPI Radar Bento Card */}
          <BentoCard
            title="Recruiting Analytics KPI"
            subtitle="Calculated performance indexes"
            icon={<TrendingUp className="w-5 h-5 text-[#E5B868]" />}
          >
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-300">Scouting Efficiency Index</span>
                  <span className="text-[#E5B868] font-mono">94 / 100</span>
                </div>
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/10">
                  <div className="bg-[#E5B868] h-full w-[94%] shadow-[0_0_10px_#E5B868]"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-300">Positional Athletic Rating</span>
                  <span className="text-[#E5B868] font-mono">91 / 100</span>
                </div>
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/10">
                  <div className="bg-[#E5B868] h-full w-[91%] shadow-[0_0_10px_#E5B868]"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-300">Academic Eligibility Matrix</span>
                  <span className="text-[#E5B868] font-mono">NCAA D1 Qualifier</span>
                </div>
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/10">
                  <div className="bg-[#E5B868] h-full w-[98%] shadow-[0_0_10px_#E5B868]"></div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#E5B868]/10 border border-[#E5B868]/20 text-[#E5B868] text-xs font-bold flex items-center gap-2">
                <Flame className="w-4 h-4 shrink-0 text-[#E5B868]" />
                <span>Ranked Top 5% among Class of {profile.gradYear} {profile.sport} Prospects in {profile.state}.</span>
              </div>
            </div>
          </BentoCard>
        </div>

        {/* RIGHT COLUMN: Multi-Sport Stats Engine, Game Stat Logs & Video Highlights (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* COMPONENT RADAR: Athletic Performance Combine Radar Chart */}
          <AthletePerformanceRadar
            athlete={profile}
            canEdit={canEdit}
            onSaveMetrics={handleSavePerformanceMetrics}
          />

          {/* COMPONENT A: Visual Recharts Season Performance Analytics Chart */}
          <BentoCard
            title="Season Performance Chart (Recharts)"
            subtitle="Interactive game-by-game performance trajectory and statistical progression"
            icon={<TrendingUp className="w-5 h-5 text-[#E5B868]" />}
            glow
          >
            <SeasonPerformanceChart
              athleteUid={profile.uid}
              initialGameLogs={profile.gameLogs || []}
              currentSport={profile.sport}
            />
          </BentoCard>

          {/* COMPONENT B: Game-by-Game Stat Submission & Log Engine */}
          <div id="game-logs-section">
            <BentoCard
              title="Game-by-Game Performance Log"
              subtitle={canEdit ? "Log individual game stats and build your verified scouting log" : "Verified per-game performance records"}
              icon={<Trophy className="w-5 h-5 text-[#E5B868]" />}
              glow
            >
              <AthleteGameLogsView
                athlete={profile}
                canEdit={canEdit}
                onUpdateGameLogs={handleUpdateGameLogs}
              />
            </BentoCard>
          </div>

          {/* COMPONENT B: Multi-Sport Stats Input & Display Engine */}
          <BentoCard
            title="Season Averages & Metrics Summary"
            subtitle={canEdit ? "Input and update overall season averages" : "Verified season performance statistics"}
            icon={<Activity className="w-5 h-5 text-[#E5B868]" />}
          >
            <AthleteStatsForm
              currentSport={profile.sport}
              currentStats={profile.stats}
              onSaveStats={handleSaveStats}
            />
          </BentoCard>

          {/* COMPONENT C: Member Highlight Video Reel Section */}
          <div id="video-highlight-section" className="space-y-4">
            <AthleteHighlightWidget
              athleteId={profile.uid || (profile as any).id}
              athlete={profile}
              showViewAllLink={false}
            />
            <BentoCard
              title="Login Member Video Highlight Reel"
              subtitle={canEdit ? "Embed YouTube, Hudl, Instagram or upload video file highlights" : "Official scouting video highlight reel"}
              icon={<Video className="w-5 h-5 text-[#E5B868]" />}
              glow
            >
              <AthleteMediaSection
                mediaUrls={profile.mediaUrls || []}
                onAddVideo={handleAddVideo}
                onDeleteVideo={handleDeleteVideo}
                isOwner={canEdit}
              />
            </BentoCard>
          </div>

        </div>
      </div>

      {/* BRANDED RECRUIT SOCIAL SHARE CARD MODAL */}
      <SocialShareCardModal
        isOpen={isShareCardOpen}
        onClose={() => setIsShareCardOpen(false)}
        profile={profile}
      />

      {/* QR CHECK-IN SCANNER MODAL */}
      <QrCheckInScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />

      {/* PLATFORM LINKS & LEGAL POLICIES ACCORDION (MOBILE-ACCESSIBLE FOOTER ALTERNATIVE) */}
      <div className="mt-8 pt-8 border-t border-white/10">
        <details className="group rounded-3xl bg-gradient-to-r from-[#212A31]/80 via-[#212A31]/70 to-[#212A31]/80 backdrop-blur-2xl border border-white/15 p-5 transition-all">
          <summary className="flex items-center justify-between font-black uppercase text-xs text-white tracking-wider cursor-pointer list-none select-none">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#E5B868]" />
              <span>Just1Play Platform Links &amp; Legal Policies</span>
            </div>
            <span className="text-[#E5B868] group-open:rotate-180 transition-transform">▼</span>
          </summary>

          <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono text-slate-300">
            <div>
              <h4 className="font-bold text-white uppercase mb-2 text-[11px] text-[#E5B868]">Platform</h4>
              <ul className="space-y-1.5 text-slate-400 text-[11px]">
                <li><a href="#about" className="hover:text-white transition-colors">About Just1Play</a></li>
                <li><a href="#matrix" className="hover:text-white transition-colors">Recruiter Matrix</a></li>
                <li><a href="#brackets" className="hover:text-white transition-colors">Tournament Brackets</a></li>
                <li><a href="#media" className="hover:text-white transition-colors">4K Videography</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white uppercase mb-2 text-[11px] text-[#E5B868]">Resources</h4>
              <ul className="space-y-1.5 text-slate-400 text-[11px]">
                <li><a href="#faq" className="hover:text-white transition-colors">Scouting FAQ</a></li>
                <li><a href="#ncaa" className="hover:text-white transition-colors">NCAA Eligibility Guide</a></li>
                <li><a href="#support" className="hover:text-white transition-colors">Support &amp; Help Desk</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Media Packages</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white uppercase mb-2 text-[11px] text-[#E5B868]">Legal &amp; Safety</h4>
              <ul className="space-y-1.5 text-slate-400 text-[11px]">
                <li><a href="#privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#terms" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#copa" className="hover:text-white transition-colors">Youth Data Safety</a></li>
                <li><a href="#verified" className="hover:text-white transition-colors">Verified Badge Rules</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white uppercase mb-2 text-[11px] text-[#E5B868]">Contact Operations</h4>
              <ul className="space-y-1.5 text-slate-400 text-[11px]">
                <li><span className="text-white">Leadership:</span> Kevoie Bailey, CEO</li>
                <li><span className="text-white">Phone:</span> <a href="tel:2012069097" className="hover:text-[#DFAE1D] text-slate-300">201-206-9097</a></li>
                <li><span className="text-white">Email:</span> <a href="mailto:just1playscouts@gmail.com" className="hover:text-[#DFAE1D] text-slate-300">just1playscouts@gmail.com</a></li>
                <li><span className="text-white">Region:</span> Tri-State (NJ / NY / PA)</li>
              </ul>
            </div>
          </div>
        </details>
      </div>

      {/* Profile Avatar Upload Modal */}
      <AvatarUploadModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        currentAvatarUrl={profile.photoURL || profile.avatarUrl}
        onAvatarUpdated={(newUrl) => {
          updateUserProfile({ photoURL: newUrl, avatarUrl: newUrl });
        }}
      />

      {/* Universal Multi-Sport Stat Logger Modal */}
      <StatLoggerModal
        isOpen={isStatLoggerOpen}
        onClose={() => setIsStatLoggerOpen(false)}
        defaultSport={profile.sport || 'basketball'}
        athleteId={profile.uid}
      />
    </div>
  );
};
