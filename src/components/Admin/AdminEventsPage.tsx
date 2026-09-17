import React, { useState, useEffect } from 'react';
import { collection, doc, updateDoc, setDoc, deleteDoc, query, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { firestoreCacheService } from '../../services/firestoreCacheService';
import { 
  Trophy, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  Trash2, 
  AlertCircle, 
  Search, 
  Check, 
  X,
  Loader2,
  ListFilter,
  Sparkles,
  Layers
} from 'lucide-react';
import { EventBuilderWizard } from './Events/EventBuilderWizard';
import { deleteEventCascade } from '../../services/cascadeDeleteService';
import { EventDeduplicator } from './EventDeduplicator';

const FALLBACK_EVENTS = [
  {
    id: 'evt-1',
    title: 'Tri-State Elite High School Showcase',
    sport: 'Basketball',
    date: '2026-08-15',
    time: '09:00 AM',
    location: 'Rutgers Athletic Center, New Brunswick, NJ',
    description: 'Premier scouting showcase featuring top 100 Division 1 prospects.',
    registeredCount: 142,
    maxCap: 200,
    status: 'Upcoming',
    entryFee: '$150',
    teams: [
      { id: 't1', name: 'NJ Playmakers 17U', status: 'Approved', coach: 'Marcus Vance' },
      { id: 't2', name: 'NY Rens Select', status: 'Approved', coach: 'David Smith' },
      { id: 't3', name: 'Philly Pride AAU', status: 'Pending', coach: 'Tyrone Jackson' },
      { id: 't4', name: 'Jersey City Ballers', status: 'Pending', coach: 'Ray Wilson' }
    ],
    games: [
      { id: 'g1', time: '10:00 AM', court: 'Court 1', homeTeam: 'NJ Playmakers 17U', awayTeam: 'NY Rens Select' },
      { id: 'g2', time: '11:30 AM', court: 'Court 2', homeTeam: 'Philly Pride AAU', awayTeam: 'Jersey City Ballers' }
    ]
  },
  {
    id: 'evt-2',
    title: 'National Flag Football Summer Championship',
    sport: 'Flag Football',
    date: '2026-08-22',
    time: '10:00 AM',
    location: 'MetLife Stadium Practice Facility, East Rutherford, NJ',
    description: 'National championship series for girls & boys high school flag football teams.',
    registeredCount: 64,
    maxCap: 80,
    status: 'Upcoming',
    entryFee: '$200',
    teams: [
      { id: 't5', name: 'Tri-State Lightning QB Club', status: 'Approved', coach: 'Sarah Jenkins' },
      { id: 't6', name: 'Metro Stars Flag 18U', status: 'Approved', coach: 'Alex Rivera' }
    ],
    games: [
      { id: 'g3', time: '10:30 AM', court: 'Field A', homeTeam: 'Tri-State Lightning QB Club', awayTeam: 'Metro Stars Flag 18U' }
    ]
  }
];

export const AdminEventsPage: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Modals & States
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [showRegistrationsModal, setShowRegistrationsModal] = useState<boolean>(false);
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [showCreateWizard, setShowCreateWizard] = useState<boolean>(false);
  const [showCreateEventModal, setShowCreateEventModal] = useState<boolean>(false);
  const [showDeduplicatorModal, setShowDeduplicatorModal] = useState<boolean>(false);

  // New Event Form State
  const [newEventForm, setNewEventForm] = useState({
    title: '',
    sport: 'Basketball',
    date: '',
    time: '09:00 AM',
    location: 'Rutgers University Athletic Center, New Brunswick, NJ',
    description: '',
    maxCap: 200,
    isPaid: false,
    feeAmount: 150,
    entryFee: 'Free'
  });

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch events with local-first cache and limit
  const fetchEvents = async (forceFresh = false) => {
    setLoading(true);
    try {
      if (!db) return;
      const snap = await firestoreCacheService.getDocsCached(
        query(collection(db, 'events'), limit(100)),
        'admin_events_list',
        {
          strategy: forceFresh ? 'server-only' : 'stale-while-revalidate',
          ttlMs: 5 * 60 * 1000
        }
      );
      if (!snap.empty) {
        const list: any[] = [];
        snap.forEach(d => {
          list.push({ id: d.id, ...d.data() });
        });
        setEvents(list);
      } else {
        setEvents(FALLBACK_EVENTS);
      }
    } catch {
      // Fallback events on offline/cache mode
      setEvents(FALLBACK_EVENTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Action: Change Status
  const handleStatusChange = async (eventId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'events', eventId), { status: newStatus });
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, status: newStatus } : e));
      showToast(`Event status updated to ${newStatus.toUpperCase()}`);
    } catch (err) {
      console.error('Status update error:', err);
      showToast('Error updating event status.');
    }
  };

  // Action: Approve/Reject Team
  const handleTeamStatusChange = async (eventId: string, teamId: string, nextStatus: 'Approved' | 'Rejected') => {
    const ev = events.find(e => e.id === eventId);
    if (!ev) return;

    const updatedTeams = (ev.teams || []).map((t: any) => t.id === teamId ? { ...t, status: nextStatus } : t);
    
    try {
      await updateDoc(doc(db, 'events', eventId), { teams: updatedTeams });
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, teams: updatedTeams } : e));
      setSelectedEvent((prev: any) => prev ? { ...prev, teams: updatedTeams } : null);
      showToast(`Team registration ${nextStatus.toUpperCase()}`);
    } catch (err) {
      console.error('Team status error:', err);
    }
  };

  // Action: Create New Event
  const handleCreateEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newEvtId = `evt-${Date.now()}`;
      const calculatedEntryFee = newEventForm.isPaid ? `$${newEventForm.feeAmount}` : 'Free';
      const newEvtObj = {
        id: newEvtId,
        ...newEventForm,
        entryFee: calculatedEntryFee,
        teamFee: newEventForm.isPaid ? newEventForm.feeAmount : 0,
        price: newEventForm.isPaid ? newEventForm.feeAmount : 0,
        registeredCount: 0,
        status: 'Upcoming',
        teams: [],
        games: [],
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'events', newEvtId), newEvtObj);
      setEvents(prev => [newEvtObj, ...prev]);
      showToast(`Created new tournament: ${newEventForm.title}`);
      setShowCreateEventModal(false);
      setNewEventForm({
        title: '',
        sport: 'Basketball',
        date: '',
        time: '09:00 AM',
        location: 'Rutgers University Athletic Center, New Brunswick, NJ',
        description: '',
        maxCap: 200,
        isPaid: false,
        feeAmount: 150,
        entryFee: 'Free'
      });
    } catch (err) {
      console.error('Create event error:', err);
      showToast('Error creating event.');
    }
  };

  // Action: Delete Event (Cascade RSVP/Attendees/Games)
  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to permanently delete this tournament/game event and all linked sub-records?')) return;
    try {
      await deleteEventCascade(eventId);
      setEvents(prev => prev.filter(e => e.id !== eventId));
      showToast('Tournament and linked assets deleted via cascade engine.');
    } catch (err) {
      console.error('Delete event error:', err);
      try {
        await deleteDoc(doc(db, 'events', eventId));
        setEvents(prev => prev.filter(e => e.id !== eventId));
        showToast('Tournament deleted.');
      } catch (e) {
        console.error('Fallback delete error:', e);
      }
    }
  };

  const filteredEvents = events.filter(e => 
    e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.sport.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-24 right-6 z-50 p-4 rounded-2xl bg-[#000000]/90 border border-[#E5B868] text-white shadow-[0_0_30px_rgba(214,28,36,0.3)] backdrop-blur-2xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-[#E5B868]" />
          <span className="text-xs font-bold font-sans uppercase">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-[#212A31]/90 border border-white/10 backdrop-blur-2xl">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E5B868]/10 border border-[#E5B868]/30 text-[#E5B868] text-xs font-mono font-bold uppercase tracking-widest mb-2">
            <Trophy className="w-3.5 h-3.5" />
            <span>Tournament & Game Schedule Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black italic uppercase text-white font-sans tracking-tight">
            EVENT <span className="text-[#E5B868]">MANAGEMENT CONSOLE</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Override tournament statuses, manage team roster approvals, and schedule matchups.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          <button
            onClick={() => setShowDeduplicatorModal(true)}
            className="px-4 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-[#00B8D4]/40 text-[#00B8D4] hover:text-[#00F5D4] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,184,212,0.15)] transition-all cursor-pointer"
            title="Clean & Merge duplicate schedule fixtures"
          >
            <Layers className="w-4 h-4 text-[#00F5D4]" />
            <span>Event Deduplicator</span>
          </button>

          <button
            onClick={() => setShowCreateWizard(true)}
            className="px-5 py-3 rounded-2xl bg-[#E5B868] hover:bg-[#d4a34f] text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(229,184,104,0.4)] transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Launch 5-Step Event Wizard</span>
          </button>
        </div>
      </div>

      {/* Event Deduplicator Overlay Modal */}
      {showDeduplicatorModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl overflow-y-auto p-4 sm:p-8">
          <div className="max-w-6xl mx-auto space-y-4">
            <div className="flex justify-end mb-2">
              <button
                onClick={() => {
                  setShowDeduplicatorModal(false);
                  fetchEvents(true);
                }}
                className="py-2 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase cursor-pointer"
              >
                ✕ Close Deduplicator
              </button>
            </div>
            <EventDeduplicator 
              onCompleted={() => {
                fetchEvents(true);
              }}
            />
          </div>
        </div>
      )}

      {/* 5-Step Event Wizard Overlay Modal */}
      {showCreateWizard && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl overflow-y-auto p-4 sm:p-8">
          <div className="max-w-5xl mx-auto">
            <div className="flex justify-end mb-4">
              <button
                onClick={() => {
                  setShowCreateWizard(false);
                  fetchEvents(true);
                }}
                className="py-2 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase cursor-pointer"
              >
                ✕ Close Wizard
              </button>
            </div>
            <EventBuilderWizard 
              onBack={() => {
                setShowCreateWizard(false);
                fetchEvents(true);
              }}
              onPublished={() => {
                setShowCreateWizard(false);
                fetchEvents(true);
              }}
            />
          </div>
        </div>
      )}


      {/* Search */}
      <div className="p-4 rounded-2xl bg-[#212A31]/90 border border-white/10 backdrop-blur-2xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tournaments by title or location..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#E5B868]"
          />
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 font-mono text-xs flex justify-center items-center gap-2">
          <Loader2 className="w-6 h-6 text-[#E5B868] animate-spin" />
          <span>Loading Tournament Database...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredEvents.map((ev) => {
            const mediaUrl = ev.flyerUrl || ev.bannerUrl || ev.coverUrl;
            return (
            <div key={ev.id} className="p-6 rounded-3xl bg-[#212A31]/90 border border-white/10 backdrop-blur-2xl space-y-4 relative overflow-hidden flex flex-col justify-between group">
              
              <div className="space-y-3">
                
                {/* Event Flyer / Banner Thumbnail Header */}
                <div className="relative h-28 w-full rounded-2xl overflow-hidden bg-gradient-to-br from-[#0B1528] via-[#101B2E] to-[#1E3050] border border-white/5">
                  {mediaUrl ? (
                    <img 
                      src={mediaUrl} 
                      alt={ev.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#212A31] via-transparent to-black/30 pointer-events-none" />
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
                    <span className="px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md text-[#E5B868] border border-[#E5B868]/30 text-[9px] font-mono font-bold uppercase">
                      {ev.sport}
                    </span>
                  </div>
                </div>

                {/* Header Status & Title */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono font-bold text-slate-400 uppercase">
                    ID: <span className="text-white">{ev.id?.substring(0, 10)}</span>
                  </span>

                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-mono uppercase text-slate-400">Status:</label>
                    <select
                      value={ev.status}
                      onChange={(e) => handleStatusChange(ev.id, e.target.value)}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase focus:outline-none cursor-pointer border ${
                        ev.status === 'Live'
                          ? 'bg-red-500/20 border-red-500/40 text-red-400'
                          : ev.status === 'Completed'
                          ? 'bg-slate-800 border-slate-700 text-slate-300'
                          : ev.status === 'Cancelled'
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                          : 'bg-[#E5B868]/20 border-[#E5B868]/40 text-[#E5B868]'
                      }`}
                    >
                      <option value="Upcoming" className="bg-[#212A31]">Upcoming</option>
                      <option value="Live" className="bg-[#212A31]">Live Now</option>
                      <option value="Completed" className="bg-[#212A31]">Completed</option>
                      <option value="Cancelled" className="bg-[#212A31]">Cancelled</option>
                    </select>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white font-sans italic uppercase tracking-tight">
                  {ev.title}
                </h3>

                <div className="space-y-1.5 text-xs text-slate-300 font-sans">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-[#E5B868]" />
                    <span>{ev.date || 'TBD'} @ {ev.time || '09:00 AM'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#E5B868]" />
                    <span className="line-clamp-1">{ev.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-[#E5B868]" />
                    <span>{ev.registeredCount || 0} / {ev.maxCap || 200} Athletes Registered</span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2">
                  {ev.description}
                </p>

              </div>

              {/* Action Toolbar */}
              <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                
                <div className="flex items-center gap-2">
                  
                  {/* View / Approve Registrations */}
                  <button
                    onClick={() => {
                      setSelectedEvent(ev);
                      setShowRegistrationsModal(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Users className="w-3.5 h-3.5 text-[#E5B868]" />
                    <span>Team Roster Approvals ({(ev.teams || []).length})</span>
                  </button>

                  {/* Schedule Games */}
                  <button
                    onClick={() => {
                      setSelectedEvent(ev);
                      setShowScheduleModal(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Clock className="w-3.5 h-3.5 text-slate-300" />
                    <span>Game Matchups ({(ev.games || []).length})</span>
                  </button>

                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDeleteEvent(ev.id)}
                  className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 cursor-pointer transition-all"
                  title="Delete Event"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

              </div>

            </div>
          );
        })}
        </div>
      )}

      {/* TEAM REGISTRATIONS APPROVAL MODAL */}
      {showRegistrationsModal && selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-xl p-6 rounded-3xl bg-[#212A31] border border-white/15 shadow-2xl space-y-6">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-black italic uppercase text-white font-sans">
                  TEAM ROSTER REGISTRATIONS
                </h3>
                <p className="text-xs text-slate-400 font-mono">{selectedEvent.title}</p>
              </div>
              <button
                onClick={() => setShowRegistrationsModal(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {(!selectedEvent.teams || selectedEvent.teams.length === 0) ? (
                <div className="text-center text-xs text-slate-500 font-mono py-8">
                  No team registrations submitted yet for this event.
                </div>
              ) : (
                selectedEvent.teams.map((t: any) => (
                  <div key={t.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-white font-sans">{t.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Head Coach: {t.coach || 'N/A'}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase border ${
                        t.status === 'Approved' ? 'bg-red-600/20 border-red-600/40 text-red-500' : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                      }`}>
                        {t.status}
                      </span>

                      <button
                        onClick={() => handleTeamStatusChange(selectedEvent.id, t.id, 'Approved')}
                        className="p-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-500 border border-red-600/40 cursor-pointer"
                        title="Approve Team"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleTeamStatusChange(selectedEvent.id, t.id, 'Rejected')}
                        className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 cursor-pointer"
                        title="Reject Team"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setShowRegistrationsModal(false)}
              className="w-full py-3 rounded-xl bg-white/10 text-white font-bold text-xs uppercase hover:bg-white/20 transition-all cursor-pointer"
            >
              Done
            </button>

          </div>
        </div>
      )}

      {/* GAME MATCHUPS & LIVE SCORE MODAL */}
      {showScheduleModal && selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
          <div className="w-full max-w-2xl p-6 sm:p-8 rounded-3xl bg-[#212A31] border border-white/15 shadow-2xl space-y-6 text-white my-8">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#E5B868]/20 text-[#E5B868] border border-[#E5B868]/30">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black italic uppercase text-white font-sans">
                    TOURNAMENT GAME MATCHUPS & SCORES
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">{selectedEvent.title}</p>
                </div>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Matchups List */}
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {(!selectedEvent.games || selectedEvent.games.length === 0) ? (
                <div className="text-center text-xs text-slate-500 font-mono py-8 bg-white/5 rounded-2xl border border-white/5">
                  No games scheduled yet. Add the first matchup below.
                </div>
              ) : (
                selectedEvent.games.map((g: any, gIdx: number) => (
                  <div key={g.id || gIdx} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#E5B868]/20 text-[#E5B868] border border-[#E5B868]/30">
                        {g.court || 'Court 1'} • {g.time || '10:00 AM'}
                      </span>

                      <div className="flex items-center gap-2">
                        <select
                          value={g.status || 'Upcoming'}
                          onChange={async (e) => {
                            const newStatus = e.target.value;
                            const updatedGames = selectedEvent.games.map((item: any, i: number) => i === gIdx ? { ...item, status: newStatus } : item);
                            if (db) {
                              try {
                                await updateDoc(doc(db, 'events', selectedEvent.id), { games: updatedGames });
                              } catch (err) {
                                console.warn('Firestore game status note:', err);
                              }
                            }
                            setSelectedEvent({ ...selectedEvent, games: updatedGames });
                            setEvents(prev => prev.map(ev => ev.id === selectedEvent.id ? { ...ev, games: updatedGames } : ev));
                            showToast(`Match status updated to ${newStatus}`);
                          }}
                          className="px-2 py-1 rounded-lg bg-black/60 border border-white/20 text-[10px] font-mono font-bold text-white uppercase focus:outline-none"
                        >
                          <option value="Upcoming">Upcoming</option>
                          <option value="Live">Live Now</option>
                          <option value="Halftime">Halftime</option>
                          <option value="Final">Final</option>
                        </select>

                        <button
                          onClick={async () => {
                            const updatedGames = selectedEvent.games.filter((_: any, i: number) => i !== gIdx);
                            if (db) {
                              try {
                                await updateDoc(doc(db, 'events', selectedEvent.id), { games: updatedGames });
                              } catch (err) {
                                console.warn('Firestore game delete note:', err);
                              }
                            }
                            setSelectedEvent({ ...selectedEvent, games: updatedGames });
                            setEvents(prev => prev.map(ev => ev.id === selectedEvent.id ? { ...ev, games: updatedGames } : ev));
                            showToast('Matchup removed');
                          }}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 cursor-pointer"
                          title="Delete Matchup"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Matchup Scoreboard Row */}
                    <div className="grid grid-cols-11 items-center gap-2 text-xs">
                      <div className="col-span-4 font-bold text-white truncate text-right">
                        {g.homeTeam}
                      </div>

                      <div className="col-span-3 flex items-center justify-center gap-1.5 font-mono">
                        <input
                          type="number"
                          value={g.homeScore ?? 0}
                          onChange={async (e) => {
                            const val = parseInt(e.target.value) || 0;
                            const updatedGames = selectedEvent.games.map((item: any, i: number) => i === gIdx ? { ...item, homeScore: val } : item);
                            if (db) {
                              try {
                                await updateDoc(doc(db, 'events', selectedEvent.id), { games: updatedGames });
                              } catch (err) {
                                console.warn(err);
                              }
                            }
                            setSelectedEvent({ ...selectedEvent, games: updatedGames });
                            setEvents(prev => prev.map(ev => ev.id === selectedEvent.id ? { ...ev, games: updatedGames } : ev));
                          }}
                          className="w-11 px-1.5 py-1 rounded-lg bg-black/60 border border-white/20 text-center text-xs font-bold text-[#E5B868]"
                        />
                        <span className="text-slate-500 font-bold">:</span>
                        <input
                          type="number"
                          value={g.awayScore ?? 0}
                          onChange={async (e) => {
                            const val = parseInt(e.target.value) || 0;
                            const updatedGames = selectedEvent.games.map((item: any, i: number) => i === gIdx ? { ...item, awayScore: val } : item);
                            if (db) {
                              try {
                                await updateDoc(doc(db, 'events', selectedEvent.id), { games: updatedGames });
                              } catch (err) {
                                console.warn(err);
                              }
                            }
                            setSelectedEvent({ ...selectedEvent, games: updatedGames });
                            setEvents(prev => prev.map(ev => ev.id === selectedEvent.id ? { ...ev, games: updatedGames } : ev));
                          }}
                          className="w-11 px-1.5 py-1 rounded-lg bg-black/60 border border-white/20 text-center text-xs font-bold text-[#E5B868]"
                        />
                      </div>

                      <div className="col-span-4 font-bold text-white truncate text-left">
                        {g.awayTeam}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick Add Matchup */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-[#E5B868] font-mono">
                + Add Game Matchup to Tournament
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                <input
                  type="text"
                  placeholder="Home Team"
                  id="new-home-team"
                  className="px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-[#E5B868]"
                />
                <input
                  type="text"
                  placeholder="Away Team"
                  id="new-away-team"
                  className="px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-[#E5B868]"
                />
                <input
                  type="text"
                  placeholder="Court (e.g. Court 1)"
                  id="new-court"
                  defaultValue="Court 1"
                  className="px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-[#E5B868]"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const homeInput = document.getElementById('new-home-team') as HTMLInputElement;
                    const awayInput = document.getElementById('new-away-team') as HTMLInputElement;
                    const courtInput = document.getElementById('new-court') as HTMLInputElement;
                    if (!homeInput?.value || !awayInput?.value) {
                      showToast('Please enter both home and away teams.');
                      return;
                    }
                    const newGame = {
                      id: `g-${Date.now()}`,
                      time: '11:00 AM',
                      court: courtInput?.value || 'Court 1',
                      homeTeam: homeInput.value.trim(),
                      awayTeam: awayInput.value.trim(),
                      homeScore: 0,
                      awayScore: 0,
                      status: 'Upcoming'
                    };
                    const updatedGames = [...(selectedEvent.games || []), newGame];
                    if (db) {
                      try {
                        await updateDoc(doc(db, 'events', selectedEvent.id), { games: updatedGames });
                      } catch (err) {
                        console.warn(err);
                      }
                    }
                    setSelectedEvent({ ...selectedEvent, games: updatedGames });
                    setEvents(prev => prev.map(ev => ev.id === selectedEvent.id ? { ...ev, games: updatedGames } : ev));
                    homeInput.value = '';
                    awayInput.value = '';
                    showToast('Game matchup added to tournament schedule!');
                  }}
                  className="px-3 py-2 rounded-xl bg-[#E5B868] text-slate-950 font-black text-xs uppercase hover:bg-[#d4a34f] transition-all cursor-pointer"
                >
                  Add Matchup
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowScheduleModal(false)}
              className="w-full py-3 rounded-xl bg-white/10 text-white font-bold text-xs uppercase hover:bg-white/20 transition-all cursor-pointer"
            >
              Done & Save
            </button>

          </div>
        </div>
      )}

      {/* CREATE EVENT MODAL */}
      {showCreateEventModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <form onSubmit={handleCreateEventSubmit} className="w-full max-w-lg p-6 rounded-3xl bg-[#212A31] border border-white/15 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#E5B868]" />
                <h3 className="text-lg font-black italic uppercase text-white font-sans">
                  CREATE NEW TOURNAMENT EVENT
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateEventModal(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold uppercase text-slate-400 font-mono mb-1 block">Tournament Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tri-State Fall Recruiting Showcase"
                  value={newEventForm.title}
                  onChange={e => setNewEventForm({ ...newEventForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#E5B868]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold uppercase text-slate-400 font-mono mb-1 block">Sport</label>
                  <select
                    value={newEventForm.sport}
                    onChange={e => setNewEventForm({ ...newEventForm, sport: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#E5B868]"
                  >
                    <option value="Basketball" className="bg-[#212A31]">Basketball</option>
                    <option value="Flag Football" className="bg-[#212A31]">Flag Football</option>
                    <option value="Lacrosse" className="bg-[#212A31]">Lacrosse</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold uppercase text-slate-400 font-mono mb-1 block">Date</label>
                  <input
                    type="date"
                    required
                    value={newEventForm.date}
                    onChange={e => setNewEventForm({ ...newEventForm, date: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#E5B868]"
                  />
                </div>
              </div>

              {/* Entry Fee Toggle */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold uppercase text-slate-300 font-mono text-xs">Event Entry Fee</label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setNewEventForm({ ...newEventForm, isPaid: false })}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono transition-all cursor-pointer ${
                        !newEventForm.isPaid
                          ? 'bg-[#E5B868] text-black shadow-[0_0_10px_rgba(214,28,36,0.4)]'
                          : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      FREE (DEFAULT)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewEventForm({ ...newEventForm, isPaid: true })}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono transition-all cursor-pointer ${
                        newEventForm.isPaid
                          ? 'bg-amber-400 text-black shadow-[0_0_10px_rgba(251,191,36,0.4)]'
                          : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      CHARGE FEE
                    </button>
                  </div>
                </div>

                {newEventForm.isPaid ? (
                  <div className="pt-1">
                    <label className="text-[10px] uppercase font-mono font-bold text-amber-300 mb-1 block">Entry Fee Amount ($USD)</label>
                    <input
                      type="number"
                      min="1"
                      required={newEventForm.isPaid}
                      value={newEventForm.feeAmount}
                      onChange={e => setNewEventForm({ ...newEventForm, feeAmount: Number(e.target.value) })}
                      placeholder="150"
                      className="w-full px-3 py-2 rounded-xl bg-black/60 border border-amber-400/40 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>
                ) : (
                  <p className="text-[11px] text-[#E5B868] font-mono font-bold">
                    ✓ Free Event — Participants can register at no cost.
                  </p>
                )}
              </div>

              <div>
                <label className="font-bold uppercase text-slate-400 font-mono mb-1 block">Venue & Location</label>
                <input
                  type="text"
                  required
                  value={newEventForm.location}
                  onChange={e => setNewEventForm({ ...newEventForm, location: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#E5B868]"
                />
              </div>

              <div>
                <label className="font-bold uppercase text-slate-400 font-mono mb-1 block">Description</label>
                <textarea
                  rows={3}
                  value={newEventForm.description}
                  onChange={e => setNewEventForm({ ...newEventForm, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#E5B868]"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowCreateEventModal(false)}
                className="flex-1 py-3 rounded-xl bg-white/10 text-slate-300 font-bold text-xs uppercase hover:bg-white/20 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl bg-[#E5B868] text-black font-black text-xs uppercase hover:bg-[#B8141B] shadow-[0_0_15px_rgba(214,28,36,0.4)] transition-all cursor-pointer"
              >
                Publish Tournament
              </button>
            </div>

          </form>
        </div>
      )}

      {/* Event Deduplicator & Clean-Up Modal */}
      {showDeduplicatorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl animate-fadeIn overflow-y-auto">
          <div className="relative w-full max-w-6xl my-auto bg-[#090D16] border border-[#00B8D4]/40 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-4 sm:p-5 bg-[#263238] border-b border-[#24324F] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#00B8D4]/20 border border-[#00B8D4]/40 flex items-center justify-center text-[#00F5D4]">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                    Firestore Event Deduplication & Clean-Up Studio
                  </h2>
                  <p className="text-xs text-slate-400">
                    Scan composite keys, detect duplicate game fixtures, and execute one-tap merge & purge.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowDeduplicatorModal(false)}
                className="p-2 rounded-xl bg-black/60 hover:bg-black border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                title="Close Deduplicator"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar">
              <EventDeduplicator 
                onCompleted={() => {
                  fetchEvents();
                }} 
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminEventsPage;
