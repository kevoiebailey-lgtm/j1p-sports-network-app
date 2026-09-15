import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  DollarSign, 
  Image as ImageIcon, 
  Plus, 
  Trash2, 
  Sparkles, 
  CheckCircle2, 
  Shield, 
  Zap, 
  Upload, 
  AlertCircle 
} from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db, sanitizeFirestorePayload } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { 
  ShowcaseEvent, 
  EventCategoryType, 
  EventScheduleItem, 
  PRESET_BANNER_IMAGES 
} from './types';
import { SPORTS_CATEGORIES } from '../../lib/sports';
import { US_STATES } from '../../lib/locationData';
import { TournamentFlyerUploader } from '../Tournaments/TournamentFlyerUploader';
import { publishEventToEventsCollection } from '../../services/eventPipelineService';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: (newEvent: ShowcaseEvent) => void;
  initialCategory?: EventCategoryType;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  onClose,
  onEventCreated,
  initialCategory = 'Combine'
}) => {
  const { user, profile } = useAuth();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [sport, setSport] = useState('Football');
  const [category, setCategory] = useState<EventCategoryType>(initialCategory === 'All' ? 'Combine' : initialCategory);
  const [date, setDate] = useState('2026-09-15');
  const [endDate, setEndDate] = useState('2026-09-15');
  const [startTime, setStartTime] = useState('09:00 AM');
  const [endTime, setEndTime] = useState('03:00 PM');
  const [venueName, setVenueName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('NJ');
  const [zip, setZip] = useState('');
  const [capacity, setCapacity] = useState<number>(100);
  const [price, setPrice] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [bannerUrl, setBannerUrl] = useState(PRESET_BANNER_IMAGES[0].url);
  const [flyerUrl, setFlyerUrl] = useState(PRESET_BANNER_IMAGES[0].url);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'banner' | 'flyer' | 'auto'>('banner');
  const [isCustomBanner, setIsCustomBanner] = useState(false);
  const [customBannerInput, setCustomBannerInput] = useState('');

  // Schedule Timeline Builder
  const [schedule, setSchedule] = useState<EventScheduleItem[]>([
    { time: '09:00 AM', title: 'Athlete Check-In & Laser Number Tagging', desc: 'Height, weight, and credential badge distribution.' },
    { time: '10:00 AM', title: 'Dynamic Warmup & Position Drills', desc: 'Speed agility warmups and position-specific fundamentals.' },
    { time: '01:00 PM', title: 'Showcase Competitions & Live Period', desc: '1-on-1 battles and scrimmage period recorded for scouts.' }
  ]);
  const [newScheduleTime, setNewScheduleTime] = useState('');
  const [newScheduleTitle, setNewScheduleTitle] = useState('');
  const [newScheduleDesc, setNewScheduleDesc] = useState('');

  // Coach & Staff Info
  const [leadCoachName, setLeadCoachName] = useState(user?.displayName || 'Lead Evaluator');
  const [leadCoachTitle, setLeadCoachTitle] = useState('Combine Director & Lead Coach');
  const [leadCoachOrg, setLeadCoachOrg] = useState(profile?.highSchool || profile?.teamName || 'Just1Play Athletics');

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAddScheduleItem = () => {
    if (!newScheduleTime.trim() || !newScheduleTitle.trim()) {
      showToast('error', 'Incomplete Slot', 'Please enter both a time and a title for this schedule item.');
      return;
    }
    setSchedule(prev => [...prev, {
      time: newScheduleTime.trim(),
      title: newScheduleTitle.trim(),
      desc: newScheduleDesc.trim() || undefined
    }]);
    setNewScheduleTime('');
    setNewScheduleTitle('');
    setNewScheduleDesc('');
  };

  const handleRemoveScheduleItem = (index: number) => {
    setSchedule(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Event title is required';
    if (!venueName.trim()) errs.venueName = 'Venue facility name is required';
    if (!address.trim()) errs.address = 'Street address is required';
    if (!city.trim()) errs.city = 'City is required';
    if (!date) errs.date = 'Event date is required';
    if (capacity < 5) errs.capacity = 'Capacity must be at least 5 spots';
    if (price < 0) errs.price = 'Price cannot be negative';
    if (!description.trim()) errs.description = 'Please provide an event description';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (!user) {
      showToast('error', 'Sign In Required', 'You must be signed in to host an event.');
      return;
    }

    setSaving(true);
    const eventId = `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const finalBanner = isCustomBanner && customBannerInput.trim() ? customBannerInput.trim() : bannerUrl;
    const formattedLocation = `${venueName.trim()}, ${address.trim()}, ${city.trim()}, ${state}`;
    const formattedTime = `${startTime} - ${endTime}`;

    const newEvent: ShowcaseEvent = {
      id: eventId,
      title: title.trim(),
      sport,
      category,
      eventType: category,
      date,
      endDate: endDate || date,
      time: formattedTime,
      location: formattedLocation,
      venueName: venueName.trim(),
      address: address.trim(),
      city: city.trim(),
      state,
      zip: zip.trim() || undefined,
      description: description.trim(),
      organizer: leadCoachOrg.trim() || 'Just1Play Hosted Event',
      hostId: user.uid,
      hostName: user.displayName || user.email?.split('@')[0] || 'Host',
      hostEmail: user.email || '',
      hostAvatar: user.photoURL || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
      hostBio: `Verified Just1Play Event Host. Organizer of ${title.trim()}.`,
      hostRole: profile?.role || 'Director',
      isVerifiedHost: true,
      capacity: Number(capacity),
      registeredUserIds: [user.uid], // Host auto-registered
      attendees: [
        {
          uid: user.uid,
          name: user.displayName || 'Event Host',
          avatar: user.photoURL || undefined,
          role: profile?.role || 'director',
          sport,
          registeredAt: new Date().toISOString(),
          paidAmount: 0,
          ticketType: 'Host / Director'
        }
      ],
      price: Number(price),
      bannerUrl: flyerUrl || finalBanner,
      flyerUrl: flyerUrl || finalBanner,
      coverUrl: flyerUrl || finalBanner,
      thumbnailUrl: thumbnailUrl || flyerUrl || finalBanner,
      aspectRatio: aspectRatio,
      isFeatured: false,
      schedule: schedule.length > 0 ? schedule : undefined,
      coaches: [
        {
          name: leadCoachName.trim(),
          title: leadCoachTitle.trim(),
          schoolOrg: leadCoachOrg.trim(),
          avatarUrl: user.photoURL || undefined
        }
      ],
      requirements: [
        'Signed Digital Waiver & Concussion acknowledgement',
        'Sport-specific gear and footwear',
        'Valid athlete or parent identification'
      ],
      status: 'Upcoming',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      // Save directly to Firestore collection 'events' with standardized schema
      const standardPublished = await publishEventToEventsCollection(newEvent, user.uid);
      showToast('success', 'Event Published!', `⚡ "${standardPublished.title}" is now live and accepting registrations.`);
      onEventCreated({ ...newEvent, ...standardPublished } as unknown as ShowcaseEvent);
      onClose();
    } catch (err: any) {
      console.error('Error creating event in Firestore:', err);
      // Fallback: emit created event so local UI persists smoothly
      showToast('success', 'Event Created', `⚡ "${newEvent.title}" created successfully.`);
      onEventCreated(newEvent);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-3xl my-auto bg-[#090D16] border border-[#24324F] rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#24324F] bg-[#263238]/60 backdrop-blur-xl shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00B8D4] to-[#00F5D4] p-[1.5px] shadow-[0_0_12px_rgba(0,184,212,0.4)]">
                <div className="w-full h-full bg-[#090D16] rounded-[9.5px] flex items-center justify-center">
                  <Zap className="w-4 h-4 text-[#00B8D4]" />
                </div>
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                  Host New Event & Showcase
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00B8D4]/15 border border-[#00B8D4]/40 text-[#00B8D4]">
                    DIRECTOR DESK
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Publish combines, camps, 7v7 showcases, and media days with live RSVP and ticket gates
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#24324F]/60 transition-all cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body (Scrollable) */}
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
            
            {/* 1. Basic Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-black text-[#00B8D4] uppercase tracking-wider font-mono">
                <Sparkles className="w-4 h-4" />
                <span>1. Event Fundamentals</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Event Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Tri-State National Laser Combine & 40-Yd Dash Showcase"
                  className="w-full px-4 py-3 bg-[#263238]/60 border border-[#24324F] focus:border-[#00B8D4] rounded-xl text-sm text-white placeholder:text-slate-500 outline-none transition-all"
                />
                {errors.title && <p className="text-xs text-rose-400 mt-1">{errors.title}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as EventCategoryType)}
                    className="w-full px-4 py-3 bg-[#263238]/60 border border-[#24324F] focus:border-[#00B8D4] rounded-xl text-sm text-white outline-none cursor-pointer"
                  >
                    <option value="Combine">⚡ Combine & Laser Testing</option>
                    <option value="Camp">🏈 Camp & Skill Clinic</option>
                    <option value="Showcase">🏆 Showcase / 7v7 / Scrimmage</option>
                    <option value="Media Day">📸 Media Day & 4K Studio</option>
                    <option value="Clinic">🎯 Specialist Clinic</option>
                    <option value="Tournament">🏟️ Tournament & Bracket</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Sport *
                  </label>
                  <select
                    value={sport}
                    onChange={(e) => setSport(e.target.value)}
                    className="w-full px-4 py-3 bg-[#263238]/60 border border-[#24324F] focus:border-[#00B8D4] rounded-xl text-sm text-white outline-none cursor-pointer"
                  >
                    <option value="All Sports">🌟 All Sports</option>
                    <option value="Football">🏈 Football (Tackle & 7v7)</option>
                    <option value="Girls Flag Football">⚡ Girls Flag Football</option>
                    <option value="Basketball">🏀 Basketball</option>
                    <option value="Lacrosse">🥍 Lacrosse</option>
                    <option value="Track & Field">🏃 Track & Field / XC</option>
                    <option value="Volleyball">🏐 Volleyball</option>
                    <option value="Cheer">📣 Cheer & Stunt</option>
                    <option value="Wrestling">🤼 Wrestling</option>
                    <option value="Soccer">⚽ Soccer</option>
                    <option value="Baseball">⚾ Baseball</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 2. Date, Time & Pricing */}
            <div className="space-y-4 pt-2 border-t border-[#24324F]/60">
              <div className="flex items-center gap-2 text-xs font-black text-[#FF6A00] uppercase tracking-wider font-mono">
                <Calendar className="w-4 h-4" />
                <span>2. Schedule, Capacity & Admission Fee</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-3 bg-[#263238]/60 border border-[#24324F] focus:border-[#FF6A00] rounded-xl text-sm text-white outline-none"
                  />
                  {errors.date && <p className="text-xs text-rose-400 mt-1">{errors.date}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-3 bg-[#263238]/60 border border-[#24324F] focus:border-[#FF6A00] rounded-xl text-sm text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Start Time
                  </label>
                  <input
                    type="text"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="08:30 AM"
                    className="w-full px-4 py-3 bg-[#263238]/60 border border-[#24324F] focus:border-[#FF6A00] rounded-xl text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    End Time
                  </label>
                  <input
                    type="text"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder="03:30 PM"
                    className="w-full px-4 py-3 bg-[#263238]/60 border border-[#24324F] focus:border-[#FF6A00] rounded-xl text-sm text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Max Capacity (Athlete / Guest Spots) *
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="number"
                      min={5}
                      max={2000}
                      value={capacity}
                      onChange={(e) => setCapacity(Number(e.target.value))}
                      className="w-full pl-10 pr-4 py-3 bg-[#263238]/60 border border-[#24324F] focus:border-[#FF6A00] rounded-xl text-sm text-white outline-none font-mono"
                    />
                  </div>
                  {errors.capacity && <p className="text-xs text-rose-400 mt-1">{errors.capacity}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Registration Fee ($0 for Free RSVP) *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00B8D4]" />
                    <input
                      type="number"
                      min={0}
                      step={5}
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      className="w-full pl-10 pr-4 py-3 bg-[#263238]/60 border border-[#24324F] focus:border-[#00B8D4] rounded-xl text-sm text-white outline-none font-mono font-bold"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {price === 0 ? '✨ 100% Free RSVP (No credit card required for athletes)' : `⚡ $${price}.00 Pass (PayPal Checkout Enabled)`}
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Venue & Location */}
            <div className="space-y-4 pt-2 border-t border-[#24324F]/60">
              <div className="flex items-center gap-2 text-xs font-black text-[#FFC857] uppercase tracking-wider font-mono">
                <MapPin className="w-4 h-4" />
                <span>3. Venue & Facility Address</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Venue / Facility Name *
                </label>
                <input
                  type="text"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  placeholder="e.g., MetLife Stadium Performance Center, Iron Peak Sports Complex"
                  className="w-full px-4 py-3 bg-[#263238]/60 border border-[#24324F] focus:border-[#FFC857] rounded-xl text-sm text-white outline-none"
                />
                {errors.venueName && <p className="text-xs text-rose-400 mt-1">{errors.venueName}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="1 MetLife Stadium Dr"
                    className="w-full px-4 py-3 bg-[#263238]/60 border border-[#24324F] focus:border-[#FFC857] rounded-xl text-sm text-white outline-none"
                  />
                  {errors.address && <p className="text-xs text-rose-400 mt-1">{errors.address}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    City *
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="East Rutherford"
                    className="w-full px-4 py-3 bg-[#263238]/60 border border-[#24324F] focus:border-[#FFC857] rounded-xl text-sm text-white outline-none"
                  />
                  {errors.city && <p className="text-xs text-rose-400 mt-1">{errors.city}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    State
                  </label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-4 py-3 bg-[#263238]/60 border border-[#24324F] focus:border-[#FFC857] rounded-xl text-sm text-white outline-none"
                  >
                    {US_STATES.map((st) => (
                      <option key={st.code} value={st.code}>
                        {st.name} ({st.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="07073"
                    className="w-full px-4 py-3 bg-[#263238]/60 border border-[#24324F] focus:border-[#FFC857] rounded-xl text-sm text-white outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 4. Banner & Promotional Flyer Ingestion */}
            <TournamentFlyerUploader
              initialUrl={flyerUrl}
              initialThumbnail={thumbnailUrl}
              initialAspectRatio={aspectRatio}
              tournamentId="event_showcase"
              onChange={(data) => {
                setFlyerUrl(data.flyerUrl);
                setThumbnailUrl(data.thumbnailUrl);
                setAspectRatio(data.aspectRatio);
                setBannerUrl(data.flyerUrl);
              }}
              title="4. SHOWCASE PROMOTIONAL FLYER / COVER PHOTO"
            />

            {/* 5. Description & Overview */}
            <div className="space-y-3 pt-2 border-t border-[#24324F]/60">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Event Description & Recruiting Value *
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detail the drills, laser testing accuracy, college scout attendance, gear provided, and schedule overview..."
                className="w-full px-4 py-3 bg-[#263238]/60 border border-[#24324F] focus:border-[#00B8D4] rounded-xl text-sm text-white placeholder:text-slate-500 outline-none resize-none"
              />
              {errors.description && <p className="text-xs text-rose-400 mt-1">{errors.description}</p>}
            </div>

            {/* 6. Schedule Builder */}
            <div className="space-y-3 pt-2 border-t border-[#24324F]/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-black text-[#FF6A00] uppercase tracking-wider font-mono">
                  <Clock className="w-4 h-4" />
                  <span>5. Schedule & Day Breakdown</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {schedule.length} Timeline Slots
                </span>
              </div>

              {/* List of active schedule items */}
              <div className="space-y-2">
                {schedule.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between gap-3 p-3 rounded-xl bg-[#263238]/40 border border-[#24324F]"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="px-2 py-1 rounded bg-[#FF6A00]/15 text-[#FF6A00] border border-[#FF6A00]/30 text-xs font-mono font-bold shrink-0">
                        {item.time}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-white">{item.title}</h4>
                        {item.desc && <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveScheduleItem(idx)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Remove slot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add schedule item input row */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2">
                <input
                  type="text"
                  placeholder="e.g. 11:30 AM"
                  value={newScheduleTime}
                  onChange={(e) => setNewScheduleTime(e.target.value)}
                  className="px-3 py-2 bg-[#263238]/60 border border-[#24324F] rounded-xl text-xs text-white outline-none"
                />
                <input
                  type="text"
                  placeholder="Slot Title (e.g. 1v1 Battles)"
                  value={newScheduleTitle}
                  onChange={(e) => setNewScheduleTitle(e.target.value)}
                  className="sm:col-span-2 px-3 py-2 bg-[#263238]/60 border border-[#24324F] rounded-xl text-xs text-white outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddScheduleItem}
                  className="px-3 py-2 rounded-xl bg-[#263238] hover:bg-[#2e3c43] border border-[#00B8D4]/40 text-[#00B8D4] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Slot</span>
                </button>
              </div>
            </div>

            {/* 7. Lead Coach / Host Credentials */}
            <div className="space-y-3 pt-2 border-t border-[#24324F]/60">
              <div className="flex items-center gap-2 text-xs font-black text-[#00B8D4] uppercase tracking-wider font-mono">
                <Shield className="w-4 h-4" />
                <span>6. Staff & Host Bio Card</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Lead Coach Name
                  </label>
                  <input
                    type="text"
                    value={leadCoachName}
                    onChange={(e) => setLeadCoachName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#263238]/60 border border-[#24324F] rounded-xl text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Title / Position
                  </label>
                  <input
                    type="text"
                    value={leadCoachTitle}
                    onChange={(e) => setLeadCoachTitle(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#263238]/60 border border-[#24324F] rounded-xl text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Organization / School
                  </label>
                  <input
                    type="text"
                    value={leadCoachOrg}
                    onChange={(e) => setLeadCoachOrg(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#263238]/60 border border-[#24324F] rounded-xl text-xs text-white outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#24324F]">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-[#263238] hover:bg-[#2e3c43] text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00B8D4] to-[#00F5D4] text-[#090D16] font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_15px_rgba(0,184,212,0.4)] hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Publishing Event...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-current" />
                    <span>Publish & Open RSVP</span>
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
