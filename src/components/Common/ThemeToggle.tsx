import React, { useState } from 'react';
import { Sun, Moon, Laptop, Sparkles, Check } from 'lucide-react';
import { useTheme, ThemeMode } from '../../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  variant?: 'pill' | 'segmented';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  showLabel = true,
  variant = 'pill',
}) => {
  const { theme, themeMode, isSystem, systemTheme, setThemeMode, toggleTheme, resetToSystem } = useTheme();
  const [showMenu, setShowMenu] = useState(false);

  // If segmented variant requested
  if (variant === 'segmented') {
    return (
      <div className={`inline-flex items-center p-1 bg-slate-900/90 border border-slate-700/80 rounded-2xl gap-1 ${className}`}>
        <button
          type="button"
          onClick={() => setThemeMode('dark')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            themeMode === 'dark'
              ? 'bg-[#FF6A00] text-white shadow-md font-black'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Force Dark Mode"
        >
          <Moon className="w-3.5 h-3.5" />
          <span>Night</span>
        </button>

        <button
          type="button"
          onClick={() => setThemeMode('light')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            themeMode === 'light'
              ? 'bg-[#FFB703] text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Force Light Mode"
        >
          <Sun className="w-3.5 h-3.5" />
          <span>Day</span>
        </button>

        <button
          type="button"
          onClick={() => setThemeMode('system')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            themeMode === 'system'
              ? 'bg-[#00F5D4] text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Sync with OS Dark/Light Preference"
        >
          <Laptop className="w-3.5 h-3.5" />
          <span>Auto (OS)</span>
        </button>
      </div>
    );
  }

  // Cycle through: System -> Dark -> Light -> System
  const handleCycleTheme = () => {
    if (themeMode === 'system') {
      // Move to opposite of system or explicit dark
      setThemeMode('dark');
    } else if (themeMode === 'dark') {
      setThemeMode('light');
    } else {
      setThemeMode('system');
    }
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={handleCycleTheme}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowMenu(!showMenu);
        }}
        type="button"
        aria-label={`Theme: ${themeMode === 'system' ? `Auto OS Sync (${systemTheme})` : theme === 'dark' ? 'Night (Override)' : 'Day (Override)'}`}
        title={`Theme: ${themeMode === 'system' ? `Auto OS (${systemTheme})` : theme === 'dark' ? 'Night' : 'Day'}. Click to cycle, right-click for options.`}
        className={`min-h-[48px] flex items-center gap-2 px-3.5 py-2 rounded-2xl font-mono text-xs font-black transition-all cursor-pointer shadow-md border active:scale-95 shrink-0 ${
          isSystem
            ? 'bg-slate-900 border-cyan-500/50 text-[#00F5D4] hover:bg-slate-800 shadow-[0_0_12px_rgba(0,245,212,0.15)]'
            : theme === 'dark'
              ? 'bg-slate-900 border-[#FF6A00]/50 text-[#FF6A00] hover:bg-slate-800'
              : 'bg-white border-[#FFB703]/50 text-slate-900 hover:bg-slate-100 shadow-sm'
        } ${className}`}
      >
        {isSystem ? (
          <>
            <div className="flex items-center gap-1">
              <Laptop className="w-4 h-4 text-[#00F5D4]" />
              {theme === 'dark' ? (
                <Moon className="w-3 h-3 text-cyan-300 fill-current opacity-80" />
              ) : (
                <Sun className="w-3 h-3 text-amber-400 fill-current opacity-80" />
              )}
            </div>
            {showLabel && (
              <span className="inline uppercase tracking-wider text-slate-200 text-[11px]">
                Auto (OS)
              </span>
            )}
          </>
        ) : theme === 'dark' ? (
          <>
            <Moon className="w-4 h-4 text-[#FF6A00] fill-current" />
            {showLabel && <span className="inline uppercase tracking-wider text-slate-200 text-[11px]">Night</span>}
          </>
        ) : (
          <>
            <Sun className="w-4 h-4 text-[#FFB703] fill-current" />
            {showLabel && <span className="inline uppercase tracking-wider text-slate-900 text-[11px]">Day</span>}
          </>
        )}
      </button>

      {/* Quick context menu if toggled */}
      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-slate-950 border border-slate-700 shadow-2xl p-2 z-50 text-xs backdrop-blur-xl">
          <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 mb-1">
            Theme Preference
          </div>
          <button
            onClick={() => {
              setThemeMode('system');
              setShowMenu(false);
            }}
            className={`w-full min-h-[40px] flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left font-bold transition-all ${
              themeMode === 'system' ? 'bg-[#00F5D4]/15 text-[#00F5D4]' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <Laptop className="w-4 h-4" />
              <span>Auto (Sync OS: {systemTheme})</span>
            </div>
            {themeMode === 'system' && <Check className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => {
              setThemeMode('dark');
              setShowMenu(false);
            }}
            className={`w-full min-h-[40px] flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left font-bold transition-all ${
              themeMode === 'dark' ? 'bg-[#FF6A00]/15 text-[#FF6A00]' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4" />
              <span>Dark (Night)</span>
            </div>
            {themeMode === 'dark' && <Check className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => {
              setThemeMode('light');
              setShowMenu(false);
            }}
            className={`w-full min-h-[40px] flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left font-bold transition-all ${
              themeMode === 'light' ? 'bg-[#FFB703]/15 text-[#FFB703]' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4" />
              <span>Light (Day)</span>
            </div>
            {themeMode === 'light' && <Check className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
    </div>
  );
};

