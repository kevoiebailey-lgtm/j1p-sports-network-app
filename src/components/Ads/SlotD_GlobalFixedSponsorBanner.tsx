import React, { useEffect, useState } from 'react';
import { Zap, ExternalLink, X, ShieldCheck, ChevronUp } from 'lucide-react';
import { AdCampaign } from '../../types/ad';
import { adService } from '../../services/adService';
import { motion, AnimatePresence } from 'motion/react';

interface SlotDGlobalFixedSponsorBannerProps {
  onOpenAdvertiseModal?: () => void;
}

export const SlotD_GlobalFixedSponsorBanner: React.FC<SlotDGlobalFixedSponsorBannerProps> = ({
  onOpenAdvertiseModal
}) => {
  const [ad, setAd] = useState<AdCampaign | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasTrackedImpression, setHasTrackedImpression] = useState(false);

  useEffect(() => {
    let isMounted = true;
    adService.getActiveAds('global-footer-banner').then((ads) => {
      if (!isMounted) return;
      if (ads.length > 0) {
        setAd(ads[0]);
      } else {
        adService.getActiveAds('events-top').then(fallback => {
          if (isMounted && fallback.length > 0) setAd(fallback[0]);
        });
      }
    });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (ad && !hasTrackedImpression) {
      adService.trackImpression(ad.id);
      setHasTrackedImpression(true);
    }
  }, [ad, hasTrackedImpression]);

  const handleClick = (e: React.MouseEvent) => {
    if (!ad) return;
    adService.trackClick(ad.id);
    if (ad.websiteUrl.startsWith('/') && onOpenAdvertiseModal) {
      e.preventDefault();
      onOpenAdvertiseModal();
    } else if (ad.websiteUrl.startsWith('/')) {
      window.location.href = ad.websiteUrl;
    }
  };

  if (!ad || isDismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-10 px-2 sm:px-4 pb-1 pointer-events-none">
      <div className="max-w-7xl mx-auto pointer-events-auto">
        <AnimatePresence>
          {isMinimized ? (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="flex justify-end mb-2"
            >
              <button
                onClick={() => setIsMinimized(false)}
                className="px-3 py-1.5 rounded-full bg-[#212A31]/95 border border-[#E5B868]/50 text-[#E5B868] text-[10px] font-mono font-bold uppercase flex items-center gap-1.5 shadow-[0_0_15px_rgba(214,28,36,0.3)] backdrop-blur-md cursor-pointer hover:bg-[#212A31] transition-all"
              >
                <Zap className="w-3 h-3 fill-[#E5B868]" />
                <span>OFFICIAL GLOBAL PARTNER</span>
                <ChevronUp className="w-3 h-3 text-[#E5B868]" />
              </button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="rounded-2xl border border-[#E5B868]/40 bg-[#212A31]/95 p-2.5 sm:p-3 shadow-[0_-5px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(214,28,36,0.15)] backdrop-blur-md flex items-center justify-between gap-3 text-xs font-sans transition-all hover:border-[#E5B868]"
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <span className="px-2 py-1 rounded bg-[#E5B868] text-slate-950 font-black text-[9px] uppercase tracking-wider shrink-0 flex items-center gap-1 shadow-[0_0_10px_rgba(214,28,36,0.4)]">
                  <Zap className="w-3 h-3 fill-slate-950" />
                  GLOBAL PARTNER
                </span>

                <div className="overflow-hidden">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-[#E5B868] uppercase shrink-0">
                      {ad.brandName}
                    </span>
                    <span className="hidden sm:inline text-slate-400 text-[10px] font-mono">
                      • Official Partner
                    </span>
                  </div>
                  <h5 className="font-bold uppercase text-white truncate text-xs sm:text-xs">
                    {ad.headline}
                  </h5>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={ad.websiteUrl}
                  target={ad.websiteUrl.startsWith('http') ? '_blank' : '_self'}
                  rel="noopener noreferrer"
                  onClick={handleClick}
                  className="px-3.5 py-1.5 rounded-xl bg-[#E5B868] hover:bg-[#B8141B] text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-[0_0_12px_rgba(214,28,36,0.4)] transition-all flex items-center gap-1 cursor-pointer border border-[#E5B868]"
                >
                  <span>{ad.ctaText || 'VIEW SPONSOR'}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Minimize Sponsor Banner"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
