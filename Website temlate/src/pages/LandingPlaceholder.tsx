import { Link } from 'react-router';
import { ArrowRight, CheckCircle2, ImageUp, MessageCircle, ShoppingBag } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { LightCard } from '@/components/LightCard';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const foundationChecks = [
  'Hybrid AI mode configured',
  'Ollama models available locally',
  'DeepSeek key authenticated',
  'Replicate token authenticated',
];

const flowSteps = [
  { label: 'Upload', icon: ImageUp },
  { label: 'Design plan', icon: CheckCircle2 },
  { label: 'Shopping list', icon: ShoppingBag },
  { label: 'Refine', icon: MessageCircle },
];

export function LandingPlaceholder() {
  return (
    <div className="min-h-dvh bg-bg-base text-text-primary">
      <Navigation />

      <main>
        <section className="mx-auto grid min-h-[calc(100dvh-4rem)] w-full max-w-6xl items-center gap-10 px-5 py-14 md:grid-cols-[1.05fr_0.95fr] md:px-8">
          <div className="max-w-2xl">
            <h1 className="font-display text-5xl font-semibold leading-[1.02] text-text-primary md:text-7xl">
              Roomly
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-text-secondary">
              AI-assisted room design for renters, students, and first homes working with real budgets.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/design/upload">
                  Start a room
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="lg">
                    View setup
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Phase 0 foundation</DialogTitle>
                    <DialogDescription>
                      The app shell is being prepared for upload, analysis, generation, and shopping flows.
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <LightCard variant="large" className="p-5 md:p-6">
            <div className="rounded-lg bg-bg-inset p-4">
              <div className="aspect-[4/3] rounded-md border border-border-subtle bg-[linear-gradient(135deg,#E8D5CD_0%,#FEFCF9_45%,#DCE2D5_100%)]" />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {flowSteps.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.label}
                    className="flex items-center gap-2 rounded-md border border-border-subtle bg-bg-elevated px-3 py-3 text-sm font-medium text-text-secondary"
                  >
                    <Icon className="size-4 text-accent" aria-hidden="true" />
                    {step.label}
                  </div>
                );
              })}
            </div>
            <div className="mt-5 space-y-2">
              {foundationChecks.map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-text-secondary">
                  <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </LightCard>
        </section>
      </main>
    </div>
  );
}
