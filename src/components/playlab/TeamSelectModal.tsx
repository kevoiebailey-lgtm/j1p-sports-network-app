import React, { useState, useEffect } from 'react';
import { 
  Users, 
  X, 
  Check, 
  Plus, 
  Trash2, 
  Radio, 
  ShieldCheck, 
  Eye
} from 'lucide-react';
import { triggerHaptic } from '../../lib/haptics';

interface TeamSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  playName: string;
  currentSharedTeams: string[];
  defaultTeamId?: string;
  onSaveSharedTeams: (teams: string[]) => void;
}

const COMMON_TEAM_PRESETS = [
  { id: 'team_varsity', name: 'Just1Play Varsity 5v5' },
  { id: 'team_elite_flag', name: 'Elite Tournament Travel Team' },
  { id: 'team_jv_roster', name: 'Junior Varsity Roster' },
  { id: 'team_east_academy', name: 'East Coast Flag Academy' },
];

export const TeamSelectModal: React.FC<TeamSelectModalProps> = ({
  isOpen,
  onClose,
  playName,
  currentSharedTeams,
  defaultTeamId = 'team_varsity',
  onSaveSharedTeams,
}) => {
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [customTeamInput, setCustomTeamInput] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setSelectedTeams([...(currentSharedTeams || [])]);
      setCustomTeamInput('');
    }
  }, [isOpen, currentSharedTeams]);

  if (!isOpen) return null;

  const handleToggleTeam = (teamId: string) => {
    triggerHaptic('light');
    setSelectedTeams((prev) => 
      prev.includes(teamId) 
        ? prev.filter((id) => id !== teamId) 
        : [...prev, teamId]
    );
  };

  const handleAddCustomTeam = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customTeamInput.trim().toLowerCase().replace(/\s+/g, '_');
    if (!clean) return;
    if (!selectedTeams.includes(clean)) {
      triggerHaptic('medium');
      setSelectedTeams((prev) => [...prev, clean]);
    }
    setCustomTeamInput('');
  };

  const handleRemoveTeam = (teamId: string) => {
    triggerHaptic('light');
    setSelectedTeams((prev) => prev.filter((id) => id !== teamId));
  };

  const handleConfirm = () => {
    triggerHaptic('medium');
    onSaveSharedTeams(selectedTeams);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0B0F19] border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00F0D0]/10 border border-[#00F0D0]/30 flex items-center justify-center text-[#00F0D0]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                Share to Team Roster
              </h2>
              <p className="text-xs text-slate-400 truncate max-w-[280px]">
                Target Play: <span className="text-[#00F0D0] font-bold">{playName}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* HUD Notification Card */}
          <div className="p-3.5 bg-gradient-to-r from-cyan-950/40 to-slate-950 border border-cyan-500/30 rounded-2xl flex items-start gap-3">
            <Eye className="w-4 h-4 text-[#00F0D0] shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300 leading-relaxed">
              Teams selected below will automatically have this play visible in their <strong className="text-white">Wristband HUD</strong> and receive real-time sideline telemetry callouts (&lt;200ms).
            </p>
          </div>

          {/* Quick Select Preset Teams */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Quick Select Team Rosters
            </label>
            <div className="space-y-1.5">
              {/* Default Active Team if provided */}
              {defaultTeamId && !COMMON_TEAM_PRESETS.some(p => p.id === defaultTeamId) && (
                <button
                  type="button"
                  onClick={() => handleToggleTeam(defaultTeamId)}
                  className={`w-full p-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
                    selectedTeams.includes(defaultTeamId)
                      ? 'bg-[#00F0D0]/15 text-white border-[#00F0D0]'
                      : 'bg-slate-900/60 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5 text-[#00F0D0]" />
                    <span>Active Team ({defaultTeamId})</span>
                  </div>
                  {selectedTeams.includes(defaultTeamId) && (
                    <Check className="w-4 h-4 text-[#00F0D0]" />
                  )}
                </button>
              )}

              {COMMON_TEAM_PRESETS.map((preset) => {
                const isSelected = selectedTeams.includes(preset.id);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleToggleTeam(preset.id)}
                    className={`w-full p-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-[#00F0D0]/15 text-white border-[#00F0D0]'
                        : 'bg-slate-900/60 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-left">
                      <ShieldCheck className={`w-3.5 h-3.5 ${isSelected ? 'text-[#00F0D0]' : 'text-slate-500'}`} />
                      <div>
                        <p className="text-white">{preset.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{preset.id}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-[#00F0D0]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Add Custom Team ID */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Add Specific Team ID or League Code
            </label>
            <form onSubmit={handleAddCustomTeam} className="flex gap-2">
              <input
                type="text"
                value={customTeamInput}
                onChange={(e) => setCustomTeamInput(e.target.value)}
                placeholder="e.g., team_patriots_5v5"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00F0D0]"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>
          </div>

          {/* Currently Authorized Teams List */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Currently Authorized ({selectedTeams.length})</span>
              {selectedTeams.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedTeams([])}
                  className="text-[10px] text-rose-400 hover:underline"
                >
                  Clear All
                </button>
              )}
            </label>

            {selectedTeams.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No teams currently authorized. Select teams above.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedTeams.map((teamId) => (
                  <span
                    key={teamId}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-[#00F0D0]/40 text-xs font-mono text-white"
                  >
                    <span>{teamId}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTeam(teamId)}
                      className="text-slate-400 hover:text-rose-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-[#00F0D0] hover:bg-[#00d0b0] text-black shadow-lg shadow-[#00F0D0]/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Authorize Wristband HUD Access</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeamSelectModal;
