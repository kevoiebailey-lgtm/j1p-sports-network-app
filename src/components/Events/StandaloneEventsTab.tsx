import React, { useState } from 'react';
import { EventItem, SportType } from '../../types';
import { SPORTS_CATEGORIES } from '../../lib/sports';
import { US_STATES, POPULAR_COUNTRIES } from '../../lib/locationData';
import { BentoCard } from '../BentoCard';
import { useAuth } from '../../context/AuthContext';
import { QrCodeDisplay } from '../Common/QrCodeDisplay';
import { EventShareCardModal } from './EventShareCardModal';
import { motion, AnimatePresence } from 'framer-motion';
import { compressImage } from '../../lib/imageCompressor';
import { downloadIcsCalendarEvent, getGoogleCalendarWebUrl } from '../../lib/googleCalendarService';
import { 
  Plus, 
  Calendar, 
  MapPin, 
  Users, 
  Ticket, 
  Sparkles, 
  Filter, 
  Search, 
  Building2, 
  Zap, 
  CheckCircle2, 
  QrCode, 
  Flame, 
  ShieldCheck, 
  Clock, 
  X, 
  DollarSign, 
  Layers, 
  Globe,
  Radio,
  Tag,
  Share2,
  ChevronRight,
  Info,
  Edit3,
  Trash2,
  AlertTriangle,
  Upload,
  Image as ImageIcon,
  Download,
  CalendarPlus
} from 'lucide-react';

interface StandaloneEventsTabProps {
  events: EventItem[];
  onCreateEvent: (newEvent: Omit<EventItem, 'id'>) => void;
  onEditEvent?: (updatedEvent: EventItem) => void;
  onDeleteEvent?: (eventId: string) => void;
  onRegisterEvent: (eventId: string) => void;
  canManage: boolean;
}

export type EventCategoryFilter = 
  | 'All' 
  | 'Standalone Event' 
  | 'Plaza' 
  | 'Combine' 
  | 'Showcase' 
  | 'Clinic' 
  | 'Tryout' 
  | 'Camp' 
  | 'Community';

const EVENT_CONTAINER_VARIANTS = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.06,
    },
  },
};

const EVENT_CARD_VARIANTS = {
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

export const StandaloneEventsTab: React.FC<StandaloneEventsTabProps> = ({
  events,
  onCreateEvent,
  onEditEvent,
  onDeleteEvent,
  onRegisterEvent,
  canManage
}) => {
  const { user, profile } = useAuth();

  // Filters state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<EventCategoryFilter>('All');
  const [selectedSport, setSelectedSport] = useState<string>('All');
  const [selectedState, setSelectedState] = useState<string>('All');

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [selectedDetailEvent, setSelectedDetailEvent] = useState<EventItem | null>(null);
  const [qrPassEvent, setQrPassEvent] = useState<EventItem | null>(null);
  const [shareModalEvent, setShareModalEvent] = useState<EventItem | null>(null);

  // Edit Event Modal State
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSport, setEditSport] = useState<SportType | 'All Sports'>('All Sports');
  const [editEventType, setEditEventType] = useState<EventItem['eventType']>('Showcase');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editState, setEditState] = useState('NJ');
  const [editCustomState, setEditCustomState] = useState('');
  const [editCountry, setEditCountry] = useState('United States');
  const [editCustomCountry, setEditCustomCountry] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCapacity, setEditCapacity] = useState<number>(100);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editOrganizer, setEditOrganizer] = useState('');
  const [editBannerUrl, setEditBannerUrl] = useState('');
  const [editIsFeatured, setEditIsFeatured] = useState<boolean>(false);

  // Delete Confirmation Modal State
  const [deletingEvent, setDeletingEvent] = useState<EventItem | null>(null);

  // New Standalone Event Form State
  const [title, setTitle] = useState('');
  const [sport, setSport] = useState<SportType | 'All Sports'>('All Sports');
  const [eventType, setEventType] = useState<EventItem['eventType']>('Showcase');
  const [date, setDate] = useState('2026-08-25');
  const [time, setTime] = useState('05:00 PM - 09:00 PM');
  const [location, setLocation] = useState('Tri-State Athletic Plaza & Performance Turf');
  const [state, setState] = useState('NJ');
  const [customState, setCustomState] = useState('');
  const [country, setCountry] = useState('United States');
  const [customCountry, setCustomCountry] = useState('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState<number>(100);
  const [price, setPrice] = useState<number>(0);
  const [organizer, setOrganizer] = useState(profile?.displayName || 'Just1Play Event Media');
  const [bannerUrl, setBannerUrl] = useState('https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80');
  const [isFeatured, setIsFeatured] = useState<boolean>(true);

  // Preset Banners for quick selection
  const PRESET_BANNERS = [
    { label: 'Stadium / Turf', url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80' },
    { label: 'Basketball Court', url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80' },
    { label: 'Plaza Festival', url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&auto=format&fit=crop&q=80' },
    { label: 'Combine Athletics', url: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=800&auto=format&fit=crop&q=80' },
  ];

  // File Upload Helper for Banner Image
  const handleBannerFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEditMode = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, { maxWidth: 1200, maxHeight: 600, quality: 0.82 });
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        if (isEditMode) {
          setEditBannerUrl(result);
        } else {
          setBannerUrl(result);
        }
      };
      reader.readAsDataURL(compressed);
    } catch (err) {
      console.warn('Banner compression fallback:', err);
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        if (isEditMode) {
          setEditBannerUrl(result);
        } else {
          setBannerUrl(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Filter Logic
  const filteredEvents = events.filter((e) => {
    if (selectedType !== 'All' && e.eventType !== selectedType) return false;
    if (selectedSport !== 'All' && e.sport !== selectedSport) return false;
    if (selectedState !== 'All' && e.state !== selectedState) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const text = `${e.title} ${e.description} ${e.location} ${e.organizer} ${e.eventType} ${e.state} ${e.country || ''}`.toLowerCase();
      if (!text.includes(q)) return false;
    }
    return true;
  });

  const handleSubmitNewEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const finalState = state === 'CUSTOM' ? (customState.trim() || 'NJ') : state;
    const finalCountry = country === 'Other / Custom Country' ? (customCountry.trim() || 'United States') : country;

    onCreateEvent({
      title: title.trim(),
      sport,
      eventType,
      date,
      time,
      location: location.trim(),
      state: finalState,
      country: finalCountry,
      description: description.trim() || 'Join us for an official Just1Play event featuring high-definition media coverage, digital QR gate pass check-ins, and athletic evaluations.',
      organizer: organizer.trim() || profile?.displayName || 'Just1Play Event Organizer',
      creatorUid: user?.uid,
      createdBy: user?.uid,
      capacity: Number(capacity) || 100,
      registeredUserIds: user ? [user.uid] : [],
      price: Number(price) || 0,
      bannerUrl: bannerUrl || PRESET_BANNERS[0].url,
      isFeatured
    });

    // Reset Form
    setTitle('');
    setDescription('');
    setCustomState('');
    setCustomCountry('');
    setShowCreateModal(false);
  };

  const handleOpenEdit = (evt: EventItem) => {
    setEditingEvent(evt);
    setEditTitle(evt.title || evt.name || '');
    setEditSport(evt.sport);
    setEditEventType(evt.eventType);
    setEditDate(evt.date || evt.startDate || '');
    setEditTime(evt.time || '05:00 PM - 09:00 PM');
    setEditLocation(evt.location || '');

    // State check
    const isKnownState = US_STATES.some(s => s.code === evt.state || s.name === evt.state);
    if (isKnownState) {
      setEditState(evt.state);
      setEditCustomState('');
    } else {
      setEditState('CUSTOM');
      setEditCustomState(evt.state || '');
    }

    // Country check
    const currentCountry = evt.country || 'United States';
    const isKnownCountry = POPULAR_COUNTRIES.includes(currentCountry);
    if (isKnownCountry) {
      setEditCountry(currentCountry);
      setEditCustomCountry('');
    } else {
      setEditCountry('Other / Custom Country');
      setEditCustomCountry(currentCountry);
    }

    setEditDescription(evt.description || '');
    setEditCapacity(evt.capacity || 100);
    setEditPrice(evt.price || 0);
    setEditOrganizer(evt.organizer || '');
    setEditBannerUrl(evt.bannerUrl || PRESET_BANNERS[0].url);
    setEditIsFeatured(!!evt.isFeatured);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent || !editTitle.trim()) return;

    const finalEditState = editState === 'CUSTOM' ? (editCustomState.trim() || 'NJ') : editState;
    const finalEditCountry = editCountry === 'Other / Custom Country' ? (editCustomCountry.trim() || 'United States') : editCountry;

    const updated: EventItem = {
      ...editingEvent,
      title: editTitle.trim(),
      name: editTitle.trim(),
      sport: editSport,
      eventType: editEventType,
      date: editDate,
      time: editTime,
      location: editLocation.trim(),
      state: finalEditState,
      country: finalEditCountry,
      description: editDescription.trim(),
      capacity: Number(editCapacity) || 100,
      price: Number(editPrice) || 0,
      organizer: editOrganizer.trim() || 'Just1Play Event Host',
      bannerUrl: editBannerUrl || PRESET_BANNERS[0].url,
      isFeatured: editIsFeatured
    };

    if (onEditEvent) {
      onEditEvent(updated);
    }

    setEditingEvent(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingEvent) return;
    if (onDeleteEvent) {
      onDeleteEvent(deletingEvent.id);
    }
    setDeletingEvent(null);
    setSelectedDetailEvent(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Event Creation Central Header Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-[#050505] border border-white/10 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00F2FE]/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-[#00F2FE] text-black rounded-sm shadow-[0_0_12px_rgba(0,242,254,0.6)]">
                EVENT CREATION CENTRAL
              </span>
              <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-slate-600 text-white rounded-sm font-mono">
                PLAZAS • COMBINES • STANDALONE EVENTS
              </span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black italic tracking-tight text-white uppercase font-sans">
              REGULAR & STANDALONE EVENT CENTRAL<span className="text-[#00F2FE]">.</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1 max-w-2xl">
              Host and join standalone games, community plazas, combines, showcases, clinics, and open training sessions with instant QR pass registration.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-3 bg-[#00F2FE] hover:bg-[#38BDF8] text-black font-black text-xs uppercase tracking-wider rounded-2xl shadow-[0_0_20px_rgba(0,242,254,0.5)] transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>CREATE STANDALONE EVENT</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search & Multi-Filter Control Bar */}
      <div className="bg-white/[0.03] p-4 rounded-3xl border border-white/10 backdrop-blur-2xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search standalone events by title, organizer, plaza location, or city..."
              className="w-full pl-10 pr-10 py-2.5 bg-[#121212] border border-white/15 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00F2FE] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Create Action Button (Mobile/Secondary) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 bg-[#00F2FE] hover:bg-[#38BDF8] text-black font-black text-xs uppercase tracking-wider rounded-2xl shadow-[0_0_15px_rgba(0,242,254,0.5)] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>NEW EVENT</span>
            </button>
          </div>
        </div>

        {/* Category Pills & Dropdown Selectors */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10 text-xs">
          
          {/* Event Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <span className="text-[10px] font-black uppercase text-slate-400 font-mono flex items-center gap-1 mr-1 shrink-0">
              <Tag className="w-3 h-3 text-[#00F2FE]" /> TYPE:
            </span>
            {[
              'All', 
              'Standalone Event', 
              'Plaza', 
              'Combine', 
              'Showcase', 
              'Clinic', 
              'Tryout', 
              'Camp', 
              'Community'
            ].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type as EventCategoryFilter)}
                className={`px-3 py-1 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap border cursor-pointer ${
                  selectedType === type
                    ? 'bg-[#00F2FE] text-black border-[#00F2FE] shadow-[0_0_12px_rgba(0,242,254,0.4)]'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                }`}
              >
                {type === 'All' ? 'ALL CATEGORIES' : type.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Sport & State Selectors */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Sport Filter */}
            <select
              value={selectedSport}
              onChange={(e) => setSelectedSport(e.target.value)}
              className="bg-[#121212] border border-white/15 rounded-xl px-3 py-1 text-xs text-white focus:border-[#00F2FE] focus:outline-none"
            >
              <option value="All">🏆 All Sports</option>
              <option value="All Sports">Multi-Sport / All</option>
              {SPORTS_CATEGORIES.map((cat) => (
                <optgroup key={cat.name} label={cat.name}>
                  {cat.sports.map((sp) => (
                    <option key={sp.name} value={sp.name}>
                      {sp.emoji} {sp.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>

            {/* State Filter */}
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="bg-[#121212] border border-white/15 rounded-xl px-3 py-1 text-xs text-white focus:border-[#00F2FE] focus:outline-none"
            >
              <option value="All">All States (US & Int'l)</option>
              {US_STATES.map((st) => (
                <option key={st.code} value={st.code}>
                  {st.name} ({st.code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Standalone Events Bento Grid with Staggered Entrance Animation */}
      <motion.div 
        variants={EVENT_CONTAINER_VARIANTS}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {filteredEvents.length === 0 ? (
          <div className="col-span-full p-8 sm:p-12 rounded-3xl bg-[#1E2630] border border-[#2D3748] text-center space-y-5 shadow-2xl relative overflow-hidden">
            <div className="w-16 h-16 rounded-2xl bg-[#F59E0B]/15 border border-[#F59E0B]/30 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(245,158,11,0.3)]">
              <Calendar className="w-8 h-8 text-[#F59E0B]" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-xl font-black text-white uppercase italic tracking-tight font-sans">
                Be the first to host or schedule an event in <span className="text-[#F59E0B] not-italic">{selectedSport === 'All' ? selectedType : selectedSport}</span>!
              </h3>
              <p className="text-xs text-[#94A3B8] font-sans font-medium leading-relaxed">
                No matching showcases or tournaments found with your current filters. Create a new event or clear filters to view all schedule dates.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {canManage && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#d98b06] text-slate-950 font-black font-mono text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>+ CREATE STANDALONE EVENT</span>
                </button>
              )}
              <button
                onClick={() => {
                  setSelectedType('All');
                  setSelectedSport('All');
                  setSelectedState('All');
                  setSearchQuery('');
                }}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#161C22] hover:bg-slate-800 text-slate-300 hover:text-white border border-[#2D3748] font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          </div>
        ) : (
          filteredEvents.map((evt) => {
            const isRegistered = user && evt.registeredUserIds.includes(user.uid);
            const isFree = evt.price === 0;

            const isCreator = Boolean(
              user && (
                (evt.creatorUid && evt.creatorUid === user.uid) ||
                (evt.createdBy && evt.createdBy === user.uid) ||
                (profile?.displayName && evt.organizer === profile.displayName) ||
                (user.email && evt.organizer === user.email)
              )
            );
            const canManageThisEvent = canManage || isCreator;

            return (
              <motion.div
                key={evt.id}
                variants={EVENT_CARD_VARIANTS}
                className="h-full"
              >
                <BentoCard
                  glow={evt.isFeatured}
                  className="flex flex-col justify-between overflow-hidden p-0 h-full"
                >
                <div>
                  {/* Banner Image Header */}
                  <div className="relative h-44 w-full overflow-hidden bg-black/50">
                    <img
                      src={evt.bannerUrl || PRESET_BANNERS[0].url}
                      alt={evt.title}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-md bg-black/80 text-[#00F2FE] border border-[#00F2FE]/40 backdrop-blur-md">
                          {evt.eventType}
                        </span>
                        {isCreator && (
                          <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md bg-[#00F2FE]/20 text-[#00F2FE] border border-[#00F2FE]/50 backdrop-blur-md">
                            YOUR EVENT
                          </span>
                        )}
                      </div>

                      <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md backdrop-blur-md ${
                        isFree 
                          ? 'bg-[#00F2FE] text-black font-mono shadow-[0_0_10px_rgba(0,242,254,0.6)]' 
                          : 'bg-slate-600 text-white font-mono'
                      }`}>
                        {isFree ? 'FREE ENTRY' : `$${evt.price}`}
                      </span>
                    </div>

                    {/* Title Overlay */}
                    <div className="absolute bottom-3 left-3 right-3">
                      <span className="text-[10px] font-mono font-bold text-[#00F2FE] uppercase block">
                        {evt.sport} • {evt.state}{evt.country && evt.country !== 'United States' ? ` (${evt.country})` : ''}
                      </span>
                      <h3 className="text-base font-black text-white uppercase tracking-tight line-clamp-2 drop-shadow-md">
                        {evt.title}
                      </h3>
                    </div>
                  </div>

                  {/* Card Details Body */}
                  <div className="p-5 space-y-3">
                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {evt.description}
                    </p>

                    <div className="space-y-1.5 text-xs text-slate-400 bg-white/5 p-3 rounded-2xl border border-white/10 font-mono">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Calendar className="w-3.5 h-3.5 text-[#00F2FE] shrink-0" />
                        <span>{evt.date} • {evt.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-[#00F2FE] shrink-0" />
                        <span className="truncate">{evt.location}, {evt.state}{evt.country ? `, ${evt.country}` : ''}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <Building2 className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                        <span className="truncate">Host: <strong className="text-white">{evt.organizer}</strong></span>
                      </div>
                    </div>

                    {/* Capacity Indicator */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono text-slate-400">
                        <span>CAPACITY:</span>
                        <span className="text-white font-bold">{evt.registeredUserIds.length} / {evt.capacity} REGISTERED</span>
                      </div>
                      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#00F2FE] h-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.round((evt.registeredUserIds.length / evt.capacity) * 100))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="p-5 pt-0 space-y-2">
                  {canManageThisEvent && (
                    <div className="grid grid-cols-2 gap-2 mb-1">
                      <button
                        onClick={() => handleOpenEdit(evt)}
                        className="py-2 px-3 bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[#00F2FE]" />
                        <span>EDIT</span>
                      </button>

                      <button
                        onClick={() => setDeletingEvent(evt)}
                        className="py-2 px-3 bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>DELETE</span>
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-4 gap-1.5">
                    {/* View Details Modal */}
                    <button
                      onClick={() => setSelectedDetailEvent(evt)}
                      className="py-2 px-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title="View Event Details"
                    >
                      <Info className="w-3.5 h-3.5 text-slate-300" />
                      <span>DETAILS</span>
                    </button>

                    {/* Show Digital QR Gate Pass */}
                    <button
                      onClick={() => setQrPassEvent(evt)}
                      className="py-2 px-1.5 bg-white/5 hover:bg-white/10 text-[#F59E0B] border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title="View QR Gate Pass"
                    >
                      <QrCode className="w-3.5 h-3.5 text-[#F59E0B]" />
                      <span>PASS</span>
                    </button>

                    {/* 1-Tap Direct Calendar Sync Dropdown/Action */}
                    <button
                      onClick={() => {
                        downloadIcsCalendarEvent({
                          id: evt.id,
                          title: evt.title,
                          sport: evt.sport,
                          date: evt.date,
                          startTime: evt.time,
                          venue: `${evt.location}, ${evt.state || 'NJ'}`,
                          description: evt.description
                        });
                      }}
                      className="py-2 px-1.5 bg-[#00F2FE]/10 hover:bg-[#00F2FE]/20 text-[#00F2FE] border border-[#00F2FE]/30 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title="Download Apple / Outlook .ics Calendar File"
                    >
                      <CalendarPlus className="w-3.5 h-3.5 text-[#00F2FE]" />
                      <span>SYNC</span>
                    </button>

                    {/* Branded Social Share Card Modal */}
                    <button
                      onClick={() => setShareModalEvent(evt)}
                      className="py-2 px-1.5 bg-[#F59E0B]/10 hover:bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title="Share Event Flyer"
                    >
                      <Share2 className="w-3.5 h-3.5 text-[#F59E0B]" />
                      <span>SHARE</span>
                    </button>
                  </div>

                  {/* Instant Registration Button */}
                  <button
                    onClick={() => onRegisterEvent(evt.id)}
                    className={`w-full py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      isRegistered
                        ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                        : 'bg-[#F59E0B] hover:bg-[#d98b06] text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                    }`}
                  >
                    {isRegistered ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                        <span>REGISTERED (CLICK TO TOGGLE)</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 text-slate-950 stroke-[2]" />
                        <span>REGISTER / RSVP NOW</span>
                      </>
                    )}
                  </button>
                </div>
              </BentoCard>
            </motion.div>
          );
        })
      )}
      </motion.div>

      {/* CREATE STANDALONE EVENT MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl bg-[#090909] border-2 border-[#00F2FE] rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(0,242,254,0.3)] text-white max-h-[90vh] overflow-y-auto space-y-6"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#00F2FE] font-mono block">
                    ORGANIZER DASHBOARD
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black uppercase text-white tracking-tight flex items-center gap-2">
                    <Building2 className="w-6 h-6 text-[#00F2FE]" />
                    <span>CREATE STANDALONE EVENT OR PLAZA</span>
                  </h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 rounded-full bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitNewEvent} className="space-y-4">
                
                {/* Title & Category */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 font-mono">
                      EVENT TITLE *
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Summer Plaza Fan Fest & Pop-Up Game"
                      className="w-full px-3.5 py-2.5 bg-[#121212] border border-white/15 rounded-xl text-xs text-white focus:border-[#00F2FE] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 font-mono">
                      EVENT CATEGORY *
                    </label>
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-[#121212] border border-white/15 rounded-xl text-xs text-white focus:border-[#00F2FE] focus:outline-none"
                    >
                      <option value="Standalone Event">Standalone Event</option>
                      <option value="Plaza">Plaza Gathering</option>
                      <option value="Combine">Combine</option>
                      <option value="Showcase">Showcase</option>
                      <option value="Clinic">Clinic / Training</option>
                      <option value="Tryout">Tryout</option>
                      <option value="Camp">Camp</option>
                      <option value="Community">Community Gathering</option>
                    </select>
                  </div>
                </div>

                {/* Sport, Date, Time */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 font-mono">
                      SPORT FOCUS
                    </label>
                    <select
                      value={sport}
                      onChange={(e) => setSport(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-[#121212] border border-white/15 rounded-xl text-xs text-white focus:border-[#00F2FE] focus:outline-none"
                    >
                      <option value="All Sports">🏆 All Sports / Multi-Sport</option>
                      {SPORTS_CATEGORIES.map((cat) => (
                        <optgroup key={cat.name} label={cat.name}>
                          {cat.sports.map((sp) => (
                            <option key={sp.name} value={sp.name}>
                              {sp.emoji} {sp.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 font-mono">
                      EVENT DATE
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#121212] border border-white/15 rounded-xl text-xs text-white focus:border-[#00F2FE] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 font-mono">
                      TIME RANGE
                    </label>
                    <input
                      type="text"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      placeholder="e.g. 05:00 PM - 09:00 PM"
                      className="w-full px-3.5 py-2.5 bg-[#121212] border border-white/15 rounded-xl text-xs text-white focus:border-[#00F2FE] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Location, State, Country */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 font-mono">
                      LOCATION / VENUE ADDRESS *
                    </label>
                    <input
                      type="text"
                      required
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Bergen Catholic Performance Turf, Oradell"
                      className="w-full px-3.5 py-2.5 bg-[#121212] border border-white/15 rounded-xl text-xs text-white focus:border-[#00F2FE] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 font-mono">
                      STATE
                    </label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#121212] border border-white/15 rounded-xl text-xs text-white focus:border-[#00F2FE] focus:outline-none"
                    >
                      {US_STATES.map((st) => (
                        <option key={st.code} value={st.code}>
                          {st.code} - {st.name}
                        </option>
                      ))}
                      <option value="CUSTOM">✏️ Manual / Custom State</option>
                    </select>
                    {state === 'CUSTOM' && (
                      <input
                        type="text"
                        value={customState}
                        onChange={(e) => setCustomState(e.target.value)}
                        placeholder="Type your state or region..."
                        className="w-full mt-1.5 px-3.5 py-2 bg-[#121212] border border-[#00F2FE]/50 rounded-xl text-xs text-white focus:outline-none"
                      />
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 font-mono">
                      COUNTRY
                    </label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#121212] border border-white/15 rounded-xl text-xs text-white focus:border-[#00F2FE] focus:outline-none"
                    >
                      {POPULAR_COUNTRIES.map((ct) => (
                        <option key={ct} value={ct}>
                          {ct}
                        </option>
                      ))}
                      <option value="Other / Custom Country">🌍 Other / Custom Country</option>
                    </select>
                    {country === 'Other / Custom Country' && (
                      <input
                        type="text"
                        value={customCountry}
                        onChange={(e) => setCustomCountry(e.target.value)}
                        placeholder="Type country name..."
                        className="w-full mt-1.5 px-3.5 py-2 bg-[#121212] border border-[#00F2FE]/50 rounded-xl text-xs text-white focus:outline-none"
                      />
                    )}
                  </div>
                </div>

                {/* Organizer, Capacity, Price */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 font-mono">
                      ORGANIZER NAME
                    </label>
                    <input
                      type="text"
                      value={organizer}
                      onChange={(e) => setOrganizer(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#121212] border border-white/15 rounded-xl text-xs text-white focus:border-[#00F2FE] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 font-mono">
                      MAX CAPACITY (ATTENDEES)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={capacity}
                      onChange={(e) => setCapacity(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-[#121212] border border-white/15 rounded-xl text-xs text-white focus:border-[#00F2FE] focus:outline-none font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 font-mono">
                      REGISTRATION PRICE ($)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      placeholder="0 for Free Plaza"
                      className="w-full px-3.5 py-2.5 bg-[#121212] border border-white/15 rounded-xl text-xs text-white focus:border-[#00F2FE] focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Cover Banner File Upload & Presets */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 font-mono block">
                      COVER BANNER (FILE UPLOAD OR PRESET)
                    </label>
                    <label className="px-3 py-1 bg-[#00F2FE]/10 hover:bg-[#00F2FE]/20 border border-[#00F2FE]/40 text-[#00F2FE] rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Banner Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleBannerFileUpload(e, false)}
                      />
                    </label>
                  </div>

                  {bannerUrl && (
                    <div className="relative h-24 w-full rounded-2xl overflow-hidden border border-white/20">
                      <img src={bannerUrl} alt="Active Cover Banner" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-between p-3">
                        <span className="text-[10px] font-bold text-white bg-black/80 px-2 py-1 rounded-md font-mono flex items-center gap-1 border border-white/10">
                          <ImageIcon className="w-3 h-3 text-[#00F2FE]" /> Active Banner Preview
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PRESET_BANNERS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setBannerUrl(preset.url)}
                        className={`p-2 rounded-xl border text-[10px] font-bold uppercase transition-all overflow-hidden text-left relative cursor-pointer ${
                          bannerUrl === preset.url 
                            ? 'border-[#00F2FE] bg-[#00F2FE]/10 text-[#00F2FE]' 
                            : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        <img src={preset.url} alt={preset.label} className="w-full h-10 object-cover rounded-md mb-1" />
                        <span>{preset.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 font-mono">
                    EVENT DESCRIPTION & AGENDA
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide details about schedule, required gear, scouting staff present, or plaza activities..."
                    className="w-full p-3 bg-[#121212] border border-white/15 rounded-xl text-xs text-white focus:border-[#00F2FE] focus:outline-none"
                  />
                </div>

                {/* Featured Switch */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isFeatured"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#00F2FE] cursor-pointer"
                  />
                  <label htmlFor="isFeatured" className="text-xs font-bold text-slate-300 cursor-pointer">
                    Highlight as Featured Event on Just1Play Homepage
                  </label>
                </div>

                {/* Submit Action */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase text-slate-400 hover:text-white cursor-pointer"
                  >
                    CANCEL
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-3 bg-[#00F2FE] hover:bg-[#38BDF8] text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(0,242,254,0.5)] transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>PUBLISH STANDALONE EVENT</span>
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EVENT DETAIL / INFORMATION MODAL */}
      <AnimatePresence>
        {selectedDetailEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-[#090909] border border-white/20 rounded-3xl p-6 shadow-2xl text-white space-y-5"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#00F2FE] font-mono flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  {selectedDetailEvent.eventType} SPECIFICATIONS
                </span>
                <button
                  onClick={() => setSelectedDetailEvent(null)}
                  className="p-1 rounded-full bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="h-36 w-full rounded-2xl overflow-hidden relative">
                  <img
                    src={selectedDetailEvent.bannerUrl || PRESET_BANNERS[0].url}
                    alt={selectedDetailEvent.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-3">
                    <span className="text-[10px] font-mono text-[#00F2FE] font-bold">{selectedDetailEvent.sport}</span>
                    <h3 className="text-lg font-black uppercase text-white leading-tight">{selectedDetailEvent.title}</h3>
                  </div>
                </div>

                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-2 text-xs font-mono">
                  <p><strong className="text-slate-400">Host:</strong> <span className="text-white">{selectedDetailEvent.organizer}</span></p>
                  <p><strong className="text-slate-400">Date & Time:</strong> <span className="text-white">{selectedDetailEvent.date} ({selectedDetailEvent.time})</span></p>
                  <p><strong className="text-slate-400">Location:</strong> <span className="text-[#00F2FE]">{selectedDetailEvent.location}, {selectedDetailEvent.state}</span></p>
                  <p><strong className="text-slate-400">Entry Fee:</strong> <span className="text-slate-300">{selectedDetailEvent.price === 0 ? 'FREE ENTRY' : `$${selectedDetailEvent.price}`}</span></p>
                </div>

                <div>
                  <h4 className="text-xs font-black uppercase text-slate-300 font-mono mb-1">Description</h4>
                  <p className="text-xs text-slate-300 leading-relaxed bg-white/5 p-3 rounded-2xl border border-white/10">
                    {selectedDetailEvent.description}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                <button
                  onClick={() => {
                    setQrPassEvent(selectedDetailEvent);
                    setSelectedDetailEvent(null);
                  }}
                  className="py-2.5 px-4 bg-white/10 hover:bg-white/15 text-slate-200 border border-white/20 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer"
                >
                  <QrCode className="w-4 h-4 text-[#00F2FE]" />
                  <span>VIEW GATE PASS</span>
                </button>

                <button
                  onClick={() => {
                    onRegisterEvent(selectedDetailEvent.id);
                    setSelectedDetailEvent(null);
                  }}
                  className="py-2.5 px-5 bg-[#00F2FE] hover:bg-[#38BDF8] text-black font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all"
                >
                  RSVP NOW
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QR GATE PASS MODAL FOR STANDALONE EVENT */}
      <AnimatePresence>
        {qrPassEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-[#050505] border-2 border-[#00F2FE] rounded-3xl p-6 shadow-[0_0_40px_rgba(0,242,254,0.3)] text-white text-center space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-black uppercase tracking-widest text-[#00F2FE] flex items-center gap-1.5 font-mono">
                  <QrCode className="w-4 h-4" />
                  STANDALONE GATE PASS
                </span>
                <button
                  onClick={() => setQrPassEvent(null)}
                  className="p-1 rounded-full bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <h4 className="text-base font-black text-white uppercase">{qrPassEvent.title}</h4>
                <p className="text-[10px] text-slate-400 font-mono">{qrPassEvent.location} • {qrPassEvent.date}</p>
              </div>

              {/* Dynamic QR Code Matrix */}
              <div className="flex justify-center py-2">
                <QrCodeDisplay
                  value={JSON.stringify({
                    eventId: qrPassEvent.id,
                    title: qrPassEvent.title,
                    userUid: user?.uid || 'guest',
                    userName: profile?.displayName || 'Attendee',
                    timestamp: new Date().toISOString()
                  })}
                  size={190}
                  title="EVENT ENTRANCE GATE PASS"
                  subTitle="Scan at plaza entrance for gate verification"
                />
              </div>

              <div className="bg-white/5 p-3 rounded-2xl border border-white/10 text-left text-[11px] font-mono space-y-1 text-slate-300">
                <p>Pass Holder: <strong className="text-white">{profile?.displayName || 'Registered Participant'}</strong></p>
                <p>Event Type: <span className="text-[#00F2FE]">{qrPassEvent.eventType}</span></p>
                <p>Gate Status: <span className="text-slate-300">VERIFIED ENTRY PASS</span></p>
              </div>

              <button
                onClick={() => setQrPassEvent(null)}
                className="w-full py-2.5 bg-[#00F2FE] hover:bg-[#38BDF8] text-black font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all"
              >
                DONE
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT EVENT MODAL */}
      <AnimatePresence>
        {editingEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#222220]/85 backdrop-blur-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl bg-[#000000] border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl text-white space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-black uppercase text-[#00F2FE] flex items-center gap-1.5 font-mono">
                  <Edit3 className="w-4 h-4" />
                  EDIT EVENT DETAILS
                </span>
                <button
                  onClick={() => setEditingEvent(null)}
                  className="p-1 rounded-full bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Event Title</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-[#222220] border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:border-[#00F2FE] focus:outline-none font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Sport Category</label>
                    <select
                      value={editSport}
                      onChange={(e) => setEditSport(e.target.value as any)}
                      className="w-full bg-[#222220] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#00F2FE] focus:outline-none"
                    >
                      <option value="All Sports">🌐 All Sports</option>
                      <option value="Basketball">🏀 Basketball</option>
                      <option value="Flag Football">🏈 Flag Football</option>
                      <option value="Lacrosse">🥍 Lacrosse</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Event Type</label>
                    <select
                      value={editEventType}
                      onChange={(e) => setEditEventType(e.target.value as any)}
                      className="w-full bg-[#222220] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#00F2FE] focus:outline-none"
                    >
                      <option value="Standalone Event">Standalone Event</option>
                      <option value="Combine">Combine</option>
                      <option value="Showcase">Showcase</option>
                      <option value="Clinic">Clinic</option>
                      <option value="Tryout">Tryout</option>
                      <option value="Camp">Camp</option>
                      <option value="Community">Community</option>
                      <option value="Plaza">Plaza</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Date</label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full bg-[#222220] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#00F2FE] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Time</label>
                    <input
                      type="text"
                      value={editTime}
                      onChange={(e) => setEditTime(e.target.value)}
                      placeholder="e.g. 05:00 PM - 08:00 PM"
                      className="w-full bg-[#222220] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#00F2FE] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block">Location / Venue</label>
                    <input
                      type="text"
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      className="w-full bg-[#222220] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#00F2FE] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block">State</label>
                    <select
                      value={editState}
                      onChange={(e) => setEditState(e.target.value)}
                      className="w-full bg-[#222220] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#00F2FE] focus:outline-none"
                    >
                      {US_STATES.map(st => (
                        <option key={st.code} value={st.code}>{st.code} - {st.name}</option>
                      ))}
                      <option value="CUSTOM">✏️ Manual / Custom State</option>
                    </select>
                    {editState === 'CUSTOM' && (
                      <input
                        type="text"
                        value={editCustomState}
                        onChange={(e) => setEditCustomState(e.target.value)}
                        placeholder="Type state/region..."
                        className="w-full mt-1 bg-[#222220] border border-[#00F2FE]/50 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                      />
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block">Country</label>
                    <select
                      value={editCountry}
                      onChange={(e) => setEditCountry(e.target.value)}
                      className="w-full bg-[#222220] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#00F2FE] focus:outline-none"
                    >
                      {POPULAR_COUNTRIES.map(ct => (
                        <option key={ct} value={ct}>{ct}</option>
                      ))}
                      <option value="Other / Custom Country">🌍 Other / Custom Country</option>
                    </select>
                    {editCountry === 'Other / Custom Country' && (
                      <input
                        type="text"
                        value={editCustomCountry}
                        onChange={(e) => setEditCustomCountry(e.target.value)}
                        placeholder="Type country..."
                        className="w-full mt-1 bg-[#222220] border border-[#00F2FE]/50 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                      />
                    )}
                  </div>
                </div>

                {/* Banner Upload / Select in Edit Modal */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block">Cover Banner Image</label>
                    <label className="px-2.5 py-1 bg-[#00F2FE]/10 hover:bg-[#00F2FE]/20 border border-[#00F2FE]/40 text-[#00F2FE] rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors">
                      <Upload className="w-3 h-3" />
                      <span>Upload Banner</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleBannerFileUpload(e, true)}
                      />
                    </label>
                  </div>

                  {editBannerUrl && (
                    <div className="relative h-20 w-full rounded-xl overflow-hidden border border-white/20">
                      <img src={editBannerUrl} alt="Edit Cover Banner Preview" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="grid grid-cols-4 gap-1.5">
                    {PRESET_BANNERS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setEditBannerUrl(preset.url)}
                        className={`p-1.5 rounded-lg border text-[9px] font-bold uppercase transition-all text-left cursor-pointer ${
                          editBannerUrl === preset.url 
                            ? 'border-[#00F2FE] bg-[#00F2FE]/10 text-[#00F2FE]' 
                            : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>{preset.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full bg-[#222220] border border-white/15 rounded-xl p-3 text-xs text-white focus:border-[#00F2FE] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Capacity</label>
                    <input
                      type="number"
                      value={editCapacity}
                      onChange={(e) => setEditCapacity(Number(e.target.value))}
                      className="w-full bg-[#222220] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#00F2FE] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Price ($)</label>
                    <input
                      type="number"
                      value={editPrice}
                      onChange={(e) => setEditPrice(Number(e.target.value))}
                      className="w-full bg-[#222220] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#00F2FE] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Host / Organizer</label>
                    <input
                      type="text"
                      value={editOrganizer}
                      onChange={(e) => setEditOrganizer(e.target.value)}
                      className="w-full bg-[#222220] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-[#00F2FE] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingEvent(null)}
                    className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-[#00F2FE] hover:bg-[#38BDF8] text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_15px_rgba(0,242,254,0.4)] cursor-pointer transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE EVENT CONFIRMATION MODAL */}
      <AnimatePresence>
        {deletingEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#222220]/85 backdrop-blur-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-[#000000] border-2 border-rose-500/50 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(239,68,68,0.3)] text-white space-y-4 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500 flex items-center justify-center mx-auto text-rose-500">
                <AlertTriangle className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black uppercase text-white tracking-wide">
                  DELETE EVENT?
                </h3>
                <p className="text-xs text-slate-300 font-sans">
                  Are you sure you want to delete <strong className="text-white">"{deletingEvent.title || deletingEvent.name}"</strong>? This action cannot be undone.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingEvent(null)}
                  className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Event</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BRANDED EVENT MATRIX SHARE CARD MODAL */}
      <EventShareCardModal
        isOpen={!!shareModalEvent}
        onClose={() => setShareModalEvent(null)}
        event={shareModalEvent}
      />

    </div>
  );
};
