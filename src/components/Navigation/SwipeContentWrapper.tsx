import React, { useRef } from 'react';
import { usePrimaryNavigation } from '../../hooks/usePrimaryNavigation';

interface SwipeContentWrapperProps {
  children: React.ReactNode;
  className?: string;
  enabled?: boolean;
}

export const SwipeContentWrapper: React.FC<SwipeContentWrapperProps> = ({
  children,
  className = '',
  enabled = true
}) => {
  const { goToNextTab, goToPrevTab, activeTabIndex, primaryTabs } = usePrimaryNavigation();
  
  const touchStartRef = useRef<{
    x: number;
    y: number;
    time: number;
    isIgnored: boolean;
  }>({
    x: 0,
    y: 0,
    time: 0,
    isIgnored: false
  });

  // Helper to determine if the touch started on an interactive element or horizontal scroller
  const shouldIgnoreSwipe = (target: EventTarget | null): boolean => {
    if (!target || !(target instanceof HTMLElement)) return false;

    // Check tag names
    const tagName = target.tagName.toLowerCase();
    if (['input', 'textarea', 'select', 'canvas', 'video'].includes(tagName)) {
      return true;
    }

    // Check custom data attribute
    if (target.closest('[data-no-swipe="true"]') || target.closest('.no-swipe')) {
      return true;
    }

    // Check if within a horizontally scrollable container
    let current: HTMLElement | null = target;
    while (current && current !== document.body) {
      const style = window.getComputedStyle(current);
      const isScrollable = (style.overflowX === 'auto' || style.overflowX === 'scroll') && current.scrollWidth > current.clientWidth + 10;
      if (isScrollable) {
        return true;
      }
      current = current.parentElement;
    }

    return false;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!enabled || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const isIgnored = shouldIgnoreSwipe(e.target);

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
      isIgnored
    };
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!enabled || touchStartRef.current.isIgnored || e.changedTouches.length !== 1) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const elapsed = Date.now() - touchStartRef.current.time;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const velocityX = absX / Math.max(elapsed, 1);

    // Criteria: distinctly horizontal (absX > 1.4 * absY), not a long hold (elapsed < 650ms), and either enough distance or flick velocity
    const isFlick = velocityX > 0.45 && absX > 35;
    const isDrag = absX > 60;
    const isHorizontal = absX > absY * 1.35;

    if (isHorizontal && elapsed < 650 && (isFlick || isDrag)) {
      if (deltaX < 0) {
        // Swiped Left -> Move to Next Tab
        goToNextTab();
      } else {
        // Swiped Right -> Move to Prev Tab
        goToPrevTab();
      }
    }
  };

  return (
    <div
      id="main-swipeable-content"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`relative w-full ${className}`}
      data-active-tab={primaryTabs[activeTabIndex]?.id || 'unknown'}
    >
      {children}
    </div>
  );
};

export default SwipeContentWrapper;
