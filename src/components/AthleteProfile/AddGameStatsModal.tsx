import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  GameStatEntry, 
  FootballGameStats,
  FlagFootballGameStats,
  BasketballGameStats, 
  SoccerGameStats,
  BaseballGameStats,
  VolleyballGameStats,
  LacrosseGameStats,
  TrackGameStats
} from '../../types';
import { SportSelector } from '../Common/SportSelector';
import { 
  X, 
  Trophy, 
  Calendar, 
  ShieldAlert, 
  MapPin, 
  Video, 
  FileText, 
  Activity, 
  Check, 
  Plus,
  Flame,
  Search,
  Sparkles,
  Zap,
  Target,
  Medal,
  CheckCircle2,
  ListFilter
} from 'lucide-react';

export interface AddGameStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  athleteUid: string;
  currentSport?: string;
  onSaveGameLog: (gameEntry: GameStatEntry) => void;
}

// Preset popular sports events for quick linking
const DEMO_EVENTS = [
  { id: 'evt-ec-showcase-2026', title: 'East Coast Elite Scouting Showcase 2026', date: '2026-08-01', location: 'MetLife Stadium, NJ' },
  { id: 'evt-national-combine', title: 'National High School Football Combine', date: '2026-07-20', location: 'IMG Academy, FL' },
  { id: 'evt-[#E5B868]-hoops', title: 'Tri-State AAU Summer Championship', date: '2026-07-15', location: 'Barclays Center, NY' },
  { id: 'evt-regional-flag', title: 'Regional Flag Football Championship', date: '2026-06-28', location: 'Lincoln Financial Field, PA' }
];

export const AddGameStatsModal: React.FC<AddGameStatsModalProps> = ({
  isOpen,
  onClose,
  athleteUid,
  currentSport = 'Football',
  onSaveGameLog
}) => {
  if (!isOpen) return null;

  // Form State
  const [selectedSport, setSelectedSport] = useState<string>(currentSport || 'Football');
  const [gameDate, setGameDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [opponent, setOpponent] = useState<string>('');
  const [gameResult, setGameResult] = useState<'W' | 'L' | 'T'>('W');
  const [teamScore, setTeamScore] = useState<string>('28');
  const [opponentScore, setOpponentScore] = useState<string>('21');
  const [isHomeGame, setIsHomeGame] = useState<boolean>(true);
  const [location, setLocation] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [highlightVideoUrl, setHighlightVideoUrl] = useState<string>('');

  // Event Linking State
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedEventName, setSelectedEventName] = useState<string>('');
  const [availableEvents, setAvailableEvents] = useState<Array<{ id: string; title: string; date?: string; location?: string }>>(DEMO_EVENTS);
  const [showEventDropdown, setShowEventDropdown] = useState<boolean>(false);

  // Sport Specific Metric States
  // Football
  const [fbTouchdowns, setFbTouchdowns] = useState<string>('2');
  const [fbTackles, setFbTackles] = useState<string>('8');
  const [fbPassingYards, setFbPassingYards] = useState<string>('240');
  const [fbPassingTds, setFbPassingTds] = useState<string>('3');
  const [fbRushingYards, setFbRushingYards] = useState<string>('65');
  const [fbRushingTds, setFbRushingTds] = useState<string>('1');
  const [fbReceivingYards, setFbReceivingYards] = useState<string>('0');
  const [fbReceptions, setFbReceptions] = useState<string>('0');
  const [fbSacks, setFbSacks] = useState<string>('1');
  const [fbInterceptions, setFbInterceptions] = useState<string>('0');

  // Basketball
  const [bbPoints, setBbPoints] = useState<string>('24');
  const [bbRebounds, setBbRebounds] = useState<string>('7');
  const [bbAssists, setBbAssists] = useState<string>('8');
  const [bbSteals, setBbSteals] = useState<string>('3');
  const [bbBlocks, setBbBlocks] = useState<string>('1');
  const [bbFgMade, setBbFgMade] = useState<string>('9');
  const [bbFgAttempted, setBbFgAttempted] = useState<string>('16');
  const [bbThreeMade, setBbThreeMade] = useState<string>('3');
  const [bbFtMade, setBbFtMade] = useState<string>('3');
  const [bbFtAttempted, setBbFtAttempted] = useState<string>('4');

  // Flag Football
  const [ffPassingYards, setFfPassingYards] = useState<string>('210');
  const [ffPassingTds, setFfPassingTds] = useState<string>('3');
  const [ffRushingYards, setFfRushingYards] = useState<string>('45');
  const [ffRushingTds, setFfRushingTds] = useState<string>('1');
  const [ffFlagPulls, setFfFlagPulls] = useState<string>('5');
  const [ffInterceptions, setFfInterceptions] = useState<string>('1');

  // Soccer
  const [scGoals, setScGoals] = useState<string>('2');
  const [scAssists, setScAssists] = useState<string>('1');
  const [scShotsOnGoal, setScShotsOnGoal] = useState<string>('5');
  const [scTackles, setScTackles] = useState<string>('4');
  const [scSaves, setScSaves] = useState<string>('0');
  const [scCleanSheet, setScCleanSheet] = useState<boolean>(false);

  // Baseball
  const [bsHits, setBsHits] = useState<string>('3');
  const [bsRuns, setBsRuns] = useState<string>('2');
  const [bsRbis, setBsRbis] = useState<string>('4');
  const [bsHomeRuns, setBsHomeRuns] = useState<string>('1');
  const [bsStolenBases, setBsStolenBases] = useState<string>('2');

  // Volleyball
  const [vbKills, setVbKills] = useState<string>('12');
  const [vbBlocks, setVbBlocks] = useState<string>('4');
  const [vbDigs, setVbDigs] = useState<string>('8');
  const [vbAces, setVbAces] = useState<string>('3');
  const [vbAssists, setVbAssists] = useState<string>('15');

  // Lacrosse
  const [laxGoals, setLaxGoals] = useState<string>('4');
  const [laxAssists, setLaxAssists] = useState<string>('2');
  const [laxGroundBalls, setLaxGroundBalls] = useState<string>('3');
  const [laxDrawControls, setLaxDrawControls] = useState<string>('1');

  // Track & Field
  const [trTrackEvent, setTrTrackEvent] = useState<string>('100m Dash');
  const [trTimeSeconds, setTrTimeSeconds] = useState<string>('10.84');
  const [trPlace, setTrPlace] = useState<string>('1');

  // Custom Stats (for other sports)
  const [customMetric1Label, setCustomMetric1Label] = useState<string>('Key Metric 1');
  const [customMetric1Val, setCustomMetric1Val] = useState<string>('10');
  const [customMetric2Label, setCustomMetric2Label] = useState<string>('Key Metric 2');
  const [customMetric2Val, setCustomMetric2Val] = useState<string>('5');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMessage, setSuccessMessage] = useState(false);

  // Fetch Firestore Events if available
  useEffect(() => {
    try {
      const q = query(collection(db, 'events'));
      const unsub = onSnapshot(q, (snapshot) => {
        const fetched = snapshot.docs.map(doc => ({
          id: doc.id,
          title: doc.data().title || doc.data().name || 'Untitled Event',
          date: doc.data().date || doc.data().startDate || '',
          location: doc.data().location || ''
        }));
        if (fetched.length > 0) {
          // Merge with DEMO_EVENTS
          const combined = [...fetched, ...DEMO_EVENTS.filter(d => !fetched.some(f => f.id === d.id))];
          setAvailableEvents(combined);
        }
      }, (err) => {
        console.warn('Events snapshot warning in AddGameStatsModal:', err);
      });
      return () => unsub();
    } catch (e) {
      console.warn('Firestore events query error:', e);
    }
  }, []);

  const handleSelectEvent = (evt: { id: string; title: string; date?: string; location?: string }) => {
    setSelectedEventId(evt.id);
    setSelectedEventName(evt.title);
    if (evt.date) setGameDate(evt.date);
    if (evt.location) setLocation(evt.location);
    setShowEventDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!opponent.trim() && !selectedEventName.trim()) {
      setErrorMsg('Please specify either an Opponent Team name or linked Event name.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    let compiledStats: any = {};

    const sportLower = selectedSport.toLowerCase();

    if (sportLower.includes('football') && !sportLower.includes('flag')) {
      compiledStats = {
        touchdowns: parseInt(fbTouchdowns) || 0,
        tackles: parseFloat(fbTackles) || 0,
        passingYards: parseFloat(fbPassingYards) || 0,
        passingTds: parseInt(fbPassingTds) || 0,
        rushingYards: parseFloat(fbRushingYards) || 0,
        rushingTds: parseInt(fbRushingTds) || 0,
        receivingYards: parseFloat(fbReceivingYards) || 0,
        receptions: parseInt(fbReceptions) || 0,
        sacks: parseFloat(fbSacks) || 0,
        interceptions: parseInt(fbInterceptions) || 0
      };
    } else if (sportLower.includes('flag')) {
      compiledStats = {
        passingYards: parseFloat(ffPassingYards) || 0,
        passingTds: parseInt(ffPassingTds) || 0,
        rushingYards: parseFloat(ffRushingYards) || 0,
        rushingTds: parseInt(ffRushingTds) || 0,
        flagPulls: parseInt(ffFlagPulls) || 0,
        interceptions: parseInt(ffInterceptions) || 0
      };
    } else if (sportLower.includes('basketball')) {
      compiledStats = {
        points: parseFloat(bbPoints) || 0,
        rebounds: parseFloat(bbRebounds) || 0,
        assists: parseFloat(bbAssists) || 0,
        steals: parseFloat(bbSteals) || 0,
        blocks: parseFloat(bbBlocks) || 0,
        fgMade: parseInt(bbFgMade) || 0,
        fgAttempted: parseInt(bbFgAttempted) || 0,
        threeMade: parseInt(bbThreeMade) || 0,
        ftMade: parseInt(bbFtMade) || 0,
        ftAttempted: parseInt(bbFtAttempted) || 0
      };
    } else if (sportLower.includes('soccer')) {
      compiledStats = {
        goals: parseInt(scGoals) || 0,
        assists: parseInt(scAssists) || 0,
        shotsOnGoal: parseInt(scShotsOnGoal) || 0,
        tackles: parseInt(scTackles) || 0,
        saves: parseInt(scSaves) || 0,
        cleanSheet: scCleanSheet
      };
    } else if (sportLower.includes('baseball') || sportLower.includes('softball')) {
      compiledStats = {
        hits: parseInt(bsHits) || 0,
        runs: parseInt(bsRuns) || 0,
        rbis: parseInt(bsRbis) || 0,
        homeRuns: parseInt(bsHomeRuns) || 0,
        stolenBases: parseInt(bsStolenBases) || 0
      };
    } else if (sportLower.includes('volleyball')) {
      compiledStats = {
        kills: parseInt(vbKills) || 0,
        blocks: parseInt(vbBlocks) || 0,
        digs: parseInt(vbDigs) || 0,
        aces: parseInt(vbAces) || 0,
        assists: parseInt(vbAssists) || 0
      };
    } else if (sportLower.includes('lacrosse')) {
      compiledStats = {
        goals: parseInt(laxGoals) || 0,
        assists: parseInt(laxAssists) || 0,
        groundBalls: parseInt(laxGroundBalls) || 0,
        drawControls: parseInt(laxDrawControls) || 0
      };
    } else if (sportLower.includes('track') || sportLower.includes('running')) {
      compiledStats = {
        eventName: trTrackEvent,
        timeSeconds: parseFloat(trTimeSeconds) || 0,
        place: parseInt(trPlace) || 1
      };
    } else {
      compiledStats = {
        [customMetric1Label || 'Metric 1']: parseFloat(customMetric1Val) || 0,
        [customMetric2Label || 'Metric 2']: parseFloat(customMetric2Val) || 0
      };
    }

    const newGameEntry: GameStatEntry = {
      id: `glog-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      athleteUid,
      gameDate,
      sport: selectedSport as any,
      opponent: opponent.trim() || selectedEventName.trim() || 'Scouting Showcase',
      gameResult,
      teamScore: parseInt(teamScore) || 0,
      opponentScore: parseInt(opponentScore) || 0,
      isHomeGame,
      location: location.trim() || (isHomeGame ? 'Home Arena' : 'Away Field'),
      eventId: selectedEventId || undefined,
      eventName: selectedEventName || undefined,
      notes: notes.trim(),
      highlightVideoUrl: highlightVideoUrl.trim() || undefined,
      stats: compiledStats,
      createdAt: new Date().toISOString(),
      isVerified: true
    };

    // Attempt writing to Firestore subcollection if active
    if (athleteUid) {
      try {
        const statsRef = collection(db, 'users', athleteUid, 'Stats');
        await addDoc(statsRef, {
          athleteUid,
          gameDate,
          sport: selectedSport,
          opponent: newGameEntry.opponent,
          gameResult,
          teamScore: newGameEntry.teamScore,
          opponentScore: newGameEntry.opponentScore,
          eventId: selectedEventId || null,
          eventName: selectedEventName || null,
          stats: compiledStats,
          notes: newGameEntry.notes,
          highlightVideoUrl: newGameEntry.highlightVideoUrl || null,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.warn('Direct Firestore stat save notice:', err);
      }
    }

    onSaveGameLog(newGameEntry);
    setIsSubmitting(false);
    setSuccessMessage(true);

    setTimeout(() => {
      setSuccessMessage(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#212A31]/80 backdrop-blur-2xl overflow-y-auto">
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-[#212A31]/95 border border-slate-200 dark:border-[#E5B868]/30 rounded-3xl p-5 sm:p-8 shadow-2xl dark:shadow-[0_0_60px_rgba(214,28,36,0.2)] my-6 max-h-[92vh] overflow-y-auto text-slate-900 dark:text-white backdrop-blur-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-rose-500/20 text-slate-500 dark:text-slate-400 hover:text-rose-500 border border-slate-200 dark:border-white/10 transition-all cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-white/10 mb-5">
          <div className="p-3 rounded-2xl bg-red-600/15 dark:bg-[#E5B868]/20 border border-red-600/30 dark:border-[#E5B868]/40 text-red-600 dark:text-[#E5B868] shadow-[0_0_15px_rgba(214,28,36,0.25)]">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest bg-red-600 dark:bg-[#E5B868] text-black rounded-sm shadow-[0_0_10px_rgba(214,28,36,0.4)]">
                GAME STAT PORTFOLIO
              </span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1 font-mono">
                <Sparkles className="w-3 h-3 text-red-600 dark:text-[#E5B868]" /> Verified Log
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black italic uppercase tracking-tight text-slate-900 dark:text-white font-sans mt-0.5">
              Add Official Game Stats
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Record game metrics, touchdowns, tackles, points, and link to showcases or events
            </p>
          </div>
        </div>

        {/* Success Alert */}
        {successMessage ? (
          <div className="p-6 rounded-2xl bg-red-600/20 border border-red-600/40 text-center space-y-3 animate-fadeIn my-6">
            <CheckCircle2 className="w-12 h-12 text-red-600 dark:text-[#E5B868] mx-auto animate-bounce" />
            <h3 className="text-lg font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Game Stats Logged Successfully!
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto font-mono">
              Your performance metrics have been verified and added to your recruiter profile portfolio.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-600 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 1. Sport Selector */}
            <div>
              <SportSelector
                selectedSport={selectedSport}
                onSelectSport={setSelectedSport}
                label="Select Sport"
                placeholder="Search or choose sport..."
                compact
              />
            </div>

            {/* 2. Event & Date Link Section */}
            <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/10 space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-red-600 dark:text-[#E5B868] flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Link to Event or Tournament Date
                </h3>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold">
                  * Optional Event Link
                </span>
              </div>

              {/* Event Picker Dropdown or Search */}
              <div className="relative">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                  Event / Tournament Name
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={selectedEventName}
                      onChange={(e) => {
                        setSelectedEventName(e.target.value);
                        setSelectedEventId('');
                        setShowEventDropdown(true);
                      }}
                      onFocus={() => setShowEventDropdown(true)}
                      placeholder="e.g. East Coast Elite Showcase or Custom Game"
                      className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-red-600 dark:focus:border-[#E5B868] focus:outline-none"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>

                  {selectedEventName && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEventName('');
                        setSelectedEventId('');
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 text-xs font-mono hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Event Suggestions */}
                {showEventDropdown && availableEvents.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[#212A31] border border-slate-200 dark:border-[#E5B868]/40 rounded-2xl p-2 shadow-2xl z-30 max-h-48 overflow-y-auto space-y-1">
                    <span className="text-[10px] font-mono font-bold text-slate-400 px-2 uppercase block mb-1">
                      Select Registered / Showcase Event:
                    </span>
                    {availableEvents.map((evt) => (
                      <div
                        key={evt.id}
                        onClick={() => handleSelectEvent(evt)}
                        className="p-2.5 rounded-xl hover:bg-red-600/10 dark:hover:bg-[#E5B868]/10 border border-transparent hover:border-red-600/30 transition-all cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {evt.title}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                            {evt.date && <span>📅 {evt.date}</span>}
                            {evt.location && <span>📍 {evt.location}</span>}
                          </div>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-600/10 text-red-600 dark:text-[#E5B868]">
                          Link
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Game Date & Opponent Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                    Game / Event Date *
                  </label>
                  <input
                    type="date"
                    value={gameDate}
                    onChange={(e) => setGameDate(e.target.value)}
                    className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-red-600 dark:focus:border-[#E5B868] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                    Opponent Team Name *
                  </label>
                  <input
                    type="text"
                    value={opponent}
                    onChange={(e) => setOpponent(e.target.value)}
                    placeholder="e.g. St. Peter's Prep Knights"
                    className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-red-600 dark:focus:border-[#E5B868] focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Game Result W/L/T & Scores */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                    Game Outcome
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {(['W', 'L', 'T'] as const).map((res) => (
                      <button
                        key={res}
                        type="button"
                        onClick={() => setGameResult(res)}
                        className={`py-2 text-xs font-black rounded-xl border transition-all cursor-pointer ${
                          gameResult === res
                            ? res === 'W'
                              ? 'bg-red-600 text-black border-red-500 font-mono shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                              : res === 'L'
                              ? 'bg-rose-500 text-white border-rose-400 font-mono'
                              : 'bg-amber-500 text-black border-amber-400 font-mono'
                            : 'bg-slate-200 dark:bg-black/40 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-white/10'
                        }`}
                      >
                        {res === 'W' ? 'WIN (W)' : res === 'L' ? 'LOSS (L)' : 'TIE (T)'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                    Your Team Score
                  </label>
                  <input
                    type="number"
                    value={teamScore}
                    onChange={(e) => setTeamScore(e.target.value)}
                    className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-red-600 dark:text-[#E5B868] focus:border-red-600 dark:focus:border-[#E5B868] focus:outline-none text-center"
                    placeholder="28"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                    Opponent Score
                  </label>
                  <input
                    type="number"
                    value={opponentScore}
                    onChange={(e) => setOpponentScore(e.target.value)}
                    className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-red-600 dark:focus:border-[#E5B868] focus:outline-none text-center"
                    placeholder="21"
                  />
                </div>
              </div>

              {/* Location details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                    Home / Away
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsHomeGame(true)}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        isHomeGame
                          ? 'bg-red-600/20 text-emerald-700 dark:text-[#E5B868] border-red-600/50'
                          : 'bg-slate-200 dark:bg-black/40 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-white/10'
                      }`}
                    >
                      🏠 Home Game
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsHomeGame(false)}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        !isHomeGame
                          ? 'bg-[#E5B868]/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/50'
                          : 'bg-slate-200 dark:bg-black/40 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-white/10'
                      }`}
                    >
                      🚌 Away Game
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                    Venue / Stadium
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. MetLife Stadium or Main Turf Field"
                    className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-red-600 dark:focus:border-[#E5B868] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 3. Key Performance Metrics Form */}
            <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-red-600 dark:text-[#E5B868] flex items-center gap-2">
                <Activity className="w-4 h-4" /> Key Performance Metrics ({selectedSport})
              </h3>

              {/* FOOTBALL METRICS */}
              {selectedSport.toLowerCase().includes('football') && !selectedSport.toLowerCase().includes('flag') && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Touchdowns (TD)
                    </label>
                    <input
                      type="number"
                      value={fbTouchdowns}
                      onChange={(e) => setFbTouchdowns(e.target.value)}
                      className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-red-600 dark:text-[#E5B868] focus:border-red-600 focus:outline-none"
                      placeholder="2"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Tackles (TCK)
                    </label>
                    <input
                      type="number"
                      value={fbTackles}
                      onChange={(e) => setFbTackles(e.target.value)}
                      className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-red-600 focus:outline-none"
                      placeholder="8"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Passing YDS
                    </label>
                    <input
                      type="number"
                      value={fbPassingYards}
                      onChange={(e) => setFbPassingYards(e.target.value)}
                      className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-red-600 focus:outline-none"
                      placeholder="240"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Passing TDs
                    </label>
                    <input
                      type="number"
                      value={fbPassingTds}
                      onChange={(e) => setFbPassingTds(e.target.value)}
                      className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-red-600 focus:outline-none"
                      placeholder="3"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Rushing YDS
                    </label>
                    <input
                      type="number"
                      value={fbRushingYards}
                      onChange={(e) => setFbRushingYards(e.target.value)}
                      className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-red-600 focus:outline-none"
                      placeholder="65"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Rushing TDs
                    </label>
                    <input
                      type="number"
                      value={fbRushingTds}
                      onChange={(e) => setFbRushingTds(e.target.value)}
                      className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-red-600 focus:outline-none"
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Sacks (SCK)
                    </label>
                    <input
                      type="number"
                      value={fbSacks}
                      onChange={(e) => setFbSacks(e.target.value)}
                      className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-cyan-600 dark:text-slate-300 focus:border-red-600 focus:outline-none"
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Interceptions (INT)
                    </label>
                    <input
                      type="number"
                      value={fbInterceptions}
                      onChange={(e) => setFbInterceptions(e.target.value)}
                      className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-amber-600 dark:text-amber-400 focus:border-red-600 focus:outline-none"
                      placeholder="0"
                    />
                  </div>
                </div>
              )}

              {/* FLAG FOOTBALL METRICS */}
              {selectedSport.toLowerCase().includes('flag') && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Passing YDS
                    </label>
                    <input
                      type="number"
                      value={ffPassingYards}
                      onChange={(e) => setFfPassingYards(e.target.value)}
                      className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-red-600 dark:text-[#E5B868] focus:border-red-600 focus:outline-none"
                      placeholder="210"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Passing TDs
                    </label>
                    <input
                      type="number"
                      value={ffPassingTds}
                      onChange={(e) => setFfPassingTds(e.target.value)}
                      className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-red-600 focus:outline-none"
                      placeholder="3"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Rushing YDS
                    </label>
                    <input
                      type="number"
                      value={ffRushingYards}
                      onChange={(e) => setFfRushingYards(e.target.value)}
                      className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-red-600 focus:outline-none"
                      placeholder="45"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Rushing TDs
                    </label>
                    <input
                      type="number"
                      value={ffRushingTds}
                      onChange={(e) => setFfRushingTds(e.target.value)}
                      className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-red-600 focus:outline-none"
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Flag Pulls
                    </label>
                    <input
                      type="number"
                      value={ffFlagPulls}
                      onChange={(e) => setFfFlagPulls(e.target.value)}
                      className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-cyan-600 dark:text-slate-300 focus:border-red-600 focus:outline-none"
                      placeholder="5"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Interceptions
                    </label>
                    <input
                      type="number"
                      value={ffInterceptions}
                      onChange={(e) => setFfInterceptions(e.target.value)}
                      className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-amber-600 dark:text-amber-400 focus:border-red-600 focus:outline-none"
                      placeholder="1"
                    />
                  </div>
                </div>
              )}

              {/* BASKETBALL METRICS */}
              {selectedSport.toLowerCase().includes('basketball') && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Points (PTS)
                    </label>
                    <input
                      type="number"
                      value={bbPoints}
                      onChange={(e) => setBbPoints(e.target.value)}
                      className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-red-600 dark:text-[#E5B868] focus:border-red-600 focus:outline-none"
                      placeholder="24"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Rebounds (REB)
                    </label>
                    <input
                      type="number"
                      value={bbRebounds}
                      onChange={(e) => setBbRebounds(e.target.value)}
                      className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-red-600 focus:outline-none"
                      placeholder="7"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Assists (AST)
                    </label>
                    <input
                      type="number"
                      value={bbAssists}
                      onChange={(e) => setBbAssists(e.target.value)}
                      className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-red-600 focus:outline-none"
                      placeholder="8"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Steals (STL)
                    </label>
                    <input
                      type="number"
                      value={bbSteals}
                      onChange={(e) => setBbSteals(e.target.value)}
                      className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-red-600 focus:outline-none"
                      placeholder="3"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Blocks (BLK)
                    </label>
                    <input
                      type="number"
                      value={bbBlocks}
                      onChange={(e) => setBbBlocks(e.target.value)}
                      className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-red-600 focus:outline-none"
                      placeholder="1"
                    />
                  </div>
                </div>
              )}

              {/* SOCCER METRICS */}
              {selectedSport.toLowerCase().includes('soccer') && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Goals
                    </label>
                    <input
                      type="number"
                      value={scGoals}
                      onChange={(e) => setScGoals(e.target.value)}
                      className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-red-600 dark:text-[#E5B868] focus:border-red-600 focus:outline-none"
                      placeholder="2"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Assists
                    </label>
                    <input
                      type="number"
                      value={scAssists}
                      onChange={(e) => setScAssists(e.target.value)}
                      className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-red-600 focus:outline-none"
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Shots on Goal
                    </label>
                    <input
                      type="number"
                      value={scShotsOnGoal}
                      onChange={(e) => setScShotsOnGoal(e.target.value)}
                      className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-red-600 focus:outline-none"
                      placeholder="5"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Tackles Won
                    </label>
                    <input
                      type="number"
                      value={scTackles}
                      onChange={(e) => setScTackles(e.target.value)}
                      className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-red-600 focus:outline-none"
                      placeholder="4"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Goalkeeper Saves
                    </label>
                    <input
                      type="number"
                      value={scSaves}
                      onChange={(e) => setScSaves(e.target.value)}
                      className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-red-600 focus:outline-none"
                      placeholder="0"
                    />
                  </div>
                  <div className="flex items-center pt-4">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={scCleanSheet}
                        onChange={(e) => setScCleanSheet(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-600"
                      />
                      <span>Clean Sheet / Shutout</span>
                    </label>
                  </div>
                </div>
              )}

              {/* BASEBALL / SOFTBALL METRICS */}
              {(selectedSport.toLowerCase().includes('baseball') || selectedSport.toLowerCase().includes('softball')) && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Hits (H)
                    </label>
                    <input
                      type="number"
                      value={bsHits}
                      onChange={(e) => setBsHits(e.target.value)}
                      className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-red-600 dark:text-[#E5B868] focus:border-red-600 focus:outline-none"
                      placeholder="3"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Runs (R)
                    </label>
                    <input
                      type="number"
                      value={bsRuns}
                      onChange={(e) => setBsRuns(e.target.value)}
                      className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-red-600 focus:outline-none"
                      placeholder="2"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      RBIs
                    </label>
                    <input
                      type="number"
                      value={bsRbis}
                      onChange={(e) => setBsRbis(e.target.value)}
                      className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-red-600 focus:outline-none"
                      placeholder="4"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Home Runs (HR)
                    </label>
                    <input
                      type="number"
                      value={bsHomeRuns}
                      onChange={(e) => setBsHomeRuns(e.target.value)}
                      className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-[#E5B868] focus:border-red-600 focus:outline-none"
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Stolen Bases (SB)
                    </label>
                    <input
                      type="number"
                      value={bsStolenBases}
                      onChange={(e) => setBsStolenBases(e.target.value)}
                      className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-red-600 focus:outline-none"
                      placeholder="2"
                    />
                  </div>
                </div>
              )}

              {/* VOLLEYBALL METRICS */}
              {selectedSport.toLowerCase().includes('volleyball') && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Kills
                    </label>
                    <input
                      type="number"
                      value={vbKills}
                      onChange={(e) => setVbKills(e.target.value)}
                      className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-red-600 dark:text-[#E5B868] focus:border-red-600 focus:outline-none"
                      placeholder="12"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Blocks
                    </label>
                    <input
                      type="number"
                      value={vbBlocks}
                      onChange={(e) => setVbBlocks(e.target.value)}
                      className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-red-600 focus:outline-none"
                      placeholder="4"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Digs
                    </label>
                    <input
                      type="number"
                      value={vbDigs}
                      onChange={(e) => setVbDigs(e.target.value)}
                      className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-red-600 focus:outline-none"
                      placeholder="8"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Aces
                    </label>
                    <input
                      type="number"
                      value={vbAces}
                      onChange={(e) => setVbAces(e.target.value)}
                      className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-red-600 focus:outline-none"
                      placeholder="3"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Assists
                    </label>
                    <input
                      type="number"
                      value={vbAssists}
                      onChange={(e) => setVbAssists(e.target.value)}
                      className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-red-600 focus:outline-none"
                      placeholder="15"
                    />
                  </div>
                </div>
              )}

              {/* TRACK & FIELD */}
              {(selectedSport.toLowerCase().includes('track') || selectedSport.toLowerCase().includes('running')) && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Track Event Name
                    </label>
                    <input
                      type="text"
                      value={trTrackEvent}
                      onChange={(e) => setTrTrackEvent(e.target.value)}
                      className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs text-slate-900 dark:text-white focus:border-red-600 focus:outline-none"
                      placeholder="100m Dash"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Official Time (Sec)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={trTimeSeconds}
                      onChange={(e) => setTrTimeSeconds(e.target.value)}
                      className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-red-600 dark:text-[#E5B868] focus:border-red-600 focus:outline-none"
                      placeholder="10.84"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Place / Ranking
                    </label>
                    <input
                      type="number"
                      value={trPlace}
                      onChange={(e) => setTrPlace(e.target.value)}
                      className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-red-600 focus:outline-none"
                      placeholder="1"
                    />
                  </div>
                </div>
              )}

              {/* CUSTOM / OTHER SPORT FALLBACK */}
              {!['football', 'flag', 'basketball', 'soccer', 'baseball', 'softball', 'volleyball', 'track', 'running', 'lacrosse'].some(s => selectedSport.toLowerCase().includes(s)) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Custom Metric 1 Name & Value
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customMetric1Label}
                        onChange={(e) => setCustomMetric1Label(e.target.value)}
                        className="w-1/2 bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs text-slate-900 dark:text-white"
                        placeholder="Metric Name"
                      />
                      <input
                        type="number"
                        value={customMetric1Val}
                        onChange={(e) => setCustomMetric1Val(e.target.value)}
                        className="w-1/2 bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-red-600 dark:text-[#E5B868]"
                        placeholder="10"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Custom Metric 2 Name & Value
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customMetric2Label}
                        onChange={(e) => setCustomMetric2Label(e.target.value)}
                        className="w-1/2 bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs text-slate-900 dark:text-white"
                        placeholder="Metric Name"
                      />
                      <input
                        type="number"
                        value={customMetric2Val}
                        onChange={(e) => setCustomMetric2Val(e.target.value)}
                        className="w-1/2 bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white"
                        placeholder="5"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Media & Scouting Narrative */}
            <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/10 space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1 flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-red-600 dark:text-[#E5B868]" /> Game Highlight Link (YouTube, Hudl, TikTok, IG Reel)
                </label>
                <input
                  type="url"
                  value={highlightVideoUrl}
                  onChange={(e) => setHighlightVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... or Hudl reel link"
                  className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-red-600 dark:focus:border-[#E5B868] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-red-600 dark:text-[#E5B868]" /> Game Notes & Scouting Narrative
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Key game plays, 4th quarter performance, clutch touchdowns, defensive stops..."
                  className="w-full bg-white dark:bg-[#212A31] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-red-600 dark:focus:border-[#E5B868] focus:outline-none"
                />
              </div>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-red-600 hover:bg-red-600 dark:bg-[#E5B868] dark:hover:bg-[#B8141B] text-black font-black text-xs uppercase tracking-wider rounded-2xl shadow-[0_0_20px_rgba(214,28,36,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{isSubmitting ? 'LOGGING GAME PERFORMANCE...' : 'SAVE GAME STATS TO PORTFOLIO'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
