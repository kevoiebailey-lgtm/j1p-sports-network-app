import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  DollarSign, 
  RefreshCw, 
  Copy, 
  Check, 
  ShieldCheck, 
  Zap, 
  Users, 
  Trophy,
  Sliders,
  Loader2,
  Mail
} from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc, serverTimestamp, query } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { paypalService } from '../../services/paypalService';
import { useToast } from '../../context/ToastContext';

export interface DirectorPayPalItem {
  uid: string;
  displayName: string;
  email: string;
  organization?: string;
  sport?: string;
  paypalMerchantId?: string;
  paypalEmail?: string;
  paypalOnboarded?: boolean;
  paypalAccountStatus?: string;
  paypalOnboardingStatus?: string;
  paypalLinkedAt?: string;
  phone?: string;
  role?: string;
}

export const PayPalConnectDirectorManager: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { user, profile, role } = useAuth();
  const { showToast } = useToast();
  const [directors, setDirectors] = useState<DirectorPayPalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [generatingLinkUid, setGeneratingLinkUid] = useState<string | null>(null);
  
  // Direct Quick Link Modal
  const [selectedDirector, setSelectedDirector] = useState<DirectorPayPalItem | null>(null);
  const [customMerchantId, setCustomMerchantId] = useState('');
  const [customPayPalEmail, setCustomPayPalEmail] = useState('');
  const [isSavingManualLink, setIsSavingManualLink] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);

  // Live real-time Firestore subscription to /users where role == "director" or role == "admin"
  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    try {
      const usersRef = collection(db, 'users');
      const unsubscribe = onSnapshot(usersRef, (snapshot) => {
        const fetched: DirectorPayPalItem[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const r = String(data.role || '').toLowerCase().trim();
          const isDirectorOrAdmin = 
            r === 'director' || 
            r === 'tournament_director' || 
            r === 'admin' ||
            r === 'org' ||
            r === 'organization';

          if (isDirectorOrAdmin) {
            const hasPayPalId = Boolean(data.paypalMerchantId && String(data.paypalMerchantId).trim() !== '');
            const isOnboarded = Boolean(
              hasPayPalId && 
              (data.paypalOnboarded === true || data.paypalAccountStatus === 'active' || data.paypalOnboardingStatus === 'ACTIVE' || data.paypalMerchantId)
            );

            fetched.push({
              uid: docSnap.id,
              displayName: data.displayName || data.name || (r === 'admin' ? 'Administrator' : 'Tournament Director'),
              email: data.email || data.paypalEmail || '',
              organization: data.organization || data.clubTeam || 'Tournament Organization',
              sport: data.sport || data.primarySport || 'All Sports',
              paypalMerchantId: data.paypalMerchantId ? String(data.paypalMerchantId).trim() : undefined,
              paypalEmail: data.paypalEmail || data.email || '',
              paypalOnboarded: isOnboarded,
              paypalAccountStatus: data.paypalAccountStatus || (hasPayPalId ? 'active' : 'unlinked'),
              paypalOnboardingStatus: data.paypalOnboardingStatus || (hasPayPalId ? 'ACTIVE' : 'PENDING'),
              paypalLinkedAt: data.paypalLinkedAt || data.updatedAt,
              phone: data.phone || data.headCoachPhone || '',
              role: r
            });
          }
        });

        // Strictly real-time list with NO mock dummy fallbacks
        setDirectors(fetched);
        setLoading(false);
      }, (err) => {
        console.warn('Error fetching directors live from Firestore:', err);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.warn('Firestore subscription exception in PayPalConnectDirectorManager:', err);
      setLoading(false);
    }
  }, []);

  const handleCopy = (merchantId: string) => {
    navigator.clipboard.writeText(merchantId);
    setCopiedId(merchantId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Generate real PayPal Partner Referral Onboarding Link
  const handleGenerateOnboardingLink = async (director: DirectorPayPalItem) => {
    setGeneratingLinkUid(director.uid);
    try {
      const linkResult = await paypalService.createDirectorOnboardingLink(director.uid, director.email);
      if (linkResult && linkResult.url) {
        window.open(linkResult.url, '_blank', 'noopener,noreferrer');
        showToast('success', 'Partner Referral Created', `Opened PayPal Partner Onboarding for ${director.displayName}`);
      } else {
        showToast('error', 'Link Generation Failed', 'Could not obtain PayPal partner referral URL.');
      }
    } catch (err: any) {
      showToast('error', 'PayPal Error', err.message || 'Error generating onboarding link');
    } finally {
      setGeneratingLinkUid(null);
    }
  };

  // Open manual account linking modal
  const handleOpenManualModal = (director: DirectorPayPalItem) => {
    setSelectedDirector(director);
    setCustomPayPalEmail(director.paypalEmail || director.email || '');
    setCustomMerchantId(director.paypalMerchantId || `PPL_MERCHANT_${director.uid.substring(0, 6).toUpperCase()}`);
    setManualModalOpen(true);
  };

  // Save manual PayPal verified merchant connection to Firestore
  const handleSaveManualLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDirector || !customPayPalEmail || !db) return;

    setIsSavingManualLink(true);
    try {
      await paypalService.linkDirectorAccount(
        selectedDirector.uid,
        customPayPalEmail,
        customMerchantId
      );

      showToast('success', 'Account Linked', `PayPal Partner rail connected for ${selectedDirector.displayName}`);
      setManualModalOpen(false);
    } catch (err: any) {
      showToast('error', 'Save Failed', err.message || 'Could not update Firestore account record');
    } finally {
      setIsSavingManualLink(false);
    }
  };

  const connectedCount = directors.filter(d => Boolean(d.paypalMerchantId)).length;

  return (
    <div className={`space-y-6 ${className}`} id="paypal-director-rail-container">
      {/* Main Container Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#0B1017]/90 border border-slate-800/80 backdrop-blur-2xl shadow-2xl space-y-6">
        
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#0070BA]/20 border border-[#0070BA]/40 p-1 flex items-center justify-center text-[#0070BA] shrink-0 shadow-[0_0_20px_rgba(0,112,186,0.3)]">
              <Building2 className="w-6 h-6 text-[#0070BA]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight font-sans">
                  PAYPAL TOURNAMENT DIRECTOR PAYMENT RAIL
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#0070BA]/15 border border-[#0070BA]/40 text-[#0070BA] text-[10px] font-black uppercase tracking-wider font-mono">
                  Partner Commerce Platform
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-medium font-sans">
                Automatic split payouts: <strong className="text-[#39FF14] font-mono">$25 platform fee retained</strong> per team entry, remaining registration balance instantly routed to the Tournament Director's PayPal Merchant Account.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-xs font-mono text-slate-400">
              Live Firestore Telemetry
            </span>
          </div>
        </div>

        {/* Telemetry Overview Metrics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase font-mono">
              <span>Connected Directors</span>
              <Building2 className="w-4 h-4 text-[#00F2FE]" />
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {connectedCount} <span className="text-xs text-slate-400 font-normal">of {directors.length} active</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 font-mono">
              <CheckCircle2 className="w-3 h-3" />
              PayPal Split Settlement Active
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase font-mono">
              <span>Platform Split Formula</span>
              <DollarSign className="w-4 h-4 text-[#39FF14]" />
            </div>
            <div className="text-2xl font-black text-[#39FF14] font-mono">
              $25.00 <span className="text-xs text-slate-400 font-normal">/ team entry</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Retained automatically at time of tournament registration checkout
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase font-mono">
              <span>Disbursement Speed</span>
              <ShieldCheck className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">
              Instant Split
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Direct settlement to verified PayPal merchant balance
            </span>
          </div>
        </div>

        {/* Registered Directors Cards Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
              <span>Active Tournament Directors &amp; PayPal Onboarding Status</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-[#00F2FE] font-bold font-mono">
                {directors.length}
              </span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              Query: /users (role == "director" || role == "admin")
            </span>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-7 h-7 text-[#00F2FE] animate-spin" />
              <p className="text-xs font-mono text-slate-400">Loading live director payment rails...</p>
            </div>
          ) : directors.length === 0 ? (
            /* Requirement 3 Empty State */
            <div className="py-12 px-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center">
                <Building2 className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-white font-sans">
                No tournament directors registered yet.
              </h4>
              <p className="text-xs text-slate-400 max-w-md font-sans">
                When directors or administrators register and manage events, their live PayPal Partner Commerce onboarding status and merchant rails will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {directors.map((director) => {
                const hasMerchantId = Boolean(director.paypalMerchantId && director.paypalMerchantId.trim() !== '');
                const isGenerating = generatingLinkUid === director.uid;

                return (
                  <div
                    key={director.uid}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                      hasMerchantId
                        ? 'bg-slate-900/90 border-[#0070BA]/40 hover:border-[#0070BA]/70 shadow-xl'
                        : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Card Details */}
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-sm text-white tracking-tight leading-snug font-sans">
                            {director.displayName}
                          </h4>
                          <p className="text-[11px] text-slate-400 truncate max-w-[190px] font-sans">
                            {director.organization || 'Tournament Organization'}
                          </p>
                        </div>

                        {/* Status Badge - Requirement 3 */}
                        {hasMerchantId ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-mono shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            CONNECTED (ACTIVE)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono shadow-[0_0_10px_rgba(245,158,11,0.15)]">
                            <AlertCircle className="w-3 h-3 text-amber-400" />
                            ACTION REQUIRED: UNLINKED
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 text-[11px] text-slate-400 font-mono">
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">{director.email || 'No email registered'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Trophy className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>{director.sport || 'Basketball'}</span>
                        </div>
                      </div>

                      {/* PayPal Merchant ID Box */}
                      {hasMerchantId ? (
                        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                          <div>
                            <span className="text-[9px] text-slate-500 font-mono block uppercase">PayPal Merchant ID</span>
                            <span className="font-mono text-xs text-[#00F2FE] font-bold">
                              {director.paypalMerchantId}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(director.paypalMerchantId!)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                            title="Copy PayPal Merchant ID"
                          >
                            {copiedId === director.paypalMerchantId ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-dashed border-amber-500/30 text-[10px] text-amber-400/90 italic text-center font-mono">
                          Action Required: Link PayPal Merchant Account
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleGenerateOnboardingLink(director)}
                        disabled={isGenerating}
                        className="flex-1 py-2 px-3 rounded-xl bg-[#0070BA] hover:bg-[#005ea6] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50 font-sans"
                      >
                        {isGenerating ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ExternalLink className="w-3.5 h-3.5" />
                        )}
                        <span>{hasMerchantId ? 'Re-authorize Rail' : 'Onboard with PayPal'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenManualModal(director)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer"
                        title="Configure PayPal Merchant ID manually"
                      >
                        <Sliders className="w-3.5 h-3.5 text-[#00F2FE]" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* MANUAL CONFIGURE MODAL */}
      {manualModalOpen && selectedDirector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md rounded-3xl bg-[#0B1017] border border-slate-700 shadow-2xl p-6 text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 font-black text-sm uppercase text-white font-mono">
                <Building2 className="w-4 h-4 text-[#0070BA]" />
                <span>Configure Director PayPal Credentials</span>
              </div>
              <button
                onClick={() => setManualModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveManualLink} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-400 font-bold uppercase mb-1">Director Name</label>
                <input
                  type="text"
                  disabled
                  value={selectedDirector.displayName}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 font-sans"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase mb-1">PayPal Verified Email</label>
                <input
                  type="email"
                  required
                  value={customPayPalEmail}
                  onChange={(e) => setCustomPayPalEmail(e.target.value)}
                  placeholder="director@club.org"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-[#00F2FE] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase mb-1">PayPal Merchant ID / Payer Reference</label>
                <input
                  type="text"
                  required
                  value={customMerchantId}
                  onChange={(e) => setCustomMerchantId(e.target.value)}
                  placeholder="PPL_MERCHANT_..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-[#00F2FE] font-bold focus:border-[#00F2FE] focus:outline-none font-mono"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                <span className="text-[#39FF14] font-bold">● Automatic $25.00 Split Formula</span>
                <p>When teams register for this director's tournaments, $25.00 is retained in the Just1Play platform ledger, and the remaining entry fee is deposited directly into this PayPal Merchant account.</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setManualModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingManualLink}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#00F2FE] to-[#00B8D4] text-slate-950 font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingManualLink ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Connection</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export const StripeConnectDirectorManager = PayPalConnectDirectorManager;

export default PayPalConnectDirectorManager;
