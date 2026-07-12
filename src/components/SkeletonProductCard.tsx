import { LightCard } from '@/components/LightCard';
import { Skeleton } from '@/components/ui/skeleton';

export function SkeletonProductCard() {
  return (
    <LightCard className="overflow-hidden p-0" aria-hidden="true">
      <Skeleton className="aspect-[1.2/1] w-full rounded-none bg-secondary-muted" />
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-4 w-16 rounded-full bg-secondary-muted" />
          <Skeleton className="h-4 w-12 bg-secondary-muted" />
        </div>
        <Skeleton className="mt-2 h-4 w-full bg-secondary-muted" />
        <Skeleton className="mt-1.5 h-4 w-1/2 bg-secondary-muted" />
        <Skeleton className="mt-3 h-8 w-full rounded-md bg-secondary-muted" />
      </div>
    </LightCard>
  );
}
