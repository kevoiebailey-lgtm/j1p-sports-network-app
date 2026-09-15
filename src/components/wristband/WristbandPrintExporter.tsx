import React, { useState, useEffect } from 'react';
import { Printer, ArrowLeft, Sparkles, Sliders } from 'lucide-react';
import { WristbandSlot, PlayLabPlay } from '../../types/tactics';
import { get12SlotCallSheet } from '../../services/playlabService';
import { useAuth } from '../../context/AuthContext';
import { PlayVectorThumbnail } from '../playlab/CallSheet12Card';
import { CHAMPIONSHIP_12_PLAYS } from '../../data/championship12Plays';

interface WristbandPrintExporterProps {
  teamName?: string;
  selectedPosition?: string;
  slots?: WristbandSlot[];
  onBack?: () => void;
}

export const WristbandPrintExporter: React.FC<WristbandPrintExporterProps> = ({
  teamName = 'Just1Play Varsity',
  selectedPosition = 'ALL',
  onBack,
}) => {
  const { user } = useAuth();
  const [activePos, setActivePos] = useState<string>(selectedPosition);
  const [insertSize, setInsertSize] = useState<'standard' | 'large'>('standard');
  const [liveCallSheetPlays, setLiveCallSheetPlays] = useState<PlayLabPlay[]>([]);
  const [, setIsLoadingLive] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const loadCallSheet = async () => {
      const uid = user?.uid || 'coach';
      setIsLoadingLive(true);
      try {
        const plays = await get12SlotCallSheet(uid);
        if (isMounted && plays.length > 0) {
          setLiveCallSheetPlays(plays);
        }
      } catch (err) {
        console.warn('Could not fetch live 12-slot call sheet for printing:', err);
      } finally {
        if (isMounted) setIsLoadingLive(false);
      }
    };
    loadCallSheet();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Compute 12 plays: use live call sheet if present, otherwise fallback to official championship 12 plays
  const plays: PlayLabPlay[] = Array.from({ length: 12 }, (_, i) => {
    const slotIdx = i + 1;
    const livePlay = liveCallSheetPlays.find((p) => p.slotIndex === slotIdx);
    if (livePlay) return livePlay;
    const officialPlay = CHAMPIONSHIP_12_PLAYS.find((p) => p.slotIndex === slotIdx);
    if (officialPlay) return { ...officialPlay, userId: user?.uid || 'coach' } as PlayLabPlay;
    const fallbackPlay = liveCallSheetPlays[i] || CHAMPIONSHIP_12_PLAYS[i];
    if (fallbackPlay) return { ...fallbackPlay, userId: user?.uid || 'coach' } as PlayLabPlay;
    return {
      id: `slot_${slotIdx}`,
      name: `Play ${slotIdx}`,
      formation: 'Spread',
      format: '5v5',
      slotIndex: slotIdx,
      isPublic: false,
      userId: user?.uid || 'coach',
      createdAt: Date.now(),
      routes: [],
    };
  });

  const handlePrint = () => {
    window.print();
  };

  const isStandard = insertSize === 'standard';

  return (
    <div className="w-full flex flex-col items-center gap-6">
      {/* Top No-Print Control Bar */}
      <div className="no-print w-full flex flex-wrap items-center justify-between gap-4 p-4 bg-[#0B0F19] border border-slate-800 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
              title="Back to PlayLab"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h2 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
              <span>12-Slot Wristband Physical Insert Card</span>
              {liveCallSheetPlays.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold normal-case">
                  <Sparkles className="w-3 h-3" />
                  Synced with Live Call Sheet
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              High-DPI vector diagrams formatted to standard flag football wrist coaches
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Insert Dimensions Toggle */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setInsertSize('standard')}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                isStandard
                  ? 'bg-sky-400 text-black shadow-md shadow-sky-400/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              2.25&quot; × 4.5&quot; (Standard)
            </button>
            <button
              type="button"
              onClick={() => setInsertSize('large')}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                !isStandard
                  ? 'bg-sky-400 text-black shadow-md shadow-sky-400/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              3.5&quot; × 5&quot; (Large Playbook)
            </button>
          </div>

          {/* Position Selector */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {['ALL', 'QB', 'C', 'X', 'H', 'Z'].map((pos) => (
              <button
                key={pos}
                type="button"
                onClick={() => setActivePos(pos)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activePos === pos
                    ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>

          {/* Print Trigger Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-[#00F0D0] text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#00F0D0]/25 hover:bg-[#00d8bc] transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Wristband Card</span>
          </button>
        </div>
      </div>

      {/* Field Glare & DPI Notice */}
      <div className="no-print w-full max-w-4xl flex items-center justify-between text-xs text-neutral-400 bg-neutral-900/60 border border-neutral-800 rounded-xl px-4 py-2">
        <span className="flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-amber-400" />
          High-Contrast Sideline Glare Optimization: Pure vector strokes with dark boundary lines on crisp paper.
        </span>
        <span className="font-mono text-neutral-300">
          Selected Position: <strong className="text-amber-400">{activePos}</strong>
        </span>
      </div>

      {/* Printable 12-Slot Card Container (High DPI Vector Layout) */}
      <div
        id="wristband-printable-area"
        className={`w-full bg-white text-black rounded-xl border-2 border-black shadow-2xl p-2 font-sans select-none overflow-hidden ${
          isStandard ? 'max-w-[580px]' : 'max-w-[680px]'
        }`}
      >
        {/* Card Header */}
        <div className="flex items-center justify-between border-b-2 border-black pb-1 mb-1.5 px-0.5">
          <div className="flex items-center gap-1.5">
            <span className="font-black text-[12px] uppercase tracking-tight text-black">
              {teamName}
            </span>
            <span className="bg-black text-white text-[8.5px] font-mono px-1.5 py-0.2 rounded font-black">
              {activePos === 'ALL' ? 'FULL CALL SHEET' : `POS: ${activePos}`}
            </span>
          </div>
          <span className="text-[8.5px] font-mono font-black text-slate-800">
            JUST1PLAY • {isStandard ? '2.25" × 4.5"' : '3.5" × 5"'} WRIST COACH
          </span>
        </div>

        {/* 12 Slots in 4 Columns x 3 Rows for standard 4.5"x2.25" aspect ratio */}
        <div className="grid grid-cols-4 gap-1.5">
          {plays.map((play, idx) => {
            const slotNum = play.slotIndex || idx + 1;
            const primaryRoute = play.routes?.find((r) => r.isPrimary);
            const athleteRoute = activePos !== 'ALL' ? play.routes?.find((r) => r.player === activePos) : null;

            return (
              <div
                key={`print-slot-${slotNum}-${play.id}`}
                className="border border-black rounded-lg p-1 bg-slate-50 flex flex-col justify-between"
              >
                {/* Slot Top: # and Name + Signal Code */}
                <div className="flex items-center justify-between leading-none mb-1 gap-1">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="w-4 h-4 rounded bg-black text-white flex items-center justify-center text-[9px] font-black font-mono shrink-0">
                      {slotNum}
                    </span>
                    <span className="font-black text-[9.5px] tracking-tight text-black truncate uppercase">
                      {play.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {(play.wristbandCode || play.signalCode) ? (
                      <span className="bg-black text-amber-300 font-mono font-black text-[7.5px] px-1 py-0.5 rounded">
                        {play.wristbandCode || play.signalCode}
                      </span>
                    ) : null}
                    {play.cadence && (
                      <span className="font-mono text-[7.5px] font-bold text-slate-700">
                        {play.cadence}
                      </span>
                    )}
                  </div>
                </div>

                {/* Inline SVG Vector Thumbnail (Razor-Sharp High-DPI Print Mode) */}
                <PlayVectorThumbnail
                  play={play}
                  selectedPosition={activePos}
                  className={`w-full ${isStandard ? 'h-16' : 'h-20'}`}
                  themeMode="print-white"
                  isPrint={true}
                />

                {/* Bottom Meta Bar: Formation / Assignment */}
                <div className="mt-1 flex items-center justify-between text-[7.5px] font-mono text-slate-800 leading-none">
                  <span className="truncate font-semibold">{play.formation}</span>
                  {athleteRoute ? (
                    <span className="font-black text-black bg-amber-200 px-1 rounded truncate max-w-[60px]">
                      {athleteRoute.routeType}
                    </span>
                  ) : primaryRoute ? (
                    <span className="text-slate-600 truncate max-w-[55px]">
                      ★ {primaryRoute.player}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-1.5 pt-0.5 border-t border-slate-400 flex justify-between text-[7px] font-mono text-slate-600 px-0.5">
          <span>JUST1PLAY TELEMETRY SYSTEM</span>
          <span>
            {isStandard ? 'STANDARD INSERT: 2.25" × 4.5"' : 'LARGE INSERT: 3.5" × 5"'} • DPI OPTIMIZED
          </span>
        </div>
      </div>

      {/* Embedded CSS Print Rules for 2.25x4.5 and 3.5x5 Inserts */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .no-print {
            display: none !important;
          }
          #wristband-printable-area, #wristband-printable-area * {
            visibility: visible;
          }
          #wristband-printable-area {
            position: absolute;
            left: 0.2in;
            top: 0.2in;
            width: ${isStandard ? '4.5in' : '5.0in'} !important;
            height: ${isStandard ? '2.25in' : '3.5in'} !important;
            margin: 0 !important;
            padding: 0.08in !important;
            box-shadow: none !important;
            border: 1.5px solid #000 !important;
            page-break-inside: avoid;
            background: #fff !important;
            color: #000 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @page {
            size: auto;
            margin: 0mm;
          }
        }
      `}</style>
    </div>
  );
};
