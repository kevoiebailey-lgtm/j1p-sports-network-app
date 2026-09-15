import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clock, 
  MapPin, 
  Trophy, 
  ArrowUpRight, 
  Calendar, 
  ArrowRight,
  Shield, 
  Activity, 
  Navigation,
  Sparkles,
  Zap,
  AlertTriangle
} from 'lucide-react';
import { 
  ScheduledMatch, 
  subscribeToNextScheduledMatch, 
  fetchNextScheduledMatch,
  isWithin48Hours 
} from '../../services/scheduleService';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export interface GamedayHUDProps {
  athleteId?: string;
  teamId?: string;
  teamName?: string;
  userProfile?: any;
  initialMatch?: ScheduledMatch | null;
  onViewSchedule?: () => void;
  className?: string;
}

export const GamedayHUD: React.FC<GamedayHUDProps> = ({
  athleteId,
  teamId,
  teamName,
  userProfile,
  initialMatch,
  onViewSchedule,
  className = ''
}) => {
  const navigate = useNavigate();
  const [match, setMatch] = useState<ScheduledMatch | null>(initialMatch || null);
  const [loading, setLoading] = useState<boolean>(!initialMatch);
  
  // Real-time Countdown State
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    isLive: boolean;
  }>({
    hours: 2,
    minutes: 42,
    seconds: 47,
    isLive: false
  });

  // Active Court/Facility Broadcast Alert from Firestore
  const [activeAlert, setActiveAlert] = useState<{
    text: string;
    targetScope: string;
    timestamp?: string;
  } | null>(null);

  // Subscribe to real-time targeted alerts
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'broadcasts'), orderBy('createdAt', 'desc'), limit(5));
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          for (const docSnap of snap.docs) {
            const data = docSnap.data();
            if (data.status === 'active' && (data.isUrgent || data.urgent)) {
              const scope = data.targetScope || 'all';
              // Check if relevant to this athlete's scheduled match court
              const matchCourt = match?.court?.toLowerCase() || '';
              const isRelevant =
                scope === 'all' ||
                !matchCourt ||
                matchCourt.includes(scope.toLowerCase()) ||
                scope.toLowerCase().includes(matchCourt);

              if (isRelevant) {
                setActiveAlert({
                  text: data.text,
                  targetScope: scope,
                  timestamp: data.timestamp
                });
                return;
              }
            }
          }
        }
        setActiveAlert(null);
      },
      (err) => {
        console.warn('GamedayHUD broadcast alert listener fallback:', err);
      }
    );

    return () => unsub();
  }, [match?.court]);

  // Subscribe to real-time scheduled match
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const unsubscribe = subscribeToNextScheduledMatch(
      { athleteId, teamId, teamName, userProfile },
      (liveMatch) => {
        if (!isMounted) return;
        setMatch(liveMatch);
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [athleteId, teamId, teamName, userProfile]);

  // High-precision countdown timer based on target kickoff time
  useEffect(() => {
    if (!match?.scheduledTime) {
      // Fallback ticking simulation starting at 02:42:47
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
          if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
          if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
          return { hours: 0, minutes: 0, seconds: 0, isLive: true };
        });
      }, 1000);
      return () => clearInterval(timer);
    }

    const calculateRemaining = () => {
      const targetMs = new Date(match.scheduledTime).getTime();
      const nowMs = Date.now();
      const diffMs = targetMs - nowMs;

      if (diffMs <= 0) {
        // Game is currently live or in progress
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isLive: true });
        return;
      }

      const totalSeconds = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setTimeLeft({ hours, minutes, seconds, isLive: false });
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);
    return () => clearInterval(interval);
  }, [match?.scheduledTime]);

  const handleNavigateSchedule = () => {
    if (onViewSchedule) {
      onViewSchedule();
    } else {
      navigate('/dashboard/athlete/schedule');
    }
  };

  // Construct Google Maps search query URL
  const getMapsUrl = (venueName: string, venueAddress: string) => {
    const query = [venueName, venueAddress].filter(Boolean).join(', ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  };

  // Format display game time
  const formatGameTime = (timeStr?: string) => {
    if (!timeStr) return '10:30 AM PST';
    try {
      const d = new Date(timeStr);
      if (isNaN(d.getTime())) return timeStr;
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch {
      return '10:30 AM PST';
    }
  };

  // FALLBACK STATE: If no upcoming match is scheduled within 48 hours
  if (!loading && !match) {
    return (
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c1527] via-[#090e1a] to-[#0d1b2a] border border-white/[0.12] shadow-[0_10px_35px_rgba(0,0,0,0.6)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] p-6 sm:p-7 ${className}`}>
        {/* Specular Ambient Glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#00F0D0]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                Gameday Telemetry • Standby Mode
              </span>
            </div>
            
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Trophy className="w-6 h-6 text-amber-400 shrink-0" />
              No Active Matches Today
            </h2>
            
            <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
              No tournament or showcase matches are scheduled for your roster within the 48-hour gameday window. Check team standings, court brackets, or your full season schedule.
            </p>
          </div>

          <button
            onClick={handleNavigateSchedule}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#00B8D4] to-[#00F0D0] text-slate-950 font-black text-xs uppercase tracking-wider hover:brightness-110 shadow-[0_0_20px_rgba(0,240,208,0.3)] transition-all cursor-pointer shrink-0 active:scale-[0.97]"
          >
            <Calendar className="w-4 h-4 text-slate-950" />
            <span>View Full Season Schedule</span>
            <ArrowRight className="w-4 h-4 ml-0.5 text-slate-950" />
          </button>
        </div>
      </div>
    );
  }

  // ACTIVE MATCH HUD DISPLAY
  return (
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c1527] via-[#090e1a] to-[#0d1b2a] border border-[#00F0D0]/30 shadow-[0_10px_35px_rgba(0,0,0,0.6)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] p-5 sm:p-6 ${className}`}>
      {/* Cyber glow ambient orb */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-[#00F0D0]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-4">
        
        {/* Top Match Header Info */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00F0D0] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00F0D0]" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#00F0D0] font-mono">
              Next Scheduled Match
            </span>
            {match?.status && match.status !== 'Upcoming' && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase font-mono">
                {match.status}
              </span>
            )}
          </div>
          <span className="text-xs font-semibold text-slate-300 font-mono">
            {match?.tournamentName || 'National Championship Showcase'}
          </span>
        </div>

        {/* Active Targeted Court/Field Broadcast Alert */}
        {activeAlert && (
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs shadow-lg animate-fadeIn">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
              <span className="font-mono font-black text-amber-300 uppercase px-1.5 py-0.5 rounded bg-black/40 border border-amber-500/30 text-[10px] shrink-0">
                {activeAlert.targetScope === 'all' ? 'Facility Alert' : activeAlert.targetScope}
              </span>
              <span className="font-medium text-white truncate">{activeAlert.text}</span>
            </div>
            {activeAlert.timestamp && (
              <span className="text-[10px] font-mono text-amber-300/80 shrink-0">{activeAlert.timestamp}</span>
            )}
          </div>
        )}

        {/* Matchup VS Display & Countdown Box */}
        <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 py-1">
          
          {/* Teams VS Box */}
          <div className="md:col-span-2 flex items-center justify-between sm:justify-start sm:gap-6 bg-[#12151C]/90 rounded-2xl p-4 border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
            {/* My Team */}
            <div className="text-left min-w-0 flex-1 sm:flex-initial">
              <div className="text-xs font-bold text-[#00F0D0] uppercase tracking-wide font-mono flex items-center gap-1">
                <span>My Team</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#00F0D0]" />
              </div>
              <div className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                {match?.teamName || teamName || 'California Golden Bears'}
              </div>
              <div className="text-[11px] text-slate-300 font-mono">
                {match?.homeOrAway || 'Home'} • {match?.seed || 'Seed #1'}
              </div>
            </div>

            {/* Specular VS Badge */}
            <div className="px-3.5 py-1.5 rounded-xl bg-slate-800/90 border border-white/15 text-white font-black text-sm shadow-md font-mono shrink-0">
              VS
            </div>

            {/* Opponent Team */}
            <div className="text-right sm:text-left min-w-0 flex-1 sm:flex-initial">
              <div className="text-xs font-bold text-[#FFB800] uppercase tracking-wide font-mono flex items-center justify-end sm:justify-start gap-1">
                <span>Opponent</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFB800]" />
              </div>
              <div className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                {match?.opponent || 'Las Vegas Lightning'}
              </div>
              <div className="text-[11px] text-slate-300 font-mono">
                Away • {match?.opponentSeed || 'Seed #4'}
              </div>
            </div>
          </div>

          {/* Countdown Clock Box (Preserving 02:42:47 Monospace Telemetry & Specular Physics) */}
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-b from-[#12151C] to-[#0c1527] border border-[#00F0D0]/25 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-bold mb-1">
              <Clock className="w-3.5 h-3.5 text-[#00F0D0]" />
              <span>{timeLeft.isLive ? 'Match Status' : 'Kickoff Countdown'}</span>
            </div>

            {timeLeft.isLive ? (
              <div className="flex items-center gap-2 font-mono font-black text-xl text-[#00F0D0] tracking-wider animate-pulse py-1">
                <span className="w-2 h-2 rounded-full bg-[#00F0D0]" />
                <span>LIVE ON FIELD</span>
              </div>
            ) : (
              <div 
                id="gameday-countdown-clock"
                className="flex items-center gap-1 sm:gap-2 font-mono font-black text-2xl sm:text-3xl text-white tracking-widest select-none"
              >
                <span className="bg-black/40 px-2 py-0.5 rounded-lg border border-white/10">
                  {String(timeLeft.hours).padStart(2, '0')}
                </span>
                <span className="text-[#00F0D0] animate-pulse">:</span>
                <span className="bg-black/40 px-2 py-0.5 rounded-lg border border-white/10">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </span>
                <span className="text-[#00F0D0] animate-pulse">:</span>
                <span className="bg-black/40 px-2 py-0.5 rounded-lg border border-white/10">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
              </div>
            )}

            <div className="text-[11px] text-slate-300 font-semibold mt-1.5 font-mono">
              Target Arrival: <span className="text-[#00F0D0] font-bold">{match?.arrivalTime || '9:45 AM'}</span>
            </div>
          </div>

        </div>

        {/* Court #, Game Time & Ergonomic Venue Location Card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
          
          {/* Court Assignment */}
          <div className="flex items-center gap-3 bg-[#12151C]/90 rounded-2xl p-3.5 border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
            <div className="p-2.5 rounded-xl bg-[#00F0D0]/10 text-[#00F0D0] border border-[#00F0D0]/20 shrink-0">
              <Trophy className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-slate-400 font-bold uppercase font-mono">Court Assignment</div>
              <div className="font-extrabold text-white text-sm truncate">{match?.court || 'Court 2 (North Field)'}</div>
            </div>
          </div>

          {/* Game Time */}
          <div className="flex items-center gap-3 bg-[#12151C]/90 rounded-2xl p-3.5 border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
            <div className="p-2.5 rounded-xl bg-[#FFB800]/10 text-[#FFB800] border border-[#FFB800]/20 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-slate-400 font-bold uppercase font-mono">Game Time</div>
              <div className="font-extrabold text-white text-sm truncate">{formatGameTime(match?.scheduledTime)}</div>
            </div>
          </div>

          {/* VENUE LOCATION CARD: Ergonomic Wrap & Direct Google Maps Platform Interaction */}
          <a 
            id="gameday-venue-location-card"
            href={getMapsUrl(match?.venueName || 'Prime Athletics Center', match?.venueAddress || '10800 Olympic Blvd, Los Angeles, CA')}
            target="_blank" 
            rel="noopener noreferrer"
            title={`Open ${match?.venueName || 'Prime Athletics Center'} in Google Maps`}
            className="group flex items-center justify-between gap-2.5 bg-[#12151C]/90 hover:bg-[#1A202C] rounded-2xl p-3.5 border border-white/[0.08] hover:border-[#00F0D0]/50 text-slate-200 transition-all duration-200 cursor-pointer shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:shadow-[0_0_20px_rgba(0,240,208,0.15)] active:scale-[0.98]"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="p-2.5 rounded-xl bg-[#00F0D0]/10 text-[#00F0D0] border border-[#00F0D0]/20 group-hover:bg-[#00F0D0] group-hover:text-slate-950 transition-colors shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] text-slate-400 font-bold uppercase font-mono flex items-center gap-1">
                  <span>Venue Location</span>
                  <span className="text-[9px] text-[#00F0D0] group-hover:underline">• Open Map</span>
                </div>
                {/* Solves awkward truncation: allows full title to wrap cleanly and display legibly */}
                <div className="font-extrabold text-white text-sm leading-snug group-hover:text-[#00F0D0] transition-colors break-words">
                  {match?.venueName || 'Prime Athletics Center'}
                </div>
                {match?.venueAddress && (
                  <div className="text-[10px] text-slate-300 font-mono truncate max-w-full">
                    {match.venueAddress}
                  </div>
                )}
              </div>
            </div>
            
            <div className="w-7 h-7 rounded-lg bg-white/5 group-hover:bg-[#00F0D0]/20 flex items-center justify-center text-slate-400 group-hover:text-[#00F0D0] transition-colors shrink-0">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </a>

        </div>

      </div>
    </div>
  );
};

export default GamedayHUD;
