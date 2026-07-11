# Roomly — Agent Implementation Plan
## Part A: Subscription Tiers & Payment · Part B: Animation System

> **For Claude Code.** This is a self-contained implementation plan. Everything needed to build both features is described below. Do not ask clarifying questions — make all decisions based on the specifications here.

---

## Project Context

**Roomly** is an AI-powered home décor app (React 19 + Vite + TypeScript). The flow is: upload room photo → budget/setup → style quiz → AI generates design plan + render → shoppable product results.

**Tech stack:**
- Frontend: React 19, Vite, TypeScript, Tailwind CSS v3.4, shadcn/ui, GSAP v3.15 + Lenis, react-router v7, @tanstack/react-query v5
- Auth: `better-auth` (`authClient` from `@/lib/auth-client`)
- Design tokens: terracotta `#C7684A` (`text-accent`/`bg-accent`), cream `#F7F3ED` (`bg-bg-base`), `#E8D5CD` (`bg-secondary-muted`), sage `#7B8B6F`, charcoal `#1A1614`
- Typography: Fraunces serif (`font-display`), Inter (body)
- Custom CSS utilities: `.light-card`, `.light-card-lg`, `.dot-matrix`, `data-reveal` (scroll reveal trigger)
- Existing animation hooks: `usePageEntrance`, `useScrollReveal`, `useReducedMotion` — all in `src/hooks/`
- API base: `import { API_BASE_URL } from '@/lib/api'`

**Existing routes** (in `src/App.tsx`):
```
/ → LandingPage
/design/upload → UploadPage
/design/setup → SetupPage
/design/quiz → QuizPage
/design/generating/:id → GeneratingPage
/design/result/:id → ResultPage
/auth/sign-in → SignInPage
/auth/sign-up → SignUpPage
/dashboard → DashboardPage
/explore → ExplorePage
/explore/:slug → PublicDesignPage
```

---

# PART A — Subscription Tiers & Payment

## A1. Plan Definitions

### Tier Summary

| Feature | Roomly (Free) | Roomly Plus | Roomly Professional |
|---|---|---|---|
| Price | $0 | $9.99 AUD/mo | $29.99 AUD/mo |
| Designs per month | 1 | 10 | Unlimited |
| Retailer access | Kmart + AliExpress only | All 5 retailers | All 5 retailers |
| AI render image | ❌ | ✅ | ✅ |
| Chat refinement | ❌ | 5 messages/design | Unlimited |
| Share / Publish | ❌ | ✅ | ✅ |
| Priority AI queue | ❌ | ❌ | ✅ |
| Multi-room projects | ❌ | ❌ | ✅ (up to 5 rooms) |
| Export to PDF | ❌ | ❌ | ✅ |
| Support | Community | Email | Priority email + chat |

**Plan identifiers** (use these string values everywhere):
- `'free'`
- `'plus'`
- `'professional'`

### Billing
- Payment processor: **Stripe**
- Currency: AUD (Australian Dollar)
- Billing cycle: Monthly (no annual option in V1)
- Stripe Checkout for purchase, Stripe Customer Portal for management

---

## A2. Backend API Contracts

The frontend calls these endpoints. Implement stubs if the backend is not yet built, returning mock data.

### GET `/api/subscriptions/me`
Returns the current user's subscription status.

**Response:**
```json
{
  "plan": "free" | "plus" | "professional",
  "status": "active" | "past_due" | "cancelled" | "trialing",
  "currentPeriodEnd": "2026-08-10T00:00:00Z" | null,
  "designsUsedThisMonth": 0,
  "designLimitThisMonth": 1,
  "cancelAtPeriodEnd": false
}
```

### POST `/api/subscriptions/checkout`
Creates a Stripe Checkout session.

**Request body:** `{ "plan": "plus" | "professional" }`
**Response:** `{ "checkoutUrl": "https://checkout.stripe.com/..." }`

### POST `/api/subscriptions/portal`
Creates a Stripe Customer Portal session (for managing/cancelling subscription).

**Request body:** `{}` (user inferred from session cookie)
**Response:** `{ "portalUrl": "https://billing.stripe.com/..." }`

### POST `/api/subscriptions/webhook`
Stripe webhook receiver. Handles: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.

---

## A3. Frontend — New Files to Create

### `src/lib/api/subscription.ts`

```typescript
import { API_BASE_URL } from '@/lib/api';

export type Plan = 'free' | 'plus' | 'professional';
export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'trialing';

export type UserSubscription = {
  plan: Plan;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  designsUsedThisMonth: number;
  designLimitThisMonth: number | null; // null = unlimited
  cancelAtPeriodEnd: boolean;
};

export const PLAN_FEATURES: Record<Plan, {
  label: string;
  price: string;
  priceNote: string;
  designsPerMonth: number | null;
  allRetailers: boolean;
  renderImage: boolean;
  chatMessages: number | null; // null = unlimited
  canShare: boolean;
  priorityQueue: boolean;
  multiRoom: boolean;
  pdfExport: boolean;
  highlight?: string; // e.g. "Most popular"
}> = {
  free: {
    label: 'Roomly',
    price: 'Free',
    priceNote: 'forever',
    designsPerMonth: 1,
    allRetailers: false,
    renderImage: false,
    chatMessages: 0,
    canShare: false,
    priorityQueue: false,
    multiRoom: false,
    pdfExport: false,
  },
  plus: {
    label: 'Roomly Plus',
    price: '$9.99',
    priceNote: 'AUD / month',
    designsPerMonth: 10,
    allRetailers: true,
    renderImage: true,
    chatMessages: 5,
    canShare: true,
    priorityQueue: false,
    multiRoom: false,
    pdfExport: false,
    highlight: 'Most popular',
  },
  professional: {
    label: 'Roomly Professional',
    price: '$29.99',
    priceNote: 'AUD / month',
    designsPerMonth: null,
    allRetailers: true,
    renderImage: true,
    chatMessages: null,
    canShare: true,
    priorityQueue: true,
    multiRoom: true,
    pdfExport: true,
    highlight: 'Best value',
  },
};

async function parseJson<T>(res: Response): Promise<T> {
  const payload = await res.json().catch(() => null);
  if (!res.ok) throw new Error((payload as { error?: string })?.error ?? `Error ${res.status}`);
  return payload as T;
}

export async function getSubscription(): Promise<UserSubscription> {
  const res = await fetch(`${API_BASE_URL}/api/subscriptions/me`, {
    credentials: 'include',
  });
  return parseJson<UserSubscription>(res);
}

export async function createCheckoutSession(plan: 'plus' | 'professional'): Promise<{ checkoutUrl: string }> {
  const res = await fetch(`${API_BASE_URL}/api/subscriptions/checkout`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan }),
  });
  return parseJson<{ checkoutUrl: string }>(res);
}

export async function createPortalSession(): Promise<{ portalUrl: string }> {
  const res = await fetch(`${API_BASE_URL}/api/subscriptions/portal`, {
    method: 'POST',
    credentials: 'include',
  });
  return parseJson<{ portalUrl: string }>(res);
}
```

**Add to `src/lib/api/index.ts`** — re-export from the new file:
```typescript
export * from './subscription';
```

---

### `src/hooks/usePlan.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { getSubscription, type Plan, type UserSubscription } from '@/lib/api/subscription';
import { useAuth } from '@/lib/auth-state'; // or however auth context is imported

export function usePlan() {
  const { isAuthenticated } = useAuth();

  const query = useQuery({
    queryKey: ['subscription'],
    queryFn: getSubscription,
    enabled: isAuthenticated,
    staleTime: 60_000, // 1 minute
  });

  const plan: Plan = query.data?.plan ?? 'free';
  const sub: UserSubscription | undefined = query.data;

  return {
    plan,
    sub,
    isPending: query.isPending,
    isPlus: plan === 'plus' || plan === 'professional',
    isPro: plan === 'professional',
    canDesign: sub
      ? sub.designLimitThisMonth === null || sub.designsUsedThisMonth < sub.designLimitThisMonth
      : true, // assume free can do 1 if not loaded yet
    refetch: query.refetch,
  };
}
```

---

### `src/components/PlanGate.tsx`

Gate component that shows upgrade prompt when the user tries to use a feature above their plan.

```typescript
import { Lock } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { createCheckoutSession, type Plan } from '@/lib/api/subscription';
import { usePlan } from '@/hooks/usePlan';

type PlanGateProps = {
  requiredPlan: 'plus' | 'professional';
  featureName: string;
  children: React.ReactNode;
};

export function PlanGate({ requiredPlan, featureName, children }: PlanGateProps) {
  const { plan } = usePlan();

  const planRank: Record<Plan, number> = { free: 0, plus: 1, professional: 2 };
  const hasAccess = planRank[plan] >= planRank[requiredPlan];

  const checkoutMutation = useMutation({
    mutationFn: () => createCheckoutSession(requiredPlan),
    onSuccess: ({ checkoutUrl }) => { window.location.href = checkoutUrl; },
    onError: () => toast.error('Could not start checkout. Please try again.'),
  });

  if (hasAccess) return <>{children}</>;

  const planLabel = requiredPlan === 'plus' ? 'Roomly Plus' : 'Roomly Professional';

  return (
    <div className="relative overflow-hidden rounded-xl border border-dashed border-accent/40 bg-secondary-muted/30 p-6 text-center">
      <Lock className="mx-auto mb-3 size-6 text-accent opacity-70" />
      <p className="mb-1 font-display text-lg font-semibold">{featureName}</p>
      <p className="mb-4 text-sm text-text-secondary">
        Available on {planLabel} and above.
      </p>
      <Button
        onClick={() => checkoutMutation.mutate()}
        disabled={checkoutMutation.isPending}
        className="rounded-full"
      >
        {checkoutMutation.isPending ? 'Opening checkout…' : `Upgrade to ${planLabel}`}
      </Button>
    </div>
  );
}
```

---

### `src/components/PlanBadge.tsx`

Compact badge for showing plan in Navigation and Dashboard.

```typescript
import { cn } from '@/lib/utils';
import { type Plan } from '@/lib/api/subscription';

const BADGE_CONFIG: Record<Plan, { label: string; className: string } | null> = {
  free: null, // no badge for free
  plus: {
    label: 'Plus',
    className: 'bg-accent text-white',
  },
  professional: {
    label: 'Pro',
    className: 'bg-[#7B8B6F] text-white', // sage
  },
};

export function PlanBadge({ plan, className }: { plan: Plan; className?: string }) {
  const config = BADGE_CONFIG[plan];
  if (!config) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
```

---

### `src/pages/PricingPage.tsx`

Full pricing page with plan comparison cards.

**Structure:**
1. `<StepProgress>` — NOT shown (this is a standalone marketing page, so omit it)
2. Page hero: `font-display` heading "Choose your plan", subtitle
3. Plan cards row: `grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto`
4. Each card:
   - Plan name + highlight badge (if `highlight` is set)
   - Price large + period
   - Divider
   - Feature list with check / cross icons
   - CTA button: "Get started free" (free), "Start with Plus" / "Start with Professional"
   - The "Plus" card should have `border-accent` + slightly elevated shadow to visually highlight it
5. FAQ section below (3–4 common questions as accordion)
6. Animate: page entrance (usePageEntrance), then each card staggers in (y:20→0, opacity, 0.08 stagger) via GSAP on mount

**Feature rows to show on each card:**
- Designs per month (e.g. "1 design / month" or "Unlimited")
- Retailers ("Kmart & AliExpress" vs "All 5 retailers: AliExpress, Amazon, IKEA, Kmart, Taobao")
- AI render image
- Chat refinement ("Not included" / "5 messages/design" / "Unlimited")
- Share your design
- Priority AI queue (Pro only)
- Multi-room projects (Pro only)
- PDF export (Pro only)

**CTA behaviour:**
- Free tier → `<Link to="/design/upload">` (start the flow)
- Plus / Pro → `useMutation({ mutationFn: () => createCheckoutSession(plan) })` then redirect to `checkoutUrl`
- If already on that plan, show "Current plan" badge, disabled button

**Add to `src/App.tsx`:**
```tsx
const PricingPage = lazy(() =>
  import('@/pages/PricingPage').then((m) => ({ default: m.PricingPage }))
);
// Add route:
<Route path="/pricing" element={<PricingPage />} />
```

---

### `src/pages/AccountPage.tsx`

Account / subscription management page.

**Route:** `/account`

**Sections:**

1. **Account info card** — avatar / name / email (from `useAuth()`). Edit name button (PATCH `/api/user/profile`).

2. **Current plan card** — shows plan name, status badge, renewal date, designs used vs limit this month (progress bar). CTA buttons:
   - If free: "Upgrade to Plus" → checkout
   - If paid: "Manage subscription" → portal session → redirect
   - If `cancelAtPeriodEnd`: warning banner "Your plan cancels on [date]." + "Reactivate" button

3. **Usage card** — `grid grid-cols-2` of stats: designs this month / designs remaining / total all time (fetch from `/api/user/stats`). Add this API endpoint to the contract list.

4. **Danger zone card** — "Delete account" button (opens confirmation alert dialog before proceeding).

**Add to `src/App.tsx`:**
```tsx
const AccountPage = lazy(() =>
  import('@/pages/AccountPage').then((m) => ({ default: m.AccountPage }))
);
<Route path="/account" element={<AccountPage />} />
```

---

## A4. Navigation Updates

In `src/components/Navigation.tsx`:

1. Add `<PlanBadge plan={plan} />` next to the user name/avatar in the nav dropdown (load `usePlan()` only when `isAuthenticated`).
2. Add "Pricing" link to the nav — `<Link to="/pricing">Pricing</Link>` — visible to all users, placed between the logo and auth links.
3. In the authenticated dropdown menu, add "Account & Billing" link → `/account`.

---

## A5. LandingPage — Pricing Preview Section

In `src/pages/LandingPage.tsx`, add a compact pricing section above the final CTA section:

- Heading: `"Simple, transparent pricing"` (font-display)
- Three mini plan cards in a `grid-cols-1 sm:grid-cols-3 gap-4` layout — each shows plan name, price, and top 3 features only
- "See full pricing" link → `/pricing`
- Each card has `data-reveal` attribute so `useScrollReveal` picks them up automatically

---

## A6. Design Flow — Quota Enforcement

In `src/pages/UploadPage.tsx` (at the start of the flow):

- Call `usePlan()`, check `canDesign`
- If `!canDesign` AND user is authenticated: show a `<PlanGate requiredPlan="plus" featureName="More designs this month" />` in place of the upload area
- If not authenticated: keep current behaviour (allow anonymous design creation)

In `src/pages/ResultPage.tsx`:

- Chat refinement (`<ChatPanel>`): wrap in `<PlanGate requiredPlan="plus" featureName="Chat refinement" />` when `!isPlus`
- Share button: wrap in `<PlanGate requiredPlan="plus" featureName="Share your design" />` when `!isPlus`
- Render image: when `!isPlus && !renderUrl`, show upgrade prompt in the image panel instead of the Sparkles placeholder

---

## A7. Post-Checkout Landing

After Stripe redirects back, handle the `?session_id=` query param on the `/account` page:

```tsx
// In AccountPage.tsx
const [searchParams] = useSearchParams();
const sessionId = searchParams.get('session_id');

useEffect(() => {
  if (sessionId) {
    // Invalidate subscription cache to pick up new plan
    queryClient.invalidateQueries({ queryKey: ['subscription'] });
    toast.success('Welcome to your new plan! 🎉');
  }
}, [sessionId]);
```

---

# PART B — Animation System Improvements

## B0. Guiding Principles

1. **Always check `useReducedMotion()`** — if `true`, skip all GSAP animations and set elements to their final state immediately with `gsap.set(el, { clearProps: 'all' })`.
2. **Always use `clearProps: 'all'`** on GSAP tweens/timelines so Tailwind CSS classes apply cleanly after animation completes.
3. **Always use a `hasAnimated` ref** on page-level entrance animations so they don't re-run on React StrictMode double-mount or query refetch.
4. **Kill tweens on cleanup** — return `() => tl.kill()` from every `useEffect` that creates a GSAP timeline.
5. **Never animate layout-affecting properties** (width, height, padding, margin) — only `opacity`, `y`, `x`, `scale`, `rotate`.
6. **Prefer GSAP over CSS `transition`** for anything > 2 elements or needing sequencing.
7. **Keep durations short** — page entrances 0.45–0.65s, micro-interactions 0.15–0.25s, scroll reveals 0.7–0.9s.

---

## B1. New Shared Animation Utilities

### New file: `src/hooks/useCountUp.ts`

Animates a number from 0 to `target` when the element enters the viewport.

```typescript
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from './useReducedMotion';

gsap.registerPlugin(ScrollTrigger);

export function useCountUp(target: number, decimals = 0): [number, React.RefObject<HTMLSpanElement | null>] {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(reduced ? target : 0);

  useEffect(() => {
    if (reduced || !ref.current) return;

    const proxy = { val: 0 };
    const tween = gsap.to(proxy, {
      val: target,
      duration: 1.4,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: ref.current,
        start: 'top 85%',
        once: true,
      },
      onUpdate: () => {
        setValue(Number(proxy.val.toFixed(decimals)));
      },
    });

    return () => { tween.kill(); };
  }, [target, decimals, reduced]);

  return [value, ref];
}
```

**Usage:** `const [count, ref] = useCountUp(500); <span ref={ref}>{count}+</span>`

---

### New file: `src/hooks/useHoverLift.ts`

Adds a subtle lift + shadow-deepen effect to any card/element on hover.

```typescript
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useReducedMotion } from './useReducedMotion';

export function useHoverLift<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;

    const onEnter = () => gsap.to(el, { y: -4, duration: 0.2, ease: 'power2.out' });
    const onLeave = () => gsap.to(el, { y: 0, duration: 0.25, ease: 'power3.out' });

    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);

    return () => {
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
      gsap.killTweensOf(el);
    };
  }, [reduced]);

  return ref;
}
```

---

### New file: `src/hooks/useStaggerReveal.ts`

Like `useScrollReveal` but for elements that are already in view on mount (not scroll-triggered). Fires once on mount with a stagger.

```typescript
import { useEffect, type RefObject } from 'react';
import gsap from 'gsap';
import { useReducedMotion } from './useReducedMotion';

export function useStaggerReveal(
  containerRef: RefObject<HTMLElement | null>,
  {
    selector = '[data-stagger]',
    stagger = 0.08,
    delay = 0,
    y = 20,
  }: {
    selector?: string;
    stagger?: number;
    delay?: number;
    y?: number;
  } = {}
) {
  const reduced = useReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const targets = container.querySelectorAll<HTMLElement>(selector);
    if (!targets.length) return;

    if (reduced) {
      gsap.set(targets, { opacity: 1, y: 0 });
      return;
    }

    gsap.set(targets, { opacity: 0, y });

    const tween = gsap.to(targets, {
      opacity: 1,
      y: 0,
      duration: 0.5,
      ease: 'power3.out',
      stagger,
      delay,
      clearProps: 'all',
    });

    return () => { tween.kill(); };
  }, [containerRef, selector, stagger, delay, y, reduced]);
}
```

---

## B2. LandingPage Animations (`src/pages/LandingPage.tsx`)

### B2-a. Stat counter animation
If the landing page has stat numbers (e.g. "500+ rooms designed", "AUD $180 avg. budget"), use `useCountUp()` on each number.

Add a stats row to LandingPage if not present:
```tsx
const stats = [
  { value: 500, suffix: '+', label: 'rooms redesigned' },
  { value: 180, prefix: '$', label: 'average budget saved' },
  { value: 4.9, label: 'star rating', decimals: 1 },
];
```
Each number wrapped in a `<span ref={ref}>{value}{suffix}</span>` with `data-reveal`.

### B2-b. Retailer logo marquee
If the retailer logos row is currently static, replace it with a continuous scrolling marquee:

```tsx
// Duplicate the logos array twice for seamless loop
// Outer div: overflow-hidden
// Inner div: flex gap-8, animate with CSS keyframe @keyframes marquee
// CSS: @keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
// Apply: animation: marquee 18s linear infinite
// On hover (parent): animation-play-state: paused
```

Add the keyframe to `src/index.css`:
```css
@keyframes marquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
.animate-marquee {
  animation: marquee 18s linear infinite;
}
.animate-marquee:hover {
  animation-play-state: paused;
}
```

### B2-c. Example card hover
Example cards already use `data-reveal`. Add GSAP hover lift:
```tsx
// Apply useHoverLift() ref to each example card wrapper
```

### B2-d. Hero image parallax (subtle)
In the hero section, if there is a hero image:
```tsx
useEffect(() => {
  if (reduced) return;
  const handleMove = (e: MouseEvent) => {
    const xPct = (e.clientX / window.innerWidth - 0.5) * 12; // ±6px
    const yPct = (e.clientY / window.innerHeight - 0.5) * 8;
    gsap.to(heroImageRef.current, { x: xPct, y: yPct, duration: 0.6, ease: 'power2.out' });
  };
  window.addEventListener('mousemove', handleMove);
  return () => window.removeEventListener('mousemove', handleMove);
}, [reduced]);
```

---

## B3. UploadPage Animations (`src/pages/UploadPage.tsx`)

### B3-a. Dropzone drag-over pulse ring
When the drag-active state is true, animate a pulsing ring:

```tsx
// When isDragActive === true, show an extra div inside the dropzone:
<div
  className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-accent"
  style={{ animation: 'dropzone-pulse 1s ease-in-out infinite' }}
/>
```

Add to `index.css`:
```css
@keyframes dropzone-pulse {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50%       { opacity: 1;   transform: scale(1.015); }
}
```

### B3-b. Image preview entrance
When the uploaded image appears, animate it in:
```tsx
useEffect(() => {
  if (!previewUrl || reduced || !previewRef.current) return;
  gsap.fromTo(
    previewRef.current,
    { opacity: 0, scale: 0.94 },
    { opacity: 1, scale: 1, duration: 0.45, ease: 'power3.out', clearProps: 'all' }
  );
}, [previewUrl, reduced]);
```

### B3-c. "Analyzing…" scan line
After upload completes and analysis begins, overlay a horizontal scan line sweeping down the image:

```tsx
// Absolutely positioned inside the preview image container (overflow-hidden)
{isAnalyzing && (
  <div
    ref={scanRef}
    className="pointer-events-none absolute left-0 h-0.5 w-full bg-gradient-to-r from-transparent via-accent to-transparent"
    // GSAP animates from top:0% to top:100%, repeat: -1, duration 1.6s
  />
)}
```

```tsx
useEffect(() => {
  if (!isAnalyzing || !scanRef.current || reduced) return;
  const tween = gsap.fromTo(
    scanRef.current,
    { top: '0%' },
    { top: '100%', duration: 1.6, ease: 'none', repeat: -1 }
  );
  return () => { tween.kill(); };
}, [isAnalyzing, reduced]);
```

---

## B4. SetupPage Animations (`src/pages/SetupPage.tsx`)

### B4-a. Budget slider thumb spring
After the user releases the slider, animate a brief scale bounce on the thumb label (the price display):

```tsx
// In onChange or onPointerUp of the budget slider:
gsap.fromTo(budgetDisplayRef.current, { scale: 1.08 }, { scale: 1, duration: 0.35, ease: 'elastic.out(1, 0.5)', clearProps: 'all' });
```

### B4-b. Currency toggle slide
If currency is selected from a set of buttons, add a sliding highlight indicator (like a pill):

```tsx
// Render all currency options (AUD, USD, NZD) as siblings
// Add a separate absolutely-positioned div that slides between them using GSAP
// On selection change: gsap.to(indicator, { x: targetX, duration: 0.22, ease: 'power3.out' })
```

### B4-c. Form field focus glow
On focus, gently expand a glow ring outward:

Add to `index.css`:
```css
@keyframes field-glow {
  from { box-shadow: 0 0 0 0px rgba(199, 104, 74, 0.25); }
  to   { box-shadow: 0 0 0 4px rgba(199, 104, 74, 0); }
}
.field-focus-glow:focus-within {
  animation: field-glow 0.5s ease-out forwards;
}
```

Apply `.field-focus-glow` to each form field wrapper div.

### B4-e. Page stagger entrance
The setup form fields should stagger in on mount. Add `data-stagger` to each form section, then use `useStaggerReveal(formRef, { stagger: 0.07, delay: 0.15 })`.

---

## B5. QuizPage Animations (`src/pages/QuizPage.tsx`)

### B5-a. Question slide transition
When the question changes (question index increments), animate the old question out and new one in:

```tsx
// Keep both the outgoing and incoming question in the DOM during transition
// Exit (old question): gsap.to(outRef.current, { x: '-40px', opacity: 0, duration: 0.25, ease: 'power2.in' })
// Entrance (new question): gsap.fromTo(inRef.current, { x: '40px', opacity: 0 }, { x: 0, opacity: 1, duration: 0.35, ease: 'power3.out', clearProps: 'all' })
// Use a transition queue: set an `isTransitioning` state, disable next button during transition
```

**Pattern to implement:**
```tsx
const [displayedQuestion, setDisplayedQuestion] = useState(currentQuestion);
const [isTransitioning, setIsTransitioning] = useState(false);
const questionRef = useRef<HTMLDivElement>(null);

function advanceQuestion() {
  if (isTransitioning) return;
  setIsTransitioning(true);
  gsap.to(questionRef.current, {
    x: -40, opacity: 0, duration: 0.25, ease: 'power2.in',
    onComplete: () => {
      setDisplayedQuestion(nextQuestion);
      gsap.fromTo(questionRef.current,
        { x: 40, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.35, ease: 'power3.out', clearProps: 'all',
          onComplete: () => setIsTransitioning(false) }
      );
    }
  });
}
```

### B5-b. Option card selection checkmark
When an option is selected, draw a checkmark using CSS stroke animation:

```tsx
// In each option card, include an SVG checkmark:
<svg viewBox="0 0 24 24" className={cn('size-5 transition-all', selected ? 'opacity-100' : 'opacity-0')}>
  <path
    d="M4 12 L9 17 L20 6"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      strokeDasharray: 28,
      strokeDashoffset: selected ? 0 : 28,
      transition: selected ? 'stroke-dashoffset 0.3s ease-out' : 'none',
    }}
  />
</svg>
```

### B5-c. Progress dots fill animation
The step progress dots (in `StepProgress.tsx`) should animate when a step is completed:

In `StepProgress.tsx`, when a dot becomes active/completed, wrap the fill with:
```tsx
// Add a transition class to the dot fill:
className="transition-all duration-300 ease-out"
// Or use GSAP scale pop: gsap.fromTo(dotRef, { scale: 0.6 }, { scale: 1, duration: 0.3, ease: 'back.out(2.5)' })
```

### B5-d. Answer accumulation panel slide-in
If there is a sidebar/panel showing accumulated answers, animate each new answer appearing:

```tsx
useEffect(() => {
  if (!latestAnswerRef.current || reduced) return;
  gsap.fromTo(
    latestAnswerRef.current,
    { opacity: 0, x: 16 },
    { opacity: 1, x: 0, duration: 0.3, ease: 'power3.out', clearProps: 'all' }
  );
}, [answers.length]);
```

---

## B6. GeneratingPage Animations (`src/pages/GeneratingPage.tsx`)

### B6-a. Orbiting dots
Replace or augment the Loader2 spinner with orbiting dots around the Sparkles icon:

Add to `index.css`:
```css
@keyframes orbit {
  from { transform: rotate(0deg) translateX(28px) rotate(0deg); }
  to   { transform: rotate(360deg) translateX(28px) rotate(-360deg); }
}
.orbit-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: #C7684A;
  position: absolute;
  top: 50%; left: 50%;
  margin: -3.5px 0 0 -3.5px;
  animation: orbit linear infinite;
  transform-origin: 0 0;
}
.orbit-dot:nth-child(1) { animation-duration: 1.6s; }
.orbit-dot:nth-child(2) { animation-duration: 1.6s; animation-delay: -0.53s; }
.orbit-dot:nth-child(3) { animation-duration: 1.6s; animation-delay: -1.06s; }
```

Usage:
```tsx
<div className="relative flex items-center justify-center size-16">
  <Sparkles className="size-8 text-accent" />
  <div className="orbit-dot" />
  <div className="orbit-dot" />
  <div className="orbit-dot" />
</div>
```

### B6-b. Progress bar gradient shimmer
The existing Progress component: overlay a shimmer on the filled portion.

```tsx
// Wrap the progress in a relative container and add an absolutely-positioned shimmer:
<div className="relative overflow-hidden rounded-full">
  <Progress value={displayProgress} className="h-2" />
  <div
    className="pointer-events-none absolute inset-0 -translate-x-full rounded-full"
    style={{ animation: 'shimmer 1.8s ease-in-out infinite', background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)' }}
  />
</div>
```

Add to `index.css`:
```css
@keyframes shimmer {
  from { transform: translateX(-100%); }
  to   { transform: translateX(200%); }
}
```

### B6-c. Step label typewriter effect
Each status label (e.g. "Designing your look…") should appear character by character:

```tsx
const [displayedLabel, setDisplayedLabel] = useState('');
const fullLabel = STEPS.find(s => s.status === status)?.label ?? '';

useEffect(() => {
  if (reduced) { setDisplayedLabel(fullLabel); return; }
  let i = 0;
  setDisplayedLabel('');
  const interval = window.setInterval(() => {
    setDisplayedLabel(fullLabel.slice(0, i + 1));
    i++;
    if (i >= fullLabel.length) clearInterval(interval);
  }, 40);
  return () => clearInterval(interval);
}, [fullLabel, reduced]);
```

### B6-d. Timeline step glow pulse
When a step becomes active (current status), animate a soft glow pulse on its indicator dot:

```tsx
// For the active step dot, apply:
className={cn(
  'size-3 rounded-full transition-colors duration-500',
  isActive ? 'bg-accent ring-4 ring-accent/20' : isComplete ? 'bg-accent' : 'bg-muted'
)}
// On step change, use GSAP:
// gsap.fromTo(activeStepRef.current, { scale: 0.7 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' })
```

---

## B7. ResultPage Animations (`src/pages/ResultPage.tsx`)

The core entrance animation (hero → left col → right col stagger) is already implemented in the rewrite. These are additive improvements.

### B7-a. Palette swatch scale pop
After the hero/left-col animation completes, run a secondary stagger on the colour swatches:

```tsx
// In the GSAP timeline onComplete or in a separate useEffect keyed on plan:
const swatches = leftColRef.current?.querySelectorAll('[data-swatch]');
if (swatches?.length) {
  gsap.fromTo(swatches,
    { scale: 0.5, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.35, stagger: 0.06, ease: 'back.out(2)', delay: 0.55, clearProps: 'all' }
  );
}
```

Add `data-swatch` attribute to each palette swatch div in the palette card.

### B7-b. Budget bar count-up
The budget percentage stat (e.g. "74% of budget") should count up from 0:

```tsx
const [countPct, pctRef] = useCountUp(budgetPct);
// Use countPct in the stat display and pctRef on the wrapper span
```

The `<Progress>` bar width should also animate: start at `value={0}` then update to `budgetPct` after a 300ms delay:
```tsx
const [animatedBudgetPct, setAnimatedBudgetPct] = useState(0);
useEffect(() => {
  const t = window.setTimeout(() => setAnimatedBudgetPct(budgetPct), 300);
  return () => clearTimeout(t);
}, [budgetPct]);
```

### B7-c. Shopping card image hover zoom
Each product card image should zoom in slightly on hover:

```tsx
// On the product <img> element, add:
className="aspect-[1.2/1] w-full bg-secondary-muted/60 object-cover transition-transform duration-300 ease-out group-hover:scale-105"
// Add group class to the <LightCard> wrapper
```

### B7-d. Highlight flash when ChatPanel changes a product
When `highlightedPosition` is set (a chat action changed an item), the highlighted card already gets a border. Add a GSAP flash:

```tsx
useEffect(() => {
  if (highlightedPosition === null || reduced) return;
  const card = document.querySelector(`[data-position="${highlightedPosition}"]`);
  if (!card) return;
  gsap.fromTo(card, { scale: 1.03 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)', clearProps: 'all' });
}, [highlightedPosition, reduced]);
```

Add `data-position={item.position}` attribute to each ShoppingCard wrapper.

### B7-e. ChatPanel open/close animation
In `src/features/chat/ChatPanel.tsx`, animate the panel sliding in from the right:

```tsx
const panelRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (!panelRef.current || reduced) return;
  if (open) {
    gsap.fromTo(panelRef.current,
      { x: '100%', opacity: 0 },
      { x: '0%', opacity: 1, duration: 0.35, ease: 'power3.out', clearProps: 'all' }
    );
  } else {
    gsap.to(panelRef.current, { x: '100%', opacity: 0, duration: 0.25, ease: 'power2.in' });
  }
}, [open, reduced]);
```

---

## B8. DashboardPage Animations (`src/pages/DashboardPage.tsx`)

### B8-a. Design card stagger on load
After designs load, stagger the cards in:

```tsx
const gridRef = useRef<HTMLDivElement>(null);
// When designs array is populated:
useEffect(() => {
  if (!designs?.length || !gridRef.current || reduced) return;
  const cards = gridRef.current.children;
  gsap.fromTo(cards,
    { opacity: 0, y: 24 },
    { opacity: 1, y: 0, duration: 0.45, stagger: 0.07, ease: 'power3.out', clearProps: 'all' }
  );
}, [designs?.length, reduced]);
```

Apply `ref={gridRef}` to the grid container.

### B8-b. Plan usage bar fill animation
If showing a "designs used" progress bar on Dashboard, animate it similarly to B7-b.

---

## B9. Navigation Micro-interactions (`src/components/Navigation.tsx`)

### B9-a. Active link underline slide
For desktop nav links, render an absolutely-positioned underline div and slide it between links using GSAP:

```tsx
// Track which link is active with useLocation()
// On route change, measure the active link's bounding rect and animate:
// gsap.to(underlineRef.current, { x: activeRect.left - navRect.left, width: activeRect.width, duration: 0.3, ease: 'power3.out' })
```

### B9-b. Mobile menu stagger
When mobile nav opens, stagger each menu item in from x:16:

```tsx
useEffect(() => {
  if (!mobileMenuOpen || !menuRef.current || reduced) return;
  const items = menuRef.current.querySelectorAll('[data-nav-item]');
  gsap.fromTo(items,
    { opacity: 0, x: 16 },
    { opacity: 1, x: 0, duration: 0.25, stagger: 0.06, ease: 'power3.out', clearProps: 'all' }
  );
}, [mobileMenuOpen, reduced]);
```

Add `data-nav-item` to each link/item in the mobile menu.

---

## B10. Global Micro-interactions

### B10-a. Button loading state
The shadcn `Button` component already supports `disabled`. Extend it or create a `LoadingButton` wrapper:

```tsx
// src/components/LoadingButton.tsx
import { Loader2 } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';

type LoadingButtonProps = ButtonProps & { loading?: boolean; loadingText?: string };

export function LoadingButton({ loading, loadingText, children, disabled, ...props }: LoadingButtonProps) {
  return (
    <Button disabled={loading || disabled} {...props}>
      {loading ? (
        <>
          <Loader2 className="mr-2 size-4 animate-spin" />
          {loadingText ?? children}
        </>
      ) : children}
    </Button>
  );
}
```

Replace all `disabled={mutation.isPending}` button patterns with `<LoadingButton loading={mutation.isPending}>`.

### B10-b. LightCard hover lift (global)
Add `.light-card:hover` to `index.css`:

```css
.light-card {
  /* existing styles */
  transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
}
.light-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 32px rgba(26, 22, 20, 0.10);
}
```

This gives all LightCards the hover lift without any per-component changes.

### B10-c. Page route transition
Add a global fade-out/fade-in between route changes using a layout wrapper:

```tsx
// src/components/PageTransition.tsx
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import gsap from 'gsap';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out', clearProps: 'all' });
  }, [location.pathname]);

  return <div ref={wrapperRef}>{children}</div>;
}
```

Wrap the `<Suspense>` children in `App.tsx` with `<PageTransition>`.

### B10-d. Sonner toast custom entrance
In `src/components/ui/sonner.tsx`, pass expanded toaster config:

```tsx
<Toaster
  position="top-center"
  toastOptions={{
    classNames: {
      toast: 'animate-in slide-in-from-top-2 fade-in-0 duration-300',
    },
  }}
/>
```

This uses Tailwind animate utilities (from `tailwindcss-animate`) to give toasts a slide-down entrance.

---

## B11. New CSS Keyframes Summary

Add all of these to `src/index.css` under a single `/* === Animations === */` section:

```css
/* === Animations === */

@keyframes marquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
.animate-marquee { animation: marquee 18s linear infinite; }
.animate-marquee:hover { animation-play-state: paused; }

@keyframes dropzone-pulse {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50%       { opacity: 1;   transform: scale(1.015); }
}

@keyframes field-glow {
  from { box-shadow: 0 0 0 0px rgba(199, 104, 74, 0.25); }
  to   { box-shadow: 0 0 0 4px rgba(199, 104, 74, 0); }
}
.field-focus-glow:focus-within { animation: field-glow 0.5s ease-out forwards; }

@keyframes orbit {
  from { transform: rotate(0deg) translateX(28px) rotate(0deg); }
  to   { transform: rotate(360deg) translateX(28px) rotate(-360deg); }
}
.orbit-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #C7684A;
  position: absolute; top: 50%; left: 50%;
  margin: -3.5px 0 0 -3.5px;
  animation: orbit linear infinite;
  transform-origin: 0 0;
}
.orbit-dot:nth-child(1) { animation-duration: 1.6s; }
.orbit-dot:nth-child(2) { animation-duration: 1.6s; animation-delay: -0.53s; }
.orbit-dot:nth-child(3) { animation-duration: 1.6s; animation-delay: -1.06s; }

@keyframes shimmer {
  from { transform: translateX(-100%); }
  to   { transform: translateX(200%); }
}
```

---

## Implementation Order

### Phase 1 — Foundation (do first, unblocks everything)
1. Create `src/lib/api/subscription.ts` + re-export from `api/index.ts`
2. Create `src/hooks/usePlan.ts`
3. Create `src/components/PlanBadge.tsx`
4. Create `src/components/PlanGate.tsx`
5. Create `src/components/LoadingButton.tsx`
6. Add new CSS keyframes block to `src/index.css`
7. Create `src/hooks/useCountUp.ts`
8. Create `src/hooks/useHoverLift.ts`
9. Create `src/hooks/useStaggerReveal.ts`

### Phase 2 — Subscription UI
10. Create `src/pages/PricingPage.tsx` + add route to `App.tsx`
11. Create `src/pages/AccountPage.tsx` + add route to `App.tsx`
12. Update `src/components/Navigation.tsx` — add Pricing link, Plan badge, Account link
13. Update `src/pages/LandingPage.tsx` — add pricing preview section
14. Update `src/pages/UploadPage.tsx` — quota enforcement + `PlanGate`
15. Update `src/pages/ResultPage.tsx` — gate Chat, Share, Render image behind plan

### Phase 3 — Animations per page
16. `LandingPage.tsx` — marquee, count-up stats, example card hover lift, hero parallax
17. `UploadPage.tsx` — dropzone pulse ring, image entrance, scan line
18. `SetupPage.tsx` — slider spring, currency slide indicator, field-focus-glow, form stagger entrance
19. `QuizPage.tsx` — question slide transition, checkmark draw, progress dot pop, answer panel slide
20. `GeneratingPage.tsx` — orbiting dots, progress shimmer, typewriter label, step glow pulse
21. `ResultPage.tsx` — swatch pop, budget bar count-up, image hover zoom, chat flash, ChatPanel slide
22. `DashboardPage.tsx` — card stagger on load, plan usage bar animation

### Phase 4 — Global polish
23. `Navigation.tsx` — active link underline slide, mobile menu stagger
24. `src/index.css` — LightCard hover lift via CSS
25. `src/components/PageTransition.tsx` + wire into `App.tsx`
26. `src/components/ui/sonner.tsx` — toast entrance animation
27. Replace `disabled={mutation.isPending}` patterns with `<LoadingButton>` across all pages

---

## TypeScript Checklist

After implementing all changes, run:
```bash
npx tsc --noEmit
```

Common issues to watch for:
- `UserSubscription | undefined` — always handle undefined from `usePlan()` before accessing `.plan`
- GSAP `gsap.set(targets, ...)` — `targets` should be typed as `Element | Element[] | NodeListOf<Element>`, not `null`
- `querySelectorAll` returns `NodeListOf<Element>` — spread to array if GSAP needs it: `[...container.querySelectorAll('[data-stagger]')]`
- `useCountUp` returns a tuple — destructure as `const [count, ref] = useCountUp(target)`

---

*End of plan. Implement in the order specified in the Implementation Order section.*
