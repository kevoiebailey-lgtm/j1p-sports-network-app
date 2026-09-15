import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  Users,
  Trophy,
  Play,
  Calendar,
  Sparkles,
  CheckCircle2,
  Lock,
  Eye,
  Radio,
  Clock,
  Star,
  Activity,
  ChevronRight,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { collection, query, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserProfile, EventItem } from '../../types';

export const FanFeedDashboardView: React.FC = () => {
  // Track followed athlete UIDs locally
  const [followedAthleteUids, setFollowedAthleteUids] = useState<string[]>([]);
  const [followedTeams, setFollowedTeams] = useState<string[]>(['Edison Eagles Varsity', 'Jersey City Ballers']);
  const [athletes, setAthletes] = useState<UserProfile[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    const unsubUsers = onSnapshot(
      query(collection(db, 'users'), limit(20)),
      (snap) => {
        if (!snap.empty) {
          const list: UserProfile[] = snap.docs.map((d) => ({
            uid: d.id,
            ...d.data()
          })) as UserProfile[];
          setAthletes(list);
        } else {
          setAthletes([]);
        }
        setLoading(false);
      },
      (err) => {
        console.warn('Error fetching athletes for fan feed:', err);
        setAthletes([]);
        setLoading(false);
      }
    );

    const unsubEvents = onSnapshot(
      query(collection(db, 'events'), limit(10)),
      (snap) => {
        if (!snap.empty) {
          const list: EventItem[] = snap.docs.map((d) => ({
            id: d.id,
            ...d.data()
          })) as EventItem[];
          setEvents(list);
        } else {
          setEvents([]);
        }
      },
      (err) => {
        console.warn('Error fetching events for fan feed:', err);
        setEvents([]);
      }
    );

    return () => {
      unsubUsers();
      unsubEvents();
    };
  }, []);

  const handleToggleFollowAthlete = (uid: string, name: string) => {
    if (followedAthleteUids.includes(uid)) {
      setFollowedAthleteUids(followedAthleteUids.filter((id) => id !== uid));
      setToastMessage(`Unfollowed ${name}`);
    } else {
      setFollowedAthleteUids([...followedAthleteUids, uid]);
      setToastMessage(`Now following ${name}! Your fan feed updated.`);
    }
    setTimeout(() => setToastMessage(null), 2500);
  };

  const followedAthletesList = athletes.filter((a) =>
    followedAthleteUids.includes(a.uid)
  );

  return (
    <div className="space-y-8 font-sans text-slate-100 max-w-7xl mx-auto px-4 py-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 p-4 rounded-2xl bg-slate-600 text-black font-black text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(6,182,212,0.6)] flex items-center gap-2 animate-bounce">
          <Heart className="w-5 h-5 fill-current" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Fan Spectator Header */}
      <div className="relative rounded-3xl bg-[#212A31] border border-white/15 p-6 sm:p-8 overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-slate-700/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-700/10 border border-cyan-500/30 text-slate-300 text-xs font-mono font-bold">
            <Heart className="w-4 h-4 text-slate-300 fill-current" />
            <span>PERSONALIZED SPECTATOR & FAN FEED</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tight text-white font-sans">
            Fan & Parent <span className="text-slate-300">Live Hub</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 font-mono max-w-2xl">
            Follow your favorite student-athletes, track real-time score updates, view verified game schedules, and watch high-definition video highlights.
          </p>

          <div className="pt-2 flex items-center gap-3 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1 text-red-500 font-bold">
              <Lock className="w-3.5 h-3.5" /> Read-Only Fan Mode
            </span>
            <span>•</span>
            <span>Stat-Editing Disabled</span>
            <span>•</span>
            <span className="text-[#E5B868] font-bold">Live Stream Ready</span>
          </div>
        </div>
      </div>

      {/* Follow Athletes Horizontal Bar */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black italic uppercase text-white font-sans flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-300" />
            <span>Follow Tri-State Athletes</span>
          </h2>
          <span className="text-xs font-mono text-slate-300 font-bold">
            {followedAthleteUids.length} Athletes Followed
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {athletes.map((athlete) => {
            const isFollowing = followedAthleteUids.includes(athlete.uid);

            return (
              <div
                key={athlete.uid}
                className="p-4 rounded-2xl bg-[#212A31]/80 border border-white/10 hover:border-[#E5B868]/40 transition-all flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-black shrink-0 border border-white/20">
                    <img
                      src={athlete.avatarUrl}
                      alt={athlete.displayName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <Link
                      to={`/athlete/${athlete.uid}`}
                      className="text-xs font-bold text-white hover:text-slate-300 truncate block font-sans"
                    >
                      {athlete.displayName}
                    </Link>
                    <span className="text-[10px] font-mono text-slate-400 block">
                      #{athlete.jerseyNumber} • {athlete.sport}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleFollowAthlete(athlete.uid, athlete.displayName)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                    isFollowing
                      ? 'bg-[#E5B868]/20 border border-cyan-400 text-cyan-300'
                      : 'bg-white/10 hover:bg-white/20 border border-white/20 text-white'
                  }`}
                >
                  <Heart className={`w-3 h-3 ${isFollowing ? 'fill-current text-slate-300' : ''}`} />
                  <span>{isFollowing ? 'FOLLOWING' : 'FOLLOW'}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Scores & Followed Game Schedule (Read-Only) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Followed Athletes Stream Feed */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-black italic uppercase text-white font-sans flex items-center gap-2">
            <Radio className="w-5 h-5 text-red-500 animate-pulse" />
            <span>Followed Athlete Highlights & Activity Feed</span>
          </h2>

          <div className="space-y-4">
            {followedAthletesList.map((athlete) => (
              <div
                key={athlete.uid}
                className="p-5 rounded-3xl bg-[#212A31]/80 border border-white/10 hover:border-white/20 transition-all space-y-4"
              >
                {/* Athlete Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={athlete.avatarUrl}
                      alt={athlete.displayName}
                      className="w-10 h-10 rounded-full object-cover border border-[#E5B868]"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/athlete/${athlete.uid}`}
                          className="font-black text-sm text-white hover:text-[#E5B868]"
                        >
                          {athlete.displayName}
                        </Link>
                        {athlete.isVerified && (
                          <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-[#E5B868]/20 text-[#E5B868] border border-[#E5B868]/40 rounded-full">
                            VERIFIED
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-slate-400">
                        {athlete.highSchool || 'High School'} ({athlete.state}) • {athlete.position}
                      </p>
                    </div>
                  </div>

                  <Link
                    to={`/athlete/${athlete.uid}`}
                    className="px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-xs font-mono text-white flex items-center gap-1"
                  >
                    <span>View Profile</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#E5B868]" />
                  </Link>
                </div>

                {/* Highlight Reel Embed / Cover */}
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-white/10 group">
                  <img
                    src={athlete.photoURL || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=800'}
                    alt={athlete.displayName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#212A31] via-[#212A31]/20 to-transparent" />

                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-mono font-bold text-[#E5B868]">
                        {athlete.sport} Official Highlight Reel
                      </div>
                      <div className="text-sm font-bold text-white">
                        PPG: {(athlete.stats as any)?.points || 24.5} | APG: {(athlete.stats as any)?.assists || 8.2} | RPG: {(athlete.stats as any)?.rebounds || 6.1}
                      </div>
                    </div>

                    <div className="w-10 h-10 rounded-full bg-[#E5B868] text-black flex items-center justify-center shadow-lg shrink-0">
                      <Play className="w-5 h-5 ml-0.5 fill-current" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Verified Upcoming Tournament Events (Read-Only) */}
        <div className="space-y-4">
          <h2 className="text-lg font-black italic uppercase text-white font-sans flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#E5B868]" />
            <span>Upcoming Tournaments</span>
          </h2>

          <div className="space-y-3">
            {events.slice(0, 3).map((event) => (
              <div
                key={event.id}
                className="p-4 rounded-2xl bg-[#212A31]/80 border border-white/10 hover:border-white/20 transition-all space-y-2"
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span className="text-[#E5B868] font-bold uppercase">{event.eventType}</span>
                  <span>{event.date}</span>
                </div>

                <h3 className="font-bold text-sm text-white">{event.title}</h3>

                <p className="text-xs font-mono text-slate-300">
                  📍 {event.location}, {event.state}
                </p>

                <Link
                  to={`/events/${event.id}`}
                  className="mt-2 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold rounded-xl flex items-center justify-center gap-2 transition-all block text-center"
                >
                  <span>View Official Brackets & Scores</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
