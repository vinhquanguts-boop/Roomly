import { cn } from '@/lib/utils';

export function Divider({ className }: { className?: string }) {
  return (
    <div className={cn('mx-auto max-w-[120px]', className)}>
      <div className="h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
    </div>
  );
}
