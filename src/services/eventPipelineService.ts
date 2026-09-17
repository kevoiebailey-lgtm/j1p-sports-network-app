import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  arrayUnion, 
  increment, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, sanitizeFirestorePayload } from '../lib/firebase';

export type StandardSportType = 'flag_football' | 'cheer' | 'soccer' | 'basketball' | 'other';
export type StandardEventType = 'tournament' | 'camp' | 'showcase' | 'single_game';
export type StandardEventStatus = 'draft' | 'published' | 'completed';

export interface StandardLocation {
  venue: string;
  city: string;
  state: string;
}

export interface StandardEvent {
  id: string;
  title: string;
  sportType: StandardSportType;
  eventType: StandardEventType;
  startDate: string;
  endDate: string;
  location: StandardLocation;
  entryFee: number;
  status: StandardEventStatus;
  organizerId: string;
  registeredTeamIds: string[];
  createdAt: any;

  // Legacy & UI compatibility fields
  name?: string;
  sport?: string;
  date?: string;
  time?: string;
  venueName?: string;
  city?: string;
  state?: string;
  price?: number;
  teamFee?: number;
  description?: string;
  bannerUrl?: string;
  flyerUrl?: string;
  coverUrl?: string;
  thumbnailUrl?: string;
  divisions?: string[];
  registeredUserIds?: string[];
  registeredCount?: number;
  maxTeams?: number;
  capacity?: number;
  organizer?: string;
  hostName?: string;
  hostId?: string;
  isFeatured?: boolean;
  [key: string]: any;
}

/**
 * Normalizes any sport string into the standardized 5-sport taxonomy:
 * 'flag_football' | 'cheer' | 'soccer' | 'basketball' | 'other'
 */
export function normalizeSportType(sport?: string): StandardSportType {
  if (!sport) return 'other';
  const s = sport.trim().toLowerCase();

  if (s.includes('flag') || s.includes('7v7') || s.includes('7 on 7') || s === 'football') {
    return 'flag_football';
  }
  if (s.includes('cheer') || s.includes('stunt') || s.includes('dance')) {
    return 'cheer';
  }
  if (s.includes('soccer') || s.includes('futbol')) {
    return 'soccer';
  }
  if (s.includes('basket') || s.includes('hoop')) {
    return 'basketball';
  }
  return 'other';
}

/**
 * Normalizes any event type string into the standardized taxonomy:
 * 'tournament' | 'camp' | 'showcase' | 'single_game'
 */
export function normalizeEventType(type?: string): StandardEventType {
  if (!type) return 'showcase';
  const t = type.trim().toLowerCase();

  if (t.includes('tourn') || t.includes('bracket') || t.includes('elimination') || t.includes('pool play') || t.includes('league')) {
    return 'tournament';
  }
  if (t.includes('camp') || t.includes('clinic') || t.includes('academy') || t.includes('training')) {
    return 'camp';
  }
  if (t.includes('single') || t.includes('game') || t.includes('scrimmage') || t.includes('match')) {
    return 'single_game';
  }
  return 'showcase'; // covers 'showcase', 'combine', 'tryout', 'plaza'
}

/**
 * Builds a standardized event object adhering strictly to the required schema
 * while maintaining backward compatibility with existing views.
 */
export function buildStandardEvent(raw: any, fallbackOrganizerId: string = 'organizer'): StandardEvent {
  const eventId = raw.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const title = (raw.title || raw.name || 'Untitled Event').trim();
  const sportType = normalizeSportType(raw.sportType || raw.sport);
  const eventType = normalizeEventType(raw.eventType || raw.category);

  // Date parsing
  const startDate = raw.startDate || raw.date || new Date().toISOString().split('T')[0];
  const endDate = raw.endDate || raw.startDate || raw.date || startDate;

  // Location structure
  let loc: StandardLocation;
  if (raw.location && typeof raw.location === 'object' && raw.location.venue) {
    loc = {
      venue: raw.location.venue || 'Athletic Facility',
      city: raw.location.city || raw.city || 'Local',
      state: raw.location.state || raw.state || 'USA'
    };
  } else {
    const locString = typeof raw.location === 'string' ? raw.location : '';
    loc = {
      venue: raw.venueName || raw.venue || locString.split(',')[0]?.trim() || 'Athletic Facility',
      city: raw.city || (locString.split(',')[1]?.trim()) || 'Local City',
      state: raw.state || (locString.split(',')[2]?.trim()) || 'USA'
    };
  }

  // Fees
  const entryFee = typeof raw.entryFee === 'number' 
    ? raw.entryFee 
    : (Number(raw.price) || Number(raw.teamFee) || 0);

  // Status: default to 'published' so newly created events immediately show in feeds
  let status: StandardEventStatus = 'published';
  if (raw.status === 'draft') status = 'draft';
  if (raw.status === 'completed') status = 'completed';

  const organizerId = raw.organizerId || raw.hostId || raw.creatorUid || raw.createdBy || fallbackOrganizerId;
  const registeredTeamIds = Array.isArray(raw.registeredTeamIds) 
    ? raw.registeredTeamIds 
    : (Array.isArray(raw.teams) ? raw.teams.map((t: any) => typeof t === 'string' ? t : t.id || t.teamId) : []);

  const banner = raw.bannerUrl || raw.flyerUrl || raw.coverUrl || raw.thumbnailUrl || '';

  return {
    id: eventId,
    title,
    sportType,
    eventType,
    startDate,
    endDate,
    location: loc,
    entryFee,
    status,
    organizerId,
    registeredTeamIds,
    createdAt: raw.createdAt || new Date().toISOString(),

    // Legacy fields for backward compatibility
    name: title,
    sport: raw.sport || (sportType === 'flag_football' ? 'Flag Football' : sportType.charAt(0).toUpperCase() + sportType.slice(1)),
    category: eventType === 'tournament' ? 'Tournament' : eventType === 'camp' ? 'Camp' : eventType === 'single_game' ? 'Single Game' : 'Combine',
    date: startDate,
    time: raw.time || '09:00 AM - 04:00 PM',
    venueName: loc.venue,
    city: loc.city,
    state: loc.state,
    price: entryFee,
    teamFee: entryFee,
    description: raw.description || `${title} - Official Just1Play Event`,
    bannerUrl: banner,
    flyerUrl: banner,
    coverUrl: banner,
    thumbnailUrl: banner,
    divisions: Array.isArray(raw.divisions) && raw.divisions.length > 0 
      ? raw.divisions 
      : ['8U', '10U', '12U', '14U', '17U', 'Varsity'],
    capacity: Number(raw.capacity) || Number(raw.maxTeams) || 32,
    maxTeams: Number(raw.maxTeams) || Number(raw.capacity) || 32,
    registeredCount: registeredTeamIds.length,
    organizer: raw.organizer || raw.hostName || 'Just1Play Events',
    hostName: raw.hostName || raw.organizer || 'Just1Play Host',
    hostId: organizerId,
    isFeatured: Boolean(raw.isFeatured)
  };
}

/**
 * Publishes an event directly to the primary top-level 'events' Firestore collection
 */
export async function publishEventToEventsCollection(
  rawEvent: any,
  fallbackOrganizerId: string = 'organizer'
): Promise<StandardEvent> {
  const standardEvent = buildStandardEvent(rawEvent, fallbackOrganizerId);

  if (db) {
    const eventRef = doc(db, 'events', standardEvent.id);
    const sanitized = sanitizeFirestorePayload({
      ...standardEvent,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    await setDoc(eventRef, sanitized, { merge: true });

    // Also mirror to 'tournaments' collection if it is a tournament
    if (standardEvent.eventType === 'tournament') {
      try {
        const tournRef = doc(db, 'tournaments', standardEvent.id);
        await setDoc(tournRef, sanitizeFirestorePayload({
          id: standardEvent.id,
          name: standardEvent.title,
          sport: standardEvent.sport,
          sportType: standardEvent.sportType,
          startDate: standardEvent.startDate,
          endDate: standardEvent.endDate,
          venueName: standardEvent.location.venue,
          city: standardEvent.location.city,
          state: standardEvent.location.state,
          format: 'Single Elimination',
          status: 'Upcoming',
          divisions: standardEvent.divisions,
          entryFee: standardEvent.entryFee,
          teamFee: standardEvent.entryFee,
          bannerUrl: standardEvent.bannerUrl,
          flyerUrl: standardEvent.flyerUrl,
          participatingTeams: standardEvent.registeredTeamIds,
          updatedAt: serverTimestamp()
        }), { merge: true });
      } catch (mirrorErr) {
        console.warn('[eventPipelineService] Tournaments mirror notice:', mirrorErr);
      }
    }
  }

  return standardEvent;
}

/**
 * Registers a team into an open tournament:
 * 1. Creates/Updates record in 'event_registrations' collection
 * 2. Appends teamId to 'registeredTeamIds' on the event document
 */
export async function registerTeamInTournament(params: {
  eventId: string;
  eventTitle: string;
  teamId: string;
  teamName: string;
  coachUserId?: string;
  headCoachName?: string;
  headCoachEmail?: string;
  headCoachPhone?: string;
  division?: string;
  divisionName?: string;
  entryFee?: number;
  paymentStatus?: 'pending' | 'paid';
  status?: 'pending' | 'paid';
  rosterCount?: number;
  rosterSize?: number;
}): Promise<string> {
  const registrationId = `reg_${params.eventId}_${params.teamId}`;
  const paymentStatus = params.paymentStatus || params.status || (params.entryFee && params.entryFee > 0 ? 'pending' : 'paid');
  const division = params.division || params.divisionName || 'Varsity';
  const rosterCount = params.rosterCount || params.rosterSize || 12;
  const coachUserId = params.coachUserId || 'coach';

  if (db) {
    // 1. Record in 'event_registrations'
    const regRef = doc(db, 'event_registrations', registrationId);
    await setDoc(regRef, sanitizeFirestorePayload({
      id: registrationId,
      eventId: params.eventId,
      eventTitle: params.eventTitle,
      teamId: params.teamId,
      teamName: params.teamName,
      coachUserId,
      headCoachName: params.headCoachName || 'Head Coach',
      headCoachEmail: params.headCoachEmail || '',
      headCoachPhone: params.headCoachPhone || '',
      division,
      status: paymentStatus,
      paymentStatus: paymentStatus,
      entryFee: params.entryFee || 0,
      rosterCount,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }), { merge: true });

    // 2. Append teamId to event document's registeredTeamIds
    try {
      const eventRef = doc(db, 'events', params.eventId);
      await updateDoc(eventRef, {
        registeredTeamIds: arrayUnion(params.teamId),
        registeredCount: increment(1),
        updatedAt: serverTimestamp()
      });
    } catch (evtErr) {
      console.warn('[eventPipelineService] Failed to append teamId to event:', evtErr);
    }
  }

  return registrationId;
}

/**
 * PayPal Fulfillment Pipeline:
 * Called onApprove / capture:
 * 1. Records transaction in 'payments' collection
 * 2. Updates corresponding 'event_registrations' document from 'pending' to 'paid'
 * 3. Confirms team spot in the event registeredTeamIds list
 */
export async function fulfillPayPalTournamentPayment(params: {
  orderId: string;
  captureId?: string;
  payerId: string;
  amount: number;
  eventId: string;
  eventTitle?: string;
  teamId: string;
  teamName?: string;
  customerEmail?: string;
}): Promise<void> {
  if (!db) return;

  const paymentId = params.captureId || params.orderId;
  const paymentRef = doc(db, 'payments', paymentId);

  // 1. Record in 'payments'
  await setDoc(paymentRef, sanitizeFirestorePayload({
    paymentId,
    orderId: params.orderId,
    captureId: params.captureId || null,
    payerId: params.payerId,
    amount: params.amount,
    currency: 'USD',
    status: 'completed',
    type: 'tournament_registration',
    eventId: params.eventId,
    eventTitle: params.eventTitle || 'Tournament Registration',
    teamId: params.teamId,
    teamName: params.teamName || 'Team',
    customerEmail: params.customerEmail || '',
    paymentProcessor: 'paypal',
    timestamp: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }), { merge: true });

  // 2. Update 'event_registrations'
  const regId = `reg_${params.eventId}_${params.teamId}`;
  const regRef = doc(db, 'event_registrations', regId);
  await setDoc(regRef, sanitizeFirestorePayload({
    id: regId,
    eventId: params.eventId,
    teamId: params.teamId,
    status: 'paid',
    paymentStatus: 'paid',
    paidAmount: params.amount,
    paypalOrderId: params.orderId,
    paypalCaptureId: params.captureId || null,
    confirmedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }), { merge: true });

  // 3. Confirm spot in event
  try {
    const eventRef = doc(db, 'events', params.eventId);
    await setDoc(eventRef, {
      registeredTeamIds: arrayUnion(params.teamId),
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn('[eventPipelineService] Event registration confirmation notice:', err);
  }
}
