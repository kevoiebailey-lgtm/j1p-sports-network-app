import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  User, 
  QrCode, 
  Tv, 
  Calendar, 
  Heart, 
  Star, 
  Edit3, 
  Share2, 
  Check, 
  ExternalLink, 
  ShieldCheck, 
  Play, 
  Flame, 
  Ticket,
  Save,
  Users
} from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';
import { ProfilePictureUploader } from '../AthleteProfile/ProfilePictureUploader';
import { collection, query, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserProfile } from '../../types';

export const FanProfileView: React.FC = () => {
  const { profile, role, updateUserProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [followedAthletes, setFollowedAthletes] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(query(collection(db, 'users'), limit(4)), (snap) => {
      if (!snap.empty) {
        setFollowedAthletes(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
      } else {
        setFollowedAthletes([]);
      }
    }, (err) => {
      console.warn('Error fetching athletes for FanProfileView:', err);
      setFollowedAthletes([]);
    });
    return () => unsub();
  }, []);

  const [editData, setEditData] = useState({
    displayName: profile?.displayName || 'Alex Mercer',
    photoURL: profile?.photoURL || profile?.avatarUrl || '',
    avatarUrl: profile?.avatarUrl || profile?.photoURL || '',
    favoriteSports: profile?.sport || 'Basketball, Flag Football',
    favoriteTeam: profile?.highSchool || 'St. Anthony Prep Knights & Camden High',
    state: profile?.state || 'NJ',
    memberSince: '2024',
    passId: 'FAN-PASS-88491',
    bio: profile?.bio || 'Passionate high school sports enthusiast supporting local NJ talent, live game broadcasts, and sanctioned tournament showcases.'
  });

  if (!profile) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const finalPhoto = editData.photoURL || editData.avatarUrl || profile.photoURL || profile.avatarUrl;
    updateUserProfile({
      displayName: editData.displayName,
      photoURL: finalPhoto,
      avatarUrl: finalPhoto,
      highSchool: editData.favoriteTeam,
      state: editData.state,
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
      {/* Top Banner / Fan Identity Header */}
      <div className="relative rounded-3xl overflow-hidden bg-[#050505] border border-amber-500/30 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="relative">
              <img 
                src={profile.photoURL || profile.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80'} 
                alt={profile.displayName} 
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-amber-400/80 shadow-[0_0_25px_rgba(245,158,11,0.3)]"
              />
              <div className="absolute -bottom-2 -right-2 bg-amber-500 text-black font-black text-[10px] px-2 py-0.5 rounded-md uppercase tracking-widest flex items-center gap-1 shadow-md">
                <Ticket className="w-3 h-3" /> FAN PASS
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest bg-amber-500 text-black rounded-sm shadow-[0_0_12px_rgba(245,158,11,0.4)]">
                  VERIFIED SPECTATOR MEMBER
                </span>
                <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest bg-white/5 text-amber-300 border border-amber-500/30 rounded-sm flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-amber-400" />
                  GATE PASS ID: {editData.passId}
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black italic tracking-tight text-white uppercase font-sans flex items-center gap-2.5 flex-wrap">
                <span>{editData.displayName}</span>
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 font-bold flex flex-wrap items-center gap-2">
                <span className="text-amber-400">Fav Sports: {editData.favoriteSports}</span>
                <span>•</span>
                <span className="text-white">Fav Teams: {editData.favoriteTeam}</span>
                <span>•</span>
                <span className="text-slate-400">MEMBER SINCE {editData.memberSince}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
            <RouterLink
              to="/live"
              className="flex-1 md:flex-initial px-4 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)] cursor-pointer"
            >
              <Tv className="w-4 h-4 stroke-[2.5]" />
              <span>WATCH LIVE STREAMS</span>
            </RouterLink>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider border border-white/10 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Edit3 className="w-4 h-4 text-amber-400" />
              <span>{isEditing ? 'CANCEL' : 'EDIT FAN PROFILE'}</span>
            </button>

            <button
              onClick={handleShare}
              className="px-4 py-2.5 rounded-full bg-black/80 hover:bg-black text-white font-bold text-xs uppercase tracking-wider border border-amber-500/40 flex items-center gap-2 transition-all cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4 text-amber-400" /> : <Share2 className="w-4 h-4 text-amber-400" />}
              <span>{copiedLink ? 'COPIED!' : 'SHARE'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Edit Form Modal */}
      {isEditing && (
        <form onSubmit={handleSave} className="bg-[#212A31] border border-amber-500/40 rounded-3xl p-6 shadow-[0_0_30px_rgba(245,158,11,0.2)] space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-black uppercase text-amber-400 tracking-wider flex items-center gap-2">
              <Edit3 className="w-4 h-4" />
              Update Spectator Preferences & Favorite Teams
            </h3>
            <span className="text-xs text-slate-400 font-mono">Fan Pass Settings</span>
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
              <label className="text-[11px] font-bold text-amber-400 uppercase block">
                Profile Picture Upload
              </label>
              <input
                type="text"
                value={editData.avatarUrl}
                onChange={(e) => setEditData({ ...editData, avatarUrl: e.target.value, photoURL: e.target.value })}
                className="w-full bg-[#212A31] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                placeholder="https://images.unsplash.com/... or upload photo above"
              />
              <p className="text-[10px] text-slate-400">
                Click above or drag & drop a photo file to upload directly from your gallery.
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
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Favorite Sports</label>
              <input
                type="text"
                value={editData.favoriteSports}
                onChange={(e) => setEditData({ ...editData, favoriteSports: e.target.value })}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Favorite High School / AAU Teams</label>
              <input
                type="text"
                value={editData.favoriteTeam}
                onChange={(e) => setEditData({ ...editData, favoriteTeam: e.target.value })}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Fan Bio</label>
            <textarea
              rows={2}
              value={editData.bio}
              onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
              className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
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
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.5)] transition-all"
            >
              <Save className="w-4 h-4 stroke-[2.5]" />
              <span>Save Profile</span>
            </button>
          </div>
        </form>
      )}

      {/* Fan Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#050505] border border-white/10 p-5 rounded-2xl space-y-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Tv className="w-3.5 h-3.5 text-amber-400" />
            <span>STREAMS WATCHED</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">18 Games</div>
          <p className="text-[10px] text-slate-400 font-mono">Live Broadcasts Attended</p>
        </div>

        <div className="bg-[#050505] border border-white/10 p-5 rounded-2xl space-y-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-red-400" />
            <span>FOLLOWED ATHLETES</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-red-400 font-mono">6 Players</div>
          <p className="text-[10px] text-slate-400 font-mono">Live Stat Alerts Enabled</p>
        </div>

        <div className="bg-[#050505] border border-white/10 p-5 rounded-2xl space-y-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <QrCode className="w-3.5 h-3.5 text-red-500" />
            <span>GATE CHECK-INS</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-red-500 font-mono">4 Events</div>
          <p className="text-[10px] text-slate-400 font-mono">Sanctioned Spectator Pass</p>
        </div>

        <div className="bg-[#050505] border border-white/10 p-5 rounded-2xl space-y-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>SPECTATOR STATUS</span>
          </div>
          <div className="text-xs font-black text-amber-300 uppercase truncate">ACTIVE SPECTATOR</div>
          <p className="text-[10px] text-slate-400 font-mono">Verified Fan Pass</p>
        </div>
      </div>

      {/* Spectator Digital Gate Pass & Followed Athletes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Followed Prospects */}
          <div className="bg-[#050505] border border-white/10 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-black uppercase text-white tracking-wider flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" />
                Followed Athletes & Favorite Teams
              </h3>
              <RouterLink to="/athletes" className="text-xs text-amber-400 font-bold hover:underline flex items-center gap-1">
                <span>Discover Athletes</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </RouterLink>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {followedAthletes.length > 0 ? (
                followedAthletes.slice(0, 2).map((ath) => (
                  <div key={ath.uid} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img 
                        src={ath.photoURL || ath.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'} 
                        alt={ath.displayName} 
                        className="w-10 h-10 rounded-xl object-cover"
                      />
                      <div>
                        <h4 className="text-xs font-black text-white uppercase">{ath.displayName}</h4>
                        <p className="text-[10px] text-amber-400 font-bold">{ath.sport || 'Athlete'} • {ath.position || 'Player'}</p>
                        <p className="text-[10px] text-slate-400">{ath.highSchool || 'Tri-State'}</p>
                      </div>
                    </div>
                    <RouterLink to={`/athlete/${ath.uid}`} className="px-2.5 py-1 bg-amber-500/20 text-amber-300 font-mono text-[10px] rounded font-bold hover:bg-amber-500/30">
                      Card
                    </RouterLink>
                  </div>
                ))
              ) : (
                <div className="col-span-2 p-6 rounded-2xl bg-white/5 border border-white/10 text-center">
                  <p className="text-xs text-slate-400 font-mono">No followed athletes yet.</p>
                  <RouterLink to="/athletes" className="mt-2 inline-block text-xs font-bold text-amber-400 hover:underline">
                    Explore Athlete Directory &rarr;
                  </RouterLink>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Digital Fan Gate Pass QR Card */}
        <div className="space-y-6">
          <div className="bg-[#050505] border border-amber-500/40 rounded-3xl p-6 space-y-4 text-center">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 text-left">
              <div>
                <h3 className="text-xs font-black uppercase text-amber-400">Digital Gate Pass</h3>
                <p className="text-[10px] text-slate-400">Show at gate scanner for venue admission</p>
              </div>
              <Ticket className="w-5 h-5 text-amber-400" />
            </div>

            <div className="p-4 bg-white rounded-2xl w-40 h-40 mx-auto flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.3)]">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(editData.passId)}`} 
                alt="Fan Pass QR" 
                className="w-full h-full"
              />
            </div>

            <div className="font-mono text-xs text-slate-200">
              <span className="block text-[10px] text-slate-400 uppercase">Spectator Ticket Code</span>
              <strong className="text-amber-400 font-bold tracking-wider">{editData.passId}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
