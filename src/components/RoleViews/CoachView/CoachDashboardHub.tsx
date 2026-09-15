import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Calendar, 
  Award, 
  Film, 
  Zap, 
  Plus, 
  Search, 
  Filter, 
  ShieldCheck, 
  Star, 
  MapPin, 
  Clock, 
  ChevronRight, 
  CheckCircle2, 
  TrendingUp, 
  BookOpen, 
  ExternalLink,
  Edit3,
  UserPlus,
  Play,
  Share2,
  FileText,
  Trash2,
  Trophy,
  DollarSign
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useAuthRole } from '../../../hooks/useAuthRole';
import { useToast } from '../../../context/ToastContext';
import { db } from '../../../lib/firebase';
import { doc, getDoc, setDoc, collection, onSnapshot } from 'firebase/firestore';
import { INITIAL_ATHLETE_DOCS, INITIAL_TOURNAMENT_GAMES } from '../../../lib/platformData';
import { LiveScoresTicker } from '../../LiveScoresTicker';
import { CreateEventModal } from '../../Events/CreateEventModal';
import { TeamRegistrationModal } from '../../Events/TeamRegistrationModal';

interface RosterPlayer {
  id: string;
  name: string;
  jerseyNumber: string;
  position: string;
  gradYear: number | string;
  height: string;
  weight: string;
  gpa: number | string;
  status: 'Active' | 'Starter' | 'Bench' | 'Injured';
  phone?: string;
  verified: boolean;
  avatarUrl: string;
}

interface CoachEvaluation {
  id: string;
  playerId: string;
  playerName: string;
  position: string;
  jerseyNumber: string;
  overallRating: number; // 1-100
  iqRating: number;
  athleticismRating: number;
  defenseRating: number;
  shootingRating: number;
  coachNotes: string;
  recommendation: 'D1 Prospect' | 'Starter Priority' | 'Skill Development' | 'Key Reserve';
  date: string;
}

const INITIAL_ROSTER: RosterPlayer[] = [
  {
    id: 'ath-001',
    name: 'Jaylen Harris',
    jerseyNumber: '23',
    position: 'Point Guard',
    gradYear: 2026,
    height: "6'2\"",
    weight: '185 lbs',
    gpa: 3.85,
    status: 'Starter',
    verified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80'
  },
  {
    id: 'ath-002',
    name: 'Marcus Rivera',
    jerseyNumber: '5',
    position: 'Shooting Guard',
    gradYear: 2026,
    height: "6'4\"",
    weight: '195 lbs',
    gpa: 3.65,
    status: 'Starter',
    verified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80'
  },
  {
    id: 'ath-003',
    name: 'Devon Carter',
    jerseyNumber: '11',
    position: 'Small Forward',
    gradYear: 2027,
    height: "6'6\"",
    weight: '210 lbs',
    gpa: 3.70,
    status: 'Starter',
    verified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80'
  },
  {
    id: 'ath-004',
    name: 'Tariq Sterling',
    jerseyNumber: '34',
    position: 'Power Forward',
    gradYear: 2025,
    height: "6'8\"",
    weight: '230 lbs',
    gpa: 3.50,
    status: 'Starter',
    verified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80'
  },
  {
    id: 'ath-005',
    name: 'Zack Williams',
    jerseyNumber: '42',
    position: 'Center',
    gradYear: 2026,
    height: "6'10\"",
    weight: '245 lbs',
    gpa: 3.40,
    status: 'Starter',
    verified: false,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'
  }
];

const INITIAL_EVALUATIONS: CoachEvaluation[] = [
  {
    id: 'eval-1',
    playerId: 'ath-001',
    playerName: 'Jaylen Harris',
    position: 'Point Guard',
    jerseyNumber: '23',
    overallRating: 94,
    iqRating: 96,
    athleticismRating: 92,
    defenseRating: 90,
    shootingRating: 95,
    coachNotes: 'Exceptional floor general with elite court vision in transition. High motor on on-ball defense.',
    recommendation: 'D1 Prospect',
    date: '2026-08-28'
  },
  {
    id: 'eval-2',
    playerId: 'ath-002',
    playerName: 'Marcus Rivera',
    position: 'Shooting Guard',
    jerseyNumber: '5',
    overallRating: 89,
    iqRating: 88,
    athleticismRating: 91,
    defenseRating: 86,
    shootingRating: 92,
    coachNotes: 'Deadly spot-up shooter off screen curls. Improving weak-hand drive to the rim.',
    recommendation: 'Starter Priority',
    date: '2026-08-27'
  }
];

export const CoachDashboardHub: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { userDoc } = useAuthRole();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'roster' | 'schedules' | 'evaluations' | 'film'>('roster');
  const [roster, setRoster] = useState<RosterPlayer[]>(INITIAL_ROSTER);
  const [evaluations, setEvaluations] = useState<CoachEvaluation[]>(INITIAL_EVALUATIONS);
  const [rosterSearch, setRosterSearch] = useState('');
  const [positionFilter, setPositionFilter] = useState('All');
  
  // Tournament & Event integration
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [showRegisterTeamModal, setShowRegisterTeamModal] = useState(false);
  const [availableTournaments, setAvailableTournaments] = useState<{ id: string; title: string; entryFee: number; date?: string; venueName?: string }[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<{ id: string; title: string; entryFee: number } | null>(null);

  // New Player Form Modal
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerJersey, setNewPlayerJersey] = useState('');
  const [newPlayerPos, setNewPlayerPos] = useState('Point Guard');
  const [newPlayerGrad, setNewPlayerGrad] = useState('2026');
  const [newPlayerHeight, setNewPlayerHeight] = useState("6'2\"");
  const [newPlayerWeight, setNewPlayerWeight] = useState('185 lbs');

  // New Eval Modal
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [evalPlayer, setEvalPlayer] = useState<RosterPlayer>(INITIAL_ROSTER[0]);
  const [evalOverall, setEvalOverall] = useState(90);
  const [evalIq, setEvalIq] = useState(88);
  const [evalAthleticism, setEvalAthleticism] = useState(92);
  const [evalDefense, setEvalDefense] = useState(87);
  const [evalShooting, setEvalShooting] = useState(89);
  const [evalNotes, setEvalNotes] = useState('');
  const [evalRec, setEvalRec] = useState<'D1 Prospect' | 'Starter Priority' | 'Skill Development' | 'Key Reserve'>('D1 Prospect');

  const coachName = profile?.displayName || userDoc?.displayName || 'Coach bailey';
  const coachOrg = (profile as any)?.organization || (profile as any)?.highSchool || 'Tri-State Elite Athletics';
  const coachTitle = (profile as any)?.coachTitle || (profile as any)?.position || 'Head Coach';
  const coachSport = profile?.sport || 'Basketball';
  const coachProgramLevel = (profile as any)?.programLevel || 'High School / Varsity';

  useEffect(() => {
    const coachId = profile?.uid || userDoc?.uid || 'coach';
    const local = localStorage.getItem(`just1play_roster_${coachId}`);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) setRoster(parsed);
      } catch (e) {}
    }
    if (db && coachId) {
      getDoc(doc(db, 'coaches', coachId)).then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data?.roster) && data.roster.length > 0) {
            setRoster(data.roster);
          }
        }
      }).catch(() => {});
    }
  }, [profile?.uid, userDoc?.uid]);

  useEffect(() => {
    if (!db) return;
    const eventsRef = collection(db, 'events');
    const unsub = onSnapshot(eventsRef, (snapshot) => {
      const list: { id: string; title: string; entryFee: number; date?: string; venueName?: string }[] = [];
      snapshot.docs.forEach(d => {
        const data = d.data();
        if (data.status !== 'draft') {
          const fee = typeof data.entryFee === 'number' ? data.entryFee : (typeof data.price === 'number' ? data.price : Number(data.teamFee) || 0);
          list.push({
            id: d.id,
            title: data.title || data.eventName || 'Tournament Showcase',
            entryFee: fee,
            date: data.startDate || data.date || '',
            venueName: (typeof data.location === 'object' && data.location?.venue) ? data.location.venue : (data.venueName || 'Main Arena')
          });
        }
      });
      setAvailableTournaments(list);
    }, (err) => console.warn('Coach events snapshot note:', err));
    return () => unsub();
  }, []);

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName) return;

    const created: RosterPlayer = {
      id: `ath-custom-${Date.now()}`,
      name: newPlayerName,
      jerseyNumber: newPlayerJersey || '#0',
      position: newPlayerPos,
      gradYear: newPlayerGrad,
      height: newPlayerHeight,
      weight: newPlayerWeight,
      gpa: 3.5,
      status: 'Active',
      verified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'
    };

    const nextRoster = [created, ...roster];
    setRoster(nextRoster);
    setNewPlayerName('');
    setNewPlayerJersey('');
    setShowAddPlayerModal(false);

    const coachId = profile?.uid || userDoc?.uid || 'coach';
    try {
      localStorage.setItem(`just1play_roster_${coachId}`, JSON.stringify(nextRoster));
      if (db && coachId) {
        await setDoc(doc(db, 'coaches', coachId), {
          roster: nextRoster,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
      showToast('success', `${newPlayerName} added to roster`);
    } catch (e) {
      console.warn('Roster save warning:', e);
    }
  };

  const handleRemovePlayer = async (playerId: string) => {
    const nextRoster = roster.filter(p => p.id !== playerId);
    setRoster(nextRoster);
    const coachId = profile?.uid || userDoc?.uid || 'coach';
    try {
      localStorage.setItem(`just1play_roster_${coachId}`, JSON.stringify(nextRoster));
      if (db && coachId) {
        await setDoc(doc(db, 'coaches', coachId), {
          roster: nextRoster,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
      showToast('success', 'Player removed from roster');
    } catch (e) {
      console.warn('Roster remove warning:', e);
    }
  };

  const handleSaveEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    const newEval: CoachEvaluation = {
      id: `eval-${Date.now()}`,
      playerId: evalPlayer.id,
      playerName: evalPlayer.name,
      position: evalPlayer.position,
      jerseyNumber: evalPlayer.jerseyNumber,
      overallRating: evalOverall,
      iqRating: evalIq,
      athleticismRating: evalAthleticism,
      defenseRating: evalDefense,
      shootingRating: evalShooting,
      coachNotes: evalNotes || 'Solid technical execution in recent scrimmages. Ready for game rotation.',
      recommendation: evalRec,
      date: new Date().toISOString().split('T')[0]
    };

    setEvaluations(prev => [newEval, ...prev]);
    setEvalNotes('');
    setShowEvalModal(false);
  };

  const filteredRoster = roster.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(rosterSearch.toLowerCase()) || 
      p.jerseyNumber.includes(rosterSearch) ||
      p.position.toLowerCase().includes(rosterSearch.toLowerCase());
    const matchesPos = positionFilter === 'All' || p.position.toLowerCase().includes(positionFilter.toLowerCase());
    return matchesSearch && matchesPos;
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 100% Free Live Scoreboard Ticker */}
      <LiveScoresTicker initialLeague="ALL" />

      {/* Top Coach Command Hero Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 p-0.5 shrink-0 shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-cyan-400" />
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-mono font-bold uppercase tracking-wider">
                  COACH COMMAND HUB
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-bold uppercase">
                  {coachProgramLevel}
                </span>
              </div>

              <h1 className="text-xl sm:text-3xl font-black italic uppercase text-white tracking-tight">
                {coachName}
              </h1>
              <p className="text-xs sm:text-sm font-mono text-slate-400">
                {coachTitle} • <span className="text-white font-bold">{coachOrg}</span> ({coachSport})
              </p>
            </div>
          </div>

          {/* Quick Stat Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-black/40 border border-white/10 rounded-2xl p-3">
            <div className="text-center p-2">
              <div className="text-xl font-black text-white font-mono">{roster.length}</div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">Active Roster</div>
            </div>
            <div className="text-center p-2 border-l border-white/10">
              <div className="text-xl font-black text-cyan-400 font-mono">3</div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">Upcoming Games</div>
            </div>
            <div className="text-center p-2 border-l border-white/10">
              <div className="text-xl font-black text-[#00F5D4] font-mono">{evaluations.length}</div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">Evaluations</div>
            </div>
            <div className="text-center p-2 border-l border-white/10">
              <div className="text-xl font-black text-[#FF6A00] font-mono">12</div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">Playbook Sets</div>
            </div>
          </div>
        </div>

        {/* Action Center Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-5 border-t border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('roster')}
              className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold uppercase transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'roster'
                  ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/25 font-black'
                  : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>1. Team Rosters ({roster.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('schedules')}
              className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold uppercase transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'schedules'
                  ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/25 font-black'
                  : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>2. Game Schedules</span>
            </button>

            <button
              onClick={() => setActiveTab('evaluations')}
              className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold uppercase transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'evaluations'
                  ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/25 font-black'
                  : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>3. Player Evaluations ({evaluations.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('film')}
              className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold uppercase transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'film'
                  ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/25 font-black'
                  : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Film className="w-4 h-4" />
              <span>4. Film Review & Playbook</span>
            </button>
          </div>

          {/* Coach Event & Tournament Pipelines */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateEventModal(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-mono font-black text-xs uppercase flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 hover:brightness-110 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Tournament</span>
            </button>

            <button
              onClick={() => {
                if (availableTournaments.length > 0) {
                  setSelectedTournament(availableTournaments[0]);
                } else {
                  setSelectedTournament({
                    id: 'tourn-tristate-2026',
                    title: 'Tri-State Elite High School Championship 2026',
                    entryFee: 350
                  });
                }
                setShowRegisterTeamModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#FF6A00] to-amber-500 text-white font-mono font-black text-xs uppercase flex items-center gap-1.5 shadow-lg shadow-amber-500/20 hover:brightness-110 cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Register Team</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: TEAM ROSTERS */}
      {activeTab === 'roster' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  placeholder="Search roster by name, #, or position..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/60 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-black/60 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="All">All Positions</option>
                <option value="Guard">Guards</option>
                <option value="Forward">Forwards</option>
                <option value="Center">Centers</option>
              </select>
            </div>

            <button
              onClick={() => setShowAddPlayerModal(true)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-black font-mono font-black text-xs uppercase flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 hover:brightness-110 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Player to Roster</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRoster.map((player) => (
              <div
                key={player.id}
                className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={player.avatarUrl}
                        alt={player.name}
                        className="w-12 h-12 rounded-xl object-cover border border-cyan-500/40"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-black text-white">{player.name}</h3>
                          {player.verified && (
                            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                          )}
                        </div>
                        <p className="text-xs font-mono text-cyan-400">
                          #{player.jerseyNumber} • {player.position}
                        </p>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-mono font-bold">
                      {player.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-black/40 rounded-xl p-2.5 text-center font-mono text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block">CLASS</span>
                      <span className="text-white font-bold">{player.gradYear}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">HEIGHT</span>
                      <span className="text-white font-bold">{player.height}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">GPA</span>
                      <span className="text-emerald-400 font-bold">{player.gpa}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setEvalPlayer(player);
                      setShowEvalModal(true);
                    }}
                    className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Evaluate Player</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/profile/${player.id}`)}
                      className="text-[11px] font-mono text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <span>Player Card</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRemovePlayer(player.id)}
                      title="Remove from roster"
                      className="p-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: GAME SCHEDULES */}
      {activeTab === 'schedules' && (
        <div className="space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
            <h2 className="text-base font-black uppercase text-white font-sans flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-cyan-400" />
              <span>Upcoming Team Matchups & Tournament Games</span>
            </h2>

            <div className="space-y-3">
              {INITIAL_TOURNAMENT_GAMES.map((g) => (
                <div
                  key={g.id}
                  className="p-4 rounded-xl bg-black/40 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-center shrink-0">
                      <Clock className="w-5 h-5 mx-auto mb-0.5" />
                      <span className="text-[10px] font-mono font-bold block">{g.scheduledTime.split('T')[1] || '10:00 AM'}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-black text-white">{g.homeTeam}</span>
                        <span className="text-xs font-mono text-slate-500">VS</span>
                        <span className="text-sm font-black text-white">{g.awayTeam}</span>
                      </div>
                      <p className="text-xs font-mono text-slate-400 flex items-center gap-2">
                        <span>Court: {g.courtName}</span>
                        <span>•</span>
                        <span>Division: {g.division}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 text-xs font-mono font-bold">
                      {g.status}
                    </span>
                    <button
                      onClick={() => navigate('/tournaments')}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-mono text-white hover:bg-slate-700 cursor-pointer"
                    >
                      Court Desk
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PLAYER EVALUATIONS */}
      {activeTab === 'evaluations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
            <div>
              <h2 className="text-base font-black uppercase text-white">Scouting & Player Talent Evaluations</h2>
              <p className="text-xs font-mono text-slate-400">Standardized metrics, rating grades and tactical notes.</p>
            </div>

            <button
              onClick={() => {
                setEvalPlayer(roster[0]);
                setShowEvalModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-black font-mono font-black text-xs uppercase flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>New Evaluation</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {evaluations.map((ev) => (
              <div key={ev.id} className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-white">{ev.playerName}</h3>
                    <p className="text-xs font-mono text-cyan-400">#{ev.jerseyNumber} • {ev.position}</p>
                  </div>

                  <div className="text-right">
                    <span className="text-2xl font-black text-cyan-400 font-mono">{ev.overallRating}</span>
                    <span className="text-[10px] font-mono text-slate-500 block">OVERALL</span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center font-mono text-xs bg-black/40 p-2.5 rounded-xl">
                  <div>
                    <span className="text-[10px] text-slate-500 block">IQ</span>
                    <span className="text-white font-bold">{ev.iqRating}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">ATH</span>
                    <span className="text-white font-bold">{ev.athleticismRating}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">DEF</span>
                    <span className="text-white font-bold">{ev.defenseRating}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">SHT</span>
                    <span className="text-white font-bold">{ev.shootingRating}</span>
                  </div>
                </div>

                <p className="text-xs font-mono text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  "{ev.coachNotes}"
                </p>

                <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-2 border-t border-slate-800">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                    {ev.recommendation}
                  </span>
                  <span>Logged: {ev.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: FILM REVIEW & PLAYBOOK */}
      {activeTab === 'film' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Playbook Lab Launcher */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-black border border-cyan-500/30 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase text-white">Interactive Playbook Lab</h3>
                <p className="text-xs font-mono text-slate-400 mt-1">
                  Design animated route trees, set offensive schemes, and draw whiteboard defensive coverages.
                </p>
              </div>
              <button
                onClick={() => navigate('/playbook')}
                className="w-full py-3 rounded-xl bg-cyan-500 text-black font-mono font-black text-xs uppercase flex items-center justify-center gap-2 hover:bg-cyan-400 cursor-pointer shadow-lg shadow-cyan-500/20"
              >
                <span>Launch Route Tree Animator</span>
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>

            {/* Film Matrix Launcher */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-black border border-[#FF6A00]/30 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#FF6A00]/20 border border-[#FF6A00]/40 flex items-center justify-center text-[#FF6A00]">
                <Film className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase text-white">Tactical Film Matrix</h3>
                <p className="text-xs font-mono text-slate-400 mt-1">
                  Review tagged game film, scout opponent footage, and share film clips with squad members.
                </p>
              </div>
              <button
                onClick={() => navigate('/matrix')}
                className="w-full py-3 rounded-xl bg-[#FF6A00] text-white font-mono font-black text-xs uppercase flex items-center justify-center gap-2 hover:bg-[#FF8C00] cursor-pointer shadow-lg shadow-[#FF6A00]/20"
              >
                <span>Open Film Review Vault</span>
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD PLAYER MODAL */}
      <AnimatePresence>
        {showAddPlayerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md w-full bg-slate-900 border border-cyan-500/40 rounded-2xl p-6 space-y-4 text-white"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black uppercase">Add Player to Team Roster</h3>
                <button onClick={() => setShowAddPlayerModal(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              <form onSubmit={handleAddPlayer} className="space-y-3 font-mono text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Player Full Name</label>
                  <input
                    type="text"
                    required
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    placeholder="e.g. Cameron Johnson"
                    className="w-full px-3 py-2 rounded-xl bg-black border border-slate-700 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Jersey Number</label>
                    <input
                      type="text"
                      value={newPlayerJersey}
                      onChange={(e) => setNewPlayerJersey(e.target.value)}
                      placeholder="e.g. 12"
                      className="w-full px-3 py-2 rounded-xl bg-black border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Position</label>
                    <input
                      type="text"
                      value={newPlayerPos}
                      onChange={(e) => setNewPlayerPos(e.target.value)}
                      placeholder="e.g. Shooting Guard"
                      className="w-full px-3 py-2 rounded-xl bg-black border border-slate-700 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">Grad Year</label>
                    <input
                      type="text"
                      value={newPlayerGrad}
                      onChange={(e) => setNewPlayerGrad(e.target.value)}
                      className="w-full px-2 py-2 rounded-xl bg-black border border-slate-700 text-white text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Height</label>
                    <input
                      type="text"
                      value={newPlayerHeight}
                      onChange={(e) => setNewPlayerHeight(e.target.value)}
                      className="w-full px-2 py-2 rounded-xl bg-black border border-slate-700 text-white text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Weight</label>
                    <input
                      type="text"
                      value={newPlayerWeight}
                      onChange={(e) => setNewPlayerWeight(e.target.value)}
                      className="w-full px-2 py-2 rounded-xl bg-black border border-slate-700 text-white text-center"
                    />
                  </div>
                </div>

                <div className="pt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddPlayerModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold uppercase"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-cyan-500 text-black font-black uppercase hover:bg-cyan-400"
                  >
                    Save Player
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EVALUATION MODAL */}
      <AnimatePresence>
        {showEvalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-lg w-full bg-slate-900 border border-cyan-500/40 rounded-2xl p-6 space-y-4 text-white"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black uppercase">Evaluate: {evalPlayer.name}</h3>
                  <p className="text-xs font-mono text-cyan-400">#{evalPlayer.jerseyNumber} • {evalPlayer.position}</p>
                </div>
                <button onClick={() => setShowEvalModal(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              <form onSubmit={handleSaveEvaluation} className="space-y-3 font-mono text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                  <div>
                    <label className="block text-slate-400 mb-1">Overall</label>
                    <input
                      type="number"
                      value={evalOverall}
                      onChange={(e) => setEvalOverall(Number(e.target.value))}
                      className="w-full py-1.5 rounded-lg bg-black border border-cyan-500 text-cyan-400 font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">IQ</label>
                    <input
                      type="number"
                      value={evalIq}
                      onChange={(e) => setEvalIq(Number(e.target.value))}
                      className="w-full py-1.5 rounded-lg bg-black border border-slate-700 text-white font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Athleticism</label>
                    <input
                      type="number"
                      value={evalAthleticism}
                      onChange={(e) => setEvalAthleticism(Number(e.target.value))}
                      className="w-full py-1.5 rounded-lg bg-black border border-slate-700 text-white font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Defense</label>
                    <input
                      type="number"
                      value={evalDefense}
                      onChange={(e) => setEvalDefense(Number(e.target.value))}
                      className="w-full py-1.5 rounded-lg bg-black border border-slate-700 text-white font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Shooting</label>
                    <input
                      type="number"
                      value={evalShooting}
                      onChange={(e) => setEvalShooting(Number(e.target.value))}
                      className="w-full py-1.5 rounded-lg bg-black border border-slate-700 text-white font-bold text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Recommendation Level</label>
                  <select
                    value={evalRec}
                    onChange={(e: any) => setEvalRec(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black border border-slate-700 text-white"
                  >
                    <option value="D1 Prospect">D1 Prospect</option>
                    <option value="Starter Priority">Starter Priority</option>
                    <option value="Skill Development">Skill Development</option>
                    <option value="Key Reserve">Key Reserve</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Coach Notes & Tactical Feedback</label>
                  <textarea
                    rows={3}
                    value={evalNotes}
                    onChange={(e) => setEvalNotes(e.target.value)}
                    placeholder="Provide actionable feedback on mechanics, decision making, or effort..."
                    className="w-full px-3 py-2 rounded-xl bg-black border border-slate-700 text-white"
                  />
                </div>

                <div className="pt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEvalModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold uppercase"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-cyan-500 text-black font-black uppercase hover:bg-cyan-400"
                  >
                    Save Evaluation
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Coach Tournament / Event Creation Modal */}
      <CreateEventModal
        isOpen={showCreateEventModal}
        onClose={() => setShowCreateEventModal(false)}
        onEventCreated={() => {
          showToast('success', 'Tournament published directly to events pipeline');
        }}
      />

      {/* Coach Team Registration Modal */}
      {showRegisterTeamModal && (
        <TeamRegistrationModal
          isOpen={showRegisterTeamModal}
          onClose={() => setShowRegisterTeamModal(false)}
          eventId={selectedTournament?.id || 'tourn-tristate-2026'}
          tournamentName={selectedTournament?.title || 'Tri-State Elite High School Championship 2026'}
          tournamentFee={selectedTournament?.entryFee ?? 350}
        />
      )}
    </div>
  );
};

export default CoachDashboardHub;
