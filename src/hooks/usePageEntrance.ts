import { useEffect, useRef, type RefObject } from 'react';
import gsap from 'gsap';
import { useReducedMotion } from './useReducedMotion';

/**
 * Plays a single fade-up entrance animation on mount for a page-level element.
 * Respects prefers-reduced-motion — if reduced, the element is made visible immediately.
 */
export function usePageEntrance(ref: RefObject<HTMLElement | null>) {
  const reduced = useReducedMotion();
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (hasAnimated.current && !reduced) return;

    if (reduced) {
      gsap.set(el, { opacity: 1, y: 0 });
      hasAnimated.current = true;
      return;
    }

    // Keep the page readable before GSAP receives a frame. This is important
    // during Strict Mode effect replays and when animation frames are paused.
    gsap.set(el, { y: 18 });
    const tween = gsap.to(el, {
      y: 0,
      duration: 0.55,
      ease: 'power3.out',
      clearProps: 'transform',
      onComplete: () => {
        hasAnimated.current = true;
      },
    });

    return () => {
      tween.kill();
      // Strict Mode runs an effect cleanup before replaying the effect in development.
      // A killed tween otherwise leaves the page at its hidden start state.
      gsap.set(el, { clearProps: 'transform' });
    };
  }, [ref, reduced]);
}
