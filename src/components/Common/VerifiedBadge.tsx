import React from 'react';
import { Check, ShieldCheck, Award, Zap, Film, GraduationCap } from 'lucide-react';

export type VerifiedBadgeType = 'verified' | 'scout' | 'gpa' | 'dash' | 'tape' | 'combine';

export interface VerifiedBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showTooltip?: boolean;
  type?: VerifiedBadgeType;
  customText?: string;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ 
  className = '', 
  size = 'md',
  showLabel = false,
  type = 'verified',
  customText
}) => {
  const sizeClasses = {
    sm: 'w-3.5 h-3.5 text-[9px]',
    md: 'w-4 h-4 text-[10px]',
    lg: 'w-5 h-5 text-xs'
  };

  const iconSizes = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5'
  };

  if (type === 'gpa') {
    return (
      <span 
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#10B981]/15 border border-[#10B981]/40 text-[#10B981] font-mono font-bold text-[10px] shadow-[0_0_10px_rgba(16,185,129,0.25)] ${className}`}
        title="Verified Academic GPA on File"
      >
        <GraduationCap className="w-3 h-3 text-[#10B981]" />
        <span>{customText || 'Verified GPA'}</span>
      </span>
    );
  }

  if (type === 'dash') {
    return (
      <span 
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#00F2FE]/15 border border-[#00F2FE]/40 text-[#00F2FE] font-mono font-bold text-[10px] shadow-[0_0_10px_rgba(0,242,254,0.25)] ${className}`}
        title="Laser-Timed Combine 40-Yard Dash"
      >
        <Zap className="w-3 h-3 text-[#00F2FE]" />
        <span>{customText || 'Verified 40-YD'}</span>
      </span>
    );
  }

  if (type === 'tape') {
    return (
      <span 
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F59E0B]/15 border border-[#F59E0B]/40 text-[#F59E0B] font-mono font-bold text-[10px] shadow-[0_0_10px_rgba(245,158,11,0.25)] ${className}`}
        title="Coach-Reviewed & Verified Film"
      >
        <Film className="w-3 h-3 text-[#F59E0B]" />
        <span>{customText || 'Coach-Reviewed Tape'}</span>
      </span>
    );
  }

  // Emerald Green Scout Checkmark
  const isScout = type === 'scout';

  return (
    <span 
      className={`inline-flex items-center gap-1 ${className}`} 
      title={isScout ? 'Scout-Verified Profile' : 'Verified Just1Play Athlete/Organization'}
    >
      <span className={`inline-flex items-center justify-center rounded-full ${
        isScout ? 'bg-[#10B981] text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.5)]' : 'bg-[#10B981] text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
      } font-black ${sizeClasses[size]}`}>
        <Check className={`${iconSizes[size]} stroke-[3.5]`} />
      </span>
      {showLabel && (
        <span className="text-[10px] font-black uppercase text-[#10B981] tracking-wider">
          {customText || (isScout ? 'Scout Verified' : 'Verified')}
        </span>
      )}
    </span>
  );
};

