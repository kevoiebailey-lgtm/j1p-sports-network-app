import React, { useState } from 'react';
import { saveEventToFirestore } from '../../services/tournamentHubService';
import { EventItem, SportType } from '../../types';
import { useFormSubmit } from '../../hooks/useFormSubmit';
import { FormSubmitButton } from '../Common/FormSubmitButton';
import { SubmissionToast } from '../Common/SubmissionToast';
import { TournamentFlyerUploader } from '../Tournaments/TournamentFlyerUploader';
import { 
  Trophy, 
  Calendar, 
  DollarSign, 
  Users, 
  Lock, 
  MapPin, 
  CheckCircle2, 
  Plus, 
  X, 
  Sparkles,
  AlertCircle
} from 'lucide-react';

interface AdminEventBuilderProps {
  onEventCreated?: (newEventId: string) => void;
  onCancel?: () => void;
  onClose?: () => void;
}

const DEFAULT_DIVISIONS = ['8U', '10U', '12U', '14U', '15U', '16U', '17U', 'Varsity'];

export const AdminEventBuilder: React.FC<AdminEventBuilderProps> = ({ onEventCreated, onCancel }) => {
  const [title, setTitle] = useState('');
  const [sport, setSport] = useState<SportType>('Basketball');
  const [startDate, setStartDate] = useState('2026-08-15');
  const [endDate, setEndDate] = useState('2026-08-17');
  const [location, setLocation] = useState('Just1Play Athletic Center, Newark, NJ');
  const [state, setState] = useState('NJ');
  const [hasFee, setHasFee] = useState<boolean>(false); // Free by default
  const [teamFee, setTeamFee] = useState<number>(0);
  const [maxTeams, setMaxTeams] = useState<number>(32);
  const [rosterLockDate, setRosterLockDate] = useState('2026-08-10');
  const [description, setDescription] = useState('Official Just1Play Summer Championship Showcase featuring live college scout matrix, automated bracket seeding, and video recording.');
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>(['10U', '12U', '14U', '17U', 'Varsity']);
  const [customDivision, setCustomDivision] = useState('');

  // Media & Flyer Ingestion
  const [flyerUrl, setFlyerUrl] = useState('https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&auto=format&fit=crop&q=80');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'banner' | 'flyer' | 'auto'>('banner');

  const resetFormFields = () => {
    setTitle('');
    setDescription('');
    setSelectedDivisions(['10U', '12U', '14U', '17U', 'Varsity']);
  };

  const {
    isSubmitting,
    submitSuccess,
    submitError,
    toast,
    submitForm,
    dismissToast
  } = useFormSubmit<Partial<EventItem>, string>({
    onSubmit: async (eventPayload) => {
      if (!title.trim()) {
        throw new Error('Tournament name is required.');
      }
      if (selectedDivisions.length === 0) {
        throw new Error('Please select at least one tournament division.');
      }
      return await saveEventToFirestore(eventPayload);
    },
    successMessage: '✅ Tournament Successfully Created & Published!',
    errorMessage: '❌ Failed to save tournament. Please try again.',
    resetForm: resetFormFields,
    onRedirect: (_url, newEventId) => {
      if (onEventCreated && newEventId) {
        onEventCreated(newEventId);
      }
    },
    redirectDelayMs: 1500
  });

  const toggleDivision = (div: string) => {
    if (selectedDivisions.includes(div)) {
      setSelectedDivisions(selectedDivisions.filter(d => d !== div));
    } else {
      setSelectedDivisions([...selectedDivisions, div]);
    }
  };

  const addCustomDivision = () => {
    if (customDivision.trim() && !selectedDivisions.includes(customDivision.trim())) {
      setSelectedDivisions([...selectedDivisions, customDivision.trim()]);
      setCustomDivision('');
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveFee = hasFee ? Math.max(0, teamFee) : 0;
    const eventPayload: Partial<EventItem> = {
      title: title.trim(),
      name: title.trim(),
      sport,
      eventType: 'Tournament',
      date: startDate,
      startDate,
      endDate,
      time: '08:00 AM EST',
      location,
      state,
      description,
      organizer: 'Just1Play System Admin',
      capacity: maxTeams * 10,
      maxTeams,
      teamFee: effectiveFee,
      price: effectiveFee,
      entryFee: effectiveFee > 0 ? `$${effectiveFee}` : 'Free Entry',
      divisions: selectedDivisions,
      rosterLockDate,
      registeredUserIds: [],
      status: 'Upcoming',
      isFeatured: true,
      bannerUrl: flyerUrl,
      flyerUrl: flyerUrl,
      coverUrl: flyerUrl,
      thumbnailUrl: thumbnailUrl || flyerUrl,
      aspectRatio: aspectRatio
    };
    submitForm(eventPayload);
  };

  return (
    <div className="bg-[#212A31] border border-white/15 rounded-3xl p-6 sm:p-8 max-w-3xl mx-auto shadow-2xl relative overflow-hidden">
      
      {/* Top Glassmorphic Toast Notification */}
      <SubmissionToast toast={toast} onClose={dismissToast} />

      {/* Glow effect */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#E5B868]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between border-b border-white/10 pb-6 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E5B868]/10 border border-[#E5B868]/30 text-[#E5B868] text-xs font-mono font-bold uppercase mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Admin Event Builder</span>
          </div>
          <h2 className="text-2xl font-black text-white font-sans tracking-tight">
            Create Official Tournament
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Define divisions, max team caps, entry fees, and roster lock dates for automated eligibility enforcement.
          </p>
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleFormSubmit} className="space-y-6">
        
        {/* Title & Sport */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
              Tournament Name *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 2026 Tri-State National Championship"
              className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-[#E5B868] transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
              Sport *
            </label>
            <select
              value={sport}
              onChange={(e) => setSport(e.target.value as SportType)}
              className="w-full px-4 py-3 rounded-2xl bg-[#212A31] border border-white/10 text-sm text-white focus:outline-none focus:border-[#E5B868] transition-all"
            >
              <option value="Basketball">Basketball</option>
              <option value="Flag Football">Flag Football</option>
              <option value="Lacrosse">Lacrosse</option>
              <option value="Track & Field">Track & Field</option>
            </select>
          </div>
        </div>

        {/* Divisions Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
            <span>Age Divisions *</span>
            <span className="text-[10px] text-slate-500 font-normal">(Used for automated player age verification)</span>
          </label>

          <div className="flex flex-wrap gap-2">
            {DEFAULT_DIVISIONS.map((div) => {
              const isSelected = selectedDivisions.includes(div);
              return (
                <button
                  type="button"
                  key={div}
                  onClick={() => toggleDivision(div)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#E5B868] text-black border border-[#E5B868] shadow-[0_0_15px_rgba(214,28,36,0.4)]'
                      : 'bg-white/5 text-slate-400 border border-white/10 hover:border-white/20 hover:text-white'
                  }`}
                >
                  {div}
                </button>
              );
            })}
          </div>

          {/* Add custom division */}
          <div className="flex items-center gap-2 mt-2">
            <input
              type="text"
              placeholder="Add custom division (e.g. 11U, Open)"
              value={customDivision}
              onChange={(e) => setCustomDivision(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#E5B868]"
            />
            <button
              type="button"
              onClick={addCustomDivision}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Dates & Roster Lock */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#E5B868]" />
              <span>Start Date *</span>
            </label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#E5B868]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>End Date *</span>
            </label>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#E5B868]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-red-400 uppercase tracking-wider font-mono flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-red-400" />
              <span>Roster Lock Cutoff *</span>
            </label>
            <input
              type="date"
              required
              value={rosterLockDate}
              onChange={(e) => setRosterLockDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-white/5 border border-red-500/30 text-xs text-white focus:outline-none focus:border-red-500"
            />
          </div>
        </div>

        {/* Team Fees & Caps */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div>
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-[#E5B868]" />
                <span>Event Registration Pricing</span>
              </label>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Default is Free for all participants. Toggle on to require a paid team entry fee.
              </p>
            </div>

            {/* Toggle Button Switch */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setHasFee(false);
                  setTeamFee(0);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                  !hasFee
                    ? 'bg-[#E5B868] text-black shadow-[0_0_15px_rgba(0,242,254,0.4)]'
                    : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
                }`}
              >
                FREE EVENT
              </button>
              <button
                type="button"
                onClick={() => {
                  setHasFee(true);
                  if (teamFee === 0) setTeamFee(150);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                  hasFee
                    ? 'bg-amber-400 text-black shadow-[0_0_15px_rgba(251,191,36,0.4)]'
                    : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
                }`}
              >
                CHARGE FEE
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {hasFee ? (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-amber-300 uppercase tracking-wider font-mono flex items-center gap-1">
                  <span>Entry Fee Amount ($USD) *</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold">$</span>
                  <input
                    type="number"
                    min="1"
                    required={hasFee}
                    value={teamFee || ''}
                    onChange={(e) => setTeamFee(Number(e.target.value))}
                    placeholder="150"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-black/50 border border-amber-400/40 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#E5B868] uppercase tracking-wider font-mono">
                  Current Status
                </label>
                <div className="px-4 py-2.5 rounded-xl bg-[#E5B868]/10 border border-[#E5B868]/30 text-xs font-mono font-bold text-[#E5B868] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#E5B868]" />
                  <span>100% FREE REGISTRATION (NO FEE REQUIRED)</span>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>Max Teams Cap *</span>
              </label>
              <input
                type="number"
                min="2"
                max="128"
                required
                value={maxTeams}
                onChange={(e) => setMaxTeams(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-[#E5B868]"
              />
            </div>
          </div>
        </div>

        {/* Location & State */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="sm:col-span-3 space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#E5B868]" />
              <span>Venue Location & Address *</span>
            </label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Facility Name, Address, City"
              className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-[#E5B868]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
              State *
            </label>
            <input
              type="text"
              required
              maxLength={2}
              value={state}
              onChange={(e) => setState(e.target.value.toUpperCase())}
              placeholder="NJ"
              className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm text-white text-center font-bold focus:outline-none focus:border-[#E5B868]"
            />
          </div>
        </div>

        {/* Tournament Flyer Ingestion */}
        <TournamentFlyerUploader
          initialUrl={flyerUrl}
          initialThumbnail={thumbnailUrl}
          initialAspectRatio={aspectRatio}
          tournamentId="new_tournament"
          onChange={(data) => {
            setFlyerUrl(data.flyerUrl);
            setThumbnailUrl(data.thumbnailUrl);
            setAspectRatio(data.aspectRatio);
          }}
          title="TOURNAMENT PROMOTIONAL FLYER / COVER PHOTO"
        />

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
            Event Overview & Rules
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#E5B868] resize-none"
          />
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              Cancel
            </button>
          )}

          <FormSubmitButton
            isSubmitting={isSubmitting}
            submitSuccess={submitSuccess}
            label="Publish Tournament"
            loadingLabel="Publishing Tournament..."
            successLabel="Tournament Published!"
            icon={<Trophy className="w-4 h-4" />}
            variant="emerald"
          />
        </div>

      </form>

    </div>
  );
};
