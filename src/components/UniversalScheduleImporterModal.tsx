import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  Shield,
  Trash2,
  Plus,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  UploadCloud,
  FileText,
  AlertCircle,
  RefreshCw,
  Copy,
  ExternalLink,
  X,
  SlidersHorizontal,
  ClipboardCheck,
  Building,
  Trophy,
  Check,
  Globe,
  Link as LinkIcon,
  Star,
  Image as ImageIcon,
  Flame,
  Search,
  Sliders,
  Share2,
} from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, doc, writeBatch, serverTimestamp, setDoc, increment } from 'firebase/firestore';
import { app, db, auth, ensureAuthUser } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { ParsedGame, ScheduledGameDoc } from '../types';

export interface UniversalScheduleImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId?: string;
  teamName?: string;
  sport?: string;
  seasonYear?: number;
  onSuccess?: (savedGames: ParsedGame[], teamId: string) => void;
}

export const FOOTBALL_ACTION_ASSETS = [
  "https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=1200&auto=format&fit=crop&q=80", // Football on green grass turf
  "https://images.unsplash.com/photo-1511886929837-354d827aae26?w=1200&auto=format&fit=crop&q=80", // Football helmet on lights
  "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=1200&auto=format&fit=crop&q=80", // Stadium floodlights bowl
  "https://images.unsplash.com/photo-1577223625816-7546f13df25d?w=1200&auto=format&fit=crop&q=80", // Championship stadium bowl
  "https://images.unsplash.com/photo-1587385789097-0197a7fbd179?w=1200&auto=format&fit=crop&q=80", // Pristine football turf yardlines
  "https://images.unsplash.com/photo-1567521464027-f127ff144326?w=1200&auto=format&fit=crop&q=80", // College football stadium bowl
];

export const FOOTBALL_ASSET_DICTIONARY = FOOTBALL_ACTION_ASSETS;

// Enforce Current Season (Year Guard: 2026)
export const normalizeScheduleDate = (rawDate?: string | null, targetYear: number = 2026): string => {
  if (!rawDate) return `${targetYear}-09-01`;
  const trimmed = String(rawDate).trim();

  // Match ISO YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    let y = parseInt(isoMatch[1], 10);
    if (y < 2025) y = targetYear;
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Match MM/DD/YYYY or MM/DD
  const slashMatch = trimmed.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (slashMatch) {
    const m = slashMatch[1].padStart(2, '0');
    const d = slashMatch[2].padStart(2, '0');
    let y = slashMatch[3]
      ? (slashMatch[3].length === 2 ? 2000 + parseInt(slashMatch[3], 10) : parseInt(slashMatch[3], 10))
      : targetYear;
    if (y < 2025) y = targetYear;
    return `${y}-${m}-${d}`;
  }

  // Match "Oct 2", "Saturday, Sep 25"
  const monthMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };
  const textMatch = trimmed.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})(?:[,\s]+(\d{4}))?/i);
  if (textMatch) {
    const m = monthMap[textMatch[1].toLowerCase().slice(0, 3)] || '09';
    const d = textMatch[2].padStart(2, '0');
    let y = textMatch[3] ? parseInt(textMatch[3], 10) : targetYear;
    if (y < 2025) y = targetYear;
    return `${y}-${m}-${d}`;
  }

  return `${targetYear}-09-01`;
};

// Kickoff Time Display ("TBD" Guard)
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

export const formatKickoffTime = (timeStr?: string | null): { isTbd: boolean; display: string } => {
  if (!isGenuineKickoffTime(timeStr)) {
    return { isTbd: true, display: 'Time TBA / Network TBD' };
  }
  return { isTbd: false, display: timeStr!.trim() };
};

// Venue Formatting Helper: Strip ", Local, USA" and map recognized stadiums
export const formatVenueDisplay = (
  venueOrLocation?: string | null,
  city?: string | null,
  state?: string | null
): string => {
  let rawVenue = (venueOrLocation || '').trim();
  const c = (city || '').trim();
  const s = (state || '').trim();

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

export function sanitizeSportsText(raw: string): string {
  if (!raw || typeof raw !== "string") return "";

  let cleaned = raw.trim();

  // Strip redundant parenthetical city/state/duplicate tags
  cleaned = cleaned.replace(/\s*\([^)]*\([^)]*\)[^)]*\)/gi, "");
  cleaned = cleaned.replace(/\s*\([^)]*\)/g, " ");

  // Strip unclosed opening parentheses or trailing ellipsis from MaxPreps
  cleaned = cleaned.replace(/\s*\([^)]*$/g, "");
  cleaned = cleaned.replace(/\.{2,}/g, "");

  // Collapse spaces
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  // Remove duplicate consecutive words
  const words = cleaned.split(" ");
  const deduplicatedWords: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const curr = words[i];
    const prev = deduplicatedWords[deduplicatedWords.length - 1];
    if (!prev || curr.toLowerCase() !== prev.toLowerCase()) {
      deduplicatedWords.push(curr);
    }
  }
  cleaned = deduplicatedWords.join(" ");

  // Convert to clean Title Case
  cleaned = cleaned
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((w) => {
      if (w === "vs" || w === "vs." || w === "at" || w === "&" || w === "and") return w;
      if (/^[0-9]+(th|st|nd|rd)?$/i.test(w)) return w.toUpperCase();
      if (/^(nj|ny|pa|tx|fl|ca|oh|ga|il|nc|sc|va|md|ct|ma|az|nv)$/i.test(w)) return w.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");

  return cleaned.trim();
}

export function isFutureMatch(dateStr: string): boolean {
  if (!dateStr) return false;
  const todayIso = new Date().toISOString().split("T")[0];
  return dateStr > todayIso;
}

const SPORTS_THUMBNAIL_PRESETS: Record<string, string[]> = {
  Football: FOOTBALL_ACTION_ASSETS,
  "Flag Football": FOOTBALL_ACTION_ASSETS,
  Basketball: [
    "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1519766304817-4f37bda74a29?w=1200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1518063319789-7217e6706b04?w=1200&auto=format&fit=crop&q=80",
  ],
  Soccer: [
    "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=1200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=1200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&auto=format&fit=crop&q=80",
  ],
  Baseball: [
    "https://images.unsplash.com/photo-1508344928928-7165b67de128?w=1200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1578873375969-d71e3c847248?w=1200&auto=format&fit=crop&q=80",
  ],
  Softball: [
    "https://images.unsplash.com/photo-1508344928928-7165b67de128?w=1200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1578873375969-d71e3c847248?w=1200&auto=format&fit=crop&q=80",
  ],
  Volleyball: [
    "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=1200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1592656094267-764a45160876?w=1200&auto=format&fit=crop&q=80",
  ],
  "Track & Field": [
    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200&auto=format&fit=crop&q=80",
  ],
  Sports: [
    "https://images.unsplash.com/photo-1471295253337-3ceaaedca402?w=1200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=1200&auto=format&fit=crop&q=80",
  ]
};

const PRESET_URL_SAMPLES = [
  {
    name: 'West Orange Mountaineers Football',
    sport: 'Football',
    badge: 'MaxPreps Official',
    url: 'https://www.maxpreps.com/nj/west-orange/west-orange-mountaineers/football/schedule/',
    description: 'West Orange High School Varsity Football Season Schedule'
  },
  {
    name: 'MaxPreps Varsity Football',
    sport: 'Football',
    badge: 'MaxPreps',
    url: 'https://www.maxpreps.com/high-schools/centennial-bulldogs-(las-vegas,nv)/football/schedule.htm',
    description: 'Centennial High School Varsity Football 2026 Season Schedule'
  },
  {
    name: 'High School Varsity Basketball',
    sport: 'Basketball',
    badge: 'rSchoolToday',
    url: 'https://www.nwcsd.k12.ny.us/athletics/schedules/varsity-boys-basketball',
    description: 'Winter League Basketball Fixtures & Tournaments'
  },
  {
    name: 'District Athletic Portal',
    sport: 'Soccer',
    badge: 'School Portal',
    url: 'https://athletics.passaicschools.org/teams/soccer/varsity',
    description: 'Conference Championship & Rivalry Matches'
  }
];

const PRESET_TEXT_SAMPLES = [
  {
    name: 'MaxPreps Football Varsity',
    badge: 'High School',
    sport: 'Football',
    text: `08/25/2026 - 7:00 PM vs. Bishop Gorman Gaels (Season Opener - MetLife Stadium) [W 28-21]
09/01/2026 - 6:30 PM @ Passaic County Tech (Wayne, NJ) [W 35-14]
09/08/2026 - 7:00 PM vs Ridgewood Maroons (Rivalry Game)
09/15/2026 - 7:00 PM @ Wayne Hills Patriots
09/22/2026 - 6:00 PM vs Eastside Ghosts (Homecoming Game)
09/29/2026 - 11:00 AM vs Northern Highlands (Youth Night)
10/06/2026 - 7:00 PM @ Hackensack Comets
10/13/2026 - 6:30 PM vs Teaneck Highwaymen (Senior Night)
10/20/2026 - 7:00 PM vs State Tournament Quarterfinals (Championship Field)`,
  },
  {
    name: 'Winter League Basketball',
    badge: 'High School / AAU',
    sport: 'Basketball',
    text: `Centennial Bulldogs Boys Basketball 2026-2027 Schedule:
- Fri Nov 14: 6:00 PM at St. Anthony Gym (Away) vs Jersey City Pride (Tip-Off Classic) [W 72-68]
- Tue Nov 18: 7:30 PM Home against Hoboken RedWings (Main Arena) [W 84-79]
- Sat Nov 22: 1:00 PM at Newark Tech (Away) [L 62-65]
- Fri Dec 05: 6:30 PM Home vs Union City Soaring Eagles (Conference Game)
- Sat Dec 13: 11:00 AM vs Paterson Eastside (Orlando Holiday Classic - Neutral Site)
- Tue Jan 06: 7:00 PM at Memorial Tigers (West New York)
- Fri Jan 16: 6:00 PM vs Hudson Catholic (Division Playoff Preview - ESPN+)`,
  },
  {
    name: 'NCAA D1 Collegiate Football',
    badge: 'College',
    sport: 'Football',
    text: `Aug 31 (Sat) 12:00 PM vs #8 Penn State (Morgantown, WV) Mountaineer Field [FOX] [W 34-31]
Sep 07 (Sat) 6:00 PM vs Albany (Morgantown, WV) Mountaineer Field [ESPN+] [W 49-14]
Sep 14 (Sat) 3:30 PM @ Pittsburgh (Pittsburgh, PA) Acrisure Stadium [ESPN]
Sep 21 (Sat) 7:00 PM vs Kansas * (Morgantown, WV) Mountaineer Field (Big 12 Opener)
Oct 05 (Sat) 4:00 PM @ Oklahoma State * (Stillwater, OK) Boone Pickens Stadium
Oct 12 (Sat) 8:00 PM vs Iowa State * (Morgantown, WV) Mountaineer Field (Stripe the Stadium)
Oct 26 (Sat) 7:00 PM @ Arizona * (Tucson, AZ) Arizona Stadium
Nov 09 (Sat) 1:00 PM @ Cincinnati * (Cincinnati, OH) Nippert Stadium
Nov 16 (Sat) 12:00 PM vs Baylor * (Morgantown, WV) Mountaineer Field (Senior Day)`,
  },
];

export const UniversalScheduleImporterModal: React.FC<UniversalScheduleImporterModalProps> = ({
  isOpen,
  onClose,
  teamId = 'team-default-1',
  teamName = 'Just1Play Varsity Team',
  sport = 'Football',
  seasonYear = new Date().getFullYear(),
  onSuccess,
}) => {
  const { user } = useAuth();

  // Wizard Steps: 1 = Source Input, 2 = Verification Grid, 3 = Confirmation
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [inputMode, setInputMode] = useState<'url' | 'text'>('url');

  // Input States
  const [scheduleUrl, setScheduleUrl] = useState<string>('');
  const [rawText, setRawText] = useState<string>('');
  const [selectedSport, setSelectedSport] = useState<string>(sport);
  const [selectedYear, setSelectedYear] = useState<number>(seasonYear);
  const [targetTeamId, setTargetTeamId] = useState<string>(teamId);
  const [targetTeamName, setTargetTeamName] = useState<string>(teamName);

  // Destination Toggles
  const [createFeaturedEvents, setCreateFeaturedEvents] = useState<boolean>(true);
  const [saveToTeamSchedule, setSaveToTeamSchedule] = useState<boolean>(true);
  const [syncToMatches, setSyncToMatches] = useState<boolean>(true);
  const [postToActivityWall, setPostToActivityWall] = useState<boolean>(true);

  // Parsing & State
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parsedGames, setParsedGames] = useState<ParsedGame[]>([]);
  const [savedCount, setSavedCount] = useState<number>(0);
  const [activeFilter, setActiveFilter] = useState<'all' | 'home' | 'away'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const handleLoadUrlPreset = (preset: typeof PRESET_URL_SAMPLES[0]) => {
    setScheduleUrl(preset.url);
    setSelectedSport(preset.sport);
    setErrorMessage(null);
  };

  const handleLoadTextPreset = (preset: typeof PRESET_TEXT_SAMPLES[0]) => {
    setRawText(preset.text);
    setSelectedSport(preset.sport);
    setErrorMessage(null);
  };

  // Trigger Gemini AI Extraction
  const handleAnalyzeWithAI = async () => {
    if (inputMode === 'url' && !scheduleUrl.trim()) {
      setErrorMessage('Please enter or paste a valid school schedule URL.');
      return;
    }
    if (inputMode === 'text' && !rawText.trim()) {
      setErrorMessage('Please paste or type raw schedule text to analyze.');
      return;
    }

    setIsParsing(true);
    setErrorMessage(null);
    setStatusMessage(inputMode === 'url' ? 'Fetching school webpage and stripping HTML...' : 'Analyzing schedule fixtures with Gemini AI...');

    try {
      let gamesResult: ParsedGame[] | null = null;

      // 1. Call Backend API endpoint with URL or Raw Text
      const res = await fetch('/api/schedule/parse-universal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: inputMode === 'url' ? scheduleUrl.trim() : undefined,
          rawText: inputMode === 'text' ? rawText.trim() : undefined,
          seasonYear: selectedYear,
          sport: selectedSport,
          teamName: targetTeamName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to extract schedule from source with Gemini AI.');
      }

      gamesResult = data.games || [];
      const cleanSport = sanitizeSportsText(data.detectedSport || selectedSport || 'Football');
      setSelectedSport(cleanSport);

      const cleanTeam = sanitizeSportsText(data.detectedTeamName || targetTeamName || 'Just1Play Varsity Team');
      if (cleanTeam && cleanTeam !== 'Home Team') {
        setTargetTeamName(cleanTeam);
      }

      if (!gamesResult || gamesResult.length === 0) {
        throw new Error('No game fixtures could be extracted. Please check the URL or paste the raw schedule text.');
      }

      const isFootballSport = /football|flag/i.test(cleanSport);
      const sanitizedGames: ParsedGame[] = gamesResult.map((item: any, idx: number) => {
        const isFuture = isFutureMatch(item.date);
        const opp = sanitizeSportsText(item.opponent || `Opponent ${idx + 1}`);
        const loc = sanitizeSportsText(item.location || (item.isHome ? 'Home Stadium' : 'Away Field'));
        const banner = isFootballSport
          ? FOOTBALL_ACTION_ASSETS[idx % FOOTBALL_ACTION_ASSETS.length]
          : (item.bannerUrl || SPORTS_THUMBNAIL_PRESETS[cleanSport]?.[idx % (SPORTS_THUMBNAIL_PRESETS[cleanSport]?.length || 1)] || FOOTBALL_ACTION_ASSETS[0]);

        return {
          ...item,
          opponent: opp,
          location: loc,
          suggestedTitle: item.suggestedTitle ? sanitizeSportsText(item.suggestedTitle) : `${cleanTeam} ${item.isHome ? 'vs' : 'at'} ${opp}`,
          bannerUrl: banner,
          flyerUrl: banner,
          homeScore: isFuture ? null : (typeof item.homeScore === 'number' ? item.homeScore : null),
          awayScore: isFuture ? null : (typeof item.awayScore === 'number' ? item.awayScore : null),
          result: isFuture ? null : (item.result || null),
          status: isFuture ? 'upcoming' : (item.status || (item.result ? 'completed' : 'upcoming')),
        };
      });

      setParsedGames(sanitizedGames);
      setCurrentStep(2);
    } catch (err: any) {
      console.error('Universal Schedule Importer Error:', err);
      setErrorMessage(err.message || 'Failed to parse schedule. Please check the URL or paste the text directly.');
    } finally {
      setIsParsing(false);
      setStatusMessage('');
    }
  };

  // Row Manipulation
  const handleUpdateGameField = (index: number, field: keyof ParsedGame, value: any) => {
    setParsedGames((prev) => {
      const updated = [...prev];
      let cleanVal = value;
      if (field === 'opponent' || field === 'location' || field === 'suggestedTitle') {
        cleanVal = sanitizeSportsText(String(value));
      }
      
      const newGame = {
        ...updated[index],
        [field]: cleanVal,
      };

      // If date changed, re-evaluate future match guard
      if (field === 'date') {
        const isFuture = isFutureMatch(String(cleanVal));
        if (isFuture) {
          newGame.homeScore = null;
          newGame.awayScore = null;
          newGame.result = null;
          newGame.status = 'upcoming';
        }
      }

      updated[index] = newGame;
      return updated;
    });
  };

  const handleToggleHomeAway = (index: number) => {
    setParsedGames((prev) => {
      const updated = [...prev];
      const newIsHome = !updated[index].isHome;
      updated[index] = {
        ...updated[index],
        isHome: newIsHome,
        homeOrAway: newIsHome ? 'Home' : 'Away',
        location: newIsHome ? 'Home Stadium' : 'Away Field',
      };
      return updated;
    });
  };

  const handleToggleFeatured = (index: number) => {
    setParsedGames((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        isFeatured: !updated[index].isFeatured,
      };
      return updated;
    });
  };

  const handleCycleThumbnail = (index: number) => {
    setParsedGames((prev) => {
      const updated = [...prev];
      const isFootballSport = /football|flag/i.test(selectedSport);
      const banners = isFootballSport ? FOOTBALL_ACTION_ASSETS : (SPORTS_THUMBNAIL_PRESETS[selectedSport] || FOOTBALL_ACTION_ASSETS);
      const current = updated[index].bannerUrl || banners[0];
      const currentIdx = banners.indexOf(current);
      const nextBanner = banners[(currentIdx + 1) % banners.length];
      
      updated[index] = {
        ...updated[index],
        bannerUrl: nextBanner,
        flyerUrl: nextBanner,
      };
      return updated;
    });
  };

  const handleDeleteGame = (index: number) => {
    setParsedGames((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDuplicateGame = (index: number) => {
    setParsedGames((prev) => {
      const updated = [...prev];
      const target = updated[index];
      updated.splice(index + 1, 0, {
        ...target,
        opponent: `${target.opponent} (Copy)`,
      });
      return updated;
    });
  };

  const handleAddBlankGame = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const sportKey = Object.keys(SPORTS_THUMBNAIL_PRESETS).find(k => k.toLowerCase() === selectedSport.toLowerCase()) || 'Football';
    const defaultBanner = SPORTS_THUMBNAIL_PRESETS[sportKey]?.[0] || SPORTS_THUMBNAIL_PRESETS['Sports'][0];

    const newGame: ParsedGame = {
      date: todayStr,
      time: '07:00 PM',
      opponent: 'New Opponent High School',
      isHome: true,
      homeOrAway: 'Home',
      location: 'Home Stadium',
      gameType: 'Regular Season',
      notes: null,
      bannerUrl: defaultBanner,
      flyerUrl: defaultBanner,
      isFeatured: false,
      homeScore: null,
      awayScore: null,
      result: null,
      status: 'scheduled',
      sport: selectedSport
    };
    setParsedGames((prev) => [...prev, newGame]);
  };

  // Step 2 -> 3: Batch Save to Firestore (Real Events + Schedules + Matches)
  const handleConfirmAndSave = async () => {
    if (!parsedGames.length) {
      setErrorMessage('No games in the list to save.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const currentAuth = user || auth.currentUser || (await ensureAuthUser());
      const activeUid = currentAuth?.uid || 'system_admin';

      const CHUNK_SIZE = 80;
      const totalGames = parsedGames.length;

      for (let i = 0; i < totalGames; i += CHUNK_SIZE) {
        const chunk = parsedGames.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);

        chunk.forEach((game, idx) => {
          const actualIdx = i + idx;
          const gameId = `evt-match-${Date.now()}-${actualIdx}`;
          
          // Fallback image banner
          const sportKey = Object.keys(SPORTS_THUMBNAIL_PRESETS).find(k => k.toLowerCase() === (game.sport || selectedSport).toLowerCase()) || 'Football';
          const defaultBanner = SPORTS_THUMBNAIL_PRESETS[sportKey]?.[actualIdx % (SPORTS_THUMBNAIL_PRESETS[sportKey]?.length || 1)] || SPORTS_THUMBNAIL_PRESETS['Sports'][0];
          const bannerImage = game.bannerUrl || defaultBanner;

          const isFuture = isFutureMatch(game.date);
          const cleanTargetTeam = sanitizeSportsText(targetTeamName);
          const cleanOpponent = sanitizeSportsText(game.opponent);
          const cleanVenue = sanitizeSportsText(game.location || (game.isHome ? 'Home Stadium' : 'Away Field'));
          const cleanSport = sanitizeSportsText(game.sport || selectedSport);
          const homeTeamName = game.isHome ? cleanTargetTeam : cleanOpponent;
          const awayTeamName = game.isHome ? cleanOpponent : cleanTargetTeam;
          const cleanTitle = sanitizeSportsText(game.suggestedTitle || `${homeTeamName} ${game.isHome ? 'vs' : 'at'} ${awayTeamName}`);
          const isCompleted = isFuture ? false : Boolean(game.result || (game.homeScore !== null && game.homeScore !== undefined));

          // 1. Create Real Featured Event in Firestore `events` collection
          if (createFeaturedEvents) {
            const eventDocRef = doc(db, 'events', gameId);
            const fullEventPayload = {
              id: gameId,
              title: cleanTitle,
              sport: cleanSport,
              category: 'Matchup',
              gameDate: game.date,
              date: game.date,
              time: game.time || '07:00 PM',
              venue: cleanVenue,
              venueName: cleanVenue,
              location: cleanVenue,
              city: cleanVenue.includes(',') ? cleanVenue.split(',')[1]?.trim() : 'Local',
              state: 'USA',
              description: game.notes 
                ? `${game.gameType || 'Varsity'} ${cleanSport} matchup. Feature note: ${game.notes}`
                : `Official high school varsity ${cleanSport.toLowerCase()} game featuring ${homeTeamName} and ${awayTeamName}.`,
              organizer: cleanTargetTeam,
              hostName: cleanTargetTeam,
              directorId: activeUid,
              authorId: activeUid,
              userId: activeUid,
              creatorId: activeUid,
              uploadedBy: activeUid,
              capacity: 1000,
              maxTeams: 32,
              registeredCount: 0,
              registeredUserIds: [],
              price: 0,
              bannerUrl: bannerImage,
              flyerUrl: bannerImage,
              imageUrl: bannerImage,
              isFeatured: Boolean(game.isFeatured),
              status: isFuture ? 'upcoming' : (isCompleted ? 'completed' : 'upcoming'),
              homeTeam: homeTeamName,
              awayTeam: awayTeamName,
              homeScore: isFuture ? null : (game.homeScore !== undefined ? game.homeScore : null),
              awayScore: isFuture ? null : (game.awayScore !== undefined ? game.awayScore : null),
              result: isFuture ? null : (game.result || null),
              gameType: game.gameType || 'Regular Season',
              notes: game.notes || null,
              sourceUrl: game.sourceUrl || scheduleUrl || null,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            batch.set(eventDocRef, fullEventPayload, { merge: true });
          }

          // 2. Add to Team Schedule `teams/{teamId}/schedules` and `teams/{teamId}/games`
          if (saveToTeamSchedule) {
            const teamScheduleDocRef = doc(db, 'teams', targetTeamId, 'schedules', gameId);
            const teamGameDocRef = doc(db, 'teams', targetTeamId, 'games', gameId);
            const teamGamePayload: ScheduledGameDoc = {
              id: gameId,
              date: game.date,
              time: game.time,
              opponent: game.opponent,
              isHome: Boolean(game.isHome),
              homeOrAway: game.isHome ? 'Home' : 'Away',
              location: game.location || (game.isHome ? 'Home Stadium' : 'Away Field'),
              gameType: game.gameType || 'Regular Season',
              notes: game.notes || null,
              status: isCompleted ? 'completed' : 'scheduled',
              homeScore: game.homeScore !== undefined ? game.homeScore : null,
              awayScore: game.awayScore !== undefined ? game.awayScore : null,
              result: game.result || null,
              bannerUrl: bannerImage,
              sport: game.sport || selectedSport,
              source: inputMode === 'url' ? 'ai_url_importer' : 'ai_universal_importer',
              authorId: activeUid,
              userId: activeUid,
              directorId: activeUid,
              createdAt: serverTimestamp(),
            };
            batch.set(teamScheduleDocRef, teamGamePayload, { merge: true });
            batch.set(teamGameDocRef, teamGamePayload, { merge: true });
          }

          // 3. Sync to Global Games and Tournament Matches
          if (syncToMatches) {
            const globalGameDocRef = doc(db, 'games', gameId);
            const matchDocRef = doc(db, 'tournamentMatches', gameId);
            
            batch.set(globalGameDocRef, {
              id: gameId,
              date: game.date,
              time: game.time,
              sport: selectedSport,
              teamName: targetTeamName,
              homeTeam: homeTeamName,
              awayTeam: awayTeamName,
              homeScore: game.homeScore || 0,
              awayScore: game.awayScore || 0,
              result: game.result || null,
              status: isCompleted ? 'Completed' : 'Scheduled',
              location: game.location,
              gameType: game.gameType,
              bannerUrl: bannerImage,
            }, { merge: true });

            batch.set(matchDocRef, {
              id: gameId,
              tournamentId: 'tourn-season-fixtures',
              round: 1,
              matchNumber: actualIdx + 1,
              homeTeam: homeTeamName,
              awayTeam: awayTeamName,
              scheduledTime: `${game.date} • ${game.time}`,
              venueName: game.location || 'Stadium Arena',
              status: isCompleted ? 'Completed' : 'Scheduled',
              homeScore: game.homeScore || 0,
              awayScore: game.awayScore || 0,
              sport: selectedSport,
              bannerUrl: bannerImage,
            }, { merge: true });
          }
        });

        // Update team metadata on the final chunk
        if (i + CHUNK_SIZE >= totalGames) {
          const teamDocRef = doc(db, 'teams', targetTeamId);
          batch.set(
            teamDocRef,
            {
              name: targetTeamName,
              sport: selectedSport,
              totalGames: increment(parsedGames.length),
              lastScheduleSyncAt: serverTimestamp(),
              scheduleSource: inputMode === 'url' ? 'ai_url_scraper' : 'ai_universal_importer',
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }

        await batch.commit();
      }

      // 4. Broadcast Real-time announcement to Activity stream
      if (postToActivityWall && user) {
        try {
          const activityDocRef = doc(collection(db, 'activity'));
          await setDoc(activityDocRef, {
            type: 'SCHEDULE_IMPORTED',
            title: `📅 ${targetTeamName} Schedule Imported`,
            content: `Synchronized ${parsedGames.length} ${selectedSport} matchups & real featured events to the app via Gemini AI.`,
            authorId: user.uid,
            authorName: user.displayName || targetTeamName,
            authorPhoto: user.photoURL || null,
            teamId: targetTeamId,
            teamName: targetTeamName,
            sport: selectedSport,
            totalGames: parsedGames.length,
            createdAt: serverTimestamp(),
          });
        } catch (actErr) {
          console.warn('Activity feed post error:', actErr);
        }
      }

      setSavedCount(parsedGames.length);
      if (onSuccess) {
        onSuccess(parsedGames, targetTeamId);
      }
      setCurrentStep(3);
    } catch (err: any) {
      console.error('Batch Save Error:', err);
      setErrorMessage(err.message || 'Failed to save events to database. Please check Firestore permissions.');
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered games
  const filteredGames = parsedGames.filter((g) => {
    if (activeFilter === 'home' && !g.isHome) return false;
    if (activeFilter === 'away' && g.isHome) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        g.opponent.toLowerCase().includes(q) ||
        g.location.toLowerCase().includes(q) ||
        g.date.includes(q) ||
        (g.notes && g.notes.toLowerCase().includes(q)) ||
        (g.suggestedTitle && g.suggestedTitle.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-5xl my-auto bg-[#090D16] border border-[#24324F] rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#24324F] bg-gradient-to-r from-[#263238] via-[#090D16] to-[#090D16]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#00B8D4] to-[#00F5D4] p-[1.5px] shadow-[0_0_20px_rgba(0,184,212,0.4)]">
              <div className="w-full h-full bg-[#090D16] rounded-[14.5px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#00B8D4]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white uppercase tracking-tight">
                  Universal AI Schedule & Event Importer
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#00B8D4]/15 border border-[#00B8D4]/40 text-[#00B8D4] text-[9px] font-black uppercase font-mono tracking-wider">
                  Gemini 2.5 Flash
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Auto-scrape school websites or paste fixtures to generate full featured events with 4K thumbnails & scoreboards.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#263238] hover:bg-[#2e3c43] text-slate-400 hover:text-white border border-[#24324F] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STEP PROGRESS TRACKER */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-[#090D16] border-b border-[#24324F]/60 text-xs">
          <div className="flex items-center gap-6">
            <div className={`flex items-center gap-2 font-mono font-bold ${currentStep === 1 ? 'text-[#00B8D4]' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentStep === 1 ? 'bg-[#00B8D4] text-[#090D16]' : 'bg-[#263238] text-slate-300'}`}>1</span>
              <span>1. Source & Options</span>
            </div>
            <span className="text-slate-600">›</span>
            <div className={`flex items-center gap-2 font-mono font-bold ${currentStep === 2 ? 'text-[#00B8D4]' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentStep === 2 ? 'bg-[#00B8D4] text-[#090D16]' : 'bg-[#263238] text-slate-300'}`}>2</span>
              <span>2. Review Thumbnails & Matchups</span>
            </div>
            <span className="text-slate-600">›</span>
            <div className={`flex items-center gap-2 font-mono font-bold ${currentStep === 3 ? 'text-[#00B8D4]' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentStep === 3 ? 'bg-[#00B8D4] text-[#090D16]' : 'bg-[#263238] text-slate-300'}`}>3</span>
              <span>3. Live App Sync</span>
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-400 hidden sm:block">
            Target Team: <span className="text-white font-bold">{targetTeamName}</span> ({selectedSport})
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* ERROR NOTIFICATION */}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
              <div className="space-y-1">
                <h4 className="font-bold text-white">Import Error</h4>
                <p className="leading-relaxed">{errorMessage}</p>
              </div>
            </motion.div>
          )}

          {/* STEP 1: SOURCE SELECTION & URL/TEXT INPUT */}
          {currentStep === 1 && (
            <div className="space-y-6">
              
              {/* Tab Selector: URL Auto-Scrape vs Raw Text Paste */}
              <div className="grid grid-cols-2 gap-3 p-1.5 rounded-2xl bg-[#263238]/60 border border-[#24324F]">
                <button
                  type="button"
                  onClick={() => setInputMode('url')}
                  className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer ${
                    inputMode === 'url'
                      ? 'bg-gradient-to-r from-[#00B8D4] to-[#00F5D4] text-[#090D16] shadow-[0_0_15px_rgba(0,184,212,0.4)]'
                      : 'text-slate-300 hover:text-white hover:bg-[#263238]'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  <span>Auto-Import from School Website URL</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInputMode('text')}
                  className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer ${
                    inputMode === 'text'
                      ? 'bg-gradient-to-r from-[#00B8D4] to-[#00F5D4] text-[#090D16] shadow-[0_0_15px_rgba(0,184,212,0.4)]'
                      : 'text-slate-300 hover:text-white hover:bg-[#263238]'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Paste Schedule Text / iCal / Email</span>
                </button>
              </div>

              {/* Mode A: URL Input */}
              {inputMode === 'url' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 uppercase font-mono flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <LinkIcon className="w-3.5 h-3.5 text-[#00B8D4]" />
                        Public School Athletics or League Schedule URL:
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">MaxPreps • rSchoolToday • Hudl • Sidearm</span>
                    </label>

                    <div className="relative">
                      <input
                        type="url"
                        value={scheduleUrl}
                        onChange={(e) => setScheduleUrl(e.target.value)}
                        placeholder="https://www.maxpreps.com/high-schools/.../schedule.htm"
                        className="w-full pl-4 pr-24 py-3.5 rounded-2xl bg-[#090D16] border border-[#24324F] focus:border-[#00B8D4] text-white text-xs font-mono outline-none shadow-inner transition"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const text = await navigator.clipboard.readText();
                            if (text) setScheduleUrl(text);
                          } catch (e) {}
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-[#263238] hover:bg-[#2e3c43] text-[10px] font-bold text-[#00B8D4] border border-[#24324F] transition cursor-pointer"
                      >
                        Paste URL
                      </button>
                    </div>
                  </div>

                  {/* 1-Click Sample High School URLs */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-mono text-slate-400 uppercase block">
                      Or Try 1-Click High School Sample Schedule URLs:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {PRESET_URL_SAMPLES.map((sample, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleLoadUrlPreset(sample)}
                          className="p-3 rounded-2xl bg-[#263238]/40 hover:bg-[#263238] border border-[#24324F] hover:border-[#00B8D4]/60 text-left transition space-y-1 cursor-pointer group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white group-hover:text-[#00B8D4] transition">
                              {sample.name}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-[#00B8D4]/15 text-[#00B8D4] text-[9px] font-mono font-black uppercase">
                              {sample.badge}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 truncate">{sample.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Mode B: Raw Text Paste */}
              {inputMode === 'text' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 uppercase font-mono flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#00B8D4]" />
                        Paste Raw Schedule Text / Email / iCal:
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Any messy format supported</span>
                    </label>

                    <textarea
                      rows={8}
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      placeholder={`Example:\n08/25/2026 - 7:00 PM vs Bishop Gorman (Homecoming) [W 28-21]\n09/01/2026 - 6:30 PM @ Passaic County Tech\n09/08/2026 - 7:00 PM vs Ridgewood Maroons (MetLife Stadium)`}
                      className="w-full p-4 rounded-2xl bg-[#090D16] border border-[#24324F] focus:border-[#00B8D4] text-white text-xs font-mono outline-none shadow-inner leading-relaxed custom-scrollbar"
                    />
                  </div>

                  {/* Preset Text Samples */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-mono text-slate-400 uppercase block">
                      Quick Load Sample Schedule Formats:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {PRESET_TEXT_SAMPLES.map((sample, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleLoadTextPreset(sample)}
                          className="p-3 rounded-2xl bg-[#263238]/40 hover:bg-[#263238] border border-[#24324F] hover:border-[#00B8D4]/60 text-left transition space-y-1 cursor-pointer group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white group-hover:text-[#00B8D4] transition">
                              {sample.name}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-[#FF6A00]/15 text-[#FF6A00] text-[9px] font-mono font-black uppercase">
                              {sample.badge}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400">{sample.sport} format</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SPORT, TEAM & SEASON SETTINGS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-[#263238]/40 border border-[#24324F]">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Target Sport</label>
                  <select
                    value={selectedSport}
                    onChange={(e) => setSelectedSport(e.target.value)}
                    className="w-full px-3 py-2 bg-[#090D16] border border-[#24324F] focus:border-[#00B8D4] rounded-xl text-xs text-white outline-none cursor-pointer font-bold"
                  >
                    <option value="Football">🏈 Football (Varsity / JV)</option>
                    <option value="Basketball">🏀 Basketball</option>
                    <option value="Soccer">⚽ Soccer</option>
                    <option value="Baseball">⚾ Baseball</option>
                    <option value="Softball">🥎 Softball</option>
                    <option value="Volleyball">🏐 Volleyball</option>
                    <option value="Track & Field">🏃 Track & Field</option>
                    <option value="Sports">🏆 Multi-Sport / Tournament</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">School / Team Name</label>
                  <input
                    type="text"
                    value={targetTeamName}
                    onChange={(e) => setTargetTeamName(e.target.value)}
                    placeholder="e.g. Centennial High School"
                    className="w-full px-3 py-2 bg-[#090D16] border border-[#24324F] focus:border-[#00B8D4] rounded-xl text-xs text-white outline-none font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Season Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#090D16] border border-[#24324F] focus:border-[#00B8D4] rounded-xl text-xs text-white outline-none cursor-pointer font-bold font-mono"
                  >
                    <option value={2026}>2026 - 2027 Season</option>
                    <option value={2027}>2027 Season</option>
                    <option value={2025}>2025 - 2026 Season</option>
                  </select>
                </div>
              </div>

              {/* DESTINATION EXPORT SETTINGS */}
              <div className="p-4 rounded-2xl bg-[#090D16] border border-[#24324F] space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#00B8D4]" />
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">
                    Automatic Publishing & App Creation Targets
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#263238]/40 border border-[#24324F] cursor-pointer hover:border-[#00B8D4]/50 transition">
                    <input
                      type="checkbox"
                      checked={createFeaturedEvents}
                      onChange={(e) => setCreateFeaturedEvents(e.target.checked)}
                      className="mt-0.5 accent-[#00B8D4]"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">Create Real Featured Events on App</span>
                      <span className="text-[10px] text-slate-400 block leading-tight">
                        Publishes into the Events Hub with 4K thumbnails, interactive scorecards, RSVP passes, and maps.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#263238]/40 border border-[#24324F] cursor-pointer hover:border-[#00B8D4]/50 transition">
                    <input
                      type="checkbox"
                      checked={saveToTeamSchedule}
                      onChange={(e) => setSaveToTeamSchedule(e.target.checked)}
                      className="mt-0.5 accent-[#00B8D4]"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">Add to Team Roster Schedule</span>
                      <span className="text-[10px] text-slate-400 block leading-tight">
                        Syncs to the team calendar & player dashboard for coaches and athletes.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#263238]/40 border border-[#24324F] cursor-pointer hover:border-[#00B8D4]/50 transition">
                    <input
                      type="checkbox"
                      checked={syncToMatches}
                      onChange={(e) => setSyncToMatches(e.target.checked)}
                      className="mt-0.5 accent-[#00B8D4]"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">Sync into League & Tournament Matches</span>
                      <span className="text-[10px] text-slate-400 block leading-tight">
                        Powers tournament brackets, scores, and standings.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#263238]/40 border border-[#24324F] cursor-pointer hover:border-[#00B8D4]/50 transition">
                    <input
                      type="checkbox"
                      checked={postToActivityWall}
                      onChange={(e) => setPostToActivityWall(e.target.checked)}
                      className="mt-0.5 accent-[#00B8D4]"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">Broadcast to Social Activity Wall</span>
                      <span className="text-[10px] text-slate-400 block leading-tight">
                        Alerts fans, recruits, and community members in real-time.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

            </div>
          )}

          {/* STEP 2: VERIFICATION & THUMBNAIL EDITING GRID */}
          {currentStep === 2 && (
            <div className="space-y-4">
              
              {/* Header Bar with Search & Filter */}
              <div className="p-3.5 rounded-2xl bg-[#263238]/60 border border-[#24324F] flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setActiveFilter('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono uppercase transition cursor-pointer ${
                        activeFilter === 'all' ? 'bg-[#00B8D4] text-[#090D16]' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      All ({parsedGames.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFilter('home')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono uppercase transition cursor-pointer ${
                        activeFilter === 'home' ? 'bg-emerald-500 text-black' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Home ({parsedGames.filter(g => g.isHome).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFilter('away')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono uppercase transition cursor-pointer ${
                        activeFilter === 'away' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Away ({parsedGames.filter(g => !g.isHome).length})
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search opponent, venue, notes..."
                      className="w-full pl-9 pr-3 py-1.5 bg-[#090D16] border border-[#24324F] rounded-xl text-xs text-white outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddBlankGame}
                    className="px-3 py-1.5 rounded-xl bg-[#263238] hover:bg-[#2e3c43] border border-[#24324F] text-xs font-bold text-[#00B8D4] flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Game</span>
                  </button>
                </div>
              </div>

              {/* GAMES LIST / EDITABLE MATCHUP CARDS */}
              <div className="space-y-3">
                {filteredGames.map((game, idx) => {
                  const actualIdx = parsedGames.indexOf(game);

                  return (
                    <motion.div
                      key={actualIdx}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-2xl bg-[#263238]/40 border border-[#24324F] hover:border-[#00B8D4]/50 transition space-y-3"
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
                        
                        {/* Thumbnail Selector & Visual */}
                        <div className="lg:col-span-2 relative aspect-[16/10] rounded-xl overflow-hidden bg-black group border border-[#24324F]">
                          <img
                            src={game.bannerUrl || SPORTS_THUMBNAIL_PRESETS['Sports'][0]}
                            alt={game.opponent}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                          
                          {/* Change Thumbnail Button */}
                          <button
                            type="button"
                            onClick={() => handleCycleThumbnail(actualIdx)}
                            className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 hover:bg-[#00B8D4] text-[9px] font-mono text-white hover:text-black transition flex items-center gap-1 cursor-pointer"
                            title="Cycle 4K Sport Thumbnail"
                          >
                            <ImageIcon className="w-2.5 h-2.5" />
                            <span>Change</span>
                          </button>

                          {/* Star Featured Badge */}
                          <button
                            type="button"
                            onClick={() => handleToggleFeatured(actualIdx)}
                            className={`absolute top-1 left-1 p-1 rounded-md transition cursor-pointer ${
                              game.isFeatured ? 'bg-amber-500 text-black shadow-md' : 'bg-black/60 text-slate-400 hover:text-white'
                            }`}
                            title={game.isFeatured ? 'Featured on App' : 'Click to feature on App'}
                          >
                            <Star className="w-3 h-3 fill-current" />
                          </button>
                        </div>

                        {/* Matchup Details (Date, Time, Opponent) */}
                        <div className="lg:col-span-6 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="date"
                              value={game.date}
                              onChange={(e) => handleUpdateGameField(actualIdx, 'date', e.target.value)}
                              className="px-2 py-1 bg-[#090D16] border border-[#24324F] rounded-lg text-xs font-mono text-white font-bold"
                            />
                            <input
                              type="text"
                              value={game.time}
                              onChange={(e) => handleUpdateGameField(actualIdx, 'time', e.target.value)}
                              placeholder="07:00 PM"
                              className="w-24 px-2 py-1 bg-[#090D16] border border-[#24324F] rounded-lg text-xs font-mono text-slate-300 font-bold"
                            />
                            
                            {/* Home / Away Switch */}
                            <button
                              type="button"
                              onClick={() => handleToggleHomeAway(actualIdx)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase font-mono transition cursor-pointer ${
                                game.isHome 
                                  ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300' 
                                  : 'bg-amber-500/20 border border-amber-500/50 text-amber-300'
                              }`}
                            >
                              {game.isHome ? '🏠 HOME' : '✈️ AWAY'}
                            </button>

                            {/* Game Type Tag */}
                            <select
                              value={game.gameType || 'Regular Season'}
                              onChange={(e) => handleUpdateGameField(actualIdx, 'gameType', e.target.value)}
                              className="px-2 py-1 bg-[#090D16] border border-[#24324F] rounded-lg text-[10px] font-mono text-slate-300 outline-none"
                            >
                              <option value="Regular Season">Regular Season</option>
                              <option value="Conference">Conference Game</option>
                              <option value="Non-Conference">Non-Conference</option>
                              <option value="Playoff">Playoff Matchup</option>
                              <option value="Tournament">Tournament Game</option>
                              <option value="Scrimmage">Scrimmage</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-400 font-mono">{game.isHome ? 'vs' : '@'}</span>
                            <input
                              type="text"
                              value={game.opponent}
                              onChange={(e) => handleUpdateGameField(actualIdx, 'opponent', e.target.value)}
                              placeholder="Opponent High School"
                              className="flex-1 px-3 py-1.5 bg-[#090D16] border border-[#24324F] focus:border-[#00B8D4] rounded-xl text-xs font-black text-white uppercase"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-[#FF6A00] shrink-0" />
                            <input
                              type="text"
                              value={game.location}
                              onChange={(e) => handleUpdateGameField(actualIdx, 'location', e.target.value)}
                              placeholder="Venue Stadium / Arena"
                              className="flex-1 px-2.5 py-1 bg-[#090D16]/60 border border-[#24324F] rounded-lg text-xs text-slate-300"
                            />
                          </div>
                        </div>

                        {/* Scores & Outcomes / Result */}
                        <div className="lg:col-span-3 space-y-1.5 bg-[#090D16]/60 p-2.5 rounded-xl border border-[#24324F]">
                          {(() => {
                            const isFuture = isFutureMatch(game.date);
                            return (
                              <>
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Match Score & Status</span>
                                  {isFuture ? (
                                    <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-teal-500/30 text-teal-300 text-[9px] font-mono font-bold uppercase tracking-wider">
                                      UPCOMING
                                    </span>
                                  ) : game.result ? (
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono ${
                                      game.result.startsWith('W') ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                                    }`}>
                                      {game.result}
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 text-[9px] font-mono font-bold uppercase tracking-wider">
                                      SCHEDULED
                                    </span>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[9px] font-mono text-slate-400 block">{targetTeamName.slice(0, 10)} Score</label>
                                    <input
                                      type="number"
                                      value={isFuture ? '' : (game.homeScore ?? '')}
                                      disabled={isFuture}
                                      onChange={(e) => handleUpdateGameField(actualIdx, 'homeScore', e.target.value ? Number(e.target.value) : null)}
                                      placeholder={isFuture ? 'Upcoming' : 'Pts'}
                                      className={`w-full px-2 py-1 bg-[#090D16] border rounded-lg text-xs font-mono font-bold ${
                                        isFuture 
                                          ? 'border-zinc-800 text-zinc-500 cursor-not-allowed placeholder:text-zinc-600' 
                                          : 'border-[#24324F] text-[#00F5D4]'
                                      }`}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-mono text-slate-400 block">Opponent Score</label>
                                    <input
                                      type="number"
                                      value={isFuture ? '' : (game.awayScore ?? '')}
                                      disabled={isFuture}
                                      onChange={(e) => handleUpdateGameField(actualIdx, 'awayScore', e.target.value ? Number(e.target.value) : null)}
                                      placeholder={isFuture ? 'Upcoming' : 'Pts'}
                                      className={`w-full px-2 py-1 bg-[#090D16] border rounded-lg text-xs font-mono font-bold ${
                                        isFuture 
                                          ? 'border-zinc-800 text-zinc-500 cursor-not-allowed placeholder:text-zinc-600' 
                                          : 'border-[#24324F] text-slate-200'
                                      }`}
                                    />
                                  </div>
                                </div>
                              </>
                            );
                          })()}

                          <input
                            type="text"
                            value={game.notes || ''}
                            onChange={(e) => handleUpdateGameField(actualIdx, 'notes', e.target.value || null)}
                            placeholder="e.g. Homecoming, Rivalry Game, ESPN+"
                            className="w-full px-2 py-1 bg-[#090D16] border border-[#24324F] rounded-lg text-[10px] text-[#FFC857]"
                          />
                        </div>

                        {/* Action Buttons (Duplicate, Delete) */}
                        <div className="lg:col-span-1 flex lg:flex-col items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDuplicateGame(actualIdx)}
                            className="p-2 rounded-xl bg-[#263238] hover:bg-[#2e3c43] text-slate-400 hover:text-white transition cursor-pointer"
                            title="Duplicate Row"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteGame(actualIdx)}
                            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition cursor-pointer"
                            title="Delete Row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                      </div>
                    </motion.div>
                  );
                })}
              </div>

            </div>
          )}

          {/* STEP 3: SUCCESS CONFIRMATION */}
          {currentStep === 3 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-8 text-center space-y-6 max-w-lg mx-auto"
            >
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">
                  {savedCount} Events & Matchups Published!
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  The schedule has been analyzed, parsed with Gemini AI, and synchronized across Just1Play. Full featured event cards with 4K thumbnails are now live.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#263238]/60 border border-[#24324F] text-left space-y-2 text-xs font-mono">
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Team:</span>
                  <span className="text-white font-bold">{targetTeamName}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Sport:</span>
                  <span className="text-[#00B8D4] font-bold">{selectedSport}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Featured Events Created:</span>
                  <span className="text-emerald-400 font-bold">{createFeaturedEvents ? savedCount : 0} Events</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Activity Wall Broadcast:</span>
                  <span className="text-amber-400 font-bold">Published</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep(1);
                    setParsedGames([]);
                    setScheduleUrl('');
                    setRawText('');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#263238] hover:bg-[#2e3c43] text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer"
                >
                  Import Another Schedule
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00B8D4] to-[#00F5D4] text-[#090D16] font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(0,184,212,0.4)] hover:brightness-110 transition cursor-pointer"
                >
                  View Live in Events Hub
                </button>
              </div>
            </motion.div>
          )}

        </div>

        {/* MODAL FOOTER CONTROLS */}
        {currentStep !== 3 && (
          <div className="sticky bottom-0 z-50 px-6 py-4 border-t border-[#24324F] bg-[#090D16]/95 backdrop-blur-md flex items-center justify-between gap-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
            {currentStep === 1 ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-[#263238] hover:bg-[#2e3c43] text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleAnalyzeWithAI}
                  disabled={isParsing}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#00B8D4] to-[#00F5D4] text-[#090D16] font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(0,184,212,0.4)] hover:brightness-110 active:scale-95 transition disabled:opacity-50 cursor-pointer"
                >
                  {isParsing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{statusMessage || 'Analyzing with Gemini AI...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 stroke-[2.5]" />
                      <span>Extract & Build Schedule Events</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-[#263238] hover:bg-[#2e3c43] text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Source</span>
                </button>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                    {parsedGames.length} Game Fixtures Ready
                  </span>

                  <button
                    type="button"
                    onClick={handleConfirmAndSave}
                    disabled={isSaving || !parsedGames.length}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 text-[#090D16] font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(52,211,153,0.4)] hover:brightness-110 active:scale-95 transition disabled:opacity-50 cursor-pointer"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Publishing to App & Firestore...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Publish {parsedGames.length} Real Events to App</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default UniversalScheduleImporterModal;
