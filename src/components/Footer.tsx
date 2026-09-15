import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Trophy, 
  Users, 
  Film, 
  ArrowUp, 
  ShieldCheck, 
  Sparkles,
  HelpCircle,
  FileText,
  Mail,
  DollarSign,
  Calculator,
  Download,
  ExternalLink,
  Smartphone,
  Phone
} from 'lucide-react';
import { BrandLogo } from './Common/BrandLogo';
import { CostCalculatorModal } from './Common/CostCalculatorModal';
import { useAuth } from '../context/AuthContext';
import { MainTab } from '../types';

interface FooterProps {
  onNavigateTab?: (tab: MainTab) => void;
  onOpenStorefrontPage?: (subpage: string) => void;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigateTab,
  onOpenStorefrontPage
}) => {
  const { user, profile, role } = useAuth();
  const isAdmin = role === 'admin' || profile?.role === 'admin' || user?.email === 'kevoiebailey@gmail.com';
  const [showCostCalculator, setShowCostCalculator] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert('To install Just1Play on your device:\n\n• iOS Safari: Tap the Share icon, then select "Add to Home Screen".\n• Android Chrome: Tap the three dots menu, then "Install App" or "Add to Home screen".\n• Desktop Chrome: Click the install icon in the URL bar.');
    }
  };

  const scrollToTop = () => {
    const scrollContainer = document.querySelector('.overflow-y-auto');
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <>
      {isAdmin && (
        <CostCalculatorModal 
          isOpen={showCostCalculator} 
          onClose={() => setShowCostCalculator(false)} 
        />
      )}
      <footer className="hidden md:block w-full bg-[#040D40] backdrop-blur-md border-t border-[#568BDD]/20 text-white pt-10 pb-28 lg:pb-12 mt-12 relative overflow-hidden z-20">
        {/* Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#DFAE1D]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-10">
          
          {/* Top Footer Row: Brand Info & Scroll to Top */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-[#568BDD]/20">
            <div className="space-y-2">
              <BrandLogo size="md" showTagline={true} />
              <p className="text-xs sm:text-sm text-slate-300 font-medium font-sans max-w-md mt-2 leading-relaxed tracking-wide">
                100% Standalone Sports Media, Recruiting & Tournament Platform serving youth, high school, and prep athletes across NJ, NY, and PA.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleInstallPWA}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-[#081342] hover:bg-[#DFAE1D]/20 border border-[#568BDD]/30 hover:border-[#DFAE1D]/50 text-xs font-mono font-bold text-[#DFAE1D] transition-all cursor-pointer shadow-sm"
                title="Install Just1Play Progressive Web App to your home screen"
              >
                <Smartphone className="w-4 h-4 text-[#DFAE1D]" />
                <span>{isInstalled ? 'APP INSTALLED' : 'SAVE APP'}</span>
              </button>

              {isAdmin && (
                <button
                  onClick={() => setShowCostCalculator(true)}
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-[#081342] hover:bg-[#568BDD]/20 border border-[#568BDD]/30 hover:border-[#568BDD]/50 text-xs font-mono font-bold text-[#568BDD] transition-all cursor-pointer shadow-sm"
                >
                  <Calculator className="w-4 h-4 text-[#568BDD]" />
                  <span>BLAZE COST CALCULATOR</span>
                </button>
              )}

              <button
                onClick={scrollToTop}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#081342] hover:bg-[#DFAE1D]/20 border border-[#568BDD]/30 hover:border-[#DFAE1D]/50 text-xs font-mono font-bold text-white hover:text-[#DFAE1D] transition-all cursor-pointer group shadow-sm"
              >
                <span>BACK TO TOP</span>
                <ArrowUp className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            </div>
          </div>

        {/* Middle Footer Columns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-xs">
          
          {/* Column 1: Core App Modules */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#DFAE1D] font-mono flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>APP MATRIX</span>
            </h4>
            <ul className="space-y-2.5 font-medium text-slate-300">
              <li>
                <button 
                  onClick={() => onNavigateTab?.('home')} 
                  className="hover:text-[#DFAE1D] transition-colors cursor-pointer flex items-center gap-2 text-slate-300"
                >
                  <Trophy className="w-3.5 h-3.5 text-[#DFAE1D]" />
                  <span>Tournament Hub</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigateTab?.('athletes')} 
                  className="hover:text-[#DFAE1D] transition-colors cursor-pointer flex items-center gap-2 text-slate-300"
                >
                  <Users className="w-3.5 h-3.5 text-[#568BDD]" />
                  <span>Recruiter Matrix</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigateTab?.('events')} 
                  className="hover:text-[#DFAE1D] transition-colors cursor-pointer flex items-center gap-2 text-slate-300"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>Standalone Events</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigateTab?.('social')} 
                  className="hover:text-[#DFAE1D] transition-colors cursor-pointer flex items-center gap-2 text-slate-300"
                >
                  <Flame className="w-3.5 h-3.5 text-[#DFAE1D]" />
                  <span>Social Video Feed</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigateTab?.('media')} 
                  className="hover:text-[#DFAE1D] transition-colors cursor-pointer flex items-center gap-2 text-slate-300"
                >
                  <Film className="w-3.5 h-3.5 text-[#568BDD]" />
                  <span>Media Vault</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Column 2: Platform Storefront (EXPLORE) */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#DFAE1D] font-mono flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>EXPLORE</span>
            </h4>
            <ul className="space-y-2.5 font-medium text-slate-300">
              <li>
                <a 
                  href="https://just1play.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-[#F59E0B] transition-colors cursor-pointer text-[#94A3B8] flex items-center gap-1.5"
                >
                  <span>Official Marketing Site</span>
                  <ExternalLink className="w-3 h-3 text-[#F59E0B]" />
                </a>
              </li>
              <li>
                <button 
                  onClick={() => onOpenStorefrontPage?.('landing')} 
                  className="hover:text-[#F59E0B] transition-colors cursor-pointer text-[#94A3B8]"
                >
                  Storefront Home
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onOpenStorefrontPage?.('about')} 
                  className="hover:text-[#F59E0B] transition-colors cursor-pointer text-[#94A3B8]"
                >
                  About Just1Play
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onOpenStorefrontPage?.('pricing')} 
                  className="hover:text-[#F59E0B] transition-colors cursor-pointer flex items-center gap-1.5 text-[#94A3B8]"
                >
                  <DollarSign className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>Pricing & Media Rates</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onOpenStorefrontPage?.('contact')} 
                  className="hover:text-[#F59E0B] transition-colors cursor-pointer flex items-center gap-1.5 text-[#94A3B8]"
                >
                  <Mail className="w-3.5 h-3.5 text-[#00F2FE]" />
                  <span>Contact Operations</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onOpenStorefrontPage?.('faq')} 
                  className="hover:text-[#F59E0B] transition-colors cursor-pointer flex items-center gap-1.5 text-[#94A3B8]"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>Frequently Asked Questions</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Legal & Verification */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#F59E0B] font-mono">
              POLICY & SCOUTING
            </h4>
            <ul className="space-y-2.5 font-medium text-[#94A3B8]">
              <li>
                <button 
                  onClick={() => onOpenStorefrontPage?.('terms')} 
                  className="hover:text-[#F59E0B] transition-colors cursor-pointer text-[#94A3B8]"
                >
                  Terms & Privacy Policy
                </button>
              </li>
              <li>
                <span className="text-[#94A3B8]">NCAA Eligibility Rules</span>
              </li>
              <li>
                <span className="text-[#94A3B8]">Verified QR Pass Standard</span>
              </li>
              <li>
                <span className="text-[#94A3B8]">4K DSLR Coverage Guarantee</span>
              </li>
            </ul>
          </div>

          {/* Column 4: Operational Status & Executive Contact */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#DFAE1D] font-mono flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              <span>DIRECT CONTACT</span>
            </h4>
            <div className="p-3.5 rounded-xl bg-[#081342] border border-[#568BDD]/30 space-y-2 text-[11px] font-mono shadow-sm">
              <div className="flex items-center justify-between">
                <div className="font-bold text-white uppercase text-[11px]">Kevoie Bailey</div>
                <span className="text-[10px] text-[#DFAE1D] font-bold">CEO</span>
              </div>
              <div className="space-y-1 text-slate-300 text-[10px]">
                <a href="tel:2012069097" className="flex items-center gap-1.5 hover:text-[#DFAE1D] transition-colors">
                  <Phone className="w-3 h-3 text-[#DFAE1D]" />
                  <span>201-206-9097</span>
                </a>
                <a href="mailto:just1playscouts@gmail.com" className="flex items-center gap-1.5 hover:text-[#568BDD] transition-colors truncate block" title="just1playscouts@gmail.com">
                  <Mail className="w-3 h-3 text-[#568BDD] shrink-0" />
                  <span className="truncate">just1playscouts@gmail.com</span>
                </a>
              </div>
              <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px]">
                <span className="text-slate-400">Region:</span>
                <span className="text-[#DFAE1D] font-bold">NJ • NY • PA</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Copyright & Disclaimer Line */}
        <div className="pt-6 border-t border-[#2D3748] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-mono text-[#94A3B8]">
          <div>
            © {new Date().getFullYear()} JUST1PLAY. All rights reserved. 100% Standalone Sports Platform.
          </div>
          <div className="flex items-center gap-4 text-[#94A3B8]">
            <button onClick={() => onOpenStorefrontPage?.('terms')} className="hover:text-white transition-colors">Terms</button>
            <span>•</span>
            <button onClick={() => onOpenStorefrontPage?.('privacy')} className="hover:text-white transition-colors">Privacy</button>
            <span>•</span>
            <button onClick={() => onOpenStorefrontPage?.('contact')} className="hover:text-white transition-colors">Support</button>
          </div>
        </div>

      </div>
    </footer>
    </>
  );
};
