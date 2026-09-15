import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Package, 
  Truck, 
  Search, 
  ExternalLink, 
  Layers, 
  DollarSign, 
  Loader2, 
  ShieldCheck, 
  Globe,
  Sliders
} from 'lucide-react';
import { 
  prodigiService, 
  ProdigiStatusResponse, 
  ProdigiCatalogItem, 
  ProdigiShippingQuote 
} from '../../services/prodigiService';

export const AdminProdigiPrintDesk: React.FC = () => {
  const [status, setStatus] = useState<ProdigiStatusResponse | null>(null);
  const [catalog, setCatalog] = useState<ProdigiCatalogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Quote tester state
  const [testSku, setTestSku] = useState<string>('GLOBAL-PAP-8x10');
  const [testCountry, setTestCountry] = useState<string>('US');
  const [testCopies, setTestCopies] = useState<number>(1);
  const [testingQuote, setTestingQuote] = useState<boolean>(false);
  const [testQuotes, setTestQuotes] = useState<ProdigiShippingQuote[]>([]);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Order lookup state
  const [lookupId, setLookupId] = useState<string>('');
  const [lookupResult, setLookupResult] = useState<any | null>(null);
  const [lookupLoading, setLookupLoading] = useState<boolean>(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [st, cat] = await Promise.all([
      prodigiService.getStatus(),
      prodigiService.getCatalog()
    ]);
    setStatus(st);
    setCatalog(cat);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleRunQuoteTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestingQuote(true);
    setQuoteError(null);
    setTestQuotes([]);

    const selected = catalog.find(c => c.sku === testSku);
    const res = await prodigiService.getQuotes({
      destinationCountryCode: testCountry,
      items: [
        {
          sku: testSku,
          copies: testCopies,
          attributes: selected?.attributes
        }
      ]
    });

    setTestingQuote(false);
    if (res.success && res.quotes) {
      setTestQuotes(res.quotes);
    } else {
      setQuoteError(res.error || 'Failed to fetch quote from Prodigi');
    }
  };

  const handleLookupOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupId.trim()) return;
    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);

    const res = await prodigiService.getOrder(lookupId.trim());
    setLookupLoading(false);
    if (res.success && res.order) {
      setLookupResult(res.order);
    } else {
      setLookupError(res.error || `No active Prodigi order matching ${lookupId}`);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00F5D4]/20 to-[#00B8D4]/10 border border-[#00F5D4]/40 flex items-center justify-center text-[#00F5D4] shadow-[0_0_15px_rgba(0,245,212,0.25)]">
            <Printer className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white tracking-tight">
                Prodigi Print-on-Demand Command Hub
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-[11px] font-mono font-bold text-cyan-400">
                API v4.0 Active
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Automated physical fulfillment for tournament photo prints, posters, canvas wall art, and recruit trading cards.
            </p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition-colors cursor-pointer w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#00F5D4] ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh API Status</span>
        </button>
      </div>

      {/* Diagnostics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status Card */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
              API Connection
            </span>
            {status?.authenticated ? (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5" /> Authenticated
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 font-mono">
                <AlertCircle className="w-3.5 h-3.5" /> Key Ingested
              </span>
            )}
          </div>

          <div className="text-lg font-black text-white">
            {status?.configured ? 'Prodigi Print API Connected' : 'Configuration Pending'}
          </div>

          <div className="space-y-1.5 text-xs text-slate-400 font-mono">
            <div className="flex justify-between">
              <span>Endpoint:</span>
              <span className="text-slate-200 truncate max-w-[170px]">{status?.baseUrl || 'https://api.prodigi.com/v4.0'}</span>
            </div>
            <div className="flex justify-between">
              <span>Environment:</span>
              <span className="text-cyan-400 font-bold">{status?.isSandbox ? 'Sandbox' : 'Production Live'}</span>
            </div>
            <div className="flex justify-between">
              <span>Catalog SKUs:</span>
              <span className="text-white font-bold">{catalog.length} Active Items</span>
            </div>
          </div>
        </div>

        {/* Global Labs Card */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
              Lab Routing
            </span>
            <span className="flex items-center gap-1 text-[11px] font-bold text-cyan-400 font-mono">
              <Globe className="w-3.5 h-3.5" /> 50+ Global Labs
            </span>
          </div>

          <div className="text-lg font-black text-white">
            Smart Lab Allocation
          </div>

          <p className="text-xs text-slate-400">
            Prodigi automatically routes physical orders to the nearest certified print lab in North America, UK, Europe, or Australia to slash transit times and carbon footprint.
          </p>
        </div>

        {/* Security & Token Vault */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
              Key Security
            </span>
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 font-mono">
              <ShieldCheck className="w-3.5 h-3.5" /> Server-Side Proxy
            </span>
          </div>

          <div className="text-lg font-black text-white">
            Zero Client Leakage
          </div>

          <p className="text-xs text-slate-400">
            <code className="text-cyan-300 font-mono">PRODIGI_API_KEY</code> is held exclusively in server-side memory. All print requests, quotes, and lab dispatches pass through audited Express routes.
          </p>
        </div>
      </div>

      {/* Quote & Shipping Rate Simulator */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#00F5D4]" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Live Lab Quote & Carrier Shipping Simulator
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Real-Time Prodigi /quotes Engine</span>
        </div>

        <form onSubmit={handleRunQuoteTest} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-mono">Select SKU Product</label>
            <select
              value={testSku}
              onChange={(e) => setTestSku(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-[#00F5D4]"
            >
              {catalog.map(item => (
                <option key={item.sku} value={item.sku}>
                  {item.title} (${item.basePrice.toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-mono">Destination Country</label>
            <select
              value={testCountry}
              onChange={(e) => setTestCountry(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-[#00F5D4]"
            >
              <option value="US">United States (US)</option>
              <option value="CA">Canada (CA)</option>
              <option value="GB">United Kingdom (GB)</option>
              <option value="AU">Australia (AU)</option>
              <option value="DE">Germany (DE)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-mono">Copies</label>
            <input
              type="number"
              min="1"
              max="50"
              value={testCopies}
              onChange={(e) => setTestCopies(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-[#00F5D4]"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={testingQuote}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00F5D4] to-[#00B8D4] text-slate-950 font-black text-xs uppercase tracking-wider hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer shadow-md"
            >
              {testingQuote ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Querying Lab...</span>
                </>
              ) : (
                <>
                  <Truck className="w-4 h-4" />
                  <span>Fetch Live Rates</span>
                </>
              )}
            </button>
          </div>
        </form>

        {quoteError && (
          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{quoteError}</span>
          </div>
        )}

        {testQuotes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {testQuotes.map((q) => (
              <div
                key={q.shipmentMethod}
                className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white capitalize">{q.shipmentMethod} Tier</span>
                  <span className="text-xs font-mono font-black text-[#00F5D4]">
                    ${parseFloat(q.costSummary.shipping.amount).toFixed(2)} {q.costSummary.shipping.currency}
                  </span>
                </div>

                <div className="space-y-1 text-[11px] text-slate-400 font-mono">
                  <div className="flex justify-between">
                    <span>Manufacturing Cost:</span>
                    <span className="text-slate-200">${parseFloat(q.costSummary.items.amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-800 pt-1 text-white font-bold">
                    <span>Lab Total:</span>
                    <span className="text-cyan-400">${parseFloat(q.costSummary.totalCost.amount).toFixed(2)}</span>
                  </div>
                </div>

                {q.shipments?.[0]?.carrier && (
                  <div className="text-[10px] text-slate-500 font-mono">
                    Carrier: {q.shipments[0].carrier.name} ({q.shipments[0].carrier.service}) • Lab: {q.shipments[0].fulfillmentLocation.labCode}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Order Status & Tracking Inspector */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-[#00F5D4]" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Prodigi Order Lookup & Fulfillment Tracker
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">GET /v4.0/orders/:id</span>
        </div>

        <form onSubmit={handleLookupOrder} className="flex gap-2">
          <input
            type="text"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
            placeholder="Enter Prodigi Order ID (e.g., ord_1294820 or ORD-1002)..."
            className="flex-1 px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-[#00F5D4]"
          />
          <button
            type="submit"
            disabled={lookupLoading}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {lookupLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>Track Order</span>
          </button>
        </form>

        {lookupError && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs">
            {lookupError}
          </div>
        )}

        {lookupResult && (
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Order ID:</span>
              <span className="text-cyan-400 font-bold">{lookupResult.id}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Fulfillment Stage:</span>
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold">
                {lookupResult.status?.stage || 'Processing'}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Recipient:</span>
              <span className="text-white">{lookupResult.recipient?.name || 'Customer'}</span>
            </div>
            {lookupResult.shipments && lookupResult.shipments.length > 0 && (
              <div className="space-y-1 pt-1">
                <span className="text-slate-400">Shipments:</span>
                {lookupResult.shipments.map((s: any, idx: number) => (
                  <div key={idx} className="p-2 rounded bg-slate-950 text-slate-300 text-[11px] flex justify-between">
                    <span>{s.carrier?.name} ({s.status})</span>
                    {s.tracking?.number && (
                      <span className="text-cyan-300 font-bold">{s.tracking.number}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Catalog Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#00F5D4]" /> Available Physical Products
          </h3>
          <span className="text-xs text-slate-400 font-mono">Pre-configured Prodigi SKUs</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {catalog.map((item) => (
            <div
              key={item.sku}
              className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-3 hover:border-slate-700 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-black text-white leading-tight">
                    {item.title}
                  </h4>
                  <span className="text-xs font-mono font-bold text-[#00F5D4]">
                    ${item.basePrice.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">
                  {item.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>SKU: {item.sku}</span>
                <span className="text-slate-400">{item.dimensions}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminProdigiPrintDesk;
