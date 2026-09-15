import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { auth as calendarAuth } from './firebase';

export { calendarAuth };

// Configure Google Calendar scopes
export const googleCalendarProvider = new GoogleAuthProvider();
googleCalendarProvider.addScope('https://www.googleapis.com/auth/calendar');
googleCalendarProvider.addScope('https://www.googleapis.com/auth/calendar.events');
googleCalendarProvider.addScope('https://www.googleapis.com/auth/calendar.readonly');

let isCalendarSigningIn = false;
let cachedCalendarAccessToken: string | null = null;

export interface CalendarItem {
  id: string;
  summary: string;
  description?: string;
  timeZone?: string;
  primary?: boolean;
  backgroundColor?: string;
  foregroundColor?: string;
}

export interface CalendarEventItem {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  htmlLink?: string;
  status?: string;
  creator?: {
    email?: string;
    displayName?: string;
  };
  organizer?: {
    email?: string;
    displayName?: string;
  };
  attendees?: Array<{
    email: string;
    responseStatus?: string;
    displayName?: string;
  }>;
}

/**
 * Initialize Google Calendar Auth State Listener
 */
export const initCalendarAuth = (
  onSuccess?: (user: User, token: string) => void,
  onFailure?: () => void
) => {
  return onAuthStateChanged(calendarAuth, async (user: User | null) => {
    if (user) {
      if (cachedCalendarAccessToken) {
        if (onSuccess) onSuccess(user, cachedCalendarAccessToken);
      } else if (!isCalendarSigningIn) {
        if (onFailure) onFailure();
      }
    } else {
      cachedCalendarAccessToken = null;
      if (onFailure) onFailure();
    }
  });
};

/**
 * Sign in with Google to grant Google Calendar permissions
 */
export const signInWithGoogleCalendar = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isCalendarSigningIn = true;
    const result = await signInWithPopup(calendarAuth, googleCalendarProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve Google Calendar access token.');
    }

    cachedCalendarAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedCalendarAccessToken };
  } catch (error: any) {
    console.error('Google Calendar Sign-in error:', error);
    throw error;
  } finally {
    isCalendarSigningIn = false;
  }
};

/**
 * Get cached Calendar Access Token
 */
export const getCalendarAccessToken = (): string | null => {
  return cachedCalendarAccessToken;
};

/**
 * Disconnect Google Calendar session
 */
export const disconnectGoogleCalendar = async () => {
  cachedCalendarAccessToken = null;
};

/**
 * Fetch List of User's Calendars
 */
export const fetchUserCalendars = async (token: string): Promise<CalendarItem[]> => {
  try {
    const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Google Calendar API error: ${res.status}`);
    }

    const data = await res.json();
    return data.items || [];
  } catch (err) {
    console.error('Failed to fetch user calendars:', err);
    throw err;
  }
};

/**
 * Fetch Events from a specific Google Calendar
 */
export const fetchCalendarEvents = async (
  token: string,
  calendarId: string = 'primary',
  timeMin?: string,
  timeMax?: string
): Promise<CalendarEventItem[]> => {
  try {
    const now = new Date();
    // Default to events from 30 days ago to 90 days in the future
    const defaultMin = timeMin || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const defaultMax = timeMax || new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(defaultMin)}&timeMax=${encodeURIComponent(defaultMax)}&maxResults=250`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Failed to fetch calendar events: ${res.status}`);
    }

    const data = await res.json();
    return data.items || [];
  } catch (err) {
    console.error('Failed to fetch calendar events:', err);
    throw err;
  }
};

/**
 * Create a new Event in Google Calendar
 */
export const createCalendarEvent = async (
  token: string,
  eventData: {
    summary: string;
    description?: string;
    location?: string;
    startISO: string;
    endISO: string;
    timeZone?: string;
  },
  calendarId: string = 'primary'
): Promise<CalendarEventItem> => {
  try {
    const userTimeZone = eventData.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles';

    const payload = {
      summary: eventData.summary,
      description: eventData.description,
      location: eventData.location,
      start: {
        dateTime: eventData.startISO,
        timeZone: userTimeZone
      },
      end: {
        dateTime: eventData.endISO,
        timeZone: userTimeZone
      }
    };

    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || 'Failed to create event in Google Calendar');
    }

    return await res.json();
  } catch (err) {
    console.error('Error creating Google Calendar event:', err);
    throw err;
  }
};

/**
 * Delete an Event from Google Calendar (Requires User Confirmation in UI before calling)
 */
export const deleteCalendarEvent = async (
  token: string,
  eventId: string,
  calendarId: string = 'primary'
): Promise<boolean> => {
  try {
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok && res.status !== 204) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || 'Failed to delete event from Google Calendar');
    }

    return true;
  } catch (err) {
    console.error('Error deleting Google Calendar event:', err);
    throw err;
  }
};

/**
 * Sync a Just1Play game or tournament event directly to Google Calendar
 */
export const syncJust1PlayEventToGoogleCalendar = async (
  token: string,
  sportsEvent: {
    title: string;
    sport?: string;
    date: string; // YYYY-MM-DD or ISO string
    startTime?: string; // e.g., "14:00" or "2:00 PM"
    venue?: string;
    description?: string;
  },
  calendarId: string = 'primary'
): Promise<CalendarEventItem> => {
  let startISO: string;
  let endISO: string;

  try {
    const baseDate = new Date(sportsEvent.date);
    if (isNaN(baseDate.getTime())) {
      const now = new Date();
      startISO = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      endISO = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString();
    } else {
      if (sportsEvent.startTime) {
        const [timePart, modifier] = sportsEvent.startTime.split(' ');
        let [hours, minutes] = timePart.split(':').map(Number);
        if (modifier && modifier.toUpperCase() === 'PM' && hours < 12) hours += 12;
        if (modifier && modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;
        baseDate.setHours(hours || 10, minutes || 0, 0, 0);
      } else {
        baseDate.setHours(10, 0, 0, 0);
      }

      startISO = baseDate.toISOString();
      const endDate = new Date(baseDate.getTime() + 2 * 60 * 60 * 1000); // 2 hour event duration
      endISO = endDate.toISOString();
    }

    const summary = `🏆 Just1Play: ${sportsEvent.title}${sportsEvent.sport ? ` (${sportsEvent.sport})` : ''}`;
    const description = `${sportsEvent.description || 'Official Just1Play Sports Game / Event'}\n\nManaged via Just1Play Media Hub`;

    return await createCalendarEvent(
      token,
      {
        summary,
        description,
        location: sportsEvent.venue || 'Sports Complex / Stadium',
        startISO,
        endISO
      },
      calendarId
    );
  } catch (err) {
    console.error('Error syncing Just1Play event to Google Calendar:', err);
    throw err;
  }
};

/**
 * Generate a 1-Click Google Calendar Web URL (Zero auth required)
 */
export const getGoogleCalendarWebUrl = (sportsEvent: {
  id?: string;
  title: string;
  sport?: string;
  date: string;
  startTime?: string;
  venue?: string;
  description?: string;
}): string => {
  try {
    const baseDate = new Date(sportsEvent.date);
    let startDate = new Date();
    if (!isNaN(baseDate.getTime())) {
      startDate = new Date(baseDate);
    }
    
    if (sportsEvent.startTime) {
      const [timePart, modifier] = sportsEvent.startTime.split(' ');
      let [hours, minutes] = timePart.split(':').map(Number);
      if (modifier && modifier.toUpperCase() === 'PM' && hours < 12) hours += 12;
      if (modifier && modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;
      startDate.setHours(hours || 10, minutes || 0, 0, 0);
    } else {
      startDate.setHours(10, 0, 0, 0);
    }

    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

    const formatGCalDate = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, '');
    const startCompact = formatGCalDate(startDate);
    const endCompact = formatGCalDate(endDate);

    const title = `Just1Play: ${sportsEvent.title}${sportsEvent.sport ? ` [${sportsEvent.sport}]` : ''}`;
    const details = `${sportsEvent.description || 'Official Just1Play Tournament / Showcase Event.'}\n\nLive Scores & Video: https://app.just1play.com/`;
    const location = sportsEvent.venue || 'Just1Play Tournament Complex';

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startCompact}/${endCompact}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
  } catch (e) {
    return 'https://calendar.google.com/';
  }
};

/**
 * Generate and Download a standard .ics iCalendar file (Opens natively on iOS Apple Calendar, Mac, Outlook, Android)
 */
export const downloadIcsCalendarEvent = (sportsEvent: {
  id?: string;
  title: string;
  sport?: string;
  date: string;
  startTime?: string;
  venue?: string;
  description?: string;
}) => {
  try {
    const baseDate = new Date(sportsEvent.date);
    let startDate = new Date();
    if (!isNaN(baseDate.getTime())) {
      startDate = new Date(baseDate);
    }
    
    if (sportsEvent.startTime) {
      const [timePart, modifier] = sportsEvent.startTime.split(' ');
      let [hours, minutes] = timePart.split(':').map(Number);
      if (modifier && modifier.toUpperCase() === 'PM' && hours < 12) hours += 12;
      if (modifier && modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;
      startDate.setHours(hours || 10, minutes || 0, 0, 0);
    } else {
      startDate.setHours(10, 0, 0, 0);
    }

    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
    const now = new Date();

    const formatIcsDate = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, '');

    const eventUid = `${sportsEvent.id || Math.random().toString(36).substring(2, 9)}_${Date.now()}@just1play.com`;
    const summary = `Just1Play: ${sportsEvent.title}${sportsEvent.sport ? ` (${sportsEvent.sport})` : ''}`;
    const description = (sportsEvent.description || 'Just1Play Sports Event & Showcase').replace(/\n/g, '\\n');
    const location = (sportsEvent.venue || 'Tournament Complex').replace(/,/g, '\\,');

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Just1Play Sports Network//Tournament Sync//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${eventUid}`,
      `DTSTAMP:${formatIcsDate(now)}`,
      `DTSTART:${formatIcsDate(startDate)}`,
      `DTEND:${formatIcsDate(endDate)}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}\\n\\nLive Scores & Video: https://app.just1play.com/`,
      `LOCATION:${location}`,
      'URL:https://app.just1play.com/',
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${sportsEvent.title.replace(/[^a-zA-Z0-9]/g, '_')}_Just1Play.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(link.href);
  } catch (err) {
    console.error('Failed to generate .ics calendar file:', err);
  }
};
