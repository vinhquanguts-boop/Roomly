import { ArrowLeft, MonitorCog } from 'lucide-react';
import { Link } from 'react-router';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';

export function LocalWorkspacePage() {
  return (
    <div className="min-h-dvh bg-bg-base text-text-primary">
      <Navigation />
      <main className="px-5 py-16 md:px-10 md:py-24">
        <section className="mx-auto max-w-2xl rounded-lg border border-border-subtle bg-bg-elevated p-7 shadow-card md:p-10">
          <MonitorCog className="size-8 text-accent" aria-hidden="true" />
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.24em] text-accent">Local workspace</p>
          <h1 className="mt-3 font-display text-4xl font-semibold leading-tight md:text-5xl">
            Roomly workspace runs locally.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-text-secondary">
            Uploading a room, generating a design, signing in, and managing saved designs require your local Roomly services.
            Start the workspace on this computer, then open <span className="font-semibold text-text-primary">http://localhost:5173</span>.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link to="/">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to Roomly
              </Link>
            </Button>
            <a
              href="https://github.com/vinhquanguts-boop/Roomly"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
            >
              View local setup
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
