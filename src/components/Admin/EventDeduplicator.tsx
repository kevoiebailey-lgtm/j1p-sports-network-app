import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  Layers, 
  Trash2, 
  GitMerge, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  RefreshCw, 
  Trophy, 
  Calendar, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles, 
  Clock, 
  MapPin, 
  Users, 
  Check, 
  X,
  Filter,
  Eye,
  Info
} from 'lucide-react';

export interface RawEventDoc {
  id: string;
  title?: string;
  eventName?: string;
  name?: string;
  sport?: string;
  category?: string;
  gameDate?: string;
  date?: string;
  startDate?: string;
  time?: string;
  venue?: string;
  venueName?: string;
  location?: string;
  address?: string;
  city?: string;
  state?: string;
  homeTeam?: string;
  awayTeam?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  result?: string;
  status?: string;
  taggedTeams?: string[];
  registeredUserIds?: string[];
  registeredCount?: number;
  capacity?: number;
  teams?: any[];
  flyerUrl?: string;
  bannerUrl?: string;
  coverUrl?: string;
  imageUrl?: string;
  description?: string;
  organizer?: string;
  price?: number | string;
  createdAt?: string;
  [key: string]: any;
}

export interface DuplicateGroup {
  compositeKey: string;
  normalizedDate: string;
  normalizedSport: string;
  sortedTeams: string;
  cleanHome: string;
  cleanAway: string;
  primaryDoc: RawEventDoc;
  secondaryDocs: RawEventDoc[];
  allDocs: RawEventDoc[];
  mergedTaggedTeams: string[];
  scoreDifferenceNote?: string;
}

// 1. Cleaning & Normalization Helpers
export const cleanTeamName = (teamStr?: string): string => {
  if (!teamStr || typeof teamStr !== 'string') return '';
  return teamStr
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(high school|high|hs|prep|academy|varsity|jv)\b/g, '')
    .trim()
    .replace(/\s+/g, ' ');
};

export const extractDate = (event: RawEventDoc): string => {
  const raw = event.gameDate || event.date || event.startDate || '';
  if (typeof raw === 'string') {
    return raw.slice(0, 10);
  }
  if (raw && typeof (raw as any).toDate === 'function') {
    return (raw as any).toDate().toISOString().slice(0, 10);
  }
  return '';
};

export const extractSport = (event: RawEventDoc): string => {
  const s = event.sport || event.category || 'multi-sport';
  return String(s).toLowerCase().trim();
};

export const extractTeams = (event: RawEventDoc): {
  home: string;
  away: string;
  rawHome: string;
  rawAway: string;
} => {
  let rawHome = event.homeTeam || '';
  let rawAway = event.awayTeam || '';

  if (!rawHome && !rawAway) {
    if (Array.isArray(event.taggedTeams) && event.taggedTeams.length >= 2) {
      rawHome = String(event.taggedTeams[0]);
      rawAway = String(event.taggedTeams[1]);
    } else if (Array.isArray(event.teams) && event.teams.length >= 2) {
      rawHome = event.teams[0]?.name || String(event.teams[0]);
      rawAway = event.teams[1]?.name || String(event.teams[1]);
    } else if (event.title || event.name || event.eventName) {
      const title = String(event.title || event.name || event.eventName || '').trim();
      const vsMatch = title.split(/\s+(?:vs\.?|versus|at|@|v\.?)\s+/i);
      if (vsMatch.length >= 2) {
        rawHome = vsMatch[0].trim();
        rawAway = vsMatch[1].trim();
      } else {
        rawHome = title;
      }
    }
  }

  return {
    rawHome,
    rawAway,
    home: cleanTeamName(rawHome),
    away: cleanTeamName(rawAway)
  };
};

export const computeEventCompositeKey = (event: RawEventDoc): {
  compositeKey: string;
  normalizedDate: string;
  normalizedSport: string;
  sortedTeams: string;
  cleanHome: string;
  cleanAway: string;
} => {
  const normalizedDate = extractDate(event);
  const normalizedSport = extractSport(event);
  const { home, away } = extractTeams(event);

  const teamList = [home, away].filter(Boolean).sort();
  // If no opponent team could be identified, fallback to cleaned title so unrelated events don't falsely collide
  const sortedTeams = teamList.length > 0 
    ? teamList.join('_') 
    : cleanTeamName(event.title || event.name || event.id);

  const compositeKey = `${normalizedDate}_${normalizedSport}_${sortedTeams}`;
  return {
    compositeKey,
    normalizedDate,
    normalizedSport,
    sortedTeams,
    cleanHome: home,
    cleanAway: away
  };
};

// Calculate ranking score to determine the best primary document
export const calculateDocumentQualityScore = (doc: RawEventDoc): number => {
  let score = 0;
  // Score data presence is top priority
  if (doc.homeScore !== undefined && doc.homeScore !== null) score += 20;
  if (doc.awayScore !== undefined && doc.awayScore !== null) score += 20;
  if (doc.result && doc.result !== 'TBD' && doc.result !== '') score += 15;

  // Completed status over upcoming if score present
  if (doc.status === 'Completed' || doc.status === 'Final') score += 10;

  // Registered recruits, attendees, teams
  const regCount = (Array.isArray(doc.registeredUserIds) ? doc.registeredUserIds.length : 0) +
                   (Array.isArray(doc.teams) ? doc.teams.length : 0) +
                   (Number(doc.registeredCount) || 0);
  score += regCount * 3;

  // Venue & Location precision
  if (doc.venue && doc.venue !== 'TBD') score += 5;
  if (doc.venueName && doc.venueName !== 'Athletic Facility') score += 5;
  if (doc.location && doc.location !== 'TBD') score += 3;
  if (doc.address && doc.address.trim().length > 5) score += 4;

  // Media
  const media = doc.flyerUrl || doc.bannerUrl || doc.coverUrl;
  if (media && !media.includes('images.unsplash.com')) score += 8;

  // Description / Notes length
  if (doc.description && doc.description.trim().length > 15) score += 3;

  // Tagged teams completeness
  if (Array.isArray(doc.taggedTeams) && doc.taggedTeams.length >= 2) score += 5;

  return score;
};

// Helper to consolidate taggedTeams
export const buildUnifiedTaggedTeams = (docs: RawEventDoc[]): string[] => {
  const set = new Set<string>();
  docs.forEach(d => {
    if (d.homeTeam && typeof d.homeTeam === 'string') set.add(d.homeTeam.trim());
    if (d.awayTeam && typeof d.awayTeam === 'string') set.add(d.awayTeam.trim());
    if (Array.isArray(d.taggedTeams)) {
      d.taggedTeams.forEach(t => {
        if (t && typeof t === 'string' && t.trim()) set.add(t.trim());
      });
    }
    if (Array.isArray(d.teams)) {
      d.teams.forEach(t => {
        const name = typeof t === 'string' ? t : t?.name;
        if (name && typeof name === 'string' && name.trim()) set.add(name.trim());
      });
    }
  });
  return Array.from(set).filter(Boolean);
};

export const mergeEventDocuments = (primary: RawEventDoc, duplicates: RawEventDoc[]): Record<string, any> => {
  const allDocs = [primary, ...duplicates];

  // 1. Tagged Teams: ensure all participating teams from all versions are included
  const unifiedTaggedTeams = buildUnifiedTaggedTeams(allDocs);

  // 2. Registered User IDs: union of unique UIDs
  const allRegUserIds = new Set<string>(Array.isArray(primary.registeredUserIds) ? primary.registeredUserIds : []);
  duplicates.forEach(d => {
    if (Array.isArray(d.registeredUserIds)) {
      d.registeredUserIds.forEach(uid => allRegUserIds.add(uid));
    }
  });

  // 3. Teams array: union
  const teamMap = new Map<string, any>();
  if (Array.isArray(primary.teams)) {
    primary.teams.forEach(t => {
      const key = t.id || t.name || JSON.stringify(t);
      teamMap.set(key, t);
    });
  }
  duplicates.forEach(d => {
    if (Array.isArray(d.teams)) {
      d.teams.forEach(t => {
        const key = t.id || t.name || JSON.stringify(t);
        if (!teamMap.has(key)) {
          teamMap.set(key, t);
        }
      });
    }
  });

  // 4. Score data: adopt score from duplicate if primary lacks it
  let mergedHomeScore = primary.homeScore;
  let mergedAwayScore = primary.awayScore;
  let mergedResult = primary.result;
  let mergedStatus = primary.status || 'Upcoming';

  for (const dup of duplicates) {
    if ((mergedHomeScore === null || mergedHomeScore === undefined) && dup.homeScore !== null && dup.homeScore !== undefined) {
      mergedHomeScore = dup.homeScore;
    }
    if ((mergedAwayScore === null || mergedAwayScore === undefined) && dup.awayScore !== null && dup.awayScore !== undefined) {
      mergedAwayScore = dup.awayScore;
    }
    if (!mergedResult && dup.result) {
      mergedResult = dup.result;
    }
    if (dup.status === 'Completed' || dup.status === 'Final') {
      mergedStatus = 'Completed';
    }
  }

  // 5. Venue / Location: adopt if primary is generic
  const mergedVenue = (primary.venue && primary.venue !== 'TBD') 
    ? primary.venue 
    : duplicates.find(d => d.venue && d.venue !== 'TBD')?.venue || primary.venue || 'Athletic Facility';

  const mergedVenueName = (primary.venueName && primary.venueName !== 'Athletic Facility') 
    ? primary.venueName 
    : duplicates.find(d => d.venueName && d.venueName !== 'Athletic Facility')?.venueName || primary.venueName || mergedVenue;

  const mergedLocation = (primary.location && primary.location !== 'TBD') 
    ? primary.location 
    : duplicates.find(d => d.location && d.location !== 'TBD')?.location || primary.location || mergedVenue;

  const mergedAddress = primary.address || duplicates.find(d => d.address)?.address || '';

  // 6. Media
  const mergedFlyer = primary.flyerUrl || duplicates.find(d => d.flyerUrl)?.flyerUrl;
  const mergedBanner = primary.bannerUrl || duplicates.find(d => d.bannerUrl)?.bannerUrl || mergedFlyer;

  // 7. Description
  const mergedDescription = (primary.description && primary.description.length > 20)
    ? primary.description
    : duplicates.find(d => d.description && d.description.length > 20)?.description || primary.description || '';

  return {
    taggedTeams: unifiedTaggedTeams,
    registeredUserIds: Array.from(allRegUserIds),
    registeredCount: Math.max(allRegUserIds.size, Number(primary.registeredCount) || 0),
    teams: Array.from(teamMap.values()),
    homeScore: mergedHomeScore ?? null,
    awayScore: mergedAwayScore ?? null,
    result: mergedResult || (mergedHomeScore !== null && mergedAwayScore !== null ? `${mergedHomeScore} - ${mergedAwayScore}` : null),
    status: mergedStatus,
    venue: mergedVenue,
    venueName: mergedVenueName,
    location: mergedLocation,
    address: mergedAddress,
    ...(mergedFlyer ? { flyerUrl: mergedFlyer } : {}),
    ...(mergedBanner ? { bannerUrl: mergedBanner } : {}),
    ...(mergedDescription ? { description: mergedDescription } : {}),
    deduplicatedAt: new Date().toISOString(),
    deduplicatedWith: duplicates.map(d => d.id)
  };
};

interface EventDeduplicatorProps {
  onCompleted?: () => void;
  className?: string;
}

export const EventDeduplicator: React.FC<EventDeduplicatorProps> = ({ onCompleted, className = '' }) => {
  const [scanning, setScanning] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);
  const [progressText, setProgressText] = useState<string>('');
  const [scannedEvents, setScannedEvents] = useState<RawEventDoc[]>([]);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [allGroupsCount, setAllGroupsCount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sportFilter, setSportFilter] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedGroupDetails, setSelectedGroupDetails] = useState<DuplicateGroup | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Run the Scan & Group Algorithm
  const runScan = useCallback(async () => {
    setScanning(true);
    try {
      if (!db) {
        throw new Error('Firestore is not initialized.');
      }

      const snap = await getDocs(collection(db, 'events'));
      const rawList: RawEventDoc[] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setScannedEvents(rawList);

      // Group by Composite Key: `${date}_${sport}_${sortedTeams}`
      const groupsMap = new Map<string, RawEventDoc[]>();

      rawList.forEach(event => {
        const { compositeKey } = computeEventCompositeKey(event);
        if (!groupsMap.has(compositeKey)) {
          groupsMap.set(compositeKey, []);
        }
        groupsMap.get(compositeKey)!.push(event);
      });

      setAllGroupsCount(groupsMap.size);

      // Identify duplicate groups (docs.length > 1)
      const detectedDuplicates: DuplicateGroup[] = [];

      groupsMap.forEach((docs, compositeKey) => {
        if (docs.length > 1) {
          // Sort documents by quality score descending to pick the best primary document
          const sorted = [...docs].sort((a, b) => {
            const scoreA = calculateDocumentQualityScore(a);
            const scoreB = calculateDocumentQualityScore(b);
            if (scoreB !== scoreA) return scoreB - scoreA;
            // Tie-breaker: creation date or doc id stability
            return a.id.localeCompare(b.id);
          });

          const primaryDoc = sorted[0];
          const secondaryDocs = sorted.slice(1);
          const { normalizedDate, normalizedSport, sortedTeams, cleanHome, cleanAway } = computeEventCompositeKey(primaryDoc);
          const mergedTaggedTeams = buildUnifiedTaggedTeams(sorted);

          detectedDuplicates.push({
            compositeKey,
            normalizedDate,
            normalizedSport,
            sortedTeams,
            cleanHome,
            cleanAway,
            primaryDoc,
            secondaryDocs,
            allDocs: sorted,
            mergedTaggedTeams
          });
        }
      });

      setDuplicateGroups(detectedDuplicates);
    } catch (err: any) {
      console.error('Scan error:', err);
      showToast(err.message || 'Error scanning /events collection', 'error');
    } finally {
      setScanning(false);
    }
  }, []);

  // Initial scan on mount
  useEffect(() => {
    runScan();
  }, [runScan]);

  // Merge & Purge a Single Duplicate Group
  const handleMergeAndPurgeSingleGroup = async (group: DuplicateGroup) => {
    if (!db) return;
    setProcessing(true);
    setProgressText(`Resolving fixture: ${group.primaryDoc.title || group.compositeKey}...`);

    try {
      const mergedFields = mergeEventDocuments(group.primaryDoc, group.secondaryDocs);

      // 1. Update primary document with merged fields
      await setDoc(doc(db, 'events', group.primaryDoc.id), mergedFields, { merge: true });

      // 2. Delete secondary duplicate documents
      for (const dup of group.secondaryDocs) {
        await deleteDoc(doc(db, 'events', dup.id));
      }

      showToast(`Merged & removed ${group.secondaryDocs.length} redundant duplicate records for "${group.primaryDoc.title || group.sortedTeams}".`);
      // Re-scan to update state
      await runScan();
      if (onCompleted) onCompleted();
    } catch (err: any) {
      console.error('Single merge error:', err);
      showToast(err.message || 'Failed to merge pair.', 'error');
    } finally {
      setProcessing(false);
      setProgressText('');
    }
  };

  // Primary Action: Merge & Purge ALL Duplicate Groups
  const handleMergeAndPurgeAll = async () => {
    if (duplicateGroups.length === 0) {
      showToast('No duplicate fixtures detected.', 'success');
      return;
    }

    const totalExcessDocs = duplicateGroups.reduce((acc, g) => acc + g.secondaryDocs.length, 0);
    const confirmed = window.confirm(
      `Ready to Clean & Merge ${duplicateGroups.length} duplicate fixtures?\n\n` +
      `• Primary documents will be updated with merged scores, attendance, and unified taggedTeams.\n` +
      `• ${totalExcessDocs} redundant duplicate documents will be permanently deleted from Firestore /events.\n\n` +
      `Proceed?`
    );
    if (!confirmed) return;

    setProcessing(true);
    let resolvedGroups = 0;
    let purgedDocsCount = 0;

    try {
      for (let i = 0; i < duplicateGroups.length; i++) {
        const group = duplicateGroups[i];
        setProgressText(`Processing group ${i + 1} of ${duplicateGroups.length}: ${group.primaryDoc.title || group.sortedTeams}...`);

        const mergedFields = mergeEventDocuments(group.primaryDoc, group.secondaryDocs);

        // Update primary doc
        await setDoc(doc(db, 'events', group.primaryDoc.id), mergedFields, { merge: true });

        // Delete secondary duplicates
        for (const dup of group.secondaryDocs) {
          await deleteDoc(doc(db, 'events', dup.id));
          purgedDocsCount++;
        }

        resolvedGroups++;
      }

      showToast(
        `Deduplication Complete: Purged ${purgedDocsCount} redundant records across ${resolvedGroups} fixtures!`,
        'success'
      );
      await runScan();
      if (onCompleted) onCompleted();
    } catch (err: any) {
      console.error('Bulk merge error:', err);
      showToast(err.message || 'Error occurred during bulk deduplication.', 'error');
    } finally {
      setProcessing(false);
      setProgressText('');
    }
  };

  // Filter duplicate groups based on search & sport
  const filteredDuplicateGroups = useMemo(() => {
    return duplicateGroups.filter(g => {
      const matchesSport = sportFilter === 'all' || g.normalizedSport.includes(sportFilter.toLowerCase());
      const query = searchQuery.toLowerCase().trim();
      if (!query) return matchesSport;

      const titleMatch = g.allDocs.some(d => (d.title || d.name || '').toLowerCase().includes(query));
      const teamMatch = g.sortedTeams.toLowerCase().includes(query) ||
                        g.cleanHome.toLowerCase().includes(query) ||
                        g.cleanAway.toLowerCase().includes(query);
      const venueMatch = g.allDocs.some(d => (d.venue || d.location || '').toLowerCase().includes(query));
      const dateMatch = g.normalizedDate.includes(query);

      return matchesSport && (titleMatch || teamMatch || venueMatch || dateMatch);
    });
  }, [duplicateGroups, sportFilter, searchQuery]);

  const totalExcessDocs = duplicateGroups.reduce((acc, g) => acc + g.secondaryDocs.length, 0);

  return (
    <div className={`space-y-6 ${className}`}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-24 right-6 z-50 p-4 rounded-2xl border backdrop-blur-2xl flex items-center gap-3 shadow-[0_0_35px_rgba(0,0,0,0.8)] ${
          toastMessage.type === 'error'
            ? 'bg-rose-950/90 border-rose-500 text-rose-100'
            : 'bg-zinc-950/90 border-[#00B8D4] text-white shadow-[0_0_30px_rgba(0,184,212,0.3)]'
        }`}>
          {toastMessage.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-[#00F5D4] shrink-0" />
          )}
          <span className="text-xs font-bold font-sans tracking-wide uppercase">{toastMessage.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-zinc-950/90 border border-zinc-800 shadow-[0_10px_35px_rgba(0,0,0,0.6)] backdrop-blur-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[#00B8D4] text-xs font-mono font-bold uppercase tracking-widest">
            <Layers className="w-3.5 h-3.5 text-[#00F5D4]" />
            <span>Master Command • Firestore Schedule Hygiene</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black italic uppercase text-white font-sans tracking-tight flex items-center gap-3">
            EVENT <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00B8D4] to-[#00F5D4]">DEDUPLICATOR</span>
          </h2>
          <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
            Scans Firestore <code className="text-cyan-300 font-mono bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">/events</code>, 
            identifies mirror duplicates (e.g. <span className="text-zinc-200 font-semibold">"West Orange vs. Livingston"</span> vs <span className="text-zinc-200 font-semibold">"Livingston at West Orange"</span>), 
            merges score and attendance data, unifies <code className="text-cyan-300 font-mono bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">taggedTeams</code>, and purges redundant documents in one tap.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={runScan}
            disabled={scanning || processing}
            className="px-4 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            title="Re-scan database"
          >
            <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin text-[#00B8D4]' : 'text-zinc-400'}`} />
            <span>{scanning ? 'Scanning...' : 'Re-Scan Database'}</span>
          </button>

          <button
            type="button"
            onClick={handleMergeAndPurgeAll}
            disabled={scanning || processing || duplicateGroups.length === 0}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#00B8D4] to-[#00F5D4] text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(0,184,212,0.4)] hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:brightness-100"
          >
            <GitMerge className="w-4 h-4 stroke-[3]" />
            <span>Merge & Purge Duplicates ({totalExcessDocs})</span>
          </button>
        </div>
      </div>

      {/* Processing Status Banner */}
      {processing && (
        <div className="p-4 rounded-2xl bg-cyan-950/50 border border-cyan-500/50 flex items-center gap-4 animate-pulse">
          <div className="w-5 h-5 border-2 border-[#00F5D4] border-t-transparent rounded-full animate-spin shrink-0" />
          <div className="space-y-0.5">
            <p className="text-xs font-black text-white uppercase tracking-wider">Hygiene Engine Executing...</p>
            <p className="text-xs font-mono text-cyan-300">{progressText}</p>
          </div>
        </div>
      )}

      {/* Summary Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-1 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
          <span className="text-[10px] font-mono font-bold uppercase text-zinc-400 block">Total Scanned Events</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">{scannedEvents.length}</span>
            <span className="text-[11px] text-zinc-500 font-mono">/events docs</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-1 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
          <span className="text-[10px] font-mono font-bold uppercase text-zinc-400 block">Unique Fixture Keys</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">{allGroupsCount}</span>
            <span className="text-[11px] text-zinc-500 font-mono">clusters</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-1 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
          <span className="text-[10px] font-mono font-bold uppercase text-amber-400 block">Duplicate Fixtures</span>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl sm:text-3xl font-black font-mono ${duplicateGroups.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {duplicateGroups.length}
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">groups</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-1 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
          <span className="text-[10px] font-mono font-bold uppercase text-rose-400 block">Redundant Docs to Purge</span>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl sm:text-3xl font-black font-mono ${totalExcessDocs > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {totalExcessDocs}
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">excess docs</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter duplicate fixtures by team, date, title, or venue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#00B8D4]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-zinc-400" />
          <select
            value={sportFilter}
            onChange={(e) => setSportFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-[#00B8D4]"
          >
            <option value="all">All Sports</option>
            <option value="football">Football</option>
            <option value="basketball">Basketball</option>
            <option value="soccer">Soccer</option>
            <option value="lacrosse">Lacrosse</option>
            <option value="cheer">Cheer / Stunt</option>
          </select>
        </div>
      </div>

      {/* DUPLICATES PREVIEW TABLE / LIST */}
      {scanning ? (
        <div className="p-16 text-center space-y-3 bg-zinc-950/60 rounded-3xl border border-zinc-800">
          <div className="w-8 h-8 border-2 border-[#00B8D4] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Scanning /events for duplicate fixtures...</p>
        </div>
      ) : duplicateGroups.length === 0 ? (
        /* Database is 100% Clean State */
        <div className="p-12 sm:p-16 text-center rounded-3xl bg-zinc-950/90 border border-zinc-800 shadow-[0_15px_40px_rgba(0,0,0,0.8)] space-y-4 max-w-xl mx-auto my-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(16,185,129,0.2)]">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-xl font-black text-white uppercase tracking-tight">Database is 100% Clean</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
              No duplicate fixtures or redundant schedule imports detected across <span className="text-white font-mono">{scannedEvents.length}</span> documents in <code className="text-cyan-300 font-mono">/events</code>.
            </p>
          </div>
          <button
            type="button"
            onClick={runScan}
            className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-emerald-500/40 text-emerald-400 font-bold text-xs uppercase tracking-wider inline-flex items-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Verify Cleanliness</span>
          </button>
        </div>
      ) : filteredDuplicateGroups.length === 0 ? (
        /* No items match filter */
        <div className="p-12 text-center rounded-3xl bg-zinc-950/60 border border-zinc-800 space-y-3">
          <Info className="w-8 h-8 text-zinc-500 mx-auto" />
          <h3 className="text-sm font-black text-white uppercase">No Matches for Filter</h3>
          <p className="text-xs text-zinc-400">Try resetting your search query or sport filter.</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSportFilter('all');
            }}
            className="px-4 py-2 rounded-xl bg-zinc-900 text-[#00B8D4] border border-[#00B8D4]/40 font-bold text-xs uppercase tracking-wider"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        /* Duplicate Group Cards */
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400 px-1">
            <span>Showing {filteredDuplicateGroups.length} duplicate fixture {filteredDuplicateGroups.length === 1 ? 'cluster' : 'clusters'}</span>
            <span className="text-rose-400 font-bold">{totalExcessDocs} excess records queued for purge</span>
          </div>

          {filteredDuplicateGroups.map((group, idx) => {
            const hasScores = group.allDocs.some(d => d.homeScore !== null && d.homeScore !== undefined);
            return (
              <div 
                key={group.compositeKey || idx}
                className="p-5 sm:p-6 rounded-3xl bg-zinc-950/90 border border-zinc-800 shadow-[0_10px_35px_rgba(0,0,0,0.7)] space-y-5"
              >
                {/* Group Metadata Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-800">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-cyan-400 text-xs font-mono font-bold uppercase flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {group.normalizedDate || 'No Date'}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-amber-400 text-xs font-mono font-bold uppercase flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5" />
                      {group.normalizedSport || 'Multi-Sport'}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono font-bold uppercase">
                      {group.allDocs.length} Docs ({group.secondaryDocs.length} Duplicate{group.secondaryDocs.length > 1 ? 's' : ''})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleMergeAndPurgeSingleGroup(group)}
                      disabled={processing}
                      className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-cyan-500/40 text-[#00B8D4] hover:text-[#00F5D4] font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <GitMerge className="w-3.5 h-3.5" />
                      <span>Merge & Purge This Pair</span>
                    </button>
                  </div>
                </div>

                {/* Side-by-Side Comparison Container */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  
                  {/* Left Column: Primary Document (KEEP) */}
                  <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-3 relative overflow-hidden">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold uppercase flex items-center gap-1">
                        <Check className="w-3 h-3 text-[#00F5D4]" />
                        KEEP (PRIMARY RECORD)
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">ID: {group.primaryDoc.id}</span>
                    </div>

                    <div>
                      <h4 className="text-sm font-black text-white uppercase">
                        {group.primaryDoc.title || group.primaryDoc.eventName || 'Unnamed Event'}
                      </h4>
                      <p className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5">
                        <span className="text-zinc-200 font-semibold">{group.primaryDoc.homeTeam || group.cleanHome || 'TBD'}</span>
                        <span className="text-zinc-500 text-[10px]">vs</span>
                        <span className="text-zinc-200 font-semibold">{group.primaryDoc.awayTeam || group.cleanAway || 'TBD'}</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1 text-zinc-400">
                      <div className="flex items-center gap-1.5 truncate">
                        <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span>{group.primaryDoc.time || '07:00 PM'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span className="truncate">{group.primaryDoc.venue || group.primaryDoc.location || 'Athletic Facility'}</span>
                      </div>
                    </div>

                    {/* Scores & Detail */}
                    <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between text-xs font-mono">
                      <span className="text-zinc-400">Score Data:</span>
                      {group.primaryDoc.homeScore !== null && group.primaryDoc.homeScore !== undefined ? (
                        <span className="text-emerald-400 font-bold">
                          {group.primaryDoc.homeScore} - {group.primaryDoc.awayScore ?? 0} ({group.primaryDoc.result || group.primaryDoc.status || 'Final'})
                        </span>
                      ) : (
                        <span className="text-zinc-500">No score recorded</span>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Redundant Duplicate Document(s) (PURGE) */}
                  <div className="space-y-3">
                    {group.secondaryDocs.map((dup, dupIdx) => (
                      <div 
                        key={dup.id || dupIdx}
                        className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-3 relative overflow-hidden"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-mono font-bold uppercase flex items-center gap-1">
                            <Trash2 className="w-3 h-3 text-rose-400" />
                            PURGE (REDUNDANT DUPLICATE)
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500">ID: {dup.id}</span>
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-zinc-300 uppercase">
                            {dup.title || dup.eventName || 'Unnamed Event'}
                          </h4>
                          <p className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5">
                            <span className="text-zinc-200 font-semibold">{dup.homeTeam || group.cleanHome || 'TBD'}</span>
                            <span className="text-zinc-500 text-[10px]">vs</span>
                            <span className="text-zinc-200 font-semibold">{dup.awayTeam || group.cleanAway || 'TBD'}</span>
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1 text-zinc-400">
                          <div className="flex items-center gap-1.5 truncate">
                            <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            <span>{dup.time || '07:00 PM'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            <span className="truncate">{dup.venue || dup.location || 'Athletic Facility'}</span>
                          </div>
                        </div>

                        {/* Scores & Detail */}
                        <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between text-xs font-mono">
                          <span className="text-zinc-400">Score Data:</span>
                          {dup.homeScore !== null && dup.homeScore !== undefined ? (
                            <span className="text-amber-400 font-bold">
                              {dup.homeScore} - {dup.awayScore ?? 0} ({dup.result || dup.status || 'Final'})
                            </span>
                          ) : (
                            <span className="text-zinc-500">No score recorded</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                </div>

                {/* Merged Resolution Preview Banner */}
                <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase text-zinc-400 block">
                      Unified Tagged Teams (will render on both team schedules):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {group.mergedTaggedTeams.map((team, tIdx) => (
                        <span key={tIdx} className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-200 font-mono text-[11px] border border-zinc-700">
                          {team}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="text-[10px] font-mono text-emerald-400 block font-bold">
                      ✓ Ready for 1-Tap Merge
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      Preserves scores &amp; deletes {group.secondaryDocs.length} redundant {group.secondaryDocs.length === 1 ? 'record' : 'records'}
                    </span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

export default EventDeduplicator;
