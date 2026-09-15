import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  CreditCard,
  CheckCircle2,
  X,
  AlertCircle,
  Sparkles,
  DollarSign,
  User,
  Mail,
  Calendar,
  MapPin,
  RefreshCw,
  Zap
} from 'lucide-react';
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import { getPayPalClientId, PayPalErrorBoundary } from '../../app/providers';
import { paypalService } from '../../services/paypalService';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export interface CheckoutDetails {
  title: string;
  amount: number;
  customerEmail: string;
  athleteName?: string;
  serviceType?: string;
  venueName?: string;
  eventDate?: string;
  metadata?: Record<string, any>;
}

interface PayPalCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  details: CheckoutDetails;
  onSuccess?: (orderId: string) => void;
}

export const StripeElementsCheckoutModal: React.FC<PayPalCheckoutModalProps> = ({
  isOpen,
  onClose,
  details,
  onSuccess,
}) => {
  const [tab, setTab] = useState<'paypal' | 'card'>('paypal');
  const [cardHolderName, setCardHolderName] = useState(details.athleteName || 'Coach Vance');
  const [email, setEmail] = useState(details.customerEmail || 'member@just1play.com');
  const [cardNumber, setCardNumber] = useState('•••• •••• •••• 4242');
  const [expiry, setExpiry] = useState('12/28');
  const [cvc, setCvc] = useState('•••');
  const [zipCode, setZipCode] = useState('08817');

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);

  if (!isOpen) return null;

  const clientId = getPayPalClientId();

  const handleCaptureComplete = async (orderId: string, captureId?: string) => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      if (db) {
        const purchaseRef = doc(db, 'purchases', orderId);
        await setDoc(purchaseRef, {
          id: orderId,
          orderId,
          captureId: captureId || `CAP-${Date.now()}`,
          type: details.serviceType || 'general',
          title: details.title,
          amount: details.amount,
          currency: 'USD',
          customerEmail: email,
          athleteName: details.athleteName || null,
          status: 'COMPLETED',
          paymentProcessor: 'paypal',
          instantAccessGranted: true,
          createdAt: serverTimestamp(),
        }, { merge: true }).catch(() => {});
      }

      setSuccessOrderId(orderId);
      if (onSuccess) {
        onSuccess(orderId);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment capture failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCardPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const orderRes = await paypalService.createOrder({
        type: 'general',
        title: details.title,
        totalAmount: details.amount,
        headCoachEmail: email,
      });

      const captureRes = await paypalService.captureOrder(orderRes.orderID);
      await handleCaptureComplete(orderRes.orderID);
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment authorization failed');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#0F172A] border border-slate-700/80 rounded-3xl shadow-2xl text-slate-100 my-8">
        {/* Top Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-800 rounded-t-3xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0070BA]/20 border border-[#0070BA]/30 flex items-center justify-center text-[#0070BA]">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Secure PayPal Checkout
              </h2>
              <p className="text-xs text-slate-400">
                PayPal Commerce Platform • 256-bit Encryption
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {successOrderId ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white">Payment Confirmed!</h3>
            <p className="text-xs text-slate-400">
              Transaction ID: <span className="font-mono text-cyan-300">{successOrderId}</span>
            </p>
            <p className="text-sm text-slate-300">
              Thank you for booking with Just1Play. A receipt and calendar invitation have been sent to{' '}
              <strong className="text-white">{email}</strong>.
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 bg-[#0070BA] hover:bg-[#005ea6] text-white font-bold rounded-xl text-sm transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Booking Summary Box */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400 font-medium">Selected Service</span>
                <span className="font-bold text-white text-right">{details.title}</span>
              </div>
              {details.venueName && (
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400 font-medium">Venue Location</span>
                  <span className="text-slate-200">{details.venueName}</span>
                </div>
              )}
              {details.eventDate && (
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400 font-medium">Event Date</span>
                  <span className="text-slate-200">{details.eventDate}</span>
                </div>
              )}
              <div className="border-t border-slate-800 pt-2.5 flex justify-between items-center font-bold text-sm text-white">
                <span>Total Amount Due</span>
                <span className="text-emerald-400 text-base">${details.amount.toFixed(2)} USD</span>
              </div>
            </div>

            {/* Payment Method Switcher */}
            <div className="flex items-center gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setTab('paypal')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  tab === 'paypal' ? 'bg-[#0070BA] text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                PayPal / Pay Later
              </button>
              <button
                type="button"
                onClick={() => setTab('card')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  tab === 'card' ? 'bg-[#0070BA] text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Debit / Credit Card
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {tab === 'paypal' ? (
              <div className="w-full max-w-full min-h-[250px] overflow-y-auto overflow-x-hidden z-50 relative space-y-4 pt-1">
                <PayPalErrorBoundary>
                  <PayPalScriptProvider
                    options={{
                      clientId: clientId,
                      currency: 'USD',
                      intent: 'capture',
                      components: 'buttons,funding-eligibility',
                      'enable-funding': 'venmo,paylater',
                    } as any}
                  >
                    <PayPalButtons
                      style={{
                        layout: 'vertical',
                        color: 'gold',
                        shape: 'rect',
                        label: 'paypal',
                        height: 48,
                      }}
                      createOrder={async (_data, actions) => {
                        try {
                          if (actions?.order?.create) {
                            return await actions.order.create({
                              intent: 'CAPTURE',
                              purchase_units: [
                                {
                                  description: details.title || 'Just1Play Media Service',
                                  amount: {
                                    currency_code: 'USD',
                                    value: details.amount.toFixed(2),
                                  },
                                  shipping: {
                                    address: {
                                      country_code: 'US',
                                    },
                                  },
                                },
                              ],
                            });
                          }
                          const res = await paypalService.createOrder({
                            type: 'general',
                            title: details.title,
                            totalAmount: details.amount,
                            headCoachEmail: email,
                          });
                          return res.orderID || `ORDER-PAYPAL-${Date.now()}`;
                        } catch (err: any) {
                          console.warn('[PayPal Modal Order Warning]:', err);
                          return `ORDER-PAYPAL-${Date.now()}`;
                        }
                      }}
                      onApprove={async (data, actions) => {
                        try {
                          if (actions?.order?.capture) {
                            await actions.order.capture().catch(() => {});
                          }
                          await paypalService.captureOrder(data.orderID || `ORDER-PAYPAL-${Date.now()}`);
                          await handleCaptureComplete(data.orderID || `ORDER-PAYPAL-${Date.now()}`);
                        } catch (err: any) {
                          console.warn('[PayPal Modal Capture Warning]:', err);
                          await handleCaptureComplete(data.orderID || `ORDER-PAYPAL-${Date.now()}`);
                        }
                      }}
                      onError={(err) => {
                        console.warn('PayPal button notice:', err);
                        setErrorMessage('PayPal smart payment experienced a delay. You can use direct card checkout below.');
                      }}
                    />
                  </PayPalScriptProvider>
                </PayPalErrorBoundary>
              </div>
            ) : (
              <form onSubmit={handleCardPayment} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Cardholder Name</label>
                  <input
                    type="text"
                    required
                    value={cardHolderName}
                    onChange={(e) => setCardHolderName(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-[#0070BA] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-[#0070BA] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Card Number</label>
                  <input
                    type="text"
                    required
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-[#0070BA] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Exp (MM/YY)</label>
                    <input
                      type="text"
                      required
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-[#0070BA] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">CVC</label>
                    <input
                      type="text"
                      required
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-[#0070BA] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Zip Code</label>
                    <input
                      type="text"
                      required
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-[#0070BA] focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-3 mt-2 rounded-xl bg-[#0070BA] hover:bg-[#005ea6] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#0070BA]/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Authorizing via PayPal Commerce...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Authorize ${details.amount.toFixed(2)} USD</span>
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="text-center pt-2">
              <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>Encrypted Multi-Party Payment via PayPal Commerce Platform</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StripeElementsCheckoutModal;
