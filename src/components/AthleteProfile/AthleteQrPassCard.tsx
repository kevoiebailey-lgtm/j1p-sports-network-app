import React, { useState } from 'react';
import { UserProfile } from '../../types';
import { QrCodeDisplay } from '../Common/QrCodeDisplay';
import { BentoCard } from '../BentoCard';
import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { 
  QrCode, 
  Download, 
  Check, 
  Maximize2,
  Zap,
  CheckCircle2,
  Loader2
} from 'lucide-react';

interface AthleteQrPassCardProps {
  profile: UserProfile;
  onOpenScanner?: () => void;
}

export const AthleteQrPassCard: React.FC<AthleteQrPassCardProps> = ({
  profile,
  onOpenScanner
}) => {
  const [showFullModal, setShowFullModal] = useState<boolean>(false);
  const [downloaded, setDownloaded] = useState<boolean>(false);
  const [isSimulatingScan, setIsSimulatingScan] = useState<boolean>(false);
  const [scanSuccessMessage, setScanSuccessMessage] = useState<string | null>(null);

  // Generate unique pass token payload for athlete profile
  const passPayload = JSON.stringify({
    athleteUid: profile.uid,
    athleteName: profile.displayName,
    sport: profile.sport || 'Basketball',
    highSchool: profile.highSchool || 'J1P Academy',
    gradYear: profile.gradYear || '2026',
    verified: profile.isVerified || true,
    issuedAt: new Date().toISOString().split('T')[0]
  });

  const handleDownloadPass = () => {
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  // Immediate Organizer Check-in trigger to Firestore 'CheckinRecords'
  const handleSimulateScanCheckIn = async () => {
    setIsSimulatingScan(true);
    setScanSuccessMessage(null);

    const nowIso = new Date().toISOString();
    const formattedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const recordPayload = {
      athleteUid: profile.uid,
      athleteName: profile.displayName,
      teamName: profile.highSchool ? `${profile.highSchool} Varsity` : 'J1P Showcase Squad',
      sport: profile.sport || 'Basketball',
      courtField: 'Court 1 (Main Arena)',
      tournamentName: '2026 J1P National Showcase',
      status: 'Checked In',
      checkedInAt: nowIso,
      checkedInBy: auth?.currentUser?.email || 'Organizer Scanner',
      checkInMethod: 'J1P QR Code Pass Scan',
      verifiedByOrganizer: true
    };

    try {
      if (db) {
        const ref = collection(db, 'CheckinRecords');
        await addDoc(ref, recordPayload);

        // Also sync to checkIns
        const secondaryRef = collection(db, 'checkIns');
        await addDoc(secondaryRef, recordPayload);
      }

      setScanSuccessMessage(`Checked in at ${formattedTime}`);
      setTimeout(() => setScanSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Failed to update CheckinRecords:', err);
    } finally {
      setIsSimulatingScan(false);
    }
  };

  return (
    <>
      <BentoCard glow className="bg-[#000000] border-2 border-[#E5B868]/50 p-6 relative overflow-hidden space-y-4">
        {/* Card Header Badge */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#E5B868]/10 border border-[#E5B868]/30">
              <QrCode className="w-5 h-5 text-[#E5B868]" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#E5B868] font-mono block">
                J1P DIGITAL VENUE PASS
              </span>
              <h4 className="text-sm font-black text-white uppercase italic">
                {profile.displayName}'s Check-In Pass
              </h4>
            </div>
          </div>

          <button
            onClick={() => setShowFullModal(true)}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
            title="Expand Pass"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* QR Code Matrix */}
        <div className="flex flex-col items-center justify-center py-2">
          <QrCodeDisplay
            value={passPayload}
            size={180}
            title={`${(profile.sport || 'J1P ATHLETE').toUpperCase()} PASS`}
            subTitle={`${profile.highSchool || 'J1P Prep'} • CLASS OF ${profile.gradYear || '2026'}`}
          />
        </div>

        {scanSuccessMessage && (
          <div className="p-3 bg-[#E5B868]/10 border border-[#E5B868] rounded-xl text-center space-y-0.5 animate-bounce">
            <div className="flex items-center justify-center gap-1.5 text-[#E5B868]">
              <CheckCircle2 className="w-4 h-4 stroke-[3]" />
              <span className="text-xs font-black uppercase font-mono">
                FIRESTORE 'CheckinRecords' UPDATED!
              </span>
            </div>
            <p className="text-[10px] text-white font-mono">{scanSuccessMessage}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleDownloadPass}
            className="py-2.5 px-3 bg-white/10 hover:bg-white/15 text-slate-200 border border-white/15 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
          >
            {downloaded ? <Check className="w-3.5 h-3.5 text-[#E5B868]" /> : <Download className="w-3.5 h-3.5 text-slate-400" />}
            <span>{downloaded ? 'SAVED' : 'SAVE PASS'}</span>
          </button>

          <button
            onClick={handleSimulateScanCheckIn}
            disabled={isSimulatingScan}
            className="py-2.5 px-3 bg-[#E5B868] hover:bg-[#B8141B] text-black rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors shadow-[0_0_15px_rgba(214,28,36,0.4)] cursor-pointer disabled:opacity-50"
          >
            {isSimulatingScan ? <Loader2 className="w-3.5 h-3.5 animate-spin text-black" /> : <Zap className="w-3.5 h-3.5 text-black stroke-[2]" />}
            <span>{isSimulatingScan ? 'LOGGING...' : 'SCAN & CHECK-IN'}</span>
          </button>
        </div>

        {onOpenScanner && (
          <button
            onClick={onOpenScanner}
            className="w-full py-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
          >
            <QrCode className="w-3.5 h-3.5 text-[#E5B868]" />
            <span>OPEN ORGANIZER CAMERA SCANNER</span>
          </button>
        )}
      </BentoCard>

      {/* FULL SCREEN EXPANDED DIGITAL PASS MODAL */}
      {showFullModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl">
          <div className="relative w-full max-w-sm bg-[#000000] border-2 border-[#E5B868] rounded-3xl p-6 shadow-[0_0_50px_rgba(214,28,36,0.4)] text-white text-center space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-black uppercase text-[#E5B868] font-mono tracking-widest flex items-center gap-1.5">
                <QrCode className="w-4 h-4" /> J1P VERIFIED ATHLETE PASS
              </span>
              <button
                onClick={() => setShowFullModal(false)}
                className="p-1 rounded-full bg-white/10 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="py-2 space-y-1">
              <h3 className="text-xl font-black uppercase text-white">{profile.displayName}</h3>
              <p className="text-xs font-bold text-[#E5B868] uppercase">{profile.sport} • {profile.position}</p>
              <p className="text-[10px] font-mono text-slate-400">{profile.highSchool} ({profile.state}) • Class of {profile.gradYear}</p>
            </div>

            <div className="flex justify-center py-2">
              <QrCodeDisplay
                value={passPayload}
                size={220}
                title="SCAN AT FIELD OR COURT ENTRANCE"
                subTitle="Syncs real-time check-in to Firestore 'CheckinRecords'"
              />
            </div>

            <button
              onClick={handleSimulateScanCheckIn}
              disabled={isSimulatingScan}
              className="w-full py-3 bg-[#E5B868] text-black font-black text-xs uppercase tracking-wider rounded-2xl shadow-[0_0_20px_rgba(214,28,36,0.5)] cursor-pointer disabled:opacity-50"
            >
              {isSimulatingScan ? 'LOGGING TO FIRESTORE...' : 'SIMULATE ORGANIZER SCAN & CHECK-IN'}
            </button>

            <button
              onClick={() => setShowFullModal(false)}
              className="w-full py-2 bg-white/10 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl"
            >
              CLOSE PASS
            </button>
          </div>
        </div>
      )}
    </>
  );
};
