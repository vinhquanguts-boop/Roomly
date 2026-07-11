import { useRef } from 'react';
import { Link } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Navigation } from '@/components/Navigation';
import { LightCard } from '@/components/LightCard';
import { LoadingButton } from '@/components/LoadingButton';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { usePageEntrance } from '@/hooks/usePageEntrance';
import { useStaggerReveal } from '@/hooks/useStaggerReveal';
import { usePlan } from '@/hooks/usePlan';
import { createCheckoutSession, PLAN_FEATURES, type Plan } from '@/lib/api/subscription';
import { cn } from '@/lib/utils';

const PLAN_ORDER: Plan[] = ['free', 'plus', 'professional'];

type FeatureRow = {
  label: string;
  render: (plan: Plan) => string | boolean;
};

const FEATURE_ROWS: FeatureRow[] = [
  {
    label: 'Designs per month',
    render: (plan) => {
      const value = PLAN_FEATURES[plan].designsPerMonth;
      return value === null ? 'Unlimited' : `${value} design${value === 1 ? '' : 's'} / month`;
    },
  },
  {
    label: 'Retailers',
    render: (plan) => (PLAN_FEATURES[plan].allRetailers ? 'All 5 retailers' : 'Kmart & AliExpress'),
  },
  { label: 'AI render image', render: (plan) => PLAN_FEATURES[plan].renderImage },
  {
    label: 'Chat refinement',
    render: (plan) => {
      const value = PLAN_FEATURES[plan].chatMessages;
      if (value === null) return 'Unlimited';
      if (value === 0) return 'Not included';
      return `${value} messages / design`;
    },
  },
  { label: 'Share your design', render: (plan) => PLAN_FEATURES[plan].canShare },
  { label: 'Priority AI queue', render: (plan) => PLAN_FEATURES[plan].priorityQueue },
  { label: 'Multi-room projects', render: (plan) => PLAN_FEATURES[plan].multiRoom },
  { label: 'PDF export', render: (plan) => PLAN_FEATURES[plan].pdfExport },
];

const FAQ_ITEMS = [
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes. Cancel from your account page and you keep access until the end of the current billing period.',
  },
  {
    question: 'What happens to designs over my monthly limit?',
    answer: 'You can still view and shop existing designs. Upgrade any time to generate more this month.',
  },
  {
    question: 'Do unused designs roll over?',
    answer: "No, your design allowance resets at the start of each billing period and doesn't carry over.",
  },
  {
    question: 'Which retailers does the free plan include?',
    answer: 'Free includes Kmart and AliExpress. Plus and Professional unlock AliExpress, Amazon, IKEA, Kmart, and Taobao.',
  },
];

function FeatureValue({ value }: { value: string | boolean }) {
  if (typeof value === 'boolean') {
    return value ? (
      <Check className="mx-auto size-4 text-success" aria-hidden="true" />
    ) : (
      <X className="mx-auto size-4 text-text-tertiary" aria-hidden="true" />
    );
  }
  return <span>{value}</span>;
}

function PlanCard({ plan }: { plan: Plan }) {
  const features = PLAN_FEATURES[plan];
  const { plan: currentPlan, billingEnabled } = usePlan();
  const isCurrentPlan = currentPlan === plan;
  const isPlus = plan === 'plus';

  const checkoutMutation = useMutation({
    mutationFn: () => createCheckoutSession(plan as 'plus' | 'professional'),
    onSuccess: ({ checkoutUrl }) => {
      window.location.href = checkoutUrl;
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Could not start checkout.');
    },
  });

  return (
    <LightCard
      data-stagger
      className={cn(
        'flex flex-col p-6',
        isPlus && 'border-accent shadow-[0_16px_48px_rgba(199,104,74,0.16)]'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-xl font-semibold text-text-primary">{features.label}</h2>
        {features.highlight ? (
          <span className="rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
            {features.highlight}
          </span>
        ) : null}
      </div>

      <div className="mt-5 flex items-baseline gap-2">
        <span className="font-display text-4xl font-semibold text-text-primary">{features.price}</span>
        <span className="text-sm text-text-secondary">{features.priceNote}</span>
      </div>

      <div className="mt-6 border-t border-border-subtle pt-5">
        <ul className="space-y-3 text-sm">
          {FEATURE_ROWS.map((row) => (
            <li key={row.label} className="flex items-center justify-between gap-3">
              <span className="text-text-secondary">{row.label}</span>
              <span className="font-semibold text-text-primary">
                <FeatureValue value={row.render(plan)} />
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6">
        {isCurrentPlan ? (
          <Button className="w-full" variant="outline" disabled>
            Current plan
          </Button>
        ) : plan === 'free' ? (
          <Button asChild className="w-full">
            <Link to="/design/upload">Get started free</Link>
          </Button>
        ) : (
          <LoadingButton
            className="w-full"
            onClick={() => checkoutMutation.mutate()}
            loading={checkoutMutation.isPending}
            disabled={!billingEnabled}
            loadingText="Opening checkout…"
          >
            {billingEnabled ? `Start with ${features.label}` : 'Billing coming soon'}
          </LoadingButton>
        )}
      </div>
    </LightCard>
  );
}

export function PricingPage() {
  const mainRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  usePageEntrance(mainRef);
  useStaggerReveal(cardsRef, { stagger: 0.08 });

  return (
    <>
      <Navigation />
      <main ref={mainRef} className="min-h-dvh bg-bg-base px-5 py-14 text-text-primary md:px-10">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-accent">Pricing</p>
          <h1 className="mt-3 font-display text-[38px] font-semibold leading-tight md:text-[48px]">
            Choose your plan
          </h1>
          <p className="mx-auto mt-4 max-w-[520px] text-base leading-7 text-text-secondary">
            Start free. Upgrade whenever you want more designs, every retailer, and unlimited refinement.
          </p>
          <p className="mx-auto mt-4 max-w-[620px] rounded-lg border border-accent/20 bg-accent/5 px-4 py-3 text-sm text-text-secondary">
            Paid checkout is not connected in this local build yet. You can review all plan features now; upgrades will be enabled once Stripe is configured.
          </p>
        </div>

        <div ref={cardsRef} className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {PLAN_ORDER.map((plan) => (
            <PlanCard key={plan} plan={plan} />
          ))}
        </div>

        <div className="mx-auto mt-16 max-w-2xl">
          <h2 className="text-center font-display text-2xl font-semibold text-text-primary">
            Frequently asked questions
          </h2>
          <Accordion type="single" collapsible className="mt-6">
            {FAQ_ITEMS.map((item) => (
              <AccordionItem key={item.question} value={item.question}>
                <AccordionTrigger className="text-left font-semibold">{item.question}</AccordionTrigger>
                <AccordionContent className="text-text-secondary">{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </main>
    </>
  );
}
