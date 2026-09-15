import React, { useEffect, useState } from 'react';
import { Zap, ExternalLink, Sparkles, ShieldCheck } from 'lucide-react';
import { AdCampaign } from '../../types/ad';
import { adService } from '../../services/adService';
import { motion } from 'framer-motion';

interface ScoutBentoAdCardProps {
  className?: string;
  onOpenAdvertiseModal?: () => void;
}

export const ScoutBentoAdCard: React.FC<ScoutBentoAdCardProps> = ({
  className = '',
  onOpenAdvertiseModal
}) => {
  const [ad, setAd] = useState<AdCampaign | null>(null);

  useEffect(() => {
    let isMounted = true;
    adService.getActiveAds('bento-square').then((ads) => {
      if (!isMounted) return;
      if (ads.length > 0) setAd(ads[0]);
      else {
        adService.getActiveAds('recruiter-sidebar').then(fallback => {
          if (isMounted && fallback.length > 0) setAd(fallback[0]);
        });
      }
    });
    return () => { isMounted = false; };
  }, []);

  if (!ad) {
    // Standard house sponsor fallback
    return (
      <div className={`rounded-3xl bg-[#212A31]/80 border border-[#E5B868]/30 p-6 flex flex-col justify-between relative overflow-hidden ${className}`}>
        <div className="space-y-3 relative z-10">
          <span className="px-2.5 py-1 rounded bg-[#E5B868] text-black font-black text-[9px] uppercase tracking-wider">
            [SLOT ID: AD-SCOUT-SQ] • SPONSORED
          </span>
          <h4 className="text-lg font-black uppercase italic text-white">EAST COAST RECRUITING MATRIX</h4>
          <p className="text-xs text-slate-300">Connect directly with 1,200+ D1, D2 & D3 College Recruiters & Scouts.</p>
        </div>
        <button
          onClick={onOpenAdvertiseModal}
          className="mt-4 px-4 py-2.5 rounded-xl bg-[#E5B868] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>CLAIM SPONSOR SLOT</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -6 }}
      className={`rounded-3xl bg-[#212A31]/90 border border-[#E5B868]/40 backdrop-blur-xl p-5 sm:p-6 shadow-[0_0_30px_rgba(214,28,36,0.2)] flex flex-col justify-between relative overflow-hidden group cursor-pointer ${className}`}
      onClick={() => {
        adService.trackClick(ad.id);
        if (ad.websiteUrl.startsWith('/') && onOpenAdvertiseModal) {
          onOpenAdvertiseModal();
        } else {
          window.open(ad.websiteUrl, '_blank');
        }
      }}
    >
      {/* Background artwork */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-20 group-hover:scale-105 transition-transform duration-700 pointer-events-none"
        style={{ backgroundImage: `url(${ad.imageUrl})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#212A31] via-[#212A31]/80 to-transparent pointer-events-none" />

      <div className="relative z-10 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <span className="px-2.5 py-0.5 rounded bg-[#E5B868] text-slate-950 font-black text-[9px] uppercase tracking-wider flex items-center gap-1 shadow-[0_0_10px_rgba(214,28,36,0.5)]">
            <Zap className="w-3 h-3 fill-slate-950" />
            [SLOT ID: AD-SCOUT-SQ] • SPONSORED
          </span>
          <span className="text-[10px] font-mono text-[#E5B868] font-bold uppercase">
            {ad.brandName}
          </span>
        </div>

        <h4 className="text-base sm:text-lg font-black italic uppercase text-white group-hover:text-[#E5B868] transition-colors leading-snug">
          {ad.headline}
        </h4>

        <p className="text-xs text-slate-300 font-sans line-clamp-3 leading-relaxed">
          {ad.subheadline}
        </p>
      </div>

      <div className="relative z-10 mt-6 pt-3 border-t border-slate-800 flex items-center justify-between">
        <span className="text-xs font-black uppercase text-[#E5B868] tracking-wider flex items-center gap-1">
          <span>{ad.ctaText || 'LEARN MORE'}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </span>
        <span className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-white">
          <Zap className="w-3.5 h-3.5 text-[#E5B868]" />
        </span>
      </div>
    </motion.div>
  );
};
