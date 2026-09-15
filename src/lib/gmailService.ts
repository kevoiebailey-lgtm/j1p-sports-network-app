import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { auth as gmailAuth } from './firebase';

export { gmailAuth };

export const googleGmailProvider = new GoogleAuthProvider();
// Add Gmail scopes
googleGmailProvider.addScope('https://mail.google.com/');
googleGmailProvider.addScope('https://www.googleapis.com/auth/gmail.readonly');
googleGmailProvider.addScope('https://www.googleapis.com/auth/gmail.send');
googleGmailProvider.addScope('https://www.googleapis.com/auth/gmail.modify');

let isGmailSigningIn = false;
let cachedGmailAccessToken: string | null = null;

export interface GmailMessageItem {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  bodyText: string;
  bodyHtml?: string;
  isUnread: boolean;
  isStarred: boolean;
  labelIds: string[];
}

export interface GmailUserProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}

export interface GmailLabelItem {
  id: string;
  name: string;
  type: string;
  messagesTotal?: number;
  messagesUnread?: number;
}

/**
 * Initialize Gmail Auth State Listener
 */
export const initGmailAuth = (
  onSuccess?: (user: User, token: string) => void,
  onFailure?: () => void
) => {
  return onAuthStateChanged(gmailAuth, async (user: User | null) => {
    if (user) {
      if (cachedGmailAccessToken) {
        if (onSuccess) onSuccess(user, cachedGmailAccessToken);
      } else if (!isGmailSigningIn) {
        if (onFailure) onFailure();
      }
    } else {
      cachedGmailAccessToken = null;
      if (onFailure) onFailure();
    }
  });
};

/**
 * Sign in with Google to grant Gmail permissions
 */
export const signInWithGoogleGmail = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isGmailSigningIn = true;
    const result = await signInWithPopup(gmailAuth, googleGmailProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve access token from Google Auth.');
    }

    cachedGmailAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedGmailAccessToken };
  } catch (error: any) {
    console.error('Google Gmail Sign-in error:', error);
    throw error;
  } finally {
    isGmailSigningIn = false;
  }
};

/**
 * Retrieve cached Gmail Access Token
 */
export const getGmailAccessToken = (): string | null => {
  return cachedGmailAccessToken;
};

/**
 * Disconnect Gmail session
 */
export const disconnectGoogleGmail = async () => {
  cachedGmailAccessToken = null;
};

/**
 * Fetch Gmail User Profile
 */
export const fetchGmailProfile = async (token: string): Promise<GmailUserProfile> => {
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error(`Gmail API Error (${response.status}): ${response.statusText}`);
  }

  return await response.json();
};

/**
 * Fetch Gmail Labels
 */
export const fetchGmailLabels = async (token: string): Promise<GmailLabelItem[]> => {
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch labels (${response.status})`);
  }

  const data = await response.json();
  return data.labels || [];
};

/**
 * Fetch list of messages
 */
export const fetchGmailMessages = async (
  token: string, 
  queryTerm: string = 'in:inbox',
  maxResults: number = 20
): Promise<GmailMessageItem[]> => {
  const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
  if (queryTerm) url.searchParams.append('q', queryTerm);
  url.searchParams.append('maxResults', maxResults.toString());

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error(`Failed to list messages (${response.status})`);
  }

  const listData = await response.json();
  if (!listData.messages || listData.messages.length === 0) {
    return [];
  }

  // Batch fetch full details for top messages
  const detailPromises = listData.messages.slice(0, maxResults).map((m: { id: string }) => 
    fetchGmailMessageDetails(token, m.id)
  );

  const results = await Promise.allSettled(detailPromises);
  const items: GmailMessageItem[] = [];

  results.forEach(res => {
    if (res.status === 'fulfilled' && res.value) {
      items.push(res.value);
    }
  });

  return items;
};

/**
 * Helper to parse body part content
 */
function parseBodyFromPayload(payload: any): { text: string; html?: string } {
  let text = '';
  let html = '';

  if (payload.body && payload.body.data) {
    const decoded = atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    if (payload.mimeType === 'text/html') {
      html = decoded;
    } else {
      text = decoded;
    }
  }

  if (payload.parts && Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body && part.body.data) {
        text += atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      } else if (part.mimeType === 'text/html' && part.body && part.body.data) {
        html += atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      } else if (part.parts) {
        const nested = parseBodyFromPayload(part);
        if (nested.text) text += nested.text;
        if (nested.html) html += nested.html;
      }
    }
  }

  return { text, html };
}

/**
 * Fetch details for a single Gmail Message
 */
export const fetchGmailMessageDetails = async (
  token: string, 
  messageId: string
): Promise<GmailMessageItem> => {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch message details for ${messageId}`);
  }

  const data = await response.json();
  const headers = data.payload?.headers || [];

  const getHeader = (name: string) => {
    const found = headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
    return found ? found.value : '';
  };

  const subject = getHeader('Subject') || '(No Subject)';
  const from = getHeader('From') || 'Unknown Sender';
  const to = getHeader('To') || '';
  const dateRaw = getHeader('Date') || new Date(parseInt(data.internalDate || '0')).toLocaleString();

  const labelIds: string[] = data.labelIds || [];
  const isUnread = labelIds.includes('UNREAD');
  const isStarred = labelIds.includes('STARRED');

  const parsedBody = parseBodyFromPayload(data.payload || {});

  return {
    id: data.id,
    threadId: data.threadId,
    snippet: data.snippet || '',
    subject,
    from,
    to,
    date: dateRaw,
    bodyText: parsedBody.text || data.snippet || '',
    bodyHtml: parsedBody.html,
    isUnread,
    isStarred,
    labelIds
  };
};

/**
 * Send an email via Gmail API using Base64 raw encoding
 */
export const sendGmailEmail = async (
  token: string,
  to: string,
  subject: string,
  bodyText: string
): Promise<{ id: string; threadId: string }> => {
  const emailLines = [
    `To: ${to}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${subject}`,
    '',
    bodyText
  ];

  const emailRaw = emailLines.join('\r\n');
  
  // Safe Base64URL encoding
  const base64Encoded = btoa(unescape(encodeURIComponent(emailRaw)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      raw: base64Encoded
    })
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson?.error?.message || `Failed to send email (${response.status})`);
  }

  return await response.json();
};

/**
 * Toggle Star label on a message
 */
export const toggleStarGmailMessage = async (
  token: string,
  messageId: string,
  isCurrentlyStarred: boolean
): Promise<void> => {
  const body = isCurrentlyStarred
    ? { removeLabelIds: ['STARRED'] }
    : { addLabelIds: ['STARRED'] };

  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Failed to update star state`);
  }
};

/**
 * Mark message as read/unread
 */
export const toggleReadGmailMessage = async (
  token: string,
  messageId: string,
  markAsRead: boolean
): Promise<void> => {
  const body = markAsRead
    ? { removeLabelIds: ['UNREAD'] }
    : { addLabelIds: ['UNREAD'] };

  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Failed to update unread state`);
  }
};

/**
 * Trash a message (requires mandatory user confirmation in UI before executing)
 */
export const trashGmailMessage = async (
  token: string,
  messageId: string
): Promise<void> => {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error(`Failed to move message to Trash`);
  }
};
