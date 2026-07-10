import { useEffect, type RefObject } from 'react';
import gsap from 'gsap';
import { useReducedMotion } from './useReducedMotion';

/**
 * Plays a single fade-up entrance animation on mount for a page-level element.
 * Respects prefers-reduced-motion — if reduced, the element is made visible immediately.
 */
export function usePageEntrance(ref: RefObject<HTMLElement | null>) {
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (reduced) {
      gsap.set(el, { opacity: 1, y: 0 });
      return;
    }

    const tween = gsap.fromTo(
      el,
      { opacity: 0, y: 18 },
      {
        opacity: 1,
        y: 0,
        duration: 0.55,
        ease: 'power3.out',
        clearProps: 'all',
      }
    );

    return () => { tween.kill(); };
  }, [ref, reduced]);
}
