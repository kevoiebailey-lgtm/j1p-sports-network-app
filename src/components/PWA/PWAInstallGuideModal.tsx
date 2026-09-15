import React, { useState } from 'react';
import { 
  X, 
  Share, 
  PlusSquare, 
  CheckCircle2, 
  Smartphone, 
  Download, 
  Sparkles, 
  Compass, 
  MoreVertical,
  Monitor
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '../../lib/haptics';

interface PWAInstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerNativeInstall?: () => void;
  hasNativePrompt?: boolean;
}

export const PWAInstallGuideModal: React.FC<PWAInstallGuideModalProps> = ({
  isOpen,
  onClose,
  onTriggerNativeInstall,
  hasNativePrompt = false
}) => {
  const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const [activeTab, setActiveTab] = useState<'ios' | 'android' | 'desktop'>(isIOS ? 'ios' : 'android');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-[#263238]/85 dark:bg-[#140802]/90 backdrop-blur-xl flex items-end sm:items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 30 }}
          className="w-full max-w-lg bg-white dark:bg-[#1E282D] border border-slate-200 dark:border-white/15 rounded-3xl p-6 shadow-[0_25px_60px_rgba(0,0,0,0.9)] relative overflow-hidden text-[#263238] dark:text-white"
        >
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#FF6A00]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#FF6A00]/15 border border-[#FF6A00]/30 text-[#FF6A00] flex items-center justify-center shadow-lg">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-[#263238] dark:text-white flex items-center gap-1.5 font-sans">
                  <span>Install Just1Play App</span>
                  <Sparkles className="w-3.5 h-3.5 text-[#FF6A00]" />
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  Full-screen mobile app • Offline Scouting Feeds
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-black dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Trigger Native Install Button if Available */}
          {hasNativePrompt && onTriggerNativeInstall && (
            <div className="mb-5 p-3.5 rounded-2xl bg-[#FF6A00]/10 border border-[#FF6A00]/30 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-[#FF6A00]">Automatic Installer Supported!</p>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">Tap below to add Just1Play instantly.</p>
              </div>
              <button
                onClick={() => {
                  triggerHaptic('medium');
                  onTriggerNativeInstall();
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FF8C00] hover:from-[#E05D00] hover:to-[#FF6A00] text-white font-mono font-black text-xs transition-all shadow-[0_0_15px_rgba(255,106,0,0.4)] flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install Now</span>
              </button>
            </div>
          )}

          {/* Device Tabs */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-black/40 rounded-2xl border border-slate-200 dark:border-white/10 mb-5">
            <button
              onClick={() => setActiveTab('ios')}
              className={`flex-1 py-2 text-center text-xs font-mono font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'ios'
                  ? 'bg-gradient-to-r from-[#FF6A00] to-[#FF8C00] text-white shadow-[0_0_12px_rgba(255,106,0,0.4)]'
                  : 'text-slate-500 dark:text-slate-400 hover:text-black dark:hover:text-white'
              }`}
            >
              iPhone / iPad (iOS)
            </button>

            <button
              onClick={() => setActiveTab('android')}
              className={`flex-1 py-2 text-center text-xs font-mono font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'android'
                  ? 'bg-gradient-to-r from-[#FF6A00] to-[#FF8C00] text-white shadow-[0_0_12px_rgba(255,106,0,0.4)]'
                  : 'text-slate-500 dark:text-slate-400 hover:text-black dark:hover:text-white'
              }`}
            >
              Android Phone
            </button>

            <button
              onClick={() => setActiveTab('desktop')}
              className={`flex-1 py-2 text-center text-xs font-mono font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'desktop'
                  ? 'bg-gradient-to-r from-[#FF6A00] to-[#FF8C00] text-white shadow-[0_0_12px_rgba(255,106,0,0.4)]'
                  : 'text-slate-500 dark:text-slate-400 hover:text-black dark:hover:text-white'
              }`}
            >
              Desktop / Mac
            </button>
          </div>

          {/* Guide Steps */}
          {activeTab === 'ios' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-[#FF6A00]/20 border border-[#FF6A00]/40 text-[#FF6A00] flex items-center justify-center text-xs font-mono font-bold flex-shrink-0">
                  1
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-[#263238] dark:text-white flex items-center gap-1.5">
                    <span>Tap the Safari Share Button</span>
                    <Share className="w-4 h-4 text-[#FF6A00] inline" />
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    At the bottom of your Safari browser bar, tap the Share icon <span className="text-[#FF6A00] font-bold">[↑]</span>.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-[#FF6A00]/20 border border-[#FF6A00]/40 text-[#FF6A00] flex items-center justify-center text-xs font-mono font-bold flex-shrink-0">
                  2
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-[#263238] dark:text-white flex items-center gap-1.5">
                    <span>Tap "Add to Home Screen"</span>
                    <PlusSquare className="w-4 h-4 text-[#FF6A00] inline" />
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Scroll down the options list and select <span className="text-[#263238] dark:text-white font-bold">"Add to Home Screen"</span> (+ icon).
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-[#FF6A00]/20 border border-[#FF6A00]/40 text-[#FF6A00] flex items-center justify-center text-xs font-mono font-bold flex-shrink-0">
                  3
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-[#263238] dark:text-white flex items-center gap-1.5">
                    <span>Confirm & Launch</span>
                    <CheckCircle2 className="w-4 h-4 text-[#00B8D4] inline" />
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Tap <span className="text-[#FF6A00] font-bold">"Add"</span> in the top right. Just1Play icon will appear on your iPhone home screen!
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'android' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-[#FF6A00]/20 border border-[#FF6A00]/40 text-[#FF6A00] flex items-center justify-center text-xs font-mono font-bold flex-shrink-0">
                  1
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-[#263238] dark:text-white flex items-center gap-1.5">
                    <span>Open Chrome Options</span>
                    <MoreVertical className="w-4 h-4 text-[#FF6A00] inline" />
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Tap the 3 dots menu <span className="text-[#FF6A00] font-bold">(⋮)</span> in the top right corner of Chrome.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-[#FF6A00]/20 border border-[#FF6A00]/40 text-[#FF6A00] flex items-center justify-center text-xs font-mono font-bold flex-shrink-0">
                  2
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-[#263238] dark:text-white flex items-center gap-1.5">
                    <span>Select "Install App" or "Add to Home screen"</span>
                    <Download className="w-4 h-4 text-[#FF6A00] inline" />
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Tap <span className="text-[#263238] dark:text-white font-bold">"Install App"</span> or <span className="text-[#263238] dark:text-white font-bold">"Add to Home screen"</span>.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-[#FF6A00]/20 border border-[#FF6A00]/40 text-[#FF6A00] flex items-center justify-center text-xs font-mono font-bold flex-shrink-0">
                  3
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-[#263238] dark:text-white flex items-center gap-1.5">
                    <span>Enjoy Standalone App Mode</span>
                    <CheckCircle2 className="w-4 h-4 text-[#00B8D4] inline" />
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Confirm prompt to launch Just1Play as a standalone app with offline performance.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'desktop' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-[#FF6A00]/20 border border-[#FF6A00]/40 text-[#FF6A00] flex items-center justify-center text-xs font-mono font-bold flex-shrink-0">
                  1
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-[#263238] dark:text-white flex items-center gap-1.5">
                    <span>Look for the Install Icon in Address Bar</span>
                    <Monitor className="w-4 h-4 text-[#FF6A00] inline" />
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    In Chrome/Edge address bar, click the computer download icon <span className="text-[#FF6A00] font-bold">[⊕]</span> on the far right.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-[#FF6A00]/20 border border-[#FF6A00]/40 text-[#FF6A00] flex items-center justify-center text-xs font-mono font-bold flex-shrink-0">
                  2
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-[#263238] dark:text-white flex items-center gap-1.5">
                    <span>Click "Install"</span>
                    <CheckCircle2 className="w-4 h-4 text-[#00B8D4] inline" />
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Just1Play will open in its own dedicated desktop window icon on your dock/taskbar!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Footer Close Button */}
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10 flex justify-end">
            <button
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-[#263238] dark:text-white font-mono font-bold text-xs transition-colors cursor-pointer"
            >
              Got It
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PWAInstallGuideModal;
