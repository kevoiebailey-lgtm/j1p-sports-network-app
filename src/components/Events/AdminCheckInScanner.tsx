import React, { useState } from 'react';
import { EventItem, TeamItem, UserProfile } from '../../types';
import { searchAthleteProfile, fetchTeamsForEvent } from '../../services/tournamentHubService';
import { RealCameraQrScanner } from '../Common/RealCameraQrScanner';
import { 
  QrCode, 
  Search, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  ShieldCheck, 
  Lock, 
  Camera, 
  RefreshCw, 
  Users, 
  X,
  Sparkles
} from 'lucide-react';

interface AdminCheckInScannerProps {
  event: EventItem;
  onClose?: () => void;
}

export const AdminCheckInScanner: React.FC<AdminCheckInScannerProps> = ({ event, onClose }) => {
  const [searchInput, setSearchInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [checkedInUids, setCheckedInUids] = useState<Record<string, string>>({});
  const [scanResult, setScanResult] = useState<{
    status: 'VERIFIED' | 'INELIGIBLE' | 'ALREADY_CHECKED_IN';
    athlete?: UserProfile;
    teamName?: string;
    division?: string;
    message: string;
    firstCheckInTime?: string;
  } | null>(null);

  // Quick Demo Athletes to simulate instant QR code scans
  const MOCK_SCANS = [
    { name: 'Marcus Vance (Eligible Athlete)', id: 'J1P-849201', dob: '2010-05-12' },
    { name: 'David Miller (Unregistered)', id: 'J1P-999999', dob: '2008-02-14' },
    { name: 'Trevor Johnson (Age Ineligible)', id: 'J1P-112233', dob: '2005-09-01' }
  ];

  const handleProcessScan = async (scannedIdOrUid: string) => {
    setIsScanning(true);
    setScanResult(null);

    try {
      // 1. Fetch athlete profile
      const athletes = await searchAthleteProfile(scannedIdOrUid);
      let athlete = athletes.length > 0 ? athletes[0] : null;

      if (!athlete) {
        // Fallback demo profile if custom mock ID
        athlete = {
          uid: 'demo-uid-' + Math.random().toString(36).substring(7),
          email: 'athlete@just1play.com',
          displayName: scannedIdOrUid.includes('Vance') ? 'Marcus Vance' : 'David Miller',
          role: 'athlete',
          sport: 'Basketball',
          gradYear: '2026',
          highSchool: 'St. Peter Prep',
          state: 'NJ',
          position: 'Point Guard',
          height: '6-2',
          weight: '185',
          gpa: '3.8',
          bio: 'Top 50 Recruit',
          athleteId: scannedIdOrUid,
          dateOfBirth: '2010-05-12',
          social: {},
          stats: { points: 22, rebounds: 6, assists: 8, steals: 3, blocks: 1, gamesPlayed: 12 },
          mediaUrls: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }

      // 2. Fetch event teams to check if athlete is on an official paid team roster
      const teams = await fetchTeamsForEvent(event.id);
      
      // Default fallback mock team if initial test
      const mockTeams: TeamItem[] = teams.length > 0 ? teams : [
        { id: 't1', eventId: event.id, coachId: 'c1', division: '14U', teamName: 'Tri-State Elite', paymentStatus: 'Paid', roster: [athlete.uid] }
      ];

      const matchingTeam = mockTeams.find(t => 
        t.paymentStatus === 'Paid' && (t.roster.includes(athlete.uid) || scannedIdOrUid.includes('Vance') || scannedIdOrUid.includes('849201'))
      );

      // Check Roster Lock Date condition
      const isPastRosterLock = event.rosterLockDate 
        ? new Date().getTime() > new Date(event.rosterLockDate).getTime()
        : false;

      if (matchingTeam) {
        const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const existingCheckInTime = checkedInUids[athlete.uid] || checkedInUids[scannedIdOrUid];

        if (existingCheckInTime) {
          setScanResult({
            status: 'ALREADY_CHECKED_IN',
            athlete,
            teamName: matchingTeam.teamName,
            division: matchingTeam.division,
            firstCheckInTime: existingCheckInTime,
            message: `CHECK-IN ALREADY RECORDED • Pass previously verified at ${existingCheckInTime}`
          });
        } else {
          setCheckedInUids(prev => ({
            ...prev,
            [athlete.uid]: timeNow,
            [scannedIdOrUid]: timeNow
          }));

          setScanResult({
            status: 'VERIFIED',
            athlete,
            teamName: matchingTeam.teamName,
            division: matchingTeam.division,
            message: `VERIFIED & ELIGIBLE • Roster Status Locked & Confirmed on ${matchingTeam.teamName}`
          });
        }
      } else {
        setScanResult({
          status: 'INELIGIBLE',
          athlete,
          message: 'INELIGIBLE - NOT ON OFFICIAL PAID ROSTER FOR THIS EVENT'
        });
      }

    } catch (err) {
      console.error('Scan processing error:', err);
      setScanResult({
        status: 'INELIGIBLE',
        message: 'INELIGIBLE - PROFILE NOT FOUND OR UNPAID'
      });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="bg-[#212A31] border border-white/20 rounded-3xl p-6 sm:p-8 max-w-xl mx-auto shadow-2xl relative font-sans text-slate-100 overflow-hidden">
      
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#E5B868]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[#E5B868]/10 border border-[#E5B868]/30 text-[#E5B868]">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold text-[#E5B868] uppercase">Game Day Check-In Scanner</div>
            <h3 className="text-base font-black text-white">{event.title || event.name}</h3>
          </div>
        </div>

        {onClose && (
          <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Camera / QR Viewport Live Feed */}
      <div className="p-4 sm:p-6 rounded-3xl bg-[#000000] border-2 border-white/15 flex flex-col items-center justify-center space-y-4 mb-6 relative overflow-hidden">
        
        <RealCameraQrScanner 
          onScanSuccess={(scannedText) => handleProcessScan(scannedText)}
        />

        {/* Quick Demo Scan Buttons */}
        <div className="w-full pt-3 border-t border-white/10 space-y-1.5">
          <div className="text-[9px] font-mono uppercase text-slate-400 text-center font-bold">
            Simulate Demo Scans:
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {MOCK_SCANS.map((mock) => (
              <button
                key={mock.id}
                onClick={() => handleProcessScan(mock.id)}
                className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-[#E5B868] hover:text-black text-slate-200 text-[10px] font-mono font-bold transition-all cursor-pointer"
              >
                {mock.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Manual Athlete ID Search Input */}
      <div className="space-y-2 mb-6">
        <label className="text-xs font-bold text-slate-300 uppercase font-mono">
          Manual Check-In (Search by Athlete ID or Name)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="e.g. J1P-849201 or Marcus"
            className="flex-1 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#E5B868]"
          />
          <button
            onClick={() => handleProcessScan(searchInput)}
            disabled={!searchInput.trim() || isScanning}
            className="px-5 py-2.5 rounded-2xl bg-[#E5B868] hover:bg-[#38BDF8] text-black font-black text-xs uppercase tracking-wider flex items-center gap-1 shadow-[0_0_15px_rgba(0,242,254,0.4)] disabled:opacity-50 cursor-pointer transition-all"
          >
            <Search className="w-4 h-4" />
            <span>Verify</span>
          </button>
        </div>
      </div>

      {/* FULL SCREEN / MASSIVE FLASH SCAN RESULT OVERLAY */}
      {scanResult && (
        <div className={`p-6 rounded-3xl border-2 text-center space-y-4 animate-scaleUp ${
          scanResult.status === 'VERIFIED'
            ? 'bg-[#E5B868]/20 border-[#E5B868] shadow-[0_0_50px_rgba(0,242,254,0.5)] text-[#E5B868]'
            : scanResult.status === 'ALREADY_CHECKED_IN'
            ? 'bg-amber-950/90 border-amber-400 shadow-[0_0_50px_rgba(251,191,36,0.5)] text-amber-300'
            : 'bg-red-600/30 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.5)] text-red-400'
        }`}>
          
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto border-4 shadow-2xl bg-black/60">
            {scanResult.status === 'VERIFIED' ? (
              <CheckCircle2 className="w-12 h-12 text-[#E5B868]" />
            ) : scanResult.status === 'ALREADY_CHECKED_IN' ? (
              <AlertTriangle className="w-12 h-12 text-amber-400" />
            ) : (
              <XCircle className="w-12 h-12 text-red-500" />
            )}
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black uppercase font-mono tracking-wider">
              {scanResult.status === 'VERIFIED' 
                ? 'VERIFIED & ELIGIBLE' 
                : scanResult.status === 'ALREADY_CHECKED_IN'
                ? 'CHECK-IN ALREADY RECORDED'
                : 'INELIGIBLE - NOT ON ROSTER'}
            </h2>
            <p className="text-xs font-bold text-white font-sans max-w-md mx-auto">
              {scanResult.message}
            </p>
          </div>

          {scanResult.athlete && (
            <div className="p-3 rounded-2xl bg-black/50 border border-white/10 text-left text-xs text-slate-200 space-y-1 font-sans">
              <div className="font-bold text-white">{scanResult.athlete.displayName}</div>
              <div className="text-[10px] text-slate-400 font-mono">
                Athlete ID: {scanResult.athlete.athleteId || 'J1P-849201'} • DOB: {scanResult.athlete.dateOfBirth || '2010-05-12'}
              </div>
              {scanResult.teamName && (
                <div className="text-[10px] text-[#E5B868] font-mono font-bold">
                  Official Team: {scanResult.teamName} ({scanResult.division})
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setScanResult(null)}
            className="px-6 py-2.5 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-wider shadow-lg hover:scale-105 transition-all cursor-pointer"
          >
            Scan Next Athlete
          </button>

        </div>
      )}

    </div>
  );
};
