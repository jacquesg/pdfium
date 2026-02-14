import { type ReactNode, useEffect, useRef, useState } from 'react';
import { cn } from '../lib/utils';

interface ResponsiveSidebarProps {
  children: ReactNode;
  /** Which edge the sidebar sits on */
  side?: 'left' | 'right';
  /** Breakpoint above which sidebar shows as a normal in-flow element */
  breakpoint?: 'md' | 'lg';
  /** Accessible label for toggle buttons and the aside landmark */
  label?: string;
  /** Additional classes for the sidebar panel (width, bg, padding, etc.) */
  className?: string;
  /** Open automatically on mobile when the component mounts */
  defaultOpen?: boolean;
}

/** Breakpoint pixel values matching Tailwind defaults */
const BP_PX = { md: 768, lg: 1024 } as const;

/**
 * Sidebar wrapper that slides in/out on mobile and renders as a normal
 * in-flow element at the given breakpoint and above.
 *
 * - Below the breakpoint: fixed overlay with translateX animation, FAB toggle, backdrop
 * - At/above the breakpoint: static flex child (relative, no shadow, shrink-0)
 *
 * Uses JS-driven breakpoint detection (`matchMedia`) instead of Tailwind
 * responsive prefixes, because Tailwind v4's scanner cannot detect dynamic
 * class strings (e.g. ternaries or object lookups).
 *
 * Accessibility: on mobile, focus moves to the close button on open and
 * returns to the FAB trigger on close. Focus is trapped inside while open.
 */
export function ResponsiveSidebar({
  children,
  side = 'left',
  breakpoint = 'md',
  label = 'Panel',
  className,
  defaultOpen = false,
}: ResponsiveSidebarProps) {
  const [open, setOpen] = useState(defaultOpen);
  const isRight = side === 'right';

  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const isInitialMount = useRef(true);

  /** Reactive breakpoint tracking — true when viewport is at or above the breakpoint */
  const [aboveBreakpoint, setAboveBreakpoint] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= BP_PX[breakpoint],
  );

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${BP_PX[breakpoint]}px)`);
    setAboveBreakpoint(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setAboveBreakpoint(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [breakpoint]);

  const isMobileMode = !aboveBreakpoint;

  // Focus management: move focus into sidebar on open, return on close.
  // Skip the initial mount to avoid stealing focus on page load.
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!isMobileMode) return;

    if (open) {
      closeRef.current?.focus();
    } else {
      triggerRef.current?.focus();
    }
  }, [open, isMobileMode]);

  // Lock body scroll while the mobile overlay is open
  useEffect(() => {
    if (!open || !isMobileMode) return;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [open, isMobileMode]);

  // Close on Escape key (mobile only)
  useEffect(() => {
    if (!open || !isMobileMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, isMobileMode]);

  // Focus trap: keep Tab cycling within the sidebar on mobile
  useEffect(() => {
    if (!open || !isMobileMode) return;

    const aside = asideRef.current;
    if (!aside) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusable = aside.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, isMobileMode]);

  // ── Desktop mode: simple static sidebar ──
  if (!isMobileMode) {
    return (
      <aside ref={asideRef} aria-label={label} className={cn('relative shrink-0', className)}>
        {children}
      </aside>
    );
  }

  // ── Mobile mode: fixed overlay with slide animation ──
  return (
    <>
      {/* Floating toggle — visible when sidebar is closed */}
      {!open && (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            'fixed z-20 bottom-4 rounded-full bg-blue-600 text-white shadow-lg p-3',
            'hover:bg-blue-700 transition-colors',
            isRight ? 'right-4' : 'left-4',
          )}
          aria-label={`Open ${label}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {isRight ? (
              <>
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M15 3v18" />
              </>
            ) : (
              <>
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M9 3v18" />
              </>
            )}
          </svg>
        </button>
      )}

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-30"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        ref={asideRef}
        aria-label={label}
        inert={!open ? true : undefined}
        className={cn(
          'transition-transform duration-300 ease-in-out',
          'fixed inset-y-0 z-40 shadow-xl max-w-[calc(100vw-3rem)]',
          isRight ? 'right-0' : 'left-0',
          open ? 'translate-x-0' : isRight ? 'translate-x-full' : '-translate-x-full',
          className,
        )}
      >
        {/* Close button */}
        <button
          ref={closeRef}
          type="button"
          onClick={() => setOpen(false)}
          className={cn(
            'absolute top-2 z-50 rounded-full bg-gray-200 p-1.5 hover:bg-gray-300 transition-colors',
            isRight ? 'left-2' : 'right-2',
          )}
          aria-label={`Close ${label}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
        {children}
      </aside>
    </>
  );
}
