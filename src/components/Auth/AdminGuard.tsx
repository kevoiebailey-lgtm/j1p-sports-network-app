import React, { useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, ArrowLeft, Lock, LogOut } from 'lucide-react';

export interface AdminGuardProps {
  children: React.ReactNode;
  fallbackUrl?: string;
}

/**
 * AdminGuard
 * Prevents unauthorized access to Platform Administrator Command Desks.
 * Strictly avoids evaluating permissions or rendering access denial
 * while Firebase Auth or Firestore role resolution is in flight, eliminating flashlight screen flickering.
 * Completely eliminates auto-redirect timers to prevent infinite unmount/remount loops.
 */
export const AdminGuard: React.FC<AdminGuardProps> = ({ 
  children, 
  fallbackUrl = '/' 
}) => {
  const { 
    user, 
    profile, 
    role, 
    loading, 
    isLoading, 
    authLoading, 
    isRoleLoading, 
    roleResolving, 
    isAuthReady,
    isAdmin: contextIsAdmin,
    signOut
  } = useAuth();
  const navigate = useNavigate();

  // Platform owner / primary admin email bypass
  const isOwnerAdmin = (user?.email || '').toLowerCase().trim() === 'kevoiebailey@gmail.com';

  // Normalize role checking so casing does not cause false denials
  const isRoleAdmin = useMemo(() => {
    return Boolean(
      role?.toLowerCase() === 'admin' ||
      profile?.role?.toLowerCase() === 'admin' ||
      (profile as any)?.isAdmin === true ||
      (user as any)?.role?.toLowerCase() === 'admin' ||
      (user as any)?.isAdmin === true
    );
  }, [role, profile, user]);

  // Completely confirmed and memoized admin status
  const isAdmin = useMemo(() => {
    return Boolean(
      isOwnerAdmin ||
      contextIsAdmin ||
      isRoleAdmin
    );
  }, [isOwnerAdmin, contextIsAdmin, isRoleAdmin]);

  // Clear retry session flag on successful admin authentication
  useEffect(() => {
    if (isAdmin && typeof window !== 'undefined') {
      sessionStorage.removeItem('retry-lazy-refreshed');
    }
  }, [isAdmin]);

  // Loading resolution check:
  // If user is authorized platform owner/admin by email, bypass strict Firestore latency to prevent lockouts.
  // Otherwise, strictly do not render denial or trigger navigation if either auth OR role profile is still loading.
  const isResolving = useMemo(() => {
    const authNotReady = isAuthReady !== undefined && !isAuthReady;
    if (isOwnerAdmin) {
      return Boolean(authLoading ?? loading ?? authNotReady);
    }
    return Boolean((authLoading ?? loading) || isRoleLoading || roleResolving || isLoading || authNotReady);
  }, [isOwnerAdmin, authLoading, loading, isRoleLoading, roleResolving, isLoading, isAuthReady]);

  // 1. Block Permission Checks While Role is In-Flight:
  // Do not render denial or trigger navigation if either auth OR role profile is still loading
  if (isResolving) {
    return (
      <div 
        id="admin-guard-loading" 
        className="min-h-screen bg-[#08090C] flex items-center justify-center select-none"
      >
        <div className="w-10 h-10 border-2 border-white/10 border-t-[#00F0D0] rounded-full animate-spin" />
      </div>
    );
  }

  // 2. Definitively Unauthorized: Render static, stable card (NO auto-redirect timers under any circumstances)
  if (!isAdmin) {
    return (
      <div 
        id="admin-guard-access-denied"
        className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6"
      >
        <div className="w-full max-w-2xl p-6 sm:p-8 rounded-3xl bg-[#12151C] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_20px_50px_rgba(0,0,0,0.7)] backdrop-blur-2xl text-slate-100 text-center relative overflow-hidden animate-fadeIn">
          {/* Ambient red accent glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF334B]/10 rounded-full blur-[80px] pointer-events-none" />

          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#FF334B]/15 border border-[#FF334B]/30 text-[#FF334B] flex items-center justify-center shadow-[0_0_25px_rgba(255,51,75,0.25)]">
            <Lock className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF334B]/10 border border-[#FF334B]/30 text-[#FF334B] font-mono text-[10px] uppercase font-bold mb-3 tracking-widest">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Restricted Admin Portal</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight text-white mb-2">
            Administrator Access Required
          </h2>

          <p className="text-xs sm:text-sm text-[#8E9BB0] max-w-md mx-auto mb-6 leading-relaxed">
            Access to the Admin Financials & System Command Center is restricted strictly to authorized platform administrators. Visitors and unauthorized accounts cannot view financial or operational desks.
            {user ? (
              <span className="block mt-2 font-mono text-xs text-white/70">
                Signed in as: <strong className="text-[#00F0D0]">{user.email}</strong> (Role: <span className="uppercase">{role}</span>)
              </span>
            ) : null}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              id="admin-return-feed-btn"
              onClick={() => navigate(fallbackUrl, { replace: true })}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-[#00F0D0] to-[#00B8D4] text-[#08090C] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,240,208,0.3)] hover:brightness-110 active:scale-[0.97] transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Public Feed</span>
            </button>

            <button
              id="admin-switch-account-btn"
              onClick={async () => {
                try {
                  await signOut();
                } catch (e) {
                  console.warn('Sign out notice:', e);
                }
                navigate('/?auth=login', { replace: true });
              }}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/[0.1] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.97] transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-[#FF334B]" />
              <span>Switch Account</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authorized Admin: Render protected route content only after isAdmin === true is completely confirmed and memoized
  return <>{children}</>;
};

export default AdminGuard;
