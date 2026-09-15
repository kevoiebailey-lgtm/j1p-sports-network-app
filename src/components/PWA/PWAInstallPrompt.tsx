import React, { useState, useEffect } from 'react';
import { WifiOff, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { registerServiceWorker } from '../../registerServiceWorker';
import { PWAInstallBanner } from './PWAInstallBanner';
import { PWAUpdateBanner } from './PWAUpdateBanner';
import { PWAInstallGuideModal } from './PWAInstallGuideModal';

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [updateRegistration, setUpdateRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isOfflineBannerDismissed, setIsOfflineBannerDismissed] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker and subscribe to updates
    registerServiceWorker({
      onUpdateAvailable: (registration) => {
        setUpdateRegistration(registration);
      }
    });

    // 2. Listen for native browser PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      console.log('[PWA] App successfully installed');
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // 3. Monitor Online/Offline connectivity status
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => {
      setIsOffline(true);
      setIsOfflineBannerDismissed(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerNativePrompt = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.warn('Native prompt failed:', err);
      }
    }
  };

  return (
    <>
      {/* Component 2: Software Update Notification Banner (Anchored at Top) */}
      <PWAUpdateBanner registration={updateRegistration} />

      {/* Component 1: Mobile PWA Install Banner (Anchored above floating dock) */}
      <PWAInstallBanner
        deferredPrompt={deferredPrompt}
        onOpenGuide={() => setIsGuideOpen(true)}
        onInstalled={() => setDeferredPrompt(null)}
      />

      {/* Interactive Step-by-Step PWA Installation Modal (iOS & Android) */}
      <PWAInstallGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        hasNativePrompt={!!deferredPrompt}
        onTriggerNativeInstall={triggerNativePrompt}
      />

      {/* Offline Connectivity Notification Banner */}
      <AnimatePresence>
        {isOffline && !isOfflineBannerDismissed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-28 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-40 pointer-events-auto"
          >
            <div className="p-3.5 rounded-2xl bg-[#212A31]/95 border border-amber-500/40 text-amber-300 backdrop-blur-xl shadow-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <WifiOff className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-amber-200">Scouting Offline Mode</p>
                  <p className="text-[11px] text-amber-400/80 font-mono">Serving cached feeds & rosters</p>
                </div>
              </div>
              <button
                onClick={() => setIsOfflineBannerDismissed(true)}
                className="p-1 rounded-lg text-amber-400/60 hover:text-amber-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PWAInstallPrompt;
