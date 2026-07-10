import { cn } from '@/lib/utils';

export type LogoVariant = 'full' | 'icon' | 'wordmark';
export type LogoSize = 'sm' | 'md' | 'lg';
export type LogoColor = 'accent' | 'dark' | 'white';

export interface LogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  color?: LogoColor;
  className?: string;
}

const ICON_COLORS: Record<LogoColor, string> = {
  accent: '#C7684A',
  dark: '#1A1614',
  white: '#FFFFFF',
};

const TEXT_COLORS: Record<LogoColor, string> = {
  accent: 'text-accent',
  dark: 'text-text-primary',
  white: 'text-white',
};

const ICON_SIZES: Record<LogoSize, number> = {
  sm: 20,
  md: 24,
  lg: 40,
};

const TEXT_CLASSES: Record<LogoSize, string> = {
  sm: 'text-xl',
  md: 'text-[26px]',
  lg: 'text-4xl',
};

const GAP_CLASSES: Record<LogoSize, string> = {
  sm: 'gap-2',
  md: 'gap-2.5',
  lg: 'gap-3',
};

interface ArchMarkProps {
  color: string;
  size: number;
}

function ArchMark({ color, size }: ArchMarkProps) {
  const height = Math.round(size * 1.1);

  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 20 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      className="block shrink-0"
    >
      <path d="M0,22 L0,10 A10,10 0 0,0 20,10 L20,22 Z" fill={color} />
    </svg>
  );
}

export function Logo({
  variant = 'full',
  size = 'md',
  color = 'accent',
  className,
}: LogoProps) {
  const iconColor = ICON_COLORS[color];
  const textColorClass = TEXT_COLORS[color];
  const iconSize = ICON_SIZES[size];
  const textClass = TEXT_CLASSES[size];
  const gapClass = GAP_CLASSES[size];

  if (variant === 'icon') {
    return (
      <span className={cn('inline-flex items-center justify-center', className)} role="img" aria-label="Roomly">
        <ArchMark color={iconColor} size={iconSize} />
      </span>
    );
  }

  const wordmark = (
    <span className={cn('font-display font-bold leading-none tracking-normal', textClass, textColorClass)}>
      Roomly
    </span>
  );

  if (variant === 'wordmark') {
    return (
      <span className={cn('inline-flex items-center', className)} role="img" aria-label="Roomly">
        {wordmark}
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center', gapClass, className)} role="img" aria-label="Roomly">
      <ArchMark color={iconColor} size={iconSize} />
      <span aria-hidden="true">{wordmark}</span>
    </span>
  );
}
