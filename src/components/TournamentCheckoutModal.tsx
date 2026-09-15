import React, { useState, useEffect } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../lib/firebase";
import { paypalService } from "../services/paypalService";
import { useAuth } from "../context/AuthContext";
import {
  WifiOff,
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Lock,
  CreditCard,
  Zap,
  CheckCircle2
} from "lucide-react";

export interface TournamentCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  divisions?: string[];
  defaultFeeCents?: number;
  directorPayPalMerchantId?: string;
}

export interface CheckoutErrorDetails {
  type: "network" | "paypal_init" | "redirect" | "general";
  title: string;
  message: string;
  technicalDetails?: string;
  canRetry: boolean;
  checkoutUrlFallback?: string;
}

export default function TournamentCheckoutModal({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  divisions = ["10U Girls Flag", "12U Girls Flag", "14U Girls Flag", "High School Open"],
  defaultFeeCents = 40000, // $400.00
  directorPayPalMerchantId,
}: TournamentCheckoutModalProps) {
  const { profile, user } = useAuth();
  const [teamName, setTeamName] = useState(profile?.teamName || profile?.highSchool || "");
  const [selectedDivision, setSelectedDivision] = useState(divisions[0]);
  const [loading, setLoading] = useState(false);
  const [errorDetails, setErrorDetails] = useState<CheckoutErrorDetails | null>(null);

  useEffect(() => {
    if (!teamName && (profile?.teamName || profile?.highSchool)) {
      setTeamName(profile.teamName || profile.highSchool || "");
    }
  }, [profile]);

  const savedAccounts = profile?.savedPaymentAccounts;
  const isOneClick = savedAccounts?.oneClickCheckoutEnabled ?? true;

  if (!isOpen) return null;

  const classifyAndSetError = (err: any, fallbackUrl?: string | null) => {
    const rawMessage = (err?.message || err?.toString() || "").toLowerCase();

    if (
      rawMessage.includes("fetch") ||
      rawMessage.includes("network") ||
      rawMessage.includes("failed to fetch") ||
      rawMessage.includes("timeout") ||
      rawMessage.includes("offline")
    ) {
      setErrorDetails({
        type: "network",
        title: "Network Connectivity Error",
        message:
          "Unable to connect to the registration or PayPal payment gateway. Please verify your internet connection and try again.",
        technicalDetails: err?.message,
        canRetry: true,
        checkoutUrlFallback: fallbackUrl || undefined,
      });
    } else if (
      rawMessage.includes("paypal") ||
      rawMessage.includes("merchant") ||
      rawMessage.includes("sdk")
    ) {
      setErrorDetails({
        type: "paypal_init",
        title: "PayPal Gateway Notice",
        message:
          "Failed to initialize PayPal order session. Please retry or click the fallback checkout button.",
        technicalDetails: err?.message,
        canRetry: true,
        checkoutUrlFallback: fallbackUrl || undefined,
      });
    } else if (rawMessage.includes("redirect") || rawMessage.includes("order")) {
      setErrorDetails({
        type: "redirect",
        title: "Redirection Interrupted",
        message:
          "Your checkout order was created, but navigating to PayPal checkout was interrupted.",
        technicalDetails: err?.message,
        canRetry: true,
        checkoutUrlFallback: fallbackUrl || undefined,
      });
    } else {
      setErrorDetails({
        type: "general",
        title: "Registration Failed",
        message: err?.message || "An unexpected error occurred during tournament checkout.",
        technicalDetails: err?.message,
        canRetry: true,
        checkoutUrlFallback: fallbackUrl || undefined,
      });
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!teamName.trim()) {
      setErrorDetails({
        type: "general",
        title: "Missing Team Name",
        message: "Please enter your official team name.",
        canRetry: false,
      });
      return;
    }

    const isAdmin = Boolean(
      user?.email === 'kevoiebailey@gmail.com' ||
      (user as any)?.role === 'admin' ||
      profile?.role === 'admin'
    );

    if (isAdmin) {
      setLoading(true);
      const bypassOrderId = `ADMIN-BYPASS-TOURNAMENT-${Date.now()}`;
      await fetch('/api/verify-paypal-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: bypassOrderId,
          captureId: `CAP-${bypassOrderId}`,
          customId: `${user?.uid || 'admin'}__tournament_registration__${eventId}`,
          userId: user?.uid || 'admin',
          itemType: 'tournament_registration',
          itemId: eventId,
          galleryId: eventId,
          amount: defaultFeeCents / 100,
          itemTitle: `Tournament Entry: ${teamName} - ${eventTitle}`,
        }),
      }).catch(() => {});
      setLoading(false);
      onClose();
      return;
    }

    setLoading(true);
    setErrorDetails(null);

    let lastKnownCheckoutUrl: string | null = null;

    try {
      let checkoutUrl: string | null = null;
      let orderId: string | null = null;

      // 1. Try Firebase Cloud Function first
      try {
        const functions = getFunctions(app);
        const createOrderFn = httpsCallable(functions, "createTournamentRegistrationOrder");

        const response: any = await createOrderFn({
          eventId,
          teamName: teamName.trim(),
          divisionId: selectedDivision,
          divisionName: selectedDivision,
          totalAmount: defaultFeeCents / 100,
          platformFeeDollars: 25.0,
          directorPayPalMerchantId,
        });

        checkoutUrl = response.data?.url || null;
        orderId = response.data?.orderID || response.data?.orderId || null;
        if (checkoutUrl) {
          lastKnownCheckoutUrl = checkoutUrl;
        }
      } catch (callErr: any) {
        console.warn("Cloud function direct call fallback to API route:", callErr?.message);
      }

      // 2. Fallback to API route
      if (!checkoutUrl && !orderId) {
        const res = await paypalService.createTournamentRegistrationOrder({
          eventId,
          eventTitle: (event as any)?.name || (event as any)?.title || 'Tournament Registration',
          teamName: teamName.trim(),
          divisionId: selectedDivision,
          divisionName: selectedDivision,
          totalAmount: defaultFeeCents / 100,
          platformFeeDollars: 25.0,
          directorPayPalMerchantId,
        });

        if (!res.success) {
          throw new Error(res.error || "Failed to initialize PayPal order session.");
        }

        checkoutUrl = res.url || null;
        orderId = res.orderID || null;
        if (checkoutUrl) {
          lastKnownCheckoutUrl = checkoutUrl;
        }
      }

      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        throw new Error("Unable to retrieve PayPal checkout link. Please try again.");
      }
    } catch (err: any) {
      console.error("PayPal checkout error:", err);
      classifyAndSetError(err, lastKnownCheckoutUrl);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-white shadow-2xl">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Register for Tournament</h2>
            <p className="text-sm text-zinc-400">{eventTitle}</p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Persistent Alert Banner */}
        {errorDetails && (
          <div
            id="tournament-modal-error-banner"
            role="alert"
            className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-white"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-red-500/20 p-2 text-red-400 shrink-0">
                {errorDetails.type === "network" ? (
                  <WifiOff className="h-5 w-5" />
                ) : errorDetails.type === "paypal_init" ? (
                  <ShieldAlert className="h-5 w-5" />
                ) : errorDetails.type === "redirect" ? (
                  <AlertTriangle className="h-5 w-5" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1 text-sm">
                <h3 className="font-semibold text-red-300">{errorDetails.title}</h3>
                <p className="mt-1 text-zinc-300 text-xs">{errorDetails.message}</p>
                {errorDetails.technicalDetails && (
                  <p className="mt-1 text-[11px] text-zinc-500 font-mono break-all">
                    {errorDetails.technicalDetails}
                  </p>
                )}

                {/* Actions */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {errorDetails.canRetry && (
                    <button
                      onClick={() => handleSubmit()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Try Again
                    </button>
                  )}
                  {errorDetails.checkoutUrlFallback && (
                    <a
                      href={errorDetails.checkoutUrlFallback}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open PayPal Checkout
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Team Name</label>
            <input
              type="text"
              required
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. South Florida Elite"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Division</label>
            <select
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {divisions.map((div) => (
                <option key={div} value={div}>
                  {div}
                </option>
              ))}
            </select>
          </div>

          {/* Fast Checkout Notice */}
          {savedAccounts?.paypal?.isLinked && isOneClick && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-950/40 border border-blue-500/20 text-xs">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-[#00E5FF] fill-current" />
                <span className="text-slate-300">1-Click Fast Checkout active for <strong className="text-white">{savedAccounts.paypal.email}</strong></span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">READY</span>
            </div>
          )}

          {/* Pricing Breakdown */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-3.5 space-y-2 text-xs">
            <div className="flex justify-between text-zinc-400">
              <span>Tournament Registration Fee</span>
              <span className="font-semibold text-zinc-200">
                ${((defaultFeeCents - 2500) / 100).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Just1Play Platform Fee</span>
              <span className="font-semibold text-zinc-200">$25.00</span>
            </div>
            <div className="border-t border-zinc-800 pt-2 flex justify-between font-bold text-sm text-white">
              <span>Total Due</span>
              <span className="text-[#E5B868]">${(defaultFeeCents / 100).toFixed(2)}</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#0070BA] hover:bg-[#005ea6] py-3 text-sm font-bold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#0070BA]/20 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Generating PayPal Order...</span>
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                <span>Pay ${(defaultFeeCents / 100).toFixed(2)} with PayPal</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
            <Lock className="h-3 w-3" />
            <span>PayPal Commerce Platform • Instant Multi-Party Settlement</span>
          </div>
        </form>
      </div>
    </div>
  );
}
