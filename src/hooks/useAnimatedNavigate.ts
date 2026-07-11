import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import gsap from 'gsap';
import { useReducedMotion } from './useReducedMotion';

export function useAnimatedNavigate() {
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  return useCallback(
    (to: string) => {
      if (reduced) {
        navigate(to);
        return;
      }
      gsap.to('body', {
        opacity: 0,
        duration: 0.22,
        ease: 'power2.in',
        onComplete: () => {
          navigate(to);
          gsap.set('body', { opacity: 1 });
        },
      });
    },
    [navigate, reduced]
  );
}
