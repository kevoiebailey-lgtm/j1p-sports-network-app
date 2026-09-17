import React, { useState, useMemo, useRef } from 'react';
import { 
  Trophy, 
  Calendar, 
  Clock, 
  MapPin, 
  DollarSign, 
  ShieldCheck, 
  Sparkles, 
  Plus, 
  Trash2, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  UploadCloud, 
  FileText, 
  Edit2, 
  Layers, 
  Zap, 
  Info, 
  Globe, 
  ExternalLink,
  ChevronRight,
  X,
  RefreshCw,
  HelpCircle,
  Building,
  Flag,
  Flame,
  Check
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  doc, 
  setDoc, 
  writeBatch, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, sanitizeFirestorePayload } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { US_STATES } from '../../lib/locationData';
import { normalizeSportType, normalizeEventType } from '../../services/eventPipelineService';

// Types
export type EventTypeSelection = 
  | 'tournament' 
  | 'seasonal_league' 
  | 'clinic_combine';

export interface ScheduleGameRow {
  id: string;
  gameNumber: number;
  gameDate: string;
  kickoffTime: string;
  isHome: boolean;
  opponent: string;
  location: string;
  notes?: string;
}

export interface CreateEventStudioProps {
  isOpen?: boolean;
  onClose?: () => void;
  onEventCreated?: (eventId: string, eventData: any) => void;
  initialEventType?: EventTypeSelection;
}

// Preset Cover Images for Quick Selection
const PRESET_COVERS: Record<string, string[]> = {
  Football: [
    'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=1200&auto=format&fit=crop&q=80'
  ],
  'Flag Football': [
    'https://images.unsplash.com/photo-1515523110800-9415d13b84a8?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=1200&auto=format&fit=crop&q=80'
  ],
  Basketball: [
    'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1519766304817-4f37bda74a29?w=1200&auto=format&fit=crop&q=80'
  ],
  Soccer: [
    'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=1200&auto=format&fit=crop&q=80'
  ],
  Track: [
    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=1200&auto=format&fit=crop&q=80'
  ]
};

const SPORTS_LIST = [
  'Football',
  'Flag Football',
  'Basketball',
  'Soccer',
  'Track',
  'Lacrosse',
  'Volleyball',
  'Baseball',
  'Softball',
  'Combine / Multisport'
];

/**
 * Normalizes user-entered image URLs, converting Google Drive share URLs to Google's open UserContent CDN.
 */
export function resolveGoogleDriveOrImageUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  // 1. Google Drive direct file link: https://drive.google.com/file/d/{ID}/view...
  const driveFileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (driveFileMatch && driveFileMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveFileMatch[1]}=w800`;
  }

  // 2. Google Drive open?id={ID}
  const driveOpenMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
  if (trimmed.includes('drive.google.com') && driveOpenMatch && driveOpenMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveOpenMatch[1]}=w800`;
  }

  // 3. UserContent URL without sizing suffix
  if (trimmed.includes('googleusercontent.com/d/')) {
    if (!trimmed.includes('=w') && !trimmed.includes('=s')) {
      return `${trimmed}=w800`;
    }
    return trimmed;
  }

  return trimmed;
}

export default function CreateEventStudio({
  isOpen = true,
  onClose,
  onEventCreated,
  initialEventType = 'tournament'
}: CreateEventStudioProps) {
  const { user, profile } = useAuth();
  const { showToast } = useToast();

  // Current wizard step (1 to 4)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccessId, setSubmitSuccessId] = useState<string | null>(null);

  // ---------------- STEP 1: Event Type ----------------
  const [eventType, setEventType] = useState<EventTypeSelection>(initialEventType);

  // ---------------- STEP 2: Core Details & Cover ----------------
  const [title, setTitle] = useState('');
  const [sport, setSport] = useState('Football');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState('09:00 AM');
  const [endTime, setEndTime] = useState('05:00 PM');
  
  // Venue
  const [venueName, setVenueName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('NJ');
  const [zipCode, setZipCode] = useState('');
  const [description, setDescription] = useState('');
  const [maxCapacity, setMaxCapacity] = useState<number>(32);

  // Cover Image
  const [coverImageUrl, setCoverImageUrl] = useState<string>(
    PRESET_COVERS['Football'][0]
  );
  const [customCoverInput, setCustomCoverInput] = useState<string>('');

  // ---------------- STEP 3: Monetization & PayPal Guard ----------------
  const [isPaidEvent, setIsPaidEvent] = useState<boolean>(
    initialEventType === 'tournament'
  );
  const [entryFee, setEntryFee] = useState<number>(350);
  const [registrationDeadline, setRegistrationDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return d.toISOString().split('T')[0];
  });

  // ---------------- STEP 4: AI Schedule Importer ----------------
  const [pastedScheduleText, setPastedScheduleText] = useState<string>('');
  const [isParsingAI, setIsParsingAI] = useState<boolean>(false);
  const [parsedGames, setParsedGames] = useState<ScheduleGameRow[]>([]);
  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-sync cover image preset when sport changes
  const handleSportChange = (newSport: string) => {
    setSport(newSport);
    const presets = PRESET_COVERS[newSport] || PRESET_COVERS['Football'];
    if (!customCoverInput) {
      setCoverImageUrl(presets[0]);
    }
  };

  // Resolve active cover URL
  const activeResolvedCover = useMemo(() => {
    if (customCoverInput.trim()) {
      return resolveGoogleDriveOrImageUrl(customCoverInput);
    }
    return coverImageUrl;
  }, [customCoverInput, coverImageUrl]);

  // PayPal Guard Logic
  const paypalMerchantId = profile?.paypalMerchantId || (profile as any)?.merchantId;
  const isPaypalConnected = Boolean(paypalMerchantId);
  const userRole = profile?.role || 'coach';
  const isAuthorizedRoleForPaid = 
    userRole === 'organization' || 
    userRole === 'director' || 
    userRole === 'coach' || 
    userRole === 'admin';

  const isPaidBlocked = isPaidEvent && (!isPaypalConnected || !isAuthorizedRoleForPaid);

  // ---------------- AI SCHEDULE PARSER ----------------
  const handleParseScheduleText = (rawText: string) => {
    if (!rawText.trim()) return;
    setIsParsingAI(true);

    setTimeout(() => {
      try {
        const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const results: ScheduleGameRow[] = [];
        let gameNum = 1;

        for (const line of lines) {
          // Skip header lines
          if (/^(date|week|opponent|time|game|location)/i.test(line) && line.includes(',')) {
            continue;
          }

          let date = startDate;
          let time = startTime;
          let isHome = true;
          let opponent = 'TBD Opponent';
          let location = venueName || `${city || 'Home'} Stadium`;
          let notes = '';

          // 1. CSV Format: Date, Time, Home/Away, Opponent, Location
          if (line.includes(',')) {
            const parts = line.split(',').map(p => p.trim());
            if (parts[0]) date = parts[0];
            if (parts[1]) time = parts[1];
            if (parts[2]) {
              const ha = parts[2].toLowerCase();
              isHome = ha.includes('home') || ha.includes('vs');
            }
            if (parts[3]) opponent = parts[3];
            if (parts[4]) location = parts[4];
            if (parts[5]) notes = parts[5];
          } else {
            // 2. Natural language / MaxPreps Line: e.g. "9/12 @ East Orange 7:00 PM - West Orange Stadium"
            // Home/Away detection
            if (line.includes('@')) {
              isHome = false;
            } else if (/vs\.?|against/i.test(line)) {
              isHome = true;
            }

            // Extract Time: (e.g. 7:00 PM, 19:00, 1:30pm)
            const timeMatch = line.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?|\d{1,2}\s*(?:AM|PM))/i);
            if (timeMatch) {
              time = timeMatch[1].toUpperCase();
            }

            // Extract Date: (e.g. 09/12/2026, 9/12, Sep 12, Oct 4th)
            const dateMatch = line.match(/(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?|[A-Za-z]{3,9}\.?\s+\d{1,2}(?:st|nd|rd|th)?)/i);
            if (dateMatch) {
              date = dateMatch[1];
            }

            // Extract Opponent
            const cleanLine = line
              .replace(timeMatch ? timeMatch[0] : '', '')
              .replace(dateMatch ? dateMatch[0] : '', '')
              .replace(/[@\-–—|]/g, ' ')
              .replace(/\b(vs\.?|against|at|game|week\s*\d+)\b/gi, '')
              .trim();

            if (cleanLine) {
              const chunks = cleanLine.split(/\s{2,}|\t/).filter(Boolean);
              opponent = chunks[0] || cleanLine;
              if (chunks[1]) location = chunks[1];
            }
          }

          results.push({
            id: `game-${Date.now()}-${gameNum}`,
            gameNumber: gameNum,
            gameDate: date,
            kickoffTime: time,
            isHome,
            opponent: opponent || `Opponent ${gameNum}`,
            location: location || (isHome ? (venueName || 'Home Stadium') : `${opponent} Field`),
            notes
          });
          gameNum++;
        }

        if (results.length > 0) {
          setParsedGames(results);
          showToast('success', 'AI Ingest Success', `Parsed ${results.length} scheduled games successfully!`);
        } else {
          showToast('error', 'Parse Notice', 'No games could be extracted. Please check the format.');
        }
      } catch (err) {
        console.error('Schedule parse error:', err);
        showToast('error', 'Parse Failed', 'Could not parse text. You can add games manually.');
      } finally {
        setIsParsingAI(false);
      }
    }, 600);
  };

  // File Upload Handlers (CSV/Text)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setPastedScheduleText(text);
        handleParseScheduleText(text);
      }
    };
    reader.readAsText(file);
  };

  const handleAddManualRow = () => {
    const newNum = parsedGames.length + 1;
    const newRow: ScheduleGameRow = {
      id: `game-manual-${Date.now()}`,
      gameNumber: newNum,
      gameDate: startDate,
      kickoffTime: startTime,
      isHome: true,
      opponent: `Opponent ${newNum}`,
      location: venueName || 'Home Stadium',
      notes: ''
    };
    setParsedGames([...parsedGames, newRow]);
    setEditingGameId(newRow.id);
  };

  const handleUpdateGameRow = (id: string, field: keyof ScheduleGameRow, value: any) => {
    setParsedGames(prev => prev.map(g => {
      if (g.id === id) {
        return { ...g, [field]: value };
      }
      return g;
    }));
  };

  const handleDeleteGameRow = (id: string) => {
    setParsedGames(prev => prev.filter(g => g.id !== id).map((g, idx) => ({
      ...g,
      gameNumber: idx + 1
    })));
  };

  const loadSampleSchedule = () => {
    const sample = `9/11/2026, 07:00 PM, Home, Montclair Mounties, West Orange Stadium
9/18/2026, 07:00 PM, Away, East Orange Jaguars, Paul Robeson Stadium
9/25/2026, 07:00 PM, Home, Bloomfield Bengals, West Orange Stadium
10/02/2026, 06:30 PM, Away, Livingston Lancers, Lancers Field
10/09/2026, 07:00 PM, Home, Irvington Blue Knights, West Orange Stadium
10/16/2026, 07:00 PM, Away, Passaic High Indians, Boverini Stadium
10/23/2026, 07:00 PM, Home, Clifton Mustangs, West Orange Stadium`;
    setPastedScheduleText(sample);
    handleParseScheduleText(sample);
  };

  // ---------------- FINAL FIRESTORE SUBMISSION ----------------
  const handleFinalSubmit = async () => {
    if (!title.trim()) {
      showToast('error', 'Missing Title', 'Please provide an Event Title.');
      setCurrentStep(2);
      return;
    }
    if (!venueName.trim() || !city.trim()) {
      showToast('error', 'Missing Venue', 'Please specify a Venue Name and City.');
      setCurrentStep(2);
      return;
    }

    if (isPaidEvent && isPaidBlocked) {
      showToast('error', 'PayPal Required', 'Please connect a PayPal Merchant Account before publishing paid events.');
      setCurrentStep(3);
      return;
    }

    setIsSubmitting(true);

    try {
      if (!db) {
        throw new Error('Firestore instance is unavailable.');
      }

      // Map author & organizer metadata
      const organizerUid = user?.uid || 'anonymous-director';
      const organizerName = profile?.displayName || profile?.organizationName || user?.displayName || 'Event Organizer';
      const organizerEmail = user?.email || profile?.email || '';

      // Clean, validated root event document payload adhering to standardized schema
      const eventPayload = sanitizeFirestorePayload({
        title: title.trim(),
        name: title.trim(),
        sport: sport || 'Football',
        sportType: normalizeSportType(sport),
        eventType: normalizeEventType(eventType),
        category: eventType === 'tournament' 
          ? 'Tournament' 
          : eventType === 'seasonal_league' 
            ? 'League' 
            : 'Combine',
        description: description.trim() || `${sport} ${eventType} hosted by ${organizerName}`,
        
        // Dates & Timing
        startDate,
        endDate: endDate || startDate,
        date: startDate,
        startTime,
        endTime,
        
        // Venue & Location
        location: {
          venue: venueName.trim(),
          city: city.trim(),
          state: state || 'NJ'
        },
        venueName: venueName.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state || 'NJ',
        zipCode: zipCode.trim(),
        
        // Media & Visuals
        thumbnailUrl: activeResolvedCover,
        bannerUrl: activeResolvedCover,
        coverImageUrl: activeResolvedCover,
        
        // Monetization & Limits
        isPaid: Boolean(isPaidEvent),
        price: isPaidEvent ? Number(entryFee) || 0 : 0,
        entryFee: isPaidEvent ? Number(entryFee) || 0 : 0,
        currency: 'USD',
        platformFeeSplit: isPaidEvent ? 25.00 : 0,
        paypalMerchantId: isPaidEvent ? (paypalMerchantId || null) : null,
        registrationDeadline: registrationDeadline || startDate,
        maxCapacity: Number(maxCapacity) || 32,
        maxTeams: Number(maxCapacity) || 32,
        registeredTeamIds: [],
        
        // Metadata & Permissions
        organizerId: organizerUid,
        organizerName,
        organizerEmail,
        directorName: profile?.directorName || organizerName,
        isPublished: true,
        status: 'published',
        gamesCount: parsedGames.length,
        
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 1. Add root event to /events
      const eventsColRef = collection(db, 'events');
      const eventDocRef = await addDoc(eventsColRef, eventPayload);
      const createdEventId = eventDocRef.id;

      // 2. Batch-create scheduled games under /events/{eventId}/games if any were imported
      if (parsedGames.length > 0) {
        const batch = writeBatch(db);

        parsedGames.forEach((game, index) => {
          const gameSubDocRef = doc(collection(db, 'events', createdEventId, 'games'));
          const gameData = sanitizeFirestorePayload({
            id: gameSubDocRef.id,
            eventId: createdEventId,
            gameNumber: game.gameNumber || index + 1,
            gameDate: game.gameDate,
            date: game.gameDate,
            time: game.kickoffTime,
            kickoffTime: game.kickoffTime,
            isHome: game.isHome,
            homeTeam: game.isHome ? { name: title.trim() || 'Home' } : { name: game.opponent },
            awayTeam: game.isHome ? { name: game.opponent } : { name: title.trim() || 'Home' },
            opponent: game.opponent,
            location: game.location,
            venue: game.location,
            notes: game.notes || '',
            status: 'Upcoming',
            sport: sport || 'Football',
            createdAt: serverTimestamp()
          });

          batch.set(gameSubDocRef, gameData);
        });

        await batch.commit();
      }

      setSubmitSuccessId(createdEventId);
      showToast('success', 'Event Published!', `"${title}" has been successfully published to the live schedule matrix.`);

      if (onEventCreated) {
        onEventCreated(createdEventId, eventPayload);
      }
    } catch (err: any) {
      console.error('Firestore event creation error:', err);
      showToast('error', 'Publish Failed', err.message || 'Failed to save event to database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      id="create-event-studio-container"
      className="w-full max-w-5xl mx-auto bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl text-zinc-100 font-sans my-4"
    >
      {/* HEADER BAR */}
      <div className="bg-zinc-900/90 border-b border-zinc-800 p-6 flex items-center justify-between backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-2">
              <span>Event Creator Studio</span>
              <span className="text-[10px] font-mono font-bold bg-teal-500/20 text-teal-400 border border-teal-500/40 px-2 py-0.5 rounded-full">
                LIVE CLOUD SYNC
              </span>
            </h2>
            <p className="text-xs text-zinc-400">
              Publish tournaments, seasonal team game schedules, and athletic combines.
            </p>
          </div>
        </div>

        {onClose && (
          <button
            id="close-create-event-studio"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* STEP PROGRESS INDICATOR */}
      <div className="bg-zinc-950 px-6 py-4 border-b border-zinc-800/80">
        <div className="grid grid-cols-4 gap-2">
          {[
            { step: 1, label: 'Event Type', icon: Layers },
            { step: 2, label: 'Core & Media', icon: FileText },
            { step: 3, label: 'Monetization', icon: DollarSign },
            { step: 4, label: 'AI Schedule Ingest', icon: Sparkles },
          ].map(({ step, label, icon: Icon }) => {
            const isActive = currentStep === step;
            const isCompleted = currentStep > step;
            return (
              <button
                key={step}
                onClick={() => setCurrentStep(step)}
                disabled={isSubmitting}
                className={`flex items-center gap-2.5 p-3 rounded-2xl border transition-all text-left ${
                  isActive 
                    ? 'bg-teal-500/10 border-teal-500/60 text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.2)]'
                    : isCompleted
                      ? 'bg-zinc-900 border-zinc-700 text-zinc-300'
                      : 'bg-zinc-950 border-zinc-800/60 text-zinc-500 hover:border-zinc-700'
                }`}
              >
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold ${
                  isActive
                    ? 'bg-teal-500 text-zinc-950'
                    : isCompleted
                      ? 'bg-zinc-700 text-white'
                      : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : step}
                </div>
                <div className="hidden sm:block truncate">
                  <div className="text-[10px] font-mono uppercase text-zinc-400">Step {step}</div>
                  <div className="text-xs font-bold truncate">{label}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* BODY CONTENT AREA */}
      <div className="p-6 md:p-8 space-y-6 max-h-[70vh] overflow-y-auto">
        {/* SUCCESS BANNER */}
        {submitSuccessId && (
          <div className="p-6 rounded-3xl bg-teal-500/10 border border-teal-500/40 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black uppercase text-white">Event Published Successfully!</h3>
            <p className="text-xs text-zinc-300 max-w-md mx-auto">
              Your event is now live and listed across Just1Play tournament brackets and team calendars.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold text-xs uppercase"
                >
                  Done & Close
                </button>
              )}
            </div>
          </div>
        )}

        {/* ---------------- STEP 1: EVENT TYPE SELECTOR ---------------- */}
        {currentStep === 1 && !submitSuccessId && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-base font-black uppercase tracking-wider text-white flex items-center gap-2">
                <span>Select Event Classification</span>
              </h3>
              <p className="text-xs text-zinc-400">
                Choose the structure that matches your athletic competition or season format.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Option 1: Tournament */}
              <div
                id="select-type-tournament"
                onClick={() => {
                  setEventType('tournament');
                  setIsPaidEvent(true);
                }}
                className={`p-6 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  eventType === 'tournament'
                    ? 'bg-teal-500/10 border-teal-500 text-white shadow-[0_0_25px_rgba(20,184,166,0.25)]'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="space-y-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    eventType === 'tournament' ? 'bg-teal-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    <Trophy className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-black uppercase text-white">Tournament / Showcase</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Multi-team single or double elimination brackets, pool play stages, and paid team registration fees.
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono">
                  <span className="text-teal-400 font-bold">Bracket & Pool Play</span>
                  {eventType === 'tournament' && <CheckCircle2 className="w-4 h-4 text-teal-400" />}
                </div>
              </div>

              {/* Option 2: Seasonal League */}
              <div
                id="select-type-seasonal-league"
                onClick={() => {
                  setEventType('seasonal_league');
                  setIsPaidEvent(false);
                }}
                className={`p-6 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  eventType === 'seasonal_league'
                    ? 'bg-teal-500/10 border-teal-500 text-white shadow-[0_0_25px_rgba(20,184,166,0.25)]'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="space-y-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    eventType === 'seasonal_league' ? 'bg-teal-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    <Calendar className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-black uppercase text-white">Seasonal League / High School Schedule</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Weekly home and away regular season games, non-bracket matchups, Varsity & JV division schedules.
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono">
                  <span className="text-teal-400 font-bold">Multi-Week Games</span>
                  {eventType === 'seasonal_league' && <CheckCircle2 className="w-4 h-4 text-teal-400" />}
                </div>
              </div>

              {/* Option 3: Free Clinic / Combine */}
              <div
                id="select-type-clinic-combine"
                onClick={() => {
                  setEventType('clinic_combine');
                  setIsPaidEvent(false);
                }}
                className={`p-6 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  eventType === 'clinic_combine'
                    ? 'bg-teal-500/10 border-teal-500 text-white shadow-[0_0_25px_rgba(20,184,166,0.25)]'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="space-y-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    eventType === 'clinic_combine' ? 'bg-teal-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    <Zap className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-black uppercase text-white">Free Clinic / Scrimmage / Combine</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    No entry fees required. Open RSVP athlete check-in, laser speed drills, and skills evaluations.
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono">
                  <span className="text-teal-400 font-bold">Open RSVP</span>
                  {eventType === 'clinic_combine' && <CheckCircle2 className="w-4 h-4 text-teal-400" />}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- STEP 2: CORE DETAILS & COVER IMAGE ---------------- */}
        {currentStep === 2 && !submitSuccessId && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Form Fields */}
              <div className="lg:col-span-2 space-y-4">
                {/* Event Title */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5 font-mono">
                    Event Title *
                  </label>
                  <input
                    id="event-title-input"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. West Orange High School Varsity Football 2026"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-teal-500 rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors"
                  />
                </div>

                {/* Sport & Category Dropdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5 font-mono">
                      Sport
                    </label>
                    <select
                      id="event-sport-select"
                      value={sport}
                      onChange={(e) => handleSportChange(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-teal-500 rounded-2xl px-4 py-3 text-sm text-white outline-none cursor-pointer"
                    >
                      {SPORTS_LIST.map((s) => (
                        <option key={s} value={s} className="bg-zinc-900 text-white">
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5 font-mono">
                      Max Teams / Capacity
                    </label>
                    <input
                      type="number"
                      value={maxCapacity}
                      onChange={(e) => setMaxCapacity(parseInt(e.target.value) || 16)}
                      min={2}
                      max={256}
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-teal-500 rounded-2xl px-4 py-3 text-sm text-white outline-none"
                    />
                  </div>
                </div>

                {/* Date & Time Range */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5 font-mono">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-teal-500 rounded-2xl px-4 py-3 text-sm text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5 font-mono">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-teal-500 rounded-2xl px-4 py-3 text-sm text-white outline-none"
                    />
                  </div>
                </div>

                {/* Venue Name & Street Address */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5 font-mono">
                      Venue / Facility Name *
                    </label>
                    <input
                      type="text"
                      value={venueName}
                      onChange={(e) => setVenueName(e.target.value)}
                      placeholder="e.g. Mountaineer Stadium"
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-teal-500 rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5 font-mono">
                      Street Address
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. 51 Conforti Ave"
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-teal-500 rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none"
                    />
                  </div>
                </div>

                {/* City, State, Zip */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5 font-mono">
                      City *
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="West Orange"
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-teal-500 rounded-2xl px-3 py-3 text-sm text-white outline-none"
                    />
                  </div>

                  <div className="col-span-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5 font-mono">
                      State
                    </label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-teal-500 rounded-2xl px-3 py-3 text-sm text-white outline-none cursor-pointer"
                    >
                      {US_STATES.map((st) => (
                        <option key={st.code} value={st.code} className="bg-zinc-900 text-white">
                          {st.code} - {st.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5 font-mono">
                      Zip Code
                    </label>
                    <input
                      type="text"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      placeholder="07052"
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-teal-500 rounded-2xl px-3 py-3 text-sm text-white outline-none"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5 font-mono">
                    Event Overview & Scouting Notes
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Provide rules, spectator information, NCAA scout attendance, or livestreaming coverage..."
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-teal-500 rounded-2xl p-4 text-sm text-white placeholder-zinc-500 outline-none resize-none"
                  />
                </div>
              </div>

              {/* Right Col: Cover Image & Google Drive CDN */}
              <div className="space-y-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5 font-mono">
                  Cover Thumbnail & CDN Preview
                </label>

                {/* Live Image Preview Card */}
                <div className="relative rounded-2xl overflow-hidden aspect-video bg-zinc-900 border border-zinc-800 shadow-md">
                  <img
                    src={activeResolvedCover}
                    alt="Event Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = PRESET_COVERS['Football'][0];
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <span className="text-[10px] font-mono font-bold uppercase text-teal-400 bg-zinc-900/90 px-2 py-0.5 rounded-full border border-teal-500/30">
                      {sport} • {eventType.toUpperCase()}
                    </span>
                    <div className="text-xs font-black text-white truncate mt-1">
                      {title || 'Your Event Headline'}
                    </div>
                  </div>
                </div>

                {/* Custom URL or Google Drive Input */}
                <div className="space-y-2">
                  <input
                    type="url"
                    value={customCoverInput}
                    onChange={(e) => setCustomCoverInput(e.target.value)}
                    placeholder="Paste image URL or Google Drive link (e.g. drive.google.com/file/d/...)"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-teal-500 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-500 outline-none"
                  />
                  <p className="text-[11px] text-zinc-400 leading-tight">
                    💡 Supports direct image links or Google Drive links with open CDN resolution (<code className="text-teal-400 font-mono">lh3.googleusercontent.com/d/&#123;ID&#125;=w800</code>).
                  </p>
                </div>

                {/* Preset Chips */}
                <div className="space-y-1.5 pt-2">
                  <span className="text-[10px] font-mono uppercase text-zinc-400 block">Preset Thumbnails:</span>
                  <div className="grid grid-cols-3 gap-2">
                    {(PRESET_COVERS[sport] || PRESET_COVERS['Football']).map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setCustomCoverInput('');
                          setCoverImageUrl(url);
                        }}
                        className={`relative rounded-xl overflow-hidden aspect-video border-2 transition-all ${
                          !customCoverInput && coverImageUrl === url
                            ? 'border-teal-400 scale-105'
                            : 'border-zinc-800 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={url} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- STEP 3: MONETIZATION & PAYPAL GUARD ---------------- */}
        {currentStep === 3 && !submitSuccessId && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-base font-black uppercase tracking-wider text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-teal-400" />
                <span>Monetization & Registration Pricing</span>
              </h3>
              <p className="text-xs text-zinc-400">
                Configure team registration fees and verify your payout destination.
              </p>
            </div>

            {/* Free vs Paid Toggle */}
            <div className="p-4 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white uppercase">Collect Entry Fees?</h4>
                <p className="text-xs text-zinc-400">
                  Enable paid team entry registration via PayPal Partner Commerce platform.
                </p>
              </div>

              <div className="flex bg-zinc-950 p-1 rounded-2xl border border-zinc-800">
                <button
                  type="button"
                  id="toggle-free-event"
                  onClick={() => setIsPaidEvent(false)}
                  className={`px-5 py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                    !isPaidEvent
                      ? 'bg-zinc-800 text-white shadow'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Free / Open
                </button>
                <button
                  type="button"
                  id="toggle-paid-event"
                  onClick={() => setIsPaidEvent(true)}
                  className={`px-5 py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                    isPaidEvent
                      ? 'bg-teal-500 text-zinc-950 font-black shadow-[0_0_15px_rgba(20,184,166,0.3)]'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Paid Entry Fee
                </button>
              </div>
            </div>

            {/* If Paid: Fee Input + PayPal Guard */}
            {isPaidEvent && (
              <div className="space-y-5">
                <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">
                        Team Registration Fee ($ USD)
                      </label>
                      <p className="text-xs text-zinc-400">Amount charged to each registering team roster.</p>
                    </div>
                    <div className="text-2xl font-black text-teal-400 font-mono">
                      ${entryFee.toFixed(2)}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={entryFee}
                      onChange={(e) => setEntryFee(Math.max(0, parseFloat(e.target.value) || 0))}
                      min={0}
                      step={5}
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-teal-500 rounded-2xl px-4 py-3 text-lg font-mono text-white outline-none"
                    />
                    {[50, 150, 350, 500].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setEntryFee(preset)}
                        className={`px-3.5 py-3 rounded-xl border text-xs font-mono font-bold transition-all ${
                          entryFee === preset
                            ? 'bg-teal-500 text-zinc-950 border-teal-400 font-black'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        ${preset}
                      </button>
                    ))}
                  </div>

                  {/* Revenue Note Badge */}
                  <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-zinc-300 space-y-1">
                      <div className="font-bold text-teal-300">Automated Split Revenue Distribution</div>
                      <p className="text-zinc-400 leading-relaxed">
                        Automated $25 Just1Play Platform Split active on every registration. Net director proceeds (${Math.max(0, entryFee - 25).toFixed(2)}) are routed automatically to your connected PayPal account.
                      </p>
                    </div>
                  </div>
                </div>

                {/* PAYPAL GUARD CHECK */}
                <div className={`p-6 rounded-3xl border ${
                  isPaypalConnected && isAuthorizedRoleForPaid
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}>
                  <div className="flex items-start gap-3.5">
                    {isPaypalConnected && isAuthorizedRoleForPaid ? (
                      <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-red-400 shrink-0" />
                    )}

                    <div className="space-y-2 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-white">
                          PayPal Partner Commerce Guard
                        </h4>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase border ${
                          isPaypalConnected 
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                            : 'bg-red-500/20 text-red-400 border-red-500/40'
                        }`}>
                          {isPaypalConnected ? 'MERCHANT LINKED' : 'ACTION REQUIRED'}
                        </span>
                      </div>

                      {isPaypalConnected && isAuthorizedRoleForPaid ? (
                        <p className="text-xs text-zinc-300 leading-relaxed">
                          Your profile is authorized and connected with merchant ID <code className="font-mono text-emerald-400 bg-zinc-900 px-1.5 py-0.5 rounded">{paypalMerchantId}</code>. You are ready to accept paid tournament registrations.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs text-red-200 leading-relaxed">
                            PayPal Partner account required to accept registrations. Connect your account in Platform Settings.
                          </p>
                          {!isAuthorizedRoleForPaid && (
                            <p className="text-xs text-amber-300">
                              Note: Only Organizations and Tournament Directors can publish paid events.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------- STEP 4: AI SCHEDULE IMPORTER ---------------- */}
        {currentStep === 4 && !submitSuccessId && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-base font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-teal-400" />
                  <span>Smart Schedule Ingest & AI Matchup Builder</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Upload CSV, paste schedule text from MaxPreps, or generate matchups with AI.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadSampleSchedule}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-teal-400" />
                  Load Sample Schedule
                </button>

                <button
                  type="button"
                  onClick={handleAddManualRow}
                  className="px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-zinc-950 text-xs font-bold uppercase flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  Add Row
                </button>
              </div>
            </div>

            {/* Smart Ingest Dropzone & Paste Box */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-6 rounded-3xl bg-zinc-900/60 border-2 border-dashed border-zinc-800 hover:border-teal-500/60 transition-all cursor-pointer text-center flex flex-col items-center justify-center space-y-2 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-zinc-800 group-hover:bg-teal-500/20 text-zinc-400 group-hover:text-teal-400 flex items-center justify-center transition-colors">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-white uppercase">Upload CSV or Schedule Spreadsheet</div>
                <p className="text-[11px] text-zinc-500 max-w-xs">
                  Drag and drop your .CSV or .TXT file here to auto-populate the games schedule grid.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Paste Text Area */}
              <div className="p-4 rounded-3xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">
                    Paste Raw Schedule Text / MaxPreps Lineup
                  </label>
                  <textarea
                    value={pastedScheduleText}
                    onChange={(e) => setPastedScheduleText(e.target.value)}
                    placeholder="e.g. 9/12 @ East Orange 7:00 PM - West Orange Stadium&#10;9/19 vs Montclair 7:00 PM - West Orange Stadium..."
                    rows={3}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-teal-500 rounded-xl p-3 text-xs text-white placeholder-zinc-600 outline-none resize-none font-mono"
                  />
                </div>

                <button
                  type="button"
                  disabled={!pastedScheduleText.trim() || isParsingAI}
                  onClick={() => handleParseScheduleText(pastedScheduleText)}
                  className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-40 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isParsingAI ? 'AI Parsing Schedule...' : 'Parse with Smart AI Ingest'}</span>
                </button>
              </div>
            </div>

            {/* PREVIEW GRID */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase text-zinc-400">
                  Scheduled Matchups Preview ({parsedGames.length} Games)
                </span>
                {parsedGames.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setParsedGames([])}
                    className="text-[11px] font-mono text-red-400 hover:text-red-300"
                  >
                    Clear All Games
                  </button>
                )}
              </div>

              {parsedGames.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-zinc-900/40 border border-zinc-800/80 text-zinc-500 text-xs">
                  No games imported yet. Upload a CSV, paste schedule text above, or click "+ Add Row".
                </div>
              ) : (
                <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950">
                  <div className="overflow-x-auto max-h-72">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-900 text-zinc-400 uppercase font-mono text-[10px] border-b border-zinc-800">
                        <tr>
                          <th className="p-3">#</th>
                          <th className="p-3">Date</th>
                          <th className="p-3">Kickoff</th>
                          <th className="p-3">H/A</th>
                          <th className="p-3">Opponent</th>
                          <th className="p-3">Location</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60 font-sans">
                        {parsedGames.map((game) => (
                          <tr key={game.id} className="hover:bg-zinc-900/40 transition-colors">
                            <td className="p-3 font-mono text-teal-400 font-bold">
                              {game.gameNumber}
                            </td>
                            <td className="p-3">
                              <input
                                type="text"
                                value={game.gameDate}
                                onChange={(e) => handleUpdateGameRow(game.id, 'gameDate', e.target.value)}
                                className="bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-teal-500 outline-none text-white text-xs w-24"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="text"
                                value={game.kickoffTime}
                                onChange={(e) => handleUpdateGameRow(game.id, 'kickoffTime', e.target.value)}
                                className="bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-teal-500 outline-none text-white text-xs w-20"
                              />
                            </td>
                            <td className="p-3">
                              <button
                                type="button"
                                onClick={() => handleUpdateGameRow(game.id, 'isHome', !game.isHome)}
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                  game.isHome
                                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                }`}
                              >
                                {game.isHome ? 'HOME' : 'AWAY'}
                              </button>
                            </td>
                            <td className="p-3">
                              <input
                                type="text"
                                value={game.opponent}
                                onChange={(e) => handleUpdateGameRow(game.id, 'opponent', e.target.value)}
                                className="bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-teal-500 outline-none text-white font-bold text-xs w-40"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="text"
                                value={game.location}
                                onChange={(e) => handleUpdateGameRow(game.id, 'location', e.target.value)}
                                className="bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-teal-500 outline-none text-zinc-300 text-xs w-44"
                              />
                            </td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteGameRow(game.id)}
                                className="p-1 rounded text-zinc-500 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
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
      </div>

      {/* FOOTER ACTIONS BAR */}
      {!submitSuccessId && (
        <div className="bg-zinc-900/90 border-t border-zinc-800 p-6 flex items-center justify-between backdrop-blur-md">
          {/* Back Step */}
          {currentStep > 1 ? (
            <button
              id="back-step-button"
              type="button"
              disabled={isSubmitting}
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              className="px-5 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs uppercase flex items-center gap-2 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous Step</span>
            </button>
          ) : (
            <div />
          )}

          {/* Forward Step or Final Submit */}
          <div className="flex items-center gap-3">
            {currentStep < 4 ? (
              <button
                id="next-step-button"
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  if (currentStep === 2 && !title.trim()) {
                    showToast('error', 'Title Required', 'Please enter an Event Title before continuing.');
                    return;
                  }
                  setCurrentStep(prev => Math.min(4, prev + 1));
                }}
                className="px-6 py-3 rounded-2xl bg-teal-500 hover:bg-teal-400 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(20,184,166,0.3)] cursor-pointer"
              >
                <span>Next: {currentStep === 1 ? 'Core Details' : currentStep === 2 ? 'Monetization' : 'AI Ingest'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                id="confirm-generate-event-button"
                type="button"
                disabled={isSubmitting || (isPaidEvent && isPaidBlocked)}
                onClick={handleFinalSubmit}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-400 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-[0_0_25px_rgba(20,184,166,0.4)] cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Publishing Live Event & Games...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 stroke-[2.5]" />
                    <span>Confirm & Generate All Games</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export { CreateEventStudio };
