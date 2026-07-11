import { useEffect, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from './useReducedMotion';

gsap.registerPlugin(ScrollTrigger);

interface UseScrollRevealOptions {
  /** CSS selector (relative to the container) for the elements to reveal. */
  selector?: string;
  /** Stagger between each revealed element, in seconds. */
  stagger?: number;
  /** Fraction of the element that must be visible before it reveals. */
  threshold?: number;
}

export function useScrollReveal(
  containerRef: RefObject<HTMLElement | null>,
  { selector = '[data-reveal]', stagger = 0.12, threshold = 0.15 }: UseScrollRevealOptions = {}
) {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const targets = container.querySelectorAll<HTMLElement>(selector);
    if (targets.length === 0) return;

    if (reducedMotion) {
      gsap.set(targets, { opacity: 1, y: 0 });
      return;
    }

    gsap.set(targets, { opacity: 0, y: 40 });
    const tweens: gsap.core.Tween[] = [];

    const batch = ScrollTrigger.batch(targets, {
      start: `top ${(1 - threshold) * 100}%`,
      onEnter: (batchTargets) => {
        tweens.push(gsap.to(batchTargets, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
          stagger,
          clearProps: 'all',
        }));
      },
    });

    return () => {
      batch.forEach((trigger) => trigger.kill());
      tweens.forEach((tween) => tween.kill());
    };
  }, [containerRef, selector, stagger, threshold, reducedMotion]);
}
