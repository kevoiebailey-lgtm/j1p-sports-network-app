import React, { useEffect, useState } from 'react';
import { WristHudReceiverView } from './WristHudReceiverView';
import { ArrowLeft, Radio, Shield, Sparkles } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

export const SignalHubReceiverPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const pinFromUrl = searchParams.get('pin') || '';
  const posFromUrl = searchParams.get('pos') || 'QB';

  return (
    <div className="min-h-screen bg-[#06090E] text-white flex flex-col items-center justify-center p-3 sm:p-6 relative overflow-hidden selection:bg-[#00E5FF] selection:text-black">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#00E5FF]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top navigation branding */}
      <div className="w-full max-w-md flex items-center justify-between mb-4 z-10">
        <Link 
          to="/playbook" 
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Playbook</span>
        </Link>

        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#00E5FF] bg-slate-900/80 px-2.5 py-1 rounded-full border border-white/10">
          <Radio className="w-3 h-3 animate-pulse" />
          <span>J1P FIELD HUD</span>
        </div>
      </div>

      {/* Receiver Container */}
      <div className="w-full max-w-md z-10">
        <WristHudReceiverView
          initialPin={pinFromUrl}
          initialPosition={posFromUrl}
        />
      </div>

      {/* Footer Info */}
      <div className="mt-4 text-center text-slate-500 text-xs z-10 space-y-1">
        <p>Just1Play Real-Time Signal Stream &bull; Sub-Second Wristband Sync</p>
        <p className="text-[11px]">Designed for Apple Watch, Garmin, Smartwatches, and Smartphone Armbands.</p>
      </div>
    </div>
  );
};
