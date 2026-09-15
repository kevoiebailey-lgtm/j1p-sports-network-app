import { getToken, onMessage, Messaging } from 'firebase/messaging';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, getFirebaseMessaging } from './firebase';

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, string>;
}

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

/**
 * Checks current browser notification permission
 */
export function getNotificationPermissionStatus(): NotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionState;
}

/**
 * Requests browser notification permission and registers FCM device token in Firestore
 */
export async function requestFCMNotificationToken(athleteUid: string): Promise<{
  success: boolean;
  token?: string;
  error?: string;
}> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { success: false, error: 'Notifications are not supported in this browser' };
  }

  try {
    // 1. Request browser permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Notification permission was denied by user' };
    }

    // 2. Register Service Worker
    let serviceWorkerRegistration: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      try {
        serviceWorkerRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/'
        });
        await navigator.serviceWorker.ready;
      } catch (swErr) {
        console.warn('Service worker registration notice:', swErr);
      }
    }

    // 3. Get FCM Messaging Instance
    const messaging = await getFirebaseMessaging();
    if (!messaging) {
      return { success: false, error: 'Firebase Cloud Messaging is not available' };
    }

    // 4. Retrieve FCM Token
    const currentToken = await getToken(messaging, {
      serviceWorkerRegistration
    });

    if (!currentToken) {
      return { success: false, error: 'No registration token available' };
    }

    // 5. Store FCM Token in Firestore under users/{athleteUid}/fcmTokens/{tokenHash}
    if (athleteUid) {
      const tokenDocId = currentToken.slice(-20).replace(/[^a-zA-Z0-9]/g, '_');
      const tokenDocRef = doc(db, 'users', athleteUid, 'fcmTokens', tokenDocId);

      await setDoc(tokenDocRef, {
        token: currentToken,
        athleteUid,
        platform: 'web',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        createdAt: serverTimestamp(),
        lastActiveAt: serverTimestamp()
      }, { merge: true });
    }

    return { success: true, token: currentToken };
  } catch (err: any) {
    console.error('Failed to get FCM token:', err);
    return { success: false, error: err?.message || 'Failed to acquire notification token' };
  }
}

/**
 * Subscribes to foreground push notifications
 */
export async function listenToForegroundFCM(
  onNotificationReceived: (payload: NotificationPayload) => void
): Promise<(() => void) | null> {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return null;

  try {
    const unsubscribe = onMessage(messaging, (payload) => {
      const notificationData: NotificationPayload = {
        title: payload.notification?.title || payload.data?.title || '⚡ New Scout Alert!',
        body: payload.notification?.body || payload.data?.body || 'You received a new inquiry from a verified recruiter.',
        icon: payload.notification?.icon || payload.data?.icon || '/icons/icon-192x192.png',
        data: payload.data as Record<string, string>
      };

      onNotificationReceived(notificationData);
    });

    return unsubscribe;
  } catch (err) {
    console.warn('Unable to bind foreground FCM listener:', err);
    return null;
  }
}

/**
 * Removes FCM token from user's record (e.g. on sign out)
 */
export async function removeFCMToken(athleteUid: string, token: string): Promise<void> {
  if (!athleteUid || !token) return;
  try {
    const tokenDocId = token.slice(-20).replace(/[^a-zA-Z0-9]/g, '_');
    const tokenDocRef = doc(db, 'users', athleteUid, 'fcmTokens', tokenDocId);
    await deleteDoc(tokenDocRef);
  } catch (err) {
    console.warn('Error removing FCM token from Firestore:', err);
  }
}
