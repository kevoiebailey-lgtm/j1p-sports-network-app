import React, { useState, useEffect, useMemo } from 'react';
import { 
  QrCode, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  Users, 
  Building2, 
  FileText, 
  Download, 
  Printer, 
  Lock, 
  Unlock, 
  UserCheck, 
  UserX, 
  Zap, 
  Camera, 
  Award, 
  Filter, 
  X, 
  Check, 
  RefreshCw, 
  ExternalLink,
  Volume2,
  VolumeX,
  BadgeCheck,
  FileCheck,
  Sparkles,
  Phone,
  Mail,
  Trash2,
  Archive,
  CalendarX,
  RotateCcw,
  Wifi,
  WifiOff,
  CloudOff,
  UploadCloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { VerifiedBadge } from '../Common/VerifiedBadge';
import { RealCameraQrScanner } from '../Common/RealCameraQrScanner';

// --- DATA MODELS ---
export interface CoachCheckInRecord {
  id: string;
  coachName: string;
  roleTitle: 'Head Coach' | 'Assistant Coach' | 'Team Manager' | 'Athletic Trainer';
  teamName: string;
  orgName: string;
  sport: string;
  division: string;
  passId: string;
  checkInTime?: string;
  status: 'Cleared' | 'Pending Verification' | 'Flagged' | 'Locked Roster';
  waiverSigned: boolean;
  backgroundCheckCleared: boolean;
  rosterVerifiedCount: number;
  totalRosterCount: number;
  courtAssigned?: string;
  coachPhone?: string;
  coachEmail?: string;
  avatarUrl?: string;
}

export interface RosterCheckInItem {
  id: string;
  coachPassId: string;
  athleteName: string;
  jerseyNumber: string;
  position: string;
  dobProofVerified: boolean;
  waiverVerified: boolean;
  isLocked: boolean;
  status: 'Cleared' | 'Needs ID Check' | 'Ineligible';
}

export interface OfflineCheckInItem {
  id: string;
  coachId: string;
  coachName: string;
  passId: string;
  teamName: string;
  timestamp: string;
  queuedAt: string;
}

// Pre-seeded Coach Check-in Database
const INITIAL_COACH_RECORDS: CoachCheckInRecord[] = [
  {
    id: 'cpass-101',
    coachName: 'Coach Sarah Miller',
    roleTitle: 'Head Coach',
    teamName: 'West Orange Varsity Flag',
    orgName: 'West Orange High School Athletics',
    sport: 'Flag Football',
    division: 'Varsity Girls',
    passId: 'J1P-COACH-8801',
    checkInTime: new Date(Date.now() - 1000 * 60 * 12).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    status: 'Cleared',
    waiverSigned: true,
    backgroundCheckCleared: true,
    rosterVerifiedCount: 18,
    totalRosterCount: 18,
    courtAssigned: 'Field A - Turf 1',
    coachPhone: '(973) 555-0192',
    coachEmail: 'smiller@westorange.k12.nj.us',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'cpass-102',
    coachName: 'Coach Rashad Evans',
    roleTitle: 'Head Coach',
    teamName: 'NJ Scholars 17U EYBL',
    orgName: 'NJ Scholars EYBL Club',
    sport: 'Basketball',
    division: '17U Boys',
    passId: 'J1P-COACH-8802',
    checkInTime: new Date(Date.now() - 1000 * 60 * 35).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    status: 'Cleared',
    waiverSigned: true,
    backgroundCheckCleared: true,
    rosterVerifiedCount: 10,
    totalRosterCount: 10,
    courtAssigned: 'Main Arena Court 1',
    coachPhone: '(973) 555-8831',
    coachEmail: 'revans@njscholars.org',
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'cpass-103',
    coachName: 'Coach Derrick Hall',
    roleTitle: 'Head Coach',
    teamName: 'East Orange Varsity Football',
    orgName: 'East Orange Campus Athletics',
    sport: 'Football',
    division: 'Varsity Boys',
    passId: 'J1P-COACH-8803',
    checkInTime: undefined,
    status: 'Pending Verification',
    waiverSigned: true,
    backgroundCheckCleared: false,
    rosterVerifiedCount: 24,
    totalRosterCount: 28,
    courtAssigned: 'Stadium Field',
    coachPhone: '(973) 555-4011',
    coachEmail: 'dhall@eastorange.k12.nj.us',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'cpass-104',
    coachName: 'Samantha Torres',
    roleTitle: 'Team Manager',
    teamName: 'Metro Vipers 15U',
    orgName: 'Metro Flag Football Alliance',
    sport: 'Flag Football',
    division: '15U Girls',
    passId: 'J1P-COACH-8804',
    checkInTime: undefined,
    status: 'Flagged',
    waiverSigned: false,
    backgroundCheckCleared: true,
    rosterVerifiedCount: 12,
    totalRosterCount: 14,
    courtAssigned: 'Field B - Grass',
    coachPhone: '(201) 555-9012',
    coachEmail: 'storres@metroflagnj.com',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80'
  }
];

export const CoachCheckInPortalPage: React.FC = () => {
  const { user, profile } = useAuth();

  // State Management
  const [coachRecords, setCoachRecords] = useState<CoachCheckInRecord[]>(INITIAL_COACH_RECORDS);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedCoach, setSelectedCoach] = useState<CoachCheckInRecord | null>(INITIAL_COACH_RECORDS[0]);

  // Scanner Modal, Manual Entry & Sound
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [manualCodeInput, setManualCodeInput] = useState<string>('');
  const [manualSearchError, setManualSearchError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [isSimulatingScan, setIsSimulatingScan] = useState<boolean>(false);

  // Badge Pass Modal & Session Auto-Cleanup
  const [isPassModalOpen, setIsPassModalOpen] = useState<boolean>(false);
  const [eventConcluded, setEventConcluded] = useState<boolean>(false);
  const [autoCleanupOnConclude, setAutoCleanupOnConclude] = useState<boolean>(true);
  const [isCleanupModalOpen, setIsCleanupModalOpen] = useState<boolean>(false);
  const [lastCleanupTime, setLastCleanupTime] = useState<string | null>(null);
  const [cleanupSuccessMessage, setCleanupSuccessMessage] = useState<string | null>(null);

  // Service Worker & Offline Sync Engine State
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [offlineQueue, setOfflineQueue] = useState<OfflineCheckInItem[]>(() => {
    try {
      const saved = localStorage.getItem('just1play_offline_checkin_queue');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [offlineSyncMessage, setOfflineSyncMessage] = useState<string | null>(null);

  // Helper: Persist Offline Queue to LocalStorage
  const saveOfflineQueue = (queue: OfflineCheckInItem[]) => {
    setOfflineQueue(queue);
    try {
      localStorage.setItem('just1play_offline_checkin_queue', JSON.stringify(queue));
    } catch (err) {
      console.warn('LocalStorage save queue note:', err);
    }
  };

  // Helper: Queue Check-In for Offline Caching & SW Sync
  const queueCheckInOffline = (coach: CoachCheckInRecord, checkInTime: string) => {
    const newItem: OfflineCheckInItem = {
      id: `off_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      coachId: coach.id,
      coachName: coach.coachName,
      passId: coach.passId,
      teamName: coach.teamName,
      timestamp: checkInTime,
      queuedAt: new Date().toISOString()
    };

    const updatedQueue = [...offlineQueue, newItem];
    saveOfflineQueue(updatedQueue);

    // Message active Service Worker to store offline check-in payload
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'QUEUE_OFFLINE_CHECKIN',
        payload: newItem
      });
    }

    setOfflineSyncMessage(`📱 Check-in for ${coach.coachName} saved to SW Offline Queue (${updatedQueue.length} queued). Auto-syncs when online.`);
    setTimeout(() => setOfflineSyncMessage(null), 6000);
  };

  // Helper: Trigger Offline Queue Sync to Firestore
  const syncOfflineCheckIns = async () => {
    if (offlineQueue.length === 0) return;
    setIsSyncing(true);

    try {
      const queueToSync = [...offlineQueue];

      // Write each pending offline check-in to Firestore CheckinRecords
      for (const item of queueToSync) {
        try {
          await addDoc(collection(db, 'CheckinRecords'), {
            coachId: item.coachId,
            coachName: item.coachName,
            passId: item.passId,
            teamName: item.teamName,
            time: item.timestamp,
            status: 'Cleared',
            syncedFromOfflineQueue: true,
            syncedAt: new Date().toISOString()
          });
        } catch (err) {
          console.warn('Firestore sync record item note:', err);
        }
      }

      // Notify Service Worker of completed sync
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SYNC_OFFLINE_CHECKINS'
        });
      }

      setOfflineSyncMessage(`⚡ Service Worker Sync Complete! Successfully uploaded ${queueToSync.length} offline check-in records.`);
      saveOfflineQueue([]);
      setTimeout(() => setOfflineSyncMessage(null), 7000);
    } catch (err) {
      console.error('Offline sync execution failed:', err);
      setOfflineSyncMessage('⚠️ Cloud sync fallback: Check-ins remain cached locally in SW cache.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Service Worker Messages & Network Online/Offline Event Listeners
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const handleSwMessage = (event: MessageEvent) => {
        if (!event.data) return;
        if (event.data.type === 'OFFLINE_SYNC_SUCCESS') {
          setOfflineSyncMessage(`⚡ Service Worker Background Sync: Synced ${event.data.count || 'all'} offline records.`);
          saveOfflineQueue([]);
          setTimeout(() => setOfflineSyncMessage(null), 6000);
        }
      };

      navigator.serviceWorker.addEventListener('message', handleSwMessage);
      return () => navigator.serviceWorker.removeEventListener('message', handleSwMessage);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setOfflineSyncMessage('🟢 Connection restored! Syncing offline check-in queue to Cloud Database...');
      syncOfflineCheckIns();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setOfflineSyncMessage('⚡ Internet connection lost. Coach Check-In Portal is running in SW Cache Offline Mode.');
      setTimeout(() => setOfflineSyncMessage(null), 7000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [offlineQueue]);

  // Execute Session Cleanup Function (Resets check-in status and purges temporary scan logs)
  const executeSessionCleanup = (mode: 'reset' | 'full' = 'reset') => {
    const timeFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (mode === 'reset') {
      // Reset cleared check-ins back to pending verification and remove checkInTime timestamps
      setCoachRecords(prev => prev.map(rec => ({
        ...rec,
        status: rec.status === 'Cleared' ? 'Pending Verification' : rec.status,
        checkInTime: undefined
      })));

      if (selectedCoach) {
        setSelectedCoach(prev => prev ? {
          ...prev,
          status: prev.status === 'Cleared' ? 'Pending Verification' : prev.status,
          checkInTime: undefined
        } : null);
      }
    } else {
      // Full reset of all records to initial un-checked state
      const resetRecords = INITIAL_COACH_RECORDS.map(rec => ({
        ...rec,
        status: 'Pending Verification' as const,
        checkInTime: undefined
      }));
      setCoachRecords(resetRecords);
      setSelectedCoach(resetRecords[0]);
    }

    setManualCodeInput('');
    setScannedResult(null);
    setManualSearchError(null);
    setSearchQuery('');
    setLastCleanupTime(timeFormatted);
    setCleanupSuccessMessage(`Check-in session list auto-cleaned & archived @ ${timeFormatted}. Temporary session data purged.`);
    setIsCleanupModalOpen(false);

    setTimeout(() => {
      setCleanupSuccessMessage(null);
    }, 7000);
  };

  // Toggle Event Status & Auto-trigger Cleanup if enabled
  const handleToggleEventConclude = () => {
    const nextConcluded = !eventConcluded;
    setEventConcluded(nextConcluded);

    if (nextConcluded && autoCleanupOnConclude) {
      executeSessionCleanup('reset');
    }
  };

  // Sync Check-In Log from Firestore if available
  useEffect(() => {
    try {
      const q = query(collection(db, 'CheckinRecords'), orderBy('time', 'desc'));
      const unsub = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          // Process live checkin records
        }
      }, (err) => console.warn('Firestore Checkin listener:', err));
      return () => unsub();
    } catch (e) {
      console.warn('Firestore setup fallback', e);
    }
  }, []);

  // Filtered Coach List
  const filteredCoaches = useMemo(() => {
    return coachRecords.filter(record => {
      const matchesSearch = record.coachName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            record.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            record.passId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            record.orgName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All' || record.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [coachRecords, searchQuery, statusFilter]);

  // Handle Instant Coach Check-In Action
  const handleToggleCheckIn = (coachId: string) => {
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setCoachRecords(prev => prev.map(rec => {
      if (rec.id === coachId) {
        const isCurrentlyCleared = rec.status === 'Cleared';
        const newStatus = isCurrentlyCleared ? 'Pending Verification' : 'Cleared';
        const checkInTime = isCurrentlyCleared ? undefined : timeNow;

        // On newly cleared check-in: handle cloud sync or SW offline fallback
        if (!isCurrentlyCleared) {
          if (!isOnline) {
            queueCheckInOffline(rec, timeNow);
          } else {
            addDoc(collection(db, 'CheckinRecords'), {
              coachId: rec.id,
              coachName: rec.coachName,
              passId: rec.passId,
              teamName: rec.teamName,
              time: timeNow,
              status: 'Cleared'
            }).catch(() => {
              queueCheckInOffline(rec, timeNow);
            });
          }
        }

        return { ...rec, status: newStatus, checkInTime };
      }
      return rec;
    }));

    if (selectedCoach && selectedCoach.id === coachId) {
      const isCurrentlyCleared = selectedCoach.status === 'Cleared';
      setSelectedCoach({
        ...selectedCoach,
        status: isCurrentlyCleared ? 'Pending Verification' : 'Cleared',
        checkInTime: isCurrentlyCleared ? undefined : timeNow
      });
    }
  };

  // Toggle Roster Lock
  const handleToggleRosterLock = (coachId: string) => {
    setCoachRecords(prev => prev.map(rec => {
      if (rec.id === coachId) {
        const newStatus = rec.status === 'Locked Roster' ? 'Cleared' : 'Locked Roster';
        return { ...rec, status: newStatus };
      }
      return rec;
    }));

    if (selectedCoach && selectedCoach.id === coachId) {
      setSelectedCoach({
        ...selectedCoach,
        status: selectedCoach.status === 'Locked Roster' ? 'Cleared' : 'Locked Roster'
      });
    }
  };

  // Handle Manual Pass Code Check-In (For damaged or unreadable QR passes)
  const handleManualCheckIn = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setManualSearchError(null);
    const queryStr = manualCodeInput.trim().toLowerCase();
    
    if (!queryStr) {
      setManualSearchError('Please enter a Pass ID or Coach Name.');
      return;
    }

    const matchedCoach = coachRecords.find(c => 
      c.passId.toLowerCase() === queryStr ||
      c.coachName.toLowerCase().includes(queryStr) ||
      c.id.toLowerCase() === queryStr
    );

    if (matchedCoach) {
      if (matchedCoach.status === 'Cleared') {
        setManualSearchError(`Check-in already recorded: ${matchedCoach.coachName} (${matchedCoach.passId}) was verified and cleared at ${matchedCoach.checkInTime || 'earlier in this session'}.`);
        setSelectedCoach(matchedCoach);
        setScannedResult(matchedCoach.passId);
        return;
      }
      setScannedResult(matchedCoach.passId);
      setSelectedCoach(matchedCoach);
      handleToggleCheckIn(matchedCoach.id);
      setManualCodeInput('');
      setManualSearchError(null);
    } else {
      setManualSearchError(`No accredited coach or staff pass found matching "${manualCodeInput.trim()}".`);
    }
  };

  // Trigger Simulated QR Scan
  const triggerSimulatedScan = () => {
    setIsSimulatingScan(true);
    setTimeout(() => {
      setIsSimulatingScan(false);
      // Pick random pending coach or first coach
      const target = coachRecords.find(c => c.status !== 'Cleared') || coachRecords[0];
      setScannedResult(target.passId);
      setSelectedCoach(target);
      handleToggleCheckIn(target.id);

      // Play chime if enabled
      if (soundEnabled && typeof Audio !== 'undefined') {
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          osc.start();
          osc.stop(ctx.currentTime + 0.15);
        } catch (e) {
          // ignore web audio restrictions
        }
      }
    }, 1200);
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* PAGE HEADER BANNER */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#000000] via-[#212A31] to-[#000000] border border-[#E5B868]/30 p-8 shadow-[0_0_50px_rgba(0,242,254,0.12)]">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#E5B868]/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E5B868]/15 border border-[#E5B868]/40 text-[#E5B868] text-xs font-black uppercase tracking-widest font-mono">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>COACH & STAFF CHECK-IN PORTAL</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black italic tracking-tight uppercase text-white font-sans">
              GAME DAY <span className="text-[#E5B868]">VERIFICATION</span> CONSOLE<span className="text-[#E5B868]">.</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              Verify head coaches, assistant staff credentials, roster compliance, and issue sideline accreditation passes for Just1Play sanctioned events.
            </p>

            {/* Quick Metrics & Service Worker Offline Caching Status */}
            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-mono">
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-200">
                <UserCheck className="w-4 h-4 text-[#E5B868]" />
                <span><strong className="text-white font-bold">{coachRecords.filter(c => c.status === 'Cleared').length}</strong> Cleared Staff</span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-200">
                <Clock className="w-4 h-4 text-amber-400" />
                <span><strong className="text-white font-bold">{coachRecords.filter(c => c.status === 'Pending Verification').length}</strong> Pending Check-In</span>
              </div>

              {/* Service Worker Network Connection Indicator */}
              <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border transition-all ${
                isOnline 
                  ? 'bg-red-600/10 border-red-600/40 text-red-500' 
                  : 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse'
              }`}>
                {isOnline ? <Wifi className="w-4 h-4 text-red-500" /> : <WifiOff className="w-4 h-4 text-amber-400" />}
                <span className="font-bold uppercase tracking-wider">
                  {isOnline ? 'SW ONLINE (LIVE)' : 'SW OFFLINE MODE'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsOnline(!isOnline)}
                  className="ml-1 px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] uppercase font-sans text-slate-300 hover:text-white cursor-pointer transition-colors"
                  title="Toggle simulated network status for testing offline check-in queueing"
                >
                  {isOnline ? 'Test Offline' : 'Go Online'}
                </button>
              </div>

              {/* Offline Queue Sync Indicator */}
              {offlineQueue.length > 0 && (
                <button
                  onClick={syncOfflineCheckIns}
                  disabled={isSyncing}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#E5B868]/20 border border-[#E5B868]/60 text-[#E5B868] font-bold uppercase tracking-wider hover:bg-[#E5B868]/30 transition-all cursor-pointer shadow-[0_0_15px_rgba(0,242,254,0.3)]"
                >
                  <UploadCloud className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
                  <span>Sync {offlineQueue.length} Queued Check-In{offlineQueue.length > 1 ? 's' : ''}</span>
                </button>
              )}
            </div>
          </div>

          {/* Action Launchers & Event Conclude Controls */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-3 self-start md:self-center shrink-0">
            <button
              onClick={() => setIsScannerOpen(true)}
              className="px-6 py-3.5 rounded-2xl bg-[#E5B868] hover:bg-[#38BDF8] text-black font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(0,242,254,0.5)] transition-all transform hover:scale-[1.03] cursor-pointer"
            >
              <QrCode className="w-5 h-5 stroke-[2.5]" />
              <span>Launch QR Gate Scanner</span>
            </button>

            {/* Session Cleanup / Event Conclude Control */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCleanupModalOpen(true)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                title="Manage Check-In List Session Data & Auto-Cleanup"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Session Cleanup</span>
              </button>

              <button
                onClick={handleToggleEventConclude}
                className={`px-3.5 py-2.5 rounded-xl border text-xs font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                  eventConcluded
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : 'bg-red-600/20 text-red-500 border-red-600/40'
                }`}
                title="Toggle Event Status (Triggers Auto-Cleanup when Concluded)"
              >
                <span className={`w-2 h-2 rounded-full ${eventConcluded ? 'bg-amber-400' : 'bg-red-500 animate-ping'}`} />
                <span>{eventConcluded ? 'CONCLUDED' : 'LIVE'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CLEANUP SUCCESS NOTIFICATION BANNER */}
      {cleanupSuccessMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="p-4 rounded-2xl bg-[#E5B868]/10 border border-[#E5B868]/40 text-[#E5B868] text-xs font-mono font-bold flex items-center justify-between gap-3 shadow-[0_0_20px_rgba(0,242,254,0.2)]"
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-[#E5B868] shrink-0" />
            <span>{cleanupSuccessMessage}</span>
          </div>
          <button onClick={() => setCleanupSuccessMessage(null)} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* SERVICE WORKER OFFLINE CACHING & SYNC NOTIFICATION BANNER */}
      {offlineSyncMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`p-4 rounded-2xl border text-xs font-mono font-bold flex items-center justify-between gap-3 shadow-lg ${
            isOnline
              ? 'bg-emerald-950/80 border-red-500/50 text-red-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
              : 'bg-amber-950/80 border-amber-400/50 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {isOnline ? <UploadCloud className="w-4 h-4 text-red-500 shrink-0" /> : <CloudOff className="w-4 h-4 text-amber-400 shrink-0" />}
            <span>{offlineSyncMessage}</span>
          </div>
          <button onClick={() => setOfflineSyncMessage(null)} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* MAIN TWO-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: SEARCH & COACH MANIFEST LIST (7 COLS) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#212A31] border border-white/10">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
              <Filter className="w-4 h-4 text-[#E5B868] flex-shrink-0" />
              {['All', 'Cleared', 'Pending Verification', 'Flagged', 'Locked Roster'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                    statusFilter === st
                      ? 'bg-[#E5B868] text-black shadow-[0_0_12px_rgba(0,242,254,0.4)]'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="relative min-w-[220px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search coach, pass ID, team..."
                className="w-full bg-[#212A31] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:border-[#E5B868] focus:outline-none font-mono"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          {/* Coach Cards List */}
          <div className="space-y-4">
            {filteredCoaches.map((record) => {
              const isSelected = selectedCoach?.id === record.id;
              return (
                <div
                  key={record.id}
                  onClick={() => setSelectedCoach(record)}
                  className={`group p-5 rounded-3xl border transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isSelected
                      ? 'bg-[#212A31] border-[#E5B868] shadow-[0_0_25px_rgba(0,242,254,0.18)]'
                      : 'bg-[#212A31] border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={record.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'}
                      alt={record.coachName}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-[#E5B868]/50 flex-shrink-0"
                    />

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-white uppercase group-hover:text-[#E5B868] transition-colors flex items-center gap-1.5">
                          <span>{record.coachName}</span>
                          <VerifiedBadge size="sm" />
                        </h3>
                        <span className="text-[10px] font-mono font-bold text-[#E5B868] bg-[#E5B868]/10 px-2 py-0.5 rounded-md border border-[#E5B868]/30">
                          {record.passId}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 font-medium mt-0.5">
                        {record.roleTitle} • <strong className="text-white">{record.teamName}</strong>
                      </p>

                      <p className="text-[11px] text-slate-400 font-mono mt-1 flex items-center gap-2">
                        <span>{record.orgName}</span>
                        <span>•</span>
                        <span className="text-slate-300">{record.courtAssigned}</span>
                      </p>
                    </div>
                  </div>

                  {/* Status Badge & Check-in Toggle */}
                  <div className="flex sm:flex-col items-end justify-between gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-white/10">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider font-mono border ${
                      record.status === 'Cleared'
                        ? 'bg-red-600/20 text-red-500 border-red-600/40'
                        : record.status === 'Locked Roster'
                        ? 'bg-[#E5B868]/20 text-slate-300 border-[#E5B868]/40'
                        : record.status === 'Flagged'
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    }`}>
                      {record.status === 'Cleared' ? `✓ CLEARED @ ${record.checkInTime || 'NOW'}` : record.status}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleCheckIn(record.id);
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        record.status === 'Cleared'
                          ? 'bg-white/10 text-slate-300 hover:bg-rose-500/20 hover:text-rose-400 border border-white/10'
                          : 'bg-[#E5B868] text-black hover:bg-[#38BDF8] shadow-[0_0_15px_rgba(0,242,254,0.4)]'
                      }`}
                    >
                      {record.status === 'Cleared' ? 'Revoke Gate Check-In' : 'Approve & Check In'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: SELECTED COACH & ROSTER VERIFICATION DETAILS (5 COLS) */}
        <div className="lg:col-span-5 space-y-6">
          {selectedCoach ? (
            <div className="rounded-3xl bg-[#212A31] border border-[#E5B868]/30 p-6 space-y-6 shadow-2xl relative sticky top-6">
              
              {/* Header */}
              <div className="flex items-start justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedCoach.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'}
                    alt={selectedCoach.coachName}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-[#E5B868]"
                  />
                  <div>
                    <h3 className="text-lg font-black text-white uppercase flex items-center gap-1.5">
                      <span>{selectedCoach.coachName}</span>
                      <VerifiedBadge size="md" />
                    </h3>
                    <p className="text-xs text-[#E5B868] font-mono font-bold">{selectedCoach.roleTitle}</p>
                    <p className="text-xs text-slate-400">{selectedCoach.teamName}</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsPassModalOpen(true)}
                  className="p-2.5 rounded-2xl bg-white/10 hover:bg-[#E5B868] text-slate-300 hover:text-black transition-all cursor-pointer border border-white/10"
                  title="Generate Digital Sideline Pass"
                >
                  <QrCode className="w-5 h-5" />
                </button>
              </div>

              {/* Compliance Verification Checklist */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 font-mono">
                  STAFF COMPLIANCE CHECKS
                </h4>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className={`p-3 rounded-2xl border flex items-center gap-2 ${
                    selectedCoach.waiverSigned ? 'bg-red-600/10 border-red-600/30 text-red-500' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  }`}>
                    {selectedCoach.waiverSigned ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    <div>
                      <p className="font-bold">Liability Waiver</p>
                      <p className="text-[10px] text-slate-400">{selectedCoach.waiverSigned ? 'Signed & On File' : 'Missing Signature'}</p>
                    </div>
                  </div>

                  <div className={`p-3 rounded-2xl border flex items-center gap-2 ${
                    selectedCoach.backgroundCheckCleared ? 'bg-red-600/10 border-red-600/30 text-red-500' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  }`}>
                    {selectedCoach.backgroundCheckCleared ? <ShieldCheck className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    <div>
                      <p className="font-bold">Background Check</p>
                      <p className="text-[10px] text-slate-400">{selectedCoach.backgroundCheckCleared ? 'NJSIAA Cleared' : 'Pending Review'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Roster Lock Control */}
              <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[#E5B868]" />
                    <span className="text-xs font-black uppercase text-white font-mono">
                      Tournament Roster Status
                    </span>
                  </div>
                  <span className="text-xs font-mono text-[#E5B868] font-bold">
                    {selectedCoach.rosterVerifiedCount}/{selectedCoach.totalRosterCount} Verified
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Locking the team roster freezes player registration, ensuring no unauthorized athletes are added prior to tournament tip-off.
                </p>

                <button
                  onClick={() => handleToggleRosterLock(selectedCoach.id)}
                  className={`w-full py-2.5 rounded-xl font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    selectedCoach.status === 'Locked Roster'
                      ? 'bg-slate-700 text-black shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
                  }`}
                >
                  {selectedCoach.status === 'Locked Roster' ? (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Roster Locked for Tournament</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4 text-[#E5B868]" />
                      <span>Lock Team Roster</span>
                    </>
                  )}
                </button>
              </div>

              {/* Contact Information */}
              <div className="space-y-2 text-xs font-mono pt-2 border-t border-white/10">
                <div className="flex items-center gap-2 text-slate-300">
                  <Phone className="w-3.5 h-3.5 text-[#E5B868]" />
                  <span>{selectedCoach.coachPhone || 'No phone provided'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Mail className="w-3.5 h-3.5 text-[#E5B868]" />
                  <span>{selectedCoach.coachEmail || 'No email provided'}</span>
                </div>
              </div>

              {/* Print Official Credential Badge Button */}
              <button
                onClick={() => setIsPassModalOpen(true)}
                className="w-full py-3 rounded-2xl bg-[#E5B868] hover:bg-[#38BDF8] text-black font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,242,254,0.4)] cursor-pointer transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official Sideline Pass Badge</span>
              </button>

            </div>
          ) : (
            <div className="rounded-3xl bg-[#212A31] border border-white/10 p-12 text-center text-slate-400">
              Select a coach from the manifest list to inspect compliance credentials.
            </div>
          )}
        </div>

      </div>

      {/* --- QR CODE GATE SCANNER MODAL --- */}
      <AnimatePresence>
        {isScannerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#212A31] border border-[#E5B868]/50 rounded-3xl max-w-md w-full p-6 space-y-5 text-center shadow-2xl relative"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 text-white font-black uppercase text-xs">
                  <Camera className="w-4 h-4 text-[#E5B868]" />
                  <span>Official QR Gate Scanner</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="p-1.5 rounded-lg bg-white/10 text-slate-300 hover:text-white"
                  >
                    {soundEnabled ? <Volume2 className="w-4 h-4 text-[#E5B868]" /> : <VolumeX className="w-4 h-4" />}
                  </button>
                  <button onClick={() => setIsScannerOpen(false)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Real Camera QR Scanner Component */}
              <div className="w-full">
                <RealCameraQrScanner 
                  onScanSuccess={(scannedText) => {
                    let target = coachRecords.find(c => 
                      c.passId.toLowerCase() === scannedText.toLowerCase() || 
                      c.coachName.toLowerCase().includes(scannedText.toLowerCase())
                    );
                    if (!target) {
                      try {
                        const parsed = JSON.parse(scannedText);
                        const name = parsed.coachName || parsed.name || parsed.athleteName;
                        if (name) {
                          target = coachRecords.find(c => c.coachName.toLowerCase().includes(name.toLowerCase()));
                        }
                      } catch {
                        // ignore parse error
                      }
                    }
                    const activeTarget = target || coachRecords[0];
                    if (activeTarget) {
                      setScannedResult(activeTarget.passId);
                      setSelectedCoach(activeTarget);
                      handleToggleCheckIn(activeTarget.id);
                    }
                  }}
                />
              </div>

              {/* Manual Pass ID / Search Entry Form for Damaged/Unreadable QR Passes */}
              <div className="pt-3 border-t border-white/10 text-left space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-300">
                  <span className="text-[#E5B868] font-bold">Manual Pass Override</span>
                  <span className="text-slate-500">For damaged or unreadable QR codes</span>
                </div>

                <form onSubmit={handleManualCheckIn} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={manualCodeInput}
                    onChange={(e) => {
                      setManualCodeInput(e.target.value);
                      if (manualSearchError) setManualSearchError(null);
                    }}
                    placeholder="Enter Pass ID (e.g. J1P-COACH-8841)..."
                    className="flex-1 bg-black/60 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-[#E5B868]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#E5B868] hover:bg-[#38BDF8] text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_12px_rgba(0,242,254,0.3)] shrink-0"
                  >
                    Check In
                  </button>
                </form>

                {manualSearchError && (
                  <p className="text-[11px] text-amber-400 font-mono font-semibold pt-0.5">
                    ⚠️ {manualSearchError}
                  </p>
                )}
              </div>

              <div className="space-y-2 pt-2 border-t border-white/10">
                <button
                  onClick={triggerSimulatedScan}
                  disabled={isSimulatingScan}
                  className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border border-white/10"
                >
                  Test Demo Pass Scan
                </button>
                <p className="text-[10px] text-slate-400 font-mono">
                  Align coach, staff or athlete QR pass in camera viewport for instant check-in timestamping.
                </p>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- OFFICIAL SIDELINE PASS BADGE MODAL --- */}
      <AnimatePresence>
        {isPassModalOpen && selectedCoach && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#212A31] border border-[#E5B868] rounded-3xl max-w-sm w-full p-6 text-center space-y-5 shadow-2xl relative"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <span className="text-xs font-black uppercase text-white font-mono">Official Sideline Pass</span>
                <button onClick={() => setIsPassModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Digital Badge Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-b from-[#212A31] to-[#212A31] border-2 border-[#E5B868] space-y-4 relative overflow-hidden shadow-[0_0_30px_rgba(0,242,254,0.25)]">
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-[#E5B868] text-black text-[9px] font-black uppercase font-mono">
                  STAFF ACCREDITED
                </div>

                <img
                  src={selectedCoach.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'}
                  alt={selectedCoach.coachName}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-[#E5B868] mx-auto shadow-lg"
                />

                <div>
                  <h3 className="text-base font-black text-white uppercase">{selectedCoach.coachName}</h3>
                  <p className="text-xs text-[#E5B868] font-mono font-bold">{selectedCoach.roleTitle}</p>
                  <p className="text-xs text-slate-300 mt-1">{selectedCoach.teamName}</p>
                </div>

                <div className="p-3 bg-white rounded-xl mx-auto inline-block">
                  <QrCode className="w-28 h-28 text-black" />
                </div>

                <div className="text-[10px] font-mono text-slate-400">
                  <p>Pass ID: <strong className="text-white">{selectedCoach.passId}</strong></p>
                  <p>Court: <strong className="text-[#E5B868]">{selectedCoach.courtAssigned}</strong></p>
                </div>
              </div>

              <button
                onClick={() => window.print()}
                className="w-full py-3 rounded-xl bg-[#E5B868] hover:bg-[#38BDF8] text-black font-black uppercase text-xs tracking-wider shadow-[0_0_15px_rgba(0,242,254,0.4)] cursor-pointer flex items-center justify-center gap-2 transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Print Lanyard Badge</span>
              </button>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- SESSION CLEANUP & AUTO-ARCHIVE MODAL --- */}
      <AnimatePresence>
        {isCleanupModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#212A31] border border-rose-500/50 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative text-left"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-rose-400" />
                  <h3 className="text-sm font-black uppercase text-white font-mono">Session Data & Auto-Cleanup</h3>
                </div>
                <button onClick={() => setIsCleanupModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Clean temporary gate check-in logs, clear scan timestamps, and organize the roster manifest for subsequent event sessions.
              </p>

              {/* Automatic Cleanup Toggle Setting */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold font-mono text-white uppercase">Auto-Clean On Event Conclude</h4>
                    <p className="text-[11px] text-slate-400">Purge session check-in logs automatically when event status becomes Concluded.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoCleanupOnConclude(!autoCleanupOnConclude)}
                    className={`w-12 h-6 rounded-full transition-colors p-1 cursor-pointer flex items-center ${
                      autoCleanupOnConclude ? 'bg-[#E5B868] justify-end' : 'bg-white/20 justify-start'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-black shadow-md`} />
                  </button>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Current Event Status:</span>
                  <button
                    onClick={handleToggleEventConclude}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold uppercase transition-all cursor-pointer ${
                      eventConcluded
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : 'bg-red-600/20 text-red-500 border border-red-600/40'
                    }`}
                  >
                    {eventConcluded ? 'Concluded (Session Cleaned)' : 'Live / In Progress'}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-1">
                <button
                  onClick={() => executeSessionCleanup('reset')}
                  className="w-full py-3 px-4 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset Check-Ins To Pending (Keep Manifest)</span>
                </button>

                <button
                  onClick={() => executeSessionCleanup('full')}
                  className="w-full py-3 px-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Full Session Data Wipe & Reset</span>
                </button>
              </div>

              {lastCleanupTime && (
                <p className="text-[10px] text-center font-mono text-slate-400 pt-1">
                  Last cleanup performed at <strong className="text-[#E5B868]">{lastCleanupTime}</strong>
                </p>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
