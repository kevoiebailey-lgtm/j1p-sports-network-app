import React, { useState } from 'react';
import { 
  Radio, 
  Zap, 
  ShieldCheck, 
  Sparkles, 
  Watch, 
  Smartphone, 
  Wifi, 
  CheckCircle2, 
  Loader2, 
  ArrowRight,
  Flame,
  Volume2,
  Lock,
  ChevronRight,
  Clock,
  Layers
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { activateSignalHubAddon } from '../../../services/signalHubService';

interface SignalHubUpgradeCardProps {
  isUnlocked: boolean;
  onOpenDispatcher: () => void;
  onUnlockedSuccess?: () => void;
  activeSessionPin?: string;
  connectedCount?: number;
}

export const SignalHubUpgradeCard: React.FC<SignalHubUpgradeCardProps> = ({
  isUnlocked,
  onOpenDispatcher,
  onUnlockedSuccess,
  activeSessionPin,
  connectedCount = 0
}) => {
  const { user, profile, updateUserProfile } = useAuth();
  const [isActivating, setIsActivating] = useState(false);
  const [showSuccessBadge, setShowSuccessBadge] = useState(false);

  const handleStartTrial = async (planType: 'trial' | 'monthly') => {
    if (!user) return;
    setIsActivating(true);
    try {
      await activateSignalHubAddon(user.uid, planType);
      if (updateUserProfile) {
        await updateUserProfile({
          hasSignalHubAddon: true,
          signalHubPlan: planType,
          isCoachPass: true,
          subscriptionTier: 'PRO_PLAYBOOK'
        });
      }
      setShowSuccessBadge(true);
      if (onUnlockedSuccess) onUnlockedSuccess();
    } catch (err) {
      console.error('Error activating Signal Hub addon:', err);
    } finally {
      setIsActivating(false);
    }
  };

  // 1. If feature is UNLOCKED -> Show the "Go Live: Field Dispatcher" high-visibility control bar
  if (isUnlocked) {
    return (
      <div className="bg-gradient-to-r from-[#131B26] via-[#1A2332] to-[#131B26] border border-[#00E5FF]/30 rounded-3xl p-4 sm:p-5 shadow-2xl relative overflow-hidden backdrop-blur-xl group transition-all hover:border-[#00E5FF]/60">
        {/* Neon Ambient Highlights */}
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-[#00E5FF]/10 via-[#0070BA]/5 to-transparent pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-36 h-36 bg-[#00E5FF]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00E5FF] to-[#0070BA] flex items-center justify-center text-[#0B0F17] shadow-[0_0_25px_rgba(0,229,255,0.4)] group-hover:scale-105 transition-transform shrink-0">
                <Radio className="w-6 h-6 stroke-[2.5] animate-pulse" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-[#131B26]"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40 shadow-sm">
                  J1P SIGNAL HUB &bull; LIVE ACTIVE
                </span>
                {activeSessionPin && (
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                    SESSION PIN: <strong className="text-white tracking-wider">{activeSessionPin}</strong>
                  </span>
                )}
                {connectedCount > 0 && (
                  <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Wifi className="w-2.5 h-2.5 text-emerald-400" />
                    {connectedCount} On-Field Devices
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight mt-0.5">
                Real-Time Playbook Wrist & HUD Dispatcher
              </h3>
              <p className="text-xs text-slate-400 leading-snug">
                Push live tactical calls, snap cadences, and color audibles directly to on-field wristbands & helmet HUDs.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
            <button
              type="button"
              onClick={onOpenDispatcher}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 bg-gradient-to-r from-[#00E5FF] via-[#00C853] to-[#00E5FF] bg-[length:200%_auto] hover:bg-[position:right_center] text-[#0B0F17] font-black px-5 py-2.5 rounded-2xl text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(0,229,255,0.4)] transition-all cursor-pointer active:scale-95 group/btn"
            >
              <Zap className="w-4 h-4 fill-current group-hover/btn:scale-110 transition-transform" />
              <span>Broadcast Live Call</span>
              <ChevronRight className="w-4 h-4 -ml-1 group-hover/btn:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. If feature is LOCKED -> Show the Monetization & Feature Gating Card
  return (
    <div className="bg-[#131B26]/95 border border-white/10 hover:border-[#00E5FF]/40 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden backdrop-blur-2xl transition-all">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-b from-[#00E5FF]/10 via-[#0070BA]/5 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-5">
        {/* Header with Icon & Tier Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center text-[#00E5FF] shadow-inner shrink-0">
              <Radio className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  PRO PLAYBOOK ADD-ON
                </span>
                <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-400" />
                  Gated Tier
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
                Unlock Live Wrist & HUD Game Dispatcher
              </h2>
            </div>
          </div>

          <div className="flex items-baseline gap-1.5 self-start sm:self-auto bg-slate-900/80 border border-white/10 px-3.5 py-1.5 rounded-2xl">
            <span className="text-xl font-black text-white tracking-tight">$9.99</span>
            <span className="text-xs text-slate-400 font-mono">/mo per team</span>
            <span className="text-[10px] font-bold text-emerald-400 font-mono ml-1 px-1.5 py-0.5 rounded bg-emerald-500/10">
              14-DAY TRIAL
            </span>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-3.5 space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Watch className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-white">Sub-Second Wrist HUD</h4>
            <p className="text-[11px] text-slate-400 leading-tight">
              Instantly push routes, progressions, and assignments to smartwatch or wristband receivers.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-3.5 space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Wifi className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-white">6-Digit Session PIN</h4>
            <p className="text-[11px] text-slate-400 leading-tight">
              Players join securely in 3 seconds. Real-time ping latency and &quot;Locked In&quot; read receipts.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-3.5 space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Volume2 className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-white">Encrypted Cadence & Colors</h4>
            <p className="text-[11px] text-slate-400 leading-tight">
              Attach snap counts (&quot;On 2&quot;, &quot;Freeze&quot;) and audible codes (&quot;RED 80&quot;, &quot;BLUE 42&quot;) in one tap.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-3.5 space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Flame className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-white">1-Tap Kill & Scramble</h4>
            <p className="text-[11px] text-slate-400 leading-tight">
              Emergency audible overrides that instantly alert and reset the entire on-field offense.
            </p>
          </div>
        </div>

        {/* Upgrade & Trial Call to Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-white/5">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Cancel anytime. Free 14-day trial requires no upfront credit card commitment.</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleStartTrial('trial')}
              disabled={isActivating}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gradient-to-r from-[#00E5FF] to-[#0070BA] hover:from-[#00C853] hover:to-[#00E5FF] text-[#0B0F17] font-black px-5 py-2.5 rounded-2xl text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isActivating ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#0B0F17]" />
              ) : (
                <Zap className="w-4 h-4 fill-current" />
              )}
              <span>{isActivating ? 'Activating...' : 'Start 14-Day Free Trial'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleStartTrial('monthly')}
              disabled={isActivating}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2.5 rounded-2xl text-xs border border-white/10 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <span>Unlock $9.99/mo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
