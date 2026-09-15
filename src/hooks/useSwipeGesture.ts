import { useRef, useState, useEffect } from 'react';

export interface SwipeGestureOptions<T extends string> {
  categories: T[];
  activeCategory: T;
  onCategoryChange: (newCategory: T) => void;
  threshold?: number; // Minimum pixel drag/swipe distance (default: 50px)
  enableKeyboardArrows?: boolean;
}

export function useSwipeGesture<T extends string>({
  categories,
  activeCategory,
  onCategoryChange,
  threshold = 120,
  enableKeyboardArrows = true
}: SwipeGestureOptions<T>) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);
  const isCanceled = useRef<boolean>(false);

  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [swipeHint, setSwipeHint] = useState<string | null>(null);

  const currentIndex = categories.indexOf(activeCategory);

  const goToNextCategory = () => {
    if (categories.length === 0) return;
    const nextIdx = (currentIndex + 1) % categories.length;
    const nextCat = categories[nextIdx];
    onCategoryChange(nextCat);
    triggerSwipeFeedback(`Switched: ${nextCat}`);
  };

  const goToPrevCategory = () => {
    if (categories.length === 0) return;
    const prevIdx = (currentIndex - 1 + categories.length) % categories.length;
    const prevCat = categories[prevIdx];
    onCategoryChange(prevCat);
    triggerSwipeFeedback(`Switched: ${prevCat}`);
  };

  const triggerSwipeFeedback = (message: string) => {
    setSwipeHint(message);
    setTimeout(() => {
      setSwipeHint(null);
    }, 1500);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!e.touches || e.touches.length !== 1) return;
    
    // Ignore touches starting on interactive elements
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.closest('button') ||
        target.closest('a') ||
        target.closest('input') ||
        target.closest('textarea') ||
        target.closest('select') ||
        target.closest('video') ||
        target.closest('iframe') ||
        target.closest('.interactive-control'))
    ) {
      isCanceled.current = true;
      return;
    }

    const clientX = e.touches[0].clientX;
    const clientY = e.touches[0].clientY;
    
    touchStartX.current = clientX;
    touchStartY.current = clientY;
    touchEndX.current = clientX;
    touchEndY.current = clientY;
    isCanceled.current = false;
    setSwipeDirection(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isCanceled.current || touchStartX.current === null || touchStartY.current === null) return;
    if (!e.touches || e.touches.length !== 1) return;

    const clientX = e.touches[0].clientX;
    const clientY = e.touches[0].clientY;

    touchEndX.current = clientX;
    touchEndY.current = clientY;

    const diffX = touchEndX.current - touchStartX.current;
    const diffY = touchEndY.current - touchStartY.current;

    // If vertical movement is significant (> 35px), cancel swipe so vertical scroll works smoothly
    if (Math.abs(diffY) > 35 && Math.abs(diffY) > Math.abs(diffX) * 0.8) {
      isCanceled.current = true;
      setSwipeDirection(null);
      return;
    }

    // Detect horizontal dominant motion with strict threshold
    if (Math.abs(diffX) > 60 && Math.abs(diffX) > Math.abs(diffY) * 2.2) {
      if (diffX < 0) {
        setSwipeDirection('left');
      } else {
        setSwipeDirection('right');
      }
    } else {
      setSwipeDirection(null);
    }
  };

  const handleTouchEnd = () => {
    if (
      isCanceled.current ||
      touchStartX.current === null ||
      touchEndX.current === null ||
      touchStartY.current === null ||
      touchEndY.current === null
    ) {
      touchStartX.current = null;
      touchStartY.current = null;
      touchEndX.current = null;
      touchEndY.current = null;
      isCanceled.current = false;
      setSwipeDirection(null);
      return;
    }

    const diffX = touchEndX.current - touchStartX.current;
    const diffY = touchEndY.current - touchStartY.current;

    // Must exceed deliberate threshold (e.g. 110px) and be strictly horizontal
    if (Math.abs(diffX) >= threshold && Math.abs(diffX) > Math.abs(diffY) * 2.5 && Math.abs(diffY) < 50) {
      if (diffX < 0) {
        // Swiped Left -> Advance to next category
        goToNextCategory();
      } else {
        // Swiped Right -> Return to previous category
        goToPrevCategory();
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
    touchEndX.current = null;
    touchEndY.current = null;
    isCanceled.current = false;
    setSwipeDirection(null);
  };

  // Optional keyboard navigation (Left / Right arrow keys)
  useEffect(() => {
    if (!enableKeyboardArrows) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept arrow keys if user is typing inside input or textarea
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'ArrowRight') {
        goToNextCategory();
      } else if (e.key === 'ArrowLeft') {
        goToPrevCategory();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, categories, enableKeyboardArrows]);

  return {
    bindSwipeProps: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    swipeDirection,
    swipeHint,
    goToNextCategory,
    goToPrevCategory,
    currentIndex,
    totalCategories: categories.length
  };
}
