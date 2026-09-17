import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Edit3, 
  X, 
  Trophy, 
  Calendar, 
  MapPin, 
  Layers, 
  Users, 
  Clock, 
  Building2, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  Trash2,
  SlidersHorizontal,
  Flame,
  ShieldCheck
} from 'lucide-react';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Tournament, SportType } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { TournamentFlyerUploader, FlyerUploadData } from './TournamentFlyerUploader';

export interface EditTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament | null;
  onSave?: (updatedTournament: Tournament) => void;
}

export const EditTournamentModal: React.FC<EditTournamentModalProps> = ({
  isOpen,
  onClose,
  tournament,
  onSave
}) => {
  const { user, role } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [sport, setSport] = useState<SportType>('Basketball');
  const [format, setFormat] = useState<string>('Single Elimination');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [venueName, setVenueName] = useState('');
  const [status, setStatus] = useState<'Upcoming' | 'In Progress' | 'Completed'>('In Progress');
  
  // Divisions State
  const [divisionsList, setDivisionsList] = useState<string[]>([]);
  const [newDivisionInput, setNewDivisionInput] = useState('');

  // Schedule Time Slots & Stations / Courts
  const [gameStartTime, setGameStartTime] = useState('08:00 AM');
  const [gameEndTime, setGameEndTime] = useState('08:00 PM');
  const [timeSlotDuration, setTimeSlotDuration] = useState('60'); // minutes
  const [stationsList, setStationsList] = useState<string[]>(['Court 1 (Main)', 'Court 2', 'Court 3']);
  const [newStationInput, setNewStationInput] = useState('');

  // Participating Teams
  const [teamsList, setTeamsList] = useState<string[]>([]);
  const [newTeamInput, setNewTeamInput] = useState('');

  // Media & Flyer Ingestion
  const [flyerUrl, setFlyerUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'banner' | 'flyer' | 'auto'>('banner');

  // Populate when tournament changes
  useEffect(() => {
    if (tournament) {
      setName(tournament.name || '');
      setSport((tournament.sport as SportType) || 'Basketball');
      setFormat(tournament.format || 'Single Elimination');
      setStartDate(tournament.startDate || '');
      setEndDate(tournament.endDate || '');
      setVenueName(tournament.venueName || 'Just1Play Main Complex');
      setStatus(tournament.status || 'In Progress');

      const existingFlyer = tournament.flyerUrl || (tournament as any).coverUrl || (tournament as any).bannerUrl || '';
      setFlyerUrl(existingFlyer);
      setThumbnailUrl(tournament.thumbnailUrl || existingFlyer);
      setAspectRatio((tournament as any).aspectRatio || 'banner');
      
      const tDivs = (tournament as any).divisions || ['17U Boys', 'Varsity Gold', '16U Showcase'];
      setDivisionsList(Array.isArray(tDivs) ? tDivs : ['17U Boys', 'Varsity Gold']);

      const tStations = (tournament as any).stations || (tournament as any).courts || ['Court 1 (Main)', 'Court 2', 'Court 3'];
      setStationsList(Array.isArray(tStations) ? tStations : ['Court 1', 'Court 2']);

      const tTeams = tournament.participatingTeams || [];
      setTeamsList(Array.isArray(tTeams) ? tTeams : []);

      setGameStartTime((tournament as any).gameStartTime || '08:00 AM');
      setGameEndTime((tournament as any).gameEndTime || '08:00 PM');
      setTimeSlotDuration((tournament as any).timeSlotDuration || '60');
      
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [tournament, isOpen]);

  if (!isOpen || !tournament) return null;

  // Add Division
  const handleAddDivision = () => {
    const clean = newDivisionInput.trim();
    if (clean && !divisionsList.includes(clean)) {
      setDivisionsList([...divisionsList, clean]);
      setNewDivisionInput('');
    }
  };

  const handleRemoveDivision = (indexToRemove: number) => {
    setDivisionsList(divisionsList.filter((_, i) => i !== indexToRemove));
  };

  // Add Station/Court
  const handleAddStation = () => {
    const clean = newStationInput.trim();
    if (clean && !stationsList.includes(clean)) {
      setStationsList([...stationsList, clean]);
      setNewStationInput('');
    }
  };

  const handleRemoveStation = (indexToRemove: number) => {
    setStationsList(stationsList.filter((_, i) => i !== indexToRemove));
  };

  // Add Team
  const handleAddTeam = () => {
    const clean = newTeamInput.trim();
    if (clean && !teamsList.includes(clean)) {
      setTeamsList([...teamsList, clean]);
      setNewTeamInput('');
    }
  };

  const handleRemoveTeam = (indexToRemove: number) => {
    setTeamsList(teamsList.filter((_, i) => i !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Tournament name is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const updatedTournament: Tournament = {
      ...tournament,
      name: name.trim(),
      sport,
      format: format as any,
      startDate,
      endDate,
      venueName: venueName.trim() || 'Just1Play Main Complex',
      participatingTeams: teamsList,
      status,
      flyerUrl,
      coverUrl: flyerUrl,
      bannerUrl: flyerUrl,
      thumbnailUrl: thumbnailUrl || flyerUrl,
      aspectRatio,
      // Extended fields
      ...({
        divisions: divisionsList,
        stations: stationsList,
        courts: stationsList,
        gameStartTime,
        gameEndTime,
        timeSlotDuration,
        updatedAt: new Date().toISOString()
      } as any)
    };

    try {
      // 1. Update in Firestore
      if (db) {
        const tournRef = doc(db, 'tournaments', tournament.id);
        const updateData: any = {
          name: updatedTournament.name,
          sport: updatedTournament.sport,
          format: updatedTournament.format,
          startDate: updatedTournament.startDate,
          endDate: updatedTournament.endDate,
          venueName: updatedTournament.venueName,
          participatingTeams: updatedTournament.participatingTeams,
          status: updatedTournament.status,
          flyerUrl,
          coverUrl: flyerUrl,
          bannerUrl: flyerUrl,
          thumbnailUrl: thumbnailUrl || flyerUrl,
          aspectRatio,
          divisions: divisionsList,
          stations: stationsList,
          courts: stationsList,
          gameStartTime,
          gameEndTime,
          timeSlotDuration,
          updatedAt: new Date().toISOString()
        };

        try {
          await updateDoc(tournRef, updateData);
        } catch (err: any) {
          // If document doesn't exist yet, fallback to setDoc with merge
          await setDoc(tournRef, updateData, { merge: true });
        }

        // Also update matching event in events collection if present
        try {
          await setDoc(doc(db, 'events', tournament.id), {
            name: updatedTournament.name,
            title: updatedTournament.name,
            sport: updatedTournament.sport,
            startDate: updatedTournament.startDate,
            endDate: updatedTournament.endDate,
            venueName: updatedTournament.venueName,
            status: updatedTournament.status,
            flyerUrl,
            coverUrl: flyerUrl,
            bannerUrl: flyerUrl,
            thumbnailUrl: thumbnailUrl || flyerUrl,
            aspectRatio,
            divisions: divisionsList,
            participatingTeams: updatedTournament.participatingTeams,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (e) {
          // Non-blocking
        }
      }

      // 2. Save to localStorage for instant offline resilience
      try {
        const savedTourns = localStorage.getItem('just1play_tournaments');
        let list: Tournament[] = savedTourns ? JSON.parse(savedTourns) : [];
        const idx = list.findIndex(t => t.id === tournament.id);
        if (idx !== -1) {
          list[idx] = updatedTournament;
        } else {
          list.push(updatedTournament);
        }
        localStorage.setItem('just1play_tournaments', JSON.stringify(list));
      } catch (e) {
        console.warn('LocalStorage save warning:', e);
      }

      // 3. Inform parent component
      if (onSave) {
        onSave(updatedTournament);
      }

      setSuccessMsg('Tournament updated successfully!');
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 600);
    } catch (err: any) {
      console.error('Error updating tournament:', err);
      setErrorMsg(err.message || 'Failed to update tournament in Firestore.');
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl bg-[#090D16] border border-[#24324F] rounded-3xl p-6 sm:p-8 shadow-2xl text-white space-y-6 max-h-[92vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#24324F]/70 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#00F2FE]/15 border border-[#00F2FE]/40 flex items-center justify-center text-[#00F2FE]">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>Edit Tournament & Schedule Master</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Update brackets, divisions, station assignments, and schedule slots.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 1. Basic Tournament Details */}
            <div className="space-y-4 p-4 rounded-2xl bg-[#141B2D]/60 border border-[#24324F]/50">
              <span className="text-[10px] font-black uppercase text-[#00F2FE] tracking-wider flex items-center gap-1.5 font-mono">
                <Trophy className="w-3.5 h-3.5" />
                1. GENERAL TOURNAMENT INFO
              </span>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Event / Tournament Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Garden State Hoopfest 2026"
                  className="w-full bg-[#090D16] border border-[#24324F] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#00F2FE] focus:outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Sport Discipline
                  </label>
                  <select
                    value={sport}
                    onChange={(e) => setSport(e.target.value as SportType)}
                    className="w-full bg-[#090D16] border border-[#24324F] rounded-xl px-3 py-2 text-xs text-white focus:border-[#00F2FE] focus:outline-none"
                  >
                    <option value="Basketball">🏀 Basketball</option>
                    <option value="Flag Football">🏈 Flag Football</option>
                    <option value="Football">⚡ Tackle Football</option>
                    <option value="Cheer">📣 Cheer & Stunt</option>
                    <option value="Wrestling">🤼 Wrestling</option>
                    <option value="Soccer">⚽ Soccer</option>
                    <option value="Lacrosse">🥍 Lacrosse</option>
                    <option value="Track & Field">🏃 Track & Field</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Tournament Format
                  </label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="w-full bg-[#090D16] border border-[#24324F] rounded-xl px-3 py-2 text-xs text-white focus:border-[#00F2FE] focus:outline-none"
                  >
                    <option value="Single Elimination">Single Elimination</option>
                    <option value="Double Elimination">Double Elimination</option>
                    <option value="Pool Play">Pool Play to Bracket</option>
                    <option value="Showcase Jamboree">Showcase Jamboree</option>
                    <option value="Performance Scored">Performance Scored (Cheer)</option>
                    <option value="Mat or Flight">Mat & Flight (Wrestling / Track)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-[#090D16] border border-[#24324F] rounded-xl px-3 py-2 text-xs text-white focus:border-[#00F2FE] focus:outline-none"
                  >
                    <option value="Upcoming">Upcoming</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-[#090D16] border border-[#24324F] rounded-xl px-3 py-2 text-xs text-white focus:border-[#00F2FE] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-[#090D16] border border-[#24324F] rounded-xl px-3 py-2 text-xs text-white focus:border-[#00F2FE] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Primary Venue / Facility Location
                </label>
                <input
                  type="text"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  placeholder="e.g. Iron Peak Sports Complex • Hillsborough, NJ"
                  className="w-full bg-[#090D16] border border-[#24324F] rounded-xl px-3 py-2 text-xs text-white focus:border-[#00F2FE] focus:outline-none"
                />
              </div>
            </div>

            {/* Media & Flyer Ingestion (Dual Upload & URL) */}
            <TournamentFlyerUploader
              initialUrl={flyerUrl}
              initialThumbnail={thumbnailUrl}
              initialAspectRatio={aspectRatio}
              tournamentId={tournament.id}
              onChange={(data) => {
                setFlyerUrl(data.flyerUrl);
                setThumbnailUrl(data.thumbnailUrl);
                setAspectRatio(data.aspectRatio);
              }}
              title="TOURNAMENT PROMOTIONAL FLYER / COVER PHOTO"
            />

            {/* 2. Divisions & Age Brackets */}
            <div className="space-y-3 p-4 rounded-2xl bg-[#141B2D]/60 border border-[#24324F]/50">
              <span className="text-[10px] font-black uppercase text-[#FF6A00] tracking-wider flex items-center gap-1.5 font-mono">
                <Layers className="w-3.5 h-3.5" />
                2. DIVISIONS & AGE BRACKETS
              </span>

              <div className="flex flex-wrap gap-2">
                {divisionsList.map((div, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-xl bg-[#263238] border border-[#24324F] text-xs font-bold text-white flex items-center gap-2"
                  >
                    <span>{div}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDivision(idx)}
                      className="text-slate-400 hover:text-rose-400"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDivisionInput}
                  onChange={(e) => setNewDivisionInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddDivision(); } }}
                  placeholder="Add Division (e.g. '14U Elite', 'Varsity Boys', '17U Girls')..."
                  className="flex-1 bg-[#090D16] border border-[#24324F] rounded-xl px-3 py-2 text-xs text-white focus:border-[#FF6A00] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddDivision}
                  className="px-4 py-2 bg-[#FF6A00]/20 hover:bg-[#FF6A00] text-[#FF6A00] hover:text-black font-black text-xs uppercase rounded-xl transition-all border border-[#FF6A00]/40 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* 3. Schedule Time Slots & Courts/Stations */}
            <div className="space-y-3 p-4 rounded-2xl bg-[#141B2D]/60 border border-[#24324F]/50">
              <span className="text-[10px] font-black uppercase text-[#00F2FE] tracking-wider flex items-center gap-1.5 font-mono">
                <Clock className="w-3.5 h-3.5" />
                3. SCHEDULE SLOTS & COURT STATIONS
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    First Game Start
                  </label>
                  <input
                    type="text"
                    value={gameStartTime}
                    onChange={(e) => setGameStartTime(e.target.value)}
                    placeholder="08:00 AM"
                    className="w-full bg-[#090D16] border border-[#24324F] rounded-xl px-3 py-2 text-xs text-white focus:border-[#00F2FE] focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Last Game End
                  </label>
                  <input
                    type="text"
                    value={gameEndTime}
                    onChange={(e) => setGameEndTime(e.target.value)}
                    placeholder="08:00 PM"
                    className="w-full bg-[#090D16] border border-[#24324F] rounded-xl px-3 py-2 text-xs text-white focus:border-[#00F2FE] focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Slot Interval (Mins)
                  </label>
                  <input
                    type="number"
                    value={timeSlotDuration}
                    onChange={(e) => setTimeSlotDuration(e.target.value)}
                    placeholder="60"
                    className="w-full bg-[#090D16] border border-[#24324F] rounded-xl px-3 py-2 text-xs text-white focus:border-[#00F2FE] focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Active Stations / Courts / Fields
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {stationsList.map((st, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-xl bg-[#263238] border border-[#24324F] text-xs font-bold text-slate-200 flex items-center gap-2"
                    >
                      <Building2 className="w-3 h-3 text-[#00F2FE]" />
                      <span>{st}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveStation(idx)}
                        className="text-slate-400 hover:text-rose-400"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newStationInput}
                    onChange={(e) => setNewStationInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddStation(); } }}
                    placeholder="Add Station (e.g. 'Court 4', 'Field C', 'Mat 2')..."
                    className="flex-1 bg-[#090D16] border border-[#24324F] rounded-xl px-3 py-2 text-xs text-white focus:border-[#00F2FE] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddStation}
                    className="px-4 py-2 bg-[#00F2FE]/20 hover:bg-[#00F2FE] text-[#00F2FE] hover:text-black font-black text-xs uppercase rounded-xl transition-all border border-[#00F2FE]/40 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 4. Participating Teams */}
            <div className="space-y-3 p-4 rounded-2xl bg-[#141B2D]/60 border border-[#24324F]/50">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-[#E5B868] tracking-wider flex items-center gap-1.5 font-mono">
                  <Users className="w-3.5 h-3.5" />
                  4. REGISTERED TEAMS ({teamsList.length})
                </span>
              </div>

              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                {teamsList.map((team, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-xl bg-[#263238] border border-[#24324F] text-xs font-bold text-white flex items-center gap-2"
                  >
                    <span>{team}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTeam(idx)}
                      className="text-slate-400 hover:text-rose-400"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTeamInput}
                  onChange={(e) => setNewTeamInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTeam(); } }}
                  placeholder="Type team name and hit Enter (e.g. 'PSA Cardinals')..."
                  className="flex-1 bg-[#090D16] border border-[#24324F] rounded-xl px-3 py-2 text-xs text-white focus:border-[#E5B868] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddTeam}
                  className="px-4 py-2 bg-[#E5B868]/20 hover:bg-[#E5B868] text-[#E5B868] hover:text-black font-black text-xs uppercase rounded-xl transition-all border border-[#E5B868]/40 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs uppercase rounded-2xl border border-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 bg-[#00F2FE] hover:bg-[#38BDF8] text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-[0_0_20px_rgba(0,242,254,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    <span>Save & Sync Firestore</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
