import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { LiveGame, GameStatus, SportType, PlayByPlayEvent } from '../../types';
import { isFirestoreQuotaExceeded, markFirestoreQuotaExceeded, isQuotaError, safeFirestoreWrite } from '../../lib/firestoreQuotaGuard';
import { BentoCard } from '../BentoCard';
import { LiveStreamStudio } from '../LiveStream/LiveStreamStudio';
import { LiveStreamComponent } from '../LiveStream/LiveStreamComponent';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radio, 
  Play, 
  Pause, 
  Plus, 
  Minus, 
  Clock, 
  Trophy, 
  Activity, 
  ShieldCheck, 
  Eye, 
  Lock, 
  CheckCircle2, 
  Zap, 
  ListPlus,
  RefreshCw,
  Sparkles
} from 'lucide-react';

const deduplicateGames = (gamesList: LiveGame[]): LiveGame[] => {
  const seen = new Set<string>();
  return gamesList.filter(g => {
    if (!g || !g.id || seen.has(g.id)) return false;
    seen.add(g.id);
    return true;
  });
};

export const LiveGamesSection: React.FC = () => {
  const { role } = useAuth();
  const [games, setGames] = useState<LiveGame[]>([]);
  const [selectedSport, setSelectedSport] = useState<SportType | 'All'>('All');
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [customPlayText, setCustomPlayText] = useState<string>('');
  const [playTeam, setPlayTeam] = useState<'home' | 'away'>('home');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showLiveStudio, setShowLiveStudio] = useState<boolean>(false);

  // New Game Form State
  const [newTitle, setNewTitle] = useState('');
  const [newSport, setNewSport] = useState<SportType>('Basketball');
  const [newHomeName, setNewHomeName] = useState('');
  const [newHomeAbbr, setNewHomeAbbr] = useState('');
  const [newAwayName, setNewAwayName] = useState('');
  const [newAwayAbbr, setNewAwayAbbr] = useState('');
  const [newLocation, setNewLocation] = useState('');

  // Check role-based scorekeeper permission
  const canScorekeep = role === 'admin' || role === 'organization';

  // Real-time Firestore Listener
  useEffect(() => {
    let unsubscribe: () => void = () => {};

    try {
      const liveGamesRef = collection(db, 'liveGames');
      unsubscribe = onSnapshot(
        liveGamesRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const fetchedGames: LiveGame[] = [];
            snapshot.forEach((docSnap) => {
              fetchedGames.push({ id: docSnap.id, ...docSnap.data() } as LiveGame);
            });
            setGames(deduplicateGames(fetchedGames));
            if (!activeGameId && fetchedGames.length > 0) {
              setActiveGameId(fetchedGames[0].id);
            }
          } else {
            setGames([]);
          }
          setLoading(false);
        },
        (error) => {
          if (isQuotaError(error)) {
            markFirestoreQuotaExceeded('LiveGames listener quota notice');
          }
          console.warn('Firestore live listener notice (using local state fallback):', error?.message);
          setGames([]);
          setLoading(false);
        }
      );
    } catch (err) {
      console.warn('Firestore setup notice:', err);
      setGames([]);
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  const seedInitialGames = async () => {
    // Clean slate seed trigger
    if (isFirestoreQuotaExceeded()) return;
  };

  // Helper to update game in Firestore or local state
  const updateGameData = async (gameId: string, updates: Partial<LiveGame>) => {
    // Local optimistic update
    setGames(prev => prev.map(g => g.id === gameId ? { ...g, ...updates, updatedAt: new Date().toISOString() } : g));

    try {
      await safeFirestoreWrite(async () => {
        const gameRef = doc(db, 'liveGames', gameId);
        await updateDoc(gameRef, {
          ...updates,
          updatedAt: new Date().toISOString()
        });
      });
    } catch (e: any) {
      if (isQuotaError(e)) {
        markFirestoreQuotaExceeded('Game update quota notice');
      }
      console.warn('Firestore update notice (using local state fallback):', e?.message);
    }
  };

  // Scorekeeper Action: Adjust Score
  const handleScoreChange = (game: LiveGame, team: 'home' | 'away', delta: number) => {
    if (!canScorekeep) return;
    const currentScore = team === 'home' ? game.homeTeam.score : game.awayTeam.score;
    const newScore = Math.max(0, currentScore + delta);

    const updatedTeam = team === 'home' 
      ? { ...game.homeTeam, score: newScore }
      : { ...game.awayTeam, score: newScore };

    const playText = `${team === 'home' ? game.homeTeam.name : game.awayTeam.name} ${delta > 0 ? `+${delta} pts` : `${delta} pts`}`;
    const newPlay: PlayByPlayEvent = {
      id: `p-${Date.now()}`,
      timestamp: game.gameClock || '00:00',
      text: playText,
      team,
      points: delta
    };

    updateGameData(game.id, {
      [team === 'home' ? 'homeTeam' : 'awayTeam']: updatedTeam,
      playByPlay: [newPlay, ...(game.playByPlay || [])]
    });
  };

  // Scorekeeper Action: Toggle Game Status
  const handleStatusChange = (game: LiveGame, status: GameStatus) => {
    if (!canScorekeep) return;
    updateGameData(game.id, { status });
  };

  // Scorekeeper Action: Change Game Period
  const handlePeriodChange = (game: LiveGame, period: string) => {
    if (!canScorekeep) return;
    updateGameData(game.id, { period });
  };

  // Scorekeeper Action: Toggle Clock Running
  const handleClockToggle = (game: LiveGame) => {
    if (!canScorekeep) return;
    updateGameData(game.id, { isClockRunning: !game.isClockRunning });
  };

  // Scorekeeper Action: Add Play-by-Play Event
  const handleAddPlay = (e: React.FormEvent, game: LiveGame) => {
    e.preventDefault();
    if (!canScorekeep || !customPlayText.trim()) return;

    const newPlay: PlayByPlayEvent = {
      id: `p-${Date.now()}`,
      timestamp: game.gameClock || '00:00',
      text: customPlayText.trim(),
      team: playTeam
    };

    updateGameData(game.id, {
      playByPlay: [newPlay, ...(game.playByPlay || [])]
    });

    setCustomPlayText('');
  };

  // Scorekeeper Action: Create New Game
  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canScorekeep || !newTitle || !newHomeName || !newAwayName) return;

    const newGameId = `game-${Date.now()}`;
    const newGameObj: LiveGame = {
      id: newGameId,
      title: newTitle,
      sport: newSport,
      status: 'Live',
      period: newSport === 'Basketball' ? '1st Quarter' : '1st Half',
      gameClock: '12:00',
      isClockRunning: true,
      homeTeam: {
        name: newHomeName,
        abbreviation: newHomeAbbr || newHomeName.slice(0, 3).toUpperCase(),
        score: 0,
        color: '#E5B868',
        timeoutsLeft: 3,
        fouls: 0
      },
      awayTeam: {
        name: newAwayName,
        abbreviation: newAwayAbbr || newAwayName.slice(0, 3).toUpperCase(),
        score: 0,
        color: '#3B82F6',
        timeoutsLeft: 3,
        fouls: 0
      },
      location: newLocation || 'Just1Play Main Arena',
      playByPlay: [
        {
          id: `p-init`,
          timestamp: '12:00',
          text: `Game Started! ${newHomeName} vs ${newAwayName}`,
          team: 'neutral'
        }
      ],
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'liveGames', newGameId), newGameObj);
    } catch (e) {
      console.warn('Error creating game in Firestore:', e);
    }

    setGames(prev => deduplicateGames([newGameObj, ...prev]));
    setActiveGameId(newGameId);
    setShowCreateModal(false);

    // Reset Form
    setNewTitle('');
    setNewHomeName('');
    setNewHomeAbbr('');
    setNewAwayName('');
    setNewAwayAbbr('');
    setNewLocation('');
  };

  const filteredGames = games.filter(g => selectedSport === 'All' || g.sport === selectedSport);
  const activeGame = games.find(g => g.id === activeGameId) || filteredGames[0] || games[0];

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner with Cyber Green Theme */}
      <div className="relative rounded-3xl overflow-hidden bg-[#050505] border border-white/10 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-[#E5B868] text-black rounded-sm shadow-[0_0_12px_rgba(214,28,36,0.6)] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-black animate-ping" />
                REAL-TIME FIRESTORE SYNC
              </span>
              <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-slate-600 text-black rounded-sm">
                LIVE SCOREBOARD MATRIX
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black italic tracking-tight text-white uppercase font-sans">
              LIVE GAMES & SCORING<span className="text-[#E5B868] drop-shadow-[0_0_10px_#E5B868]">.</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
              Real-time score updates, digital clock telemetry, and instant play-by-play log feeds.
            </p>
          </div>

          {/* Role Status Badge */}
          <div className="flex items-center gap-3">
            <div className={`p-3.5 rounded-2xl border backdrop-blur-xl flex items-center gap-3 ${
              canScorekeep
                ? 'bg-[#E5B868]/10 border-[#E5B868]/40 text-white shadow-[0_0_20px_rgba(214,28,36,0.2)]'
                : 'bg-white/5 border-white/10 text-slate-300'
            }`}>
              {canScorekeep ? (
                <>
                  <div className="p-2 bg-[#E5B868] text-black rounded-xl">
                    <Zap className="w-5 h-5 text-black stroke-[2]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-[#E5B868] uppercase block tracking-wider">SCOREKEEPER MODE</span>
                    <span className="text-xs font-bold text-white">Write & Control Access</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-2 bg-white/10 text-slate-300 rounded-xl">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase block tracking-wider">SPECTATOR MODE ({role?.toUpperCase()})</span>
                    <span className="text-xs font-bold text-slate-300">Live Read-Only View</span>
                  </div>
                </>
              )}
            </div>

            {/* Live Stream Studio Trigger */}
            <button
              onClick={() => setShowLiveStudio(!showLiveStudio)}
              className={`px-4 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 border ${
                showLiveStudio
                  ? 'bg-blue-600 text-white border-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.5)]'
                  : 'bg-black/60 hover:bg-black text-[#E5B868] border-[#E5B868]/50 shadow-[0_0_15px_rgba(0,242,254,0.25)]'
              }`}
            >
              <Radio className="w-4 h-4 animate-pulse" />
              <span>{showLiveStudio ? 'EXIT STUDIO' : 'STREAM STUDIO'}</span>
            </button>

            {canScorekeep && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-3 bg-[#E5B868] hover:bg-[#38BDF8] text-black font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-[0_0_20px_rgba(0,242,254,0.4)] flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>NEW LIVE GAME</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sport Filter Controls */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
        <div className="flex items-center gap-2">
          {['All', 'Basketball', 'Flag Football', 'Lacrosse'].map((sport) => (
            <button
              key={sport}
              onClick={() => setSelectedSport(sport as any)}
              className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap border ${
                selectedSport === sport
                  ? 'bg-[#E5B868] text-black border-[#E5B868] shadow-[0_0_20px_rgba(0,242,254,0.3)]'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
              }`}
            >
              {sport === 'All' ? 'ALL LIVE GAMES' : sport.toUpperCase()}
            </button>
          ))}
        </div>

        <button
          onClick={seedInitialGames}
          className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-slate-300 flex items-center gap-1.5 shrink-0 transition-colors"
          title="Reset or re-seed live games dataset"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#E5B868]" />
          <span>Sync / Reset</span>
        </button>
      </div>

      {/* LIVE STREAMING STUDIO MODAL / EXPANDED SECTION */}
      {showLiveStudio && activeGame && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-[#212A31] p-6 rounded-3xl border-2 border-[#E5B868]/50 shadow-[0_0_50px_rgba(0,242,254,0.15)]"
        >
          <LiveStreamStudio
            game={activeGame}
            onClose={() => setShowLiveStudio(false)}
          />
        </motion.div>
      )}

      {/* MAIN FEATURED DIGITAL SCOREBOARD CONTAINER */}
      {activeGame ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* DIGITAL SCOREBOARD DISPLAY CARD (2 COLUMNS) */}
          <div className="lg:col-span-2 space-y-6">
            <BentoCard glow className="relative overflow-hidden bg-[#000000]/90 border border-white/15 p-6 sm:p-8">
              {/* Top Scoreboard Meta Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4 mb-6">
                <div className="flex items-center gap-2">
                  {/* Glowing Neon Green Live Pulse */}
                  {activeGame.status === 'Live' ? (
                    <div className="flex items-center gap-2 px-3 py-1 bg-[#E5B868]/10 border border-[#E5B868]/50 rounded-full shadow-[0_0_15px_rgba(0,242,254,0.2)]">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E5B868] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#E5B868]"></span>
                      </span>
                      <span className="text-xs font-black text-[#E5B868] tracking-wider uppercase font-mono">
                        LIVE NOW
                      </span>
                    </div>
                  ) : (
                    <span className="px-3 py-1 bg-white/10 border border-white/15 rounded-full text-xs font-bold text-slate-300 uppercase">
                      {activeGame.status}
                    </span>
                  )}

                  <span className="text-xs font-mono font-bold text-slate-300 uppercase bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
                    {activeGame.sport}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowLiveStudio(true)}
                    className="px-3.5 py-1.5 bg-[#E5B868]/15 hover:bg-[#E5B868] text-[#E5B868] hover:text-black border border-[#E5B868]/40 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,242,254,0.2)] cursor-pointer"
                  >
                    <Radio className="w-3.5 h-3.5 animate-pulse" />
                    <span>LAUNCH LIVE STREAM</span>
                  </button>

                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">GAME PERIOD</span>
                    <span className="text-sm font-black font-mono text-[#E5B868]">{activeGame.period}</span>
                  </div>
                </div>
              </div>

              {/* Central Digital Scoreboard Matrix */}
              <div className="grid grid-cols-11 items-center gap-2 py-4">
                {/* HOME TEAM */}
                <div className="col-span-4 text-center space-y-2">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#E5B868]/20 to-black border-2 border-[#E5B868] flex items-center justify-center shadow-[0_0_20px_rgba(0,242,254,0.2)]">
                    <span className="text-xl font-black text-white font-mono">{activeGame.homeTeam.abbreviation}</span>
                  </div>
                  <h3 className="text-base sm:text-xl font-black text-white uppercase tracking-tight">{activeGame.homeTeam.name}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">HOME TEAM</span>
                  
                  {/* Digital Score Number */}
                  <div className="pt-2">
                    <span className="text-5xl sm:text-7xl font-black font-mono text-white tracking-tighter drop-shadow-[0_0_25px_rgba(255,255,255,0.4)]">
                      {activeGame.homeTeam.score}
                    </span>
                  </div>

                  {/* Scorekeeper Quick Score Controls */}
                  {canScorekeep && (
                    <div className="flex items-center justify-center gap-1.5 pt-3">
                      <button
                        onClick={() => handleScoreChange(activeGame, 'home', 1)}
                        className="px-2.5 py-1.5 bg-[#E5B868] hover:bg-[#38BDF8] text-black font-black text-xs rounded-lg transition-all shadow-[0_0_10px_rgba(0,242,254,0.3)]"
                        title="+1 Point"
                      >
                        +1
                      </button>
                      <button
                        onClick={() => handleScoreChange(activeGame, 'home', 2)}
                        className="px-2.5 py-1.5 bg-[#E5B868] hover:bg-[#38BDF8] text-black font-black text-xs rounded-lg transition-all shadow-[0_0_10px_rgba(0,242,254,0.3)]"
                        title="+2 Points"
                      >
                        +2
                      </button>
                      <button
                        onClick={() => handleScoreChange(activeGame, 'home', 3)}
                        className="px-2.5 py-1.5 bg-[#E5B868] hover:bg-[#38BDF8] text-black font-black text-xs rounded-lg transition-all shadow-[0_0_10px_rgba(0,242,254,0.3)]"
                        title="+3 Points"
                      >
                        +3
                      </button>
                      {activeGame.sport === 'Flag Football' && (
                        <button
                          onClick={() => handleScoreChange(activeGame, 'home', 6)}
                          className="px-2.5 py-1.5 bg-slate-600 hover:bg-cyan-300 text-black font-black text-xs rounded-lg transition-all shadow"
                          title="+6 Touchdown"
                        >
                          +6 TD
                        </button>
                      )}
                      <button
                        onClick={() => handleScoreChange(activeGame, 'home', -1)}
                        className="px-2 py-1.5 bg-white/10 hover:bg-rose-500/30 text-white font-bold text-xs rounded-lg border border-white/10"
                        title="-1 Point"
                      >
                        -1
                      </button>
                    </div>
                  )}
                </div>

                {/* VS & DIGITAL CLOCK CENTERPIECE */}
                <div className="col-span-3 text-center space-y-3">
                  <div className="inline-block p-3 rounded-2xl bg-[#212A31] border border-white/15 shadow-2xl">
                    <span className="text-3xl sm:text-4xl font-black font-mono text-[#E5B868] tracking-wider block drop-shadow-[0_0_12px_#E5B868]">
                      {activeGame.gameClock || '00:00'}
                    </span>
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      <Clock className={`w-3.5 h-3.5 ${activeGame.isClockRunning ? 'text-[#E5B868] animate-spin' : 'text-slate-500'}`} />
                      <span className="text-[9px] font-mono font-bold text-slate-400 uppercase">
                        {activeGame.isClockRunning ? 'CLOCK RUNNING' : 'PAUSED'}
                      </span>
                    </div>
                  </div>

                  {canScorekeep && (
                    <button
                      onClick={() => handleClockToggle(activeGame)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs uppercase transition-all flex items-center justify-center gap-1.5 mx-auto border ${
                        activeGame.isClockRunning
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 hover:bg-amber-500/30'
                          : 'bg-[#E5B868]/20 text-[#E5B868] border-[#E5B868]/50 hover:bg-[#E5B868]/30'
                      }`}
                    >
                      {activeGame.isClockRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{activeGame.isClockRunning ? 'PAUSE CLOCK' : 'START CLOCK'}</span>
                    </button>
                  )}
                </div>

                {/* AWAY TEAM */}
                <div className="col-span-4 text-center space-y-2">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-500/20 to-black border-2 border-blue-400 flex items-center justify-center shadow-lg">
                    <span className="text-xl font-black text-white font-mono">{activeGame.awayTeam.abbreviation}</span>
                  </div>
                  <h3 className="text-base sm:text-xl font-black text-white uppercase tracking-tight">{activeGame.awayTeam.name}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">AWAY TEAM</span>
                  
                  {/* Digital Score Number */}
                  <div className="pt-2">
                    <span className="text-5xl sm:text-7xl font-black font-mono text-white tracking-tighter drop-shadow-[0_0_25px_rgba(255,255,255,0.4)]">
                      {activeGame.awayTeam.score}
                    </span>
                  </div>

                  {/* Scorekeeper Quick Score Controls */}
                  {canScorekeep && (
                    <div className="flex items-center justify-center gap-1.5 pt-3">
                      <button
                        onClick={() => handleScoreChange(activeGame, 'away', 1)}
                        className="px-2.5 py-1.5 bg-[#E5B868] hover:bg-[#38BDF8] text-black font-black text-xs rounded-lg transition-all shadow-[0_0_10px_rgba(0,242,254,0.3)]"
                        title="+1 Point"
                      >
                        +1
                      </button>
                      <button
                        onClick={() => handleScoreChange(activeGame, 'away', 2)}
                        className="px-2.5 py-1.5 bg-[#E5B868] hover:bg-[#38BDF8] text-black font-black text-xs rounded-lg transition-all shadow-[0_0_10px_rgba(0,242,254,0.3)]"
                        title="+2 Points"
                      >
                        +2
                      </button>
                      <button
                        onClick={() => handleScoreChange(activeGame, 'away', 3)}
                        className="px-2.5 py-1.5 bg-[#E5B868] hover:bg-[#38BDF8] text-black font-black text-xs rounded-lg transition-all shadow-[0_0_10px_rgba(0,242,254,0.3)]"
                        title="+3 Points"
                      >
                        +3
                      </button>
                      {activeGame.sport === 'Flag Football' && (
                        <button
                          onClick={() => handleScoreChange(activeGame, 'away', 6)}
                          className="px-2.5 py-1.5 bg-slate-600 hover:bg-cyan-300 text-black font-black text-xs rounded-lg transition-all shadow"
                          title="+6 Touchdown"
                        >
                          +6 TD
                        </button>
                      )}
                      <button
                        onClick={() => handleScoreChange(activeGame, 'away', -1)}
                        className="px-2 py-1.5 bg-white/10 hover:bg-rose-500/30 text-white font-bold text-xs rounded-lg border border-white/10"
                        title="-1 Point"
                      >
                        -1
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* SCOREKEEPER MANAGEMENT CONTROLS PANEL */}
              {canScorekeep && (
                <div className="mt-8 pt-6 border-t border-white/10 bg-white/5 p-4 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-[#E5B868] flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-[#E5B868] stroke-[2]" />
                      Scorekeeper Telemetry Controls
                    </span>
                    <span className="text-[10px] text-slate-400">Admin & Organization Authorized</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Change Period Selector */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Game Period / Quarter</label>
                      <select
                        value={activeGame.period}
                        onChange={(e) => handlePeriodChange(activeGame, e.target.value)}
                        className="w-full bg-[#212A31] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#E5B868] focus:outline-none"
                      >
                        <option value="1st Quarter">1st Quarter</option>
                        <option value="2nd Quarter">2nd Quarter</option>
                        <option value="1st Half">1st Half</option>
                        <option value="Halftime">Halftime</option>
                        <option value="3rd Quarter">3rd Quarter</option>
                        <option value="4th Quarter">4th Quarter</option>
                        <option value="2nd Half">2nd Half</option>
                        <option value="Overtime (OT)">Overtime (OT)</option>
                        <option value="Final">Final</option>
                      </select>
                    </div>

                    {/* Change Game Status */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Game Status</label>
                      <select
                        value={activeGame.status}
                        onChange={(e) => handleStatusChange(activeGame, e.target.value as GameStatus)}
                        className="w-full bg-[#212A31] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#E5B868] focus:outline-none"
                      >
                        <option value="Live">🔴 Live Active</option>
                        <option value="Halftime">⏸️ Halftime</option>
                        <option value="Final">🏁 Final</option>
                        <option value="Upcoming">📅 Upcoming</option>
                      </select>
                    </div>
                  </div>

                  {/* Add Custom Play-by-Play Form */}
                  <form onSubmit={(e) => handleAddPlay(e, activeGame)} className="space-y-2 pt-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block">Add Live Play-By-Play Event</label>
                    <div className="flex gap-2">
                      <select
                        value={playTeam}
                        onChange={(e) => setPlayTeam(e.target.value as any)}
                        className="bg-[#212A31] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#E5B868] focus:outline-none shrink-0"
                      >
                        <option value="home">{activeGame.homeTeam.abbreviation} (Home)</option>
                        <option value="away">{activeGame.awayTeam.abbreviation} (Away)</option>
                      </select>

                      <input
                        type="text"
                        value={customPlayText}
                        onChange={(e) => setCustomPlayText(e.target.value)}
                        placeholder="e.g. 'Carter steals ball and assists Sanchez for 3-pointer!'"
                        className="flex-1 bg-[#212A31] border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-[#E5B868] focus:outline-none"
                      />

                      <button
                        type="submit"
                        className="px-4 py-2 bg-[#E5B868] hover:bg-[#38BDF8] text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_10px_rgba(0,242,254,0.3)] shrink-0 flex items-center gap-1"
                      >
                        <ListPlus className="w-3.5 h-3.5" />
                        <span>LOG PLAY</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </BentoCard>

            {/* SPECTATOR LIVE STREAM VIDEO PLAYER */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Radio className="w-4 h-4 text-[#E5B868] animate-pulse" />
                  <span>Spectator Live Broadcast Feed</span>
                </h3>
                <span className="text-[10px] font-mono text-[#E5B868] font-bold bg-[#E5B868]/10 px-2.5 py-0.5 rounded-full border border-[#E5B868]/30">
                  {activeGame.isLiveStreamActive ? 'STREAM ACTIVE • WEBRTC/HLS' : 'STANDBY MODE'}
                </span>
              </div>

              <LiveStreamComponent
                gameId={activeGame.id}
                gameTitle={activeGame.title}
                sport={activeGame.sport}
                homeTeam={{ name: activeGame.homeTeam.name, score: activeGame.homeTeam.score, abbrev: activeGame.homeTeam.abbreviation }}
                awayTeam={{ name: activeGame.awayTeam.name, score: activeGame.awayTeam.score, abbrev: activeGame.awayTeam.abbreviation }}
                isLiveDefault={activeGame.isLiveStreamActive}
                streamUrl={activeGame.streamUrl}
              />
            </div>

            {/* LIVE GAMES SELECTION MATRIX (ALL GAMES LIST) */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#E5B868] flex items-center gap-2">
                <Radio className="w-4 h-4" />
                Active Scoreboard Feed ({filteredGames.length} Games)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredGames.map((game) => {
                  const isActive = game.id === activeGameId;
                  return (
                    <button
                      key={game.id}
                      onClick={() => setActiveGameId(game.id)}
                      className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between h-full ${
                        isActive
                          ? 'bg-[#E5B868]/10 border-[#E5B868] shadow-[0_0_20px_rgba(0,242,254,0.2)]'
                          : 'bg-white/5 border-white/10 hover:border-white/30'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded ${
                            game.status === 'Live' ? 'bg-[#E5B868] text-black' : 'bg-white/10 text-slate-300'
                          }`}>
                            {game.status}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">{game.sport}</span>
                        </div>

                        <h4 className="text-xs font-bold text-white line-clamp-1 mb-2">{game.title}</h4>

                        <div className="space-y-1 font-mono text-xs">
                          <div className="flex justify-between text-white">
                            <span>{game.homeTeam.name}</span>
                            <span className="font-bold text-[#E5B868]">{game.homeTeam.score}</span>
                          </div>
                          <div className="flex justify-between text-white">
                            <span>{game.awayTeam.name}</span>
                            <span className="font-bold text-white">{game.awayTeam.score}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
                        <span>{game.period}</span>
                        <span className="font-mono text-[#E5B868]">{game.gameClock}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* REAL-TIME PLAY-BY-PLAY FEED COLUMN */}
          <div className="space-y-6">
            <BentoCard className="h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                  <span className="text-xs font-black uppercase tracking-wider text-[#E5B868] flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Live Play-By-Play Log
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Auto-Refreshed</span>
                </div>

                {/* Play List */}
                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                  {activeGame.playByPlay && activeGame.playByPlay.length > 0 ? (
                    activeGame.playByPlay.map((play, index) => (
                      <motion.div
                        key={play.id || index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`p-3 rounded-xl border text-xs leading-relaxed ${
                          index === 0
                            ? 'bg-[#E5B868]/10 border-[#E5B868]/40 text-white shadow-[0_0_12px_rgba(0,242,254,0.15)]'
                            : 'bg-white/5 border-white/10 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-400 mb-1">
                          <span className="text-[#E5B868]">{play.timestamp || '00:00'}</span>
                          <span className="uppercase text-slate-400">{play.team}</span>
                        </div>
                        <p>{play.text}</p>
                      </motion.div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      No play-by-play events recorded yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 mt-4 text-center">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
                  JUST1PLAY REALTIME TELEMETRY ENGINE
                </span>
              </div>
            </BentoCard>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center rounded-3xl bg-white/5 border border-white/10">
          <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white uppercase tracking-wider">
            NO LIVE GAMES FOUND FOR THIS SPORT
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Scorekeepers can click "New Live Game" to start a real-time scoreboard broadcast.
          </p>
        </div>
      )}

      {/* CREATE NEW GAME MODAL OVERLAY */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#212A31]/80 backdrop-blur-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-[#000000] border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl text-white space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-sm font-black uppercase text-[#E5B868] flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  CREATE REAL-TIME LIVE GAME SCOREBOARD
                </span>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateGame} className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Game Title / Matchup</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. 'State Finals: St. Anthony vs Bergen Catholic'"
                    className="w-full bg-[#212A31] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#E5B868] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Sport</label>
                  <select
                    value={newSport}
                    onChange={(e) => setNewSport(e.target.value as SportType)}
                    className="w-full bg-[#212A31] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#E5B868] focus:outline-none"
                  >
                    <option value="Basketball">🏀 Basketball</option>
                    <option value="Flag Football">🏈 Flag Football</option>
                    <option value="Lacrosse">🥍 Lacrosse</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Home Team Name</label>
                    <input
                      type="text"
                      required
                      value={newHomeName}
                      onChange={(e) => setNewHomeName(e.target.value)}
                      placeholder="e.g. St. Anthony"
                      className="w-full bg-[#212A31] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#E5B868] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Home Abbreviation</label>
                    <input
                      type="text"
                      maxLength={4}
                      value={newHomeAbbr}
                      onChange={(e) => setNewHomeAbbr(e.target.value)}
                      placeholder="STA"
                      className="w-full bg-[#212A31] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#E5B868] focus:outline-none uppercase font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Away Team Name</label>
                    <input
                      type="text"
                      required
                      value={newAwayName}
                      onChange={(e) => setNewAwayName(e.target.value)}
                      placeholder="e.g. Bergen Catholic"
                      className="w-full bg-[#212A31] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#E5B868] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Away Abbreviation</label>
                    <input
                      type="text"
                      maxLength={4}
                      value={newAwayAbbr}
                      onChange={(e) => setNewAwayAbbr(e.target.value)}
                      placeholder="BC"
                      className="w-full bg-[#212A31] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#E5B868] focus:outline-none uppercase font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Location Arena</label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="e.g. MetLife Arena, NJ"
                    className="w-full bg-[#212A31] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#E5B868] focus:outline-none"
                  />
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    className="w-full py-3 bg-[#E5B868] hover:bg-[#38BDF8] text-black font-black text-xs uppercase tracking-wider rounded-2xl shadow-[0_0_20px_rgba(0,242,254,0.4)] transition-all cursor-pointer"
                  >
                    START LIVE SCOREBOARD BROADCAST
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
