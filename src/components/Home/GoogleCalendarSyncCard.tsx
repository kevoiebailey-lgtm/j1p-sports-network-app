import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Sparkles, 
  ExternalLink, 
  AlertCircle, 
  RefreshCw,
  Zap,
  CalendarCheck
} from 'lucide-react';
import { 
  signInWithGoogleCalendar, 
  getCalendarAccessToken, 
  createCalendarEvent 
} from '../../lib/googleCalendarService';

interface EventItem {
  id: string;
  title: string;
  sport: string;
  venue: string;
  location: string;
  startISO: string;
  endISO: string;
  description: string;
}

const UPCOMING_SPORTS_EVENTS: EventItem[] = [
  {
    id: 'evt-1',
    title: 'Tri-State Showcase Finals: NJ Scholars vs PSA Cardinals',
    sport: 'Basketball',
    venue: 'Hoop Group Metro Arena',
    location: '120 Tournament Way, East Hanover, NJ',
    startISO: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days from now
    endISO: new Date(Date.now() + 86400000 * 2 + 7200000).toISOString(),
    description: 'Championship finals with Division 1 recruiters and scouts in attendance.'
  },
  {
    id: 'evt-2',
    title: 'Gotham Valkyries Girls Flag Football Regional Combine',
    sport: "Girls' Flag Football",
    venue: 'Bergen Catholic Sports Complex',
    location: '1040 Oradell Ave, Oradell, NJ',
    startISO: new Date(Date.now() + 86400000 * 4).toISOString(), // 4 days from now
    endISO: new Date(Date.now() + 86400000 * 4 + 10800000).toISOString(),
    description: '40-yard dash, speed drills, and 7v7 scrimmage evaluations.'
  },
  {
    id: 'evt-3',
    title: 'NCAA Elite Scout & College Recruiter Showcase',
    sport: 'Football & Basketball',
    venue: 'Total Sports Performance Hub',
    location: '500 Athletics Blvd, Wayne, NJ',
    startISO: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days from now
    endISO: new Date(Date.now() + 86400000 * 7 + 14400000).toISOString(),
    description: 'Live evaluation showcase with verified stats recording for college scouts.'
  }
];

interface GoogleCalendarSyncCardProps {
  onNavigateTab: (tab: any) => void;
}

export const GoogleCalendarSyncCard: React.FC<GoogleCalendarSyncCardProps> = ({ onNavigateTab }) => {
  const [syncedEventIds, setSyncedEventIds] = useState<string[]>([]);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleSyncEvent = async (event: EventItem) => {
    setSyncingId(event.id);
    setStatusMsg(null);

    try {
      let token = getCalendarAccessToken();

      // If no token exists, initiate popup login
      if (!token) {
        const res = await signInWithGoogleCalendar();
        token = res?.accessToken || null;
      }

      if (!token) {
        throw new Error('Google Calendar access token could not be obtained.');
      }

      // Add event to Google Calendar
      await createCalendarEvent(token, {
        summary: `[Just1Play] ${event.title}`,
        description: `${event.description}\n\nSport: ${event.sport}\nVenue: ${event.venue}\nLocation: ${event.location}\nPowered by Just1Play Sports Network`,
        location: `${event.venue}, ${event.location}`,
        startISO: event.startISO,
        endISO: event.endISO
      });

      setSyncedEventIds((prev) => [...prev, event.id]);
      setStatusMsg({
        text: `Successfully synced "${event.title}" to Google Calendar!`,
        type: 'success'
      });
    } catch (err: any) {
      console.error('Failed to sync event to Google Calendar:', err);
      setStatusMsg({
        text: err?.message || 'Failed to sync to Google Calendar. Please try again.',
        type: 'error'
      });
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-[#263238] border border-slate-200 dark:border-[#37474F] rounded-3xl p-5 sm:p-6 backdrop-blur-md shadow-md space-y-4 transition-colors">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-[#37474F] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-[#FF6A00]/15 border border-[#FF6A00]/30 text-[#FF6A00]">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[#263238] dark:text-white font-bold text-sm uppercase tracking-wider font-mono flex items-center gap-2">
              <span>Upcoming Showcase Schedule</span>
              <span className="text-[10px] bg-[#FF6A00]/15 text-[#FF6A00] border border-[#FF6A00]/40 font-bold px-2 py-0.5 rounded-full font-mono">
                Google Calendar Sync
              </span>
            </h3>
            <p className="text-slate-500 dark:text-slate-300 text-xs font-semibold">
              Tap 'Sync to My Calendar' to instantly push tournament dates to your personal Google schedule.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigateTab('calendar')}
          className="shrink-0 text-xs font-mono text-[#FF6A00] hover:underline uppercase flex items-center gap-1 cursor-pointer font-bold"
        >
          <span>Open Full Calendar Hub &rarr;</span>
        </button>
      </div>

      {/* FEEDBACK BANNER */}
      {statusMsg && (
        <div
          className={`p-3 rounded-2xl border text-xs font-medium flex items-center gap-2 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-300'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* EVENTS LIST */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {UPCOMING_SPORTS_EVENTS.map((event) => {
          const isSynced = syncedEventIds.includes(event.id);
          const isSyncing = syncingId === event.id;
          const startDate = new Date(event.startISO);

          return (
            <div
              key={event.id}
              className="bg-slate-50 dark:bg-[#1E282D] p-4 rounded-2xl border border-slate-200 dark:border-[#37474F] hover:border-[#FF6A00] transition-all flex flex-col justify-between space-y-3 shadow-xs"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white dark:bg-[#263238] border border-slate-200 dark:border-[#37474F] text-[#FF6A00]">
                    {event.sport}
                  </span>

                  <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  </span>
                </div>

                <h4 className="text-[#263238] dark:text-white font-bold text-sm line-clamp-2 leading-snug">
                  {event.title}
                </h4>

                <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{event.venue}</span>
                </p>
              </div>

              {/* ACTION BUTTON */}
              {isSynced ? (
                <div className="w-full py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold font-mono uppercase flex items-center justify-center gap-1.5">
                  <CalendarCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Synced to Google Calendar</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSyncEvent(event)}
                  disabled={isSyncing}
                  className="w-full py-2 rounded-xl bg-white dark:bg-[#263238] hover:bg-[#FF6A00] text-[#263238] dark:text-white hover:text-white border border-slate-200 dark:border-[#37474F] hover:border-[#FF6A00] text-[11px] font-bold font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 group"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 text-[#FF6A00] animate-spin" />
                      <span>Syncing...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5 text-[#FF6A00] group-hover:text-white" />
                      <span>Sync to My Calendar</span>
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
