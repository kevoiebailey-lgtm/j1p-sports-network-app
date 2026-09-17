import React, { useEffect, useState } from 'react';
import { ExternalLink, Zap, Sparkles } from 'lucide-react';
import { AdCampaign } from '../../types/ad';
import { adService } from '../../services/adService';

interface ProfileBentoAdCardProps {
  className?: string;
  onOpenAdvertiseModal?: () => void;
}

export const ProfileBentoAdCard: React.FC<ProfileBentoAdCardProps> = ({
  className = '',
  onOpenAdvertiseModal
}) => {
  const [ad, setAd] = useState<AdCampaign | null>(null);

  useEffect(() => {
    let isMounted = true;
    adService.getActiveAds('bento-square').then((ads) => {
      if (!isMounted) return;
      if (ads.length > 0) setAd(ads[0]);
    });
    return () => { isMounted = false; };
  }, []);

  const handleClick = () => {
    if (ad) {
      adService.trackClick(ad.id);
      if (ad.websiteUrl.startsWith('/') && onOpenAdvertiseModal) {
        onOpenAdvertiseModal();
      } else {
        window.open(ad.websiteUrl, '_blank');
      }
    } else if (onOpenAdvertiseModal) {
      onOpenAdvertiseModal();
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative rounded-3xl bg-[#212A31]/90 border border-[#E5B868]/40 hover:border-[#E5B868] p-5 sm:p-6 shadow-[0_0_30px_rgba(214,28,36,0.2)] hover:shadow-[0_0_40px_rgba(214,28,36,0.35)] backdrop-blur-xl transition-all cursor-pointer flex flex-col justify-between overflow-hidden ${className}`}
    >
      {/* Ambient Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#E5B868]/10 rounded-full blur-2xl pointer-events-none group-hover:bg-[#E5B868]/20 transition-all" />

      {/* Background artwork */}
      {ad?.imageUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 group-hover:scale-105 transition-transform duration-700 pointer-events-none"
          style={{ backgroundImage: `url(${ad.imageUrl})` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#212A31] via-[#212A31]/85 to-transparent pointer-events-none" />

      <div className="relative z-10 space-y-3">
        {/* SPONSORED BADGE */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <span className="px-2.5 py-0.5 rounded bg-[#E5B868] text-slate-950 font-black text-[9px] uppercase tracking-wider flex items-center gap-1 shadow-[0_0_10px_rgba(214,28,36,0.5)]">
            <Zap className="w-3 h-3 fill-slate-950 text-slate-950" />
            [SLOT ID: AD-PROFILE-BENTO] • SPONSORED
          </span>
          <span className="text-[10px] font-mono font-bold text-[#E5B868] uppercase">
            {ad?.brandName || 'NIKE COMBINE'}
          </span>
        </div>

        <h4 className="text-base sm:text-lg font-black italic uppercase text-white group-hover:text-[#E5B868] transition-colors leading-snug">
          {ad?.headline || 'TRI-STATE NIKE LASER SPEED & COMBINE PASS'}
        </h4>

        <p className="text-xs text-slate-300 font-sans line-clamp-3 leading-relaxed">
          {ad?.subheadline || 'Get your 40-yd dash, vertical jump, and position metrics verified by official NCAA scouts.'}
        </p>
      </div>

      <div className="relative z-10 mt-6 pt-3 border-t border-slate-800 flex items-center justify-between">
        <span className="text-xs font-black uppercase text-[#E5B868] tracking-wider flex items-center gap-1">
          <span>{ad?.ctaText || 'CLAIM COMBINE SLOT'}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </span>
        <span className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-white">
          <Sparkles className="w-3.5 h-3.5 text-[#E5B868]" />
        </span>
      </div>
    </div>
  );
};
