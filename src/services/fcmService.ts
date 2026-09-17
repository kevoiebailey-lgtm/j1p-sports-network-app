/**
 * FCM Push Notification & Payment Confirmation Dispatcher Service
 * Handles instant post-purchase verification alerts, token registration,
 * and dispatching FCM notifications upon completed PayPal transactions.
 */

import { db, getFirebaseMessaging } from '../lib/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { safeSetDoc, isFirestoreQuotaExceeded } from '../lib/firestoreQuotaGuard';
import { getToken } from 'firebase/messaging';

export interface PaymentConfirmationPayload {
  buyerUid: string;
  itemTitle: string;
  orderId?: string;
  galleryId?: string;
  photoId?: string;
  amount?: number;
  unwatermarkedUrl?: string;
}

export class FCMService {
  private static instance: FCMService;

  public static getInstance(): FCMService {
    if (!FCMService.instance) {
      FCMService.instance = new FCMService();
    }
    return FCMService.instance;
  }

  /**
   * Dispatches FCM push notification upon completed PayPal payment capture.
   * Matches exact specification:
   * Title: "Payment Confirmed ⚡"
   * Body: "Your photo package for [Item Title] is unlocked. Tap to view."
   * Payload data: { url: '/profile?tab=locker' }
   */
  public async dispatchPaymentConfirmationFCM(payload: PaymentConfirmationPayload): Promise<{
    success: boolean;
    deliveredCount?: number;
    error?: string;
  }> {
    const { buyerUid, itemTitle, orderId, galleryId, amount } = payload;
    if (!buyerUid || buyerUid === 'guest') {
      return { success: true, deliveredCount: 0 };
    }

    const notificationTitle = "Payment Confirmed ⚡";
    const notificationBody = `Your photo package for ${itemTitle} is unlocked. Tap to view.`;
    const targetUrl = "/profile?tab=locker";

    try {
      // 1. Call server FCM dispatcher
      const response = await fetch('/api/notifications/send-fcm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientUid: buyerUid,
          title: notificationTitle,
          body: notificationBody,
          data: {
            url: targetUrl,
            orderId: orderId || '',
            galleryId: galleryId || '',
            itemTitle,
            amount: String(amount || ''),
            type: 'payment_confirmed',
          }
        }),
      });

      let serverResult: any = null;
      if (response.ok) {
        serverResult = await response.json();
      }

      // 2. Trigger native browser notification if in foreground and permitted
      this.triggerNativeNotification(notificationTitle, notificationBody, targetUrl);

      // 3. Play auditory notification chime
      this.playSuccessChime();

      return {
        success: true,
        deliveredCount: serverResult?.deliveredCount || 1,
      };
    } catch (err: any) {
      console.warn('[FCM Service] Dispatch error:', err);
      // Still show local native notification as fallback
      this.triggerNativeNotification(notificationTitle, notificationBody, targetUrl);
      return {
        success: true,
        deliveredCount: 0,
        error: err?.message,
      };
    }
  }

  /**
   * Dispatches FCM notification to Creator when media asset is purchased
   */
  public async dispatchCreatorSaleFCM(payload: {
    creatorUid: string;
    grossAmount: number;
    creatorPayout: number;
    itemTitle: string;
    buyerName?: string;
  }): Promise<boolean> {
    const { creatorUid, creatorPayout, itemTitle, buyerName = 'A Fan' } = payload;
    if (!creatorUid) return false;

    const title = "New Media Sale! 💰";
    const body = `You earned $${creatorPayout.toFixed(2)} from ${buyerName} for ${itemTitle}.`;
    const targetUrl = "/dashboard/creator/earnings";

    try {
      fetch('/api/notifications/send-fcm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientUid: creatorUid,
          title,
          body,
          data: {
            url: targetUrl,
            type: 'creator_sale',
          }
        }),
      }).catch(() => {});

      this.triggerNativeNotification(title, body, targetUrl);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Dispatches Event Operations notification to Coordinators
   */
  public async dispatchEventOpsAlertFCM(payload: {
    recipientUid?: string;
    title: string;
    body: string;
    eventId?: string;
  }): Promise<boolean> {
    const { recipientUid, title, body, eventId } = payload;
    const targetUrl = eventId ? `/dashboard/coordinator?eventId=${eventId}` : '/dashboard/coordinator';

    try {
      if (recipientUid) {
        fetch('/api/notifications/send-fcm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientUid,
            title,
            body,
            data: { url: targetUrl, type: 'event_ops' }
          }),
        }).catch(() => {});
      }

      this.triggerNativeNotification(title, body, targetUrl);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Registers user's FCM device token with server and Firestore
   */
  public async registerDeviceToken(uid: string, token: string): Promise<boolean> {
    try {
      if (!uid || !token) return false;

      // 1. Send to server memory/token manager
      fetch('/api/notifications/register-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          token,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        }),
      }).catch(() => {});

      // 2. Persist to Firestore /fcm_tokens/{uid}
      if (db && !isFirestoreQuotaExceeded()) {
        await safeSetDoc(doc(db, 'fcm_tokens', uid), {
          token,
          uid,
          updatedAt: serverTimestamp(),
          device: typeof navigator !== 'undefined' ? navigator.platform : 'web',
        }, { merge: true });
      }

      return true;
    } catch (e) {
      console.warn('[FCM Service] Failed to register token:', e);
      return false;
    }
  }

  /**
   * Obtains Web FCM token if supported and registered
   */
  public async requestFCMToken(uid?: string): Promise<string | null> {
    try {
      const messaging = await getFirebaseMessaging();
      if (!messaging) return null;

      let swReg: ServiceWorkerRegistration | undefined;
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        swReg = await navigator.serviceWorker.getRegistration();
        if (!swReg) {
          swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(() => undefined);
        }
      }

      const token = await getToken(messaging, {
        serviceWorkerRegistration: swReg,
      });

      if (token && uid) {
        await this.registerDeviceToken(uid, token);
      }
      return token;
    } catch (e) {
      console.warn('[FCM Service] requestFCMToken note:', e);
      return null;
    }
  }

  /**
   * Native browser notification helper
   */
  private triggerNativeNotification(title: string, body: string, url: string) {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-192x192.png',
          data: { url },
        });
        notif.onclick = () => {
          window.focus();
          if (window.location.pathname !== url) {
            window.location.href = url;
          }
        };
      } catch (_) {}
    }
  }

  /**
   * Elegant Web Audio chime on payment confirmation
   */
  private playSuccessChime() {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      // Joyful two-note confirmation chord (C6 -> G6)
      osc1.frequency.setValueAtTime(1046.50, now);
      osc1.frequency.exponentialRampToValueAtTime(1567.98, now + 0.12);

      osc2.frequency.setValueAtTime(523.25, now);
      osc2.frequency.exponentialRampToValueAtTime(783.99, now + 0.12);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.45);
      osc2.stop(now + 0.45);
    } catch (_) {}
  }
}

export const fcmService = FCMService.getInstance();
