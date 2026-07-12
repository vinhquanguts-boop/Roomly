import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import { LightCard } from '@/components/LightCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type EmptyStateProps = {
  icon: LucideIcon;
  heading: string;
  body: string;
  cta?: { label: string; to?: string; onClick?: () => void };
  className?: string;
};

export function EmptyState({ icon: Icon, heading, body, cta, className }: EmptyStateProps) {
  return (
    <LightCard className={cn('p-8 text-center', className)}>
      <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-secondary-muted text-accent">
        <Icon className="size-7" aria-hidden="true" />
      </span>
      <h2 className="mt-5 font-display text-[28px] font-semibold md:text-[32px]">{heading}</h2>
      <p className="mx-auto mt-3 max-w-[460px] text-sm leading-6 text-text-secondary">{body}</p>
      {cta ? (
        cta.to ? (
          <Button asChild className="mt-6 h-11 rounded-md">
            <Link to={cta.to}>{cta.label}</Link>
          </Button>
        ) : (
          <Button className="mt-6 h-11 rounded-md" onClick={cta.onClick}>
            {cta.label}
          </Button>
        )
      ) : null}
    </LightCard>
  );
}
