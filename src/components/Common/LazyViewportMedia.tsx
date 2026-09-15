import React, { useState, useEffect, useRef } from 'react';

interface LazyViewportMediaProps {
  children: React.ReactNode;
  placeholderHeight?: string;
  className?: string;
  threshold?: number;
  rootMargin?: string;
}

/**
 * LazyViewportMedia - Intersection Observer component that defers 
 * rendering media (videos, iframe embeds, heavy image carousels) 
 * until the element enters or approaches the viewport.
 */
export const LazyViewportMedia: React.FC<LazyViewportMediaProps> = ({
  children,
  placeholderHeight = '220px',
  className = '',
  threshold = 0.05,
  rootMargin = '150px 0px' // Preload 150px before entering viewport
}) => {
  const [isInViewport, setIsInViewport] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    if (typeof IntersectionObserver === 'undefined') {
      setIsInViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInViewport(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin]);

  return (
    <div ref={containerRef} className={className}>
      {isInViewport ? (
        children
      ) : (
        <div
          style={{ minHeight: placeholderHeight }}
          className="w-full rounded-2xl bg-[#212A31]/60 border border-slate-800/80 animate-pulse flex flex-col items-center justify-center p-6 text-slate-500 text-xs font-mono gap-2"
        >
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700/60 flex items-center justify-center text-red-500/70">
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <span>Loading media preview...</span>
        </div>
      )}
    </div>
  );
};

export default LazyViewportMedia;
