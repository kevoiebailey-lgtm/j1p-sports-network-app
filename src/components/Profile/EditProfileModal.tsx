import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  MapPin,
  FileText,
  Share2,
  Instagram,
  Twitter,
  Youtube,
  Globe,
  Save,
  CheckCircle2,
  AlertCircle,
  Wand2,
  User,
  ShieldCheck,
  Building2,
  GraduationCap,
  Trophy,
  Activity,
  Video,
  ExternalLink,
  Eye,
  Sliders,
  Check,
  RefreshCw,
  HelpCircle,
  AtSign,
  CreditCard
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { UserProfile, UserRole, SocialHandles } from '../../types';
import { RoleAvatar } from '../Common/RoleAvatar';
import { ProfilePictureUploader } from '../AthleteProfile/ProfilePictureUploader';
import { SavedPaymentAccountsSection } from './SavedPaymentAccountsSection';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated?: (updatedProfile: UserProfile) => void;
  initialRole?: UserRole;
  initialTab?: 'bio_info' | 'location' | 'socials' | 'preview' | 'payment_accounts';
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  onProfileUpdated,
  initialRole,
  initialTab = 'bio_info'
}) => {
  const { user, profile, role: authRole, updateUserProfile } = useAuth();
  const { showToast } = useToast();

  const activeRole: UserRole = initialRole || profile?.role || authRole || 'athlete';

  const [activeTab, setActiveTab] = useState<'bio_info' | 'location' | 'socials' | 'preview' | 'payment_accounts'>(initialTab);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    displayName: '',
    photoURL: '',
    avatarUrl: '',
    sport: 'Basketball',
    role: activeRole,
    
    // Bio
    bio: '',
    
    // Location Fields
    city: '',
    state: 'NJ',
    country: 'United States',
    location: '',
    highSchool: '',
    teamName: '',
    
    // Athlete specific
    position: 'Guard',
    primaryPosition: 'Guard',
    jerseyNumber: '',
    gradYear: '2026',
    height: "6'1\"",
    weight: '180 lbs',
    gpa: '3.8',
    
    // Coach/Scout specific
    coachingPhilosophy: '',
    orgAffiliation: '',
    scoutingRegion: '',
    recruitingFocus: '',
    
    // Social Media Links & Handles
    instagram: '',
    twitter: '',
    x: '',
    youtube: '',
    tiktok: '',
    hudl: '',
    linkedin: '',
    website: ''
  });

  // Populate state on load or profile change
  useEffect(() => {
    if (profile) {
      const social = profile.social || {};
      const stateVal = profile.state || 'NJ';
      const cityVal = profile.city || '';
      const countryVal = profile.country || 'United States';
      const formattedLocation = profile.location || (cityVal ? `${cityVal}, ${stateVal}` : stateVal);

      setFormData({
        displayName: profile.displayName || '',
        photoURL: profile.photoURL || profile.avatarUrl || '',
        avatarUrl: profile.avatarUrl || profile.photoURL || '',
        sport: profile.sport || 'Basketball',
        role: profile.role || activeRole,
        
        bio: profile.bio || '',
        
        city: cityVal,
        state: stateVal,
        country: countryVal,
        location: formattedLocation,
        highSchool: profile.highSchool || '',
        teamName: profile.teamName || '',
        
        position: profile.position || profile.primaryPosition || 'Guard',
        primaryPosition: profile.primaryPosition || profile.position || 'Guard',
        jerseyNumber: profile.jerseyNumber || '',
        gradYear: profile.gradYear || '2026',
        height: profile.height || "6'1\"",
        weight: profile.weight || '180 lbs',
        gpa: profile.gpa || '3.8',
        
        coachingPhilosophy: profile.coachingPhilosophy || '',
        orgAffiliation: profile.orgAffiliation || '',
        scoutingRegion: profile.scoutingRegion || '',
        recruitingFocus: profile.recruitingFocus || '',
        
        instagram: social.instagram || '',
        twitter: social.twitter || social.x || '',
        x: social.x || social.twitter || '',
        youtube: social.youtube || '',
        tiktok: social.tiktok || '',
        hudl: social.hudl || '',
        linkedin: social.linkedin || '',
        website: social.website || ''
      });
    }
  }, [profile, isOpen, activeRole]);

  if (!isOpen) return null;

  // AI & Fast Bio Generator Templates
  const applyBioTemplate = (variant: 'collegiate' | 'leadership' | 'development' | 'custom') => {
    let generated = '';
    const pos = formData.position || formData.primaryPosition || 'Athlete';
    const school = formData.highSchool || formData.teamName || 'High School';
    const year = formData.gradYear || '2026';
    const cityState = formData.city ? `${formData.city}, ${formData.state}` : formData.state;

    if (activeRole === 'athlete') {
      if (variant === 'collegiate') {
        generated = `Class of ${year} ${pos} representing ${school} (${cityState}). Dedicated two-way playmaker with a relentless motor, high basketball IQ, and commitment to academic excellence (${formData.gpa || '3.8'} GPA). Driven to make an immediate impact at the collegiate level.`;
      } else if (variant === 'leadership') {
        generated = `Varsity team captain and ${pos} for ${school}. Known for perimeter lockdown defense, court vision, and locker-room leadership. Focused on championship execution and daily skill elevation.`;
      } else {
        generated = `Multi-sport student-athlete based in ${cityState}. Competing for ${school} with aspirations to compete at NCAA Division I / II. Always in the gym perfecting my craft.`;
      }
    } else if (activeRole === 'coach') {
      const org = formData.orgAffiliation || formData.teamName || 'Varsity Basketball Program';
      generated = `Head Coach at ${org} (${cityState}). Dedicated to developing high-character student-athletes through disciplined defense, offensive spacing, and collegiate recruitment placement.`;
    } else if (activeRole === 'scout') {
      const reg = formData.scoutingRegion || formData.state || 'National Circuit';
      generated = `NCAA accredited scouting evaluator based in ${cityState} covering ${reg}. Specializing in grassroots talent identification, video breakdowns, and recruitment pathways for prospective student-athletes.`;
    } else if (activeRole === 'creator') {
      generated = `Sports videographer & visual storyteller based in ${cityState}. Producing high-impact game mixtapes, athlete profile features, and 4K tournament highlight reels.`;
    } else {
      generated = `Passionate sports enthusiast & verified member of Just1Play from ${cityState}. Following top prospects and tournament action across the nation.`;
    }

    setFormData(prev => ({ ...prev, bio: generated }));
    showToast('success', 'Bio Template Applied', 'Generated a tailored athletic bio. You can customize it further.');
  };

  // Helper to format social links cleanly
  const formatSocialInput = (val: string, platform: 'instagram' | 'twitter' | 'tiktok') => {
    return val.trim();
  };

  // Save changes to Firestore
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSaving(true);

    try {
      const cleanLocation = formData.city 
        ? `${formData.city}, ${formData.state}${formData.country !== 'United States' ? `, ${formData.country}` : ''}`
        : `${formData.state}${formData.country !== 'United States' ? `, ${formData.country}` : ''}`;

      const socialHandles: SocialHandles = {
        instagram: formData.instagram.trim(),
        twitter: formData.twitter.trim() || formData.x.trim(),
        x: formData.x.trim() || formData.twitter.trim(),
        youtube: formData.youtube.trim(),
        tiktok: formData.tiktok.trim(),
        hudl: formData.hudl.trim(),
        linkedin: formData.linkedin.trim(),
        website: formData.website.trim()
      };

      const updatedPayload: Partial<UserProfile> = {
        displayName: formData.displayName.trim() || profile?.displayName || 'Sports Athlete',
        photoURL: formData.photoURL || formData.avatarUrl || profile?.photoURL || '',
        avatarUrl: formData.avatarUrl || formData.photoURL || profile?.avatarUrl || '',
        sport: formData.sport as any,
        bio: formData.bio.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        country: formData.country.trim(),
        location: cleanLocation,
        highSchool: formData.highSchool.trim(),
        teamName: formData.teamName.trim(),
        position: formData.position.trim(),
        primaryPosition: formData.primaryPosition.trim() || formData.position.trim(),
        jerseyNumber: formData.jerseyNumber.trim(),
        gradYear: formData.gradYear.trim(),
        height: formData.height.trim(),
        weight: formData.weight.trim(),
        gpa: formData.gpa.trim(),
        coachingPhilosophy: formData.coachingPhilosophy.trim(),
        orgAffiliation: formData.orgAffiliation.trim(),
        scoutingRegion: formData.scoutingRegion.trim(),
        recruitingFocus: formData.recruitingFocus.trim(),
        social: socialHandles,
        updatedAt: new Date().toISOString()
      };

      // 1. Update in AuthContext (local state + localStorage sync)
      await updateUserProfile(updatedPayload);

      // 2. Direct Firestore update if user is authenticated
      if (user?.uid && db) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          await updateDoc(userDocRef, updatedPayload);
        } catch (fsErr: any) {
          console.warn('Direct Firestore update note:', fsErr);
          // If offline or quota, updateUserProfile already updated local memory & storage
        }
      }

      setSaveSuccess(true);
      showToast('success', 'Profile Updated', 'Your bio, location, and social links have been saved to Firestore.');

      if (onProfileUpdated && profile) {
        onProfileUpdated({
          ...profile,
          ...updatedPayload
        } as UserProfile);
      }

      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1000);

    } catch (err: any) {
      console.error('Error saving profile changes:', err);
      setErrorMsg(err.message || 'Failed to save profile. Please check your connection and try again.');
      showToast('error', 'Update Failed', 'Could not save profile changes to Firestore.');
    } finally {
      setSaving(false);
    }
  };

  const bioCharLimit = 600;
  const bioCharsLeft = bioCharLimit - formData.bio.length;

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
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black uppercase text-white tracking-tight">
                    Edit Profile
                  </h2>
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30">
                    {activeRole}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono">
                  Update your public bio, location & social media links in Firestore
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

          {/* Tab Navigation Navigation */}
          <div className="flex items-center gap-1.5 px-5 sm:px-6 pt-3 pb-2 border-b border-white/5 bg-[#0B0F17]/40 shrink-0 overflow-x-auto custom-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('bio_info')}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'bio_info'
                  ? 'bg-[#00E5FF] text-[#0B0F17] shadow-[0_0_15px_rgba(0,229,255,0.3)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>1. Bio & Identity</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('location')}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'location'
                  ? 'bg-[#00E5FF] text-[#0B0F17] shadow-[0_0_15px_rgba(0,229,255,0.3)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>2. Location & Team</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('socials')}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'socials'
                  ? 'bg-[#00E5FF] text-[#0B0F17] shadow-[0_0_15px_rgba(0,229,255,0.3)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Share2 className="w-4 h-4" />
              <span>3. Social Media Links</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('payment_accounts')}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'payment_accounts'
                  ? 'bg-gradient-to-r from-[#00E5FF] to-[#0070BA] text-[#0B0F17] shadow-[0_0_15px_rgba(0,229,255,0.3)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>4. Saved Payment Accounts & Fast Pay</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'preview'
                  ? 'bg-[#39FF14] text-[#0B0F17] shadow-[0_0_15px_rgba(57,255,20,0.3)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>Live Card Preview</span>
            </button>
          </div>

          {/* Form Content Area */}
          <form onSubmit={handleSaveProfile} className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
            
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* TAB 1: BIO & IDENTITY */}
            {activeTab === 'bio_info' && (
              <div className="space-y-5">
                
                {/* Avatar and Display Name */}
                <div className="bg-[#0B0F17] p-4 sm:p-5 rounded-2xl border border-white/10 space-y-4">
                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    <ProfilePictureUploader
                      currentPhotoUrl={formData.photoURL || formData.avatarUrl || profile?.photoURL || profile?.avatarUrl}
                      size="md"
                      onSuccess={(newUrl) => {
                        setFormData(prev => ({ ...prev, photoURL: newUrl, avatarUrl: newUrl }));
                      }}
                    />
                    
                    <div className="flex-1 w-full space-y-3">
                      <div>
                        <label className="text-xs font-mono text-slate-300 font-bold mb-1 block uppercase">
                          Display Name *
                        </label>
                        <input
                          type="text"
                          value={formData.displayName}
                          onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-[#131B26] border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-[#00E5FF] transition-colors"
                          placeholder="e.g. Marcus Johnson"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-mono text-slate-400 mb-1 block">Primary Sport</label>
                          <select
                            value={formData.sport}
                            onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
                            className="w-full px-3 py-2 bg-[#131B26] border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF] cursor-pointer"
                          >
                            <option value="Basketball">Basketball</option>
                            <option value="Football">Football</option>
                            <option value="Flag Football">Flag Football</option>
                            <option value="Soccer">Soccer</option>
                            <option value="Lacrosse">Lacrosse</option>
                            <option value="Baseball">Baseball</option>
                            <option value="Volleyball">Volleyball</option>
                            <option value="Track & Field">Track & Field</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-mono text-slate-400 mb-1 block">Position / Role Title</label>
                          <input
                            type="text"
                            value={formData.position}
                            onChange={(e) => setFormData({ ...formData, position: e.target.value, primaryPosition: e.target.value })}
                            className="w-full px-3 py-2 bg-[#131B26] border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                            placeholder="e.g. Point Guard / Head Coach"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bio Textarea with Quick Auto-fill Templates */}
                <div className="bg-[#0B0F17] p-4 sm:p-5 rounded-2xl border border-white/10 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="text-xs font-mono font-bold text-[#00E5FF] uppercase flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-[#00E5FF]" />
                        <span>Public Player / Member Bio</span>
                      </label>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Describe your athletic achievements, playstyle, and collegiate goals.
                      </p>
                    </div>

                    <span className={`text-[11px] font-mono self-end sm:self-auto ${
                      bioCharsLeft < 0 ? 'text-rose-400 font-bold' : 'text-slate-400'
                    }`}>
                      {formData.bio.length} / {bioCharLimit} chars
                    </span>
                  </div>

                  {/* AI & Quick Bio Generator Buttons */}
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <span className="text-[10px] font-mono text-slate-500 uppercase flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#39FF14]" />
                      Auto-Bio:
                    </span>
                    <button
                      type="button"
                      onClick={() => applyBioTemplate('collegiate')}
                      className="px-2.5 py-1 rounded-lg bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 border border-[#00E5FF]/30 text-[#00E5FF] text-[10px] font-mono font-bold transition-colors cursor-pointer"
                    >
                      Collegiate Prospect
                    </button>
                    <button
                      type="button"
                      onClick={() => applyBioTemplate('leadership')}
                      className="px-2.5 py-1 rounded-lg bg-[#39FF14]/10 hover:bg-[#39FF14]/20 border border-[#39FF14]/30 text-[#39FF14] text-[10px] font-mono font-bold transition-colors cursor-pointer"
                    >
                      Team Leader
                    </button>
                    <button
                      type="button"
                      onClick={() => applyBioTemplate('development')}
                      className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] font-mono font-bold transition-colors cursor-pointer"
                    >
                      Daily Grinder
                    </button>
                  </div>

                  <textarea
                    rows={4}
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#131B26] border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-[#00E5FF] font-sans transition-colors leading-relaxed placeholder:text-slate-600"
                    placeholder="Write your bio statement here or click one of the Auto-Bio buttons above..."
                    maxLength={bioCharLimit}
                  />
                </div>

                {/* Additional Measurables (Height, Weight, GPA, Grad Year for Athletes) */}
                {activeRole === 'athlete' && (
                  <div className="bg-[#0B0F17] p-4 sm:p-5 rounded-2xl border border-white/10 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#39FF14] uppercase">
                      <Trophy className="w-4 h-4 text-[#39FF14]" />
                      <span>Physical Measurables & Academic Status</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Height</label>
                        <input
                          type="text"
                          value={formData.height}
                          onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                          className="w-full px-3 py-2 bg-[#131B26] border border-white/15 rounded-xl text-xs text-white focus:border-[#00E5FF]"
                          placeholder="e.g. 6'2&quot;"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Weight</label>
                        <input
                          type="text"
                          value={formData.weight}
                          onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                          className="w-full px-3 py-2 bg-[#131B26] border border-white/15 rounded-xl text-xs text-white focus:border-[#00E5FF]"
                          placeholder="e.g. 185 lbs"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Grad Year</label>
                        <select
                          value={formData.gradYear}
                          onChange={(e) => setFormData({ ...formData, gradYear: e.target.value })}
                          className="w-full px-3 py-2 bg-[#131B26] border border-white/15 rounded-xl text-xs text-white focus:border-[#00E5FF] cursor-pointer"
                        >
                          <option value="2025">Class of 2025</option>
                          <option value="2026">Class of 2026</option>
                          <option value="2027">Class of 2027</option>
                          <option value="2028">Class of 2028</option>
                          <option value="2029">Class of 2029</option>
                          <option value="2030">Class of 2030</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">GPA Academic</label>
                        <input
                          type="text"
                          value={formData.gpa}
                          onChange={(e) => setFormData({ ...formData, gpa: e.target.value })}
                          className="w-full px-3 py-2 bg-[#131B26] border border-white/15 rounded-xl text-xs text-white focus:border-[#00E5FF]"
                          placeholder="e.g. 3.85"
                        />
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* TAB 2: LOCATION & REGION */}
            {activeTab === 'location' && (
              <div className="space-y-5">
                <div className="bg-[#0B0F17] p-4 sm:p-5 rounded-2xl border border-white/10 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#00E5FF] uppercase">
                    <MapPin className="w-4 h-4 text-[#00E5FF]" />
                    <span>Location & Geographical Region</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Specify your hometown, state, and club / high school location so college recruiters and tournament organizers can discover you.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <label className="text-[11px] font-mono text-slate-400 mb-1 block uppercase">City / Town *</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#131B26] border border-white/15 rounded-xl text-xs text-white focus:border-[#00E5FF]"
                        placeholder="e.g. Newark / Atlanta"
                        required
                      />
                    </div>

                    <div className="sm:col-span-1">
                      <label className="text-[11px] font-mono text-slate-400 mb-1 block uppercase">State / Province *</label>
                      <select
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#131B26] border border-white/15 rounded-xl text-xs text-white focus:border-[#00E5FF] cursor-pointer"
                      >
                        {US_STATES.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                        <option value="INTL">International</option>
                      </select>
                    </div>

                    <div className="sm:col-span-1">
                      <label className="text-[11px] font-mono text-slate-400 mb-1 block uppercase">Country</label>
                      <input
                        type="text"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#131B26] border border-white/15 rounded-xl text-xs text-white focus:border-[#00E5FF]"
                        placeholder="United States"
                      />
                    </div>
                  </div>

                  {/* Formatted Location Display */}
                  <div className="bg-[#131B26] p-3 rounded-xl border border-white/5 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Formatted Location Preview:</span>
                    <span className="text-[#00E5FF] font-bold">
                      {formData.city ? `${formData.city}, ${formData.state}` : formData.state}
                      {formData.country && formData.country !== 'United States' ? `, ${formData.country}` : ''}
                    </span>
                  </div>
                </div>

                {/* Team & Program Affiliation */}
                <div className="bg-[#0B0F17] p-4 sm:p-5 rounded-2xl border border-white/10 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#39FF14] uppercase">
                    <Building2 className="w-4 h-4 text-[#39FF14]" />
                    <span>School & Club Team Affiliation</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-mono text-slate-400 mb-1 block">High School / Academy</label>
                      <input
                        type="text"
                        value={formData.highSchool}
                        onChange={(e) => setFormData({ ...formData, highSchool: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#131B26] border border-white/15 rounded-xl text-xs text-white focus:border-[#00E5FF]"
                        placeholder="e.g. St. Benedict Prep"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-slate-400 mb-1 block">Club / AAU Program</label>
                      <input
                        type="text"
                        value={formData.teamName}
                        onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#131B26] border border-white/15 rounded-xl text-xs text-white focus:border-[#00E5FF]"
                        placeholder="e.g. NY Rens / NJ Roadrunners"
                      />
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 3: SOCIAL MEDIA LINKS */}
            {activeTab === 'socials' && (
              <div className="space-y-5">
                <div className="bg-[#0B0F17] p-4 sm:p-5 rounded-2xl border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#00E5FF] uppercase">
                      <Share2 className="w-4 h-4 text-[#00E5FF]" />
                      <span>Social Media Handles & Links</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">All fields optional</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Connect your active social profiles. These will render as verified interactive badges on your public profile header and member directory card.
                  </p>

                  <div className="space-y-3 pt-2">
                    
                    {/* Instagram */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/30 text-pink-400 flex items-center justify-center shrink-0">
                        <Instagram className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] font-mono text-slate-400 uppercase block mb-0.5">Instagram Handle or URL</label>
                        <input
                          type="text"
                          value={formData.instagram}
                          onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                          className="w-full px-3.5 py-2 bg-[#131B26] border border-white/15 rounded-xl text-xs text-white focus:border-[#00E5FF]"
                          placeholder="@marcus_hoops or https://instagram.com/marcus_hoops"
                        />
                      </div>
                    </div>

                    {/* X / Twitter */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0 font-bold font-mono">
                        𝕏
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] font-mono text-slate-400 uppercase block mb-0.5">X / Twitter Handle or URL</label>
                        <input
                          type="text"
                          value={formData.twitter}
                          onChange={(e) => setFormData({ ...formData, twitter: e.target.value, x: e.target.value })}
                          className="w-full px-3.5 py-2 bg-[#131B26] border border-white/15 rounded-xl text-xs text-white focus:border-[#00E5FF]"
                          placeholder="@MarcusHoops2026 or https://x.com/MarcusHoops2026"
                        />
                      </div>
                    </div>

                    {/* YouTube */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center shrink-0">
                        <Youtube className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] font-mono text-slate-400 uppercase block mb-0.5">YouTube Channel or Highlight Link</label>
                        <input
                          type="text"
                          value={formData.youtube}
                          onChange={(e) => setFormData({ ...formData, youtube: e.target.value })}
                          className="w-full px-3.5 py-2 bg-[#131B26] border border-white/15 rounded-xl text-xs text-white focus:border-[#00E5FF]"
                          placeholder="https://youtube.com/@MarcusHighlights"
                        />
                      </div>
                    </div>

                    {/* TikTok */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-[#00E5FF] flex items-center justify-center shrink-0 font-mono font-bold text-xs">
                        TT
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] font-mono text-slate-400 uppercase block mb-0.5">TikTok Handle or URL</label>
                        <input
                          type="text"
                          value={formData.tiktok}
                          onChange={(e) => setFormData({ ...formData, tiktok: e.target.value })}
                          className="w-full px-3.5 py-2 bg-[#131B26] border border-white/15 rounded-xl text-xs text-white focus:border-[#00E5FF]"
                          placeholder="@hoopdiaries"
                        />
                      </div>
                    </div>

                    {/* Hudl */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 flex items-center justify-center shrink-0 font-mono font-bold text-xs">
                        HD
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] font-mono text-slate-400 uppercase block mb-0.5">Hudl Recruiting Profile Link</label>
                        <input
                          type="text"
                          value={formData.hudl}
                          onChange={(e) => setFormData({ ...formData, hudl: e.target.value })}
                          className="w-full px-3.5 py-2 bg-[#131B26] border border-white/15 rounded-xl text-xs text-white focus:border-[#00E5FF]"
                          placeholder="https://www.hudl.com/profile/12345/marcus-johnson"
                        />
                      </div>
                    </div>

                    {/* Website / Portfolio */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                        <Globe className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] font-mono text-slate-400 uppercase block mb-0.5">Personal Website / Media Portfolio</label>
                        <input
                          type="url"
                          value={formData.website}
                          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                          className="w-full px-3.5 py-2 bg-[#131B26] border border-white/15 rounded-xl text-xs text-white focus:border-[#00E5FF]"
                          placeholder="https://marcushoops.com"
                        />
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: LIVE PREVIEW */}
            {activeTab === 'preview' && (
              <div className="space-y-4">
                <div className="p-3 bg-[#0B0F17] rounded-xl border border-white/10 text-xs font-mono text-slate-400 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#39FF14]" />
                  <span>Real-time Live Card Preview (How recruiters and fans see your profile)</span>
                </div>

                {/* Profile Card Preview */}
                <div className="rounded-3xl bg-[#0B0F17] border border-[#00E5FF]/40 p-6 shadow-2xl relative overflow-hidden">
                  <div className="flex items-start gap-4">
                    <img
                      src={formData.photoURL || formData.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'}
                      alt={formData.displayName}
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-[#00E5FF] shadow-lg"
                    />

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xl font-black text-white">{formData.displayName || 'Marcus Johnson'}</h3>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/40">
                          {activeRole}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-mono text-[#00E5FF]">
                        <span>{formData.position || 'Guard'}</span>
                        <span>•</span>
                        <span>{formData.sport}</span>
                        {formData.gradYear && (
                          <>
                            <span>•</span>
                            <span className="text-[#39FF14]">Class of {formData.gradYear}</span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-300 pt-1 flex-wrap">
                        {formData.highSchool && <span>{formData.highSchool}</span>}
                        <span className="flex items-center gap-1 text-slate-400">
                          <MapPin className="w-3 h-3 text-[#00E5FF]" />
                          <span>{formData.city ? `${formData.city}, ${formData.state}` : formData.state}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bio Preview */}
                  <div className="mt-4 p-3.5 rounded-2xl bg-[#131B26] border border-white/5">
                    <span className="text-[10px] font-mono uppercase font-bold text-[#00E5FF] block mb-1">
                      Bio Preview:
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed italic">
                      "{formData.bio || 'No bio written yet. Fill in your bio in Tab 1.'}"
                    </p>
                  </div>

                  {/* Social Badges Preview */}
                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono text-slate-400 uppercase mr-1">Socials:</span>
                    {formData.instagram && (
                      <span className="px-2.5 py-1 rounded-lg bg-pink-500/10 border border-pink-500/30 text-pink-400 text-[11px] font-mono flex items-center gap-1">
                        <Instagram className="w-3 h-3" />
                        <span>{formData.instagram.replace('https://instagram.com/', '@')}</span>
                      </span>
                    )}
                    {formData.twitter && (
                      <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[11px] font-mono flex items-center gap-1">
                        <span>𝕏</span>
                        <span>{formData.twitter.replace('https://x.com/', '@')}</span>
                      </span>
                    )}
                    {formData.youtube && (
                      <span className="px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-[11px] font-mono flex items-center gap-1">
                        <Youtube className="w-3 h-3" />
                        <span>YouTube</span>
                      </span>
                    )}
                    {formData.hudl && (
                      <span className="px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[11px] font-mono flex items-center gap-1">
                        <span>Hudl Film</span>
                      </span>
                    )}
                    {formData.website && (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        <span>Website</span>
                      </span>
                    )}
                    {!formData.instagram && !formData.twitter && !formData.youtube && !formData.hudl && !formData.website && (
                      <span className="text-xs text-slate-500 italic">No social links added yet</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: SAVED PAYMENT ACCOUNTS & FAST PAY */}
            {activeTab === 'payment_accounts' && (
              <div className="space-y-4">
                <SavedPaymentAccountsSection />
              </div>
            )}

            {/* Modal Bottom Controls */}
            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                <ShieldCheck className="w-4 h-4 text-[#39FF14]" />
                <span>Syncs to Firestore & updates live across Just1Play</span>
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
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#00B8D4] text-[#0B0F17] font-black text-xs font-mono uppercase tracking-wider hover:brightness-110 transition-all flex items-center gap-2 shadow-[0_0_25px_rgba(0,229,255,0.4)] cursor-pointer disabled:opacity-50"
                >
                  {saveSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-[#0B0F17]" />
                      <span>Saved to Firestore!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 stroke-[2.5]" />
                      <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
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
