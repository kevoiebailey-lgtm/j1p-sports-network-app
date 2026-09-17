import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { VerifiedBadge } from '../Common/VerifiedBadge';
import { 
  Building2, 
  ShieldCheck, 
  Calendar, 
  Users, 
  Trophy, 
  Plus, 
  Edit3, 
  Share2, 
  Check, 
  ExternalLink, 
  Globe, 
  Mail, 
  MapPin, 
  CheckCircle2, 
  QrCode,
  Layers,
  Save
} from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';
import { ProfilePictureUploader } from '../AthleteProfile/ProfilePictureUploader';

export const OrganizationProfileView: React.FC = () => {
  const { profile, role, updateUserProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [editData, setEditData] = useState({
    displayName: profile?.displayName || 'Tri-State Sanctioned Athletic Association',
    photoURL: profile?.photoURL || profile?.avatarUrl || '',
    avatarUrl: profile?.avatarUrl || profile?.photoURL || '',
    orgType: 'Sanctioned AAU Circuit & High School Event Operator',
    hq: 'North Bergen, NJ (Mid-Atlantic Region)',
    foundedYear: '2016',
    sanctionLicense: 'NJ-AAU-98421-VERIFIED',
    eventsHostedCount: '24 Sanctioned Tournaments',
    teamsEnrolledCount: '68 Enrolled AAU & HS Programs',
    athletesImpacted: '1,200+ Registered Student-Athletes',
    bio: profile?.bio || 'Official Sanctioned Event Operator hosting premier youth basketball, flag football, and lacrosse showcase tournaments with certified referee crews and live stat tracking.',
    website: 'https://tristatesports.org',
    email: profile?.email || 'events@tristatesports.org',
    phone: '(555) 987-6543'
  });

  if (!profile) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const finalPhoto = editData.photoURL || editData.avatarUrl || profile.photoURL || profile.avatarUrl;
    updateUserProfile({
      displayName: editData.displayName,
      photoURL: finalPhoto,
      avatarUrl: finalPhoto,
      highSchool: editData.displayName,
      bio: editData.bio
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
      {/* Top Banner / Org Identity Header */}
      <div className="relative rounded-3xl overflow-hidden bg-[#050505] border border-indigo-500/30 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="relative">
              <img 
                src={profile.photoURL || profile.avatarUrl || 'https://images.unsplash.com/photo-1577471488278-16eec37ffcc2?auto=format&fit=crop&w=300&q=80'} 
                alt={profile.displayName} 
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-indigo-400/80 shadow-[0_0_25px_rgba(99,102,241,0.3)]"
              />
              <div className="absolute -bottom-2 -right-2 bg-indigo-500 text-white font-black text-[10px] px-2 py-0.5 rounded-md uppercase tracking-widest flex items-center gap-1 shadow-md">
                <Building2 className="w-3 h-3" /> ORG
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest bg-indigo-500 text-white rounded-sm shadow-[0_0_12px_rgba(99,102,241,0.4)]">
                  SANCTIONED EVENT OPERATOR
                </span>
                <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest bg-white/5 text-indigo-300 border border-indigo-500/30 rounded-sm flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-indigo-400" />
                  VERIFIED ORGANIZER LICENSE
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black italic tracking-tight text-white uppercase font-sans flex items-center gap-2.5 flex-wrap">
                <span>{editData.displayName}</span>
                <VerifiedBadge size="lg" showLabel />
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 font-bold flex flex-wrap items-center gap-2">
                <span className="text-indigo-400">{editData.orgType}</span>
                <span>•</span>
                <span className="text-white">{editData.hq}</span>
                <span>•</span>
                <span className="text-slate-400">EST. {editData.foundedYear}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
            <RouterLink
              to="/events"
              className="flex-1 md:flex-initial px-4 py-2.5 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] cursor-pointer"
            >
              <Calendar className="w-4 h-4 stroke-[2.5]" />
              <span>MANAGE SANCTIONED EVENTS</span>
            </RouterLink>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider border border-white/10 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Edit3 className="w-4 h-4 text-indigo-400" />
              <span>{isEditing ? 'CANCEL' : 'EDIT ORG DETAILS'}</span>
            </button>

            <button
              onClick={handleShare}
              className="px-4 py-2.5 rounded-full bg-black/80 hover:bg-black text-white font-bold text-xs uppercase tracking-wider border border-indigo-500/40 flex items-center gap-2 transition-all cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4 text-indigo-400" /> : <Share2 className="w-4 h-4 text-indigo-400" />}
              <span>{copiedLink ? 'COPIED!' : 'SHARE'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Edit Form Modal */}
      {isEditing && (
        <form onSubmit={handleSave} className="bg-[#212A31] border border-indigo-500/40 rounded-3xl p-6 shadow-[0_0_30px_rgba(99,102,241,0.2)] space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-black uppercase text-indigo-400 tracking-wider flex items-center gap-2">
              <Edit3 className="w-4 h-4" />
              Update Organization Credentials & Event Operations
            </h3>
            <span className="text-xs text-slate-400 font-mono">Real-Time Sanctioned Directory Sync</span>
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
              <label className="text-[11px] font-bold text-indigo-400 uppercase block">
                Organization Profile Picture / Logo Upload
              </label>
              <input
                type="text"
                value={editData.avatarUrl}
                onChange={(e) => setEditData({ ...editData, avatarUrl: e.target.value, photoURL: e.target.value })}
                className="w-full bg-[#212A31] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-400 focus:outline-none"
                placeholder="https://images.unsplash.com/... or upload photo above"
              />
              <p className="text-[10px] text-slate-400">
                Click above or drag & drop a logo/image file to upload directly from your device.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Organization Name</label>
              <input
                type="text"
                value={editData.displayName}
                onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Organization Type</label>
              <input
                type="text"
                value={editData.orgType}
                onChange={(e) => setEditData({ ...editData, orgType: e.target.value })}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Headquarters & Region</label>
              <input
                type="text"
                value={editData.hq}
                onChange={(e) => setEditData({ ...editData, hq: e.target.value })}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Sanction License ID</label>
              <input
                type="text"
                value={editData.sanctionLicense}
                onChange={(e) => setEditData({ ...editData, sanctionLicense: e.target.value })}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Official Website</label>
              <input
                type="text"
                value={editData.website}
                onChange={(e) => setEditData({ ...editData, website: e.target.value })}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Operations Email</label>
              <input
                type="text"
                value={editData.email}
                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Organization Mission & Description</label>
            <textarea
              rows={3}
              value={editData.bio}
              onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
              className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-400 focus:outline-none"
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
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(79,70,229,0.5)] transition-all"
            >
              <Save className="w-4 h-4 stroke-[2.5]" />
              <span>Save Organization Details</span>
            </button>
          </div>
        </form>
      )}

      {/* Org Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#050505] border border-white/10 p-5 rounded-2xl space-y-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>HOSTED EVENTS</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">24 Tournaments</div>
          <p className="text-[10px] text-slate-400 font-mono">Sanctioned Showcases</p>
        </div>

        <div className="bg-[#050505] border border-white/10 p-5 rounded-2xl space-y-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-red-500" />
            <span>ENROLLED TEAMS</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-red-500 font-mono">68 AAU / HS Clubs</div>
          <p className="text-[10px] text-slate-400 font-mono">Active Program Roster</p>
        </div>

        <div className="bg-[#050505] border border-white/10 p-5 rounded-2xl space-y-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-300" />
            <span>ATHLETES IMPACTED</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">1,200+ Athletes</div>
          <p className="text-[10px] text-slate-400 font-mono">Verified Digital Passes</p>
        </div>

        <div className="bg-[#050505] border border-white/10 p-5 rounded-2xl space-y-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>SANCTION STATUS</span>
          </div>
          <div className="text-xs font-black text-indigo-300 uppercase truncate">{editData.sanctionLicense}</div>
          <p className="text-[10px] text-slate-400 font-mono">Official License</p>
        </div>
      </div>

      {/* Main Content: Hosted Events & Program Roster Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#050505] border border-white/10 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-black uppercase text-white tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                Sanctioned Tournament & Event Portfolio
              </h3>
              <RouterLink to="/events" className="text-xs text-indigo-400 font-bold hover:underline flex items-center gap-1">
                <span>View Event Hub</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </RouterLink>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white uppercase">Tri-State Summer Classic 2026</span>
                  <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-indigo-500/20 text-indigo-300 rounded">FEATURED</span>
                </div>
                <p className="text-[10px] font-mono text-slate-400">📅 Aug 14-16, 2026 • Newark Athletic Center</p>
                <div className="text-[11px] font-mono text-slate-300 space-y-1">
                  <p>• 32 Registered AAU & Varsity Teams</p>
                  <p>• Verified QR Check-In Scanner Enabled</p>
                </div>
                <RouterLink 
                  to="/events" 
                  className="w-full py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-bold text-[11px] uppercase rounded-xl border border-indigo-500/40 flex items-center justify-center gap-1 transition-all"
                >
                  <span>Event Dashboard</span>
                </RouterLink>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white uppercase">East Coast D1 Showcase</span>
                  <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-red-600/20 text-red-400 rounded">UPCOMING</span>
                </div>
                <p className="text-[10px] font-mono text-slate-400">📅 Sep 05, 2026 • St. Anthony Sports Complex</p>
                <div className="text-[11px] font-mono text-slate-300 space-y-1">
                  <p>• 24 Top Showcase Teams</p>
                  <p>• Live Recruiter Matrix Integration</p>
                </div>
                <RouterLink 
                  to="/events" 
                  className="w-full py-2 bg-white/5 hover:bg-white/10 text-slate-200 font-bold text-[11px] uppercase rounded-xl border border-white/10 flex items-center justify-center gap-1 transition-all"
                >
                  <span>View Details</span>
                </RouterLink>
              </div>
            </div>
          </div>

          <div className="bg-[#050505] border border-white/10 rounded-3xl p-6 space-y-3">
            <h3 className="text-sm font-black uppercase text-white tracking-wider border-b border-white/10 pb-3">
              Organization Mission & Operations
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {editData.bio}
            </p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-[#050505] border border-white/10 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
              <Globe className="w-4 h-4 text-indigo-400" />
              Official Operations Contact
            </h3>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase block">Website</span>
                <a href={editData.website} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline font-bold truncate block">{editData.website}</a>
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase block">Operations Email</span>
                <a href={`mailto:${editData.email}`} className="text-white hover:text-indigo-300 font-bold">{editData.email}</a>
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase block">Support Line</span>
                <span className="text-white font-bold">{editData.phone}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#050505] border border-white/10 rounded-3xl p-6 space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Operator Shortcuts</h3>

            <RouterLink
              to="/organizations"
              className="w-full p-3 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/40 rounded-2xl flex items-center justify-between text-xs text-indigo-300 font-bold transition-all"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                <span>Roster & Organization Hub</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
            </RouterLink>

            <RouterLink
              to="/coach-check-in"
              className="w-full p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-between text-xs text-slate-200 font-bold transition-all"
            >
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-red-500" />
                <span>Check-In Scanner Portal</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  );
};
