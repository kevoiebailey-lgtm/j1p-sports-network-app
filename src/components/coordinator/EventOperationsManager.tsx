import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  Printer,
  Lock,
  Unlock,
  Search,
  Filter,
  DollarSign,
  Phone,
  Mail,
  ShieldCheck,
  ChevronDown,
  RefreshCw,
  Eye,
  X,
  FileCheck,
  Sliders,
  Sparkles,
  Download
} from 'lucide-react';
import { collection, query, where, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { TeamCheckInRecord, RegistrationFeeStatus, TeamRosterAthlete } from '../../types/operations';

export const EventOperationsManager: React.FC = () => {
  const { user, profile } = useAuth();
  const { showToast } = useToast();

  const isCoordinatorOrAdmin = 
    profile?.role === 'coordinator' || 
    profile?.role === 'director' || 
    profile?.role === 'admin' ||
    profile?.role === 'organization' ||
    user?.email === 'kevoiebailey@gmail.com';

  const [selectedEventId, setSelectedEventId] = useState<string>('evt-winter-7v7');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [divisionFilter, setDivisionFilter] = useState<string>('ALL');
  const [feeStatusFilter, setFeeStatusFilter] = useState<string>('ALL');
  const [checkInFilter, setCheckInFilter] = useState<string>('ALL');
  const [globalRosterLocked, setGlobalRosterLocked] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Roster inspection modal
  const [inspectedTeam, setInspectedTeam] = useState<TeamCheckInRecord | null>(null);

  // Sample tournament events
  const events = [
    { id: 'evt-winter-7v7', name: '2026 Winter National 7v7 Invitational', date: 'March 14-15, 2026', location: 'Charlotte Sportsplex, NC' },
    { id: 'evt-d1-showcase', name: 'Carolina D1 Spring Recruiting Showcase', date: 'April 4, 2026', location: 'Greensboro Coliseum Complex, NC' },
    { id: 'evt-tri-state', name: 'Tri-State High School Shootout', date: 'April 25, 2026', location: 'Atlanta Fieldhouse, GA' },
  ];

  // Initial Team Check-In state
  const [teams, setTeams] = useState<TeamCheckInRecord[]>([
    {
      teamId: 'team-1',
      eventId: 'evt-winter-7v7',
      eventName: '2026 Winter National 7v7 Invitational',
      teamName: 'Carolina Speed Elite',
      division: '18U Premier',
      headCoach: 'Marcus Davenport',
      coachEmail: 'coach.marcus@carolinaspeed.org',
      coachPhone: '(704) 555-0192',
      rosterCount: 14,
      feeStatus: 'PAID',
      amountPaid: 850,
      totalFee: 850,
      rosterLocked: false,
      checkedIn: true,
      checkedInAt: 'Today, 7:15 AM',
      checkedInBy: 'Field Gate 1',
      notes: 'Wristbands distributed. All medical clearances verified.',
      roster: [
        { id: 'ath-1', name: 'Jaden Reynolds', jerseyNumber: '1', position: 'QB', waiverSigned: true },
        { id: 'ath-2', name: 'Malik Turner', jerseyNumber: '7', position: 'WR', waiverSigned: true },
        { id: 'ath-3', name: 'Isaiah Vance', jerseyNumber: '3', position: 'CB', waiverSigned: true },
        { id: 'ath-4', name: 'Trey Henderson', jerseyNumber: '11', position: 'S', waiverSigned: true },
        { id: 'ath-5', name: 'Cameron Ward', jerseyNumber: '5', position: 'WR', waiverSigned: true },
        { id: 'ath-6', name: 'Devon Brooks', jerseyNumber: '21', position: 'LB', waiverSigned: true },
      ]
    },
    {
      teamId: 'team-2',
      eventId: 'evt-winter-7v7',
      eventName: '2026 Winter National 7v7 Invitational',
      teamName: 'Atlanta Hustle Select',
      division: '18U Premier',
      headCoach: 'Kendrick Washington',
      coachEmail: 'kwash@atlantahustle.com',
      coachPhone: '(404) 555-8831',
      rosterCount: 16,
      feeStatus: 'PAID',
      amountPaid: 850,
      totalFee: 850,
      rosterLocked: false,
      checkedIn: true,
      checkedInAt: 'Today, 7:40 AM',
      checkedInBy: 'Field Gate 2',
      notes: 'Verified roster matches state insurance declaration.',
      roster: [
        { id: 'ath-21', name: 'Xavier Cole', jerseyNumber: '2', position: 'QB', waiverSigned: true },
        { id: 'ath-22', name: 'Dante Smith', jerseyNumber: '8', position: 'WR', waiverSigned: true },
        { id: 'ath-23', name: 'Kobe Bryant Jr', jerseyNumber: '24', position: 'ATH', waiverSigned: true },
        { id: 'ath-24', name: 'Terrence Hall', jerseyNumber: '4', position: 'DB', waiverSigned: true },
      ]
    },
    {
      teamId: 'team-3',
      eventId: 'evt-winter-7v7',
      eventName: '2026 Winter National 7v7 Invitational',
      teamName: 'Virginia Prime 7v7',
      division: '15U Gold',
      headCoach: 'Derrick Robinson',
      coachEmail: 'drobinson@vaprimeteam.net',
      coachPhone: '(804) 555-4290',
      rosterCount: 12,
      feeStatus: 'PENDING',
      amountPaid: 0,
      totalFee: 850,
      rosterLocked: false,
      checkedIn: false,
      notes: 'Check-in on site pending check clearance from booster club.',
      roster: [
        { id: 'ath-31', name: 'Julian Hayes', jerseyNumber: '10', position: 'QB', waiverSigned: false },
        { id: 'ath-32', name: 'Christian Bell', jerseyNumber: '6', position: 'WR', waiverSigned: true },
        { id: 'ath-33', name: 'Zion Carter', jerseyNumber: '15', position: 'CB', waiverSigned: false },
      ]
    },
    {
      teamId: 'team-4',
      eventId: 'evt-winter-7v7',
      eventName: '2026 Winter National 7v7 Invitational',
      teamName: 'Charlotte Metro Stars',
      division: '15U Gold',
      headCoach: 'Anthony Green',
      coachEmail: 'anthony@metrostarsnc.org',
      coachPhone: '(704) 555-9114',
      rosterCount: 15,
      feeStatus: 'WAIVED',
      amountPaid: 0,
      totalFee: 850,
      rosterLocked: false,
      checkedIn: true,
      checkedInAt: 'Today, 8:05 AM',
      checkedInBy: 'Director Desk',
      notes: 'Host community scholarship waiver granted by Tournament Director.',
      roster: [
        { id: 'ath-41', name: 'Bryce Young', jerseyNumber: '9', position: 'QB', waiverSigned: true },
        { id: 'ath-42', name: 'Jaylen Harris', jerseyNumber: '13', position: 'WR', waiverSigned: true },
        { id: 'ath-43', name: 'Quinton Miller', jerseyNumber: '22', position: 'S', waiverSigned: true },
      ]
    },
    {
      teamId: 'team-5',
      eventId: 'evt-winter-7v7',
      eventName: '2026 Winter National 7v7 Invitational',
      teamName: 'Palmetto Top Flight',
      division: '12U Open',
      headCoach: 'Greg Sanders',
      coachEmail: 'greg@topflightsc.com',
      coachPhone: '(843) 555-7312',
      rosterCount: 13,
      feeStatus: 'PAID',
      amountPaid: 750,
      totalFee: 750,
      rosterLocked: false,
      checkedIn: false,
      notes: 'In transit from Columbia, estimated field arrival 8:45 AM.',
      roster: [
        { id: 'ath-51', name: 'Elijah Barnes', jerseyNumber: '3', position: 'ATH', waiverSigned: true },
        { id: 'ath-52', name: 'Mason White', jerseyNumber: '12', position: 'QB', waiverSigned: true },
      ]
    }
  ]);

  // Load live operations data from Firestore if present
  const loadOperationsData = async () => {
    setRefreshing(true);
    try {
      if (db) {
        const teamsRef = collection(db, 'event_teams');
        const q = query(teamsRef, where('eventId', '==', selectedEventId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const loaded: TeamCheckInRecord[] = [];
          snap.forEach(d => {
            loaded.push({ teamId: d.id, ...(d.data() as any) });
          });
          setTeams(loaded);
        }
      }
    } catch (e) {
      console.warn('Ops data load note:', e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOperationsData();
  }, [selectedEventId]);

  // Toggle single team check-in
  const handleToggleCheckIn = async (teamId: string) => {
    const updated = teams.map(t => {
      if (t.teamId === teamId) {
        const nextState = !t.checkedIn;
        return {
          ...t,
          checkedIn: nextState,
          checkedInAt: nextState ? `Today, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : undefined,
          checkedInBy: nextState ? (profile?.displayName || 'Coordinator Desk') : undefined
        };
      }
      return t;
    });

    setTeams(updated);

    const targetTeam = updated.find(t => t.teamId === teamId);
    if (targetTeam) {
      showToast('success', 'Check-In Updated', `${targetTeam.teamName} check-in marked: ${targetTeam.checkedIn ? 'CHECKED IN' : 'PENDING'}`);
      
      // Sync to Firestore
      if (db) {
        try {
          await setDoc(doc(db, 'event_teams', teamId), {
            ...targetTeam,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        } catch (_) {}
      }
    }
  };

  // Change registration fee status
  const handleChangeFeeStatus = async (teamId: string, nextStatus: RegistrationFeeStatus) => {
    const updated = teams.map(t => {
      if (t.teamId === teamId) {
        return {
          ...t,
          feeStatus: nextStatus,
          amountPaid: nextStatus === 'PAID' ? t.totalFee : (nextStatus === 'WAIVED' ? 0 : 0)
        };
      }
      return t;
    });

    setTeams(updated);
    showToast('success', 'Fee Status Updated', `Registration fee updated to ${nextStatus}`);

    if (db) {
      try {
        const teamDoc = updated.find(t => t.teamId === teamId);
        if (teamDoc) {
          await setDoc(doc(db, 'event_teams', teamId), {
            feeStatus: nextStatus,
            amountPaid: teamDoc.amountPaid,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        }
      } catch (_) {}
    }
  };

  // Toggle single team roster lock
  const handleToggleTeamRosterLock = async (teamId: string) => {
    const updated = teams.map(t => {
      if (t.teamId === teamId) {
        return { ...t, rosterLocked: !t.rosterLocked };
      }
      return t;
    });

    setTeams(updated);
    const targetTeam = updated.find(t => t.teamId === teamId);
    showToast('success', 'Roster Status Updated', `${targetTeam?.teamName} roster is now ${targetTeam?.rosterLocked ? 'LOCKED' : 'UNLOCKED'}`);

    if (db) {
      try {
        await updateDoc(doc(db, 'event_teams', teamId), {
          rosterLocked: targetTeam?.rosterLocked,
          updatedAt: new Date().toISOString()
        }).catch(() => {});
      } catch (_) {}
    }
  };

  // Toggle Global Roster Lock for entire tournament
  const handleToggleGlobalRosterLock = async () => {
    const nextGlobal = !globalRosterLocked;
    setGlobalRosterLocked(nextGlobal);

    const updated = teams.map(t => ({
      ...t,
      rosterLocked: nextGlobal
    }));

    setTeams(updated);
    showToast(
      nextGlobal ? 'success' : 'info',
      nextGlobal ? '🔒 Global Roster Lock Engaged' : '🔓 Global Roster Lock Released',
      nextGlobal 
        ? 'All tournament team rosters are locked against changes.' 
        : 'Coaches may make modifications.'
    );
  };

  // Toggle individual athlete waiver clearance
  const handleToggleWaiver = (athleteId: string) => {
    if (!inspectedTeam) return;

    const updatedRoster = (inspectedTeam.roster || []).map(ath => {
      if (ath.id === athleteId) {
        return { ...ath, waiverSigned: !ath.waiverSigned };
      }
      return ath;
    });

    const updatedTeam = { ...inspectedTeam, roster: updatedRoster };
    setInspectedTeam(updatedTeam);

    setTeams(prev => prev.map(t => t.teamId === updatedTeam.teamId ? updatedTeam : t));
    showToast('success', 'Waiver Updated', 'Athlete digital waiver compliance updated!');
  };

  // One-Click CSV Export for Game-Day Field Check-in Tables
  const handleExportCSV = () => {
    if (teams.length === 0) {
      showToast('error', 'Export Failed', 'No team records to export.');
      return;
    }

    const headers = [
      'Team Name',
      'Division',
      'Head Coach',
      'Coach Phone',
      'Coach Email',
      'Roster Size',
      'Registration Fee Status',
      'Amount Paid ($)',
      'Checked In Status',
      'Checked In At',
      'Roster Locked',
      'Field Notes'
    ];

    const rows = teams.map(t => [
      `"${t.teamName.replace(/"/g, '""')}"`,
      `"${t.division}"`,
      `"${t.headCoach}"`,
      `"${t.coachPhone}"`,
      `"${t.coachEmail}"`,
      t.rosterCount,
      t.feeStatus,
      t.amountPaid.toFixed(2),
      t.checkedIn ? 'CHECKED IN' : 'PENDING',
      `"${t.checkedInAt || 'N/A'}"`,
      t.rosterLocked ? 'LOCKED' : 'OPEN',
      `"${(t.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tournament_checkin_manifest_${selectedEventId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('success', 'Export Ready', 'Check-in CSV manifest downloaded!');
  };

  // One-Click Printable Field Check-In View
  const handlePrintManifest = () => {
    window.print();
  };

  // Filter teams
  const filteredTeams = teams.filter(t => {
    const matchesSearch = 
      t.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.headCoach.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.division.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDivision = divisionFilter === 'ALL' || t.division === divisionFilter;
    const matchesFee = feeStatusFilter === 'ALL' || t.feeStatus === feeStatusFilter;
    const matchesCheckIn = 
      checkInFilter === 'ALL' || 
      (checkInFilter === 'CHECKED_IN' && t.checkedIn) || 
      (checkInFilter === 'PENDING' && !t.checkedIn);

    return matchesSearch && matchesDivision && matchesFee && matchesCheckIn;
  });

  // Calculate live ops summaries
  const totalTeams = teams.length;
  const checkedInCount = teams.filter(t => t.checkedIn).length;
  const checkInPercent = totalTeams > 0 ? Math.round((checkedInCount / totalTeams) * 100) : 0;
  const totalExpectedRevenue = teams.reduce((sum, t) => sum + t.totalFee, 0);
  const totalCollectedRevenue = teams.reduce((sum, t) => sum + t.amountPaid, 0);
  const pendingFeeCount = teams.filter(t => t.feeStatus === 'PENDING').length;
  const rostersLockedCount = teams.filter(t => t.rosterLocked).length;

  if (!isCoordinatorOrAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6 sm:p-10 my-8 bg-[#111A26] border border-cyan-500/20 rounded-3xl text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
          Event Operations Desk Restricted
        </h2>
        <p className="text-slate-400 text-sm max-w-lg mx-auto">
          Tournament Check-In, Fee Management, and Roster Lock controls are reserved for Tournament Directors, Event Coordinators, and System Admins.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Header & Event Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-6 rounded-3xl bg-[#111A26] border border-white/10 shadow-2xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold uppercase tracking-wider">
            <Trophy className="w-3.5 h-3.5" />
            <span>Tournament Director & Event Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black italic uppercase text-white font-sans tracking-tight">
            EVENT OPERATIONS & <span className="text-cyan-400">CHECK-IN DESK</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Live team check-in verification, entry fee reconciliation, and deadline roster enforcement.
          </p>
        </div>

        {/* Action buttons & Event selector */}
        <div className="flex flex-wrap items-center gap-3">
          
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-xs font-bold text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            {events.map(ev => (
              <option key={ev.id} value={ev.id} className="bg-[#111A26]">
                {ev.name} ({ev.date})
              </option>
            ))}
          </select>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-mono font-bold uppercase text-white flex items-center gap-2 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Export Check-In CSV</span>
          </button>

          <button
            onClick={handlePrintManifest}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-mono font-bold uppercase text-white flex items-center gap-2 transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            <span>Print Field Sheet</span>
          </button>

          <button
            onClick={handleToggleGlobalRosterLock}
            className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase flex items-center gap-2 transition cursor-pointer ${
              globalRosterLocked
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                : 'bg-cyan-500 hover:bg-cyan-400 text-neutral-950 shadow-[0_0_15px_rgba(0,229,255,0.4)]'
            }`}
          >
            {globalRosterLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            <span>{globalRosterLocked ? 'Global Rosters Locked' : 'Engage Roster Lock'}</span>
          </button>

        </div>
      </div>

      {/* OPERATIONS METRICS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Teams Checked In */}
        <div className="p-5 rounded-3xl bg-[#111A26] border border-white/10 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase tracking-wider font-bold">Field Check-In</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-mono tracking-tight">
            {checkedInCount} / {totalTeams} <span className="text-xs font-sans text-cyan-400 font-normal">({checkInPercent}%)</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="bg-cyan-500 h-full rounded-full transition-all duration-500" style={{ width: `${checkInPercent}%` }} />
          </div>
        </div>

        {/* Fees Collected */}
        <div className="p-5 rounded-3xl bg-[#111A26] border border-white/10 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase tracking-wider font-bold">Fees Collected</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-400 font-mono tracking-tight">
            ${totalCollectedRevenue.toLocaleString()}
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            Expected: ${totalExpectedRevenue.toLocaleString()} Total Revenue
          </div>
        </div>

        {/* Pending Fee Balances */}
        <div className="p-5 rounded-3xl bg-[#111A26] border border-white/10 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase tracking-wider font-bold">Pending Balances</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-400 font-mono tracking-tight">
            {pendingFeeCount} Teams
          </div>
          <div className="text-[11px] font-mono text-amber-400/80">
            Require onsite cashier verification
          </div>
        </div>

        {/* Roster Lock Status */}
        <div className="p-5 rounded-3xl bg-[#111A26] border border-white/10 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase tracking-wider font-bold">Rosters Sealed</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-mono tracking-tight">
            {rostersLockedCount} / {totalTeams}
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            {globalRosterLocked ? 'Global tournament lock active' : 'Individual team locks'}
          </div>
        </div>

      </div>

      {/* ROSTER CHECKLIST & OPERATIONS TABLE */}
      <div className="rounded-3xl bg-[#111A26] border border-white/10 shadow-2xl overflow-hidden space-y-4 p-6">
        
        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search team, coach, or division..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Division Filter */}
            <select
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="ALL" className="bg-[#111A26]">All Divisions</option>
              <option value="18U Premier" className="bg-[#111A26]">18U Premier</option>
              <option value="15U Gold" className="bg-[#111A26]">15U Gold</option>
              <option value="12U Open" className="bg-[#111A26]">12U Open</option>
            </select>

            {/* Fee Status Filter */}
            <select
              value={feeStatusFilter}
              onChange={(e) => setFeeStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="ALL" className="bg-[#111A26]">All Fee Statuses</option>
              <option value="PAID" className="bg-[#111A26]">Paid</option>
              <option value="PENDING" className="bg-[#111A26]">Pending</option>
              <option value="WAIVED" className="bg-[#111A26]">Waived</option>
            </select>

            {/* Check-In Filter */}
            <select
              value={checkInFilter}
              onChange={(e) => setCheckInFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="ALL" className="bg-[#111A26]">All Check-In</option>
              <option value="CHECKED_IN" className="bg-[#111A26]">Checked In Only</option>
              <option value="PENDING" className="bg-[#111A26]">Pending Check-In</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
                <th className="py-3 px-4">Game-Day Check-In</th>
                <th className="py-3 px-4">Team & Head Coach</th>
                <th className="py-3 px-4">Division</th>
                <th className="py-3 px-4">Roster Roster & Waivers</th>
                <th className="py-3 px-4">Registration Fee Status</th>
                <th className="py-3 px-4">Roster Lock</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {filteredTeams.map((team) => (
                <tr key={team.teamId} className="hover:bg-white/[0.02] transition-colors">
                  
                  {/* Check-In Toggle */}
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleToggleCheckIn(team.teamId)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition flex items-center gap-2 cursor-pointer ${
                        team.checkedIn
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                          : 'bg-white/5 text-slate-400 border border-white/10 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <CheckCircle2 className={`w-4 h-4 ${team.checkedIn ? 'text-emerald-400' : 'text-slate-500'}`} />
                      <span>{team.checkedIn ? 'Checked In' : 'Mark In'}</span>
                    </button>
                    {team.checkedInAt && (
                      <div className="text-[10px] text-slate-500 font-mono mt-1">
                        {team.checkedInAt}
                      </div>
                    )}
                  </td>

                  {/* Team & Coach */}
                  <td className="py-3 px-4">
                    <div className="font-bold text-white font-sans text-sm">{team.teamName}</div>
                    <div className="text-slate-400 text-xs flex items-center gap-2 mt-0.5">
                      <span>Coach: {team.headCoach}</span>
                      <span className="text-slate-600">•</span>
                      <span className="font-mono text-[11px] text-cyan-400">{team.coachPhone}</span>
                    </div>
                  </td>

                  {/* Division */}
                  <td className="py-3 px-4">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-slate-800 border border-white/10 text-slate-300">
                      {team.division}
                    </span>
                  </td>

                  {/* Roster & Waivers button */}
                  <td className="py-3 px-4">
                    <button
                      onClick={() => setInspectedTeam(team)}
                      className="px-2.5 py-1 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-mono text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>{team.rosterCount} Athletes</span>
                      <Eye className="w-3 h-3 ml-1" />
                    </button>
                  </td>

                  {/* Fee Status Dropdown */}
                  <td className="py-3 px-4">
                    <select
                      value={team.feeStatus}
                      onChange={(e) => handleChangeFeeStatus(team.teamId, e.target.value as RegistrationFeeStatus)}
                      className={`px-3 py-1 rounded-xl text-[11px] font-mono font-bold uppercase border focus:outline-none cursor-pointer ${
                        team.feeStatus === 'PAID'
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                          : team.feeStatus === 'PENDING'
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                          : 'bg-purple-500/15 border-purple-500/40 text-purple-300'
                      }`}
                    >
                      <option value="PAID" className="bg-[#111A26]">Paid (${team.totalFee})</option>
                      <option value="PENDING" className="bg-[#111A26]">Pending</option>
                      <option value="WAIVED" className="bg-[#111A26]">Waived / Scholarship</option>
                    </select>
                  </td>

                  {/* Roster Lock Toggle */}
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleToggleTeamRosterLock(team.teamId)}
                      className={`p-1.5 rounded-xl border transition cursor-pointer ${
                        team.rosterLocked
                          ? 'bg-red-500/20 border-red-500/40 text-red-400'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                      }`}
                      title={team.rosterLocked ? 'Roster is Locked' : 'Roster is Unlocked'}
                    >
                      {team.rosterLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setInspectedTeam(team)}
                      className="text-xs font-mono text-slate-400 hover:text-cyan-400 transition cursor-pointer"
                    >
                      Inspect
                    </button>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* TEAM ROSTER INSPECTION MODAL */}
      {inspectedTeam && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setInspectedTeam(null)}
        >
          <div
            className="w-full max-w-2xl bg-[#111A26] border border-cyan-500/40 rounded-3xl shadow-2xl p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <div className="text-xs font-mono uppercase text-cyan-400 font-bold">
                  {inspectedTeam.division} • Team Roster
                </div>
                <h3 className="text-xl font-black text-white">{inspectedTeam.teamName}</h3>
                <div className="text-xs text-slate-400">Head Coach: {inspectedTeam.headCoach} ({inspectedTeam.coachPhone})</div>
              </div>
              <button
                onClick={() => setInspectedTeam(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
                <span>ATHLETE ROSTER ({inspectedTeam.roster?.length || 0} PLAYERS)</span>
                <span>LIABILITY & MEDICAL WAIVER</span>
              </div>

              <div className="divide-y divide-white/5 max-h-80 overflow-y-auto pr-1">
                {(inspectedTeam.roster || []).map((ath) => (
                  <div key={ath.id} className="py-2.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-slate-800 text-cyan-400 font-mono font-bold text-xs flex items-center justify-center">
                        #{ath.jerseyNumber}
                      </span>
                      <div>
                        <div className="font-bold text-white text-xs">{ath.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{ath.position}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleWaiver(ath.id)}
                      className={`px-3 py-1 rounded-xl text-[11px] font-mono font-bold uppercase transition flex items-center gap-1.5 cursor-pointer ${
                        ath.waiverSigned
                          ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                          : 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                      }`}
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>{ath.waiverSigned ? 'Waiver Cleared' : 'Needs Waiver'}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/10 text-xs font-mono text-slate-400">
              <span>{inspectedTeam.notes || 'No special notes recorded.'}</span>
              <button
                onClick={() => setInspectedTeam(null)}
                className="px-5 py-2 rounded-xl bg-cyan-500 text-neutral-950 font-bold uppercase tracking-wider text-xs cursor-pointer hover:bg-cyan-400 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
