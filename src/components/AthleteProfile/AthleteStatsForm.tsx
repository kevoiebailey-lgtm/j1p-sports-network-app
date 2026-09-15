import React, { useState, useEffect } from 'react';
import { SportType, SportStats } from '../../types';
import { Activity, Save, Trophy, Check } from 'lucide-react';
import { SportSelector } from '../Common/SportSelector';
import { getSportDefinition, getSportEmoji } from '../../lib/sports';

interface AthleteStatsFormProps {
  currentSport: SportType;
  currentStats: SportStats;
  onSaveStats: (sport: SportType, stats: SportStats) => void;
}

export const AthleteStatsForm: React.FC<AthleteStatsFormProps> = ({
  currentSport,
  currentStats,
  onSaveStats
}) => {
  const [selectedSport, setSelectedSport] = useState<string>(currentSport || 'Basketball');
  const [stats, setStats] = useState<any>(currentStats || {});
  const [savedSuccess, setSavedSuccess] = useState(false);

  const sportDef = getSportDefinition(selectedSport);

  useEffect(() => {
    setSelectedSport(currentSport || 'Basketball');
    setStats(currentStats || {});
  }, [currentSport, currentStats]);

  const handleSportChange = (sportName: string) => {
    setSelectedSport(sportName);
    const newDef = getSportDefinition(sportName);
    // Initialize default values for the new sport
    const initialStats: Record<string, any> = {};
    newDef.defaultStatFields.forEach((field) => {
      initialStats[field.key] = field.placeholder;
    });
    setStats(initialStats);
  };

  const handleInputChange = (fieldKey: string, value: string) => {
    setStats((prev: any) => ({
      ...prev,
      [fieldKey]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveStats(selectedSport, stats);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Universal Sport Selector */}
      <div>
        <SportSelector
          selectedSport={selectedSport}
          onSelectSport={handleSportChange}
          label="Athlete Primary Sport"
          placeholder="Search 35+ sports (Soccer, Football, Track, Baseball, Volleyball, Golf...)"
        />
      </div>

      {/* Dynamic Input Fields based on Selected Sport */}
      <div className="bg-white/5 p-4 sm:p-5 rounded-3xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <span className="text-xs sm:text-sm font-black tracking-wider uppercase text-[#E5B868] flex items-center gap-2">
            <span className="text-xl">{getSportEmoji(selectedSport)}</span>
            <span>{selectedSport} Season Performance Metrics</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline-block">
            Universal Scout Tracking
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sportDef.defaultStatFields.map((field) => (
            <div key={field.key} className="bg-black/30 p-2.5 rounded-2xl border border-white/5">
              <label className="text-[10px] font-black uppercase text-slate-300 block mb-1">
                {field.label}
              </label>
              <input
                type="text"
                value={stats[field.key] ?? ''}
                onChange={(e) => handleInputChange(field.key, e.target.value)}
                className="w-full bg-[#212A31] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#E5B868] focus:border-[#E5B868] focus:outline-none"
                placeholder={field.placeholder}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <button
        type="submit"
        className="w-full py-3.5 px-4 bg-[#E5B868] hover:bg-[#B8141B] text-black font-black text-xs uppercase tracking-wider rounded-2xl shadow-[0_0_20px_rgba(214,28,36,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        {savedSuccess ? (
          <>
            <Check className="w-4 h-4 stroke-[3]" />
            <span>SEASON STATS SAVED TO PROFILE!</span>
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            <span>SAVE {selectedSport.toUpperCase()} ATHLETE STATS</span>
          </>
        )}
      </button>
    </form>
  );
};

