import { LightCard } from '@/components/LightCard';
import { Skeleton } from '@/components/ui/skeleton';

export function SkeletonDesignCard() {
  return (
    <LightCard className="overflow-hidden p-0" aria-hidden="true">
      <Skeleton className="aspect-[1.45/1] w-full rounded-none bg-secondary-muted" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-24 bg-secondary-muted" />
            <Skeleton className="h-5 w-3/4 bg-secondary-muted" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full bg-secondary-muted" />
        </div>
        <Skeleton className="mt-3 h-4 w-2/5 bg-secondary-muted" />
        <Skeleton className="mt-5 h-10 w-24 rounded-md bg-secondary-muted" />
      </div>
    </LightCard>
  );
}
