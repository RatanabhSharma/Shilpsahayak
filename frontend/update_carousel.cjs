const fs = require('fs');
let code = fs.readFileSync('src/pages/storefront/Home.tsx', 'utf8');

// Replace setInterval with requestAnimationFrame
const oldEffect = `  useEffect(() => {
    if (!enableAutoplay || itemCount <= 1 || isHovered || isInteracting || !isInView) {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
      return;
    }

    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    autoplayTimerRef.current = setInterval(() => {
      if (isWindowScrollingRef.current) return;
      step(1);
    }, autoplayInterval);

    return () => {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
    };
  }, [enableAutoplay, itemCount, isHovered, isInteracting, isInView, autoplayInterval, step]);`;

const newEffect = `  const animationRef = useRef<number | null>(null);

  const animateScroll = useCallback(() => {
    const el = containerRef.current;
    if (el && !isWindowScrollingRef.current && !isNormalizingRef.current) {
      el.scrollLeft += 0.8; // smooth calm speed
    }
    animationRef.current = requestAnimationFrame(animateScroll);
  }, []);

  useEffect(() => {
    if (!enableAutoplay || itemCount <= 1 || isHovered || isInteracting || !isInView) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    animationRef.current = requestAnimationFrame(animateScroll);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [enableAutoplay, itemCount, isHovered, isInteracting, isInView, animateScroll]);`;

code = code.replace(oldEffect, newEffect);

// Replace button styles for the carousel controls from 'rounded-md' to 'rounded-full' 
// only on the specific buttons (featuredCarousel & categoryCarousel buttons)
code = code.replace(/<button([^>]*?onClick=\{featuredCarousel\.stepPrev\}[^>]*?)rounded-md/g, '<button$1rounded-full');
code = code.replace(/<button([^>]*?onClick=\{featuredCarousel\.stepNext\}[^>]*?)rounded-md/g, '<button$1rounded-full');
code = code.replace(/<button([^>]*?onClick=\{categoryCarousel\.stepPrev\}[^>]*?)rounded-md/g, '<button$1rounded-full');
code = code.replace(/<button([^>]*?onClick=\{categoryCarousel\.stepNext\}[^>]*?)rounded-md/g, '<button$1rounded-full');

fs.writeFileSync('src/pages/storefront/Home.tsx', code);
console.log('Done');
