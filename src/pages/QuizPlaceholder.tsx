import { Link, useSearchParams } from 'react-router';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { LightCard } from '@/components/LightCard';
import { Button } from '@/components/ui/button';

export function QuizPlaceholder() {
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get('room');

  return (
    <main className="min-h-dvh bg-bg-base px-5 py-10 text-text-primary md:px-10">
      <LightCard className="mx-auto max-w-[680px] p-6 text-center md:p-8">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-secondary-muted text-accent">
          <Sparkles className="size-7" aria-hidden="true" />
        </span>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.24em] text-accent">Phase 3 preview</p>
        <h1 className="mt-3 font-display text-[34px] font-semibold leading-tight md:text-[42px]">
          Style quiz comes next
        </h1>
        <p className="mx-auto mt-4 max-w-[480px] text-sm leading-6 text-text-secondary">
          Your room analysis and setup choices are saved locally for this browser. The full quiz and design generation flow lands in Phase 3.
        </p>
        {roomId ? <p className="mt-4 text-xs text-text-secondary">Room ID: {roomId}</p> : null}
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild variant="outline">
            <Link to={roomId ? `/design/setup?room=${roomId}` : '/design/upload'}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to setup
            </Link>
          </Button>
          <Button asChild>
            <Link to="/">Return home</Link>
          </Button>
        </div>
      </LightCard>
    </main>
  );
}

