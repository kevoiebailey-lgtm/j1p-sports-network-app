import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Award, 
  Building2, 
  CheckCircle2, 
  User, 
  Sliders, 
  Mail, 
  Phone,
  FileCheck,
  Fingerprint
} from 'lucide-react';
import { INITIAL_SCOUT_DOC } from '../../../lib/platformData';
import { WebAuthnPasskeyManager } from '../../Auth/WebAuthnPasskeyManager';

export const ScoutAccountTab: React.FC = () => {
  const [scout, setScout] = useState(INITIAL_SCOUT_DOC);

  return (
    <div className="space-y-4 animate-fadeIn">
      
      {/* Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#FFB703]" />
          <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
            Scout Accreditation & Credentials
          </h1>
        </div>
        <p className="text-xs text-slate-400 font-medium mt-0.5">
          Verified NCAA Recruiter Identification, Field Biometrics & Scouting Preferences
        </p>
      </div>

      {/* Scout Profile Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          <img
            src={scout.avatarUrl}
            alt={scout.displayName}
            className="w-24 h-24 rounded-2xl object-cover border-2 border-[#FFB703] shadow-[0_0_20px_rgba(255,183,3,0.3)]"
          />
          <div className="space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl font-black text-white">{scout.displayName}</h2>
              <span className="px-2 py-0.5 rounded-full bg-[#FFB703] text-slate-950 text-[10px] font-black uppercase">
                {scout.badgeLevel} ACCREDITED
              </span>
            </div>
            <p className="text-xs text-[#FFB703] font-bold">{scout.title}</p>
            <p className="text-xs text-slate-400">{scout.organization}</p>
          </div>
        </div>

        {/* Credentials Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Credential Status</span>
            <div className="text-emerald-400 font-black flex items-center gap-1.5 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              Verified Active
            </div>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Saved Prospects</span>
            <div className="text-white font-black text-sm font-mono">{scout.watchlist.length} In Watchlist</div>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Scouting Notes</span>
            <div className="text-white font-black text-sm font-mono">{scout.notesCount} Evaluations</div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-3">
          <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-[#FFB703]" />
            Target Recruitment Focus Areas
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {scout.targetPositions.map((pos) => (
              <span key={pos} className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-bold text-slate-300">
                {pos}
              </span>
            ))}
          </div>
        </div>

      </div>

      {/* WebAuthn Biometric Passkey Security Module */}
      <WebAuthnPasskeyManager />

    </div>
  );
};

export default ScoutAccountTab;
