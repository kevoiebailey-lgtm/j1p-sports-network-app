import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, Sparkles, X, ShieldCheck, Trophy, Flame } from 'lucide-react';

interface GuestAuthGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuthModal: () => void;
  actionText?: string;
}

export const GuestAuthGateModal: React.FC<GuestAuthGateModalProps> = ({
  isOpen,
  onClose,
  onOpenAuthModal,
  actionText = 'join the locker room discussion'
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-hidden">
          
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-lg bg-[#090D16] border border-[#24324F] rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl z-10 space-y-5 text-white my-auto max-h-[92dvh] overflow-y-auto no-scrollbar"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Icon */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#00B8D4] to-[#00F5D4] p-[1.5px] shadow-[0_0_20px_rgba(0,184,212,0.4)] shrink-0">
                <div className="w-full h-full bg-[#090D16] rounded-[14px] flex items-center justify-center text-xl">
                  ⚡
                </div>
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-[#F4F4F4] tracking-tight">
                  Join the Locker Room
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  Create a 100% free athletic profile to {actionText}
                </p>
              </div>
            </div>

            {/* Feature Perks Matrix */}
            <div className="grid grid-cols-1 gap-2.5 bg-[#263238]/60 border border-[#24324F] rounded-2xl p-3.5">
              <div className="flex items-center gap-2.5 text-xs text-slate-200">
                <div className="w-6 h-6 rounded-lg bg-[#FF6A00]/20 flex items-center justify-center text-[#FF6A00] font-black text-xs shrink-0">
                  🔥
                </div>
                <span>React with <strong>Hype, Sauce, Clutch & Big W</strong> boosts</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-200">
                <div className="w-6 h-6 rounded-lg bg-[#00B8D4]/20 flex items-center justify-center text-[#00B8D4] font-black text-xs shrink-0">
                  🎬
                </div>
                <span>Drop highlight tapes from <strong>Hudl, YouTube & TikTok</strong></span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-200">
                <div className="w-6 h-6 rounded-lg bg-[#FFC857]/20 flex items-center justify-center text-[#FFC857] font-black text-xs shrink-0">
                  🎯
                </div>
                <span>Get discovered by <strong>verified college coaches & scouts</strong></span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-1">
              <button
                onClick={() => {
                  onClose();
                  onOpenAuthModal();
                }}
                className="w-full min-h-[48px] flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#00B8D4] to-[#00F5D4] text-[#090D16] font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(0,184,212,0.4)] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-[#090D16]" />
                <span>Log In / Register Free</span>
              </button>

              <button
                onClick={onClose}
                className="w-full min-h-[48px] flex items-center justify-center px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                Continue Browsing as Guest
              </button>
            </div>

          </motion.div>

        </div>
      )}
    </AnimatePresence>
  );
};
