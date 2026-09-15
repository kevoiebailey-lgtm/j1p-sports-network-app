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
import { collection, doc, writeBatch, serverTimestamp, setDoc, increment } from 'firebase/firestore';
import { app, db, auth, ensureAuthUser } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { ParsedGame, ScheduledGameDoc } from '../../types';

// ==========================================
// 1. STRICT FOOTBALL ASSET DICTIONARY (NO TENNIS / NO GYM)
// ==========================================
export const FOOTBALL_ACTION_ASSETS = [
  'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=1200&auto=format&fit=crop&q=80', // Football resting on pristine green grass turf
  'https://images.unsplash.com/photo-1511886929837-354d827aae26?w=1200&auto=format&fit=crop&q=80', // Football helmet under glowing stadium lights
  'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=1200&auto=format&fit=crop&q=80', // Illuminated multi-deck stadium bowl
  'https://images.unsplash.com/photo-1577223625816-7546f13df25d?w=1200&auto=format&fit=crop&q=80', // Massive football championship arena
  'https://images.unsplash.com/photo-1587385789097-0197a7fbd179?w=1200&auto=format&fit=crop&q=80', // Green turf yardline hashmarks with football
  'https://images.unsplash.com/photo-1567521464027-f127ff144326?w=1200&auto=format&fit=crop&q=80', // College football stadium packed on game day
];

export const FOOTBALL_ASSET_DICTIONARY = FOOTBALL_ACTION_ASSETS;

// ==========================================
// 2. ENFORCE CURRENT SEASON (YEAR GUARD: 2026)
// ==========================================
export const normalizeScheduleDate = (rawDate?: string | null, targetYear: number = 2026): string => {
  if (!rawDate) return `${targetYear}-09-01`;
  const trimmed = String(rawDate).trim();

  // Match ISO YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    let y = parseInt(isoMatch[1], 10);
    // If year is older than active season (e.g. 2021), override to 2026
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

  // Match text like "Oct 2", "Saturday, Sep 25", "September 18, 2026"
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

// ==========================================
// 3. KICKOFF TIME DISPLAY ("TBD" GUARD)
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
  // Must match a genuine time pattern like 7:00 PM, 3:30 PM EDT, 19:00
  return /\d{1,2}:\d{2}/.test(t);
};

export const formatKickoffTime = (timeStr?: string | null): { isTbd: boolean; display: string } => {
  if (!isGenuineKickoffTime(timeStr)) {
    return { isTbd: true, display: 'Time TBA / Network TBD' };
  }
  return { isTbd: false, display: timeStr!.trim() };
};

// ==========================================
// 4. VENUE FORMATTING (STRIP ", LOCAL, USA" & RECOGNIZE STADIUMS)
// ==========================================
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

  // Recognized stadium dictionaries
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

// ==========================================
// 5. TEXT SANITIZER & HELPERS
// ==========================================
export function sanitizeSportsText(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';

  let cleaned = raw.trim();

  // Strip redundant parenthetical city/state/duplicate tags
  cleaned = cleaned.replace(/\s*\([^)]*\([^)]*\)[^)]*\)/gi, '');
  cleaned = cleaned.replace(/\s*\([^)]*\)/g, ' ');

  // Strip unclosed opening parentheses or trailing ellipsis from MaxPreps
  cleaned = cleaned.replace(/\s*\([^)]*$/g, '');
  cleaned = cleaned.replace(/\.{2,}/g, '');

  // Collapse spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Remove duplicate consecutive words
  const words = cleaned.split(' ');
  const deduplicatedWords: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const curr = words[i];
    const prev = deduplicatedWords[deduplicatedWords.length - 1];
    if (!prev || curr.toLowerCase() !== prev.toLowerCase()) {
      deduplicatedWords.push(curr);
    }
  }
  cleaned = deduplicatedWords.join(' ');

  // Convert to clean Title Case
  cleaned = cleaned
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((w) => {
      if (w === 'vs' || w === 'vs.' || w === 'at' || w === '&' || w === 'and') return w;
      if (/^[0-9]+(th|st|nd|rd)?$/i.test(w)) return w.toUpperCase();
      if (/^(nj|ny|pa|tx|fl|ca|oh|ga|il|nc|sc|va|md|ct|ma|az|nv)$/i.test(w)) return w.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');

  return cleaned.trim();
}

export function isFutureMatch(dateStr: string): boolean {
  if (!dateStr) return false;
  const todayIso = new Date().toISOString().split('T')[0];
  return dateStr > todayIso;
}

export const SPORTS_THUMBNAIL_PRESETS: Record<string, string[]> = {
  Football: FOOTBALL_ACTION_ASSETS,
  'College Football': FOOTBALL_ACTION_ASSETS,
  'Flag Football': FOOTBALL_ACTION_ASSETS,
  Basketball: [
    'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1519766304817-4f37bda74a29?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1518063319789-7217e6706b04?w=1200&auto=format&fit=crop&q=80',
  ],
  Soccer: [
    'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=1200&auto=format&fit=crop&q=80',
  ],
  Baseball: [
    'https://images.unsplash.com/photo-1508344928928-7165b67de128?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1578873375969-d71e3c847248?w=1200&auto=format&fit=crop&q=80',
  ],
  Softball: [
    'https://images.unsplash.com/photo-1508344928928-7165b67de128?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1578873375969-d71e3c847248?w=1200&auto=format&fit=crop&q=80',
  ],
  Volleyball: [
    'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1592656094267-764a45160876?w=1200&auto=format&fit=crop&q=80',
  ],
  'Track & Field': [
    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200&auto=format&fit=crop&q=80',
  ],
  Sports: [
    'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=1200&auto=format&fit=crop&q=80',
  ],
};

export interface ScheduleImporterProps {
  isOpen: boolean;
  onClose: () => void;
  teamId?: string;
  teamName?: string;
  sport?: string;
  seasonYear?: number;
  onSuccess?: (savedGames: ParsedGame[], teamId: string) => void;
}

export const ScheduleImporter: React.FC<ScheduleImporterProps> = ({
  isOpen,
  onClose,
  teamId = 'team-default-1',
  teamName = 'Just1Play Varsity Team',
  sport = 'Football',
  seasonYear = 2026,
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
  const [selectedYear, setSelectedYear] = useState<number>(seasonYear || 2026);
  const [targetTeamId, setTargetTeamId] = useState<string>(teamId);
  const [targetTeamName, setTargetTeamName] = useState<string>(teamName);

  // Destination Toggles
  const [createFeaturedEvents, setCreateFeaturedEvents] = useState<boolean>(true);
  const [saveToTeamSchedule, setSaveToTeamSchedule] = useState<boolean>(true);

  // Status & Parsed Data
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parsedGames, setParsedGames] = useState<ParsedGame[]>([]);
  const [savedCount, setSavedCount] = useState<number>(0);

  if (!isOpen) return null;

  // AI Extraction Pipeline
  const handleAnalyzeWithAI = async () => {
    setErrorMessage(null);
    setIsParsing(true);
    setStatusMessage('Analyzing schedule and extracting fixtures...');

    try {
      let gamesResult: any[] = [];

      const res = await fetch('/api/schedule/parse-universal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: inputMode === 'url' ? scheduleUrl.trim() : undefined,
          rawText: inputMode === 'text' ? rawText.trim() : undefined,
          seasonYear: selectedYear || 2026,
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
        // Enforce 2026 season guard
        const safeDate = normalizeScheduleDate(item.date, selectedYear || 2026);
        const isFuture = isFutureMatch(safeDate);
        const opp = sanitizeSportsText(item.opponent || `Opponent ${idx + 1}`);
        const loc = formatVenueDisplay(sanitizeSportsText(item.location || (item.isHome ? 'Home Stadium' : 'Away Field')));

        // Purge non-football assets for Football
        const banner = isFootballSport
          ? FOOTBALL_ACTION_ASSETS[idx % FOOTBALL_ACTION_ASSETS.length]
          : (item.bannerUrl || SPORTS_THUMBNAIL_PRESETS[cleanSport]?.[idx % (SPORTS_THUMBNAIL_PRESETS[cleanSport]?.length || 1)] || FOOTBALL_ACTION_ASSETS[0]);

        // Kickoff time with TBD guard
        const timeVal = isGenuineKickoffTime(item.time) ? item.time.trim() : 'Time TBA / Network TBD';

        return {
          ...item,
          date: safeDate,
          time: timeVal,
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
      console.error('Schedule Importer Error:', err);
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
      if (field === 'opponent' || field === 'location') {
        cleanVal = field === 'location' ? formatVenueDisplay(value) : sanitizeSportsText(value);
      }
      if (field === 'date') {
        cleanVal = normalizeScheduleDate(value, selectedYear || 2026);
      }
      updated[index] = { ...updated[index], [field]: cleanVal };
      return updated;
    });
  };

  const handleToggleHomeAway = (index: number) => {
    setParsedGames((prev) => {
      const updated = [...prev];
      const current = updated[index];
      const nextIsHome = !current.isHome;
      updated[index] = {
        ...current,
        isHome: nextIsHome,
        homeOrAway: nextIsHome ? 'Home' : 'Away',
      };
      return updated;
    });
  };

  const handleDeleteGame = (index: number) => {
    setParsedGames((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddBlankGame = () => {
    const todayStr = `${selectedYear || 2026}-09-01`;
    const defaultBanner = FOOTBALL_ACTION_ASSETS[0];

    const newGame: ParsedGame = {
      date: todayStr,
      time: 'Time TBA / Network TBD',
      opponent: 'New Opponent High School',
      isHome: true,
      homeOrAway: 'Home',
      location: 'Centennial Stadium, Wayne, NJ',
      gameType: 'Regular Season',
      notes: null,
      bannerUrl: defaultBanner,
      flyerUrl: defaultBanner,
      isFeatured: false,
      homeScore: null,
      awayScore: null,
      result: null,
      status: 'scheduled',
      sport: selectedSport,
    };
    setParsedGames((prev) => [...prev, newGame]);
  };

  // Batch Save to Firestore
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

          const isFootballSport = /football|flag/i.test(game.sport || selectedSport);
          const bannerImage = isFootballSport
            ? FOOTBALL_ACTION_ASSETS[actualIdx % FOOTBALL_ACTION_ASSETS.length]
            : (game.bannerUrl || FOOTBALL_ACTION_ASSETS[0]);

          const safeDate = normalizeScheduleDate(game.date, selectedYear || 2026);
          const isFuture = isFutureMatch(safeDate);
          const cleanTargetTeam = sanitizeSportsText(targetTeamName);
          const cleanOpponent = sanitizeSportsText(game.opponent);
          const formattedVenue = formatVenueDisplay(game.location || (game.isHome ? 'Home Stadium' : 'Away Field'));
          const cleanSport = sanitizeSportsText(game.sport || selectedSport);
          const homeTeamName = game.isHome ? cleanTargetTeam : cleanOpponent;
          const awayTeamName = game.isHome ? cleanOpponent : cleanTargetTeam;
          const cleanTitle = sanitizeSportsText(game.suggestedTitle || `${homeTeamName} ${game.isHome ? 'vs' : 'at'} ${awayTeamName}`);
          const isCompleted = isFuture ? false : Boolean(game.result || (game.homeScore !== null && game.homeScore !== undefined));

          // Venue City & State Parsing (strip any ", Local, USA")
          let cleanCity = '';
          let cleanState = '';
          if (formattedVenue.includes(',')) {
            const parts = formattedVenue.split(',').map((p) => p.trim());
            if (parts.length >= 3) {
              cleanCity = parts[1];
              cleanState = parts[2];
            } else if (parts.length === 2) {
              cleanCity = parts[1];
            }
          }

          const safeKickoff = isGenuineKickoffTime(game.time) ? game.time.trim() : 'Time TBA / Network TBD';

          // 1. Create Real Featured Event in Firestore `events` collection
          if (createFeaturedEvents) {
            const eventDocRef = doc(db, 'events', gameId);
            const fullEventPayload = {
              id: gameId,
              title: cleanTitle,
              sport: cleanSport,
              category: 'Matchup',
              gameDate: safeDate,
              date: safeDate,
              time: safeKickoff,
              venue: formattedVenue,
              venueName: formattedVenue,
              location: formattedVenue,
              city: cleanCity || '',
              state: cleanState || '',
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
              status: isFuture ? 'upcoming' : isCompleted ? 'completed' : 'upcoming',
              homeTeam: homeTeamName,
              awayTeam: awayTeamName,
              homeScore: isFuture ? null : game.homeScore !== undefined ? game.homeScore : null,
              awayScore: isFuture ? null : game.awayScore !== undefined ? game.awayScore : null,
              result: isFuture ? null : game.result || null,
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
              date: safeDate,
              time: safeKickoff,
              opponent: game.opponent,
              isHome: Boolean(game.isHome),
              homeOrAway: game.isHome ? 'Home' : 'Away',
              location: formattedVenue,
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
              updatedAt: serverTimestamp(),
            };
            batch.set(teamScheduleDocRef, teamGamePayload, { merge: true });
            batch.set(teamGameDocRef, teamGamePayload, { merge: true });
          }
        });

        await batch.commit();
      }

      setSavedCount(totalGames);
      setCurrentStep(3);

      if (onSuccess) {
        onSuccess(parsedGames, targetTeamId);
      }
    } catch (saveErr: any) {
      console.error('Failed to commit fixtures to Firestore:', saveErr);
      setErrorMessage(`Failed to save games to database: ${saveErr.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-[#0B101B] border border-[#24324F] rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#24324F]/60 bg-[#0F172A]/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00B8D4] to-[#00838F] p-0.5 flex items-center justify-center shadow-lg shadow-[#00B8D4]/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-tight uppercase font-mono">
                  Schedule Importer Studio
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00B8D4]/20 text-[#00B8D4] border border-[#00B8D4]/40 font-mono">
                  Active Season 2026
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Universal AI schedule parser with Year 2026 Guard, Kickoff TBD Guard, and Stadium Mapping
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEPPER PROGRESS */}
        <div className="px-6 py-3 bg-[#090D16] border-b border-[#24324F]/40 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-6">
            <div className={`flex items-center gap-2 ${currentStep === 1 ? 'text-[#00B8D4] font-bold' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentStep === 1 ? 'bg-[#00B8D4] text-black font-black' : 'bg-slate-800'}`}>1</span>
              <span>Source URL / Text</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
            <div className={`flex items-center gap-2 ${currentStep === 2 ? 'text-[#00B8D4] font-bold' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentStep === 2 ? 'bg-[#00B8D4] text-black font-black' : 'bg-slate-800'}`}>2</span>
              <span>Review Fixtures ({parsedGames.length})</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
            <div className={`flex items-center gap-2 ${currentStep === 3 ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentStep === 3 ? 'bg-emerald-500 text-black font-black' : 'bg-slate-800'}`}>3</span>
              <span>Imported</span>
            </div>
          </div>
        </div>

        {/* BODY WORKSPACE */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: INPUT */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Sport Category</label>
                  <select
                    value={selectedSport}
                    onChange={(e) => setSelectedSport(e.target.value)}
                    className="w-full px-3 py-2 bg-[#090D16] border border-[#24324F] focus:border-[#00B8D4] rounded-xl text-xs text-white outline-none cursor-pointer font-bold font-mono"
                  >
                    <option value="Football">Football</option>
                    <option value="College Football">College Football</option>
                    <option value="Flag Football">Flag Football</option>
                    <option value="Basketball">Basketball</option>
                    <option value="Soccer">Soccer</option>
                    <option value="Baseball">Baseball</option>
                    <option value="Track & Field">Track & Field</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Active Season Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#090D16] border border-[#24324F] focus:border-[#00B8D4] rounded-xl text-xs text-white outline-none cursor-pointer font-bold font-mono"
                  >
                    <option value={2026}>2026 Season (Active Year Guard)</option>
                    <option value={2027}>2027 Season</option>
                  </select>
                </div>
              </div>

              {/* TABS: URL vs RAW TEXT */}
              <div className="flex border-b border-[#24324F] gap-4">
                <button
                  type="button"
                  onClick={() => setInputMode('url')}
                  className={`pb-2.5 text-xs font-mono font-bold flex items-center gap-2 border-b-2 transition ${
                    inputMode === 'url' ? 'border-[#00B8D4] text-[#00B8D4]' : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  Live Website URL
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('text')}
                  className={`pb-2.5 text-xs font-mono font-bold flex items-center gap-2 border-b-2 transition ${
                    inputMode === 'text' ? 'border-[#00B8D4] text-[#00B8D4]' : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Paste Schedule Text
                </button>
              </div>

              {inputMode === 'url' ? (
                <div className="space-y-2">
                  <label className="text-xs text-slate-300 font-medium">Schedule Webpage URL</label>
                  <div className="relative">
                    <input
                      type="url"
                      placeholder="https://www.maxpreps.com/... or official team website URL"
                      value={scheduleUrl}
                      onChange={(e) => setScheduleUrl(e.target.value)}
                      className="w-full px-4 py-3 bg-[#090D16] border border-[#24324F] rounded-xl text-xs text-white focus:border-[#00B8D4] outline-none font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs text-slate-300 font-medium">Paste Schedule Table or List</label>
                  <textarea
                    rows={8}
                    placeholder="Sep 12 vs Ridgewood 7:00 PM&#10;Sep 19 at Montclair 1:00 PM&#10;Oct 02 vs Passaic County (Time TBD)"
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    className="w-full px-4 py-3 bg-[#090D16] border border-[#24324F] rounded-xl text-xs text-white focus:border-[#00B8D4] outline-none font-mono"
                  />
                </div>
              )}

              <button
                type="button"
                disabled={isParsing || (inputMode === 'url' ? !scheduleUrl.trim() : !rawText.trim())}
                onClick={handleAnalyzeWithAI}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#00B8D4] to-[#00838F] hover:from-[#00E5FF] hover:to-[#0097A7] text-white font-bold font-mono text-xs uppercase tracking-wider transition shadow-lg shadow-[#00B8D4]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isParsing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{statusMessage || 'Extracting Schedule...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Extract & Parse Schedule</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* STEP 2: REVIEW FIXTURES */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white uppercase font-mono">
                    Extracted Fixtures ({parsedGames.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    2026 Year Guard enforced. Kickoff times with 12:00 AM/empty formatted as "Time TBA / Network TBD".
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddBlankGame}
                  className="px-3 py-1.5 rounded-xl bg-[#24324F] hover:bg-[#32456C] text-white text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Game</span>
                </button>
              </div>

              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {parsedGames.map((game, idx) => {
                  const kickoff = formatKickoffTime(game.time);
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-[#0F172A] border border-[#24324F]/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                    >
                      <div className="flex flex-wrap items-center gap-2.5 text-xs">
                        <input
                          type="date"
                          value={game.date}
                          onChange={(e) => handleUpdateGameField(idx, 'date', e.target.value)}
                          className="px-2.5 py-1 bg-[#090D16] border border-[#24324F] rounded-lg text-xs font-mono text-white font-bold"
                        />
                        
                        {kickoff.isTbd ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 font-mono text-[11px] font-bold border border-amber-500/30">
                            Time TBA / Network TBD
                          </span>
                        ) : (
                          <input
                            type="text"
                            value={game.time}
                            onChange={(e) => handleUpdateGameField(idx, 'time', e.target.value)}
                            placeholder="07:00 PM"
                            className="w-24 px-2 py-1 bg-[#090D16] border border-[#24324F] rounded-lg text-xs font-mono text-slate-200 font-bold"
                          />
                        )}

                        <button
                          type="button"
                          onClick={() => handleToggleHomeAway(idx)}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            game.isHome ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                          }`}
                        >
                          {game.isHome ? 'Home' : 'Away'}
                        </button>

                        <span className="text-slate-400 font-bold font-mono">{game.isHome ? 'vs' : '@'}</span>
                        
                        <input
                          type="text"
                          value={game.opponent}
                          onChange={(e) => handleUpdateGameField(idx, 'opponent', e.target.value)}
                          className="w-44 px-2.5 py-1 bg-[#090D16] border border-[#24324F] rounded-lg text-xs font-bold text-white"
                        />

                        <input
                          type="text"
                          value={game.location}
                          onChange={(e) => handleUpdateGameField(idx, 'location', e.target.value)}
                          placeholder="Stadium, City, ST"
                          className="w-48 px-2.5 py-1 bg-[#090D16] border border-[#24324F] rounded-lg text-xs text-slate-300"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteGame(idx)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="sticky bottom-0 z-50 bg-[#090D16]/95 backdrop-blur-md flex items-center justify-between pt-4 pb-2 border-t border-[#24324F]">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 rounded-xl bg-[#1C2638] text-slate-300 text-xs font-mono font-bold"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={isSaving || !parsedGames.length}
                  onClick={handleConfirmAndSave}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving to Firestore...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save All {parsedGames.length} Games</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS */}
          {currentStep === 3 && (
            <div className="text-center py-10 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white uppercase font-mono">
                Successfully Imported {savedCount} Games!
              </h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                All fixtures are registered with the 2026 season year, formatted kickoff times, and clean stadium venues.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-[#00B8D4] text-black font-bold font-mono text-xs uppercase"
              >
                Close Studio
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const UniversalScheduleImporterModal = ScheduleImporter;
export default ScheduleImporter;
