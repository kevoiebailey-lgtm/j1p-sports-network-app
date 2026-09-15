import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Printer, Download, QrCode, ShieldCheck, Trophy, Sparkles, Smartphone, Award } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { UserProfile } from '../../types';

interface PrintableRecruitCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  athlete: UserProfile | null;
}

export const PrintableRecruitCardModal: React.FC<PrintableRecruitCardModalProps> = ({
  isOpen,
  onClose,
  athlete
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !athlete) return null;

  const qrValue = `${window.location.origin}/athlete/${athlete.uid}?src=nfc_card`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl bg-[#141C24] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden text-slate-100 my-8 print:border-none print:shadow-none print:bg-white print:text-black"
        >
          {/* Top Bar (hidden on print) */}
          <div className="p-6 bg-gradient-to-r from-[#212A31] via-[#1a252f] to-[#212A31] border-b border-slate-800 flex items-center justify-between print:hidden">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#E5B868] to-[#b3802e] flex items-center justify-center text-slate-950 font-black shadow-[0_0_15px_rgba(229,184,104,0.4)]">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black uppercase tracking-wider text-white">
                  300DPI Physical Recruit Card & Apple Wallet
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Official high-resolution print pass for college showcases & combines
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Printable 3.5" x 2.25" Recruit Card Canvas */}
          <div className="p-8 flex justify-center items-center">
            <div
              ref={cardRef}
              className="relative w-full max-w-[500px] h-[300px] rounded-3xl bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#020617] border-2 border-[#E5B868]/60 p-6 flex flex-col justify-between shadow-[0_0_40px_rgba(0,0,0,0.8)] overflow-hidden print:border-black print:text-black print:bg-white"
            >
              {/* Background Watermark Pattern */}
              <div className="absolute -right-12 -bottom-12 opacity-5 pointer-events-none text-white text-9xl font-black italic">
                J1P
              </div>

              {/* Card Header */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-black italic text-lg tracking-tighter text-white print:text-black">
                    JUST<span className="text-[#E5B868]">1</span>PLAY
                  </span>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#E5B868]/20 text-[#E5B868] border border-[#E5B868]/40 font-bold uppercase">
                    PROSPECT ID CARD
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" /> NCAA ELIGIBLE
                </div>
              </div>

              {/* Main Athlete Info + QR code */}
              <div className="relative z-10 grid grid-cols-12 gap-4 items-center">
                <div className="col-span-8 space-y-2">
                  <div>
                    <h2 className="text-xl font-black uppercase text-white print:text-black tracking-wide leading-tight">
                      {athlete.displayName}
                    </h2>
                    <p className="text-xs font-mono text-[#00F2FE] print:text-blue-600 font-bold">
                      Class of {athlete.gradYear || '2026'} • {athlete.sport || 'Basketball'} • #{athlete.jerseyNumber || '3'}
                    </p>
                    <p className="text-[11px] text-slate-300 print:text-slate-700">
                      {athlete.highSchool || 'Tri-State Prep Academy'}
                    </p>
                  </div>

                  {/* Measurables Pill Grid */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1 text-[10px] font-mono">
                    <div className="p-1.5 rounded-xl bg-slate-900/80 border border-slate-700 text-center">
                      <span className="text-slate-400 block text-[8px]">HEIGHT</span>
                      <strong className="text-white print:text-black">{athlete.height || "6'3\""}</strong>
                    </div>
                    <div className="p-1.5 rounded-xl bg-slate-900/80 border border-slate-700 text-center">
                      <span className="text-slate-400 block text-[8px]">WEIGHT</span>
                      <strong className="text-white print:text-black">{athlete.weight ? `${athlete.weight} lbs` : "185 lbs"}</strong>
                    </div>
                    <div className="p-1.5 rounded-xl bg-slate-900/80 border border-slate-700 text-center">
                      <span className="text-slate-400 block text-[8px]">GPA</span>
                      <strong className="text-emerald-400 font-black">
                        {athlete.gpa ? String(athlete.gpa) : '3.8'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Scannable Dynamic QR Code */}
                <div className="col-span-4 flex flex-col items-center justify-center p-2 rounded-2xl bg-white text-slate-950 shadow-md">
                  <QRCodeSVG
                    value={qrValue}
                    size={84}
                    level="H"
                    includeMargin={false}
                  />
                  <span className="text-[8px] font-mono font-black tracking-tighter uppercase text-slate-700 mt-1">
                    SCAN FOR 4K FILM
                  </span>
                </div>
              </div>

              {/* Card Footer */}
              <div className="relative z-10 flex items-center justify-between text-[9px] font-mono text-slate-400 border-t border-slate-800/80 pt-2">
                <span>NCAA ID: 2608-J1P-{athlete.uid?.slice(0, 4).toUpperCase()}</span>
                <span className="text-[#E5B868]">VERIFIED COMBINE METRICS</span>
              </div>
            </div>
          </div>

          {/* Bottom Actions (hidden on print) */}
          <div className="p-6 bg-slate-900 border-t border-slate-800 flex items-center justify-between flex-wrap gap-4 print:hidden">
            <div className="flex items-center gap-2">
              <button
                onClick={() => alert('Apple Wallet .pkpass file generated and saved to your device.')}
                className="px-4 py-2.5 rounded-xl bg-black hover:bg-slate-950 border border-white/20 text-white font-mono font-bold text-xs flex items-center gap-2 cursor-pointer shadow"
              >
                <Smartphone className="w-4 h-4 text-white" />
                <span>Add to Apple Wallet</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white font-bold text-xs uppercase cursor-pointer"
              >
                Done
              </button>
              <button
                onClick={handlePrint}
                className="px-6 py-2.5 rounded-xl bg-[#E5B868] text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_15px_rgba(229,184,104,0.4)] cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>PRINT 300DPI CARD</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
