import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  FileCheck, 
  Users, 
  Send, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  CreditCard 
} from 'lucide-react';
import { INITIAL_TOURNAMENT_DOC, INITIAL_WAIVER_RECORDS } from '../../../lib/platformData';
import { WaiverRecord } from '../../../types/platform';
import { StripeConnectDirectorManager } from '../../Admin/StripeConnectDirectorManager';
import { EventOperationsManager } from '../../coordinator/EventOperationsManager';

export const DirectorOperationsTab: React.FC = () => {
  const [activeView, setActiveView] = useState<'checkin_desk' | 'financials'>('checkin_desk');
  const [waivers, setWaivers] = useState<WaiverRecord[]>(INITIAL_WAIVER_RECORDS);
  const [reminderToast, setReminderToast] = useState<string | null>(null);

  const handleResendWaiver = (athleteName: string, email: string) => {
    setReminderToast(`Electronic waiver invitation resent to ${email} for ${athleteName}!`);
    setTimeout(() => setReminderToast(null), 3000);
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* Header with View Sub-Toggle */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#FF6A00]" />
            <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Tournament Operations & Field Console
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Team Registration Revenue, Field Check-In Manifests, Roster Locks & Digital Waivers
          </p>
        </div>

        {/* View switcher buttons */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveView('checkin_desk')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition cursor-pointer ${
              activeView === 'checkin_desk'
                ? 'bg-cyan-500 text-neutral-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Field Check-In Desk
          </button>
          <button
            onClick={() => setActiveView('financials')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition cursor-pointer ${
              activeView === 'financials'
                ? 'bg-cyan-500 text-neutral-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Stripe & Ledger
          </button>
        </div>
      </div>

      {activeView === 'checkin_desk' ? (
        <EventOperationsManager />
      ) : (
        <>
          {reminderToast && (
            <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{reminderToast}</span>
            </div>
          )}

      {/* REVENUE & OPS STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase">Total Team Revenue</span>
          <div className="text-2xl font-black text-white font-mono">$28,800.00</div>
          <span className="text-[10px] text-emerald-400 font-bold">24 Teams Paid ($1,200/team)</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase">Waiver Compliance</span>
          <div className="text-2xl font-black text-emerald-400 font-mono">96.8%</div>
          <span className="text-[10px] text-slate-400">1 Pending Signature</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase">Certified Referees</span>
          <div className="text-2xl font-black text-white font-mono">8 Officials</div>
          <span className="text-[10px] text-[#FF6A00] font-bold">2 per active court assigned</span>
        </div>
      </div>

      {/* STRIPE CONNECT DIRECT PAYOUTS & ONBOARDING RAIL */}
      <StripeConnectDirectorManager />

      {/* DIGITAL WAIVER COMPLIANCE ROSTER */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-xs font-black text-[#FF6A00] uppercase tracking-wider flex items-center gap-1.5">
            <FileCheck className="w-4 h-4 text-[#FF6A00]" />
            Athlete Digital Waiver Roster
          </h2>
          <span className="text-[10px] text-slate-400">Enforced by Firestore Security Rules</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Athlete</th>
                <th className="py-2.5 px-4">Team</th>
                <th className="py-2.5 px-4">Parent / Guardian</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {waivers.map((w) => (
                <tr key={w.id} className="hover:bg-slate-800/40 text-slate-300">
                  <td className="py-3 px-4 font-bold text-white">{w.athleteName}</td>
                  <td className="py-3 px-4">{w.teamName}</td>
                  <td className="py-3 px-4 text-slate-400">{w.parentName} ({w.parentEmail})</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      w.status === 'Signed' 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                    }`}>
                      {w.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {w.status === 'Pending' ? (
                      <button
                        onClick={() => handleResendWaiver(w.athleteName, w.parentEmail)}
                        className="px-2.5 py-1 rounded-lg bg-[#FF6A00] text-white text-[11px] font-bold shadow-md cursor-pointer hover:brightness-110"
                      >
                        Resend Invite
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-mono">Signed on file</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

    </div>
  );
};

export default DirectorOperationsTab;
