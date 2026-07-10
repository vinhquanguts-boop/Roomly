# Roomly — UI Layout & Structure Improvements
## Claude Code Prompt

> Paste everything below this line directly into a Claude Code session opened at `E:\Roomly`.

---

## Project context

**Stack**: React 19 + Vite + TypeScript, Tailwind CSS v3.4, shadcn/ui, react-router v7, GSAP 3.15 + Lenis, `@tanstack/react-query`.

**Design tokens** (already defined in `tailwind.config.ts` and `index.css`):
- Accent / terracotta: `#C7684A` → Tailwind class `text-accent`, `bg-accent`, `border-accent`
- Cream / page bg: `#F7F3ED` → `bg-bg-base`
- Elevated surface: `rgba(254,252,249,0.82)` → `bg-bg-elevated` / `light-card` utility
- Charcoal text: `#1A1614` → `text-text-primary`
- Muted text: `text-text-secondary`
- Sage green: `#7B8B6F` → `bg-roomly-secondary`
- Accent muted: `#E8D5CD` → `bg-secondary-muted`
- Success: `text-success`, `bg-success`

**Typography**:
- Display / headings: `font-display` (Fraunces, Georgia serif)
- Body: Inter (default)

**Shared component**: `<LightCard>` in `src/components/LightCard.tsx` — use for all card surfaces.

**Do not change** any GSAP animation code already in place. Do not change `src/main.tsx` or `src/hooks/`. Do not install new packages.

---

## Work to do — in this exact priority order

Read each file before editing it. Make all changes precisely — don't reformat unrelated code.

---

### PRIORITY 1 — Foundation (do these first)

---

#### P1-A · New component: `src/components/StepProgress.tsx`

Create this component from scratch. It renders a horizontal step indicator bar used on all 5 app pages to show where the user is in the design flow.

**Props:**
```ts
interface StepProgressProps {
  current: 1 | 2 | 3 | 4 | 5;
}
```

**Steps array** (hardcoded inside the component):
```ts
const STEPS = [
  { n: 1, label: 'Upload' },
  { n: 2, label: 'Setup' },
  { n: 3, label: 'Quiz' },
  { n: 4, label: 'Generating' },
  { n: 5, label: 'Result' },
];
```

**Visual spec:**
- Render a `<nav>` with `aria-label="Design progress"` at the top of the page, ABOVE the `<main>` element on each app page.
- Background: `bg-bg-elevated border-b border-border-subtle`
- Height: `h-[52px]` on desktop, `h-[44px]` on mobile
- Inner container: `mx-auto flex max-w-[960px] items-center justify-between px-5 md:px-10`
- Each step is a `<div>` with a number circle + label:
  - **Completed step** (n < current): circle is filled `bg-accent text-white` with a checkmark SVG icon inside (use a simple `✓` character), label `text-accent font-semibold`
  - **Current step** (n === current): circle is `border-2 border-accent bg-bg-base text-accent font-bold`, label `text-text-primary font-bold`
  - **Future step** (n > current): circle is `border border-border-subtle bg-bg-elevated text-text-secondary`, label `text-text-secondary`
- Circle size: `size-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0`
- Step label: `text-[11px] font-semibold` — **hide label on mobile** (`hidden sm:block`) to avoid overflow
- Between steps, render a `<div className="h-px flex-1 bg-border-subtle mx-2" />` connector line
- The connector between step n and n+1 should be `bg-accent` when n < current (i.e., that step is done)

**Usage — add to these 5 files immediately after creating the component:**

| File | `current` value |
|------|----------------|
| `src/pages/UploadPage.tsx` | `1` |
| `src/pages/SetupPage.tsx` | `2` |
| `src/pages/QuizPage.tsx` | `3` |
| `src/pages/GeneratingPage.tsx` | `4` |
| `src/pages/ResultPage.tsx` | `5` |

In each file, import `StepProgress` and place `<StepProgress current={N} />` BEFORE the `<main>` element. Wrap both in a React Fragment `<>...</>`. The `return` statement in each page must return `<>` not just `<main>`.

---

#### P1-B · ResultPage — palette as colour swatches

File: `src/pages/ResultPage.tsx`

Find the palette card (contains `<Palette className="size-5 text-accent"` and maps over `plan.palette.hexColors`).

**Current code:**
```tsx
<div className="mt-4 flex flex-wrap gap-2">
  {plan.palette.hexColors.map((color) => (
    <span key={color} className="rounded-full bg-secondary-muted px-3 py-1 text-sm font-semibold">
      {color}
    </span>
  ))}
</div>
```

**Replace with:**
```tsx
<div className="mt-4 flex flex-wrap gap-3">
  {plan.palette.hexColors.map((color) => (
    <div key={color} className="flex flex-col items-center gap-1.5">
      <div
        className="size-10 rounded-full border border-border-subtle shadow-[0_2px_6px_rgba(26,22,20,0.10)]"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span className="font-mono text-[10px] font-semibold text-text-secondary">{color}</span>
    </div>
  ))}
</div>
```

---

#### P1-C · Standardise page max-widths

Two target widths:
- **Focused pages** (single-task flow): `max-w-[960px]` — UploadPage, GeneratingPage
- **Content-rich pages**: `max-w-[1120px]` — LandingPage (already correct), SetupPage, QuizPage, ResultPage

**Changes needed:**

`src/pages/UploadPage.tsx` — find `max-w-[960px]` — already correct, no change needed.

`src/pages/SetupPage.tsx` — find `max-w-[1060px]` in the inner container div, change to `max-w-[1120px]`.

`src/pages/QuizPage.tsx` — find `max-w-[1120px]` — already correct, no change needed.

`src/pages/GeneratingPage.tsx` — find `max-w-[720px]` on the `<LightCard>`, change to `max-w-[640px]` (card should remain narrow and centred — narrower is more intentional than 720 here).

---

### PRIORITY 2 — High-impact per-page changes

---

#### P2-A · QuizPage — visual dot-step progress indicator

File: `src/pages/QuizPage.tsx`

After the closing `</div>` of the question content (the `<div ref={questionContentRef}>` block, which contains the question header and option cards grid), and BEFORE the error paragraph and navigation buttons `<div className="mt-6 flex flex-col...">`, add this dot progress bar:

```tsx
{/* Step dot progress */}
<div className="mt-5 flex items-center justify-center gap-2" aria-label={`Question ${currentIndex + 1} of ${QUIZ_QUESTIONS.length}`}>
  {QUIZ_QUESTIONS.map((q, i) => {
    const answered = Boolean(answers[q.id]);
    const isCurrent = i === currentIndex;
    return (
      <div
        key={q.id}
        className={[
          'rounded-full transition-all duration-300',
          isCurrent
            ? 'size-2.5 bg-accent'
            : answered
            ? 'size-2 bg-accent/50'
            : 'size-2 bg-border-subtle',
        ].join(' ')}
        aria-current={isCurrent ? 'step' : undefined}
      />
    );
  })}
</div>
```

Also find the existing progress text inside `<div ref={questionContentRef}>`:
```tsx
<p className="text-sm font-semibold text-text-secondary">
  {currentIndex + 1} / {QUIZ_QUESTIONS.length}
</p>
```
Remove it — the dot indicator replaces it.

---

#### P2-B · QuizPage — sidebar accumulates answers

File: `src/pages/QuizPage.tsx`

Find the left sidebar `<div>` (the one with `<p className="text-xs font-bold uppercase tracking-[0.24em] text-accent">Step 3</p>` and the `<h1>`).

After the existing `<div className="mt-6 rounded-lg bg-secondary-muted/70 p-4...">{answeredCount} of...</div>`, add:

```tsx
{answeredCount > 0 && (
  <div className="mt-4 space-y-1.5">
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-text-secondary">Your direction</p>
    {QUIZ_QUESTIONS.slice(0, answeredCount).map((q) => {
      const chosen = q.options.find((o) => o.id === answers[q.id]);
      return chosen ? (
        <div key={q.id} className="flex items-center gap-2 text-sm">
          <span className="text-accent" aria-hidden="true">·</span>
          <span className="font-semibold text-text-primary">{chosen.title}</span>
          <span className="text-text-secondary">— {q.eyebrow}</span>
        </div>
      ) : null;
    })}
  </div>
)}
```

---

#### P2-C · GeneratingPage — personalise with budget + room type

File: `src/pages/GeneratingPage.tsx`

The `design` object is available after the query resolves. The design holds `budget`, `currency`, and there's a `designPlan.styleDirection` when available.

Find the paragraph below the `<h1>`:
```tsx
<p className="mx-auto mt-4 max-w-[500px] text-center text-sm leading-6 text-text-secondary">
  {status === 'failed' || hasLoadError
    ? ...
    : 'This can take a minute while Roomly writes the plan and renders a preview.'}
</p>
```

Change the non-error branch text from the plain string to:
```tsx
: design
  ? `Designing your ${design.currency} $${design.budget} room refresh. This takes about a minute.`
  : 'This can take a minute while Roomly writes the plan and renders a preview.'
```

---

#### P2-D · GeneratingPage — step list as vertical timeline

File: `src/pages/GeneratingPage.tsx`

Find the `<div className="mt-6 grid gap-3">` that maps over `STEPS`. 

Replace the entire step-list `<div className="mt-6 grid gap-3">` block with a vertical timeline layout:

```tsx
<div className="mt-6 relative">
  {/* Vertical connector line */}
  <div className="absolute left-[18px] top-4 bottom-4 w-px bg-border-subtle" aria-hidden="true" />

  <div className="space-y-3">
    {STEPS.map((step) => {
      const active = step.status === status;
      const done = progress >= STATUS_PROGRESS[step.status];

      return (
        <div key={step.status} className="flex items-center gap-4">
          {/* Node */}
          <div className={[
            'relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors',
            done
              ? 'border-accent bg-accent text-white'
              : active || designQuery.isPending
              ? 'border-accent bg-bg-base text-accent'
              : 'border-border-subtle bg-bg-elevated text-text-secondary',
          ].join(' ')}>
            {done ? (
              <CheckCircle2 className="size-4" aria-hidden="true" />
            ) : active || designQuery.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <span className="size-2 rounded-full bg-border-strong" aria-hidden="true" />
            )}
          </div>
          {/* Label */}
          <span className={[
            'text-sm font-semibold',
            done ? 'text-text-primary' : active || designQuery.isPending ? 'text-text-primary' : 'text-text-secondary',
          ].join(' ')}>
            {step.label}
          </span>
        </div>
      );
    })}
  </div>
</div>
```

---

#### P2-E · LandingPage — hero column proportions

File: `src/pages/LandingPage.tsx`

Find the hero grid wrapper:
```tsx
<div className="mx-auto grid max-w-[760px] items-center gap-12 lg:max-w-[1120px] md:grid-cols-[270px_1fr] lg:grid-cols-[0.72fr_1.28fr]">
```

Change `md:grid-cols-[270px_1fr]` to `md:grid-cols-[0.72fr_1.28fr]` (remove the fixed-px minimum at md, keep the same ratio at lg — it's now consistent across both breakpoints).

---

#### P2-F · LandingPage — HowItWorks 2-col mobile layout

File: `src/features/landing/HowItWorks.tsx`

Find the steps grid:
```tsx
<div ref={containerRef} className="relative mt-8 grid gap-8 md:grid-cols-4 md:gap-6">
```

Change to:
```tsx
<div ref={containerRef} className="relative mt-8 grid gap-8 grid-cols-2 md:grid-cols-4 md:gap-6">
```

This gives a 2×2 layout on mobile (which is much better than 1×4), while keeping 4 columns at md+.

Also find the connector line:
```tsx
<div
  ref={lineRef}
  className="pointer-events-none absolute left-[13%] right-[13%] top-[42px] hidden h-px bg-roomly-secondary md:block"
```
This already has `hidden md:block` — correct, no change needed.

---

#### P2-G · LandingPage — examples featured first card

File: `src/pages/LandingPage.tsx`

Find the `ExampleCard` component. Add a `featured` boolean prop:
```tsx
function ExampleCard({ title, price, image, featured }: (typeof examples)[number] & { featured?: boolean }) {
```

Inside `ExampleCard`, update the outer `LightCard` to support spanning:
```tsx
<LightCard className={cn('overflow-hidden p-0', featured && 'lg:col-span-2')} data-reveal>
```

And when `featured` is true, make the image aspect ratio wider:
```tsx
className={cn('aspect-[1.8/1] w-full object-cover', featured && 'lg:aspect-[2.6/1]')}
```

In the `LandingPage` component, update the examples grid and first card:
```tsx
<div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
  {examples.map((example, i) => (
    <ExampleCard key={example.title} {...example} featured={i === 0} />
  ))}
</div>
```

---

#### P2-H · ResultPage — supporting items 2-col grid

File: `src/pages/ResultPage.tsx`

Find the supporting items card content:
```tsx
<div className="mt-4 space-y-3">
  {plan.supporting.map((item) => (
    <div key={`${item.category}-${item.description}`} className="rounded-lg border border-border-subtle p-3">
```

Change `<div className="mt-4 space-y-3">` to `<div className="mt-4 grid gap-3 sm:grid-cols-2">`:
```tsx
<div className="mt-4 grid gap-3 sm:grid-cols-2">
  {plan.supporting.map((item) => (
    <div key={`${item.category}-${item.description}`} className="rounded-lg border border-border-subtle p-3">
```

---

#### P2-I · ResultPage — post-result CTA banner

File: `src/pages/ResultPage.tsx`

After the closing `</div>` of the two-column grid (after `</div>` that closes `<div ref={rightColRef} className="space-y-4">`), and still inside `<div className="mx-auto max-w-[1120px]">`, add:

```tsx
{/* Post-result CTA */}
<div className="mt-12 rounded-xl border border-border-subtle bg-bg-elevated px-6 py-8 text-center md:px-10">
  <p className="text-xs font-bold uppercase tracking-[0.24em] text-accent">What's next</p>
  <h2 className="mt-3 font-display text-[28px] font-semibold text-text-primary md:text-[34px]">
    Love this direction?
  </h2>
  <p className="mx-auto mt-3 max-w-[480px] text-sm leading-6 text-text-secondary">
    Save your result, start shopping from the list above, or create a new design with a different room or budget.
  </p>
  <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
    <Button asChild size="lg" className="h-12 rounded-md px-8 text-[15px] font-bold shadow-none">
      <Link to="/design/upload">Design another room</Link>
    </Button>
    <Button asChild variant="outline" size="lg" className="h-12 rounded-md px-8 text-[15px] font-semibold">
      <Link to="/">Back to home</Link>
    </Button>
  </div>
</div>
```

---

### PRIORITY 3 — Polish

---

#### P3-A · UploadPage — photo tips in left column

File: `src/pages/UploadPage.tsx`

Find the hint card in the left column:
```tsx
<div className="mt-6 rounded-lg bg-secondary-muted/70 p-4 text-sm leading-6 text-text-secondary">
  Use a bright, wide angle if possible. Avoid close-ups of single items.
</div>
```

After that closing `</div>`, add:

```tsx
<div className="mt-6">
  <p className="text-xs font-bold uppercase tracking-[0.18em] text-text-secondary">Photo tips</p>
  <div className="mt-3 grid grid-cols-2 gap-3">
    <div className="rounded-lg border border-success/30 bg-bg-elevated p-3">
      <p className="text-xs font-bold text-success">✓ Good</p>
      <p className="mt-1 text-xs leading-5 text-text-secondary">Wide-angle, bright room, full wall visible</p>
    </div>
    <div className="rounded-lg border border-destructive/30 bg-bg-elevated p-3">
      <p className="text-xs font-bold text-destructive">✗ Avoid</p>
      <p className="mt-1 text-xs leading-5 text-text-secondary">Close-ups of single items or very dark shots</p>
    </div>
  </div>
</div>
```

---

#### P3-B · UploadPage — improve dropzone empty state hierarchy

File: `src/pages/UploadPage.tsx`

Find the dropzone empty state (inside the `else` branch, after `{selectedImage ? ... : (...)}`:
```tsx
<>
  <span className="flex size-16 items-center justify-center rounded-full bg-secondary-muted text-accent">
    <ImagePlus className="size-8" aria-hidden="true" />
  </span>
  <h2 className="mt-5 text-xl font-bold">Drop your room photo here</h2>
  <p className="mt-2 max-w-[330px] text-sm leading-6 text-text-secondary">
    JPG, PNG, or WebP. Maximum 10 MB. One image only.
  </p>
  <Button type="button" className="mt-6" onClick={open}>
    Choose photo
  </Button>
</>
```

Replace with:
```tsx
<>
  <span className="flex size-20 items-center justify-center rounded-full bg-secondary-muted text-accent">
    <ImagePlus className="size-9" aria-hidden="true" />
  </span>
  <h2 className="mt-5 font-display text-2xl font-semibold text-text-primary">Drop your room photo here</h2>
  <p className="mt-2 max-w-[300px] text-xs leading-5 text-text-secondary">
    JPG, PNG, or WebP · Max 10 MB · One image only
  </p>
  <Button type="button" className="mt-6" onClick={open}>
    Choose photo
  </Button>
</>
```

---

#### P3-C · LandingPage — standardise section vertical padding

File: `src/pages/LandingPage.tsx`

Update the padding on each section to follow a consistent rhythm (`py-16 md:py-20` for full sections, `py-10 md:py-12` for compact sections):

1. HowItWorks section padding is handled inside `HowItWorks.tsx` — change `py-14 md:py-[72px]` to `py-16 md:py-20`

2. Examples section: change `py-8 md:py-8` to `py-16 md:py-20`

3. Comparison section: change `py-10 md:py-10` to `py-16 md:py-20`

4. Retailer strip section: change `pb-10 pt-2` to `pb-16 pt-0`

**File for items 1:** `src/features/landing/HowItWorks.tsx`  
**File for items 2–4:** `src/pages/LandingPage.tsx`

---

#### P3-D · LandingPage — footer mobile layout fix

File: `src/pages/LandingPage.tsx`

Find the footer inner grid:
```tsx
<div className="mx-auto grid max-w-[1120px] gap-8 text-sm text-text-primary md:grid-cols-[1.45fr_0.65fr_0.65fr_0.65fr_1.4fr]">
```

Change to:
```tsx
<div className="mx-auto grid max-w-[1120px] gap-8 text-sm text-text-primary grid-cols-2 md:grid-cols-[1.45fr_0.65fr_0.65fr_0.65fr] lg:grid-cols-[1.45fr_0.65fr_0.65fr_0.65fr_1.4fr]">
```

And find the privacy card (last column, the `<div className="rounded-lg bg-secondary-muted/70 p-5">`):
Add `col-span-2 md:col-span-1 lg:col-auto` to it:
```tsx
<div className="col-span-2 rounded-lg bg-secondary-muted/70 p-5 md:col-span-1 lg:col-auto">
```

This makes the privacy card span full width on mobile and at md (where it was cramped in the 5-col grid), and return to its natural column at lg.

---

### PRIORITY 4 — Polish (do last)

---

#### P4-A · SetupPage — skeleton loading state

File: `src/pages/SetupPage.tsx`

Find the loading branch:
```tsx
{analysisQuery.isPending ? (
  <LightCard className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center">
    <Loader2 className="size-8 animate-spin text-accent" aria-hidden="true" />
    <h2 className="mt-5 text-xl font-bold">Analyzing your room</h2>
    <p className="mt-2 max-w-[420px] text-sm leading-6 text-text-secondary">
      Ollama is checking room type, visible furniture, color palette, light, and layout.
    </p>
  </LightCard>
```

Replace with a skeleton that mirrors the 4-card grid layout:
```tsx
{analysisQuery.isPending ? (
  <div className="space-y-4">
    <div className="grid gap-4 md:grid-cols-2">
      {[0, 1, 2, 3].map((i) => (
        <LightCard key={i} className="p-5">
          <div className="flex items-center gap-3">
            <div className="size-5 rounded-full bg-secondary-muted animate-pulse" />
            <div className="h-4 w-24 rounded bg-secondary-muted animate-pulse" />
          </div>
          <div className="mt-4 h-7 w-32 rounded bg-secondary-muted animate-pulse" />
          <div className="mt-2 space-y-1.5">
            <div className="h-3 w-full rounded bg-secondary-muted animate-pulse" />
            <div className="h-3 w-3/4 rounded bg-secondary-muted animate-pulse" />
          </div>
        </LightCard>
      ))}
    </div>
    <LightCard className="p-5">
      <div className="h-4 w-36 rounded bg-secondary-muted animate-pulse" />
      <div className="mt-4 flex flex-wrap gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-7 w-20 rounded-full bg-secondary-muted animate-pulse" />
        ))}
      </div>
      <div className="mt-4 space-y-1.5">
        <div className="h-3 w-full rounded bg-secondary-muted animate-pulse" />
        <div className="h-3 w-5/6 rounded bg-secondary-muted animate-pulse" />
      </div>
    </LightCard>
    <p className="text-center text-sm font-semibold text-text-secondary">Analyzing your room…</p>
  </div>
```

---

## After all changes

1. Run `npx tsc --noEmit` — fix any TypeScript errors before finishing.
2. Run the dev server (`npm run dev`) and check each page visually, especially:
   - The `StepProgress` bar appears correctly on all 5 app pages
   - The palette swatches show actual colours in `ResultPage`
   - The quiz dots update as you answer questions
   - The HowItWorks section shows 2×2 on mobile

---

## What NOT to change

- Any GSAP animation code (`usePageEntrance`, `useScrollReveal`, hero timeline, HowItWorks line draw, etc.)
- `src/main.tsx` (Lenis setup)
- `src/hooks/` directory
- `src/components/Logo.tsx` or `src/components/Navigation.tsx`
- `tailwind.config.ts` or `src/index.css` (unless a change above explicitly requires it)
- Any backend/API code in `src/lib/`
