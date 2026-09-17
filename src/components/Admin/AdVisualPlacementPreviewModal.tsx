import React, { useState, useEffect } from 'react';
import { 
  X, 
  Monitor, 
  Smartphone, 
  Layers, 
  Eye, 
  Zap, 
  ExternalLink, 
  Sparkles,
  Trophy,
  Calendar,
  Users,
  Search,
  ChevronRight,
  ShieldCheck,
  Star,
  MapPin,
  Clock,
  ArrowRight,
  Shuffle,
  Sun,
  Moon,
  Sliders,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Flame,
  Radio,
  Share2,
  Activity,
  Award
} from 'lucide-react';
import { AdCampaign, AdPlacementPosition } from '../../types/ad';

interface AdVisualPlacementPreviewModalProps {
  ad: Partial<AdCampaign>;
  onClose: () => void;
  onUpdateAd?: (updatedFields: Partial<AdCampaign>) => void;
}

export const AdVisualPlacementPreviewModal: React.FC<AdVisualPlacementPreviewModalProps> = ({
  ad,
  onClose,
  onUpdateAd
}) => {
  // Live editable state matching form updates in real-time
  const [liveAd, setLiveAd] = useState<Partial<AdCampaign>>(ad);
  const [showLiveEditorPanel, setShowLiveEditorPanel] = useState<boolean>(true);
  const [previewTheme, setPreviewTheme] = useState<'dark' | 'light'>('dark');

  // Sync state if ad prop updates externally
  useEffect(() => {
    setLiveAd(ad);
  }, [ad]);

  const [selectedPage, setSelectedPage] = useState<'home' | 'events' | 'event-detail' | 'brackets' | 'recruiter'>(
    ad.placementPosition === 'events-top' ? 'events' :
    ad.placementPosition === 'tournament-bracket' ? 'brackets' :
    ad.placementPosition === 'recruiter-sidebar' ? 'recruiter' : 'home'
  );
  
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [showGuideLines, setShowGuideLines] = useState<boolean>(true);

  // Derived Values from liveAd state
  const brandName = liveAd.brandName || 'Sponsor Brand';
  const headline = liveAd.headline || 'YOUR SPONSORSHIP HEADLINE HERE';
  const subheadline = liveAd.subheadline || 'Engage thousands of high-school athletes, coaches, and college recruiters daily.';
  const ctaText = liveAd.ctaText || 'LEARN MORE';
  const primaryImageUrl = liveAd.imageUrl || 'https://images.unsplash.com/photo-1517649763962-0c623266010b?w=800&auto=format&fit=crop&q=80';
  const position = liveAd.placementPosition || 'header-leaderboard';

  const allImages = [primaryImageUrl, ...(liveAd.additionalImages || [])].filter(Boolean);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const displayImageUrl = allImages[activeImageIndex] || primaryImageUrl;

  const cycleNextImage = () => {
    setActiveImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const handleFieldChange = (field: keyof AdCampaign, value: any) => {
    const updated = { ...liveAd, [field]: value };
    setLiveAd(updated);
    if (onUpdateAd) {
      onUpdateAd({ [field]: value });
    }
  };

  const isLight = previewTheme === 'light';

  // Render Live Preview Ad Banner Component with exact live site styling
  const renderAdBannerPreview = (slotName: string) => {
    const isTargetSlot = position === slotName;

    return (
      <div className={`relative transition-all duration-300 rounded-2xl overflow-hidden ${
        isTargetSlot && showGuideLines 
          ? 'ring-2 ring-[#E5B868] ring-offset-2 ring-offset-black shadow-[0_0_25px_rgba(229,184,104,0.4)]' 
          : ''
      }`}>
        {/* Banner Dimension Tag Header if Guide Lines Enabled */}
        {showGuideLines && (
          <div className="bg-[#E5B868] text-black px-3 py-1 text-[9px] font-mono font-black uppercase flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 fill-black" />
              SLOT: {slotName} {isTargetSlot ? '🎯 (ACTIVE PREVIEW AD)' : '(SECONDARY AD)'}
            </span>
            <div className="flex items-center gap-2">
              {allImages.length > 1 && (
                <button
                  type="button"
                  onClick={cycleNextImage}
                  className="px-2 py-0.5 bg-black text-[#E5B868] rounded text-[8px] font-bold flex items-center gap-1 hover:bg-black/80 cursor-pointer"
                  title="Switch to next banner creative"
                >
                  <Shuffle className="w-2.5 h-2.5" />
                  <span>Creative {activeImageIndex + 1}/{allImages.length}</span>
                </button>
              )}
              <span>
                {slotName.includes('sidebar') ? '300 × 250 RECTANGLE' : '728 × 90 LEADERBOARD'}
              </span>
            </div>
          </div>
        )}

        {/* Ad Card Content */}
        <div className={`relative group overflow-hidden border p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors ${
          isLight 
            ? 'bg-white border-slate-200 text-slate-900 shadow-lg' 
            : 'bg-[#1E2630] border-slate-700/60 text-white shadow-2xl'
        }`}>
          {/* Subtle Background Glow */}
          <div className="absolute -right-20 -top-20 w-48 h-48 bg-[#E5B868]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center gap-4 z-10 w-full sm:w-auto">
            {displayImageUrl && (
              <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border shrink-0 relative ${
                isLight ? 'border-slate-200 bg-slate-100' : 'border-slate-700 bg-slate-900'
              }`}>
                <img src={displayImageUrl} alt={brandName} className="w-full h-full object-cover" />
                {allImages.length > 1 && (
                  <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[7px] font-mono text-[#E5B868] font-bold border border-[#E5B868]/40">
                    #{activeImageIndex + 1}
                  </span>
                )}
              </div>
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-[#E5B868]/20 border border-[#E5B868]/40 text-[#E5B868] text-[9px] font-mono font-bold uppercase rounded">
                  SPONSORED BY {brandName}
                </span>
                {liveAd.enableRandomRotation && (
                  <span className="px-1.5 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[8px] font-mono font-bold uppercase rounded flex items-center gap-1">
                    <Shuffle className="w-2.5 h-2.5" />
                    Random Rotation
                  </span>
                )}
                <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Ad Slot</span>
              </div>
              <h4 className={`text-sm sm:text-base font-black italic uppercase tracking-tight leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {headline}
              </h4>
              <p className={`text-xs line-clamp-1 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                {subheadline}
              </p>
            </div>
          </div>

          <div className="shrink-0 z-10 w-full sm:w-auto text-right">
            <button className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#E5B868] hover:bg-[#d9a850] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(229,184,104,0.3)] transition-transform active:scale-95">
              <span>{ctaText}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col justify-between overflow-hidden animate-fadeIn">
      
      {/* TOP CONTROL BAR */}
      <div className="bg-[#161C22] border-b border-slate-700/80 px-4 sm:px-6 py-3.5 flex flex-col lg:flex-row items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-start">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#E5B868]/15 border border-[#E5B868]/30 text-[#E5B868]">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white italic uppercase tracking-tight">
                  LIVE SITE PREVIEW STUDIO
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#E5B868]/20 border border-[#E5B868]/40 text-[#E5B868] text-[10px] font-mono font-bold uppercase">
                  {brandName}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Exact live site simulation matching palette, components, and real-time edits.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-xl bg-white/10 text-slate-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Page Switcher Tabs */}
        <div className="flex items-center gap-1.5 bg-[#1E2630] p-1.5 rounded-2xl border border-slate-700/80 overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setSelectedPage('home')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              selectedPage === 'home' ? 'bg-[#E5B868] text-black shadow-[0_0_10px_rgba(229,184,104,0.4)]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Home Page</span>
            {position === 'header-leaderboard' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
          </button>

          <button
            type="button"
            onClick={() => setSelectedPage('events')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              selectedPage === 'events' ? 'bg-[#E5B868] text-black shadow-[0_0_10px_rgba(229,184,104,0.4)]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Events Page</span>
            {position === 'events-top' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
          </button>

          <button
            type="button"
            onClick={() => setSelectedPage('event-detail')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              selectedPage === 'event-detail' ? 'bg-[#E5B868] text-black shadow-[0_0_10px_rgba(229,184,104,0.4)]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Event Details</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedPage('brackets')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              selectedPage === 'brackets' ? 'bg-[#E5B868] text-black shadow-[0_0_10px_rgba(229,184,104,0.4)]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Tournaments</span>
            {position === 'tournament-bracket' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
          </button>

          <button
            type="button"
            onClick={() => setSelectedPage('recruiter')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              selectedPage === 'recruiter' ? 'bg-[#E5B868] text-black shadow-[0_0_10px_rgba(229,184,104,0.4)]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Recruiter Matrix</span>
            {position === 'recruiter-sidebar' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
          </button>
        </div>

        {/* Viewport, Theme and Live Editor Controls */}
        <div className="flex items-center gap-2">
          {/* Live Theme Toggle (Light / Dark to match site) */}
          <button
            type="button"
            onClick={() => setPreviewTheme(prev => prev === 'dark' ? 'light' : 'dark')}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold uppercase flex items-center gap-1.5 cursor-pointer transition-all ${
              previewTheme === 'light' 
                ? 'bg-amber-100 text-amber-900 border-amber-300' 
                : 'bg-[#1E2630] text-slate-300 border-slate-700 hover:text-white'
            }`}
            title="Toggle Live Site Theme Mode (Dark/Light)"
          >
            {previewTheme === 'light' ? <Sun className="w-3.5 h-3.5 text-amber-600" /> : <Moon className="w-3.5 h-3.5 text-[#E5B868]" />}
            <span className="hidden sm:inline">{previewTheme === 'light' ? 'Light Theme' : 'Dark Theme'}</span>
          </button>

          {/* Viewport Switcher */}
          <div className="flex items-center gap-1 bg-[#1E2630] p-1 rounded-xl border border-slate-700/80">
            <button
              type="button"
              onClick={() => setViewport('desktop')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewport === 'desktop' ? 'bg-[#E5B868] text-black' : 'text-slate-400 hover:text-white'}`}
              title="Desktop View (1280px)"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewport('mobile')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewport === 'mobile' ? 'bg-[#E5B868] text-black' : 'text-slate-400 hover:text-white'}`}
              title="Mobile View (375px)"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          {/* Slot outlines toggle */}
          <button
            type="button"
            onClick={() => setShowGuideLines(!showGuideLines)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold uppercase border transition-all flex items-center gap-1.5 cursor-pointer ${
              showGuideLines ? 'bg-[#E5B868]/20 text-[#E5B868] border-[#E5B868]/40' : 'bg-white/5 text-slate-400 border-white/10'
            }`}
            title="Toggle Slot Guidelines"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Slot Focus</span>
          </button>

          {/* Live Editor Side-by-Side Drawer Toggle */}
          <button
            type="button"
            onClick={() => setShowLiveEditorPanel(!showLiveEditorPanel)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase border transition-all flex items-center gap-1.5 cursor-pointer ${
              showLiveEditorPanel 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                : 'bg-white/5 text-slate-300 border-white/10 hover:text-white'
            }`}
            title="Toggle Live Editor Sidebar"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{showLiveEditorPanel ? 'Hide Editor' : 'Live Editor'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="hidden lg:block p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* MAIN STUDIO WORKSPACE (LIVE EDITOR PANEL + LIVE CANVAS) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* SIDEBAR: LIVE INTERACTIVE EDITOR (Updates Canvas Instantly) */}
        {showLiveEditorPanel && (
          <div className="w-80 sm:w-96 border-r border-slate-700/80 bg-[#161C22] p-5 overflow-y-auto shrink-0 space-y-4 shadow-2xl z-20">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#E5B868]" />
                <span className="text-xs font-mono font-black uppercase text-white tracking-wider">Live Real-Time Editor</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Syncing
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1 font-bold">Brand Name</label>
                <input
                  type="text"
                  value={liveAd.brandName || ''}
                  onChange={(e) => handleFieldChange('brandName', e.target.value)}
                  placeholder="e.g. Gatorade, Nike Training"
                  className="w-full px-3 py-2 bg-[#1E2630] border border-slate-700 rounded-xl text-white focus:outline-none focus:border-[#E5B868]"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1 font-bold">Headline</label>
                <input
                  type="text"
                  value={liveAd.headline || ''}
                  onChange={(e) => handleFieldChange('headline', e.target.value)}
                  placeholder="e.g. OFFICIAL RECOVERY PARTNER"
                  className="w-full px-3 py-2 bg-[#1E2630] border border-slate-700 rounded-xl text-white focus:outline-none focus:border-[#E5B868]"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1 font-bold">Subheadline</label>
                <textarea
                  rows={2}
                  value={liveAd.subheadline || ''}
                  onChange={(e) => handleFieldChange('subheadline', e.target.value)}
                  placeholder="e.g. Fuel elite athletic performance with certified hydration."
                  className="w-full px-3 py-2 bg-[#1E2630] border border-slate-700 rounded-xl text-white focus:outline-none focus:border-[#E5B868]"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1 font-bold">CTA Button Text</label>
                <input
                  type="text"
                  value={liveAd.ctaText || ''}
                  onChange={(e) => handleFieldChange('ctaText', e.target.value)}
                  placeholder="e.g. CLAIM EXCLUSIVE DISCOUNT"
                  className="w-full px-3 py-2 bg-[#1E2630] border border-slate-700 rounded-xl text-white focus:outline-none focus:border-[#E5B868]"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1 font-bold">Primary Image URL</label>
                <input
                  type="url"
                  value={liveAd.imageUrl || ''}
                  onChange={(e) => handleFieldChange('imageUrl', e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-[#1E2630] border border-slate-700 rounded-xl text-white focus:outline-none focus:border-[#E5B868]"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1 font-bold">Slot Position Target</label>
                <select
                  value={liveAd.placementPosition || 'header-leaderboard'}
                  onChange={(e) => {
                    const newPos = e.target.value as AdPlacementPosition;
                    handleFieldChange('placementPosition', newPos);
                    if (newPos === 'events-top') setSelectedPage('events');
                    else if (newPos === 'tournament-bracket') setSelectedPage('brackets');
                    else if (newPos === 'recruiter-sidebar') setSelectedPage('recruiter');
                    else setSelectedPage('home');
                  }}
                  className="w-full px-3 py-2 bg-[#1E2630] border border-slate-700 rounded-xl text-white focus:outline-none focus:border-[#E5B868]"
                >
                  <option value="header-leaderboard">Header Leaderboard (Global / Home)</option>
                  <option value="home-feed">Home Feed (Native Feed Card)</option>
                  <option value="events-top">Events Top Banner</option>
                  <option value="tournament-bracket">Tournament Brackets Header</option>
                  <option value="recruiter-sidebar">Recruiter Matrix Sidebar</option>
                </select>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer bg-[#1E2630] p-3 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors">
                  <input
                    type="checkbox"
                    checked={liveAd.enableRandomRotation || false}
                    onChange={(e) => handleFieldChange('enableRandomRotation', e.target.checked)}
                    className="rounded bg-black border-slate-700 text-[#E5B868] focus:ring-[#E5B868]"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-white uppercase block">Random Creative Rotation</span>
                    <span className="text-[10px] text-slate-400">Cycles through all uploaded banners dynamically</span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* CANVAS PREVIEW DISPLAY AREA - Uses exact live site CSS variables and themes */}
        <div className={`flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center items-start transition-colors ${
          isLight ? 'bg-slate-100' : 'bg-[#0F141A]'
        }`}>
          <div className={`transition-all duration-300 w-full ${
            viewport === 'mobile' 
              ? 'max-w-sm border-8 border-slate-800 rounded-[44px] shadow-2xl bg-black p-3 my-4' 
              : 'max-w-6xl'
          }`}>
            
            {/* LIVE SITE INTERFACE REPLICA FRAME */}
            <div className={`border rounded-3xl overflow-hidden shadow-2xl space-y-6 pb-12 transition-colors ${
              isLight 
                ? 'bg-[#F8FAFC] border-slate-200 text-slate-900' 
                : 'bg-[#161C22] border-slate-700/80 text-white'
            }`}>
              
              {/* Real Site Navbar Simulation */}
              <div className={`border-b px-6 py-3.5 flex items-center justify-between transition-colors ${
                isLight 
                  ? 'bg-white/95 border-slate-200 text-slate-900' 
                  : 'bg-[#161C22]/95 border-slate-700/80 text-white'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#E5B868] flex items-center justify-center font-black text-black text-xs shadow-md">
                    J1P
                  </div>
                  <div>
                    <span className="font-black italic text-sm tracking-tight block">JUST1PLAY</span>
                    <span className="text-[9px] font-mono text-[#E5B868] font-bold block uppercase -mt-1">YOUTH ATHLETIC NETWORK</span>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-6 text-xs font-mono font-bold tracking-wider">
                  <span className={selectedPage === 'home' ? 'text-[#E5B868] border-b-2 border-[#E5B868] pb-1' : isLight ? 'text-slate-600' : 'text-slate-400'}>HOME</span>
                  <span className={selectedPage === 'events' || selectedPage === 'event-detail' ? 'text-[#E5B868] border-b-2 border-[#E5B868] pb-1' : isLight ? 'text-slate-600' : 'text-slate-400'}>EVENTS</span>
                  <span className={selectedPage === 'brackets' ? 'text-[#E5B868] border-b-2 border-[#E5B868] pb-1' : isLight ? 'text-slate-600' : 'text-slate-400'}>BRACKETS</span>
                  <span className={selectedPage === 'recruiter' ? 'text-[#E5B868] border-b-2 border-[#E5B868] pb-1' : isLight ? 'text-slate-600' : 'text-slate-400'}>RECRUITER MATRIX</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-mono text-emerald-400 font-bold hidden sm:inline">LIVE NETWORK</span>
                  <div className={`w-7 h-7 rounded-full border flex items-center justify-center font-bold text-xs ${
                    isLight ? 'bg-slate-200 border-slate-300 text-slate-700' : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}>
                    KB
                  </div>
                </div>
              </div>

              {/* PAGE CONTENT SIMULATOR: HOME PAGE */}
              {selectedPage === 'home' && (
                <div className="p-6 space-y-6">
                  {/* Hero Section */}
                  <div className="text-center space-y-2 py-4">
                    <span className="px-3 py-1 rounded-full bg-[#E5B868]/15 border border-[#E5B868]/30 text-[#E5B868] text-[10px] font-mono font-bold uppercase">
                      ATHLETE NETWORK DASHBOARD
                    </span>
                    <h1 className={`text-2xl sm:text-4xl font-black italic uppercase tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      THE NEXT GEN ATHLETE MATRIX
                    </h1>
                    <p className={`text-xs max-w-lg mx-auto ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      Connecting student athletes with collegiate recruiters, real-time scoreboards, and official tournaments nationwide.
                    </p>
                  </div>

                  {/* HEADER LEADERBOARD BANNER SLOT */}
                  <div className="my-4">
                    {renderAdBannerPreview('header-leaderboard')}
                  </div>

                  {/* Content Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { title: 'Live Match Scoreboards', tag: '3 ACTIVE GAMES', icon: Activity },
                      { title: 'Upcoming Showcases', tag: '12 TOURNAMENTS', icon: Trophy },
                      { title: 'D1 College Scouts', tag: 'VERIFIED MATRIX', icon: Award }
                    ].map((card, i) => {
                      const Icon = card.icon;
                      return (
                        <div key={i} className={`p-4 rounded-2xl border space-y-3 transition-colors ${
                          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#1E2630] border-slate-700/80 shadow-md'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-[#E5B868] uppercase">{card.tag}</span>
                            <Icon className="w-4 h-4 text-[#E5B868]" />
                          </div>
                          <div className={`w-full h-24 rounded-xl flex items-center justify-center font-bold text-xs uppercase ${
                            isLight ? 'bg-slate-100 text-slate-600' : 'bg-[#161C22] text-slate-400'
                          }`}>
                            {card.title}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* HOME FEED NATIVE AD SLOT */}
                  <div className="my-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                      <span className="text-xs font-mono font-bold uppercase flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-amber-500" />
                        <span>Live Athlete Feed & Highlights</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">Native Feed Stream</span>
                    </div>
                    {renderAdBannerPreview('home-feed')}
                  </div>
                </div>
              )}

              {/* PAGE CONTENT SIMULATOR: EVENTS PAGE */}
              {selectedPage === 'events' && (
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className={`text-2xl font-black italic uppercase ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        TOURNAMENT & CAMP EVENTS
                      </h1>
                      <p className={`text-xs font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        Discover and register for upcoming showcase events.
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-amber-400/20 text-amber-400 text-xs font-mono font-bold rounded-lg border border-amber-400/30">
                      12 LIVE EVENTS
                    </span>
                  </div>

                  {/* EVENTS TOP BANNER SLOT */}
                  <div className="my-4">
                    {renderAdBannerPreview('events-top')}
                  </div>

                  {/* Mock Event Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { name: 'National Elite Combine 2026', loc: 'Dallas, TX', date: 'AUG 15-18', teams: '32 Teams' },
                      { name: 'Summer Hoop Showcase', loc: 'Newark, NJ', date: 'AUG 22-24', teams: '24 Teams' }
                    ].map((ev, idx) => (
                      <div key={idx} className={`p-5 rounded-2xl border space-y-3 transition-colors ${
                        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#1E2630] border-slate-700/80 shadow-md'
                      }`}>
                        <div className="flex justify-between items-start">
                          <span className={`text-sm font-black uppercase ${isLight ? 'text-slate-900' : 'text-white'}`}>{ev.name}</span>
                          <span className="text-[10px] text-[#E5B868] font-mono font-bold bg-[#E5B868]/10 px-2 py-0.5 rounded border border-[#E5B868]/20">{ev.date}</span>
                        </div>
                        <div className={`flex items-center justify-between text-xs font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                          <span>{ev.loc} • D1 Scouts Attending</span>
                          <span className="text-emerald-400 font-bold">{ev.teams}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PAGE CONTENT SIMULATOR: EVENT DETAIL */}
              {selectedPage === 'event-detail' && (
                <div className="p-6 space-y-6">
                  <div className={`p-6 rounded-3xl border space-y-3 transition-colors ${
                    isLight 
                      ? 'bg-slate-100 border-slate-200' 
                      : 'bg-gradient-to-r from-slate-900 via-[#1E2630] to-black border-slate-700/80'
                  }`}>
                    <span className="px-2.5 py-1 bg-[#E5B868] text-black font-black text-[10px] uppercase rounded-full">
                      OFFICIAL EVENT PAGE
                    </span>
                    <h1 className={`text-2xl sm:text-3xl font-black italic uppercase ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      2026 SOUTHEAST REGIONAL SHOWCASE
                    </h1>
                    <div className={`flex flex-wrap gap-4 text-xs font-mono ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-[#E5B868]" /> ATLANTA, GA</span>
                      <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400" /> SEPT 10, 2026</span>
                      <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-amber-400" /> 128 ATHLETES REGISTERED</span>
                    </div>
                  </div>

                  {/* EVENT SPONSOR BANNER */}
                  <div className="my-4">
                    {renderAdBannerPreview('events-top')}
                  </div>
                </div>
              )}

              {/* PAGE CONTENT SIMULATOR: TOURNAMENT BRACKETS */}
              {selectedPage === 'brackets' && (
                <div className="p-6 space-y-6">
                  <div className="space-y-1">
                    <h1 className={`text-2xl font-black italic uppercase ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      TOURNAMENT BRACKETS MATRIX
                    </h1>
                    <p className={`text-xs font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      Live championship progression and team seeds.
                    </p>
                  </div>

                  {/* TOURNAMENT SPONSOR BANNER */}
                  <div className="my-4">
                    {renderAdBannerPreview('tournament-bracket')}
                  </div>

                  {/* Mock Bracket Visual */}
                  <div className={`grid grid-cols-3 gap-4 p-4 rounded-2xl border text-xs font-mono text-center ${
                    isLight ? 'bg-white border-slate-200' : 'bg-[#1E2630] border-slate-700/80'
                  }`}>
                    <div className="space-y-2">
                      <span className={`block text-[10px] uppercase font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Quarterfinals</span>
                      <div className={`p-2 rounded border ${isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-[#161C22] border-slate-700 text-white'}`}>
                        Eagles (78) vs Tigers (72)
                      </div>
                    </div>
                    <div className="space-y-2">
                      <span className={`block text-[10px] uppercase font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Semifinals</span>
                      <div className={`p-2 rounded border ${isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-[#161C22] border-slate-700 text-white'}`}>
                        Eagles vs TBD
                      </div>
                    </div>
                    <div className="space-y-2">
                      <span className="block text-[10px] uppercase font-bold text-[#E5B868]">Finals</span>
                      <div className="p-2 rounded bg-[#E5B868]/15 border border-[#E5B868]/40 text-[#E5B868] font-bold">
                        Championship Match
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PAGE CONTENT SIMULATOR: RECRUITER MATRIX */}
              {selectedPage === 'recruiter' && (
                <div className="p-6 space-y-6">
                  <div className="space-y-1">
                    <h1 className={`text-2xl font-black italic uppercase ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      RECRUITER ATHLETE MATRIX
                    </h1>
                    <p className={`text-xs font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      Digital scouting cards and verified athletic performance metrics.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    {/* Athlete Cards Column */}
                    <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { name: 'Marcus Vance', pos: 'Point Guard', stats: 'GPA 3.8 • 40yd: 4.42s' },
                        { name: 'Derrick Cole', pos: 'Wide Receiver', stats: 'GPA 3.6 • 40yd: 4.38s' }
                      ].map((ath, i) => (
                        <div key={i} className={`p-4 rounded-2xl border space-y-2 transition-colors ${
                          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#1E2630] border-slate-700/80 shadow-md'
                        }`}>
                          <div className={`w-full h-32 rounded-xl flex items-center justify-center font-bold text-xs uppercase ${
                            isLight ? 'bg-slate-100 text-slate-600' : 'bg-[#161C22] text-slate-400'
                          }`}>
                            {ath.name}
                          </div>
                          <h4 className={`text-xs font-black uppercase ${isLight ? 'text-slate-900' : 'text-white'}`}>{ath.name} ({ath.pos})</h4>
                          <span className="text-[10px] text-[#E5B868] font-mono block font-bold">{ath.stats}</span>
                        </div>
                      ))}
                    </div>

                    {/* RECRUITER SIDEBAR AD SLOT */}
                    <div className="lg:col-span-1 space-y-2">
                      <span className="text-[10px] font-mono text-slate-400 uppercase block font-bold">Sidebar Sponsor Slot</span>
                      {renderAdBannerPreview('recruiter-sidebar')}
                    </div>
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>

      </div>

      {/* FOOTER ACTION BAR */}
      <div className="bg-[#161C22] border-t border-slate-700/80 px-6 py-3.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
          <span>Active Placement: <strong className="text-[#E5B868] uppercase">{position}</strong></span>
          <span>•</span>
          <span className="hidden sm:inline">Theme: <strong className="text-white uppercase">{previewTheme} Mode</strong></span>
          <span>•</span>
          <span>Status: <strong className="text-emerald-400 uppercase">Live Updates Active</strong></span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2.5 rounded-xl bg-[#E5B868] hover:bg-[#d9a850] text-black font-black text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(229,184,104,0.4)] cursor-pointer transition-transform active:scale-95"
        >
          Done Reviewing Preview
        </button>
      </div>

    </div>
  );
};
