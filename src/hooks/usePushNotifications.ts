import { useState, useEffect, useCallback } from 'react';
import { notificationService, NotificationType } from '../services/notificationService';
import { useAuth } from '../context/AuthContext';

export interface UsePushNotificationsReturn {
  permission: NotificationPermission;
  isSupported: boolean;
  isSubscribed: boolean;
  loading: boolean;
  error: string | null;
  requestPermission: () => Promise<boolean>;
  sendScoreAlert: (params: {
    gameId: string;
    homeTeam: string;
    homeScore: number;
    awayTeam: string;
    awayScore: number;
    period?: string;
    highlight?: string;
    status: 'LIVE' | 'FINAL' | 'HALFTIME';
    recipientUid?: string;
  }) => Promise<void>;
}

/**
 * Custom React hook for Web Push Notifications & Score Alerts
 * Enables 1-click permission enrollment with Firebase Cloud Messaging (FCM)
 * and seamless dispatching of score update and DM alerts.
 */
export function usePushNotifications(): UsePushNotificationsReturn {
  const { user, profile } = useAuth();
  const currentUid = user?.uid || profile?.uid;

  const [permission, setPermission] = useState<NotificationPermission>(() => {
    return notificationService.getPermissionStatus();
  });
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize status on mount and check device support
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      setIsSupported(false);
      return;
    }

    const currentPermission = Notification.permission;
    setPermission(currentPermission);
    setIsSubscribed(currentPermission === 'granted');

    // If already granted and user is logged in, ensure FCM token is registered
    if (currentPermission === 'granted' && currentUid) {
      notificationService.initFCM(currentUid).then((token) => {
        if (token) {
          setIsSubscribed(true);
        }
      }).catch((err) => {
        console.warn('[usePushNotifications] Auto-init token note:', err);
      });
    }
  }, [currentUid]);

  // Request browser push notification permissions
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Web Push Notifications are not supported on this browser/device.');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const granted = await notificationService.requestNotificationPermission(currentUid);
      const newStatus = notificationService.getPermissionStatus();
      setPermission(newStatus);
      setIsSubscribed(granted);

      if (!granted) {
        setError('Notification permission was dismissed or blocked.');
      }
      return granted;
    } catch (err: any) {
      const msg = err?.message || 'Failed to request notification permission.';
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentUid, isSupported]);

  // Helper method to dispatch score alerts
  const sendScoreAlert = useCallback(async (params: {
    gameId: string;
    homeTeam: string;
    homeScore: number;
    awayTeam: string;
    awayScore: number;
    period?: string;
    highlight?: string;
    status: 'LIVE' | 'FINAL' | 'HALFTIME';
    recipientUid?: string;
  }) => {
    try {
      await notificationService.sendScoreAlert({
        ...params,
        recipientUid: params.recipientUid || currentUid
      });
    } catch (err) {
      console.warn('[usePushNotifications] sendScoreAlert warning:', err);
    }
  }, [currentUid]);

  return {
    permission,
    isSupported,
    isSubscribed,
    loading,
    error,
    requestPermission,
    sendScoreAlert
  };
}
