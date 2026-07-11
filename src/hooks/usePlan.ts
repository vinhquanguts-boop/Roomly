import { useQuery } from '@tanstack/react-query';
import { getSubscription, type Plan, type UserSubscription } from '@/lib/api/subscription';
import { useAuth } from '@/lib/auth-state';

export function usePlan() {
  const { isAuthenticated } = useAuth();

  const query = useQuery({
    queryKey: ['subscription', isAuthenticated ? 'authenticated' : 'anonymous'],
    queryFn: getSubscription,
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const plan: Plan = query.data?.plan ?? 'free';
  const sub: UserSubscription | undefined = query.data;

  return {
    plan,
    sub,
    isPending: query.isPending,
    isPlus: plan === 'plus' || plan === 'professional',
    isPro: plan === 'professional',
    canDesign: sub
      ? sub.designLimitThisMonth === null || sub.designsUsedThisMonth < sub.designLimitThisMonth
      : true,
    billingEnabled: sub?.billingEnabled ?? false,
    refetch: query.refetch,
  };
}
