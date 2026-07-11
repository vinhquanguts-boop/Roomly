import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { reportClientError } from '@/lib/monitoring';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportClientError(error, { componentStack: info.componentStack ?? '' });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="flex min-h-dvh items-center justify-center bg-bg-base px-5 text-center text-text-primary">
        <div className="max-w-md">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Roomly</p>
          <h1 className="mt-3 font-display text-4xl font-semibold">Something needs another try</h1>
          <p className="mt-4 text-sm leading-6 text-text-secondary">Your saved designs and room photo have not been changed. Return home or reload the page to continue.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild variant="outline"><Link to="/">Return home</Link></Button>
            <Button onClick={() => window.location.reload()}>Reload</Button>
          </div>
        </div>
      </main>
    );
  }
}
