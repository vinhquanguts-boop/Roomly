import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface LightCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'large';
}

export function LightCard({
  children,
  className,
  variant = 'default',
  ...props
}: LightCardProps) {
  return (
    <div
      className={cn(
        variant === 'large' ? 'light-card-lg rounded-lg' : 'light-card rounded-lg',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
