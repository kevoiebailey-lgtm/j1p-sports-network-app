/* eslint-disable no-undef */
// Firebase Cloud Messaging Service Worker for Background Push Notifications
// Just1Play Sports Platform (app.just1play.com)

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Initialize Firebase in the service worker with the project config
firebase.initializeApp({
  apiKey: "AIzaSyAt_x3Lzd-i3pL4ThJ1BBD_j4YMPH4K-8U",
  authDomain: "just1play26.firebaseapp.com",
  projectId: "just1play26",
  storageBucket: "just1play26.firebasestorage.app",
  messagingSenderId: "256996216773",
  appId: "1:256996216773:web:33ff47765011e8414385ac"
});

const messaging = firebase.messaging();

// Handle background push messages when app is minimized, in another tab, or closed
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background push notification:', payload);

  const notifType = payload.data?.type || payload.notification?.tag || 'general';
  let defaultTitle = '⚡ Just1Play Sports Alert';
  let defaultBody = 'You have a new update in Just1Play.';

  if (notifType === 'dm') {
    defaultTitle = `💬 New Message from ${payload.data?.senderName || 'Member'}`;
    defaultBody = payload.data?.text || payload.data?.message || 'Tap to open your direct messages.';
  } else if (notifType === 'mention') {
    defaultTitle = `⚡ Mentioned by ${payload.data?.senderName || 'Member'}`;
    defaultBody = payload.data?.text || payload.data?.message || 'You were mentioned on the Social Wall!';
  } else if (notifType === 'comment') {
    defaultTitle = `💬 New Comment from ${payload.data?.senderName || 'Member'}`;
    defaultBody = payload.data?.text || payload.data?.message || 'Someone replied to your highlight reel.';
  } else if (notifType === 'like') {
    defaultTitle = `🔥 New Highlight Reaction`;
    defaultBody = `${payload.data?.senderName || 'A member'} hyped your post!`;
  } else if (notifType === 'score_update') {
    defaultTitle = payload.data?.status === 'FINAL' 
      ? `🏆 Game Final Score Update` 
      : `⚡ Live Game Score Update`;
    defaultBody = `${payload.data?.homeTeam || 'Home'} vs ${payload.data?.awayTeam || 'Away'}`;
  }

  const notificationTitle = payload.notification?.title || payload.data?.title || defaultTitle;
  const notificationBody = payload.notification?.body || payload.data?.body || defaultBody;

  const targetUrl = payload.data?.url || (notifType === 'dm' ? '/messages' : notifType === 'score_update' ? '/events' : '/locker-room');

  const notificationOptions = {
    body: notificationBody,
    icon: payload.notification?.icon || payload.data?.icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    vibrate: [200, 100, 200],
    tag: payload.data?.tag || `just1play-${notifType}-${Date.now()}`,
    renotify: true,
    data: {
      url: targetUrl,
      type: notifType,
      senderUid: payload.data?.senderUid || null,
      senderName: payload.data?.senderName || null,
      postId: payload.data?.postId || null,
      timestamp: Date.now()
    },
    actions: [
      { action: 'open_action', title: notifType === 'dm' ? '💬 Reply Chat' : '👀 View Post' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle push notification click and deep link routing
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/locker-room';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
