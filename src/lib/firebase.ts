import { initializeApp, getApps, getApp, FirebaseApp, FirebaseOptions } from 'firebase/app';
import { 
  getAuth, 
  initializeAuth, 
  GoogleAuthProvider, 
  browserLocalPersistence, 
  indexedDBLocalPersistence, 
  inMemoryPersistence, 
  setPersistence, 
  signInAnonymously, 
  User, 
  Auth 
} from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  memoryLocalCache,
  CACHE_SIZE_UNLIMITED,
  setLogLevel,
  Firestore 
} from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getFunctions, Functions } from 'firebase/functions';
import { getMessaging, isSupported, Messaging } from 'firebase/messaging';
import rawFirebaseConfig from '../../firebase-applet-config.json';

// Helper to safely retrieve environment variables across Vite, Next.js, and Node runtimes
function getEnvVar(key: string): string | undefined {
  try {
    // 1. Vite / modern ESM environment
    if (typeof import.meta !== 'undefined' && (import.meta as any)?.env) {
      const val = (import.meta as any).env[key];
      if (typeof val === 'string' && val.trim()) {
        return val.trim();
      }
    }
  } catch {}

  try {
    // 2. Node.js / Webpack / Next.js process.env environment
    if (typeof process !== 'undefined' && process?.env) {
      const val = process.env[key];
      if (typeof val === 'string' && val.trim()) {
        return val.trim();
      }
    }
  } catch {}

  return undefined;
}

// Build merged, validated Firebase options
export function resolveFirebaseConfig(): FirebaseOptions & { firestoreDatabaseId?: string } {
  const fileConfig = rawFirebaseConfig || {};

  const apiKey = 
    getEnvVar('VITE_FIREBASE_API_KEY') ||
    getEnvVar('NEXT_PUBLIC_FIREBASE_API_KEY') ||
    getEnvVar('FIREBASE_API_KEY') ||
    (fileConfig as any).apiKey ||
    'AIzaSyAt_x3Lzd-i3pL4ThJ1BBD_j4YMPH4K-8U';

  const authDomain = 
    getEnvVar('VITE_FIREBASE_AUTH_DOMAIN') ||
    getEnvVar('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN') ||
    getEnvVar('FIREBASE_AUTH_DOMAIN') ||
    (fileConfig as any).authDomain ||
    'just1play26.firebaseapp.com';

  const projectId = 
    getEnvVar('VITE_FIREBASE_PROJECT_ID') ||
    getEnvVar('NEXT_PUBLIC_FIREBASE_PROJECT_ID') ||
    getEnvVar('FIREBASE_PROJECT_ID') ||
    (fileConfig as any).projectId ||
    'just1play26';

  const storageBucket = 
    getEnvVar('VITE_FIREBASE_STORAGE_BUCKET') ||
    getEnvVar('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET') ||
    getEnvVar('FIREBASE_STORAGE_BUCKET') ||
    (fileConfig as any).storageBucket ||
    'just1play26.firebasestorage.app';

  const messagingSenderId = 
    getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID') ||
    getEnvVar('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID') ||
    getEnvVar('FIREBASE_MESSAGING_SENDER_ID') ||
    (fileConfig as any).messagingSenderId ||
    '256996216773';

  const appId = 
    getEnvVar('VITE_FIREBASE_APP_ID') ||
    getEnvVar('NEXT_PUBLIC_FIREBASE_APP_ID') ||
    getEnvVar('FIREBASE_APP_ID') ||
    (fileConfig as any).appId ||
    '1:256996216773:web:33ff47765011e8414385ac';

  const measurementId = 
    getEnvVar('VITE_FIREBASE_MEASUREMENT_ID') ||
    getEnvVar('NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID') ||
    (fileConfig as any).measurementId ||
    'G-96RJKBTP7V';

  const databaseId = 
    getEnvVar('VITE_FIREBASE_DATABASE_ID') ||
    getEnvVar('NEXT_PUBLIC_FIREBASE_DATABASE_ID') ||
    (fileConfig as any).firestoreDatabaseId ||
    (fileConfig as any).databaseId ||
    '(default)';

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
    measurementId,
    firestoreDatabaseId: databaseId
  };
}

export const activeFirebaseConfig = resolveFirebaseConfig();
export const firebaseConfig = activeFirebaseConfig;

// Initialize Firebase App safely (singleton)
let appInstance: FirebaseApp;
try {
  appInstance = getApps().length > 0 ? getApp() : initializeApp(activeFirebaseConfig);
} catch (initErr) {
  console.warn('Primary Firebase App init notice, recovering with existing app:', initErr);
  appInstance = getApps().length > 0 ? getApp() : initializeApp(activeFirebaseConfig);
}

export const app = appInstance;

// Initialize Firebase Functions
export const functions: Functions = getFunctions(app);

// Initialize Firebase Auth with browser local persistence strategy
let authInstance: Auth;
try {
  // If initializeAuth was already executed, getAuth retrieves it
  authInstance = getAuth(app);
} catch {
  try {
    const persistenceStrategy = typeof window !== 'undefined'
      ? [indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence]
      : inMemoryPersistence;

    authInstance = initializeAuth(app, {
      persistence: persistenceStrategy,
    });
  } catch (initErr) {
    console.warn('initializeAuth notice, falling back to getAuth:', initErr);
    authInstance = getAuth(app);
  }
}

export const auth: Auth = authInstance;

// Persistence initialization promise to ensure storage sync is completed
export const authPersistencePromise: Promise<void> = (async () => {
  if (typeof window !== 'undefined' && auth) {
    try {
      // Primary: indexedDBLocalPersistence (gold standard for mobile standalone PWA sessions)
      await setPersistence(auth, indexedDBLocalPersistence);
    } catch {
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch (err: any) {
        console.warn('Auth persistence configuration notice:', err?.message || err);
      }
    }
  }
})();

/**
 * Checks if the configured Firebase API key matches the standard Firebase format.
 */
export function isFirebaseConfigured(): boolean {
  const key = activeFirebaseConfig.apiKey || '';
  return typeof key === 'string' && key.startsWith('AIza') && key.length >= 25;
}

/**
 * Verifies that the Firebase Auth instance and its local persistence state
 * are fully settled and ready before initiating route redirects or role evaluation.
 * Prevents race conditions during login / token refresh / session restoration.
 */
export async function ensureAuthReady(): Promise<Auth> {
  if (!auth) {
    throw new Error('Firebase Auth instance is not available');
  }
  // 1. Wait for explicit persistence configuration to complete
  try {
    await authPersistencePromise;
  } catch (pErr) {
    console.warn('authPersistencePromise notice:', pErr);
  }

  // 2. Wait for Firebase Auth internal state and storage restore to settle
  if (typeof auth.authStateReady === 'function') {
    try {
      await auth.authStateReady();
    } catch (stateErr) {
      console.warn('auth.authStateReady warning (continuing with initialized auth):', stateErr);
    }
  }
  return auth;
}

/**
 * Ensures an active Firebase Auth user session exists.
 * Awaits ensureAuthReady() first to avoid premature anonymous sign-in race
 * conditions while persisted credentials are still loading from storage.
 * If auth.currentUser remains null, attempts anonymous sign-in so Storage & Firestore
 * requests have an authenticated context.
 */
export async function ensureAuthUser(): Promise<User | null> {
  try {
    await ensureAuthReady();
  } catch (e) {
    console.warn('ensureAuthReady in ensureAuthUser notice:', e);
  }

  if (auth.currentUser) {
    return auth.currentUser;
  }
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (err: any) {
    // Non-blocking warning: in offline / preview environments with demo keys, continue without crashing
    if (err?.code === 'auth/api-key-not-valid' || err?.code === 'auth/invalid-api-key') {
      console.warn('Firebase Auth notice: API key not valid for anonymous authentication. Operating in guest mode.');
    } else {
      console.warn('Anonymous auth sign-in notice:', err?.message || err);
    }
    return auth.currentUser;
  }
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Firebase Storage using the default app storage bucket (just1play26.firebasestorage.app)
export const storage: FirebaseStorage = getStorage(app);

// Set Firestore log level to silent to suppress benign multi-tab and sub-second clock drift notices
try {
  setLogLevel('silent');
} catch {}

// In browser and container environments, suppress benign sub-second NTP clock drift notices from Firestore SDK
if (typeof console !== 'undefined' && console.error) {
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Detected an update time that is in the future') ||
       args[0].includes('Received WebStorage notification for local change'))
    ) {
      return;
    }
    originalConsoleError.apply(console, args);
  };
}

/**
 * Safely purge custom Just1Play cached queries and responses from localStorage without touching
 * active Firebase SDK or Firestore multi-tab lease keys.
 * CRITICAL: We NEVER delete internal keys ('firestore_*', 'firestore:*', 'firebase:*') because
 * persistentMultipleTabManager relies on them for cross-tab lease coordination.
 * Manually deleting active Firestore lease keys triggers the warning:
 * "Received WebStorage notification for local change. Another client might have garbage-collected our state".
 */
export function pruneStaleFirestoreLeaseKeys(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // CRITICAL: Protect Firebase Auth, internal Firestore leases, and active user credentials
      if (
        key.startsWith('firebase:') ||
        key.startsWith('firebase_') ||
        key.startsWith('firestore') ||
        key.startsWith('just1play_user') ||
        key.startsWith('just1play_admin') ||
        key.startsWith('just1play_active_role') ||
        key.startsWith('just1play_profile') ||
        key.startsWith('just1play_bookmarks')
      ) {
        continue; // PRESERVE AUTH & FIRESTORE INTERNAL KEYS
      }

      // Only prune custom application-level temporary cache payloads if needed
      if (
        key.startsWith('just1play_cache_') ||
        key.startsWith('just1play_firestore_cache_') ||
        key.startsWith('just1play_query_cache_')
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => {
      try { localStorage.removeItem(k); } catch {}
    });
  } catch (e) {
    // Silently ignore storage blocks in strict sandboxes or incognito
  }
}

// Initialize Firestore with high-performance persistent multi-tab IndexedDB cache or memory fallback
export const databaseId = activeFirebaseConfig.firestoreDatabaseId || '(default)';

/**
 * Safely initialize Firestore with proactive fallback to in-memory cache on Safari / storage quota exhaustion.
 * Defends against Safari's strict 5MB localStorage ceiling, Private Browsing mode, and multi-tab assertion b815.
 */
export function getFirestoreDb(): Firestore {
  const isCustomDb = databaseId && databaseId !== '(default)';

  // Node.js server environment: use memoryLocalCache directly without attempting IndexedDB / browser storage
  if (typeof window === 'undefined') {
    try {
      const memorySettings = {
        localCache: memoryLocalCache(),
        experimentalAutoDetectLongPolling: true,
      };
      return isCustomDb
        ? initializeFirestore(app, memorySettings, databaseId)
        : initializeFirestore(app, memorySettings);
    } catch {
      return isCustomDb ? getFirestore(app, databaseId) : getFirestore(app);
    }
  }

  try {
    // 1. Detect if localStorage has room or is blocked (e.g. Safari private/quota)
    if (typeof window !== 'undefined' && window.localStorage) {
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
    } else if (typeof window !== 'undefined') {
      throw new Error('localStorage is unavailable in current environment');
    }

    // 2. Proactively purge old application-level query caches if needed
    pruneStaleFirestoreLeaseKeys();

    const persistentSettings = {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
        cacheSizeBytes: CACHE_SIZE_UNLIMITED,
      }),
      experimentalAutoDetectLongPolling: true,
    };

    const instance = isCustomDb
      ? initializeFirestore(app, persistentSettings, databaseId)
      : initializeFirestore(app, persistentSettings);

    console.log(`⚡ [Firestore] Multi-Tab Persistence Enabled (CACHE_SIZE_UNLIMITED) for database: ${databaseId}`);
    return instance;
  } catch (err: any) {
    console.warn('Persistent storage failed or quota exceeded. Falling back to in-memory cache:', err?.message || err);

    // Clear stale application cache keys on quota or assertion failure
    pruneStaleFirestoreLeaseKeys();

    try {
      const memorySettings = {
        localCache: memoryLocalCache(),
        experimentalAutoDetectLongPolling: true,
      };
      const fallbackInstance = isCustomDb
        ? initializeFirestore(app, memorySettings, databaseId)
        : initializeFirestore(app, memorySettings);
      console.log(`🛡️ [Firestore] Resilient memoryLocalCache active for database: ${databaseId}`);
      return fallbackInstance;
    } catch (fallbackError) {
      // If Firestore was already initialized or cannot re-initialize
      return isCustomDb
        ? getFirestore(app, databaseId)
        : getFirestore(app);
    }
  }
}

export const db: Firestore = getFirestoreDb();

/**
 * Strips undefined values recursively from objects and arrays before writing to Firestore.
 * Prevents "Unsupported field value: undefined" runtime errors in addDoc, setDoc, and updateDoc.
 */
export function sanitizeFirestorePayload<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  // Preserve Date, Timestamp, FieldValue objects (like serverTimestamp, increment, arrayUnion)
  if (
    obj instanceof Date || 
    (obj as any)?._methodName || 
    (obj as any)?.toMillis ||
    (obj as any)?.constructor?.name === 'FieldValue' ||
    (obj as any)?.constructor?.name === 'Timestamp'
  ) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeFirestorePayload(item)).filter(item => item !== undefined) as any;
  }
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = sanitizeFirestorePayload(value);
    }
  }
  return cleaned as T;
}

// Initialize Firebase Cloud Messaging safely
let messagingInstance: Messaging | null = null;

export const getFirebaseMessaging = async (): Promise<Messaging | null> => {
  if (typeof window === 'undefined') return null;
  if (messagingInstance) return messagingInstance;

  try {
    const supported = await isSupported();
    if (supported) {
      messagingInstance = getMessaging(app);
      return messagingInstance;
    }
  } catch (err) {
    console.warn('FCM is not supported in this environment:', err);
  }
  return null;
};

export default app;

