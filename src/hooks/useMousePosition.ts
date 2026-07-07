import { useState, useEffect, useRef, useCallback } from 'react';

interface MousePosition {
  x: number;
  y: number;
  normalizedX: number;
  normalizedY: number;
}

export function useMousePosition() {
  const [position, setPosition] = useState<MousePosition>({
    x: 0,
    y: 0,
    normalizedX: 0,
    normalizedY: 0,
  });
  const rafRef = useRef<number>(0);
  const pendingRef = useRef<{ x: number; y: number } | null>(null);

  const updatePosition = useCallback(() => {
    if (pendingRef.current) {
      const { x, y } = pendingRef.current;
      setPosition({
        x,
        y,
        normalizedX: (x / window.innerWidth) * 2 - 1,
        normalizedY: (y / window.innerHeight) * 2 - 1,
      });
      pendingRef.current = null;
    }
    rafRef.current = 0;
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      pendingRef.current = { x: e.clientX, y: e.clientY };
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(updatePosition);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [updatePosition]);

  return position;
}
