import React from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Tag,
  Sliders,
  Sparkles,
  X,
  ArrowRight
} from 'lucide-react';
import { ValidationResult } from '../../services/roleConsistencyValidator';
import { ROLE_VISUAL_CONFIG } from '../Common/RoleAvatar';

interface RoleConsistencyBannerProps {
  validationResult: ValidationResult;
  onActionSelect: (actionId: 'relabel' | 'disclaimer' | 'switch_role') => void;
  onDismiss?: () => void;
}

export const RoleConsistencyBanner: React.FC<RoleConsistencyBannerProps> = ({
  validationResult,
  onActionSelect,
  onDismiss
}) => {
  if (validationResult.isAligned || validationResult.severity === 'none') {
    return null;
  }

  const isMismatch = validationResult.severity === 'mismatch_flag';
  const roleConfig = ROLE_VISUAL_CONFIG[validationResult.userRole] || ROLE_VISUAL_CONFIG.athlete;
  const targetRoleConfig = ROLE_VISUAL_CONFIG[validationResult.recommendedRole] || ROLE_VISUAL_CONFIG.scout;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      className={`rounded-2xl border p-4 sm:p-5 relative overflow-hidden font-sans transition-all duration-300 ${
        isMismatch
          ? 'bg-gradient-to-r from-red-950/90 via-[#212A31] to-amber-950/80 border-red-500/50 shadow-[0_0_25px_rgba(239,68,68,0.25)]'
          : 'bg-gradient-to-r from-amber-950/80 via-[#212A31] to-[#212A31] border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
      }`}
    >
      {/* Top Banner Header */}
      <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl shrink-0 ${isMismatch ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'}`}>
            {isMismatch ? <AlertTriangle className="w-5 h-5 animate-pulse" /> : <AlertCircle className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${isMismatch ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
                {isMismatch ? 'ROLE MISMATCH DETECTED' : 'ROLE ADVISORY'}
              </span>
              <span className="text-[10px] font-mono text-slate-400">Automated Consistency Guard</span>
            </div>
            <h4 className="text-sm font-black uppercase text-white tracking-wide mt-0.5">
              {validationResult.title}
            </h4>
          </div>
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Explanation & Role Badges Comparison */}
      <div className="space-y-3 text-xs text-slate-200">
        <p className="leading-relaxed font-sans">
          {validationResult.explanation}
        </p>

        {/* Visual Badge Comparison Bar */}
        <div className="flex flex-wrap items-center gap-3 bg-black/40 p-3 rounded-xl border border-white/10 font-mono text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Your Active Role:</span>
            <span className={`px-2 py-0.5 rounded font-bold uppercase border ${roleConfig.pillBg} ${roleConfig.pillText}`}>
              {validationResult.userRole}
            </span>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-slate-500 hidden sm:block" />

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Content Type:</span>
            <span className="text-amber-300 font-bold underline decoration-amber-500/50">
              {validationResult.contentTypeName}
            </span>
          </div>

          {validationResult.disclaimerTag && (
            <div className="ml-auto flex items-center gap-1 text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded border border-red-500/30 font-bold">
              <Tag className="w-3 h-3" />
              <span>Flag: {validationResult.disclaimerTag}</span>
            </div>
          )}
        </div>

        {/* Actionable Resolution Choices */}
        <div className="pt-1">
          <span className="text-[10px] font-mono uppercase text-slate-400 block mb-2 font-bold">
            Choose Resolution Action:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {validationResult.suggestedActions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => onActionSelect(action.id)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between hover:scale-[1.02] ${
                  action.id === 'disclaimer'
                    ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500/40 text-red-200'
                    : action.id === 'relabel'
                    ? 'bg-[#E5B868]/10 hover:bg-[#E5B868]/20 border-blue-500/40 text-blue-200'
                    : 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/40 text-purple-200'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs">
                  <span>{action.label}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 opacity-80" />
                </div>
                <span className="text-[10px] opacity-75 font-mono mt-1 line-clamp-2">
                  {action.description}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
