import React, { useState, useEffect } from 'react';
import { CreditCard, RefreshCw, CheckCircle2, AlertCircle, HelpCircle, ShieldCheck, ExternalLink } from 'lucide-react';

export interface PayPalStatusData {
  connected: boolean;
  configured: boolean;
  mode?: 'live' | 'sandbox';
  status: 'active' | 'missing_credentials' | 'init_failed' | 'api_error';
  message: string;
  error?: string;
  clientIdPrefix?: string;
  partnerMerchantId?: string;
  supportedRails?: string[];
  balance?: {
    available: number;
    pending: number;
    currency: string;
  };
}

export type StripeStatusData = PayPalStatusData;

export const PayPalStatusBadge: React.FC = () => {
  const [statusData, setStatusData] = useState<PayPalStatusData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showPopover, setShowPopover] = useState<boolean>(false);

  const checkHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/paypal/status');
      const data: PayPalStatusData = await res.json();
      setStatusData(data);
    } catch (err: any) {
      setStatusData({
        connected: false,
        configured: false,
        status: 'api_error',
        message: 'Could not reach PayPal health check server endpoint.',
        error: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="relative inline-block">
      {/* Subtle Status Pill Badge */}
      <button
        onClick={() => setShowPopover(!showPopover)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono font-bold transition-all cursor-pointer shadow-sm ${
          loading
            ? 'bg-white/5 border-white/10 text-slate-400'
            : statusData?.connected
            ? 'bg-[#00F2FE]/10 border-[#00F2FE]/40 text-[#00F2FE] hover:bg-[#00F2FE]/20 hover:border-[#00F2FE]/60'
            : 'bg-amber-500/10 border-amber-500/40 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/60'
        }`}
        title="Click to inspect PayPal Commerce Platform API connection health"
      >
        <CreditCard className="w-3.5 h-3.5" />
        
        {loading ? (
          <span className="flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />
            <span>Pinging PayPal...</span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            {/* Indicator Light */}
            <span className="relative flex h-2 w-2">
              {statusData?.connected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00F2FE] opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  statusData?.connected ? 'bg-[#00F2FE]' : 'bg-amber-500'
                }`}
              ></span>
            </span>

            <span>
              {statusData?.connected
                ? statusData.mode === 'live'
                  ? 'PayPal Live'
                  : 'PayPal Sandbox'
                : 'PayPal Offline'}
            </span>
          </span>
        )}
      </button>

      {/* Diagnostics Popover Box */}
      {showPopover && (
        <div className="absolute right-0 mt-2 w-80 p-4 rounded-2xl bg-[#151E26] border border-slate-700 shadow-2xl z-50 text-left font-sans space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-white font-mono">
              <ShieldCheck className="w-4 h-4 text-[#00F2FE]" />
              <span>PayPal Commerce Platform</span>
            </div>
            <button
              onClick={checkHealth}
              disabled={loading}
              className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Re-run API connection test"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Status Overview */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-slate-400 font-mono text-[11px]">Connection Status:</span>
              <span
                className={`font-mono font-bold flex items-center gap-1 text-[11px] ${
                  statusData?.connected ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {statusData?.connected ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>OPERATIONAL</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>DISCONNECTED</span>
                  </>
                )}
              </span>
            </div>

            {statusData?.connected && (
              <>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-slate-400 font-mono text-[11px]">Gateway Environment:</span>
                  <span className="font-mono font-bold text-white text-[11px] uppercase">
                    {statusData.mode === 'live' ? 'Live Production' : 'Sandbox Active'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5 font-mono text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Client ID Prefix:</span>
                    <span className="text-white font-bold">{statusData.clientIdPrefix || 'AZJ1P_...'}</span>
                  </div>
                  {statusData.partnerMerchantId && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Partner Merchant:</span>
                      <span className="text-[#00F2FE] font-bold truncate max-w-[150px]">{statusData.partnerMerchantId}</span>
                    </div>
                  )}
                  {statusData.balance && (
                    <div className="flex items-center justify-between pt-1 border-t border-white/5">
                      <span className="text-slate-400">Available Balance:</span>
                      <span className="text-emerald-400 font-bold">${statusData.balance.available.toFixed(2)} USD</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1 border-t border-white/5">
                    <span className="text-slate-400">Split Payouts:</span>
                    <span className="text-emerald-400 font-bold">Supported</span>
                  </div>
                </div>
              </>
            )}

            {/* Error or Explanation details */}
            <div className="p-3 rounded-xl bg-black/60 border border-white/10 space-y-1">
              <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                Gateway Details
              </div>
              <p className="text-[11px] text-slate-200 leading-relaxed font-mono">
                {statusData?.message || 'PayPal Partner Commerce Platform Active'}
              </p>
              {statusData?.error && (
                <p className="text-[10px] text-rose-400 font-mono break-words pt-1 border-t border-white/5">
                  Error: {statusData.error}
                </p>
              )}
            </div>
          </div>

          {/* Quick Dashboard Action Link */}
          <a
            href={
              statusData?.mode === 'live'
                ? 'https://www.paypal.com/signin'
                : 'https://developer.paypal.com/dashboard/'
            }
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-3 rounded-xl bg-[#0070BA] hover:bg-[#005ea6] text-white font-mono font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md group cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Open PayPal Developer Portal</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
          </a>

          <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 font-mono">
            <span>Just1Play PayPal Gateway v3.0</span>
            <button
              onClick={() => setShowPopover(false)}
              className="text-slate-400 hover:text-white underline cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const StripeStatusBadge = PayPalStatusBadge;

export default PayPalStatusBadge;
