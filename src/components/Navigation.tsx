import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const navLinks = [
  { label: 'Explore', href: '#examples' },
  { label: 'How it works', href: '#how-it-works' },
];

export function Navigation() {
  return (
    <header className="sticky top-0 z-50 border-b border-border-subtle bg-bg-elevated/92 shadow-[0_4px_24px_rgba(26,22,20,0.06)] backdrop-blur-xl">
      <div className="mx-auto flex h-[58px] w-full max-w-[1220px] items-center justify-between px-6 md:px-10">
        <Link to="/" className="text-accent transition-colors hover:text-accent-hover">
          <span className="font-display text-[28px] font-bold leading-none md:text-[32px]">Roomly</span>
        </Link>

        <nav className="hidden items-center gap-10 md:flex" aria-label="Primary">
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

        <div className="flex items-center gap-2">
          <Button asChild className="h-10 rounded-md px-5 text-[15px] font-semibold shadow-none">
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
