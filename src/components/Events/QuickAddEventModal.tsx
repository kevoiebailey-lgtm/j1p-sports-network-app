import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { EventItem, Tournament, SportType } from '../../types';
import { SPORTS_CATEGORIES } from '../../lib/sports';
import { US_STATES, POPULAR_COUNTRIES } from '../../lib/locationData';
import { useAuth } from '../../context/AuthContext';
import { 
  Plus, 
  X, 
  Sparkles, 
  Trophy, 
  Calendar, 
  MapPin, 
  DollarSign, 
  Users, 
  Tag, 
  Layers, 
  CheckCircle2, 
  Globe, 
  Clock, 
  ShieldCheck,
  Zap,
  ArrowRight,
  Info
} from 'lucide-react';

export type QuickAddMode = 'regular' | 'tournament';

interface QuickAddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: QuickAddMode;
  onCreateEvent: (newEvent: Omit<EventItem, 'id'>) => void;
  onCreateTournament: (tournament: Omit<Tournament, 'id' | 'createdAt'>) => void;
  onNavigateToTab?: (tab: 'Events Central' | 'Tournaments' | 'Interactive Brackets') => void;
}

const PRESET_BANNERS = [
  { label: 'Basketball Arena', url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&auto=format&fit=crop&q=80' },
  { label: 'Turf Stadium', url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&auto=format&fit=crop&q=80' },
  { label: 'Athletic Combine', url: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=1200&auto=format&fit=crop&q=80' },
  { label: 'Training Center', url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&auto=format&fit=crop&q=80' }
];

const DEFAULT_DIVISIONS = ['8U', '10U', '12U', '14U', '15U', '16U', '17U', 'Varsity'];
const ALL_AVAILABLE_SPORTS = SPORTS_CATEGORIES.flatMap(cat => cat.sports);

export const QuickAddEventModal: React.FC<QuickAddEventModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'regular',
  onCreateEvent,
  onCreateTournament,
  onNavigateToTab
}) => {
  const { user, profile } = useAuth();
  const [activeMode, setActiveMode] = useState<QuickAddMode>(initialMode);

  // ===================== REGULAR EVENT STATE =====================
  const [regTitle, setRegTitle] = useState('');
  const [regSport, setRegSport] = useState<SportType>('Basketball');
  const [regEventType, setRegEventType] = useState<'Standalone Event' | 'Plaza' | 'Combine' | 'Showcase' | 'Clinic' | 'Tryout'>('Showcase');
  const [regDate, setRegDate] = useState('2026-08-20');
  const [regTime, setRegTime] = useState('06:00 PM - 09:00 PM');
  const [regLocation, setRegLocation] = useState('Just1Play Athletic Center');
  const [regState, setRegState] = useState('NJ');
  const [regCountry, setRegCountry] = useState('United States');
  const [regIsFree, setRegIsFree] = useState(true);
  const [regPrice, setRegPrice] = useState<number | string>(0);
  const [regCapacity, setRegCapacity] = useState<number | string>(100);
  const [regDescription, setRegDescription] = useState('');
  const [regBannerUrl, setRegBannerUrl] = useState(PRESET_BANNERS[0].url);

  // ===================== TOURNAMENT STATE =====================
  const [tournName, setTournName] = useState('');
  const [tournSport, setTournSport] = useState<SportType>('Basketball');
  const [tournStartDate, setTournStartDate] = useState('2026-08-22');
  const [tournEndDate, setTournEndDate] = useState('2026-08-24');
  const [tournVenue, setTournVenue] = useState('Just1Play Arena');
  const [tournFormat, setTournFormat] = useState<'Single Elimination' | 'Pool Play'>('Single Elimination');
  const [tournMaxTeams, setTournMaxTeams] = useState<number | string>(16);
  const [tournHasFee, setTournHasFee] = useState(false);
  const [tournTeamFee, setTournTeamFee] = useState<number | string>(0);
  const [tournSelectedDivisions, setTournSelectedDivisions] = useState<string[]>(['12U', '14U', '17U', 'Varsity']);
  const [tournDescription, setTournDescription] = useState('');
  const [tournTeamsInput, setTournTeamsInput] = useState('Vipers Elite, Tri-State Ballers, Apex Hoops, Metro Thunder, City Hawks, Jersey Knights, Prodigy Academy, Empire Select');

  if (!isOpen) return null;

  const toggleDivision = (div: string) => {
    if (tournSelectedDivisions.includes(div)) {
      setTournSelectedDivisions(tournSelectedDivisions.filter(d => d !== div));
    } else {
      setTournSelectedDivisions([...tournSelectedDivisions, div]);
    }
  };

  const handleRegularSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regTitle.trim()) return;

    onCreateEvent({
      title: regTitle.trim(),
      sport: regSport,
      eventType: regEventType,
      date: regDate,
      time: regTime,
      location: regLocation.trim() || 'Just1Play Athletic Center',
      state: regState,
      country: regCountry,
      description: regDescription.trim() || `Official Just1Play ${regEventType} featuring digital check-ins, media coverage, and live analytics.`,
      organizer: profile?.displayName || user?.displayName || 'Just1Play Events Team',
      creatorUid: user?.uid,
      createdBy: user?.uid,
      capacity: Number(regCapacity) || 100,
      registeredUserIds: user ? [user.uid] : [],
      price: regIsFree ? 0 : Number(regPrice) || 0,
      bannerUrl: regBannerUrl,
      isFeatured: true
    });

    onClose();
    if (onNavigateToTab) {
      onNavigateToTab('Events Central');
    }
  };

  const handleTournamentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournName.trim()) return;

    const parsedTeams = tournTeamsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const fallbackTeams = [
      'Team Alpha', 'Team Bravo', 'Team Charlie', 'Team Delta',
      'Team Echo', 'Team Foxtrot', 'Team Golf', 'Team Hotel'
    ];

    const finalTeams = parsedTeams.length >= 2 ? parsedTeams : fallbackTeams;

    onCreateTournament({
      name: tournName.trim(),
      sport: tournSport,
      startDate: tournStartDate,
      endDate: tournEndDate,
      venueName: tournVenue.trim() || 'Just1Play Arena',
      format: tournFormat,
      status: 'Upcoming',
      participatingTeams: finalTeams
    });

    onClose();
    if (onNavigateToTab) {
      onNavigateToTab('Interactive Brackets');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-3xl bg-[#182228] border-2 border-[#00F2FE]/50 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(0,242,254,0.25)] text-white max-h-[92vh] overflow-y-auto"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest bg-[#00F2FE] text-slate-950 rounded-full font-mono">
                  Quick Event Creator
                </span>
                <span className="text-xs text-slate-400 font-mono">Just1Play Event Engine</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black italic uppercase tracking-wide text-white">
                CREATE <span className="text-[#00F2FE]">EVENT OR TOURNAMENT</span>
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Switcher Toggle */}
          <div className="mt-5 p-1.5 bg-[#212A31] rounded-2xl border border-slate-700 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setActiveMode('regular')}
              className={`py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeMode === 'regular'
                  ? 'bg-[#00F2FE] text-slate-950 shadow-[0_0_20px_rgba(0,242,254,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>1. Regular Event / Showcase</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('tournament')}
              className={`py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeMode === 'tournament'
                  ? 'bg-[#E5B868] text-slate-950 shadow-[0_0_20px_rgba(229,184,104,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>2. Tournament & Bracket</span>
            </button>
          </div>

          {/* Mode 1: Regular Event Form */}
          {activeMode === 'regular' && (
            <form onSubmit={handleRegularSubmit} className="mt-6 space-y-5">
              <div className="p-3.5 bg-[#00F2FE]/10 border border-[#00F2FE]/30 rounded-2xl flex items-center gap-3 text-xs text-cyan-200">
                <Info className="w-4 h-4 text-[#00F2FE] shrink-0" />
                <span>
                  <strong>Regular Event Mode:</strong> Perfect for standalone games, community plazas, combines, showcases, clinics, tryouts, and open runs with instant QR ticketing.
                </span>
              </div>

              {/* Title & Type */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={regTitle}
                    onChange={(e) => setRegTitle(e.target.value)}
                    placeholder="e.g., Tri-State Summer Elite Showcase 2026"
                    className="w-full px-4 py-3 bg-[#212A31] border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00F2FE] transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                    Event Category
                  </label>
                  <select
                    value={regEventType}
                    onChange={(e) => setRegEventType(e.target.value as any)}
                    className="w-full px-4 py-3 bg-[#212A31] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-[#00F2FE]"
                  >
                    <option value="Showcase">Showcase</option>
                    <option value="Combine">Combine & Testing</option>
                    <option value="Clinic">Clinic & Camp</option>
                    <option value="Tryout">Tryout</option>
                    <option value="Plaza">Community Plaza</option>
                    <option value="Standalone Event">Standalone Game</option>
                  </select>
                </div>
              </div>

              {/* Sport, Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                    Sport
                  </label>
                  <select
                    value={regSport}
                    onChange={(e) => setRegSport(e.target.value as SportType)}
                    className="w-full px-4 py-3 bg-[#212A31] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-[#00F2FE]"
                  >
                    {ALL_AVAILABLE_SPORTS.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.emoji} {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                    Event Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={regDate}
                    onChange={(e) => setRegDate(e.target.value)}
                    className="w-full px-4 py-3 bg-[#212A31] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-[#00F2FE]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                    Time Window
                  </label>
                  <input
                    type="text"
                    value={regTime}
                    onChange={(e) => setRegTime(e.target.value)}
                    placeholder="06:00 PM - 09:00 PM"
                    className="w-full px-4 py-3 bg-[#212A31] border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00F2FE]"
                  />
                </div>
              </div>

              {/* Location & State */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                    Venue Location / Facility
                  </label>
                  <input
                    type="text"
                    value={regLocation}
                    onChange={(e) => setRegLocation(e.target.value)}
                    placeholder="e.g., Just1Play Athletic Center, Newark"
                    className="w-full px-4 py-3 bg-[#212A31] border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00F2FE]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                    State / Region
                  </label>
                  <select
                    value={regState}
                    onChange={(e) => setRegState(e.target.value)}
                    className="w-full px-4 py-3 bg-[#212A31] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-[#00F2FE]"
                  >
                    {US_STATES.map((st) => (
                      <option key={st.code} value={st.code}>
                        {st.name} ({st.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pricing & Capacity */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                    Admission Type
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { setRegIsFree(true); setRegPrice(0); }}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
                        regIsFree
                          ? 'bg-[#00F2FE] text-slate-950 font-black'
                          : 'bg-[#212A31] text-slate-400 border border-slate-700'
                      }`}
                    >
                      Free
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegIsFree(false)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
                        !regIsFree
                          ? 'bg-[#00F2FE] text-slate-950 font-black'
                          : 'bg-[#212A31] text-slate-400 border border-slate-700'
                      }`}
                    >
                      Paid Pass
                    </button>
                  </div>
                </div>

                {!regIsFree && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                      Entry Ticket Price ($)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={regPrice}
                      onChange={(e) => setRegPrice(e.target.value)}
                      placeholder="25"
                      className="w-full px-4 py-3 bg-[#212A31] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-[#00F2FE]"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                    Capacity Limit
                  </label>
                  <input
                    type="number"
                    min={5}
                    value={regCapacity}
                    onChange={(e) => setRegCapacity(e.target.value)}
                    placeholder="100"
                    className="w-full px-4 py-3 bg-[#212A31] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-[#00F2FE]"
                  />
                </div>
              </div>

              {/* Banner Presets */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                  Select Theme Banner
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PRESET_BANNERS.map((b) => (
                    <div
                      key={b.label}
                      onClick={() => setRegBannerUrl(b.url)}
                      className={`relative h-16 rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                        regBannerUrl === b.url
                          ? 'border-[#00F2FE] shadow-[0_0_15px_rgba(0,242,254,0.5)] scale-102'
                          : 'border-slate-700 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={b.url} alt={b.label} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-1 text-center">
                        <span className="text-[10px] font-bold text-white uppercase">{b.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                  Description & Notes
                </label>
                <textarea
                  rows={2}
                  value={regDescription}
                  onChange={(e) => setRegDescription(e.target.value)}
                  placeholder="Provide schedule details, what athletes should bring, and scout attendance..."
                  className="w-full px-4 py-2.5 bg-[#212A31] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00F2FE]"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-700 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="flex-1 py-3.5 px-6 rounded-2xl bg-[#00F2FE] hover:bg-[#38BDF8] text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,242,254,0.4)] transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 stroke-[2.5]" />
                  <span>PUBLISH REGULAR EVENT</span>
                </button>
              </div>
            </form>
          )}

          {/* Mode 2: Tournament Form */}
          {activeMode === 'tournament' && (
            <form onSubmit={handleTournamentSubmit} className="mt-6 space-y-5">
              <div className="p-3.5 bg-[#E5B868]/10 border border-[#E5B868]/30 rounded-2xl flex items-center gap-3 text-xs text-amber-200">
                <Trophy className="w-4 h-4 text-[#E5B868] shrink-0" />
                <span>
                  <strong>Tournament Mode:</strong> Generates multi-round championship brackets, seedings, game schedules, and referee scorekeeper consoles.
                </span>
              </div>

              {/* Name, Sport & Format */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                    Tournament Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={tournName}
                    onChange={(e) => setTournName(e.target.value)}
                    placeholder="e.g., East Coast Summer Hoop Clash 2026"
                    className="w-full px-4 py-3 bg-[#212A31] border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#E5B868]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                    Tournament Format
                  </label>
                  <select
                    value={tournFormat}
                    onChange={(e) => setTournFormat(e.target.value as any)}
                    className="w-full px-4 py-3 bg-[#212A31] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-[#E5B868]"
                  >
                    <option value="Single Elimination">Single Elimination</option>
                    <option value="Pool Play">Pool Play into Bracket</option>
                  </select>
                </div>
              </div>

              {/* Sport, Start Date & End Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                    Sport
                  </label>
                  <select
                    value={tournSport}
                    onChange={(e) => setTournSport(e.target.value as SportType)}
                    className="w-full px-4 py-3 bg-[#212A31] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-[#E5B868]"
                  >
                    {ALL_AVAILABLE_SPORTS.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.emoji} {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={tournStartDate}
                    onChange={(e) => setTournStartDate(e.target.value)}
                    className="w-full px-4 py-3 bg-[#212A31] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-[#E5B868]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={tournEndDate}
                    onChange={(e) => setTournEndDate(e.target.value)}
                    className="w-full px-4 py-3 bg-[#212A31] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-[#E5B868]"
                  />
                </div>
              </div>

              {/* Venue & Capacity */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                    Venue Facility & Location
                  </label>
                  <input
                    type="text"
                    value={tournVenue}
                    onChange={(e) => setTournVenue(e.target.value)}
                    placeholder="e.g., Just1Play Arena (4 Courts), Newark NJ"
                    className="w-full px-4 py-3 bg-[#212A31] border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#E5B868]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                    Max Teams
                  </label>
                  <input
                    type="number"
                    min={4}
                    max={64}
                    value={tournMaxTeams}
                    onChange={(e) => setTournMaxTeams(e.target.value)}
                    placeholder="16"
                    className="w-full px-4 py-3 bg-[#212A31] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-[#E5B868]"
                  />
                </div>
              </div>

              {/* Divisions Picker */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                  Participating Divisions
                </label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_DIVISIONS.map((div) => {
                    const isSelected = tournSelectedDivisions.includes(div);
                    return (
                      <button
                        type="button"
                        key={div}
                        onClick={() => toggleDivision(div)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-[#E5B868] text-slate-950 border-[#E5B868] shadow-[0_0_10px_rgba(229,184,104,0.3)]'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        {div}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seeded Teams Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                  Initial Registered Teams (Comma-separated for auto-bracket seeding)
                </label>
                <textarea
                  rows={2}
                  value={tournTeamsInput}
                  onChange={(e) => setTournTeamsInput(e.target.value)}
                  placeholder="Team Alpha, Team Bravo, Team Charlie, Team Delta..."
                  className="w-full px-4 py-2.5 bg-[#212A31] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#E5B868]"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-700 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="flex-1 py-3.5 px-6 rounded-2xl bg-[#E5B868] hover:bg-[#F59E0B] text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(229,184,104,0.4)] transition-all cursor-pointer"
                >
                  <Trophy className="w-4 h-4 stroke-[2.5]" />
                  <span>CREATE TOURNAMENT & GENERATE BRACKET</span>
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
