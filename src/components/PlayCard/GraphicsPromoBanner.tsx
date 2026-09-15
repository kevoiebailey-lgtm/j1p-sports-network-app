import React, { useState } from 'react';
import { 
  Sparkles, 
  Flame, 
  Zap, 
  ArrowRight, 
  ShieldCheck, 
  Layers, 
  Download, 
  Send,
  Radio,
  Sliders
} from 'lucide-react';
import { GraphicStudioModal } from './GraphicStudioModal';
import { SportCategory } from './SportsTemplateEngine';

interface GraphicsPromoBannerProps {
  onOpenStudio?: () => void;
  className?: string;
  defaultSport?: SportCategory;
}

export const GraphicsPromoBanner: React.FC<GraphicsPromoBannerProps> = ({
  onOpenStudio,
  className = '',
  defaultSport = 'Cheer'
}) => {
  const [internalModalOpen, setInternalModalOpen] = useState(false);

  const handleLaunch = () => {
    if (onOpenStudio) {
      onOpenStudio();
    } else {
      setInternalModalOpen(true);
    }
  };

  return (
    <>
      <div 
        id="graphics-promo-banner"
        className={`relative overflow-hidden rounded-3xl border border-[#00F0D0]/30 bg-gradient-to-br from-[#0C1220]/95 via-[#0A0D18]/90 to-[#070A12]/95 backdrop-blur-xl p-5 sm:p-7 shadow-[0_0_35px_-10px_rgba(0,240,208,0.25)] transition-all duration-300 hover:border-[#00F0D0]/60 group ${className}`}
      >
        {/* Background Ambient Glow Circles */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[#00F0D0]/15 blur-3xl pointer-events-none group-hover:bg-[#00F0D0]/25 transition-all" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-[#F59E0B]/10 blur-3xl pointer-events-none group-hover:bg-[#F59E0B]/20 transition-all" />

        {/* Cyber Corner Brackets */}
        <div className="absolute top-2.5 left-2.5 w-3 h-3 border-t-2 border-l-2 border-[#00F0D0]/60 pointer-events-none" />
        <div className="absolute top-2.5 right-2.5 w-3 h-3 border-t-2 border-r-2 border-[#00F0D0]/60 pointer-events-none" />
        <div className="absolute bottom-2.5 left-2.5 w-3 h-3 border-b-2 border-l-2 border-[#00F0D0]/60 pointer-events-none" />
        <div className="absolute bottom-2.5 right-2.5 w-3 h-3 border-b-2 border-r-2 border-[#00F0D0]/60 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          
          {/* Left Content Area */}
          <div className="space-y-2.5 max-w-xl">
            
            {/* HUD Status Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-[#00F0D0]/15 border border-[#00F0D0]/40 text-[#00F0D0] shadow-[0_0_12px_rgba(0,240,208,0.3)]">
                <Radio className="w-3 h-3 animate-pulse" />
                JUST1PLAY GRAPHIC ENGINE
              </span>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-[#F59E0B]/15 border border-[#F59E0B]/40 text-[#F59E0B]">
                <Flame className="w-3 h-3 text-[#F59E0B]" />
                18 Hyper-Futuristic Themes
              </span>
            </div>

            {/* Main Headline */}
            <div>
              <h3 className="text-xl sm:text-2xl font-black uppercase italic tracking-tight text-white flex items-center gap-2 font-sans">
                <span>Athletic Graphic & Play Card Studio</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-1">
                Design custom cyberpunk play cards with live holographic stats, neon trajectory vectors, and instant high-res PNG export or professional graphic request submission.
              </p>
            </div>

            {/* Micro Feature Highlights */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-mono text-slate-400 pt-1">
              <span className="flex items-center gap-1">
                <Layers className="w-3 h-3 text-[#00F0D0]" />
                All 8 Sports Supported
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Download className="w-3 h-3 text-emerald-400" />
                Instant Canvas Export
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Send className="w-3 h-3 text-[#F59E0B]" />
                Direct Production Requests
              </span>
            </div>
          </div>

          {/* Right Action Trigger */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0">
            <button
              id="launch-graphic-studio-btn"
              type="button"
              onClick={handleLaunch}
              className="px-5 sm:px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#00F0D0] to-[#00B8D4] hover:brightness-110 active:scale-[0.98] text-black font-black text-xs font-mono uppercase tracking-wider shadow-[0_0_25px_rgba(0,240,208,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer group/btn"
            >
              <Sparkles className="w-4 h-4 stroke-[2.5] group-hover/btn:rotate-12 transition-transform" />
              <span>Launch Graphic Studio</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5] group-hover/btn:translate-x-0.5 transition-transform" />
            </button>
          </div>

        </div>

        {/* Bottom Sport Tags Ticker */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-slate-400 overflow-x-auto scrollbar-none gap-3">
          <span className="text-slate-500 uppercase shrink-0">Featured Themes:</span>
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300">Cheer Nova Flare</span>
            <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300">Court Matrix 2077</span>
            <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300">Gridiron Apex Tech</span>
            <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300">Quantum Pitch</span>
            <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300">Aero Spike Horizon</span>
            <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300">Sonic Velocity</span>
          </div>
        </div>
      </div>

      {/* Internal Modal if no external handler was supplied */}
      {!onOpenStudio && (
        <GraphicStudioModal 
          isOpen={internalModalOpen}
          onClose={() => setInternalModalOpen(false)}
          initialSport={defaultSport}
        />
      )}
    </>
  );
};

export default GraphicsPromoBanner;
