import React from 'react';
import { 
  Flame, 
  Trophy, 
  Award, 
  Users, 
  Building2, 
  Video, 
  ShieldCheck, 
  Sliders, 
  CheckCircle2, 
  ExternalLink, 
  BookOpen, 
  Briefcase, 
  Calendar,
  Sparkles,
  Zap,
  Mail,
  Phone
} from 'lucide-react';
import { UserProfile } from '../../types';

interface RoleSpecificViewsProps {
  profile: UserProfile;
}

export const RoleSpecificViews: React.FC<RoleSpecificViewsProps> = ({ profile }) => {
  const role = profile.role?.toLowerCase() || 'athlete';

  if (role === 'coach') {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl bg-[#131B26] border border-white/10 p-6 shadow-2xl backdrop-blur-xl space-y-5">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-[#FF6A00]" />
            <h3 className="text-lg font-black uppercase text-white tracking-wider">
              Coaching Staff & Team Management Dossier
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#0B0F17] border border-white/10 rounded-2xl p-4">
              <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Career Win Record</span>
              <div className="text-2xl font-black font-mono text-[#FF6A00]">184 - 42 (.814)</div>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">12 Varsity Seasons</span>
            </div>

            <div className="bg-[#0B0F17] border border-white/10 rounded-2xl p-4">
              <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Championship Titles</span>
              <div className="text-2xl font-black font-mono text-white">3x State, 5x Div</div>
              <span className="text-[10px] text-[#39FF14] font-mono mt-1 block">Reigning Regional Champions</span>
            </div>

            <div className="bg-[#0B0F17] border border-white/10 rounded-2xl p-4">
              <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">NCAA D1 Placements</span>
              <div className="text-2xl font-black font-mono text-[#00E5FF]">28 Recruits</div>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">Full Collegiate Scholarships</span>
            </div>
          </div>

          <div className="bg-[#0B0F17] border border-white/10 rounded-2xl p-4 space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#FF6A00]">
              Coaching Philosophy & System
            </span>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
              {profile.coachingPhilosophy || 'High-tempo pace-and-space offense paired with aggressive full-court disruption defense. We build student-athletes with elite discipline, film study dedication, and high academic standards.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (role === 'scout' || role === 'recruiter') {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl bg-[#131B26] border border-white/10 p-6 shadow-2xl backdrop-blur-xl space-y-5">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#FFC857]" />
            <h3 className="text-lg font-black uppercase text-white tracking-wider">
              Scouting & Recruitment Matrix
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#0B0F17] border border-white/10 rounded-2xl p-4">
              <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">NCAA Scouting Status</span>
              <div className="text-lg font-black font-mono text-[#FFC857]">NCAA Certified Evaluator</div>
              <span className="text-[10px] text-[#39FF14] font-mono mt-1 block">Badge ID: #SC-9042</span>
            </div>

            <div className="bg-[#0B0F17] border border-white/10 rounded-2xl p-4">
              <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Assigned Coverage Region</span>
              <div className="text-lg font-black font-mono text-white">{profile.scoutingRegion || 'Tri-State & Northeast'}</div>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">High School & AAU Circuits</span>
            </div>

            <div className="bg-[#0B0F17] border border-white/10 rounded-2xl p-4">
              <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Recruiting Target Focus</span>
              <div className="text-lg font-black font-mono text-[#00E5FF]">{profile.recruitingFocus || 'Point Guards & Wings'}</div>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">Class of 2026 & 2027</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (role === 'organization' || role === 'director') {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl bg-[#131B26] border border-white/10 p-6 shadow-2xl backdrop-blur-xl space-y-5">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-black uppercase text-white tracking-wider">
              Sanctioned League & Organization Dashboard
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#0B0F17] border border-white/10 rounded-2xl p-4">
              <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Sanctioned Tournaments</span>
              <div className="text-2xl font-black font-mono text-purple-400">14 Major Events</div>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">NCAA Live Period Certified</span>
            </div>

            <div className="bg-[#0B0F17] border border-white/10 rounded-2xl p-4">
              <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Registered Clubs & Teams</span>
              <div className="text-2xl font-black font-mono text-white">128 Teams</div>
              <span className="text-[10px] text-[#39FF14] font-mono mt-1 block">Active Rosters</span>
            </div>

            <div className="bg-[#0B0F17] border border-white/10 rounded-2xl p-4">
              <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Operating Facility</span>
              <div className="text-lg font-black font-mono text-[#00E5FF]">Just1Play Metro Arena</div>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">8 Hardwood Courts</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (role === 'creator' || role === 'content_creator') {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl bg-[#131B26] border border-white/10 p-6 shadow-2xl backdrop-blur-xl space-y-5">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-[#39FF14]" />
            <h3 className="text-lg font-black uppercase text-white tracking-wider">
              Sports Media Production & Mixtape Studio
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#0B0F17] border border-white/10 rounded-2xl p-4">
              <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Total Mixtape Views</span>
              <div className="text-2xl font-black font-mono text-[#39FF14]">1.4M+ Views</div>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">TikTok, YouTube & Reels</span>
            </div>

            <div className="bg-[#0B0F17] border border-white/10 rounded-2xl p-4">
              <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Camera Rig & Gear</span>
              <div className="text-sm font-black font-mono text-white">Sony FX3 • 4K 120fps Cinema</div>
              <span className="text-[10px] text-[#00E5FF] font-mono mt-1 block">Ronin RS3 Pro Gimbal</span>
            </div>

            <div className="bg-[#0B0F17] border border-white/10 rounded-2xl p-4">
              <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Mixtape Bookings</span>
              <div className="text-lg font-black font-mono text-[#00E5FF]">Available for Game Bookings</div>
              <span className="text-[10px] text-[#39FF14] font-mono mt-1 block">Full Season Packages</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (role === 'admin') {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl bg-[#131B26] border border-white/10 p-6 shadow-2xl backdrop-blur-xl space-y-5">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-rose-400" />
            <h3 className="text-lg font-black uppercase text-white tracking-wider">
              Platform Administration & Verification Controls
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#0B0F17] border border-white/10 rounded-2xl p-4">
              <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">System Privilege</span>
              <div className="text-lg font-black font-mono text-rose-400">Super Administrator</div>
              <span className="text-[10px] text-[#39FF14] font-mono mt-1 block">Full Root Access</span>
            </div>

            <div className="bg-[#0B0F17] border border-white/10 rounded-2xl p-4">
              <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Audit Log Status</span>
              <div className="text-lg font-black font-mono text-white">Active Real-Time Audit</div>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">Encrypted Ledger</span>
            </div>

            <div className="bg-[#0B0F17] border border-white/10 rounded-2xl p-4">
              <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Database Sync</span>
              <div className="text-lg font-black font-mono text-[#00E5FF]">Firestore Production</div>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">Multi-Region Cloud</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fan / Default
  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-[#131B26] border border-white/10 p-6 shadow-2xl backdrop-blur-xl space-y-5">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg font-black uppercase text-white tracking-wider">
            Sports Fan & Community Supporter
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#0B0F17] border border-white/10 rounded-2xl p-4">
            <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Attended Games & Tournaments</span>
            <div className="text-2xl font-black font-mono text-indigo-400">24 Matches</div>
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">Live Court Check-Ins</span>
          </div>

          <div className="bg-[#0B0F17] border border-white/10 rounded-2xl p-4">
            <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Supported Teams</span>
            <div className="text-lg font-black font-mono text-white">{profile.teamName || 'St. Anthony Knights'}</div>
            <span className="text-[10px] text-[#39FF14] font-mono mt-1 block">Verified Fan</span>
          </div>

          <div className="bg-[#0B0F17] border border-white/10 rounded-2xl p-4">
            <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Cheered Athletes</span>
            <div className="text-2xl font-black font-mono text-[#00E5FF]">18 Athletes</div>
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">Following Live Updates</span>
          </div>
        </div>
      </div>
    </div>
  );
};
