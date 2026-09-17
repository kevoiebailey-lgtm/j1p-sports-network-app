import express, { Request, Response } from 'express';

/**
 * Prodigi Print API v4.0 Integration
 * Server-side proxy for secure print-on-demand fulfillment.
 * API keys remain strictly hidden from client browser.
 */

export interface ProdigiBundleSubItem {
  sku: string;
  copies: number;
  sizing?: string;
  attributes?: Record<string, string>;
  title?: string;
}

export interface ProdigiCatalogItemDef {
  sku: string;
  title: string;
  category: 'photo' | 'poster' | 'canvas' | 'acrylic' | 'card' | 'bundle';
  description: string;
  basePrice: number;
  sizing: string;
  attributes?: Record<string, string>;
  dimensions: string;
  mockupUrl: string;
  popular?: boolean;
  isBundle?: boolean;
  bundleItems?: ProdigiBundleSubItem[];
}

// Curated catalog of Just1Play physical print products & sports bundles mapped to Prodigi SKUs
export const PRODIGI_CATALOG: ProdigiCatalogItemDef[] = [
  // --- SPORTS PACKAGES & BUNDLES ---
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

  // --- SINGLE PHYSICAL PRINTS & WALL ART ---
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

/**
 * Maps incoming SKU variants directly to Prodigi-supported production SKUs:
 * 8x10 -> GLOBAL-PAP-8x10
 * 5x7 -> GLOBAL-PAP-5x7
 * 4x6 / Wallets -> GLOBAL-PAP-4x6
 * 16x20 -> GLOBAL-PAP-16x20
 */
export function mapToProdigiSupportedSku(sku: string): string {
  const upper = (sku || '').trim().toUpperCase();
  if (upper === 'GLOBAL-PAP-8X10' || upper === 'GLOBAL-PHO-8X10' || upper.includes('8X10')) {
    return 'GLOBAL-PAP-8x10';
  }
  if (upper === 'GLOBAL-PAP-5X7' || upper === 'GLOBAL-PHO-5X7' || upper.includes('5X7')) {
    return 'GLOBAL-PAP-5x7';
  }
  if (upper === 'GLOBAL-PAP-4X6' || upper === 'GLOBAL-PHO-4X6' || upper.includes('4X6') || upper.includes('WALLET')) {
    return 'GLOBAL-PAP-4x6';
  }
  if (upper === 'GLOBAL-PAP-16X20' || upper === 'GLOBAL-POS-16X20' || upper.includes('16X20')) {
    return 'GLOBAL-PAP-16x20';
  }
  if (upper === 'GLOBAL-CAN-12X16' || upper.includes('12X16')) {
    return 'GLOBAL-CAN-12x16';
  }
  if (upper === 'GLOBAL-ACR-4X6') {
    return 'GLOBAL-ACR-4x6';
  }
  return (sku || '').trim();
}

/**
 * Ensures Google Drive image URLs use the direct accessible file download stream:
 * https://drive.google.com/uc?export=download&id=${driveFileId}
 */
export function toDirectGoogleDriveDownloadUrl(url?: string): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();

  const driveMatch = trimmed.match(/\/(?:file\/d|d)\/([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
  }

  if (trimmed.startsWith('gdrive:') || trimmed.startsWith('drive:')) {
    const rawId = trimmed.replace(/^(gdrive:|drive:)/, '').trim();
    if (rawId) {
      return `https://drive.google.com/uc?export=download&id=${rawId}`;
    }
  }

  if (/^[a-zA-Z0-9_-]{20,60}$/.test(trimmed) && !trimmed.includes('.') && !trimmed.includes('/')) {
    return `https://drive.google.com/uc?export=download&id=${trimmed}`;
  }

  return trimmed;
}

/**
 * Expand bundled packages or single items into concrete Prodigi individual SKU items.
 * Bundles are decomposed into an array of individual items matching supported SKUs
 * (GLOBAL-PAP-8x10, GLOBAL-PAP-5x7, GLOBAL-PAP-4x6, GLOBAL-PAP-16x20).
 * Asset URLs are converted to direct accessible streams.
 */
export function expandItemsForProdigi(items: any[]): any[] {
  const expanded: any[] = [];
  for (const it of items) {
    const catalogItem = PRODIGI_CATALOG.find(c => c.sku === it.sku);
    const itemMultiplier = Math.max(1, Number(it.copies) || 1);

    // Resolve direct asset URL (supports driveFileId, assets array, highResUrl, previewUrl, url)
    const rawAssetUrl = (it.assets && it.assets[0]?.url) ||
      (it.driveFileId ? `https://drive.google.com/uc?export=download&id=${it.driveFileId}` : '') ||
      it.highResUrl ||
      it.previewUrl ||
      it.imageUrl ||
      it.url ||
      '';
    const resolvedAssetUrl = toDirectGoogleDriveDownloadUrl(rawAssetUrl);

    if (catalogItem?.isBundle && catalogItem.bundleItems && catalogItem.bundleItems.length > 0) {
      for (const sub of catalogItem.bundleItems) {
        const subCopies = (sub.copies || 1) * itemMultiplier;
        expanded.push({
          sku: mapToProdigiSupportedSku(sub.sku),
          copies: subCopies,
          sizing: sub.sizing || 'fillPrintArea',
          attributes: sub.attributes || undefined,
          assets: resolvedAssetUrl
            ? [{ printArea: 'default', url: resolvedAssetUrl }]
            : [{ printArea: 'default' }]
        });
      }
    } else {
      expanded.push({
        sku: mapToProdigiSupportedSku(it.sku),
        copies: itemMultiplier,
        sizing: it.sizing || catalogItem?.sizing || 'fillPrintArea',
        attributes: it.attributes || catalogItem?.attributes || undefined,
        assets: resolvedAssetUrl
          ? [{ printArea: 'default', url: resolvedAssetUrl }]
          : [{ printArea: 'default' }]
      });
    }
  }
  return expanded;
}

function getProdigiCredentials() {
  // Support both PRODIGI_API_KEY and PRODIGI_KEY environment variables
  const apiKey = (process.env.PRODIGI_API_KEY || process.env.PRODIGI_KEY || '').trim();
  let rawBaseUrl = (process.env.PRODIGI_API_BASE_URL || '').trim();

  // Graceful Diagnostic Check: log clear warning explaining file and variable names
  if (!apiKey) {
    console.warn(
      '[Prodigi Diagnostic]: Prodigi API key is not configured on the server.\n' +
      'Looking in file: src/server/prodigiRoutes.ts\n' +
      'Checked environment variables: process.env.PRODIGI_API_KEY and process.env.PRODIGI_KEY.\n' +
      'Please declare PRODIGI_API_KEY or PRODIGI_KEY in your server environment or Settings > Secrets panel.'
    );
  }

  // Prodigi live API keys work against production endpoint. If baseUrl is sandbox and key is live, route to production.
  if (rawBaseUrl.includes('sandbox') && apiKey && !apiKey.toLowerCase().startsWith('test_')) {
    rawBaseUrl = 'https://api.prodigi.com/v4.0';
  }
  const baseUrl = rawBaseUrl || 'https://api.prodigi.com/v4.0';
  return { apiKey, baseUrl };
}

export function registerProdigiRoutes(app: express.Express) {
  const router = express.Router();

  // 1. Health & Config Status Check
  router.get('/status', async (req: Request, res: Response) => {
    const { apiKey, baseUrl } = getProdigiCredentials();
    if (!apiKey) {
      console.warn('[Prodigi Diagnostic]: /api/prodigi/status check failed: PRODIGI_API_KEY and PRODIGI_KEY are undefined or empty in src/server/prodigiRoutes.ts.');
      return res.json({
        configured: false,
        message: 'PRODIGI_API_KEY or PRODIGI_KEY is not configured in environment variables.',
        baseUrl,
        isSandbox: baseUrl.includes('sandbox')
      });
    }

    try {
      // Lightweight handshake with Prodigi API Quotes endpoint
      const testRes = await fetch(`${baseUrl}/Quotes`, {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          destinationCountryCode: 'US',
          currencyCode: 'USD',
          items: [
            {
              sku: 'GLOBAL-PHO-4X6',
              copies: 1,
              attributes: { finish: 'gloss' },
              assets: [{ printArea: 'default' }]
            }
          ]
        })
      });

      const data: any = await testRes.json().catch(() => ({}));
      const isAuthenticated = testRes.status !== 401 && data?.outcome !== 'NotAuthenticated';

      return res.json({
        configured: true,
        authenticated: isAuthenticated,
        httpStatus: testRes.status,
        outcome: data?.outcome || (testRes.ok ? 'OK' : 'Error'),
        baseUrl,
        isSandbox: baseUrl.includes('sandbox'),
        activeCatalogItems: PRODIGI_CATALOG.length
      });
    } catch (err: any) {
      return res.json({
        configured: true,
        authenticated: false,
        error: err?.message || 'Handshake failed',
        baseUrl
      });
    }
  });

  // 2. Curated Catalog
  router.get('/catalog', (req: Request, res: Response) => {
    return res.json({
      success: true,
      items: PRODIGI_CATALOG
    });
  });

  // 3. Real-Time Shipping & Cost Quotes
  router.post('/quotes', async (req: Request, res: Response) => {
    const { apiKey, baseUrl } = getProdigiCredentials();
    if (!apiKey) {
      console.warn('[Prodigi Diagnostic]: /api/prodigi/quotes failed: PRODIGI_API_KEY and PRODIGI_KEY are undefined or empty in src/server/prodigiRoutes.ts.');
      return res.status(503).json({
        success: false,
        error: 'Prodigi API key is not configured on the server. Please set PRODIGI_API_KEY or PRODIGI_KEY in environment variables.'
      });
    }

    const {
      destinationCountryCode = 'US',
      currencyCode = 'USD',
      items = []
    } = req.body;

    if (!items.length) {
      return res.status(400).json({
        success: false,
        error: 'At least one item is required to generate a quote.'
      });
    }

    // Expand bundles into individual Prodigi items for Quotes API (quotes require assets with printArea, but NOT url)
    const expandedItems = expandItemsForProdigi(items);
    const formattedItems = expandedItems.map((it: any) => ({
      sku: it.sku,
      copies: Number(it.copies) || 1,
      attributes: it.attributes || undefined,
      assets: [{ printArea: 'default' }]
    }));

    try {
      const prodigiRes = await fetch(`${baseUrl}/Quotes`, {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          destinationCountryCode,
          currencyCode,
          items: formattedItems
        })
      });

      const data: any = await prodigiRes.json();

      if (!prodigiRes.ok) {
        console.error('[Prodigi Quotes Validation Failure]:', JSON.stringify(data, null, 2));
        return res.status(prodigiRes.status).json({
          success: false,
          outcome: data.outcome || 'QuoteFailed',
          failures: data.failures || data.message || 'Validation error from Prodigi',
          raw: data
        });
      }

      return res.json({
        success: true,
        outcome: data.outcome,
        quotes: data.quotes || []
      });
    } catch (err: any) {
      console.error('[Prodigi Quote Error]', err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'Failed to communicate with Prodigi API'
      });
    }
  });

  // 4. Submit Order to Prodigi Lab (Live Dispatch)
  router.post('/orders', async (req: Request, res: Response) => {
    const { apiKey, baseUrl } = getProdigiCredentials();
    if (!apiKey) {
      console.warn('[Prodigi Diagnostic]: /api/prodigi/orders failed: PRODIGI_API_KEY and PRODIGI_KEY are undefined or empty in src/server/prodigiRoutes.ts.');
      return res.status(503).json({
        success: false,
        error: 'Prodigi API key is not configured on the server. Please set PRODIGI_API_KEY or PRODIGI_KEY in environment variables.'
      });
    }

    const {
      recipient,
      items,
      shippingMethod = 'Budget',
      metadata = {},
      creatorId,
      creatorPayPalEmail,
      payPalOrderId,
      payPalCaptureId,
      financialLedger
    } = req.body;

    if (!recipient || !recipient.name || !recipient.address) {
      return res.status(400).json({
        success: false,
        error: 'Recipient name and shipping address are required.'
      });
    }

    if (!recipient.email || !recipient.email.trim() || !recipient.email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Recipient email is required by Prodigi API v4.0 for shipping and tracking notifications.'
      });
    }

    if (!recipient.address.line1 || !recipient.address.townOrCity || !recipient.address.postalOrZipCode) {
      return res.status(400).json({
        success: false,
        error: 'Incomplete address: line1, townOrCity, and postalOrZipCode are mandatory.'
      });
    }

    if (!items || !items.length) {
      return res.status(400).json({
        success: false,
        error: 'At least one item is required to create an order.'
      });
    }

    // Expand bundles into concrete individual Prodigi items with proper asset URLs and copies
    const expandedItems = expandItemsForProdigi(items);
    const formattedItems = expandedItems.map((it: any) => ({
      sku: it.sku,
      copies: Number(it.copies) || 1,
      sizing: it.sizing || 'fillPrintArea',
      attributes: it.attributes || undefined,
      assets: it.assets && it.assets.length > 0 ? it.assets.map((a: any) => ({
        printArea: a.printArea || 'default',
        url: a.url
      })) : []
    }));

    // Calculate & Log 85/15 Net Profit Split Ledger Entry
    const grossRetailPrice = Number(financialLedger?.grossRetailPrice) || 0;
    const wholesaleBaseCost = Number(financialLedger?.wholesaleBaseCost) || 0;
    const netProfit = Number(financialLedger?.netProfit) || Math.max(0, grossRetailPrice - wholesaleBaseCost);
    const creatorPayout = Number(financialLedger?.creatorPayout) || Math.round(netProfit * 0.85 * 100) / 100;
    const platformRevenue = Number(financialLedger?.platformRevenue) || Math.round((netProfit - creatorPayout) * 100) / 100;

    const creatorSplits = Array.isArray(financialLedger?.creatorSplits)
      ? financialLedger.creatorSplits
      : Array.isArray(req.body.creatorSplits)
      ? req.body.creatorSplits
      : [];

    const ledgerEntry = {
      ledgerId: `LEDGER-PRINT-${Date.now()}`,
      orderId: payPalOrderId || `ORD-${Date.now()}`,
      payPalCaptureId: payPalCaptureId || null,
      type: 'physical_print_fulfillment',
      creatorId: creatorId || metadata.creatorId || 'platform_creator',
      creatorPayPalEmail: creatorPayPalEmail || metadata.creatorPayPalEmail || 'payouts@just1play.com',
      grossRetailPrice,
      wholesaleBaseCost,
      netProfit,
      creatorPayout,
      platformRevenue,
      creatorSplits,
      split: '85/15',
      recipientName: recipient.name,
      shippingDestination: `${recipient.address.townOrCity}, ${recipient.address.countryCode || 'US'}`,
      itemCount: formattedItems.length,
      createdAt: new Date().toISOString()
    };

    console.log('[PRODIGI 85/15 LEDGER ENTRY LOGGED]:', JSON.stringify(ledgerEntry, null, 2));

    const payload = {
      shippingMethod,
      recipient: {
        name: recipient.name.trim(),
        email: recipient.email.trim(),
        phoneNumber: recipient.phoneNumber ? recipient.phoneNumber.trim() : undefined,
        address: {
          line1: recipient.address.line1.trim(),
          line2: recipient.address.line2 ? recipient.address.line2.trim() : undefined,
          townOrCity: recipient.address.townOrCity.trim(),
          stateOrCounty: recipient.address.stateOrCounty ? recipient.address.stateOrCounty.trim() : undefined,
          postalOrZipCode: recipient.address.postalOrZipCode.trim(),
          countryCode: recipient.address.countryCode || 'US'
        }
      },
      items: formattedItems,
      metadata: {
        platform: 'Just1Play',
        placedAt: new Date().toISOString(),
        creatorId: String(ledgerEntry.creatorId || ''),
        creatorPayPalEmail: String(ledgerEntry.creatorPayPalEmail || ''),
        creatorPayout: String(ledgerEntry.creatorPayout || '0'),
        platformRevenue: String(ledgerEntry.platformRevenue || '0'),
        payPalOrderId: String(ledgerEntry.orderId || ''),
        payPalCaptureId: String(ledgerEntry.payPalCaptureId || ''),
        split: '85/15'
      }
    };

    try {
      // Live Dispatch forward payload to Prodigi v4.0 /Orders endpoint
      const prodigiRes = await fetch(`${baseUrl}/Orders`, {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data: any = await prodigiRes.json();

      // Check if Prodigi accepted the order structure but noted card details needed
      if (!prodigiRes.ok) {
        console.error('[Prodigi Order Validation Failure]:', JSON.stringify(data, null, 2));
        // If payment failed because card details are needed in dashboard, inform user cleanly
        if (data.outcome === 'PaymentFailed') {
          return res.status(402).json({
            success: false,
            outcome: 'PaymentRequired',
            message: 'Order validated by Prodigi! Please ensure a payment card is configured in your Prodigi Dashboard (Settings > Billing) to dispatch live lab production.',
            details: data
          });
        }

        return res.status(prodigiRes.status).json({
          success: false,
          outcome: data.outcome || 'OrderFailed',
          failures: data.failures || data.message || 'Validation failure from Prodigi',
          raw: data
        });
      }

      return res.json({
        success: true,
        order: data.order,
        outcome: data.outcome,
        ledger: ledgerEntry
      });
    } catch (err: any) {
      console.error('[Prodigi Order Error]', err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'Failed to submit order to Prodigi'
      });
    }
  });

  // 5. Query Order Details & Tracking by ID
  router.get('/orders/:orderId', async (req: Request, res: Response) => {
    const { apiKey, baseUrl } = getProdigiCredentials();
    if (!apiKey) {
      console.warn('[Prodigi Diagnostic]: /api/prodigi/orders/:orderId failed: PRODIGI_API_KEY and PRODIGI_KEY are undefined or empty in src/server/prodigiRoutes.ts.');
      return res.status(503).json({
        success: false,
        error: 'Prodigi API key is not configured on the server.'
      });
    }

    const { orderId } = req.params;
    try {
      const prodigiRes = await fetch(`${baseUrl}/Orders/${encodeURIComponent(orderId)}`, {
        method: 'GET',
        headers: {
          'X-API-Key': apiKey,
          'Accept': 'application/json'
        }
      });

      const data: any = await prodigiRes.json();

      if (!prodigiRes.ok) {
        return res.status(prodigiRes.status).json({
          success: false,
          outcome: data.outcome || 'NotFound',
          message: data.message || 'Order not found in Prodigi'
        });
      }

      return res.json({
        success: true,
        order: data.order
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Failed to query Prodigi order'
      });
    }
  });

  // 6. Cancel an Order (Before Lab Production)
  router.post('/orders/:orderId/cancel', async (req: Request, res: Response) => {
    const { apiKey, baseUrl } = getProdigiCredentials();
    if (!apiKey) {
      console.warn('[Prodigi Diagnostic]: /api/prodigi/orders/:orderId/cancel failed: PRODIGI_API_KEY and PRODIGI_KEY are undefined or empty in src/server/prodigiRoutes.ts.');
      return res.status(503).json({
        success: false,
        error: 'Prodigi API key is not configured on the server.'
      });
    }

    const { orderId } = req.params;
    try {
      const prodigiRes = await fetch(`${baseUrl}/Orders/${encodeURIComponent(orderId)}/actions/cancel`, {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json'
        }
      });

      const data: any = await prodigiRes.json();
      return res.json({
        success: prodigiRes.ok,
        outcome: data.outcome,
        order: data.order
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Failed to cancel order'
      });
    }
  });

  app.use('/api/prodigi', router);
}
