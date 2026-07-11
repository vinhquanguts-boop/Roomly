import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { LoadingButton } from '@/components/LoadingButton';
import { createCheckoutSession, type Plan } from '@/lib/api/subscription';
import { usePlan } from '@/hooks/usePlan';

type PlanGateProps = {
  requiredPlan: 'plus' | 'professional';
  featureName: string;
  children: ReactNode;
};

const PLAN_RANK: Record<Plan, number> = { free: 0, plus: 1, professional: 2 };

export function PlanGate({ requiredPlan, featureName, children }: PlanGateProps) {
  const { plan, billingEnabled } = usePlan();

  const hasAccess = PLAN_RANK[plan] >= PLAN_RANK[requiredPlan];

  const checkoutMutation = useMutation({
    mutationFn: () => createCheckoutSession(requiredPlan),
    onSuccess: ({ checkoutUrl }) => {
      window.location.href = checkoutUrl;
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not start checkout.'),
  });

  if (hasAccess) return <>{children}</>;

  const planLabel = requiredPlan === 'plus' ? 'Roomly Plus' : 'Roomly Professional';
  const billingUnavailable = !billingEnabled;

  return (
    <div className="relative overflow-hidden rounded-xl border border-dashed border-accent/40 bg-secondary-muted/30 p-6 text-center">
      <Lock className="mx-auto mb-3 size-6 text-accent opacity-70" aria-hidden="true" />
      <p className="mb-1 font-display text-lg font-semibold">{featureName}</p>
      <p className="mb-4 text-sm text-text-secondary">
        {billingUnavailable
          ? 'Paid plans are not connected yet. This feature will unlock when billing is enabled.'
          : `Available on ${planLabel} and above.`}
      </p>
      <LoadingButton
        onClick={() => checkoutMutation.mutate()}
        loading={checkoutMutation.isPending}
        loadingText="Opening checkout…"
        disabled={billingUnavailable}
        className="w-full rounded-full"
      >
        {billingUnavailable ? 'Billing coming soon' : `Upgrade to ${planLabel}`}
      </LoadingButton>
    </div>
  );
}
