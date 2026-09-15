import React, { useEffect, useState } from 'react';
import { Zap, ExternalLink, Sparkles, ArrowRight } from 'lucide-react';
import { AdCampaign } from '../../types/ad';
import { adService } from '../../services/adService';
import { motion } from 'motion/react';

interface SlotBBentoAdCardProps {
  className?: string;
  onOpenAdvertiseModal?: () => void;
}

export const SlotB_BentoAdCard: React.FC<SlotBBentoAdCardProps> = ({
  className = '',
  onOpenAdvertiseModal
}) => {
  const [ad, setAd] = useState<AdCampaign | null>(null);
  const [hasTrackedImpression, setHasTrackedImpression] = useState(false);

  useEffect(() => {
    let isMounted = true;
    adService.getActiveAds('bento-square').then((ads) => {
      if (!isMounted) return;
      if (ads.length > 0) {
        setAd(ads[0]);
      } else {
        adService.getActiveAds('home-feed').then(fallback => {
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
    <motion.a
      href={ad.websiteUrl}
      target={ad.websiteUrl.startsWith('http') ? '_blank' : '_self'}
      rel="noopener noreferrer"
      onClick={handleClick}
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={`block rounded-3xl bg-white/[0.03] border border-white/10 hover:border-[#E5B868]/60 backdrop-blur-2xl p-6 shadow-2xl hover:shadow-[0_0_35px_rgba(214,28,36,0.25)] transition-all cursor-pointer relative overflow-hidden group flex flex-col justify-between ${className}`}
    >
      {/* Background Image Accent */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-15 group-hover:opacity-25 transition-opacity duration-500 pointer-events-none"
        style={{ backgroundImage: `url(${ad.imageUrl})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 w-48 h-48 bg-[#E5B868]/10 rounded-full blur-3xl group-hover:bg-[#E5B868]/20 transition-all pointer-events-none" />

      {/* Top Tag & Header */}
      <div className="relative z-10 space-y-3">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#E5B868] text-black font-black text-[9px] uppercase tracking-wider shadow-[0_0_10px_rgba(214,28,36,0.5)]">
            <Zap className="w-3 h-3 fill-black" />
            OFFICIAL PARTNER
          </div>

          <span className="text-[10px] font-mono text-[#E5B868] font-bold uppercase tracking-wider">
            {ad.brandName}
          </span>
        </div>

        <h4 className="text-base sm:text-lg font-black italic uppercase tracking-tight text-white group-hover:text-[#E5B868] transition-colors leading-snug">
          {ad.headline}
        </h4>

        {ad.subheadline && (
          <p className="text-xs text-slate-300 font-sans line-clamp-2 leading-relaxed">
            {ad.subheadline}
          </p>
        )}
      </div>

      {/* Bottom CTA Bar */}
      <div className="relative z-10 mt-6 pt-3 border-t border-white/10 flex items-center justify-between">
        <span className="text-xs font-black uppercase text-[#E5B868] tracking-wider flex items-center gap-1 group-hover:translate-x-1 transition-transform">
          <span>{ad.ctaText || 'LEARN MORE'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </span>

        <span className="p-2 rounded-xl bg-white/5 border border-white/10 group-hover:bg-[#E5B868] group-hover:text-black transition-colors">
          <ExternalLink className="w-3.5 h-3.5" />
        </span>
      </div>
    </motion.a>
  );
};
