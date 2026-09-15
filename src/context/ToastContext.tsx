import React, { useState, useEffect, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

// ==========================================
// 1. TYPES & CONTEXT SETUP
// ==========================================
export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // In milliseconds
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

/**
 * Global helper to dispatch toasts from non-React service modules (like storageService)
 */
export function dispatchGlobalToast(
  type: ToastType,
  title: string,
  message?: string,
  duration?: number
) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('app:toast', {
        detail: { type, title, message, duration }
      })
    );
  }
}

// ==========================================
// 2. INDIVIDUAL TOAST CARD
// ==========================================
interface ToastCardProps {
  toast: Toast;
  onClose: (id: string) => void;
}

const ToastCard: React.FC<ToastCardProps> = ({ toast, onClose }) => {
  const { id, type, title, message, duration = 4000 } = toast;

  // Auto-dismiss timer
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  // Color & Icon Styles per Toast Type
  const styles = {
    success: {
      border: 'border-red-600/40 hover:border-red-600/80',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.2)]',
      iconBg: 'bg-red-600/20 border-red-600/30 text-red-500',
      progress: 'bg-red-500',
      icon: CheckCircle2,
    },
    error: {
      border: 'border-rose-500/40 hover:border-rose-500/80',
      glow: 'shadow-[0_0_20px_rgba(244,63,94,0.2)]',
      iconBg: 'bg-rose-500/20 border-rose-500/30 text-rose-400',
      progress: 'bg-rose-500',
      icon: AlertCircle,
    },
    info: {
      border: 'border-[#E5B868]/40 hover:border-cyan-500/80',
      glow: 'shadow-[0_0_20px_rgba(6,182,212,0.2)]',
      iconBg: 'bg-[#E5B868]/20 border-cyan-500/30 text-slate-300',
      progress: 'bg-slate-600',
      icon: Info,
    },
  }[type];

  const IconComponent = styles.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`relative overflow-hidden w-full max-w-sm rounded-2xl bg-[#212A31]/85 backdrop-blur-2xl border ${styles.border} ${styles.glow} p-4 text-slate-100 shadow-2xl transition-all group pointer-events-auto`}
    >
      <div className="flex items-start gap-3">
        {/* Glowing Icon Container */}
        <div className={`p-2 rounded-xl border ${styles.iconBg} flex items-center justify-center shrink-0`}>
          <IconComponent className="w-5 h-5 drop-shadow-[0_0_8px_currentColor]" />
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0 pr-2">
          <h4 className="text-xs font-black tracking-wider uppercase text-white truncate font-sans">
            {title}
          </h4>
          {message && (
            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug font-sans">
              {message}
            </p>
          )}
        </div>

        {/* Manual Close Button */}
        <button
          onClick={() => onClose(id)}
          className="text-slate-500 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-800/50 cursor-pointer"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Animated Countdown Progress Bar */}
      <motion.div
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: duration / 1000, ease: 'linear' }}
        className={`absolute bottom-0 left-0 h-0.5 ${styles.progress} opacity-80`}
      />
    </motion.div>
  );
};

// ==========================================
// 3. PROVIDER & CONTAINER
// ==========================================
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (type: ToastType, title: string, message?: string, duration?: number) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message, duration }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  useEffect(() => {
    const handleGlobalToast = (e: Event) => {
      const customEvent = e as CustomEvent<{
        type: ToastType;
        title: string;
        message?: string;
        duration?: number;
      }>;
      if (customEvent.detail) {
        const { type, title, message, duration } = customEvent.detail;
        showToast(type, title, message, duration);
      }
    };

    window.addEventListener('app:toast', handleGlobalToast);
    return () => window.removeEventListener('app:toast', handleGlobalToast);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}

      {/* Floating Toast Container (Top Right Anchor) */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 pointer-events-none w-[90vw] max-w-sm">
        <AnimatePresence>
          {toasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto">
              <ToastCard toast={toast} onClose={removeToast} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

// ==========================================
// 4. DEMO / TESTING SANDBOX
// ==========================================
export const ToastDemoSandbox: React.FC = () => {
  const { showToast } = useToast();

  return (
    <div className="p-8 rounded-3xl bg-[#212A31]/60 border border-slate-800/80 backdrop-blur-md max-w-md mx-auto text-center space-y-4">
      <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sans">
        Test Form Submission Alerts
      </h3>
      <p className="text-xs text-slate-400 font-sans">
        Click below to simulate real-time form state feedback.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() =>
            showToast('success', 'Athlete Added!', 'Kevoie Bailey was added to the roster successfully.')
          }
          className="px-3 py-2 rounded-xl bg-red-600/10 border border-red-600/30 text-red-500 hover:bg-red-600/20 text-xs font-semibold transition-all cursor-pointer font-sans"
        >
          Success Toast
        </button>

        <button
          onClick={() =>
            showToast('error', 'Submission Failed', 'Database connection timed out. Please try again.')
          }
          className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold transition-all cursor-pointer font-sans"
        >
          Error Toast
        </button>

        <button
          onClick={() =>
            showToast('info', 'Event Processing', 'Recruiting statistics are currently updating...')
          }
          className="px-3 py-2 rounded-xl bg-slate-700/10 border border-cyan-500/30 text-slate-300 hover:bg-[#E5B868]/20 text-xs font-semibold transition-all cursor-pointer font-sans"
        >
          Info Toast
        </button>
      </div>
    </div>
  );
};
