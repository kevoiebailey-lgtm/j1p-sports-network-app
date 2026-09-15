/**
 * Prodigi Print-on-Demand Service
 * Client interface for interacting with secure /api/prodigi endpoints.
 * Never exposes PRODIGI_API_KEY to the browser.
 */

export interface ProdigiBundleSubItem {
  sku: string;
  copies: number;
  sizing?: string;
  attributes?: Record<string, string>;
  title?: string;
}

export interface ProdigiCatalogItem {
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

export interface ProdigiQuoteItem {
  sku: string;
  copies: number;
  attributes?: Record<string, string>;
  assets?: Array<{ printArea: string }>;
}

export interface ProdigiQuoteRequest {
  destinationCountryCode?: string;
  currencyCode?: string;
  shippingMethod?: 'Budget' | 'Standard' | 'Express' | 'Overnight';
  items: ProdigiQuoteItem[];
}

export interface ProdigiShippingQuote {
  shipmentMethod: string;
  costSummary: {
    items: { amount: string; currency: string };
    shipping: { amount: string; currency: string };
    totalCost: { amount: string; currency: string };
    totalTax?: { amount: string; currency: string };
  };
  shipments: Array<{
    carrier: { name: string; service: string };
    fulfillmentLocation: { countryCode: string; labCode: string };
    cost: { amount: string; currency: string };
  }>;
}

export interface ProdigiOrderRecipient {
  name: string;
  email?: string;
  phoneNumber?: string;
  address: {
    line1: string;
    line2?: string;
    townOrCity: string;
    stateOrCounty?: string;
    postalOrZipCode: string;
    countryCode: string;
  };
}

export interface ProdigiOrderItem {
  sku: string;
  copies: number;
  sizing?: string;
  attributes?: Record<string, string>;
  assets: Array<{
    printArea: string;
    url: string;
  }>;
}

export interface CreatorLedgerSplit {
  creatorId: string;
  creatorPayPalEmail?: string;
  creatorName?: string;
  itemsGross: number;
  itemsWholesale: number;
  netProfit: number;
  creatorPayout: number;
  platformRevenue: number;
  photoIds?: string[];
  itemCount?: number;
}

export interface ProdigiFinancialLedger {
  grossRetailPrice: number;
  wholesaleBaseCost: number;
  wholesaleItemsCost?: number;
  wholesaleShippingCost?: number;
  netProfit: number;
  creatorPayout: number;
  platformRevenue: number;
  creatorSplitPercent?: number;
  platformSplitPercent?: number;
  creatorSplits?: CreatorLedgerSplit[];
}

export interface ProdigiOrderPayload {
  recipient: ProdigiOrderRecipient;
  items: ProdigiOrderItem[];
  shippingMethod?: 'Budget' | 'Standard' | 'Express' | 'Overnight';
  metadata?: Record<string, any>;
  creatorId?: string;
  creatorPayPalEmail?: string;
  creatorName?: string;
  payPalOrderId?: string;
  payPalCaptureId?: string;
  financialLedger?: ProdigiFinancialLedger;
}

export interface ProdigiStatusResponse {
  configured: boolean;
  authenticated?: boolean;
  httpStatus?: number;
  outcome?: string;
  baseUrl?: string;
  isSandbox?: boolean;
  message?: string;
  activeCatalogItems?: number;
}

function formatProdigiFailures(failures: any): string {
  if (!failures) return '';
  if (typeof failures === 'string') return failures;
  if (Array.isArray(failures)) {
    return failures
      .map((f) => (typeof f === 'string' ? f : f.message || f.code || JSON.stringify(f)))
      .join('; ');
  }
  if (typeof failures === 'object') {
    return Object.entries(failures)
      .map(([k, v]) => {
        if (Array.isArray(v)) {
          const msgs = v.map((item: any) => item.message || item.code || JSON.stringify(item)).join(', ');
          return `${k}: ${msgs}`;
        }
        return `${k}: ${JSON.stringify(v)}`;
      })
      .join('; ');
  }
  return String(failures);
}

class ProdigiService {
  /**
   * Check connection status of Prodigi Print API
   */
  async getStatus(): Promise<ProdigiStatusResponse> {
    try {
      const res = await fetch('/api/prodigi/status');
      if (!res.ok) {
        return { configured: false, message: `HTTP ${res.status}` };
      }
      return await res.json();
    } catch (err: any) {
      return { configured: false, message: err?.message || 'Network error' };
    }
  }

  /**
   * Fetch available physical print products
   */
  async getCatalog(): Promise<ProdigiCatalogItem[]> {
    try {
      const res = await fetch('/api/prodigi/catalog');
      const data = await res.json();
      return data.items || [];
    } catch {
      return [];
    }
  }

  /**
   * Request live manufacturing costs and carrier shipping rates
   */
  async getQuotes(req: ProdigiQuoteRequest): Promise<{ success: boolean; quotes?: ProdigiShippingQuote[]; error?: string; raw?: any }> {
    try {
      const res = await fetch('/api/prodigi/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinationCountryCode: req.destinationCountryCode || 'US',
          currencyCode: req.currencyCode || 'USD',
          shippingMethod: req.shippingMethod || 'Budget',
          items: req.items
        })
      });

      const data = await res.json();
      if (!res.ok) {
        console.error('[Prodigi Quotes Validation Error Details]:', data);
        const failureStr = formatProdigiFailures(data.failures);
        return {
          success: false,
          error: failureStr || data.message || data.error || 'Failed to fetch shipping quote from Prodigi',
          raw: data
        };
      }

      return {
        success: true,
        quotes: data.quotes || []
      };
    } catch (err: any) {
      console.error('[Prodigi Quotes Network Exception]:', err);
      return {
        success: false,
        error: err?.message || 'Network error requesting Prodigi quote'
      };
    }
  }

  /**
   * Submit physical print order to Prodigi lab
   */
  async submitOrder(payload: ProdigiOrderPayload): Promise<{
    success: boolean;
    order?: any;
    outcome?: string;
    message?: string;
    error?: string;
    failures?: any;
    raw?: any;
    ledger?: any;
  }> {
    try {
      const res = await fetch('/api/prodigi/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('[Prodigi Order Validation Error Details]:', data);
        const failureStr = formatProdigiFailures(data.failures);
        return {
          success: false,
          outcome: data.outcome,
          message: data.message || data.error,
          error: failureStr || data.message || data.error || 'Order could not be submitted to Prodigi',
          failures: data.failures,
          raw: data
        };
      }

      return {
        success: true,
        order: data.order,
        outcome: data.outcome,
        ledger: data.ledger
      };
    } catch (err: any) {
      console.error('[Prodigi Order Network Exception]:', err);
      return {
        success: false,
        error: err?.message || 'Network failure while submitting order to Prodigi'
      };
    }
  }

  /**
   * Lookup live status & tracking of an order
   */
  async getOrder(orderId: string): Promise<{ success: boolean; order?: any; error?: string }> {
    try {
      const res = await fetch(`/api/prodigi/orders/${encodeURIComponent(orderId)}`);
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.message || 'Order not found' };
      }
      return { success: true, order: data.order };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to query order' };
    }
  }
}

export const prodigiService = new ProdigiService();
