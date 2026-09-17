import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Trophy, 
  Zap, 
  Plus, 
  CalendarPlus, 
  ExternalLink,
  Users,
  CheckCircle2,
  Filter,
  X
} from 'lucide-react';
import { ShowcaseEvent } from './types';
import { getGoogleCalendarWebUrl } from '../../lib/googleCalendarService';

interface EventCalendarViewProps {
  events: ShowcaseEvent[];
  onSelectEvent: (event: ShowcaseEvent) => void;
  onQuickRegister?: (event: ShowcaseEvent) => void;
  isAuthorizedHost?: boolean;
  onHostNewEvent?: () => void;
  userRegisteredEventIds?: string[];
}

export const EventCalendarView: React.FC<EventCalendarViewProps> = ({
  events,
  onSelectEvent,
  onQuickRegister,
  isAuthorizedHost,
  onHostNewEvent,
  userRegisteredEventIds = []
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ dateStr: string; events: ShowcaseEvent[] } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper to format date string YYYY-MM-DD
  const formatYMD = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayStr = formatYMD(new Date());

  // Navigate months
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Build calendar matrix
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Create array of event lookup by YYYY-MM-DD
  const eventsByDate = new Map<string, ShowcaseEvent[]>();
  events.forEach((evt) => {
    if (!evt.date) return;
    // Normalize date (handle ISO or YYYY-MM-DD)
    const dateKey = evt.date.split('T')[0];
    const existing = eventsByDate.get(dateKey) || [];
    eventsByDate.set(dateKey, [...existing, evt]);
  });

  // Calendar cells
  const calendarCells: Array<{
    dayNumber: number;
    dateStr: string;
    isCurrentMonth: boolean;
    isToday: boolean;
    dayEvents: ShowcaseEvent[];
  }> = [];

  // Previous month filler days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const prevDate = new Date(year, month - 1, dayNum);
    const dateStr = formatYMD(prevDate);
    calendarCells.push({
      dayNumber: dayNum,
      dateStr,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      dayEvents: eventsByDate.get(dateStr) || []
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const currDate = new Date(year, month, d);
    const dateStr = formatYMD(currDate);
    calendarCells.push({
      dayNumber: d,
      dateStr,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      dayEvents: eventsByDate.get(dateStr) || []
    });
  }

  // Next month filler days (to fill 35 or 42 grid slots)
  const remainingCells = 42 - calendarCells.length;
  if (remainingCells < 7 || calendarCells.length < 35) {
    const fillCount = calendarCells.length <= 35 ? 35 - calendarCells.length : 42 - calendarCells.length;
    for (let n = 1; n <= fillCount; n++) {
      const nextDate = new Date(year, month + 1, n);
      const dateStr = formatYMD(nextDate);
      calendarCells.push({
        dayNumber: n,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        dayEvents: eventsByDate.get(dateStr) || []
      });
    }
  }

  const getSportColor = (sport: string) => {
    switch (sport?.toLowerCase()) {
      case 'football':
      case 'girls flag football':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'basketball':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      case 'track & field':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'lacrosse':
      case 'soccer':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      default:
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
    }
  };

  const handleCellClick = (cell: typeof calendarCells[0]) => {
    if (cell.dayEvents.length > 0) {
      setSelectedDayEvents({
        dateStr: cell.dateStr,
        events: cell.dayEvents
      });
    } else {
      setSelectedDayEvents(null);
    }
  };

  const handleQuickGoogleCalendar = (e: React.MouseEvent, evt: ShowcaseEvent) => {
    e.stopPropagation();
    const safeTime = evt?.time || '09:00 AM - 05:00 PM';
    const url = getGoogleCalendarWebUrl({
      id: evt?.id || 'event',
      title: evt?.title || 'Showcase Event',
      description: `${evt?.description || ''}\n\nVenue: ${evt?.location || evt?.venueName || ''}\nHost: ${evt?.organizer || evt?.hostName || ''}`,
      venue: evt?.location || evt?.venueName || '',
      date: evt?.date || '',
      startTime: safeTime.split(' - ')[0] || '09:00 AM'
    });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      
      {/* Calendar Header / Controls */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#263238]/60 border border-[#24324F] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        
        {/* Month Title & Nav */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#00B8D4]/15 border border-[#00B8D4]/30 flex items-center justify-center text-[#00B8D4]">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
              {monthNames[month]} {year}
            </h2>
            <span className="text-xs font-mono text-slate-400">
              {events.filter(e => e.date?.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).length} Scheduled Events this Month
            </span>
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3.5 py-2 rounded-xl bg-[#090D16] hover:bg-[#24324F] border border-[#24324F] text-xs font-mono font-bold text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            Today
          </button>
          <div className="flex items-center bg-[#090D16] border border-[#24324F] rounded-xl p-1">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#24324F] transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#24324F] transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Main Grid Calendar Container */}
      <div className="rounded-3xl bg-[#263238]/40 border border-[#24324F] p-3 sm:p-5 shadow-2xl overflow-hidden">
        
        {/* Day of Week Headers */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
            <div
              key={day}
              className={`py-2 text-[11px] font-mono font-black uppercase tracking-wider ${
                idx === 0 || idx === 6 ? 'text-[#FF6A00]' : 'text-slate-400'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Matrix Cells */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {calendarCells.map((cell, idx) => {
            const hasEvents = cell.dayEvents.length > 0;
            const isSelected = selectedDayEvents?.dateStr === cell.dateStr;

            return (
              <motion.div
                key={`${cell.dateStr}-${idx}`}
                onClick={() => handleCellClick(cell)}
                whileHover={{ scale: 1.01 }}
                className={`min-h-[85px] sm:min-h-[115px] p-2 rounded-2xl border transition-all flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-[#00B8D4]/15 border-[#00B8D4] shadow-[0_0_15px_rgba(0,184,212,0.3)]'
                    : cell.isToday
                    ? 'bg-[#090D16] border-[#00F5D4] shadow-[0_0_10px_rgba(0,245,212,0.2)]'
                    : cell.isCurrentMonth
                    ? hasEvents
                      ? 'bg-[#0B1220] border-[#24324F] hover:border-[#00B8D4]/60'
                      : 'bg-[#090D16]/70 border-[#24324F]/50 hover:border-[#24324F]'
                    : 'bg-black/40 border-transparent opacity-40 hover:opacity-75'
                }`}
              >
                {/* Cell Header: Date Number & Event Counter */}
                <div className="flex items-center justify-between">
                  <span
                    className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-mono font-black ${
                      cell.isToday
                        ? 'bg-[#00F5D4] text-[#090D16]'
                        : isSelected
                        ? 'bg-[#00B8D4] text-[#090D16]'
                        : cell.isCurrentMonth
                        ? 'text-slate-200'
                        : 'text-slate-500'
                    }`}
                  >
                    {cell.dayNumber}
                  </span>

                  {hasEvents && (
                    <span className="px-1.5 py-0.5 rounded-md bg-[#FF6A00]/20 border border-[#FF6A00]/40 text-[#FF6A00] text-[9px] font-mono font-bold">
                      {cell.dayEvents.length} {cell.dayEvents.length === 1 ? 'evt' : 'evts'}
                    </span>
                  )}
                </div>

                {/* Event Pills inside Day Cell */}
                <div className="space-y-1 mt-1 flex-1 overflow-hidden">
                  {cell.dayEvents.slice(0, 2).map((evt) => (
                    <div
                      key={evt.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(evt);
                      }}
                      className={`px-1.5 py-0.5 rounded-lg border text-[9px] sm:text-[10px] font-bold truncate leading-tight transition-transform hover:scale-102 flex items-center gap-1 ${getSportColor(evt.sport)}`}
                      title={`${evt.title} • ${evt.sport} (${evt.time})`}
                    >
                      <span className="truncate">{evt.title}</span>
                    </div>
                  ))}

                  {cell.dayEvents.length > 2 && (
                    <span className="text-[9px] font-mono font-bold text-slate-400 block pl-1">
                      +{cell.dayEvents.length - 2} more
                    </span>
                  )}
                </div>

              </motion.div>
            );
          })}
        </div>

      </div>

      {/* Selected Day Inspector Drawer / Details */}
      <AnimatePresence>
        {selectedDayEvents && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="p-5 sm:p-6 rounded-3xl bg-[#263238] border border-[#00B8D4]/50 shadow-[0_15px_40px_rgba(0,0,0,0.8)] space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#24324F] pb-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-[#00F5D4]" />
                <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                  Events on {selectedDayEvents.dateStr}
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-[#00B8D4]/20 text-[#00B8D4] text-xs font-mono font-bold">
                  {selectedDayEvents.events.length} {selectedDayEvents.events.length === 1 ? 'Event' : 'Events'}
                </span>
              </div>

              <button
                onClick={() => setSelectedDayEvents(null)}
                className="w-8 h-8 rounded-full bg-[#090D16] hover:bg-[#24324F] text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedDayEvents.events.map((evt) => {
                const isRegistered = userRegisteredEventIds.includes(evt.id) || evt.registeredUserIds?.length > 0;
                return (
                  <div
                    key={evt.id}
                    onClick={() => onSelectEvent(evt)}
                    className="p-4 rounded-2xl bg-[#090D16] border border-[#24324F] hover:border-[#00B8D4] transition-all space-y-3 cursor-pointer group shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-lg bg-[#00B8D4]/15 border border-[#00B8D4]/30 text-[#00B8D4] text-[10px] font-mono font-black uppercase">
                        {evt.category}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {evt.sport}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-black text-white uppercase group-hover:text-[#00B8D4] transition-colors line-clamp-1">
                        {evt.title}
                      </h4>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3 text-[#00F5D4]" />
                        <span>{evt.time}</span>
                      </p>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="w-3 h-3 text-[#FF6A00] shrink-0" />
                        <span className="truncate">{evt.venueName || evt.location}, {evt.city}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#24324F]">
                      <span className="text-xs font-black font-mono text-[#00F5D4]">
                        {evt.price === 0 ? 'FREE RSVP' : `$${evt.price}.00`}
                      </span>
                      
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => handleQuickGoogleCalendar(e, evt)}
                          className="p-1.5 rounded-lg bg-[#263238] hover:bg-[#24324F] text-slate-300 hover:text-white"
                          title="Add to Google Calendar"
                        >
                          <CalendarPlus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectEvent(evt);
                          }}
                          className="px-3 py-1 rounded-xl bg-gradient-to-r from-[#00B8D4] to-[#00F5D4] text-[#090D16] font-black text-[11px] uppercase tracking-wider hover:brightness-110"
                        >
                          View Details
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
