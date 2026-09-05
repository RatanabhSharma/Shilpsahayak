import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Automatically resets the scroll position to the top of the page (0, 0)
 * on every route transition in the Single Page Application.
 */
export function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    if (document.documentElement) {
      document.documentElement.scrollTo(0, 0);
    }
    if (document.body) {
      document.body.scrollTo(0, 0);
    }
  }, [pathname, search]);

  return null;
}
