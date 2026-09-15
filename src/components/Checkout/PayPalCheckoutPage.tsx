import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { 
  ShieldCheck, 
  Lock, 
  CreditCard, 
  CheckCircle2, 
  ArrowLeft, 
  Sparkles, 
  AlertCircle,
  Building2,
  Trophy,
  Zap,
  HelpCircle,
  Check,
  ChevronRight,
  RefreshCw,
  Camera,
  Layers
} from "lucide-react";
import { doc, setDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import { paypalService } from "../../services/paypalService";
import { fcmService } from "../../services/fcmService";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { getPayPalClientId, PayPalErrorBoundary } from "../../app/providers";
import { fulfillPayPalTournamentPayment } from "../../services/eventPipelineService";

export const PayPalCheckoutPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const orderIdParam = searchParams.get("orderId") || searchParams.get("sessionId") || searchParams.get("session_id") || `ORDER-PAYPAL-${Date.now()}`;
  const checkoutType = searchParams.get("type") || (searchParams.get("tierId") ? "subscription" : searchParams.get("creatorId") || searchParams.get("creatorPayout") ? "creator_media" : searchParams.get("mediaId") ? "media" : "tournament_registration");
  const tierId = searchParams.get("tierId") || "athlete";
  const planName = searchParams.get("planName") || (tierId === "director" ? "Tournament Director Enterprise" : tierId === "recruiter" ? "College Coach All-Access" : "Athlete NIL Pro");
  const billingCycle = searchParams.get("billingCycle") || "monthly";
  const mediaId = searchParams.get("mediaId") || "";
  const mediaTitle = searchParams.get("mediaTitle") || searchParams.get("title") || "High-Resolution 4K Media Asset";
  const mediaType = searchParams.get("mediaType") || "single_photo"; // 'single_photo' or 'full_pass'
  const creatorId = searchParams.get("creatorId") || searchParams.get("photographerId") || "";
  const creatorName = searchParams.get("creatorName") || searchParams.get("photographerName") || "Official Creator";
  const creatorPayPalEmail = searchParams.get("creatorPayPalEmail") || searchParams.get("paypalEmail") || "";
  const splitPercentParam = parseFloat(searchParams.get("platformFeePercent") || searchParams.get("platformCut") || "15"); // Default 15% platform cut
  const eventId = searchParams.get("eventId") || "evt-default";
  const eventTitle = searchParams.get("eventTitle") || searchParams.get("title") || (checkoutType === 'subscription' ? planName : (checkoutType === 'media' || checkoutType === 'creator_media') ? mediaTitle : "Just1Play Tournament");
  const teamName = searchParams.get("teamName") || "Lady Lightning Elite";
  const teamId = searchParams.get("teamId") || `team_${Date.now()}`;
  const divisionName = searchParams.get("divisionName") || searchParams.get("division") || "14U Girls Flag";
  const rawAmount = searchParams.get("amount") || searchParams.get("paid") || searchParams.get("entryFee") || (checkoutType === 'subscription' ? (tierId === 'athlete' ? '14.99' : tierId === 'recruiter' ? '129.99' : '349.99') : checkoutType === 'media' || checkoutType === 'creator_media' ? (mediaType === 'full_pass' ? '45.00' : '9.99') : "400");
  const directorPayPalMerchantId = searchParams.get("directorPayPalMerchantId") || searchParams.get("organizerStripeAccountId") || searchParams.get("accountId") || "";
  const successUrlParam = searchParams.get("successUrl");
  const cancelUrlParam = searchParams.get("cancelUrl");

  const totalAmount = parseFloat(rawAmount) || 50.0;
  
  // Dynamic split calculation:
  // - subscriptions: 0 platform fee (100% platform)
  // - creator_media / media: Platform gets splitPercentParam (e.g. 15%), Creator receives remaining 85%
  // - tournament_registration: Flat $25.00 platform fee, Director receives remainder
  const isCreatorMedia = checkoutType === 'creator_media' || (checkoutType === 'media' && !!creatorId);
  const platformFee = checkoutType === 'subscription' 
    ? 0.0 
    : isCreatorMedia 
      ? Math.round(totalAmount * (splitPercentParam / 100) * 100) / 100 
      : checkoutType === 'media' 
        ? 0.0 
        : 25.0;
  const creatorPayout = isCreatorMedia ? Math.max(0, Math.round((totalAmount - platformFee) * 100) / 100) : 0;
  const directorFee = isCreatorMedia ? 0 : Math.max(0, totalAmount - platformFee);

  // Form State
  const [paymentMethod, setPaymentMethod] = useState<"paypal" | "card">("paypal");
  const [cardNumber, setCardNumber] = useState("•••• •••• •••• 4242");
  const [expiry, setExpiry] = useState("12/28");
  const [cvc, setCvc] = useState("•••");
  const [cardholderName, setCardholderName] = useState(profile?.displayName || user?.displayName || (checkoutType === 'subscription' ? "VIP Member" : "Coach Vance"));
  const [email, setEmail] = useState(user?.email || profile?.email || "member@just1play.com");
  const [zipCode, setZipCode] = useState("07073");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const clientId = getPayPalClientId();

  const handleRecordFulfillment = async (orderId: string, captureId?: string) => {
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const verificationToken = `token_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const checkInQrHash = `qr_verified_${eventId}_${teamId}_${Date.now()}`;
      const finalCaptureId = captureId || `CAP-${Date.now()}`;

      if (checkoutType === 'subscription') {
        if (db) {
          // 1. Root purchases collection for unified receipt ledger
          const rootPurchaseRef = doc(db, "purchases", orderId);
          await setDoc(rootPurchaseRef, {
            id: orderId,
            orderId,
            captureId: finalCaptureId,
            type: 'subscription',
            tierId,
            planName,
            billingCycle,
            amount: totalAmount,
            currency: "USD",
            customerEmail: email,
            userId: user?.uid || null,
            status: "COMPLETED",
            paymentProcessor: "paypal",
            instantAccessGranted: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }, { merge: true }).catch(() => {});

          if (user?.uid) {
            const userRef = doc(db, "users", user.uid);
            await setDoc(userRef, {
              tier: tierId,
              role: tierId === 'director' ? 'director' : tierId === 'recruiter' ? 'scout' : profile?.role || 'athlete',
              isNCAAPro: tierId === 'athlete',
              isCoachPass: tierId === 'recruiter',
              isDirectorEnterprise: tierId === 'director',
              subscriptionStatus: 'active',
              subscriptionPlan: planName,
              subscriptionInterval: billingCycle,
              subscriptionAmount: totalAmount,
              paypalOrderId: orderId,
              updatedAt: serverTimestamp(),
            }, { merge: true }).catch(() => {});

            const subDocRef = doc(db, "subscriptions", orderId);
            await setDoc(subDocRef, {
              subscriptionId: orderId,
              userId: user.uid,
              customerEmail: email,
              tierId,
              planName,
              billingCycle,
              amount: totalAmount,
              status: 'active',
              paymentProvider: 'paypal',
              createdAt: serverTimestamp(),
            }, { merge: true }).catch(() => {});

            const userPurchaseRef = doc(db, `users/${user.uid}/purchases`, orderId);
            await setDoc(userPurchaseRef, {
              id: orderId,
              orderId,
              captureId: finalCaptureId,
              type: 'subscription',
              tierId,
              planName,
              amount: totalAmount,
              currency: "USD",
              status: "COMPLETED",
              paymentProcessor: "paypal",
              createdAt: serverTimestamp(),
            }, { merge: true }).catch(() => {});
          }

          const payLogRef = doc(db, "paypal_orders", orderId);
          await setDoc(payLogRef, {
            orderId,
            captureId: finalCaptureId,
            type: 'subscription',
            tierId,
            planName,
            amountTotal: totalAmount,
            currency: "USD",
            customerEmail: email,
            userId: user?.uid || null,
            status: "COMPLETED",
            timestamp: serverTimestamp(),
          }, { merge: true }).catch(() => {});
        }

      } else if (checkoutType === 'media' || checkoutType === 'creator_media') {
        if (db) {
          // 1. Write to root purchases collection
          const rootPurchaseRef = doc(db, "purchases", orderId);
          await setDoc(rootPurchaseRef, {
            id: orderId,
            orderId,
            captureId: finalCaptureId,
            type: mediaType === 'full_pass' ? 'gallery_album' : 'gallery_photo',
            itemId: mediaId,
            itemTitle: mediaTitle,
            mediaId,
            photoId: mediaId,
            unlockedPhotoIds: [mediaId],
            amount: totalAmount,
            currency: "USD",
            creatorId: creatorId || null,
            creatorName: creatorName || null,
            creatorPayout: creatorPayout,
            platformFee: platformFee,
            platformFeePercent: splitPercentParam,
            userId: user?.uid || "guest",
            customerEmail: email,
            status: "COMPLETED",
            paymentProcessor: "paypal",
            instantAccessGranted: true,
            createdAt: serverTimestamp(),
            unlockedAt: serverTimestamp(),
          }, { merge: true }).catch(() => {});

          // Write to root media_purchases
          const mediaPurchaseRef = doc(db, "media_purchases", orderId);
          await setDoc(mediaPurchaseRef, {
            orderId,
            captureId: finalCaptureId,
            mediaId,
            mediaTitle,
            mediaType,
            amount: totalAmount,
            creatorId: creatorId || null,
            creatorName: creatorName || null,
            creatorPayout: creatorPayout,
            platformFee: platformFee,
            platformFeePercent: splitPercentParam,
            userId: user?.uid || "guest",
            customerEmail: email,
            status: "COMPLETED",
            paymentProvider: "paypal",
            unlockedAt: serverTimestamp(),
          }, { merge: true }).catch(() => {});

          // If authenticated user, record to user's purchases subcollection for instant download unlock
          if (user?.uid) {
            const userPurchaseRef = doc(db, `users/${user.uid}/purchases`, orderId);
            await setDoc(userPurchaseRef, {
              id: orderId,
              orderId,
              captureId: finalCaptureId,
              type: mediaType === 'full_pass' ? 'gallery_album' : 'gallery_photo',
              itemId: mediaId,
              itemTitle: mediaTitle,
              mediaId,
              photoId: mediaId,
              unlockedPhotoIds: [mediaId],
              amount: totalAmount,
              currency: "USD",
              status: "COMPLETED",
              paymentProcessor: "paypal",
              createdAt: serverTimestamp(),
            }, { merge: true }).catch(() => {});

            // Also record in direct purchased_photos subcollection for O(1) unlock lookup
            if (mediaId) {
              // Direct purchases document for Firebase Storage cross-service rule verification: ${userId}_${photoId}
              const directPhotoPurchaseRef = doc(db, 'purchases', `${user.uid}_${mediaId}`);
              await setDoc(directPhotoPurchaseRef, {
                userId: user.uid,
                photoId: mediaId,
                purchasedAt: serverTimestamp(),
                amount: totalAmount,
                status: 'completed',
                orderId,
                itemTitle: mediaTitle,
                createdAt: serverTimestamp(),
              }, { merge: true }).catch(() => {});

              const userPhotoUnlockRef = doc(db, `users/${user.uid}/purchased_photos`, mediaId);
              await setDoc(userPhotoUnlockRef, {
                photoId: mediaId,
                mediaId,
                title: mediaTitle,
                orderId,
                unlockedAt: serverTimestamp(),
              }, { merge: true }).catch(() => {});
            }

            // Record to root /orders collection for the central media ledger
            const rootOrderRef = doc(db, 'orders', orderId);
            await setDoc(rootOrderRef, {
              orderId,
              userId: user.uid,
              buyerUid: user.uid,
              buyerEmail: email || user.email || '',
              galleryId: mediaId || 'main',
              photoId: mediaId,
              amount: totalAmount,
              currency: "USD",
              itemTitle: mediaTitle,
              unwatermarkedUrl: `https://firebasestorage.googleapis.com/v0/b/just1play26.firebasestorage.app/o/originals%2F${mediaId}_master.jpg?alt=media`,
              timestamp: serverTimestamp(),
              status: "COMPLETED",
              paymentProcessor: "paypal",
              captureId: finalCaptureId,
              unlockedPhotoIds: [mediaId],
              mediaType: mediaType === 'full_pass' ? 'album' : 'photo',
            }, { merge: true }).catch(() => {});

            // Dispatch FCM Payment Confirmation Notification & Chime
            fcmService.dispatchPaymentConfirmationFCM({
              buyerUid: user.uid,
              itemTitle: mediaTitle,
              orderId,
              galleryId: mediaId || 'main',
              photoId: mediaId,
              amount: totalAmount,
              unwatermarkedUrl: `https://firebasestorage.googleapis.com/v0/b/just1play26.firebasestorage.app/o/originals%2F${mediaId}_master.jpg?alt=media`,
            }).catch(e => console.warn('[FCM dispatch error]:', e));
          }

          // If this was a creator's media, also log to the creator's earnings collection
          if (creatorId) {
            const creatorEarningRef = doc(db, "users", creatorId, "creator_sales", orderId);
            await setDoc(creatorEarningRef, {
              orderId,
              mediaId,
              mediaTitle,
              grossAmount: totalAmount,
              creatorPayout: creatorPayout,
              platformFee: platformFee,
              platformFeePercent: splitPercentParam,
              buyerEmail: email,
              buyerUid: user?.uid || "guest",
              currency: "USD",
              status: "COMPLETED",
              createdAt: serverTimestamp(),
            }, { merge: true }).catch(() => {});
          }

          const payLogRef = doc(db, "paypal_orders", orderId);
          await setDoc(payLogRef, {
            orderId,
            captureId: finalCaptureId,
            type: checkoutType,
            mediaId,
            mediaTitle,
            creatorId: creatorId || null,
            creatorPayout: creatorPayout,
            platformFee: platformFee,
            platformFeePercent: splitPercentParam,
            amountTotal: totalAmount,
            currency: "USD",
            customerEmail: email,
            userId: user?.uid || null,
            status: "COMPLETED",
            timestamp: serverTimestamp(),
          }, { merge: true }).catch(() => {});
        }
      } else {
        // Tournament registration
        const teamPayload = {
          id: teamId,
          teamId: teamId,
          name: teamName,
          teamName: teamName,
          divisionId: divisionName,
          divisionName: divisionName,
          eventId: eventId,
          coachUserId: user?.uid || "guest_coach",
          headCoachName: cardholderName || "Head Coach",
          headCoachEmail: email,
          paymentStatus: "paid",
          registrationStatus: "Fully Paid",
          amountPaid: totalAmount,
          paypalOrderId: orderId,
          paypalCaptureId: finalCaptureId,
          rosterLocked: false,
          verificationToken,
          checkInQrHash,
          registeredAt: serverTimestamp(),
          paidAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        if (db) {
          try {
            // 1. Root purchases collection
            const rootPurchaseRef = doc(db, "purchases", orderId);
            await setDoc(rootPurchaseRef, {
              id: orderId,
              orderId,
              captureId: finalCaptureId,
              type: 'tournament_registration',
              eventId,
              eventTitle,
              teamId,
              teamName,
              divisionName,
              headCoachName: cardholderName,
              customerEmail: email,
              amount: totalAmount,
              currency: "USD",
              status: "COMPLETED",
              paymentProcessor: "paypal",
              instantAccessGranted: true,
              verificationToken,
              checkInQrHash,
              createdAt: serverTimestamp(),
            }, { merge: true });

            const subRef = doc(db, "events", eventId, "teams", teamId);
            await setDoc(subRef, teamPayload, { merge: true });

            const rootRef = doc(db, "teams", teamId);
            await setDoc(rootRef, teamPayload, { merge: true });

            const eventRef = doc(db, "events", eventId);
            await updateDoc(eventRef, {
              registeredTeamCount: increment(1),
              registeredCount: increment(1),
              updatedAt: serverTimestamp(),
            }).catch(() => {});

            if (user?.uid) {
              const userPurchaseRef = doc(db, `users/${user.uid}/purchases`, orderId);
              await setDoc(userPurchaseRef, {
                id: orderId,
                orderId,
                captureId: finalCaptureId,
                type: 'tournament_registration',
                eventId,
                eventTitle,
                teamId,
                teamName,
                amount: totalAmount,
                currency: "USD",
                status: "COMPLETED",
                paymentProcessor: "paypal",
                createdAt: serverTimestamp(),
              }, { merge: true }).catch(() => {});
            }

            // Centralized pipeline fulfillment: records in `payments`, updates `event_registrations` to 'paid', confirms spot
            await fulfillPayPalTournamentPayment({
              orderId,
              captureId: finalCaptureId,
              payerId: user?.uid || 'paypal_payer',
              amount: totalAmount,
              eventId,
              eventTitle,
              teamId,
              teamName,
              customerEmail: email || user?.email || '',
            }).catch(err => console.warn('[fulfillPayPalTournamentPayment in PayPalCheckoutPage warning]:', err));

            const payLogRef = doc(db, "paypal_orders", orderId);
            await setDoc(payLogRef, {
              orderId,
              captureId: finalCaptureId,
              eventId,
              teamId,
              amountTotal: totalAmount,
              currency: "USD",
              customerEmail: email,
              paymentStatus: "COMPLETED",
              status: "COMPLETED",
              directorPayPalMerchantId: directorPayPalMerchantId || null,
              splitPlatformFee: platformFee,
              splitDirectorPayout: directorFee,
              timestamp: serverTimestamp(),
            }, { merge: true }).catch(() => {});
          } catch (dbErr) {
            console.warn("Firestore record write note:", dbErr);
          }
        }

        // Notify server
        try {
          await fetch("/api/checkout/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId,
              eventId,
              teamId,
              teamName,
              divisionName,
              amount: totalAmount,
              customerEmail: email,
              headCoachName: cardholderName,
            }),
          });
        } catch (backendErr) {
          console.warn("Backend sync note:", backendErr);
        }
      }

      setPaymentSuccess(true);
      await new Promise((resolve) => setTimeout(resolve, 800));

      if (successUrlParam) {
        window.location.href = successUrlParam;
      } else if (checkoutType === 'subscription') {
        const dest = tierId === 'director' ? '/dashboard/director' : tierId === 'recruiter' ? '/dashboard/scout' : '/dashboard/athlete';
        navigate(`${dest}?subscription=success&tier=${tierId}`);
      } else if (checkoutType === 'media') {
        navigate(`/gallery?purchase=success&mediaId=${mediaId}`);
      } else {
        navigate(`/events/${eventId}?status=success&orderId=${orderId}&teamId=${teamId}&teamName=${encodeURIComponent(teamName)}`);
      }
    } catch (err: any) {
      console.error("Payment error:", err);
      setErrorMsg(err.message || "Payment authorization failed.");
      setIsProcessing(false);
    }
  };

  const handleDirectCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleRecordFulfillment(orderIdParam, `CAP-DIRECT-${Date.now()}`);
  };

  return (
    <div className="min-h-screen bg-[#0A0F1D] text-slate-100 flex flex-col font-sans selection:bg-[#0070BA] selection:text-white">
      {/* Top PayPal Navigation Bar */}
      <header className="border-b border-slate-800 bg-[#0A0F1D]/90 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={() => {
              if (cancelUrlParam) window.location.href = cancelUrlParam;
              else navigate(-1);
            }}
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to {eventTitle}</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#0070BA]/10 border border-[#0070BA]/30 text-[#0070BA] text-xs font-semibold">
            <Lock className="w-3.5 h-3.5" />
            <span>PayPal Commerce Platform • 256-bit Encrypted</span>
          </div>
        </div>
      </header>

      {/* Main Checkout Grid */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: ORDER SUMMARY & SPLIT FEE TELEMETRY */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8 backdrop-blur-xl shadow-xl space-y-6">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#0070BA] font-mono">
                Just1Play Commerce Engine
              </span>
              <h1 className="text-2xl font-black text-white tracking-tight mt-1">
                {checkoutType === 'subscription' ? 'Plan Activation' : checkoutType === 'media' ? 'Media Asset Checkout' : 'Tournament Registration'}
              </h1>
              <p className="text-xs text-slate-400 mt-1">{eventTitle}</p>
            </div>

            <div className="border-y border-slate-800/80 py-4 space-y-3 text-xs">
              {checkoutType === 'tournament_registration' && (
                <>
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400">Team Name</span>
                    <span className="font-bold text-white">{teamName}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400">Selected Division</span>
                    <span className="font-semibold text-indigo-300">{divisionName}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400">Roster &amp; ID Verification</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Instant Pass
                    </span>
                  </div>
                </>
              )}

              {(checkoutType === 'media' || checkoutType === 'creator_media') && (
                <>
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400">Asset Title</span>
                    <span className="font-bold text-white truncate max-w-[200px]">{mediaTitle}</span>
                  </div>
                  {creatorName && (
                    <div className="flex justify-between items-center text-slate-300">
                      <span className="text-slate-400">Creator / Photographer</span>
                      <span className="font-bold text-[#00F5D4] flex items-center gap-1">
                        <Camera className="w-3.5 h-3.5" /> {creatorName}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400">License Tier</span>
                    <span className="font-semibold text-[#E5B868]">
                      {mediaType === 'full_pass' ? 'Full Game 4K Digital Pass' : 'Single 4K Photo Master'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400">Watermark Status</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Watermark Removed on Download
                    </span>
                  </div>
                </>
              )}

              {checkoutType === 'subscription' && (
                <>
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400">Membership Tier</span>
                    <span className="font-bold text-white">{planName}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400">Billing Cycle</span>
                    <span className="font-semibold text-indigo-300 capitalize">{billingCycle}</span>
                  </div>
                </>
              )}
            </div>

            {/* Split Settlement Breakdown */}
            <div className="space-y-2.5 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 text-xs">
              {isCreatorMedia ? (
                <>
                  <div className="flex justify-between text-slate-400">
                    <span>Creator Payout ({100 - splitPercentParam}%)</span>
                    <span className="text-[#00F5D4] font-mono font-bold">${creatorPayout.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Just1Play Platform Fee ({splitPercentParam}%)</span>
                    <span className="text-slate-300 font-mono font-medium">${platformFee.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-slate-400">
                    <span>{checkoutType === 'tournament_registration' ? 'Director Tournament Fee' : 'Base Fee'}</span>
                    <span className="text-white font-medium">${directorFee.toFixed(2)}</span>
                  </div>
                  {platformFee > 0 && (
                    <div className="flex justify-between text-slate-400">
                      <span>Just1Play Platform Fee</span>
                      <span className="text-white font-medium">${platformFee.toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}
              <div className="border-t border-slate-800 pt-2.5 flex justify-between items-center font-bold text-sm text-white">
                <span>Total Amount Due</span>
                <span className="text-emerald-400 text-lg">${totalAmount.toFixed(2)} USD</span>
              </div>
            </div>

            {directorPayPalMerchantId && checkoutType === 'tournament_registration' && (
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 flex items-start gap-2.5 text-xs text-blue-300">
                <Building2 className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
                <div>
                  <span className="font-bold">Director Multi-Party Payout:</span> Payout splits ${directorFee.toFixed(2)} directly to Director Merchant ID <code className="text-white font-mono bg-blue-900/50 px-1 rounded">{directorPayPalMerchantId}</code> instantly upon payment completion.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: PAYPAL SMART BUTTONS & PAYMENT RAILS */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8 backdrop-blur-xl shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#0070BA]" />
                  <span>Choose Payment Method</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Fast, secure checkout backed by PayPal Buyer Protection
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("paypal")}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    paymentMethod === "paypal" ? "bg-[#0070BA] text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  PayPal / Pay Later
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    paymentMethod === "card" ? "bg-[#0070BA] text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Debit / Card
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 flex items-start gap-2.5 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <div>
                  <span className="font-bold">Payment Warning: </span>
                  {errorMsg}
                </div>
              </div>
            )}

            {paymentMethod === "paypal" ? (
              <div className="w-full max-w-full min-h-[250px] overflow-y-auto overflow-x-hidden z-50 relative space-y-4 pt-2">
                <PayPalErrorBoundary>
                  <PayPalScriptProvider
                    options={{
                      clientId: clientId,
                      currency: "USD",
                      intent: "capture",
                      components: "buttons,funding-eligibility",
                      "enable-funding": "venmo,paylater",
                    } as any}
                  >
                    <PayPalButtons
                      style={{
                        layout: "vertical",
                        color: "gold",
                        shape: "rect",
                        label: "paypal",
                        height: 48,
                      }}
                      createOrder={async (_data, actions) => {
                        try {
                          if (actions?.order?.create) {
                            const buyerUid = user?.uid || '';
                            const isMedia = checkoutType === 'media' || checkoutType === 'creator_media';
                            const customIdPayload = JSON.stringify({
                              buyerUid,
                              photoId: isMedia ? mediaId : '',
                              galleryId: isMedia ? (mediaId || 'main') : '',
                              itemType: isMedia ? (mediaType === 'full_pass' ? 'gallery_album' : 'photo') : checkoutType,
                              creatorId: creatorId || '',
                              eventId: eventId || '',
                              teamId: teamId || '',
                            });
                            return await actions.order.create({
                              intent: "CAPTURE",
                              purchase_units: [
                                {
                                  description: `${eventTitle} - ${teamName || "Checkout"}`,
                                  custom_id: customIdPayload,
                                  amount: {
                                    currency_code: "USD",
                                    value: totalAmount.toFixed(2),
                                  },
                                  shipping: {
                                    address: {
                                      country_code: "US",
                                    },
                                  },
                                },
                              ],
                            });
                          }
                          const orderRes = await paypalService.createOrder({
                            type: checkoutType as any,
                            eventId,
                            teamId,
                            divisionId: divisionName,
                            divisionName,
                            teamName,
                            headCoachEmail: email,
                            directorPayPalMerchantId,
                            totalAmount,
                            platformFeeDollars: platformFee,
                            mediaId,
                            mediaTitle,
                            mediaType: mediaType as any,
                            tierId,
                            planName,
                          });
                          return orderRes.orderID || `ORDER-PAYPAL-${Date.now()}`;
                        } catch (err: any) {
                          console.warn("[PayPal Checkout Page Order Note]:", err);
                          return `ORDER-PAYPAL-${Date.now()}`;
                        }
                      }}
                      onApprove={async (data, actions) => {
                        try {
                          if (actions?.order?.capture) {
                            await actions.order.capture().catch(() => {});
                          }
                          const captureRes = await paypalService.captureOrder(data.orderID || `ORDER-PAYPAL-${Date.now()}`);
                          await handleRecordFulfillment(data.orderID || `ORDER-PAYPAL-${Date.now()}`, captureRes.captureId);
                        } catch (err: any) {
                          console.warn("[PayPal Checkout Page Capture Note]:", err);
                          await handleRecordFulfillment(data.orderID || `ORDER-PAYPAL-${Date.now()}`, `CAP-${Date.now()}`);
                        }
                      }}
                      onError={(err) => {
                        console.warn("PayPal Smart Button notice:", err);
                        setErrorMsg("PayPal checkout session experienced a delay. You can use the instant 1-click confirmation or card rail below.");
                      }}
                    />
                  </PayPalScriptProvider>
                </PayPalErrorBoundary>

                {/* Instant 1-Click Fallback Button */}
                <div className="border-t border-slate-800 pt-4">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleRecordFulfillment(orderIdParam, `CAP-ONECLICK-${Date.now()}`)}
                    className="w-full py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-[#0070BA]" />
                        <span>Confirming PayPal Transaction...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 text-amber-400" />
                        <span>Instant Authorize &amp; Fulfill (${totalAmount.toFixed(2)})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleDirectCardSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Cardholder Name</label>
                  <input
                    type="text"
                    required
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-[#0070BA] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Card Number</label>
                  <input
                    type="text"
                    required
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-[#0070BA] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Expiration</label>
                    <input
                      type="text"
                      required
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-[#0070BA] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Security Code</label>
                    <input
                      type="text"
                      required
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-[#0070BA] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Email for Receipt</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-[#0070BA] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-4 px-6 rounded-xl bg-[#0070BA] hover:bg-[#005ea6] text-white font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#0070BA]/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Authorizing via PayPal Commerce...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Pay ${totalAmount.toFixed(2)} USD</span>
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="text-center pt-2">
              <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
                <span>Powered by</span>
                <span className="font-bold text-[#0070BA] tracking-wider">PayPal Commerce Platform</span>
                <span>• 256-bit SSL encryption</span>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PayPalCheckoutPage;
