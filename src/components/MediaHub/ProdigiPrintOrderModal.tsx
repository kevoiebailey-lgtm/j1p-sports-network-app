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
  Sparkles,
  Layers,
  DollarSign,
  Zap,
  Info,
  Image as ImageIcon,
  ShoppingCart,
  ArrowRight,
  ShoppingBag
} from 'lucide-react';
import { usePrintCart } from '../../context/PrintCartContext';
import { PayPalButtons } from '@paypal/react-paypal-js';
import { 
  prodigiService, 
  ProdigiCatalogItem, 
  ProdigiShippingQuote,
  ProdigiOrderPayload 
} from '../../services/prodigiService';
import { db } from '../../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { 
  isGoogleDriveUrlOrId, 
  resolveGoogleDriveImageUrl, 
  resolveCleanUrl,
  resolveDirectGoogleDriveDownloadUrl,
  extractGoogleDriveFileId
} from '../../utils/storageUrlResolver';

export interface ProdigiPrintOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  photo?: {
    id?: string;
    previewUrl?: string;
    url?: string;
    highResUrl?: string;
    title?: string;
    driveFileId?: string;
    [key: string]: any;
  };
  imageUrl?: string;
  previewUrl?: string;
  highResUrl?: string;
  photoUrl?: string;
  itemTitle?: string;
  itemSubtitle?: string;
  defaultSku?: string;
  defaultCategory?: string;
  metadata?: Record<string, any>;
  creatorId?: string;
  creatorPayPalEmail?: string;
  creatorName?: string;
}

// Default initial catalog including Wallets, Sports Package Bundles, and Standalone Single Prints
const DEFAULT_INITIAL_CATALOG: ProdigiCatalogItem[] = [
  // --- POPULAR BUNDLES ---
  {
    sku: 'PACKAGE-MVP-STARTER',
    title: 'The MVP Starter Pack',
    category: 'bundle',
    description: 'Includes: 1x 8x10 Lustre, 2x 5x7 Prints, 8x Wallets',
    basePrice: 45.00,
    sizing: 'fillPrintArea',
    dimensions: '1x 8x10" • 2x 5x7" • 8x Wallets',
    mockupUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80',
    popular: true,
    isBundle: true,
    bundleItems: [
      { sku: 'GLOBAL-PAP-8x10', copies: 1, sizing: 'fillPrintArea', title: '1x 8x10" Lustre Print' },
      { sku: 'GLOBAL-PAP-5x7', copies: 2, sizing: 'fillPrintArea', title: '2x 5x7" Prints' },
      { sku: 'GLOBAL-PAP-4x6', copies: 2, sizing: 'fillPrintArea', title: '8x Wallets (2 sheets of GLOBAL-PAP-4x6)' }
    ]
  },
  {
    sku: 'PACKAGE-ALLSTAR-WALL',
    title: 'The All-Star Wall Pack',
    category: 'bundle',
    description: 'Includes: 1x 16x20 Poster, 2x 8x10 Prints, 4x 5x7 Prints, 8x Wallets',
    basePrice: 85.00,
    sizing: 'fillPrintArea',
    dimensions: '1x 16x20" • 2x 8x10" • 4x 5x7" • 8x Wallets',
    mockupUrl: 'https://images.unsplash.com/photo-1519766304817-4f37bda74a29?auto=format&fit=crop&w=600&q=80',
    popular: true,
    isBundle: true,
    bundleItems: [
      { sku: 'GLOBAL-PAP-16x20', copies: 1, sizing: 'fillPrintArea', title: '1x 16x20" Poster' },
      { sku: 'GLOBAL-PAP-8x10', copies: 2, sizing: 'fillPrintArea', title: '2x 8x10" Prints' },
      { sku: 'GLOBAL-PAP-5x7', copies: 4, sizing: 'fillPrintArea', title: '4x 5x7" Prints' },
      { sku: 'GLOBAL-PAP-4x6', copies: 2, sizing: 'fillPrintArea', title: '8x Wallets (2 sheets of GLOBAL-PAP-4x6)' }
    ]
  },
  {
    sku: 'PACKAGE-FAMILY-GRANDPARENT',
    title: 'The Family & Grandparent Pack',
    category: 'bundle',
    description: 'Includes: 2x 8x10 Prints, 4x 5x7 Prints, 16x Wallets',
    basePrice: 55.00,
    sizing: 'fillPrintArea',
    dimensions: '2x 8x10" • 4x 5x7" • 16x Wallets',
    mockupUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=600&q=80',
    popular: true,
    isBundle: true,
    bundleItems: [
      { sku: 'GLOBAL-PAP-8x10', copies: 2, sizing: 'fillPrintArea', title: '2x 8x10" Prints' },
      { sku: 'GLOBAL-PAP-5x7', copies: 4, sizing: 'fillPrintArea', title: '4x 5x7" Prints' },
      { sku: 'GLOBAL-PAP-4x6', copies: 4, sizing: 'fillPrintArea', title: '16x Wallets (4 sheets of GLOBAL-PAP-4x6)' }
    ]
  },
  {
    sku: 'PACKAGE-WALLETS-8',
    title: 'Wallets (Set of 8)',
    category: 'card',
    description: '8 die-cut 2.5x3.5" player cards, 2 sheets of GLOBAL-PAP-4x6',
    basePrice: 18.00,
    sizing: 'fillPrintArea',
    dimensions: '8 die-cut cards (2.5 x 3.5")',
    mockupUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=600&q=80',
    popular: true,
    isBundle: true,
    bundleItems: [
      { sku: 'GLOBAL-PAP-4x6', copies: 2, sizing: 'fillPrintArea', title: '8x Wallets (2 sheets of GLOBAL-PAP-4x6)' }
    ]
  },

  // --- SINGLE PRINTS ---
  {
    sku: 'GLOBAL-PAP-5x7',
    title: '5x7 Desk Print',
    category: 'photo',
    description: 'Archival lustre finish, standard desk frame fit',
    basePrice: 14.99,
    sizing: 'fillPrintArea',
    dimensions: '5 x 7 inches (13 x 18 cm)',
    mockupUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80'
  },
  {
    sku: 'GLOBAL-PAP-8x10',
    title: '8x10 Action Print',
    category: 'photo',
    description: 'Classic tournament portrait and action framing size',
    basePrice: 24.99,
    sizing: 'fillPrintArea',
    dimensions: '8 x 10 inches (20 x 25 cm)',
    mockupUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80',
    popular: true
  },
  {
    sku: 'GLOBAL-PAP-16x20',
    title: '16x20 Action Poster',
    category: 'poster',
    description: 'High-impact wall art poster',
    basePrice: 54.99,
    sizing: 'fillPrintArea',
    dimensions: '16 x 20 inches (40 x 50 cm)',
    mockupUrl: 'https://images.unsplash.com/photo-1519766304817-4f37bda74a29?auto=format&fit=crop&w=600&q=80',
    popular: true
  },
  {
    sku: 'GLOBAL-PAP-4x6',
    title: '4x6" Action Photo Print',
    category: 'photo',
    description: 'High-definition lab photo print on archival paper. Perfect for scrapbooks, albums, and player lockers.',
    basePrice: 4.99,
    sizing: 'fillPrintArea',
    dimensions: '4 x 6 inches (10 x 15 cm)',
    mockupUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=600&q=80'
  },
  {
    sku: 'GLOBAL-CAN-12X16',
    title: '12x16" Stretched Canvas Wall Art',
    category: 'canvas',
    description: 'Gallery-wrapped museum quality canvas with solid wood frame. Turn iconic game moments into fine art.',
    basePrice: 49.99,
    sizing: 'fillPrintArea',
    attributes: { wrap: 'black' },
    dimensions: '12 x 16 inches (30 x 40 cm)',
    mockupUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=600&q=80'
  },
  {
    sku: 'GLOBAL-ACR-4X6',
    title: '4x6" Clear Acrylic Action Trophy Block',
    category: 'acrylic',
    description: 'Free-standing 20mm thick diamond-polished optical acrylic block with 3D depth. The ultimate desktop award.',
    basePrice: 34.99,
    sizing: 'fillPrintArea',
    dimensions: '4 x 6 inches (10 x 15 cm) • 20mm thick',
    mockupUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=600&q=80'
  }
];

export const ProdigiPrintOrderModal: React.FC<ProdigiPrintOrderModalProps> = ({
  isOpen,
  onClose,
  photo: inputPhoto,
  imageUrl,
  previewUrl,
  highResUrl,
  photoUrl,
  itemTitle = 'Action Photo Print',
  itemSubtitle = 'Official High-Definition Print',
  defaultSku = 'PACKAGE-MVP-STARTER',
  defaultCategory,
  metadata = {},
  creatorId,
  creatorPayPalEmail,
  creatorName
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  // Normalize photo object prioritizing explicit photo prop or individual props
  const rawDriveId =
    (inputPhoto as any)?.driveFileId ||
    (metadata as any)?.driveFileId ||
    extractGoogleDriveFileId((inputPhoto as any)?.highResUrl) ||
    extractGoogleDriveFileId((inputPhoto as any)?.url) ||
    extractGoogleDriveFileId((inputPhoto as any)?.previewUrl) ||
    extractGoogleDriveFileId(highResUrl) ||
    extractGoogleDriveFileId(imageUrl) ||
    extractGoogleDriveFileId(previewUrl) ||
    extractGoogleDriveFileId(photoUrl) ||
    undefined;

  const photo = {
    id: inputPhoto?.id || (metadata as any)?.photoId,
    previewUrl: inputPhoto?.previewUrl || previewUrl || imageUrl || photoUrl || (metadata as any)?.previewUrl || (metadata as any)?.imageUrl,
    url: inputPhoto?.url || imageUrl || previewUrl || photoUrl || (metadata as any)?.url,
    highResUrl: inputPhoto?.highResUrl || highResUrl || imageUrl || previewUrl || photoUrl || (metadata as any)?.highResUrl,
    title: inputPhoto?.title || itemTitle || (metadata as any)?.photoTitle || (metadata as any)?.title,
    driveFileId: rawDriveId
  };

  const [catalog, setCatalog] = useState<ProdigiCatalogItem[]>(DEFAULT_INITIAL_CATALOG);
  const [selectedSku, setSelectedSku] = useState<string>(defaultSku);
  const [copies, setCopies] = useState<number>(1);
  const [loadingCatalog, setLoadingCatalog] = useState<boolean>(false);

  // Tabs state: Popular Bundles vs Single Prints
  const [catalogTab, setCatalogTab] = useState<'bundles' | 'singles'>(() => {
    if (defaultSku && !defaultSku.startsWith('PACKAGE-')) {
      return 'singles';
    }
    return 'bundles';
  });

  const bundleItems = catalog.filter(i => i.isBundle || i.sku.startsWith('PACKAGE-'));
  const singleItems = catalog.filter(i => !i.isBundle && !i.sku.startsWith('PACKAGE-'));
  const displayedCatalog = catalogTab === 'bundles' ? bundleItems : singleItems;

  const handleTabChange = (tab: 'bundles' | 'singles') => {
    setCatalogTab(tab);
    if (tab === 'bundles') {
      const isAlreadyInTab = bundleItems.some(i => i.sku === selectedSku);
      if (!isAlreadyInTab && bundleItems.length > 0) {
        const preferred = bundleItems.find(i => i.sku === 'PACKAGE-MVP-STARTER') || bundleItems[0];
        setSelectedSku(preferred.sku);
      }
    } else {
      const isAlreadyInTab = singleItems.some(i => i.sku === selectedSku);
      if (!isAlreadyInTab && singleItems.length > 0) {
        const preferred = singleItems.find(i => i.sku === 'GLOBAL-PAP-8x10') || singleItems[0];
        setSelectedSku(preferred.sku);
      }
    }
  };

  // Address State
  const [name, setName] = useState<string>(user?.displayName || '');
  const [recipientEmail, setRecipientEmail] = useState<string>(user?.email || '');
  const [line1, setLine1] = useState<string>('');
  const [line2, setLine2] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [zip, setZip] = useState<string>('');
  const [country, setCountry] = useState<string>('US');

  // Quotes state
  const [quotes, setQuotes] = useState<ProdigiShippingQuote[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>('Budget');
  const [loadingQuote, setLoadingQuote] = useState<boolean>(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Order submission state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [orderResult, setOrderResult] = useState<any | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Image loading / error state to prevent flicker and show graceful fallback
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);

  // 1. Resolve preview thumbnail using Google Drive CDN format rather than export=download to prevent browser flicker/redirect loops
  const previewSrc = photo.driveFileId
    ? `https://lh3.googleusercontent.com/u/0/d/${photo.driveFileId}`
    : (photo.previewUrl || photo.url);

  // Reset image loaded & error state whenever previewSrc updates
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [previewSrc]);

  // 2. Retain raw stream strictly for Prodigi lab dispatch payload in assets[0].url
  const rawOrderAssetUrl =
    photo.highResUrl ||
    photo.url ||
    photo.previewUrl ||
    highResUrl ||
    imageUrl ||
    previewUrl ||
    photoUrl ||
    '';

  const orderAssetUrl = photo.driveFileId
    ? `https://drive.google.com/uc?export=download&id=${photo.driveFileId}`
    : resolveDirectGoogleDriveDownloadUrl(rawOrderAssetUrl);

  // Load backend catalog on modal open
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    async function loadCatalog() {
      setLoadingCatalog(true);
      try {
        const items = await prodigiService.getCatalog();
        if (isMounted && items && items.length > 0) {
          setCatalog(items);
          if (!items.find(i => i.sku === selectedSku)) {
            setSelectedSku(items[0].sku);
          }
        }
      } catch (err) {
        console.warn('Failed to load dynamic Prodigi catalog, using fallback items', err);
      } finally {
        if (isMounted) setLoadingCatalog(false);
      }
    }

    loadCatalog();
    return () => { isMounted = false; };
  }, [isOpen]);

  const selectedItem = catalog.find(i => i.sku === selectedSku) || catalog[0];

  // Recalculate quote whenever product, copies, or destination country changes
  useEffect(() => {
    if (!isOpen || !selectedItem) return;

    let isMounted = true;
    const timer = setTimeout(async () => {
      setLoadingQuote(true);
      setQuoteError(null);

      const res = await prodigiService.getQuotes({
        destinationCountryCode: country,
        shippingMethod: selectedMethod as any,
        items: [
          {
            sku: selectedItem.sku,
            copies,
            attributes: selectedItem.attributes
          }
        ]
      });

      if (!isMounted) return;

      if (res.success && res.quotes && res.quotes.length > 0) {
        setQuotes(res.quotes);
        const exists = res.quotes.find(q => q.shipmentMethod.toLowerCase() === selectedMethod.toLowerCase());
        if (!exists) {
          setSelectedMethod(res.quotes[0].shipmentMethod);
        }
      } else {
        setQuoteError(res.error || 'Live carrier quote unavailable for this region');
      }
      setLoadingQuote(false);
    }, 400);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, selectedSku, copies, country, selectedMethod]);

  const activeQuote = quotes.find(
    q => q.shipmentMethod.toLowerCase() === selectedMethod.toLowerCase()
  ) || quotes[0];

  const shippingCostNum = activeQuote ? parseFloat(activeQuote.costSummary.shipping.amount) : 4.95;
  const itemSubtotal = selectedItem ? (selectedItem.basePrice * copies) : 0;
  const grandTotal = Math.round((itemSubtotal + shippingCostNum) * 100) / 100;

  // 85/15 Net Profit Calculation:
  // Wholesale Base Cost = Prodigi print quote (item wholesale + shipping)
  const quoteItemsAmount = activeQuote?.costSummary?.items?.amount
    ? parseFloat(activeQuote.costSummary.items.amount)
    : Math.round(itemSubtotal * 0.35 * 100) / 100;

  const wholesaleBaseCost = Math.round((quoteItemsAmount + shippingCostNum) * 100) / 100;
  const netProfit = Math.max(0, Math.round((grandTotal - wholesaleBaseCost) * 100) / 100);
  const creatorPayout = Math.round(netProfit * 0.85 * 100) / 100;
  const platformRevenue = Math.round((netProfit - creatorPayout) * 100) / 100;

  // Resolve Creator Attribution for Ledger
  const resolvedCreatorId =
    creatorId ||
    (metadata as any)?.creatorId ||
    (metadata as any)?.photographerId ||
    user?.uid ||
    'creator_partner';

  const resolvedCreatorEmail =
    creatorPayPalEmail ||
    (metadata as any)?.creatorPayPalEmail ||
    (metadata as any)?.photographerEmail ||
    user?.email ||
    'creator@just1play.com';

  const resolvedCreatorName =
    creatorName ||
    (metadata as any)?.creatorName ||
    (metadata as any)?.photographerName ||
    user?.displayName ||
    'Just1Play Featured Creator';

  // Shipping destination validity check
  const isShippingValid = Boolean(
    name.trim() &&
    recipientEmail.trim() &&
    recipientEmail.includes('@') &&
    line1.trim() &&
    city.trim() &&
    zip.trim() &&
    country.trim()
  );

  // Print Cart Context Integration
  const { addToCart, openCart, openCheckout, totalCount: globalCartCount } = usePrintCart();
  const [addedToCartToast, setAddedToCartToast] = useState<boolean>(false);

  const handleAddToCartAction = () => {
    if (!selectedItem) return;
    const resolvedDriveId =
      photo.driveFileId ||
      (metadata as any)?.driveFileId ||
      extractGoogleDriveFileId(highResUrl || previewUrl || imageUrl || photo.url || '');

    addToCart({
      photoId: photo?.id || (metadata as any)?.photoIndex?.toString() || `photo-${Date.now()}`,
      title: itemTitle || 'Athlete Showcase Photo',
      previewUrl: previewSrc || previewUrl || imageUrl || '',
      highResUrl: orderAssetUrl || highResUrl || imageUrl || '',
      driveFileId: resolvedDriveId || undefined,
      sku: selectedItem.sku,
      formatName: selectedItem.title,
      price: selectedItem.basePrice,
      copies: copies,
      wholesaleCost: activeQuote?.costSummary?.items?.amount
        ? parseFloat(activeQuote.costSummary.items.amount) / copies
        : selectedItem.basePrice * 0.35,
      creatorId: resolvedCreatorId,
      creatorPayPalEmail: resolvedCreatorEmail,
      creatorName: resolvedCreatorName,
      isBundle: selectedItem.isBundle,
      bundleItems: selectedItem.bundleItems,
      dimensions: selectedItem.dimensions
    });

    setAddedToCartToast(true);
    showToast('success', 'Added to Print Cart', `${selectedItem.title} (${copies}x) added to cart.`);
    setTimeout(() => setAddedToCartToast(false), 4000);
  };

  const handleProceedToCheckoutAction = () => {
    handleAddToCartAction();
    onClose();
    openCheckout();
  };

  /**
   * Dispatches order to Prodigi lab and logs 85/15 net profit ledger entry to Firestore
   */
  const handlePaymentSuccessAndDispatch = async (payPalOrderId: string, payPalCaptureId?: string) => {
    if (!isShippingValid) {
      setOrderError('Please provide complete shipping recipient details including a valid email.');
      return;
    }

    setSubmitting(true);
    setOrderError(null);

    const ledgerRecord = {
      ledgerId: `LEDGER-PRINT-${Date.now()}`,
      orderId: payPalOrderId,
      payPalCaptureId: payPalCaptureId || null,
      type: 'physical_print',
      sku: selectedItem.sku,
      title: selectedItem.title,
      copies,
      grossRetailPrice: grandTotal,
      wholesaleBaseCost,
      wholesaleItemsCost: quoteItemsAmount,
      wholesaleShippingCost: shippingCostNum,
      netProfit,
      creatorPayout,
      platformRevenue,
      creatorSplitPercent: 85,
      platformSplitPercent: 15,
      creatorId: resolvedCreatorId,
      creatorPayPalEmail: resolvedCreatorEmail,
      creatorName: resolvedCreatorName,
      userId: user?.uid || 'guest',
      buyerUid: user?.uid || 'guest',
      buyerEmail: user?.email || undefined,
      recipient: {
        name: name.trim(),
        email: recipientEmail.trim(),
        address: {
          line1: line1.trim(),
          line2: line2 ? line2.trim() : undefined,
          townOrCity: city.trim(),
          stateOrCounty: state ? state.trim() : undefined,
          postalOrZipCode: zip.trim(),
          countryCode: country
        }
      },
      shippingMethod: selectedMethod || 'Budget',
      status: 'PAID',
      prodigiStatus: 'DISPATCHING',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // 1. Log ledger entry to Firestore
    try {
      if (db) {
        // A. Primary /orders record
        const orderRef = doc(db, 'orders', payPalOrderId);
        await setDoc(orderRef, ledgerRecord, { merge: true });

        // B. Central /financial_ledger record
        const ledgerRef = doc(db, 'financial_ledger', ledgerRecord.ledgerId);
        await setDoc(ledgerRef, ledgerRecord, { merge: true });

        // C. Root /purchases record
        const purchaseRef = doc(db, 'purchases', ledgerRecord.ledgerId);
        await setDoc(purchaseRef, {
          ...ledgerRecord,
          id: ledgerRecord.ledgerId,
          amount: grandTotal,
          platformFee: platformRevenue,
          directorPayout: creatorPayout,
          paymentProcessor: 'paypal'
        }, { merge: true });

        // D. Creator earnings subcollection if user authenticated
        if (user?.uid) {
          const userOrderRef = doc(db, `users/${user.uid}/purchases`, payPalOrderId);
          await setDoc(userOrderRef, ledgerRecord, { merge: true });
        }
      }
    } catch (ledgerErr) {
      console.warn('[Firestore Print Ledger Warning]:', ledgerErr);
    }

    // 2. Dispatch payload to Prodigi proxy endpoint
    const payload: ProdigiOrderPayload = {
      recipient: {
        name: name.trim(),
        email: recipientEmail.trim(),
        address: {
          line1: line1.trim(),
          line2: line2 ? line2.trim() : undefined,
          townOrCity: city.trim(),
          stateOrCounty: state ? state.trim() : undefined,
          postalOrZipCode: zip.trim(),
          countryCode: country
        }
      },
      shippingMethod: (selectedMethod || 'Budget') as any,
      items: [
        {
          sku: selectedItem.sku,
          copies,
          sizing: selectedItem.sizing || 'fillPrintArea',
          attributes: selectedItem.attributes,
          assets: [
            {
              printArea: 'default',
              url: orderAssetUrl
            }
          ]
        }
      ],
      creatorId: resolvedCreatorId,
      creatorPayPalEmail: resolvedCreatorEmail,
      creatorName: resolvedCreatorName,
      payPalOrderId,
      payPalCaptureId,
      financialLedger: {
        grossRetailPrice: grandTotal,
        wholesaleBaseCost,
        wholesaleItemsCost: quoteItemsAmount,
        wholesaleShippingCost: shippingCostNum,
        netProfit,
        creatorPayout,
        platformRevenue,
        creatorSplitPercent: 85,
        platformSplitPercent: 15
      },
      metadata: {
        itemTitle,
        itemSubtitle,
        platform: 'Just1Play Print-on-Demand',
        payPalOrderId,
        payPalCaptureId,
        ...metadata
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
      showToast('success', 'Order Submitted to Lab', `Your print order for ${selectedItem.title} has been placed.`);
    } else {
      if (res.outcome === 'PaymentRequired') {
        setOrderError(null);
        setOrderResult({
          id: payPalOrderId,
          status: { stage: 'ValidatedPendingBilling' },
          note: res.message
        });
        showToast('info', 'Order Validated', 'Print order validated! Pending lab production queue.');
      } else {
        setOrderError(res.error || res.message || 'Unable to place order with print lab.');
        showToast('error', 'Lab Order Issue', res.error || 'Failed to submit order to Prodigi lab.');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id="prodigi-print-order-backdrop" 
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-3xl my-auto bg-[#0C1220] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[92vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-[#0A0F1A]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00F5D4]/20 to-[#00B8D4]/10 border border-[#00F5D4]/40 flex items-center justify-center text-[#00F5D4] shadow-[0_0_12px_rgba(0,245,212,0.25)]">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                    Order Physical Print & Wall Art
                  </h2>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-[10px] font-mono text-cyan-400">
                    <Sparkles className="w-3 h-3" /> Prodigi Global Lab
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium line-clamp-1">
                  {itemTitle} • Archival Quality Lab Fulfillment
                </p>
              </div>
            </div>

            <button
              id="close-prodigi-modal-btn"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-6">

            {/* Success State */}
            {orderResult ? (
              <div className="space-y-5 text-center py-6">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-black text-white">
                    {orderResult.status?.stage === 'ValidatedPendingBilling'
                      ? 'Print Order Validated & Registered!'
                      : 'Physical Print Order Placed!'}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    {orderResult.note || 'Your order has been ingested by the Prodigi global print lab network. High-definition lab printing and archival packaging will begin shortly.'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 max-w-md mx-auto text-left space-y-2.5 font-mono text-xs">
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Order ID:</span>
                    <span className="text-cyan-400 font-bold">{orderResult.id}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Product:</span>
                    <span className="text-white font-bold">{selectedItem?.title}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Copies:</span>
                    <span className="text-white">{copies}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Recipient:</span>
                    <span className="text-white">{name} ({city}, {state || country})</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-2 text-emerald-400">
                    <span>Creator Payout (85%):</span>
                    <span className="font-bold">${creatorPayout.toFixed(2)} USD</span>
                  </div>
                  <div className="flex justify-between pt-1 text-white font-bold">
                    <span>Total Settled:</span>
                    <span className="text-[#00F5D4]">${grandTotal.toFixed(2)} USD</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={onClose}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00F5D4] to-[#00B8D4] text-slate-950 font-black text-xs uppercase tracking-wider hover:brightness-110 shadow-lg cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Artwork & Product Selection Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  {/* Artwork Preview Card */}
                  <div className="md:col-span-4 flex flex-col items-center bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-center space-y-2.5">
                    <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center p-1">
                      {previewSrc && !imageError ? (
                        <>
                          {!imageLoaded && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 text-slate-400 gap-1.5 z-10">
                              <Loader2 className="w-5 h-5 animate-spin text-[#00F5D4]" />
                              <span className="text-[10px] font-mono text-slate-400">Loading preview...</span>
                            </div>
                          )}
                          <img
                            src={previewSrc}
                            alt={photo.title || itemTitle || "Print Preview"}
                            className={`w-full h-full object-contain transition-opacity duration-200 ${
                              imageLoaded ? 'opacity-100' : 'opacity-0'
                            }`}
                            crossOrigin="anonymous"
                            referrerPolicy="no-referrer"
                            onLoad={() => setImageLoaded(true)}
                            onError={() => {
                              setImageLoaded(true);
                              setImageError(true);
                            }}
                          />
                          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/75 text-[10px] font-mono text-cyan-300 backdrop-blur-sm border border-cyan-500/20 z-20">
                            Lab Ready
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/80 p-3 text-center">
                          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-[#00F5D4] mb-2">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-bold text-white line-clamp-1">{photo.title || itemTitle || "Tournament Action Photo"}</span>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5">Lab Ready 4K Master</span>
                          <div className="mt-2 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-[10px] text-cyan-400 font-mono">
                            Official Lab Fulfillment
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white line-clamp-1">{photo.title || itemTitle}</div>
                      <div className="text-[11px] text-slate-400">{itemSubtitle}</div>
                    </div>
                  </div>

                  {/* Product Catalog Picker */}
                  <div className="md:col-span-8 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-[#00F5D4]" /> Select Format, Pack & Finish
                      </label>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {copies} {copies === 1 ? 'pack/copy' : 'packs/copies'}
                      </span>
                    </div>

                    {/* Section Tabs: Popular Bundles vs Single Prints */}
                    <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-xl">
                      <button
                        type="button"
                        id="tab-popular-bundles"
                        onClick={() => handleTabChange('bundles')}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          catalogTab === 'bundles'
                            ? 'bg-[#00F5D4]/15 text-[#00F5D4] border border-[#00F5D4]/40 shadow-[0_0_10px_rgba(0,245,212,0.15)]'
                            : 'text-slate-400 hover:text-white border border-transparent'
                        }`}
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>Popular Bundles</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] font-mono text-slate-300">
                          {bundleItems.length}
                        </span>
                      </button>
                      <button
                        type="button"
                        id="tab-single-prints"
                        onClick={() => handleTabChange('singles')}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          catalogTab === 'singles'
                            ? 'bg-[#00F5D4]/15 text-[#00F5D4] border border-[#00F5D4]/40 shadow-[0_0_10px_rgba(0,245,212,0.15)]'
                            : 'text-slate-400 hover:text-white border border-transparent'
                        }`}
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Single Prints</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] font-mono text-slate-300">
                          {singleItems.length}
                        </span>
                      </button>
                    </div>

                    {loadingCatalog ? (
                      <div className="p-8 flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
                        <Loader2 className="w-5 h-5 animate-spin text-[#00F5D4]" />
                        <span>Loading print catalog options...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[250px] overflow-y-auto pr-1">
                        {displayedCatalog.map((prod) => {
                          const isSelected = prod.sku === selectedSku;
                          return (
                            <div
                              key={prod.sku}
                              id={`prod-card-${prod.sku}`}
                              onClick={() => setSelectedSku(prod.sku)}
                              className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                                isSelected
                                  ? 'bg-[#00F5D4]/10 border-[#00F5D4] shadow-[0_0_12px_rgba(0,245,212,0.15)]'
                                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                              }`}
                            >
                              <div>
                                <div className="flex items-start justify-between gap-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-black text-white leading-tight">
                                      {prod.title}
                                    </span>
                                    {prod.isBundle ? (
                                      <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold uppercase tracking-wider">
                                        Bundle
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/20 text-[9px] font-bold uppercase tracking-wider">
                                        Single
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs font-mono font-bold text-[#00F5D4] shrink-0">
                                    ${prod.basePrice.toFixed(2)}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-400 line-clamp-2 mt-1">
                                  {prod.description}
                                </p>
                              </div>
                              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 font-mono">
                                <span>{prod.dimensions}</span>
                                {prod.popular && (
                                  <span className="text-[#00F5D4] font-bold">★ Popular</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Quantity Selector */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-slate-300 font-medium">Quantity:</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCopies(Math.max(1, copies - 1))}
                          className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center cursor-pointer"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-mono text-sm font-bold text-white">
                          {copies}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCopies(copies + 1)}
                          className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Multi-Photo Print Cart Primary Actions */}
                    <div className="pt-3 border-t border-slate-800/80 space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <button
                          id="modal-add-to-cart-action-btn"
                          type="button"
                          onClick={handleAddToCartAction}
                          className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-emerald-400/60 hover:border-emerald-400 text-emerald-300 hover:text-white font-black text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] cursor-pointer"
                        >
                          <ShoppingCart className="w-4 h-4 text-emerald-400" />
                          <span>Add to Cart (${itemSubtotal.toFixed(2)})</span>
                        </button>

                        <button
                          id="modal-proceed-to-checkout-action-btn"
                          type="button"
                          onClick={handleProceedToCheckoutAction}
                          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 text-slate-950 font-black text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.35)] cursor-pointer"
                        >
                          <span>Proceed to Checkout</span>
                          <ArrowRight className="w-4 h-4 text-slate-950" />
                        </button>
                      </div>

                      {/* Toast Banner confirmation */}
                      {addedToCartToast && (
                        <div className="p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs flex items-center justify-between gap-2 animate-fadeIn">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>Added to Cart! ({copies}x {selectedItem?.title})</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                openCart();
                              }}
                              className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 text-[10px] font-mono font-bold hover:brightness-110 cursor-pointer"
                            >
                              View Cart ({globalCartCount})
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                openCheckout();
                              }}
                              className="px-2 py-0.5 rounded bg-cyan-400 text-slate-950 text-[10px] font-mono font-bold hover:brightness-110 cursor-pointer"
                            >
                              Checkout
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Shipping Destination & Form */}
                <div className="space-y-3 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#00F5D4]" /> Shipping Destination
                    </label>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" /> Direct from Prodigi Certified Lab
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1">Recipient Full Name *</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Darrell Davis"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-[#00F5D4]"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">
                        Recipient Email * <span className="text-[10px] text-cyan-400 font-mono">(Required by Prodigi v4.0 for tracking)</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="e.g. parent@athlete.com"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-[#00F5D4]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-slate-400 mb-1">Country *</label>
                      <select
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-[#00F5D4]"
                      >
                        <option value="US">United States (US)</option>
                        <option value="CA">Canada (CA)</option>
                        <option value="GB">United Kingdom (GB)</option>
                        <option value="AU">Australia (AU)</option>
                        <option value="DE">Germany (DE)</option>
                        <option value="FR">France (FR)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-slate-400 mb-1">Street Address *</label>
                      <input
                        type="text"
                        required
                        value={line1}
                        onChange={(e) => setLine1(e.target.value)}
                        placeholder="123 Championship Way"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-[#00F5D4]"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Apt, Suite, Locker (Optional)</label>
                      <input
                        type="text"
                        value={line2}
                        onChange={(e) => setLine2(e.target.value)}
                        placeholder="Suite #4B"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-[#00F5D4]"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-slate-400 mb-1">City *</label>
                        <input
                          type="text"
                          required
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Dallas"
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-[#00F5D4]"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">State</label>
                        <input
                          type="text"
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          placeholder="TX"
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-[#00F5D4]"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">ZIP *</label>
                        <input
                          type="text"
                          required
                          value={zip}
                          onChange={(e) => setZip(e.target.value)}
                          placeholder="75001"
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-[#00F5D4]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shipping Method Rate Selector */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-[#00F5D4]" /> Delivery Carrier Method
                    </label>
                    {loadingQuote && (
                      <span className="text-[11px] text-cyan-400 flex items-center gap-1 font-mono">
                        <Loader2 className="w-3 h-3 animate-spin" /> Live Lab Rate Query
                      </span>
                    )}
                  </div>

                  {quotes.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {quotes.map((q) => {
                        const isSelected = q.shipmentMethod.toLowerCase() === selectedMethod.toLowerCase();
                        const shipCost = parseFloat(q.costSummary.shipping.amount);
                        return (
                          <div
                            key={q.shipmentMethod}
                            onClick={() => setSelectedMethod(q.shipmentMethod)}
                            className={`p-2.5 rounded-xl border cursor-pointer text-center transition-all ${
                              isSelected
                                ? 'bg-cyan-950/40 border-[#00F5D4] text-white'
                                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <div className="text-xs font-bold capitalize">{q.shipmentMethod}</div>
                            <div className="text-[11px] font-mono font-black text-cyan-300 mt-0.5">
                              ${shipCost.toFixed(2)}
                            </div>
                            {q.shipments?.[0]?.carrier && (
                              <div className="text-[9px] text-slate-500 line-clamp-1 mt-0.5">
                                {q.shipments[0].carrier.name}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Standard Lab Shipping (USPS / UPS Carrier)</span>
                      <span className="font-mono text-cyan-400 font-bold">$4.95 USD</span>
                    </div>
                  )}
                </div>

                {/* Error Banner */}
                {orderError && (
                  <div id="prodigi-order-error-banner" className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{orderError}</span>
                    </div>
                    <button
                      type="button"
                      id="dismiss-order-error-btn"
                      onClick={() => setOrderError(null)}
                      className="text-rose-400 hover:text-white p-1 transition-colors shrink-0"
                      title="Dismiss notice"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* 85/15 Net Profit Split & Order Settlement Section */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
                  
                  {/* Financial Breakdown */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                      <span className="flex items-center gap-1.5 font-bold text-slate-200">
                        <DollarSign className="w-4 h-4 text-emerald-400" />
                        85/15 Net Profit Split Transparency
                      </span>
                      <span className="text-[11px] font-mono text-emerald-400">
                        Direct Creator Allocation
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                        <div className="text-slate-400 text-[10px]">Gross Retail Price</div>
                        <div className="font-mono font-bold text-white text-sm">${grandTotal.toFixed(2)}</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                        <div className="text-slate-400 text-[10px]">Prodigi Lab + Ship</div>
                        <div className="font-mono font-bold text-slate-300 text-sm">${wholesaleBaseCost.toFixed(2)}</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                        <div className="text-emerald-400/90 text-[10px]">Creator Payout (85%)</div>
                        <div className="font-mono font-black text-emerald-400 text-sm">${creatorPayout.toFixed(2)}</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30">
                        <div className="text-cyan-400/90 text-[10px]">Platform Fee (15%)</div>
                        <div className="font-mono font-black text-cyan-400 text-sm">${platformRevenue.toFixed(2)}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span>Creator Payee: <strong className="text-slate-300 font-mono">{resolvedCreatorEmail}</strong></span>
                      <span>Net Profit: <strong className="text-emerald-300 font-mono">${netProfit.toFixed(2)}</strong></span>
                    </div>
                  </div>

                  {/* PayPal or Checkout Button Area */}
                  {!isShippingValid ? (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-200">
                        Enter your shipping recipient name, recipient email, street address, city, and ZIP code above to activate PayPal checkout and lab order dispatch.
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 pt-1">
                      {/* Live PayPal Smart Buttons */}
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
                                    description: `Just1Play Print: ${selectedItem?.title} (${copies}x)`,
                                    amount: {
                                      currency_code: 'USD',
                                      value: grandTotal.toFixed(2)
                                    },
                                    custom_id: `PRODIGI_${Date.now()}_${resolvedCreatorId}`
                                  }
                                ]
                              });
                            }
                            return Promise.resolve(`ORDER-PRINT-${Date.now()}`);
                          }}
                          onApprove={async (data, actions) => {
                            let captureId = `CAP-${Date.now()}`;
                            if (actions?.order) {
                              try {
                                const cap = await actions.order.capture();
                                captureId = cap?.purchase_units?.[0]?.payments?.captures?.[0]?.id || cap?.id || captureId;
                              } catch (e) {
                                console.warn('PayPal capture detail notice:', e);
                              }
                            }
                            await handlePaymentSuccessAndDispatch(data.orderID || `ORD-PP-${Date.now()}`, captureId);
                          }}
                          onError={(err) => {
                            console.warn('[PayPal Print Order Button Issue]:', err);
                            setOrderError('PayPal checkout encountered a gateway issue. You can use the instant checkout button below.');
                          }}
                        />
                      </div>

                      {/* Multi-Photo Print Cart & Consolidated Checkout Actions */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        <button
                          id="cart-bottom-add-action-btn"
                          type="button"
                          onClick={handleAddToCartAction}
                          className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-emerald-400/50 hover:border-emerald-400 text-emerald-300 hover:text-white font-black text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] cursor-pointer"
                        >
                          <ShoppingCart className="w-4 h-4 text-emerald-400" />
                          <span>Add to Cart (${itemSubtotal.toFixed(2)})</span>
                        </button>

                        <button
                          id="proceed-to-consolidated-checkout-btn"
                          type="button"
                          onClick={handleProceedToCheckoutAction}
                          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 text-slate-950 font-black text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.35)] cursor-pointer"
                        >
                          <span>Proceed to Checkout</span>
                          <ArrowRight className="w-4 h-4 text-slate-950" />
                        </button>
                      </div>

                      {/* 1-Click Instant Lab Dispatch & Ledger Settle */}
                      <button
                        id="instant-prodigi-print-order-btn"
                        type="button"
                        onClick={() => handlePaymentSuccessAndDispatch(`ORDER-INSTANT-${Date.now()}`, `CAP-INSTANT-${Date.now()}`)}
                        disabled={submitting}
                        className="w-full py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-900 border border-white/10 text-slate-400 hover:text-cyan-300 text-[11px] font-mono flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                            <span>Dispatching single photo to Prodigi...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Direct Instant Dispatch Single Photo (${grandTotal.toFixed(2)} USD)</span>
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
