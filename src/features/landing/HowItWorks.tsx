import { useEffect, useRef } from 'react';
import { CloudUpload, ShoppingCart, Sparkles, WalletCards } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Divider } from '@/components/Divider';
import { useReducedMotion } from '@/hooks/useReducedMotion';

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    title: '1. Upload',
    description: 'Upload a photo of your room. We analyze what you have.',
    icon: CloudUpload,
  },
  {
    title: '2. Set your budget',
    description: 'Tell us your budget, room type, and style preference.',
    icon: WalletCards,
  },
  {
    title: '3. AI generates',
    description: 'Our AI creates a design plan and realistic preview just for you.',
    icon: Sparkles,
  },
  {
    title: '4. Shop real items',
    description: 'Get a shoppable list from AliExpress, Amazon, IKEA, Kmart, and Taobao.',
    icon: ShoppingCart,
  },
];

export function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || !containerRef.current) return;

    const ctx = gsap.context(() => {
      // Line draws from left to right
      gsap.fromTo(
        lineRef.current,
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 1.1,
          ease: 'power2.inOut',
          transformOrigin: 'left center',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 80%',
            once: true,
          },
        }
      );

      // Icon circles pop in with back easing, staggered
      gsap.fromTo(
        '.hiw-circle',
        { scale: 0, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.48,
          stagger: 0.13,
          ease: 'back.out(2)',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 80%',
            once: true,
          },
        }
      );

      // Step titles and descriptions fade up with slight delay
      gsap.fromTo(
        '.hiw-text',
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: 0.45,
          stagger: 0.1,
          ease: 'power2.out',
          delay: 0.2,
          clearProps: 'all',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 80%',
            once: true,
          },
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, [reduced]);

  return (
    <section id="how-it-works" className="bg-bg-elevated px-5 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-[1120px] text-center">
        <div data-reveal>
          <p className="text-overline text-accent">How it works</p>
          <Divider className="my-3" />
          <h2 className="font-display text-display font-semibold text-text-primary">
            Four simple steps to your dream room
          </h2>
        </div>

        {/* Desktop: horizontal timeline */}
        <div ref={containerRef} className="relative mt-10 hidden grid-cols-4 gap-6 md:grid">
          <div
            ref={lineRef}
            className="pointer-events-none absolute left-[13%] right-[13%] top-[42px] h-px bg-roomly-secondary"
            aria-hidden="true"
          />
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="relative flex flex-col items-center">
                <span className="hiw-circle relative z-10 flex size-[74px] items-center justify-center rounded-full border border-roomly-secondary bg-bg-elevated text-accent shadow-[0_4px_18px_rgba(26,22,20,0.08)]">
                  <Icon className="size-8 stroke-[1.8]" aria-hidden="true" />
                </span>
                <h3 className="hiw-text mt-4 text-[15px] font-bold text-text-primary">{step.title}</h3>
                <p className="hiw-text mt-2 max-w-[190px] text-sm leading-5 text-text-secondary">{step.description}</p>
              </div>
            );
          })}
        </div>

        {/* Mobile: vertical timeline */}
        <div className="relative mt-10 flex flex-col gap-0 md:hidden">
          {/* Vertical connector line */}
          <div
            className="pointer-events-none absolute bottom-0 left-[35px] top-0 w-px bg-roomly-secondary"
            aria-hidden="true"
          />
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className={`relative flex items-start gap-5 text-left ${i < steps.length - 1 ? 'pb-8' : ''}`}>
                <span className="relative z-10 flex size-[70px] shrink-0 items-center justify-center rounded-full border border-roomly-secondary bg-bg-elevated text-accent shadow-[0_4px_18px_rgba(26,22,20,0.08)]">
                  <Icon className="size-7 stroke-[1.8]" aria-hidden="true" />
                </span>
                <div className="pt-3">
                  <h3 className="text-[15px] font-bold text-text-primary">{step.title}</h3>
                  <p className="mt-1 text-sm leading-5 text-text-secondary">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
