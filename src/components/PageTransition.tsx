import { useEffect, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import gsap from 'gsap';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const reduced = useReducedMotion();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    if (reduced) {
      gsap.set(el, { opacity: 1 });
      return;
    }
    const tween = gsap.fromTo(el, { y: 8 }, { y: 0, duration: 0.3, ease: 'power2.out', clearProps: 'transform' });
    return () => {
      tween.kill();
      gsap.set(el, { clearProps: 'transform' });
    };
  }, [location.pathname, reduced]);

  return <div ref={wrapperRef}>{children}</div>;
}
