import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Zap, Shield, Crown, Sparkles, Trophy, Video, Users, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SubscriptionTierModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTier?: 'athlete' | 'recruiter' | 'director';
}

export const SubscriptionTierModal: React.FC<SubscriptionTierModalProps> = ({
  isOpen,
  onClose,
  defaultTier = 'athlete'
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const navigate = useNavigate();

  if (!isOpen) return null;

  const tiers = [
    {
      id: 'athlete',
      name: 'ATHLETE NIL PRO',
      tagline: 'Get scouted, monetize your brand & stand out',
      badge: 'FOR RECRUITS',
      badgeColor: 'border-[#00F2FE]/40 text-[#00F2FE] bg-[#00F2FE]/10',
      priceMonthly: 14.99,
      priceAnnualMonthly: 9.99,
      highlight: false,
      icon: Crown,
      features: [
        'NCAA Verified Gold Badge on Athlete Profile',
        'Top-Ranked Placement in Scout Matrix Leaderboards',
        'Scout Traffic Analytics & College View Notifications',
        'Unlimited 4K Highlight Reel Uploads & AI Tagger',
        'Physical 300DPI Recruit Card & Apple Wallet Pass',
        'Verified Direct DM Access from NCAA Coaches'
      ],
      cta: 'UPGRADE TO NIL PRO',
      ctaStyle: 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
    },
    {
      id: 'recruiter',
      name: 'COLLEGE COACH ALL-ACCESS',
      tagline: 'The ultimate scouting advantage for D1, D2, D3 & JUCO staff',
      badge: 'MOST POPULAR',
      badgeColor: 'border-[#E5B868]/50 text-[#E5B868] bg-[#E5B868]/15',
      priceMonthly: 129.99,
      priceAnnualMonthly: 99.99,
      highlight: true,
      icon: Zap,
      features: [
        'Direct DM & Contact Pass to verified prospects & guardians',
        'Unlimited Pipeline Watchlists with metric alert triggers',
        'Download All-22 Uncut Game Film & Shot Heatmaps',
        'Export Scout Dossier PDF dossiers in 1-click',
        'AI Combine Radar Benchmark comparisons',
        'VIP Sideline Pass to live stream DVRs & camera feeds'
      ],
      cta: 'START COACH PASS TRIAL',
      ctaStyle: 'bg-[#E5B868] text-black font-black hover:bg-[#d6a858] shadow-[0_0_20px_rgba(229,184,104,0.4)]'
    },
    {
      id: 'director',
      name: 'TOURNAMENT DIRECTOR ENTERPRISE',
      tagline: 'Complete league operating system & arena broadcast engine',
      badge: 'LEAGUE OPS',
      badgeColor: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
      priceMonthly: 349.99,
      priceAnnualMonthly: 299.99,
      highlight: false,
      icon: Trophy,
      features: [
        'Automated Team Registration & Digital Waiver E-Signatures',
        'AI Paper Scoresheet Vision OCR Scanner',
        'Arena Jumbotron / Video Board Live Overlay Controller',
        'Officials & Referee Pay Assignment Desk with PIN check-ins',
        'Embeddable Tournament Brackets for High School & News Blogs',
        'Dedicated Event Push Dispatch Alerts & SMS Blast Engine'
      ],
      cta: 'LAUNCH ENTERPRISE LEAGUE',
      ctaStyle: 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
    }
  ];

  const handleSelectPlan = (tierId: string) => {
    onClose();
    navigate('/checkout/paypal', {
      state: {
        tierId,
        billingCycle,
        amount: tierId === 'athlete' ? (billingCycle === 'annual' ? 119.88 : 14.99) : tierId === 'recruiter' ? (billingCycle === 'annual' ? 1199.88 : 129.99) : (billingCycle === 'annual' ? 3599.88 : 349.99)
      }
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="relative w-full max-w-5xl bg-[#141C24] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden text-slate-100 my-8"
        >
          {/* Top Bar */}
          <div className="p-6 md:p-8 bg-gradient-to-r from-[#212A31] via-[#17222c] to-[#212A31] border-b border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-black bg-[#00F2FE]/15 text-[#00F2FE] border border-[#00F2FE]/30 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> ENTERPRISE ATHLETIC SUITE
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tight text-white">
                CHOOSE YOUR JUST1PLAY ADVANTAGE
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Unlock high-resolution film, NCAA coach outreach, AI scoresheets, and league operations.
              </p>
            </div>

            {/* Monthly / Annual Toggle */}
            <div className="flex items-center gap-3">
              <div className="p-1 rounded-2xl bg-slate-900 border border-slate-800 flex items-center">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                    billingCycle === 'monthly' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('annual')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    billingCycle === 'annual' ? 'bg-[#00F2FE] text-slate-950 font-black shadow-[0_0_10px_rgba(0,242,254,0.4)]' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Annual</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-slate-900 text-[#00F2FE] text-[10px] font-black">Save 25%</span>
                </button>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            {tiers.map((tier) => {
              const IconComp = tier.icon;
              const price = billingCycle === 'annual' ? tier.priceAnnualMonthly : tier.priceMonthly;

              return (
                <div
                  key={tier.id}
                  className={`relative rounded-3xl p-6 flex flex-col justify-between transition-all ${
                    tier.highlight
                      ? 'bg-gradient-to-b from-[#212A31] via-[#1a242d] to-[#141C24] border-2 border-[#E5B868] shadow-[0_0_30px_rgba(229,184,104,0.2)]'
                      : 'bg-slate-900/80 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Top Badge */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-black uppercase border ${tier.badgeColor}`}>
                        {tier.badge}
                      </span>
                      <IconComp className={`w-5 h-5 ${tier.highlight ? 'text-[#E5B868]' : 'text-slate-400'}`} />
                    </div>

                    <div>
                      <h3 className="text-lg font-black uppercase tracking-wide text-white">{tier.name}</h3>
                      <p className="text-xs text-slate-400 min-h-[32px] mt-1">{tier.tagline}</p>
                    </div>

                    {/* Price */}
                    <div className="py-4 border-y border-slate-800">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-white">${price}</span>
                        <span className="text-xs text-slate-400 font-mono">/ month</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {billingCycle === 'annual' ? 'Billed annually' : 'Billed monthly, cancel anytime'}
                      </p>
                    </div>

                    {/* Feature List */}
                    <ul className="space-y-2.5 py-2">
                      {tier.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                          <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleSelectPlan(tier.id)}
                    className={`w-full py-3 mt-6 rounded-2xl text-xs font-mono font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${tier.ctaStyle}`}
                  >
                    <span>{tier.cta}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer Guarantee */}
          <div className="p-4 bg-slate-950/60 border-t border-slate-800/80 text-center flex items-center justify-center gap-2 text-xs text-slate-400 font-mono">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Bank-grade 256-bit encrypted checkout • Instant activation • Full compliance logging</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
