import { cn } from '@/lib/utils';
import { type Plan } from '@/lib/api/subscription';

const BADGE_CONFIG: Record<Plan, { label: string; className: string } | null> = {
  free: null,
  plus: {
    label: 'Plus',
    className: 'bg-accent text-white',
  },
  professional: {
    label: 'Pro',
    className: 'bg-roomly-secondary text-white',
  },
};

export function PlanBadge({ plan, className }: { plan: Plan; className?: string }) {
  const config = BADGE_CONFIG[plan];
  if (!config) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
