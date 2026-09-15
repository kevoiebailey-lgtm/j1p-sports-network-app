import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { VerifiedBadge } from '../Common/VerifiedBadge';
import { UserProfile } from '../../types';
import { 
  Award, 
  ShieldCheck, 
  Users, 
  Trophy, 
  CheckCircle2, 
  QrCode, 
  Calendar, 
  Mail, 
  Phone, 
  Edit3, 
  Share2, 
  Check, 
  ExternalLink, 
  BookOpen,
  Briefcase,
  GraduationCap,
  Sparkles,
  UserCheck,
  Save
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProfilePictureUploader } from '../AthleteProfile/ProfilePictureUploader';

export const CoachProfileView: React.FC = () => {
  const { profile, role, updateUserProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [editData, setEditData] = useState({
    displayName: profile?.displayName || '',
    photoURL: profile?.photoURL || profile?.avatarUrl || '',
    avatarUrl: profile?.avatarUrl || profile?.photoURL || '',
    teamName: profile?.teamName || profile?.highSchool || 'St. Anthony Prep Knights',
    title: 'Head Varsity Coach & Recruiting Coordinator',
    sport: profile?.sport || 'Basketball',
    yearsExperience: '12 Years',
    careerRecord: '184 Wins - 42 Losses (.814)',
    championships: '3x State Titles, 5x Division Champions',
    d1PlacedCount: '28 Athletes Placed in D1/D2 Programs',
    license: 'USA Basketball Gold Licensed & NFHS Certified',
    bio: profile?.bio || 'Head Coach dedicated to building high-character student-athletes, elite tactical execution, and college recruiting pathways.',
    email: profile?.email || 'coach@stanthonyhoops.org',
    phone: '(555) 234-5678',
    instagram: profile?.social?.instagram || '@coach_knights',
    twitter: profile?.social?.twitter || '@CoachKnights_NJ'
  });

  if (!profile) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const finalPhoto = editData.photoURL || editData.avatarUrl || profile.photoURL || profile.avatarUrl;
    updateUserProfile({
      displayName: editData.displayName,
      photoURL: finalPhoto,
      avatarUrl: finalPhoto,
      highSchool: editData.teamName,
      teamName: editData.teamName,
      sport: editData.sport,
      bio: editData.bio,
      social: {
        instagram: editData.instagram,
        twitter: editData.twitter
      }
    });
    setIsEditing(false);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Header Card */}
      <div className="relative rounded-3xl overflow-hidden bg-[#050505] border border-red-600/30 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="relative">
              <img 
                src={profile.photoURL || profile.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'} 
                alt={profile.displayName} 
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-red-500/80 shadow-[0_0_25px_rgba(16,185,129,0.3)]"
              />
              <div className="absolute -bottom-2 -right-2 bg-red-600 text-black font-black text-[10px] px-2 py-0.5 rounded-md uppercase tracking-widest flex items-center gap-1 shadow-md">
                <ShieldCheck className="w-3 h-3" /> COACH
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest bg-red-600 text-black rounded-sm shadow-[0_0_12px_rgba(16,185,129,0.4)]">
                  SANCTIONED COACH CREDENTIAL
                </span>
                <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest bg-white/5 text-red-400 border border-red-600/30 rounded-sm flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-red-500" />
                  VERIFIED SIDELINE ACCREDITED
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black italic tracking-tight text-white uppercase font-sans flex items-center gap-2.5 flex-wrap">
                <span>{profile.displayName}</span>
                <VerifiedBadge size="lg" showLabel />
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 font-bold flex flex-wrap items-center gap-2">
                <span className="text-red-500">{editData.title}</span>
                <span>•</span>
                <span className="text-white">{editData.teamName}</span>
                <span>•</span>
                <span className="text-slate-400">{editData.sport}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
            <Link
              to="/coach-check-in"
              className="flex-1 md:flex-initial px-4 py-2.5 rounded-full bg-red-600 hover:bg-red-500 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] cursor-pointer"
            >
              <QrCode className="w-4 h-4 stroke-[2.5]" />
              <span>COACH CHECK-IN PORTAL</span>
            </Link>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider border border-white/10 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Edit3 className="w-4 h-4 text-red-500" />
              <span>{isEditing ? 'CANCEL' : 'EDIT CREDENTIALS'}</span>
            </button>

            <button
              onClick={handleShare}
              className="px-4 py-2.5 rounded-full bg-black/80 hover:bg-black text-white font-bold text-xs uppercase tracking-wider border border-red-600/40 flex items-center gap-2 transition-all cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4 text-red-500" /> : <Share2 className="w-4 h-4 text-red-500" />}
              <span>{copiedLink ? 'COPIED!' : 'SHARE'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Edit Bio & Coaching Credentials Modal */}
      {isEditing && (
        <form onSubmit={handleSave} className="bg-[#212A31] border border-red-600/40 rounded-3xl p-6 shadow-[0_0_30px_rgba(16,185,129,0.2)] space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-black uppercase text-red-500 tracking-wider flex items-center gap-2">
              <Edit3 className="w-4 h-4" />
              Update Coaching Profile & School Details
            </h3>
            <span className="text-xs text-slate-400 font-mono">Real-Time Coach Directory Sync</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-black/40 rounded-2xl border border-white/10">
            <ProfilePictureUploader
              currentPhotoUrl={editData.avatarUrl || editData.photoURL || profile.photoURL || profile.avatarUrl}
              size="sm"
              onSuccess={(newUrl) => {
                setEditData(prev => ({ ...prev, avatarUrl: newUrl, photoURL: newUrl }));
              }}
            />
            <div className="flex-1 w-full space-y-2">
              <label className="text-[11px] font-bold text-red-400 uppercase block">
                Profile Picture Upload
              </label>
              <input
                type="text"
                value={editData.avatarUrl}
                onChange={(e) => setEditData({ ...editData, avatarUrl: e.target.value, photoURL: e.target.value })}
                className="w-full bg-[#212A31] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                placeholder="https://images.unsplash.com/... or upload photo above"
              />
              <p className="text-[10px] text-slate-400">
                Click above or drag & drop a photo file to upload directly from your gallery.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Coach Full Name</label>
              <input
                type="text"
                value={editData.displayName}
                onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">School / Club Program</label>
              <input
                type="text"
                value={editData.teamName}
                onChange={(e) => setEditData({ ...editData, teamName: e.target.value })}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Title / Staff Role</label>
              <input
                type="text"
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Primary Sport</label>
              <input
                type="text"
                value={editData.sport}
                onChange={(e) => setEditData({ ...editData, sport: e.target.value })}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Career Record</label>
              <input
                type="text"
                value={editData.careerRecord}
                onChange={(e) => setEditData({ ...editData, careerRecord: e.target.value })}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">License & Certifications</label>
              <input
                type="text"
                value={editData.license}
                onChange={(e) => setEditData({ ...editData, license: e.target.value })}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Coach Bio & Program Philosophy</label>
            <textarea
              rows={3}
              value={editData.bio}
              onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
              className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-bold hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(220,38,38,0.5)] transition-all"
            >
              <Save className="w-4 h-4 stroke-[2.5]" />
              <span>Save Coaching Profile</span>
            </button>
          </div>
        </form>
      )}

      {/* Grid Overview Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#050505] border border-white/10 p-5 rounded-2xl space-y-1 relative overflow-hidden">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>CAREER RECORD</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">{editData.careerRecord.split(' ')[0]}</div>
          <p className="text-[10px] text-slate-400 font-mono">Win Rate: 81.4% • 12 Yrs</p>
        </div>

        <div className="bg-[#050505] border border-white/10 p-5 rounded-2xl space-y-1 relative overflow-hidden">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-red-500" />
            <span>COLLEGE PLACEMENTS</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-red-500 font-mono">{editData.d1PlacedCount.split(' ')[0]} Athletes</div>
          <p className="text-[10px] text-slate-400 font-mono">D1 / D2 / D3 Scholarships</p>
        </div>

        <div className="bg-[#050505] border border-white/10 p-5 rounded-2xl space-y-1 relative overflow-hidden">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-slate-300" />
            <span>TITLE ACCOLADES</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">3x State Champs</div>
          <p className="text-[10px] text-slate-400 font-mono">5x Division Titles</p>
        </div>

        <div className="bg-[#050505] border border-white/10 p-5 rounded-2xl space-y-1 relative overflow-hidden">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-red-500" />
            <span>LICENSE STATUS</span>
          </div>
          <div className="text-sm font-black text-red-400 uppercase truncate">USA BKB GOLD</div>
          <p className="text-[10px] text-slate-400 font-mono">NFHS Sanctioned</p>
        </div>
      </div>

      {/* Main Content Sections: Program Overview & Roster Portal Link */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Coaching Bio & Philosophy */}
          <div className="bg-[#050505] border border-white/10 rounded-3xl p-6 space-y-4">
            <h3 className="text-base font-black uppercase text-white tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
              <Briefcase className="w-4 h-4 text-red-500" />
              Program Philosophy & Coaching Bio
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
              {editData.bio}
            </p>
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-white block">Official Sideline Accreditation License</span>
                <span className="text-[11px] font-mono text-red-500">{editData.license}</span>
              </div>
              <span className="px-2.5 py-1 text-[10px] font-black bg-red-600/20 text-red-400 border border-red-600/30 rounded-md uppercase">
                ACTIVE
              </span>
            </div>
          </div>

          {/* Managed Teams & Roster Link */}
          <div className="bg-[#050505] border border-white/10 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-black uppercase text-white tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-red-500" />
                Active Managed Team Rosters
              </h3>
              <Link to="/organizations" className="text-xs text-red-500 font-bold hover:underline flex items-center gap-1">
                <span>Manage Team Rosters</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white uppercase">{editData.teamName}</span>
                  <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-red-600/20 text-red-400 rounded">Varsity Boys</span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 space-y-1">
                  <p>• 15 Registered Athletes</p>
                  <p>• Locked Roster Approved for Sanctioned Play</p>
                  <p>• Upcoming: Tri-State Showcase Tournament</p>
                </div>
                <Link
                  to="/organizations"
                  className="w-full py-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 font-bold text-[11px] uppercase rounded-xl border border-red-600/30 flex items-center justify-center gap-1.5 transition-all"
                >
                  <span>Open Roster Manager</span>
                </Link>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white uppercase">{editData.teamName} (JV)</span>
                  <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-[#E5B868]/20 text-cyan-300 rounded">Junior Varsity</span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 space-y-1">
                  <p>• 12 Registered Athletes</p>
                  <p>• Developmental Program Roster</p>
                  <p>• Upcoming: Summer Development League</p>
                </div>
                <Link
                  to="/organizations"
                  className="w-full py-2 bg-white/5 hover:bg-white/10 text-slate-200 font-bold text-[11px] uppercase rounded-xl border border-white/10 flex items-center justify-center gap-1.5 transition-all"
                >
                  <span>View Roster</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar: Recruiter Contact & Quick Links */}
        <div className="space-y-6">
          <div className="bg-[#050505] border border-white/10 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
              <Mail className="w-4 h-4 text-red-500" />
              Recruiting Contact Hub
            </h3>
            <p className="text-xs text-slate-400">
              Direct contact channels for college scouts, university recruiters, and event directors.
            </p>

            <div className="space-y-3 pt-1 text-xs font-mono">
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-3">
                <Mail className="w-4 h-4 text-red-500 shrink-0" />
                <div className="truncate">
                  <span className="text-[10px] text-slate-400 block uppercase">Official Email</span>
                  <a href={`mailto:${editData.email}`} className="text-white hover:text-red-400 font-bold truncate block">{editData.email}</a>
                </div>
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-3">
                <Phone className="w-4 h-4 text-red-500 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Staff Office Line</span>
                  <span className="text-white font-bold">{editData.phone}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Staff Actions */}
          <div className="bg-[#050505] border border-white/10 rounded-3xl p-6 space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Staff Quick Actions</h3>

            <Link
              to="/coach-check-in"
              className="w-full p-3 bg-red-600/15 hover:bg-red-600/25 border border-red-600/40 rounded-2xl flex items-center justify-between text-xs text-red-400 font-bold transition-all"
            >
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-red-500" />
                <span>Coach Check-In Portal</span>
              </div>
              <span className="text-[10px] bg-red-600 text-black px-2 py-0.5 rounded font-black">SCAN PASS</span>
            </Link>

            <Link
              to="/events"
              className="w-full p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-between text-xs text-slate-200 font-bold transition-all"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-300" />
                <span>Sanctioned Tournament Schedule</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </Link>

            <Link
              to="/scout"
              className="w-full p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-between text-xs text-slate-200 font-bold transition-all"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Explore Recruiter Matrix</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
