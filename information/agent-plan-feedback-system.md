# Agent Plan — Feedback System Improvement
**Scope:** All user-facing feedback across every Roomly workflow  
**Stack:** React 19 · Vite · TypeScript · shadcn/ui · Tailwind CSS v3.4 · GSAP · sonner · @tanstack/react-query v5  
**Goal:** Every state transition — loading, success, error, empty, offline — gives the user a clear, consistent, on-brand signal so they are never left wondering what is happening.

---

## Audit Summary

### Current state (as of audit)

| Feedback type | Exists? | Where | Gap |
|---|---|---|---|
| Toast (success/error) | Partial | ResultPage, DashboardPage, SignIn, SignUp, AccountPage, PricingPage | Missing on UploadPage, SetupPage, QuizPage, PreDesignChatPage, GeneratingPage, ExplorePage |
| `LoadingButton` | Partial | SignIn, SignUp, Pricing, Account | Missing on SetupPage, QuizPage, UploadPage, ResultPage refinement |
| Skeleton loaders | ❌ None | `Skeleton` component exists in `ui/skeleton.tsx` but imported nowhere in pages | All data-fetching pages show spinner text only |
| Empty states | Partial | DashboardPage has a good empty card | Missing on ExplorePage, ResultPage products |
| Retry buttons | ❌ None | — | All failed queries just show an error message with no retry CTA |
| Confirmation dialogs | ❌ None | — | Account deletion has no confirm step |
| Offline banner | ❌ None | — | — |
| Step completion animation | ❌ None | StepProgress advances silently | — |
| `aria-live` on data regions | Partial | GeneratingPage only | DashboardPage, ExplorePage, ResultPage, SetupPage need it |

### Workflow map
```
/ (Landing)
└── /chat (optional pre-design chat)
    └── /design/upload
        └── /design/setup?room=:id
            └── /design/quiz
                └── /design/generating/:id
                    └── /design/result/:id
/dashboard
/explore + /explore/:slug
/auth/sign-in + /auth/sign-up
/pricing
/account
```

---

## Phase 1 — Shared Feedback Components (new files)

Build the primitives that every page will use. No page edits yet.

### 1.1 `RetryBlock` component
**File:** `src/components/RetryBlock.tsx`

A small reusable component for failed query states. Shows an error message and a "Try again" button that calls `refetch()`.

```tsx
// Props
type RetryBlockProps = {
  message?: string;      // defaults to "Something went wrong."
  onRetry: () => void;
  className?: string;
};

// Visual: LightCard · terracotta XCircle icon · message text · "Try again" Button
// Usage: drop-in replacement for any `queryName.isError` branch
```

### 1.2 `SkeletonDesignCard` component
**File:** `src/components/SkeletonDesignCard.tsx`

Matches the shape of `DesignCard` (used in DashboardPage and ExplorePage) — a pulsing placeholder with correct aspect ratio and text-line shimmer.

```tsx
// Uses Skeleton from ui/skeleton
// Outer: rounded-xl border bg-bg-elevated shadow-card
// Image area: aspect-[4/3] w-full Skeleton
// Below: two Skeleton lines (title h-5, subtitle h-4 w-2/3)
// Bottom row: Skeleton pill h-6 w-16
```

### 1.3 `SkeletonProductCard` component
**File:** `src/components/SkeletonProductCard.tsx`

Matches the product card shape in ResultPage — square image, two text lines, price chip.

```tsx
// Outer: rounded-xl border bg-bg-elevated
// Image: aspect-square Skeleton
// Lines: h-4 w-full, h-4 w-1/2
// Price: h-5 w-16
```

### 1.4 `EmptyState` component
**File:** `src/components/EmptyState.tsx`

Generic empty state card — icon, heading, body text, optional CTA.

```tsx
type EmptyStateProps = {
  icon: LucideIcon;      // e.g. LayoutDashboard, Search, Image
  heading: string;
  body: string;
  cta?: { label: string; to?: string; onClick?: () => void };
  className?: string;
};

// Visual: centered LightCard · icon in terracotta circle · font-display heading · body text · optional Button
// Icon circle: size-16 rounded-full bg-secondary-muted text-accent
```

### 1.5 `ConfirmDialog` component
**File:** `src/components/ConfirmDialog.tsx`

Wraps shadcn `AlertDialog` into a two-button confirm/cancel pattern with a loading state on the confirm button.

```tsx
type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;       // default "Confirm"
  confirmVariant?: ButtonVariant; // default "destructive"
  loading?: boolean;
  onConfirm: () => void;
};
```

### 1.6 `OfflineBanner` component
**File:** `src/components/OfflineBanner.tsx`

Fixed bottom bar that appears when `navigator.onLine` is false.

```tsx
// useEffect: window.addEventListener('online'/'offline', ...)
// Visual: fixed bottom-0 w-full · bg-charcoal text-white · WifiOff icon · "No internet connection — changes may not save"
// Animate: GSAP fromTo y:40→0 when shown; y:0→40 when hidden
// z-index: z-50
```

### 1.7 `PageSuspenseFallback` component
**File:** `src/components/PageSuspenseFallback.tsx`

Replaces the current `"Loading Roomly..."` plain-text Suspense fallback with a skeleton that matches the page being loaded. For now, a neutral full-screen shimmer with the Logo centered.

```tsx
// Full min-h-dvh bg-bg-base
// Centered: Logo (accent, sm) above a subtle pulsing Skeleton bar (w-48 h-2 rounded-full)
// Logo opacity: 0.5, pulsing
```

---

## Phase 2 — Page-by-Page Feedback Fixes

Edit existing pages to close specific gaps. Apply each fix in the order listed.

### 2.1 `App.tsx` — Suspense fallback + OfflineBanner

**File:** `src/App.tsx`

Changes:
- Import `PageSuspenseFallback` and replace the inline `<div>Loading Roomly...</div>` with `<PageSuspenseFallback />`.
- Import `OfflineBanner` and render it inside `<BrowserRouter>` at the bottom (outside `<Suspense>`).

```tsx
// Before:
fallback={<div className="flex min-h-dvh items-center ...">Loading Roomly...</div>}
// After:
fallback={<PageSuspenseFallback />}

// Add before </BrowserRouter>:
<OfflineBanner />
```

### 2.2 `DashboardPage.tsx` — Skeleton loader + Retry block + aria-live

**File:** `src/pages/DashboardPage.tsx`

Changes:
1. Replace the `"Loading saved designs..."` LightCard with a 3-column skeleton grid:
```tsx
// Before:
{designsQuery.isPending ? (
  <LightCard className="mt-8 p-6 text-sm ...">Loading saved designs...</LightCard>
) : ...}

// After:
{designsQuery.isPending ? (
  <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading designs">
    {Array.from({ length: 6 }).map((_, i) => <SkeletonDesignCard key={i} />)}
  </div>
) : designsQuery.isError ? (
  <RetryBlock message="Could not load your designs." onRetry={() => designsQuery.refetch()} className="mt-8" />
) : designs.length === 0 ? (
  // existing empty state (keep as-is, it's good)
) : ...}
```

2. Add `aria-live="polite"` to the container wrapping the conditional block so screen readers announce the change.

### 2.3 `ExplorePage.tsx` — Skeleton loader + Retry block + EmptyState

**File:** `src/pages/ExplorePage.tsx`

Changes:
1. During loading: render a grid of `SkeletonDesignCard` (count: 9).
2. On error: render `<RetryBlock onRetry={refetch} />`.
3. When results are empty: render `<EmptyState icon={Compass} heading="Nothing to explore yet" body="Be the first to share a design publicly." />`.
4. Wrap results grid in `aria-live="polite"`.

### 2.4 `UploadPage.tsx` — Toast on upload error + Toast on upload success

**File:** `src/pages/UploadPage.tsx`

Changes:
1. Import `toast` from `'sonner'`.
2. In `handleConfirm`, on the `catch` block: replace `setError(...)` with both `setError(...)` (keep for inline) **and** `toast.error(...)` for prominence.
3. After `animatedNavigate(...)` call (i.e., upload fully complete): add `toast.success('Photo uploaded — setting up your room.')` so the user gets confirmation before the page transition.

### 2.5 `SetupPage.tsx` — Toast on analysis error + Retry button + LoadingButton for submit

**File:** `src/pages/SetupPage.tsx`

Changes:
1. Import `toast`, `RetryBlock`, `LoadingButton`.
2. In the `analysisQuery.isError` branch: add `RetryBlock` with `onRetry={() => analysisQuery.refetch()}`.
3. Add `useEffect` to fire `toast.error(analysisQuery.error.message)` when `analysisQuery.isError` becomes true (once, via ref guard).
4. Replace the submit `<Button>` at the bottom of the form with `<LoadingButton loading={submitMutation.isPending} loadingText="Saving...">`.

### 2.6 `QuizPage.tsx` — Toast on submit error + LoadingButton

**File:** `src/pages/QuizPage.tsx`

Changes:
1. Import `toast`, `LoadingButton`.
2. Replace the "Create my design" `<Button>` with `<LoadingButton loading={submitMutation?.isPending} loadingText="Creating design...">`.
3. On submit error: `toast.error(error message)`.

### 2.7 `GeneratingPage.tsx` — Toast on failure + Retry suggestion

**File:** `src/pages/GeneratingPage.tsx`

Changes:
1. Import `toast`.
2. In the `useEffect` that detects `design?.status === 'failed'`: add `toast.error('Design generation failed — check the setup and try again.')` once (ref guard).
3. In the failed state card footer: change `<Button asChild><Link to="/">Return home</Link></Button>` to two buttons side by side:
   - "Start over" → `/design/upload`
   - "Return home" → `/`

### 2.8 `PreDesignChatPage.tsx` — Toast on network error

**File:** `src/pages/PreDesignChatPage.tsx`

Changes:
1. Import `toast`.
2. In the `catch` block of `handleSend`: call `toast.error('Could not reach the AI. Your message was not sent.')` instead of setting the inline `error` state. Remove the `{error && ...}` JSX (cleans up the inline error).
3. In the `createChatSession` `.catch()`: add `toast.info('Running in offline mode — your chat won't be analysed.')` so the user knows the session is in fallback mode.

### 2.9 `ResultPage.tsx` — Skeleton product cards + EmptyState for products + LoadingButton on save

**File:** `src/pages/ResultPage.tsx`

Changes:
1. Import `SkeletonProductCard`, `EmptyState`, `LoadingButton`.
2. While products are loading: render a 3-column grid of 6 `SkeletonProductCard`.
3. When `products.length === 0` and not loading: render `<EmptyState icon={ShoppingBag} heading="No products found yet" body="Our team is sourcing products for this style. Check back soon." />`.
4. Replace the "Save" button with `<LoadingButton loading={saveMutation.isPending} loadingText="Saving...">`.
5. Replace the "Share" button with `<LoadingButton loading={shareMutation.isPending} loadingText="Sharing...">`.

### 2.10 `AccountPage.tsx` — ConfirmDialog before account deletion

**File:** `src/pages/AccountPage.tsx`

Changes:
1. Import `ConfirmDialog`.
2. Add `const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)`.
3. Change the "Delete account" button `onClick` from directly calling `deleteMutation.mutate()` to `setShowDeleteConfirm(true)`.
4. Render `<ConfirmDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm} title="Delete account?" description="This permanently removes all your designs and data. This cannot be undone." confirmLabel="Delete my account" confirmVariant="destructive" loading={deleteMutation.isPending} onConfirm={() => deleteMutation.mutate()} />`.

---

## Phase 3 — Micro-Animation Feedback

These are feel-good moments that turn a functional state transition into a memorable one.

### 3.1 StepProgress — step completion pop

**File:** `src/components/StepProgress.tsx`

When a step's number changes from `current - 1` to `current` (i.e., advancing to next step), the newly completed step icon should:
- Scale from 1.0 → 1.3 → 1.0 with `gsap.fromTo` (duration 0.35, ease `"back.out(2)"`)
- Color transitions via CSS transition (already handled by the conditional class)

Implementation:
```tsx
// useEffect watching `current` changes
// Select the previous step DOM node via ref array
// gsap.fromTo(stepRefs[current - 2], { scale: 1 }, { scale: 1.3, duration: 0.18, yoyo: true, repeat: 1, ease: 'back.out(2)' })
```

### 3.2 UploadPage — success pulse before navigate

**File:** `src/pages/UploadPage.tsx`

After `setStep('complete')` and before `animatedNavigate(...)`, run a brief green pulse on the preview image:

```tsx
// In handleConfirm, after setStep('complete'):
if (!reduced && previewRef.current) {
  await new Promise<void>((res) => {
    gsap.fromTo(previewRef.current!, 
      { boxShadow: '0 0 0 0 rgba(74,183,135,0)' },
      { boxShadow: '0 0 0 16px rgba(74,183,135,0)', duration: 0.5, ease: 'power2.out', onComplete: res }
    );
  });
}
// then animatedNavigate(...)
```

### 3.3 QuizPage — completion shimmer on "last answer selected"

**File:** `src/pages/QuizPage.tsx`

When `isLastQuestion && isComplete` becomes true, run a horizontal shimmer sweep across the finalNotes/CTA area:

```tsx
// After the GSAP animation that reveals finalNotes:
// gsap.fromTo('.quiz-complete-shimmer', { x: '-100%' }, { x: '100%', duration: 0.7, ease: 'power1.inOut' })
// The shimmer is a <div className="quiz-complete-shimmer pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" aria-hidden="true" />
// Add overflow-hidden to its parent
```

### 3.4 GeneratingPage — completion confetti burst

**File:** `src/pages/GeneratingPage.tsx`

When `design.status === 'complete'` is first detected (before the navigate redirect fires), run a 0.4s burst of 6–8 tiny terracotta dots expanding outward from the Sparkles icon:

```tsx
// useEffect on status === 'complete', before navigate
// gsap.to('.confetti-dot', { scale: 0, x: (i) => Math.cos((i/8)*Math.PI*2)*60, y: (i) => Math.sin((i/8)*Math.PI*2)*60, opacity: 0, duration: 0.4, stagger: 0.03, ease: 'power2.out' })
// 8 <span className="confetti-dot absolute size-2 rounded-full bg-accent" aria-hidden="true" /> rendered inside the Sparkles circle
// Remove them from DOM after animation (or opacity:0 is fine)
```

---

## Phase 4 — Accessibility (ARIA)

Systematically add `aria-live`, `aria-busy`, and form ARIA that's currently missing.

### 4.1 `aria-live` on all async data regions

Add `aria-live="polite"` + `aria-busy={query.isPending}` to the container element that wraps the skeleton/data/error/empty switch in:
- `DashboardPage` — the designs grid container
- `ExplorePage` — the designs grid container
- `ResultPage` — the products grid container
- `SetupPage` — the room analysis panel

### 4.2 Form field ARIA

**SetupPage**, **SignInPage**, **SignUpPage**:
- Each field's error `<p>` must have an `id` (e.g. `id="budget-error"`)
- The corresponding `<input>` / `<select>` must have `aria-describedby="budget-error"` and `aria-invalid={!!error}`
- react-hook-form's `register()` supports spreading these props

### 4.3 Chat textarea ARIA

**PreDesignChatPage** — Add to the `<textarea>`:
```tsx
aria-label="Type your message"
aria-describedby="chat-hint"
// Add: <p id="chat-hint" className="sr-only">Press Enter to send, Shift+Enter for newline</p>
```

### 4.4 Toast announcement region

The sonner `<Toaster>` already has an internal `aria-live` region. Ensure it is `position="top-center"` (already set in `App.tsx`) and add `richColors` prop for success/error colour coding:

```tsx
// App.tsx
<Toaster position="top-center" richColors closeButton />
```

---

## Phase 5 — TypeScript Check + Visual Review

1. Run `npx tsc --noEmit` in both `src/` (frontend) and `server/` to confirm 0 errors.
2. Visually check each page listed in Phase 2 in the browser:
   - Trigger loading states (throttle network to Slow 3G in DevTools)
   - Trigger error states (block the API endpoint in DevTools → Network → Block)
   - Trigger empty states (use a fresh account)
   - Verify toast appears for each action
   - Verify skeleton matches the shape of real content
   - Verify RetryBlock fires `refetch()` and shows loading → data
3. Check AccountPage deletion confirm dialog.
4. Verify OfflineBanner appears when DevTools → Network → Offline.
5. Run a quick WAVE / axe accessibility scan on SetupPage and ResultPage.

---

## Implementation Order for Agent

```
Phase 1 (new components — no page dependencies):
  1.1 RetryBlock.tsx
  1.2 SkeletonDesignCard.tsx
  1.3 SkeletonProductCard.tsx
  1.4 EmptyState.tsx
  1.5 ConfirmDialog.tsx
  1.6 OfflineBanner.tsx
  1.7 PageSuspenseFallback.tsx

Phase 2 (page edits — can be done in parallel per page):
  2.1 App.tsx
  2.2 DashboardPage.tsx
  2.3 ExplorePage.tsx
  2.4 UploadPage.tsx
  2.5 SetupPage.tsx
  2.6 QuizPage.tsx
  2.7 GeneratingPage.tsx
  2.8 PreDesignChatPage.tsx
  2.9 ResultPage.tsx
  2.10 AccountPage.tsx

Phase 3 (micro-animations — edit pages already touched in Phase 2):
  3.1 StepProgress.tsx
  3.2 UploadPage.tsx (add to handleConfirm)
  3.3 QuizPage.tsx (add shimmer)
  3.4 GeneratingPage.tsx (add confetti)

Phase 4 (ARIA — targeted attribute additions):
  4.1 DashboardPage, ExplorePage, ResultPage, SetupPage
  4.2 SetupPage, SignInPage, SignUpPage
  4.3 PreDesignChatPage
  4.4 App.tsx (Toaster props)

Phase 5: TypeScript check + visual review
```

---

## Design Token Reference

| Token | Value | Use |
|---|---|---|
| `text-accent` / `bg-accent` | `#C7684A` terracotta | Icons in feedback states, confetti dots |
| `bg-bg-elevated` | elevated cream | Skeleton base |
| `bg-secondary-muted` | muted sage | Skeleton shimmer overlay |
| `text-success` | green | Success toast icon, budget-fit indicator |
| `text-destructive` | red | Error toast, destructive confirm button |
| `border-border-subtle` | subtle border | RetryBlock, EmptyState card border |
| `shadow-card` | card shadow | All new feedback cards inherit LightCard |

Skeleton shimmer animation uses the existing `animate-pulse` Tailwind utility — no new keyframes needed.

---

## Files Created / Modified Summary

**New files (Phase 1):**
- `src/components/RetryBlock.tsx`
- `src/components/SkeletonDesignCard.tsx`
- `src/components/SkeletonProductCard.tsx`
- `src/components/EmptyState.tsx`
- `src/components/ConfirmDialog.tsx`
- `src/components/OfflineBanner.tsx`
- `src/components/PageSuspenseFallback.tsx`

**Edited files (Phases 2–4):**
- `src/App.tsx`
- `src/pages/DashboardPage.tsx`
- `src/pages/ExplorePage.tsx`
- `src/pages/UploadPage.tsx`
- `src/pages/SetupPage.tsx`
- `src/pages/QuizPage.tsx`
- `src/pages/GeneratingPage.tsx`
- `src/pages/PreDesignChatPage.tsx`
- `src/pages/ResultPage.tsx`
- `src/pages/AccountPage.tsx`
- `src/components/StepProgress.tsx`
- `src/pages/SignInPage.tsx` (ARIA only)
- `src/pages/SignUpPage.tsx` (ARIA only)
