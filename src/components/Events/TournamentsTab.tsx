import React, { useState } from 'react';
import { Tournament, SportType } from '../../types';
import { BentoCard } from '../BentoCard';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminEventBuilder } from './AdminEventBuilder';
import { EditTournamentModal } from '../Tournaments/EditTournamentModal';
import { DeleteConfirmationModal } from '../Tournaments/DeleteConfirmationModal';
import { EventShareCardModal } from './EventShareCardModal';
import { TournamentCheckoutModal } from './TournamentCheckoutModal';
import { canManageEvent, canCreateEvents } from '../../utils/authGuards';
import { 
  Trophy, 
  Calendar, 
  MapPin, 
  Users, 
  Plus, 
  Layers, 
  CheckCircle2, 
  Sparkles,
  ChevronRight,
  ShieldAlert,
  Flame,
  Edit3,
  Trash2,
  AlertTriangle,
  Share2,
  CreditCard,
  ShieldCheck,
  BookOpen
} from 'lucide-react';
import { TournamentGuideWalkthroughModal } from '../Tournaments/TournamentGuideWalkthroughModal';

interface TournamentsTabProps {
  tournaments: Tournament[];
  onSelectTournament: (tournamentId: string) => void;
  onCreateTournament: (tournament: Omit<Tournament, 'id' | 'createdAt'>) => void;
  onEditTournament?: (updatedTournament: Tournament) => void;
  onDeleteTournament?: (tournamentId: string) => void;
  canManage: boolean;
}

const TOURNAMENT_CONTAINER_VARIANTS = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.06,
    },
  },
};

const TOURNAMENT_CARD_VARIANTS = {
  hidden: { 
    opacity: 0, 
    y: 28,
    scale: 0.96
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 280,
      damping: 22,
      mass: 0.75
    }
  },
};

export const TournamentsTab: React.FC<TournamentsTabProps> = ({
  tournaments,
  onSelectTournament,
  onCreateTournament,
  onEditTournament,
  onDeleteTournament,
  canManage: externalCanManage
}) => {
  const { user, role } = useAuth();
  const [selectedSport, setSelectedSport] = useState<string>('All');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [shareModalTournament, setShareModalTournament] = useState<Tournament | null>(null);

  // Quick Add Team State
  const [addingTeamTournament, setAddingTeamTournament] = useState<Tournament | null>(null);
  const [newTeamNameInput, setNewTeamNameInput] = useState('');

  // Modular Edit & Delete Modals State
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [deletingTournament, setDeletingTournament] = useState<Tournament | null>(null);

  // Tournament Checkout Modal State
  const [registeringTournament, setRegisteringTournament] = useState<Tournament | null>(null);

  // Tournament, Division & Team Guide / FAQ Modal State
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);

  const canCreate = externalCanManage || canCreateEvents(user, role);

  const filteredTournaments = tournaments.filter(
    t => selectedSport === 'All' || t.sport === selectedSport
  );

  const handleOpenEdit = (t: Tournament) => {
    setEditingTournament(t);
  };

  const handleSavedTournament = (updated: Tournament) => {
    if (onEditTournament) {
      onEditTournament(updated);
    }
    setEditingTournament(null);
  };

  const handleConfirmDelete = (tournamentId: string) => {
    if (onDeleteTournament) {
      onDeleteTournament(tournamentId);
    }
    setDeletingTournament(null);
  };

  const handleAddTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingTeamTournament || !newTeamNameInput.trim()) return;

    const cleanTeam = newTeamNameInput.trim();
    const existingTeams = addingTeamTournament.participatingTeams || [];
    const updatedTeams = Array.from(new Set([...existingTeams, cleanTeam]));

    const updated: Tournament = {
      ...addingTeamTournament,
      participatingTeams: updatedTeams
    };

    // Save to parent state and trigger updates
    if (onEditTournament) {
      onEditTournament(updated);
    }

    // Backup cache in localStorage for mobile resilience
    try {
      const savedLocal = localStorage.getItem('just1play_tournaments');
      let list: Tournament[] = savedLocal ? JSON.parse(savedLocal) : tournaments;
      const idx = list.findIndex(t => t.id === updated.id);
      if (idx !== -1) {
        list[idx] = updated;
      } else {
        list.push(updated);
      }
      localStorage.setItem('just1play_tournaments', JSON.stringify(list));
    } catch (err) {
      console.warn('Failed to cache tournament in localStorage:', err);
    }

    setAddingTeamTournament(null);
    setNewTeamNameInput('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header Controls with glowing Create button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Sport Selector Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {['All', 'Basketball', 'Flag Football', 'Football', 'Cheer', 'Wrestling', 'Soccer', 'Lacrosse'].map((sp) => (
            <button
              key={sp}
              onClick={() => setSelectedSport(sp)}
              className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap border cursor-pointer ${
                selectedSport === sp
                  ? 'bg-[#FF6A00] text-black border-[#FF6A00] shadow-[0_0_20px_rgba(255,106,0,0.5)]'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
              }`}
            >
              {sp === 'All' ? 'ALL TOURNAMENTS' : sp.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowGuideModal(true)}
            className="px-4 py-3 bg-[#00F2FE]/15 hover:bg-[#00F2FE]/25 border border-[#00F2FE]/40 text-[#00F2FE] font-black text-xs uppercase tracking-wider rounded-2xl transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-md"
            title="Learn how to setup divisions, add teams & seed brackets"
          >
            <BookOpen className="w-4 h-4 text-[#00F2FE]" />
            <span>📖 Division & Teams Guide</span>
          </button>

          {canCreate && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-3 bg-gradient-to-r from-[#00F2FE] to-[#38BDF8] hover:from-[#38BDF8] hover:to-[#00F2FE] text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-[0_0_25px_rgba(0,242,254,0.5)] flex items-center gap-2 shrink-0 cursor-pointer animate-pulse"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ CREATE EVENT / TOURNAMENT</span>
            </button>
          )}
        </div>
      </div>

      {/* Tournaments Bento Grid with Staggered Entrance Animation */}
      <motion.div 
        variants={TOURNAMENT_CONTAINER_VARIANTS}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {filteredTournaments.map((t) => {
          const userCanManage = canManageEvent(t, user, role);

          return (
            <motion.div
              key={t.id}
              variants={TOURNAMENT_CARD_VARIANTS}
              className="h-full"
            >
              <BentoCard
                glow={t.status === 'In Progress'}
                className="flex flex-col justify-between h-full"
              >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-md ${
                    t.status === 'In Progress' 
                      ? 'bg-[#FF6A00] text-black shadow-[0_0_10px_rgba(255,106,0,0.6)] font-bold'
                      : 'bg-white/10 text-slate-300'
                  }`}>
                    {t.status === 'In Progress' ? '🔥 IN PROGRESS' : (t?.status?.toUpperCase() ?? 'UPCOMING')}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase bg-white/5 px-2 py-0.5 rounded border border-white/10">
                    {t.sport}
                  </span>
                </div>

                <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2 line-clamp-2">
                  {t.name}
                </h3>

                <div className="space-y-2 text-xs text-slate-400 mb-4 bg-white/5 p-3 rounded-2xl border border-white/10">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Calendar className="w-3.5 h-3.5 text-[#00F2FE] shrink-0" />
                    <span>{t.startDate} to {t.endDate}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-[#00F2FE] shrink-0" />
                    <span className="truncate">{t.venueName || 'Tri-State Arena'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Layers className="w-3.5 h-3.5 text-[#00F2FE] shrink-0" />
                    <span>Format: <strong className="text-white">{t.format}</strong></span>
                  </div>
                </div>

                {/* Team count badge */}
                <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#FF6A00]" />
                    <span className="font-bold text-white">{(t.participatingTeams || []).length} Teams</span> Registered
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono uppercase">J1P Verified</span>
                </div>
              </div>

              <div className="space-y-3">
                {userCanManage && (
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <button
                      onClick={() => {
                        setAddingTeamTournament(t);
                        setNewTeamNameInput('');
                      }}
                      className="py-2 px-2 bg-[#FF6A00]/10 hover:bg-[#FF6A00] text-[#FF6A00] hover:text-black border border-[#FF6A00]/30 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer"
                      title="Add team to tournament roster"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>ADD TEAM</span>
                    </button>

                    <button
                      onClick={() => handleOpenEdit(t)}
                      className="py-2 px-2 bg-[#00F2FE]/10 hover:bg-[#00F2FE] text-[#00F2FE] hover:text-black border border-[#00F2FE]/30 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>EDIT</span>
                    </button>

                    <button
                      onClick={() => setDeletingTournament(t)}
                      className="py-2 px-2 bg-rose-500/10 hover:bg-[#FF6A00] text-rose-400 hover:text-black border border-rose-500/30 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>DELETE</span>
                    </button>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setRegisteringTournament(t)}
                    className="w-full py-3 bg-[#E5B868] hover:bg-[#F3C97C] text-black font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-[0_0_15px_rgba(229,184,104,0.3)] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4 text-black" />
                    <span>REGISTER TEAM & PAY</span>
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={() => onSelectTournament(t.id)}
                      className="flex-1 py-3 bg-white/10 hover:bg-[#00F2FE] hover:text-black text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all border border-white/15 hover:border-[#00F2FE] flex items-center justify-center gap-2 group shadow-lg cursor-pointer"
                    >
                      <span>VIEW BRACKET</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>

                    <button
                      onClick={() => setShareModalTournament(t)}
                      className="px-4 py-3 bg-[#00F2FE]/10 hover:bg-[#00F2FE]/20 text-[#00F2FE] border border-[#00F2FE]/30 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Share2 className="w-4 h-4 text-[#00F2FE]" />
                      <span>SHARE</span>
                    </button>
                  </div>
                </div>
              </div>
              </BentoCard>
            </motion.div>
          );
        })}
      </motion.div>

      {/* QUICK ADD TEAM MODAL */}
      <AnimatePresence>
        {addingTeamTournament && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#090D16]/85 backdrop-blur-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-[#090D16] border border-[#FF6A00]/40 rounded-3xl p-6 shadow-2xl text-white space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-black uppercase text-[#FF6A00] flex items-center gap-2 font-mono">
                  <Plus className="w-4 h-4 stroke-[3]" />
                  ADD TEAM TO {addingTeamTournament.name}
                </span>
                <button
                  onClick={() => setAddingTeamTournament(null)}
                  className="p-1 rounded-full bg-white/5 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddTeamSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Team Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newTeamNameInput}
                    onChange={(e) => setNewTeamNameInput(e.target.value)}
                    placeholder="e.g. 'NJ Raptors Elite U17'"
                    className="w-full bg-[#141B2D] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#FF6A00] focus:outline-none font-bold"
                  />
                </div>

                <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-xs">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Current Registered Teams ({(addingTeamTournament.participatingTeams || []).length}):</span>
                  <p className="text-slate-300 font-mono text-[11px] leading-relaxed">
                    {(addingTeamTournament.participatingTeams || []).length > 0 ? (addingTeamTournament.participatingTeams || []).join(', ') : 'No teams added yet.'}
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#00F2FE] hover:bg-[#38BDF8] text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-[0_0_20px_rgba(0,242,254,0.4)] transition-all cursor-pointer"
                >
                  ADD TEAM & UPDATE BRACKET ROSTER
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE TOURNAMENT MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#090D16]/85 backdrop-blur-2xl overflow-y-auto py-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl"
            >
              <AdminEventBuilder 
                onEventCreated={(newEventId) => {
                  setShowCreateModal(false);
                  if (onSelectTournament && newEventId) {
                    onSelectTournament(newEventId);
                  }
                }}
                onCancel={() => setShowCreateModal(false)}
                onClose={() => setShowCreateModal(false)} 
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT TOURNAMENT MODAL */}
      <EditTournamentModal
        isOpen={!!editingTournament}
        onClose={() => setEditingTournament(null)}
        tournament={editingTournament}
        onSave={handleSavedTournament}
      />

      {/* DELETE TOURNAMENT CONFIRMATION MODAL WITH BLAZE ORANGE ALERT */}
      {deletingTournament && (
        <DeleteConfirmationModal
          isOpen={!!deletingTournament}
          onClose={() => setDeletingTournament(null)}
          tournamentId={deletingTournament.id}
          eventName={deletingTournament.name}
          onConfirmDelete={handleConfirmDelete}
        />
      )}

      {/* BRANDED TOURNAMENT MATRIX SHARE CARD MODAL */}
      <EventShareCardModal
        isOpen={!!shareModalTournament}
        onClose={() => setShareModalTournament(null)}
        tournament={shareModalTournament}
      />

      {/* TOURNAMENT TEAM REGISTRATION & STRIPE CHECKOUT MODAL */}
      {registeringTournament && (
        <TournamentCheckoutModal
          isOpen={!!registeringTournament}
          onClose={() => setRegisteringTournament(null)}
          eventId={registeringTournament.id}
          eventTitle={registeringTournament.name}
          organizerId={registeringTournament.organizerId || (registeringTournament as any).createdBy}
          defaultEntryFee={150.0}
          onSuccess={() => {
            setRegisteringTournament(null);
          }}
        />
      )}

      {/* TOURNAMENT, DIVISION & TEAM GUIDE / FAQ MODAL */}
      <TournamentGuideWalkthroughModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        onOpenCreateTournament={() => {
          setShowGuideModal(false);
          setShowCreateModal(true);
        }}
      />
    </div>
  );
};
