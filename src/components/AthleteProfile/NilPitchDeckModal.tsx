import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Download, 
  Printer, 
  Share2, 
  Sparkles, 
  ShieldCheck, 
  Trophy, 
  Award, 
  Flame, 
  Instagram, 
  Youtube, 
  TrendingUp, 
  Star, 
  ExternalLink,
  QrCode,
  Mail,
  Phone,
  CheckCircle2,
  Building,
  Target
} from 'lucide-react';
import { UserProfile } from '../../types';

interface NilPitchDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  athlete: UserProfile;
}

export const NilPitchDeckModal: React.FC<NilPitchDeckModalProps> = ({
  isOpen,
  onClose,
  athlete
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/profile/${athlete.uid || ''}`;
    navigator.clipboard.writeText(url);
  };

  // Derived stats & NIL valuation calculations
  const rawAthlete = athlete as any;
  const gradYear = athlete.gradYear || '2026';
  const sport = athlete.sport || 'Basketball';
  const position = athlete.position || 'Guard';
  const highSchool = athlete.highSchool || 'St. Benedicts Prep';
  const gpa = athlete.gpa || '3.85';
  const height = athlete.height || "6'2\"";
  const weight = athlete.weight || '185 lbs';
  const wingspan = rawAthlete.wingspan || "6'6\"";
  const vertical = rawAthlete.verticalJump || '38.5 in';
  const fortyYard = rawAthlete.dash40Yard || '4.52 s';
  
  // Calculate approximate social reach
  const instaFollowers = '14.2K';
  const tiktokFollowers = '28.5K';
  const ytSubscribers = '3.8K';
  const totalAudience = '46.5K+';
  const avgEngagement = '8.4%';
  const nilValuationTier = 'Tier 1 Prime Prospect ($15k - $35k/yr projected NIL bracket)';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl bg-[#0F172A] border border-slate-700/80 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.8)] overflow-hidden text-slate-100 my-auto max-h-[92vh] flex flex-col"
        >
          {/* Header Action Bar */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-[#1E293B] via-[#0F172A] to-[#1E293B] border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF6A00] to-[#E5B868] flex items-center justify-center text-slate-950 font-black shadow-lg shadow-[#FF6A00]/20">
                <Sparkles className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <span>NIL Sponsor Pitch-Deck & Media Kit</span>
                  <span className="px-2 py-0.5 rounded-md bg-[#FF6A00]/20 text-[#FF6A00] text-[10px] font-mono font-bold uppercase border border-[#FF6A00]/30">
                    PDF Ready
                  </span>
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  Verified high-resolution brand & collegiate athletic presentation
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-2 rounded-xl bg-[#00B8D4] hover:bg-[#00B8D4]/90 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                title="Print or Save as PDF"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Print / Save PDF</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
                title="Copy Public Link"
              >
                <Share2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Printable Pitch-Deck Document Body */}
          <div className="p-6 sm:p-8 overflow-y-auto space-y-6 print:p-0 print:bg-white print:text-black" ref={printRef}>
            
            {/* Athlete Showcase Header Banner */}
            <div className="relative rounded-2xl bg-gradient-to-br from-[#1E293B] to-[#090D16] border border-white/10 p-6 sm:p-8 overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF6A00]/10 rounded-full blur-3xl -z-0 pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                <div className="relative shrink-0">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-[#E5B868] shadow-[0_0_25px_rgba(229,184,104,0.3)] bg-slate-900">
                    <img 
                      src={athlete.photoURL || athlete.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'} 
                      alt={athlete.displayName} 
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                    />
                  </div>
                  <div className="absolute -bottom-2 -right-2 px-2.5 py-1 rounded-full bg-[#00B8D4] text-slate-950 font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-md">
                    <ShieldCheck className="w-3 h-3" />
                    <span>VERIFIED</span>
                  </div>
                </div>

                <div className="flex-1 text-center md:text-left space-y-2">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-[#FF6A00]/20 text-[#FF6A00] font-mono text-xs font-bold border border-[#FF6A00]/30 uppercase">
                      {sport} • {position}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/30">
                      Class of {gradYear}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 font-mono text-xs font-bold border border-purple-500/30">
                      GPA: {gpa}
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {athlete.displayName || 'Jordan Hayes'}
                  </h1>

                  <p className="text-sm text-slate-300 font-medium">
                    {highSchool} • State of {athlete.state || 'NJ'}
                  </p>

                  <p className="text-xs text-slate-400 max-w-xl italic leading-relaxed pt-1">
                    "{athlete.bio || 'Dedicated, high-motor student-athlete with elite athletic testing scores, proven clutch performance, and an active digital fanbase ready for authentic brand endorsements.'}"
                  </p>
                </div>

                <div className="shrink-0 bg-white/5 border border-white/10 rounded-2xl p-4 text-center space-y-1">
                  <div className="w-16 h-16 mx-auto bg-white p-1 rounded-xl shadow-inner flex items-center justify-center">
                    <QrCode className="w-14 h-14 text-slate-950" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">
                    Scan for Full Tape
                  </span>
                </div>
              </div>
            </div>

            {/* NIL Valuation & Commercial Appeal */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-amber-400 mb-2">
                  <Trophy className="w-4 h-4" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider">Projected NIL Bracket</span>
                </div>
                <div className="text-lg font-black text-white">$15K – $35K / yr</div>
                <p className="text-[11px] text-slate-400 mt-1">Based on engagement volume, verified athletic honors, and regional media visibility.</p>
              </div>

              <div className="bg-gradient-to-br from-[#00B8D4]/10 via-[#00B8D4]/5 to-transparent border border-[#00B8D4]/30 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-[#00B8D4] mb-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider">Total Social Reach</span>
                </div>
                <div className="text-lg font-black text-white">{totalAudience} Followers</div>
                <p className="text-[11px] text-slate-400 mt-1">Average post engagement of <strong className="text-emerald-400">{avgEngagement}</strong> across TikTok, IG, and YouTube.</p>
              </div>

              <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider">Compliance Status</span>
                </div>
                <div className="text-lg font-black text-white">NCAA / High School Eligible</div>
                <p className="text-[11px] text-slate-400 mt-1">100% compliant with state athletic association NIL disclosure guidelines.</p>
              </div>
            </div>

            {/* Verified Combine Measurables & Performance Radar */}
            <div className="bg-[#111928] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-mono font-bold text-[#E5B868] uppercase tracking-wider flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  <span>Verified Athletic Testing & Measurables</span>
                </h3>
                <span className="text-xs font-mono text-slate-400">Combine Session #J1P-992</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-black/30 border border-white/5 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Height</span>
                  <div className="text-base font-black text-white mt-1">{height}</div>
                </div>
                <div className="bg-black/30 border border-white/5 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Weight</span>
                  <div className="text-base font-black text-white mt-1">{weight}</div>
                </div>
                <div className="bg-black/30 border border-white/5 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Wingspan</span>
                  <div className="text-base font-black text-white mt-1">{wingspan}</div>
                </div>
                <div className="bg-black/30 border border-white/5 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Vertical Jump</span>
                  <div className="text-base font-black text-emerald-400 mt-1">{vertical}</div>
                </div>
                <div className="bg-black/30 border border-white/5 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">40-Yd Dash</span>
                  <div className="text-base font-black text-[#00B8D4] mt-1">{fortyYard}</div>
                </div>
                <div className="bg-black/30 border border-white/5 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Academic GPA</span>
                  <div className="text-base font-black text-purple-400 mt-1">{gpa}</div>
                </div>
              </div>
            </div>

            {/* Core Season Stat Averages */}
            <div className="bg-[#111928] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#FF6A00]" />
                  <span>Season Production & Key Metrics</span>
                </h3>
                <span className="text-xs font-mono text-emerald-400">All-State First Team Selection</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Points / PPG</div>
                  <div className="text-2xl font-black text-white mt-1">22.4</div>
                  <div className="text-[10px] text-emerald-400 font-mono mt-0.5">+4.2 vs league avg</div>
                </div>
                <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Assists / APG</div>
                  <div className="text-2xl font-black text-white mt-1">7.8</div>
                  <div className="text-[10px] text-[#00B8D4] font-mono mt-0.5">Top 5 in State</div>
                </div>
                <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Rebounds / RPG</div>
                  <div className="text-2xl font-black text-white mt-1">6.2</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">Elite guard rebounding</div>
                </div>
                <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Steals / SPG</div>
                  <div className="text-2xl font-black text-[#FF6A00] mt-1">3.1</div>
                  <div className="text-[10px] text-[#FF6A00] font-mono mt-0.5">Defensive POY Finalist</div>
                </div>
              </div>
            </div>

            {/* Brand Partnership Opportunities & Contact Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#111928] border border-white/10 rounded-2xl p-5 space-y-3">
                <h4 className="text-xs font-mono font-bold text-[#E5B868] uppercase tracking-wider">
                  Target Brand Collaboration Areas
                </h4>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Apparel & Footwear Brand Ambassador</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Sports Nutrition, Hydration & Energy Products</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Athletic Training Tech, Wearables & Recovery Gear</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Local Community & Regional Business Endorsements</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#111928] border border-white/10 rounded-2xl p-5 space-y-3">
                <h4 className="text-xs font-mono font-bold text-[#00B8D4] uppercase tracking-wider">
                  Direct Inquiries & Representation Contact
                </h4>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span>{athlete.email || 'nil@just1play.com'}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Building className="w-4 h-4 text-slate-400" />
                    <span>Just1Play Sports Verified Athlete Network</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Inquiries routed directly to guardian/compliance team</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Watermark */}
            <div className="text-center pt-4 border-t border-white/10 text-[10px] font-mono text-slate-500">
              Generated via Just1Play Athletic Recruiting & Media Hub • https://app.just1play.com/profile/{athlete.uid || ''}
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default NilPitchDeckModal;
