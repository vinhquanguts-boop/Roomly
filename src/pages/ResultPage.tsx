import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Bookmark,
  ExternalLink,
  MessageCircle,
  PackageSearch,
  Palette,
  ReceiptText,
  Share2,
  Sparkles,
  Truck,
} from 'lucide-react';
import gsap from 'gsap';
import { LightCard } from '@/components/LightCard';
import { StepProgress } from '@/components/StepProgress';
import { Button } from '@/components/ui/button';
import { ChatPanel } from '@/features/chat';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { API_BASE_URL, getDesign, type ChatAction, type ShoppingItem } from '@/lib/api';
import { cn } from '@/lib/utils';

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function productClickUrl(designId: string, productId: string): string {
  const params = new URLSearchParams({ id: productId, design_id: designId });
  return `${API_BASE_URL}/api/products/track-click?${params.toString()}`;
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

  if (!product) {
    return null;
  }

  return (
    <LightCard
      className={cn(
        'overflow-hidden p-0 transition-[box-shadow,transform,border-color] duration-500',
        highlighted ? 'border-accent shadow-[0_0_0_3px_rgba(199,104,74,0.20)]' : ''
      )}
    >
      {product.imageUrl && !imageFailed ? (
        <img
          src={product.imageUrl}
          alt={product.title}
          className="aspect-[1.5/1] w-full bg-bg-inset object-cover"
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="flex aspect-[1.5/1] items-center justify-center bg-bg-inset text-text-secondary">
          <PackageSearch className="size-8" aria-hidden="true" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-full bg-secondary-muted px-3 py-1 text-xs font-bold text-text-primary">
            {product.retailer}
          </span>
          <span className="text-sm font-bold text-success">{formatMoney(product.price, currency)}</span>
        </div>
        <h3 className="mt-3 text-base font-bold leading-snug">{product.title}</h3>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          {item.rationale ?? product.description ?? 'Matched to the design plan and budget.'}
        </p>
        <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-text-secondary">
          <Truck className="size-4 text-accent" aria-hidden="true" />
          {product.deliveryEstimate ?? 'Delivery estimate unavailable'}
        </div>
        <Button asChild className="mt-4 h-10 w-full rounded-md">
          <a href={productClickUrl(designId, product.id)} target="_blank" rel="noreferrer">
            View at {product.retailer}
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        </Button>
      </div>
    </LightCard>
  );
}

export function ResultPage() {
  const { id } = useParams();
  const leftColRef = useRef<HTMLDivElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);
  const reduced = useReducedMotion();
  const [chatOpen, setChatOpen] = useState(false);
  const [highlightedPosition, setHighlightedPosition] = useState<number | null>(null);

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
  const shoppingTotal = shoppingItems.reduce((total, item) => total + (item.priceAtGeneration ?? item.product?.price ?? 0), 0);
  const budgetPct = design ? Math.min(Math.round((shoppingTotal / design.budget) * 100), 130) : 0;

  function handleChatAction(_action: ChatAction, changedPosition: number | null) {
    if (changedPosition === null) return;

    setHighlightedPosition(changedPosition);
    window.setTimeout(() => setHighlightedPosition(null), 2400);
  }

  // Staggered reveal: left col rises, then right col cards cascade in
  useEffect(() => {
    if (reduced || !design || !plan || hasAnimated.current) return;
    if (!leftColRef.current || !rightColRef.current) return;

    const rightColChildren = Array.from(rightColRef.current.children);
    const animationTargets = [leftColRef.current, ...rightColChildren];

    const tl = gsap.timeline({
      defaults: { ease: 'power3.out' },
      onComplete: () => {
        hasAnimated.current = true;
      },
    });
    tl
      .fromTo(
        leftColRef.current,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.7, clearProps: 'all' },
        0
      )
      .fromTo(
        rightColChildren,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.52, stagger: 0.09, clearProps: 'all' },
        0.18
      );

    return () => {
      tl.kill();
      if (!hasAnimated.current) {
        gsap.set(animationTargets, { clearProps: 'all' });
      }
    };
  }, [reduced, design, plan]);

  if (designQuery.isPending) {
    return (
      <>
        <StepProgress current={5} />
        <main className="flex min-h-dvh items-center justify-center bg-bg-base px-5 text-text-primary">
          <p className="text-sm font-semibold text-text-secondary">Loading design...</p>
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

  return (
    <>
      <StepProgress current={5} />
      <main className="min-h-dvh bg-bg-base px-5 pb-28 pt-8 text-text-primary md:px-10 md:pb-8">
      <div className="mx-auto max-w-[1120px]">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Button asChild variant="ghost" className="gap-2 px-0 hover:bg-transparent">
            <Link to="/">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to Roomly
            </Link>
          </Button>
          <Button className="hidden h-10 rounded-md md:inline-flex" onClick={() => setChatOpen(true)}>
            <MessageCircle className="size-4" aria-hidden="true" />
            Refine
          </Button>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div ref={leftColRef}>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-accent">Your Roomly plan</p>
            <h1 className="mt-3 font-display text-[38px] font-semibold leading-tight md:text-[52px]">
              {plan.styleDirection}
            </h1>
            <p className="mt-5 max-w-[560px] text-base leading-7 text-text-secondary">
              Estimated refresh cost: {formatMoney(plan.totalEstimatedCost.min, design.currency)} -{' '}
              {formatMoney(plan.totalEstimatedCost.max, design.currency)} from a {formatMoney(design.budget, design.currency)} budget.
            </p>

            {design.status === 'failed' ? (
              <LightCard className="mt-6 border-destructive/30 bg-bg-elevated p-4">
                <p className="text-sm font-semibold text-destructive">Render failed, but your design plan was preserved.</p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">
                  {design.errorMessage ?? 'You can still review the plan below and retry rendering later.'}
                </p>
              </LightCard>
            ) : null}

            <LightCard className="mt-7 overflow-hidden">
              {design.renderUrl ? (
                <img src={design.renderUrl} alt="Rendered Roomly design preview" className="w-full bg-bg-inset object-cover" />
              ) : (
                <div className="flex min-h-[320px] flex-col items-center justify-center bg-bg-inset px-6 text-center">
                  <Sparkles className="size-8 text-accent" aria-hidden="true" />
                  <p className="mt-4 text-sm font-bold text-text-primary">Preview rendering is off for free local mode.</p>
                  <p className="mt-2 max-w-[360px] text-sm leading-6 text-text-secondary">
                    This result uses Ollama for the room plan. Replicate image rendering can be enabled later when credit is available.
                  </p>
                </div>
              )}
            </LightCard>
          </div>

          <div ref={rightColRef} className="space-y-4">
            <LightCard className="p-5">
              <div className="flex items-center gap-3">
                <ReceiptText className="size-5 text-accent" aria-hidden="true" />
                <h2 className="text-xl font-bold">Shopping list</h2>
              </div>
              {shoppingItems.length > 0 ? (
                <>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-text-secondary">Matched total</p>
                      <p className="mt-1 text-2xl font-bold">{formatMoney(shoppingTotal, design.currency)}</p>
                    </div>
                    <p className="text-right text-sm font-semibold text-text-secondary">
                      Budget {formatMoney(design.budget, design.currency)}
                    </p>
                  </div>
                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-secondary-muted">
                    <div
                      className={`h-full rounded-full ${budgetTone(shoppingTotal, design.budget)}`}
                      style={{ width: `${Math.min(budgetPct, 100)}%` }}
                    />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-text-secondary">
                    {shoppingTotal <= design.budget
                      ? 'This product set is within your selected budget.'
                      : 'This set is over budget. Swap or remove nice-to-have pieces first.'}
                  </p>
                </>
              ) : (
                <p className="mt-3 text-sm leading-6 text-text-secondary">
                  Shopping list is still being prepared. Your design plan is ready below.
                </p>
              )}
            </LightCard>

            {shoppingItems.map((item) => (
              <ShoppingCard
                key={item.designItemId}
                designId={design.id}
                item={item}
                currency={design.currency}
                highlighted={item.position === highlightedPosition}
              />
            ))}

            <LightCard className="p-5">
              <div className="flex items-center gap-3">
                <Palette className="size-5 text-accent" aria-hidden="true" />
                <h2 className="text-xl font-bold">Palette</h2>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                {plan.palette.hexColors.map((color) => (
                  <div key={color} className="flex flex-col items-center gap-1.5">
                    <div
                      className="size-10 rounded-full border border-border-subtle shadow-[0_2px_6px_rgba(26,22,20,0.10)]"
                      style={{ backgroundColor: color }}
                      aria-hidden="true"
                    />
                    <span className="font-mono text-[10px] font-semibold text-text-secondary">{color}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-sm leading-6 text-text-secondary">{plan.palette.rationale}</p>
            </LightCard>

            <LightCard className="p-5">
              <div className="flex items-center gap-3">
                <Sparkles className="size-5 text-accent" aria-hidden="true" />
                <h2 className="text-xl font-bold">Hero piece</h2>
              </div>
              <p className="mt-4 text-lg font-bold">{plan.hero.category}</p>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{plan.hero.description}</p>
              <p className="mt-3 text-sm font-semibold">
                {formatMoney(plan.hero.priceRange.min, design.currency)} - {formatMoney(plan.hero.priceRange.max, design.currency)}
              </p>
            </LightCard>

            <LightCard className="p-5">
              <div className="flex items-center gap-3">
                <ReceiptText className="size-5 text-accent" aria-hidden="true" />
                <h2 className="text-xl font-bold">Supporting items</h2>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {plan.supporting.map((item) => (
                  <div key={`${item.category}-${item.description}`} className="rounded-lg border border-border-subtle p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-bold">{item.category}</p>
                      <p className="text-sm font-semibold text-text-secondary">
                        {formatMoney(item.priceRange.min, design.currency)} - {formatMoney(item.priceRange.max, design.currency)}
                      </p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">{item.rationale}</p>
                  </div>
                ))}
              </div>
            </LightCard>
          </div>
        </div>

        {/* Post-result CTA */}
        <div className="mt-12 rounded-xl border border-border-subtle bg-bg-elevated px-6 py-8 text-center md:px-10">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-accent">What's next</p>
          <h2 className="mt-3 font-display text-[28px] font-semibold text-text-primary md:text-[34px]">
            Love this direction?
          </h2>
          <p className="mx-auto mt-3 max-w-[480px] text-sm leading-6 text-text-secondary">
            Save your result, start shopping from the list above, or create a new design with a different room or budget.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="h-12 rounded-md px-8 text-[15px] font-bold shadow-none" onClick={() => setChatOpen(true)}>
              <MessageCircle className="size-4" aria-hidden="true" />
              Refine this room
            </Button>
            <Button asChild size="lg" className="h-12 rounded-md px-8 text-[15px] font-bold shadow-none">
              <Link to="/design/upload">Design another room</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 rounded-md px-8 text-[15px] font-semibold">
              <Link to="/">Back to home</Link>
            </Button>
          </div>
        </div>
      </div>
      </main>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border-subtle bg-bg-elevated/95 px-4 py-3 shadow-[0_-10px_30px_rgba(26,22,20,0.08)] backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-[520px] grid-cols-3 gap-2">
          <Button variant="outline" className="h-11 rounded-md" disabled>
            <Bookmark className="size-4" aria-hidden="true" />
            Save
          </Button>
          <Button variant="outline" className="h-11 rounded-md" disabled>
            <Share2 className="size-4" aria-hidden="true" />
            Share
          </Button>
          <Button className="h-11 rounded-md" onClick={() => setChatOpen(true)}>
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
