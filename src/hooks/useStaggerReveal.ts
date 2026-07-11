import { useEffect, type RefObject } from 'react';
import gsap from 'gsap';
import { useReducedMotion } from './useReducedMotion';

export function useStaggerReveal(
  containerRef: RefObject<HTMLElement | null>,
  {
    selector = '[data-stagger]',
    stagger = 0.08,
    delay = 0,
    y = 20,
  }: {
    selector?: string;
    stagger?: number;
    delay?: number;
    y?: number;
  } = {}
) {
  const reduced = useReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const targets = container.querySelectorAll<HTMLElement>(selector);
    if (!targets.length) return;

    if (reduced) {
      gsap.set(targets, { opacity: 1, y: 0 });
      return;
    }

    // Do not hide content before the first frame. A paused or cancelled tween
    // must leave cards usable rather than blank.
    gsap.set(targets, { y });

    const tween = gsap.to(targets, {
      y: 0,
      duration: 0.5,
      ease: 'power3.out',
      stagger,
      delay,
      clearProps: 'transform',
    });

    return () => {
      tween.kill();
      gsap.set(targets, { clearProps: 'transform' });
    };
  }, [containerRef, selector, stagger, delay, y, reduced]);
}
