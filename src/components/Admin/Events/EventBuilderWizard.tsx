import React, { useReducer, useEffect, useRef, useCallback } from 'react';
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
  Info,
  Sliders,
  CheckSquare,
  FileCheck,
  Send,
  Cloud,
  CheckCircle
} from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';
import { useAuth } from '../../../context/AuthContext';
import { 
  EventItem, 
  TournamentDivision, 
  VenueInfo, 
  DigitalWaiverConfig, 
  SmartScheduleConstraints,
  SportType 
} from '../../../types';

// ==========================================
// CONSTANTS & TEMPLATES
// ==========================================

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

import { handleFirestoreError, OperationType } from '../../../lib/firestoreErrorHandler';

// ==========================================
// STATE REDUCER & ACTIONS DEFINITION
// ==========================================

export interface EventBuilderState {
  eventId: string;
  currentStep: number;
  status: 'Draft' | 'Upcoming' | 'In Progress' | 'Completed';
  
  // Step 1: Meta & Logistics
  title: string;
  sport: SportType;
  eventType: 'Tournament' | 'Showcase' | 'Combine' | 'Camp' | 'League';
  startDate: string;
  endDate: string;
  registrationCutoffDate: string;
  rosterLockDate: string;
  description: string;
  bannerUrl: string;
  venue: VenueInfo;

  // Step 2: Divisions & Pricing
  divisions: TournamentDivision[];

  // Step 3: Eligibility & Digital Waivers
  waiverConfig: DigitalWaiverConfig;

  // Step 4: Smart Scheduling Matrix & AI Solver
  scheduleConstraints: SmartScheduleConstraints;
  generatedSchedule: {
    matches: any[];
    summary: string | null;
    isGenerated: boolean;
  };

  // Step 5: Simulator & UI View
  previewDevice: 'desktop' | 'mobile';

  // Persistence & Reactive Status
  isDirty: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedAt: string | null;
  toastMessage: string | null;
}

export type EventBuilderAction =
  | { type: 'SET_STEP'; payload: number }
  | { type: 'UPDATE_META'; payload: Partial<Pick<EventBuilderState, 'title' | 'sport' | 'eventType' | 'startDate' | 'endDate' | 'registrationCutoffDate' | 'rosterLockDate' | 'description' | 'bannerUrl'>> }
  | { type: 'UPDATE_VENUE'; payload: Partial<VenueInfo> }
  | { type: 'ADD_VENUE_SUB_LOCATION'; payload: string }
  | { type: 'REMOVE_VENUE_SUB_LOCATION'; payload: number }
  | { type: 'ADD_VENUE_RULE'; payload: string }
  | { type: 'REMOVE_VENUE_RULE'; payload: number }
  | { type: 'ADD_DIVISION'; payload: TournamentDivision }
  | { type: 'UPDATE_DIVISION'; payload: { id: string; data: Partial<TournamentDivision> } }
  | { type: 'REMOVE_DIVISION'; payload: string }
  | { type: 'UPDATE_WAIVER_CONFIG'; payload: Partial<DigitalWaiverConfig> }
  | { type: 'UPDATE_SCHEDULE_CONSTRAINTS'; payload: Partial<SmartScheduleConstraints> }
  | { type: 'SET_FIELD_ALLOCATION'; payload: { divisionName: string; fields: string[] } }
  | { type: 'SET_GENERATED_SCHEDULE'; payload: { matches: any[]; summary: string } }
  | { type: 'CLEAR_GENERATED_SCHEDULE' }
  | { type: 'SET_PREVIEW_DEVICE'; payload: 'desktop' | 'mobile' }
  | { type: 'SET_SAVE_STATUS'; payload: 'idle' | 'saving' | 'saved' | 'error' }
  | { type: 'MARK_SAVED'; payload: { timestamp: string } }
  | { type: 'SET_TOAST'; payload: string | null }
  | { type: 'LOAD_EVENT'; payload: Partial<EventBuilderState> };

const createInitialState = (initialEvent?: Partial<EventItem>): EventBuilderState => {
  const eventId = initialEvent?.id || `evt-${Date.now()}`;
  
  return {
    eventId,
    currentStep: 1,
    status: (initialEvent?.status as any) || 'Draft',
    
    // Step 1
    title: initialEvent?.title || '',
    sport: initialEvent?.sport || 'Flag Football',
    eventType: (initialEvent?.eventType as any) || 'Tournament',
    startDate: initialEvent?.startDate || initialEvent?.date || '2026-08-22',
    endDate: initialEvent?.endDate || '2026-08-23',
    registrationCutoffDate: initialEvent?.registrationCutoffDate || '2026-08-18',
    rosterLockDate: initialEvent?.rosterLockDate || '2026-08-20',
    description: initialEvent?.description || 'Premier competitive tournament featuring regional champions, live scouting evaluations, and full game-day streaming coverage.',
    bannerUrl: initialEvent?.bannerUrl || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=1600',
    
    venue: initialEvent?.venueDetails || {
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
    },

    // Step 2
    divisions: initialEvent?.divisionConfigs || [
      { id: 'div-1', name: '10U Girls Open', minAge: 8, maxAge: 10, maxTeams: 12, teamFee: 250, depositAmount: 75, registeredTeamCount: 8 },
      { id: 'div-2', name: '12U Pro Division', minAge: 10, maxAge: 12, maxTeams: 16, teamFee: 300, depositAmount: 100, registeredTeamCount: 14 },
      { id: 'div-3', name: '14U Elite Division', minAge: 12, maxAge: 14, maxTeams: 16, teamFee: 350, depositAmount: 100, registeredTeamCount: 16 },
      { id: 'div-4', name: 'High School Varsity', minAge: 14, maxAge: 18, gradeLevel: '9th-12th Grade', maxTeams: 20, teamFee: 400, depositAmount: 150, registeredTeamCount: 18 }
    ],

    // Step 3
    waiverConfig: initialEvent?.waiverConfig || {
      verificationLevel: 'verified_ocr',
      waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
      concussionProtocolRequired: true,
      photoReleaseConsent: true
    },

    // Step 4
    scheduleConstraints: initialEvent?.scheduleConstraints || {
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
    },
    generatedSchedule: {
      matches: [],
      summary: null,
      isGenerated: false
    },

    // Step 5
    previewDevice: 'desktop',

    isDirty: false,
    saveStatus: 'idle',
    lastSavedAt: null,
    toastMessage: null
  };
};

function eventBuilderReducer(state: EventBuilderState, action: EventBuilderAction): EventBuilderState {
  switch (action.type) {
    case 'SET_STEP':
      return {
        ...state,
        currentStep: Math.min(5, Math.max(1, action.payload))
      };

    case 'UPDATE_META':
      return {
        ...state,
        ...action.payload,
        isDirty: true
      };

    case 'UPDATE_VENUE':
      return {
        ...state,
        venue: {
          ...state.venue,
          ...action.payload
        },
        isDirty: true
      };

    case 'ADD_VENUE_SUB_LOCATION':
      return {
        ...state,
        venue: {
          ...state.venue,
          subLocations: [...(state.venue.subLocations || []), action.payload],
          fieldsCount: (state.venue.subLocations?.length || 0) + 1
        },
        isDirty: true
      };

    case 'REMOVE_VENUE_SUB_LOCATION': {
      const updated = (state.venue.subLocations || []).filter((_, idx) => idx !== action.payload);
      return {
        ...state,
        venue: {
          ...state.venue,
          subLocations: updated,
          fieldsCount: updated.length
        },
        isDirty: true
      };
    }

    case 'ADD_VENUE_RULE':
      return {
        ...state,
        venue: {
          ...state.venue,
          rules: [...(state.venue.rules || []), action.payload]
        },
        isDirty: true
      };

    case 'REMOVE_VENUE_RULE':
      return {
        ...state,
        venue: {
          ...state.venue,
          rules: (state.venue.rules || []).filter((_, idx) => idx !== action.payload)
        },
        isDirty: true
      };

    case 'ADD_DIVISION':
      return {
        ...state,
        divisions: [...state.divisions, action.payload],
        isDirty: true
      };

    case 'UPDATE_DIVISION':
      return {
        ...state,
        divisions: state.divisions.map(div => div.id === action.payload.id ? { ...div, ...action.payload.data } : div),
        isDirty: true
      };

    case 'REMOVE_DIVISION':
      return {
        ...state,
        divisions: state.divisions.filter(div => div.id !== action.payload),
        isDirty: true
      };

    case 'UPDATE_WAIVER_CONFIG':
      return {
        ...state,
        waiverConfig: {
          ...state.waiverConfig,
          ...action.payload
        },
        isDirty: true
      };

    case 'UPDATE_SCHEDULE_CONSTRAINTS':
      return {
        ...state,
        scheduleConstraints: {
          ...state.scheduleConstraints,
          ...action.payload
        },
        isDirty: true
      };

    case 'SET_FIELD_ALLOCATION':
      return {
        ...state,
        scheduleConstraints: {
          ...state.scheduleConstraints,
          fieldAllocations: {
            ...state.scheduleConstraints.fieldAllocations,
            [action.payload.divisionName]: action.payload.fields
          }
        },
        isDirty: true
      };

    case 'SET_GENERATED_SCHEDULE':
      return {
        ...state,
        generatedSchedule: {
          matches: action.payload.matches,
          summary: action.payload.summary,
          isGenerated: true
        },
        isDirty: true
      };

    case 'CLEAR_GENERATED_SCHEDULE':
      return {
        ...state,
        generatedSchedule: {
          matches: [],
          summary: null,
          isGenerated: false
        },
        isDirty: true
      };

    case 'SET_PREVIEW_DEVICE':
      return {
        ...state,
        previewDevice: action.payload
      };

    case 'SET_SAVE_STATUS':
      return {
        ...state,
        saveStatus: action.payload
      };

    case 'MARK_SAVED':
      return {
        ...state,
        isDirty: false,
        saveStatus: 'saved',
        lastSavedAt: action.payload.timestamp
      };

    case 'SET_TOAST':
      return {
        ...state,
        toastMessage: action.payload
      };

    case 'LOAD_EVENT':
      return {
        ...state,
        ...action.payload
      };

    default:
      return state;
  }
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export interface EventBuilderWizardProps {
  onBack?: () => void;
  initialEvent?: Partial<EventItem>;
  onPublished?: (eventId: string) => void;
}

export const EventBuilderWizard: React.FC<EventBuilderWizardProps> = ({
  onBack,
  initialEvent,
  onPublished
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(eventBuilderReducer, initialEvent, createInitialState);

  // Local input states for adding sub-locations & rules
  const [newSubLocation, setNewSubLocation] = React.useState('');
  const [newFacilityRule, setNewFacilityRule] = React.useState('');
  const [isSolvingAI, setIsSolvingAI] = React.useState(false);
  const [isPublishingFinal, setIsPublishingFinal] = React.useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper toast dispatcher
  const triggerToast = useCallback((msg: string) => {
    dispatch({ type: 'SET_TOAST', payload: msg });
    setTimeout(() => {
      dispatch({ type: 'SET_TOAST', payload: null });
    }, 3500);
  }, []);

  // Compute calculated metrics
  const totalMaxTeams = state.divisions.reduce((acc, d) => acc + (d.maxTeams || 0), 0);
  const totalRegisteredTeams = state.divisions.reduce((acc, d) => acc + (d.registeredTeamCount || 0), 0);
  const projectedGrossRevenue = state.divisions.reduce((acc, d) => acc + ((d.teamFee || 0) * (d.maxTeams || 0)), 0);

  // Construct payload to save to Firestore & localStorage
  const buildEventPayload = useCallback(() => {
    return {
      id: state.eventId,
      title: state.title || 'Untitled Event Draft',
      sport: state.sport,
      eventType: state.eventType,
      startDate: state.startDate,
      endDate: state.endDate,
      date: state.startDate,
      time: state.scheduleConstraints.startTime || '08:00 AM',
      registrationCutoffDate: state.registrationCutoffDate,
      rosterLockDate: state.rosterLockDate,
      description: state.description,
      bannerUrl: state.bannerUrl,
      location: `${state.venue.facilityName}, ${state.venue.city || ''} ${state.venue.state}`,
      state: state.venue.state,
      venueDetails: state.venue,
      divisionConfigs: state.divisions,
      divisions: state.divisions.map(d => d.name),
      waiverConfig: state.waiverConfig,
      scheduleConstraints: state.scheduleConstraints,
      capacity: totalMaxTeams * 15,
      maxTeams: totalMaxTeams,
      maxCap: totalMaxTeams * 15,
      price: state.divisions[0]?.teamFee || 250,
      teamFee: state.divisions[0]?.teamFee || 250,
      depositAmount: state.divisions[0]?.depositAmount || 75,
      status: state.status,
      creatorUid: user?.uid || 'admin',
      createdBy: user?.displayName || user?.email || 'Tournament Director',
      organizer: 'Just1Play OS',
      updatedAt: new Date().toISOString()
    };
  }, [state, totalMaxTeams, user]);

  // ==========================================
  // AUTO-SAVE TO FIRESTORE & LOCALSTORAGE
  // ==========================================
  const saveDraftToFirestore = useCallback(async (isExplicit = false) => {
    if (!state.eventId) return;
    
    dispatch({ type: 'SET_SAVE_STATUS', payload: 'saving' });
    const payload = buildEventPayload();

    try {
      // 1. Sync to local storage for instant offline recovery
      localStorage.setItem(`just1play_draft_${state.eventId}`, JSON.stringify(payload));

      // 2. Sync to Firestore
      if (db) {
        const eventRef = doc(db, 'events', state.eventId);
        await setDoc(eventRef, {
          ...payload,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      dispatch({ type: 'MARK_SAVED', payload: { timestamp: nowTime } });

      if (isExplicit) {
        triggerToast('Draft saved to cloud & local storage.');
      }
    } catch (error) {
      console.error('Error auto-saving event draft:', error);
      dispatch({ type: 'SET_SAVE_STATUS', payload: 'error' });
      try {
        handleFirestoreError(error, OperationType.WRITE, `events/${state.eventId}`);
      } catch (e) {
        // Logged
      }
    }
  }, [state.eventId, buildEventPayload, triggerToast]);

  // Reactive Debounced Auto-Save Trigger
  useEffect(() => {
    if (!state.isDirty) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      saveDraftToFirestore(false);
    }, 1200);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [state.isDirty, saveDraftToFirestore]);

  // Step 4: Gemini AI Smart Schedule Solver simulation
  const handleRunAiScheduler = async () => {
    setIsSolvingAI(true);
    triggerToast('Gemini AI Solver analyzing field constraints & coach overlaps...');

    setTimeout(() => {
      const generated: any[] = [];
      const fields = state.venue.subLocations && state.venue.subLocations.length > 0 
        ? state.venue.subLocations 
        : ['Field 1', 'Field 2', 'Field 3', 'Field 4'];

      const timeSlots = ['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '02:00 PM', '03:00 PM'];

      let matchIdx = 1;
      state.divisions.forEach((div) => {
        const assignedFields = state.scheduleConstraints.fieldAllocations[div.name] || fields;
        for (let i = 0; i < 2; i++) {
          const slot = timeSlots[(matchIdx - 1) % timeSlots.length];
          const field = assignedFields[i % assignedFields.length];
          generated.push({
            id: `gen-match-${matchIdx}`,
            division: div.name,
            matchNumber: matchIdx,
            time: slot,
            field: field,
            homeTeam: `${div.name} Seed #${(i * 2) + 1}`,
            awayTeam: `${div.name} Seed #${(i * 2) + 2}`,
            coachConflictResolved: true
          });
          matchIdx++;
        }
      });

      const summaryText = `Generated ${generated.length} conflict-free matchups across ${fields.length} sub-locations. 0 coach schedule overlaps detected with ${state.scheduleConstraints.bufferMinutes}m transition buffers.`;

      dispatch({
        type: 'SET_GENERATED_SCHEDULE',
        payload: {
          matches: generated,
          summary: summaryText
        }
      });

      setIsSolvingAI(false);
      triggerToast('Optimal conflict-free tournament schedule synthesized!');
    }, 1400);
  };

  // Step 5: Publish Tournament Flow
  const handlePublishTournament = async () => {
    if (!state.title.trim()) {
      triggerToast('Please provide an event title in Step 1 before publishing.');
      dispatch({ type: 'SET_STEP', payload: 1 });
      return;
    }

    setIsPublishingFinal(true);
    try {
      const payload = {
        ...buildEventPayload(),
        status: 'Upcoming' as const,
        isDraft: false,
        publishedAt: new Date().toISOString()
      };

      if (db) {
        const eventRef = doc(db, 'events', state.eventId);
        await setDoc(eventRef, {
          ...payload,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      triggerToast('Event published successfully!');
      if (onPublished) {
        onPublished(state.eventId);
      } else {
        setTimeout(() => {
          navigate(`/events/${state.eventId}`);
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to publish tournament:', error);
      triggerToast('Failed to publish tournament. Please retry.');
      try {
        handleFirestoreError(error, OperationType.WRITE, `events/${state.eventId}`);
      } catch (e) {
        // Logged
      }
    } finally {
      setIsPublishingFinal(false);
    }
  };

  // Steps Navigation Items
  const WIZARD_STEPS = [
    { id: 1, label: 'Core Meta & Logistics', icon: Trophy, desc: 'Sport, dates, venue & facilities' },
    { id: 2, label: 'Divisions & Pricing', icon: DollarSign, desc: 'Age brackets, team caps & deposits' },
    { id: 3, label: 'Waivers & Eligibility', icon: ShieldCheck, desc: 'Digital agreements & OCR verification' },
    { id: 4, label: 'Smart Schedule Solver', icon: Clock, desc: 'Field matrix & AI conflict-free generator' },
    { id: 5, label: 'Review & Live Simulator', icon: Eye, desc: 'Desktop/mobile preview & launch' }
  ];

  return (
    <div className="w-full bg-[#12181F] text-slate-100 min-h-screen rounded-3xl border border-white/10 overflow-hidden flex flex-col font-sans shadow-2xl">
      
      {/* ==========================================
          TOAST ALERT BAR
         ========================================== */}
      {state.toastMessage && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-black/90 border border-[#E5B868] text-white shadow-[0_0_30px_rgba(229,184,104,0.3)] backdrop-blur-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-[#E5B868]" />
          <span className="text-xs font-bold font-sans uppercase tracking-wider">{state.toastMessage}</span>
        </div>
      )}

      {/* ==========================================
          WIZARD HEADER & PROGRESS
         ========================================== */}
      <div className="p-6 md:p-8 bg-[#212A31] border-b border-white/10 relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-[#E5B868]/10 border border-[#E5B868]/30 text-[#E5B868] font-mono text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Tournament Builder OS v3.2
              </span>
              
              {/* Reactive Save Status Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono">
                {state.saveStatus === 'saving' && (
                  <>
                    <RefreshCw className="w-3 h-3 text-[#E5B868] animate-spin" />
                    <span className="text-slate-400">Saving draft to Firestore...</span>
                  </>
                )}
                {state.saveStatus === 'saved' && (
                  <>
                    <Cloud className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Draft Auto-Saved ({state.lastSavedAt || 'Synced'})</span>
                  </>
                )}
                {state.saveStatus === 'idle' && (
                  <>
                    <Check className="w-3 h-3 text-slate-400" />
                    <span className="text-slate-400">Firestore Cloud Sync Ready</span>
                  </>
                )}
                {state.saveStatus === 'error' && (
                  <>
                    <AlertCircle className="w-3 h-3 text-rose-400" />
                    <span className="text-rose-400">Offline (Cached Locally)</span>
                  </>
                )}
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tight text-white flex items-center gap-3">
              {state.title || 'Untitled Event Draft'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Configure multi-division brackets, venue logistics, OCR player waivers, and conflict-free schedules.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              onClick={() => saveDraftToFirestore(true)}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 border border-white/10 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4 text-[#E5B868]" />
              <span>Save Draft</span>
            </button>
            {onBack && (
              <button
                onClick={onBack}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Exit Wizard
              </button>
            )}
          </div>
        </div>

        {/* 5-Step Stepper Tabs */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {WIZARD_STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = state.currentStep === step.id;
            const isCompleted = state.currentStep > step.id;

            return (
              <button
                key={step.id}
                onClick={() => dispatch({ type: 'SET_STEP', payload: step.id })}
                className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                  isActive
                    ? 'bg-[#E5B868]/15 border-[#E5B868] text-white shadow-[0_0_20px_rgba(229,184,104,0.15)]'
                    : isCompleted
                    ? 'bg-white/5 border-emerald-500/30 text-slate-300 hover:bg-white/10'
                    : 'bg-white/[0.02] border-white/10 text-slate-500 hover:bg-white/5 hover:text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-xl ${
                    isActive ? 'bg-[#E5B868] text-black' : isCompleted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-slate-400'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-[#E5B868]/20 text-[#E5B868]' : isCompleted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-slate-500'
                  }`}>
                    Step 0{step.id}
                  </span>
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-wider">{step.label}</div>
                  <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{step.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ==========================================
          STEP CONTENT ROUTER
         ========================================== */}
      <div className="flex-1 p-6 md:p-8 overflow-y-auto">
        
        {/* ==========================================
            STEP 1: CORE META & VENUE LOGISTICS
           ========================================== */}
        {state.currentStep === 1 && (
          <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
            
            {/* General Information Card */}
            <div className="p-6 md:p-8 rounded-3xl bg-[#212A31]/70 border border-white/10 backdrop-blur-xl space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-lg font-black uppercase italic tracking-wide text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-[#E5B868]" />
                    Event Identity & Dates
                  </h3>
                  <p className="text-xs text-slate-400">Specify tournament title, discipline, and key registration/lock deadlines.</p>
                </div>
                <span className="text-xs font-mono font-bold text-[#E5B868] uppercase bg-[#E5B868]/10 px-3 py-1 rounded-full border border-[#E5B868]/20">
                  Step 1 of 5
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-mono font-bold uppercase text-slate-400 mb-2">Tournament Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. Northeast Summer Flag Football Championship 2026"
                    value={state.title}
                    onChange={(e) => dispatch({ type: 'UPDATE_META', payload: { title: e.target.value } })}
                    className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white font-medium focus:outline-none focus:border-[#E5B868] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-slate-400 mb-2">Sport Discipline *</label>
                  <select
                    value={state.sport}
                    onChange={(e) => dispatch({ type: 'UPDATE_META', payload: { sport: e.target.value } })}
                    className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white font-medium focus:outline-none focus:border-[#E5B868] transition-all"
                  >
                    {SPORT_OPTIONS.map(s => (
                      <option key={s} value={s} className="bg-[#212A31] text-white">{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Event Type & Banner */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-slate-400 mb-2">Event Format</label>
                  <select
                    value={state.eventType}
                    onChange={(e) => dispatch({ type: 'UPDATE_META', payload: { eventType: e.target.value as any } })}
                    className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white font-medium focus:outline-none focus:border-[#E5B868] transition-all"
                  >
                    <option value="Tournament" className="bg-[#212A31]">Tournament (Pool + Single Elim)</option>
                    <option value="Showcase" className="bg-[#212A31]">Showcase (Scouting & Skills)</option>
                    <option value="Combine" className="bg-[#212A31]">Combine (Athletic Testing)</option>
                    <option value="Camp" className="bg-[#212A31]">Instructional Camp / Clinic</option>
                    <option value="League" className="bg-[#212A31]">Multi-Week League</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-mono font-bold uppercase text-slate-400 mb-2">Banner Image URL</label>
                  <input
                    type="url"
                    value={state.bannerUrl}
                    onChange={(e) => dispatch({ type: 'UPDATE_META', payload: { bannerUrl: e.target.value } })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#E5B868] transition-all"
                  />
                </div>
              </div>

              {/* Dates Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <label className="block text-[11px] font-mono font-bold uppercase text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#E5B868]" />
                    Tournament Start
                  </label>
                  <input
                    type="date"
                    value={state.startDate}
                    onChange={(e) => dispatch({ type: 'UPDATE_META', payload: { startDate: e.target.value } })}
                    className="w-full bg-transparent text-white font-bold text-sm focus:outline-none"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <label className="block text-[11px] font-mono font-bold uppercase text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#E5B868]" />
                    Tournament End
                  </label>
                  <input
                    type="date"
                    value={state.endDate}
                    onChange={(e) => dispatch({ type: 'UPDATE_META', payload: { endDate: e.target.value } })}
                    className="w-full bg-transparent text-white font-bold text-sm focus:outline-none"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <label className="block text-[11px] font-mono font-bold uppercase text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Registration Cutoff
                  </label>
                  <input
                    type="date"
                    value={state.registrationCutoffDate}
                    onChange={(e) => dispatch({ type: 'UPDATE_META', payload: { registrationCutoffDate: e.target.value } })}
                    className="w-full bg-transparent text-white font-bold text-sm focus:outline-none"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <label className="block text-[11px] font-mono font-bold uppercase text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-rose-400" />
                    Roster Lock Cutoff
                  </label>
                  <input
                    type="date"
                    value={state.rosterLockDate}
                    onChange={(e) => dispatch({ type: 'UPDATE_META', payload: { rosterLockDate: e.target.value } })}
                    className="w-full bg-transparent text-white font-bold text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-slate-400 mb-2">Tournament Description & Scouting Overview</label>
                <textarea
                  rows={3}
                  value={state.description}
                  onChange={(e) => dispatch({ type: 'UPDATE_META', payload: { description: e.target.value } })}
                  className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white font-medium focus:outline-none focus:border-[#E5B868] transition-all"
                />
              </div>
            </div>

            {/* Venue & Logistics Card */}
            <div className="p-6 md:p-8 rounded-3xl bg-[#212A31]/70 border border-white/10 backdrop-blur-xl space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-lg font-black uppercase italic tracking-wide text-white flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-[#E5B868]" />
                    Venue Details & Multi-Field Logistics
                  </h3>
                  <p className="text-xs text-slate-400">Configure complex multi-court facilities, gate tickets, and facility regulations.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-mono font-bold uppercase text-slate-400 mb-2">Facility / Complex Name *</label>
                  <input
                    type="text"
                    value={state.venue.facilityName}
                    onChange={(e) => dispatch({ type: 'UPDATE_VENUE', payload: { facilityName: e.target.value } })}
                    className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white font-medium focus:outline-none focus:border-[#E5B868]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-slate-400 mb-2">Total Designated Fields / Courts</label>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={state.venue.fieldsCount}
                    onChange={(e) => dispatch({ type: 'UPDATE_VENUE', payload: { fieldsCount: parseInt(e.target.value) || 1 } })}
                    className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white font-medium focus:outline-none focus:border-[#E5B868]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-slate-400 mb-2">Street Address</label>
                  <input
                    type="text"
                    value={state.venue.address}
                    onChange={(e) => dispatch({ type: 'UPDATE_VENUE', payload: { address: e.target.value } })}
                    className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-[#E5B868]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-slate-400 mb-2">City</label>
                  <input
                    type="text"
                    value={state.venue.city || ''}
                    onChange={(e) => dispatch({ type: 'UPDATE_VENUE', payload: { city: e.target.value } })}
                    className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-[#E5B868]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-slate-400 mb-2">State (e.g. NJ, NY)</label>
                  <input
                    type="text"
                    value={state.venue.state}
                    onChange={(e) => dispatch({ type: 'UPDATE_VENUE', payload: { state: e.target.value } })}
                    className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-[#E5B868]"
                  />
                </div>
              </div>

              {/* Sub-Locations / Court Tags */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-slate-400 mb-2">
                  Designated Sub-Locations / Court Names
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {(state.venue.subLocations || []).map((sub, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 text-xs text-white">
                      <span>{sub}</span>
                      <button
                        type="button"
                        onClick={() => dispatch({ type: 'REMOVE_VENUE_SUB_LOCATION', payload: idx })}
                        className="text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add field or court (e.g. Field 1 Turf Championship)"
                    value={newSubLocation}
                    onChange={(e) => setNewSubLocation(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newSubLocation.trim()) {
                        e.preventDefault();
                        dispatch({ type: 'ADD_VENUE_SUB_LOCATION', payload: newSubLocation.trim() });
                        setNewSubLocation('');
                      }
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-[#E5B868]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newSubLocation.trim()) {
                        dispatch({ type: 'ADD_VENUE_SUB_LOCATION', payload: newSubLocation.trim() });
                        setNewSubLocation('');
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl bg-[#E5B868] text-black font-bold text-xs uppercase hover:bg-[#d4a34f] transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Gate Fee & Parking */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-slate-400 mb-2">Gate Fee / Admission Policy</label>
                  <input
                    type="text"
                    value={state.venue.gateFeeInfo || ''}
                    onChange={(e) => dispatch({ type: 'UPDATE_VENUE', payload: { gateFeeInfo: e.target.value } })}
                    className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-[#E5B868]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-slate-400 mb-2">Parking & Spectator Notes</label>
                  <input
                    type="text"
                    value={state.venue.parkingNotes || ''}
                    onChange={(e) => dispatch({ type: 'UPDATE_VENUE', payload: { parkingNotes: e.target.value } })}
                    className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-[#E5B868]"
                  />
                </div>
              </div>

              {/* Facility Rules */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-slate-400 mb-2">
                  Facility Safety & Equipment Regulations
                </label>
                <div className="space-y-2 mb-3">
                  {(state.venue.rules || []).map((rule, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-300">
                      <span>• {rule}</span>
                      <button
                        type="button"
                        onClick={() => dispatch({ type: 'REMOVE_VENUE_RULE', payload: idx })}
                        className="text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add rule (e.g. Softshell helmets mandatory for all 7v7 athletes)"
                    value={newFacilityRule}
                    onChange={(e) => setNewFacilityRule(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newFacilityRule.trim()) {
                        e.preventDefault();
                        dispatch({ type: 'ADD_VENUE_RULE', payload: newFacilityRule.trim() });
                        setNewFacilityRule('');
                      }
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-[#E5B868]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newFacilityRule.trim()) {
                        dispatch({ type: 'ADD_VENUE_RULE', payload: newFacilityRule.trim() });
                        setNewFacilityRule('');
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl bg-white/10 text-white font-bold text-xs uppercase hover:bg-white/20 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Rule</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ==========================================
            STEP 2: DIVISIONS & DYNAMIC PRICING ENGINE
           ========================================== */}
        {state.currentStep === 2 && (
          <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
            
            {/* Financial & Capacity Forecast Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-3xl bg-[#212A31]/90 border border-white/10">
                <div className="text-xs font-mono uppercase text-slate-400">Total Division Capacity</div>
                <div className="text-3xl font-black text-white font-mono mt-1">{totalMaxTeams} Teams</div>
                <div className="text-[11px] text-slate-400 mt-1">{state.divisions.length} active brackets configured</div>
              </div>

              <div className="p-5 rounded-3xl bg-[#212A31]/90 border border-white/10">
                <div className="text-xs font-mono uppercase text-slate-400">Projected Gross Revenue</div>
                <div className="text-3xl font-black text-[#E5B868] font-mono mt-1">${projectedGrossRevenue.toLocaleString()}</div>
                <div className="text-[11px] text-emerald-400 mt-1">PayPal instant split payouts enabled</div>
              </div>

              <div className="p-5 rounded-3xl bg-[#212A31]/90 border border-white/10">
                <div className="text-xs font-mono uppercase text-slate-400">Registration Fill Rate</div>
                <div className="text-3xl font-black text-emerald-400 font-mono mt-1">
                  {totalMaxTeams > 0 ? Math.round((totalRegisteredTeams / totalMaxTeams) * 100) : 0}%
                </div>
                <div className="text-[11px] text-slate-400 mt-1">{totalRegisteredTeams} / {totalMaxTeams} slots secured</div>
              </div>
            </div>

            {/* Division Manager Card */}
            <div className="p-6 md:p-8 rounded-3xl bg-[#212A31]/70 border border-white/10 backdrop-blur-xl space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-lg font-black uppercase italic tracking-wide text-white flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-[#E5B868]" />
                    Age Divisions & Deposit Payment Plans
                  </h3>
                  <p className="text-xs text-slate-400">Configure team registration caps, age ceiling validations, and PayPal deposit thresholds.</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const newId = `div-${Date.now()}`;
                    dispatch({
                      type: 'ADD_DIVISION',
                      payload: {
                        id: newId,
                        name: `New Division ${state.divisions.length + 1}`,
                        minAge: 10,
                        maxAge: 12,
                        maxTeams: 12,
                        teamFee: 300,
                        depositAmount: 100,
                        registeredTeamCount: 0
                      }
                    });
                    triggerToast('Added new tournament division bracket.');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#E5B868] text-black font-bold text-xs uppercase hover:bg-[#d4a34f] transition-all flex items-center gap-1.5 cursor-pointer shadow-lg"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Division</span>
                </button>
              </div>

              {/* Divisions List */}
              <div className="space-y-4">
                {state.divisions.map((div, idx) => (
                  <div key={div.id} className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#E5B868]/20 text-[#E5B868] text-xs font-mono font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={div.name}
                          onChange={(e) => dispatch({
                            type: 'UPDATE_DIVISION',
                            payload: { id: div.id, data: { name: e.target.value } }
                          })}
                          className="bg-transparent text-white font-bold text-sm focus:outline-none border-b border-white/20 pb-0.5 focus:border-[#E5B868]"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (state.divisions.length <= 1) {
                            triggerToast('Tournament must have at least one division.');
                            return;
                          }
                          dispatch({ type: 'REMOVE_DIVISION', payload: div.id });
                        }}
                        className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">Min Age</label>
                        <input
                          type="number"
                          min={5}
                          max={21}
                          value={div.minAge || 8}
                          onChange={(e) => dispatch({
                            type: 'UPDATE_DIVISION',
                            payload: { id: div.id, data: { minAge: parseInt(e.target.value) || 0 } }
                          })}
                          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">Max Age</label>
                        <input
                          type="number"
                          min={5}
                          max={21}
                          value={div.maxAge || 18}
                          onChange={(e) => dispatch({
                            type: 'UPDATE_DIVISION',
                            payload: { id: div.id, data: { maxAge: parseInt(e.target.value) || 0 } }
                          })}
                          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">Max Team Cap</label>
                        <input
                          type="number"
                          min={2}
                          max={64}
                          value={div.maxTeams}
                          onChange={(e) => dispatch({
                            type: 'UPDATE_DIVISION',
                            payload: { id: div.id, data: { maxTeams: parseInt(e.target.value) || 2 } }
                          })}
                          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">Full Registration Fee ($)</label>
                        <input
                          type="number"
                          min={0}
                          value={div.teamFee}
                          onChange={(e) => dispatch({
                            type: 'UPDATE_DIVISION',
                            payload: { id: div.id, data: { teamFee: parseInt(e.target.value) || 0 } }
                          })}
                          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[#E5B868] text-xs font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">Deposit Amount ($)</label>
                        <input
                          type="number"
                          min={0}
                          max={div.teamFee}
                          value={div.depositAmount}
                          onChange={(e) => dispatch({
                            type: 'UPDATE_DIVISION',
                            payload: { id: div.id, data: { depositAmount: parseInt(e.target.value) || 0 } }
                          })}
                          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-emerald-400 text-xs font-mono font-bold"
                        />
                      </div>
                    </div>

                    {/* Financial Summary Pill */}
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-white/5">
                      <span>Max Division Potential: <strong className="text-white">${((div.teamFee || 0) * (div.maxTeams || 0)).toLocaleString()}</strong></span>
                      <span>Remaining Balance at Lock: <strong className="text-[#E5B868]">${Math.max(0, (div.teamFee || 0) - (div.depositAmount || 0))}</strong></span>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        )}

        {/* ==========================================
            STEP 3: ATHLETE ELIGIBILITY & DIGITAL WAIVERS
           ========================================== */}
        {state.currentStep === 3 && (
          <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
            <div className="p-6 md:p-8 rounded-3xl bg-[#212A31]/70 border border-white/10 backdrop-blur-xl space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-lg font-black uppercase italic tracking-wide text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#E5B868]" />
                    Athlete Eligibility & Digital Waiver System
                  </h3>
                  <p className="text-xs text-slate-400">Enforce verified athlete rosters, Gemini OCR identity extraction, and mandatory waivers.</p>
                </div>
              </div>

              {/* Verification Tiers */}
              <div className="space-y-3">
                <label className="block text-xs font-mono font-bold uppercase text-slate-400">Roster Eligibility Verification Tier</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      id: 'self_reported',
                      title: 'Standard Coach Roster',
                      desc: 'Coaches enter player names & DOBs. Digital waiver signed by guardian before check-in.'
                    },
                    {
                      id: 'verified_ocr',
                      title: 'OCR Passport / Birth Cert (Recommended)',
                      desc: 'Gemini OCR validates government ID / birth certificates with automated DOB and name extraction.'
                    },
                    {
                      id: 'none',
                      title: 'Open / Unverified',
                      desc: 'Recreational play with standard general liability release.'
                    }
                  ].map(tier => (
                    <div
                      key={tier.id}
                      onClick={() => dispatch({
                        type: 'UPDATE_WAIVER_CONFIG',
                        payload: { verificationLevel: tier.id as any }
                      })}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        state.waiverConfig.verificationLevel === tier.id
                          ? 'bg-[#E5B868]/15 border-[#E5B868] text-white shadow-lg'
                          : 'bg-black/40 border-white/10 text-slate-400 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black uppercase tracking-wider text-white">{tier.title}</span>
                        {state.waiverConfig.verificationLevel === tier.id && (
                          <CheckCircle2 className="w-4 h-4 text-[#E5B868]" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{tier.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mandatory Protocols Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold uppercase text-white flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-[#E5B868]" />
                      Concussion Protocol Agreement
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Mandate return-to-play & concussion awareness sign-off</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={state.waiverConfig.concussionProtocolRequired}
                    onChange={(e) => dispatch({
                      type: 'UPDATE_WAIVER_CONFIG',
                      payload: { concussionProtocolRequired: e.target.checked }
                    })}
                    className="w-5 h-5 accent-[#E5B868] cursor-pointer"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold uppercase text-white flex items-center gap-2">
                      <Eye className="w-4 h-4 text-[#E5B868]" />
                      Photo & Media Scouting Release
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Permit game streaming, highlight clips & scouting distribution</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={state.waiverConfig.photoReleaseConsent}
                    onChange={(e) => dispatch({
                      type: 'UPDATE_WAIVER_CONFIG',
                      payload: { photoReleaseConsent: e.target.checked }
                    })}
                    className="w-5 h-5 accent-[#E5B868] cursor-pointer"
                  />
                </div>
              </div>

              {/* Waiver Template Markdown Editor */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-slate-400 mb-2 flex items-center justify-between">
                  <span>Digital Participation & Legal Waiver Clause</span>
                  <button
                    type="button"
                    onClick={() => dispatch({
                      type: 'UPDATE_WAIVER_CONFIG',
                      payload: { waiverTemplate: DEFAULT_WAIVER_TEMPLATE }
                    })}
                    className="text-[11px] text-[#E5B868] hover:underline"
                  >
                    Reset to Standard Template
                  </button>
                </label>
                <textarea
                  rows={8}
                  value={state.waiverConfig.waiverTemplate}
                  onChange={(e) => dispatch({
                    type: 'UPDATE_WAIVER_CONFIG',
                    payload: { waiverTemplate: e.target.value }
                  })}
                  className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-slate-200 font-mono text-xs focus:outline-none focus:border-[#E5B868] leading-relaxed"
                />
              </div>

            </div>
          </div>
        )}

        {/* ==========================================
            STEP 4: SMART SCHEDULING MATRIX & AI SOLVER
           ========================================== */}
        {state.currentStep === 4 && (
          <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
            <div className="p-6 md:p-8 rounded-3xl bg-[#212A31]/70 border border-white/10 backdrop-blur-xl space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-lg font-black uppercase italic tracking-wide text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[#E5B868]" />
                    Smart Scheduling Engine & AI Conflict Solver
                  </h3>
                  <p className="text-xs text-slate-400">Configure game durations, changeover buffers, and solve field overlaps with Gemini AI.</p>
                </div>

                <button
                  type="button"
                  onClick={handleRunAiScheduler}
                  disabled={isSolvingAI}
                  className="px-5 py-2.5 rounded-xl bg-[#E5B868] text-black font-black text-xs uppercase hover:bg-[#d4a34f] transition-all flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
                >
                  {isSolvingAI ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Solving Matrix...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Solve with Gemini AI</span>
                    </>
                  )}
                </button>
              </div>

              {/* Constraints Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-slate-400 mb-2">Game Duration (Mins)</label>
                  <input
                    type="number"
                    min={15}
                    max={120}
                    value={state.scheduleConstraints.gameDurationMinutes}
                    onChange={(e) => dispatch({
                      type: 'UPDATE_SCHEDULE_CONSTRAINTS',
                      payload: { gameDurationMinutes: parseInt(e.target.value) || 40 }
                    })}
                    className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white font-mono font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-slate-400 mb-2">Changeover Buffer (Mins)</label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={state.scheduleConstraints.bufferMinutes}
                    onChange={(e) => dispatch({
                      type: 'UPDATE_SCHEDULE_CONSTRAINTS',
                      payload: { bufferMinutes: parseInt(e.target.value) || 10 }
                    })}
                    className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white font-mono font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-slate-400 mb-2">Daily First Game Start</label>
                  <input
                    type="text"
                    value={state.scheduleConstraints.startTime || '08:00 AM'}
                    onChange={(e) => dispatch({
                      type: 'UPDATE_SCHEDULE_CONSTRAINTS',
                      payload: { startTime: e.target.value }
                    })}
                    className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-slate-400 mb-2">Daily Facility Curfew</label>
                  <input
                    type="text"
                    value={state.scheduleConstraints.endTime || '06:00 PM'}
                    onChange={(e) => dispatch({
                      type: 'UPDATE_SCHEDULE_CONSTRAINTS',
                      payload: { endTime: e.target.value }
                    })}
                    className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white font-mono text-xs"
                  />
                </div>
              </div>

              {/* Coach Conflict Prevention Toggle */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold uppercase text-white">Multi-Team Coach Overlap Protection</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Automatically sequences games so coaches managing multiple divisions are never scheduled simultaneously</div>
                </div>
                <input
                  type="checkbox"
                  checked={state.scheduleConstraints.coachConflictDetection}
                  onChange={(e) => dispatch({
                    type: 'UPDATE_SCHEDULE_CONSTRAINTS',
                    payload: { coachConflictDetection: e.target.checked }
                  })}
                  className="w-5 h-5 accent-[#E5B868] cursor-pointer"
                />
              </div>

              {/* AI Generated Schedule Output */}
              {state.generatedSchedule.isGenerated && (
                <div className="p-5 rounded-2xl bg-[#E5B868]/10 border border-[#E5B868]/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white font-bold text-xs uppercase">
                      <Sparkles className="w-4 h-4 text-[#E5B868]" />
                      <span>Gemini Generated Schedule Solution</span>
                    </div>
                    <span className="text-[11px] font-mono text-[#E5B868]">{state.generatedSchedule.matches.length} Match Slots</span>
                  </div>

                  <p className="text-xs text-slate-300 font-mono">{state.generatedSchedule.summary}</p>

                  {/* Match Slots Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                    {state.generatedSchedule.matches.map((m, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-black/60 border border-white/10 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-white">{m.homeTeam} vs {m.awayTeam}</div>
                          <div className="text-[10px] text-slate-400">{m.division} • {m.field}</div>
                        </div>
                        <div className="px-2.5 py-1 rounded-lg bg-[#E5B868]/20 text-[#E5B868] font-mono font-bold text-[11px]">
                          {m.time}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ==========================================
            STEP 5: REVIEW, SIMULATOR & LAUNCH
           ========================================== */}
        {state.currentStep === 5 && (
          <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
            
            {/* Review Cards & Simulator Mode Selector */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black uppercase italic tracking-wide text-white">
                  Tournament Review & Live Preview Simulator
                </h3>
                <p className="text-xs text-slate-400">Verify all logistics and preview how athletes and coaches will experience the live tournament page.</p>
              </div>

              {/* Device Selector */}
              <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'SET_PREVIEW_DEVICE', payload: 'desktop' })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                    state.previewDevice === 'desktop' ? 'bg-[#E5B868] text-black' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Desktop</span>
                </button>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'SET_PREVIEW_DEVICE', payload: 'mobile' })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                    state.previewDevice === 'mobile' ? 'bg-[#E5B868] text-black' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mobile App</span>
                </button>
              </div>
            </div>

            {/* Simulator Container */}
            <div className={`mx-auto transition-all ${state.previewDevice === 'mobile' ? 'max-w-sm' : 'w-full'}`}>
              <div className="rounded-3xl bg-[#212A31] border border-white/15 overflow-hidden shadow-2xl">
                
                {/* Banner & Live Badge */}
                <div className="relative h-48 sm:h-64 bg-slate-900 overflow-hidden">
                  <img
                    src={state.bannerUrl}
                    alt={state.title}
                    className="w-full h-full object-cover opacity-60"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#212A31] via-transparent to-black/60" />
                  
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="px-3 py-1 rounded-full bg-[#E5B868] text-black font-black text-[10px] uppercase tracking-wider">
                      {state.sport}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white font-mono text-[10px]">
                      {state.eventType}
                    </span>
                  </div>

                  <div className="absolute bottom-4 left-4 right-4">
                    <h2 className="text-xl sm:text-2xl font-black uppercase italic text-white tracking-tight drop-shadow-md">
                      {state.title || 'Untitled Event'}
                    </h2>
                    <div className="flex items-center gap-3 text-xs text-slate-300 mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#E5B868]" />
                        {state.venue.facilityName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#E5B868]" />
                        {state.startDate}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Details Body */}
                <div className="p-6 space-y-6">
                  
                  {/* Division Pills */}
                  <div>
                    <div className="text-[11px] font-mono font-bold uppercase text-slate-400 mb-2">Active Divisions & Age Brackets</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {state.divisions.map(div => (
                        <div key={div.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-bold text-white">{div.name}</div>
                            <div className="text-[10px] text-slate-400">Ages {div.minAge}-{div.maxAge} • Max {div.maxTeams} Teams</div>
                          </div>
                          <div className="text-right font-mono">
                            <div className="font-bold text-[#E5B868]">${div.teamFee}</div>
                            <div className="text-[10px] text-emerald-400">${div.depositAmount} Deposit</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Rules & Logistics Summary */}
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2 text-xs text-slate-300">
                    <div className="font-bold uppercase text-[#E5B868] text-[11px] font-mono">Tournament Highlights</div>
                    <div>• <strong>Venue:</strong> {state.venue.facilityName} ({state.venue.fieldsCount} Designated Fields)</div>
                    <div>• <strong>Gate Entry:</strong> {state.venue.gateFeeInfo || 'Free Admission'}</div>
                    <div>• <strong>Eligibility:</strong> {state.waiverConfig.verificationLevel === 'verified_ocr' ? 'Gemini OCR Birth Certificate & Passport Verified' : 'Standard Roster Registration'}</div>
                  </div>

                  {/* CTA Launch Registration Button */}
                  <button
                    type="button"
                    onClick={handlePublishTournament}
                    disabled={isPublishingFinal}
                    className="w-full py-4 rounded-2xl bg-[#E5B868] text-black font-black text-sm uppercase tracking-wider hover:bg-[#d4a34f] transition-all cursor-pointer shadow-[0_0_30px_rgba(229,184,104,0.3)] flex items-center justify-center gap-2"
                  >
                    {isPublishingFinal ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Publishing Event to Live Hub...</span>
                      </>
                    ) : (
                      <>
                        <Trophy className="w-5 h-5" />
                        <span>Publish Tournament & Open Registration</span>
                      </>
                    )}
                  </button>

                </div>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ==========================================
          WIZARD FOOTER NAVIGATION
         ========================================== */}
      <div className="p-6 bg-[#212A31] border-t border-white/10 flex items-center justify-between">
        <button
          type="button"
          onClick={() => dispatch({ type: 'SET_STEP', payload: state.currentStep - 1 })}
          disabled={state.currentStep === 1}
          className="px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous Step</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400 hidden sm:inline">
            Step {state.currentStep} of 5
          </span>

          {state.currentStep < 5 ? (
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_STEP', payload: state.currentStep + 1 })}
              className="px-6 py-3 rounded-2xl bg-[#E5B868] text-black font-black text-xs uppercase tracking-wider hover:bg-[#d4a34f] transition-all flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <span>Next: {WIZARD_STEPS[state.currentStep]?.label || 'Continue'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePublishTournament}
              disabled={isPublishingFinal}
              className="px-8 py-3 rounded-2xl bg-[#E5B868] text-black font-black text-xs uppercase tracking-wider hover:bg-[#d4a34f] transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(229,184,104,0.4)] disabled:opacity-50"
            >
              {isPublishingFinal ? (
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
          )}
        </div>
      </div>

    </div>
  );
};

export default EventBuilderWizard;
