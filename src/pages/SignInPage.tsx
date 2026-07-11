import { useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { LightCard } from '@/components/LightCard';
import { LoadingButton } from '@/components/LoadingButton';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getAuthConfig } from '@/lib/api';
import { authClient } from '@/lib/auth-client';

export function SignInPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const authConfigQuery = useQuery({
    queryKey: ['auth-config'],
    queryFn: getAuthConfig,
  });

  const signInMutation = useMutation({
    mutationFn: async () => {
      const result = await authClient.signIn.email({
        email,
        password,
      });
      if (result.error) {
        throw new Error(result.error.message ?? 'Sign in failed.');
      }
    },
    onSuccess: () => {
      toast.success('Signed in to Roomly.');
      navigate('/dashboard');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Sign in failed.');
    },
  });

  async function handleGoogleSignIn() {
    await authClient.signIn.social({
      provider: 'google',
      callbackURL: `${window.location.origin}/dashboard`,
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email || !password || signInMutation.isPending) return;
    signInMutation.mutate();
  }

  return (
    <main className="min-h-dvh bg-bg-base px-5 py-8 text-text-primary">
      <div className="mx-auto flex w-full max-w-[1040px] items-center justify-between">
        <Link to="/" className="transition-opacity hover:opacity-80" aria-label="Roomly home">
          <Logo variant="full" size="md" color="accent" />
        </Link>
        <Button asChild variant="ghost" className="gap-2 px-0 hover:bg-transparent">
          <Link to="/">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back home
          </Link>
        </Button>
      </div>

      <section className="mx-auto grid min-h-[calc(100dvh-112px)] w-full max-w-[1040px] items-center gap-8 py-10 lg:grid-cols-[0.95fr_1fr]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-accent">Welcome back</p>
          <h1 className="mt-4 font-display text-[42px] font-semibold leading-tight md:text-[58px]">
            Save, share, and revisit every room.
          </h1>
          <p className="mt-5 max-w-[520px] text-base leading-7 text-text-secondary">
            Sign in to move saved anonymous designs into your Roomly dashboard and publish designs to the explore feed.
          </p>
        </div>

        <LightCard className="p-6 md:p-8">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-secondary-muted text-accent">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Sign in</h2>
              <p className="text-sm text-text-secondary">Use your email and password.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <LoadingButton
              type="submit"
              className="h-11 w-full rounded-md"
              loading={signInMutation.isPending}
              loadingText="Signing in…"
            >
              <Mail className="size-4" aria-hidden="true" />
              Sign in
            </LoadingButton>
          </form>

          {authConfigQuery.data?.googleEnabled ? (
            <Button variant="outline" className="mt-3 h-11 w-full rounded-md" onClick={handleGoogleSignIn}>
              Continue with Google
            </Button>
          ) : (
            <p className="mt-4 rounded-md bg-secondary-muted px-3 py-2 text-sm leading-6 text-text-secondary">
              Google sign-in is hidden until `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set.
            </p>
          )}

          <p className="mt-5 text-center text-sm text-text-secondary">
            New to Roomly?{' '}
            <Link to="/auth/sign-up" className="font-bold text-accent hover:underline">
              Create an account
            </Link>
          </p>
        </LightCard>
      </section>
    </main>
  );
}
