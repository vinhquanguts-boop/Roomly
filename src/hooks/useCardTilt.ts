import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useReducedMotion } from './useReducedMotion';

export function useCardTilt<T extends HTMLElement>(maxTilt = 6) {
  const ref = useRef<T>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;

    el.style.willChange = 'transform';
    el.style.transformStyle = 'preserve-3d';

    function onMove(e: MouseEvent) {
      const rect = el!.getBoundingClientRect();
      const xPct = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const yPct = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      gsap.to(el, {
        rotateY: xPct * maxTilt,
        rotateX: -yPct * maxTilt,
        transformPerspective: 800,
        duration: 0.3,
        ease: 'power2.out',
      });
    }

    function onLeave() {
      gsap.to(el, {
        rotateY: 0,
        rotateX: 0,
        transformPerspective: 800,
        duration: 0.5,
        ease: 'elastic.out(1, 0.5)',
        clearProps: 'all',
      });
    }

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);

    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
      gsap.killTweensOf(el);
    };
  }, [maxTilt, reduced]);

  return ref;
}
