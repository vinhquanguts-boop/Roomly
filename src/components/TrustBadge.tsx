import { BadgeCheck, CircleHelp, ShieldAlert, ThumbsUp } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { ProductTrust } from '@/lib/api';
import { cn } from '@/lib/utils';

const TRUST_CONFIG = {
  safe_pick: {
    label: 'Safe pick',
    className: 'bg-success/15 text-success',
    Icon: BadgeCheck,
  },
  good_bet: {
    label: 'Good bet',
    className: 'bg-secondary-muted text-text-primary',
    Icon: ThumbsUp,
  },
  roll_the_dice: {
    label: 'Roll the dice',
    className: 'bg-accent/15 text-accent',
    Icon: ShieldAlert,
  },
  limited_signals: {
    label: 'Limited signals',
    className: 'bg-bg-inset text-text-secondary',
    Icon: CircleHelp,
  },
} as const;

function formatNumber(value: number | null): string {
  if (value === null) return 'Not available';
  return new Intl.NumberFormat('en-AU', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export function TrustBadge({ trust, soldCount, rating }: { trust: ProductTrust | null; soldCount: number; rating: number | null }) {
  const value = trust ?? {
    label: 'limited_signals' as const,
    score: null,
    source: 'curated_catalog' as const,
    reviewCount: null,
    positivePct: null,
    negativeFlags: [],
    feedbackCount: 0,
    updatedAt: null,
  };
  const config = TRUST_CONFIG[value.label];
  const Icon = config.Icon;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn('inline-flex min-h-6 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold', config.className)}
          aria-label={`${config.label}. Open Roomly trust details.`}
        >
          <Icon className="size-3" aria-hidden="true" />
          {config.label}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 rounded-lg border-border-subtle bg-bg-elevated p-4 text-text-primary">
        <div className="flex items-start gap-2">
          <Icon className={cn('mt-0.5 size-4 shrink-0', config.className.split(' ')[1])} aria-hidden="true" />
          <div>
            <p className="text-sm font-bold">{config.label}</p>
            <p className="mt-1 text-xs leading-5 text-text-secondary">
              Roomly&apos;s curated catalog signal. It is not a live retailer verification.
            </p>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
          <div>
            <dt className="text-text-secondary">Reviews</dt>
            <dd className="mt-0.5 font-bold">{formatNumber(value.reviewCount)}</dd>
          </div>
          <div>
            <dt className="text-text-secondary">Sold count</dt>
            <dd className="mt-0.5 font-bold">{formatNumber(soldCount)}</dd>
          </div>
          <div>
            <dt className="text-text-secondary">Positive reviews</dt>
            <dd className="mt-0.5 font-bold">{value.positivePct === null ? 'Not available' : `${Math.round(value.positivePct)}%`}</dd>
          </div>
          <div>
            <dt className="text-text-secondary">Catalog rating</dt>
            <dd className="mt-0.5 font-bold">{rating === null ? 'Not available' : `${rating.toFixed(1)} / 5`}</dd>
          </div>
          <div>
            <dt className="text-text-secondary">Roomly feedback</dt>
            <dd className="mt-0.5 font-bold">{value.feedbackCount}</dd>
          </div>
        </dl>
        {value.negativeFlags.length > 0 ? (
          <p className="mt-4 border-t border-border-subtle pt-3 text-xs leading-5 text-text-secondary">
            Watch for: {value.negativeFlags.join(', ')}.
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
