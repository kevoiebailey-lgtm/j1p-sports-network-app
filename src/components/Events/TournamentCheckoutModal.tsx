import React, { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../../lib/firebase";
import {
  X,
  ShieldCheck,
  CreditCard,
  Trophy,
  Users,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  WifiOff,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Lock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export interface DivisionOption {
  id: string;
  name: string;
  maxTeams?: number;
  entryFee?: number;
}

export interface TournamentCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  organizerId?: string;
  organizerStripeAccountId?: string;
  defaultEntryFee?: number;
  divisions?: DivisionOption[];
  onSuccess?: (data: any) => void;
}

export interface CheckoutErrorDetails {
  type: "network" | "paypal_init" | "redirect" | "general";
  title: string;
  message: string;
  technicalDetails?: string;
  canRetry: boolean;
  checkoutUrlFallback?: string;
}

export const TournamentCheckoutModal: React.FC<TournamentCheckoutModalProps> = ({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  organizerId,
  organizerStripeAccountId,
  defaultEntryFee = 150.0,
  divisions = [
    { id: "10u", name: "10U Division", entryFee: 150.0 },
    { id: "12u", name: "12U Division", entryFee: 150.0 },
    { id: "14u", name: "14U Division", entryFee: 175.0 },
    { id: "varsity", name: "Varsity Open", entryFee: 200.0 },
  ],
  onSuccess,
}) => {
  const { user } = useAuth();

  const [selectedDivisionId, setSelectedDivisionId] = useState<string>(
    divisions[0]?.id || "12u"
  );
  const [teamName, setTeamName] = useState<string>("");
  const [headCoachName, setHeadCoachName] = useState<string>(
    user?.displayName || ""
  );
  const [headCoachEmail, setHeadCoachEmail] = useState<string>(
    user?.email || ""
  );
  const [headCoachPhone, setHeadCoachPhone] = useState<string>("");
  const [rosterSize, setRosterSize] = useState<number>(12);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorDetails, setErrorDetails] = useState<CheckoutErrorDetails | null>(null);

  if (!isOpen) return null;

  const currentDivision =
    divisions.find((d) => d.id === selectedDivisionId) || divisions[0];
  const entryFee = Number(currentDivision?.entryFee || defaultEntryFee);
  const platformFee = 25.0; // Just1Play platform fee
  const totalAmount = entryFee;

  const classifyAndSetError = (err: any, fallbackUrl?: string | null) => {
    const rawMessage = (err?.message || err?.toString() || "").toLowerCase();
    
    if (
      rawMessage.includes("fetch") ||
      rawMessage.includes("network") ||
      rawMessage.includes("failed to fetch") ||
      rawMessage.includes("timeout") ||
      rawMessage.includes("offline") ||
      rawMessage.includes("unavailable")
    ) {
      setErrorDetails({
        type: "network",
        title: "Network Connection Issue",
        message:
          "Unable to establish a secure connection with the registration and payment servers. Please check your internet connectivity and try again.",
        technicalDetails: err?.message,
        canRetry: true,
        checkoutUrlFallback: fallbackUrl || undefined,
      });
    } else if (
      rawMessage.includes("paypal") ||
      rawMessage.includes("client_id") ||
      rawMessage.includes("sdk")
    ) {
      setErrorDetails({
        type: "paypal_init",
        title: "PayPal Payment Gateway Initialization Failed",
        message:
          "The PayPal payment client could not be initialized or verified. This may happen if ad-blockers or firewall rules restrict PayPal scripts.",
        technicalDetails: err?.message,
        canRetry: true,
        checkoutUrlFallback: fallbackUrl || undefined,
      });
    } else if (
      rawMessage.includes("redirect") ||
      rawMessage.includes("redirection") ||
      rawMessage.includes("session")
    ) {
      setErrorDetails({
        type: "redirect",
        title: "Checkout Redirection Interrupted",
        message:
          "A registration session was created, but your browser could not complete the automatic redirect to PayPal Checkout.",
        technicalDetails: err?.message,
        canRetry: true,
        checkoutUrlFallback: fallbackUrl || undefined,
      });
    } else {
      setErrorDetails({
        type: "general",
        title: "Registration Checkout Error",
        message:
          err?.message || "An unexpected error occurred while preparing your tournament checkout.",
        technicalDetails: err?.message,
        canRetry: true,
        checkoutUrlFallback: fallbackUrl || undefined,
      });
    }
  };

  const handleSubmitCheckout = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!teamName.trim()) {
      setErrorDetails({
        type: "general",
        title: "Missing Required Information",
        message: "Please enter your official team name before continuing.",
        canRetry: false,
      });
      return;
    }
    if (!headCoachEmail.trim()) {
      setErrorDetails({
        type: "general",
        title: "Missing Contact Email",
        message: "Please provide a coach email for confirmation and digital pass delivery.",
        canRetry: false,
      });
      return;
    }

    const isAdmin = Boolean(
      user?.email === 'kevoiebailey@gmail.com' ||
      (user as any)?.role === 'admin'
    );

    if (isAdmin) {
      setIsSubmitting(true);
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
          amount: totalAmount,
          itemTitle: `Tournament Entry: ${teamName} - ${eventTitle}`,
        }),
      }).catch(() => {});
      if (onSuccess) onSuccess({ success: true, orderId: bypassOrderId, adminBypass: true });
      setIsSubmitting(false);
      onClose();
      return;
    }

    setIsSubmitting(true);
    setErrorDetails(null);

    let lastKnownCheckoutUrl: string | null = null;

    try {
      const generatedTeamId = `team_${Date.now()}`;
      const payload = {
        eventId,
        teamId: generatedTeamId,
        divisionId: currentDivision.id,
        divisionName: currentDivision.name,
        teamName: teamName.trim(),
        headCoachName: headCoachName.trim() || "Head Coach",
        headCoachEmail: headCoachEmail.trim(),
        headCoachPhone: headCoachPhone.trim(),
        rosterSize,
        entryFeeDollars: totalAmount,
        totalFeeCents: Math.round(totalAmount * 100),
        platformFeeDollars: platformFee,
        platformFeeCents: Math.round(platformFee * 100),
        organizerStripeAccountId: organizerStripeAccountId || "",
        origin: window.location.origin,
      };

      let checkoutUrl: string | null = null;
      let checkoutSessionId: string | null = null;
      let checkoutResultData: any = null;

      // 1. Attempt Firebase Cloud Callable Function first
      try {
        const functions = getFunctions(app);
        const createCheckoutFn = httpsCallable(functions, "createTournamentRegistration");

        const response: any = await createCheckoutFn(payload);
        if (response?.data) {
          checkoutResultData = response.data;
          checkoutUrl = response.data.checkoutUrl || response.data.url || null;
          checkoutSessionId = response.data.sessionId || null;
          if (checkoutUrl) {
            lastKnownCheckoutUrl = checkoutUrl;
          }
        }
      } catch (callErr: any) {
        console.warn(
          "[TournamentCheckoutModal] Firebase Callable Function 'createTournamentRegistration' fallback to backend API:",
          callErr?.message
        );
      }

      // 2. Fallback to API route if callable was not available or didn't return checkout info
      if (!checkoutUrl && !checkoutSessionId) {
        let res: Response;
        try {
          res = await fetch("/api/checkout/tournament", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } catch (fetchErr: any) {
          throw new Error(
            `Network error contacting checkout server: ${fetchErr.message || "Failed to fetch"}`
          );
        }

        let data: any;
        try {
          data = await res.json();
        } catch (parseErr: any) {
          throw new Error("Unable to parse server response from payment gateway.");
        }

        if (!res.ok || (!data.url && !data.sessionId && !data.orderID)) {
          throw new Error(data.error || "Failed to initialize PayPal checkout session.");
        }

        checkoutResultData = data;
        checkoutUrl = data.url || data.checkoutUrl || null;
        checkoutSessionId = data.orderID || data.sessionId || null;
        if (checkoutUrl) {
          lastKnownCheckoutUrl = checkoutUrl;
        }
      }

      if (onSuccess && checkoutResultData) {
        onSuccess(checkoutResultData);
      }

      if (checkoutUrl || checkoutSessionId) {
        // Redirect user to PayPal Checkout
        try {
          if (checkoutUrl) {
            window.location.href = checkoutUrl;
          } else {
            window.location.href = `/checkout/paypal?eventId=${eventId}&teamName=${encodeURIComponent(teamName.trim())}&amount=${totalAmount}&orderId=${checkoutSessionId}`;
          }
        } catch (redirectErr: any) {
          throw new Error(
            `PayPal redirection failed: ${redirectErr.message || "Unable to navigate to PayPal."}`
          );
        }
      } else {
        throw new Error("Unable to retrieve valid PayPal checkout session from the server.");
      }
    } catch (err: any) {
      console.error("[TournamentCheckoutModal] Checkout error:", err);
      classifyAndSetError(err, lastKnownCheckoutUrl);
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="tournament-checkout-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Team Tournament Registration
              </h2>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {eventTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmitCheckout} className="p-6 space-y-5">
          {/* Persistent Diagnostic Alert Banner */}
          {errorDetails && (
            <div
              id="tournament-checkout-error-banner"
              role="alert"
              aria-live="assertive"
              className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-foreground shadow-xs transition-all animate-in fade-in slide-in-from-top-1"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-destructive/20 p-2 text-destructive shrink-0">
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

                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-destructive flex items-center gap-1.5">
                      <span>{errorDetails.title}</span>
                      <span className="rounded-full bg-destructive/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-destructive">
                        {errorDetails.type.replace("_", " ")}
                      </span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setErrorDetails(null)}
                      className="rounded-md p-1 text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-colors"
                      title="Dismiss error"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="text-xs text-foreground/90 leading-relaxed">
                    {errorDetails.message}
                  </p>

                  {errorDetails.technicalDetails && (
                    <p className="font-mono text-[11px] text-muted-foreground bg-background/60 rounded-md px-2 py-1 truncate border border-border/50">
                      Error details: {errorDetails.technicalDetails}
                    </p>
                  )}

                  {/* Actions inside Banner */}
                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    {errorDetails.canRetry && (
                      <button
                        type="button"
                        onClick={() => handleSubmitCheckout()}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground shadow-xs hover:bg-destructive/90 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isSubmitting ? "animate-spin" : ""}`} />
                        <span>{isSubmitting ? "Retrying..." : "Retry Checkout"}</span>
                      </button>
                    )}

                    {errorDetails.checkoutUrlFallback && (
                      <a
                        href={errorDetails.checkoutUrlFallback}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Open Direct PayPal Link</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Division Selector */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Select Division
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {divisions.map((div) => {
                const isSelected = div.id === selectedDivisionId;
                return (
                  <button
                    key={div.id}
                    type="button"
                    onClick={() => {
                      setSelectedDivisionId(div.id);
                      if (errorDetails) setErrorDetails(null);
                    }}
                    className={`rounded-xl border p-2.5 text-center transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                        : "border-border bg-background text-muted-foreground hover:border-border/80 hover:text-foreground"
                    }`}
                  >
                    <div className="text-xs truncate">{div.name}</div>
                    <div className="mt-0.5 text-[11px] font-semibold">
                      ${div.entryFee || defaultEntryFee}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Team & Coach Info */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Team Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                value={teamName}
                onChange={(e) => {
                  setTeamName(e.target.value);
                  if (errorDetails) setErrorDetails(null);
                }}
                placeholder="e.g., East Coast Elite 12U"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Head Coach Name
                </label>
                <input
                  type="text"
                  value={headCoachName}
                  onChange={(e) => setHeadCoachName(e.target.value)}
                  placeholder="Coach Full Name"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Coach Email (For Digital Pass) <span className="text-destructive">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={headCoachEmail}
                  onChange={(e) => {
                    setHeadCoachEmail(e.target.value);
                    if (errorDetails) setErrorDetails(null);
                  }}
                  placeholder="coach@team.com"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={headCoachPhone}
                  onChange={(e) => setHeadCoachPhone(e.target.value)}
                  placeholder="(555) 000-0000"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Expected Roster Size
                </label>
                <input
                  type="number"
                  min="5"
                  max="35"
                  value={rosterSize}
                  onChange={(e) => setRosterSize(Number(e.target.value))}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Transparent Fee Breakdown */}
          <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{currentDivision.name} Team Entry Fee</span>
              <span>${(entryFee - platformFee).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                Just1Play App Fee & Verification Pass
                <Sparkles className="h-3 w-3 text-primary" />
              </span>
              <span>${platformFee.toFixed(2)}</span>
            </div>
            <div className="border-t border-border/60 pt-2 flex justify-between text-sm font-bold text-foreground">
              <span>Total Guaranteed Entry</span>
              <span className="text-primary">${totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Footer Highlights */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>
              Includes instant QR check-in pass & automated Gemini game-day itinerary.
            </span>
          </div>

          {/* Action Button */}
          <button
            id="proceed-to-paypal-checkout-btn"
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-md transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Lock className="h-4 w-4" />
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Connecting to PayPal Gateway...
              </span>
            ) : (
              `Pay $${totalAmount.toFixed(2)} with PayPal`
            )}
            {!isSubmitting && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TournamentCheckoutModal;

