import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BentoCard } from '../BentoCard';
import { db } from '../../lib/firebase';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { 
  Camera, 
  Video, 
  MapPin, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  Sparkles, 
  Plane, 
  CreditCard, 
  Lock, 
  Loader2, 
  Clock, 
  AlertCircle,
  Film,
  Award,
  ShieldCheck,
  ChevronRight,
  Info
} from 'lucide-react';

export interface ServiceOption {
  id: string;
  name: string;
  category: 'VIDEOGRAPHY' | 'PHOTOGRAPHY' | 'BROADCAST' | 'EDITING';
  basePrice: number;
  description: string;
  features: string[];
}

export const MEDIA_SERVICES: ServiceOption[] = [
  {
    id: 'pregame-vid',
    name: 'Pregame & In-Game Videography',
    category: 'VIDEOGRAPHY',
    basePrice: 299,
    description: '4K ground-level camera coverage, mic’d up audio, and 60-second social clip.',
    features: ['4K Raw Footage Delivery', 'Mic’d Up Audio Clip', '48-Hour Cloud Link Delivery']
  },
  {
    id: 'game-photo',
    name: 'Action DSLR Photography',
    category: 'PHOTOGRAPHY',
    basePrice: 199,
    description: 'High-speed sports action shots, color-graded, high-res download gallery.',
    features: ['25+ Color-Graded Photos', 'Full Resolution Downloads', 'Direct Scout Gallery Access']
  },
  {
    id: 'highlight-reel',
    name: 'Scout Highlight Reel Mix',
    category: 'EDITING',
    basePrice: 349,
    description: 'Custom highlight tape with stat overlays, spotlight circle, and NCAA music mix.',
    features: ['Stat Overlay Graphics', 'Spotlight Player Indicator', '2-Minute NCAA Scout Edit']
  },
  {
    id: 'full-broadcast',
    name: 'Full Game Live Broadcast',
    category: 'BROADCAST',
    basePrice: 499,
    description: 'Multi-camera stream setup with scoreboard overlay, replay commentary, & full game VOD.',
    features: ['Multi-Cam HD Switcher', 'Live Scoreboard Graphics', 'Instant Replay Capability']
  }
];

export const US_STATES = [
  { code: 'NJ', name: 'New Jersey', isHomeState: true },
  { code: 'NY', name: 'New York', isHomeState: false },
  { code: 'PA', name: 'Pennsylvania', isHomeState: false },
  { code: 'CT', name: 'Connecticut', isHomeState: false },
  { code: 'FL', name: 'Florida', isHomeState: false },
  { code: 'CA', name: 'California', isHomeState: false },
  { code: 'TX', name: 'Texas', isHomeState: false },
  { code: 'MD', name: 'Maryland', isHomeState: false },
  { code: 'VA', name: 'Virginia', isHomeState: false },
  { code: 'GA', name: 'Georgia', isHomeState: false },
  { code: 'NC', name: 'North Carolina', isHomeState: false },
  { code: 'OH', name: 'Ohio', isHomeState: false }
];

export const ServiceBookingFlow: React.FC = () => {
  const { user, profile } = useAuth();

  // Form State
  const [selectedServiceId, setSelectedServiceId] = useState<string>(MEDIA_SERVICES[0].id);
  const [bookingDate, setBookingDate] = useState<string>('2026-08-25');
  const [venueName, setVenueName] = useState<string>('Bergen Catholic Sports Complex');
  const [locationCity, setLocationCity] = useState<string>('Oradell');
  const [stateLocation, setStateLocation] = useState<string>('NJ'); // Default NJ
  const [athleteName, setAthleteName] = useState<string>(profile?.displayName || user?.displayName || 'Marcus Vance');
  const [contactEmail, setContactEmail] = useState<string>(profile?.email || user?.email || 'mvance@athlete.com');
  const [specialRequests, setSpecialRequests] = useState<string>('');

  // UI Flow States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);

  const selectedService = MEDIA_SERVICES.find(s => s.id === selectedServiceId) || MEDIA_SERVICES[0];

  // ==========================================
  // DYNAMIC PRICING & TRAVEL FEE CALCULATIONS
  // ==========================================
  // Out-of-State travel fee is exactly $50 if stateLocation is not NJ / New Jersey
  const isOutOfState = stateLocation.toUpperCase() !== 'NJ' && stateLocation.toUpperCase() !== 'NEW JERSEY';
  const travelFee = isOutOfState ? 50 : 0;
  const basePrice = selectedService.basePrice;
  const totalPackagePrice = basePrice + travelFee;
  
  // 50% Upfront Deposit Logic
  const depositRate = 0.5; // 50%
  const depositDueToday = totalPackagePrice * depositRate;
  const remainingBalanceAtGame = totalPackagePrice - depositDueToday;

  // Handle URL callback params (e.g. return from PayPal)
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get('payment') === 'success') {
      const mockBookingId = query.get('bookingId') || `bk-${Date.now()}`;
      const newBk = {
        id: mockBookingId,
        serviceType: query.get('service') || selectedService.name,
        totalPrice: Number(query.get('amount')) || totalPackagePrice,
        depositAmount: Number(query.get('deposit')) || depositDueToday,
        status: 'Deposit Paid',
        stateLocation: query.get('state') || stateLocation,
        createdAt: new Date().toLocaleDateString()
      };
      setRecentBookings(prev => [newBk, ...prev]);
    }
  }, []);

  // Submit Handler: Triggers Backend PayPal Checkout Session
  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      setLoadingStep('Saving booking specs & calculating deposit...');

      // 1. Save initial record to Firestore
      const bookingData = {
        userId: user?.uid || profile?.uid || 'guest-user',
        userName: athleteName,
        userEmail: contactEmail,
        serviceType: selectedService.name,
        bookingDate,
        venueName,
        locationCity,
        stateLocation,
        basePrice,
        travelFee,
        totalPrice: totalPackagePrice,
        depositAmount: depositDueToday,
        remainingBalance: remainingBalanceAtGame,
        status: 'Pending Deposit',
        specialRequests,
        createdAt: new Date().toISOString()
      };

      let createdBookingId = `bk-${Date.now()}`;
      try {
        if (user) {
          const docRef = await addDoc(collection(db, 'bookings'), bookingData);
          createdBookingId = docRef.id;
        }
      } catch (fErr) {
        console.warn('Firestore write notice (using fallback ID):', fErr);
      }

      setLoadingStep('Connecting to PayPal Checkout Session...');

      // 2. Call backend server API / Cloud Function endpoint
      const response = await fetch('/api/create-booking-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          serviceType: selectedService.name,
          basePrice,
          stateLocation,
          userId: user?.uid || 'guest-user',
          userEmail: contactEmail,
          bookingDate,
          venueName,
          bookingId: createdBookingId,
          athleteName
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate payment session');
      }

      setLoadingStep('Redirecting to Secure PayPal Checkout...');

      // 3. Redirect window to returned PayPal Session URL
      if (data.checkoutUrl || data.url) {
        const destinationUrl = data.checkoutUrl || data.url;
        window.location.href = destinationUrl;
      } else {
        throw new Error('No checkout URL returned from server');
      }

    } catch (err: any) {
      console.error('Payment checkout initiation error:', err);
      setErrorMsg(err.message || 'Unable to connect to PayPal checkout server.');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-[#050505] border border-white/10 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-[#E5B868] text-black rounded-sm shadow-[0_0_12px_rgba(214,28,36,0.5)]">
                MEDIA SERVICES ENGINE
              </span>
              <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-slate-600 text-black rounded-sm">
                50% DEPOSIT BOOKING
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black italic tracking-tight text-white uppercase font-sans">
              BOOKING & PAYPAL CHECKOUT<span className="text-[#E5B868] drop-shadow-[0_0_10px_#E5B868]">.</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
              Select your media package and game location. Out-of-state games automatically include a $50 travel fee.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowConfigModal(true)}
              className="px-3.5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/15 rounded-2xl text-xs font-mono font-bold text-slate-300 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Info className="w-4 h-4 text-[#E5B868]" />
              <span>PayPal & Backend Specs</span>
            </button>
          </div>
        </div>
      </div>

      {/* TWO-COLUMN BENTO BOX LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Service Selection, Game Details & Location (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <BentoCard
            title="1. Select Media Service"
            subtitle="Choose videography, action photography, or live stream"
            icon={<Video className="w-5 h-5 text-[#E5B868]" />}
            glow
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
              {MEDIA_SERVICES.map((pkg) => {
                const isSelected = pkg.id === selectedServiceId;
                return (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedServiceId(pkg.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#E5B868]/10 border-[#E5B868] shadow-[0_0_20px_rgba(214,28,36,0.25)]'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-sm ${
                          isSelected ? 'bg-[#E5B868] text-black' : 'bg-white/10 text-slate-300'
                        }`}>
                          {pkg.category}
                        </span>
                        <span className="text-sm font-mono font-black text-[#E5B868]">
                          ${pkg.basePrice}
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-white uppercase mb-1">{pkg.name}</h4>
                      <p className="text-[11px] text-slate-400 leading-tight mb-3">{pkg.description}</p>
                    </div>

                    <ul className="space-y-1 pt-2.5 border-t border-white/10 text-[10px] text-slate-300">
                      {pkg.features.map((feat, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-[#E5B868] shrink-0 stroke-[2]" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            {/* Game Details & Location Form */}
            <form onSubmit={handleProceedToPayment} className="space-y-4 pt-4 border-t border-white/10">
              <h4 className="text-xs font-black uppercase text-[#E5B868] tracking-wider flex items-center gap-1.5 font-mono">
                <MapPin className="w-4 h-4" />
                2. Event Details & Travel Location
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[11px] font-black text-slate-300 uppercase block mb-1">Athlete / Team Name</label>
                  <input
                    type="text"
                    required
                    value={athleteName}
                    onChange={(e) => setAthleteName(e.target.value)}
                    placeholder="e.g. Marcus Vance"
                    className="w-full bg-[#121212] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#E5B868] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-300 uppercase block mb-1">Contact Email</label>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="e.g. athlete@domain.com"
                    className="w-full bg-[#121212] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#E5B868] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-300 uppercase block mb-1">Event Date</label>
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full bg-[#121212] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#E5B868] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-300 uppercase block mb-1">Venue / Gym Facility</label>
                  <input
                    type="text"
                    required
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    placeholder="e.g. MetLife Stadium Field 2"
                    className="w-full bg-[#121212] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#E5B868] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-300 uppercase block mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={locationCity}
                    onChange={(e) => setLocationCity(e.target.value)}
                    placeholder="e.g. Oradell, Brooklyn, Philadelphia"
                    className="w-full bg-[#121212] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#E5B868] focus:outline-none"
                  />
                </div>

                {/* DYNAMIC TRAVEL FEE STATE SELECTOR */}
                <div>
                  <label className="text-[11px] font-black text-slate-300 uppercase block mb-1 flex items-center justify-between">
                    <span>State Location</span>
                    <span className="text-[10px] text-[#E5B868] font-normal">NJ = $0 Travel Fee</span>
                  </label>
                  <select
                    value={stateLocation}
                    onChange={(e) => setStateLocation(e.target.value)}
                    className="w-full bg-[#121212] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#E5B868] focus:outline-none font-bold cursor-pointer"
                  >
                    {US_STATES.map((st) => (
                      <option key={st.code} value={st.code}>
                        {st.name} ({st.isHomeState ? 'Home State - $0 Travel' : 'Out-of-State +$50 Travel'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-300 uppercase block mb-1">Special Game Instructions (Optional)</label>
                <textarea
                  rows={2}
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="e.g., Focus on #7 wide receiver targets, record post-game interview..."
                  className="w-full bg-[#121212] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#E5B868] focus:outline-none"
                />
              </div>

              {/* Dynamic Location Fee Alert Banner */}
              {isOutOfState ? (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2.5 animate-fadeIn">
                  <Plane className="w-5 h-5 shrink-0 text-amber-400" />
                  <div>
                    <span className="font-bold uppercase block text-amber-400">+$50 Out-of-State Travel Fee Applied</span>
                    <span>Game location is in <strong>{stateLocation}</strong> (Outside NJ). Travel expense automatically added to invoice.</span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-[#E5B868]/10 border border-[#E5B868]/30 text-[#E5B868] text-xs flex items-center gap-2.5 animate-fadeIn">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-[#E5B868]" />
                  <div>
                    <span className="font-bold uppercase block text-[#E5B868]">In-State New Jersey Event ($0 Travel)</span>
                    <span>No out-of-state travel fee required for New Jersey venues.</span>
                  </div>
                </div>
              )}

              {/* Error Message Display */}
              {errorMsg && (
                <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* PROCEED TO PAYMENT BUTTON */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-[#E5B868] hover:bg-[#B8141B] text-black font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl shadow-[0_0_30px_rgba(214,28,36,0.5)] transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-black" />
                    <span>{loadingStep || 'PROCESSING CHECKOUT...'}</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5 stroke-[2]" />
                    <span>PROCEED TO PAYMENT (${depositDueToday.toFixed(2)} DEPOSIT DUE TODAY)</span>
                    <ChevronRight className="w-4 h-4 stroke-[3]" />
                  </>
                )}
              </button>
            </form>
          </BentoCard>
        </div>

        {/* RIGHT COLUMN: Dynamic Order Summary Glass Card (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          <BentoCard
            title="3. Dynamic Order Summary"
            subtitle="Transparent deposit & travel fee breakdown"
            icon={<DollarSign className="w-5 h-5 text-[#E5B868]" />}
            glow
          >
            <div className="space-y-4">
              
              {/* Summary Items Table */}
              <div className="p-4 rounded-2xl bg-[#121212] border border-white/10 space-y-3 font-mono">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-sans">Service:</span>
                  <span className="font-bold text-white text-right font-sans">{selectedService.name}</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-sans">Base Package Price:</span>
                  <span className="font-bold text-slate-200">${basePrice.toFixed(2)}</span>
                </div>

                {/* OUT-OF-STATE TRAVEL FEE LINE ITEM */}
                <div className="flex justify-between items-center text-xs pt-2 border-t border-white/10">
                  <span className="text-slate-400 font-sans flex items-center gap-1.5">
                    <span>Travel Fee ({stateLocation}):</span>
                    {isOutOfState ? (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded font-mono">
                        OUT OF STATE
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-[#E5B868]/20 text-[#E5B868] border border-[#E5B868]/30 rounded font-mono">
                        IN-STATE NJ
                      </span>
                    )}
                  </span>
                  <span className={`font-bold ${isOutOfState ? 'text-amber-400' : 'text-[#E5B868]'}`}>
                    {isOutOfState ? `+$${travelFee.toFixed(2)}` : '$0.00'}
                  </span>
                </div>

                <div className="border-t border-white/10 pt-3 flex justify-between items-center">
                  <span className="text-xs font-black text-white uppercase font-sans">Total Package Value:</span>
                  <span className="text-base font-black text-white">${totalPackagePrice.toFixed(2)}</span>
                </div>
              </div>

              {/* HIGHLIGHTED 50% DEPOSIT DUE TODAY CARD */}
              <div className="p-4 rounded-2xl bg-[#050505] border-2 border-[#E5B868] space-y-3 shadow-[0_0_25px_rgba(214,28,36,0.2)]">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-black uppercase text-[#E5B868] tracking-wider block">
                      TOTAL DUE TODAY (50% DEPOSIT)
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Locks videographer & equipment
                    </span>
                  </div>
                  <span className="text-3xl font-black font-mono text-[#E5B868] drop-shadow-[0_0_10px_rgba(214,28,36,0.5)]">
                    ${depositDueToday.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-300 border-t border-white/10 pt-2.5 font-mono">
                  <span className="font-sans">Remaining 50% Due On Game Day:</span>
                  <span className="font-bold text-white">${remainingBalanceAtGame.toFixed(2)}</span>
                </div>
              </div>

              {/* Guarantees Box */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-[11px] text-slate-300 space-y-1.5">
                <div className="flex items-center gap-2 text-white font-bold">
                  <ShieldCheck className="w-4 h-4 text-[#E5B868]" />
                  <span>Just1Play Booking Guarantee</span>
                </div>
                <p className="text-slate-400 leading-tight">
                  • 100% Refundable deposit up to 48 hours prior to game time.
                </p>
                <p className="text-slate-400 leading-tight">
                  • Raw footage uploaded to private cloud link within 48 hours.
                </p>
              </div>

            </div>
          </BentoCard>

          {/* ACTIVE BOOKING HISTORY LEDGER */}
          <BentoCard
            title="Your Active Media Bookings"
            subtitle="Track scheduled videographers and payment status"
            icon={<Clock className="w-5 h-5 text-[#E5B868]" />}
          >
            {recentBookings.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {recentBookings.map((bk) => (
                  <div key={bk.id} className="p-3.5 rounded-2xl bg-[#121212] border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-white">{bk.serviceType}</span>
                      <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-[#E5B868]/20 text-[#E5B868] border border-[#E5B868]/40">
                        {bk.status}
                      </span>
                    </div>

                    <div className="flex justify-between text-[11px] font-mono text-slate-300 pt-1 border-t border-white/10">
                      <span>Total: ${Number(bk.totalPrice).toFixed(2)}</span>
                      <span className="text-[#E5B868] font-bold">Deposit Paid: ${Number(bk.depositAmount).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-5 text-center rounded-2xl bg-white/5 border border-dashed border-white/10 space-y-1">
                <p className="text-xs font-bold text-slate-300 uppercase">No Active Bookings Yet</p>
                <p className="text-[11px] text-slate-400">Complete the form to schedule your dedicated videographer.</p>
              </div>
            )}
          </BentoCard>

        </div>
      </div>

      {/* STRIPE & CONFIG SPECS MODAL */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#212A31] border border-white/20 rounded-3xl p-6 max-w-lg w-full space-y-4 text-xs text-slate-300 relative">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <span className="font-black text-white text-sm uppercase flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#E5B868]" />
                Backend & PayPal Security Architecture
              </span>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white font-mono font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 leading-relaxed">
              <p>
                <strong className="text-white">1. Server-Side Execution:</strong> All price calculations, travel fees ($50 out-of-state), and PayPal Checkout Session creation occur securely on the backend server or Firebase Cloud Functions.
              </p>
              <p>
                <strong className="text-white">2. Secret Key Configuration:</strong> Set <code className="bg-black px-1.5 py-0.5 text-[#E5B868] rounded">PAYPAL_CLIENT_SECRET</code> in your environment or via Firebase Secret Manager:
              </p>
              <pre className="bg-black/80 p-2.5 rounded-xl border border-white/10 text-[10px] text-cyan-300 font-mono">
                firebase functions:secrets:set PAYPAL_CLIENT_SECRET
              </pre>
              <p>
                <strong className="text-white">3. Webhooks:</strong> The <code className="bg-black px-1.5 py-0.5 text-[#E5B868] rounded">paypalWebhook</code> Cloud Function handles <code className="text-white">PAYMENT.CAPTURE.COMPLETED</code> events and automatically updates Firestore booking records to <span className="text-[#E5B868] font-bold">"Deposit Paid"</span>.
              </p>
            </div>

            <button
              onClick={() => setShowConfigModal(false)}
              className="w-full py-2.5 bg-[#E5B868] text-black font-black uppercase rounded-xl text-xs"
            >
              Close Architecture View
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
