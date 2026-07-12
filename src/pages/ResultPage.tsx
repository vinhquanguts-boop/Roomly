import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Bookmark,
  ExternalLink,
  MessageCircle,
  PackageSearch,
  Palette,
  ReceiptText,
  Share2,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
} from 'lucide-react';
import gsap from 'gsap';
import { toast } from 'sonner';
import { EmptyState } from '@/components/EmptyState';
import { LightCard } from '@/components/LightCard';
import { LoadingButton } from '@/components/LoadingButton';
import { PlanGate } from '@/components/PlanGate';
import { SkeletonProductCard } from '@/components/SkeletonProductCard';
import { StepProgress } from '@/components/StepProgress';
import { TrustBadge } from '@/components/TrustBadge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChatPanel } from '@/features/chat';
import { useCountUp } from '@/hooks/useCountUp';
import { usePlan } from '@/hooks/usePlan';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { createCheckoutSession } from '@/lib/api/subscription';
import {
  getDesign,
  productClickUrl,
  publishDesign,
  saveDesign,
  type ChatAction,
  type ShoppingItem,
} from '@/lib/api';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function budgetTone(total: number, budget: number): string {
  if (total <= budget * 0.9) return 'bg-success';
  if (total <= budget) return 'bg-accent';
  return 'bg-destructive';
}

function ShoppingCard({
  designId,
  item,
  currency,
  highlighted,
}: {
  designId: string;
  item: ShoppingItem;
  currency: string;
  highlighted: boolean;
}) {
  const product = item.product;
  const [imageFailed, setImageFailed] = useState(false);

  if (!product) return null;

  return (
    <LightCard
      data-position={item.position}
      className={cn(
        'group overflow-hidden p-0 transition-[box-shadow,border-color] duration-500',
        highlighted ? 'border-accent shadow-[0_0_0_3px_rgba(199,104,74,0.20)]' : ''
      )}
    >
      {product.imageUrl && !imageFailed ? (
        <img
          src={product.imageUrl}
          alt={product.title}
          className="aspect-[1.2/1] w-full bg-secondary-muted/60 object-cover transition-transform duration-300 ease-out group-hover:scale-105"
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="flex aspect-[1.2/1] items-center justify-center bg-secondary-muted/40 text-accent">
          <PackageSearch className="size-5" aria-hidden="true" />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <span className="rounded-full bg-secondary-muted px-2 py-0.5 text-[10px] font-bold text-text-primary">
            {product.retailer}
          </span>
          <span className="text-xs font-bold text-success">{formatMoney(product.price, currency)}</span>
        </div>
        <h3 className="mt-2 line-clamp-2 text-sm font-bold leading-snug">{product.title}</h3>
        <div className="mt-2">
          <TrustBadge trust={product.trust} soldCount={product.soldCount} rating={product.rating} />
        </div>
        {product.deliveryEstimate ? (
          <div className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-text-secondary">
            <Truck className="size-3 shrink-0 text-accent" aria-hidden="true" />
            <span className="truncate">{product.deliveryEstimate}</span>
          </div>
        ) : null}
        <Button asChild className="mt-3 h-8 w-full rounded-md text-xs shadow-none">
          <a href={productClickUrl(designId, product.id)} target="_blank" rel="noreferrer" onClick={() => trackEvent('product_click', { retailer: product.retailer })}>
            View at {product.retailer}
            <ExternalLink className="size-3" aria-hidden="true" />
          </a>
        </Button>
      </div>
    </LightCard>
  );
}

export function ResultPage() {
  const { id } = useParams();
  const heroRef = useRef<HTMLDivElement>(null);
  const leftColRef = useRef<HTMLDivElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);
  const reduced = useReducedMotion();
  const [chatOpen, setChatOpen] = useState(false);
  const [highlightedPosition, setHighlightedPosition] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { isPlus } = usePlan();

  const designQuery = useQuery({
    queryKey: ['design', id],
    queryFn: async () => {
      if (!id) throw new Error('Missing design ID.');
      return getDesign(id);
    },
    enabled: Boolean(id),
    retry: false,
  });

  const design = designQuery.data?.design;
  const plan = design?.designPlan;
  const shoppingItems = (design?.items ?? []).filter((item) => item.product);
  const shoppingTotal = shoppingItems.reduce(
    (total, item) => total + (item.priceAtGeneration ?? item.product?.price ?? 0),
    0
  );
  const budgetPct = design ? Math.min(Math.round((shoppingTotal / design.budget) * 100), 130) : 0;
  const [countedBudgetPct, budgetPctRef] = useCountUp(budgetPct);

  const [animatedBudgetPct, setAnimatedBudgetPct] = useState(0);
  useEffect(() => {
    const timeout = window.setTimeout(() => setAnimatedBudgetPct(budgetPct), 300);
    return () => window.clearTimeout(timeout);
  }, [budgetPct]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!design) throw new Error('Design is not ready to save.');
      return saveDesign(design.id);
    },
    onSuccess: async (result) => {
      queryClient.setQueryData(['design', id], result);
      await queryClient.invalidateQueries({ queryKey: ['dashboard-designs'] });
      toast.success('Design saved.');
      trackEvent('design_saved');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Save failed.');
    },
  });

  const shareMutation = useMutation({
    mutationFn: async () => {
      if (!design) throw new Error('Design is not ready to share.');
      return publishDesign(design.id);
    },
    onSuccess: async (result) => {
      queryClient.setQueryData(['design', id], { design: result.design });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dashboard-designs'] }),
        queryClient.invalidateQueries({ queryKey: ['public-designs'] }),
      ]);
      const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
      const shareUrl = isLocalHost ? result.previewUrl : result.publicUrl;
      await navigator.clipboard?.writeText(shareUrl).catch(() => undefined);
      toast.success('Public Roomly link copied.');
      trackEvent('design_shared');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Share failed.');
    },
  });

  const planCheckoutMutation = useMutation({
    mutationFn: () => createCheckoutSession('plus'),
    onSuccess: ({ checkoutUrl }) => {
      window.location.href = checkoutUrl;
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Could not start checkout.');
    },
  });

  function handleRefineClick() {
    if (!isPlus) {
      toast.info('Chat refinement is a Roomly Plus feature.');
      planCheckoutMutation.mutate();
      return;
    }
    setChatOpen(true);
  }

  function handleShareClick() {
    if (!isPlus) {
      toast.info('Sharing your design is a Roomly Plus feature.');
      planCheckoutMutation.mutate();
      return;
    }
    shareMutation.mutate();
  }

  function handleChatAction(_action: ChatAction, changedPosition: number | null) {
    if (changedPosition === null) return;
    setHighlightedPosition(changedPosition);
    window.setTimeout(() => setHighlightedPosition(null), 2400);
  }

  useEffect(() => {
    if (highlightedPosition === null || reduced) return;
    const card = document.querySelector(`[data-position="${highlightedPosition}"]`);
    if (!card) return;
    gsap.fromTo(card, { scale: 1.03 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)', clearProps: 'all' });
  }, [highlightedPosition, reduced]);

  useEffect(() => {
    if (reduced || !design || !plan || hasAnimated.current) return;
    if (!heroRef.current || !leftColRef.current || !rightColRef.current) return;

    const rightColChildren = Array.from(rightColRef.current.children);
    const allTargets = [heroRef.current, leftColRef.current, ...rightColChildren];

    const tl = gsap.timeline({
      defaults: { ease: 'power3.out' },
      onComplete: () => { hasAnimated.current = true; },
    });

    tl
      .fromTo(
        heroRef.current,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.6, clearProps: 'all' },
        0
      )
      .fromTo(
        leftColRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.55, clearProps: 'all' },
        0.2
      )
      .fromTo(
        rightColChildren,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.45, stagger: 0.07, clearProps: 'all' },
        0.28
      );

    const swatches = leftColRef.current?.querySelectorAll('[data-swatch]');
    if (swatches?.length) {
      tl.fromTo(
        swatches,
        { scale: 0.5, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.35, stagger: 0.06, ease: 'back.out(2)', clearProps: 'all' },
        0.55
      );
    }

    return () => {
      tl.kill();
      if (!hasAnimated.current) gsap.set(allTargets, { clearProps: 'all' });
    };
  }, [reduced, design, plan]);

  if (designQuery.isPending) {
    return (
      <>
        <StepProgress current={5} />
        <main className="min-h-dvh bg-bg-base text-text-primary" aria-busy="true" aria-label="Loading design">
          <div className="mx-auto max-w-[1120px] px-5 py-8 md:px-10">
            <Skeleton className="mb-6 h-10 w-40 rounded-md bg-secondary-muted" />
            <div className="mb-4 overflow-hidden rounded-xl border border-border-subtle bg-bg-elevated lg:grid lg:grid-cols-[1fr_0.82fr]">
              <div className="space-y-4 p-7 md:p-9">
                <Skeleton className="h-3 w-28 bg-secondary-muted" />
                <Skeleton className="h-9 w-3/4 bg-secondary-muted" />
                <Skeleton className="h-4 w-full bg-secondary-muted" />
                <Skeleton className="h-4 w-2/3 bg-secondary-muted" />
              </div>
              <Skeleton className="min-h-[240px] rounded-none bg-secondary-muted" />
            </div>
            <div className="grid gap-5 lg:grid-cols-[0.88fr_1.12fr]">
              <Skeleton className="h-64 rounded-lg bg-secondary-muted" />
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonProductCard key={i} />
                ))}
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (designQuery.isError || !design || !plan) {
    return (
      <>
        <StepProgress current={5} />
        <main className="min-h-dvh bg-bg-base px-5 py-10 text-text-primary">
          <LightCard className="mx-auto max-w-[620px] p-6 text-center">
            <h1 className="font-display text-[34px] font-semibold">Design not ready</h1>
            <p className="mt-3 text-sm leading-6 text-text-secondary">
              {design?.errorMessage ?? 'Open the generating page again or create a new design.'}
            </p>
            <Button asChild className="mt-6">
              <Link to="/">Return home</Link>
            </Button>
          </LightCard>
        </main>
      </>
    );
  }

  // Split on semicolon so "warm minimalist; comfortable bold" becomes heading + subtitle
  const semicolonIdx = plan.styleDirection.indexOf(';');
  const styleHeading =
    semicolonIdx !== -1
      ? plan.styleDirection.slice(0, semicolonIdx).trim()
      : plan.styleDirection;
  const styleSubtitle =
    semicolonIdx !== -1 ? plan.styleDirection.slice(semicolonIdx + 1).trim() : '';

  return (
    <>
      <StepProgress current={5} />

      <main className="min-h-dvh bg-bg-base pb-28 text-text-primary md:pb-8">
        <div className="mx-auto max-w-[1120px] px-5 py-8 md:px-10">

          {/* ── Action bar ──────────────────────────────── */}
          <div className="mb-6 flex items-center justify-between gap-3">
            <Button asChild variant="ghost" className="gap-2 px-0 hover:bg-transparent">
              <Link to="/">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to Roomly
              </Link>
            </Button>
            <div className="hidden items-center gap-2 md:flex">
              <LoadingButton
                variant="outline"
                className="h-10 rounded-md"
                onClick={() => saveMutation.mutate()}
                loading={saveMutation.isPending}
                loadingText="Saving..."
              >
                <Bookmark className="size-4" aria-hidden="true" />
                {design.savedAt ? 'Saved' : 'Save'}
              </LoadingButton>
              <LoadingButton
                variant="outline"
                className="h-10 rounded-md"
                onClick={handleShareClick}
                loading={shareMutation.isPending}
                loadingText="Sharing..."
              >
                <Share2 className="size-4" aria-hidden="true" />
                Share
              </LoadingButton>
              <Button className="h-10 rounded-md" onClick={handleRefineClick}>
                <MessageCircle className="size-4" aria-hidden="true" />
                Refine
              </Button>
            </div>
          </div>

          {/* ── Hero card ────────────────────────────────── */}
          <div
            ref={heroRef}
            className="mb-4 overflow-hidden rounded-xl border border-border-subtle bg-bg-elevated lg:grid lg:grid-cols-[1fr_0.82fr]"
          >
            {/* Text side */}
            <div className="flex flex-col justify-center gap-5 p-7 md:p-9">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-accent">
                  Your Roomly plan
                </p>
                <h1 className="mt-2.5 font-display text-[32px] font-semibold leading-tight text-text-primary md:text-[40px]">
                  {styleHeading}
                </h1>
                {styleSubtitle ? (
                  <p className="mt-2 text-base leading-6 text-text-secondary">{styleSubtitle}</p>
                ) : null}
              </div>

              <p className="text-sm leading-6 text-text-secondary">
                Estimated refresh:{' '}
                <span className="font-semibold text-text-primary">
                  {formatMoney(plan.totalEstimatedCost.min, design.currency)} –{' '}
                  {formatMoney(plan.totalEstimatedCost.max, design.currency)}
                </span>{' '}
                from a {formatMoney(design.budget, design.currency)} budget.
              </p>

              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full border border-border-subtle bg-bg-base px-3 py-1 text-[11px] font-semibold text-text-secondary">
                  {design.currency}
                </span>
                {design.status === 'failed' ? (
                  <span className="inline-flex items-center rounded-full border border-destructive/30 bg-bg-base px-3 py-1 text-[11px] font-semibold text-destructive">
                    Render failed
                  </span>
                ) : null}
              </div>
            </div>

            {/* Image side */}
            <div className="flex min-h-[240px] items-center justify-center bg-secondary-muted/50 p-5">
              {design.renderUrl ? (
                <img
                  src={design.renderUrl}
                  alt="Rendered Roomly design preview"
                  className="h-full w-full object-cover"
                />
              ) : !isPlus ? (
                <PlanGate requiredPlan="plus" featureName="AI render image">
                  <div />
                </PlanGate>
              ) : (
                <div className="text-center text-accent">
                  <Sparkles className="mx-auto mb-3 size-8" aria-hidden="true" />
                  <p className="text-xs font-bold">AI render preview</p>
                  <p className="mt-1 text-[11px] text-text-secondary">
                    Rendering requires Replicate credit
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Stats row ────────────────────────────────── */}
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-bg-elevated px-4 py-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                Budget
              </p>
              <p className="mt-1.5 text-xl font-bold">
                {formatMoney(design.budget, design.currency)}
              </p>
              <p className="mt-0.5 text-[11px] text-text-secondary">{design.currency}</p>
            </div>
            <div className="rounded-lg bg-bg-elevated px-4 py-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                Matched total
              </p>
              <p className="mt-1.5 text-xl font-bold">
                {formatMoney(shoppingTotal, design.currency)}
              </p>
              <p className="mt-0.5 text-[11px] text-text-secondary">
                {shoppingItems.length} product{shoppingItems.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="rounded-lg bg-bg-elevated px-4 py-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                Budget used
              </p>
              <p
                className={`mt-1.5 text-xl font-bold ${
                  shoppingTotal <= design.budget ? 'text-success' : 'text-destructive'
                }`}
              >
                <span ref={budgetPctRef}>{countedBudgetPct}</span>%
              </p>
              <p className="mt-0.5 text-[11px] text-text-secondary">
                {shoppingTotal <= design.budget ? 'Within budget' : 'Over budget'}
              </p>
            </div>
          </div>

          {/* ── Main two-col content ─────────────────────── */}
          <div className="mb-5 grid gap-5 lg:grid-cols-[0.88fr_1.12fr]">

            {/* LEFT — Design system */}
            <div ref={leftColRef} className="space-y-4">

              {/* Colour palette */}
              <LightCard className="p-5">
                <div className="mb-4 flex items-center gap-2.5">
                  <Palette className="size-4 text-accent" aria-hidden="true" />
                  <h2 className="text-base font-bold">Colour palette</h2>
                </div>
                <div className="flex flex-wrap gap-3">
                  {plan.palette.hexColors.map((color) => (
                    <div key={color} data-swatch className="flex flex-col items-center gap-1.5">
                      <div
                        className="size-9 rounded-full border border-border-subtle shadow-[0_1px_4px_rgba(26,22,20,0.08)]"
                        style={{ backgroundColor: color }}
                        aria-hidden="true"
                      />
                      <span className="font-mono text-[9px] text-text-secondary">{color}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-5 text-text-secondary">{plan.palette.rationale}</p>
              </LightCard>

              {/* Hero piece */}
              <LightCard className="p-5">
                <div className="mb-3 flex items-center gap-2.5">
                  <Star className="size-4 text-accent" aria-hidden="true" />
                  <h2 className="text-base font-bold">Hero piece</h2>
                </div>
                <div className="rounded-lg border border-accent/20 bg-secondary-muted/40 p-3.5">
                  <p className="font-bold">{plan.hero.category}</p>
                  <p className="mt-1.5 text-xs leading-5 text-text-secondary">
                    {plan.hero.description}
                  </p>
                  <p className="mt-2.5 text-sm font-semibold text-accent">
                    {formatMoney(plan.hero.priceRange.min, design.currency)} –{' '}
                    {formatMoney(plan.hero.priceRange.max, design.currency)}
                  </p>
                </div>
              </LightCard>

              {/* Supporting items — 2-col grid */}
              <LightCard className="p-5">
                <div className="mb-4 flex items-center gap-2.5">
                  <ReceiptText className="size-4 text-accent" aria-hidden="true" />
                  <h2 className="text-base font-bold">Supporting items</h2>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {plan.supporting.map((item) => (
                    <div
                      key={`${item.category}-${item.description}`}
                      className="rounded-lg border border-border-subtle bg-bg-base p-3"
                    >
                      <p className="text-sm font-bold">{item.category}</p>
                      <p className="mt-0.5 text-xs font-semibold text-text-secondary">
                        {formatMoney(item.priceRange.min, design.currency)} –{' '}
                        {formatMoney(item.priceRange.max, design.currency)}
                      </p>
                      <p className="mt-1.5 text-[11px] leading-[1.5] text-text-secondary">
                        {item.rationale}
                      </p>
                    </div>
                  ))}
                </div>
              </LightCard>
            </div>

            {/* RIGHT — Shop the look */}
            <div ref={rightColRef} className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-base font-bold">Shop the look</h2>
                <span className="text-sm text-text-secondary">
                  {formatMoney(shoppingTotal, design.currency)} matched
                </span>
              </div>

              {/* Budget bar */}
              <LightCard className="p-4">
                <div className="mb-2 flex justify-between text-xs">
                  <span className="font-semibold">
                    {formatMoney(shoppingTotal, design.currency)} found
                  </span>
                  <span className="text-text-secondary">
                    {formatMoney(design.budget, design.currency)} budget
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary-muted">
                  <div
                    className={`h-full rounded-full transition-[width] duration-700 ease-out ${budgetTone(shoppingTotal, design.budget)}`}
                    style={{ width: `${Math.min(animatedBudgetPct, 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-text-secondary">
                  {shoppingTotal <= design.budget
                    ? `Well within budget · ${shoppingItems.length} product${shoppingItems.length !== 1 ? 's' : ''}`
                    : `Over budget by ${formatMoney(shoppingTotal - design.budget, design.currency)}`}
                </p>
              </LightCard>

              {/* Product grid — 2 columns */}
              <div aria-live="polite">
                {shoppingItems.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {shoppingItems.map((item) => (
                      <ShoppingCard
                        key={item.designItemId}
                        designId={design.id}
                        item={item}
                        currency={design.currency}
                        highlighted={item.position === highlightedPosition}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={ShoppingBag}
                    heading="No products matched yet"
                    body="Your design plan is ready above. Product matches for this style are still being prepared — check back soon."
                    className="p-5"
                  />
                )}
              </div>
            </div>
          </div>

          {/* ── Post-result CTA ──────────────────────────── */}
          <div className="rounded-xl border border-border-subtle bg-bg-elevated px-6 py-8 text-center md:px-10">
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-accent">
              What's next
            </p>
            <h2 className="mt-3 font-display text-[26px] font-semibold md:text-[32px]">
              Love this direction?
            </h2>
            <p className="mx-auto mt-3 max-w-[440px] text-sm leading-6 text-text-secondary">
              Start shopping from the list, save your plan, or design another room with a different budget.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <LoadingButton
                size="lg"
                variant="outline"
                className="h-11 rounded-md px-6 text-[14px] font-semibold shadow-none"
                onClick={() => saveMutation.mutate()}
                loading={saveMutation.isPending}
                loadingText="Saving..."
              >
                <Bookmark className="size-4" aria-hidden="true" />
                {design.savedAt ? 'Saved' : 'Save result'}
              </LoadingButton>
              <LoadingButton
                size="lg"
                variant="outline"
                className="h-11 rounded-md px-6 text-[14px] font-semibold shadow-none"
                onClick={handleShareClick}
                loading={shareMutation.isPending}
                loadingText="Sharing..."
              >
                <Share2 className="size-4" aria-hidden="true" />
                Share
              </LoadingButton>
              <Button
                size="lg"
                className="h-11 rounded-md px-6 text-[14px] font-bold shadow-none"
                onClick={handleRefineClick}
              >
                <MessageCircle className="size-4" aria-hidden="true" />
                Refine this room
              </Button>
              <Button
                asChild
                size="lg"
                className="h-11 rounded-md px-6 text-[14px] font-bold shadow-none"
              >
                <Link to="/design/upload">Design another room</Link>
              </Button>
            </div>
          </div>

        </div>
      </main>

      {/* Mobile bottom action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border-subtle bg-bg-elevated/95 px-4 py-3 shadow-[0_-10px_30px_rgba(26,22,20,0.08)] backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-[520px] grid-cols-3 gap-2">
          <LoadingButton
            variant="outline"
            className="h-11 rounded-md"
            onClick={() => saveMutation.mutate()}
            loading={saveMutation.isPending}
            loadingText="Saving..."
          >
            <Bookmark className="size-4" aria-hidden="true" />
            {design.savedAt ? 'Saved' : 'Save'}
          </LoadingButton>
          <LoadingButton
            variant="outline"
            className="h-11 rounded-md"
            onClick={handleShareClick}
            loading={shareMutation.isPending}
            loadingText="Sharing..."
          >
            <Share2 className="size-4" aria-hidden="true" />
            Share
          </LoadingButton>
          <Button className="h-11 rounded-md" onClick={handleRefineClick}>
            <MessageCircle className="size-4" aria-hidden="true" />
            Refine
          </Button>
        </div>
      </div>

      <ChatPanel
        designId={design.id}
        open={chatOpen}
        onOpenChange={setChatOpen}
        onActionApplied={handleChatAction}
      />
    </>
  );
}
