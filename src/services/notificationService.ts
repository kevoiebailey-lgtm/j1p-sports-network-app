import { getToken, onMessage } from 'firebase/messaging';
import { 
  collection, 
  doc, 
  serverTimestamp,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  getDocs
} from 'firebase/firestore';
import { db, getFirebaseMessaging } from '../lib/firebase';
import { AppNotification } from '../types';
import { safeSetDoc, safeAddDoc, isFirestoreQuotaExceeded } from '../lib/firestoreQuotaGuard';

export type NotificationType = 'dm' | 'like' | 'event_update' | 'comment' | 'follow' | 'mention' | 'score_update';

export interface ToastAlert {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  senderName: string;
  senderAvatar?: string;
  linkId?: string;
  createdAt: string;
}

type ToastCallback = (alert: ToastAlert) => void;

class NotificationService {
  private toastListeners: Set<ToastCallback> = new Set();
  private fcmToken: string | null = null;
  private permissionState: NotificationPermission = 'default';
  private activeUnsubscribers: (() => void)[] = [];
  private lastNotifiedTimestamps: Record<string, number> = {};
  private audioContext: AudioContext | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permissionState = Notification.permission;
    }
  }

  // Play subtle, elegant Web Audio notification chime for foreground alert
  public playChime(type: NotificationType = 'dm') {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioContext) {
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const now = this.audioContext.currentTime;
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'sine';

      if (type === 'dm') {
        // Double pitch chime for incoming message (880Hz -> 1174Hz)
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.08);
      } else if (type === 'mention') {
        // High alert fanfare chime for @mention (784Hz -> 1046.5Hz)
        osc.frequency.setValueAtTime(783.99, now);
        osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.12);
      } else {
        osc.frequency.setValueAtTime(659.25, now);
      }

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch {
      // Audio playback non-blocking fallback
    }
  }

  // Subscribe to toast alerts in React components
  public subscribeToToast(callback: ToastCallback): () => void {
    this.toastListeners.add(callback);
    return () => this.toastListeners.delete(callback);
  }

  private triggerToast(alert: ToastAlert) {
    this.playChime(alert.type);
    this.toastListeners.forEach(cb => cb(alert));
  }

  // Check if browser notifications are supported & granted
  public getPermissionStatus(): NotificationPermission {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'denied';
  }

  // Request browser Notification permissions + Register FCM Token
  public async requestNotificationPermission(userUid?: string): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('Browser Notifications are not supported in this environment.');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permissionState = permission;

      if (permission === 'granted') {
        // Register Service Worker & FCM Token
        await this.initFCM(userUid);
        return true;
      }
    } catch (err) {
      console.warn('Error requesting notification permission:', err);
    }
    return false;
  }

  // Initialize FCM and register messaging token in Firestore & backend server
  public async initFCM(userUid?: string): Promise<string | null> {
    try {
      const messaging = await getFirebaseMessaging();
      if (!messaging) return null;

      // Ensure service worker is registered
      if ('serviceWorker' in navigator) {
        const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        
        // Obtain FCM Token
        const token = await getToken(messaging, {
          serviceWorkerRegistration: swRegistration
        });

        if (token) {
          this.fcmToken = token;
          console.log('[FCM] Token acquired:', token);

          // 1. Register with backend server
          if (userUid) {
            fetch('/api/notifications/register-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                uid: userUid,
                token,
                userAgent: navigator.userAgent
              })
            }).catch(() => {});
          }

          // 2. Save token to Firestore if user ID provided and quota permits
          if (userUid && !isFirestoreQuotaExceeded()) {
            await safeSetDoc(doc(db, 'fcm_tokens', userUid), {
              token,
              updatedAt: serverTimestamp(),
              userAgent: navigator.userAgent
            }, { merge: true });
          }

          // Handle foreground messages via FCM
          onMessage(messaging, (payload) => {
            console.log('[FCM] Foreground message received:', payload);
            const notifType = (payload.data?.type as NotificationType) || 'dm';
            const title = payload.notification?.title || payload.data?.title || 'Just1Play Alert';
            const message = payload.notification?.body || payload.data?.body || 'New update received';
            
            this.showNativeNotification(title, message, payload.data?.senderAvatar, payload.data?.tag);
            this.triggerToast({
              id: `fcm-${Date.now()}`,
              type: notifType,
              title,
              message,
              senderName: payload.data?.senderName || 'Just1Play System',
              senderAvatar: payload.data?.senderAvatar,
              linkId: payload.data?.linkId || payload.data?.senderUid,
              createdAt: new Date().toISOString()
            });
          });

          return token;
        }
      }
    } catch (err) {
      console.warn('[FCM] Setup warning (using Firestore real-time fallbacks):', err);
    }
    return null;
  }

  // Display browser native notification
  public showNativeNotification(title: string, body: string, icon?: string, tag?: string) {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: icon || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
          badge: '/icons/icon-192x192.png',
          tag: tag || `notif-${Date.now()}`
        });
      } catch (err) {
        console.warn('Native notification display error:', err);
      }
    }
  }

  // Trigger backend FCM Push Dispatch API
  private async dispatchServerFCM(params: {
    recipientUid?: string;
    recipientUids?: string[];
    title: string;
    body: string;
    data?: Record<string, any>;
  }) {
    try {
      await fetch('/api/notifications/send-fcm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
    } catch (err) {
      console.warn('[FCM] Server push dispatch note:', err);
    }
  }

  // Real-time listener for incoming notifications (Direct Messages, Mentions, Likes)
  public listenForUserAlerts(recipientUid: string) {
    this.activeUnsubscribers.forEach(unsub => unsub());
    this.activeUnsubscribers = [];

    if (!recipientUid) return;

    try {
      const q = query(
        collection(db, 'notifications'),
        where('recipientUid', '==', recipientUid),
        orderBy('createdAt', 'desc'),
        limit(1)
      );

      let isInitialLoad = true;

      const unsub = onSnapshot(q, (snapshot) => {
        if (isInitialLoad) {
          isInitialLoad = false;
          return;
        }

        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data() as AppNotification;
            const notifId = change.doc.id;

            // Avoid duplicate triggers within 5 seconds
            const now = Date.now();
            if (this.lastNotifiedTimestamps[notifId] && now - this.lastNotifiedTimestamps[notifId] < 5000) {
              return;
            }
            this.lastNotifiedTimestamps[notifId] = now;

            // Trigger Browser Native Notification & Toast Alert
            this.showNativeNotification(data.title, data.message, data.senderAvatar, notifId);
            this.triggerToast({
              id: notifId,
              type: (data.type as NotificationType) || 'dm',
              title: data.title,
              message: data.message,
              senderName: data.senderName,
              senderAvatar: data.senderAvatar,
              linkId: data.linkId,
              createdAt: data.createdAt || new Date().toISOString()
            });
          }
        });
      }, (err) => {
        console.warn('Notification real-time snapshot warning:', err);
      });

      this.activeUnsubscribers.push(unsub);
    } catch (err) {
      console.warn('Alert listener initialization failed:', err);
    }
  }

  // Helper method to send a Direct Message alert (FCM Push + Firestore + in-app toast)
  public async sendDirectMessageAlert(params: {
    recipientUid: string;
    senderUid: string;
    senderName: string;
    senderAvatar?: string;
    message: string;
  }) {
    const title = `New Message from ${params.senderName}`;
    const snippet = params.message.length > 70 ? `${params.message.slice(0, 70)}...` : params.message;
    const body = `"${snippet}"`;

    // 1. Dispatch local in-app toast for immediate UX feedback
    this.triggerToast({
      id: `local-dm-${Date.now()}`,
      type: 'dm',
      title,
      message: body,
      senderName: params.senderName,
      senderAvatar: params.senderAvatar,
      linkId: params.senderUid,
      createdAt: new Date().toISOString()
    });

    // 2. Dispatch FCM Push Notification via Server
    this.dispatchServerFCM({
      recipientUid: params.recipientUid,
      title: `💬 ${title}`,
      body: snippet,
      data: {
        type: 'dm',
        senderUid: params.senderUid,
        senderName: params.senderName,
        senderAvatar: params.senderAvatar || '',
        linkId: params.senderUid,
        url: '/messages'
      }
    });

    // 3. Save to Firestore notifications collection
    if (!isFirestoreQuotaExceeded()) {
      await safeAddDoc(collection(db, 'notifications'), {
        recipientUid: params.recipientUid,
        senderUid: params.senderUid,
        senderName: params.senderName,
        senderAvatar: params.senderAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        type: 'dm',
        title,
        message: body,
        linkId: params.senderUid,
        read: false,
        createdAt: new Date().toISOString()
      });
    }
  }

  // Helper method to send a Social Wall @Mention alert
  public async sendMentionAlert(params: {
    recipientUid: string;
    senderUid: string;
    senderName: string;
    senderAvatar?: string;
    postId: string;
    postContentSnippet?: string;
    isComment?: boolean;
  }) {
    const actionDesc = params.isComment ? 'mentioned you in a comment' : 'mentioned you in the Locker Room';
    const title = `⚡ ${params.senderName} ${actionDesc}`;
    const snippet = params.postContentSnippet || 'Tap to view the highlight.';
    const body = snippet.length > 90 ? `"${snippet.slice(0, 90)}..."` : `"${snippet}"`;

    // 1. Trigger local in-app toast
    this.triggerToast({
      id: `local-mention-${Date.now()}`,
      type: 'mention',
      title,
      message: body,
      senderName: params.senderName,
      senderAvatar: params.senderAvatar,
      linkId: params.postId,
      createdAt: new Date().toISOString()
    });

    // 2. Dispatch FCM push notification
    this.dispatchServerFCM({
      recipientUid: params.recipientUid,
      title,
      body: snippet,
      data: {
        type: 'mention',
        senderUid: params.senderUid,
        senderName: params.senderName,
        senderAvatar: params.senderAvatar || '',
        postId: params.postId,
        url: `/locker-room?post=${params.postId}`
      }
    });

    // 3. Save to Firestore
    if (!isFirestoreQuotaExceeded()) {
      await safeAddDoc(collection(db, 'notifications'), {
        recipientUid: params.recipientUid,
        senderUid: params.senderUid,
        senderName: params.senderName,
        senderAvatar: params.senderAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        type: 'mention',
        title,
        message: body,
        linkId: params.postId,
        read: false,
        createdAt: new Date().toISOString()
      });
    }
  }

  // Parse text for @mentions and notify mentioned users
  public async extractMentionsAndNotify(params: {
    text: string;
    senderUid: string;
    senderName: string;
    senderAvatar?: string;
    postId: string;
    isComment?: boolean;
  }) {
    if (!params.text) return;

    // Match all @usernames or @names (e.g. @KevoieBailey, @coach_marcus, @Alex10)
    const mentionRegex = /@([a-zA-Z0-9_.-]+)/g;
    const matches = Array.from(params.text.matchAll(mentionRegex));
    if (matches.length === 0) return;

    const mentionedHandles = Array.from(new Set(matches.map(m => m[1].toLowerCase())));

    try {
      // Find matching users in Firestore users collection
      const usersRef = collection(db, 'users');
      const usersSnap = await getDocs(query(usersRef, limit(100)));

      const notifiedUids = new Set<string>();

      usersSnap.forEach((docSnap) => {
        const uData = docSnap.data();
        const userUid = docSnap.id;
        if (userUid === params.senderUid) return; // Don't notify self

        const displayName = (uData.displayName || '').toLowerCase().replace(/\s+/g, '');
        const emailPrefix = (uData.email || '').split('@')[0].toLowerCase();
        const handle = (uData.handle || uData.username || '').toLowerCase().replace(/^@/, '');

        const isMentioned = mentionedHandles.some(h => 
          h === handle || 
          h === emailPrefix || 
          displayName.includes(h) || 
          h.includes(displayName)
        );

        if (isMentioned && !notifiedUids.has(userUid)) {
          notifiedUids.add(userUid);
          this.sendMentionAlert({
            recipientUid: userUid,
            senderUid: params.senderUid,
            senderName: params.senderName,
            senderAvatar: params.senderAvatar,
            postId: params.postId,
            postContentSnippet: params.text,
            isComment: params.isComment
          });
        }
      });
    } catch (err) {
      console.warn('[FCM-Mention] Error resolving mentions in text:', err);
    }
  }

  // Helper method to send a Post Like alert
  public async sendLikeAlert(params: {
    recipientUid: string;
    senderUid: string;
    senderName: string;
    senderAvatar?: string;
    postId: string;
    postTitle?: string;
  }) {
    if (params.recipientUid === params.senderUid) return;

    const title = 'Post Highlight Liked';
    const body = `${params.senderName} liked your post${params.postTitle ? `: "${params.postTitle}"` : ''}!`;

    // Local in-app toast trigger
    this.triggerToast({
      id: `local-like-${Date.now()}`,
      type: 'like',
      title,
      message: body,
      senderName: params.senderName,
      senderAvatar: params.senderAvatar,
      linkId: params.postId,
      createdAt: new Date().toISOString()
    });

    // Dispatch FCM push
    this.dispatchServerFCM({
      recipientUid: params.recipientUid,
      title: '🔥 New Highlight Reaction',
      body,
      data: {
        type: 'like',
        senderUid: params.senderUid,
        senderName: params.senderName,
        postId: params.postId,
        url: `/locker-room?post=${params.postId}`
      }
    });

    if (!isFirestoreQuotaExceeded()) {
      await safeAddDoc(collection(db, 'notifications'), {
        recipientUid: params.recipientUid,
        senderUid: params.senderUid,
        senderName: params.senderName,
        senderAvatar: params.senderAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
        type: 'like',
        title,
        message: body,
        linkId: params.postId,
        read: false,
        createdAt: new Date().toISOString()
      });
    }
  }

  // Helper method to send a Scheduled Event Update alert
  public async sendEventUpdateAlert(params: {
    recipientUid: string;
    eventTitle: string;
    updateDetails: string;
    senderName?: string;
    eventId?: string;
  }) {
    const title = `Event Update: ${params.eventTitle}`;
    const body = params.updateDetails;

    this.triggerToast({
      id: `local-event-${Date.now()}`,
      type: 'event_update',
      title,
      message: body,
      senderName: params.senderName || 'Tournament Operations',
      senderAvatar: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=100&auto=format&fit=crop&q=80',
      linkId: params.eventId || 'events-hub',
      createdAt: new Date().toISOString()
    });

    if (!isFirestoreQuotaExceeded()) {
      await safeAddDoc(collection(db, 'notifications'), {
        recipientUid: params.recipientUid,
        senderUid: 'system-events',
        senderName: params.senderName || 'Tournament Operations',
        senderAvatar: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=100&auto=format&fit=crop&q=80',
        type: 'event_update',
        title,
        message: body,
        linkId: params.eventId || 'events-hub',
        read: false,
        createdAt: new Date().toISOString()
      });
    }
  }

  // Helper method to send a Real-time Game Score Alert
  public async sendScoreAlert(params: {
    recipientUid?: string;
    recipientUids?: string[];
    gameId: string;
    homeTeam: string;
    homeScore: number;
    awayTeam: string;
    awayScore: number;
    period?: string;
    highlight?: string;
    status: 'LIVE' | 'FINAL' | 'HALFTIME';
  }) {
    const isFinal = params.status === 'FINAL';
    const title = isFinal 
      ? `🏆 FINAL: ${params.homeTeam} ${params.homeScore} - ${params.awayScore} ${params.awayTeam}`
      : `⚡ Score Update: ${params.homeTeam} ${params.homeScore} vs ${params.awayScore} ${params.awayTeam}`;
    
    const message = params.highlight 
      ? `${params.period || params.status}: ${params.highlight}` 
      : `${params.period || params.status} | Match score update on Court/Field`;

    // 1. In-app toast
    this.triggerToast({
      id: `score-${params.gameId}-${Date.now()}`,
      type: 'score_update',
      title,
      message,
      senderName: 'ScoreDesk Live',
      senderAvatar: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=100&auto=format&fit=crop&q=80',
      linkId: params.gameId,
      createdAt: new Date().toISOString()
    });

    // 2. Dispatch FCM Server Push
    this.dispatchServerFCM({
      recipientUid: params.recipientUid,
      recipientUids: params.recipientUids,
      title,
      body: message,
      data: {
        type: 'score_update',
        gameId: params.gameId,
        homeTeam: params.homeTeam,
        homeScore: String(params.homeScore),
        awayTeam: params.awayTeam,
        awayScore: String(params.awayScore),
        status: params.status,
        url: `/events?game=${params.gameId}`
      }
    });

    // 3. Save to Firestore if recipient specified
    if (params.recipientUid && !isFirestoreQuotaExceeded()) {
      await safeAddDoc(collection(db, 'notifications'), {
        recipientUid: params.recipientUid,
        senderUid: 'scoredesk-live',
        senderName: 'ScoreDesk Live',
        senderAvatar: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=100&auto=format&fit=crop&q=80',
        type: 'score_update',
        title,
        message,
        linkId: params.gameId,
        read: false,
        createdAt: new Date().toISOString()
      });
    }
  }
}

export const notificationService = new NotificationService();
