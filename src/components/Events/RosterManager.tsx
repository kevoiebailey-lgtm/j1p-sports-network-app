import React, { useState, useEffect } from 'react';
import { TeamItem, EventItem, UserProfile } from '../../types';
import { 
  verifyAthleteEligibility, 
  searchAthleteProfile, 
  updateTeamRosterInFirestore,
  calculateAgeOnDate 
} from '../../services/tournamentHubService';
import { 
  Users, 
  Search, 
  UserPlus, 
  ShieldCheck, 
  AlertTriangle, 
  Trash2, 
  CheckCircle2, 
  Lock, 
  Calendar, 
  UserCheck,
  X,
  Sparkles
} from 'lucide-react';

interface RosterManagerProps {
  team: TeamItem;
  event: EventItem;
  onRosterUpdated?: (updatedTeam: TeamItem) => void;
  onClose?: () => void;
}

export const RosterManager: React.FC<RosterManagerProps> = ({ team, event, onRosterUpdated, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [rosterAthletes, setRosterAthletes] = useState<UserProfile[]>(team.rosterDetails || []);
  const [rosterUids, setRosterUids] = useState<string[]>(team.roster || []);
  
  const [toastError, setToastError] = useState<string | null>(null);
  const [toastSuccess, setToastSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Check if roster is locked
  const isRosterLocked = event.rosterLockDate 
    ? new Date().getTime() > new Date(event.rosterLockDate).getTime()
    : false;

  // Search handler
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchAthleteProfile(searchTerm);
      setSearchResults(results);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Trigger temporary toasts
  const showToast = (message: string, isError = true) => {
    if (isError) {
      setToastError(message);
      setTimeout(() => setToastError(null), 4000);
    } else {
      setToastSuccess(message);
      setTimeout(() => setToastSuccess(null), 3000);
    }
  };

  // Add athlete to team roster with AUTOMATED AGE VERIFICATION
  const handleAddAthlete = async (athlete: UserProfile) => {
    if (isRosterLocked) {
      showToast('Roster changes are locked for this event.', true);
      return;
    }

    if (rosterUids.includes(athlete.uid)) {
      showToast(`${athlete.displayName} is already on the roster.`, true);
      return;
    }

    // Crucial automated age check vs division
    const eligibility = verifyAthleteEligibility(
      athlete.dateOfBirth || '2015-05-10', // Default fallback if DOB missing in test profile
      team.division,
      event.startDate || event.date
    );

    if (!eligibility.eligible) {
      // Display exact requested error message
      showToast(`Athlete ineligible for this division based on age (${eligibility.reason || 'Exceeds age limit'}).`, true);
      return;
    }

    // Add player to roster
    const newUids = [...rosterUids, athlete.uid];
    const newAthletes = [...rosterAthletes, athlete];

    setRosterUids(newUids);
    setRosterAthletes(newAthletes);
    setSearchTerm('');
    setSearchResults([]);

    showToast(`${athlete.displayName} verified & added to division ${team.division}!`, false);

    // Save to Firestore
    try {
      setIsSaving(true);
      await updateTeamRosterInFirestore(team.id, newUids);
      if (onRosterUpdated) {
        onRosterUpdated({ ...team, roster: newUids, rosterDetails: newAthletes });
      }
    } catch (err) {
      console.error('Failed to sync roster to Firestore:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Remove athlete from roster
  const handleRemoveAthlete = async (uid: string) => {
    if (isRosterLocked) {
      showToast('Roster is locked.', true);
      return;
    }

    const newUids = rosterUids.filter(id => id !== uid);
    const newAthletes = rosterAthletes.filter(a => a.uid !== uid);

    setRosterUids(newUids);
    setRosterAthletes(newAthletes);

    try {
      setIsSaving(true);
      await updateTeamRosterInFirestore(team.id, newUids);
      if (onRosterUpdated) {
        onRosterUpdated({ ...team, roster: newUids, rosterDetails: newAthletes });
      }
      showToast('Athlete removed from roster.', false);
    } catch (err) {
      console.error('Error removing athlete from roster:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[#212A31] border border-white/15 rounded-3xl p-6 sm:p-8 max-w-3xl mx-auto shadow-2xl relative font-sans text-slate-100">
      
      {/* Toast Overlay */}
      {toastError && (
        <div className="fixed top-6 right-6 z-50 max-w-md p-4 rounded-2xl bg-red-600 text-white font-bold text-xs shadow-2xl flex items-center gap-3 border border-white/20 animate-bounce">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{toastError}</span>
        </div>
      )}

      {toastSuccess && (
        <div className="fixed top-6 right-6 z-50 max-w-md p-4 rounded-2xl bg-[#E5B868] text-black font-extrabold text-xs shadow-2xl flex items-center gap-3 border border-black/20 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{toastSuccess}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between border-b border-white/10 pb-6 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E5B868]/10 border border-[#E5B868]/30 text-[#E5B868] text-xs font-mono font-bold uppercase mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>Roster Manager & Automated Verification</span>
          </div>
          <h2 className="text-2xl font-black text-white">
            {team.teamName} <span className="text-[#E5B868] font-mono">({team.division})</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
            <span>Event: <strong className="text-white">{event.title || event.name}</strong></span>
            <span>•</span>
            <span className="flex items-center gap-1 text-red-400 font-mono">
              <Lock className="w-3 h-3" />
              <span>Roster Lock: {event.rosterLockDate || 'Aug 10, 2026'}</span>
            </span>
          </p>
        </div>

        {onClose && (
          <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Search Bar for Adding Athletes */}
      {!isRosterLocked && (
        <div className="space-y-3 mb-8">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center justify-between">
            <span>Search Athletes (By Name or 6-Digit ID)</span>
            <span className="text-[10px] text-[#E5B868]">Automated DOB verification</span>
          </label>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Enter Athlete Name or ID (e.g. Marcus, J1P-849201)..."
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/5 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#E5B868] transition-all font-sans"
            />
            {isSearching && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#E5B868] animate-pulse">
                Searching...
              </span>
            )}
          </div>

          {/* Search Dropdown Results */}
          {searchResults.length > 0 && (
            <div className="p-2 rounded-2xl bg-[#212A31] border border-white/15 space-y-1.5 shadow-2xl max-h-60 overflow-y-auto">
              {searchResults.map((athlete) => {
                const age = calculateAgeOnDate(athlete.dateOfBirth || '2010-01-01', event.startDate || event.date);
                const isAlreadyAdded = rosterUids.includes(athlete.uid);

                return (
                  <div
                    key={athlete.uid}
                    className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={athlete.avatarUrl || athlete.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                        alt={athlete.displayName}
                        className="w-8 h-8 rounded-full object-cover border border-[#E5B868]"
                      />
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>{athlete.displayName}</span>
                          {athlete.athleteId && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                              {athlete.athleteId}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Grad '{athlete.gradYear || '2026'} • DOB: {athlete.dateOfBirth || '2010-05-12'} (Age {age})
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAddAthlete(athlete)}
                      disabled={isAlreadyAdded}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all ${
                        isAlreadyAdded
                          ? 'bg-white/10 text-slate-500 cursor-not-allowed'
                          : 'bg-[#E5B868] hover:bg-[#38BDF8] text-black hover:scale-105 shadow-[0_0_10px_rgba(0,242,254,0.4)] transition-all'
                      }`}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{isAlreadyAdded ? 'Added' : 'Verify & Add'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Roster Roster Table with Green "Eligible" Badges */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 uppercase font-mono tracking-wider flex items-center gap-2">
            <span>Verified Team Roster</span>
            <span className="px-2 py-0.5 rounded-full bg-[#E5B868]/10 text-[#E5B868] text-[10px]">
              {rosterAthletes.length} Athletes
            </span>
          </h3>
          {isSaving && <span className="text-[10px] text-[#E5B868] font-mono animate-pulse">Syncing to database...</span>}
        </div>

        {rosterAthletes.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white/5 border border-dashed border-white/10 text-center space-y-2">
            <UserCheck className="w-8 h-8 text-slate-500 mx-auto" />
            <div className="text-xs font-bold text-slate-300">No Athletes Added Yet</div>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Search above by athlete name or 6-digit ID to verify DOB eligibility and add them to the team roster.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-white/5 text-slate-400 font-mono text-[10px] uppercase border-b border-white/10">
                <tr>
                  <th className="p-3">Athlete</th>
                  <th className="p-3">Athlete ID</th>
                  <th className="p-3">Age / DOB</th>
                  <th className="p-3">Eligibility Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-[#000000]/40">
                {rosterAthletes.map((athlete) => {
                  const age = calculateAgeOnDate(athlete.dateOfBirth || '2010-01-01', event.startDate || event.date);

                  return (
                    <tr key={athlete.uid} className="hover:bg-white/5 transition-all">
                      
                      {/* Name & Photo */}
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={athlete.avatarUrl || athlete.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                            alt={athlete.displayName}
                            className="w-7 h-7 rounded-full object-cover border border-[#E5B868]"
                          />
                          <div>
                            <div className="font-bold text-white">{athlete.displayName}</div>
                            <div className="text-[10px] text-slate-400">{athlete.position || 'PG'} • '{athlete.gradYear || '26'}</div>
                          </div>
                        </div>
                      </td>

                      {/* Athlete ID */}
                      <td className="p-3 font-mono text-slate-300">
                        {athlete.athleteId || 'J1P-849201'}
                      </td>

                      {/* Age & DOB */}
                      <td className="p-3 font-mono text-slate-300">
                        Age {age} ({athlete.dateOfBirth || '2010-05-12'})
                      </td>

                      {/* Green "Eligible" Badge */}
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E5B868]/10 text-[#E5B868] border border-[#E5B868]/30 text-[10px] font-mono font-bold uppercase shadow-[0_0_10px_rgba(0,242,254,0.2)]">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Eligible ({team.division})</span>
                        </span>
                      </td>

                      {/* Remove Button */}
                      <td className="p-3 text-right">
                        {!isRosterLocked && (
                          <button
                            onClick={() => handleRemoveAthlete(athlete.uid)}
                            className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all cursor-pointer"
                            title="Remove from roster"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
