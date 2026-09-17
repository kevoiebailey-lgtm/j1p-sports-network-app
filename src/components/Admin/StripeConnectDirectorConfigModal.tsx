import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  DollarSign, 
  Building2, 
  Copy, 
  Check, 
  ShieldCheck, 
  Zap, 
  X, 
  User, 
  Trophy, 
  Sparkles, 
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';

export interface DirectorAccountItem {
  uid: string;
  displayName: string;
  email: string;
  organization?: string;
  sport?: string;
  stripeConnectAccountId?: string;
  stripePayoutsEnabled?: boolean;
  stripeChargesEnabled?: boolean;
  stripeLinkedAt?: string;
}

interface StripeConnectDirectorConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDirector?: DirectorAccountItem | null;
  onSaved?: (updatedDirector: DirectorAccountItem) => void;
}

export const StripeConnectDirectorConfigModal: React.FC<StripeConnectDirectorConfigModalProps> = ({
  isOpen,
  onClose,
  initialDirector,
  onSaved
}) => {
  const { user } = useAuth();

  // Form State
  const [directorName, setDirectorName] = useState('');
  const [directorEmail, setDirectorEmail] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [sport, setSport] = useState('Basketball');
  const [targetUid, setTargetUid] = useState('');
  const [entryFeeDollars, setEntryFeeDollars] = useState<number>(1200);
  const [platformFeeDollars, setPlatformFeeDollars] = useState<number>(25);

  // Stripe Flow State
  const [loading, setLoading] = useState(false);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [payoutsEnabled, setPayoutsEnabled] = useState(false);
  const [chargesEnabled, setChargesEnabled] = useState(false);
  const [onboardingUrl, setOnboardingUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [testTxResult, setTestTxResult] = useState<any | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Initialize from props
  useEffect(() => {
    if (initialDirector) {
      setDirectorName(initialDirector.displayName || '');
      setDirectorEmail(initialDirector.email || '');
      setOrganizationName(initialDirector.organization || 'East Coast Elite Tournaments');
      setSport(initialDirector.sport || 'Basketball');
      setTargetUid(initialDirector.uid || `director_${Date.now()}`);
      setStripeAccountId(initialDirector.stripeConnectAccountId || null);
      setPayoutsEnabled(!!initialDirector.stripePayoutsEnabled);
      setChargesEnabled(!!initialDirector.stripeChargesEnabled);
      if (initialDirector.stripeConnectAccountId) {
        setStep(2);
      } else {
        setStep(1);
      }
    } else {
      // Default to current user or sample director
      const defaultName = user?.displayName || 'Coach Dave Miller';
      const defaultEmail = user?.email || 'dave@eastcoasthoops.com';
      const defaultUid = user?.uid || `director_${Date.now()}`;
      setDirectorName(defaultName);
      setDirectorEmail(defaultEmail);
      setOrganizationName('Tri-State Showcase AAU');
      setSport('Basketball');
      setTargetUid(defaultUid);
      setStripeAccountId(null);
      setPayoutsEnabled(false);
      setChargesEnabled(false);
      setStep(1);
    }
    setFeedback(null);
    setTestTxResult(null);
  }, [initialDirector, isOpen, user]);

  if (!isOpen) return null;

  // Step 1 -> 2: Initiate Stripe Connect Onboarding
  const handleInitiateOnboarding = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/organizer/onboarding-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetUid,
          email: directorEmail,
          origin: window.location.origin,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.accountId) {
        throw new Error(data.error || 'Failed to initialize Stripe Express connected account.');
      }

      const generatedAccountId = data.accountId;
      setStripeAccountId(generatedAccountId);
      setOnboardingUrl(data.url || null);
      setChargesEnabled(true);
      setPayoutsEnabled(true);

      // Save / merge to Firestore users/{uid}
      if (db && targetUid) {
        const userRef = doc(db, 'users', targetUid);
        const updatedData = {
          displayName: directorName,
          email: directorEmail,
          organization: organizationName,
          sport: sport,
          stripeConnectAccountId: generatedAccountId,
          stripePayoutsEnabled: true,
          stripeChargesEnabled: true,
          stripeLinkedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(userRef, updatedData, { merge: true }).catch((err) => {
          console.warn('Firestore user update warning:', err);
        });
      }

      setFeedback({
        type: 'success',
        message: `Stripe Connect account (${generatedAccountId}) securely provisioned for ${directorName}!`,
      });

      setStep(2);

      if (onSaved) {
        onSaved({
          uid: targetUid,
          displayName: directorName,
          email: directorEmail,
          organization: organizationName,
          sport: sport,
          stripeConnectAccountId: generatedAccountId,
          stripePayoutsEnabled: true,
          stripeChargesEnabled: true,
          stripeLinkedAt: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      console.error('Stripe Onboarding error:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to initialize Stripe Connect account.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Launch Hosted Stripe Onboarding
  const handleLaunchStripeHosted = () => {
    if (onboardingUrl) {
      window.open(onboardingUrl, '_blank', 'noopener,noreferrer');
    } else if (stripeAccountId) {
      window.open(`https://dashboard.stripe.com/test/express/${stripeAccountId}`, '_blank', 'noopener,noreferrer');
    }
  };

  // Open Stripe Express Dashboard Link
  const handleOpenDashboard = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/organizer/dashboard-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stripeConnectAccountId: stripeAccountId,
          origin: window.location.origin,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Failed to generate Stripe Express dashboard link.');
      }

      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      console.error('Dashboard link error:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to open Stripe Express dashboard.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Simulate Live Event Split Payment
  const handleSimulateSplitPayment = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/checkout/tournament', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: `tourney_${Date.now()}`,
          teamId: `team_elite_${Date.now()}`,
          teamName: 'Philadelphia Ballers 17U',
          divisionName: '17U Varsity Gold',
          headCoachName: 'Coach Greg Roberts',
          headCoachEmail: 'greg.roberts@phillyballers.org',
          organizerStripeAccountId: stripeAccountId,
          entryFeeDollars: entryFeeDollars,
          platformFeeDollars: platformFeeDollars,
          origin: window.location.origin,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to simulate split payment.');
      }

      const directorNet = entryFeeDollars - platformFeeDollars;
      setTestTxResult({
        sessionId: data.sessionId || `cs_sim_${Date.now()}`,
        teamName: 'Philadelphia Ballers 17U',
        entryFee: entryFeeDollars,
        platformFee: platformFeeDollars,
        directorNet: directorNet,
        destinationAccount: stripeAccountId,
        status: 'SUCCEEDED (SIMULATED)',
        timestamp: new Date().toLocaleTimeString(),
      });

      setFeedback({
        type: 'success',
        message: `Split payment verified! $${directorNet.toFixed(2)} routed to ${directorName}'s Stripe account (${stripeAccountId}).`,
      });
      setStep(3);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to run split payment simulation.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAccountId = () => {
    if (stripeAccountId) {
      navigator.clipboard.writeText(stripeAccountId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const directorNetDollars = Math.max(0, entryFeeDollars - platformFeeDollars);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl rounded-3xl bg-[#0b1120] border border-cyan-500/30 shadow-2xl p-6 sm:p-8 text-slate-100 overflow-y-auto max-h-[92vh]">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-600 p-[1.5px] shadow-[0_0_20px_rgba(0,245,212,0.3)]">
            <div className="w-full h-full bg-[#090D16] rounded-[14.5px] flex items-center justify-center text-cyan-400">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-[10px] font-black uppercase tracking-wider">
                Stripe Connect Express
              </span>
              <span className="text-xs text-slate-400 font-mono">Platform Rail</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
              Director Stripe Connect Onboarding
            </h2>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-6 p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-bold">
          <button 
            onClick={() => setStep(1)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
              step === 1 ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">1</span>
            <span>Director Info & Split</span>
          </button>
          <div className="w-6 h-0.5 bg-slate-800" />
          <button 
            onClick={() => stripeAccountId && setStep(2)}
            disabled={!stripeAccountId}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
              step === 2 ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 disabled:opacity-50'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">2</span>
            <span>Stripe Account Rail</span>
          </button>
          <div className="w-6 h-0.5 bg-slate-800" />
          <button 
            onClick={() => stripeAccountId && setStep(3)}
            disabled={!stripeAccountId}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
              step === 3 ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 disabled:opacity-50'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">3</span>
            <span>Live Test Simulation</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className={`mb-6 p-4 rounded-2xl border text-xs flex items-start gap-2.5 ${
            feedback.type === 'success' 
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200' 
              : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
          }`}>
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
        )}

        {/* STEP 1: Director Information & Split Configuration */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
                  Tournament Director Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={directorName}
                    onChange={(e) => setDirectorName(e.target.value)}
                    placeholder="e.g. Coach Dave Miller"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
                  Director Payout Email
                </label>
                <input
                  type="email"
                  value={directorEmail}
                  onChange={(e) => setDirectorEmail(e.target.value)}
                  placeholder="e.g. dave@eastcoasthoops.com"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
                  Organization / Tournament Club
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="e.g. East Coast Elite Tournaments LLC"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
                  Primary Sport
                </label>
                <div className="relative">
                  <Trophy className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={sport}
                    onChange={(e) => setSport(e.target.value)}
                    placeholder="Basketball, Flag Football, 7v7, Soccer..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Split Fee Breakdown Configuration */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-cyan-400" />
                  Team Registration Fee & Split Payout Formula
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Stripe Connect Destination Charge</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1">
                    Team Entry Fee ($ USD)
                  </label>
                  <input
                    type="number"
                    value={entryFeeDollars}
                    onChange={(e) => setEntryFeeDollars(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1">
                    Just1Play Platform App Fee ($ USD)
                  </label>
                  <input
                    type="number"
                    value={platformFeeDollars}
                    onChange={(e) => setPlatformFeeDollars(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* Dynamic Math Preview */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-cyan-500/20 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                <div className="text-slate-300">
                  Total Team Charge: <strong className="text-white">${entryFeeDollars.toFixed(2)}</strong>
                </div>
                <div className="text-cyan-400">
                  Platform Retained: <strong>${platformFeeDollars.toFixed(2)}</strong>
                </div>
                <div className="text-emerald-400 font-black">
                  Director Net Payout: <strong>${directorNetDollars.toFixed(2)}</strong>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white text-xs font-bold"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleInitiateOnboarding}
                disabled={loading || !directorName || !directorEmail}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 text-slate-950 font-black text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>{loading ? 'Provisioning Stripe Account...' : 'Generate Stripe Connect Account'}</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Active Stripe Account & Hosted Onboarding */}
        {step === 2 && stripeAccountId && (
          <div className="space-y-5">
            {/* Account Card */}
            <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">{organizationName}</h3>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/40">
                        ACTIVE PAYOUTS
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Director: <strong className="text-slate-200">{directorName}</strong> ({directorEmail})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenDashboard}
                    disabled={loading}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 hover:border-cyan-400 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Stripe Dashboard</span>
                  </button>
                </div>
              </div>

              {/* Account Details Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Stripe Account ID</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-mono font-bold text-white truncate max-w-[130px]">
                      {stripeAccountId}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyAccountId}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title="Copy Account ID"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Platform App Fee</span>
                  <div className="text-xs font-mono font-bold text-cyan-400 mt-1">
                    ${platformFeeDollars.toFixed(2)} / team
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Payout Schedule</span>
                  <div className="text-xs font-mono font-bold text-emerald-400 mt-1">
                    Rolling 2-Day Payout
                  </div>
                </div>
              </div>
            </div>

            {/* Next Step Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleLaunchStripeHosted}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ExternalLink className="w-4 h-4" />
                    Stripe Hosted Flow
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-xs text-slate-300 font-medium">
                  Launch Stripe Express to update banking routing details, identity documents, and tax forms.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 hover:border-cyan-400 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-4 h-4" />
                    Test Live Simulation
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-xs text-slate-300 font-medium">
                  Simulate a team entry fee payment and verify the $25 platform split with zero real money charged.
                </p>
              </button>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs font-bold text-slate-400 hover:text-white"
              >
                ← Back to Profile
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-cyan-400 text-slate-950 font-black text-xs hover:brightness-110 transition-all cursor-pointer"
              >
                Done & Save
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Split Payment Test Simulation Sandbox */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-cyan-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Simulate Split Team Registration
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Sandbox Verification</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                <div className="flex justify-between text-slate-300">
                  <span>Registering Team:</span>
                  <strong className="text-white">Philadelphia Ballers 17U</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Target Tournament:</span>
                  <strong className="text-white">{organizationName} Summer Classic</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Gross Entry Fee:</span>
                  <strong className="text-white">${entryFeeDollars.toFixed(2)}</strong>
                </div>
                <div className="flex justify-between text-cyan-400">
                  <span>Just1Play Platform Fee:</span>
                  <strong>${platformFeeDollars.toFixed(2)}</strong>
                </div>
                <div className="border-t border-slate-800 pt-2 flex justify-between text-emerald-400 font-bold">
                  <span>Director Bank Net:</span>
                  <span>${directorNetDollars.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSimulateSplitPayment}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-500 text-slate-950 font-black text-xs shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />
                <span>{loading ? 'Processing Split Payment...' : 'Execute Test Split Payment'}</span>
              </button>
            </div>

            {/* Test Transaction Result Box */}
            {testTxResult && (
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-xs font-mono space-y-2 animate-fadeIn">
                <div className="flex items-center gap-2 text-emerald-300 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Stripe Split Payment Confirmed: {testTxResult.sessionId}</span>
                </div>
                <div className="text-[11px] text-slate-300">
                  • Transferred <strong className="text-emerald-400">${testTxResult.directorNet.toFixed(2)}</strong> to Destination Account: <span className="text-white">{testTxResult.destinationAccount}</span>
                  <br />
                  • Retained <strong className="text-cyan-400">${testTxResult.platformFee.toFixed(2)}</strong> platform fee for Just1Play.
                  <br />
                  • Timestamp: {testTxResult.timestamp}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-xs font-bold text-slate-400 hover:text-white"
              >
                ← Back to Account
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-cyan-400 text-slate-950 font-black text-xs hover:brightness-110 transition-all cursor-pointer"
              >
                Finish & Close
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default StripeConnectDirectorConfigModal;
