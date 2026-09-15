import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FolderOpen, 
  Trash2, 
  Copy, 
  Play, 
  Calendar, 
  User, 
  Sparkles, 
  X, 
  Search, 
  Filter, 
  Plus, 
  Check, 
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Shield,
  Target
} from 'lucide-react';
import { PlaybookCardData, SportType } from './types';
import { 
  subscribeToUserPlays, 
  subscribeToPublicPlays, 
  deletePlay, 
  duplicatePlay,
  seedStaplePlays
} from '../../services/playbookService';
import { useAuth } from '../../context/AuthContext';

interface SavedPlaysModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlay: (play: PlaybookCardData) => void;
  currentPlayId?: string | null;
  selectedSport?: SportType;
}

export function SavedPlaysModal({
  isOpen,
  onClose,
  onSelectPlay,
  currentPlayId,
  selectedSport,
}: SavedPlaysModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'my_plays' | 'community'>('my_plays');
  const [userPlays, setUserPlays] = useState<PlaybookCardData[]>([]);
  const [communityPlays, setCommunityPlays] = useState<PlaybookCardData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sportFilter, setSportFilter] = useState<string>(selectedSport || 'all');
  const [isLoading, setIsLoading] = useState(true);
  const [deletingPlayId, setDeletingPlayId] = useState<string | null>(null);
  const [duplicatingPlayId, setDuplicatingPlayId] = useState<string | null>(null);
  const [isSeedingPlays, setIsSeedingPlays] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Subscribe to user plays
  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);

    let unsubUser: (() => void) | null = null;
    if (user?.uid) {
      unsubUser = subscribeToUserPlays(user.uid, (plays) => {
        setUserPlays(plays);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }

    const unsubPublic = subscribeToPublicPlays(
      sportFilter !== 'all' ? (sportFilter as SportType) : undefined,
      (plays) => {
        setCommunityPlays(plays);
        setIsLoading(false);
      }
    );

    return () => {
      if (unsubUser) unsubUser();
      if (unsubPublic) unsubPublic();
    };
  }, [isOpen, user?.uid, sportFilter]);

  const activePlaysList = activeTab === 'my_plays' ? userPlays : communityPlays;

  const filteredPlays = activePlaysList.filter((p) => {
    const matchesSearch = 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.authorName && p.authorName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesSport = sportFilter === 'all' || p.sport === sportFilter;
    return matchesSearch && matchesSport;
  });

  const handleDelete = async (playId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this custom play from your playbook?')) return;
    
    setDeletingPlayId(playId);
    try {
      await deletePlay(playId);
      setActionSuccessMessage('Play deleted successfully.');
      setTimeout(() => setActionSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to delete play:', err);
    } finally {
      setDeletingPlayId(null);
    }
  };

  const handleDuplicate = async (playId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDuplicatingPlayId(playId);
    try {
      const newId = await duplicatePlay(playId, user?.uid, user?.displayName || 'Coach');
      setActionSuccessMessage('Play duplicated! Check My Plays.');
      setTimeout(() => setActionSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to duplicate play:', err);
    } finally {
      setDuplicatingPlayId(null);
    }
  };

  const handleSeedStaplePlays = async () => {
    setIsSeedingPlays(true);
    try {
      const activeTeamId = (user as any)?.teamId || (user as any)?.clubId || user?.uid || 'demo_team';
      await seedStaplePlays(activeTeamId);
      setActionSuccessMessage('Seeded 3 staple 5v5 flag plays (Smash, Texas Angle, Rub Wheel) to team playbook!');
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to seed staple plays:', err);
      setActionSuccessMessage('Failed to seed plays: ' + (err?.message || 'Error occurred'));
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } finally {
      setIsSeedingPlays(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-neutral-950 border border-neutral-800 rounded-3xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden text-neutral-100">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-neutral-800/80 flex items-center justify-between bg-neutral-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">Playbook Vault & Cloud Library</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
                  Firestore Sync
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Load custom-drawn plays, edit route waypoints, and study tactical installations.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab & Filter Ribbon */}
        <div className="p-4 bg-neutral-900/40 border-b border-neutral-800/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Tabs */}
          <div className="flex bg-neutral-900 p-1 rounded-xl border border-neutral-800">
            <button
              onClick={() => setActiveTab('my_plays')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'my_plays'
                  ? 'bg-emerald-500 text-neutral-950 shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              My Plays ({userPlays.length})
            </button>
            <button
              onClick={() => setActiveTab('community')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'community'
                  ? 'bg-emerald-500 text-neutral-950 shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Team & Public Vault ({communityPlays.length})
            </button>
          </div>

          {/* Search & Sport Filter */}
          <div className="flex items-center gap-2.5 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search plays, concepts, or authors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <select
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Sports</option>
              <option value="flag_5v5">5v5 Flag</option>
              <option value="flag_7v7">7v7 Passing</option>
              <option value="football_11v11">11v11 Football</option>
              <option value="basketball">Basketball</option>
              <option value="soccer">Soccer</option>
              <option value="lacrosse">Lacrosse</option>
            </select>

            <button
              type="button"
              onClick={handleSeedStaplePlays}
              disabled={isSeedingPlays}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-neutral-950 font-bold text-xs flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 cursor-pointer shrink-0"
              title="Seed staple 5v5 flag plays (Smash, Texas Angle, Rub Wheel) into team playbook"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isSeedingPlays ? 'animate-spin' : ''}`} />
              <span>{isSeedingPlays ? 'Seeding...' : 'Seed 5v5 Plays'}</span>
            </button>
          </div>
        </div>

        {/* Action Success Toast */}
        {actionSuccessMessage && (
          <div className="px-6 py-2 bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{actionSuccessMessage}</span>
          </div>
        )}

        {/* Plays Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-neutral-400">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
              <span className="text-xs font-semibold">Syncing playbook from Firestore...</span>
            </div>
          ) : filteredPlays.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-500">
                <FolderOpen className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">No Plays Found</h3>
              <p className="text-xs text-neutral-400 max-w-sm">
                {activeTab === 'my_plays'
                  ? "You haven't saved any custom plays to Firestore yet. Draw routes on the chalkboard and click 'Save to Cloud', or seed 5v5 staple plays below."
                  : 'No public plays match your search filters.'}
              </p>
              <button
                type="button"
                onClick={handleSeedStaplePlays}
                disabled={isSeedingPlays}
                className="mt-2 px-4 py-2 rounded-xl bg-emerald-500 text-neutral-950 font-bold text-xs flex items-center gap-2 hover:bg-emerald-400 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <Sparkles className="w-4 h-4" />
                <span>Seed 5v5 Staple Plays (Smash, Texas, Rub Wheel)</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPlays.map((play) => {
                const isCurrent = currentPlayId === play.id;
                const routesCount = play.players.filter((p) => p.route && p.route.length > 0).length;
                const progressionCount = play.players.filter(
                  (p) => p.progression && p.progression !== 'none'
                ).length;
                const blockingCount = play.players.filter(
                  (p) => p.blocking && p.blocking !== 'none'
                ).length;

                return (
                  <div
                    key={play.id}
                    onClick={() => {
                      onSelectPlay(play);
                      onClose();
                    }}
                    className={`group relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      isCurrent
                        ? 'bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-950/40'
                        : 'bg-neutral-900/70 hover:bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    {/* Top Row */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-neutral-800 border border-neutral-700 text-neutral-300 text-[10px] font-bold uppercase tracking-wider">
                          {play.sport.replace('_', ' ')}
                        </span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-neutral-950 text-[10px] font-black">
                            ACTIVE BOARD
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                        {play.title}
                      </h4>

                      <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                        {play.description || 'No play description provided.'}
                      </p>
                    </div>

                    {/* Tactical Micro Badges */}
                    <div className="flex items-center gap-2 text-[11px] text-neutral-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Play className="w-3 h-3 text-emerald-400" />
                        {routesCount} Routes
                      </span>
                      {progressionCount > 0 && (
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3 text-amber-400" />
                          {progressionCount} Reads
                        </span>
                      )}
                      {blockingCount > 0 && (
                        <span className="flex items-center gap-1">
                          <Shield className="w-3 h-3 text-sky-400" />
                          {blockingCount} Blocks
                        </span>
                      )}
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between gap-2 text-xs">
                      <span className="text-[11px] text-neutral-500 font-medium flex items-center gap-1 truncate max-w-[140px]">
                        <User className="w-3 h-3 text-neutral-400 shrink-0" />
                        <span className="truncate">{play.authorName || 'Coach'}</span>
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleDuplicate(play.id, e)}
                          disabled={duplicatingPlayId === play.id}
                          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                          title="Duplicate Play"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        {(activeTab === 'my_plays' || user?.uid === play.authorName) && (
                          <button
                            type="button"
                            onClick={(e) => handleDelete(play.id, e)}
                            disabled={deletingPlayId === play.id}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
                            title="Delete Play"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-neutral-800/80 bg-neutral-900/60 flex items-center justify-between shrink-0">
          <div className="text-xs text-neutral-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Click any play to load its exact player positions, route stems, and progression tags onto the board.</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition-all"
          >
            Close Vault
          </button>
        </div>

      </div>
    </div>
  );
}
