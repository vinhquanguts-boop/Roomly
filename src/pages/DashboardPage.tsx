import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { ArrowRight, ImageIcon, LayoutDashboard, LockKeyhole, Share2 } from 'lucide-react';
import gsap from 'gsap';
import { LightCard } from '@/components/LightCard';
import { Navigation } from '@/components/Navigation';
import { PlanBadge } from '@/components/PlanBadge';
import { RetryBlock } from '@/components/RetryBlock';
import { SkeletonDesignCard } from '@/components/SkeletonDesignCard';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { usePlan } from '@/hooks/usePlan';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getDashboardDesigns, getProductFollowUps, submitProductFeedback, type DashboardDesign, type ProductFollowUp } from '@/lib/api';
import { PLAN_FEATURES } from '@/lib/api/subscription';
import { useAuth } from '@/lib/auth-state';
import { toast } from 'sonner';

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) return 'Saved locally';
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function DesignCard({ design }: { design: DashboardDesign }) {
  return (
    <LightCard className="overflow-hidden p-0">
      {design.thumbnailUrl ? (
        <img src={design.thumbnailUrl} alt="" className="aspect-[1.45/1] w-full bg-bg-inset object-cover" loading="lazy" />
      ) : (
        <div className="flex aspect-[1.45/1] items-center justify-center bg-bg-inset text-text-secondary">
          <ImageIcon className="size-8" aria-hidden="true" />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">{formatDate(design.savedAt)}</p>
            <h2 className="mt-2 line-clamp-2 text-xl font-bold">{design.styleDirection ?? 'Roomly design'}</h2>
          </div>
          <span className="rounded-full bg-secondary-muted px-3 py-1 text-xs font-bold text-text-secondary">
            {design.status}
          </span>
        </div>
        <p className="mt-3 text-sm font-semibold text-text-secondary">
          Budget {formatMoney(design.budget, design.currency)}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild className="h-10 rounded-md">
            <Link to={`/design/result/${design.id}`}>
              Open
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
          {design.sharedSlug ? (
            <Button asChild variant="outline" className="h-10 rounded-md">
              <Link to={`/explore/${design.sharedSlug}`}>
                Public page
                <Share2 className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </LightCard>
  );
}

function ProductFollowUpCard({ followUp, onLater }: { followUp: ProductFollowUp; onLater: () => void }) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');
  const feedbackMutation = useMutation({
    mutationFn: (input: { purchased: boolean; satisfied?: boolean }) =>
      submitProductFeedback({ clickId: followUp.clickId, notes, ...input }),
    onSuccess: async () => {
      setNotes('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['product-follow-ups'] }),
        queryClient.invalidateQueries({ queryKey: ['design'] }),
      ]);
      toast.success('Thanks - your feedback improves future Roomly recommendations.');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not save feedback.'),
  });

  return (
    <LightCard className="mt-6 border-accent/30 p-5 md:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Roomly follow-up</p>
      <div className="mt-3 flex items-start gap-3">
        {followUp.product.imageUrl ? (
          <img src={followUp.product.imageUrl} alt="" className="size-14 shrink-0 rounded-md object-cover" />
        ) : null}
        <div className="min-w-0">
          <h2 className="text-lg font-bold">Did you buy this?</h2>
          <p className="mt-1 text-sm leading-6 text-text-secondary">
            {followUp.product.title} from {followUp.product.retailer}. Your response is a Roomly catalog signal, not a public retailer review.
          </p>
        </div>
      </div>
      <Textarea
        className="mt-4 min-h-20 resize-y"
        maxLength={500}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Optional note (up to 500 characters)"
      />
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Button onClick={() => feedbackMutation.mutate({ purchased: true, satisfied: true })} disabled={feedbackMutation.isPending}>
          Yes, happy
        </Button>
        <Button variant="outline" onClick={() => feedbackMutation.mutate({ purchased: true, satisfied: false })} disabled={feedbackMutation.isPending}>
          Yes, disappointed
        </Button>
        <Button variant="outline" onClick={() => feedbackMutation.mutate({ purchased: false })} disabled={feedbackMutation.isPending}>
          Didn&apos;t buy
        </Button>
      </div>
      <Button variant="ghost" className="mt-2 h-8 px-2 text-xs text-text-secondary" onClick={onLater} disabled={feedbackMutation.isPending}>
        Later
      </Button>
    </LightCard>
  );
}

export function DashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const { plan, sub } = usePlan();
  const reduced = useReducedMotion();
  const gridRef = useRef<HTMLDivElement>(null);
  const designsQuery = useQuery({
    queryKey: ['dashboard-designs'],
    queryFn: getDashboardDesigns,
  });
  const followUpsQuery = useQuery({
    queryKey: ['product-follow-ups'],
    queryFn: getProductFollowUps,
  });
  const [deferredFollowUpId, setDeferredFollowUpId] = useState<string | null>(null);
  const followUp = followUpsQuery.data?.followUps.find((item) => item.clickId !== deferredFollowUpId) ?? null;

  const designs = designsQuery.data?.designs ?? [];

  useEffect(() => {
    if (!designs.length || !gridRef.current || reduced) return;
    const cards = gridRef.current.children;
    const tween = gsap.fromTo(
      cards,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.45, stagger: 0.07, ease: 'power3.out', clearProps: 'all' }
    );
    return () => {
      tween.kill();
    };
  }, [designs.length, reduced]);

  const usedThisMonth = sub?.designsUsedThisMonth ?? 0;
  const monthlyLimit = sub?.designLimitThisMonth ?? PLAN_FEATURES[plan].designsPerMonth;
  const [usagePct, setUsagePct] = useState(0);
  useEffect(() => {
    const target = monthlyLimit ? Math.min(Math.round((usedThisMonth / monthlyLimit) * 100), 100) : 0;
    const timeout = window.setTimeout(() => setUsagePct(target), 300);
    return () => window.clearTimeout(timeout);
  }, [usedThisMonth, monthlyLimit]);

  return (
    <>
      <Navigation />
      <main className="min-h-dvh bg-bg-base px-5 py-10 text-text-primary md:px-10">
        <div className="mx-auto max-w-[1120px]">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-accent">
                <LayoutDashboard className="size-4" aria-hidden="true" />
                Dashboard
              </p>
              <h1 className="mt-3 font-display text-[42px] font-semibold leading-tight md:text-[56px]">
                Saved room designs
              </h1>
              <p className="mt-3 max-w-[620px] text-base leading-7 text-text-secondary">
                {isAuthenticated
                  ? `Signed in as ${user?.email}.`
                  : 'Anonymous saves stay on this browser. Sign in to keep them across devices.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {!isAuthenticated ? (
                <Button asChild variant="outline" className="h-11 rounded-md">
                  <Link to="/auth/sign-in">
                    <LockKeyhole className="size-4" aria-hidden="true" />
                    Sign in
                  </Link>
                </Button>
              ) : null}
              <Button asChild className="h-11 rounded-md">
                <Link to="/design/upload">Create new design</Link>
              </Button>
            </div>
          </div>

          {isAuthenticated ? (
            <LightCard className="mt-6 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-text-primary">Designs this month</span>
                  <PlanBadge plan={plan} />
                </div>
                <span className="text-sm font-semibold text-text-secondary">
                  {usedThisMonth} / {monthlyLimit ?? '∞'}
                </span>
              </div>
              <Progress value={usagePct} className="mt-3 bg-secondary-muted" />
            </LightCard>
          ) : null}

          {followUp ? (
            <ProductFollowUpCard followUp={followUp} onLater={() => setDeferredFollowUpId(followUp.clickId)} />
          ) : null}

          <div aria-live="polite" aria-busy={designsQuery.isPending}>
            {designsQuery.isPending ? (
              <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading designs">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonDesignCard key={i} />
                ))}
              </div>
            ) : designsQuery.isError ? (
              <RetryBlock
                message="Could not load your designs."
                onRetry={() => designsQuery.refetch()}
                className="mt-8"
              />
            ) : designs.length === 0 ? (
              <LightCard className="mt-8 p-8 text-center">
                <h2 className="font-display text-[32px] font-semibold">No saved designs yet</h2>
                <p className="mx-auto mt-3 max-w-[460px] text-sm leading-6 text-text-secondary">
                  Finish a design result, then tap Save to make it appear here.
                </p>
                <Button asChild className="mt-6 h-11 rounded-md">
                  <Link to="/design/upload">Start a room design</Link>
                </Button>
              </LightCard>
            ) : (
              <div ref={gridRef} className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {designs.map((design) => (
                  <DesignCard key={design.id} design={design} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
