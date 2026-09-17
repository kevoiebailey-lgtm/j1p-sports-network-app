import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  Bookmark, 
  Plus, 
  Check, 
  Trash2, 
  Sparkles, 
  RotateCcw, 
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Tag
} from 'lucide-react';
import { 
  SupportedSport, 
  StatPreset, 
  StatPresetValues, 
  DEFAULT_SPORT_PRESETS, 
  getCustomPresets, 
  saveCustomPreset, 
  deleteCustomPreset 
} from './statPresetsData';

export interface QuickAddPresetBarProps {
  sport: SupportedSport;
  athleteId: string;
  currentValues: StatPresetValues;
  onApplyPreset: (preset: StatPreset) => void;
  onResetValues: () => void;
}

export const QuickAddPresetBar: React.FC<QuickAddPresetBarProps> = ({
  sport,
  athleteId,
  currentValues,
  onApplyPreset,
  onResetValues
}) => {
  const [customPresets, setCustomPresets] = useState<StatPreset[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetTagline, setPresetTagline] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showAllPresets, setShowAllPresets] = useState(false);

  // Load custom presets on mount or athleteId change
  useEffect(() => {
    setCustomPresets(getCustomPresets(athleteId));
  }, [athleteId]);

  // Combine system default presets with user custom presets for the active sport
  const sportPresets = useMemo(() => {
    const system = DEFAULT_SPORT_PRESETS[sport] || [];
    const custom = customPresets.filter((p) => p.sport === sport);
    return {
      system,
      custom,
      all: [...custom, ...system]
    };
  }, [sport, customPresets]);

  // Helper to auto-generate a quick summary tagline from current stat values
  const generateCurrentTagline = (): string => {
    switch (sport) {
      case 'basketball':
        return `${currentValues.bbPts || '0'} PTS • ${currentValues.bbReb || '0'} REB • ${currentValues.bbAst || '0'} AST • ${currentValues.bb3pm || '0'} 3PM`;
      case 'football':
        return `${currentValues.fbPassYds || '0'} PASS • ${currentValues.fbRushYds || '0'} RUSH • ${currentValues.fbTckl || '0'} TCKL`;
      case 'soccer':
      case 'lacrosse':
      case 'field_hockey':
        return `${currentValues.socGoals || '0'} G • ${currentValues.socAst || '0'} A • ${currentValues.socShots || '0'} SHOTS`;
      case 'wrestling':
        return `${currentValues.wrWinType || 'Win'} • ${currentValues.wrTakedowns || '0'} TD • ${currentValues.wrWeightClass || '152 lbs'}`;
      case 'track_field':
        return `${currentValues.tkEventCategory || 'Track'} • ${currentValues.tkEventTime || '10.8s'} • ${currentValues.tkDash40 || '4.4s'}`;
      case 'cheer':
        return `${currentValues.chRoutineScore || '95.0'} SCORE • ${currentValues.chDifficulty || '9.5'} DIFF`;
      default:
        return 'Custom Configuration';
    }
  };

  // Open save dialog and pre-populate sensible defaults
  const handleOpenSave = () => {
    setPresetName(`${sport.charAt(0).toUpperCase() + sport.slice(1)} Config #${sportPresets.custom.length + 1}`);
    setPresetTagline(generateCurrentTagline());
    setIsSaveModalOpen(true);
  };

  const handleSavePreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!presetName.trim()) return;

    const saved = saveCustomPreset(athleteId, {
      name: presetName.trim(),
      sport,
      tagline: presetTagline.trim() || generateCurrentTagline(),
      data: { ...currentValues }
    });

    setCustomPresets(getCustomPresets(athleteId));
    setActivePresetId(saved.id);
    setSaveSuccess(true);

    setTimeout(() => {
      setSaveSuccess(false);
      setIsSaveModalOpen(false);
    }, 900);
  };

  const handleDeleteCustom = (e: React.MouseEvent, presetId: string) => {
    e.stopPropagation();
    const updated = deleteCustomPreset(athleteId, presetId);
    setCustomPresets(updated);
    if (activePresetId === presetId) {
      setActivePresetId(null);
    }
  };

  const handleSelectPreset = (preset: StatPreset) => {
    setActivePresetId(preset.id);
    onApplyPreset(preset);
  };

  const displayedPresets = showAllPresets ? sportPresets.all : sportPresets.all.slice(0, 4);

  return (
    <div className="p-4 rounded-2xl bg-[#090D16] border border-[#24324F]/80 shadow-lg space-y-3 relative overflow-hidden">
      {/* Subtle Cyan Accent Glow */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-[#00B8D4]/5 rounded-full blur-2xl pointer-events-none" />

      {/* Bar Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#00B8D4]/15 border border-[#00B8D4]/40 flex items-center justify-center text-[#00B8D4]">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-white font-mono flex items-center gap-1.5">
                Quick-Add Presets
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#00B8D4]/20 border border-[#00B8D4]/30 text-[#00B8D4] text-[9px] font-mono font-bold">
                {sportPresets.all.length} PRESETS
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              1-click autofill standard benchmarks or your saved custom templates
            </p>
          </div>
        </div>

        {/* Action Buttons: Save Custom & Reset */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenSave}
            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#263238] hover:bg-[#263238]/80 border border-[#00B8D4]/40 text-[#00B8D4] hover:text-[#00F5D4] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            title="Save current stat values as a new reusable preset"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Save as Preset</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActivePresetId(null);
              onResetValues();
            }}
            className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-slate-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            title="Reset box score fields to blank"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* Preset Chips Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        {displayedPresets.map((preset) => {
          const isSelected = activePresetId === preset.id;
          const isCustom = !preset.isSystem;

          return (
            <div
              key={preset.id}
              onClick={() => handleSelectPreset(preset)}
              className={`group relative p-2.5 rounded-xl border text-left cursor-pointer transition-all duration-200 flex items-center justify-between gap-2.5 ${
                isSelected
                  ? 'bg-[#00B8D4]/15 border-[#00B8D4] shadow-[0_0_15px_rgba(0,184,212,0.25)] text-white'
                  : 'bg-[#263238]/40 hover:bg-[#263238]/80 border-[#24324F] text-slate-300 hover:text-white'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs truncate flex items-center gap-1">
                    {isCustom ? (
                      <span className="text-[#FFB300] text-xs">⭐</span>
                    ) : (
                      <span className="text-[#00B8D4] text-xs">⚡</span>
                    )}
                    {preset.name}
                  </span>
                  {isCustom && (
                    <span className="px-1.5 py-0.2 rounded bg-[#FFB300]/15 text-[#FFB300] text-[8px] font-mono font-bold uppercase tracking-wider">
                      CUSTOM
                    </span>
                  )}
                </div>
                {preset.tagline && (
                  <p className="text-[10px] text-slate-400 truncate font-mono mt-0.5">
                    {preset.tagline}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {isSelected ? (
                  <div className="w-5 h-5 rounded-full bg-[#00B8D4] text-[#090D16] flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                ) : (
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-black/40 text-slate-400 group-hover:text-[#00B8D4] transition-colors font-mono">
                    APPLY
                  </span>
                )}

                {/* Delete button for custom presets */}
                {isCustom && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteCustom(e, preset.id)}
                    className="w-6 h-6 rounded-md hover:bg-red-500/20 text-slate-500 hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer"
                    title="Delete custom preset"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Toggle View More Presets */}
      {sportPresets.all.length > 4 && (
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={() => setShowAllPresets(!showAllPresets)}
            className="text-[11px] font-bold text-[#00B8D4] hover:text-[#00F5D4] flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>{showAllPresets ? 'Show Fewer Presets' : `Show All (${sportPresets.all.length}) Presets`}</span>
            {showAllPresets ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* SAVE CUSTOM PRESET INLINE MODAL */}
      <AnimatePresence>
        {isSaveModalOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 rounded-xl bg-[#141E28] border border-[#00B8D4]/50 space-y-3 mt-2 overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#24324F] pb-2">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-[#00B8D4]" />
                <span className="text-xs font-bold text-white uppercase font-mono">
                  Save Current Configuration for {sport.toUpperCase()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePreset} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Preset Title / Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. My Varsity Season Average or AAU Championship Statline"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  className="w-full min-h-[42px] px-3 rounded-xl bg-[#090D16] border border-[#24324F] focus:border-[#00B8D4] text-white text-xs outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Summary Badge Tagline (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 24 PTS • 6 REB • 7 AST"
                  value={presetTagline}
                  onChange={(e) => setPresetTagline(e.target.value)}
                  className="w-full min-h-[42px] px-3 rounded-xl bg-[#090D16] border border-[#24324F] focus:border-[#00B8D4] text-white text-xs outline-none font-mono"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-[#090D16] border border-[#24324F] flex items-center justify-between">
                <span className="text-[10px] text-slate-400">Values to capture:</span>
                <span className="text-[10px] font-mono text-[#00F5D4] font-bold truncate max-w-[280px]">
                  {generateCurrentTagline()}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="min-h-[36px] px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveSuccess}
                  className="min-h-[36px] px-4 rounded-lg bg-gradient-to-r from-[#00B8D4] to-[#00F5D4] text-[#090D16] text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md hover:brightness-110 cursor-pointer disabled:opacity-50"
                >
                  {saveSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Save Preset</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuickAddPresetBar;
