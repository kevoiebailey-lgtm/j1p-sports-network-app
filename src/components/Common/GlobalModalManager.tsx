import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Share2, Copy, Check, ExternalLink, ShieldCheck, Film, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { VideoPlayerModal } from '../Video/VideoPlayerModal';
import { GlobalCommandPalette } from '../Search/GlobalCommandPalette';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { GuestActionGateModal } from '../Auth/GuestActionGateModal';
import { AuthModal } from '../Auth/AuthModal';
import { PostComposerSheet } from '../feed/PostComposerSheet';
import { useNavigate, useLocation } from 'react-router-dom';

export const GlobalModalManager: React.FC = () => {
  const { activeModal, modalProps, closeModal } = useApp();
  const { showToast } = useToast();
  const { switchRole, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [copied, setCopied] = React.useState(false);

  // Global Auth Modal listener
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup' | 'reset' | 'verify' | 'admin'>('login');

  // Global Quick Post Sheet listener
  const [quickPostOpen, setQuickPostOpen] = useState(false);
  const [quickPostSport, setQuickPostSport] = useState<string>('🏀 Basketball');

  useEffect(() => {
    const handleOpenQuickPost = (e: Event) => {
      const customEvent = e as CustomEvent<{ initialSport?: string }>;
      if (customEvent.detail?.initialSport) {
        setQuickPostSport(customEvent.detail.initialSport);
      }
      setQuickPostOpen(true);
    };

    window.addEventListener('app:open-quick-post', handleOpenQuickPost);
    return () => window.removeEventListener('app:open-quick-post', handleOpenQuickPost);
  }, []);

  useEffect(() => {
    const handleOpenAuth = (e: Event) => {
      const customEvent = e as CustomEvent<{ mode?: 'login' | 'signup' | 'reset' | 'verify' | 'admin' }>;
      if (customEvent.detail?.mode) {
        setAuthModalMode(customEvent.detail.mode);
      } else {
        setAuthModalMode('login');
      }
      setAuthModalOpen(true);
    };

    window.addEventListener('app:open-auth-modal', handleOpenAuth);
    return () => window.removeEventListener('app:open-auth-modal', handleOpenAuth);
  }, []);

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      showToast('success', 'Link Copied', 'Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('error', 'Copy Failed', 'Failed to copy link');
    }
  };

  const handleRoleChange = async (newRole: UserRole) => {
    try {
      await switchRole(newRole);
      showToast('success', 'View Switched', `Switched active view to ${newRole.toUpperCase()}`);
      closeModal();
    } catch {
      showToast('error', 'Error', 'Failed to switch role');
    }
  };

  return (
    <>
      {/* 1. Global Command Palette Search */}
      <GlobalCommandPalette />

      {/* 2. Global Video Player Modal */}
      <VideoPlayerModal />

      {/* 3. Global Freemium Guest Action Gate */}
      <GuestActionGateModal />

      {/* 4. Global Auth Modal (Login / Sign Up / Passkey) */}
      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
        defaultMode={authModalMode} 
      />

      {/* 5. Global Mobile One-Thumb Quick Post Sheet ("The Wall" Dispatcher) */}
      <PostComposerSheet
        isOpen={quickPostOpen}
        onClose={() => setQuickPostOpen(false)}
        initialSport={quickPostSport}
        onSuccess={() => {
          setQuickPostOpen(false);
          // If not currently on The Wall, navigate to The Wall so user sees their new post live
          if (location.pathname !== '/wall' && location.pathname !== '/the-wall' && location.pathname !== '/feed' && location.pathname !== '/locker-room') {
            navigate('/wall');
          }
        }}
      />

      {/* 3. Global Share Modal */}
      {activeModal === 'share' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-hidden">
          <div className="fixed inset-0" onClick={closeModal} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-md mx-auto my-auto max-h-[92dvh] overflow-y-auto no-scrollbar rounded-2xl sm:rounded-3xl bg-[#0f172a] border border-cyan-500/30 p-5 shadow-[0_0_40px_rgba(0,229,255,0.15)] z-10 space-y-4 text-white"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white text-base font-sans">
                  {modalProps.title || 'Share Link'}
                </h3>
              </div>
              <button
                onClick={closeModal}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer active:scale-[0.98] transition-transform duration-150"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 font-sans">
              {modalProps.description || 'Copy this link to share with college scouts, coaches, teammates, or family.'}
            </p>

            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800">
              <input
                type="text"
                readOnly
                value={modalProps.shareUrl || window.location.href}
                className="w-full bg-transparent text-xs text-slate-300 outline-none px-2 font-mono"
              />
              <button
                onClick={() => handleCopyLink(modalProps.shareUrl || window.location.href)}
                className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1 active:scale-[0.98] transition-transform duration-150 flex-shrink-0 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 4. Global Role Switcher Modal */}
      {activeModal === 'roleSwitch' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-hidden">
          <div className="fixed inset-0" onClick={closeModal} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-md mx-auto my-auto max-h-[92dvh] overflow-y-auto no-scrollbar rounded-2xl sm:rounded-3xl bg-[#0f172a] border border-[#FF6A00]/40 p-5 shadow-[0_0_40px_rgba(255,106,0,0.2)] z-10 space-y-4 text-white"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#FF6A00]" />
                <h3 className="font-bold text-white text-base font-sans">
                  Switch Operational Role
                </h3>
              </div>
              <button
                onClick={closeModal}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer active:scale-[0.98] transition-transform duration-150"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 font-sans">
              Select an account persona to inspect real-time permissions, custom dashboards, and specialized toolsets.
            </p>

            <div className="grid grid-cols-1 gap-2">
              {[
                { id: 'athlete', title: 'Athlete / Player', desc: 'Digital pass, radar analytics, highlight reels & combines' },
                { id: 'scout', title: 'Coach / Scout', desc: 'Prospect discovery, watchlists, radar filters & notes' },
                { id: 'director', title: 'Tournament Director', desc: 'Brackets, score desk, court schedules & team check-in' },
                { id: 'viewer', title: 'Fan / Parent / Viewer', desc: 'Live game streams, media gallery & tournament updates' },
                { id: 'admin', title: 'Platform Admin', desc: 'Master command desk, financial ledgers & user audit' }
              ].map(r => (
                <button
                  key={r.id}
                  onClick={() => handleRoleChange(r.id as UserRole)}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between active:scale-[0.98] transition-transform duration-150 cursor-pointer ${
                    role === r.id
                      ? 'bg-[#FF6A00]/20 border-[#FF6A00] text-white shadow-[0_0_15px_rgba(255,106,0,0.25)]'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="font-bold text-sm text-white font-sans">{r.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5 font-sans">{r.desc}</div>
                  </div>
                  {role === r.id && (
                    <ShieldCheck className="w-5 h-5 text-[#FF6A00] flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}

    </>
  );
};
