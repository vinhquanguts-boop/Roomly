import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ArrowLeft, CheckCircle2, Clock3, Palette, Ruler, SunMedium } from 'lucide-react';
import { z } from 'zod';
import { LightCard } from '@/components/LightCard';
import { StepProgress } from '@/components/StepProgress';
import { Button } from '@/components/ui/button';
import { usePageEntrance } from '@/hooks/usePageEntrance';
import { analyzeRoom, type RoomAnalysis } from '@/lib/api';

const setupSchema = z.object({
  budget: z.coerce
    .number({ error: 'Enter a budget.' })
    .min(50, 'Use at least AUD $50 for a realistic refresh.')
    .max(5000, 'Phase 2 supports budgets up to AUD $5,000.'),
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
  stylePreference: z.string().trim().min(2, 'Add a short style preference.').max(80),
});

type SetupFormInput = z.input<typeof setupSchema>;
type SetupFormValues = z.output<typeof setupSchema>;

const ROOM_TYPE_LABELS: Record<RoomAnalysis['roomType'], string> = {
  bedroom: 'Bedroom',
  living_room: 'Living room',
  kitchen: 'Kitchen',
  bathroom: 'Bathroom',
  office: 'Office',
  dining: 'Dining',
  entryway: 'Entryway',
  other: 'Other',
};

function AnalysisSummary({ analysis }: { analysis: RoomAnalysis }) {
  const dimensions = analysis.estimatedDimensions;
  const dimensionText =
    dimensions.widthMeters && dimensions.depthMeters
      ? `${dimensions.widthMeters}m x ${dimensions.depthMeters}m`
      : 'Could not estimate reliably';

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <LightCard className="p-5">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
          <h2 className="font-bold">We detected</h2>
        </div>
        <p className="mt-4 text-2xl font-bold text-text-primary">{ROOM_TYPE_LABELS[analysis.roomType]}</p>
        <p className="mt-2 text-sm leading-6 text-text-secondary">{analysis.detectedStyle}</p>
      </LightCard>

      <LightCard className="p-5">
        <div className="flex items-center gap-3">
          <Ruler className="size-5 text-accent" aria-hidden="true" />
          <h2 className="font-bold">Approximate size</h2>
        </div>
        <p className="mt-4 text-2xl font-bold text-text-primary">{dimensionText}</p>
        <p className="mt-2 text-sm text-text-secondary">Confidence: {dimensions.confidence}</p>
      </LightCard>

      <LightCard className="p-5">
        <div className="flex items-center gap-3">
          <Palette className="size-5 text-accent" aria-hidden="true" />
          <h2 className="font-bold">Palette</h2>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {analysis.palette.dominantColors.map((color) => (
            <span key={color} className="rounded-full bg-secondary-muted px-3 py-1 text-sm font-semibold">
              {color}
            </span>
          ))}
        </div>
        <p className="mt-3 text-sm leading-6 text-text-secondary">{analysis.palette.description}</p>
      </LightCard>

      <LightCard className="p-5">
        <div className="flex items-center gap-3">
          <SunMedium className="size-5 text-accent" aria-hidden="true" />
          <h2 className="font-bold">Light</h2>
        </div>
        <div className="mt-4 space-y-2 text-sm text-text-secondary">
          {analysis.lightSources.map((source, index) => (
            <p key={`${source.type}-${index}`}>
              {source.type.replace('_', ' ')} - {source.intensity}
              {source.direction ? `, ${source.direction}` : ''}
            </p>
          ))}
        </div>
      </LightCard>

      <LightCard className="p-5 md:col-span-2">
        <h2 className="font-bold">Items to design around</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {analysis.detectedItems.length > 0 ? (
            analysis.detectedItems.map((item) => (
              <span key={item.name} className="rounded-full border border-border-subtle px-3 py-1 text-sm">
                {item.name}
                {item.keepRecommended ? ' - keep' : ''}
              </span>
            ))
          ) : (
            <p className="text-sm text-text-secondary">No clear furniture items detected.</p>
          )}
        </div>
        <p className="mt-4 text-sm leading-6 text-text-secondary">{analysis.notes}</p>
      </LightCard>
    </div>
  );
}

export function SetupPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const roomId = searchParams.get('room');
  const mainRef = useRef<HTMLElement>(null);

  usePageEntrance(mainRef);

  const analysisQuery = useQuery({
    queryKey: ['room-analysis', roomId],
    queryFn: async () => {
      if (!roomId) throw new Error('Missing room ID.');
      return analyzeRoom(roomId);
    },
    enabled: Boolean(roomId),
    retry: false,
  });

  const form = useForm<SetupFormInput, unknown, SetupFormValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      budget: 300,
      currency: 'AUD',
      roomTypeOverride: 'other',
      deliveryUrgency: 'normal',
      stylePreference: 'warm minimalist',
    },
  });

  useEffect(() => {
    if (analysisQuery.data?.analysis) {
      form.setValue('roomTypeOverride', analysisQuery.data.analysis.roomType);
    }
  }, [analysisQuery.data?.analysis, form]);

  function handleSubmit(values: SetupFormValues) {
    if (!roomId) return;

    sessionStorage.setItem(
      `roomly.setup.${roomId}`,
      JSON.stringify({
        roomId,
        ...values,
      })
    );
    navigate(`/design/quiz?room=${roomId}`);
  }

  if (!roomId) {
    return (
      <>
        <StepProgress current={2} />
        <main className="min-h-dvh bg-bg-base px-5 py-10 text-text-primary">
          <LightCard className="mx-auto max-w-[620px] p-6">
            <h1 className="font-display text-[34px] font-semibold">Room missing</h1>
            <p className="mt-3 text-text-secondary">Start with a room photo so Roomly can analyze your space.</p>
            <Button asChild className="mt-6">
              <Link to="/design/upload">Upload a room</Link>
            </Button>
          </LightCard>
        </main>
      </>
    );
  }

  return (
    <>
      <StepProgress current={2} />
      <main ref={mainRef} className="min-h-dvh bg-bg-base px-5 py-8 text-text-primary md:px-10">
      <div className="mx-auto max-w-[1120px]">
        <Button variant="ghost" className="mb-6 gap-2 px-0 hover:bg-transparent" onClick={() => navigate('/design/upload')}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to upload
        </Button>

        <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-accent">Step 2</p>
            <h1 className="mt-3 font-display text-[38px] font-semibold leading-tight md:text-[48px]">
              Review your room analysis
            </h1>
            <p className="mt-5 max-w-[580px] text-base leading-7 text-text-secondary">
              Local room analysis can take 5-30 seconds. Once it is ready, confirm your budget and preferences for the next phase.
            </p>

            <div className="mt-8">
              {analysisQuery.isPending ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {[0, 1, 2, 3].map((i) => (
                      <LightCard key={i} className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="size-5 animate-pulse rounded-full bg-secondary-muted" />
                          <div className="h-4 w-24 animate-pulse rounded bg-secondary-muted" />
                        </div>
                        <div className="mt-4 h-7 w-32 animate-pulse rounded bg-secondary-muted" />
                        <div className="mt-2 space-y-1.5">
                          <div className="h-3 w-full animate-pulse rounded bg-secondary-muted" />
                          <div className="h-3 w-3/4 animate-pulse rounded bg-secondary-muted" />
                        </div>
                      </LightCard>
                    ))}
                  </div>
                  <LightCard className="p-5">
                    <div className="h-4 w-36 animate-pulse rounded bg-secondary-muted" />
                    <div className="mt-4 flex flex-wrap gap-2">
                      {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="h-7 w-20 animate-pulse rounded-full bg-secondary-muted" />
                      ))}
                    </div>
                    <div className="mt-4 space-y-1.5">
                      <div className="h-3 w-full animate-pulse rounded bg-secondary-muted" />
                      <div className="h-3 w-5/6 animate-pulse rounded bg-secondary-muted" />
                    </div>
                  </LightCard>
                  <p className="text-center text-sm font-semibold text-text-secondary">Analyzing your room…</p>
                </div>
              ) : analysisQuery.isError ? (
                <LightCard className="p-6">
                  <h2 className="text-xl font-bold">Analysis could not finish</h2>
                  <p className="mt-3 text-sm leading-6 text-text-secondary">
                    {analysisQuery.error instanceof Error
                      ? analysisQuery.error.message
                      : 'Check that the backend, Postgres, and Ollama are running.'}
                  </p>
                  <Button className="mt-5" onClick={() => analysisQuery.refetch()}>
                    Try again
                  </Button>
                </LightCard>
              ) : (
                <AnalysisSummary analysis={analysisQuery.data.analysis} />
              )}
            </div>
          </div>

          <LightCard className="h-fit p-5 md:p-6">
            <div className="flex items-center gap-3">
              <Clock3 className="size-5 text-accent" aria-hidden="true" />
              <h2 className="text-xl font-bold">Design setup</h2>
            </div>

            <form className="mt-6 space-y-5" noValidate onSubmit={form.handleSubmit(handleSubmit)}>
              <div>
                <label className="text-sm font-bold" htmlFor="budget">
                  Budget
                </label>
                <input
                  id="budget"
                  type="number"
                  min="50"
                  max="5000"
                  step="10"
                  className="mt-2 h-11 w-full rounded-md border border-border-subtle bg-bg-elevated px-3 outline-none focus:border-accent"
                  {...form.register('budget')}
                />
                {form.formState.errors.budget ? (
                  <p className="mt-2 text-sm font-semibold text-destructive">{form.formState.errors.budget.message}</p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-bold" htmlFor="currency">
                    Currency
                  </label>
                  <select
                    id="currency"
                    className="mt-2 h-11 w-full rounded-md border border-border-subtle bg-bg-elevated px-3 outline-none focus:border-accent"
                    {...form.register('currency')}
                  >
                    <option value="AUD">AUD</option>
                    <option value="USD">USD</option>
                    <option value="NZD">NZD</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-bold" htmlFor="deliveryUrgency">
                    Delivery
                  </label>
                  <select
                    id="deliveryUrgency"
                    className="mt-2 h-11 w-full rounded-md border border-border-subtle bg-bg-elevated px-3 outline-none focus:border-accent"
                    {...form.register('deliveryUrgency')}
                  >
                    <option value="urgent">Urgent</option>
                    <option value="normal">Normal</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-bold" htmlFor="roomTypeOverride">
                  Room type
                </label>
                <select
                  id="roomTypeOverride"
                  className="mt-2 h-11 w-full rounded-md border border-border-subtle bg-bg-elevated px-3 outline-none focus:border-accent"
                  {...form.register('roomTypeOverride')}
                >
                  {Object.entries(ROOM_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-bold" htmlFor="stylePreference">
                  Style preference
                </label>
                <input
                  id="stylePreference"
                  className="mt-2 h-11 w-full rounded-md border border-border-subtle bg-bg-elevated px-3 outline-none focus:border-accent"
                  placeholder="warm minimalist"
                  {...form.register('stylePreference')}
                />
                {form.formState.errors.stylePreference ? (
                  <p className="mt-2 text-sm font-semibold text-destructive">
                    {form.formState.errors.stylePreference.message}
                  </p>
                ) : null}
              </div>

              <Button type="submit" className="w-full" disabled={!analysisQuery.data}>
                Continue to style quiz
              </Button>
            </form>
          </LightCard>
        </div>
      </div>
      </main>
    </>
  );
}
