import React from 'react';
import { UserProfile } from '../../types';
import { ShieldCheck, X, QrCode, Sparkles, CheckCircle2, Copy, Download, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DigitalIDPassModalProps {
  athlete: UserProfile | null;
  onClose: () => void;
}

export const DigitalIDPassModal: React.FC<DigitalIDPassModalProps> = ({ athlete, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!athlete) return null;

  const verificationCode = `J1P-NCAA-${(athlete.uid || 'ATHLETE').toUpperCase()}-${athlete.gradYear || '2026'}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(verificationCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#212A31]/85 backdrop-blur-2xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-md bg-[#212A31]/95 border border-[#E5B868]/40 rounded-3xl p-6 sm:p-7 shadow-[0_0_50px_rgba(214,28,36,0.25)] text-white backdrop-blur-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Neon background ambient */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#E5B868]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header Badge */}
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2.5 py-1 rounded-md bg-[#E5B868] text-black font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-[0_0_12px_rgba(214,28,36,0.5)]">
              <ShieldCheck className="w-3.5 h-3.5 fill-black" />
              OFFICIAL EVENT CHECK-IN PASS
            </span>
          </div>

          {/* Athlete Info Header */}
          <div className="flex items-center gap-4 p-3 rounded-2xl bg-[#212A31]/80 border border-slate-800 mb-6">
            <img
              src={athlete.avatarUrl || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=300&auto=format&fit=crop&q=80'}
              alt={athlete.displayName}
              className="w-14 h-14 rounded-xl object-cover border border-[#E5B868]/60 shadow-[0_0_15px_rgba(214,28,36,0.3)] shrink-0"
            />
            <div className="overflow-hidden">
              <h3 className="text-lg font-black uppercase italic tracking-tight text-white truncate flex items-center gap-1.5">
                <span>{athlete.displayName}</span>
                <CheckCircle2 className="w-4 h-4 text-[#E5B868] shrink-0" />
              </h3>
              <p className="text-xs text-slate-300 font-bold">
                {athlete.sport} • {athlete.position} • CLASS OF {athlete.gradYear}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {athlete.highSchool} ({athlete.state})
              </p>
            </div>
          </div>

          {/* QR Code Graphic Box */}
          <div className="bg-white p-6 rounded-2xl flex flex-col items-center justify-center shadow-inner relative group border-2 border-[#E5B868]">
            {/* Standard high-contrast SVG QR Code visual */}
            <div className="w-48 h-48 bg-white flex flex-col items-center justify-center relative">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* QR Code Corners */}
                <rect x="5" y="5" width="25" height="25" fill="#212A31" />
                <rect x="9" y="9" width="17" height="17" fill="#ffffff" />
                <rect x="13" y="13" width="9" height="9" fill="#E5B868" />

                <rect x="70" y="5" width="25" height="25" fill="#212A31" />
                <rect x="74" y="9" width="17" height="17" fill="#ffffff" />
                <rect x="78" y="13" width="9" height="9" fill="#E5B868" />

                <rect x="5" y="70" width="25" height="25" fill="#212A31" />
                <rect x="9" y="74" width="17" height="17" fill="#ffffff" />
                <rect x="13" y="78" width="9" height="9" fill="#E5B868" />

                {/* Simulated Data Matrix Modules */}
                <rect x="35" y="5" width="6" height="6" fill="#212A31" />
                <rect x="45" y="5" width="6" height="6" fill="#212A31" />
                <rect x="55" y="5" width="6" height="6" fill="#212A31" />
                <rect x="35" y="15" width="6" height="6" fill="#212A31" />
                <rect x="50" y="15" width="6" height="6" fill="#212A31" />
                <rect x="35" y="25" width="6" height="6" fill="#212A31" />
                <rect x="45" y="25" width="6" height="6" fill="#212A31" />

                <rect x="5" y="35" width="6" height="6" fill="#212A31" />
                <rect x="15" y="35" width="6" height="6" fill="#212A31" />
                <rect x="25" y="35" width="6" height="6" fill="#212A31" />
                <rect x="5" y="45" width="6" height="6" fill="#212A31" />
                <rect x="20" y="45" width="6" height="6" fill="#212A31" />

                <rect x="35" y="35" width="30" height="30" fill="#212A31" rx="4" />
                <circle cx="50" cy="50" r="8" fill="#E5B868" />

                <rect x="70" y="35" width="6" height="6" fill="#212A31" />
                <rect x="80" y="35" width="6" height="6" fill="#212A31" />
                <rect x="90" y="35" width="6" height="6" fill="#212A31" />
                <rect x="75" y="45" width="6" height="6" fill="#212A31" />
                <rect x="85" y="45" width="6" height="6" fill="#212A31" />

                <rect x="35" y="70" width="6" height="6" fill="#212A31" />
                <rect x="50" y="70" width="6" height="6" fill="#212A31" />
                <rect x="60" y="70" width="6" height="6" fill="#212A31" />
                <rect x="75" y="70" width="6" height="6" fill="#212A31" />
                <rect x="85" y="70" width="6" height="6" fill="#212A31" />
                <rect x="40" y="80" width="6" height="6" fill="#212A31" />
                <rect x="55" y="80" width="6" height="6" fill="#212A31" />
                <rect x="70" y="80" width="6" height="6" fill="#212A31" />
                <rect x="80" y="85" width="6" height="6" fill="#212A31" />
                <rect x="90" y="85" width="6" height="6" fill="#212A31" />
              </svg>
            </div>

            <p className="mt-2 text-[10px] font-mono font-bold text-slate-800 tracking-wider">
              SCAN AT SCOUT & COMBINE DESK
            </p>
          </div>

          {/* Verification Code Strip */}
          <div className="mt-4 p-3 rounded-2xl bg-[#212A31] border border-slate-800 flex items-center justify-between">
            <div className="overflow-hidden">
              <span className="text-[9px] font-mono font-bold text-slate-400 uppercase block">
                VERIFICATION ID CODE
              </span>
              <span className="text-xs font-mono font-black text-[#E5B868] truncate block">
                {verificationCode}
              </span>
            </div>

            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 border border-slate-700"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#E5B868]" />
                  <span className="text-[#E5B868]">COPIED</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-300" />
                  <span>COPY</span>
                </>
              )}
            </button>
          </div>

          {/* Bottom Security Info */}
          <div className="mt-5 text-center text-[10px] text-slate-400 font-mono">
            Just1Play NCAA Verified Check-In System • Powered by Cyber-Athletic ID
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
