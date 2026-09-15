import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';

export type Theme = 'dark' | 'light';
export type ThemeMode = 'system' | 'dark' | 'light';

export interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  isSystem: boolean;
  systemTheme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  setThemeMode: (mode: ThemeMode) => void;
  resetToSystem: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_MODE_KEY = 'j1p_theme_mode';
const LEGACY_STORAGE_KEY = 'j1p_theme';

function getSystemTheme(): Theme {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}

function getInitialThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  try {
    const savedMode = localStorage.getItem(STORAGE_MODE_KEY) as ThemeMode | null;
    if (savedMode === 'system' || savedMode === 'dark' || savedMode === 'light') {
      return savedMode;
    }
    // Backward compatibility with previous 'j1p_theme' key
    const legacySaved = localStorage.getItem(LEGACY_STORAGE_KEY) as Theme | null;
    if (legacySaved === 'dark' || legacySaved === 'light') {
      return legacySaved;
    }
  } catch (e) {
    console.warn('Unable to access localStorage during theme initialization:', e);
  }
  return 'system';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [systemTheme, setSystemTheme] = useState<Theme>(getSystemTheme);
  const [themeMode, setThemeModeState] = useState<ThemeMode>(getInitialThemeMode);

  // Resolved active theme
  const activeTheme: Theme = useMemo(() => {
    if (themeMode === 'system') {
      return systemTheme;
    }
    return themeMode;
  }, [themeMode, systemTheme]);

  // 1. Listen for OS-level dark/light preference changes in real-time
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleMediaChange = (e: MediaQueryListEvent | MediaQueryList) => {
      const newSysTheme: Theme = e.matches ? 'dark' : 'light';
      setSystemTheme(newSysTheme);
      useAppStore.getState().setSystemTheme(newSysTheme);
    };

    // Initial check
    handleMediaChange(mediaQuery);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
      return () => mediaQuery.removeEventListener('change', handleMediaChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleMediaChange);
      return () => mediaQuery.removeListener(handleMediaChange);
    }
  }, []);

  // 2. Cross-tab synchronization via storage event
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_MODE_KEY || event.key === LEGACY_STORAGE_KEY) {
        const newMode = getInitialThemeMode();
        setThemeModeState(newMode);
        useAppStore.getState().setThemeMode(newMode);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // 3. Apply classes, attributes, and colorScheme to DOM elements & sync to Zustand
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    const body = document.body;

    if (activeTheme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
      body.classList.remove('dark');
      body.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      body.classList.remove('light');
      body.classList.add('dark');
    }

    // Set standard HTML/CSS color-scheme
    root.style.colorScheme = activeTheme;
    root.setAttribute('data-theme', activeTheme);
    root.setAttribute('data-theme-mode', themeMode);
  }, [activeTheme, themeMode]);

  // Set explicit mode (system, dark, or light)
  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    useAppStore.getState().setThemeMode(mode);
    try {
      if (mode === 'system') {
        localStorage.setItem(STORAGE_MODE_KEY, 'system');
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_MODE_KEY, mode);
        localStorage.setItem(LEGACY_STORAGE_KEY, mode);
      }
    } catch (e) {
      console.warn('Unable to persist themeMode to localStorage:', e);
    }
  }, []);

  // Set explicit dark or light override
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeMode(newTheme);
  }, [setThemeMode]);

  // Toggle explicit theme override between light and dark
  const toggleTheme = useCallback(() => {
    const nextTheme: Theme = activeTheme === 'dark' ? 'light' : 'dark';
    setThemeMode(nextTheme);
  }, [activeTheme, setThemeMode]);

  // Reset to auto OS-level sync
  const resetToSystem = useCallback(() => {
    setThemeMode('system');
  }, [setThemeMode]);

  const value = useMemo<ThemeContextType>(() => ({
    theme: activeTheme,
    themeMode,
    isSystem: themeMode === 'system',
    systemTheme,
    toggleTheme,
    setTheme,
    setThemeMode,
    resetToSystem
  }), [activeTheme, themeMode, systemTheme, toggleTheme, setTheme, setThemeMode, resetToSystem]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

