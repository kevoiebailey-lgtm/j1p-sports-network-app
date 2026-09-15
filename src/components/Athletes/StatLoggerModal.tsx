import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  BarChart2, 
  Calendar, 
  Trophy, 
  ShieldCheck, 
  Upload, 
  Check, 
  Loader2, 
  Sparkles, 
  Plus, 
  FileText, 
  Activity, 
  Flame, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Image as ImageIcon,
  Trash2
} from 'lucide-react';
import { collection, addDoc, doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { GameStatEntry } from '../../types';
import { QuickAddPresetBar } from './QuickAddPresetBar';
import { StatPreset, StatPresetValues } from './statPresetsData';

export type SupportedSport = 
  | 'football' 
  | 'basketball' 
  | 'soccer' 
  | 'lacrosse' 
  | 'field_hockey' 
  | 'wrestling' 
  | 'cheer' 
  | 'track_field';

export interface StatLoggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  athleteId?: string;
  defaultSport?: string;
  onStatLogged?: (entry: any) => void;
}

export const SPORT_CONFIGS: Record<SupportedSport, { label: string; icon: string; bg: string }> = {
  football: { label: 'Football / Flag Football', icon: '🏈', bg: 'from-amber-600/20 to-amber-900/10' },
  basketball: { label: 'Basketball', icon: '🏀', bg: 'from-orange-600/20 to-orange-900/10' },
  soccer: { label: 'Soccer', icon: '⚽', bg: 'from-emerald-600/20 to-emerald-900/10' },
  lacrosse: { label: 'Lacrosse', icon: '🥍', bg: 'from-cyan-600/20 to-cyan-900/10' },
  field_hockey: { label: 'Field Hockey', icon: '🏑', bg: 'from-teal-600/20 to-teal-900/10' },
  wrestling: { label: 'Wrestling', icon: '🤼', bg: 'from-red-600/20 to-red-900/10' },
  cheer: { label: 'Cheer & Dance', icon: '📣', bg: 'from-pink-600/20 to-pink-900/10' },
  track_field: { label: 'Track & Combine', icon: '🏃', bg: 'from-blue-600/20 to-blue-900/10' }
};

export const StatLoggerModal: React.FC<StatLoggerModalProps> = ({
  isOpen,
  onClose,
  athleteId,
  defaultSport = 'basketball',
  onStatLogged
}) => {
  const { user, profile, updateUserProfile } = useAuth();
  const activeAthleteId = athleteId || user?.uid || profile?.uid || 'guest-athlete';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Normalize initial sport
  const normalizeInitialSport = (s?: string): SupportedSport => {
    if (!s) return 'basketball';
    const lower = s.toLowerCase();
    if (lower.includes('basket')) return 'basketball';
    if (lower.includes('foot') || lower.includes('flag')) return 'football';
    if (lower.includes('soccer')) return 'soccer';
    if (lower.includes('lacrosse')) return 'lacrosse';
    if (lower.includes('field_hockey') || lower.includes('hockey')) return 'field_hockey';
    if (lower.includes('wrestl')) return 'wrestling';
    if (lower.includes('cheer') || lower.includes('dance')) return 'cheer';
    if (lower.includes('track') || lower.includes('combine') || lower.includes('sprint')) return 'track_field';
    return 'basketball';
  };

  // General Metadata
  const [selectedSport, setSelectedSport] = useState<SupportedSport>(normalizeInitialSport(defaultSport));
  const [gameDate, setGameDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [opponentName, setOpponentName] = useState<string>('');
  const [eventName, setEventName] = useState<string>('');
  const [gameResult, setGameResult] = useState<'W' | 'L' | 'T' | 'N/A'>('W');
  const [finalScore, setFinalScore] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Screenshot Upload State
  const [statSheetFile, setStatSheetFile] = useState<File | null>(null);
  const [statSheetPreview, setStatSheetPreview] = useState<string | null>(null);

  // 1. Basketball Stats
  const [bbPts, setBbPts] = useState<string>('22');
  const [bbReb, setBbReb] = useState<string>('6');
  const [bbAst, setBbAst] = useState<string>('7');
  const [bbStl, setBbStl] = useState<string>('3');
  const [bbBlk, setBbBlk] = useState<string>('1');
  const [bb3pm, setBb3pm] = useState<string>('4');
  const [bbFgMade, setBbFgMade] = useState<string>('8');
  const [bbFgAtt, setBbFgAtt] = useState<string>('14');
  const [bbFgPct, setBbFgPct] = useState<string>('57.1');

  // 2. Football / Flag Football Stats
  const [fbPassYds, setFbPassYds] = useState<string>('245');
  const [fbPassTds, setFbPassTds] = useState<string>('3');
  const [fbRushYds, setFbRushYds] = useState<string>('48');
  const [fbRushTds, setFbRushTds] = useState<string>('1');
  const [fbRec, setFbRec] = useState<string>('0');
  const [fbRecYds, setFbRecYds] = useState<string>('0');
  const [fbTckl, setFbTckl] = useState<string>('6');
  const [fbSacks, setFbSacks] = useState<string>('1.5');
  const [fbInts, setFbInts] = useState<string>('1');
  const [fbFlagPulls, setFbFlagPulls] = useState<string>('4');

  // 3. Soccer / Lacrosse / Field Hockey Stats
  const [socGoals, setSocGoals] = useState<string>('2');
  const [socAst, setSocAst] = useState<string>('1');
  const [socShots, setSocShots] = useState<string>('5');
  const [socGbSaves, setSocGbSaves] = useState<string>('4');
  const [socCleanSheet, setSocCleanSheet] = useState<boolean>(true);

  // 4. Wrestling Stats
  const [wrWinType, setWrWinType] = useState<'Pin' | 'Dec' | 'Tech Fall' | 'Major Dec' | 'Loss'>('Pin');
  const [wrTakedowns, setWrTakedowns] = useState<string>('4');
  const [wrEscapes, setWrEscapes] = useState<string>('2');
  const [wrReversals, setWrReversals] = useState<string>('1');
  const [wrWeightClass, setWrWeightClass] = useState<string>('152 lbs');

  // 5. Track & Combine Stats
  const [tkEventTime, setTkEventTime] = useState<string>('10.82');
  const [tkDistance, setTkDistance] = useState<string>("22' 4\"");
  const [tkDash40, setTkDash40] = useState<string>('4.45');
  const [tkVertical, setTkVertical] = useState<string>('36.5');
  const [tkEventCategory, setTkEventCategory] = useState<string>('100m Sprint');

  // 6. Cheer & Dance Stats
  const [chRoutineScore, setChRoutineScore] = useState<string>('94.8');
  const [chDifficulty, setChDifficulty] = useState<string>('9.6');
  const [chExecution, setChExecution] = useState<string>('9.4');
  const [chDeductions, setChDeductions] = useState<string>('0.0');

  // Status state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Current Stat Values for Quick-Add Preset Capture
  const currentStatValues: StatPresetValues = {
    bbPts,
    bbReb,
    bbAst,
    bbStl,
    bbBlk,
    bb3pm,
    bbFgMade,
    bbFgAtt,
    bbFgPct,
    fbPassYds,
    fbPassTds,
    fbRushYds,
    fbRushTds,
    fbRec,
    fbRecYds,
    fbTckl,
    fbSacks,
    fbInts,
    fbFlagPulls,
    socGoals,
    socAst,
    socShots,
    socGbSaves,
    socCleanSheet,
    wrWinType,
    wrTakedowns,
    wrEscapes,
    wrReversals,
    wrWeightClass,
    tkEventTime,
    tkDistance,
    tkDash40,
    tkVertical,
    tkEventCategory,
    chRoutineScore,
    chDifficulty,
    chExecution,
    chDeductions,
    gameResult,
    finalScore,
    notes
  };

  // Quick-Add Preset Application Handler
  const handleApplyPreset = (preset: StatPreset) => {
    const d = preset.data;
    if (preset.sport === 'basketball') {
      if (d.bbPts !== undefined) setBbPts(d.bbPts);
      if (d.bbReb !== undefined) setBbReb(d.bbReb);
      if (d.bbAst !== undefined) setBbAst(d.bbAst);
      if (d.bbStl !== undefined) setBbStl(d.bbStl);
      if (d.bbBlk !== undefined) setBbBlk(d.bbBlk);
      if (d.bb3pm !== undefined) setBb3pm(d.bb3pm);
      if (d.bbFgMade !== undefined) setBbFgMade(d.bbFgMade);
      if (d.bbFgAtt !== undefined) setBbFgAtt(d.bbFgAtt);
      if (d.bbFgPct !== undefined) setBbFgPct(d.bbFgPct);
      else if (d.bbFgMade && d.bbFgAtt) {
        const m = parseFloat(d.bbFgMade) || 0;
        const a = parseFloat(d.bbFgAtt) || 0;
        if (a > 0) setBbFgPct(((m / a) * 100).toFixed(1));
      }
    } else if (preset.sport === 'football') {
      if (d.fbPassYds !== undefined) setFbPassYds(d.fbPassYds);
      if (d.fbPassTds !== undefined) setFbPassTds(d.fbPassTds);
      if (d.fbRushYds !== undefined) setFbRushYds(d.fbRushYds);
      if (d.fbRushTds !== undefined) setFbRushTds(d.fbRushTds);
      if (d.fbRec !== undefined) setFbRec(d.fbRec);
      if (d.fbRecYds !== undefined) setFbRecYds(d.fbRecYds);
      if (d.fbTckl !== undefined) setFbTckl(d.fbTckl);
      if (d.fbSacks !== undefined) setFbSacks(d.fbSacks);
      if (d.fbInts !== undefined) setFbInts(d.fbInts);
      if (d.fbFlagPulls !== undefined) setFbFlagPulls(d.fbFlagPulls);
    } else if (['soccer', 'lacrosse', 'field_hockey'].includes(preset.sport)) {
      if (d.socGoals !== undefined) setSocGoals(d.socGoals);
      if (d.socAst !== undefined) setSocAst(d.socAst);
      if (d.socShots !== undefined) setSocShots(d.socShots);
      if (d.socGbSaves !== undefined) setSocGbSaves(d.socGbSaves);
      if (d.socCleanSheet !== undefined) setSocCleanSheet(d.socCleanSheet);
    } else if (preset.sport === 'wrestling') {
      if (d.wrWinType !== undefined) setWrWinType(d.wrWinType);
      if (d.wrTakedowns !== undefined) setWrTakedowns(d.wrTakedowns);
      if (d.wrEscapes !== undefined) setWrEscapes(d.wrEscapes);
      if (d.wrReversals !== undefined) setWrReversals(d.wrReversals);
      if (d.wrWeightClass !== undefined) setWrWeightClass(d.wrWeightClass);
    } else if (preset.sport === 'track_field') {
      if (d.tkEventTime !== undefined) setTkEventTime(d.tkEventTime);
      if (d.tkDistance !== undefined) setTkDistance(d.tkDistance);
      if (d.tkDash40 !== undefined) setTkDash40(d.tkDash40);
      if (d.tkVertical !== undefined) setTkVertical(d.tkVertical);
      if (d.tkEventCategory !== undefined) setTkEventCategory(d.tkEventCategory);
    } else if (preset.sport === 'cheer') {
      if (d.chRoutineScore !== undefined) setChRoutineScore(d.chRoutineScore);
      if (d.chDifficulty !== undefined) setChDifficulty(d.chDifficulty);
      if (d.chExecution !== undefined) setChExecution(d.chExecution);
      if (d.chDeductions !== undefined) setChDeductions(d.chDeductions);
    }

    if (d.gameResult !== undefined) setGameResult(d.gameResult);
    if (d.finalScore !== undefined && !finalScore) setFinalScore(d.finalScore);
    if (d.notes !== undefined && !notes) setNotes(d.notes);
  };

  // Quick-Add Reset Values Handler
  const handleResetValues = () => {
    switch (selectedSport) {
      case 'basketball':
        setBbPts('0');
        setBbReb('0');
        setBbAst('0');
        setBbStl('0');
        setBbBlk('0');
        setBb3pm('0');
        setBbFgMade('0');
        setBbFgAtt('0');
        setBbFgPct('0.0');
        break;
      case 'football':
        setFbPassYds('0');
        setFbPassTds('0');
        setFbRushYds('0');
        setFbRushTds('0');
        setFbRec('0');
        setFbRecYds('0');
        setFbTckl('0');
        setFbSacks('0');
        setFbInts('0');
        setFbFlagPulls('0');
        break;
      case 'soccer':
      case 'lacrosse':
      case 'field_hockey':
        setSocGoals('0');
        setSocAst('0');
        setSocShots('0');
        setSocGbSaves('0');
        setSocCleanSheet(false);
        break;
      case 'wrestling':
        setWrWinType('Dec');
        setWrTakedowns('0');
        setWrEscapes('0');
        setWrReversals('0');
        break;
      case 'track_field':
        setTkEventTime('');
        setTkDistance('');
        setTkDash40('');
        setTkVertical('');
        break;
      case 'cheer':
        setChRoutineScore('0.0');
        setChDifficulty('0.0');
        setChExecution('0.0');
        setChDeductions('0.0');
        break;
    }
  };

  // Auto calculate basketball FG%
  const handleBbFgChange = (made: string, att: string) => {
    setBbFgMade(made);
    setBbFgAtt(att);
    const m = parseFloat(made) || 0;
    const a = parseFloat(att) || 0;
    if (a > 0) {
      setBbFgPct(((m / a) * 100).toFixed(1));
    }
  };

  // Stat Sheet File Selection
  const handleStatSheetSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setStatSheetFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setStatSheetPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      let statSheetUrl = '';

      // Upload Stat Sheet image if provided
      if (statSheetFile) {
        try {
          const timestamp = Date.now();
          const storageRef = ref(storage, `users/${activeAthleteId}/stat_sheets/${timestamp}_${statSheetFile.name}`);
          const uploadRes = await uploadBytes(storageRef, statSheetFile);
          statSheetUrl = await getDownloadURL(uploadRes.ref);
        } catch (sErr) {
          console.warn('Stat sheet upload warning:', sErr);
          if (statSheetPreview) {
            statSheetUrl = statSheetPreview;
          }
        }
      }

      // Compile sport specific metrics object
      let metricsPayload: Record<string, any> = {};

      switch (selectedSport) {
        case 'basketball':
          metricsPayload = {
            points: Number(bbPts) || 0,
            rebounds: Number(bbReb) || 0,
            assists: Number(bbAst) || 0,
            steals: Number(bbStl) || 0,
            blocks: Number(bbBlk) || 0,
            threePointers: Number(bb3pm) || 0,
            fgMade: Number(bbFgMade) || 0,
            fgAttempted: Number(bbFgAtt) || 0,
            fgPercentage: Number(bbFgPct) || 0
          };
          break;

        case 'football':
          metricsPayload = {
            passingYards: Number(fbPassYds) || 0,
            passingTds: Number(fbPassTds) || 0,
            rushingYards: Number(fbRushYds) || 0,
            rushingTds: Number(fbRushTds) || 0,
            receptions: Number(fbRec) || 0,
            receivingYards: Number(fbRecYds) || 0,
            tackles: Number(fbTckl) || 0,
            sacks: Number(fbSacks) || 0,
            interceptions: Number(fbInts) || 0,
            flagPulls: Number(fbFlagPulls) || 0
          };
          break;

        case 'soccer':
        case 'lacrosse':
        case 'field_hockey':
          metricsPayload = {
            goals: Number(socGoals) || 0,
            assists: Number(socAst) || 0,
            shots: Number(socShots) || 0,
            groundBallsOrSaves: Number(socGbSaves) || 0,
            cleanSheet: socCleanSheet
          };
          break;

        case 'wrestling':
          metricsPayload = {
            winType: wrWinType,
            takedowns: Number(wrTakedowns) || 0,
            escapes: Number(wrEscapes) || 0,
            reversals: Number(wrReversals) || 0,
            weightClass: wrWeightClass
          };
          break;

        case 'track_field':
          metricsPayload = {
            eventCategory: tkEventCategory,
            eventTimeSeconds: Number(tkEventTime) || 0,
            distance: tkDistance,
            dash40: Number(tkDash40) || 0,
            verticalLeap: Number(tkVertical) || 0
          };
          break;

        case 'cheer':
          metricsPayload = {
            routineScore: Number(chRoutineScore) || 0,
            difficulty: Number(chDifficulty) || 0,
            execution: Number(chExecution) || 0,
            deductions: Number(chDeductions) || 0
          };
          break;
      }

      // Create Full Game Stat Entry
      const statEntryData = {
        athleteId: activeAthleteId,
        sport: selectedSport,
        gameDate,
        opponent: opponentName || 'League Matchup',
        eventName: eventName || 'Regular Season Match',
        result: gameResult,
        score: finalScore || 'Final',
        notes,
        stats: metricsPayload,
        statSheetUrl,
        createdAt: new Date().toISOString(),
        verified: false
      };

      // 1. Save entry to Firestore collection: users/{athleteId}/game_stats/{statId}
      const gameStatsColRef = collection(db, 'users', activeAthleteId, 'game_stats');
      const docRef = await addDoc(gameStatsColRef, statEntryData).catch(async (dbErr) => {
        console.warn('Firestore game_stats collection add failed; falling back:', dbErr);
        return { id: `stat-${Date.now()}` };
      });

      // 2. Update aggregate career stats on the athlete user document
      try {
        const userDocRef = doc(db, 'users', activeAthleteId);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const existingLogs = userData.gameLogs || [];
          const updatedLogs = [
            {
              id: docRef.id,
              date: gameDate,
              opponent: opponentName || 'Opponent',
              sport: selectedSport,
              result: gameResult,
              score: finalScore,
              stats: metricsPayload,
              statSheetUrl
            },
            ...existingLogs
          ].slice(0, 30); // Keep latest 30 logs

          // Aggregate updates based on sport
          let updatedStats = userData.stats || {};
          if (selectedSport === 'basketball') {
            const curPts = Number(updatedStats.points || 0) + (metricsPayload.points || 0);
            const curReb = Number(updatedStats.rebounds || 0) + (metricsPayload.rebounds || 0);
            const curAst = Number(updatedStats.assists || 0) + (metricsPayload.assists || 0);
            const curGp = Number(updatedStats.gamesPlayed || 0) + 1;
            updatedStats = {
              ...updatedStats,
              points: curPts,
              rebounds: curReb,
              assists: curAst,
              gamesPlayed: curGp,
              ppg: (curPts / curGp).toFixed(1),
              rpg: (curReb / curGp).toFixed(1),
              apg: (curAst / curGp).toFixed(1)
            };
          } else if (selectedSport === 'football') {
            const curPassYds = Number(updatedStats.passingYards || 0) + (metricsPayload.passingYards || 0);
            const curPassTds = Number(updatedStats.passingTds || 0) + (metricsPayload.passingTds || 0);
            const curRushYds = Number(updatedStats.rushingYards || 0) + (metricsPayload.rushingYards || 0);
            const curTckl = Number(updatedStats.tackles || 0) + (metricsPayload.tackles || 0);
            const curGp = Number(updatedStats.gamesPlayed || 0) + 1;
            updatedStats = {
              ...updatedStats,
              passingYards: curPassYds,
              passingTds: curPassTds,
              rushingYards: curRushYds,
              tackles: curTckl,
              gamesPlayed: curGp
            };
          }

          // Update Firestore doc
          await updateDoc(userDocRef, {
            stats: updatedStats,
            gameLogs: updatedLogs,
            updatedAt: new Date().toISOString()
          });

          // Sync context
          await updateUserProfile({
            stats: updatedStats,
            gameLogs: updatedLogs
          });
        }
      } catch (aggErr) {
        console.warn('Profile aggregate stats update notice:', aggErr);
      }

      setSuccessMsg('Game stats logged & synced successfully!');

      if (onStatLogged) {
        onStatLogged({ id: docRef.id, ...statEntryData });
      }

      setTimeout(() => {
        onClose();
        setIsSubmitting(false);
      }, 1200);

    } catch (err: any) {
      console.error('Stat logger error:', err);
      setErrorMsg(err.message || 'Failed to save stats. Please verify fields.');
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id="stat-logger-modal"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#090D16]/85 backdrop-blur-md overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-[#090D16] border border-[#263238] rounded-3xl shadow-[0_0_50px_rgba(0,184,212,0.15)] overflow-hidden text-[#F4F4F4]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#263238] bg-[#263238]/40 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#00B8D4]/10 border border-[#00B8D4]/30 flex items-center justify-center text-[#00B8D4]">
                <BarChart2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black uppercase tracking-tight text-[#F4F4F4] flex items-center gap-2">
                  <span>Log Game Statistics</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#00B8D4]/20 text-[#00B8D4] text-[10px] font-mono font-bold">
                    OFFICIAL
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Universal multi-sport verified daily stat &amp; scout box score
                </p>
              </div>
            </div>

            <button
              id="close-stat-logger-btn"
              onClick={onClose}
              className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content (Scrollable) */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
            
            {/* Status alerts */}
            {errorMsg && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* 1. Sport Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center justify-between">
                <span>Select Sport Discipline</span>
                <span className="text-[#00B8D4] text-[11px]">8 Formats Supported</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.keys(SPORT_CONFIGS) as SupportedSport[]).map((sportKey) => {
                  const item = SPORT_CONFIGS[sportKey];
                  const isSelected = selectedSport === sportKey;
                  return (
                    <button
                      key={sportKey}
                      type="button"
                      onClick={() => setSelectedSport(sportKey)}
                      className={`min-h-[48px] px-3 py-2.5 rounded-2xl flex items-center gap-2 text-xs font-bold transition-all border cursor-pointer ${
                        isSelected 
                          ? 'bg-[#00B8D4]/20 border-[#00B8D4] text-[#00F5D4] shadow-[0_0_15px_rgba(0,184,212,0.3)]' 
                          : 'bg-[#263238]/40 border-[#263238] text-slate-300 hover:bg-[#263238] hover:text-white'
                      }`}
                    >
                      <span className="text-base">{item.icon}</span>
                      <span className="truncate">{item.label.split(' / ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Game / Event Context Section */}
            <div className="p-4 rounded-2xl bg-[#263238]/30 border border-[#263238] space-y-4">
              <div className="text-xs font-bold text-slate-300 uppercase font-mono flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#00B8D4]" />
                <span>Game &amp; Event Metadata</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Game Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={gameDate}
                    onChange={(e) => setGameDate(e.target.value)}
                    className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#090D16] border border-[#263238] focus:border-[#00B8D4] text-white text-sm outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Opponent / Rival Team *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. St. Anthony High or NJ Wildcats"
                    value={opponentName}
                    onChange={(e) => setOpponentName(e.target.value)}
                    className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#090D16] border border-[#263238] focus:border-[#00B8D4] text-white text-sm outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Tournament / Event Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. East Coast Winter Showcase"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#090D16] border border-[#263238] focus:border-[#00B8D4] text-white text-sm outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Result
                    </label>
                    <select
                      value={gameResult}
                      onChange={(e) => setGameResult(e.target.value as any)}
                      className="w-full min-h-[48px] px-3 rounded-xl bg-[#090D16] border border-[#263238] focus:border-[#00B8D4] text-white text-sm outline-none cursor-pointer"
                    >
                      <option value="W">Win (W)</option>
                      <option value="L">Loss (L)</option>
                      <option value="T">Tie (T)</option>
                      <option value="N/A">Scrimmage / Showcase</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Final Score
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 78-65"
                      value={finalScore}
                      onChange={(e) => setFinalScore(e.target.value)}
                      className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#090D16] border border-[#263238] focus:border-[#00B8D4] text-white text-sm outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick-Add Preset Feature */}
            <QuickAddPresetBar
              sport={selectedSport}
              athleteId={activeAthleteId}
              currentValues={currentStatValues}
              onApplyPreset={handleApplyPreset}
              onResetValues={handleResetValues}
            />

            {/* 3. Dynamic Sport-Specific Inputs */}
            <div className="p-4 rounded-2xl bg-[#263238]/30 border border-[#263238] space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-300 uppercase font-mono flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#00B8D4]" />
                  <span>{SPORT_CONFIGS[selectedSport].label} Performance Box Score</span>
                </div>
                <span className="text-[11px] text-[#00F5D4] font-mono">Verified Metrics</span>
              </div>

              {/* BASKETBALL FIELDS */}
              {selectedSport === 'basketball' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">PTS (Points)</label>
                    <input
                      type="number"
                      value={bbPts}
                      onChange={(e) => setBbPts(e.target.value)}
                      className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#090D16] border border-[#263238] focus:border-[#00B8D4] text-white text-base font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">REB (Rebounds)</label>
                    <input
                      type="number"
                      value={bbReb}
                      onChange={(e) => setBbReb(e.target.value)}
                      className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#090D16] border border-[#263238] focus:border-[#00B8D4] text-white text-base font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">AST (Assists)</label>
                    <input
                      type="number"
                      value={bbAst}
                      onChange={(e) => setBbAst(e.target.value)}
                      className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#090D16] border border-[#263238] focus:border-[#00B8D4] text-white text-base font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">STL (Steals)</label>
                    <input
                      type="number"
                      value={bbStl}
                      onChange={(e) => setBbStl(e.target.value)}
                      className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#090D16] border border-[#263238] focus:border-[#00B8D4] text-white text-base font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">BLK (Blocks)</label>
                    <input
                      type="number"
                      value={bbBlk}
                      onChange={(e) => setBbBlk(e.target.value)}
                      className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#090D16] border border-[#263238] focus:border-[#00B8D4] text-white text-base font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">3PM (3-Pointers)</label>
                    <input
                      type="number"
                      value={bb3pm}
                      onChange={(e) => setBb3pm(e.target.value)}
                      className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#090D16] border border-[#263238] focus:border-[#00B8D4] text-white text-base font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">FG Made / Att</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        placeholder="Made"
                        value={bbFgMade}
                        onChange={(e) => handleBbFgChange(e.target.value, bbFgAtt)}
                        className="w-1/2 min-h-[48px] px-2 text-center rounded-xl bg-[#090D16] border border-[#263238] focus:border-[#00B8D4] text-white text-sm font-bold outline-none"
                      />
                      <span className="text-slate-500 font-bold">/</span>
                      <input
                        type="number"
                        placeholder="Att"
                        value={bbFgAtt}
                        onChange={(e) => handleBbFgChange(bbFgMade, e.target.value)}
                        className="w-1/2 min-h-[48px] px-2 text-center rounded-xl bg-[#090D16] border border-[#263238] focus:border-[#00B8D4] text-white text-sm font-bold outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">FG% (Field Goal)</label>
                    <input
                      type="text"
                      value={`${bbFgPct}%`}
                      readOnly
                      className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#090D16]/50 border border-[#263238] text-[#00F5D4] text-base font-black outline-none"
                    />
                  </div>
                </div>
              )}

              {/* FOOTBALL / FLAG FOOTBALL FIELDS */}
              {selectedSport === 'football' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">PASS YDS / TDS</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        placeholder="YDS"
                        value={fbPassYds}
                        onChange={(e) => setFbPassYds(e.target.value)}
                        className="w-1/2 min-h-[48px] px-2 text-center rounded-xl bg-[#090D16] border border-[#263238] focus:border-[#00B8D4] text-white text-sm font-bold outline-none"
                      />
                      <span className="text-slate-500 font-bold">/</span>
                      <input
                        type="number"
                        placeholder="TDS"
                        value={fbPassTds}
                        onChange={(e) => setFbPassTds(e.target.value)}
                        className="w-1/2 min-h-[48px] px-2 text-center rounded-xl bg-[#090D16] border border-[#263238] focus:border-[#00B8D4] text-white text-sm font-bold outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">RUSH YDS / TDS</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        placeholder="YDS"
                        value={fbRushYds}
                        onChange={(e) => setFbRushYds(e.target.value)}
                        className="w-1/2 min-h-[48px] px-2 text-center rounded-xl bg-[#090D16] border border-[#263238] focus:border-[#00B8D4] text-white text-sm font-bold outline-none"
                      />
                      <span className="text-slate-500 font-bold">/</span>
                      <input
                        type="number"
                        placeholder="TDS"
                        value={fbRushTds}
                        onChange={(e) => setFbRushTds(e.target.value)}
                        className="w-1/2 min-h-[48px] px-2 text-center rounded-xl bg-[#090D16] border border-[#263238] focus:border-[#00B8D4] text-white text-sm font-bold outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">REC (Catches)</label>
                    <input
                      type="number"
                      value={fbRec}
                      onChange={(e) => setFbRec(e.target.value)}
                      className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#090D16] border border-[#263238] focus:border-[#00B8D4] text-white text-base font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">TCKL (Tackles)</label>
                    <input
                      type="number"
                      value={fbTckl}
                      onChange={(e) => setFbTckl(e.target.value)}
                      className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#090D16] border border-[#263238] focus:border-[#00B8D4] text-white text-base font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">SACKS</label>
                    <input
                      type="text"
                      value={fbSacks}
                      onChange={(e) => setFbSacks(e.target.value)}
                      className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#090D16] border border-[#263238] focus:border-[#00B8D4] text-white text-base font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">INTS (Picks)</label>
                    <input
                      type="number"
                      value={fbInts}
                      onChange={(e) => setFbInts(e.target.value)}
                      className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#090D16] border border-[#263238] focus:border-[#00B8D4] text-white text-base font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">FLAG PULLS</label>
                    <input
                      type="number"
                      value={fbFlagPulls}
                      onChange={(e) => setFbFlagPulls(e.target.value)}
                      className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#090D16] border border-[#263238] focus:border-[#00B8D4] text-white text-base font-bold outline-none"
                    />
                  </div>
                </div>
              )}

              {/* SOCCER / LACROSSE / FIELD HOCKEY FIELDS */}
              {(selectedSport === 'soccer' || selectedSport === 'lacrosse' || selectedSport === 'field_hockey') && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">GOALS</label>
                    <input
                      type="number"
                      value={socGoals}
                      onChange={(e) => setSocGoals(e.target.value)}
                      className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#090D16] border border-[#263238] focus:border-[#00B8D4] text-white text-base font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">AST (Assists)</label>
                    <input
                      type="number"
                      value={socAst}
                      onChange={(e) => setSocAst(e.target.value)}
                      className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#090D16] border border-[#263238] focus:border-[#00B8D4] text-white text-base font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">SHOTS</label>
                    <input
                      type="number"
                      value={socShots}
                      onChange={(e) => setSocShots(e.target.value)}
                      className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#090D16] border border-[#263238] focus:border-[#00B8D4] text-white text-base font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">GB / SAVES</label>
                    <input
                      type="number"
                      value={socGbSaves}
                      onChange={(e) => setSocGbSaves(e.target.value)}
                      className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#090D16] border border-[#263238] focus:border-[#00B8D4] text-white text-base font-bold outline-none"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex flex-col justify-end">
                    <button
                      type="button"
                      onClick={() => setSocCleanSheet(!socCleanSheet)}
                      className={`w-full min-h-[48px] px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                        socCleanSheet 
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' 
                          : 'bg-[#090D16] border-[#263238] text-slate-400'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{socCleanSheet ? 'Clean Sheet' : 'No Clean Sheet'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* WRESTLING FIELDS */}
              {selectedSport === 'wrestling' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">WIN TYPE</label>
                    <select
                      value={wrWinType}
                      onChange={(e) => setWrWinType(e.target.value as any)}
                      className="w-full min-h-[48px] px-3 rounded-xl bg-[#090D16] border border-[#263238] focus:border-[#00B8D4] text-white text-sm font-bold outline-none cursor-pointer"
                    >
                      <option value="Pin">Pin (Fall)</option>
                      <option value="Dec">Decision (Dec)</option>
                      <option value="Tech Fall">Technical Fall (TF)</option>
                      <option value="Major Dec">Major Decision (MD)</option>
                      <option value="Loss">Bout Loss</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">TAKEDOWNS</label>
                    <input
                      type="number"
                      value={wrTakedowns}
                      onChange={(e) => setWrTakedowns(e.target.value)}
                      className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#090D16] border border-[#263238] focus:border-[#00B8D4] text-white text-base font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">ESCAPES</label>
                    <input
                      type="number"
                      value={wrEscapes}
                      onChange={(e) => setWrEscapes(e.target.value)}
                      className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#090D16] border border-[#263238] focus:border-[#00B8D4] text-white text-base font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">REVERSALS</label>
                    <input
                      type="number"
                      value={wrReversals}
                      onChange={(e) => setWrReversals(e.target.value)}
                      className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#090D16] border border-[#263238] focus:border-[#00B8D4] text-white text-base font-bold outline-none"
                    />
                  </div>
                </div>
              )}

              {/* TRACK & COMBINE FIELDS */}
              {selectedSport === 'track_field' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">EVENT TIME (s)</label>
                    <input
                      type="text"
                      placeholder="e.g. 10.82"
                      value={tkEventTime}
                      onChange={(e) => setTkEventTime(e.target.value)}
                      className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#090D16] border border-[#263238] focus:border-[#00B8D4] text-white text-base font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">DISTANCE (ft/in)</label>
                    <input
                      type="text"
                      placeholder="e.g. 22ft 4in"
                      value={tkDistance}
                      onChange={(e) => setTkDistance(e.target.value)}
                      className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#090D16] border border-[#263238] focus:border-[#00B8D4] text-white text-base font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">40-YD DASH (s)</label>
                    <input
                      type="text"
                      placeholder="e.g. 4.45"
                      value={tkDash40}
                      onChange={(e) => setTkDash40(e.target.value)}
                      className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#090D16] border border-[#263238] focus:border-[#00B8D4] text-white text-base font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">VERTICAL (in)</label>
                    <input
                      type="text"
                      placeholder="e.g. 36.5"
                      value={tkVertical}
                      onChange={(e) => setTkVertical(e.target.value)}
                      className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#090D16] border border-[#263238] focus:border-[#00B8D4] text-white text-base font-bold outline-none"
                    />
                  </div>
                </div>
              )}

              {/* CHEER & DANCE FIELDS */}
              {selectedSport === 'cheer' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">ROUTINE SCORE</label>
                    <input
                      type="text"
                      value={chRoutineScore}
                      onChange={(e) => setChRoutineScore(e.target.value)}
                      className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#090D16] border border-[#263238] focus:border-[#00B8D4] text-white text-base font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">DIFFICULTY</label>
                    <input
                      type="text"
                      value={chDifficulty}
                      onChange={(e) => setChDifficulty(e.target.value)}
                      className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#090D16] border border-[#263238] focus:border-[#00B8D4] text-white text-base font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">EXECUTION</label>
                    <input
                      type="text"
                      value={chExecution}
                      onChange={(e) => setChExecution(e.target.value)}
                      className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#090D16] border border-[#263238] focus:border-[#00B8D4] text-white text-base font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">DEDUCTIONS</label>
                    <input
                      type="text"
                      value={chDeductions}
                      onChange={(e) => setChDeductions(e.target.value)}
                      className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#090D16] border border-[#263238] focus:border-[#00B8D4] text-white text-base font-bold outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 4. Stat Sheet Screenshot Upload */}
            <div className="p-4 rounded-2xl bg-[#263238]/30 border border-[#263238] space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 uppercase font-mono flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#00B8D4]" />
                  <span>Stat-Sheet Screenshot or Official Box Score (Optional)</span>
                </label>
                <span className="text-[10px] text-slate-400">Scout Verification Proof</span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleStatSheetSelect}
                className="hidden"
              />

              {!statSheetPreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 rounded-xl border-2 border-dashed border-[#263238] hover:border-[#00B8D4] bg-[#090D16]/60 flex items-center justify-center gap-3 cursor-pointer transition-all min-h-[48px]"
                >
                  <Upload className="w-4 h-4 text-[#00B8D4]" />
                  <span className="text-xs font-bold text-slate-300">
                    Upload official scorekeeper sheet, GameChanger screenshot, or HUDL stat export
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#090D16] border border-[#263238]">
                  <div className="flex items-center gap-3">
                    <img
                      src={statSheetPreview}
                      alt="Stat Sheet Preview"
                      className="w-12 h-12 rounded-lg object-cover border border-[#00B8D4]/40"
                    />
                    <div className="text-xs">
                      <p className="font-bold text-white truncate max-w-xs">{statSheetFile?.name || 'Stat Sheet Attached'}</p>
                      <p className="text-slate-400 text-[11px]">Ready for cloud verification</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStatSheetFile(null);
                      setStatSheetPreview(null);
                    }}
                    className="min-h-[40px] px-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* 5. Additional Scout Notes */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Game Notes &amp; Key Highlights (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Hit clutch game-winning 3-pointer with 4.2s left in 4th quarter. Guarded top scorer."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-3.5 rounded-xl bg-[#090D16] border border-[#263238] focus:border-[#00B8D4] text-white text-sm outline-none transition-all resize-none"
              />
            </div>
          </form>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#263238] bg-[#263238]/40 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-[48px] px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              id="submit-stat-log-btn"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="min-h-[48px] px-6 rounded-xl bg-gradient-to-r from-[#00B8D4] to-[#00F5D4] text-[#090D16] font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(0,184,212,0.4)] hover:brightness-110 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Logging Stats...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Save Game Box Score</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default StatLoggerModal;
