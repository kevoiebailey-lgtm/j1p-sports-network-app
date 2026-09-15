import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, DollarSign, X, Check, ShieldCheck, Zap, Sparkles, CreditCard, ArrowRight, AlertCircle } from 'lucide-react';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DonationModal: React.FC<DonationModalProps> = ({ isOpen, onClose }) => {
  const [selectedAmount, setSelectedAmount] = useState<number>(10);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [donorName, setDonorName] = useState<string>('');
  const [donorEmail, setDonorEmail] = useState<string>('');
  const [donorNote, setDonorNote] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const presetAmounts = [5, 10, 25, 50, 100];

  const handlePresetSelect = (amount: number) => {
    setSelectedAmount(amount);
    setIsCustom(false);
    setCustomAmount('');
    setErrorMessage(null);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsCustom(true);
    setCustomAmount(e.target.value);
    setErrorMessage(null);
  };

  const getFinalAmount = (): number => {
    if (isCustom) {
      const num = parseFloat(customAmount);
      return isNaN(num) || num <= 0 ? 0 : num;
    }
    return selectedAmount;
  };

  const handleDonate = async () => {
    const amount = getFinalAmount();
    if (amount < 1) {
      setErrorMessage('Please select or enter a valid donation amount ($1 minimum).');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/paypal/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'general',
          title: `Just1Play Supporter Donation ($${amount})`,
          totalAmount: amount,
          headCoachEmail: donorEmail || 'supporter@just1play.com',
          origin: window.location.origin,
        })
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to generate PayPal checkout session.');
      }
    } catch (err: any) {
      console.error('Donation checkout error:', err);
      setErrorMessage(err.message || 'Payment system connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentAmount = getFinalAmount();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-[#212A31] border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden"
        >
          {/* Neon Top Glow Accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#E5B868] via-cyan-400 to-[#E5B868]" />
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-[#E5B868]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-2xl bg-[#E5B868]/10 border border-[#E5B868]/30 text-[#E5B868]">
              <Heart className="w-6 h-6 fill-[#E5B868]/20" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E5B868]/10 border border-[#E5B868]/30 text-[#E5B868] text-[10px] font-mono font-bold uppercase mb-1">
                <Sparkles className="w-3 h-3" /> Stripe Payment Verification
              </div>
              <h2 className="text-xl sm:text-2xl font-black italic uppercase text-white tracking-tight">
                Quick Support & Test Donation
              </h2>
            </div>
          </div>

          <p className="text-xs text-slate-300 mb-6 leading-relaxed font-sans">
            Test and verify your live Stripe connection! Your donation directly empowers high school student-athletes with free scouting matrix profiles and highlight film exposure.
          </p>

          {/* Preset Amount Grid */}
          <div className="mb-6 space-y-2">
            <label className="block text-xs font-mono font-bold text-slate-300 uppercase">
              Select Donation Amount ($USD)
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {presetAmounts.map((amt) => {
                const isActive = !isCustom && selectedAmount === amt;
                return (
                  <button
                    key={amt}
                    onClick={() => handlePresetSelect(amt)}
                    className={`py-3 rounded-2xl text-sm font-black font-mono transition-all flex flex-col items-center justify-center cursor-pointer border ${
                      isActive
                        ? 'bg-[#E5B868] text-black border-[#E5B868] shadow-[0_0_15px_rgba(214,28,36,0.5)] scale-105'
                        : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <span>${amt}</span>
                    {amt === 10 && (
                      <span className="text-[8px] font-mono font-normal opacity-80 uppercase">Popular</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Amount Input */}
          <div className="mb-6">
            <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-2">
              Or Enter Custom Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-base">
                $
              </span>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="Enter custom donation amount (e.g. 15)"
                value={customAmount}
                onChange={handleCustomChange}
                className={`w-full bg-black/80 border rounded-2xl py-3 pl-9 pr-4 text-sm font-mono text-white focus:outline-none transition-all ${
                  isCustom ? 'border-[#E5B868] shadow-[0_0_10px_rgba(214,28,36,0.3)]' : 'border-white/15'
                }`}
              />
            </div>
          </div>

          {/* Optional Supporter Info */}
          <div className="space-y-3 mb-6 bg-white/5 p-4 rounded-2xl border border-white/10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                  Your Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Coach Jordan"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E5B868]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                  Email (for receipt)
                </label>
                <input
                  type="email"
                  placeholder="e.g. Jordan@example.com"
                  value={donorEmail}
                  onChange={(e) => setDonorEmail(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E5B868]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                Supporter Message / Note
              </label>
              <input
                type="text"
                placeholder="e.g. Keep up the great work supporting student athletes!"
                value={donorNote}
                onChange={(e) => setDonorNote(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E5B868]"
              />
            </div>
          </div>

          {/* Error Message Box */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submit Action Button */}
          <button
            onClick={handleDonate}
            disabled={loading || currentAmount < 1}
            className="w-full py-4 rounded-2xl bg-[#E5B868] hover:bg-[#B8141B] text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_25px_rgba(214,28,36,0.5)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Connecting to Stripe Checkout...
              </span>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                <span>Donate ${currentAmount} via Stripe</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          {/* Security Disclaimer */}
          <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] font-mono text-slate-400 text-center">
            <ShieldCheck className="w-3.5 h-3.5 text-[#E5B868]" />
            <span>256-Bit SSL Encrypted & Secured by Stripe Payments</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
