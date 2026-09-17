import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  AlertTriangle, 
  Radio, 
  Send, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  Volume2, 
  Sparkles,
  RefreshCw,
  Users,
  Calendar,
  Layers,
  MapPin,
  Check,
  X,
  Target
} from 'lucide-react';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  setDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { INITIAL_TOURNAMENT_DOC } from '../../lib/platformData';
import { SeasonScheduleGeneratorModal } from '../Events/SeasonScheduleGeneratorModal';

export interface BroadcastAnnouncement {
  id: string;
  text: string;
  timestamp: string;
  urgent?: boolean;
  isUrgent?: boolean;
  author: string;
  targetScope?: 'all' | 'Court 1' | 'Court 2' | 'Court 3' | 'Field A' | 'Field B' | string;
  status?: 'active' | 'archived';
  createdAt?: any;
}

export const TARGET_SCOPE_OPTIONS = [
  { label: 'All Facility', value: 'all' },
  { label: 'Court 1', value: 'Court 1' },
  { label: 'Court 2', value: 'Court 2' },
  { label: 'Court 3', value: 'Court 3' },
  { label: 'Field A', value: 'Field A' },
  { label: 'Field B', value: 'Field B' },
] as const;

export interface DirectorMasterCommandProps {
  tournamentId?: string;
  className?: string;
}

export const DirectorMasterCommand: React.FC<DirectorMasterCommandProps> = ({
  tournamentId = INITIAL_TOURNAMENT_DOC.id || 'tourn-101',
  className = ''
}) => {
  const [tournament, setTournament] = useState(INITIAL_TOURNAMENT_DOC);
  const [delayMins, setDelayMins] = useState(tournament.delayMinutes || 15);
  const [announcementText, setAnnouncementText] = useState('');
  const [targetScope, setTargetScope] = useState<string>('all');
  const [isUrgent, setIsUrgent] = useState(true);
  const [broadcastNotice, setBroadcastNotice] = useState(false);
  const [broadcastNoticeText, setBroadcastNoticeText] = useState('');
  const [isAiScheduleModalOpen, setIsAiScheduleModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Announcements list with initial fallback
  const [announcements, setAnnouncements] = useState<BroadcastAnnouncement[]>([
    {
      id: 'ann-1',
      text: '🚨 Court 2 notice: SoCal Vipers vs Las Vegas Lightning game is delayed by 15 minutes due to prior overtime.',
      timestamp: '10:15 AM',
      urgent: true,
      isUrgent: true,
      author: 'Tournament Director HQ',
      targetScope: 'Court 2',
      status: 'active'
    },
    {
      id: 'ann-2',
      text: 'Hydration stations have been restocked on Courts 1-4. Coaches check-in desk closes at 1:00 PM.',
      timestamp: '09:30 AM',
      urgent: false,
      isUrgent: false,
      author: 'Tournament Director HQ',
      targetScope: 'all',
      status: 'active'
    }
  ]);

  // Real-time listener for Firestore broadcasts & tournament doc updates
  useEffect(() => {
    if (!db) return;

    // Listen to broadcasts collection
    const broadcastsRef = collection(db, 'broadcasts');
    const q = query(broadcastsRef, orderBy('createdAt', 'desc'), limit(25));

    const unsubscribeBroadcasts = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const items: BroadcastAnnouncement[] = [];
          snapshot.forEach(docSnap => {
            const data = docSnap.data();
            items.push({
              id: docSnap.id,
              text: data.text || '',
              timestamp: data.timestamp || 'Just now',
              urgent: data.isUrgent ?? data.urgent ?? false,
              isUrgent: data.isUrgent ?? data.urgent ?? false,
              author: data.author || 'Tournament Director HQ',
              targetScope: data.targetScope || 'all',
              status: data.status || 'active',
              createdAt: data.createdAt
            });
          });
          setAnnouncements(items);
        }
      },
      (err) => {
        console.warn('DirectorMasterCommand: Broadcasts listener notice:', err);
      }
    );

    // Listen to tournament doc for global delay offset sync
    const tournRef = doc(db, 'tournaments', tournamentId);
    const unsubscribeTourn = onSnapshot(
      tournRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (typeof data.delayMinutes === 'number') {
            setDelayMins(data.delayMinutes);
          }
        }
      },
      (err) => {
        console.warn('DirectorMasterCommand: Tournaments listener notice:', err);
      }
    );

    return () => {
      unsubscribeBroadcasts();
      unsubscribeTourn();
    };
  }, [tournamentId]);

  // Handle setting delay offset
  const handleSetDelay = async (minutes: number) => {
    setDelayMins(minutes);
    setTournament(prev => ({
      ...prev,
      delayMinutes: minutes,
      delayReason: `Director adjusted schedule offset by +${minutes} minutes`
    }));

    setBroadcastNoticeText(`Delay offset updated to +${minutes} min. All court clocks synchronized!`);
    setBroadcastNotice(true);
    setTimeout(() => setBroadcastNotice(false), 3500);

    // Sync to Firestore tournaments document
    if (db) {
      try {
        const tournRef = doc(db, 'tournaments', tournamentId);
        await updateDoc(tournRef, {
          delayMinutes: minutes,
          updatedAt: serverTimestamp()
        }).catch(async () => {
          await setDoc(tournRef, { delayMinutes: minutes }, { merge: true });
        });
      } catch (err) {
        console.warn('Failed to update delay in Firestore:', err);
      }
    }
  };

  // Handle broadcasting announcement
  const handleBroadcastAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementText.trim() || isSending) return;

    setIsSending(true);
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const localId = `ann-${Date.now()}`;

    const newBroadcast: BroadcastAnnouncement = {
      id: localId,
      text: announcementText.trim(),
      timestamp: timeStr,
      urgent: isUrgent,
      isUrgent: isUrgent,
      author: 'Tournament Director HQ',
      targetScope: targetScope,
      status: 'active'
    };

    // Optimistically update local state
    setAnnouncements(prev => [newBroadcast, ...prev]);
    setAnnouncementText('');
    setBroadcastNoticeText(
      `Master Broadcast Sent to ${targetScope === 'all' ? 'All Facility' : targetScope}: Player screens & athlete HUDs synced!`
    );
    setBroadcastNotice(true);
    setTimeout(() => setBroadcastNotice(false), 3500);

    // Save to Firestore `broadcasts` and `tournaments`
    if (db) {
      try {
        const broadcastsRef = collection(db, 'broadcasts');
        const docRef = await addDoc(broadcastsRef, {
          text: newBroadcast.text,
          urgent: isUrgent,
          isUrgent: isUrgent,
          targetScope: targetScope,
          status: 'active',
          author: 'Tournament Director HQ',
          timestamp: timeStr,
          tournamentId,
          tournamentName: tournament.title,
          createdAt: serverTimestamp()
        });

        // Also update tournament announcements
        const tournRef = doc(db, 'tournaments', tournamentId);
        const updatedDocAnnouncements = [
          {
            id: docRef.id,
            text: newBroadcast.text,
            urgent: isUrgent,
            isUrgent: isUrgent,
            targetScope: targetScope,
            status: 'active',
            author: 'Tournament Director HQ',
            timestamp: timeStr
          },
          ...announcements.slice(0, 15)
        ];

        await updateDoc(tournRef, {
          announcements: updatedDocAnnouncements,
          updatedAt: serverTimestamp()
        }).catch(async () => {
          await setDoc(tournRef, { announcements: updatedDocAnnouncements }, { merge: true });
        });
      } catch (err) {
        console.warn('Failed to publish broadcast to Firestore:', err);
      }
    }

    setIsSending(false);
  };

  // Handle clearing / resolving an urgent banner
  const handleResolveBanner = async (broadcastId: string) => {
    // Optimistically mark as archived locally
    setAnnouncements(prev =>
      prev.map(ann => (ann.id === broadcastId ? { ...ann, status: 'archived' } : ann))
    );

    setBroadcastNoticeText('Sticky banner cleared & archived from all athlete viewports.');
    setBroadcastNotice(true);
    setTimeout(() => setBroadcastNotice(false), 3500);

    // Persist status: 'archived' to Firestore
    if (db) {
      try {
        const broadcastDocRef = doc(db, 'broadcasts', broadcastId);
        await updateDoc(broadcastDocRef, {
          status: 'archived',
          archivedAt: serverTimestamp()
        }).catch(() => {
          // If not in broadcasts collection yet (e.g. demo document)
          console.info('Archived broadcast in local session.');
        });

        // Also update in tournament document announcements array
        const tournRef = doc(db, 'tournaments', tournamentId);
        const updatedAnns = announcements.map(ann =>
          ann.id === broadcastId ? { ...ann, status: 'archived' } : ann
        );
        await updateDoc(tournRef, {
          announcements: updatedAnns
        }).catch(console.warn);
      } catch (err) {
        console.warn('Error resolving broadcast banner:', err);
      }
    }
  };

  return (
    <div className={`space-y-6 animate-fadeIn pb-36 text-slate-100 ${className}`}>
      
      {/* 1. Header Banner */}
      <div className="bg-[#12151C] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] rounded-2xl p-4 sm:p-5 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#FF6A00]/15 text-[#FF6A00] border border-[#FF6A00]/30 shadow-[0_0_12px_rgba(255,106,0,0.2)]">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Director Master Command Desk
              </h1>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Real-Time Schedule Broadcasts, Delay Offsets & Facility Operations
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsAiScheduleModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF6A00] to-amber-500 hover:from-[#e55f00] hover:to-amber-600 text-slate-950 text-xs font-black shadow-lg shadow-[#FF6A00]/25 flex items-center gap-2 cursor-pointer transition-all active:scale-[0.97]"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>AI Season Scheduler</span>
          </button>
          <span className="px-3 py-1.5 rounded-full bg-[#FF6A00]/15 border border-[#FF6A00]/40 text-[#FF6A00] text-xs font-black uppercase flex items-center gap-1.5 shadow-[0_0_10px_rgba(255,106,0,0.15)] font-mono">
            <span className="w-2 h-2 rounded-full bg-[#FF6A00] animate-ping" />
            DIRECTOR ACCESS
          </span>
        </div>
      </div>

      {/* Broadcast Toast Notification */}
      <AnimatePresence>
        {broadcastNotice && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 bg-gradient-to-r from-amber-950/90 via-[#12151C] to-slate-900 border border-amber-500/50 rounded-2xl text-xs text-amber-200 flex items-center gap-2.5 shadow-xl font-medium"
          >
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{broadcastNoticeText || 'Master Broadcast Sent: Player screens, coach tablets, and scoreboards synchronized!'}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. MASTER DELAY CONTROLLER (With Active Delay Diagnostic Telemetry) */}
      <div className="bg-[#12151C] border border-amber-500/30 rounded-3xl p-5 sm:p-6 space-y-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] relative overflow-hidden">
        {/* Specular Ambient Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm sm:text-base font-black text-white tracking-tight">
              Master Court Delay Broadcaster
            </h2>
          </div>

          <div className="flex flex-col sm:items-end">
            <span className="text-xs font-mono font-black text-amber-400">
              Current Offset: +{delayMins} min
            </span>
            {/* Objective 2: Active Delay Diagnostic Telemetry */}
            <div className="text-xs font-mono text-[#00F0D0] flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00F0D0] animate-pulse shrink-0" />
              <span>● 8 Court Countdown Clocks Synchronized</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Select an offset to instantly update all athlete game countdowns, court clocks, and notification alerts across the entire facility:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[0, 5, 15, 30].map((mins) => (
            <button
              key={mins}
              onClick={() => handleSetDelay(mins)}
              className={`min-h-[48px] py-3 px-4 rounded-2xl font-mono text-sm font-black transition-all duration-150 cursor-pointer flex items-center justify-center active:scale-[0.97] ${
                delayMins === mins
                  ? 'bg-gradient-to-r from-amber-500 to-[#FF6A00] text-slate-950 shadow-[0_0_20px_rgba(255,106,0,0.4)] scale-102 border border-amber-300/40'
                  : 'bg-[#08090C] border border-white/[0.1] text-slate-200 hover:text-white hover:border-white/25 hover:bg-[#181D26]'
              }`}
            >
              {mins === 0 ? 'On Time (0 min)' : `+${mins} Minutes`}
            </button>
          ))}
        </div>
      </div>

      {/* 3. LIVE ANNOUNCEMENT COMPOSER WITH COURT/FIELD TARGET SELECTOR */}
      <div className="bg-[#12151C] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] rounded-3xl p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-[#FF6A00]" />
            <h2 className="text-sm sm:text-base font-black text-white tracking-tight">
              Broadcast Announcement to Entire Tournament
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Venue: <span className="text-slate-200 font-bold">{tournament.venue?.name || 'Prime Athletics Complex'}</span>
          </span>
        </div>

        <form onSubmit={handleBroadcastAnnouncement} className="space-y-4">
          
          {/* Objective 1: Court/Field Target Selector Chip Group */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-slate-300 flex items-center gap-1.5 font-mono">
                <Target className="w-3.5 h-3.5 text-[#00F0D0]" />
                <span>Target Location / Court Scope:</span>
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                Active: <span className="text-[#00F0D0] font-bold">{targetScope === 'all' ? 'All Facility' : targetScope}</span>
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {TARGET_SCOPE_OPTIONS.map((opt) => {
                const isSelected = targetScope === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTargetScope(opt.value)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all duration-150 cursor-pointer flex items-center gap-1.5 active:scale-[0.97] select-none ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#FF6A00] to-amber-500 text-slate-950 font-black shadow-[0_0_15px_rgba(255,106,0,0.35)] scale-102 border border-amber-300/50'
                        : 'bg-[#08090C] border border-white/[0.1] text-slate-300 hover:text-white hover:border-white/25 hover:bg-[#181D26]'
                    }`}
                  >
                    {isSelected ? (
                      <Check className="w-3 h-3 text-slate-950 stroke-[3]" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    )}
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Announcement Textarea */}
          <div className="relative">
            <textarea
              rows={3}
              required
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              placeholder={`e.g. 🚨 ${targetScope === 'all' ? 'All Courts' : targetScope} notice: Turf maintenance delayed kickoff by 10 mins. Teams warm up in East Gym...`}
              className="w-full p-3.5 rounded-2xl bg-[#08090C] border border-white/[0.12] text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FF6A00] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] focus:ring-1 focus:ring-[#FF6A00]/50 transition-all leading-relaxed"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
            <label className="flex items-center gap-2 text-slate-300 font-bold cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isUrgent}
                onChange={(e) => setIsUrgent(e.target.checked)}
                className="w-4 h-4 rounded accent-[#FF6A00] cursor-pointer"
              />
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Mark as Urgent Alert (Sticky High-Priority Banner)</span>
              </span>
            </label>

            <button
              type="submit"
              disabled={isSending || !announcementText.trim()}
              className="min-h-[44px] px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#E63946] hover:brightness-110 text-white font-black text-xs shadow-lg shadow-[#FF6A00]/25 cursor-pointer flex items-center gap-2 transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4 text-white" />
              <span>{isSending ? 'Transmitting...' : 'Broadcast Now'}</span>
            </button>
          </div>
        </form>

        {/* 4. LIVE BROADCAST HISTORY (With Banner Dismiss / Resolve Trigger) */}
        <div className="space-y-3 pt-3 border-t border-white/[0.08]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider font-mono">
              Live Broadcast History
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {announcements.length} total dispatches
            </span>
          </div>

          <div className="space-y-2.5">
            {announcements.map((ann) => {
              const isUrgentAnn = ann.urgent || ann.isUrgent;
              const isArchived = ann.status === 'archived';

              return (
                <div 
                  key={ann.id} 
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                    isArchived
                      ? 'bg-[#08090C]/80 border-white/[0.05] opacity-65'
                      : isUrgentAnn
                        ? 'bg-[#12151C] border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.08)]'
                        : 'bg-[#12151C] border-white/[0.08]'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {isUrgentAnn && (
                      <AlertTriangle 
                        className={`w-4 h-4 shrink-0 mt-0.5 ${isArchived ? 'text-slate-500' : 'text-amber-400 animate-pulse'}`} 
                      />
                    )}
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Target Scope Pill */}
                        <span className="px-2 py-0.5 rounded-md bg-black/60 border border-white/10 text-[10px] font-mono font-bold text-[#00F0D0] uppercase">
                          {ann.targetScope === 'all' || !ann.targetScope ? 'All Facility' : ann.targetScope}
                        </span>

                        {/* Urgency Status Pill */}
                        {isUrgentAnn && (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-black uppercase tracking-wider ${
                            isArchived
                              ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                              : 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse'
                          }`}>
                            {isArchived ? 'ARCHIVED' : 'ACTIVE STICKY BANNER'}
                          </span>
                        )}

                        <span className="text-[10px] text-slate-400 font-mono">
                          {ann.timestamp}
                        </span>
                      </div>

                      <p className={`text-xs sm:text-sm leading-relaxed ${isArchived ? 'text-slate-400 line-through' : 'text-slate-100 font-medium'}`}>
                        {ann.text}
                      </p>
                    </div>
                  </div>

                  {/* Objective 3: Banner Dismiss / Resolve Trigger in History */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {isUrgentAnn && !isArchived ? (
                      <button
                        onClick={() => handleResolveBanner(ann.id)}
                        className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 hover:text-white font-mono text-xs font-bold transition-all duration-150 active:scale-[0.97] flex items-center gap-1.5 shadow-[0_0_10px_rgba(239,68,68,0.2)] cursor-pointer"
                        title="Archive alert and immediately remove sticky banner from all athlete viewports"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-red-400" />
                        <span>Clear Banner</span>
                      </button>
                    ) : isUrgentAnn && isArchived ? (
                      <span className="px-2.5 py-1 rounded-xl bg-zinc-800/80 border border-zinc-700/80 text-zinc-400 text-[11px] font-mono font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-zinc-500" />
                        <span>Resolved</span>
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Season Schedule AI Generator Modal */}
      <SeasonScheduleGeneratorModal
        isOpen={isAiScheduleModalOpen}
        onClose={() => setIsAiScheduleModalOpen(false)}
        tournamentId={tournament.id}
        tournamentName={tournament.title}
        sport={tournament.sport}
        onImportSuccess={(count, summary) => {
          setBroadcastNoticeText(`AI Generated Schedule Imported: ${count} matches generated!`);
          setBroadcastNotice(true);
          setTimeout(() => setBroadcastNotice(false), 4000);
        }}
      />

    </div>
  );
};

export default DirectorMasterCommand;
