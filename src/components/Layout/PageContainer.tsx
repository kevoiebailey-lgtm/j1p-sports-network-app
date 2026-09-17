import React, { ReactNode } from 'react';

export interface PageContainerProps {
  children: ReactNode;
  maxWidth?: 'max-w-4xl' | 'max-w-6xl' | 'max-w-7xl' | 'max-w-full';
  className?: string;
}

export function PageContainer({
  children,
  maxWidth = 'max-w-7xl',
  className = '',
}: PageContainerProps) {
  return (
    <main
      className={`min-h-[100dvh] w-full bg-[#08090C] text-white flex flex-col justify-start items-center pt-24 md:pt-28 pb-20 md:pb-12 px-4 sm:px-6 lg:px-8 ${className}`}
    >
      <div className={`w-full ${maxWidth} mx-auto flex flex-col gap-6`}>
        {children}
      </div>
    </main>
  );
}

export default PageContainer;
