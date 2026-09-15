'use client';
import React, { useEffect } from 'react';

/**
 * PWARefreshHandler
 * Intercepts ChunkLoadError and handles Service Worker updates
 * to prevent white-screens and stale bundle mismatches on new deployments.
 */
export function PWARefreshHandler(): React.ReactNode {
  useEffect(() => {
    // Intercept ChunkLoadError (404 on re-deployed hashed JS files)
    const checkAndReload = (message: string) => {
      const chunkFailedMessage = /Loading chunk [\d]+ failed|Failed to fetch dynamically imported module/i;
      if (message && chunkFailedMessage.test(message)) {
        console.warn('Stale PWA bundle detected after deployment. Auto-refreshing cache...');
        // Prevent infinite loop with a timestamp check
        const lastReload = sessionStorage.getItem('j1p_last_chunk_reload');
        const now = Date.now();
        if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
          sessionStorage.setItem('j1p_last_chunk_reload', now.toString());
          window.location.reload();
        }
      }
    };

    const handleError = (event: ErrorEvent) => {
      const chunkFailedMessage = /Loading chunk [\d]+ failed|Failed to fetch dynamically imported module/i;
      if (event?.message && chunkFailedMessage.test(event.message)) {
        console.warn('Stale PWA bundle detected after deployment. Auto-refreshing cache...');
        // Prevent infinite loop with a timestamp check
        const lastReload = sessionStorage.getItem('j1p_last_chunk_reload');
        const now = Date.now();
        if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
          sessionStorage.setItem('j1p_last_chunk_reload', now.toString());
          window.location.reload();
        }
      }
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event?.reason;
      const msg = typeof reason === 'string' ? reason : (reason?.message || '');
      if (msg) {
        checkAndReload(msg);
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  // Listen for Service Worker updates and auto-activate
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        // If an updated service worker is already waiting, trigger SKIP_WAITING
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          window.location.reload();
        }

        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available; auto-reload or skip waiting
                installingWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
            };
          }
        };
      });

      // Handle controller change (when a new worker takes control)
      let refreshing = false;
      const onControllerChange = () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      };
      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
      return () => {
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      };
    }
  }, []);

  return null;
}

export default PWARefreshHandler;
