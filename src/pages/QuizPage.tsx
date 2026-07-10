import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ArrowLeft, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { z } from 'zod';
import gsap from 'gsap';
import { Button } from '@/components/ui/button';
import { LightCard } from '@/components/LightCard';
import { StepProgress } from '@/components/StepProgress';
import { usePageEntrance } from '@/hooks/usePageEntrance';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { createDesign, type QuizAnswer, type SetupDraft } from '@/lib/api';
import accentLightingMoment from '@/assets/quiz/accent-lighting-moment.webp';
import accentPlantLife from '@/assets/quiz/accent-plant-life.webp';
import accentRugAnchor from '@/assets/quiz/accent-rug-anchor.webp';
import accentWallArt from '@/assets/quiz/accent-wall-art.webp';
import layoutAiryOpen from '@/assets/quiz/layout-airy-open.webp';
import layoutCozyZone from '@/assets/quiz/layout-cozy-zone.webp';
import layoutRenterSmart from '@/assets/quiz/layout-renter-smart.webp';
import layoutSocialCorner from '@/assets/quiz/layout-social-corner.webp';
import moodBoldRefresh from '@/assets/quiz/mood-bold-refresh.webp';
import moodCalmRetreat from '@/assets/quiz/mood-calm-retreat.webp';
import moodFreshNatural from '@/assets/quiz/mood-fresh-natural.webp';
import moodWarmWelcome from '@/assets/quiz/mood-warm-welcome.webp';
import paletteCleanContrast from '@/assets/quiz/palette-clean-contrast.webp';
import paletteEarthyNeutrals from '@/assets/quiz/palette-earthy-neutrals.webp';
import paletteSageLayers from '@/assets/quiz/palette-sage-layers.webp';
import paletteTerracottaGlow from '@/assets/quiz/palette-terracotta-glow.webp';
import textureCollectedMix from '@/assets/quiz/texture-collected-mix.webp';
import texturePlushSoft from '@/assets/quiz/texture-plush-soft.webp';
import textureTidyLines from '@/assets/quiz/texture-tidy-lines.webp';
import textureWovenWood from '@/assets/quiz/texture-woven-wood.webp';

const setupDraftSchema = z.object({
  roomId: z.string().min(1),
  budget: z.number(),
  currency: z.enum(['AUD', 'USD', 'NZD']),
  roomTypeOverride: z.enum([
    'bedroom',
    'living_room',
    'kitchen',
    'bathroom',
    'office',
    'dining',
    'entryway',
    'other',
  ]),
  deliveryUrgency: z.enum(['urgent', 'normal', 'flexible']),
  stylePreference: z.string().min(2),
});

type QuizOption = {
  id: string;
  title: string;
  caption: string;
  image: string;
};

type QuizQuestion = {
  id: string;
  eyebrow: string;
  title: string;
  options: QuizOption[];
};

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'mood',
    eyebrow: 'Mood',
    title: 'What should the room feel like?',
    options: [
      { id: 'calm_retreat', title: 'Calm retreat', caption: 'quiet, soft, restful', image: moodCalmRetreat },
      { id: 'warm_welcome', title: 'Warm welcome', caption: 'friendly, cozy, easy', image: moodWarmWelcome },
      { id: 'bold_refresh', title: 'Bold refresh', caption: 'confident, modern, expressive', image: moodBoldRefresh },
      { id: 'fresh_natural', title: 'Fresh natural', caption: 'bright, relaxed, plant-friendly', image: moodFreshNatural },
    ],
  },
  {
    id: 'palette',
    eyebrow: 'Palette',
    title: 'Which color direction fits best?',
    options: [
      { id: 'earthy_neutrals', title: 'Earthy neutrals', caption: 'sand, oat, timber', image: paletteEarthyNeutrals },
      { id: 'sage_layers', title: 'Sage layers', caption: 'green, cream, warm white', image: paletteSageLayers },
      { id: 'clean_contrast', title: 'Clean contrast', caption: 'white, black, one accent', image: paletteCleanContrast },
      { id: 'terracotta_glow', title: 'Terracotta glow', caption: 'clay, rust, honey', image: paletteTerracottaGlow },
    ],
  },
  {
    id: 'texture',
    eyebrow: 'Texture',
    title: 'What materials do you reach for?',
    options: [
      { id: 'woven_wood', title: 'Woven + wood', caption: 'rattan, oak, linen', image: textureWovenWood },
      { id: 'plush_soft', title: 'Plush + soft', caption: 'cushions, throws, curves', image: texturePlushSoft },
      { id: 'tidy_lines', title: 'Tidy lines', caption: 'simple, slim, unfussy', image: textureTidyLines },
      { id: 'collected_mix', title: 'Collected mix', caption: 'personal, layered, lived-in', image: textureCollectedMix },
    ],
  },
  {
    id: 'layout',
    eyebrow: 'Layout',
    title: 'How should the room work day to day?',
    options: [
      { id: 'airy_open', title: 'Airy and open', caption: 'easy movement, light pieces', image: layoutAiryOpen },
      { id: 'cozy_zone', title: 'Cozy zones', caption: 'clear corners, layered comfort', image: layoutCozyZone },
      { id: 'renter_smart', title: 'Renter smart', caption: 'flexible, no-drill, practical', image: layoutRenterSmart },
      { id: 'social_corner', title: 'Social corner', caption: 'welcoming, seating-first', image: layoutSocialCorner },
    ],
  },
  {
    id: 'accent',
    eyebrow: 'Focus',
    title: 'What should carry the refresh?',
    options: [
      { id: 'lighting_moment', title: 'Lighting moment', caption: 'lamps and warm glow', image: accentLightingMoment },
      { id: 'wall_art', title: 'Wall art', caption: 'prints and personality', image: accentWallArt },
      { id: 'rug_anchor', title: 'Rug anchor', caption: 'one piece to pull it together', image: accentRugAnchor },
      { id: 'plant_life', title: 'Plant life', caption: 'greenery and organic shape', image: accentPlantLife },
    ],
  },
];

function readSetupDraft(roomId: string | null): SetupDraft | null {
  if (!roomId) return null;

  const raw = sessionStorage.getItem(`roomly.setup.${roomId}`);
  if (!raw) return null;

  try {
    const parsed = setupDraftSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function QuizPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const roomId = searchParams.get('room');
  const setupDraft = useMemo(() => readSetupDraft(roomId), [roomId]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mainRef = useRef<HTMLElement>(null);
  const questionContentRef = useRef<HTMLDivElement>(null);
  const prevIndexRef = useRef<number>(-1);
  const reduced = useReducedMotion();

  usePageEntrance(mainRef);

  // Slide question content in/out when currentIndex changes
  useEffect(() => {
    const el = questionContentRef.current;
    const prev = prevIndexRef.current;
    prevIndexRef.current = currentIndex;

    // Skip on first render (prev === -1) or when motion is reduced
    if (prev === -1 || reduced || !el) return;

    const direction = currentIndex > prev ? 1 : -1;

    gsap.fromTo(
      el,
      { opacity: 0, x: direction * 22 },
      { opacity: 1, x: 0, duration: 0.32, ease: 'power2.out', clearProps: 'all' }
    );
  }, [currentIndex, reduced]);

  const currentQuestion = QUIZ_QUESTIONS[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const isComplete = answeredCount === QUIZ_QUESTIONS.length;

  function chooseAnswer(questionId: string, optionId: string) {
    setAnswers((current) => ({ ...current, [questionId]: optionId }));
    setError(null);
  }

  async function submitQuiz() {
    if (!roomId || !setupDraft) return;
    if (!isComplete) {
      setError('Choose one answer for every question.');
      return;
    }

    const quizAnswers: QuizAnswer[] = QUIZ_QUESTIONS.map((question) => ({
      questionId: question.id,
      optionId: answers[question.id],
    }));

    setIsSubmitting(true);
    setError(null);

    try {
      const { designId } = await createDesign({
        roomId,
        setup: setupDraft,
        quizAnswers,
      });
      navigate(`/design/generating/${designId}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not start design generation.');
      setIsSubmitting(false);
    }
  }

  if (!roomId || !setupDraft) {
    return (
      <>
        <StepProgress current={3} />
        <main className="min-h-dvh bg-bg-base px-5 py-10 text-text-primary">
          <LightCard className="mx-auto max-w-[620px] p-6 text-center">
            <Sparkles className="mx-auto size-9 text-accent" aria-hidden="true" />
            <h1 className="mt-4 font-display text-[34px] font-semibold">Setup missing</h1>
            <p className="mx-auto mt-3 max-w-[420px] text-sm leading-6 text-text-secondary">
              Start from setup so your budget, room type, and delivery choices can guide the design.
            </p>
            <Button asChild className="mt-6">
              <Link to={roomId ? `/design/setup?room=${roomId}` : '/design/upload'}>Return to setup</Link>
            </Button>
          </LightCard>
        </main>
      </>
    );
  }

  return (
    <>
      <StepProgress current={3} />
      <main ref={mainRef} className="min-h-dvh bg-bg-base px-5 py-8 text-text-primary md:px-10">
      <div className="mx-auto max-w-[1120px]">
        <Button variant="ghost" className="mb-6 gap-2 px-0 hover:bg-transparent" onClick={() => navigate(`/design/setup?room=${roomId}`)}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to setup
        </Button>

        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-accent">Step 3</p>
            <h1 className="mt-3 font-display text-[38px] font-semibold leading-tight md:text-[48px]">
              Choose your style direction
            </h1>
            <p className="mt-5 max-w-[440px] text-base leading-7 text-text-secondary">
              Pick the option that feels closest. Roomly turns these choices into a practical style brief for your budget.
            </p>
            <div className="mt-6 rounded-lg bg-secondary-muted/70 p-4 text-sm leading-6 text-text-secondary">
              {answeredCount} of {QUIZ_QUESTIONS.length} answered for a {setupDraft.currency} ${setupDraft.budget} refresh.
            </div>

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
          </div>

          <LightCard className="p-4 md:p-5">
            {/* Animated content: question header + option cards */}
            <div ref={questionContentRef}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">{currentQuestion.eyebrow}</p>
                  <h2 className="mt-2 text-2xl font-bold">{currentQuestion.title}</h2>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {currentQuestion.options.map((option) => {
                  const selected = answers[currentQuestion.id] === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={[
                        'overflow-hidden rounded-lg border bg-bg-elevated text-left transition-all duration-200',
                        selected
                          ? 'scale-[1.015] border-accent shadow-[0_0_0_3px_rgba(199,104,74,0.12)]'
                          : 'border-border-subtle hover:scale-[1.005] hover:border-border-strong hover:shadow-card',
                      ].join(' ')}
                      onClick={() => chooseAnswer(currentQuestion.id, option.id)}
                    >
                      <img src={option.image} alt="" className="h-36 w-full object-cover" />
                      <span className="flex min-h-[94px] items-start justify-between gap-3 p-4">
                        <span>
                          <span className="block font-bold">{option.title}</span>
                          <span className="mt-1 block text-sm text-text-secondary">{option.caption}</span>
                        </span>
                        {selected ? (
                          <CheckCircle2
                            className="mt-1 size-5 shrink-0 text-success animate-[pop-in_0.25s_cubic-bezier(0.34,1.56,0.64,1)_both]"
                            aria-hidden="true"
                          />
                        ) : (
                          <span className="mt-1 size-5 shrink-0" aria-hidden="true" />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step dot progress */}
            <div
              className="mt-5 flex items-center justify-center gap-2"
              aria-label={`Question ${currentIndex + 1} of ${QUIZ_QUESTIONS.length}`}
            >
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

            {error ? <p className="mt-4 text-sm font-semibold text-destructive">{error}</p> : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="outline"
                disabled={currentIndex === 0 || isSubmitting}
                onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
              >
                Previous
              </Button>
              {currentIndex < QUIZ_QUESTIONS.length - 1 ? (
                <Button
                  type="button"
                  disabled={!answers[currentQuestion.id] || isSubmitting}
                  onClick={() => setCurrentIndex((index) => Math.min(QUIZ_QUESTIONS.length - 1, index + 1))}
                >
                  Next
                </Button>
              ) : (
                <Button type="button" disabled={!isComplete || isSubmitting} onClick={submitQuiz}>
                  {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                  Generate design
                </Button>
              )}
            </div>
          </LightCard>
        </div>
      </div>
      </main>
    </>
  );
}
