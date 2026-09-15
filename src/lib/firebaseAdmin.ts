/**
 * Firebase Admin SDK Initializer & Firestore Accessor
 * Configured for server-side environments, Cloud Functions, and API routes.
 */

import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getFirestore, FieldValue, Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAuth, Auth } from 'firebase-admin/auth';
import rawConfig from '../../firebase-applet-config.json';

let cachedApp: App | null = null;
let cachedDb: Firestore | null = null;
let cachedAuth: Auth | null = null;

export function getFirebaseAdminApp(): App {
  if (cachedApp) return cachedApp;

  const existingApps = getApps();
  if (existingApps.length > 0) {
    cachedApp = existingApps[0];
    return cachedApp;
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCP_PROJECT ||
    (rawConfig as any)?.projectId ||
    'just1play26';

  const serviceAccountKey =
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (serviceAccountKey) {
    try {
      const parsed = JSON.parse(serviceAccountKey);
      cachedApp = initializeApp({
        credential: cert(parsed),
        projectId,
      });
      console.log('[FirebaseAdmin] Initialized with parsed service account credentials.');
      return cachedApp;
    } catch (err: any) {
      console.warn('[FirebaseAdmin] Could not parse service account JSON:', err?.message);
    }
  }

  // Fallback to Application Default Credentials or Project ID initialization
  try {
    cachedApp = initializeApp({ projectId });
    console.log(`[FirebaseAdmin] Initialized with projectId: ${projectId}`);
  } catch (err: any) {
    console.warn('[FirebaseAdmin] Application initialization notice:', err?.message);
    if (getApps().length > 0) {
      cachedApp = getApps()[0];
    } else {
      cachedApp = getApp();
    }
  }

  return cachedApp;
}

export function getAdminFirestore(): Firestore {
  if (cachedDb) return cachedDb;
  const app = getFirebaseAdminApp();
  const databaseId =
    process.env.FIRESTORE_DATABASE_ID ||
    'ai-studio-just1play-e25f33f1-5677-4045-884c-9d2abf4ca88c';
  try {
    cachedDb = getFirestore(app, databaseId);
  } catch (_) {
    cachedDb = getFirestore(app);
  }
  return cachedDb;
}

export function getAdminStorage() {
  const app = getFirebaseAdminApp();
  const bucketName =
    process.env.FIREBASE_STORAGE_BUCKET ||
    (rawConfig as any)?.storageBucket ||
    'just1play26.firebasestorage.app';
  return getStorage(app).bucket(bucketName);
}

export function getAdminAuth(): Auth {
  if (cachedAuth) return cachedAuth;
  const app = getFirebaseAdminApp();
  cachedAuth = getAuth(app);
  return cachedAuth;
}

export { FieldValue };
