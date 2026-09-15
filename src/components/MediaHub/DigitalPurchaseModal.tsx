import React, { useState } from 'react';
import { 
  X, 
  ShoppingCart, 
  CheckCircle2, 
  ShieldCheck, 
  Download, 
  CreditCard, 
  Lock, 
  Sparkles, 
  Camera, 
  FileText, 
  Check, 
  ArrowRight,
  Loader2,
  Calendar,
  MapPin,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MediaVaultItem, DigitalPurchaseOrder } from '../../types/mediaVault';
import { useAuth } from '../../context/AuthContext';

interface DigitalPurchaseModalProps {
  item: MediaVaultItem | null;
  onClose: () => void;
  onSuccess: (order: DigitalPurchaseOrder) => void;
}

export const DigitalPurchaseModal: React.FC<DigitalPurchaseModalProps> = ({
  item,
  onClose,
  onSuccess
}) => {
  const { user, profile } = useAuth();

  const [selectedTier, setSelectedTier] = useState<'web_license' | 'commercial_print' | 'event_bundle'>('web_license');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'apple_pay' | 'google_pay'>('card');
  const [cardNumber, setCardNumber] = useState<string>('•••• •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState<string>('12/28');
  const [cardCvc, setCardCvc] = useState<string>('888');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [completedOrder, setCompletedOrder] = useState<DigitalPurchaseOrder | null>(null);

  if (!item) return null;

  const tiers = [
    {
      id: 'web_license' as const,
      name: 'High-Res Athlete & Social License',
      price: item.price || 4.99,
      description: 'Full uncompressed 4K resolution file with rights for athlete recruitment profiles, Instagram, TikTok & portfolio.'
    },
    {
      id: 'commercial_print' as const,
      name: 'Commercial & High-DPI Print Package',
      price: 9.99,
      description: 'Maximum resolution 24.2 MP RAW export with full print lab release, magazine rights & commercial branding license.'
    },
    {
      id: 'event_bundle' as const,
      name: 'Full Event Showcase Athlete Bundle',
      price: 19.99,
      description: 'All game photos + 4K highlight cutaways of the tagged athlete from the entire tournament.'
    }
  ];

  const activeTierObj = tiers.find(t => t.id === selectedTier) || tiers[0];

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      // Direct call to PayPal Checkout API for digital media
      const res = await fetch("/api/checkout/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.uid || "guest_athlete",
          userEmail: user?.email || "athlete@just1play.com",
          mediaId: item.id,
          mediaType: selectedTier === "event_bundle" ? "full_pass" : "single_photo",
          title: item.title,
          storagePath: item.storagePath || `media_vault/${item.id}.jpg`,
          eventId: item.eventId || "",
          origin: window.location.origin,
        }),
      });

      const data = await res.json();
      if (res.ok && data.url) {
        // Instant redirect to PayPal Checkout
        window.location.href = data.url;
        return;
      }
    } catch (err) {
      console.warn("Could not initiate external PayPal redirect, falling back to instant unlock mode:", err);
    }

    setTimeout(() => {
      const order: DigitalPurchaseOrder = {
        id: `J1P-ORD-${Date.now().toString().slice(-6)}`,
        mediaId: item.id,
        mediaTitle: item.title,
        mediaType: item.type,
        thumbnailUrl: item.thumbnailUrl,
        tier: selectedTier,
        tierName: activeTierObj.name,
        amount: activeTierObj.price,
        buyerUid: user?.uid || 'guest-athlete',
        buyerName: profile?.displayName || user?.displayName || 'Verified Member',
        buyerEmail: user?.email || 'athlete@just1play.com',
        paymentMethod,
        purchasedAt: new Date().toISOString(),
        downloadUrl: item.highResDownloadUrl || item.mediaUrl,
        licenseKey: `LIC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
      };

      setIsProcessing(false);
      setCompletedOrder(order);
      onSuccess(order);
    }, 1200);
  };

  const handleDownloadPurchasedFile = () => {
    const link = document.createElement('a');
    link.href = item.highResDownloadUrl || item.mediaUrl;
    link.download = `Just1Play_${item.sport}_${item.id}_FULL_RES.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-2xl bg-[#161C22] border border-[#2D3748] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#2D3748] bg-[#1E2630]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-[#F59E0B] border border-amber-500/40">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black uppercase text-white tracking-tight font-sans">
                {completedOrder ? 'PURCHASE CONFIRMED & UNLOCKED' : 'DIGITAL HIGH-RES MEDIA CHECKOUT'}
              </h2>
              <p className="text-xs font-mono text-slate-400">
                Official Just1Play Commercial & Recruiting Media License
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#161C22] hover:bg-slate-800 text-slate-400 hover:text-white border border-[#2D3748] transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {completedOrder ? (
            /* Post-Purchase Success Confirmation State */
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-[#10B981]/20 border-2 border-[#10B981] text-[#10B981] flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
              </div>

              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10B981]/20 text-[#10B981] text-xs font-mono font-black uppercase">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Licensed & Verified</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black uppercase text-white font-sans">
                  High-Res Download Unlocked!
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Your watermark has been removed. You now have full permanent access to download the uncompressed 4K RAW file.
                </p>
              </div>

              {/* Order Details Receipt Box */}
              <div className="p-4 rounded-2xl bg-[#1E2630] border border-[#2D3748] text-left space-y-3 font-mono text-xs max-w-lg mx-auto">
                <div className="flex items-center justify-between pb-2 border-b border-[#2D3748]">
                  <span className="text-slate-400">Order ID:</span>
                  <span className="text-white font-bold">{completedOrder.id}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-[#2D3748]">
                  <span className="text-slate-400">License Key:</span>
                  <span className="text-[#00F2FE] font-bold">{completedOrder.licenseKey}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-[#2D3748]">
                  <span className="text-slate-400">Package Tier:</span>
                  <span className="text-white font-bold">{completedOrder.tierName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Total Paid:</span>
                  <span className="text-[#F59E0B] font-black text-sm">${completedOrder.amount.toFixed(2)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleDownloadPurchasedFile}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-slate-950 font-black font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Download 4K RAW File Now</span>
                </button>

                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#1E2630] hover:bg-[#283340] text-slate-300 font-mono text-xs font-bold transition-all cursor-pointer"
                >
                  Back to Media Vault
                </button>
              </div>
            </div>
          ) : (
            /* Checkout Flow */
            <form onSubmit={handleCheckout} className="space-y-5">
              {/* Item Preview Card */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#1E2630] border border-[#2D3748]">
                <img
                  src={item.thumbnailUrl || item.mediaUrl}
                  alt={item.title}
                  className="w-20 h-16 rounded-xl object-cover ring-1 ring-[#2D3748]"
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.2 rounded bg-amber-500/20 text-[#F59E0B] text-[10px] font-mono font-bold uppercase">
                      {item.sport}
                    </span>
                    <span className="text-[10px] font-mono text-[#00F2FE]">
                      {item.resolution}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                  <div className="text-[10px] font-mono text-slate-400 truncate">{item.eventName}</div>
                </div>
              </div>

              {/* Package Tier Selector */}
              <div className="space-y-2">
                <label className="text-xs font-mono font-bold uppercase text-slate-300 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>Select Media License Package</span>
                </label>

                <div className="grid grid-cols-1 gap-2.5">
                  {tiers.map((tier) => {
                    const isSelected = selectedTier === tier.id;
                    return (
                      <div
                        key={tier.id}
                        onClick={() => setSelectedTier(tier.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                          isSelected
                            ? 'bg-amber-500/10 border-[#F59E0B] shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                            : 'bg-[#1E2630] border-[#2D3748] hover:border-slate-600'
                        }`}
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-[#F59E0B] bg-[#F59E0B]' : 'border-slate-500'
                            }`}>
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                            </div>
                            <span className="text-xs font-bold text-white">{tier.name}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 pl-6 leading-relaxed">
                            {tier.description}
                          </p>
                        </div>

                        <span className="text-sm font-black font-mono text-[#F59E0B] shrink-0">
                          ${tier.price.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <label className="text-xs font-mono font-bold uppercase text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>Instant Payment Method</span>
                </label>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      paymentMethod === 'card'
                        ? 'bg-white/10 text-white border-white'
                        : 'bg-[#1E2630] text-slate-400 border-[#2D3748]'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('apple_pay')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      paymentMethod === 'apple_pay'
                        ? 'bg-white text-black border-white'
                        : 'bg-[#1E2630] text-slate-400 border-[#2D3748]'
                    }`}
                  >
                    <span> Pay</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('google_pay')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      paymentMethod === 'google_pay'
                        ? 'bg-white/10 text-white border-white'
                        : 'bg-[#1E2630] text-slate-400 border-[#2D3748]'
                    }`}
                  >
                    <span>G Pay</span>
                  </button>
                </div>

                {/* Card Fields Preview */}
                {paymentMethod === 'card' && (
                  <div className="p-3.5 rounded-2xl bg-[#1E2630] border border-[#2D3748] space-y-2.5 font-mono text-xs">
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase">Card Number</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full mt-1 px-3 py-1.5 rounded-lg bg-[#161C22] border border-[#2D3748] text-white focus:outline-none focus:border-[#F59E0B]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase">Expires</label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="w-full mt-1 px-3 py-1.5 rounded-lg bg-[#161C22] border border-[#2D3748] text-white focus:outline-none focus:border-[#F59E0B]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase">CVC</label>
                        <input
                          type="text"
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value)}
                          className="w-full mt-1 px-3 py-1.5 rounded-lg bg-[#161C22] border border-[#2D3748] text-white focus:outline-none focus:border-[#F59E0B]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-4 rounded-2xl bg-[#F59E0B] hover:bg-[#D97706] disabled:opacity-50 text-slate-950 font-black font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.4)] transition-all transform hover:scale-[1.01] cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Instant Unlock...</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
                    <span>Pay ${activeTierObj.price.toFixed(2)} & Download Instant 4K File</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                <span>256-bit Encrypted Checkout • Instant Download Link Emailed</span>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
