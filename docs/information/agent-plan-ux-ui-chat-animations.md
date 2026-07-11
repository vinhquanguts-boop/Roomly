# Roomly — Agent Implementation Plan
## UX/UI Refinement · Creative Animations · Pre-Design AI Chat · Description Field

> **For Claude Code.** Self-contained. Do not ask questions — use all specifications as written. Implement everything in the order given.

---

## Project Context

**Roomly** is an AI-powered home décor app: upload photo → budget/setup → style quiz → AI design plan → shoppable products.

**Tech stack:** React 19, Vite, TypeScript, Tailwind CSS v3.4, shadcn/ui, GSAP v3.15 + Lenis, react-router v7, @tanstack/react-query v5, `better-auth`, `react-hook-form` + `zod`, `sonner` for toasts.

**Key paths:**
- `src/pages/` — all page components
- `src/components/` — shared components
- `src/features/` — feature modules (chat, landing, design, products, upload)
- `src/hooks/` — usePageEntrance, useScrollReveal, useReducedMotion, useCountUp, useHoverLift, useStaggerReveal
- `src/lib/api/index.ts` — all API functions and types

**Design tokens:**
- Terracotta: `#C7684A` → `text-accent`, `bg-accent`
- Cream: `#F7F3ED` → `bg-bg-base`
- Muted: `#E8D5CD` → `bg-secondary-muted`
- Sage: `#7B8B6F` (used directly or as `roomly-secondary`)
- Charcoal: `#1A1614` → `text-text-primary`
- Typography: `font-display` = Fraunces serif, body = Inter

**Existing animations (already implemented — do not duplicate):**
- `usePageEntrance` — fade-up on mount
- `useScrollReveal` — `data-reveal` elements via ScrollTrigger batch
- `useCountUp` — number count animation
- `useHoverLift` — GSAP hover lift hook
- `useStaggerReveal` — stagger children on mount
- LandingPage hero entrance + mouse parallax
- HowItWorks line draw + step pop
- QuizPage slide transition between questions
- UploadPage dropzone pulse + scan line
- SetupPage currency slide + budget bounce
- ResultPage hero/left/right stagger

---

# PART 1 — UI/UX: Make It Look Less AI-Generic

The goal is to shift Roomly from "competent AI tool" to "premium creative brand" — editorial feel, considered whitespace, human warmth, magazine typography, and small personality moments throughout.

## 1A. Typography Hierarchy Overhaul

The current font sizes are functional but lack editorial range. Upgrade to a wider scale.

### `src/index.css` — Add typographic scale utilities

```css
/* === Editorial Typography === */
.text-hero {
  font-size: clamp(2.75rem, 6vw, 5rem);
  line-height: 0.95;
  letter-spacing: -0.02em;
}
.text-display {
  font-size: clamp(2rem, 4.5vw, 3.5rem);
  line-height: 1.0;
  letter-spacing: -0.015em;
}
.text-headline {
  font-size: clamp(1.5rem, 3vw, 2.25rem);
  line-height: 1.1;
  letter-spacing: -0.01em;
}
.text-overline {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.28em;
  text-transform: uppercase;
}
```

### LandingPage hero heading — apply new scale

Current:
```tsx
<h1 className="max-w-[360px] font-display text-[40px] font-semibold leading-[0.98] text-text-primary md:text-[42px]">
  Design a room you love.
  <span className="mt-1 block italic text-accent">On your budget.</span>
</h1>
```

Replace with:
```tsx
<h1 className="font-display text-hero font-semibold text-text-primary max-w-[520px]">
  Design a room{' '}
  <em className="not-italic text-accent">you love.</em>
  <br />
  <span className="font-normal italic opacity-80">On your budget.</span>
</h1>
```

The second line becomes a softer, italic contrast to the main bold. This is an editorial move that breaks the "AI output" pattern.

### Section headings — use `text-display` instead of fixed `text-[32px]`

In LandingPage, ResultPage, PricingPage: replace `text-[32px] md:text-[38px]` with `font-display text-display`. This uses the responsive clamp so headings scale properly across viewports.

---

## 1B. Spacing Rhythm — Section Breathing Room

Current sections feel cramped (py-16 is the standard). Expand key sections.

In `LandingPage.tsx`:
- Hero section: `pt-16 pb-20 md:pt-24 md:pb-28`
- Stats section: `py-12 md:py-16`
- Examples section: `py-20 md:py-28`
- HowItWorks: `py-20 md:py-28`
- Comparison: `py-20 md:py-28`

Add a horizontal rule / visual breather between every 2 sections using a `<Divider />` component:

### New file: `src/components/Divider.tsx`

```tsx
import { cn } from '@/lib/utils';

export function Divider({ className }: { className?: string }) {
  return (
    <div className={cn('mx-auto max-w-[120px]', className)}>
      <div className="h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
    </div>
  );
}
```

Use `<Divider className="my-2" />` inside section headings between the overline and the main heading to add visual structure.

---

## 1C. Remove "Generic AI" Visual Patterns

These specific elements look like AI-tool defaults — replace them.

### 1C-1. Replace icon-in-circle patterns on SetupPage analysis cards

The `AnalysisSummary` cards use `<CheckCircle2>`, `<Ruler>`, `<Palette>`, `<SunMedium>` icons with plain text. This is functional but generic.

Replace each LightCard header pattern:
```tsx
// Before:
<div className="flex items-center gap-3">
  <CheckCircle2 className="size-5 text-success" />
  <h2 className="font-bold">We detected</h2>
</div>

// After — editorial label style:
<div>
  <p className="text-overline text-accent">Detected</p>
  <h2 className="mt-1 font-display text-lg font-semibold text-text-primary">Your room</h2>
</div>
```

Apply this pattern to all 5 analysis cards: remove the icon prefix, use `text-overline` eyebrow + `font-display` subheading.

### 1C-2. Replace generic "Step N" labels with descriptive eyebrows

Current pattern:
```tsx
<p className="text-xs font-bold uppercase tracking-[0.24em] text-accent">Step 2</p>
<h1 className="mt-3 font-display text-[38px]...">Review your room analysis</h1>
```

Replace `Step N` with a specific descriptive eyebrow. Update across all pages:

| Page | Old eyebrow | New eyebrow |
|---|---|---|
| UploadPage | `Step 1` | `Your space` |
| SetupPage | `Step 2` | `Room details` |
| QuizPage | `Step 3` | `Your taste` |
| ResultPage | `Your design` | `Your design` (keep) |

### 1C-3. Result page hero — remove "Sparkles" placeholder text

Currently when there is no `renderUrl`, a Sparkles icon with no text shows. Replace with a visually interesting placeholder:

```tsx
// Replace Sparkles placeholder in ResultPage hero image panel with:
<div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-4 bg-secondary-muted/30 px-8 text-center">
  <div className="relative size-16">
    <div className="absolute inset-0 rounded-full bg-accent/10" />
    <div className="absolute inset-2 rounded-full bg-accent/20" />
    <Sparkles className="absolute inset-0 m-auto size-7 text-accent" />
  </div>
  <div>
    <p className="font-display text-base font-semibold text-text-primary">Render preview</p>
    <p className="mt-1 text-xs leading-5 text-text-secondary">Available with Roomly Plus</p>
  </div>
</div>
```

### 1C-4. Replace generic "LightCard" list layouts with editorial prose-style cards

On the ResultPage, the design principles section (if visible) currently shows a bullet list. Replace with a quote-block style:

```tsx
// In the left column, design principles:
// Before: <li key={p}>{p}</li>

// After: Staggered italic quotes
<div className="space-y-3">
  {plan.designPrinciples.map((principle, i) => (
    <div key={i} className="flex gap-3">
      <span className="mt-1.5 block h-px w-6 shrink-0 bg-accent/50" />
      <p className="text-sm italic leading-6 text-text-secondary">{principle}</p>
    </div>
  ))}
</div>
```

### 1C-5. Navigation — elevate from utility to brand bar

In `src/components/Navigation.tsx`, upgrade the nav:

- Increase logo size: `size="md"` instead of `size="sm"` if a `md` variant exists, or increase the SVG viewbox scale directly
- Background: Change from simple `bg-bg-elevated` to `bg-bg-base/90 backdrop-blur-md` for a glassmorphism effect that feels more premium
- Border: Change `border-b border-border-subtle` to `border-b border-border-subtle/60` for a lighter feel
- Add a very subtle `box-shadow: 0 1px 0 rgba(199,104,74,0.06)` to the nav bottom border using `shadow-[0_1px_0_rgba(199,104,74,0.06)]`

---

## 1D. LandingPage — Editorial Redesign Touches

### 1D-1. Hero section — add a decorative element

Behind the hero image, add a terracotta dot-matrix element:

```tsx
// In the hero section, around the heroImageRef div:
<div ref={heroImageRef} className="relative">
  {/* Decorative dot cluster behind image */}
  <div
    className="dot-matrix pointer-events-none absolute -bottom-6 -right-6 size-40 opacity-50"
    aria-hidden="true"
  />
  <div className="relative overflow-hidden rounded-lg shadow-[0_14px_46px_rgba(26,22,20,0.14)]">
    <img ... />
  </div>
</div>
```

### 1D-2. HowItWorks — upgrade to vertical timeline on mobile

Current: 2-col grid on mobile, 4-col on desktop. The 2-col layout wraps badly.

In `src/features/landing/HowItWorks.tsx`, add a vertical layout for mobile:

```tsx
// Desktop: existing horizontal layout (md:grid-cols-4) — keep
// Mobile: show as vertical list with left-side connector line

// Wrap step in:
<div key={step.title} className="relative flex flex-col items-center md:items-start">
  // Mobile line: absolute left-1/2 top-[70px] h-full w-px bg-roomly-secondary/30 md:hidden
```

Actually implement this as: the `.hiw-circle` icons on mobile are left-aligned, with a thin vertical connector between them, and text to the right.

Full mobile structure change:
```tsx
<div ref={containerRef} className="relative mt-8 grid grid-cols-1 gap-0 md:grid-cols-4 md:gap-6">
  {/* Desktop connector line — unchanged */}
  <div ref={lineRef} className="..." />

  {steps.map((step, index) => {
    const Icon = step.icon;
    return (
      <div key={step.title} className="relative flex items-start gap-5 pb-10 md:flex-col md:items-center md:gap-0 md:pb-0">
        {/* Mobile vertical connector */}
        {index < steps.length - 1 && (
          <div className="absolute bottom-0 left-[34px] top-[70px] w-px bg-roomly-secondary/30 md:hidden" aria-hidden="true" />
        )}
        <span className="hiw-circle relative z-10 flex size-[68px] shrink-0 items-center justify-center rounded-full border border-roomly-secondary bg-bg-elevated text-accent shadow-[0_4px_18px_rgba(26,22,20,0.08)]">
          <Icon className="size-8 stroke-[1.8]" aria-hidden="true" />
        </span>
        <div className="pt-3 md:pt-0 md:text-center">
          <h3 className="hiw-text text-[15px] font-bold text-text-primary md:mt-4">{step.title}</h3>
          <p className="hiw-text mt-1 max-w-[260px] text-sm leading-5 text-text-secondary md:max-w-[190px] md:text-center">{step.description}</p>
        </div>
      </div>
    );
  })}
</div>
```

### 1D-3. Examples section — add a "featured" editorial label

For the first (featured) example card, add an editorial pill badge:

```tsx
// In ExampleCard, when featured === true:
{featured && (
  <div className="absolute left-3 top-3">
    <span className="rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
      Editor's pick
    </span>
  </div>
)}
```

### 1D-4. Footer — add a brand statement line

Above the copyright line, add:
```tsx
<div className="mx-auto mt-8 max-w-[1120px] border-t border-border-subtle/40 pt-8 text-center">
  <p className="font-display text-xl italic text-text-secondary opacity-60">
    "A beautiful room, on your budget."
  </p>
  <p className="mt-4 text-center text-xs text-text-secondary">...</p>
</div>
```

---

## 1E. Quiz Page — Personality Upgrade

### 1E-1. Option images — add hover overlay with caption

When hovering a quiz option, slide up a frosted overlay that shows the caption more prominently:

```tsx
// On each option button, add inner overlay:
<div className="relative overflow-hidden rounded-t-lg">
  <img src={option.image} alt="" className="h-36 w-full object-cover transition-transform duration-500 group-hover:scale-105" />
  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
    <p className="p-3 text-sm font-semibold italic text-white">{option.caption}</p>
  </div>
</div>
```

Add `group` class to the outer `<button>` element.

### 1E-2. Question progress — editorial "3 / 5" display

Replace the dot indicators with a clean fraction display alongside the dots:

```tsx
// In the dots row, add label to the left:
<div className="mt-5 flex items-center justify-center gap-4">
  <span className="text-overline text-text-secondary">
    {currentIndex + 1} / {QUIZ_QUESTIONS.length}
  </span>
  <div className="flex gap-2">
    {/* existing dots */}
  </div>
</div>
```

---

# PART 2 — Creative Animation System

These animations should feel like a premium editorial/creative website (think: Loewe, Airbnb Newsroom, The Pudding) — purposeful, smooth, never gratuitous.

## 2A. Magnetic Button Effect

On the primary CTA button (the landing page "Start your room design" button), add a magnetic pull effect:

### New file: `src/hooks/useMagneticButton.ts`

```typescript
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useReducedMotion } from './useReducedMotion';

export function useMagneticButton<T extends HTMLElement>(strength = 0.3) {
  const ref = useRef<T>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;

    function onMove(e: MouseEvent) {
      const rect = el!.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) * strength;
      const dy = (e.clientY - cy) * strength;
      gsap.to(el, { x: dx, y: dy, duration: 0.4, ease: 'power2.out' });
    }

    function onLeave() {
      gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)', clearProps: 'all' });
    }

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);

    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
      gsap.killTweensOf(el);
    };
  }, [strength, reduced]);

  return ref;
}
```

Usage in LandingPage hero:
```tsx
const ctaRef = useMagneticButton<HTMLAnchorElement>(0.25);
// Apply ref={ctaRef} to the <a> inside <Button asChild>
// Note: since Button uses asChild, pass the ref to a wrapper div around Button instead
```

---

## 2B. Text Splitting — Letter-by-Letter Hero Animation

For the landing page H1 heading, animate each word appearing sequentially rather than the whole block fading in:

### New file: `src/hooks/useTextReveal.ts`

```typescript
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useReducedMotion } from './useReducedMotion';

/**
 * Splits the text content of an element into word spans and animates them in.
 * The element must have plain text children only (no nested elements).
 */
export function useTextReveal(delay = 0) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;

    const originalHTML = el.innerHTML;
    // Split by words
    const words = el.innerText.split(/(\s+)/);
    el.innerHTML = words
      .map((word) =>
        word.trim()
          ? `<span class="inline-block overflow-hidden"><span class="inline-block translate-y-full opacity-0">${word}</span></span>`
          : word
      )
      .join('');

    const innerSpans = el.querySelectorAll('span > span');

    const tween = gsap.to(innerSpans, {
      y: 0,
      opacity: 1,
      duration: 0.6,
      stagger: 0.06,
      ease: 'power3.out',
      delay,
      clearProps: 'all',
      onComplete: () => {
        // Restore original HTML after animation completes so screen readers see normal text
        el.innerHTML = originalHTML;
      },
    });

    return () => {
      tween.kill();
      el.innerHTML = originalHTML;
    };
  }, [delay, reduced]);

  return ref;
}
```

Usage in LandingPage:
```tsx
const h1Ref = useTextReveal(0.1); // slight delay after page load
// Apply: <h1 ref={h1Ref as React.RefObject<HTMLHeadingElement>} className="font-display text-hero ...">
// The h1 must contain only text — move the <span> for the italic/accent into a sibling element
```

**Important:** The `useTextReveal` hook replaces the children with split spans temporarily. The `h1` text must be a single string for this to work. Move the italic `"On your budget."` to a separate `<p>` element below the `h1` instead of a `<span>` inside it.

---

## 2C. Scroll-Linked Parallax Sections

Add depth to the landing page by making background elements scroll at different rates.

### New file: `src/hooks/useParallax.ts`

```typescript
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from './useReducedMotion';

gsap.registerPlugin(ScrollTrigger);

/**
 * Moves an element at `speed` relative to scroll. 
 * speed = 0.2 means moves 20% of scroll distance (slow parallax)
 * speed = -0.1 means moves opposite to scroll
 */
export function useParallax<T extends HTMLElement>(speed = 0.15) {
  const ref = useRef<T>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;

    const tween = gsap.to(el, {
      yPercent: speed * 100,
      ease: 'none',
      scrollTrigger: {
        trigger: el,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });

    return () => {
      tween.kill();
      ScrollTrigger.getAll().forEach((t) => {
        if (t.vars.trigger === el) t.kill();
      });
    };
  }, [speed, reduced]);

  return ref;
}
```

Usage in LandingPage:
```tsx
// The hero image scrolls slightly slower than the text for depth
const heroScrollRef = useParallax<HTMLDivElement>(-0.08);
// Apply alongside heroImageRef: both refs can be combined using a callback ref

// The stats section background element scrolls faster:
const statsBgRef = useParallax<HTMLDivElement>(0.12);
```

---

## 2D. Morphing Background Gradient

The LandingPage hero background currently uses a static gradient. Replace with a slowly animating gradient that gives the page life:

In LandingPage, find the hero section background div and animate its gradient:

```tsx
const heroBgRef = useRef<HTMLElement>(null);

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
```

Change the hero section background from static gradient to animated:
```tsx
<section
  ref={heroBgRef}
  style={{
    backgroundImage: 'radial-gradient(ellipse at 20% 20%, rgba(199,104,74,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(123,139,111,0.07) 0%, transparent 50%), linear-gradient(160deg, #fdf9f3 0%, #f7f3ed 50%, #f5efe8 100%)',
    backgroundSize: '200% 200%',
    backgroundPosition: '0% 0%',
  }}
  className="px-6 pb-12 pt-10 md:px-10 md:pb-20 md:pt-24"
>
```

---

## 2E. Cursor Trail Effect (Creative Touch)

On the LandingPage only, add a subtle terracotta cursor trail:

### New file: `src/components/CursorTrail.tsx`

```tsx
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const TRAIL_COUNT = 6;

export function CursorTrail() {
  const dotsRef = useRef<HTMLDivElement[]>([]);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;

    // Only show on non-touch devices
    if (window.matchMedia('(hover: none)').matches) return;

    const dots = dotsRef.current;
    let mouseX = 0;
    let mouseY = 0;

    function onMove(e: MouseEvent) {
      mouseX = e.clientX;
      mouseY = e.clientY;
    }

    window.addEventListener('mousemove', onMove);

    let raf: number;
    const positions = dots.map(() => ({ x: 0, y: 0 }));

    function tick() {
      positions[0].x = mouseX;
      positions[0].y = mouseY;

      for (let i = 1; i < TRAIL_COUNT; i++) {
        positions[i].x += (positions[i - 1].x - positions[i].x) * 0.3;
        positions[i].y += (positions[i - 1].y - positions[i].y) * 0.3;
      }

      dots.forEach((dot, i) => {
        if (!dot) return;
        const opacity = 1 - i / TRAIL_COUNT;
        const size = 8 - i;
        dot.style.transform = `translate(${positions[i].x - size / 2}px, ${positions[i].y - size / 2}px)`;
        dot.style.opacity = String(opacity * 0.35);
        dot.style.width = `${size}px`;
        dot.style.height = `${size}px`;
      });

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  if (reduced) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden" aria-hidden="true">
      {Array.from({ length: TRAIL_COUNT }).map((_, i) => (
        <div
          key={i}
          ref={(el) => { if (el) dotsRef.current[i] = el; }}
          className="absolute rounded-full bg-accent"
          style={{ width: 8, height: 8, opacity: 0, willChange: 'transform' }}
        />
      ))}
    </div>
  );
}
```

Use in LandingPage only (not on flow pages — it would be distracting there):
```tsx
// At the top of LandingPage return:
return (
  <div ref={pageRef} className="min-h-dvh overflow-x-hidden bg-bg-base text-text-primary">
    <CursorTrail />
    <Navigation />
    ...
  </div>
);
```

---

## 2F. Card Tilt Effect — Quiz Options

On QuizPage, when hovering an option card, apply a subtle 3D tilt based on mouse position within the card:

### New file: `src/hooks/useCardTilt.ts`

```typescript
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useReducedMotion } from './useReducedMotion';

export function useCardTilt<T extends HTMLElement>(maxTilt = 6) {
  const ref = useRef<T>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;

    function onMove(e: MouseEvent) {
      const rect = el!.getBoundingClientRect();
      const xPct = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const yPct = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      gsap.to(el, {
        rotateY: xPct * maxTilt,
        rotateX: -yPct * maxTilt,
        transformPerspective: 800,
        duration: 0.3,
        ease: 'power2.out',
      });
    }

    function onLeave() {
      gsap.to(el, {
        rotateY: 0,
        rotateX: 0,
        duration: 0.5,
        ease: 'elastic.out(1, 0.5)',
        clearProps: 'all',
      });
    }

    el.style.willChange = 'transform';
    el.style.transformStyle = 'preserve-3d';
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);

    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
      gsap.killTweensOf(el);
    };
  }, [maxTilt, reduced]);

  return ref;
}
```

In `QuizPage.tsx`, apply to each option button:
```tsx
// Create a wrapper component for quiz options:
function QuizOption({ option, selected, onChoose }: {...}) {
  const tiltRef = useCardTilt<HTMLButtonElement>(4);
  
  return (
    <button
      ref={tiltRef}
      type="button"
      className={...}
      onClick={() => onChoose(option.id)}
    >
      ...
    </button>
  );
}
```

---

## 2G. Smooth Number Reveal on ResultPage Stats

On the ResultPage, the 3-stat row (Budget / Matched Total / Budget %) should each count up when they enter view. Already partially planned — full implementation:

```tsx
// In ResultPage.tsx, for the stats row:
const [countTotal, totalRef] = useCountUp(shoppingTotal, 0);
const [countBudget, budgetRef] = useCountUp(design.budget, 0);
const [countPct, pctRef] = useCountUp(budgetPct, 0);

// Apply refs to the value spans in each stat card
// Format with currency: use formatMoney(countTotal, currency) — this will count up in currency format
```

---

## 2H. Staggered Text Lines — GeneratingPage Steps

In GeneratingPage, when each step completes and the next becomes active, the text label should split into two parts — a crossed-out completed step and an animated new step:

```tsx
// Completed steps show a strikethrough with opacity 0.4
// Active step animates in with useTextReveal
// The transition: old step fades + strikes, new step slides up

// Step rendering:
{STEPS.map((step, i) => {
  const isComplete = stepRank > i;
  const isActive = stepRank === i;
  
  return (
    <div key={step.status} className={cn(
      'flex items-center gap-3 transition-all duration-500',
      isComplete ? 'opacity-40' : isActive ? 'opacity-100' : 'opacity-20'
    )}>
      <div className={cn(
        'size-2.5 rounded-full transition-all duration-500',
        isComplete ? 'bg-success' : isActive ? 'bg-accent ring-4 ring-accent/20' : 'bg-border-subtle'
      )} />
      <span className={cn(
        'text-sm font-semibold',
        isComplete ? 'line-through' : ''
      )}>
        {step.label}
      </span>
    </div>
  );
})}
```

---

## 2I. Page Leave Transition

Before navigating away from any page, play a quick fade-out. Use the router's `useNavigate` wrapper:

### New file: `src/hooks/useAnimatedNavigate.ts`

```typescript
import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import gsap from 'gsap';
import { useReducedMotion } from './useReducedMotion';

export function useAnimatedNavigate() {
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  return useCallback((to: string) => {
    if (reduced) {
      navigate(to);
      return;
    }

    gsap.to('body', {
      opacity: 0,
      duration: 0.22,
      ease: 'power2.in',
      onComplete: () => {
        navigate(to);
        // Body opacity will be restored by the next page's entrance animation
        // Reset opacity so the new page's entrance can play
        gsap.set('body', { opacity: 1 });
      },
    });
  }, [navigate, reduced]);
}
```

Replace `useNavigate` with `useAnimatedNavigate` in: UploadPage (`handleConfirm`), SetupPage (`handleSubmit`), QuizPage (`submitQuiz`). The back buttons should NOT use this — instant back navigation feels better.

---

# PART 3 — Pre-Design AI Chat

A new feature that lets users have a free-form conversation with the Roomly AI *before* uploading a photo. The AI asks questions about their room, style, budget, and problems to solve — then uses that context to improve the design generation.

## 3A. User Experience Flow

**Entry points:**
- Landing page: a chat button in the hero section "Not sure where to start? Chat first →"
- Dedicated route: `/chat` — "Talk to Roomly first"

**Conversation purpose:**
- User describes their room situation in their own words
- AI asks clarifying questions (room type, problems, style preferences, budget range)
- After ~3-5 exchanges, AI generates a "brief summary" of what it learned
- User then taps "Start designing" → brief is stored in sessionStorage and pre-fills the SetupPage fields

**The AI should feel like a knowledgeable design friend, not a chatbot.** Use warm, specific, jargon-free language.

## 3B. Backend API Contract

### POST `/api/chat/session`
Creates a new pre-design chat session.

**Request:** `{}` (user inferred from session cookie or creates anonymous session)
**Response:** `{ sessionId: string }`

### POST `/api/chat/session/:sessionId/message`
Sends a user message and gets an AI response.

**Request body:** `{ content: string }`
**Response:**
```json
{
  "message": {
    "id": "string",
    "role": "assistant",
    "content": "string",
    "createdAt": "string"
  },
  "brief": null | {
    "roomType": "bedroom" | "living_room" | ...,
    "budget": 300,
    "currency": "AUD",
    "stylePreference": "warm minimalist",
    "deliveryUrgency": "normal",
    "userNotes": "The user wants to keep their existing timber wardrobe and add warmth to a cold white room."
  },
  "readyToDesign": false
}
```

When `readyToDesign === true`, the frontend shows a "Start designing" CTA. The `brief` object maps to `SetupDraft` fields.

### GET `/api/chat/session/:sessionId`
Loads chat history for a session.

**Response:** `{ messages: ChatMessage[] }`

The AI assistant system prompt for this endpoint should be:
> You are Roomly's design assistant. Your role is to understand the user's room situation through friendly, concise conversation. Ask about: what room they're designing (if not mentioned), what bothers them most about the current space, their budget range, and their style instincts. After 3-4 exchanges, synthesize what you've learned into a brief and set readyToDesign=true. Keep responses under 80 words. Sound like a knowledgeable design friend, not a corporate AI.

## 3C. API Client Functions

Add to `src/lib/api/index.ts`:

```typescript
export type DesignBrief = {
  roomType: RoomAnalysis['roomType'];
  budget: number;
  currency: 'AUD' | 'USD' | 'NZD';
  stylePreference: string;
  deliveryUrgency: 'urgent' | 'normal' | 'flexible';
  userNotes: string;
};

export type PreChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

export async function createChatSession(): Promise<{ sessionId: string }> {
  const res = await fetch(`${API_BASE_URL}/api/chat/session`, {
    method: 'POST',
    credentials: 'include',
  });
  return parseJsonResponse<{ sessionId: string }>(res);
}

export async function getChatSession(sessionId: string): Promise<{ messages: PreChatMessage[] }> {
  const res = await fetch(`${API_BASE_URL}/api/chat/session/${sessionId}`, {
    credentials: 'include',
  });
  return parseJsonResponse<{ messages: PreChatMessage[] }>(res);
}

export async function sendChatMessage(
  sessionId: string,
  content: string
): Promise<{
  message: PreChatMessage;
  brief: DesignBrief | null;
  readyToDesign: boolean;
}> {
  const res = await fetch(`${API_BASE_URL}/api/chat/session/${sessionId}/message`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  return parseJsonResponse(res);
}
```

## 3D. New Page: `src/pages/PreDesignChatPage.tsx`

**Route:** `/chat`

**Page layout:**
```
<Navigation />
<main className="min-h-dvh bg-bg-base text-text-primary">
  <!-- Two-column layout on desktop -->
  <div className="mx-auto grid max-w-[1040px] gap-8 px-5 py-10 lg:grid-cols-[0.9fr_1.1fr]">
    
    <!-- LEFT: Context panel -->
    <div>
      <p className="text-overline text-accent">Design assistant</p>
      <h1 className="mt-3 font-display text-display font-semibold">
        Tell us about your room.
      </h1>
      <p className="mt-5 text-base leading-7 text-text-secondary">
        Chat with Roomly before designing. Describe your space, what's not working, and what you're hoping for — we'll turn it into a design brief.
      </p>
      
      <!-- What Roomly learns — shows once readyToDesign is true -->
      {brief && (
        <div className="mt-6 rounded-xl bg-secondary-muted/40 p-5">
          <p className="text-overline text-accent">What we learned</p>
          <div className="mt-3 space-y-2 text-sm">
            <div><span className="font-bold">Room:</span> {ROOM_TYPE_LABELS[brief.roomType]}</div>
            <div><span className="font-bold">Budget:</span> {brief.currency} ${brief.budget}</div>
            <div><span className="font-bold">Style:</span> {brief.stylePreference}</div>
            <div><span className="font-bold">Notes:</span> {brief.userNotes}</div>
          </div>
          <Button asChild className="mt-5 w-full rounded-full" onClick={handleStartDesigning}>
            Start designing →
          </Button>
        </div>
      )}
      
      {/* Skip option */}
      <Link to="/design/upload" className="mt-4 block text-sm text-text-secondary hover:text-accent">
        Skip chat and upload a photo directly
      </Link>
    </div>
    
    <!-- RIGHT: Chat interface -->
    <LightCard className="flex h-[600px] flex-col p-0 overflow-hidden">
      <!-- Messages -->
      <div ref={listRef} className="flex-1 overflow-y-auto space-y-3 px-5 py-5">
        {messages.map(msg => <MessageBubble key={msg.id} message={msg} />)}
        {isPending && <TypingIndicator />}
      </div>
      
      <!-- Input -->
      <div className="border-t border-border-subtle bg-bg-elevated px-5 py-4">
        <form onSubmit={handleSend} className="flex gap-2">
          <Textarea ... />
          <Button type="submit" ...>
            <SendHorizontal className="size-4" />
          </Button>
        </form>
      </div>
    </LightCard>
    
  </div>
</main>
```

**Typing indicator component:**
```tsx
function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1.5 rounded-2xl border border-border-subtle bg-bg-elevated px-4 py-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="size-1.5 rounded-full bg-text-secondary"
            style={{
              animation: `typing-dot 1.2s ease-in-out ${i * 0.18}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
```

Add to `index.css`:
```css
@keyframes typing-dot {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30%           { transform: translateY(-5px); opacity: 1; }
}
```

**`handleStartDesigning` function:**
```tsx
function handleStartDesigning() {
  if (!brief) return;
  // Store brief in sessionStorage so SetupPage can read it
  sessionStorage.setItem('roomly.predesign-brief', JSON.stringify(brief));
  navigate('/design/upload');
}
```

**State:**
```tsx
const [sessionId, setSessionId] = useState<string | null>(null);
const [messages, setMessages] = useState<PreChatMessage[]>([]);
const [brief, setBrief] = useState<DesignBrief | null>(null);
const [draft, setDraft] = useState('');
const [isPending, setIsPending] = useState(false);
```

**On mount:** `createChatSession()` then immediately send a system-triggered opening message by calling `sendChatMessage(id, '__init__')` — the server handles `__init__` as a trigger to send the first greeting (e.g. "Hi! I'm here to help you design a room you'll love. What space are you working on?"). If the backend doesn't support `__init__`, pre-populate `messages` with a hardcoded assistant greeting instead:
```tsx
setMessages([{
  id: 'welcome',
  role: 'assistant',
  content: "Hi! I'm here to help you design a room you'll love. What space are you working on — bedroom, living room, something else?",
  createdAt: new Date().toISOString(),
}]);
```

**Add route to `App.tsx`:**
```tsx
const PreDesignChatPage = lazy(() =>
  import('@/pages/PreDesignChatPage').then((m) => ({ default: m.PreDesignChatPage }))
);
<Route path="/chat" element={<PreDesignChatPage />} />
```

## 3E. Landing Page — Chat Entry Point

In `src/pages/LandingPage.tsx`, add a secondary CTA below the main hero button:

```tsx
// After the main Button CTA:
<div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
  <Button asChild size="lg" className="h-12 rounded-md px-8 text-[15px] font-bold shadow-none">
    <Link to="/design/upload">
      Start your room design
      <ArrowRight className="size-4" />
    </Link>
  </Button>
  <Link
    to="/chat"
    className="flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-accent transition-colors"
  >
    <MessageSquare className="size-4" />
    Not sure where to start? Chat first
  </Link>
</div>
```

## 3F. SetupPage — Read Pre-Design Brief

In `SetupPage.tsx`, at the top of the `SetupPage` function, check for a stored brief and pre-fill the form:

```tsx
// After form initialization:
useEffect(() => {
  const raw = sessionStorage.getItem('roomly.predesign-brief');
  if (!raw) return;
  try {
    const brief = JSON.parse(raw) as DesignBrief;
    if (brief.budget) form.setValue('budget', brief.budget);
    if (brief.currency) form.setValue('currency', brief.currency);
    if (brief.roomType) form.setValue('roomTypeOverride', brief.roomType);
    if (brief.deliveryUrgency) form.setValue('deliveryUrgency', brief.deliveryUrgency);
    if (brief.stylePreference) form.setValue('stylePreference', brief.stylePreference);
    // Clear the brief so it doesn't persist on browser back
    sessionStorage.removeItem('roomly.predesign-brief');
  } catch {
    // Ignore malformed data
  }
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

Also show a contextual note if the brief was loaded:
```tsx
{briefLoaded && (
  <div className="mb-4 flex items-start gap-2 rounded-lg bg-success/10 px-4 py-3 text-sm text-success">
    <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
    Pre-filled from your chat. Review and adjust anything below.
  </div>
)}
```

Track `briefLoaded` as a `useState(false)` that gets set to `true` if brief data was found.

---

# PART 4 — Description Field in Design Flow

Users need a way to express requirements in their own words that go beyond the quiz options. Add a free-text "Tell us more" field.

## 4A. Where to Add It

**Primary location:** SetupPage — after the style preference field, before the submit button.
**Secondary location:** QuizPage — at the end, after the 5th question (before "Generate design").

## 4B. SetupPage — "Anything else?" Field

In `src/pages/SetupPage.tsx`:

### Schema update
```tsx
const setupSchema = z.object({
  // ... existing fields ...
  userNotes: z.string().trim().max(400, 'Keep notes under 400 characters.').optional().default(''),
});
```

### Form field (add after stylePreference field, before submit button)
```tsx
<div data-stagger className="field-focus-glow rounded-md">
  <label className="text-sm font-bold" htmlFor="userNotes">
    Anything else? <span className="font-normal text-text-secondary">(optional)</span>
  </label>
  <textarea
    id="userNotes"
    rows={3}
    className="mt-2 w-full resize-none rounded-md border border-border-subtle bg-bg-elevated px-3 py-2.5 text-sm leading-6 outline-none focus:border-accent"
    placeholder="Tell Roomly anything that would help: what you love about the room, what you want to change, items you definitely want to keep, inspiration you've seen..."
    maxLength={400}
    {...form.register('userNotes')}
  />
  <div className="mt-1 flex justify-between text-xs text-text-secondary">
    <span>Share anything the quiz didn't cover</span>
    <span>{watch('userNotes')?.length ?? 0} / 400</span>
  </div>
</div>
```

Add `const { watch } = form;` (or use `useWatch`) to track character count.

### Pass to API
In `SetupPage.handleSubmit`, include `userNotes` in the sessionStorage draft:
```tsx
sessionStorage.setItem(
  `roomly.setup.${roomId}`,
  JSON.stringify({ roomId, ...values }) // userNotes is now part of values
);
```

### `SetupDraft` type update (in `src/lib/api/index.ts`)
```tsx
export type SetupDraft = {
  roomId: string;
  budget: number;
  currency: 'AUD' | 'USD' | 'NZD';
  roomTypeOverride: RoomAnalysis['roomType'];
  deliveryUrgency: 'urgent' | 'normal' | 'flexible';
  stylePreference: string;
  userNotes?: string; // NEW
};
```

### Schema update in QuizPage
In `QuizPage.tsx`, update `setupDraftSchema` to allow `userNotes`:
```tsx
const setupDraftSchema = z.object({
  // ... existing ...
  userNotes: z.string().optional().default(''),
});
```

Pass `userNotes` in the `createDesign` call:
```tsx
const { designId } = await createDesign({
  roomId,
  setup: setupDraft, // userNotes is now included
  quizAnswers,
});
```

## 4C. QuizPage — "Final thoughts" Field

After the 5th (last) quiz question, show a freetext input as the final step before generating:

In `QuizPage.tsx`, add state:
```tsx
const [finalNotes, setFinalNotes] = useState('');
```

In the question display area, when `currentIndex === QUIZ_QUESTIONS.length - 1` AND the current question has been answered (`answers[currentQuestion.id]` is set), show the final notes field:

```tsx
{/* After the option cards, when on last question and answered: */}
{currentIndex === QUIZ_QUESTIONS.length - 1 && answers[currentQuestion.id] && (
  <div className="mt-5 rounded-xl border border-border-subtle bg-bg-elevated p-4">
    <label className="text-sm font-bold text-text-primary">
      Any final thoughts? <span className="font-normal text-text-secondary">(optional)</span>
    </label>
    <textarea
      value={finalNotes}
      onChange={(e) => setFinalNotes(e.target.value)}
      rows={3}
      maxLength={300}
      className="mt-2 w-full resize-none rounded-md border border-border-subtle bg-bg-base px-3 py-2.5 text-sm leading-6 outline-none focus:border-accent"
      placeholder="Anything else? E.g. 'I want to keep my existing blue sofa' or 'I hate anything that feels too formal'..."
    />
    <p className="mt-1 text-right text-xs text-text-secondary">{finalNotes.length} / 300</p>
  </div>
)}
```

**Include `finalNotes` in the design creation:**
```tsx
// In submitQuiz():
const { designId } = await createDesign({
  roomId,
  setup: {
    ...setupDraft,
    userNotes: [setupDraft.userNotes, finalNotes].filter(Boolean).join(' | '),
  },
  quizAnswers,
});
```

This merges SetupPage notes and QuizPage final notes, separated by ` | ` so the backend AI can parse both.

## 4D. Animate the Description Field Appearance

When the final notes field appears on QuizPage (after answering the last question), animate it:

```tsx
const finalNotesRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (!finalNotesRef.current || reduced) return;
  if (!(currentIndex === QUIZ_QUESTIONS.length - 1 && answers[currentQuestion.id])) return;
  
  gsap.fromTo(
    finalNotesRef.current,
    { opacity: 0, y: 16, height: 0 },
    { opacity: 1, y: 0, height: 'auto', duration: 0.4, ease: 'power3.out', clearProps: 'all' }
  );
}, [answers[currentQuestion?.id], currentIndex, reduced]);
```

Apply `ref={finalNotesRef}` to the wrapper div.

---

# Implementation Order

### Phase 1 — Foundation changes (no new files needed)
1. `src/index.css` — add `.text-hero`, `.text-display`, `.text-headline`, `.text-overline` utilities + `@keyframes typing-dot`
2. `src/lib/api/index.ts` — add `userNotes` to `SetupDraft`, add `DesignBrief` type, add `createChatSession`, `getChatSession`, `sendChatMessage` functions

### Phase 2 — New hooks and components
3. `src/hooks/useMagneticButton.ts`
4. `src/hooks/useTextReveal.ts`
5. `src/hooks/useParallax.ts`
6. `src/hooks/useCardTilt.ts`
7. `src/hooks/useAnimatedNavigate.ts`
8. `src/components/Divider.tsx`
9. `src/components/CursorTrail.tsx`

### Phase 3 — UI/UX refinements (edit existing files)
10. `src/pages/LandingPage.tsx`:
    - Apply `text-hero` to H1, split italic line into sibling `<p>`
    - Apply `useTextReveal` to H1
    - Add `useParallax` to hero image + stats bg
    - Morphing gradient background on hero section
    - Add `CursorTrail` component
    - Add secondary "Chat first" CTA link
    - Add editorial "Editor's pick" badge to featured example card
    - Add brand statement line in footer
    - Expand section `py-*` values

11. `src/features/landing/HowItWorks.tsx`:
    - Mobile vertical timeline layout

12. `src/pages/SetupPage.tsx`:
    - Replace icon+text card headers in AnalysisSummary with overline+display style
    - Replace "Step 2" eyebrow with "Room details"
    - Add `userNotes` field to schema + form
    - Read pre-design brief from sessionStorage on mount
    - Show "pre-filled from chat" banner if brief was loaded

13. `src/pages/QuizPage.tsx`:
    - Apply `useCardTilt` to each option button
    - Add image hover overlay with caption
    - Replace dot-only progress with `N / 5` fraction label
    - Replace "Step 3" eyebrow with "Your taste"
    - Add `finalNotes` state + textarea field after last question
    - Animate textarea appearance
    - Merge `finalNotes` into `createDesign` call

14. `src/pages/UploadPage.tsx`:
    - Replace "Step 1" eyebrow with "Your space"
    - Replace `navigate` with `useAnimatedNavigate`

15. `src/pages/GeneratingPage.tsx`:
    - Upgrade step display to strikethrough-completed + animated-active pattern

16. `src/components/Navigation.tsx`:
    - Glassmorphism background
    - Subtle shadow on bottom border

### Phase 4 — New features (new files)
17. `src/pages/PreDesignChatPage.tsx` — full chat page
18. Add `/chat` route in `src/App.tsx`

### Phase 5 — Final TypeScript check
19. Run `npx tsc --noEmit` — fix all errors before considering complete

---

## TypeScript Notes

- `useTextReveal` modifies `el.innerHTML` — type the ref as `RefObject<HTMLHeadingElement | null>` and cast as needed
- `useCardTilt` uses GSAP 3D transforms — no extra types needed beyond `HTMLElement`
- `sessionStorage.getItem` returns `string | null` — always parse with try/catch
- `DesignBrief` should be exported from `src/lib/api/index.ts`, not just local to `PreDesignChatPage`
- `SetupDraft.userNotes` is optional — everywhere it's spread into API calls, ensure the backend accepts the extra field gracefully

---

*End of plan. Implement in phase order.*
