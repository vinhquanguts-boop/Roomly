import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { setAnalyticsConsent } from '@/lib/analytics';

export function CookieBanner() {
  const [visible, setVisible] = useState(() => window.localStorage.getItem('roomly.analytics-consent.v1') === null);

  if (!visible) return null;

  const decide = (accepted: boolean) => {
    setAnalyticsConsent(accepted);
    setVisible(false);
  };

  return (
    <aside className="fixed inset-x-4 bottom-4 z-[60] mx-auto max-w-xl rounded-lg border border-border-subtle bg-bg-elevated p-4 shadow-[0_16px_48px_rgba(26,22,20,0.16)]" aria-label="Cookie preferences">
      <p className="text-sm font-bold text-text-primary">Your privacy matters</p>
      <p className="mt-1 text-xs leading-5 text-text-secondary">
        Roomly uses essential storage for your design session. Optional anonymous analytics help improve the product and never include your room photos.
        {' '}<Link to="/privacy" className="font-semibold text-accent hover:text-accent-hover">Privacy details</Link>
      </p>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => decide(false)}>Only essential</Button>
        <Button size="sm" onClick={() => decide(true)}>Allow analytics</Button>
      </div>
    </aside>
  );
}
