/**
 * Service Worker Registration & PWA Update Handler for Just1Play
 */

export interface SWRegistrationCallbacks {
  onUpdateAvailable?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

export function registerServiceWorker(callbacks?: SWRegistrationCallbacks): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.resolve(null);
  }

  // Register in production or standard web browser contexts
  return navigator.serviceWorker
    .register('/sw.js')
    .then((registration) => {
      console.log('[PWA] Service Worker registered successfully:', registration.scope);

      // Check if an update is already waiting
      if (registration.waiting) {
        callbacks?.onUpdateAvailable?.(registration);
      }

      // Listen for new service workers being installed
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New update available!
              console.log('[PWA] New content is available; please refresh.');
              callbacks?.onUpdateAvailable?.(registration);
            } else {
              // Content cached for offline use
              console.log('[PWA] Content is cached for offline use.');
              callbacks?.onSuccess?.(registration);
            }
          }
        };
      };

      return registration;
    })
    .catch((error) => {
      console.error('[PWA] Service Worker registration failed:', error);
      callbacks?.onError?.(error);
      return null;
    });
}

/**
 * Trigger skipWaiting on waiting Service Worker to apply immediate app update
 */
export function reloadServiceWorker(registration: ServiceWorkerRegistration): void {
  if (registration.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  }
}
