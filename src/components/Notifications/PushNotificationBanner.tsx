import React, { useState } from 'react';
import { Bell, BellRing, CheckCircle2, AlertCircle, Sparkles, X, Radio, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePushNotifications } from '../../hooks/usePushNotifications';

interface PushNotificationBannerProps {
  onDismiss?: () => void;
  className?: string;
}

export const PushNotificationBanner: React.FC<PushNotificationBannerProps> = ({
  onDismiss,
  className = ''
}) => {
  const { permission, isSupported, loading, requestPermission } = usePushNotifications();
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [successFeedback, setSuccessFeedback] = useState<boolean>(false);

  // Don't show if already granted, unsupported, or explicitly dismissed
  if (permission === 'granted' || !isSupported || dismissed) {
    return null;
  }

  const handleAllowPush = async () => {
    const granted = await requestPermission();
    if (granted) {
      setSuccessFeedback(true);
      setTimeout(() => {
        setDismissed(true);
        onDismiss?.();
      }, 2500);
    }
  };

  const handleClose = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        className={`relative w-full rounded-2xl bg-gradient-to-r from-[#212A31] via-[#1B242B] to-[#263238] border border-[#00B8D4]/40 p-3.5 shadow-xl backdrop-blur-xl ${className}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="relative p-2.5 rounded-xl bg-[#00B8D4]/15 border border-[#00B8D4]/40 text-[#00B8D4] shrink-0 shadow-[0_0_12px_rgba(0,184,212,0.3)]">
              {successFeedback ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <BellRing className="w-5 h-5 animate-bounce text-[#00B8D4]" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-white">
                  {successFeedback ? 'Web Push Notifications Active!' : 'Enable Instant Game & DM Push Alerts'}
                </h4>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#FF6A00]/20 text-[#FF6A00] border border-[#FF6A00]/40">
                  FREE
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5 max-w-xl">
                {successFeedback
                  ? 'You will now receive instant score ticker alerts, DM updates, and locker room mentions on this device.'
                  : 'Get real-time push alerts for Direct Messages, overtime touchdowns, live score updates, and tournament brackets even when this tab is closed.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {!successFeedback && (
              <>
                <button
                  onClick={handleAllowPush}
                  disabled={loading}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#00B8D4] to-[#00F5D4] text-slate-950 font-black text-xs hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(0,184,212,0.4)] cursor-pointer flex items-center gap-1.5"
                >
                  {loading ? (
                    <>
                      <Radio className="w-3.5 h-3.5 animate-spin" />
                      <span>Enabling...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Turn On Alerts</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleClose}
                  aria-label="Dismiss banner"
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
