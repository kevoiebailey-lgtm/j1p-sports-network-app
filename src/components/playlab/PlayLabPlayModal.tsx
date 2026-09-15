import React, { useState, useEffect } from 'react';
import { 
  Bookmark, 
  X, 
  Check, 
  Share2, 
  FolderOpen, 
  Lock, 
  Globe, 
  Sparkles, 
  Trash2,
  ListPlus,
  Users,
  Download
} from 'lucide-react';
import { PlayLabPlay, TacticalPlayer } from '../../types/tactics';
import { 
  savePlayLabPlay, 
  getUserPlayLabPlays, 
  deletePlayLabPlay, 
  updatePlayPrivacy,
  seedVettedFlagPlaybook,
  convertTacticalPlayersToRoutes,
  SAMPLE_FIL_FLY_PLAY 
} from '../../services/playlabService';
import { useAuth } from '../../context/AuthContext';
import { triggerHaptic } from '../../lib/haptics';
import { PlayPrivacyDropdown } from './PlayPrivacyDropdown';
import { TeamSelectModal } from './TeamSelectModal';

interface PlayLabPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: TacticalPlayer[];
  currentPlayName: string;
  activeFormat?: '5v5' | '7v7' | '11v11';
  activeTeamId?: string;
  onLoadPlay: (play: PlayLabPlay) => void;
}

export const PlayLabPlayModal: React.FC<PlayLabPlayModalProps> = ({
  isOpen,
  onClose,
  players,
  currentPlayName,
  activeFormat = '5v5',
  activeTeamId,
  onLoadPlay,
}) => {
  const { user } = useAuth();
  const currentUserId = user?.uid || 'coach_sandbox';

  const [activeTab, setActiveTab] = useState<'save' | 'saved_plays'>('save');
  
  // Form State strictly adhering to PlayLabPlay interface
  const [playName, setPlayName] = useState<string>(currentPlayName || 'Fil Fly');
  const [formation, setFormation] = useState<PlayLabPlay['formation']>('Spread');
  const [category, setCategory] = useState<PlayLabPlay['category']>('Spread');
  const [format, setFormat] = useState<PlayLabPlay['format']>(activeFormat);
  const [isPublic, setIsPublic] = useState<boolean>(false);
  const [sharedTeamsInput, setSharedTeamsInput] = useState<string>(activeTeamId ? activeTeamId : '');
  const [cadence, setCadence] = useState<string>('ON ONE');
  const [audibleColor, setAudibleColor] = useState<string>('GREEN LIGHT');
  const [notes, setNotes] = useState<string>('');
  const [primaryPlayer, setPrimaryPlayer] = useState<'QB' | 'C' | 'X' | 'H' | 'Z'>('X');

  // Saving state
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [savedPlaysList, setSavedPlaysList] = useState<PlayLabPlay[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(false);

  // Seeder and Team Sharing Modal state
  const [isSeedingPack, setIsSeedingPack] = useState<boolean>(false);
  const [seedingSuccessMessage, setSeedingSuccessMessage] = useState<string | null>(null);
  const [teamModalPlay, setTeamModalPlay] = useState<PlayLabPlay | null>(null);

  // Sync format and name on open
  useEffect(() => {
    if (isOpen) {
      if (currentPlayName) setPlayName(currentPlayName);
      if (activeFormat) setFormat(activeFormat);
      loadSavedPlays();
    }
  }, [isOpen, currentPlayName, activeFormat]);

  const loadSavedPlays = async () => {
    setLoadingList(true);
    try {
      const plays = await getUserPlayLabPlays(currentUserId);
      setSavedPlaysList(plays);
    } catch (err) {
      console.warn('Could not load user plays:', err);
    } finally {
      setLoadingList(false);
    }
  };

  if (!isOpen) return null;

  // Extract routes from current canvas players
  const rawRoutes = convertTacticalPlayersToRoutes(players);
  const routesWithPrimary = rawRoutes.map((r) => ({
    ...r,
    isPrimary: r.player === primaryPlayer,
  }));

  const handleSavePlay = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic('medium');
    setIsSaving(true);

    const teamIds = sharedTeamsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const playToSave: Omit<PlayLabPlay, 'id'> = {
      userId: currentUserId,
      name: playName.trim() || 'Fil Fly',
      formation,
      category,
      format,
      isPublic,
      sharedTeams: teamIds,
      sharedWithTeamIds: teamIds,
      cadence: cadence.trim() || 'ON ONE',
      audibleColor: audibleColor.trim() || 'GREEN LIGHT',
      routes: routesWithPrimary.length > 0 ? routesWithPrimary : SAMPLE_FIL_FLY_PLAY.routes,
      notes: notes.trim(),
      createdAt: Date.now(),
    };

    try {
      await savePlayLabPlay(playToSave);
      setSavedSuccess(true);
      await loadSavedPlays();
      setTimeout(() => {
        setSavedSuccess(false);
        setActiveTab('saved_plays');
      }, 1200);
    } catch (error) {
      console.error('Failed to save PlayLabPlay:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (playId: string) => {
    triggerHaptic('light');
    if (confirm('Delete this saved play?')) {
      await deletePlayLabPlay(playId);
      setSavedPlaysList((prev) => prev.filter((p) => p.id !== playId));
    }
  };

  // Update privacy directly on card
  const handleUpdateCardPrivacy = async (
    playId: string, 
    updates: { isPublic: boolean; sharedTeams?: string[] }
  ) => {
    triggerHaptic('medium');
    setSavedPlaysList((prev) =>
      prev.map((p) => {
        if (p.id !== playId) return p;
        return {
          ...p,
          isPublic: updates.isPublic,
          sharedTeams: updates.sharedTeams !== undefined ? updates.sharedTeams : p.sharedTeams,
          sharedWithTeamIds: updates.sharedTeams !== undefined ? updates.sharedTeams : p.sharedTeams,
        };
      })
    );

    try {
      await updatePlayPrivacy(playId, updates);
    } catch (err) {
      console.warn('Could not update play privacy:', err);
      await loadSavedPlays();
    }
  };

  // 1-Click Import Flag Playbook Pack (9 Plays)
  const handleImportFlagPlaybookPack = async () => {
    triggerHaptic('medium');
    setIsSeedingPack(true);
    setSeedingSuccessMessage(null);

    try {
      const newPlays = await seedVettedFlagPlaybook(currentUserId);
      setSeedingSuccessMessage(`Successfully imported 9 vetted plays to your library!`);
      await loadSavedPlays();
      triggerHaptic('success');
      setTimeout(() => {
        setSeedingSuccessMessage(null);
      }, 4000);
    } catch (err) {
      console.error('Failed to seed vetted flag playbook pack:', err);
      alert('Could not import playbook pack. Check connection.');
    } finally {
      setIsSeedingPack(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0B0F19] border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00F0D0]/10 border border-[#00F0D0]/30 flex items-center justify-center text-[#00F0D0]">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                PlayLab Vector Play
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-[#00F0D0]/10 text-[#00F0D0] border border-[#00F0D0]/30">
                  Tactical Schema
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Persistent formation stems, vector routes, and wristband HUD authorizations
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

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-900/30 px-5 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('save')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'save'
                ? 'border-[#00F0D0] text-[#00F0D0]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListPlus className="w-3.5 h-3.5" />
            <span>Save Active Play</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('saved_plays');
              loadSavedPlays();
            }}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'saved_plays'
                ? 'border-[#00F0D0] text-[#00F0D0]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Playbook Library ({savedPlaysList.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'save' && (
            <form onSubmit={handleSavePlay} className="space-y-4">
              {/* Play Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Play Name *
                </label>
                <input
                  type="text"
                  required
                  value={playName}
                  onChange={(e) => setPlayName(e.target.value)}
                  placeholder="e.g., Fil Fly"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#00F0D0] transition-colors"
                />
              </div>

              {/* Formations, Categories & Formats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Formation */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Formation
                  </label>
                  <select
                    value={formation}
                    onChange={(e) => setFormation(e.target.value as PlayLabPlay['formation'])}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00F0D0]"
                  >
                    <option value="Spread">Spread</option>
                    <option value="Trips">Trips</option>
                    <option value="Stack">Stack</option>
                  </select>
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as PlayLabPlay['category'])}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00F0D0]"
                  >
                    <option value="Spread">Spread</option>
                    <option value="Bunch">Bunch</option>
                    <option value="Red Zone">Red Zone</option>
                    <option value="Run">Run</option>
                    <option value="Man/Zone Beater">Man/Zone Beater</option>
                  </select>
                </div>

                {/* Format */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Format
                  </label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as PlayLabPlay['format'])}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00F0D0]"
                  >
                    <option value="5v5">5v5</option>
                    <option value="7v7">7v7</option>
                    <option value="11v11">11v11</option>
                  </select>
                </div>
              </div>

              {/* Primary Target Receiver */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                  <span>Primary Target Read (QB 1st Look)</span>
                  <span className="text-slate-500 font-normal">Routes mapped: {routesWithPrimary.length}</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['QB', 'C', 'X', 'H', 'Z'] as const).map((token) => (
                    <button
                      key={token}
                      type="button"
                      onClick={() => setPrimaryPlayer(token)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        primaryPlayer === token
                          ? 'bg-[#00F0D0] text-black border-[#00F0D0] shadow-sm'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {token} {token === primaryPlayer ? '★ Primary' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vector Stem Preview List */}
              <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-2xl space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Assigned Vector Stems ({routesWithPrimary.length} Active Tokens)</span>
                  <span className="text-[#00F0D0] font-mono">Real-time SVG</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {routesWithPrimary.map((r) => (
                    <div
                      key={r.player}
                      className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-[11px] space-y-1"
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-white">{r.player}</span>
                        {r.isPrimary && (
                          <span className="text-[10px] text-emerald-400 font-bold">★ 1st Read</span>
                        )}
                      </div>
                      <p className="text-slate-400 truncate text-[10px]">{r.routeType}</p>
                      <p className="text-[9px] text-slate-500 font-mono">
                        {r.coordinates.length} waypoints
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Access & Sharing: isPublic & sharedWithTeamIds */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Privacy / Visibility */}
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {isPublic ? 'Public Tactical Play' : 'Private to Coach'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {isPublic ? 'Visible to community' : 'Default: false (Private)'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPublic(!isPublic)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                      isPublic
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    {isPublic ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    <span>{isPublic ? 'Public' : 'Private'}</span>
                  </button>
                </div>

                {/* Team Authorization IDs */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                    <Share2 className="w-3 h-3 text-[#00F0D0]" />
                    <span>Authorize Teams (Wristband HUD)</span>
                  </label>
                  <input
                    type="text"
                    value={sharedTeamsInput}
                    onChange={(e) => setSharedTeamsInput(e.target.value)}
                    placeholder="e.g. team_varsity, team_jv"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00F0D0]"
                  />
                  <p className="text-[10px] text-slate-500">Comma-separated team IDs allowed to view on wristband</p>
                </div>
              </div>

              {/* Cadence & Audible Color Signals */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Snap Cadence
                  </label>
                  <input
                    type="text"
                    value={cadence}
                    onChange={(e) => setCadence(e.target.value)}
                    placeholder="e.g. ON ONE, FAST CADENCE"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00F0D0]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Audible Color Signal
                  </label>
                  <input
                    type="text"
                    value={audibleColor}
                    onChange={(e) => setAudibleColor(e.target.value)}
                    placeholder="e.g. GREEN LIGHT, BLUE 42"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00F0D0]"
                  />
                </div>
              </div>

              {/* Coaching Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Coaching Notes / Cadence Tips
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Read progression: 1) X Fly vs Single High Safety. 2) Z Slant on soft zone."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00F0D0]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                    savedSuccess
                      ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                      : 'bg-[#00F0D0] hover:bg-[#00d0b0] text-black shadow-lg shadow-[#00F0D0]/20'
                  }`}
                >
                  {savedSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Saved to PlayLab!</span>
                    </>
                  ) : isSaving ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <Bookmark className="w-4 h-4" />
                      <span>Save PlayLabPlay</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'saved_plays' && (
            <div className="space-y-3">
              {/* 1-Click "Load Flag Playbook (9 Plays)" Preset Seeder Banner */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-cyan-950/40 via-slate-950 to-emerald-950/40 border border-[#00F0D0]/40 rounded-2xl shadow-lg">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#00F0D0]/10 border border-[#00F0D0]/30 flex items-center justify-center text-[#00F0D0] shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">
                      Flag Playbook Pack (9 Plays)
                    </h4>
                    <p className="text-[11px] text-slate-300">
                      Auto-populates Fil Fly, Akron, Slant Under, T-In, and 5 more into your private library.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isSeedingPack}
                  onClick={handleImportFlagPlaybookPack}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#00F0D0] hover:bg-[#00d0b0] text-black shadow-md shadow-[#00F0D0]/20 flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isSeedingPack ? 'Importing 9 Plays...' : '+ Import 5v5 Playbook Pack'}</span>
                </button>
              </div>

              {seedingSuccessMessage && (
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{seedingSuccessMessage}</span>
                </div>
              )}

              {/* Standard Sample Reference */}
              <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-2xl flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Bookmark className="w-3.5 h-3.5 text-emerald-400" />
                    Standard Blueprint: {SAMPLE_FIL_FLY_PLAY.name}
                  </span>
                  <p className="text-[11px] text-slate-400">
                    {SAMPLE_FIL_FLY_PLAY.formation} • {SAMPLE_FIL_FLY_PLAY.format} Flag • {SAMPLE_FIL_FLY_PLAY.routes.length} vector routes
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onLoadPlay(SAMPLE_FIL_FLY_PLAY);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
                >
                  Load Sample
                </button>
              </div>

              {/* User Plays List */}
              {loadingList ? (
                <div className="text-center py-8 text-xs text-slate-400">Loading playbook library...</div>
              ) : savedPlaysList.length === 0 ? (
                <div className="text-center py-10 space-y-3">
                  <Bookmark className="w-8 h-8 text-slate-600 mx-auto" />
                  <div>
                    <p className="text-xs text-slate-300 font-bold">No custom plays saved in your library yet.</p>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-1">
                      Design routes on the canvas and click "Save PlayLabPlay", or import the 9-play vetted pack above!
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isSeedingPack}
                    onClick={handleImportFlagPlaybookPack}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[#00F0D0] text-black hover:bg-[#00d0b0] shadow-md transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>+ Import 5v5 Playbook Pack</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1 text-[11px] font-bold text-slate-400">
                    <span>MY PLAYS ({savedPlaysList.length})</span>
                    <span className="text-[#00F0D0] font-mono">Strict Private Firestore Collection</span>
                  </div>

                  {savedPlaysList.map((play) => {
                    const currentTeams = play.sharedTeams || play.sharedWithTeamIds || [];
                    return (
                      <div
                        key={play.id}
                        className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col gap-3 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center flex-wrap gap-2">
                              <h4 className="text-sm font-bold text-white">{play.name}</h4>
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#00F0D0]/10 text-[#00F0D0] border border-[#00F0D0]/30 font-bold">
                                {play.formation}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono">
                                {play.format}
                              </span>
                              {play.cadence && (
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30">
                                  Cadence: {play.cadence}
                                </span>
                              )}
                              {play.audibleColor && (
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                                  {play.audibleColor}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400">
                              {play.routes.length} routes ({play.routes.map((r) => r.player).join(', ')})
                              {play.notes ? ` • ${play.notes}` : ''}
                            </p>
                          </div>

                          {/* Privacy dropdown on saved play card */}
                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            <PlayPrivacyDropdown
                              size="sm"
                              isPublic={Boolean(play.isPublic)}
                              sharedTeams={currentTeams}
                              onChangePrivacy={(updates) => {
                                if (play.id) {
                                  handleUpdateCardPrivacy(play.id, updates);
                                }
                              }}
                              onOpenTeamModal={() => {
                                setTeamModalPlay(play);
                              }}
                            />

                            {play.id && (
                              <button
                                type="button"
                                onClick={() => handleDelete(play.id!)}
                                className="p-1.5 text-slate-500 hover:text-rose-400 rounded-xl hover:bg-slate-900 transition-colors"
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
                              className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-800 text-[#00F0D0] hover:bg-slate-700 border border-[#00F0D0]/30 transition-colors cursor-pointer whitespace-nowrap"
                            >
                              Load Play
                            </button>
                          </div>
                        </div>

                        {/* Team shared badge preview if shared */}
                        {!play.isPublic && currentTeams.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-900 text-[10px] text-slate-400">
                            <Users className="w-3 h-3 text-[#00F0D0]" />
                            <span>Authorized Wristband HUD:</span>
                            {currentTeams.map((t) => (
                              <span key={t} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-white">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Team Select Modal for adding/toggling teamIds */}
        {teamModalPlay && (
          <TeamSelectModal
            isOpen={Boolean(teamModalPlay)}
            onClose={() => setTeamModalPlay(null)}
            playName={teamModalPlay.name}
            currentSharedTeams={teamModalPlay.sharedTeams || teamModalPlay.sharedWithTeamIds || []}
            defaultTeamId={activeTeamId}
            onSaveSharedTeams={(newTeams) => {
              if (teamModalPlay.id) {
                handleUpdateCardPrivacy(teamModalPlay.id, {
                  isPublic: false,
                  sharedTeams: newTeams,
                });
              }
              setTeamModalPlay(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default PlayLabPlayModal;
