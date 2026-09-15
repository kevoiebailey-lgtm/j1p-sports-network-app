import React, { useState, useEffect } from 'react';
import { POPULAR_SPORTS_LIST, getSportEmoji } from '../../lib/sports';
import { Trophy, Plus, Edit2 } from 'lucide-react';

export interface SportSelectorProps {
  value?: string;
  selectedSport?: string;
  onChange?: (sport: string) => void;
  onSelectSport?: (sport: string) => void;
  allowCustom?: boolean;
  className?: string;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
  showEmoji?: boolean;
  compact?: boolean;
}

export const ALL_COMPREHENSIVE_SPORTS: string[] = [
  'Basketball',
  'Flag Football',
  "Girls' Flag Football",
  "Boys' Flag Football",
  'Football',
  'Soccer',
  'Baseball',
  'Softball',
  'Volleyball',
  'Track & Field',
  'Cheerleading',
  'Cheer & Dance',
  'Lacrosse',
  'Tennis',
  'Swimming & Diving',
  'Golf',
  'Wrestling',
  'Gymnastics',
  'Ice Hockey',
  'Field Hockey',
  'Martial Arts / MMA',
  'Cross Country',
  'Rugby',
  'Bowling',
  'Esports',
  'Weightlifting / Powerlifting',
  'Water Polo',
  'Rowing / Crew',
  'Badminton',
  'Table Tennis',
  'Pickleball',
  'Field Events',
  'Archery',
  'Dance Team'
];

export const SportSelector: React.FC<SportSelectorProps> = ({
  value,
  selectedSport,
  onChange,
  onSelectSport,
  allowCustom = true,
  className = '',
  disabled = false,
  label,
  placeholder = 'Select or type a sport...',
  showEmoji = true,
  compact = false
}) => {
  const effectiveValue = value ?? selectedSport ?? '';
  const triggerChange = (newVal: string) => {
    if (onChange) onChange(newVal);
    if (onSelectSport) onSelectSport(newVal);
  };

  const isPredefined = ALL_COMPREHENSIVE_SPORTS.includes(effectiveValue);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(!isPredefined && !!effectiveValue);
  const [customInputValue, setCustomInputValue] = useState<string>(!isPredefined ? effectiveValue : '');

  useEffect(() => {
    if (!ALL_COMPREHENSIVE_SPORTS.includes(effectiveValue) && effectiveValue) {
      setIsCustomMode(true);
      setCustomInputValue(effectiveValue);
    } else if (ALL_COMPREHENSIVE_SPORTS.includes(effectiveValue)) {
      setIsCustomMode(false);
    }
  }, [effectiveValue]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    if (selected === '__CUSTOM__') {
      setIsCustomMode(true);
      if (customInputValue.trim()) {
        triggerChange(customInputValue.trim());
      }
    } else {
      setIsCustomMode(false);
      triggerChange(selected);
    }
  };

  const handleCustomInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomInputValue(val);
    triggerChange(val);
  };

  const currentEmoji = getSportEmoji(effectiveValue || 'Basketball');

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
            {label}
          </label>
          {allowCustom && !isCustomMode && (
            <button
              type="button"
              onClick={() => {
                setIsCustomMode(true);
                setCustomInputValue(value || '');
              }}
              className="text-[10px] text-[#E5B868] hover:underline flex items-center gap-1 font-mono cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Type Custom Sport</span>
            </button>
          )}
          {allowCustom && isCustomMode && (
            <button
              type="button"
              onClick={() => {
                setIsCustomMode(false);
                onChange(ALL_COMPREHENSIVE_SPORTS[0]);
              }}
              className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 font-mono cursor-pointer"
            >
              <span>Choose from list</span>
            </button>
          )}
        </div>
      )}

      {!isCustomMode ? (
        <div className="relative">
          <select
            value={isPredefined ? value : '__CUSTOM__'}
            onChange={handleSelectChange}
            disabled={disabled}
            className="w-full bg-[#161C22] dark:bg-[#161C22] border border-[#2D3748] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#E5B868] focus:outline-none transition-all disabled:opacity-50 cursor-pointer font-medium"
          >
            <option value="" disabled>
              {placeholder}
            </option>
            {ALL_COMPREHENSIVE_SPORTS.map((sp) => (
              <option key={sp} value={sp} className="bg-[#212A31] text-white">
                {showEmoji ? `${getSportEmoji(sp)} ` : ''}{sp}
              </option>
            ))}
            {allowCustom && (
              <option value="__CUSTOM__" className="bg-[#212A31] text-[#E5B868] font-bold">
                ✨ + Type Custom Sport (Other...)
              </option>
            )}
          </select>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative flex items-center">
            <span className="absolute left-3 text-sm pointer-events-none">
              {currentEmoji}
            </span>
            <input
              type="text"
              autoFocus
              value={customInputValue}
              onChange={handleCustomInput}
              disabled={disabled}
              placeholder="Type any sport (e.g. Fencing, Pickleball, Rugby, Martial Arts)..."
              className="w-full bg-[#161C22] dark:bg-[#161C22] border border-[#E5B868] rounded-xl pl-9 pr-24 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#E5B868] transition-all disabled:opacity-50 font-medium"
            />
            <button
              type="button"
              onClick={() => {
                setIsCustomMode(false);
                onChange('Basketball');
              }}
              className="absolute right-2 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] text-slate-300 font-mono"
            >
              Preset List
            </button>
          </div>
          <p className="text-[10px] text-slate-400 font-mono italic">
            Custom sport is saved directly to your profile and content tags.
          </p>
        </div>
      )}
    </div>
  );
};
