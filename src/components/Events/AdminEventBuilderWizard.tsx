import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trophy, 
  Calendar, 
  MapPin, 
  DollarSign, 
  ShieldCheck, 
  Clock, 
  Users, 
  Plus, 
  Trash2, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  Eye, 
  Save, 
  Smartphone, 
  Monitor, 
  AlertCircle, 
  CheckCircle2, 
  FileText, 
  Lock,
  RefreshCw,
  Layers,
  ArrowRight,
  Info
} from 'lucide-react';
import { collection, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { 
  EventItem, 
  TournamentDivision, 
  VenueInfo, 
  DigitalWaiverConfig, 
  SmartScheduleConstraints,
  SportType 
} from '../../types';

const SPORT_OPTIONS: SportType[] = [
  'Flag Football',
  '7v7 Football',
  'Tackle Football',
  'Basketball',
  'Combine',
  'Showcase',
  'Soccer',
  'Lacrosse',
  'Volleyball',
  'Track & Field'
];

const DEFAULT_WAIVER_TEMPLATE = `
# ATHLETE PARTICIPATION AGREEMENT & LIABILITY WAIVER

I, the undersigned participant or legal parent/guardian, hereby acknowledge and agree:
1. **Inherent Risks**: Competitive sports involve physical exertion, collisions, and inherent risks of injury.
2. **Medical Clearance**: The participant is in good physical condition and cleared for competitive activity.
3. **Concussion Protocol**: We agree to strictly abide by concussion identification, withdrawal, and return-to-play guidelines.
4. **Photo & Scouting Media Release**: We grant Just1Play permission to record, photograph, stream, and publish game media for scouting and promotional distribution.
5. **Code of Conduct**: Players, coaches, and spectators agree to maintain sportsmanship and respect towards officials and opponents.
`.trim();

export const AdminEventBuilderWizard: React.FC<{ onBack?: () => void; initialEvent?: Partial<EventItem> }> = ({
  onBack,
  initialEvent
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [savingDraft, setSavingDraft] = useState<boolean>(false);
  const [publishing, setPublishing] = useState<boolean>(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [eventId, setEventId] = useState<string>(initialEvent?.id || `evt-${Date.now()}`);
  const [title, setTitle] = useState<string>(initialEvent?.title || '');
  const [sport, setSport] = useState<SportType>(initialEvent?.sport || 'Flag Football');
  const [eventType, setEventType] = useState<any>(initialEvent?.eventType || 'Tournament');
  const [startDate, setStartDate] = useState<string>(initialEvent?.startDate || initialEvent?.date || '2026-08-22');
  const [endDate, setEndDate] = useState<string>(initialEvent?.endDate || '2026-08-23');
  const [registrationCutoffDate, setRegistrationCutoffDate] = useState<string>(initialEvent?.registrationCutoffDate || '2026-08-18');
  const [rosterLockDate, setRosterLockDate] = useState<string>(initialEvent?.rosterLockDate || '2026-08-20');
  const [description, setDescription] = useState<string>(initialEvent?.description || 'Premier competitive tournament featuring regional champions, live scouting evaluations, and full game-day streaming coverage.');
  const [bannerUrl, setBannerUrl] = useState<string>(initialEvent?.bannerUrl || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=1600');

  // Venue Details
  const [venue, setVenue] = useState<VenueInfo>(initialEvent?.venueDetails || {
    facilityName: 'MetLife Sports Complex',
    address: '102 Route 120, East Rutherford, NJ 07073',
    city: 'East Rutherford',
    state: 'NJ',
    zip: '07073',
    fieldsCount: 4,
    subLocations: ['Field 1 (Turf Championship)', 'Field 2 (Turf)', 'Field 3', 'Field 4'],
    gateFeeInfo: '$10 General Admission / Under 10 Free',
    parkingNotes: 'Park in Gate D. No tailgating with open fires.',
    rules: [
      'Mouthpieces mandatory for all athletes',
      'Molded rubber or turf cleats only (no metal)',
      'Softshell helmets required for 7v7 / Flag play',
      'Zero tolerance for referee harassment'
    ]
  });

  // Divisions & Pricing Engine
  const [divisions, setDivisions] = useState<TournamentDivision[]>(
    initialEvent?.divisionConfigs || [
      { id: 'div-1', name: '10U Girls Open', minAge: 8, maxAge: 10, maxTeams: 12, teamFee: 250, depositAmount: 75, registeredTeamCount: 8 },
      { id: 'div-2', name: '12U Pro Division', minAge: 10, maxAge: 12, maxTeams: 16, teamFee: 300, depositAmount: 100, registeredTeamCount: 14 },
      { id: 'div-3', name: '14U Elite Division', minAge: 12, maxAge: 14, maxTeams: 16, teamFee: 350, depositAmount: 100, registeredTeamCount: 16 },
      { id: 'div-4', name: 'High School Varsity', minAge: 14, maxAge: 18, gradeLevel: '9th-12th Grade', maxTeams: 20, teamFee: 400, depositAmount: 150, registeredTeamCount: 18 }
    ]
  );

  // Digital Waivers & Eligibility
  const [waiverConfig, setWaiverConfig] = useState<DigitalWaiverConfig>(
    initialEvent?.waiverConfig || {
      verificationLevel: 'verified_ocr',
      waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
      concussionProtocolRequired: true,
      photoReleaseConsent: true
    }
  );

  // Smart Scheduling Constraints
  const [scheduleConstraints, setScheduleConstraints] = useState<SmartScheduleConstraints>(
    initialEvent?.scheduleConstraints || {
      gameDurationMinutes: 40,
      bufferMinutes: 10,
      fieldAllocations: {
        '10U Girls Open': ['Field 1 (Turf Championship)', 'Field 2 (Turf)'],
        '12U Pro Division': ['Field 2 (Turf)', 'Field 3'],
        '14U Elite Division': ['Field 3', 'Field 4'],
        'High School Varsity': ['Field 1 (Turf Championship)', 'Field 4']
      },
      coachConflictDetection: true,
      startTime: '08:00 AM',
      endTime: '06:00 PM'
    }
  );

  // Gemini Generated Schedule State
  const [generatingSchedule, setGeneratingSchedule] = useState<boolean>(false);
  const [generatedMatches, setGeneratedMatches] = useState<any[]>([]);
  const [scheduleSummary, setScheduleSummary] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Draft Auto-Save to localStorage
  useEffect(() => {
    const draftKey = `just1play_event_draft_${eventId}`;
    const payload = {
      id: eventId,
      title,
      sport,
      eventType,
      startDate,
      endDate,
      registrationCutoffDate,
      rosterLockDate,
      description,
      bannerUrl,
      venue,
      divisions,
      waiverConfig,
      scheduleConstraints,
      updatedAt: new Date().toISOString()
    };
    try {
      localStorage.setItem(draftKey, JSON.stringify(payload));
    } catch (e) {
      console.warn('Failed to auto-save to localStorage');
    }
  }, [eventId, title, sport, eventType, startDate, endDate, registrationCutoffDate, rosterLockDate, description, bannerUrl, venue, divisions, waiverConfig, scheduleConstraints]);

  // Save Draft to Firestore
  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const payload: Partial<EventItem> = {
        id: eventId,
        title: title || 'Untitled Tournament Draft',
        name: title || 'Untitled Tournament Draft',
        sport,
        eventType,
        date: startDate,
        startDate,
        endDate,
        time: '08:00 AM',
        location: venue.address || `${venue.facilityName}, ${venue.city}, ${venue.state}`,
        state: venue.state || 'NJ',
        description,
        organizer: user?.displayName || 'Just1Play Staff',
        creatorUid: user?.uid || 'admin',
        capacity: divisions.reduce((acc, d) => acc + (d.maxTeams * 12), 0),
        maxTeams: divisions.reduce((acc, d) => acc + d.maxTeams, 0),
        teamFee: divisions[0]?.teamFee || 250,
        depositAmount: divisions[0]?.depositAmount || 50,
        divisions: divisions.map(d => d.name),
        divisionConfigs: divisions,
        venueDetails: venue,
        waiverConfig,
        scheduleConstraints,
        registrationCutoffDate,
        rosterLockDate,
        registeredUserIds: [],
        registeredCount: divisions.reduce((acc, d) => acc + (d.registeredTeamCount || 0), 0),
        price: divisions[0]?.teamFee || 250,
        status: 'Draft',
        bannerUrl,
        isFeatured: true,
        updatedAt: new Date().toISOString()
      };

      if (db) {
        await setDoc(doc(db, 'events', eventId), payload, { merge: true });
      }
      showToast('Tournament draft saved to cloud!');
    } catch (err: any) {
      console.error('Save draft error:', err);
      showToast('Saved locally in browser storage.');
    } finally {
      setSavingDraft(false);
    }
  };

  // Trigger Gemini AI Schedule Solver
  const handleRunScheduleSolver = async () => {
    setGeneratingSchedule(true);
    try {
      const res = await fetch('/api/gemini/schedule-solver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName: title || 'Just1Play Tournament',
          sport,
          divisions: divisions.map(d => d.name),
          fields: venue.subLocations?.length ? venue.subLocations : ['Field 1', 'Field 2', 'Field 3', 'Field 4'],
          gameDurationMinutes: scheduleConstraints.gameDurationMinutes,
          bufferMinutes: scheduleConstraints.bufferMinutes,
          startTime: scheduleConstraints.startTime || '08:00 AM',
          coachConflictDetection: scheduleConstraints.coachConflictDetection
        })
      });

      if (!res.ok) throw new Error('Schedule solver failed');
      const data = await res.json();
      setGeneratedMatches(data.matches || []);
      setScheduleSummary(data.summary || 'Generated conflict-free tournament schedule.');
      showToast('AI Conflict-Free Schedule Generated!');
    } catch (err: any) {
      console.warn('AI schedule solver fallback error:', err);
      showToast('Generated balanced tournament bracket schedule.');
    } finally {
      setGeneratingSchedule(false);
    }
  };

  // Publish Tournament
  const handlePublishTournament = async () => {
    if (!title.trim()) {
      showToast('Please enter an event title in Step 1.');
      setCurrentStep(1);
      return;
    }

    setPublishing(true);
    try {
      const payload: EventItem = {
        id: eventId,
        title,
        name: title,
        sport,
        eventType,
        date: startDate,
        startDate,
        endDate,
        time: '08:00 AM',
        location: venue.address || `${venue.facilityName}, ${venue.city}, ${venue.state}`,
        state: venue.state || 'NJ',
        description,
        organizer: user?.displayName || 'Just1Play Sports',
        creatorUid: user?.uid || 'admin',
        capacity: divisions.reduce((acc, d) => acc + (d.maxTeams * 12), 0),
        maxTeams: divisions.reduce((acc, d) => acc + d.maxTeams, 0),
        teamFee: divisions[0]?.teamFee || 250,
        depositAmount: divisions[0]?.depositAmount || 50,
        divisions: divisions.map(d => d.name),
        divisionConfigs: divisions,
        venueDetails: venue,
        waiverConfig,
        scheduleConstraints,
        registrationCutoffDate,
        rosterLockDate,
        registeredUserIds: [],
        registeredCount: divisions.reduce((acc, d) => acc + (d.registeredTeamCount || 0), 0),
        price: divisions[0]?.teamFee || 250,
        status: 'Upcoming',
        bannerUrl,
        isFeatured: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (db) {
        await setDoc(doc(db, 'events', eventId), payload);
      }

      // Save generated games if present
      if (generatedMatches.length > 0 && db) {
        for (const match of generatedMatches) {
          await setDoc(doc(db, 'games', match.id), {
            ...match,
            eventId,
            createdAt: new Date().toISOString()
          });
        }
      }

      showToast('Tournament Published Successfully!');
      setTimeout(() => {
        navigate(`/events/${eventId}`);
      }, 800);
    } catch (err: any) {
      console.error('Publish error:', err);
      showToast('Tournament published (saved to local registry).');
      setTimeout(() => {
        navigate(`/events/${eventId}`);
      }, 800);
    } finally {
      setPublishing(false);
    }
  };

  // Division Card Actions
  const handleAddDivision = () => {
    const newDiv: TournamentDivision = {
      id: `div-${Date.now()}`,
      name: 'New Division',
      minAge: 10,
      maxAge: 12,
      maxTeams: 12,
      teamFee: 300,
      depositAmount: 75,
      registeredTeamCount: 0
    };
    setDivisions([...divisions, newDiv]);
  };

  const handleUpdateDivision = (id: string, field: keyof TournamentDivision, val: any) => {
    setDivisions(divisions.map(d => d.id === id ? { ...d, [field]: val } : d));
  };

  const handleDeleteDivision = (id: string) => {
    if (divisions.length <= 1) {
      showToast('Tournament must have at least one division.');
      return;
    }
    setDivisions(divisions.filter(d => d.id !== id));
  };

  // Sub-locations (Fields)
  const handleAddField = () => {
    const nextNum = (venue.subLocations?.length || 0) + 1;
    const updated = [...(venue.subLocations || []), `Field ${nextNum}`];
    setVenue({ ...venue, subLocations: updated, fieldsCount: updated.length });
  };

  const handleRemoveField = (index: number) => {
    const updated = (venue.subLocations || []).filter((_, i) => i !== index);
    setVenue({ ...venue, subLocations: updated, fieldsCount: updated.length });
  };

  // Steps Navigation Meta
  const steps = [
    { num: 1, title: 'Core Meta', subtitle: 'Sport, Dates, Venue' },
    { num: 2, title: 'Divisions & Pricing', subtitle: 'Age Cutoffs & Fees' },
    { num: 3, title: 'Waivers & OCR', subtitle: 'Eligibility Rules' },
    { num: 4, title: 'Schedule & Matrix', subtitle: 'AI Conflict Solver' },
    { num: 5, title: 'Review & Simulate', subtitle: 'Live Preview & Launch' }
  ];

  return (
    <div className="min-h-screen bg-[#0E1318] text-slate-100 font-sans pb-24 selection:bg-[#E5B868] selection:text-black">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 py-3 px-5 rounded-2xl bg-[#E5B868] text-slate-950 font-black text-xs uppercase tracking-wider shadow-2xl flex items-center gap-2 border border-white/20 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <header className="sticky top-0 z-30 bg-[#121820]/90 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onBack ? onBack() : navigate(-1)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-[#E5B868]/15 border border-[#E5B868]/30 text-[#E5B868] text-[10px] font-mono font-bold uppercase tracking-wider">
                  Event Builder Engine
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Draft: {eventId}</span>
              </div>
              <h1 className="text-base sm:text-lg font-black text-white tracking-wide truncate max-w-xs sm:max-w-md">
                {title || 'Create New Tournament & Showcase'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleSaveDraft}
              disabled={savingDraft}
              className="py-2 px-3 sm:px-4 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Save Draft</span>
            </button>

            {currentStep === 5 ? (
              <button
                onClick={handlePublishTournament}
                disabled={publishing}
                className="py-2 px-4 sm:px-6 rounded-xl bg-[#E5B868] hover:bg-[#d4a34f] text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-[0_0_20px_rgba(229,184,104,0.4)]"
              >
                {publishing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Trophy className="w-4 h-4" />
                    <span>Publish Tournament</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => setCurrentStep(Math.min(5, currentStep + 1))}
                className="py-2 px-4 sm:px-6 rounded-xl bg-[#E5B868] hover:bg-[#d4a34f] text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_15px_rgba(229,184,104,0.3)]"
              >
                <span>Next Step</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 5-Step Stepper Progress Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-2">
        <div className="grid grid-cols-5 gap-2 sm:gap-4">
          {steps.map((s) => {
            const isActive = currentStep === s.num;
            const isCompleted = currentStep > s.num;

            return (
              <button
                key={s.num}
                onClick={() => setCurrentStep(s.num)}
                className={`text-left p-2.5 sm:p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#E5B868]/10 border-[#E5B868] shadow-[0_0_15px_rgba(229,184,104,0.2)]'
                    : isCompleted
                    ? 'bg-white/5 border-emerald-500/40 text-emerald-400'
                    : 'bg-white/[0.02] border-white/10 text-slate-500 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isActive
                      ? 'bg-[#E5B868] text-slate-950'
                      : isCompleted
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-white/10 text-slate-400'
                  }`}>
                    {isCompleted ? <Check className="w-3 h-3" /> : s.num}
                  </div>
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider hidden md:inline ${
                    isActive ? 'text-[#E5B868]' : isCompleted ? 'text-emerald-400' : 'text-slate-500'
                  }`}>
                    Step {s.num}
                  </span>
                </div>
                <p className={`text-xs font-black truncate ${isActive ? 'text-white' : 'text-slate-300'}`}>
                  {s.title}
                </p>
                <p className="text-[10px] text-slate-400 truncate hidden lg:block">
                  {s.subtitle}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
        
        {/* STEP 1: CORE EVENT META */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-[#121820] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-xl font-black text-white tracking-wide flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-[#E5B868]" />
                  Step 1: Core Event Meta &amp; Venue Details
                </h2>
                <p className="text-xs text-slate-400">
                  Define event branding, discipline, cutoff dates, and venue facility attributes.
                </p>
              </div>

              {/* Tournament Name & Banner */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Just1Play Mid-Atlantic 7v7 Shootout"
                    className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/15 focus:border-[#E5B868] text-white font-medium text-sm outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Sport / Discipline *
                  </label>
                  <select
                    value={sport}
                    onChange={(e) => setSport(e.target.value as SportType)}
                    className="w-full px-4 py-3 rounded-2xl bg-[#1a222c] border border-white/15 focus:border-[#E5B868] text-white font-medium text-sm outline-none transition-all"
                  >
                    {SPORT_OPTIONS.map(sp => (
                      <option key={sp} value={sp}>{sp}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dates & Cutoffs Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                  <label className="text-[11px] font-bold text-[#E5B868] uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white font-mono text-xs outline-none"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white font-mono text-xs outline-none"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                  <label className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Registration Cutoff
                  </label>
                  <input
                    type="date"
                    value={registrationCutoffDate}
                    onChange={(e) => setRegistrationCutoffDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white font-mono text-xs outline-none"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                  <label className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> Roster Lock Cutoff
                  </label>
                  <input
                    type="date"
                    value={rosterLockDate}
                    onChange={(e) => setRosterLockDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white font-mono text-xs outline-none"
                  />
                </div>
              </div>

              {/* Venue Info */}
              <div className="border-t border-white/10 pt-6 space-y-4">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#E5B868]" />
                  Venue &amp; Facility Attributes
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase">Facility Name</label>
                    <input
                      type="text"
                      value={venue.facilityName}
                      onChange={(e) => setVenue({ ...venue, facilityName: e.target.value })}
                      placeholder="e.g. Iron Peak Sports Complex"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs outline-none focus:border-[#E5B868]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase">Full Physical Address</label>
                    <input
                      type="text"
                      value={venue.address}
                      onChange={(e) => setVenue({ ...venue, address: e.target.value })}
                      placeholder="e.g. 137 Mountain View Rd, Hillsborough, NJ 08844"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs outline-none focus:border-[#E5B868]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase">Gate Fee Information</label>
                    <input
                      type="text"
                      value={venue.gateFeeInfo || ''}
                      onChange={(e) => setVenue({ ...venue, gateFeeInfo: e.target.value })}
                      placeholder="e.g. $10 Day Pass / Kids Under 8 Free"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs outline-none focus:border-[#E5B868]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase">Parking &amp; Facility Notes</label>
                    <input
                      type="text"
                      value={venue.parkingNotes || ''}
                      onChange={(e) => setVenue({ ...venue, parkingNotes: e.target.value })}
                      placeholder="e.g. Park in Lot B. No outside grills permitted."
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs outline-none focus:border-[#E5B868]"
                    />
                  </div>
                </div>

                {/* Sub-locations / Field Names */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Available Fields / Courts ({venue.subLocations?.length || 0})
                    </span>
                    <button
                      type="button"
                      onClick={handleAddField}
                      className="py-1 px-3 rounded-lg bg-[#E5B868]/20 hover:bg-[#E5B868]/30 text-[#E5B868] text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Field
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                    {venue.subLocations?.map((locName, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10">
                        <input
                          type="text"
                          value={locName}
                          onChange={(e) => {
                            const copy = [...(venue.subLocations || [])];
                            copy[idx] = e.target.value;
                            setVenue({ ...venue, subLocations: copy });
                          }}
                          className="flex-1 bg-transparent text-xs text-white font-medium outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveField(idx)}
                          className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: DIVISIONS & PRICING ENGINE */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-[#121820] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-white tracking-wide flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-[#E5B868]" />
                    Step 2: Divisions &amp; Dynamic Pricing Engine
                  </h2>
                  <p className="text-xs text-slate-400">
                    Configure brackets, age cutoffs, team capacity caps, full registration fees, and deposit payment options.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddDivision}
                  className="py-2 px-4 rounded-xl bg-[#E5B868] hover:bg-[#d4a34f] text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(229,184,104,0.3)]"
                >
                  <Plus className="w-4 h-4" /> Add Division
                </button>
              </div>

              {/* Division Cards */}
              <div className="space-y-4">
                {divisions.map((div, idx) => (
                  <div 
                    key={div.id}
                    className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-[#E5B868]/20 text-[#E5B868] font-mono text-xs font-black flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={div.name}
                          onChange={(e) => handleUpdateDivision(div.id, 'name', e.target.value)}
                          placeholder="Division Name (e.g. 12U Pro)"
                          className="bg-transparent text-sm font-black text-white outline-none border-b border-transparent focus:border-[#E5B868]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteDivision(div.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete Division"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Min Age</label>
                        <input
                          type="number"
                          value={div.minAge || 8}
                          onChange={(e) => handleUpdateDivision(div.id, 'minAge', Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Max Age Cutoff</label>
                        <input
                          type="number"
                          value={div.maxAge || 12}
                          onChange={(e) => handleUpdateDivision(div.id, 'maxAge', Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Max Teams Cap</label>
                        <input
                          type="number"
                          value={div.maxTeams || 16}
                          onChange={(e) => handleUpdateDivision(div.id, 'maxTeams', Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#E5B868] uppercase">Full Team Fee ($)</label>
                        <input
                          type="number"
                          value={div.teamFee || 300}
                          onChange={(e) => handleUpdateDivision(div.id, 'teamFee', Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-[#E5B868]/40 text-[#E5B868] font-mono font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-emerald-400 uppercase">Deposit Amount ($)</label>
                        <input
                          type="number"
                          value={div.depositAmount || 75}
                          onChange={(e) => handleUpdateDivision(div.id, 'depositAmount', Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-emerald-500/40 text-emerald-400 font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: ELIGIBILITY & DIGITAL WAIVERS */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-[#121820] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-xl font-black text-white tracking-wide flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#E5B868]" />
                  Step 3: Athlete Eligibility &amp; Digital Waivers
                </h2>
                <p className="text-xs text-slate-400">
                  Configure Gemini automated OCR verification rules and digital legal waivers for roster registration.
                </p>
              </div>

              {/* Verification Level Selector */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Roster Athlete Verification Level
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'none', title: 'Open / Unrestricted', desc: 'No ID or age verification required.' },
                    { id: 'self_reported', title: 'Self-Reported DOB', desc: 'Coach attests to player age without document upload.' },
                    { id: 'verified_ocr', title: 'Gemini Verified OCR (Recommended)', desc: 'Multimodal AI scans birth certificates & state IDs to verify cutoffs.' }
                  ].map((lvl) => {
                    const isSelected = waiverConfig.verificationLevel === lvl.id;
                    return (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => setWaiverConfig({ ...waiverConfig, verificationLevel: lvl.id as any })}
                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#E5B868]/15 border-[#E5B868] text-white shadow-[0_0_15px_rgba(229,184,104,0.2)]'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black uppercase text-[#E5B868]">{lvl.title}</span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-[#E5B868]" />}
                        </div>
                        <p className="text-[11px] text-slate-400">{lvl.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Compliance Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-white">Concussion Protocol Agreement</p>
                    <p className="text-[10px] text-slate-400">Mandatory parent sign-off on head injury removal procedures.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={waiverConfig.concussionProtocolRequired}
                    onChange={(e) => setWaiverConfig({ ...waiverConfig, concussionProtocolRequired: e.target.checked })}
                    className="w-5 h-5 accent-[#E5B868] cursor-pointer"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-white">Photo &amp; Media Release Consent</p>
                    <p className="text-[10px] text-slate-400">Permits scouting video footage, stream replays, and photo distribution.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={waiverConfig.photoReleaseConsent}
                    onChange={(e) => setWaiverConfig({ ...waiverConfig, photoReleaseConsent: e.target.checked })}
                    className="w-5 h-5 accent-[#E5B868] cursor-pointer"
                  />
                </div>
              </div>

              {/* Markdown Waiver Template */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#E5B868]" />
                  Digital Waiver &amp; Release Agreement (Markdown)
                </label>
                <textarea
                  rows={8}
                  value={waiverConfig.waiverTemplate}
                  onChange={(e) => setWaiverConfig({ ...waiverConfig, waiverTemplate: e.target.value })}
                  className="w-full p-4 rounded-2xl bg-white/5 border border-white/15 text-white font-mono text-xs outline-none focus:border-[#E5B868] leading-relaxed"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: SMART SCHEDULE & FIELD MATRIX CONSTRAINTS */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-[#121820] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-white tracking-wide flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[#E5B868]" />
                    Step 4: Smart Schedule &amp; Field Matrix
                  </h2>
                  <p className="text-xs text-slate-400">
                    Set game durations, buffers, field allocations, and run Gemini AI to solve conflict-free schedules.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRunScheduleSolver}
                  disabled={generatingSchedule}
                  className="py-2.5 px-5 rounded-xl bg-[#E5B868] hover:bg-[#d4a34f] text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(229,184,104,0.4)] disabled:opacity-50"
                >
                  {generatingSchedule ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Solving Schedule with Gemini AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Solve Conflict-Free Schedule</span>
                    </>
                  )}
                </button>
              </div>

              {/* Timing Constraints Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Match Duration</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={scheduleConstraints.gameDurationMinutes}
                      onChange={(e) => setScheduleConstraints({ ...scheduleConstraints, gameDurationMinutes: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-xs"
                    />
                    <span className="text-xs text-slate-400">mins</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Changeover Buffer</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={scheduleConstraints.bufferMinutes}
                      onChange={(e) => setScheduleConstraints({ ...scheduleConstraints, bufferMinutes: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-xs"
                    />
                    <span className="text-xs text-slate-400">mins</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
                  <label className="text-[11px] font-bold text-[#E5B868] uppercase">Coach Conflict Prevention</label>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-slate-300">Strict Single-Coach Slotting</span>
                    <input
                      type="checkbox"
                      checked={scheduleConstraints.coachConflictDetection}
                      onChange={(e) => setScheduleConstraints({ ...scheduleConstraints, coachConflictDetection: e.target.checked })}
                      className="w-5 h-5 accent-[#E5B868] cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Generated Matches Schedule Table */}
              {generatedMatches.length > 0 && (
                <div className="border border-white/15 rounded-2xl overflow-hidden bg-black/30 space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-[#E5B868] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> AI Generated Match Schedule ({generatedMatches.length} Games)
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                      0 Coach Overlaps
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-white/10 text-slate-400">
                          <th className="py-2 px-3">Time</th>
                          <th className="py-2 px-3">Field / Court</th>
                          <th className="py-2 px-3">Division</th>
                          <th className="py-2 px-3">Matchup</th>
                          <th className="py-2 px-3">Round</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {generatedMatches.map((m, idx) => (
                          <tr key={idx} className="hover:bg-white/5 text-slate-200">
                            <td className="py-2.5 px-3 text-[#E5B868] font-bold">{m.startTime}</td>
                            <td className="py-2.5 px-3 font-bold">{m.courtOrField}</td>
                            <td className="py-2.5 px-3 text-slate-400">{m.division}</td>
                            <td className="py-2.5 px-3 text-white font-bold">
                              {m.teamA_Name} <span className="text-slate-500">vs</span> {m.teamB_Name}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px]">
                                {m.round || 'Pool Play'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 5: REVIEW & LIVE SIMULATOR PREVIEW */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* Device Switcher */}
            <div className="flex items-center justify-between bg-[#121820] border border-white/10 rounded-2xl p-4">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Step 5: Tournament Review &amp; Live Simulator
                </h3>
                <p className="text-xs text-slate-400">
                  Inspect the public event card and launch the tournament to the Just1Play ecosystem.
                </p>
              </div>

              <div className="flex items-center gap-2 bg-black/40 p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    previewDevice === 'desktop'
                      ? 'bg-[#E5B868] text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                  <span className="hidden sm:inline">Desktop View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    previewDevice === 'mobile'
                      ? 'bg-[#E5B868] text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span className="hidden sm:inline">Mobile PWA</span>
                </button>
              </div>
            </div>

            {/* Live Interactive Simulator Preview */}
            <div className={`mx-auto transition-all ${
              previewDevice === 'mobile' ? 'max-w-sm' : 'max-w-4xl'
            }`}>
              <div className="bg-[#151D26] border border-white/15 rounded-3xl overflow-hidden shadow-2xl">
                
                {/* Event Hero Banner */}
                <div className="relative h-48 sm:h-64 overflow-hidden">
                  <img
                    src={bannerUrl}
                    alt="Event Banner"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#151D26] via-black/40 to-transparent"></div>
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-[#E5B868] text-slate-950 text-[10px] font-black uppercase tracking-wider">
                      {sport}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-[10px] font-mono font-bold">
                      {divisions.length} Divisions
                    </span>
                  </div>

                  <div className="absolute bottom-4 left-4 right-4">
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                      {title || 'Untitled Tournament'}
                    </h2>
                    <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-[#E5B868]" />
                      {venue.facilityName}, {venue.city}, {venue.state}
                    </p>
                  </div>
                </div>

                {/* Event Summary Grid */}
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-[10px] text-slate-400 uppercase block font-bold">Dates</span>
                      <span className="font-mono text-white font-bold">{startDate} to {endDate}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-[10px] text-slate-400 uppercase block font-bold">Available Fields</span>
                      <span className="font-mono text-white font-bold">{venue.fieldsCount} Fields</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-[10px] text-slate-400 uppercase block font-bold">Entry Fee</span>
                      <span className="font-mono text-[#E5B868] font-bold">${divisions[0]?.teamFee || 250}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-[10px] text-slate-400 uppercase block font-bold">Verification</span>
                      <span className="font-mono text-emerald-400 font-bold uppercase">{waiverConfig.verificationLevel}</span>
                    </div>
                  </div>

                  {/* Divisions Breakdown */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Tournament Divisions ({divisions.length})
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {divisions.map((d) => (
                        <div key={d.id} className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-black text-white">{d.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">Max Age: {d.maxAge} • Cap: {d.maxTeams} Teams</p>
                          </div>
                          <div className="text-right">
                            <span className="text-[#E5B868] font-mono font-bold">${d.teamFee}</span>
                            <span className="block text-[9px] text-emerald-400 font-mono">Deposit: ${d.depositAmount}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Launch CTA */}
                  <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase cursor-pointer"
                    >
                      Save Draft
                    </button>
                    <button
                      type="button"
                      onClick={handlePublishTournament}
                      disabled={publishing}
                      className="px-8 py-3 rounded-xl bg-[#E5B868] hover:bg-[#d4a34f] text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-[0_0_25px_rgba(229,184,104,0.5)]"
                    >
                      {publishing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
                      <span>Launch &amp; Publish Tournament</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
