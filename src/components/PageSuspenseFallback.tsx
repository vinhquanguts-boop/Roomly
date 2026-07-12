import { Logo } from '@/components/Logo';
import { Skeleton } from '@/components/ui/skeleton';

export function PageSuspenseFallback() {
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-bg-base"
      role="status"
      aria-label="Loading Roomly"
    >
      <span className="animate-pulse opacity-50">
        <Logo variant="full" size="sm" color="accent" />
      </span>
      <Skeleton className="h-2 w-48 rounded-full bg-secondary-muted" />
    </div>
  );
}
