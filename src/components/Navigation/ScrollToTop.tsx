import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop component
 * Ensures that whenever a route or tab changes, the window and content containers
 * immediately reset their scroll position to the very top (0, 0).
 * Prevents the "unlimited scroll" or landing at the bottom of a tab when navigating.
 */
export const ScrollToTop: React.FC = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // Reset window scroll position
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' as ScrollBehavior
    });

    // Reset document root elements
    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }
    if (document.body) {
      document.body.scrollTop = 0;
    }

    // Reset main layout container if present
    const swipeableContainer = document.getElementById('main-swipeable-content');
    if (swipeableContainer) {
      swipeableContainer.scrollTop = 0;
    }
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.scrollTop = 0;
    }
  }, [pathname, search]);

  return null;
};

export default ScrollToTop;
