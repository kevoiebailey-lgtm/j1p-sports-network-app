import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Printer, 
  Download, 
  Layers, 
  Check, 
  Sparkles, 
  X, 
  Eye, 
  Sliders, 
  Share2, 
  Palette,
  LayoutGrid
} from 'lucide-react';
import { PlayerNode, SportType } from './types';

interface WristbandGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: PlayerNode[];
  selectedSport: SportType;
  playTitle: string;
  playDescription: string;
}

type WristbandCardSize = '3_play' | '5_play' | '8_play' | 'single_sheet';
type ThemeStyle = 'coach_white' | 'dark_tactical' | 'emerald_classic' | 'navy_pro';

export function WristbandGeneratorModal({
  isOpen,
  onClose,
  players,
  selectedSport,
  playTitle,
  playDescription,
}: WristbandGeneratorModalProps) {
  const [cardSize, setCardSize] = useState<WristbandCardSize>('5_play');
  const [theme, setTheme] = useState<ThemeStyle>('coach_white');
  const [playNumber, setPlayNumber] = useState('101');
  const [personnelGroup, setPersonnelGroup] = useState('11 Personnel');
  const [passProtection, setPassProtection] = useState('Half-Slide Right');
  const [showProgressionText, setShowProgressionText] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const printContainerRef = useRef<HTMLDivElement | null>(null);

  // Offensive player progression breakdown
  const offensivePlayers = players.filter(p => p.role === 'offense');
  const progressionReads = offensivePlayers
    .filter(p => p.progression && p.progression !== 'none')
    .sort((a, b) => {
      const order: Record<string, number> = { '1': 1, '2': 2, '3': 3, '4': 4, 'hot': 5, 'checkdown': 6 };
      return (order[a.progression || ''] || 99) - (order[b.progression || ''] || 99);
    });

  const getProgressionLabel = (p: PlayerNode) => {
    if (p.progression === '1') return `1st Read: ${p.label}`;
    if (p.progression === '2') return `2nd Read: ${p.label}`;
    if (p.progression === '3') return `3rd Read: ${p.label}`;
    if (p.progression === 'hot') return `HOT: ${p.label}`;
    if (p.progression === 'checkdown') return `Checkdown: ${p.label}`;
    return p.label;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    setIsExportingPdf(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({
        orientation: cardSize === 'single_sheet' ? 'portrait' : 'landscape',
        unit: 'in',
        format: cardSize === 'single_sheet' ? 'letter' : [5, 3]
      });

      // Simple, crisp vector PDF generation
      doc.setFillColor(theme === 'dark_tactical' ? 20 : 255, theme === 'dark_tactical' ? 20 : 255, theme === 'dark_tactical' ? 20 : 255);
      doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(theme === 'dark_tactical' ? 255 : 0, theme === 'dark_tactical' ? 255 : 0, theme === 'dark_tactical' ? 255 : 0);
      doc.text(`#${playNumber} - ${playTitle}`, 0.4, 0.5);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(theme === 'dark_tactical' ? 200 : 80, theme === 'dark_tactical' ? 200 : 80, theme === 'dark_tactical' ? 200 : 80);
      doc.text(`Personnel: ${personnelGroup} | Protection: ${passProtection}`, 0.4, 0.75);

      let curY = 1.0;
      if (showProgressionText && progressionReads.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text('Progression Reads:', 0.4, curY);
        curY += 0.2;
        doc.setFont('helvetica', 'normal');
        progressionReads.forEach(p => {
          doc.text(`• ${getProgressionLabel(p)}`, 0.6, curY);
          curY += 0.18;
        });
      }

      doc.save(`wristband_${playTitle.toLowerCase().replace(/\s+/g, '_')}.pdf`);
    } catch (e) {
      console.error('PDF export error:', e);
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-neutral-950 border border-neutral-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-neutral-100">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-neutral-800/80 flex items-center justify-between bg-neutral-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">Coach Wristband & Playbook Sheet Generator</h2>
                <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[11px] font-bold">
                  Print & Field Ready
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Generate high-resolution printable cards for standard wrist coaches and full installation binders.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Bar */}
        <div className="p-3 sm:px-6 bg-neutral-900/40 border-b border-neutral-800/80 flex items-center gap-4 overflow-x-auto no-scrollbar shrink-0 text-xs">
          
          {/* Card Size Selector */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-neutral-400 font-bold uppercase text-[10px]">Layout:</span>
            <div className="flex bg-neutral-900 p-1 rounded-xl border border-neutral-800">
              {(['5_play', '3_play', '8_play', 'single_sheet'] as WristbandCardSize[]).map((size) => (
                <button
                  key={size}
                  onClick={() => setCardSize(size)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    cardSize === size 
                      ? 'bg-sky-500 text-neutral-950 shadow-sm' 
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {size === '5_play' ? '5-Play Wrist' : size === '3_play' ? '3-Play Wrist' : size === '8_play' ? '8-Play Wrist' : 'Full Page Sheet'}
                </button>
              ))}
            </div>
          </div>

          {/* Theme Selector */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-neutral-400 font-bold uppercase text-[10px]">Theme:</span>
            <div className="flex bg-neutral-900 p-1 rounded-xl border border-neutral-800">
              <button
                onClick={() => setTheme('coach_white')}
                className={`px-2 py-1 rounded-lg font-bold text-[11px] ${theme === 'coach_white' ? 'bg-white text-black' : 'text-neutral-400'}`}
              >
                Print White
              </button>
              <button
                onClick={() => setTheme('dark_tactical')}
                className={`px-2 py-1 rounded-lg font-bold text-[11px] ${theme === 'dark_tactical' ? 'bg-neutral-800 text-white' : 'text-neutral-400'}`}
              >
                Dark Pro
              </button>
              <button
                onClick={() => setTheme('emerald_classic')}
                className={`px-2 py-1 rounded-lg font-bold text-[11px] ${theme === 'emerald_classic' ? 'bg-emerald-600 text-white' : 'text-neutral-400'}`}
              >
                Classic Turf
              </button>
            </div>
          </div>

          {/* Quick Config Inputs */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1">
              <span className="text-neutral-400 text-[10px]">Call #:</span>
              <input
                type="text"
                value={playNumber}
                onChange={(e) => setPlayNumber(e.target.value)}
                className="w-14 px-2 py-1 rounded-lg bg-neutral-900 border border-neutral-700 text-white font-mono font-bold text-xs text-center"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-neutral-400 text-[10px]">Pers:</span>
              <input
                type="text"
                value={personnelGroup}
                onChange={(e) => setPersonnelGroup(e.target.value)}
                className="w-24 px-2 py-1 rounded-lg bg-neutral-900 border border-neutral-700 text-white font-bold text-xs"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-neutral-400 text-[10px]">Prot:</span>
              <input
                type="text"
                value={passProtection}
                onChange={(e) => setPassProtection(e.target.value)}
                className="w-28 px-2 py-1 rounded-lg bg-neutral-900 border border-neutral-700 text-white font-bold text-xs"
              />
            </div>
          </div>

        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center bg-neutral-900/30">
          
          {/* Card Preview Container */}
          <div
            ref={printContainerRef}
            className={`w-full transition-all duration-300 rounded-2xl shadow-2xl border ${
              theme === 'coach_white'
                ? 'bg-white text-neutral-900 border-neutral-300'
                : theme === 'emerald_classic'
                ? 'bg-emerald-950 text-white border-emerald-800'
                : 'bg-neutral-900 text-white border-neutral-800'
            } ${
              cardSize === 'single_sheet'
                ? 'max-w-2xl p-6'
                : 'max-w-3xl p-4'
            }`}
          >
            {/* Header / Play Strip */}
            <div className={`flex items-center justify-between pb-3 border-b ${
              theme === 'coach_white' ? 'border-neutral-200' : 'border-white/10'
            }`}>
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-lg font-mono font-black text-sm ${
                  theme === 'coach_white' ? 'bg-black text-white' : 'bg-sky-400 text-black'
                }`}>
                  #{playNumber}
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight leading-none">{playTitle}</h3>
                  <span className="text-[11px] opacity-70 font-semibold mt-0.5 block">
                    {personnelGroup} • {passProtection}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Just1Play System</span>
                <span className="text-xs font-bold block">{selectedSport.replace('_', ' ').toUpperCase()}</span>
              </div>
            </div>

            {/* Grid / Tactical Diagram Area */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 py-3 items-center">
              
              {/* Field SVG Display */}
              <div className="md:col-span-7">
                <div className={`relative aspect-[16/10] rounded-xl overflow-hidden border ${
                  theme === 'coach_white' ? 'bg-[#f4f7f4] border-neutral-300' : 'bg-[#0b1610] border-white/10'
                }`}>
                  <svg viewBox="0 0 800 500" className="w-full h-full">
                    {/* Subtle grid lines */}
                    <g stroke={theme === 'coach_white' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'} strokeWidth="1">
                      <line x1="0" y1="100" x2="800" y2="100" />
                      <line x1="0" y1="200" x2="800" y2="200" />
                      <line x1="0" y1="300" x2="800" y2="300" />
                      <line x1="0" y1="400" x2="800" y2="400" />
                      <line x1="0" y1="350" x2="800" y2="350" stroke={theme === 'coach_white' ? '#0284c7' : '#38bdf8'} strokeWidth="1.5" strokeDasharray="4 4" />
                    </g>

                    {/* Offensive Player Routes */}
                    {offensivePlayers.map((p) => {
                      if (!p.route || p.route.length === 0) return null;
                      const pts = [{ x: p.x, y: p.y }, ...p.route];
                      const d = `M ${pts.map(pt => `${pt.x},${pt.y}`).join(' L ')}`;
                      const endPt = p.route[p.route.length - 1];

                      return (
                        <g key={p.id}>
                          <path
                            d={d}
                            fill="none"
                            stroke={theme === 'coach_white' ? '#0f766e' : '#10b981'}
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle cx={endPt.x} cy={endPt.y} r="5" fill={theme === 'coach_white' ? '#0f766e' : '#10b981'} />
                          
                          {/* Progression Badge at route end */}
                          {p.progression && p.progression !== 'none' && (
                            <g transform={`translate(${endPt.x}, ${endPt.y - 12})`}>
                              <circle r="8" fill={theme === 'coach_white' ? '#000' : '#38bdf8'} />
                              <text textAnchor="middle" dy="3" fill={theme === 'coach_white' ? '#fff' : '#000'} fontSize="8" fontWeight="black">
                                {p.progression === 'hot' ? '⚡' : p.progression}
                              </text>
                            </g>
                          )}
                        </g>
                      );
                    })}

                    {/* Offensive Player Tokens */}
                    {offensivePlayers.map((p) => (
                      <g key={`player-${p.id}`} transform={`translate(${p.x},${p.y})`}>
                        <circle r="13" fill={theme === 'coach_white' ? '#000' : '#10b981'} stroke="#fff" strokeWidth="1.5" />
                        <text textAnchor="middle" dy="4" fill="#fff" fontSize="9" fontWeight="900">
                          {p.label}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              </div>

              {/* Progression & Assignment Legend */}
              <div className="md:col-span-5 flex flex-col justify-center space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider opacity-70">
                  Read Progression & Timing
                </span>

                <div className="space-y-1.5">
                  {progressionReads.length > 0 ? (
                    progressionReads.map((p, idx) => (
                      <div
                        key={p.id}
                        className={`px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs font-bold border ${
                          theme === 'coach_white' 
                            ? 'bg-neutral-100 border-neutral-200 text-neutral-900' 
                            : 'bg-white/5 border-white/10 text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black ${
                            p.progression === '1'
                              ? 'bg-emerald-500 text-black'
                              : p.progression === '2'
                              ? 'bg-sky-400 text-black'
                              : p.progression === 'hot'
                              ? 'bg-rose-500 text-white'
                              : 'bg-amber-400 text-black'
                          }`}>
                            {p.progression === 'hot' ? '⚡' : p.progression}
                          </span>
                          <span>{p.label}</span>
                        </div>
                        <span className="text-[10px] opacity-70">
                          {p.progression === '1' ? 'Primary' : p.progression === '2' ? 'High-Low' : p.progression === 'hot' ? 'Hot Blitz' : 'Release'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs opacity-60 italic py-2">
                      Assign progression reads to receivers in the chalkboard to populate timing queue.
                    </div>
                  )}
                </div>

                {playDescription && (
                  <div className={`p-2 rounded-lg text-[10px] mt-2 opacity-80 border ${
                    theme === 'coach_white' ? 'bg-neutral-50 border-neutral-200' : 'bg-white/5 border-white/10'
                  }`}>
                    {playDescription}
                  </div>
                )}
              </div>

            </div>

            {/* Wrist Coach Insert Size Dimensions Indicator */}
            <div className={`pt-2 border-t flex items-center justify-between text-[10px] opacity-50 ${
              theme === 'coach_white' ? 'border-neutral-200' : 'border-white/10'
            }`}>
              <span>Standard Insert Size: {cardSize === '3_play' ? '3.5" x 2.25"' : cardSize === '5_play' ? '5.0" x 3.0"' : 'Letter Fit'}</span>
              <span>Coach Tag: {passProtection}</span>
            </div>

          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-neutral-800/80 bg-neutral-900/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <Sparkles className="w-4 h-4 text-sky-400" />
            <span>Ready for field wrist coaches, laminators, or coach binder inserts.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition-all flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print Card</span>
            </button>

            <button
              onClick={handleExportPDF}
              disabled={isExportingPdf}
              className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-neutral-950 font-black text-xs transition-all shadow-md shadow-sky-950 flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExportingPdf ? 'Generating PDF...' : 'Download Vector PDF'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
