import { useEffect, useRef, useState, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from './useReducedMotion';

gsap.registerPlugin(ScrollTrigger);

export function useCountUp(target: number, decimals = 0): [number, RefObject<HTMLSpanElement | null>] {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(reduced ? target : 0);

  useEffect(() => {
    if (reduced || !ref.current) return;

    const proxy = { val: 0 };
    const tween = gsap.to(proxy, {
      val: target,
      duration: 1.4,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: ref.current,
        start: 'top 85%',
        once: true,
      },
      onUpdate: () => {
        setValue(Number(proxy.val.toFixed(decimals)));
      },
    });

    return () => {
      tween.kill();
      tween.scrollTrigger?.kill();
    };
  }, [target, decimals, reduced]);

  return [reduced ? target : value, ref];
}
