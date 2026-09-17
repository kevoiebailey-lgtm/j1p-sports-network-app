import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, UserPlus, Shield, Mail, CheckCircle2, Clock, Layers } from 'lucide-react';
import { EventDivision, EventStaffMember, StaffRole } from './types';

interface InviteStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteStaff: (staffData: EventStaffMember) => void | Promise<void>;
  divisions: EventDivision[];
}

export const InviteStaffModal: React.FC<InviteStaffModalProps> = ({
  isOpen,
  onClose,
  onInviteStaff,
  divisions
}) => {
  const [identifier, setIdentifier] = useState(''); // Email or Username
  const [name, setName] = useState('');
  const [role, setRole] = useState<StaffRole>('Head Coach');
  const [divisionId, setDivisionId] = useState<string>(divisions[0]?.id || 'all');
  const [status, setStatus] = useState<'confirmed' | 'pending'>('confirmed');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const roleOptions: Array<{ id: StaffRole; label: string; desc: string; badgeColor: string }> = [
    { 
      id: 'Head Coach', 
      label: 'Head Coach', 
      desc: 'Lead strategist, playcaller, and team bench authority',
      badgeColor: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/15'
    },
    { 
      id: 'Assistant Coach', 
      label: 'Assistant Coach', 
      desc: 'Offensive / Defensive coordinator & position trainer',
      badgeColor: 'text-teal-300 border-teal-500/40 bg-teal-500/15'
    },
    { 
      id: 'Official / Referee', 
      label: 'Official / Referee', 
      desc: 'Certified game referee, clock timer & rule enforcer',
      badgeColor: 'text-blue-300 border-blue-500/40 bg-blue-500/15'
    },
    { 
      id: 'Field Marshall', 
      label: 'Field Marshall', 
      desc: 'Venue operations, sideline control & safety marshal',
      badgeColor: 'text-amber-300 border-amber-500/40 bg-amber-500/15'
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier) {
      setError('Please enter a staff member email address or username.');
      return;
    }

    const assignedDivision = divisions.find(d => d.id === divisionId);
    const divisionName = divisionId === 'all' ? 'All Divisions' : (assignedDivision?.name || 'General Staff');
    const staffName = name.trim() || cleanIdentifier.split('@')[0];
    const isEmail = cleanIdentifier.includes('@');

    const newStaff: EventStaffMember = {
      id: `staff-${Date.now().toString(36)}`,
      userId: `user-${Date.now().toString(36)}`,
      name: staffName,
      email: isEmail ? cleanIdentifier : undefined,
      role,
      divisionId: divisionId === 'all' ? undefined : divisionId,
      divisionName,
      status,
      assignedAt: new Date().toISOString(),
      avatarUrl: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 90000000)}?w=200&auto=format&fit=crop&q=80`
    };

    setError(null);
    setIsSubmitting(true);

    try {
      await onInviteStaff(newStaff);
      setIdentifier('');
      setName('');
      setRole('Head Coach');
      setStatus('confirmed');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to assign staff member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div 
        id="invite-staff-modal-overlay"
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          id="invite-staff-modal-card"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg bg-[#090D16] border border-[#24324F] rounded-3xl p-6 shadow-2xl overflow-hidden space-y-5"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wide">
                  Invite Staff or Coach
                </h3>
                <p className="text-xs text-slate-400">
                  Assign evaluated coaches, officials, or field marshalls to tournament divisions
                </p>
              </div>
            </div>

            <button
              id="close-invite-staff-modal-btn"
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Staff Email or Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#00B8D4]" />
                Staff Email or Username
              </label>
              <input
                id="staff-email-or-username-input"
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="coach@program.org or @coach_wilson"
                className="w-full bg-[#263238] border border-[#24324F] focus:border-[#00B8D4] text-white text-sm rounded-xl px-3.5 py-2.5 outline-none transition-colors placeholder:text-slate-500"
              />
            </div>

            {/* Display Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300 flex items-center justify-between">
                <span>Display Name (Optional)</span>
                <span className="text-[10px] text-slate-500 font-normal">Auto-derives if empty</span>
              </label>
              <input
                id="staff-display-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Marcus Vance, Coach Dave"
                className="w-full bg-[#263238] border border-[#24324F] focus:border-[#00B8D4] text-white text-sm rounded-xl px-3.5 py-2.5 outline-none transition-colors placeholder:text-slate-500"
              />
            </div>

            {/* Role Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                Tournament Role
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {roleOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRole(opt.id)}
                    className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                      role === opt.id
                        ? 'bg-[#263238] border-[#00B8D4] shadow-md'
                        : 'bg-[#263238]/40 border-[#24324F] hover:bg-[#263238]/70 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-bold ${role === opt.id ? 'text-white' : 'text-slate-300'}`}>
                        {opt.label}
                      </span>
                      <span className={`px-1.5 py-0.2 text-[9px] font-mono font-bold rounded border ${opt.badgeColor}`}>
                        ACTIVE
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      {opt.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Division Assignment & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Division Assignment */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#FF6A00]" />
                  Division Assignment
                </label>
                <select
                  id="staff-division-select"
                  value={divisionId}
                  onChange={(e) => setDivisionId(e.target.value)}
                  className="w-full bg-[#263238] border border-[#24324F] focus:border-[#00B8D4] text-white text-xs rounded-xl px-3 py-2.5 outline-none font-medium cursor-pointer"
                >
                  <option value="all">Universal / All Divisions</option>
                  {divisions.map((div) => (
                    <option key={div.id} value={div.id}>
                      {div.name} ({div.format || 'Standard'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  Invitation Status
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setStatus('confirmed')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      status === 'confirmed'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-[#263238]/60 border-[#24324F] text-slate-400 hover:text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Confirmed</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatus('pending')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      status === 'pending'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-[#263238]/60 border-[#24324F] text-slate-400 hover:text-white'
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    <span>Pending</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#24324F]">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="submit-invite-staff-btn"
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-black uppercase tracking-wider hover:opacity-95 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save & Assign Staff'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
