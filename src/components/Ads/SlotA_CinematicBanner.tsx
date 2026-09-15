import React, { useEffect, useState } from 'react';
import { Zap, Sparkles, ExternalLink, Play, Radio, ShieldCheck } from 'lucide-react';
import { AdCampaign } from '../../types/ad';
import { adService } from '../../services/adService';
import { motion } from 'motion/react';

interface SlotACinematicBannerProps {
  className?: string;
  onOpenAdvertiseModal?: () => void;
  customHeadline?: string;
}

export const SlotA_CinematicBanner: React.FC<SlotACinematicBannerProps> = ({
  className = '',
  onOpenAdvertiseModal,
  customHeadline
}) => {
  const [ad, setAd] = useState<AdCampaign | null>(null);
  const [hasTrackedImpression, setHasTrackedImpression] = useState(false);

  useEffect(() => {
    let isMounted = true;
    adService.getActiveAds('cinematic-hero').then((ads) => {
      if (!isMounted) return;
      if (ads.length > 0) {
        setAd(ads[0]);
      } else {
        // Fallback to house ads
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
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative w-full rounded-3xl overflow-hidden border border-[#E5B868]/40 bg-black/90 p-6 sm:p-8 shadow-[0_0_40px_rgba(214,28,36,0.2)] backdrop-blur-2xl group hover:border-[#E5B868] transition-all duration-500 ${className}`}
    >
      {/* Background Hero Artwork & Gradient Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30 group-hover:scale-105 transition-transform duration-700 pointer-events-none"
        style={{ backgroundImage: `url(${ad.imageUrl})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#E5B868]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Content Layer */}
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-md bg-[#E5B868] text-black font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(214,28,36,0.6)]">
              <Zap className="w-3.5 h-3.5 fill-black" />
              GAME OF THE WEEK • OFFICIAL SPONSOR
            </span>

            <span className="px-2.5 py-0.5 rounded-md bg-white/10 text-white font-mono text-[10px] font-bold uppercase border border-white/10">
              {ad.brandName}
            </span>

            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 font-mono text-[10px] font-bold uppercase border border-red-500/30">
              <Radio className="w-3 h-3 text-red-400 animate-pulse" />
              LIVE SHOWCASE
            </span>
          </div>

          <h3 className="text-xl sm:text-3xl font-black italic uppercase tracking-tight text-white group-hover:text-[#E5B868] transition-colors leading-tight">
            {customHeadline || ad.headline}
          </h3>

          <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
            {ad.subheadline}
          </p>
        </div>

        {/* CTA Button & Sponsor Badge */}
        <div className="shrink-0 flex flex-col items-start md:items-end gap-2 w-full md:w-auto">
          <a
            href={ad.websiteUrl}
            target={ad.websiteUrl.startsWith('http') ? '_blank' : '_self'}
            rel="noopener noreferrer"
            onClick={handleClick}
            className="w-full md:w-auto px-6 py-3.5 rounded-2xl bg-[#E5B868] hover:bg-[#B8141B] text-black font-black text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(214,28,36,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#E5B868]"
          >
            <Play className="w-4 h-4 text-black fill-black" />
            <span>{ad.ctaText || 'WATCH GAME OF THE WEEK'}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-[#E5B868]" />
            Official Sponsor Security Verified
          </span>
        </div>
      </div>
    </motion.div>
  );
};
