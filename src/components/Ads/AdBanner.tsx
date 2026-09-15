import React, { useEffect, useState } from 'react';
import { ExternalLink, Sparkles, Zap, Info, Target, Eye } from 'lucide-react';
import { AdCampaign, AdPlacementPosition } from '../../types/ad';
import { adService } from '../../services/adService';

export { SlotA_CinematicBanner } from './SlotA_CinematicBanner';
export { SlotB_BentoAdCard } from './SlotB_BentoAdCard';
export { SlotC_LeaderboardAd } from './SlotC_LeaderboardAd';
export { SlotD_GlobalFixedSponsorBanner } from './SlotD_GlobalFixedSponsorBanner';

interface AdBannerProps {
  position: AdPlacementPosition;
  className?: string;
  onOpenAdvertiseModal?: () => void;
  customTitle?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({ 
  position, 
  className = '',
  onOpenAdvertiseModal,
  customTitle
}) => {
  const [ad, setAd] = useState<AdCampaign | null>(null);
  const [displayImageUrl, setDisplayImageUrl] = useState<string>('');
  const [hasTrackedImpression, setHasTrackedImpression] = useState(false);

  useEffect(() => {
    let isMounted = true;
    adService.getActiveAds(position).then((ads) => {
      if (!isMounted) return;
      if (ads.length > 0) {
        // Pick a random active ad or the first
        const selected = ads[Math.floor(Math.random() * ads.length)];
        setAd(selected);

        // Determine initial display image
        if (selected.enableRandomRotation && selected.additionalImages && selected.additionalImages.length > 0) {
          const allImages = [selected.imageUrl, ...selected.additionalImages];
          const randomImg = allImages[Math.floor(Math.random() * allImages.length)];
          setDisplayImageUrl(randomImg);
        } else {
          setDisplayImageUrl(selected.imageUrl);
        }
      }
    });
    return () => { isMounted = false; };
  }, [position]);

  useEffect(() => {
    if (ad && !hasTrackedImpression) {
      adService.trackImpression(ad.id);
      setHasTrackedImpression(true);
    }
  }, [ad, hasTrackedImpression]);

  const handleClick = (e: React.MouseEvent) => {
    if (!ad) return;
    adService.trackClick(ad.id);

    if (ad.websiteUrl.startsWith('/')) {
      e.preventDefault();
      if (onOpenAdvertiseModal) {
        onOpenAdvertiseModal();
      } else {
        window.location.href = ad.websiteUrl;
      }
    }
  };

  if (!ad) return null;

  // Render format based on placement position
  const isLeaderboard = position === 'header-leaderboard' || position === 'events-top' || position === 'footer-wide';
  const isSidebar = position === 'recruiter-sidebar';

  if (isLeaderboard) {
    return (
      <div className={`w-full group relative overflow-hidden rounded-2xl border border-[#E5B868]/30 bg-black/90 p-3 sm:p-4 shadow-[0_0_20px_rgba(214,28,36,0.1)] backdrop-blur-xl transition-all hover:border-[#E5B868]/60 ${className}`}>
        {/* Background Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20 group-hover:opacity-30 transition-opacity" 
          style={{ backgroundImage: `url(${displayImageUrl || ad.imageUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black/60" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="px-2.5 py-1 rounded-md bg-[#E5B868] text-black font-black text-[9px] uppercase tracking-wider shrink-0 flex items-center gap-1 shadow-[0_0_10px_rgba(214,28,36,0.5)]">
              <Zap className="w-3 h-3" /> SPONSORED
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-[#E5B868] uppercase block tracking-wider">
                {ad.brandName}
              </span>
              <h4 className="text-xs sm:text-sm font-black uppercase tracking-tight text-white group-hover:text-[#E5B868] transition-colors">
                {ad.headline}
              </h4>
              {ad.subheadline && (
                <p className="text-[11px] text-slate-300 line-clamp-1 mt-0.5 font-sans hidden md:block">
                  {ad.subheadline}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <a
              href={ad.websiteUrl}
              target={ad.websiteUrl.startsWith('http') ? '_blank' : '_self'}
              rel="noreferrer"
              onClick={handleClick}
              className="px-4 py-2 rounded-xl bg-[#E5B868] hover:bg-[#B8141B] text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(214,28,36,0.4)] transition-all cursor-pointer"
            >
              <span>{ad.ctaText || 'LEARN MORE'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {onOpenAdvertiseModal && (
              <button
                onClick={onOpenAdvertiseModal}
                title="Advertise on Just1Play"
                className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white text-[10px] font-bold uppercase transition-colors"
              >
                Ad Space
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isSidebar) {
    return (
      <div className={`w-full rounded-2xl border border-white/15 bg-black/80 p-4 relative overflow-hidden group shadow-2xl backdrop-blur-xl ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <span className="px-2 py-0.5 rounded bg-[#E5B868]/10 text-[#E5B868] border border-[#E5B868]/30 font-mono font-bold text-[9px] uppercase tracking-widest flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" /> OFFICIAL SPONSOR
          </span>
          <span className="text-[9px] font-mono text-slate-500 uppercase">AD SPACE</span>
        </div>

        <div className="relative h-32 w-full rounded-xl overflow-hidden mb-3 border border-white/10">
          <img 
            src={displayImageUrl || ad.imageUrl} 
            alt={ad.brandName} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
          <span className="absolute bottom-2 left-2 text-[10px] font-mono font-bold text-[#E5B868]">
            {ad.brandName}
          </span>
        </div>

        <h4 className="text-xs font-black uppercase text-white tracking-tight line-clamp-2 mb-1 group-hover:text-[#E5B868] transition-colors">
          {ad.headline}
        </h4>
        {ad.subheadline && (
          <p className="text-[11px] text-slate-300 line-clamp-2 mb-3">
            {ad.subheadline}
          </p>
        )}

        <a
          href={ad.websiteUrl}
          target={ad.websiteUrl.startsWith('http') ? '_blank' : '_self'}
          rel="noreferrer"
          onClick={handleClick}
          className="w-full py-2.5 rounded-xl bg-[#E5B868] hover:bg-[#B8141B] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(214,28,36,0.3)] transition-all cursor-pointer"
        >
          <span>{ad.ctaText || 'EXPLORE SPONSOR'}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>

        {onOpenAdvertiseModal && (
          <button
            onClick={onOpenAdvertiseModal}
            className="w-full mt-2 text-center text-[10px] font-mono font-bold text-slate-400 hover:text-[#E5B868] transition-colors"
          >
            Want to advertise here? Book Ad Slot →
          </button>
        )}
      </div>
    );
  }

  // Native Card Layout (In-Feed)
  return (
    <div className={`w-full rounded-2xl border border-[#E5B868]/20 bg-[#212A31]/90 p-4 sm:p-5 relative overflow-hidden group shadow-xl backdrop-blur-xl ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#E5B868] text-black font-black text-xs flex items-center justify-center">
            AD
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold text-[#E5B868] uppercase block">
              {ad.brandName}
            </span>
            <span className="text-[9px] text-slate-400 uppercase tracking-widest font-mono">
              FEATURED PARTNER
            </span>
          </div>
        </div>

        <button
          onClick={onOpenAdvertiseModal}
          className="text-[9px] font-mono font-bold text-slate-400 hover:text-[#E5B868] border border-white/10 hover:border-[#E5B868]/40 px-2 py-1 rounded-md transition-colors"
        >
          ADVERTISE WITH US
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
        <div className="sm:col-span-1 relative h-36 w-full rounded-xl overflow-hidden border border-white/10">
          <img 
            src={displayImageUrl || ad.imageUrl} 
            alt={ad.brandName} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
          />
        </div>

        <div className="sm:col-span-2 space-y-2">
          <h4 className="text-sm font-black uppercase text-white tracking-tight group-hover:text-[#E5B868] transition-colors">
            {ad.headline}
          </h4>
          {ad.subheadline && (
            <p className="text-xs text-slate-300 line-clamp-2">
              {ad.subheadline}
            </p>
          )}

          <div className="pt-2 flex items-center gap-3">
            <a
              href={ad.websiteUrl}
              target={ad.websiteUrl.startsWith('http') ? '_blank' : '_self'}
              rel="noreferrer"
              onClick={handleClick}
              className="px-4 py-2 rounded-xl bg-[#E5B868] hover:bg-[#B8141B] text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(214,28,36,0.3)] transition-all cursor-pointer"
            >
              <span>{ad.ctaText || 'VISIT WEBSITE'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
              <Eye className="w-3 h-3 text-[#E5B868]" /> {ad.impressions.toLocaleString()} Views
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
