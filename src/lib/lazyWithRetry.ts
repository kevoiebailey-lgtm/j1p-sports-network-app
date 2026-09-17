import React, { ComponentType } from 'react';

type ComponentFactory<T extends ComponentType<any>> = () => Promise<{ default: T } | { [key: string]: any } | any>;

/**
 * lazyWithRetry
 * Defuses infinite reload loops by strictly checking 'retry-lazy-refreshed' in sessionStorage.
 * On first failure, refreshes once for stale chunks. If failure persists, displays a clean fallback
 * card with manual reload instead of looping.
 */
export function lazyWithRetry<T extends ComponentType<any> = ComponentType<any>>(
  componentImport: ComponentFactory<T>,
  retries = 4
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    let lastError: any = null;

    // Retry loop with exponential backoff before resorting to hard reload
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const moduleResult = await componentImport();
        // On successful module load, safely clear any prior retry flag
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('retry-lazy-refreshed');
          sessionStorage.removeItem('retry-lazy-timestamp');
        }
        if (moduleResult && typeof moduleResult === 'object' && 'default' in moduleResult) {
          return moduleResult;
        }
        if (moduleResult && typeof moduleResult === 'object') {
          const defaultVal =
            (moduleResult as any).default ||
            (moduleResult as any).AdminMasterCommandTab ||
            Object.values(moduleResult).find((v) => typeof v === 'function');
          if (defaultVal) {
            return { default: defaultVal };
          }
        }
        return { default: moduleResult };
      } catch (error) {
        lastError = error;
        console.warn(`[lazyWithRetry] Attempt ${attempt + 1}/${retries} failed:`, (error as any)?.message || error);
        if (attempt < retries - 1) {
          // Wait before retrying (exponential backoff: 500ms, 900ms, 1600ms...)
          await new Promise((resolve) => setTimeout(resolve, Math.round(500 * Math.pow(1.8, attempt))));
        }
      }
    }

    console.error('Fatal chunk load error:', lastError);
    const lastTimestamp = typeof window !== 'undefined' ? parseInt(sessionStorage.getItem('retry-lazy-timestamp') || '0', 10) : 0;
    const hasRecentlyRefreshed = typeof window !== 'undefined' && Date.now() - lastTimestamp < 10000;

    if (!hasRecentlyRefreshed && typeof window !== 'undefined') {
      sessionStorage.setItem('retry-lazy-timestamp', String(Date.now()));
      sessionStorage.setItem('retry-lazy-refreshed', 'true');
      window.location.reload();
      return { default: (() => null) as unknown as T };
    }

    // Render a clean fallback error card instead of infinitely reloading
    return {
      default: (() =>
        React.createElement(
          'div',
          { className: 'min-h-[260px] m-4 p-8 flex flex-col items-center justify-center text-center bg-[#12151C]/90 rounded-2xl border border-white/10' },
          React.createElement('p', { className: 'font-semibold text-red-400 mb-2' }, 'Failed to load module.'),
          React.createElement('p', { className: 'text-xs text-slate-400 max-w-sm mb-4' }, 'A network interruption or application update prevented this view from loading.'),
          React.createElement(
            'button',
            {
              onClick: () => {
                if (typeof window !== 'undefined') {
                  sessionStorage.removeItem('retry-lazy-refreshed');
                  sessionStorage.removeItem('retry-lazy-timestamp');
                  window.location.reload();
                }
              },
              className: 'px-4 py-2 bg-[#00F0D0]/10 hover:bg-[#00F0D0]/20 text-[#00F0D0] border border-[#00F0D0]/30 rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition-all cursor-pointer'
            },
            'Retry Manual Reload'
          )
        )) as unknown as T
    };
  });
}

/**
 * Preloads a lazy module in idle time so clicking the tab is instantaneous
 */
export function preloadModule(factory: () => Promise<any>): void {
  try {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        factory().catch(() => {});
      });
    } else if (typeof window !== 'undefined') {
      setTimeout(() => {
        factory().catch(() => {});
      }, 500);
    }
  } catch (e) {
    // Silently ignore preload errors
  }
}

