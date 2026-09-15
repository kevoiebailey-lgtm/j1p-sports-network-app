import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export interface DigitalPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  athlete: {
    id: string;
    displayName: string;
    teamName: string;
    jerseyNumber: number | string;
    sport?: string;
  };
}

export const DigitalPassModal: React.FC<DigitalPassModalProps> = ({
  isOpen,
  onClose,
  athlete
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-[#0f172a] border border-slate-700/80 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center relative overflow-hidden"
        >
          {/* Subtle Cyber Glow Accents */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#00F5D4]/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#00B8D4]/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex justify-between items-center pb-2 border-b border-slate-800 relative z-10">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <ShieldCheck className="w-4 h-4 text-[#00F5D4]" />
              Official Tournament Pass
            </span>
            <button 
              onClick={onClose} 
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 bg-white rounded-2xl flex items-center justify-center mx-auto w-48 h-48 shadow-2xl border-4 border-[#00F5D4]/20 relative z-10">
            <QRCodeSVG 
              value={`JUST1PLAY-ATHLETE-${athlete.id}-${athlete.displayName}`}
              size={160}
              level="H"
            />
          </div>

          <div className="space-y-1 relative z-10">
            <h3 className="font-black text-lg text-white">{athlete.displayName}</h3>
            <p className="text-xs text-[#00F5D4] font-bold font-mono">
              {athlete.teamName} • #{athlete.jerseyNumber}
            </p>
            <p className="text-[11px] text-slate-400">
              Scan at Court Check-In Table or by College Scout
            </p>
          </div>

          <div className="pt-2 relative z-10">
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-xs text-white transition-all cursor-pointer"
            >
              Close Pass
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DigitalPassModal;
