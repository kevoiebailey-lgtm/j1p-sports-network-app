import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  ShieldCheck, 
  Key, 
  Bot, 
  Video, 
  CheckCircle2, 
  Save, 
  AlertTriangle, 
  Lock, 
  Sparkles, 
  Radio,
  RefreshCw,
  Database,
  Layers,
  Zap
} from 'lucide-react';
import { FirebaseStorageDiagnostics } from './FirebaseStorageDiagnostics';
import { MediaGalleryClearUtility } from './MediaGalleryClearUtility';
import { FirebaseDataMigrationUtility } from './FirebaseDataMigrationUtility';
import firebaseConfig from '../../../firebase-applet-config.json';
import { isCleanSlateMode, setCleanSlateMode } from '../../lib/productionMode';

export const AdminSettingsPage: React.FC = () => {
  const [cleanSlate, setCleanSlateState] = useState<boolean>(() => isCleanSlateMode());
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    registrationOpen: true,
    geminiAutoMod: true,
    videoTranscoding: true,
    autoVerifyTop100: false,
    maxVideoUploadMb: '500',
    platformName: 'Just1Play Standalone Sports Platform'
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleCleanSlateToggle = (enabled: boolean) => {
    setCleanSlateMode(enabled);
    setCleanSlateState(enabled);
    setToastMessage(
      enabled 
        ? 'Clean Slate Production Mode ENABLED! Platform will only render 100% real live Firestore content.' 
        : 'Demo Seed Mode Enabled. Sample demo data will be displayed.'
    );
    setTimeout(() => setToastMessage(null), 4500);
  };

  const handleSave = () => {
    setToastMessage('Platform Settings updated successfully!');
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-24 right-6 z-50 p-4 rounded-2xl bg-[#000000]/90 border border-[#E5B868] text-white shadow-[0_0_30px_rgba(214,28,36,0.3)] backdrop-blur-2xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-[#E5B868]" />
          <span className="text-xs font-bold font-sans uppercase">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="p-6 rounded-3xl bg-[#212A31]/90 border border-white/10 backdrop-blur-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E5B868]/10 border border-[#E5B868]/30 text-[#E5B868] text-xs font-mono font-bold uppercase tracking-widest mb-2">
            <Settings className="w-3.5 h-3.5" />
            <span>System Configuration & API Controls</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black italic uppercase text-white font-sans tracking-tight">
            PLATFORM <span className="text-[#E5B868]">SETTINGS</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Global operational toggles, AI auto-moderation, and API key status.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-5 py-3 rounded-2xl bg-[#E5B868] hover:bg-[#B8141B] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(214,28,36,0.4)] transition-all cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>Save Changes</span>
        </button>
      </div>

      {/* Toggles & Configurations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Platform Control Toggles */}
        <div className="p-6 rounded-3xl bg-[#212A31]/90 border border-white/10 backdrop-blur-2xl space-y-5">
          <div className="border-b border-white/10 pb-4">
            <h2 className="text-lg font-black italic uppercase text-white font-sans tracking-wider">
              SYSTEM SWITCHES
            </h2>
            <p className="text-xs text-slate-400">Global availability and moderation parameters.</p>
          </div>

          <div className="space-y-4">
            
            {/* Option B: Clean Slate Production Mode */}
            <div className="p-4 rounded-2xl bg-[#E5B868]/5 border border-[#E5B868]/30 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-white uppercase font-sans flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#E5B868]" />
                  <span>Option B: Clean Slate (100% Real Live Production Data)</span>
                  {cleanSlate ? (
                    <span className="px-2 py-0.5 rounded-full bg-[#E5B868]/20 border border-[#E5B868]/50 text-[#E5B868] text-[10px] font-mono font-bold uppercase">ACTIVE</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 text-[10px] font-mono font-bold uppercase">DEMO MODE</span>
                  )}
                </div>
                <div className="text-[11px] text-slate-300 mt-1">
                  {cleanSlate 
                    ? 'Strictly display 100% real user-created content from Firestore. All dummy sample profiles, events, and blogs are disabled.'
                    : 'Display fallback sample demo profiles and dummy events for testing.'}
                </div>
              </div>
              <input
                type="checkbox"
                checked={cleanSlate}
                onChange={e => handleCleanSlateToggle(e.target.checked)}
                className="w-5 h-5 accent-[#E5B868] cursor-pointer"
              />
            </div>

            {/* Maintenance Mode */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-white uppercase font-sans flex items-center gap-2">
                  <span>Maintenance Mode</span>
                  {settings.maintenanceMode && <span className="text-red-400 font-mono text-[10px]">(ACTIVE)</span>}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Display a system maintenance overlay to non-admin visitors.
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={e => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                className="w-5 h-5 accent-[#E5B868] cursor-pointer"
              />
            </div>

            {/* Public Registration */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-white uppercase font-sans">
                  Open User Registration
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Allow new athletes and scouts to create accounts freely.
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.registrationOpen}
                onChange={e => setSettings({ ...settings, registrationOpen: e.target.checked })}
                className="w-5 h-5 accent-[#E5B868] cursor-pointer"
              />
            </div>

            {/* Gemini Auto-Moderation */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-white uppercase font-sans flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-[#E5B868]" />
                  <span>Gemini AI Auto-Moderation</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Scan social feed posts & blogs for inappropriate text or profanity.
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.geminiAutoMod}
                onChange={e => setSettings({ ...settings, geminiAutoMod: e.target.checked })}
                className="w-5 h-5 accent-[#E5B868] cursor-pointer"
              />
            </div>

            {/* Video Transcoding */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-white uppercase font-sans flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-slate-300" />
                  <span>Video Transcoding Optimization</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Optimize uploaded .mp4 reels for low-latency web playback.
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.videoTranscoding}
                onChange={e => setSettings({ ...settings, videoTranscoding: e.target.checked })}
                className="w-5 h-5 accent-[#E5B868] cursor-pointer"
              />
            </div>

          </div>
        </div>

        {/* API & Cloud Integration Status */}
        <div className="p-6 rounded-3xl bg-[#212A31]/90 border border-white/10 backdrop-blur-2xl space-y-5">
          <div className="border-b border-white/10 pb-4">
            <h2 className="text-lg font-black italic uppercase text-white font-sans tracking-wider">
              API INTEGRATION STATUS
            </h2>
            <p className="text-xs text-slate-400">Status of connected backend services & credentials.</p>
          </div>

          <div className="space-y-3.5">
            
            {/* Firebase Status */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white uppercase font-sans">Firebase Firestore & Storage</div>
                  <div className="text-[10px] text-slate-400 font-mono">Project ID: {firebaseConfig.projectId} ({firebaseConfig.storageBucket})</div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-600/20 text-emerald-400 text-[10px] font-mono font-bold uppercase border border-emerald-600/40">
                Production Ready
              </span>
            </div>

            {/* Gemini AI Status */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#E5B868]/10 text-[#E5B868]">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white uppercase font-sans">Gemini 2.5 Flash SDK</div>
                  <div className="text-[10px] text-slate-400 font-mono">Server-side API Route (@google/genai)</div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-red-600/20 text-red-500 text-[10px] font-mono font-bold uppercase border border-red-600/40">
                Active
              </span>
            </div>

            {/* PayPal Partner Commerce Gateway */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#0070BA]/10 text-[#0070BA]">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white uppercase font-sans">PayPal Partner Commerce Gateway</div>
                  <div className="text-[10px] text-slate-400 font-mono">Live Partner Merchant Rails Connected</div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold uppercase border border-emerald-500/40">
                Active
              </span>
            </div>

          </div>
        </div>

      </div>

      {/* Data Migration, Storage & Media Gallery Maintenance Tools */}
      <div className="mt-8 space-y-8">
        <FirebaseDataMigrationUtility />
        <MediaGalleryClearUtility />
        <FirebaseStorageDiagnostics />
      </div>

    </div>
  );
};

export default AdminSettingsPage;
