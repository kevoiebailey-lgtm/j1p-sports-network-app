import React, { useEffect, useState } from 'react';
import { Zap, ExternalLink, Sparkles, ShieldCheck } from 'lucide-react';
import { AdCampaign } from '../../types/ad';
import { adService } from '../../services/adService';
import { motion } from 'framer-motion';

interface ScoutLeaderboardAdBannerProps {
  className?: string;
  onOpenAdvertiseModal?: () => void;
}

export const ScoutLeaderboardAdBanner: React.FC<ScoutLeaderboardAdBannerProps> = ({
  className = '',
  onOpenAdvertiseModal
}) => {
  const [ad, setAd] = useState<AdCampaign | null>(null);

  useEffect(() => {
    let isMounted = true;
    adService.getActiveAds('native-leaderboard').then((ads) => {
      if (!isMounted) return;
      if (ads.length > 0) setAd(ads[0]);
      else {
        adService.getActiveAds('header-leaderboard').then(fallback => {
          if (isMounted && fallback.length > 0) setAd(fallback[0]);
        });
      }
    });
    return () => { isMounted = false; };
  }, []);

  const handleClick = () => {
    if (!ad) return;
    adService.trackClick(ad.id);
    if (ad.websiteUrl.startsWith('/') && onOpenAdvertiseModal) {
      onOpenAdvertiseModal();
    } else {
      window.open(ad.websiteUrl, '_blank');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={handleClick}
      className={`w-full group relative overflow-hidden rounded-3xl border border-[#E5B868]/40 bg-[#212A31]/90 p-5 sm:p-6 shadow-[0_0_35px_rgba(214,28,36,0.2)] backdrop-blur-2xl transition-all hover:border-[#E5B868] cursor-pointer ${className}`}
    >
      {/* Background artwork */}
      {ad?.imageUrl && (
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-25 group-hover:scale-105 transition-transform duration-700 pointer-events-none"
          style={{ backgroundImage: `url(${ad.imageUrl})` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-[#212A31] via-[#212A31]/90 to-[#212A31]/70 pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start md:items-center gap-4">
          <span className="px-3 py-1.5 rounded-xl bg-[#E5B868] text-slate-950 font-black text-[10px] uppercase tracking-wider shrink-0 flex items-center gap-1.5 shadow-[0_0_12px_rgba(214,28,36,0.5)]">
            <Zap className="w-3.5 h-3.5 fill-slate-950" />
            [SLOT ID: AD-SCOUT-LEADERBOARD]
          </span>

          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-mono font-bold text-[#E5B868] uppercase">
                {ad?.brandName || 'NIKE LASER COMBINE & SPEED TESTING'}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
                OFFICIAL RECRUITING PARTNER
              </span>
            </div>

            <h4 className="text-base sm:text-xl font-black uppercase italic text-white group-hover:text-[#E5B868] transition-colors">
              {ad?.headline || 'TRI-STATE LASER COMBINE & PRO RECRUITER MATRIX PASS'}
            </h4>

            <p className="text-xs text-slate-300 font-sans line-clamp-1 hidden sm:block mt-0.5">
              {ad?.subheadline || 'Get your 40-yd dash, vertical jump, and position metrics verified by official NCAA scouts.'}
            </p>
          </div>
        </div>

        <button
          className="w-full md:w-auto px-6 py-3 rounded-2xl bg-[#E5B868] hover:bg-[#B8141B] text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(214,28,36,0.4)] transition-all flex items-center justify-center gap-2 shrink-0 border border-[#E5B868]"
        >
          <span>{ad?.ctaText || 'CLAIM COMBINE SLOT'}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
};
