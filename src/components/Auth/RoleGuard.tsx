import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { ShieldAlert, ArrowLeft, UserCheck } from 'lucide-react';

export interface RoleGuardProps {
  allowedRoles: UserRole[];
  redirectUrl?: string;
  featureTitle?: string;
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  allowedRoles,
  redirectUrl = '/',
  featureTitle = 'Protected Feature',
  children
}) => {
  const { role, loading, isLoading, isRoleLoading, roleResolving, isAdmin, switchRole } = useAuth();
  const navigate = useNavigate();

  const isResolving = Boolean(loading || isLoading || isRoleLoading || roleResolving);
  const isAllowed = isAdmin || allowedRoles.includes(role);

  if (isResolving) {
    return (
      <div 
        id="role-guard-loading"
        className="min-h-screen bg-[#08090C] flex flex-col items-center justify-center p-6"
      >
        <div className="w-10 h-10 border-2 border-white/10 border-t-[#00F0D0] rounded-full animate-spin mb-4" />
        <p className="text-xs font-mono font-bold uppercase tracking-widest text-[#8E9BB0]">
          Verifying Permissions...
        </p>
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <div 
        id="role-guard-access-denied"
        className="max-w-3xl mx-auto my-12 p-8 rounded-3xl bg-[#12151C] border border-[#FF334B]/30 text-slate-100 shadow-2xl text-center animate-fadeIn"
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#FF334B]/10 border border-[#FF334B]/30 text-[#FF334B] flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-black italic uppercase tracking-tight text-white mb-2">
          Access Restricted: {featureTitle}
        </h2>

        <p className="text-sm text-slate-400 max-w-lg mx-auto mb-6">
          You are currently active as <span className="text-[#00F0D0] font-bold uppercase">{role}</span>. Access to {featureTitle} is restricted to <span className="text-white font-semibold">{allowedRoles.map(r => r.toUpperCase().replace('_', ' ')).join(', ')}</span> permissions.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate(redirectUrl, { replace: true })}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#00F0D0] hover:bg-[#00B8D4] text-[#08090C] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard Home</span>
          </button>

          {allowedRoles.length > 0 && isAdmin && (
            <button
              onClick={() => switchRole(allowedRoles[0])}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-white/20 transition-all cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-[#00F0D0]" />
              <span>Switch Role to {allowedRoles[0].toUpperCase().replace('_', ' ')}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default RoleGuard;
