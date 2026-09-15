/**
 * Utility for subtle haptic feedback on supported mobile devices
 */
export const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'success' | 'tactile' = 'light') => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      switch (type) {
        case 'tactile':
        case 'light':
          navigator.vibrate(12);
          break;
        case 'medium':
          navigator.vibrate(25);
          break;
        case 'heavy':
          navigator.vibrate(45);
          break;
        case 'success':
          navigator.vibrate([15, 30, 20]);
          break;
      }
    } catch {
      // Ignore if device or permissions prevent vibration
    }
  }
};

export const triggerTactileVibe = () => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(12);
    } catch {
      // Ignore
    }
  }
};

