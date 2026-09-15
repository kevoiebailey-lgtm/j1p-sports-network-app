import React, { useState } from 'react';
import { 
  AthleteCardData, 
  SportCategory, 
  NeonColorTheme, 
  AthleticTypographyStyle,
  DEFAULT_SPORT_STATS, 
  DEFAULT_SPORT_IMAGES,
  TEMPLATES,
  NEON_THEMES,
  POSTER_BACKDROPS,
  ATHLETIC_TYPOGRAPHY_CONFIGS,
  TEAM_COLOR_SWATCHES
} from './SportsTemplateEngine';
import { Sparkles, ZoomIn, Move, Sliders, Palette, Shield, Upload, Image as ImageIcon, Type, Droplet } from 'lucide-react';

export interface GraphicStudioControlsProps {
  cardData: AthleteCardData;
  setCardData: React.Dispatch<React.SetStateAction<AthleteCardData>> | ((updater: any) => void);
  activeTab?: 'edit' | 'preview' | string;
  setActiveTab?: (tab: 'edit' | 'preview' | string) => void;
}

const SPORT_OPTIONS: { id: SportCategory; name: string; positions: string[] }[] = [
  { 
    id: 'Baseball', 
    name: 'Baseball / Softball', 
    positions: ['Pitcher', 'Catcher', 'First Base', 'Second Base', 'Third Base', 'Shortstop', 'Left Field', 'Center Field', 'Right Field', 'Designated Hitter', 'Utility'] 
  },
  { 
    id: 'Football', 
    name: 'Football', 
    positions: ['Quarterback (QB)', 'Wide Receiver (WR)', 'Running Back (RB)', 'Tight End (TE)', 'Offensive Tackle (OT)', 'Offensive Guard (OG)', 'Center (C)', 'Defensive End (DE)', 'Defensive Tackle (DT)', 'Linebacker (LB)', 'Cornerback (CB)', 'Safety (FS/SS)', 'Kicker / Punter (K/P)', 'Return Specialist'] 
  },
  { 
    id: 'Basketball', 
    name: 'Basketball', 
    positions: ['Point Guard (PG)', 'Shooting Guard (SG)', 'Guard (G)', 'Small Forward (SF)', 'Power Forward (PF)', 'Forward (F)', 'Center (C)', 'Combo Guard', 'Wing'] 
  },
  { 
    id: 'Soccer', 
    name: 'Soccer', 
    positions: ['Striker (ST)', 'Center Forward (CF)', 'Left Wing (LW)', 'Right Wing (RW)', 'Attacking Mid (CAM)', 'Central Mid (CM)', 'Defensive Mid (CDM)', 'Left Back (LB)', 'Right Back (RB)', 'Center Back (CB)', 'Goalkeeper (GK)'] 
  },
  { 
    id: 'Wrestling', 
    name: 'Wrestling', 
    positions: ['106 lbs', '113 lbs', '120 lbs', '126 lbs', '132 lbs', '138 lbs', '145 lbs', '152 lbs', '160 lbs', '170 lbs', '182 lbs', '195 lbs', '220 lbs', '285 lbs (Heavyweight)'] 
  },
  { 
    id: 'Volleyball', 
    name: 'Volleyball', 
    positions: ['Outside Hitter', 'Opposite / Right Side', 'Setter', 'Middle Blocker', 'Libero', 'Defensive Specialist (DS)', 'Serving Specialist'] 
  },
  { 
    id: 'Track', 
    name: 'Track & Field', 
    positions: ['100m / 200m Sprinter', '400m Sprinter', '110m / 300m Hurdler', '800m / 1600m Distance', 'Cross Country', 'Long Jump / Triple Jump', 'High Jump', 'Pole Vault', 'Shot Put', 'Discus / Javelin'] 
  },
  { 
    id: 'Cheer', 
    name: 'Cheer / Dance', 
    positions: ['Flyer', 'Main Base', 'Side Base', 'Backspot', 'Front Spot', 'Tumbler', 'Captain', 'Stunt Specialist', 'All-Around'] 
  },
  { 
    id: 'Custom', 
    name: 'Custom / General', 
    positions: ['Athlete', 'Captain', 'Starter', 'Prospect', 'All-American', 'MVP', 'Champion'] 
  }
];

export const GraphicStudioControls: React.FC<GraphicStudioControlsProps> = ({ 
  cardData, 
  setCardData, 
  activeTab = 'edit', 
  setActiveTab 
}) => {
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string>('');

  // When sport changes, auto-populate default stats, default position, and fallback media
  const handleSportChange = (newSport: SportCategory) => {
    const sportConfig = SPORT_OPTIONS.find(s => s.id === newSport);
    const newStats = DEFAULT_SPORT_STATS[newSport] || DEFAULT_SPORT_STATS.Baseball;
    const defaultPos = sportConfig?.positions[0] || 'Athlete';
    const defaultImg = DEFAULT_SPORT_IMAGES[newSport] || DEFAULT_SPORT_IMAGES.Baseball;

    setCardData((prev: AthleteCardData) => ({
      ...prev,
      sportCategory: newSport,
      stats: { ...newStats },
      position: defaultPos,
      // If user hasn't uploaded a custom photo, update placeholder image
      mediaUrl: prev.mediaUrl && !Object.values(DEFAULT_SPORT_IMAGES).includes(prev.mediaUrl) 
        ? prev.mediaUrl 
        : defaultImg
    }));
  };

  const handleStatValueChange = (key: string, value: string) => {
    setCardData((prev: AthleteCardData) => ({
      ...prev,
      stats: { ...(prev.stats || {}), [key]: value },
    }));
  };

  const handleStatKeyChange = (oldKey: string, newKey: string) => {
    if (!newKey.trim()) return;
    setCardData((prev: AthleteCardData) => {
      const existing = { ...(prev.stats || {}) };
      const currentVal = existing[oldKey] ?? '';
      delete existing[oldKey];
      existing[newKey.trim()] = currentVal;
      return {
        ...prev,
        stats: existing
      };
    });
  };

  // Client-Side Image Upload & Background Removal
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsRemovingBg(true);
      setProgressMsg('Initializing Neural Cutout...');
      
      // 1. Run local Wasm background removal via dynamic import
      const { removeBackground } = await import('@imgly/background-removal');
      const imageBlob = await removeBackground(file, {
        progress: (key: string, current: number, total: number) => {
          const pct = total > 0 ? Math.round((current / total) * 100) : 0;
          setProgressMsg(`Processing: ${pct > 0 ? `${pct}%` : key}`);
        },
      });

      // 2. Create object URL for instant live rendering on SVG canvas
      const processedUrl = URL.createObjectURL(imageBlob);
      setCardData((prev: AthleteCardData) => ({ ...prev, mediaUrl: processedUrl }));
    } catch (error) {
      console.error('Background removal fallback:', error);
      // Fallback: load raw image if background removal fails
      setCardData((prev: AthleteCardData) => ({ ...prev, mediaUrl: URL.createObjectURL(file) }));
    } finally {
      setIsRemovingBg(false);
      setProgressMsg('');
    }
  };

  const currentSport = (cardData?.sportCategory || 'Baseball') as SportCategory;
  const currentSportConfig = SPORT_OPTIONS.find(s => s.id === currentSport) || SPORT_OPTIONS[0];
  const stats = cardData?.stats || {};
  const statEntries = Object.entries(stats);

  return (
    <div className="w-full bg-slate-950 text-white p-5 md:p-6 rounded-2xl border border-cyan-500/30 space-y-6 shadow-2xl font-sans">
      {/* Mobile Mode Toggle */}
      {setActiveTab && (
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('edit')}
            className={`flex-1 py-2 rounded-lg font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'edit' ? 'bg-cyan-500 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            1. Edit Controls
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex-1 py-2 rounded-lg font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'preview' ? 'bg-cyan-500 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            2. View Live Card
          </button>
        </div>
      )}

      {/* 1. SPORT PRESET SELECTOR */}
      <div className="space-y-2 p-4 bg-slate-900/90 rounded-xl border border-cyan-500/20">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            01 // Select Sport Preset
          </label>
          <span className="text-[10px] font-mono text-slate-400">Auto-populates Stats</span>
        </div>

        <select
          value={currentSport}
          onChange={(e) => handleSportChange(e.target.value as SportCategory)}
          className="w-full bg-slate-950 border border-cyan-500/40 rounded-xl px-3 py-2.5 text-sm font-bold text-white focus:border-cyan-400 outline-none cursor-pointer"
        >
          {SPORT_OPTIONS.map((sport) => (
            <option key={sport.id} value={sport.id} className="bg-slate-950 text-white">
              {sport.name}
            </option>
          ))}
        </select>
      </div>

      {/* 2. THEME & POSTER TEMPLATE SELECTOR */}
      <div className="space-y-3 p-4 bg-slate-900/90 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono text-cyan-400 uppercase tracking-widest block font-bold flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-cyan-400" />
            02 // Choose Backdrop Style & Neon Grade
          </label>
          <span className="text-[10px] font-mono text-cyan-400/80">15 High-Res Backdrops</span>
        </div>

        {/* Dynamic Backdrop Thumbnail Selector */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <ImageIcon className="w-3 h-3 text-cyan-400" />
              SELECT HIGH-RES SPORTS BACKDROP:
            </span>
            {cardData?.backdropImageUrl ? (
              <button
                type="button"
                onClick={() => setCardData((prev: AthleteCardData) => ({ ...prev, backdropImageUrl: undefined }))}
                className="text-amber-400 hover:text-amber-300 underline cursor-pointer text-[9px]"
              >
                Reset to Vector Theme
              </button>
            ) : (
              <span className="text-slate-500 text-[9px]">Vector Art Active</span>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
            {POSTER_BACKDROPS.map((bd) => {
              const isSelected = cardData?.backdropImageUrl === bd.url;
              return (
                <button
                  key={bd.id}
                  type="button"
                  onClick={() => setCardData((prev: AthleteCardData) => ({ ...prev, backdropImageUrl: bd.url }))}
                  className={`relative flex-shrink-0 w-16 h-20 rounded-lg overflow-hidden border-2 transition-all group cursor-pointer ${
                    isSelected 
                      ? 'border-cyan-400 ring-2 ring-cyan-400/40 shadow-lg scale-105' 
                      : 'border-slate-800 hover:border-slate-600 opacity-70 hover:opacity-100'
                  }`}
                  title={bd.name}
                >
                  <img
                    src={bd.url}
                    alt={bd.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1">
                    <span className="text-[8px] font-mono font-bold text-white leading-tight truncate">
                      #{bd.id.replace('backdrop_', '')}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#00f3ff]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <span className="text-[10px] font-mono text-slate-400 block mb-1">POSTER VECTOR THEME (FALLBACK)</span>
            <select
              value={cardData?.templateId || 'apex_diamond_series'}
              onChange={(e) => setCardData((prev: AthleteCardData) => ({ ...prev, templateId: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-semibold text-cyan-300 focus:border-cyan-400 outline-none cursor-pointer"
            >
              {TEMPLATES.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.id} className="bg-slate-950 text-white">
                  {tmpl.name} ({tmpl.tag})
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="text-[10px] font-mono text-slate-400 block mb-1">COLOR ACCENT PRESET</span>
            <select
              value={cardData?.primaryColor || 'cyan'}
              onChange={(e) => setCardData((prev: AthleteCardData) => {
                const selectedKey = e.target.value as NeonColorTheme;
                const cfg = NEON_THEMES[selectedKey];
                return {
                  ...prev,
                  primaryColor: selectedKey,
                  themeColor: cfg?.hex || prev.themeColor,
                  secondaryColor: cfg?.secondaryHex || prev.secondaryColor
                };
              })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-semibold text-white focus:border-cyan-400 outline-none cursor-pointer"
            >
              {Object.entries(NEON_THEMES).map(([colorKey, cfg]) => (
                <option key={colorKey} value={colorKey} className="bg-slate-950 text-white">
                  {cfg.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* TEAM ACCENT COLOR SWATCHES & HEX CONTROLS */}
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-300 font-bold flex items-center gap-1">
              <Droplet className="w-3 h-3 text-cyan-400" />
              TEAM ACCENT PALETTE (SWATCHES & CUSTOM HEX):
            </span>
            <span className="text-[9px] font-mono text-slate-500">Affects Rails, Glow & Stats</span>
          </div>

          {/* Quick Click Swatches */}
          <div className="flex flex-wrap gap-1.5 items-center">
            {TEAM_COLOR_SWATCHES.map((swatch) => {
              const isActive = (cardData?.themeColor || '').toLowerCase() === swatch.hex.toLowerCase();
              return (
                <button
                  key={swatch.name}
                  type="button"
                  onClick={() => setCardData((prev: AthleteCardData) => ({
                    ...prev,
                    themeColor: swatch.hex,
                    secondaryColor: swatch.secondaryHex
                  }))}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-mono transition cursor-pointer ${
                    isActive 
                      ? 'border-cyan-400 bg-slate-800 text-white shadow-[0_0_8px_rgba(0,240,208,0.3)]' 
                      : 'border-slate-800 bg-slate-950/70 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: swatch.hex }} />
                  <span>{swatch.name}</span>
                </button>
              );
            })}
          </div>

          {/* Precision Dual Hex Pickers */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
              <input
                type="color"
                value={cardData?.themeColor || '#00F0D0'}
                onChange={(e) => setCardData((prev: AthleteCardData) => ({ ...prev, themeColor: e.target.value }))}
                className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
              />
              <div className="flex flex-col">
                <span className="text-[8px] font-mono text-slate-500">PRIMARY HEX</span>
                <input
                  type="text"
                  value={cardData?.themeColor || '#00F0D0'}
                  onChange={(e) => setCardData((prev: AthleteCardData) => ({ ...prev, themeColor: e.target.value }))}
                  className="bg-transparent text-[11px] font-mono text-cyan-400 font-bold outline-none uppercase w-20"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
              <input
                type="color"
                value={cardData?.secondaryColor || '#00B8D4'}
                onChange={(e) => setCardData((prev: AthleteCardData) => ({ ...prev, secondaryColor: e.target.value }))}
                className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
              />
              <div className="flex flex-col">
                <span className="text-[8px] font-mono text-slate-500">SECONDARY HEX</span>
                <input
                  type="text"
                  value={cardData?.secondaryColor || '#00B8D4'}
                  onChange={(e) => setCardData((prev: AthleteCardData) => ({ ...prev, secondaryColor: e.target.value }))}
                  className="bg-transparent text-[11px] font-mono text-cyan-300 font-bold outline-none uppercase w-20"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ATHLETIC TYPOGRAPHY SELECTOR */}
        <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-bold flex items-center gap-1">
              <Type className="w-3 h-3 text-cyan-400" />
              ATHLETIC TYPOGRAPHY STYLE:
            </label>
            <span className="text-[9px] font-mono text-slate-500">Headlines & Ghost Layers</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.entries(ATHLETIC_TYPOGRAPHY_CONFIGS) as [AthleticTypographyStyle, typeof ATHLETIC_TYPOGRAPHY_CONFIGS[AthleticTypographyStyle]][]).map(([tKey, tCfg]) => {
              const isSelected = (cardData?.typographyStyle || 'collegiate_block') === tKey;
              return (
                <button
                  key={tKey}
                  type="button"
                  onClick={() => setCardData((prev: AthleteCardData) => ({ ...prev, typographyStyle: tKey }))}
                  className={`p-2 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    isSelected 
                      ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300 shadow-[0_0_10px_rgba(0,240,208,0.2)] ring-1 ring-cyan-400' 
                      : 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <span 
                    className="text-sm font-black truncate block leading-tight" 
                    style={{ fontFamily: tCfg.fontFamily, fontStyle: tCfg.isItalic ? 'italic' : 'normal' }}
                  >
                    CHAMPION
                  </span>
                  <div className="mt-1">
                    <span className="text-[9px] font-mono font-bold block truncate text-white">{tCfg.name}</span>
                    <span className="text-[8px] font-mono text-slate-500 block truncate">{tCfg.description}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. ATHLETE MEDIA UPLOAD WITH AUTO-CUTOUT */}
      <div className="space-y-3 p-4 bg-slate-900/90 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            03 // Athlete Photo Cutout
          </label>
          <span className="text-[10px] font-mono text-emerald-400">Neural Auto-Cutout</span>
        </div>
        
        <div className="grid grid-cols-1 gap-3">
          <label className="relative flex flex-col items-center justify-center p-4 border border-dashed border-cyan-500/40 hover:border-cyan-400 rounded-xl cursor-pointer bg-slate-950/60 transition group text-center">
            {isRemovingBg ? (
              <div className="flex flex-col items-center justify-center space-y-1 text-cyan-400 font-mono text-xs animate-pulse py-2">
                <span className="font-bold tracking-wider">REMOVING BACKGROUND...</span>
                <span className="text-[10px] text-slate-400 font-mono">{progressMsg || 'Generating athlete cutout...'}</span>
              </div>
            ) : (
              <div>
                <p className="text-xs text-slate-200 font-semibold group-hover:text-cyan-300">
                  Upload Athlete Photo (Auto Cutout)
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  PNG, JPG or High-Res — Runs instant client-side background removal
                </p>
              </div>
            )}
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload} 
              disabled={isRemovingBg}
              className="hidden" 
            />
          </label>

          <input
            type="text"
            placeholder="Or Paste Direct Cutout / Image URL..."
            value={cardData?.mediaUrl || ''}
            onChange={(e) => setCardData((prev: AthleteCardData) => ({ ...prev, mediaUrl: e.target.value }))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-cyan-400 outline-none font-mono"
          />
        </div>

        {/* PHOTO ALIGNMENT & ZOOM SLIDERS */}
        <div className="pt-2 border-t border-slate-800/80 space-y-3">
          <span className="text-[11px] font-mono text-slate-300 font-bold flex items-center gap-1.5">
            <Sliders className="w-3 h-3 text-cyan-400" />
            Photo Layer Alignment & Scale
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Zoom Slider */}
            <div className="space-y-1 bg-slate-950 p-2 rounded-lg border border-slate-800">
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>SCALE / ZOOM</span>
                <span className="text-cyan-400 font-bold">{Number(cardData?.photoScale || 1.0).toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={cardData?.photoScale || 1.0}
                onChange={(e) => setCardData((prev: AthleteCardData) => ({ ...prev, photoScale: parseFloat(e.target.value) }))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Position X Slider */}
            <div className="space-y-1 bg-slate-950 p-2 rounded-lg border border-slate-800">
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>HORIZONTAL (X)</span>
                <span className="text-cyan-400 font-bold">{cardData?.photoX || 0}px</span>
              </div>
              <input
                type="range"
                min="-200"
                max="200"
                step="5"
                value={cardData?.photoX || 0}
                onChange={(e) => setCardData((prev: AthleteCardData) => ({ ...prev, photoX: parseInt(e.target.value, 10) }))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Position Y Slider */}
            <div className="space-y-1 bg-slate-950 p-2 rounded-lg border border-slate-800">
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>VERTICAL (Y)</span>
                <span className="text-cyan-400 font-bold">{cardData?.photoY || 0}px</span>
              </div>
              <input
                type="range"
                min="-200"
                max="200"
                step="5"
                value={cardData?.photoY || 0}
                onChange={(e) => setCardData((prev: AthleteCardData) => ({ ...prev, photoY: parseInt(e.target.value, 10) }))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. ATHLETE INFO & JERSEY NUMBER */}
      <div className="space-y-3 p-4 bg-slate-900/90 rounded-xl border border-slate-800">
        <label className="text-xs font-mono text-cyan-400 uppercase tracking-widest block font-bold">
          04 // Player Information
        </label>
        <div className="grid grid-cols-4 gap-3">
          <div className="col-span-3">
            <span className="text-[10px] font-mono text-slate-400 block mb-1">FULL NAME</span>
            <input
              type="text"
              placeholder="e.g. Marcus Cole"
              value={cardData?.athleteName || ''}
              onChange={(e) => setCardData((prev: AthleteCardData) => ({ ...prev, athleteName: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm font-semibold text-white focus:border-cyan-400 outline-none"
            />
          </div>
          <div>
            <span className="text-[10px] font-mono text-slate-400 block mb-1">JERSEY #</span>
            <input
              type="text"
              placeholder="#00"
              value={cardData?.jerseyNumber || ''}
              onChange={(e) => setCardData((prev: AthleteCardData) => ({ ...prev, jerseyNumber: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm font-semibold text-cyan-400 focus:border-cyan-400 outline-none text-center"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <span className="text-[10px] font-mono text-slate-400 block mb-1">TEAM / ORG</span>
            <input
              type="text"
              placeholder="Team Name"
              value={cardData?.teamName || ''}
              onChange={(e) => setCardData((prev: AthleteCardData) => ({ ...prev, teamName: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 focus:border-cyan-400 outline-none"
            />
          </div>

          <div>
            <span className="text-[10px] font-mono text-slate-400 block mb-1">POSITION</span>
            <input
              type="text"
              placeholder="Position"
              value={cardData?.position || ''}
              onChange={(e) => setCardData((prev: AthleteCardData) => ({ ...prev, position: e.target.value }))}
              list="position-suggestions"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 focus:border-cyan-400 outline-none"
            />
            <datalist id="position-suggestions">
              {currentSportConfig.positions.map((pos) => (
                <option key={pos} value={pos} />
              ))}
            </datalist>
          </div>

          <div>
            <span className="text-[10px] font-mono text-slate-400 block mb-1">OVR RATING</span>
            <input
              type="text"
              placeholder="99"
              value={cardData?.ovrRating || '99'}
              onChange={(e) => setCardData((prev: AthleteCardData) => ({ ...prev, ovrRating: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-bold text-amber-400 focus:border-cyan-400 outline-none text-center"
            />
          </div>
        </div>
      </div>

      {/* 5. CUSTOMIZABLE 4-STAT HUD BADGES */}
      <div className="space-y-3 p-4 bg-slate-900/90 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold">
            05 // 4 Stat Badges (Editable Labels & Values)
          </label>
          <span className="text-[10px] font-mono text-slate-400">Click to change label or value</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {statEntries.slice(0, 4).map(([statKey, statVal], idx) => (
            <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-mono text-slate-500">STAT 0{idx + 1} LABEL:</span>
                <input
                  type="text"
                  value={statKey}
                  onChange={(e) => handleStatKeyChange(statKey, e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-[11px] font-mono text-cyan-400 font-bold outline-none text-right w-28 uppercase"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-mono text-slate-500">VALUE:</span>
                <input
                  type="text"
                  value={statVal || ''}
                  onChange={(e) => handleStatValueChange(statKey, e.target.value)}
                  placeholder="e.g. 99.4"
                  className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-xs font-bold text-white outline-none text-right w-28"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GraphicStudioControls;
