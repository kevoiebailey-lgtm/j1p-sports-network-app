import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  Trophy,
  ShieldCheck,
  Eye,
  Building2,
  Camera,
  Heart,
  Sliders,
  CheckCircle2,
  FileText,
  User,
  GraduationCap,
  MapPin,
  Save,
  Wand2,
  BookOpen,
  Award,
  Users
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { RoleAvatar } from '../Common/RoleAvatar';
import { ProfilePictureUploader } from '../AthleteProfile/ProfilePictureUploader';

interface RoleProfileEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  overrideRole?: UserRole;
}

export const RoleProfileEditorModal: React.FC<RoleProfileEditorModalProps> = ({
  isOpen,
  onClose,
  overrideRole
}) => {
  const { profile, role: authRole, updateUserProfile } = useAuth();
  const activeRole: UserRole = overrideRole || profile?.role || authRole || 'athlete';

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State initialized with user profile values
  const [formData, setFormData] = useState({
    displayName: '',
    photoURL: '',
    avatarUrl: '',
    bio: '',
    
    // Athlete Structured Template Fields
    primaryPosition: 'Guard',
    position: 'Guard',
    gradYear: '2026',
    highSchool: '',
    state: 'NJ',
    height: "6'2\"",
    weight: '185 lbs',
    gpa: '3.8',

    // Coach Structured Template Fields
    coachingPhilosophy: 'Building high-character student-athletes through tough defense, fast-paced execution, and academic discipline.',
    orgAffiliation: 'St. Anthony Prep & Select AAU Knights',
    title: 'Head Varsity Coach & Recruiting Coordinator',
    teamName: '',
    yearsExperience: '10+ Years',

    // Recruiter / Scout Structured Fields
    scoutingRegion: 'East Coast & Mid-Atlantic D1/D2',
    recruitingFocus: '2026 & 2027 Uncommitted Prospects',

    // Social handles
    instagram: '',
    twitter: '',
    hudl: '',
    tiktok: ''
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || '',
        photoURL: profile.photoURL || profile.avatarUrl || '',
        avatarUrl: profile.avatarUrl || profile.photoURL || '',
        bio: profile.bio || '',
        
        primaryPosition: profile.primaryPosition || profile.position || 'Guard',
        position: profile.position || profile.primaryPosition || 'Guard',
        gradYear: profile.gradYear || '2026',
        highSchool: profile.highSchool || profile.teamName || 'Oak Ridge Academy',
        state: profile.state || 'NJ',
        height: profile.height || "6'2\"",
        weight: profile.weight || '185 lbs',
        gpa: profile.gpa || '3.8',

        coachingPhilosophy: profile.coachingPhilosophy || 'Building high-character student-athletes through tough defense, fast-paced execution, and academic discipline.',
        orgAffiliation: profile.orgAffiliation || profile.highSchool || profile.teamName || 'St. Anthony Prep & Select AAU Knights',
        title: 'Head Varsity Coach & Recruiting Coordinator',
        teamName: profile.teamName || profile.highSchool || 'St. Anthony Prep',
        yearsExperience: '10+ Years',

        scoutingRegion: profile.scoutingRegion || 'East Coast & Mid-Atlantic D1/D2',
        recruitingFocus: profile.recruitingFocus || '2026 & 2027 Uncommitted Prospects',

        instagram: profile.social?.instagram || '',
        twitter: profile.social?.twitter || '',
        hudl: profile.social?.hudl || '',
        tiktok: profile.social?.tiktok || ''
      });
    }
  }, [profile, isOpen]);

  if (!isOpen) return null;

  // Auto-generate professional bio template based on structured role fields
  const handleApplyBioTemplate = () => {
    let generatedBio = '';

    if (activeRole === 'athlete') {
      const pos = formData.primaryPosition || formData.position || 'Athlete';
      const year = formData.gradYear || '2026';
      const school = formData.highSchool || 'Oak Ridge Academy';
      const gpaVal = formData.gpa ? ` | ${formData.gpa} GPA` : '';
      generatedBio = `Class of ${year} ${pos} at ${school}${gpaVal}. High-IQ competitor focused on playmaking, defensive intensity, and team leadership. Driven to compete at the collegiate level.`;
    } else if (activeRole === 'coach') {
      const org = formData.orgAffiliation || formData.teamName || 'Varsity Basketball Program';
      const phil = formData.coachingPhilosophy || 'Developing well-rounded student-athletes on and off the court.';
      generatedBio = `Coach at ${org}. Coaching Philosophy: ${phil} Dedicated to developing elite athletic talent and opening college recruiting pathways.`;
    } else if (activeRole === 'scout') {
      const region = formData.scoutingRegion || 'National Circuit';
      const focus = formData.recruitingFocus || 'Top High-Potential Prospects';
      generatedBio = `NCAA Accredited Scout covering ${region}. Focus Area: ${focus}. Providing objective evaluation reports and film analysis for collegiate programs.`;
    } else if (activeRole === 'organization') {
      const org = formData.orgAffiliation || formData.displayName || 'Youth Sports Association';
      generatedBio = `Official Tournament Host & Operator for ${org}. Delivering sanctioned, high-exposure showcases with verified real-time scoreboards and court streaming.`;
    } else if (activeRole === 'creator' || activeRole === 'content_creator') {
      generatedBio = `Sports Media Creator & Videographer. Specializing in 4K game film, player highlight mixtapes, and athletic brand storytelling.`;
    } else {
      generatedBio = `Basketball enthusiast & spectator following top high school showcases and recruiting prospects across the nation.`;
    }

    setFormData(prev => ({ ...prev, bio: generatedBio }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const finalPhoto = formData.photoURL || formData.avatarUrl || profile?.photoURL || '';
      await updateUserProfile({
        displayName: formData.displayName,
        photoURL: finalPhoto,
        avatarUrl: finalPhoto,
        bio: formData.bio,
        position: formData.primaryPosition || formData.position,
        primaryPosition: formData.primaryPosition || formData.position,
        gradYear: formData.gradYear,
        highSchool: formData.highSchool,
        state: formData.state,
        height: formData.height,
        weight: formData.weight,
        gpa: formData.gpa,
        coachingPhilosophy: formData.coachingPhilosophy,
        orgAffiliation: formData.orgAffiliation,
        scoutingRegion: formData.scoutingRegion,
        recruitingFocus: formData.recruitingFocus,
        teamName: formData.teamName || formData.orgAffiliation,
        social: {
          instagram: formData.instagram,
          twitter: formData.twitter,
          hudl: formData.hudl,
          tiktok: formData.tiktok
        }
      });

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Error updating profile bio:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-[#212A31] border border-white/20 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-[0_0_60px_rgba(0,0,0,0.9)] relative overflow-hidden font-sans text-slate-100 max-h-[90vh] flex flex-col"
        >
          {/* Top Decorative Ambient Glow */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-[#E5B868]/10 rounded-full blur-[100px] pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer border border-white/10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="flex items-center gap-4 mb-6 shrink-0 border-b border-white/10 pb-4">
            <RoleAvatar
              role={activeRole}
              photoURL={formData.photoURL || formData.avatarUrl}
              displayName={formData.displayName}
              size="md"
              showRoleBadge={true}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#E5B868]/10 text-[#E5B868] border border-[#E5B868]/30">
                  {activeRole} TEMPLATE EDITOR
                </span>
              </div>
              <h2 className="text-xl font-black italic uppercase text-white font-sans tracking-tight mt-0.5">
                Structured Profile Bio & Credentials
              </h2>
            </div>
          </div>

          {/* Form Scroll Area */}
          <form onSubmit={handleSave} className="space-y-5 overflow-y-auto pr-2 custom-scrollbar flex-1">
            {/* General Info: Profile Picture & Display Name */}
            <div className="bg-black/40 p-4 rounded-2xl border border-white/10 space-y-4">
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
                    <label className="text-xs font-mono text-[#E5B868] mb-0.5 block font-bold uppercase">
                      Profile Picture Upload
                    </label>
                    <p className="text-[11px] text-slate-300">
                      Click the avatar or drag & drop an image above to upload a photo directly from your device gallery or camera.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-mono text-slate-400 mb-1 block">Full Display Name</label>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      className="w-full px-3.5 py-2 bg-[#212A31] border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-[#E5B868]"
                      placeholder="e.g. Marcus Johnson"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-slate-400 mb-1 block">Avatar Web Image URL (Optional)</label>
                    <input
                      type="url"
                      value={formData.photoURL}
                      onChange={(e) => setFormData({ ...formData, photoURL: e.target.value, avatarUrl: e.target.value })}
                      className="w-full px-3.5 py-1.5 bg-[#212A31] border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-[#E5B868]"
                      placeholder="https://images.unsplash.com/..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ROLE-SPECIFIC STRUCTURED TEMPLATE FIELDS */}
            {activeRole === 'athlete' && (
              <div className="space-y-4 p-4 rounded-2xl bg-[#E5B868]/5 border border-[#E5B868]/20">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#E5B868] uppercase">
                  <Trophy className="w-4 h-4 text-[#E5B868]" />
                  <span>ATHLETE STRUCTURED FIELDS</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-mono text-slate-300 mb-1 block">Primary Position</label>
                    <input
                      type="text"
                      value={formData.primaryPosition}
                      onChange={(e) => setFormData({ ...formData, primaryPosition: e.target.value, position: e.target.value })}
                      className="w-full px-3.5 py-2 bg-[#212A31] border border-white/20 rounded-xl text-sm text-white focus:outline-none focus:border-[#E5B868]"
                      placeholder="e.g. Point Guard / Shooting Guard"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-mono text-slate-300 mb-1 block">Graduation Year</label>
                    <select
                      value={formData.gradYear}
                      onChange={(e) => setFormData({ ...formData, gradYear: e.target.value })}
                      className="w-full px-3.5 py-2 bg-[#212A31] border border-white/20 rounded-xl text-sm text-white focus:outline-none focus:border-[#E5B868]"
                    >
                      <option value="2025">Class of 2025</option>
                      <option value="2026">Class of 2026</option>
                      <option value="2027">Class of 2027</option>
                      <option value="2028">Class of 2028</option>
                      <option value="2029">Class of 2029</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-mono text-slate-300 mb-1 block">High School / Club</label>
                    <input
                      type="text"
                      value={formData.highSchool}
                      onChange={(e) => setFormData({ ...formData, highSchool: e.target.value })}
                      className="w-full px-3.5 py-2 bg-[#212A31] border border-white/20 rounded-xl text-sm text-white focus:outline-none focus:border-[#E5B868]"
                      placeholder="e.g. Oak Ridge High School"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-mono text-slate-300 mb-1 block">GPA / Academic Standing</label>
                    <input
                      type="text"
                      value={formData.gpa}
                      onChange={(e) => setFormData({ ...formData, gpa: e.target.value })}
                      className="w-full px-3.5 py-2 bg-[#212A31] border border-white/20 rounded-xl text-sm text-white focus:outline-none focus:border-[#E5B868]"
                      placeholder="e.g. 3.8 GPA"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-mono text-slate-300 mb-1 block">Height & Weight</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.height}
                        onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                        className="w-1/2 px-3 py-2 bg-[#212A31] border border-white/20 rounded-xl text-xs text-white"
                        placeholder="Height e.g. 6'2&quot;"
                      />
                      <input
                        type="text"
                        value={formData.weight}
                        onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                        className="w-1/2 px-3 py-2 bg-[#212A31] border border-white/20 rounded-xl text-xs text-white"
                        placeholder="Weight e.g. 180 lbs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-mono text-slate-300 mb-1 block">State / Region</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-3.5 py-2 bg-[#212A31] border border-white/20 rounded-xl text-sm text-white focus:outline-none focus:border-[#E5B868]"
                      placeholder="e.g. NJ"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeRole === 'coach' && (
              <div className="space-y-4 p-4 rounded-2xl bg-[#E5B868]/10 border border-blue-500/30">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-blue-400 uppercase">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  <span>COACH STRUCTURED FIELDS</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-mono text-slate-300 mb-1 block">Coaching Philosophy</label>
                    <textarea
                      rows={2}
                      value={formData.coachingPhilosophy}
                      onChange={(e) => setFormData({ ...formData, coachingPhilosophy: e.target.value })}
                      className="w-full px-3.5 py-2 bg-[#212A31] border border-white/20 rounded-xl text-sm text-white focus:outline-none focus:border-blue-400"
                      placeholder="e.g. Relentless defensive pressure, fast-break execution, and building high-character student-athletes."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-mono text-slate-300 mb-1 block">Organization / School Affiliation</label>
                      <input
                        type="text"
                        value={formData.orgAffiliation}
                        onChange={(e) => setFormData({ ...formData, orgAffiliation: e.target.value, teamName: e.target.value })}
                        className="w-full px-3.5 py-2 bg-[#212A31] border border-white/20 rounded-xl text-sm text-white focus:outline-none focus:border-blue-400"
                        placeholder="e.g. St. Anthony Prep & Select AAU"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-mono text-slate-300 mb-1 block">Coaching Title</label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-3.5 py-2 bg-[#212A31] border border-white/20 rounded-xl text-sm text-white focus:outline-none focus:border-blue-400"
                        placeholder="e.g. Head Varsity Coach"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeRole === 'scout' && (
              <div className="space-y-4 p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-400 uppercase">
                  <Eye className="w-4 h-4 text-purple-400" />
                  <span>RECRUITER / SCOUT STRUCTURED FIELDS</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-mono text-slate-300 mb-1 block">Scouting Region</label>
                    <input
                      type="text"
                      value={formData.scoutingRegion}
                      onChange={(e) => setFormData({ ...formData, scoutingRegion: e.target.value })}
                      className="w-full px-3.5 py-2 bg-[#212A31] border border-white/20 rounded-xl text-sm text-white focus:outline-none focus:border-purple-400"
                      placeholder="e.g. Southeast & Mid-Atlantic D1/D2"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-mono text-slate-300 mb-1 block">Recruiting Focus / Target Classes</label>
                    <input
                      type="text"
                      value={formData.recruitingFocus}
                      onChange={(e) => setFormData({ ...formData, recruitingFocus: e.target.value })}
                      className="w-full px-3.5 py-2 bg-[#212A31] border border-white/20 rounded-xl text-sm text-white focus:outline-none focus:border-purple-400"
                      placeholder="e.g. 2026/2027 Uncommitted Guards & Wings"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* BIO TEXTAREA + TEMPLATE GENERATOR BUTTON */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#E5B868]" />
                  <span>Bio Summary</span>
                </label>

                <button
                  type="button"
                  onClick={handleApplyBioTemplate}
                  className="px-3 py-1 bg-[#E5B868]/10 hover:bg-[#E5B868]/20 border border-[#E5B868]/40 text-[#E5B868] text-[11px] font-mono font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5 text-[#E5B868]" />
                  <span>Auto-Fill {activeRole.toUpperCase()} Bio Template</span>
                </button>
              </div>

              <textarea
                rows={3}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#212A31] border border-white/20 rounded-xl text-sm text-white focus:outline-none focus:border-[#E5B868] font-sans"
                placeholder="Write or generate a professional bio summary..."
              />
            </div>

            {/* Social Links */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
              <span className="text-xs font-mono text-slate-400 block font-bold uppercase">Social Media Handles</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={formData.instagram}
                  onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                  placeholder="Instagram e.g. @marcus_hoops"
                  className="px-3 py-2 bg-[#212A31] border border-white/15 rounded-xl text-xs text-white"
                />
                <input
                  type="text"
                  value={formData.twitter}
                  onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                  placeholder="Twitter / X e.g. @MarcusHoops"
                  className="px-3 py-2 bg-[#212A31] border border-white/15 rounded-xl text-xs text-white"
                />
                <input
                  type="text"
                  value={formData.hudl}
                  onChange={(e) => setFormData({ ...formData, hudl: e.target.value })}
                  placeholder="Hudl Link / Profile"
                  className="px-3 py-2 bg-[#212A31] border border-white/15 rounded-xl text-xs text-white"
                />
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-slate-300 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-[#E5B868] hover:bg-[#B8141B] text-black font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(214,28,36,0.4)] disabled:opacity-50"
              >
                {saveSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-black" />
                    <span>Saved Profile!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 stroke-[2.5]" />
                    <span>{saving ? 'Updating...' : 'Save Profile Changes'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
