import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { triggerHaptic } from '../lib/haptics';
import { useAppStore } from '../store/useAppStore';

export type LogoStyle = 'crest' | 'cyber' | 'minimal' | 'custom';

export interface LogoOption {
  id: LogoStyle;
  name: string;
  badge: string;
  description: string;
  previewClass: string;
}

export const LOGO_OPTIONS: LogoOption[] = [
  {
    id: 'crest',
    name: 'Official 3D Crest',
    badge: 'FLAGSHIP',
    description: 'Metallic gold winged camera shield with gem core & circuit traces',
    previewClass: 'from-[#E5B868]/20 to-[#FF6A00]/20 text-[#E5B868]'
  },
  {
    id: 'cyber',
    name: 'Cyber J1P Badge',
    badge: 'NEON PRO',
    description: 'Glowing cyan tech badge with athletic cyberpunk branding',
    previewClass: 'from-[#00B8D4]/20 to-[#00F5D4]/20 text-[#00B8D4]'
  },
  {
    id: 'minimal',
    name: 'Clean Sport Wordmark',
    badge: 'MODERN',
    description: 'High-contrast italic typography with amber accent dot',
    previewClass: 'from-slate-700/30 to-slate-800/30 text-white'
  },
  {
    id: 'custom',
    name: 'Custom Team Logo',
    badge: 'CUSTOM',
    description: 'Upload your own athletic program, school, or team emblem',
    previewClass: 'from-purple-500/20 to-pink-500/20 text-purple-400'
  }
];

export interface LogoContextType {
  logoStyle: LogoStyle;
  customLogoUrl: string | null;
  isSwitcherOpen: boolean;
  setLogoStyle: (style: LogoStyle) => void;
  setCustomLogoUrl: (url: string | null) => void;
  cycleLogoStyle: () => void;
  openLogoSwitcher: () => void;
  closeLogoSwitcher: () => void;
  toggleLogoSwitcher: () => void;
}

const LogoContext = createContext<LogoContextType | undefined>(undefined);

const LOGO_STORAGE_KEY = 'j1p_logo_style';
const CUSTOM_LOGO_STORAGE_KEY = 'j1p_custom_logo_url';

export const LogoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [logoStyle, setLogoStyleState] = useState<LogoStyle>(() => {
    if (typeof window === 'undefined') return 'crest';
    try {
      const saved = localStorage.getItem(LOGO_STORAGE_KEY) as LogoStyle | null;
      if (saved && (saved === 'crest' || saved === 'cyber' || saved === 'minimal' || saved === 'custom')) {
        return saved;
      }
    } catch (e) {
      console.warn('Unable to access localStorage for logo preference:', e);
    }
    return 'crest';
  });

  const [customLogoUrl, setCustomLogoUrlState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(CUSTOM_LOGO_STORAGE_KEY) || null;
    } catch {
      return null;
    }
  });

  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  // Sync to localStorage and broadcast change
  const setLogoStyle = useCallback((style: LogoStyle) => {
    setLogoStyleState(style);
    useAppStore.getState().setLogoStyle(style);
    try {
      localStorage.setItem(LOGO_STORAGE_KEY, style);
      window.dispatchEvent(new CustomEvent('j1p:logo-changed', { detail: { style } }));
    } catch (e) {
      console.warn('Failed to persist logo style:', e);
    }
  }, []);

  const setCustomLogoUrl = useCallback((url: string | null) => {
    setCustomLogoUrlState(url);
    useAppStore.getState().setCustomLogoUrl(url);
    try {
      if (url) {
        localStorage.setItem(CUSTOM_LOGO_STORAGE_KEY, url);
      } else {
        localStorage.removeItem(CUSTOM_LOGO_STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Failed to persist custom logo URL:', e);
    }
  }, []);

  const cycleLogoStyle = useCallback(() => {
    triggerHaptic('light');
    const styles: LogoStyle[] = customLogoUrl ? ['crest', 'cyber', 'minimal', 'custom'] : ['crest', 'cyber', 'minimal'];
    const currentIndex = styles.indexOf(logoStyle);
    const nextIndex = (currentIndex + 1) % styles.length;
    setLogoStyle(styles[nextIndex]);
  }, [logoStyle, customLogoUrl, setLogoStyle]);

  const openLogoSwitcher = useCallback(() => {
    triggerHaptic('light');
    setIsSwitcherOpen(true);
  }, []);

  const closeLogoSwitcher = useCallback(() => {
    setIsSwitcherOpen(false);
  }, []);

  const toggleLogoSwitcher = useCallback(() => {
    triggerHaptic('light');
    setIsSwitcherOpen((prev) => !prev);
  }, []);

  // Listen for storage changes across tabs
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorage = (e: StorageEvent) => {
      if (e.key === LOGO_STORAGE_KEY && e.newValue) {
        setLogoStyleState(e.newValue as LogoStyle);
      }
      if (e.key === CUSTOM_LOGO_STORAGE_KEY) {
        setCustomLogoUrlState(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const value = useMemo(
    () => ({
      logoStyle,
      customLogoUrl,
      isSwitcherOpen,
      setLogoStyle,
      setCustomLogoUrl,
      cycleLogoStyle,
      openLogoSwitcher,
      closeLogoSwitcher,
      toggleLogoSwitcher
    }),
    [
      logoStyle,
      customLogoUrl,
      isSwitcherOpen,
      setLogoStyle,
      setCustomLogoUrl,
      cycleLogoStyle,
      openLogoSwitcher,
      closeLogoSwitcher,
      toggleLogoSwitcher
    ]
  );

  return <LogoContext.Provider value={value}>{children}</LogoContext.Provider>;
};

export function useLogo(): LogoContextType {
  const context = useContext(LogoContext);
  if (!context) {
    throw new Error('useLogo must be used within a LogoProvider');
  }
  return context;
}
