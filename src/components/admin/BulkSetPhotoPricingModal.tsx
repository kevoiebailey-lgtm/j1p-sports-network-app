import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  ShieldCheck, 
  Tag, 
  Check, 
  X, 
  RefreshCw, 
  Layers, 
  Info, 
  Camera, 
  Sparkles,
  Users,
  Lock,
  Unlock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { bulkSetGalleryPhotosPricing } from '../../services/galleryBulkPricingService';

export interface BulkSetPhotoPricingGalleryItem {
  id: string;
  title: string;
  eventName?: string;
  sport?: string;
  photoCount?: number;
  coverPhotoUrl?: string;
  singlePhotoPrice?: number;
  isFree?: boolean;
  isFreeForMembers?: boolean;
  priceCents?: number;
  photos?: any[];
}

export interface BulkSetPhotoPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  gallery: BulkSetPhotoPricingGalleryItem | null;
  onSuccess?: (result: {
    galleryId: string;
    isFreeForMembers: boolean;
    priceCents: number;
    updatedCount: number;
  }) => void;
}

const PRESET_PRICING = [
  { label: 'Free (0¢)', cents: 0, dollars: 0.0 },
  { label: '$4.99 (499¢)', cents: 499, dollars: 4.99 },
  { label: '$9.99 (999¢)', cents: 999, dollars: 9.99 },
  { label: '$14.99 (1499¢)', cents: 1499, dollars: 14.99 },
  { label: '$19.99 (1999¢)', cents: 1999, dollars: 19.99 },
  { label: '$29.99 (2999¢)', cents: 2999, dollars: 29.99 },
];

export const BulkSetPhotoPricingModal: React.FC<BulkSetPhotoPricingModalProps> = ({
  isOpen,
  onClose,
  gallery,
  onSuccess
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [isFreeForMembers, setIsFreeForMembers] = useState<boolean>(true);
  const [priceCents, setPriceCents] = useState<number>(999);
  const [dollarsInput, setDollarsInput] = useState<string>('9.99');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Initialize values from active gallery when opened
  useEffect(() => {
    if (gallery) {
      // If photo has explicit isFreeForMembers, use it; otherwise default to true if gallery is free
      const initialFreeForMembers = typeof gallery.isFreeForMembers === 'boolean'
        ? gallery.isFreeForMembers
        : (gallery.isFree === true || gallery.singlePhotoPrice === 0);
      setIsFreeForMembers(initialFreeForMembers);

      let initialCents = 999;
      if (typeof gallery.priceCents === 'number' && !isNaN(gallery.priceCents)) {
        initialCents = gallery.priceCents;
      } else if (typeof gallery.singlePhotoPrice === 'number' && !isNaN(gallery.singlePhotoPrice)) {
        initialCents = Math.round(gallery.singlePhotoPrice * 100);
      }

      setPriceCents(initialCents);
      setDollarsInput((initialCents / 100).toFixed(2));
    }
  }, [gallery]);

  if (!isOpen || !gallery) return null;

  // Handle direct cents input
  const handleCentsChange = (val: number) => {
    const safeCents = Math.max(0, Math.round(val || 0));
    setPriceCents(safeCents);
    setDollarsInput((safeCents / 100).toFixed(2));
  };

  // Handle dollars input
  const handleDollarsChange = (val: string) => {
    setDollarsInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      setPriceCents(Math.round(num * 100));
    }
  };

  // Select a preset
  const handleSelectPreset = (presetCents: number) => {
    handleCentsChange(presetCents);
  };

  const handleApply = async () => {
    if (!gallery.id) return;
    setIsSubmitting(true);

    try {
      const token = user ? await user.getIdToken().catch(() => undefined) : undefined;
      const result = await bulkSetGalleryPhotosPricing({
        galleryId: gallery.id,
        galleryTitle: gallery.title,
        isFreeForMembers,
        priceCents,
        authToken: token
      });

      showToast(
        'success',
        'Photos Pricing Updated',
        `Bulk-set isFreeForMembers (${isFreeForMembers ? 'Yes' : 'No'}) and priceCents (${priceCents}¢ / $${(priceCents / 100).toFixed(2)}) across all photos in "${gallery.title}".`
      );

      if (onSuccess) {
        onSuccess({
          galleryId: gallery.id,
          isFreeForMembers,
          priceCents,
          updatedCount: result.updatedCount
        });
      }

      onClose();
    } catch (err: any) {
      console.error('[BulkSetPhotoPricingModal] Error applying bulk pricing:', err);
      showToast('error', 'Bulk Update Failed', err?.message || 'Could not update photos in Firestore.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPriceDollars = (priceCents / 100).toFixed(2);
  const detectedPhotoCount = gallery.photoCount || gallery.photos?.length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#121826] border border-white/10 w-full max-w-xl rounded-3xl p-6 sm:p-7 shadow-2xl relative text-white max-h-[92vh] flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#00F0D0]/10 border border-[#00F0D0]/30 flex items-center justify-center text-[#00F0D0] shrink-0 shadow-[0_0_15px_rgba(0,240,208,0.2)]">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Bulk Photo Pricing
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-[#00F0D0]/15 text-[#00F0D0] text-[10px] font-mono font-bold uppercase">
                  Batch Utility
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                Set <code className="text-[#00F0D0]">isFreeForMembers</code> & <code className="text-[#00F0D0]">priceCents</code> for all photos in this gallery.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gallery Summary Target Banner */}
        <div className="my-4 p-3.5 rounded-2xl bg-black/40 border border-white/10 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
            {gallery.coverPhotoUrl ? (
              <img
                src={gallery.coverPhotoUrl}
                alt={gallery.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <Camera className="w-5 h-5 text-slate-500" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-xs truncate">{gallery.title}</h3>
              <span className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 text-[9px] font-mono font-bold">
                {gallery.sport || 'Sports'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
              <span>Gallery ID: <code className="text-slate-300">{gallery.id}</code></span>
              <span>•</span>
              <span className="text-[#00F0D0] font-bold">{detectedPhotoCount} photos detected</span>
            </div>
          </div>
        </div>

        {/* Form Controls */}
        <div className="space-y-5 flex-1">
          {/* 1. isFreeForMembers Field */}
          <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                  isFreeForMembers ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                }`}>
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <label 
                    htmlFor="bulk-is-free-for-members-toggle"
                    className="text-xs font-bold text-white font-mono cursor-pointer flex items-center gap-2"
                  >
                    <span>Free for Members (isFreeForMembers)</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                      isFreeForMembers ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {isFreeForMembers ? 'Enabled' : 'Disabled'}
                    </span>
                  </label>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Authenticated Just1Play members get free high-res clean photo downloads without checkout.
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                <input
                  id="bulk-is-free-for-members-toggle"
                  type="checkbox"
                  checked={isFreeForMembers}
                  onChange={(e) => setIsFreeForMembers(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
          </div>

          {/* 2. priceCents Field */}
          <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <label className="text-xs font-bold text-white font-mono flex items-center gap-2">
                    <span>Photo Price in Cents (priceCents)</span>
                    <span className="text-[10px] text-amber-400 font-mono font-bold">
                      (${currentPriceDollars})
                    </span>
                  </label>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Individual photo checkout price stored in Firestore as integer cents.
                  </p>
                </div>
              </div>
            </div>

            {/* Inputs Grid: Cents & Dollars synchronized */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Cents Input */}
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                  Value in Cents (Integer)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={priceCents}
                    onChange={(e) => handleCentsChange(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-xs text-white font-mono focus:outline-hidden focus:border-[#00F0D0]"
                    placeholder="999"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs pointer-events-none">
                    ¢
                  </span>
                </div>
              </div>

              {/* Dollars Input */}
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                  Dollar Equivalent ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs pointer-events-none">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.50"
                    value={dollarsInput}
                    onChange={(e) => handleDollarsChange(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-xl bg-black/60 border border-white/15 text-xs text-white font-mono focus:outline-hidden focus:border-[#00F0D0]"
                    placeholder="9.99"
                  />
                </div>
              </div>
            </div>

            {/* Quick Preset Buttons */}
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1.5">
                Quick Presets:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_PRICING.map((preset) => {
                  const isActive = priceCents === preset.cents;
                  return (
                    <button
                      key={preset.cents}
                      type="button"
                      onClick={() => handleSelectPreset(preset.cents)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer border ${
                        isActive
                          ? 'bg-[#00F0D0]/20 text-[#00F0D0] border-[#00F0D0]/50 shadow-[0_0_10px_rgba(0,240,208,0.2)]'
                          : 'bg-black/40 text-slate-400 border-white/10 hover:text-white hover:border-white/20'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Impact Summary Box */}
          <div className="p-3.5 rounded-2xl bg-[#00F0D0]/5 border border-[#00F0D0]/20 space-y-1.5 font-mono text-xs">
            <div className="flex items-center gap-1.5 text-[#00F0D0] font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Bulk Execution Impact</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Applying this will bulk-update all photos in <span className="text-white font-bold">"{gallery.title}"</span>:
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
              <div className="bg-black/30 p-2 rounded-xl border border-white/5">
                <span className="text-slate-400 block text-[10px]">isFreeForMembers</span>
                <span className={`font-bold ${isFreeForMembers ? 'text-emerald-400' : 'text-slate-300'}`}>
                  {isFreeForMembers ? 'true (Free download)' : 'false (Requires purchase)'}
                </span>
              </div>
              <div className="bg-black/30 p-2 rounded-xl border border-white/5">
                <span className="text-slate-400 block text-[10px]">priceCents</span>
                <span className="text-amber-300 font-bold">
                  {priceCents} cents (${currentPriceDollars})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white text-xs font-mono font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApply}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00F0D0] to-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(0,240,208,0.35)] hover:brightness-110 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Applying to All Photos...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Apply to All Photos</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
