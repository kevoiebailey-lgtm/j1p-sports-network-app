import React, { useState, useMemo } from 'react';
import { AthleteCheckIn } from '../../types';
import { BentoCard } from '../BentoCard';
import { useAuth } from '../../context/AuthContext';
import { QrCheckInScannerModal } from './QrCheckInScannerModal';
import { QrCodeDisplay } from '../Common/QrCodeDisplay';
import { motion } from 'motion/react';
import { 
  CheckCircle2, 
  Clock, 
  UserCheck, 
  Search, 
  Radio, 
  Zap, 
  QrCode,
  LayoutGrid,
  Table as TableIcon,
  ArrowUpDown,
  Download,
  CheckSquare,
  Square,
  SlidersHorizontal,
  MapPin,
  X,
  Filter,
  User,
  ShieldCheck
} from 'lucide-react';

interface CheckInsTabProps {
  checkIns: AthleteCheckIn[];
  onToggleCheckIn: (checkInId: string, currentStatus: 'Checked In' | 'Pending') => void;
  canManage: boolean;
}

type SortField = 'name' | 'team' | 'court' | 'status' | 'time';
type SortDirection = 'asc' | 'desc';

export const CheckInsTab: React.FC<CheckInsTabProps> = ({
  checkIns,
  onToggleCheckIn,
  canManage
}) => {
  const { user, profile, role } = useAuth();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [courtFilter, setCourtFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>('status');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Modal & Selection state
  const [qrModalItem, setQrModalItem] = useState<AthleteCheckIn | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const checkedInCount = checkIns.filter(c => c.status === 'Checked In').length;
  const pendingCount = checkIns.filter(c => c.status === 'Pending').length;
  const totalCount = checkIns.length;
  const attendanceRate = totalCount > 0 ? Math.round((checkedInCount / totalCount) * 100) : 0;

  // Extract unique courts/fields for filtering
  const availableCourts = useMemo(() => {
    const courts = new Set<string>();
    checkIns.forEach(c => {
      if (c.courtField) courts.add(c.courtField);
    });
    return Array.from(courts).sort();
  }, [checkIns]);

  // Filter and sort check-ins
  const filteredAndSortedCheckIns = useMemo(() => {
    let result = checkIns.filter(c => {
      if (statusFilter === 'Checked In' && c.status !== 'Checked In') return false;
      if (statusFilter === 'Pending' && c.status !== 'Pending') return false;
      if (courtFilter !== 'All' && c.courtField !== courtFilter) return false;
      
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const text = `${c.athleteName} ${c.teamName} ${c.tournamentName} ${c.courtField} ${c.sport} ${c.id}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });

    return result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') {
        cmp = a.athleteName.localeCompare(b.athleteName);
      } else if (sortField === 'team') {
        cmp = a.teamName.localeCompare(b.teamName);
      } else if (sortField === 'court') {
        cmp = (a.courtField || '').localeCompare(b.courtField || '');
      } else if (sortField === 'status') {
        // 'Checked In' before 'Pending' if desc
        cmp = a.status.localeCompare(b.status);
      } else if (sortField === 'time') {
        const timeA = a.checkInTime ? new Date(a.checkInTime).getTime() : 0;
        const timeB = b.checkInTime ? new Date(b.checkInTime).getTime() : 0;
        cmp = timeA - timeB;
      }

      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [checkIns, searchQuery, statusFilter, courtFilter, sortField, sortDirection]);

  // Toggle sort direction
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Checkbox selection handlers
  const handleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedCheckIns.length && filteredAndSortedCheckIns.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedCheckIns.map(item => item.id)));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Bulk status update
  const handleBulkSetStatus = (targetStatus: 'Checked In' | 'Pending') => {
    selectedIds.forEach(id => {
      const item = checkIns.find(c => c.id === id);
      if (item && item.status !== targetStatus) {
        onToggleCheckIn(id, item.status);
      }
    });
    setSelectedIds(new Set());
  };

  // Export Manifest to CSV
  const handleExportCsv = () => {
    const listToExport = selectedIds.size > 0 
      ? checkIns.filter(c => selectedIds.has(c.id))
      : filteredAndSortedCheckIns;

    const headers = ['Athlete ID', 'Athlete Name', 'Team Name', 'Sport', 'Court / Field', 'Check-In Status', 'Check-In Time'];
    const rows = listToExport.map(c => [
      `"${c.id}"`,
      `"${c.athleteName}"`,
      `"${c.teamName}"`,
      `"${c.sport}"`,
      `"${c.courtField || 'Court A'}"`,
      `"${c.status}"`,
      `"${c.checkInTime ? new Date(c.checkInTime).toLocaleString() : 'N/A'}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Attendee_CheckIn_Manifest_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isAthlete = role === 'athlete';

  return (
    <div className="space-y-6">
      {/* Check-In Header Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <BentoCard glow className="bg-[#E5B868]/10 border-[#E5B868]/40 p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-[#E5B868] tracking-wider block">
              CHECKED-IN ATHLETES
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-white font-mono">
                {checkedInCount}
              </span>
              <span className="text-xs font-mono text-slate-400">/ {totalCount}</span>
            </div>
          </div>
          <div className="p-3 bg-[#E5B868] text-black rounded-2xl shadow-[0_0_15px_rgba(0,242,254,0.5)]">
            <UserCheck className="w-6 h-6 stroke-[2.5]" />
          </div>
        </BentoCard>

        <BentoCard className="bg-white/5 border-white/10 p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
              PENDING ARRIVALS
            </span>
            <span className="text-3xl font-black text-white font-mono mt-1 block">
              {pendingCount}
            </span>
          </div>
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
            <Clock className="w-6 h-6 stroke-[2.5]" />
          </div>
        </BentoCard>

        <BentoCard className="bg-white/5 border-white/10 p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-300 tracking-wider block">
              GATE ATTENDANCE RATE
            </span>
            <span className="text-3xl font-black text-white font-mono mt-1 block">
              {attendanceRate}%
            </span>
            <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-slate-600 h-full transition-all duration-500"
                style={{ width: `${attendanceRate}%` }}
              />
            </div>
          </div>
          <div className="p-3 bg-slate-600/20 text-slate-300 rounded-2xl border border-cyan-400/30">
            <Zap className="w-6 h-6 stroke-[2.5]" />
          </div>
        </BentoCard>

        <BentoCard className="bg-white/5 border-white/10 p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
              TELEMETRY LOG
            </span>
            <span className="text-xs font-bold text-slate-300 mt-1 block flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-[#E5B868] animate-pulse" />
              Live Firestore Sync
            </span>
            <span className="text-[10px] font-mono text-slate-500 block mt-1">
              Auto-saved QR verifications
            </span>
          </div>
          <div className="p-3 bg-white/5 text-slate-300 rounded-2xl border border-white/10">
            <ShieldCheck className="w-6 h-6 stroke-[2]" />
          </div>
        </BentoCard>
      </div>

      {/* Filter, Search & View Controls Bar */}
      <div className="bg-white/[0.03] p-4 rounded-3xl border border-white/10 backdrop-blur-2xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search roster by athlete name, team, court, sport, or ID..."
              className="w-full pl-10 pr-10 py-2.5 bg-[#121212] border border-white/15 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#E5B868] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Action & View Mode Controls */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {canManage && (
              <button
                onClick={() => setIsScannerOpen(true)}
                className="px-4 py-2.5 bg-[#E5B868] hover:bg-[#38BDF8] text-black font-black text-xs uppercase tracking-wider rounded-2xl shadow-[0_0_15px_rgba(0,242,254,0.5)] transition-all flex items-center gap-2 cursor-pointer shrink-0"
              >
                <QrCode className="w-4 h-4 stroke-[2.5]" />
                <span>SCAN ATHLETE QR PASS</span>
              </button>
            )}

            {/* View Mode Toggle Switcher */}
            <div className="flex items-center bg-[#121212] p-1 rounded-2xl border border-white/10 shrink-0">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-[#E5B868] text-black shadow-[0_0_10px_rgba(0,242,254,0.4)]'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Organizer High-Density Table View"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-[#E5B868] text-black shadow-[0_0_10px_rgba(0,242,254,0.4)]'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Bento Grid Cards View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Grid</span>
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1 font-mono">
              <Filter className="w-3 h-3 text-[#E5B868]" /> STATUS:
            </span>
            {['All', 'Checked In', 'Pending'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap border cursor-pointer ${
                  statusFilter === st
                    ? 'bg-[#E5B868] text-black border-[#E5B868] shadow-[0_0_12px_rgba(0,242,254,0.4)]'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                }`}
              >
                {st === 'All' ? 'ALL STATUS' : st.toUpperCase()}
              </button>
            ))}

            {/* Court / Location Filter Dropdown */}
            {availableCourts.length > 0 && (
              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-[10px] font-black uppercase text-slate-400 font-mono">LOCATION:</span>
                <select
                  value={courtFilter}
                  onChange={(e) => setCourtFilter(e.target.value)}
                  className="bg-[#121212] border border-white/15 rounded-xl px-2.5 py-1 text-xs text-white focus:border-[#E5B868] focus:outline-none"
                >
                  <option value="All">All Courts / Fields</option>
                  {availableCourts.map(crt => (
                    <option key={crt} value={crt}>{crt}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Export & Selection Summary */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/15 text-slate-300 hover:text-[#E5B868] rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
              title="Download attendee check-in manifest as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>EXPORT MANIFEST</span>
            </button>
          </div>
        </div>
      </div>

      {/* Organizer Bulk Actions Bar (When items are selected) */}
      {canManage && selectedIds.size > 0 && (
        <div className="p-3 bg-[#E5B868]/10 border border-[#E5B868]/40 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs animate-fadeIn">
          <div className="flex items-center gap-2 font-mono text-white font-bold">
            <CheckSquare className="w-4 h-4 text-[#E5B868]" />
            <span>{selectedIds.size} ATTENDEE(S) SELECTED</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkSetStatus('Checked In')}
              className="px-3 py-1.5 bg-[#E5B868] hover:bg-[#38BDF8] text-black font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
            >
              MARK CHECKED IN
            </button>
            <button
              onClick={() => handleBulkSetStatus('Pending')}
              className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
            >
              MARK PENDING
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-2.5 py-1.5 bg-white/10 text-slate-300 hover:text-white rounded-xl text-xs font-bold uppercase transition-all cursor-pointer"
            >
              CLEAR
            </button>
          </div>
        </div>
      )}

      {/* VIEW MODE 1: ORGANIZER COMPACT HIGH-DENSITY TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/10 text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
                  {canManage && (
                    <th className="p-3.5 w-10 text-center">
                      <button
                        onClick={handleSelectAll}
                        className="text-slate-400 hover:text-[#E5B868] transition-colors cursor-pointer"
                        title="Select All Filtered Attendees"
                      >
                        {selectedIds.size > 0 && selectedIds.size === filteredAndSortedCheckIns.length ? (
                          <CheckSquare className="w-4 h-4 text-[#E5B868]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                  )}
                  <th 
                    onClick={() => handleSort('name')}
                    className="p-3.5 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>ATHLETE / PARTICIPANT</span>
                      <ArrowUpDown className="w-3 h-3 text-[#E5B868]" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('team')}
                    className="p-3.5 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>TEAM & SPORT</span>
                      <ArrowUpDown className="w-3 h-3 text-[#E5B868]" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('court')}
                    className="p-3.5 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>COURT / LOCATION</span>
                      <ArrowUpDown className="w-3 h-3 text-[#E5B868]" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('status')}
                    className="p-3.5 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>CHECK-IN STATUS</span>
                      <ArrowUpDown className="w-3 h-3 text-[#E5B868]" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('time')}
                    className="p-3.5 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>GATE TIME LOG</span>
                      <ArrowUpDown className="w-3 h-3 text-[#E5B868]" />
                    </div>
                  </th>
                  <th className="p-3.5 text-right">ORGANIZER ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-xs">
                {filteredAndSortedCheckIns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-500 font-mono">
                      No check-in records matched your active filter or search query.
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedCheckIns.map((item) => {
                    const isCheckedIn = item.status === 'Checked In';
                    const isSelected = selectedIds.has(item.id);
                    const isCurrentUser = user?.uid === item.athleteUid || profile?.displayName === item.athleteName;

                    return (
                      <tr 
                        key={item.id}
                        className={`hover:bg-white/[0.04] transition-colors ${
                          isSelected ? 'bg-[#E5B868]/[0.05]' : ''
                        }`}
                      >
                        {canManage && (
                          <td className="p-3.5 text-center">
                            <button
                              onClick={() => handleToggleSelectOne(item.id)}
                              className="text-slate-400 hover:text-[#E5B868] transition-colors cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-[#E5B868]" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                        )}

                        {/* Athlete Info */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <img
                              src={item.athletePhoto || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80'}
                              alt={item.athleteName}
                              className="w-9 h-9 rounded-xl object-cover border border-white/20 shrink-0"
                            />
                            <div>
                              <div className="font-black text-white uppercase flex items-center gap-1.5">
                                <span>{item.athleteName}</span>
                                {isCheckedIn && (
                                  <ShieldCheck className="w-3.5 h-3.5 text-[#E5B868] shrink-0" />
                                )}
                              </div>
                              <span className="text-[10px] font-mono text-slate-400">ID: {item.id.slice(0, 10)}</span>
                            </div>
                          </div>
                        </td>

                        {/* Team & Sport */}
                        <td className="p-3.5">
                          <div className="font-bold text-[#E5B868] uppercase">{item.teamName}</div>
                          <span className="text-[10px] font-mono text-slate-400">{item.sport}</span>
                        </td>

                        {/* Court / Location */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-1 text-slate-300 font-mono font-bold">
                            <MapPin className="w-3 h-3 text-slate-300" />
                            <span>{item.courtField || 'Court A (Main)'}</span>
                          </div>
                        </td>

                        {/* Check-In Status */}
                        <td className="p-3.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            isCheckedIn
                              ? 'bg-[#E5B868] text-black shadow-[0_0_10px_rgba(0,242,254,0.4)]'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}>
                            {isCheckedIn ? <CheckCircle2 className="w-3 h-3 stroke-[3]" /> : <Clock className="w-3 h-3" />}
                            {item.status}
                          </span>
                        </td>

                        {/* Gate Log Time */}
                        <td className="p-3.5 font-mono text-slate-300 text-[11px]">
                          {isCheckedIn ? (
                            <div className="text-[#E5B868]">
                              {new Date(item.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">Not checked in</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Digital QR Pass Modal Trigger */}
                            <button
                              onClick={() => setQrModalItem(item)}
                              className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-[#E5B868] border border-white/10 rounded-xl transition-all cursor-pointer"
                              title="View Digital QR Pass"
                            >
                              <QrCode className="w-4 h-4 text-[#E5B868]" />
                            </button>

                            {/* Toggle Status Button */}
                            {(isAthlete || canManage || isCurrentUser) ? (
                              <button
                                onClick={() => onToggleCheckIn(item.id, item.status)}
                                className={`px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                                  isCheckedIn
                                    ? 'bg-white/10 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-white/15'
                                    : 'bg-[#E5B868] hover:bg-[#38BDF8] text-black shadow-[0_0_12px_rgba(0,242,254,0.5)]'
                                }`}
                              >
                                {isCheckedIn ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 text-[#E5B868]" />
                                    <span>UNDO</span>
                                  </>
                                ) : (
                                  <>
                                    <Zap className="w-3 h-3 text-black stroke-[2]" />
                                    <span>CHECK IN</span>
                                  </>
                                )}
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-500 italic">Read-only</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3.5 bg-white/5 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Showing {filteredAndSortedCheckIns.length} of {totalCount} attendees</span>
            <span>Sorted by: {String(sortField || 'NAME').toUpperCase()} ({String(sortDirection || 'ASC').toUpperCase()})</span>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: BENTO CARDS GRID VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSortedCheckIns.map((item) => {
            const isCheckedIn = item.status === 'Checked In';
            const isCurrentUser = user?.uid === item.athleteUid || profile?.displayName === item.athleteName;

            return (
              <BentoCard
                key={item.id}
                glow={isCheckedIn}
                className="flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-full flex items-center gap-1 ${
                      isCheckedIn
                        ? 'bg-[#E5B868] text-black shadow-[0_0_10px_rgba(0,242,254,0.5)]'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {isCheckedIn ? <CheckCircle2 className="w-3 h-3 stroke-[3]" /> : <Clock className="w-3 h-3" />}
                      {item.status}
                    </span>

                    <span className="text-[10px] font-mono text-slate-400">
                      {item.sport}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    <img
                      src={item.athletePhoto || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80'}
                      alt={item.athleteName}
                      className="w-12 h-12 rounded-2xl object-cover border-2 border-white/15"
                    />
                    <div>
                      <h4 className="text-base font-black text-white uppercase leading-tight">
                        {item.athleteName}
                      </h4>
                      <span className="text-xs font-bold text-[#E5B868] uppercase block">
                        {item.teamName}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-400 bg-white/5 p-3 rounded-2xl border border-white/10 mb-4 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Location:</span>
                      <span className="text-white font-bold">{item.courtField || 'Court A (Main)'}</span>
                    </div>
                    {isCheckedIn && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Checked In:</span>
                        <span className="text-[#E5B868]">
                          {new Date(item.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setQrModalItem(item)}
                    className="w-full py-2 px-3 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-[#E5B868] border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5 text-[#E5B868]" />
                    <span>VIEW DIGITAL QR PASS</span>
                  </button>

                  {(isAthlete || canManage || isCurrentUser) ? (
                    <button
                      onClick={() => onToggleCheckIn(item.id, item.status)}
                      className={`w-full py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        isCheckedIn
                          ? 'bg-white/10 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-white/15'
                          : 'bg-[#E5B868] hover:bg-[#38BDF8] text-black shadow-[0_0_20px_rgba(0,242,254,0.5)]'
                      }`}
                    >
                      {isCheckedIn ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-[#E5B868]" />
                          <span>CHECKED IN (TOGGLE TO UNDO)</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 text-black stroke-[2]" />
                          <span>CLICK TO CHECK-IN NOW</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="p-2.5 bg-white/5 rounded-xl border border-white/10 text-center text-[10px] text-slate-400">
                      Read-Only Status View
                    </div>
                  )}
                </div>
              </BentoCard>
            );
          })}
        </div>
      )}

      {/* QR CODE DIGITAL PASS MODAL */}
      {qrModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-sm bg-[#050505] border-2 border-[#E5B868] rounded-3xl p-6 shadow-[0_0_40px_rgba(0,242,254,0.3)] text-white text-center space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-black uppercase tracking-widest text-[#E5B868] flex items-center gap-1.5 font-mono">
                <QrCode className="w-4 h-4" />
                DIGITAL GAME PASS
              </span>
              <button
                onClick={() => setQrModalItem(null)}
                className="p-1 rounded-full bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-2 space-y-1">
              <h3 className="text-xl font-black uppercase">{qrModalItem.athleteName}</h3>
              <p className="text-xs font-bold text-[#E5B868] uppercase">{qrModalItem.teamName}</p>
              <p className="text-[10px] text-slate-400 font-mono">{qrModalItem.courtField} • {qrModalItem.sport}</p>
            </div>

            {/* Dynamic QR Code Matrix */}
            <div className="flex justify-center py-2">
              <QrCodeDisplay
                value={JSON.stringify({
                  athleteUid: qrModalItem.id,
                  athleteName: qrModalItem.athleteName,
                  teamName: qrModalItem.teamName,
                  sport: qrModalItem.sport,
                  courtField: qrModalItem.courtField
                })}
                size={180}
                title="SCAN AT VENUE ENTRANCE"
                subTitle="Auto-logs to Firestore 'CheckinRecords'"
              />
            </div>

            <div className="pt-2 text-[10px] text-slate-400 font-mono">
              SCAN AT VENUE ENTRANCE FOR AUTOMATIC TELEMETRY LOG
            </div>
          </motion.div>
        </div>
      )}

      {/* ORGANIZER QR SCANNER MODAL */}
      <QrCheckInScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />
    </div>
  );
};

