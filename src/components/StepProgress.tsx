import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface StepProgressProps {
  current: 1 | 2 | 3 | 4 | 5;
}

const STEPS = [
  { n: 1, label: 'Upload' },
  { n: 2, label: 'Setup' },
  { n: 3, label: 'Quiz' },
  { n: 4, label: 'Generating' },
  { n: 5, label: 'Result' },
];

// The component remounts on every route change, so the previous step lives at
// module scope; it only needs to survive within the SPA session.
let lastSeenStep = 0;

export function StepProgress({ current }: StepProgressProps) {
  const stepRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const reduced = useReducedMotion();

  useEffect(() => {
    const prev = lastSeenStep;
    lastSeenStep = current;
    if (reduced || current !== prev + 1) return;
    const completedIcon = stepRefs.current[prev - 1];
    if (!completedIcon) return;
    const tween = gsap.fromTo(
      completedIcon,
      { scale: 1 },
      { scale: 1.3, duration: 0.18, yoyo: true, repeat: 1, ease: 'back.out(2)', clearProps: 'all' }
    );
    return () => {
      tween.kill();
    };
  }, [current, reduced]);

  return (
    <nav
      aria-label="Design progress"
      className="h-[44px] border-b border-border-subtle bg-bg-elevated md:h-[52px]"
    >
      <div className="mx-auto flex h-full max-w-[960px] items-center justify-between px-5 md:px-10">
        {STEPS.map((step, index) => {
          const isCompleted = step.n < current;
          const isCurrent = step.n === current;

          return (
            <div key={step.n} className="flex flex-1 items-center last:flex-none">
              <div className="flex shrink-0 items-center gap-2">
                <span
                  ref={(node) => {
                    stepRefs.current[index] = node;
                  }}
                  className={[
                    'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    isCompleted
                      ? 'bg-accent text-white'
                      : isCurrent
                        ? 'border-2 border-accent bg-bg-base text-accent'
                        : 'border border-border-subtle bg-bg-elevated text-text-secondary',
                  ].join(' ')}
                >
                  {isCompleted ? '✓' : step.n}
                </span>
                <span
                  className={[
                    'hidden text-[11px] font-semibold sm:block',
                    isCompleted ? 'text-accent' : isCurrent ? 'text-text-primary' : 'text-text-secondary',
                  ].join(' ')}
                >
                  {step.label}
                </span>
              </div>

              {index < STEPS.length - 1 ? (
                <div
                  className={['mx-2 h-px flex-1', isCompleted ? 'bg-accent' : 'bg-border-subtle'].join(' ')}
                  aria-hidden="true"
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
