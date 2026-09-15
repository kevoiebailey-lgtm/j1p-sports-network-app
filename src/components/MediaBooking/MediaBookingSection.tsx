import React, { useState, useEffect } from 'react';
import { ServiceBookingFlow } from './ServiceBookingFlow';
import { ClientMediaDelivery } from './ClientMediaDelivery';
import { Video, Lock, Unlock, CreditCard, Sparkles, Layers } from 'lucide-react';

export const MediaBookingSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'STAGE1_BOOKING' | 'STAGE2_DELIVERY'>('STAGE1_BOOKING');

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get('payment') === 'balance_success' || query.get('unlocked') === 'true' || query.get('stage') === '2') {
      setActiveTab('STAGE2_DELIVERY');
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* STAGE SELECTOR NAVIGATION TABS */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-[#212A31] border border-white/10 rounded-2xl backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('STAGE1_BOOKING')}
            className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'STAGE1_BOOKING'
                ? 'bg-[#E5B868] text-black shadow-[0_0_15px_rgba(214,28,36,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>STAGE 1: SERVICE BOOKING & DEPOSIT</span>
          </button>

          <button
            onClick={() => setActiveTab('STAGE2_DELIVERY')}
            className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'STAGE2_DELIVERY'
                ? 'bg-[#E5B868] text-black shadow-[0_0_15px_rgba(214,28,36,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>STAGE 2: LOCKED CLIENT MEDIA PORTAL</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-slate-400 px-3">
          <Sparkles className="w-3.5 h-3.5 text-[#E5B868]" />
          <span>Multi-Stage PayPal Payment Pipeline</span>
        </div>
      </div>

      {/* RENDER ACTIVE STAGE COMPONENT */}
      {activeTab === 'STAGE1_BOOKING' ? (
        <ServiceBookingFlow />
      ) : (
        <ClientMediaDelivery />
      )}
    </div>
  );
};
