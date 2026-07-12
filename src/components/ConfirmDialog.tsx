import type { ComponentProps } from 'react';
import { LoadingButton } from '@/components/LoadingButton';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Button } from '@/components/ui/button';

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: ComponentProps<typeof Button>['variant'];
  loading?: boolean;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  confirmVariant = 'destructive',
  loading,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => (loading ? undefined : onOpenChange(next))}>
      <AlertDialogContent className="border-border-subtle bg-bg-elevated text-text-primary">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-xl font-semibold">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-6 text-text-secondary">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <LoadingButton variant={confirmVariant} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
