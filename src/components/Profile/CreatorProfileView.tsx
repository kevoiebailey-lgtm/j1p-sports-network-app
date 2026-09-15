import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { VerifiedBadge } from '../Common/VerifiedBadge';
import { 
  Video, 
  Camera, 
  Sparkles, 
  Film, 
  Tv, 
  Eye, 
  Play, 
  Edit3, 
  Share2, 
  Check, 
  ExternalLink, 
  Instagram, 
  Youtube, 
  Mail, 
  Phone, 
  Send,
  Clapperboard,
  Tag,
  Save
} from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';
import { ProfilePictureUploader } from '../AthleteProfile/ProfilePictureUploader';

export const CreatorProfileView: React.FC = () => {
  const { profile, role, updateUserProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [editData, setEditData] = useState({
    displayName: profile?.displayName || 'Jordan "CourtSide" Miller',
    photoURL: profile?.photoURL || profile?.avatarUrl || '',
    avatarUrl: profile?.avatarUrl || profile?.photoURL || '',
    brandName: 'CourtSide Visuals & Tri-State Hoops Media',
    specialty: '4K Basketball Mixtapes, Live Stream Broadcaster & Photo Journalism',
    gear: 'Sony FX3, 70-200mm f/2.8, Wireless Audio, DJI Drone',
    publishedCount: '86 Highlight Videos & Mixtapes',
    totalViews: '2.4M Total Impressions',
    taggedAthletesCount: '110 Verified Athletes Featured',
    bio: profile?.bio || 'Official Just1Play verified sports videographer capturing elite high school mixtapes, live streams, and showcase game highlights.',
    email: profile?.email || 'media@courtsidevisuals.com',
    youtube: 'https://youtube.com/@courtsidevisuals',
    instagram: profile?.social?.instagram || '@courtside_visuals',
    tiktok: profile?.social?.tiktok || '@courtside_mixtapes'
  });

  if (!profile) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const finalPhoto = editData.photoURL || editData.avatarUrl || profile.photoURL || profile.avatarUrl;
    updateUserProfile({
      displayName: editData.displayName,
      photoURL: finalPhoto,
      avatarUrl: finalPhoto,
      highSchool: editData.brandName,
      bio: editData.bio,
      social: {
        instagram: editData.instagram,
        tiktok: editData.tiktok
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
      {/* Top Banner / Creator Header */}
      <div className="relative rounded-3xl overflow-hidden bg-[#050505] border border-purple-500/30 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="relative">
              <img 
                src={profile.photoURL || profile.avatarUrl || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80'} 
                alt={profile.displayName} 
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-purple-400/80 shadow-[0_0_25px_rgba(168,85,247,0.3)]"
              />
              <div className="absolute -bottom-2 -right-2 bg-purple-500 text-white font-black text-[10px] px-2 py-0.5 rounded-md uppercase tracking-widest flex items-center gap-1 shadow-md">
                <Video className="w-3 h-3" /> CREATOR
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest bg-purple-500 text-white rounded-sm shadow-[0_0_12px_rgba(168,85,247,0.4)]">
                  VERIFIED MEDIA CREATOR
                </span>
                <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest bg-white/5 text-purple-300 border border-purple-500/30 rounded-sm flex items-center gap-1">
                  <Camera className="w-3 h-3 text-purple-400" />
                  PRESS PASS ACCREDITED
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black italic tracking-tight text-white uppercase font-sans flex items-center gap-2.5 flex-wrap">
                <span>{editData.displayName}</span>
                <VerifiedBadge size="lg" showLabel />
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 font-bold flex flex-wrap items-center gap-2">
                <span className="text-purple-400">{editData.brandName}</span>
                <span>•</span>
                <span className="text-slate-300">{editData.specialty}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
            <RouterLink
              to="/creator/studio"
              className="flex-1 md:flex-initial px-4 py-2.5 rounded-full bg-purple-500 hover:bg-purple-400 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] cursor-pointer"
            >
              <Clapperboard className="w-4 h-4 stroke-[2.5]" />
              <span>OPEN CREATOR STUDIO</span>
            </RouterLink>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider border border-white/10 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Edit3 className="w-4 h-4 text-purple-400" />
              <span>{isEditing ? 'CANCEL' : 'EDIT PORTFOLIO'}</span>
            </button>

            <button
              onClick={handleShare}
              className="px-4 py-2.5 rounded-full bg-black/80 hover:bg-black text-white font-bold text-xs uppercase tracking-wider border border-purple-500/40 flex items-center gap-2 transition-all cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4 text-purple-400" /> : <Share2 className="w-4 h-4 text-purple-400" />}
              <span>{copiedLink ? 'COPIED!' : 'SHARE'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Edit Form Modal */}
      {isEditing && (
        <form onSubmit={handleSave} className="bg-[#212A31] border border-purple-500/40 rounded-3xl p-6 shadow-[0_0_30px_rgba(168,85,247,0.2)] space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-black uppercase text-purple-400 tracking-wider flex items-center gap-2">
              <Edit3 className="w-4 h-4" />
              Update Media Creator Profile & Portfolio Info
            </h3>
            <span className="text-xs text-slate-400 font-mono">Real-Time Creator Network Sync</span>
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
              <label className="text-[11px] font-bold text-purple-400 uppercase block">
                Profile Picture Upload
              </label>
              <input
                type="text"
                value={editData.avatarUrl}
                onChange={(e) => setEditData({ ...editData, avatarUrl: e.target.value, photoURL: e.target.value })}
                className="w-full bg-[#212A31] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-400 focus:outline-none"
                placeholder="https://images.unsplash.com/... or upload photo above"
              />
              <p className="text-[10px] text-slate-400">
                Click above or drag & drop a photo file to upload directly from your gallery.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Creator Name</label>
              <input
                type="text"
                value={editData.displayName}
                onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Brand / Outlet Name</label>
              <input
                type="text"
                value={editData.brandName}
                onChange={(e) => setEditData({ ...editData, brandName: e.target.value })}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Specialty & Focus</label>
              <input
                type="text"
                value={editData.specialty}
                onChange={(e) => setEditData({ ...editData, specialty: e.target.value })}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Camera Gear & Specs</label>
              <input
                type="text"
                value={editData.gear}
                onChange={(e) => setEditData({ ...editData, gear: e.target.value })}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Instagram Handle</label>
              <input
                type="text"
                value={editData.instagram}
                onChange={(e) => setEditData({ ...editData, instagram: e.target.value })}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">TikTok Handle</label>
              <input
                type="text"
                value={editData.tiktok}
                onChange={(e) => setEditData({ ...editData, tiktok: e.target.value })}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Creator Bio & Services</label>
            <textarea
              rows={3}
              value={editData.bio}
              onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
              className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-400 focus:outline-none"
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
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(147,51,234,0.5)] transition-all"
            >
              <Save className="w-4 h-4 stroke-[2.5]" />
              <span>Save Creator Profile</span>
            </button>
          </div>
        </form>
      )}

      {/* Creator Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#050505] border border-white/10 p-5 rounded-2xl space-y-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-purple-400" />
            <span>PUBLISHED MEDIA</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">86 Videos</div>
          <p className="text-[10px] text-slate-400 font-mono">Mixtapes & Highlights</p>
        </div>

        <div className="bg-[#050505] border border-white/10 p-5 rounded-2xl space-y-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-slate-300" />
            <span>IMPRESSIONS</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-300 font-mono">2.4M Views</div>
          <p className="text-[10px] text-slate-400 font-mono">Verified Fan Reach</p>
        </div>

        <div className="bg-[#050505] border border-white/10 p-5 rounded-2xl space-y-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-red-500" />
            <span>FEATURED ATHLETES</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-red-500 font-mono">110 Players</div>
          <p className="text-[10px] text-slate-400 font-mono">Tagged Player Profiles</p>
        </div>

        <div className="bg-[#050505] border border-white/10 p-5 rounded-2xl space-y-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-purple-400" />
            <span>GEAR SPECS</span>
          </div>
          <div className="text-xs font-black text-purple-300 uppercase truncate">SONY 4K FX3</div>
          <p className="text-[10px] text-slate-400 font-mono">Cinematic 120fps</p>
        </div>
      </div>

      {/* Main Workspace: Showcase Reel & Booking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#050505] border border-white/10 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-black uppercase text-white tracking-wider flex items-center gap-2">
                <Film className="w-4 h-4 text-purple-400" />
                Featured Video Reel & Highlights
              </h3>
              <RouterLink to="/media" className="text-xs text-purple-400 font-bold hover:underline flex items-center gap-1">
                <span>Media Hub</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </RouterLink>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 relative group">
                <div className="relative aspect-video rounded-xl bg-black overflow-hidden border border-white/10 flex items-center justify-center">
                  <img 
                    src="https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=600&q=80" 
                    alt="Highlight Reel" 
                    className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-all"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                  <div className="w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-lg relative z-10">
                    <Play className="w-5 h-5 ml-0.5 fill-current" />
                  </div>
                </div>
                <h4 className="text-xs font-black text-white uppercase">Tri-State Showcase Top 10 Plays</h4>
                <p className="text-[10px] text-slate-400 font-mono">14.2K Views • Tagged 8 Athletes</p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 relative group">
                <div className="relative aspect-video rounded-xl bg-black overflow-hidden border border-white/10 flex items-center justify-center">
                  <img 
                    src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=600&q=80" 
                    alt="Mixtape Reel" 
                    className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-all"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                  <div className="w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-lg relative z-10">
                    <Play className="w-5 h-5 ml-0.5 fill-current" />
                  </div>
                </div>
                <h4 className="text-xs font-black text-white uppercase">Marcus Vance D1 Player Spotlight</h4>
                <p className="text-[10px] text-slate-400 font-mono">32.8K Views • Senior Mixtape</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-[#050505] border border-white/10 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
              <Camera className="w-4 h-4 text-purple-400" />
              Book Media Coverage
            </h3>
            <p className="text-xs text-slate-300">
              Inquire for game coverage, player mixtapes, live broadcasts, and event photo journalism.
            </p>

            <div className="space-y-3 pt-1 text-xs font-mono">
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase block">Booking Email</span>
                <a href={`mailto:${editData.email}`} className="text-purple-400 font-bold hover:underline">{editData.email}</a>
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase block">Instagram DM</span>
                <span className="text-white font-bold">{editData.instagram}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#050505] border border-white/10 rounded-3xl p-6 space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Creator Shortcuts</h3>

            <RouterLink
              to="/creator/studio"
              className="w-full p-3 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 rounded-2xl flex items-center justify-between text-xs text-purple-300 font-bold transition-all"
            >
              <div className="flex items-center gap-2">
                <Clapperboard className="w-4 h-4 text-purple-400" />
                <span>Launch Creator Studio</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
            </RouterLink>

            <RouterLink
              to="/social"
              className="w-full p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-between text-xs text-slate-200 font-bold transition-all"
            >
              <div className="flex items-center gap-2">
                <Tv className="w-4 h-4 text-slate-300" />
                <span>Browse Social Feed</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  );
};
