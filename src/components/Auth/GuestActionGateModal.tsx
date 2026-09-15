import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Lock, 
  Sparkles, 
  ArrowRight, 
  Trophy, 
  Heart, 
  MessageSquare, 
  ShieldCheck, 
  Flame, 
  Zap, 
  Camera, 
  UserPlus, 
  LogIn 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BrandLogo } from '../Common/BrandLogo';

export interface GuestGateEventDetail {
  action?: string;
  targetName?: string;
  source?: string;
}

export const triggerGuestActionGate = (action: string = 'Interacting with Athletes', targetName?: string) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<GuestGateEventDetail>('app:open-guest-gate', {
        detail: { action, targetName }
      })
    );
  }
};

export const GuestActionGateModal: React.FC = () => {
  const { user, signInWithGoogle } = useAuth();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [actionDetail, setActionDetail] = useState<GuestGateEventDetail>({
    action: 'connect with athletes on Just One Play'
  });
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<GuestGateEventDetail>;
      if (!user) {
        setActionDetail(customEvent.detail || { action: 'connect with athletes on Just One Play' });
        setIsOpen(true);
      }
    };

    window.addEventListener('app:open-guest-gate', handleOpen);
    return () => window.removeEventListener('app:open-guest-gate', handleOpen);
  }, [user]);

  // If user signs in, close gate immediately
  useEffect(() => {
    if (user && isOpen) {
      setIsOpen(false);
    }
  }, [user, isOpen]);

  if (!isOpen || user) return null;

  const handleOpenAuth = (mode: 'signup' | 'login') => {
    setIsOpen(false);
    window.dispatchEvent(
      new CustomEvent('app:open-auth-modal', { detail: { mode } })
    );
  };

  const handleGoogleQuickAuth = async () => {
    setError(null);
    setLoadingGoogle(true);
    try {
      await signInWithGoogle('athlete');
      setIsOpen(false);
    } catch (err: any) {
      setError(err?.message || 'Google sign-in was interrupted. Please try again.');
    } finally {
      setLoadingGoogle(false);
    }
  };

  return (
    <AnimatePresence>
      <div 
        id="guest-action-gate-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl overflow-hidden"
        onClick={() => setIsOpen(false)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg mx-auto my-auto max-h-[92dvh] overflow-y-auto no-scrollbar rounded-2xl sm:rounded-3xl bg-[#0F172A] border border-[#00B8D4]/40 p-5 sm:p-8 shadow-[0_0_60px_rgba(0,184,212,0.25)] text-white font-sans"
        >
          {/* Neon Top Lighting Glows */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#FF6A00]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#00B8D4]/15 rounded-full blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header Branding */}
          <div className="text-center space-y-3 mb-6">
            <div className="flex justify-center pb-1">
              <BrandLogo size="md" layout="vertical" showTagline={false} />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF6A00]/20 border border-[#FF6A00]/40 text-xs font-mono font-bold text-[#FF6A00]">
              <Lock className="w-3.5 h-3.5 text-[#FF6A00]" />
              <span>GUEST ACTION GATE</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight text-white font-sans">
              Connect With <span className="text-[#FF6A00] drop-shadow-[0_0_15px_rgba(255,106,0,0.5)]">Athletes</span>
            </h3>

            <p className="text-sm text-slate-300 font-mono max-w-md mx-auto leading-relaxed">
              Sign up or log in to connect with athletes on Just One Play.
            </p>

            {actionDetail.action && (
              <div className="inline-block px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono text-cyan-300">
                Action: <span className="text-white font-bold">{actionDetail.action}</span>
                {actionDetail.targetName ? ` with ${actionDetail.targetName}` : ''}
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs text-center font-mono">
              {error}
            </div>
          )}

          {/* Key Value Propositions */}
          <div className="grid grid-cols-3 gap-2.5 mb-6 py-2">
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-center space-y-1">
              <Flame className="w-4 h-4 text-[#FF6A00] mx-auto" />
              <div className="text-[10px] font-mono font-bold text-slate-300">Post & React</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-center space-y-1">
              <MessageSquare className="w-4 h-4 text-[#00B8D4] mx-auto" />
              <div className="text-[10px] font-mono font-bold text-slate-300">Direct Message</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-center space-y-1">
              <Trophy className="w-4 h-4 text-[#FFC857] mx-auto" />
              <div className="text-[10px] font-mono font-bold text-slate-300">Scout & Recruit</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Google One-Tap Action */}
            <button
              type="button"
              onClick={handleGoogleQuickAuth}
              disabled={loadingGoogle}
              className="w-full py-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-lg cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loadingGoogle ? 'Connecting Google...' : 'Continue with Google'}</span>
            </button>

            {/* Email Sign Up */}
            <button
              type="button"
              onClick={() => handleOpenAuth('signup')}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#FF6A00] to-[#FF8C00] hover:from-[#E05D00] hover:to-[#FF6A00] text-white font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(255,106,0,0.4)] border border-[#FFC857]/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Free Member Account</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>

            {/* Existing Member Log In */}
            <button
              type="button"
              onClick={() => handleOpenAuth('login')}
              className="w-full py-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-[#00B8D4]" />
              <span>Already a member? Log In</span>
            </button>
          </div>

          {/* Footer Note */}
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs font-mono text-slate-400 hover:text-white underline underline-offset-4 cursor-pointer"
            >
              Continue exploring as guest visitor
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
