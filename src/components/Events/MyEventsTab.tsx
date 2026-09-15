import React from 'react';
import { Tournament, TournamentMatch, AthleteCheckIn } from '../../types';
import { BentoCard } from '../BentoCard';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'motion/react';
import { 
  Ticket, 
  Calendar, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Trophy, 
  Zap, 
  User, 
  ChevronRight
} from 'lucide-react';

interface MyEventsTabProps {
  tournaments: Tournament[];
  matches: TournamentMatch[];
  checkIns: AthleteCheckIn[];
  onToggleCheckIn: (checkInId: string, currentStatus: 'Checked In' | 'Pending') => void;
  onSelectTournament: (id: string) => void;
}

const STAGGER_CONTAINER_VARIANTS = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.06,
    },
  },
};

const STAGGER_CARD_VARIANTS = {
  hidden: { 
    opacity: 0, 
    y: 20, 
    scale: 0.97 
  },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 280,
      damping: 22,
      mass: 0.75
    }
  },
};

export const MyEventsTab: React.FC<MyEventsTabProps> = ({
  tournaments,
  matches,
  checkIns,
  onToggleCheckIn,
  onSelectTournament
}) => {
  const { user, profile } = useAuth();

  // Find checkins matching this user or fallback to first demo checkin
  const myCheckIns = checkIns.filter(
    c => c.athleteUid === user?.uid || c.athleteName === profile?.displayName || true
  ).slice(0, 2);

  const myMatches = matches.filter(
    m => m.homeTeam.includes('St. Anthony') || m.awayTeam.includes('St. Anthony') || m.homeTeam.includes('Paramus') || m.awayTeam.includes('Paramus')
  );

  return (
    <div className="space-y-6">
      {/* Personalized Welcome Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#E5B868]/10 via-[#212A31] to-[#E5B868]/10 border border-[#E5B868]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#E5B868]">ATHLETE & ORGANIZER PORTAL</span>
          <h2 className="text-xl sm:text-2xl font-black text-white uppercase italic mt-0.5">
            MY REGISTERED EVENTS & GAME DAY HUB
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Track your check-in status, view assigned court locations, and manage upcoming showcase matchups.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-black/60 px-4 py-2.5 rounded-2xl border border-white/10 shrink-0">
          <User className="w-4 h-4 text-[#E5B868]" />
          <div className="text-left">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Logbook User</span>
            <span className="text-xs font-bold text-white font-mono">{profile?.displayName || 'Jayden Carter'}</span>
          </div>
        </div>
      </div>

      {/* Roster & Check-In Action Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#E5B868]" />
          TODAY'S GAME DAY CHECK-INS
        </h3>

        <motion.div 
          variants={STAGGER_CONTAINER_VARIANTS}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {myCheckIns.map((ci) => {
            const isCheckedIn = ci.status === 'Checked In';

            return (
              <motion.div
                key={ci.id}
                variants={STAGGER_CARD_VARIANTS}
                className="h-full"
              >
                <BentoCard glow={isCheckedIn} className="flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono font-bold text-[#E5B868] uppercase bg-[#E5B868]/10 px-2.5 py-1 rounded border border-[#E5B868]/30">
                      {ci.sport}
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                      isCheckedIn ? 'bg-[#E5B868] text-black' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {ci.status}
                    </span>
                  </div>

                  <h4 className="text-base font-black text-white uppercase tracking-tight mb-1">
                    {ci.tournamentName || 'Tri-State Elite Basketball Showcase'}
                  </h4>

                  <div className="space-y-1 text-xs text-slate-300 mb-4 bg-white/5 p-3 rounded-2xl border border-white/10 font-mono">
                    <p>Team: <strong className="text-white">{ci.teamName}</strong></p>
                    <p>Assigned Court: <strong className="text-[#E5B868]">{ci.courtField || 'Court A (Main)'}</strong></p>
                  </div>
                </div>

                <button
                  onClick={() => onToggleCheckIn(ci.id, ci.status)}
                  className={`w-full py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isCheckedIn
                      ? 'bg-white/10 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-white/15'
                      : 'bg-[#00F2FE] hover:bg-[#38BDF8] text-slate-950 shadow-[0_0_20px_rgba(0,242,254,0.4)]'
                  }`}
                >
                  {isCheckedIn ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-[#E5B868]" />
                      <span>CHECKED IN AT {new Date(ci.checkInTime || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-black stroke-[2]" />
                      <span>CLICK TO CHECK-IN FOR YOUR GAME</span>
                    </>
                  )}
                </button>
              </BentoCard>
            </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* My Tournaments & Match Schedule */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          MY SCHEDULED MATCHES
        </h3>

        <motion.div 
          variants={STAGGER_CONTAINER_VARIANTS}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          {myMatches.map((m) => (
            <motion.div
              key={m.id}
              variants={STAGGER_CARD_VARIANTS}
              className="p-4 rounded-2xl border border-white/15 bg-[#212A31] hover:border-[#E5B868]/50 transition-all flex flex-col sm:flex-row items-center justify-between gap-4"
            >
              <div>
                <span className="text-[10px] font-mono text-[#E5B868] block font-bold">
                  Round {m.round} • Match #{m.matchNumber} ({m.status})
                </span>
                <h4 className="text-base font-black text-white uppercase mt-0.5">
                  {m.homeTeam} vs {m.awayTeam}
                </h4>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-[#E5B868]" />
                  {m.venueName || 'MetLife Arena'} ({m.subLocation || 'Court A'})
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-lg font-mono font-black text-white bg-white/5 px-4 py-1.5 rounded-xl border border-white/10 block mb-1">
                  {m.homeScore ?? 0} - {m.awayScore ?? 0}
                </span>
                <button
                  onClick={() => onSelectTournament(m.tournamentId)}
                  className="text-[10px] font-bold text-[#E5B868] hover:underline uppercase flex items-center gap-1 justify-end cursor-pointer"
                >
                  <span>View Bracket</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};
