import { useRef } from 'react';
import { Link } from 'react-router';
import {
  ArrowLeftRight,
  ArrowRight,
  Check,
  Clock3,
  CloudUpload,
  Lock,
  MessageSquare,
  ShieldCheck,
  ShoppingCart,
  Tag,
  WalletCards,
} from 'lucide-react';
import heroPreview from '@/assets/landing-reference/hero-before-after.webp';
import bedroomExample from '@/assets/landing-reference/example-bedroom.webp';
import livingExample from '@/assets/landing-reference/example-living.webp';
import studioExample from '@/assets/landing-reference/example-studio.webp';
import officeExample from '@/assets/landing-reference/example-office.webp';
import diningExample from '@/assets/landing-reference/example-dining.webp';
import cozyExample from '@/assets/landing-reference/example-cozy.webp';
import aliLogo from '@/assets/retailer-logos/ali.webp';
import amazonLogo from '@/assets/retailer-logos/amazon.webp';
import ikeaLogo from '@/assets/retailer-logos/ikea.webp';
import kmartLogo from '@/assets/retailer-logos/kmart.webp';
import taobaoLogo from '@/assets/retailer-logos/taobao.webp';
import { LightCard } from '@/components/LightCard';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { HowItWorks } from '@/features/landing/HowItWorks';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { cn } from '@/lib/utils';

const examples = [
  { title: 'Bedroom makeover', price: 'AUD $280', image: bedroomExample },
  { title: 'Small living room', price: 'AUD $320', image: livingExample },
  { title: 'Studio refresh', price: 'AUD $190', image: studioExample },
  { title: 'Home office', price: 'AUD $260', image: officeExample },
  { title: 'Dining nook', price: 'AUD $150', image: diningExample },
  { title: 'Cozy corner', price: 'AUD $110', image: cozyExample },
];

const comparisonRows = [
  {
    label: 'Built for real budgets',
    roomly: 'Starts from your budget. Every choice fits.',
    generic: "Shows expensive or fantasy items you can't afford.",
    icon: CloudUpload,
  },
  {
    label: 'Real products, real prices',
    roomly: 'Live prices from AliExpress, Amazon, IKEA, Kmart, Taobao.',
    generic: "Generic items or links that don't exist.",
    icon: WalletCards,
  },
  {
    label: 'Style that makes sense',
    roomly: 'Coherent room design, not random items.',
    generic: 'Random items with no design logic.',
    icon: ShoppingCart,
  },
  {
    label: 'Fast and easy',
    roomly: 'Done in about 5 minutes.',
    generic: 'Slow, complex, or confusing to use.',
    icon: Clock3,
  },
  {
    label: 'Learn as you go',
    roomly: 'See why each piece works and improve your taste.',
    generic: 'No explanation. Just a picture.',
    icon: MessageSquare,
  },
];

const retailers = [
  { name: 'AliExpress', logo: aliLogo, variant: 'square' },
  { name: 'Amazon', logo: amazonLogo, variant: 'wide' },
  { name: 'IKEA', logo: ikeaLogo, variant: 'wide' },
  { name: 'Kmart', logo: kmartLogo, variant: 'wide' },
  { name: 'Taobao', logo: taobaoLogo, variant: 'square' },
];

function ExampleCard({ title, price, image }: (typeof examples)[number]) {
  return (
    <LightCard className="overflow-hidden p-0" data-reveal>
      <div className="relative overflow-hidden rounded-t-lg bg-bg-inset">
        <img
          src={image}
          alt={`${title} before and after room design`}
          className="aspect-[1.8/1] w-full object-cover"
        />
        <span className="absolute left-1/2 top-1/2 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-bg-elevated text-text-primary shadow-card">
          <ArrowLeftRight className="size-3.5" aria-hidden="true" />
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <h3 className="text-sm font-bold text-text-primary">{title}</h3>
        <p className="shrink-0 text-sm font-semibold text-success">{price}</p>
      </div>
    </LightCard>
  );
}

export function LandingPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  useScrollReveal(pageRef);

  return (
    <div ref={pageRef} className="min-h-dvh overflow-x-hidden bg-bg-base text-text-primary">
      <Navigation />

      <main>
        <section className="bg-[radial-gradient(circle_at_18%_12%,rgba(254,252,249,0.95),transparent_34%),linear-gradient(180deg,#fbf8f2_0%,#f7f3ed_100%)] px-6 pb-12 pt-10 md:px-10 md:pb-14 md:pt-16">
          <div className="mx-auto grid max-w-[760px] items-center gap-12 lg:max-w-[1120px] md:grid-cols-[270px_1fr] lg:grid-cols-[0.72fr_1.28fr]">
            <div data-reveal>
              <h1 className="max-w-[360px] font-display text-[40px] font-semibold leading-[0.98] text-text-primary md:text-[42px]">
                Design a room you love.
                <span className="mt-1 block italic text-accent">On your budget.</span>
              </h1>
              <p className="mt-6 max-w-[390px] text-[15px] leading-7 text-text-primary">
                Upload a photo of your room, set your budget, and get an AI-generated design plan with real items from stores you already use.
              </p>
              <div className="mt-8">
                <Button asChild size="lg" className="h-12 rounded-md px-8 text-[15px] font-bold shadow-none">
                  <Link to="/design/upload">
                    Start your room design
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
              <div className="mt-7 grid max-w-[360px] grid-cols-3 gap-4 text-[11px] leading-tight text-text-primary">
                <div className="flex items-center gap-2">
                  <Tag className="size-5 shrink-0 stroke-[1.5]" aria-hidden="true" />
                  <span>Real products. Real prices.</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-5 shrink-0 stroke-[1.5]" aria-hidden="true" />
                  <span>Budget-first design.</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock3 className="size-5 shrink-0 stroke-[1.5]" aria-hidden="true" />
                  <span>Done in 5 minutes.</span>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-lg shadow-[0_14px_46px_rgba(26,22,20,0.14)]" data-reveal>
              <img
                src={heroPreview}
                alt="Before and after of a small rental room refreshed with warm budget decor"
                className="aspect-[1.28/1] w-full object-cover"
              />
            </div>
          </div>
        </section>

        <HowItWorks />

        <section id="examples" className="bg-[#f8f4ee] px-6 py-8 md:px-10 md:py-8">
          <div className="mx-auto max-w-[1040px]">
            <div className="text-center" data-reveal>
              <h2 className="font-display text-[32px] font-semibold leading-tight md:text-[38px]">
                Real rooms. Real results.
              </h2>
              <p className="mt-2 text-sm text-text-secondary">Designs created for real people on real budgets.</p>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {examples.map((example) => (
                <ExampleCard key={example.title} {...example} />
              ))}
            </div>

            <div className="mt-6 flex justify-center" data-reveal>
              <Button asChild variant="outline" className="h-10 min-w-44 border-accent text-accent hover:bg-accent hover:text-accent-foreground">
                <Link to="/design/upload">Explore more designs</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="bg-bg-elevated px-6 py-10 md:px-10 md:py-10">
          <div className="mx-auto max-w-[980px]">
            <h2 className="text-center font-display text-[32px] font-semibold leading-tight md:text-[38px]" data-reveal>
              Why Roomly is different
            </h2>

            <LightCard className="mt-6 overflow-hidden p-0" data-reveal>
              <div className="grid min-w-0 grid-cols-[0.72fr_0.84fr_0.78fr] text-[11px] sm:text-sm">
                <div className="border-b border-border-subtle bg-bg-elevated" />
                <div className="border-x border-accent bg-accent px-4 py-4 text-center font-bold text-accent-foreground">
                  Roomly
                </div>
                <div className="border-b border-border-subtle bg-bg-elevated px-4 py-4 text-center font-bold text-text-primary">
                  Generic AI tools
                </div>

                {comparisonRows.map((row) => {
                  const Icon = row.icon;
                  return (
                    <div key={row.label} className="contents">
                      <div className="flex items-center gap-2 border-b border-border-subtle px-2 py-4 font-bold text-text-primary sm:gap-4 sm:px-5">
                        <Icon className="size-4 shrink-0 stroke-[1.6] sm:size-5" aria-hidden="true" />
                        {row.label}
                      </div>
                      <div className="flex gap-2 border-x border-b border-accent/70 px-2 py-4 text-text-primary sm:gap-4 sm:px-5">
                        <Check className="mt-0.5 size-4 shrink-0 rounded-full bg-roomly-secondary p-1 text-bg-elevated sm:size-5" aria-hidden="true" />
                        <span className="leading-5">{row.roomly}</span>
                      </div>
                      <div className="border-b border-border-subtle px-2 py-4 leading-5 text-text-secondary sm:px-5">
                        {row.generic}
                      </div>
                    </div>
                  );
                })}
              </div>
            </LightCard>
          </div>
        </section>

        <section className="bg-bg-elevated px-6 pb-10 pt-2 md:px-10">
          <div className="mx-auto max-w-[980px] text-center">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-accent">Trusted stores you already use</p>
            <div className="mt-5 rounded-xl border border-border-subtle bg-[#fbf8f2] p-3 shadow-[0_12px_40px_rgba(26,22,20,0.06)] md:p-4">
              <div className="grid grid-cols-2 items-center gap-3 md:grid-cols-5">
                {retailers.map((retailer) => (
                  <div
                    key={retailer.name}
                    className={cn(
                      'group flex h-[84px] items-center justify-center rounded-lg border border-border-subtle bg-bg-elevated p-3 transition duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-card',
                      retailer.name === 'Taobao' && 'col-span-2 mx-auto w-full max-w-[152px] md:col-span-1 md:max-w-none',
                    )}
                  >
                    <img
                      src={retailer.logo}
                      alt={`${retailer.name} logo`}
                      className={
                        retailer.variant === 'square'
                          ? 'max-h-14 max-w-28 object-contain'
                          : 'max-h-12 max-w-32 object-contain'
                      }
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border-subtle bg-[#f4eee5] px-6 py-8 md:px-10">
        <div className="mx-auto grid max-w-[1120px] gap-8 text-sm text-text-primary md:grid-cols-[1.45fr_0.65fr_0.65fr_0.65fr_1.4fr]">
          <div>
            <Link to="/" className="font-display text-[28px] font-bold text-accent">
              Roomly
            </Link>
            <p className="mt-4 max-w-[190px] leading-6">AI room design for real life. Beautiful rooms. Real prices.</p>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-text-secondary">Product</h3>
            <div className="mt-3 space-y-2">
              <a href="#examples" className="block hover:text-accent">Explore designs</a>
              <a href="#how-it-works" className="block hover:text-accent">How it works</a>
              <Link to="/design/upload" className="block hover:text-accent">Pricing</Link>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-text-secondary">Company</h3>
            <div className="mt-3 space-y-2">
              <Link to="/" className="block hover:text-accent">About</Link>
              <Link to="/" className="block hover:text-accent">Blog</Link>
              <Link to="/" className="block hover:text-accent">Contact</Link>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-text-secondary">Legal</h3>
            <div className="mt-3 space-y-2">
              <Link to="/" className="block hover:text-accent">Privacy</Link>
              <Link to="/" className="block hover:text-accent">Terms</Link>
              <Link to="/" className="block hover:text-accent">Affiliate disclosure</Link>
            </div>
          </div>

          <div className="rounded-lg bg-secondary-muted/70 p-5">
            <div className="flex items-center gap-3 font-bold">
              <Lock className="size-5" aria-hidden="true" />
              Your privacy matters
            </div>
            <p className="mt-3 text-text-secondary">We never train on your photos.</p>
          </div>
        </div>
        <p className="mx-auto mt-8 max-w-[1120px] text-center text-xs text-text-secondary">&copy; {new Date().getFullYear()} Roomly. All rights reserved.</p>
      </footer>
    </div>
  );
}
