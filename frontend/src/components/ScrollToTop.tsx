import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Intelligent Route Scroll Restoration
 * 
 * - Normal PUSH navigation (links, programmatic navigate):
 *   Resets scroll to (0, 0) instantly when pathname changes.
 * - Browser Back/Forward (POP navigation):
 *   Restores previous scroll position saved for that history entry.
 * - Anchor navigation (#hash):
 *   Scrolls to target element without overriding anchor position.
 * - Query/filter/state changes on same pathname:
 *   Preserves current scroll position.
 */
export function ScrollToTop() {
  const location = useLocation();
  const navType = useNavigationType();
  const prevPathRef = useRef(location.pathname);
  const scrollPositions = useRef<Map<string, number>>(new Map());

  // Disable browser's native automatic scroll restoration so it doesn't fight with client-side SPA routing
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  // Save scroll position for the current history entry whenever user scrolls or before navigating
  useEffect(() => {
    const handleScroll = () => {
      if (location.key) {
        scrollPositions.current.set(location.key, window.scrollY);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.key]);

  // Handle route transition scroll behavior
  useLayoutEffect(() => {
    const isPathChange = prevPathRef.current !== location.pathname;
    prevPathRef.current = location.pathname;

    // 1. Anchor link navigation (#anchor)
    if (location.hash) {
      const targetId = location.hash.replace(/^#/, '');
      const element = document.getElementById(targetId) || document.querySelector(location.hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      // If element isn't in DOM yet (e.g. async mount), try on next animation frame
      const timer = setTimeout(() => {
        const el = document.getElementById(targetId) || document.querySelector(location.hash);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 50);
      return () => clearTimeout(timer);
    }

    // 2. Query/filter parameter change ONLY on the same page
    if (!isPathChange) {
      // Do not reset scroll when only search/query/state changes on the same route
      return;
    }

    // 3. Browser Back/Forward (POP)
    if (navType === 'POP') {
      const savedScrollY = scrollPositions.current.get(location.key);
      if (typeof savedScrollY === 'number') {
        window.scrollTo({ top: savedScrollY, left: 0, behavior: 'instant' });
      }
      return;
    }

    // 4. Normal Internal Route Navigation (PUSH or REPLACE to a new path)
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) {
      document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
    if (document.body) {
      document.body.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [location.pathname, location.hash, location.key, navType]);

  return null;
}
