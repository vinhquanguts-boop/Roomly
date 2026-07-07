# Technical Specification - Iris Thai Portfolio

## Dependencies

### Production

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^19.0.0 | UI framework |
| react-dom | ^19.0.0 | React DOM renderer |
| three | ^0.170.0 | 3D engine for intro animation |
| @react-three/fiber | ^9.0.0 | React renderer for Three.js |
| @react-three/drei | ^9.0.0 | R3F helpers (Text, rounded box, effects) |
| gsap | ^3.12.0 | Animation engine (timelines, scroll triggers, tweens) |
| lenis | ^1.1.0 | Smooth scroll with inertia |
| lucide-react | ^0.460.0 | Icon library |
| tailwindcss | ^4.0.0 | Utility CSS framework |
| @tailwindcss/vite | ^4.0.0 | Tailwind Vite integration |

### Development

| Package | Version | Purpose |
|---------|---------|---------|
| vite | ^6.0.0 | Build tool |
| @vitejs/plugin-react | ^4.3.0 | React support for Vite |
| typescript | ^5.6.0 | Type checking |
| @types/react | ^19.0.0 | React type definitions |
| @types/react-dom | ^19.0.0 | ReactDOM type definitions |
| @types/three | ^0.170.0 | Three.js type definitions |

---

## Component Inventory

### Layout

| Component | Source | Notes |
|-----------|--------|-------|
| Navigation | Custom | Fixed header with scroll-triggered glass background, mobile hamburger overlay |
| Footer | Custom | Minimal copyright + social links |

### Sections

| Component | Source | Notes |
|-----------|--------|-------|
| HeroSection | Custom | Orchestrates 3D canvas + DOM overlay + intro timeline |
| WorkShowcaseSection | Custom | 2-column project grid |
| ProcessSection | Custom | 4-step horizontal flow with connecting line |
| AboutSection | Custom | 2-column portrait + bio layout |
| ContactSection | Custom | Form inside glass card with 3D wireframe background |

### Reusable Components

| Component | Source | Used By |
|-----------|--------|---------|
| ThreeCanvas | Custom | HeroSection (intro + ambient background), ContactSection (wireframe) |
| FloatingCards | Custom (R3F) | ThreeCanvas (hero) |
| ParticleField | Custom (R3F) | ThreeCanvas (hero) |
| GlassCard | Custom | HeroSection (main hero card), WorkShowcaseSection (project cards), ContactSection (form card) |
| SectionLabel | Custom | WorkShowcase, Process, About, Contact |
| PrimaryButton | Custom | HeroSection, ContactSection |
| SecondaryButton | Custom | HeroSection |
| DotMatrixPattern | Custom | HeroSection background, ProcessSection overlay |
| MobileMenu | Custom | Navigation |

### Hooks

| Hook | Purpose |
|------|---------|
| useMousePosition | Tracks normalized mouse coordinates for 3D tilt and camera parallax |
| useReducedMotion | Detects prefers-reduced-motion media query |
| useScrollReveal | GSAP ScrollTrigger setup for section entrance animations |

---

## Animation Implementation

| Animation | Library | Approach | Complexity |
|-----------|---------|----------|------------|
| 3D Intro Sequence (5s camera fly-through) | GSAP Timeline + R3F | Single master GSAP timeline controls camera.position/.lookAt, card opacities/positions, and DOM overlay visibility through 4 keyframe phases. Timeline scrubbed imperatively on mount. | **High** |
| Floating Cards (3D glass panels) | R3F + drei | 5 MeshPhysicalMaterial planes with CanvasTexture text. Continuous sine-wave float on Y axis. Orbit around centre points. | **High** |
| Particle Field | R3F | 60 SphereGeometry instanced meshes with individual sine-wave Y displacement and opacity oscillation. | **Medium** |
| Mouse Parallax (post-intro) | GSAP + useMousePosition | Camera position offset by mouse (max +/-0.3) via GSAP quickTo for smooth interpolation. | **Low** |
| Mouse-Driven 3D Tilt (hero card) | Custom hook + CSS | useMousePosition calculates normalized offset from card centre; lerp factor 0.1/frame applied to rotateX/Y via CSS transform. | **Medium** |
| Hero Content Staggered Reveal | GSAP Timeline | Part of master intro timeline - card scale/fade at 4.0s, name at 4.2s, titles at 4.4-4.6s, CTAs at 4.8s, social at 5.0s. | **Low** |
| Scroll-Triggered Section Reveals | GSAP ScrollTrigger | Batch pattern: translateY(40px)->0, opacity 0->1, 0.8s, power3.out. Stagger children 0.12s. Threshold 0.15. | **Low** |
| Process Connecting Line Draw | GSAP ScrollTrigger | Width 0%->100% animation triggered when first step enters viewport, 1.5s duration. | **Low** |
| Process Steps Stagger | GSAP ScrollTrigger | translateY(50px)->0, stagger 0.2s, 0.7s each. | **Low** |
| Card Hover (work section) | CSS transitions | translateY(-8px), shadow expand, image scale(1.05), border glow intensify. Pure CSS on :hover. | **Low** |
| Nav Background Transition | GSAP ScrollTrigger | Toggle transparent->rgba(0,5,16,0.9) + backdrop-blur at hero scroll threshold. | **Low** |
| Mobile Menu Open/Close | GSAP | Overlay translateX(100%->0), links stagger translateY(20px->0) 0.1s each. Reverse on close. | **Low** |
| Contact 3D Wireframe | R3F | Slow-rotating torus knot / icosahedron with wireframe material, opacity 0.15. | **Low** |
| Smooth Scrolling | Lenis | Global smooth scroll with duration 1.2s, exponential ease-out. | **Low** |
| Reduced Motion Fallback | CSS + JS | prefers-reduced-motion skips intro timeline entirely; sets all elements to final state. | **Low** |

---

## State & Logic Plan

### 1. Intro Timeline Orchestration

The hero section manages a single GSAP master timeline that synchronizes Three.js camera movement, 3D card animations, and DOM element reveals across a 5-second sequence.

- **Architecture**: Master timeline created on mount in HeroSection. Timeline contains nested tweens targeting: (a) R3F camera ref position/lookAt, (b) R3F card group opacity/position refs, (c) DOM element refs for fade/translate reveals.
- **State**: `introComplete` boolean (false->true at timeline end). Controls whether mouse parallax is active and skip button is visible.
- **Skip**: Calling `timeline.progress(1)` instantly completes all tweens and sets `introComplete = true`.
- **Reduced motion**: Timeline is never created; `introComplete` set to true immediately on mount.

### 2. R3F-to-DOM Bridge

The 3D intro and DOM overlay are separate render trees (Canvas vs. HTML) that must be synchronized:

- Camera position/rotation are animated via imperative refs in R3F, controlled by GSAP timeline tweens targeting the ref values.
- DOM overlay visibility (hero card, nav) is controlled by GSAP animating DOM element refs (opacity, transform) on the same timeline.
- No React state is used for animation values (all imperative for 60fps performance).
- `introComplete` is the only React state flag, used to toggle pointer-events and start mouse parallax.

### 3. Mouse Position Pipeline

A single `useMousePosition` hook provides normalized coordinates (-1 to 1) used by two independent consumers:

- **3D camera parallax** (post-intro only): Adds offset to camera.position.x/y via GSAP quickTo.
- **Hero card 3D tilt**: CSS transform on the glass card element (rotateX/Y based on cursor position relative to card centre).

Both use lerp/interpolation for smooth movement rather than direct mapping.

### 4. Form Submission State Machine

Contact form has 4 explicit states: `idle` | `loading` | `success` | `error`.

- Transitions: idle->loading on submit, loading->success on 200 response, loading->error on failure, success/error->idle after 3s timeout.
- Button content and styling derived from current state.
- No external form library needed (simple 3-field form with fetch/POST).

---

## Other Key Decisions

### R3F Canvas Strategy

Two separate Canvas instances rather than one shared:
- **Hero Canvas**: Full-viewport, complex (camera animation, cards, particles, lighting). Fades to low-opacity ambient mode after intro.
- **Contact Canvas**: Smaller, simple wireframe shape only. Lazy-loaded when Contact section approaches viewport.

This avoids rendering the hero 3D scene when the user has scrolled far past it, and keeps the contact wireframe lightweight.

### Three.js Material Approach

Card text is rendered via CanvasTexture (draw text to HTML Canvas, use as texture) rather than drei Text or troika-three-text. This avoids extra font-loading complexity and gives precise control over text appearance on the glass cards.

### Scroll Animation Batch Pattern

All scroll-triggered reveals use a single GSAP ScrollTrigger.batch() call on mount rather than individual ScrollTrigger instances per element. This reduces observer overhead and simplifies cleanup.
