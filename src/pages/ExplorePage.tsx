import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { ArrowRight, Compass, ImageIcon, Tag } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { LightCard } from '@/components/LightCard';
import { Navigation } from '@/components/Navigation';
import { RetryBlock } from '@/components/RetryBlock';
import { SkeletonDesignCard } from '@/components/SkeletonDesignCard';
import { Button } from '@/components/ui/button';
import { getExploreDesigns } from '@/lib/api';

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(value));
}

export function ExplorePage() {
  const exploreQuery = useQuery({
    queryKey: ['public-designs'],
    queryFn: getExploreDesigns,
  });
  const designs = exploreQuery.data?.designs ?? [];

  return (
    <>
      <Navigation />
      <main className="min-h-dvh bg-bg-base px-5 py-10 text-text-primary md:px-10">
        <div className="mx-auto max-w-[1120px]">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-accent">
                <Compass className="size-4" aria-hidden="true" />
                Explore
              </p>
              <h1 className="mt-3 font-display text-[42px] font-semibold leading-tight md:text-[56px]">
                Public Roomly designs
              </h1>
              <p className="mt-3 max-w-[620px] text-base leading-7 text-text-secondary">
                Browse saved room refreshes with real budgets and product lists.
              </p>
            </div>
            <Button asChild className="h-11 rounded-md">
              <Link to="/design/upload">Create your own</Link>
            </Button>
          </div>

          <div aria-live="polite" aria-busy={exploreQuery.isPending}>
          {exploreQuery.isPending ? (
            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading public designs">
              {Array.from({ length: 9 }).map((_, i) => (
                <SkeletonDesignCard key={i} />
              ))}
            </div>
          ) : exploreQuery.isError ? (
            <RetryBlock
              message="Could not load public designs."
              onRetry={() => exploreQuery.refetch()}
              className="mt-8"
            />
          ) : designs.length === 0 ? (
            <EmptyState
              icon={Compass}
              heading="Nothing to explore yet"
              body="Shared designs will appear here after they are published from the result page. Be the first to share one."
              cta={{ label: 'Create a design', to: '/design/upload' }}
              className="mt-8"
            />
          ) : (
            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {designs.map((design) => (
                <LightCard key={design.id} className="overflow-hidden p-0">
                  {design.thumbnailUrl ? (
                    <img src={design.thumbnailUrl} alt="" className="aspect-[1.45/1] w-full bg-bg-inset object-cover" loading="lazy" />
                  ) : (
                    <div className="flex aspect-[1.45/1] items-center justify-center bg-bg-inset text-text-secondary">
                      <ImageIcon className="size-8" aria-hidden="true" />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="line-clamp-2 text-xl font-bold">{design.styleDirection ?? 'Roomly design'}</h2>
                      <span className="shrink-0 rounded-full bg-secondary-muted px-3 py-1 text-xs font-bold text-text-secondary">
                        {formatDate(design.publishedAt)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-text-secondary">
                      Budget {formatMoney(design.budget, design.currency)}
                    </p>
                    {design.styleTags.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {design.styleTags.slice(0, 4).map((tag) => (
                          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-secondary-muted px-3 py-1 text-xs font-bold text-text-secondary">
                            <Tag className="size-3" aria-hidden="true" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {design.sharedSlug ? (
                      <Button asChild className="mt-5 h-10 w-full rounded-md">
                        <Link to={`/explore/${design.sharedSlug}`}>
                          View design
                          <ArrowRight className="size-4" aria-hidden="true" />
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </LightCard>
              ))}
            </div>
          )}
          </div>
        </div>
      </main>
    </>
  );
}
