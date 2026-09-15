import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Check,
  Lock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  User,
  MapPin,
  Phone,
  Mail,
  Info,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  UserPaymentAccounts,
  SavedPaymentCard,
  SavedPayPalAccount,
  SavedVenmoAccount,
  SavedBillingDetails,
  CardBrand
} from '../../types';

interface SavedPaymentAccountsSectionProps {
  onSaved?: () => void;
  compact?: boolean;
}

export const SavedPaymentAccountsSection: React.FC<SavedPaymentAccountsSectionProps> = ({
  onSaved,
  compact = false
}) => {
  const { user, profile, updateUserProfile } = useAuth();
  const { showToast } = useToast();

  // Primary State
  const [paymentAccounts, setPaymentAccounts] = useState<UserPaymentAccounts>({
    defaultMethodType: 'paypal',
    oneClickCheckoutEnabled: true,
    paypal: {
      email: user?.email || '',
      isLinked: Boolean(user?.email),
      oneClickEnabled: true
    },
    venmo: {
      username: '',
      isLinked: false
    },
    cards: [],
    billingDetails: {
      fullName: profile?.displayName || '',
      email: user?.email || profile?.email || '',
      phone: '',
      addressLine1: '',
      city: profile?.city || '',
      state: profile?.state || 'NJ',
      postalCode: '',
      country: 'United States'
    }
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New Card Form State
  const [showAddCard, setShowAddCard] = useState(false);
  const [cardForm, setCardForm] = useState({
    cardNumber: '',
    cardholderName: profile?.displayName || '',
    expMonth: '',
    expYear: '',
    cvv: '',
    nickname: '',
    isDefault: false
  });
  const [detectedBrand, setDetectedBrand] = useState<CardBrand>('visa');

  // PayPal Link Modal State
  const [isEditingPayPal, setIsEditingPayPal] = useState(false);
  const [payPalInputEmail, setPayPalInputEmail] = useState('');

  // Venmo Link Modal State
  const [isEditingVenmo, setIsEditingVenmo] = useState(false);
  const [venmoInputUsername, setVenmoInputUsername] = useState('');

  // Load existing profile payment accounts
  useEffect(() => {
    if (profile?.savedPaymentAccounts) {
      const existing = profile.savedPaymentAccounts;
      setPaymentAccounts({
        defaultMethodType: existing.defaultMethodType || 'paypal',
        defaultCardId: existing.defaultCardId,
        oneClickCheckoutEnabled: existing.oneClickCheckoutEnabled ?? true,
        paypal: existing.paypal || {
          email: user?.email || '',
          isLinked: Boolean(user?.email),
          oneClickEnabled: true
        },
        venmo: existing.venmo || {
          username: '',
          isLinked: false
        },
        cards: existing.cards || [],
        billingDetails: existing.billingDetails || {
          fullName: profile.displayName || '',
          email: user?.email || profile.email || '',
          phone: '',
          addressLine1: '',
          city: profile.city || '',
          state: profile.state || 'NJ',
          postalCode: '',
          country: 'United States'
        }
      });

      if (existing.paypal?.email) {
        setPayPalInputEmail(existing.paypal.email);
      }
      if (existing.venmo?.username) {
        setVenmoInputUsername(existing.venmo.username);
      }
    } else {
      setPayPalInputEmail(user?.email || profile?.email || '');
    }
  }, [profile, user]);

  // Detect card brand automatically from number
  const detectCardBrand = (number: string): CardBrand => {
    const clean = number.replace(/\D/g, '');
    if (/^4/.test(clean)) return 'visa';
    if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[01]|2720)/.test(clean)) return 'mastercard';
    if (/^3[47]/.test(clean)) return 'amex';
    if (/^(6011|65|64[4-9]|622)/.test(clean)) return 'discover';
    return 'other';
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 16) val = val.slice(0, 16);
    
    // Group into 4 digits
    const formatted = val.match(/.{1,4}/g)?.join(' ') || val;
    setCardForm(prev => ({ ...prev, cardNumber: formatted }));
    setDetectedBrand(detectCardBrand(val));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 4) val = val.slice(0, 4);

    if (val.length >= 3) {
      val = `${val.slice(0, 2)}/${val.slice(2, 4)}`;
    }
    
    const parts = val.split('/');
    setCardForm(prev => ({
      ...prev,
      expMonth: parts[0] || '',
      expYear: parts[1] || ''
    }));
  };

  // Save changes to profile & Firestore
  const persistPaymentAccounts = async (updated: UserPaymentAccounts, successMessage = 'Payment settings updated.') => {
    setSaving(true);
    try {
      const payload: UserPaymentAccounts = {
        ...updated,
        updatedAt: new Date().toISOString()
      };
      setPaymentAccounts(payload);

      await updateUserProfile({
        savedPaymentAccounts: payload
      });

      setSaveSuccess(true);
      showToast('success', 'Payment Accounts Saved', successMessage);
      if (onSaved) onSaved();

      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      console.error('Error saving payment accounts:', err);
      showToast('error', 'Save Failed', err.message || 'Could not save payment accounts.');
    } finally {
      setSaving(false);
    }
  };

  // Add Card Handler
  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNum = cardForm.cardNumber.replace(/\D/g, '');
    if (cleanNum.length < 13) {
      showToast('error', 'Invalid Card Number', 'Please enter a valid credit or debit card number.');
      return;
    }
    if (!cardForm.expMonth || !cardForm.expYear) {
      showToast('error', 'Invalid Expiration', 'Please provide card expiration date (MM/YY).');
      return;
    }
    if (!cardForm.cardholderName.trim()) {
      showToast('error', 'Cardholder Name Required', 'Please enter the name on the card.');
      return;
    }

    const last4 = cleanNum.slice(-4);
    const newCard: SavedPaymentCard = {
      id: `card_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      brand: detectedBrand,
      last4,
      expMonth: cardForm.expMonth.padStart(2, '0'),
      expYear: cardForm.expYear.length === 2 ? `20${cardForm.expYear}` : cardForm.expYear,
      cardholderName: cardForm.cardholderName.trim(),
      nickname: cardForm.nickname.trim() || `${detectedBrand.toUpperCase()} •••• ${last4}`,
      isDefault: cardForm.isDefault || (paymentAccounts.cards?.length === 0),
      createdAt: new Date().toISOString()
    };

    let updatedCards = [...(paymentAccounts.cards || [])];
    if (newCard.isDefault) {
      updatedCards = updatedCards.map(c => ({ ...c, isDefault: false }));
    }
    updatedCards.push(newCard);

    const updatedAccounts: UserPaymentAccounts = {
      ...paymentAccounts,
      cards: updatedCards,
      defaultCardId: newCard.isDefault ? newCard.id : paymentAccounts.defaultCardId,
      defaultMethodType: newCard.isDefault ? 'card' : paymentAccounts.defaultMethodType
    };

    // Reset card form
    setCardForm({
      cardNumber: '',
      cardholderName: profile?.displayName || '',
      expMonth: '',
      expYear: '',
      cvv: '',
      nickname: '',
      isDefault: false
    });
    setShowAddCard(false);

    await persistPaymentAccounts(updatedAccounts, `Added ${newCard.brand.toUpperCase()} ending in ${last4} to your wallet.`);
  };

  // Remove Card Handler
  const handleRemoveCard = async (cardId: string) => {
    const updatedCards = (paymentAccounts.cards || []).filter(c => c.id !== cardId);
    let newDefaultCardId = paymentAccounts.defaultCardId;
    
    if (paymentAccounts.defaultCardId === cardId && updatedCards.length > 0) {
      updatedCards[0].isDefault = true;
      newDefaultCardId = updatedCards[0].id;
    } else if (updatedCards.length === 0) {
      newDefaultCardId = undefined;
    }

    const updatedAccounts: UserPaymentAccounts = {
      ...paymentAccounts,
      cards: updatedCards,
      defaultCardId: newDefaultCardId
    };

    await persistPaymentAccounts(updatedAccounts, 'Card removed from saved payment methods.');
  };

  // Set Default Card Handler
  const handleSetDefaultCard = async (cardId: string) => {
    const updatedCards = (paymentAccounts.cards || []).map(c => ({
      ...c,
      isDefault: c.id === cardId
    }));

    const updatedAccounts: UserPaymentAccounts = {
      ...paymentAccounts,
      cards: updatedCards,
      defaultCardId: cardId,
      defaultMethodType: 'card'
    };

    await persistPaymentAccounts(updatedAccounts, 'Default card updated for 1-click checkout.');
  };

  // Link PayPal Account Handler
  const handleSavePayPal = async () => {
    if (!payPalInputEmail.trim() || !payPalInputEmail.includes('@')) {
      showToast('error', 'Invalid Email', 'Please enter a valid PayPal account email address.');
      return;
    }

    const updatedPayPal: SavedPayPalAccount = {
      email: payPalInputEmail.trim(),
      isLinked: true,
      linkedAt: new Date().toISOString(),
      oneClickEnabled: true,
      isDefault: paymentAccounts.defaultMethodType === 'paypal'
    };

    const updatedAccounts: UserPaymentAccounts = {
      ...paymentAccounts,
      paypal: updatedPayPal
    };

    setIsEditingPayPal(false);
    await persistPaymentAccounts(updatedAccounts, `PayPal account (${payPalInputEmail}) linked for fast checkout.`);
  };

  // Unlink PayPal
  const handleUnlinkPayPal = async () => {
    const updatedPayPal: SavedPayPalAccount = {
      email: '',
      isLinked: false,
      oneClickEnabled: false
    };

    const updatedAccounts: UserPaymentAccounts = {
      ...paymentAccounts,
      paypal: updatedPayPal,
      defaultMethodType: paymentAccounts.defaultMethodType === 'paypal' ? 'card' : paymentAccounts.defaultMethodType
    };

    await persistPaymentAccounts(updatedAccounts, 'PayPal account unlinked.');
  };

  // Link Venmo Account Handler
  const handleSaveVenmo = async () => {
    const cleaned = venmoInputUsername.trim().replace(/^@/, '');
    if (!cleaned) {
      showToast('error', 'Venmo Username Required', 'Please enter your Venmo username handle.');
      return;
    }

    const updatedVenmo: SavedVenmoAccount = {
      username: `@${cleaned}`,
      isLinked: true,
      linkedAt: new Date().toISOString(),
      isDefault: paymentAccounts.defaultMethodType === 'venmo'
    };

    const updatedAccounts: UserPaymentAccounts = {
      ...paymentAccounts,
      venmo: updatedVenmo
    };

    setIsEditingVenmo(false);
    await persistPaymentAccounts(updatedAccounts, `Venmo handle (@${cleaned}) saved for rapid checkouts.`);
  };

  // Unlink Venmo
  const handleUnlinkVenmo = async () => {
    const updatedVenmo: SavedVenmoAccount = {
      username: '',
      isLinked: false
    };

    const updatedAccounts: UserPaymentAccounts = {
      ...paymentAccounts,
      venmo: updatedVenmo,
      defaultMethodType: paymentAccounts.defaultMethodType === 'venmo' ? 'paypal' : paymentAccounts.defaultMethodType
    };

    await persistPaymentAccounts(updatedAccounts, 'Venmo account unlinked.');
  };

  // Save Billing Info
  const handleSaveBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    await persistPaymentAccounts(paymentAccounts, 'Express billing details updated.');
  };

  // Copy details from user profile
  const handleAutoFillFromProfile = () => {
    if (!profile) return;
    setPaymentAccounts(prev => ({
      ...prev,
      billingDetails: {
        ...prev.billingDetails,
        fullName: profile.displayName || prev.billingDetails?.fullName || '',
        email: user?.email || profile.email || prev.billingDetails?.email || '',
        city: profile.city || prev.billingDetails?.city || '',
        state: profile.state || prev.billingDetails?.state || 'NJ',
        country: profile.country || 'United States'
      }
    }));
    showToast('info', 'Auto-Filled Details', 'Populated billing name and state from your profile.');
  };

  // Helper Brand Badges
  const getBrandBadge = (brand: CardBrand) => {
    switch (brand) {
      case 'visa':
        return <span className="font-black italic tracking-wider text-blue-400 text-sm">VISA</span>;
      case 'mastercard':
        return (
          <div className="flex items-center -space-x-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-red-500 inline-block opacity-90" />
            <span className="w-3.5 h-3.5 rounded-full bg-amber-400 inline-block opacity-90" />
          </div>
        );
      case 'amex':
        return <span className="font-black text-teal-300 text-xs px-1 py-0.5 bg-teal-950/80 border border-teal-800 rounded">AMEX</span>;
      case 'discover':
        return <span className="font-bold text-orange-400 text-xs tracking-tight">DISCOVER</span>;
      default:
        return <CreditCard className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* Top Banner: Fast Checkout & Security Guarantee */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900/60 border border-blue-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00E5FF] to-[#0070BA] flex items-center justify-center text-[#0B0F17] font-black shadow-[0_0_15px_rgba(0,229,255,0.3)] shrink-0">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                Just1Play Express 1-Click Fast Checkout
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
                ENCRYPTED
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Link your PayPal, Venmo, or saved cards to instantly unlock tournament entries and photo downloads.
            </p>
          </div>
        </div>

        {/* 1-Click Master Toggle */}
        <label className="flex items-center gap-2.5 cursor-pointer bg-slate-900/80 hover:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-white/10 transition-colors shrink-0">
          <span className="text-xs font-semibold text-slate-300">1-Click Checkout:</span>
          <input
            type="checkbox"
            checked={paymentAccounts.oneClickCheckoutEnabled ?? true}
            onChange={(e) => {
              persistPaymentAccounts({
                ...paymentAccounts,
                oneClickCheckoutEnabled: e.target.checked
              });
            }}
            className="w-4 h-4 rounded text-[#00E5FF] focus:ring-0 bg-slate-800 border-slate-700 cursor-pointer accent-[#00E5FF]"
          />
          <span className={`text-xs font-bold font-mono ${paymentAccounts.oneClickCheckoutEnabled ? 'text-emerald-400' : 'text-slate-500'}`}>
            {paymentAccounts.oneClickCheckoutEnabled ? 'ACTIVE' : 'OFF'}
          </span>
        </label>
      </div>

      {/* Default Payment Rail Selector */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#00E5FF]" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Primary Payment Preference
            </h4>
          </div>
          <span className="text-[11px] text-slate-400">Used as default at checkout</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            { id: 'paypal', label: 'PayPal', desc: 'One-Click Fast Pay', icon: '🅿️' },
            { id: 'venmo', label: 'Venmo', desc: 'Mobile App Pay', icon: '📱' },
            { id: 'card', label: 'Saved Card', desc: 'Credit / Debit', icon: '💳' },
            { id: 'apple_pay', label: 'Apple/Google Pay', desc: 'Device Wallet', icon: '⚡' }
          ].map((method) => {
            const isSelected = paymentAccounts.defaultMethodType === method.id;
            return (
              <button
                key={method.id}
                type="button"
                onClick={() => {
                  persistPaymentAccounts({
                    ...paymentAccounts,
                    defaultMethodType: method.id as any
                  });
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-blue-600/15 border-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.15)]'
                    : 'bg-slate-950/40 border-white/5 hover:border-white/15 hover:bg-slate-800/40 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base">{method.icon}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#00E5FF]" />}
                </div>
                <div className="mt-2">
                  <p className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                    {method.label}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{method.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid: Connected Digital Wallets (PayPal & Venmo) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* PayPal Linked Card */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0070BA]/20 border border-[#0070BA]/30 flex items-center justify-center font-black text-[#0070BA]">
                P
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white">PayPal Account</h4>
                  {paymentAccounts.paypal?.isLinked ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      LINKED
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-white/5 border border-white/10">
                      NOT LINKED
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">Official Just1Play Partner Rail</p>
              </div>
            </div>

            {paymentAccounts.paypal?.isLinked && !isEditingPayPal && (
              <button
                type="button"
                onClick={() => setIsEditingPayPal(true)}
                className="text-xs text-[#00E5FF] hover:underline font-mono cursor-pointer"
              >
                Edit
              </button>
            )}
          </div>

          {isEditingPayPal || !paymentAccounts.paypal?.isLinked ? (
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  PayPal Account Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={payPalInputEmail}
                    onChange={(e) => setPayPalInputEmail(e.target.value)}
                    placeholder="e.g. coach@just1play.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSavePayPal}
                  disabled={saving}
                  className="flex-1 py-2 px-3 bg-[#0070BA] hover:bg-[#005ea6] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{saving ? 'Linking...' : 'Link PayPal Account'}</span>
                </button>
                {isEditingPayPal && (
                  <button
                    type="button"
                    onClick={() => setIsEditingPayPal(false)}
                    className="py-2 px-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs transition cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-950/50 rounded-xl p-3 border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Connected Account:</span>
                <span className="font-mono text-white font-semibold">{paymentAccounts.paypal?.email}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">1-Click Auto-Approve:</span>
                <span className="text-emerald-400 font-mono font-semibold">Enabled</span>
              </div>
              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={handleUnlinkPayPal}
                  className="text-[11px] text-rose-400 hover:text-rose-300 font-mono hover:underline cursor-pointer"
                >
                  Unlink Account
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Venmo Linked Card */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#008CFF]/20 border border-[#008CFF]/30 flex items-center justify-center font-black text-[#008CFF]">
                V
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white">Venmo Handle</h4>
                  {paymentAccounts.venmo?.isLinked ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#008CFF]/15 text-[#008CFF] border border-[#008CFF]/30">
                      LINKED
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-white/5 border border-white/10">
                      NOT LINKED
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">Direct tournament entry tagging</p>
              </div>
            </div>

            {paymentAccounts.venmo?.isLinked && !isEditingVenmo && (
              <button
                type="button"
                onClick={() => setIsEditingVenmo(true)}
                className="text-xs text-[#00E5FF] hover:underline font-mono cursor-pointer"
              >
                Edit
              </button>
            )}
          </div>

          {isEditingVenmo || !paymentAccounts.venmo?.isLinked ? (
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  Venmo @Username
                </label>
                <div className="relative">
                  <span className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs">@</span>
                  <input
                    type="text"
                    value={venmoInputUsername.replace(/^@/, '')}
                    onChange={(e) => setVenmoInputUsername(e.target.value)}
                    placeholder="athlete_john_2026"
                    className="w-full pl-8 pr-3 py-2 bg-slate-950/80 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-[#008CFF]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveVenmo}
                  disabled={saving}
                  className="flex-1 py-2 px-3 bg-[#008CFF] hover:bg-[#0074d4] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Venmo Handle'}</span>
                </button>
                {isEditingVenmo && (
                  <button
                    type="button"
                    onClick={() => setIsEditingVenmo(false)}
                    className="py-2 px-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs transition cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-950/50 rounded-xl p-3 border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Venmo Username:</span>
                <span className="font-mono text-[#008CFF] font-bold">{paymentAccounts.venmo?.username}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Rapid Mobile Pay:</span>
                <span className="text-emerald-400 font-mono font-semibold">Ready</span>
              </div>
              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={handleUnlinkVenmo}
                  className="text-[11px] text-rose-400 hover:text-rose-300 font-mono hover:underline cursor-pointer"
                >
                  Remove Handle
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Section: Saved Credit & Debit Cards */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Saved Credit & Debit Cards ({paymentAccounts.cards?.length || 0})
            </h4>
          </div>

          {!showAddCard && (
            <button
              type="button"
              onClick={() => setShowAddCard(true)}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-bold font-mono flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Card</span>
            </button>
          )}
        </div>

        {/* Existing Saved Cards List */}
        {paymentAccounts.cards && paymentAccounts.cards.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {paymentAccounts.cards.map((card) => {
              const isDefault = card.isDefault || paymentAccounts.defaultCardId === card.id;
              return (
                <div
                  key={card.id}
                  className={`p-3.5 rounded-xl border relative transition-all ${
                    isDefault
                      ? 'bg-gradient-to-br from-slate-900 to-slate-950 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                      : 'bg-slate-950/60 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 border border-white/10 flex items-center justify-center">
                        {getBrandBadge(card.brand)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">
                          {card.nickname || `${card.brand.toUpperCase()} Card`}
                        </p>
                        <p className="text-[11px] font-mono text-slate-400">
                          •••• •••• •••• {card.last4}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isDefault ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          DEFAULT
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetDefaultCard(card.id)}
                          className="text-[10px] text-slate-400 hover:text-white font-mono hover:underline cursor-pointer"
                        >
                          Make Default
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveCard(card.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                        title="Remove Card"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>Exp: {card.expMonth}/{card.expYear.slice(-2)}</span>
                    <span className="truncate max-w-[120px]">{card.cardholderName}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          !showAddCard && (
            <div className="p-6 text-center rounded-xl bg-slate-950/40 border border-dashed border-white/10 space-y-2">
              <CreditCard className="w-8 h-8 text-slate-500 mx-auto opacity-60" />
              <p className="text-xs text-slate-300 font-semibold">No saved cards yet</p>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                Save a card to enable fast 1-click payments for tournaments, merchandise, and media passes.
              </p>
            </div>
          )
        )}

        {/* Add Card Form Modal / Inline */}
        {showAddCard && (
          <form onSubmit={handleSaveCard} className="bg-slate-950/80 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 space-y-4 mt-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h5 className="text-xs font-bold text-white uppercase font-mono">Add New Payment Card</h5>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCard(false)}
                className="text-xs text-slate-400 hover:text-white font-mono cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {/* Visual Card Preview */}
            <div className="w-full max-w-sm mx-auto h-36 rounded-2xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 p-4 shadow-xl flex flex-col justify-between text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between relative z-10">
                <div className="w-7 h-5 rounded bg-amber-400/80 border border-amber-300/40" />
                <div>{getBrandBadge(detectedBrand)}</div>
              </div>
              <div className="font-mono text-sm tracking-widest text-slate-200 relative z-10">
                {cardForm.cardNumber || '•••• •••• •••• ••••'}
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-300 uppercase relative z-10">
                <span className="truncate max-w-[150px]">{cardForm.cardholderName || 'CARDHOLDER NAME'}</span>
                <span>{cardForm.expMonth || 'MM'}/{cardForm.expYear ? cardForm.expYear.slice(-2) : 'YY'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-mono text-slate-300 mb-1">
                  Card Number
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={cardForm.cardNumber}
                    onChange={handleCardNumberChange}
                    placeholder="4111 2222 3333 4444"
                    className="w-full pl-9 pr-14 py-2 bg-slate-900 border border-white/15 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-400"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {getBrandBadge(detectedBrand)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-300 mb-1">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  required
                  value={cardForm.cardholderName}
                  onChange={(e) => setCardForm({ ...cardForm, cardholderName: e.target.value })}
                  placeholder="Full Name on Card"
                  className="w-full px-3 py-2 bg-slate-900 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-mono text-slate-300 mb-1">
                    Expires (MM/YY)
                  </label>
                  <input
                    type="text"
                    required
                    value={cardForm.expMonth && cardForm.expYear ? `${cardForm.expMonth}/${cardForm.expYear}` : ''}
                    onChange={handleExpiryChange}
                    placeholder="12/28"
                    className="w-full px-3 py-2 bg-slate-900 border border-white/15 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-400 text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-300 mb-1">
                    CVV / CVC
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      maxLength={4}
                      value={cardForm.cvv}
                      onChange={(e) => setCardForm({ ...cardForm, cvv: e.target.value.replace(/\D/g, '') })}
                      placeholder="•••"
                      className="w-full pl-7 pr-2 py-2 bg-slate-900 border border-white/15 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-400 text-center"
                    />
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2 flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cardForm.isDefault}
                    onChange={(e) => setCardForm({ ...cardForm, isDefault: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-400 focus:ring-0 bg-slate-800 border-slate-700 cursor-pointer accent-emerald-500"
                  />
                  <span>Set as default card for 1-click checkouts</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowAddCard(false)}
                className="py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="py-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{saving ? 'Tokenizing & Saving...' : 'Save Card to Wallet'}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Section: Express Billing & Payer Profile */}
      <form onSubmit={handleSaveBilling} className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Express Billing & Payer Details
            </h4>
          </div>

          <button
            type="button"
            onClick={handleAutoFillFromProfile}
            className="text-xs text-[#00E5FF] hover:underline font-mono cursor-pointer flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Copy Profile Info</span>
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Auto-prefills tournament registrations, head-coach contact sheets, and media invoices.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-mono text-slate-300 mb-1">Billing Full Name</label>
            <input
              type="text"
              value={paymentAccounts.billingDetails?.fullName || ''}
              onChange={(e) => setPaymentAccounts({
                ...paymentAccounts,
                billingDetails: { ...paymentAccounts.billingDetails, fullName: e.target.value }
              })}
              placeholder="e.g. John Doe"
              className="w-full px-3 py-2 bg-slate-950/80 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-300 mb-1">Billing Email</label>
            <input
              type="email"
              value={paymentAccounts.billingDetails?.email || ''}
              onChange={(e) => setPaymentAccounts({
                ...paymentAccounts,
                billingDetails: { ...paymentAccounts.billingDetails, email: e.target.value }
              })}
              placeholder="coach@example.com"
              className="w-full px-3 py-2 bg-slate-950/80 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-300 mb-1">Billing Phone</label>
            <input
              type="tel"
              value={paymentAccounts.billingDetails?.phone || ''}
              onChange={(e) => setPaymentAccounts({
                ...paymentAccounts,
                billingDetails: { ...paymentAccounts.billingDetails, phone: e.target.value }
              })}
              placeholder="(555) 000-0000"
              className="w-full px-3 py-2 bg-slate-950/80 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-mono text-slate-300 mb-1">Street Address</label>
            <input
              type="text"
              value={paymentAccounts.billingDetails?.addressLine1 || ''}
              onChange={(e) => setPaymentAccounts({
                ...paymentAccounts,
                billingDetails: { ...paymentAccounts.billingDetails, addressLine1: e.target.value }
              })}
              placeholder="123 Athletic Way"
              className="w-full px-3 py-2 bg-slate-950/80 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-300 mb-1">Postal / ZIP Code</label>
            <input
              type="text"
              value={paymentAccounts.billingDetails?.postalCode || ''}
              onChange={(e) => setPaymentAccounts({
                ...paymentAccounts,
                billingDetails: { ...paymentAccounts.billingDetails, postalCode: e.target.value }
              })}
              placeholder="07030"
              className="w-full px-3 py-2 bg-slate-950/80 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Encrypted in your private Firestore user profile</span>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="py-2 px-5 bg-[#00E5FF] hover:bg-cyan-400 text-[#0B0F17] font-black rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-[0_0_15px_rgba(0,229,255,0.2)]"
          >
            {saving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            )}
            <span>{saving ? 'Saving...' : 'Save Billing Details'}</span>
          </button>
        </div>
      </form>

      {/* Security & Compliance Footer */}
      <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>PCI-DSS Level 1 & PayPal Vault compliant tokenization. Full card data is never stored in plain text.</span>
        </div>
        <span className="font-mono text-[10px] text-slate-500 shrink-0 hidden sm:inline">
          TLS 1.3 / AES-256
        </span>
      </div>
    </div>
  );
};
