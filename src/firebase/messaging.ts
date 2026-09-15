import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { db, getFirebaseMessaging } from './config';

// VAPID Key from Firebase Console -> Project Settings -> Cloud Messaging -> Web Push Certificates
const VAPID_KEY = 'YOUR_PUBLIC_VAPID_KEY_HERE';

export const requestNotificationPermission = async (userId: string): Promise<string | null> => {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied by user.');
      return null;
    }

    // Register service worker and get token
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
    });

    if (token) {
      // Save FCM token to athlete/scout user profile in Firestore
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        fcmToken: token,
        updatedAt: new Date().toISOString(),
      });

      console.log('FCM Token generated and saved:', token);
      return token;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
  }

  return null;
};

// Foreground Message Listener (when app is actively open)
export const listenForForegroundMessages = async (onNotification: (payload: any) => void) => {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return;

  return onMessage(messaging, (payload) => {
    console.log('Foreground notification received:', payload);
    onNotification(payload);
  });
};
