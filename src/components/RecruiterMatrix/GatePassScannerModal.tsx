import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  QrCode, 
  Camera, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  UserCheck, 
  RefreshCw, 
  Search,
  Volume2,
  Sparkles,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../../lib/firebase';
import { collection, doc, setDoc, getDocs, onSnapshot, serverTimestamp } from 'firebase/firestore';

interface AthletePassRecord {
  id: string;
  passCode: string;
  fullName: string;
  sport: string;
  position: string;
  team: string;
  division: string;
  gradYear: string;
  waiverSigned: boolean;
  ageVerified: boolean;
  checkedIn: boolean;
  checkInTime?: string;
  avatarUrl: string;
}

const DEMO_DATABASE: AthletePassRecord[] = [
  {
    id: 'ath-1',
    passCode: 'J1P-NCAA-MARCUS-2027',
    fullName: 'Marcus Sterling',
    sport: 'Flag Football',
    position: 'QB / ATH',
    team: 'SoCal Elite Vipers',
    division: '14U Varsity',
    gradYear: '2027',
    waiverSigned: true,
    ageVerified: true,
    checkedIn: false,
    avatarUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=300&auto=format&fit=crop&q=80'
  },
  {
    id: 'ath-2',
    passCode: 'J1P-NCAA-JAYDEN-2027',
    fullName: 'Jayden Vance',
    sport: 'Flag Football',
    position: 'WR',
    team: 'SoCal Elite Vipers',
    division: '14U Varsity',
    gradYear: '2027',
    waiverSigned: true,
    ageVerified: true,
    checkedIn: true,
    checkInTime: '08:42 AM',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'
  },
  {
    id: 'ath-3',
    passCode: 'J1P-NCAA-TREY-2028',
    fullName: 'Trey Hawkins',
    sport: 'Flag Football',
    position: 'CB / FS',
    team: 'Philly Pride Select',
    division: '14U Varsity',
    gradYear: '2028',
    waiverSigned: true,
    ageVerified: true,
    checkedIn: false,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80'
  },
  {
    id: 'ath-4',
    passCode: 'J1P-NCAA-KOBE-2027',
    fullName: 'Kobe Alvarez',
    sport: 'Basketball',
    position: 'Guard',
    team: 'Oakland Soldiers',
    division: '17U EYBL',
    gradYear: '2027',
    waiverSigned: false,
    ageVerified: true,
    checkedIn: false,
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80'
  }
];

interface GatePassScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GatePassScannerModal: React.FC<GatePassScannerModalProps> = ({ isOpen, onClose }) => {
  const [athleteRecords, setAthleteRecords] = useState<AthletePassRecord[]>(DEMO_DATABASE);
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(true);
  const [scannedResult, setScannedResult] = useState<AthletePassRecord | null>(null);
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error' | 'warning'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Sync check-in records from Firestore
  useEffect(() => {
    if (!isOpen) return;
    try {
      const checkinCol = collection(db, 'checkins');
      const unsubscribe = onSnapshot(
        checkinCol,
        (snapshot) => {
          const checkedInMap = new Map<string, { time: string }>();
          snapshot.docs.forEach(d => {
            const data = d.data();
            if (data.athleteId) {
              checkedInMap.set(data.athleteId, { time: data.checkInTime || 'Checked In' });
            }
          });

          setAthleteRecords(prev => prev.map(ath => {
            if (checkedInMap.has(ath.id)) {
              return {
                ...ath,
                checkedIn: true,
                checkInTime: checkedInMap.get(ath.id)?.time || ath.checkInTime
              };
            }
            return ath;
          }));
        },
        (err) => {
          console.warn('Checkins snapshot notice in GatePassScannerModal:', err);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn('Checkin live stream fallback to local state:', err);
    }
  }, [isOpen]);

  const playChime = (type: 'success' | 'fail') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.setValueAtTime(140, now + 0.15);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch (e) {}
  };

  const processPassVerification = async (codeToVerify: string) => {
    const trimmed = codeToVerify.trim().toUpperCase();
    const athlete = athleteRecords.find(a => a.passCode.toUpperCase() === trimmed || a.id.toUpperCase() === trimmed);

    if (!athlete) {
      setScanStatus('error');
      setErrorMessage(`INVALID PASS: No record found for code "${trimmed}"`);
      playChime('fail');
      setScannedResult(null);
      return;
    }

    if (!athlete.waiverSigned) {
      setScanStatus('warning');
      setErrorMessage('PENDING WAIVER: Athlete must complete the signed event liability waiver before entering!');
      playChime('fail');
      setScannedResult(athlete);
      return;
    }

    // Success Check-in
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setAthleteRecords(prev => prev.map(a => a.id === athlete.id ? { ...a, checkedIn: true, checkInTime: nowTime } : a));
    setScannedResult({ ...athlete, checkedIn: true, checkInTime: nowTime });
    setScanStatus('success');
    playChime('success');

    // Persist to Cloud Firestore checkins collection
    try {
      await setDoc(doc(db, 'checkins', `gate_${athlete.id}`), {
        athleteId: athlete.id,
        fullName: athlete.fullName,
        team: athlete.team,
        passCode: athlete.passCode,
        sport: athlete.sport,
        division: athlete.division,
        checkedIn: true,
        checkInTime: nowTime,
        timestamp: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.warn('Firestore check-in write synced locally:', err);
    }
  };

  const handleSimulateScan = (code: string) => {
    setManualCode(code);
    processPassVerification(code);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#12171E] border border-[#2D3748] rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2D3748] bg-[#161C22]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#00F2FE]/15 border border-[#00F2FE]/30 text-[#00F2FE]">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white font-mono tracking-wide flex items-center gap-2">
                <span>GATE CHECK-IN &amp; DIGITAL ID SCANNER</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  LIVE FIELD SCANNER
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Instant NFC / QR code authentication and waiver verification
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#1E2630] hover:bg-[#2D3748] text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scanner Viewport & Manual Form */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Visual Optical Scanner Viewport */}
          <div className="relative aspect-[16/9] sm:aspect-[21/9] rounded-2xl bg-black border-2 border-dashed border-[#00F2FE]/40 overflow-hidden flex flex-col items-center justify-center shadow-inner">
            {/* Animated Laser Scanning Line */}
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#00F2FE] to-transparent shadow-[0_0_15px_#00F2FE] animate-bounce pointer-events-none" />

            <div className="text-center space-y-2 z-10">
              <Camera className="w-8 h-8 text-[#00F2FE] mx-auto animate-pulse" />
              <p className="text-xs font-mono font-bold text-slate-300">
                ALIGN ATHLETE QR CODE INSIDE TARGET
              </p>
              <p className="text-[10px] font-mono text-slate-500">
                Camera feed active • Auto-detecting 2D barcodes
              </p>
            </div>

            {/* Corner Target Marks */}
            <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-[#00F2FE]" />
            <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-[#00F2FE]" />
            <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-[#00F2FE]" />
            <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-[#00F2FE]" />
          </div>

          {/* Quick Simulation Shortcuts */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              Quick Test Simulation Barcodes:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {athleteRecords.map((ath) => (
                <button
                  key={ath.id}
                  onClick={() => handleSimulateScan(ath.passCode)}
                  className="p-2 rounded-xl bg-[#161C22] hover:bg-[#1E2630] border border-[#2D3748] text-left text-xs transition-all cursor-pointer truncate"
                >
                  <div className="font-bold text-white truncate">{ath.fullName}</div>
                  <div className="text-[10px] font-mono text-slate-400 truncate">{ath.team}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Manual Barcode Input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && processPassVerification(manualCode)}
                placeholder="Scan or enter Pass Code (e.g. J1P-NCAA-MARCUS-2027)..."
                className="w-full bg-[#0F141A] border border-[#2D3748] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-[#00F2FE]"
              />
            </div>
            <button
              onClick={() => processPassVerification(manualCode)}
              className="px-4 py-2.5 rounded-xl bg-[#00F2FE] hover:bg-[#38BDF8] text-slate-950 font-mono font-black text-xs uppercase cursor-pointer"
            >
              Verify
            </button>
          </div>

          {/* Verification Result Card */}
          {scanStatus !== 'idle' && (
            <div className={`p-4 rounded-2xl border ${
              scanStatus === 'success' ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-300' :
              scanStatus === 'warning' ? 'bg-amber-950/30 border-amber-500/50 text-amber-300' :
              'bg-red-950/30 border-red-500/50 text-red-300'
            } space-y-3`}>
              
              <div className="flex items-center gap-3">
                {scanStatus === 'success' && <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />}
                {scanStatus === 'warning' && <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />}
                {scanStatus === 'error' && <AlertTriangle className="w-6 h-6 text-red-400 shrink-0" />}
                <div>
                  <h4 className="font-mono font-black text-sm uppercase tracking-wide">
                    {scanStatus === 'success' ? 'ACCESS GRANTED • ATHLETE CLEARED' :
                     scanStatus === 'warning' ? 'ACCESS RESTRICTED • ACTION REQUIRED' :
                     'ACCESS DENIED • INVALID CREDENTIAL'}
                  </h4>
                  {errorMessage && <p className="text-xs">{errorMessage}</p>}
                </div>
              </div>

              {scannedResult && (
                <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center gap-3 text-xs">
                  <img
                    src={scannedResult.avatarUrl}
                    alt={scannedResult.fullName}
                    className="w-12 h-12 rounded-xl object-cover border border-white/20"
                  />
                  <div className="space-y-0.5 overflow-hidden">
                    <div className="font-black text-white text-sm">{scannedResult.fullName}</div>
                    <div className="text-slate-300 font-mono">
                      {scannedResult.team} • {scannedResult.division} • Class of {scannedResult.gradYear}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono">
                      <span className="text-emerald-400">Waiver: {scannedResult.waiverSigned ? 'Signed' : 'MISSING'}</span>
                      <span className="text-cyan-400">Age: {scannedResult.ageVerified ? 'Verified' : 'Pending'}</span>
                      {scannedResult.checkInTime && (
                        <span className="text-amber-300">Checked In: {scannedResult.checkInTime}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#161C22] border-t border-[#2D3748]">
          <div className="text-xs font-mono text-slate-400">
            Total Gate Scans Today: {athleteRecords.filter(a => a.checkedIn).length} / {athleteRecords.length} Athletes
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#2D3748] hover:bg-[#4A5568] text-white font-mono text-xs font-bold transition-colors cursor-pointer"
          >
            Close Scanner
          </button>
        </div>

      </div>
    </div>
  );
};
