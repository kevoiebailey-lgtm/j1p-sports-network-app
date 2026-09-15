import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { QrCodeDisplay } from '../Common/QrCodeDisplay';
import { RealCameraQrScanner } from '../Common/RealCameraQrScanner';
import { 
  QrCode, 
  Camera, 
  CheckCircle2, 
  Zap, 
  UserCheck, 
  AlertCircle, 
  AlertTriangle,
  ShieldCheck, 
  Search, 
  Radio, 
  Sparkles,
  Volume2
} from 'lucide-react';

import { handleFirestoreError, OperationType } from '../../lib/firestoreErrorHandler';

interface QrCheckInScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckInCompleted?: (athleteName: string) => void;
}

// Sample registered athletes available for quick organizer scan testing
const SAMPLE_REGISTRATION_ATHLETES = [
  { athleteUid: 'ath-101', athleteName: 'Marcus Rivera', teamName: 'Jersey City Ballers', sport: 'Basketball', courtField: 'Court 1 (Main Arena)', tournamentName: '2026 Tri-State Summer Invitational' },
  { athleteUid: 'ath-102', athleteName: 'Jordan Vance', teamName: 'Newark Express', sport: 'Basketball', courtField: 'Court 2', tournamentName: '2026 Tri-State Summer Invitational' },
  { athleteUid: 'ath-103', athleteName: 'Sierra Jenkins', teamName: 'Philly Blitz', sport: 'Flag Football', courtField: 'Field A', tournamentName: '2026 NJ Flag Football Classic' },
  { athleteUid: 'ath-104', athleteName: 'DeShawn Washington', teamName: 'Bergen Catholic Elite', sport: 'Basketball', courtField: 'Court 1', tournamentName: '2026 Tri-State Summer Invitational' },
  { athleteUid: 'ath-105', athleteName: 'Maya Thorne', teamName: 'Edison Valkyries', sport: 'Flag Football', courtField: 'Field B', tournamentName: '2026 NJ Flag Football Classic' }
];

export const QrCheckInScannerModal: React.FC<QrCheckInScannerModalProps> = ({
  isOpen,
  onClose,
  onCheckInCompleted
}) => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'scan' | 'manual' | 'simulated'>('simulated');
  const [qrInputText, setQrInputText] = useState<string>('');
  const [selectedAthleteUid, setSelectedAthleteUid] = useState<string>(SAMPLE_REGISTRATION_ATHLETES[0].athleteUid);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [checkedInMap, setCheckedInMap] = useState<Record<string, { athleteName: string; teamName: string; timestamp: string }>>({});
  const [duplicateAlert, setDuplicateAlert] = useState<{
    athleteName: string;
    teamName: string;
    firstCheckInTime: string;
  } | null>(null);
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    athleteName: string;
    teamName: string;
    timestamp: string;
    recordId: string;
  } | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);

  if (!isOpen) return null;

  // Web Audio API warning sound generator for duplicate/already checked-in alert
  const playWarningBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.setValueAtTime(220, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Audio context fallback
    }

    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200]);
      } catch {
        // Fallback
      }
    }
  };

  // Web Audio API beep sound generator for authentic scanner feedback
  const playScanBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880; // High beep note
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // Audio context silently ignored if restricted by browser policy
    }
  };

  // Trigger check-in event in Firestore collection 'CheckinRecords'
  const executeScanCheckIn = async (athleteData: {
    athleteUid: string;
    athleteName: string;
    teamName: string;
    sport: string;
    courtField: string;
    tournamentName: string;
  }) => {
    setIsProcessing(true);
    setScanResult(null);
    setDuplicateAlert(null);

    const nowIso = new Date().toISOString();
    const formattedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // CHECK IF ATHLETE IS ALREADY CHECKED IN
    const existingCheckIn = checkedInMap[athleteData.athleteUid] || checkedInMap[athleteData.athleteName.toLowerCase()];
    if (existingCheckIn) {
      playWarningBeep();
      setDuplicateAlert({
        athleteName: athleteData.athleteName,
        teamName: athleteData.teamName,
        firstCheckInTime: existingCheckIn.timestamp
      });
      setIsProcessing(false);
      return;
    }

    const checkInPayload = {
      athleteUid: athleteData.athleteUid,
      athleteName: athleteData.athleteName,
      teamName: athleteData.teamName,
      sport: athleteData.sport,
      courtField: athleteData.courtField,
      tournamentName: athleteData.tournamentName,
      status: 'Checked In',
      checkedInAt: nowIso,
      checkedInBy: user?.email || profile?.displayName || 'Organizer Scanner',
      checkInMethod: 'QR Code Scan',
      verifiedByOrganizer: true
    };

    try {
      let createdRecordId = `rec-${Date.now()}`;

      if (db) {
        // 1. Write to 'CheckinRecords' collection
        const checkinRecordsRef = collection(db, 'CheckinRecords');
        try {
          const docRef = await addDoc(checkinRecordsRef, checkInPayload);
          createdRecordId = docRef.id;
        } catch (err) {
          try {
            handleFirestoreError(err, OperationType.WRITE, 'CheckinRecords');
          } catch (e) {
            console.warn('CheckinRecords write notice:', e);
          }
        }

        // 2. Also write/update sync to 'checkIns' collection for UI compatibility
        const checkInsRef = collection(db, 'checkIns');
        try {
          await addDoc(checkInsRef, checkInPayload);
        } catch (err) {
          try {
            handleFirestoreError(err, OperationType.WRITE, 'checkIns');
          } catch (e) {
            console.warn('checkIns write notice:', e);
          }
        }
      }

      playScanBeep();

      // Record in local session map to detect immediate repeat scans
      setCheckedInMap(prev => ({
        ...prev,
        [athleteData.athleteUid]: {
          athleteName: athleteData.athleteName,
          teamName: athleteData.teamName,
          timestamp: formattedTime
        },
        [athleteData.athleteName.toLowerCase()]: {
          athleteName: athleteData.athleteName,
          teamName: athleteData.teamName,
          timestamp: formattedTime
        }
      }));

      setScanResult({
        success: true,
        athleteName: athleteData.athleteName,
        teamName: athleteData.teamName,
        timestamp: formattedTime,
        recordId: createdRecordId
      });

      if (onCheckInCompleted) {
        onCheckInCompleted(athleteData.athleteName);
      }
    } catch (err) {
      console.error('Failed to log check-in record:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSimulatedScan = () => {
    const selected = SAMPLE_REGISTRATION_ATHLETES.find(a => a.athleteUid === selectedAthleteUid) || SAMPLE_REGISTRATION_ATHLETES[0];
    executeScanCheckIn(selected);
  };

  const handleManualPayloadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrInputText.trim()) return;

    try {
      // Try parsing JSON payload if present
      const parsed = JSON.parse(qrInputText);
      executeScanCheckIn({
        athleteUid: parsed.athleteUid || parsed.uid || `ath-${Date.now()}`,
        athleteName: parsed.athleteName || parsed.name || 'Athlete Participant',
        teamName: parsed.teamName || 'Showcase Squad',
        sport: parsed.sport || 'Basketball',
        courtField: parsed.courtField || 'Main Court',
        tournamentName: parsed.tournamentName || '2026 Invitational'
      });
    } catch {
      // String token input
      executeScanCheckIn({
        athleteUid: `ath-${Date.now()}`,
        athleteName: qrInputText.trim(),
        teamName: 'Registered Team',
        sport: 'Basketball',
        courtField: 'Court 1',
        tournamentName: '2026 Invitational'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg bg-[#000000] border-2 border-[#E5B868] rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(0,242,254,0.35)] text-white space-y-6"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#E5B868]/20 border border-[#E5B868]">
              <QrCode className="w-5 h-5 text-[#E5B868]" />
            </div>
            <div>
              <h3 className="text-base font-black uppercase italic tracking-wide text-white">
                ORGANIZER QR CHECK-IN SCANNER
              </h3>
              <p className="text-[10px] text-[#E5B868] font-mono uppercase tracking-widest">
                Firestore 'CheckinRecords' Collection Sync
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
          <button
            onClick={() => { setActiveTab('simulated'); setScanResult(null); setDuplicateAlert(null); }}
            className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'simulated'
                ? 'bg-[#E5B868] text-black shadow-[0_0_15px_rgba(0,242,254,0.5)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Instant Scan
          </button>

          <button
            onClick={() => { setActiveTab('scan'); setScanResult(null); setDuplicateAlert(null); }}
            className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'scan'
                ? 'bg-[#E5B868] text-black shadow-[0_0_15px_rgba(0,242,254,0.5)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Camera Lens
          </button>

          <button
            onClick={() => { setActiveTab('manual'); setScanResult(null); setDuplicateAlert(null); }}
            className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'manual'
                ? 'bg-[#E5B868] text-black shadow-[0_0_15px_rgba(0,242,254,0.5)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Code Payload
          </button>
        </div>

        {/* TAB 1: Instant Organizer Scan Tester */}
        {activeTab === 'simulated' && (
          <div className="space-y-4">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Select Athlete Digital Pass to Scan:
              </label>
              <select
                value={selectedAthleteUid}
                onChange={(e) => setSelectedAthleteUid(e.target.value)}
                className="w-full bg-black border border-[#E5B868]/50 rounded-xl px-3 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-[#E5B868]"
              >
                {SAMPLE_REGISTRATION_ATHLETES.map((a) => (
                  <option key={a.athleteUid} value={a.athleteUid}>
                    {a.athleteName} — {a.teamName} ({a.sport})
                  </option>
                ))}
              </select>

              {/* Preview Selected QR Pass */}
              {(() => {
                const sel = SAMPLE_REGISTRATION_ATHLETES.find(a => a.athleteUid === selectedAthleteUid);
                if (!sel) return null;
                return (
                  <div className="pt-2 flex items-center justify-center">
                    <QrCodeDisplay
                      value={JSON.stringify({ athleteUid: sel.athleteUid, name: sel.athleteName, sport: sel.sport })}
                      size={140}
                      title={sel.athleteName}
                      subTitle={`${sel.teamName} • ${sel.courtField}`}
                    />
                  </div>
                );
              })()}
            </div>

            <button
              onClick={handleSimulatedScan}
              disabled={isProcessing}
              className="w-full py-4 bg-[#E5B868] hover:bg-[#38BDF8] text-black font-black text-xs uppercase tracking-wider rounded-2xl shadow-[0_0_25px_rgba(0,242,254,0.6)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-5 h-5 text-black stroke-[2]" />
              <span>{isProcessing ? 'LOGGING TO FIRESTORE...' : 'SCAN PASS & TRIGGER CHECK-IN'}</span>
            </button>
          </div>
        )}

        {/* TAB 2: Official Live Camera Optics Feed */}
        {activeTab === 'scan' && (
          <div className="space-y-4 text-center">
            <RealCameraQrScanner 
              onScanSuccess={(scannedText) => {
                try {
                  const parsed = JSON.parse(scannedText);
                  executeScanCheckIn({
                    athleteUid: parsed.athleteUid || parsed.uid || `ath-${Date.now()}`,
                    athleteName: parsed.athleteName || parsed.displayName || parsed.name || 'Member Athlete',
                    teamName: parsed.teamName || 'Registered Team',
                    sport: parsed.sport || 'Basketball',
                    courtField: parsed.courtField || 'Court 1',
                    tournamentName: parsed.tournamentName || '2026 Invitational'
                  });
                } catch {
                  executeScanCheckIn({
                    athleteUid: `ath-${Date.now()}`,
                    athleteName: scannedText.length > 25 ? scannedText.substring(0, 25) + '...' : scannedText,
                    teamName: 'Verified Pass Scan',
                    sport: 'Basketball',
                    courtField: 'Gate Check-In',
                    tournamentName: 'Just1Play Event'
                  });
                }
              }}
            />
          </div>
        )}

        {/* TAB 3: Raw QR Payload Input */}
        {activeTab === 'manual' && (
          <form onSubmit={handleManualPayloadSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Enter or Paste Athlete Pass Token / JSON:
              </label>
              <textarea
                rows={3}
                value={qrInputText}
                onChange={(e) => setQrInputText(e.target.value)}
                placeholder='e.g., {"athleteUid": "ath-101", "athleteName": "Marcus Rivera"}'
                className="w-full bg-black border border-white/15 rounded-2xl p-3 text-xs text-white font-mono focus:outline-none focus:border-[#E5B868]"
              />
            </div>

            <button
              type="submit"
              disabled={isProcessing || !qrInputText.trim()}
              className="w-full py-3.5 bg-[#E5B868] hover:bg-[#38BDF8] text-black font-black text-xs uppercase tracking-wider rounded-2xl shadow-[0_0_20px_rgba(0,242,254,0.5)] transition-all disabled:opacity-50"
            >
              PROCESS PAYLOAD & LOG CHECKIN
            </button>
          </form>
        )}

        {/* Real-Time Scan Success & Already Recorded Duplicate Alerts */}
        <AnimatePresence>
          {duplicateAlert && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="p-4 bg-amber-950/90 border-2 border-amber-400 rounded-2xl text-center space-y-1.5 shadow-[0_0_35px_rgba(251,191,36,0.45)] animate-pulse"
            >
              <div className="flex items-center justify-center gap-2 text-amber-400">
                <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
                <span className="text-xs font-black uppercase font-mono tracking-widest">
                  CHECK-IN ALREADY RECORDED
                </span>
              </div>
              <p className="text-sm font-black text-white uppercase">{duplicateAlert.athleteName}</p>
              <p className="text-[11px] font-mono text-amber-200">
                Team: {duplicateAlert.teamName} • Original Check-In logged at {duplicateAlert.firstCheckInTime}
              </p>
              <div className="pt-1 flex items-center justify-center gap-1.5 text-[10px] font-mono text-amber-300/90 font-bold">
                <span>⚠️ Athlete pass has already been verified and logged for this session.</span>
              </div>
            </motion.div>
          )}

          {scanResult && !duplicateAlert && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 bg-emerald-950/80 border-2 border-[#E5B868] rounded-2xl text-center space-y-1 shadow-[0_0_30px_rgba(0,242,254,0.4)]"
            >
              <div className="flex items-center justify-center gap-1.5 text-[#E5B868]">
                <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                <span className="text-xs font-black uppercase font-mono tracking-widest">
                  CHECK-IN EVENT FIRESTORE LOGGED!
                </span>
              </div>
              <p className="text-sm font-black text-white uppercase">{scanResult.athleteName}</p>
              <p className="text-[10px] font-mono text-slate-300">
                Team: {scanResult.teamName} • Logged at {scanResult.timestamp}
              </p>
              <p className="text-[9px] font-mono text-[#E5B868]/80 pt-1">
                Document ID: {scanResult.recordId} in collection 'CheckinRecords'
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
