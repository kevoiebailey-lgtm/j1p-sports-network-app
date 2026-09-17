import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Sparkles, 
  Video, 
  Layers, 
  Trophy, 
  ShieldCheck, 
  AlertCircle,
  Clock,
  FileText
} from 'lucide-react';
import { CheerSkillItem, CheerSkillCategory, CheerSkillLevel, CheerSurface } from './types';

interface CheerCustomSkillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCustomSkill: (skill: CheerSkillItem) => void;
}

export const CheerCustomSkillModal: React.FC<CheerCustomSkillModalProps> = ({
  isOpen,
  onClose,
  onAddCustomSkill
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<CheerSkillCategory>('running_tumbling');
  const [level, setLevel] = useState<CheerSkillLevel>('NCAA D1');
  const [surface, setSurface] = useState<CheerSurface>('dead_floor');
  const [videoUrl, setVideoUrl] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a name for this specialty pass or stunt combination.');
      return;
    }

    const newSkill: CheerSkillItem = {
      skillId: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      category,
      level,
      surface,
      verified: false,
      videoUrl: videoUrl.trim(),
      timestamp: timestamp.trim() || undefined,
      notes: notes.trim() || 'Custom specialty pass registered to athlete dossier.',
      updatedAt: new Date().toISOString()
    };

    onAddCustomSkill(newSkill);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-fadeIn">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-neutral-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/30">
                  Custom Skill Creator
                </span>
                <span className="text-[10px] font-mono text-neutral-400">Specialty Passes & Stunts</span>
              </div>
              <h3 className="text-xl font-black text-white mt-1">
                Add Custom Skill or Hybrid Pass
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* Skill Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-bold uppercase text-neutral-300">
              Specialty Skill / Combination Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Punch Front Step-Out to Round-Off BHS Full"
              className="w-full px-4 py-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 text-xs font-mono focus:border-purple-500 focus:outline-none transition-all"
            />
          </div>

          {/* Category & Difficulty Tier */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold uppercase text-neutral-300">
                Skill Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CheerSkillCategory)}
                className="w-full px-4 py-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-white text-xs font-mono focus:border-purple-500 focus:outline-none transition-all cursor-pointer"
              >
                <option value="running_tumbling">Running Tumbling</option>
                <option value="standing_tumbling">Standing Tumbling</option>
                <option value="stunting">Elite Stunting & Inversions</option>
                <option value="jumps_flexibility">Jumps & Flexibility</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold uppercase text-neutral-300">
                Difficulty Level
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as CheerSkillLevel)}
                className="w-full px-4 py-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-white text-xs font-mono focus:border-purple-500 focus:outline-none transition-all cursor-pointer"
              >
                <option value="NCAA D1">NCAA Division 1 Elite</option>
                <option value="Level 6">All-Star Level 6 Premier</option>
                <option value="Level 5">Level 5 / Collegiate D2</option>
                <option value="Level 4">Level 4 Intermediate</option>
              </select>
            </div>
          </div>

          {/* Floor Surface & Timestamp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold uppercase text-neutral-300">
                Audited Floor Surface
              </label>
              <select
                value={surface}
                onChange={(e) => setSurface(e.target.value as CheerSurface)}
                className="w-full px-4 py-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-white text-xs font-mono focus:border-purple-500 focus:outline-none transition-all cursor-pointer"
              >
                <option value="dead_floor">Dead Mat / Hardwood (College)</option>
                <option value="spring_floor">Spring Floor (All-Star)</option>
                <option value="grass_turf">Grass / Game Day Turf</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold uppercase text-neutral-300">
                Timestamp Marker (Optional)
              </label>
              <input
                type="text"
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
                placeholder="e.g. 0:42 or 1:15"
                className="w-full px-4 py-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 text-xs font-mono focus:border-purple-500 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Video URL */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-bold uppercase text-neutral-300">
              External Video Link (YouTube, Hudl, TikTok, Instagram, Vimeo)
            </label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... or https://www.hudl.com/video/..."
              className="w-full px-4 py-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 text-xs font-mono focus:border-purple-500 focus:outline-none transition-all"
            />
            <p className="text-[10px] text-neutral-400 font-mono">
              Direct video links allow college recruiters to instantly stream your execution in high definition.
            </p>
          </div>

          {/* Coaching / Biomechanical Notes */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-bold uppercase text-neutral-300">
              Scouting / Execution Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Clean stick, high chest on landing, performed solo during senior showcase."
              className="w-full px-4 py-2.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 text-xs font-mono focus:border-purple-500 focus:outline-none transition-all resize-none"
            />
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono font-bold uppercase transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-2xl bg-purple-500 hover:bg-purple-400 text-white text-xs font-mono font-black uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add to CheerMatrix</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
