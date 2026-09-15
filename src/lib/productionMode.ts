/**
 * Production Data Mode Settings
 * 
 * Controls whether the application displays:
 * 1. Clean Slate (100% Real Live Firestore Data only - No fake/demo fallback users, posts, or events)
 * 2. Demo Seed Mode (Populates initial mock data for offline/demo evaluation)
 */

const STORAGE_KEY = 'just1play_clean_slate_mode';

/**
 * Checks if Clean Slate (Production Live Data) mode is active.
 * Defaults to TRUE for 100% real live production data.
 */
export function isCleanSlateMode(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) {
    // Default to true for Clean Slate Production Mode
    return true;
  }
  return stored === 'true';
}

/**
 * Sets Clean Slate mode state.
 */
export function setCleanSlateMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
  // Dispatch custom window event so UI components can re-render reactively
  window.dispatchEvent(new Event('clean_slate_mode_changed'));
}

/**
 * Helper to filter or return empty list in Clean Slate mode
 */
export function getProductionData<T>(realData: T[], fallbackDemoData: T[]): T[] {
  if (realData.length > 0) {
    return realData;
  }
  return isCleanSlateMode() ? [] : fallbackDemoData;
}
