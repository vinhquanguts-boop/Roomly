import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const TRAIL_COUNT = 6;

export function CursorTrail() {
  const dotsRef = useRef<HTMLDivElement[]>([]);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    if (window.matchMedia('(hover: none)').matches) return;

    const dots = dotsRef.current;
    let mouseX = 0;
    let mouseY = 0;

    function onMove(e: MouseEvent) {
      mouseX = e.clientX;
      mouseY = e.clientY;
    }

    window.addEventListener('mousemove', onMove);

    let raf: number;
    const positions = Array.from({ length: TRAIL_COUNT }, () => ({ x: 0, y: 0 }));

    function tick() {
      positions[0].x = mouseX;
      positions[0].y = mouseY;

      for (let i = 1; i < TRAIL_COUNT; i++) {
        positions[i].x += (positions[i - 1].x - positions[i].x) * 0.3;
        positions[i].y += (positions[i - 1].y - positions[i].y) * 0.3;
      }

      dots.forEach((dot, i) => {
        if (!dot) return;
        const opacity = 1 - i / TRAIL_COUNT;
        const size = 8 - i;
        dot.style.transform = `translate(${positions[i].x - size / 2}px, ${positions[i].y - size / 2}px)`;
        dot.style.opacity = String(opacity * 0.35);
        dot.style.width = `${size}px`;
        dot.style.height = `${size}px`;
      });

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  if (reduced) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden" aria-hidden="true">
      {Array.from({ length: TRAIL_COUNT }).map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            if (el) dotsRef.current[i] = el;
          }}
          className="absolute rounded-full bg-accent"
          style={{ width: 8, height: 8, opacity: 0, willChange: 'transform' }}
        />
      ))}
    </div>
  );
}
