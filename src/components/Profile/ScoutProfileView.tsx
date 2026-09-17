import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { VerifiedBadge } from '../Common/VerifiedBadge';
import { UserProfile } from '../../types';
import { 
  Eye, 
  ShieldCheck, 
  Sparkles, 
  Bookmark, 
  Search, 
  FileText, 
  Edit3, 
  Share2, 
  Check, 
  ExternalLink, 
  Building2, 
  MapPin, 
  Award,
  Filter,
  User,
  Trash2,
  Save
} from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';
import { ProfilePictureUploader } from '../AthleteProfile/ProfilePictureUploader';
import { getAthleteProfileFromCache } from '../../services/firestoreCacheService';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export const ScoutProfileView: React.FC = () => {
  const { profile, role, updateUserProfile, bookmarks, toggleBookmark } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [savedAthletes, setSavedAthletes] = useState<UserProfile[]>([]);

  const [editData, setEditData] = useState({
    displayName: profile?.displayName || 'Coach Marcus Vance',
    photoURL: profile?.photoURL || profile?.avatarUrl || '',
    avatarUrl: profile?.avatarUrl || profile?.photoURL || '',
    agency: profile?.highSchool || 'Northeast College Scouting Service & PrepHoops',
    title: 'Senior D1 Talent Evaluator & Recruiting Analyst',
    region: 'Northeast & Mid-Atlantic HS Circuit',
    targetClasses: 'Class of 2025, 2026 & 2027',
    primarySports: profile?.sport || 'Basketball, Flag Football & Football',
    evaluationsCount: '142 Verified Reports Logged',
    bio: profile?.bio || 'Dedicated NCAA D1/D2 recruiting analyst evaluating top high school talent, verified measurables, and game tape performance across sanctioned showcases.',
    email: profile?.email || 'scout@prephoops-eval.com',
    twitter: profile?.social?.twitter || '@ScoutVance_D1'
  });

  // Load bookmarked athletes
  useEffect(() => {
    const fetchSaved = async () => {
      const list: UserProfile[] = [];
      for (const uid of bookmarks) {
        try {
          const cachedAthlete = await getAthleteProfileFromCache(uid);
          if (cachedAthlete) {
            list.push(cachedAthlete);
          }
        } catch (err) {
          console.warn('Error retrieving saved athlete:', err);
        }
      }

      if (list.length === 0 && bookmarks.length === 0 && db) {
        try {
          const snap = await getDocs(query(collection(db, 'users'), limit(3)));
          if (!snap.empty) {
            setSavedAthletes(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
            return;
          }
        } catch (err) {
          console.warn('Error fetching fallback athletes for scout:', err);
        }
      }
      setSavedAthletes(list);
    };
    fetchSaved();
  }, [bookmarks]);

  if (!profile) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const finalPhoto = editData.photoURL || editData.avatarUrl || profile.photoURL || profile.avatarUrl;
    updateUserProfile({
      displayName: editData.displayName,
      photoURL: finalPhoto,
      avatarUrl: finalPhoto,
      highSchool: editData.agency,
      sport: editData.primarySports,
      bio: editData.bio,
      social: {
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
      {/* Top Banner / Scout Identity Header */}
      <div className="relative rounded-3xl overflow-hidden bg-[#050505] border border-cyan-500/30 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-slate-700/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="relative">
              <img 
                src={profile.photoURL || profile.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80'} 
                alt={profile.displayName} 
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-cyan-400/80 shadow-[0_0_25px_rgba(6,182,212,0.3)]"
              />
              <div className="absolute -bottom-2 -right-2 bg-slate-700 text-black font-black text-[10px] px-2 py-0.5 rounded-md uppercase tracking-widest flex items-center gap-1 shadow-md">
                <Eye className="w-3 h-3" /> SCOUT
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest bg-slate-700 text-black rounded-sm shadow-[0_0_12px_rgba(6,182,212,0.4)]">
                  VERIFIED D1 RECRUITER PASS
                </span>
                <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest bg-white/5 text-cyan-300 border border-cyan-500/30 rounded-sm flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-slate-300" />
                  ACCREDITED EVALUATOR
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black italic tracking-tight text-white uppercase font-sans flex items-center gap-2.5 flex-wrap">
                <span>{editData.displayName}</span>
                <VerifiedBadge size="lg" showLabel />
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 font-bold flex flex-wrap items-center gap-2">
                <span className="text-slate-300">{editData.title}</span>
                <span>•</span>
                <span className="text-white">{editData.agency}</span>
                <span>•</span>
                <span className="text-slate-400">{editData.region}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
            <RouterLink
              to="/scout"
              className="flex-1 md:flex-initial px-4 py-2.5 rounded-full bg-slate-700 hover:bg-slate-600 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer"
            >
              <Sparkles className="w-4 h-4 stroke-[2.5]" />
              <span>OPEN RECRUITER MATRIX</span>
            </RouterLink>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider border border-white/10 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Edit3 className="w-4 h-4 text-slate-300" />
              <span>{isEditing ? 'CANCEL' : 'EDIT SCOUT PROFILE'}</span>
            </button>

            <button
              onClick={handleShare}
              className="px-4 py-2.5 rounded-full bg-black/80 hover:bg-black text-white font-bold text-xs uppercase tracking-wider border border-[#E5B868]/40 flex items-center gap-2 transition-all cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4 text-slate-300" /> : <Share2 className="w-4 h-4 text-slate-300" />}
              <span>{copiedLink ? 'COPIED!' : 'SHARE'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Edit Form Modal */}
      {isEditing && (
        <form onSubmit={handleSave} className="bg-[#212A31] border border-[#E5B868]/40 rounded-3xl p-6 shadow-[0_0_30px_rgba(6,182,212,0.2)] space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-black uppercase text-slate-300 tracking-wider flex items-center gap-2">
              <Edit3 className="w-4 h-4" />
              Update Scouting Credentials & Evaluation Region
            </h3>
            <span className="text-xs text-slate-400 font-mono">Real-Time Recruiter Network Sync</span>
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
              <label className="text-[11px] font-bold text-cyan-400 uppercase block">
                Scout Profile Picture Upload
              </label>
              <input
                type="text"
                value={editData.avatarUrl}
                onChange={(e) => setEditData({ ...editData, avatarUrl: e.target.value, photoURL: e.target.value })}
                className="w-full bg-[#212A31] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                placeholder="https://images.unsplash.com/... or upload photo above"
              />
              <p className="text-[10px] text-slate-400">
                Click above or drag & drop a photo file to upload directly from your gallery.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Scout Full Name</label>
              <input
                type="text"
                value={editData.displayName}
                onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Agency / University / Outlet</label>
              <input
                type="text"
                value={editData.agency}
                onChange={(e) => setEditData({ ...editData, agency: e.target.value })}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Title / Role</label>
              <input
                type="text"
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Scouting Region</label>
              <input
                type="text"
                value={editData.region}
                onChange={(e) => setEditData({ ...editData, region: e.target.value })}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Target Graduation Classes</label>
              <input
                type="text"
                value={editData.targetClasses}
                onChange={(e) => setEditData({ ...editData, targetClasses: e.target.value })}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Primary Sports Covered</label>
              <input
                type="text"
                value={editData.primarySports}
                onChange={(e) => setEditData({ ...editData, primarySports: e.target.value })}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Scout Bio & Evaluation Criteria</label>
            <textarea
              rows={3}
              value={editData.bio}
              onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
              className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
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
              className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(8,145,178,0.5)] transition-all"
            >
              <Save className="w-4 h-4 stroke-[2.5]" />
              <span>Save Scout Profile</span>
            </button>
          </div>
        </form>
      )}

      {/* Scout Stats Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#050505] border border-white/10 p-5 rounded-2xl space-y-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-300" />
            <span>EVALUATION LOGS</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">142 Reports</div>
          <p className="text-[10px] text-slate-400 font-mono">Verified D1/D2 Matrix Cards</p>
        </div>

        <div className="bg-[#050505] border border-white/10 p-5 rounded-2xl space-y-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Bookmark className="w-3.5 h-3.5 text-amber-400" />
            <span>SAVED SHORTLIST</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono">{savedAthletes.length} Prospects</div>
          <p className="text-[10px] text-slate-400 font-mono">Bookmarked Athletes</p>
        </div>

        <div className="bg-[#050505] border border-white/10 p-5 rounded-2xl space-y-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            <span>SCOUTING REGION</span>
          </div>
          <div className="text-sm font-black text-white uppercase truncate">{editData.region}</div>
          <p className="text-[10px] text-slate-400 font-mono">Sanctioned Circuit</p>
        </div>

        <div className="bg-[#050505] border border-white/10 p-5 rounded-2xl space-y-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-300" />
            <span>RECRUITER STATUS</span>
          </div>
          <div className="text-sm font-black text-cyan-300 uppercase">ACCREDITED D1</div>
          <p className="text-[10px] text-slate-400 font-mono">Full Matrix Access</p>
        </div>
      </div>

      {/* Main Workspace: Bookmarked Prospects Shortlist & Evaluation Criteria */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Saved Prospects Shortlist */}
          <div className="bg-[#050505] border border-white/10 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-black uppercase text-white tracking-wider flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-slate-300" />
                Bookmarked Prospect Shortlist ({savedAthletes.length})
              </h3>
              <RouterLink to="/scout" className="text-xs text-slate-300 font-bold hover:underline flex items-center gap-1">
                <span>View Full Matrix</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </RouterLink>
            </div>

            {savedAthletes.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2 border border-dashed border-white/10 rounded-2xl">
                <Bookmark className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-xs font-bold">No prospects bookmarked yet.</p>
                <p className="text-[10px]">Browse the Recruiter Matrix and click the bookmark star to save prospects here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {savedAthletes.map((ath) => (
                  <div key={ath.uid} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 relative group hover:border-cyan-500/50 transition-all">
                    <div className="flex items-center gap-3">
                      <img 
                        src={ath.photoURL || ath.avatarUrl || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=150&q=80'} 
                        alt={ath.displayName} 
                        className="w-12 h-12 rounded-xl object-cover border border-white/10"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-black text-white uppercase truncate flex items-center gap-1">
                          <span>{ath.displayName}</span>
                          <VerifiedBadge size="sm" />
                        </h4>
                        <p className="text-[10px] text-slate-300 font-bold">{ath.sport} • {ath.position}</p>
                        <p className="text-[10px] text-slate-400">{ath.highSchool} ({ath.state}) • Class of {ath.gradYear}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[10px] font-mono">
                      <span className="text-slate-300">GPA: {ath.gpa || '3.5'} • {ath.height || "6'1\""}</span>
                      <RouterLink 
                        to={`/athlete/${ath.uid}`} 
                        className="text-slate-300 hover:text-cyan-300 font-bold flex items-center gap-1"
                      >
                        <span>Card</span>
                        <ExternalLink className="w-3 h-3" />
                      </RouterLink>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Scout Philosophy */}
          <div className="bg-[#050505] border border-white/10 rounded-3xl p-6 space-y-3">
            <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
              <Award className="w-4 h-4 text-slate-300" />
              Evaluation Criteria & Scouting Focus
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {editData.bio}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="px-2.5 py-1 text-[10px] font-mono bg-white/5 border border-white/10 text-cyan-300 rounded-lg">
                Focus: {editData.targetClasses}
              </span>
              <span className="px-2.5 py-1 text-[10px] font-mono bg-white/5 border border-white/10 text-cyan-300 rounded-lg">
                Sports: {editData.primarySports}
              </span>
              <span className="px-2.5 py-1 text-[10px] font-mono bg-white/5 border border-white/10 text-amber-300 rounded-lg">
                Region: {editData.region}
              </span>
            </div>
          </div>
        </div>

        {/* Scout Sidebar */}
        <div className="space-y-6">
          <div className="bg-[#050505] border border-white/10 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
              <Building2 className="w-4 h-4 text-slate-300" />
              Scout Organization & Contact
            </h3>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase block">Affiliation</span>
                <span className="text-white font-bold">{editData.agency}</span>
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase block">Scout Email</span>
                <a href={`mailto:${editData.email}`} className="text-slate-300 hover:underline font-bold">{editData.email}</a>
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase block">Social Channel</span>
                <span className="text-slate-200">{editData.twitter}</span>
              </div>
            </div>
          </div>

          {/* Quick Matrix Tools */}
          <div className="bg-[#050505] border border-white/10 rounded-3xl p-6 space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Scout Matrix Shortcuts</h3>

            <RouterLink
              to="/scout"
              className="w-full p-3 bg-slate-700/15 hover:bg-slate-700/25 border border-[#E5B868]/40 rounded-2xl flex items-center justify-between text-xs text-cyan-300 font-bold transition-all"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-slate-300" />
                <span>Launch Recruiter Matrix</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
            </RouterLink>

            <RouterLink
              to="/events"
              className="w-full p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-between text-xs text-slate-200 font-bold transition-all"
            >
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-amber-400" />
                <span>Sanctioned Showcases</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  );
};
