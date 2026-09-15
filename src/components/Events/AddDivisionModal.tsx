import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Layers, Users, Trophy, ShieldCheck } from 'lucide-react';
import { EventDivision } from './types';

interface AddDivisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDivision: (division: EventDivision) => void | Promise<void>;
  existingDivisions?: EventDivision[];
}

export const AddDivisionModal: React.FC<AddDivisionModalProps> = ({
  isOpen,
  onClose,
  onAddDivision,
  existingDivisions = []
}) => {
  const [name, setName] = useState('');
  const [format, setFormat] = useState<'5v5 Flag' | '7v7' | 'Non-Contact' | string>('5v5 Flag');
  const [customFormat, setCustomFormat] = useState('');
  const [teamLimit, setTeamLimit] = useState<number>(12);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter a division name (e.g., 14U Girls, 17U Elite).');
      return;
    }

    if (existingDivisions.some(d => d.name.toLowerCase() === trimmedName.toLowerCase())) {
      setError(`A division named "${trimmedName}" already exists.`);
      return;
    }

    if (teamLimit < 2 || teamLimit > 128) {
      setError('Team / attendee limit must be between 2 and 128.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const finalFormat = format === 'Custom' ? (customFormat.trim() || '5v5 Flag') : format;
    const divisionId = `div-${trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString(36).slice(-4)}`;

    const newDivision: EventDivision = {
      id: divisionId,
      name: trimmedName,
      format: finalFormat,
      teamLimit: Number(teamLimit),
      registeredCount: 0
    };

    try {
      await onAddDivision(newDivision);
      setName('');
      setFormat('5v5 Flag');
      setCustomFormat('');
      setTeamLimit(12);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to add division. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const presetFormats = ['5v5 Flag', '7v7', 'Non-Contact', 'Custom'];

  return (
    <AnimatePresence>
      <div 
        id="add-division-modal-overlay"
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          id="add-division-modal-card"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md bg-[#090D16] border border-[#24324F] rounded-3xl p-6 shadow-2xl overflow-hidden space-y-5"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#00B8D4]/15 border border-[#00B8D4]/30 flex items-center justify-center text-[#00B8D4]">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wide">
                  Add Tournament Division
                </h3>
                <p className="text-xs text-slate-400">
                  Segment brackets, team rosters, and staff
                </p>
              </div>
            </div>

            <button
              id="close-add-division-modal-btn"
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Division Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-[#00B8D4]" />
                Division Name
              </label>
              <input
                id="division-name-input"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 14U Girls, 17U Elite, 12U Co-Ed"
                className="w-full bg-[#263238] border border-[#24324F] focus:border-[#00B8D4] text-white text-sm rounded-xl px-3.5 py-2.5 outline-none transition-colors placeholder:text-slate-500"
              />
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] text-slate-400 font-mono">Quick Suggestions:</span>
                {['14U Girls', '17U Elite', '12U Boys', 'Varsity Open'].map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setName(sug)}
                    className="px-2 py-0.5 rounded-md bg-[#24324F]/50 hover:bg-[#24324F] text-[10px] font-mono text-[#00B8D4] border border-[#00B8D4]/30 transition-colors"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>

            {/* Game Format */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#FF6A00]" />
                Competition Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                {presetFormats.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormat(f)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                      format === f
                        ? 'bg-[#00B8D4]/20 border-[#00B8D4] text-white shadow-sm'
                        : 'bg-[#263238]/60 border-[#24324F] text-slate-400 hover:text-white hover:bg-[#263238]'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {format === 'Custom' && (
                <input
                  id="custom-format-input"
                  type="text"
                  value={customFormat}
                  onChange={(e) => setCustomFormat(e.target.value)}
                  placeholder="Enter custom format (e.g., 8v8 Contact, 6v6 Arena)"
                  className="w-full mt-2 bg-[#263238] border border-[#24324F] focus:border-[#00B8D4] text-white text-xs rounded-xl px-3 py-2 outline-none"
                />
              )}
            </div>

            {/* Team / Attendee Limit */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  Team / Attendee Limit
                </span>
                <span className="text-emerald-400 font-mono">{teamLimit} Max</span>
              </label>
              <input
                id="division-team-limit-input"
                type="number"
                min="2"
                max="128"
                required
                value={teamLimit}
                onChange={(e) => setTeamLimit(Math.max(2, parseInt(e.target.value) || 2))}
                className="w-full bg-[#263238] border border-[#24324F] focus:border-[#00B8D4] text-white text-sm rounded-xl px-3.5 py-2.5 outline-none font-mono transition-colors"
              />
              <p className="text-[10px] text-slate-400">
                Sets the max capacity threshold for tournament registration in this bracket.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#24324F]">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="submit-add-division-btn"
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00B8D4] to-[#0097A7] text-white text-xs font-black uppercase tracking-wider hover:opacity-95 transition-all shadow-lg shadow-[#00B8D4]/20 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Create Division'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
