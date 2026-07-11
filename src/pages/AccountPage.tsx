import { useEffect, useRef, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Navigation } from '@/components/Navigation';
import { LightCard } from '@/components/LightCard';
import { LoadingButton } from '@/components/LoadingButton';
import { PlanBadge } from '@/components/PlanBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { usePageEntrance } from '@/hooks/usePageEntrance';
import { usePlan } from '@/hooks/usePlan';
import { useAuth } from '@/lib/auth-state';
import { authClient } from '@/lib/auth-client';
import { createCheckoutSession, createPortalSession, getUserStats, PLAN_FEATURES } from '@/lib/api/subscription';

export function AccountPage() {
  const mainRef = useRef<HTMLElement>(null);
  usePageEntrance(mainRef);

  const { user, isPending: authPending, refetch: refetchAuth } = useAuth();
  const { plan, sub, billingEnabled } = usePlan();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [name, setName] = useState(user?.name ?? '');
  const [editingName, setEditingName] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const deleteDialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sessionId) return;
    void queryClient.invalidateQueries({ queryKey: ['subscription'] });
    toast.success('Welcome to your new plan!');
  }, [sessionId, queryClient]);

  const statsQuery = useQuery({
    queryKey: ['user-stats'],
    queryFn: getUserStats,
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (!deleteDialogOpen) return;
    deleteDialogRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDeleteDialogOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [deleteDialogOpen]);

  const updateNameMutation = useMutation({
    mutationFn: (newName: string) => authClient.updateUser({ name: newName }),
    onSuccess: async () => {
      toast.success('Name updated.');
      setEditingName(false);
      await refetchAuth();
    },
    onError: () => toast.error('Could not update name.'),
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => authClient.deleteUser(),
    onSuccess: () => toast.success('Account deletion requested.'),
    onError: () => toast.error('Could not delete account. Please try again.'),
  });

  const checkoutMutation = useMutation({
    mutationFn: () => createCheckoutSession('plus'),
    onSuccess: ({ checkoutUrl }) => {
      window.location.href = checkoutUrl;
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not start checkout.'),
  });

  const portalMutation = useMutation({
    mutationFn: () => createPortalSession(),
    onSuccess: ({ portalUrl }) => {
      window.location.href = portalUrl;
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not open billing portal.'),
  });

  const usedThisMonth = sub?.designsUsedThisMonth ?? 0;
  const monthlyLimit = sub?.designLimitThisMonth ?? PLAN_FEATURES[plan].designsPerMonth;
  const usagePct = monthlyLimit ? Math.min(Math.round((usedThisMonth / monthlyLimit) * 100), 100) : 0;

  if (authPending) {
    return <div className="flex min-h-dvh items-center justify-center bg-bg-base text-text-secondary">Loading account...</div>;
  }

  if (!user) {
    return <Navigate to="/auth/sign-in" replace />;
  }

  return (
    <>
      <Navigation />
      <main ref={mainRef} className="min-h-dvh bg-bg-base px-5 py-10 text-text-primary md:px-10">
        <div className="mx-auto max-w-[720px] space-y-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-accent">Account</p>
            <h1 className="mt-3 font-display text-[34px] font-semibold leading-tight md:text-[42px]">
              Account & billing
            </h1>
          </div>

          <LightCard className="p-5 md:p-6">
            <h2 className="text-xl font-bold">Profile</h2>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-secondary-muted text-lg font-bold text-accent">
                {(user?.name ?? user?.email ?? '?').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                {editingName ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="h-9"
                      autoFocus
                    />
                    <LoadingButton
                      size="sm"
                      onClick={() => updateNameMutation.mutate(name)}
                      loading={updateNameMutation.isPending}
                      disabled={name.trim().length === 0}
                    >
                      Save
                    </LoadingButton>
                    <Button size="sm" variant="ghost" onClick={() => setEditingName(false)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                    <div>
                      <p className="font-bold text-text-primary">{user?.name ?? 'Add your name'}</p>
                      <p className="text-sm text-text-secondary">{user?.email}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setName(user?.name ?? '');
                        setEditingName(true);
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </LightCard>

          <LightCard className="p-5 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Current plan</h2>
              <PlanBadge plan={plan} />
            </div>

            {sub?.cancelAtPeriodEnd ? (
              <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                Your plan cancels on{' '}
                {sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : 'the next billing date'}.
              </div>
            ) : null}

            <p className="mt-4 text-lg font-bold text-text-primary">{PLAN_FEATURES[plan].label}</p>
            <p className="mt-2 text-sm text-text-secondary">
              {billingEnabled ? `Billing status: ${sub?.status ?? 'active'}.` : 'Billing is not connected in this local build yet.'}
            </p>
            {sub?.currentPeriodEnd ? (
              <p className="mt-1 text-sm text-text-secondary">
                Renews {new Date(sub.currentPeriodEnd).toLocaleDateString()}
              </p>
            ) : null}

            <div className="mt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Designs this month</span>
                <span className="font-semibold">
                  {usedThisMonth} / {monthlyLimit ?? '∞'}
                </span>
              </div>
              <Progress value={usagePct} className="mt-2 bg-secondary-muted" />
            </div>

            <div className="mt-5">
              {plan === 'free' ? (
                <LoadingButton
                  onClick={() => checkoutMutation.mutate()}
                  disabled={!billingEnabled}
                  loading={checkoutMutation.isPending}
                  loadingText="Opening checkout…"
                >
                  {billingEnabled ? 'Upgrade to Plus' : 'Billing coming soon'}
                </LoadingButton>
              ) : (
                <LoadingButton
                  onClick={() => portalMutation.mutate()}
                  disabled={!billingEnabled}
                  loading={portalMutation.isPending}
                  loadingText="Opening portal…"
                >
                  {billingEnabled ? 'Manage subscription' : 'Billing coming soon'}
                </LoadingButton>
              )}
            </div>
          </LightCard>

          <LightCard className="p-5 md:p-6">
            <h2 className="text-xl font-bold">Usage</h2>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-secondary-muted/50 p-4">
                <p className="text-2xl font-bold text-text-primary">{statsQuery.data?.designsThisMonth ?? '–'}</p>
                <p className="mt-1 text-sm text-text-secondary">Designs this month</p>
              </div>
              <div className="rounded-lg bg-secondary-muted/50 p-4">
                <p className="text-2xl font-bold text-text-primary">{statsQuery.data?.designsRemaining ?? '–'}</p>
                <p className="mt-1 text-sm text-text-secondary">Designs remaining</p>
              </div>
              <div className="col-span-2 rounded-lg bg-secondary-muted/50 p-4">
                <p className="text-2xl font-bold text-text-primary">{statsQuery.data?.designsAllTime ?? '–'}</p>
                <p className="mt-1 text-sm text-text-secondary">Total designs all time</p>
              </div>
            </div>
          </LightCard>

          <LightCard className="border-destructive/30 p-5 md:p-6">
            <h2 className="text-xl font-bold text-destructive">Danger zone</h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              Deleting your account removes your profile and access to saved designs. This cannot be undone.
            </p>
            <Button variant="destructive" className="mt-4" onClick={() => setDeleteDialogOpen(true)}>
              Delete account
            </Button>
          </LightCard>
        </div>
      </main>
      {deleteDialogOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-5" onMouseDown={() => setDeleteDialogOpen(false)}>
          <div
            ref={deleteDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            tabIndex={-1}
            className="w-full max-w-md rounded-xl border border-border-subtle bg-bg-elevated p-6 shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="delete-account-title" className="text-xl font-bold">Delete your account?</h2>
            <p className="mt-3 text-sm leading-6 text-text-secondary">
              This permanently deletes your Roomly account. Your saved designs will no longer be accessible. This action cannot be undone.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
              <LoadingButton
                variant="destructive"
                onClick={() => deleteAccountMutation.mutate()}
                loading={deleteAccountMutation.isPending}
                loadingText="Deleting..."
              >
                Delete account
              </LoadingButton>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
