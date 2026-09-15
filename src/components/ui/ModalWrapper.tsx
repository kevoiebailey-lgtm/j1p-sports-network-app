import React, { forwardRef } from 'react';

export interface ModalSheetProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  showHandle?: boolean;
}

export const ModalSheet = forwardRef<HTMLDivElement, ModalSheetProps>(
  ({ children, className = '', showHandle = true, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`relative w-full max-w-lg mx-auto my-auto max-h-[92dvh] overflow-y-auto no-scrollbar rounded-2xl sm:rounded-3xl z-50 ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ModalSheet.displayName = 'ModalSheet';

export default ModalSheet;
