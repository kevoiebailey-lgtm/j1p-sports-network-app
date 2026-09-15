import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, QrCode, ShieldCheck, Trophy, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { VerifiedBadge } from '../Common/VerifiedBadge';

interface ProMobileQuickPassModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProMobileQuickPassModal: React.FC<ProMobileQuickPassModalProps> = ({
  isOpen,
  onClose
}) => {
  const { user, profile, role } = useAuth();
  const userName = user?.displayName || profile?.displayName || 'Jayden Carter';
  const avatarUrl = user?.photoURL || profile?.avatarUrl || profile?.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

  // Back button popstate listener for graceful closing on mobile
  useEffect(() => {
    if (!isOpen) return;

    const handlePopState = () => {
      onClose();
    };

    window.history.pushState({ modalOpen: 'qrPass' }, '');
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4">
        <motion.div
          drag="y"
          dragConstraints={{ top: 0 }}
          dragElastic={0.2}
          onDragEnd={(_, info) => {
            if (info.offset.y > 120 || info.velocity.y > 500) {
              onClose();
            }
          }}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-[#212A31] border-t-2 sm:border-2 border-[#E5B868] p-5 sm:p-6 text-left space-y-4 shadow-[0_0_50px_rgba(214,28,36,0.3)] relative max-h-[85dvh] overflow-y-auto touch-pan-y"
        >
          {/* Drag Handle Indicator */}
          <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto cursor-grab active:cursor-grabbing sm:hidden" />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-[#E5B868]/15 text-[#E5B868]">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black italic uppercase text-white tracking-tight">
                  DIGITAL PLAYER QR PASS
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  Instant Coach & Scanner Check-In Credential
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 text-slate-300 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* CARD CONTAINER */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-black via-[#212A31] to-black border border-[#E5B868]/40 shadow-xl space-y-4 text-center">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-[10px] font-mono font-bold text-[#E5B868] uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                OFFICIAL JUST1PLAY CREDENTIAL
              </span>
              <span className="px-2 py-0.5 bg-[#E5B868] text-black font-black text-[9px] uppercase rounded font-mono">
                ACTIVE
              </span>
            </div>

            <div className="flex items-center gap-3 text-left">
              <img
                src={avatarUrl}
                alt={userName}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-[#E5B868]"
              />
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-black text-white text-base uppercase">
                  <span>{userName}</span>
                  <VerifiedBadge size="sm" />
                </div>
                <div className="text-xs text-slate-300 font-mono">
                  Role: <span className="text-[#E5B868] font-bold uppercase">{role.replace('_', ' ')}</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  ID: J1P-2026-884C9
                </div>
              </div>
            </div>

            {/* QR CODE DISPLAY */}
            <div className="p-4 bg-white rounded-2xl inline-block mx-auto shadow-inner">
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=JUST1PLAY-ATHLETE-J1P-2026-884C9"
                alt="QR Pass Code"
                className="w-40 h-40 mx-auto"
              />
            </div>

            <p className="text-[11px] text-slate-300 font-mono">
              Show this QR pass to court scanners or tournament organizers for instant check-in.
            </p>
          </div>

          {/* Footer Action */}
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl bg-[#E5B868] text-black font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(214,28,36,0.5)] cursor-pointer"
          >
            Done / Dismiss
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
