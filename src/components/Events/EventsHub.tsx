import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Zap, 
  Flame, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Plus, 
  DollarSign, 
  ShieldCheck, 
  CalendarPlus, 
  ExternalLink, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  Camera, 
  SlidersHorizontal,
  ChevronRight,
  UserCheck,
  Tag,
  Share2,
  Trash2,
  Edit3,
  LayoutGrid,
  CalendarDays,
  ListOrdered,
  Globe,
  Bookmark,
  BookmarkCheck
} from 'lucide-react';
import { useLocation, useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useAuthRole, normalizeRole } from '../../hooks/useAuthRole';
import { useToast } from '../../context/ToastContext';
import { 
  ShowcaseEvent, 
  EventCategoryType, 
  EVENT_CATEGORY_TABS 
} from './types';
import { CreateEventModal } from './CreateEventModal';
import { ApplyHostModal } from './ApplyHostModal';
import { EventDetailModal } from './EventDetailModal';
import { AuthModal } from '../Auth/AuthModal';
import { UniversalScheduleImporterModal } from '../UniversalScheduleImporterModal';
import { EventCalendarView } from './EventCalendarView';
import { downloadIcsCalendarEvent, getGoogleCalendarWebUrl } from '../../lib/googleCalendarService';
import { normalizeSportType, normalizeEventType } from '../../services/eventPipelineService';

// ==========================================
// Strict Sport Assets (Purged Tennis & Non-Sport)
// ==========================================
export const STRICT_FOOTBALL_ASSETS = [
  'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=1200&auto=format&fit=crop&q=80', // Grass turf with football
  'https://images.unsplash.com/photo-1511886929837-354d827aae26?w=1200&auto=format&fit=crop&q=80', // Football helmet on lights
  'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=1200&auto=format&fit=crop&q=80', // Stadium floodlights bowl
  'https://images.unsplash.com/photo-1577223625816-7546f13df25d?w=1200&auto=format&fit=crop&q=80', // Championship bowl arena
  'https://images.unsplash.com/photo-1587385789097-0197a7fbd179?w=1200&auto=format&fit=crop&q=80', // Pristine yardline hashmarks
  'https://images.unsplash.com/photo-1567521464027-f127ff144326?w=1200&auto=format&fit=crop&q=80', // Packed stadium bowl
];

// Helper to normalize Google Drive image links and sport-accurate fallbacks
export const getSportFallbackImage = (sport?: string): string => {
  const s = (sport || '').toLowerCase();
  if (s.includes('football') || s.includes('flag')) {
    return STRICT_FOOTBALL_ASSETS[0];
  }
  if (s.includes('basketball') || s.includes('hoop')) {
    return 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&auto=format&fit=crop&q=80';
  }
  if (s.includes('lacrosse') || s.includes('lax')) {
    return 'https://images.unsplash.com/photo-1515037893149-de7f840978e2?w=1200&auto=format&fit=crop&q=80';
  }
  if (s.includes('cheer') || s.includes('stunt')) {
    return 'https://images.unsplash.com/photo-1516726817505-f5ed825624d8?w=1200&auto=format&fit=crop&q=80';
  }
  if (s.includes('soccer')) {
    return 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=1200&auto=format&fit=crop&q=80';
  }
  return STRICT_FOOTBALL_ASSETS[2]; // Default high-res stadium lights bowl
};

export const normalizeImageUrl = (url?: string, sport?: string): string => {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return getSportFallbackImage(sport);
  }
  const trimmed = url.trim();

  // Purge known tennis, dumbbell, or invalid placeholder images
  if (
    trimmed.includes('1587280501635-68a0e82cd5ff') ||
    trimmed.includes('tennis') ||
    trimmed.includes('1534438327276') ||
    trimmed.includes('1515523110800')
  ) {
    return getSportFallbackImage(sport);
  }

  // Google Drive link normalization
  const driveMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
  }
  return trimmed;
};

// ==========================================
// Kickoff Time & Venue Display Guards
// ==========================================
export const isGenuineKickoffTime = (timeStr?: string | null): boolean => {
  if (!timeStr || typeof timeStr !== 'string') return false;
  const t = timeStr.trim().toLowerCase();
  if (
    !t ||
    t === '12:00 am' ||
    t === '12:00am' ||
    t === '00:00' ||
    t === '0:00' ||
    t === '00:00:00' ||
    t === 'tbd' ||
    t === 'tba' ||
    t === 'null' ||
    t === 'undefined' ||
    t.includes('tba') ||
    t.includes('tbd')
  ) {
    return false;
  }
  return /\d{1,2}:\d{2}/.test(t);
};

export const formatVenueDisplay = (
  venueOrLocation?: string | null,
  city?: string | null,
  state?: string | null
): string => {
  let rawVenue = (venueOrLocation || '').trim();
  const c = (city || '').trim();
  const s = (state || '').trim();

  // Strip redundant fallback suffix markers
  rawVenue = rawVenue.replace(/,\s*Local,\s*USA$/i, '');
  rawVenue = rawVenue.replace(/,\s*Local$/i, '');
  rawVenue = rawVenue.replace(/,\s*USA$/i, '');

  const RECOGNIZED_STADIUM_CITIES: Record<string, string> = {
    'shi stadium': 'SHI Stadium, Piscataway, NJ',
    'michigan stadium': 'Michigan Stadium, Ann Arbor, MI',
    'metlife stadium': 'MetLife Stadium, East Rutherford, NJ',
    'ohio stadium': 'Ohio Stadium, Columbus, OH',
    'beaver stadium': 'Beaver Stadium, University Park, PA',
    'bryant-denny stadium': 'Bryant-Denny Stadium, Tuscaloosa, AL',
    'rose bowl': 'Rose Bowl, Pasadena, CA',
    'mercedes-benz stadium': 'Mercedes-Benz Stadium, Atlanta, GA',
    'lincoln financial field': 'Lincoln Financial Field, Philadelphia, PA',
    'at&t stadium': 'AT&T Stadium, Arlington, TX',
    'sofi stadium': 'SoFi Stadium, Inglewood, CA',
    'centennial stadium': 'Centennial Stadium, Wayne, NJ',
  };

  const lower = rawVenue.toLowerCase();
  for (const [key, recognized] of Object.entries(RECOGNIZED_STADIUM_CITIES)) {
    if (lower.includes(key)) {
      return recognized;
    }
  }

  // If already contains City, ST
  if (/, [A-Z]{2}$/i.test(rawVenue) || /, [A-Za-z\s]+, [A-Z]{2}$/i.test(rawVenue)) {
    return rawVenue;
  }

  const validCity = c && c.toLowerCase() !== 'local' && c.toLowerCase() !== 'national' ? c : '';
  const validState = s && s.toUpperCase() !== 'USA' ? s : '';

  if (rawVenue && validCity && validState) {
    return `${rawVenue}, ${validCity}, ${validState}`;
  }
  if (rawVenue && validCity) {
    return `${rawVenue}, ${validCity}`;
  }
  if (rawVenue) {
    return rawVenue;
  }

  return 'Athletic Facility';
};

export const EventsHub: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ eventId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const { role, userDoc } = useAuthRole();
  const { showToast } = useToast();

  const canonicalRole = normalizeRole(role);

  // Permission Guard: Creation access enabled for director, coach, creator, admin, organization or verified hosts
  const isAuthorizedHost = Boolean(
    ['director', 'coach', 'creator', 'admin', 'scout', 'organization', 'content_creator'].includes(role) ||
    ['director', 'coach', 'creator', 'admin', 'scout', 'organization'].includes(canonicalRole) ||
    (userDoc as any)?.isVerifiedHost === true ||
    (profile as any)?.isVerifiedHost === true ||
    (userDoc as any)?.isVerified === true ||
    (profile as any)?.isVerified === true ||
    (user && (user.email === 'kevoiebailey@gmail.com' || user.email?.includes('admin')))
  );

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState<EventCategoryType>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState('All');
  const [selectedState, setSelectedState] = useState('All');
  const [selectedFormat, setSelectedFormat] = useState('All');
  const [selectedDivision, setSelectedDivision] = useState('All');
  const [entryFeeFilter, setEntryFeeFilter] = useState<'All' | 'Free Only' | 'Paid'>('All');
  const [filterSavedOnly, setFilterSavedOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'calendar' | 'timeline'>('grid');
  const [filterMyRsvps, setFilterMyRsvps] = useState(false);

  // Local Bookmark State
  const [savedEventIds, setSavedEventIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('just1play_saved_events');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Toggle Bookmark Handler
  const toggleBookmark = (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    setSavedEventIds((prev) => {
      const isBookmarked = prev.includes(eventId);
      const updated = isBookmarked ? prev.filter((id) => id !== eventId) : [...prev, eventId];
      try {
        localStorage.setItem('just1play_saved_events', JSON.stringify(updated));
      } catch {}
      if (isBookmarked) {
        showToast('info', 'Bookmark Removed', 'Event removed from your saved list.');
      } else {
        showToast('success', 'Tournament Saved!', 'Added to your bookmarked events.');
      }
      return updated;
    });
  };

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isScheduleImporterOpen, setIsScheduleImporterOpen] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ShowcaseEvent | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Events State - Real-time sync from Firestore `/events` and `/tournaments`
  const [events, setEvents] = useState<ShowcaseEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Dual-collection Real-time Firestore Sync
  useEffect(() => {
    let unsubscribeEvents: () => void = () => {};
    let unsubscribeTournaments: () => void = () => {};

    let eventsMap = new Map<string, ShowcaseEvent>();
    let tournamentsMap = new Map<string, ShowcaseEvent>();

    const updateCombined = () => {
      const combined = new Map<string, ShowcaseEvent>();
      eventsMap.forEach((val, key) => combined.set(key, val));
      tournamentsMap.forEach((val, key) => {
        if (combined.has(key)) {
          combined.set(key, { ...combined.get(key)!, ...val });
        } else {
          combined.set(key, val);
        }
      });

      const sorted = Array.from(combined.values()).sort((a, b) => {
        const dateA = a.date || a.startDate || '';
        const dateB = b.date || b.startDate || '';
        return dateA.localeCompare(dateB);
      });

      setEvents(sorted);
      setLoading(false);
    };

    try {
      const eventsRef = collection(db, 'events');

      unsubscribeEvents = onSnapshot(
        eventsRef,
        (snapshot) => {
          eventsMap = new Map();
          snapshot.docs.forEach((d) => {
            const data = d.data() as any;
            // Omit explicitly draft events from public explore feed
            if (data.status === 'draft') return;

            const rawImg = data.thumbnailUrl || data.flyerUrl || data.bannerUrl || data.imageUrl || data.coverUrl;
            const cleanImg = normalizeImageUrl(rawImg, data.sport);

            const sportType = data.sportType || normalizeSportType(data.sport);
            const rawCategory = data.category || (data.eventType === 'tournament' ? 'Tournament' : data.eventType === 'camp' ? 'Camp' : data.eventType === 'single_game' ? 'Single Game' : 'Showcase');
            const eventType = data.eventType || normalizeEventType(rawCategory);

            const sDate = data.startDate || data.date || data.gameDate || new Date().toISOString().split('T')[0];
            const eDate = data.endDate || sDate;

            const venue = (typeof data.location === 'object' && data.location?.venue)
              ? data.location.venue
              : (data.venueName || data.venue || (typeof data.location === 'string' ? data.location.split(',')[0]?.trim() : 'Athletic Facility'));
            const city = (typeof data.location === 'object' && data.location?.city)
              ? data.location.city
              : (data.city || (typeof data.location === 'string' ? data.location.split(',')[1]?.trim() : 'Local'));
            const state = (typeof data.location === 'object' && data.location?.state)
              ? data.location.state
              : (data.state || (typeof data.location === 'string' ? data.location.split(',')[2]?.trim() : 'USA'));
            const locString = typeof data.location === 'string' ? data.location : `${venue}, ${city}, ${state}`;

            const fee = typeof data.entryFee === 'number'
              ? data.entryFee
              : (typeof data.price === 'number' ? data.price : (Number(data.teamFee) || 0));

            const regTeams = Array.isArray(data.registeredTeamIds) 
              ? data.registeredTeamIds 
              : (Array.isArray(data.participatingTeams) ? data.participatingTeams : []);

            eventsMap.set(d.id, {
              id: d.id,
              title: data.title || data.eventName || data.name || 'Showcase Event',
              sport: data.sport || (sportType === 'flag_football' ? 'Flag Football' : sportType.charAt(0).toUpperCase() + sportType.slice(1)),
              sportType,
              eventType,
              category: (rawCategory as EventCategoryType) || 'Showcase',
              format: data.format || (eventType === 'tournament' ? 'Single Elimination' : 'Showcase'),
              divisions: Array.isArray(data.divisions) && data.divisions.length > 0 ? data.divisions : ['8U', '10U', '12U', '14U', '17U', 'Varsity'],
              aspectRatio: data.aspectRatio || 'banner',
              date: sDate,
              startDate: sDate,
              endDate: eDate,
              time: data.time || '09:00 AM - 04:00 PM',
              location: locString,
              venueName: venue,
              address: data.address || '',
              city,
              state,
              description: data.description || '',
              organizer: data.organizer || data.hostName || 'Just1Play Athletics',
              capacity: Number(data.capacity) || Number(data.maxTeams) || 100,
              registeredCount: Number(data.registeredCount) || regTeams.length || (Array.isArray(data.registeredUserIds) ? data.registeredUserIds.length : 0),
              registeredUserIds: Array.isArray(data.registeredUserIds) ? data.registeredUserIds : [],
              registeredTeamIds: regTeams,
              price: fee,
              teamFee: fee,
              entryFee: data.entryFee || (fee > 0 ? `$${fee}` : 'Free Entry'),
              bannerUrl: cleanImg,
              flyerUrl: cleanImg,
              thumbnailUrl: data.thumbnailUrl || cleanImg,
              status: data.status || 'published',
              ...data
            });
          });
          updateCombined();
        },
        (error) => {
          console.warn('Events snapshot listener warning:', error);
          updateCombined();
        }
      );

      const tournRef = collection(db, 'tournaments');
      unsubscribeTournaments = onSnapshot(
        tournRef,
        (snapshot) => {
          tournamentsMap = new Map();
          snapshot.docs.forEach((d) => {
            const data = d.data() as any;
            const rawImg = data.thumbnailUrl || data.flyerUrl || data.coverUrl || data.bannerUrl || data.imageUrl;
            const cleanImg = normalizeImageUrl(rawImg, data.sport);
            tournamentsMap.set(d.id, {
              id: d.id,
              title: data.title || data.name || data.eventName || 'Tournament Championship',
              sport: data.sport || 'Basketball',
              category: 'Tournament',
              format: data.format || 'Single Elimination',
              divisions: Array.isArray(data.divisions) && data.divisions.length > 0 ? data.divisions : ['10U', '12U', '14U', '17U', 'Varsity'],
              aspectRatio: data.aspectRatio || 'banner',
              date: data.date || data.startDate || new Date().toISOString().split('T')[0],
              startDate: data.startDate || data.date,
              endDate: data.endDate,
              time: data.time || '08:00 AM',
              location: data.location || data.venueName || data.venue || 'Athletic Facility',
              venueName: data.venueName || data.location || 'Athletic Facility',
              address: data.address || '',
              city: data.city || 'Local',
              state: data.state || 'USA',
              description: data.description || 'Official Just1Play Tournament Bracket & Pool Play',
              organizer: data.organizer || 'Tournament Director',
              capacity: Number(data.capacity) || 120,
              registeredCount: Array.isArray(data.participatingTeams) ? data.participatingTeams.length : 0,
              registeredUserIds: Array.isArray(data.registeredUserIds) ? data.registeredUserIds : [],
              price: typeof data.price === 'number' ? data.price : (Number(data.teamFee) || 0),
              teamFee: typeof data.teamFee === 'number' ? data.teamFee : (Number(data.price) || 0),
              entryFee: data.entryFee || (data.teamFee ? `$${data.teamFee}` : (data.price ? `$${data.price}` : 'Free Entry')),
              bannerUrl: cleanImg,
              flyerUrl: cleanImg,
              thumbnailUrl: data.thumbnailUrl || cleanImg,
              status: data.status || 'Upcoming',
              ...data
            });
          });
          updateCombined();
        },
        (error) => {
          console.warn('Tournaments snapshot listener warning:', error);
          updateCombined();
        }
      );

      return () => {
        unsubscribeEvents();
        unsubscribeTournaments();
      };
    } catch (err) {
      console.warn('Firestore setup error:', err);
      setEvents([]);
      setLoading(false);
    }
  }, []);

  // Deep Link Handling from Route Params or Query Params (e.g. /events/:eventId or ?id=evt-hero-101)
  useEffect(() => {
    const targetId = params.eventId || searchParams.get('id');
    if (targetId && events.length > 0) {
      const match = events.find(e => e.id === targetId);
      if (match) {
        setSelectedEvent(match);
        setIsDetailModalOpen(true);
      }
    }
  }, [params.eventId, searchParams, events]);

  // Handle Event Creation callback
  const handleEventCreated = (newEvent: ShowcaseEvent) => {
    setEvents(prev => [newEvent, ...prev.filter(e => e.id !== newEvent.id)]);
    setSelectedEvent(newEvent);
    setIsDetailModalOpen(true);
  };

  // Handle Event Updates (RSVPs, Registrations)
  const handleEventUpdated = (updatedEvent: ShowcaseEvent) => {
    setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
    setSelectedEvent(updatedEvent);
  };

  // Director / Admin / Creator check for deletion
  const canDeleteEvent = (evt: ShowcaseEvent) => {
    if (!user) return false;
    const isUserAdmin = ['admin', 'director', 'super_admin'].includes(role) || 
                       ['admin', 'director', 'super_admin'].includes(canonicalRole) || 
                       user.email === 'kevoiebailey@gmail.com' ||
                       (profile as any)?.isAdmin === true ||
                       (userDoc as any)?.isAdmin === true;
    const isCreator = (evt as any).directorId === user.uid || 
                     (evt as any).creatorId === user.uid || 
                     (evt as any).authorId === user.uid || 
                     (evt as any).hostId === user.uid || 
                     (evt as any).userId === user.uid ||
                     (evt as any).uploadedBy === user.uid;
    return isUserAdmin || isCreator;
  };

  // Handle Deleting Event (Host / Admin only)
  const handleDeleteEvent = async (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to cancel and remove this event?')) return;

    try {
      await deleteDoc(doc(db, 'events', eventId)).catch(() => {});
      setEvents(prev => prev.filter(item => item.id !== eventId));
      showToast('info', 'Event Removed', 'The event has been deleted.');
    } catch (err) {
      setEvents(prev => prev.filter(item => item.id !== eventId));
      showToast('info', 'Event Removed', 'The event has been removed.');
    }
  };

  // Quick 1-Tap Google Calendar Export
  const handleQuickGoogleCalendar = (e: React.MouseEvent, evt: ShowcaseEvent) => {
    e.stopPropagation();
    const safeTime = evt?.time || '09:00 AM - 05:00 PM';
    const url = getGoogleCalendarWebUrl({
      id: evt?.id || 'event',
      title: evt?.title || 'Showcase Event',
      description: `${evt?.description || ''}\n\nVenue: ${evt?.location || evt?.venueName || ''}\nHost: ${evt?.organizer || evt?.hostName || ''}`,
      venue: evt?.location || evt?.venueName || '',
      date: evt?.date || '',
      startTime: safeTime.split(' - ')[0] || '09:00 AM'
    });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Format and Division options
  const formatsList = ['All', 'Single Elimination', 'Double Elimination', 'Round Robin', 'Showcase'];
  const divisionsList = ['All', '8U', '10U', '12U', '14U', '15U', '16U', '17U', 'Varsity'];

  // Filtered Events logic
  const filteredEvents = events.filter((evt) => {
    // 1. Category tab filter
    if (selectedCategory !== 'All') {
      const isTournamentMatch = selectedCategory === 'Tournament' && (evt?.category === 'Tournament' || (evt as any)?.eventType === 'tournament');
      const isCampMatch = selectedCategory === 'Camp' && (evt?.category === 'Camp' || (evt as any)?.eventType === 'camp');
      const isCombineMatch = selectedCategory === 'Combine' && (evt?.category === 'Combine' || (evt as any)?.eventType === 'showcase');
      const isLeagueMatch = (selectedCategory as string) === 'League' && ((evt?.category as any) === 'League' || (evt as any)?.eventType === 'tournament');
      const isDirectMatch = evt?.category === selectedCategory;
      if (!isDirectMatch && !isTournamentMatch && !isCampMatch && !isCombineMatch && !isLeagueMatch) {
        return false;
      }
    }

    // 2. Sport filter
    if (selectedSport !== 'All' && evt?.sport !== 'All Sports') {
      const normSelected = normalizeSportType(selectedSport);
      const normEvt = (evt as any)?.sportType || normalizeSportType(evt?.sport);
      const directMatch = evt?.sport?.toLowerCase() === selectedSport.toLowerCase();
      const normMatch = normEvt === normSelected;
      if (!directMatch && !normMatch) {
        return false;
      }
    }

    // 3. State filter
    if (selectedState !== 'All') {
      const qState = selectedState.toLowerCase();
      const matchState = (evt?.state ? evt.state.toLowerCase() === qState : false) ||
                         (evt?.city ? evt.city.toLowerCase().includes(qState) : false) ||
                         (evt?.location ? evt.location.toLowerCase().includes(qState) : false);
      if (!matchState) return false;
    }

    // 4. Format filter
    if (selectedFormat !== 'All') {
      const evtFormat = (evt as any).format || (evt.category === 'Tournament' ? 'Single Elimination' : 'Showcase');
      if (evtFormat.toLowerCase() !== selectedFormat.toLowerCase()) return false;
    }

    // 5. Division filter
    if (selectedDivision !== 'All') {
      const divisions: string[] = (evt as any).divisions || [];
      const matchDiv = divisions.some(d => String(d).toLowerCase().includes(selectedDivision.toLowerCase()));
      if (!matchDiv) return false;
    }

    // 6. Entry Fee filter
    if (entryFeeFilter === 'Free Only') {
      const isFree = evt.price === 0 || (evt as any).teamFee === 0 || (evt as any).entryFee === 'Free Entry' || (evt as any).entryFee === 'Free';
      if (!isFree) return false;
    } else if (entryFeeFilter === 'Paid') {
      const isPaid = (evt.price && evt.price > 0) || ((evt as any).teamFee && (evt as any).teamFee > 0);
      if (!isPaid) return false;
    }

    // 7. Bookmarks / Saved filter
    if (filterSavedOnly && !savedEventIds.includes(evt.id)) {
      return false;
    }

    // 8. My RSVPs filter
    if (filterMyRsvps && user && !evt?.registeredUserIds?.includes(user.uid)) {
      return false;
    }

    // 9. Search query with division and format matching
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = evt?.title ? evt.title.toLowerCase().includes(q) : false;
      const matchLoc = (evt?.location ? evt.location.toLowerCase().includes(q) : false) || (evt?.venueName ? evt.venueName.toLowerCase().includes(q) : false);
      const matchCity = evt?.city ? evt.city.toLowerCase().includes(q) : false;
      const matchState = evt?.state ? evt.state.toLowerCase().includes(q) : false;
      const matchOrg = (evt?.organizer ? evt.organizer.toLowerCase().includes(q) : false) || (evt?.hostName ? evt.hostName.toLowerCase().includes(q) : false);
      const matchSport = evt?.sport ? evt.sport.toLowerCase().includes(q) : false;
      const matchFormat = (evt as any)?.format ? String((evt as any).format).toLowerCase().includes(q) : false;
      const divisions: string[] = (evt as any)?.divisions || [];
      const matchDivision = divisions.some(d => String(d).toLowerCase().includes(q));

      if (!matchTitle && !matchLoc && !matchCity && !matchState && !matchOrg && !matchSport && !matchFormat && !matchDivision) return false;
    }

    return true;
  });

  // Featured Event (Hero Card)
  const featuredEvent = events.find(e => e?.isFeatured) || events[0];

  // Distinct Sports for dropdown filter
  const sportsList = ['All', 'Football', 'Girls Flag Football', 'Basketball', 'Lacrosse', 'Track & Field', 'Volleyball', 'Soccer', 'Baseball', 'All Sports'];

  // Distinct States from events
  const statesList = ['All', ...Array.from(new Set(events.map(e => e.state).filter(Boolean))).sort()];

  return (
    <div className="min-h-screen bg-[#090D16] text-[#F4F4F4] pb-32 md:pb-16 font-sans">
      
      {/* Top Banner Header & Hero Header Area */}
      <div className="border-b border-[#24324F] bg-gradient-to-b from-[#263238]/40 via-[#090D16] to-[#090D16] pt-6 pb-6 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Top Row: Title, Subtitle, and Role-Gated Host Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#00B8D4] to-[#00F5D4] p-[1.5px] shadow-[0_0_15px_rgba(0,184,212,0.4)]">
                  <div className="w-full h-full bg-[#090D16] rounded-[9.5px] flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-[#00B8D4]" />
                  </div>
                </div>
                <span className="text-[11px] font-black text-[#00B8D4] uppercase font-mono tracking-widest">
                  SHOWCASE & COMBINE ENGINE
                </span>
                <span className="px-2 py-0.5 rounded bg-[#FF6A00]/15 border border-[#FF6A00]/40 text-[#FF6A00] text-[9px] font-black uppercase font-mono">
                  FAT LASER SYNC
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight">
                Events, Combines & Showcases
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
                Discover elite laser-timed combines, verified college prospect showcases, skill camps, and 4K media days. Register with 1-tap or host your own official event.
              </p>
            </div>

            {/* Role-Gated Action CTAs */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                onClick={() => setIsScheduleImporterOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-[#263238] hover:bg-[#2e3c43] border border-[#00B8D4]/40 text-[#00B8D4] font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-[0_0_12px_rgba(0,184,212,0.2)]"
              >
                <Sparkles className="w-4 h-4 text-[#00F5D4]" />
                <span>AI Schedule Importer</span>
              </button>

              {isAuthorizedHost ? (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#00B8D4] to-[#00F5D4] text-[#090D16] font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(0,184,212,0.4)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>⚡ Host New Event</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsApplyModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#263238] hover:bg-[#2e3c43] border border-[#FF6A00]/40 text-[#FF6A00] font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Apply to Host Event</span>
                </button>
              )}

              {user && (
                <button
                  onClick={() => setFilterMyRsvps(!filterMyRsvps)}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border transition-all cursor-pointer ${
                    filterMyRsvps 
                      ? 'bg-[#00B8D4]/20 border-[#00B8D4] text-[#00B8D4] shadow-[0_0_12px_rgba(0,184,212,0.3)]' 
                      : 'bg-[#263238]/60 border-[#24324F] text-slate-300 hover:text-white'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>My RSVPs</span>
                </button>
              )}
            </div>
          </div>

          {/* HERO FEATURED EVENT CARD */}
          {events.length > 0 && featuredEvent && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative rounded-3xl border border-[#24324F] bg-[#263238]/80 shadow-[0_15px_40px_rgba(0,0,0,0.7)] overflow-hidden cursor-pointer group hover:border-[#00B8D4] hover:shadow-[0_0_30px_rgba(0,184,212,0.25)] transition-all duration-300"
              onClick={() => {
                setSelectedEvent(featuredEvent);
                setIsDetailModalOpen(true);
              }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[300px]">
                
                {/* Hero Banner Visual */}
                <div className="lg:col-span-7 relative h-56 lg:h-full overflow-hidden bg-[#090D16]">
                  <img
                    src={normalizeImageUrl(featuredEvent.flyerUrl || featuredEvent.bannerUrl || (featuredEvent as any).coverUrl, featuredEvent.sport)}
                    alt={featuredEvent?.title ?? 'Showcase Event'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-85"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = getSportFallbackImage(featuredEvent?.sport);
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#263238] via-black/40 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-[#263238]" />

                  {/* Badges on Hero Banner */}
                  <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-xl bg-[#090D16]/90 border border-[#00B8D4] text-[#00B8D4] font-black text-xs uppercase font-mono tracking-wider backdrop-blur-md shadow-lg">
                      {featuredEvent?.category?.toUpperCase() ?? 'FEATURED COMBINE'}
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-[#090D16]/90 border border-[#FF6A00] text-[#FF6A00] font-bold text-xs uppercase tracking-wider backdrop-blur-md">
                      {featuredEvent?.sport ?? 'Multi-Sport'}
                    </span>
                  </div>

                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                    <span className="px-3 py-1 rounded-xl bg-black/80 backdrop-blur-md text-[#FFC857] text-xs font-mono font-black border border-amber-500/40">
                      ⚡ FAT LASER CERTIFIED
                    </span>
                    <span className="text-xs font-mono font-bold text-white bg-black/80 px-2.5 py-1 rounded-xl border border-slate-700">
                      {Math.max(0, (featuredEvent?.capacity || 100) - (Number((featuredEvent as any)?.registeredCount) || (featuredEvent?.registeredUserIds?.length || 0)))} SPOTS LEFT
                    </span>
                  </div>
                </div>

                {/* Hero Content Details */}
                <div className="lg:col-span-5 p-5 sm:p-7 flex flex-col justify-between space-y-4 bg-[#263238]/90">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-xs text-[#FFC857] font-mono font-bold">
                      <Calendar className="w-4 h-4" />
                      <span>{featuredEvent?.date ?? 'TBD'}</span>
                      <span className="text-slate-500">•</span>
                      <Clock className="w-4 h-4 text-[#00B8D4]" />
                      {isGenuineKickoffTime(featuredEvent?.time) ? (
                        <span>{featuredEvent?.time}</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30">
                          Time TBA / Network TBD
                        </span>
                      )}
                    </div>

                    <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight group-hover:text-[#00B8D4] transition-colors line-clamp-2">
                      {featuredEvent?.title ?? 'Showcase Event'}
                    </h2>

                    <p className="text-xs sm:text-sm text-slate-300 line-clamp-3 leading-relaxed">
                      {featuredEvent?.description ?? ''}
                    </p>

                    <div className="flex items-center gap-2 text-xs text-slate-300 pt-1">
                      <MapPin className="w-4 h-4 text-[#FF6A00] shrink-0" />
                      <span className="truncate">
                        {formatVenueDisplay(featuredEvent?.venueName || featuredEvent?.location, featuredEvent?.city, featuredEvent?.state)}
                      </span>
                    </div>
                  </div>

                  {/* Hero Bottom Bar with Price & Quick Register */}
                  <div className="pt-4 border-t border-[#24324F] flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase block">REGISTRATION</span>
                      <span className="text-base sm:text-lg font-black text-[#00F5D4] font-mono">
                        {featuredEvent?.price === 0 ? 'FREE RSVP' : `$${featuredEvent?.price ?? 0}.00`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(featuredEvent);
                          setIsDetailModalOpen(true);
                        }}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00B8D4] to-[#00F5D4] text-[#090D16] font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,184,212,0.4)] hover:brightness-110 transition-all cursor-pointer"
                      >
                        <span>View & Register</span>
                        <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            </motion.div>
          )}

        </div>
      </div>

      {/* Main Showcase Discovery Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        
        {/* Category Navigation Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {EVENT_CATEGORY_TABS.map((tab) => {
            const isSelected = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border cursor-pointer ${
                  isSelected
                    ? 'bg-[#00B8D4] text-[#090D16] border-[#00B8D4] shadow-[0_0_15px_rgba(0,184,212,0.4)] scale-[1.02]'
                    : 'bg-[#263238]/60 hover:bg-[#263238] border-[#24324F] text-slate-300 hover:text-white'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search, Filter & View Mode Bar */}
        <div className="p-3.5 rounded-2xl bg-[#263238]/60 border border-[#24324F] space-y-3 shadow-lg">
          
          {/* Top Row: Search Input, Quick Filters, Layout Mode */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tournaments, venues, 14U, Varsity..."
                className="w-full pl-10 pr-4 py-2 bg-[#090D16]/90 border border-[#24324F] focus:border-[#00B8D4] rounded-xl text-xs text-white placeholder:text-slate-500 outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-mono"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Controls: Sport Selector, Format, Division, State, Layout Switcher */}
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
              
              {/* Sport Selector */}
              <div className="flex items-center gap-1.5 bg-[#090D16]/90 border border-[#24324F] px-2.5 py-1.5 rounded-xl">
                <Filter className="w-3.5 h-3.5 text-[#00B8D4]" />
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Sport:</span>
                <select
                  value={selectedSport}
                  onChange={(e) => setSelectedSport(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-white outline-none cursor-pointer pr-1"
                >
                  {sportsList.map((sp) => (
                    <option key={sp} value={sp} className="bg-[#090D16] text-white">
                      {sp}
                    </option>
                  ))}
                </select>
              </div>

              {/* Format Selector */}
              <div className="flex items-center gap-1.5 bg-[#090D16]/90 border border-[#24324F] px-2.5 py-1.5 rounded-xl">
                <span className="text-[10px] font-bold text-[#00F5D4] uppercase font-mono">Format:</span>
                <select
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-white outline-none cursor-pointer pr-1"
                >
                  {formatsList.map((fmt) => (
                    <option key={fmt} value={fmt} className="bg-[#090D16] text-white">
                      {fmt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Division Selector */}
              <div className="flex items-center gap-1.5 bg-[#090D16]/90 border border-[#24324F] px-2.5 py-1.5 rounded-xl">
                <span className="text-[10px] font-bold text-[#FFC857] uppercase font-mono">Div:</span>
                <select
                  value={selectedDivision}
                  onChange={(e) => setSelectedDivision(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-white outline-none cursor-pointer pr-1"
                >
                  {divisionsList.map((div) => (
                    <option key={div} value={div} className="bg-[#090D16] text-white">
                      {div}
                    </option>
                  ))}
                </select>
              </div>

              {/* State Selector */}
              <div className="flex items-center gap-1.5 bg-[#090D16]/90 border border-[#24324F] px-2.5 py-1.5 rounded-xl">
                <Globe className="w-3.5 h-3.5 text-[#FF6A00]" />
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">State:</span>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-white outline-none cursor-pointer pr-1"
                >
                  {statesList.map((st) => (
                    <option key={st} value={st} className="bg-[#090D16] text-white">
                      {st === 'All' ? 'All States' : st}
                    </option>
                  ))}
                </select>
              </div>

              {/* Layout Mode Switcher */}
              <div className="flex items-center bg-[#090D16] border border-[#24324F] rounded-xl p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 sm:px-2 sm:py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-[#00B8D4] text-[#090D16] shadow-[0_0_10px_rgba(0,184,212,0.4)]'
                      : 'text-slate-400 hover:text-white hover:bg-[#24324F]'
                  }`}
                  title="Showcase Cards View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cards</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('calendar')}
                  className={`p-1.5 sm:px-2 sm:py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    viewMode === 'calendar'
                      ? 'bg-[#00B8D4] text-[#090D16] shadow-[0_0_10px_rgba(0,184,212,0.4)]'
                      : 'text-slate-400 hover:text-white hover:bg-[#24324F]'
                  }`}
                  title="Interactive Calendar View"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cal</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('timeline')}
                  className={`p-1.5 sm:px-2 sm:py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    viewMode === 'timeline'
                      ? 'bg-[#00B8D4] text-[#090D16] shadow-[0_0_10px_rgba(0,184,212,0.4)]'
                      : 'text-slate-400 hover:text-white hover:bg-[#24324F]'
                  }`}
                  title="Compact Timeline Schedule"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">List</span>
                </button>
              </div>

            </div>
          </div>

          {/* Bottom Row: Quick Entry Fee Chips, Bookmarks Filter, and Active Filter Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#24324F]/50">
            {/* Entry Fee Chips & Saved Filter */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase mr-1">Fee:</span>
              {(['All', 'Free Only', 'Paid'] as const).map((fee) => (
                <button
                  key={fee}
                  type="button"
                  onClick={() => setEntryFeeFilter(fee)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                    entryFeeFilter === fee
                      ? 'bg-[#00F5D4] text-[#090D16] shadow-[0_0_8px_rgba(0,245,212,0.3)]'
                      : 'bg-[#090D16] text-slate-300 hover:text-white hover:bg-[#24324F] border border-[#24324F]'
                  }`}
                >
                  {fee}
                </button>
              ))}

              {/* Saved / Bookmarked Tournaments Filter */}
              <button
                type="button"
                onClick={() => setFilterSavedOnly(!filterSavedOnly)}
                className={`ml-2 px-3 py-1 rounded-lg text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  filterSavedOnly
                    ? 'bg-[#FFC857] text-[#090D16] shadow-[0_0_10px_rgba(255,200,87,0.4)]'
                    : 'bg-[#090D16] text-slate-300 hover:text-[#FFC857] hover:bg-[#24324F] border border-[#24324F]'
                }`}
              >
                <Bookmark className={`w-3 h-3 ${filterSavedOnly ? 'fill-current' : ''}`} />
                <span>Saved ({savedEventIds.length})</span>
              </button>
            </div>

            {/* Results Count & Reset Filters */}
            <div className="flex items-center gap-3 ml-auto">
              {(selectedSport !== 'All' || selectedFormat !== 'All' || selectedDivision !== 'All' || selectedState !== 'All' || entryFeeFilter !== 'All' || filterSavedOnly || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSport('All');
                    setSelectedFormat('All');
                    setSelectedDivision('All');
                    setSelectedState('All');
                    setEntryFeeFilter('All');
                    setFilterSavedOnly(false);
                    setSearchQuery('');
                  }}
                  className="text-[11px] font-mono text-[#00B8D4] hover:underline cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
              <div className="text-xs font-mono font-bold text-slate-400">
                <span className="text-white">{filteredEvents.length}</span> Tournaments & Events
              </div>
            </div>
          </div>

        </div>

        {/* VIEW CONDITIONAL RENDERING */}
        {loading ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-10 h-10 border-2 border-[#00B8D4] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Syncing Live Events...</p>
          </div>
        ) : events.length === 0 ? (
          /* Obsidian Athletic Empty State */
          <div className="p-12 sm:p-16 text-center rounded-3xl bg-zinc-950/90 border border-zinc-800/80 shadow-[0_15px_40px_rgba(0,0,0,0.8)] space-y-6 max-w-xl mx-auto my-8">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-teal-500/30 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(0,184,212,0.2)]">
              <Calendar className="w-8 h-8 text-[#00B8D4]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                No Live Events Scheduled
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-md mx-auto">
                Official showcases, combine testing, and high school matchups will appear here once published.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsScheduleImporterOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-[#00B8D4]/40 text-[#00B8D4] font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-[0_0_12px_rgba(0,184,212,0.15)]"
              >
                <Sparkles className="w-4 h-4 text-[#00F5D4]" />
                <span>+ Import Schedule</span>
              </button>
              {isAuthorizedHost ? (
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00B8D4] to-[#00F5D4] text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(0,184,212,0.4)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>+ Host Event</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-amber-500/40 text-amber-400 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Apply to Host Event</span>
                </button>
              )}
            </div>
          </div>
        ) : filteredEvents.length === 0 ? (
          /* Empty Search Filter State */
          <div className="p-12 text-center rounded-3xl bg-zinc-900/40 border border-zinc-800 space-y-4">
            <Trophy className="w-12 h-12 text-zinc-600 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-black text-white uppercase">No Matching Events</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                No active showcases match your filters. Try clearing your search query or sport filter.
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedCategory('All');
                setSelectedSport('All');
                setSelectedState('All');
                setSearchQuery('');
                setFilterMyRsvps(false);
              }}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-[#00B8D4] border border-[#00B8D4]/40 font-bold text-xs uppercase tracking-wider transition-all"
            >
              Reset Filters
            </button>
          </div>
        ) : viewMode === 'calendar' ? (
          /* 1. CALENDAR VIEW */
          <EventCalendarView
            events={filteredEvents}
            onSelectEvent={(evt) => {
              setSelectedEvent(evt);
              setIsDetailModalOpen(true);
            }}
            isAuthorizedHost={isAuthorizedHost}
            onHostNewEvent={() => setIsCreateModalOpen(true)}
            userRegisteredEventIds={user ? filteredEvents.filter(e => e.registeredUserIds?.includes(user.uid)).map(e => e.id) : []}
          />
        ) : viewMode === 'timeline' ? (
          /* 2. COMPACT TIMELINE SCHEDULE VIEW */
          <div className="space-y-3">
            {filteredEvents.map((evt) => {
              const isRegistered = Boolean(user && evt.registeredUserIds?.includes(user.uid));
              const registeredCount = Number((evt as any).registeredCount) || (Array.isArray(evt.registeredUserIds) ? evt.registeredUserIds.length : 0);
              const spotsLeft = Math.max(0, (evt.capacity || 100) - registeredCount);
              const isSaved = savedEventIds.includes(evt.id);

              return (
                <motion.div
                  key={evt.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => {
                    setSelectedEvent(evt);
                    setIsDetailModalOpen(true);
                  }}
                  className="p-4 sm:p-5 rounded-2xl bg-[#263238]/60 border border-[#24324F] hover:border-[#00B8D4] hover:bg-[#263238] transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer group shadow-lg"
                >
                  <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                    {/* Date Block */}
                    <div className="w-14 h-14 rounded-2xl bg-[#090D16] border border-[#24324F] group-hover:border-[#00B8D4]/50 flex flex-col items-center justify-center shrink-0 shadow-inner">
                      <span className="text-[10px] font-mono font-bold text-[#00F5D4] uppercase">
                        {evt.date ? new Date(evt.date + 'T00:00:00').toLocaleString('en-US', { month: 'short' }) : 'EVT'}
                      </span>
                      <span className="text-lg font-black text-white font-mono leading-none">
                        {evt.date ? new Date(evt.date + 'T00:00:00').getDate() : '01'}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-[#00B8D4]/15 border border-[#00B8D4]/30 text-[#00B8D4] text-[10px] font-mono font-black uppercase">
                          {evt.category}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold uppercase">
                          {evt.sport}
                        </span>
                        {(evt as any).format && (
                          <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold">
                            {(evt as any).format}
                          </span>
                        )}
                        {isGenuineKickoffTime(evt.time) ? (
                          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#00B8D4]" />
                            <span>{evt.time}</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30">
                            Time TBA / Network TBD
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm sm:text-base font-black text-white uppercase group-hover:text-[#00B8D4] transition-colors truncate">
                        {evt.title}
                      </h3>

                      <p className="text-xs text-slate-400 flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-[#FF6A00] shrink-0" />
                        <span className="truncate">{formatVenueDisplay(evt.venueName || evt.location, evt.city, evt.state)}</span>
                      </p>

                      {/* Division Tags in Timeline */}
                      {Array.isArray((evt as any).divisions) && (evt as any).divisions.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 pt-0.5">
                          {(evt as any).divisions.slice(0, 4).map((div: string) => (
                            <span key={div} className="px-1.5 py-0.2 rounded bg-[#FFC857]/10 border border-[#FFC857]/25 text-[#FFC857] text-[10px] font-mono font-semibold">
                              {div}
                            </span>
                          ))}
                          {(evt as any).divisions.length > 4 && (
                            <span className="text-[10px] font-mono text-slate-400">
                              +{(evt as any).divisions.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions & Price */}
                  <div className="flex items-center justify-between w-full md:w-auto gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-[#24324F] shrink-0">
                    <div className="text-left md:text-right">
                      <span className="text-[9px] font-mono text-slate-400 uppercase block">{spotsLeft} SPOTS LEFT</span>
                      {((evt as any).entryFee && String((evt as any).entryFee).toLowerCase().includes('free')) || evt.price === 0 || (evt as any).teamFee === 0 ? (
                        <span className="text-xs font-black text-emerald-300 font-mono">FREE ENTRY</span>
                      ) : (
                        <span className="text-sm font-black text-[#00F5D4] font-mono">
                          {(evt as any).entryFee || `$${evt.price || (evt as any).teamFee}.00`}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Bookmark Toggle Button */}
                      <button
                        type="button"
                        onClick={(e) => toggleBookmark(e, evt.id)}
                        className={`p-2 rounded-xl border transition-all cursor-pointer ${
                          isSaved
                            ? 'bg-[#FFC857]/20 text-[#FFC857] border-[#FFC857]/50 shadow-[0_0_10px_rgba(255,200,87,0.3)]'
                            : 'bg-[#090D16] hover:bg-[#24324F] text-slate-400 hover:text-white border-[#24324F]'
                        }`}
                        title={isSaved ? 'Saved to Bookmarks' : 'Bookmark Tournament'}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
                      </button>

                      {canDeleteEvent(evt) && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteEvent(e, evt.id)}
                          className="p-2 rounded-xl bg-[#090D16] hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-[#24324F] transition-colors cursor-pointer"
                          title="Delete Event"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => handleQuickGoogleCalendar(e, evt)}
                        className="p-2 rounded-xl bg-[#090D16] hover:bg-[#24324F] border border-[#24324F] text-slate-300 hover:text-white transition-colors"
                        title="Add to Google Calendar"
                      >
                        <CalendarPlus className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(evt);
                          setIsDetailModalOpen(true);
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                          isRegistered
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-gradient-to-r from-[#00B8D4] to-[#00F5D4] text-[#090D16] shadow-[0_0_12px_rgba(0,184,212,0.3)] hover:brightness-110'
                        }`}
                      >
                        {isRegistered ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>RSVP'd</span>
                          </>
                        ) : (
                          <>
                            <span>Register</span>
                            <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                </motion.div>
              );
            })}
          </div>
        ) : (
          /* 3. SHOWCASE CARDS GRID VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredEvents.map((evt) => {
              const isRegistered = Boolean(user && evt.registeredUserIds?.includes(user.uid));
              const registeredCount = Number((evt as any).registeredCount) || (Array.isArray(evt.registeredUserIds) ? evt.registeredUserIds.length : 0);
              const capacity = Number(evt.capacity) || 100;
              const spotsLeft = Math.max(0, capacity - registeredCount);
              const percentFilled = Math.min(100, Math.round((registeredCount / capacity) * 100));

              return (
                <motion.div
                  key={evt.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => {
                    setSelectedEvent(evt);
                    setIsDetailModalOpen(true);
                  }}
                  className="group relative rounded-3xl bg-[#263238] border border-[#24324F] hover:border-[#00B8D4] hover:shadow-[0_0_25px_rgba(0,184,212,0.25)] transition-all duration-300 flex flex-col overflow-hidden cursor-pointer"
                >
                  {/* Card Cover Banner with Aspect Ratio support */}
                  <div className={`relative ${evt.aspectRatio === 'flyer' ? 'aspect-[4/5] sm:aspect-[16/10]' : 'aspect-[16/9]'} w-full overflow-hidden bg-[#090D16]`}>
                    {/* Blurred backdrop for vertical flyers */}
                    {evt.aspectRatio === 'flyer' && (
                      <img
                        src={normalizeImageUrl(evt.thumbnailUrl || evt.flyerUrl || evt.bannerUrl || (evt as any).coverUrl, evt.sport)}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover blur-xl scale-125 opacity-35"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <img
                      src={normalizeImageUrl(evt.thumbnailUrl || evt.flyerUrl || evt.bannerUrl || (evt as any).coverUrl, evt.sport)}
                      alt={evt?.title ?? 'Showcase Event'}
                      className={`w-full h-full ${evt.aspectRatio === 'flyer' ? 'object-contain relative z-10' : 'object-cover'} group-hover:scale-105 transition-transform duration-500`}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getSportFallbackImage(evt?.sport);
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#263238] via-black/30 to-transparent z-10" />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20">
                      <span className="px-2.5 py-1 rounded-xl bg-[#090D16]/90 border border-[#00B8D4]/60 text-[#00B8D4] text-[10px] font-black uppercase font-mono tracking-wider backdrop-blur-md">
                        {evt?.category?.toUpperCase() ?? 'SHOWCASE'}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-1 rounded-xl bg-[#090D16]/90 border border-slate-700 text-white text-[10px] font-bold uppercase tracking-wider backdrop-blur-md">
                          {evt?.sport ?? 'Multi-Sport'}
                        </span>

                        {/* Bookmark Button */}
                        <button
                          type="button"
                          onClick={(e) => toggleBookmark(e, evt.id)}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer backdrop-blur-md ${
                            savedEventIds.includes(evt.id)
                              ? 'bg-[#FFC857]/25 text-[#FFC857] border-[#FFC857]/60 shadow-[0_0_10px_rgba(255,200,87,0.3)]'
                              : 'bg-black/70 hover:bg-[#24324F] text-slate-400 hover:text-white border-slate-700'
                          }`}
                          title={savedEventIds.includes(evt.id) ? 'Saved' : 'Bookmark Tournament'}
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${savedEventIds.includes(evt.id) ? 'fill-current' : ''}`} />
                        </button>

                        {canDeleteEvent(evt) && (
                          <button
                            onClick={(e) => handleDeleteEvent(e, evt.id)}
                            className="p-1.5 rounded-lg bg-black/70 hover:bg-rose-500/30 text-slate-400 hover:text-rose-300 border border-slate-700 transition-colors cursor-pointer"
                            title="Delete Event"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Bottom Status on Banner */}
                    <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between z-20">
                      <span className="text-[11px] font-mono font-bold text-[#FFC857] flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {evt?.date ?? 'TBD'}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-white bg-black/70 px-2 py-0.5 rounded-md">
                        {spotsLeft} SPOTS OPEN
                      </span>
                    </div>
                  </div>

                  {/* Card Content Body */}
                  <div className="p-5 flex flex-col justify-between flex-1 space-y-4">
                    
                    <div className="space-y-2">
                      {/* Format and Division tags */}
                      {((evt as any).format || (Array.isArray((evt as any).divisions) && (evt as any).divisions.length > 0)) && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(evt as any).format && (
                            <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold">
                              {(evt as any).format}
                            </span>
                          )}
                          {Array.isArray((evt as any).divisions) && (evt as any).divisions.slice(0, 3).map((div: string) => (
                            <span key={div} className="px-1.5 py-0.5 rounded-md bg-[#FFC857]/10 border border-[#FFC857]/25 text-[#FFC857] text-[10px] font-mono font-bold">
                              {div}
                            </span>
                          ))}
                          {Array.isArray((evt as any).divisions) && (evt as any).divisions.length > 3 && (
                            <span className="px-1 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono text-slate-400">
                              +{(evt as any).divisions.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      <h3 className="text-base font-black text-white uppercase tracking-tight line-clamp-2 group-hover:text-[#00B8D4] transition-colors">
                        {evt?.title ?? 'Showcase Event'}
                      </h3>

                      <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                        {evt?.description ?? ''}
                      </p>

                      <div className="space-y-1 pt-1 text-xs text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#00B8D4] shrink-0" />
                          {isGenuineKickoffTime(evt?.time) ? (
                            <span className="truncate">{evt?.time}</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30">
                              Time TBA / Network TBD
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#FF6A00] shrink-0" />
                          <span className="truncate">
                            {formatVenueDisplay(evt?.venueName || evt?.location, evt?.city, evt?.state)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Capacity Progress Bar */}
                    <div className="space-y-1 pt-2 border-t border-[#24324F]/60">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-slate-400">{registeredCount} Registered</span>
                        <span className="text-slate-300 font-bold">{percentFilled}% Capacity</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#090D16] overflow-hidden border border-[#24324F]">
                        <div
                          className="h-full bg-gradient-to-r from-[#00B8D4] to-[#FF6A00] rounded-full transition-all duration-300"
                          style={{ width: `${percentFilled}%` }}
                        />
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="pt-3 border-t border-[#24324F] flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[9px] font-mono text-slate-400 uppercase block">ENTRY</span>
                        {((evt as any).entryFee && String((evt as any).entryFee).toLowerCase().includes('free')) || evt.price === 0 || (evt as any).teamFee === 0 ? (
                          <span className="text-xs font-black text-emerald-300 font-mono">
                            FREE ENTRY
                          </span>
                        ) : (
                          <span className="text-sm font-black text-[#00F5D4] font-mono">
                            {(evt as any).entryFee || `$${evt.price || (evt as any).teamFee}.00`}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => handleQuickGoogleCalendar(e, evt)}
                          className="p-2 rounded-xl bg-[#090D16] hover:bg-[#24324F] border border-[#24324F] text-slate-300 hover:text-white transition-colors"
                          title="Add to Google Calendar"
                        >
                          <CalendarPlus className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(evt);
                            setIsDetailModalOpen(true);
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ${
                            isRegistered
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-gradient-to-r from-[#00B8D4] to-[#00F5D4] text-[#090D16] shadow-[0_0_12px_rgba(0,184,212,0.3)] hover:brightness-110'
                          }`}
                        >
                          {isRegistered ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Registered</span>
                            </>
                          ) : evt.price === 0 ? (
                            <>
                              <Zap className="w-3.5 h-3.5 fill-current" />
                              <span>Free RSVP</span>
                            </>
                          ) : (
                            <>
                              <span>Register</span>
                              <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

      </div>

      {/* Host Event Creation Modal */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onEventCreated={handleEventCreated}
        initialCategory={selectedCategory}
      />

      {/* Apply to Host Modal */}
      <ApplyHostModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
      />

      {/* Event Detail & Registration Sheet */}
      <EventDetailModal
        event={selectedEvent}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          // Clean search param
          if (searchParams.get('id')) {
            searchParams.delete('id');
            setSearchParams(searchParams, { replace: true });
          }
        }}
        onEventUpdated={handleEventUpdated}
        onRequireAuth={() => setIsAuthModalOpen(true)}
      />

      {/* Auth Modal Trigger */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultMode="login"
      />

      {/* Universal AI Schedule Importer */}
      <UniversalScheduleImporterModal
        isOpen={isScheduleImporterOpen}
        onClose={() => setIsScheduleImporterOpen(false)}
      />

    </div>
  );
};

export default EventsHub;
