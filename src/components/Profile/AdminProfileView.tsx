import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { VerifiedBadge } from '../Common/VerifiedBadge';
import { UserRole } from '../../types';
import { 
  ShieldCheck, 
  Lock, 
  Users, 
  Activity, 
  Settings, 
  ExternalLink, 
  Database, 
  Key, 
  Sparkles, 
  Sliders
} from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';

export const AdminProfileView: React.FC = () => {
  const { profile, role, switchRole } = useAuth();

  if (!profile) return null;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Super Admin Header */}
      <div className="relative rounded-3xl overflow-hidden bg-[#050505] border border-red-500/40 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="relative">
              <img 
                src={profile.photoURL || profile.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'} 
                alt={profile.displayName} 
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.4)]"
              />
              <div className="absolute -bottom-2 -right-2 bg-red-600 text-white font-black text-[10px] px-2 py-0.5 rounded-md uppercase tracking-widest flex items-center gap-1 shadow-md">
                <ShieldCheck className="w-3 h-3" /> ADMIN
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest bg-red-600 text-white rounded-sm shadow-[0_0_12px_rgba(239,68,68,0.5)]">
                  SYSTEM SUPERADMINISTRATOR
                </span>
                <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest bg-white/5 text-red-300 border border-red-500/30 rounded-sm flex items-center gap-1">
                  <Lock className="w-3 h-3 text-red-400" />
                  FULL PERMISSION CLEARANCE
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black italic tracking-tight text-white uppercase font-sans flex items-center gap-2.5 flex-wrap">
                <span>{profile.displayName}</span>
                <VerifiedBadge size="lg" showLabel />
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 font-bold flex flex-wrap items-center gap-2">
                <span className="text-red-400">System Root Admin</span>
                <span>•</span>
                <span className="text-white">Platform Owner Credentials</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
            <RouterLink
              to="/admin"
              className="flex-1 md:flex-initial px-4 py-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(239,68,68,0.5)] cursor-pointer"
            >
              <Settings className="w-4 h-4 stroke-[2.5]" />
              <span>LAUNCH ADMIN CONTROL PANEL</span>
            </RouterLink>
          </div>
        </div>
      </div>

      {/* Admin Quick Role Tester Switcher */}
      <div className="bg-[#050505] border border-white/10 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
            <Sliders className="w-4 h-4 text-red-400" />
            Admin Real-Time Role Switcher & Simulator
          </h3>
          <span className="text-xs font-mono text-slate-400">Instantly test role-tailored profile views</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {[
            { id: 'athlete', label: 'Athlete', color: 'border-[#E5B868] text-[#E5B868]' },
            { id: 'coach', label: 'Coach', color: 'border-red-500 text-red-500' },
            { id: 'scout', label: 'Scout', color: 'border-cyan-400 text-slate-300' },
            { id: 'organization', label: 'Organization', color: 'border-indigo-400 text-indigo-400' },
            { id: 'creator', label: 'Creator', color: 'border-purple-400 text-purple-400' },
            { id: 'viewer', label: 'Fan / Viewer', color: 'border-amber-400 text-amber-400' },
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => switchRole(r.id as UserRole)}
              className={`p-3 rounded-2xl bg-white/5 border hover:bg-white/10 text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center ${r.color}`}
            >
              <span>{r.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Admin System Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#050505] border border-white/10 p-5 rounded-2xl space-y-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-red-400" />
            <span>TOTAL SYSTEM USERS</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">1,840 Users</div>
          <p className="text-[10px] text-slate-400 font-mono">Across All 6 Roles</p>
        </div>

        <div className="bg-[#050505] border border-white/10 p-5 rounded-2xl space-y-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-red-500" />
            <span>VERIFIED ATHLETES</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-red-500 font-mono">640 Profiles</div>
          <p className="text-[10px] text-slate-400 font-mono">Verified D1 Matrix</p>
        </div>

        <div className="bg-[#050505] border border-white/10 p-5 rounded-2xl space-y-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-slate-300" />
            <span>SANCTIONED EVENTS</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">38 Tournaments</div>
          <p className="text-[10px] text-slate-400 font-mono">Active Check-In Scanner</p>
        </div>

        <div className="bg-[#050505] border border-white/10 p-5 rounded-2xl space-y-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-red-400" />
            <span>DATABASE HEALTH</span>
          </div>
          <div className="text-xs font-black text-red-500 uppercase">100% OPERATIONAL</div>
          <p className="text-[10px] text-slate-400 font-mono">Cloud Firestore Sync</p>
        </div>
      </div>
    </div>
  );
};
