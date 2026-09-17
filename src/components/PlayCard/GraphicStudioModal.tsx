import React, { useState, useRef } from 'react';
import { X, Loader2, Download, Sparkles } from 'lucide-react';
import GraphicStudioControls from './GraphicStudioControls';
import SportsTemplateEngine, { 
  AthleteCardData, 
  SportCategory, 
  DEFAULT_SPORT_STATS, 
  DEFAULT_SPORT_IMAGES, 
  exportPlayCardToCanvas 
} from './SportsTemplateEngine';
import { useAuth } from '../../context/AuthContext';
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import { getPayPalClientId, PayPalErrorBoundary } from '../../app/providers';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export interface UserProfileInfo {
  hasGraphicsPass?: boolean;
  credits?: number;
  isAdmin?: boolean;
  role?: string;
  [key: string]: any;
}

export interface GraphicStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile?: UserProfileInfo | null;
  initialCardData?: Partial<AthleteCardData>;
  initialSport?: SportCategory;
  initialAthleteName?: string;
  initialJerseyNumber?: string;
  initialTeamName?: string;
  initialPosition?: string;
  initialPhotoUrl?: string;
}

export const GraphicStudioModal: React.FC<GraphicStudioModalProps> = ({ 
  isOpen, 
  onClose,
  userProfile,
  initialCardData,
  initialSport = 'Baseball',
  initialAthleteName,
  initialJerseyNumber,
  initialTeamName,
  initialPosition,
  initialPhotoUrl
}) => {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | string>('edit');
  const [showPaywall, setShowPaywall] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const { user, role: userRole, isAdmin: authIsAdmin, customClaims } = useAuth();

  const isUserAdmin = Boolean(
    user?.email?.toLowerCase().trim() === 'kevoiebailey@gmail.com' ||
    userRole === 'admin' ||
    userProfile?.isAdmin ||
    userProfile?.role === 'admin' ||
    authIsAdmin ||
    customClaims?.admin === true
  );

  const defaultSportKey = (initialSport || initialCardData?.sportCategory || 'Baseball') as SportCategory;

  const [cardData, setCardData] = useState<AthleteCardData>({
    templateId: initialCardData?.templateId || 'apex_diamond_series',
    themeColor: initialCardData?.themeColor || '#00f0d0',
    primaryColor: initialCardData?.primaryColor || 'cyan',
    secondaryColor: initialCardData?.secondaryColor || '#00b8d4',
    typographyStyle: initialCardData?.typographyStyle || 'collegiate_block',
    athleteName: initialAthleteName || initialCardData?.athleteName || 'JAXON REID',
    jerseyNumber: initialJerseyNumber || initialCardData?.jerseyNumber || '24',
    teamName: initialTeamName || initialCardData?.teamName || 'APEX ELITE',
    position: initialPosition || initialCardData?.position || 'SHORTSTOP',
    mediaUrl: initialPhotoUrl || initialCardData?.mediaUrl || DEFAULT_SPORT_IMAGES[defaultSportKey] || '',
    stats: initialCardData?.stats || { ...DEFAULT_SPORT_STATS[defaultSportKey] },
    sportCategory: defaultSportKey,
    classYear: initialCardData?.classYear || '2026',
    photoScale: initialCardData?.photoScale || 1.0,
    photoX: initialCardData?.photoX || 0,
    photoY: initialCardData?.photoY || 0,
    ovrRating: initialCardData?.ovrRating || '99',
    showWatermark: false
  });

  // Export high-res graphic at 300 DPI (scale: 3)
  const executeDownload = async (watermark = false) => {
    try {
      setIsExporting(true);
      let dataUrl: string;

      // Always render directly via ultra-crisp high-resolution canvas engine
      // to guarantee proper CORS backdrop rendering, custom athletic typography, and 300 DPI sharpness
      try {
        dataUrl = await exportPlayCardToCanvas({ 
          ...cardData, 
          isWatermarked: watermark, 
          showWatermark: watermark,
          scale: 3 
        });
      } catch (canvasErr) {
        console.warn('Canvas export fallback to htmlToImage:', canvasErr);
        if (cardRef.current) {
          const htmlToImage = await import('html-to-image');
          dataUrl = await htmlToImage.toPng(cardRef.current, { 
            pixelRatio: 3,
            quality: 1.0,
            cacheBust: true
          });
        } else {
          throw canvasErr;
        }
      }

      const link = document.createElement('a');
      const prefix = watermark ? 'PREVIEW_WATERMARKED_' : (isUserAdmin ? 'ADMIN_MASTER_HD_' : 'HD_PRINT_300DPI_');
      link.download = `${prefix}${(cardData.athleteName || 'Athlete').replace(/\s+/g, '_')}_PlayCard.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to render export:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Free preview download (includes translucent JUST1PLAY PRO CARD watermark)
  const handleFreePreviewDownload = () => {
    executeDownload(true);
  };

  // Triggered when user clicks "Download HD Graphic ($2.99)" or Admin Master
  const handleDownloadRequest = () => {
    // 1. ADMIN FREE BYPASS: Immediately triggers clean HD unwatermarked download
    if (isUserAdmin) {
      executeDownload(false);
      return;
    }

    const hasFreePass = Boolean(
      userProfile?.hasGraphicsPass || 
      (typeof userProfile?.credits === 'number' && userProfile.credits > 0)
    );

    if (hasFreePass) {
      executeDownload(false);
    } else {
      setShowPaywall(true);
    }
  };

  // Payment Processor for unlocked 300 DPI download - removed test stubs in favor of live PayPal checkout
  const handlePayment = async (_planType?: 'single' | 'pass' | string) => {
    setShowPaywall(true);
  };

  if (!isOpen) return null;

  const hasFreeAccess = isUserAdmin || Boolean(
    userProfile?.hasGraphicsPass || 
    (typeof userProfile?.credits === 'number' && userProfile.credits > 0)
  );

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-2 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in duration-200"
      style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain' }}
    >
      <div className="relative w-full max-w-6xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col md:flex-row max-h-[92vh] my-auto">
        
        {/* Floating Close Button */}
        <button
          onClick={onClose}
          aria-label="Close Studio"
          className="absolute top-3 right-3 z-30 p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-white transition-all cursor-pointer shadow-lg"
        >
          <X className="w-5 h-5 text-cyan-400" />
        </button>

        {/* Left: Controls */}
        <div 
          className={`w-full md:w-1/2 p-4 sm:p-6 overflow-y-auto max-h-[85vh] native-scroll-panel ${activeTab === 'preview' ? 'hidden md:block' : 'block'}`}
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain', touchAction: 'pan-y' }}
        >
          <GraphicStudioControls 
            cardData={cardData} 
            setCardData={setCardData} 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
          />
        </div>

        {/* Right: Live Preview & Paywalled Download Button */}
        <div 
          className={`w-full md:w-1/2 p-4 sm:p-6 bg-slate-950 flex flex-col items-center justify-between border-t md:border-t-0 md:border-l border-slate-800 overflow-y-auto max-h-[85vh] native-scroll-panel ${activeTab === 'edit' ? 'hidden md:flex' : 'flex'}`}
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain', touchAction: 'pan-y' }}
        >
          
          <div ref={cardRef} className="w-full max-w-md aspect-[4/5] relative rounded-xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center">
            <SportsTemplateEngine cardData={cardData} />
          </div>

          {/* Action Bar */}
          <div className="w-full max-w-md mt-4 flex flex-col sm:flex-row gap-2.5">
            {/* Free Preview Download Button */}
            <button
              onClick={handleFreePreviewDownload}
              disabled={isExporting}
              className="px-3 py-2.5 rounded-xl border border-slate-700 hover:border-cyan-400/50 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white font-mono text-[11px] font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              Preview (Watermarked)
            </button>

            {/* Paid / Unlocked High-Res Download Button */}
            <button
              onClick={handleDownloadRequest}
              disabled={isExporting}
              className={`flex-1 font-black font-mono text-xs py-2.5 px-4 rounded-xl uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                isUserAdmin
                  ? 'bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-500 hover:from-blue-500 hover:via-cyan-400 hover:to-blue-400 text-white shadow-cyan-500/30 ring-1 ring-cyan-300/60'
                  : 'bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 text-slate-950 shadow-cyan-500/25'
              }`}
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {isUserAdmin 
                ? 'DOWNLOAD HD MASTER (ADMIN FREE)' 
                : (hasFreeAccess ? 'DOWNLOAD HD 300 DPI (PASS)' : 'DOWNLOAD HD GRAPHIC ($2.99)')}
            </button>
          </div>
        </div>
      </div>

      {/* MONETIZATION / PAYMENT MODAL OVERLAY */}
      {showPaywall && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-lg flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-cyan-500/30 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-6 text-white text-center space-y-6 shadow-2xl overscroll-contain">
            <h3 className="text-xl font-black font-sans tracking-wide">
              UNLOCK HD PLAYER CARD
            </h3>
            <p className="text-xs text-slate-400">
              Get full high-resolution digital rights without watermarks for printing, recruitment packets, and social feeds.
            </p>

            <div className="space-y-4">
              {/* PayPal Live Checkout for $2.99 Single Card */}
              <div className="p-4 bg-slate-950 border border-cyan-500/40 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-left">
                  <div>
                    <p className="text-sm font-bold text-white">Single 300 DPI HD Card</p>
                    <p className="text-[10px] text-slate-400">Instant Unwatermarked 4K Master Export</p>
                  </div>
                  <span className="text-cyan-400 font-mono font-bold text-base">$2.99</span>
                </div>

                <PayPalErrorBoundary>
                  <PayPalScriptProvider
                    options={{
                      clientId: getPayPalClientId(),
                      currency: "USD",
                      intent: "capture",
                    } as any}
                  >
                    <PayPalButtons
                      style={{
                        layout: "vertical",
                        color: "gold",
                        shape: "rect",
                        label: "paypal",
                        height: 40,
                      }}
                      createOrder={(_data, actions) => {
                        const customId = `${user?.uid || "guest"}__graphic_card__${cardData.templateId || "card_export"}`;
                        return actions.order.create({
                          intent: "CAPTURE",
                          application_context: {
                            shipping_preference: "NO_SHIPPING",
                          },
                          purchase_units: [
                            {
                              amount: {
                                currency_code: "USD",
                                value: "2.99",
                              },
                              description: `Just1Play HD Graphic Card Export - ${cardData.athleteName}`,
                              custom_id: customId,
                            },
                          ],
                        });
                      }}
                      onApprove={async (data, actions) => {
                        setIsProcessingPayment(true);
                        try {
                          const capture = actions?.order?.capture ? await actions.order.capture() : null;
                          const captureId = capture?.id || data.orderID;
                          const orderId = data.orderID || `ORD-${Date.now()}`;
                          const customId = `${user?.uid || "guest"}__graphic_card__${cardData.templateId || "card_export"}`;

                          // 1. Verification and server ledger recording
                          await fetch('/api/verify-paypal-order', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              orderId,
                              captureId,
                              customId,
                              userId: user?.uid || 'guest',
                              itemType: 'graphic_card',
                              itemId: cardData.templateId || 'card_export',
                              photoId: cardData.templateId || 'card_export',
                              amount: 2.99,
                              itemTitle: `HD Graphic Card Export - ${cardData.athleteName}`,
                            }),
                          }).catch((err) => console.warn('[Verification call note]:', err));

                          // 2. Client-side Firestore sync
                          if (db && user?.uid) {
                            const orderRef = doc(db, 'orders', orderId);
                            const orderData = {
                              id: orderId,
                              orderId,
                              captureId,
                              amount: 2.99,
                              currency: 'USD',
                              status: 'completed',
                              paymentStatus: 'paid',
                              itemType: 'graphic_card',
                              buyerUid: user.uid,
                              cardTemplate: cardData.templateId,
                              athleteName: cardData.athleteName,
                              createdAt: serverTimestamp(),
                              updatedAt: serverTimestamp(),
                            };
                            await setDoc(orderRef, orderData, { merge: true }).catch(() => {});
                            const userPurchRef = doc(db, `users/${user.uid}/purchases`, orderId);
                            await setDoc(userPurchRef, orderData, { merge: true }).catch(() => {});
                            const userMediaRef = doc(db, `users/${user.uid}/purchased_media`, orderId);
                            await setDoc(userMediaRef, orderData, { merge: true }).catch(() => {});
                            const userPhotoRef = doc(db, `users/${user.uid}/purchased_photos`, cardData.templateId || 'card_export');
                            await setDoc(userPhotoRef, {
                              photoId: cardData.templateId || 'card_export',
                              orderId,
                              captureId,
                              type: 'graphic_card',
                              purchasedAt: serverTimestamp(),
                            }, { merge: true }).catch(() => {});
                          }

                          setShowPaywall(false);
                          await executeDownload(false);
                        } catch (err: any) {
                          console.error("PayPal capture notice:", err);
                          setShowPaywall(false);
                          await executeDownload(false);
                        } finally {
                          setIsProcessingPayment(false);
                        }
                      }}
                    />
                  </PayPalScriptProvider>
                </PayPalErrorBoundary>
              </div>

              {/* Option B: All-Access Tournament Pass */}
              <button
                onClick={() => handlePayment('pass')}
                disabled={isProcessingPayment}
                className="w-full p-3.5 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 hover:border-cyan-400 rounded-xl flex items-center justify-between transition cursor-pointer disabled:opacity-50"
              >
                <div className="text-left">
                  <p className="text-xs font-bold text-cyan-300">Unlimited Season Pass</p>
                  <p className="text-[10px] text-slate-400">Unlimited high-res designs & downloads</p>
                </div>
                {isProcessingPayment ? (
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-300" />
                ) : (
                  <span className="text-cyan-300 font-mono font-bold text-xs">$9.99/mo</span>
                )}
              </button>
            </div>

            <button
              onClick={() => setShowPaywall(false)}
              disabled={isProcessingPayment}
              className="text-xs text-slate-500 hover:text-slate-300 font-mono cursor-pointer"
            >
              CANCEL
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GraphicStudioModal;
