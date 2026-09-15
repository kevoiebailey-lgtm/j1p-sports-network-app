import React, { useState, useEffect } from 'react';
import { Camera, MapPin, DollarSign, Calendar, Sparkles, CheckCircle2, ShieldCheck, ArrowRight, CreditCard, Video, Lock } from 'lucide-react';
import { BentoCard } from '../BentoCard';
import { useAuth } from '../../context/AuthContext';
import { StripeElementsCheckoutModal } from './StripeElementsCheckoutModal';

interface QuoteResult {
  serviceType: string;
  locationState: string;
  isOutOfState: boolean;
  basePrice: number;
  travelFee: number;
  totalPrice: number;
  depositRequired: number;
}

export const MediaBookingCalculator: React.FC = () => {
  const { user, profile } = useAuth();
  
  const [serviceType, setServiceType] = useState<string>('Pregame & Full Game Coverage');
  const [basePrice, setBasePrice] = useState<number>(299);
  const [locationState, setLocationState] = useState<string>('NJ');
  const [eventDate, setEventDate] = useState<string>('2026-08-20');
  const [venueName, setVenueName] = useState<string>('Hoop Group Metro Arena, NJ');
  const [athleteName, setAthleteName] = useState<string>(profile?.displayName || 'Jayden Carter');

  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [loadingQuote, setLoadingQuote] = useState<boolean>(false);
  const [checkoutLoading, setCheckoutLoading] = useState<boolean>(false);
  const [showElementsModal, setShowElementsModal] = useState<boolean>(false);

  // Recalculate quote whenever options change
  useEffect(() => {
    fetchQuote();
  }, [serviceType, basePrice, locationState]);

  const fetchQuote = async () => {
    setLoadingQuote(true);
    try {
      const res = await fetch('/api/media-booking/calculate-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceType, basePrice, locationState })
      });
      const data = await res.json();
      if (data.success) {
        setQuote(data);
      }
    } catch (e) {
      console.error('Failed to fetch media quote:', e);
    } finally {
      setLoadingQuote(false);
    }
  };

  const handleSelectPackage = (packageTitle: string, price: number) => {
    setServiceType(packageTitle);
    setBasePrice(price);
  };

  const handleCheckout = async () => {
    if (!quote) return;
    setCheckoutLoading(true);

    try {
      const res = await fetch('/api/paypal/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'general',
          title: `Just1Play Media Booking: ${serviceType}`,
          totalAmount: quote.depositRequired,
          headCoachEmail: user?.email || profile?.email || 'booking@just1play.com',
          origin: window.location.origin,
        })
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Package Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Package 1 */}
        <div
          onClick={() => handleSelectPackage('Personal Highlight Reel Edit', 199)}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            serviceType === 'Personal Highlight Reel Edit'
              ? 'bg-[#E5B868]/10 border-[#E5B868] shadow-[0_0_20px_rgba(214,28,36,0.3)]'
              : 'bg-black/80 border-white/15 hover:border-white/30'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#E5B868] font-mono">
              PACKAGE 01
            </span>
            {serviceType === 'Personal Highlight Reel Edit' && <CheckCircle2 className="w-5 h-5 text-[#E5B868]" />}
          </div>
          <h4 className="text-base font-black text-white uppercase italic">Highlight Reel Edit</h4>
          <div className="text-xl font-black font-mono text-[#E5B868] my-2">$199</div>
          <p className="text-xs text-slate-400">
            Send raw video footage. We edit 60-90 sec high-impact recruiting mixtape with player isolation circle & custom beat.
          </p>
        </div>

        {/* Package 2 (Featured) */}
        <div
          onClick={() => handleSelectPackage('Pregame & Full Game Coverage', 299)}
          className={`p-5 rounded-2xl border cursor-pointer transition-all relative overflow-hidden ${
            serviceType === 'Pregame & Full Game Coverage'
              ? 'bg-[#E5B868]/15 border-2 border-[#E5B868] shadow-[0_0_25px_rgba(214,28,36,0.4)]'
              : 'bg-black/80 border-white/15 hover:border-white/30'
          }`}
        >
          <div className="absolute top-0 right-0 bg-[#E5B868] text-black font-black text-[9px] px-2 py-0.5 uppercase tracking-widest">
            MOST POPULAR
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#E5B868] font-mono">
              PACKAGE 02
            </span>
            {serviceType === 'Pregame & Full Game Coverage' && <CheckCircle2 className="w-5 h-5 text-[#E5B868]" />}
          </div>
          <h4 className="text-base font-black text-white uppercase italic">Full Game Videography</h4>
          <div className="text-xl font-black font-mono text-[#E5B868] my-2">$299</div>
          <p className="text-xs text-slate-300">
            On-site dedicated 4K videographer for pregame warmups, game action highlights, and social media clip drop.
          </p>
        </div>

        {/* Package 3 */}
        <div
          onClick={() => handleSelectPackage('Pro Combine Photo & Video Package', 499)}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            serviceType === 'Pro Combine Photo & Video Package'
              ? 'bg-[#E5B868]/10 border-[#E5B868] shadow-[0_0_20px_rgba(214,28,36,0.3)]'
              : 'bg-black/80 border-white/15 hover:border-white/30'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#E5B868] font-mono">
              PACKAGE 03
            </span>
            {serviceType === 'Pro Combine Photo & Video Package' && <CheckCircle2 className="w-5 h-5 text-[#E5B868]" />}
          </div>
          <h4 className="text-base font-black text-white uppercase italic">Combine Media Crew</h4>
          <div className="text-xl font-black font-mono text-[#E5B868] my-2">$499</div>
          <p className="text-xs text-slate-400">
            Full 2-person crew (Videographer + Photographer). High-res photo gallery + 4K mixtape + featured post on J1P Social Feed.
          </p>
        </div>

      </div>

      {/* Booking Form + Live Quote Summary */}
      <BentoCard glow className="bg-black/90 border border-white/15 p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Form Controls */}
        <div className="space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2 border-b border-white/10 pb-2">
            <MapPin className="w-4 h-4 text-[#E5B868]" />
            <span>Event & Travel Fee Parameters</span>
          </h3>

          <div>
            <label className="text-[11px] font-bold uppercase font-mono text-slate-400 mb-1 block">
              Event State Location (New Jersey vs Out-of-State)
            </label>
            <select
              value={locationState}
              onChange={(e) => setLocationState(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-black border border-white/20 text-xs text-white focus:outline-none focus:border-[#E5B868] font-bold uppercase cursor-pointer"
            >
              <option value="NJ">New Jersey (In-State - $0 Travel Fee)</option>
              <option value="NY">New York (Out-of-State - $150 Travel Fee)</option>
              <option value="PA">Pennsylvania (Out-of-State - $150 Travel Fee)</option>
              <option value="CT">Connecticut (Out-of-State - $150 Travel Fee)</option>
              <option value="MD">Maryland (Out-of-State - $150 Travel Fee)</option>
              <option value="FL">Florida (Out-of-State - $150 Travel Fee)</option>
              <option value="OTHER">Other State (Out-of-State - $150 Travel Fee)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase font-mono text-slate-400 mb-1 block">
                Athlete Name
              </label>
              <input
                type="text"
                value={athleteName}
                onChange={(e) => setAthleteName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black border border-white/20 text-xs text-white focus:outline-none focus:border-[#E5B868]"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase font-mono text-slate-400 mb-1 block">
                Target Game Date
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black border border-white/20 text-xs text-white focus:outline-none focus:border-[#E5B868]"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase font-mono text-slate-400 mb-1 block">
              Venue / Gym Location
            </label>
            <input
              type="text"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-black border border-white/20 text-xs text-white focus:outline-none focus:border-[#E5B868]"
            />
          </div>
        </div>

        {/* Live Quote Breakdown & Stripe Deposit Action */}
        <div className="bg-white/5 p-5 rounded-2xl border border-white/10 flex flex-col justify-between space-y-4">
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-[#E5B868] font-mono mb-3 flex items-center justify-between">
              <span>Instant Quote Calculation</span>
              <Sparkles className="w-4 h-4 text-[#E5B868]" />
            </h4>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between py-1 border-b border-white/10 text-slate-300">
                <span>Selected Package:</span>
                <span className="font-bold text-white">{serviceType}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-white/10 text-slate-300">
                <span>Base Package Price:</span>
                <span className="font-bold text-white">${quote?.basePrice || basePrice}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-white/10">
                <span className="text-slate-300 flex items-center gap-1">
                  <span>Out-of-State NJ Travel Fee:</span>
                  {quote?.isOutOfState && (
                    <span className="px-1.5 py-0.5 text-[9px] bg-amber-500/20 text-amber-400 font-bold rounded">
                      {locationState} State
                    </span>
                  )}
                </span>
                <span className={`font-bold ${quote?.isOutOfState ? 'text-amber-400' : 'text-[#E5B868]'}`}>
                  {quote?.isOutOfState ? '+$150' : '$0 (NJ In-State)'}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-white/20 text-sm font-black text-white">
                <span>TOTAL MEDIA FEE:</span>
                <span className="text-base text-[#E5B868]">${quote?.totalPrice || (basePrice + (locationState === 'NJ' ? 0 : 150))}</span>
              </div>

              <div className="p-3 rounded-xl bg-[#E5B868]/10 border border-[#E5B868]/30 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-white uppercase text-[11px]">Upfront Booking Deposit (50%)</div>
                  <div className="text-[10px] text-slate-400">Remaining balance due on game day</div>
                </div>
                <div className="text-lg font-black text-[#E5B868] font-mono">
                  ${quote?.depositRequired || Math.round((basePrice + (locationState === 'NJ' ? 0 : 150)) * 0.5)}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => setShowElementsModal(true)}
              className="w-full py-3 bg-[#E5B868] hover:bg-[#B8141B] text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(214,28,36,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <CreditCard className="w-4 h-4 stroke-[2.5]" />
              <span>Pay 50% Deposit via PayPal</span>
            </button>

            <button
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="w-full py-2 bg-[#212A31] hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>{checkoutLoading ? 'Redirecting to PayPal...' : 'Or Redirect to Hosted PayPal Checkout Page'}</span>
            </button>
          </div>
        </div>

      </BentoCard>

      {/* PayPal In-App Smart Checkout Modal */}
      <StripeElementsCheckoutModal
        isOpen={showElementsModal}
        onClose={() => setShowElementsModal(false)}
        details={{
          title: `Just1Play Media Deposit: ${serviceType}`,
          amount: quote?.depositRequired || Math.round((basePrice + (locationState === 'NJ' ? 0 : 150)) * 0.5),
          customerEmail: user?.email || profile?.email || 'booking@just1play.com',
          athleteName,
          serviceType,
          venueName,
          eventDate,
          metadata: {
            serviceType,
            locationState,
            isOutOfState: quote?.isOutOfState || false,
            totalPrice: quote?.totalPrice || (basePrice + (locationState === 'NJ' ? 0 : 150))
          }
        }}
        onSuccess={(piId) => {
          console.log('[PayPal Commerce] Deposit payment completed:', piId);
        }}
      />

    </div>
  );
};
