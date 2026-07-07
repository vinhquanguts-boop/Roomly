# Roomly — Implementation Report v2

**From the Iris Thai Portfolio to an AI Home Decor Product for Budget Users**

Version 2.0 · Rewritten to incorporate local-AI hosting as a first-class option
Working project name: **Roomly** (change before launch)
Foundation codebase: existing Iris Thai Portfolio (React 19 + Vite + shadcn + Three.js + GSAP)

---

## What changed from v1

This is a substantial rewrite of the v1 report. The main change: **AI hosting mode is now a first-class architectural concept**, not a fixed assumption. You can build and ship Roomly for $0/month (fully local), $5–30/month (hybrid), or $150–300/month (fully cloud) — using the same product code, controlled by one environment variable.

Other improvements:
- Added hardware requirements section
- Added a decision matrix for choosing hosting mode
- Rewrote the cost model to cover three scenarios
- Added a "deployment path" section addressing the local-can't-deploy-publicly problem
- Tightened the retailer integration priority
- Sharpened the phase-by-phase plan with hosting-mode-specific notes

---

## Table of Contents

1. Executive Summary
2. Product Vision & Positioning
3. Target User Definition
4. Existing Codebase Assessment
5. Product Structure (Pages, Flows, IA)
6. Technical Architecture
7. AI Hosting Modes (Local / Hybrid / Cloud) — read this before deciding anything else
8. AI Stack (Per-Layer Model Choices)
9. Hardware Requirements
10. Retailer Integration Strategy
11. Design System Adaptation
12. Development Phases (Week-by-Week)
13. Cost Model & Unit Economics (three scenarios)
14. Deployment Path (Dev → Production Migration)
15. Success Metrics & Instrumentation
16. Risks & Mitigations
17. Open Questions to Resolve Before Building
18. Appendices

---

## 1. Executive Summary

### What we're building

Roomly is a web application that helps low-income users design a coherent, beautiful room within a tight budget, using cheap items sourced from AliExpress, Amazon, IKEA, Kmart Home, and Taobao. The user uploads a photo of their real room, sets a budget, and receives an AI-generated design plan with a shoppable list — every item real, priced in their local currency, and matched to the user's aesthetic.

### The strategic positioning

The AI interior design category is crowded with 25+ tools all chasing aspirational customers with big budgets. Roomly targets the opposite end: renters, students, and first-apartment dwellers with $200–800 budgets who currently do their design work manually via TikTok "Taobao spreadsheets" and AliExpress dupe hunts. That audience is underserved, actively searching, and already using the retailers in our supply chain.

### What we reuse from the existing site

The Iris Thai Portfolio codebase is a mature React 19 + Vite + TypeScript foundation with the entire shadcn/ui component library (40+ components), Tailwind CSS, GSAP for micro-interactions, Lenis for smooth scroll, React Three Fiber for optional 3D, react-router v7, react-hook-form + zod for forms, and sonner for toasts. Roughly 3–4 weeks of frontend infrastructure work already done. We keep all of it. We change the visual language, remove the portfolio sections, and build the product on top.

### The critical choice you make first

Before writing any code, decide your **AI hosting mode**:

- **Local mode** — every AI model runs on your machine. $0/month. Requires decent hardware. Cannot deploy publicly without renting a GPU server.
- **Hybrid mode** — cheap models local, expensive models via API. $5–30/month. Recommended for solo builders.
- **Cloud mode** — everything via APIs. $150–300/month. Fastest to build but ongoing cost.

This choice is a single environment variable (`AI_MODE`), and the product code is written to abstract behind it, so you can migrate between modes without a rewrite. §7 goes deep on this.

### Time & cost estimates by mode

| Mode | Setup cost | Monthly ops (500 users) | Time to MVP |
|---|---|---|---|
| Local | $0 (hardware you own) | $0 + electricity | 10–14 weeks |
| Hybrid | $30 API deposits | $5–30 | 8–12 weeks |
| Cloud | $150 API deposits | $150–300 | 8–10 weeks |

Local adds ~2 weeks for infrastructure setup and debugging. Hybrid is the sweet spot for most solo builders.

### Success looks like

By week 12: 500 real users have completed at least one design, 15% have clicked through to a retailer, we know our activation and retention numbers, and we can decide whether to invest another 3 months into scale.

---

## 2. Product Vision & Positioning

### The pitch (one sentence)

*Roomly designs a beautiful room for you — using only items you can actually afford — in five minutes.*

### The extended pitch

Every AI interior design tool today shows you a fantasy render of a room you can't afford, with furniture that doesn't exist, from retailers with prices you can't stomach. Roomly starts from a different place. We ask what you can spend. We look at what you actually have. We design a coherent room within that budget, using real items from stores that deliver to your country. And we tell you *why* each piece works — so you learn design as you go, not just consume it.

### What we explicitly are not

- Not a designer tool for professionals (that's Homestyler CAD)
- Not a virtual staging tool for realtors (that's Interior AI)
- Not a "get inspired" fantasy renderer (that's RoomGPT)
- Not a marketplace or storefront (we link out to real retailers)
- Not a subscription-first product (freemium with affiliate revenue)

### Differentiation summary

| Category | Incumbent examples | Our position |
|---|---|---|
| Photo restyle | RoomGPT, Interior AI | We add shoppable + real prices + budget constraint |
| 3D planners | Planner 5D, Homestyler CAD | We're faster, no manual assembly, AI-driven |
| Shoppable renders | MeltFlex, Wayfair Muse | We serve budget audience, not aspirational |
| Human hybrid | Havenly, Decorilla | We're free/cheap and instant |
| Manual TikTok workflow | Taobao spreadsheets | We automate what people are doing by hand |

---

## 3. Target User Definition

### Primary persona: The First-Apartment Renter (Australia/Singapore/UK)

- 22–30 years old, just moved into a rented studio or one-bedroom
- Total decorating budget: $200–$800
- Shops at Kmart Home habitually; has bought from Taobao or AliExpress before, or willing to try
- Follows home aesthetic accounts on TikTok and Instagram
- Doesn't want to spend hours researching or making spreadsheets
- Wants a coherent look, doesn't know how to achieve it
- Motivated by: making a rental feel like *home*, being proud to have friends over

### Secondary persona: The Student

- 18–25, dorms or shared houses
- Budget: $50–$300 for a room refresh
- Moves every 6–12 months → wants non-permanent solutions
- Extreme reliance on Pinterest/TikTok inspiration
- Buys almost everything online

### Tertiary persona: The First-Time Renter Family

- Young couples or single parents in first shared rental
- Budget: $500–$1500 spread across multiple rooms
- Cares about coherence across bedroom / living / kitchen
- Long-tail user — will use us across a year

### What all three share

- Price sensitivity is *the* organizing constraint, not an afterthought
- Willing to wait 2–4 weeks for cross-border shipping if the price is right
- Comfortable with mobile-first tools
- Distrustful of overpolished marketing; prefer honesty about tradeoffs
- Share what they love on TikTok/Instagram — meaning our best users are also our best marketers

### Explicit non-audience

- Homeowners doing renovations (different budget scale)
- Real estate agents staging listings (different value prop)
- Professional designers (different tooling depth)

---

## 4. Existing Codebase Assessment

### What we keep as-is

| Asset | Reason |
|---|---|
| React 19 + Vite + TypeScript | Fast, modern, already configured |
| Full shadcn/ui component library (`src/components/ui/`, 40+ primitives) | Weeks of work; every form, dialog, sheet, and command palette we need |
| Tailwind CSS + `tailwind-merge` + `class-variance-authority` | Standard shadcn stack |
| GSAP + ScrollTrigger (via `useScrollReveal`) | Reuse for section reveals on landing page |
| Lenis smooth scroll | Keeps landing page premium feel |
| react-router v7 (already installed) | Routing |
| react-hook-form + zod (already installed) | Form validation across the flow |
| sonner (already installed) | Toast notifications |
| lucide-react icons | Consistent icon system |
| `useMousePosition`, `useReducedMotion` hooks | Reuse for micro-interactions |
| `GlassCard`, `DotMatrixPattern`, `SectionLabel` components | Rename/re-theme; keep the patterns |

### What we modify

| Asset | Change |
|---|---|
| `tailwind.config.js` color tokens | Dark editorial palette → warm-neutral palette (see §11) |
| `tailwind.config.js` font tokens | Playfair Display → Fraunces; keep Inter |
| `index.html` | New title, new font preconnects |
| `GlassCard` → `LightCard` | Same component pattern, light-mode glass over warm background |

### What we remove

| Asset | Reason |
|---|---|
| `src/sections/HeroSection.tsx` (with 3D fly-through) | Cinematic intro kills load time; audience wants speed |
| `src/sections/WorkShowcaseSection.tsx` | Portfolio-specific |
| `src/sections/ProcessSection.tsx` | Copy its line-draw pattern into new "How it works" |
| `src/sections/AboutSection.tsx` | Portfolio-specific |
| `src/sections/ContactSection.tsx` | Not needed |
| `FloatingCards`, `ParticleField` R3F components | 3D intro assets, not needed for the product |

**Note on Three.js:** We keep `@react-three/fiber`, `@react-three/drei`, and `three` installed for potential future use (a 3D "walk through your room" premium feature), but we do not use them in the MVP.

### What we add

#### Frontend additions

| Addition | Purpose |
|---|---|
| `@tanstack/react-query` ^5 | Server state / caching |
| `zustand` ^5 | Client state (design draft, chat thread) |
| `react-dropzone` ^14 | Upload UI |
| `better-auth` + `@better-auth/react` (Phase 6) | Auth |

#### Backend (new, doesn't exist yet)

| Layer | Choice | Rationale |
|---|---|---|
| Runtime | Node 20 with **Hono** framework | Fast, TypeScript-native, single language as the frontend |
| Database | **Postgres** with **pgvector** extension | Cheapest path; embeddings + relational in one place |
| Object storage | Local filesystem (dev) / **Cloudflare R2** (prod) | Free in dev; cheap in prod |
| Cache | Local Redis (dev) / **Upstash Redis** (prod) | Free in dev; serverless in prod |
| Queue | Simple in-memory (dev) / Cloudflare Queues (prod) | Free in dev |
| Auth | **Better Auth** self-hosted | Free forever, clean API |

#### AI infrastructure — hosting-mode-dependent — see §7 for the deep dive

---

## 5. Product Structure (Pages, Flows, IA)

### Site map

```
/                        Landing page (marketing)
/design                  Design flow entry
/design/upload           Step 1: Upload room photo
/design/setup            Step 2: Budget + room type + style
/design/quiz             Step 3: Style quiz (new users only)
/design/generating/:id   Step 4: Loading state (progress indicators)
/design/result/:id       Step 5: Results with shopping list + chat
/explore                 Community designs (public, browsable)
/explore/:id             View a public design
/how-it-works            Educational content
/about                   About / privacy stance / team
/pricing                 Free vs Premium tiers (Phase 4+)

Auth-gated pages:
/dashboard               My designs
/dashboard/saved         Saved looks / boards
/dashboard/profile       Style profile
/dashboard/settings      Account settings
```

### The core loop (design flow)

```
User arrives
   ↓
Uploads room photo (react-dropzone)
   ↓
[VLM] Room analysis → structured JSON stored
   ↓
User sets: budget, room type, delivery urgency, style direction
   ↓
[Style quiz] (5 questions, image-based) if no profile yet
   ↓
[LLM] Design plan generation:
   - Palette (3–5 colours)
   - Hero piece category + price range
   - Supporting items (5–8 categories with per-item budgets)
   - Rationale for each
   ↓
[Retrieval] For each item slot, find top 5 candidates from indexed catalog
   ↓
[LLM re-rank] Validate coherence across selected items; swap if needed
   ↓
[Image gen] SDXL + Depth ControlNet + MLSD ControlNet render the room with new items
   ↓
Results page renders with:
   - Before/after images
   - Shopping list (item cards with price, retailer, delivery time, trust flag)
   - Total cost bar
   - "Why this works" explanation per item
   - Chat input for refinement
   ↓
User refines via chat OR clicks affiliate links OR saves design
```

### Landing page structure (reuses existing patterns)

- **Nav** (adapted from existing) — logo, Explore, How it works, Sign in, CTA
- **Hero** — value prop headline + subheadline + example before/after + primary CTA (no 3D intro; subtle fade-in only)
- **How it works** — 4 steps using the line-draw pattern from `ProcessSection`
- **Example designs** — grid of real designs, filterable by budget and style
- **Why we're different** — comparison table
- **Retailer trust** — logos of AliExpress, Amazon, IKEA, Kmart, Taobao
- **CTA + Footer** — start designing; privacy-first messaging

---

## 6. Technical Architecture

### High-level diagram

```
┌───────────────────────────────────────────────────────────────┐
│                    FRONTEND (Cloudflare Pages / Vercel)       │
│   React 19 + Vite + shadcn + Tailwind + GSAP + Lenis          │
│   React Router v7 + TanStack Query + Zustand                  │
└───────────┬───────────────────────────────────────────┬───────┘
            │ HTTPS / JSON                              │ Upload
            │                                           │
            ▼                                           ▼
┌───────────────────────────────────┐   ┌────────────────────────┐
│  BACKEND (Node + Hono)            │   │  Object Storage        │
│  Routes: /api/analyze /api/design │   │  Local FS (dev)        │
│          /api/chat /api/products  │   │  R2 (prod)             │
│          /api/auth                │   └────────────────────────┘
└──┬─────────────────────────┬──────┘
   │                         │
   ▼                         ▼
┌──────────┐   ┌──────────────────────────────────────────────┐
│ Postgres │   │  AI PROVIDER (abstract interface)            │
│+pgvector │   │  ┌────────────────────────────────────────┐  │
│          │   │  │ LocalProvider (Ollama + ComfyUI + …)   │  │
│- users   │   │  ├────────────────────────────────────────┤  │
│- designs │   │  │ HybridProvider (mix)                   │  │
│- items   │   │  ├────────────────────────────────────────┤  │
│- reviews │   │  │ CloudProvider (Fireworks + Replicate)  │  │
└──────────┘   │  └────────────────────────────────────────┘  │
               │  Selected by AI_MODE env var                 │
               └──────────────────────────────────────────────┘
                              ▲
                              │
                 ┌──────────────────────────┐
                 │  BACKGROUND WORKERS      │
                 │  - Catalog ingestion     │
                 │  - Product embedding     │
                 │  - Review sentiment      │
                 └──────────────────────────┘
                              ▲
                              │
                 ┌──────────────────────────┐
                 │  RETAILER APIs           │
                 │  AliExpress, Amazon,     │
                 │  IKEA, Taobao, Kmart     │
                 └──────────────────────────┘
```

### The `AIProvider` interface

The single most important architectural decision. Every AI call in the product goes through this interface:

```typescript
export interface AIProvider {
  analyzeRoom(imageUrl: string): Promise<RoomAnalysis>;
  generateDesignPlan(input: DesignPlanInput): Promise<DesignPlan>;
  chatRefine(input: ChatInput): Promise<ChatResult>;
  renderImage(input: RenderInput): Promise<{ url: string }>;
  segmentRegion(input: SegmentInput): Promise<{ maskUrl: string }>;
  embedImage(imageUrl: string): Promise<number[]>;
  embedText(text: string): Promise<number[]>;
}
```

Three implementations: `LocalProvider`, `HybridProvider`, `CloudProvider`. Selected at startup based on `AI_MODE`. Rest of the code never knows which mode is running.

This means you can start local for free, migrate to hybrid when you're ready to deploy, and scale to cloud without touching any product code. It's the single most valuable architectural choice in this plan.

### Data model (Postgres)

```sql
-- Users (auth-managed table)
users (id, email, created_at, style_profile_id, country, currency)

-- Style profiles derived from quiz
style_profiles (id, user_id, embedding vector(768), preferences jsonb, updated_at)

-- Uploaded room photos
rooms (id, user_id, storage_url, vlm_analysis jsonb, created_at)

-- A design attempt
designs (id, user_id, room_id, status, budget, currency, style_direction,
         design_plan jsonb, render_url, shared_slug, created_at, updated_at)

-- Line items in a design
design_items (id, design_id, category, product_id, position, rationale,
              price_at_generation, currency_at_generation)

-- Retailer catalog (indexed)
products (id, retailer, external_id, title, description, image_url,
          price, currency, in_stock, sold_count, rating,
          image_embedding vector(768), text_embedding vector(768),
          category, dimensions_cm, quality_risk_score, updated_at)

-- Aggregated review sentiment
product_reviews (product_id, review_count, positive_pct, negative_flags jsonb, updated_at)

-- Community explore feed
public_designs (design_id, published_at, likes_count, style_tags)

-- Chat threads on a design
chat_messages (id, design_id, role, content, tool_calls jsonb, created_at)

-- User feedback loop (post-purchase)
purchase_outcomes (id, user_id, product_id, satisfied bool, notes, created_at)
```

### API routes (Hono)

```
GET  /api/health
POST /api/rooms/upload           → upload URL / direct upload
POST /api/rooms/:id/analyze      → run VLM, store result
POST /api/designs                → create new design (kicks off pipeline)
GET  /api/designs/:id            → fetch design + items
POST /api/designs/:id/chat       → refine via chat
POST /api/designs/:id/save       → persist to user dashboard
POST /api/designs/:id/publish    → make public
GET  /api/designs/public/:slug   → render shared design
GET  /api/products/search        → vector + filter search
POST /api/products/track-click   → affiliate click tracking + redirect
GET  /api/explore                → community feed
POST /api/feedback               → post-purchase outcome
```

---

## 7. AI Hosting Modes — read before deciding anything else

This section replaces what was a fixed cloud-API assumption in v1. Every downstream decision (cost model, phases, deployment path) depends on which mode you choose. The good news: your product code doesn't care.

### 7.1 The three modes

**Local mode (`AI_MODE=local`)**
Every AI model runs on your development machine. Zero API bills. Requires meaningful hardware (see §9). Cannot deploy publicly without renting a GPU server. Best for: initial development, personal use, learning AI infrastructure deeply, privacy-obsessed users.

**Hybrid mode (`AI_MODE=hybrid`) — recommended default**
Cheap local models handle high-volume, low-stakes tasks (room analysis via VLM, chat, embeddings). The expensive/quality-critical model (design plan reasoning) uses the DeepSeek API directly (~$0.27 per million tokens — trivially cheap). Image generation starts on Replicate for iteration speed, migrates local once workflow is stable. Best for: solo builders launching publicly on a shoestring.

**Cloud mode (`AI_MODE=cloud`)**
Every model runs via an API provider. Zero infrastructure. Fastest to develop. Ongoing cost. Best for: teams with budget, or local hardware becomes a bottleneck as you scale.

### 7.2 Layer-by-layer breakdown

| Layer | Local option | Hybrid choice | Cloud option |
|---|---|---|---|
| Vision analysis (VLM) | Ollama + `qwen2.5vl:7b` | **Local** | Fireworks (Qwen2.5-VL) |
| Design plan (LLM) | Ollama + `qwen2.5:14b` | **DeepSeek direct API** | Fireworks (DeepSeek V3) |
| Chat refinement | Ollama + `qwen2.5:7b` | **Local** | Fireworks (DeepSeek V3) |
| Image generation | ComfyUI + SD 1.5/SDXL + ControlNets | **Replicate → migrate local** | Replicate |
| Depth/MLSD preprocess | ComfyUI plugins | Same | Replicate |
| Segmentation (SAM 2) | Local Python server | **Local** | Replicate |
| Image embeddings | Local FastAPI + Marqo/CLIP | **Local** | Modal (self-hosted) |
| Text embeddings | Local FastAPI + Marqo/CLIP | **Local** | Modal (self-hosted) |
| Vector search | pgvector | pgvector | pgvector or Qdrant Cloud |

### 7.3 Why hybrid is the recommended default

Three reasons:

**1. Cost fits reality.** The AI calls that happen most often (room analysis, chat, embeddings) run locally for free. The one that most benefits from a large model (design plan reasoning) uses DeepSeek's own API at ~$0.001 per plan — under a dollar for a thousand designs.

**2. Quality where it matters.** DeepSeek V3 is a 671-billion-parameter model. The best local LLM you can run comfortably is ~14 billion parameters. For simple chat that gap is invisible; for complex budget-constrained design plans it's real. Hybrid buys you the quality where it counts.

**3. Migration is trivial.** Because everything goes through `AIProvider`, moving a layer from local to cloud or back is one line of config change. Start hybrid, move image gen local once you have a stable prompt, or bump chat to cloud if quality lags.

### 7.4 When to choose local instead of hybrid

Local is right if:
- You already own good hardware (M-series ≥16 GB or NVIDIA ≥12 GB VRAM)
- You want to learn AI infrastructure end-to-end
- You genuinely have $0/month budget and time to spare
- You don't plan to deploy publicly (personal or friends-only use)
- Privacy is a hard constraint — no data leaves your machine

Local is wrong if:
- You want to launch publicly on the web (requires renting a GPU server, brings you back to cost)
- You're on a laptop with integrated graphics only
- You want validation from real users fast
- Your product prioritizes speed of response

### 7.5 When to choose cloud instead of hybrid

Cloud is right if:
- You have $200+/month operating budget
- You value zero setup time over cost
- You're a team where developer time is more expensive than API bills
- Your hardware is a bottleneck

### 7.6 Migration path between modes

The intended lifecycle:

```
Weeks 1–4:  Local mode           → develop, iterate freely, $0 cost
Weeks 5–8:  Hybrid mode          → integrate DeepSeek API + Replicate for image gen
Weeks 9–12: Hybrid + deploy     → deploy backend to Fly.io or Railway
                                   with modest GPU (only if serving locally)
Post-launch: Optimize per layer  → move layers cloud→local or vice versa
                                   as cost/quality data emerges
```

This works precisely because `AIProvider` abstracts the transitions.

---

## 8. AI Stack — Per-Layer Model Choices

### Layer 1: Vision analysis (room understanding)

**Model:** Qwen2.5-VL 7B
- Local: Ollama pull `qwen2.5vl:7b` (~5 GB download, needs ~8 GB VRAM)
- Cloud: Fireworks.ai model ID `accounts/fireworks/models/qwen2p5-vl-7b-instruct` (~$0.008 per analysis)

**Why:** Same weights, same quality either way. Excellent for Chinese and English (matters for Taobao integration). Apache 2.0 license.

### Layer 2: Reasoning (design plan generation)

**Model:** Qwen 2.5 14B locally, or DeepSeek V3 via API
- Local: Ollama pull `qwen2.5:14b` (~9 GB, needs ~10 GB VRAM)
- Hybrid recommended: DeepSeek direct API — `deepseek-chat` at ~$0.001 per plan
- Cloud: Fireworks `accounts/fireworks/models/deepseek-v3`

**Why the local/cloud split:** Design plan generation is a complex constraint-satisfaction task (budget cap + palette coherence + style consistency + real product availability). Bigger models handle this measurably better. DeepSeek V3 is 100× the parameters of what you can run locally. The cost is trivial (fractions of a cent per plan) — this is the one layer where hybrid strongly beats pure local.

### Layer 3: Chat refinement

**Model:** Qwen 2.5 7B locally, or DeepSeek V3 via API
- Local: `qwen2.5:7b` (~4 GB download, needs ~6 GB VRAM)
- Cloud/hybrid: Same as above

**Why:** Chat is simpler than design plan generation. Local quality is fine. Use whatever's already running.

### Layer 4: Image generation

**Model:** SD 1.5 or SDXL + ControlNets
- Local: ComfyUI + downloaded model files (~20 GB total)
- Cloud: Replicate (~$0.03 per render)

**Structural preservation (critical):**
- Depth ControlNet — extracted via Depth Anything V2 preprocessor
- MLSD ControlNet — line detection for architecture preservation
- Combined weight: Depth 0.6 + MLSD 0.5 typically

**Model choice tradeoff:**
- **SD 1.5** — smaller (2 GB), better ControlNet support for MLSD, mature ecosystem, community-trained interior LoRAs available. Lower base image quality. My recommendation for local mode.
- **SDXL** — larger (7 GB), higher base quality, weaker MLSD support (only Depth works well). Better for cloud mode where you have compute headroom.
- **FLUX.1 [schnell]** — Apache 2.0 licensed, best quality, requires ≥16 GB VRAM comfortably. For scale-up later.

### Layer 5: Region segmentation (surgical edits)

**Model:** SAM 2 (Segment Anything Model 2)
- Local: Python server exposing SAM 2 via FastAPI (~500 MB, needs ~4 GB VRAM)
- Cloud: Replicate (~$0.01 per segmentation)

**Optional:** Grounded-SAM adds text-prompted segmentation ("segment the sofa") on top.

### Layer 6: Product embeddings (the dupe finder engine)

**Model:** Marqo E-commerce Embeddings B
- Local: Sentence-transformers Python server (~220 MB, needs ~2 GB VRAM)
- Cloud: Self-host on Modal.com (serverless GPU, scale to zero)

**Why local recommended for all modes:** No major API provider hosts e-commerce embedding models. Even in cloud mode you'll self-host this on Modal. Same code either way.

### Layer 7: Vector database

**pgvector** on your Postgres. Zero cost either way. Postgres is either local Docker in dev, or hosted on Neon/Supabase in prod.

---

## 9. Hardware Requirements (for Local and Hybrid modes)

The single most important factor for local AI viability is GPU memory (VRAM on NVIDIA, unified memory on Apple Silicon). Here's the honest breakdown.

### Minimum viable — degraded experience

- **Mac:** M1/M2/M3 base model, 8 GB unified memory
- **PC:** NVIDIA GPU with 8 GB VRAM (RTX 3060, 3070, 4060)
- **Reality:** Small models only (Qwen 2.5 3B, Moondream). Room analysis takes 30–60 seconds. Design plan quality noticeably weaker. SDXL painful; SD 1.5 works but slow (~40 sec per image). Not fun.

### Recommended for local mode

- **Mac:** M-series with 24+ GB unified memory (M2/M3 Pro or Max)
- **PC:** NVIDIA GPU with 12–16 GB VRAM (RTX 4070, 4070 Ti Super, 4060 Ti 16GB)
- **Reality:** Everything runs. Room analysis 5–10 sec. Design plan 5–15 sec. SDXL renders in ~15–25 sec. Comfortable development experience.

### Best case

- **Mac:** M3 Max / M4 Max with 64+ GB
- **PC:** NVIDIA RTX 3090, 4090, or 5090 (24 GB VRAM)
- **Reality:** FLUX-quality generation, larger LLMs, multiple models loaded simultaneously. Best iteration speed.

### What if you have less

If you have 8 GB or less VRAM and no budget for hardware upgrades, **use hybrid mode**. Set `AI_MODE=hybrid` and only run the small VLM + embeddings locally. Everything else via API costs pennies. This is the pragmatic answer for constrained hardware.

### Disk space needed for local mode

- Ollama models (VLM + LLM): ~15 GB
- ComfyUI + SD 1.5 base + ControlNets + preprocessors: ~15 GB
- ComfyUI + SDXL base + ControlNets: +15 GB (if used)
- SAM 2: ~500 MB
- Embedding models: ~1 GB
- Product catalog images (Phase 4): 2–10 GB depending on scale
- **Reserve 50 GB free** for a comfortable local setup

### Electricity note

A 300 W GPU running 4 hours a day for a month is ~36 kWh, or roughly $10–15 in most markets. Not zero, but not meaningful compared to hardware capital cost.

---

## 10. Retailer Integration Strategy

### Priority tiers

| Tier | Retailer | Integration | Affiliate | Delivery | Role |
|---|---|---|---|---|---|
| A | AliExpress | Portals API | Yes, up to 9% | 1–3 weeks | Primary shopping backend |
| A | Amazon | PA-API 5.0 | Yes, 3–4.5% | 1–3 days | Fast-delivery fallback |
| B | IKEA | Scraped catalog | No | 3–7 days | Trusted anchor product |
| B | Taobao | Shopping agent partnership | Depends | 2–4 weeks | Aspirational cheap dupes |
| C | Kmart Home | Link-out only | No | Same day (physical) | Cultural relevance (AU/NZ) |

### Ingestion plan

- **AliExpress Portals**: apply for affiliate account (approval 1–2 weeks). Once approved, use search API to ingest 20,000+ home/garden products across relevant categories. Refresh weekly.
- **Amazon PA-API**: apply for Associates in your target country; PA-API access requires 3 qualifying sales first — plan a manual seeding phase. Ingest 20,000+ products.
- **IKEA**: undocumented but stable JSON endpoints per country. Ingest ~5,000 core products per region. Legal grey area — respect robots.txt, low request rates, cache aggressively.
- **Taobao**: partner with a shopping agent (Sugargoo, Superbuy, CNfans) or use Taobao Australia/Singapore's programs where available. Start manual; automate later.
- **Kmart**: manual catalog of ~500 curated items per country, refreshed monthly. No API — human-curated slice.

### Embedding pipeline (same regardless of mode)

Every product enters the catalog with:
1. Cleaned title + description
2. Category classified via LLM (once, cached)
3. Image downloaded to storage
4. Image embedded via Marqo E-commerce model → stored in pgvector
5. Text embedded via same model → stored in pgvector
6. Sold count, rating, review count tracked

### Click tracking + affiliate revenue

All product clicks go through `/api/products/track-click?id=X&design_id=Y` which:
1. Logs the click
2. Appends the affiliate tag for the retailer
3. Redirects to the retailer with 302

Attribution windows honoured per retailer's affiliate rules.

### Trust layer (Phase 5)

For each product, compute a `quality_risk_score` from:
- Review count (lower = riskier)
- Sold count (lower = riskier)
- Review sentiment score
- Category historical disappointment rate (learned over time)
- Seller age (if scrapeable)

Display as: `Safe pick` / `Good bet` / `Roll the dice` badges — never hide, always inform.

---

## 11. Design System Adaptation

### The rationale for changing the palette

The Iris Thai palette is dark editorial (`#000510` near-black, blue accents, Playfair Display serif). That aesthetic signals *premium, exclusive, expensive*. Our audience is *renters on tight budgets who deserve to feel welcomed, not filtered*. Keeping the dark palette would fight the positioning.

We keep the *sophistication* — clean typography, restrained motion, careful spacing — but shift the *emotional temperature* from cold-exclusive to warm-inviting.

### New palette

```
--bg-base:        #F7F3ED   (warm off-white, primary background)
--bg-elevated:    #FEFCF9   (card/glass background)
--bg-inset:       #EFEAE0   (subtle wells and inputs)

--text-primary:   #1A1614   (warm charcoal, not pure black)
--text-secondary: #6B5F55   (warm taupe)
--text-tertiary:  #9B8E82   (muted mid-tone)

--accent:         #C7684A   (terracotta, primary accent)
--accent-hover:   #B2593D
--accent-muted:   #E8D5CD

--secondary:      #7B8B6F   (sage green, secondary accent)
--secondary-muted:#DCE2D5

--success:        #6B8E6B
--warning:        #C89B3C   (warm amber, for "wait time" flags)
--danger:         #A94438

--border-subtle:  rgba(26, 22, 20, 0.08)
--border-strong:  rgba(26, 22, 20, 0.15)
--border-glow:    rgba(199, 104, 74, 0.25)

--shadow-card:    0 4px 24px rgba(26, 22, 20, 0.06)
--shadow-elevated:0 12px 48px rgba(26, 22, 20, 0.10)
```

### Typography

- **Display:** Fraunces (Google Fonts, variable) — expressive but modern serif
- **Body:** Inter (kept from existing)
- **Monospace:** JetBrains Mono — for prices and codes

### Motion adjustments

- Remove: 3D fly-through intro
- Keep: GSAP ScrollTrigger reveals on landing (translateY 40→0, 0.8s)
- Keep: process line-draw for "How it works"
- Add: subtle hover elevations on product cards
- Add: "add to design" spring animations
- Reduce: overall motion budget — this is a tool, not a portfolio

### Component renames

| Old | New | Reason |
|---|---|---|
| `GlassCard` | `LightCard` | Same pattern, light-mode glass over warm bg |
| `PrimaryButton` | (delete, use shadcn `Button`) | shadcn already provides this |
| `SecondaryButton` | (delete, use shadcn variants) | Same |

---

## 12. Development Phases (Week-by-Week)

Each phase ends with a demoable milestone. Timelines below assume hybrid mode; add 15–25% for pure local, subtract 10% for pure cloud.

### Phase 0 — Foundation (Week 1)

**Milestone:** Environments set up, existing project stripped and re-themed, chosen AI hosting mode operational.

- Fork/branch the existing repo
- Update `tailwind.config.js` and CSS variables with new palette + fonts
- Delete portfolio sections; keep component library and hooks
- Set up backend project (Hono) with health check
- Set up Postgres locally (Docker or brew), enable pgvector
- **Choose your AI hosting mode** and configure `.env.local`:
  - Local: install Ollama, pull required models
  - Hybrid: install Ollama for local layers + sign up for DeepSeek + Replicate
  - Cloud: sign up for Fireworks + Replicate + Modal
- Verify all AI endpoints work with a `test-connections` script

**Deliverable:** Landing page skeleton with new theme; backend ping works; all configured AI endpoints respond to a smoke test.

### Phase 1 — Landing page (Week 2)

**Milestone:** Public-facing landing page live.

- Landing hero
- "How it works" 4-step section (line-draw pattern from `ProcessSection`)
- Example gallery (mock data, 6 fake before/afters)
- Comparison table
- Retailer trust logos
- Footer
- Mobile responsive
- Deploy to Cloudflare Pages or Vercel

**Deliverable:** Public landing page live.

### Phase 2 — Upload + VLM analysis (Week 3)

**Milestone:** User uploads a photo and sees structured analysis.

- `/design/upload` page with react-dropzone
- Signed upload URL from backend (local FS in dev, R2 in prod)
- `/api/rooms/upload` and `/api/rooms/:id/analyze` endpoints
- `AIProvider.analyzeRoom()` implementation (works in all three modes)
- `/design/setup` page for budget + room type + urgency
- Display VLM analysis on setup page

**Deliverable:** Working upload → analyze → display flow.

### Phase 3 — Design plan generation + render (Week 4)

**Milestone:** User gets a full AI-generated design plan with rendered image.

- Style quiz (`/design/quiz`) — 5 questions, image-based
- Design plan generation via `AIProvider.generateDesignPlan()`
- Zod schema validation on output
- Image render pipeline via `AIProvider.renderImage()`
- Progress states on `/design/generating/:id`
- `/design/result/:id` initial page

**Deliverable:** End-to-end generation flow. No shopping yet.

### Phase 4 — Product retrieval + shopping list (Week 5–6)

**Milestone:** Results page shows real, priced, linked products.

- Set up product catalog schema in Postgres
- Manual seed: 500 IKEA products, 2,000 AliExpress, 2,000 Amazon (per country)
- Embedding pipeline via `AIProvider.embedImage()` / `embedText()`
- Product retrieval endpoint with vector search + filters
- LLM re-rank pass for coherence
- Shopping list UI: cards per item
- Budget bar
- Affiliate click tracking + redirect

**Deliverable:** Real products, real prices, real click-through.

### Phase 5 — Chat refinement (Week 7)

**Milestone:** User refines design via chat.

- Chat panel on results page (Sheet or Drawer)
- `/api/designs/:id/chat` endpoint
- `AIProvider.chatRefine()` with tool schema
- Item swap or full regenerate based on intent
- Optimistic UI

**Deliverable:** Conversational refinement working.

### Phase 6 — Save, share, dashboard, auth (Week 8)

**Milestone:** Users save designs, share via public URL.

- Better Auth setup
- Anonymous session ID → user migration on sign-up
- `/dashboard` for saved designs
- Public share URL (`/explore/:slug`)
- Open Graph tags for social preview
- Explore feed

**Deliverable:** Saveable, shareable, browseable.

### Phase 7 — Trust layer + quality flags (Week 9)

**Milestone:** Product recommendations flagged by trust risk.

- Review scraping pipeline per retailer
- Sentiment classifier (small model)
- Quality risk scoring
- UI badges on product cards
- Post-purchase feedback form (email at 4 weeks)

**Deliverable:** Trust layer visible; feedback loop closes.

### Phase 8 — Polish + launch prep (Week 10)

**Milestone:** Ready to launch to public.

- Analytics (PostHog)
- Error monitoring (Sentry)
- Rate limiting per user/IP
- Cost tracking per user (hard limits on free tier — even more critical in hybrid mode)
- SEO metadata + sitemap
- Landing page copy polish
- Legal pages: privacy, terms
- TikTok launch content

**Deliverable:** Public launch.

### Phase 9+ — Growth features (post-launch)

- Style LoRA training pipeline
- Multi-room whole-home coherence
- Native iOS app with LiDAR scan
- Premium tier (unlimited generations)
- Community features
- Regional expansion

---

## 13. Cost Model & Unit Economics (Three Scenarios)

### One-time setup costs

| Item | Local | Hybrid | Cloud |
|---|---|---|---|
| Domain | $15 | $15 | $15 |
| Hardware (if not owned) | $0–2000 | $0 | $0 |
| API deposits | $0 | $30 | $150 |
| Development time (opportunity cost) | 12+ weeks | 10 weeks | 8 weeks |
| **Total cash outlay (before hardware)** | **~$15** | **~$45** | **~$165** |

### Monthly recurring costs (first 500 active users)

| Item | Local | Hybrid | Cloud |
|---|---|---|---|
| Cloudflare Pages | $0 | $0 | $0 |
| Postgres (Neon starter or self-hosted) | $0 (self) or $19 | $19 | $19 |
| Redis | $0 (self) | ~$5 | ~$5 |
| Object storage | $0 (self) | ~$3 | ~$3 |
| AI: VLM (Fireworks) | $0 | $0 (local) | ~$40 |
| AI: LLM design plan (DeepSeek direct) | $0 | ~$5 | ~$5 |
| AI: LLM chat (Fireworks) | $0 | $0 (local) | ~$10 |
| AI: Image gen (Replicate) | $0 | ~$60 → $0 (migrate local) | ~$60 |
| AI: SAM 2 (Replicate) | $0 | $0 (local) | ~$10 |
| AI: Embeddings (Modal) | $0 | $0 (local) | ~$25 |
| Electricity (local mode only) | ~$15 | ~$5 | $0 |
| Domain renewal (amortized) | $1 | $1 | $1 |
| **Total per month** | **~$16 (self-hosted DB)** or **~$40 (managed DB)** | **~$100** initially, **~$40** after image gen migrated local | **~$180** |

### Revenue model (same for all modes)

| Source | Rate | Notes |
|---|---|---|
| AliExpress Portals | up to 9% of sale | Home & garden category |
| Amazon Associates | 3–4.5% | Home category |
| Direct partnerships | negotiable | Phase 9+ |
| Premium subscription (later) | $3–$5/mo | Phase 9+ |

### Break-even sketch (assumes hybrid)

- Assume $250 average basket per activated user (buys 3–4 items)
- Blended affiliate commission: 6% → $15 per activated user
- Assume 20% of users who complete a design click through and buy
- At $100/mo fixed + $0.05 per session variable: with 500 sessions/mo (100 activated → $1,500 revenue), we net ~$1,375/mo

Directional. Validate with real data.

---

## 14. Deployment Path (Dev → Production Migration)

This is where a lot of hobby projects die: you build locally, then discover you can't deploy without either exposing your home machine or paying for a GPU server. Here's how each mode handles it.

### Local mode deployment options

Local mode can't be deployed to a public URL as-is without one of:

**Option A — Just don't deploy.** Use it locally, share it with friends on your network via ngrok or tailscale. Fine for personal use. Not a product.

**Option B — Rent a GPU server.** Use RunPod, Vast.ai, or a Modal always-on deployment with GPU. Cost ~$150–500/month for a GPU that can serve moderate traffic. At this point you're paying more than hybrid mode.

**Option C — Migrate to hybrid mode.** Because of the `AIProvider` abstraction, this is one line of config plus signing up for the APIs. This is why the abstraction is worth building even if you start local.

**My recommendation:** Local for development, hybrid for public deployment. Set `AI_MODE=local` in `.env.development` and `AI_MODE=hybrid` in `.env.production`. Done.

### Hybrid mode deployment

Deploys anywhere. Backend on Fly.io, Railway, or Render (~$5–20/mo). Frontend on Cloudflare Pages or Vercel (free). Database on Neon or Supabase (free tier at first). This is the intended production configuration for a small operation.

### Cloud mode deployment

Same as hybrid, minus the local model server. Simplest deployment.

### Hosting cost by mode

| Mode | Where backend runs | Monthly hosting cost | Suitable for |
|---|---|---|---|
| Local (dev only) | Your machine | $0 | Personal use |
| Local (public) | Rented GPU (RunPod) | $150–500 | Not recommended |
| Hybrid | Fly.io / Railway CPU-only | $5–20 | Public launch |
| Cloud | Fly.io / Railway CPU-only | $5–20 | Public launch (with more API cost) |

---

## 15. Success Metrics & Instrumentation

### Northstar

**Activated users per week** — users who complete a full design flow (from upload to at least one affiliate click or save).

### Funnel metrics

| Stage | Target rate |
|---|---|
| Land → Upload | 15% |
| Upload → Setup complete | 70% |
| Setup → Design generated | 90% |
| Design generated → Design saved OR clicked | 40% |

### Quality metrics

- Time to first meaningful render: target < 45 seconds (harder to hit in local mode — set target 90 sec)
- Regeneration rate: users who redo the whole design (< 20%)
- Chat refinement usage: > 40%
- 30-day return rate

### Business metrics

- Affiliate click-through rate per session
- Estimated revenue per session
- Cost per session by mode
- Contribution margin

### Instrumentation

- PostHog for product analytics
- Every AI call logged with provider, duration, tokens/pixels, estimated cost
- Dashboard in Metabase or Grafana

---

## 16. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| AliExpress/Amazon change API/affiliate terms | Medium | High | Diversify retailers; monitor policy changes |
| Compute costs balloon on viral moment (cloud/hybrid) | Medium | High | Hard rate limits per user; input-hash caching; queue smoothing |
| Local model quality gap hurts UX | Medium (local mode) | Medium | Migrate specific layer to hybrid; more prompt engineering; user education |
| Ultra-cheap products disappoint users | High | Medium | Trust layer; expectation setting; feedback loop |
| Shipping delays kill retention | High | Medium | Filter by delivery urgency; recommend faster retailers when needed |
| Legal issues with scraping IKEA/Kmart | Low | Medium | Respectful rate limits; robots.txt compliance |
| Interior AI or Wayfair ships our features | Medium | High | Move fast; own the specific audience; build community moat |
| User uploads sensitive photos | Medium | Medium | Never train on user data; auto-delete after 90 days |
| Chinese platform tariff / de minimis changes | Medium | Medium | Diversify away from Taobao dependency; localize per region |
| Founder burnout on solo build | High | High | Realistic scope; ship MVP fast; get user signals early |
| Local mode: machine crash loses work | High (local) | Medium | Regular Git commits; DB backups |

---

## 17. Open Questions to Resolve Before Building

Before writing a line of code, get clarity on these:

1. **Which AI hosting mode?** Local / Hybrid / Cloud — decides §7–9 immediately.
2. **What hardware do you have?** Mac model + RAM, or GPU model + VRAM. If local mode with weak hardware, switch to hybrid.
3. **Primary launch country?** Australia, UK, Singapore, Malaysia, US? Affects affiliate applications and retailer priorities.
4. **Solo or team?** Realistic time estimates change dramatically.
5. **Brand name?** "Roomly" is a working name. Check domain availability and trademarks.
6. **Legal entity?** For affiliate revenue you'll need a registered business.
7. **Auth from day one?** If yes, Better Auth. If no, defer to Phase 6.
8. **Free tier limits?** Suggestion: 3 full designs per user per month free.
9. **Privacy positioning?** "We never train on your photos" — commit early.
10. **What's the trigger to shut down or pivot?** Set a decision date (e.g., 12 weeks post-launch) and criteria.

---

## 18. Appendices

### A. Reference reading

- iDesigner paper (interior-specific diffusion): https://arxiv.org/pdf/2312.04326
- ControlNet original: https://github.com/lllyasviel/ControlNet
- Marqo E-commerce embeddings: https://github.com/marqo-ai/marqo-ecommerce-embeddings
- Ollama models catalog: https://ollama.com/library
- ComfyUI: https://github.com/comfyanonymous/ComfyUI
- shadcn/ui docs: https://ui.shadcn.com
- Hono framework: https://hono.dev
- Fireworks.ai model catalog: https://fireworks.ai/models
- DeepSeek API: https://platform.deepseek.com

### B. Model download commands (for local mode)

```bash
# LLM + VLM (via Ollama)
ollama pull qwen2.5vl:7b        # Vision-language for room analysis
ollama pull qwen2.5:7b          # Chat + refinement
ollama pull qwen2.5:14b         # Design plan reasoning (if VRAM allows)

# ComfyUI (image generation) — download via ComfyUI Manager
# - SD 1.5 base or SDXL base
# - Depth ControlNet + preprocessor
# - MLSD ControlNet + preprocessor
# - VAE

# Python-hosted models (via pip + sentence-transformers)
# - Marqo/marqo-ecommerce-embeddings-B (auto-downloaded on first use)
# - facebook/sam2 (SAM 2 base)
```

### C. `.env` variable reference

```
# Common
APP_URL=
DATABASE_URL=
STORAGE_MODE=local|r2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

# AI mode
AI_MODE=local|hybrid|cloud

# Local mode
OLLAMA_URL=http://localhost:11434
COMFYUI_URL=http://localhost:8188
EMBEDDINGS_URL=http://localhost:8001
SAM_URL=http://localhost:8002

# Hybrid mode (DeepSeek for LLM only)
DEEPSEEK_API_KEY=
REPLICATE_API_TOKEN=  # for image gen initially

# Cloud mode
FIREWORKS_API_KEY=
REPLICATE_API_TOKEN=
MODAL_TOKEN_ID=
MODAL_TOKEN_SECRET=

# Retailer affiliate
ALIEXPRESS_APP_KEY=
ALIEXPRESS_APP_SECRET=
ALIEXPRESS_TRACKING_ID=
AMAZON_PA_API_ACCESS_KEY=
AMAZON_PA_API_SECRET_KEY=
AMAZON_PARTNER_TAG=
AMAZON_HOST=
AMAZON_REGION=

# Auth
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=

# Analytics + observability
POSTHOG_API_KEY=
SENTRY_DSN=
```

---

*End of report. See `agent-build-prompt.md` for the step-by-step build prompt intended for an AI coding agent.*
