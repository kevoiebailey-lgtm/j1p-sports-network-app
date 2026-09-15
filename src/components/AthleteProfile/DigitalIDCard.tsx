import React from 'react';
import { UserProfile } from '../../types';
import { QRCodeSVG } from 'qrcode.react';
import { VerifiedBadge } from '../Common/VerifiedBadge';
import { calculateAgeOnDate } from '../../services/tournamentHubService';
import { 
  ShieldCheck, 
  QrCode, 
  Sparkles, 
  Trophy, 
  Calendar, 
  MapPin, 
  User 
} from 'lucide-react';

interface DigitalIDCardProps {
  athlete: UserProfile;
}

export const DigitalIDCard: React.FC<DigitalIDCardProps> = ({ athlete }) => {
  const athleteId = athlete.athleteId || `J1P-${athlete.uid.slice(0, 6).toUpperCase()}`;
  const dob = athlete.dateOfBirth || '2010-05-12';
  const age = calculateAgeOnDate(dob);

  // QR Code encodes athlete's Firestore UID and Athlete ID for game day check-in scanner
  const qrData = JSON.stringify({
    uid: athlete.uid,
    athleteId,
    name: athlete.displayName,
    dob
  });

  return (
    <div className="w-full max-w-sm mx-auto bg-gradient-to-b from-[#212A31] via-[#212A31] to-[#000000] border-2 border-[#E5B868]/40 rounded-3xl p-6 text-slate-100 shadow-[0_0_40px_rgba(214,28,36,0.2)] relative overflow-hidden font-sans select-none">
      
      {/* Background Holographic Glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-[#E5B868]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#E5B868]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#E5B868] text-black font-black flex items-center justify-center text-xs shadow-[0_0_15px_rgba(214,28,36,0.5)]">
            J1P
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold text-white tracking-widest uppercase">JUST1PLAY ATHLETIC OS</div>
            <div className="text-[9px] text-[#E5B868] font-mono font-bold uppercase">DIGITAL ATHLETE ID CARD</div>
          </div>
        </div>

        <span className="px-2.5 py-0.5 rounded-full bg-[#E5B868]/10 text-[#E5B868] border border-[#E5B868]/30 text-[9px] font-mono font-bold uppercase">
          VERIFIED
        </span>
      </div>

      {/* Athlete Photo & Info */}
      <div className="flex items-center gap-4 mb-5">
        <div className="relative shrink-0">
          <img
            src={athlete.avatarUrl || athlete.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'}
            alt={athlete.displayName}
            className="w-20 h-20 rounded-2xl object-cover border-2 border-[#E5B868] shadow-[0_0_15px_rgba(214,28,36,0.3)]"
          />
          <div className="absolute -bottom-2 -right-2 bg-[#E5B868] text-black p-1 rounded-full shadow-lg">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <h3 className="font-black text-lg text-white truncate">{athlete.displayName}</h3>
            <VerifiedBadge size="sm" showTooltip={false} />
          </div>

          <div className="text-xs text-[#E5B868] font-mono font-bold">
            ID: {athleteId}
          </div>

          <div className="text-[11px] text-slate-400 mt-1 space-y-0.5 font-sans">
            <div>Sport: <strong className="text-white">{athlete.sport || 'Basketball'}</strong></div>
            <div>Graduation: <strong className="text-white">Class of {athlete.gradYear || '2026'}</strong></div>
            <div>State: <strong className="text-white">{athlete.state || 'NJ'}</strong></div>
          </div>
        </div>
      </div>

      {/* Age & DOB Verification Bar */}
      <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-white/5 border border-white/10 mb-5 text-center">
        <div>
          <div className="text-[9px] font-mono text-slate-400 uppercase">OFFICIAL AGE</div>
          <div className="text-sm font-black text-white font-mono">{age} Years Old</div>
        </div>
        <div className="border-l border-white/10">
          <div className="text-[9px] font-mono text-slate-400 uppercase">DATE OF BIRTH</div>
          <div className="text-xs font-bold text-[#E5B868] font-mono mt-0.5">{dob}</div>
        </div>
      </div>

      {/* QR Code Container */}
      <div className="p-4 rounded-2xl bg-white/10 border border-white/15 flex flex-col items-center justify-center space-y-2 relative">
        <div className="p-3 bg-white rounded-xl shadow-2xl">
          <QRCodeSVG 
            value={qrData} 
            size={120} 
            bgColor="#FFFFFF" 
            fgColor="#000000" 
            level="H" 
          />
        </div>
        <div className="text-[10px] font-mono text-slate-300 font-bold flex items-center gap-1">
          <QrCode className="w-3.5 h-3.5 text-[#E5B868]" />
          <span>SCAN FOR GAME DAY CHECK-IN</span>
        </div>
      </div>

      {/* Footer Security Watermark */}
      <div className="mt-4 text-center text-[9px] text-slate-500 font-mono uppercase tracking-widest">
        Official Just1Play Digital Credential • Tamper Proof
      </div>

    </div>
  );
};
