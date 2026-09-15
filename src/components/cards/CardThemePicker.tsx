import React, { useState } from 'react';
import { CardTheme, PREBUILT_THEMES } from '../../types/cardTheme';
import { Sparkles, Layers, ShieldCheck, Flame } from 'lucide-react';

interface CardThemePickerProps {
  selectedThemeId: string;
  onSelectTheme: (theme: CardTheme) => void;
  className?: string;
}

const CATEGORIES: { id: CardTheme['category'] | 'all'; label: string }[] = [
  { id: 'all', label: 'All Themes' },
  { id: 'gameday', label: 'Game Day' },
  { id: 'shatter', label: 'Shatter & Kinetic' },
  { id: 'trading_card', label: 'Trading Card' },
  { id: 'classic', label: 'Classic & Minimal' }
];

export const CardThemePicker: React.FC<CardThemePickerProps> = ({
  selectedThemeId,
  onSelectTheme,
  className = ''
}) => {
  const [activeCategory, setActiveCategory] = useState<CardTheme['category'] | 'all'>('all');

  const themes = Object.values(PREBUILT_THEMES);
  const filteredThemes = activeCategory === 'all'
    ? themes
    : themes.filter(t => t.category === activeCategory);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {CATEGORIES.map(cat => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-700 text-white shadow-sm border border-slate-600'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Theme Cards Grid / Carousel */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {filteredThemes.map(theme => {
          const isSelected = theme.id === selectedThemeId;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => onSelectTheme(theme)}
              className={`group relative flex flex-col items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer overflow-hidden ${
                isSelected
                  ? 'bg-slate-800/90 border-white shadow-lg ring-2'
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
              }`}
              style={{
                borderColor: isSelected ? theme.accentColor : undefined,
                boxShadow: isSelected ? `0 0 15px ${theme.glowColor}` : undefined
              }}
            >
              {/* Background Thumbnail Tint */}
              <div 
                className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity bg-cover bg-center pointer-events-none"
                style={{ backgroundImage: `url(${theme.backdropUrl})` }}
              />

              <div className="relative z-10 w-full flex items-center justify-between mb-1.5">
                <span 
                  className="w-3 h-3 rounded-full border border-black/40 shadow-sm"
                  style={{ backgroundColor: theme.accentColor }}
                />
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-black/50 text-slate-300">
                  {theme.sport}
                </span>
              </div>

              <div className="relative z-10 w-full">
                <div 
                  className="text-xs font-black text-white truncate"
                  style={{ fontStyle: theme.fontStyle }}
                >
                  {theme.name}
                </div>
                <div className="text-[10px] text-slate-400 capitalize truncate">
                  {theme.category.replace('_', ' ')}
                </div>
              </div>

              {isSelected && (
                <div 
                  className="absolute bottom-1 right-1.5 text-[9px] font-black uppercase px-1 rounded"
                  style={{ color: theme.accentColor }}
                >
                  Active
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
