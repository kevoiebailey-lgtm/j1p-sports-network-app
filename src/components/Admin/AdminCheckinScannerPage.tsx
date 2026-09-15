import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  query, 
  limit, 
  orderBy, 
  onSnapshot,
  getDocs,
  where
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { 
  QrCode, 
  Scan, 
  Camera, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Users, 
  Clock, 
  ShieldCheck, 
  MapPin, 
  Ticket, 
  FileSpreadsheet, 
  RefreshCw, 
  UserCheck, 
  X, 
  Sparkles,
  Zap,
  ArrowRight,
  Filter,
  Check,
  AlertCircle
} from 'lucide-react';
import { VerifiedBadge } from '../Common/VerifiedBadge';

export interface CheckinRecord {
  id?: string;
  eventId: string;
  eventName: string;
  passId: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeeRole: 'athlete' | 'coach' | 'scout' | 'vip' | 'spectator' | 'media';
  teamName?: string;
  bibNumber?: string;
  scannedBy: string;
  scannedAt: string;
  gateLocation: string;
  status: 'VERIFIED' | 'DUPLICATE_WARNING' | 'FLAGGED' | 'MANUAL_OVERRIDE';
}

const SAMPLE_EVENTS = [
  { id: 'evt-1', title: 'Tri-State Elite High School Showcase', sport: 'Basketball', location: 'Rutgers Athletic Center' },
  { id: 'evt-2', title: 'National Flag Football Summer Championship', sport: 'Flag Football', location: 'MetLife Stadium Facility' },
  { id: 'evt-3', title: 'NCAA Division 1 Mid-Atlantic Combine', sport: 'Multi-Sport', location: 'Princeton Athletics Complex' },
];

const PRESET_ATTENDEES = [
  { passId: 'PASS-8921', name: 'Marcus Vance', email: 'marcus.v@njplaymakers.org', role: 'athlete', team: 'NJ Playmakers 17U', bib: '101' },
  { passId: 'PASS-4412', name: 'Coach David Smith', email: 'dsmith@nyrens.com', role: 'coach', team: 'NY Rens Select', bib: 'COACH-04' },
  { passId: 'PASS-9934', name: 'Sarah Jenkins', email: 'sjenkins@recruiting.org', role: 'scout', team: 'D1 Scouting Bureau', bib: 'SCOUT-12' },
  { passId: 'PASS-1209', name: 'Alex Rivera', email: 'arivera@metrostars.net', role: 'athlete', team: 'Metro Stars Flag 18U', bib: '204' },
  { passId: 'PASS-7731', name: 'Kevoie Bailey', email: 'kevoiebailey@gmail.com', role: 'vip', team: 'Just1Play Exec Staff', bib: 'VIP-01' },
  { passId: 'PASS-3310', name: 'Jordan Hayes', email: 'jhayes@phillyhoops.org', role: 'athlete', team: 'Philly Pride AAU', bib: '115' },
];

export const AdminCheckinScannerPage: React.FC = () => {
  const { profile } = useAuth();

  const [selectedEventId, setSelectedEventId] = useState<string>(SAMPLE_EVENTS[0].id);
  const [selectedGate, setSelectedGate] = useState<string>('Main Gate North (Athletes & Staff)');
  const [manualInput, setManualInput] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
  const [isScanningActive, setIsScanningActive] = useState<boolean>(true);
  const [recentScans, setRecentScans] = useState<CheckinRecord[]>([]);
  const [lastScanResult, setLastScanResult] = useState<CheckinRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'warn' | 'error'; title: string; text: string } | null>(null);

  const currentEvent = SAMPLE_EVENTS.find(e => e.id === selectedEventId) || SAMPLE_EVENTS[0];

  const showToast = (type: 'success' | 'warn' | 'error', title: string, text: string) => {
    setToastMessage({ type, title, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Real-time Firestore sync for check-ins
  useEffect(() => {
    if (!db) return;

    try {
      const q = query(
        collection(db, 'checkins'),
        limit(50)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list: CheckinRecord[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as CheckinRecord);
        });
        if (list.length > 0) {
          // Sort newest first
          list.sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime());
          setRecentScans(list);
        }
      }, (error) => {
        console.warn('Checkins snapshot listener warning:', error);
      });

      return () => unsubscribe();
    } catch (err) {
      console.warn('Failed to attach check-in listener:', err);
    }
  }, []);

  // Process a pass or attendee scan
  const handleProcessScan = async (rawCode: string) => {
    if (!rawCode.trim()) return;

    const trimmed = rawCode.trim();
    const existingScan = recentScans.find(
      s => (s.passId.toLowerCase() === trimmed.toLowerCase() || s.bibNumber === trimmed) && s.eventId === selectedEventId
    );

    // Check against preset attendees or construct new record
    const match = PRESET_ATTENDEES.find(
      a => a.passId.toLowerCase() === trimmed.toLowerCase() || a.bib === trimmed || a.name.toLowerCase().includes(trimmed.toLowerCase())
    );

    const isDuplicate = !!existingScan;

    const newRecord: CheckinRecord = {
      eventId: selectedEventId,
      eventName: currentEvent.title,
      passId: match ? match.passId : (trimmed.startsWith('PASS-') ? trimmed : `PASS-${Math.floor(1000 + Math.random() * 9000)}`),
      attendeeName: match ? match.name : (trimmed.startsWith('PASS-') ? 'Registered Attendee' : trimmed),
      attendeeEmail: match ? match.email : 'scanned.guest@just1play.com',
      attendeeRole: (match?.role as any) || 'spectator',
      teamName: match?.team || 'General Admission',
      bibNumber: match?.bib || (trimmed.startsWith('10') ? trimmed : undefined),
      scannedBy: profile?.displayName || 'Super Admin',
      scannedAt: new Date().toISOString(),
      gateLocation: selectedGate,
      status: isDuplicate ? 'DUPLICATE_WARNING' : 'VERIFIED'
    };

    setLastScanResult(newRecord);

    if (isDuplicate) {
      showToast('warn', 'DUPLICATE PASS DETECTED', `${newRecord.attendeeName} (${newRecord.passId}) was ALREADY checked in today!`);
    } else {
      showToast('success', 'ACCESS GRANTED', `${newRecord.attendeeName} verified for ${currentEvent.title}`);
    }

    // Persist to Firestore
    if (db) {
      try {
        await addDoc(collection(db, 'checkins'), newRecord);
      } catch (e) {
        console.warn('Local state updated, Firestore checkin log error:', e);
      }
    }

    setRecentScans(prev => [newRecord, ...prev]);
    setManualInput('');
  };

  // Export Check-in ledger as CSV
  const handleExportCSV = () => {
    if (recentScans.length === 0) {
      showToast('error', 'Export Failed', 'No scan logs available to export.');
      return;
    }

    const headers = ['Event ID', 'Event Name', 'Pass ID', 'Name', 'Email', 'Role', 'Team', 'Bib', 'Gate', 'Status', 'Timestamp', 'Scanned By'];
    const rows = recentScans.map(s => [
      `"${s.eventId}"`,
      `"${s.eventName}"`,
      `"${s.passId}"`,
      `"${s.attendeeName}"`,
      `"${s.attendeeEmail}"`,
      `"${s.attendeeRole}"`,
      `"${s.teamName || ''}"`,
      `"${s.bibNumber || ''}"`,
      `"${s.gateLocation}"`,
      `"${s.status}"`,
      `"${s.scannedAt}"`,
      `"${s.scannedBy}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Just1Play_Checkin_Audit_${selectedEventId}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('success', 'CSV Exported', `Downloaded ${recentScans.length} check-in audit records.`);
  };

  const filteredScans = recentScans.filter(s => {
    const matchesSearch = 
      s.attendeeName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.passId.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (s.teamName && s.teamName.toLowerCase().includes(searchFilter.toLowerCase())) ||
      (s.bibNumber && s.bibNumber.includes(searchFilter));

    const matchesRole = roleFilter === 'all' || s.attendeeRole === roleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className={`fixed top-24 right-6 z-50 p-4 rounded-2xl border backdrop-blur-2xl shadow-2xl flex items-center gap-3 max-w-md animate-bounceIn ${
          toastMessage.type === 'success' 
            ? 'bg-black/90 border-[#00F2FE] text-white shadow-[0_0_30px_rgba(0,242,254,0.3)]' 
            : toastMessage.type === 'warn'
            ? 'bg-amber-950/90 border-amber-500 text-white shadow-[0_0_30px_rgba(245,158,11,0.3)]'
            : 'bg-rose-950/90 border-rose-500 text-white shadow-[0_0_30px_rgba(244,63,94,0.3)]'
        }`}>
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-[#00F2FE] shrink-0" />
          ) : toastMessage.type === 'warn' ? (
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <div>
            <div className="text-xs font-black uppercase tracking-wider">{toastMessage.title}</div>
            <div className="text-[11px] text-slate-300 font-sans">{toastMessage.text}</div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-[#212A31]/90 border border-white/10 backdrop-blur-2xl">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00F2FE]/10 border border-[#00F2FE]/30 text-[#00F2FE] text-xs font-mono font-bold uppercase tracking-widest mb-2">
            <QrCode className="w-3.5 h-3.5" />
            <span>Event Entry & Attendance Telemetry</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black italic uppercase text-white font-sans tracking-tight">
            CHECK-IN & <span className="text-[#00F2FE]">SCANNER COMMAND</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time QR barcode verification, bib assignments, roster credentials, and gate entry audit logging.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#00F2FE]" />
            <span>Export Attendance CSV</span>
          </button>
        </div>
      </div>

      {/* Event & Gate Selector Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 rounded-2xl bg-[#212A31]/90 border border-white/10">
        <div>
          <label className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-1.5">
            1. Active Tournament / Event
          </label>
          <select
            value={selectedEventId}
            onChange={e => setSelectedEventId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white font-bold uppercase focus:outline-none focus:border-[#00F2FE] cursor-pointer"
          >
            {SAMPLE_EVENTS.map(ev => (
              <option key={ev.id} value={ev.id} className="bg-[#212A31]">
                {ev.title} ({ev.sport})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-1.5">
            2. Gate / Scanner Checkpoint
          </label>
          <select
            value={selectedGate}
            onChange={e => setSelectedGate(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white font-bold uppercase focus:outline-none focus:border-[#00F2FE] cursor-pointer"
          >
            <option value="Main Gate North (Athletes & Staff)" className="bg-[#212A31]">Main Gate North (Athletes & Staff)</option>
            <option value="Court 1 Baseline Entrance" className="bg-[#212A31]">Court 1 Baseline Entrance</option>
            <option value="VIP & Scout Hospitality Checkpoint" className="bg-[#212A31]">VIP & Scout Hospitality Checkpoint</option>
            <option value="General Admission Ticket Gate" className="bg-[#212A31]">General Admission Ticket Gate</option>
            <option value="Media & Broadcast Desk" className="bg-[#212A31]">Media & Broadcast Desk</option>
          </select>
        </div>
      </div>

      {/* Main Scanner Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Col: Optical Scanner HUD & Fast-Input */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Scanner Viewfinder Box */}
          <div className="relative rounded-3xl bg-black border-2 border-[#00F2FE]/40 overflow-hidden p-6 shadow-[0_0_30px_rgba(0,242,254,0.15)] flex flex-col items-center justify-between min-h-[360px]">
            
            {/* Viewfinder Corner Overlays */}
            <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-[#00F2FE]"></div>
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-[#00F2FE]"></div>
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-[#00F2FE]"></div>
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-[#00F2FE]"></div>

            {/* Scanning Laser Animation Line */}
            <div className="absolute inset-x-8 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-[#00F2FE] to-transparent animate-pulse shadow-[0_0_15px_#00F2FE]"></div>

            {/* HUD Status Header */}
            <div className="w-full flex items-center justify-between z-10">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#00F2FE]/20 text-[#00F2FE] text-[10px] font-mono font-bold uppercase">
                <span className="w-2 h-2 rounded-full bg-[#00F2FE] animate-ping"></span>
                <span>SCANNER READY</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">1080p HUD</span>
            </div>

            {/* Center Target Target */}
            <div className="my-8 flex flex-col items-center text-center space-y-3 z-10">
              <div className="p-4 rounded-3xl bg-[#00F2FE]/10 border border-[#00F2FE]/30 text-[#00F2FE] shadow-[0_0_20px_rgba(0,242,254,0.3)]">
                <QrCode className="w-12 h-12 animate-pulse" />
              </div>
              <div>
                <div className="text-sm font-black uppercase text-white font-sans tracking-wide">
                  ALIGN QR CODE OR BADGE
                </div>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Point device camera at athlete or spectator pass
                </p>
              </div>
            </div>

            {/* Quick Demo Simulator Bar */}
            <div className="w-full space-y-2 z-10">
              <div className="text-[10px] font-mono font-bold uppercase text-slate-400 text-center">
                Instant Quick-Scan Presets:
              </div>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_ATTENDEES.slice(0, 4).map((p) => (
                  <button
                    key={p.passId}
                    onClick={() => handleProcessScan(p.passId)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-[#00F2FE]/20 border border-white/10 hover:border-[#00F2FE]/40 text-left transition-all cursor-pointer group"
                  >
                    <div className="text-[11px] font-bold text-white group-hover:text-[#00F2FE] truncate">
                      {p.name}
                    </div>
                    <div className="text-[9px] font-mono text-slate-400 uppercase">
                      {p.passId} • {p.role}
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Manual Input Form */}
          <div className="p-4 rounded-2xl bg-[#212A31]/90 border border-white/10 space-y-3">
            <label className="text-[11px] font-bold uppercase text-slate-300 font-mono block">
              Manual Pass / Bib Number / Name Lookup
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleProcessScan(manualInput);
                  }
                }}
                placeholder="Enter Pass ID (PASS-8921), Bib #, or athlete name..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00F2FE]"
              />
              <button
                onClick={() => handleProcessScan(manualInput)}
                className="px-4 py-2.5 rounded-xl bg-[#00F2FE] hover:bg-[#00F2FE]/90 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer shadow-[0_0_15px_rgba(0,242,254,0.3)] transition-all shrink-0"
              >
                Verify
              </button>
            </div>
          </div>

          {/* Last Scanned Attendee Card */}
          {lastScanResult && (
            <div className={`p-4 rounded-2xl border transition-all ${
              lastScanResult.status === 'VERIFIED'
                ? 'bg-[#00F2FE]/10 border-[#00F2FE]/40 shadow-[0_0_20px_rgba(0,242,254,0.15)]'
                : 'bg-amber-500/10 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400">LAST SCANNED RECORD</span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase border ${
                  lastScanResult.status === 'VERIFIED' ? 'bg-[#00F2FE]/20 text-[#00F2FE] border-[#00F2FE]/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {lastScanResult.status}
                </span>
              </div>
              <div className="text-sm font-black text-white">{lastScanResult.attendeeName}</div>
              <div className="text-xs text-slate-300 font-mono mt-0.5">{lastScanResult.teamName || 'General Access'}</div>
              <div className="text-[10px] text-slate-400 font-mono mt-1">
                Pass: {lastScanResult.passId} • Scanned at {new Date(lastScanResult.scannedAt).toLocaleTimeString()}
              </div>
            </div>
          )}

        </div>

        {/* Right Col: Live Check-in Audit Ledger & Search */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Filter Bar */}
          <div className="p-4 rounded-2xl bg-[#212A31]/90 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search ledger by name or pass..."
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00F2FE]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 font-bold uppercase focus:outline-none focus:border-[#00F2FE] cursor-pointer"
              >
                <option value="all" className="bg-[#212A31]">All Roles</option>
                <option value="athlete" className="bg-[#212A31]">Athletes</option>
                <option value="coach" className="bg-[#212A31]">Coaches</option>
                <option value="scout" className="bg-[#212A31]">Scouts</option>
                <option value="vip" className="bg-[#212A31]">VIP</option>
                <option value="spectator" className="bg-[#212A31]">Spectators</option>
              </select>
            </div>
          </div>

          {/* Audit Ledger Table */}
          <div className="rounded-3xl bg-[#212A31]/90 border border-white/10 overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-white font-sans">
                <Users className="w-4 h-4 text-[#00F2FE]" />
                <span>Live Event Check-in Ledger ({filteredScans.length})</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Synced to Firestore /checkins</span>
            </div>

            {filteredScans.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-mono text-xs">
                No check-in scan records yet. Scan a pass code or click a quick-scan preset.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5 text-[10px] font-mono font-bold uppercase text-slate-400">
                      <th className="py-3 px-4">Attendee</th>
                      <th className="py-3 px-4">Pass ID / Bib</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Gate</th>
                      <th className="py-3 px-4">Time</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredScans.map((s, idx) => (
                      <tr key={s.id || idx} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{s.attendeeName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{s.teamName || 'Individual'}</div>
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-300">
                          <div>{s.passId}</div>
                          {s.bibNumber && <div className="text-[9px] text-[#00F2FE]">Bib #{s.bibNumber}</div>}
                        </td>

                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase border ${
                            s.attendeeRole === 'vip' 
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' 
                              : s.attendeeRole === 'scout'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : s.attendeeRole === 'coach'
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          }`}>
                            {s.attendeeRole}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-400 text-[10px]">
                          {s.gateLocation.split('(')[0]}
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-400 text-[10px]">
                          {new Date(s.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>

                        <td className="py-3 px-4 text-right">
                          {s.status === 'VERIFIED' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-[#00F2FE]">
                              <Check className="w-3 h-3" />
                              VERIFIED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-amber-400">
                              <AlertTriangle className="w-3 h-3" />
                              DUPLICATE
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
};
