import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { ArrowRight, LogOut, Menu, Settings, UserRound } from 'lucide-react';
import gsap from 'gsap';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { PlanBadge } from '@/components/PlanBadge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { usePlan } from '@/hooks/usePlan';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useAuth } from '@/lib/auth-state';
import { isStaticDeployment } from '@/lib/deployment';

const navLinks: Array<
  | { label: string; to: string; href?: never }
  | { label: string; href: string; to?: never }
> = [
  { label: 'Explore', to: '/explore' },
  { label: 'Chat', to: '/chat' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'How it works', href: '/#how-it-works' },
];

const staticNavLinks = [
  { label: 'Pricing', to: '/pricing' },
  { label: 'How it works', href: '/#how-it-works' },
];

function StaticNavigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border-subtle bg-bg-elevated/92 shadow-[0_4px_24px_rgba(26,22,20,0.06)] backdrop-blur-xl">
      <div className="mx-auto flex h-[58px] w-full max-w-[1220px] items-center justify-between gap-3 px-4 sm:px-6 xl:px-10">
        <Link to="/" className="flex min-w-0 transition-opacity hover:opacity-80" aria-label="Roomly home">
          <Logo variant="full" size="md" color="accent" />
        </Link>
        <nav className="hidden items-center gap-8 xl:flex" aria-label="Primary">
          {staticNavLinks.map((link) => link.to ? (
            <Link key={link.label} to={link.to} className="text-[15px] font-semibold text-text-primary transition-colors hover:text-accent">{link.label}</Link>
          ) : (
            <a key={link.label} href={link.href} className="text-[15px] font-semibold text-text-primary transition-colors hover:text-accent">{link.label}</a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild className="h-10 rounded-md px-3 text-[14px] font-semibold shadow-none sm:px-5 sm:text-[15px]">
            <Link to="/design/upload">Use locally</Link>
          </Button>
          <Button variant="ghost" size="icon" className="xl:hidden" aria-label="Open menu" onClick={() => setMobileMenuOpen(true)}>
            <Menu className="size-5" aria-hidden="true" />
          </Button>
        </div>
      </div>
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent className="border-border-subtle bg-bg-base text-text-primary">
          <SheetTitle className="px-5 pt-5 text-left font-display text-lg font-semibold">Menu</SheetTitle>
          <div className="flex flex-col gap-1 px-5 pb-5">
            {staticNavLinks.map((link) => link.to ? (
              <Link key={link.label} to={link.to} className="rounded-md px-3 py-2.5 text-base font-semibold text-text-primary hover:bg-secondary-muted" onClick={() => setMobileMenuOpen(false)}>{link.label}</Link>
            ) : (
              <a key={link.label} href={link.href} className="rounded-md px-3 py-2.5 text-base font-semibold text-text-primary hover:bg-secondary-muted" onClick={() => setMobileMenuOpen(false)}>{link.label}</a>
            ))}
            <Link to="/design/upload" className="mt-3 rounded-md bg-accent px-3 py-2.5 text-base font-semibold text-accent-foreground" onClick={() => setMobileMenuOpen(false)}>Use Roomly locally</Link>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}

function WorkspaceNavigation() {
  const { isAuthenticated, isPending, signOut } = useAuth();
  const { plan } = usePlan();
  const location = useLocation();
  const reduced = useReducedMotion();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const underlineRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  async function handleSignOut() {
    await signOut();
    toast.success('Signed out.');
  }

  // Slide the active-link underline to match the current route
  useEffect(() => {
    const activeLink = navLinks.find((link) => link.to === location.pathname);
    const el = activeLink ? linkRefs.current[activeLink.label] : null;
    if (!el || !navRef.current || !underlineRef.current) {
      if (underlineRef.current) gsap.set(underlineRef.current, { opacity: 0 });
      return;
    }
    const navRect = navRef.current.getBoundingClientRect();
    const linkRect = el.getBoundingClientRect();
    if (reduced) {
      gsap.set(underlineRef.current, { opacity: 1, x: linkRect.left - navRect.left, width: linkRect.width });
      return;
    }
    const tween = gsap.to(underlineRef.current, {
      opacity: 1,
      x: linkRect.left - navRect.left,
      width: linkRect.width,
      duration: 0.3,
      ease: 'power3.out',
    });
    return () => { tween.kill(); };
  }, [location.pathname, reduced]);

  // Stagger mobile menu items in when the sheet opens
  useEffect(() => {
    if (!mobileMenuOpen || !menuRef.current || reduced) return;
    const items = menuRef.current.querySelectorAll('[data-nav-item]');
    gsap.fromTo(
      items,
      { opacity: 0, x: 16 },
      { opacity: 1, x: 0, duration: 0.25, stagger: 0.06, ease: 'power3.out', clearProps: 'all' }
    );
  }, [mobileMenuOpen, reduced]);

  return (
    <header className="sticky top-0 z-50 border-b border-border-subtle bg-bg-elevated/92 shadow-[0_4px_24px_rgba(26,22,20,0.06)] backdrop-blur-xl">
      <div className="mx-auto grid h-[58px] w-full max-w-[1220px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 sm:px-6 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:px-10">
        <Link
          to="/"
          className="flex min-w-0 justify-self-start transition-opacity hover:opacity-80"
          aria-label="Roomly home"
        >
          <Logo variant="full" size="md" color="accent" />
        </Link>

        <nav ref={navRef} className="relative hidden items-center gap-8 justify-self-center xl:flex 2xl:gap-10" aria-label="Primary">
          {navLinks.map((link) => (
            link.to ? (
              <Link
                key={link.label}
                ref={(el) => {
                  linkRefs.current[link.label] = el;
                }}
                to={link.to}
                className="text-[15px] font-semibold text-text-primary transition-colors hover:text-accent"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className="text-[15px] font-semibold text-text-primary transition-colors hover:text-accent"
              >
                {link.label}
              </a>
            )
          ))}
          <div
            ref={underlineRef}
            className="pointer-events-none absolute -bottom-[19px] left-0 h-0.5 w-0 rounded-full bg-accent opacity-0"
            aria-hidden="true"
          />
        </nav>

        <div className="flex items-center gap-2 justify-self-end">
          {isAuthenticated ? (
            <>
              <Button asChild variant="ghost" className="hidden h-10 gap-2 rounded-md px-3 text-[14px] font-semibold shadow-none xl:inline-flex">
                <Link to="/dashboard">
                  Dashboard
                  <PlanBadge plan={plan} />
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden xl:inline-flex"
                    aria-label="Account menu"
                  >
                    <UserRound className="size-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem asChild>
                    <Link to="/account">
                      <Settings className="size-4" aria-hidden="true" />
                      Account
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={isPending}
                    onSelect={() => void handleSignOut()}
                  >
                    <LogOut className="size-4" aria-hidden="true" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
          <Button asChild variant="ghost" className="hidden h-10 rounded-md px-3 text-[14px] font-semibold shadow-none xl:inline-flex">
              <Link to="/auth/sign-in">Sign in</Link>
            </Button>
          )}
          <Button asChild className="h-10 rounded-md px-3 text-[14px] font-semibold shadow-none sm:px-5 sm:text-[15px]">
            <Link to="/design/upload">
              Get started
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="xl:hidden"
            aria-label="Open menu"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="size-5" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent className="border-border-subtle bg-bg-base text-text-primary">
          <SheetTitle className="px-5 pt-5 text-left font-display text-lg font-semibold">Menu</SheetTitle>
          <div ref={menuRef} className="flex flex-col gap-1 px-5 pb-5">
            {navLinks.map((link) =>
              link.to ? (
                <Link
                  key={link.label}
                  data-nav-item
                  to={link.to}
                  className="rounded-md px-3 py-2.5 text-base font-semibold text-text-primary hover:bg-secondary-muted"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.label}
                  data-nav-item
                  href={link.href}
                  className="rounded-md px-3 py-2.5 text-base font-semibold text-text-primary hover:bg-secondary-muted"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              )
            )}

            <div className="my-2 border-t border-border-subtle" />

            {isAuthenticated ? (
              <>
                <Link
                  data-nav-item
                  to="/dashboard"
                  className="rounded-md px-3 py-2.5 text-base font-semibold text-text-primary hover:bg-secondary-muted"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  data-nav-item
                  to="/account"
                  className="rounded-md px-3 py-2.5 text-base font-semibold text-text-primary hover:bg-secondary-muted"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Account
                </Link>
                <button
                  type="button"
                  data-nav-item
                  className="rounded-md px-3 py-2.5 text-left text-base font-semibold text-text-primary hover:bg-secondary-muted"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    void handleSignOut();
                  }}
                  disabled={isPending}
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                data-nav-item
                to="/auth/sign-in"
                className="rounded-md px-3 py-2.5 text-base font-semibold text-text-primary hover:bg-secondary-muted"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign in
              </Link>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}

export function Navigation() {
  return isStaticDeployment ? <StaticNavigation /> : <WorkspaceNavigation />;
}
