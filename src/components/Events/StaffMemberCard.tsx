import React from 'react';
import { ShieldCheck, Mail, CheckCircle2, Clock, Trash2, Award } from 'lucide-react';
import { EventStaffMember } from './types';

interface StaffMemberCardProps {
  member: EventStaffMember;
  onRemove?: (staffId?: string) => void;
  onToggleStatus?: (member: EventStaffMember) => void;
  canManage?: boolean;
}

export const StaffMemberCard: React.FC<StaffMemberCardProps> = ({
  member,
  onRemove,
  onToggleStatus,
  canManage = false
}) => {
  const getRoleBadgeStyle = (role: string) => {
    const r = role.toLowerCase();
    if (r.includes('head coach')) {
      return {
        bg: 'bg-emerald-500/15',
        text: 'text-emerald-300',
        border: 'border-emerald-500/40',
        dot: 'bg-emerald-400'
      };
    }
    if (r.includes('assistant')) {
      return {
        bg: 'bg-cyan-500/15',
        text: 'text-cyan-300',
        border: 'border-cyan-500/40',
        dot: 'bg-cyan-400'
      };
    }
    if (r.includes('official') || r.includes('referee')) {
      return {
        bg: 'bg-blue-500/15',
        text: 'text-blue-300',
        border: 'border-blue-500/40',
        dot: 'bg-blue-400'
      };
    }
    if (r.includes('marshall') || r.includes('marshal')) {
      return {
        bg: 'bg-amber-500/15',
        text: 'text-amber-300',
        border: 'border-amber-500/40',
        dot: 'bg-amber-400'
      };
    }
    return {
      bg: 'bg-purple-500/15',
      text: 'text-purple-300',
      border: 'border-purple-500/40',
      dot: 'bg-purple-400'
    };
  };

  const badgeStyle = getRoleBadgeStyle(member.role);
  const isConfirmed = member.status === 'confirmed';

  return (
    <div 
      id={`staff-card-${member.id || member.userId}`}
      className="p-4 rounded-2xl bg-[#090D16] border border-[#24324F] hover:border-[#00B8D4]/40 transition-all shadow-md space-y-3 relative group"
    >
      <div className="flex items-start justify-between gap-3">
        {/* Avatar & Identifiers */}
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <img
              src={member.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
              alt={member.name}
              className="w-12 h-12 rounded-2xl object-cover border border-[#24324F] bg-[#263238]"
              referrerPolicy="no-referrer"
            />
            <span 
              className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#090D16] ${
                isConfirmed ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
              }`}
              title={isConfirmed ? 'Confirmed Staff Member' : 'Pending Confirmation'}
            />
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="text-sm font-bold text-white tracking-tight">
                {member.name}
              </h4>
              {isConfirmed && (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              )}
            </div>

            {member.email && (
              <p className="text-[11px] text-slate-400 flex items-center gap-1 truncate max-w-[180px]">
                <Mail className="w-3 h-3 text-slate-500" />
                <span>{member.email}</span>
              </p>
            )}
          </div>
        </div>

        {/* Status Chip */}
        <div className="flex items-center gap-1.5">
          {canManage && onToggleStatus ? (
            <button
              type="button"
              onClick={() => onToggleStatus(member)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border cursor-pointer transition-colors ${
                isConfirmed
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
              }`}
              title="Click to toggle confirmed/pending status"
            >
              {member.status}
            </button>
          ) : (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                isConfirmed
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              }`}
            >
              {member.status}
            </span>
          )}

          {canManage && onRemove && (
            <button
              type="button"
              onClick={() => onRemove(member.id)}
              className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Remove staff assignment"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Role Badge & Division Association */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#24324F]/70 flex-wrap">
        {/* Role Badge */}
        <span className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase font-mono tracking-wider border flex items-center gap-1.5 ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${badgeStyle.dot}`} />
          <span>{member.role}</span>
        </span>

        {/* Division Link */}
        <div className="flex items-center gap-1 text-[11px] font-mono font-semibold text-slate-300">
          <Award className="w-3.5 h-3.5 text-[#00B8D4]" />
          <span>{member.divisionName || 'All Divisions'}</span>
        </div>
      </div>
    </div>
  );
};
