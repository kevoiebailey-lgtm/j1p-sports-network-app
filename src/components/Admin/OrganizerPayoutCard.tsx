import React, { useState, useEffect } from "react";
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  DollarSign,
  Building2,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { paypalService } from "../../services/paypalService";

export interface OrganizerPayoutCardProps {
  organizerId?: string;
  organizerEmail?: string;
  className?: string;
}

export const OrganizerPayoutCard: React.FC<OrganizerPayoutCardProps> = ({
  organizerId,
  organizerEmail,
  className = "",
}) => {
  const { user } = useAuth();
  const targetUid = organizerId || user?.uid || "guest_organizer";
  const targetEmail = organizerEmail || user?.email || "";

  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [paypalMerchantId, setPaypalMerchantId] = useState<string | null>(null);
  const [payoutsEnabled, setPayoutsEnabled] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch organizer's PayPal status from Firestore or API
  const fetchPayoutStatus = async () => {
    setRefreshing(true);
    setErrorMsg(null);
    try {
      if (user && db) {
        const userRef = doc(db, "users", targetUid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          const merchantId = data.paypalMerchantId || data.stripeConnectAccountId || null;
          setPaypalMerchantId(merchantId);
          setPayoutsEnabled(!!data.paypalPaymentsReceivable || !!data.paypalEmailConfirmed || !!merchantId);
        }
      }
    } catch (err: any) {
      console.warn("Could not load organizer PayPal status:", err.message);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPayoutStatus();
  }, [targetUid]);

  // Handle Onboarding Click
  const handleConnectPayPal = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await paypalService.createDirectorOnboardingLink(targetUid, targetEmail);
      if (!res.success || !res.url) {
        throw new Error(res.error || "Failed to initialize PayPal Commerce onboarding.");
      }

      if (res.directorId && user && db) {
        await updateDoc(doc(db, "users", targetUid), {
          paypalMerchantId: res.directorId,
          paypalPaymentsReceivable: true,
        }).catch(() => {});
      }

      window.location.href = res.url;
    } catch (err: any) {
      console.error("PayPal Onboarding error:", err);
      setErrorMsg(err.message || "Failed to connect PayPal account.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Dashboard Click
  const handleOpenDashboard = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await paypalService.createDirectorDashboardLink(paypalMerchantId || undefined);
      if (!res.success || !res.url) {
        throw new Error(res.error || "Failed to generate PayPal dashboard link.");
      }

      window.open(res.url, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      console.error("Dashboard link error:", err);
      setErrorMsg(err.message || "Failed to open PayPal dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMerchantId = () => {
    if (paypalMerchantId) {
      navigator.clipboard.writeText(paypalMerchantId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isConnected = !!paypalMerchantId;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0070BA]/20 border border-[#0070BA]/30 text-[#0070BA]">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white tracking-tight">PayPal Partner Direct Payouts</h3>
              <span className="inline-flex items-center rounded-full bg-[#0070BA]/10 px-2 py-0.5 text-[10px] font-bold text-[#0070BA] border border-[#0070BA]/30">
                COMMERCE PLATFORM
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Instant split payouts on tournament entry fees and media asset sales.
            </p>
          </div>
        </div>

        <button
          onClick={fetchPayoutStatus}
          disabled={refreshing}
          className="flex items-center gap-1.5 self-start sm:self-auto rounded-lg border border-slate-700 bg-slate-800/60 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-[#0070BA]" : ""}`} />
          <span>Sync Status</span>
        </button>
      </div>

      {errorMsg && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 flex items-start gap-2.5 text-xs text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Account Status Grid */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3.5">
          <span className="text-[11px] font-medium text-slate-400">Merchant Account ID</span>
          <div className="mt-1 flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-slate-200">
              {paypalMerchantId ? `${paypalMerchantId.substring(0, 16)}...` : "Not Linked"}
            </span>
            {paypalMerchantId && (
              <button
                onClick={handleCopyMerchantId}
                className="text-slate-400 hover:text-white transition-colors"
                title="Copy Merchant ID"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3.5">
          <span className="text-[11px] font-medium text-slate-400">Payout Status</span>
          <div className="mt-1 flex items-center gap-1.5">
            {isConnected ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400">Receivable &amp; Verified</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-bold text-amber-400">Action Required</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        {!isConnected ? (
          <button
            id="connect-paypal-btn"
            onClick={handleConnectPayPal}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-[#0070BA] px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#0070BA]/20 hover:bg-[#005ea6] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            <span>Link PayPal Merchant Account</span>
          </button>
        ) : (
          <>
            <button
              id="relink-paypal-btn"
              onClick={handleConnectPayPal}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Update Partner Link</span>
            </button>

            <button
              id="open-paypal-dashboard-btn"
              onClick={handleOpenDashboard}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <ExternalLink className="h-3.5 w-3.5 text-[#0070BA]" />
              <span>Open PayPal Dashboard</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default OrganizerPayoutCard;
