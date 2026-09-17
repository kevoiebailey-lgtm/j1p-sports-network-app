import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Star, 
  FileText, 
  Download, 
  Trash2, 
  Check, 
  Save, 
  Sparkles, 
  ShieldCheck, 
  ExternalLink,
  Edit2,
  Wifi,
  WifiOff,
  Zap,
  Plus
} from 'lucide-react';
import { INITIAL_SCOUTING_NOTES, INITIAL_ATHLETE_DOCS } from '../../../lib/platformData';
import { ScoutingNoteDoc } from '../../../types/platform';
import { 
  getScoutNotesOffline, 
  saveScoutNotesOffline, 
  warmStadiumOfflineCache 
} from '../../../lib/offlineFavoritesService';

export const ScoutWatchlistTab: React.FC = () => {
  const [notes, setNotes] = useState<ScoutingNoteDoc[]>(() => {
    return getScoutNotesOffline();
  });
  const [activeNoteId, setActiveNoteId] = useState<string>(notes[0]?.id || '');
  const [saveToast, setSaveToast] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Warm cache upon loading
    warmStadiumOfflineCache();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const activeNote = notes.find(n => n.id === activeNoteId) || notes[0];

  const updateRating = (noteId: string, newRating: number) => {
    const updated = notes.map(n => n.id === noteId ? { ...n, rating: newRating } : n);
    setNotes(updated);
    saveScoutNotesOffline(updated);
  };

  const updateRecommendation = (noteId: string, rec: ScoutingNoteDoc['recommendation']) => {
    const updated = notes.map(n => n.id === noteId ? { ...n, recommendation: rec } : n);
    setNotes(updated);
    saveScoutNotesOffline(updated);
  };

  const updateText = (noteId: string, text: string) => {
    const updated = notes.map(n => n.id === noteId ? { ...n, notes: text } : n);
    setNotes(updated);
    saveScoutNotesOffline(updated);
  };

  const handleSaveNote = async () => {
    await saveScoutNotesOffline(notes);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  const handleExportScoutingDossier = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 297, 'F');

    doc.setTextColor(255, 183, 3);
    doc.setFontSize(20);
    doc.text('CONFIDENTIAL SCOUTING DOSSIER', 20, 25);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text(`Scout: Coach David Vance (USC / West Coast Recruiting)`, 20, 36);
    doc.text(`Generated Date: ${new Date().toLocaleDateString()}`, 20, 44);

    let yOffset = 60;
    notes.forEach((note, index) => {
      doc.setTextColor(0, 245, 212);
      doc.setFontSize(14);
      doc.text(`${index + 1}. ${note.athleteName} (${note.athletePosition}, Class of ${note.athleteGradYear})`, 20, yOffset);
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text(`• Grade: ${note.rating}/5.0 Stars  |  Rec Status: ${note.recommendation}`, 25, yOffset + 8);
      doc.text(`• Key Tags: ${note.tags.join(', ')}`, 25, yOffset + 15);
      
      doc.setTextColor(203, 213, 225);
      const splitNotes = doc.splitTextToSize(`• Private Scout Notes: ${note.notes}`, 165);
      doc.text(splitNotes, 25, yOffset + 22);

      yOffset += 45;
    });

    doc.save('Scout_Watchlist_Evaluation_Dossier.pdf');
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      
      {/* Stadium Offline Mode Banner */}
      {isOffline && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 flex items-center justify-between gap-3 shadow-[0_0_25px_rgba(245,158,11,0.2)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <WifiOff className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                  Stadium Offline Mode Active
                </h3>
                <span className="px-2 py-0.5 rounded bg-amber-500/30 text-amber-200 text-[10px] font-mono font-bold">
                  SW CACHE ACTIVE
                </span>
              </div>
              <p className="text-xs text-amber-200/80 font-mono mt-0.5">
                Zero cellular connection detected. Your full prospect watchlist ({notes.length} athletes) & evaluations remain available offline.
              </p>
            </div>
          </div>

          <span className="text-xs font-mono font-bold text-amber-400 shrink-0 hidden sm:inline-block">
            {notes.length} Dossiers Cached
          </span>
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-[#FFB703] fill-current" />
            <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Recruit Watchlist & Evaluations
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
              <Zap className="w-3 h-3 text-emerald-400" />
              <span>Stadium Offline Ready</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Private Scouting Grades & Real-Time Performance Notes • Cached in Service Worker
          </p>
        </div>

        <button
          onClick={handleExportScoutingDossier}
          className="flex items-center gap-2 min-h-[48px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 hover:text-white transition-all cursor-pointer shadow-md"
        >
          <Download className="w-4 h-4 text-[#FFB703]" />
          <span>Export PDF Dossier</span>
        </button>
      </div>

      {/* Save feedback */}
      <AnimatePresence>
        {saveToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 bg-emerald-950 border border-emerald-500/50 rounded-2xl text-xs text-emerald-200 flex items-center justify-between shadow-lg"
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Scouting evaluation note saved & cached locally in Service Worker for stadium offline use.</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 uppercase">SW Cache Synced</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2-Column Layout: Left List & Right Notepad */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Left Prospects List */}
        <div className="space-y-2.5">
          {notes.map((n) => {
            const isSelected = n.id === activeNote?.id;
            return (
              <div
                key={n.id}
                onClick={() => setActiveNoteId(n.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-slate-900 border-[#FFB703] shadow-[0_0_20px_rgba(255,183,3,0.15)]' 
                    : 'bg-slate-900/60 border-slate-700/80 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-white">{n.athleteName}</h3>
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                    n.recommendation === 'Must Sign' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                    n.recommendation === 'Strong Watch' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                    'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}>
                    {n.recommendation}
                  </span>
                </div>

                <p className="text-xs text-[#FFB703] font-bold mt-1">
                  {n.athletePosition} • Class of {n.athleteGradYear}
                </p>

                {/* Stars */}
                <div className="flex items-center gap-1.5 mt-2 text-[#FFB703]">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${star <= n.rating ? 'fill-current' : 'text-slate-700'}`}
                    />
                  ))}
                  <span className="text-xs text-slate-300 font-mono ml-1 font-bold">{n.rating}.0</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Active Note Editor */}
        {activeNote && (
          <div className="md:col-span-2 bg-slate-900/90 border border-slate-700/80 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
            
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
              <div>
                <h2 className="text-base sm:text-lg font-black text-white">{activeNote.athleteName}</h2>
                <span className="text-xs text-[#FFB703] font-bold">{activeNote.athletePosition} Evaluation Record</span>
              </div>

              {/* Star rating selector (min 48px touch target) */}
              <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-2xl border border-slate-700 min-h-[48px]">
                <span className="text-xs text-slate-300 font-bold mr-1">Grade:</span>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => updateRating(activeNote.id, star)}
                    className="p-1 cursor-pointer text-[#FFB703] hover:scale-110 transition-transform"
                    aria-label={`Rate ${star} stars`}
                  >
                    <Star className={`w-5 h-5 ${star <= activeNote.rating ? 'fill-current' : 'text-slate-700'}`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Recommendation status selector (min 48px touch target) */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="font-bold text-slate-300 mr-1">Rec Level:</span>
              {(['Must Sign', 'Strong Watch', 'Invite to Camp', 'Backup'] as ScoutingNoteDoc['recommendation'][]).map((rec) => (
                <button
                  key={rec}
                  onClick={() => updateRecommendation(activeNote.id, rec)}
                  className={`min-h-[48px] px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeNote.recommendation === rec 
                      ? 'bg-[#FFB703] text-slate-950 shadow-md font-black' 
                      : 'bg-slate-950 border border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  {rec}
                </button>
              ))}
            </div>

            {/* Private Notepad Textarea */}
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-2 flex items-center gap-1.5">
                <Edit2 className="w-4 h-4 text-[#FFB703]" />
                Private Confidential Evaluation Notes:
              </label>
              <textarea
                rows={6}
                value={activeNote.notes}
                onChange={(e) => updateText(activeNote.id, e.target.value)}
                placeholder="Type real-time observations, release mechanics, pocket presence, agility, temperament, verified measurements..."
                className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FFB703] leading-relaxed"
              />
            </div>

            {/* Tags preview */}
            <div className="flex items-center gap-2 flex-wrap">
              {activeNote.tags.map(t => (
                <span key={t} className="px-2.5 py-1 rounded-lg bg-slate-800 text-[11px] font-bold text-slate-200 border border-slate-700">
                  #{t}
                </span>
              ))}
            </div>

            {/* Save button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={handleSaveNote}
                className="min-h-[48px] flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#FFB703] to-[#FB8500] text-slate-950 font-black text-xs hover:brightness-110 shadow-lg cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Evaluation</span>
              </button>
            </div>

          </div>
        )}

      </div>

    </div>
  );
};

export default ScoutWatchlistTab;
