import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Search, 
  RefreshCw, 
  Trash2, 
  ExternalLink, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ShieldCheck, 
  Sparkles, 
  LogOut, 
  Trophy,
  Filter,
  Users
} from 'lucide-react';
import { BentoCard } from '../BentoCard';
import { 
  signInWithGoogleCalendar, 
  disconnectGoogleCalendar, 
  fetchUserCalendars, 
  fetchCalendarEvents, 
  createCalendarEvent, 
  deleteCalendarEvent, 
  syncJust1PlayEventToGoogleCalendar,
  CalendarItem, 
  CalendarEventItem, 
  getCalendarAccessToken 
} from '../../lib/googleCalendarService';
import { useAuth } from '../../context/AuthContext';
import { UniversalScheduleImporterModal } from '../UniversalScheduleImporterModal';

export const GoogleCalendarHub: React.FC = () => {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(getCalendarAccessToken());
  const [calendars, setCalendars] = useState<CalendarItem[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('primary');
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Universal AI Importer Modal State
  const [showAiImporterModal, setShowAiImporterModal] = useState<boolean>(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [timeFilter, setTimeFilter] = useState<'all' | 'upcoming' | 'today'>('upcoming');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newEventTitle, setNewEventTitle] = useState<string>('');
  const [newEventLocation, setNewEventLocation] = useState<string>('');
  const [newEventDescription, setNewEventDescription] = useState<string>('');
  const [newEventDate, setNewEventDate] = useState<string>(
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [newEventStartTime, setNewEventStartTime] = useState<string>('14:00');
  const [newEventEndTime, setNewEventEndTime] = useState<string>('16:00');

  // Mandatory Delete Confirmation Modal
  const [deletingEvent, setDeletingEvent] = useState<CalendarEventItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Sample Games Sync State
  const [isSyncingSample, setIsSyncingSample] = useState<boolean>(false);

  // Load Calendars and Events when Token is available
  useEffect(() => {
    if (token) {
      loadCalendarData(token, selectedCalendarId);
    }
  }, [token, selectedCalendarId]);

  const loadCalendarData = async (authToken: string, calendarId: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Fetch user calendar list
      const calList = await fetchUserCalendars(authToken);
      setCalendars(calList);

      // 2. Fetch events for selected calendar
      const calEvents = await fetchCalendarEvents(authToken, calendarId);
      setEvents(calEvents);
    } catch (err: any) {
      console.error('Calendar load error:', err);
      setErrorMsg(err?.message || 'Failed to load Google Calendar data. Please verify permissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectCalendar = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await signInWithGoogleCalendar();
      if (res?.accessToken) {
        setToken(res.accessToken);
        setSuccessMsg('Successfully connected Google Calendar!');
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      console.error('Calendar connect error:', err);
      setErrorMsg(err?.message || 'Failed to authenticate with Google Calendar.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectGoogleCalendar();
    setToken(null);
    setEvents([]);
    setCalendars([]);
    setSuccessMsg('Disconnected Google Calendar session.');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newEventTitle.trim()) return;

    setIsCreating(true);
    setErrorMsg(null);

    try {
      const startISO = new Date(`${newEventDate}T${newEventStartTime}:00`).toISOString();
      const endISO = new Date(`${newEventDate}T${newEventEndTime}:00`).toISOString();

      await createCalendarEvent(
        token,
        {
          summary: newEventTitle,
          location: newEventLocation,
          description: newEventDescription,
          startISO,
          endISO
        },
        selectedCalendarId
      );

      setSuccessMsg(`Event "${newEventTitle}" added to Google Calendar!`);
      setShowCreateModal(false);
      setNewEventTitle('');
      setNewEventLocation('');
      setNewEventDescription('');
      setTimeout(() => setSuccessMsg(null), 4000);

      // Reload
      loadCalendarData(token, selectedCalendarId);
    } catch (err: any) {
      console.error('Create event error:', err);
      setErrorMsg(err?.message || 'Failed to create calendar event.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!token || !deletingEvent) return;

    setIsDeleting(true);
    setErrorMsg(null);

    try {
      await deleteCalendarEvent(token, deletingEvent.id, selectedCalendarId);
      setSuccessMsg(`Deleted "${deletingEvent.summary}" from Google Calendar.`);
      setDeletingEvent(null);
      setTimeout(() => setSuccessMsg(null), 4000);

      // Reload
      loadCalendarData(token, selectedCalendarId);
    } catch (err: any) {
      console.error('Delete event error:', err);
      setErrorMsg(err?.message || 'Failed to delete calendar event.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSyncSampleGames = async () => {
    if (!token) return;

    setIsSyncingSample(true);
    setErrorMsg(null);

    try {
      const sampleGames = [
        {
          title: "Championship Finals: West Coast Eagles vs South Bay Sharks",
          sport: "Girls' Flag Football",
          date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          startTime: "15:00",
          venue: "Levi's Stadium Complex, Field A",
          description: "Official Championship Game broadcast live on Just1Play Stream Hub."
        },
        {
          title: "Elite Recruiting Combine & Athlete Showcase",
          sport: "All Sports",
          date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          startTime: "09:00",
          venue: "Just1Play Performance Center",
          description: "Scouting combine with live 40-yard dash timing and recruiter evaluations."
        }
      ];

      for (const game of sampleGames) {
        await syncJust1PlayEventToGoogleCalendar(token, game, selectedCalendarId);
      }

      setSuccessMsg(`Synced ${sampleGames.length} upcoming sports games to Google Calendar!`);
      setTimeout(() => setSuccessMsg(null), 4000);

      // Reload
      loadCalendarData(token, selectedCalendarId);
    } catch (err: any) {
      console.error('Sync error:', err);
      setErrorMsg(err?.message || 'Failed to sync sports events to calendar.');
    } finally {
      setIsSyncingSample(false);
    }
  };

  // Filter events
  const filteredEvents = events.filter((ev) => {
    const titleMatch = (ev.summary || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                       (ev.location || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                       (ev.description || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!titleMatch) return false;

    const eventTime = ev.start?.dateTime ? new Date(ev.start.dateTime) : (ev.start?.date ? new Date(ev.start.date) : null);
    if (!eventTime) return true;

    const now = new Date();
    if (timeFilter === 'upcoming') {
      return eventTime.getTime() >= now.getTime() - 24 * 60 * 60 * 1000;
    } else if (timeFilter === 'today') {
      return eventTime.toDateString() === now.toDateString();
    }

    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#212A31] via-[#212A31] to-[#212A31] border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#E5B868]/10 rounded-full blur-3xl -z-0 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E5B868]/10 border border-[#E5B868]/30 text-[#E5B868] text-xs font-mono font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Official Google Workspace Integration</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight flex items-center gap-3">
              <CalendarIcon className="w-8 h-8 text-[#E5B868]" />
              <span>Google Calendar Hub</span>
            </h1>

            <p className="text-slate-400 text-sm max-w-xl">
              Seamlessly sync sports tournaments, game schedules, athlete practices, and media bookings directly with your Google Calendar.
            </p>
          </div>

          {/* AUTH STATUS ACTION BUTTONS */}
          <div className="shrink-0 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowAiImporterModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Universal AI Importer</span>
            </button>

            {token ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#E5B868] text-black font-black text-xs uppercase tracking-wider hover:bg-[#B8141B] transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(214,28,36,0.4)] cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Event</span>
                </button>

                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="p-2.5 rounded-xl bg-[#212A31] border border-slate-800 text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-all cursor-pointer"
                  title="Disconnect Google Calendar"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleConnectCalendar}
                disabled={loading}
                className="gsi-material-button hover:scale-105 transition-transform cursor-pointer"
              >
                <div className="gsi-material-button-state"></div>
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents">Sign in with Google</span>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* NOTIFICATIONS & MESSAGES */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-950/80 border border-red-800/80 text-red-200 text-sm font-medium flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-[#E5B868]/40 text-[#E5B868] text-sm font-medium flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#E5B868] shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-[#E5B868] hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      {!token ? (
        /* CONNECT PROMPT CARD */
        <BentoCard className="p-12 text-center space-y-6 max-w-2xl mx-auto bg-[#212A31]/80 border-slate-800">
          <div className="w-20 h-20 rounded-3xl bg-[#E5B868]/10 text-[#E5B868] border border-[#E5B868]/30 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(214,28,36,0.2)]">
            <CalendarIcon className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white uppercase tracking-wide">
              Connect Google Calendar
            </h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Authorize Just1Play with Google Calendar to automatically sync sports event schedules, track athlete game times, and manage your calendar without leaving the hub.
            </p>
          </div>

          <button
            type="button"
            onClick={handleConnectCalendar}
            disabled={loading}
            className="gsi-material-button mx-auto hover:scale-105 transition-transform cursor-pointer"
          >
            <div className="gsi-material-button-state"></div>
            <div className="gsi-material-button-content-wrapper">
              <div className="gsi-material-button-icon">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
              </div>
              <span className="gsi-material-button-contents">Sign in with Google</span>
            </div>
          </button>
        </BentoCard>
      ) : (
        /* CONNECTED GOOGLE CALENDAR DASHBOARD */
        <div className="space-y-6">
          {/* TOOLBAR & CONTROLS */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#212A31] p-4 rounded-2xl border border-slate-800">
            {/* SEARCH */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search calendar events, venues, or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#212A31] border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#E5B868]"
              />
            </div>

            {/* CALENDAR SELECTOR */}
            {calendars.length > 0 && (
              <select
                value={selectedCalendarId}
                onChange={(e) => setSelectedCalendarId(e.target.value)}
                className="bg-[#212A31] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-[#E5B868]"
              >
                {calendars.map((cal) => (
                  <option key={cal.id} value={cal.id}>
                    {cal.summary} {cal.primary ? '(Primary)' : ''}
                  </option>
                ))}
              </select>
            )}

            {/* TIME FILTER TOGGLE */}
            <div className="flex items-center gap-1 bg-[#212A31] p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setTimeFilter('upcoming')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                  timeFilter === 'upcoming'
                    ? 'bg-[#E5B868] text-black font-extrabold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Upcoming
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter('today')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                  timeFilter === 'today'
                    ? 'bg-[#E5B868] text-black font-extrabold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                  timeFilter === 'all'
                    ? 'bg-[#E5B868] text-black font-extrabold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
            </div>

            {/* QUICK ACTIONS */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSyncSampleGames}
                disabled={isSyncingSample}
                className="px-3 py-2 rounded-xl bg-[#212A31] border border-slate-800 hover:border-[#E5B868] text-xs font-bold text-slate-200 hover:text-[#E5B868] transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Trophy className="w-3.5 h-3.5 text-[#E5B868]" />
                <span>Sync Just1Play Schedule</span>
              </button>

              <button
                type="button"
                onClick={() => loadCalendarData(token, selectedCalendarId)}
                disabled={loading}
                className="p-2 rounded-xl bg-[#212A31] border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Refresh Calendar"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#E5B868]' : ''}`} />
              </button>
            </div>
          </div>

          {/* EVENTS GRID */}
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-[#E5B868] animate-spin mx-auto" />
              <p className="text-xs font-mono text-slate-400">Loading Google Calendar events...</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <BentoCard className="py-16 text-center space-y-3 bg-[#212A31]/60 border-slate-800">
              <CalendarIcon className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-300">No events found in Google Calendar</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No events match your current filter. Click "New Event" or "Sync Just1Play Schedule" to populate your calendar.
              </p>
            </BentoCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEvents.map((event) => {
                const startDateStr = event.start?.dateTime || event.start?.date;
                const startDate = startDateStr ? new Date(startDateStr) : null;
                const formattedDate = startDate
                  ? startDate.toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })
                  : 'Date TBD';

                const formattedTime = startDate && event.start?.dateTime
                  ? startDate.toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : 'All Day';

                const isJust1PlayEvent = (event.summary || '').includes('Just1Play');

                return (
                  <motion.div
                    key={event.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-5 rounded-2xl bg-[#212A31] border transition-all flex flex-col justify-between space-y-4 group relative overflow-hidden ${
                      isJust1PlayEvent
                        ? 'border-[#E5B868]/40 hover:border-[#E5B868] shadow-[0_0_15px_rgba(214,28,36,0.1)]'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {isJust1PlayEvent && (
                      <div className="absolute top-0 right-0 bg-[#E5B868] text-black text-[9px] font-black uppercase px-2.5 py-0.5 rounded-bl-xl tracking-wider">
                        Just1Play Sync
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-extrabold text-white group-hover:text-[#E5B868] transition-colors line-clamp-2">
                          {event.summary}
                        </h4>
                      </div>

                      <div className="space-y-1 text-xs text-slate-400 font-mono">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#E5B868] shrink-0" />
                          <span>{formattedDate} • {formattedTime}</span>
                        </div>

                        {event.location && (
                          <div className="flex items-center gap-1.5 line-clamp-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>{event.location}</span>
                          </div>
                        )}
                      </div>

                      {event.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 pt-1">
                          {event.description}
                        </p>
                      )}
                    </div>

                    {/* EVENT FOOTER & ACTIONS */}
                    <div className="pt-3 border-t border-slate-900 flex items-center justify-between text-xs">
                      {event.htmlLink ? (
                        <a
                          href={event.htmlLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-bold text-slate-400 hover:text-[#E5B868] flex items-center gap-1 transition-colors"
                        >
                          <span>Open in Google</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span />
                      )}

                      {/* DELETE ACTION BUTTON */}
                      <button
                        type="button"
                        onClick={() => setDeletingEvent(event)}
                        className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-500/10 cursor-pointer"
                        title="Delete event from Google Calendar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CREATE EVENT MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#212A31] border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl relative"
            >
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute top-6 right-6 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <Plus className="w-5 h-5 text-[#E5B868]" />
                  <span>Create Google Calendar Event</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Add a new sports event, team practice, or media shoot to Google Calendar.
                </p>
              </div>

              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 uppercase">Event Title / Summary</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Championship Game vs West Coast Eagles"
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                    className="w-full bg-[#212A31] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E5B868]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1 sm:col-span-1">
                    <label className="text-xs font-bold text-slate-300 uppercase">Date</label>
                    <input
                      type="date"
                      required
                      value={newEventDate}
                      onChange={(e) => setNewEventDate(e.target.value)}
                      className="w-full bg-[#212A31] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E5B868]"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-1">
                    <label className="text-xs font-bold text-slate-300 uppercase">Start Time</label>
                    <input
                      type="time"
                      required
                      value={newEventStartTime}
                      onChange={(e) => setNewEventStartTime(e.target.value)}
                      className="w-full bg-[#212A31] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E5B868]"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-1">
                    <label className="text-xs font-bold text-slate-300 uppercase">End Time</label>
                    <input
                      type="time"
                      required
                      value={newEventEndTime}
                      onChange={(e) => setNewEventEndTime(e.target.value)}
                      className="w-full bg-[#212A31] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E5B868]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 uppercase">Venue / Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Levi's Stadium, Field A, Santa Clara, CA"
                    value={newEventLocation}
                    onChange={(e) => setNewEventLocation(e.target.value)}
                    className="w-full bg-[#212A31] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E5B868]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 uppercase">Description / Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Game details, roster rules, broadcast links..."
                    value={newEventDescription}
                    onChange={(e) => setNewEventDescription(e.target.value)}
                    className="w-full bg-[#212A31] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E5B868]"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl bg-[#212A31] border border-slate-800 text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isCreating}
                    className="px-5 py-2 rounded-xl bg-[#E5B868] text-black font-black text-xs uppercase hover:bg-[#B8141B] transition-colors cursor-pointer flex items-center gap-2"
                  >
                    {isCreating ? 'Adding...' : 'Create Event'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MANDATORY USER CONFIRMATION DIALOG FOR EVENT DELETION */}
      <AnimatePresence>
        {deletingEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#212A31] border border-red-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 shadow-2xl relative"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-black text-white uppercase tracking-tight">
                  Confirm Event Deletion
                </h3>
                <p className="text-xs text-slate-400">
                  Are you sure you want to permanently delete this event from Google Calendar? This action cannot be undone.
                </p>
              </div>

              {/* EVENT SUMMARY PREVIEW */}
              <div className="p-4 rounded-2xl bg-[#212A31] border border-slate-800 space-y-1 text-xs">
                <div className="font-extrabold text-white">{deletingEvent.summary}</div>
                {deletingEvent.start?.dateTime && (
                  <div className="text-slate-400 font-mono">
                    {new Date(deletingEvent.start.dateTime).toLocaleString()}
                  </div>
                )}
                {deletingEvent.location && (
                  <div className="text-slate-500">{deletingEvent.location}</div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingEvent(null)}
                  className="px-4 py-2.5 rounded-xl bg-[#212A31] border border-slate-800 text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2"
                >
                  {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Universal AI Schedule Importer Modal */}
      <UniversalScheduleImporterModal
        isOpen={showAiImporterModal}
        onClose={() => setShowAiImporterModal(false)}
        teamId={user?.uid ? `team_${user.uid}` : 'team_demo_1'}
        teamName={user?.displayName ? `${user.displayName}'s Team` : 'Just1Play Varsity Team'}
        sport="Flag Football"
        onSuccess={(games) => {
          setSuccessMsg(`Successfully imported ${games.length} games to team schedule!`);
          setTimeout(() => setSuccessMsg(null), 5000);
        }}
      />
    </div>
  );
};

export default GoogleCalendarHub;
