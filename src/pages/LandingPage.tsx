import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import {
  ArrowLeftRight,
  ArrowRight,
  Check,
  Clock3,
  CloudUpload,
  Lock,
  MessageSquare,
  MonitorCog,
  ShieldCheck,
  ShoppingCart,
  Tag,
  WalletCards,
} from 'lucide-react';
import gsap from 'gsap';
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
import { CursorTrail } from '@/components/CursorTrail';
import { Divider } from '@/components/Divider';
import { LightCard } from '@/components/LightCard';
import { Logo } from '@/components/Logo';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { HowItWorks } from '@/features/landing/HowItWorks';
import { useCountUp } from '@/hooks/useCountUp';
import { useHoverLift } from '@/hooks/useHoverLift';
import { useMagneticButton } from '@/hooks/useMagneticButton';
import { useParallax } from '@/hooks/useParallax';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useTextReveal } from '@/hooks/useTextReveal';
import { PLAN_FEATURES, type Plan } from '@/lib/api/subscription';
import { isStaticDeployment } from '@/lib/deployment';
import { cn } from '@/lib/utils';

const stats = [
  { value: 500, suffix: '+', label: 'rooms redesigned' },
  { value: 180, prefix: '$', label: 'average budget saved' },
  { value: 4.9, decimals: 1, label: 'star rating' },
];

function StatItem({
  value,
  prefix,
  suffix,
  decimals,
  label,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  label: string;
}) {
  const [count, ref] = useCountUp(value, decimals ?? 0);
  return (
    <div className="text-center" data-reveal>
      <p className="font-display text-3xl font-semibold text-text-primary md:text-4xl">
        {prefix}
        <span ref={ref}>{count}</span>
        {suffix}
      </p>
      <p className="mt-1 text-sm text-text-secondary">{label}</p>
    </div>
  );
}

const PRICING_PREVIEW: Array<{ plan: Plan; topFeatures: string[] }> = [
  { plan: 'free', topFeatures: ['1 design / month', 'Kmart & AliExpress', 'Community support'] },
  { plan: 'plus', topFeatures: ['10 designs / month', 'All 5 retailers', 'AI render image'] },
  { plan: 'professional', topFeatures: ['Unlimited designs', 'Unlimited chat refinement', 'Multi-room projects'] },
];

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

function ExampleCard({
  title,
  price,
  image,
  featured,
}: (typeof examples)[number] & { featured?: boolean }) {
  const hoverRef = useHoverLift<HTMLDivElement>();

  return (
    <div ref={hoverRef} className={cn(featured && 'lg:col-span-2')}>
      <LightCard className="h-full overflow-hidden p-0" data-reveal>
        <div className="relative overflow-hidden rounded-t-lg bg-bg-inset">
          {featured && (
            <div className="absolute left-3 top-3 z-10">
              <span className="rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                Editor's pick
              </span>
            </div>
          )}
          <img
            src={image}
            alt={`${title} before and after room design`}
            className={cn('aspect-[1.8/1] w-full object-cover transition-transform duration-500 hover:scale-105', featured && 'lg:aspect-[2.6/1]')}
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
    </div>
  );
}

export function LandingPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const heroTextRef = useRef<HTMLDivElement>(null);
  const heroImageRef = useRef<HTMLDivElement>(null);
  const heroBgRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const primaryCtaLabel = isStaticDeployment ? 'Use Roomly locally' : 'Start your room design';

  // Text reveal on H1
  const h1Ref = useTextReveal(0.1) as React.RefObject<HTMLHeadingElement>;
  // Scroll parallax on hero image
  const heroParallaxRef = useParallax<HTMLDivElement>(-0.08);
  // Magnetic CTA button
  const ctaWrapperRef = useMagneticButton<HTMLDivElement>(0.2);

  useScrollReveal(pageRef);

  // Morphing gradient hero background
  useEffect(() => {
    if (reduced || !heroBgRef.current) return;
    const tween = gsap.to(heroBgRef.current, {
      backgroundPosition: '100% 100%',
      duration: 12,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
    });
    return () => { tween.kill(); };
  }, [reduced]);

  useEffect(() => {
    if (reduced) return;
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl
      .fromTo(heroTextRef.current, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.75, clearProps: 'all' }, 0)
      .fromTo(heroImageRef.current, { opacity: 0, scale: 0.97 }, { opacity: 1, scale: 1, duration: 0.95, clearProps: 'all' }, 0.12);
    return () => { tl.kill(); };
  }, [reduced]);

  // Subtle hero image parallax on mouse move
  useEffect(() => {
    if (reduced) return;
    const handleMove = (event: MouseEvent) => {
      const xPct = (event.clientX / window.innerWidth - 0.5) * 12;
      const yPct = (event.clientY / window.innerHeight - 0.5) * 8;
      gsap.to(heroImageRef.current, { x: xPct, y: yPct, duration: 0.6, ease: 'power2.out' });
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, [reduced]);

  return (
    <div ref={pageRef} className="min-h-dvh overflow-x-hidden bg-bg-base text-text-primary">
      <CursorTrail />
      <Navigation />

      <main>
        <section
          ref={heroBgRef}
          style={{
            backgroundImage:
              'radial-gradient(ellipse at 20% 20%, rgba(199,104,74,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(123,139,111,0.07) 0%, transparent 50%), linear-gradient(160deg, #fdf9f3 0%, #f7f3ed 50%, #f5efe8 100%)',
            backgroundSize: '200% 200%',
            backgroundPosition: '0% 0%',
          }}
          className="px-6 pb-20 pt-16 md:px-10 md:pb-28 md:pt-24"
        >
          <div className="mx-auto grid max-w-[760px] items-center gap-12 lg:max-w-[1120px] md:grid-cols-[0.72fr_1.28fr] lg:grid-cols-[0.72fr_1.28fr]">
            <div ref={heroTextRef}>
              <h1
                ref={h1Ref}
                className="font-display text-hero font-semibold text-text-primary"
              >
                Design a room you love.
              </h1>
              <p className="mt-3 font-display text-[1.6rem] font-normal italic leading-tight text-accent opacity-80 md:text-[2rem]">
                On your budget.
              </p>
              <p className="mt-6 max-w-[390px] text-[15px] leading-7 text-text-primary">
                Upload a photo of your room, set your budget, and get an AI-generated design plan with real items from stores you already use.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div ref={ctaWrapperRef} className="inline-block">
                  <Button asChild size="lg" className="h-12 rounded-md px-8 text-[15px] font-bold shadow-none">
                    <Link to="/design/upload">
                      {primaryCtaLabel}
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
                {isStaticDeployment ? (
                  <Link to="/design/upload" className="flex items-center gap-2 text-sm font-semibold text-text-secondary transition-colors hover:text-accent">
                    <MonitorCog className="size-4" />
                    View local workspace setup
                  </Link>
                ) : (
                  <Link to="/chat" className="flex items-center gap-2 text-sm font-semibold text-text-secondary transition-colors hover:text-accent">
                    <MessageSquare className="size-4" />
                    Not sure? Chat with us first
                  </Link>
                )}
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

            <div ref={heroImageRef} className="relative">
              <div ref={heroParallaxRef} className="relative overflow-hidden rounded-lg shadow-[0_14px_46px_rgba(26,22,20,0.14)]">
                <img
                  src={heroPreview}
                  alt="Before and after of a small rental room refreshed with warm budget decor"
                  className="aspect-[1.28/1] w-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border-subtle bg-bg-elevated px-6 py-12 md:px-10 md:py-16">
          <div className="mx-auto grid max-w-[720px] grid-cols-3 gap-4">
            {stats.map((stat) => (
              <StatItem key={stat.label} {...stat} />
            ))}
          </div>
        </section>

        <HowItWorks />

        <section id="examples" className="bg-[#f8f4ee] px-6 py-20 md:px-10 md:py-28">
          <div className="mx-auto max-w-[1040px]">
            <div className="text-center" data-reveal>
              <p className="text-overline text-accent">Real results</p>
              <Divider className="my-3" />
              <h2 className="font-display text-display font-semibold">
                Real rooms. Real budgets.
              </h2>
              <p className="mt-3 text-sm text-text-secondary">Designs created for real people on real budgets.</p>
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {examples.map((example, i) => (
                <ExampleCard key={example.title} {...example} featured={i === 0} />
              ))}
            </div>

            <div className="mt-8 flex justify-center" data-reveal>
              <Button asChild variant="outline" className="h-10 min-w-44 border-accent text-accent hover:bg-accent hover:text-accent-foreground">
                <Link to="/design/upload">Explore more designs</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="bg-bg-elevated px-6 py-20 md:px-10 md:py-28">
          <div className="mx-auto max-w-[980px]">
            <div className="text-center" data-reveal>
              <p className="text-overline text-accent">Comparison</p>
              <Divider className="my-3" />
              <h2 className="font-display text-display font-semibold">
                Why Roomly is different
              </h2>
            </div>

            <LightCard className="mt-8 overflow-hidden p-0" data-reveal>
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

        <section className="bg-bg-base px-6 py-20 md:px-10 md:py-28">
          <div className="mx-auto max-w-[980px] text-center">
            <div data-reveal>
              <p className="text-overline text-accent">Pricing</p>
              <Divider className="my-3" />
              <h2 className="font-display text-display font-semibold">
                Simple, transparent pricing
              </h2>
            </div>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {PRICING_PREVIEW.map(({ plan, topFeatures }) => (
                <LightCard key={plan} className="p-5 text-left" data-reveal>
                  <p className="font-display text-lg font-semibold text-text-primary">
                    {PLAN_FEATURES[plan].label}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-text-primary">
                    {PLAN_FEATURES[plan].price}
                    <span className="ml-1 text-sm font-normal text-text-secondary">
                      {PLAN_FEATURES[plan].priceNote}
                    </span>
                  </p>
                  <ul className="mt-4 space-y-1.5 text-sm text-text-secondary">
                    {topFeatures.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </LightCard>
              ))}
            </div>
            <Link
              to="/pricing"
              className="mt-6 inline-block text-sm font-semibold text-accent hover:text-accent-hover"
              data-reveal
            >
              See full pricing →
            </Link>
          </div>
        </section>

        <section className="bg-bg-elevated px-6 pb-20 pt-0 md:px-10">
          <div className="mx-auto max-w-[980px] text-center">
            <p className="text-overline text-accent">Trusted stores you already use</p>
            <div className="mt-5 overflow-hidden rounded-xl border border-border-subtle bg-[#fbf8f2] p-3 shadow-[0_12px_40px_rgba(26,22,20,0.06)] md:p-4">
              <div className="flex w-max animate-marquee gap-3">
                {[...retailers, ...retailers].map((retailer, index) => (
                  <div
                    key={`${retailer.name}-${index}`}
                    className="flex h-[84px] w-[168px] shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-bg-elevated p-3 transition duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-card"
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
        <div className="mx-auto grid max-w-[1120px] grid-cols-2 gap-8 text-sm text-text-primary md:grid-cols-[1.45fr_0.65fr_0.65fr_0.65fr] lg:grid-cols-[1.45fr_0.65fr_0.65fr_0.65fr_1.4fr]">
          <div>
            <Link to="/" className="transition-opacity hover:opacity-80" aria-label="Roomly home">
              <Logo variant="full" size="sm" color="accent" />
            </Link>
            <p className="mt-4 max-w-[190px] leading-6">AI room design for real life. Beautiful rooms. Real prices.</p>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-text-secondary">Product</h3>
            <div className="mt-3 space-y-2">
              <a href="#examples" className="block hover:text-accent">Explore designs</a>
              <a href="#how-it-works" className="block hover:text-accent">How it works</a>
              <Link to="/pricing" className="block hover:text-accent">Pricing</Link>
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
              <Link to="/privacy" className="block hover:text-accent">Privacy</Link>
              <Link to="/terms" className="block hover:text-accent">Terms</Link>
              <Link to="/" className="block hover:text-accent">Affiliate disclosure</Link>
            </div>
          </div>

          <div className="col-span-2 rounded-lg bg-secondary-muted/70 p-5 md:col-span-1 lg:col-auto">
            <div className="flex items-center gap-3 font-bold">
              <Lock className="size-5" aria-hidden="true" />
              Your privacy matters
            </div>
            <p className="mt-3 text-text-secondary">We never train on your photos.</p>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-[1120px] border-t border-border-subtle/40 pt-8 text-center">
          <p className="font-display text-xl italic text-text-secondary opacity-60">
            "A beautiful room, on your budget."
          </p>
          <p className="mt-4 text-center text-xs text-text-secondary">
            &copy; {new Date().getFullYear()} Roomly. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
