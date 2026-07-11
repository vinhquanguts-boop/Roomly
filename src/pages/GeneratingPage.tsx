import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Sparkles, XCircle } from 'lucide-react';
import gsap from 'gsap';
import { LightCard } from '@/components/LightCard';
import { StepProgress } from '@/components/StepProgress';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { usePageEntrance } from '@/hooks/usePageEntrance';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getDesign, type DesignStatus } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';

const STATUS_PROGRESS: Record<DesignStatus, number> = {
  pending: 25,
  plan_ready: 55,
  render_ready: 85,
  complete: 100,
  failed: 100,
};

const STEPS = [
  { status: 'pending', label: 'Designing your look' },
  { status: 'plan_ready', label: 'Checking budget fit' },
  { status: 'render_ready', label: 'Preparing your preview' },
  { status: 'complete', label: 'Ready to review' },
] as const;

export function GeneratingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const mainRef = useRef<HTMLElement>(null);
  const [displayProgress, setDisplayProgress] = useState(0);
  const progressObj = useRef({ val: 0 });

  usePageEntrance(mainRef);

  const designQuery = useQuery({
    queryKey: ['design', id],
    queryFn: async () => {
      if (!id) throw new Error('Missing design ID.');
      return getDesign(id);
    },
    enabled: Boolean(id),
    retry: false,
    refetchInterval: (query) => {
      const status = query.state.data?.design.status;
      return status === 'complete' || status === 'failed' || query.state.error ? false : 2000;
    },
  });

  const design = designQuery.data?.design;

  useEffect(() => {
    if (design?.status === 'complete') {
      trackEvent('plan_generated', { currency: design.currency });
      if (design.renderUrl) trackEvent('render_complete', { currency: design.currency });
      navigate(`/design/result/${design.id}`);
    }
  }, [design?.currency, design?.id, design?.renderUrl, design?.status, navigate]);

  const status = design?.status ?? 'pending';
  const progress = STATUS_PROGRESS[status];
  const hasLoadError = designQuery.isError || !id;
  const reduced = useReducedMotion();

  // Animate the progress bar value smoothly whenever the real progress changes
  useEffect(() => {
    const tween = gsap.to(progressObj.current, {
      val: progress,
      duration: 0.9,
      ease: 'power2.out',
      onUpdate: () => setDisplayProgress(Math.round(progressObj.current.val)),
    });
    return () => { tween.kill(); };
  }, [progress]);

  // Typewriter effect for the current step label
  const [displayedLabel, setDisplayedLabel] = useState('');
  const fullLabel = STEPS.find((step) => step.status === status)?.label ?? '';

  useEffect(() => {
    if (reduced) return;
    let i = 0;
    const interval = window.setInterval(() => {
      setDisplayedLabel(fullLabel.slice(0, i + 1));
      i += 1;
      if (i >= fullLabel.length) window.clearInterval(interval);
    }, 40);
    return () => window.clearInterval(interval);
  }, [fullLabel, reduced]);

  const typewriterLabel = reduced ? fullLabel : displayedLabel;

  return (
    <>
      <StepProgress current={4} />
      <main ref={mainRef} className="min-h-dvh bg-bg-base px-5 py-10 text-text-primary md:px-10">
      <LightCard className="mx-auto max-w-[640px] p-6 md:p-8">
        <span className="relative mx-auto flex size-16 items-center justify-center rounded-full bg-secondary-muted text-accent">
          {status === 'failed' || hasLoadError ? (
            <XCircle className="size-7" aria-hidden="true" />
          ) : (
            <>
              <Sparkles className="size-7 animate-[spin-slow_3s_linear_infinite]" aria-hidden="true" />
              <span className="orbit-dot" aria-hidden="true" />
              <span className="orbit-dot" aria-hidden="true" />
              <span className="orbit-dot" aria-hidden="true" />
            </>
          )}
        </span>
        <p className="mt-5 text-center text-overline text-accent">Generating</p>
        <h1 className="mt-3 text-center font-display text-[34px] font-semibold leading-tight md:text-[44px]">
          {status === 'failed' || hasLoadError ? 'Design generation stopped' : 'Creating your room design'}
        </h1>
        <p className="mx-auto mt-4 max-w-[500px] text-center text-sm leading-6 text-text-secondary">
          {status === 'failed' || hasLoadError
            ? design?.errorMessage ??
              (designQuery.error instanceof Error ? designQuery.error.message : 'The design pipeline failed. Check the backend logs and try again.')
            : design
              ? `Designing your ${design.currency} $${design.budget} room refresh. This takes about a minute.`
              : 'This can take a minute while Roomly writes the plan and renders a preview.'}
        </p>

        {!(status === 'failed' || hasLoadError) ? (
          <p className="mt-4 text-center text-sm font-semibold text-accent" aria-live="polite">
            {typewriterLabel}
            <span className="inline-block w-1" aria-hidden="true" />
          </p>
        ) : null}

        <div className="mt-8">
          <div className="relative overflow-hidden rounded-full">
            <Progress value={displayProgress} className="bg-secondary-muted" />
            {!(status === 'failed' || hasLoadError) ? (
              <div
                className="pointer-events-none absolute inset-0 rounded-full"
                style={{
                  animation: 'shimmer 1.8s ease-in-out infinite',
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)',
                }}
                aria-hidden="true"
              />
            ) : null}
          </div>
          <div className="relative mt-6">
            {/* Vertical connector line */}
            <div className="absolute bottom-4 left-[18px] top-4 w-px bg-border-subtle" aria-hidden="true" />

            <div className="space-y-3">
              {STEPS.map((step) => {
                const active = step.status === status;
                const done = progress >= STATUS_PROGRESS[step.status];

                return (
                  <div key={step.status} className="flex items-center gap-4">
                    <div
                      className={[
                        'relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border transition-all duration-500',
                        done
                          ? 'border-accent bg-accent text-white'
                          : active || designQuery.isPending
                            ? 'border-accent bg-bg-base text-accent ring-4 ring-accent/20'
                            : 'border-border-subtle bg-bg-elevated text-text-secondary',
                      ].join(' ')}
                    >
                      {done ? (
                        <CheckCircle2 className="size-4" aria-hidden="true" />
                      ) : active || designQuery.isPending ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <span className="size-2 rounded-full bg-border-strong" aria-hidden="true" />
                      )}
                    </div>
                    <span
                      className={[
                        'text-sm font-semibold transition-all duration-300',
                        done
                          ? 'text-text-secondary line-through decoration-accent/60 decoration-[1.5px]'
                          : active || designQuery.isPending
                            ? 'text-text-primary'
                            : 'text-text-secondary opacity-50',
                      ].join(' ')}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {status === 'failed' || hasLoadError ? (
          <div className="mt-7 flex justify-center">
            <Button asChild>
              <Link to="/">Return home</Link>
            </Button>
          </div>
        ) : null}
      </LightCard>
      </main>
    </>
  );
}
