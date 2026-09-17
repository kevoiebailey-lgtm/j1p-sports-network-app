import React from 'react';
import { motion } from 'motion/react';

interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  headerAction?: React.ReactNode;
  glow?: boolean;
}

export const BentoCard: React.FC<BentoCardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  icon,
  badge,
  headerAction,
  glow = false
}) => {
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className={`relative backdrop-blur-md bg-[#1E2630] border rounded-3xl p-5 sm:p-6 shadow-xl transition-all duration-300 group ${
        glow
          ? 'border-[#F59E0B] shadow-[0_0_25px_rgba(245,158,11,0.3)] hover:border-[#FBBF24] hover:shadow-[0_0_35px_rgba(245,158,11,0.5)]'
          : 'border-[#2D3748] hover:border-[#00F2FE]/70 hover:shadow-[0_8px_30px_rgba(0,242,254,0.15)]'
      } ${className}`}
    >
      {/* Background ambient lighting */}
      <div className="absolute -top-24 -right-24 w-56 h-56 bg-[#F59E0B]/5 rounded-full blur-3xl pointer-events-none group-hover:bg-[#F59E0B]/15 group-hover:scale-150 transition-all duration-500"></div>

      {(title || icon || headerAction) && (
        <div className="flex items-center justify-between gap-3 mb-5 border-b border-[#2D3748] pb-3.5">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="p-2.5 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] group-hover:border-[#F59E0B] transition-colors">
                {icon}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                {title && (
                  <h3 className="text-sm font-black tracking-widest text-white uppercase font-sans">
                    {title}
                  </h3>
                )}
                {badge}
              </div>
              {subtitle && (
                <p className="text-xs text-[#94A3B8] font-medium mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}

      {children}
    </motion.div>
  );
};

