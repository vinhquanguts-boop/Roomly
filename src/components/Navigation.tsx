import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';

const navLinks = [
  { label: 'Explore', href: '#examples' },
  { label: 'How it works', href: '#how-it-works' },
];

export function Navigation() {
  return (
    <header className="sticky top-0 z-50 border-b border-border-subtle bg-bg-elevated/92 shadow-[0_4px_24px_rgba(26,22,20,0.06)] backdrop-blur-xl">
      <div className="mx-auto grid h-[58px] w-full max-w-[1220px] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 sm:px-6 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:px-10">
        <Link
          to="/"
          className="flex min-w-0 justify-self-start transition-opacity hover:opacity-80"
          aria-label="Roomly home"
        >
          <Logo variant="full" size="md" color="accent" />
        </Link>

        <nav className="hidden items-center gap-10 justify-self-center md:flex" aria-label="Primary">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[15px] font-semibold text-text-primary transition-colors hover:text-accent"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center justify-self-end">
          <Button asChild className="h-10 rounded-md px-3 text-[14px] font-semibold shadow-none sm:px-5 sm:text-[15px]">
            <Link to="/design/upload">
              Get started
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
