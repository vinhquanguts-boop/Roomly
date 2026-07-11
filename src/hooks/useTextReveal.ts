import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useReducedMotion } from './useReducedMotion';

/**
 * Splits the text content of an element into word spans and animates them
 * sliding up from below on mount. The element must have plain text children only.
 */
export function useTextReveal(delay = 0) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;

    const originalHTML = el.innerHTML;
    const words = el.innerText.split(/(\s+)/);

    el.innerHTML = words
      .map((word) =>
        word.trim()
          ? `<span style="display:inline-block;overflow:hidden;vertical-align:bottom"><span style="display:inline-block;transform:translateY(100%);opacity:0">${word}</span></span>`
          : word
      )
      .join('');

    const innerSpans = el.querySelectorAll<HTMLElement>('span > span');

    const tween = gsap.to(innerSpans, {
      y: 0,
      opacity: 1,
      duration: 0.6,
      stagger: 0.06,
      ease: 'power3.out',
      delay,
      onComplete: () => {
        el.innerHTML = originalHTML;
      },
    });

    return () => {
      tween.kill();
      el.innerHTML = originalHTML;
    };
  }, [delay, reduced]);

  return ref;
}
