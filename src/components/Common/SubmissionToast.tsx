import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';
import { ToastNotification } from '../../hooks/useFormSubmit';

export interface SubmissionToastProps {
  toast: ToastNotification | null;
  onClose: () => void;
  autoCloseMs?: number;
}

export const SubmissionToast: React.FC<SubmissionToastProps> = ({
  toast,
  onClose,
  autoCloseMs = 4000
}) => {
  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      onClose();
    }, autoCloseMs);

    return () => clearTimeout(timer);
  }, [toast, autoCloseMs, onClose]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <AnimatePresence>
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 pointer-events-none">
        <motion.div
          initial={{ y: -50, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -30, opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className={`pointer-events-auto p-4 rounded-2xl backdrop-blur-2xl border shadow-2xl flex items-start gap-3 select-none ${
            isSuccess
              ? 'bg-[#212A31]/90 border-red-600/50 text-red-500 shadow-[0_0_30px_rgba(16,185,129,0.3)]'
              : isError
              ? 'bg-[#212A31]/90 border-rose-500/50 text-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.3)]'
              : 'bg-[#212A31]/90 border-cyan-500/50 text-slate-300 shadow-[0_0_30px_rgba(6,182,212,0.3)]'
          }`}
        >
          {/* Glowing Icon */}
          <div className={`p-2 rounded-xl shrink-0 ${
            isSuccess 
              ? 'bg-red-600/20 text-red-500 border border-red-600/40 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
              : isError
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.5)]'
              : 'bg-[#E5B868]/20 text-slate-300 border border-[#E5B868]/40'
          }`}>
            {isSuccess && <CheckCircle2 className="w-5 h-5 animate-pulse" />}
            {isError && <AlertCircle className="w-5 h-5 animate-bounce" />}
            {!isSuccess && !isError && <Info className="w-5 h-5" />}
          </div>

          {/* Toast Message Body */}
          <div className="flex-1 space-y-0.5 pt-0.5">
            <h4 className="text-xs font-black uppercase tracking-wider font-mono">
              {toast.title || (isSuccess ? '✅ Success' : isError ? '❌ Submission Error' : 'Notice')}
            </h4>
            <p className="text-xs text-slate-200 font-sans leading-snug">
              {toast.message}
            </p>
          </div>

          {/* Dismiss Button */}
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Dismiss Notification"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
