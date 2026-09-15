import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, BellRing, Sparkles, X, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { 
  getNotificationPermissionStatus, 
  requestFCMNotificationToken, 
  listenToForegroundFCM 
} from '../../lib/firebaseNotifications';

export const NotificationPermissionBanner: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [permission, setPermission] = useState<string>('default');
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    return localStorage.getItem('just1play_fcm_banner_dismissed') === 'true';
  });
  const [isEnabling, setIsEnabling] = useState<boolean>(false);

  useEffect(() => {
    setPermission(getNotificationPermissionStatus());

    // Bind foreground FCM listener to display in-app toast
    let unsubscribe: (() => void) | null = null;
    listenToForegroundFCM((payload) => {
      showToast('info', payload.title, payload.body);
    }).then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [showToast]);

  const handleEnableAlerts = async () => {
    if (!user) {
      showToast('error', 'Authentication Required', 'Please sign in to enable push notifications.');
      return;
    }

    setIsEnabling(true);
    const result = await requestFCMNotificationToken(user.uid);
    setIsEnabling(false);

    if (result.success) {
      setPermission('granted');
      showToast('success', '⚡ Instant Alerts Enabled', 'You will receive real-time push notifications for scout inquiries and combine offers.');
    } else {
      setPermission(getNotificationPermissionStatus());
      showToast('info', 'Alert Notice', result.error || 'Notification permission was not enabled.');
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('just1play_fcm_banner_dismissed', 'true');
  };

  // If already granted, dismissed, or unsupported, hide banner
  if (permission === 'granted' || permission === 'unsupported' || isDismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="w-full bg-gradient-to-r from-[#263238] via-[#1a252f] to-[#263238] border border-[#00B8D4]/40 rounded-2xl p-3 sm:p-3.5 shadow-lg relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white"
      >
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#00B8D4]/10 rounded-full blur-2xl pointer-events-none" />

        {/* Content */}
        <div className="flex items-center gap-3 relative z-10 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#00B8D4]/20 border border-[#00B8D4]/50 flex items-center justify-center text-[#00B8D4] shrink-0 shadow-[0_0_10px_rgba(0,184,212,0.3)]">
            <BellRing className="w-4 h-4 animate-bounce" />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold text-[#F4F4F4] tracking-tight truncate">
              ⚡ Enable instant alerts for scout inquiries & combine updates
            </p>
            <p className="text-[11px] text-slate-300 font-medium hidden sm:block">
              Get notified immediately when college coaches and scouts evaluate your profile.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 relative z-10 shrink-0 self-end sm:self-auto">
          <button
            onClick={handleEnableAlerts}
            disabled={isEnabling}
            className="min-h-[48px] px-4 py-2 rounded-xl bg-gradient-to-r from-[#00B8D4] to-[#00F5D4] text-[#090D16] font-black text-xs uppercase tracking-wider font-mono shadow-[0_0_15px_rgba(0,184,212,0.4)] hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isEnabling ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#090D16]" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-[#090D16]" />
            )}
            <span>Enable Alerts</span>
          </button>

          <button
            onClick={handleDismiss}
            className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
