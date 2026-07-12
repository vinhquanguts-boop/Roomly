import { useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft, Mail, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { LightCard } from '@/components/LightCard';
import { LoadingButton } from '@/components/LoadingButton';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getAuthConfig } from '@/lib/api';
import { authClient } from '@/lib/auth-client';

export function SignUpPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const authConfigQuery = useQuery({
    queryKey: ['auth-config'],
    queryFn: getAuthConfig,
  });

  const signUpMutation = useMutation({
    mutationFn: async () => {
      const result = await authClient.signUp.email({
        name,
        email,
        password,
      });
      if (result.error) {
        throw new Error(result.error.message ?? 'Sign up failed.');
      }
    },
    onSuccess: () => {
      toast.success('Roomly account created.');
      navigate('/dashboard');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Sign up failed.');
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
    if (!name || !email || password.length < 8 || signUpMutation.isPending) return;
    signUpMutation.mutate();
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
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-accent">Create your account</p>
          <h1 className="mt-4 font-display text-[42px] font-semibold leading-tight md:text-[58px]">
            Keep your Roomly designs together.
          </h1>
          <p className="mt-5 max-w-[520px] text-base leading-7 text-text-secondary">
            Your saved anonymous rooms move into your account after sign-up, so you can publish and revisit them.
          </p>
        </div>

        <LightCard className="p-6 md:p-8">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-secondary-muted text-accent">
              <UserPlus className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Sign up</h2>
              <p className="text-sm text-text-secondary">Start with an email and password.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
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
                autoComplete="new-password"
                minLength={8}
                aria-describedby="password-hint"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <p id="password-hint" className="text-xs font-semibold text-text-secondary">Use at least 8 characters.</p>
            </div>
            <LoadingButton
              type="submit"
              className="h-11 w-full rounded-md"
              loading={signUpMutation.isPending}
              loadingText="Creating account…"
            >
              <Mail className="size-4" aria-hidden="true" />
              Create account
            </LoadingButton>
          </form>

          {authConfigQuery.data?.googleEnabled ? (
            <Button variant="outline" className="mt-3 h-11 w-full rounded-md" onClick={handleGoogleSignIn}>
              Continue with Google
            </Button>
          ) : (
            <p className="mt-4 rounded-md bg-secondary-muted px-3 py-2 text-sm leading-6 text-text-secondary">
              Google sign-in is hidden until local Google OAuth credentials are configured.
            </p>
          )}

          <p className="mt-5 text-center text-sm text-text-secondary">
            Already have an account?{' '}
            <Link to="/auth/sign-in" className="font-bold text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </LightCard>
      </section>
    </main>
  );
}
