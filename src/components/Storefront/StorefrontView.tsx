import React, { useState } from 'react';
import { 
  Trophy, 
  Calendar, 
  Users, 
  Flame, 
  Camera, 
  Zap, 
  Shield, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  MapPin, 
  CreditCard, 
  Play, 
  Star,
  MessageSquare,
  HelpCircle,
  FileText,
  Mail,
  Phone,
  Globe,
  Radio,
  Clock
} from 'lucide-react';
import { BentoCard } from '../BentoCard';
import { MediaBookingCalculator } from './MediaBookingCalculator';
import { FaqSection } from './FaqSection';
import { AdvertiseWithUsView } from './AdvertiseWithUsView';
import { MainTab } from '../../types';
import { BrandLogo } from '../Common/BrandLogo';

interface StorefrontViewProps {
  initialSubPage?: string;
  onLaunchApp: (tab?: MainTab) => void;
}

export const StorefrontView: React.FC<StorefrontViewProps> = ({ 
  initialSubPage = 'landing',
  onLaunchApp 
}) => {
  const [activeSubPage, setActiveSubPage] = useState<string>(initialSubPage);

  // Synchronize if prop changes
  React.useEffect(() => {
    if (initialSubPage) setActiveSubPage(initialSubPage);
  }, [initialSubPage]);

  return (
    <div className="space-y-8 pb-16 text-slate-100">
      
      {/* Storefront Sub-Navigation Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 p-2 rounded-2xl bg-black/80 border border-white/15 backdrop-blur-xl">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveSubPage('landing')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs uppercase transition-all ${
              activeSubPage === 'landing'
                ? 'bg-[#E5B868] text-black shadow-[0_0_12px_rgba(214,28,36,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Home / Storefront
          </button>
          <button
            onClick={() => setActiveSubPage('about')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs uppercase transition-all ${
              activeSubPage === 'about'
                ? 'bg-[#E5B868] text-black shadow-[0_0_12px_rgba(214,28,36,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            About Us
          </button>
          <button
            onClick={() => setActiveSubPage('pricing')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs uppercase transition-all ${
              activeSubPage === 'pricing'
                ? 'bg-[#E5B868] text-black shadow-[0_0_12px_rgba(214,28,36,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Pricing & Booking
          </button>
          <button
            onClick={() => setActiveSubPage('advertise')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs uppercase transition-all ${
              activeSubPage === 'advertise'
                ? 'bg-[#E5B868] text-black shadow-[0_0_12px_rgba(214,28,36,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            📢 Advertise
          </button>
          <button
            onClick={() => setActiveSubPage('contact')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs uppercase transition-all ${
              activeSubPage === 'contact'
                ? 'bg-[#E5B868] text-black shadow-[0_0_12px_rgba(214,28,36,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Contact
          </button>
          <button
            onClick={() => setActiveSubPage('faq')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs uppercase transition-all ${
              activeSubPage === 'faq'
                ? 'bg-[#E5B868] text-black shadow-[0_0_12px_rgba(214,28,36,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            FAQ
          </button>
          <button
            onClick={() => setActiveSubPage('terms')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs uppercase transition-all ${
              activeSubPage === 'terms'
                ? 'bg-[#E5B868] text-black shadow-[0_0_12px_rgba(214,28,36,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Terms & Privacy
          </button>
        </div>

        <button
          onClick={() => onLaunchApp('home')}
          className="px-4 py-2 rounded-xl bg-[#E5B868] hover:bg-[#B8141B] text-black font-black text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(214,28,36,0.4)] transition-all flex items-center gap-2 cursor-pointer ml-auto"
        >
          <span>Launch Application Engine</span>
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      {/* SUBPAGE 1: LANDING STOREFRONT */}
      {activeSubPage === 'landing' && (
        <div className="space-y-12">
          
          {/* Main Hero Banner */}
          <div className="relative rounded-3xl bg-[#050505] border-2 border-[#E5B868]/50 p-8 sm:p-12 text-center overflow-hidden shadow-2xl backdrop-blur-2xl">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#E5B868]/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 max-w-3xl mx-auto space-y-6">
              {/* Official JUST1PLAY Brand Logo Crest */}
              <div className="flex justify-center pb-2">
                <BrandLogo size="xl" layout="vertical" showTagline={true} />
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E5B868]/10 border border-[#E5B868]/40 text-[#E5B868] text-xs font-mono font-bold uppercase tracking-widest">
                <Sparkles className="w-4 h-4" />
                <span>TRI-STATE STANDALONE SPORTS RECRUITING PLATFORM</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black italic uppercase tracking-tight text-white leading-none">
                ELEVATE YOUR GAME TO THE <span className="text-[#E5B868] shadow-[0_0_20px_#E5B868]">PRO MATRIX.</span>
              </h1>

              <p className="text-sm sm:text-base text-slate-300 font-medium max-w-2xl mx-auto leading-relaxed">
                The official standalone platform for Tri-State youth, high school, and prep athletics. Host live tournament brackets, verified athlete profiles, scout evaluations, and book 4K videographers.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                <button
                  onClick={() => onLaunchApp('events')}
                  className="px-8 py-4 rounded-2xl bg-[#E5B868] hover:bg-[#B8141B] text-black font-black text-sm uppercase tracking-wider shadow-[0_0_30px_rgba(214,28,36,0.5)] transition-all transform hover:scale-[1.03] flex items-center gap-2 cursor-pointer"
                >
                  <Trophy className="w-5 h-5 stroke-[2.5]" />
                  <span>VIEW LIVE TOURNAMENTS & BRACKETS</span>
                </button>

                <button
                  onClick={() => setActiveSubPage('pricing')}
                  className="px-8 py-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 hover:border-[#E5B868] text-white font-bold text-sm uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Camera className="w-5 h-5 text-[#E5B868]" />
                  <span>BOOK MEDIA CREW</span>
                </button>
              </div>
            </div>
          </div>

          {/* Key Capabilities Bento Grid */}
          <div className="space-y-4">
            <h2 className="text-xl font-black italic uppercase tracking-tight text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#E5B868]" />
              <span>THE JUST1PLAY CORE CAPABILITIES</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <BentoCard glow className="bg-black/90 border border-white/15 p-6 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#E5B868]/10 border border-[#E5B868]/40 flex items-center justify-center text-[#E5B868]">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-white uppercase italic">Zorts-Style Live Brackets</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Real-time double elimination tournament bracket progression, live court assignment notifications, and official referee score consoles.
                </p>
                <button
                  onClick={() => onLaunchApp('events')}
                  className="text-xs font-black text-[#E5B868] hover:underline flex items-center gap-1 pt-2"
                >
                  <span>EXPLORE EVENTS</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </BentoCard>

              <BentoCard glow className="bg-black/90 border border-white/15 p-6 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-700/10 border border-[#E5B868]/40 flex items-center justify-center text-slate-300">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-white uppercase italic">Scout & Recruiter Matrix</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  College recruiters and scouts evaluate verified player stats, height/weight combine metrics, academics, and embedded Hudl/YouTube highlights.
                </p>
                <button
                  onClick={() => onLaunchApp('athletes')}
                  className="text-xs font-black text-slate-300 hover:underline flex items-center gap-1 pt-2"
                >
                  <span>SEARCH ATHLETES</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </BentoCard>

              <BentoCard glow className="bg-black/90 border border-white/15 p-6 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/40 flex items-center justify-center text-rose-400">
                  <Camera className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-white uppercase italic">Media & Travel Bookings</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Book professional videographers and mixtape editors. Includes automatic NJ vs Out-of-State ($150) travel fee calculation with PayPal payments.
                </p>
                <button
                  onClick={() => setActiveSubPage('pricing')}
                  className="text-xs font-black text-rose-400 hover:underline flex items-center gap-1 pt-2"
                >
                  <span>BOOK MEDIA CREW</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </BentoCard>

            </div>
          </div>

          {/* Media Quote Calculator Preview Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black italic uppercase tracking-tight text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-[#E5B868]" />
                <span>INSTANT MEDIA COVERAGE CALCULATOR</span>
              </h2>
              <span className="text-xs font-mono text-[#E5B868] font-bold">50% Deposit via PayPal</span>
            </div>

            <MediaBookingCalculator />
          </div>

        </div>
      )}

      {/* SUBPAGE 2: ABOUT US */}
      {activeSubPage === 'about' && (
        <div className="max-w-4xl mx-auto space-y-8">
          <BentoCard glow className="bg-black border border-white/15 p-8 space-y-6">
            <div className="space-y-2 border-b border-white/10 pb-4">
              <span className="text-xs font-mono text-[#E5B868] font-bold uppercase tracking-widest">ABOUT JUST1PLAY</span>
              <h1 className="text-3xl font-black italic uppercase text-white">Empowering Tri-State Athletes & Recruits</h1>
            </div>

            <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
              <p>
                Just1Play (just1play.com) is the premier standalone sports technology platform serving youth, high school, and prep athletes across New Jersey, New York, and Pennsylvania.
              </p>
              <p>
                Founded by former collegiate athletes and sports media directors, Just1Play bridges the gap between grassroots athletic events and high-level college recruitment. We provide real-time tournament software, verified digital passes, and on-demand media production.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                <div className="text-2xl font-black text-[#E5B868] font-mono">10,000+</div>
                <div className="text-xs text-slate-400 uppercase font-bold mt-1">Verified Athletes</div>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                <div className="text-2xl font-black text-[#E5B868] font-mono">250+</div>
                <div className="text-xs text-slate-400 uppercase font-bold mt-1">Tournaments Hosted</div>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                <div className="text-2xl font-black text-[#E5B868] font-mono">100%</div>
                <div className="text-xs text-slate-400 uppercase font-bold mt-1">Standalone Platform</div>
              </div>
            </div>
          </BentoCard>
        </div>
      )}

      {/* SUBPAGE 3: PRICING & MEDIA */}
      {activeSubPage === 'pricing' && (
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black italic uppercase text-white">Transparent Pricing & Media Rates</h1>
            <p className="text-xs text-slate-400 font-mono">No hidden fees. Upfront deposit calculation with PayPal processing.</p>
          </div>

          <MediaBookingCalculator />
        </div>
      )}

      {/* SUBPAGE 4: CONTACT */}
      {activeSubPage === 'contact' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <BentoCard glow className="bg-black border border-white/15 p-8 space-y-6">
            <div className="space-y-2 border-b border-white/10 pb-4">
              <span className="text-xs font-mono text-[#E5B868] font-bold uppercase tracking-widest">OFFICIAL EXECUTIVE & OPERATIONS CONTACT</span>
              <h1 className="text-3xl font-black italic uppercase text-white">Get In Touch With Just1Play</h1>
              <p className="text-xs text-slate-400 font-medium">Direct communication for tournament directors, high school athletic directors, coaches, athletes, and sponsors.</p>
            </div>

            {/* Primary Executive Card */}
            <div className="p-5 rounded-2xl bg-[#081342]/80 border border-[#568BDD]/30 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#DFAE1D]/20 border border-[#DFAE1D]/40 text-[#DFAE1D] text-[10px] font-mono font-bold uppercase tracking-wider mb-1">
                    Leadership
                  </div>
                  <h3 className="text-lg font-black uppercase text-white tracking-wide">Kevoie Bailey</h3>
                  <p className="text-xs text-[#DFAE1D] font-mono font-bold uppercase">Chief Executive Officer (CEO)</p>
                </div>
                <div className="text-xs text-slate-300 font-mono">
                  <span>Region: NJ • NY • PA Tri-State</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <a 
                  href="tel:2012069097"
                  className="p-3 rounded-xl bg-black/50 hover:bg-[#DFAE1D]/15 border border-white/10 hover:border-[#DFAE1D]/50 transition-all flex items-center gap-3 group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#DFAE1D]/10 flex items-center justify-center text-[#DFAE1D] group-hover:scale-110 transition-transform">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-mono uppercase">Direct Mobile / Call</div>
                    <div className="text-xs font-bold text-white group-hover:text-[#DFAE1D] transition-colors font-mono">201-206-9097</div>
                  </div>
                </a>

                <a 
                  href="mailto:just1playscouts@gmail.com"
                  className="p-3 rounded-xl bg-black/50 hover:bg-[#568BDD]/15 border border-white/10 hover:border-[#568BDD]/50 transition-all flex items-center gap-3 group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#568BDD]/10 flex items-center justify-center text-[#568BDD] group-hover:scale-110 transition-transform">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-mono uppercase">Official Email</div>
                    <div className="text-xs font-bold text-white group-hover:text-[#568BDD] transition-colors font-mono truncate max-w-[180px]">just1playscouts@gmail.com</div>
                  </div>
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <Mail className="w-5 h-5 text-[#E5B868]" />
                <h4 className="text-sm font-bold text-white uppercase">General & Media Inquiries</h4>
                <p className="text-xs text-slate-300 font-mono">just1playscouts@gmail.com</p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <Phone className="w-5 h-5 text-[#E5B868]" />
                <h4 className="text-sm font-bold text-white uppercase">Tournament Partnerships</h4>
                <p className="text-xs text-slate-300 font-mono">201-206-9097</p>
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); alert('Message sent to Kevoie Bailey and the Just1Play Operations team!'); }} className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase mb-1 block">Your Name</label>
                <input type="text" required placeholder="Coach / Parent / Athlete" className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/20 text-xs text-white focus:outline-none focus:border-[#E5B868]" />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase mb-1 block">Your Email</label>
                <input type="email" required placeholder="you@domain.com" className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/20 text-xs text-white focus:outline-none focus:border-[#E5B868]" />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase mb-1 block">Message</label>
                <textarea rows={4} required placeholder="How can we help with your team or tournament?" className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/20 text-xs text-white focus:outline-none focus:border-[#E5B868] resize-none" />
              </div>

              <button type="submit" className="w-full py-3 rounded-xl bg-[#E5B868] text-black font-black text-xs uppercase tracking-wider cursor-pointer shadow-[0_0_15px_rgba(214,28,36,0.4)]">
                Send Message
              </button>
            </form>
          </BentoCard>
        </div>
      )}

      {/* SUBPAGE 5: FAQ */}
      {activeSubPage === 'faq' && (
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E5B868]/10 border border-[#E5B868]/40 text-[#E5B868] text-xs font-mono font-bold uppercase tracking-widest">
              <HelpCircle className="w-4 h-4" />
              <span>JUST1PLAY OFFICIAL FAQ & KNOWLEDGE BASE</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black italic uppercase text-white">Frequently Asked Questions</h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
              Find answers to common questions about tournament registration, media coverage, QR pass credentials, and college recruiter verification on just1play.com.
            </p>
          </div>

          {/* Interactive FAQ Component */}
          <FaqSection />
        </div>
      )}

      {/* SUBPAGE 6: TERMS & PRIVACY */}
      {activeSubPage === 'terms' && (
        <div className="max-w-4xl mx-auto">
          <BentoCard glow className="bg-black border border-white/15 p-8 space-y-6">
            <h1 className="text-2xl font-black italic uppercase text-white border-b border-white/10 pb-3">Terms of Service & Privacy Policy</h1>
            <div className="space-y-4 text-xs text-slate-300 leading-relaxed font-mono">
              <p>
                Welcome to Just1Play. By accessing or using just1play.com, you agree to comply with our athletic community standards, fair play rules, and data privacy policies.
              </p>
              <h3 className="text-sm font-bold text-white uppercase">1. Account Security & Verification</h3>
              <p>
                Athletes, coaches, and scouts are responsible for maintaining accurate profile information. Misrepresentation of age, grade level, or statistical records may result in account verification revocation.
              </p>
              <h3 className="text-sm font-bold text-white uppercase">2. Media & Content Rights</h3>
              <p>
                By booking or uploading media links to Just1Play, you grant Just1Play permission to feature clips on recruiter matrices and official social media highlights.
              </p>
            </div>
          </BentoCard>
        </div>
      )}

      {/* SUBPAGE 7: ADVERTISE WITH US */}
      {activeSubPage === 'advertise' && (
        <AdvertiseWithUsView onOpenTab={(tab) => onLaunchApp(tab as MainTab)} />
      )}

    </div>
  );
};
