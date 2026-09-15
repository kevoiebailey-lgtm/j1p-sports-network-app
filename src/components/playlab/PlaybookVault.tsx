'use client';

import React, { useState, useEffect } from 'react';
import {
  Bookmark,
  Sparkles,
  Search,
  Filter,
  Layers,
  Lock,
  Globe,
  Users,
  Play,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  X,
  Check,
  ChevronRight,
  Shield,
  Radio,
} from 'lucide-react';
import { PlayLabPlay } from '../../types/tactics';
import { 
  getUserPlayLabPlays, 
  deletePlayLabPlay, 
  updatePlaySlot, 
  seedChampionship12Playbook,
  savePlayLabPlay 
} from '../../services/playlabService';
import { PlayVectorThumbnail } from './CallSheet12Card';
import { triggerHaptic } from '../../lib/haptics';

interface PlaybookVaultProps {
  isOpen?: boolean;
  onClose: () => void;
  userId: string;
  onLoadPlay: (play: PlayLabPlay) => void;
  activePlayId?: string | null;
  onPlaysUpdated?: () => void;
  inline?: boolean;
}

export const PlaybookVault: React.FC<PlaybookVaultProps> = ({
  isOpen = true,
  onClose,
  userId,
  onLoadPlay,
  activePlayId,
  onPlaysUpdated,
  inline = false,
}) => {
  const [plays, setPlays] = useState<PlayLabPlay[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFormation, setSelectedFormation] = useState<string>('all');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchPlays = async () => {
    setLoading(true);
    try {
      const userPlays = await getUserPlayLabPlays(userId);
      setPlays(userPlays);
    } catch (e) {
      console.warn('Failed to load plays in vault:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if ((isOpen || inline) && userId) {
      fetchPlays();
    }
  }, [isOpen, inline, userId]);

  if (!isOpen && !inline) return null;

  const handleSeedChampionship = async () => {
    triggerHaptic('medium');
    setStatusMessage('⚡ Seeding 12 Championship Plays into your library...');
    try {
      await seedChampionship12Playbook(userId);
      await fetchPlays();
      if (onPlaysUpdated) onPlaysUpdated();
      setStatusMessage('✅ 12 Championship Plays added successfully!');
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (e) {
      setStatusMessage('❌ Error seeding plays');
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleDelete = async (playId: string) => {
    triggerHaptic('heavy');
    if (!window.confirm('Delete this play from your private playbook?')) return;
    try {
      await deletePlayLabPlay(playId);
      setPlays((prev) => prev.filter((p) => p.id !== playId));
      if (onPlaysUpdated) onPlaysUpdated();
    } catch (err) {
      console.warn('Failed to delete play:', err);
    }
  };

  const handleSlotChange = async (play: PlayLabPlay, newSlot: number) => {
    triggerHaptic('light');
    try {
      if (play.id) {
        await updatePlaySlot(play.id, newSlot);
        setPlays((prev) =>
          prev.map((p) => (p.id === play.id ? { ...p, slotIndex: newSlot } : p))
        );
        if (onPlaysUpdated) onPlaysUpdated();
      }
    } catch (e) {
      console.warn('Failed to assign slot:', e);
    }
  };

  // Filter plays
  const filteredPlays = plays.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.formation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.conceptNote && p.conceptNote.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.notes && p.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'all' ||
      (p.category && p.category.toLowerCase().includes(selectedCategory.toLowerCase()));

    const matchesFormation =
      selectedFormation === 'all' ||
      p.formation.toLowerCase().includes(selectedFormation.toLowerCase());

    return matchesSearch && matchesCategory && matchesFormation;
  });

  const content = (
    <div className={`relative w-full ${inline ? 'min-h-[700px]' : 'max-w-5xl h-[90vh]'} bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-neutral-100`}>
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-neutral-800/80 flex items-center justify-between bg-neutral-900/60">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Bookmark className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              Playbook Vault &amp; Library
              <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-mono font-normal">
                {plays.length} Plays
              </span>
            </h2>
            <p className="text-xs text-neutral-400">
              Manage private vector plays, assign 12-slot wristband positions, and sync with team rosters.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSeedChampionship}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-bold text-amber-300 transition-colors"
            title="Add 12 Championship Plays"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Seed 12 Championship Plays</span>
            <span className="sm:hidden">Seed 12</span>
          </button>

          {!inline && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

        {/* Feedback Alert */}
        {statusMessage && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-neutral-900 border border-emerald-500/40 text-xs text-emerald-400 font-bold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className="p-4 border-b border-neutral-800/80 bg-neutral-900/30 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search play name, concept, or formation..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 text-xs rounded-xl px-2.5 py-1.5 text-neutral-300 focus:outline-none"
            >
              <option value="all">All Categories</option>
              <option value="Screen">Screen</option>
              <option value="Blitz">Blitz Beater</option>
              <option value="RPO">RPO</option>
              <option value="Trick">Trick / Run</option>
              <option value="Option">Option</option>
              <option value="Man">Man Beater</option>
              <option value="Zone">Zone Beater</option>
              <option value="Red Zone">Red Zone</option>
              <option value="Goal Line">Goal Line</option>
            </select>

            <select
              value={selectedFormation}
              onChange={(e) => setSelectedFormation(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 text-xs rounded-xl px-2.5 py-1.5 text-neutral-300 focus:outline-none"
            >
              <option value="all">All Formations</option>
              <option value="Spread">Spread</option>
              <option value="Trips">Trips</option>
              <option value="Stack">Stack</option>
              <option value="Bunch">Bunch</option>
              <option value="Twins">Twins</option>
            </select>
          </div>
        </div>

        {/* Plays Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {loading ? (
            <div className="h-64 flex items-center justify-center text-xs text-neutral-500">
              Loading private playbook vault...
            </div>
          ) : filteredPlays.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 space-y-3">
              <Bookmark className="w-10 h-10 text-neutral-600" />
              <p className="text-sm font-bold text-neutral-300">No plays found matching your filter</p>
              <p className="text-xs text-neutral-500 max-w-xs">
                Import the Championship 12-pack or design a new play on the PlayLab canvas.
              </p>
              <button
                type="button"
                onClick={handleSeedChampionship}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-black text-xs font-black hover:bg-emerald-400 transition-colors"
              >
                Seed 12 Championship Plays
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredPlays.map((play) => {
                const isSelected = activePlayId === play.id;

                return (
                  <div
                    key={play.id}
                    className={`rounded-2xl border p-3 flex flex-col justify-between transition-all bg-neutral-900/60 ${
                      isSelected
                        ? 'border-emerald-400 ring-2 ring-emerald-500/40 shadow-lg'
                        : 'border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div>
                      {/* Top Bar */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {play.slotIndex ? (
                            <span className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-[11px] font-mono font-black shrink-0">
                              #{play.slotIndex}
                            </span>
                          ) : (
                            <span className="w-6 h-6 rounded-md bg-neutral-800 text-neutral-500 flex items-center justify-center text-[10px] font-mono shrink-0">
                              --
                            </span>
                          )}
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">{play.name}</h4>
                            <div className="flex items-center gap-1 text-[10px] text-neutral-400">
                              <span>{play.formation}</span>
                              {play.category && (
                                <>
                                  <span>•</span>
                                  <span className="text-emerald-400">{play.category}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {play.isPublic ? (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                            <Globe className="w-3 h-3" /> Public
                          </span>
                        ) : (
                          <span className="text-[10px] text-neutral-500 flex items-center gap-1 font-medium">
                            <Lock className="w-3 h-3" /> Private
                          </span>
                        )}
                      </div>

                      {/* Miniature SVG vector route thumbnail */}
                      <PlayVectorThumbnail play={play} className="w-full h-28" />

                      {play.conceptNote && (
                        <p className="text-[10px] text-neutral-400 mt-1.5 italic line-clamp-1">
                          {play.conceptNote}
                        </p>
                      )}
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-3 pt-2 border-t border-neutral-800 flex items-center justify-between gap-2 text-xs">
                      {/* Slot Picker Dropdown */}
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-neutral-500 font-mono">Slot:</span>
                        <select
                          value={play.slotIndex || ''}
                          onChange={(e) => handleSlotChange(play, Number(e.target.value))}
                          className="bg-neutral-800 text-white text-[10px] font-mono rounded px-1.5 py-0.5 border border-neutral-700"
                        >
                          <option value="">None</option>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((s) => (
                            <option key={`slot-opt-${s}`} value={s}>
                              #{s}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1">
                        {play.id && (
                          <button
                            type="button"
                            onClick={() => handleDelete(play.id!)}
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 transition-colors"
                            title="Delete play"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            onLoadPlay(play);
                            onClose();
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Load Field</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );

  if (inline) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      {content}
    </div>
  );
};
