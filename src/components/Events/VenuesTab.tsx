import React, { useState } from 'react';
import { Venue } from '../../types';
import { BentoCard } from '../BentoCard';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Building2, 
  Plus, 
  Layers, 
  Navigation, 
  CheckCircle2,
  Search,
  Edit3,
  Trash2
} from 'lucide-react';

interface VenuesTabProps {
  venues: Venue[];
  onCreateVenue: (venue: Omit<Venue, 'id'>) => void;
  onEditVenue?: (venue: Venue) => void;
  onDeleteVenue?: (venueId: string) => void;
  canManage: boolean;
}

export const VenuesTab: React.FC<VenuesTabProps> = ({
  venues,
  onCreateVenue,
  onEditVenue,
  onDeleteVenue,
  canManage
}) => {
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const [deletingVenueId, setDeletingVenueId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form State
  const [facilityName, setFacilityName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('East Rutherford');
  const [state, setState] = useState('NJ');
  const [subLocationsInput, setSubLocationsInput] = useState('Court A (Main), Court B, Court C, Outdoor Field 1');

  const filteredVenues = venues.filter(v => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return `${v.facilityName} ${v.address} ${v.city} ${v.state}`.toLowerCase().includes(q);
  });

  const handleOpenEdit = (v: Venue) => {
    setEditingVenue(v);
    setFacilityName(v.facilityName);
    setAddress(v.address);
    setCity(v.city);
    setState(v.state);
    setSubLocationsInput(v.subLocations.join(', '));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityName.trim()) return;

    const subLocs = subLocationsInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const subLocationsList = subLocs.length > 0 ? subLocs : ['Court A', 'Court B'];

    if (editingVenue) {
      if (onEditVenue) {
        onEditVenue({
          ...editingVenue,
          facilityName,
          address,
          city,
          state,
          subLocations: subLocationsList
        });
      }
      setEditingVenue(null);
    } else {
      onCreateVenue({
        facilityName,
        address,
        city,
        state,
        subLocations: subLocationsList
      });
      setShowAddModal(false);
    }

    setFacilityName('');
  };

  const handleDelete = (id: string) => {
    if (onDeleteVenue) {
      onDeleteVenue(id);
    }
    setDeletingVenueId(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search venue database by facility name, city, or address..."
            className="w-full pl-10 pr-4 py-2 bg-[#212A31] border border-white/15 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#E5B868]"
          />
        </div>

        {canManage && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-[#E5B868] hover:bg-[#38BDF8] text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(0,242,254,0.5)] flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>ADD NEW VENUE FACILITY</span>
          </button>
        )}
      </div>

      {/* Venues Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVenues.map((v) => (
          <BentoCard key={v.id} glow className="flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-[#E5B868]/10 text-[#E5B868] rounded-2xl border border-[#E5B868]/30 shrink-0">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white uppercase leading-tight">
                      {v.facilityName}
                    </h3>
                    <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-[#E5B868]" />
                      {v.city}, {v.state}
                    </span>
                  </div>
                </div>

                {canManage && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(v)}
                      className="p-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-[#E5B868] border border-white/10 rounded-xl transition-all"
                      title="Edit Venue Facility"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingVenueId(v.id)}
                      className="p-2 bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-white/10 rounded-xl transition-all"
                      title="Delete Venue"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-xs text-slate-300 mb-4 font-mono">
                <p className="text-slate-400 text-[10px] uppercase font-bold mb-1">Full Street Address:</p>
                <p>{v.address}, {v.city}, {v.state}</p>
              </div>

              {/* Sub-locations pills */}
              <div className="space-y-2 mb-4">
                <span className="text-[10px] font-black uppercase text-[#E5B868] tracking-wider block">
                  ASSIGNED FIELDS & COURTS ({v.subLocations.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {v.subLocations.map((sub, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 text-[10px] font-mono font-bold bg-white/5 text-slate-200 border border-white/15 rounded-lg"
                    >
                      {sub}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(`${v.facilityName} ${v.address} ${v.city} ${v.state}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-white/15 flex items-center justify-center gap-2"
            >
              <Navigation className="w-3.5 h-3.5 text-[#E5B868]" />
              <span>GET DIRECTIONS ON MAP</span>
            </a>
          </BentoCard>
        ))}
      </div>

      {/* ADD OR EDIT VENUE MODAL */}
      <AnimatePresence>
        {(showAddModal || editingVenue) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#212A31]/80 backdrop-blur-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-[#000000] border border-white/20 rounded-3xl p-6 shadow-2xl text-white space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-black uppercase text-[#E5B868] flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  {editingVenue ? 'EDIT VENUE FACILITY' : 'ADD VENUE & SPORTS FACILITY'}
                </span>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingVenue(null);
                  }}
                  className="p-1 rounded-full bg-white/5 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Facility Name</label>
                  <input
                    type="text"
                    required
                    value={facilityName}
                    onChange={(e) => setFacilityName(e.target.value)}
                    placeholder="e.g. 'Iron Peak Sports Complex'"
                    className="w-full bg-[#212A31] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#E5B868] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Street Address</label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. '137 Mountain View Rd'"
                    className="w-full bg-[#212A31] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#E5B868] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">City</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full bg-[#212A31] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#E5B868] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">State</label>
                    <input
                      type="text"
                      required
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full bg-[#212A31] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#E5B868] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Courts & Fields (Comma Separated)
                  </label>
                  <input
                    type="text"
                    value={subLocationsInput}
                    onChange={(e) => setSubLocationsInput(e.target.value)}
                    placeholder="Court A (Main), Court B, Field 1 (Turf)..."
                    className="w-full bg-[#212A31] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#E5B868] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#E5B868] hover:bg-[#38BDF8] text-black font-black text-xs uppercase tracking-wider rounded-2xl shadow-[0_0_20px_rgba(0,242,254,0.5)] transition-all mt-2"
                >
                  {editingVenue ? 'UPDATE VENUE IN DATABASE' : 'SAVE VENUE TO DATABASE'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {deletingVenueId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#212A31]/80 backdrop-blur-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-[#000000] border border-rose-500/40 rounded-3xl p-6 shadow-2xl text-white space-y-4"
            >
              <div className="flex items-center gap-2 text-rose-400 font-black text-xs uppercase">
                <Trash2 className="w-5 h-5" />
                <span>CONFIRM VENUE DELETION</span>
              </div>
              <p className="text-xs text-slate-300">
                Are you sure you want to remove this venue from the database? Assigned games may need location updates.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setDeletingVenueId(null)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl"
                >
                  CANCEL
                </button>
                <button
                  onClick={() => handleDelete(deletingVenueId)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase rounded-xl shadow-[0_0_15px_rgba(225,29,72,0.4)]"
                >
                  DELETE VENUE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
