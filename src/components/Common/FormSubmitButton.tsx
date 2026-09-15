import React from 'react';
import { Loader2, CheckCircle2, Sparkles } from 'lucide-react';

export interface FormSubmitButtonProps {
  isSubmitting: boolean;
  submitSuccess?: boolean;
  label?: string;
  loadingLabel?: string;
  successLabel?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  type?: 'submit' | 'button';
  onClick?: () => void;
  className?: string;
  variant?: 'emerald' | 'rose' | 'cyan' | 'slate';
}

export const FormSubmitButton: React.FC<FormSubmitButtonProps> = ({
  isSubmitting,
  submitSuccess = false,
  label = 'Submit Form',
  loadingLabel = 'Processing Submission...',
  successLabel = 'Submitted Successfully!',
  icon = <Sparkles className="w-4 h-4" />,
  disabled = false,
  type = 'submit',
  onClick,
  className = '',
  variant = 'emerald'
}) => {
  const isButtonDisabled = isSubmitting || disabled || submitSuccess;

  const variantStyles = {
    emerald: 'bg-red-600 hover:bg-red-500 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.5)] border-red-500',
    rose: 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(225,29,72,0.6)] border-rose-500',
    cyan: 'bg-slate-700 hover:bg-slate-600 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.5)] border-cyan-400',
    slate: 'bg-slate-800 hover:bg-slate-700 text-white shadow border-slate-700'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isButtonDisabled}
      className={`px-6 py-3 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2.5 border select-none ${
        isButtonDisabled
          ? 'opacity-70 cursor-not-allowed bg-slate-800 text-slate-400 border-slate-700/80 shadow-none'
          : `${variantStyles[variant]} cursor-pointer active:scale-95`
      } ${className}`}
    >
      {isSubmitting ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-red-500" />
          <span className="font-mono text-red-500 animate-pulse">{loadingLabel}</span>
        </>
      ) : submitSuccess ? (
        <>
          <CheckCircle2 className="w-4 h-4 text-red-500 animate-bounce" />
          <span className="font-mono text-red-500">{successLabel}</span>
        </>
      ) : (
        <>
          {icon}
          <span>{label}</span>
        </>
      )}
    </button>
  );
};
