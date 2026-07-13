import { Check, X } from 'lucide-react';
import { Link } from 'react-router';
import type { ReactNode } from 'react';
import { LightCard } from '@/components/LightCard';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { PLAN_FEATURES, type Plan } from '@/lib/api/subscription';

const plans: Plan[] = ['free', 'plus', 'professional'];

function Feature({ included, children }: { included: boolean; children: ReactNode }) {
  const Icon = included ? Check : X;
  return (
    <li className="flex items-start gap-2 text-sm text-text-secondary">
      <Icon className={included ? 'mt-0.5 size-4 shrink-0 text-success' : 'mt-0.5 size-4 shrink-0 text-text-tertiary'} aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}

export function StaticPricingPage() {
  return (
    <div className="min-h-dvh bg-bg-base text-text-primary">
      <Navigation />
      <main className="px-5 py-14 md:px-10 md:py-20">
        <section className="mx-auto max-w-5xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-accent">Pricing</p>
          <h1 className="mt-3 font-display text-[38px] font-semibold leading-tight md:text-[48px]">Choose your plan</h1>
          <p className="mx-auto mt-4 max-w-[580px] text-base leading-7 text-text-secondary">
            Plans are shown here for reference. Billing and the authenticated workspace are available in the local Roomly app.
          </p>
          <p className="mx-auto mt-5 max-w-[620px] rounded-lg border border-accent/20 bg-accent/5 px-4 py-3 text-sm leading-6 text-text-secondary">
            Public checkout is unavailable. Roomly does not collect payment details on this site.
          </p>
        </section>

        <section className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3" aria-label="Roomly plans">
          {plans.map((plan) => {
            const features = PLAN_FEATURES[plan];
            const designLabel = features.designsPerMonth === null ? 'Unlimited designs each month' : `${features.designsPerMonth} design${features.designsPerMonth === 1 ? '' : 's'} each month`;
            return (
              <LightCard key={plan} className={plan === 'plus' ? 'flex flex-col border-accent p-6 shadow-[0_16px_48px_rgba(199,104,74,0.16)]' : 'flex flex-col p-6'}>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-display text-xl font-semibold">{features.label}</h2>
                  {features.highlight ? <span className="rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">{features.highlight}</span> : null}
                </div>
                <p className="mt-5 font-display text-4xl font-semibold">
                  {features.price}<span className="ml-2 font-sans text-sm font-normal text-text-secondary">{features.priceNote}</span>
                </p>
                <ul className="mt-6 space-y-3 border-t border-border-subtle pt-5">
                  <Feature included>{designLabel}</Feature>
                  <Feature included={features.allRetailers}>{features.allRetailers ? 'All five retailers' : 'Kmart and AliExpress'}</Feature>
                  <Feature included={features.renderImage}>AI render image</Feature>
                  <Feature included={features.chatMessages !== 0}>{features.chatMessages === null ? 'Unlimited chat refinement' : features.chatMessages === 0 ? 'Chat refinement not included' : `${features.chatMessages} refinement messages per design`}</Feature>
                  <Feature included={features.canShare}>Share your design</Feature>
                </ul>
                <Button asChild className="mt-7 w-full" variant={plan === 'free' ? 'default' : 'outline'}>
                  <Link to="/design/upload">Use Roomly locally</Link>
                </Button>
              </LightCard>
            );
          })}
        </section>
      </main>
    </div>
  );
}
