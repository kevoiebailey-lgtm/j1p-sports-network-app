import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Wallet,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Percent,
  TrendingUp,
  Building2,
  Mail,
  Zap,
  Sliders,
  Sparkles,
  ArrowRight,
  Info,
  Layers,
  FileCheck2,
  RefreshCw,
  ExternalLink,
  Lock,
  Calculator,
  Download,
  Play
} from 'lucide-react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, sanitizeFirestorePayload } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export interface CreatorPayoutSettings {
  paypalMerchantEmail: string;
  paypalMerchantId?: string;
  paypalAccountType: 'business' | 'personal';
  defaultPhotoPrice: number;
  defaultVideoPrice: number;
  defaultAlbumPrice: number;
  autoPayoutEnabled: boolean;
  payoutCurrency: string;
  payoutStatus: 'active' | 'unconfigured' | 'pending';
  notifyOnSale: boolean;
  taxIdentificationNumber?: string;
  updatedAt?: any;
}

interface CreatorPayoutConfigModuleProps {
  onSettingsSaved?: (settings: CreatorPayoutSettings) => void;
  className?: string;
}

export const CreatorPayoutConfigModule: React.FC<CreatorPayoutConfigModuleProps> = ({
  onSettingsSaved,
  className = ''
}) => {
  const { user, profile } = useAuth();
  const { showToast } = useToast();

  // Loading & submission state
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [testSimulating, setTestSimulating] = useState(false);
  const [testSimResult, setTestSimResult] = useState<{
    simulatedGross: number;
    creatorPayout: number;
    platformFee: number;
    targetEmail: string;
    timestamp: string;
  } | null>(null);

  // Form fields
  const [paypalMerchantEmail, setPaypalMerchantEmail] = useState('');
  const [paypalMerchantId, setPaypalMerchantId] = useState('');
  const [paypalAccountType, setPaypalAccountType] = useState<'business' | 'personal'>('business');
  const [defaultPhotoPrice, setDefaultPhotoPrice] = useState<string>('9.99');
  const [defaultVideoPrice, setDefaultVideoPrice] = useState<string>('19.99');
  const [defaultAlbumPrice, setDefaultAlbumPrice] = useState<string>('49.99');
  const [autoPayoutEnabled, setAutoPayoutEnabled] = useState(true);
  const [notifyOnSale, setNotifyOnSale] = useState(true);
  const [payoutCurrency, setPayoutCurrency] = useState('USD');
  const [taxId, setTaxId] = useState('');

  // Interactive calculator state
  const [calcPhotoCount, setCalcPhotoCount] = useState(25);
  const [calcUnitPrice, setCalcUnitPrice] = useState(9.99);

  // Constants
  const CREATOR_SPLIT_PERCENT = 85;
  const PLATFORM_SPLIT_PERCENT = 15;

  // Load existing payout settings from Firestore
  useEffect(() => {
    async function loadSettings() {
      if (!db || !user?.uid) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Check both user doc and creator_payout_profiles doc
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          const emailVal = data.paypalMerchantEmail || data.paypalEmail || user.email || '';
          setPaypalMerchantEmail(emailVal);
          setPaypalMerchantId(data.paypalMerchantId || '');
          setPaypalAccountType(data.paypalAccountType || 'business');
          setDefaultPhotoPrice(data.defaultPhotoPrice?.toString() || '9.99');
          setDefaultVideoPrice(data.defaultVideoPrice?.toString() || '19.99');
          setDefaultAlbumPrice(data.defaultAlbumPrice?.toString() || '49.99');
          setAutoPayoutEnabled(data.autoPayoutEnabled !== undefined ? data.autoPayoutEnabled : true);
          setNotifyOnSale(data.notifyOnSale !== undefined ? data.notifyOnSale : true);
          setPayoutCurrency(data.payoutCurrency || 'USD');
          setTaxId(data.taxIdentificationNumber || '');
        } else if (profile) {
          setPaypalMerchantEmail(profile.paypalEmail || user.email || '');
        }
      } catch (err) {
        console.warn('Error loading payout settings:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [user?.uid, profile]);

  const isValidEmail = (emailStr: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr.trim());
  };

  const isConfigured = Boolean(paypalMerchantEmail && isValidEmail(paypalMerchantEmail));

  // Save Payout Configuration to Firestore
  const handleSaveConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!db || !user?.uid) return;

    const trimmedEmail = paypalMerchantEmail.trim();

    if (!trimmedEmail) {
      showToast('error', 'PayPal Email Required', 'Please provide a valid PayPal merchant email to receive revenue splits.');
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      showToast('error', 'Invalid Email Format', 'Please enter a valid email address.');
      return;
    }

    setIsSaving(true);
    try {
      const parsedPhotoPrice = parseFloat(defaultPhotoPrice) || 9.99;
      const parsedVideoPrice = parseFloat(defaultVideoPrice) || 19.99;
      const parsedAlbumPrice = parseFloat(defaultAlbumPrice) || 49.99;

      const payload: Partial<CreatorPayoutSettings> = {
        paypalMerchantEmail: trimmedEmail,
        paypalMerchantId: paypalMerchantId.trim() || '',
        paypalAccountType,
        defaultPhotoPrice: parsedPhotoPrice,
        defaultVideoPrice: parsedVideoPrice,
        defaultAlbumPrice: parsedAlbumPrice,
        autoPayoutEnabled: autoPayoutEnabled !== false,
        notifyOnSale: notifyOnSale !== false,
        payoutCurrency: payoutCurrency || 'USD',
        taxIdentificationNumber: taxId.trim() || '',
        payoutStatus: 'active',
        updatedAt: serverTimestamp()
      };

      // 1. Update user profile document
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, sanitizeFirestorePayload({
        ...payload,
        paypalEmail: trimmedEmail // Keep backward compatibility
      }), { merge: true });

      // 2. Update dedicated creator payout profile collection
      const payoutProfileRef = doc(db, 'creator_payout_profiles', user.uid);
      await setDoc(payoutProfileRef, sanitizeFirestorePayload({
        creatorUid: user.uid,
        creatorName: profile?.displayName || user.displayName || 'Content Creator',
        creatorEmail: user.email || '',
        ...payload
      }), { merge: true });

      showToast(
        'success',
        'Payout Settings Activated',
        `Your 85% revenue split will be automatically routed to ${trimmedEmail} via PayPal.`
      );

      if (onSettingsSaved) {
        onSettingsSaved(payload as CreatorPayoutSettings);
      }
    } catch (err: any) {
      console.error('Error saving payout configuration:', err);
      showToast('error', 'Configuration Failed', err?.message || 'Could not save payout settings.');
    } finally {
      setIsSaving(false);
    }
  };

  // Run a real-time simulated purchase test
  const handleRunSimulation = () => {
    if (!isValidEmail(paypalMerchantEmail)) {
      showToast('error', 'Setup Required', 'Enter a valid PayPal email before running a simulation test.');
      return;
    }

    setTestSimulating(true);
    setTimeout(() => {
      const gross = parseFloat(defaultPhotoPrice) || 9.99;
      const platformFee = Math.round(gross * (PLATFORM_SPLIT_PERCENT / 100) * 100) / 100;
      const creatorNet = Math.round((gross - platformFee) * 100) / 100;

      setTestSimResult({
        simulatedGross: gross,
        creatorPayout: creatorNet,
        platformFee,
        targetEmail: paypalMerchantEmail.trim(),
        timestamp: new Date().toLocaleTimeString()
      });
      setTestSimulating(false);
      showToast('info', 'Simulation Complete', `Simulated $${gross.toFixed(2)} sale: $${creatorNet.toFixed(2)} instantly allocated to ${paypalMerchantEmail.trim()}`);
    }, 600);
  };

  // Calculator computations
  const totalSimVolume = calcPhotoCount * calcUnitPrice;
  const totalSimCreator = Math.round(totalSimVolume * (CREATOR_SPLIT_PERCENT / 100) * 100) / 100;
  const totalSimPlatform = Math.round((totalSimVolume - totalSimCreator) * 100) / 100;

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 font-mono text-xs flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-rose-400" />
        <span>Loading Payout Configuration...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-8 font-sans ${className}`}>
      
      {/* 1. MODULE BANNER */}
      <div className="relative rounded-3xl bg-gradient-to-r from-[#171F2C] via-[#1E293B] to-[#171F2C] border border-rose-500/30 p-6 sm:p-8 overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-mono font-bold uppercase tracking-wider">
              <DollarSign className="w-4 h-4 text-rose-400" />
              <span>PAYPAL REVENUE SHARE &amp; SETTLEMENT ENGINE</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight text-white font-sans">
              Creator <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-amber-400">Payout Configuration</span>
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 font-mono max-w-2xl leading-relaxed">
              Link your PayPal merchant account to unlock direct 85% revenue splits on all digital photo sales, high-definition highlight reels, and full tournament digital album passes.
            </p>
          </div>

          {/* Status Chip */}
          <div className="shrink-0 flex items-center gap-3">
            <div className={`px-4 py-3 rounded-2xl border flex items-center gap-3 backdrop-blur-md ${
              isConfigured
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/40 text-amber-300'
            }`}>
              <div className={`w-3 h-3 rounded-full ${isConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <div>
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  Payout Status
                </div>
                <div className="text-xs font-mono font-black uppercase">
                  {isConfigured ? 'Direct 85% Split Active' : 'Setup Required'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN CONFIGURATION GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: PAYPAL ACCOUNT SETUP FORM (7 COLS) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSaveConfig} className="rounded-3xl bg-[#171F2C] border border-white/15 p-6 sm:p-7 space-y-6 shadow-xl">
            
            <div className="border-b border-white/10 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/40 text-blue-400 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase text-white font-sans">
                    PayPal Merchant Credentials
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Direct automated settlement destination
                  </p>
                </div>
              </div>
              
              <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 font-bold uppercase">
                Instant Transfer
              </span>
            </div>

            {/* Merchant Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold uppercase text-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-rose-400" />
                  PayPal Merchant / Payout Email <span className="text-rose-400">*</span>
                </span>
                {isValidEmail(paypalMerchantEmail) && (
                  <span className="text-emerald-400 text-[11px] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Validated
                  </span>
                )}
              </label>
              <input
                type="email"
                required
                value={paypalMerchantEmail}
                onChange={(e) => setPaypalMerchantEmail(e.target.value)}
                placeholder="creator.studios@gmail.com"
                className="w-full px-4 py-3 bg-black/70 border border-white/20 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-400 font-mono shadow-inner transition-colors"
              />
              <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
                When athletes and parents purchase your photos, 85% of each sale is instantly credited and recorded for payout to this PayPal account.
              </p>
            </div>

            {/* Account Type Selector */}
            <div className="space-y-2">
              <label className="text-xs font-mono font-bold uppercase text-slate-200 block">
                PayPal Account Classification
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaypalAccountType('business')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    paypalAccountType === 'business'
                      ? 'bg-rose-500/20 border-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                      : 'bg-black/40 border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs font-mono mb-1">
                    <Building2 className="w-4 h-4 text-rose-400" />
                    <span>Business Account</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono leading-tight">
                    Recommended for high-volume tournament photo studios.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaypalAccountType('personal')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    paypalAccountType === 'personal'
                      ? 'bg-rose-500/20 border-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                      : 'bg-black/40 border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs font-mono mb-1">
                    <Wallet className="w-4 h-4 text-amber-400" />
                    <span>Personal Account</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono leading-tight">
                    Suitable for individual freelance sports photographers.
                  </p>
                </button>
              </div>
            </div>

            {/* Optional PayPal Merchant ID / Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold uppercase text-slate-300 block">
                  PayPal Merchant ID <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={paypalMerchantId}
                  onChange={(e) => setPaypalMerchantId(e.target.value)}
                  placeholder="e.g. 9ABCXYZ12345"
                  className="w-full px-3.5 py-2.5 bg-black/70 border border-white/15 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-400 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold uppercase text-slate-300 block">
                  Payout Currency
                </label>
                <select
                  value={payoutCurrency}
                  onChange={(e) => setPayoutCurrency(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black/70 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-rose-400 font-mono cursor-pointer"
                >
                  <option value="USD">USD ($ United States Dollar)</option>
                  <option value="CAD">CAD ($ Canadian Dollar)</option>
                  <option value="EUR">EUR (€ Euro)</option>
                  <option value="GBP">GBP (£ British Pound)</option>
                </select>
              </div>
            </div>

            {/* Default Digital Product Pricing Matrix */}
            <div className="border-t border-white/10 pt-5 space-y-4">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-mono font-bold uppercase text-white">
                  Default Digital Product Pricing Matrix
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Single Photo */}
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                  <div className="text-[10px] font-mono font-bold uppercase text-slate-400">
                    Single 4K Photo
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-xs">$</span>
                    <input
                      type="number"
                      step="0.50"
                      min="1.00"
                      value={defaultPhotoPrice}
                      onChange={(e) => setDefaultPhotoPrice(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 bg-black border border-white/20 rounded-lg text-xs font-mono font-bold text-white focus:outline-none focus:border-rose-400"
                    />
                  </div>
                  <div className="text-[10px] font-mono text-emerald-400">
                    You keep: ${( (parseFloat(defaultPhotoPrice) || 0) * 0.85 ).toFixed(2)}
                  </div>
                </div>

                {/* Highlight Reel */}
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                  <div className="text-[10px] font-mono font-bold uppercase text-slate-400">
                    Video Highlight Reel
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-xs">$</span>
                    <input
                      type="number"
                      step="1.00"
                      min="2.00"
                      value={defaultVideoPrice}
                      onChange={(e) => setDefaultVideoPrice(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 bg-black border border-white/20 rounded-lg text-xs font-mono font-bold text-white focus:outline-none focus:border-rose-400"
                    />
                  </div>
                  <div className="text-[10px] font-mono text-emerald-400">
                    You keep: ${( (parseFloat(defaultVideoPrice) || 0) * 0.85 ).toFixed(2)}
                  </div>
                </div>

                {/* Full Album Pass */}
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                  <div className="text-[10px] font-mono font-bold uppercase text-slate-400">
                    Full Album Pass
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-xs">$</span>
                    <input
                      type="number"
                      step="2.50"
                      min="5.00"
                      value={defaultAlbumPrice}
                      onChange={(e) => setDefaultAlbumPrice(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 bg-black border border-white/20 rounded-lg text-xs font-mono font-bold text-white focus:outline-none focus:border-rose-400"
                    />
                  </div>
                  <div className="text-[10px] font-mono text-emerald-400">
                    You keep: ${( (parseFloat(defaultAlbumPrice) || 0) * 0.85 ).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Notification & Auto Payout Toggles */}
            <div className="border-t border-white/10 pt-4 space-y-3">
              <label className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/10 cursor-pointer hover:bg-black/60 transition-colors">
                <div className="space-y-0.5">
                  <span className="text-xs font-mono font-bold text-white block">
                    Instant Automated PayPal Settlement
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 block">
                    Route 85% revenue shares on every individual purchase automatically.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={autoPayoutEnabled}
                  onChange={(e) => setAutoPayoutEnabled(e.target.checked)}
                  className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/10 cursor-pointer hover:bg-black/60 transition-colors">
                <div className="space-y-0.5">
                  <span className="text-xs font-mono font-bold text-white block">
                    Email Sale &amp; Payout Notifications
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 block">
                    Receive an immediate email receipt when an athlete unlocks your photo asset.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={notifyOnSale}
                  onChange={(e) => setNotifyOnSale(e.target.checked)}
                  className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                />
              </label>
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-4 bg-gradient-to-r from-rose-500 via-amber-400 to-rose-500 hover:from-rose-400 hover:to-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-[0_0_25px_rgba(244,63,94,0.35)] cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving Configurations...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                    <span>Save &amp; Activate PayPal Payout Engine</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: REVENUE SIMULATOR, SPLIT BREAKDOWN & SECURITY GUARANTEE (5 COLS) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* 1. INTERACTIVE REVENUE SPLIT CALCULATOR */}
          <div className="rounded-3xl bg-[#171F2C] border border-amber-500/30 p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-mono font-bold uppercase text-white">
                  Earnings Projection Calculator
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                85% Creator Rate
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                  <span>Photo Sales Volume</span>
                  <span className="font-bold text-white">{calcPhotoCount} Downloads</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="200"
                  step="5"
                  value={calcPhotoCount}
                  onChange={(e) => setCalcPhotoCount(parseInt(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                  <span>Price Per Photo</span>
                  <span className="font-bold text-white">${calcUnitPrice.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="2.00"
                  max="35.00"
                  step="0.50"
                  value={calcUnitPrice}
                  onChange={(e) => setCalcUnitPrice(parseFloat(e.target.value))}
                  className="w-full accent-rose-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Visual Split Breakdown Card */}
            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400">Total Gross Volume:</span>
                <span className="font-bold text-white">${totalSimVolume.toFixed(2)}</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                  style={{ width: `${CREATOR_SPLIT_PERCENT}%` }}
                  title="85% Creator Net"
                />
                <div 
                  className="h-full bg-slate-600 transition-all duration-300"
                  style={{ width: `${PLATFORM_SPLIT_PERCENT}%` }}
                  title="15% Platform Fee"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <div className="text-[10px] text-emerald-400 font-bold uppercase">Creator Take-Home (85%)</div>
                  <div className="text-base font-black text-white mt-0.5">${totalSimCreator.toFixed(2)}</div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/10">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Platform Cut (15%)</div>
                  <div className="text-base font-black text-slate-300 mt-0.5">${totalSimPlatform.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. REAL-TIME TEST SIMULATOR */}
          <div className="rounded-3xl bg-[#171F2C] border border-blue-500/30 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-mono font-bold uppercase text-white">
                  PayPal Split Settlement Simulator
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold text-blue-300 bg-blue-500/15 px-2 py-0.5 rounded-full border border-blue-500/30">
                Sandbox Mode
              </span>
            </div>

            <p className="text-xs text-slate-300 font-mono leading-relaxed">
              Trigger a mock digital purchase transaction to inspect the exact 85% / 15% ledger ledger entry and destination routing.
            </p>

            <button
              type="button"
              onClick={handleRunSimulation}
              disabled={testSimulating || !isValidEmail(paypalMerchantEmail)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase font-mono tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
            >
              {testSimulating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing Mock Settlement...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Test Mock Single-Photo Purchase (${parseFloat(defaultPhotoPrice || '9.99').toFixed(2)})</span>
                </>
              )}
            </button>

            {testSimResult && (
              <div className="p-3.5 rounded-2xl bg-black/80 border border-blue-400/40 font-mono text-xs space-y-2 animate-fadeIn">
                <div className="flex justify-between items-center text-blue-300 font-bold border-b border-white/10 pb-1.5 text-[11px]">
                  <span>SIMULATED SETTLEMENT RESULT</span>
                  <span>{testSimResult.timestamp}</span>
                </div>
                <div className="space-y-1 text-slate-300 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Gross Photo Charge:</span>
                    <span className="font-bold text-white">${testSimResult.simulatedGross.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Creator Payout (85%):</span>
                    <span className="font-bold text-emerald-400">${testSimResult.creatorPayout.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Platform Host Fee (15%):</span>
                    <span className="font-bold text-slate-400">${testSimResult.platformFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-white/10">
                    <span className="text-slate-400">Target PayPal Email:</span>
                    <span className="font-bold text-blue-300 truncate max-w-[180px]">{testSimResult.targetEmail}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. SECURITY & COMPLIANCE BADGE */}
          <div className="p-5 rounded-3xl bg-[#171F2C]/80 border border-white/10 space-y-3 font-mono text-xs text-slate-300">
            <div className="flex items-center gap-2 font-bold text-white uppercase">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Digital Asset Protection &amp; Watermarking</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Your high-resolution Google Drive master files remain securely watermarked on the public gallery until payment is verified by PayPal. Upon checkout confirmation, customers receive direct high-speed download access to uncompressed 4K media.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};

export default CreatorPayoutConfigModule;
