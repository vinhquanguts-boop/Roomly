import { useEffect, useRef } from 'react';
import { CloudUpload, ShoppingCart, Sparkles, WalletCards } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
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
    <section id="how-it-works" className="bg-bg-elevated px-5 py-16 md:px-8 md:py-20">
      <div className="mx-auto max-w-[1120px] text-center">
        <div data-reveal>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-accent">How it works</p>
          <h2 className="mt-3 font-display text-[32px] font-semibold leading-tight text-text-primary md:text-[38px]">
            Four simple steps to your dream room
          </h2>
        </div>

        <div ref={containerRef} className="relative mt-8 grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-6">
          <div
            ref={lineRef}
            className="pointer-events-none absolute left-[13%] right-[13%] top-[42px] hidden h-px bg-roomly-secondary md:block"
            aria-hidden="true"
          />
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="relative flex flex-col items-center">
                <span className="hiw-circle relative z-10 flex size-[70px] items-center justify-center rounded-full border border-roomly-secondary bg-bg-elevated text-accent shadow-[0_4px_18px_rgba(26,22,20,0.08)] md:size-[74px]">
                  <Icon className="size-8 stroke-[1.8]" aria-hidden="true" />
                </span>
                <h3 className="hiw-text mt-4 text-[15px] font-bold text-text-primary">{step.title}</h3>
                <p className="hiw-text mt-2 max-w-[190px] text-sm leading-5 text-text-secondary">{step.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
