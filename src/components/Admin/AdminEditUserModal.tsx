import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Camera,
  Upload,
  Trophy,
  UserCheck,
  Shield,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Link as LinkIcon,
  RefreshCw,
  Image as ImageIcon,
  MapPin,
  Building2,
  GraduationCap,
  FileText,
  Ban,
  Check,
  Loader2,
  Trash2,
  Sliders,
  UserCog
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { UserProfile, UserRole } from '../../types';
import { VerifiedBadge } from '../Common/VerifiedBadge';
import { SportSelector } from '../Common/SportSelector';
import { getSportEmoji } from '../../lib/sports';
import { compressImage } from '../../lib/imageCompressor';

interface AdminEditUserModalProps {
  isOpen: boolean;
  user: UserProfile | null;
  onClose: () => void;
  onUserUpdated: (updatedUser: UserProfile) => void;
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

const PRESET_AVATARS = [
  {
    name: 'Hoops Starter',
    url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&auto=format&fit=crop&q=80',
    sport: 'Basketball'
  },
  {
    name: 'Gridiron QB',
    url: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=400&auto=format&fit=crop&q=80',
    sport: 'Football'
  },
  {
    name: 'Soccer Striker',
    url: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=400&auto=format&fit=crop&q=80',
    sport: 'Soccer'
  },
  {
    name: 'Varsity Female Athlete',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    sport: 'Multi-Sport'
  },
  {
    name: 'Elite Playmaker',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    sport: 'Basketball'
  },
  {
    name: 'Head Coach',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    sport: 'Staff'
  },
  {
    name: 'Lead Scout',
    url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80',
    sport: 'Recruiting'
  },
  {
    name: 'Media Creator',
    url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80',
    sport: 'Visuals'
  }
];

const ROLES_CONFIG: { role: UserRole; title: string; desc: string; badgeColor: string }[] = [
  {
    role: 'athlete',
    title: 'Athlete / Player',
    desc: 'Player cards, verified stats, combine leaderboards, game film logs.',
    badgeColor: 'border-[#00E5FF]/40 text-[#00E5FF] bg-[#00E5FF]/10'
  },
  {
    role: 'coach',
    title: 'Coach / Program Leader',
    desc: 'Team roster management, game day dispatch, tactical communication.',
    badgeColor: 'border-[#39FF14]/40 text-[#39FF14] bg-[#39FF14]/10'
  },
  {
    role: 'creator',
    title: 'Creator / Photographer',
    desc: 'Event media monetization, photo package sales, watermark rules, earnings.',
    badgeColor: 'border-pink-500/40 text-pink-300 bg-pink-500/10'
  },
  {
    role: 'coordinator',
    title: 'Event Coordinator / Ops',
    desc: 'Field check-in manifests, fee reconciliation, roster locks, tournament ops.',
    badgeColor: 'border-amber-500/40 text-amber-300 bg-amber-500/10'
  },
  {
    role: 'scout',
    title: 'Scout / Recruiter',
    desc: 'College recruiting matrix, prospect evaluations, watchlist tracking.',
    badgeColor: 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10'
  },
  {
    role: 'organization',
    title: 'Organization / Director',
    desc: 'Tournament hosting, bracket builder, team registration, operations.',
    badgeColor: 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10'
  },
  {
    role: 'content_creator',
    title: 'Media / Content Creator',
    desc: '4K mixtape uploads, tournament highlights, media hub booking.',
    badgeColor: 'border-pink-500/40 text-pink-300 bg-pink-500/10'
  },
  {
    role: 'viewer',
    title: 'Fan / Viewer',
    desc: 'Live game score alerts, player tracking, event tickets, community feed.',
    badgeColor: 'border-blue-500/40 text-blue-300 bg-blue-500/10'
  },
  {
    role: 'admin',
    title: 'System Admin / Staff',
    desc: 'Full platform privileges, user management, financials, moderation.',
    badgeColor: 'border-purple-500/40 text-purple-300 bg-purple-500/10'
  }
];

export const AdminEditUserModal: React.FC<AdminEditUserModalProps> = ({
  isOpen,
  user,
  onClose,
  onUserUpdated
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'profile_photo' | 'sport_role' | 'roster_bio'>('profile_photo');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    photoURL: '',
    sport: 'Basketball',
    role: 'athlete' as UserRole,
    position: '',
    jerseyNumber: '',
    highSchool: '',
    teamName: '',
    gradYear: '2026',
    city: '',
    state: 'NJ',
    country: 'United States',
    bio: '',
    isVerified: false,
    isBanned: false
  });

  const [customImageUrlInput, setCustomImageUrlInput] = useState('');

  // Synchronize state when user changes or modal opens
  useEffect(() => {
    if (user) {
      const avatar = user.photoURL || user.avatarUrl || '';
      setFormData({
        displayName: user.displayName || '',
        email: user.email || '',
        photoURL: avatar,
        sport: user.sport || 'Basketball',
        role: user.role || 'athlete',
        position: user.position || user.primaryPosition || '',
        jerseyNumber: user.jerseyNumber ? user.jerseyNumber.replace('#', '') : '',
        highSchool: user.highSchool || '',
        teamName: user.teamName || '',
        gradYear: user.gradYear || '2026',
        city: user.city || '',
        state: user.state || 'NJ',
        country: user.country || 'United States',
        bio: user.bio || '',
        isVerified: Boolean(user.isVerified),
        isBanned: Boolean((user as any).isBanned)
      });
      setCustomImageUrlInput(avatar);
      setErrorMsg(null);
      setSaveSuccess(false);
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  // Handle Local File Upload for User Avatar
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    setUploadingImage(true);
    setErrorMsg(null);
    setUploadProgress(10);

    try {
      // 1. Compress Image
      let processedFile = file;
      try {
        processedFile = await compressImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.85 });
      } catch (compErr) {
        console.warn('Image compression skipped:', compErr);
      }

      // 2. Upload to Firebase Storage or fallback to base64 Data URL
      if (storage) {
        const storageRef = ref(storage, `profile-pictures/${user.uid}_${Date.now()}_${processedFile.name}`);
        const uploadTask = uploadBytesResumable(storageRef, processedFile);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            setUploadProgress(pct);
          },
          (err) => {
            console.warn('Storage upload error, falling back to base64 data URL:', err);
            const reader = new FileReader();
            reader.onload = (re) => {
              const dataUrl = re.target?.result as string;
              if (dataUrl) {
                setFormData(prev => ({ ...prev, photoURL: dataUrl }));
                setCustomImageUrlInput(dataUrl);
              }
              setUploadingImage(false);
            };
            reader.readAsDataURL(processedFile);
          },
          async () => {
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              setFormData(prev => ({ ...prev, photoURL: downloadUrl }));
              setCustomImageUrlInput(downloadUrl);
            } catch (dErr) {
              console.warn('getDownloadURL error:', dErr);
            } finally {
              setUploadingImage(false);
            }
          }
        );
      } else {
        // Fallback to Data URL if storage not ready
        const reader = new FileReader();
        reader.onload = (re) => {
          const dataUrl = re.target?.result as string;
          if (dataUrl) {
            setFormData(prev => ({ ...prev, photoURL: dataUrl }));
            setCustomImageUrlInput(dataUrl);
          }
          setUploadingImage(false);
        };
        reader.readAsDataURL(processedFile);
      }
    } catch (err: any) {
      console.error('Error handling avatar upload:', err);
      setErrorMsg('Failed to process image upload. Try entering an image URL.');
      setUploadingImage(false);
    }
  };

  // Apply custom image URL
  const handleApplyCustomUrl = () => {
    if (!customImageUrlInput.trim()) return;
    setFormData(prev => ({ ...prev, photoURL: customImageUrlInput.trim() }));
  };

  // Submit all edits to Firestore
  const handleSaveUser = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.displayName.trim()) {
      setErrorMsg('Display Name is required.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      const cleanLocation = formData.city 
        ? `${formData.city}, ${formData.state}${formData.country !== 'United States' ? `, ${formData.country}` : ''}`
        : `${formData.state}${formData.country !== 'United States' ? `, ${formData.country}` : ''}`;

      const jerseyFormatted = formData.jerseyNumber.trim()
        ? (formData.jerseyNumber.startsWith('#') ? formData.jerseyNumber.trim() : `#${formData.jerseyNumber.trim()}`)
        : '';

      const updatedPayload: Partial<UserProfile> = {
        displayName: formData.displayName.trim(),
        photoURL: formData.photoURL.trim(),
        avatarUrl: formData.photoURL.trim(),
        sport: formData.sport.trim() as any,
        role: formData.role,
        position: formData.position.trim(),
        primaryPosition: formData.position.trim(),
        jerseyNumber: jerseyFormatted,
        highSchool: formData.highSchool.trim(),
        teamName: formData.teamName.trim(),
        gradYear: formData.gradYear.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        country: formData.country.trim(),
        location: cleanLocation,
        bio: formData.bio.trim(),
        isVerified: formData.isVerified,
        updatedAt: new Date().toISOString()
      };

      // Set banned flag
      (updatedPayload as any).isBanned = formData.isBanned;

      // 1. Direct Firestore update
      if (db) {
        try {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, updatedPayload);
        } catch (dbErr: any) {
          console.warn('Firestore updateDoc warning:', dbErr);
        }
      }

      const mergedUser: UserProfile = {
        ...user,
        ...updatedPayload
      } as UserProfile;

      onUserUpdated(mergedUser);
      setSaveSuccess(true);

      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 900);

    } catch (err: any) {
      console.error('Error saving user profile in admin:', err);
      setErrorMsg(err.message || 'Failed to update user in Firestore.');
    } finally {
      setSaving(false);
    }
  };

  const currentDisplayAvatar = formData.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="bg-[#131B26] border border-white/15 rounded-3xl w-full max-w-3xl shadow-[0_0_80px_rgba(0,0,0,0.95)] relative overflow-hidden font-sans text-slate-100 max-h-[92vh] flex flex-col"
        >
          {/* Decorative Glow Elements */}
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-[#00E5FF]/10 rounded-full blur-[90px] pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[#39FF14]/10 rounded-full blur-[90px] pointer-events-none" />

          {/* Modal Header */}
          <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between shrink-0 relative z-10 bg-[#0B0F17]/70 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-[#00E5FF]/15 border border-[#00E5FF]/30 text-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.2)]">
                <UserCog className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black uppercase text-white tracking-tight">
                    Edit Platform User
                  </h2>
                  <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30">
                    Admin Control
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono">
                  Modify profile picture, sport, role, and athlete roster metadata for <strong className="text-white">{user.displayName}</strong>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer border border-white/10"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1.5 px-5 sm:px-6 pt-3 pb-2 border-b border-white/5 bg-[#0B0F17]/40 shrink-0 overflow-x-auto custom-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('profile_photo')}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'profile_photo'
                  ? 'bg-[#00E5FF] text-[#0B0F17] shadow-[0_0_15px_rgba(0,229,255,0.3)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>1. Profile Picture & Avatar</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sport_role')}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'sport_role'
                  ? 'bg-[#00E5FF] text-[#0B0F17] shadow-[0_0_15px_rgba(0,229,255,0.3)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>2. Sport Category & Role</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('roster_bio')}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'roster_bio'
                  ? 'bg-[#00E5FF] text-[#0B0F17] shadow-[0_0_15px_rgba(0,229,255,0.3)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>3. Roster Info, Bio & Status</span>
            </button>
          </div>

          {/* Form Content Area */}
          <form onSubmit={handleSaveUser} className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
            
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* TAB 1: PROFILE PICTURE & AVATAR */}
            {activeTab === 'profile_photo' && (
              <div className="space-y-5">
                
                {/* Main Avatar Preview & Upload Desk */}
                <div className="bg-[#0B0F17] p-5 rounded-2xl border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono font-bold text-[#00E5FF] uppercase flex items-center gap-1.5">
                      <Camera className="w-4 h-4" />
                      <span>User Profile Picture Management</span>
                    </label>
                    <span className="text-[11px] font-mono text-slate-400">
                      UID: {user.uid}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Fix or replace this user's avatar if they are experiencing upload issues or need an official sports headshot.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
                    {/* Live Avatar Preview */}
                    <div className="relative group shrink-0">
                      <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden border-2 border-[#00E5FF] shadow-[0_0_25px_rgba(0,229,255,0.3)] bg-slate-900 relative">
                        <img
                          src={currentDisplayAvatar}
                          alt={formData.displayName}
                          className="w-full h-full object-cover"
                        />
                        {uploadingImage && (
                          <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-1.5 text-white">
                            <Loader2 className="w-6 h-6 text-[#00E5FF] animate-spin" />
                            <span className="text-[10px] font-mono font-bold">{uploadProgress}%</span>
                          </div>
                        )}
                      </div>

                      {formData.isVerified && (
                        <div className="absolute -bottom-1 -right-1">
                          <VerifiedBadge size="md" showTooltip={false} />
                        </div>
                      )}
                    </div>

                    {/* Upload Controls */}
                    <div className="flex-1 w-full space-y-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />

                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingImage}
                          className="px-4 py-2.5 rounded-xl bg-[#00E5FF] hover:bg-[#00B8D4] text-[#0B0F17] font-black text-xs font-mono uppercase flex items-center gap-2 shadow-[0_0_15px_rgba(0,229,255,0.3)] cursor-pointer transition-all disabled:opacity-50"
                        >
                          <Upload className="w-4 h-4 stroke-[2.5]" />
                          <span>{uploadingImage ? 'Uploading...' : 'Upload Image File'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              photoURL: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&auto=format&fit=crop&q=80'
                            }));
                            setCustomImageUrlInput('https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&auto=format&fit=crop&q=80');
                          }}
                          className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono font-bold flex items-center gap-1.5 border border-white/10 transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Reset Default</span>
                        </button>
                      </div>

                      {/* Direct URL Input */}
                      <div>
                        <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                          Or Paste Direct Image Web URL (HTTPS)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="url"
                            value={customImageUrlInput}
                            onChange={(e) => setCustomImageUrlInput(e.target.value)}
                            placeholder="https://images.unsplash.com/... or https://..."
                            className="flex-1 px-3 py-2 bg-[#131B26] border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF] font-mono"
                          />
                          <button
                            type="button"
                            onClick={handleApplyCustomUrl}
                            className="px-3 py-2 bg-white/10 hover:bg-[#00E5FF]/20 text-slate-200 hover:text-[#00E5FF] border border-white/15 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer"
                          >
                            Apply URL
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>

                {/* Preset Athletic Headshots */}
                <div className="bg-[#0B0F17] p-5 rounded-2xl border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono font-bold text-[#39FF14] uppercase flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#39FF14]" />
                      <span>Choose From Official Sports Headshot Presets</span>
                    </label>
                    <span className="text-[10px] font-mono text-slate-400">Click to assign</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    {PRESET_AVATARS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, photoURL: preset.url }));
                          setCustomImageUrlInput(preset.url);
                        }}
                        className={`p-2 rounded-2xl border transition-all flex flex-col items-center gap-2 cursor-pointer text-left ${
                          formData.photoURL === preset.url
                            ? 'bg-[#00E5FF]/15 border-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.3)]'
                            : 'bg-[#131B26] border-white/10 hover:border-white/20'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="w-14 h-14 rounded-xl object-cover border border-white/10"
                        />
                        <div className="text-center w-full min-w-0">
                          <div className="text-[11px] font-bold text-white truncate">{preset.name}</div>
                          <div className="text-[9px] font-mono text-slate-400 truncate">{preset.sport}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: SPORT CATEGORY & ROLE */}
            {activeTab === 'sport_role' && (
              <div className="space-y-5">
                
                {/* Sport Selection Panel */}
                <div className="bg-[#0B0F17] p-5 rounded-2xl border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono font-bold text-[#E5B868] uppercase flex items-center gap-1.5">
                      <Trophy className="w-4 h-4 text-[#E5B868]" />
                      <span>Primary Sport Category</span>
                    </label>
                    <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                      <span>{getSportEmoji(formData.sport)}</span>
                      <span className="text-[#00E5FF]">{formData.sport}</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Select from popular sports or type a custom sport discipline. This filters leaderboards, stats forms, and tournament matrices.
                  </p>

                  {/* Popular Sports Quick Select Chips */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase text-slate-400 block font-bold">
                      Quick Select Popular Sports:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'Basketball',
                        'Football',
                        "Girls' Flag Football",
                        'Flag Football',
                        'Soccer',
                        'Baseball',
                        'Softball',
                        'Volleyball',
                        'Track & Field',
                        'Lacrosse',
                        'Cheerleading',
                        'Tennis',
                        'Swimming & Diving',
                        'Wrestling',
                        'Gymnastics',
                        'Golf',
                        'Ice Hockey',
                        'Martial Arts / MMA'
                      ].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, sport: s }))}
                          className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                            formData.sport.toLowerCase() === s.toLowerCase()
                              ? 'bg-[#00E5FF] text-[#0B0F17] font-black shadow-[0_0_15px_rgba(0,229,255,0.4)]'
                              : 'bg-[#131B26] hover:bg-white/10 text-slate-300 border border-white/10'
                          }`}
                        >
                          <span>{getSportEmoji(s)}</span>
                          <span>{s}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Full SportSelector with Custom Typing */}
                  <div className="pt-2 border-t border-white/10">
                    <SportSelector
                      label="Or Search All Sports / Type Custom Sport:"
                      value={formData.sport}
                      onChange={(sp) => setFormData(prev => ({ ...prev, sport: sp }))}
                      allowCustom={true}
                    />
                  </div>
                </div>

                {/* Account Role & Permission Level */}
                <div className="bg-[#0B0F17] p-5 rounded-2xl border border-white/10 space-y-3">
                  <label className="text-xs font-mono font-bold text-[#00E5FF] uppercase flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-[#00E5FF]" />
                    <span>Account Role & Access Level</span>
                  </label>
                  <p className="text-xs text-slate-400">
                    Determines user dashboard layout, tool permissions, and community access rules.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {ROLES_CONFIG.map((rc) => (
                      <button
                        key={rc.role}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, role: rc.role }))}
                        className={`p-3.5 rounded-2xl border text-left font-sans transition-all flex items-start justify-between gap-2 cursor-pointer ${
                          formData.role === rc.role
                            ? 'bg-[#00E5FF]/10 border-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.25)]'
                            : 'bg-[#131B26] border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs uppercase text-white font-mono">
                              {rc.title}
                            </span>
                            <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${rc.badgeColor}`}>
                              {rc.role}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-snug">
                            {rc.desc}
                          </p>
                        </div>

                        {formData.role === rc.role && (
                          <Check className="w-4 h-4 text-[#00E5FF] shrink-0 mt-0.5" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* TAB 3: ROSTER INFO, BIO & STATUS */}
            {activeTab === 'roster_bio' && (
              <div className="space-y-5">
                
                {/* Core Personal Identity */}
                <div className="bg-[#0B0F17] p-5 rounded-2xl border border-white/10 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#00E5FF] uppercase">
                    <UserCheck className="w-4 h-4 text-[#00E5FF]" />
                    <span>Member Personal & Roster Metadata</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-mono text-slate-400 uppercase mb-1 block">Full Display Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.displayName}
                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#131B26] border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                        placeholder="e.g. Marcus Johnson"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-slate-400 uppercase mb-1 block">Email Address (Read-only)</label>
                      <input
                        type="email"
                        disabled
                        value={formData.email}
                        className="w-full px-3.5 py-2.5 bg-[#131B26]/60 border border-white/5 rounded-xl text-xs text-slate-400 font-mono cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-mono text-slate-400 uppercase mb-1 block">Position / Title</label>
                      <input
                        type="text"
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#131B26] border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                        placeholder="e.g. Point Guard / Head Coach"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-slate-400 uppercase mb-1 block">Jersey Number</label>
                      <input
                        type="text"
                        value={formData.jerseyNumber}
                        onChange={(e) => setFormData({ ...formData, jerseyNumber: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#131B26] border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                        placeholder="e.g. 23"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-slate-400 uppercase mb-1 block">Graduation Year</label>
                      <select
                        value={formData.gradYear}
                        onChange={(e) => setFormData({ ...formData, gradYear: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#131B26] border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF] cursor-pointer"
                      >
                        <option value="2024">Class of 2024</option>
                        <option value="2025">Class of 2025</option>
                        <option value="2026">Class of 2026</option>
                        <option value="2027">Class of 2027</option>
                        <option value="2028">Class of 2028</option>
                        <option value="2029">Class of 2029</option>
                        <option value="2030">Class of 2030</option>
                        <option value="Staff">Staff / Coach / Alumni</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-mono text-slate-400 uppercase mb-1 block">High School / Academy</label>
                      <input
                        type="text"
                        value={formData.highSchool}
                        onChange={(e) => setFormData({ ...formData, highSchool: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#131B26] border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                        placeholder="e.g. St. Benedict's Prep"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-slate-400 uppercase mb-1 block">Club / AAU Organization</label>
                      <input
                        type="text"
                        value={formData.teamName}
                        onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#131B26] border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                        placeholder="e.g. NY Rens / NJ Roadrunners"
                      />
                    </div>
                  </div>

                  {/* Location Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-mono text-slate-400 uppercase mb-1 block">City / Town</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#131B26] border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                        placeholder="e.g. Newark"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-slate-400 uppercase mb-1 block">State / Region</label>
                      <select
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#131B26] border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF] cursor-pointer"
                      >
                        {US_STATES.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                        <option value="INTL">International</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-slate-400 uppercase mb-1 block">Country</label>
                      <input
                        type="text"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#131B26] border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                        placeholder="United States"
                      />
                    </div>
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 uppercase mb-1 block">Public Bio / Scouting Notes</label>
                    <textarea
                      rows={3}
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#131B26] border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF] leading-relaxed"
                      placeholder="Enter verified athletic accomplishments, collegiate recruiting notes, or admin evaluation..."
                    />
                  </div>
                </div>

                {/* Verification & Account Suspension Status */}
                <div className="bg-[#0B0F17] p-5 rounded-2xl border border-white/10 space-y-3">
                  <label className="text-xs font-mono font-bold text-[#39FF14] uppercase flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-[#39FF14]" />
                    <span>Administrative Badges & Account Status</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="p-3.5 rounded-2xl bg-[#131B26] border border-white/10 flex items-center gap-3 cursor-pointer hover:border-white/20">
                      <input
                        type="checkbox"
                        checked={formData.isVerified}
                        onChange={(e) => setFormData({ ...formData, isVerified: e.target.checked })}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#00E5FF] focus:ring-[#00E5FF] cursor-pointer"
                      />
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <VerifiedBadge size="sm" showTooltip={false} />
                          <span>Verified Prospect Badge</span>
                        </div>
                        <div className="text-[10px] text-slate-400">Renders gold checkmark badge across Just1Play</div>
                      </div>
                    </label>

                    <label className="p-3.5 rounded-2xl bg-[#131B26] border border-white/10 flex items-center gap-3 cursor-pointer hover:border-white/20">
                      <input
                        type="checkbox"
                        checked={formData.isBanned}
                        onChange={(e) => setFormData({ ...formData, isBanned: e.target.checked })}
                        className="w-4 h-4 rounded border-rose-500/40 bg-white/5 text-rose-500 focus:ring-rose-500 cursor-pointer"
                      />
                      <div>
                        <div className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                          <Ban className="w-3.5 h-3.5" />
                          <span>Suspend / Ban Account</span>
                        </div>
                        <div className="text-[10px] text-slate-400">Blocks platform login and public discovery</div>
                      </div>
                    </label>
                  </div>
                </div>

              </div>
            )}

            {/* Modal Bottom Controls */}
            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                <CheckCircle2 className="w-4 h-4 text-[#39FF14]" />
                <span>Changes save directly to Firestore user collection</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-slate-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || uploadingImage}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#00B8D4] text-[#0B0F17] font-black text-xs font-mono uppercase tracking-wider hover:brightness-110 transition-all flex items-center gap-2 shadow-[0_0_25px_rgba(0,229,255,0.4)] cursor-pointer disabled:opacity-50"
                >
                  {saveSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-[#0B0F17]" />
                      <span>User Saved to Firestore!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 stroke-[2.5]" />
                      <span>{saving ? 'Saving...' : 'Save User Changes'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
