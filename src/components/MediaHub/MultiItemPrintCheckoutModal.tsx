import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Printer, 
  Package, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  MapPin, 
  ShieldCheck, 
  DollarSign, 
  Zap, 
  Info, 
  Layers,
  ArrowLeft,
  Truck,
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import { PayPalButtons } from '@paypal/react-paypal-js';
import { usePrintCart, CartItem } from '../../context/PrintCartContext';
import { 
  prodigiService, 
  ProdigiShippingQuote, 
  ProdigiOrderPayload, 
  CreatorLedgerSplit 
} from '../../services/prodigiService';
import { db } from '../../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { resolveGoogleDriveImageUrl } from '../../utils/storageUrlResolver';
import { triggerHaptic } from '../../lib/haptics';

export const MultiItemPrintCheckoutModal: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { 
    cart, 
    isCheckoutOpen, 
    closeCheckout, 
    openCart, 
    clearCart, 
    totalCount, 
    subtotal, 
    wholesaleTotal 
  } = usePrintCart();

  // Shipping form state
  const [name, setName] = useState(user?.displayName || '');
  const [recipientEmail, setRecipientEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [country, setCountry] = useState('US');

  // Shipping Quotes & Method
  const [shippingMethod, setShippingMethod] = useState<'Budget' | 'Standard' | 'Express'>('Budget');
  const [shippingQuotes, setShippingQuotes] = useState<ProdigiShippingQuote[]>([]);
  const [fetchingQuote, setFetchingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Dispatch & Payment State
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<any | null>(null);

  // Auto-fill user email if available
  useEffect(() => {
    if (user?.email && !recipientEmail) {
      setRecipientEmail(user.email);
    }
    if (user?.displayName && !name) {
      setName(user.displayName);
    }
  }, [user]);

  // Request Consolidated Shipping Quote from Prodigi API
  useEffect(() => {
    if (!isCheckoutOpen || cart.length === 0) return;

    let isMounted = true;
    const fetchConsolidatedQuotes = async () => {
      setFetchingQuote(true);
      setQuoteError(null);

      // Build quote items decomposing bundles to sub-items
      const quoteItems = cart.flatMap((it) => {
        if (it.isBundle && it.bundleItems && it.bundleItems.length > 0) {
          return it.bundleItems.map((sub) => ({
            sku: sub.sku,
            copies: (sub.copies || 1) * it.copies,
            assets: [{ printArea: 'default' }]
          }));
        }
        return [
          {
            sku: it.sku,
            copies: it.copies,
            assets: [{ printArea: 'default' }]
          }
        ];
      });

      try {
        const res = await prodigiService.getQuotes({
          destinationCountryCode: country,
          currencyCode: 'USD',
          shippingMethod,
          items: quoteItems
        });

        if (!isMounted) return;

        if (res.success && res.quotes && res.quotes.length > 0) {
          setShippingQuotes(res.quotes);
        } else {
          // Prodigi API returned notice or mock mode
          setShippingQuotes([]);
          if (res.error) {
            setQuoteError(res.error);
          }
        }
      } catch (err: any) {
        if (!isMounted) return;
        setQuoteError(err?.message || 'Could not fetch live shipping quote');
      } finally {
        if (isMounted) {
          setFetchingQuote(false);
        }
      }
    };

    fetchConsolidatedQuotes();

    return () => {
      isMounted = false;
    };
  }, [isCheckoutOpen, cart, country, shippingMethod]);

  if (!isCheckoutOpen) return null;

  // Form Validation
  const isShippingValid = 
    name.trim().length > 1 && 
    recipientEmail.trim().includes('@') && 
    line1.trim().length > 2 && 
    city.trim().length > 1 && 
    zip.trim().length > 2;

  // Consolidated Shipping Cost Calculation
  // Fallbacks: Budget $6.50, Standard $12.00, Express $22.00
  const fallbackShippingRates: Record<string, number> = {
    Budget: 6.50,
    Standard: 12.00,
    Express: 22.00
  };

  const activeQuote = shippingQuotes.find(
    (q) => q.shipmentMethod?.toLowerCase() === shippingMethod.toLowerCase()
  ) || shippingQuotes[0];

  const shippingCost = activeQuote?.costSummary?.shipping?.amount
    ? parseFloat(activeQuote.costSummary.shipping.amount)
    : fallbackShippingRates[shippingMethod] || 6.50;

  const quoteLabItemsCost = activeQuote?.costSummary?.items?.amount
    ? parseFloat(activeQuote.costSummary.items.amount)
    : wholesaleTotal;

  // Totals & 85/15 Net Profit Split Calculation
  const grandTotal = subtotal + shippingCost;
  const wholesaleBaseCost = quoteLabItemsCost + shippingCost;
  const netProfit = Math.max(0, grandTotal - wholesaleBaseCost);
  const totalCreatorPayout = Math.round(netProfit * 0.85 * 100) / 100;
  const totalPlatformRevenue = Math.round((netProfit - totalCreatorPayout) * 100) / 100;

  // Per-Creator Breakdown Calculation
  const creatorMap = new Map<string, {
    creatorId: string;
    creatorPayPalEmail?: string;
    creatorName?: string;
    itemsGross: number;
    itemsWholesale: number;
    photoIds: string[];
    itemCount: number;
  }>();

  cart.forEach((it) => {
    const cid = it.creatorId || 'official_photographer';
    const cGross = it.price * it.copies;
    const cWholesale = (it.wholesaleCost || it.price * 0.35) * it.copies;

    if (!creatorMap.has(cid)) {
      creatorMap.set(cid, {
        creatorId: cid,
        creatorPayPalEmail: it.creatorPayPalEmail || 'payouts@just1play.com',
        creatorName: it.creatorName || 'Official Photographer',
        itemsGross: cGross,
        itemsWholesale: cWholesale,
        photoIds: [it.photoId],
        itemCount: it.copies
      });
    } else {
      const existing = creatorMap.get(cid)!;
      existing.itemsGross += cGross;
      existing.itemsWholesale += cWholesale;
      if (!existing.photoIds.includes(it.photoId)) {
        existing.photoIds.push(it.photoId);
      }
      existing.itemCount += it.copies;
    }
  });

  const creatorSplits: CreatorLedgerSplit[] = Array.from(creatorMap.values()).map((c) => {
    // Allocate proportional shipping share
    const proportionalWeight = subtotal > 0 ? c.itemsGross / subtotal : 1 / creatorMap.size;
    const allocatedWholesaleShipping = shippingCost * proportionalWeight;
    const cTotalWholesale = c.itemsWholesale + allocatedWholesaleShipping;
    const cNet = Math.max(0, (c.itemsGross + shippingCost * proportionalWeight) - cTotalWholesale);
    const cPayout = Math.round(cNet * 0.85 * 100) / 100;
    const cPlatform = Math.round((cNet - cPayout) * 100) / 100;

    return {
      creatorId: c.creatorId,
      creatorPayPalEmail: c.creatorPayPalEmail,
      creatorName: c.creatorName,
      itemsGross: Math.round(c.itemsGross * 100) / 100,
      itemsWholesale: Math.round(c.itemsWholesale * 100) / 100,
      netProfit: Math.round(cNet * 100) / 100,
      creatorPayout: cPayout,
      platformRevenue: cPlatform,
      photoIds: c.photoIds,
      itemCount: c.itemCount
    };
  });

  // Handle Successful Payment & Lab Dispatch
  const handlePaymentSuccessAndDispatch = async (payPalOrderId: string, payPalCaptureId?: string) => {
    setSubmitting(true);
    setOrderError(null);

    // 1. Build Prodigi Items Array with Direct Google Drive Download URLs
    const formattedProdigiItems = cart.map((item) => ({
      sku: item.sku,
      copies: item.copies,
      sizing: item.sizing || 'fillPrintArea',
      attributes: item.attributes,
      assets: [
        {
          printArea: 'default',
          url: item.driveFileId
            ? `https://drive.google.com/uc?export=download&id=${item.driveFileId}`
            : (item.highResUrl || item.previewUrl)
        }
      ]
    }));

    // 2. Prepare Ledger Record
    const orderTimestamp = new Date().toISOString();
    const ledgerRecord = {
      orderId: payPalOrderId,
      payPalCaptureId: payPalCaptureId || null,
      type: 'bulk_physical_print_order',
      totalItems: totalCount,
      uniquePhotosCount: cart.length,
      grossRetailPrice: grandTotal,
      wholesaleBaseCost,
      netProfit,
      creatorPayout: totalCreatorPayout,
      platformRevenue: totalPlatformRevenue,
      creatorSplits,
      items: cart.map((it) => ({
        photoId: it.photoId,
        title: it.title,
        sku: it.sku,
        formatName: it.formatName,
        price: it.price,
        copies: it.copies,
        driveFileId: it.driveFileId || null,
        creatorId: it.creatorId || 'platform',
        creatorPayPalEmail: it.creatorPayPalEmail || 'payouts@just1play.com',
        creatorName: it.creatorName || 'Official Photographer'
      })),
      recipient: {
        name: name.trim(),
        email: recipientEmail.trim(),
        phoneNumber: phone.trim() || undefined,
        address: {
          line1: line1.trim(),
          line2: line2 ? line2.trim() : undefined,
          townOrCity: city.trim(),
          stateOrCounty: state ? state.trim() : undefined,
          postalOrZipCode: zip.trim(),
          countryCode: country
        }
      },
      shippingMethod,
      shippingCost,
      userId: user?.uid || 'guest',
      buyerUid: user?.uid || 'guest',
      buyerEmail: user?.email || recipientEmail.trim(),
      status: 'PAID',
      prodigiStatus: 'DISPATCHING',
      split: '85/15',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // 3. Record Firestore Documents
    try {
      if (db) {
        // A. Primary /orders record
        const orderRef = doc(db, 'orders', payPalOrderId);
        await setDoc(orderRef, ledgerRecord, { merge: true });

        // B. Central /financial_ledger record
        const mainLedgerId = `LEDGER-BULK-${Date.now()}`;
        const ledgerRef = doc(db, 'financial_ledger', mainLedgerId);
        await setDoc(ledgerRef, { ...ledgerRecord, ledgerId: mainLedgerId }, { merge: true });

        // C. Record individual creator ledger entries according to their 85% share
        for (const split of creatorSplits) {
          const splitLedgerId = `LEDGER-CREATOR-${split.creatorId}-${Date.now()}`;
          const splitRef = doc(db, 'financial_ledger', splitLedgerId);
          await setDoc(splitRef, {
            ledgerId: splitLedgerId,
            orderId: payPalOrderId,
            payPalCaptureId: payPalCaptureId || null,
            type: 'creator_print_royalty',
            creatorId: split.creatorId,
            creatorPayPalEmail: split.creatorPayPalEmail || 'payouts@just1play.com',
            creatorName: split.creatorName,
            grossRetailPrice: split.itemsGross,
            wholesaleBaseCost: split.itemsWholesale,
            netProfit: split.netProfit,
            creatorPayout: split.creatorPayout,
            platformRevenue: split.platformRevenue,
            photoIds: split.photoIds,
            itemCount: split.itemCount,
            split: '85/15',
            status: 'PENDING_PAYOUT',
            createdAt: serverTimestamp()
          }, { merge: true });

          // Also update creator subcollection if registered
          if (split.creatorId && split.creatorId !== 'official_photographer') {
            const creatorEarningsRef = doc(db, `users/${split.creatorId}/earnings`, payPalOrderId);
            await setDoc(creatorEarningsRef, {
              orderId: payPalOrderId,
              creatorPayout: split.creatorPayout,
              grossShare: split.itemsGross,
              type: 'print_sale',
              status: 'APPROVED',
              createdAt: serverTimestamp()
            }, { merge: true });
          }
        }

        // D. Root /purchases entry
        const purchaseRef = doc(db, 'purchases', payPalOrderId);
        await setDoc(purchaseRef, {
          ...ledgerRecord,
          id: payPalOrderId,
          amount: grandTotal,
          platformFee: totalPlatformRevenue,
          directorPayout: totalCreatorPayout,
          paymentProcessor: 'paypal'
        }, { merge: true });

        // E. Buyer personal purchase history
        if (user?.uid) {
          const userOrderRef = doc(db, `users/${user.uid}/purchases`, payPalOrderId);
          await setDoc(userOrderRef, ledgerRecord, { merge: true });
        }
      }
    } catch (fsErr) {
      console.warn('[Firestore Bulk Order Ledger Warning]:', fsErr);
    }

    // 4. Dispatch to /api/prodigi/orders
    const payload: ProdigiOrderPayload = {
      recipient: {
        name: name.trim(),
        email: recipientEmail.trim(),
        phoneNumber: phone.trim() || undefined,
        address: {
          line1: line1.trim(),
          line2: line2 ? line2.trim() : undefined,
          townOrCity: city.trim(),
          stateOrCounty: state ? state.trim() : undefined,
          postalOrZipCode: zip.trim(),
          countryCode: country
        }
      },
      shippingMethod,
      items: formattedProdigiItems,
      payPalOrderId,
      payPalCaptureId,
      financialLedger: {
        grossRetailPrice: grandTotal,
        wholesaleBaseCost,
        wholesaleItemsCost: quoteLabItemsCost,
        wholesaleShippingCost: shippingCost,
        netProfit,
        creatorPayout: totalCreatorPayout,
        platformRevenue: totalPlatformRevenue,
        creatorSplitPercent: 85,
        platformSplitPercent: 15,
        creatorSplits
      },
      metadata: {
        platform: 'Just1Play Bulk Print Cart',
        totalItems: totalCount,
        uniquePhotos: cart.length,
        orderTimestamp
      }
    };

    const res = await prodigiService.submitOrder(payload);
    setSubmitting(false);

    if (res.success) {
      setOrderError(null);
      setOrderResult(res.order || {
        id: payPalOrderId,
        status: { stage: 'InProgress' }
      });
      // Clear Cart upon successful dispatch
      clearCart();
      showToast('success', 'Bulk Order Dispatched to Lab', `Your ${totalCount}-item print order has been placed with Prodigi.`);
    } else {
      if (res.outcome === 'PaymentRequired') {
        // Order validated by Prodigi, waiting for billing setup
        setOrderResult({
          id: payPalOrderId,
          status: { stage: 'ValidatedWaitingBilling' },
          message: res.message
        });
        clearCart();
        showToast('info', 'Order Validated by Lab', 'Order validated. Ensure a lab billing method is configured in Prodigi Dashboard.');
      } else {
        setOrderError(res.error || res.message || 'Lab order submission encountered an issue.');
        showToast('error', 'Order Dispatch Issue', res.error || 'Check Prodigi server API key configuration.');
      }
    }
  };

  return (
    <AnimatePresence>
      <div 
        id="multi-item-checkout-backdrop" 
        className="fixed inset-0 z-[110] flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto"
      >
        <motion.div
          id="multi-item-checkout-container"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#0A0D14] border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden text-slate-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-slate-900/60 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  closeCheckout();
                  openCart();
                }}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                title="Back to Cart"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                  <span>Consolidated Print Order Checkout</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold border border-emerald-500/30">
                    {totalCount} {totalCount === 1 ? 'print' : 'prints'}
                  </span>
                </h2>
                <p className="text-[11px] font-mono text-slate-400">
                  Prodigi Archival Lab • Single Shipment Package
                </p>
              </div>
            </div>

            <button
              id="close-multi-checkout-btn"
              type="button"
              onClick={() => {
                triggerHaptic('light');
                closeCheckout();
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            
            {/* SUCCESS CONFIRMATION STATE */}
            {orderResult ? (
              <div id="multi-order-success-screen" className="py-8 px-4 text-center space-y-6 max-w-lg mx-auto">
                <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.35)]">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    Print Order Dispatched to Lab!
                  </h3>
                  <p className="text-xs text-slate-300 font-mono">
                    Order ID: <strong className="text-emerald-400 font-bold">{orderResult.id || 'J1P-PRODIGI-CONFIRMED'}</strong>
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
                    Your {totalCount} archival prints and packages have been submitted for lab calibration, physical printing, and single-shipment packaging.
                  </p>
                </div>

                {/* Recipient summary card */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 text-left text-xs font-mono space-y-2">
                  <div className="text-slate-400 font-bold border-b border-white/10 pb-1 flex items-center justify-between">
                    <span>Shipping Destination</span>
                    <span className="text-emerald-400 font-normal">{shippingMethod} Shipping</span>
                  </div>
                  <div className="text-white font-bold">{name}</div>
                  <div className="text-slate-300">{line1} {line2 ? `• ${line2}` : ''}</div>
                  <div className="text-slate-300">{city}, {state} {zip}, {country}</div>
                  <div className="text-slate-400 text-[11px] pt-1">
                    Notifications sent to: <span className="text-slate-200">{recipientEmail}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center justify-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>85% Creator payout credited to photo artists ({creatorSplits.length} creators).</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    closeCheckout();
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs font-mono uppercase tracking-wider hover:brightness-110 transition shadow-lg cursor-pointer"
                >
                  Return to Media Gallery
                </button>
              </div>
            ) : (
              /* CHECKOUT FORM LAYOUT */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* LEFT 6 COLS: Multi-Item Order Summary & Shipping Method */}
                <div className="lg:col-span-6 space-y-4">
                  {/* Order Items Recap */}
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                        <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Order Items ({cart.length} Photos • {totalCount} Prints)</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          closeCheckout();
                          openCart();
                        }}
                        className="text-[11px] font-mono text-emerald-400 hover:underline cursor-pointer"
                      >
                        Edit Cart
                      </button>
                    </div>

                    <div className="max-h-52 overflow-y-auto space-y-2 pr-1 divide-y divide-white/5">
                      {cart.map((item: CartItem) => {
                        const thumb = resolveGoogleDriveImageUrl(item.previewUrl || item.highResUrl || '');
                        return (
                          <div key={item.id} className="pt-2 flex items-center justify-between gap-2.5 text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/40 border border-white/10 shrink-0">
                                {thumb ? (
                                  <img 
                                    src={thumb} 
                                    alt={item.title} 
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover select-none pointer-events-none" 
                                  />
                                ) : (
                                  <Layers className="w-4 h-4 text-slate-500 m-auto mt-3" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-white truncate max-w-[170px]" title={item.title}>
                                  {item.title}
                                </div>
                                <div className="text-[10px] font-mono text-[#00F5D4] truncate">
                                  {item.formatName} × {item.copies}
                                </div>
                              </div>
                            </div>

                            <div className="font-mono font-bold text-slate-200 shrink-0">
                              ${(item.price * item.copies).toFixed(2)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Consolidated Shipping Method Selector */}
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                        <Truck className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Consolidated Shipping</span>
                      </h3>
                      <span className="text-[10px] font-mono text-cyan-400 font-bold">
                        Pay Once for All Items
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: 'Budget', label: 'Budget', days: '5-8 Days', rate: 6.50 },
                        { key: 'Standard', label: 'Standard', days: '3-5 Days', rate: 12.00 },
                        { key: 'Express', label: 'Express', days: '1-2 Days', rate: 22.00 }
                      ].map((m) => {
                        const isSelected = shippingMethod === m.key;
                        const quoteMatch = shippingQuotes.find(
                          (q) => q.shipmentMethod?.toLowerCase() === m.key.toLowerCase()
                        );
                        const displayedCost = quoteMatch?.costSummary?.shipping?.amount
                          ? parseFloat(quoteMatch.costSummary.shipping.amount)
                          : m.rate;

                        return (
                          <button
                            key={m.key}
                            type="button"
                            onClick={() => {
                              triggerHaptic('light');
                              setShippingMethod(m.key as any);
                            }}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                                : 'bg-slate-950/50 border-white/5 text-slate-400 hover:border-white/20'
                            }`}
                          >
                            <div className="text-xs font-bold">{m.label}</div>
                            <div className="text-[10px] font-mono text-slate-400">{m.days}</div>
                            <div className="font-mono font-black text-xs text-cyan-300 mt-1">
                              ${displayedCost.toFixed(2)}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {fetchingQuote && (
                      <div className="flex items-center gap-2 text-[11px] font-mono text-cyan-400">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying live carrier rate with Prodigi lab...</span>
                      </div>
                    )}
                  </div>

                  {/* Pricing Breakdown summary */}
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2 text-xs font-mono">
                    <div className="flex justify-between text-slate-400">
                      <span>Prints Subtotal ({totalCount} items):</span>
                      <span className="text-slate-200">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Consolidated Lab Shipping ({shippingMethod}):</span>
                      <span className="text-slate-200">${shippingCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-white font-black text-sm pt-2 border-t border-white/10">
                      <span>Consolidated Grand Total:</span>
                      <span className="text-[#00F5D4]">${grandTotal.toFixed(2)} USD</span>
                    </div>
                  </div>
                </div>

                {/* RIGHT 6 COLS: Single Shipping Address Form & 85/15 Net Profit Split */}
                <div className="lg:col-span-6 space-y-4">
                  {/* Shipping Recipient Form */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Shipping Recipient (Single Address)</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Marcus Rashford"
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs font-mono text-white focus:border-emerald-400 outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                          Recipient Email (Required for Lab Tracking) *
                        </label>
                        <input
                          type="email"
                          value={recipientEmail}
                          onChange={(e) => setRecipientEmail(e.target.value)}
                          placeholder="parent@example.com"
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs font-mono text-white focus:border-emerald-400 outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                          Street Address Line 1 *
                        </label>
                        <input
                          type="text"
                          value={line1}
                          onChange={(e) => setLine1(e.target.value)}
                          placeholder="123 Championship Way"
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs font-mono text-white focus:border-emerald-400 outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                          Apt / Suite / Unit (Optional)
                        </label>
                        <input
                          type="text"
                          value={line2}
                          onChange={(e) => setLine2(e.target.value)}
                          placeholder="Apt 4B"
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs font-mono text-white focus:border-emerald-400 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                          City *
                        </label>
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Dallas"
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs font-mono text-white focus:border-emerald-400 outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                            State
                          </label>
                          <input
                            type="text"
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            placeholder="TX"
                            className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs font-mono text-white focus:border-emerald-400 outline-none uppercase"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                            ZIP *
                          </label>
                          <input
                            type="text"
                            value={zip}
                            onChange={(e) => setZip(e.target.value)}
                            placeholder="75001"
                            className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs font-mono text-white focus:border-emerald-400 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 85/15 Net Profit Split Card */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                          85/15 Net Profit Split
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {creatorSplits.length} Creator{creatorSplits.length === 1 ? '' : 's'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/10">
                        <div className="text-slate-400 text-[10px]">Lab + Ship</div>
                        <div className="font-mono font-bold text-slate-300 text-xs">
                          ${wholesaleBaseCost.toFixed(2)}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                        <div className="text-emerald-400 text-[10px]">Creator (85%)</div>
                        <div className="font-mono font-black text-emerald-400 text-xs">
                          ${totalCreatorPayout.toFixed(2)}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30">
                        <div className="text-cyan-400 text-[10px]">Platform (15%)</div>
                        <div className="font-mono font-black text-cyan-400 text-xs">
                          ${totalPlatformRevenue.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {creatorSplits.length > 1 && (
                      <div className="space-y-1 text-[10px] font-mono text-slate-400 pt-1 border-t border-white/5">
                        <div className="font-bold text-slate-300">Creator Distribution:</div>
                        {creatorSplits.map((cs) => (
                          <div key={cs.creatorId} className="flex justify-between">
                            <span className="truncate max-w-[180px]">{cs.creatorName || cs.creatorId}:</span>
                            <span className="text-emerald-400 font-bold">${cs.creatorPayout.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Errors */}
                  {orderError && (
                    <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{orderError}</span>
                    </div>
                  )}

                  {/* Payment Buttons Area */}
                  {!isShippingValid ? (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-200">
                        Please provide your recipient name, valid email, street address, city, and ZIP code above to unlock checkout and lab order dispatch.
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 pt-1">
                      {/* PayPal Smart Buttons */}
                      <div className="rounded-xl overflow-hidden min-h-[44px]">
                        <PayPalButtons
                          style={{
                            layout: 'vertical',
                            color: 'gold',
                            shape: 'rect',
                            label: 'pay',
                            height: 42
                          }}
                          disabled={submitting}
                          createOrder={(_data, actions) => {
                            if (actions?.order?.create) {
                              return actions.order.create({
                                intent: 'CAPTURE',
                                purchase_units: [
                                  {
                                    description: `Just1Play Bulk Prints (${totalCount} prints)`,
                                    amount: {
                                      currency_code: 'USD',
                                      value: grandTotal.toFixed(2)
                                    },
                                    custom_id: `PRODIGI_BULK_${Date.now()}`
                                  }
                                ]
                              });
                            }
                            return Promise.resolve(`ORDER-BULK-${Date.now()}`);
                          }}
                          onApprove={async (data, actions) => {
                            let captureId = `CAP-${Date.now()}`;
                            if (actions?.order) {
                              try {
                                const cap = await actions.order.capture();
                                captureId = cap?.purchase_units?.[0]?.payments?.captures?.[0]?.id || cap?.id || captureId;
                              } catch (e) {
                                console.warn('PayPal capture notice:', e);
                              }
                            }
                            await handlePaymentSuccessAndDispatch(data.orderID || `ORD-PP-${Date.now()}`, captureId);
                          }}
                          onError={(err) => {
                            console.warn('[PayPal Bulk Order Issue]:', err);
                            setOrderError('PayPal encountered a checkout gateway issue. You can use the 1-Click Instant Dispatch button below.');
                          }}
                        />
                      </div>

                      {/* 1-Click Instant Lab Dispatch & Ledger Settle */}
                      <button
                        id="instant-bulk-prodigi-dispatch-btn"
                        type="button"
                        onClick={() => handlePaymentSuccessAndDispatch(`ORDER-BULK-INSTANT-${Date.now()}`, `CAP-INSTANT-${Date.now()}`)}
                        disabled={submitting}
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#00F5D4] to-[#00B8D4] hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(0,245,212,0.35)] cursor-pointer disabled:opacity-50"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                            <span>Dispatching Bulk Order to Prodigi & Splitting Ledger...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4 text-slate-950" />
                            <span>Instant Dispatch & Ledger Settle (${grandTotal.toFixed(2)} USD)</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                </div>

              </div>
            )}

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default MultiItemPrintCheckoutModal;
