import React, { useEffect, useState } from 'react';
import { Zap, ExternalLink, Sparkles, Trophy } from 'lucide-react';
import { AdCampaign } from '../../types/ad';
import { adService } from '../../services/adService';
import { motion } from 'motion/react';

interface SlotCLeaderboardAdProps {
  className?: string;
  onOpenAdvertiseModal?: () => void;
}

export const SlotC_LeaderboardAd: React.FC<SlotCLeaderboardAdProps> = ({
  className = '',
  onOpenAdvertiseModal
}) => {
  const [ad, setAd] = useState<AdCampaign | null>(null);
  const [hasTrackedImpression, setHasTrackedImpression] = useState(false);

  useEffect(() => {
    let isMounted = true;
    adService.getActiveAds('native-leaderboard').then((ads) => {
      if (!isMounted) return;
      if (ads.length > 0) {
        setAd(ads[0]);
      } else {
        adService.getActiveAds('header-leaderboard').then(fallback => {
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

  if (!ad) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`w-full group relative overflow-hidden rounded-2xl border border-[#E5B868]/30 bg-black/90 p-4 sm:p-5 shadow-[0_0_25px_rgba(214,28,36,0.15)] backdrop-blur-2xl transition-all hover:border-[#E5B868]/70 ${className}`}
    >
      {/* Background Image Effect */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-20 group-hover:opacity-30 transition-opacity pointer-events-none"
        style={{ backgroundImage: `url(${ad.imageUrl})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black/70 pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="px-3 py-1.5 rounded-lg bg-[#E5B868] text-black font-black text-[10px] uppercase tracking-wider shrink-0 flex items-center gap-1.5 shadow-[0_0_12px_rgba(214,28,36,0.5)]">
            <Zap className="w-3.5 h-3.5 fill-black" />
            FEATURED SPONSOR
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-[#E5B868] uppercase tracking-wider">
                {ad.brandName}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono">
                VERIFIED PARTNER
              </span>
            </div>

            <h4 className="text-sm sm:text-base font-black uppercase tracking-tight text-white group-hover:text-[#E5B868] transition-colors mt-0.5">
              {ad.headline}
            </h4>

            {ad.subheadline && (
              <p className="text-xs text-slate-300 font-sans line-clamp-1 mt-0.5 hidden sm:block">
                {ad.subheadline}
              </p>
            )}
          </div>
        </div>

        <a
          href={ad.websiteUrl}
          target={ad.websiteUrl.startsWith('http') ? '_blank' : '_self'}
          rel="noopener noreferrer"
          onClick={handleClick}
          className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-[#E5B868] hover:bg-[#B8141B] text-black font-black text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(214,28,36,0.4)] transition-all flex items-center justify-center gap-2 shrink-0 border border-[#E5B868]"
        >
          <span>{ad.ctaText || 'CLAIM OFFER'}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </motion.div>
  );
};
