import { useEffect, useRef, useState } from 'react';
import { WifiOff } from 'lucide-react';
import gsap from 'gsap';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export function OfflineBanner() {
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);
  const bannerRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!offline || !bannerRef.current || reduced) return;
    const tween = gsap.fromTo(bannerRef.current, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: 'power3.out' });
    return () => {
      tween.kill();
    };
  }, [offline, reduced]);

  if (!offline) return null;

  return (
    <div
      ref={bannerRef}
      role="status"
      aria-live="assertive"
      className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-center gap-2 bg-text-primary px-4 py-2.5 text-sm font-semibold text-white"
    >
      <WifiOff className="size-4 shrink-0" aria-hidden="true" />
      No internet connection — changes may not save.
    </div>
  );
}
