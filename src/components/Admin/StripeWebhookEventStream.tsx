import React, { useState, useMemo } from 'react';
import { 
  Terminal, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Copy, 
  Check, 
  Play, 
  RotateCcw, 
  Trash2, 
  Filter, 
  Search, 
  ExternalLink, 
  X, 
  Code2, 
  Zap, 
  ShieldCheck, 
  Server, 
  RefreshCw, 
  ChevronRight, 
  SlidersHorizontal,
  Building2,
  Trophy
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export interface PayPalWebhookEventItem {
  id: string;
  eventId: string;
  type: string;
  status: 'success' | 'failed' | 'simulated';
  timestamp: string;
  rawDate: number;
  latencyMs: number;
  signatureVerified: boolean;
  payloadSummary: {
    teamName?: string;
    eventName?: string;
    amountPaid?: number;
    platformFee?: number;
    directorPayout?: number;
    customerEmail?: string;
  };
  rawPayload: any;
}

const DEFAULT_PAYPAL_EVENTS: PayPalWebhookEventItem[] = [
  {
    id: 'evt-log-1',
    eventId: 'WH-98217381901',
    type: 'CHECKOUT.ORDER.APPROVED',
    status: 'success',
    timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    rawDate: Date.now() - 1000 * 60 * 8,
    latencyMs: 142,
    signatureVerified: true,
    payloadSummary: {
      teamName: 'Philadelphia Ballers 17U',
      eventName: 'Northeast Summer Classic',
      amountPaid: 1200,
      platformFee: 25,
      directorPayout: 1175,
      customerEmail: 'coach.vance@phillyballers.com',
    },
    rawPayload: {
      id: 'WH-98217381901',
      event_version: '1.0',
      create_time: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
      resource_type: 'checkout-order',
      event_type: 'CHECKOUT.ORDER.APPROVED',
      summary: 'PayPal Partner Commerce split payment approved ($25 platform fee retained)',
      resource: {
        id: 'PPL_ORD_982173819',
        status: 'COMPLETED',
        purchase_units: [
          {
            amount: { currency_code: 'USD', value: '1200.00' },
            payee: { merchant_id: 'MERC_EASTCOAST_DIRECTOR' },
            payment_instruction: {
              platform_fees: [{ amount: { currency_code: 'USD', value: '25.00' } }]
            }
          }
        ]
      }
    }
  },
  {
    id: 'evt-log-2',
    eventId: 'WH-88192310102',
    type: 'PAYMENT.CAPTURE.COMPLETED',
    status: 'success',
    timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    rawDate: Date.now() - 1000 * 60 * 35,
    latencyMs: 168,
    signatureVerified: true,
    payloadSummary: {
      teamName: 'DMV Elite 16U',
      eventName: 'Mid-Atlantic Shootout 2026',
      amountPaid: 950,
      platformFee: 25,
      directorPayout: 925,
      customerEmail: 'darrell@dmvelite.org',
    },
    rawPayload: {
      id: 'WH-88192310102',
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      resource: {
        id: 'CAP-99128310',
        amount: { currency_code: 'USD', value: '950.00' },
        seller_receivable_breakdown: {
          gross_amount: { value: '950.00' },
          platform_fees: [{ amount: { value: '25.00' } }],
          net_amount: { value: '925.00' }
        }
      }
    }
  }
];

export const StripeWebhookEventStream: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { showToast } = useToast();
  const [events, setEvents] = useState<PayPalWebhookEventItem[]>(DEFAULT_PAYPAL_EVENTS);
  const [selectedEvent, setSelectedEvent] = useState<PayPalWebhookEventItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return events;
    const q = searchTerm.toLowerCase();
    return events.filter(e => 
      e.eventId.toLowerCase().includes(q) || 
      e.type.toLowerCase().includes(q) ||
      (e.payloadSummary.teamName && e.payloadSummary.teamName.toLowerCase().includes(q)) ||
      (e.payloadSummary.customerEmail && e.payloadSummary.customerEmail.toLowerCase().includes(q))
    );
  }, [events, searchTerm]);

  return (
    <div className={`p-6 rounded-3xl bg-[#0B1017]/90 border border-slate-800 backdrop-blur-2xl space-y-4 shadow-2xl ${className}`} id="paypal-webhook-stream">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0070BA]/20 border border-[#0070BA]/40 flex items-center justify-center text-[#0070BA]">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base tracking-tight font-sans">
                PAYPAL PARTNER WEBHOOK STREAM
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
                ● Live 200 OK
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Live cryptographic event telemetry for PayPal Partner Commerce Platform splits.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search webhook events..."
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-[#00F2FE]"
          />
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map((evt) => (
          <div
            key={evt.id}
            onClick={() => setSelectedEvent(evt)}
            className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-[#0070BA]/60 flex items-center justify-between gap-4 cursor-pointer transition-all"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-white">{evt.type}</span>
                  <span className="text-[10px] font-mono text-slate-400">{evt.eventId}</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {evt.payloadSummary.teamName} — ${evt.payloadSummary.amountPaid} (${evt.payloadSummary.platformFee} Just1Play retained)
                </div>
              </div>
            </div>

            <div className="text-right font-mono text-xs text-slate-400">
              {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
      </div>

      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-xl rounded-3xl bg-[#0B1017] border border-slate-700 shadow-2xl p-6 text-slate-100 space-y-4">
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white font-mono"
            >
              ✕
            </button>
            <div className="flex items-center gap-2 font-mono font-bold text-sm text-white">
              <Code2 className="w-4 h-4 text-[#0070BA]" />
              <span>PayPal Partner Webhook Payload: {selectedEvent.eventId}</span>
            </div>
            <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 max-h-96 overflow-y-auto">
              {JSON.stringify(selectedEvent.rawPayload, null, 2)}
            </pre>
            <div className="flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-mono"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StripeWebhookEventStream;
