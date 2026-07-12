import { XCircle } from 'lucide-react';
import { LightCard } from '@/components/LightCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type RetryBlockProps = {
  message?: string;
  onRetry: () => void;
  className?: string;
};

export function RetryBlock({ message = 'Something went wrong.', onRetry, className }: RetryBlockProps) {
  return (
    <LightCard className={cn('p-6 text-center', className)}>
      <XCircle className="mx-auto size-8 text-accent" aria-hidden="true" />
      <p className="mx-auto mt-3 max-w-[420px] text-sm leading-6 text-text-secondary">{message}</p>
      <Button className="mt-5" onClick={onRetry}>
        Try again
      </Button>
    </LightCard>
  );
}
